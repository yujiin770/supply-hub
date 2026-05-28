import { useState } from "react";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Suppliers from "./pages/Suppliers";
import SupplierDetail from "./pages/SupplierDetail"; 
import AddSupplier from "./pages/AddSupplier";
import OnboardingOverview from "./pages/Overview";
import KYCDocuments from "./pages/KYCDocuments";
import MyCatalog from "./pages/MyCatalog";
import BrowseCatalog from "./pages/BrowseCatalog";
import ImportMissingItems from "./pages/ImportMissingItems";
import RecentlyAdded from "./pages/RecentlyAdded";
import Orders from "./pages/Orders";

type ViewState =
  | "suppliers"
  | "supplier-detail"
  | "dashboard"
  | "add-supplier"
  | "overview"
  | "kyc"
  | "catalog"
  | "browse"
  | "import-missing"
  | "recently-added"
  | "orders";

function App() {
  const [view, setView] = useState<ViewState>("suppliers");
  const [orderStatus, setOrderStatus] = useState<string>("All");
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);

  const goToSuppliers = () => {
    setSelectedSupplier(null);
    setView("suppliers");
  };

  const goToDashboard = () => setView("dashboard");
  const goToAddSupplier = () => setView("add-supplier");
  const goToBrowse = () => setView("browse");
  const goToCatalog = () => setView("catalog");

  if (view === "suppliers") {
    return (
      <Suppliers
        onGoToDashboard={goToDashboard}
        onAddSupplier={goToAddSupplier}
        onViewDetail={(supplier) => {
          setSelectedSupplier(supplier); 
          setView("supplier-detail"); 
        }}
      />
    );
  }

  if (view === "supplier-detail") {
    return (
      <SupplierDetail
        supplier={selectedSupplier}
        onBack={goToSuppliers}
      />
    );
  }

  if (view === "add-supplier") {
    return <AddSupplier onBack={goToSuppliers} />;
  }


  if (view === "browse") {
    return <BrowseCatalog onBack={goToCatalog} />;
  }

  return (
    <DashboardLayout
      onExit={goToSuppliers}
      onNavigate={(target: any) => setView(target)}
      isOrdersView={view === "orders"}
      orderStatus={orderStatus}
      setOrderStatus={setOrderStatus}
    >
      {view === "dashboard" && <Dashboard />}
      {view === "overview" && <OnboardingOverview />}
      {view === "kyc" && <KYCDocuments />}
      {view === "catalog" && <MyCatalog onBrowse={goToBrowse} />}
      {view === "import-missing" && <ImportMissingItems />}
      {view === "recently-added" && <RecentlyAdded />}
      {view === "orders" && <Orders activeStatus={orderStatus} />}
    </DashboardLayout>
  );
}

export default App;