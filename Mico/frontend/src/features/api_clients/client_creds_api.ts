/**
 * client_creds_api.ts — Types and API functions for managing API client credentials.
 *
 * Endpoints:
 *   GET    /superadmin/api-clients                 list all
 *   POST   /superadmin/api-clients                 create (returns secret once)
 *   PATCH  /superadmin/api-clients/{id}            update name/description/status/expiry
 *   PATCH  /superadmin/api-clients/{id}/revoke     deactivate
 *   DELETE /superadmin/api-clients/{id}            hard-delete
 *   POST   /superadmin/api-clients/otp             request rotate OTP
 *   POST   /superadmin/api-clients/{id}/rotate     verify OTP → rotate credentials
 *   POST   /auth/client-token                      partner token exchange (no auth required)
 */
import { api } from "../../lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiClientOut {
  id: string;
  name: string;
  description: string | null;
  client_id: string;
  is_active: boolean;
  expires_at: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Returned only at creation or after a secret rotation — save the secret now. */
export interface ApiClientCreatedOut extends ApiClientOut {
  client_secret: string;
}

export interface ApiClientCreate {
  name: string;
  description?: string | null;
  expires_at?: string | null;
}

export interface ApiClientUpdate {
  name?: string;
  description?: string | null;
  expires_at?: string | null;
  is_active?: boolean;
}

const BASE = "/superadmin/api-clients";

// ── API functions ─────────────────────────────────────────────────────────────

export const clientCredsApi = {
  list(token: string): Promise<ApiClientOut[]> {
    return api.get<ApiClientOut[]>(BASE, { token });
  },

  create(body: ApiClientCreate, token: string): Promise<ApiClientCreatedOut> {
    return api.post<ApiClientCreatedOut>(BASE, body, { token });
  },

  update(
    id: string,
    body: ApiClientUpdate,
    token: string,
  ): Promise<ApiClientOut> {
    return api.patch<ApiClientOut>(`${BASE}/${id}`, body, { token });
  },

  revoke(id: string, token: string): Promise<ApiClientOut> {
    return api.patch<ApiClientOut>(`${BASE}/${id}/revoke`, {}, { token });
  },

  delete(id: string, token: string): Promise<void> {
    return api.delete<void>(`${BASE}/${id}`, { token });
  },

  requestRotateOtp(token: string): Promise<{ detail: string }> {
    return api.post<{ detail: string }>(`${BASE}/otp`, {}, { token });
  },

  rotate(id: string, otp: string, token: string): Promise<ApiClientCreatedOut> {
    return api.post<ApiClientCreatedOut>(
      `${BASE}/${id}/rotate`,
      { otp },
      { token },
    );
  },
};
