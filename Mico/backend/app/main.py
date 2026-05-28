import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.db.session import AsyncSessionLocal
from app.services.bootstrap_service import bootstrap_superadmin

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifecycle: run startup bootstrap, then serve."""
    logger.info("Startup: running SUPERADMIN bootstrap check…")
    async with AsyncSessionLocal() as session:
        await bootstrap_superadmin(session)
    yield
    logger.info("Shutdown: application stopped.")


app = FastAPI(
    title=settings.project_name,
    version=settings.version,
    lifespan=lifespan,
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
    openapi_url="/api/v1/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

# Serve uploaded KYC files from /uploads (replace with cloud storage later)
_upload_path = Path(settings.upload_dir)
_upload_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_upload_path)), name="uploads")


@app.get("/health")
async def health_check() -> dict:
    return {"status": "ok"}
