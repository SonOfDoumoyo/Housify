from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from ....models.user_model import User
from ..schemas.auth_schema import SignUpModel, UserModel
from ....core.security import hash_password

import uuid


class AuthService:

    async def get_uid_user(self, uid: uuid.UUID, session: AsyncSession):
        """Get user by uid"""
        result = await session.execute(select(User).where(User.uid == uid))
        return result.scalars().one_or_none()

    async def get_email_user(self, email: str, session: AsyncSession):
        """Get user by email"""
        result = await session.execute(select(User).where(User.email == email))
        return result.scalars().one_or_none()
    
    async def delete_user_uid(self, uid: uuid.UUID, session: AsyncSession):
        await session.execute(
            delete(User).where(User.uid == uid)
        )

        await session.commit()
        return True

    async def add_a_user(self, signup_data: dict, session: AsyncSession):
        """Adds new user's data to database"""
        try:

            if signup_data.get("password"):
                # password is set if user signed up locally
                signup_data["hashed_password"] = hash_password(
                    password=signup_data["password"]
                )
                del signup_data["password"]

            new_user = User(**signup_data)

            session.add(new_user)
            await session.commit()
            await session.refresh(new_user)

            return UserModel.model_validate(new_user)

        except Exception as e:
            await session.rollback()
            raise e

    async def update_user_info(self, user: User, info: dict, session: AsyncSession):
        try:
            for k, v in info.items():
                setattr(user, k, v)
            await session.commit()
            await session.refresh(user)
            return {"message": "Updated successfully"}
        
        except Exception as e:
            await session.rollback()
            raise e
