"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { Bell, Search, Calendar, User, Building2, X, Megaphone, ArrowRight } from "lucide-react";
import { api } from "@/convex-api";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";
import { LoadingState } from "@/components/ui-states";
import type { Role } from "@/types";

export default function UserNoticeCenterPage() {
  const router = useRouter();
  const authState = useQuery(api.auth.currentUser);
  const notices = useQuery(api.notices.listForUser);

  useEffect(() => {
    if (authState === undefined) return;
    if (!authState.authenticated) {
      router.replace("/login");
      return;
    }
    if (authState.state === "PENDING") {
      router.replace("/pending-access");
      return;
    }
    if (authState.state === "INACTIVE") {
      router.replace("/account-inactive");
      return;
    }
  }, [authState, router]);

  const [search, setSearch] = useState("");
  const [selectedNotice, setSelectedNotice] = useState<any | null>(null);

  const userRole: Role = (authState?.user?.role as Role) ?? "STUDENT";

  const filteredNotices = useMemo(() => {
    if (!notices) return [];
    if (!search.trim()) return notices;
    const q = search.toLowerCase();
    return notices.filter(
      (n: any) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.hostelName?.toLowerCase().includes(q)
    );
  }, [notices, search]);

  const isLoading = authState === undefined || notices === undefined;

  return (
    <AppShell role={userRole}>
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Announcements</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Campus Notice Board</h1>
          <p className="mt-1 text-sm text-slate-500">
            Official announcements, hostel advisories, holiday notifications, and campus guidelines.
          </p>
        </div>

        {/* Search Input */}
        <div className="max-w-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search announcements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none shadow-xs"
            />
          </div>
        </div>

        {/* Notice List */}
        {isLoading ? (
          <LoadingState />
        ) : filteredNotices.length === 0 ? (
          <EmptyState
            title="No announcements posted"
            description="There are currently no active notices posted for your hostel or role."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredNotices.map((n: any) => {
              const formattedDate = new Intl.DateTimeFormat("en-US", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              }).format(new Date(n.createdAt));

              return (
                <Card
                  key={n._id}
                  className="flex flex-col justify-between hover:border-indigo-300 hover:shadow-sm transition cursor-pointer p-6 space-y-4"
                  onClick={() => setSelectedNotice(n)}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100">
                        <Megaphone size={12} />
                        {n.audience} {n.hostelName ? `• ${n.hostelName}` : ""}
                      </span>
                      <span className="text-xs text-slate-400">{formattedDate}</span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-900 line-clamp-1">{n.title}</h2>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{n.content}</p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <span className="font-medium text-slate-500">By {n.authorName || "Administration"}</span>
                    <span className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                      Read announcement <ArrowRight size={14} />
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Details Modal */}
        {selectedNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-xl space-y-5">
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                    {selectedNotice.audience} {selectedNotice.hostelName ? `• ${selectedNotice.hostelName}` : ""}
                  </span>
                  <h3 className="mt-2 text-xl font-bold text-slate-900">{selectedNotice.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedNotice(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {selectedNotice.content}
              </div>

              <div className="flex justify-between items-center text-xs text-slate-400 border-t pt-3">
                <span>Posted by: <strong className="text-slate-700">{selectedNotice.authorName || "Administration"}</strong></span>
                <span>{new Date(selectedNotice.createdAt).toLocaleDateString()}</span>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedNotice(null)}
                  className="rounded-xl bg-slate-100 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

