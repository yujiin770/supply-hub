import { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "../auth/auth_service";
import { ApiError } from "../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "An error occurred. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">SupplyHub</h1>
          <p className="mt-1 text-sm text-slate-500">Reset your password</p>
        </div>

        {submitted ? (
          <div className="text-center space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800">
              If that email is registered, a password reset link has been sent.
              Please check your inbox.
            </div>
            <Link
              to="/login"
              className="block text-sm text-emerald-600 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-slate-600">
              Enter your email address and we'll send you a link to reset your
              password.
            </p>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                           disabled:bg-slate-50"
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium
                         rounded-lg py-2 text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-slate-500 hover:text-slate-700 hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
