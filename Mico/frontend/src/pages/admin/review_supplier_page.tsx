import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../../auth";
import { KycDocStatusBadge, SupplierStatusBadge } from "../../components/badge";
import DocPreviewModal from "../../components/doc_preview_modal";
import ReasonModal from "../../components/reason_modal";
import {
  adminApi,
  type KycDocumentResponse,
  type SupplierWithKycResponse,
} from "../../features/api_clients/admin_api";
import AppLayout from "../../layouts/app_layout";
import { toast } from "../../lib/toast";

const DOC_LABELS: Record<string, string> = {
  DTI_SEC: "DTI / SEC",
  BIR_COR: "BIR COR",
  FDA_LTO: "FDA LTO",
  MAYORS_PERMIT: "Mayor's Permit",
  VALID_ID: "Valid ID",
  PROOF_OF_ADDRESS: "Proof of Address",
  OTHER: "Other",
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Doc review modal ──────────────────────────────────────────────────────────
function ReviewDocModal({
  doc,
  onClose,
  onSubmit,
}: {
  doc: KycDocumentResponse;
  onClose: () => void;
  onSubmit: (status: "APPROVED" | "REJECTED", remarks: string) => Promise<void>;
}) {
  const [docStatus, setDocStatus] = useState<"APPROVED" | "REJECTED">(
    "APPROVED",
  );
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(docStatus, remarks);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">
          Review Document
        </h3>
        <p className="text-sm text-slate-500 mb-5">
          {DOC_LABELS[doc.doc_type] ?? doc.doc_type} — {doc.original_filename}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            {(["APPROVED", "REJECTED"] as const).map((s) => (
              <label key={s} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="doc_status"
                  value={s}
                  checked={docStatus === s}
                  onChange={() => setDocStatus(s)}
                  className="accent-emerald-600"
                />
                <span
                  className={`text-sm font-medium ${s === "APPROVED" ? "text-emerald-700" : "text-red-600"}`}
                >
                  {s === "APPROVED" ? "Approve" : "Reject"}
                </span>
              </label>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Remarks
              {docStatus === "REJECTED" && (
                <span className="text-red-500 ml-0.5">*</span>
              )}
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder={
                docStatus === "REJECTED"
                  ? "Explain the rejection reason…"
                  : "Optional notes…"
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={
                loading || (docStatus === "REJECTED" && !remarks.trim())
              }
              className="flex-1 bg-emerald-600 disabled:opacity-50 hover:bg-emerald-700
                         text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              {loading ? "Saving…" : "Submit Review"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-300 text-slate-700 text-sm py-2.5
                         rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Reject supplier modal ─────────────────────────────────────────────────────
function RejectSupplierModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await onSubmit(reason.trim());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">
          Reject Supplier
        </h3>
        <p className="text-sm text-slate-500 mb-5">
          Provide a clear reason. This will be visible to the supplier.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Missing required documents, incorrect information…"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="flex-1 bg-red-600 disabled:opacity-50 hover:bg-red-700
                         text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              {loading ? "Rejecting…" : "Reject Supplier"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-300 text-slate-700 text-sm py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function ReviewSupplierPage() {
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.accessToken)!;
  const navigate = useNavigate();

  const [data, setData] = useState<SupplierWithKycResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewingDoc, setReviewingDoc] = useState<KycDocumentResponse | null>(
    null,
  );
  const [inlineRejectDoc, setInlineRejectDoc] =
    useState<KycDocumentResponse | null>(null);
  const [inlineApprovingId, setInlineApprovingId] = useState<string | null>(
    null,
  );
  const [inlineRejectLoading, setInlineRejectLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approving, setApproving] = useState(false);
  const [preview, setPreview] = useState<{
    url: string;
    filename: string;
  } | null>(null);

  async function load() {
    if (!id) return;
    try {
      const res = await adminApi.getSupplierKyc(id, token);
      setData(res);
    } catch {
      toast.error("Supplier not found.");
      navigate("/admin/suppliers/pending");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]); // eslint-disable-line

  async function handleApprove() {
    if (!id) return;
    if (!data?.kyc_complete) {
      const confirmed = window.confirm(
        "Not all required KYC documents have been submitted. Approve this supplier anyway?",
      );
      if (!confirmed) return;
    }
    setApproving(true);
    try {
      await adminApi.approve(id, token);
      toast.success("Supplier approved. Owner accounts activated.");
      void load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to approve.");
    } finally {
      setApproving(false);
    }
  }

  async function handleReject(reason: string) {
    if (!id) return;
    await adminApi.reject(id, { reason }, token);
    toast.success("Supplier rejected.");
    setShowRejectModal(false);
    void load();
  }

  async function handleDocReview(
    docStatus: "APPROVED" | "REJECTED",
    remarks: string,
  ) {
    if (!reviewingDoc) return;
    await adminApi.reviewKycDocument(
      reviewingDoc.id,
      { status: docStatus, remarks },
      token,
    );
    toast.success(`Document ${docStatus.toLowerCase()}.`);
    setReviewingDoc(null);
    void load();
  }

  async function handleInlineApprove(docId: string) {
    setInlineApprovingId(docId);
    try {
      await adminApi.reviewKycDocument(
        docId,
        { status: "APPROVED", remarks: "" },
        token,
      );
      toast.success("Document approved.");
      void load();
    } catch {
      toast.error("Failed to approve document.");
    } finally {
      setInlineApprovingId(null);
    }
  }

  async function handleInlineReject(remarks: string) {
    if (!inlineRejectDoc) return;
    setInlineRejectLoading(true);
    try {
      await adminApi.reviewKycDocument(
        inlineRejectDoc.id,
        { status: "REJECTED", remarks },
        token,
      );
      toast.success("Document rejected.");
      setInlineRejectDoc(null);
      void load();
    } catch {
      toast.error("Failed to reject document.");
    } finally {
      setInlineRejectLoading(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-slate-400 text-sm">Loading…</div>
      </AppLayout>
    );
  }
  if (!data) return null;

  const { supplier, kyc_documents, kyc_complete } = data;
  const canApprove = ["PENDING_KYC", "PENDING_APPROVAL"].includes(
    supplier.status,
  );
  const canReject = ["PENDING_KYC", "PENDING_APPROVAL"].includes(
    supplier.status,
  );

  return (
    <AppLayout>
      {reviewingDoc && (
        <ReviewDocModal
          doc={reviewingDoc}
          onClose={() => setReviewingDoc(null)}
          onSubmit={handleDocReview}
        />
      )}
      <DocPreviewModal
        fileUrl={preview?.url ?? null}
        filename={preview?.filename ?? ""}
        onClose={() => setPreview(null)}
      />
      {inlineRejectDoc && (
        <ReasonModal
          isOpen
          title={`Reject — ${DOC_LABELS[inlineRejectDoc.doc_type] ?? inlineRejectDoc.doc_type}`}
          placeholder="Explain why this document is being rejected…"
          submitLabel="Reject Document"
          minLength={5}
          loading={inlineRejectLoading}
          onSubmit={handleInlineReject}
          onCancel={() => setInlineRejectDoc(null)}
        />
      )}
      {showRejectModal && (
        <RejectSupplierModal
          onClose={() => setShowRejectModal(false)}
          onSubmit={handleReject}
        />
      )}

      <div className="max-w-4xl">
        <button
          onClick={() => navigate("/admin/suppliers/pending")}
          className="text-sm text-slate-500 hover:text-slate-700 mb-4 flex items-center gap-1"
        >
          ← Back to Queue
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">
                {supplier.legal_name}
              </h1>
              <SupplierStatusBadge status={supplier.status} />
            </div>
            <p className="text-sm text-slate-500 font-mono mt-0.5">
              {supplier.supplier_code}
            </p>
          </div>
          {(canApprove || canReject) && (
            <div className="flex gap-2">
              {canApprove && (
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  title={
                    !kyc_complete
                      ? "KYC incomplete — you will be asked to confirm"
                      : "Approve this supplier"
                  }
                  className={`text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50
                             ${
                               kyc_complete
                                 ? "bg-emerald-600 hover:bg-emerald-700"
                                 : "bg-amber-500 hover:bg-amber-600"
                             }`}
                >
                  {approving
                    ? "Approving…"
                    : kyc_complete
                      ? "Approve Supplier"
                      : "Approve Supplier ⚠"}
                </button>
              )}
              {canReject && (
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="bg-white hover:bg-red-50 border border-red-300 text-red-700
                             text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                >
                  Reject
                </button>
              )}
            </div>
          )}
        </div>

        {/* KYC completeness */}
        <div
          className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
            kyc_complete
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}
        >
          {kyc_complete
            ? "✓ All required KYC documents submitted"
            : "⚠ Not all required documents have been approved"}
        </div>

        {/* Supplier info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          {[
            ["Legal Name", supplier.legal_name],
            ["Trade Name", supplier.trade_name ?? "—"],
            ["Email", supplier.email],
            ["Mobile", supplier.mobile_number ?? "—"],
            ["Address", supplier.address_line1],
            ["City / Province", `${supplier.city}, ${supplier.province}`],
          ].map(([l, v]) => (
            <div key={l}>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">
                {l}
              </p>
              <p className="text-sm text-slate-900">{v}</p>
            </div>
          ))}
        </div>

        {/* KYC documents */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">KYC Documents</h2>
          </div>
          {kyc_documents.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No documents uploaded.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Document Type
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600">File</th>
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Status
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600 hidden md:table-cell">
                    Uploaded
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Remarks
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {kyc_documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {DOC_LABELS[doc.doc_type] ?? doc.doc_type}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          setPreview({
                            url: doc.file_url,
                            filename: doc.original_filename,
                          })
                        }
                        className="text-emerald-600 hover:underline truncate max-w-[10rem] inline-block text-left"
                      >
                        {doc.original_filename}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <KycDocStatusBadge status={doc.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                      {fmt(doc.uploaded_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[12rem]">
                      {doc.remarks ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {doc.status === "SUBMITTED" ? (
                        <div className="flex gap-1.5 justify-end">
                          <button
                            onClick={() => void handleInlineApprove(doc.id)}
                            disabled={inlineApprovingId === doc.id}
                            className="text-xs font-medium px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-700
                                       hover:bg-emerald-200 disabled:opacity-50 whitespace-nowrap transition-colors"
                          >
                            {inlineApprovingId === doc.id ? "…" : "✓ Approve"}
                          </button>
                          <button
                            onClick={() => setInlineRejectDoc(doc)}
                            disabled={inlineApprovingId === doc.id}
                            className="text-xs font-medium px-2.5 py-1 rounded-md bg-red-100 text-red-700
                                       hover:bg-red-200 disabled:opacity-50 whitespace-nowrap transition-colors"
                          >
                            ✗ Reject
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReviewingDoc(doc)}
                          className="text-xs font-medium text-slate-500 hover:text-blue-600 hover:underline whitespace-nowrap"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {supplier.rejection_reason && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
            <p className="text-sm font-medium text-red-700 mb-1">
              Rejection Reason
            </p>
            <p className="text-sm text-red-600">{supplier.rejection_reason}</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
