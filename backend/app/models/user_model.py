import uuid

from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Column, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from enum import Enum


import sqlalchemy.dialects.postgresql as pg
from ..core.database_session_init import Base
from sqlmodel import SQLModel, Field, Column, Relationship
from typing import List

# ROLE ENUM
class UserRole(str, Enum):
    CLIENT = "client"
    AGENT = "agent"
    LANDLORD = "landlord"
    DEVELOPER = "developer"
    ADMIN = "admin"


class AuthProvider(str, Enum):
    LOCAL = "local"
    GOOGLE = "google"


class User(SQLModel, table=True):
    __tablename__ = "users"
    uid: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(
            pg.UUID,
            unique=True,
            primary_key=True,
            nullable=False,
            index=True,
        ),
    )
    email: str = Field(
        sa_column=Column(pg.VARCHAR, unique=True, nullable=False, index=True)
    )
    fullname: str = Field(
        sa_column=Column(pg.VARCHAR, unique=False, nullable=False, index=True)
    )
    phone_number: str = Field(
        sa_column=Column(pg.VARCHAR, unique=True, nullable=True, index=True)
    )
    profile_image: str | None = Field(
        default=None,
        sa_column=Column(String(255), nullable=True)
    )
    # Selfie the agent took for identity verification, stored in
    # Cloudflare R2. The selfie is also used as the profile picture, so
    # customers see who they are dealing with. An agent must upload it
    # (and a phone number) before they can publish a listing.
    verification_photo_url: str | None = Field(
        default=None,
        sa_column=Column(String(255), nullable=True)
    )
    whatsapp_link: str | None = Field(default=None, sa_column=Column(String(255), nullable=True))
    hashed_password: str = Field(sa_column=Column(pg.VARCHAR, nullable=True))
    auth_provider: str = Field(sa_column=Column(pg.VARCHAR, default="local+google"))
    role: UserRole = Field(sa_column=Column(pg.ENUM(UserRole, name="userrole"), default=UserRole.CLIENT))
    is_verified: bool = Field(sa_column=Column(pg.BOOLEAN, default=False))
    status: str = Field(sa_column=Column(String(255), nullable=True, default="active")) #change nullable to false
    is_active: bool = Field(sa_column=Column(pg.BOOLEAN, default=False))
    is_deleted: bool = Field(sa_column=Column(pg.BOOLEAN, default=False))
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(pg.TIMESTAMP(timezone=True)),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(pg.TIMESTAMP(timezone=True)),
    )
    listed: List["Listings"] = Relationship(back_populates='agent', sa_relationship_kwargs={'lazy':'selectin', 'cascade':'all, delete-orphan', 'passive_deletes':True})
