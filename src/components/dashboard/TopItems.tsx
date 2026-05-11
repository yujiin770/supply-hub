import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Package, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TopItemsProps {
  type: 'fast' | 'slow';
  items: Array<{ name: string; orders: number }>;
}

const TopItems: React.FC<TopItemsProps> = ({ type, items }) => {
  const isFast = type === 'fast';
  
  const handleItemClick = (itemName: string) => {
    toast.info(`Viewing details for: ${itemName}`, {
      duration: 3000,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isFast ? (
            <TrendingUp className="w-5 h-5 text-green-600" />
          ) : (
            <TrendingDown className="w-5 h-5 text-orange-600" />
          )}
          <h3 className="text-lg font-semibold text-gray-900">
            {isFast ? 'Fast-Moving Items' : 'Slow-Moving Items'}
          </h3>
        </div>
        <span className="text-xs text-gray-500">Top {isFast ? '5' : '5'}</span>
      </div>
      
      {items.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {isFast 
              ? "Not enough data yet — need more than 5 distinct ordered items."
              : "Not enough data to display slow-moving items"
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <motion.button
              key={idx}
              whileHover={{ x: 5 }}
              onClick={() => handleItemClick(item.name)}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="text-sm font-medium text-gray-400 w-6">{idx + 1}</span>
                <Package className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors line-clamp-1">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{item.orders}</span>
                <span className="text-xs text-gray-500">order{item.orders !== 1 ? 's' : ''}</span>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default TopItems;