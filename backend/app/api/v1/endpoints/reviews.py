"""Customer reviews of agents.

Customers (role "client") rate an agent from 1 to 5 stars and may leave
a comment. One review per customer per agent; the customer can edit or
delete their own review. Anyone can read an agent's reviews and rating
summary.
"""
from fastapi import APIRouter, Depends, status
from fastapi.exceptions import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.core.database_session_init import get_session
from app.models.user_model import UserRole
from ...deps.auth import get_this_user
from ..schemas.review_schema import (
    ReviewCreateModel,
    ReviewModel,
    ReviewSummaryModel,
    ReviewUpdateModel,
)
from ..schemas.user_schema import UserDataModel
from ..services.auth_service import AuthService
from ..services.review_service import ReviewService

reviews_router = APIRouter()
review_service = ReviewService()
auth_service = AuthService()


async def _require_agent(agent_id: UUID, session: AsyncSession):
    agent = await auth_service.get_uid_user(uid=agent_id, session=session)
    if agent is None or agent.role not in {UserRole.AGENT.value, UserRole.LANDLORD.value}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    return agent


@reviews_router.post("", response_model=ReviewModel, status_code=status.HTTP_201_CREATED)
async def create_review(
    review_info: ReviewCreateModel,
    user: UserDataModel = Depends(get_this_user),
    session: AsyncSession = Depends(get_session),
):
    if user.role != UserRole.CLIENT.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only customers can review agents")
    if review_info.agent_id == user.uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot review yourself")
    await _require_agent(review_info.agent_id, session)
    existing = await review_service.get_existing_review(
        reviewer_id=user.uid, agent_id=review_info.agent_id, session=session
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You have already reviewed this agent")
    review = await review_service.create_review(
        reviewer_id=user.uid,
        agent_id=review_info.agent_id,
        rating=review_info.rating,
        comment=review_info.comment,
        session=session,
    )
    return ReviewModel.model_validate({**review.model_dump(), "reviewer_name": user.fullname})


@reviews_router.get("/agent/{agent_id}", response_model=list[ReviewModel])
async def list_agent_reviews(agent_id: UUID, session: AsyncSession = Depends(get_session)):
    await _require_agent(agent_id, session)
    rows = await review_service.list_reviews_for_agent(agent_id=agent_id, session=session)
    return [ReviewModel.model_validate(row) for row in rows]


@reviews_router.get("/agent/{agent_id}/summary", response_model=ReviewSummaryModel)
async def agent_rating_summary(agent_id: UUID, session: AsyncSession = Depends(get_session)):
    await _require_agent(agent_id, session)
    return await review_service.agent_summary(agent_id=agent_id, session=session)


@reviews_router.patch("/{review_id}", response_model=ReviewModel)
async def update_review(
    review_id: UUID,
    review_info: ReviewUpdateModel,
    user: UserDataModel = Depends(get_this_user),
    session: AsyncSession = Depends(get_session),
):
    review = await review_service.get_review(review_id=review_id, session=session)
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    if review.reviewer_id != user.uid and user.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot edit this review")
    if review_info.rating is None and review_info.comment is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nothing to update")
    updated = await review_service.update_review(
        review=review, rating=review_info.rating, comment=review_info.comment, session=session
    )
    return ReviewModel.model_validate({**updated.model_dump(), "reviewer_name": user.fullname})


@reviews_router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: UUID,
    user: UserDataModel = Depends(get_this_user),
    session: AsyncSession = Depends(get_session),
):
    review = await review_service.get_review(review_id=review_id, session=session)
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    if review.reviewer_id != user.uid and user.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot delete this review")
    await review_service.delete_review(review=review, session=session)
