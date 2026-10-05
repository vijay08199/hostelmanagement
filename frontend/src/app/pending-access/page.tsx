"use client";

import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";

export default function PendingAccess() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-4 border border-amber-100">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Application Access Pending</h1>
        <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
          Your account is authenticated via Clerk, but an administrator has not provisioned an application role (Admin, Warden, or Student) for this profile yet.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Once provisioned by the hostel administrator, you will automatically be directed to your portal.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <SignOutButton redirectUrl="/">
            <button className="w-full sm:w-auto rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition">
              Sign Out & Switch Account
            </button>
          </SignOutButton>
          <Link
            href="/"
            className="w-full sm:w-auto rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </main>
  );
}

