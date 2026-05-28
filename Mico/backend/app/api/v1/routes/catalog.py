"""
Catalog routes — reads from the local PharmaLake cache for fast search.
Admin endpoint triggers a full upstream sync.
Supplier endpoints handle CSV imports to PharmaLake.

Routes:
  GET  /catalog/picker                    — Browse the cached catalog (all authed roles)  GET  /catalog/recently-added            — Items first seen in the last N days  POST /admin/catalog/sync                — Trigger a full re-sync from PharmaLake
  POST /suppliers/me/catalog/import       — Upload a CSV of missing items to PharmaLake
  GET  /suppliers/me/catalog/imports      — List past import requests for this supplier
"""
from typing import Annotated, List, Optional

import httpx
from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, Query, UploadFile, status

from app.api.deps import SupplierOwnerContext, get_current_supplier_owner, require_roles
from app.core.rbac import Role
from app.core.response import success_response
from app.models.user import User
from app.repositories.catalog_cache_repository import CatalogCacheRepository
from app.repositories.catalog_import_repository import CatalogImportRepository
from app.services.catalog_sync_service import catalog_sync
from app.services.pharmalake_catalog_service import pharmalake_catalog

router = APIRouter(tags=["catalog"])

_PICKER_ROLES = [
    Role.SUPPLIER_OWNER,
    Role.SUPPLIER_STAFF,
    Role.ADMIN,
    Role.SUPERADMIN,
]

_ADMIN_ROLES = [Role.ADMIN, Role.SUPERADMIN]

# Shared repo instances
_repo = CatalogCacheRepository()
_import_repo = CatalogImportRepository()

_MAX_IMPORT_BYTES = 10 * 1024 * 1024  # 10 MB


def _pack_to_dict(row) -> dict:
    return {
        "pack_id": str(row.pack_id),
        "brand_name": row.brand_name,
        "barcode": row.barcode,
        "sku": row.sku,
        "org_id": row.org_id,
        "org_name": row.org_name,
        "dosage_form_name": row.dosage_form_name,
        "route_name": row.route_name,
        "pack_qty_value": row.pack_qty_value,
        "pack_qty_unit_code": row.pack_qty_unit_code,
        "pack_qty_unit_name": row.pack_qty_unit_name,
        "ingredients": row.ingredients_json or [],
        "is_active": row.is_active,
        "synced_at": row.synced_at.isoformat() if row.synced_at else None,
        "first_seen_at": row.first_seen_at.isoformat() if row.first_seen_at else None,
    }


def _pack_to_dict_from_schema(p) -> dict:
    return {
        "pack_id": str(p.pack_id),
        "brand_name": p.brand_name,
        "description": p.description,
        "barcode": p.barcode,
        "sku": p.sku,
        "org_id": p.org_id,
        "org_name": p.org_name,
        "dosage_form_name": p.dosage_form_name,
        "route_name": p.route_name,
        "pack_qty_value": p.pack_qty_value,
        "pack_qty_unit_code": p.pack_qty_unit_code,
        "pack_qty_unit_name": p.pack_qty_unit_name,
        "ingredients": [i.model_dump() for i in p.ingredients],
        "is_active": p.is_active,
    }


# ── Picker ─────────────────────────────────────────────────────────────────────


@router.post(
    "/catalog/batch",
    summary="Batch-fetch full pack details from PharmaLake",
)
async def batch_catalog(
    pack_ids: List[str] = Body(..., embed=True),
    _user: User = Depends(require_roles(_PICKER_ROLES)),
):
    if not pack_ids:
        return []
    return await pharmalake_catalog.batch_lookup(pack_ids)


@router.get(
    "/catalog/live",
    summary="Live catalog search — calls PharmaLake directly, no cache",
)
async def get_catalog_live(
    is_active: bool = Query(True),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    q: Optional[str] = Query(None, max_length=200),
    _user: User = Depends(require_roles(_PICKER_ROLES)),
):
    """
    Proxies directly to PharmaLake catalog/search with native pagination.
    Use this for the Browse Catalog picker so new items are always visible.
    """
    result = await pharmalake_catalog.live_search(
        is_active=is_active,
        limit=limit,
        offset=offset,
        q=q or None,
    )
    return success_response({
        "items": [_pack_to_dict_from_schema(p) for p in result.items],
        "total": result.total,
        "limit": result.limit,
        "offset": result.offset,
    })


