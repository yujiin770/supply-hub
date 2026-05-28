import { useState, useEffect } from "react";
import SupplierLayout from "../../layouts/supplier_layout";
import {
  useMyListings,
  useDisableListing,
  useEnableListing,
  useUpdateListing,
  type ListingResponse,
  type ListingUpdate,
} from "../../features/api_clients/listing_api";
import { packsCacheApi } from "../../features/api_clients/packs_cache_api";
import {
  batchStrengthSummary,
  type BatchPack,
} from "../../features/api_clients/pharmalake_api";
import ConfirmModal from "../../components/confirm_modal";
import CatalogPickerModal from "../../components/catalog_picker_modal";

const PAGE_SIZE = 50;

// ── Edit modal ────────────────────────────────────────────────────────────────

function EditListingModal({
  listing,
  pack,
  onClose,
}: {
  listing: ListingResponse;
  pack?: BatchPack;
  onClose: () => void;
}) {
  const update = useUpdateListing(listing.id);

  const [basePrice, setBasePrice] = useState(listing.base_price ?? "");
  const [moq, setMoq] = useState(listing.moq ?? "");
  const [leadTime, setLeadTime] = useState(
    listing.lead_time_days?.toString() ?? "",
  );
  const [stockQty, setStockQty] = useState(listing.stock_qty?.toString() ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: ListingUpdate = {
      base_price: basePrice !== "" ? parseFloat(String(basePrice)) : null,
      moq: moq !== "" ? parseFloat(String(moq)) : null,
      lead_time_days: leadTime !== "" ? parseInt(String(leadTime), 10) : null,
      stock_qty: stockQty !== "" ? parseInt(String(stockQty), 10) : null,
    };
    update.mutate(data, { onSuccess: onClose });
  }

  const packSize = pack?.pack_qty_value
    ? `${parseFloat(pack.pack_qty_value)}${pack.pack_qty_unit_code ? " " + pack.pack_qty_unit_code : ""}`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4 shrink-0">
          <div>
            <h2 className="font-semibold text-slate-900 text-lg leading-snug">
              {pack?.brand_name ?? `Pack ${listing.pack_id.slice(0, 8)}…`}
            </h2>
            {pack?.org_name && (
              <p className="text-xs text-slate-500 mt-0.5">{pack.org_name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl font-bold shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Product details section */}
          {pack && (
            <div className="px-6 pt-5 pb-4 space-y-4 border-b border-slate-100">
              {pack.description && (
                <p className="text-sm text-slate-600 italic">
                  {pack.description}
                </p>
              )}

              {/* Key facts grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                {[
                  { label: "Dosage Form", value: pack.dosage_form_name },
                  { label: "Route", value: pack.route_name },
                  { label: "Pack Size", value: packSize },
                  { label: "Barcode", value: pack.barcode, mono: true },
                  { label: "SKU", value: pack.sku, mono: true },
                  {
                    label: "Status",
                    value: pack.is_active ? "Active" : "Inactive",
                  },
                ]
                  .filter((f) => f.value)
                  .map(({ label, value, mono }) => (
                    <div key={label}>
                      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                      <p
                        className={`text-slate-800 ${mono ? "font-mono text-xs" : ""}`}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
              </div>

              {/* Ingredients table */}
              {pack.ingredients.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Active Ingredients
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-1.5 pr-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          INN Name
                        </th>
                        <th className="text-left py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          Strength
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pack.ingredients
                        .filter((i) => i.role === "active" || !i.role)
                        .map((ing, idx) => {
                          const val = ing.strength?.numerator_value
                            ? parseFloat(ing.strength.numerator_value)
                            : null;
                          const valStr =
                            val != null
                              ? Number.isInteger(val)
                                ? String(val)
                                : val.toFixed(2)
                              : null;
                          const unit = ing.strength?.numerator_unit_code ?? "";
                          return (
                            <tr
                              key={ing.substance_id ?? idx}
                              className="border-b border-slate-50 last:border-0"
                            >
                              <td className="py-1.5 pr-4 text-slate-800 capitalize">
                                {ing.inn_name ?? "—"}
                              </td>
                              <td className="py-1.5 text-slate-600">
                                {valStr
                                  ? `${valStr}${unit ? " " + unit : ""}`
                                  : "—"}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Pricing form */}
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Listing Terms
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Base Price (PHP)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="e.g. 125.00"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  MOQ (units)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={moq}
                  onChange={(e) => setMoq(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Lead Time (days)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={leadTime}
                  onChange={(e) => setLeadTime(e.target.value)}
                  placeholder="e.g. 3"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Stock Qty{" "}
                <span className="text-slate-400 font-normal">
                  (leave blank = unlimited)
                </span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                placeholder="e.g. 500"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-slate-600 border border-slate-300 rounded-xl px-4 py-2 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={update.isPending}
                className="text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50
                           text-white font-medium rounded-xl px-4 py-2 transition-colors"
              >
                {update.isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MyCatalogPage() {
  const [offset, setOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [editListing, setEditListing] = useState<ListingResponse | null>(null);
  const [disableTarget, setDisableTarget] = useState<ListingResponse | null>(
    null,
  );
  const [showPicker, setShowPicker] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  // Filter: true = active only (default), false = inactive only, undefined = all
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(true);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const result = await packsCacheApi.sync();
      setSyncMsg({
        type: "success",
        text: `Catalog synced — ${result.upserted_count} updated, ${result.deactivated_count} deactivated.`,
      });
    } catch {
      setSyncMsg({ type: "error", text: "Sync failed. Please try again." });
    } finally {
      setSyncing(false);
    }
  }

  // Debounce the search input so we don't fire a request on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
      setOffset(0); // reset to page 1 when query changes
    }, 350);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const { data, isLoading, isError } = useMyListings({
    limit: PAGE_SIZE,
    offset,
    q: debouncedQuery || undefined,
    is_enabled: statusFilter,
  });
  const disable = useDisableListing();
  const enable = useEnableListing();

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const isSearching = debouncedQuery.length > 0;

  function handleDisableConfirm() {
    if (!disableTarget) return;
    disable.mutate(disableTarget.id, {
      onSuccess: () => setDisableTarget(null),
    });
  }

  return (
    <SupplierLayout>
      {showPicker && (
        <CatalogPickerModal onClose={() => setShowPicker(false)} />
      )}
      {editListing && (
        <EditListingModal
          listing={editListing}
          pack={editListing.pack ?? undefined}
          onClose={() => setEditListing(null)}
        />
      )}
      <ConfirmModal
        isOpen={!!disableTarget}
        title="Deactivate listing?"
        message="This listing will be hidden from buyers. You can re-activate it anytime from My Catalog."
        confirmLabel="Deactivate"
        danger
        onConfirm={handleDisableConfirm}
        onCancel={() => setDisableTarget(null)}
      />

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900">My Catalog</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {total > 0
                ? `${total} product${total !== 1 ? "s" : ""} listed for sale`
                : "Products you've listed for sale. Set pricing, MOQ, and lead times."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="text-sm border border-slate-300 text-slate-700 hover:border-slate-400
                         hover:bg-slate-50 font-medium rounded-xl px-4 py-2 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {syncing ? "Syncing…" : "Sync catalog"}
            </button>
            <button
              onClick={() => setShowPicker(true)}
              className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium
                         rounded-xl px-4 py-2 transition-colors"
            >
              + Browse catalog
            </button>
          </div>
        </div>

        {/* Sync feedback banner */}
        {syncMsg && (
          <div
            className={`rounded-xl px-4 py-2.5 text-sm flex items-center justify-between gap-4 ${
              syncMsg.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            <span>{syncMsg.text}</span>
            <button
              onClick={() => setSyncMsg(null)}
              className="text-base leading-none opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* Search bar + status filter — always visible */}
        {!isLoading && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search input */}
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
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
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by brand, active ingredient, form, route, barcode…"
                className="w-full border border-slate-300 rounded-xl pl-9 pr-10 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status filter toggle */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1 shrink-0">
              {(
                [
                  { label: "Active", value: true as boolean | undefined },
                  { label: "Inactive", value: false as boolean | undefined },
                  { label: "All", value: undefined as boolean | undefined },
                ] as { label: string; value: boolean | undefined }[]
              ).map(({ label, value }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setStatusFilter(value);
                    setOffset(0);
                  }}
                  className={`text-xs font-medium rounded-lg px-3 py-1.5 transition-colors ${
                    statusFilter === value
                      ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search result summary */}
        {isSearching && !isLoading && (
          <p className="text-xs text-slate-500 px-1">
            {total === 0
              ? "No products match your search."
              : `${total} result${total !== 1 ? "s" : ""} for "`}
            {total > 0 && (
              <>
                <span className="font-medium text-slate-700">
                  {debouncedQuery}
                </span>
                "
              </>
            )}
          </p>
        )}

        {isError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            Failed to load listings.
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-slate-100 rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state — only when not searching and catalog is genuinely empty */}
        {!isLoading && !isSearching && data?.items.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-16 text-center text-slate-400 text-sm">
            No listings yet.{" "}
            <button
              onClick={() => setShowPicker(true)}
              className="text-emerald-600 hover:underline"
            >
              Browse the catalog
            </button>{" "}
            to add your first product.
          </div>
        )}

        {/* Flat listings table — server handles filtering when a query is active */}
        {!isLoading && (data?.items.length ?? 0) > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {[
                      "Product",
                      "Strength / Form",
                      "Base Price",
                      "MOQ",
                      "Lead Time",
                      "Stock",
                      "Status",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.items ?? []).map((listing) => {
                    const pack = listing.pack ?? null;
                    const strength = pack
                      ? batchStrengthSummary(pack.ingredients)
                      : null;
                    const formRoute = pack
                      ? [pack.dosage_form_name, pack.route_name]
                          .filter(Boolean)
                          .join(" / ")
                      : null;
                    return (
                      <tr
                        key={listing.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900 text-sm leading-tight">
                            {pack?.brand_name ??
                              `Pack …${listing.pack_id.slice(-8)}`}
                          </p>
                          {pack?.org_name && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {pack.org_name}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {strength && strength !== "—" && (
                            <p className="text-xs font-mono text-slate-700">
                              {strength}
                            </p>
                          )}
                          {formRoute && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {formRoute}
                            </p>
                          )}
                          {!strength && !formRoute && (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {listing.base_price != null ? (
                            `₱ ${parseFloat(listing.base_price).toFixed(2)}`
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {listing.moq != null ? (
                            parseFloat(listing.moq).toLocaleString()
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {listing.lead_time_days != null ? (
                            `${listing.lead_time_days}d`
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {listing.stock_qty === null ? (
                            <span className="text-xs text-slate-400">∞</span>
                          ) : listing.stock_qty === 0 ? (
                            <span className="text-xs font-semibold text-red-500">
                              Out
                            </span>
                          ) : listing.stock_qty <= 10 ? (
                            <span className="text-xs font-semibold text-amber-600">
                              {listing.stock_qty} ⚠️
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-700 font-medium">
                              {listing.stock_qty.toLocaleString()}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {listing.is_enabled ? (
                            <button
                              onClick={() => setDisableTarget(listing)}
                              disabled={disable.isPending}
                              title="Click to deactivate"
                              className="text-xs font-medium rounded-full px-2.5 py-1
                                         bg-emerald-50 text-emerald-700 border border-emerald-200
                                         hover:bg-emerald-100 hover:border-emerald-400
                                         transition-colors cursor-pointer disabled:opacity-50"
                            >
                              ● Active
                            </button>
                          ) : (
                            <button
                              onClick={() => enable.mutate(listing.id)}
                              disabled={enable.isPending}
                              title="Click to activate"
                              className="text-xs font-medium rounded-full px-2.5 py-1
                                         bg-slate-100 text-slate-500 border border-slate-200
                                         hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300
                                         transition-colors cursor-pointer disabled:opacity-50"
                            >
                              ○ Inactive
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setEditListing(listing)}
                            className="text-xs text-slate-600 hover:text-slate-900 border border-slate-300
                                       hover:border-slate-400 rounded-lg px-3 py-1.5 transition-colors"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && total > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-4 flex-wrap pt-1">
            <p className="text-xs text-slate-500">
              Showing{" "}
              <span className="font-medium text-slate-700">
                {offset + 1}–{Math.min(offset + PAGE_SIZE, total)}
              </span>{" "}
              of <span className="font-medium text-slate-700">{total}</span>{" "}
              listings
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0}
                className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 text-slate-600
                           hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <span className="text-xs text-slate-500">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= total}
                className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 text-slate-600
                           hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </SupplierLayout>
  );
}
