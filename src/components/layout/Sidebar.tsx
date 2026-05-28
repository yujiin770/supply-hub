import React, { useState } from "react";
import SidebarLogo from "../sidebar/SidebarLogo";
import SidebarNav from "../sidebar/SidebarNav";
import SidebarBottomActions from "../sidebar/SidebarBottomActions";
import SidebarAccount from "../sidebar/SidebarAccount";
import { ArrowLeft } from "lucide-react";

interface SidebarProps {
  isDesktopCollapsed: boolean;
  isMobileOpen: boolean;
  setIsMobileOpen: (val: boolean) => void;
  setIsDesktopCollapsed: (val: boolean) => void;
  onNavigate: (view: string) => void;
  isOrdersView?: boolean;
  orderStatus?: string;
  setOrderStatus?: (status: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isDesktopCollapsed,
  isMobileOpen,
  setIsMobileOpen,
  onNavigate,
  isOrdersView = false,
  orderStatus = "All",
  setOrderStatus,
}) => {
  const [localActiveItem, setLocalActiveItem] = useState("Dashboard");

  const handleItemClick = (label: string) => {
    setLocalActiveItem(label);
    setIsMobileOpen(false);

    if (label === "Dashboard") onNavigate("dashboard");
    else if (label === "Overview") onNavigate("overview");
    else if (label === "KYC Documents") onNavigate("kyc");
    else if (label === "My Catalog") onNavigate("catalog");
    else if (label === "Import Missing Items") onNavigate("import-missing");
    else if (label === "Recently Added") onNavigate("recently-added");
    else if (label === "Orders") onNavigate("orders");
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

  // Design tokens matching Dashboard order state colors
  const statusColorConfigs: Record<
    string,
    { dot: string; bgActive: string; textActive: string; borderActive: string }
  > = {
    All: {
      dot: "bg-[#004797]",
      bgActive: "bg-blue-50/50",
      textActive: "text-blue-800",
      borderActive: "border-l-[#004797]",
    },
    Pending: {
      dot: "bg-amber-500",
      bgActive: "bg-amber-50/70",
      textActive: "text-amber-800",
      borderActive: "border-l-amber-500",
    },
    "Awaiting Confirmation": {
      dot: "bg-orange-500",
      bgActive: "bg-orange-50/70",
      textActive: "text-orange-800",
      borderActive: "border-l-orange-500",
    },
    "Awaiting Payment": {
      dot: "bg-blue-500",
      bgActive: "bg-blue-50/70",
      textActive: "text-blue-800",
      borderActive: "border-l-blue-500",
    },
    Confirmed: {
      dot: "bg-[#21BBD7]",
      bgActive: "bg-cyan-50/60",
      textActive: "text-cyan-800",
      borderActive: "border-l-[#21BBD7]",
    },
    Shipped: {
      dot: "bg-purple-500",
      bgActive: "bg-purple-50/70",
      textActive: "text-purple-800",
      borderActive: "border-l-purple-500",
    },
    Delivered: {
      dot: "bg-emerald-500",
      bgActive: "bg-emerald-50/70",
      textActive: "text-emerald-800",
      borderActive: "border-l-emerald-500",
    },
    Cancelled: {
      dot: "bg-gray-400",
      bgActive: "bg-gray-100/80",
      textActive: "text-gray-700",
      borderActive: "border-l-gray-400",
    },
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity cursor-pointer"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`
                    fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-100 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.05)]
                    transition-all duration-300 ease-in-out
                    md:relative md:translate-x-0
                    ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} 
                    ${isDesktopCollapsed ? "md:w-20" : "md:w-64"}
                    w-64
                `}
      >
        {isOrdersView ? (
          <div className="flex flex-col h-full py-6 px-4">
            <button
              onClick={() => {
                setIsMobileOpen(false);
                setLocalActiveItem("Dashboard");
                onNavigate("dashboard");
              }}
              className="flex items-center gap-2 text-xs font-bold uppercase  tracking-wider text-[#004797] hover:text-black mb-8 transition-colors text-left focus:outline-none cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              {!isDesktopCollapsed && <span>Go Back</span>}
            </button>

            {!isDesktopCollapsed && (
              <div className="mb-6 px-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                  Operations
                </span>
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mt-0.5">
                  Incoming Orders
                </h3>
              </div>
            )}

            <nav className="space-y-1.5 flex-1">
              {statuses.map((status) => {
                const isActive = orderStatus === status.value;
                const config =
                  statusColorConfigs[status.value] || statusColorConfigs["All"];

                return (
                  <button
                    key={status.value}
                    onClick={() => setOrderStatus?.(status.value)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all focus:outline-none ${
                      isActive
                        ? `${config.bgActive} ${config.textActive} border-l-4 ${config.borderActive} shadow-xs`
                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isActive ? config.dot : "bg-gray-300"
                        }`}
                      />
                      {!isDesktopCollapsed && (
                        <span className="truncate">{status.label}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        ) : (
          <>
            <SidebarLogo isDesktopCollapsed={isDesktopCollapsed} />
            <SidebarNav
              activeItem={localActiveItem}
              isDesktopCollapsed={isDesktopCollapsed}
              onItemClick={handleItemClick}
            />
            <SidebarBottomActions isDesktopCollapsed={isDesktopCollapsed} />
            <SidebarAccount isDesktopCollapsed={isDesktopCollapsed} />
          </>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
