"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Search, Filter, Clock, CheckCircle2, AlertCircle, X, Eye, ArrowRightLeft, ArrowDown, Building2, Check, Ban, BedDouble } from "lucide-react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";
import { LoadingState } from "@/components/ui-states";
import type { Id } from "../../../../../backend/convex/_generated/dataModel";

type TransferStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export default function WardenTransferRequestsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [activeRequest, setActiveRequest] = useState<any | null>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | "VIEW">("VIEW");
  const [selectedBedId, setSelectedBedId] = useState<string>("");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [reviewNote, setReviewNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const requests = useQuery(api.transferRequests.listForWarden, {
    statusFilter: (statusFilter || undefined) as TransferStatus | undefined,
    search: search.trim() || undefined,
  });

  const occupancy = useQuery(api.warden.occupancy);
  const approveMutation = useMutation(api.transferRequests.approve);
  const rejectMutation = useMutation(api.transferRequests.reject);

  const availableBeds = useMemo(() => {
    if (!occupancy?.beds || !occupancy?.rooms) return [];
    const roomMap = new Map(occupancy.rooms.map((r: any) => [r._id, r]));
    return (occupancy.beds as any[])
      .filter((b) => b.status === "AVAILABLE")
      .map((b) => ({
        ...b,
        room: roomMap.get(b.roomId),
      }));
  }, [occupancy]);

  const stats = useMemo(() => {
    if (!requests) return { total: 0, pending: 0, approved: 0, rejected: 0 };
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    for (const r of requests) {
      if (r.status === "PENDING") pending++;
      else if (r.status === "APPROVED") approved++;
      else if (r.status === "REJECTED") rejected++;
    }

    return { total: requests.length, pending, approved, rejected };
  }, [requests]);

  function openAction(request: any, mode: "APPROVE" | "REJECT" | "VIEW") {
    setActiveRequest(request);
    setActionType(mode);
    setReviewNote(request.reviewNote ?? "");
    setSelectedBedId("");
    setSelectedRoomId("");
    setFeedback(null);
  }

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    if (!activeRequest || !selectedBedId || !selectedRoomId) {
      setFeedback({ type: "error", message: "Please select an available destination bed and room." });
      return;
    }

    setIsProcessing(true);
    setFeedback(null);
    try {
      await approveMutation({
        requestId: activeRequest._id,
        targetBedId: selectedBedId as Id<"beds">,
        targetRoomId: selectedRoomId as Id<"rooms">,
        reviewNote: reviewNote.trim() || undefined,
      });

      setFeedback({
        type: "success",
        message: `Transfer request approved for ${activeRequest.studentName}. Room allocation updated successfully.`,
      });
      setActiveRequest(null);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to approve transfer request.",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    if (!activeRequest) return;

    setIsProcessing(true);
    setFeedback(null);
    try {
      await rejectMutation({
        requestId: activeRequest._id,
        reviewNote: reviewNote.trim() || undefined,
      });

      setFeedback({
        type: "success",
        message: `Transfer request rejected for ${activeRequest.studentName}.`,
      });
      setActiveRequest(null);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to reject transfer request.",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  const isLoading = requests === undefined;

  return (
    <RoleGate role="WARDEN">
      <AppShell role="WARDEN">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Room Reassignments</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Transfer Request Review</h1>
            <p className="mt-1 text-sm text-slate-500">
              Review, approve, and reassign residents requesting room and bed transfers in your assigned hostels.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4 border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Requests</p>
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
                  placeholder="Student, ID, room, or reason..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                />
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

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`flex items-center gap-3 rounded-xl border p-4 text-sm ${
                feedback.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {feedback.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Table */}
          {isLoading ? (
            <LoadingState />
          ) : requests.length === 0 ? (
            <EmptyState
              title="No transfer requests found"
              description="No transfer requests match the current filters for your assigned hostels."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Student</th>
                    <th className="px-4 py-3.5">Current Room</th>
                    <th className="px-4 py-3.5">Reason & Details</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Date</th>
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
                          <div className="text-slate-500">Room {r.currentRoomNumber} &bull; Bed {r.currentBedLabel}</div>
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
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openAction(r, "VIEW")}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition"
                            >
                              Details
                            </button>
                            {r.status === "PENDING" && (
                              <>
                                <button
                                  onClick={() => openAction(r, "APPROVE")}
                                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-2xs transition"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => openAction(r, "REJECT")}
                                  className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Action Modal with Visual Transfer Workflow */}
          {activeRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
              <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl space-y-5">
                <div className="flex items-start justify-between border-b pb-4">
                  <div>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {actionType === "APPROVE" ? "Approve Room Transfer" : actionType === "REJECT" ? "Reject Transfer Request" : "Transfer Request Details"}
                    </span>
                    <h3 className="mt-2 text-xl font-bold text-slate-900">
                      {activeRequest.studentName}
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveRequest(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Visual Transfer Workflow Card */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <span>Transfer Workflow</span>
                  </div>

                  {/* Current Room */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Accommodation</span>
                    <p className="mt-1 font-semibold text-slate-900 text-sm">
                      {activeRequest.currentHostelName}
                    </p>
                    <p className="text-xs text-slate-600">
                      Room {activeRequest.currentRoomNumber} &bull; Bed {activeRequest.currentBedLabel}
                    </p>
                  </div>

                  {/* Flow Arrow */}
                  <div className="flex justify-center text-indigo-600">
                    <ArrowDown size={18} />
                  </div>

                  {/* Requested Destination / Reason */}
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 shadow-2xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Requested Transfer</span>
                    <p className="mt-1 font-semibold text-indigo-950 text-sm">
                      {activeRequest.reason}
                    </p>
                    <p className="text-xs text-indigo-800/80 mt-0.5 whitespace-pre-wrap">
                      {activeRequest.description}
                    </p>
                  </div>
                </div>

                {actionType === "APPROVE" ? (
                  <form onSubmit={handleApprove} className="border-t pt-4 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Select Available Destination Bed *
                      </label>
                      {availableBeds.length === 0 ? (
                        <p className="text-xs text-rose-600">No available beds found in your assigned hostels.</p>
                      ) : (
                        <select
                          required
                          value={selectedBedId}
                          onChange={(e) => {
                            const bedId = e.target.value;
                            setSelectedBedId(bedId);
                            const match = availableBeds.find((b) => b._id === bedId);
                            setSelectedRoomId(match?.roomId ?? "");
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="">Choose an available destination bed...</option>
                          {availableBeds.map((b) => (
                            <option key={b._id} value={b._id}>
                              Room {b.room?.roomNumber ?? "—"} &bull; Bed {b.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Review Note / Remarks
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Optional confirmation note for the student..."
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveRequest(null)}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isProcessing || !selectedBedId}
                        className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {isProcessing ? "Processing..." : "Confirm & Transfer"}
                      </button>
                    </div>
                  </form>
                ) : actionType === "REJECT" ? (
                  <form onSubmit={handleReject} className="border-t pt-4 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Rejection Reason / Note *
                      </label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Explain to the student why this transfer request cannot be fulfilled at this time..."
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveRequest(null)}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="rounded-xl bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-2xs hover:bg-rose-700 disabled:opacity-50"
                      >
                        {isProcessing ? "Rejecting..." : "Confirm Rejection"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="border-t pt-4 space-y-3">
                    {activeRequest.reviewNote && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                          Warden Review Note
                        </h4>
                        <p className="mt-1 text-slate-800 whitespace-pre-wrap text-sm">
                          {activeRequest.reviewNote}
                        </p>
                        {activeRequest.reviewerName && (
                          <p className="mt-2 text-xs text-slate-500">
                            Reviewed by: {activeRequest.reviewerName}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        onClick={() => setActiveRequest(null)}
                        className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </RoleGate>
  );
}

