/**
 * CatalogSyncingPage
 *
 * Full-screen loading screen shown right after OTP verification for suppliers.
 * Fires the catalog sync, then redirects to the supplier dashboard.
 * Non-suppliers who land here accidentally are bounced to their home.
 */
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../auth";
import { packsCacheApi } from "../features/api_clients/packs_cache_api";
import { getRoleHome } from "../auth/auth_types";

const SUPPLIER_ROLES = new Set(["SUPPLIER_OWNER"]);

export default function CatalogSyncingPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function run() {
      const currentUser = useAuthStore.getState().user;

      // If no user or not a supplier, bounce to their home (safety net)
      if (!currentUser || !SUPPLIER_ROLES.has(currentUser.role)) {
        navigate(currentUser ? getRoleHome(currentUser.role) : "/login", {
          replace: true,
        });
        return;
      }

      try {
        await packsCacheApi.sync();
      } catch {
        // Non-fatal — proceed to dashboard regardless
      }

      navigate(getRoleHome(currentUser.role), { replace: true });
    }

    run();
  }, [navigate]);

  // Suppress lint warning — user is only read on mount via the ref path
  void user;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white">
      <svg
        className="mb-5 h-14 w-14 animate-spin text-emerald-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      <p className="text-lg font-semibold text-slate-800">
        Syncing your catalog…
      </p>
      <p className="mt-1 text-sm text-slate-500">Please wait.</p>
    </div>
  );
}
