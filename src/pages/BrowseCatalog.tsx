import React, { useState } from 'react';
import { 
  Search, ChevronDown, ChevronUp, Plus, X, 
  ChevronRight, ChevronLeft, Filter as FilterIcon,
  Check
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
  packId: string;
  added?: boolean;
  activeIngredients: { name: string; strength: string }[];
  indication: string;
}

const BROWSE_DATA: BrowseItem[] = [
  { 
    id: '1', 
    brandName: 'AA-Cetirizine-478', 
    strength: 'Cetirizine 10 mg', 
    form: 'Syrup', 
    packSize: '60.0000 mL', 
    manufacturer: 'AstraZeneca plc', 
    barcode: '4805441005531', 
    sku: 'UNILAB-CETIRIZINE-478', 
    route: 'Oral', 
    status: 'Active', 
    packId: '79a8bee4-fb88-4829-94df-a24d6f093b3b',
    added: true,
    activeIngredients: [{ name: 'Cetirizine', strength: '10 mg' }],
    indication: 'Cetirizine indicated for allergic rhinitis and urticaria'
  },
  { 
    id: '2', 
    brandName: 'Absolute Distilled Water', 
    strength: 'Purified Water 1000 mL', 
    form: 'Not Applicable', 
    packSize: '12.0000 L', 
    manufacturer: 'Bayer Philippines', 
    barcode: '480000000003', 
    sku: 'BAY-WATER-001', route: 'Not Applicable', status: 'Active', packId: 'abs-water-1',
    activeIngredients: [{ name: 'Purified Water', strength: '1000 mL' }],
    indication: 'Safe drinking water.'
  },
  { 
    id: '3', 
    brandName: 'Absolute Distilled Water ggg', 
    strength: 'Clopidogrel Bisulfate 123 amp', 
    form: 'Inhaler (MDI)', 
    packSize: '12.0000 mmol', 
    manufacturer: 'Novartis AG', 
    barcode: '4800675013567', 
    sku: 'NOV-CLOP-001', route: 'Inhalation', status: 'Active', packId: 'clop-001',
    activeIngredients: [{ name: 'Clopidogrel Bisulfate', strength: '123 amp' }],
    indication: 'Respiratory management.'
  },
  { 
    id: '4', 
    brandName: 'Alaxan FR', 
    strength: 'ibuprofen 200 mg + paracetamol 325 mg', 
    form: 'Tablet', 
    packSize: '100.0000 tab', 
    manufacturer: 'Unilab Inc.', 
    barcode: '4800016012345', 
    sku: 'UNI-ALX-100', route: 'Oral', status: 'Active', packId: '99b4b18f-764f-4434-a07c-83e5c93e870d',
    activeIngredients: [{ name: 'Ibuprofen', strength: '200 mg' }, { name: 'Paracetamol', strength: '325 mg' }],
    indication: 'Pain reliever with anti-inflammatory'
  },
  { 
    id: '5', 
    brandName: 'Alaxan FR', 
    strength: 'ibuprofen 200 mg + paracetamol 325 mg', 
    form: 'Tablet', 
    packSize: '1.0000 tab', 
    manufacturer: 'Unilab Inc.', 
    barcode: '4808930500593', 
    sku: 'PLK-PQFVC3EH', 
    route: 'Oral', 
    status: 'Active', 
    packId: '99b4b18f-764f-4434-a07c-83e5c93e870d',
    activeIngredients: [{ name: 'Ibuprofen', strength: '200 mg' }, { name: 'Paracetamol', strength: '325 mg' }],
    indication: 'Pain reliever with anti-inflammatory'
  },
  { 
    id: '6', 
    brandName: 'Albatross Refill Sweet Marmalade', 
    strength: 'Sweet Marmalade 50 g', 
    form: 'Not Applicable', 
    packSize: '1.0000 pack', 
    manufacturer: 'Unknown', 
    barcode: '480000000006', 
    sku: 'ALB-MAR-01', route: 'Not Applicable', status: 'Active', packId: 'alb-marm-1',
    activeIngredients: [{ name: 'Sweet Marmalade', strength: '50 g' }],
    indication: 'Fragrance refill.'
  },
  { 
    id: '7', 
    brandName: 'Altbatross Kiwi Candy Holder', 
    strength: 'Sugar 100 g', 
    form: 'Not Applicable', 
    packSize: '999.0000 g', 
    manufacturer: 'Unknown', 
    barcode: '480000000005', 
    sku: 'ALT-KIWI-01', route: 'Not Applicable', status: 'Active', packId: 'alt-kiwi-1',
    activeIngredients: [{ name: 'Sugar', strength: '100 g' }],
    indication: 'Confectionery.'
  },
  { 
    id: '8', 
    brandName: 'Aluminum Hydroxide + Magnesium Hydroxide', 
    strength: 'Aluminum Hydroxide 200 mg + Magnesium Hydroxide 100 mg', 
    form: 'Tablet', 
    packSize: '10.0000 tab', 
    manufacturer: 'Generic Manufacturer', 
    barcode: '480000000002', 
    sku: 'GEN-ANT-01', route: 'Oral', status: 'Active', packId: 'gen-ant-1',
    activeIngredients: [{ name: 'Aluminum Hydroxide', strength: '200 mg' }, { name: 'Magnesium Hydroxide', strength: '100 mg' }],
    indication: 'Antacid relief.'
  },
  { 
    id: '9', 
    brandName: 'Amboxol-144', 
    strength: 'Ceftriaxone 500 mmol', 
    form: 'Capsule', 
    packSize: '1.0000 mmol', 
    manufacturer: 'Interphil Laboratories Inc.', 
    barcode: '4807248640359', 
    sku: 'INT-AMB-500', route: 'Oral', status: 'Active', packId: 'amb-500-1',
    activeIngredients: [{ name: 'Ceftriaxone', strength: '500 mmol' }],
    indication: 'Antibiotic therapy.'
  },
  { 
    id: '10', 
    brandName: 'Amboxol-144', 
    strength: 'Bisoprolol 100 mol', 
    form: 'Chewable Tablet', 
    packSize: '10.0000 bottle', 
    manufacturer: 'Bayer Philippines', 
    barcode: '4804256886625', 
    sku: 'BAY-BIS-100', route: 'Oral', status: 'Active', packId: 'bis-100-1',
    activeIngredients: [{ name: 'Bisoprolol', strength: '100 mol' }],
    indication: 'Cardiovascular management.'
  },
  { 
    id: '11', 
    brandName: 'Amboxol-144', 
    strength: 'Ambroxol 30 mg', 
    form: 'Capsule', 
    packSize: '10.0000 cap', 
    manufacturer: 'Bayer Philippines', 
    barcode: '4803752625080', 
    sku: 'BAY-AMB-30', route: 'Oral', status: 'Active', packId: 'amb-30-1',
    activeIngredients: [{ name: 'Ambroxol', strength: '30 mg' }],
    indication: 'Mucolytic agent.'
  }
];

