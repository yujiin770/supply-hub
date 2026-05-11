import React from 'react';
import { motion } from 'framer-motion';
import { Package, TrendingUp } from 'lucide-react';

interface OrdersByStatusProps {
  orders: Record<string, number>;
}

const OrdersByStatus: React.FC<OrdersByStatusProps> = ({ orders }) => {
  const statuses = [
    'Pending',
    'Awaiting Your Confirmation',
    'Awaiting Payment',
    'Confirmed',
    'Shipped',
    'Delivered',
    'Cancelled'
  ];

  const totalOrders = Object.values(orders).reduce((a, b) => a + b, 0);
  const activeOrders = totalOrders - (orders['Cancelled'] || 0);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Pending: 'bg-amber-400',
      'Awaiting Your Confirmation': 'bg-orange-400',
      'Awaiting Payment': 'bg-violet-400',
      Confirmed: 'bg-emerald-500',
      Shipped: 'bg-sky-500',
      Delivered: 'bg-emerald-700',
      Cancelled: 'bg-red-500'
    };
    return colors[status] || 'bg-slate-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Orders by Status</h3>
          <p className="text-sm text-slate-500 mt-1">Track status counts and progress in one view.</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-slate-600">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
            <Package className="w-4 h-4 text-slate-500" />
            <span>Total: <strong>{totalOrders}</strong></span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>Active: <strong>{activeOrders}</strong></span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {statuses.map((status) => {
          const count = orders[status] || 0;
          const width = totalOrders === 0 ? 0 : (count / totalOrders) * 100;

          return (
            <div key={status} className="space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-700">
                <span>{status}</span>
                <span className="font-semibold text-slate-900">{count}</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`${getStatusColor(status)} h-full rounded-full transition-all duration-500`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default OrdersByStatus;