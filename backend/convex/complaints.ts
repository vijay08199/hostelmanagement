import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  requireWarden,
  requireStudent,
  requireAuthenticatedUser,
  getStudentForUser,
  getWardenHostels,
} from "./authorization";

const complaintCategoryUnion = v.union(
  v.literal("HOSTEL"),
  v.literal("FOOD"),
  v.literal("ROOMMATE"),
  v.literal("STAFF"),
  v.literal("FACILITY"),
  v.literal("DISCIPLINE"),
  v.literal("OTHER")
);

const complaintPriorityUnion = v.union(
  v.literal("LOW"),
  v.literal("MEDIUM"),
  v.literal("HIGH"),
  v.literal("URGENT")
);

const complaintStatusUnion = v.union(
  v.literal("SUBMITTED"),
  v.literal("UNDER_REVIEW"),
  v.literal("IN_PROGRESS"),
  v.literal("RESOLVED"),
  v.literal("CLOSED"),
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

async function getStudentAllocationContext(ctx: any, studentId: any) {
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
  if (!block) return null;

  return {
    roomId: room._id,
    hostelId: block.hostelId,
    roomNumber: room.roomNumber,
  };
}

// ==========================================
// COMPLAINT QUERIES
// ==========================================

export const listComplaints = query({
  args: {
    hostelId: v.optional(v.id("hostels")),
    status: v.optional(complaintStatusUnion),
    category: v.optional(complaintCategoryUnion),
    priority: v.optional(complaintPriorityUnion),
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

    let records = await ctx.db.query("complaints").collect();

    // Privacy & role isolation: Students only see their own complaints
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
    if (args.category) {
      records = records.filter((r) => r.category === args.category);
    }
    if (args.priority) {
      records = records.filter((r) => r.priority === args.priority);
    }

    records.sort((a, b) => b.createdAt - a.createdAt);

    const enriched = await Promise.all(
      records.map(async (r) => {
        const student = await ctx.db.get(r.studentId);
        const hostel = await ctx.db.get(r.hostelId);
        const room = r.roomId ? await ctx.db.get(r.roomId) : null;
        const reviewer = r.reviewedBy ? await ctx.db.get(r.reviewedBy) : null;
        const resolver = r.resolvedBy ? await ctx.db.get(r.resolvedBy) : null;

        return {
          ...r,
          studentName: student ? `${student.firstName} ${student.lastName}`.trim() : "Student",
          studentIdNumber: student?.studentId || "",
          rollNumber: student?.rollNumber || "",
          hostelName: hostel ? hostel.name : "Hostel",
          roomNumber: room ? room.roomNumber : null,
          reviewerName: reviewer ? reviewer.name : null,
          resolverName: resolver ? resolver.name : null,
        };
      })
    );

    const search = args.search?.trim().toLowerCase();
    if (search) {
      return enriched.filter((r) => {
        const text = [
          r.subject,
          r.description,
          r.category,
          r.priority,
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

export const getComplaint = query({
  args: { id: v.id("complaints") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) return null;

    if (user.role === "STUDENT") {
      const student = await getStudentForUser(ctx, user._id);
      if (!student || item.studentId.toString() !== student._id.toString()) {
        throw new Error("Forbidden: You cannot access another student's complaint");
      }
    } else if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      if (!wardenHostels.some((hId) => hId.toString() === item.hostelId.toString())) {
        throw new Error("Forbidden: You do not have access to this hostel");
      }
    }

    const student = await ctx.db.get(item.studentId);
    const hostel = await ctx.db.get(item.hostelId);
    const room = item.roomId ? await ctx.db.get(item.roomId) : null;
    const reviewer = item.reviewedBy ? await ctx.db.get(item.reviewedBy) : null;
    const resolver = item.resolvedBy ? await ctx.db.get(item.resolvedBy) : null;

    return {
      ...item,
      studentName: student ? `${student.firstName} ${student.lastName}`.trim() : "Student",
      studentIdNumber: student?.studentId || "",
      rollNumber: student?.rollNumber || "",
      studentPhone: student?.phone || "",
      hostelName: hostel ? hostel.name : "Hostel",
      roomNumber: room ? room.roomNumber : null,
      reviewerName: reviewer ? reviewer.name : null,
      resolverName: resolver ? resolver.name : null,
    };
  },
});

export const getComplaintStats = query({
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

    let records = await ctx.db.query("complaints").collect();
    if (allowedHostelIds !== null) {
      records = records.filter((r) => allowedHostelIds!.includes(r.hostelId.toString()));
    }
    if (args.hostelId) {
      records = records.filter((r) => r.hostelId === args.hostelId);
    }

    let submitted = 0;
    let underReview = 0;
    let inProgress = 0;
    let resolved = 0;
    let urgent = 0;

    for (const r of records) {
      if (r.status === "SUBMITTED") submitted++;
      else if (r.status === "UNDER_REVIEW") underReview++;
      else if (r.status === "IN_PROGRESS") inProgress++;
      else if (r.status === "RESOLVED" || r.status === "CLOSED") resolved++;

      if (r.priority === "URGENT" && r.status !== "RESOLVED" && r.status !== "CLOSED" && r.status !== "CANCELLED") {
        urgent++;
      }
    }

    return {
      submitted,
      underReview,
      inProgress,
      resolved,
      urgent,
      total: records.length,
    };
  },
});

export const myComplaints = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireStudent(ctx);
    const student = await getStudentForUser(ctx, user._id);
    if (!student) return [];

    const records = await ctx.db
      .query("complaints")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .collect();

    records.sort((a, b) => b.createdAt - a.createdAt);

    return await Promise.all(
      records.map(async (r) => {
        const hostel = await ctx.db.get(r.hostelId);
        const room = r.roomId ? await ctx.db.get(r.roomId) : null;
        return {
          ...r,
          hostelName: hostel ? hostel.name : "Hostel",
          roomNumber: room ? room.roomNumber : null,
        };
      })
    );
  },
});

// ==========================================
// COMPLAINT MUTATIONS
// ==========================================

export const submitComplaint = mutation({
  args: {
    category: complaintCategoryUnion,
    priority: complaintPriorityUnion,
    subject: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireStudent(ctx);
    const student = await getStudentForUser(ctx, user._id);
    if (!student) throw new Error("Student profile not found");

    if (!args.subject.trim() || !args.description.trim()) {
      throw new Error("Subject and description are required");
    }

    const allocCtx = await getStudentAllocationContext(ctx, student._id);
    if (!allocCtx) {
      throw new Error("Active hostel allocation required to submit a complaint");
    }

    const now = Date.now();
    const id = await ctx.db.insert("complaints", {
      studentId: student._id,
      hostelId: allocCtx.hostelId,
      roomId: allocCtx.roomId,
      category: args.category,
      priority: args.priority,
      subject: args.subject.trim(),
      description: args.description.trim(),
      status: "SUBMITTED",
      createdAt: now,
      updatedAt: now,
    });

    await audit(ctx, user._id, "COMPLAINT_CREATED", "complaints", id, {
      studentId: student._id,
      hostelId: allocCtx.hostelId,
      category: args.category,
      priority: args.priority,
      subject: args.subject,
    });

    return id;
  },
});

export const reviewComplaint = mutation({
  args: {
    id: v.id("complaints"),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Complaint not found");

    if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      if (!wardenHostels.some((hId) => hId.toString() === item.hostelId.toString())) {
        throw new Error("Forbidden: You do not have jurisdiction over this hostel");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "UNDER_REVIEW",
      reviewedBy: user._id,
      reviewedAt: now,
      reviewNotes: args.reviewNotes?.trim() || item.reviewNotes,
      updatedAt: now,
    });

    await audit(ctx, user._id, "COMPLAINT_REVIEWED", "complaints", args.id);
    return args.id;
  },
});

export const startComplaintWork = mutation({
  args: {
    id: v.id("complaints"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Complaint not found");

    if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      if (!wardenHostels.some((hId) => hId.toString() === item.hostelId.toString())) {
        throw new Error("Forbidden: You do not have jurisdiction over this hostel");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "IN_PROGRESS",
      reviewNotes: args.notes?.trim() || item.reviewNotes,
      updatedAt: now,
    });

    await audit(ctx, user._id, "COMPLAINT_UPDATED", "complaints", args.id, {
      status: "IN_PROGRESS",
    });

    return args.id;
  },
});

export const resolveComplaint = mutation({
  args: {
    id: v.id("complaints"),
    resolutionNotes: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Complaint not found");

    if (!args.resolutionNotes.trim()) {
      throw new Error("Resolution remarks are required to resolve a complaint");
    }

    if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      if (!wardenHostels.some((hId) => hId.toString() === item.hostelId.toString())) {
        throw new Error("Forbidden: You do not have jurisdiction over this hostel");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "RESOLVED",
      resolvedBy: user._id,
      resolvedAt: now,
      resolutionNotes: args.resolutionNotes.trim(),
      updatedAt: now,
    });

    await audit(ctx, user._id, "COMPLAINT_RESOLVED", "complaints", args.id, {
      resolutionNotes: args.resolutionNotes,
    });

    return args.id;
  },
});

