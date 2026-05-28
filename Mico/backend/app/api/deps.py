import uuid
from typing import Callable, Iterable, NamedTuple, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Role
from app.core.security import decode_token
from app.db.session import get_session
from app.models.api_client import ApiClient
from app.models.supplier import Supplier
from app.models.user import User

security_scheme = HTTPBearer()


class OrderCaller(NamedTuple):
    """
    Unified caller context for order endpoints.
    Exactly one of `user` or `api_client` is set.
    """

    user: Optional[User]
    api_client: Optional[ApiClient]

    @property
    def is_api_client(self) -> bool:
        return self.api_client is not None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    subject = payload.get("sub")
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    try:
        user_id = uuid.UUID(subject)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )

    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    # Impersonation tokens (issued by a superadmin acting as a supplier owner)
    # carry an 'impersonated_by' claim.  Allow inactive accounts so a superadmin
    # can manage unapproved / suspended suppliers without triggering a 401.
    is_impersonation = bool(payload.get("impersonated_by"))

    if user is None or (not user.is_active and not is_impersonation):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    return user


def require_roles(roles: Iterable[Role]) -> Callable[[User], User]:
    allowed_roles = set(roles)

    async def _role_guard(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return _role_guard


class SupplierOwnerContext(NamedTuple):
    user: User
    supplier: Supplier


async def get_current_supplier_owner(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> SupplierOwnerContext:
    """
    Ensures the authenticated user is a SUPPLIER_OWNER with a linked supplier.
    Returns (user, supplier) — both eagerly loaded within the async session.
    """
    if user.role != Role.SUPPLIER_OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SUPPLIER_OWNER role required.",
        )
    if user.supplier_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is not linked to a supplier.",
        )
    result = await session.execute(
        select(Supplier).where(Supplier.id == user.supplier_id)
    )
    supplier = result.scalar_one_or_none()
    if supplier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated supplier not found.",
        )
    return SupplierOwnerContext(user=user, supplier=supplier)


# ── Variants that do NOT require the user to be active ───────────────────────
# Used for /auth/me and KYC upload so inactive supplier owners can still
# fetch their profile and submit documents.

async def get_current_user_allow_inactive(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    """Same as get_current_user but does NOT block inactive accounts."""
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    subject = payload.get("sub")
    if not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    try:
        user_id = uuid.UUID(subject)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user


async def get_current_supplier_owner_or_inactive(
    user: User = Depends(get_current_user_allow_inactive),
    session: AsyncSession = Depends(get_session),
) -> SupplierOwnerContext:
    """
    Like get_current_supplier_owner but allows inactive accounts.
    Used for KYC upload and supplier profile so pending suppliers can still act.
    """
    if user.role != Role.SUPPLIER_OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SUPPLIER_OWNER role required.",
        )
    if user.supplier_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is not linked to a supplier.",
        )
    result = await session.execute(
        select(Supplier).where(Supplier.id == user.supplier_id)
    )
    supplier = result.scalar_one_or_none()
    if supplier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated supplier not found.",
        )
    return SupplierOwnerContext(user=user, supplier=supplier)


# ── API Client (machine-to-machine) ──────────────────────────────────────────

async def get_current_api_client(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    session: AsyncSession = Depends(get_session),
) -> ApiClient:
    """
    Authenticate an external system using a ``client_access`` JWT.

    The token is obtained via ``POST /auth/client-token`` using the
    client_id + client_secret pair issued by a superadmin.
    """
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    if payload.get("type") != "client_access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is not a client access token",
        )

    sub: str = payload.get("sub", "")
    if not sub.startswith("client:"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid client token subject",
        )

    client_id = sub[len("client:"):]
    result = await session.execute(
        select(ApiClient).where(ApiClient.client_id == client_id)
    )
    api_client = result.scalar_one_or_none()
    if api_client is None or not api_client.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API client not found or inactive",
        )
    return api_client


async def get_orders_caller(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    session: AsyncSession = Depends(get_session),
) -> OrderCaller:
    """
    Accepts either a regular user JWT (type=access) or an API client JWT
    (type=client_access).  Used by order endpoints so external integrations
    can call them with client credentials.
    """
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    token_type = payload.get("type", "")
    sub: str = payload.get("sub", "")

    # ── API client path ───────────────────────────────────────────────────────
    if token_type == "client_access" and sub.startswith("client:"):
        client_id = sub[len("client:"):]
        result = await session.execute(
            select(ApiClient).where(ApiClient.client_id == client_id)
        )
        api_client = result.scalar_one_or_none()
        if api_client is None or not api_client.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API client not found or inactive",
            )
        return OrderCaller(user=None, api_client=api_client)

    # ── Regular user path ─────────────────────────────────────────────────────
    if token_type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    try:
        user_id = uuid.UUID(sub)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return OrderCaller(user=user, api_client=None)
