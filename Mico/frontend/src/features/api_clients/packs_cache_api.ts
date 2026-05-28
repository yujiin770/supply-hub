/**
 * Typed API client for the supplier packs-cache endpoints.
 * POST /suppliers/me/packs-cache/sync  — sync from PharmaLake
 * GET  /suppliers/me/packs-cache       — list cached packs
 */
import { axiosClient } from "../../lib/axios_client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PacksSyncResponse {
  supplier_id: string;
  received_count: number;
  upserted_count: number;
  deactivated_count: number;
  started_at: string;
  finished_at: string;
}

export interface PacksCacheItem {
  id: string;
  supplier_id: string;
  pack_id: string;
  product_id: string | null;
  presentation_id: string | null;
  org_id: string | null;
  org_name: string | null;
  brand_name: string | null;
  sku: string | null;
  barcode: string | null;
  pack_qty_value: string | null;
  pack_qty_unit_code: string | null;
  pack_qty_unit_name: string | null;
  dosage_form_name: string | null;
  route_name: string | null;
  description: string | null;
  ingredients: object[];
  is_active: boolean;
  source_synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface PacksCacheListResponse {
  items: PacksCacheItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface PacksCacheListParams {
  page?: number;
  page_size?: number;
  search?: string;
  active_only?: boolean;
}

// ── API functions ─────────────────────────────────────────────────────────────

export const packsCacheApi = {
  /**
   * Trigger a full sync from PharmaLake for the logged-in supplier.
   * Returns a summary of what was upserted / deactivated.
   */
  sync(): Promise<PacksSyncResponse> {
    return axiosClient
      .post<PacksSyncResponse>("/suppliers/me/packs-cache/sync")
      .then((r) => r.data);
  },

  /**
   * Fetch the supplier's cached packs (paginated, with optional text search).
   */
  list(params?: PacksCacheListParams): Promise<PacksCacheListResponse> {
    return axiosClient
      .get<PacksCacheListResponse>("/suppliers/me/packs-cache", { params })
      .then((r) => r.data);
  },
};
