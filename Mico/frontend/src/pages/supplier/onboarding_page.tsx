import { Link } from "react-router-dom";
import { SupplierStatusBadge } from "../../components/badge";
import Stepper from "../../components/stepper";
import {
  useMyKycDocs,
  useMySupplierProfile,
} from "../../features/api_clients/supplier_api";
import type { KycDocType } from "../../features/api_clients/admin_api";
import SupplierLayout from "../../layouts/supplier_layout";

const REQUIRED_TYPES: KycDocType[] = [
  "DTI_SEC",
  "BIR_COR",
  "FDA_LTO",
  "MAYORS_PERMIT",
  "VALID_ID",
];

const ONBOARDING_STEPS = [
  { label: "Account Created", description: "Signup complete" },
  { label: "KYC Submitted", description: "Required documents uploaded" },
  { label: "Approved", description: "Admin review passed" },
];

function currentStepIndex(status: string): number {
  switch (status) {
    case "PENDING_KYC":
      return 1; // step B is active
    case "PENDING_APPROVAL":
      return 2; // step C is active (waiting)
    case "APPROVED":
      return 3; // all done
    default:
      return 1;
  }
}

export default function OnboardingPage() {
  const { data: supplier, isLoading: loadingSupplier } = useMySupplierProfile();
  const { data: docsData, isLoading: loadingDocs } = useMyKycDocs();

  if (loadingSupplier || loadingDocs) {
    return (
      <SupplierLayout>
        <div className="text-center py-20 text-slate-400 text-sm">Loading…</div>
      </SupplierLayout>
    );
  }

  if (!supplier) return null;

  const docs = docsData?.items ?? [];
  const stepIdx = currentStepIndex(supplier.status);

  // Compute submitted required doc types
  const submittedTypes = new Set(
    docs.filter((d) => d.status !== "REJECTED").map((d) => d.doc_type),
  );
  const requiredDone = REQUIRED_TYPES.filter((t) =>
    submittedTypes.has(t),
  ).length;
  const requiredTotal = REQUIRED_TYPES.length;

  return (
    <SupplierLayout>
      <div className="max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Onboarding</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {supplier.legal_name}
            </p>
          </div>
          <SupplierStatusBadge status={supplier.status} />
        </div>

        {/* Stepper */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <Stepper steps={ONBOARDING_STEPS} current={stepIdx} />
        </div>

        {/* Status-specific content */}
        {supplier.status === "PENDING_KYC" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="font-semibold text-slate-800">
              Step 2: Upload KYC Documents
            </h2>
            <p className="text-sm text-slate-600">
              Upload your required verification documents to proceed to the
              admin review stage.
            </p>

            {/* Progress */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Required documents submitted</span>
                <span className="font-semibold text-slate-700">
                  {requiredDone}/{requiredTotal}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${(requiredDone / requiredTotal) * 100}%` }}
                />
              </div>
            </div>

            {requiredDone === requiredTotal ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                <p className="text-sm text-emerald-800 font-medium">
                  ✓ All required documents submitted. Awaiting admin review.
                </p>
              </div>
            ) : (
              <Link
                to="/supplier/kyc"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700
                           text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                Go to KYC Upload →
              </Link>
            )}
          </div>
        )}

        {supplier.status === "PENDING_APPROVAL" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
            <h2 className="font-semibold text-slate-800">
              Step 3: Under Admin Review
            </h2>
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <span className="text-blue-500 text-lg mt-0.5">⏳</span>
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Documents submitted — awaiting review
                </p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Our admin team is reviewing your KYC documents. This typically
                  takes 1–3 business days.
                </p>
              </div>
            </div>
            <Link
              to="/supplier/kyc"
              className="text-sm text-emerald-600 hover:underline font-medium"
            >
              View uploaded documents →
            </Link>
          </div>
        )}

        {supplier.status === "APPROVED" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
              <span className="text-emerald-600 text-2xl">🎉</span>
              <div>
                <p className="text-sm font-semibold text-emerald-900">
                  Account approved!
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Your supplier account is fully activated. You can now access
                  Catalogs and Orders.
                </p>
              </div>
            </div>
          </div>
        )}

        {supplier.status === "REJECTED" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="font-semibold text-red-700">Application Rejected</h2>
            {supplier.rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-red-700 mb-1">
                  Reason:
                </p>
                <p className="text-sm text-red-800">
                  {supplier.rejection_reason}
                </p>
              </div>
            )}
            <p className="text-sm text-slate-600">
              Please review your documents and contact support if you believe
              this was an error.
            </p>
            <div className="flex gap-3">
              <Link
                to="/supplier/kyc"
                className="inline-flex bg-red-600 hover:bg-red-700 text-white text-sm font-medium
                           px-5 py-2.5 rounded-lg transition-colors"
              >
                Review &amp; Re-submit Documents
              </Link>
            </div>
          </div>
        )}

        {supplier.status === "SUSPENDED" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
              <p className="text-sm font-semibold text-yellow-800">
                Account Suspended
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Your account has been suspended. Please contact support for
                assistance.
              </p>
            </div>
          </div>
        )}
      </div>
    </SupplierLayout>
  );
}
