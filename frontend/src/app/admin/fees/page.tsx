"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";

type FeeStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED";
type PaymentMethod = "CASH" | "UPI" | "BANK_TRANSFER" | "CARD" | "OTHER";

export default function AdminFeesPage() {
  const stats = useQuery(api.fees.getFeeStats, {});
  const categories = useQuery(api.fees.listCategories, {});
  const fees = useQuery(api.fees.listFees, {});
  const students = useQuery(api.admin.listStudents, {});

  const createFee = useMutation(api.fees.createFee);
  const recordPayment = useMutation(api.fees.recordPayment);
  const seedDefaultCategories = useMutation(api.fees.seedDefaultCategories);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Modals
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState<any>(null);
  const [activeReceiptNumber, setActiveReceiptNumber] = useState<string | null>(null);

  // Notification message
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms
  const [feeForm, setFeeForm] = useState({
    studentId: "",
    feeCategoryId: "",
    amount: "",
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    academicYear: "2026-2027",
    semester: "1",
    description: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "UPI" as PaymentMethod,
    transactionReference: "",
    remarks: "",
  });

  // Receipt Query
  const receipt = useQuery(
    api.fees.getReceipt,
    activeReceiptNumber ? { receiptNumber: activeReceiptNumber } : "skip"
  );

  // Filtered fees
  const filteredFees = useMemo(() => {
    if (!fees) return [];
    return fees.filter((f: any) => {
      const matchesSearch =
        search === "" ||
        f.student?.name?.toLowerCase().includes(search.toLowerCase()) ||
        f.student?.studentId?.toLowerCase().includes(search.toLowerCase()) ||
        f.student?.rollNumber?.toLowerCase().includes(search.toLowerCase()) ||
        f.category?.name?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || f.status === statusFilter;
      const matchesCategory = categoryFilter === "ALL" || f.feeCategoryId === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [fees, search, statusFilter, categoryFilter]);

  async function handleSeedCategories() {
    try {
      setIsSubmitting(true);
      const count = await seedDefaultCategories({});
      setMessage({ text: `Initialized ${count} standard fee categories.`, type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to initialize categories.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateFee(e: React.FormEvent) {
    e.preventDefault();
    if (!feeForm.studentId || !feeForm.feeCategoryId || !feeForm.amount) {
      setMessage({ text: "Please select a student, category, and enter an amount.", type: "error" });
      return;
    }
    const amt = parseFloat(feeForm.amount);
    if (isNaN(amt) || amt <= 0) {
      setMessage({ text: "Amount must be greater than zero.", type: "error" });
      return;
    }

    try {
      setIsSubmitting(true);
      await createFee({
        studentId: feeForm.studentId as any,
        feeCategoryId: feeForm.feeCategoryId as any,
        amount: amt,
        dueDate: new Date(feeForm.dueDate).getTime(),
        academicYear: feeForm.academicYear || undefined,
        semester: feeForm.semester ? parseInt(feeForm.semester, 10) : undefined,
        description: feeForm.description || undefined,
      });
      setMessage({ text: "Fee assessed successfully.", type: "success" });
      setShowFeeModal(false);
      setFeeForm({
        studentId: "",
        feeCategoryId: "",
        amount: "",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        academicYear: "2026-2027",
        semester: "1",
        description: "",
      });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to assess fee.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFee || !paymentForm.amount) return;
    const amt = parseFloat(paymentForm.amount);
    if (isNaN(amt) || amt <= 0) {
      setMessage({ text: "Payment amount must be greater than zero.", type: "error" });
      return;
    }
    if (amt > selectedFee.pendingAmount) {
      setMessage({
        text: `Amount exceeds pending balance of ₹${selectedFee.pendingAmount.toLocaleString()}`,
        type: "error",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await recordPayment({
        feeId: selectedFee._id,
        amount: amt,
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: Date.now(),
        transactionReference: paymentForm.transactionReference.trim() || undefined,
        remarks: paymentForm.remarks.trim() || undefined,
      });

      setMessage({ text: `Payment recorded. Receipt: ${res.receiptNumber}`, type: "success" });
      setShowPaymentModal(false);
      setActiveReceiptNumber(res.receiptNumber);
      setShowReceiptModal(true);
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to record payment.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  function getStatusBadge(status: FeeStatus) {
    switch (status) {
      case "PAID":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20";
      case "PARTIAL":
        return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
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
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Finance & Accounts</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Fee Management</h1>
              <p className="mt-1 text-sm text-slate-500">
                Track student hostel fees, record offline & online payments, and issue receipts.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {categories && categories.length === 0 && (
                <button
                  onClick={handleSeedCategories}
                  disabled={isSubmitting}
                  className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition shadow-xs"
                >
                  Seed Standard Categories
                </button>
              )}
              <button
                onClick={() => setShowFeeModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Assign / New Fee
              </button>
            </div>
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

          {/* Summary Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Assessed</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                ₹{(stats?.totalFees || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">{stats?.totalCount || 0} fee vouchers</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Collected</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">
                ₹{(stats?.totalCollected || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-emerald-600 font-medium">
                {stats && stats.totalFees > 0 ? Math.round((stats.totalCollected / stats.totalFees) * 100) : 0}% collection rate
              </p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Dues</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600">
                ₹{(stats?.totalPending || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">Outstanding balance</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Overdue Invoices</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-rose-600">
                {stats?.overdueCount || 0}
              </p>
              <p className="mt-1 text-xs text-rose-600">Past due date</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fee Categories</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-indigo-600">
                {categories?.length || 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">Active fee schedules</p>
            </Card>
          </div>

          {/* Filter Bar */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Search by student name, roll number, category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PARTIAL">Partially Paid</option>
                <option value="PAID">Fully Paid</option>
                <option value="OVERDUE">Overdue</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {categories?.map((c: any) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          {/* Fees Table */}
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Student</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Total Amount</th>
                    <th className="px-5 py-3.5">Paid / Pending</th>
                    <th className="px-5 py-3.5">Due Date</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center">
                        <EmptyState
                          title="No Fee Records Found"
                          description="No student fee records match your current filter criteria."
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredFees.map((fee: any) => (
                      <tr key={fee._id} className="hover:bg-slate-50/60 transition">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">{fee.student?.name || "Student"}</p>
                          <p className="text-xs text-slate-400">
                            {fee.student?.studentId} {fee.student?.rollNumber ? `• ${fee.student.rollNumber}` : ""}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-800">{fee.category?.name || "Standard Fee"}</p>
                          {fee.academicYear && (
                            <p className="text-xs text-slate-400">
                              AY {fee.academicYear} {fee.semester ? `• Sem ${fee.semester}` : ""}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-900">₹{fee.amount.toLocaleString()}</td>
                        <td className="px-5 py-4">
                          <p className="text-xs text-emerald-600 font-medium">Paid: ₹{fee.paidAmount.toLocaleString()}</p>
                          <p className="text-xs text-amber-600 font-medium">Pending: ₹{fee.pendingAmount.toLocaleString()}</p>
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
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {fee.pendingAmount > 0 && fee.status !== "CANCELLED" && (
                              <button
                                onClick={() => {
                                  setSelectedFee(fee);
                                  setPaymentForm({
                                    amount: fee.pendingAmount.toString(),
                                    paymentMethod: "UPI",
                                    transactionReference: "",
                                    remarks: "",
                                  });
                                  setShowPaymentModal(true);
                                }}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
                              >
                                Collect Payment
                              </button>
                            )}
                            {fee.paidAmount > 0 && (
                              <button
                                onClick={async () => {
                                  // Open latest payment receipt for this fee
                                  setSelectedFee(fee);
                                  setShowReceiptModal(true);
                                }}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                              >
                                View Payment
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Modal: Create Fee */}
          {showFeeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">Assign Fee to Student</h3>
                  <button
                    onClick={() => setShowFeeModal(false)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateFee} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Select Student *</label>
                    <select
                      required
                      value={feeForm.studentId}
                      onChange={(e) => setFeeForm({ ...feeForm, studentId: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">-- Choose Student --</option>
                      {students?.map((s: any) => (
                        <option key={s._id} value={s._id}>
                          {s.firstName} {s.lastName} ({s.studentId} {s.rollNumber ? `- ${s.rollNumber}` : ""})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Fee Category *</label>
                      <select
                        required
                        value={feeForm.feeCategoryId}
                        onChange={(e) => {
                          const catId = e.target.value;
                          const selected = categories?.find((c: any) => c._id === catId);
                          setFeeForm({
                            ...feeForm,
                            feeCategoryId: catId,
                            amount: selected?.defaultAmount ? selected.defaultAmount.toString() : feeForm.amount,
                          });
                        }}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="">-- Choose Category --</option>
                        {categories?.map((c: any) => (
                          <option key={c._id} value={c._id}>
                            {c.name} {c.defaultAmount ? `(₹${c.defaultAmount})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Amount (₹) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="5000"
                        value={feeForm.amount}
                        onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Due Date *</label>
                      <input
                        type="date"
                        required
                        value={feeForm.dueDate}
                        onChange={(e) => setFeeForm({ ...feeForm, dueDate: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Academic Year</label>
                      <input
                        type="text"
                        placeholder="2026-2027"
                        value={feeForm.academicYear}
                        onChange={(e) => setFeeForm({ ...feeForm, academicYear: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Description / Note</label>
                    <input
                      type="text"
                      placeholder="e.g. Semester 1 Hostel & Room Maintenance"
                      value={feeForm.description}
                      onChange={(e) => setFeeForm({ ...feeForm, description: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowFeeModal(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
                    >
                      {isSubmitting ? "Saving..." : "Create Fee Record"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: Record Payment */}
          {showPaymentModal && selectedFee && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Record Fee Payment</h3>
                    <p className="text-xs text-slate-500">Student: {selectedFee.student?.name}</p>
                  </div>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Fee Category:</span>
                    <span className="font-semibold text-slate-800">{selectedFee.category?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Fee:</span>
                    <span className="font-semibold text-slate-800">₹{selectedFee.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Already Paid:</span>
                    <span className="text-emerald-600 font-semibold">₹{selectedFee.paidAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1">
                    <span className="font-bold">Pending Due:</span>
                    <span className="font-bold text-amber-600">₹{selectedFee.pendingAmount.toLocaleString()}</span>
                  </div>
                </div>

                <form onSubmit={handleRecordPayment} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Payment Amount (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max={selectedFee.pendingAmount}
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Payment Method *</label>
                    <select
                      value={paymentForm.paymentMethod}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as PaymentMethod })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="UPI">UPI / QR Code</option>
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Direct Bank Transfer / NEFT / IMPS</option>
                      <option value="CARD">Debit / Credit Card</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Transaction ID / Reference Number</label>
                    <input
                      type="text"
                      placeholder="e.g. UPI-9988221144 or Cheque #"
                      value={paymentForm.transactionReference}
                      onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Remarks / Note</label>
                    <input
                      type="text"
                      placeholder="e.g. Received at Accounts Desk"
                      value={paymentForm.remarks}
                      onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
                    >
                      {isSubmitting ? "Recording..." : "Confirm & Issue Receipt"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: Printable Receipt */}
          {showReceiptModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">Hostel Payment Receipt</h3>
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
                  <div id="printable-receipt" className="mt-4 space-y-4 text-sm text-slate-700">
                    <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                        <div>
                          <p className="font-bold text-slate-900 text-base">Campus Hostel Management</p>
                          <p className="text-xs text-slate-500">Official Student Fee Receipt</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-indigo-600">{receipt.receiptNumber}</p>
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
                          <span className="text-slate-900">Amount Paid Now:</span>
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
                  <div className="py-8 text-center text-slate-500 text-xs">
                    Please select a specific receipt or record a payment to view details.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </RoleGate>
  );
}
