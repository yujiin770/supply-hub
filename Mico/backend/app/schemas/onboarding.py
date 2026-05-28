import uuid
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class SupplierSignupRequest(BaseModel):
    # Business / supplier details
    legal_name: str = Field(..., min_length=2, max_length=255)
    trade_name: Optional[str] = Field(None, max_length=255)
    business_email: EmailStr
    business_mobile: Optional[str] = Field(None, max_length=50)

    # Business address
    address_line1: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    province: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    country: str = Field("Philippines", max_length=100)

    # Supplier owner account
    owner_full_name: str = Field(..., min_length=2, max_length=255)
    owner_email: EmailStr
    owner_password: str = Field(..., min_length=8, max_length=128)


class SupplierSignupResponse(BaseModel):
    message: str
    supplier_id: uuid.UUID
    supplier_code: str
