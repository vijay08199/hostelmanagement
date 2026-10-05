"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";

export default function StudentElectricityPage() {
  const data = useQuery(api.electricity.myBills, {});

  function getStatusBadge(status: string) {
    switch (status) {
      case "PAID":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20";
      case "PENDING":
        return "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20";
      case "OVERDUE":
        return "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20";
      default:
        return "bg-slate-50 text-slate-700 ring-1 ring-slate-600/20";
    }
  }

  const bills = data?.bills || [];
  const currentBill = data?.currentBill;

  return (
    <RoleGate role="STUDENT">
      <AppShell role="STUDENT">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Room Utilities</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Electricity & Sub-metering</h1>
              <p className="mt-1 text-sm text-slate-500">
                Track your room power consumption, meter readings, and monthly utility dues.
              </p>
            </div>
            {data?.hasAllocation && (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-xs">
                <span>Allocated: <strong>{data.hostelName} - Room {data.roomNumber}</strong></span>
              </div>
            )}
          </div>

          {!data?.hasAllocation ? (
            <Card className="p-8 text-center">
              <EmptyState
                title="No Active Room Allocation"
                description="Electricity billing is automatically linked to your allocated hostel room once an active bed allocation is confirmed."
              />
            </Card>
          ) : (
            <>
              {/* Current Month Active Bill Card */}
              {currentBill ? (
                <Card className="p-6 border-indigo-100 bg-gradient-to-br from-white to-indigo-50/20 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                        Current Utility Bill
                      </span>
                      <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                        Cycle: {currentBill.billingMonth}
                      </h2>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-bold ${getStatusBadge(
                        currentBill.status
                      )}`}
                    >
                      {currentBill.status}
                    </span>
                  </div>

                  <div className="grid gap-4 mt-5 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                      <p className="text-xs font-medium text-slate-500">Meter Readings</p>
                      <p className="mt-1 text-lg font-mono font-bold text-slate-800">
                        {currentBill.previousReading} → {currentBill.currentReading}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Meter #{currentBill.meterNumber || "Room sub-meter"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                      <p className="text-xs font-medium text-slate-500">Units Consumed</p>
                      <p className="mt-1 text-lg font-bold text-indigo-600">
                        {currentBill.unitsConsumed} <span className="text-xs font-normal text-slate-500">kWh</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">@ ₹{currentBill.ratePerUnit} / unit</p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                      <p className="text-xs font-medium text-slate-500">Total Billed</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        ₹{currentBill.totalAmount.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Split among room occupants</p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                      <p className="text-xs font-medium text-slate-500">Payment Due Date</p>
                      <p className="mt-1 text-lg font-bold text-slate-800">
                        {new Date(currentBill.dueDate).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Payable at warden / accounts desk</p>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="p-8 text-center">
                  <EmptyState
                    title="No Active Electricity Bill"
                    description="No meter reading has been billed for your room yet for the current cycle."
                  />
                </Card>
              )}

              {/* Historical Consumption Table */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Room Billing History</h3>
                <Card className="overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-5 py-3.5">Month</th>
                          <th className="px-5 py-3.5">Previous → Current</th>
                          <th className="px-5 py-3.5">Units (kWh)</th>
                          <th className="px-5 py-3.5">Rate / Unit</th>
                          <th className="px-5 py-3.5">Total Amount</th>
                          <th className="px-5 py-3.5">Due Date</th>
                          <th className="px-5 py-3.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bills.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center">
                              <EmptyState
                                title="No Prior Bills"
                                description="Past monthly electricity invoices will appear here."
                              />
                            </td>
                          </tr>
                        ) : (
                          bills.map((bill: any) => (
                            <tr key={bill._id} className="hover:bg-slate-50/60 transition">
                              <td className="px-5 py-4 font-semibold text-slate-900">{bill.billingMonth}</td>
                              <td className="px-5 py-4 text-xs font-mono text-slate-600">
                                {bill.previousReading} → {bill.currentReading}
                              </td>
                              <td className="px-5 py-4 font-medium text-slate-800">{bill.unitsConsumed} units</td>
                              <td className="px-5 py-4 text-xs text-slate-500">₹{bill.ratePerUnit}</td>
                              <td className="px-5 py-4 font-bold text-slate-900">
                                ₹{bill.totalAmount.toLocaleString()}
                              </td>
                              <td className="px-5 py-4 text-xs text-slate-600">
                                {new Date(bill.dueDate).toLocaleDateString("en-IN", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </td>
                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${getStatusBadge(
                                    bill.status
                                  )}`}
                                >
                                  {bill.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* Energy Saving Tips */}
              <Card className="p-5 bg-emerald-50/40 border-emerald-100">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Hostel Energy Conservation Note</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Please ensure room air conditioning, heavy heating appliances, and lights are switched off when
                      leaving your room. Sub-meter billing encourages sensible power usage and prevents excessive room
                      utility charges.
                    </p>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      </AppShell>
    </RoleGate>
  );
}

