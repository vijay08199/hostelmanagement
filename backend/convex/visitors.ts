import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  requireWarden,
  requireStudent,
  requireAuthenticatedUser,
  getStudentForUser,
  getWardenHostels,
} from "./authorization";

const visitorStatusUnion = v.union(
  v.literal("PENDING"),
  v.literal("APPROVED"),
  v.literal("REJECTED"),
  v.literal("CHECKED_IN"),
  v.literal("CHECKED_OUT"),
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
// VISITOR QUERIES
// ==========================================

export const listVisitors = query({
  args: {
    hostelId: v.optional(v.id("hostels")),
    status: v.optional(visitorStatusUnion),
    visitDate: v.optional(v.string()),
    search: v.optional(v.string()),
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

    let records = await ctx.db.query("visitors").collect();

    if (user.role === "STUDENT") {
      records = records.filter((r) => r.studentId.toString() === currentStudentId);
    } else if (user.role === "WARDEN" && allowedHostelIds !== null) {
      records = records.filter((r) => allowedHostelIds!.includes(r.hostelId.toString()));
    }

    if (args.hostelId) {
      records = records.filter((r) => r.hostelId === args.hostelId);
    }
    if (args.status) {
      records = records.filter((r) => r.status === args.status);
    }
    if (args.visitDate) {
      records = records.filter((r) => r.visitDate === args.visitDate);
    }

    records.sort((a, b) => b.createdAt - a.createdAt);

    const enriched = await Promise.all(
      records.map(async (r) => {
        const student = await ctx.db.get(r.studentId);
        const hostel = await ctx.db.get(r.hostelId);
        const approver = r.approvedBy ? await ctx.db.get(r.approvedBy) : null;

        return {
          ...r,
          studentName: student ? `${student.firstName} ${student.lastName}`.trim() : "Student",
          studentIdNumber: student?.studentId || "",
          rollNumber: student?.rollNumber || "",
          studentPhone: student?.phone || "",
          hostelName: hostel ? hostel.name : "Hostel",
          approverName: approver ? approver.name : null,
        };
      })
    );

    const search = args.search?.trim().toLowerCase();
    if (search) {
      return enriched.filter((r) => {
        const text = [
          r.visitorName,
          r.relationship,
          r.phone,
          r.purpose,
          r.studentName,
          r.studentIdNumber,
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

export const getVisitor = query({
  args: { id: v.id("visitors") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) return null;

    if (user.role === "STUDENT") {
      const student = await getStudentForUser(ctx, user._id);
      if (!student || item.studentId.toString() !== student._id.toString()) {
        throw new Error("Forbidden: You cannot access another student's visitor");
      }
    } else if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      if (!wardenHostels.some((hId) => hId.toString() === item.hostelId.toString())) {
        throw new Error("Forbidden: You do not have access to this hostel");
      }
    }

    const student = await ctx.db.get(item.studentId);
    const hostel = await ctx.db.get(item.hostelId);
    const approver = item.approvedBy ? await ctx.db.get(item.approvedBy) : null;

    return {
      ...item,
      studentName: student ? `${student.firstName} ${student.lastName}`.trim() : "Student",
      studentIdNumber: student?.studentId || "",
      rollNumber: student?.rollNumber || "",
      hostelName: hostel ? hostel.name : "Hostel",
      approverName: approver ? approver.name : null,
    };
  },
});

export const getVisitorStats = query({
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

    let records = await ctx.db.query("visitors").collect();
    if (allowedHostelIds !== null) {
      records = records.filter((r) => allowedHostelIds!.includes(r.hostelId.toString()));
    }
    if (args.hostelId) {
      records = records.filter((r) => r.hostelId === args.hostelId);
    }

    const todayStr = new Date().toISOString().split("T")[0];

    let todayVisitors = 0;
    let pendingApprovals = 0;
    let checkedIn = 0;
    let checkedOut = 0;

    for (const r of records) {
      if (r.visitDate === todayStr) {
        todayVisitors++;
      }
      if (r.status === "PENDING") {
        pendingApprovals++;
      } else if (r.status === "CHECKED_IN") {
        checkedIn++;
      } else if (r.status === "CHECKED_OUT") {
        checkedOut++;
      }
    }

    return {
      todayVisitors,
      pendingApprovals,
      checkedIn,
      checkedOut,
      total: records.length,
    };
  },
});

export const myVisitors = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireStudent(ctx);
    const student = await getStudentForUser(ctx, user._id);
    if (!student) return [];

    const records = await ctx.db
      .query("visitors")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .collect();

    records.sort((a, b) => b.createdAt - a.createdAt);

    return await Promise.all(
      records.map(async (r) => {
        const hostel = await ctx.db.get(r.hostelId);
        const approver = r.approvedBy ? await ctx.db.get(r.approvedBy) : null;
        return {
          ...r,
          hostelName: hostel ? hostel.name : "Hostel",
          approverName: approver ? approver.name : null,
        };
      })
    );
  },
});

// ==========================================
// VISITOR MUTATIONS
// ==========================================

export const registerVisitor = mutation({
  args: {
    visitorName: v.string(),
    relationship: v.string(),
    phone: v.string(),
    visitDate: v.string(),
    expectedArrivalTime: v.string(),
    expectedDepartureTime: v.string(),
    purpose: v.string(),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireStudent(ctx);
    const student = await getStudentForUser(ctx, user._id);
    if (!student) throw new Error("Student profile not found");

    if (!args.visitorName.trim() || !args.relationship.trim() || !args.phone.trim()) {
      throw new Error("Visitor name, relationship, and phone number are required");
    }
    if (!args.visitDate || !args.expectedArrivalTime || !args.expectedDepartureTime) {
      throw new Error("Visit date, expected arrival, and expected departure are required");
    }
    if (!args.purpose.trim()) {
      throw new Error("Purpose of visit cannot be empty");
    }

    const hostelId = await getHostelIdForStudent(ctx, student._id);
    if (!hostelId) {
      throw new Error("Active hostel allocation required to register a visitor");
    }

    const now = Date.now();
    const id = await ctx.db.insert("visitors", {
      studentId: student._id,
      hostelId,
      visitorName: args.visitorName.trim(),
      relationship: args.relationship.trim(),
      phone: args.phone.trim(),
      visitDate: args.visitDate,
      expectedArrivalTime: args.expectedArrivalTime,
      expectedDepartureTime: args.expectedDepartureTime,
      purpose: args.purpose.trim(),
      status: "PENDING",
      remarks: args.remarks?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });

    await audit(ctx, user._id, "VISITOR_CREATED", "visitors", id, {
      studentId: student._id,
      hostelId,
      visitorName: args.visitorName,
      visitDate: args.visitDate,
    });

    return id;
  },
});

export const cancelVisitor = mutation({
  args: { id: v.id("visitors") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Visitor request not found");

    if (user.role === "STUDENT") {
      const student = await getStudentForUser(ctx, user._id);
      if (!student || item.studentId.toString() !== student._id.toString()) {
        throw new Error("Forbidden: You cannot cancel another student's visitor request");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    if (item.status !== "PENDING") {
      throw new Error("Only pending visitor requests can be cancelled");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "CANCELLED",
      updatedAt: now,
    });

    await audit(ctx, user._id, "VISITOR_CANCELLED", "visitors", args.id);
    return args.id;
  },
});

export const approveVisitor = mutation({
  args: {
    id: v.id("visitors"),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Visitor request not found");

    if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      if (!wardenHostels.some((hId) => hId.toString() === item.hostelId.toString())) {
        throw new Error("Forbidden: You do not have jurisdiction over this hostel");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    if (item.status !== "PENDING") {
      throw new Error(`Cannot approve visitor in ${item.status} status`);
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "APPROVED",
      approvedBy: user._id,
      approvedAt: now,
      remarks: args.remarks?.trim() || item.remarks,
      updatedAt: now,
    });

    await audit(ctx, user._id, "VISITOR_APPROVED", "visitors", args.id, {
      approvedBy: user._id,
      remarks: args.remarks,
    });

    return args.id;
  },
});

export const rejectVisitor = mutation({
  args: {
    id: v.id("visitors"),
    remarks: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Visitor request not found");

    if (!args.remarks || !args.remarks.trim()) {
      throw new Error("A reason/remark is required when rejecting a visitor request");
    }

    if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      if (!wardenHostels.some((hId) => hId.toString() === item.hostelId.toString())) {
        throw new Error("Forbidden: You do not have jurisdiction over this hostel");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    if (item.status !== "PENDING") {
      throw new Error(`Cannot reject visitor in ${item.status} status`);
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "REJECTED",
      approvedBy: user._id,
      approvedAt: now,
      remarks: args.remarks.trim(),
      updatedAt: now,
    });

    await audit(ctx, user._id, "VISITOR_REJECTED", "visitors", args.id, {
      reviewedBy: user._id,
      remarks: args.remarks,
    });

    return args.id;
  },
});

export const checkInVisitor = mutation({
  args: {
    id: v.id("visitors"),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Visitor request not found");

    if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      if (!wardenHostels.some((hId) => hId.toString() === item.hostelId.toString())) {
        throw new Error("Forbidden: You do not have jurisdiction over this hostel");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    if (item.status !== "APPROVED") {
      throw new Error(`Cannot check in visitor in ${item.status} status. Request must be APPROVED first.`);
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "CHECKED_IN",
      checkedInAt: now,
      remarks: args.remarks?.trim() || item.remarks,
      updatedAt: now,
    });

    await audit(ctx, user._id, "VISITOR_CHECKED_IN", "visitors", args.id, {
      checkedInAt: now,
    });

    return args.id;
  },
});

export const checkOutVisitor = mutation({
  args: {
    id: v.id("visitors"),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Visitor request not found");

    if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      if (!wardenHostels.some((hId) => hId.toString() === item.hostelId.toString())) {
        throw new Error("Forbidden: You do not have jurisdiction over this hostel");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    if (item.status !== "CHECKED_IN") {
      throw new Error(`Cannot check out visitor in ${item.status} status. Must be CHECKED_IN.`);
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "CHECKED_OUT",
      checkedOutAt: now,
      remarks: args.remarks?.trim() || item.remarks,
      updatedAt: now,
    });

    await audit(ctx, user._id, "VISITOR_CHECKED_OUT", "visitors", args.id, {
      checkedOutAt: now,
    });

    return args.id;
  },
});
