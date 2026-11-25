from sqlmodel import SQLModel, Field, Column, Relationship
import sqlalchemy.dialects.postgresql as pg
import uuid
from sqlalchemy import ForeignKey
from datetime import datetime, timezone, time
from enum import Enum
from typing import List, Optional


class HousingStatus(str, Enum):
    occupied = "occupied"
    available = "available"
    partially_occupied = "partially_occupied"
    taken = "taken"
    paid_for = "paid_for"
    rented_out = "rented_out"
    coming_soon = "coming_soon"


def normalize_housing_status(value: object) -> str:
    """Normalise a listing status string to its canonical snake_case form.

    Accepts legacy values such as "coming soon" (with a space) and any
    casing, so old data and older frontend builds keep working.
    """
    if isinstance(value, HousingStatus):
        return value.value
    return str(value).strip().lower().replace(" ", "_")


class Listings(SQLModel, table=True):
    __tablename__ = "listings"
    listing_id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(
            pg.UUID, unique=True, primary_key=True, nullable=False, index=True
        ), 
    )
    title: str
    description: str
    location: str
    address: str
    # Walk/drive times were removed from Housify: listings no longer need
    # coordinates or a travel-time lookup, so a home anywhere in the world
    # can be listed. The columns stay (nullable) so old rows keep working.
    walk_time: int | None = Field(
        default=None,
        sa_column=Column(pg.INTEGER, nullable=True),
    )
    drive_time: int | None = Field(
        default=None,
        sa_column=Column(pg.INTEGER, nullable=True),
    )
    price: int
    # ISO 4217 currency code for the price (NGN, USD, EUR, ...). Housify
    # works in any region; the currency travels with the listing.
    currency: str = Field(
        default="NGN",
        sa_column=Column(pg.VARCHAR(3), nullable=False, default="NGN"),
    )
    # Last time the agent confirmed or changed the listing status. Used
    # to warn agents whose listings go stale: an un-updated status for
    # over 30 days reduces the agent's rating until it is updated.
    status_updated_at: datetime | None = Field(
        default=None,
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=True),
    )
    # How many times the listing has been opened, and how many people have
    # contacted the agent about it. Incremented by the /view and /contact
    # endpoints; shown on the listing page and cards.
    views_count: int = Field(
        default=0,
        sa_column=Column(pg.INTEGER, nullable=False, default=0),
    )
    contact_count: int = Field(
        default=0,
        sa_column=Column(pg.INTEGER, nullable=False, default=0),
    )
    status: HousingStatus = Field(
        sa_column=Column(
            pg.VARCHAR,
        )
    )
    agent_id: uuid.UUID = Field(sa_column=Column(
        pg.UUID,
        ForeignKey("users.uid", ondelete="CASCADE"),
        nullable=False,
    ))
    uploaded_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(pg.TIMESTAMP(timezone=True)),
    )
    images: List["ListingImages"] = Relationship(back_populates="listing", sa_relationship_kwargs={
        "cascade": "all, delete-orphan", "passive_deletes": True,
    })
    videos: List["ListingVideo"] = Relationship(back_populates="listing", sa_relationship_kwargs={
        "cascade": "all, delete-orphan", "passive_deletes": True,
    })
    agent: Optional["User"] = Relationship(back_populates='listed')


class ListingImages(SQLModel, table=True):
    __tablename__ = "listing_images"
    image_id: uuid.UUID = Field(
        sa_column=Column(
            pg.UUID, unique=True, primary_key=True, nullable=False, index=True
        ),
    )
    listing_id: uuid.UUID = Field(
        sa_column=Column(
            pg.UUID,
            ForeignKey("listings.listing_id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    image_url: str
    captions: str
    listing: Listings = Relationship(
        back_populates="images", sa_relationship_kwargs={"lazy": "selectin"}
    )


class ListingVideo(SQLModel, table=True):
    """A short video tour of a listing (max 30 seconds, enforced on upload).

    Mirrors ListingImages: same storage pattern (Cloudflare R2), same
    cascade behaviour, one row per uploaded clip.
    """
    __tablename__ = "listing_videos"
    video_id: uuid.UUID = Field(
        sa_column=Column(
            pg.UUID, unique=True, primary_key=True, nullable=False, index=True
        ),
    )
    listing_id: uuid.UUID = Field(
        sa_column=Column(
            pg.UUID,
            ForeignKey("listings.listing_id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    video_url: str
    duration_seconds: int | None = Field(
        default=None,
        sa_column=Column(pg.INTEGER, nullable=True),
    )
    listing: Listings = Relationship(
        back_populates="videos", sa_relationship_kwargs={"lazy": "selectin"}
    )
