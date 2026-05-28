import { Link } from "react-router-dom";
import { useAuthStore } from "../auth";
import { getRoleHome } from "../auth/auth_types";

export default function NotFoundPage() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <p className="text-7xl font-bold text-slate-200">404</p>
      <h1 className="text-xl font-semibold text-slate-700">Page not found</h1>
      <p className="text-sm text-slate-500">
        The page you're looking for doesn't exist.
      </p>
      <Link
        to={user ? getRoleHome(user.role) : "/login"}
        className="mt-2 text-sm font-medium text-emerald-600 hover:underline"
      >
        Go home
      </Link>
    </div>
  );
}
