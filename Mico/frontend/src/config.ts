/**
 * API base URL.
 * - Development: Vite proxies /api → http://localhost:8000 (see vite.config.ts)
 * - Production:  set VITE_API_BASE_URL to your App Service URL, e.g.
 *                https://supplyhub-api.azurewebsites.net/api/v1
 */
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "/api/v1",
} as const;
