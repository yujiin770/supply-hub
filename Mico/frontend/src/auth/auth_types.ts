/** Returned by POST /auth/login */
export interface MfaRequiredResponse {
  mfa_required: boolean;
  mfa_token: string;
  detail: string;
}

/** Returned by POST /auth/verify-otp */
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export type UserRole =
  | "SUPERADMIN"
  | "ADMIN"
  | "SUPPLIER_OWNER"
  | "SUPPLIER_STAFF";

/** Returned by GET /auth/me */
export interface UserInfo {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  supplier_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function getRoleHome(role: UserRole): string {
  switch (role) {
    case "SUPERADMIN":
      return "/superadmin/suppliers";
    case "ADMIN":
      return "/superadmin/suppliers";
    case "SUPPLIER_OWNER":
    case "SUPPLIER_STAFF":
      return "/dashboard";
    default:
      return "/login";
  }
}

export interface ImpersonationState {
  /** The superadmin's original access token, to restore on exit. */
  originalToken: string;
  /** The superadmin's original user, to restore on exit. */
  originalUser: UserInfo;
  /** Display name shown in the impersonation banner. */
  supplierName: string;
}
