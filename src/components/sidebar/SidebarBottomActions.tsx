import React from 'react';
import { Settings, HelpCircle, LogOut } from 'lucide-react';
import SidebarNavItem from './SidebarNavItem';

interface SidebarBottomActionsProps {
    isDesktopCollapsed: boolean;
}

const SidebarBottomActions: React.FC<SidebarBottomActionsProps> = ({ isDesktopCollapsed }) => {
    const bottomItems = [
        { label: 'Settings', icon: Settings },
        { label: 'Help', icon: HelpCircle },
        { label: 'Logout', icon: LogOut },
    ];

    return (
        <div className="border-t border-gray-100 pt-4 pb-6">
            <div className="space-y-1 px-3">
                {bottomItems.map((item) => (
                    <SidebarNavItem
                        key={item.label}
                        icon={item.icon}
                        label={item.label}
                        isActive={false}
                        isDesktopCollapsed={isDesktopCollapsed}
                        onClick={() => console.log(`${item.label} clicked`)}
                    />
                ))}
            </div>
        </div>
    );
};

export default SidebarBottomActions;