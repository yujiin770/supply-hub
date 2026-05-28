import React, { useState } from "react";
import { 
  UploadCloud, 
  FileSpreadsheet, 
  History, 
  Plus, 
  FileText,
  AlertCircle
} from "lucide-react";

const ImportMissingItems: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);

  // Drag and drop handlers to improve UX
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="pb-20 max-w-8xl mx-auto animate-in fade-in duration-500">
      {/* --- Page Header --- */}
      <div className="mb-10">
        <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
          Import Missing Items
        </h1>
        <p className="text-base text-gray-500 font-medium mt-2 max-w-3xl">
          Upload a CSV of products that are missing from the PharmaLake master catalog. 
          PharmaLake will review and approve each item before it becomes searchable.
        </p>
      </div>

      <div className="space-y-8">
        {/* --- Upload Section --- */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/30">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              Upload CSV
            </h2>
          </div>

          <div className="p-8">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={() => setIsDragging(false)}
              className={`
                relative group cursor-pointer
                border-2 border-dashed rounded-[20px] 
                transition-all duration-300 ease-in-out
                flex flex-col items-center justify-center
                py-20 px-10
                ${isDragging 
                  ? "border-blue-500 bg-blue-50/50" 
                  : "border-gray-200 bg-gray-50/50 hover:border-blue-400 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5"}
              `}
            >
              <input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                accept=".csv"
              />
              
              <div className={`
                p-5 rounded-2xl mb-6 transition-transform duration-300
                ${isDragging ? "scale-110 bg-blue-100 text-blue-600" : "bg-white text-gray-400 group-hover:text-blue-500 shadow-sm"}
              `}>
                <UploadCloud className="w-12 h-12" />
              </div>

              <div className="text-center">
                <p className="text-lg font-bold text-gray-900 mb-1">
                  Drop a CSV file here or <span className="text-blue-600">click to browse</span>
                </p>
                <div className="flex items-center justify-center gap-4 mt-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-gray-100 shadow-xs">
                        CSV format
                    </span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-gray-100 shadow-xs">
                        Max 10 MB
                    </span>
                </div>
              </div>
            </div>

            {/* Template Download Help */}
            <div className="mt-8 flex items-center justify-center">
                <button className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-blue-600 transition-colors">
                    <FileSpreadsheet className="w-4 h-4" />
                    Download CSV Template
                </button>
            </div>
          </div>
        </section>

        {/* --- Import History Section --- */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/30">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              Import History
            </h2>
          </div>

          <div className="min-h-75 flex flex-col items-center justify-center p-10 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 border border-gray-100 shadow-inner">
                <FileText className="w-10 h-10 text-gray-200" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900">
              No imports yet.
            </h3>
            <p className="text-gray-400 font-medium mt-2 max-w-sm">
              When you upload product batches for review, your submission 
              status and processing history will appear here.
            </p>

            <div className="mt-8 flex items-center gap-2 text-[11px] font-bold text-blue-500/60 uppercase tracking-widest">
                <AlertCircle className="w-3.5 h-3.5" />
                Data typically clears every 30 days
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ImportMissingItems;