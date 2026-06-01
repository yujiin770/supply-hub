import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { KycDocStatusBadge } from "../../components/badge";
import ConfirmModal from "../../components/confirm_modal";
import DocPreviewModal from "../../components/doc_preview_modal";
import type { KycDocType } from "../../features/api_clients/admin_api";
import {
  useDeleteKycDoc,
  useMyKycDocs,
  useUploadKycDoc,
  type MyKycDocumentResponse,
} from "../../features/api_clients/supplier_api";
import SupplierLayout from "../../layouts/supplier_layout";
import { FileText, UploadCloud, ChevronDown, FileCheck } from "lucide-react";

const DOC_TYPE_LABELS: Record<KycDocType, string> = {
  DTI_SEC: "DTI / SEC Registration",
  BIR_COR: "BIR Certificate of Registration",
  FDA_LTO: "FDA License to Operate",
  MAYORS_PERMIT: "Mayor's Permit",
  VALID_ID: "Valid Government ID",
  PROOF_OF_ADDRESS: "Proof of Address",
  OTHER: "Other",
};

const REQUIRED_TYPES: KycDocType[] = [
  "DTI_SEC",
  "BIR_COR",
  "MAYORS_PERMIT",
  "VALID_ID",
  "PROOF_OF_ADDRESS",
];

const OPTIONAL_TYPES: KycDocType[] = ["FDA_LTO", "OTHER"];
const ALL_TYPES: KycDocType[] = [...REQUIRED_TYPES, ...OPTIONAL_TYPES];

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupDocs(docs: MyKycDocumentResponse[]) {
  const map = new Map<KycDocType, MyKycDocumentResponse[]>();
  for (const doc of docs) {
    const arr = map.get(doc.doc_type) ?? [];
    arr.push(doc);
    map.set(doc.doc_type, arr);
  }
  for (const arr of map.values()) {
    arr.sort(
      (a, b) =>
        new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime(),
    );
  }
  return map;
}

