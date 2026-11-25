from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.core.database_session_init import engine, Base
from .models.user_model import User
from .middleware.auth_middleware import register_sessionMiddleware
from .errors import register_all_errors
from app.api.v1.utils.paths import static_files_path
from sqlmodel import SQLModel

# all routers
from .api.v1.endpoints.users import user_router
from .api.v1.endpoints.auth import auth_router
from .api.v1.endpoints.listings import list_router
from .api.v1.endpoints.reviews import reviews_router
from .api.v1.endpoints.admin import admin_router

version = "v1.0"
schedular = AsyncIOScheduler()


async def init_db():
    # For sanity check
    try:
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)
        print("Database connection okay")

    except Exception as e:
        print(f"Database connection failed: {e}")


@asynccontextmanager
async def life_span(app: FastAPI):
    print("housify's server is starting ...")
    # Db check
    await init_db()

    # start background jobs
    schedular.start()
    print("scheduler started!")
    yield

    # Shutdown everything
    schedular.shutdown()
    print("scheduler stopped - server has stopped")


app = FastAPI(
    title="Housify", version=version, description="""???""", lifespan=life_span
)

register_sessionMiddleware(app)
register_all_errors(app)

API_PREFIX = f"/api/{version}"

app.include_router(user_router, prefix=f"{API_PREFIX}/user", tags=["user"])

app.mount("/static", StaticFiles(directory=static_files_path), name="static")

app.include_router(auth_router, prefix=f"{API_PREFIX}/auth", tags=["auth"])

app.include_router(list_router, prefix=f"{API_PREFIX}/list", tags=["list"])

app.include_router(reviews_router, prefix=f"{API_PREFIX}/reviews", tags=["reviews"])

app.include_router(admin_router, prefix=f"{API_PREFIX}/admin", tags=["admin"])


@app.get("/health")
async def health_check():
    return {"status": "ok"}
