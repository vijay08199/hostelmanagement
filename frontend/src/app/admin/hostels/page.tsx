"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";

export default function Page() {
  const hostels = useQuery(api.admin.listHostels);
  const createHostel = useMutation(api.admin.createHostel);
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", code: "", description: "", status: "ACTIVE" as "ACTIVE" | "INACTIVE" });
  const details = useQuery(api.admin.getHostel, selected ? { hostelId: selected as never } : "skip");

  // Aggregate Metrics
  const metrics = useMemo(() => {
    if (!hostels) return { total: 0, active: 0, totalBeds: 0, occupiedBeds: 0, occupancyRate: 0 };
    const total = hostels.length;
    const active = hostels.filter((h: any) => h.status === "ACTIVE").length;
    const totalBeds = hostels.reduce((sum: number, h: any) => sum + (h.totalBeds || 0), 0);
    const occupiedBeds = hostels.reduce((sum: number, h: any) => sum + (h.occupiedBeds || 0), 0);
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
    return { total, active, totalBeds, occupiedBeds, occupancyRate };
  }, [hostels]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    if (!form.name.trim() || !form.code.trim()) {
      setMessage("Name and code are required.");
      return;
    }
    try {
      await createHostel({
        ...form,
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || undefined,
      });
      setForm({ name: "", code: "", description: "", status: "ACTIVE" });
      setOpen(false);
      setMessage("Hostel created successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create hostel.");
    }
  }

  return (
    <RoleGate role="ADMIN">
      <AppShell role="ADMIN">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Administration & Facilities</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Hostel Management</h1>
              <p className="mt-1 text-sm text-slate-500">Configure residential buildings, blocks, floors, rooms, and bed capacity.</p>
            </div>
            <button
              onClick={() => setOpen(!open)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} />
              </svg>
              {open ? "Close Form" : "Add Hostel"}
            </button>
          </div>

          {/* Metric Overview Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Hostels</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{metrics.total}</p>
              <p className="mt-1 text-xs text-slate-500">Configured campuses</p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Facilities</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-600">{metrics.active}</p>
              <p className="mt-1 text-xs text-slate-500">Ready for student boarding</p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Bed Capacity</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{metrics.totalBeds}</p>
              <p className="mt-1 text-xs text-slate-500">{metrics.occupiedBeds} currently assigned</p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Occupancy Rate</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-3xl font-bold tracking-tight text-slate-900">{metrics.occupancyRate}%</p>
                <span className="text-xs text-slate-500 font-medium">overall</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${Math.min(metrics.occupancyRate, 100)}%` }}
                />
              </div>
            </Card>
          </div>

          {/* Feedback message */}
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

          {/* Create Hostel Form Drawer */}
          {open && (
            <Card className="p-6 border-indigo-100 bg-gradient-to-b from-indigo-50/20 to-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Add New Residential Hostel</h2>
                  <p className="text-xs text-slate-500">Provide fundamental metadata before configuring blocks and rooms.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-xs font-medium text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>
              <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Hostel Name <span className="text-rose-500">*</span>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Nilgiri Boys Hostel"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-normal text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Hostel Code <span className="text-rose-500">*</span>
                  <input
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="e.g. NBH-A"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-normal text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 md:col-span-2">
                  Description
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="General description, residential amenities, or campus zone..."
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-normal text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Operational Status
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as "ACTIVE" | "INACTIVE" })}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-normal text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </label>
                <div className="flex items-end justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                  >
                    Save Hostel
                  </button>
                </div>
              </form>
            </Card>
          )}

          {/* Hostel Cards Grid */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Residential Buildings</h2>
              <span className="text-xs text-slate-400">Click a hostel to inspect room hierarchy</span>
            </div>

            {hostels === undefined ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : hostels.length === 0 ? (
              <EmptyState title="No hostels yet" description="Create your first hostel to start building blocks, floors, and rooms." />
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {hostels.map((hostel) => {
                  const isSelected = selected === hostel._id;
                  const occPercent = hostel.totalBeds > 0 ? Math.round((hostel.occupiedBeds / hostel.totalBeds) * 100) : 0;
                  return (
                    <Card
                      key={hostel._id}
                      className={`p-5 cursor-pointer border transition-all ${
                        isSelected
                          ? "border-indigo-600 ring-2 ring-indigo-500/20 shadow-md bg-indigo-50/10"
                          : "hover:border-slate-300 hover:shadow-sm"
                      }`}
                      onClick={() => setSelected(isSelected ? null : hostel._id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 group-hover:text-indigo-600">{hostel.name}</h3>
                            <span className="font-mono text-xs font-semibold text-slate-400">{hostel.code}</span>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            hostel.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {hostel.status}
                        </span>
                      </div>

                      <p className="mt-3 text-xs text-slate-500 line-clamp-2 min-h-[32px]">
                        {hostel.description || "Residential boarding facility."}
                      </p>

                      {/* Mini stats breakdown */}
                      <div className="mt-4 grid grid-cols-4 gap-2 border-t border-slate-100 pt-3 text-center">
                        <div className="rounded-lg bg-slate-50 p-2">
                          <p className="text-[10px] uppercase font-semibold text-slate-400">Blocks</p>
                          <p className="mt-0.5 text-sm font-bold text-slate-800">{hostel.blockCount}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-2">
                          <p className="text-[10px] uppercase font-semibold text-slate-400">Rooms</p>
                          <p className="mt-0.5 text-sm font-bold text-slate-800">{hostel.roomCount}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-2">
                          <p className="text-[10px] uppercase font-semibold text-slate-400">Beds</p>
                          <p className="mt-0.5 text-sm font-bold text-slate-800">{hostel.totalBeds}</p>
                        </div>
                        <div className="rounded-lg bg-indigo-50/60 p-2 border border-indigo-100/50">
                          <p className="text-[10px] uppercase font-semibold text-indigo-500">Filled</p>
                          <p className="mt-0.5 text-sm font-bold text-indigo-700">{hostel.occupiedBeds}</p>
                        </div>
                      </div>

                      {/* Occupancy progress bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                          <span>Occupancy</span>
                          <span className="font-semibold text-slate-700">{occPercent}%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              occPercent > 90 ? "bg-rose-500" : occPercent > 70 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(occPercent, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-indigo-600 font-medium pt-1">
                        <span>{isSelected ? "Hide Structure ▲" : "View Structure ▼"}</span>
                        {isSelected && <span className="text-[11px] text-slate-400">Selected</span>}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Hostel Hierarchy Viewer */}
          {selected && details && (
            <Card className="p-6 border-indigo-100 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-600" />
                    <h2 className="text-xl font-bold text-slate-900">{details.name} Hierarchy</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Structured tree: Hostel &rarr; Residential Blocks &rarr; Floors &rarr; Rooms &rarr; Beds
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Close View
                </button>
              </div>

              {details.blocks.length === 0 ? (
                <EmptyState title="No blocks configured" description="Blocks and rooms have not yet been assigned to this hostel." />
              ) : (
                <div className="space-y-5">
                  {details.blocks.map((block) => (
                    <div key={block._id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white font-bold text-slate-800 shadow-xs border border-slate-200 text-xs">
                            {block.code}
                          </span>
                          <div>
                            <h3 className="font-bold text-slate-900">{block.name}</h3>
                            <p className="text-xs text-slate-400">{block.floors.length} Floors Configured</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200">
                          Block Code: {block.code}
                        </span>
                      </div>

                      <div className="mt-4 space-y-4">
                        {block.floors.map((floor) => (
                          <div key={floor._id} className="ml-2 sm:ml-4 border-l-2 border-indigo-300 pl-4 sm:pl-5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{floor.name}</span>
                              <span className="text-[11px] text-slate-400">({floor.rooms.length} Rooms)</span>
                            </div>
                            <div className="mt-2.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                              {floor.rooms.map((room) => (
                                <div key={room._id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-900">Room {room.roomNumber}</span>
                                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">
                                      {room.roomType}
                                    </span>
                                  </div>
                                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                      <span
                                        className={`h-1.5 w-1.5 rounded-full ${
                                          room.status === "AVAILABLE"
                                            ? "bg-emerald-500"
                                            : room.status === "FULL"
                                            ? "bg-indigo-500"
                                            : "bg-amber-500"
                                        }`}
                                      />
                                      {room.status}
                                    </span>
                                    <span className="font-medium text-slate-700">
                                      {room.beds.length} Bed{room.beds.length === 1 ? "" : "s"}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </AppShell>
    </RoleGate>
  );
}
