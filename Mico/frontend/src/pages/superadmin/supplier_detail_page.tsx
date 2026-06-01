import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../../auth";
import { KycDocStatusBadge } from "../../components/badge";
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
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Clock,
  X,
  CheckCircle2,
} from "lucide-react";

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

const DataField = ({
  label,
  value,
  isRed = false,
}: {
  label: string;
  value: string | React.ReactNode;
  isRed?: boolean;
}) => (
  <div className="space-y-1.5">
    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">
      {label}
    </label>
    <div
      className={`text-sm font-semibold ${isRed ? "text-rose-500" : "text-gray-700"} flex items-center gap-1.5`}
    >
      {value || "—"}
    </div>
  </div>
);

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

// ── Reject Supplier Modal ────────────────────────────────────────────────────
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
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl w-full max-w-md p-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-1">
          Reject Supplier
        </h3>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">
          Provide a clear reason — visible to the supplier.
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Missing required documents, incorrect information…"
            required
            className="w-full rounded-xl border border-transparent bg-gray-50 px-4 py-3 text-sm font-medium focus:bg-white focus:border-rose-500/30 focus:ring-4 focus:ring-rose-500/5 transition-all outline-none resize-none"
          />
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="flex-1 bg-rose-600 disabled:opacity-50 hover:bg-rose-700 text-white text-sm font-bold py-3.5 rounded-xl transition-all cursor-pointer border-none outline-none"
            >
              {loading ? "Rejecting…" : "Reject Supplier"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-500 text-sm font-bold py-3.5 rounded-xl hover:bg-gray-50 transition-all cursor-pointer bg-transparent outline-none"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page Component ──────────────────────────────────────────────────────
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
      const kd = await adminApi.getSupplierKyc(id, token);
      setKycData(kd);
      setSupplier(kd.supplier);
    } catch {
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
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <div className="w-10 h-10 border-4 border-gray-100 border-t-[#00925d] rounded-full animate-spin"></div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Fetching Partner Detail...
          </p>
        </div>
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
        message={`Reactivate "${supplier.legal_name}"?`}
        confirmLabel="Reactivate"
        onConfirm={() => {
          if (confirmReactivate) void changeStatus(confirmReactivate);
        }}
        onCancel={() => setConfirmReactivate(null)}
      />

      <div className="max-w-7xl mx-auto pt-4 sm:pt-6 pb-24">
        {/* --- Breadcrumbs --- */}
        <nav className="flex items-center gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-6">
          <button
            type="button"
            onClick={() => navigate("/superadmin/suppliers")}
            className="hover:text-[#004797] transition-colors cursor-pointer border-none bg-transparent outline-none"
          >
            Suppliers
          </button>
          <ChevronRight className="w-3 h-3 text-black" />
          <span className="text-gray-900">Supplier Details</span>
        </nav>

        {/* --- Back Navigation --- */}
        <button
          type="button"
          onClick={() => navigate("/superadmin/suppliers")}
          className="flex items-center gap-2 text-gray-500 hover:text-[#004797] cursor-pointer font-bold text-sm mb-6 transition-colors group border-none bg-transparent outline-none"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to list
        </button>

        {/* --- Header Section (Name + Status + Action Buttons) --- */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                {supplier.legal_name}
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-bold border tracking-wider uppercase ${
                  isApproved
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                    : isSuspended || isRejected
                      ? "bg-rose-50 text-rose-600 border-rose-100"
                      : "bg-amber-50 text-amber-600 border-amber-100"
                }`}
              >
                {supplier.status.replace("_", " ")}
              </span>
            </div>
            <p className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest">
              {supplier.supplier_code}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {canReviewSupplier && (
              <>
                <button
                  onClick={() => void handleApprove()}
                  disabled={approving || updating}
                  title={
                    !kyc_complete ? "KYC incomplete — confirm to proceed" : ""
                  }
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer flex-1 sm:flex-none disabled:opacity-50 border-none outline-none text-white
                    ${kyc_complete ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20" : "bg-[#FF9900] hover:bg-[#E68A00] shadow-orange-500/20"}`}
                >
                  {approving ? (
                    "Approving…"
                  ) : kyc_complete ? (
                    "Approve Supplier"
                  ) : (
                    <>
                      Approve Supplier <AlertTriangle className="w-4 h-4" />
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={updating}
                  className="bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 px-6 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex-1 sm:flex-none disabled:opacity-50 outline-none"
                >
                  Reject
                </button>
              </>
            )}
            {(isPending || isApproved) && (
              <button
                onClick={() => setConfirmSuspend(true)}
                disabled={updating}
                className="bg-white border border-orange-200 text-orange-500 hover:bg-orange-50 px-6 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex-1 sm:flex-none disabled:opacity-50 outline-none"
              >
                Suspend
              </button>
            )}
            {isSuspended && (
              <button
                onClick={() => setConfirmReactivate("APPROVED")}
                disabled={updating}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer disabled:opacity-50 border-none outline-none"
              >
                <CheckCircle2 className="w-4 h-4" /> Reactivate Supplier
              </button>
            )}
            {isRejected && (
              <button
                onClick={() => setConfirmReactivate("PENDING_KYC")}
                disabled={updating}
                className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer disabled:opacity-50 border-none outline-none"
              >
                <CheckCircle2 className="w-4 h-4" /> Reactivate Supplier
              </button>
            )}
          </div>
        </div>

        {/* --- Onboarding Stepper --- */}
        {["PENDING_KYC", "PENDING_APPROVAL", "APPROVED"].includes(
          supplier.status,
        ) && (
          <div className="bg-white rounded-3xl border border-gray-100 p-10 shadow-sm mb-6 max-w-4xl mx-auto w-full">
            <Stepper
              steps={ONBOARDING_STEPS}
              current={stepIndex(supplier.status)}
            />
          </div>
        )}

        {/* --- Status & Alerts Banners --- */}
        <div className="space-y-4 mb-8">
          {isSuspended && (
            <div className="bg-[#FFFBEB] border border-orange-100 rounded-2xl p-4 flex items-center gap-4 text-[#92400E]">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-sm font-bold leading-relaxed">
                This supplier is suspended. Use "Reactivate" to restore access
                to the marketplace and catalog.
              </p>
            </div>
          )}
          {isRejected && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-4 text-rose-800">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
                <X className="w-5 h-5 text-rose-500" />
              </div>
              <p className="text-sm font-bold leading-relaxed">
                This supplier was rejected.
                {supplier.rejection_reason && (
                  <span className="font-normal block mt-1">
                    Reason: {supplier.rejection_reason}
                  </span>
                )}
              </p>
            </div>
          )}
          {kycData && (
            <div className="bg-[#FFFBEB] border border-orange-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#92400E]">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-bold uppercase tracking-wide">
                  {kyc_complete
                    ? "✓ All required KYC documents submitted"
                    : "KYC incomplete"}
                </p>
              </div>
              <span className="text-[11px] font-bold opacity-60">
                {requiredDone}/{REQUIRED_TYPES.length} required documents
                approved
              </span>
            </div>
          )}
        </div>

        {/* --- Detailed Data Cards --- */}
        <div className="space-y-8">
          {/* Business Details Card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 sm:px-8 sm:py-6 border-b border-gray-50 bg-gray-50/30 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">
                Business Details
              </h2>
            </div>
            <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <DataField label="Legal Name" value={supplier.legal_name} />
              <DataField label="Trade Name" value={supplier.trade_name} />
              <DataField label="Email Address" value={supplier.email} />
              <DataField label="Mobile Number" value={supplier.mobile_number} />
              <DataField
                label="Street Address"
                value={supplier.address_line1}
              />
              <DataField label="City" value={supplier.city} />
              <DataField label="Province" value={supplier.province} />
              <DataField label="Postal Code" value={supplier.postal_code} />
              <DataField label="Country" value={supplier.country} />
            </div>
          </div>

          {/* KYC Documents Card */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-gray-800">
                  KYC Documents
                </h2>
              </div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                {kyc_documents.length} files
              </span>
            </div>

            {kyc_documents.length === 0 ? (
              <div className="p-20 flex flex-col items-center justify-center text-center">
                <FileText className="w-12 h-12 text-gray-100 mb-4" />
                <p className="text-sm font-bold text-gray-400">
                  No documents uploaded yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-50">
                      <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Document Type
                      </th>
                      <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        File Name
                      </th>
                      <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Status
                      </th>
                      <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden md:table-cell">
                        Uploaded At
                      </th>
                      <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Remarks
                      </th>
                      <th className="px-8 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {kyc_documents.map((doc) => (
                      <tr
                        key={doc.id}
                        className="hover:bg-gray-50/20 transition-colors"
                      >
                        <td className="px-8 py-4 font-bold text-sm text-[#002244]">
                          {DOC_LABELS[doc.doc_type] ?? doc.doc_type}
                        </td>
                        <td className="px-8 py-4">
                          <button
                            onClick={() =>
                              setPreview({
                                url: doc.file_url,
                                filename: doc.original_filename,
                              })
                            }
                            className="text-emerald-600 hover:underline font-bold text-xs truncate max-w-48 text-left outline-none bg-transparent border-none cursor-pointer"
                          >
                            {doc.original_filename}
                          </button>
                        </td>
                        <td className="px-8 py-4">
                          <KycDocStatusBadge status={doc.status} />
                        </td>
                        <td className="px-8 py-4 font-bold text-xs text-gray-400 hidden md:table-cell">
                          {fmt(doc.uploaded_at)}
                        </td>
                        <td className="px-8 py-4 text-xs text-gray-400 italic max-w-48 truncate">
                          {doc.remarks ?? "—"}
                        </td>
                        <td className="px-8 py-4 text-right">
                          {doc.status === "SUBMITTED" ? (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => void handleInlineApprove(doc.id)}
                                disabled={inlineApprovingId === doc.id}
                                className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-[#eaf7f2] text-[#00925d] hover:bg-[#00925d] hover:text-white transition-all cursor-pointer outline-none border-none"
                              >
                                {inlineApprovingId === doc.id
                                  ? "..."
                                  : "Approve"}
                              </button>
                              <button
                                onClick={() => setInlineRejectDoc(doc)}
                                disabled={inlineApprovingId === doc.id}
                                className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all cursor-pointer outline-none border-none"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                              {doc.status === "APPROVED"
                                ? "✓ Approved"
                                : "✗ Rejected"}
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

          {/* Verification Status & Account Timestamps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Verification Status */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/30 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0" />
                <h2 className="text-base font-bold text-gray-800">
                  Verification Status
                </h2>
              </div>
              <div className="p-8 grid grid-cols-2 gap-8">
                <DataField
                  label="Email Verified"
                  value={
                    supplier.is_email_verified ? (
                      <>✓ Yes</>
                    ) : (
                      <>
                        <X className="w-3.5 h-3.5 text-rose-500 shrink-0" /> No
                      </>
                    )
                  }
                  isRed={!supplier.is_email_verified}
                />
                <DataField
                  label="Mobile Verified"
                  value={
                    supplier.is_mobile_verified ? (
                      <>✓ Yes</>
                    ) : (
                      <>
                        <X className="w-3.5 h-3.5 text-rose-500 shrink-0" /> No
                      </>
                    )
                  }
                  isRed={!supplier.is_mobile_verified}
                />
                <DataField
                  label="Approved At"
                  value={fmt(supplier.approved_at)}
                />
                <DataField
                  label="Rejected At"
                  value={fmt(supplier.rejected_at)}
                />
                {supplier.rejection_reason && (
                  <div className="col-span-2">
                    <DataField
                      label="Rejection Reason"
                      value={supplier.rejection_reason}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Account Timestamps */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/30 flex items-center gap-3">
                <Clock className="w-5 h-5 text-purple-500 shrink-0" />
                <h2 className="text-base font-bold text-gray-800">
                  Account Timestamps
                </h2>
              </div>
              <div className="p-8 grid grid-cols-1 gap-8">
                <DataField
                  label="Record Created"
                  value={fmt(supplier.created_at)}
                />
                <DataField
                  label="Last Updated"
                  value={fmt(supplier.updated_at)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
