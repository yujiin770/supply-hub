import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ApiClient(Base):
    """
    OAuth2-style client credentials issued to external systems (e.g. buyer ERPs,
    third-party order integrations).

    - ``client_id``      Public identifier (UUID4 string). Shared with the partner.
    - ``hashed_secret``  bcrypt hash of the secret. Never stored in plain text.
    - ``is_active``      Superadmin can revoke access by flipping this to False.
    - ``expires_at``     Optional hard expiry; None means never expires.
    - ``created_by_id``  FK to the superadmin user who issued the credentials.
    """

    __tablename__ = "api_clients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    client_id: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, index=True
    )
    hashed_secret: Mapped[str] = mapped_column(String(255), nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
