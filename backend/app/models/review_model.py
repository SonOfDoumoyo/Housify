"""Customer reviews of agents.

One review per customer per agent. The review's rating feeds the agent's
public rating; an agent whose listing statuses go stale sees that rating
reduced until the statuses are updated (see review_service).
"""
import uuid
from datetime import datetime, timezone

import sqlalchemy.dialects.postgresql as pg
from sqlalchemy import Column, ForeignKey, UniqueConstraint
from sqlmodel import Field, SQLModel


class AgentReview(SQLModel, table=True):
    __tablename__ = "agent_reviews"
    __table_args__ = (
        UniqueConstraint("reviewer_id", "agent_id", name="uq_review_reviewer_agent"),
    )

    review_id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(
            pg.UUID, unique=True, primary_key=True, nullable=False, index=True
        ),
    )
    agent_id: uuid.UUID = Field(
        sa_column=Column(
            pg.UUID,
            ForeignKey("users.uid", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    reviewer_id: uuid.UUID = Field(
        sa_column=Column(
            pg.UUID,
            ForeignKey("users.uid", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    rating: int = Field(sa_column=Column(pg.SMALLINT, nullable=False))
    comment: str | None = Field(
        default=None, sa_column=Column(pg.TEXT, nullable=True)
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(pg.TIMESTAMP(timezone=True)),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(pg.TIMESTAMP(timezone=True)),
    )
