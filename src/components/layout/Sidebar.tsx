import React, { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  BarChart3,
  Truck,
  Wallet,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'Orders', icon: ShoppingCart, badge: 2 },
  { id: 'products', label: 'Products', icon: Package, badge: 12 },
  { id: 'catalog', label: 'Catalog', icon: Tag },
  { id: 'inventory', label: 'Inventory', icon: BarChart3 },
  { id: 'shipments', label: 'Shipments', icon: Truck },
  { id: 'payments', label: 'Payments', icon: Wallet },
  { id: 'customers', label: 'Customers', icon: Users },
];

const bottomMenuItems = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help', label: 'Help', icon: HelpCircle },
];

const Sidebar: React.FC = () => {
  const [activeItem, setActiveItem] = useState('dashboard');

  const handleNavigation = (id: string, label: string) => {
    setActiveItem(id);
    toast.info(`Navigating to ${label}`, { duration: 2000 });
  };

  const handleLogout = () => {
    toast.success('Logged out successfully', { duration: 3000 });
  };

  return (
    <aside className="h-full min-h-screen rounded-[32px] border border-slate-900 bg-slate-950 text-slate-100 shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 px-6 py-7">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-violet-600 shadow-lg shadow-slate-900/30">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">SupplyHub</p>
            <p className="text-xl font-semibold text-white">Inventory Center</p>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-800 px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500 to-violet-600 text-sm font-semibold text-white shadow-lg shadow-slate-900/30">
            LG
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Lander Gallego</p>
            <p className="text-xs text-slate-500">Supplier Admin</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id, item.label)}
                className={`w-full rounded-3xl px-4 py-3 text-left transition-all duration-200 ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-[0_20px_50px_-30px_rgba(15,23,42,0.9)]'
                    : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                    <span className="text-sm font-medium leading-tight">{item.label}</span>
                  </div>
                  {item.badge ? (
                    <span className="rounded-full bg-red-500 px-2 py-1 text-[11px] font-semibold text-white">{item.badge}</span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-7 border-t border-slate-800 pt-5">
          <div className="space-y-2">
            {bottomMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id, item.label)}
                  className={`w-full rounded-3xl px-4 py-3 text-left transition-all duration-200 ${
                    isActive
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:bg-slate-900/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium leading-tight">{item.label}</span>
                  </div>
                </button>
              );
            })}

            <button
              onClick={handleLogout}
              className="w-full rounded-3xl px-4 py-3 text-left text-red-400 transition-all duration-200 hover:bg-red-500/10 hover:text-red-200"
            >
              <div className="flex items-center gap-3">
                <LogOut className="h-5 w-5" />
                <span className="text-sm font-medium">Logout</span>
              </div>
            </button>
          </div>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
