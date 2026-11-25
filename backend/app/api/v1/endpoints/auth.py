from fastapi import APIRouter, Depends, status, Request, Response, BackgroundTasks, Form
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import HTTPException
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta
from fastapi.templating import Jinja2Templates
from pathlib import Path
import asyncio

# folders imports
from ..schemas.auth_schema import SignUpModel, LoginModel, CompleteProfileModel
from ..schemas.user_schema import UserDataModel, UpdateModel
from ...deps.google import oauth
from ...deps.auth import AccessTokenBearer, RefreshTokenBearer, get_this_user
from ....core.database_session_init import get_session
from ....core.security import get_device_info, hash_password, verify_password
from ..services.auth_service import AuthService
from ....models.user_model import UserRole

from ..utils.validators import (
    create_access_token,
    create_refresh_token,
    create_url_safe_token,
    decode_url_safeToken,
)
from ..utils.mail import send_email_verification_email, send_password_reset_email
from ..utils.redis import store_refresh_token, get_refresh_token, store_access_token, del_refresh_token, del_access_token
from ..utils.paths import template_path
from app.config import BASE_DIR, settings

from ..utils.redis import store_refresh_token
from ....errors import UserAlreadyExists, UserNotFound, InvalidToken

auth_router = APIRouter()
auth_service = AuthService()
REFRESH_TOKEN_EXPIRY = 60 * 60 * 24 * 7

template = Jinja2Templates(template_path)


@auth_router.post("/refresh_access")
async def refresh_access_token(
    request: Request,
    response: Response,
    token_details: dict = Depends(RefreshTokenBearer()),
    session: AsyncSession = Depends(get_session),
):

    user_uid = token_details.get("user").get("user_uid")
    user_email = token_details.get("user").get("email")
    finger_print = token_details.get("user").get("finger_print")

    user = await auth_service.get_email_user(email=user_email, session=session)
    if not user:
        raise UserNotFound()

    user_data = {"email": user.email, "user_uid": str(user.uid), "role": user.role, "finger_print":finger_print}
    new_access_token, access_payload = create_access_token(user_data=user_data)
    if not new_access_token:
        raise InvalidToken()

    await store_access_token(user_uid=user_uid, value=access_payload, finger_print=finger_print)

    response = JSONResponse(
        content={
            "email": user_email,
            "user_uid": str(user_uid),
        },
        status_code=status.HTTP_200_OK,
    )
    response.set_cookie(
        key=f"access_token",
        value=new_access_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
        domain=settings.COOKIE_DOMAIN,
    )
    
    return response


@auth_router.post("/logout")
async def log_out(request: Request, response: Response, session: AsyncSession = Depends(get_session), user: UserDataModel = Depends(get_this_user)):
    uid = user.uid
    finger_print = get_device_info(request)
    await del_refresh_token(user_uid=uid, finger_print=finger_print)
    await del_access_token(user_uid=uid, finger_print=finger_print)

    response = JSONResponse(
        content={
            "message": "Logged out successfully"
        },
        status_code=status.HTTP_200_OK,
    )
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
        domain=settings.COOKIE_DOMAIN,
    )
    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
        domain=settings.COOKIE_DOMAIN,
    )

    return response


@auth_router.post("/signin/{remember_me}")
async def login(
    remember_me: bool,
    response: Response,
    request: Request,
    login_data: LoginModel,
    session: AsyncSession = Depends(get_session),
):
    email = login_data.email
    password = login_data.password

    user_with_email = await auth_service.get_email_user(email=email, session=session)
    if user_with_email is None:
        raise UserNotFound()
    
    if user_with_email.hashed_password == None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account was created with Google. Please sign in with Google, or reset password to enable email and password login."
        )

    valid_password = verify_password(password=password, hash=user_with_email.hashed_password)
    if not valid_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Wrong password or email! try again."
        )
    
    finger_print = get_device_info(request)
    existing_device = await get_refresh_token(
        user_uid=user_with_email.uid, finger_print=finger_print
    )

    # if not existing_device: coming soon
    user_data = {
        "email": user_with_email.email,
        "user_uid": str(user_with_email.uid),
        "role": user_with_email.role,
    }
    user_data["finger_print"] = finger_print
    access_token, access_payload = create_access_token(user_data=user_data)

    refresh_token, jti, payload = create_refresh_token(
        user_data=user_data, expiry=REFRESH_TOKEN_EXPIRY, refresh=True
    )

    await store_refresh_token(user_uid=jti, value=payload, finger_print=finger_print)
    await store_access_token(user_uid=jti, value=access_payload, finger_print=finger_print)

    max_age = 60 * 60 * 24 * 30 if remember_me else 60 * 60 * 24

    response = JSONResponse(
        content={
            "email": email,
            "user_uid": str(user_with_email.uid)
        },
        status_code=status.HTTP_200_OK,
    )

    response.set_cookie(
        key=f"refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
        domain=settings.COOKIE_DOMAIN,
        max_age=max_age,
    )

    response.set_cookie(
        key=f"access_token",
        value=access_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
        domain=settings.COOKIE_DOMAIN,
    )

    return response


