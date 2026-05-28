import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.api.deps import require_roles
from app.core.rbac import Role
from app.db.session import get_sync_session
from app.models.supplier import SupplierStatus
from app.models.user import User
from app.schemas.audit_log import AuditLogListResponse, AuditLogResponse
from app.schemas.superadmin import (
    AdminUserListResponse,
    AdminUserResponse,
    CreateAdminRequest,
    ImpersonationResponse,
    ProvisionSupplierRequest,
    ProvisionSupplierResponse,
    SuperAdminSupplierListResponse,
    UpdateSupplierStatusRequest,
)
from app.schemas.supplier import SupplierResponse
from app.services.audit_log_service import AuditLogService
from app.services.superadmin_service import SuperAdminService

router = APIRouter(prefix="/superadmin", tags=["superadmin"])

_service = SuperAdminService(session_factory=get_sync_session)
_audit_service = AuditLogService(session_factory=get_sync_session)

# SUPERADMIN only — for operations that should never be available to ADMIN
_SUPERADMIN_ONLY = [Role.SUPERADMIN]
# SUPERADMIN and ADMIN — most read/write operations
_ADMIN_AND_ABOVE = [Role.SUPERADMIN, Role.ADMIN]


@router.post(
    "/suppliers",
    response_model=ProvisionSupplierResponse,
    status_code=201,
    summary="Provision supplier + owner user (SUPERADMIN only)",
    description=(
        "Atomically creates a Supplier with status **APPROVED** and a linked "
        "SUPPLIER_OWNER user. Both are created in a single transaction — if either "
        "fails the entire operation rolls back. Validates unique supplier email and "
        "owner email before inserting."
    ),
)
def provision_supplier(
    payload: ProvisionSupplierRequest,
    caller: User = Depends(require_roles(_ADMIN_AND_ABOVE)),
) -> ProvisionSupplierResponse:
    return _service.provision_supplier(payload, actor_id=caller.id)


@router.get(
    "/suppliers",
    response_model=SuperAdminSupplierListResponse,
    summary="List suppliers (SUPERADMIN only)",
)
def list_suppliers(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Max records to return"),
    status: Optional[SupplierStatus] = Query(None, description="Filter by status"),
    q: Optional[str] = Query(None, description="Search legal_name / trade_name / email / code"),
    _: User = Depends(require_roles(_ADMIN_AND_ABOVE)),
) -> SuperAdminSupplierListResponse:
    items, total = _service.list(skip=skip, limit=limit, filter_status=status, q=q)
    return SuperAdminSupplierListResponse(
        items=[SupplierResponse.model_validate(s) for s in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/suppliers/{supplier_id}",
    response_model=SupplierResponse,
    summary="Get a supplier by ID (SUPERADMIN only)",
)
def get_supplier(
    supplier_id: uuid.UUID,
    _: User = Depends(require_roles(_ADMIN_AND_ABOVE)),
) -> SupplierResponse:
    supplier = _service.get_or_404(supplier_id)
    return SupplierResponse.model_validate(supplier)


@router.put(
    "/suppliers/{supplier_id}/status",
    response_model=SupplierResponse,
    summary="Update supplier status — suspend / reactivate (SUPERADMIN only)",
    description=(
        "Transitions a supplier to any valid status. Typical use-cases:\n"
        "- **APPROVED → SUSPENDED**: suspend a supplier\n"
        "- **SUSPENDED → APPROVED**: reactivate a suspended supplier\n"
        "- **DRAFT/PENDING_KYC/PENDING_APPROVAL → REJECTED**: reject an application"
    ),
)
def update_supplier_status(
    supplier_id: uuid.UUID,
    payload: UpdateSupplierStatusRequest,
    _: User = Depends(require_roles(_ADMIN_AND_ABOVE)),
) -> SupplierResponse:
    supplier = _service.update_status(supplier_id, payload.status)
    return SupplierResponse.model_validate(supplier)


@router.post(
    "/suppliers/{supplier_id}/impersonate",
    response_model=ImpersonationResponse,
    summary="Issue a short-lived token to act as a supplier's owner (SUPERADMIN only)",
)
def impersonate_supplier(
    supplier_id: uuid.UUID,
    caller: User = Depends(require_roles(_ADMIN_AND_ABOVE)),
) -> ImpersonationResponse:
    """
    Returns a 2-hour access token scoped to the SUPPLIER_OWNER of the given
    supplier.  Use this token in place of your own to browse and act on behalf
    of the supplier.  No refresh token is issued — re-call this endpoint to
    extend the session.
    """
    return _service.impersonate(supplier_id, impersonator_id=caller.id)


@router.get(
    "/audit-logs",
    response_model=AuditLogListResponse,
    summary="List admin audit logs (SUPERADMIN only)",
    description=(
        "Returns a paginated list of admin audit log entries in reverse-chronological order.\n\n"
        "Filter by `entity_type` (e.g. `supplier`, `kyc_document`), `action` "
        "(e.g. `supplier.approve`, `supplier.reject`, `supplier.provision`, "
        "`kyc_document.approved`, `kyc_document.rejected`), or `actor_user_id`."
    ),
)
def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    action: Optional[str] = Query(None, description="Filter by action string"),
    actor_user_id: Optional[uuid.UUID] = Query(None, description="Filter by acting user"),
    _: User = Depends(require_roles(_ADMIN_AND_ABOVE)),
) -> AuditLogListResponse:
    items, total = _audit_service.list(
        skip=skip,
        limit=limit,
        entity_type=entity_type,
        action=action,
        actor_user_id=actor_user_id,
    )
    return AuditLogListResponse(
        items=[AuditLogResponse.model_validate(log) for log in items],
        total=total,
        skip=skip,
        limit=limit,
    )


# ── Admin account management (SUPERADMIN only) ────────────────────────────────

@router.post(
    "/admin-accounts",
    response_model=AdminUserResponse,
    status_code=201,
    summary="Create a new ADMIN user (SUPERADMIN only)",
)
def create_admin_account(
    payload: CreateAdminRequest,
    caller: User = Depends(require_roles(_SUPERADMIN_ONLY)),
) -> AdminUserResponse:
    return _service.create_admin(payload, actor_id=caller.id)


@router.get(
    "/admin-accounts",
    response_model=AdminUserListResponse,
    summary="List all ADMIN users (SUPERADMIN only)",
)
def list_admin_accounts(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None, description="Search by name or email"),
    _: User = Depends(require_roles(_SUPERADMIN_ONLY)),
) -> AdminUserListResponse:
    items, total = _service.list_admins(skip=skip, limit=limit, q=q)
    return AdminUserListResponse(
        items=[AdminUserResponse.model_validate(u) for u in items],
        total=total,
        skip=skip,
        limit=limit,
    )
