import React from "react";

interface SidebarIncomingOrdersProps {
  activeStatus: string;
  onStatusChange: (status: string) => void;
  statusCounts: Record<string, number>;
}

const SidebarIncomingOrders: React.FC<SidebarIncomingOrdersProps> = ({
  activeStatus,
  onStatusChange,
  statusCounts,
}) => {
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

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm sticky top-6">
      {/* Sidebar Header */}
      <div className="mb-6">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">
          Operations
        </span>
        <h3 className="text-base font-bold text-[#004797] mt-0.5 uppercase tracking-wide">
          Incoming Orders
        </h3>
      </div>

      {/* List of Status Nav Items */}
      <nav className="space-y-1.5">
        {statuses.map((status) => {
          const isActive = activeStatus === status.value;
          const count = statusCounts[status.value] || 0;

          return (
            <button
              key={status.value}
              onClick={() => onStatusChange(status.value)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wide transition-all ${
                isActive
                  ? "bg-emerald-50 text-emerald-800 border-l-4 border-l-emerald-500 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {/* Dot status indicator */}
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isActive ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                />
                <span>{status.label}</span>
              </div>
              <span
                className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md ${
                  isActive
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-gray-50 text-gray-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default SidebarIncomingOrders;
