import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu, Bell, User, X } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#F4F7FE] font-sans overflow-hidden">

      {/* Mobile Dark Overlay - click to close sidebar */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <Sidebar
        isDesktopCollapsed={isDesktopCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        setIsDesktopCollapsed={setIsDesktopCollapsed}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 relative w-full">

        {/* Acting as Supplier Banner - Yellow */}
        <div className="bg-amber-400 border-b border-amber-200 px-4 sm:px-6 py-2.5 shrink-0">
          {/* Desktop Layout */}
          <div className="hidden sm:flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-white">
              <span className="font-medium">Acting as supplier:</span>
              <span className="font-bold">Lander Gallego Ambito</span>
              <span className="text-white/90">—</span>
              <span className="text-white/90">any action you take will affect this supplier's account.</span>
            </div>
            <button className="bg-white text-amber-600 hover:bg-amber-50 hover:text-amber-700 px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 transition-colors shadow-sm">
              <X className="w-3.5 h-3.5" />
              <span>Exit supplier view</span>
            </button>
          </div>

          {/* Mobile Layout */}
          <div className="sm:hidden space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm text-white">
                <span className="font-medium">Acting as supplier:</span>
                <span className="font-bold">Lander Gallego Ambito</span>
              </div>
              <button className="bg-white text-amber-600 hover:bg-amber-50 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors shadow-sm">
                <X className="w-3 h-3" />
                <span>Exit</span>
              </button>
            </div>
            <div className="text-xs text-white/90 flex items-start gap-1">
              <span>—</span>
              <span>any action you take will affect this supplier's account.</span>
            </div>
          </div>
        </div>

        {/* Top Header */}
        <header className="bg-white border-b border-gray-100 h-16 flex items-center justify-between px-4 sm:px-6 z-10 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop Hamburger Button */}
            <button
              onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
              className="p-2 rounded-lg cursor-pointer hover:bg-gray-100 text-gray-600 transition-colors hidden md:block"
            >
              <Menu className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-[#004797] hidden sm:block">Supplier Portal</h2>
          </div>

          <div className="flex items-center gap-4">

            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-gray-800 leading-tight">Lander Gallego Ambito</div>
                <div className="text-xs text-gray-500">Supplier Admin</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-r from-[#21BBD7] to-[#004797] flex items-center justify-center text-white shadow-md">
                <User className="w-4 h-4" />
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full">
          <div className="max-w-[1550px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;