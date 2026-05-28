"""
KYC Document service.

Handles:
1. Uploading files to Azure Blob Storage (container: supplyhub-uploads)
   under the path  kyc/{supplier_id}/{doc_type}_{uuid}.{ext}
2. Creating SupplierKycDocument records (status=SUBMITTED)
3. Auto-advancing Supplier status to PENDING_APPROVAL once all
   required doc types have at least one SUBMITTED/APPROVED document
"""
import uuid
from contextlib import AbstractContextManager
from pathlib import Path
from typing import Callable

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.azure_storage import blob_name_from_url, delete_blob, upload_blob
from app.core.config import get_settings
from app.models.kyc_document import KycDocStatus, KycDocType, SupplierKycDocument
from app.models.supplier import Supplier, SupplierStatus
from app.repositories.kyc_repository import KycDocumentRepository

# Allowed MIME types for KYC uploads
_ALLOWED_MIME = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
}
_MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB


class KycService:
    def __init__(self, session_factory: Callable[[], AbstractContextManager[Session]]) -> None:
        self.session_factory = session_factory
        self.repo = KycDocumentRepository(session_factory)

    # ── Upload ────────────────────────────────────────────────────────────────

    async def upload_document(
        self,
        supplier: Supplier,
        doc_type: KycDocType,
        file: UploadFile,
    ) -> SupplierKycDocument:
        # Validate content type
        if file.content_type not in _ALLOWED_MIME:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=(
                    f"Unsupported file type '{file.content_type}'. "
                    f"Accepted: PDF, JPEG, PNG, WEBP."
                ),
            )

        # Read and size-check
        contents = await file.read()
        if len(contents) > _MAX_FILE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File too large. Maximum size is 10 MB.",
            )

        # Persist file to Azure Blob Storage
        file_url = self._upload_to_azure(
            supplier_id=supplier.id,
            doc_type=doc_type,
            filename=file.filename or "upload",
            contents=contents,
            content_type=file.content_type or "application/octet-stream",
        )

        # Create DB record + auto-advance supplier status
        with self.session_factory() as session:
            doc = SupplierKycDocument(
                id=uuid.uuid4(),
                supplier_id=supplier.id,
                doc_type=doc_type,
                file_url=file_url,
                original_filename=file.filename or "upload",
                status=KycDocStatus.SUBMITTED,
            )
            session.add(doc)
            session.flush()
            session.refresh(doc)

            # Reload supplier within same session to avoid detached-instance issues
            db_supplier = session.get(Supplier, supplier.id)
            if db_supplier and db_supplier.status == SupplierStatus.PENDING_KYC:
                submitted = self._submitted_types_in_session(session, supplier.id)
                required = set(get_settings().kyc_required_docs)
                if required.issubset(submitted):
                    db_supplier.status = SupplierStatus.PENDING_APPROVAL
                    session.flush()

            return doc

    # ── List ──────────────────────────────────────────────────────────────────

    def list_documents(self, supplier_id: uuid.UUID) -> list[SupplierKycDocument]:
        return self.repo.list_by_supplier(supplier_id)

    # ── Delete ────────────────────────────────────────────────────────────────

    def delete_document(self, supplier_id: uuid.UUID, doc_id: uuid.UUID) -> None:
        doc = self.repo.get(doc_id)

        if doc is None or doc.supplier_id != supplier_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found.",
            )

        if doc.status != KycDocStatus.SUBMITTED:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Cannot delete a document with status '{doc.status.value}'. "
                    "Only SUBMITTED documents can be deleted."
                ),
            )

        # Remove blob from Azure (best-effort — don't fail if already gone)
        try:
            blob_name = blob_name_from_url(doc.file_url)
            delete_blob(blob_name)
        except Exception:
            pass

        self.repo.delete(doc_id)

    # ── Private helpers ───────────────────────────────────────────────────────

    def _upload_to_azure(
        self,
        *,
        supplier_id: uuid.UUID,
        doc_type: KycDocType,
        filename: str,
        contents: bytes,
        content_type: str,
    ) -> str:
        """
        Upload file bytes to Azure Blob Storage.
        Blob path: kyc/{supplier_id}/{doc_type}_{uuid4_hex}{ext}
        Returns the public HTTPS URL of the blob.
        """
        suffix = Path(filename).suffix.lower() or ".bin"
        blob_name = f"kyc/{supplier_id}/{doc_type.value}_{uuid.uuid4().hex}{suffix}"
        return upload_blob(blob_name, contents, content_type)

    def _submitted_types_in_session(
        self, session: Session, supplier_id: uuid.UUID
    ) -> set[str]:
        from app.models.kyc_document import SupplierKycDocument as D

        rows = (
            session.query(D.doc_type)
            .filter(D.supplier_id == supplier_id, D.status != KycDocStatus.REJECTED)
            .distinct()
            .all()
        )
        return {r[0] for r in rows}
