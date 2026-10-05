"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import {
  UserCircle,
  Building2,
  BedDouble,
  CalendarCheck,
  FileText,
  ArrowRightLeft,
  ArrowRight,
  ShieldCheck,
  DoorOpen,
  Sparkles,
  CheckCircle2,
  Clock,
  CreditCard,
  Zap,
  Utensils,
  PlaneTakeoff,
  KeyRound,
  UserCheck,
  Wrench,
  AlertCircle,
} from "lucide-react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";

export default function Page() {
  const profileData = useQuery(api.studentProfile.mine);
  const attendanceRecords = useQuery(api.attendance.mine);
  const studentRequests = useQuery(api.requests.listForStudent);
  const transferRequests = useQuery(api.transferRequests.listForStudent);

  // Compute attendance rate
  const attendanceStats = useMemo(() => {
    if (!attendanceRecords || attendanceRecords.length === 0) return { rate: 100, present: 0, total: 0 };
    let present = 0;
    for (const r of attendanceRecords) {
      if (r.status === "PRESENT" || r.status === "LATE") present++;
    }
    const rate = Math.round((present / attendanceRecords.length) * 100);
    return { rate, present, total: attendanceRecords.length };
  }, [attendanceRecords]);

  // Compute pending requests count
  const pendingRequestsCount = useMemo(() => {
    if (!studentRequests) return 0;
    return studentRequests.filter((r) => r.status === "PENDING" || r.status === "IN_PROGRESS").length;
  }, [studentRequests]);

  // Latest transfer request
  const latestTransfer = useMemo(() => {
    if (!transferRequests || transferRequests.length === 0) return null;
    return transferRequests[0];
  }, [transferRequests]);

  const isLoading = profileData === undefined;

  return (
    <RoleGate role="STUDENT">
      <AppShell role="STUDENT">
        <div className="space-y-6">
          {isLoading ? (
            <div className="animate-pulse space-y-6">
              <div className="h-24 rounded-2xl bg-slate-200" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-28 rounded-2xl bg-slate-100" />
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Personalized Welcome Section */}
              <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 sm:p-8 text-white shadow-md">
                <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-200 backdrop-blur-xs mb-3 border border-white/10">
                      <Sparkles size={14} className="text-amber-300" />
                      <span>Student Resident Portal</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                      Welcome back, {profileData.student.firstName}!
                    </h1>
                    <p className="mt-1 text-sm text-indigo-200/90 max-w-xl">
                      Here is your personalized hostel overview, room status, attendance record, and active tickets.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-xl bg-white/10 px-3.5 py-2 text-xs font-mono font-medium backdrop-blur-xs border border-white/10">
                      ID: {profileData.student.studentId}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 px-3.5 py-2 text-xs font-semibold text-emerald-300 border border-emerald-400/30">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      {profileData.currentAllocation ? "Active Resident" : "Registered Student"}
                    </span>
                  </div>
                </div>

                {/* Subtle decorative background shapes */}
                <div className="absolute -top-12 -right-12 h-56 w-56 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
                <div className="absolute -bottom-8 right-1/4 h-40 w-40 rounded-full bg-purple-500/10 blur-xl pointer-events-none" />
              </div>

              {/* Status & Compliance Quick Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Attendance Summary */}
                <Card className="p-5 border-slate-200 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Attendance</p>
                      <p className="mt-1.5 text-3xl font-extrabold tracking-tight text-slate-900">
                        {attendanceRecords ? `${attendanceStats.rate}%` : "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {attendanceStats.present} of {attendanceStats.total} days verified
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-emerald-600">
                      <CalendarCheck size={22} />
                    </div>
                  </div>
                </Card>

                {/* Active Requests */}
                <Card className="p-5 border-slate-200 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">My Requests</p>
                      <p className="mt-1.5 text-3xl font-extrabold tracking-tight text-slate-900">
                        {studentRequests ? pendingRequestsCount : "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {pendingRequestsCount === 0 ? "All requests resolved" : "Pending warden review"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-blue-600">
                      <FileText size={22} />
                    </div>
                  </div>
                </Card>

                {/* Transfer Status */}
                <Card className="p-5 border-slate-200 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Transfer Status</p>
                      <p className="mt-1.5 text-xl font-bold tracking-tight text-slate-800">
                        {latestTransfer ? latestTransfer.status : "No Request"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {latestTransfer ? `Submitted ${new Date(latestTransfer.createdAt).toLocaleDateString()}` : "Ready to request"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-purple-100 bg-purple-50 p-3 text-purple-600">
                      <ArrowRightLeft size={22} />
                    </div>
                  </div>
                </Card>

                {/* Academic Profile */}
                <Card className="p-5 border-slate-200 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Program & Year</p>
                      <p className="mt-1.5 text-lg font-bold text-slate-900 line-clamp-1">
                        {profileData.student.program || profileData.student.department || "General"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {profileData.student.year ? `Year ${profileData.student.year}` : "Academic Enrolment"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-indigo-600">
                      <UserCircle size={22} />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Main Content Grid: Accommodation & Quick Actions */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Accommodation Details Card with Visual Graphic */}
                <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">My Accommodation</h2>
                      <p className="text-xs text-slate-500">Your assigned on-campus residential quarters</p>
                    </div>
                    {profileData.currentAllocation ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                        Allocated
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        Unallocated
                      </span>
                    )}
                  </div>

                  {profileData.currentAllocation ? (
                    <div className="space-y-6">
                      {/* Prominent Visual Room & Bed Feature Box */}
                      <div className="rounded-2xl border border-indigo-100 bg-linear-to-r from-indigo-50/70 via-white to-indigo-50/40 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-2xs">
                        <div className="flex items-center gap-4">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
                            <DoorOpen size={30} />
                          </div>
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                              Assigned Room
                            </span>
                            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                              Room {profileData.currentAllocation.room?.roomNumber}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {profileData.currentAllocation.hostel?.name} &bull; Floor {profileData.currentAllocation.floor?.name || "1"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-xl border border-indigo-200/80 bg-white px-5 py-3 shadow-2xs">
                          <BedDouble size={22} className="text-indigo-600" />
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Bed Slot
                            </span>
                            <p className="text-base font-extrabold text-indigo-900">
                              Bed {profileData.currentAllocation.bed?.label}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Facility Info Breakdown */}
                      <div className="grid gap-3 sm:grid-cols-3 text-sm">
                        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Hostel Facility
                          </span>
                          <p className="mt-1 font-bold text-slate-900">
                            {profileData.currentAllocation.hostel?.name}
                          </p>
                          <p className="text-xs font-mono text-slate-500">
                            Code: {profileData.currentAllocation.hostel?.code}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Block Details
                          </span>
                          <p className="mt-1 font-bold text-slate-900">
                            Block {profileData.currentAllocation.block?.name || "Main"}
                          </p>
                          <p className="text-xs text-slate-500">
                            Capacity: {profileData.currentAllocation.room?.capacity || 2} Occupants
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Allocation Date
                          </span>
                          <p className="mt-1 font-bold text-slate-900">
                            {new Date(profileData.currentAllocation.startDate).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-emerald-600 font-medium">Verified Resident</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <EmptyState
                      title="No room assigned yet"
                      description="You do not currently have an active hostel bed allocation. Please contact your hostel warden or administration office."
                    />
                  )}
                </div>

                {/* Quick Actions Panel */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
                      Quick Actions
                    </h2>
                    <div className="space-y-2.5">
                      <Link
                        href="/student/fees"
                        className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard size={18} className="text-indigo-600" />
                          <span>Hostel Fees & Receipts</span>
                        </div>
                        <ArrowRight size={16} className="text-slate-400" />
                      </Link>

                      <Link
                        href="/student/electricity"
                        className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Zap size={18} className="text-indigo-600" />
                          <span>Room Electricity</span>
                        </div>
                        <ArrowRight size={16} className="text-slate-400" />
                      </Link>

                      <Link
                        href="/student/mess"
                        className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Utensils size={18} className="text-indigo-600" />
                          <span>Mess & Dining Hall</span>
                        </div>
                        <ArrowRight size={16} className="text-slate-400" />
                      </Link>

                      <Link
                        href="/student/leaves"
                        className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <PlaneTakeoff size={18} className="text-indigo-600" />
                          <span>Hostel Leaves</span>
                        </div>
                        <ArrowRight size={16} className="text-slate-400" />
                      </Link>

                      <Link
                        href="/student/permissions"
                        className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <KeyRound size={18} className="text-indigo-600" />
                          <span>Gate Passes</span>
                        </div>
                        <ArrowRight size={16} className="text-slate-400" />
                      </Link>

                      <Link
                        href="/student/visitors"
                        className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <UserCheck size={18} className="text-indigo-600" />
                          <span>Guest Visitors</span>
                        </div>
                        <ArrowRight size={16} className="text-slate-400" />
                      </Link>

                      <Link
                        href="/student/maintenance"
                        className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Wrench size={18} className="text-indigo-600" />
                          <span>Room Maintenance</span>
                        </div>
                        <ArrowRight size={16} className="text-slate-400" />
                      </Link>

                      <Link
                        href="/student/complaints"
                        className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <AlertCircle size={18} className="text-indigo-600" />
                          <span>Grievance / Complaints</span>
                        </div>
                        <ArrowRight size={16} className="text-slate-400" />
                      </Link>

                      <Link
                        href="/student/attendance"
                        className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <CalendarCheck size={18} className="text-indigo-600" />
                          <span>View Attendance</span>
                        </div>
                        <ArrowRight size={16} className="text-slate-400" />
                      </Link>

                      <Link
                        href="/student/requests"
                        className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <FileText size={18} className="text-indigo-600" />
                          <span>Raise Request</span>
                        </div>
                        <ArrowRight size={16} className="text-slate-400" />
                      </Link>

                      <Link
                        href="/student/transfer-request"
                        className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <ArrowRightLeft size={18} className="text-indigo-600" />
                          <span>Transfer Request</span>
                        </div>
                        <ArrowRight size={16} className="text-slate-400" />
                      </Link>

                      <Link
                        href="/student/profile"
                        className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <UserCircle size={18} className="text-indigo-600" />
                          <span>My Profile</span>
                        </div>
                        <ArrowRight size={16} className="text-slate-400" />
                      </Link>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-xs text-slate-500">
                    <p className="font-semibold text-slate-700">Need emergency assistance?</p>
                    <p className="mt-1">Contact your warden office or the campus 24/7 security desk.</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </AppShell>
    </RoleGate>
  );
}

