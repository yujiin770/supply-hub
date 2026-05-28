import React from "react";
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
  AlertCircle
} from "lucide-react";

interface OrdersProps {
  activeStatus: string;
}

const Orders: React.FC<OrdersProps> = ({ activeStatus }) => {
  
  // Dynamic Configuration based on Status
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "Pending":
        return { icon: Hourglass, color: "text-amber-500", bg: "bg-amber-50", label: "Pending Verification" };
      case "Awaiting Confirmation":
        return { icon: Bell, color: "text-orange-500", bg: "bg-orange-50", label: "Awaiting Your Confirmation" };
      case "Awaiting Payment":
        return { icon: CreditCard, color: "text-blue-500", bg: "bg-blue-50", label: "Awaiting Buyer Payment" };
      case "Confirmed":
        return { icon: CheckSquare, color: "text-cyan-500", bg: "bg-cyan-50", label: "Confirmed Orders" };
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

  const config = getStatusConfig(activeStatus);
  const StatusIcon = config.icon;

  return (
    <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-500 pb-20">
      
      {/* --- Page Header --- */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded-lg ${config.bg} ${config.color}`}>
                <StatusIcon className="w-4 h-4" />
            </div>
            <span className={`text-[11px] font-extrabold uppercase tracking-[0.2em] ${config.color}`}>
                Status: {activeStatus}
            </span>
        </div>
        <h1 className="text-4xl font-semiold text-gray-900 tracking-tight">
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
              placeholder={`Search in ${activeStatus} orders...`}
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border-transparent rounded-[18px] text-sm font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
              disabled
            />
          </div>
          <button className="flex items-center gap-2 px-8 py-3.5 bg-white border border-gray-100 rounded-[18px] text-xs font-bold text-gray-400 cursor-not-allowed">
            <Filter className="w-4 h-4" />
            Detailed Filters
          </button>
        </div>

        {/* --- Empty State Card --- */}
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
            No {activeStatus === "All" ? "" : activeStatus.toLowerCase()} orders yet
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
      </main>
    </div>
  );
};

export default Orders;