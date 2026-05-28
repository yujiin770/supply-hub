import React, { useState } from 'react';
import {
    ArrowLeft,
    Building2,
    User,
    LogOut,
    ChevronDown,
    Info,
    CheckCircle2,
    Globe,
    Mail,
    Phone,
    MapPin,
    ChevronRight // Added this for breadcrumbs
} from 'lucide-react';

interface AddSupplierProps {
    onBack: () => void;
}

const AddSupplier: React.FC<AddSupplierProps> = ({ onBack }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            onBack();
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* --- Responsive Navbar --- */}
            <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 h-16 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-50">
                <div className="flex items-center gap-4 sm:gap-10">
                    <img src="/logo.png" alt="SupplyHub" className="h-6 sm:h-7 w-auto object-contain" />
                    <div className="hidden md:flex items-center gap-1">
                        <button onClick={onBack} className="px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-50 font-semibold text-sm transition-all">Suppliers</button>
                        <button className="px-4 py-2 rounded-lg text-gray-400 font-semibold text-sm">API Clients</button>
                    </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-6">
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden xs:block">
                            <div className="text-sm font-bold text-gray-900 leading-none">Mico Echaure</div>
                            <div className="text-[10px] font-bold text-blue-500 uppercase mt-1 tracking-wider">Super Admin</div>
                        </div>
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-[#004797] to-[#21BBD7] flex items-center justify-center text-white font-bold text-xs shadow-md">
                            ME
                        </div>
                    </div>
                    <button className="p-2 text-gray-400 hover:text-rose-500 transition-colors">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto pt-6 sm:pt-10 px-4 sm:px-6 pb-24">

                {/* --- New Breadcrumb Indicator --- */}
                <nav className="flex items-center gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-6">
                    <button
                        onClick={onBack}
                        className="hover:text-[#004797] transition-colors cursor-pointer"
                    >
                        Suppliers
                    </button>
                    <ChevronRight className="w-3 h-3 text-gray-300" />
                    <span className="text-gray-900">Add Supplier</span>
                </nav>

                {/* --- Back Navigation --- */}
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-500 hover:text-[#004797] cursor-pointer font-bold text-sm mb-6 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to list
                </button>

                {/* --- Header --- */}
                <div className="mb-8 sm:mb-10 text-center sm:text-left">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Add Supplier</h1>
                    <p className="text-sm sm:text-base text-gray-500 font-medium mt-2">
                        Register a new partner and generate their admin credentials.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">

                    {/* --- Section 1: Business Information --- */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 sm:px-8 sm:py-6 border-b border-gray-50 bg-gray-50/30 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <h2 className="text-base sm:text-lg font-bold text-gray-800">Business Details</h2>
                        </div>

                        <div className="p-6 sm:p-8 space-y-5 sm:space-y-6">
                            {/* Names */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                        Legal Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input required type="text" placeholder="Official Registered Name" className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Trade Name </label>
                                    <input type="text" placeholder="Optional" className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" />
                                </div>
                            </div>

                            {/* Contacts */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2 group">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                        Business Email <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input required type="email" placeholder="billing@company.com" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Mobile Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input type="text" placeholder="+63 900 000 0000" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Address */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                    Address <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input required type="text" placeholder="Street name, Building, Unit Number" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" />
                                </div>
                            </div>

                            {/* Locale Grid */}
                            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-2"><label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">City <span className="text-rose-500">*</span></label><input required type="text" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20" /></div>
                                <div className="space-y-2"><label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Province <span className="text-rose-500">*</span></label><input required type="text" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20" /></div>
                                <div className="space-y-2"><label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Zip Code <span className="text-rose-500">*</span></label><input required type="text" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20" /></div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Country <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        <select className="w-full appearance-none pl-10 pr-10 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-700 cursor-pointer focus:ring-2 focus:ring-emerald-500/20">
                                            <option>Philippines</option>
                                            <option>Singapore</option>
                                            <option>United States</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- Section 2: Owner Account --- */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 sm:px-8 sm:py-6 border-b border-gray-50 bg-gray-50/30 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <User className="w-5 h-5" />
                            </div>
                            <h2 className="text-base sm:text-lg font-bold text-gray-800">Admin Account</h2>
                        </div>

                        <div className="p-6 sm:p-8 space-y-6">
                            <div className="flex items-start gap-3 p-4 bg-blue-50/40 rounded-xl border border-blue-100/50">
                                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-[12px] text-blue-700 leading-relaxed font-medium">
                                    This user will be the primary administrator. They will receive an automated email to set up their multi-factor authentication.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">Full Admin Name <span className="text-rose-500">*</span></label>
                                    <input required type="text" placeholder="First and Last Name" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">Login Email <span className="text-rose-500">*</span></label>
                                    <input required type="email" placeholder="admin@supplier-portal.com" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">Initial Password <span className="text-rose-500">*</span></label>
                                    <input required type="password" placeholder="••••••••" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">Verify Password <span className="text-rose-500">*</span></label>
                                    <input required type="password" placeholder="••••••••" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- Form Actions --- */}
                    <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onBack}
                            className="group w-full sm:w-auto px-10 py-3.5 rounded-xl text-sm font-bold cursor-pointer bg-rose-600 text-white hover:text-white hover:bg-rose-700 hover:border-rose-200 border border-gray-200 transition-all flex items-center justify-center gap-3"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full sm:w-auto bg-[#004797] hover:bg-[#003570] disabled:bg-gray-200 cursor-pointer text-white px-12 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-[#004797]/20 active:scale-[0.98]"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <CheckCircle2 className="w-5 h-5" />
                            )}
                            {isSubmitting ? 'Onboarding...' : 'Create Supplier'}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default AddSupplier;