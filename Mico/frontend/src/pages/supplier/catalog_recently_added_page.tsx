import { useState } from "react";
import SupplierLayout from "../../layouts/supplier_layout";
import {
  useMyRecentListings,
  type RecentListingOut,
} from "../../features/api_clients/listing_api";
import {
  Clock,
  Calendar,
  ChevronRight,
  MoreHorizontal,
  Eye,
} from "lucide-react";

const PAGE_SIZE = 50;
const DAY_OPTIONS = [7, 14, 30, 90] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stockBadge(stock_qty: number | null) {
  if (stock_qty === null)
    return <span className="text-xl font-medium text-gray-300">∞</span>;
  if (stock_qty === 0)
    return (
      <span className="text-xs font-bold uppercase px-3 py-1 rounded-lg border bg-rose-50 text-rose-700 border-rose-100">
        Out
      </span>
    );
  if (stock_qty < 10)
    return (
      <span className="text-xs font-bold uppercase px-3 py-1 rounded-lg border bg-[#fffbeb] text-[#d97706] border-[#fef3c7]">
        {stock_qty}
      </span>
    );
  return (
    <span className="text-sm font-bold text-[#00925d]">
      {stock_qty}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CatalogRecentlyAddedPage() {
  const [days, setDays] = useState<(typeof DAY_OPTIONS)[number]>(7);
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isFetching } = useMyRecentListings({
    days,
    limit: PAGE_SIZE,
    offset,
  });

  function handleDaysChange(d: (typeof DAY_OPTIONS)[number]) {
    setDays(d);
    setOffset(0);
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const items = data?.items ?? [];

  return (
    <SupplierLayout>
      <div className="pb-20 max-w-8xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-3">
              <Clock className="w-4 h-4" />
              Inventory Audit
            </div>
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
              Recently Added Items
            </h1>
            <p className="text-gray-500 font-medium mt-2">
              Items you recently added to your catalog.
            </p>
          </div>

          {/* Days filter */}
          <div className="bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-1 shrink-0">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => handleDaysChange(d)}
                className={`
                  px-5 py-2 text-xs font-bold rounded-xl transition-all duration-200 border-none outline-none cursor-pointer
                  ${d === days
                    ? "bg-[#004797] text-white shadow-md shadow-blue-500/20"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-50 bg-transparent"}
                `}
              >
                {d === 7 ? "Last 7 days" : d === 90 ? "Last 90 days" : `${d}d`}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        {data && (
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
            <span className="text-sm font-bold text-gray-900">
              {data.total} {data.total === 1 ? "item" : "items"}{" "}
              <span className="text-gray-400 font-medium">added in the last {days} days</span>
            </span>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col relative">
          {isFetching && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
              <div className="w-8 h-8 border-4 border-blue-50 border-t-[#004797] rounded-full animate-spin"></div>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
              <div className="w-10 h-10 border-4 border-gray-100 border-t-[#004797] rounded-full animate-spin"></div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Syncing Audit...
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 space-y-2 text-gray-400">
              <Clock className="w-12 h-12 stroke-1" />
              <p className="text-sm font-semibold text-gray-600">
                You haven&apos;t added any items in the last {days} days.
              </p>
              <p className="text-xs text-gray-400">
                Try extending the look-back window above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-250">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-50">
                    <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Product / Strength
                    </th>
                    <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Form / Route
                    </th>
                    <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Base Price
                    </th>
                    <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Stock
                    </th>
                    <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Status
                    </th>
                    <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Added At
                    </th>
                    <th className="px-8 py-5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item: RecentListingOut) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/30 transition-colors group cursor-pointer"
                    >
                      <td className="px-8 py-5">
                        <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {item.brand_name ??
                            item.inn_name ??
                            item.org_name ??
                            "Unknown Product"}
                        </div>
                        <div className="text-[11px] text-gray-400 font-bold uppercase mt-1">
                          {item.strength_summary ?? "—"}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="text-sm font-bold text-gray-700">
                          {item.dosage_form_name ?? "—"}
                        </div>
                        <div className="text-[11px] text-gray-300 font-medium mt-1">
                          {item.route_name ?? "—"}
                        </div>
                      </td>
                      <td className="px-8 py-5 font-medium text-gray-900 text-[13px]">
                        {item.base_price != null
                          ? `₱${Number(item.base_price).toLocaleString("en-PH", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 4,
                            })}`
                          : "—"}
                      </td>
                      <td className="px-8 py-5">
                        {stockBadge(item.stock_qty)}
                      </td>
                      <td className="px-8 py-5">
                        <span
                          className={`
                            px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border
                            ${
                              item.is_enabled
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : "bg-gray-50 text-gray-400 border-gray-100"
                            }
                          `}
                        >
                          {item.is_enabled ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          {fmtDateTime(item.added_at)}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all bg-transparent border-none outline-none cursor-pointer">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all bg-transparent border-none outline-none cursor-pointer">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="px-8 py-5 bg-gray-50/30 border-t border-gray-50 flex items-center justify-between">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Showing <span className="text-gray-900">{items.length}</span> of{" "}
                {data?.total} total records
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  className="p-2 rounded-lg border border-gray-200 bg-white text-gray-400 disabled:opacity-50 hover:bg-gray-50 cursor-pointer transition-all outline-none"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
                <button
                  disabled={offset + PAGE_SIZE >= (data?.total ?? 0)}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-50 hover:bg-gray-50 cursor-pointer transition-all outline-none"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SupplierLayout>
  );
}