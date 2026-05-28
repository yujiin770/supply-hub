"""Schemas used exclusively by the SUPERADMIN-only routes."""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.rbac import Role
from app.models.supplier import SupplierStatus
from app.schemas.supplier import SupplierResponse


# ── Request bodies ────────────────────────────────────────────────────────────

class ProvisionSupplierRequest(BaseModel):
    """Create a supplier + its owner user in a single atomic call."""

    # Supplier fields
    legal_name: str = Field(..., min_length=2, max_length=255)
    trade_name: Optional[str] = Field(None, max_length=255)
    email: EmailStr
    mobile_number: Optional[str] = Field(None, max_length=50)
    address_line1: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    province: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    country: str = Field("Philippines", max_length=100)

    # Owner user fields
    owner_full_name: str = Field(..., min_length=2, max_length=255)
    owner_email: EmailStr
    owner_password: str = Field(..., min_length=8, max_length=128)


class UpdateSupplierStatusRequest(BaseModel):
    status: SupplierStatus


# ── Response bodies ───────────────────────────────────────────────────────────

class OwnerSummary(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: Role
    supplier_id: Optional[uuid.UUID]
    is_active: bool
    is_email_verified: bool
    is_mobile_verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProvisionSupplierResponse(BaseModel):
    supplier: SupplierResponse
    owner: OwnerSummary


class SuperAdminSupplierListResponse(BaseModel):
    items: list[SupplierResponse]
    total: int
    skip: int
    limit: int


# ── Admin account management ──────────────────────────────────────────────────

class CreateAdminRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr


class AdminUserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: Role
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminUserListResponse(BaseModel):
    items: list[AdminUserResponse]
    total: int
    skip: int
    limit: int


class ImpersonationResponse(BaseModel):
    """Returned by POST /superadmin/suppliers/{id}/impersonate."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    supplier_name: str  # legal name of the supplier being impersonated
    owner: OwnerSummary  # the supplier-owner user the token is issued for
