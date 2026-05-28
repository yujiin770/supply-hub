"""
PharmaLake catalog service — wraps /catalog/search, /imports/upload and provides
optional client-side text filtering (Phase 1).

Phase 3 replaced the live-proxy with a local DB cache + ILIKE search.
"""
import logging
from typing import Any, Dict, Optional

import httpx

from app.core.config import get_settings
from app.schemas.pharmalake import PharmaLakeCatalogResponse, PharmaLakePack
from app.services.pharmalake_auth_service import pharmalake_auth

logger = logging.getLogger(__name__)

# When the user provides a search query we can't push it to PharmaLake
# (Phase 1 has no server-side text search), so we fetch a larger page and
# filter locally.
_CLIENT_SIDE_FETCH_SIZE = 500


def _matches_query(pack: PharmaLakePack, needle: str) -> bool:
    """Return True if any key field of the pack contains the search needle."""
    if pack.brand_name and needle in pack.brand_name.lower():
        return True
    if pack.barcode and needle in pack.barcode.lower():
        return True
    if pack.sku and needle in pack.sku.lower():
        return True
    if pack.org_name and needle in pack.org_name.lower():
        return True
    for ing in pack.ingredients:
        if ing.inn_name and needle in ing.inn_name.lower():
            return True
    return False


class PharmaLakeCatalogService:
    """Thin async facade over the PharmaLake catalog/search endpoint."""

    # ── Low-level HTTP helper ─────────────────────────────────────────────────

    async def _get(
        self,
        path: str,
        params: Dict[str, Any],
        retry_on_401: bool = True,
    ) -> Any:
        settings = get_settings()
        token = await pharmalake_auth.get_access_token()
        url = f"{settings.pharmalake_base_url}{path}"

        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                url,
                params=params,
                headers={"Authorization": f"Bearer {token}"},
            )

        if resp.status_code == 401 and retry_on_401:
            # Token may have been revoked externally — re-fetch and retry once.
            await pharmalake_auth.invalidate()
            return await self._get(path, params, retry_on_401=False)

        resp.raise_for_status()
        return resp.json()

    async def _post(
        self,
        path: str,
        body: Any,
        retry_on_401: bool = True,
    ) -> Any:
        settings = get_settings()
        token = await pharmalake_auth.get_access_token()
        url = f"{settings.pharmalake_base_url}{path}"

        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                url,
                json=body,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )

        if resp.status_code == 401 and retry_on_401:
            await pharmalake_auth.invalidate()
            return await self._post(path, body, retry_on_401=False)

        resp.raise_for_status()
        return resp.json()

    # ── Batch lookup ──────────────────────────────────────────────────────────

    async def batch_lookup(self, pack_ids: list[str]) -> list[Dict[str, Any]]:
        """
        POST /api/v1/catalog/batch — returns full pack details for a list of pack_ids.
        Returns the raw list as received from PharmaLake.
        """
        if not pack_ids:
            return []
        return await self._post(
            "/api/v1/catalog/batch",
            {"pack_ids": pack_ids},
        )

    async def live_search(
        self,
        is_active: bool = True,
        limit: int = 50,
        offset: int = 0,
        q: Optional[str] = None,
    ) -> PharmaLakeCatalogResponse:
        """
        Direct call to PharmaLake /catalog/search — bypasses local cache.
        Passes q straight through to PharmaLake (native server-side filtering).
        Supports full pagination.
        """
        params: Dict[str, Any] = {
            "is_active": str(is_active).lower(),
            "limit": limit,
            "offset": offset,
        }
        if q and q.strip():
            params["q"] = q.strip()
        data = await self._get("/api/v1/catalog/search", params)
        items = [PharmaLakePack.model_validate(i) for i in data.get("items", [])]
        total = int(data.get("total", len(items)))
        return PharmaLakeCatalogResponse(
            items=items,
            total=total,
            limit=limit,
            offset=offset,
        )

    # ── Public API ────────────────────────────────────────────────────────────

    async def get_pack(self, pack_id: str) -> Optional[PharmaLakePack]:
        """
        Look up a single pack by pack_id.
        Fetches a large batch client-side since PharmaLake has no direct
        get-by-id endpoint (Phase 2). Phase 3 replaces with cache lookup.
        """
        data = await self._get(
            "/api/v1/catalog/search",
            {"is_active": "true", "limit": _CLIENT_SIDE_FETCH_SIZE, "offset": 0},
        )
        for item in data.get("items", []):
            if str(item.get("pack_id", "")) == str(pack_id):
                return PharmaLakePack.model_validate(item)
        return None

    async def search_catalog(
        self,
        is_active: bool = True,
        limit: int = 50,
        offset: int = 0,
        q: Optional[str] = None,
    ) -> PharmaLakeCatalogResponse:
        """
        Search the PharmaLake master catalog.

        If `q` is provided we fetch a larger batch and filter client-side
        because the upstream API doesn't support free-text queries (Phase 1).
        Phase 3 replaces this with an indexed local cache.
        """
        if q and q.strip():
            needle = q.strip().lower()
            # Fetch a large batch from offset=0 so our client-side pagination
            # over filtered results is correct.
            data = await self._get(
                "/api/v1/catalog/search",
                {"is_active": str(is_active).lower(), "limit": _CLIENT_SIDE_FETCH_SIZE, "offset": 0},
            )
            all_items = [PharmaLakePack.model_validate(i) for i in data.get("items", [])]
            filtered = [p for p in all_items if _matches_query(p, needle)]
            total = len(filtered)
            page = filtered[offset : offset + limit]
        else:
            # No filter — use PharmaLake's native pagination directly.
            data = await self._get(
                "/api/v1/catalog/search",
                {"is_active": str(is_active).lower(), "limit": limit, "offset": offset},
            )
            page = [PharmaLakePack.model_validate(i) for i in data.get("items", [])]
            total = int(data.get("total", len(page)))

        return PharmaLakeCatalogResponse(
            items=page,
            total=total,
            limit=limit,
            offset=offset,
        )

    # ── Import upload ─────────────────────────────────────────────────────────

    async def upload_import(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: str = "text/csv",
        *,
        client_reference_number: str | None = None,
        supplier_id: str | None = None,
    ) -> Dict[str, Any]:
        """
        Upload a CSV file to PharmaLake POST /imports/upload.
        Returns a dict with keys:
          status_code: int
          body: dict | None  (parsed JSON response, if any)
          error: str | None
        """
        settings = get_settings()
        token = await pharmalake_auth.get_access_token()
        url = f"{settings.pharmalake_base_url}/api/v1/imports/upload"

        form_data: Dict[str, str] = {}
        if client_reference_number:
            form_data["client_reference_number"] = client_reference_number
        if supplier_id:
            form_data["supplier_id"] = supplier_id

        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    url,
                    headers={"Authorization": f"Bearer {token}"},
                    files={"file": (filename, file_bytes, content_type)},
                    data=form_data,
                )
        except httpx.RequestError as exc:
            return {"status_code": 0, "body": None, "error": str(exc)}

        body: Dict[str, Any] | None = None
        try:
            body = resp.json()
        except Exception:
            body = {"raw": resp.text}

        if resp.status_code == 401:
            # Retry once with a fresh token
            await pharmalake_auth.invalidate()
            return await self.upload_import(
                file_bytes, filename, content_type,
                client_reference_number=client_reference_number,
                supplier_id=supplier_id,
            )

        return {
            "status_code": resp.status_code,
            "body": body,
            "error": None if resp.is_success else f"PharmaLake returned {resp.status_code}",
        }

    # ── Import pipeline ────────────────────────────────────────────────────────

    async def get_import_job(self, import_id: str) -> Dict[str, Any]:
        """GET /api/v1/imports/{import_id} — fetch current pipeline status."""
        return await self._get(f"/api/v1/imports/{import_id}", {})

    async def get_import_drafts(
        self,
        import_id: str,
        limit: int = 20,
        skip: int = 0,
        status: Optional[str] = None,
    ) -> Dict[str, Any]:
        """GET /api/v1/imports/{import_id}/drafts — list extracted draft records."""
        params: Dict[str, Any] = {"limit": limit, "skip": skip}
        if status:
            params["status"] = status
        return await self._get(f"/api/v1/imports/{import_id}/drafts", params)

    async def trigger_extract(self, import_id: str) -> Dict[str, Any]:
        """POST /api/v1/imports/{import_id}/extract — kick off column extraction."""
        return await self._post(f"/api/v1/imports/{import_id}/extract", {})

    async def trigger_ai_extract(self, import_id: str) -> Dict[str, Any]:
        """POST /api/v1/imports/{import_id}/ai-extract — kick off AI extraction."""
        return await self._post(f"/api/v1/imports/{import_id}/ai-extract", {})

    async def submit_all_drafts_import(self, import_id: str) -> Dict[str, Any]:
        """POST /api/v1/imports/{import_id}/submit-all — submit all ready drafts."""
        return await self._post(f"/api/v1/imports/{import_id}/submit-all", {})


# Module-level singleton.
pharmalake_catalog = PharmaLakeCatalogService()
