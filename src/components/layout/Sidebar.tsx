import React, { useState } from 'react';
import SidebarLogo from '../sidebar/SidebarLogo';
import SidebarNav from '../sidebar/SidebarNav';
import SidebarBottomActions from '../sidebar/SidebarBottomActions';
import SidebarAccount from '../sidebar/SidebarAccount';

interface SidebarProps {
    isDesktopCollapsed: boolean;
    isMobileOpen: boolean;
    setIsMobileOpen: (val: boolean) => void;
    setIsDesktopCollapsed: (val: boolean) => void;
    onNavigate: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    isDesktopCollapsed,
    isMobileOpen,
    setIsMobileOpen,
    onNavigate
}) => {
    const [activeItem, setActiveItem] = useState('Dashboard');

    const handleItemClick = (label: string) => {
        setActiveItem(label);
        setIsMobileOpen(false);

        if (label === 'Dashboard') onNavigate('dashboard');
        else if (label === 'Overview') onNavigate('overview');
        else if (label === 'KYC Documents') onNavigate('kyc');
        else if (label === 'My Catalog') onNavigate('catalog');
    };

    return (
        <>
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity cursor-pointer"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-100 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.05)]
                    transition-all duration-300 ease-in-out
                    md:relative md:translate-x-0
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} 
                    ${isDesktopCollapsed ? 'md:w-20' : 'md:w-64'}
                    w-64
                `}
            >
                <SidebarLogo isDesktopCollapsed={isDesktopCollapsed} />
                <SidebarNav
                    activeItem={activeItem}
                    isDesktopCollapsed={isDesktopCollapsed}
                    onItemClick={handleItemClick}
                />
                <SidebarBottomActions isDesktopCollapsed={isDesktopCollapsed} />
                <SidebarAccount isDesktopCollapsed={isDesktopCollapsed} />
            </aside>
        </>
    );
};

export default Sidebar;