import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  requireAdmin,
  requireWarden,
  requireStudent,
  requireAuthenticatedUser,
  getStudentForUser,
  getWardenHostels,
} from "./authorization";

const leaveStatusUnion = v.union(
  v.literal("PENDING"),
  v.literal("APPROVED"),
  v.literal("REJECTED"),
  v.literal("CANCELLED")
);

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

async function getHostelIdForStudent(ctx: any, studentId: any) {
  const allocation = await ctx.db
    .query("allocations")
    .withIndex("by_student_status", (q: any) =>
      q.eq("studentId", studentId).eq("status", "ACTIVE")
    )
    .first();
  if (!allocation) return null;
  const room = await ctx.db.get(allocation.roomId);
  if (!room) return null;
  const floor = await ctx.db.get(room.floorId);
  if (!floor) return null;
  const block = await ctx.db.get(floor.blockId);
  return block ? block.hostelId : null;
}

// ==========================================
// LEAVE QUERIES
// ==========================================

export const listLeaves = query({
  args: {
    hostelId: v.optional(v.id("hostels")),
    status: v.optional(leaveStatusUnion),
    search: v.optional(v.string()),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    let allowedHostelIds: string[] | null = null;
    let currentStudentId: string | null = null;

    if (user.role === "STUDENT") {
      const student = await getStudentForUser(ctx, user._id);
      if (!student) return [];
      currentStudentId = student._id.toString();
    } else if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      allowedHostelIds = wardenHostels.map((id) => id.toString());
      if (args.hostelId && !allowedHostelIds.includes(args.hostelId.toString())) {
        throw new Error("Forbidden: You do not have access to this hostel");
      }
    }

    let records = await ctx.db.query("leaves").collect();

    // Role-based isolation
    if (user.role === "STUDENT") {
      records = records.filter((r) => r.studentId.toString() === currentStudentId);
    } else if (user.role === "WARDEN" && allowedHostelIds !== null) {
      records = records.filter((r) => allowedHostelIds!.includes(r.hostelId.toString()));
    }

    // Filter args
    if (args.hostelId) {
      records = records.filter((r) => r.hostelId === args.hostelId);
    }
    if (args.status) {
      records = records.filter((r) => r.status === args.status);
    }
    if (args.fromDate) {
      records = records.filter((r) => r.fromDate >= args.fromDate!);
    }
    if (args.toDate) {
      records = records.filter((r) => r.toDate <= args.toDate!);
    }

    records.sort((a, b) => b.createdAt - a.createdAt);

    const enriched = await Promise.all(
      records.map(async (r) => {
        const student = await ctx.db.get(r.studentId);
        const hostel = await ctx.db.get(r.hostelId);
        const reviewer = r.reviewedBy ? await ctx.db.get(r.reviewedBy) : null;

        return {
          ...r,
          studentName: student ? `${student.firstName} ${student.lastName}`.trim() : "Student",
          studentIdNumber: student?.studentId || "",
          rollNumber: student?.rollNumber || "",
          studentPhone: student?.phone || "",
          hostelName: hostel ? hostel.name : "Hostel",
          reviewerName: reviewer ? reviewer.name : null,
        };
      })
    );

    const search = args.search?.trim().toLowerCase();
    if (search) {
      return enriched.filter((r) => {
        const text = [
          r.studentName,
          r.studentIdNumber,
          r.rollNumber,
          r.destination,
          r.reason,
          r.hostelName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(search);
      });
    }

    return enriched;
  },
});

export const getLeave = query({
  args: { id: v.id("leaves") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const leave = await ctx.db.get(args.id);
    if (!leave) return null;

    if (user.role === "STUDENT") {
      const student = await getStudentForUser(ctx, user._id);
      if (!student || leave.studentId.toString() !== student._id.toString()) {
        throw new Error("Forbidden: You cannot access another student's leave");
      }
    } else if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      if (!wardenHostels.some((id) => id.toString() === leave.hostelId.toString())) {
        throw new Error("Forbidden: You do not have access to this hostel");
      }
    }

    const student = await ctx.db.get(leave.studentId);
    const hostel = await ctx.db.get(leave.hostelId);
    const reviewer = leave.reviewedBy ? await ctx.db.get(leave.reviewedBy) : null;

    return {
      ...leave,
      studentName: student ? `${student.firstName} ${student.lastName}`.trim() : "Student",
      studentIdNumber: student?.studentId || "",
      rollNumber: student?.rollNumber || "",
      studentPhone: student?.phone || "",
      hostelName: hostel ? hostel.name : "Hostel",
      reviewerName: reviewer ? reviewer.name : null,
    };
  },
});

export const getLeaveStats = query({
  args: { hostelId: v.optional(v.id("hostels")) },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    let allowedHostelIds: string[] | null = null;

    if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      allowedHostelIds = wardenHostels.map((id) => id.toString());
      if (args.hostelId && !allowedHostelIds.includes(args.hostelId.toString())) {
        throw new Error("Forbidden: You do not have access to this hostel");
      }
    }

    let records = await ctx.db.query("leaves").collect();
    if (allowedHostelIds !== null) {
      records = records.filter((r) => allowedHostelIds!.includes(r.hostelId.toString()));
    }
    if (args.hostelId) {
      records = records.filter((r) => r.hostelId === args.hostelId);
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    let pending = 0;
    let approvedToday = 0;
    let rejected = 0;
    let upcoming = 0;

    for (const r of records) {
      if (r.status === "PENDING") pending++;
      else if (r.status === "REJECTED") rejected++;
      else if (r.status === "APPROVED") {
        if (r.reviewedAt && r.reviewedAt >= oneDayAgo) {
          approvedToday++;
        }
        if (r.fromDate >= todayStr) {
          upcoming++;
        }
      }
    }

    return {
      pending,
      approvedToday,
      rejected,
      upcoming,
      total: records.length,
    };
  },
});

