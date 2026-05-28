import React, { useEffect, useState } from "react";
import { Toaster } from "sonner";
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
import LoadingSkeleton from "../components/ui/LoadingSkeleton";

// --- internal Sub-Components for Dashboard ---

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "status" | "summary";
  borderColor?: string;
}

const StatsCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "status",
  borderColor = "border-l-4 border-l-[#21BBD7]",
}: StatsCardProps) => {
  if (variant === "status") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between h-32 group">
        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#F0FAFB] to-[#E6F0F9] text-[#21BBD7] flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:from-[#21BBD7] group-hover:to-[#004797] group-hover:text-white">
          <Icon className="w-5 h-5" />
        </div>
        <div className="mt-2">
          <div className="text-3xl font-semibold text-gray-800 leading-none">
            {value}
          </div>
          <div className="text-xs text-gray-500 font-medium mt-1.5 leading-tight">
            {title}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 ${borderColor} p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group`}
    >
      <div className="absolute inset-0 bg-linear-to-r from-[#21BBD7]/0 to-[#004797]/0 group-hover:from-[#21BBD7]/5 group-hover:to-[#004797]/5 transition-all duration-500"></div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="w-12 h-12 rounded-xl from-[#21BBD7]/10 to-[#004797]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-6 h-6 text-[#004797] group-hover:text-[#21BBD7] transition-colors" />
        </div>
      </div>
      <div className="relative z-10">
        <div className="text-3xl md:text-4xl font-semibold text-gray-900 mb-2 tracking-tight">
          {value}
        </div>
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
          {title}
        </div>
        {subtitle && (
          <div className="text-xs text-gray-500 font-medium flex items-center gap-1">
            <span className="inline-block w-1 h-1 rounded-full bg-[#21BBD7]"></span>
            {subtitle}
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-[#21BBD7] to-[#004797] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </div>
  );
};

const OrdersByStatus = ({ orders }: { orders: Record<string, number> }) => {
  const statuses = [
    { label: "Pending", icon: Hourglass, color: "bg-amber-500" },
    { label: "Awaiting Confirmation", icon: Bell, color: "bg-orange-500" },
    { label: "Awaiting Payment", icon: CreditCard, color: "bg-blue-500" },
    { label: "Confirmed", icon: CheckSquare, color: "bg-[#21BBD7]" },
    { label: "Shipped", icon: Truck, color: "bg-purple-500" },
    { label: "Delivered", icon: Package, color: "bg-emerald-500" },
    {
      label: "Cancelled",
      icon: X,
      color: "bg-gray-400",
      bgColor: "bg-gray-50",
    },
  ];

  const totalOrders = Object.values(orders).reduce((a, b) => a + b, 0);

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
          Total: {totalOrders}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {statuses.map((status) => {
          const actualCount =
            status.label === "Awaiting Confirmation"
              ? orders["Awaiting Your Confirmation"]
              : orders[status.label] || 0;
          const Icon = status.icon;
          return (
            <div
              key={status.label}
              className="group relative overflow-hidden rounded-xl border border-gray-100 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className={`h-1 w-full ${status.color}`}></div>
              <div className="p-4">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 bg-gray-50`}
                >
                  <Icon className={`w-4 h-4 text-gray-600`} />
                </div>
                <div className="text-2xl font-bold text-gray-800 mb-1">
                  {actualCount}
                </div>
                <div className="text-xs text-gray-500 font-medium truncate">
                  {status.label}
                </div>
                <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${status.color} rounded-full transition-all duration-500`}
                    style={{
                      width:
                        totalOrders === 0
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

const StockOverview = ({
  hasStock,
  noStock,
  disabled,
}: {
  hasStock: number;
  noStock: number;
  disabled: number;
}) => {
  const total = hasStock + noStock + disabled;
  const items = [
    {
      label: "Has Stock",
      count: hasStock,
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
      count: disabled,
      icon: Ban,
      color: "from-gray-400 to-gray-600",
      textColor: "text-gray-600",
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-bold text-gray-800">Stock Overview</h3>
        <div className="bg-gray-100 px-2 py-1 rounded-lg">
          <span className="text-xs font-semibold text-gray-600">
            Total: {total}
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
              <span className="text-lg font-bold">{item.count}</span>
            </div>
            <div
              className={`w-full h-32 rounded-xl transition-all duration-300 ${item.count > 0 ? `bg-linear-to-b ${item.color} shadow-sm` : "bg-gray-100"}`}
            >
              {item.count > 0 && (
                <div className="w-full h-full flex items-end justify-center pb-2">
                  <span className="text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.count} items
                  </span>
                </div>
              )}
            </div>
            <span className="text-xs font-medium text-gray-500 mt-3 group-hover:text-gray-700 transition-colors">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const TopItems = ({ type, items }: { type: "fast" | "slow"; items: any[] }) => {
  const isFast = type === "fast";
  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 p-6 h-full min-h-50">
      <div className="flex items-center gap-3 mb-6">
        <div
          className={`p-2 rounded-lg ${isFast ? "bg-[#F0FAFB] text-[#21BBD7]" : "bg-orange-50 text-orange-500"}`}
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
      {items.length === 0 ? (
        <div className="h-32 flex items-center justify-center border-2  border-gray-100 rounded-xl">
          <p className="text-gray-400 text-sm font-medium">
            Not enough data available
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? "bg-[#004797] text-white" : "bg-gray-100 text-gray-500"}`}
              >
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-800 truncate">
                  {item.name}
                </div>
                <div className="text-xs text-gray-400 font-medium truncate">
                  {item.category}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-semibold text-[#004797] leading-none">
                  {item.orders}
                </div>
                <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                  Orders
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- New Glance Sub-Component ---
const GlanceMetric = ({ label, value, total, color, percent }: any) => (
  <div className="flex flex-col gap-1.5 flex-1">
    <div className="flex justify-between items-center px-1">
      <span className="text-[13px] font-medium text-gray-500">{label}</span>
      <span className={`text-[13px] font-bold ${color}`}>{percent}%</span>
    </div>
    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
      <div
        className={`h-full ${color.replace("text-", "bg-")} transition-all duration-1000`}
        style={{ width: `${percent}%` }}
      />
    </div>
    <div className="flex items-baseline gap-1.5 px-1 mt-1">
      <span className="text-2xl font-bold text-gray-900 leading-none">{value}</span>
      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">of {total}</span>
    </div>
  </div>
);

// --- Main Dashboard Page ---

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);

  const stats = {
    pending: 0,
    awaitingConfirmation: 0,
    awaitingPayment: 0,
    confirmed: 1,
    shipped: 0,
    delivered: 1,
    cancelled: 0,
  };
  const ordersByStatus = {
    Pending: stats.pending,
    "Awaiting Your Confirmation": stats.awaitingConfirmation,
    "Awaiting Payment": stats.awaitingPayment,
    Confirmed: stats.confirmed,
    Shipped: stats.shipped,
    Delivered: stats.delivered,
    Cancelled: stats.cancelled,
  };

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <>
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded-md w-48 animate-pulse mb-2"></div>
          <div className="h-4 bg-gray-200 rounded-md w-72 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <LoadingSkeleton type="summary" count={4} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <LoadingSkeleton type="chart" />
          </div>
          <div className="lg:col-span-1">
            <LoadingSkeleton type="chart" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Welcome back, Lander Gallego Ambito, Here's your overview
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatsCard
          title="TOTAL ORDERS"
          value={2}
          subtitle="All statuses combined"
          icon={ClipboardList}
          variant="summary"
        />
        <StatsCard
          title="ACTIVE ORDERS"
          value={2}
          subtitle="Excl. cancelled"
          icon={RefreshCw}
          variant="summary"
        />
        <StatsCard
          title="CATALOG ITEMS"
          value={2}
          subtitle="Total listings"
          icon={Box}
          variant="summary"
        />
        <StatsCard
          title="STOCK UNITS"
          value={0}
          subtitle="Sum of stock_qty"
          icon={Building2}
          variant="summary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <OrdersByStatus orders={ordersByStatus} />
        </div>
        <div className="lg:col-span-1">
          <StockOverview hasStock={0} noStock={2} disabled={0} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <TopItems
          type="fast"
          items={[
            {
              name: "Care Adult Diaper L 5S",
              category: "Hygiene Device",
              orders: 5,
            },
          ]}
        />
        <TopItems type="slow" items={[]} />
      </div>

      {/* --- ADDED SECTION: ORDERS VS STOCK AT A GLANCE --- */}
      <div className="bg-white rounded-[24px] border border-gray-100 p-8 shadow-[0_2px_12px_rgba(0,0,0,0.02)] mb-12">
        <div className="mb-8">
          <h3 className="text-lg font-bold text-[#004797]">Orders vs Stock at a Glance</h3>
          <p className="text-[13px] text-gray-400 font-medium mt-0.5">
            Active order pipeline compared to catalog readiness
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <GlanceMetric 
            label="Pending Orders" 
            value={0} 
            total={1} 
            color="text-orange-500" 
            percent={0} 
          />
          <GlanceMetric 
            label="Orders Confirmed" 
            value={0} 
            total={1} 
            color="text-blue-500" 
            percent={0} 
          />
          <GlanceMetric 
            label="Catalog In-Stock" 
            value={0} 
            total={50} 
            color="text-emerald-500" 
            percent={0} 
          />
          <GlanceMetric 
            label="Catalog Out-of-Stock" 
            value={1} 
            total={50} 
            color="text-orange-600" 
            percent={2} 
          />
        </div>
      </div>
    </>
  );
};

export default Dashboard;