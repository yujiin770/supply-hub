import { useState } from "react";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Suppliers from "./pages/Suppliers";
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
  const [orderStatus, setOrderStatus] = useState<string>("All"); // Lifted active order category state

  const goToSuppliers = () => setView("suppliers");
  const goToDashboard = () => setView("dashboard");
  const goToAddSupplier = () => setView("add-supplier");
  const goToBrowse = () => setView("browse");
  const goToCatalog = () => setView("catalog");

  if (view === "suppliers") {
    return (
      <Suppliers
        onGoToDashboard={goToDashboard}
        onAddSupplier={goToAddSupplier}
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
