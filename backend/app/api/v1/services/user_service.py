from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ....models.user_model import User
from ....models.listings_model import Listings
from ..schemas.auth_schema import SignUpModel, UserModel
from ....models.user_model import UserRole
from ..schemas.user_schema import UserDataModel

import uuid

class UserService: 

    async def get_current_user(self, uid:uuid.UUID, session: AsyncSession):
        statement = select(User).where(User.uid == uid).options(selectinload(User.listed).selectinload(Listings.images), selectinload(User.listed).selectinload(Listings.videos))
        user = (await session.execute(statement)).scalars().one_or_none()

        return UserDataModel.model_validate(user) if user is not None else None

    async def get_user_uid(self, uid: uuid.UUID, session: AsyncSession):
        statement = select(User).where(User.uid == uid)
        user = (await session.execute(statement)).scalars().one_or_none()

        return user