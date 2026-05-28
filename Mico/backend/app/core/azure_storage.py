"""
Azure Blob Storage helper for KYC document uploads.

Reads AZURE_STORAGE_CONNECTION_STRING and AZURE_STORAGE_CONTAINER from
Settings.  If the connection string is not configured the module raises
clearly so misconfiguration is caught at startup / first upload.

Blob naming convention:
    kyc/{supplier_id}/{doc_type}_{uuid4_hex}{ext}

All document URLs returned to clients are short-lived SAS URLs (default
60 minutes) so the private container is never exposed directly.
"""
from datetime import datetime, timedelta, timezone

from azure.storage.blob import BlobSasPermissions, BlobServiceClient, ContentSettings, generate_blob_sas

from app.core.config import get_settings


def _get_client() -> BlobServiceClient:
    settings = get_settings()
    conn_str = settings.azure_storage_connection_string
    if not conn_str:
        raise RuntimeError(
            "AZURE_STORAGE_CONNECTION_STRING is not set. "
            "Add it to your .env file to enable Azure Blob Storage."
        )
    return BlobServiceClient.from_connection_string(conn_str)


def upload_blob(blob_name: str, data: bytes, content_type: str) -> str:
    """
    Upload *data* to the configured container under *blob_name*.
    Returns the raw (private) blob URL. Use generate_sas_url() to produce
    a viewable link.
    """
    settings = get_settings()
    client = _get_client()
    container_client = client.get_container_client(settings.azure_storage_container)

    blob_client = container_client.get_blob_client(blob_name)
    blob_client.upload_blob(
        data,
        overwrite=True,
        content_settings=ContentSettings(content_type=content_type),
    )
    return blob_client.url


def generate_sas_url(blob_name: str, expiry_minutes: int = 60) -> str:
    """
    Generate a time-limited Shared Access Signature URL for a blob.
    The URL grants read-only access for *expiry_minutes* (default 60).
    """
    settings = get_settings()
    client = _get_client()
    account_name: str = client.account_name  # type: ignore[assignment]
    account_key: str = client.credential.account_key  # type: ignore[union-attr]

    sas_token = generate_blob_sas(
        account_name=account_name,
        container_name=settings.azure_storage_container,
        blob_name=blob_name,
        account_key=account_key,
        permission=BlobSasPermissions(read=True),
        expiry=datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes),
    )
    return (
        f"https://{account_name}.blob.core.windows.net"
        f"/{settings.azure_storage_container}/{blob_name}?{sas_token}"
    )


def delete_blob(blob_name: str) -> None:
    """
    Delete a blob by name.  Silently ignores 404 (already gone).
    """
    from azure.core.exceptions import ResourceNotFoundError

    settings = get_settings()
    client = _get_client()
    container_client = client.get_container_client(settings.azure_storage_container)
    blob_client = container_client.get_blob_client(blob_name)
    try:
        blob_client.delete_blob()
    except ResourceNotFoundError:
        pass


def blob_name_from_url(file_url: str) -> str:
    """
    Extract the blob name (path inside the container) from a raw Azure
    Blob URL (no query string / SAS token needed).

        https://<account>.blob.core.windows.net/supplyhub-uploads/kyc/…/file.pdf
        → kyc/…/file.pdf
    """
    settings = get_settings()
    container = settings.azure_storage_container
    marker = f"/{container}/"
    # Strip SAS query string first
    clean = file_url.split("?")[0]
    idx = clean.find(marker)
    if idx == -1:
        return clean
    return clean[idx + len(marker):]


def kyc_doc_to_response(doc: object, expiry_minutes: int = 60) -> "KycDocumentResponse":  # noqa: F821
    """
    Build a KycDocumentResponse from an ORM SupplierKycDocument, replacing
    the raw private blob URL with a short-lived SAS URL.
    """
    from app.schemas.kyc import KycDocumentResponse  # local import to avoid circulars

    response = KycDocumentResponse.model_validate(doc)
    blob_name = blob_name_from_url(response.file_url)
    return response.model_copy(update={"file_url": generate_sas_url(blob_name, expiry_minutes)})
