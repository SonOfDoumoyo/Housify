from pydantic import BaseModel, EmailStr, ConfigDict, Field
from ....models.user_model import UserRole

import uuid
from datetime import datetime

class SignUpModel(BaseModel):
    fullname: str = Field(max_length=255)
    email: EmailStr
    phone_number: str = Field(max_length=20)
    password: str = Field(min_length=6)
    profile_image: str
    role: UserRole

    model_config = ConfigDict(
        from_attributes=True
    )


class LoginModel(BaseModel):
    email: str
    password: str


class CompleteProfileModel(BaseModel):
    """Role picked on the /complete-profile page after Google sign-in."""
    role: UserRole


class UserModel(BaseModel):
    uid: uuid.UUID
    fullname: str
    email: str
    phone_number: str | None = None
    hashed_password: str | None = None
    role: str
    status: str
    is_verified: bool
    is_active: bool
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )