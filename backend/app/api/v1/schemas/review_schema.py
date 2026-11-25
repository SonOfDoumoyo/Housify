"""Schemas for customer reviews of agents."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReviewCreateModel(BaseModel):
    agent_id: uuid.UUID
    rating: int = Field(ge=1, le=5)
    comment: str | None = None


class ReviewUpdateModel(BaseModel):
    rating: int | None = Field(default=None, ge=1, le=5)
    comment: str | None = None

    model_config = ConfigDict(extra="forbid")


class ReviewModel(BaseModel):
    review_id: uuid.UUID
    agent_id: uuid.UUID
    reviewer_id: uuid.UUID
    reviewer_name: str | None = None
    rating: int
    comment: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReviewSummaryModel(BaseModel):
    """An agent's public rating.

    `average_rating` is the plain mean of all reviews (null when there
    are none). `rating` is what customers see: the mean reduced by
    `rating_penalty` while the agent has stale listings (statuses not
    updated for over 30 days), floored at 1.0.
    """

    agent_id: uuid.UUID
    average_rating: float | None = None
    review_count: int = 0
    stale_listings_count: int = 0
    rating_penalty: float = 0.0
    rating: float | None = None
