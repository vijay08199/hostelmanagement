import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireStudent, getStudentForUser, requireAuthenticatedUser } from "./authorization";

const statusUnion = v.union(v.literal("ACTIVE"), v.literal("INACTIVE"));
const feeStatusUnion = v.union(v.literal("PENDING"), v.literal("PARTIAL"), v.literal("PAID"), v.literal("OVERDUE"), v.literal("CANCELLED"));
const paymentMethodUnion = v.union(v.literal("CASH"), v.literal("UPI"), v.literal("BANK_TRANSFER"), v.literal("CARD"), v.literal("OTHER"));

async function audit(ctx: any, actorId: any, action: string, entityType: string, entityId: any, metadata?: unknown) {
  await ctx.db.insert("auditLogs", {
    actorId,
    action,
    entityType,
    entityId: String(entityId),
    metadata: metadata ? JSON.stringify(metadata) : undefined,
    createdAt: Date.now(),
  });
}

// ==========================================
// FEE CATEGORIES
// ==========================================

export const listCategories = query({
  args: { status: v.optional(statusUnion) },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    let categories = await ctx.db.query("feeCategories").collect();
    if (args.status) {
      categories = categories.filter((c) => c.status === args.status);
    }
    return categories.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const createCategory = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    description: v.optional(v.string()),
    defaultAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const code = args.code.trim().toUpperCase();
    const name = args.name.trim();

    if (!name || !code) throw new Error("Name and code are required");
    if (args.defaultAmount !== undefined && args.defaultAmount < 0) {
      throw new Error("Default amount cannot be negative");
    }

    const existing = await ctx.db
      .query("feeCategories")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (existing) throw new Error("Fee category code already exists");

    const now = Date.now();
    const id = await ctx.db.insert("feeCategories", {
      name,
      code,
      description: args.description?.trim(),
      defaultAmount: args.defaultAmount,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });

    await audit(ctx, actor._id, "FEE_CATEGORY_CREATED", "feeCategory", id, { name, code });
    return id;
  },
});

export const updateCategory = mutation({
  args: {
    categoryId: v.id("feeCategories"),
    name: v.string(),
    description: v.optional(v.string()),
    defaultAmount: v.optional(v.number()),
    status: statusUnion,
  },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error("Fee category not found");

    if (args.defaultAmount !== undefined && args.defaultAmount < 0) {
      throw new Error("Default amount cannot be negative");
    }

    const now = Date.now();
    await ctx.db.patch(args.categoryId, {
      name: args.name.trim(),
      description: args.description?.trim(),
      defaultAmount: args.defaultAmount,
      status: args.status,
      updatedAt: now,
    });

    await audit(ctx, actor._id, "FEE_CATEGORY_UPDATED", "feeCategory", args.categoryId, {
      name: args.name,
      status: args.status,
    });

    return args.categoryId;
  },
});

export const seedDefaultCategories = mutation({
  args: {},
  handler: async (ctx) => {
    const actor = await requireAdmin(ctx);
    const existing = await ctx.db.query("feeCategories").collect();
    if (existing.length > 0) return existing.length;

    const defaults = [
      { name: "Hostel Accommodation Fee", code: "HOSTEL", description: "Term hostel accommodation charges", defaultAmount: 25000 },
      { name: "Mess & Catering Fee", code: "MESS", description: "Monthly/Semester dining charges", defaultAmount: 18000 },
      { name: "Electricity Surcharge", code: "ELECTRICITY", description: "Quarterly electricity and utility charges", defaultAmount: 2500 },
      { name: "Hostel Maintenance Fee", code: "MAINTENANCE", description: "Facility upkeep and sanitization fee", defaultAmount: 1500 },
      { name: "Refundable Security Deposit", code: "SECURITY_DEPOSIT", description: "One-time refundable caution deposit", defaultAmount: 10000 },
      { name: "Other Miscellaneous Fee", code: "OTHER", description: "Miscellaneous campus fees" },
    ];

    const now = Date.now();
    for (const d of defaults) {
      const id = await ctx.db.insert("feeCategories", {
        name: d.name,
        code: d.code,
        description: d.description,
        defaultAmount: d.defaultAmount,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      });
      await audit(ctx, actor._id, "FEE_CATEGORY_CREATED", "feeCategory", id, { name: d.name, code: d.code });
    }

    return defaults.length;
  },
});

// ==========================================
// FEES MANAGEMENT (ADMIN)
// ==========================================