const BrowseCatalog: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [expandedId, setExpandedId] = useState<string | null>('5');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [addingItem, setAddingItem] = useState<BrowseItem | null>(null);

  const toggleRow = (id: string) => setExpandedId(expandedId === id ? null : id);

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col overflow-hidden font-sans">
      
      {/* --- HEADER --- */}
      <header className="h-16 border-b border-gray-100 flex items-center px-4 md:px-6 gap-4 shrink-0 bg-white sticky top-0 z-[100]">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg border border-gray-100"
        >
          <FilterIcon className="w-5 h-5" />
        </button>

        <div className="flex-1 max-w-2xl relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search brand name, INN, barcode, SKU" 
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-blue-100 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-6 h-6 text-gray-400" />
            </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        
        {/* --- SIDEBAR FILTERS (Slide-in on mobile) --- */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/40 z-[80] lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
        )}
        
        <aside className={`
          fixed inset-y-0 left-0 z-[90] w-72 bg-white border-r border-gray-100 transition-transform duration-300 lg:relative lg:translate-x-0 lg:z-0 lg:w-64 flex flex-col
          ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        `}>
          <div className="p-5 flex items-center justify-between lg:hidden border-b border-gray-100 bg-gray-50">
             <span className="font-bold text-gray-900 uppercase text-xs tracking-widest">Filters</span>
             <button onClick={() => setIsSidebarOpen(false)}><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-xs font-bold text-gray-600">Not in my catalog</span>
            </label>

            {[
                { title: 'DOSAGE FORM', items: ['Capsule', 'Chewable Tablet', 'Inhaler (MDI)', 'Lotion', 'Not Applicable', 'Suspension', 'Syrup', 'Tablet'] },
                { title: 'ROUTE', items: ['Inhalation', 'Intrathecal', 'Not Applicable', 'Oral', 'Sublingual', 'Topical', 'Transdermal'] },
                { title: 'MANUFACTURER', items: ['AstraZeneca plc', 'Bayer Philippines', 'Novartis AG', 'Unilab Inc.', 'GSK Philippines'] }
            ].map((group) => (
              <div key={group.title}>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">{group.title}</h4>
                <div className="space-y-3">
                  {group.items.map(item => (
                    <label key={item} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600" />
                      <span className="text-xs font-bold text-gray-500 group-hover:text-gray-900 truncate">{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* --- MAIN CONTENT AREA --- */}
        <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
          
          <div className="px-4 md:px-6 py-5 border-b border-gray-50 flex items-center justify-between shrink-0 bg-white">
             <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.1em]">
                50 <span className="text-gray-400">/ 165 ON PAGE</span>
             </p>
             {/* Corrected fixed button size */}
             <button className="bg-[#00925d] hover:bg-[#007a4e] text-white px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add all visible (49)
             </button>
          </div>

          {/* TABLE: Horizontally scrollable on mobile without stickiness */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-bold text-black uppercase tracking-widest">
                  <th className="px-6 py-4">BRAND NAME</th>
                  <th className="px-6 py-4">STRENGTH / INN</th>
                  <th className="px-6 py-4">FORM</th>
                  <th className="px-6 py-4">PACK SIZE</th>
                  <th className="px-6 py-4">MANUFACTURER</th>
                  <th className="px-6 py-4">BARCODE</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {BROWSE_DATA.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr 
                      onClick={() => toggleRow(item.id)}
                      className={`cursor-pointer transition-colors ${expandedId === item.id ? 'bg-[#f0f9ff]' : 'hover:bg-gray-50/50'}`}
                    >
                      <td className="px-6 py-5 text-sm font-bold text-gray-900">{item.brandName}</td>
                      <td className="px-6 py-5 text-xs font-bold text-gray-400">{item.strength}</td>
                      <td className="px-6 py-5 text-xs font-bold text-gray-400 uppercase">{item.form}</td>
                      <td className="px-6 py-5 text-xs font-bold text-gray-400">{item.packSize}</td>
                      <td className="px-6 py-5 text-xs font-bold text-gray-400">{item.manufacturer}</td>
                      <td className="px-6 py-5 text-xs font-bold font-mono text-gray-300">{item.barcode}</td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-5">
                          {expandedId === item.id ? <ChevronUp className="w-4 h-4 text-[#00925d]" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                          {item.added ? (
                            <div className="bg-emerald-50 text-[#00925d] px-3 py-1.5 rounded-lg text-[11px] font-bold border border-emerald-100 flex items-center gap-1.5">
                               <Check className="w-3.5 h-3.5" /> Added
                            </div>
                          ) : (
                            <button 
                                onClick={(e) => { e.stopPropagation(); setAddingItem(item); }}
                                className="bg-[#00925d] text-white px-5 py-1.5 cursor-pointer rounded-lg text-xs font-bold active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
                            >
                                <Plus className="w-4 h-4 " /> Add
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* --- EXPANDED DETAILS (EXACT DATA) --- */}
                    {expandedId === item.id && (
                      <tr className="bg-[#fcfdfe]">
                        <td colSpan={7} className="px-10 py-10">
                          <div className="grid grid-cols-4 gap-12">
                            <div className="space-y-6">
                              <div><label className="text-[10px] font-bold text-black uppercase tracking-widest block mb-2">Pack ID</label><p className="text-xs text-gray-600 font-bold break-all">{item.packId}</p></div>
                              <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Dosage Form</label><p className="text-xs text-gray-900 font-bold">{item.form}</p></div>
                            </div>
                            <div className="space-y-6">
                              <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">SKU</label><p className="text-xs text-gray-600 font-bold">{item.sku}</p></div>
                              <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Route</label><p className="text-xs text-gray-900 font-bold">{item.route}</p></div>
                            </div>
                            <div className="space-y-6">
                              <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Barcode</label><p className="text-xs text-gray-600 font-bold">{item.barcode}</p></div>
                              <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Manufacturer</label><p className="text-xs text-gray-900 font-bold">{item.manufacturer}</p></div>
                            </div>
                            <div className="space-y-6">
                              <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Pack Size</label><p className="text-xs text-gray-900 font-bold">{item.packSize}</p></div>
                              <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Status</label><div className="text-[11px] font-bold text-gray-900">{item.status}</div></div>
                            </div>
                          </div>
                          
                          <div className="mt-10">
                             <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-4">ACTIVE INGREDIENTS</h4>
                             <div className="flex flex-wrap gap-2">
                                {item.activeIngredients.map((ai, idx) => (
                                    <div key={idx} className="bg-white px-4 py-2 rounded-full text-xs font-bold border border-gray-200 text-gray-900 flex items-center gap-2">
                                        {ai.name} <span className="text-blue-400">{ai.strength}</span>
                                    </div>
                                ))}
                             </div>
                             <p className="mt-4 text-xs italic text-gray-400 font-bold">{item.indication}</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* --- FOOTER / PAGINATION --- */}
          <footer className="p-4 md:px-6 md:py-5 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-white shrink-0">
             <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                SHOWING <span className="text-gray-900">1 - 50</span> OF 165 ITEMS
             </div>
             <div className="flex items-center gap-1.5">
                <button className="flex items-center gap-1 px-3 py-2 text-gray-400 text-[10px] font-bold"><ChevronLeft className="w-4 h-4" /> PREV</button>
                <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#00925d] text-white font-bold text-xs">1</button>
                <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-50">2</button>
                <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-50">3</button>
                <button className="flex items-center gap-1 px-3 py-2 text-gray-900 text-[10px] font-bold">NEXT <ChevronRight className="w-4 h-4" /></button>
             </div>
          </footer>
        </main>
      </div>

      {/* --- FLOATING HALF-SIZE MODAL (Add to Catalog) --- */}
      {addingItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAddingItem(null)} />
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <header className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-[11px] font-bold text-[#00925d] uppercase tracking-widest mb-1">ADD TO MY CATALOG</h3>
                <h2 className="text-xl font-bold text-gray-900">{addingItem.brandName}</h2>
                <p className="text-xs font-bold text-gray-400 mt-0.5">{addingItem.strength} · {addingItem.form}</p>
              </div>
              <button onClick={() => setAddingItem(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </header>

            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
               <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500">Base Price (PHP)</label>
                  <input type="text" placeholder="e.g. 125.00" className="w-full px-4 py-3 bg-[#f8fafc] border border-gray-200 rounded-xl text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all" />
               </div>
               <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500">MOQ (units)</label>
                  <input type="text" placeholder="e.g. 10" className="w-full px-4 py-3 bg-[#f8fafc] border border-gray-200 rounded-xl text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all" />
               </div>
               <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500">Lead Time (days)</label>
                  <input type="text" placeholder="e.g. 3" className="w-full px-4 py-3 bg-[#f8fafc] border border-gray-200 rounded-xl text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all" />
               </div>
               <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500">Stock Qty</label>
                  <input type="text" placeholder="blank = unlimited" className="w-full px-4 py-3 bg-[#f8fafc] border border-gray-200 rounded-xl text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all" />
               </div>
               <p className="text-[11px] font-bold text-blue-400/80 leading-relaxed text-center">
                  All fields are optional and can be updated later from My Catalog.
               </p>
            </div>

            <footer className="p-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-end gap-3">
                <button onClick={() => setAddingItem(null)} className="px-6 py-3 text-sm rounded-xl cursor-pointer bg-red-500 text-white font-bold hover:bg-red-700 transition-colors">Cancel</button>
                <button onClick={() => setAddingItem(null)} className="px-8 py-3 bg-[#00925d] text-white font-bold rounded-xl hover:bg-[#007a4e] cursor-pointer shadow-lg shadow-emerald-600/10 transition-all text-sm">Add to Catalog</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrowseCatalog;