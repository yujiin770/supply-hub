import { useState } from 'react';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Suppliers from './pages/Suppliers';
import AddSupplier from './pages/AddSupplier';
import OnboardingOverview from './pages/Overview';
import KYCDocuments from './pages/KYCDocuments';
import MyCatalog from './pages/MyCatalog';

type ViewState = 'suppliers' | 'dashboard' | 'add-supplier' | 'overview' | 'kyc' | 'catalog';

function App() {
  const [view, setView] = useState<ViewState>('suppliers');

  const goToDashboard = () => setView('dashboard');
  const goToSuppliers = () => setView('suppliers');
  const goToAddSupplier = () => setView('add-supplier');


  if (view === 'suppliers') {
    return (
      <Suppliers
        onGoToDashboard={goToDashboard}
        onAddSupplier={goToAddSupplier}
      />
    );
  }

  if (view === 'add-supplier') {
    return <AddSupplier onBack={goToSuppliers} />;
  }

  return (
    <DashboardLayout onExit={goToSuppliers} onNavigate={(v: any) => setView(v)}>
      {view === 'dashboard' && <Dashboard />}
      {view === 'overview' && <OnboardingOverview />}
      {view === 'kyc' && <KYCDocuments />}
      {view === 'catalog' && <MyCatalog />}
    </DashboardLayout>
  );
}

  export default App;