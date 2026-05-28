import { api } from "../lib/api";
import type {
  MfaRequiredResponse,
  TokenResponse,
  UserInfo,
} from "./auth_types";

export const authService = {
  /** Step 1 — validate credentials, send OTP, get mfa_token. */
  login(email: string, password: string): Promise<MfaRequiredResponse> {
    return api.post<MfaRequiredResponse>("/auth/login", { email, password });
  },

  /** Step 2 — exchange mfa_token + OTP for full token pair. */
  verifyOtp(mfa_token: string, otp: string): Promise<TokenResponse> {
    return api.post<TokenResponse>("/auth/verify-otp", { mfa_token, otp });
  },
  /** Exchange a refresh token for a new access + refresh token pair. */
  refresh(refresh_token: string): Promise<TokenResponse> {
    return api.post<TokenResponse>("/auth/refresh", { refresh_token });
  },
  /** Fetch authenticated user profile. */
  me(accessToken: string): Promise<UserInfo> {
    return api.get<UserInfo>("/auth/me", { token: accessToken });
  },
  /** Request a password-reset email. Always resolves (no email enumeration). */
  forgotPassword(email: string): Promise<void> {
    return api.post<void>("/auth/forgot-password", { email });
  },
  /** Reset password using the raw token from the reset link. */
  resetPassword(token: string, newPassword: string): Promise<void> {
    return api.post<void>("/auth/reset-password", {
      token,
      new_password: newPassword,
    });
  },
};
