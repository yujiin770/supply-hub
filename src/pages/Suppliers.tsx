import React, { useState, useEffect } from 'react';
import {
    Building2,
    Plus,
    Search,
    ArrowRight,
    LogOut,
    ChevronDown,
    Filter,
} from 'lucide-react';

interface SuppliersProps {
    onGoToDashboard: () => void;
    onAddSupplier: () => void;
}

interface Supplier {
    code: string;
    legalName: string;
    tradeName: string;
    status: 'Approved' | 'Pending KYC' | 'Suspended';
    created: string;
}

const SUPPLIERS_DATA: Supplier[] = [
    { code: 'SUP-000006', legalName: 'John Canas', tradeName: '', status: 'Approved', created: 'APR 24, 2026' },
    { code: 'SUP-000005', legalName: 'VIP88 IT Medical Supplies', tradeName: 'VIP88 IT Medical Supplies', status: 'Approved', created: 'MAR 3, 2026' },
    { code: 'SUP-000004', legalName: 'Test Pharma', tradeName: 'Test Pharma', status: 'Pending KYC', created: 'FEB 26, 2026' },
    { code: 'SUP-000003', legalName: 'Juan Medical Supplies', tradeName: 'Juan Medical Supplies', status: 'Approved', created: 'FEB 26, 2026' },
    { code: 'SUP-000001', legalName: 'Test Pharma Corp', tradeName: '—', status: 'Suspended', created: 'FEB 26, 2026' },
];

const StatusBadge = ({ status }: { status: Supplier['status'] }) => {
    const styles = {
        'Approved': 'bg-[#eaf7f2] text-[#00925d] border-[#c4e9db]',
        'Pending KYC': 'bg-[#fffbeb] text-[#d97706] border-[#fef3c7]',
        'Suspended': 'bg-rose-50 text-rose-700 border-rose-100',
    };

    return (
        <span className={`px-3 py-1 rounded-lg text-[10px] font-bold border tracking-wider uppercase inline-block ${styles[status]}`}>
            {status}
        </span>
    );
};

