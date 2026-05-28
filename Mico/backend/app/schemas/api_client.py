import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ApiClientCreate(BaseModel):
    """Payload the superadmin sends to issue new client credentials."""

    name: str = Field(..., min_length=1, max_length=150, description="Integration / partner name")
    description: str | None = Field(None, description="Optional notes about this client")
    expires_at: datetime | None = Field(None, description="Optional UTC expiry. None = never expires")


class ApiClientUpdate(BaseModel):
    """Fields that may be changed after creation."""

    name: str | None = Field(None, min_length=1, max_length=150)
    description: str | None = None
    expires_at: datetime | None = None
    is_active: bool | None = None


class OtpVerify(BaseModel):
    """OTP payload for the rotate-secret operation."""

    otp: str = Field(..., min_length=4, max_length=8, description="6-digit OTP sent to the superadmin's email")


class ApiClientResponse(BaseModel):
    """Safe read-only view — never exposes hashed_secret."""

    id: uuid.UUID
    name: str
    description: str | None
    client_id: str
    is_active: bool
    expires_at: datetime | None
    created_by_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ApiClientCreatedResponse(ApiClientResponse):
    """
    Returned **only at creation time** and after secret rotation.

    ``client_secret`` is the plain-text secret — it is displayed once and
    never stored again.  The partner must save it immediately.
    """

    client_secret: str = Field(
        ..., description="Plain-text secret — visible only at creation. Save it now."
    )


class ClientTokenRequest(BaseModel):
    """Partner sends this to exchange credentials for a short-lived JWT."""

    client_id: str = Field(..., description="The client_id issued by the superadmin")
    client_secret: str = Field(..., description="The client_secret issued at creation time")


class ClientTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