@router.get(
    "/catalog/picker",
    summary="Browse cached PharmaLake catalog",
    description=(
        "Returns a paginated list of product packs sourced from the local "
        "PharmaLake cache. Runs fast ILIKE text search over brand name, "
        "barcode, SKU, org name, and ingredient names."
    ),
)
async def get_catalog_picker(
    is_active: bool = Query(True, description="Return only active packs"),
    limit: int = Query(50, ge=1, le=200, description="Page size"),
    offset: int = Query(0, ge=0, description="Zero-based offset"),
    q: Optional[str] = Query(None, max_length=200, description="Free-text search"),
    _user: User = Depends(require_roles(_PICKER_ROLES)),
):
    items, total = _repo.search(
        q=q or None,
        is_active=is_active,
        limit=limit,
        offset=offset,
    )
    return success_response(
        data={
            "items": [_pack_to_dict(r) for r in items],
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    )


# ── Recently added ─────────────────────────────────────────────────────────────

@router.get(
    "/catalog/recently-added",
    summary="Items newly added to the PharmaLake catalog",
    description=(
        "Returns packs that first appeared in the local cache within the last "
        "`days` days, ordered newest-first. "
        "Reflects items that were missing from PharmaLake and have since been "
        "approved and synced."
    ),
)
async def get_recently_added(
    days: int = Query(7, ge=1, le=90, description="Look-back window in days"),
    limit: int = Query(50, ge=1, le=200, description="Page size"),
    offset: int = Query(0, ge=0, description="Zero-based offset"),
    _user: User = Depends(require_roles(_PICKER_ROLES)),
):
    items, total = _repo.get_recently_added(days=days, limit=limit, offset=offset)
    return success_response(
        data={
            "items": [_pack_to_dict(r) for r in items],
            "total": total,
            "limit": limit,
            "offset": offset,
            "days": days,
        }
    )


# ── Admin sync ─────────────────────────────────────────────────────────────────

@router.post(
    "/admin/catalog/sync",
    summary="Sync PharmaLake catalog into local cache",
    description=(
        "Fetches all product packs from the upstream PharmaLake API and "
        "upserts them into the local cache table. "
        "Admin / Superadmin only. This may take a while for large catalogs."
    ),
)
async def sync_catalog(
    is_active: bool = Query(True, description="Only sync active packs"),
    _user: User = Depends(require_roles(_ADMIN_ROLES)),
):
    try:
        stats = await catalog_sync.sync_all(is_active=is_active)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Sync failed: {exc}",
        ) from exc

    return success_response(
        data=stats,
        message=(
            f"Catalog synced: {stats['synced']} packs "
            f"across {stats['pages']} pages."
        ),
    )


# ── Supplier import upload ──────────────────────────────────────────────────────

@router.post(
    "/suppliers/me/catalog/import",
    status_code=status.HTTP_201_CREATED,
    summary="Upload a CSV of missing items to PharmaLake",
    description=(
        "Upload a CSV file containing items that are missing from the "
        "PharmaLake master catalog. The file is proxied to PharmaLake's "
        "`POST /imports/upload` endpoint. The upload result is recorded "
        "in the database for later review.\n\n"
        "Accepted: `text/csv`, `application/vnd.ms-excel` — max 10 MB."
    ),
)
async def upload_catalog_import(
    file: Annotated[UploadFile, File(description="CSV file of missing items")],
    client_reference_number: Annotated[
        str | None,
        Form(description="Optional reference number for this import batch (supplier's own ID)"),
    ] = None,
    ctx: SupplierOwnerContext = Depends(get_current_supplier_owner),
):
    # Size guard
    contents = await file.read()
    if len(contents) > _MAX_IMPORT_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds 10 MB limit.",
        )

    filename = file.filename or "import.csv"
    content_type = file.content_type or "text/csv"

    # Proxy to PharmaLake
    result = await pharmalake_catalog.upload_import(
        file_bytes=contents,
        filename=filename,
        content_type=content_type,
        client_reference_number=client_reference_number,
        supplier_id=str(ctx.supplier.id),
    )

    upload_status = "submitted" if result["error"] is None else "failed"

    # Persist the record
    record = _import_repo.create(
        supplier_id=ctx.supplier.id,
        original_filename=filename,
        status=upload_status,
        pharmalake_status_code=result["status_code"] or None,
        pharmalake_response_json=result["body"],
        error_message=result["error"],
    )

    return success_response(
        data={
            "id": str(record.id),
            "original_filename": record.original_filename,
            "status": record.status,
            "pharmalake_status_code": record.pharmalake_status_code,
            "pharmalake_response": record.pharmalake_response_json,
            "error_message": record.error_message,
            "created_at": record.created_at.isoformat(),
        },
        message="Import submitted successfully."
        if upload_status == "submitted"
        else "Import failed. See error_message for details.",
        status_code=status.HTTP_201_CREATED,
    )


