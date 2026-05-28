import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface SidebarNavItemProps {
    icon: LucideIcon;
    label: string;
    isActive: boolean;
    isDesktopCollapsed: boolean;
    onClick: () => void;
}

const SidebarNavItem: React.FC<SidebarNavItemProps> = ({ 
    icon: Icon, 
    label, 
    isActive, 
    isDesktopCollapsed, 
    onClick 
}) => {
    return (
        <button
            onClick={onClick}
            className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 group relative cursor-pointer
                ${isDesktopCollapsed ? 'md:justify-center' : ''}
                ${isActive 
                    ? 'bg-linear-to-r from-[#F0FAFB] to-[#E6F0F9] text-[#004797] shadow-sm border border-[#D9EAF5]' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-[#004797]'
                }
            `}
        >
            {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"></div>
            )}
            <Icon className="w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-105" />
            {!isDesktopCollapsed && (
                <span className="whitespace-nowrap">{label}</span>
            )}
            {isDesktopCollapsed && (
                <div className="fixed left-16 bg-gray-900 text-white text-xs px-2 py-1 rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg ml-2 pointer-events-none">
                    {label}
                </div>
            )}
        </button>
    );
};

export default SidebarNavItem;