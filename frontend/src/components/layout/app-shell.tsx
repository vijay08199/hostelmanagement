"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bell,
  Menu,
  X,
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  CalendarCheck,
  FileText,
  ArrowRightLeft,
  Megaphone,
  History,
  BedDouble,
  UserCheck,
  UserCircle,
  HelpCircle,
  Compass,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { navigationFor } from "@/config/navigation";
import type { Role } from "@/types";
import { usePathname } from "next/navigation";

function getNavIcon(label: string) {
  switch (label.toLowerCase()) {
    case "dashboard":
      return LayoutDashboard;
    case "hostels":
      return Building2;
    case "students":
      return Users;
    case "wardens":
      return ShieldCheck;
    case "attendance":
      return CalendarCheck;
    case "requests":
      return FileText;
    case "transfer requests":
    case "transfer request":
      return ArrowRightLeft;
    case "allocations":
      return BedDouble;
    case "notices":
      return Megaphone;
    case "audit logs":
      return History;
    case "profile":
      return UserCircle;
    default:
      return Compass;
  }
}

function getNavGroup(label: string): string {
  const l = label.toLowerCase();
  if (l === "dashboard") return "OVERVIEW";
  if (["hostels", "students", "wardens", "profile"].includes(l)) return "MANAGEMENT";
  if (["attendance", "requests", "transfer requests", "transfer request", "allocations", "notices"].includes(l))
    return "OPERATIONS";
  if (["audit logs"].includes(l)) return "SYSTEM";
  return "OTHER";
}

export function AppShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const items = navigationFor(role);
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Group enabled items
  const enabledItems = items.filter((item) => item.enabled);
  const groups = Array.from(new Set(enabledItems.map((item) => getNavGroup(item.label))));

  const renderNavContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 py-4 mb-3 border-b border-slate-700/60">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
          <Building2 size={22} className="text-white" />
        </div>
        <div>
          <span className="block font-bold text-base tracking-tight text-white">CampusNest</span>
          <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-950/70 px-2 py-0.5 rounded-full border border-indigo-800/50">
            {role} Portal
          </span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-1 py-2">
        {groups.map((group) => {
          const groupItems = enabledItems.filter((i) => getNavGroup(i.label) === group);
          if (groupItems.length === 0) return null;

          return (
            <div key={group} className="space-y-1.5">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400/80">
                {group}
              </p>
              <div className="space-y-1">
                {groupItems.map((item) => {
                  const Icon = getNavIcon(item.label);
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                          : "text-slate-300 hover:bg-slate-800/80 hover:text-white hover:translate-x-0.5"
                      }`}
                    >
                      <Icon size={18} className={isActive ? "text-white" : "text-slate-400"} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom Profile Footer */}
      <div className="pt-4 border-t border-slate-700/60 mt-auto">
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-700/30">
          <div className="flex items-center gap-2.5 min-w-0">
            <UserButton afterSignOutUrl="/" />
            <div className="truncate">
              <p className="text-xs font-medium text-slate-200 truncate capitalize">{role.toLowerCase()} user</p>
              <p className="text-[10px] text-slate-400">Hostel Portal</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 bg-slate-900 p-5 text-white md:block border-r border-slate-800">
        {renderNavContent()}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 p-5 text-white shadow-2xl transition-transform duration-200 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="absolute right-4 top-5">
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        {renderNavContent()}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200/80 bg-white px-4 md:px-8 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700 capitalize">
                {role.toLowerCase()} Workspace
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
              <Bell size={18} />
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        {/* Scrollable Page Body */}
        <section className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </section>
      </main>
    </div>
  );
}

