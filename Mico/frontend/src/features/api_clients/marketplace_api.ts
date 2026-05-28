/**
 * Typed API client for the marketplace (buyer-facing) endpoints.
 * GET /marketplace/suppliers
 * GET /marketplace/suppliers/:supplierId/packages
 */
import { useQuery } from "@tanstack/react-query";
import { axiosClient } from "../../lib/axios_client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MarketplaceSupplier {
  supplier_id: string;
  supplier_code: string;
  legal_name: string;
  trade_name: string | null;
  city: string | null;
  province: string | null;
  status: string;
}

export interface PaginatedMarketplaceSuppliers {
  items: MarketplaceSupplier[];
  total: number;
  limit: number;
  offset: number;
}

export interface MarketplacePackage {
  listing_id: string;
  pack_id: string;
  brand_name: string | null;
  dosage_form_name: string | null;
  route_name: string | null;
  pack_qty_value: string | null;
  pack_qty_unit_code: string | null;
  barcode: string | null;
  sku: string | null;
  ingredients: unknown[];
  base_price: string | null;
  moq: string | null;
  lead_time_days: number | null;
  stock_qty: number | null;
  is_enabled: boolean;
}

export interface PaginatedMarketplacePackages {
  items: MarketplacePackage[];
  total: number;
  limit: number;
  offset: number;
}

// ── Wrapped response shape (success_response wrapper) ────────────────────────

interface ApiSuccess<T> {
  success: boolean;
  data: T;
}

// ── Raw API calls ─────────────────────────────────────────────────────────────

export const marketplaceApi = {
  listSuppliers(params: {
    limit: number;
    offset: number;
    q?: string;
  }): Promise<PaginatedMarketplaceSuppliers> {
    return axiosClient
      .get<ApiSuccess<PaginatedMarketplaceSuppliers>>(
        "/marketplace/suppliers",
        {
          params,
        },
      )
      .then((r) => r.data.data);
  },

  getSupplier(supplierId: string): Promise<MarketplaceSupplier> {
    return axiosClient
      .get<
        ApiSuccess<MarketplaceSupplier>
      >(`/marketplace/suppliers/${supplierId}`)
      .then((r) => r.data.data);
  },

  listPackages(
    supplierId: string,
    params: { limit: number; offset: number; q?: string; is_enabled?: boolean },
  ): Promise<PaginatedMarketplacePackages> {
    return axiosClient
      .get<
        ApiSuccess<PaginatedMarketplacePackages>
      >(`/marketplace/suppliers/${supplierId}/packages`, { params })
      .then((r) => r.data.data);
  },
};

// ── Query keys ────────────────────────────────────────────────────────────────

export const marketplaceQueryKeys = {
  suppliers: (params: object) => ["marketplaceSuppliers", params] as const,
  packages: (supplierId: string, params: object) =>
    ["marketplacePackages", supplierId, params] as const,
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useMarketplaceSuppliers(params: {
  limit: number;
  offset: number;
  q?: string;
}) {
  return useQuery({
    queryKey: marketplaceQueryKeys.suppliers(params),
    queryFn: () => marketplaceApi.listSuppliers(params),
    staleTime: 30_000,
  });
}

export function useMarketplaceSupplier(supplierId: string | undefined) {
  return useQuery({
    queryKey: ["marketplaceSupplier", supplierId],
    queryFn: () => marketplaceApi.getSupplier(supplierId!),
    enabled: !!supplierId,
    staleTime: 60_000,
  });
}

export function useSupplierPackages(
  supplierId: string | undefined,
  params: { limit: number; offset: number; q?: string; is_enabled?: boolean },
) {
  return useQuery({
    queryKey: marketplaceQueryKeys.packages(supplierId ?? "", params),
    queryFn: () => marketplaceApi.listPackages(supplierId!, params),
    enabled: !!supplierId,
    staleTime: 30_000,
  });
}
