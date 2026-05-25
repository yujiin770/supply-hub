import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: LucideIcon;
    variant?: 'status' | 'summary';
    borderColor?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, subtitle, icon: Icon, variant = 'status', borderColor = 'border-l-4 border-l-[#21BBD7]' }) => {
    if (variant === 'status') {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between h-32 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F0FAFB] to-[#E6F0F9] text-[#21BBD7] flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:from-[#21BBD7] group-hover:to-[#004797] group-hover:text-white">
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
        <div className={`bg-white rounded-2xl border border-gray-100 ${borderColor} p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group`}>
            {/* Animated gradient background on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#21BBD7]/0 to-[#004797]/0 group-hover:from-[#21BBD7]/5 group-hover:to-[#004797]/5 transition-all duration-500"></div>
            
            {/* Decorative circle */}
            <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full from-[#21BBD7]/10 to-[#004797]/5 group-hover:scale-150 transition-transform duration-500"></div>
            
            {/* Icon with modern styling */}
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="w-12 h-12 rounded-xl from-[#21BBD7]/10 to-[#004797]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-6 h-6 text-[#004797] group-hover:text-[#21BBD7] transition-colors" />
                </div>
            </div>
            
            {/* Value and Title */}
            <div className="relative z-10">
                <div className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">
                    {value}
                </div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    {title}
                </div>
                {subtitle && (
                    <div className="text-xs text-gray-500 font-medium flex items-center gap-1">
                        <span className="inline-block w-1 h-1 rounded-full bg-[#21BBD7]"></span>
                        {subtitle}
                    </div>
                )}
            </div>

            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#21BBD7] to-[#004797] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>
    );
};

export default StatsCard;