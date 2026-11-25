from pydantic import BaseModel, ConfigDict
import uuid
from datetime import datetime
from typing import List, Optional
from .listing_schema import ListingDataModel
from ....models.user_model import UserRole

class UserDataModel(BaseModel):
    uid: uuid.UUID
    email: str
    fullname: str 
    phone_number: Optional[str] = None
    auth_provider: str
    role: str
    status: str | None = None
    profile_image: str | None = None
    verification_photo_url: str | None = None
    whatsapp_link: str | None = None
    is_verified: bool
    is_active: bool
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    listed: List[ListingDataModel] = []

    model_config = ConfigDict(
        from_attributes=True
    )


class UpdateModel(BaseModel):
    fullname: Optional[str] = None
    email: Optional[str] = None
    hashed_password: Optional[str] = None
    phone_number: Optional[str] = None
    status: Optional[str] = None
    whatsapp_link: Optional[str] = None
    # Role a user picks for themselves (Google sign-in role choice and the
    # /complete-profile page). Only self-assignable roles are accepted;
    # the endpoint rejects privileged roles. Accepts "client"/"agent".
    role: Optional[UserRole] = None


class AgentPublicModel(BaseModel):
    uid: uuid.UUID
    fullname: str
    email: str
    phone_number: Optional[str] = None
    profile_image: str | None = None
    verification_photo_url: str | None = None
    whatsapp_link: str | None = None
    role: str

    model_config = ConfigDict(from_attributes=True)
