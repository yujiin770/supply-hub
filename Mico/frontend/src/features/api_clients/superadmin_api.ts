import { api } from "../../lib/api";

export type SupplierStatus =
  | "DRAFT"
  | "PENDING_KYC"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

export interface SupplierResponse {
  id: string;
  supplier_code: string;
  legal_name: string;
  trade_name: string | null;
  email: string;
  mobile_number: string | null;
  address_line1: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  status: SupplierStatus;
  is_email_verified: boolean;
  is_mobile_verified: boolean;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OwnerSummary {
  id: string;
  email: string;
  full_name: string;
  role: string;
  supplier_id: string | null;
  is_active: boolean;
  is_email_verified: boolean;
  is_mobile_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProvisionSupplierRequest {
  legal_name: string;
  trade_name?: string;
  email: string;
  mobile_number?: string;
  address_line1: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  owner_full_name: string;
  owner_email: string;
  owner_password: string;
}

export interface ProvisionSupplierResponse {
  supplier: SupplierResponse;
  owner: OwnerSummary;
}

export interface SupplierListResponse {
  items: SupplierResponse[];
  total: number;
  skip: number;
  limit: number;
}

export interface UpdateStatusRequest {
  status: SupplierStatus;
}

export interface ImpersonationApiResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  supplier_name: string;
  owner: OwnerSummary;
}

// ── Admin accounts ─────────────────────────────────────────────────────────

export interface CreateAdminRequest {
  full_name: string;
  email: string;
}

export interface AdminUserResponse {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUserListResponse {
  items: AdminUserResponse[];
  total: number;
  skip: number;
  limit: number;
}

export const superadminApi = {
  provision(
    body: ProvisionSupplierRequest,
    token: string,
  ): Promise<ProvisionSupplierResponse> {
    return api.post<ProvisionSupplierResponse>("/superadmin/suppliers", body, {
      token,
    });
  },

  list(
    params: { skip?: number; limit?: number; status?: string; q?: string },
    token: string,
  ): Promise<SupplierListResponse> {
    return api.get<SupplierListResponse>("/superadmin/suppliers", {
      params,
      token,
    });
  },

  get(supplierId: string, token: string): Promise<SupplierResponse> {
    return api.get<SupplierResponse>(`/superadmin/suppliers/${supplierId}`, {
      token,
    });
  },

  updateStatus(
    supplierId: string,
    body: UpdateStatusRequest,
    token: string,
  ): Promise<SupplierResponse> {
    return api.put<SupplierResponse>(
      `/superadmin/suppliers/${supplierId}/status`,
      body,
      { token },
    );
  },

  impersonate(
    supplierId: string,
    token: string,
  ): Promise<ImpersonationApiResponse> {
    return api.post<ImpersonationApiResponse>(
      `/superadmin/suppliers/${supplierId}/impersonate`,
      {},
      { token },
    );
  },

  // ── Admin accounts ────────────────────────────────────────────────────────

  createAdmin(
    body: CreateAdminRequest,
    token: string,
  ): Promise<AdminUserResponse> {
    return api.post<AdminUserResponse>("/superadmin/admin-accounts", body, {
      token,
    });
  },

  listAdmins(
    params: { skip?: number; limit?: number; q?: string },
    token: string,
  ): Promise<AdminUserListResponse> {
    return api.get<AdminUserListResponse>("/superadmin/admin-accounts", {
      params,
      token,
    });
  },
};
