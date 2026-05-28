import json
from functools import lru_cache
from typing import List, Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    project_name: str = "SupplyHub API"
    version: str = "0.1.0"
    environment: str = "development"

    database_url: str
    database_ssl: str | None = "require"

    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    allowed_origins: List[str] = ["http://localhost:3000"]

    # ── Bootstrap SUPERADMIN ──────────────────────────────────────────────────
    superadmin_email: Optional[str] = None
    superadmin_password: Optional[str] = None
    superadmin_full_name: str = "Super Admin"

    # ── OTP / MFA ─────────────────────────────────────────────────────────────
    otp_expire_minutes: int = 5

    # ── Password Reset ────────────────────────────────────────────────────────
    frontend_url: str = "http://localhost:5174"
    password_reset_expire_minutes: int = 30

    # ── SendGrid ─────────────────────────────────────────────────────────────
    sendgrid_api_key: Optional[str] = None
    sendgrid_from_email: Optional[str] = None
    sendgrid_from_name: Optional[str] = None
    sendgrid_url: str = "https://api.sendgrid.com/v3/mail/send"

    # ── KYC ──────────────────────────────────────────────────────────────────
    # Docs that MUST be submitted before a supplier progresses to PENDING_APPROVAL.
    # Override via env: KYC_REQUIRED_DOCS=["DTI_SEC","BIR_COR","FDA_LTO"]
    kyc_required_docs: List[str] = ["DTI_SEC", "BIR_COR", "FDA_LTO", "MAYORS_PERMIT"]

    # Local upload directory (relative to project root).
    upload_dir: str = "uploads"

    # ── Azure Blob Storage ──────────────────────────────────────────────────────
    # Set AZURE_STORAGE_CONNECTION_STRING in .env to enable cloud uploads.
    # Leave unset to fall back to local disk storage.
    azure_storage_connection_string: Optional[str] = None
    azure_storage_container: str = "supplyhub-uploads"

    # ── PharmaLake integration ──────────────────────────────────────────────────
    pharmalake_base_url: str  # required — set PHARMALAKE_BASE_URL in .env
    pharmalake_client_id: Optional[str] = None
    pharmalake_client_secret: Optional[str] = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value: object) -> List[str]:
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            value = value.strip()
            if value.startswith("["):
                return json.loads(value)
            return [v.strip() for v in value.split(",") if v.strip()]
        return ["http://localhost:3000"]

    @field_validator("kyc_required_docs", mode="before")
    @classmethod
    def parse_kyc_required_docs(cls, value: object) -> List[str]:
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            value = value.strip()
            if value.startswith("["):
                return json.loads(value)
            return [v.strip() for v in value.split(",") if v.strip()]
        return ["DTI_SEC", "BIR_COR", "FDA_LTO", "MAYORS_PERMIT"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
