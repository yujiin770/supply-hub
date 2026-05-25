import React, { useState } from 'react';
import {
    FileText,
    UploadCloud,
    ChevronDown,
    FileCheck,
} from 'lucide-react';

const KYCDocuments: React.FC = () => {
    const [documents] = useState<any[]>([]); // Mock uploaded list

    const requiredDocs = [
        { name: 'DTI / SEC Registration', key: 'DTI', status: 'pending' },
        { name: 'BIR Certificate ', key: 'BIR', status: 'pending' },
        { name: "Mayor's / Business Permit", key: 'Mayor', status: 'pending' },
        { name: 'Valid Government ID', key: 'ID', status: 'pending' },
        { name: 'Proof of Billing', key: 'Proof', status: 'pending' },
    ];

    return (
        <div className="pb-20 max-w-8xl mx-auto">
            {/* --- Page Header --- */}
            <div className="mb-10">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">KYC Documents</h1>
                <p className="text-sm text-gray-500 font-medium mt-1">Upload and manage your business verification documents to maintain an active status.</p>
            </div>

            {/* --- Progress & Checklist Section --- */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Required documents submitted</h2>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Status: Information Required</p>
                    </div>
                    <div className="text-right">
                        <span className="text-3xl font-extrabold text-[#004797]">0 / 5</span>
                        <div className="w-48 h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-emerald-500 w-0 transition-all duration-1000"></div>
                        </div>
                    </div>
                </div>

                {/* Checklist Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {requiredDocs.map((doc) => (
                        <div key={doc.key} className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50/50 border border-gray-100 transition-all hover:bg-white hover:shadow-sm group">
                            <div className="w-8 h-8 rounded-full bg-white border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 group-hover:border-amber-400 transition-colors">
                                <div className="w-2 h-2 rounded-full bg-current"></div>
                            </div>
                            <span className="text-xs font-bold text-gray-600 uppercase tracking-tight">{doc.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* START OF GRID LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* --- LEFT COLUMN: Upload Section (5 cols) --- */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                        <h3 className="text-base font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <UploadCloud className="w-5 h-5 text-blue-500" />
                            Upload Document
                        </h3>

                        <div className="space-y-5">
                            {/* Document Type Dropdown */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                    Document Type <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <select className="w-full appearance-none pl-4 pr-10 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-bold text-gray-700 cursor-pointer focus:bg-white focus:border-blue-500/30 transition-all outline-none">
                                        <option value="" disabled selected>Select document type...</option>
                                        <optgroup label="Required" className="text-[#004797]">
                                            <option value="dti">DTI / SEC Registration</option>
                                            <option value="bir">BIR Certificate of Registration</option>
                                            <option value="mayor">Mayor's Permit</option>
                                            <option value="id">Valid Government ID</option>
                                            <option value="address">Proof of Address</option>
                                        </optgroup>
                                        <optgroup label="Optional" className="text-gray-400">
                                            <option value="fda">FDA License to Operate</option>
                                            <option value="other">Other</option>
                                        </optgroup>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* File Drop Zone */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                                    <span>File</span>
                                    <span className="text-blue-500 lowercase font-medium tracking-normal">(PDF, JPEG, PNG — max 10 MB)</span>
                                </label>
                                <div className="border-2 border-dashed border-gray-100 rounded-2xl p-10 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group">
                                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-100 transition-colors">
                                        <FileText className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
                                    </div>
                                    <p className="text-sm font-bold text-gray-700">Choose file or drag here</p>
                                </div>
                            </div>

                            <button className="w-full bg-[#004797] hover:bg-black text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/10 active:scale-[0.98]">
                                Upload Document
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- RIGHT COLUMN: Uploaded List (7 cols) --- */}
                <div className="lg:col-span-7">
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="text-base font-bold text-gray-800">Uploaded Documents</h3>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">0 Files Total</span>
                        </div>

                        {documents.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-4">
                                    <FileCheck className="w-10 h-10 text-gray-200" />
                                </div>
                                <h4 className="text-base font-bold text-gray-900">No documents uploaded yet</h4>
                                <p className="text-sm text-gray-400 font-medium mt-1 max-w-[240px]">
                                    Your uploaded files will appear here for review and management.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {/* List items would go here */}
                            </div>
                        )}
                    </div>
                </div>

            </div> {/* END OF GRID LAYOUT */}
        </div>
    );
};

export default KYCDocuments;