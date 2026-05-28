"""
Pydantic DTOs for PharmaLake catalog data.
These mirror the PharmaLake API response shapes exactly so we can
validate / forward them without surprises.
"""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class PharmaLakeIngredient(BaseModel):
    """A single active ingredient inside a pack.

    Covers both the old flat-cache shape and the native PharmaLake
    CatalogIngredientOut shape:
      - substance_id / role come from PharmaLake directly.
      - strength is a nested dict {numerator_value, numerator_unit_code, …}
        when coming from PharmaLake; flat strength_value / strength_unit_code
        when read from the local cache.
    """

    # Old cache / safe fallbacks
    ingredient_id: Optional[str] = None
    inn_name: Optional[str] = None
    strength_value: Optional[str] = None
    strength_unit_code: Optional[str] = None
    strength_unit_name: Optional[str] = None

    # Native PharmaLake fields (CatalogIngredientOut)
    substance_id: Optional[str] = None
    role: Optional[str] = None
    strength: Optional[Dict[str, Any]] = None

    model_config = {"extra": "allow"}


class PharmaLakePack(BaseModel):
    """One product pack from the PharmaLake catalog."""

    pack_id: str
    brand_name: Optional[str] = None
    description: Optional[str] = None   # CatalogPackOut.description
    org_id: Optional[str] = None
    org_name: Optional[str] = None
    dosage_form_name: Optional[str] = None
    route_name: Optional[str] = None
    pack_qty_value: Optional[str] = None
    pack_qty_unit_code: Optional[str] = None
    pack_qty_unit_name: Optional[str] = None
    barcode: Optional[str] = None
    sku: Optional[str] = None
    is_active: Optional[bool] = None
    ingredients: List[PharmaLakeIngredient] = []

    model_config = {"extra": "allow"}


class PharmaLakeCatalogResponse(BaseModel):
    """Paginated catalog search response forwarded to the FE."""

    items: List[PharmaLakePack]
    total: int
    limit: int
    offset: int
