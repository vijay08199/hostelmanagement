"use client";

import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";

export default function Unauthorized() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4 border border-rose-100">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Access Denied</h1>
        <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
          You do not have the required permissions to view this portal. Access is strictly partitioned by role (Admin, Warden, Student).
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/post-login"
            className="w-full sm:w-auto rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            Go to My Dashboard
          </Link>
          <SignOutButton redirectUrl="/">
            <button className="w-full sm:w-auto rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
              Sign Out & Switch Account
            </button>
          </SignOutButton>
        </div>
      </div>
    </main>
  );
}

