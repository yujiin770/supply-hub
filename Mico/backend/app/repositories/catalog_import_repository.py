"""
Repository for CatalogImport — import upload history per supplier.
"""
import uuid
from typing import Optional

from app.db.session import get_sync_session
from app.models.catalog_import import CatalogImport


class CatalogImportRepository:
    """Uses the sync session factory."""

    def create(
        self,
        supplier_id: uuid.UUID,
        original_filename: str,
        status: str,
        pharmalake_status_code: Optional[int] = None,
        pharmalake_response_json: Optional[dict] = None,
        error_message: Optional[str] = None,
    ) -> CatalogImport:
        record = CatalogImport(
            supplier_id=supplier_id,
            original_filename=original_filename,
            status=status,
            pharmalake_status_code=pharmalake_status_code,
            pharmalake_response_json=pharmalake_response_json,
            error_message=error_message,
        )
        with get_sync_session() as session:
            session.add(record)
            session.flush()
            session.refresh(record)
        return record

    def list_by_supplier(
        self,
        supplier_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[CatalogImport], int]:
        with get_sync_session() as session:
            q = (
                session.query(CatalogImport)
                .filter(CatalogImport.supplier_id == supplier_id)
            )
            total = q.count()
            items = (
                q.order_by(CatalogImport.created_at.desc())
                .offset(offset)
                .limit(limit)
                .all()
            )
            return items, total
