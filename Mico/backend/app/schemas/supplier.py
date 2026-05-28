import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.supplier import SupplierStatus


class SupplierCreate(BaseModel):
    legal_name: str
    trade_name: Optional[str] = None
    email: EmailStr
    mobile_number: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "Philippines"


class SupplierUpdate(BaseModel):
    legal_name: Optional[str] = None
    trade_name: Optional[str] = None
    email: Optional[EmailStr] = None
    mobile_number: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None


class SupplierStatusUpdate(BaseModel):
    status: SupplierStatus


class SupplierResponse(BaseModel):
    id: uuid.UUID
    supplier_code: str
    legal_name: str
    trade_name: Optional[str]
    email: str
    mobile_number: Optional[str]
    address_line1: Optional[str]
    city: Optional[str]
    province: Optional[str]
    postal_code: Optional[str]
    country: str
    status: SupplierStatus
    is_email_verified: bool
    is_mobile_verified: bool
    approved_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedSuppliersResponse(BaseModel):
    items: list[SupplierResponse]
    total: int
    skip: int
    limit: int
