/**
 * Typed API client for catalog picker endpoints (reads from local cache via SupplyHub).
 * FE never calls PharmaLake directly — all requests go through /api/v1/catalog/picker.
 */
import { useQuery } from "@tanstack/react-query";
import { axiosClient } from "../../lib/axios_client";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Nested strength shape returned by PharmaLake's live catalog/search API. */
export interface PharmaLakeStrength {
  numerator_value: string | null;
  numerator_unit_code: string | null;
  numerator_unit_name: string | null;
  denominator_value: string | null;
  denominator_unit_code: string | null;
  denominator_unit_name: string | null;
}

/**
 * Ingredient as it appears in both the local-cache and the live PharmaLake paths.
 *
 * Live path (CatalogIngredientOut):
 *   substance_id, inn_name, role, strength (nested object)
 *
 * Cache path (legacy):
 *   ingredient_id, inn_name, strength_value, strength_unit_code
 */
export interface PharmaLakeIngredient {
  // ── cache path ────────────────────────────────────────
  ingredient_id?: string | null;
  strength_value?: string | null;
  strength_unit_code?: string | null;
  strength_unit_name?: string | null;
  // ── live / native PharmaLake path ─────────────────────
  substance_id?: string | null;
  role?: string | null;
  strength?: PharmaLakeStrength | null;
  // ── shared ────────────────────────────────────────────
  inn_name: string | null;
}

export interface PharmaLakePack {
  pack_id: string;
  brand_name: string | null;
  description?: string | null; // present in live API (CatalogPackOut)
  org_id: string | null;
  org_name: string | null;
  dosage_form_name: string | null;
  route_name: string | null;
  pack_qty_value: string | null;
  pack_qty_unit_code: string | null;
  pack_qty_unit_name: string | null;
  barcode: string | null;
  sku: string | null;
  is_active: boolean | null;
  ingredients: PharmaLakeIngredient[];
  /** ISO timestamp — present only when reading from the local cache */
  synced_at?: string | null;
  /** ISO timestamp — when this pack first appeared in the local cache */
  first_seen_at?: string | null;
}

export interface PharmaLakeCatalogResponse {
  items: PharmaLakePack[];
  total: number;
  limit: number;
  offset: number;
}

// ── Query params ──────────────────────────────────────────────────────────────

export interface CatalogPickerParams {
  q?: string;
  limit: number;
  offset: number;
  is_active?: boolean;
}

/** Convenience alias so callers can import BatchIngredient from this module. */
export type BatchIngredient = PharmaLakeIngredient;
/** Convenience alias so callers can import BatchPack from this module. */
export type BatchPack = PharmaLakePack;

// ── Raw API ───────────────────────────────────────────────────────────────────

export const pharmalakeApi = {
  /** Reads from the local cache (fast). */
  searchCatalog(
    params: CatalogPickerParams,
  ): Promise<PharmaLakeCatalogResponse> {
    return axiosClient
      .get<{ success: boolean; data: PharmaLakeCatalogResponse }>(
        "/catalog/picker",
        {
          params: {
            is_active: params.is_active ?? true,
            limit: params.limit,
            offset: params.offset,
            ...(params.q ? { q: params.q } : {}),
          },
        },
      )
      .then((r) => r.data.data);
  },

  /** Admin — trigger a full re-sync from PharmaLake. */
  syncCatalog(is_active = true): Promise<{ synced: number; pages: number }> {
    return axiosClient
      .post<{
        success: boolean;
        data: { synced: number; pages: number };
      }>("/admin/catalog/sync", null, { params: { is_active } })
      .then((r) => r.data.data);
  },

  /** Recently added — items first seen in the cache within the last N days. */
  getRecentlyAdded(
    days = 7,
    limit = 50,
    offset = 0,
  ): Promise<PharmaLakeCatalogResponse & { days: number }> {
    return axiosClient
      .get<{
        success: boolean;
        data: PharmaLakeCatalogResponse & { days: number };
      }>("/catalog/recently-added", { params: { days, limit, offset } })
      .then((r) => r.data.data);
  },

  /** Batch-fetch full pack details (brand name, strength, etc.) from PharmaLake. */
  batchLookup(pack_ids: string[]): Promise<BatchPack[]> {
    if (pack_ids.length === 0) return Promise.resolve([]);
    return axiosClient
      .post<BatchPack[]>("/catalog/batch", { pack_ids })
      .then((r) => r.data);
  },

  /**
   * Live catalog search — calls PharmaLake directly (no local cache).
   * Always returns the freshest data, including items added after the last sync.
   */
  liveSearch(params: CatalogPickerParams): Promise<PharmaLakeCatalogResponse> {
    return axiosClient
      .get<{ success: boolean; data: PharmaLakeCatalogResponse }>(
        "/catalog/live",
        {
          params: {
            is_active: params.is_active ?? true,
            limit: params.limit,
            offset: params.offset,
            ...(params.q ? { q: params.q } : {}),
          },
        },
      )
      .then((r) => r.data.data);
  },
};

