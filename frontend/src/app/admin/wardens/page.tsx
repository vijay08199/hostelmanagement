"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";

export default function Page() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "ACTIVE" | "INACTIVE">("");
  const [hostelId, setHostelId] = useState("");

  const wardens = useQuery(api.admin.listWardens, {
    search: search || undefined,
    statusFilter: status || undefined,
    hostelId: hostelId ? (hostelId as never) : undefined,
  });
  const hostels = useQuery(api.admin.listHostels);
  const users = useQuery(api.admin.listAvailableWardenUsers);

  const create = useMutation(api.admin.createWarden);
  const update = useMutation(api.admin.updateWarden);
  const updateStatus = useMutation(api.admin.updateWardenStatus);
  const updateHostels = useMutation(api.admin.updateWardenHostels);
  const provisionUser = useMutation(api.users.provisionByAdmin);

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [view, setView] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [userId, setUserId] = useState("");
  const [selectedHostels, setSelectedHostels] = useState<string[]>([]);
  const [provisionMode, setProvisionMode] = useState(false);
  const [newClerkId, setNewClerkId] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const active = wardens?.filter((w: any) => w.userStatus === "ACTIVE").length ?? 0;
  const assigned = new Set((wardens ?? []).flatMap((w: any) => w.assignedHostelIds)).size;

  function startAdd() {
    setEdit(null);
    setEmployeeId("");
    setUserId("");
    setSelectedHostels([]);
    setProvisionMode(false);
    setNewClerkId("");
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setOpen(true);
  }

  function startEdit(w: any) {
    setEdit(w);
    setEmployeeId(w.employeeId);
    setUserId(w.userId);
    setSelectedHostels(w.assignedHostelIds);
    setOpen(true);
  }

  function toggle(id: string) {
    setSelectedHostels((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      if (edit) {
        await update({ wardenId: edit._id, employeeId });
        await updateHostels({ wardenId: edit._id, assignedHostelIds: selectedHostels as never[] });
      } else if (provisionMode) {
        if (!newClerkId.trim() || !newName.trim() || !newEmail.trim() || !employeeId.trim()) {
          throw new Error("Clerk User ID, Full Name, Email, and Employee ID are required.");
        }
        const createdUserId = await provisionUser({
          identitySubject: newClerkId.trim(),
          name: newName.trim(),
          email: newEmail.trim(),
          phone: newPhone.trim() || undefined,
          role: "WARDEN",
        });
        await create({
          userId: createdUserId,
          employeeId: employeeId.trim(),
          assignedHostelIds: selectedHostels as never[],
        });
      } else {
        if (!userId || !employeeId.trim()) throw new Error("Application user and employee ID are required.");
        await create({ userId: userId as never, employeeId: employeeId.trim(), assignedHostelIds: selectedHostels as never[] });
      }
      setOpen(false);
      setMessage(edit ? "Warden updated successfully." : provisionMode ? "Warden provisioned and registered successfully." : "Warden registered successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save warden.");
    }
  }

  async function changeStatus(w: any) {
    if (!window.confirm(`${w.userStatus === "ACTIVE" ? "Deactivate" : "Activate"} ${w.name}?`)) return;
    try {
      await updateStatus({
        wardenId: w._id,
        status: w.userStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      });
      setMessage("Warden status updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update status.");
    }
  }

  return (
    <RoleGate role="ADMIN">
      <AppShell role="ADMIN">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Staff Administration</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Warden Management</h1>
              <p className="mt-1 text-sm text-slate-500">Oversee warden assignments, accounts, and residential facility jurisdictions.</p>
            </div>
            <button
              onClick={startAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Warden
            </button>
          </div>

          {/* Metrics */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Wardens</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{wardens?.length ?? 0}</p>
              <p className="mt-1 text-xs text-slate-500">Registered staff profiles</p>
            </Card>

            <Card className="p-5 border-emerald-100 bg-emerald-50/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Active Duty</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100/60 text-emerald-700">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-800">{active}</p>
              <p className="mt-1 text-xs text-emerald-600">Authorized active staff</p>
            </Card>

            <Card className="p-5 border-blue-100 bg-blue-50/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Covered Hostels</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100/60 text-blue-700">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tight text-blue-800">{assigned}</p>
              <p className="mt-1 text-xs text-blue-600">With designated warden oversight</p>
            </Card>
          </div>

          {/* Feedback alert */}
          {message && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-indigo-600" />
                <span>{message}</span>
              </div>
              <button onClick={() => setMessage("")} className="text-xs text-slate-400 hover:text-slate-600">
                Dismiss
              </button>
            </div>
          )}

          {/* Filters Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, employee ID..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
              >
                <option value="">All Operational Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
              <select
                value={hostelId}
                onChange={(e) => setHostelId(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
              >
                <option value="">All Hostel Assignments</option>
                {(hostels ?? []).map((h: any) => (
                  <option key={h._id} value={h._id}>
                    {h.name} ({h.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Add / Edit Drawer */}
          {open && (
            <Card className="p-6 border-indigo-100 bg-gradient-to-b from-indigo-50/20 to-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{edit ? "Edit Warden Profile" : "Register Warden"}</h2>
                  <p className="text-xs text-slate-500">Link an application user account to warden credentials and hostels.</p>
                </div>
                <button onClick={() => setOpen(false)} className="text-xs font-semibold text-slate-400 hover:text-slate-600">
                  Cancel
                </button>
              </div>
              <form onSubmit={save} className="space-y-4">
                {!edit && (
                  <div className="flex items-center gap-4 border-b border-slate-200/80 pb-3 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setProvisionMode(false)}
                      className={`pb-1 border-b-2 transition ${!provisionMode ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                    >
                      Select Provisioned User ({users?.length ?? 0} Available)
                    </button>
                    <button
                      type="button"
                      onClick={() => setProvisionMode(true)}
                      className={`pb-1 border-b-2 transition ${provisionMode ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                    >
                      + Provision by Clerk User ID
                    </button>
                  </div>
                )}

                {provisionMode && !edit ? (
                  <div className="grid gap-4 md:grid-cols-2 bg-indigo-50/40 p-4 rounded-xl border border-indigo-100">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Clerk User ID (`identitySubject`) <span className="text-rose-500">*</span>
                      <input
                        required
                        value={newClerkId}
                        onChange={(e) => setNewClerkId(e.target.value)}
                        placeholder="e.g. user_2... from Clerk Dashboard"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Full Name <span className="text-rose-500">*</span>
                      <input
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Prof. Rajesh Kumar"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Email Address <span className="text-rose-500">*</span>
                      <input
                        required
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="e.g. warden@test.com"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Phone Number (optional)
                      <input
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Application User Account <span className="text-rose-500">*</span>
                      {edit ? (
                        <input
                          value={edit.email}
                          disabled
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-sm text-slate-600 cursor-not-allowed"
                        />
                      ) : (
                        <select
                          required
                          value={userId}
                          onChange={(e) => setUserId(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="">Select eligible user account</option>
                          {(users ?? []).map((u: any) => (
                            <option key={u.id} value={u.id}>
                              {u.name} — {u.email}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Employee ID <span className="text-rose-500">*</span>
                      <input
                        required
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        placeholder="e.g. EMP-1042"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      />
                    </label>
                  </div>
                )}

                {provisionMode && !edit && (
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block">
                      Employee ID <span className="text-rose-500">*</span>
                      <input
                        required
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        placeholder="e.g. EMP-1042"
                        className="mt-1.5 w-full max-w-md rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      />
                    </label>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Assigned Residential Hostels</p>
                  <p className="text-xs text-slate-400 mb-2">Check each hostel this warden has operational oversight for:</p>
                  <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {(hostels ?? []).map((h: any) => (
                      <label
                        key={h._id}
                        className={`flex items-center gap-3 rounded-xl border p-3 text-sm cursor-pointer transition ${
                          selectedHostels.includes(h._id)
                            ? "border-indigo-500 bg-indigo-50/50 text-indigo-950 font-medium"
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedHostels.includes(h._id)}
                          onChange={() => toggle(h._id)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{h.name}</p>
                          <p className="text-xs text-slate-400 font-mono">{h.code}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                  >
                    {edit ? "Update Profile" : "Register Warden"}
                  </button>
                </div>
              </form>
            </Card>
          )}

          {/* Wardens Table */}
          {wardens === undefined ? (
            <div className="h-64 animate-pulse rounded-2xl bg-slate-100 p-8 text-sm text-slate-400">Loading wardens...</div>
          ) : wardens.length === 0 ? (
            <EmptyState
              title="No wardens registered"
              description="Invite or assign an eligible WARDEN application user to begin facility management."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    {["Warden Staff", "Employee ID", "Contact Info", "Assigned Hostels", "Status", "Actions"].map(
                      (label) => (
                        <th key={label} className="px-5 py-3.5">
                          {label}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {wardens.map((w: any) => {
                    const initials = w.name
                      ? w.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()
                      : "W";

                    return (
                      <tr key={w._id} className="hover:bg-slate-50/60 transition">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                              {initials}
                            </span>
                            <div>
                              <p className="font-bold text-slate-900">{w.name}</p>
                              <p className="text-xs text-slate-400 font-mono">{w.userId?.slice?.(0, 10)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-700">{w.employeeId}</td>
                        <td className="px-5 py-3.5">
                          <p className="text-slate-700 text-xs font-medium">{w.email}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{w.phone || "No phone registered"}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {w.hostels.length > 0 ? (
                              w.hostels.map((h: any) => (
                                <span
                                  key={h._id}
                                  className="inline-flex items-center rounded-lg bg-indigo-50 border border-indigo-100/60 px-2 py-0.5 text-xs font-semibold text-indigo-700"
                                >
                                  {h.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400 italic">No hostels assigned</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              w.userStatus === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {w.userStatus}
                          </span>
                        </td>
                        <td className="space-x-1.5 px-5 py-3.5 whitespace-nowrap">
                          <button
                            onClick={() => setView(w)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                          >
                            View
                          </button>
                          <button
                            onClick={() => startEdit(w)}
                            className="rounded-lg border border-indigo-200 bg-indigo-50/50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => changeStatus(w)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                          >
                            {w.userStatus === "ACTIVE" ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Details Modal */}
          {view && (
            <Card className="p-6 border-indigo-100 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">
                    {view.name
                      ? view.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()
                      : "W"}
                  </span>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{view.name}</h2>
                    <p className="text-xs text-slate-500">Employee ID: {view.employeeId}</p>
                  </div>
                </div>
                <button
                  onClick={() => setView(null)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Close
                </button>
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email Address</p>
                  <p className="mt-1 font-medium text-slate-800">{view.email}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Phone Number</p>
                  <p className="mt-1 font-medium text-slate-800">{view.phone || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Employee Identification</p>
                  <p className="mt-1 font-mono font-medium text-slate-800">{view.employeeId}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Account Status</p>
                  <p className="mt-1 font-semibold text-emerald-700">{view.userStatus}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Designated Facilities ({view.hostels.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {view.hostels.length > 0 ? (
                      view.hostels.map((h: any) => (
                        <span
                          key={h._id}
                          className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-900"
                        >
                          {h.name} ({h.code})
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No assigned hostels.</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </AppShell>
    </RoleGate>
  );
}

