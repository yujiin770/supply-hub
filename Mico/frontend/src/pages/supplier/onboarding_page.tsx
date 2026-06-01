import { Link } from "react-router-dom";
import { SupplierStatusBadge } from "../../components/badge";
import Stepper from "../../components/stepper";
import {
  useMyKycDocs,
  useMySupplierProfile,
} from "../../features/api_clients/supplier_api";
import type { KycDocType } from "../../features/api_clients/admin_api";
import SupplierLayout from "../../layouts/supplier_layout";
import { PartyPopper, FileText, Clock, AlertTriangle } from "lucide-react";

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
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <div className="w-10 h-10 border-4 border-gray-100 border-t-[#00925d] rounded-full animate-spin"></div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Syncing Status...
          </p>
        </div>
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
      <div className="min-h-[80vh] flex flex-col items-center justify-center py-10 px-4">
        <div className="w-full max-w-4xl mx-auto">
          {/* --- Centered Header Section --- */}
          <div className="text-center mb-12">
            <div className="inline-block mb-4">
              <SupplierStatusBadge status={supplier.status} />
            </div>
            <h1 className="text-4xl sm:text-5xl font-semibold text-gray-900 tracking-tight">
              Onboarding
            </h1>
            <p className="text-lg text-gray-400 font-bold mt-2">
              {supplier.legal_name}
            </p>
          </div>

          {/* --- Stepper Card --- */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 sm:p-12 shadow-sm mb-8 w-full">
            <Stepper steps={ONBOARDING_STEPS} current={stepIdx} />
          </div>

          {/* --- Status-Specific Card Layouts --- */}
          {supplier.status === "PENDING_KYC" && (
            <div className="w-full bg-white p-2 rounded-4xl border border-gray-100 shadow-sm animate-fade-in">
              <div className="bg-amber-50/40 border border-amber-100 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                  <FileText className="w-7 h-7 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xl font-semibold text-amber-900">
                    Step 2: Upload KYC Documents
                  </h4>
                  <p className="text-sm text-amber-700/70 font-bold mt-1 leading-relaxed">
                    Upload your required verification documents to proceed to
                    the admin review stage.
                  </p>

                  {/* Progress panel */}
                  <div className="mt-6 max-w-md mx-auto sm:mx-0">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-600 mb-1.5 uppercase tracking-wider">
                      <span>Required documents submitted</span>
                      <span>
                        {requiredDone}/{requiredTotal}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${(requiredDone / requiredTotal) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    {requiredDone === requiredTotal ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 text-emerald-800 font-bold text-sm inline-block shadow-xs">
                        ✓ All required documents submitted. Awaiting admin
                        review.
                      </div>
                    ) : (
                      <Link
                        to="/supplier/kyc"
                        className="inline-flex items-center gap-2 bg-[#00925d] hover:bg-[#007a4e] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer outline-none border-none"
                      >
                        Go to KYC Upload →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {supplier.status === "PENDING_APPROVAL" && (
            <div className="w-full bg-white p-2 rounded-4xl border border-gray-100 shadow-sm animate-fade-in">
              <div className="bg-blue-50/40 border border-blue-100 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                  <Clock className="w-7 h-7 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xl font-semibold text-blue-900">
                    Step 3: Under Admin Review
                  </h4>
                  <p className="text-sm text-blue-700/70 font-bold mt-1 leading-relaxed">
                    Our admin team is reviewing your KYC documents. This
                    typically takes 1–3 business days.
                  </p>
                  <div className="mt-6">
                    <Link
                      to="/supplier/kyc"
                      className="text-sm text-emerald-600 hover:underline font-bold"
                    >
                      View uploaded documents →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {supplier.status === "APPROVED" && (
            <div className="w-full bg-white p-2 rounded-4xl border border-gray-100 shadow-sm animate-fade-in">
              <div className="bg-emerald-50/40 border border-emerald-100 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                  <PartyPopper className="w-7 h-7 text-emerald-500" />
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-emerald-900">
                    Account approved!
                  </h4>
                  <p className="text-sm text-emerald-700/70 font-bold mt-1 leading-relaxed">
                    Your supplier account is fully activated. You can now access
                    Catalogs and start managing your Orders.
                  </p>
                </div>
              </div>
            </div>
          )}

          {supplier.status === "REJECTED" && (
            <div className="w-full bg-white p-2 rounded-4xl border border-gray-100 shadow-sm animate-fade-in">
              <div className="bg-rose-50/40 border border-rose-100 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                  <span className="text-rose-500 text-3xl font-bold shrink-0 select-none">
                    ✕
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xl font-semibold text-rose-900">
                    Application Rejected
                  </h4>
                  {supplier.rejection_reason && (
                    <div className="mt-4 p-4 bg-white border border-rose-100 rounded-2xl text-left">
                      <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-1">
                        Reason:
                      </p>
                      <p className="text-sm font-semibold text-rose-800">
                        {supplier.rejection_reason}
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-rose-700/70 font-bold mt-3 leading-relaxed">
                    Please review your documents and contact support if you
                    believe this was an error.
                  </p>
                  <div className="mt-6">
                    <Link
                      to="/supplier/kyc"
                      className="inline-flex bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors shadow-md active:scale-95 border-none outline-none cursor-pointer"
                    >
                      Review &amp; Re-submit Documents
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {supplier.status === "SUSPENDED" && (
            <div className="w-full bg-white p-2 rounded-4xl border border-gray-100 shadow-sm animate-fade-in">
              <div className="bg-[#FFFBEB] border border-orange-100 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                  <AlertTriangle className="w-7 h-7 text-amber-500" />
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-amber-900">
                    Account Suspended
                  </h4>
                  <p className="text-sm text-amber-700/70 font-bold mt-1 leading-relaxed">
                    Your account has been suspended. Please contact support for
                    assistance.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SupplierLayout>
  );
}
