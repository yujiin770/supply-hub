import { useMemo } from "react";
import { useAuthStore } from "../auth";
import {
  useIncomingOrders,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "../features/api_clients/order_api";
import { useMyListings } from "../features/api_clients/listing_api";
import SupplierLayout from "../layouts/supplier_layout";
import {
  ClipboardList,
  RefreshCw,
  Box,
  Building2,
  Hourglass,
  Bell,
  CreditCard,
  CheckSquare,
  Truck,
  Package,
  X,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Ban,
  type LucideIcon,
} from "lucide-react";

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

// ── Sub-Components mapped to the new layout ──────────────────────────────────

interface StatsCardProps {
  title: string;
  value: number | string | null;
  subtitle: string;
  icon: LucideIcon;
  borderColor?: string;
  loading: boolean;
}

const StatsCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  borderColor = "border-l-4 border-l-[#21BBD7]",
  loading,
}: StatsCardProps) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 ${borderColor} p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group`}
    >
      <div className="absolute inset-0 bg-linear-to-r from-[#21BBD7]/0 to-[#004797]/0 group-hover:from-[#21BBD7]/5 group-hover:to-[#004797]/5 transition-all duration-500"></div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="w-12 h-12 rounded-xl bg-[#21BBD7]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-6 h-6 text-[#004797] group-hover:text-[#21BBD7] transition-colors" />
        </div>
      </div>
      <div className="relative z-10">
        {loading || value === null ? (
          <div className="h-9 w-24 bg-gray-200 rounded-md animate-pulse mb-2"></div>
        ) : (
          <div className="text-3xl md:text-4xl font-semibold text-gray-900 mb-2 tracking-tight">
            {value}
          </div>
        )}
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
          {title}
        </div>
        <div className="text-xs text-gray-500 font-medium flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#21BBD7]"></span>
          {subtitle}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-[#21BBD7] to-[#004797] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </div>
  );
};

const OrdersByStatusGrid = ({
  counts,
  isLoading,
  totalOrders,
}: {
  counts: Record<OrderStatus, number>;
  isLoading: boolean;
  totalOrders: number;
}) => {
  const statuses = [
    { key: "PENDING" as OrderStatus, icon: Hourglass, color: "bg-amber-500" },
    {
      key: "AWAITING_CONFIRMATION" as OrderStatus,
      icon: Bell,
      color: "bg-orange-500",
    },
    {
      key: "AWAITING_PAYMENT" as OrderStatus,
      icon: CreditCard,
      color: "bg-blue-500",
    },
    {
      key: "CONFIRMED" as OrderStatus,
      icon: CheckSquare,
      color: "bg-[#21BBD7]",
    },
    { key: "SHIPPED" as OrderStatus, icon: Truck, color: "bg-purple-500" },
    { key: "DELIVERED" as OrderStatus, icon: Package, color: "bg-emerald-500" },
    { key: "CANCELLED" as OrderStatus, icon: X, color: "bg-gray-400" },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Orders by Status</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Order distribution overview
          </p>
        </div>
        <div className="bg-[#004797] text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm">
          Total: {isLoading ? "…" : totalOrders}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {statuses.map((status) => {
          const actualCount = counts[status.key];
          const Icon = status.icon;
          return (
            <div
              key={status.key}
              className="group relative overflow-hidden rounded-xl border border-gray-100 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className={`h-1 w-full ${status.color}`}></div>
              <div className="p-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 bg-gray-50">
                  <Icon className="w-4 h-4 text-gray-600" />
                </div>
                {isLoading ? (
                  <div className="h-8 w-12 bg-gray-100 rounded animate-pulse mb-1"></div>
                ) : (
                  <div className="text-2xl font-bold text-gray-800 mb-1">
                    {actualCount}
                  </div>
                )}
                <div className="text-xs text-gray-500 font-medium truncate">
                  {ORDER_STATUS_LABELS[status.key]}
                </div>
                <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${status.color} rounded-full transition-all duration-500`}
                    style={{
                      width:
                        totalOrders === 0 || isLoading
                          ? "0%"
                          : `${(actualCount / totalOrders) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StockOverviewCard = ({
  withStock,
  noStock,
  disabledCount,
  isLoading,
}: {
  withStock: number;
  noStock: number;
  disabledCount: number;
  isLoading: boolean;
}) => {
  const total = withStock + noStock + disabledCount;
  const items = [
    {
      label: "Has Stock",
      count: withStock,
      icon: Package,
      color: "from-green-400 to-green-600",
      textColor: "text-green-600",
    },
    {
      label: "No Stock",
      count: noStock,
      icon: AlertCircle,
      color: "from-red-400 to-red-600",
      textColor: "text-red-600",
    },
    {
      label: "Disabled",
      count: disabledCount,
      icon: Ban,
      color: "from-gray-400 to-gray-600",
      textColor: "text-gray-600",
    },
  ];

  return (
    <div className="bg-white rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 p-6 flex flex-col h-full hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-bold text-gray-800">Stock Overview</h3>
        <div className="bg-gray-100 px-2.5 py-1 rounded-lg">
          <span className="text-xs font-bold text-gray-600">
            Total: {isLoading ? "…" : total}
          </span>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Listings breakdown by availability
      </p>
      <div className="grid grid-cols-3 gap-4 sm:gap-8 flex-1 content-end pb-4">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col items-center group">
            <div className={`flex items-center gap-1 mb-2 ${item.textColor}`}>
              <item.icon className="w-4 h-4" />
              <span className="text-lg font-bold">
                {isLoading ? "…" : item.count}
              </span>
            </div>
            <div
              className={`w-full h-32 rounded-xl transition-all duration-300 ${
                item.count > 0 && !isLoading
                  ? `bg-linear-to-b ${item.color} shadow-sm`
                  : "bg-gray-100"
              }`}
            >
              {item.count > 0 && !isLoading && (
                <div className="w-full h-full flex items-end justify-center pb-2">
                  <span className="text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.count} items
                  </span>
                </div>
              )}
            </div>
            <span className="text-xs font-medium text-gray-500 mt-3 group-hover:text-gray-700 transition-colors text-center leading-tight">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const TopItemsTable = ({
  type,
  items,
  isLoading,
}: {
  type: "fast" | "slow";
  items: ItemVelocity[];
  isLoading: boolean;
}) => {
  const isFast = type === "fast";
  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 p-6 h-full min-h-50">
      <div className="flex items-center gap-3 mb-6">
        <div
          className={`p-2 rounded-lg ${
            isFast
              ? "bg-[#F0FAFB] text-[#21BBD7]"
              : "bg-orange-50 text-orange-500"
          }`}
        >
          {isFast ? (
            <TrendingUp className="w-5 h-5" />
          ) : (
            <TrendingDown className="w-5 h-5" />
          )}
        </div>
        <h3 className="text-lg font-bold text-gray-800">
          {isFast ? "Fast-Moving Items" : "Slow-Moving Items"}
        </h3>
      </div>
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="h-32 flex items-center justify-center border-2 border-gray-100 rounded-xl">
          <p className="text-gray-400 text-sm font-medium">
            Not enough data available
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, idx) => (
            <div
              key={item.pack_id}
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  idx === 0
                    ? "bg-[#004797] text-white"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-800 truncate">
                  {item.name}
                </div>
                <div className="text-xs text-gray-400 font-medium truncate">
                  {item.detail}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-semibold text-[#004797] leading-none">
                  {item.totalQty}
                </div>
                <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                  {item.orderCount} Order{item.orderCount !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const GlanceProgressMetric = ({
  label,
  value,
  total,
  color,
  loading,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  loading: boolean;
}) => {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5 flex-1">
      <div className="flex justify-between items-center px-1">
        <span className="text-[13px] font-medium text-gray-500">{label}</span>
        <span className={`text-[13px] font-bold ${color}`}>
          {loading ? "…" : `${percent}%`}
        </span>
      </div>
      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
        {loading ? (
          <div className="h-full w-1/2 bg-gray-200 animate-pulse" />
        ) : (
          <div
            className={`h-full ${color.replace("text-", "bg-")} transition-all duration-1000`}
            style={{ width: `${percent}%` }}
          />
        )}
      </div>
      <div className="flex items-baseline gap-1.5 px-1 mt-1">
        <span className="text-2xl font-bold text-gray-900 leading-none">
          {loading ? "…" : value}
        </span>
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
          of {loading ? "…" : total}
        </span>
      </div>
    </div>
  );
};

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
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Welcome back, {user?.full_name ?? user?.email}, Here's your overview
        </p>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatsCard
          title="TOTAL ORDERS"
          value={totalOrders}
          subtitle="All statuses combined"
          icon={ClipboardList}
          loading={ordersLoading}
        />
        <StatsCard
          title="ACTIVE ORDERS"
          value={totalOrderItems}
          subtitle="Excl. cancelled"
          icon={RefreshCw}
          loading={ordersLoading}
          borderColor="border-l-4 border-l-blue-500"
        />
        <StatsCard
          title="CATALOG ITEMS"
          value={totalListings}
          subtitle="Total listings"
          icon={Box}
          loading={listingsQ.isLoading}
          borderColor="border-l-4 border-l-emerald-500"
        />
        <StatsCard
          title="STOCK UNITS"
          value={totalStockUnits.toLocaleString()}
          subtitle="Sum of stock_qty"
          icon={Building2}
          loading={listingsQ.isLoading}
          borderColor="border-l-4 border-l-purple-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <OrdersByStatusGrid
            counts={counts}
            isLoading={ordersLoading}
            totalOrders={totalOrders}
          />
        </div>
        <div className="lg:col-span-1">
          <StockOverviewCard
            withStock={withStock}
            noStock={noStock}
            disabledCount={disabledCount}
            isLoading={listingsQ.isLoading}
          />
        </div>
      </div>

      {/* Item Velocity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <TopItemsTable type="fast" items={fast} isLoading={velocityLoading} />
        <TopItemsTable type="slow" items={slow} isLoading={velocityLoading} />
      </div>

      {/* Orders vs Stock Section */}
      <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-[0_2px_12px_rgba(0,0,0,0.02)] mb-12">
        <div className="mb-8">
          <h3 className="text-lg font-bold text-[#004797]">
            Orders vs Stock at a Glance
          </h3>
          <p className="text-[13px] text-gray-400 font-medium mt-0.5">
            Active order pipeline compared to catalog readiness
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <GlanceProgressMetric
            label="Pending Orders"
            value={counts["PENDING"]}
            total={totalOrders || 1}
            color="text-orange-500"
            loading={ordersLoading}
          />
          <GlanceProgressMetric
            label="Orders Confirmed"
            value={counts["CONFIRMED"] + counts["SHIPPED"]}
            total={totalOrders || 1}
            color="text-blue-500"
            loading={ordersLoading}
          />
          <GlanceProgressMetric
            label="Catalog In-Stock"
            value={withStock}
            total={totalListings || 1}
            color="text-emerald-500"
            loading={listingsQ.isLoading}
          />
          <GlanceProgressMetric
            label="Catalog Out-of-Stock"
            value={noStock}
            total={totalListings || 1}
            color="text-orange-600"
            loading={listingsQ.isLoading}
          />
        </div>
      </div>
    </SupplierLayout>
  );
}
