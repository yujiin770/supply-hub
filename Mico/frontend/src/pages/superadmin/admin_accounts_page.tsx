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
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-6">
      <h2 className="text-base font-semibold text-slate-900 mb-1">
        Invite Admin Account
      </h2>
      <p className="text-sm text-slate-500 mb-4">
        An activation email will be sent so the new admin can set their own
        password.
      </p>
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {/* Full name */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Full Name
          </label>
          <input
            type="text"
            value={form.full_name}
            onChange={(e) => change("full_name", e.target.value)}
            placeholder="Juan dela Cruz"
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none
                        focus:ring-2 focus:ring-emerald-500 ${
                          errors.full_name
                            ? "border-red-400"
                            : "border-slate-300"
                        }`}
          />
          {errors.full_name && (
            <p className="text-xs text-red-500 mt-1">{errors.full_name}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => change("email", e.target.value)}
            placeholder="admin@example.com"
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none
                        focus:ring-2 focus:ring-emerald-500 ${
                          errors.email ? "border-red-400" : "border-slate-300"
                        }`}
          />
          {errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email}</p>
          )}
        </div>

        {/* Info banner */}
        <div className="sm:col-span-2 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <svg
            className="w-4 h-4 text-blue-500 mt-0.5 shrink-0"
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
          <p className="text-xs text-blue-800">
            An activation email with a secure link will be sent to the address
            above. The new admin must click it to set their password before they
            can log in. Admins can manage suppliers and review KYC, but cannot
            create new admin accounts.
          </p>
        </div>

        {/* Actions */}
        <div className="sm:col-span-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="text-sm text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg
                       border border-slate-300 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium
                       px-5 py-2 rounded-lg transition-colors disabled:opacity-50
                       disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && (
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            )}
            {saving ? "Sending Invitation…" : "Send Invitation"}
          </button>
        </div>
      </form>
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
  const currentPage = Math.floor(skip / PAGE_SIZE) + 1;

  return (
    <AppLayout>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5 text-white"
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
            <h1 className="text-2xl font-bold text-slate-900">
              Admin Accounts
            </h1>
            <p className="text-sm text-slate-500">
              {total > 0
                ? `${total} admin${total !== 1 ? "s" : ""} total`
                : "No admins yet"}
            </p>
          </div>
        </div>
        {!formOpen && (
          <button
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700
                       text-white text-sm font-medium px-4 py-2.5 rounded-lg
                       transition-colors shadow-sm"
          >
            <span className="text-base leading-none">+</span>
            New Admin Account
          </button>
        )}
      </div>

      {/* Create form */}
      {formOpen && (
        <CreateAdminForm
          onCreated={() => {
            setSkip(0);
            void load();
          }}
          onClose={() => setFormOpen(false)}
        />
      )}

      {/* Search filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
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
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
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
              className="text-sm text-slate-500 hover:text-red-600 transition-colors px-2"
            >
              ✕ Clear
            </button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <svg
              className="w-8 h-8 animate-spin text-purple-500"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span className="text-sm">Loading admin accounts…</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <svg
              className="w-12 h-12 text-slate-300"
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
            <p className="text-sm font-medium">No admin accounts found.</p>
            <p className="text-xs">Create the first one above.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
                  Name
                </th>
                <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
                  Email
                </th>
                <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide hidden sm:table-cell">
                  Status
                </th>
                <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide hidden lg:table-cell">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((admin) => (
                <tr
                  key={admin.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-purple-50/40 transition-colors"
                >
                  <td className="px-4 py-3.5 font-semibold text-slate-900">
                    {admin.full_name}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{admin.email}</td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    {admin.is_active ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 text-xs hidden lg:table-cell">
                    {fmt(admin.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
          <span className="text-slate-500">
            Page{" "}
            <span className="font-semibold text-slate-800">{currentPage}</span>{" "}
            of <span className="font-semibold text-slate-800">{pages}</span>
          </span>
          <div className="flex gap-2">
            <button
              disabled={skip === 0}
              onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300
                         hover:bg-slate-50 text-sm font-medium transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              disabled={skip + PAGE_SIZE >= total}
              onClick={() => setSkip(skip + PAGE_SIZE)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300
                         hover:bg-slate-50 text-sm font-medium transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
