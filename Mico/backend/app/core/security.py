import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(
    subject: str,
    role: str,
    email: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "email": email,
        "type": "access",
        "exp": expire,
    }
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(
    subject: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    if expires_delta is None:
        expires_delta = timedelta(days=settings.refresh_token_expire_days)
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode: dict[str, Any] = {
        "sub": subject,
        "type": "refresh",
        "exp": expire,
    }
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_mfa_token(user_id: uuid.UUID) -> str:
    """Short-lived token (10 min) used only to correlate Step 1 → Step 2 of MFA."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=10)
    to_encode: dict[str, Any] = {
        "sub": str(user_id),
        "type": "mfa",
        "exp": expire,
    }
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_impersonation_token(
    owner_user_id: uuid.UUID,
    owner_role: str,
    owner_email: str,
    impersonated_by: uuid.UUID,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Access token issued to a superadmin acting as a supplier owner."""
    if expires_delta is None:
        expires_delta = timedelta(hours=2)
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode: dict[str, Any] = {
        "sub": str(owner_user_id),
        "role": owner_role,
        "email": owner_email,
        "type": "access",
        "impersonated_by": str(impersonated_by),
        "exp": expire,
    }
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_client_access_token(
    subject: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Issue a short-lived access token for an API client (no user role / email)."""
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode: dict[str, Any] = {
        "sub": subject,
        "type": "client_access",
        "exp": expire,
    }
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])


def try_decode_token(token: str) -> Optional[dict[str, Any]]:
    try:
        return decode_token(token)
    except JWTError:
        return None
