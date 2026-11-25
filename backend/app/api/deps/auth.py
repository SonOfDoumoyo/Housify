from fastapi.security import HTTPBearer
from fastapi.exceptions import HTTPException
from fastapi import Request, status, Depends, Depends
from typing import Dict, Any, List
import uuid
import json
from sqlalchemy.ext.asyncio import AsyncSession


from ...errors import (
    AccessTokenRequired,
    ExpiredToken,
    RefreshTokenRequired,
    InvalidToken,
    RevokedToken,
    InvalidAuthorizationCredentials,
    UserNotFound,
    AccountNotVerified,
    TokenInBlocklist
)
from ..v1.services.user_service import UserService
from ..v1.utils.validators import decode_token
from ..v1.utils.redis import get_refresh_token, token_in_blocklist, get_access_token
from app.core.database_session_init import get_session
from ..v1.services.auth_service import AuthService
from app.models.user_model import User
from typing import Dict
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession

auth_service = AuthService()
from ..v1.utils.validators import decode_token
from ...core.database_session_init import get_session

from ..v1.services.auth_service import AuthService

auth_service = AuthService()
user_service = UserService()
bearer_scheme = HTTPBearer()


class AccessTokenBearer:
    """Reads access token and gets the token data form auth bearer"""

    async def __call__(self, request: Request) -> Dict[str, Any]:
        print("ENTERED ACCESS ENDPOINT")
        token = request.cookies.get("access_token")
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing access token"
            )
        
        token_data = await asyncio.to_thread(decode_token, token=token)
        if token_data is None:
            raise InvalidToken()

        if await token_in_blocklist(token_data.get("jti")):
            raise TokenInBlocklist()
        
        if token_data["refresh"]:
            raise AccessTokenRequired()
        
        uid = token_data.get("user").get("user_uid")
        finger_print = token_data.get("user").get("finger_print")
        stored_value = await get_access_token(user_uid=uid, finger_print=finger_print)
        if stored_value is None:
            raise ExpiredToken()
        stored_token = json.loads(stored_value.decode("utf-8"))
        
        if stored_token != token_data:
            raise RevokedToken()
        return token_data



class RefreshTokenBearer(HTTPBearer):
    """Reads token and gets token data"""

    def __init__(self, auto_error: bool = True):
        super().__init__(auto_error=auto_error)

    async def __call__(self, request: Request) -> Dict:

        print("ENTERED REFRESH ENDPOINT")
        token = request.cookies.get(f"refresh_token")
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing refresh token"
            )

        token_data = await asyncio.to_thread(decode_token, token=token)
        if token_data is None:
            raise InvalidToken()

        if not token_data["refresh"]:
            raise RefreshTokenRequired()
        if await token_in_blocklist(token_data.get("jti")):
            raise TokenInBlocklist()

        uid = token_data.get("user").get("user_uid")
        finger_print = token_data.get("user").get("finger_print")
        stored_value = await get_refresh_token(user_uid=uid, finger_print=finger_print)
        if stored_value is None:
            raise ExpiredToken()
        stored_token = json.loads(stored_value.decode("utf-8"))
        
        if stored_token != token_data:
            raise RevokedToken()

        return token_data

    
class ValidUser:
    async def __call__(
        self,
        token: dict = Depends(AccessTokenBearer()),
        session: AsyncSession = Depends(get_session),
    ):
        user_uid = token.get("user").get("user_uid")
        active_user = await auth_service.get_uid_user(uid=user_uid, session=session)
        if not active_user:
            raise UserNotFound()

        if not active_user.is_verified:
            raise AccountNotVerified()

        return active_user


async def get_this_user(
    user_data: User = Depends(ValidUser()),
    session: AsyncSession = Depends(get_session),
):
    uid = user_data.uid
    user = await user_service.get_current_user(uid=uid, session=session)
    if user is None:
        raise HTTPException(status_code=404, detail="User Not Found")
    return user


class RoleChecker:
    def __init__(self, roles: List[str]):
        self.roles = roles

    async def __call__(self, user: User = Depends(get_this_user)):
        if user.role not in self.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not authorized to use this endpoint",
            )
        return True



