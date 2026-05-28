import { useMemo } from "react";
import { useAuthStore } from "../auth";
import {
  useIncomingOrders,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  type OrderStatus,
} from "../features/api_clients/order_api";
import { useMyListings } from "../features/api_clients/listing_api";
import SupplierLayout from "../layouts/supplier_layout";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LIST: OrderStatus[] = [
  "PENDING",
  "AWAITING_CONFIRMATION",
  "AWAITING_PAYMENT",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const STATUS_ICON: Record<OrderStatus, string> = {
  PENDING: "⏳",
  AWAITING_CONFIRMATION: "🔔",
  AWAITING_PAYMENT: "💳",
  CONFIRMED: "✅",
  SHIPPED: "🚚",
  DELIVERED: "📦",
  CANCELLED: "✗",
};

const STATUS_BORDER: Record<OrderStatus, string> = {
  PENDING: "border-amber-300",
  AWAITING_CONFIRMATION: "border-orange-300",
  AWAITING_PAYMENT: "border-sky-300",
  CONFIRMED: "border-blue-300",
  SHIPPED: "border-purple-300",
  DELIVERED: "border-emerald-300",
  CANCELLED: "border-slate-300",
};

const STATUS_BAR_BG: Record<OrderStatus, string> = {
  PENDING: "bg-amber-400",
  AWAITING_CONFIRMATION: "bg-orange-400",
  AWAITING_PAYMENT: "bg-sky-400",
  CONFIRMED: "bg-blue-400",
  SHIPPED: "bg-purple-400",
  DELIVERED: "bg-emerald-400",
  CANCELLED: "bg-slate-400",
};

// ── Custom hooks ──────────────────────────────────────────────────────────────

function useOrderCounts() {
  const pending = useIncomingOrders({ limit: 1, offset: 0, status: "PENDING" });
  const awaitingConfirm = useIncomingOrders({
    limit: 1,
    offset: 0,
    status: "AWAITING_CONFIRMATION",
  });
  const awaitingPayment = useIncomingOrders({
    limit: 1,
    offset: 0,
    status: "AWAITING_PAYMENT",
  });
  const confirmed = useIncomingOrders({
    limit: 1,
    offset: 0,
    status: "CONFIRMED",
  });
  const shipped = useIncomingOrders({ limit: 1, offset: 0, status: "SHIPPED" });
  const delivered = useIncomingOrders({
    limit: 1,
    offset: 0,
    status: "DELIVERED",
  });
  const cancelled = useIncomingOrders({
    limit: 1,
    offset: 0,
    status: "CANCELLED",
  });

  const counts: Record<OrderStatus, number> = {
    PENDING: pending.data?.total ?? 0,
    AWAITING_CONFIRMATION: awaitingConfirm.data?.total ?? 0,
    AWAITING_PAYMENT: awaitingPayment.data?.total ?? 0,
    CONFIRMED: confirmed.data?.total ?? 0,
    SHIPPED: shipped.data?.total ?? 0,
    DELIVERED: delivered.data?.total ?? 0,
    CANCELLED: cancelled.data?.total ?? 0,
  };

  const isLoading =
    pending.isLoading ||
    awaitingConfirm.isLoading ||
    awaitingPayment.isLoading ||
    confirmed.isLoading ||
    shipped.isLoading ||
    delivered.isLoading ||
    cancelled.isLoading;

  const total = STATUS_LIST.reduce((s, k) => s + counts[k], 0);
  return { counts, total, isLoading };
}

// ── Item velocity hook ───────────────────────────────────────────────────────

interface ItemVelocity {
  pack_id: string;
  name: string;
  detail: string;
  totalQty: number;
  orderCount: number;
}

function useItemVelocity() {
  // Fetch a generous batch of all recent orders (no status filter) for aggregation
  const q = useIncomingOrders({ limit: 100, offset: 0 });

  const items = useMemo<ItemVelocity[]>(() => {
    if (!q.data?.items) return [];
    const map = new Map<string, ItemVelocity>();
    for (const order of q.data.items) {
      if (order.status === "CANCELLED") continue;
      for (const item of order.items) {
        const existing = map.get(item.pack_id);
        if (existing) {
          existing.totalQty += item.quantity;
          existing.orderCount += 1;
        } else {
          map.set(item.pack_id, {
            pack_id: item.pack_id,
            name: item.brand_name ?? item.pack_id,
            detail: item.dosage_form_name ?? "",
            totalQty: item.quantity,
            orderCount: 1,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [q.data]);

  const sorted = useMemo(
    () => [...items].sort((a, b) => b.totalQty - a.totalQty),
    [items],
  );

  return {
    fast: sorted.slice(0, 5),
    slow: sorted.length > 5 ? sorted.slice(-5).reverse() : [],
    isLoading: q.isLoading,
  };
}

// ── Item velocity table component ─────────────────────────────────────────────

function ItemVelocityTable({
  title,
  badge,
  badgeBg,
  items,
  isLoading,
  accentBar,
  emptyText,
}: {
  title: string;
  badge: string;
  badgeBg: string;
  items: ItemVelocity[];
  isLoading: boolean;
  accentBar: string;
  emptyText: string;
}) {
  const max = Math.max(...items.map((i) => i.totalQty), 1);
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-6 py-5 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <span
          className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${badgeBg}`}
        >
          {badge}
        </span>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 bg-slate-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => {
            const pct = Math.max((item.totalQty / max) * 100, 4);
            return (
              <div key={item.pack_id} className="flex items-center gap-3">
                <span className="w-5 text-xs font-bold text-slate-400 text-right shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                    {item.name}
                  </p>
                  {item.detail && (
                    <p className="text-xs text-slate-400 truncate leading-tight">
                      {item.detail}
                    </p>
                  )}
                  <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${accentBar} transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-slate-800">
                    {item.totalQty.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400">
                    {item.orderCount} order{item.orderCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Charts ────────────────────────────────────────────────────────────────────

function OrdersBarChart({
  counts,
  isLoading,
}: {
  counts: Record<OrderStatus, number>;
  isLoading: boolean;
}) {
  const max = Math.max(...STATUS_LIST.map((s) => counts[s]), 1);
  return (
    <div className="space-y-3">
      {STATUS_LIST.map((status) => {
        const count = counts[status];
        const pct = (count / max) * 100;
        const { text } = ORDER_STATUS_COLORS[status];
        return (
          <div key={status} className="flex items-center gap-3">
            <div className="w-44 text-xs text-slate-500 text-right shrink-0 truncate">
              {STATUS_ICON[status]} {ORDER_STATUS_LABELS[status]}
            </div>
            <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
              {isLoading ? (
                <div className="h-full w-1/3 rounded-full bg-slate-200 animate-pulse" />
              ) : (
                <div
                  className={`h-full rounded-full ${STATUS_BAR_BG[status]} transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              )}
            </div>
            <div
              className={`w-10 text-right text-sm font-bold ${text} shrink-0`}
            >
              {isLoading ? "…" : count}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StockOverviewChart({
  withStock,
  noStock,
  disabled,
  isLoading,
}: {
  withStock: number;
  noStock: number;
  disabled: number;
  isLoading: boolean;
}) {
  const bars = [
    {
      label: "Has Stock",
      count: withStock,
      bg: "bg-emerald-500",
      text: "text-emerald-700",
    },
    {
      label: "No Stock",
      count: noStock,
      bg: "bg-amber-400",
      text: "text-amber-700",
    },
    {
      label: "Disabled",
      count: disabled,
      bg: "bg-slate-400",
      text: "text-slate-600",
    },
  ];
  const max = Math.max(...bars.map((b) => b.count), 1);

  return (
    <div className="flex items-end gap-6 h-44 pt-4">
      {bars.map((bar) => {
        const heightPct = (bar.count / max) * 100;
        return (
          <div
            key={bar.label}
            className="flex-1 flex flex-col items-center gap-2"
          >
            <span className={`text-sm font-bold ${bar.text}`}>
              {isLoading ? "…" : bar.count}
            </span>
            <div
              className="w-full bg-slate-100 rounded-t-lg overflow-hidden flex flex-col justify-end"
              style={{ height: "120px" }}
            >
              {isLoading ? (
                <div className="h-1/2 w-full bg-slate-200 animate-pulse" />
              ) : (
                <div
                  className={`w-full ${bar.bg} rounded-t-lg transition-all duration-700`}
                  style={{ height: `${heightPct}%` }}
                />
              )}
            </div>
            <span className="text-xs text-slate-500 text-center leading-tight">
              {bar.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const {
    counts,
    total: totalOrders,
    isLoading: ordersLoading,
  } = useOrderCounts();
  const listingsQ = useMyListings({ limit: 200, offset: 0 });
  const { fast, slow, isLoading: velocityLoading } = useItemVelocity();

  const listings = listingsQ.data?.items ?? [];
  const totalListings = listingsQ.data?.total ?? 0;
  const totalStockUnits = listings.reduce((s, l) => s + (l.stock_qty ?? 0), 0);
  const withStock = listings.filter(
    (l) => l.is_enabled && (l.stock_qty ?? 0) > 0,
  ).length;
  const noStock = listings.filter(
    (l) => l.is_enabled && !((l.stock_qty ?? 0) > 0),
  ).length;
  const disabledCount = listings.filter((l) => !l.is_enabled).length;

  const totalOrderItems = STATUS_LIST.filter((s) => s !== "CANCELLED").reduce(
    (sum, s) => sum + counts[s],
    0,
  );

  return (
    <SupplierLayout>
      <div className="space-y-8">
        {/* Page title */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-500 text-sm mt-1">
            Welcome back, {user?.full_name ?? user?.email}. Here's your
            overview.
          </p>
        </div>

        {/* ── Order status cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-4 lg:grid-cols-7 gap-3">
          {STATUS_LIST.map((status) => {
            const { text } = ORDER_STATUS_COLORS[status];
            return (
              <div
                key={status}
                className={`bg-white border-2 ${STATUS_BORDER[status]} rounded-xl px-4 py-4 flex flex-col gap-1`}
              >
                <span className="text-xl">{STATUS_ICON[status]}</span>
                <p className={`text-2xl font-extrabold ${text}`}>
                  {ordersLoading ? (
                    <span className="inline-block w-8 h-7 bg-slate-200 rounded animate-pulse" />
                  ) : (
                    counts[status]
                  )}
                </p>
                <p className="text-xs text-slate-500 leading-tight">
                  {ORDER_STATUS_LABELS[status]}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── Summary metrics row ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Total Orders",
              value: ordersLoading ? null : totalOrders,
              sub: "All statuses combined",
              color: "text-slate-900",
              icon: "📋",
            },
            {
              label: "Active Orders",
              value: ordersLoading ? null : totalOrderItems,
              sub: "Excl. cancelled",
              color: "text-blue-700",
              icon: "🔄",
            },
            {
              label: "Catalog Items",
              value: listingsQ.isLoading ? null : totalListings,
              sub: "Total listings",
              color: "text-emerald-700",
              icon: "📦",
            },
            {
              label: "Total Stock Units",
              value: listingsQ.isLoading
                ? null
                : totalStockUnits.toLocaleString(),
              sub: "Sum of stock_qty",
              color: "text-purple-700",
              icon: "🏭",
            },
          ].map(({ label, value, sub, color, icon }) => (
            <div
              key={label}
              className="bg-white border border-slate-200 rounded-xl px-5 py-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{icon}</span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {label}
                </span>
              </div>
              {value === null ? (
                <div className="h-7 w-20 bg-slate-200 rounded animate-pulse" />
              ) : (
                <p className={`text-3xl font-extrabold ${color} leading-none`}>
                  {value}
                </p>
              )}
              <p className="text-xs text-slate-400 mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Charts ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orders by status — bar chart (takes 2/3 width) */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl px-6 py-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-5">
              Orders by Status
            </h3>
            <OrdersBarChart counts={counts} isLoading={ordersLoading} />
          </div>

          {/* Stock overview — column chart (takes 1/3 width) */}
          <div className="bg-white border border-slate-200 rounded-xl px-6 py-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              Stock Overview
            </h3>
            <p className="text-xs text-slate-400 mb-2">
              Listings breakdown by availability
            </p>
            <StockOverviewChart
              withStock={withStock}
              noStock={noStock}
              disabled={disabledCount}
              isLoading={listingsQ.isLoading}
            />
          </div>
        </div>

        {/* ── Fast vs Slow movers ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ItemVelocityTable
            title="Fast-Moving Items"
            badge="Top 5"
            badgeBg="bg-emerald-100 text-emerald-700"
            items={fast}
            isLoading={velocityLoading}
            accentBar="bg-emerald-500"
            emptyText="No order data yet. Start receiving orders to see fast movers."
          />
          <ItemVelocityTable
            title="Slow-Moving Items"
            badge="Bottom 5"
            badgeBg="bg-amber-100 text-amber-700"
            items={slow}
            isLoading={velocityLoading}
            accentBar="bg-amber-400"
            emptyText="Not enough data yet — need more than 5 distinct ordered items."
          />
        </div>

        {/* ── Orders vs Stock comparison ─────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl px-6 py-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            Orders vs Stock at a Glance
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            Active order pipeline compared to catalog readiness
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: "Pending Orders",
                value: counts["PENDING"],
                total: totalOrders || 1,
                bg: "bg-amber-400",
                text: "text-amber-700",
                loading: ordersLoading,
              },
              {
                label: "Orders Confirmed",
                value: counts["CONFIRMED"] + counts["SHIPPED"],
                total: totalOrders || 1,
                bg: "bg-blue-400",
                text: "text-blue-700",
                loading: ordersLoading,
              },
              {
                label: "Catalog In-Stock",
                value: withStock,
                total: totalListings || 1,
                bg: "bg-emerald-400",
                text: "text-emerald-700",
                loading: listingsQ.isLoading,
              },
              {
                label: "Catalog Out-of-Stock",
                value: noStock,
                total: totalListings || 1,
                bg: "bg-orange-400",
                text: "text-orange-700",
                loading: listingsQ.isLoading,
              },
            ].map(({ label, value, total, bg, text, loading }) => {
              const pct = total > 0 ? Math.round((value / total) * 100) : 0;
              return (
                <div key={label}>
                  <div className="flex items-end justify-between mb-1.5">
                    <span className="text-xs text-slate-500">{label}</span>
                    <span className={`text-xs font-semibold ${text}`}>
                      {loading ? "…" : `${pct}%`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    {loading ? (
                      <div className="h-full w-1/2 bg-slate-200 animate-pulse" />
                    ) : (
                      <div
                        className={`h-full rounded-full ${bg} transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-lg font-bold ${text}`}>
                      {loading ? "…" : value}
                    </span>
                    <span className="text-xs text-slate-400">
                      of {loading ? "…" : total}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SupplierLayout>
  );
}
