export function LoadingState() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-4 w-36 rounded-md bg-slate-200" />
          <div className="h-4 w-20 rounded-md bg-slate-100" />
        </div>
        <div className="space-y-2.5">
          <div className="h-3 w-full rounded-md bg-slate-100" />
          <div className="h-3 w-4/5 rounded-md bg-slate-100" />
          <div className="h-3 w-2/3 rounded-md bg-slate-100" />
        </div>
        <div className="pt-2 flex gap-3">
          <div className="h-8 w-24 rounded-xl bg-slate-100" />
          <div className="h-8 w-24 rounded-xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export function ErrorState({ message = "Something went wrong." }: { message?: string }) {
  return (
    <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 text-sm text-rose-800 shadow-sm flex items-start gap-3">
      <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </div>
      <div>
        <h3 className="font-semibold text-rose-900">System Notification</h3>
        <p className="mt-0.5 text-rose-700">{message}</p>
      </div>
    </div>
  );
}
