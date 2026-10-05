"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";
import {
  Users,
  ShieldCheck,
  Building2,
  GraduationCap,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  UserCheck,
  UserX,
  ShieldAlert,
  ArrowRightLeft,
  Link as LinkIcon,
  Eye,
  X,
} from "lucide-react";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | "ADMIN" | "WARDEN" | "STUDENT">("");
  const [statusFilter, setStatusFilter] = useState<"" | "ACTIVE" | "INACTIVE" | "PENDING">("");

  const users = useQuery(api.users.listUsers, {
    search: search || undefined,
    role: roleFilter || undefined,
    status: statusFilter || undefined,
  });

  const stats = useQuery(api.users.getUserStats);
  const hostels = useQuery(api.admin.listHostels);

  const updateStatus = useMutation(api.users.updateUserStatus);
  const updateRole = useMutation(api.users.updateUserRole);
  const linkWarden = useMutation(api.users.linkWardenProfile);
  const linkStudent = useMutation(api.users.linkStudentProfile);

  // Modal states
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [viewUser, setViewUser] = useState<any>(null);
  const [roleModalUser, setRoleModalUser] = useState<any>(null);
  const [newRole, setNewRole] = useState<"ADMIN" | "WARDEN" | "STUDENT">("STUDENT");

  const [linkWardenUser, setLinkWardenUser] = useState<any>(null);
  const [wardenEmployeeId, setWardenEmployeeId] = useState("");
  const [wardenHostels, setWardenHostels] = useState<string[]>([]);

  const [linkStudentUser, setLinkStudentUser] = useState<any>(null);
  const [studentIdInput, setStudentIdInput] = useState("");
  const [rollNumberInput, setRollNumberInput] = useState("");
  const [departmentInput, setDepartmentInput] = useState("");
  const [programInput, setProgramInput] = useState("");
  const [yearInput, setYearInput] = useState<number | undefined>(undefined);

  const [busy, setBusy] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function notify(text: string, type: "success" | "error" = "success") {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  }

  async function handleStatusChange(userId: any, newStatus: "ACTIVE" | "INACTIVE" | "PENDING") {
    try {
      setBusy(true);
      await updateStatus({ userId, status: newStatus });
      notify(`User status updated to ${newStatus}.`);
    } catch (err: any) {
      notify(err.message || "Failed to update status", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleRoleChange() {
    if (!roleModalUser) return;
    try {
      setBusy(true);
      await updateRole({ userId: roleModalUser._id, role: newRole });
      notify(`User role changed to ${newRole}.`);
      setRoleModalUser(null);
    } catch (err: any) {
      notify(err.message || "Failed to change role", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveWardenLink() {
    if (!linkWardenUser || !wardenEmployeeId.trim()) return;
    try {
      setBusy(true);
      await linkWarden({
        userId: linkWardenUser._id,
        employeeId: wardenEmployeeId.trim(),
        assignedHostelIds: wardenHostels as never,
      });
      notify("Warden profile successfully linked.");
      setLinkWardenUser(null);
    } catch (err: any) {
      notify(err.message || "Failed to link warden profile", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveStudentLink() {
    if (!linkStudentUser || !studentIdInput.trim()) return;
    try {
      setBusy(true);
      await linkStudent({
        userId: linkStudentUser._id,
        studentId: studentIdInput.trim(),
        rollNumber: rollNumberInput || undefined,
        department: departmentInput || undefined,
        program: programInput || undefined,
        year: yearInput,
      });
      notify("Student profile successfully linked.");
      setLinkStudentUser(null);
    } catch (err: any) {
      notify(err.message || "Failed to link student profile", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RoleGate role="ADMIN">
      <AppShell role="ADMIN">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Access Management</h1>
              <p className="mt-1 text-sm text-slate-500">
                Control user authentication, provision application roles, manage approval statuses, and link residential profiles.
              </p>
            </div>
          </div>

          {/* Feedback banner */}
          {notification && (
            <div
              className={`p-4 rounded-xl border text-sm flex items-center justify-between ${
                notification.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              <span>{notification.text}</span>
              <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <Card className="p-4 flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Users</span>
              <span className="text-2xl font-extrabold text-slate-900 mt-1">{stats?.totalUsers ?? 0}</span>
            </Card>
            <Card className="p-4 flex flex-col justify-between border-emerald-100 bg-emerald-50/20">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Active</span>
              <span className="text-2xl font-extrabold text-emerald-700 mt-1">{stats?.active ?? 0}</span>
            </Card>
            <Card className="p-4 flex flex-col justify-between border-amber-100 bg-amber-50/20">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">Pending</span>
              <span className="text-2xl font-extrabold text-amber-700 mt-1">{stats?.pending ?? 0}</span>
            </Card>
            <Card className="p-4 flex flex-col justify-between border-slate-200 bg-slate-50/40">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Inactive</span>
              <span className="text-2xl font-extrabold text-slate-700 mt-1">{stats?.inactive ?? 0}</span>
            </Card>
            <Card className="p-4 flex flex-col justify-between border-indigo-100 bg-indigo-50/20">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Admins</span>
              <span className="text-2xl font-extrabold text-indigo-700 mt-1">{stats?.admins ?? 0}</span>
            </Card>
            <Card className="p-4 flex flex-col justify-between border-blue-100 bg-blue-50/20">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">Wardens</span>
              <span className="text-2xl font-extrabold text-blue-700 mt-1">{stats?.wardens ?? 0}</span>
            </Card>
            <Card className="p-4 flex flex-col justify-between border-teal-100 bg-teal-50/20">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-600">Students</span>
              <span className="text-2xl font-extrabold text-teal-700 mt-1">{stats?.students ?? 0}</span>
            </Card>
          </div>

          {/* Filters & Search */}
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-6 relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, employee ID, student ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                >
                  <option value="">All Roles</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="WARDEN">WARDEN</option>
                  <option value="STUDENT">STUDENT</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PENDING">PENDING</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Users Table */}
          <Card className="p-0 overflow-hidden">
            {!users ? (
              <div className="p-12 text-center text-sm text-slate-400">Loading user roster...</div>
            ) : users.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No users found"
                  description="No user records matched your filter criteria. Clear filters or wait for new user signups."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-5">User</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Linked Profile</th>
                      <th className="py-3.5 px-4">Registered</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {users.map((u: any) => (
                      <tr key={u._id} className="hover:bg-slate-50/50 transition">
                        {/* User Identity */}
                        <td className="py-3.5 px-5">
                          <div className="font-semibold text-slate-900">{u.name}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                        </td>

                        {/* Role Badge */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
                              u.role === "ADMIN"
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : u.role === "WARDEN"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {u.role === "ADMIN" && <ShieldCheck size={12} />}
                            {u.role === "WARDEN" && <Building2 size={12} />}
                            {u.role === "STUDENT" && <GraduationCap size={12} />}
                            <span>{u.role}</span>
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
                              u.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : u.status === "PENDING"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {u.status === "ACTIVE" && <CheckCircle2 size={12} />}
                            {u.status === "PENDING" && <Clock size={12} />}
                            {u.status === "INACTIVE" && <XCircle size={12} />}
                            <span>{u.status}</span>
                          </span>
                        </td>

                        {/* Linked Profile info */}
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {u.role === "WARDEN" ? (
                            u.wardenProfile ? (
                              <div>
                                <span className="font-semibold text-slate-800">Emp ID:</span>{" "}
                                {u.wardenProfile.employeeId}
                                {u.wardenProfile.hostels?.length > 0 && (
                                  <div className="text-[11px] text-slate-400">
                                    Hostels: {u.wardenProfile.hostels.map((h: any) => h.name).join(", ")}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setLinkWardenUser(u);
                                  setWardenEmployeeId("");
                                  setWardenHostels([]);
                                }}
                                className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                              >
                                <LinkIcon size={12} />
                                <span>Link Warden Profile</span>
                              </button>
                            )
                          ) : u.role === "STUDENT" ? (
                            u.studentProfile ? (
                              <div>
                                <span className="font-semibold text-slate-800">ID:</span>{" "}
                                {u.studentProfile.studentId}
                                {u.studentProfile.department && (
                                  <span className="text-[11px] text-slate-400">
                                    {" "}
                                    ({u.studentProfile.department})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setLinkStudentUser(u);
                                  setStudentIdInput("");
                                  setRollNumberInput("");
                                  setDepartmentInput("");
                                  setProgramInput("");
                                  setYearInput(undefined);
                                }}
                                className="text-teal-600 hover:text-teal-800 font-medium inline-flex items-center gap-1"
                              >
                                <LinkIcon size={12} />
                                <span>Link Student Profile</span>
                              </button>
                            )
                          ) : (
                            <span className="text-slate-400">System Administrator</span>
                          )}
                        </td>

                        {/* Registered date */}
                        <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {/* View Details */}
                            <button
                              title="View Details"
                              onClick={() => setViewUser(u)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                            >
                              <Eye size={14} />
                            </button>

                            {/* Assign Role */}
                            <button
                              title="Change Role"
                              onClick={() => {
                                setRoleModalUser(u);
                                setNewRole(u.role);
                              }}
                              className="p-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition"
                            >
                              <ArrowRightLeft size={14} />
                            </button>

                            {/* Link Profile */}
                            {u.role === "WARDEN" && (
                              <button
                                title="Configure Warden Profile"
                                onClick={() => {
                                  setLinkWardenUser(u);
                                  setWardenEmployeeId(u.wardenProfile?.employeeId || "");
                                  setWardenHostels(u.wardenProfile?.assignedHostelIds || []);
                                }}
                                className="p-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition"
                              >
                                <Building2 size={14} />
                              </button>
                            )}
                            {u.role === "STUDENT" && (
                              <button
                                title="Configure Student Profile"
                                onClick={() => {
                                  setLinkStudentUser(u);
                                  setStudentIdInput(u.studentProfile?.studentId || "");
                                  setRollNumberInput(u.studentProfile?.rollNumber || "");
                                  setDepartmentInput(u.studentProfile?.department || "");
                                  setProgramInput(u.studentProfile?.program || "");
                                  setYearInput(u.studentProfile?.year);
                                }}
                                className="p-1.5 rounded-lg border border-teal-200 text-teal-600 hover:bg-teal-50 transition"
                              >
                                <GraduationCap size={14} />
                              </button>
                            )}

                            {/* Activate Button */}
                            {u.status !== "ACTIVE" && (
                              <button
                                title="Activate User"
                                disabled={busy}
                                onClick={() => handleStatusChange(u._id, "ACTIVE")}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition"
                              >
                                Activate
                              </button>
                            )}

                            {/* Deactivate Button */}
                            {u.status === "ACTIVE" && (
                              <button
                                title="Deactivate User"
                                disabled={busy}
                                onClick={() => handleStatusChange(u._id, "INACTIVE")}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
                              >
                                Deactivate
                              </button>
                            )}

                            {/* Revoke Access Button */}
                            {u.status !== "PENDING" && (
                              <button
                                title="Revoke Access (Set Pending)"
                                disabled={busy}
                                onClick={() => handleStatusChange(u._id, "PENDING")}
                                className="px-2.5 py-1 rounded-lg border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-50 transition"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Role Change Modal */}
          {roleModalUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900">Change Application Role</h3>
                  <button onClick={() => setRoleModalUser(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={18} />
                  </button>
                </div>
                <div>
                  <p className="text-sm text-slate-600">
                    Select the role for <span className="font-semibold text-slate-900">{roleModalUser.name}</span> ({roleModalUser.email}).
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    This directly dictates which portal the user can access upon login.
                  </p>
                </div>
                <div className="space-y-2 pt-2">
                  {(["ADMIN", "WARDEN", "STUDENT"] as const).map((r) => (
                    <label
                      key={r}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                        newRole === r
                          ? "border-indigo-600 bg-indigo-50/50 text-indigo-900"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="assignedRole"
                          value={r}
                          checked={newRole === r}
                          onChange={() => setNewRole(r)}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-semibold text-sm">{r}</span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {r === "ADMIN" && "Full administrative control"}
                        {r === "WARDEN" && "Hostel block operations"}
                        {r === "STUDENT" && "Resident portal access"}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setRoleModalUser(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={busy}
                    onClick={handleRoleChange}
                    className="px-5 py-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                  >
                    Save Role
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Link Warden Profile Modal */}
          {linkWardenUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900">Configure Warden Profile</h3>
                  <button onClick={() => setLinkWardenUser(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={18} />
                  </button>
                </div>
                <div>
                  <p className="text-sm text-slate-600">
                    Assign employee credentials and residential facilities for{" "}
                    <span className="font-semibold text-slate-900">{linkWardenUser.name}</span>.
                  </p>
                </div>
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Employee ID *</label>
                    <input
                      type="text"
                      placeholder="e.g. WRD-2026-01"
                      value={wardenEmployeeId}
                      onChange={(e) => setWardenEmployeeId(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Hostels</label>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-3">
                      {hostels?.map((h) => {
                        const checked = wardenHostels.includes(h._id);
                        return (
                          <label
                            key={h._id}
                            className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer p-1.5 rounded hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setWardenHostels([...wardenHostels, h._id]);
                                } else {
                                  setWardenHostels(wardenHostels.filter((id) => id !== h._id));
                                }
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="font-semibold">{h.name}</span>
                            <span className="text-slate-400">({h.code})</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setLinkWardenUser(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={busy || !wardenEmployeeId.trim()}
                    onClick={handleSaveWardenLink}
                    className="px-5 py-2 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    Save Warden Profile
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Link Student Profile Modal */}
          {linkStudentUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900">Configure Student Profile</h3>
                  <button onClick={() => setLinkStudentUser(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={18} />
                  </button>
                </div>
                <div>
                  <p className="text-sm text-slate-600">
                    Link academic roster details for{" "}
                    <span className="font-semibold text-slate-900">{linkStudentUser.name}</span> ({linkStudentUser.email}).
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Student ID *</label>
                    <input
                      type="text"
                      placeholder="e.g. STU-2026-001"
                      value={studentIdInput}
                      onChange={(e) => setStudentIdInput(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Roll Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 21CS042"
                      value={rollNumberInput}
                      onChange={(e) => setRollNumberInput(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                    <input
                      type="text"
                      placeholder="e.g. Computer Science"
                      value={departmentInput}
                      onChange={(e) => setDepartmentInput(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Program</label>
                    <input
                      type="text"
                      placeholder="e.g. B.Tech"
                      value={programInput}
                      onChange={(e) => setProgramInput(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Year</label>
                    <input
                      type="number"
                      placeholder="e.g. 3"
                      value={yearInput ?? ""}
                      onChange={(e) => setYearInput(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setLinkStudentUser(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={busy || !studentIdInput.trim()}
                    onClick={handleSaveStudentLink}
                    className="px-5 py-2 rounded-xl bg-teal-600 text-sm font-semibold text-white hover:bg-teal-700 transition disabled:opacity-50"
                  >
                    Save Student Profile
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* View User Details Modal */}
          {viewUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900">User Access Details</h3>
                  <button onClick={() => setViewUser(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Name</span>
                    <span className="font-semibold text-slate-900">{viewUser.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Email</span>
                    <span className="font-semibold text-slate-900">{viewUser.email}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Clerk Identity Subject</span>
                    <span className="font-mono text-xs text-slate-600">{viewUser.identitySubject}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Assigned Role</span>
                    <span className="font-semibold text-slate-900">{viewUser.role}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Status</span>
                    <span className="font-semibold text-slate-900">{viewUser.status}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Account Created</span>
                    <span className="text-slate-700">{new Date(viewUser.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Last Updated</span>
                    <span className="text-slate-700">{new Date(viewUser.updatedAt).toLocaleString()}</span>
                  </div>

                  {viewUser.wardenProfile && (
                    <div className="mt-4 p-3 rounded-xl bg-blue-50/60 border border-blue-200/80">
                      <p className="font-bold text-xs text-blue-900 uppercase tracking-wider mb-1">
                        Warden Assignment
                      </p>
                      <p className="text-xs text-blue-800">
                        Employee ID: <span className="font-semibold">{viewUser.wardenProfile.employeeId}</span>
                      </p>
                      {viewUser.wardenProfile.hostels?.length > 0 && (
                        <p className="text-xs text-blue-800 mt-1">
                          Hostels: {viewUser.wardenProfile.hostels.map((h: any) => h.name).join(", ")}
                        </p>
                      )}
                    </div>
                  )}

                  {viewUser.studentProfile && (
                    <div className="mt-4 p-3 rounded-xl bg-teal-50/60 border border-teal-200/80">
                      <p className="font-bold text-xs text-teal-900 uppercase tracking-wider mb-1">
                        Student Academic Record
                      </p>
                      <p className="text-xs text-teal-800">
                        Student ID: <span className="font-semibold">{viewUser.studentProfile.studentId}</span>
                      </p>
                      {viewUser.studentProfile.rollNumber && (
                        <p className="text-xs text-teal-800">Roll: {viewUser.studentProfile.rollNumber}</p>
                      )}
                      {viewUser.studentProfile.department && (
                        <p className="text-xs text-teal-800">
                          {viewUser.studentProfile.program} {viewUser.studentProfile.department} (Year{" "}
                          {viewUser.studentProfile.year})
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setViewUser(null)}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800"
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

