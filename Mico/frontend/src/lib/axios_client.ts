/**
 * Axios instance configured for the SupplyHub API.
 * - Base URL: /api/v1
 * - Automatically attaches Bearer token from Zustand auth store
 * - Intercepts 401 → clears auth and redirects to /login
 */
import axios, { type AxiosError } from "axios";
import { config } from "../config";
import { useAuthStore } from "../auth/auth_store";

export const axiosClient = axios.create({
  baseURL: config.apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor — inject auth token if present
axiosClient.interceptors.request.use((reqConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }
  return reqConfig;
});

// Response interceptor — handle 401 globally
axiosClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // During impersonation a 401 is a supplier-scope error, not a session
      // expiry — don't wipe the auth state; let the caller handle the error.
      if (!useAuthStore.getState().impersonation) {
        useAuthStore.getState().clearAuth();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

/** Extract a user-friendly message from an Axios error. */
export function getAxiosErrorMessage(
  error: unknown,
  fallback = "An error occurred.",
): string {
  if (!axios.isAxiosError(error)) return fallback;
  const detail = (error.response?.data as Record<string, unknown>)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as Record<string, unknown>;
    return String(first?.msg ?? fallback);
  }
  return error.message || fallback;
}
