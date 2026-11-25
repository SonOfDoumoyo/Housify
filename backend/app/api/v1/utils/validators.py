from itsdangerous import URLSafeTimedSerializer
from datetime import datetime, timedelta, timezone
from typing import Dict
from fastapi import HTTPException
from app.errors import logger
from ....errors import ExpiredToken, InvalidToken

from ....config import settings

import logging
import jwt
import uuid

"""ACCESS TOKEN AND REFRESH TOKEN"""
ACCESS_TOKEN_EXPIRY = 3600


def decode_token(token: str):
    # decodes the token
    try:
        token_data = jwt.decode(
            jwt=token,
            key=settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )

        return token_data
    except jwt.ExpiredSignatureError:
        raise 

    except jwt.InvalidTokenError:
        raise


def create_access_token(user_data: dict, expiry: timedelta = None, refresh: bool = False):
    """Creates the access token"""

    payload = {}

    now = datetime.now(timezone.utc)  # current time on func call
    if not expiry:
        expiry = timedelta(seconds=ACCESS_TOKEN_EXPIRY)

    final_expiry = now + expiry

    # storing the payloads data
    payload["user"] = user_data
    payload["exp"] = int(final_expiry.timestamp())
    payload["iat"] = int(now.timestamp())
    payload["jti"] = str(uuid.uuid4())
    payload["type"] = "access"
    payload["refresh"] = refresh

    # encoding the payloads' data and storing it as a variable
    token = jwt.encode(
        payload=payload, key=settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )

    return token, payload


def create_refresh_token(
    user_data: dict, expiry: timedelta = None, refresh: bool = True
):
    """Creates the refresh token"""

    payload = {}

    now = datetime.now(timezone.utc)

    if expiry is None:
        expiry = ACCESS_TOKEN_EXPIRY

    final_expiry = timedelta(seconds=expiry) + now

    jti = uuid.UUID(user_data["user_uid"])

    # creating the payload data
    payload["user"] = user_data
    payload["exp"] = int(final_expiry.timestamp())
    payload["iat"] = int(now.timestamp())
    payload["jti"] = str(uuid.uuid4())
    payload["type"] = refresh
    payload["refresh"] = refresh

    # encodiing the payload to a variable
    token = jwt.encode(
        payload=payload, key=settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )

    return token, jti, payload


def decode_token(token: str) -> dict:
    try:
        token_data = jwt.decode(
            jwt=token, key=settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return token_data
        
    except jwt.ExpiredSignatureError:
        raise ExpiredToken()
        
    except jwt.InvalidTokenError:
        raise InvalidToken()


"""URL SAFE TOKEN CONFIGURATION"""
serializer = URLSafeTimedSerializer(
    secret_key=settings.JWT_SECRET_KEY,
    salt="verification",  # email_configuration changed to verification cause we'll use it for password too
)


# Creates a url safe token for the user
def create_url_safe_token(data: dict):
    token = serializer.dumps(data, salt="verification")
    return token


# decodes a token
def decode_url_safeToken(token: str):
    try:
        token_data = serializer.loads(token, salt="verification")
        return token_data
    except Exception as e:
        logging.error(str(e))
