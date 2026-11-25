from fastapi import APIRouter, Form, File, UploadFile, Depends, status, Response, Request
from fastapi.exceptions import HTTPException
from ..schemas.user_schema import UserDataModel
from ..schemas.listing_schema import ListingModel, ImagesModel, VideoModel, ListingDataModel, ListingUpdateModel, ListingStatusUpdateModel, AddressCreateModel, AddressModel, ImageCaptionUpdateModel
from app.models.user_model import UserRole
from app.models.listings_model import normalize_housing_status, ListingImages
from app.core.database_session_init import get_session
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Annotated
from ..services.listing_service import ListingService, missing_agent_requirements
from uuid import UUID, uuid4
from ..utils.image_tools import store_in_cloud, store_video_in_cloud, probe_video_duration_seconds, video_extension
import asyncio
import os
import tempfile
from ...deps.auth import get_this_user

list_router = APIRouter()
listing_service = ListingService()

MAX_VIDEO_BYTES = 50 * 1024 * 1024
MAX_VIDEO_SECONDS = 30
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024


def _require_agent_ready(user: UserDataModel):
    """Agents and landlords must have contact details (a phone number)
    in Settings before they can publish a listing. Admins are exempt:
    they publish on Housify's behalf, not as agents. The verification
    selfie is optional and is not part of this gate."""
    if user.role not in {UserRole.AGENT.value, UserRole.LANDLORD.value}:
        return
    missing = missing_agent_requirements(user.phone_number, user.verification_photo_url)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": "Update your contact details (phone number) in Settings before publishing a listing.",
                "missing": missing,
            },
        )


async def _upload_video_file(video: UploadFile, agent_id: UUID, listing_id: UUID) -> VideoModel:
    """Validate, probe and store one video clip; returns its DB row data.

    Raises before anything is stored when the clip is the wrong type,
    too big, or longer than 30 seconds.
    """
    if video.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Videos must be mp4, webm or mov")
    video_id = uuid4()
    extension = video_extension(video.filename, video.content_type)
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{extension}") as tmp:
            tmp_path = tmp.name
            size = 0
            while True:
                chunk = await video.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_VIDEO_BYTES:
                    raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Each video must be 50 MB or smaller")
                tmp.write(chunk)
        duration = await asyncio.to_thread(probe_video_duration_seconds, tmp_path)
        if duration is not None and duration > MAX_VIDEO_SECONDS:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Videos must be 30 seconds or shorter")
        public_url = await asyncio.to_thread(
            store_video_in_cloud, tmp_path, agent_id, video_id, extension
        )
        if public_url is None:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Video upload failed, try again")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
    return VideoModel(
        video_id=video_id,
        video_url=public_url,
        listing_id=listing_id,
        duration_seconds=int(duration) if duration is not None else None,
    )


@list_router.get("/addresses", response_model=list[AddressModel])
async def get_addresses(session: AsyncSession = Depends(get_session)):
    return await listing_service.list_addresses(session=session)


@list_router.post("/addresses", response_model=AddressModel)
async def add_address(
    address_info: AddressCreateModel,
    session: AsyncSession = Depends(get_session),
    user: UserDataModel = Depends(get_this_user),
):
    if user.role not in {UserRole.AGENT.value, UserRole.LANDLORD.value, UserRole.ADMIN.value}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only agents and landlords can add addresses")
    if not address_info.name or not address_info.name.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Address name is required")
    address, created = await listing_service.add_address(name=address_info.name, session=session)
    if not created:
        return Response(
            content=AddressModel.model_validate(address).model_dump_json(),
            status_code=status.HTTP_200_OK,
            media_type="application/json",
        )
    return Response(
        content=AddressModel.model_validate(address).model_dump_json(),
        status_code=status.HTTP_201_CREATED,
        media_type="application/json",
    )


@list_router.post("/{lid}/view")
async def record_listing_view(lid: UUID, session: AsyncSession = Depends(get_session)):
    views_count = await listing_service.increment_views(listing_id=lid, session=session)
    if views_count is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    return {"views_count": views_count}


@list_router.post("/{lid}/contact")
async def record_listing_contact(lid: UUID, session: AsyncSession = Depends(get_session)):
    contact_count = await listing_service.increment_contacts(listing_id=lid, session=session)
    if contact_count is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    return {"contact_count": contact_count}


@list_router.patch("/{lid}/status", response_model=ListingDataModel)
async def update_listing_status(
    lid: UUID,
    status_info: ListingStatusUpdateModel,
    user: UserDataModel = Depends(get_this_user),
    session: AsyncSession = Depends(get_session),
):
    listing = await listing_service.get_house_by_listing_id(listing_id=lid, session=session)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.agent_id != user.uid and user.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot update this listing")
    updated = await listing_service.update_house_info(
        listing=listing,
        info={"status": normalize_housing_status(status_info.status)},
        session=session,
    )
    return ListingDataModel.model_validate(updated)


