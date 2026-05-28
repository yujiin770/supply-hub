"""
Admin-only bootstrap endpoints.

POST /api/v1/admin/bootstrap/superadmin
  – Creates the first SUPERADMIN via the API.
  – Requires an authenticated ADMIN caller (chicken-and-egg is resolved
    automatically on startup via SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD env vars).
  – Returns 409 if a SUPERADMIN already exists.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.config import get_settings
from app.core.rbac import Role
from app.core.response import success_response
from app.core.security import get_password_hash
from app.db.session import get_session
from app.models.user import User
from app.schemas.user import UserResponse
from app.services.bootstrap_service import get_superadmin_count

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post(
    "/bootstrap/superadmin",
    response_model=None,
    status_code=status.HTTP_201_CREATED,
    summary="Bootstrap the first SUPERADMIN (one-time only)",
)
async def bootstrap_superadmin(
    session: AsyncSession = Depends(get_session),
    # Must be an existing ADMIN (or SUPERADMIN) to trigger this endpoint.
    _caller: User = Depends(require_roles([Role.ADMIN, Role.SUPERADMIN])),
) -> UserResponse:
    """
    Creates the first SUPERADMIN account if none exists.

    - **409** if a SUPERADMIN already exists.
    - Reads credentials from `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`,
      and `SUPERADMIN_FULL_NAME` environment variables.
    - Raises **400** if the required env vars are not configured.
    """
    if await get_superadmin_count(session) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A SUPERADMIN already exists.",
        )

    settings = get_settings()
    email = settings.superadmin_email
    password = settings.superadmin_password

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set "
                "in the environment to use this endpoint."
            ),
        )

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
    await session.refresh(user)

    return success_response(
        data=UserResponse.model_validate(user).model_dump(mode="json"),
        message="SUPERADMIN created successfully.",
        status_code=status.HTTP_201_CREATED,
    )
