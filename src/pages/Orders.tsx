import React, { useState, useMemo } from "react";
import {
  Search,
  ClipboardList,
  Hourglass,
  Truck,
  AlertCircle,
  ShoppingBag,
  Eye,
} from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<any>;
  borderColor?: string;
}

const StatsCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  borderColor = "border-l-4 border-l-[#21BBD7]",
}: StatsCardProps) => (
  <div
    className={`bg-white rounded-3xl border border-gray-100 ${borderColor} p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group`}
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
  </div>
);

interface Order {
  id: string;
  pharmacy: string;
  location: string;
  itemsCount: number;
  totalAmount: number;
  status:
    | "Pending"
    | "Awaiting Confirmation"
    | "Awaiting Payment"
    | "Confirmed"
    | "Shipped"
    | "Delivered"
    | "Cancelled";
  date: string;
}

const INITIAL_ORDERS: Order[] = [
  {
    id: "ORD-9021",
    pharmacy: "Mercury Drug Store",
    location: "Makati City",
    itemsCount: 15,
    totalAmount: 4250.0,
    status: "Pending",
    date: "May 25, 2026, 02:30 PM",
  },
  {
    id: "ORD-8419",
    pharmacy: "Generika Drugstore",
    location: "Quezon City",
    itemsCount: 42,
    totalAmount: 18500.25,
    status: "Awaiting Confirmation",
    date: "May 24, 2026, 11:15 AM",
  },
  {
    id: "ORD-8002",
    pharmacy: "Rose Pharmacy",
    location: "Cebu City",
    itemsCount: 8,
    totalAmount: 1250.0,
    status: "Awaiting Payment",
    date: "May 22, 2026, 04:45 PM",
  },
  {
    id: "ORD-7590",
    pharmacy: "Watsons Pharmacy",
    location: "Mandaluyong City",
    itemsCount: 22,
    totalAmount: 9800.0,
    status: "Confirmed",
    date: "May 21, 2026, 09:12 AM",
  },
  {
    id: "ORD-7121",
    pharmacy: "South Star Drug",
    location: "Pasig City",
    itemsCount: 50,
    totalAmount: 24500.0,
    status: "Shipped",
    date: "May 18, 2026, 03:20 PM",
  },
];

interface OrdersProps {
  activeStatus: string;
}

export default function Orders({ activeStatus }: OrdersProps) {
  const [orders] = useState<Order[]>(INITIAL_ORDERS);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: orders.length };
    orders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus = activeStatus === "All" || o.status === activeStatus;
      const matchesSearch =
        o.pharmacy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.location.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [orders, activeStatus, searchQuery]);

  const totalIncomingRevenue = useMemo(() => {
    return orders
      .filter((o) => o.status !== "Cancelled")
      .reduce((sum, o) => sum + o.totalAmount, 0);
  }, [orders]);

  // Generates Tailwind color configurations that match the dashboard's design system
  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Pending":
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          dot: "bg-amber-500",
        };
      case "Awaiting Confirmation":
        return {
          bg: "bg-orange-50 text-orange-800 border-orange-200",
          dot: "bg-orange-500",
        };
      case "Awaiting Payment":
        return {
          bg: "bg-blue-50 text-blue-800 border-blue-200",
          dot: "bg-blue-500",
        };
      case "Confirmed":
        return {
          bg: "bg-cyan-50/60 text-cyan-800 border-cyan-200",
          dot: "bg-[#21BBD7]",
        };
      case "Shipped":
        return {
          bg: "bg-purple-50 text-purple-800 border-purple-200",
          dot: "bg-purple-500",
        };
      case "Delivered":
        return {
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          dot: "bg-emerald-500",
        };
      case "Cancelled":
      default:
        return {
          bg: "bg-gray-50 text-gray-600 border-gray-200",
          dot: "bg-gray-400",
        };
    }
  };

  return (
    <div className="pb-20 max-w-8xl mx-auto animate-fadeIn">
      {/* --- Page Header --- */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Incoming Orders
        </h1>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Coordinate wholesale buyer orders, confirm payment invoices, and
          schedule fulfillment shipments.
        </p>
      </div>

      {/* --- Metric Card Overview --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatsCard
          title="ACTIVE VOLUME"
          value={`${statusCounts["All"] || 0} Orders`}
          subtitle="Awaiting processing"
          icon={ShoppingBag}
          borderColor="border-l-4 border-l-blue-500"
        />
        <StatsCard
          title="REVENUE PIPELINE"
          value={`₱${totalIncomingRevenue.toLocaleString()}`}
          subtitle="Excludes cancelled"
          icon={ClipboardList}
          borderColor="border-l-4 border-l-emerald-500"
        />
        <StatsCard
          title="PENDING CONFIRM"
          value={statusCounts["Pending"] || 0}
          subtitle="Verification required"
          icon={Hourglass}
          borderColor="border-l-4 border-l-amber-500"
        />
        <StatsCard
          title="IN SHIPMENT"
          value={statusCounts["Shipped"] || 0}
          subtitle="In-transit tracking"
          icon={Truck}
          borderColor="border-l-4 border-l-purple-500"
        />
      </div>

      {/* --- Main Table Panel --- */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-125">
        {/* Table Control Header */}
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search buyer pharmacy name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full appearance-none pl-11 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-xs font-semibold text-gray-700 focus:bg-white focus:border-blue-500/30 transition-all outline-none"
            />
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {filteredOrders.length} Orders matching "{activeStatus}"
          </span>
        </div>

        {/* Empty State vs List Table */}
        {filteredOrders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center my-auto">
            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-4">
              <AlertCircle className="w-10 h-10 text-gray-200" />
            </div>
            <h4 className="text-base font-bold text-gray-900">
              No incoming orders yet
            </h4>
            <p className="text-sm text-gray-400 font-medium mt-1 max-w-70">
              Orders matching status "{activeStatus}" will appear here once
              buyers check out.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-50 text-left">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Buyer Pharmacy
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Volume
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                    Invoice Value
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredOrders.map((order) => {
                  const style = getStatusStyles(order.status);
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50/40 transition-all"
                    >
                      {/* Order ID */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-bold text-gray-800">
                        {order.id}
                      </td>

                      {/* Pharmacy Details */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">
                          {order.pharmacy}
                        </div>
                        <div className="text-xs text-gray-400 font-medium">
                          {order.location}
                        </div>
                      </td>

                      {/* Items Volume & Date */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs font-bold text-gray-700">
                          {order.itemsCount} Wholesale lines
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {order.date}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-gray-900">
                        ₱
                        {order.totalAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      {/* Status Badges with Dynamic Color System */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${style.bg}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${style.dot}`}
                          />
                          {order.status === "Awaiting Confirmation"
                            ? "Awaiting Conf."
                            : order.status}
                        </span>
                      </td>

                      {/* Action Operations */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() =>
                              alert(
                                `Showing order breakdown for ID: ${order.id}`,
                              )
                            }
                            className="p-1.5 text-gray-400 hover:text-[#004797] hover:bg-gray-50 rounded-lg transition-colors"
                            title="Audit Order Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
