import React from 'react';

interface SidebarAccountProps {
    isDesktopCollapsed: boolean;
}

const SidebarAccount: React.FC<SidebarAccountProps> = ({ isDesktopCollapsed }) => {
    return (
        <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0 whitespace-nowrap overflow-hidden h-18.25">
            <div className={`transition-all duration-300 origin-left ${isDesktopCollapsed ? 'md:opacity-0 md:scale-0' : 'opacity-100 scale-100'}`}>
                <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Account ID</div>
                <div className="text-sm font-mono font-medium text-[#004797] bg-white px-2 py-1 rounded border border-gray-200 inline-block">
                    SUP-000001
                </div>
            </div>
        </div>
    );
};

export default SidebarAccount;