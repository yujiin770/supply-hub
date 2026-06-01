import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../auth";
import { getRoleHome } from "../auth/auth_types";
import { User, X } from "lucide-react";

const roleLabel: Record<string, string> = {
  SUPERADMIN: "Super Admin",
  ADMIN: "Admin",
  SUPPLIER_OWNER: "Supplier Owner",
  SUPPLIER_STAFF: "Supplier Staff",
};

const navLinks: Record<string, { label: string; to: string }[]> = {
  SUPERADMIN: [
    { label: "Suppliers", to: "/superadmin/suppliers" },
    { label: "API Clients", to: "/superadmin/api-clients" },
    { label: "Accounts", to: "/superadmin/admin-accounts" },
  ],
  ADMIN: [
    { label: "Suppliers", to: "/superadmin/suppliers" },
    { label: "API Clients", to: "/superadmin/api-clients" },
  ],
  SUPPLIER_OWNER: [{ label: "My KYC", to: "/supplier/kyc" }],
  SUPPLIER_STAFF: [{ label: "My KYC", to: "/supplier/kyc" }],
};

// Design configuration mapping each link name to its unique active and hover styles
const linkColorConfigs: Record<string, { active: string; hover: string }> = {
  Suppliers: {
    active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    hover: "text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50",
  },
  "API Clients": {
    active: "bg-blue-50 text-blue-700 border border-blue-200",
    hover: "text-slate-600 hover:text-blue-700 hover:bg-blue-50/50",
  },
  Accounts: {
    active: "bg-purple-50 text-purple-700 border border-purple-200",
    hover: "text-slate-600 hover:text-purple-700 hover:bg-purple-50/50",
  },
  "My KYC": {
    active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    hover: "text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50",
  },
};

interface NavbarProps {
  onExit?: () => void;
}

export default function Navbar({ onExit }: NavbarProps = {}) {
  const user = useAuthStore((s) => s.user);
  const impersonation = useAuthStore((s) => s.impersonation);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  // Safely attempts to pull the impersonation exit action from your Zustand store if it exists
  const stopImpersonation = useAuthStore(
    (s) =>
      (s as any).stopImpersonation ||
      (s as any).exitImpersonation ||
      (s as any).stopImpersonating,
  );

  const navigate = useNavigate();
  const { pathname } = useLocation();

  function handleLogout() {
    clearAuth();
    navigate("/login", { replace: true });
  }

  function handleExit() {
    if (onExit) {
      onExit();
    } else if (stopImpersonation) {
      stopImpersonation();
    } else {
      // Fallback redirect if no store exit handler is found
      navigate("/dashboard");
    }
  }

  // Fallback to empty links array if no active user session exists
  const links = user ? (navLinks[user.role] ?? []) : [];
  const realUser = impersonation ? impersonation.originalUser : user;

  return (
    <>
      {/* ── Impersonation Banner: Matches your amber warning banner design ── */}
      {impersonation && realUser && (
        <div className="bg-amber-400 border-b border-amber-200 px-4 sm:px-6 py-2.5 shrink-0 animate-fade-in">
          {/* Desktop Banner Layout */}
          <div className="hidden sm:flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-white">
              <span className="font-medium">Acting as supplier:</span>
              <span className="font-semibold">
                {impersonation.supplierName}
              </span>
              <span className="text-white/90">—</span>
              <span className="text-white/90">
                any action you take will affect this supplier's account.
              </span>
            </div>
            <button
              onClick={handleExit}
              className="bg-white text-amber-600 hover:bg-amber-50 hover:text-amber-700 px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
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
              className="bg-white text-amber-600 px-2 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>Exit supplier view</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Redesigned Header: Incorporates the clean, bordered style and typography ── */}
      <header className="bg-white border-b border-gray-100 h-16 flex items-center justify-between px-4 sm:px-6 z-10 shrink-0 shadow-sm">
        <div className="flex items-center gap-8">
          <Link
            to={user ? getRoleHome(user.role) : "/login"}
            className="flex items-center gap-2 shrink-0"
          >
            <img src="/logo.png" alt="SupplyHub" className="h-8 w-auto" />
          </Link>
          {links.length > 0 && (
            <nav className="hidden md:flex items-center gap-1">
              {links.map((l) => {
                const isActive = pathname.startsWith(l.to);
                const colors = linkColorConfigs[l.label] || {
                  active:
                    "bg-emerald-50 text-emerald-700 border border-emerald-200",
                  hover:
                    "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
                };

                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
                      isActive ? colors.active : colors.hover
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Identity Info & Custom Profile Circle Badge */}
          {realUser && (
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-gray-800 leading-tight">
                  {realUser.full_name || realUser.email}
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  {roleLabel[realUser.role] ?? realUser.role}
                </div>
              </div>
              <div
                className="w-9 h-9 rounded-full bg-linear-to-r from-[#21BBD7] to-[#004797] flex items-center justify-center text-white shadow-md shrink-0"
                title={realUser.full_name || realUser.email}
              >
                <User className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* Sign Out Button */}
          {user && (
            <button
              onClick={handleLogout}
              className="text-xs font-semibold text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
            >
              Sign out
            </button>
          )}
        </div>
      </header>
    </>
  );
}
