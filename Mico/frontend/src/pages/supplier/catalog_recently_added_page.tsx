import { useState } from "react";
import SupplierLayout from "../../layouts/supplier_layout";
import {
  useMyRecentListings,
  type RecentListingOut,
} from "../../features/api_clients/listing_api";

const PAGE_SIZE = 50;
const DAY_OPTIONS = [7, 14, 30, 90] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function stockBadge(stock_qty: number | null) {
  if (stock_qty === null)
    return <span className="text-xs text-slate-400">∞</span>;
  if (stock_qty === 0)
    return (
      <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
        Out
      </span>
    );
  if (stock_qty < 10)
    return (
      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
        {stock_qty}
      </span>
    );
  return (
    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
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
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <SupplierLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Recently Added Items
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Items you recently added to your catalog.
            </p>
          </div>

          {/* Days filter */}
          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => handleDaysChange(d)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  d === days
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {d === 7 ? "Last 7 days" : d === 90 ? "Last 90 days" : `${d}d`}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        {data && (
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-800">{data.total}</span>{" "}
            {data.total === 1 ? "item" : "items"} added in the last{" "}
            <span className="font-medium">{days}</span> {"days"}
          </p>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto relative">
          {isFetching && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
              <span className="text-sm text-slate-500">Loading…</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-16 text-center text-sm text-slate-400">
              Loading…
            </div>
          ) : !data?.items.length ? (
            <div className="py-16 text-center">
              <p className="text-slate-500 text-sm font-medium">
                You haven&apos;t added any items in the last {days} days.
              </p>
              <p className="text-slate-400 text-xs mt-1">
                Try extending the look-back window above.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Product / Strength
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Form / Route
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Base Price
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Added At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {data.items.map((item: RecentListingOut) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {item.brand_name ??
                          item.inn_name ??
                          item.org_name ??
                          "Unknown Product"}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {item.strength_summary ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{item.dosage_form_name ?? "—"}</div>
                      {item.route_name && (
                        <div className="text-xs text-slate-400">
                          {item.route_name}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.base_price != null
                        ? `₱${Number(item.base_price).toLocaleString("en-PH", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4,
                          })}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">{stockBadge(item.stock_qty)}</td>
                    <td className="px-4 py-3">
                      {item.is_enabled ? (
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {fmtDateTime(item.added_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Page {currentPage} of {totalPages} · {data?.total} total
            </p>
            <div className="flex gap-2">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-40 hover:bg-slate-50"
              >
                Previous
              </button>
              <button
                disabled={offset + PAGE_SIZE >= (data?.total ?? 0)}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-40 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </SupplierLayout>
  );
}
