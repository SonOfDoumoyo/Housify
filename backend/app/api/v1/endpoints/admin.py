"""Admin privileges: see all users, delete users, see all listings.

Only accounts with role "admin" may use these endpoints. Admin accounts
are created directly in the database (or by another admin); the role
cannot be self-assigned through the public signup or profile flows.
"""
from fastapi import APIRouter, Depends, status
from fastapi.exceptions import HTTPException
from fastapi.responses import Response
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from uuid import UUID

from app.core.database_session_init import get_session
from app.models.listings_model import Listings
from app.models.review_model import AgentReview
from app.models.user_model import User, UserRole
from ...deps.auth import get_this_user
from ..schemas.listing_schema import ListingDataModel
from ..schemas.user_schema import UserDataModel
from ..services.auth_service import AuthService
from ..services.listing_service import ListingService

admin_router = APIRouter()
auth_service = AuthService()
listing_service = ListingService()


async def require_admin(user: UserDataModel = Depends(get_this_user)) -> UserDataModel:
    if user.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


@admin_router.get("/users", response_model=list[UserDataModel])
async def list_all_users(
    admin: UserDataModel = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    # Eager-load listings + media: UserDataModel carries `listed`, and
    # lazy loading is not available on an async session.
    statement = select(User).order_by(User.created_at.desc()).options(
        selectinload(User.listed).selectinload(Listings.images),
        selectinload(User.listed).selectinload(Listings.videos),
    )
    result = await session.execute(statement)
    users = result.scalars().all()
    return [UserDataModel.model_validate(u) for u in users]


@admin_router.delete("/users/{uid}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    uid: UUID,
    admin: UserDataModel = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    if uid == admin.uid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An admin cannot delete their own account")
    target = await auth_service.get_uid_user(uid=uid, session=session)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if target.role == UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="An admin cannot delete another admin")
    # Remove the user's listings first (their photos/videos cascade),
    # then their reviews (written and received), then the account row
    # itself with a bulk delete (no ORM cascade traversal).
    houses = await listing_service.get_agent_houses(agent_id=uid, session=session)
    for house in houses:
        await listing_service.delete_listing(listing=house, session=session)
    await session.execute(
        delete(AgentReview).where(
            (AgentReview.agent_id == uid) | (AgentReview.reviewer_id == uid)
        )
    )
    await session.execute(delete(User).where(User.uid == uid))
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@admin_router.get("/listings", response_model=list[ListingDataModel])
async def list_all_listings(
    admin: UserDataModel = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    return await listing_service.get_all_houses(session=session)


@admin_router.delete("/listings/{lid}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_any_listing(
    lid: UUID,
    admin: UserDataModel = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    listing = await listing_service.get_house_by_listing_id(listing_id=lid, session=session)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    await listing_service.delete_listing(listing=listing, session=session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