const Suppliers: React.FC<SuppliersProps> = ({ onGoToDashboard, onAddSupplier }) => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* --- TOP NAVBAR --- */}
            <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 h-16 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-50">
                <div className="flex items-center gap-4 sm:gap-10">
                    <img src="/logo.png" alt="SupplyHub" className="h-6 sm:h-7 w-auto object-contain" />
                    {/* RESTORED: Suppliers and API Clients buttons */}
                    <div className="hidden lg:flex items-center gap-1">
                        <button className="px-4 py-2 rounded-lg bg-[#004797]/5 text-[#004797] font-bold text-sm cursor-pointer">Suppliers</button>
                        <button className="px-4 py-2 rounded-lg text-gray-400 hover:bg-gray-50 font-bold text-sm transition-all cursor-pointer">API Clients</button>
                    </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-6">
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold text-gray-900 leading-none">Mico Echaure</div>
                            <div className="text-[10px] font-bold text-blue-500 uppercase mt-1 tracking-wider">Super Admin</div>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#004797] to-[#21BBD7] flex items-center justify-center text-white font-bold text-xs shadow-md">ME</div>
                    </div>
                    <button className="p-2 text-gray-300 hover:text-rose-500 transition-colors cursor-pointer">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </nav>

            <main className="max-w-[1400px] mx-auto pt-6 sm:pt-10 px-4 sm:px-8 pb-20">

                {/* --- HERO SECTION --- */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 sm:mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100">
                            <Building2 className="w-7 h-7 text-[#00925d]" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-[#002244] tracking-tight">Suppliers</h1>
                            <p className="text-sm font-bold text-[#00925d] mt-0.5">
                                {SUPPLIERS_DATA.length} Partners <span className="text-gray-400">Total</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onAddSupplier}
                        className="w-full sm:w-auto bg-[#00925d] hover:bg-[#007a4e] text-white px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/10 active:scale-[0.98] cursor-pointer"
                    >
                        <Plus className="w-5 h-5" />
                        Add Supplier
                    </button>
                </div>

                {/* --- SEARCH & FILTERS --- */}
                <div className="flex flex-col lg:flex-row gap-4 mb-6">
                    {/* Integrated Search Box (Button inside on all screens) */}
                    <div className="flex-1 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm flex items-center min-w-0">
                        <div className="relative flex-1 min-w-0">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, email, code..."
                                className="w-full pl-11 pr-4 py-3 bg-transparent border-none text-sm font-bold text-gray-700 placeholder:text-gray-400 outline-none"
                            />
                        </div>
                        <button className="bg-[#111827] text-white px-5 sm:px-8 py-3 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all shrink-0 cursor-pointer">
                            Search
                        </button>
                    </div>

                    {/* Filter Dropdown */}
                    <div className="w-full lg:w-72 bg-white px-4 py-1 rounded-2xl border border-gray-100 shadow-sm relative flex items-center shrink-0 h-[62px]">
                        <Filter className="w-4 h-4 text-gray-400 mr-3" />
                        <select className="flex-1 appearance-none bg-transparent border-none text-sm font-bold text-gray-700 cursor-pointer outline-none">
                            <option>All Status</option>
                            <option>Approved</option>
                            <option>Pending KYC</option>
                            <option>Suspended</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    </div>
                </div>

                {/* --- CONTENT CONTAINER (White rounded box) --- */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-20 space-y-4">
                            <div className="w-10 h-10 border-4 border-gray-100 border-t-[#00925d] rounded-full animate-spin"></div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Syncing Partners...</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop View */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-50">
                                            <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID Code</th>
                                            <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Legal Name</th>
                                            <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Trade Name</th>
                                            <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                                            <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Created</th>
                                            <th className="px-8 py-5"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {SUPPLIERS_DATA.map((item) => (
                                            <tr key={item.code} className="hover:bg-gray-50/30 transition-colors group">
                                                <td className="px-8 py-6 font-mono font-bold text-xs text-gray-400">{item.code}</td>
                                                <td className="px-8 py-6 font-bold text-sm text-[#002244] group-hover:text-[#004797] transition-colors">{item.legalName}</td>
                                                <td className="px-8 py-6 font-bold text-sm text-gray-400 italic">{item.tradeName || '—'}</td>
                                                <td className="px-8 py-6 text-center"><StatusBadge status={item.status} /></td>
                                                <td className="px-8 py-6 font-bold text-xs text-gray-400">{item.created}</td>
                                                <td className="px-8 py-6 text-right">
                                                    <button onClick={onGoToDashboard} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#eaf7f2] text-[#00925d] text-xs font-bold rounded-xl hover:bg-[#00925d] hover:text-white transition-all shadow-sm cursor-pointer">
                                                        Go to Supplier <ArrowRight className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile View */}
                            <div className="lg:hidden divide-y divide-gray-50">
                                {SUPPLIERS_DATA.map((item) => (
                                    <div key={item.code} className="p-6 space-y-5">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 pr-4">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{item.code}</p>
                                                <h3 className="text-lg font-bold text-[#002244] leading-tight">{item.legalName}</h3>
                                                <p className="text-xs text-gray-400 font-bold italic mt-1">{item.tradeName || 'No trade name'}</p>
                                            </div>
                                            <StatusBadge status={item.status} />
                                        </div>
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">JOINED {item.created}</div>
                                            <button onClick={onGoToDashboard} className="flex items-center gap-2 px-5 py-2.5 bg-[#00925d] text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-md cursor-pointer">
                                                Go to Supplier <ArrowRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* RESTORED: Pagination row INSIDE the white container */}
                            <div className="px-8 py-5 bg-gray-50/40 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    Showing <span className="text-gray-900">{SUPPLIERS_DATA.length}</span> total results
                                </p>
                                <div className="flex items-center gap-2">
                                    <button disabled className="px-4 py-2 rounded-xl border border-gray-200 text-gray-400 text-[10px] font-bold">PREV</button>
                                    <button disabled className="px-4 py-2 rounded-xl border border-gray-200 text-gray-400 text-[10px] font-bold">NEXT</button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Suppliers;