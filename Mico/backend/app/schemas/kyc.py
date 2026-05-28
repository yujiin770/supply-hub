import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.kyc_document import KycDocStatus, KycDocType


class KycDocumentResponse(BaseModel):
    id: uuid.UUID
    supplier_id: uuid.UUID
    doc_type: KycDocType
    file_url: str
    original_filename: str
    status: KycDocStatus
    remarks: Optional[str]
    uploaded_at: datetime
    reviewed_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class KycDocumentsListResponse(BaseModel):
    items: list[KycDocumentResponse]
    total: int
