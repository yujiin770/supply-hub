from fastapi import APIRouter

from app.api.v1.routes import admin, admin_review, api_clients, auth, catalog, health, kyc, listings, marketplace, onboarding, orders, packs_cache, pharmalake, superadmin, supplier

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(admin.router)
api_router.include_router(admin_review.router)
api_router.include_router(supplier.router)
api_router.include_router(superadmin.router)
api_router.include_router(api_clients.router)
api_router.include_router(onboarding.router)
api_router.include_router(kyc.router)
api_router.include_router(pharmalake.router)
api_router.include_router(listings.router)
api_router.include_router(listings._client_router)
api_router.include_router(packs_cache.router)
api_router.include_router(catalog.router)
api_router.include_router(orders.router)
api_router.include_router(marketplace.router)
api_router.include_router(health.router, tags=["health"])
