import React from 'react';
import { Home, ClipboardList, Building2, BookOpen, Upload, Clock, ShoppingBag } from 'lucide-react';
import SidebarNavItem from './SidebarNavItem';

interface SidebarNavProps {
    activeItem: string;
    isDesktopCollapsed: boolean;
    onItemClick: (label: string) => void;
}

const SidebarNav: React.FC<SidebarNavProps> = ({ activeItem, isDesktopCollapsed, onItemClick }) => {
    const menuGroups = [
        {
            title: 'ONBOARDING',
            items: [
                { label: 'Overview', icon: ClipboardList },
                { label: 'KYC Documents', icon: Building2 },
            ]
        },
        {
            title: 'CATALOG',
            items: [
                { label: 'My Catalog', icon: BookOpen },
                { label: 'Import Missing Items', icon: Upload },
                { label: 'Recently Added', icon: Clock },
            ]
        },
        {
            title: 'OPERATIONS',
            items: [
                { label: 'Orders', icon: ShoppingBag },
            ]
        }
    ];

    return (
        <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-6 scrollbar-hide overflow-x-hidden">
            <div className="px-3">
                <SidebarNavItem
                    icon={Home}
                    label="Dashboard"
                    isActive={activeItem === 'Dashboard'}
                    isDesktopCollapsed={isDesktopCollapsed}
                    onClick={() => onItemClick('Dashboard')}
                />
            </div>

            {menuGroups.map((group, idx) => (
                <div key={idx} className="flex flex-col">
                    {!isDesktopCollapsed && (
                        <div className="px-6 mb-2 text-xs font-bold text-gray-400 tracking-wider">
                            {group.title}
                        </div>
                    )}
                    <div className="space-y-1 px-3">
                        {group.items.map((item) => (
                            <SidebarNavItem
                                key={item.label}
                                icon={item.icon}
                                label={item.label}
                                isActive={activeItem === item.label}
                                isDesktopCollapsed={isDesktopCollapsed}
                                onClick={() => onItemClick(item.label)}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SidebarNav;