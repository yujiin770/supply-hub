import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import {
  onboardingApi,
  type SignupRequest,
} from "../features/api_clients/onboarding_api";
import { parseApiError, type FieldErrors } from "../lib/form_errors";

// ── Schemas ───────────────────────────────────────────────────────────────────
const step1Schema = z.object({
  legal_name: z.string().min(1, "Legal name is required"),
  trade_name: z.string().optional(),
  business_email: z.string().email("Invalid business email"),
  business_mobile: z.string().optional(),
  address_line1: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  province: z.string().min(1, "Province is required"),
  postal_code: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
});

const step2Schema = z
  .object({
    owner_full_name: z.string().min(1, "Full name is required"),
    owner_email: z.string().email("Invalid email"),
    owner_password: z.string().min(8, "Minimum 8 characters"),
    confirm_password: z.string(),
  })
  .refine((d) => d.owner_password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;

interface FormState {
  legal_name: string;
  trade_name: string;
  business_email: string;
  business_mobile: string;
  address_line1: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  owner_full_name: string;
  owner_email: string;
  owner_password: string;
  confirm_password: string;
}

const INITIAL: FormState = {
  legal_name: "",
  trade_name: "",
  business_email: "",
  business_mobile: "",
  address_line1: "",
  city: "",
  province: "",
  postal_code: "",
  country: "Philippines",
  owner_full_name: "",
  owner_email: "",
  owner_password: "",
  confirm_password: "",
};

// ── Shared field component ────────────────────────────────────────────────────
function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
  errors,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  errors: FieldErrors;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none
                    focus:ring-2 focus:ring-emerald-500 ${
                      errors[name]
                        ? "border-red-400 bg-red-50"
                        : "border-slate-300"
                    }`}
      />
      {errors[name] && (
        <p className="mt-1 text-xs text-red-600">{errors[name]}</p>
      )}
    </div>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({
  current,
  steps,
}: {
  current: number;
  steps: string[];
}) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${
                i < current
                  ? "bg-emerald-600 text-white"
                  : i === current
                    ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                    : "bg-slate-200 text-slate-500"
              }`}
            >
              {i < current ? "✓" : i + 1}
            </div>
            <span
              className={`text-xs font-medium hidden sm:inline ${
                i <= current ? "text-slate-900" : "text-slate-400"
              }`}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 ${i < current ? "bg-emerald-500" : "bg-slate-200"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SignupPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ supplier_code: string } | null>(
    null,
  );

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field])
      setErrors((e) => {
        const n = { ...e };
        delete n[field];
        return n;
      });
  }

  const f = (name: keyof FormState) => ({
    name,
    value: form[name],
    onChange: (v: string) => set(name, v),
    errors,
  });

  function validateStep(n: number): boolean {
    const schema = n === 0 ? step1Schema : step2Schema;
    const data =
      n === 0
        ? ({ ...form } as Step1)
        : ({
            owner_full_name: form.owner_full_name,
            owner_email: form.owner_email,
            owner_password: form.owner_password,
            confirm_password: form.confirm_password,
          } as Step2);
    const result = (schema as z.ZodType).safeParse(data);
    if (!result.success) {
      const fe: FieldErrors = {};
      for (const iss of result.error.issues)
        fe[iss.path.join(".")] = iss.message;
      setErrors(fe);
      return false;
    }
    setErrors({});
    return true;
  }

  function next() {
    if (validateStep(step)) setStep((s) => s + 1);
  }

  async function handleSubmit() {
    if (!validateStep(1)) return;
    setLoading(true);
    try {
      const { confirm_password: _, ...body } = form;
      const res = await onboardingApi.signup(body as SignupRequest);
      setSuccess({ supplier_code: res.supplier_code });
    } catch (err) {
      const fe = parseApiError(err);
      if (Object.keys(fe).length) {
        // If field errors, go back to step where they might be
        setErrors(fe);
        setStep(0);
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Success state ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            Signup Submitted!
          </h1>
          <p className="text-slate-500 text-sm mb-1">
            Your application{" "}
            <span className="font-mono font-semibold text-slate-700">
              {success.supplier_code}
            </span>{" "}
            is under review.
          </p>
          <p className="text-slate-400 text-sm mb-6">
            Our team will verify your documents. You'll receive a notification
            once approved.
          </p>
          <Link
            to="/login"
            className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white
                       font-medium text-sm py-2.5 rounded-lg transition-colors text-center"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const STEPS = ["Business Info", "Owner Info", "Review"];

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">SupplyHub</h1>
          <p className="text-slate-500 text-sm mt-1">Supplier Registration</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <StepIndicator current={step} steps={STEPS} />

          {/* Step 0 — Business Info */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field {...f("legal_name")} label="Legal Name" required />
                <Field
                  {...f("trade_name")}
                  label="Trade Name"
                  placeholder="Optional"
                />
                <Field
                  {...f("business_email")}
                  label="Business Email"
                  type="email"
                  required
                />
                <Field
                  {...f("business_mobile")}
                  label="Mobile"
                  placeholder="+63…"
                />
              </div>
              <Field {...f("address_line1")} label="Address" required />
              <div className="grid grid-cols-2 gap-4">
                <Field {...f("city")} label="City" required />
                <Field {...f("province")} label="Province" required />
                <Field {...f("postal_code")} label="Postal Code" required />
                <Field {...f("country")} label="Country" required />
              </div>
            </div>
          )}

          {/* Step 1 — Owner Info */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 -mt-2 mb-4">
                This account will be used to log in and manage your KYC
                documents.
              </p>
              <Field {...f("owner_full_name")} label="Full Name" required />
              <Field
                {...f("owner_email")}
                label="Login Email"
                type="email"
                required
              />
              <Field
                {...f("owner_password")}
                label="Password"
                type="password"
                required
              />
              <Field
                {...f("confirm_password")}
                label="Confirm Password"
                type="password"
                required
              />
            </div>
          )}

          {/* Step 2 — Review */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-2">
                <p className="font-semibold text-slate-700 mb-2">Business</p>
                <div className="grid grid-cols-2 gap-y-1 text-slate-600">
                  <span className="text-slate-400">Legal Name</span>
                  <span>{form.legal_name}</span>
                  {form.trade_name && (
                    <>
                      <span className="text-slate-400">Trade Name</span>
                      <span>{form.trade_name}</span>
                    </>
                  )}
                  <span className="text-slate-400">Email</span>
                  <span>{form.business_email}</span>
                  {form.business_mobile && (
                    <>
                      <span className="text-slate-400">Mobile</span>
                      <span>{form.business_mobile}</span>
                    </>
                  )}
                  <span className="text-slate-400">Address</span>
                  <span>
                    {form.address_line1}, {form.city}, {form.province}{" "}
                    {form.postal_code}
                  </span>
                </div>
                <p className="font-semibold text-slate-700 mt-4 mb-2">
                  Owner Account
                </p>
                <div className="grid grid-cols-2 gap-y-1 text-slate-600">
                  <span className="text-slate-400">Name</span>
                  <span>{form.owner_full_name}</span>
                  <span className="text-slate-400">Email</span>
                  <span>{form.owner_email}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center">
                By submitting, you agree to provide accurate business
                information.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={() => (step === 0 ? undefined : setStep((s) => s - 1))}
              disabled={step === 0}
              className="text-sm text-slate-600 hover:text-slate-900 disabled:opacity-30 px-4 py-2"
            >
              ← Back
            </button>
            {step < 2 ? (
              <button
                type="button"
                onClick={next}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium
                           text-sm px-6 py-2.5 rounded-lg transition-colors"
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60
                           text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors"
              >
                {loading ? "Submitting…" : "Submit Application"}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-emerald-600 hover:underline font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
