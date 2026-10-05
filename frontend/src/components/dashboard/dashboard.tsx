"use client";
import { Component, useMemo, type ErrorInfo, type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import {
  Users,
  ShieldCheck,
  Building2,
  DoorOpen,
  BedDouble,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  FileText,
  CalendarCheck,
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
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";
import type { Role } from "@/types";

class DashboardErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {}
  render() {
    return this.state.hasError ? (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Unable to load dashboard data. Please try again later.
      </div>
    ) : (
      this.props.children
    );
  }
}

function AdminDashboard() {
  const occupancy = useQuery(api.admin.occupancy);
  if (occupancy === undefined) {
    return <div className="animate-pulse rounded-xl bg-slate-200 p-8 text-sm text-slate-500">Loading dashboard data...</div>;
  }

  const statCards = [
    { label: "Total Students", value: occupancy.students, icon: Users, color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
    { label: "Active Wardens", value: occupancy.activeWardens, icon: ShieldCheck, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
    { label: "Hostels", value: occupancy.hostels, icon: Building2, color: "text-blue-600 bg-blue-50 border-blue-100" },
    { label: "Total Rooms", value: occupancy.rooms, icon: DoorOpen, color: "text-purple-600 bg-purple-50 border-purple-100" },
    { label: "Total Beds", value: occupancy.beds, icon: BedDouble, color: "text-slate-600 bg-slate-100 border-slate-200" },
    { label: "Occupied Beds", value: occupancy.occupiedBeds, icon: CheckCircle2, color: "text-amber-600 bg-amber-50 border-amber-100" },
    { label: "Available Beds", value: occupancy.availableBeds, icon: BedDouble, color: "text-teal-600 bg-teal-50 border-teal-100" },
    { label: "Occupancy Rate", value: `${occupancy.occupancyPercent}%`, icon: TrendingUp, color: "text-rose-600 bg-rose-50 border-rose-100" },
  ];

  return (
    <div className="space-y-8">
      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{stat.value}</p>
                </div>
                <div className={`rounded-xl p-3 border ${stat.color}`}>
                  <Icon size={22} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Overview & Quick Actions Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Occupancy Overview */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Occupancy & Capacity Overview</h2>
              <p className="text-xs text-slate-500">Live system-wide bed distribution across all hostels</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              {occupancy.occupancyPercent}% Occupied
            </span>
          </div>

          <div className="space-y-4">
            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden flex">
              <div
                style={{ width: `${occupancy.occupancyPercent}%` }}
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-4 pt-2 text-center text-sm">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <span className="text-xs text-slate-500">Total Capacity</span>
                <p className="mt-1 text-lg font-bold text-slate-800">{occupancy.beds} beds</p>
              </div>
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                <span className="text-xs text-indigo-600 font-medium">Occupied</span>
                <p className="mt-1 text-lg font-bold text-indigo-900">{occupancy.occupiedBeds} beds</p>
              </div>
              <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-3">
                <span className="text-xs text-teal-600 font-medium">Available</span>
                <p className="mt-1 text-lg font-bold text-teal-900">{occupancy.availableBeds} beds</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">Quick Management</h2>
            <div className="space-y-2.5">
              <Link
                href="/admin/hostels"
                className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Building2 size={18} className="text-indigo-600" />
                  <span>Manage Hostels</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </Link>
              <Link
                href="/admin/students"
                className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Users size={18} className="text-indigo-600" />
                  <span>Manage Students</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </Link>
              <Link
                href="/admin/wardens"
                className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck size={18} className="text-indigo-600" />
                  <span>Manage Wardens</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </Link>
              <Link
                href="/admin/fees"
                className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <CreditCard size={18} className="text-indigo-600" />
                  <span>Fee Management</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </Link>
              <Link
                href="/admin/electricity"
                className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Zap size={18} className="text-indigo-600" />
                  <span>Electricity & Meters</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </Link>
              <Link
                href="/admin/mess"
                className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Utensils size={18} className="text-indigo-600" />
                  <span>Mess & Food Quality</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </Link>
              <Link
                href="/admin/leaves"
                className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <PlaneTakeoff size={18} className="text-indigo-600" />
                  <span>Student Leaves</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </Link>
              <Link
                href="/admin/permissions"
                className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <KeyRound size={18} className="text-indigo-600" />
                  <span>Gate Permissions</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </Link>
              <Link
                href="/admin/visitors"
                className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <UserCheck size={18} className="text-indigo-600" />
                  <span>Visitor Desk</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </Link>
              <Link
                href="/admin/maintenance"
                className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Wrench size={18} className="text-indigo-600" />
                  <span>Maintenance & RMS</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </Link>
              <Link
                href="/admin/complaints"
                className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle size={18} className="text-indigo-600" />
                  <span>Student Complaints</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </Link>
              <Link
                href="/admin/requests"
                className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-indigo-600" />
                  <span>View Student Requests</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WardenDashboard() {
  const metrics = useQuery(api.warden.dashboard);
  const todayTs = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const todayAttendance = useQuery(api.attendance.listForWarden, { date: todayTs });
  const pendingRequests = useQuery(api.requests.listForWarden, { statusFilter: "PENDING" });
  const pendingTransfers = useQuery(api.transferRequests.listForWarden, { statusFilter: "PENDING" });

  if (metrics === undefined) {
    return (
      <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-xs">
        <div className="h-6 w-48 bg-slate-200 rounded-md mb-4" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Calculate today's attendance stats if loaded
  let presentCount = 0;
  let absentCount = 0;
  if (todayAttendance) {
    for (const rec of todayAttendance) {
      if (rec.status === "PRESENT" || rec.status === "LATE") presentCount++;
      else if (rec.status === "ABSENT") absentCount++;
    }
  }
  const totalMarked = presentCount + absentCount;
  const attendancePercent = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;

  const cards = [
    { label: "Assigned Students", value: metrics.students, icon: Users, color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
    { label: "Occupied Beds", value: metrics.occupiedBeds, icon: CheckCircle2, color: "text-amber-600 bg-amber-50 border-amber-100" },
    { label: "Available Beds", value: metrics.availableBeds, icon: BedDouble, color: "text-teal-600 bg-teal-50 border-teal-100" },
    {
      label: "Attendance Today",
      value: todayAttendance === undefined ? "—" : `${attendancePercent}%`,
      subtext: todayAttendance ? `${presentCount} present / ${totalMarked} marked` : "Loading...",
      icon: CalendarCheck,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    {
      label: "Pending Requests",
      value: pendingRequests === undefined ? "—" : pendingRequests.length,
      icon: FileText,
      color: "text-purple-600 bg-purple-50 border-purple-100",
    },
    {
      label: "Transfer Requests",
      value: pendingTransfers === undefined ? "—" : pendingTransfers.length,
      icon: TrendingUp,
      color: "text-rose-600 bg-rose-50 border-rose-100",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-5 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{stat.value}</p>
                  {"subtext" in stat && stat.subtext && (
                    <p className="mt-1 text-xs font-medium text-slate-400">{stat.subtext}</p>
                  )}
                </div>
                <div className={`rounded-xl p-3 border ${stat.color}`}>
                  <Icon size={22} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Main Operations & Occupancy Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Hostel Occupancy & Attendance Status */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hostel Occupancy Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Hostel Occupancy Health</h2>
                <p className="text-xs text-slate-500">Live bed distribution across your assigned hostels</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                {metrics.occupancyPercent}% Occupied
              </span>
            </div>

            <div className="space-y-4">
              <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden flex">
                <div
                  style={{ width: `${metrics.occupancyPercent}%` }}
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-4 pt-1 text-center text-sm">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <span className="text-xs text-slate-500 font-medium">Total Capacity</span>
                  <p className="mt-1 text-lg font-bold text-slate-800">{metrics.beds} Beds</p>
                </div>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                  <span className="text-xs text-indigo-600 font-medium">Occupied</span>
                  <p className="mt-1 text-lg font-bold text-indigo-900">{metrics.occupiedBeds} Beds</p>
                </div>
                <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-3">
                  <span className="text-xs text-teal-600 font-medium">Available</span>
                  <p className="mt-1 text-lg font-bold text-teal-900">{metrics.availableBeds} Beds</p>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Attendance Overview */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Today's Attendance Status</h2>
                <p className="text-xs text-slate-500">Daily verification for residents in your jurisdiction</p>
              </div>
              <Link
                href="/warden/attendance"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                Go to Attendance <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Present</p>
                <p className="mt-2 text-2xl font-bold text-emerald-800">{presentCount}</p>
                <p className="mt-0.5 text-xs text-emerald-600">Students Verified</p>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">Absent</p>
                <p className="mt-2 text-2xl font-bold text-rose-800">{absentCount}</p>
                <p className="mt-0.5 text-xs text-rose-600">Unaccounted / Absent</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Attendance Rate</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{attendancePercent}%</p>
                <p className="mt-0.5 text-xs text-slate-500">Compliance Ratio</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
              Quick Operations
            </h2>
            <div className="space-y-2.5">
              <Link
                href="/warden/attendance"
                className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <CalendarCheck size={18} className="text-indigo-600" />
                  <span>Mark Attendance</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </Link>
              <Link
                href="/warden/electricity"
                className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Zap size={18} className="text-indigo-600" />
                  <span>Room Electricity & Meters</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </Link>
              <Link
                href="/warden/mess"
                className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Utensils size={18} className="text-indigo-600" />
                  <span>Mess Attendance & Menus</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </Link>
              <Link
                href="/warden/leaves"
                className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <PlaneTakeoff size={18} className="text-indigo-600" />
                  <span>Student Leaves</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </Link>
              <Link
                href="/warden/permissions"
                className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <KeyRound size={18} className="text-indigo-600" />
                  <span>Gate Permissions</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </Link>
              <Link
                href="/warden/visitors"
                className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <UserCheck size={18} className="text-indigo-600" />
                  <span>Visitor Desk</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </Link>
              <Link
                href="/warden/maintenance"
                className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Wrench size={18} className="text-indigo-600" />
                  <span>Hostel Maintenance</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </Link>
              <Link
                href="/warden/complaints"
                className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle size={18} className="text-indigo-600" />
                  <span>Grievances & Complaints</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </Link>
              <Link
                href="/warden/students"
                className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Users size={18} className="text-indigo-600" />
                  <span>View Students</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </Link>
              <Link
                href="/warden/requests"
                className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-indigo-600" />
                  <span>Review Requests</span>
                </div>
                {pendingRequests && pendingRequests.length > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                    {pendingRequests.length}
                  </span>
                )}
                {(!pendingRequests || pendingRequests.length === 0) && (
                  <ArrowRight size={16} className="text-slate-400" />
                )}
              </Link>
              <Link
                href="/warden/allocations"
                className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <BedDouble size={18} className="text-indigo-600" />
                  <span>Manage Allocations</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </Link>
              <Link
                href="/warden/transfer-requests"
                className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3.5 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <TrendingUp size={18} className="text-indigo-600" />
                  <span>Transfer Requests</span>
                </div>
                {pendingTransfers && pendingTransfers.length > 0 && (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">
                    {pendingTransfers.length}
                  </span>
                )}
                {(!pendingTransfers || pendingTransfers.length === 0) && (
                  <ArrowRight size={16} className="text-slate-400" />
                )}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Dashboard({ role }: { role: Role }) {
  return (
    <AppShell role={role}>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Overview</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          {role === "ADMIN" ? "Admin Dashboard" : role === "WARDEN" ? "Warden Dashboard" : "Dashboard"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {role === "ADMIN"
            ? "Comprehensive overview of hostel facilities, capacity, students, and active operations."
            : role === "WARDEN"
            ? "Overview of your assigned hostel blocks, student occupants, and daily operations."
            : "Welcome back to your hostel portal."}
        </p>
      </div>

      {role === "ADMIN" ? (
        <DashboardErrorBoundary>
          <AdminDashboard />
        </DashboardErrorBoundary>
      ) : role === "WARDEN" ? (
        <DashboardErrorBoundary>
          <WardenDashboard />
        </DashboardErrorBoundary>
      ) : (
        <div className="mt-6">
          <EmptyState title="Student Dashboard" description="Access your profile and accommodation details." />
        </div>
      )}
    </AppShell>
  );
}

