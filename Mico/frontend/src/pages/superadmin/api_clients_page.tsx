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
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 font-mono text-sm bg-slate-100 rounded px-3 py-2 break-all">
          {value}
        </code>
        <button
          onClick={copy}
          className="shrink-0 text-xs px-3 py-2 rounded border border-slate-300 hover:bg-slate-50 transition-colors"
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
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl p-6 flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {data.name} — API Credentials
          </h2>
          <p className="mt-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
            ⚠️ Save the <strong>Client Secret</strong> now — it will{" "}
            <strong>never</strong> be shown again.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <CopyRow label="Client ID" value={data.client_id} />
          <CopyRow label="Client Secret" value={data.client_secret} />
        </div>
        <div className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
          <strong>How to use:</strong> POST /auth/client-token with{" "}
          <code>client_id</code> + <code>client_secret</code> to receive a
          short-lived JWT for API calls.
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
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
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl p-6 flex flex-col gap-5">
        {step === "confirm" ? (
          <>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Rotate credentials?
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                This will invalidate the existing <strong>client_id</strong> and{" "}
                <strong>client_secret</strong> for{" "}
                <strong>{target.name}</strong> and issue new ones. Any
                integration using the old credentials will stop working
                immediately.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void sendOtp()}
                disabled={loading}
                className="px-4 py-2 text-sm rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium disabled:opacity-50 transition-colors"
              >
                {loading ? "Sending…" : "Send OTP & continue"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Enter OTP
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Enter the 6-digit code sent to your email.
              </p>
            </div>
            <form
              onSubmit={(e) => void submitOtp(e)}
              className="flex flex-col gap-4"
            >
              <input
                ref={otpRef}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="border border-slate-300 rounded-lg px-3 py-2 text-center text-xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="px-4 py-2 text-sm rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium disabled:opacity-50 transition-colors"
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
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl p-6 flex flex-col gap-5">
        <h2 className="text-lg font-semibold text-slate-900">New API Client</h2>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Buyer ERP Integration"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Optional notes"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Expiry date (leave blank = never expires)
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
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.name.trim()}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 transition-colors"
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

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">API Clients</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              OAuth2 client credentials for external system integrations (e.g.
              buyer ERPs, order APIs).
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Client
          </button>
        </div>

        {/* How it works */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800 space-y-1">
          <p className="font-semibold">How external systems authenticate</p>
          <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
            <li>
              Call{" "}
              <code className="bg-blue-100 px-1 rounded">
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">
              Loading…
            </div>
          ) : clients.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-slate-500 text-sm font-medium">
                No API clients yet.
              </p>
              <p className="text-slate-400 text-xs mt-1">
                Create one to issue credentials to an external system.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Client ID
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Expires
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Created
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {client.name}
                      </div>
                      {client.description && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          {client.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {maskId(client.client_id)}
                    </td>
                    <td className="px-4 py-3">
                      {client.is_active ? (
                        <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          Revoked
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {fmtDate(client.expires_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {fmtDate(client.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {client.is_active && (
                          <>
                            <button
                              onClick={() => setRotateTarget(client)}
                              className="text-xs px-2.5 py-1 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
                            >
                              Rotate
                            </button>
                            <button
                              onClick={() => void handleRevoke(client)}
                              className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                              Revoke
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => void handleDelete(client)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
