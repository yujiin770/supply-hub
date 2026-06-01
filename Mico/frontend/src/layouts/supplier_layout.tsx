import React, { useState, useEffect, createContext, useContext } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { useAuthStore } from "../auth";
import { useMySupplierProfile } from "../features/api_clients/supplier_api";
import { orderApi, orderQueryKeys } from "../features/api_clients/order_api";
import { ImpersonationBanner } from "../components/impersonation_banner";
import {
  ShoppingBag,
  Hourglass,
  Bell,
  CreditCard,
  CheckSquare,
  Truck,
  Package,
  Ban,
  ArrowLeft,
  LogOut,
} from "lucide-react";

// Context to share selected order filter with whichever page is rendered in {children}
export const OrdersFilterContext = createContext<{
  orderStatus: string;
  setOrderStatus: (status: string) => void;
}>({
  orderStatus: "All",
  setOrderStatus: () => {},
});

// Custom hook to consume the orders context easily in your child components
export function useOrdersFilter() {
  return useContext(OrdersFilterContext);
}

function NavItem({
  to,
  label,
  icon,
  locked,
  isCollapsed,
  badgeCount,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  locked?: boolean;
  isCollapsed?: boolean;
  badgeCount?: number;
}) {
  if (locked) {
    return (
      <div
        title={
          isCollapsed
            ? `${label} (Locked - available after your account is approved)`
            : "Available after your account is approved"
        }
        className={`group flex items-center rounded-xl text-slate-400 cursor-not-allowed select-none transition-all py-2.5 px-3.5
          ${isCollapsed ? "justify-center" : "gap-3"}`}
      >
        <span className="transition-transform duration-200 ease-in-out group-hover:scale-110 shrink-0">
          {icon}
        </span>
        {!isCollapsed && (
          <>
            <span className="text-xs font-semibold uppercase tracking-wide truncate">
              {label}
            </span>
            <span className="ml-auto text-[10px] bg-slate-100 text-slate-400 rounded px-1.5 py-0.5 font-semibold uppercase">
              Locked
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={to}
      title={isCollapsed ? label : undefined}
      className={({ isActive }) =>
        `group flex items-center rounded-xl text-xs font-semibold uppercase tracking-wide transition-all py-2.5 px-3.5 ${
          isCollapsed ? "justify-center" : "gap-3"
        } ${
          isActive
            ? "bg-blue-50 text-blue-800"
            : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
        }`
      }
    >
      <span className="transition-transform duration-200 ease-in-out group-hover:scale-110 shrink-0">
        {icon}
      </span>
      {!isCollapsed && <span className="truncate">{label}</span>}
      {!isCollapsed && badgeCount && badgeCount > 0 ? (
        <span className="ml-auto text-[10px] bg-blue-600 text-white rounded-full px-1.5 py-0.5 font-bold">
          {badgeCount}
        </span>
      ) : null}
    </NavLink>
  );
}

// Icon Components (using unified Lucide styling)
const IconArrowLeft = () => <ArrowLeft className="w-4 h-4 shrink-0" />;
const IconHome = () => (
  <svg
    className="w-5 h-5 shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);
const IconDoc = () => (
  <svg
    className="w-5 h-5 shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);
const IconUpload = () => (
  <svg
    className="w-5 h-5 shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
    />
  </svg>
);
const IconCatalog = () => (
  <svg
    className="w-5 h-5 shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    />
  </svg>
);
const IconSearch = () => (
  <svg
    className="w-5 h-5 shrink-0"
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
);
const IconOrders = () => (
  <svg
    className="w-5 h-5 shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    />
  </svg>
);
const IconOnboarding = () => (
  <svg
    className="w-5 h-5 shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 4h6m-6 4h4"
    />
  </svg>
);
const IconLogout = () => <LogOut className="w-5 h-5 shrink-0" />;

const STATUS_ONLY = [
  "PENDING",
  "AWAITING_CONFIRMATION",
  "AWAITING_PAYMENT",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const VALUE_TO_BACKEND: Record<string, string> = {
  All: "ALL",
  Pending: "PENDING",
  "Awaiting Confirmation": "AWAITING_CONFIRMATION",
  "Awaiting Payment": "AWAITING_PAYMENT",
  Confirmed: "CONFIRMED",
  Shipped: "SHIPPED",
  Delivered: "DELIVERED",
  Cancelled: "CANCELLED",
};

// Maps active status keys directly to their respective Lucide Icon components
const STATUS_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  All: ShoppingBag,
  Pending: Hourglass,
  "Awaiting Confirmation": Bell,
  "Awaiting Conf.": Bell,
  "Awaiting Payment": CreditCard,
  Confirmed: CheckSquare,
  Shipped: Truck,
  Delivered: Package,
  Cancelled: Ban,
};

interface SupplierLayoutProps {
  children: React.ReactNode;
}

export default function SupplierLayout({ children }: SupplierLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { data: supplier } = useMySupplierProfile();

  // Responsive sidebar states
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  // Orders filter state (linked dynamically to active route detection)
  const [orderStatus, setOrderStatus] = useState("All");
  const isOrdersView = location.pathname.startsWith("/supplier/orders");

  const isApproved = supplier?.status === "APPROVED";

  // Auto-close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    clearAuth();
    navigate("/login", { replace: true });
  }

  // ── Parallel Status Count Queries mapped with Invalidation Query Keys ──
  const countQueries = useQueries({
    queries: STATUS_ONLY.map((s) => ({
      queryKey: orderQueryKeys.incomingOrders({
        status: s,
        limit: 1,
        offset: 0,
      }),
      queryFn: () =>
        orderApi.listIncomingOrders({ status: s, limit: 1, offset: 0 }),
      staleTime: 30_000,
    })),
  });

  const statusCounts = Object.fromEntries(
    STATUS_ONLY.map((s, i) => [s, countQueries[i].data?.total ?? 0]),
  ) as Record<string, number>;

  const totalAll = STATUS_ONLY.reduce(
    (sum, s) => sum + (statusCounts[s] ?? 0),
    0,
  );

  const getCount = (val: string) => {
    if (val === "All") return totalAll;
    const backendKey = VALUE_TO_BACKEND[val];
    return statusCounts[backendKey] ?? 0;
  };

  const statuses = [
    { label: "All", value: "All" },
    { label: "Pending", value: "Pending" },
    { label: "Awaiting Conf.", value: "Awaiting Confirmation" },
    { label: "Awaiting Payment", value: "Awaiting Payment" },
    { label: "Confirmed", value: "Confirmed" },
    { label: "Shipped", value: "Shipped" },
    { label: "Delivered", value: "Delivered" },
    { label: "Cancelled", value: "Cancelled" },
  ];

  const statusColorConfigs: Record<
    string,
    {
      dot: string;
      bgActive: string;
      textActive: string;
      borderActive: string;
      color: string;
    }
  > = {
    All: {
      dot: "bg-[#004797]",
      bgActive: "bg-blue-50/50",
      textActive: "text-blue-800",
      borderActive: "border-l-[#004797]",
      color: "text-[#004797]",
    },
    Pending: {
      dot: "bg-amber-500",
      bgActive: "bg-amber-50/70",
      textActive: "text-amber-800",
      borderActive: "border-l-amber-500",
      color: "text-amber-500",
    },
    "Awaiting Confirmation": {
      dot: "bg-orange-500",
      bgActive: "bg-orange-50/70",
      textActive: "text-orange-800",
      borderActive: "border-l-orange-500",
      color: "text-orange-500",
    },
    "Awaiting Payment": {
      dot: "bg-blue-500",
      bgActive: "bg-blue-50/70",
      textActive: "text-blue-800",
      borderActive: "border-l-blue-500",
      color: "text-blue-500",
    },
    Confirmed: {
      dot: "bg-[#21BBD7]",
      bgActive: "bg-cyan-50/60",
      textActive: "text-cyan-800",
      borderActive: "border-l-[#21BBD7]",
      color: "text-indigo-500",
    },
    Shipped: {
      dot: "bg-purple-500",
      bgActive: "bg-purple-50/70",
      textActive: "text-purple-800",
      borderActive: "border-l-purple-500",
      color: "text-purple-500",
    },
    Delivered: {
      dot: "bg-emerald-500",
      bgActive: "bg-emerald-50/70",
      textActive: "text-emerald-800",
      borderActive: "border-l-emerald-500",
      color: "text-emerald-500",
    },
    Cancelled: {
      dot: "bg-gray-400",
      bgActive: "bg-gray-100/80",
      textActive: "text-gray-700",
      borderActive: "border-l-gray-400",
      color: "text-gray-400",
    },
  };

  const SidebarContent = () => {
    // 1. ORDERS VIEW DESIGN
    if (isOrdersView) {
      return (
        <div className="flex flex-col h-full py-6 px-4">
          <button
            onClick={() => {
              setMobileOpen(false);
              navigate("/dashboard");
            }}
            className={`group/back flex items-center text-xs font-semibold uppercase tracking-wider text-[#004797] hover:text-black mb-8 transition-colors text-left focus:outline-none cursor-pointer border-none bg-transparent ${
              isDesktopCollapsed ? "w-full justify-center px-0" : "gap-2 px-2"
            }`}
            title={isDesktopCollapsed ? "Go Back" : undefined}
          >
            <span className="transition-transform duration-200 ease-in-out group-hover/back:scale-125 shrink-0">
              <IconArrowLeft />
            </span>
            {!isDesktopCollapsed && <span>Go Back</span>}
          </button>

          {!isDesktopCollapsed && (
            <div className="mb-6 px-2">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block">
                Operations
              </span>
              <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mt-0.5">
                Incoming Orders
              </h3>
            </div>
          )}

          <nav className="space-y-1.5 flex-1 overflow-y-auto">
            {statuses.map((status) => {
              const isActive = orderStatus === status.value;
              const config =
                statusColorConfigs[status.value] || statusColorConfigs["All"];
              const metricCount = getCount(status.value);
              const StatusIcon = STATUS_ICONS[status.value] || ShoppingBag;

              return (
                <button
                  key={status.value}
                  onClick={() => setOrderStatus(status.value)}
                  title={isDesktopCollapsed ? status.label : undefined}
                  className={`group/status w-full flex items-center rounded-xl text-xs font-semibold uppercase tracking-wide transition-all focus:outline-none border-none bg-transparent cursor-pointer py-2.5 px-3.5 ${
                    isDesktopCollapsed ? "justify-center" : "justify-between"
                  } ${
                    isActive
                      ? `${config.bgActive} ${config.textActive} border-l-4 ${config.borderActive} shadow-xs`
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`flex items-center gap-3 truncate ${isDesktopCollapsed ? "justify-center" : ""}`}
                  >
                    <StatusIcon
                      className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover/status:scale-110 ${
                        isActive ? config.color : "text-gray-400"
                      }`}
                    />
                    {!isDesktopCollapsed && (
                      <span className="truncate">{status.label}</span>
                    )}
                  </div>
                  {!isDesktopCollapsed && metricCount > 0 && (
                    <span
                      className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {metricCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      );
    }

    // 2. STANDARD MENU VIEW DESIGN
    return (
      <div className="flex flex-col h-full py-6 justify-between">
        <nav className="space-y-1 px-3 flex-1 overflow-y-auto">
          <NavItem
            to="/dashboard"
            label="Dashboard"
            icon={<IconHome />}
            isCollapsed={isDesktopCollapsed}
          />

          {!isDesktopCollapsed ? (
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3.5 mt-6 mb-2">
              Onboarding
            </p>
          ) : (
            <div className="border-t border-gray-100 my-4" />
          )}

          <NavItem
            to="/supplier/onboarding"
            label="Overview"
            icon={<IconOnboarding />}
            isCollapsed={isDesktopCollapsed}
          />
          <NavItem
            to="/supplier/kyc"
            label="KYC Documents"
            icon={<IconDoc />}
            isCollapsed={isDesktopCollapsed}
          />

          {!isDesktopCollapsed ? (
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3.5 mt-6 mb-2">
              Catalog
            </p>
          ) : (
            <div className="border-t border-gray-100 my-4" />
          )}
          <NavItem
            to="/supplier/catalog/my"
            label="My Catalog"
            icon={<IconCatalog />}
            locked={!isApproved}
            isCollapsed={isDesktopCollapsed}
          />
          <NavItem
            to="/supplier/catalog/import"
            label="Import Missing Items"
            icon={<IconUpload />}
            locked={!isApproved}
            isCollapsed={isDesktopCollapsed}
          />
          <NavItem
            to="/supplier/catalog/recently-added"
            label="Recently Added"
            icon={<IconSearch />}
            locked={!isApproved}
            isCollapsed={isDesktopCollapsed}
          />

          {!isDesktopCollapsed ? (
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3.5 mt-6 mb-2">
              Operations
            </p>
          ) : (
            <div className="border-t border-gray-100 my-4" />
          )}
          <NavItem
            to="/supplier/orders"
            label="Orders"
            icon={<IconOrders />}
            locked={!isApproved}
            isCollapsed={isDesktopCollapsed}
            badgeCount={
              statusCounts["PENDING"] + statusCounts["AWAITING_CONFIRMATION"]
            }
          />
        </nav>

        {supplier && !isDesktopCollapsed && (
          <div className="px-6 pt-4 border-t border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
              Account
            </p>
            <p className="text-xs font-mono text-slate-600">
              {supplier.supplier_code}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen flex bg-[#F4F7FE] overflow-hidden font-sans">
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity cursor-pointer"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Unified Sidebar Container */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-100 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.05)]
          transition-all duration-300 ease-in-out
          md:relative md:top-0 md:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} 
          ${isDesktopCollapsed ? "md:w-20" : "md:w-64"}
          w-64 shrink-0 h-full
        `}
      >
        {/* Unified Sidebar Logo Area */}
        <div className="h-16 border-b border-gray-100 flex items-center justify-center px-4 shrink-0 transition-all duration-300">
          <Link to="/dashboard" className="flex items-center justify-center">
            <img
              src={isDesktopCollapsed ? "/favicon.png" : "/logo.png"}
              alt="SupplyHub"
              className="h-12 mt-4 w-auto object-contain transition-all duration-300"
            />
          </Link>
        </div>

        {/* Dynamic Sidebar Nav Area */}
        <div className="flex-1 overflow-hidden min-h-0">
          <SidebarContent />
        </div>

        {/* Bottom Sidebar Action (Sign Out) */}
        <div className="p-3 border-t border-gray-100 shrink-0">
          <button
            onClick={handleLogout}
            className={`flex items-center rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 py-2.5 px-3.5 transition-all w-full cursor-pointer
              ${isDesktopCollapsed ? "justify-center" : "gap-3"}`}
            title="Sign out"
          >
            <IconLogout />
            {!isDesktopCollapsed && (
              <span className="text-xs font-semibold uppercase tracking-wide">
                Sign Out
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Right Column Layout Frame */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 relative">
        {/* Impersonation Mode Banner */}
        <ImpersonationBanner />
        {/* Top Header Bar */}
        <header className="bg-white border-b border-gray-100 h-16 flex items-center justify-between px-4 sm:px-6 z-10 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.innerWidth >= 768) {
                  setIsDesktopCollapsed(!isDesktopCollapsed);
                } else {
                  setMobileOpen(!mobileOpen);
                }
              }}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 cursor-pointer"
              aria-label="Toggle Menu"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h2 className="text-lg font-bold text-[#004797] hidden sm:block">
              Supplier Portal
            </h2>
          </div>

          {/* User Account Details Section */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-gray-800 leading-tight">
                  {user?.full_name || "Lander Gallego Ambito"}
                </div>
                <div className="text-xs text-gray-500 font-medium mt-0.5">
                  Supplier Admin
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-linear-to-r from-[#21BBD7] to-[#004797] flex items-center justify-center text-white shadow-md">
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
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </header>

        {/* Inactive Banner */}
        {user && !user.is_active && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2 shrink-0">
            <span className="text-amber-600 text-sm">⏳</span>
            <p className="text-sm text-amber-800">
              <strong>Account pending approval.</strong> Complete your KYC
              documents to proceed. You'll be notified once your account is
              reviewed.
            </p>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 w-full bg-[#F4F7FE]">
          <div className="max-w-387.5 mx-auto">
            <OrdersFilterContext.Provider
              value={{ orderStatus, setOrderStatus }}
            >
              {children}
            </OrdersFilterContext.Provider>
          </div>
        </main>
      </div>
    </div>
  );
}
