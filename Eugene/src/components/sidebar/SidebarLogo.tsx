import React from 'react';

interface SidebarLogoProps {
    isDesktopCollapsed: boolean;
}

const SidebarLogo: React.FC<SidebarLogoProps> = ({ isDesktopCollapsed }) => {
    return (
        <div className={`h-25 flex items-center border-b border-gray-100 justify-center py-2 shrink-0 relative ${isDesktopCollapsed ? 'md:justify-center' : ''}`}>
            <img
                src="/logo.png"
                alt="SupplyHub"
                className={`absolute transition-all duration-300 object-contain w-40 ${isDesktopCollapsed ? 'opacity-0 scale-90 pointer-events-none md:block hidden' : 'opacity-100 scale-100'}`}
            />
            <img
                src="/logo-icon.png"
                alt="SupplyHub Icon"
                className={`absolute transition-all duration-300 object-contain w-8 ${isDesktopCollapsed ? 'opacity-100 scale-100 md:block' : 'opacity-0 scale-50 pointer-events-none hidden'}`}
            />
        </div>
    );
};

export default SidebarLogo;