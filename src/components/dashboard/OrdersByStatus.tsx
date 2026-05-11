import React from 'react';
import { Hourglass, Bell, CreditCard, CheckSquare, Truck, Package, X } from 'lucide-react';

interface OrdersByStatusProps {
    orders: Record<string, number>;
}

const OrdersByStatus: React.FC<OrdersByStatusProps> = ({ orders }) => {
    const statuses = [
        { label: 'Pending', icon: Hourglass, color: 'from-amber-300 to-amber-400' },
        { label: 'Awaiting Confirmation', icon: Bell, color: 'from-orange-300 to-orange-400' },
        { label: 'Awaiting Payment', icon: CreditCard, color: 'from-blue-300 to-blue-400' },
        { label: 'Confirmed', icon: CheckSquare, color: 'from-[#21BBD7] to-[#004797]' },
        { label: 'Shipped', icon: Truck, color: 'from-purple-300 to-purple-400' },
        { label: 'Delivered', icon: Package, color: 'from-emerald-400 to-emerald-500' },
        { label: 'Cancelled', icon: X, color: 'from-gray-300 to-gray-400' }
    ];

    const totalOrders = Object.values(orders).reduce((a, b) => a + b, 0);

    return (
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-800">Orders by Status</h3>
                <span className="bg-[#F0FAFB] text-[#004797] px-3 py-1 rounded-lg text-xs font-bold border border-[#D9EAF5]">
                    Total: {totalOrders}
                </span>
            </div>

            <div className="space-y-4 flex-1">
                {statuses.map((status) => {
                    const count = orders[status.label] || orders['Awaiting Your Confirmation'] || 0; // fallback for naming mismatch
                    const actualCount = status.label === 'Awaiting Confirmation' ? orders['Awaiting Your Confirmation'] : orders[status.label] || 0;
                    const width = totalOrders === 0 ? 0 : (actualCount / totalOrders) * 100;
                    const Icon = status.icon;

                    return (
                        <div key={status.label} className="flex items-center gap-4 text-sm group">
                            <div className="w-40 sm:w-48 flex items-center gap-2 text-gray-500 font-medium group-hover:text-gray-800 transition-colors">
                                <Icon className="w-4 h-4 opacity-70" />
                                <span className="truncate">{status.label}</span>
                            </div>
                            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full bg-gradient-to-r ${status.color} transition-all duration-700 ease-out rounded-full`}
                                    style={{ width: `${width}%` }}
                                />
                            </div>
                            <div className="w-8 font-bold text-gray-700 text-right">{actualCount}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default OrdersByStatus;