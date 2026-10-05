"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";

type ComplaintCategory =
  | "HOSTEL"
  | "FOOD"
  | "ROOMMATE"
  | "STAFF"
  | "FACILITY"
  | "DISCIPLINE"
  | "OTHER";

type ComplaintPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export default function StudentComplaintsPage() {
  const complaints = useQuery(api.complaints.myComplaints, {}) || [];
  const submitComplaint = useMutation(api.complaints.submitComplaint);
  const cancelComplaint = useMutation(api.complaints.cancelComplaint);
  const closeComplaint = useMutation(api.complaints.closeComplaint);

  const [showModal, setShowModal] = useState(false);
  const [cancellingId, setCancellingId] = useState<any>(null);
  const [closingComplaint, setClosingComplaint] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [rating, setRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form
  const [form, setForm] = useState({
    category: "HOSTEL" as ComplaintCategory,
    priority: "MEDIUM" as ComplaintPriority,
    subject: "",
    description: "",
    isAnonymous: false,
  });

  const stats = useMemo(() => {
    return {
      total: complaints.length,
      underReview: complaints.filter(
        (c: any) => c.status === "SUBMITTED" || c.status === "UNDER_REVIEW" || c.status === "IN_PROGRESS"
      ).length,
      resolved: complaints.filter((c: any) => c.status === "RESOLVED").length,
      closed: complaints.filter((c: any) => c.status === "CLOSED").length,
    };
  }, [complaints]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      setMessage({ text: "Please provide a subject and detailed description.", type: "error" });
      return;
    }

    try {
      setIsSubmitting(true);
      await submitComplaint({
        category: form.category,
        priority: form.priority,
        subject: form.subject.trim(),
        description: form.isAnonymous ? `[ANONYMOUS] ${form.description.trim()}` : form.description.trim(),
      });
      setMessage({ text: "Grievance submitted successfully. The warden has been notified.", type: "success" });
      setShowModal(false);
      setForm({
        category: "HOSTEL",
        priority: "MEDIUM",
        subject: "",
        description: "",
        isAnonymous: false,
      });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to submit grievance.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!cancellingId) return;
    try {
      setIsSubmitting(true);
      await cancelComplaint({
        id: cancellingId,
      });
      setMessage({ text: "Complaint withdrawn.", type: "success" });
      setCancellingId(null);
      setCancelReason("");
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to withdraw complaint.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCloseResolved() {
    if (!closingComplaint) return;
    try {
      setIsSubmitting(true);
      await closeComplaint({
        id: closingComplaint._id,
      });
      setMessage({ text: "Thank you for confirming resolution. Grievance closed.", type: "success" });
      setClosingComplaint(null);
      setFeedbackComments("");
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to close grievance.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "RESOLVED":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20";
      case "CLOSED":
        return "bg-slate-100 text-slate-700 ring-1 ring-slate-600/20";
      case "IN_PROGRESS":
        return "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20";
      case "UNDER_REVIEW":
        return "bg-purple-50 text-purple-700 ring-1 ring-purple-600/20";
      case "SUBMITTED":
        return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
      case "CANCELLED":
        return "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20";
      default:
        return "bg-slate-50 text-slate-700 ring-1 ring-slate-600/20";
    }
  }

  function getPriorityBadge(priority: string) {
    switch (priority) {
      case "URGENT":
        return "bg-rose-100 text-rose-800 font-bold animate-pulse";
      case "HIGH":
        return "bg-rose-50 text-rose-700 font-semibold";
      case "MEDIUM":
        return "bg-amber-50 text-amber-700";
      default:
        return "bg-slate-50 text-slate-600";
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
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Grievance & Complaints</h1>
              <p className="mt-1 text-sm text-slate-500">
                Submit complaints regarding hostel life, mess food, facilities, or disciplinary concerns with optional anonymity.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
            >
              <span className="text-sm">+</span> File Grievance
            </button>
          </div>

          {message && (
            <div
              className={`rounded-xl border px-4 py-2.5 text-xs flex items-center justify-between gap-2 ${message.type === "success"
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
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Grievances</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{stats.total}</p>
              <p className="mt-1 text-xs text-slate-500">Submitted tickets</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Under Review / Active</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600">{stats.underReview}</p>
              <p className="mt-1 text-xs text-amber-600 font-medium">Being reviewed by wardens</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Resolved</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">{stats.resolved}</p>
              <p className="mt-1 text-xs text-emerald-600 font-medium">Ready for confirmation</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Closed</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-600">{stats.closed}</p>
              <p className="mt-1 text-xs text-slate-500">Concluded cases</p>
            </Card>
          </div>

          {/* Complaints List */}
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 bg-slate-50/75 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Your Grievance Records</h2>
              <p className="text-xs text-slate-500">Track resolution progress and communication from hostel authorities.</p>
            </div>

            <div className="divide-y divide-slate-100">
              {complaints.length === 0 ? (
                <div className="p-8 text-center">
                  <EmptyState
                    title="No grievances filed"
                    description="You currently have no active or historical complaints. If you face any issues, click 'File Grievance'."
                  />
                </div>
              ) : (
                complaints.map((c: any) => (
                  <div key={c._id} className="p-5 transition-colors hover:bg-slate-50/50">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] ${getPriorityBadge(c.priority)}`}>
                            {c.priority}
                          </span>
                          <span className="font-semibold text-slate-900 text-sm">
                            {c.subject}
                          </span>
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getStatusBadge(c.status)}`}>
                            {c.status.replace("_", " ")}
                          </span>
                          {c.isAnonymous && (
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                              🔒 Anonymous
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          Category: <span className="font-medium text-slate-800">{c.category.replace("_", " ")}</span> • Submitted on:{" "}
                          <span className="font-medium text-slate-800">{new Date(c.createdAt).toLocaleDateString()}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {c.status === "RESOLVED" && (
                          <button
                            onClick={() => {
                              setClosingComplaint(c);
                              setRating(5);
                              setFeedbackComments("");
                            }}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
                          >
                            Confirm & Close
                          </button>
                        )}

                        {c.status === "SUBMITTED" && (
                          <button
                            onClick={() => {
                              setCancellingId(c._id);
                              setCancelReason("");
                            }}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                          >
                            Withdraw
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs border border-slate-100/80">
                      <p className="text-slate-700 whitespace-pre-wrap">{c.description}</p>
                      {c.resolutionRemarks && (
                        <div className="mt-2 rounded-lg bg-emerald-50 p-2.5 text-emerald-900 border border-emerald-100">
                          <strong>Resolution Actions:</strong> {c.resolutionRemarks}
                        </div>
                      )}
                      {c.staffRemarks && (
                        <div className="mt-2 rounded-lg bg-amber-50 p-2 text-amber-900 border border-amber-100">
                          <strong>Warden Notes:</strong> {c.staffRemarks}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* File Grievance Modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">File a Grievance</h3>
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
                        Category <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value as ComplaintCategory })}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="HOSTEL">Hostel & Living Space</option>
                        <option value="FOOD">Food & Mess Quality</option>
                        <option value="ROOMMATE">Roommate Disagreement</option>
                        <option value="STAFF">Hostel Staff Conduct</option>
                        <option value="FACILITY">Water / Electricity Facility</option>
                        <option value="DISCIPLINE">Noise & Discipline Concern</option>
                        <option value="OTHER">Other Concerns</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Urgency <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={form.priority}
                        onChange={(e) => setForm({ ...form, priority: e.target.value as ComplaintPriority })}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="LOW">Low (General suggestion)</option>
                        <option value="MEDIUM">Medium (Needs attention)</option>
                        <option value="HIGH">High (Disruptive issue)</option>
                        <option value="URGENT">Urgent (Safety / Harassment)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Subject / Summary <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Cold water in 2nd floor showers or Mess dinner delay"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Detailed Explanation <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Provide specific details, dates, or affected areas..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Anonymous Toggle */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="anonCheck"
                      checked={form.isAnonymous}
                      onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="anonCheck" className="text-xs text-slate-700 cursor-pointer">
                      <strong className="text-slate-900 block font-semibold">Submit Anonymously</strong>
                      Your name and room number will be hidden from reports to protect your privacy and safety.
                    </label>
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
                      {isSubmitting ? "Submitting..." : "Submit Grievance"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Confirm & Close Modal */}
          {closingComplaint && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <h3 className="text-lg font-bold text-slate-900 text-emerald-600">Confirm Grievance Resolution</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Rate the resolution quality for: <strong>{closingComplaint.subject}</strong>
                </p>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Satisfaction Rating
                    </label>
                    <div className="mt-1.5 flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setRating(star)}
                          className={`h-9 w-9 rounded-xl font-bold text-sm ${rating >= star
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-slate-100 text-slate-400"
                            }`}
                        >
                          ★ {star}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Comments on Resolution (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g., Problem was solved satisfactorily by warden"
                      value={feedbackComments}
                      onChange={(e) => setFeedbackComments(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2.5">
                  <button
                    disabled={isSubmitting}
                    onClick={() => {
                      setClosingComplaint(null);
                      setFeedbackComments("");
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={handleCloseResolved}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isSubmitting ? "Closing..." : "Close Grievance"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Withdraw Complaint Modal */}
          {cancellingId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <h3 className="text-lg font-bold text-slate-900 text-rose-600">Withdraw Grievance</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Are you sure you want to withdraw this complaint?
                </p>

                <div className="mt-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Reason (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Mistake or resolved mutually"
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
                    Keep Grievance
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={handleCancel}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
                  >
                    {isSubmitting ? "Withdrawing..." : "Confirm Withdrawal"}
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