export default function KycPage() {
  const { data: docsData, isLoading } = useMyKycDocs();
  const uploadMutation = useUploadKycDoc();
  const deleteMutation = useDeleteKycDoc();

  const [docType, setDocType] = useState<KycDocType>("DTI_SEC");
  const [file, setFile] = useState<File | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    url: string;
    filename: string;
  } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const docs = docsData?.items ?? [];
  const grouped = groupDocs(docs);

  const submittedRequired = REQUIRED_TYPES.filter((t) => {
    const group = grouped.get(t);
    return group && group.some((d) => d.status !== "REJECTED");
  });
  const pct = Math.round(
    (submittedRequired.length / REQUIRED_TYPES.length) * 100,
  );
  const allSubmitted = submittedRequired.length === REQUIRED_TYPES.length;

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    await uploadMutation.mutateAsync({ docType, file });
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget);
    setDeleteTarget(null);
  }

  return (
    <SupplierLayout>
      <DocPreviewModal
        fileUrl={preview?.url ?? null}
        filename={preview?.filename ?? ""}
        onClose={() => setPreview(null)}
      />
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete document?"
        message="This document will be permanently removed. You can re-upload if needed."
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="pb-20 max-w-8xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
            KYC Documents
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Upload and manage your business verification documents to maintain
            an active status.
          </p>
        </div>

        {/* Completion progress */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Required documents submitted
              </h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">
                Status:{" "}
                {allSubmitted ? "Awaiting Review" : "Information Required"}
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-semibold text-[#004797]">
                {submittedRequired.length} / {REQUIRED_TYPES.length}
              </span>
              <div className="w-48 h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${allSubmitted ? "bg-emerald-500" : "bg-amber-400"}`}
                  style={{ width: `${pct}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Checklist Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {REQUIRED_TYPES.map((t) => {
              const group = grouped.get(t);
              const latest = group?.[0];
              const ok = latest && latest.status !== "REJECTED";
              const isRejected = latest?.status === "REJECTED";
              return (
                <div
                  key={t}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50/50 border border-gray-100 transition-all hover:bg-white hover:shadow-sm group"
                >
                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors shrink-0
                      ${
                        ok
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : isRejected
                            ? "bg-rose-500 border-rose-500 text-white"
                            : "bg-white border-gray-200 text-gray-300 group-hover:border-amber-400"
                      }`}
                  >
                    {ok ? (
                      <span className="text-xs font-bold select-none">✓</span>
                    ) : isRejected ? (
                      <span className="text-xs font-bold select-none">✕</span>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                    )}
                  </div>
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-tight truncate">
                    {DOC_TYPE_LABELS[t].split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {allSubmitted && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex items-start gap-3">
            <span className="text-emerald-600 text-lg mt-0.5">✓</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-900">
                All required documents submitted!
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Your application is now awaiting admin review.
              </p>
            </div>
            <Link
              to="/supplier/onboarding"
              className="text-xs text-emerald-700 hover:underline font-medium shrink-0"
            >
              Back to Onboarding →
            </Link>
          </div>
        )}

        {/* START OF GRID LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* --- LEFT COLUMN: Upload Section (5 cols) --- */}
          <div className="lg:col-span-5 space-y-6">
            {/* Upload form */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-500" />
                Upload Document
              </h3>

              <form ref={formRef} onSubmit={handleUpload} className="space-y-5">
                {/* Document Type Dropdown */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">
                    Document Type <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as KycDocType)}
                      className="w-full appearance-none pl-4 pr-10 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-bold text-gray-700 cursor-pointer focus:bg-white focus:border-blue-500/30 transition-all outline-none"
                    >
                      <optgroup label="Required" className="text-[#004797]">
                        {REQUIRED_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {DOC_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Optional" className="text-gray-400">
                        {OPTIONAL_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {DOC_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  {grouped.has(docType) && (
                    <p className="mt-1 text-xs text-amber-600 font-semibold leading-relaxed">
                      ⚠ You already have a {DOC_TYPE_LABELS[docType]} document.
                      Uploading again adds a new record visible to admin.
                    </p>
                  )}
                </div>

                {/* File Drop Zone */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                    <span>
                      File <span className="text-rose-500">*</span>
                    </span>
                    <span className="text-blue-500 lowercase font-medium tracking-normal">
                      (PDF, JPEG, PNG — max 10 MB)
                    </span>
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
                  >
                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-100 transition-colors">
                      <FileText className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
                    </div>
                    <p className="text-sm font-bold text-gray-700 truncate max-w-full px-2">
                      {file ? file.name : "Choose file or drag here"}
                    </p>
                    {file && (
                      <p className="mt-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!file || uploadMutation.isPending}
                  className="w-full bg-[#004797] hover:bg-black disabled:opacity-50 text-white py-4 rounded-xl cursor-pointer font-bold transition-all shadow-lg shadow-blue-900/10 active:scale-[0.98] border-none outline-none"
                >
                  {uploadMutation.isPending ? "Uploading…" : "Upload Document"}
                </button>
              </form>
            </div>
          </div>

          {/* --- RIGHT COLUMN: Uploaded List (7 cols) --- */}
          <div className="lg:col-span-7">
            {/* Documents grouped by type */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-125">
              <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-800">
                  Uploaded Documents
                </h3>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {docs.length} Files Total
                </span>
              </div>

              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-20 space-y-4">
                  <div className="w-10 h-10 border-4 border-gray-100 border-t-[#004797] rounded-full animate-spin"></div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Syncing Documents...
                  </p>
                </div>
              ) : docs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-4">
                    <FileCheck className="w-10 h-10 text-gray-200" />
                  </div>
                  <h4 className="text-base font-semibold text-gray-900">
                    No documents uploaded yet
                  </h4>
                  <p className="text-sm text-gray-400 font-medium mt-1 max-w-60">
                    Your uploaded files will appear here for review and
                    management.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {ALL_TYPES.filter((t) => grouped.has(t)).map((t) => {
                    const group = grouped.get(t)!;
                    const latestRejected = group[0]?.status === "REJECTED";
                    return (
                      <div key={t} className="p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm font-semibold text-slate-800">
                            {DOC_TYPE_LABELS[t]}
                          </span>
                          {!REQUIRED_TYPES.includes(t) && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 rounded-md px-1.5 py-0.5 font-bold uppercase tracking-wider">
                              optional
                            </span>
                          )}
                          {latestRejected && (
                            <span className="text-[10px] bg-red-50 text-red-600 rounded-md px-1.5 py-0.5 font-bold uppercase tracking-wider">
                              ⚠ Re-upload needed
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          {group.map((doc, idx) => (
                            <div
                              key={doc.id}
                              className={`flex items-center gap-3 text-sm rounded-lg px-4 py-3 ${idx === 0 ? "bg-slate-50 border border-slate-200" : "border border-dashed border-slate-200 opacity-60"}`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      setPreview({
                                        url: doc.file_url,
                                        filename: doc.original_filename,
                                      })
                                    }
                                    className="text-[#004797] hover:underline text-xs font-bold truncate max-w-50 text-left bg-transparent border-none outline-none cursor-pointer"
                                  >
                                    {doc.original_filename}
                                  </button>
                                  {idx === 0 && group.length > 1 && (
                                    <span className="text-xs text-slate-400 font-semibold">
                                      (latest)
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <KycDocStatusBadge status={doc.status} />
                                  <span className="text-xs text-slate-400 font-semibold">
                                    {fmt(doc.uploaded_at)}
                                  </span>
                                </div>
                                {doc.remarks && (
                                  <p className="text-xs text-red-600 mt-1 italic font-medium">
                                    Admin note: {doc.remarks}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {doc.status === "REJECTED" && idx === 0 && (
                                  <button
                                    onClick={() => {
                                      setDocType(t);
                                      formRef.current?.scrollIntoView({
                                        behavior: "smooth",
                                      });
                                    }}
                                    className="text-xs bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded-xl px-3 py-1.5 font-bold transition-all cursor-pointer border-none outline-none"
                                  >
                                    Re-upload
                                  </button>
                                )}
                                {doc.status === "SUBMITTED" && (
                                  <button
                                    onClick={() => setDeleteTarget(doc.id)}
                                    disabled={deleteMutation.isPending}
                                    className="text-xs text-red-500 hover:text-red-700 font-bold disabled:opacity-50 bg-transparent border-none outline-none cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SupplierLayout>
  );
}
