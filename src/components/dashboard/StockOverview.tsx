import React from 'react';
import { motion } from 'framer-motion';
import { PackageOpen, PackageX, Ban, TrendingDown } from 'lucide-react';

interface StockOverviewProps {
  hasStock: number;
  noStock: number;
  disabled: number;
}

const StockOverview: React.FC<StockOverviewProps> = ({ hasStock, noStock, disabled }) => {
  const total = hasStock + noStock + disabled;
  
  const getPercentage = (value: number) => {
    if (total === 0) return 0;
    return (value / total) * 100;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Overview</h3>
      <p className="text-sm text-gray-500 mb-4">Listings breakdown by availability</p>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
          <div className="flex items-center gap-3">
            <PackageOpen className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-900">Has Stock</span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-green-700">{hasStock}</span>
            <span className="text-sm text-green-600 ml-1">({getPercentage(hasStock).toFixed(1)}%)</span>
          </div>
        </div>
        
        <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
          <div className="flex items-center gap-3">
            <PackageX className="w-5 h-5 text-red-600" />
            <span className="font-medium text-red-900">No Stock</span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-red-700">{noStock}</span>
            <span className="text-sm text-red-600 ml-1">({getPercentage(noStock).toFixed(1)}%)</span>
          </div>
        </div>
        
        <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
          <div className="flex items-center gap-3">
            <Ban className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">Disabled</span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-gray-700">{disabled}</span>
            <span className="text-sm text-gray-600 ml-1">({getPercentage(disabled).toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      {hasStock === 0 && noStock > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 rounded-lg flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-yellow-600" />
          <p className="text-xs text-yellow-800">Alert: All items are out of stock!</p>
        </div>
      )}
    </motion.div>
  );
};

export default StockOverview;