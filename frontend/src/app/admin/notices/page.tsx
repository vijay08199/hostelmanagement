"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Plus, X, Search, Filter, Eye, Edit2, Archive, CheckCircle2, AlertCircle, Building2, Bell, Users, Calendar, Megaphone, Send } from "lucide-react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";
import { LoadingState } from "@/components/ui-states";
import type { Id } from "../../../../../backend/convex/_generated/dataModel";

type NoticeAudience = "ALL" | "STUDENTS" | "WARDENS" | "HOSTEL" | "SPECIFIC_ROLE";
type NoticeStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type UserRole = "ADMIN" | "WARDEN" | "STUDENT";

export default function AdminNoticesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [audienceFilter, setAudienceFilter] = useState<string>("");
  const [hostelFilter, setHostelFilter] = useState<string>("");

  const [isOpenForm, setIsOpenForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState<any | null>(null);
  const [previewNotice, setPreviewNotice] = useState<any | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<NoticeAudience>("ALL");
  const [roleTarget, setRoleTarget] = useState<UserRole>("STUDENT");
  const [targetHostelId, setTargetHostelId] = useState<string>("");
  const [expiryDateStr, setExpiryDateStr] = useState<string>("");
  const [formStatus, setFormStatus] = useState<NoticeStatus>("PUBLISHED");

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const hostels = useQuery(api.admin.listHostels);
  const notices = useQuery(api.notices.listForAdmin, {
    status: (statusFilter || undefined) as NoticeStatus | undefined,
    audience: (audienceFilter || undefined) as NoticeAudience | undefined,
    hostelId: (hostelFilter || undefined) as Id<"hostels"> | undefined,
    search: search.trim() || undefined,
  });

  const createMutation = useMutation(api.notices.create);
  const updateMutation = useMutation(api.notices.update);
  const publishMutation = useMutation(api.notices.publish);
  const archiveMutation = useMutation(api.notices.archive);

  const stats = useMemo(() => {
    if (!notices) return { total: 0, published: 0, draft: 0, archived: 0 };
    let published = 0;
    let draft = 0;
    let archived = 0;

    for (const n of notices) {
      if (n.status === "PUBLISHED") published++;
      else if (n.status === "DRAFT") draft++;
      else if (n.status === "ARCHIVED") archived++;
    }

    return { total: notices.length, published, draft, archived };
  }, [notices]);

  function openCreateModal() {
    setEditingNotice(null);
    setTitle("");
    setContent("");
    setAudience("ALL");
    setRoleTarget("STUDENT");
    setTargetHostelId("");
    setExpiryDateStr("");
    setFormStatus("PUBLISHED");
    setFeedback(null);
    setIsOpenForm(true);
  }

  function openEditModal(notice: any) {
    setEditingNotice(notice);
    setTitle(notice.title);
    setContent(notice.content);
    setAudience(notice.audience);
    setRoleTarget(notice.roleTarget ?? "STUDENT");
    setTargetHostelId(notice.hostelId ?? "");
    setExpiryDateStr(
      notice.expiresAt ? new Date(notice.expiresAt).toISOString().split("T")[0] : ""
    );
    setFormStatus(notice.status);
    setFeedback(null);
    setIsOpenForm(true);
  }

  async function handleSaveNotice(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setFeedback({ type: "error", message: "Title and content are required." });
      return;
    }
    if (audience === "HOSTEL" && !targetHostelId) {
      setFeedback({ type: "error", message: "Please select a target hostel." });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    const expiresAt = expiryDateStr ? new Date(`${expiryDateStr}T23:59:59`).getTime() : undefined;

    try {
      if (editingNotice) {
        await updateMutation({
          noticeId: editingNotice._id,
          title: title.trim(),
          content: content.trim(),
          audience,
          roleTarget: audience === "SPECIFIC_ROLE" ? roleTarget : undefined,
          hostelId: audience === "HOSTEL" ? (targetHostelId as Id<"hostels">) : undefined,
          expiresAt,
          status: formStatus,
        });
        setFeedback({ type: "success", message: "Notice updated successfully." });
      } else {
        await createMutation({
          title: title.trim(),
          content: content.trim(),
          audience,
          roleTarget: audience === "SPECIFIC_ROLE" ? roleTarget : undefined,
          hostelId: audience === "HOSTEL" ? (targetHostelId as Id<"hostels">) : undefined,
          expiresAt,
          status: formStatus,
        });
        setFeedback({ type: "success", message: "Notice created successfully." });
      }
      setIsOpenForm(false);
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to save notice." });
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish(noticeId: Id<"notices">) {
    if (!window.confirm("Publish this notice now? It will immediately become visible to the selected audience.")) {
      return;
    }
    try {
      await publishMutation({ noticeId });
      setFeedback({ type: "success", message: "Notice published." });
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to publish notice." });
    }
  }

  async function handleArchive(noticeId: Id<"notices">) {
    if (!window.confirm("Archive this notice? It will no longer be visible in the user notice center.")) {
      return;
    }
    try {
      await archiveMutation({ noticeId });
      setFeedback({ type: "success", message: "Notice archived." });
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to archive notice." });
    }
  }

  const isLoading = notices === undefined || hostels === undefined;

  return (
    <RoleGate role="ADMIN">
      <AppShell role="ADMIN">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Announcements</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Notice Board Management</h1>
              <p className="mt-1 text-sm text-slate-500">
                Publish announcements, administrative circulars, guidelines, and targeted notices.
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
            >
              <Plus size={18} />
              + Create Notice
            </button>
          </div>

          {/* Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4 border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Notices</p>
                  <p className="mt-1.5 text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-700">
                  <Megaphone size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-emerald-100 bg-emerald-50/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Published</p>
                  <p className="mt-1.5 text-2xl font-bold text-emerald-800">{stats.published}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-100/60 p-2.5 text-emerald-700">
                  <Bell size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-amber-100 bg-amber-50/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Drafts</p>
                  <p className="mt-1.5 text-2xl font-bold text-amber-800">{stats.draft}</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-100/60 p-2.5 text-amber-700">
                  <Edit2 size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-slate-200 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Archived</p>
                  <p className="mt-1.5 text-2xl font-bold text-slate-700">{stats.archived}</p>
                </div>
                <div className="rounded-xl border border-slate-300 bg-white p-2.5 text-slate-700 shadow-2xs">
                  <Archive size={20} />
                </div>
              </div>
            </Card>
          </div>

          {/* Filters Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Search size={14} /> Search Notices
                </label>
                <input
                  type="text"
                  placeholder="Title, content, or hostel..."
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
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Users size={14} /> Audience Filter
                </label>
                <select
                  value={audienceFilter}
                  onChange={(e) => setAudienceFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">All Audiences</option>
                  <option value="ALL">ALL (Campus-Wide)</option>
                  <option value="STUDENTS">STUDENTS ONLY</option>
                  <option value="WARDENS">WARDENS ONLY</option>
                  <option value="HOSTEL">SPECIFIC HOSTEL</option>
                  <option value="SPECIFIC_ROLE">SPECIFIC ROLE</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Building2 size={14} /> Hostel Filter
                </label>
                <select
                  value={hostelFilter}
                  onChange={(e) => setHostelFilter(e.target.value)}
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
            </div>
          </div>

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

          {/* Notices Table */}
          {isLoading ? (
            <LoadingState />
          ) : notices.length === 0 ? (
            <EmptyState
              title="No notices found"
              description="Click '+ Create Notice' above to post announcements or update filters."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Notice Title & Details</th>
                    <th className="px-4 py-3.5">Audience</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Published Date</th>
                    <th className="px-4 py-3.5">Expires</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {notices.map((n: any) => {
                    const publishedDate = n.publishedAt
                      ? new Intl.DateTimeFormat("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }).format(new Date(n.publishedAt))
                      : "—";

                    const expiryDate = n.expiresAt
                      ? new Intl.DateTimeFormat("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }).format(new Date(n.expiresAt))
                      : "Never";

                    return (
                      <tr key={n._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-900">{n.title}</div>
                          <div className="text-xs text-slate-400 line-clamp-1 max-w-sm">
                            {n.content}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 border border-indigo-100/50">
                            {n.audience} {n.hostelName ? `(${n.hostelName})` : ""}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {n.status === "PUBLISHED" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                              PUBLISHED
                            </span>
                          )}
                          {n.status === "DRAFT" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-600"></span>
                              DRAFT
                            </span>
                          )}
                          {n.status === "ARCHIVED" && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                              ARCHIVED
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 text-xs whitespace-nowrap">
                          {publishedDate}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 text-xs whitespace-nowrap">
                          {expiryDate}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setPreviewNotice(n)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                              title="Preview Notice"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => openEditModal(n)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition"
                              title="Edit Notice"
                            >
                              <Edit2 size={14} />
                            </button>
                            {n.status === "DRAFT" && (
                              <button
                                onClick={() => handlePublish(n._id)}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-2xs transition"
                                title="Publish"
                              >
                                Publish
                              </button>
                            )}
                            {n.status === "PUBLISHED" && (
                              <button
                                onClick={() => handleArchive(n._id)}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                                title="Archive"
                              >
                                <Archive size={14} />
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

          {/* Create / Edit Notice Modal */}
          {isOpenForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
              <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-7 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b pb-4">
                  <h3 className="text-xl font-bold text-slate-900">
                    {editingNotice ? "Edit Notice" : "Create New Notice"}
                  </h3>
                  <button
                    onClick={() => setIsOpenForm(false)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveNotice} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Notice Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Hostel Maintenance Scheduled for Weekend"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Target Audience
                      </label>
                      <select
                        value={audience}
                        onChange={(e) => setAudience(e.target.value as NoticeAudience)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="ALL">All (Entire Campus)</option>
                        <option value="STUDENTS">Students Only</option>
                        <option value="WARDENS">Wardens Only</option>
                        <option value="HOSTEL">Specific Hostel</option>
                        <option value="SPECIFIC_ROLE">Specific Role</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Publication Status
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as NoticeStatus)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="PUBLISHED">Published Immediately</option>
                        <option value="DRAFT">Save as Draft</option>
                      </select>
                    </div>
                  </div>

                  {audience === "HOSTEL" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Select Target Hostel *
                      </label>
                      <select
                        required
                        value={targetHostelId}
                        onChange={(e) => setTargetHostelId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="">Choose a hostel facility...</option>
                        {(hostels ?? []).map((h) => (
                          <option key={h._id} value={h._id}>
                            {h.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {audience === "SPECIFIC_ROLE" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Specific Target Role
                      </label>
                      <select
                        value={roleTarget}
                        onChange={(e) => setRoleTarget(e.target.value as UserRole)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="STUDENT">STUDENT</option>
                        <option value="WARDEN">WARDEN</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Expiration Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={expiryDateStr}
                      onChange={(e) => setExpiryDateStr(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Announcement Content *
                    </label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Write your notice message, instructions, or policy updates..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => setIsOpenForm(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : editingNotice ? "Save Changes" : "Publish Notice"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Preview Notice Modal */}
          {previewNotice && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
              <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-xl space-y-5">
                <div className="flex items-start justify-between border-b pb-4">
                  <div>
                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                      Audience: {previewNotice.audience} {previewNotice.hostelName ? `(${previewNotice.hostelName})` : ""}
                    </span>
                    <h3 className="mt-2 text-xl font-bold text-slate-900">
                      {previewNotice.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setPreviewNotice(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {previewNotice.content}
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 border-t pt-3">
                  <span>
                    Status: <strong className="text-slate-700">{previewNotice.status}</strong>
                  </span>
                  <span>
                    Published: {previewNotice.publishedAt ? new Date(previewNotice.publishedAt).toLocaleDateString() : "Draft"}
                  </span>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setPreviewNotice(null)}
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

