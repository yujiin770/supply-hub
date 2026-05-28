import React from "react";
import {
    ArrowLeft,
    Building2,
    LogOut,
    ChevronRight,
    AlertTriangle,
    FileText,
    ShieldCheck,
    Clock,
    X,
    CheckCircle2,
    Check,
} from "lucide-react";

interface SupplierDetailProps {
    supplier: any;
    onBack: () => void;
}

// Reusable component for data fields to match "Add Supplier" format
const DataField = ({ label, value, isRed = false }: { label: string; value: string | React.ReactNode; isRed?: boolean }) => (
    <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">
            {label}
        </label>
        <div className={`text-sm font-semibold ${isRed ? 'text-rose-500' : 'text-gray-700'} flex items-center gap-1.5`}>
            {value || "—"}
        </div>
    </div>
);

const SupplierDetail: React.FC<SupplierDetailProps> = ({ supplier, onBack }) => {
    const isPending = supplier.status === "Pending KYC";
    const isSuspended = supplier.status === "Suspended";

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* --- TOP NAVBAR (Marketplace Format) --- */}
            <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 h-16 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-50">
                <div className="flex items-center gap-4 sm:gap-10">
                    <img src="/logo.png" alt="SupplyHub" className="h-6 sm:h-7 w-auto object-contain" />
                    <div className="hidden md:flex items-center gap-1">
                        <button onClick={onBack} className="px-4 py-2 rounded-lg bg-[#004797]/5 text-[#004797] font-bold text-sm transition-all cursor-pointer">Suppliers</button>
                        <button className="px-4 py-2 rounded-lg text-gray-400 font-semibold text-sm cursor-pointer hover:bg-gray-50">API Clients</button>
                    </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-6">
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden xs:block">
                            <div className="text-sm font-bold text-gray-900 leading-none">Mico Echaure</div>
                            <div className="text-[10px] font-bold text-blue-500 uppercase mt-1 tracking-wider">Super Admin</div>
                        </div>
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-linear-to-tr from-[#004797] to-[#21BBD7] flex items-center justify-center text-white font-bold text-xs shadow-md">
                            ME
                        </div>
                    </div>
                    <button className="p-2 text-gray-400 hover:text-rose-500 transition-colors cursor-pointer">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto pt-6 sm:pt-10 px-4 sm:px-6 pb-24">

                {/* --- Breadcrumbs --- */}
                <nav className="flex items-center gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-6">
                    <button onClick={onBack} className="hover:text-[#004797] transition-colors cursor-pointer">
                        Suppliers
                    </button>
                    <ChevronRight className="w-3 h-3 text-black" />
                    <span className="text-gray-900">Supplier Details</span>
                </nav>

                {/* --- Back Navigation --- */}
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-500 hover:text-[#004797] cursor-pointer font-bold text-sm mb-6 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to list
                </button>

                {/* --- Header Section (Name + Status + Action Buttons) --- */}
                <div className="flex flex-col lg:flex-row items-start justify-between gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">{supplier.legalName}</h1>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border tracking-wider uppercase ${supplier.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                    supplier.status === 'Suspended' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                }`}>
                                {supplier.status}
                            </span>
                        </div>
                        <p className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest">{supplier.code}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        {isPending ? (
                            <>
                                <button className="bg-[#FF9900] hover:bg-[#E68A00] text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20 active:scale-95 cursor-pointer flex-1 sm:flex-none">
                                    Approve Supplier <AlertTriangle className="w-4 h-4" />
                                </button>
                                <button className="bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 px-6 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex-1 sm:flex-none">
                                    Reject
                                </button>
                                <button className="bg-white border border-orange-200 text-orange-500 hover:bg-orange-50 px-6 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex-1 sm:flex-none">
                                    Suspend
                                </button>
                            </>
                        ) : isSuspended ? (
                            <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg cursor-pointer">
                                <CheckCircle2 className="w-4 h-4" /> Reactivate Supplier
                            </button>
                        ) : null}
                    </div>
                </div>

                {/* --- Onboarding Stepper (Visible if Pending) --- */}
                {isPending && (
                    <div className="bg-white rounded-3xl border border-gray-100 p-10 shadow-sm mb-6 max-w-4xl mx-auto">
                        <div className="relative flex justify-between items-center">
                            {/* Progress Line */}
                            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-100 z-0 mx-24">
                                <div className="h-full bg-emerald-500 w-1/2"></div>
                            </div>

                            {/* Steps */}
                            <div className="relative z-10 flex flex-col items-center text-center w-1/3">
                                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md"><Check className="w-5 h-5" /></div>
                                <div className="mt-4"><h4 className="text-[13px] font-bold text-gray-900">Account Created</h4><p className="text-[11px] font-medium text-gray-400">Provisioned</p></div>
                            </div>
                            <div className="relative z-10 flex flex-col items-center text-center w-1/3">
                                <div className="w-10 h-10 rounded-full bg-white border-2 border-emerald-500 text-emerald-500 flex items-center justify-center font-bold">2</div>
                                <div className="mt-4"><h4 className="text-[13px] font-bold text-gray-900">KYC Submitted</h4><p className="text-[11px] font-medium text-gray-400">Documents uploaded</p></div>
                            </div>
                            <div className="relative z-10 flex flex-col items-center text-center w-1/3">
                                <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-100 text-gray-200 flex items-center justify-center font-bold">3</div>
                                <div className="mt-4"><h4 className="text-[13px] font-bold text-gray-200">Approved</h4><p className="text-[11px] font-medium text-gray-400">Review passed</p></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- Alerts --- */}
                <div className="space-y-4 mb-8">
                    {isSuspended && (
                        <div className="bg-[#FFFBEB] border border-orange-100 rounded-2xl p-4 flex items-center gap-4 text-[#92400E]">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                            </div>
                            <p className="text-sm font-bold leading-relaxed">This supplier is suspended. Use "Reactivate" to restore access to the marketplace and catalog.</p>
                        </div>
                    )}
                    <div className="bg-[#FFFBEB] border border-orange-100 rounded-2xl p-4 flex items-center justify-between text-[#92400E]">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <p className="text-sm font-bold uppercase tracking-wide">KYC incomplete</p>
                        </div>
                        <span className="text-[11px] font-bold opacity-60">0/5 required</span>
                    </div>
                </div>

                {/* --- Detailed Data Cards --- */}
                <div className="space-y-8">

                    {/* Business Details Card */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 sm:px-8 sm:py-6 border-b border-gray-50 bg-gray-50/30 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Business Details</h2>
                        </div>
                        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <DataField label="Legal Name" value={supplier.legalName} />
                            <DataField label="Trade Name" value={supplier.tradeName} />
                            <DataField label="Email Address" value={supplier.email || "supplier@test.com"} />
                            <DataField label="Mobile Number" value="—" />
                            <DataField label="Street Address" value="—" />
                            <DataField label="City" value="—" />
                            <DataField label="Province" value="—" />
                            <DataField label="Postal Code" value="—" />
                            <DataField label="Country" value="Philippines" />
                        </div>
                    </div>

                    {/* KYC Card */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <h2 className="text-base font-bold text-gray-800">KYC Documents</h2>
                            </div>
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">0 files</span>
                        </div>
                        <div className="p-20 flex flex-col items-center justify-center text-center">
                            <FileText className="w-12 h-12 text-gray-100 mb-4" />
                            <p className="text-sm font-bold text-gray-400">No documents uploaded yet.</p>
                        </div>
                    </div>

                    {/* Verification & Time Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/30 flex items-center gap-3">
                                <ShieldCheck className="w-5 h-5 text-blue-500" />
                                <h2 className="text-base font-bold text-gray-800">Verification Status</h2>
                            </div>
                            <div className="p-8 grid grid-cols-2 gap-8">
                                <DataField label="Email Verified" value={<><X className="w-3.5 h-3.5" /> No</>} isRed />
                                <DataField label="Mobile Verified" value={<><X className="w-3.5 h-3.5" /> No</>} isRed />
                                <DataField label="Approved At" value="—" />
                                <DataField label="Rejected At" value="—" />
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/30 flex items-center gap-3">
                                <Clock className="w-5 h-5 text-purple-500" />
                                <h2 className="text-base font-bold text-gray-800">Account Timestamps</h2>
                            </div>
                            <div className="p-8 grid grid-cols-1 gap-8">
                                <DataField label="Record Created" value={supplier.created || "Feb 26, 2026, 02:06 AM"} />
                                <DataField label="Last Updated" value="Feb 26, 2026, 02:48 AM" />
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default SupplierDetail;