@router.get(
    "/suppliers/me/catalog/imports",
    summary="List past catalog import requests",
)
async def list_catalog_imports(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    ctx: SupplierOwnerContext = Depends(get_current_supplier_owner),
):
    items, total = _import_repo.list_by_supplier(
        supplier_id=ctx.supplier.id,
        limit=limit,
        offset=offset,
    )
    return success_response(
        data={
            "items": [
                {
                    "id": str(r.id),
                    "original_filename": r.original_filename,
                    "status": r.status,
                    "pharmalake_status_code": r.pharmalake_status_code,
                    "pharmalake_response": r.pharmalake_response_json,
                    "error_message": r.error_message,
                    "created_at": r.created_at.isoformat(),
                }
                for r in items
            ],
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    )


# ── Import pipeline proxy ──────────────────────────────────────────────────────

def _pl_error(exc: Exception) -> HTTPException:
    if isinstance(exc, httpx.HTTPStatusError):
        try:
            detail = exc.response.json()
        except Exception:
            detail = exc.response.text
        return HTTPException(status_code=exc.response.status_code, detail=detail)
    return HTTPException(status_code=502, detail=f"PharmaLake unavailable: {exc}")


@router.get(
    "/suppliers/me/catalog/imports/{pl_import_id}/pl-job",
    summary="Get PharmaLake import job pipeline status",
)
async def get_pl_import_job(
    pl_import_id: str,
    ctx: SupplierOwnerContext = Depends(get_current_supplier_owner),
):
    try:
        data = await pharmalake_catalog.get_import_job(pl_import_id)
        return success_response(data=data)
    except Exception as exc:
        raise _pl_error(exc) from exc


@router.get(
    "/suppliers/me/catalog/imports/{pl_import_id}/pl-drafts",
    summary="List extracted draft records from a PharmaLake import job",
)
async def get_pl_import_drafts(
    pl_import_id: str,
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    draft_status: Optional[str] = Query(None, alias="status"),
    ctx: SupplierOwnerContext = Depends(get_current_supplier_owner),
):
    try:
        data = await pharmalake_catalog.get_import_drafts(pl_import_id, limit=limit, skip=skip, status=draft_status)
        return success_response(data=data)
    except Exception as exc:
        raise _pl_error(exc) from exc


@router.post(
    "/suppliers/me/catalog/imports/{pl_import_id}/extract",
    summary="Trigger column extraction on a PharmaLake import job",
)
async def trigger_pl_extract(
    pl_import_id: str,
    ctx: SupplierOwnerContext = Depends(get_current_supplier_owner),
):
    try:
        data = await pharmalake_catalog.trigger_extract(pl_import_id)
        return success_response(data=data)
    except Exception as exc:
        raise _pl_error(exc) from exc


@router.post(
    "/suppliers/me/catalog/imports/{pl_import_id}/ai-extract",
    summary="Trigger AI extraction on a PharmaLake import job",
)
async def trigger_pl_ai_extract(
    pl_import_id: str,
    ctx: SupplierOwnerContext = Depends(get_current_supplier_owner),
):
    try:
        data = await pharmalake_catalog.trigger_ai_extract(pl_import_id)
        return success_response(data=data)
    except Exception as exc:
        raise _pl_error(exc) from exc


@router.post(
    "/suppliers/me/catalog/imports/{pl_import_id}/submit-all",
    summary="Submit all ready drafts from a PharmaLake import job",
)
async def pl_submit_all_drafts(
    pl_import_id: str,
    ctx: SupplierOwnerContext = Depends(get_current_supplier_owner),
):
    try:
        data = await pharmalake_catalog.submit_all_drafts_import(pl_import_id)
        return success_response(data=data)
    except Exception as exc:
        raise _pl_error(exc) from exc