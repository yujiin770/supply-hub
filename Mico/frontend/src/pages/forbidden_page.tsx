import { Link } from "react-router-dom";
import { useAuthStore } from "../auth";
import { getRoleHome } from "../auth/auth_types";

export default function ForbiddenPage() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <p className="text-7xl font-bold text-slate-200">403</p>
      <h1 className="text-xl font-semibold text-slate-700">Access denied</h1>
      <p className="text-sm text-slate-500">
        You don't have permission to view this page.
      </p>
      <Link
        to={user ? getRoleHome(user.role) : "/login"}
        className="mt-2 text-sm font-medium text-emerald-600 hover:underline"
      >
        Go to your dashboard
      </Link>
    </div>
  );
}
