import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../auth";
import type { UserInfo } from "../../auth/auth_types";
import {
  superadminApi,
  type SupplierResponse,
  type SupplierStatus,
} from "../../features/api_clients/superadmin_api";
import AppLayout from "../../layouts/app_layout";
import { toast } from "../../lib/toast";
import {
  Building2,
  Plus,
  Search,
  ArrowRight,
  ChevronDown,
  Filter,
} from "lucide-react";

const STATUSES: { value: string; label: string }[] = [
  { value: "", label: "All Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_KYC", label: "Pending KYC" },
  { value: "PENDING_APPROVAL", label: "Pending Approval" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SUSPENDED", label: "Suspended" },
];

const PAGE_SIZE = 20;

const StatusBadge = ({ status }: { status: SupplierStatus }) => {
  const styles: Record<string, string> = {
    APPROVED: "bg-[#eaf7f2] text-[#00925d] border-[#c4e9db]",
    PENDING_KYC: "bg-[#fffbeb] text-[#d97706] border-[#fef3c7]",
    PENDING_APPROVAL: "bg-[#f0f9ff] text-[#0284c7] border-[#e0f2fe]",
    DRAFT: "bg-gray-50 text-gray-500 border-gray-200",
    REJECTED: "bg-rose-50 text-rose-600 border-rose-100",
    SUSPENDED: "bg-rose-50 text-rose-700 border-rose-100",
  };

  const labels: Record<string, string> = {
    APPROVED: "Approved",
    PENDING_KYC: "Pending KYC",
    PENDING_APPROVAL: "Pending Approval",
    DRAFT: "Draft",
    REJECTED: "Rejected",
    SUSPENDED: "Suspended",
  };

  return (
    <span
      className={`px-3 py-1 rounded-lg text-[10px] font-bold border tracking-wider uppercase inline-block ${styles[status] || "bg-gray-50 text-gray-500 border-gray-200"}`}
    >
      {labels[status] || status}
    </span>
  );
};

export default function SuperAdminSuppliersPage() {
  const token = useAuthStore((s) => s.accessToken)!;
  const navigate = useNavigate();

  const [items, setItems] = useState<SupplierResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [q, setQ] = useState("");
  const [draftQ, setDraftQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<SupplierStatus | "">("");
  const [loading, setLoading] = useState(true);
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

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <AppLayout>
      <div className="max-w-350 mx-auto pt-4 sm:pt-6 pb-20">
        {/* ── HERO SECTION ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 sm:mb-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 shrink-0">
              <Building2 className="w-7 h-7 text-[#00925d]" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-[#002244] tracking-tight">
                Suppliers
              </h1>
              <p className="text-sm font-bold text-[#00925d] mt-0.5">
                {total} Partners{" "}
                <span className="text-gray-400 font-medium">Total</span>
              </p>
            </div>
          </div>
          <Link
            to="/superadmin/suppliers/new"
            className="w-full sm:w-auto bg-[#00925d] hover:bg-[#007a4e] text-white px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/10 active:scale-[0.98] cursor-pointer text-sm"
          >
            <Plus className="w-5 h-5 animate-pulse" />
            Add Supplier
          </Link>
        </div>

        {/* ── SEARCH & FILTERS ── */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Integrated Search Box */}
          <form
            onSubmit={handleSearch}
            className="flex-1 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm flex items-center min-w-0"
          >
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, code..."
                value={draftQ}
                onChange={(e) => setDraftQ(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-transparent border-none text-sm font-bold text-gray-700 placeholder:text-gray-400 outline-none"
              />
            </div>
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setDraftQ("");
                  setSkip(0);
                }}
                className="text-xs font-bold text-slate-400 hover:text-red-600 transition-colors px-3 mr-1"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="bg-[#111827] text-white px-5 sm:px-8 py-3 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Filter Dropdown */}
          <div className="w-full lg:w-72 bg-white px-4 py-1 rounded-2xl border border-gray-100 shadow-sm relative flex items-center shrink-0 h-14.5">
            <Filter className="w-4 h-4 text-gray-400 mr-3" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as SupplierStatus | "");
                setSkip(0);
              }}
              className="flex-1 appearance-none bg-transparent py-4 pr-6 border-none text-sm font-bold text-gray-700 cursor-pointer outline-none"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-4 pointer-events-none" />
          </div>
        </div>

        {/* ── CONTENT CONTAINER ── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
              <div className="w-10 h-10 border-4 border-gray-100 border-t-[#00925d] rounded-full animate-spin" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Syncing Partners...
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 space-y-4 text-slate-400">
              <Building2 className="w-12 h-12 text-slate-300 shrink-0" />
              <p className="text-sm font-bold text-[#002244]">
                No suppliers found.
              </p>
              <p className="text-xs">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-50">
                      <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        ID Code
                      </th>
                      <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Legal Name
                      </th>
                      <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Trade Name
                      </th>
                      <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">
                        Status
                      </th>
                      <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Created
                      </th>
                      <th className="px-8 py-5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50/30 transition-colors group cursor-pointer"
                        onClick={() =>
                          navigate(`/superadmin/suppliers/${item.id}`)
                        }
                      >
                        <td className="px-8 py-6 font-mono font-bold text-xs text-gray-400 bg-gray-50/10 group-hover:bg-transparent">
                          {item.supplier_code}
                        </td>
                        <td className="px-8 py-6 font-bold text-sm text-[#002244] group-hover:text-[#004797] transition-colors">
                          {item.legal_name}
                        </td>
                        <td className="px-8 py-6 font-bold text-sm text-gray-400 italic">
                          {item.trade_name || "—"}
                        </td>
                        <td className="px-8 py-6 text-center">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-8 py-6 font-bold text-xs text-gray-400">
                          {fmt(item.created_at)}
                        </td>
                        <td
                          className="px-8 py-6 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => handleImpersonate(e, item)}
                            disabled={impersonatingId === item.id}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#eaf7f2] text-[#00925d] text-xs font-bold rounded-xl hover:bg-[#00925d] hover:text-white transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {impersonatingId === item.id ? (
                              <span className="flex items-center gap-1.5">
                                <div className="w-3.5 h-3.5 border-2 border-[#00925d] border-t-transparent rounded-full animate-spin group-hover:border-white group-hover:border-t-transparent shrink-0" />
                                Entering…
                              </span>
                            ) : (
                              <>
                                Go to Supplier{" "}
                                <ArrowRight className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="lg:hidden divide-y divide-gray-50">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-6 space-y-5 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => navigate(`/superadmin/suppliers/${item.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">
                          {item.supplier_code}
                        </p>
                        <h3 className="text-lg font-semibold text-[#002244] leading-tight group-hover:text-[#004797]">
                          {item.legal_name}
                        </h3>
                        <p className="text-xs text-gray-400 font-bold italic mt-1">
                          {item.trade_name || "No trade name"}
                        </p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <div
                      className="flex items-center justify-between pt-4 border-t border-gray-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        JOINED {fmt(item.created_at)}
                      </div>
                      <button
                        onClick={(e) => handleImpersonate(e, item)}
                        disabled={impersonatingId === item.id}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#00925d] hover:bg-[#007a4e] text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {impersonatingId === item.id
                          ? "Entering…"
                          : "Go to Supplier"}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Pagination Inside Card Frame */}
              <div className="px-8 py-5 bg-gray-50/40 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Showing{" "}
                  <span className="text-gray-950 font-bold">
                    {items.length}
                  </span>{" "}
                  of <span className="text-gray-950 font-bold">{total}</span>{" "}
                  total results
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={skip === 0}
                    onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-400 text-[10px] font-bold hover:bg-white hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    PREV
                  </button>
                  <button
                    disabled={skip + PAGE_SIZE >= total}
                    onClick={() => setSkip(skip + PAGE_SIZE)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-400 text-[10px] font-bold hover:bg-white hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    NEXT
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
