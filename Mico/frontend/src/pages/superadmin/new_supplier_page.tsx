import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuthStore } from "../../auth";
import { superadminApi } from "../../features/api_clients/superadmin_api";
import AppLayout from "../../layouts/app_layout";
import { parseApiError, type FieldErrors } from "../../lib/form_errors";
import { toast } from "../../lib/toast";
import {
  ArrowLeft,
  Building2,
  User,
  ChevronDown,
  Info,
  CheckCircle2,
  Globe,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
} from "lucide-react";

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

interface InputFieldProps {
  label: string;
  name: keyof FormData;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  errors: FieldErrors;
  required?: boolean;
  placeholder?: string;
  icon?: React.ReactNode;
}

function InputField({
  label,
  name,
  type = "text",
  value,
  onChange,
  errors,
  required,
  placeholder,
  icon,
}: InputFieldProps) {
  const hasError = !!errors[name];
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none
            ${icon ? "pl-11" : ""}
            ${hasError ? "border-rose-400 bg-rose-50/50 focus:border-rose-500 focus:ring-rose-500/10" : ""}`}
        />
      </div>
      {errors[name] && (
        <p className="mt-1 text-xs text-rose-600 font-medium">
          {errors[name]}
        </p>
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
      <div className="max-w-7xl mx-auto pt-4 sm:pt-6 pb-24">
        
        {/* --- New Breadcrumb Indicator --- */}
        <nav className="flex items-center gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="hover:text-[#004797] transition-colors cursor-pointer border-none bg-transparent outline-none"
          >
            Suppliers
          </button>
          <ChevronRight className="w-3 h-3 text-gray-300" />
          <span className="text-gray-900">Add Supplier</span>
        </nav>

        {/* --- Back Navigation --- */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-[#004797] cursor-pointer font-bold text-sm mb-6 transition-colors group border-none bg-transparent outline-none"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to list
        </button>

        {/* --- Header --- */}
        <div className="mb-8 sm:mb-10 text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Add Supplier
          </h1>
          <p className="text-sm sm:text-base text-gray-500 font-medium mt-2">
            Register a new partner and generate their admin credentials in one step.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          
          {/* --- Section 1: Business Details --- */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 sm:px-8 sm:py-6 border-b border-gray-50 bg-gray-50/30 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-gray-800">
                Business Details
              </h2>
            </div>

            <div className="p-6 sm:p-8 space-y-5 sm:space-y-6">
              {/* Names */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputField {...f("legal_name")} label="Legal Name" required placeholder="Official Registered Name" />
                <InputField {...f("trade_name")} label="Trade Name" placeholder="Optional" />
              </div>

              {/* Contacts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputField
                  {...f("email")}
                  label="Business Email"
                  type="email"
                  required
                  placeholder="billing@company.com"
                  icon={<Mail className="w-4 h-4" />}
                />
                <InputField
                  {...f("mobile_number")}
                  label="Mobile Number"
                  placeholder="+63 900 000 0000"
                  icon={<Phone className="w-4 h-4" />}
                />
              </div>

              {/* Address */}
              <InputField
                {...f("address_line1")}
                label="Address"
                required
                placeholder="Street name, Building, Unit Number"
                icon={<MapPin className="w-4 h-4" />}
              />

              {/* Locale Grid */}
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-4">
                <InputField {...f("city")} label="City" required />
                <InputField {...f("province")} label="Province" required />
                <InputField {...f("postal_code")} label="Postal Code" required />
                
                {/* Custom Country Dropdown */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Country <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      value={form.country}
                      onChange={(e) => set("country", e.target.value)}
                      className={`w-full appearance-none pl-10 pr-10 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-bold text-gray-700 cursor-pointer focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 outline-none
                        ${errors.country ? "border-rose-400 bg-rose-50/50" : ""}`}
                    >
                      <option value="Philippines">Philippines</option>
                      <option value="Singapore">Singapore</option>
                      <option value="United States">United States</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  {errors.country && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">
                      {errors.country}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* --- Section 2: Owner Account --- */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 sm:px-8 sm:py-6 border-b border-gray-50 bg-gray-50/30 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-gray-800">
                Admin Account
              </h2>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex items-start gap-3 p-4 bg-blue-50/40 rounded-xl border border-blue-100/50">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[12px] text-blue-700 leading-relaxed font-medium">
                  This user will be the primary administrator. They will receive an automated email to set up their multi-factor authentication.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputField {...f("owner_full_name")} label="Full Admin Name" required placeholder="First and Last Name" />
                <InputField {...f("owner_email")} label="Login Email" required type="email" placeholder="admin@supplier-portal.com" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputField {...f("owner_password")} label="Initial Password" required type="password" placeholder="••••••••" />
                <InputField {...f("confirm_password")} label="Verify Password" required type="password" placeholder="••••••••" />
              </div>
            </div>
          </div>

          {/* --- Form Actions --- */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="group w-full sm:w-auto px-10 py-3.5 rounded-xl text-sm font-bold cursor-pointer bg-rose-600 text-white hover:bg-rose-700 hover:border-rose-200 border border-transparent transition-all flex items-center justify-center gap-3 outline-none"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-[#004797] hover:bg-[#003570] disabled:bg-gray-200 cursor-pointer text-white px-12 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-[#004797]/20 active:scale-[0.98] outline-none"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              {loading ? "Onboarding..." : "Create Supplier"}
            </button>
          </div>

        </form>
      </div>
    </AppLayout>
  );
}