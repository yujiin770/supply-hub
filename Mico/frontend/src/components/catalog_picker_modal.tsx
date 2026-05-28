/**
 * CatalogPickerModal — industry-standard full-screen catalog browser.
 *
 * Layout:
 *   ┌─ Header (search + sort) ──────────────────────────────────────────┐
 *   │ Left filter sidebar │ Scrollable results table                    │
 *   │  · Dosage Form      │  sticky thead, expandable detail rows       │
 *   │  · Route            │  slide-in Add panel                         │
 *   │  · Manufacturer     │                                             │
 *   └─ Footer (pagination + count) ─────────────────────────────────────┘
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  strengthSummary,
  useLiveCatalog,
  type PharmaLakePack,
} from "../features/api_clients/pharmalake_api";
import {
  listingApi,
  listingQueryKeys,
  useCreateListing,
  useMyPackIds,
} from "../features/api_clients/listing_api";
import { toast } from "../lib/toast";

const PAGE_SIZE = 50;

// ── Helpers ───────────────────────────────────────────────────────────────────

function packSizeLabel(pack: PharmaLakePack): string {
  if (!pack.pack_qty_value) return "—";
  const unit = pack.pack_qty_unit_code ?? pack.pack_qty_unit_name ?? "";
  return `${pack.pack_qty_value}${unit ? " " + unit : ""}`;
}

function highlight(
  text: string | null | undefined,
  query: string,
): React.ReactNode {
  if (!text) return <span className="text-slate-400">—</span>;
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

type SortKey = "brand_asc" | "brand_desc" | "mah_asc";
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "brand_asc", label: "Brand A-Z" },
  { value: "brand_desc", label: "Brand Z-A" },
  { value: "mah_asc", label: "Manufacturer A-Z" },
];

function applySort(items: PharmaLakePack[], sort: SortKey): PharmaLakePack[] {
  return [...items].sort((a, b) => {
    if (sort === "brand_asc")
      return (a.brand_name ?? "").localeCompare(b.brand_name ?? "", undefined, {
        sensitivity: "base",
      });
    if (sort === "brand_desc")
      return (b.brand_name ?? "").localeCompare(a.brand_name ?? "", undefined, {
        sensitivity: "base",
      });
    if (sort === "mah_asc")
      return (a.org_name ?? "").localeCompare(b.org_name ?? "", undefined, {
        sensitivity: "base",
      });
    return 0;
  });
}

// ── Slide-in Add Panel ────────────────────────────────────────────────────────

function AddPanel({
  pack,
  onClose,
}: {
  pack: PharmaLakePack;
  onClose: () => void;
}) {
  const [basePrice, setBasePrice] = useState("");
  const [moq, setMoq] = useState("");
  const [leadTime, setLeadTime] = useState("");
  const [stockQty, setStockQty] = useState("");
  const create = useCreateListing();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      {
        pack_id: pack.pack_id,
        base_price: basePrice ? parseFloat(basePrice) : null,
        moq: moq ? parseFloat(moq) : null,
        lead_time_days: leadTime ? parseInt(leadTime, 10) : null,
        stock_qty: stockQty ? parseInt(stockQty, 10) : null,
        pack_meta: {
          brand_name: pack.brand_name,
          barcode: pack.barcode,
          sku: pack.sku,
          org_id: pack.org_id,
          org_name: pack.org_name,
          dosage_form_name: pack.dosage_form_name,
          route_name: pack.route_name,
          pack_qty_value: pack.pack_qty_value,
          pack_qty_unit_code: pack.pack_qty_unit_code,
          pack_qty_unit_name: pack.pack_qty_unit_name,
          ingredients_json: pack.ingredients as object[],
        },
      },
      { onSuccess: onClose },
    );
  }

  const inputCls =
    "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white transition-colors";

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-0.5">
            Add to My Catalog
          </p>
          <h3 className="font-semibold text-slate-900 truncate">
            {pack.brand_name ?? pack.pack_id}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            {strengthSummary(pack.ingredients)}
            {pack.dosage_form_name ? ` · ${pack.dosage_form_name}` : ""}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
        >
          ✕
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex-1 overflow-y-auto px-5 py-5 space-y-4"
      >
        {[
          {
            label: "Base Price (PHP)",
            value: basePrice,
            set: setBasePrice,
            placeholder: "e.g. 125.00",
            step: "0.0001",
          },
          {
            label: "MOQ (units)",
            value: moq,
            set: setMoq,
            placeholder: "e.g. 10",
            step: "0.0001",
          },
          {
            label: "Lead Time (days)",
            value: leadTime,
            set: setLeadTime,
            placeholder: "e.g. 3",
            step: "1",
          },
          {
            label: "Stock Qty",
            value: stockQty,
            set: setStockQty,
            placeholder: "blank = unlimited",
            step: "1",
          },
        ].map(({ label, value, set, placeholder, step }) => (
          <div key={label}>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              {label}
            </label>
            <input
              type="number"
              step={step}
              min="0"
              value={value}
              onChange={(e) => set(e.target.value)}
              placeholder={placeholder}
              className={inputCls}
            />
          </div>
        ))}

        <p className="text-xs text-slate-400 pt-1">
          All fields are optional and can be updated later from My Catalog.
        </p>

        {create.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
            {create.error instanceof Error
              ? create.error.message
              : "Failed to add listing."}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 text-sm text-slate-600 border border-slate-300 rounded-lg py-2 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={create.isPending}
            className="flex-1 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg py-2 transition-colors"
          >
            {create.isPending ? "Adding…" : "Add to Catalog"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Filter sidebar ────────────────────────────────────────────────────────────

interface Filters {
  forms: Set<string>;
  routes: Set<string>;
  mahs: Set<string>;
  onlyNew: boolean;
}

function FilterSidebar({
  facets,
  filters,
  onChange,
  onReset,
}: {
  facets: { forms: string[]; routes: string[]; mahs: string[] };
  filters: Filters;
  onChange: (f: Filters) => void;
  onReset: () => void;
}) {
  const activeCount =
    filters.forms.size +
    filters.routes.size +
    filters.mahs.size +
    (filters.onlyNew ? 1 : 0);

  function toggle(field: "forms" | "routes" | "mahs", value: string) {
    const next = new Set(filters[field]);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange({ ...filters, [field]: next });
  }

  const labelCls =
    "text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block";
  const checkCls =
    "flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 cursor-pointer";
  const checkboxCls =
    "w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0 accent-emerald-600";

  return (
    <aside className="w-52 shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-slate-700">Filters</span>
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
          >
            Clear {activeCount}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Not-added toggle */}
        <label className={checkCls}>
          <input
            type="checkbox"
            checked={filters.onlyNew}
            onChange={() => onChange({ ...filters, onlyNew: !filters.onlyNew })}
            className={checkboxCls}
          />
          <span className="text-xs text-slate-700">Not in my catalog</span>
        </label>

        {facets.forms.length > 0 && (
          <div>
            <span className={labelCls}>Dosage Form</span>
            <div className="space-y-0.5">
              {facets.forms.map((f) => (
                <label key={f} className={checkCls}>
                  <input
                    type="checkbox"
                    checked={filters.forms.has(f)}
                    onChange={() => toggle("forms", f)}
                    className={checkboxCls}
                  />
                  <span className="text-xs text-slate-700 truncate">{f}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {facets.routes.length > 0 && (
          <div>
            <span className={labelCls}>Route</span>
            <div className="space-y-0.5">
              {facets.routes.map((r) => (
                <label key={r} className={checkCls}>
                  <input
                    type="checkbox"
                    checked={filters.routes.has(r)}
                    onChange={() => toggle("routes", r)}
                    className={checkboxCls}
                  />
                  <span className="text-xs text-slate-700 truncate">{r}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {facets.mahs.length > 0 && (
          <div>
            <span className={labelCls}>Manufacturer</span>
            <div className="space-y-0.5">
              {facets.mahs.map((m) => (
                <label key={m} className={checkCls} title={m}>
                  <input
                    type="checkbox"
                    checked={filters.mahs.has(m)}
                    onChange={() => toggle("mahs", m)}
                    className={checkboxCls}
                  />
                  <span className="text-xs text-slate-700 truncate">{m}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Expandable detail row ─────────────────────────────────────────────────────

function DetailRow({ pack }: { pack: PharmaLakePack }) {
  function resolveStrength(ing: PharmaLakePack["ingredients"][0]): string {
    if (ing.strength?.numerator_value) {
      const val = parseFloat(ing.strength.numerator_value);
      const valStr = Number.isInteger(val) ? String(val) : val.toFixed(2);
      const unit = ing.strength.numerator_unit_code ?? "";
      const denom = ing.strength.denominator_value
        ? `/${parseFloat(ing.strength.denominator_value)}${ing.strength.denominator_unit_code ? " " + ing.strength.denominator_unit_code : ""}`
        : "";
      return `${valStr}${unit ? " " + unit : ""}${denom}`;
    }
    if (ing.strength_value)
      return `${ing.strength_value}${ing.strength_unit_code ? " " + ing.strength_unit_code : ""}`;
    return "—";
  }

  const activeIngs = pack.ingredients.filter(
    (i) => i.role === "active" || !i.role,
  );

  return (
    <tr>
      <td
        colSpan={8}
        className="px-6 py-4 bg-slate-50 border-b border-slate-100"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-4">
          {[
            { label: "Pack ID", value: pack.pack_id, mono: true },
            { label: "SKU", value: pack.sku, mono: true },
            { label: "Barcode", value: pack.barcode, mono: true },
            { label: "Pack Size", value: packSizeLabel(pack) },
            { label: "Dosage Form", value: pack.dosage_form_name },
            { label: "Route", value: pack.route_name },
            { label: "Manufacturer", value: pack.org_name },
            {
              label: "Status",
              value: pack.is_active ? "Active" : "Inactive",
            },
          ].map(({ label, value, mono }) => (
            <div key={label}>
              <p className="text-slate-400 mb-0.5">{label}</p>
              <p
                className={`text-slate-800 font-medium ${mono ? "font-mono break-all" : ""}`}
              >
                {value ?? "—"}
              </p>
            </div>
          ))}
        </div>

        {activeIngs.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Active Ingredients
            </p>
            <div className="flex flex-wrap gap-2">
              {activeIngs.map((ing, idx) => (
                <span
                  key={ing.substance_id ?? ing.ingredient_id ?? idx}
                  className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-700"
                >
                  <span className="font-medium capitalize">
                    {ing.inn_name ?? "—"}
                  </span>
                  <span className="text-slate-400">{resolveStrength(ing)}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {pack.description && (
          <p className="text-xs text-slate-500 italic mt-3">
            {pack.description}
          </p>
        )}
      </td>
    </tr>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

const EMPTY_FILTERS: Filters = {
  forms: new Set(),
  routes: new Set(),
  mahs: new Set(),
  onlyNew: false,
};

export default function CatalogPickerModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [clientPage, setClientPage] = useState(1);
  const [sort, setSort] = useState<SortKey>("brand_asc");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addPack, setAddPack] = useState<PharmaLakePack | null>(null);
  const [bulkState, setBulkState] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (addPack) {
          setAddPack(null);
          return;
        }
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, addPack]);

  function handleSearch(value: string) {
    setInputValue(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQ(value.trim());
      setOffset(0);
      setClientPage(1);
    }, 350);
  }

  // Compute filter state early so we can adjust the API fetch accordingly.
  // When any sidebar filter is active we fetch a large batch and paginate
  // entirely client-side so filters work across ALL pages, not just the
  // current server page.
  const activeFilterCount =
    filters.forms.size +
    filters.routes.size +
    filters.mahs.size +
    (filters.onlyNew ? 1 : 0);
  const filterMode = activeFilterCount > 0;

  const { data, isLoading, isError } = useLiveCatalog({
    q: debouncedQ || undefined,
    limit: filterMode ? 2000 : PAGE_SIZE,
    offset: filterMode ? 0 : offset,
  });

  const { data: myPackIds } = useMyPackIds();
  const myPackSet = useMemo(() => new Set(myPackIds ?? []), [myPackIds]);

  // Derive facets from current page
  const facets = useMemo(() => {
    const items = data?.items ?? [];
    const forms = [
      ...new Set(
        items.map((i) => i.dosage_form_name).filter(Boolean) as string[],
      ),
    ].sort();
    const routes = [
      ...new Set(items.map((i) => i.route_name).filter(Boolean) as string[]),
    ].sort();
    const mahs = [
      ...new Set(items.map((i) => i.org_name).filter(Boolean) as string[]),
    ].sort();
    return { forms, routes, mahs };
  }, [data]);

  // Apply client-side filters + sort across the full fetched batch
  const filteredItems = useMemo(() => {
    let items = data?.items ?? [];
    if (filters.forms.size)
      items = items.filter(
        (i) => i.dosage_form_name && filters.forms.has(i.dosage_form_name),
      );
    if (filters.routes.size)
      items = items.filter(
        (i) => i.route_name && filters.routes.has(i.route_name),
      );
    if (filters.mahs.size)
      items = items.filter((i) => i.org_name && filters.mahs.has(i.org_name));
    if (filters.onlyNew) items = items.filter((i) => !myPackSet.has(i.pack_id));
    return applySort(items, sort);
  }, [data, filters, sort, myPackSet]);

  // In filter mode: paginate the filtered list client-side.
  // In normal mode: server already paginates; just display the page.
  const total = filterMode ? filteredItems.length : (data?.total ?? 0);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = filterMode
    ? clientPage
    : Math.floor(offset / PAGE_SIZE) + 1;
  const visibleItems = filterMode
    ? filteredItems.slice((clientPage - 1) * PAGE_SIZE, clientPage * PAGE_SIZE)
    : filteredItems;

  // Items on the current view that are NOT yet in the supplier's catalog
  const newVisibleItems = useMemo(
    () => visibleItems.filter((p) => !myPackSet.has(p.pack_id)),
    [visibleItems, myPackSet],
  );

  async function handleAddAllVisible() {
    if (newVisibleItems.length === 0 || bulkState) return;
    setBulkState({ done: 0, total: newVisibleItems.length });
    let done = 0;
    for (const pack of newVisibleItems) {
      try {
        await listingApi.create({
          pack_id: pack.pack_id,
          pack_meta: {
            brand_name: pack.brand_name,
            barcode: pack.barcode,
            sku: pack.sku,
            org_id: pack.org_id,
            org_name: pack.org_name,
            dosage_form_name: pack.dosage_form_name,
            route_name: pack.route_name,
            pack_qty_value: pack.pack_qty_value,
            pack_qty_unit_code: pack.pack_qty_unit_code,
            pack_qty_unit_name: pack.pack_qty_unit_name,
            ingredients_json: pack.ingredients as object[],
          },
        });
        done++;
      } catch {
        // skip already-added or errored items silently
      }
      setBulkState({ done, total: newVisibleItems.length });
    }
    await qc.invalidateQueries({ queryKey: ["myListings"] });
    await qc.invalidateQueries({ queryKey: listingQueryKeys.myPackIds });
    await qc.invalidateQueries({ queryKey: ["myRecentListings"] });
    toast.success(
      `Added ${done} product${done !== 1 ? "s" : ""} to your catalog.`,
    );
    setBulkState(null);
  }

  const thCls =
    "px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* ── Top header ───────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-slate-200 flex items-center gap-3 px-4 pr-14 shrink-0 bg-white z-20 relative">
        <span className="text-sm font-bold text-slate-800 shrink-0">
          Browse Catalog
        </span>

        {/* Search */}
        <div className="flex-1 relative max-w-xl">
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
            autoFocus
            type="text"
            value={inputValue}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search brand name, INN, barcode, SKU"
            className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                       bg-slate-50 focus:bg-white placeholder-slate-400 transition-colors"
          />
          {inputValue && (
            <button
              onClick={() => {
                setInputValue("");
                setDebouncedQ("");
                setOffset(0);
                setClientPage(1);
              }}
              className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-600
                     focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50
                     hover:border-slate-300 transition-colors shrink-0"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Close — fixed top-right */}
        <button
          onClick={onClose}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Close"
        >
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Filter sidebar */}
        <FilterSidebar
          facets={facets}
          filters={filters}
          onChange={(f) => {
            setFilters(f);
            setClientPage(1);
            setOffset(0);
          }}
          onReset={() => {
            setFilters(EMPTY_FILTERS);
            setClientPage(1);
          }}
        />

        {/* Results area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sub-header: result count + active filter chips + bulk add */}
          <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 shrink-0 flex-wrap bg-white min-h-[40px]">
            <span className="text-xs text-slate-500">
              {isLoading ? (
                <span className="inline-block w-24 h-3 bg-slate-200 rounded animate-pulse" />
              ) : (
                <>
                  <span className="font-semibold text-slate-800">
                    {visibleItems.length.toLocaleString()}
                  </span>
                  {activeFilterCount > 0 && <span> filtered</span>}
                  <span className="text-slate-400">
                    {" "}
                    / {total.toLocaleString()} on page
                  </span>
                </>
              )}
            </span>

            {[...filters.forms].map((f) => (
              <button
                key={f}
                onClick={() => {
                  const s = new Set(filters.forms);
                  s.delete(f);
                  setFilters({ ...filters, forms: s });
                }}
                className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200
                           rounded-full px-2 py-0.5 text-xs hover:bg-emerald-100 transition-colors"
              >
                {f} ✕
              </button>
            ))}
            {[...filters.routes].map((r) => (
              <button
                key={r}
                onClick={() => {
                  const s = new Set(filters.routes);
                  s.delete(r);
                  setFilters({ ...filters, routes: s });
                }}
                className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200
                           rounded-full px-2 py-0.5 text-xs hover:bg-blue-100 transition-colors"
              >
                {r} ✕
              </button>
            ))}
            {[...filters.mahs].map((m) => (
              <button
                key={m}
                onClick={() => {
                  const s = new Set(filters.mahs);
                  s.delete(m);
                  setFilters({ ...filters, mahs: s });
                }}
                className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200
                           rounded-full px-2 py-0.5 text-xs hover:bg-purple-100 transition-colors"
              >
                {m} ✕
              </button>
            ))}
            {filters.onlyNew && (
              <button
                onClick={() => setFilters({ ...filters, onlyNew: false })}
                className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200
                           rounded-full px-2 py-0.5 text-xs hover:bg-amber-100 transition-colors"
              >
                Not added ✕
              </button>
            )}

            {/* Bulk add — pushed to right */}
            {!isLoading && newVisibleItems.length > 0 && (
              <div className="ml-auto shrink-0">
                {bulkState ? (
                  <span className="inline-flex items-center gap-2 text-xs text-emerald-700 font-medium">
                    <svg
                      className="w-3.5 h-3.5 animate-spin"
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
                    Adding {bulkState.done} / {bulkState.total}…
                  </span>
                ) : (
                  <button
                    onClick={handleAddAllVisible}
                    className="inline-flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700
                               text-white font-medium rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
                  >
                    + Add all visible ({newVisibleItems.length})
                  </button>
                )}
              </div>
            )}
          </div>

          {isError && (
            <div className="mx-4 mt-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm shrink-0">
              Failed to load catalog. Please try again.
            </div>
          )}

          {/* Scrollable table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className={thCls}>Brand Name</th>
                  <th className={thCls}>Strength / INN</th>
                  <th className={thCls}>Form</th>
                  <th className={thCls}>Pack Size</th>
                  <th className={thCls}>Manufacturer</th>
                  <th className={thCls}>Barcode</th>
                  <th className={`${thCls} w-8`}></th>
                  <th className={`${thCls} w-24`}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading &&
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-3 py-3">
                          <div className="h-3 bg-slate-100 rounded w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))}

                {!isLoading && visibleItems.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <svg
                          className="w-8 h-8"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <p className="text-sm font-medium text-slate-500">
                          No results found
                        </p>
                        <p className="text-xs">
                          {debouncedQ
                            ? "Try a different search term or clear filters."
                            : activeFilterCount
                              ? "No items match the selected filters."
                              : "No catalog items available."}
                        </p>
                        {(debouncedQ || activeFilterCount > 0) && (
                          <button
                            onClick={() => {
                              setInputValue("");
                              setDebouncedQ("");
                              setFilters(EMPTY_FILTERS);
                              setOffset(0);
                              setClientPage(1);
                            }}
                            className="mt-1 text-xs text-emerald-600 hover:text-emerald-800 font-medium underline"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  visibleItems.map((pack) => {
                    const isAdded = myPackSet.has(pack.pack_id);
                    const isExpanded = expandedId === pack.pack_id;
                    return (
                      <>
                        <tr
                          key={pack.pack_id}
                          className={`transition-colors cursor-pointer ${
                            isExpanded
                              ? "bg-emerald-50/40"
                              : "hover:bg-slate-50"
                          }`}
                          onClick={() =>
                            setExpandedId(isExpanded ? null : pack.pack_id)
                          }
                        >
                          <td className="px-3 py-2.5 max-w-[200px]">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {highlight(pack.brand_name, debouncedQ)}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 max-w-[220px]">
                            <span className="truncate block text-xs text-slate-600">
                              {highlight(
                                strengthSummary(pack.ingredients),
                                debouncedQ,
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                            {pack.dosage_form_name ?? "—"}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                            {packSizeLabel(pack)}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[160px]">
                            <span className="truncate block">
                              {highlight(pack.org_name, debouncedQ)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs text-slate-400">
                            {pack.barcode ?? "—"}
                          </td>
                          {/* Expand chevron */}
                          <td className="px-2 py-2.5 text-slate-400">
                            <svg
                              className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180 text-emerald-600" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </td>
                          {/* Add button */}
                          <td
                            className="px-3 py-2.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isAdded ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-1 whitespace-nowrap">
                                <svg
                                  className="w-3 h-3"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                Added
                              </span>
                            ) : (
                              <button
                                onClick={() => setAddPack(pack)}
                                className="inline-flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700
                                           text-white font-medium rounded-full px-3 py-1 transition-colors whitespace-nowrap"
                              >
                                + Add
                              </button>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <DetailRow
                            key={`${pack.pack_id}-detail`}
                            pack={pack}
                          />
                        )}
                      </>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Footer pagination */}
          {!isLoading && total > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap shrink-0 bg-white">
              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {offset + 1} -{Math.min(offset + PAGE_SIZE, total)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">
                  {total.toLocaleString()}
                </span>{" "}
                items
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (filterMode) setClientPage((p) => Math.max(1, p - 1));
                    else setOffset(Math.max(0, offset - PAGE_SIZE));
                    setExpandedId(null);
                  }}
                  disabled={currentPage <= 1}
                  className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600
                             hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: Math.min(totalPages, 7) }).map(
                    (_, i) => {
                      const page = i + 1;
                      const isActive = page === currentPage;
                      return (
                        <button
                          key={page}
                          onClick={() => {
                            if (filterMode) setClientPage(page);
                            else setOffset((page - 1) * PAGE_SIZE);
                            setExpandedId(null);
                          }}
                          className={`text-xs w-7 h-7 rounded-lg transition-colors ${
                            isActive
                              ? "bg-emerald-600 text-white font-semibold"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    },
                  )}
                  {totalPages > 7 && (
                    <span className="text-xs text-slate-400 px-1">
                      …{totalPages}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (filterMode)
                      setClientPage((p) => Math.min(totalPages, p + 1));
                    else setOffset(offset + PAGE_SIZE);
                    setExpandedId(null);
                  }}
                  disabled={currentPage >= totalPages}
                  className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600
                             hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Slide-in Add Panel ──────────────────────────────────────────── */}
        {addPack && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setAddPack(null)}
            />
            <aside className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-white border-l border-slate-200 shadow-2xl flex flex-col">
              <AddPanel pack={addPack} onClose={() => setAddPack(null)} />
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
