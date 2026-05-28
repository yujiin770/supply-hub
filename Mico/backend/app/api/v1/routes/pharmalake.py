"""
PharmaLake proxy routes.

FE must NOT call PharmaLake directly — all catalog browsing goes through
these SupplyHub endpoints so we can enforce auth/RBAC, add caching later,
and avoid exposing PharmaLake credentials to the browser.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import require_roles
from app.core.rbac import Role
from app.models.user import User
from app.schemas.pharmalake import PharmaLakeCatalogResponse
from app.services.pharmalake_catalog_service import pharmalake_catalog

router = APIRouter(prefix="/pharmalake", tags=["pharmalake"])

_CATALOG_ROLES = [
    Role.SUPPLIER_OWNER,
    Role.SUPPLIER_STAFF,
    Role.ADMIN,
    Role.SUPERADMIN,
]


@router.get(
    "/catalog",
    response_model=PharmaLakeCatalogResponse,
    summary="Browse PharmaLake master catalog (proxied)",
    description=(
        "Returns a paginated list of product packs from the PharmaLake "
        "master catalog. Text search (`q`) is applied client-side in Phase 1."
    ),
)
async def get_pharmalake_catalog(
    is_active: bool = Query(True, description="Return only active packs"),
    limit: int = Query(50, ge=1, le=200, description="Page size"),
    offset: int = Query(0, ge=0, description="Zero-based page offset"),
    q: Optional[str] = Query(None, max_length=200, description="Free-text search"),
    _user: User = Depends(require_roles(_CATALOG_ROLES)),
) -> PharmaLakeCatalogResponse:
    try:
        return await pharmalake_catalog.search_catalog(
            is_active=is_active,
            limit=limit,
            offset=offset,
            q=q or None,
        )
    except RuntimeError as exc:
        # Missing credentials — configuration error, not a transient upstream issue.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"PharmaLake catalog unavailable: {exc}",
        ) from exc
