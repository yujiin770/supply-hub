import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color?: string;
  bgColor?: string;
  variant?: 'default' | 'small';
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  color = 'text-blue-600',
  bgColor = 'bg-blue-50',
  variant = 'default'
}) => {
  const compact = variant === 'small';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: compact ? 0 : -5 }}
      className={`bg-white rounded-3xl shadow-sm border border-gray-200 p-5 ${compact ? 'space-y-3' : 'p-6 hover:shadow-md'} transition-all`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={`font-semibold ${compact ? 'text-xs uppercase tracking-[0.2em] text-slate-500' : 'text-sm text-gray-500'}`}>
            {title}
          </p>
          <p className={`${compact ? 'text-2xl' : 'text-3xl'} font-bold text-slate-900 mt-2`}>
            {value}
          </p>
        </div>
        <div className={`${bgColor} ${compact ? 'p-2.5' : 'p-3'} rounded-2xl`}>
          <Icon className={`${color} ${compact ? 'w-5 h-5' : 'w-6 h-6'}`} />
        </div>
      </div>
    </motion.div>
  );
};

export default StatsCard;