export const myLeaves = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireStudent(ctx);
    const student = await getStudentForUser(ctx, user._id);
    if (!student) return [];

    const records = await ctx.db
      .query("leaves")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .collect();

    records.sort((a, b) => b.createdAt - a.createdAt);

    return await Promise.all(
      records.map(async (r) => {
        const hostel = await ctx.db.get(r.hostelId);
        const reviewer = r.reviewedBy ? await ctx.db.get(r.reviewedBy) : null;
        return {
          ...r,
          hostelName: hostel ? hostel.name : "Hostel",
          reviewerName: reviewer ? reviewer.name : null,
        };
      })
    );
  },
});

// ==========================================
// LEAVE MUTATIONS
// ==========================================

export const applyLeave = mutation({
  args: {
    fromDate: v.string(),
    toDate: v.string(),
    reason: v.string(),
    destination: v.string(),
    emergencyContact: v.string(),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireStudent(ctx);
    const student = await getStudentForUser(ctx, user._id);
    if (!student) throw new Error("Student profile not found");

    if (!args.fromDate || !args.toDate) {
      throw new Error("From and To dates are required");
    }
    if (args.toDate < args.fromDate) {
      throw new Error("End date cannot be earlier than start date");
    }
    if (!args.reason.trim()) {
      throw new Error("Reason cannot be empty");
    }
    if (!args.emergencyContact.trim()) {
      throw new Error("Emergency contact number is required");
    }

    const hostelId = await getHostelIdForStudent(ctx, student._id);
    if (!hostelId) {
      throw new Error("Active hostel allocation required to apply for leave");
    }

    const now = Date.now();
    const id = await ctx.db.insert("leaves", {
      studentId: student._id,
      hostelId,
      fromDate: args.fromDate,
      toDate: args.toDate,
      reason: args.reason.trim(),
      destination: args.destination.trim(),
      emergencyContact: args.emergencyContact.trim(),
      status: "PENDING",
      remarks: args.remarks?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });

    await audit(ctx, user._id, "LEAVE_CREATED", "leaves", id, {
      studentId: student._id,
      hostelId,
      fromDate: args.fromDate,
      toDate: args.toDate,
    });

    return id;
  },
});

export const cancelLeave = mutation({
  args: { id: v.id("leaves") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const leave = await ctx.db.get(args.id);
    if (!leave) throw new Error("Leave request not found");

    if (user.role === "STUDENT") {
      const student = await getStudentForUser(ctx, user._id);
      if (!student || leave.studentId.toString() !== student._id.toString()) {
        throw new Error("Forbidden: You cannot cancel another student's leave");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    if (leave.status !== "PENDING") {
      throw new Error("Only pending leave requests can be cancelled");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "CANCELLED",
      updatedAt: now,
    });

    await audit(ctx, user._id, "LEAVE_CANCELLED", "leaves", args.id);
    return args.id;
  },
});

export const approveLeave = mutation({
  args: {
    id: v.id("leaves"),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const leave = await ctx.db.get(args.id);
    if (!leave) throw new Error("Leave request not found");

    if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      if (!wardenHostels.some((hId) => hId.toString() === leave.hostelId.toString())) {
        throw new Error("Forbidden: You do not have jurisdiction over this hostel");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    if (leave.status !== "PENDING") {
      throw new Error(`Cannot approve leave in ${leave.status} status`);
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "APPROVED",
      reviewedBy: user._id,
      reviewedAt: now,
      remarks: args.remarks?.trim() || leave.remarks,
      updatedAt: now,
    });

    await audit(ctx, user._id, "LEAVE_APPROVED", "leaves", args.id, {
      reviewedBy: user._id,
      remarks: args.remarks,
    });

    return args.id;
  },
});

export const rejectLeave = mutation({
  args: {
    id: v.id("leaves"),
    remarks: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const leave = await ctx.db.get(args.id);
    if (!leave) throw new Error("Leave request not found");

    if (!args.remarks || !args.remarks.trim()) {
      throw new Error("A reason/remark is required when rejecting a leave request");
    }

    if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      if (!wardenHostels.some((hId) => hId.toString() === leave.hostelId.toString())) {
        throw new Error("Forbidden: You do not have jurisdiction over this hostel");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    if (leave.status !== "PENDING") {
      throw new Error(`Cannot reject leave in ${leave.status} status`);
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "REJECTED",
      reviewedBy: user._id,
      reviewedAt: now,
      remarks: args.remarks.trim(),
      updatedAt: now,
    });

    await audit(ctx, user._id, "LEAVE_REJECTED", "leaves", args.id, {
      reviewedBy: user._id,
      remarks: args.remarks,
    });

    return args.id;
  },
});