// ── TanStack Query hooks ──────────────────────────────────────────────────────

export function usePharmaLakeCatalog(params: CatalogPickerParams) {
  return useQuery({
    queryKey: ["pharmalakeCatalog", params] as const,
    queryFn: () => pharmalakeApi.searchCatalog(params),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

/** Live (direct PharmaLake) search — used by the Browse Catalog picker. */
export function useLiveCatalog(params: CatalogPickerParams) {
  return useQuery({
    queryKey: ["liveCatalog", params] as const,
    queryFn: () => pharmalakeApi.liveSearch(params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useCatalogRecentlyAdded({
  days = 7,
  limit = 50,
  offset = 0,
}: { days?: number; limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: ["catalogRecentlyAdded", { days, limit, offset }] as const,
    queryFn: () => pharmalakeApi.getRecentlyAdded(days, limit, offset),
    staleTime: 5 * 60_000, // 5 min
    placeholderData: (prev) => prev,
  });
}

/**
 * Batch-fetch full pack details for a list of pack_ids and return as a map
 * keyed by pack_id. Only fires when packIds is non-empty.
 */
export function useBatchPacks(packIds: string[]) {
  return useQuery({
    queryKey: ["batchPacks", packIds.slice().sort().join(",")] as const,
    queryFn: () => pharmalakeApi.batchLookup(packIds),
    enabled: packIds.length > 0,
    staleTime: 5 * 60_000,
    select: (packs) =>
      Object.fromEntries(packs.map((p) => [p.pack_id, p])) as Record<
        string,
        BatchPack
      >,
  });
}

/**
 * Build a short human-readable strength summary from ingredients.
 * e.g. "Amoxicillin 500 mg + Clavulanic acid 125 mg"
 */
export function strengthSummary(ingredients: PharmaLakeIngredient[]): string {
  return (
    ingredients
      .filter((i) => i.role === "active" || !i.role)
      .map((i) => {
        const name = i.inn_name ?? "";
        // Prefer the live nested strength; fall back to flat cache fields.
        let strengthStr = "";
        if (i.strength?.numerator_value) {
          const val = parseFloat(i.strength.numerator_value);
          const valStr = Number.isInteger(val) ? String(val) : val.toFixed(2);
          const unit = i.strength.numerator_unit_code ?? "";
          strengthStr = ` ${valStr}${unit ? " " + unit : ""}`;
        } else if (i.strength_value && i.strength_unit_code) {
          strengthStr = ` ${i.strength_value} ${i.strength_unit_code}`;
        }
        return (name + strengthStr).trim();
      })
      .filter(Boolean)
      .join(" + ") || "—"
  );
}

/**
 * Strength summary for the batch API response format (nested strength object).
 * e.g. "paracetamol 325 mg + ibuprofen 200 mg"
 */
export function batchStrengthSummary(ingredients: BatchIngredient[]): string {
  return (
    ingredients
      .filter((i) => i.role === "active" || !i.role)
      .map((i) => {
        const name = i.inn_name ?? "";
        const val = i.strength?.numerator_value
          ? parseFloat(i.strength.numerator_value)
          : null;
        const valStr =
          val != null
            ? Number.isInteger(val)
              ? String(val)
              : val.toFixed(2)
            : "";
        const unit = i.strength?.numerator_unit_code ?? "";
        const strength = valStr ? ` ${valStr}${unit ? " " + unit : ""}` : "";
        return (name + strength).trim();
      })
      .filter(Boolean)
      .join(" + ") || "—"
  );
}
