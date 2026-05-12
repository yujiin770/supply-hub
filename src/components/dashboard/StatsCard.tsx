import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: LucideIcon;
    variant?: 'status' | 'summary';
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, subtitle, icon: Icon, variant = 'status' }) => {
    if (variant === 'status') {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between h-32 group">
                <div className="w-10 h-10 rounded-full  text-[#004797]  flex items-center justify-between transition-colors">
                    <Icon className="w-5 h-5" />
                </div>
                <div className="mt-2">
                    <div className="text-3xl font-extrabold text-gray-800 leading-none">{value}</div>
                    <div className="text-xs text-gray-500 font-medium mt-1.5 leading-tight">{title}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 from-[#21BBD7]/10 to-transparent rounded-bl-full -mr-4 -mt-4"></div>
            <div className="flex items-center gap-2 mb-4 relative z-10">
                <Icon className="w-4 h-4 text-[#004797]" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</span>
            </div>
            <div className="text-4xl font-extrabold text-[#004797] relative z-10">{value}</div>
            {subtitle && <div className="text-xs text-gray-500 mt-2 font-medium relative z-10">{subtitle}</div>}
        </div>
    );
};

export default StatsCard;