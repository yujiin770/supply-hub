import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import SupplierLayout from "../../layouts/supplier_layout";
import {
  orderApi,
  useIncomingOrders,
  useUpdateOrderStatus,
  useEditOrder,
  useDeclinePayment,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  type OrderOut,
  type OrderStatus,
  type OrderItemOut,
} from "../../features/api_clients/order_api";
import {
  useSupplierPackages,
  type MarketplacePackage,
} from "../../features/api_clients/marketplace_api";

function StatusBadge({ status }: { status: OrderStatus }) {
  const { bg, text } = ORDER_STATUS_COLORS[status] ?? {
    bg: "bg-slate-100",
    text: "text-slate-600",
  };
  return (
    <span
      className={`inline-flex items-center text-xs font-semibold rounded-full px-2.5 py-0.5 ${bg} ${text}`}
    >
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_TABS: { label: string; value: OrderStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Awaiting Conf.", value: "AWAITING_CONFIRMATION" },
  { label: "Awaiting Payment", value: "AWAITING_PAYMENT" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const STATUS_ONLY: OrderStatus[] = [
  "PENDING",
  "AWAITING_CONFIRMATION",
  "AWAITING_PAYMENT",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const STATUS_DOT: Record<OrderStatus, string> = {
  PENDING: "bg-amber-400",
  AWAITING_CONFIRMATION: "bg-blue-500",
  AWAITING_PAYMENT: "bg-orange-500",
  CONFIRMED: "bg-indigo-500",
  SHIPPED: "bg-purple-500",
  DELIVERED: "bg-green-500",
  CANCELLED: "bg-slate-400",
};

type AllowedTransition = {
  status: OrderStatus;
  label: string;
  variant: "primary" | "danger" | "neutral";
};

function getAllowedTransitions(
  status: OrderStatus,
  hasPaymentRef: boolean,
): AllowedTransition[] {
  switch (status) {
    case "PENDING":
      return [
        {
          status: "AWAITING_PAYMENT",
          label: "Confirm Order",
          variant: "primary",
        },
        { status: "CANCELLED", label: "Cancel Order", variant: "danger" },
      ];
    case "AWAITING_CONFIRMATION":
      return [
        { status: "CANCELLED", label: "Cancel Order", variant: "danger" },
      ];
    case "AWAITING_PAYMENT":
      return hasPaymentRef
        ? [
            {
              status: "CONFIRMED",
              label: "Confirm Payment",
              variant: "primary",
            },
          ]
        : [];
    case "CONFIRMED":
      return [
        { status: "SHIPPED", label: "Mark as Shipped", variant: "primary" },
      ];
    case "SHIPPED":
      return [
        { status: "DELIVERED", label: "Mark as Delivered", variant: "primary" },
      ];
    default:
      return [];
  }
}

const VARIANT_CLASSES = {
  primary: "bg-emerald-600 hover:bg-emerald-700 text-white",
  danger: "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200",
  neutral: "bg-slate-100 hover:bg-slate-200 text-slate-700",
};

// ── Supplier Package Picker (full-screen overlay) ────────────────────────────

interface PickerFilters {
  forms: Set<string>;
  routes: Set<string>;
}
const EMPTY_PICKER_FILTERS: PickerFilters = {
  forms: new Set(),
  routes: new Set(),
};
const PICKER_PAGE = 50;

function SupplierPackagePicker({
  supplierId,
  addedPackIds,
  onPick,
  onClose,
}: {
  supplierId: string;
  addedPackIds: string[];
  onPick: (pkg: MarketplacePackage, qty: number) => void;
  onClose: () => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState<PickerFilters>(EMPTY_PICKER_FILTERS);
  const [qty, setQty] = useState<Record<string, number>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearch(v: string) {
    setInputValue(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setDebouncedQ(v.trim());
      setOffset(0);
    }, 350);
  }

  const { data, isLoading } = useSupplierPackages(supplierId, {
    limit: PICKER_PAGE,
    offset,
    is_enabled: true,
    q: debouncedQ || undefined,
  });

  const packages = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PICKER_PAGE);
  const currentPage = Math.floor(offset / PICKER_PAGE) + 1;

  const facets = useMemo(() => {
    const forms = [
      ...new Set(
        packages.map((p) => p.dosage_form_name).filter(Boolean) as string[],
      ),
    ].sort();
    const routes = [
      ...new Set(packages.map((p) => p.route_name).filter(Boolean) as string[]),
    ].sort();
    return { forms, routes };
  }, [packages]);

  const activeFilterCount = filters.forms.size + filters.routes.size;

  const visible = useMemo(() => {
    let items = packages;
    if (filters.forms.size)
      items = items.filter(
        (p) => p.dosage_form_name && filters.forms.has(p.dosage_form_name),
      );
    if (filters.routes.size)
      items = items.filter(
        (p) => p.route_name && filters.routes.has(p.route_name),
      );
    return items;
  }, [packages, filters]);

  function toggleFilter(field: "forms" | "routes", val: string) {
    const next = new Set(filters[field]);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setFilters({ ...filters, [field]: next });
  }

  const thCls =
    "px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap";
  const checkCls =
    "flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 cursor-pointer";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      {/* Header */}
      <header className="h-14 border-b border-slate-200 flex items-center gap-3 px-4 pr-14 shrink-0 relative">
        <span className="text-sm font-bold text-slate-800 shrink-0">
          Browse Your Catalog
        </span>
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
            placeholder="Search brand name…"
            className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white placeholder-slate-400 transition-colors"
          />
          {inputValue && (
            <button
              onClick={() => {
                setInputValue("");
                setDebouncedQ("");
                setOffset(0);
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

      <div className="flex flex-1 overflow-hidden">
        {/* Filter sidebar */}
        <aside className="w-48 shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
            <span className="text-xs font-semibold text-slate-700">
              Filters
            </span>
            {activeFilterCount > 0 && (
              <button
                onClick={() => setFilters(EMPTY_PICKER_FILTERS)}
                className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
              >
                Clear {activeFilterCount}
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            {facets.forms.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                  Dosage Form
                </span>
                <div className="space-y-0.5">
                  {facets.forms.map((f) => (
                    <label key={f} className={checkCls}>
                      <input
                        type="checkbox"
                        checked={filters.forms.has(f)}
                        onChange={() => toggleFilter("forms", f)}
                        className="w-3.5 h-3.5 rounded border-slate-300 accent-emerald-600 shrink-0"
                      />
                      <span className="text-xs text-slate-700 truncate">
                        {f}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {facets.routes.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                  Route
                </span>
                <div className="space-y-0.5">
                  {facets.routes.map((r) => (
                    <label key={r} className={checkCls}>
                      <input
                        type="checkbox"
                        checked={filters.routes.has(r)}
                        onChange={() => toggleFilter("routes", r)}
                        className="w-3.5 h-3.5 rounded border-slate-300 accent-emerald-600 shrink-0"
                      />
                      <span className="text-xs text-slate-700 truncate">
                        {r}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sub-header */}
          <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 shrink-0 flex-wrap bg-white min-h-[40px]">
            <span className="text-xs text-slate-500">
              <span className="font-semibold text-slate-800">
                {visible.length}
              </span>
              {activeFilterCount > 0 && <span> filtered</span>}
              <span className="text-slate-400">
                {" "}
                / {total.toLocaleString()} total
              </span>
            </span>
            {[...filters.forms].map((f) => (
              <button
                key={f}
                onClick={() => toggleFilter("forms", f)}
                className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 text-xs hover:bg-emerald-100"
              >
                {f} ✕
              </button>
            ))}
            {[...filters.routes].map((r) => (
              <button
                key={r}
                onClick={() => toggleFilter("routes", r)}
                className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 text-xs hover:bg-blue-100"
              >
                {r} ✕
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className={thCls}>Brand Name</th>
                  <th className={thCls}>Form / Route</th>
                  <th className={thCls}>Price</th>
                  <th className={thCls}>Stock</th>
                  <th className={`${thCls} w-32`}>Qty</th>
                  <th className={`${thCls} w-24`}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-3 py-3">
                          <div className="h-3 bg-slate-100 rounded w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))}
                {!isLoading && visible.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <p className="text-sm font-medium text-slate-500">
                        No items found
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Try a different search or clear filters.
                      </p>
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  visible.map((pkg) => {
                    const isAdded = addedPackIds.includes(pkg.pack_id);
                    const q = qty[pkg.pack_id] ?? 1;
                    return (
                      <tr
                        key={pkg.pack_id}
                        className={`transition-colors ${isAdded ? "bg-emerald-50/50" : "hover:bg-slate-50"}`}
                      >
                        <td className="px-3 py-2.5 max-w-[200px]">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {pkg.brand_name ?? pkg.pack_id.slice(0, 8) + "…"}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-500">
                          {[pkg.dosage_form_name, pkg.route_name]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-medium text-emerald-700">
                          {pkg.base_price
                            ? `₱${parseFloat(pkg.base_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                            : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-500">
                          {pkg.stock_qty !== null && pkg.stock_qty !== undefined
                            ? pkg.stock_qty
                            : "∞"}
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            min={1}
                            max={pkg.stock_qty ?? undefined}
                            value={q}
                            disabled={isAdded}
                            onChange={(e) =>
                              setQty((prev) => ({
                                ...prev,
                                [pkg.pack_id]: parseInt(e.target.value) || 1,
                              }))
                            }
                            className="w-20 text-center text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-40"
                          />
                        </td>
                        <td className="px-3 py-2.5">
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
                              onClick={() => onPick(pkg, q)}
                              className="inline-flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-full px-3 py-1 transition-colors whitespace-nowrap"
                            >
                              + Add
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && total > PICKER_PAGE && (
            <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between gap-4 shrink-0 bg-white">
              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {offset + 1}—{Math.min(offset + PICKER_PAGE, total)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">
                  {total.toLocaleString()}
                </span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setOffset(Math.max(0, offset - PICKER_PAGE));
                  }}
                  disabled={currentPage <= 1}
                  className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setOffset((page - 1) * PICKER_PAGE)}
                      className={`text-xs w-7 h-7 rounded-lg transition-colors ${page === currentPage ? "bg-emerald-600 text-white font-semibold" : "text-slate-600 hover:bg-slate-100"}`}
                    >
                      {page}
                    </button>
                  );
                })}
                {totalPages > 7 && (
                  <span className="text-xs text-slate-400 px-1">
                    …{totalPages}
                  </span>
                )}
                <button
                  onClick={() => {
                    setOffset(offset + PICKER_PAGE);
                  }}
                  disabled={currentPage >= totalPages}
                  className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Edit Order Modal ──────────────────────────────────────────────────────────

interface EditItem {
  pack_id: string;
  quantity: number;
  brand_name?: string | null;
  dosage_form_name?: string | null;
  base_price?: string | null;
  stock_qty?: number | null;
}

function EditOrderModal({
  order,
  onClose,
}: {
  order: OrderOut;
  onClose: () => void;
}) {
  const editOrder = useEditOrder();

  const [items, setItems] = useState<EditItem[]>(
    order.items.map((item: OrderItemOut) => ({
      pack_id: item.pack_id,
      quantity: item.quantity,
      brand_name: item.brand_name,
      dosage_form_name: item.dosage_form_name,
    })),
  );
  const [remarks, setRemarks] = useState("");
  const [showCatalog, setShowCatalog] = useState(false);

  const addedPackIds = items.map((i) => i.pack_id);

  function updateQty(index: number, q: number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity: q } : item)),
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handlePick(pkg: MarketplacePackage, qty: number) {
    setItems((prev) => [
      ...prev,
      {
        pack_id: pkg.pack_id,
        quantity: qty,
        brand_name: pkg.brand_name,
        dosage_form_name: pkg.dosage_form_name,
        base_price: pkg.base_price,
        stock_qty: pkg.stock_qty,
      },
    ]);
  }

  function handleSubmit() {
    if (items.length === 0 || !remarks.trim()) return;
    editOrder.mutate(
      {
        orderId: order.id,
        data: {
          items: items.map((i) => ({
            pack_id: i.pack_id,
            quantity: i.quantity,
          })),
          supplier_edit_notes: remarks.trim(),
        },
      },
      { onSuccess: onClose },
    );
  }

  const canSave = items.length > 0 && remarks.trim().length > 0;
  const orderTotal = items.reduce((sum, i) => {
    const price = i.base_price ? parseFloat(i.base_price) : 0;
    return sum + price * i.quantity;
  }, 0);

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-50">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center gap-3 px-6 pr-14 shrink-0 relative">
          <div className="flex items-center gap-2.5 min-w-0">
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">
                Edit Order
              </p>
              <p className="text-xs font-mono text-slate-400">
                {order.order_number}
              </p>
            </div>
            <StatusBadge status={order.status} />
          </div>
          <button
            onClick={onClose}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
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

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden gap-6 p-6">
          {/* Left — order editor */}
          <div className="flex flex-col w-full max-w-md shrink-0 gap-4">
            {/* Items card */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col flex-1 min-h-0">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Order Items
                  <span className="ml-2 text-slate-800 normal-case font-bold">
                    {items.length}
                  </span>
                </p>
                <button
                  onClick={() => setShowCatalog(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 transition-colors"
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
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Browse Catalog
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-10 gap-2 text-slate-400">
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
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"
                      />
                    </svg>
                    <p className="text-sm font-medium text-slate-500">
                      No items yet
                    </p>
                    <p className="text-xs">
                      Click "Browse Catalog" to add items.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {items.map((item, i) => (
                      <div
                        key={item.pack_id}
                        className="flex items-center gap-3 px-5 py-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {item.brand_name ?? "—"}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {item.dosage_form_name ?? ""}
                            {item.base_price
                              ? ` · ₱${parseFloat(item.base_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                            <button
                              onClick={() =>
                                updateQty(i, Math.max(1, item.quantity - 1))
                              }
                              className="px-2 py-1 text-slate-500 hover:bg-slate-100 text-sm font-bold transition-colors"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={item.stock_qty ?? undefined}
                              value={item.quantity}
                              onChange={(e) =>
                                updateQty(i, parseInt(e.target.value) || 1)
                              }
                              className="w-12 text-center text-sm py-1 border-x border-slate-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-400"
                            />
                            <button
                              onClick={() => updateQty(i, item.quantity + 1)}
                              className="px-2 py-1 text-slate-500 hover:bg-slate-100 text-sm font-bold transition-colors"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(i)}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove"
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order total */}
              {items.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                  <span className="text-xs text-slate-500">
                    Estimated Total
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    ₱
                    {orderTotal.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Remarks card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shrink-0">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Remarks / Reason for Changes{" "}
                <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Explain what was changed and why (e.g. item out of stock, substituted product)…"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none placeholder-slate-400 transition-colors"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 shrink-0">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={editOrder.isPending || !canSave}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editOrder.isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>

            {editOrder.error != null && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs">
                {editOrder.error instanceof Error
                  ? editOrder.error.message
                  : "Failed to save changes."}
              </div>
            )}
          </div>

          {/* Right — original order summary */}
          <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-100 shrink-0">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Original Order
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                  <tr>
                    <th className="text-left px-5 py-2.5 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      Product
                    </th>
                    <th className="text-right px-5 py-2.5 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="text-right px-5 py-2.5 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="text-right px-5 py-2.5 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900">
                          {item.brand_name ??
                            `Pack ${item.pack_id.slice(0, 8)}…`}
                        </p>
                        {item.dosage_form_name && (
                          <p className="text-xs text-slate-400">
                            {item.dosage_form_name}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">
                        {item.quantity}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">
                        {item.unit_price
                          ? `₱${parseFloat(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-900">
                        {item.subtotal
                          ? `₱${parseFloat(item.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {order.total && (
              <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-500">Order Total</span>
                <span className="text-sm font-bold text-slate-900">
                  ₱
                  {parseFloat(order.total).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Catalog picker overlay */}
      {showCatalog && (
        <SupplierPackagePicker
          supplierId={order.supplier_id}
          addedPackIds={addedPackIds}
          onPick={(pkg, qty) => {
            handlePick(pkg, qty);
          }}
          onClose={() => setShowCatalog(false)}
        />
      )}
    </>
  );
}

function DeclinePaymentModal({
  order,
  onClose,
}: {
  order: OrderOut;
  onClose: () => void;
}) {
  const declinePayment = useDeclinePayment();
  const [remarks, setRemarks] = useState("");

  function handleSubmit() {
    if (!remarks.trim()) return;
    declinePayment.mutate(
      { orderId: order.id, remarks: remarks.trim() },
      { onSuccess: onClose },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Decline Payment</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Order {order.order_number}
          </p>
        </div>
        <p className="text-sm text-slate-700">
          Declining will clear the submitted receipt. The buyer will need to
          re-upload a valid payment proof.
        </p>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Decline Remarks <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            autoFocus
            placeholder="e.g. Receipt is blurry / amount does not match..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="text-sm font-medium rounded-lg px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!remarks.trim() || declinePayment.isPending}
            onClick={handleSubmit}
            className="text-sm font-medium rounded-lg px-4 py-2 bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
          >
            {declinePayment.isPending ? "Declining…" : "Decline Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CancelOrderModal({
  order,
  onClose,
}: {
  order: OrderOut;
  onClose: () => void;
}) {
  const update = useUpdateOrderStatus();
  const [remarks, setRemarks] = useState("");

  function handleSubmit() {
    if (!remarks.trim()) return;
    update.mutate(
      { orderId: order.id, status: "CANCELLED", cancelRemarks: remarks.trim() },
      { onSuccess: onClose },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Cancel Order</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Order {order.order_number}
          </p>
        </div>
        <p className="text-sm text-slate-700">
          Please provide a reason for cancelling. The buyer will be notified via
          email with your remarks.
        </p>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Cancellation Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            autoFocus
            placeholder="e.g. Item out of stock / Unable to fulfil this order…"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="text-sm font-medium rounded-lg px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            Back
          </button>
          <button
            disabled={!remarks.trim() || update.isPending}
            onClick={handleSubmit}
            className="text-sm font-medium rounded-lg px-4 py-2 bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
          >
            {update.isPending ? "Cancelling…" : "Confirm Cancellation"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImageZoomModal({
  src,
  onClose,
}: {
  src: string;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const MIN = 0.5;
  const MAX = 5;

  const drag = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
  });

  const zoom = useCallback(
    (delta: number) =>
      setScale((s) => {
        const next = Math.min(MAX, Math.max(MIN, s + delta));
        if (next === 1) setPan({ x: 0, y: 0 });
        return next;
      }),
    [],
  );

  const resetView = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") zoom(0.25);
      if (e.key === "-") zoom(-0.25);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, zoom]);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      zoom(e.deltaY < 0 ? 0.15 : -0.15);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoom]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.startX;
      const dy = e.clientY - drag.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.current.moved = true;
      setPan({ x: drag.current.originX + dx, y: drag.current.originY + dy });
    };
    const onUp = () => {
      drag.current.active = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    drag.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: pan.x,
      originY: pan.y,
      moved: false,
    };
  };

  const handleImageClick = () => {
    if (drag.current.moved) return;
    zoom(scale < MAX ? 0.5 : -0.5);
  };

  const isDragging = drag.current.active;
  const canPan = scale > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            zoom(-0.25);
          }}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 text-lg font-bold"
        >
          −
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            zoom(0.25);
          }}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 text-lg font-bold"
        >
          +
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            resetView();
          }}
          className="px-3 h-8 rounded-full bg-white/20 text-white hover:bg-white/30 text-xs font-medium"
        >
          Reset
        </button>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 text-lg"
        >
          ✕
        </button>
      </div>
      <div
        ref={containerRef}
        className="overflow-hidden flex items-center justify-center"
        style={{ width: "100vw", height: "100vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt="Payment receipt"
          draggable={false}
          onMouseDown={handleMouseDown}
          onClick={handleImageClick}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.15s ease",
            maxWidth: "90vw",
            maxHeight: "85vh",
            objectFit: "contain",
            cursor: canPan
              ? isDragging
                ? "grabbing"
                : "grab"
              : scale < MAX
                ? "zoom-in"
                : "zoom-out",
            userSelect: "none",
          }}
        />
      </div>
      <p className="absolute bottom-4 text-white/40 text-xs pointer-events-none">
        Scroll to zoom · Drag to pan · Click to zoom · Esc to close
      </p>
    </div>
  );
}

function OrderRow({
  order,
  onToggle,
  isExpanded,
}: {
  order: OrderOut;
  onToggle: () => void;
  isExpanded: boolean;
}) {
  const update = useUpdateOrderStatus();
  const transitions = getAllowedTransitions(
    order.status,
    !!order.payment_reference,
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  return (
    <>
      <tr
        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="px-4 py-3 font-mono text-xs text-slate-700">
          {order.order_number}
        </td>
        <td className="px-4 py-3">
          <p
            className="text-xs font-mono text-slate-700 truncate max-w-[160px]"
            title={order.buyer_id}
          >
            {order.buyer_id}
          </p>
          {order.client_reference_id && (
            <p
              className="text-xs text-slate-400 truncate max-w-[160px]"
              title={order.client_reference_id}
            >
              ref: {order.client_reference_id}
            </p>
          )}
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={order.status} />
        </td>
        <td className="px-4 py-3 text-xs text-slate-500">
          {formatDate(order.created_at)}
        </td>
        <td className="px-4 py-3 text-sm font-semibold text-right text-slate-900">
          {order.total
            ? `₱ ${parseFloat(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
            : "—"}
        </td>
        <td className="px-4 py-3 text-right">
          <span className="text-xs text-slate-400">
            {isExpanded ? "▲" : "▼"}
          </span>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-slate-50 border-b border-slate-200">
          <td colSpan={6} className="px-6 py-4">
            <div className="space-y-4">
              {/* Items */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Items
                </p>
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">
                          Product
                        </th>
                        <th className="text-right px-4 py-2 text-xs text-slate-500 font-medium">
                          Qty
                        </th>
                        <th className="text-right px-4 py-2 text-xs text-slate-500 font-medium">
                          Unit Price
                        </th>
                        <th className="text-right px-4 py-2 text-xs text-slate-500 font-medium">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {order.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2">
                            <p className="font-medium text-slate-900">
                              {item.brand_name ??
                                `Pack ${item.pack_id.slice(0, 8)}…`}
                            </p>
                            {item.dosage_form_name && (
                              <p className="text-xs text-slate-400">
                                {item.dosage_form_name}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-600">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-600">
                            {item.unit_price
                              ? `₱ ${parseFloat(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                              : "—"}
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-slate-900">
                            {item.subtotal
                              ? `₱ ${parseFloat(item.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Buyer info */}
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <div>
                  <span className="font-semibold text-slate-500">
                    Buyer ID:{" "}
                  </span>
                  <span className="font-mono text-slate-700">
                    {order.buyer_id}
                  </span>
                </div>
                {order.client_reference_id && (
                  <div>
                    <span className="font-semibold text-slate-500">
                      Client Ref:{" "}
                    </span>
                    <span className="text-slate-700">
                      {order.client_reference_id}
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {order.notes && (
                <div className="text-sm">
                  <span className="font-semibold text-slate-500">Notes: </span>
                  <span className="text-slate-700">{order.notes}</span>
                </div>
              )}

              {/* Supplier edit notes */}
              {order.supplier_edit_notes && (
                <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-3 text-sm">
                  <p className="font-semibold text-orange-700 mb-0.5">
                    📝 Your Edit Remarks
                  </p>
                  <p className="text-orange-800">{order.supplier_edit_notes}</p>
                </div>
              )}

              {/* Payment reference */}
              {order.status === "AWAITING_PAYMENT" && (
                <div
                  className={`rounded-lg px-4 py-3 text-sm border ${
                    order.payment_reference
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-sky-50 border-sky-200"
                  }`}
                >
                  {order.payment_reference ? (
                    <>
                      <p className="font-semibold text-emerald-700 mb-3">
                        💳 Payment Receipt Submitted by Buyer
                      </p>
                      {(order.payment_reference_no ||
                        order.payment_amount ||
                        order.payment_date) && (
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          {order.payment_reference_no && (
                            <div>
                              <p className="text-xs text-emerald-600 font-medium">
                                Ref / Transaction No.
                              </p>
                              <p className="font-semibold text-slate-800 text-sm break-all">
                                {order.payment_reference_no}
                              </p>
                            </div>
                          )}
                          {order.payment_amount && (
                            <div>
                              <p className="text-xs text-emerald-600 font-medium">
                                Amount Paid
                              </p>
                              <p className="font-semibold text-slate-800 text-sm">
                                {order.payment_amount}
                              </p>
                            </div>
                          )}
                          {order.payment_date && (
                            <div>
                              <p className="text-xs text-emerald-600 font-medium">
                                Payment Date
                              </p>
                              <p className="font-semibold text-slate-800 text-sm">
                                {order.payment_date}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      <img
                        src={order.payment_reference}
                        alt="Payment receipt"
                        className="max-h-52 rounded-lg border border-emerald-200 object-contain mb-2 cursor-zoom-in hover:opacity-90 transition-opacity"
                        onClick={() => setZoomedImage(order.payment_reference!)}
                      />
                      <p className="text-xs text-emerald-600">
                        Confirm or decline the payment below.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-sky-700 mb-0.5">
                        ⏳ Waiting for Buyer to Attach Payment
                      </p>
                      <p className="text-xs text-sky-600">
                        The buyer needs to submit their payment proof before you
                        can confirm.
                      </p>
                      {order.payment_declined_remarks && (
                        <div className="mt-2 rounded bg-red-50 border border-red-200 px-3 py-2">
                          <p className="text-xs font-semibold text-red-700">
                            Your previous decline remarks:
                          </p>
                          <p className="text-xs text-red-700 mt-0.5">
                            {order.payment_declined_remarks}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Show receipt image for confirmed/shipped/delivered orders */}
              {["CONFIRMED", "SHIPPED", "DELIVERED"].includes(order.status) &&
                order.payment_reference && (
                  <div className="rounded-lg px-4 py-3 text-sm border bg-green-50 border-green-200">
                    <p className="font-semibold text-green-700 mb-2">
                      ✓ Payment Receipt
                    </p>
                    <img
                      src={order.payment_reference}
                      alt="Payment receipt"
                      className="max-h-52 rounded-lg border border-green-200 object-contain cursor-zoom-in hover:opacity-90 transition-opacity"
                      onClick={() => setZoomedImage(order.payment_reference!)}
                    />
                  </div>
                )}

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {transitions.map((t) => (
                  <button
                    key={t.status}
                    disabled={update.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (t.status === "CANCELLED") {
                        setShowCancelModal(true);
                      } else {
                        update.mutate({ orderId: order.id, status: t.status });
                      }
                    }}
                    className={`text-sm font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-50 ${VARIANT_CLASSES[t.variant]}`}
                  >
                    {t.label}
                  </button>
                ))}
                {order.status === "PENDING" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEditModal(true);
                    }}
                    className="text-sm font-medium rounded-lg px-4 py-2 transition-colors bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200"
                  >
                    ✏️ Edit Order
                  </button>
                )}
                {order.status === "AWAITING_PAYMENT" &&
                  order.payment_reference && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeclineModal(true);
                      }}
                      className="text-sm font-medium rounded-lg px-4 py-2 transition-colors bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                    >
                      ✕ Decline Payment
                    </button>
                  )}
              </div>
            </div>
          </td>
        </tr>
      )}

      {showEditModal && (
        <EditOrderModal order={order} onClose={() => setShowEditModal(false)} />
      )}
      {showDeclineModal && (
        <DeclinePaymentModal
          order={order}
          onClose={() => setShowDeclineModal(false)}
        />
      )}
      {showCancelModal && (
        <CancelOrderModal
          order={order}
          onClose={() => setShowCancelModal(false)}
        />
      )}
      {zoomedImage && (
        <ImageZoomModal
          src={zoomedImage}
          onClose={() => setZoomedImage(null)}
        />
      )}
    </>
  );
}

const PAGE_SIZE = 20;

export default function IncomingOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const params = {
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    offset: (page - 1) * PAGE_SIZE,
    limit: PAGE_SIZE,
  };
  const { data, isLoading } = useIncomingOrders(params);

  const orders = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Split AWAITING_PAYMENT orders into two sub-lists
  const receiptSubmittedOrders =
    statusFilter === "AWAITING_PAYMENT"
      ? orders.filter((o) => !!o.payment_reference)
      : [];
  const waitingForReceiptOrders =
    statusFilter === "AWAITING_PAYMENT"
      ? orders.filter((o) => !o.payment_reference)
      : [];

  function handleTabChange(tab: OrderStatus | "ALL") {
    setStatusFilter(tab);
    setPage(1);
    setExpandedId(null);
  }

  // ── Per-status counts ─────────────────────────────────────────────────────
  const countQueries = useQueries({
    queries: STATUS_ONLY.map((s) => ({
      queryKey: ["supplier-orders-count", s],
      queryFn: () =>
        orderApi.listIncomingOrders({ status: s, limit: 1, offset: 0 }),
      staleTime: 30_000,
    })),
  });

  const statusCounts = Object.fromEntries(
    STATUS_ONLY.map((s, i) => [s, countQueries[i].data?.total ?? 0]),
  ) as Record<OrderStatus, number>;

  const totalAll = STATUS_ONLY.reduce(
    (sum, s) => sum + (statusCounts[s] ?? 0),
    0,
  );

  return (
    <SupplierLayout>
      <div className="flex -m-6 h-[calc(100%+3rem)]">
        {/* Status sidebar */}
        <aside className="w-52 shrink-0 bg-white border-r border-slate-200 overflow-y-auto flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Incoming Orders
            </p>
          </div>
          <nav className="flex-1 py-2">
            {STATUS_TABS.map((tab) => {
              const isActive = statusFilter === tab.value;
              const count =
                tab.value === "ALL"
                  ? totalAll
                  : (statusCounts[tab.value as OrderStatus] ?? 0);
              const needsAction =
                (tab.value === "AWAITING_PAYMENT" &&
                  (statusCounts["AWAITING_PAYMENT"] ?? 0) > 0) ||
                (tab.value === "PENDING" && (statusCounts["PENDING"] ?? 0) > 0);
              return (
                <button
                  key={tab.value}
                  onClick={() => handleTabChange(tab.value)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm text-left border-r-2 transition-colors ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-500 font-semibold"
                      : "text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-800 font-medium"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {tab.value !== "ALL" && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isActive
                            ? STATUS_DOT[tab.value as OrderStatus]
                            : "bg-slate-300"
                        }`}
                      />
                    )}
                    <span className="text-xs">{tab.label}</span>
                  </span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none ${
                        needsAction && !isActive
                          ? "bg-orange-500 text-white"
                          : isActive
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>
        {/* Main content */}
        <div className="flex-1 overflow-auto p-6 space-y-5">
          {/* Page header */}
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Incoming Orders
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {statusFilter === "ALL"
                ? "All orders from buyers"
                : ORDER_STATUS_LABELS[statusFilter as OrderStatus]}
            </p>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
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
                <span className="text-sm">Loading orders…</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <p className="text-3xl mb-2">📋</p>
                <p className="font-medium">No orders yet</p>
                <p className="text-sm mt-1">
                  Orders will appear here once buyers place them.
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      Order #
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      Buyer
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      Placed
                    </th>
                    <th className="text-right px-4 py-3 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      Total
                    </th>
                    <th className="w-8" />
                  </tr>
                </thead>
                {statusFilter === "AWAITING_PAYMENT" ? (
                  <>
                    {/* Section: Receipt submitted — needs supplier action */}
                    <tbody>
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-2 bg-blue-50 border-y border-blue-100"
                        >
                          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                            💳 Payment Receipt Submitted — Awaiting Your
                            Confirmation
                            {receiptSubmittedOrders.length > 0 && (
                              <span className="ml-2 bg-blue-600 text-white rounded-full px-2 py-0.5 text-xs">
                                {receiptSubmittedOrders.length}
                              </span>
                            )}
                          </span>
                        </td>
                      </tr>
                      {receiptSubmittedOrders.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-4 text-center text-sm text-slate-400"
                          >
                            No receipts submitted yet.
                          </td>
                        </tr>
                      ) : (
                        receiptSubmittedOrders.map((order) => (
                          <OrderRow
                            key={order.id}
                            order={order}
                            isExpanded={expandedId === order.id}
                            onToggle={() =>
                              setExpandedId((prev) =>
                                prev === order.id ? null : order.id,
                              )
                            }
                          />
                        ))
                      )}
                    </tbody>
                    {/* Section: Waiting for buyer to submit receipt */}
                    <tbody>
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-2 bg-amber-50 border-y border-amber-100"
                        >
                          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                            ⏳ Waiting for Buyer to Attach Payment
                            {waitingForReceiptOrders.length > 0 && (
                              <span className="ml-2 bg-amber-500 text-white rounded-full px-2 py-0.5 text-xs">
                                {waitingForReceiptOrders.length}
                              </span>
                            )}
                          </span>
                        </td>
                      </tr>
                      {waitingForReceiptOrders.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-4 text-center text-sm text-slate-400"
                          >
                            All buyers have submitted their receipts.
                          </td>
                        </tr>
                      ) : (
                        waitingForReceiptOrders.map((order) => (
                          <OrderRow
                            key={order.id}
                            order={order}
                            isExpanded={expandedId === order.id}
                            onToggle={() =>
                              setExpandedId((prev) =>
                                prev === order.id ? null : order.id,
                              )
                            }
                          />
                        ))
                      )}
                    </tbody>
                  </>
                ) : (
                  <tbody>
                    {orders.map((order) => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        isExpanded={expandedId === order.id}
                        onToggle={() =>
                          setExpandedId((prev) =>
                            prev === order.id ? null : order.id,
                          )
                        }
                      />
                    ))}
                  </tbody>
                )}
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>
                Page {page} of {totalPages} ({total} orders)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>{" "}
        {/* flex-1 content */}
      </div>{" "}
      {/* -m-6 flex */}
    </SupplierLayout>
  );
}