@list_router.post("/post_listing")
async def create_listing(
    listing_info: ListingModel,
    session: AsyncSession = Depends(get_session),
    user: UserDataModel = Depends(get_this_user),
):
    if user.role not in {UserRole.AGENT.value, UserRole.LANDLORD.value, UserRole.ADMIN.value}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only agents and landlords can create listings")
    _require_agent_ready(user)
    agent_id = user.uid
    new_house = await listing_service.add_house(
        agent_id=agent_id, listing_info=listing_info, session=session
    )
    return {"listing_id" : str(new_house.listing_id)}  # When you store this in frontend you save the info then use the listing_id to upload images for the listing. You can also use the listing_id to get the listing info and display it in the frontend


@list_router.post("/publish")
async def publish_listing(
    title: Annotated[str, Form()],
    description: Annotated[str, Form()],
    location: Annotated[str, Form()],
    address: Annotated[str, Form()],
    price: Annotated[int, Form()],
    # Named listing_status: a parameter called `status` would shadow the
    # imported `status` module used for HTTP status codes below. The
    # alias keeps the multipart field name as `status` for callers.
    listing_status: Annotated[str, Form(alias="status")] = "available",
    currency: Annotated[str, Form()] = "NGN",
    images: Annotated[List[UploadFile], File()] = [],
    captions: Annotated[List[str], Form()] = [],
    videos: Annotated[List[UploadFile], File()] = [],
    user: UserDataModel = Depends(get_this_user),
    session: AsyncSession = Depends(get_session),
):
    """Publish a listing and its photos/videos in one atomic operation.

    Every file is validated and uploaded to cloud storage first; only
    then are the listing and media rows written, in a single database
    transaction. If anything fails, nothing is stored: a failed publish
    never leaves a half-saved listing behind.
    """
    if user.role not in {UserRole.AGENT.value, UserRole.LANDLORD.value, UserRole.ADMIN.value}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only agents and landlords can create listings")
    _require_agent_ready(user)
    if not images:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Add at least one photo of the house")
    if len(images) != len(captions):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Provide one caption for each image")
    listing_info = ListingModel(
        title=title,
        description=description,
        location=location,
        address=address,
        price=price,
        currency=currency,
        status=listing_status,
    )
    listing_id = uuid4()
    agent_id = user.uid

    image_models: List[ImagesModel] = []
    for image, caption in zip(images, captions):
        if image.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Photos must be JPEG, PNG or WebP")
        if image.size is not None and image.size > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Each photo must be 10 MB or smaller")
        image_id = uuid4()
        public_url = await asyncio.to_thread(
            store_in_cloud, file=image, agent_id=agent_id, image_id=image_id
        )
        if public_url is None:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Photo upload failed, try again")
        image_models.append(
            ImagesModel(
                image_id=image_id,
                image_url=public_url,
                listing_id=listing_id,
                captions=caption,
            )
        )

    video_models: List[VideoModel] = []
    for video in videos:
        video_models.append(await _upload_video_file(video, agent_id, listing_id))

    new_listing = await listing_service.publish_listing(
        agent_id=agent_id,
        listing_info=listing_info,
        images=image_models,
        videos=video_models,
        session=session,
        listing_id=listing_id,
    )
    return {"listing_id": str(new_listing.listing_id)}


@list_router.patch("/images/{image_id}", response_model=ImagesModel)
async def update_image_caption(
    image_id: UUID,
    caption_info: ImageCaptionUpdateModel,
    user: UserDataModel = Depends(get_this_user),
    session: AsyncSession = Depends(get_session),
):
    """Change one photo's caption. Only the listing's owner (or an admin)
    may do this — an agent cannot edit another agent's listing."""
    # Fetch the image first (without changing it) to find its listing.
    image_row = await session.get(ListingImages, image_id)
    if image_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")
    listing = await listing_service.get_house_by_listing_id(listing_id=image_row.listing_id, session=session)
    if listing is None or (listing.agent_id != user.uid and user.role != UserRole.ADMIN.value):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot edit this listing")
    updated = await listing_service.update_image_caption(image_id=image_id, captions=caption_info.captions, session=session)
    return ImagesModel.model_validate(updated)


