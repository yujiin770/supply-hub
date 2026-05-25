import React, { useState, useRef } from "react";
import {
  FileText,
  UploadCloud,
  ChevronDown,
  FileCheck,
  Download,
  CheckCircle2,
  X,
} from "lucide-react";

interface ImportRecord {
  id: string;
  fileName: string;
  date: string;
  status: "Approved" | "Under Review" | "Failed";
  totalItems: number;
  approvedItems: number;
  notes?: string;
}

export default function ImportMissingItems() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock initial import history
  const [history, setHistory] = useState<ImportRecord[]>([
    {
      id: "IMP-4092",
      fileName: "pharma_catalog_additions_v2.csv",
      date: "May 24, 2026, 11:15 AM",
      status: "Approved",
      totalItems: 42,
      approvedItems: 42,
    },
    {
      id: "IMP-3911",
      fileName: "otc_supplements_may.csv",
      date: "May 18, 2026, 03:40 PM",
      status: "Failed",
      totalItems: 18,
      approvedItems: 0,
      notes: 'Missing required "SKU" column header.',
    },
  ]);

  const requiredColumns = [
    { name: "SKU / Unique Code", key: "SKU" },
    { name: "Product Name", key: "Name" },
    { name: "Brand / Manufacturer", key: "Brand" },
    { name: "Form (e.g. Tablet, Lotion)", key: "Form" },
    { name: "Base Price", key: "Price" },
  ];

  // Drag and Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".csv")) {
      alert("Please upload a CSV file format only.");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit.");
      return;
    }
    setFile(selectedFile);
  };

  const handleUploadSubmit = () => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(10);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            const newRecord: ImportRecord = {
              id: `IMP-${Math.floor(1000 + Math.random() * 9000)}`,
              fileName: file.name,
              date: new Date().toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "numeric",
                hour12: true,
              }),
              status: "Under Review",
              totalItems: Math.floor(10 + Math.random() * 50),
              approvedItems: 0,
            };

            setHistory((prevHistory) => [newRecord, ...prevHistory]);
            setFile(null);
            setUploading(false);
            setUploadProgress(0);
          }, 500);
          return 100;
        }
        return prev + 30;
      });
    }, 300);
  };

  return (
    <div className="pb-20 max-w-8xl mx-auto animate-fadeIn">
      {/* --- Page Header --- */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Import Missing Items
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Upload a CSV of products that are missing from the PharmaLake master
            catalog.
          </p>
        </div>
        <button
          onClick={() => alert("Downloading CSV Template with sample headers.")}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 border border-gray-200 shadow-xs text-xs font-bold uppercase tracking-wider rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-all duration-200 cursor-pointer"
        >
          <Download className="w-4 h-4 text-gray-500" />
          Download Template
        </button>
      </div>
      {/* --- Progress & Guidance Checklist Section --- */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              CSV Format Header Verification Checklist
            </h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">
              Ensure your upload file contains these exact columns
            </p>
          </div>
          <div className="text-right flex items-center gap-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Required Match Rate:
            </span>
            <span className="text-3xl font-semibold text-[#004797]">100%</span>
          </div>
        </div>

        {/* Column requirement grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {requiredColumns.map((col) => (
            <div
              key={col.key}
              className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50/50 border border-gray-100 transition-all hover:bg-white hover:shadow-sm group"
            >
              <div className="w-8 h-8 rounded-full bg-white border-2 border-dashed border-gray-200 flex items-center justify-center text-emerald-500 group-hover:border-emerald-400 transition-colors">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-700 block">
                  {col.key}
                </span>
                <span className="text-[10px] text-gray-400 font-medium leading-none block mt-0.5">
                  {col.name}
                </span>
              </div>
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
              Upload CSV File
            </h3>

            <div className="space-y-5">
              {/* Target Segment Selector Dropdown */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  Target Drug Classification{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select className="w-full appearance-none pl-4 pr-10 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-bold text-gray-700 cursor-pointer focus:bg-white focus:border-blue-500/30 transition-all outline-none">
                    <option value="" disabled selected>
                      Select therapeutic class...
                    </option>
                    <option value="rx">Prescription Only (Rx)</option>
                    <option value="otc">Over the Counter (OTC)</option>
                    <option value="medical">Medical Device / Supplies</option>
                    <option value="herbal">Herbal / Supplements</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* File Drop Zone */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                  <span>CSV File Source</span>
                  <span className="text-blue-500 lowercase font-medium tracking-normal">
                    (CSV only — max 10 MB)
                  </span>
                </label>

                {!file ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer group ${
                      dragActive
                        ? "border-emerald-500 bg-emerald-50/20"
                        : "border-gray-100 hover:border-blue-400 hover:bg-blue-50/30"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".csv"
                      onChange={handleFileChange}
                    />
                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-100 transition-colors">
                      <FileText className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
                    </div>
                    <p className="text-sm font-bold text-gray-700">
                      Choose file or drag here
                    </p>
                  </div>
                ) : (
                  <div className="border border-gray-100 rounded-2xl p-5 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate max-w-40 sm:max-w-xs">
                            {file.name}
                          </p>
                          <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-tight">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      {!uploading && (
                        <button
                          onClick={() => setFile(null)}
                          className="p-1 rounded-full text-gray-400 hover:bg-gray-200 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {uploading && (
                      <div className="mt-4 space-y-1.5">
                        <div className="flex justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                          <span>Importing data...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200/60 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                disabled={!file || uploading}
                onClick={handleUploadSubmit}
                className="w-full bg-[#004797] hover:bg-black disabled:bg-gray-100 disabled:text-gray-400 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/10 active:scale-[0.98] disabled:scale-100 disabled:shadow-none"
              >
                {uploading ? "Parsing File..." : "Upload & Parse Document"}
              </button>
            </div>
          </div>
        </div>

        {/* --- RIGHT COLUMN: Import History (7 cols) --- */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-125">
            <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-800">
                Import History Logs
              </h3>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {history.length} Logs Total
              </span>
            </div>

            {history.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-4">
                  <FileCheck className="w-10 h-10 text-gray-200" />
                </div>
                <h4 className="text-base font-bold text-gray-900">
                  No documents imported yet
                </h4>
                <p className="text-sm text-gray-400 font-medium mt-1 max-w-60">
                  Your uploaded master catalog batch logs will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-50 text-left">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        ID / File
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Date / items
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
                        Status
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Verification Note
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {history.map((record) => (
                      <tr
                        key={record.id}
                        className="hover:bg-gray-50/40 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="text-xs font-mono font-bold text-gray-800">
                            {record.id}
                          </div>
                          <div
                            className="text-sm font-semibold text-gray-700 truncate max-w-37.5 mt-0.5"
                            title={record.fileName}
                          >
                            {record.fileName}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs font-medium text-gray-500">
                            {record.date}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            <span className="font-bold text-gray-700">
                              {record.totalItems}
                            </span>{" "}
                            items parsed
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                              record.status === "Approved"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : record.status === "Under Review"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                            }`}
                          >
                            {record.status === "Under Review" && (
                              <span className="relative mr-1 flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                              </span>
                            )}
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-gray-500 max-w-xs">
                          {record.notes ? (
                            <span className="text-rose-500 font-bold">
                              {record.notes}
                            </span>
                          ) : record.status === "Under Review" ? (
                            <span className="italic text-gray-400">
                              Undergoing audit...
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-medium">
                              Successfully processed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>{" "}
      {/* END OF GRID LAYOUT */}
    </div>
  );
}