@auth_router.post("/signup")
async def create_an_account(
    signup_data: SignUpModel,
    request: Request,
    bg: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
):

    if signup_data.role not in {UserRole.CLIENT, UserRole.AGENT, UserRole.LANDLORD}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account role cannot be self-assigned")

    existing_user = await auth_service.get_email_user(
        email=signup_data.email, session=session
    )
    if existing_user:

        raise UserAlreadyExists()

    signup_data_dict = signup_data.model_dump(exclude_defaults=True)
    add_user = await auth_service.add_a_user(
        signup_data=signup_data_dict, session=session
    )
    if add_user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail={"detail": f"{add_user}"}
        )

    users_email = add_user.email
    token_data = {"email": users_email}
    username = add_user.fullname
    token = create_url_safe_token(data=token_data)
    verification_link = str(request.url_for("email_verification", token=token))

    bg.add_task(
        send_email_verification_email,
        users_email=users_email,
        username=username,
        verification_link=verification_link,
    )
    return JSONResponse(
        content={
            "message": "An Email has been sent for verification of account".title()
        },
        status_code=status.HTTP_201_CREATED,
    )


@auth_router.get("/resend_verification/{email}/{username}")
async def resend_verify(
    bg: BackgroundTasks,
    request: Request,
    email: str,
    username: str,
    session: AsyncSession = Depends(get_session),
):
    users_email = email
    token_data = {"email": users_email}
    token = create_url_safe_token(data=token_data)
    verification_link = str(request.url_for("email_verification", token=token))

    bg.add_task(
        send_email_verification_email,
        users_email=users_email,
        username=username,
        verification_link=verification_link,
    )

    return JSONResponse(
        content={
            "message": "An Email has been sent for verification of account".title()
        },
        status_code=status.HTTP_201_CREATED,
    )


@auth_router.get("/verify/{token}", name="email_verification")
async def verify_account(
    request: Request, token: str, session: AsyncSession = Depends(get_session)
):
    token_data = await asyncio.to_thread(decode_url_safeToken, token=token)
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Token is Invalid"},
        )
    email = token_data["email"]
    user = await auth_service.get_email_user(email=email, session=session)
    
    if not user:
        raise UserNotFound()
    
    await auth_service.update_user_info(
        user=user, info={"is_verified": True}, session=session
    )
    login_link = str("http://localhost:5173/sign-in") #link for sign in page
    return template.TemplateResponse(
        request=request,
        name="email_verified.html",
        context={"request": request, "home_link": login_link},
        status_code=200,
    )


@auth_router.get("/login/google")
async def login_with_google(
    request: Request,
    remember_me: bool = False,
    role: str | None = None,
    flow: str | None = None,
):
    request.session["remember_me"] = remember_me
    # The role/flow the user picked before leaving for Google travel in
    # the server session (never a client-readable cookie) and are read
    # back in the callback below.
    request.session["role"] = role if role in {"client", "agent"} else None
    request.session["flow"] = flow if flow in {"signup", "signin"} else None
    redirect_url = request.url_for(
        "auth_google"
    )  # Acts as a callback url for google to redirect to after successful authentication
    # Also url_for is used to generate the absolute url for the auth_google endpoint which is required by google for redirection after authentication
    return await oauth.google.authorize_redirect(request, redirect_url)


@auth_router.get("/google", name="auth_google")
async def auth_google(
    request: Request,
    session: AsyncSession = Depends(get_session),
):

    token = await oauth.google.authorize_access_token(request)
    user_info = token["userinfo"]

    email = user_info["email"]
    name = user_info["name"]
    remember_me = request.session.get("remember_me", False)
    # Role the user picked before Google (client/agent), if any. It is
    # popped so a later sign-in cannot reuse a stale choice.
    carried_role = request.session.pop("role", None)
    request.session.pop("flow", None)

    # gets user by email
    added_user = await auth_service.get_email_user(email=email, session=session)

    is_new_user = added_user is None
    if is_new_user:
        """if user doesnt exists user is added to the database"""
        signup_data = {"fullname": name, "email": email, "hashed_password": None, "is_verified": True}
        if user_info.get("picture"):
            signup_data["profile_image"] = user_info["picture"][:250]
        if carried_role in {"client", "agent"}:
            # A first-time Google user keeps the role they picked.
            signup_data["role"] = UserRole(carried_role)
        added_user = await auth_service.add_a_user(
            signup_data=signup_data,
            session=session,
        )
    # A returning user's existing role is never overwritten.

    user_data = {
        "email": added_user.email,
        "user_uid": str(added_user.uid),
        "role": added_user.role,
    }

    # get the users device info and use as fingerprint
    finger_print = get_device_info(request=request)
    user_data["finger_print"] = finger_print

    access_token, access_payload = create_access_token(user_data=user_data)
    
    refresh_token, jti, payload = create_refresh_token(
        user_data=user_data, expiry=REFRESH_TOKEN_EXPIRY, refresh=True
    )
    await store_refresh_token(user_uid=jti, value=payload, finger_print=finger_print)
    await store_access_token(user_uid=jti, value=access_payload, finger_print=finger_print)

    frontend_url = (settings.FRONTEND_URL or "http://localhost:3000").rstrip("/")
    response = RedirectResponse(
        url=f"{frontend_url}/dashboard"
        if not (is_new_user and carried_role not in {"client", "agent"})
        else f"{frontend_url}/complete-profile?needs_role=1"
    )

    max_age = 60 * 60 * 24 * 30 if remember_me else 60 * 60 * 24
    response.set_cookie(
        key=f"refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
        domain=settings.COOKIE_DOMAIN,
        max_age=max_age,
    )

    response.set_cookie(
        key=f"access_token",
        value=access_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
        domain=settings.COOKIE_DOMAIN,
    )
    return response


