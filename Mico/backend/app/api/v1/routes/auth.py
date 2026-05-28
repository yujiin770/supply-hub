from fastapi import APIRouter, Depends, Response

from app.api.deps import get_current_user, get_current_user_allow_inactive, require_roles
from app.db.session import get_sync_session
from app.models.user import User
from app.schemas.api_client import ClientTokenRequest, ClientTokenResponse
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MfaRequiredResponse,
    RefreshRequest,
    ResetPasswordRequest,
    TokenResponse,
    VerifyOtpRequest,
)
from app.schemas.user import UserResponse
from app.services.api_client_service import ApiClientService
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])

# Single service instance — session_factory is thread-safe
_auth_service = AuthService(session_factory=get_sync_session)
_client_service = ApiClientService(session_factory=get_sync_session)


@router.post(
    "/login",
    response_model=MfaRequiredResponse,
    summary="Step 1 — validate credentials and send OTP",
)
def login(payload: LoginRequest) -> MfaRequiredResponse:
    """
    Validates email + password. On success a 6-digit OTP is sent to the
    user’s registered email and a short-lived `mfa_token` is returned.
    Use `POST /auth/verify-otp` to exchange the OTP for access tokens.
    """
    return _auth_service.login(email=payload.email, password=payload.password)


@router.post(
    "/verify-otp",
    response_model=TokenResponse,
    summary="Step 2 — verify OTP and obtain access tokens",
)
def verify_otp(payload: VerifyOtpRequest) -> TokenResponse:
    """
    Supply the `mfa_token` from Step 1 and the 6-digit OTP received by email
    to receive full access & refresh tokens.
    """
    return _auth_service.verify_otp(mfa_token=payload.mfa_token, otp=payload.otp)


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user_allow_inactive)) -> UserResponse:
    """Returns the authenticated user's profile. Works even if the account is inactive."""
    return UserResponse.model_validate(current_user)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Exchange a refresh token for a new token pair",
)
def refresh(payload: RefreshRequest) -> TokenResponse:
    """
    Token rotation endpoint. Supply a valid refresh token to receive a new
    access token + refresh token pair. The old refresh token is invalidated
    implicitly (stateless JWT — the new token supersedes the old one).
    """
    return _auth_service.refresh(payload.refresh_token)


@router.post(
    "/client-token",
    response_model=ClientTokenResponse,
    summary="Exchange client_id + client_secret for an access token (partner / external use)",
)
def client_token(payload: ClientTokenRequest) -> ClientTokenResponse:
    """
    OAuth2 Client Credentials flow.

    External systems (e.g. buyer ERPs, order integrations) exchange their
    ``client_id`` and ``client_secret`` for a short-lived JWT access token.
    No user session is involved.

    Credentials are issued by a superadmin via ``POST /superadmin/api-clients``.
    """
    return _client_service.authenticate(payload.client_id, payload.client_secret)


@router.post(
    "/forgot-password",
    status_code=204,
    summary="Request a password-reset link",
)
def forgot_password(payload: ForgotPasswordRequest) -> Response:
    """
    Send a password-reset email to the given address.
    Always returns 204 regardless of whether the email is registered,
    to prevent user-enumeration attacks.
    """
    _auth_service.forgot_password(payload.email)
    return Response(status_code=204)


@router.post(
    "/reset-password",
    status_code=204,
    summary="Reset password using a valid reset token",
)
def reset_password(payload: ResetPasswordRequest) -> Response:
    """
    Accepts the raw reset token (from the link in the email) and a new
    password. Invalidates the token after use.
    """
    _auth_service.reset_password(token=payload.token, new_password=payload.new_password)
    return Response(status_code=204)
