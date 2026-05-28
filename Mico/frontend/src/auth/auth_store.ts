import { create } from "zustand";
import { authService } from "./auth_service";
import type { ImpersonationState, UserInfo } from "./auth_types";

const STORAGE_KEY = "supplyhub_rt";
const IMPERSONATION_KEY = "supplyhub_impersonation";

interface AuthState {
  accessToken: string | null;
  user: UserInfo | null;
  mfaToken: string | null;
  isHydrated: boolean;
  impersonation: ImpersonationState | null;

  login: (email: string, password: string) => Promise<string>;
  verifyOtp: (otp: string) => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  restoreSession: () => Promise<void>;
  enterImpersonation: (
    token: string,
    user: UserInfo,
    supplierName: string,
  ) => void;
  exitImpersonation: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  mfaToken: null,
  isHydrated: false,
  impersonation: null,

  async login(email, password) {
    const { mfa_token } = await authService.login(email, password);
    set({ mfaToken: mfa_token });
    return mfa_token;
  },

  async verifyOtp(otp) {
    const { mfaToken } = get();
    if (!mfaToken) throw new Error("No MFA token — restart login.");

    const tokens = await authService.verifyOtp(mfaToken, otp);
    get().setTokens(tokens.access_token, tokens.refresh_token);

    const user = await authService.me(tokens.access_token);
    set({ user, mfaToken: null });
  },

  setTokens(accessToken, refreshToken) {
    localStorage.setItem(STORAGE_KEY, refreshToken);
    set({ accessToken });
  },

  clearAuth() {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(IMPERSONATION_KEY);
    set({ accessToken: null, user: null, mfaToken: null, impersonation: null });
  },

  async restoreSession() {
    const refreshToken = localStorage.getItem(STORAGE_KEY);
    if (!refreshToken) {
      set({ isHydrated: true });
      return;
    }
    try {
      const tokens = await authService.refresh(refreshToken);
      // Persist the rotated token pair
      localStorage.setItem(STORAGE_KEY, tokens.refresh_token);
      const user = await authService.me(tokens.access_token);
      // Restore base SUPERADMIN session first
      set({
        accessToken: tokens.access_token,
        user,
        isHydrated: true,
        impersonation: null,
      });

      // If we were in impersonation mode before the refresh, re-apply it
      const saved = sessionStorage.getItem(IMPERSONATION_KEY);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          set({
            accessToken: data.impersonationToken,
            user: data.impersonatedUser,
            impersonation: {
              originalToken: tokens.access_token,
              originalUser: user,
              supplierName: data.supplierName,
            },
          });
        } catch {
          sessionStorage.removeItem(IMPERSONATION_KEY);
        }
      }
    } catch {
      // Refresh token expired or invalid — clear everything
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(IMPERSONATION_KEY);
      set({
        accessToken: null,
        user: null,
        isHydrated: true,
        impersonation: null,
      });
    }
  },

  enterImpersonation(token, user, supplierName) {
    const { accessToken, user: currentUser } = get();
    if (!accessToken || !currentUser) return;
    // Persist to sessionStorage so page refresh restores impersonation
    sessionStorage.setItem(
      IMPERSONATION_KEY,
      JSON.stringify({
        impersonationToken: token,
        impersonatedUser: user,
        supplierName,
      }),
    );
    set({
      impersonation: {
        originalToken: accessToken,
        originalUser: currentUser,
        supplierName,
      },
      accessToken: token,
      user,
    });
  },

  exitImpersonation() {
    const { impersonation } = get();
    if (!impersonation) return;
    sessionStorage.removeItem(IMPERSONATION_KEY);
    set({
      accessToken: impersonation.originalToken,
      user: impersonation.originalUser,
      impersonation: null,
    });
  },
}));

export const getAccessToken = (): string | null =>
  useAuthStore.getState().accessToken;
