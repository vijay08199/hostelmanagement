"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";

export default function AdminVisitorsPage() {
  const hostels = useQuery(api.admin.listHostels, {}) || [];
  const stats = useQuery(api.visitors.getVisitorStats, {});
  const visitors = useQuery(api.visitors.listVisitors, {});

  const approveVisitor = useMutation(api.visitors.approveVisitor);
  const rejectVisitor = useMutation(api.visitors.rejectVisitor);
  const checkInVisitor = useMutation(api.visitors.checkInVisitor);
  const checkOutVisitor = useMutation(api.visitors.checkOutVisitor);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [hostelFilter, setHostelFilter] = useState<string>("ALL");

  // Modals & Action states
  const [selectedVisitor, setSelectedVisitor] = useState<any>(null);
  const [modalMode, setModalMode] = useState<"APPROVE" | "REJECT" | "CHECK_IN" | "CHECK_OUT" | "VIEW" | null>(null);
  const [actionRemark, setActionRemark] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const filteredVisitors = useMemo(() => {
    if (!visitors) return [];
    return visitors.filter((v: any) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        v.visitorName?.toLowerCase().includes(q) ||
        v.visitorPhone?.toLowerCase().includes(q) ||
        v.relationship?.toLowerCase().includes(q) ||
        v.purpose?.toLowerCase().includes(q) ||
        v.student?.firstName?.toLowerCase().includes(q) ||
        v.student?.lastName?.toLowerCase().includes(q) ||
        v.student?.rollNumber?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || v.status === statusFilter;
      const matchesHostel = hostelFilter === "ALL" || v.hostel?._id === hostelFilter;

      return matchesSearch && matchesStatus && matchesHostel;
    });
  }, [visitors, search, statusFilter, hostelFilter]);

  async function handleApprove() {
    if (!selectedVisitor) return;
    try {
      setIsSubmitting(true);
      await approveVisitor({
        id: selectedVisitor._id,
        remarks: actionRemark.trim() || "Visitor authorized by management",
      });
      setMessage({ text: `Visitor ${selectedVisitor.visitorName} approved.`, type: "success" });
      setModalMode(null);
      setSelectedVisitor(null);
      setActionRemark("");
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to approve visitor.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReject() {
    if (!selectedVisitor) return;
    if (!actionRemark.trim()) {
      setMessage({ text: "A reason explaining visitor rejection is required.", type: "error" });
      return;
    }
    try {
      setIsSubmitting(true);
      await rejectVisitor({
        id: selectedVisitor._id,
        remarks: actionRemark.trim(),
      });
      setMessage({ text: `Visitor entry rejected.`, type: "success" });
      setModalMode(null);
      setSelectedVisitor(null);
      setActionRemark("");
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to reject visitor.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCheckIn() {
    if (!selectedVisitor) return;
    try {
      setIsSubmitting(true);
      await checkInVisitor({
        id: selectedVisitor._id,
        remarks: actionRemark.trim() || "Security gate entry recorded",
      });
      setMessage({ text: `Visitor ${selectedVisitor.visitorName} checked in.`, type: "success" });
      setModalMode(null);
      setSelectedVisitor(null);
      setActionRemark("");
    } catch (err: any) {
      setMessage({ text: err.message || "Check-in failed.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCheckOut() {
    if (!selectedVisitor) return;
    try {
      setIsSubmitting(true);
      await checkOutVisitor({
        id: selectedVisitor._id,
        remarks: actionRemark.trim() || "Gate exit recorded",
      });
      setMessage({ text: `Visitor ${selectedVisitor.visitorName} checked out successfully.`, type: "success" });
      setModalMode(null);
      setSelectedVisitor(null);
      setActionRemark("");
    } catch (err: any) {
      setMessage({ text: err.message || "Check-out failed.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "CHECKED_IN":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20";
      case "CHECKED_OUT":
        return "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20";
      case "APPROVED":
        return "bg-teal-50 text-teal-700 ring-1 ring-teal-600/20";
      case "PENDING":
        return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
      case "REJECTED":
        return "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20";
      case "CANCELLED":
        return "bg-slate-100 text-slate-700 ring-1 ring-slate-600/20";
      default:
        return "bg-slate-50 text-slate-700 ring-1 ring-slate-600/20";
    }
  }

  return (
    <RoleGate role="ADMIN">
      <AppShell role="ADMIN">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Gate Security</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Hostel Visitor Management</h1>
              <p className="mt-1 text-sm text-slate-500">
                Oversee student guest visits, manage access approvals, and track real-time campus presence.
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
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Guest Visits</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {stats?.total ?? (visitors?.length || 0)}
              </p>
              <p className="mt-1 text-xs text-slate-500">All registered entries</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Currently On Campus</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">
                {stats?.checkedIn ?? 0}
              </p>
              <p className="mt-1 text-xs text-emerald-600 font-medium">Checked-in visitors</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Approvals</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600">
                {stats?.pendingApprovals ?? 0}
              </p>
              <p className="mt-1 text-xs text-amber-600 font-medium">Pre-arrival authorization</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Completed Visits</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-blue-600">
                {stats?.checkedOut ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">Checked-out guests</p>
            </Card>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="relative min-w-[220px] flex-1">
              <input
                type="text"
                placeholder="Search visitor name, phone, student, purpose..."
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

            <select
              value={hostelFilter}
              onChange={(e) => setHostelFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Hostels</option>
              {hostels.map((h: any) => (
                <option key={h._id} value={h._id}>
                  {h.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="CHECKED_IN">On Campus (Checked In)</option>
              <option value="APPROVED">Approved (Expected)</option>
              <option value="PENDING">Pending Review</option>
              <option value="CHECKED_OUT">Checked Out</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Table */}
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="border-b border-slate-100 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Visitor & Relation</th>
                    <th className="px-5 py-3.5">Visiting Student</th>
                    <th className="px-5 py-3.5">Schedule</th>
                    <th className="px-5 py-3.5">Purpose</th>
                    <th className="px-5 py-3.5">Status & Timings</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVisitors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center">
                        <EmptyState
                          title="No visitors found"
                          description="No visitor records match your current filter selections."
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredVisitors.map((v: any) => (
                      <tr key={v._id} className="transition-colors hover:bg-slate-50/50">
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-900">{v.visitorName}</div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            {v.relationship} • <span className="font-mono text-slate-700">{v.visitorPhone}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-900">
                            {v.student?.firstName} {v.student?.lastName}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            ID: {v.student?.studentId || "N/A"} • Room {v.room?.roomNumber || "N/A"}
                          </div>
                          <div className="text-xs text-indigo-600">
                            {v.hostel?.name || "Hostel"}
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-medium text-slate-900">{v.visitDate}</div>
                          <div className="mt-0.5 text-xs font-mono text-slate-500">
                            {v.expectedArrival} → {v.expectedDeparture}
                          </div>
                        </td>
                        <td className="px-5 py-4 max-w-xs">
                          <p className="line-clamp-2 text-xs text-slate-600" title={v.purpose}>
                            {v.purpose}
                          </p>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${getStatusBadge(
                              v.status
                            )}`}
                          >
                            {v.status.replace("_", " ")}
                          </span>
                          {v.checkInTime && (
                            <div className="mt-1 text-[11px] text-slate-500">
                              In: {new Date(v.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          )}
                          {v.checkOutTime && (
                            <div className="text-[11px] text-slate-500">
                              Out: {new Date(v.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {v.status === "PENDING" && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedVisitor(v);
                                    setActionRemark("");
                                    setModalMode("APPROVE");
                                  }}
                                  className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedVisitor(v);
                                    setActionRemark("");
                                    setModalMode("REJECT");
                                  }}
                                  className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {v.status === "APPROVED" && (
                              <button
                                onClick={() => {
                                  setSelectedVisitor(v);
                                  setActionRemark("");
                                  setModalMode("CHECK_IN");
                                }}
                                className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
                              >
                                Check In
                              </button>
                            )}

                            {v.status === "CHECKED_IN" && (
                              <button
                                onClick={() => {
                                  setSelectedVisitor(v);
                                  setActionRemark("");
                                  setModalMode("CHECK_OUT");
                                }}
                                className="rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700"
                              >
                                Check Out
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setSelectedVisitor(v);
                                setModalMode("VIEW");
                              }}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Action Modals */}
          {modalMode === "APPROVE" && selectedVisitor && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <h3 className="text-lg font-bold text-slate-900">Approve Visitor Request</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Authorize visit for {selectedVisitor.visitorName} ({selectedVisitor.relationship}) visiting {selectedVisitor.student?.firstName}.
                </p>

                <div className="mt-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Remark (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g., ID verified at security gate"
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
                      setSelectedVisitor(null);
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

          {modalMode === "REJECT" && selectedVisitor && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <h3 className="text-lg font-bold text-slate-900 text-rose-600">Reject Visitor Entry</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Decline hostel visitation for {selectedVisitor.visitorName}.
                </p>

                <div className="mt-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Reason for Rejection <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g., Outside visiting hours, non-family guest not allowed"
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
                      setSelectedVisitor(null);
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

          {modalMode === "CHECK_IN" && selectedVisitor && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <h3 className="text-lg font-bold text-slate-900 text-indigo-600">Record Visitor Gate Check-In</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Confirm arrival of {selectedVisitor.visitorName} at hostel security gate.
                </p>

                <div className="mt-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Security Gate Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Gov ID checked, Visitor badge #14 issued"
                    value={actionRemark}
                    onChange={(e) => setActionRemark(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-2.5">
                  <button
                    disabled={isSubmitting}
                    onClick={() => {
                      setModalMode(null);
                      setSelectedVisitor(null);
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={handleCheckIn}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isSubmitting ? "Processing..." : "Confirm Check In"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {modalMode === "CHECK_OUT" && selectedVisitor && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <h3 className="text-lg font-bold text-slate-900 text-amber-600">Record Visitor Gate Check-Out</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Confirm campus exit for {selectedVisitor.visitorName}.
                </p>

                <div className="mt-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Exit Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Badge returned, departed via main gate"
                    value={actionRemark}
                    onChange={(e) => setActionRemark(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-2.5">
                  <button
                    disabled={isSubmitting}
                    onClick={() => {
                      setModalMode(null);
                      setSelectedVisitor(null);
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={handleCheckOut}
                    className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50"
                  >
                    {isSubmitting ? "Processing..." : "Confirm Check Out"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {modalMode === "VIEW" && selectedVisitor && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">Visitor Details</h3>
                  <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${getStatusBadge(selectedVisitor.status)}`}>
                    {selectedVisitor.status.replace("_", " ")}
                  </span>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <div>
                      <span className="text-slate-500 block">Visitor Name</span>
                      <span className="font-semibold text-slate-800">{selectedVisitor.visitorName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Relationship & Phone</span>
                      <span className="font-semibold text-slate-800">{selectedVisitor.relationship} ({selectedVisitor.visitorPhone})</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Hostel & Student</span>
                      <span className="font-semibold text-slate-800">{selectedVisitor.student?.firstName} {selectedVisitor.student?.lastName} ({selectedVisitor.hostel?.name})</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Visit Date & Hours</span>
                      <span className="font-semibold text-slate-800">{selectedVisitor.visitDate} ({selectedVisitor.expectedArrival} - {selectedVisitor.expectedDeparture})</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 block font-semibold mb-1">Visit Purpose</span>
                    <p className="text-xs text-slate-700 bg-slate-50 rounded-lg p-2.5 border border-slate-100 whitespace-pre-wrap">
                      {selectedVisitor.purpose}
                    </p>
                  </div>

                  {(selectedVisitor.checkInTime || selectedVisitor.checkOutTime) && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <span className="text-slate-500 block font-semibold mb-1">Gate Timestamp Log</span>
                      <div className="grid grid-cols-2 gap-2 text-slate-800">
                        <div>
                          Check In: <span className="font-mono">{selectedVisitor.checkInTime ? new Date(selectedVisitor.checkInTime).toLocaleString() : "N/A"}</span>
                        </div>
                        <div>
                          Check Out: <span className="font-mono">{selectedVisitor.checkOutTime ? new Date(selectedVisitor.checkOutTime).toLocaleString() : "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedVisitor.remarks && (
                    <div>
                      <span className="text-slate-500 block font-semibold mb-1">Staff Remarks</span>
                      <p className="text-xs text-slate-700 bg-amber-50/50 rounded-lg p-2.5 border border-amber-100">
                        {selectedVisitor.remarks}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      setModalMode(null);
                      setSelectedVisitor(null);
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
