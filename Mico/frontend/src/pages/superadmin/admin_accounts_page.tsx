import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "../../auth";
import {
  superadminApi,
  type AdminUserResponse,
} from "../../features/api_clients/superadmin_api";
import AppLayout from "../../layouts/app_layout";
import { toast } from "../../lib/toast";

const PAGE_SIZE = 20;

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ── Create Admin form ─────────────────────────────────────────────────────────

interface FormState {
  full_name: string;
  email: string;
}

function CreateAdminForm({
  onCreated,
  onClose,
}: {
  onCreated: () => void;
  onClose: () => void;
}) {
  const token = useAuthStore((s) => s.accessToken)!;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    full_name: "",
    email: "",
  });
  const [errors, setErrors] = useState<Partial<FormState>>({});

  function validate(): boolean {
    const e: Partial<FormState> = {};
    if (!form.full_name.trim()) e.full_name = "Full name is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Invalid email address.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function change(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await superadminApi.createAdmin(
        { full_name: form.full_name, email: form.email },
        token,
      );
      toast.success(
        `Invitation sent to ${form.email}. They will receive an email to activate their account.`,
      );
      setForm({ full_name: "", email: "" });
      onClose();
      onCreated();
    } catch (err: unknown) {
      const detail = (err as { detail?: unknown | string } | null)?.detail;
      if (Array.isArray(detail)) {
        const fe: Partial<FormState> = {};
        for (const d of detail as { field: string; message: string }[]) {
          fe[d.field as keyof FormState] = d.message;
        }
        setErrors(fe);
      } else {
        toast.error(
          typeof detail === "string"
            ? detail
            : "Failed to create admin account.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setForm({ full_name: "", email: "" });
    setErrors({});
    onClose();
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-8">
      {/* Header Panel */}
      <div className="px-6 py-4 sm:px-8 sm:py-6 border-b border-gray-50 bg-gray-50/30 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
        </div>
        <h2 className="text-base sm:text-lg font-bold text-gray-800">
          Invite Admin Account
        </h2>
      </div>

      {/* Form Content */}
      <div className="p-6 sm:p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Full name */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => change("full_name", e.target.value)}
                placeholder="Juan dela Cruz"
                className={`w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:border-purple-500/30 focus:ring-4 focus:ring-purple-500/5 transition-all outline-none ${
                  errors.full_name
                    ? "border-rose-400 bg-rose-50/50 focus:border-rose-500 focus:ring-rose-500/10"
                    : ""
                }`}
              />
              {errors.full_name && (
                <p className="text-xs text-rose-600 font-medium mt-1">
                  {errors.full_name}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => change("email", e.target.value)}
                  placeholder="admin@example.com"
                  className={`w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:border-purple-500/30 focus:ring-4 focus:ring-purple-500/5 transition-all outline-none ${
                    errors.email
                      ? "border-rose-400 bg-rose-50/50 focus:border-rose-500 focus:ring-rose-500/10"
                      : ""
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-rose-600 font-medium mt-1">
                  {errors.email}
                </p>
              )}
            </div>
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-3.5 p-4 bg-purple-50/40 rounded-xl border border-purple-100/50">
            <svg
              className="w-4 h-4 text-purple-500 mt-0.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <p className="text-[12px] text-purple-700 leading-relaxed font-medium">
              An activation email with a secure link will be sent to the address
              above. The new admin must click it to set their password before
              they can log in. Admins can manage suppliers and review KYC, but
              cannot create new admin accounts.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-gray-50">
            <button
              type="button"
              onClick={handleCancel}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-bold bg-transparent text-gray-500 hover:bg-gray-50 border border-gray-200 transition-all cursor-pointer outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-purple-600/10 active:scale-[0.98] cursor-pointer border-none outline-none disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
              )}
              {saving ? "Sending Invitation…" : "Send Invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminAccountsPage() {
  const token = useAuthStore((s) => s.accessToken)!;

  const [formOpen, setFormOpen] = useState(false);
  const [items, setItems] = useState<AdminUserResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [q, setQ] = useState("");
  const [draftQ, setDraftQ] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await superadminApi.listAdmins(
        { skip, limit: PAGE_SIZE, q: q || undefined },
        token,
      );
      setItems(res.items);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load admin accounts.");
    } finally {
      setLoading(false);
    }
  }, [skip, q, token]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSkip(0);
    setQ(draftQ);
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));


  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto pt-4 sm:pt-6 pb-20">
        {/* --- HERO SECTION --- */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 sm:mb-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100">
              <svg
                className="w-7 h-7 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-[#002244] tracking-tight">
                Admin Accounts
              </h1>
              <p className="text-sm font-bold text-purple-600 mt-0.5">
                {total} Admins <span className="text-gray-400">Total</span>
              </p>
            </div>
          </div>
          {!formOpen && (
            <button
              onClick={() => setFormOpen(true)}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-600/10 active:scale-[0.98] cursor-pointer border-none outline-none"
            >
              <span className="text-base leading-none font-bold">+</span>
              New Admin Account
            </button>
          )}
        </div>

        {/* --- CREATE FORM ELEMENT --- */}
        {formOpen && (
          <CreateAdminForm
            onCreated={() => {
              setSkip(0);
              void load();
            }}
            onClose={() => setFormOpen(false)}
          />
        )}

        {/* --- SEARCH FILTER BAR --- */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <form
            onSubmit={handleSearch}
            className="flex-1 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm flex items-center min-w-0"
          >
            <div className="relative flex-1 min-w-0">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search by name or email…"
                value={draftQ}
                onChange={(e) => setDraftQ(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-transparent border-none text-sm font-bold text-gray-700 placeholder:text-gray-400 outline-none"
              />
            </div>
            <button
              type="submit"
              className="bg-[#111827] text-white px-5 sm:px-8 py-3 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all shrink-0 cursor-pointer border-none"
            >
              Search
            </button>
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setDraftQ("");
                  setSkip(0);
                }}
                className="text-xs font-bold text-gray-400 hover:text-rose-600 transition-colors px-3 shrink-0 border-none bg-transparent outline-none cursor-pointer"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* --- CONTENT TABLE CONTAINER --- */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
              <div className="w-10 h-10 border-4 border-gray-100 border-t-purple-600 rounded-full animate-spin"></div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Syncing Admins...
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 space-y-2 text-gray-400">
              <svg
                className="w-12 h-12 stroke-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <p className="text-sm font-semibold text-gray-600">
                No admin accounts found.
              </p>
              <p className="text-xs text-gray-400">
                Create the first one above.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-50">
                      <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Name
                      </th>
                      <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Email
                      </th>
                      <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">
                        Status
                      </th>
                      <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((admin) => (
                      <tr
                        key={admin.id}
                        className="hover:bg-gray-50/30 transition-colors"
                      >
                        <td className="px-8 py-6 font-bold text-sm text-[#002244]">
                          {admin.full_name}
                        </td>
                        <td className="px-8 py-6 font-bold text-sm text-gray-400">
                          {admin.email}
                        </td>
                        <td className="px-8 py-6 text-center">
                          {admin.is_active ? (
                            <span className="px-3 py-1 rounded-lg text-[10px] font-bold border tracking-wider uppercase inline-block bg-[#eaf7f2] text-[#00925d] border-[#c4e9db]">
                              Active
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-lg text-[10px] font-bold border tracking-wider uppercase inline-block bg-gray-100 text-gray-600 border-gray-200">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-6 font-bold text-xs text-gray-400">
                          {fmt(admin.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="lg:hidden divide-y divide-gray-50">
                {items.map((admin) => (
                  <div
                    key={admin.id}
                    className="p-6 space-y-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-bold text-[#002244] leading-tight">
                          {admin.full_name}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                          {admin.email}
                        </p>
                      </div>
                      {admin.is_active ? (
                        <span className="px-3 py-1 rounded-lg text-[10px] font-bold border tracking-wider uppercase inline-block bg-[#eaf7f2] text-[#00925d] border-[#c4e9db]">
                          Active
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-lg text-[10px] font-bold border tracking-wider uppercase inline-block bg-gray-100 text-gray-600 border-gray-200">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pt-2 border-t border-gray-50">
                      Created {fmt(admin.created_at)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Row Inside Container */}
              <div className="px-8 py-5 bg-gray-50/40 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Showing <span className="text-gray-900">{items.length}</span>{" "}
                  of <span className="text-gray-900">{total}</span> total
                  results
                </p>
                {pages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      disabled={skip === 0}
                      onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-white text-[10px] font-bold transition-all disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                    >
                      PREV
                    </button>
                    <button
                      disabled={skip + PAGE_SIZE >= total}
                      onClick={() => setSkip(skip + PAGE_SIZE)}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-white text-[10px] font-bold transition-all disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                    >
                      NEXT
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
