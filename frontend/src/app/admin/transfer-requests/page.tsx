"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Search, Filter, Clock, CheckCircle2, AlertCircle, X, Eye, Building2, Ban, ArrowRightLeft, ArrowDown } from "lucide-react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";
import { LoadingState } from "@/components/ui-states";
import type { Id } from "../../../../../backend/convex/_generated/dataModel";

type TransferStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export default function AdminTransferRequestsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedHostelId, setSelectedHostelId] = useState<string>("");
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  const hostels = useQuery(api.admin.listHostels);

  const requests = useQuery(api.transferRequests.listForAdmin, {
    statusFilter: (statusFilter || undefined) as TransferStatus | undefined,
    hostelId: (selectedHostelId || undefined) as Id<"hostels"> | undefined,
    search: search.trim() || undefined,
  });

  const stats = useMemo(() => {
    if (!requests) return { total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 };
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let cancelled = 0;

    for (const r of requests) {
      if (r.status === "PENDING") pending++;
      else if (r.status === "APPROVED") approved++;
      else if (r.status === "REJECTED") rejected++;
      else if (r.status === "CANCELLED") cancelled++;
    }

    return { total: requests.length, pending, approved, rejected, cancelled };
  }, [requests]);

  const isLoading = requests === undefined || hostels === undefined;

  return (
    <RoleGate role="ADMIN">
      <AppShell role="ADMIN">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Reassignment Oversight</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Transfer Request Center</h1>
            <p className="mt-1 text-sm text-slate-500">
              System-wide visibility of room transfer requests, reallocations, and warden approvals.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4 border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Transfers</p>
                  <p className="mt-1.5 text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-700">
                  <ArrowRightLeft size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-amber-100 bg-amber-50/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Pending Review</p>
                  <p className="mt-1.5 text-2xl font-bold text-amber-800">{stats.pending}</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-100/60 p-2.5 text-amber-700">
                  <Clock size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-emerald-100 bg-emerald-50/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Approved</p>
                  <p className="mt-1.5 text-2xl font-bold text-emerald-800">{stats.approved}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-100/60 p-2.5 text-emerald-700">
                  <CheckCircle2 size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-rose-100 bg-rose-50/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">Rejected</p>
                  <p className="mt-1.5 text-2xl font-bold text-rose-800">{stats.rejected}</p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-100/60 p-2.5 text-rose-700">
                  <AlertCircle size={20} />
                </div>
              </div>
            </Card>
          </div>

          {/* Filters Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Search size={14} /> Search Transfers
                </label>
                <input
                  type="text"
                  placeholder="Student, ID, room, reason..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Building2 size={14} /> Hostel Filter
                </label>
                <select
                  value={selectedHostelId}
                  onChange={(e) => setSelectedHostelId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">All Hostels</option>
                  {(hostels ?? []).map((h) => (
                    <option key={h._id} value={h._id}>
                      {h.name} ({h.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Filter size={14} /> Status Filter
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>
          </div>

          {/* Transfers Table */}
          {isLoading ? (
            <LoadingState />
          ) : requests.length === 0 ? (
            <EmptyState
              title="No transfer requests found"
              description="No room transfer requests match the selected filters."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Student</th>
                    <th className="px-4 py-3.5">Current Room</th>
                    <th className="px-4 py-3.5">Requested Destination / Reason</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Submitted Date</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((r: any) => {
                    const formattedDate = new Intl.DateTimeFormat("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    }).format(new Date(r.createdAt));

                    const initials = `${r.studentName?.[0] ?? ""}`.toUpperCase() || "S";

                    return (
                      <tr key={r._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200">
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{r.studentName}</div>
                              <div className="font-mono text-xs text-slate-400">{r.studentIdentifier}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 text-xs">
                          <div className="font-semibold text-slate-900">{r.currentHostelName}</div>
                          <div className="text-slate-500">Room {r.currentRoomNumber}, Bed {r.currentBedLabel}</div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-700">
                          <div className="font-semibold text-slate-900">{r.reason}</div>
                          <div className="line-clamp-1 max-w-xs text-slate-400">{r.description}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          {r.status === "PENDING" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-600"></span>
                              PENDING
                            </span>
                          )}
                          {r.status === "APPROVED" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                              APPROVED
                            </span>
                          )}
                          {r.status === "REJECTED" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                              REJECTED
                            </span>
                          )}
                          {r.status === "CANCELLED" && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                              CANCELLED
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 text-xs whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => setSelectedRequest(r)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 shadow-2xs transition"
                          >
                            <Eye size={14} /> Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Details Modal with Visual Transfer Representation */}
          {selectedRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
              <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-xl space-y-5">
                <div className="flex items-start justify-between border-b pb-4">
                  <div>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      Transfer Oversight
                    </span>
                    <h3 className="mt-2 text-xl font-bold text-slate-900">
                      {selectedRequest.studentName}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Visual Movement Workflow: CURRENT ROOM ↓ REQUESTED ROOM */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <span>Reallocation Path</span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Room</span>
                    <p className="mt-1 font-semibold text-slate-900 text-sm">
                      {selectedRequest.currentHostelName}
                    </p>
                    <p className="text-xs text-slate-600">
                      Room {selectedRequest.currentRoomNumber} &bull; Bed {selectedRequest.currentBedLabel}
                    </p>
                  </div>

                  <div className="flex justify-center text-indigo-600">
                    <ArrowDown size={18} />
                  </div>

                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 shadow-2xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Requested Transfer</span>
                    <p className="mt-1 font-semibold text-indigo-950 text-sm">
                      {selectedRequest.reason}
                    </p>
                    <p className="text-xs text-indigo-800/80 mt-0.5 whitespace-pre-wrap">
                      {selectedRequest.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4 border-t pt-3">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Status
                      </h4>
                      <p className="mt-1 font-semibold text-slate-900">{selectedRequest.status}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Target Preference
                      </h4>
                      <p className="mt-1 text-slate-700 text-xs">
                        {selectedRequest.targetHostelName || "Any Available Bed"}
                      </p>
                    </div>
                  </div>

                  {selectedRequest.reviewNote && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Warden Review Note
                      </h4>
                      <p className="mt-1 text-slate-800 whitespace-pre-wrap text-sm">
                        {selectedRequest.reviewNote}
                      </p>
                      {selectedRequest.reviewerName && (
                        <p className="mt-2 text-xs font-medium text-slate-500">
                          Reviewed by: {selectedRequest.reviewerName}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end border-t pt-4">
                  <button
                    onClick={() => setSelectedRequest(null)}
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
    </RoleGate>
  );
}

