import { Link } from "react-router-dom";

const STEPS = [
  {
    num: "1",
    title: "Submit your application",
    desc: "Your company profile has been received.",
    done: true,
  },
  {
    num: "2",
    title: "Upload KYC documents",
    desc: "Log in and upload required verification documents (DTI/SEC, BIR, FDA LTO, Mayor's Permit, etc.).",
    done: false,
  },
  {
    num: "3",
    title: "Admin review & approval",
    desc: "Our team will review your profile and documents. You'll receive an email once approved.",
    done: false,
  },
];

export default function SignupSubmittedPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        {/* Success icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
          Application Submitted!
        </h1>
        <p className="text-slate-500 text-sm text-center mb-8">
          Your supplier application has been received. Here's what happens next:
        </p>

        {/* Steps */}
        <ol className="space-y-4 mb-8">
          {STEPS.map((s, i) => (
            <li key={i} className="flex gap-4">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5
                  ${s.done ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`}
              >
                {s.done ? (
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  s.num
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {s.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
          <p className="text-xs text-amber-800">
            <strong>Note:</strong> Your account will be inactive until an admin
            approves your application. You can log in immediately to upload your
            KYC documents.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/login"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium
                       py-2.5 rounded-lg transition-colors text-center"
          >
            Go to Login
          </Link>
          <Link
            to="/"
            className="flex-1 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm
                       font-medium py-2.5 rounded-lg transition-colors text-center"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
