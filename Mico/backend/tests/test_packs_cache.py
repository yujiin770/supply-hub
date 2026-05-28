"""
Tests for the pharmalake_packs_caches sync service and repository.

Strategy:
 - Unit-test the service layer with mocked PharmaLake HTTP calls and a
   mocked repository — no real DB required.
 - Unit-test the repository helpers (_pack_to_row, _parse_uuid, _parse_numeric)
   independently.
 - Integration-style test for ConcurrentSyncError using a mocked SQL result.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.repositories.packs_cache_repository import (
    ConcurrentSyncError,
    _pack_to_row,
    _parse_numeric,
    _parse_uuid,
)
from app.services.packs_cache_service import (
    PacksCacheService,
    _advisory_lock_key,
    _chunks,
)

# ── Helpers ────────────────────────────────────────────────────────────────────

SUPPLIER_ID = uuid.UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
PACK_ID_1 = "11111111-2222-3333-4444-555555555555"
PACK_ID_2 = "66666666-7777-8888-9999-aaaaaaaaaaaa"

SAMPLE_PACK_1: dict = {
    "pack_id": PACK_ID_1,
    "pack_qty_value": "10.0000",
    "pack_qty_unit_code": "tab",
    "pack_qty_unit_name": "Tablet",
    "barcode": "4800000000021",
    "sku": "AML-01-01",
    "is_active": True,
    "product_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    "brand_name": "Amlodipine",
    "org_id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
    "org_name": "Generic Manufacturer",
    "presentation_id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
    "dosage_form_name": "Tablet",
    "route_name": "Oral",
    "description": "5 mg (as besilate/camsylate)",
    "ingredients": [
        {
            "substance_id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
            "inn_name": "Amlodipine",
            "role": "active",
            "strength": {
                "numerator_value": "5.0000",
                "numerator_unit_code": "mg",
                "numerator_unit_name": "Milligram",
                "denominator_value": None,
                "denominator_unit_code": None,
                "denominator_unit_name": None,
            },
        }
    ],
}

SAMPLE_PACK_2: dict = {
    **SAMPLE_PACK_1,
    "pack_id": PACK_ID_2,
    "brand_name": "Metformin",
    "sku": "MET-01-01",
}

NOW = datetime(2026, 3, 3, 0, 0, 0, tzinfo=timezone.utc)


# ── _parse_uuid ────────────────────────────────────────────────────────────────

class TestParseUuid:
    def test_valid_uuid_string(self):
        result = _parse_uuid(PACK_ID_1)
        assert result == uuid.UUID(PACK_ID_1)

    def test_none_returns_none(self):
        assert _parse_uuid(None) is None

    def test_empty_string_returns_none(self):
        assert _parse_uuid("") is None

    def test_invalid_string_returns_none(self):
        assert _parse_uuid("not-a-uuid") is None


# ── _parse_numeric ─────────────────────────────────────────────────────────────

class TestParseNumeric:
    def test_valid_decimal_string(self):
        assert _parse_numeric("10.0000") == Decimal("10.0000")

    def test_none_returns_none(self):
        assert _parse_numeric(None) is None

    def test_invalid_string_returns_none(self):
        assert _parse_numeric("not-a-number") is None

    def test_integer_string(self):
        assert _parse_numeric("5") == Decimal("5")


# ── _pack_to_row ───────────────────────────────────────────────────────────────

class TestPackToRow:
    def test_maps_all_scalar_fields(self):
        row = _pack_to_row(SUPPLIER_ID, SAMPLE_PACK_1, NOW)
        assert row["supplier_id"] == SUPPLIER_ID
        assert row["pack_id"] == uuid.UUID(PACK_ID_1)
        assert row["brand_name"] == "Amlodipine"
        assert row["barcode"] == "4800000000021"
        assert row["sku"] == "AML-01-01"
        assert row["org_name"] == "Generic Manufacturer"
        assert row["dosage_form_name"] == "Tablet"
        assert row["route_name"] == "Oral"
        assert row["description"] == "5 mg (as besilate/camsylate)"
        assert row["pack_qty_unit_code"] == "tab"
        assert row["is_active"] is True

    def test_parses_pack_qty_value_to_decimal(self):
        row = _pack_to_row(SUPPLIER_ID, SAMPLE_PACK_1, NOW)
        assert row["pack_qty_value"] == Decimal("10.0000")

    def test_stores_ingredients_array_as_is(self):
        row = _pack_to_row(SUPPLIER_ID, SAMPLE_PACK_1, NOW)
        assert row["ingredients"] == SAMPLE_PACK_1["ingredients"]
        # Strength values remain as strings — not parsed
        ing = row["ingredients"][0]
        assert ing["strength"]["numerator_value"] == "5.0000"

    def test_raw_payload_is_exact_input(self):
        row = _pack_to_row(SUPPLIER_ID, SAMPLE_PACK_1, NOW)
        assert row["raw_payload"] is SAMPLE_PACK_1

    def test_source_synced_at_is_provided_now(self):
        row = _pack_to_row(SUPPLIER_ID, SAMPLE_PACK_1, NOW)
        assert row["source_synced_at"] == NOW

    def test_missing_optional_fields_become_none(self):
        minimal = {"pack_id": PACK_ID_1}
        row = _pack_to_row(SUPPLIER_ID, minimal, NOW)
        assert row["brand_name"] is None
        assert row["pack_qty_value"] is None
        assert row["ingredients"] == []


# ── _chunks ────────────────────────────────────────────────────────────────────

class TestChunks:
    def test_splits_evenly(self):
        result = list(_chunks([1, 2, 3, 4], 2))
        assert result == [[1, 2], [3, 4]]

    def test_last_chunk_smaller(self):
        result = list(_chunks([1, 2, 3], 2))
        assert result == [[1, 2], [3]]

    def test_empty_list(self):
        assert list(_chunks([], 10)) == []


# ── _advisory_lock_key ─────────────────────────────────────────────────────────

class TestAdvisoryLockKey:
    def test_returns_int64_range(self):
        key = _advisory_lock_key(SUPPLIER_ID)
        assert isinstance(key, int)
        # Must fit in a signed int64
        assert -(2**63) <= key < 2**63

    def test_deterministic(self):
        assert _advisory_lock_key(SUPPLIER_ID) == _advisory_lock_key(SUPPLIER_ID)

    def test_different_suppliers_different_keys(self):
        other = uuid.uuid4()
        assert _advisory_lock_key(SUPPLIER_ID) != _advisory_lock_key(other)


# ── PacksCacheService.sync ─────────────────────────────────────────────────────

class TestPacksCacheServiceSync:
    """Unit tests — all external I/O is mocked."""

    def _make_service(self, listing_pack_ids, pharmalake_packs, repo_result=None):
        service = PacksCacheService.__new__(PacksCacheService)

        # Mock listing repo
        mock_listing_repo = MagicMock()
        mock_listing_repo.get_all_pack_ids.return_value = listing_pack_ids
        service._listing_repo = mock_listing_repo

        # Mock packs cache repo
        mock_repo = MagicMock()
        mock_repo.sync_bulk.return_value = repo_result or {
            "supplier_id": str(SUPPLIER_ID),
            "received_count": len(pharmalake_packs),
            "upserted_count": len(pharmalake_packs),
            "deactivated_count": 0,
            "started_at": NOW.isoformat(),
            "finished_at": NOW.isoformat(),
        }
        service._repo = mock_repo

        return service, mock_listing_repo, mock_repo, pharmalake_packs

    @pytest.mark.asyncio
    async def test_sync_upserts_returned_packs(self):
        packs = [SAMPLE_PACK_1, SAMPLE_PACK_2]
        service, listing_repo, repo, _ = self._make_service(
            [PACK_ID_1, PACK_ID_2], packs
        )

        with patch(
            "app.services.packs_cache_service.pharmalake_catalog.batch_lookup",
            new=AsyncMock(return_value=packs),
        ):
            result = await service.sync(SUPPLIER_ID)

        assert result.received_count == 2
        assert result.upserted_count == 2
        listing_repo.get_all_pack_ids.assert_called_once_with(SUPPLIER_ID)
        repo.sync_bulk.assert_called_once()

    @pytest.mark.asyncio
    async def test_sync_calls_batch_lookup_in_chunks(self):
        # 250 pack_ids → 3 batches (100, 100, 50)
        pack_ids = [str(uuid.uuid4()) for _ in range(250)]
        batch_mock = AsyncMock(return_value=[])

        service, _, repo, _ = self._make_service(
            pack_ids,
            [],
            repo_result={
                "supplier_id": str(SUPPLIER_ID),
                "received_count": 0,
                "upserted_count": 0,
                "deactivated_count": 0,
                "started_at": NOW.isoformat(),
                "finished_at": NOW.isoformat(),
            },
        )

        with patch(
            "app.services.packs_cache_service.pharmalake_catalog.batch_lookup",
            new=batch_mock,
        ):
            await service.sync(SUPPLIER_ID)

        # 250 ids / 100 per chunk = 3 calls
        assert batch_mock.call_count == 3
        sizes = [len(call.args[0]) for call in batch_mock.call_args_list]
        assert sizes == [100, 100, 50]

    @pytest.mark.asyncio
    async def test_sync_with_zero_listings(self):
        """Supplier has no listings → sync still runs, deactivates old rows."""
        service, _, repo, _ = self._make_service(
            [],
            [],
            repo_result={
                "supplier_id": str(SUPPLIER_ID),
                "received_count": 0,
                "upserted_count": 0,
                "deactivated_count": 5,  # 5 orphan rows deactivated
                "started_at": NOW.isoformat(),
                "finished_at": NOW.isoformat(),
            },
        )

        with patch(
            "app.services.packs_cache_service.pharmalake_catalog.batch_lookup",
            new=AsyncMock(return_value=[]),
        ):
            result = await service.sync(SUPPLIER_ID)

        assert result.received_count == 0
        assert result.deactivated_count == 5

    @pytest.mark.asyncio
    async def test_sync_returns_409_on_concurrent_lock(self):
        """When the repository raises ConcurrentSyncError, service raises 409."""
        from fastapi import HTTPException

        service, _, repo, _ = self._make_service([PACK_ID_1], [SAMPLE_PACK_1])
        repo.sync_bulk.side_effect = ConcurrentSyncError("locked")

        with patch(
            "app.services.packs_cache_service.pharmalake_catalog.batch_lookup",
            new=AsyncMock(return_value=[SAMPLE_PACK_1]),
        ):
            with pytest.raises(HTTPException) as exc_info:
                await service.sync(SUPPLIER_ID)

        assert exc_info.value.status_code == 409
        assert "in progress" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_sync_raises_502_on_pharmalake_failure(self):
        """PharmaLake HTTP errors bubble up as 502 Bad Gateway."""
        from fastapi import HTTPException

        service, _, _, _ = self._make_service([PACK_ID_1], [SAMPLE_PACK_1])

        with patch(
            "app.services.packs_cache_service.pharmalake_catalog.batch_lookup",
            new=AsyncMock(side_effect=Exception("connection refused")),
        ):
            with pytest.raises(HTTPException) as exc_info:
                await service.sync(SUPPLIER_ID)

        assert exc_info.value.status_code == 502


# ── Repository sync_bulk — advisory lock behaviour (mocked session) ────────────

class TestSyncBulkAdvisoryLock:
    """
    Verifies that ConcurrentSyncError is raised when the advisory lock
    returns False (another sync is running).
    We mock get_sync_session to control the SQL result.
    """

    def _mock_session_cm(self, lock_acquired: bool):
        """Return a context manager that yields a session mock."""
        mock_session = MagicMock()
        mock_session.execute.return_value.scalar.return_value = lock_acquired
        cm = MagicMock()
        cm.__enter__ = MagicMock(return_value=mock_session)
        cm.__exit__ = MagicMock(return_value=False)
        return cm

    def test_raises_concurrent_sync_error_when_lock_not_acquired(self):
        from app.repositories.packs_cache_repository import PacksCacheRepository

        repo = PacksCacheRepository()
        lock_key = _advisory_lock_key(SUPPLIER_ID)

        with patch(
            "app.repositories.packs_cache_repository.get_sync_session",
            return_value=self._mock_session_cm(lock_acquired=False),
        ):
            with pytest.raises(ConcurrentSyncError):
                repo.sync_bulk(
                    supplier_id=SUPPLIER_ID,
                    lock_key=lock_key,
                    raw_packs=[],
                    started_at=NOW,
                )

    def test_does_not_raise_when_lock_acquired(self):
        from app.repositories.packs_cache_repository import PacksCacheRepository

        repo = PacksCacheRepository()
        lock_key = _advisory_lock_key(SUPPLIER_ID)

        with patch(
            "app.repositories.packs_cache_repository.get_sync_session",
            return_value=self._mock_session_cm(lock_acquired=True),
        ):
            # Should NOT raise — returns summary dict
            result = repo.sync_bulk(
                supplier_id=SUPPLIER_ID,
                lock_key=lock_key,
                raw_packs=[],
                started_at=NOW,
            )

        assert result["supplier_id"] == str(SUPPLIER_ID)
        assert result["received_count"] == 0
