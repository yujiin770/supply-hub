import { useState, useMemo } from "react";
import {
  Search,
  RefreshCw,
  Eye,
  Edit2,
  AlertCircle,
  ClipboardList,
  CheckSquare,
  Hourglass,
  Ban,
  type LucideIcon,
  ChevronDown,
} from "lucide-react";

// --- StatsCard Component to maintain dashboard alignment ---

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
  borderColor = "border-l-4 border-l-[#21BBD7]",
}: StatsCardProps) => {
  return (
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
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-[#21BBD7] to-[#004797] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </div>
  );
};

interface AddedProduct {
  id: string;
  name: string;
  strength: string;
  form: string;
  route: string;
  basePrice: number | null;
  stock: number | "unlimited";
  status: "Active" | "Pending" | "Disabled";
  addedAt: Date;
}

const INITIAL_PRODUCTS: AddedProduct[] = [
  {
    id: "PROD-101",
    name: "Bisoprolol",
    strength: "5 mg / 1 pack",
    form: "Tablet",
    route: "Oral",
    basePrice: 12.5,
    stock: "unlimited",
    status: "Disabled",
    addedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: "PROD-102",
    name: "Biogesic bbbb",
    strength: "12 mol",
    form: "Lotion",
    route: "Sublingual",
    basePrice: null,
    stock: "unlimited",
    status: "Disabled",
    addedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: "PROD-103",
    name: "Biogesic aaa",
    strength: "1221 mmol",
    form: "Lotion",
    route: "Transdermal",
    basePrice: null,
    stock: "unlimited",
    status: "Disabled",
    addedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: "PROD-104",
    name: "Biogesic 500mg",
    strength: "—",
    form: "Tablet",
    route: "Oral",
    basePrice: 8.2,
    stock: "unlimited",
    status: "Active",
    addedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
  },
  {
    id: "PROD-105",
    name: "Biogesic 2",
    strength: "500 mg",
    form: "Tablet",
    route: "Oral",
    basePrice: 8.2,
    stock: "unlimited",
    status: "Disabled",
    addedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
  },
  {
    id: "PROD-106",
    name: "Biogesic 123",
    strength: "500 mg",
    form: "Tablet",
    route: "Oral",
    basePrice: null,
    stock: "unlimited",
    status: "Pending",
    addedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
  },
  {
    id: "PROD-107",
    name: "Biogesic",
    strength: "500 mg",
    form: "Tablet",
    route: "Oral",
    basePrice: null,
    stock: "unlimited",
    status: "Disabled",
    addedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
  },
  {
    id: "PROD-108",
    name: "Azithromycin-6",
    strength: "500 mg / 1 pack",
    form: "Capsule",
    route: "Oral",
    basePrice: 34.99,
    stock: 450,
    status: "Active",
    addedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
  },
  {
    id: "PROD-109",
    name: "Augmentin 625mg",
    strength: "—",
    form: "Tablet",
    route: "Oral",
    basePrice: 42.15,
    stock: 800,
    status: "Active",
    addedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
  },
  {
    id: "PROD-110",
    name: "Augmentin",
    strength: "125 mg / 500 mg",
    form: "Tablet",
    route: "Oral",
    basePrice: null,
    stock: "unlimited",
    status: "Disabled",
    addedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
  },
  {
    id: "PROD-111",
    name: "Atorvastatin-9",
    strength: "20 mg / 1 pack",
    form: "Capsule",
    route: "Oral",
    basePrice: 18.75,
    stock: "unlimited",
    status: "Active",
    addedAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000),
  },
];

