import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import DashboardLayout from './components/layout/DashboardLayout';
import Sidebar from './components/layout/Sidebar';
import WelcomeHeader from './components/dashboard/WelcomeHeader';
import StatsCard from './components/dashboard/StatsCard';
import OrdersByStatus from './components/dashboard/OrdersByStatus';
import StockOverview from './components/dashboard/StockOverview';
import TopItems from './components/dashboard/TopItems';
import LoadingSkeleton from './components/ui/LoadingSkeleton';
import {
  Clock,
  UserCheck,
  CreditCard,
  CheckCircle,
  Truck,
  MapPin,
  XCircle,
  ShoppingBag,
  Package,
  Boxes
} from 'lucide-react';

function App() {
  const [loading, setLoading] = useState(true);

  // Mock data - replace with your actual data
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

  const totalOrders = Object.values(ordersByStatus).reduce((a, b) => a + b, 0);
  const activeOrders = totalOrders - stats.cancelled;

  // Simulate loading data
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="h-32 bg-gray-100 rounded-3xl animate-pulse"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-3">
            <LoadingSkeleton type="stats" count={7} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <LoadingSkeleton type="stats" count={4} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LoadingSkeleton type="orders" />
            <LoadingSkeleton type="stock" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Toaster position="top-right" richColors />

      <div className="lg:grid lg:grid-cols-[280px_1fr] gap-6">
        <aside className="sticky top-6 self-start w-full max-w-[280px] rounded-[32px]">
          <Sidebar />
        </aside>

        <main className="space-y-6">
          <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
                <p className="mt-2 text-sm text-slate-500">
                  Welcome back, <span className="font-semibold text-slate-900">Lander Gallego Ambito</span>. Here's your overview.
                </p>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                Acting as supplier: <span className="font-semibold text-slate-900">Lander Gallego Ambito</span>
              </div>
            </div>
          </div>

          <WelcomeHeader name="Lander Gallego Ambito" />

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-3">
            <StatsCard title="Pending" value={stats.pending} icon={Clock} color="text-amber-600" bgColor="bg-amber-50" variant="small" />
            <StatsCard title="Awaiting Your Confirmation" value={stats.awaitingConfirmation} icon={UserCheck} color="text-orange-600" bgColor="bg-orange-50" variant="small" />
            <StatsCard title="Awaiting Payment" value={stats.awaitingPayment} icon={CreditCard} color="text-violet-600" bgColor="bg-violet-50" variant="small" />
            <StatsCard title="Confirmed" value={stats.confirmed} icon={CheckCircle} color="text-emerald-600" bgColor="bg-emerald-50" variant="small" />
            <StatsCard title="Shipped" value={stats.shipped} icon={Truck} color="text-sky-600" bgColor="bg-sky-50" variant="small" />
            <StatsCard title="Delivered" value={stats.delivered} icon={MapPin} color="text-emerald-700" bgColor="bg-emerald-50" variant="small" />
            <StatsCard title="Cancelled" value={stats.cancelled} icon={XCircle} color="text-red-600" bgColor="bg-red-50" variant="small" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <StatsCard title="Total Orders" value={totalOrders} icon={ShoppingBag} color="text-slate-900" bgColor="bg-slate-50" />
            <StatsCard title="Active Orders" value={activeOrders} icon={Package} color="text-green-600" bgColor="bg-emerald-50" />
            <StatsCard title="Catalog Items" value={2} icon={Boxes} color="text-purple-600" bgColor="bg-purple-50" />
            <StatsCard title="Total Stock Units" value={0} icon={Package} color="text-orange-600" bgColor="bg-orange-50" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <OrdersByStatus orders={ordersByStatus} />
            <StockOverview hasStock={0} noStock={2} disabled={0} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopItems type="fast" items={[{ name: 'Care Adult Diaper L S5 Hygiene Device', orders: 5 }]} />
            <TopItems type="slow" items={[]} />
          </div>
        </main>
    </div>
    </DashboardLayout>
  );
}

export default App;