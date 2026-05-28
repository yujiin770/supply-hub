import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.api.deps import (
    SupplierOwnerContext,
    get_current_supplier_owner_or_inactive,
    get_current_user_allow_inactive,
    require_roles,
)
from app.core.rbac import Role
from app.db.session import get_sync_session
from app.models.supplier import SupplierStatus
from app.models.user import User
from app.schemas.supplier import (
    PaginatedSuppliersResponse,
    SupplierCreate,
    SupplierResponse,
    SupplierStatusUpdate,
    SupplierUpdate,
)
from app.services.supplier_service import SupplierService

router = APIRouter(prefix="/suppliers", tags=["suppliers"])

_supplier_service = SupplierService(session_factory=get_sync_session)

_ADMIN_ROLES = [Role.SUPERADMIN, Role.ADMIN]


@router.get(
    "/me",
    response_model=SupplierResponse,
    summary="Get my supplier profile (SUPPLIER_OWNER, inactive-friendly)",
    description="Returns the supplier profile linked to the current SUPPLIER_OWNER account. "
    "Works even when the account is not yet active (i.e. during onboarding).",
)
async def get_my_supplier(
    ctx: SupplierOwnerContext = Depends(get_current_supplier_owner_or_inactive),
) -> SupplierResponse:
    return SupplierResponse.model_validate(ctx.supplier)


@router.post(
    "",
    response_model=SupplierResponse,
    status_code=201,
    summary="Create a new supplier",
)
async def create_supplier(
    payload: SupplierCreate,
    _: User = Depends(require_roles(_ADMIN_ROLES)),
) -> SupplierResponse:
    supplier = _supplier_service.create(payload)
    return SupplierResponse.model_validate(supplier)


@router.get(
    "",
    response_model=PaginatedSuppliersResponse,
    summary="List suppliers (paginated)",
)
async def list_suppliers(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[SupplierStatus] = Query(None),
    _: User = Depends(require_roles(_ADMIN_ROLES)),
) -> PaginatedSuppliersResponse:
    items, total = _supplier_service.list(skip=skip, limit=limit, filter_status=status)
    return PaginatedSuppliersResponse(
        items=[SupplierResponse.model_validate(s) for s in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{supplier_id}",
    response_model=SupplierResponse,
    summary="Get a supplier by ID",
)
async def get_supplier(
    supplier_id: uuid.UUID,
    _: User = Depends(require_roles(_ADMIN_ROLES)),
) -> SupplierResponse:
    supplier = _supplier_service.get_or_404(supplier_id)
    return SupplierResponse.model_validate(supplier)


@router.patch(
    "/{supplier_id}",
    response_model=SupplierResponse,
    summary="Update supplier details",
)
async def update_supplier(
    supplier_id: uuid.UUID,
    payload: SupplierUpdate,
    _: User = Depends(require_roles(_ADMIN_ROLES)),
) -> SupplierResponse:
    supplier = _supplier_service.update(supplier_id, payload)
    return SupplierResponse.model_validate(supplier)


@router.patch(
    "/{supplier_id}/status",
    response_model=SupplierResponse,
    summary="Update supplier status",
)
async def update_supplier_status(
    supplier_id: uuid.UUID,
    payload: SupplierStatusUpdate,
    _: User = Depends(require_roles(_ADMIN_ROLES)),
) -> SupplierResponse:
    supplier = _supplier_service.update_status(supplier_id, payload.status)
    return SupplierResponse.model_validate(supplier)
