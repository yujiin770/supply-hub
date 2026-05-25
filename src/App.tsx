import { useState } from 'react';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Suppliers from './pages/Suppliers';
import AddSupplier from './pages/AddSupplier';
import OnboardingOverview from './pages/Overview';
import KYCDocuments from './pages/KYCDocuments';
import MyCatalog from './pages/MyCatalog';
import BrowseCatalog from './pages/BrowseCatalog';

type ViewState = 'suppliers' | 'dashboard' | 'add-supplier' | 'overview' | 'kyc' | 'catalog' | 'browse';

function App() {
  const [view, setView] = useState<ViewState>('suppliers');

  // Navigation Helpers
  const goToSuppliers = () => setView('suppliers');
  const goToDashboard = () => setView('dashboard');
  const goToAddSupplier = () => setView('add-supplier');
  const goToBrowse = () => setView('browse');
  const goToCatalog = () => setView('catalog');

  // 1. Full Screen Pages (No Sidebar)
  if (view === 'suppliers') {
    return <Suppliers onGoToDashboard={goToDashboard} onAddSupplier={goToAddSupplier} />;
  }

  if (view === 'add-supplier') {
    return <AddSupplier onBack={goToSuppliers} />;
  }

  if (view === 'browse') {
    return <BrowseCatalog onBack={goToCatalog} />;
  }

  // 2. Dashboard Pages (With Sidebar/Layout)
  return (
    <DashboardLayout onExit={goToSuppliers} onNavigate={(target: any) => setView(target)}>
      {view === 'dashboard' && <Dashboard />}
      {view === 'overview' && <OnboardingOverview />}
      {view === 'kyc' && <KYCDocuments />}
      {view === 'catalog' && <MyCatalog onBrowse={goToBrowse} />}
    </DashboardLayout>
  );
}

export default App;