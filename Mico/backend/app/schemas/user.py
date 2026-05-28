import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.core.rbac import Role


class UserBase(BaseModel):
    email: str
    mobile_number: Optional[str] = None
    full_name: str
    role: Role
    is_active: bool


class UserResponse(UserBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
