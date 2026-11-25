from pydantic import BaseModel, ConfigDict, BeforeValidator, field_validator
from typing import Annotated
import uuid
from datetime import datetime, time
from typing import List
from app.models.listings_model import HousingStatus, normalize_housing_status


def _normalize_status(value: object) -> object:
    """Accept legacy status strings ("coming soon") for listing payloads."""
    if isinstance(value, str):
        return normalize_housing_status(value)
    return value


StatusField = Annotated[HousingStatus, BeforeValidator(_normalize_status)]


def _normalize_currency(value: object) -> str:
    """ISO 4217 code, upper-cased; defaults to NGN when blank."""
    if value is None:
        return "NGN"
    code = str(value).strip().upper()
    return code or "NGN"


CurrencyField = Annotated[str, BeforeValidator(_normalize_currency)]


class ListingModel(BaseModel):
    title: str
    description: str
    location: str  # Different from address cause location is identifying the key area where the house is located
    address: str
    price: int
    currency: CurrencyField = "NGN"
    status: StatusField


class ImagesModel(BaseModel):
    image_id: uuid.UUID
    image_url: str
    listing_id: uuid.UUID
    captions: str

    model_config = ConfigDict(
        from_attributes=True
    )


class VideoModel(BaseModel):
    video_id: uuid.UUID
    video_url: str
    listing_id: uuid.UUID
    duration_seconds: int | None = None

    model_config = ConfigDict(
        from_attributes=True
    )


class ListingDataModel(BaseModel):
    listing_id: uuid.UUID 
    title: str
    description: str
    location: str
    address: str
    # Travel times were removed from Housify; old rows may still hold
    # values, new listings leave them empty.
    walk_time: int | None = None
    drive_time: int | None = None
    price: int
    currency: CurrencyField = "NGN"
    # Normalised on read too: old rows may hold "coming soon" (with a
    # space), which must serialise as the canonical "coming_soon".
    status: StatusField
    agent_id: uuid.UUID
    uploaded_at: datetime
    status_updated_at: datetime | None = None
    images: List[ImagesModel]
    videos: List[VideoModel] = []
    views_count: int = 0
    contact_count: int = 0

    model_config = ConfigDict(
        from_attributes=True
    )




class ListingUpdateModel(BaseModel):
    title: str | None = None
    description: str | None = None
    location: str | None = None
    address: str | None = None
    price: int | None = None
    currency: CurrencyField | None = None
    status: StatusField | None = None

    model_config = ConfigDict(extra="forbid")


class ImageCaptionUpdateModel(BaseModel):
    """New caption for one photo of a listing (empty string clears it)."""
    captions: str = ""


class ListingStatusUpdateModel(BaseModel):
    """Payload for PATCH /list/{lid}/status. Accepts legacy values too."""
    status: StatusField


class AddressCreateModel(BaseModel):
    name: str


class AddressModel(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(
        from_attributes=True
    )
