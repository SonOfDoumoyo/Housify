"""Customer reviews of agents and the agent's public rating."""
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.review_model import AgentReview
from app.models.user_model import User
from .listing_service import ListingService, RATING_PENALTY_FOR_STALE_LISTINGS


class ReviewService:
    async def get_review(self, review_id: UUID, session: AsyncSession):
        return (
            await session.execute(
                select(AgentReview).where(AgentReview.review_id == review_id)
            )
        ).scalars().first()

    async def get_existing_review(self, reviewer_id: UUID, agent_id: UUID, session: AsyncSession):
        return (
            await session.execute(
                select(AgentReview).where(
                    AgentReview.reviewer_id == reviewer_id,
                    AgentReview.agent_id == agent_id,
                )
            )
        ).scalars().first()

    async def create_review(self, reviewer_id: UUID, agent_id: UUID, rating: int, comment: str | None, session: AsyncSession):
        review = AgentReview(
            agent_id=agent_id,
            reviewer_id=reviewer_id,
            rating=rating,
            comment=(comment or "").strip() or None,
        )
        session.add(review)
        await session.commit()
        await session.refresh(review)
        return review

    async def update_review(self, review: AgentReview, rating: int | None, comment: str | None, session: AsyncSession):
        if rating is not None:
            review.rating = rating
        if comment is not None:
            review.comment = comment.strip() or None
        review.updated_at = datetime.now(timezone.utc)
        await session.commit()
        await session.refresh(review)
        return review

    async def delete_review(self, review: AgentReview, session: AsyncSession):
        await session.delete(review)
        await session.commit()

    async def list_reviews_for_agent(self, agent_id: UUID, session: AsyncSession):
        """Reviews newest first, each with the reviewer's name."""
        rows = (
            await session.execute(
                select(AgentReview, User.fullname)
                .join(User, User.uid == AgentReview.reviewer_id)
                .where(AgentReview.agent_id == agent_id)
                .order_by(AgentReview.created_at.desc())
            )
        ).all()
        return [
            {
                "review_id": review.review_id,
                "agent_id": review.agent_id,
                "reviewer_id": review.reviewer_id,
                "reviewer_name": fullname,
                "rating": review.rating,
                "comment": review.comment,
                "created_at": review.created_at,
                "updated_at": review.updated_at,
            }
            for review, fullname in rows
        ]

    async def agent_summary(self, agent_id: UUID, session: AsyncSession):
        """Average rating, review count, and the stale-status penalty.

        The public rating is the review average reduced by 0.5 (floored
        at 1.0) while the agent has any listing whose status has not
        been updated for over 30 days. Updating the status restores it.
        """
        average, count = (
            await session.execute(
                select(func.avg(AgentReview.rating), func.count(AgentReview.review_id)).where(
                    AgentReview.agent_id == agent_id
                )
            )
        ).one()
        stale = await ListingService().stale_listings_for_agent(agent_id=agent_id, session=session)
        average_rating = float(average) if average is not None else None
        penalty = RATING_PENALTY_FOR_STALE_LISTINGS if stale else 0.0
        rating = None
        if average_rating is not None:
            rating = round(max(1.0, average_rating - penalty), 1)
        return {
            "agent_id": agent_id,
            "average_rating": round(average_rating, 1) if average_rating is not None else None,
            "review_count": int(count),
            "stale_listings_count": len(stale),
            "rating_penalty": penalty,
            "rating": rating,
        }
