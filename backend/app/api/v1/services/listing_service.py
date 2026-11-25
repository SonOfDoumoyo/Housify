from app.models.listings_model import Listings, ListingImages, ListingVideo
from app.models.address_model import Address, SEEDED_AREA_NAMES
from sqlalchemy.ext.asyncio import AsyncSession
from ..schemas.listing_schema import ListingModel, ImagesModel, VideoModel, ListingDataModel
from uuid import UUID
from typing import Tuple, Dict, Sequence
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, delete, update, func
from sqlalchemy.orm import selectinload
from fastapi.responses import JSONResponse
from fastapi import HTTPException, status


# A listing whose status has not been confirmed for this long counts as
# stale: the agent is warned, and their public rating drops until the
# status is updated.
STALE_AFTER_DAYS = 30
STALE_STATUSES = {"available", "partially_occupied", "coming_soon"}
RATING_PENALTY_FOR_STALE_LISTINGS = 0.5


def is_listing_stale(listing: Listings) -> bool:
    """True when an open listing's status has gone un-updated too long."""
    status = (listing.status or "").lower() if isinstance(listing.status, str) else str(getattr(listing.status, "value", listing.status)).lower()
    if status not in STALE_STATUSES:
        return False
    ref = listing.status_updated_at or listing.uploaded_at
    if ref is None:
        return False
    if ref.tzinfo is None:
        ref = ref.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - ref > timedelta(days=STALE_AFTER_DAYS)


def missing_agent_requirements(phone_number: str | None, verification_photo_url: str | None = None) -> list[str]:
    """What an agent still owes before they may publish a listing:
    contact details (a phone number). The verification selfie is
    optional since 2026-11-25, so it is accepted here for call-site
    compatibility but never required."""
    missing: list[str] = []
    if not (phone_number or "").strip():
        missing.append("phone_number")
    return missing


def _listing_options():
    """Eager-load a listing's images and videos with it, so serialising
    never triggers a lazy load on an async session."""
    return (
        selectinload(Listings.images),
        selectinload(Listings.videos),
    )


