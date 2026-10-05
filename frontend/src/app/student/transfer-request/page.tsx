"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowRightLeft, Clock, CheckCircle2, AlertCircle, X, Plus, Info, Ban, Building2, ArrowDown, ArrowRight, DoorOpen, BedDouble, Check } from "lucide-react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";
import { LoadingState } from "@/components/ui-states";
import type { Id } from "../../../../../backend/convex/_generated/dataModel";

const TRANSFER_REASONS = [
  "Medical Grounds",
  "Study Environment",
  "Roommate Incompatibility",
  "Maintenance Issues",
  "Personal / Other",
];

export default function StudentTransferRequestPage() {
  const requests = useQuery(api.transferRequests.listForStudent);
  const myProfile = useQuery(api.studentProfile.mine);
  const createMutation = useMutation(api.transferRequests.create);
  const cancelMutation = useMutation(api.transferRequests.cancel);

  const [isOpenModal, setIsOpenModal] = useState(false);
  const [reason, setReason] = useState(TRANSFER_REASONS[0]);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const currentAllocation = myProfile?.currentAllocation;

  const hasPending = useMemo(() => {
    return Boolean(requests?.some((r: any) => r.status === "PENDING"));
  }, [requests]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setFeedback({ type: "error", message: "Please provide a detailed description for your transfer request." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      await createMutation({
        reason,
        description: description.trim(),
      });
      setDescription("");
      setReason(TRANSFER_REASONS[0]);
      setIsOpenModal(false);
      setFeedback({
        type: "success",
        message: "Transfer request submitted successfully. A hostel warden will review available beds.",
      });
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to submit transfer request." });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel(requestId: Id<"transferRequests">) {
    if (!window.confirm("Are you sure you want to cancel this transfer request?")) {
      return;
    }

    setCancellingId(requestId);
    setFeedback(null);
    try {
      await cancelMutation({ requestId });
      if (selectedRequest?._id === requestId) {
        setSelectedRequest(null);
      }
      setFeedback({ type: "success", message: "Transfer request cancelled." });
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to cancel transfer request." });
    } finally {
      setCancellingId(null);
    }
  }

  const isLoading = requests === undefined || myProfile === undefined;

  return (
    <RoleGate role="STUDENT">
      <AppShell role="STUDENT">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Room Reassignment</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Room Transfer Requests</h1>
              <p className="mt-1 text-sm text-slate-500">
                Submit and track requests to transfer between rooms, floors, or blocks within campus facilities.
              </p>
            </div>
            <button
              disabled={hasPending || !currentAllocation}
              onClick={() => {
                setFeedback(null);
                setIsOpenModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              title={
                !currentAllocation
                  ? "Active room allocation required"
                  : hasPending
                  ? "You already have a pending transfer request"
                  : "Request transfer"
              }
            >
              <Plus size={18} />
              New Transfer Request
            </button>
          </div>

          {/* Visual Explanation Workflow: CURRENT ROOM -> TRANSFER REQUEST -> NEW ROOM */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Transfer Reassignment Process
            </h2>
            <div className="grid gap-4 sm:grid-cols-3 items-center">
              {/* Step 1: Current Accommodation */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 relative">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-xl bg-slate-200/80 p-2 text-slate-700">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">1. Current Room</span>
                    <p className="text-sm font-bold text-slate-900">
                      {currentAllocation ? `Room ${currentAllocation.room?.roomNumber}` : "Not Allocated"}
                    </p>
                  </div>
                </div>
                {currentAllocation && (
                  <p className="mt-2 text-xs text-slate-500">
                    {currentAllocation.hostel?.name} &bull; Bed {currentAllocation.bed?.label}
                  </p>
                )}
              </div>

              {/* Step 2: Transfer Request */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 relative">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700">
                    <ArrowRightLeft size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">2. Request Review</span>
                    <p className="text-sm font-bold text-indigo-950">Warden Evaluation</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-indigo-800/80">
                  {hasPending ? "Pending review by hostel warden" : "Submit application with reason"}
                </p>
              </div>

              {/* Step 3: Destination Reallocation */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 relative">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">3. Reassignment</span>
                    <p className="text-sm font-bold text-emerald-950">Atomic Bed Shift</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-emerald-800/80">
                  Old bed vacated & new bed allocated instantly upon approval
                </p>
              </div>
            </div>
          </div>

          {/* Pending Alert Notice */}
          {hasPending && (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <Clock size={18} className="shrink-0" />
              <span>
                You currently have a transfer request under review. Wardens process one transfer request at a time to ensure bed availability.
              </span>
            </div>
          )}

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`flex items-center gap-3 rounded-2xl border p-4 text-sm ${
                feedback.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {feedback.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Transfer Requests Table */}
          {isLoading ? (
            <LoadingState />
          ) : requests.length === 0 ? (
            <EmptyState
              title="No transfer requests on file"
              description="You have not submitted any room transfer requests yet."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Reason & Description</th>
                    <th className="px-4 py-3.5">Current Location</th>
                    <th className="px-4 py-3.5">Target Destination</th>
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

                    return (
                      <tr key={r._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-900">{r.reason}</div>
                          <div className="text-xs text-slate-400 line-clamp-1 max-w-xs">{r.description}</div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 text-xs">
                          <div className="font-medium text-slate-900">{r.currentHostelName}</div>
                          <div className="text-slate-400">Room {r.currentRoomNumber} &bull; Bed {r.currentBedLabel}</div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 text-xs">
                          <div>{r.targetHostelName || "Any Available"}</div>
                          <div className="text-slate-400">{r.targetRoomNumber ? `Room ${r.targetRoomNumber}` : "Warden Assignment"}</div>
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
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedRequest(r)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
                            >
                              Details
                            </button>
                            {r.status === "PENDING" && (
                              <button
                                disabled={cancellingId === r._id}
                                onClick={() => handleCancel(r._id)}
                                className="rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition"
                              >
                                Cancel
                              </button>
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

          {/* Details Modal */}
          {selectedRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
              <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      Transfer Request Details
                    </span>
                    <h3 className="mt-2 text-xl font-bold text-slate-900">
                      {selectedRequest.reason}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Transfer Reason & Circumstances
                    </h4>
                    <p className="mt-1.5 rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-slate-700 whitespace-pre-wrap text-sm">
                      {selectedRequest.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t pt-3">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Current Room
                      </h4>
                      <p className="mt-1 font-semibold text-slate-900">
                        {selectedRequest.currentHostelName}
                      </p>
                      <p className="text-xs text-slate-500">
                        Room {selectedRequest.currentRoomNumber} &bull; Bed {selectedRequest.currentBedLabel}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Status
                      </h4>
                      <p className="mt-1 font-semibold text-slate-900">{selectedRequest.status}</p>
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

                <div className="flex justify-between border-t pt-4">
                  {selectedRequest.status === "PENDING" ? (
                    <button
                      onClick={() => handleCancel(selectedRequest._id)}
                      disabled={cancellingId === selectedRequest._id}
                      className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Cancel Request
                    </button>
                  ) : <div />}
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

          {/* New Transfer Request Modal */}
          {isOpenModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
              <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-xl">
                <div className="flex items-center justify-between border-b pb-4">
                  <h3 className="text-xl font-bold text-slate-900">Request Room Transfer</h3>
                  <button
                    onClick={() => setIsOpenModal(false)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCreate} className="mt-5 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Reason for Transfer
                    </label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                    >
                      {TRANSFER_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Explanation & Details
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Please explain in detail why you are requesting a room or block transfer..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => setIsOpenModal(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isSubmitting ? "Submitting..." : "Submit Transfer Request"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </RoleGate>
  );
}

