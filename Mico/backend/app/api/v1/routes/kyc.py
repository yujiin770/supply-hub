import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.api.deps import SupplierOwnerContext, get_current_supplier_owner_or_inactive
from app.core.azure_storage import kyc_doc_to_response
from app.db.session import get_sync_session
from app.models.kyc_document import KycDocType
from app.schemas.kyc import KycDocumentResponse, KycDocumentsListResponse
from app.services.kyc_service import KycService

router = APIRouter(
    prefix="/suppliers/me/kyc",
    tags=["kyc"],
)

_kyc_service = KycService(session_factory=get_sync_session)


@router.post(
    "/documents",
    response_model=KycDocumentResponse,
    status_code=201,
    summary="Upload a KYC document (SUPPLIER_OWNER only)",
    description=(
        "Upload a KYC document as **multipart/form-data**.\n\n"
        "Accepted formats: PDF, JPEG, PNG, WEBP — max 10 MB.\n\n"
        "Once all required document types are submitted, the supplier's status "
        "automatically advances from `PENDING_KYC` → `PENDING_APPROVAL`."
    ),
)
async def upload_kyc_document(
    doc_type: Annotated[KycDocType, Form(description="Document type")],
    file: Annotated[UploadFile, File(description="File to upload (PDF/image, max 10 MB)")],
    ctx: SupplierOwnerContext = Depends(get_current_supplier_owner_or_inactive),
) -> KycDocumentResponse:
    doc = await _kyc_service.upload_document(
        supplier=ctx.supplier,
        doc_type=doc_type,
        file=file,
    )
    return kyc_doc_to_response(doc)


@router.get(
    "/documents",
    response_model=KycDocumentsListResponse,
    summary="List my KYC documents (SUPPLIER_OWNER only)",
)
async def list_kyc_documents(
    ctx: SupplierOwnerContext = Depends(get_current_supplier_owner_or_inactive),
) -> KycDocumentsListResponse:
    docs = _kyc_service.list_documents(ctx.supplier.id)
    return KycDocumentsListResponse(
        items=[kyc_doc_to_response(d) for d in docs],
        total=len(docs),
    )


@router.delete(
    "/documents/{doc_id}",
    status_code=204,
    summary="Delete a SUBMITTED KYC document (SUPPLIER_OWNER only)",
    description="Only documents with status `SUBMITTED` can be deleted.",
)
async def delete_kyc_document(
    doc_id: uuid.UUID,
    ctx: SupplierOwnerContext = Depends(get_current_supplier_owner_or_inactive),
) -> None:
    _kyc_service.delete_document(supplier_id=ctx.supplier.id, doc_id=doc_id)
