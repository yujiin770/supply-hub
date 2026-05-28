import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../auth";
import { SupplierStatusBadge } from "../../components/badge";
import { adminApi } from "../../features/api_clients/admin_api";
import type { SupplierResponse } from "../../features/api_clients/superadmin_api";
import AppLayout from "../../layouts/app_layout";
import { toast } from "../../lib/toast";

const PAGE_SIZE = 20;

export default function PendingSuppliersPage() {
  const token = useAuthStore((s) => s.accessToken)!;
  const navigate = useNavigate();

  const [items, setItems] = useState<SupplierResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [draftQ, setDraftQ] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listPending(
        { skip, limit: PAGE_SIZE, q: q || undefined },
        token,
      );
      setItems(res.items);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load suppliers.");
    } finally {
      setLoading(false);
    }
  }, [skip, q, token]);

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Pending Review</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {total} supplier{total !== 1 ? "s" : ""} awaiting review
        </p>
      </div>

      <div className="flex gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <input
            type="text"
            placeholder="Search by name, email, code…"
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            className="bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
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
              className="text-sm text-slate-500 hover:text-slate-700 px-2"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-sm">
              No suppliers pending review.
            </p>
            <p className="text-slate-300 text-xs mt-1">
              New signups will appear here.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-4 py-3 font-medium text-slate-600">Code</th>
                <th className="px-4 py-3 font-medium text-slate-600">
                  Legal Name
                </th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden md:table-cell">
                  Email
                </th>
                <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">
                  Submitted
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/admin/suppliers/${s.id}`)}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50
                             cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-slate-700">
                    {s.supplier_code}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {s.legal_name}
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                    {s.email}
                  </td>
                  <td className="px-4 py-3">
                    <SupplierStatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                    {fmt(s.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
          <span>
            Page {currentPage} of {pages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={skip === 0}
              onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled={skip + PAGE_SIZE >= total}
              onClick={() => setSkip(skip + PAGE_SIZE)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
