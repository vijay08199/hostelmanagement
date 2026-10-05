"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md mb-4 flex items-center justify-start">
        <Link
          href="/"
          replace
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Home</span>
        </Link>
      </div>
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/login"
        forceRedirectUrl="/post-login"
        fallbackRedirectUrl="/post-login"
      />
    </main>
  );
}


