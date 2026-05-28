from fastapi import APIRouter, Depends

from app.core.rate_limit import signup_rate_limiter
from app.db.session import get_sync_session
from app.schemas.onboarding import SupplierSignupRequest, SupplierSignupResponse
from app.services.onboarding_service import OnboardingService

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

_onboarding_service = OnboardingService(session_factory=get_sync_session)


@router.post(
    "/signup",
    response_model=SupplierSignupResponse,
    status_code=202,
    summary="Supplier self-signup (public)",
    description=(
        "Public endpoint — no authentication required.\n\n"
        "Creates a **Supplier** (status=`PENDING_KYC`) and a **SUPPLIER_OWNER** "
        "user account (`is_active=false`). The account is inactive until a "
        "SUPERADMIN or ADMIN approves the application.\n\n"
        "**Rate limit:** 5 requests per IP per minute."
    ),
    dependencies=[Depends(signup_rate_limiter)],
)
def supplier_signup(payload: SupplierSignupRequest) -> SupplierSignupResponse:
    return _onboarding_service.signup(payload)