export const listFees = query({
  args: {
    search: v.optional(v.string()),
    studentId: v.optional(v.id("students")),
    categoryId: v.optional(v.id("feeCategories")),
    status: v.optional(feeStatusUnion),
    academicYear: v.optional(v.string()),
    semester: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    let fees = await ctx.db.query("fees").collect();

    if (args.studentId) {
      fees = fees.filter((f) => f.studentId === args.studentId);
    }
    if (args.categoryId) {
      fees = fees.filter((f) => f.feeCategoryId === args.categoryId);
    }
    if (args.status) {
      fees = fees.filter((f) => f.status === args.status);
    }
    if (args.academicYear) {
      fees = fees.filter((f) => f.academicYear === args.academicYear);
    }
    if (args.semester !== undefined) {
      fees = fees.filter((f) => f.semester === args.semester);
    }

    const now = Date.now();

    const enriched = await Promise.all(
      fees.map(async (fee) => {
        const student = await ctx.db.get(fee.studentId);
        const category = await ctx.db.get(fee.feeCategoryId);

        // Safe computed status: if dueDate has passed and has pending amount and not cancelled, it's overdue
        let computedStatus = fee.status;
        if (fee.status !== "PAID" && fee.status !== "CANCELLED" && fee.dueDate < now) {
          computedStatus = "OVERDUE";
        }

        return {
          ...fee,
          status: computedStatus,
          student: student
            ? {
                id: student._id,
                name: `${student.firstName} ${student.lastName}`.trim(),
                studentId: student.studentId,
                rollNumber: student.rollNumber,
                department: student.department,
              }
            : null,
          category: category
            ? {
                id: category._id,
                name: category.name,
                code: category.code,
              }
            : null,
        };
      })
    );

    const search = args.search?.trim().toLowerCase();
    if (search) {
      return enriched.filter((f) => {
        const haystack = [
          f.student?.name,
          f.student?.studentId,
          f.student?.rollNumber,
          f.category?.name,
          f.category?.code,
          f.description,
          f.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(search);
      });
    }

    return enriched.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getFee = query({
  args: { feeId: v.id("fees") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const fee = await ctx.db.get(args.feeId);
    if (!fee) return null;

    // Authorization: Admin can view any fee. Student can only view their own fee.
    if (user.role === "STUDENT") {
      const student = await getStudentForUser(ctx, user._id);
      if (fee.studentId !== student._id) {
        throw new Error("Forbidden: You cannot access another student's fee record");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    const student = await ctx.db.get(fee.studentId);
    const category = await ctx.db.get(fee.feeCategoryId);
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_fee", (q) => q.eq("feeId", fee._id))
      .collect();

    const enrichedPayments = await Promise.all(
      payments.map(async (p) => {
        const recorder = await ctx.db.get(p.recordedBy);
        return {
          ...p,
          recordedByName: recorder?.name || "Administrator",
        };
      })
    );

    return {
      ...fee,
      student,
      category,
      payments: enrichedPayments.sort((a, b) => b.paymentDate - a.paymentDate),
    };
  },
});

export const createFee = mutation({
  args: {
    studentId: v.id("students"),
    feeCategoryId: v.id("feeCategories"),
    amount: v.number(),
    dueDate: v.number(),
    academicYear: v.optional(v.string()),
    semester: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);

    if (args.amount <= 0) throw new Error("Fee amount must be greater than zero");
    const student = await ctx.db.get(args.studentId);
    if (!student) throw new Error("Student not found");
    const category = await ctx.db.get(args.feeCategoryId);
    if (!category) throw new Error("Fee category not found");

    const now = Date.now();
    const status = args.dueDate < now ? "OVERDUE" : "PENDING";

    const id = await ctx.db.insert("fees", {
      studentId: args.studentId,
      feeCategoryId: args.feeCategoryId,
      amount: args.amount,
      paidAmount: 0,
      pendingAmount: args.amount,
      dueDate: args.dueDate,
      academicYear: args.academicYear?.trim(),
      semester: args.semester,
      description: args.description?.trim(),
      status,
      createdBy: actor._id,
      createdAt: now,
      updatedAt: now,
    });

    await audit(ctx, actor._id, "FEE_CREATED", "fee", id, {
      studentId: args.studentId,
      feeCategoryId: args.feeCategoryId,
      amount: args.amount,
      dueDate: args.dueDate,
    });

    return id;
  },
});

export const updateFee = mutation({
  args: {
    feeId: v.id("fees"),
    amount: v.number(),
    dueDate: v.number(),
    academicYear: v.optional(v.string()),
    semester: v.optional(v.number()),
    description: v.optional(v.string()),
    status: v.optional(feeStatusUnion),
  },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const fee = await ctx.db.get(args.feeId);
    if (!fee) throw new Error("Fee record not found");

    if (args.amount < fee.paidAmount) {
      throw new Error(`Total amount cannot be less than already collected amount ($${fee.paidAmount})`);
    }

    const newPending = args.amount - fee.paidAmount;
    let newStatus = args.status || fee.status;

    if (args.status !== "CANCELLED") {
      if (newPending === 0) {
        newStatus = "PAID";
      } else if (fee.paidAmount > 0) {
        newStatus = "PARTIAL";
      } else if (args.dueDate < Date.now()) {
        newStatus = "OVERDUE";
      } else {
        newStatus = "PENDING";
      }
    }

    const now = Date.now();
    await ctx.db.patch(args.feeId, {
      amount: args.amount,
      pendingAmount: newPending,
      dueDate: args.dueDate,
      academicYear: args.academicYear?.trim(),
      semester: args.semester,
      description: args.description?.trim(),
      status: newStatus,
      updatedAt: now,
    });

    await audit(ctx, actor._id, "FEE_UPDATED", "fee", args.feeId, {
      oldAmount: fee.amount,
      newAmount: args.amount,
      newStatus,
    });

    return args.feeId;
  },
});

// ==========================================
// PAYMENT RECORDING & RECEIPT GENERATION
// ==========================================

export const recordPayment = mutation({
  args: {
    feeId: v.id("fees"),
    amount: v.number(),
    paymentMethod: paymentMethodUnion,
    transactionReference: v.optional(v.string()),
    paymentDate: v.number(),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const fee = await ctx.db.get(args.feeId);
    if (!fee) throw new Error("Fee record not found");

    if (fee.status === "PAID") throw new Error("This fee is already fully paid");
    if (fee.status === "CANCELLED") throw new Error("Cannot record payment for a cancelled fee");
    if (args.amount <= 0) throw new Error("Payment amount must be greater than zero");
    if (args.amount > fee.pendingAmount) {
      throw new Error(`Payment amount ($${args.amount}) exceeds remaining pending balance ($${fee.pendingAmount})`);
    }

    const now = Date.now();
    // Unique receipt number: REC-YYYYMMDD-XXXX
    const dateStr = new Date(args.paymentDate || now).toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = `REC-${dateStr}-${randomSuffix}`;

    const paymentId = await ctx.db.insert("payments", {
      receiptNumber,
      feeId: fee._id,
      studentId: fee.studentId,
      amount: args.amount,
      paymentMethod: args.paymentMethod,
      transactionReference: args.transactionReference?.trim(),
      paymentDate: args.paymentDate || now,
      remarks: args.remarks?.trim(),
      recordedBy: actor._id,
      createdAt: now,
    });

    const newPaidAmount = fee.paidAmount + args.amount;
    const newPendingAmount = fee.amount - newPaidAmount;
    const newStatus = newPendingAmount === 0 ? "PAID" : "PARTIAL";

    await ctx.db.patch(fee._id, {
      paidAmount: newPaidAmount,
      pendingAmount: newPendingAmount,
      status: newStatus,
      updatedAt: now,
    });

    await audit(ctx, actor._id, "PAYMENT_RECORDED", "payment", paymentId, {
      feeId: fee._id,
      receiptNumber,
      amount: args.amount,
      paymentMethod: args.paymentMethod,
    });

    return { paymentId, receiptNumber };
  },
});

export const getFeeStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const fees = await ctx.db.query("fees").collect();
    const now = Date.now();

    let totalFees = 0;
    let totalCollected = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    let overdueCount = 0;

    for (const f of fees) {
      if (f.status !== "CANCELLED") {
        totalFees += f.amount;
        totalCollected += f.paidAmount;
        totalPending += f.pendingAmount;
        if (f.status !== "PAID" && f.dueDate < now) {
          totalOverdue += f.pendingAmount;
          overdueCount++;
        }
      }
    }

    return {
      totalFees,
      totalCollected,
      totalPending,
      totalOverdue,
      overdueCount,
      totalCount: fees.length,
      paidCount: fees.filter((f) => f.status === "PAID").length,
    };
  },
});

export const listPayments = query({
  args: {
    studentId: v.optional(v.id("students")),
    feeId: v.optional(v.id("fees")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);

    let payments = await ctx.db.query("payments").collect();

    if (user.role === "STUDENT") {
      const student = await getStudentForUser(ctx, user._id);
      payments = payments.filter((p) => p.studentId === student._id);
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    } else {
      if (args.studentId) {
        payments = payments.filter((p) => p.studentId === args.studentId);
      }
      if (args.feeId) {
        payments = payments.filter((p) => p.feeId === args.feeId);
      }
    }

    const enriched = await Promise.all(
      payments.map(async (p) => {
        const student = await ctx.db.get(p.studentId);
        const fee = await ctx.db.get(p.feeId);
        const category = fee ? await ctx.db.get(fee.feeCategoryId) : null;
        const recorder = await ctx.db.get(p.recordedBy);

        return {
          ...p,
          studentName: student ? `${student.firstName} ${student.lastName}`.trim() : "Unknown",
          studentIdCode: student?.studentId || "",
          categoryName: category?.name || "General Fee",
          recordedByName: recorder?.name || "Admin",
        };
      })
    );

    return enriched.sort((a, b) => b.paymentDate - a.paymentDate);
  },
});

export const getReceipt = query({
  args: { receiptNumber: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_receipt", (q) => q.eq("receiptNumber", args.receiptNumber.trim()))
      .unique();

    if (!payment) return null;

    if (user.role === "STUDENT") {
      const student = await getStudentForUser(ctx, user._id);
      if (payment.studentId !== student._id) {
        throw new Error("Forbidden: You cannot access another student's receipt");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    const student = await ctx.db.get(payment.studentId);
    const fee = await ctx.db.get(payment.feeId);
    const category = fee ? await ctx.db.get(fee.feeCategoryId) : null;
    const recorder = await ctx.db.get(payment.recordedBy);

    return {
      receiptNumber: payment.receiptNumber,
      paymentDate: payment.paymentDate,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      transactionReference: payment.transactionReference,
      remarks: payment.remarks,
      fee: {
        id: fee?._id,
        amount: fee?.amount,
        paidAmount: fee?.paidAmount,
        pendingAmount: fee?.pendingAmount,
        status: fee?.status,
        academicYear: fee?.academicYear,
        semester: fee?.semester,
        description: fee?.description,
      },
      category: category ? { name: category.name, code: category.code } : null,
      student: student
        ? {
            name: `${student.firstName} ${student.lastName}`.trim(),
            studentId: student.studentId,
            rollNumber: student.rollNumber,
            department: student.department,
            program: student.program,
            year: student.year,
            email: student.email,
          }
        : null,
      recordedBy: recorder ? { name: recorder.name, email: recorder.email } : null,
    };
  },
});

// ==========================================
// STUDENT FEES
// ==========================================

export const myFees = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireStudent(ctx);
    const student = await getStudentForUser(ctx, user._id);

    const fees = await ctx.db
      .query("fees")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .collect();

    const now = Date.now();

    const enriched = await Promise.all(
      fees.map(async (fee) => {
        const category = await ctx.db.get(fee.feeCategoryId);
        const payments = await ctx.db
          .query("payments")
          .withIndex("by_fee", (q) => q.eq("feeId", fee._id))
          .collect();

        let computedStatus = fee.status;
        if (fee.status !== "PAID" && fee.status !== "CANCELLED" && fee.dueDate < now) {
          computedStatus = "OVERDUE";
        }

        return {
          ...fee,
          status: computedStatus,
          category: category ? { name: category.name, code: category.code } : null,
          paymentsCount: payments.length,
        };
      })
    );

    return enriched.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const myFeeStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireStudent(ctx);
    const student = await getStudentForUser(ctx, user._id);

    const fees = await ctx.db
      .query("fees")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .collect();

    const now = Date.now();
    let totalFees = 0;
    let paid = 0;
    let pending = 0;
    let overdue = 0;

    for (const f of fees) {
      if (f.status !== "CANCELLED") {
        totalFees += f.amount;
        paid += f.paidAmount;
        pending += f.pendingAmount;
        if (f.status !== "PAID" && f.dueDate < now) {
          overdue += f.pendingAmount;
        }
      }
    }

    return {
      totalFees,
      paid,
      pending,
      overdue,
      hasPending: pending > 0,
    };
  },
});

