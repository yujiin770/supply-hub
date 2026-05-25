import React, { useState, useEffect } from 'react';
import { 
  Search, RotateCw, Plus, Edit3, X, CheckCircle2, PackageSearch, ArrowRight 
} from 'lucide-react';

interface Product {
  name: string;
  manufacturer: string;
  strength: string;
  form: string;
  price: number;
  moq: number;
  leadTime: string;
  stock: string | number;
  status: 'Active' | 'Inactive';
}

const CATALOG_DATA: Product[] = [
  {
    name: 'AA-Cetirizine-478',
    manufacturer: 'AstraZeneca plc',
    strength: 'Cetirizine 10 mg',
    form: 'Syrup / Oral',
    price: 500.00,
    moq: 10,
    leadTime: '3d',
    stock: '∞',
    status: 'Active'
  }
];

const MyCatalog: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filter, setFilter] = useState<'Active' | 'Inactive' | 'All'>('Active');

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, [filter]);

  const filteredProducts = CATALOG_DATA.filter(p => {
    if (filter === 'All') return true;
    return p.status === filter;
  });

  return (
    <div className="pb-20 max-w-[1550px] mx-auto px-4 sm:px-0">
      {/* --- Header --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Catalog</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            <span className="text-[#004797] font-bold">{filteredProducts.length} product</span> listed for sale
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all shadow-sm cursor-pointer">
            <RotateCw className="w-4 h-4" />
            <span className="hidden sm:inline">Sync catalog</span>
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 cursor-pointer">
            <Plus className="w-4 h-4" />
            Browse catalog
          </button>
        </div>
      </div>

      {/* --- Filters & Search --- */}
      <div className="flex flex-col lg:flex-row items-center gap-4 mb-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search..." className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/5 outline-none" />
        </div>
        <div className="flex items-center bg-white p-1 rounded-xl border border-gray-100 shadow-sm w-full lg:w-auto">
           {(['Active', 'Inactive', 'All'] as const).map((opt) => (
             <button key={opt} onClick={() => setFilter(opt)} className={`flex-1 lg:flex-none px-6 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${filter === opt ? 'bg-[#004797] text-white' : 'text-gray-400'}`}>{opt}</button>
           ))}
        </div>
      </div>

      {/* --- Table --- */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
           <div className="p-20 flex justify-center"><div className="w-8 h-8 border-4 border-t-blue-600 rounded-full animate-spin"></div></div>
        ) : filteredProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-50">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Product</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Strength / Form</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Base Price</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Stock</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProducts.map((p, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="text-sm font-bold text-gray-900">{p.name}</div>
                      <div className="text-[11px] text-gray-400 font-bold uppercase">{p.manufacturer}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-bold text-gray-700">{p.strength}</div>
                      <div className="text-[11px] text-gray-400 font-medium">{p.form}</div>
                    </td>
                    <td className="px-6 py-5 font-bold text-gray-900 text-sm">₱ {p.price.toFixed(2)}</td>
                    <td className="px-6 py-5 text-center text-xl font-medium text-gray-400">{p.stock}</td>
                    <td className="px-6 py-5 text-center">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 w-fit mx-auto">
                        <div className="w-1 h-1 rounded-full bg-emerald-500"></div>{p.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button onClick={() => { setSelectedProduct(p); setIsModalOpen(true); }} className="p-2.5 bg-gray-50 text-gray-400 hover:text-[#004797] hover:bg-blue-50 rounded-xl transition-all border border-gray-100 cursor-pointer"><Edit3 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-16 text-center">
             <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-6"><PackageSearch className="w-10 h-10 text-gray-300" /></div>
             <h3 className="text-xl font-bold text-gray-900">No listings yet</h3>
             <p className="text-sm text-gray-500 font-medium mt-2 max-w-xs">Browse the catalog to add your first product. Your items will appear here.</p>
             <button className="mt-8 flex items-center gap-2 px-6 py-3 bg-[#004797] text-white rounded-xl font-bold text-sm cursor-pointer hover:bg-black transition-all">Browse Catalog <ArrowRight className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      {/* --- FULL DETAILS MODAL --- */}
      {isModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white w-full max-w-2xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
            
            {/* Header */}
            <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-extrabold text-gray-900">{selectedProduct.name}</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{selectedProduct.manufacturer}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            {/* Scrollable Body - FULL DETAILS */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-10 custom-scrollbar">
              
              {/* Row 1 & 2: Technical Specifications */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-8 gap-x-4 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dosage Form</label>
                  <p className="text-sm font-bold text-gray-800">Syrup</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Route</label>
                  <p className="text-sm font-bold text-gray-800">Oral</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pack Size</label>
                  <p className="text-sm font-bold text-gray-800">60 mL</p>
                </div>
                <div className="space-y-1 col-span-2 md:col-span-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Barcode</label>
                  <p className="text-[12px] font-mono font-medium text-gray-500">4805441005531</p>
                </div>
                <div className="space-y-1 col-span-2 md:col-span-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">SKU</label>
                  <p className="text-[12px] font-mono font-medium text-gray-500">UNILAB-CETIRIZINE-478</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</label>
                  <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>Active</div>
                </div>
              </div>

              {/* Section: Active Ingredients Table */}
              <div>
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <div className="w-1 h-3 bg-blue-500 rounded-full"></div>Active Ingredients
                </h3>
                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-2 bg-gray-50 px-4 py-2 border-b border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Inn Name</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Strength</span>
                  </div>
                  <div className="grid grid-cols-2 px-4 py-3">
                    <span className="text-sm font-bold text-gray-800">Cetirizine</span>
                    <span className="text-sm font-bold text-gray-800">10 mg</span>
                  </div>
                </div>
              </div>

              {/* Section: Listing Terms */}
              <div className="space-y-6">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <div className="w-1 h-3 bg-emerald-500 rounded-full"></div>Listing Terms
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5"><label className="text-[11px] font-bold text-gray-500">Base Price (PHP)</label><input type="text" defaultValue="500.0000" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all" /></div>
                  <div className="space-y-1.5"><label className="text-[11px] font-bold text-gray-500">MOQ (units)</label><input type="text" defaultValue="10.0000" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all" /></div>
                  <div className="space-y-1.5"><label className="text-[11px] font-bold text-gray-500">Lead Time (days)</label><input type="text" defaultValue="3" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all" /></div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 flex items-center justify-between">Stock Quantity <span className="text-[10px] text-gray-400 font-medium lowercase italic">(leave blank = unlimited)</span></label>
                  <input type="text" placeholder="e.g. 500" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-5 sm:px-8 sm:py-6 bg-gray-50/50 border-t border-gray-50 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-6 py-3 text-sm font-bold text-gray-400 hover:text-gray-600 cursor-pointer">Cancel</button>
              <button onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer"><CheckCircle2 className="w-4 h-4" />Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCatalog;