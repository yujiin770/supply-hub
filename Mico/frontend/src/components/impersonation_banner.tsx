import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../auth";
import { X } from "lucide-react";

export function ImpersonationBanner() {
  const impersonation = useAuthStore((s) => s.impersonation);
  const exitImpersonation = useAuthStore((s) => s.exitImpersonation);
  const navigate = useNavigate();

  if (!impersonation) return null;

  function handleExit() {
    exitImpersonation();
    setTimeout(() => navigate("/superadmin/suppliers"), 0);
  }

  return (
    <div className="bg-amber-400 border-b border-amber-200 px-4 sm:px-6 py-2.5 shrink-0 animate-fade-in sticky top-0 z-50">
      {/* Desktop Banner Layout */}
      <div className="hidden sm:flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-white">
          <span className="font-medium">Acting as supplier:</span>
          <span className="font-semibold">{impersonation.supplierName}</span>
          <span className="text-white/90">—</span>
          <span className="text-white/90">
            any action you take will affect this supplier's account.
          </span>
        </div>
        <button
          onClick={handleExit}
          className="bg-white text-amber-600 hover:bg-amber-50 hover:text-amber-700 px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-1 transition-colors shadow-sm cursor-pointer border-none outline-none"
        >
          <X className="w-3.5 h-3.5" />
          <span>Exit supplier view</span>
        </button>
      </div>

      {/* Mobile Banner Layout */}
      <div className="sm:hidden flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-white">
          <span className="font-medium text-xs">Acting as:</span>
          <span className="font-semibold text-xs truncate max-w-37.5">
            {impersonation.supplierName}
          </span>
        </div>
        <button
          onClick={handleExit}
          className="bg-white text-amber-600 px-2 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1 border-none outline-none cursor-pointer"
        >
          <X className="w-3 h-3" />
          <span>Exit supplier view</span>
        </button>
      </div>
    </div>
  );
}
