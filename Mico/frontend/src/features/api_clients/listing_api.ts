/**
 * Typed API client for supplier listing endpoints (My Catalog).
 * Uses the axios instance and TanStack Query hooks.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosClient, getAxiosErrorMessage } from "../../lib/axios_client";
import { toast } from "../../lib/toast";
import type { PharmaLakePack } from "./pharmalake_api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ListingResponse {
  id: string;
  supplier_id: string;
  pack_id: string;
  is_enabled: boolean;
  base_price: string | null;
  moq: string | null;
  lead_time_days: number | null;
  stock_qty: number | null;
  created_at: string;
  updated_at: string;
  /** Joined inline from pharmalake_packs_caches. Null when not yet synced. */
  pack: PharmaLakePack | null;
}

export interface ListingDetailResponse extends ListingResponse {
  pack: PharmaLakePack | null;
}

export interface PaginatedListingsResponse {
  items: ListingResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListingCreate {
  pack_id: string;
  base_price?: number | null;
  moq?: number | null;
  lead_time_days?: number | null;
  stock_qty?: number | null;
  pack_meta?: {
    brand_name?: string | null;
    barcode?: string | null;
    sku?: string | null;
    org_id?: string | null;
    org_name?: string | null;
    dosage_form_name?: string | null;
    route_name?: string | null;
    pack_qty_value?: string | null;
    pack_qty_unit_code?: string | null;
    pack_qty_unit_name?: string | null;
    ingredients_json?: object[] | null;
  } | null;
}

export interface ListingUpdate {
  base_price?: number | null;
  moq?: number | null;
  lead_time_days?: number | null;
  is_enabled?: boolean;
  stock_qty?: number | null;
}

export interface RecentListingOut {
  id: string;
  pack_id: string;
  is_enabled: boolean;
  base_price: string | null;
  moq: string | null;
  lead_time_days: number | null;
  stock_qty: number | null;
  added_at: string;
  brand_name: string | null;
  inn_name: string | null;
  org_name: string | null;
  dosage_form_name: string | null;
  route_name: string | null;
  pack_qty_value: string | null;
  pack_qty_unit_code: string | null;
  strength_summary: string | null;
}

export interface PaginatedRecentListingsOut {
  items: RecentListingOut[];
  total: number;
  limit: number;
  offset: number;
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const listingQueryKeys = {
  myListings: (params: object) => ["myListings", params] as const,
  myListingDetail: (id: string) => ["myListingDetail", id] as const,
  myPackIds: ["myPackIds"] as const,
  myRecentListings: (params: object) => ["myRecentListings", params] as const,
};

// ── Raw API ───────────────────────────────────────────────────────────────────

export const listingApi = {
  create(data: ListingCreate): Promise<ListingResponse> {
    return axiosClient
      .post<ListingResponse>("/suppliers/me/listings", data)
      .then((r) => r.data);
  },

  list(params: {
    limit: number;
    offset: number;
    q?: string;
    is_enabled?: boolean;
  }): Promise<PaginatedListingsResponse> {
    return axiosClient
      .get<PaginatedListingsResponse>("/suppliers/me/listings", { params })
      .then((r) => r.data);
  },

  getDetail(id: string): Promise<ListingDetailResponse> {
    return axiosClient
      .get<ListingDetailResponse>(`/suppliers/me/listings/${id}`)
      .then((r) => r.data);
  },

  update(id: string, data: ListingUpdate): Promise<ListingResponse> {
    return axiosClient
      .put<ListingResponse>(`/suppliers/me/listings/${id}`, data)
      .then((r) => r.data);
  },

  disable(id: string): Promise<ListingResponse> {
    return axiosClient
      .delete<ListingResponse>(`/suppliers/me/listings/${id}`)
      .then((r) => r.data);
  },

  enable(id: string): Promise<ListingResponse> {
    return axiosClient
      .put<ListingResponse>(`/suppliers/me/listings/${id}`, {
        is_enabled: true,
      })
      .then((r) => r.data);
  },

  getMyPackIds(): Promise<string[]> {
    return axiosClient
      .get<string[]>("/suppliers/me/listings/pack-ids")
      .then((r) => r.data);
  },

  updateStock(id: string, stock_qty: number | null): Promise<ListingResponse> {
    return axiosClient
      .patch<ListingResponse>(`/suppliers/me/listings/${id}/stock`, {
        stock_qty,
      })
      .then((r) => r.data);
  },

  listRecentlyAdded(params: {
    days: number;
    limit: number;
    offset: number;
  }): Promise<PaginatedRecentListingsOut> {
    return axiosClient
      .get<PaginatedRecentListingsOut>(
        "/suppliers/me/listings/recently-added",
        { params },
      )
      .then((r) => r.data);
  },
};

// ── TanStack Query hooks ──────────────────────────────────────────────────────

export function useMyListings(params: {
  limit: number;
  offset: number;
  q?: string;
  is_enabled?: boolean;
}) {
  return useQuery({
    queryKey: listingQueryKeys.myListings(params),
    queryFn: () => listingApi.list(params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useMyListingDetail(id: string) {
  return useQuery({
    queryKey: listingQueryKeys.myListingDetail(id),
    queryFn: () => listingApi.getDetail(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

/** Returns the set of pack_ids the supplier has in their catalog (for "Added" badges). */
export function useMyPackIds() {
  return useQuery({
    queryKey: listingQueryKeys.myPackIds,
    queryFn: listingApi.getMyPackIds,
    staleTime: 30_000,
  });
}

export function useCreateListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: listingApi.create,
    onSuccess: () => {
      toast.success("Added to your catalog.");
      qc.invalidateQueries({ queryKey: ["myListings"] });
      qc.invalidateQueries({ queryKey: listingQueryKeys.myPackIds });
      qc.invalidateQueries({ queryKey: ["myRecentListings"] });
    },
    onError: (err) => {
      toast.error(getAxiosErrorMessage(err, "Failed to add listing."));
    },
  });
}

export function useUpdateListing(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ListingUpdate) => listingApi.update(id, data),
    onSuccess: () => {
      toast.success("Listing updated.");
      qc.invalidateQueries({ queryKey: ["myListings"] });
      qc.invalidateQueries({ queryKey: listingQueryKeys.myListingDetail(id) });
    },
    onError: (err) => {
      toast.error(getAxiosErrorMessage(err, "Failed to update listing."));
    },
  });
}

export function useDisableListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: listingApi.disable,
    onSuccess: () => {
      toast.success("Listing removed from your catalog.");
      qc.invalidateQueries({ queryKey: ["myListings"] });
      qc.invalidateQueries({ queryKey: listingQueryKeys.myPackIds });
    },
    onError: (err) => {
      toast.error(getAxiosErrorMessage(err, "Failed to remove listing."));
    },
  });
}
export function useEnableListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: listingApi.enable,
    onSuccess: () => {
      toast.success("Listing activated.");
      qc.invalidateQueries({ queryKey: ["myListings"] });
      qc.invalidateQueries({ queryKey: listingQueryKeys.myPackIds });
    },
    onError: (err) => {
      toast.error(getAxiosErrorMessage(err, "Failed to activate listing."));
    },
  });
}

export function useUpdateListingStock(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (stock_qty: number | null) =>
      listingApi.updateStock(id, stock_qty),
    onSuccess: () => {
      toast.success("Stock updated.");
      qc.invalidateQueries({ queryKey: ["myListings"] });
    },
    onError: (err) => {
      toast.error(getAxiosErrorMessage(err, "Failed to update stock."));
    },
  });
}

export function useMyRecentListings(params: {
  days: number;
  limit: number;
  offset: number;
}) {
  return useQuery({
    queryKey: listingQueryKeys.myRecentListings(params),
    queryFn: () => listingApi.listRecentlyAdded(params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
