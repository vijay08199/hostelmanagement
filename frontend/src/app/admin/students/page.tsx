"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Users, UserCheck, UserX, Plus, Search, Filter, Eye, Edit2, CheckCircle2, AlertCircle, X, Power } from "lucide-react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";
import { LoadingState } from "@/components/ui-states";

type Form = Record<string, string>;
const empty: Form = {
  firstName: "",
  middleName: "",
  lastName: "",
  studentId: "",
  rollNumber: "",
  registrationNumber: "",
  department: "",
  program: "",
  year: "",
  semester: "",
  section: "",
  academicYear: "",
  email: "",
  phone: "",
  guardianName: "",
  guardianPhone: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

const fields = [
  ["firstName", "First name", true],
  ["middleName", "Middle name", false],
  ["lastName", "Last name", true],
  ["studentId", "Student ID", true],
  ["rollNumber", "Roll number", false],
  ["registrationNumber", "Registration number", false],
  ["department", "Department", false],
  ["program", "Program", false],
  ["year", "Year", false],
  ["semester", "Semester", false],
  ["section", "Section", false],
  ["academicYear", "Academic year", false],
  ["email", "Email", false],
  ["phone", "Phone", false],
  ["guardianName", "Guardian name", false],
  ["guardianPhone", "Guardian phone", false],
  ["emergencyContactName", "Emergency contact", false],
  ["emergencyContactPhone", "Emergency phone", false],
] as const;

export default function Page() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "ACTIVE" | "INACTIVE">("");
  const [department, setDepartment] = useState("");
  const [program, setProgram] = useState("");
  const [year, setYear] = useState("");

  const students = useQuery(api.admin.listStudents, {
    search: search || undefined,
    statusFilter: status || undefined,
    departmentFilter: department || undefined,
    programFilter: program || undefined,
    yearFilter: year ? Number(year) : undefined,
  });

  const createStudent = useMutation(api.admin.createStudent);
  const updateStudent = useMutation(api.admin.updateStudent);
  const updateStatus = useMutation(api.admin.updateStudentStatus);

  const [form, setForm] = useState<Form>(empty);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const departments = useMemo(
    () => Array.from(new Set((students ?? []).map((s: any) => s.department).filter(Boolean))).sort(),
    [students]
  );
  const programs = useMemo(
    () => Array.from(new Set((students ?? []).map((s: any) => s.program).filter(Boolean))).sort(),
    [students]
  );

  const active = students?.filter((s: any) => s.status === "ACTIVE").length ?? 0;
  const inactive = students?.filter((s: any) => s.status === "INACTIVE").length ?? 0;

  function openEdit(student: any) {
    const next: Form = {};
    fields.forEach(([key]) => {
      next[key] = student[key] === undefined || student[key] === null ? "" : String(student[key]);
    });
    setForm(next);
    setEditing(student);
    setFormOpen(true);
    setMessage(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (!form.firstName.trim() || !form.lastName.trim() || !form.studentId.trim()) {
      setMessage({ type: "error", text: "First name, last name, and student ID are required." });
      return;
    }

    const data: any = { ...form };
    ["year", "semester"].forEach((key) => {
      if (data[key]) data[key] = Number(data[key]);
      else delete data[key];
    });
    Object.keys(data).forEach((key) => {
      if (!data[key]) delete data[key];
    });

    try {
      if (editing) {
        await updateStudent({ id: editing._id, ...data });
      } else {
        await createStudent(data);
      }
      setForm(empty);
      setEditing(null);
      setFormOpen(false);
      setMessage({
        type: "success",
        text: editing ? "Student record updated successfully." : "Student registered successfully.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to save student.",
      });
    }
  }

  async function changeStatus(student: any) {
    if (!window.confirm(`${student.status === "ACTIVE" ? "Deactivate" : "Activate"} ${student.firstName} ${student.lastName}?`))
      return;
    try {
      await updateStatus({
        studentId: student._id,
        status: student.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      });
      setMessage({
        type: "success",
        text: `Student ${student.firstName} status updated to ${student.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"}.`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to update status.",
      });
    }
  }

  const isLoading = students === undefined;

  return (
    <RoleGate role="ADMIN">
      <AppShell role="ADMIN">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Resident Directory</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Student Directory & Profiles</h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage student records, academic enrollment details, contact info, and account statuses.
              </p>
            </div>
            <button
              onClick={() => {
                setEditing(null);
                setForm(empty);
                setFormOpen(true);
                setMessage(null);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
            >
              <Plus size={18} />
              Add Student
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-4 border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Enrolled</p>
                  <p className="mt-1.5 text-2xl font-bold text-slate-900">{students?.length ?? 0}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-700">
                  <Users size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-emerald-100 bg-emerald-50/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Active Students</p>
                  <p className="mt-1.5 text-2xl font-bold text-emerald-800">{active}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-100/60 p-2.5 text-emerald-700">
                  <UserCheck size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-slate-200 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Inactive Records</p>
                  <p className="mt-1.5 text-2xl font-bold text-slate-700">{inactive}</p>
                </div>
                <div className="rounded-xl border border-slate-300 bg-white p-2.5 text-slate-700 shadow-2xs">
                  <UserX size={20} />
                </div>
              </div>
            </Card>
          </div>

          {/* Feedback message banner */}
          {message && (
            <div
              className={`flex items-center gap-3 rounded-2xl border p-4 text-sm ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Search & Filters */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="grid gap-3 md:grid-cols-5">
              <div className="md:col-span-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by student name, ID, roll number..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              <div>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">All Departments</option>
                  {departments.map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">All Programs</option>
                  {programs.map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Registration / Edit Modal Form */}
          {formOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
              <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-7 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b pb-4">
                  <h2 className="text-xl font-bold text-slate-900">{editing ? "Edit Student Profile" : "Register Student"}</h2>
                  <button
                    onClick={() => {
                      setFormOpen(false);
                      setEditing(null);
                    }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                  {fields.map(([key, label, required]) => (
                    <label key={key} className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      {label} {required && <span className="text-rose-500">*</span>}
                      <input
                        required={required}
                        value={form[key] ?? ""}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        type={key === "email" ? "email" : "text"}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-normal text-slate-900 focus:border-indigo-500 focus:outline-none"
                      />
                    </label>
                  ))}
                  <div className="flex justify-end gap-3 sm:col-span-2 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(null);
                        setForm(empty);
                        setFormOpen(false);
                      }}
                      className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700"
                    >
                      Save Student
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Students Directory Table */}
          {isLoading ? (
            <LoadingState />
          ) : students.length === 0 ? (
            <EmptyState title="No students found" description="Try adjusting your filters or register a new student record." />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Student</th>
                    <th className="px-4 py-3.5">Student ID</th>
                    <th className="px-4 py-3.5">Roll No.</th>
                    <th className="px-4 py-3.5">Department</th>
                    <th className="px-4 py-3.5">Program & Year</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student: any) => {
                    const initials = `${student.firstName?.[0] ?? ""}${student.lastName?.[0] ?? ""}`.toUpperCase() || "S";

                    return (
                      <tr key={student._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200">
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">
                                {[student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ")}
                              </div>
                              <div className="text-xs text-slate-400">{student.email || "No email"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-700 font-medium">
                          <span className="rounded-md bg-slate-100 px-2 py-1">{student.studentId}</span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 text-xs font-mono">{student.rollNumber || "—"}</td>
                        <td className="px-4 py-3.5 text-slate-700 text-xs">{student.department || "—"}</td>
                        <td className="px-4 py-3.5 text-slate-700 text-xs">
                          <div>{student.program || "General"}</div>
                          <div className="text-slate-400">{student.year ? `Year ${student.year}` : "—"}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              student.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                student.status === "ACTIVE" ? "bg-emerald-600" : "bg-slate-400"
                              }`}
                            ></span>
                            {student.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewing(student)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                              title="View Details"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => openEdit(student)}
                              className="rounded-lg border border-indigo-200 bg-indigo-50/50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
                              title="Edit Record"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => changeStatus(student)}
                              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition shadow-2xs ${
                                student.status === "ACTIVE"
                                  ? "border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100"
                                  : "border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                              title={student.status === "ACTIVE" ? "Deactivate" : "Activate"}
                            >
                              <Power size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Details Inspection Modal */}
          {viewing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
              <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-xl space-y-5">
                <div className="flex justify-between items-start border-b pb-4">
                  <div>
                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                      ID: {viewing.studentId}
                    </span>
                    <h2 className="mt-2 text-xl font-bold text-slate-900">
                      {viewing.firstName} {viewing.lastName}
                    </h2>
                  </div>
                  <button
                    onClick={() => setViewing(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2 max-h-72 overflow-y-auto">
                  {fields.map(([key, label]) => (
                    <div key={key} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                      <p className="mt-1 font-semibold text-slate-800 text-xs">{viewing[key] || "—"}</p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end border-t pt-3">
                  <button
                    onClick={() => setViewing(null)}
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

