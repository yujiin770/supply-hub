import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore, type UserRole } from "../auth";
import LoginPage from "../pages/login_page";
import VerifyOtpPage from "../pages/verify_otp_page";
import CatalogSyncingPage from "../pages/catalog_syncing_page";
import SignupPage from "../pages/signup_page";
import SignupSubmittedPage from "../pages/signup_submitted_page";
import ForgotPasswordPage from "../pages/forgot_password_page";
import ResetPasswordPage from "../pages/reset_password_page";
import ForbiddenPage from "../pages/forbidden_page";
import NotFoundPage from "../pages/not_found_page";
import SuperAdminSuppliersPage from "../pages/superadmin/suppliers_page";
import NewSupplierPage from "../pages/superadmin/new_supplier_page";
import SupplierDetailPage from "../pages/superadmin/supplier_detail_page";
import ApiClientsPage from "../pages/superadmin/api_clients_page";
import AdminAccountsPage from "../pages/superadmin/admin_accounts_page";
import PendingSuppliersPage from "../pages/admin/pending_suppliers_page";
import ReviewSupplierPage from "../pages/admin/review_supplier_page";
import OnboardingPage from "../pages/supplier/onboarding_page";
import KycPage from "../pages/supplier/kyc_page";
import MyCatalogPage from "../pages/supplier/my_catalog_page";
import CatalogImportPage from "../pages/supplier/catalog_import_page";
import CatalogRecentlyAddedPage from "../pages/supplier/catalog_recently_added_page";
import MarketplaceSuppliersPage from "../pages/buyer/marketplace_suppliers_page";
import SupplierPackagesPage from "../pages/buyer/supplier_packages_page";
import MarketplaceCheckoutPage from "../pages/buyer/marketplace_checkout_page";
import MyOrdersPage from "../pages/buyer/my_orders_page";
import OrderDetailPage from "../pages/buyer/order_detail_page";
import IncomingOrdersPage from "../pages/supplier/incoming_orders_page";
import DashboardPage from "../pages/dashboard_page";
import { getRoleHome } from "../auth/auth_types";

// Redirects to login if not authenticated.
function RequireAuth({ children }: { children: React.ReactNode }) {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!isHydrated) return null; // wait for session restore
  if (!accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Renders 403 page if user's role is not in the allowed list.
function RequireRole({
  allowed,
  children,
}: {
  allowed: UserRole[];
  children: React.ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!allowed.includes(user.role)) return <Navigate to="/403" replace />;
  return <>{children}</>;
}

// Redirect / based on role.
function RootRedirect() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  if (!isHydrated) return null;
  if (!accessToken || !user) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleHome(user.role)} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/syncing"
        element={
          <RequireAuth>
            <RequireRole allowed={["SUPPLIER_OWNER"]}>
              <CatalogSyncingPage />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/signup/submitted" element={<SignupSubmittedPage />} />

      {/* SuperAdmin routes */}
      <Route
        path="/superadmin/suppliers"
        element={
          <RequireAuth>
            <RequireRole allowed={["SUPERADMIN", "ADMIN"]}>
              <SuperAdminSuppliersPage />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/superadmin/suppliers/new"
        element={
          <RequireAuth>
            <RequireRole allowed={["SUPERADMIN", "ADMIN"]}>
              <NewSupplierPage />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/superadmin/suppliers/:id"
        element={
          <RequireAuth>
            <RequireRole allowed={["SUPERADMIN", "ADMIN"]}>
              <SupplierDetailPage />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/superadmin/api-clients"
        element={
          <RequireAuth>
            <RequireRole allowed={["SUPERADMIN", "ADMIN"]}>
              <ApiClientsPage />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/superadmin/admin-accounts"
        element={
          <RequireAuth>
            <RequireRole allowed={["SUPERADMIN"]}>
              <AdminAccountsPage />
            </RequireRole>
          </RequireAuth>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin/suppliers/pending"
        element={
          <RequireAuth>
            <RequireRole allowed={["ADMIN", "SUPERADMIN"]}>
              <PendingSuppliersPage />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/suppliers/:id"
        element={
          <RequireAuth>
            <RequireRole allowed={["ADMIN", "SUPERADMIN"]}>
              <ReviewSupplierPage />
            </RequireRole>
          </RequireAuth>
        }
      />

      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <RequireRole allowed={["SUPPLIER_OWNER", "SUPPLIER_STAFF"]}>
              <DashboardPage />
            </RequireRole>
          </RequireAuth>
        }
      />

      {/* Supplier routes */}
      <Route
        path="/supplier/onboarding"
        element={
          <RequireAuth>
            <RequireRole allowed={["SUPPLIER_OWNER", "SUPPLIER_STAFF"]}>
              <OnboardingPage />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/supplier/kyc"
        element={
          <RequireAuth>
            <RequireRole allowed={["SUPPLIER_OWNER", "SUPPLIER_STAFF"]}>
              <KycPage />
            </RequireRole>
          </RequireAuth>
        }
      />
      {/* /supplier/catalog/picker is now a modal inside My Catalog */}
      <Route
        path="/supplier/catalog/picker"
        element={<Navigate to="/supplier/catalog/my" replace />}
      />
      <Route
        path="/supplier/catalog/my"
        element={
          <RequireAuth>
            <RequireRole allowed={["SUPPLIER_OWNER", "SUPPLIER_STAFF"]}>
              <MyCatalogPage />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/supplier/catalog/import"
        element={
          <RequireAuth>
            <RequireRole allowed={["SUPPLIER_OWNER", "SUPPLIER_STAFF"]}>
              <CatalogImportPage />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/supplier/catalog/recently-added"
        element={
          <RequireAuth>
            <RequireRole allowed={["SUPPLIER_OWNER", "SUPPLIER_STAFF"]}>
              <CatalogRecentlyAddedPage />
            </RequireRole>
          </RequireAuth>
        }
      />

      {/* Marketplace routes — any authenticated user */}
      <Route
        path="/marketplace/suppliers"
        element={
          <RequireAuth>
            <MarketplaceSuppliersPage />
          </RequireAuth>
        }
      />
      <Route
        path="/marketplace/suppliers/:supplierId"
        element={
          <RequireAuth>
            <SupplierPackagesPage />
          </RequireAuth>
        }
      />

      {/* Marketplace checkout */}
      <Route
        path="/marketplace/checkout"
        element={
          <RequireAuth>
            <MarketplaceCheckoutPage />
          </RequireAuth>
        }
      />

      {/* Buyer order routes */}
      <Route
        path="/orders/me"
        element={
          <RequireAuth>
            <MyOrdersPage />
          </RequireAuth>
        }
      />
      <Route
        path="/orders/me/:orderId"
        element={
          <RequireAuth>
            <OrderDetailPage />
          </RequireAuth>
        }
      />

      {/* Supplier order management */}
      <Route
        path="/supplier/orders"
        element={
          <RequireAuth>
            <RequireRole allowed={["SUPPLIER_OWNER", "SUPPLIER_STAFF"]}>
              <IncomingOrdersPage />
            </RequireRole>
          </RequireAuth>
        }
      />

      {/* Error pages */}
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
