"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";

export default function WardenLeavesPage() {
  const occupancy = useQuery(api.warden.occupancy, {});
  const assignedHostels = occupancy?.hostels?.filter(Boolean) || [];

  const [selectedHostelId, setSelectedHostelId] = useState<string>("ALL");
  const stats = useQuery(
    api.leaves.getLeaveStats,
    selectedHostelId !== "ALL" ? { hostelId: selectedHostelId as any } : {}
  );

  const leaves = useQuery(
    api.leaves.listLeaves,
    selectedHostelId !== "ALL" ? { hostelId: selectedHostelId as any } : {}
  );

  const approveLeave = useMutation(api.leaves.approveLeave);
  const rejectLeave = useMutation(api.leaves.rejectLeave);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals & Action states
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [modalMode, setModalMode] = useState<"APPROVE" | "REJECT" | "VIEW" | null>(null);
  const [actionRemark, setActionRemark] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const filteredLeaves = useMemo(() => {
    if (!leaves) return [];
    return leaves.filter((item: any) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        item.student?.firstName?.toLowerCase().includes(q) ||
        item.student?.lastName?.toLowerCase().includes(q) ||
        item.student?.studentId?.toLowerCase().includes(q) ||
        item.student?.rollNumber?.toLowerCase().includes(q) ||
        item.destination?.toLowerCase().includes(q) ||
        item.reason?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [leaves, search, statusFilter]);

  async function handleApprove() {
    if (!selectedLeave) return;
    try {
      setIsSubmitting(true);
      await approveLeave({
        id: selectedLeave._id,
        remarks: actionRemark.trim() || "Approved by hostel warden",
      });
      setMessage({ text: `Leave for ${selectedLeave.student?.firstName || "student"} approved.`, type: "success" });
      setModalMode(null);
      setSelectedLeave(null);
      setActionRemark("");
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to approve leave.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReject() {
    if (!selectedLeave) return;
    if (!actionRemark.trim()) {
      setMessage({ text: "A remark explaining the reason for rejection is required.", type: "error" });
      return;
    }
    try {
      setIsSubmitting(true);
      await rejectLeave({
        id: selectedLeave._id,
        remarks: actionRemark.trim(),
      });
      setMessage({ text: `Leave request rejected.`, type: "success" });
      setModalMode(null);
      setSelectedLeave(null);
      setActionRemark("");
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to reject leave.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20";
      case "REJECTED":
        return "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20";
      case "PENDING":
        return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
      case "CANCELLED":
        return "bg-slate-100 text-slate-700 ring-1 ring-slate-600/20";
      default:
        return "bg-slate-50 text-slate-700 ring-1 ring-slate-600/20";
    }
  }

  return (
    <RoleGate role="WARDEN">
      <AppShell role="WARDEN">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Warden Operations</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Student Outstation Leaves</h1>
              <p className="mt-1 text-sm text-slate-500">
                Review and approve leave applications for students residing in your assigned hostels.
              </p>
            </div>
            {message && (
              <div
                className={`rounded-xl border px-4 py-2.5 text-xs flex items-center gap-2 ${
                  message.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-800"
                }`}
              >
                <span>{message.text}</span>
                <button onClick={() => setMessage(null)} className="ml-2 font-bold hover:underline">
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Metric Overview Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Applications</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {stats?.total ?? (leaves?.length || 0)}
              </p>
              <p className="mt-1 text-xs text-slate-500">In assigned hostels</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Review</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600">
                {stats?.pending ?? 0}
              </p>
              <p className="mt-1 text-xs text-amber-600 font-medium">Awaiting decision</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved Leaves</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">
                {stats?.approvedToday ?? 0}
              </p>
              <p className="mt-1 text-xs text-emerald-600 font-medium">Approved recently</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rejected</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-rose-600">
                {stats?.rejected ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">Declined requests</p>
            </Card>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="relative min-w-[240px] flex-1">
              <input
                type="text"
                placeholder="Search student name, roll number, destination..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {assignedHostels.length > 1 && (
              <select
                value={selectedHostelId}
                onChange={(e) => setSelectedHostelId(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
              >
                <option value="ALL">All Assigned Hostels</option>
                {assignedHostels.map((h: any) => (
                  <option key={h._id} value={h._id}>
                    {h.name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Leaves Table */}
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="border-b border-slate-100 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Student</th>
                    <th className="px-5 py-3.5">Leave Period</th>
                    <th className="px-5 py-3.5">Destination & Contact</th>
                    <th className="px-5 py-3.5">Reason</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeaves.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center">
                        <EmptyState
                          title="No leave applications found"
                          description="No student leave requests matching your current filter were found."
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredLeaves.map((l: any) => {
                      const days = Math.max(
                        1,
                        Math.round(
                          (new Date(l.toDate).getTime() - new Date(l.fromDate).getTime()) /
                            (1000 * 60 * 60 * 24)
                        ) + 1
                      );

                      return (
                        <tr key={l._id} className="transition-colors hover:bg-slate-50/50">
                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-900">
                              {l.student?.firstName} {l.student?.lastName}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500">
                              ID: {l.student?.studentId || "N/A"} • Room {l.room?.roomNumber || "N/A"}
                            </div>
                            <div className="text-xs text-indigo-600 font-medium">
                              {l.hostel?.name || "Assigned Hostel"}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-900">
                              {new Date(l.fromDate).toLocaleDateString()} → {new Date(l.toDate).toLocaleDateString()}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500">{days} Day{days > 1 ? "s" : ""}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-900">{l.destination}</div>
                            <div className="mt-0.5 text-xs text-slate-500">
                              Emergency: <span className="font-mono text-slate-700">{l.emergencyContact}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 max-w-xs">
                            <p className="line-clamp-2 text-xs text-slate-600" title={l.reason}>
                              {l.reason}
                            </p>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${getStatusBadge(
                                l.status
                              )}`}
                            >
                              {l.status}
                            </span>
                            {l.remarks && (
                              <div className="mt-1 max-w-[160px] truncate text-[11px] text-slate-400" title={l.remarks}>
                                Note: {l.remarks}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            {l.status === "PENDING" ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedLeave(l);
                                    setActionRemark("");
                                    setModalMode("APPROVE");
                                  }}
                                  className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedLeave(l);
                                    setActionRemark("");
                                    setModalMode("REJECT");
                                  }}
                                  className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedLeave(l);
                                  setModalMode("VIEW");
                                }}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                              >
                                View Details
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Action Modals */}
          {modalMode === "APPROVE" && selectedLeave && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <h3 className="text-lg font-bold text-slate-900">Approve Student Leave</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Grant leave permission for {selectedLeave.student?.firstName} {selectedLeave.student?.lastName}.
                </p>

                <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs space-y-1.5 border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dates:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedLeave.fromDate} to {selectedLeave.toDate}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Destination:</span>
                    <span className="font-semibold text-slate-800">{selectedLeave.destination}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Parent / Emergency:</span>
                    <span className="font-semibold text-slate-800">{selectedLeave.emergencyContact}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Warden Remark (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g., Parent confirmation verified"
                    value={actionRemark}
                    onChange={(e) => setActionRemark(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-2.5">
                  <button
                    disabled={isSubmitting}
                    onClick={() => {
                      setModalMode(null);
                      setSelectedLeave(null);
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={handleApprove}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isSubmitting ? "Approving..." : "Confirm Approval"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {modalMode === "REJECT" && selectedLeave && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <h3 className="text-lg font-bold text-slate-900 text-rose-600">Reject Leave Request</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Decline leave for {selectedLeave.student?.firstName} {selectedLeave.student?.lastName}.
                </p>

                <div className="mt-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Reason for Rejection <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Specify why this leave request cannot be approved"
                    value={actionRemark}
                    onChange={(e) => setActionRemark(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-2.5">
                  <button
                    disabled={isSubmitting}
                    onClick={() => {
                      setModalMode(null);
                      setSelectedLeave(null);
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={handleReject}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
                  >
                    {isSubmitting ? "Rejecting..." : "Confirm Rejection"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {modalMode === "VIEW" && selectedLeave && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">Leave Details</h3>
                  <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${getStatusBadge(selectedLeave.status)}`}>
                    {selectedLeave.status}
                  </span>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <div>
                      <span className="text-slate-500 block">Student</span>
                      <span className="font-semibold text-slate-800">{selectedLeave.student?.firstName} {selectedLeave.student?.lastName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Roll / Reg Number</span>
                      <span className="font-semibold text-slate-800">{selectedLeave.student?.rollNumber || selectedLeave.student?.studentId || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Hostel & Room</span>
                      <span className="font-semibold text-slate-800">{selectedLeave.hostel?.name}, Room {selectedLeave.room?.roomNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Emergency Phone</span>
                      <span className="font-semibold text-slate-800">{selectedLeave.emergencyContact}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 block font-semibold mb-1">Travel Period & Destination</span>
                    <p className="text-sm font-medium text-slate-800">
                      {selectedLeave.fromDate} → {selectedLeave.toDate} ({selectedLeave.destination})
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-500 block font-semibold mb-1">Reason</span>
                    <p className="text-xs text-slate-700 bg-slate-50 rounded-lg p-2.5 border border-slate-100 whitespace-pre-wrap">
                      {selectedLeave.reason}
                    </p>
                  </div>

                  {selectedLeave.remarks && (
                    <div>
                      <span className="text-slate-500 block font-semibold mb-1">Warden Remark</span>
                      <p className="text-xs text-slate-700 bg-amber-50/50 rounded-lg p-2.5 border border-amber-100">
                        {selectedLeave.decisionRemark}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      setModalMode(null);
                      setSelectedLeave(null);
                    }}
                    className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-900"
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
