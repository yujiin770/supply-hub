"""
PharmaLake token service — fetches client-credentials tokens and caches them
in memory, refreshing automatically when near expiry or on a 401.
"""
import asyncio
import logging
import time
from typing import Optional

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Refresh the token this many seconds before it actually expires to avoid
# races between concurrent requests.
_BUFFER_SECONDS = 30


class PharmaLakeAuthService:
    def __init__(self) -> None:
        self._token: Optional[str] = None
        self._expires_at: float = 0.0
        self._lock = asyncio.Lock()

    # ── Public API ────────────────────────────────────────────────────────────

    async def get_access_token(self) -> str:
        """Return a valid bearer token, fetching a new one if necessary."""
        async with self._lock:
            if self._token and time.monotonic() < self._expires_at - _BUFFER_SECONDS:
                return self._token
            return await self._fetch_token()

    async def invalidate(self) -> None:
        """Force the next call to get_access_token() to re-fetch."""
        async with self._lock:
            self._token = None
            self._expires_at = 0.0

    # ── Private ───────────────────────────────────────────────────────────────

    async def _fetch_token(self) -> str:
        settings = get_settings()
        if not settings.pharmalake_client_id or not settings.pharmalake_client_secret:
            raise RuntimeError(
                "PharmaLake credentials not configured. "
                "Set PHARMALAKE_CLIENT_ID and PHARMALAKE_CLIENT_SECRET in .env"
            )

        url = f"{settings.pharmalake_base_url}/api/v1/auth/client-token"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                url,
                json={
                    "client_id": settings.pharmalake_client_id,
                    "client_secret": settings.pharmalake_client_secret,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        self._token = data["access_token"]
        expires_in: int = int(data.get("expires_in", 3600))
        self._expires_at = time.monotonic() + expires_in
        logger.info("PharmaLake token refreshed (expires_in=%ds)", expires_in)
        return self._token


# Module-level singleton — shared by the catalog service.
pharmalake_auth = PharmaLakeAuthService()
