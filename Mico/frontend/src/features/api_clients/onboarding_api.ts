import { api } from "../../lib/api";

export interface SignupRequest {
  legal_name: string;
  trade_name?: string;
  business_email: string;
  business_mobile?: string;
  address_line1: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  owner_full_name: string;
  owner_email: string;
  owner_password: string;
}

export interface SignupResponse {
  message: string;
  supplier_id: string;
  supplier_code: string;
}

export const onboardingApi = {
  signup(body: SignupRequest): Promise<SignupResponse> {
    return api.post<SignupResponse>("/onboarding/signup", body);
  },
};
