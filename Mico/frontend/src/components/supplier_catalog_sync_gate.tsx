/**
 * SupplierCatalogSyncGate
 *
 * Wraps any supplier page that needs up-to-date pack metadata.
 * On first mount (or when the cooldown has expired):
 *  1. Calls POST /suppliers/me/packs-cache/sync
 *  2. Shows a full-screen blocking overlay while the sync runs
 *  3. Saves the timestamp in localStorage so the next page load within
 *     30 minutes is instant (skips the sync)
 *
 * Non-supplier roles are passed straight through without any sync.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "../auth/auth_store";
import { packsCacheApi } from "../features/api_clients/packs_cache_api";
import { getAxiosErrorMessage } from "../lib/axios_client";

// ── Constants ─────────────────────────────────────────────────────────────────

const SYNC_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const SUPPLIER_ROLES = new Set(["SUPPLIER_OWNER", "SUPPLIER_STAFF"]);

function localStorageKey(supplierId: string): string {
  return `packsCacheLastSync:${supplierId}`;
}

function isCooldownActive(supplierId: string): boolean {
  try {
    const raw = localStorage.getItem(localStorageKey(supplierId));
    if (!raw) return false;
    return Date.now() - parseInt(raw, 10) < SYNC_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markSyncComplete(supplierId: string): void {
  try {
    localStorage.setItem(localStorageKey(supplierId), Date.now().toString());
  } catch {
    // localStorage unavailable — silently ignore
  }
}

// ── Internal state machine ─────────────────────────────────────────────────────

type SyncState = "checking" | "syncing" | "done" | "error";

// ── Sub-components ────────────────────────────────────────────────────────────

function SyncOverlay() {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Syncing your catalog"
      style={{ pointerEvents: "all" }}
      className="fixed inset-0 z-9999 flex flex-col items-center justify-center
                 bg-white/90 backdrop-blur-sm"
    >
      {/* Spinner */}
      <svg
        className="mb-5 h-12 w-12 animate-spin text-emerald-600"
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

function SyncErrorPanel({
  message,
  onRetry,
  onContinue,
}: {
  message: string;
  onRetry: () => void;
  onContinue: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Catalog sync failed"
      className="fixed inset-0 z-9999 flex items-center justify-center
                 bg-white/90 backdrop-blur-sm"
    >
      <div
        className="mx-4 w-full max-w-md rounded-2xl border border-red-200
                      bg-white p-8 shadow-xl text-center"
      >
        {/* Icon */}
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center
                        rounded-full bg-red-50"
        >
          <svg
            className="h-7 w-7 text-red-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0
                 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>

        <h2 className="mb-2 text-lg font-semibold text-slate-800">
          Catalog sync failed
        </h2>
        <p className="mb-6 text-sm text-slate-500 wrap-break-word">{message}</p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onRetry}
            className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm
                       font-semibold text-white hover:bg-emerald-700
                       focus:outline-none focus:ring-2 focus:ring-emerald-500
                       focus:ring-offset-2 transition-colors"
          >
            Retry Sync
          </button>
          <button
            onClick={onContinue}
            className="w-full rounded-xl border border-slate-300 bg-white px-4
                       py-2.5 text-sm font-medium text-slate-600
                       hover:bg-slate-50 focus:outline-none focus:ring-2
                       focus:ring-slate-400 focus:ring-offset-2 transition-colors"
          >
            Continue without sync
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main gate component ───────────────────────────────────────────────────────

interface Props {
  children: React.ReactNode;
}

export default function SupplierCatalogSyncGate({ children }: Props) {
  const user = useAuthStore((s) => s.user);
  const [syncState, setSyncState] = useState<SyncState>("checking");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Guard against running sync twice if component re-renders quickly
  const syncRunning = useRef(false);

  const isSupplier = Boolean(user && SUPPLIER_ROLES.has(user.role));

  const runSync = useCallback(async () => {
    if (syncRunning.current) return;
    syncRunning.current = true;

    setSyncState("syncing");
    // Block body scroll while syncing
    document.body.style.overflow = "hidden";

    try {
      await packsCacheApi.sync();
      if (user?.supplier_id) {
        markSyncComplete(user.supplier_id);
      }
      setSyncState("done");
    } catch (err) {
      const msg =
        getAxiosErrorMessage(err as Error) || "An unexpected error occurred.";
      setErrorMessage(msg);
      setSyncState("error");
    } finally {
      document.body.style.overflow = "";
      syncRunning.current = false;
    }
  }, [user?.supplier_id]);

  useEffect(() => {
    // Non-supplier roles skip sync entirely
    if (!isSupplier || !user) {
      setSyncState("done");
      return;
    }

    // Respect the cooldown — skip if synced recently
    if (user.supplier_id && isCooldownActive(user.supplier_id)) {
      setSyncState("done");
      return;
    }

    runSync();
  }, [isSupplier, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleContinue = () => setSyncState("done");

  // "checking" → invisible until we know whether to sync (sub-frame)
  if (syncState === "checking") {
    return null;
  }

  return (
    <>
      {/* Children always render so the page hydrates behind the overlay */}
      {syncState === "done" && children}

      {/* Full-screen blocking overlay — pointer-events block the app root */}
      {syncState === "syncing" && (
        <>
          {/* Children mount invisibly while sync runs so data loading starts */}
          <div
            aria-hidden="true"
            style={{ visibility: "hidden", pointerEvents: "none" }}
          >
            {children}
          </div>
          <SyncOverlay />
        </>
      )}

      {syncState === "error" && (
        <>
          <div
            aria-hidden="true"
            style={{ visibility: "hidden", pointerEvents: "none" }}
          >
            {children}
          </div>
          <SyncErrorPanel
            message={errorMessage}
            onRetry={runSync}
            onContinue={handleContinue}
          />
        </>
      )}
    </>
  );
}
