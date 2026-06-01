/**
 * ApiClientsPage — Superadmin management of OAuth2 client credentials.
 *
 * Security model:
 *  - client_id is partially masked in the table
 *  - Rotating credentials requires an email OTP
 *  - Create and rotate show the plain secret once in a "save now" panel
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "../../auth";
import {
  clientCredsApi,
  type ApiClientCreate,
  type ApiClientCreatedOut,
  type ApiClientOut,
} from "../../features/api_clients/client_creds_api";
import AppLayout from "../../layouts/app_layout";
import { toast } from "../../lib/toast";
import {
  Key,
  Plus,
  Info,
  AlertTriangle,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function maskId(id: string): string {
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}••••${id.slice(-4)}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ── Credentials reveal panel ──────────────────────────────────────────────────

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">{label}</label>
      <div className="flex items-center gap-2">
        <code className="flex-1 font-mono text-xs bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 break-all font-bold text-gray-700 leading-relaxed">
          {value}
        </code>
        <button
          onClick={copy}
          className="shrink-0 text-xs font-bold px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all cursor-pointer outline-none whitespace-nowrap"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function CredentialsRevealPanel({
  data,
  onClose,
}: {
  data: ApiClientCreatedOut;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl p-8 flex flex-col gap-6 border border-gray-100 animate-fade-in">
        <div>
          <h2 className="text-xl font-bold text-[#002244]">
            {data.name} — API Credentials
          </h2>
          <div className="mt-4 p-4 bg-[#FFFBEB] border border-orange-100 rounded-2xl flex items-start gap-3.5 text-[#92400E]">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs font-semibold leading-relaxed">
              ⚠️ Save the <strong>Client Secret</strong> now — it will{" "}
              <strong>never</strong> be shown again.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <CopyRow label="Client ID" value={data.client_id} />
          <CopyRow label="Client Secret" value={data.client_secret} />
        </div>
        <div className="text-[11px] text-blue-700 font-medium bg-blue-50/40 border border-blue-100/50 rounded-2xl px-4 py-3 leading-relaxed">
          <strong>How to use:</strong> POST /auth/client-token with{" "}
          <code>client_id</code> + <code>client_secret</code> to receive a
          short-lived JWT for API calls.
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-[#004797] hover:bg-[#003570] text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-xl shadow-[#004797]/15 active:scale-[0.98] cursor-pointer outline-none border-none"
          >
            I have saved the credentials
          </button>
        </div>
      </div>
    </div>
  );
}

// ── OTP modal ─────────────────────────────────────────────────────────────────

function RotateModal({
  target,
  token,
  onClose,
  onDone,
}: {
  target: ApiClientOut;
  token: string;
  onClose: () => void;
  onDone: (result: ApiClientCreatedOut) => void;
}) {
  const [step, setStep] = useState<"confirm" | "otp">("confirm");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const otpRef = useRef<HTMLInputElement>(null);

  async function sendOtp() {
    setLoading(true);
    try {
      await clientCredsApi.requestRotateOtp(token);
      setStep("otp");
      setTimeout(() => otpRef.current?.focus(), 100);
      toast.info("OTP sent to your email.");
    } catch {
      toast.error("Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await clientCredsApi.rotate(target.id, otp, token);
      onDone(result);
    } catch {
      toast.error("Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-8 flex flex-col gap-6 border border-gray-100 animate-fade-in">
        {step === "confirm" ? (
          <>
            <div>
              <h2 className="text-xl font-bold text-[#002244]">
                Rotate credentials?
              </h2>
              <p className="mt-3 text-sm font-semibold text-gray-500 leading-relaxed">
                This will invalidate the existing <strong>client_id</strong> and{" "}
                <strong>client_secret</strong> for{" "}
                <strong>{target.name}</strong> and issue new ones. Any
                integration using the old credentials will stop working
                immediately.
              </p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-bold bg-transparent text-gray-500 hover:bg-gray-50 border border-gray-200 transition-all cursor-pointer outline-none"
              >
                Cancel
              </button>
              <button
                onClick={() => void sendOtp()}
                disabled={loading}
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-amber-500/10 active:scale-[0.98] cursor-pointer border-none outline-none disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send OTP & continue"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-bold text-[#002244]">
                Enter OTP
              </h2>
              <p className="mt-1 text-sm font-semibold text-gray-400">
                Enter the 6-digit code sent to your email.
              </p>
            </div>
            <form
              onSubmit={(e) => void submitOtp(e)}
              className="flex flex-col gap-6"
            >
              <input
                ref={otpRef}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full bg-gray-50 border border-transparent rounded-2xl px-4 py-4 text-center text-2xl font-mono font-bold tracking-[0.25em] text-[#002244] focus:bg-white focus:border-amber-500/30 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none"
              />
              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-bold bg-transparent text-gray-500 hover:bg-gray-50 border border-gray-200 transition-all cursor-pointer outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-amber-500/10 active:scale-[0.98] cursor-pointer border-none outline-none disabled:opacity-50"
                >
                  {loading ? "Rotating…" : "Rotate credentials"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ── Create modal ──────────────────────────────────────────────────────────────

function CreateModal({
  token,
  onClose,
  onCreated,
}: {
  token: string;
  onClose: () => void;
  onCreated: (result: ApiClientCreatedOut) => void;
}) {
  const [form, setForm] = useState<ApiClientCreate>({
    name: "",
    description: "",
    expires_at: null,
  });
  const [loading, setLoading] = useState(false);

  function set(field: keyof ApiClientCreate, value: string) {
    setForm((f) => ({ ...f, [field]: value || null }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await clientCredsApi.create(
        {
          name: form.name,
          description: form.description || null,
          expires_at: form.expires_at || null,
        },
        token,
      );
      onCreated(result);
    } catch {
      toast.error("Failed to create API client.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-8 flex flex-col gap-6 border border-gray-100 animate-fade-in">
        <h2 className="text-xl font-bold text-[#002244]">New API Client</h2>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-col gap-5"
        >
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">
              Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Buyer ERP Integration"
              className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:border-[#004797]/30 focus:ring-4 focus:ring-[#004797]/5 transition-all outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">
              Description
            </label>
            <textarea
              rows={2}
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Optional notes"
              className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:border-[#004797]/30 focus:ring-4 focus:ring-[#004797]/5 transition-all outline-none resize-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">
              Expiry date <span className="text-gray-400 font-normal">(leave blank = never expires)</span>
            </label>
            <input
              type="datetime-local"
              value={form.expires_at ?? ""}
              onChange={(e) =>
                set(
                  "expires_at",
                  e.target.value ? new Date(e.target.value).toISOString() : "",
                )
              }
              className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-bold text-gray-700 focus:bg-white focus:border-[#004797]/30 focus:ring-4 focus:ring-[#004797]/5 transition-all outline-none"
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-bold bg-transparent text-gray-500 hover:bg-gray-50 border border-gray-200 transition-all cursor-pointer outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.name.trim()}
              className="w-full sm:w-auto bg-[#004797] hover:bg-[#003570] disabled:bg-gray-200 cursor-pointer text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-xl shadow-[#004797]/15 active:scale-[0.98] outline-none"
            >
              {loading ? "Creating…" : "Create & reveal credentials"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ApiClientsPage() {
  const token = useAuthStore((s) => s.accessToken)!;

  const [clients, setClients] = useState<ApiClientOut[]>([]);
  const [loading, setLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [revealData, setRevealData] = useState<ApiClientCreatedOut | null>(
    null,
  );
  const [rotateTarget, setRotateTarget] = useState<ApiClientOut | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await clientCredsApi.list(token);
      setClients(data);
    } catch {
      toast.error("Failed to load API clients.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRevoke(client: ApiClientOut) {
    if (
      !confirm(
        `Revoke credentials for "${client.name}"? Integrations using it will stop working.`,
      )
    )
      return;
    try {
      const updated = await clientCredsApi.revoke(client.id, token);
      setClients((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      );
      toast.success("Credentials revoked.");
    } catch {
      toast.error("Failed to revoke.");
    }
  }

  async function handleDelete(client: ApiClientOut) {
    if (!confirm(`Permanently delete "${client.name}"? This cannot be undone.`))
      return;
    try {
      await clientCredsApi.delete(client.id, token);
      setClients((prev) => prev.filter((c) => c.id !== client.id));
      toast.success("Deleted.");
    } catch {
      toast.error("Failed to delete.");
    }
  }

  function handleCreated(result: ApiClientCreatedOut) {
    setShowCreate(false);
    setClients((prev) => [result, ...prev]);
    setRevealData(result);
  }

  function handleRotated(result: ApiClientCreatedOut) {
    setRotateTarget(null);
    setClients((prev) =>
      prev.map((c) => (c.id === result.id ? { ...result } : c)),
    );
    setRevealData(result);
  }

  return (
    <AppLayout>
      {showCreate && (
        <CreateModal
          token={token}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
      {revealData && (
        <CredentialsRevealPanel
          data={revealData}
          onClose={() => setRevealData(null)}
        />
      )}
      {rotateTarget && (
        <RotateModal
          target={rotateTarget}
          token={token}
          onClose={() => setRotateTarget(null)}
          onDone={handleRotated}
        />
      )}

      <div className="max-w-7xl mx-auto pt-4 sm:pt-6 pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 sm:mb-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100">
              <Key className="w-7 h-7 text-[#004797]" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-[#002244] tracking-tight">API Clients</h1>
              <p className="text-sm font-bold text-[#004797] mt-0.5">
                {clients.length} integrations <span className="text-gray-400">Total</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="w-full sm:w-auto bg-[#004797] hover:bg-[#003570] text-white px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/10 active:scale-[0.98] cursor-pointer border-none outline-none"
          >
            <Plus className="w-5 h-5" />
            New Client
          </button>
        </div>

        {/* How it works */}
        <div className="bg-[#FFFBEB] border border-orange-100 rounded-2xl p-5 text-[#92400E] mb-8 shadow-sm">
          <div className="flex items-center gap-2.5 mb-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <h4 className="text-sm font-bold uppercase tracking-wide">How external systems authenticate</h4>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-xs font-semibold pl-1">
            <li>
              Call{" "}
              <code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono text-amber-800">
                POST /api/v1/auth/client-token
              </code>{" "}
              with <code>client_id</code> + <code>client_secret</code>
            </li>
            <li>
              Receive a short-lived <code>access_token</code>
            </li>
            <li>
              Use <code>Authorization: Bearer &lt;token&gt;</code> header on
              orders endpoints
            </li>
          </ol>
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
              <div className="w-10 h-10 border-4 border-gray-100 border-t-[#004797] rounded-full animate-spin"></div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Syncing integrations...</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 space-y-2 text-gray-400">
              <Key className="w-12 h-12 stroke-1" />
              <p className="text-sm font-semibold text-gray-600">No API clients yet.</p>
              <p className="text-xs text-gray-400">
                Create one to issue credentials to an external system.
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
                        Client ID
                      </th>
                      <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">
                        Status
                      </th>
                      <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Expires
                      </th>
                      <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Created
                      </th>
                      <th className="px-8 py-5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {clients.map((client) => (
                      <tr
                        key={client.id}
                        className="hover:bg-gray-50/30 transition-colors group"
                      >
                        <td className="px-8 py-6">
                          <div className="font-bold text-sm text-[#002244]">
                            {client.name}
                          </div>
                          {client.description && (
                            <div className="text-xs text-gray-400 italic mt-0.5">
                              {client.description}
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-6 font-mono font-bold text-xs text-gray-400">
                          {maskId(client.client_id)}
                        </td>
                        <td className="px-8 py-6 text-center">
                          {client.is_active ? (
                            <span className="px-3 py-1 rounded-lg text-[10px] font-bold border tracking-wider uppercase inline-block bg-[#eaf7f2] text-[#00925d] border-[#c4e9db]">
                              Active
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-lg text-[10px] font-bold border tracking-wider uppercase inline-block bg-rose-50 text-rose-700 border-rose-100">
                              Revoked
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-6 font-bold text-xs text-gray-400">
                          {fmtDate(client.expires_at)}
                        </td>
                        <td className="px-8 py-6 font-bold text-xs text-gray-400">
                          {fmtDate(client.created_at)}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {client.is_active && (
                              <>
                                <button
                                  onClick={() => setRotateTarget(client)}
                                  className="px-4 py-2 rounded-xl text-[10px] font-bold bg-[#fffbeb] text-[#d97706] border border-[#fef3c7] hover:bg-[#d97706] hover:text-white transition-all cursor-pointer outline-none"
                                >
                                  Rotate
                                </button>
                                <button
                                  onClick={() => void handleRevoke(client)}
                                  className="px-4 py-2 rounded-xl text-[10px] font-bold bg-transparent border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all cursor-pointer outline-none"
                                >
                                  Revoke
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => void handleDelete(client)}
                              className="px-4 py-2 rounded-xl text-[10px] font-bold bg-rose-50 border border-rose-100 text-rose-700 hover:bg-rose-700 hover:text-white transition-all cursor-pointer outline-none"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="lg:hidden divide-y divide-gray-50">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className="p-6 space-y-5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">
                          {maskId(client.client_id)}
                        </p>
                        <h3 className="text-lg font-semibold text-[#002244] leading-tight">
                          {client.name}
                        </h3>
                        {client.description && (
                          <p className="text-xs text-gray-400 font-bold italic mt-1">
                            {client.description}
                          </p>
                        )}
                      </div>
                      {client.is_active ? (
                        <span className="px-3 py-1 rounded-lg text-[10px] font-bold border tracking-wider uppercase inline-block bg-[#eaf7f2] text-[#00925d] border-[#c4e9db]">
                          Active
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-lg text-[10px] font-bold border tracking-wider uppercase inline-block bg-rose-50 text-rose-700 border-rose-100">
                          Revoked
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 pt-4 border-t border-gray-50">
                      <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        <span>EXPIRES {fmtDate(client.expires_at)}</span>
                        <span>JOINED {fmtDate(client.created_at)}</span>
                      </div>
                      <div className="flex gap-2 pt-2 justify-end">
                        {client.is_active && (
                          <>
                            <button
                              onClick={() => setRotateTarget(client)}
                              className="px-4 py-2 rounded-xl text-[10px] font-bold bg-[#fffbeb] text-[#d97706] border border-[#fef3c7] hover:bg-[#d97706] hover:text-white transition-all cursor-pointer outline-none"
                            >
                              Rotate
                            </button>
                            <button
                              onClick={() => void handleRevoke(client)}
                              className="px-4 py-2 rounded-xl text-[10px] font-bold bg-transparent border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all cursor-pointer outline-none"
                            >
                              Revoke
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => void handleDelete(client)}
                          className="px-4 py-2 rounded-xl text-[10px] font-bold bg-rose-50 border border-rose-100 text-rose-700 hover:bg-rose-700 hover:text-white transition-all cursor-pointer outline-none"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination (Inside Card Container) */}
              <div className="px-8 py-5 bg-gray-50/40 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Showing <span className="text-gray-900">{clients.length}</span> total results
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}