@auth_router.post("/complete-profile")
async def complete_profile(
    profile_data: CompleteProfileModel,
    user: UserDataModel = Depends(get_this_user),
    session: AsyncSession = Depends(get_session),
):
    """Save the Customer/Agent role a first-time Google user picks on the
    /complete-profile page. Only client/agent can be self-assigned."""
    if profile_data.role not in {UserRole.CLIENT, UserRole.AGENT}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role must be client or agent",
        )
    user_exists = await auth_service.get_uid_user(uid=user.uid, session=session)
    if user_exists is None:
        raise UserNotFound()
    await auth_service.update_user_info(
        user=user_exists, info={"role": profile_data.role}, session=session
    )
    return JSONResponse(
        content={"message": "Role updated successfully"},
        status_code=status.HTTP_200_OK,
    )


@auth_router.post("/reset_password")
async def reset_user_password(
    request: Request,
    bg: BackgroundTasks,
    email: str,
    session: AsyncSession = Depends(get_session),
):
    user = await auth_service.get_email_user(email=email, session=session)
    if user is None:
        raise HTTPException(
            status_code=404, detail="User not found try signing up"
        )
    token_data = {"email": email}
    username = user.fullname
    safe_token = create_url_safe_token(token_data)
    reset_link = str(request.url_for("reset_link", token=safe_token))
    bg.add_task(
        send_password_reset_email,
        users_email=email,
        username=username,
        verification_link=reset_link,
    )
    return JSONResponse(content={"message": f"Reset email has been sent to {email}"})


@auth_router.get("/password_reset/{token}", name="reset_link")
async def password_reset_form(
    request: Request, token: str, session: AsyncSession = Depends(get_session)
):
    token_data = await asyncio.to_thread(decode_url_safeToken, token=token)
    if token_data is None:
        raise HTTPException(status_code=403, detail={"message": "Invalid Token"})

    email = token_data["email"]
    user = await auth_service.get_email_user(email=email, session=session)

    if user is None:
        raise UserNotFound()

    home_link = str(request.url_for("swagger_ui_html"))
    form_link = f"http://127.0.0.1:8000/api/v1.0/auth/password_reset?token={token}"  # Reason i did this is because url_for() was giving me a no routes found with name error so i just hardcoded it
    return template.TemplateResponse(
        request=request,
        name="reset_password_form.html",
        context={
            "request": request,
            "token": token,
            "home_link": home_link,
            "form_link": form_link,
        },
    )


@auth_router.post("/password_reset", name="verify_reset_link")
async def verify_password_reset(
    request: Request,
    token: str,
    session: AsyncSession = Depends(get_session),
    new_password=Form(...),
    confirm_password: str = Form(...),
):
    token_data = await asyncio.to_thread(decode_url_safeToken, token=token)
    if token_data is None:
        raise HTTPException(status_code=403, detail={"message": "Invalid Token"})
    email = token_data["email"]

    user = await auth_service.get_email_user(email=email, session=session)
    new_password_hash = hash_password(new_password)

    await auth_service.update_user_info(
        user=user, info={"hashed_password": new_password_hash}, session=session
    )
    home_link = str("http://localhost:5173/sign-in")

    return template.TemplateResponse(
        request=request,
        name="reset_verified.html",
        context={"request": request, "home_link": home_link},
    )


@auth_router.delete("/delete_account")
async def delete_user_account(user: UserDataModel = Depends(get_this_user), session: AsyncSession = Depends(get_session)):
    uid = user.uid
    delete_user = await auth_service.delete_user_uid(uid=uid, session=session)
    if delete_user == False:
        raise UserNotFound()
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)