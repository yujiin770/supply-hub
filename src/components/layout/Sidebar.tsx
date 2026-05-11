// src/components/layout/Sidebar.tsx
import React from 'react';
import { Home, FileText, BookOpen, Upload, Clock, ShoppingBag } from 'lucide-react';

interface SidebarProps {
    isDesktopCollapsed: boolean;
    isMobileOpen: boolean;
    setIsMobileOpen: (val: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isDesktopCollapsed, isMobileOpen, setIsMobileOpen }) => {
    const menuGroups = [
        {
            title: 'ONBOARDING',
            items: [
                { label: 'Overview', icon: FileText, active: false },
                { label: 'KYC Documents', icon: FileText, active: false },
            ]
        },
        {
            title: 'CATALOG',
            items: [
                { label: 'My Catalog', icon: BookOpen, active: false },
                { label: 'Import Missing', icon: Upload, active: false },
                { label: 'Recently Added', icon: Clock, active: false },
            ]
        },
        {
            title: 'OPERATIONS',
            items: [
                { label: 'Orders', icon: ShoppingBag, active: false },
            ]
        }
    ];

    return (
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
            {/* Logo Area - With Smooth Crossfade Transition */}
            <div className="h-16 flex items-center justify-center border-b border-gray-100 px-4 shrink-0 whitespace-nowrap overflow-hidden relative">
                {/* Full Logo (Shows when expanded) */}
                <img
                    src="/logo.png"  
                    alt="SupplyHub"
                    className={`absolute transition-all duration-300 object-contain w-40 ${isDesktopCollapsed ? 'opacity-0 scale-90 pointer-events-none md:block hidden' : 'opacity-100 scale-100'}`}
                />
                
                {/* Small Logo Icon (Shows when collapsed) - SAVE THIS AS "logo-icon.png" in public folder */}
                <img
                    src="/logo-icon.png"  
                    alt="SupplyHub Icon"
                    className={`absolute transition-all duration-300 object-contain w-8 ${isDesktopCollapsed ? 'opacity-100 scale-100 md:block hidden' : 'opacity-0 scale-50 pointer-events-none hidden'}`}
                />
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-6 scrollbar-hide overflow-x-hidden">
                <div className="px-3">
                    <a href="#" onClick={() => setIsMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 bg-gradient-to-r from-[#F0FAFB] to-[#E6F0F9] text-[#004797] rounded-xl font-bold text-sm shadow-sm border border-[#D9EAF5] group relative">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#21BBD7] rounded-l-xl"></div>
                        <Home className="w-5 h-5 shrink-0" />
                        <span className={`transition-all duration-300 whitespace-nowrap origin-left ${isDesktopCollapsed ? 'md:opacity-0 md:scale-0 md:w-0' : 'opacity-100 scale-100 w-auto'}`}>
                            Dashboard
                        </span>
                    </a>
                </div>

                {menuGroups.map((group, idx) => (
                    <div key={idx} className="flex flex-col">
                        <div className={`px-6 mb-2 text-xs font-bold text-gray-400 tracking-wider whitespace-nowrap transition-all duration-300 ${isDesktopCollapsed ? 'md:opacity-0 md:h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
                            {group.title}
                        </div>
                        <div className="space-y-1 px-3">
                            {group.items.map((item, i) => {
                                const Icon = item.icon;
                                return (
                                    <a key={i} href="#" onClick={() => setIsMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-gray-500 hover:bg-gray-50 hover:text-[#004797] rounded-xl text-sm font-medium transition-all group relative">
                                        <Icon className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
                                        <span className={`transition-all duration-300 whitespace-nowrap origin-left ${isDesktopCollapsed ? 'md:opacity-0 md:scale-0 md:w-0' : 'opacity-100 scale-100 w-auto'}`}>
                                            {item.label}
                                        </span>
                                        {/* Tooltip for desktop collapsed mode */}
                                        {isDesktopCollapsed && (
                                            <div className="hidden md:block absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                                                {item.label}
                                            </div>
                                        )}
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Account Area */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0 whitespace-nowrap overflow-hidden h-[73px]">
                <div className={`transition-all duration-300 origin-left ${isDesktopCollapsed ? 'md:opacity-0 md:scale-0' : 'opacity-100 scale-100'}`}>
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Account ID</div>
                    <div className="text-sm font-mono font-medium text-[#004797] bg-white px-2 py-1 rounded border border-gray-200 inline-block">SUP-000001</div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;