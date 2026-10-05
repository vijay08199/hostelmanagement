"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { ShieldAlert, ShieldCheck, Search, Filter, Calendar, Activity, X, Terminal, ArrowRight, Eye, User, Clock } from "lucide-react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";
import { LoadingState } from "@/components/ui-states";

function dateValue(value: string, end = false) {
  if (!value) return undefined;
  const date = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00"}`);
  return date.getTime();
}

function metadata(value?: string) {
  if (!value) return "No additional details";
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export default function Page() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<any>(null);

  const logs = useQuery(api.audit.listAuditLogs, {
    search: search || undefined,
    action: action || undefined,
    entityType: entityType || undefined,
    from: dateValue(from),
    to: dateValue(to, true),
    limit: 50,
  });

  const actions = useMemo(() => Array.from(new Set((logs ?? []).map((log: any) => log.action))).sort(), [logs]);
  const entities = useMemo(() => Array.from(new Set((logs ?? []).map((log: any) => log.entityType))).sort(), [logs]);

  const isLoading = logs === undefined;

  return (
    <RoleGate role="ADMIN">
      <AppShell role="ADMIN">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Enterprise Security</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Audit Logs & Security Stream</h1>
              <p className="mt-1 text-sm text-slate-500">
                Immutable activity trail tracking administrative mutations, access changes, and operations across the system.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4 border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Captured Events</p>
                  <p className="mt-1.5 text-2xl font-bold text-slate-900">{logs?.length ?? 0}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-700">
                  <Activity size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-indigo-100 bg-indigo-50/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Unique Actions</p>
                  <p className="mt-1.5 text-2xl font-bold text-indigo-800">{actions.length}</p>
                </div>
                <div className="rounded-xl border border-indigo-200 bg-indigo-100/60 p-2.5 text-indigo-700">
                  <ShieldCheck size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-teal-100 bg-teal-50/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Monitored Entities</p>
                  <p className="mt-1.5 text-2xl font-bold text-teal-800">{entities.length}</p>
                </div>
                <div className="rounded-xl border border-teal-200 bg-teal-100/60 p-2.5 text-teal-700">
                  <Terminal size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-slate-200 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Query Limit</p>
                  <p className="mt-1.5 text-xl font-bold text-slate-800">50 Latest Logs</p>
                </div>
                <div className="rounded-xl border border-slate-300 bg-white p-2.5 text-slate-700 shadow-2xs">
                  <Clock size={20} />
                </div>
              </div>
            </Card>
          </div>

          {/* Filters Console */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Search size={14} /> Search Stream
                </label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Actor name, email, action, ID..."
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Filter size={14} /> Action Filter
                </label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">All Actions</option>
                  {actions.map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Filter size={14} /> Entity Type
                </label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">All Entity Types</option>
                  {entities.map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3 items-end pt-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                From Date
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                To Date
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </label>
              <button
                onClick={() => {
                  setSearch("");
                  setAction("");
                  setEntityType("");
                  setFrom("");
                  setTo("");
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Audit Logs Stream */}
          {isLoading ? (
            <LoadingState />
          ) : logs.length === 0 ? (
            <EmptyState title="No audit logs recorded" description="Try adjusting your filter criteria or date range." />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Timestamp</th>
                    <th className="px-4 py-3.5">Actor</th>
                    <th className="px-4 py-3.5">Action</th>
                    <th className="px-4 py-3.5">Entity</th>
                    <th className="px-4 py-3.5">Target ID</th>
                    <th className="px-5 py-3.5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log: any) => {
                    const initials = `${log.actorName?.[0] ?? ""}`.toUpperCase() || "A";

                    return (
                      <tr
                        key={log._id}
                        onClick={() => setSelected(log)}
                        className="cursor-pointer hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="px-5 py-3.5 text-xs text-slate-600 font-medium whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200">
                              {initials}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{log.actorName}</p>
                              <p className="text-xs text-slate-400">{log.actorEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 border border-indigo-100/60">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-700 text-xs">
                          {log.entityType}
                        </td>
                        <td className="max-w-[150px] truncate px-4 py-3.5 font-mono text-xs text-slate-500">
                          {log.entityId}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                            Inspect <Eye size={14} />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal / Inspector for Event Metadata */}
          {selected && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
              <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-7 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                      Audit Record &bull; {selected.action}
                    </span>
                    <h2 className="mt-2 text-xl font-bold text-slate-900">Security Event Metadata</h2>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Timestamp</p>
                    <p className="mt-1 font-semibold text-slate-800">{new Date(selected.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Audit Log ID</p>
                    <p className="mt-1 font-mono text-xs text-slate-700 break-all">{selected._id}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Actor</p>
                    <p className="mt-1 font-semibold text-slate-900">{selected.actorName}</p>
                    <p className="text-xs text-slate-500">{selected.actorEmail}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Entity & Action</p>
                    <p className="mt-1 font-semibold text-indigo-700">{selected.action}</p>
                    <p className="text-xs text-slate-500">{selected.entityType}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 sm:col-span-2">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Target Entity ID</p>
                    <p className="mt-1 font-mono text-xs text-slate-800 break-all">{selected.entityId}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Raw Metadata JSON</p>
                  <pre className="overflow-auto rounded-2xl bg-slate-950 p-4 text-xs font-mono text-emerald-400 max-h-60 leading-relaxed">
                    {metadata(selected.metadata)}
                  </pre>
                </div>

                <div className="flex justify-end border-t pt-3">
                  <button
                    onClick={() => setSelected(null)}
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

