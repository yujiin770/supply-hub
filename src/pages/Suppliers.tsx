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
    { code: 'SUP-000006', legalName: 'John Canas', tradeName: '', status: 'Approved', created: 'Apr 24, 2026' },
    { code: 'SUP-000005', legalName: 'VIP88 IT Medical Supplies', tradeName: 'VIP88 IT Medical Supplies', status: 'Approved', created: 'Mar 3, 2026' },
    { code: 'SUP-000004', legalName: 'Test Pharma', tradeName: 'Test Pharma', status: 'Pending KYC', created: 'Feb 26, 2026' },
    { code: 'SUP-000003', legalName: 'Juan Medical Supplies', tradeName: 'Juan Medical Supplies', status: 'Approved', created: 'Feb 26, 2026' },
    { code: 'SUP-000001', legalName: 'Test Pharma Corp', tradeName: '—', status: 'Suspended', created: 'Feb 26, 2026' },
];

// --- Sub-Components ---

const TableSkeleton = () => (
    <div className="animate-pulse space-y-4 p-4">
        {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl w-full"></div>
        ))}
    </div>
);

const StatusBadge = ({ status }: { status: Supplier['status'] }) => {
    const styles = {
        'Approved': 'bg-emerald-50 text-emerald-700 border-emerald-100',
        'Pending KYC': 'bg-amber-50 text-amber-700 border-amber-100',
        'Suspended': 'bg-rose-50 text-rose-700 border-rose-100',
    };

    return (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border tracking-wider uppercase inline-block ${styles[status]}`}>
            {status}
        </span>
    );
};

const Suppliers: React.FC<SuppliersProps> = ({ onGoToDashboard, onAddSupplier }) => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1200);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* --- Responsive Navbar --- */}
            <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 h-16 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-50">
                <div className="flex items-center gap-4 sm:gap-10">
                    <img src="/logo.png" alt="SupplyHub" className="h-6 sm:h-7 w-auto object-contain" />
                    <div className="hidden lg:flex items-center gap-1">
                        <button className="px-4 py-2 rounded-lg bg-[#004797]/5 text-[#004797] font-bold text-sm">Suppliers</button>
                        <button className="px-4 py-2 rounded-lg text-gray-400 hover:bg-gray-50 font-semibold text-sm transition-all">API Clients</button>
                    </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-6">
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold text-gray-900 leading-none">Mico Echaure</div>
                            <div className="text-[10px] font-bold text-blue-500 uppercase mt-1 tracking-wider">Super Admin</div>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-linear-to-tr from-[#004797] to-[#21BBD7] flex items-center justify-center text-white font-bold text-xs shadow-md">
                            ME
                        </div>
                    </div>
                    <button className="p-2 text-gray-400 hover:text-rose-500 transition-colors cursor-pointer">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </nav>

            <main className="max-w-350 mx-auto pt-6 sm:pt-10 px-4 sm:px-6 pb-20">

                {/* --- Hero Section --- */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100">
                            <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Suppliers</h1>
                            <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
                                <span className="text-emerald-600 font-bold">{SUPPLIERS_DATA.length} partners</span> registered
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onAddSupplier}
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 cursor-pointer text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/10 active:scale-[0.98]"
                    >
                        <Plus className="w-5 h-5" />
                        Add Supplier
                    </button>
                </div>

                {/* --- Search & Filters --- */}
                <div className="flex flex-col lg:flex-row gap-3 mb-6">
                    <div className="flex-1 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm flex items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search name, code..."
                                className="w-full pl-10 pr-4 py-2.5 bg-transparent border-none text-sm font-medium focus:ring-0 placeholder:text-gray-400 outline-none"
                            />
                        </div>
                        <button className="hidden sm:block bg-gray-900 cursor-pointer text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-black transition-all">
                            Search
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <div className="flex-1 lg:w-48 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm relative flex items-center">
                            <Filter className="absolute left-4 w-4 h-4 text-gray-400 pointer-events-none" />
                            <select className="w-full appearance-none pl-10 pr-10 py-2.5 bg-transparent border-none text-sm font-bold text-gray-700 cursor-pointer focus:ring-0 outline-none">
                                <option>All Status</option>
                                <option>Approved</option>
                                <option>Pending</option>
                            </select>
                            <ChevronDown className="absolute right-4 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                        <button className="sm:hidden bg-gray-900 text-white px-5 py-2.5 rounded-2xl font-bold text-sm">
                            Search
                        </button>
                    </div>
                </div>

                {/* --- Content Area --- */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    {loading ? (
                        <TableSkeleton />
                    ) : (
                        <>
                            {/* Desktop View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-50">
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID Code</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Legal Name</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Trade Name</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Created</th>
                                            <th className="px-6 py-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {SUPPLIERS_DATA.map((item) => (
                                            <tr key={item.code} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-6">
                                                    <span className="px-2 py-1 bg-gray-100 rounded text-[11px] font-mono font-bold text-gray-500">
                                                        {item.code}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="text-sm font-bold text-gray-900 group-hover:text-[#004797] transition-colors">{item.legalName}</div>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="text-sm font-medium text-gray-500 italic">
                                                        {item.tradeName || '—'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 text-center">
                                                    <StatusBadge status={item.status} />
                                                </td>
                                                <td className="px-6 py-6 text-sm font-semibold text-gray-500">{item.created}</td>
                                                <td className="px-6 py-6 text-right">
                                                    <button
                                                        onClick={onGoToDashboard}
                                                        className="inline-flex items-center gap-2 px-4 py-2 cursor-pointer bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl hover:bg-emerald-600 hover:text-white transition-all active:scale-95 shadow-sm"
                                                    >
                                                        Go to Supplier
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden divide-y divide-gray-50">
                                {SUPPLIERS_DATA.map((item) => (
                                    <div key={item.code} className="p-5 space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="text-xs font-mono font-bold text-gray-400 mb-1">{item.code}</div>
                                                <div className="text-base font-bold text-gray-900">{item.legalName}</div>
                                                <div className="text-xs text-gray-400 font-medium italic mt-1">{item.tradeName || 'No trade name'}</div>
                                            </div>
                                            <StatusBadge status={item.status} />
                                        </div>
                                        <div className="flex items-center justify-between pt-2">
                                            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                                Joined {item.created}
                                            </div>
                                            <button
                                                onClick={onGoToDashboard}
                                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-b-lg cursor-pointer"
                                            >
                                                Go to Supplier <ArrowRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Pagination */}
                    {!loading && (
                        <div className="px-6 py-5 bg-gray-50/30 border-t border-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                Showing {SUPPLIERS_DATA.length} total results
                            </p>
                            <div className="flex items-center gap-2">
                                <button disabled className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-400 text-xs font-bold">Prev</button>
                                <button disabled className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-400 text-xs font-bold">Next</button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Suppliers;