import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../../auth";
import { KycDocStatusBadge, SupplierStatusBadge } from "../../components/badge";
import ConfirmModal from "../../components/confirm_modal";
import DocPreviewModal from "../../components/doc_preview_modal";
import ReasonModal from "../../components/reason_modal";
import Stepper from "../../components/stepper";
import {
  adminApi,
  type KycDocumentResponse,
  type KycDocType,
  type SupplierWithKycResponse,
} from "../../features/api_clients/admin_api";
import {
  superadminApi,
  type SupplierResponse,
  type SupplierStatus,
} from "../../features/api_clients/superadmin_api";
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

const REQUIRED_TYPES = [
  "DTI_SEC",
  "BIR_COR",
  "MAYORS_PERMIT",
  "VALID_ID",
  "PROOF_OF_ADDRESS",
];

const ONBOARDING_STEPS = [
  { label: "Account Created", description: "Provisioned" },
  { label: "KYC Submitted", description: "Documents uploaded" },
  { label: "Approved", description: "Review passed" },
];

function stepIndex(status: SupplierStatus): number {
  switch (status) {
    case "PENDING_KYC":
      return 1;
    case "PENDING_APPROVAL":
      return 2;
    case "APPROVED":
      return 3;
    default:
      return 1;
  }
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-slate-100 last:border-0">
      <span className="text-sm font-medium text-slate-500 sm:w-44 shrink-0">
        {label}
      </span>
      <span className="text-sm text-slate-900">{value ?? "—"}</span>
    </div>
  );
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
          Provide a clear reason — visible to the supplier.
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
              className="flex-1 bg-red-600 disabled:opacity-50 hover:bg-red-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
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
export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.accessToken)!;
  const navigate = useNavigate();

  const [kycData, setKycData] = useState<SupplierWithKycResponse | null>(null);
  const [supplier, setSupplier] = useState<SupplierResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [inlineRejectDoc, setInlineRejectDoc] =
    useState<KycDocumentResponse | null>(null);
  const [inlineRejectLoading, setInlineRejectLoading] = useState(false);
  const [inlineApprovingId, setInlineApprovingId] = useState<string | null>(
    null,
  );
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [confirmReactivate, setConfirmReactivate] =
    useState<SupplierStatus | null>(null);
  const [preview, setPreview] = useState<{
    url: string;
    filename: string;
  } | null>(null);

  async function load() {
    if (!id) return;
    try {
      // Fetch KYC detail (works for SUPERADMIN) + plain supplier as fallback
      const kd = await adminApi.getSupplierKyc(id, token);
      setKycData(kd);
      setSupplier(kd.supplier);
    } catch {
      // Fall back to plain supplier view if KYC fetch fails (e.g., not yet submitted)
      try {
        const s = await superadminApi.get(id, token);
        setSupplier(s);
      } catch {
        toast.error("Supplier not found.");
        navigate("/superadmin/suppliers");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]); // eslint-disable-line

  async function handleApprove() {
    if (!id) return;
    if (!kycData?.kyc_complete) {
      const ok = window.confirm(
        "Not all required KYC documents have been approved. Approve this supplier anyway?",
      );
      if (!ok) return;
    }
    setApproving(true);
    try {
      await adminApi.approve(id, token);
      toast.success("Supplier approved. Owner accounts activated.");
      void load();
    } catch {
      toast.error("Failed to approve.");
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

  async function changeStatus(next: SupplierStatus) {
    if (!supplier) return;
    setUpdating(true);
    try {
      const updated = await superadminApi.updateStatus(
        supplier.id,
        { status: next },
        token,
      );
      setSupplier(updated);
      if (kycData) setKycData({ ...kycData, supplier: updated });
      toast.success(`Status updated to ${next}.`);
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setUpdating(false);
      setConfirmSuspend(false);
      setConfirmReactivate(null);
    }
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
  if (!supplier) return null;

  const kyc_documents = kycData?.kyc_documents ?? [];
  const kyc_complete = kycData?.kyc_complete ?? false;
  const submittedTypes = new Set(
    kyc_documents.filter((d) => d.status !== "REJECTED").map((d) => d.doc_type),
  );
  const requiredDone = REQUIRED_TYPES.filter((t) =>
    submittedTypes.has(t as KycDocType),
  ).length;

  const isPending = ["PENDING_KYC", "PENDING_APPROVAL"].includes(
    supplier.status,
  );
  const isApproved = supplier.status === "APPROVED";
  const isSuspended = supplier.status === "SUSPENDED";
  const isRejected = supplier.status === "REJECTED";
  const canReviewSupplier = isPending;

  return (
    <AppLayout>
      {/* Modals */}
      {showRejectModal && (
        <RejectSupplierModal
          onClose={() => setShowRejectModal(false)}
          onSubmit={handleReject}
        />
      )}
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
      <DocPreviewModal
        fileUrl={preview?.url ?? null}
        filename={preview?.filename ?? ""}
        onClose={() => setPreview(null)}
      />
      <ConfirmModal
        isOpen={confirmSuspend}
        title="Suspend Supplier"
        message={`Suspend "${supplier.legal_name}"? Their portal access will be restricted.`}
        confirmLabel="Suspend"
        danger
        onConfirm={() => void changeStatus("SUSPENDED")}
        onCancel={() => setConfirmSuspend(false)}
      />
      <ConfirmModal
        isOpen={!!confirmReactivate}
        title="Reactivate Supplier"
        message={`Reactivate "${supplier.legal_name}" to ${confirmReactivate}?`}
        confirmLabel="Reactivate"
        onConfirm={() => {
          if (confirmReactivate) void changeStatus(confirmReactivate);
        }}
        onCancel={() => setConfirmReactivate(null)}
      />

      <div className="max-w-4xl">
        <button
          onClick={() => navigate("/superadmin/suppliers")}
          className="text-sm text-slate-500 hover:text-slate-700 mb-4 flex items-center gap-1"
        >
          ← Back to Suppliers
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

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {canReviewSupplier && (
              <>
                <button
                  onClick={() => void handleApprove()}
                  disabled={approving || updating}
                  title={
                    !kyc_complete ? "KYC incomplete — confirm to proceed" : ""
                  }
                  className={`text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50
                    ${kyc_complete ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-500 hover:bg-amber-600"}`}
                >
                  {approving
                    ? "Approving…"
                    : kyc_complete
                      ? "Approve Supplier"
                      : "Approve Supplier ⚠"}
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={updating}
                  className="bg-white hover:bg-red-50 border border-red-300 text-red-700
                             text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                >
                  Reject
                </button>
              </>
            )}
            {(isPending || isApproved) && (
              <button
                onClick={() => setConfirmSuspend(true)}
                disabled={updating}
                className="bg-orange-50 text-orange-700 border border-orange-300 hover:bg-orange-100
                           text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                Suspend
              </button>
            )}
            {isSuspended && (
              <button
                onClick={() => setConfirmReactivate("APPROVED")}
                disabled={updating}
                className="bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100
                           text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                Reactivate → Approved
              </button>
            )}
            {isRejected && (
              <button
                onClick={() => setConfirmReactivate("PENDING_KYC")}
                disabled={updating}
                className="bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100
                           text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                Reactivate → Pending KYC
              </button>
            )}
          </div>
        </div>

        {/* Stepper — only for non-draft, non-suspended, non-rejected */}
        {["PENDING_KYC", "PENDING_APPROVAL", "APPROVED"].includes(
          supplier.status,
        ) && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
            <Stepper
              steps={ONBOARDING_STEPS}
              current={stepIndex(supplier.status)}
            />
          </div>
        )}

        {/* Status banners */}
        {supplier.status === "SUSPENDED" && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-yellow-50 text-yellow-800 border border-yellow-200">
            ⚠ This supplier is suspended. Use "Reactivate" to restore access.
          </div>
        )}
        {supplier.status === "REJECTED" && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200">
            ✕ This supplier was rejected.
            {supplier.rejection_reason && (
              <span className="ml-2 font-normal">
                Reason: {supplier.rejection_reason}
              </span>
            )}
          </div>
        )}

        {/* KYC completeness bar */}
        {kycData && (
          <div
            className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
              kyc_complete
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span>
                {kyc_complete
                  ? "✓ All required KYC documents submitted"
                  : "⚠ KYC incomplete"}
              </span>
              <span className="font-mono text-xs">
                {requiredDone}/{REQUIRED_TYPES.length} required
              </span>
            </div>
            <div className="w-full bg-white/60 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${kyc_complete ? "bg-emerald-500" : "bg-amber-400"}`}
                style={{
                  width: `${(requiredDone / REQUIRED_TYPES.length) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Supplier info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <h2 className="font-semibold text-slate-800 mb-4">
            Business Information
          </h2>
          <InfoRow label="Legal Name" value={supplier.legal_name} />
          <InfoRow label="Trade Name" value={supplier.trade_name} />
          <InfoRow label="Email" value={supplier.email} />
          <InfoRow label="Mobile" value={supplier.mobile_number} />
          <InfoRow label="Address" value={supplier.address_line1} />
          <InfoRow label="City" value={supplier.city} />
          <InfoRow label="Province" value={supplier.province} />
          <InfoRow label="Postal Code" value={supplier.postal_code} />
          <InfoRow label="Country" value={supplier.country} />
        </div>

        {/* KYC documents */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">KYC Documents</h2>
            <span className="text-xs text-slate-400">
              {kyc_documents.length} file{kyc_documents.length !== 1 ? "s" : ""}
            </span>
          </div>
          {kyc_documents.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No documents uploaded yet.
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
                        <span className="text-xs text-slate-400">
                          {doc.status === "APPROVED"
                            ? "✓ Reviewed"
                            : "✗ Reviewed"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Verification + timestamps */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <h2 className="font-semibold text-slate-800 mb-4">Verification</h2>
          <InfoRow
            label="Email Verified"
            value={supplier.is_email_verified ? "✓ Yes" : "✕ No"}
          />
          <InfoRow
            label="Mobile Verified"
            value={supplier.is_mobile_verified ? "✓ Yes" : "✕ No"}
          />
          <InfoRow label="Approved At" value={fmt(supplier.approved_at)} />
          <InfoRow label="Rejected At" value={fmt(supplier.rejected_at)} />
          {supplier.rejection_reason && (
            <InfoRow
              label="Rejection Reason"
              value={supplier.rejection_reason}
            />
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Timestamps</h2>
          <InfoRow label="Created" value={fmt(supplier.created_at)} />
          <InfoRow label="Updated" value={fmt(supplier.updated_at)} />
        </div>
      </div>
    </AppLayout>
  );
}
