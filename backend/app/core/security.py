from passlib.context import CryptContext
from user_agents import parse
from fastapi import Request

# creating the password context
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto"
)

# hash the password
def hash_password(password: str):
    return pwd_context.hash(password)

# verifies the password
def verify_password(password: str, hash: str):
    return pwd_context.verify(password, hash)


# gets device info
def get_device_info(request: Request):
    ua = parse(request.headers.get("user-agent", ""))

    device_info = {
        "browser": ua.browser.family,
        "os": ua.os.family,
        "device": ua.device.family,
        "ip": request.client.host
    }

    finger_print = (
        f"{device_info['browser']}:{device_info['os']}:{device_info['os']}"
    )

    return finger_print