@list_router.post("/add_listing_images")
async def add_images(
    listing_id: UUID,
    images: Annotated[List[UploadFile], File()],
    captions: Annotated[list[str], Form()],
    token_data: UserDataModel = Depends(get_this_user),
    session: AsyncSession = Depends(get_session),
):
    listing = await listing_service.get_house_by_listing_id(listing_id=listing_id, session=session)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.agent_id != token_data.uid and token_data.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot upload images to this listing")
    if len(images) != len(captions):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Provide one caption for each image")

    listing_images = []
    for image, caption in zip(images, captions):
        image_id = uuid4()
        agent_id = token_data.uid
        public_url = await asyncio.to_thread(
            store_in_cloud, file=image, agent_id=agent_id, image_id=image_id
        )
        image_info = ImagesModel(
            image_id=image_id,
            image_url=public_url,
            listing_id=listing_id,
            captions=caption,
        )
        listing_image = await listing_service.add_listing_image(
            listing_id=listing_id, image_info=image_info, session=session
        )
        listing_images.append(listing_image)
    return listing_images


@list_router.post("/add_listing_videos")
async def add_videos(
    listing_id: UUID,
    videos: Annotated[List[UploadFile], File()],
    token_data: UserDataModel = Depends(get_this_user),
    session: AsyncSession = Depends(get_session),
):
    listing = await listing_service.get_house_by_listing_id(listing_id=listing_id, session=session)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.agent_id != token_data.uid and token_data.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot upload videos to this listing")

    listing_videos = []
    for video in videos:
        video_info = await _upload_video_file(video, token_data.uid, listing_id)
        listing_video = await listing_service.add_listing_video(
            listing_id=listing_id, video_info=video_info, session=session
        )
        listing_videos.append(listing_video)
    return listing_videos


@list_router.get("/all_listings", response_model=list[ListingDataModel])
async def get_all_houses(session: AsyncSession = Depends(get_session)):
    all_houses = await listing_service.get_all_houses(session=session)
    return all_houses


@list_router.get("/a_listing/{lid}")
async def get_a_listing(lid: UUID, session: AsyncSession = Depends(get_session)):
    house_data = await listing_service.get_house_by_listing_id(listing_id=lid, session=session)
    if house_data is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    return ListingDataModel.model_validate(house_data)


@list_router.get("/house_by_location")
async def get_house_by_location(
    location: str, session: AsyncSession = Depends(get_session)
):
    location_houses = await listing_service.get_houses_by_location(
        location=location, session=session
    )
    return location_houses


@list_router.get("/house_by_walking_time")
async def get_houses_by_walking_time(
    time_range: int, session: AsyncSession = Depends(get_session)
):
    houses = await listing_service.get_houses_by_walk_time(
        time_range=time_range, session=session
    )
    return houses


@list_router.get("/house_by_driving_time")
async def get_houses_by_driving_time(
    time_range: int, session: AsyncSession = Depends(get_session)
):
    houses = await listing_service.get_houses_by_drive_time(
        time_range=time_range, session=session
    )
    return houses


@list_router.get("/my_listings", response_model=list[ListingDataModel])
async def get_my_listings(
    user: UserDataModel = Depends(get_this_user),
    session: AsyncSession = Depends(get_session),
):
    if user.role not in {UserRole.AGENT.value, UserRole.LANDLORD.value, UserRole.ADMIN.value}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only agents and landlords can view their listings")
    return await listing_service.get_agent_houses(agent_id=user.uid, session=session)


@list_router.patch("/update_listing_info", response_model=ListingDataModel)
async def update_listing_info(
    listing_id: UUID,
    listing_info: ListingUpdateModel,
    user: UserDataModel = Depends(get_this_user),
    session: AsyncSession = Depends(get_session),
):
    listing = await listing_service.get_house_by_listing_id(listing_id=listing_id, session=session)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.agent_id != user.uid and user.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot update this listing")
    update_data = listing_info.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No listing fields supplied")
    updated = await listing_service.update_house_info(listing=listing, info=update_data, session=session)
    return ListingDataModel.model_validate(updated)

@list_router.delete("/delete_listings")
async def delete_your_listings(user: UserDataModel = Depends(get_this_user), session: AsyncSession = Depends(get_session)):
    uid = user.uid
    delete_listings = await listing_service.delete_users_listings(uid=uid, session=session)
    if not delete_listings:
        raise HTTPException(
            detail="Listings not found",
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@list_router.delete("/{lid}")
async def delete_one_listing(
    lid: UUID,
    user: UserDataModel = Depends(get_this_user),
    session: AsyncSession = Depends(get_session),
):
    """Delete a single listing (the owner, or an admin). Only one
    listing is ever removed by this endpoint; its photos and videos go
    with it."""
    listing = await listing_service.get_house_by_listing_id(listing_id=lid, session=session)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.agent_id != user.uid and user.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot delete this listing")
    await listing_service.delete_listing(listing=listing, session=session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
