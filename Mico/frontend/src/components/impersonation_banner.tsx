import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../auth";

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
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm font-medium sticky top-0 z-50">
      <span>
        👁 Acting as supplier:{" "}
        <span className="font-bold">{impersonation.supplierName}</span>
        {" — "}any action you take will affect this supplier's account.
      </span>
      <button
        onClick={handleExit}
        className="ml-4 bg-white text-amber-700 font-semibold px-3 py-1 rounded-lg
                   hover:bg-amber-50 transition-colors text-xs whitespace-nowrap"
      >
        Exit supplier view
      </button>
    </div>
  );
}
