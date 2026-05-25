import React, { useState } from 'react';
import { 
  Search, ChevronDown, ChevronUp, Plus, Check, X, 
  ChevronRight, ChevronLeft, Filter as FilterIcon 
} from 'lucide-react';

interface BrowseItem {
  id: string;
  brandName: string;
  strength: string;
  form: string;
  packSize: string;
  manufacturer: string;
  barcode: string;
  sku: string;
  route: string;
  status: string;
  added?: boolean;
}

const BROWSE_DATA: BrowseItem[] = [
  { id: '1', brandName: 'AA-Cetirizine-478', strength: 'Cetirizine 10 mg', form: 'Syrup', packSize: '60.0000 mL', manufacturer: 'AstraZeneca plc', barcode: '4805441005531', sku: 'UNILAB-CETIRIZINE-478', route: 'Oral', status: 'Active', added: true },
  { id: '2', brandName: 'Absolute Distilled Water', strength: 'Purified Water 1000 mL', form: 'Not Applicable', packSize: '12.0000 L', manufacturer: 'Bayer Philippines', barcode: '480000000003', sku: 'BAY-WATER-001', route: 'Not Applicable', status: 'Active' },
  { id: '3', brandName: 'Alaxan FR', strength: 'ibuprofen 200 mg + paracetamol 325 mg', form: 'Tablet', packSize: '100.0000 tab', manufacturer: 'Unilab Inc.', barcode: '4800016012345', sku: 'UNI-ALX-FR', route: 'Oral', status: 'Active' },
];

