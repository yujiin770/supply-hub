import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuthStore } from "../../auth";
import { superadminApi } from "../../features/api_clients/superadmin_api";
import AppLayout from "../../layouts/app_layout";
import { parseApiError, type FieldErrors } from "../../lib/form_errors";
import { toast } from "../../lib/toast";

const schema = z
  .object({
    legal_name: z.string().min(1, "Legal name is required"),
    trade_name: z.string().optional(),
    email: z.string().email("Invalid email"),
    mobile_number: z.string().optional(),
    address_line1: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    province: z.string().min(1, "Province is required"),
    postal_code: z.string().min(1, "Postal code is required"),
    country: z.string().min(1, "Country is required"),
    owner_full_name: z.string().min(1, "Owner name is required"),
    owner_email: z.string().email("Invalid email"),
    owner_password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((d) => d.owner_password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type FormData = z.infer<typeof schema>;

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
  name: keyof FormData;
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

const INITIAL: Record<keyof FormData, string> = {
  legal_name: "",
  trade_name: "",
  email: "",
  mobile_number: "",
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

export default function NewSupplierPage() {
  const token = useAuthStore((s) => s.accessToken)!;
  const navigate = useNavigate();
  const [form, setForm] = useState<Record<keyof FormData, string>>(INITIAL);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  function set(field: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field])
      setErrors((e) => {
        const n = { ...e };
        delete n[field];
        return n;
      });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fe: FieldErrors = {};
      for (const iss of parsed.error.issues) {
        fe[iss.path.join(".")] = iss.message;
      }
      setErrors(fe);
      return;
    }
    setLoading(true);
    try {
      const { confirm_password: _, ...body } = parsed.data;
      const res = await superadminApi.provision(body, token);
      toast.success(`Supplier ${res.supplier.supplier_code} created.`);
      navigate(`/superadmin/suppliers/${res.supplier.id}`);
    } catch (err) {
      const fe = parseApiError(err);
      if (Object.keys(fe).length) setErrors(fe);
    } finally {
      setLoading(false);
    }
  }

  const f = (field: keyof FormData) => ({
    name: field,
    value: form[field],
    onChange: (v: string) => set(field, v),
    errors,
  });

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-slate-500 hover:text-slate-700 mb-2 flex items-center gap-1"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Add Supplier</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Creates an approved supplier and its owner account in one step.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business info */}
          <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="font-semibold text-slate-800">
              Business Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field {...f("legal_name")} label="Legal Name" required />
              <Field
                {...f("trade_name")}
                label="Trade Name"
                placeholder="Optional"
              />
              <Field
                {...f("email")}
                label="Business Email"
                type="email"
                required
              />
              <Field
                {...f("mobile_number")}
                label="Mobile Number"
                placeholder="+63…"
              />
            </div>
            <Field {...f("address_line1")} label="Address" required />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field {...f("city")} label="City" required />
              <Field {...f("province")} label="Province" required />
              <Field {...f("postal_code")} label="Postal Code" required />
              <Field {...f("country")} label="Country" required />
            </div>
          </section>

          {/* Owner info */}
          <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="font-semibold text-slate-800">Owner Account</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field {...f("owner_full_name")} label="Full Name" required />
              <Field
                {...f("owner_email")}
                label="Email"
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
          </section>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60
                         text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors"
            >
              {loading ? "Creating…" : "Create Supplier"}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-slate-600 hover:text-slate-800 text-sm px-4 py-2.5 rounded-lg
                         border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
