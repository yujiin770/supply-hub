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

      <div className="max-w-2xl space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">KYC Documents</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Upload and manage your verification documents.
          </p>
        </div>

        {/* Completion progress */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-slate-700">
              Required documents submitted
            </span>
            <span
              className={`font-bold ${allSubmitted ? "text-emerald-600" : "text-slate-600"}`}
            >
              {submittedRequired.length} / {REQUIRED_TYPES.length}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${allSubmitted ? "bg-emerald-500" : "bg-amber-400"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
            {REQUIRED_TYPES.map((t) => {
              const group = grouped.get(t);
              const latest = group?.[0];
              const ok = latest && latest.status !== "REJECTED";
              return (
                <div
                  key={t}
                  className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${ok ? "bg-emerald-50 text-emerald-700" : latest?.status === "REJECTED" ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-500"}`}
                >
                  <span>
                    {ok ? "✓" : latest?.status === "REJECTED" ? "✗" : "○"}
                  </span>
                  <span className="truncate">
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

        {/* Upload form */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Upload Document</h2>
          <form ref={formRef} onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Document Type <span className="text-red-500">*</span>
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as KycDocType)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <optgroup label="Required">
                  {REQUIRED_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {DOC_TYPE_LABELS[t]}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Optional">
                  {OPTIONAL_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {DOC_TYPE_LABELS[t]}
                    </option>
                  ))}
                </optgroup>
              </select>
              {grouped.has(docType) && (
                <p className="mt-1 text-xs text-amber-600">
                  ⚠ You already have a {DOC_TYPE_LABELS[docType]} document.
                  Uploading again adds a new record visible to admin.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                File <span className="text-red-500">*</span>
                <span className="ml-2 font-normal text-slate-400">
                  (PDF, JPEG, PNG — max 10 MB)
                </span>
              </label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:text-sm file:font-medium hover:file:bg-emerald-100 cursor-pointer"
              />
              {file && (
                <p className="mt-1 text-xs text-slate-500">
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={!file || uploadMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              {uploadMutation.isPending ? "Uploading…" : "Upload Document"}
            </button>
          </form>
        </div>

        {/* Documents grouped by type */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Uploaded Documents</h2>
          </div>
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              Loading…
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No documents uploaded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {ALL_TYPES.filter((t) => grouped.has(t)).map((t) => {
                const group = grouped.get(t)!;
                const latestRejected = group[0]?.status === "REJECTED";
                return (
                  <div key={t} className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-slate-800">
                        {DOC_TYPE_LABELS[t]}
                      </span>
                      {!REQUIRED_TYPES.includes(t) && (
                        <span className="text-xs bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">
                          optional
                        </span>
                      )}
                      {latestRejected && (
                        <span className="text-xs bg-red-50 text-red-600 rounded px-1.5 py-0.5 font-medium">
                          ⚠ Re-upload needed
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {group.map((doc, idx) => (
                        <div
                          key={doc.id}
                          className={`flex items-center gap-3 text-sm rounded-lg px-3 py-2 ${idx === 0 ? "bg-slate-50 border border-slate-200" : "border border-dashed border-slate-200 opacity-60"}`}
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
                                className="text-emerald-600 hover:underline text-xs truncate max-w-[200px] text-left"
                              >
                                {doc.original_filename}
                              </button>
                              {idx === 0 && group.length > 1 && (
                                <span className="text-xs text-slate-400">
                                  (latest)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <KycDocStatusBadge status={doc.status} />
                              <span className="text-xs text-slate-400">
                                {fmt(doc.uploaded_at)}
                              </span>
                            </div>
                            {doc.remarks && (
                              <p className="text-xs text-red-600 mt-0.5 italic">
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
                                className="text-xs bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded-lg px-2 py-1 font-medium transition-colors"
                              >
                                Re-upload
                              </button>
                            )}
                            {doc.status === "SUBMITTED" && (
                              <button
                                onClick={() => setDeleteTarget(doc.id)}
                                disabled={deleteMutation.isPending}
                                className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
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
    </SupplierLayout>
  );
}
