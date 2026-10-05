"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";

export default function StudentVisitorsPage() {
  const visitors = useQuery(api.visitors.myVisitors, {}) || [];
  const registerVisitor = useMutation(api.visitors.registerVisitor);
  const cancelVisitor = useMutation(api.visitors.cancelVisitor);

  const [showModal, setShowModal] = useState(false);
  const [cancellingId, setCancellingId] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form
  const [form, setForm] = useState({
    visitorName: "",
    visitorPhone: "",
    relationship: "Parent",
    visitDate: new Date().toISOString().split("T")[0],
    expectedArrival: "11:00",
    expectedDeparture: "16:00",
    purpose: "",
  });

  const stats = useMemo(() => {
    return {
      total: visitors.length,
      pending: visitors.filter((v: any) => v.status === "PENDING").length,
      approved: visitors.filter((v: any) => v.status === "APPROVED" || v.status === "CHECKED_IN").length,
      completed: visitors.filter((v: any) => v.status === "CHECKED_OUT").length,
    };
  }, [visitors]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.visitorName.trim() || !form.visitorPhone.trim() || !form.purpose.trim()) {
      setMessage({ text: "Please provide visitor name, contact number, and purpose.", type: "error" });
      return;
    }

    try {
      setIsSubmitting(true);
      await registerVisitor({
        visitorName: form.visitorName.trim(),
        phone: form.visitorPhone.trim(),
        relationship: form.relationship,
        visitDate: form.visitDate,
        expectedArrivalTime: form.expectedArrival,
        expectedDepartureTime: form.expectedDeparture,
        purpose: form.purpose.trim(),
      });
      setMessage({ text: "Visitor pre-registered successfully. Awaiting warden clearance.", type: "success" });
      setShowModal(false);
      setForm({
        visitorName: "",
        visitorPhone: "",
        relationship: "Parent",
        visitDate: new Date().toISOString().split("T")[0],
        expectedArrival: "11:00",
        expectedDeparture: "16:00",
        purpose: "",
      });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to pre-register visitor.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!cancellingId) return;
    try {
      setIsSubmitting(true);
      await cancelVisitor({
        id: cancellingId,
      });
      setMessage({ text: "Visitor registration cancelled.", type: "success" });
      setCancellingId(null);
      setCancelReason("");
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to cancel visitor.", type: "error" });
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
    <RoleGate role="STUDENT">
      <AppShell role="STUDENT">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Student Portal</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Hostel Visitors & Guests</h1>
              <p className="mt-1 text-sm text-slate-500">
                Pre-register family and authorized guests for hostel visits and track gate clearances.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
            >
              <span className="text-sm">+</span> Pre-register Visitor
            </button>
          </div>

          {message && (
            <div
              className={`rounded-xl border px-4 py-2.5 text-xs flex items-center justify-between gap-2 ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              <span>{message.text}</span>
              <button onClick={() => setMessage(null)} className="font-bold hover:underline">
                ✕
              </button>
            </div>
          )}

          {/* Metric Overview Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Visits</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{stats.total}</p>
              <p className="mt-1 text-xs text-slate-500">All registered visits</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Review</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600">{stats.pending}</p>
              <p className="mt-1 text-xs text-amber-600 font-medium">Awaiting warden review</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved / Active</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">{stats.approved}</p>
              <p className="mt-1 text-xs text-emerald-600 font-medium">Clearance granted</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Completed Visits</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-blue-600">{stats.completed}</p>
              <p className="mt-1 text-xs text-slate-500">Checked out</p>
            </Card>
          </div>

          {/* Visitor History */}
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 bg-slate-50/75 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Your Visitor History</h2>
              <p className="text-xs text-slate-500">List of family and guest visits associated with your room.</p>
            </div>

            <div className="divide-y divide-slate-100">
              {visitors.length === 0 ? (
                <div className="p-8 text-center">
                  <EmptyState
                    title="No visitors registered"
                    description="You have not pre-registered any visitors yet. Click 'Pre-register Visitor' to create a pass."
                  />
                </div>
              ) : (
                visitors.map((v: any) => (
                  <div key={v._id} className="p-5 transition-colors hover:bg-slate-50/50">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-sm">
                            {v.visitorName}
                          </span>
                          <span className="text-xs text-slate-500">
                            ({v.relationship})
                          </span>
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getStatusBadge(v.status)}`}>
                            {v.status.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          Date: <span className="font-medium text-slate-800">{v.visitDate}</span> • Expected:{" "}
                          <span className="font-mono text-slate-800">{v.expectedArrival} - {v.expectedDeparture}</span>
                        </p>
                        <p className="text-xs text-slate-500">
                          Phone: <span className="font-mono text-slate-700">{v.visitorPhone}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {v.status === "PENDING" && (
                          <button
                            onClick={() => {
                              setCancellingId(v._id);
                              setCancelReason("");
                            }}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                          >
                            Cancel Pass
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs border border-slate-100/80">
                      <p className="text-slate-700">
                        <strong className="text-slate-900">Purpose:</strong> {v.purpose}
                      </p>
                      {(v.checkInTime || v.checkOutTime) && (
                        <p className="mt-1 text-slate-500">
                          <strong>Gate Records:</strong> In: {v.checkInTime ? new Date(v.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"} | Out: {v.checkOutTime ? new Date(v.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </p>
                      )}
                      {v.remarks && (
                        <div className="mt-2 rounded-lg bg-amber-50 p-2 text-amber-900 border border-amber-100">
                          <strong>Warden Notes:</strong> {v.remarks}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Pre-register Visitor Modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">Pre-register Guest / Visitor</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Visitor Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Rajesh Sharma"
                        value={form.visitorName}
                        onChange={(e) => setForm({ ...form, visitorName: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Visitor Phone <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={form.visitorPhone}
                        onChange={(e) => setForm({ ...form, visitorPhone: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Relationship <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={form.relationship}
                      onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="Parent">Parent</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Relative">Relative</option>
                      <option value="Friend">Friend</option>
                      <option value="Academic Colleague">Academic Colleague</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Visit Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={form.visitDate}
                        onChange={(e) => setForm({ ...form, visitDate: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 p-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Arrival Time <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="time"
                        required
                        value={form.expectedArrival}
                        onChange={(e) => setForm({ ...form, expectedArrival: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 p-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Departure Time <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="time"
                        required
                        value={form.expectedDeparture}
                        onChange={(e) => setForm({ ...form, expectedDeparture: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 p-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Purpose of Visit <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="e.g., Bringing essentials, academic project meeting"
                      value={form.purpose}
                      onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="mt-6 flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setShowModal(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isSubmitting ? "Submitting..." : "Submit Pre-Registration"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Cancel Visitor Modal */}
          {cancellingId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <h3 className="text-lg font-bold text-slate-900 text-rose-600">Cancel Visitor Pass</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Withdraw this visitor pre-registration?
                </p>

                <div className="mt-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Reason (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Visitor visit rescheduled"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-2.5">
                  <button
                    disabled={isSubmitting}
                    onClick={() => {
                      setCancellingId(null);
                      setCancelReason("");
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Keep Pass
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={handleCancel}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
                  >
                    {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
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
