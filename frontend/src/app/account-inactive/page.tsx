"use client";

import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";

export default function AccountInactive() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 mb-4 border border-slate-200">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Account Inactive</h1>
        <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
          Your application profile is currently marked as INACTIVE. Please contact the hostel administrator to reactivate your access.
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
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}

