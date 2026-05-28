import { useEffect, useRef, useState } from "react";
import SupplierLayout from "../../layouts/supplier_layout";
import {
  strengthSummary,
  usePharmaLakeCatalog,
  type PharmaLakePack,
} from "../../features/api_clients/pharmalake_api";
import {
  useCreateListing,
  useMyPackIds,
} from "../../features/api_clients/listing_api";

const PAGE_SIZE = 50;

// ── Helpers ───────────────────────────────────────────────────────────────────

function packSizeLabel(pack: PharmaLakePack): string {
  if (!pack.pack_qty_value) return "—";
  const unit = pack.pack_qty_unit_code ?? pack.pack_qty_unit_name ?? "";
  return `${pack.pack_qty_value}${unit ? " " + unit : ""}`;
}

// ── Add to My Catalog modal ───────────────────────────────────────────────────

function AddListingModal({
  pack,
  onClose,
}: {
  pack: PharmaLakePack;
  onClose: () => void;
}) {
  const [basePrice, setBasePrice] = useState("");
  const [moq, setMoq] = useState("");
  const [leadTime, setLeadTime] = useState("");
  const create = useCreateListing();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      {
        pack_id: pack.pack_id,
        base_price: basePrice ? parseFloat(basePrice) : null,
        moq: moq ? parseFloat(moq) : null,
        lead_time_days: leadTime ? parseInt(leadTime, 10) : null,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Add to My Catalog</h2>
          <p className="text-sm text-slate-500 mt-0.5 truncate">
            {pack.brand_name ?? pack.pack_id}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
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
          <p className="text-xs text-slate-400">
            All fields are optional and can be updated later.
          </p>
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
              disabled={create.isPending}
              className="text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50
                         text-white font-medium rounded-xl px-4 py-2 transition-colors"
            >
              {create.isPending ? "Adding…" : "Add to Catalog"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Detail modal ──────────────────────────────────────────────────────────────

function DetailModal({
  pack,
  onClose,
}: {
  pack: PharmaLakePack;
  onClose: () => void;
}) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-900 text-lg leading-snug">
              {pack.brand_name ?? "—"}
            </h2>
            {pack.org_name && (
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

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {/* Summary grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <Field label="Pack ID" value={pack.pack_id} mono />
            <Field label="SKU" value={pack.sku} mono />
            <Field label="Barcode" value={pack.barcode} mono />
            <Field label="Pack size" value={packSizeLabel(pack)} />
            <Field label="Dosage form" value={pack.dosage_form_name} />
            <Field label="Route" value={pack.route_name} />
            <Field
              label="Status"
              value={pack.is_active ? "Active" : "Inactive"}
            />
          </div>

          {/* Ingredients table */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Active Ingredients
            </p>
            {pack.ingredients.length === 0 ? (
              <p className="text-sm text-slate-400">
                No ingredient data available.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      INN Name
                    </th>
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Strength
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pack.ingredients.map((ing, idx) => (
                    <tr
                      key={ing.ingredient_id ?? idx}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="py-2 pr-4 text-slate-800">
                        {ing.inn_name ?? "—"}
                      </td>
                      <td className="py-2 text-slate-600">
                        {ing.strength_value
                          ? `${ing.strength_value}${ing.strength_unit_code ? " " + ing.strength_unit_code : ""}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="text-sm text-slate-600 hover:text-slate-900 border border-slate-300 hover:border-slate-400
                       rounded-lg px-4 py-2 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={`text-slate-800 ${mono ? "font-mono text-xs" : ""}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CatalogPickerPage() {
  const [inputValue, setInputValue] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [detailPack, setDetailPack] = useState<PharmaLakePack | null>(null);
  const [addPack, setAddPack] = useState<PharmaLakePack | null>(null);

  // Debounce search — reset to page 0 when query changes.
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearch(value: string) {
    setInputValue(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQ(value.trim());
      setOffset(0);
    }, 400);
  }

  // Reset page when query changes externally (e.g. cleared).
  useEffect(() => {
    setOffset(0);
  }, [debouncedQ]);

  const { data, isLoading, isError, error } = usePharmaLakeCatalog({
    q: debouncedQ || undefined,
    limit: PAGE_SIZE,
    offset,
  });

  const { data: myPackIds } = useMyPackIds();

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <SupplierLayout>
      {detailPack && (
        <DetailModal pack={detailPack} onClose={() => setDetailPack(null)} />
      )}
      {addPack && (
        <AddListingModal pack={addPack} onClose={() => setAddPack(null)} />
      )}

      <div className="space-y-5">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Catalog Picker</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Browse the PharmaLake master catalog and add products to your
              listings.
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative max-w-md">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search brand, INN, barcode, SKU…"
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm
                       focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                       bg-white placeholder-slate-400"
          />
          {inputValue && (
            <button
              onClick={() => {
                setInputValue("");
                setDebouncedQ("");
                setOffset(0);
              }}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status area */}
        {isError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {(error as Error)?.message ??
              "Failed to load catalog. Check PharmaLake configuration."}
          </div>
        )}

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {[
                    "Brand Name",
                    "Strength",
                    "Pack Size",
                    "Dosage Form",
                    "Route",
                    "Barcode",
                    "SKU",
                    "MAH",
                    "",
                    "",
                  ].map((h, i) => (
                    <th
                      key={`${h}-${i}`}
                      className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {isLoading &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 10 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3 bg-slate-100 rounded w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))}

                {!isLoading && data?.items.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-12 text-center text-slate-400 text-sm"
                    >
                      {debouncedQ
                        ? `No items found for "${debouncedQ}".`
                        : "No catalog items available."}
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  data?.items.map((pack) => (
                    <tr
                      key={pack.pack_id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900 max-w-[200px]">
                        <span className="truncate block">
                          {pack.brand_name ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-[220px]">
                        <span className="truncate block">
                          {strengthSummary(pack.ingredients)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {packSizeLabel(pack)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {pack.dosage_form_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {pack.route_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {pack.barcode ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {pack.sku ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[150px]">
                        <span className="truncate block">
                          {pack.org_name ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDetailPack(pack)}
                          className="text-xs text-emerald-700 hover:text-emerald-900 font-medium
                                     border border-emerald-200 hover:border-emerald-400 rounded-lg
                                     px-3 py-1.5 transition-colors whitespace-nowrap"
                        >
                          View details
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {myPackIds?.includes(pack.pack_id) ? (
                          <span
                            className="text-xs font-medium bg-emerald-50 text-emerald-700
                                          border border-emerald-200 rounded-lg px-3 py-1.5 whitespace-nowrap"
                          >
                            ✓ Added
                          </span>
                        ) : (
                          <button
                            onClick={() => setAddPack(pack)}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium
                                       rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
                          >
                            + Add
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          {!isLoading && total > 0 && (
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-medium text-slate-700">
                  {offset + 1}–{Math.min(offset + PAGE_SIZE, total)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-slate-700">
                  {total.toLocaleString()}
                </span>{" "}
                items
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  disabled={offset === 0}
                  className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 text-slate-600
                             hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed
                             transition-colors"
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
                             hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed
                             transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SupplierLayout>
  );
}
