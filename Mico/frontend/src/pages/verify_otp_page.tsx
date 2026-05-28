import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../auth";
import { getRoleHome } from "../auth/auth_types";
import { ApiError } from "../lib/api";

const OTP_LENGTH = 6;

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const mfaToken = useAuthStore((s) => s.mfaToken);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect back if mfa_token is gone (e.g. hard refresh)
  if (!mfaToken) {
    navigate("/login", { replace: true });
    return null;
  }

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    const next = [...digits];
    pasted.split("").forEach((ch, i) => {
      next[i] = ch;
    });
    setDigits(next);
    inputs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const otp = digits.join("");
    if (otp.length < OTP_LENGTH) {
      setError("Please enter all 6 digits.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await verifyOtp(otp);
      const freshUser = useAuthStore.getState().user;
      const isInactiveSupplier =
        freshUser &&
        !freshUser.is_active &&
        (freshUser.role === "SUPPLIER_OWNER" ||
          freshUser.role === "SUPPLIER_STAFF");

      // Active supplier owners go to the syncing page first (staff skip sync)
      if (
        freshUser &&
        freshUser.role === "SUPPLIER_OWNER" &&
        !isInactiveSupplier
      ) {
        navigate("/syncing", { replace: true });
        return;
      }

      const dest = freshUser
        ? isInactiveSupplier
          ? "/supplier/onboarding"
          : getRoleHome(freshUser.role)
        : "/";
      navigate(dest, { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Invalid or expired OTP.",
      );
      setDigits(Array(OTP_LENGTH).fill(""));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            Check your email
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            We sent a 6-digit code to your registered email address. Enter it
            below to complete sign-in.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={loading}
                className="w-11 h-12 text-center text-xl font-bold border border-slate-300
                           rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500
                           focus:border-transparent disabled:bg-slate-50"
              />
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium
                       rounded-lg py-2 text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying…" : "Verify code"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mt-3 w-full text-sm text-slate-500 hover:text-slate-700 text-center"
          >
            ← Back to login
          </button>
        </form>
      </div>
    </div>
  );
}
