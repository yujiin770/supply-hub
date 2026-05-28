import uuid
from contextlib import AbstractContextManager
from typing import Callable

from sqlalchemy.orm import Session

from app.models.kyc_document import KycDocStatus, KycDocType, SupplierKycDocument


class KycDocumentRepository:
    def __init__(self, session_factory: Callable[[], AbstractContextManager[Session]]) -> None:
        self.session_factory = session_factory

    def create(self, doc: SupplierKycDocument) -> SupplierKycDocument:
        with self.session_factory() as session:
            session.add(doc)
            session.flush()
            session.refresh(doc)
            return doc

    def list_by_supplier(self, supplier_id: uuid.UUID) -> list[SupplierKycDocument]:
        with self.session_factory() as session:
            return (
                session.query(SupplierKycDocument)
                .filter(SupplierKycDocument.supplier_id == supplier_id)
                .order_by(SupplierKycDocument.uploaded_at.desc())
                .all()
            )

    def get(self, doc_id: uuid.UUID) -> SupplierKycDocument | None:
        with self.session_factory() as session:
            return session.get(SupplierKycDocument, doc_id)

    def delete(self, doc_id: uuid.UUID) -> None:
        with self.session_factory() as session:
            doc = session.get(SupplierKycDocument, doc_id)
            if doc:
                session.delete(doc)
                session.flush()

    def submitted_doc_types(self, supplier_id: uuid.UUID) -> set[str]:
        """Return doc_type values for all non-REJECTED documents of a supplier."""
        with self.session_factory() as session:
            rows = (
                session.query(SupplierKycDocument.doc_type)
                .filter(
                    SupplierKycDocument.supplier_id == supplier_id,
                    SupplierKycDocument.status != KycDocStatus.REJECTED,
                )
                .distinct()
                .all()
            )
            return {row[0] for row in rows}
