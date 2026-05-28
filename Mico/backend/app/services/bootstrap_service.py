"""
Bootstrap service – ensures at least one SUPERADMIN account exists.

Called automatically on application startup.  If SUPERADMIN_EMAIL /
SUPERADMIN_PASSWORD are not set in the environment the function logs a warning
and returns without crashing.
"""
from __future__ import annotations

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.rbac import Role
from app.core.security import get_password_hash
from app.models.user import User

logger = logging.getLogger(__name__)


async def get_superadmin_count(session: AsyncSession) -> int:
    """Return the number of SUPERADMIN users in the database."""
    result = await session.execute(
        select(User).where(User.role == Role.SUPERADMIN)
    )
    return len(result.scalars().all())


async def bootstrap_superadmin(session: AsyncSession) -> None:
    """
    Idempotent bootstrap: create the first SUPERADMIN if none exists.

    Reads credentials from env vars SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD.
    Logs a warning (and returns early) when either variable is absent.
    """
    settings = get_settings()

    count = await get_superadmin_count(session)
    if count > 0:
        logger.info("Bootstrap: SUPERADMIN already exists (%d). Skipping.", count)
        return

    email = settings.superadmin_email
    password = settings.superadmin_password

    if not email or not password:
        logger.warning(
            "Bootstrap: No SUPERADMIN found in the database but "
            "SUPERADMIN_EMAIL and/or SUPERADMIN_PASSWORD are not set. "
            "Set these env vars to auto-create the first superadmin."
        )
        return

    user = User(
        id=uuid.uuid4(),
        email=email,
        full_name=settings.superadmin_full_name,
        password_hash=get_password_hash(password),
        role=Role.SUPERADMIN,
        is_active=True,
    )
    session.add(user)
    await session.commit()
    logger.info("Bootstrap: SUPERADMIN '%s' created successfully.", email)
