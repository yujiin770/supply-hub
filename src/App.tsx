// src/App.tsx
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import DashboardLayout from './components/layout/DashboardLayout';
import StatsCard from './components/dashboard/StatsCard';
import OrdersByStatus from './components/dashboard/OrdersByStatus';
import StockOverview from './components/dashboard/StockOverview';
import TopItems from './components/dashboard/TopItems';
import LoadingSkeleton from './components/ui/LoadingSkeleton';
import { ClipboardList, RefreshCw, Box, Building2 } from 'lucide-react';

function App() {
  const [loading, setLoading] = useState(true);

  // Mock data
  const stats = {
    pending: 0,
    awaitingConfirmation: 0,
    awaitingPayment: 0,
    confirmed: 1,
    shipped: 0,
    delivered: 1,
    cancelled: 0
  };

  const ordersByStatus = {
    'Pending': stats.pending,
    'Awaiting Your Confirmation': stats.awaitingConfirmation,
    'Awaiting Payment': stats.awaitingPayment,
    'Confirmed': stats.confirmed,
    'Shipped': stats.shipped,
    'Delivered': stats.delivered,
    'Cancelled': stats.cancelled
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);


  if (loading) {
    return (
      <DashboardLayout>
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded-md w-48 animate-pulse mb-2"></div>
          <div className="h-4 bg-gray-200 rounded-md w-72 animate-pulse"></div>
        </div>

        {/* Row 1: 4 Summary Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <LoadingSkeleton type="summary" count={4} />
        </div>

        {/* Row 2: Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <LoadingSkeleton type="chart" />
          </div>
          <div className="lg:col-span-1">
            <LoadingSkeleton type="chart" />
          </div>
        </div>

        {/* Row 3: Top Items Lists Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
          <LoadingSkeleton type="list" count={2} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Toaster position="top-right" richColors />

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Overview</h1>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Here is the latest summary of your operations.
        </p>
      </div>

      {/* Row 1: Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatsCard title="TOTAL ORDERS" value={2} subtitle="All statuses combined" icon={ClipboardList} variant="summary" />
        <StatsCard title="ACTIVE ORDERS" value={2} subtitle="Excl. cancelled" icon={RefreshCw} variant="summary" />
        <StatsCard title="CATALOG ITEMS" value={2} subtitle="Total listings" icon={Box} variant="summary" />
        <StatsCard title="STOCK UNITS" value={0} subtitle="Sum of stock_qty" icon={Building2} variant="summary" />
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <OrdersByStatus orders={ordersByStatus} />
        </div>
        <div className="lg:col-span-1">
          <StockOverview hasStock={0} noStock={2} disabled={0} />
        </div>
      </div>

      {/* Row 3: Top Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        <TopItems 
          type="fast" 
          items={[
            { name: 'Care Adult Diaper L 5S', category: 'Hygiene Device', orders: 5, orderCount: 1 }
          ]} 
        />
        <TopItems type="slow" items={[]} />
      </div>
    </DashboardLayout>
  );
}

export default App;