export const closeComplaint = mutation({
  args: { id: v.id("complaints") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Complaint not found");

    if (user.role === "STUDENT") {
      const student = await getStudentForUser(ctx, user._id);
      if (!student || item.studentId.toString() !== student._id.toString()) {
        throw new Error("Forbidden: You cannot close another student's complaint");
      }
    } else if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      if (!wardenHostels.some((hId) => hId.toString() === item.hostelId.toString())) {
        throw new Error("Forbidden: You do not have jurisdiction over this hostel");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "CLOSED",
      closedAt: now,
      updatedAt: now,
    });

    await audit(ctx, user._id, "COMPLAINT_CLOSED", "complaints", args.id);
    return args.id;
  },
});

export const cancelComplaint = mutation({
  args: { id: v.id("complaints") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Complaint not found");

    if (user.role === "STUDENT") {
      const student = await getStudentForUser(ctx, user._id);
      if (!student || item.studentId.toString() !== student._id.toString()) {
        throw new Error("Forbidden: You cannot cancel another student's complaint");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    if (item.status === "RESOLVED" || item.status === "CLOSED") {
      throw new Error("Cannot cancel a completed complaint");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "CANCELLED",
      updatedAt: now,
    });

    await audit(ctx, user._id, "COMPLAINT_CANCELLED", "complaints", args.id);
    return args.id;
  },
});
