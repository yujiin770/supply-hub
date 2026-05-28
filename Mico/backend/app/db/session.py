from collections.abc import AsyncGenerator, Generator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

# ── Async engine (used by Alembic migrations and bootstrap) ───────────────────
connect_args = (
    {"ssl": settings.database_ssl}
    if settings.database_ssl == "require"
    else {}
)
async_engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=3,
    max_overflow=2,
    pool_timeout=30,
    pool_recycle=1800,
    connect_args=connect_args,
)
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine, expire_on_commit=False, class_=AsyncSession
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


# ── Sync engine (used by auth service / repositories — mirrors pharmalake) ────
def _build_sync_url(async_url: str) -> str:
    """Convert asyncpg URL to psycopg2 URL for sync SQLAlchemy."""
    return async_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)


_ssl_args: dict = (
    {"sslmode": "require"}
    if settings.database_ssl == "require"
    else {}
)
sync_engine = create_engine(
    _build_sync_url(settings.database_url),
    pool_pre_ping=True,
    pool_size=3,
    max_overflow=2,
    pool_timeout=30,
    pool_recycle=1800,
    connect_args=_ssl_args,
)
SyncSessionLocal = sessionmaker(
    bind=sync_engine, autocommit=False, autoflush=True, expire_on_commit=False
)


@contextmanager
def get_sync_session() -> Generator[Session, None, None]:
    session: Session = SyncSessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
