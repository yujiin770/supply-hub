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
import {
  Search,
  RotateCw,
  Plus,
  X,
  CheckCircle2,
  PackageSearch,
  ArrowRight,
} from "lucide-react";

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
    <div className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-6">
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div className="bg-white w-full max-w-2xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-gray-50 flex items-center justify-between shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-gray-900 leading-snug">
              {pack?.brand_name ?? `Pack ${listing.pack_id.slice(0, 8)}…`}
            </h2>
            {pack?.org_name && (
              <p className="text-xs font-bold text-gray-400 uppercase mt-0.5">
                {pack.org_name}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors outline-none border-none bg-transparent cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-10 custom-scrollbar">
          {/* Product details section */}
          {pack && (
            <div className="space-y-10">
              {pack.description && (
                <p className="text-sm text-gray-500 font-medium italic">
                  {pack.description}
                </p>
              )}

              {/* Key facts grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
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
                    <div key={label} className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase block">
                        {label}
                      </label>
                      {label === "Status" ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                          {value}
                        </div>
                      ) : (
                        <p
                          className={`text-sm font-bold text-gray-800 ${mono ? "font-mono text-xs text-gray-500" : ""}`}
                        >
                          {value}
                        </p>
                      )}
                    </div>
                  ))}
              </div>

              {/* Ingredients table */}
              {pack.ingredients.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-3 bg-blue-500 rounded-full"></div>
                    Active Ingredients
                  </h3>
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-2 bg-gray-50 px-4 py-2 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase">
                      <span>Inn Name</span>
                      <span>Strength</span>
                    </div>
                    <div className="divide-y divide-gray-50">
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
                            <div
                              key={ing.substance_id ?? idx}
                              className="grid grid-cols-2 px-4 py-3 text-sm font-bold text-gray-800 capitalize"
                            >
                              <span>{ing.inn_name ?? "—"}</span>
                              <span className="text-gray-500 font-medium">
                                {valStr
                                  ? `${valStr}${unit ? " " + unit : ""}`
                                  : "—"}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pricing form */}
          <form
            onSubmit={handleSubmit}
            id="edit-listing-form"
            className="space-y-6"
          >
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-3 bg-emerald-500 rounded-full"></div>
              Listing Terms
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 block">
                  Base Price (PHP)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="e.g. 125.00"
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 block">
                  MOQ (units)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={moq}
                  onChange={(e) => setMoq(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 block">
                  Lead Time (days)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={leadTime}
                  onChange={(e) => setLeadTime(e.target.value)}
                  placeholder="e.g. 3"
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 flex justify-between">
                <span>Stock Qty</span>
                <span className="text-[10px] text-gray-400 font-medium lowercase italic">
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
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
          </form>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-5 sm:px-8 sm:py-6 bg-gray-50/50 border-t border-gray-50 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 text-sm font-bold text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-none outline-none"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-listing-form"
            disabled={update.isPending}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg cursor-pointer border-none outline-none disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {update.isPending ? "Saving…" : "Save Changes"}
          </button>
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

      <div className="pb-20 max-w-387.5 mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
              My Catalog
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-1">
              <span className="text-[#004797] font-bold">
                {total} product{total !== 1 ? "s" : ""}
              </span>{" "}
              listed for sale
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCw
                className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">
                {syncing ? "Syncing…" : "Sync catalog"}
              </span>
            </button>
            <button
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#00925d] text-white text-sm font-bold rounded-xl hover:bg-[#007a4e] transition-all shadow-lg shadow-emerald-600/20 active:scale-95 cursor-pointer border-none outline-none"
            >
              <Plus className="w-4 h-4" />
              Browse catalog
            </button>
          </div>
        </div>

        {/* Sync feedback banner */}
        {syncMsg && (
          <div
            className={`rounded-2xl px-5 py-3 text-sm flex items-center justify-between gap-4 border ${
              syncMsg.type === "success"
                ? "bg-[#eaf7f2] border-[#c4e9db] text-[#00925d]"
                : "bg-rose-50 border-rose-100 text-rose-700"
            }`}
          >
            <span className="font-bold">{syncMsg.text}</span>
            <button
              onClick={() => setSyncMsg(null)}
              className="text-base leading-none opacity-60 hover:opacity-100 bg-transparent border-none cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Search bar + status filter — always visible */}
        <div className="flex flex-col lg:flex-row items-center gap-4 mb-6">
          <div className="relative flex-1 w-full text-gray-400 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 group-focus-within:text-[#004797] transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by brand, active ingredient, form, route, barcode…"
              className="w-full pl-11 pr-10 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-gray-700 bg-transparent border-none outline-none cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center bg-white p-1 rounded-xl border border-gray-100 shadow-sm w-full lg:w-auto">
            {(
              [
                { label: "Active", value: true as boolean | undefined },
                { label: "Inactive", value: false as boolean | undefined },
                { label: "All", value: undefined as boolean | undefined },
              ] as { label: string; value: boolean | undefined }[]
            ).map(({ label, value }) => (
              <button
                key={label}
                onClick={() => {
                  setStatusFilter(value);
                  setOffset(0);
                }}
                className={`flex-1 lg:flex-none px-6 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all border-none outline-none ${
                  statusFilter === value
                    ? "bg-[#004797] text-white shadow-md"
                    : "text-gray-400 hover:text-gray-600 bg-transparent"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

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
          <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl p-4 text-sm font-bold">
            Failed to load listings.
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col p-20 justify-center items-center">
            <div className="w-8 h-8 border-4 border-blue-50 border-t-[#004797] rounded-full animate-spin"></div>
          </div>
        )}

        {/* Empty state — only when not searching and catalog is genuinely empty */}
        {!isLoading && !isSearching && data?.items.length === 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-4xl flex items-center justify-center mb-6 border border-gray-100">
                <PackageSearch className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                No listings yet
              </h3>
              <p className="text-sm text-gray-500 font-medium mt-2 max-w-xs">
                Browse the catalog to add your first product. Your items will
                appear here.
              </p>
              <button
                onClick={() => setShowPicker(true)}
                className="mt-8 flex items-center gap-2 px-6 py-3 bg-[#004797] text-white rounded-xl font-bold text-sm cursor-pointer hover:bg-black transition-all border-none outline-none"
              >
                Browse Catalog <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Flat listings table — server handles filtering when a query is active */}
        {!isLoading && (data?.items.length ?? 0) > 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-175">
                <thead className="bg-gray-50/50 border-b border-gray-50">
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
                        className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
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
                        className="hover:bg-gray-50/30 transition-colors group cursor-pointer"
                        onClick={() => setEditListing(listing)}
                      >
                        <td className="px-6 py-5">
                          <p className="text-sm font-medium text-gray-900 leading-tight">
                            {pack?.brand_name ??
                              `Pack …${listing.pack_id.slice(-8)}`}
                          </p>
                          {pack?.org_name && (
                            <p className="text-[11px] text-gray-400 font-extralight uppercase mt-0.5">
                              {pack.org_name}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          {strength && strength !== "—" && (
                            <p className="text-[13px] font-medium text-gray-700">
                              {strength}
                            </p>
                          )}
                          {formRoute && (
                            <p className="text-[11px] text-gray-300 font-medium mt-0.5">
                              {formRoute}
                            </p>
                          )}
                          {!strength && !formRoute && (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-5 font-medium text-gray-900 text-[13px]">
                          {listing.base_price != null ? (
                            `₱ ${parseFloat(listing.base_price).toFixed(2)}`
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-[13px] font-medium text-gray-700">
                          {listing.moq != null ? (
                            parseFloat(listing.moq).toLocaleString()
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-[13px] font-medium text-gray-700">
                          {listing.lead_time_days != null ? (
                            `${listing.lead_time_days}d`
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-xl font-medium text-gray-400">
                          {listing.stock_qty === null ? (
                            "∞"
                          ) : listing.stock_qty === 0 ? (
                            <span className="text-xs font-semibold text-rose-500">
                              Out
                            </span>
                          ) : listing.stock_qty <= 10 ? (
                            <span className="text-xs font-semibold text-amber-600">
                              {listing.stock_qty} ⚠️
                            </span>
                          ) : (
                            <span className="text-sm text-emerald-700 font-medium">
                              {listing.stock_qty.toLocaleString()}
                            </span>
                          )}
                        </td>
                        <td
                          className="px-6 py-5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {listing.is_enabled ? (
                            <button
                              onClick={() => setDisableTarget(listing)}
                              disabled={disable.isPending}
                              className="px-3 py-1 bg-[#eaf7f2] text-[#00925d] rounded-full border border-[#c4e9db] text-[10px] font-bold uppercase inline-flex items-center gap-1.5 cursor-pointer outline-none border-none transition-all disabled:opacity-50"
                            >
                              <div className="w-1 h-1 rounded-full bg-[#00925d]"></div>
                              Active
                            </button>
                          ) : (
                            <button
                              onClick={() => enable.mutate(listing.id)}
                              disabled={enable.isPending}
                              className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full border border-gray-200 text-[10px] font-bold uppercase inline-flex items-center gap-1.5 cursor-pointer outline-none border-none transition-all disabled:opacity-50"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                              Inactive
                            </button>
                          )}
                        </td>
                        <td
                          className="px-6 py-5 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => setEditListing(listing)}
                            className="px-4 py-1.5 bg-white text-gray-600 text-xs font-bold rounded-lg border border-gray-200 hover:bg-gray-50 transition-all cursor-pointer shadow-sm outline-none"
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
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Showing{" "}
              <span className="text-gray-900">
                {offset + 1}–{Math.min(offset + PAGE_SIZE, total)}
              </span>{" "}
              of <span className="text-gray-900">{total}</span> listings
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-white text-[10px] font-bold transition-all disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              >
                PREV
              </button>
              <span className="text-xs text-slate-500 font-semibold">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= total}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-white text-[10px] font-bold transition-all disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              >
                NEXT
              </button>
            </div>
          </div>
        )}
      </div>
    </SupplierLayout>
  );
}
