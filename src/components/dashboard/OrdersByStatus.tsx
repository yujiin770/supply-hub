// src/components/dashboard/OrdersByStatus.tsx
import React from 'react';
import { Hourglass, Bell, CreditCard, CheckSquare, Truck, Package, X } from 'lucide-react';

interface OrdersByStatusProps {
    orders: Record<string, number>;
}

const OrdersByStatus: React.FC<OrdersByStatusProps> = ({ orders }) => {
    const statuses = [
        { label: 'Pending', icon: Hourglass, color: 'bg-amber-500' },
        { label: 'Awaiting Confirmation', icon: Bell, color: 'bg-orange-500' },
        { label: 'Awaiting Payment', icon: CreditCard, color: 'bg-blue-500'},
        { label: 'Confirmed', icon: CheckSquare, color: 'bg-[#21BBD7]' },
        { label: 'Shipped', icon: Truck, color: 'bg-purple-500'},
        { label: 'Delivered', icon: Package, color: 'bg-emerald-500'},
        { label: 'Cancelled', icon: X, color: 'bg-gray-400', bgColor: 'bg-gray-50' }
    ];

    const totalOrders = Object.values(orders).reduce((a, b) => a + b, 0);

    return (
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Orders by Status</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Order distribution overview</p>
                </div>
                <div className="bg-[#004797] text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm">
                    Total: {totalOrders}
                </div>
            </div>

            {/* Status Grid - 2 columns on mobile, 3 on tablet, 4 on desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {statuses.map((status) => {
                    const actualCount = status.label === 'Awaiting Confirmation'
                        ? orders['Awaiting Your Confirmation']
                        : orders[status.label] || 0;
                    const Icon = status.icon;

                    return (
                        <div
                            key={status.label}
                            className="group relative overflow-hidden rounded-xl border border-gray-100 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
                        >
                            {/* Colored top bar */}
                            <div className={`h-1 w-full ${status.color}`}></div>

                            {/* Content */}
                            <div className="p-4">
                                <div className={`w-8 h-8 rounded-lg ${status.bgColor} flex items-center justify-center mb-3`}>
                                    <Icon className={`w-4 h-4 ${status.label === 'Confirmed' ? 'text-[#21BBD7]' : status.label === 'Cancelled' ? 'text-gray-500' : 'text-gray-600'}`} />
                                </div>

                                <div className="text-2xl font-bold text-gray-800 mb-1">
                                    {actualCount}
                                </div>

                                <div className="text-xs text-gray-500 font-medium truncate">
                                    {status.label}
                                </div>

                                {/* Progress bar for visual representation */}
                                <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${status.color} rounded-full transition-all duration-500`}
                                        style={{ width: totalOrders === 0 ? '0%' : `${(actualCount / totalOrders) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default OrdersByStatus;