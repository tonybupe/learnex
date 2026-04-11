import { Link } from "react-router-dom";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Register</h1>
        <p className="mt-2 text-sm text-slate-600">
          Registration page comes next after login flow is complete.
        </p>
        <Link to="/auth/login" className="mt-6 inline-block text-sm font-semibold text-slate-900">
          Back to login
        </Link>
      </div>
    </div>
  );
}