"""
API Clients — superadmin CRUD endpoints for OAuth2 client credentials.

Security model:
  - All management routes require SUPERADMIN role.
  - Rotate requires a fresh OTP (sent by POST /superadmin/api-clients/otp first).
  - The public token exchange is at POST /auth/client-token (in auth.py).
"""
import uuid

from fastapi import APIRouter, Depends, status

from app.api.deps import require_roles
from app.core.rbac import Role
from app.db.session import get_sync_session
from app.models.user import User
from app.schemas.api_client import (
    ApiClientCreate,
    ApiClientCreatedResponse,
    ApiClientResponse,
    ApiClientUpdate,
    OtpVerify,
)
from app.services.api_client_service import ApiClientService

router = APIRouter(prefix="/superadmin/api-clients", tags=["superadmin"])

_service = ApiClientService(session_factory=get_sync_session)
_SUPERADMIN = [Role.SUPERADMIN]


@router.get(
    "",
    response_model=list[ApiClientResponse],
    summary="List all API clients (SUPERADMIN only)",
)
def list_clients(
    caller: User = Depends(require_roles(_SUPERADMIN)),
) -> list[ApiClientResponse]:
    return _service.list_all()


@router.post(
    "",
    response_model=ApiClientCreatedResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Issue new client credentials (SUPERADMIN only)",
    description=(
        "Creates a ``client_id`` + ``client_secret`` pair for an external system.\n\n"
        "⚠️  **The ``client_secret`` is shown only once.** Store it securely."
    ),
)
def create_client(
    payload: ApiClientCreate,
    caller: User = Depends(require_roles(_SUPERADMIN)),
) -> ApiClientCreatedResponse:
    return _service.create(
        name=payload.name,
        description=payload.description,
        expires_at=payload.expires_at,
        actor_id=caller.id,
    )


@router.patch(
    "/{client_pk}",
    response_model=ApiClientResponse,
    summary="Update a client (SUPERADMIN only)",
)
def update_client(
    client_pk: uuid.UUID,
    payload: ApiClientUpdate,
    caller: User = Depends(require_roles(_SUPERADMIN)),
) -> ApiClientResponse:
    return _service.update(client_pk, payload, actor_id=caller.id)


@router.patch(
    "/{client_pk}/revoke",
    response_model=ApiClientResponse,
    summary="Revoke (deactivate) a client (SUPERADMIN only)",
)
def revoke_client(
    client_pk: uuid.UUID,
    caller: User = Depends(require_roles(_SUPERADMIN)),
) -> ApiClientResponse:
    return _service.revoke(client_pk, actor_id=caller.id)


@router.delete(
    "/{client_pk}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Hard-delete a client record (SUPERADMIN only)",
)
def delete_client(
    client_pk: uuid.UUID,
    caller: User = Depends(require_roles(_SUPERADMIN)),
) -> None:
    _service.delete(client_pk, actor_id=caller.id)


@router.post(
    "/otp",
    summary="Request OTP to authorise a secret rotation (SUPERADMIN only)",
    status_code=status.HTTP_202_ACCEPTED,
)
def request_rotate_otp(
    caller: User = Depends(require_roles(_SUPERADMIN)),
) -> dict:
    """Sends a 6-digit OTP to the superadmin's email. Submit it to ``/{id}/rotate``."""
    _service.request_rotate_otp(actor_id=caller.id)
    return {"detail": "OTP sent to your registered email."}


@router.post(
    "/{client_pk}/rotate",
    response_model=ApiClientCreatedResponse,
    summary="Verify OTP and rotate client_id + secret (SUPERADMIN only)",
    description=(
        "Verifies the OTP then replaces both ``client_id`` and ``client_secret``.\n\n"
        "⚠️  **The new ``client_secret`` is shown only once.** Store it securely."
    ),
)
def rotate_client(
    client_pk: uuid.UUID,
    payload: OtpVerify,
    caller: User = Depends(require_roles(_SUPERADMIN)),
) -> ApiClientCreatedResponse:
    return _service.rotate(client_pk, otp=payload.otp, actor_id=caller.id)
