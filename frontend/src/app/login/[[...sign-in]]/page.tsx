"use client";

import { useState } from "react";
import { SignIn, useAuth, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LogOut, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    try {
      setSigningOut(true);
      await signOut({ redirectUrl: "/" });
      window.location.replace("/");
    } catch {
      window.location.replace("/");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50">
      {/* Back to Home Navigation */}
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

      {isLoaded && isSignedIn ? (
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
            <ShieldCheck size={26} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">You're already signed in</h2>
          <p className="mt-2 text-sm text-slate-600">
            Continue to your role-based dashboard or sign out to use another account.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => router.replace("/post-login")}
              className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition flex items-center justify-center gap-2"
            >
              <span>Continue to Dashboard</span>
              <ArrowRight size={15} />
            </button>
            <button
              type="button"
              disabled={signingOut}
              onClick={handleSignOut}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogOut size={16} />
              <span>{signingOut ? "Signing out..." : "Sign Out & Use Another Account"}</span>
            </button>
          </div>
        </div>
      ) : (
        <SignIn
          path="/login"
          routing="path"
          signUpUrl="/sign-up"
          forceRedirectUrl="/post-login"
          fallbackRedirectUrl="/post-login"
        />
      )}
    </main>
  );
}




