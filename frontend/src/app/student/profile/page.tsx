"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { User, Lock, Edit3, CheckCircle2, AlertCircle, Phone, Mail, GraduationCap, ShieldAlert } from "lucide-react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui";

export default function Page() {
  const data = useQuery(api.studentProfile.mine);
  const update = useMutation(api.studentProfile.update);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!data) {
    return (
      <RoleGate role="STUDENT">
        <AppShell role="STUDENT">
          <div className="animate-pulse space-y-6">
            <div className="h-32 rounded-3xl bg-slate-200" />
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="h-48 rounded-2xl bg-slate-100" />
              <div className="h-48 rounded-2xl bg-slate-100" />
            </div>
          </div>
        </AppShell>
      </RoleGate>
    );
  }

  const student = data.student;
  const initials = `${student.firstName?.[0] ?? ""}${student.lastName?.[0] ?? ""}`.toUpperCase() || "S";

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const form = new FormData(event.currentTarget as HTMLFormElement);
    const args: any = {};
    [
      "middleName",
      "rollNumber",
      "registrationNumber",
      "department",
      "program",
      "section",
      "academicYear",
      "email",
      "phone",
      "guardianName",
      "guardianPhone",
      "emergencyContactName",
      "emergencyContactPhone",
    ].forEach((key) => (args[key] = String(form.get(key) || "")));
    ["year", "semester"].forEach((key) => (args[key] = form.get(key) ? Number(form.get(key)) : undefined));

    try {
      await update(args);
      setEditing(false);
      setMessage({ type: "success", text: "Your profile details have been successfully updated." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to update profile. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  interface ProfileField {
    key: string;
    label: string;
    locked?: boolean;
    type?: string;
  }

  const sections: { title: string; icon: any; fields: ProfileField[] }[] = [
    {
      title: "Personal Information",
      icon: User,
      fields: [
        { key: "firstName", label: "First Name", locked: true },
        { key: "middleName", label: "Middle Name", locked: false },
        { key: "lastName", label: "Last Name", locked: true },
        { key: "studentId", label: "Student ID", locked: true },
      ],
    },
    {
      title: "Academic Information",
      icon: GraduationCap,
      fields: [
        { key: "department", label: "Department", locked: false },
        { key: "program", label: "Program / Course", locked: false },
        { key: "year", label: "Current Year", locked: false, type: "number" },
        { key: "semester", label: "Semester", locked: false, type: "number" },
        { key: "section", label: "Section", locked: false },
        { key: "rollNumber", label: "Roll Number", locked: false },
        { key: "registrationNumber", label: "Registration Number", locked: false },
        { key: "academicYear", label: "Academic Year", locked: false },
      ],
    },
    {
      title: "Contact Information",
      icon: Mail,
      fields: [
        { key: "email", label: "Personal Email", locked: false, type: "email" },
        { key: "phone", label: "Phone Number", locked: false, type: "tel" },
        { key: "guardianName", label: "Guardian Name", locked: false },
        { key: "guardianPhone", label: "Guardian Contact", locked: false, type: "tel" },
      ],
    },
    {
      title: "Emergency Contact",
      icon: ShieldAlert,
      fields: [
        { key: "emergencyContactName", label: "Emergency Contact Person", locked: false },
        { key: "emergencyContactPhone", label: "Emergency Contact Phone", locked: false, type: "tel" },
      ],
    },
  ];

  return (
    <RoleGate role="STUDENT">
      <AppShell role="STUDENT">
        <div className="space-y-6">
          {/* Profile Header Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-extrabold text-white shadow-md">
                  {initials}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-mono font-bold text-indigo-700 border border-indigo-100">
                      {student.studentId}
                    </span>
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                      {student.status || "ACTIVE"}
                    </span>
                  </div>
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    {student.firstName} {student.middleName ? `${student.middleName} ` : ""}{student.lastName}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {student.program || "General Program"} {student.year ? `• Year ${student.year}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMessage(null);
                    setEditing(!editing);
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                    editing
                      ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      : "bg-indigo-600 text-white shadow-xs hover:bg-indigo-700"
                  }`}
                >
                  <Edit3 size={16} />
                  {editing ? "Cancel Editing" : "Edit Profile"}
                </button>
              </div>
            </div>
          </div>

          {/* Feedback Message Banner */}
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

          {/* Profile Form */}
          <form onSubmit={save} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {sections.map((section) => {
                const SectionIcon = section.icon;
                return (
                  <Card key={section.title} className="p-6">
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 mb-4">
                      <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                        <SectionIcon size={18} />
                      </div>
                      <h2 className="text-base font-bold text-slate-900">{section.title}</h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {section.fields.map(({ key, label, locked, type }) => {
                        const isReadOnly = !editing || locked;
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                                {label}
                              </label>
                              {locked && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                                  <Lock size={10} /> Locked
                                </span>
                              )}
                              {!locked && editing && (
                                <span className="text-[10px] font-semibold text-indigo-600">
                                  Editable
                                </span>
                              )}
                            </div>
                            <input
                              type={type || "text"}
                              name={key}
                              disabled={isReadOnly}
                              defaultValue={(student[key as keyof typeof student] as string) ?? ""}
                              className={`w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none transition-colors ${
                                isReadOnly
                                  ? "bg-slate-50/80 text-slate-600 cursor-not-allowed border-slate-200/60"
                                  : "bg-white border-slate-300 shadow-2xs"
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>

            {editing && (
              <div className="flex justify-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </form>
        </div>
      </AppShell>
    </RoleGate>
  );
}

