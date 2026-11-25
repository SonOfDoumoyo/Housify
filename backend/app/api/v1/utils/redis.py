from redis.asyncio import Redis as aioredis
import json
import uuid

from ....config import settings

# constants
JTI_EXPIRY = 3600

# redis_client = aioredis.from_url(url=settings.REDIS_URL, decode_responses=True)
redis_client = aioredis(host=settings.REDIS_HOST, port=settings.REDIS_PORT, password=settings.REDIS_PASSWORD,decode_responses=True)


async def add_jti_to_blocklist(jti: str) -> None:
    """Adds tokens to blocklist"""
    await redis_client.set(name=jti, value="", ex=JTI_EXPIRY)


async def token_in_blocklist(jti: str) -> bool:
    """Checks for token in blocklist"""
    jti = await redis_client.get(jti)

    return jti is not None


async def store_refresh_token(user_uid: uuid.UUID, value, finger_print: str):
    key = f"refresh:user:{str(user_uid)}:finger_print:{finger_print}"
    value = json.dumps(value)
    await redis_client.set(key, value, ex=7 * 24 * 60 * 60)


async def store_access_token(user_uid: uuid.UUID, value, finger_print: str):
    key = f"access:user:{str(user_uid)}:finger_print:{finger_print}"
    value = json.dumps(value)
    await redis_client.set(key, value, ex=7 * 24 * 60 * 60)


async def get_refresh_token(user_uid: uuid.UUID, finger_print: str):
    return await redis_client.get(f"refresh:user:{str(user_uid)}:finger_print:{finger_print}")


async def get_access_token(user_uid: uuid.UUID, finger_print: str):
    return await redis_client.get(f"access:user:{str(user_uid)}:finger_print:{finger_print}")


async def del_refresh_token(user_uid: uuid.UUID, finger_print: str):
    return await redis_client.delete(
        f"refresh:user:{str(user_uid)}:finger_print:{finger_print}"
    )


async def del_access_token(user_uid: uuid.UUID, finger_print: str):
    return await redis_client.delete(
        f"access:user:{str(user_uid)}:finger_print:{finger_print}"
    )