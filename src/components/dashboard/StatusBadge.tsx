import React from 'react';

interface StatusBadgeProps {
  status: string;
  count: number;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, count }) => {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Awaiting Your Confirmation': 'bg-orange-100 text-orange-800 border-orange-200',
      'Awaiting Payment': 'bg-purple-100 text-purple-800 border-purple-200',
      'Confirmed': 'bg-green-100 text-green-800 border-green-200',
      'Shipped': 'bg-blue-100 text-blue-800 border-blue-200',
      'Delivered': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'Cancelled': 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className={`px-4 py-2 rounded-lg border ${getStatusColor(status)} transition-all hover:scale-105`}>
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs font-medium">{status}</span>
        <span className="text-xl font-bold">{count}</span>
      </div>
    </div>
  );
};

export default StatusBadge;