export default function RecentlyAdded() {
  const [products, setProducts] = useState<AddedProduct[]>(INITIAL_PRODUCTS);
  const [timeRange, setTimeRange] = useState<"7" | "14" | "30" | "90">("7");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const filteredProducts = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(timeRange));

    return products.filter((p) => {
      const matchesTime = p.addedAt >= cutoffDate;
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.form.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || p.status === statusFilter;

      return matchesTime && matchesSearch && matchesStatus;
    });
  }, [products, timeRange, searchQuery, statusFilter]);

  const metrics = useMemo(() => {
    const total = filteredProducts.length;
    const active = filteredProducts.filter((p) => p.status === "Active").length;
    const pending = filteredProducts.filter(
      (p) => p.status === "Pending",
    ).length;
    const disabled = filteredProducts.filter(
      (p) => p.status === "Disabled",
    ).length;
    return { total, active, pending, disabled };
  }, [filteredProducts]);

  const handleToggleStatus = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const nextStatusMap: Record<
            string,
            "Active" | "Pending" | "Disabled"
          > = {
            Active: "Disabled",
            Disabled: "Active",
            Pending: "Active",
          };
          return { ...p, status: nextStatusMap[p.status] };
        }
        return p;
      }),
    );
  };

  return (
    <div className="pb-20 max-w-8xl mx-auto animate-fadeIn">
      {/* --- Page Header --- */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Recently Added Items
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Monitor, audit, and manage newly added catalog products waiting
            review or currently active.
          </p>
        </div>

        {/* Timeframe Segment Control */}
        <div className="inline-flex rounded-xl border border-gray-100 bg-white p-1 shadow-sm shrink-0">
          {(["7", "14", "30", "90"] as const).map((days) => (
            <button
              key={days}
              onClick={() => setTimeRange(days)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeRange === days
                  ? "bg-[#004797] text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {days === "7" ? "7 Days" : days === "90" ? "90 Days" : `${days}d`}
            </button>
          ))}
        </div>
      </div>

      {/* --- Metrics Overview Cards --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatsCard
          title="TOTAL ADDED"
          value={`${metrics.total} items`}
          subtitle={`In the last ${timeRange} days`}
          icon={ClipboardList}
          borderColor="border-l-4 border-l-[#21BBD7]"
        />
        <StatsCard
          title="ACTIVE ON MARKET"
          value={`${metrics.active} active`}
          subtitle="Searchable by pharmacies"
          icon={CheckSquare}
          borderColor="border-l-4 border-l-emerald-500"
        />
        <StatsCard
          title="PENDING AUDIT"
          value={`${metrics.pending} pending`}
          subtitle="Verification pending"
          icon={Hourglass}
          borderColor="border-l-4 border-l-amber-500"
        />
        <StatsCard
          title="DISABLED"
          value={`${metrics.disabled} disabled`}
          subtitle="Missing information"
          icon={Ban}
          borderColor="border-l-4 border-l-gray-400"
        />
      </div>

      {/* --- TABLE CONTAINER CARD --- */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        {/* Card Header with Filters */}
        <div className="px-8 py-6 border-b border-gray-50 flex flex-col md:flex-row gap-4 items-center justify-between bg-white">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search recently added items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full appearance-none pl-11 pr-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-semibold text-gray-700 focus:bg-white focus:border-blue-500/30 transition-all outline-none"
            />
          </div>

          <div className="flex gap-3 w-full md:w-auto justify-end">
            <div className="relative shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-3 bg-gray-50 border border-transparent rounded-xl text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer focus:bg-white focus:border-blue-500/30 transition-all outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Disabled">Disabled</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>

            <button
              onClick={() => {
                setProducts(INITIAL_PRODUCTS);
                setSearchQuery("");
                setStatusFilter("All");
              }}
              className="p-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl focus:outline-none transition-colors border border-transparent"
              title="Reset Filters"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Table Body */}
        {filteredProducts.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center p-12">
            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-4">
              <AlertCircle className="w-10 h-10 text-gray-200" />
            </div>
            <h4 className="text-base font-bold text-gray-900">
              No matching items found
            </h4>
            <p className="text-sm text-gray-400 font-medium mt-1 max-w-60">
              Try adjusting your searches or active filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-50 text-left">
              <thead className="bg-gray-50/50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider"
                  >
                    Product / Strength
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider"
                  >
                    Form / Route
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right"
                  >
                    Base Price
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center"
                  >
                    Stock
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider"
                  >
                    Added At
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100 text-sm">
                {filteredProducts.map((p) => {
                  const initial = p.name.charAt(0).toUpperCase();
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50/40 transition-colors"
                    >
                      {/* Product Name */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs border border-emerald-100">
                            {initial}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {p.name}
                            </div>
                            <div className="text-xs text-gray-400">
                              {p.strength}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Form / Route */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900 font-medium">
                          {p.form}
                        </div>
                        <div className="text-xs text-gray-400">{p.route}</div>
                      </td>

                      {/* Base Price */}
                      <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900">
                        {p.basePrice !== null ? (
                          <span>${p.basePrice.toFixed(2)}</span>
                        ) : (
                          <span className="text-xs text-gray-400 italic font-normal">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Stock Details */}
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        {p.stock === "unlimited" ? (
                          <span
                            className="inline-flex items-center text-xl text-gray-400"
                            title="Unlimited Stock"
                          >
                            ∞
                          </span>
                        ) : (
                          <span className="text-gray-800">
                            {p.stock.toLocaleString()} units
                          </span>
                        )}
                      </td>

                      {/* Status Badges */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            p.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : p.status === "Pending"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-gray-50 text-gray-500 border-gray-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              p.status === "Active"
                                ? "bg-emerald-500"
                                : p.status === "Pending"
                                  ? "bg-amber-500"
                                  : "bg-gray-400"
                            }`}
                          />
                          {p.status}
                        </span>
                      </td>

                      {/* Added At Timestamp */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-gray-500">
                        {p.addedAt.toLocaleDateString()} at{" "}
                        {p.addedAt.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleToggleStatus(p.id)}
                            className="p-1.5 text-gray-400 hover:text-[#004797] hover:bg-gray-50 rounded-lg transition-colors"
                            title="Toggle Status"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              alert(
                                `Showing history details for item ID: ${p.id}`,
                              )
                            }
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-gray-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
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
