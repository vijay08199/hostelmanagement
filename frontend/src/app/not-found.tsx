import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <span className="text-4xl font-extrabold text-indigo-600">404</span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Page Not Found</h1>
        <p className="mt-2 text-sm text-slate-500">
          The page or resource you are looking for does not exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

