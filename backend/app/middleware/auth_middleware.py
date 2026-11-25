from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware

from ..config import settings


def register_sessionMiddleware(app: FastAPI):
    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.GOOGLE_CLIENT_SECRET,
    )

    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    frontend_url = getattr(settings, "FRONTEND_URL", None)
    if frontend_url:
        allowed_origins.append(frontend_url.rstrip("/"))

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
