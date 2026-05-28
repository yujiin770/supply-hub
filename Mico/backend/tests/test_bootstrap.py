"""
Tests for the SUPERADMIN bootstrap service.

Uses an in-memory SQLite database (via aiosqlite) to avoid touching the real
PostgreSQL instance.  The tests validate the three core behaviours:

1. bootstrap_superadmin() creates a SUPERADMIN when none exists and env vars
   are configured.
2. bootstrap_superadmin() is idempotent – calling it twice must NOT create a
   second SUPERADMIN.
3. bootstrap_superadmin() logs a warning and returns without crashing when the
   env vars are not set.
"""
from __future__ import annotations

import logging
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.rbac import Role
from app.db.base import Base
from app.models.user import User  # noqa: F401 – registers metadata
from app.services.bootstrap_service import bootstrap_superadmin, get_superadmin_count

_HASHED_PLACEHOLDER = "$2b$12$testhash"

# ---------------------------------------------------------------------------
# In-memory async engine (SQLite via aiosqlite)
# ---------------------------------------------------------------------------

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture()
async def session() -> AsyncSession:  # type: ignore[override]
    """Create all tables in an in-memory SQLite DB and yield a clean session."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        # SQLite does not understand the PostgreSQL ENUM type – use String.
        connect_args={"check_same_thread": False},
    )

    # SQLite: emit CREATE TABLE with VARCHAR for enum columns
    async with engine.begin() as conn:
        # Map SQLAlchemy Enum to VARCHAR for SQLite compatibility
        await conn.run_sync(Base.metadata.create_all)

    AsyncTestSession = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)

    async with AsyncTestSession() as s:
        yield s

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mock_settings(email: str | None = "superadmin@example.com", password: str | None = "S3cret!") -> MagicMock:
    m = MagicMock()
    m.superadmin_email = email
    m.superadmin_password = password
    m.superadmin_full_name = "Test Super Admin"
    return m


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_bootstrap_creates_superadmin(session: AsyncSession) -> None:
    """A SUPERADMIN should be created when none exists and env vars are set."""
    with (
        patch("app.services.bootstrap_service.get_settings", return_value=_mock_settings()),
        patch("app.services.bootstrap_service.get_password_hash", return_value=_HASHED_PLACEHOLDER),
    ):
        await bootstrap_superadmin(session)

    count = await get_superadmin_count(session)
    assert count == 1


@pytest.mark.asyncio
async def test_bootstrap_is_idempotent(session: AsyncSession) -> None:
    """Calling bootstrap twice must not create a second SUPERADMIN."""
    with (
        patch("app.services.bootstrap_service.get_settings", return_value=_mock_settings()),
        patch("app.services.bootstrap_service.get_password_hash", return_value=_HASHED_PLACEHOLDER),
    ):
        await bootstrap_superadmin(session)
        await bootstrap_superadmin(session)

    count = await get_superadmin_count(session)
    assert count == 1


@pytest.mark.asyncio
async def test_bootstrap_warns_when_env_vars_missing(
    session: AsyncSession, caplog: pytest.LogCaptureFixture
) -> None:
    """Bootstrap should log a warning and NOT crash when env vars are absent."""
    with patch(
        "app.services.bootstrap_service.get_settings",
        return_value=_mock_settings(email=None, password=None),
    ):
        with caplog.at_level(logging.WARNING, logger="app.services.bootstrap_service"):
            await bootstrap_superadmin(session)

    assert await get_superadmin_count(session) == 0
    assert any("SUPERADMIN_EMAIL" in r.message for r in caplog.records)


@pytest.mark.asyncio
async def test_bootstrap_warns_when_password_missing(
    session: AsyncSession, caplog: pytest.LogCaptureFixture
) -> None:
    """Bootstrap should log a warning when only password is missing."""
    with patch(
        "app.services.bootstrap_service.get_settings",
        return_value=_mock_settings(password=None),
    ):
        with caplog.at_level(logging.WARNING, logger="app.services.bootstrap_service"):
            await bootstrap_superadmin(session)

    assert await get_superadmin_count(session) == 0


@pytest.mark.asyncio
async def test_bootstrapped_user_has_correct_role(session: AsyncSession) -> None:
    """The created user must have the SUPERADMIN role and be active."""
    with (
        patch("app.services.bootstrap_service.get_settings", return_value=_mock_settings()),
        patch("app.services.bootstrap_service.get_password_hash", return_value=_HASHED_PLACEHOLDER),
    ):
        await bootstrap_superadmin(session)

    from sqlalchemy import select

    result = await session.execute(select(User).where(User.role == Role.SUPERADMIN))
    user = result.scalar_one()
    assert user.email == "superadmin@example.com"
    assert user.is_active is True
    assert user.role == Role.SUPERADMIN
