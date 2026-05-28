import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../auth";
import { getRoleHome } from "../auth/auth_types";

const roleLabel: Record<string, string> = {
  SUPERADMIN: "Super Admin",
  ADMIN: "Admin",
  SUPPLIER_OWNER: "Supplier Owner",
  SUPPLIER_STAFF: "Supplier Staff",
};

const roleColor: Record<string, string> = {
  SUPERADMIN: "bg-purple-100 text-purple-700",
  ADMIN: "bg-blue-100 text-blue-700",
  SUPPLIER_OWNER: "bg-emerald-100 text-emerald-700",
  SUPPLIER_STAFF: "bg-teal-100 text-teal-700",
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

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const impersonation = useAuthStore((s) => s.impersonation);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  function handleLogout() {
    clearAuth();
    navigate("/login", { replace: true });
  }

  // While impersonating, nav links follow the supplier-owner role.
  // The displayed "identity" in the top-right shows the actual superadmin.
  const links = user ? (navLinks[user.role] ?? []) : [];
  const realUser = impersonation ? impersonation.originalUser : user;

  return (
    <header className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between shrink-0 shadow-sm">
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
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-3">
        {impersonation && realUser ? (
          /* ── Impersonation mode: show real superadmin identity ── */
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs text-slate-400 leading-tight">
                Signed in as
              </span>
              <span className="text-sm font-medium text-slate-700 leading-tight">
                {realUser.full_name || realUser.email}
              </span>
            </div>
            <span className="text-xs font-semibold rounded-full px-2.5 py-0.5 bg-purple-100 text-purple-700">
              {roleLabel[realUser.role] ?? realUser.role}
            </span>
            <span className="text-xs font-semibold rounded-full px-2.5 py-0.5 bg-amber-100 text-amber-700 border border-amber-300 flex items-center gap-1">
              <span>👁</span>
              <span className="hidden sm:inline">
                Managing: {impersonation.supplierName}
              </span>
              <span className="sm:hidden">Managing</span>
            </span>
          </div>
        ) : (
          /* ── Normal mode ── */
          user && (
            <>
              <span className="text-sm text-slate-700 hidden sm:inline">
                {user.full_name || user.email}
              </span>
              <span
                className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${
                  roleColor[user.role] ?? "bg-slate-100 text-slate-600"
                }`}
              >
                {roleLabel[user.role] ?? user.role}
              </span>
            </>
          )
        )}
        <button
          onClick={handleLogout}
          className="text-sm text-slate-500 hover:text-red-600 transition-colors ml-1"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
