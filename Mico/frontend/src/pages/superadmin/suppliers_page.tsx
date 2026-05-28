import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../auth";
import type { UserInfo } from "../../auth/auth_types";
import { SupplierStatusBadge } from "../../components/badge";
import {
  superadminApi,
  type SupplierResponse,
  type SupplierStatus,
} from "../../features/api_clients/superadmin_api";
import AppLayout from "../../layouts/app_layout";
import { toast } from "../../lib/toast";

const STATUSES: { value: string; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_KYC", label: "Pending KYC" },
  { value: "PENDING_APPROVAL", label: "Pending Approval" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SUSPENDED", label: "Suspended" },
];

const PAGE_SIZE = 20;

export default function SuperAdminSuppliersPage() {
  const token = useAuthStore((s) => s.accessToken)!;
  const navigate = useNavigate();

  const [items, setItems] = useState<SupplierResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [q, setQ] = useState("");
  const [draftQ, setDraftQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<SupplierStatus | "">("");
  const [loading, setLoading] = useState(false);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  const enterImpersonation = useAuthStore((s) => s.enterImpersonation);

  async function handleImpersonate(
    e: React.MouseEvent,
    supplier: SupplierResponse,
  ) {
    e.stopPropagation();
    setImpersonatingId(supplier.id);
    try {
      const res = await superadminApi.impersonate(supplier.id, token);
      const impersonatedUser: UserInfo = {
        id: res.owner.id,
        email: res.owner.email,
        full_name: res.owner.full_name,
        role: res.owner.role as UserInfo["role"],
        supplier_id: res.owner.supplier_id ?? null,
        is_active: res.owner.is_active,
        created_at: res.owner.created_at,
        updated_at: res.owner.updated_at,
      };
      enterImpersonation(res.access_token, impersonatedUser, res.supplier_name);
      // Defer navigation one tick so Zustand state is committed before
      // React Router renders the destination route's RequireRole guard.
      setTimeout(() => navigate("/dashboard"), 0);
    } catch {
      toast.error("Failed to enter supplier view.");
    } finally {
      setImpersonatingId(null);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await superadminApi.list(
        {
          skip,
          limit: PAGE_SIZE,
          q: q || undefined,
          status: statusFilter || undefined,
        },
        token,
      );
      setItems(res.items);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load suppliers.");
    } finally {
      setLoading(false);
    }
  }, [skip, q, statusFilter, token]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSkip(0);
    setQ(draftQ);
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(skip / PAGE_SIZE) + 1;

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <AppLayout>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
            <p className="text-sm text-slate-500">
              {total > 0
                ? `${total} supplier${total !== 1 ? "s" : ""} total`
                : "No suppliers yet"}
            </p>
          </div>
        </div>
        <Link
          to="/superadmin/suppliers/new"
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700
                     text-white text-sm font-medium px-4 py-2.5 rounded-lg
                     transition-colors shadow-sm"
        >
          <span className="text-base leading-none">+</span>
          Add Supplier
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search by name, email, code…"
                value={draftQ}
                onChange={(e) => setDraftQ(e.target.value)}
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              Search
            </button>
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setDraftQ("");
                  setSkip(0);
                }}
                className="text-sm text-slate-500 hover:text-red-600 transition-colors px-2"
              >
                ✕ Clear
              </button>
            )}
          </form>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as SupplierStatus | "");
              setSkip(0);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white min-w-40"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <svg
              className="w-8 h-8 animate-spin text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
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
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span className="text-sm">Loading suppliers…</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <svg
              className="w-12 h-12 text-slate-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <p className="text-sm font-medium">No suppliers found.</p>
            <p className="text-xs">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
                  Code
                </th>
                <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
                  Legal Name
                </th>
                <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide hidden md:table-cell">
                  Trade Name
                </th>
                <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide hidden lg:table-cell">
                  Created
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/superadmin/suppliers/${s.id}`)}
                  className="border-b border-slate-100 last:border-0 hover:bg-emerald-50/40
                             cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-500 bg-slate-50 group-hover:bg-emerald-50/40">
                    {s.supplier_code}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-slate-900">
                    {s.legal_name}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 hidden md:table-cell">
                    {s.trade_name ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <SupplierStatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 hidden lg:table-cell text-xs">
                    {fmt(s.created_at)}
                  </td>
                  <td
                    className="px-4 py-3.5 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => handleImpersonate(e, s)}
                      disabled={impersonatingId === s.id}
                      className="text-xs font-medium text-emerald-700 bg-emerald-50
                                 border border-emerald-200 px-3 py-1.5 rounded-lg
                                 hover:bg-emerald-100 transition-colors
                                 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {impersonatingId === s.id ? (
                        <span className="flex items-center gap-1.5">
                          <svg
                            className="w-3 h-3 animate-spin"
                            fill="none"
                            viewBox="0 0 24 24"
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
                              d="M4 12a8 8 0 018-8v8H4z"
                            />
                          </svg>
                          Entering…
                        </span>
                      ) : (
                        "Go to Supplier →"
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
          <span className="text-slate-500">
            Page{" "}
            <span className="font-semibold text-slate-800">{currentPage}</span>{" "}
            of <span className="font-semibold text-slate-800">{pages}</span>
          </span>
          <div className="flex gap-2">
            <button
              disabled={skip === 0}
              onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300
                         hover:bg-slate-50 text-sm font-medium transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              disabled={skip + PAGE_SIZE >= total}
              onClick={() => setSkip(skip + PAGE_SIZE)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300
                         hover:bg-slate-50 text-sm font-medium transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
