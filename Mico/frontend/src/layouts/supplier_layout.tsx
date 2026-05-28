import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../auth";
import { useMySupplierProfile } from "../features/api_clients/supplier_api";
import { useState, useEffect } from "react";
import { ImpersonationBanner } from "../components/impersonation_banner";

function NavItem({
  to,
  label,
  icon,
  locked,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  locked?: boolean;
}) {
  if (locked) {
    return (
      <div
        title="Available after your account is approved"
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 cursor-not-allowed select-none"
      >
        {icon}
        <span className="text-sm">{label}</span>
        <span className="ml-auto text-xs bg-slate-100 text-slate-400 rounded px-1.5 py-0.5 font-medium">
          Locked
        </span>
      </div>
    );
  }
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? "bg-emerald-50 text-emerald-700 font-semibold"
            : "text-slate-700 hover:bg-slate-100"
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}

const IconHome = () => (
  <svg
    className="w-4 h-4 flex-shrink-0"
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
    className="w-4 h-4 flex-shrink-0"
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
    className="w-4 h-4 flex-shrink-0"
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
    className="w-4 h-4 flex-shrink-0"
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
    className="w-4 h-4 flex-shrink-0"
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
    className="w-4 h-4 flex-shrink-0"
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
    className="w-4 h-4 flex-shrink-0"
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

export default function SupplierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const impersonation = useAuthStore((s) => s.impersonation);
  const { data: supplier } = useMySupplierProfile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isApproved = supplier?.status === "APPROVED";

  // Close drawer on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    clearAuth();
    navigate("/login", { replace: true });
  }

  const SidebarContent = () => (
    <>
      <nav className="space-y-1 flex-1">
        <NavItem to="/dashboard" label="Dashboard" icon={<IconHome />} />

        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mt-4 mb-2">
          Onboarding
        </p>
        <NavItem
          to="/supplier/onboarding"
          label="Overview"
          icon={<IconOnboarding />}
        />
        <NavItem to="/supplier/kyc" label="KYC Documents" icon={<IconDoc />} />

        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mt-4 mb-2">
          Catalog
        </p>
        <NavItem
          to="/supplier/catalog/my"
          label="My Catalog"
          icon={<IconCatalog />}
          locked={!isApproved}
        />
        <NavItem
          to="/supplier/catalog/import"
          label="Import Missing Items"
          icon={<IconUpload />}
          locked={!isApproved}
        />
        <NavItem
          to="/supplier/catalog/recently-added"
          label="Recently Added"
          icon={<IconSearch />}
          locked={!isApproved}
        />

        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mt-4 mb-2">
          Operations
        </p>
        <NavItem
          to="/supplier/orders"
          label="Orders"
          icon={<IconOrders />}
          locked={!isApproved}
        />
      </nav>

      {supplier && (
        <div className="mt-4 px-3">
          <p className="text-xs text-slate-400 mb-1">Account</p>
          <p className="text-xs font-mono text-slate-600">
            {supplier.supplier_code}
          </p>
        </div>
      )}
    </>
  );

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <ImpersonationBanner />
      {/* Top bar */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 shrink-0 z-30">
        {/* Hamburger — mobile only */}
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
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
          )}
        </button>

        <Link to="/dashboard" className="mr-4 flex items-center">
          <img src="/logo.png" alt="SupplyHub" className="h-8 w-auto" />
        </Link>
        <span className="flex-1" />
        <span className="text-sm text-slate-600 hidden sm:block">
          {user?.full_name}
        </span>
        {!impersonation && (
          <button
            onClick={handleLogout}
            className="text-xs text-slate-500 hover:text-slate-800 border border-slate-300
                       hover:border-slate-400 rounded-lg px-3 py-1.5 transition-colors"
          >
            Sign out
          </button>
        )}
      </header>

      {/* Inactive banner */}
      {user && !user.is_active && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2">
          <span className="text-amber-600 text-sm">⏳</span>
          <p className="text-sm text-amber-800">
            <strong>Account pending approval.</strong> Complete your KYC
            documents to proceed. You'll be notified once your account is
            reviewed.
          </p>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile overlay backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-20 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile drawer */}
        <aside
          className={`
            fixed top-14 left-0 bottom-0 w-64 bg-white border-r border-slate-200
            flex flex-col py-4 px-3 z-20 transition-transform duration-200
            md:hidden
            ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <SidebarContent />
        </aside>

        {/* Desktop sidebar — always visible on md+ */}
        <aside className="hidden md:flex w-56 bg-white border-r border-slate-200 flex-col py-4 px-3 shrink-0">
          <SidebarContent />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6 min-w-0">{children}</main>
      </div>
    </div>
  );
}
