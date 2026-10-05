"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";

type ElectricityStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";

export default function AdminElectricityPage() {
  const stats = useQuery(api.electricity.getStats, {});
  const hostels = useQuery(api.admin.listHostels);
  const bills = useQuery(api.electricity.listBills, {});

  const createBill = useMutation(api.electricity.createBill);
  const recordPayment = useMutation(api.electricity.recordPayment);

  // Filters
  const [hostelFilter, setHostelFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [monthFilter, setMonthFilter] = useState<string>("");
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
    billingMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
    previousReading: "",
    currentReading: "",
    ratePerUnit: "8.50",
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: "",
  });

  // Query rooms for selected hostel in form
  const hostelData = useQuery(
    api.admin.getHostel,
    billForm.hostelId ? { hostelId: billForm.hostelId as any } : "skip"
  );
  const hostelRooms = useMemo(() => {
    if (!hostelData?.blocks) return [];
    return hostelData.blocks.flatMap((b: any) =>
      b.floors.flatMap((f: any) => f.rooms)
    );
  }, [hostelData]);

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    paymentReference: "",
    notes: "",
  });

  // Notifications
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculated units and total in modal
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
      const matchesHostel = hostelFilter === "ALL" || b.hostelId === hostelFilter;
      const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
      const matchesMonth = monthFilter === "" || b.billingMonth === monthFilter;
      const matchesSearch =
        search === "" ||
        b.roomNumber?.toLowerCase().includes(search.toLowerCase()) ||
        b.hostelName?.toLowerCase().includes(search.toLowerCase()) ||
        b.meterNumber?.toLowerCase().includes(search.toLowerCase());

      return matchesHostel && matchesStatus && matchesMonth && matchesSearch;
    });
  }, [bills, hostelFilter, statusFilter, monthFilter, search]);

  async function handleCreateBill(e: React.FormEvent) {
    e.preventDefault();
    if (!billForm.hostelId || !billForm.roomId) {
      setMessage({ text: "Please select both a hostel and a room.", type: "error" });
      return;
    }

    const prev = parseFloat(billForm.previousReading);
    const curr = parseFloat(billForm.currentReading);
    const rate = parseFloat(billForm.ratePerUnit);

    if (isNaN(prev) || isNaN(curr) || curr < prev) {
      setMessage({ text: "Current meter reading must be greater than or equal to previous reading.", type: "error" });
      return;
    }
    if (isNaN(rate) || rate < 0) {
      setMessage({ text: "Rate per unit must be a valid positive amount.", type: "error" });
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

      setMessage({ text: "Electricity bill generated successfully.", type: "success" });
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
      setMessage({ text: err.message || "Failed to generate bill.", type: "error" });
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

  function getStatusBadge(status: ElectricityStatus) {
    switch (status) {
      case "PAID":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20";
      case "PENDING":
        return "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20";
      case "OVERDUE":
        return "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20";
      case "CANCELLED":
        return "bg-slate-50 text-slate-600 ring-1 ring-slate-500/20";
      default:
        return "bg-slate-50 text-slate-700 ring-1 ring-slate-600/20";
    }
  }

  return (
    <RoleGate role="ADMIN">
      <AppShell role="ADMIN">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Utilities & Facilities</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Electricity Management</h1>
              <p className="mt-1 text-sm text-slate-500">
                Log room sub-meter readings, calculate consumption, issue monthly bills, and reconcile utility dues.
              </p>
            </div>
            <button
              onClick={() => setShowBillModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              New Meter Reading & Bill
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Billed</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                ₹{(stats?.totalAmount || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">{stats?.totalBills || 0} monthly bills</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Energy Consumed</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-indigo-600">
                {(stats?.totalUnits || 0).toLocaleString()} kWh
              </p>
              <p className="mt-1 text-xs text-slate-500">Sub-metered usage</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Collected</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">
                ₹{(stats?.totalPaid || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-emerald-600 font-medium">Reconciled bills</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Dues</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600">
                ₹{(stats?.totalPending || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">Uncollected utility charges</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Overdue Bills</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-rose-600">
                {stats?.totalOverdue || 0}
              </p>
              <p className="mt-1 text-xs text-rose-600 font-medium">Past due notice required</p>
            </Card>
          </div>

          {/* Filter Bar */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Search by room, hostel, meter number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <select
                value={hostelFilter}
                onChange={(e) => setHostelFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Hostels</option>
                {hostels?.map((h: any) => (
                  <option key={h._id} value={h._id}>
                    {h.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <input
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
              />
              {monthFilter && (
                <button
                  onClick={() => setMonthFilter("")}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  Clear Month
                </button>
              )}
            </div>
          </Card>

          {/* Electricity Bills Table */}
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Hostel & Room</th>
                    <th className="px-5 py-3.5">Billing Month</th>
                    <th className="px-5 py-3.5">Readings (Prev → Curr)</th>
                    <th className="px-5 py-3.5">Consumption</th>
                    <th className="px-5 py-3.5">Rate & Total</th>
                    <th className="px-5 py-3.5">Due Date</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center">
                        <EmptyState
                          title="No Electricity Bills Found"
                          description="No meter records match your current filter settings."
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((bill: any) => (
                      <tr key={bill._id} className="hover:bg-slate-50/60 transition">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">Room {bill.roomNumber}</p>
                          <p className="text-xs text-slate-400">
                            {bill.hostelName} {bill.meterNumber ? `• Meter #${bill.meterNumber}` : ""}
                          </p>
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-800">{bill.billingMonth}</td>
                        <td className="px-5 py-4 text-xs font-mono text-slate-600">
                          {bill.previousReading} → {bill.currentReading}
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-semibold text-slate-900">{bill.unitsConsumed}</span>{" "}
                          <span className="text-xs text-slate-500">units</span>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900">₹{bill.totalAmount.toLocaleString()}</p>
                          <p className="text-xs text-slate-400">@ ₹{bill.ratePerUnit}/unit</p>
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
                        <td className="px-5 py-4 text-right">
                          {bill.status !== "PAID" && bill.status !== "CANCELLED" && (
                            <button
                              onClick={() => {
                                setSelectedBill(bill);
                                setPaymentForm({ paymentReference: "", notes: "" });
                                setShowPayModal(true);
                              }}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
                            >
                              Mark Paid
                            </button>
                          )}
                          {bill.status === "PAID" && (
                            <span className="text-xs font-medium text-emerald-600">
                              ✓ Paid on{" "}
                              {bill.paidAt
                                ? new Date(bill.paidAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
                                : "Record"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Modal: New Meter Reading & Bill */}
          {showBillModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">New Meter Reading & Bill</h3>
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
                      <label className="block text-xs font-semibold text-slate-700">Hostel *</label>
                      <select
                        required
                        value={billForm.hostelId}
                        onChange={(e) => setBillForm({ ...billForm, hostelId: e.target.value, roomId: "" })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Choose Hostel --</option>
                        {hostels?.map((h: any) => (
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
                        disabled={!billForm.hostelId}
                        value={billForm.roomId}
                        onChange={(e) => setBillForm({ ...billForm, roomId: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
                      >
                        <option value="">-- Choose Room --</option>
                        {hostelRooms?.map((r: any) => (
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
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Meter Number</label>
                      <input
                        type="text"
                        placeholder="e.g. MTR-B1-102"
                        value={billForm.meterNumber}
                        onChange={(e) => setBillForm({ ...billForm, meterNumber: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
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
                        placeholder="1200"
                        value={billForm.previousReading}
                        onChange={(e) => setBillForm({ ...billForm, previousReading: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Current Reading *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        min="0"
                        placeholder="1350"
                        value={billForm.currentReading}
                        onChange={(e) => setBillForm({ ...billForm, currentReading: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Rate Per Unit (₹) *</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        min="0"
                        value={billForm.ratePerUnit}
                        onChange={(e) => setBillForm({ ...billForm, ratePerUnit: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Due Date *</label>
                      <input
                        type="date"
                        required
                        value={billForm.dueDate}
                        onChange={(e) => setBillForm({ ...billForm, dueDate: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Dynamic calculation banner */}
                  <div className="rounded-xl bg-indigo-50/70 p-3.5 border border-indigo-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500">Calculated Units: </span>
                      <span className="font-bold text-indigo-700">{unitsConsumed} kWh</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Total Billed: </span>
                      <span className="font-bold text-slate-900 text-sm">₹{totalCalculated.toLocaleString()}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Notes / Meter Remarks</label>
                    <input
                      type="text"
                      placeholder="e.g. Regular monthly cycle check"
                      value={billForm.notes}
                      onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                    />
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
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
                    >
                      {isSubmitting ? "Generating..." : "Generate Electricity Bill"}
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
                  <h3 className="text-lg font-bold text-slate-900">Reconcile Electricity Bill</h3>
                  <button
                    onClick={() => setShowPayModal(false)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Hostel & Room:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedBill.hostelName} - Room {selectedBill.roomNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Billing Month:</span>
                    <span className="font-semibold text-slate-800">{selectedBill.billingMonth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Units Consumed:</span>
                    <span className="font-semibold text-slate-800">{selectedBill.unitsConsumed} units</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1 text-sm font-bold">
                    <span className="text-slate-900">Total Due:</span>
                    <span className="text-emerald-600">₹{selectedBill.totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                <form onSubmit={handleRecordPayment} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Payment Reference ID</label>
                    <input
                      type="text"
                      placeholder="e.g. ELEC-REC-992144 or Cash Desk"
                      value={paymentForm.paymentReference}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentReference: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Notes / Remarks</label>
                    <input
                      type="text"
                      placeholder="e.g. Paid in full by room residents"
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
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
                      {isSubmitting ? "Saving..." : "Confirm Payment"}
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
