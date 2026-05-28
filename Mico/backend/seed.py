"""
Standalone seed script – run once to bootstrap the superadmin account.

Usage:
    python seed.py

Reads SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD from the .env file (same as the
application).  If the variables are not set the script exits with an error.
"""
import asyncio
import logging

from app.db.session import AsyncSessionLocal
from app.services.bootstrap_service import bootstrap_superadmin

logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")
logger = logging.getLogger(__name__)


async def main() -> None:
    async with AsyncSessionLocal() as session:
        await bootstrap_superadmin(session)


if __name__ == "__main__":
    asyncio.run(main())
