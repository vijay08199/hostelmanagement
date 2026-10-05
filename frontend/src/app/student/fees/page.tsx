"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";

export default function StudentFeesPage() {
  const fees = useQuery(api.fees.myFees, {}) || [];
  const payments = useQuery(api.fees.listPayments, {}) || [];
  const feeStats = useQuery(api.fees.myFeeStats, {});

  const [activeReceiptNumber, setActiveReceiptNumber] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const receipt = useQuery(
    api.fees.getReceipt,
    activeReceiptNumber ? { receiptNumber: activeReceiptNumber } : "skip"
  );

  function getStatusBadge(status: string) {
    switch (status) {
      case "PAID":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20";
      case "PARTIAL":
        return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
      case "PENDING":
        return "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20";
      case "OVERDUE":
        return "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20";
      default:
        return "bg-slate-50 text-slate-700 ring-1 ring-slate-600/20";
    }
  }

  return (
    <RoleGate role="STUDENT">
      <AppShell role="STUDENT">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Student Account</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Hostel Fees & Payments</h1>
              <p className="mt-1 text-sm text-slate-500">
                View your hostel dues, payment records, and download official payment receipts.
              </p>
            </div>
            {feeStats && feeStats.pending > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span>You have an outstanding hostel fee balance of <strong>₹{feeStats.pending.toLocaleString()}</strong>.</span>
              </div>
            )}
          </div>

          {/* Metric Overview Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Assessed Fees</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                ₹{(feeStats?.totalFees || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">Across all semesters</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Paid</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">
                ₹{(feeStats?.paid || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-emerald-600 font-medium">Recorded receipts</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Outstanding Balance</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600">
                ₹{(feeStats?.pending || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">Payable to accounts desk</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Overdue Dues</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-rose-600">
                ₹{(feeStats?.overdue || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-rose-600 font-medium">Past due date</p>
            </Card>
          </div>

          {/* Active / Current Fees Section */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-3">Hostel Fee Schedule</h2>
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5">Category</th>
                      <th className="px-5 py-3.5">Academic Session</th>
                      <th className="px-5 py-3.5">Amount</th>
                      <th className="px-5 py-3.5">Paid</th>
                      <th className="px-5 py-3.5">Pending</th>
                      <th className="px-5 py-3.5">Due Date</th>
                      <th className="px-5 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fees.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center">
                          <EmptyState
                            title="No Fees Assessed"
                            description="You have no outstanding or past hostel fees recorded."
                          />
                        </td>
                      </tr>
                    ) : (
                      fees.map((fee: any) => (
                        <tr key={fee._id} className="hover:bg-slate-50/60 transition">
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">{fee.category?.name || "Hostel Fee"}</p>
                            {fee.description && (
                              <p className="text-xs text-slate-400">{fee.description}</p>
                            )}
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-600">
                            {fee.academicYear ? `AY ${fee.academicYear}` : "Current Session"}{" "}
                            {fee.semester ? `• Sem ${fee.semester}` : ""}
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-900">
                            ₹{fee.amount.toLocaleString()}
                          </td>
                          <td className="px-5 py-4 text-emerald-600 font-medium">
                            ₹{fee.paidAmount.toLocaleString()}
                          </td>
                          <td className="px-5 py-4 text-amber-600 font-bold">
                            ₹{fee.pendingAmount.toLocaleString()}
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-600">
                            {new Date(fee.dueDate).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${getStatusBadge(
                                fee.status
                              )}`}
                            >
                              {fee.status}
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

          {/* Payment Receipts & Transaction History */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-3">Payment Receipts & History</h2>
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5">Receipt #</th>
                      <th className="px-5 py-3.5">Payment Date</th>
                      <th className="px-5 py-3.5">Fee Category</th>
                      <th className="px-5 py-3.5">Amount Paid</th>
                      <th className="px-5 py-3.5">Payment Method</th>
                      <th className="px-5 py-3.5">Transaction ID</th>
                      <th className="px-5 py-3.5 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center">
                          <EmptyState
                            title="No Payments Recorded Yet"
                            description="Payments recorded by the administration desk will appear here with downloadable receipts."
                          />
                        </td>
                      </tr>
                    ) : (
                      payments.map((p: any) => (
                        <tr key={p._id} className="hover:bg-slate-50/60 transition">
                          <td className="px-5 py-4 font-mono font-bold text-indigo-600 text-xs">
                            {p.receiptNumber}
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-600">
                            {new Date(p.paymentDate).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td className="px-5 py-4 font-medium text-slate-800">
                            {p.categoryName || "Hostel Fee"}
                          </td>
                          <td className="px-5 py-4 font-bold text-emerald-600">
                            ₹{p.amount.toLocaleString()}
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-600 font-medium">{p.paymentMethod}</td>
                          <td className="px-5 py-4 text-xs font-mono text-slate-500">
                            {p.transactionReference || "—"}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => {
                                setActiveReceiptNumber(p.receiptNumber);
                                setShowReceiptModal(true);
                              }}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition shadow-2xs"
                            >
                              View / Print
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Modal: Printable Receipt */}
          {showReceiptModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">Official Payment Receipt</h3>
                  <button
                    onClick={() => {
                      setShowReceiptModal(false);
                      setActiveReceiptNumber(null);
                    }}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                {receipt ? (
                  <div className="mt-4 space-y-4 text-sm text-slate-700">
                    <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                        <div>
                          <p className="font-bold text-slate-900 text-base">Campus Hostel Management</p>
                          <p className="text-xs text-slate-500">Student Fee Payment Voucher</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-indigo-600 font-mono">{receipt.receiptNumber}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(receipt.paymentDate).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 py-3 text-xs border-b border-slate-200">
                        <div>
                          <p className="text-slate-400">Student Name</p>
                          <p className="font-semibold text-slate-800">{receipt.student?.name}</p>
                          <p className="text-slate-500">ID: {receipt.student?.studentId}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Fee Category</p>
                          <p className="font-semibold text-slate-800">{receipt.category?.name || "Hostel Fee"}</p>
                          <p className="text-slate-500">Method: {receipt.paymentMethod}</p>
                        </div>
                      </div>

                      <div className="pt-3 space-y-1.5 text-xs">
                        {receipt.transactionReference && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Ref / Txn ID:</span>
                            <span className="font-mono text-slate-800">{receipt.transactionReference}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-500">Total Assessed:</span>
                          <span className="text-slate-800">₹{(receipt.fee?.amount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Remaining Balance:</span>
                          <span className="text-amber-600 font-semibold">₹{(receipt.fee?.pendingAmount ?? 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold">
                          <span className="text-slate-900">Amount Paid:</span>
                          <span className="text-emerald-600">₹{receipt.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                          />
                        </svg>
                        Print Receipt
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500 text-xs">Loading receipt details...</div>
                )}
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </RoleGate>
  );
}
