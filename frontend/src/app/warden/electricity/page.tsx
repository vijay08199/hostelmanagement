"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";

type ElectricityStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";

export default function WardenElectricityPage() {
  const stats = useQuery(api.electricity.getStats, {});
  const occupancy = useQuery(api.warden.occupancy, {});
  const bills = useQuery(api.electricity.listBills, {});

  const createBill = useMutation(api.electricity.createBill);
  const recordPayment = useMutation(api.electricity.recordPayment);

  // Filters
  const [roomFilter, setRoomFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Modals
  const [showBillModal, setShowBillModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);

  // Bill creation form
  const [billForm, setBillForm] = useState({
    hostelId: "",
    roomId: "",
    meterNumber: "",
    billingMonth: new Date().toISOString().slice(0, 7),
    previousReading: "",
    currentReading: "",
    ratePerUnit: "8.50",
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    paymentReference: "",
    notes: "",
  });

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available hostels and rooms from occupancy
  const assignedHostels = occupancy?.hostels || [];
  const assignedRooms = occupancy?.rooms || [];

  // Units and total calculation
  const unitsConsumed = useMemo(() => {
    const prev = parseFloat(billForm.previousReading);
    const curr = parseFloat(billForm.currentReading);
    if (!isNaN(prev) && !isNaN(curr) && curr >= prev) {
      return curr - prev;
    }
    return 0;
  }, [billForm.previousReading, billForm.currentReading]);

  const totalCalculated = useMemo(() => {
    const rate = parseFloat(billForm.ratePerUnit);
    if (!isNaN(rate) && rate >= 0 && unitsConsumed > 0) {
      return Math.round(unitsConsumed * rate * 100) / 100;
    }
    return 0;
  }, [unitsConsumed, billForm.ratePerUnit]);

  // Filtered bills
  const filteredBills = useMemo(() => {
    if (!bills) return [];
    return bills.filter((b: any) => {
      const matchesRoom = roomFilter === "ALL" || b.roomId === roomFilter;
      const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
      const matchesSearch =
        search === "" ||
        b.roomNumber?.toLowerCase().includes(search.toLowerCase()) ||
        b.hostelName?.toLowerCase().includes(search.toLowerCase()) ||
        b.meterNumber?.toLowerCase().includes(search.toLowerCase());

      return matchesRoom && matchesStatus && matchesSearch;
    });
  }, [bills, roomFilter, statusFilter, search]);

  async function handleCreateBill(e: React.FormEvent) {
    e.preventDefault();
    if (!billForm.hostelId || !billForm.roomId) {
      setMessage({ text: "Please select hostel and room.", type: "error" });
      return;
    }

    const prev = parseFloat(billForm.previousReading);
    const curr = parseFloat(billForm.currentReading);
    const rate = parseFloat(billForm.ratePerUnit);

    if (isNaN(prev) || isNaN(curr) || curr < prev) {
      setMessage({ text: "Current meter reading must be ≥ previous reading.", type: "error" });
      return;
    }

    try {
      setIsSubmitting(true);
      await createBill({
        hostelId: billForm.hostelId as any,
        roomId: billForm.roomId as any,
        meterNumber: billForm.meterNumber.trim() || undefined,
        billingMonth: billForm.billingMonth,
        previousReading: prev,
        currentReading: curr,
        ratePerUnit: rate,
        dueDate: new Date(billForm.dueDate).getTime(),
        notes: billForm.notes.trim() || undefined,
      });

      setMessage({ text: "Electricity bill created for room.", type: "success" });
      setShowBillModal(false);
      setBillForm({
        hostelId: "",
        roomId: "",
        meterNumber: "",
        billingMonth: new Date().toISOString().slice(0, 7),
        previousReading: "",
        currentReading: "",
        ratePerUnit: "8.50",
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        notes: "",
      });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to create bill.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBill) return;

    try {
      setIsSubmitting(true);
      await recordPayment({
        billId: selectedBill._id,
        paymentReference: paymentForm.paymentReference.trim() || undefined,
        notes: paymentForm.notes.trim() || undefined,
      });

      setMessage({ text: "Bill marked as PAID.", type: "success" });
      setShowPayModal(false);
      setSelectedBill(null);
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to record payment.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <RoleGate role="WARDEN">
      <AppShell role="WARDEN">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Assigned Hostels</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Room Electricity & Meters</h1>
              <p className="mt-1 text-sm text-slate-500">
                Record sub-meter readings and track utility payments for your assigned hostel blocks.
              </p>
            </div>
            <button
              onClick={() => {
                if (assignedHostels.length > 0 && !billForm.hostelId) {
                  setBillForm((prev) => ({ ...prev, hostelId: assignedHostels[0]._id }));
                }
                setShowBillModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Add Room Meter Reading
            </button>
          </div>

          {/* Toast Notification */}
          {message && (
            <div
              className={`flex items-center justify-between rounded-xl p-4 text-sm font-medium ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20"
                  : "bg-rose-50 text-rose-800 ring-1 ring-rose-600/20"
              }`}
            >
              <span>{message.text}</span>
              <button onClick={() => setMessage(null)} className="text-slate-500 hover:text-slate-800 font-bold ml-4">
                ✕
              </button>
            </div>
          )}

          {/* Metric Overview Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Billed</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                ₹{(stats?.totalAmount || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">In assigned hostel rooms</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Units Consumed</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-indigo-600">
                {(stats?.totalUnits || 0).toLocaleString()} kWh
              </p>
              <p className="mt-1 text-xs text-slate-500">Current cycle</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Paid Amounts</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">
                ₹{(stats?.totalPaid || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-emerald-600 font-medium">Reconciled</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Bills</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600">
                ₹{(stats?.totalPending || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-amber-600 font-medium">{stats?.totalOverdue || 0} overdue</p>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Search room number, meter #..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>
          </Card>

          {/* Bills List */}
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Hostel & Room</th>
                    <th className="px-5 py-3.5">Billing Month</th>
                    <th className="px-5 py-3.5">Meter Readings</th>
                    <th className="px-5 py-3.5">Consumption</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5">Due Date</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center">
                        <EmptyState
                          title="No Bills Logged"
                          description="No electricity bills logged for your assigned hostels."
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((bill: any) => (
                      <tr key={bill._id} className="hover:bg-slate-50/60 transition">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">Room {bill.roomNumber}</p>
                          <p className="text-xs text-slate-400">{bill.hostelName}</p>
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-800">{bill.billingMonth}</td>
                        <td className="px-5 py-4 text-xs font-mono text-slate-600">
                          {bill.previousReading} → {bill.currentReading}
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-semibold text-slate-900">{bill.unitsConsumed}</span>{" "}
                          <span className="text-xs text-slate-500">kWh</span>
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-900">₹{bill.totalAmount.toLocaleString()}</td>
                        <td className="px-5 py-4 text-xs text-slate-600">
                          {new Date(bill.dueDate).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${
                              bill.status === "PAID"
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                                : bill.status === "OVERDUE"
                                ? "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"
                                : "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20"
                            }`}
                          >
                            {bill.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {bill.status !== "PAID" && (
                            <button
                              onClick={() => {
                                setSelectedBill(bill);
                                setPaymentForm({ paymentReference: "", notes: "" });
                                setShowPayModal(true);
                              }}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
                            >
                              Collect / Mark Paid
                            </button>
                          )}
                          {bill.status === "PAID" && (
                            <span className="text-xs font-medium text-emerald-600">✓ Paid</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Modal: New Meter Reading */}
          {showBillModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">Log Room Meter Reading</h3>
                  <button
                    onClick={() => setShowBillModal(false)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateBill} className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Assigned Hostel *</label>
                      <select
                        required
                        value={billForm.hostelId}
                        onChange={(e) => setBillForm({ ...billForm, hostelId: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="">-- Choose Hostel --</option>
                        {assignedHostels.map((h: any) => (
                          <option key={h._id} value={h._id}>
                            {h.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Room *</label>
                      <select
                        required
                        value={billForm.roomId}
                        onChange={(e) => setBillForm({ ...billForm, roomId: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="">-- Choose Room --</option>
                        {assignedRooms.map((r: any) => (
                          <option key={r._id} value={r._id}>
                            Room {r.roomNumber} ({r.capacity} beds)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Billing Month *</label>
                      <input
                        type="month"
                        required
                        value={billForm.billingMonth}
                        onChange={(e) => setBillForm({ ...billForm, billingMonth: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Meter Number</label>
                      <input
                        type="text"
                        placeholder="e.g. MTR-204"
                        value={billForm.meterNumber}
                        onChange={(e) => setBillForm({ ...billForm, meterNumber: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Previous Reading *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        min="0"
                        value={billForm.previousReading}
                        onChange={(e) => setBillForm({ ...billForm, previousReading: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Current Reading *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        min="0"
                        value={billForm.currentReading}
                        onChange={(e) => setBillForm({ ...billForm, currentReading: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl bg-emerald-50/70 p-3.5 border border-emerald-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500">Calculated Units: </span>
                      <span className="font-bold text-emerald-700">{unitsConsumed} kWh</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Total Billed: </span>
                      <span className="font-bold text-slate-900 text-sm">₹{totalCalculated.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowBillModal(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
                    >
                      {isSubmitting ? "Generating..." : "Save Bill"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: Mark Paid */}
          {showPayModal && selectedBill && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">Confirm Payment</h3>
                  <button
                    onClick={() => setShowPayModal(false)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
                  <p>Room: {selectedBill.roomNumber} ({selectedBill.hostelName})</p>
                  <p>Month: {selectedBill.billingMonth}</p>
                  <p className="font-bold text-emerald-600 text-sm">Amount: ₹{selectedBill.totalAmount.toLocaleString()}</p>
                </div>

                <form onSubmit={handleRecordPayment} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Receipt / Reference</label>
                    <input
                      type="text"
                      placeholder="e.g. Paid at Warden Office"
                      value={paymentForm.paymentReference}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentReference: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowPayModal(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
                    >
                      {isSubmitting ? "Confirming..." : "Confirm Paid"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </RoleGate>
  );
}