const BrowseCatalog: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleRow = (id: string) => setExpandedId(expandedId === id ? null : id);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col h-screen overflow-hidden">
      
      {/* --- TOP NAVIGATION BAR --- */}
      <header className="bg-white border-b border-gray-100 min-h-[64px] flex items-center px-4 sm:px-6 sticky top-0 z-[60] gap-4 shrink-0">
        <h2 className="text-lg font-extrabold text-gray-900 shrink-0 hidden sm:block">Browse Catalog</h2>
        
        <div className="relative flex-1 max-w-2xl group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search brand name, INN, barcode..." 
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2.5 bg-gray-100 text-gray-600 rounded-xl"
          >
            <FilterIcon className="w-5 h-5" />
          </button>
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        
        {/* --- RESPONSIVE SIDEBAR (Overlay on Mobile, Sidebar on Desktop) --- */}
        {isSidebarOpen && (
            <div className="fixed inset-0 bg-black/40 z-[70] lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
        )}
        <aside className={`
          fixed inset-y-0 left-0 z-[80] w-72 bg-white border-r border-gray-100 transition-transform duration-300 transform
          lg:relative lg:translate-x-0 lg:z-0 lg:w-64
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="p-6 space-y-8 overflow-y-auto h-full custom-scrollbar">
            <div className="flex items-center justify-between lg:hidden mb-4">
              <span className="font-bold text-gray-900">Filters</span>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2"><X className="w-5 h-5" /></button>
            </div>
            
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors">
              <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-xs font-bold text-gray-600">Not in my catalog</span>
            </label>

            <div className="space-y-4">
               <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest px-1">Dosage Form</h4>
               <div className="space-y-2">
                  {['Capsule', 'Inhaler', 'Lotion', 'Syrup', 'Tablet'].map(f => (
                    <label key={f} className="flex items-center gap-3 px-1 cursor-pointer group">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-200 text-blue-600" />
                      <span className="text-xs font-medium text-gray-500 group-hover:text-gray-900">{f}</span>
                    </label>
                  ))}
               </div>
            </div>
          </div>
        </aside>

        {/* --- MAIN TABLE AREA --- */}
        <main className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 sm:p-6 flex items-center justify-between shrink-0">
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">50 / 165 Products found</p>
             <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/10 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add all visible
             </button>
          </div>

          {/* TABLE CONTAINER WITH HORIZONTAL SCROLL */}
          <div className="flex-1 overflow-auto custom-scrollbar px-4 sm:px-6">
            <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden mb-8">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Brand Name</th>
                    <th className="px-6 py-4">Strength / INN</th>
                    <th className="px-6 py-4">Form</th>
                    <th className="px-6 py-4">Pack Size</th>
                    <th className="px-6 py-4">Manufacturer</th>
                    <th className="px-6 py-4">Barcode</th>
                    <th className="px-6 py-4 sticky right-0 bg-gray-50/90 backdrop-blur shadow-[-12px_0_15px_-4px_rgba(0,0,0,0.02)]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {BROWSE_DATA.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr 
                        onClick={() => toggleRow(item.id)}
                        className={`cursor-pointer transition-all ${expandedId === item.id ? 'bg-blue-50/40' : 'hover:bg-gray-50/50'}`}
                      >
                        <td className="px-6 py-5 text-sm font-extrabold text-gray-900">{item.brandName}</td>
                        <td className="px-6 py-5 text-xs font-bold text-gray-500 whitespace-nowrap">{item.strength}</td>
                        <td className="px-6 py-5 text-xs font-medium text-gray-400 uppercase">{item.form}</td>
                        <td className="px-6 py-5 text-xs font-medium text-gray-400 whitespace-nowrap">{item.packSize}</td>
                        <td className="px-6 py-5 text-xs font-medium text-gray-400 whitespace-nowrap">{item.manufacturer}</td>
                        <td className="px-6 py-5 text-xs font-mono text-gray-400">{item.barcode}</td>
                        <td className="px-6 py-5 text-right sticky right-0 bg-inherit transition-all shadow-[-12px_0_15px_-4px_rgba(0,0,0,0.02)]">
                          <div className="flex items-center justify-end gap-3">
                            {expandedId === item.id ? <ChevronUp className="w-4 h-4 text-blue-500" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                            {item.added ? (
                              <span className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-emerald-100">Added</span>
                            ) : (
                              <button className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold active:scale-95 transition-transform"><Plus className="w-3.5 h-3.5" /></button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* --- EXPANDED DETAILS (Inside Table Row) --- */}
                      {expandedId === item.id && (
                        <tr className="bg-gray-50/60 transition-all duration-300">
                          <td colSpan={7} className="px-10 py-10">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 animate-in fade-in slide-in-from-top-2 duration-300">
                              <div className="space-y-6">
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Pack ID</label><p className="text-xs font-mono text-gray-500">79a8bee4-fb88-4829-94df-a24d6f093b3b</p></div>
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Dosage Form</label><p className="text-xs font-bold text-gray-900 uppercase">{item.form}</p></div>
                              </div>
                              <div className="space-y-6">
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">SKU</label><p className="text-xs font-mono text-gray-500">{item.sku}</p></div>
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Route</label><p className="text-xs font-bold text-gray-900 uppercase">{item.route}</p></div>
                              </div>
                              <div className="space-y-6">
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Barcode</label><p className="text-xs font-mono text-gray-500">{item.barcode}</p></div>
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Manufacturer</label><p className="text-xs font-bold text-gray-900 uppercase">{item.manufacturer}</p></div>
                              </div>
                              <div className="space-y-6">
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Pack Size</label><p className="text-xs font-bold text-gray-900 uppercase">{item.packSize}</p></div>
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Status</label><div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold mt-1 uppercase"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />{item.status}</div></div>
                              </div>
                            </div>
                            
                            <div className="mt-10 pt-8 border-t border-gray-200">
                               <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-4">Active Ingredients</h4>
                               <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold border border-blue-100">
                                  {item.strength.split(' ')[0]} <span className="opacity-50">{item.strength.split(' ').slice(1).join(' ')}</span>
                               </div>
                               <p className="mt-4 text-[11px] italic text-gray-400 font-medium">Indications: Relieves seasonal and perennial allergic rhinitis.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* --- COMPACT PAGINATION (Fixed at Bottom) --- */}
          <footer className="p-4 sm:p-6 bg-white border-t border-gray-100 flex items-center justify-between shrink-0">
             <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Page 1 of 4</div>
             <div className="flex items-center gap-1">
                <button className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 border border-gray-100"><ChevronLeft className="w-4 h-4" /></button>
                <button className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-[#004797] text-white font-bold text-xs">1</button>
                <button className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-700 font-bold text-xs">2</button>
                <button className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 border border-gray-100"><ChevronRight className="w-4 h-4" /></button>
             </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default BrowseCatalog;