class ListingService:
    async def add_house(
        self, agent_id: UUID, listing_info: ListingModel, session: AsyncSession
    ):
        # Travel times were removed from Housify: no coordinates lookup
        # and no travel-time service call, so a home anywhere in the
        # world can be listed without a location database or API key.
        listing_data = listing_info.model_dump()
        new_listing = Listings(**listing_data)
        new_listing.agent_id = agent_id
        new_listing.walk_time = None
        new_listing.drive_time = None
        new_listing.status_updated_at = datetime.now(timezone.utc)
        session.add(new_listing)
        await session.commit()
        await session.refresh(new_listing)
        return new_listing

    async def publish_listing(
        self,
        agent_id: UUID,
        listing_info: ListingModel,
        images: Sequence[ImagesModel],
        videos: Sequence[VideoModel],
        session: AsyncSession,
        listing_id: UUID | None = None,
    ):
        """Store a listing together with its photos and videos, or nothing.

        A listing is only saved once it is published: the listing row and
        every media row are written in a single transaction, so if any
        part fails (bad data, a storage error upstream) the listing does
        not end up half-stored in the database.
        """
        listing_data = listing_info.model_dump()
        new_listing = Listings(**listing_data)
        if listing_id is not None:
            new_listing.listing_id = listing_id
        new_listing.agent_id = agent_id
        new_listing.walk_time = None
        new_listing.drive_time = None
        new_listing.status_updated_at = datetime.now(timezone.utc)
        try:
            session.add(new_listing)
            for image_info in images:
                data = image_info.model_dump()
                data["listing_id"] = new_listing.listing_id
                session.add(ListingImages(**data))
            for video_info in videos:
                data = video_info.model_dump()
                data["listing_id"] = new_listing.listing_id
                session.add(ListingVideo(**data))
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        await session.refresh(new_listing, ["images", "videos"])
        return new_listing

    async def delete_listing(self, listing: Listings, session: AsyncSession):
        """Delete one listing and its photos/videos (FK + ORM cascade)."""
        await session.delete(listing)
        await session.commit()

    async def add_listing_image(
        self, listing_id: UUID, image_info: ImagesModel, session: AsyncSession
    ):
        image_data = image_info.model_dump()
        new_image = ListingImages(**image_data)
        # new_image.listing_id = listing_id
        session.add(new_image)
        await session.commit()
        await session.refresh(new_image)
        return new_image

    async def add_listing_video(
        self, listing_id: UUID, video_info: VideoModel, session: AsyncSession
    ):
        video_data = video_info.model_dump()
        new_video = ListingVideo(**video_data)
        session.add(new_video)
        await session.commit()
        await session.refresh(new_video)
        return new_video

    async def increment_views(self, listing_id: UUID, session: AsyncSession):
        """Atomically +1 views_count; returns the new count, or None."""
        result = await session.execute(
            update(Listings)
            .where(Listings.listing_id == listing_id)
            .values(views_count=Listings.views_count + 1)
            .returning(Listings.views_count)
        )
        await session.commit()
        row = result.first()
        return row[0] if row else None

    async def increment_contacts(self, listing_id: UUID, session: AsyncSession):
        """Atomically +1 contact_count; returns the new count, or None."""
        result = await session.execute(
            update(Listings)
            .where(Listings.listing_id == listing_id)
            .values(contact_count=Listings.contact_count + 1)
            .returning(Listings.contact_count)
        )
        await session.commit()
        row = result.first()
        return row[0] if row else None

    async def ensure_seeded_addresses(self, session: AsyncSession):
        """Insert any seeded area names that are not stored yet.

        Idempotent: safe to call on every address read/write, so a fresh
        database always offers the standard areas.
        """
        existing = (
            await session.execute(select(Address.name))
        ).scalars().all()
        have = {name.strip().lower() for name in existing}
        missing = [
            name for name in SEEDED_AREA_NAMES if name.strip().lower() not in have
        ]
        for name in missing:
            session.add(Address(name=name))
        if missing:
            await session.commit()

    async def list_addresses(self, session: AsyncSession):
        await self.ensure_seeded_addresses(session)
        result = await session.execute(select(Address).order_by(Address.name))
        return result.scalars().all()

    async def add_address(self, name: str, session: AsyncSession):
        """Store a new area, or return the existing row (case-insensitive)."""
        clean = name.strip()
        await self.ensure_seeded_addresses(session)
        existing = (
            await session.execute(
                select(Address).where(func.lower(Address.name) == clean.lower())
            )
        ).scalars().first()
        if existing is not None:
            return existing, False
        address = Address(name=clean)
        session.add(address)
        await session.commit()
        await session.refresh(address)
        return address, True

    async def get_agent_houses(self, agent_id: UUID, session: AsyncSession):
        statement = (
            select(Listings)
            .where(Listings.agent_id == agent_id)
            .options(
                *_listing_options()
            )  # This selects all the images related to the listing and loads them in a single query, rather than making separate queries for each listing's images. This is more efficient and reduces the number of database round trips.
        )
        results = await session.execute(statement=statement)
        agent_houses = results.scalars().all()
        return agent_houses
    

    async def delete_users_listings(self, uid: UUID, session: AsyncSession):
        result = await session.execute(
            delete(Listings).where(Listings.agent_id == uid)
        )
        await session.commit()
        return result.rowcount > 0
    

    async def get_house_by_listing_id(self, listing_id: UUID, session: AsyncSession):
        statement = (
            select(Listings)
            .where(Listings.listing_id == listing_id)
            .options(*_listing_options())
        )
        result = await session.execute(statement=statement)
        house = result.scalars().first()
        return house

    async def get_house_images(self, listing_id: UUID, session: AsyncSession):
        statement = select(ListingImages).where(ListingImages.listing_id == listing_id)
        result = await session.execute(statement)
        return result.scalars().all()

    async def get_house_videos(self, listing_id: UUID, session: AsyncSession):
        statement = select(ListingVideo).where(ListingVideo.listing_id == listing_id)
        result = await session.execute(statement)
        return result.scalars().all()

    async def get_all_houses(self, session: AsyncSession):
        statement = select(Listings).options(*_listing_options())
        results = await session.execute(statement=statement)
        all_houses = results.scalars().all()
        return [ListingDataModel.model_validate(listing) for listing in all_houses]

    async def get_houses_by_location(self, location: str, session: AsyncSession):
        statement = (
            select(Listings)
            .where(Listings.location == location)
            .options(*_listing_options())
        )
        results = await session.execute(statement=statement)
        houses = results.scalars().all()
        return houses

    async def get_houses_by_walk_time(self, time_range: int, session: AsyncSession):
        statement = (
            select(Listings)
            .where(Listings.walk_time == time_range)
            .options(*_listing_options())
        )
        results = await session.execute(statement=statement)
        houses = results.scalars().all()
        return houses

    async def get_houses_by_drive_time(self, time_range: int, session: AsyncSession):
        statement = (
            select(Listings)
            .where(Listings.drive_time == time_range)
            .options(*_listing_options())
        )
        results = await session.execute(statement=statement)
        houses = results.scalars().all()
        return houses

    async def update_house_info(
        self, listing: Listings, info: Dict, session: AsyncSession
    ):
        allowed_fields = {"title", "description", "location", "address", "price", "currency", "status"}
        for key, value in info.items():
            if key in allowed_fields:
                setattr(listing, key, value)
        if "status" in info:
            listing.status_updated_at = datetime.now(timezone.utc)
        await session.commit()
        await session.refresh(listing)
        # Reload the media relationships so serialising the updated
        # listing never lazy-loads on an async session.
        await session.refresh(listing, ["images", "videos"])
        return listing

    async def update_image_caption(
        self, image_id: UUID, captions: str, session: AsyncSession
    ):
        """Change one photo's caption; returns the image row or None."""
        image = await session.get(ListingImages, image_id)
        if image is None:
            return None
        image.captions = captions
        await session.commit()
        await session.refresh(image)
        return image

    async def stale_listings_for_agent(self, agent_id: UUID, session: AsyncSession):
        """The agent's listings whose status has gone un-updated too long."""
        houses = await self.get_agent_houses(agent_id=agent_id, session=session)
        return [house for house in houses if is_listing_stale(house)]
