from fastapi import APIRouter, Depends, status, File, UploadFile
from fastapi.exceptions import HTTPException
from fastapi.responses import JSONResponse
from ..schemas.user_schema import UpdateModel, AgentPublicModel
from sqlalchemy.ext.asyncio import AsyncSession
from ....core.database_session_init import get_session
from ..services.auth_service import AuthService
from ..services.user_service import UserService
from ....models.user_model import UserRole
from ....errors import UserNotFound
from ...deps.auth import get_this_user
from ..schemas.user_schema import UserDataModel
from typing import Annotated
from ..utils.image_tools import store_in_cloud, store_verification_photo_in_cloud, verification_photo_extension
from uuid import uuid4
import uuid
import asyncio

user_router = APIRouter()
auth_service = AuthService()
user_service = UserService()


@user_router.get("/current_user")
async def get_user(user: UserDataModel = Depends(get_this_user)):
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="user no dey"
        )
    return user


@user_router.get("/agent_user/{aid}")
async def get_agent_user(aid: uuid.UUID, session: AsyncSession = Depends(get_session)):
    agent = await auth_service.get_uid_user(uid=aid, session=session)
    if agent is None or agent.role not in {"agent", "landlord"}:
        raise UserNotFound()
    return {"agent": AgentPublicModel.model_validate(agent)}


@user_router.patch("/set_profile")
async def update_profile_picture(profile_image: Annotated[UploadFile, File()], user: UserDataModel = Depends(get_this_user), session: AsyncSession = Depends(get_session)):
    uid = user.uid
    user_exists = await auth_service.get_uid_user(uid=uid, session=session)
    if user_exists is None:
        raise UserNotFound()

    image_id = uuid4()
    user_id = uid
    public_url = await asyncio.to_thread(
        store_in_cloud, file=profile_image, agent_id=user_id, image_id=image_id
    )
    profile_dict = { "profile_image" : public_url }
    update_detail = await auth_service.update_user_info(user=user_exists, info=profile_dict, session=session)

    if not update_detail:
        raise HTTPException(
            detail="Something went wrong",
            status_code=status.HTTP_304_NOT_MODIFIED
        )
    
    return JSONResponse(
        content={
            "message":"Update was successful"
        },
        status_code=status.HTTP_200_OK
    )


@user_router.post("/verification-photo")
async def upload_verification_photo(
    photo: Annotated[UploadFile, File()],
    user: UserDataModel = Depends(get_this_user),
    session: AsyncSession = Depends(get_session),
):
    """An agent's identity selfie (optional).

    The photo is stored in Cloudflare R2 and becomes the agent's
    profile picture, so customers see who they are dealing with.
    Uploading one is optional — it is not required to publish.
    """
    if user.role not in {UserRole.AGENT.value, UserRole.LANDLORD.value, UserRole.ADMIN.value}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only agents and landlords upload a verification photo")
    if verification_photo_extension(photo.content_type) is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="The verification photo must be a JPEG, PNG or WebP image")
    user_exists = await auth_service.get_uid_user(uid=user.uid, session=session)
    if user_exists is None:
        raise UserNotFound()
    photo_id = uuid4()
    public_url = await asyncio.to_thread(
        store_verification_photo_in_cloud, photo, user.uid, photo_id
    )
    if public_url is None:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Photo upload failed, try again")
    await auth_service.update_user_info(
        user=user_exists,
        info={"verification_photo_url": public_url, "profile_image": public_url},
        session=session,
    )
    updated_user = await user_service.get_current_user(uid=user.uid, session=session)
    if updated_user is None:
        raise UserNotFound()
    return updated_user


@user_router.patch("/update_details/{email}")
async def update_user_details(email: str, new_details: UpdateModel, user: UserDataModel = Depends(get_this_user), session: AsyncSession = Depends(get_session)):
    if email.casefold() != user.email.casefold():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only update your own account")
    user_exists = await auth_service.get_uid_user(uid=user.uid, session=session)
    if user_exists is None:
        raise UserNotFound()

    # Email, password hashes and account privileges must use dedicated flows.
    update_data = new_details.model_dump(exclude_unset=True, exclude={"email", "hashed_password", "status"})
    if "role" in update_data and update_data["role"] not in {UserRole.CLIENT, UserRole.AGENT, UserRole.LANDLORD}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account role cannot be self-assigned")
    update_detail = await auth_service.update_user_info(user=user_exists, info=update_data, session=session)

    if not update_detail:
        raise HTTPException(
            detail="Something went wrong",
            status_code=status.HTTP_304_NOT_MODIFIED
        )

    # Return the updated user (with listings) so callers such as Settings
    # and /complete-profile see the saved values immediately.
    updated_user = await user_service.get_current_user(uid=user.uid, session=session)
    if updated_user is None:
        raise UserNotFound()
    return updated_user