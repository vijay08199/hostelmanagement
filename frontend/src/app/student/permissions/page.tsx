"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";

type PermissionType = "OUTING" | "NIGHT_OUT" | "WEEKEND" | "SPECIAL" | "OTHER";

export default function StudentPermissionsPage() {
  const permissions = useQuery(api.permissions.myPermissions, {}) || [];
  const requestPermission = useMutation(api.permissions.requestPermission);
  const cancelPermission = useMutation(api.permissions.cancelPermission);

  const [showModal, setShowModal] = useState(false);
  const [cancellingId, setCancellingId] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form
  const [form, setForm] = useState({
    permissionType: "OUTING" as PermissionType,
    date: new Date().toISOString().split("T")[0],
    startTime: "16:00",
    endTime: "20:00",
    destination: "",
    reason: "",
    emergencyContact: "",
  });

  const stats = useMemo(() => {
    return {
      total: permissions.length,
      pending: permissions.filter((p: any) => p.status === "PENDING").length,
      approved: permissions.filter((p: any) => p.status === "APPROVED").length,
      nightOutCount: permissions.filter((p: any) => p.permissionType === "NIGHT_OUT").length,
    };
  }, [permissions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.destination.trim() || !form.reason.trim() || !form.emergencyContact.trim()) {
      setMessage({ text: "Please complete all required fields.", type: "error" });
      return;
    }

    try {
      setIsSubmitting(true);
      await requestPermission({
        permissionType: form.permissionType,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        destination: form.destination.trim(),
        reason: form.reason.trim(),
        emergencyContact: form.emergencyContact.trim(),
      });
      setMessage({ text: "Permission request submitted for warden review.", type: "success" });
      setShowModal(false);
      setForm({
        permissionType: "OUTING",
        date: new Date().toISOString().split("T")[0],
        startTime: "16:00",
        endTime: "20:00",
        destination: "",
        reason: "",
        emergencyContact: "",
      });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to submit permission request.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!cancellingId) return;
    try {
      setIsSubmitting(true);
      await cancelPermission({
        id: cancellingId,
      });
      setMessage({ text: "Permission request cancelled.", type: "success" });
      setCancellingId(null);
      setCancelReason("");
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to cancel permission request.", type: "error" });
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

  function getTypeBadge(type: string) {
    switch (type) {
      case "NIGHT_OUT":
        return "bg-purple-50 text-purple-700 ring-1 ring-purple-600/20";
      case "OUTING":
        return "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20";
      case "WEEKEND":
        return "bg-teal-50 text-teal-700 ring-1 ring-teal-600/20";
      case "SPECIAL":
        return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
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
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Gate Permissions & Outings</h1>
              <p className="mt-1 text-sm text-slate-500">
                Request temporary gate exit passes, weekend outings, or night-out permissions.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
            >
              <span className="text-sm">+</span> Request Gate Pass
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
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Passes</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{stats.total}</p>
              <p className="mt-1 text-xs text-slate-500">All registered passes</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Review</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600">{stats.pending}</p>
              <p className="mt-1 text-xs text-amber-600 font-medium">Awaiting warden decision</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved Passes</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">{stats.approved}</p>
              <p className="mt-1 text-xs text-emerald-600 font-medium">Ready for gate exit</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Night-outs Taken</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-purple-600">{stats.nightOutCount}</p>
              <p className="mt-1 text-xs text-slate-500">Special night clearances</p>
            </Card>
          </div>

          {/* Permissions History List */}
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 bg-slate-50/75 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Your Permission History</h2>
              <p className="text-xs text-slate-500">View gate passes, timing details, and warden remarks.</p>
            </div>

            <div className="divide-y divide-slate-100">
              {permissions.length === 0 ? (
                <div className="p-8 text-center">
                  <EmptyState
                    title="No permission passes found"
                    description="You have not requested any gate passes yet. Click 'Request Gate Pass' to create one."
                  />
                </div>
              ) : (
                permissions.map((p: any) => (
                  <div key={p._id} className="p-5 transition-colors hover:bg-slate-50/50">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getTypeBadge(
                              p.permissionType
                            )}`}
                          >
                            {p.permissionType.replace("_", " ")}
                          </span>
                          <span className="font-semibold text-slate-900 text-sm">
                            {p.destination}
                          </span>
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getStatusBadge(p.status)}`}>
                            {p.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          Date: <span className="font-medium text-slate-800">{p.date}</span> • Timings:{" "}
                          <span className="font-mono text-slate-800">{p.startTime} - {p.endTime}</span>
                        </p>
                        <p className="text-xs text-slate-500">
                          Hostel: <span className="text-indigo-600">{p.hostel?.name || "Hostel"}</span> • Room {p.room?.roomNumber || "N/A"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {p.status === "PENDING" && (
                          <button
                            onClick={() => {
                              setCancellingId(p._id);
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
                        <strong className="text-slate-900">Reason:</strong> {p.reason}
                      </p>
                      <p className="mt-1 text-slate-500">
                        <strong>Emergency Contact:</strong> <span className="font-mono text-slate-700">{p.emergencyContact}</span>
                      </p>
                      {p.remarks && (
                        <div className="mt-2 rounded-lg bg-amber-50 p-2 text-amber-900 border border-amber-100">
                          <strong>Warden Remark:</strong> {p.remarks}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Request Permission Modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">Request Gate Permission</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Permission Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={form.permissionType}
                      onChange={(e) => setForm({ ...form, permissionType: e.target.value as PermissionType })}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="OUTING">Day Outing (Curfew Return)</option>
                      <option value="NIGHT_OUT">Night Out (Approved stay outside)</option>
                      <option value="WEEKEND">Weekend Pass</option>
                      <option value="SPECIAL">Special Academic / Event Pass</option>
                      <option value="OTHER">Other Purpose</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={form.date}
                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 p-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Out Time <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="time"
                        required
                        value={form.startTime}
                        onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 p-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                        In Time <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="time"
                        required
                        value={form.endTime}
                        onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 p-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Destination Location <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Central Library, City Mall, Project Lab"
                      value={form.destination}
                      onChange={(e) => setForm({ ...form, destination: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Emergency Phone Contact <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={form.emergencyContact}
                      onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Reason / Justification <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Explain reason for exit/late pass..."
                      value={form.reason}
                      onChange={(e) => setForm({ ...form, reason: e.target.value })}
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
                      {isSubmitting ? "Submitting..." : "Submit Pass Request"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Cancel Pass Modal */}
          {cancellingId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <h3 className="text-lg font-bold text-slate-900 text-rose-600">Cancel Permission Pass</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Withdraw this gate pass request?
                </p>

                <div className="mt-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Reason (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Change of schedule"
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
