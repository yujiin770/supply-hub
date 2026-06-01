import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SupplierLayout, { useOrdersFilter } from "../../layouts/supplier_layout";
import {
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
import {
  ShoppingBag,
  Search,
  Filter,
  Hourglass,
  Bell,
  CreditCard,
  CheckSquare,
  Truck,
  Package,
  Ban,
  AlertCircle,
  X,
  Plus,
} from "lucide-react";

// Maps shared Title Case sidebar context to UPPERCASE backend enums
const CONTEXT_TO_BACKEND: Record<string, OrderStatus | "ALL"> = {
  All: "ALL",
  Pending: "PENDING",
  "Awaiting Confirmation": "AWAITING_CONFIRMATION",
  "Awaiting Conf.": "AWAITING_CONFIRMATION",
  "Awaiting Payment": "AWAITING_PAYMENT",
  Confirmed: "CONFIRMED",
  Shipped: "SHIPPED",
  Delivered: "DELIVERED",
  Cancelled: "CANCELLED",
};

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
    <div className="fixed inset-0 z-60 flex flex-col bg-white animate-in fade-in duration-200">
      {/* Header */}
      <header className="h-14 border-b border-slate-200 flex items-center gap-3 px-4 pr-14 shrink-0 relative">
        <span className="text-sm font-bold text-slate-800 shrink-0">
          Browse Your Catalog
        </span>
        <div className="flex-1 relative max-w-xl">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            autoFocus
            type="text"
            value={inputValue}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search brand name…"
            className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004797]/30 bg-slate-50 focus:bg-white placeholder-slate-400 transition-colors"
          />
          {inputValue && (
            <button
              onClick={() => {
                setInputValue("");
                setDebouncedQ("");
                setOffset(0);
              }}
              className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600 animate-fade-in bg-transparent border-none outline-none cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
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
                className="text-xs text-emerald-600 hover:text-emerald-800 font-medium bg-transparent border-none cursor-pointer"
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
          <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 shrink-0 flex-wrap bg-white min-h-10">
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
            <table className="w-full text-sm min-w-150 border-collapse">
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
                        <td className="px-3 py-2.5 max-w-50">
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
                              className="inline-flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-full px-3 py-1 transition-colors whitespace-nowrap border-none cursor-pointer outline-none"
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
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 animate-in fade-in duration-200">
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
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
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
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#004797] hover:bg-blue-800 text-white rounded-lg px-3 py-1.5 transition-colors border-none cursor-pointer outline-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Browse Catalog
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-10 gap-2 text-slate-400">
                    <ShoppingBag className="w-8 h-8 text-slate-300" />
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
                              className="px-2 py-1 text-slate-500 hover:bg-slate-100 text-sm font-bold transition-colors border-none bg-transparent cursor-pointer animate-none"
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
                              className="px-2 py-1 text-slate-500 hover:bg-slate-100 text-sm font-bold transition-colors border-none bg-transparent cursor-pointer animate-none"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(i)}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                            title="Remove"
                          >
                            <X className="w-4 h-4" />
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
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#004797] resize-none placeholder-slate-400 transition-colors"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 shrink-0">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors border-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={editOrder.isPending || !canSave}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-[#004797] hover:bg-blue-800 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer outline-none"
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
            className="text-sm font-medium rounded-lg px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border-none cursor-pointer"
          >
            Cancel
          </button>
          <button
            disabled={!remarks.trim() || declinePayment.isPending}
            onClick={handleSubmit}
            className="text-sm font-medium rounded-lg px-4 py-2 bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 border-none cursor-pointer"
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
            className="text-sm font-medium rounded-lg px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border-none cursor-pointer"
          >
            Back
          </button>
          <button
            disabled={!remarks.trim() || update.isPending}
            onClick={handleSubmit}
            className="text-sm font-medium rounded-lg px-4 py-2 bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 border-none cursor-pointer"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            zoom(-0.25);
          }}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 text-lg font-bold border-none cursor-pointer"
        >
          −
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            zoom(0.25);
          }}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 text-lg font-bold border-none cursor-pointer"
        >
          +
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            resetView();
          }}
          className="px-3 h-8 rounded-full bg-white/20 text-white hover:bg-white/30 text-xs font-medium border-none cursor-pointer"
        >
          Reset
        </button>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 text-lg border-none cursor-pointer animate-fade-in"
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
        className="border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="px-6 py-4 font-mono text-xs text-slate-700">
          {order.order_number}
        </td>
        <td className="px-6 py-4">
          <p
            className="text-xs font-mono text-slate-700 truncate max-w-40"
            title={order.buyer_id}
          >
            {order.buyer_id}
          </p>
          {order.client_reference_id && (
            <p
              className="text-xs text-slate-400 truncate max-w-40"
              title={order.client_reference_id}
            >
              ref: {order.client_reference_id}
            </p>
          )}
        </td>
        <td className="px-6 py-4">
          <StatusBadge status={order.status} />
        </td>
        <td className="px-6 py-4 text-xs text-slate-500">
          {formatDate(order.created_at)}
        </td>
        <td className="px-6 py-4 text-sm font-semibold text-right text-slate-900">
          {order.total
            ? `₱ ${parseFloat(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
            : "—"}
        </td>
        <td className="px-6 py-4 text-right">
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setZoomedImage(order.payment_reference!);
                        }}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomedImage(order.payment_reference!);
                      }}
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
                    className={`text-sm font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-50 border-none cursor-pointer outline-none ${VARIANT_CLASSES[t.variant]}`}
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
                    className="text-sm font-medium rounded-lg px-4 py-2 transition-colors bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 cursor-pointer"
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
                      className="text-sm font-medium rounded-lg px-4 py-2 transition-colors bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 cursor-pointer"
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

// ── Inner Page Content Component (descends correctly from standard Context Provider) ──────────────────

function IncomingOrdersPageContent() {
  const PAGE_SIZE = 20;
  const { orderStatus } = useOrdersFilter();
  const statusFilter = CONTEXT_TO_BACKEND[orderStatus] || "ALL";
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Automatically reset page and collapse active expanded rows on tab change
  useEffect(() => {
    setPage(1);
    setExpandedId(null);
  }, [statusFilter]);

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

  // Dynamic visual configurations matching the layout theme
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "Pending":
        return { icon: Hourglass, color: "text-amber-500", bg: "bg-amber-50", label: "Pending Verification" };
      case "Awaiting Confirmation":
        return { icon: Bell, color: "text-orange-500", bg: "bg-orange-50", label: "Awaiting Your Confirmation" };
      case "Awaiting Payment":
        return { icon: CreditCard, color: "text-blue-500", bg: "bg-blue-50", label: "Awaiting Buyer Payment" };
      case "Confirmed":
        return { icon: CheckSquare, color: "text-[#21BBD7]", bg: "bg-cyan-50", label: "Confirmed Orders" };
      case "Shipped":
        return { icon: Truck, color: "text-purple-500", bg: "bg-purple-50", label: "Orders in Transit" };
      case "Delivered":
        return { icon: Package, color: "text-emerald-500", bg: "bg-emerald-50", label: "Completed Deliveries" };
      case "Cancelled":
        return { icon: Ban, color: "text-gray-400", bg: "bg-gray-50", label: "Cancelled Orders" };
      default:
        return { icon: ShoppingBag, color: "text-[#004797]", bg: "bg-blue-50", label: "All Orders" };
    }
  };

  const configKey = orderStatus === "Awaiting Conf." ? "Awaiting Confirmation" : orderStatus;
  const config = getStatusConfig(configKey);
  const StatusIcon = config.icon;

  return (
    <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-500 pb-20 max-w-7xl mx-auto py-2 gap-8">
      
      {/* --- Page Header --- */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1.5 rounded-lg ${config.bg} ${config.color}`}>
            <StatusIcon className="w-4 h-4" />
          </div>
          <span className={`text-[11px] font-extrabold uppercase tracking-[0.2em] ${config.color}`}>
            Status: {orderStatus}
          </span>
        </div>
        <h1 className="text-4xl font-semibold text-gray-900 tracking-tight">
          Incoming Orders
        </h1>
        <p className="text-gray-500 font-medium mt-1">
          Review and process your wholesale distribution requests for <span className="font-bold text-gray-800">{config.label}</span>.
        </p>
      </div>

      <main className="w-full space-y-6">
        
        {/* Search & Action Bar */}
        <div className="bg-white rounded-[28px] border border-gray-100 p-3 shadow-sm flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder={`Search in ${orderStatus} orders...`}
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border-transparent rounded-[18px] text-sm font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
              disabled
            />
          </div>
          <button className="flex items-center gap-2 px-8 py-3.5 bg-white border border-gray-100 rounded-[18px] text-xs font-bold text-gray-400 cursor-not-allowed border-none outline-none">
            <Filter className="w-4 h-4" />
            Detailed Filters
          </button>
        </div>

        {/* Table list container */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-3xl border border-gray-100 shadow-sm min-h-100">
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
            <span className="text-sm font-medium text-slate-400 uppercase tracking-widest">Loading orders…</span>
          </div>
        ) : orders.length === 0 ? (
          /* --- Empty State Card --- */
          <div className="bg-white rounded-4xl border border-gray-100 shadow-sm overflow-hidden min-h-137.5 flex flex-col items-center justify-center p-12 text-center relative">
            
            {/* Decorative background element */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl opacity-20 ${config.bg}`} />

            <div className="relative mb-8">
              <div className={`w-28 h-28 ${config.bg} rounded-[40px] flex items-center justify-center border border-white shadow-xl transition-all duration-700`}>
                <StatusIcon className={`w-12 h-12 ${config.color} transition-all duration-700`} />
              </div>
              <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white rounded-2xl shadow-lg border border-gray-50 flex items-center justify-center">
                <div className={`w-2 h-2 rounded-full animate-pulse ${config.color.replace('text-', 'bg-')}`} />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3 relative">
              No {orderStatus === "All" ? "" : orderStatus.toLowerCase()} orders yet
            </h2>
            <p className="text-gray-400 font-medium max-w-sm leading-relaxed relative">
              When a pharmacy buyer places an order that matches this status, 
              it will appear here in real-time.
            </p>

            <div className={`mt-12 flex items-center gap-3 py-2.5 px-5 ${config.bg} rounded-full border border-white shadow-sm relative`}>
              <AlertCircle className={`w-4 h-4 ${config.color}`} />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${config.color}`}>
                System Monitoring Active
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-175">
                <thead className="bg-slate-50/50 border-b border-gray-55 shadow-xs">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Order #
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Buyer
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Status
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Placed
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">
                      Total
                    </th>
                    <th className="w-8" />
                  </tr>
                </thead>
                {statusFilter === "AWAITING_PAYMENT" ? (
                  <>
                    {/* Section: Payment Receipt Submitted */}
                    <tbody>
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-3.5 bg-blue-50/50 border-y border-blue-50"
                        >
                          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest flex items-center gap-2">
                            👑 Payment Receipt Submitted — Awaiting Your Confirmation
                            {receiptSubmittedOrders.length > 0 && (
                              <span className="bg-blue-600 text-white rounded-full px-2 py-0.5 text-[10px] font-bold">
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
                            className="px-6 py-6 text-center text-sm font-semibold text-gray-400 italic"
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

                    {/* Section: Waiting for Buyer Receipt */}
                    <tbody>
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-3.5 bg-amber-50/50 border-y border-orange-100"
                        >
                          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest flex items-center gap-2">
                            ⏳ Waiting for Buyer to Attach Payment
                            {waitingForReceiptOrders.length > 0 && (
                              <span className="bg-amber-500 text-white rounded-full px-2 py-0.5 text-[10px] font-bold">
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
                            className="px-6 py-6 text-center text-sm font-semibold text-gray-400 italic"
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
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-8 py-5 bg-gray-50/40 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Page <span className="text-gray-900">{page}</span> of{" "}
                  <span className="text-gray-900">{totalPages}</span> ({total} orders)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-white text-[10px] font-bold transition-all disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer bg-white"
                  >
                    PREV
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-white text-[10px] font-bold transition-all disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer bg-white"
                  >
                    NEXT
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Wrapper Page (renders children within Provider) ──────────────────

export default function IncomingOrdersPage() {
  return (
    <SupplierLayout>
      <IncomingOrdersPageContent />
    </SupplierLayout>
  );
}