import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  requireWarden,
  requireStudent,
  requireAuthenticatedUser,
  getStudentForUser,
  getWardenHostels,
} from "./authorization";

const permissionTypeUnion = v.union(
  v.literal("OUTING"),
  v.literal("NIGHT_OUT"),
  v.literal("WEEKEND"),
  v.literal("SPECIAL"),
  v.literal("OTHER")
);

const permissionStatusUnion = v.union(
  v.literal("PENDING"),
  v.literal("APPROVED"),
  v.literal("REJECTED"),
  v.literal("CANCELLED"),
  v.literal("EXPIRED")
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
// PERMISSION QUERIES
// ==========================================

export const listPermissions = query({
  args: {
    hostelId: v.optional(v.id("hostels")),
    status: v.optional(permissionStatusUnion),
    permissionType: v.optional(permissionTypeUnion),
    date: v.optional(v.string()),
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

    let records = await ctx.db.query("permissions").collect();

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
    if (args.permissionType) {
      records = records.filter((r) => r.permissionType === args.permissionType);
    }
    if (args.date) {
      records = records.filter((r) => r.date === args.date);
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
          r.permissionType,
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

export const getPermission = query({
  args: { id: v.id("permissions") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) return null;

    if (user.role === "STUDENT") {
      const student = await getStudentForUser(ctx, user._id);
      if (!student || item.studentId.toString() !== student._id.toString()) {
        throw new Error("Forbidden: You cannot access another student's permission");
      }
    } else if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      if (!wardenHostels.some((hId) => hId.toString() === item.hostelId.toString())) {
        throw new Error("Forbidden: You do not have access to this hostel");
      }
    }

    const student = await ctx.db.get(item.studentId);
    const hostel = await ctx.db.get(item.hostelId);
    const reviewer = item.reviewedBy ? await ctx.db.get(item.reviewedBy) : null;

    return {
      ...item,
      studentName: student ? `${student.firstName} ${student.lastName}`.trim() : "Student",
      studentIdNumber: student?.studentId || "",
      rollNumber: student?.rollNumber || "",
      studentPhone: student?.phone || "",
      hostelName: hostel ? hostel.name : "Hostel",
      reviewerName: reviewer ? reviewer.name : null,
    };
  },
});

export const getPermissionStats = query({
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

    let records = await ctx.db.query("permissions").collect();
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
    let upcoming = 0;
    let rejected = 0;

    for (const r of records) {
      if (r.status === "PENDING") pending++;
      else if (r.status === "REJECTED") rejected++;
      else if (r.status === "APPROVED") {
        if (r.reviewedAt && r.reviewedAt >= oneDayAgo) {
          approvedToday++;
        }
        if (r.date >= todayStr) {
          upcoming++;
        }
      }
    }

    return {
      pending,
      approvedToday,
      upcoming,
      rejected,
      total: records.length,
    };
  },
});

export const myPermissions = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireStudent(ctx);
    const student = await getStudentForUser(ctx, user._id);
    if (!student) return [];

    const records = await ctx.db
      .query("permissions")
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
// PERMISSION MUTATIONS
// ==========================================

export const requestPermission = mutation({
  args: {
    permissionType: permissionTypeUnion,
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    destination: v.string(),
    reason: v.string(),
    emergencyContact: v.string(),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireStudent(ctx);
    const student = await getStudentForUser(ctx, user._id);
    if (!student) throw new Error("Student profile not found");

    if (!args.date || !args.startTime || !args.endTime) {
      throw new Error("Date, start time, and end time are required");
    }
    if (!args.destination.trim() || !args.reason.trim()) {
      throw new Error("Destination and reason are required");
    }
    if (!args.emergencyContact.trim()) {
      throw new Error("Emergency contact is required");
    }

    const hostelId = await getHostelIdForStudent(ctx, student._id);
    if (!hostelId) {
      throw new Error("Active hostel allocation required to request permission");
    }

    const now = Date.now();
    const id = await ctx.db.insert("permissions", {
      studentId: student._id,
      hostelId,
      permissionType: args.permissionType,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      destination: args.destination.trim(),
      reason: args.reason.trim(),
      emergencyContact: args.emergencyContact.trim(),
      status: "PENDING",
      remarks: args.remarks?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });

    await audit(ctx, user._id, "PERMISSION_CREATED", "permissions", id, {
      studentId: student._id,
      hostelId,
      permissionType: args.permissionType,
      date: args.date,
    });

    return id;
  },
});

export const cancelPermission = mutation({
  args: { id: v.id("permissions") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Permission request not found");

    if (user.role === "STUDENT") {
      const student = await getStudentForUser(ctx, user._id);
      if (!student || item.studentId.toString() !== student._id.toString()) {
        throw new Error("Forbidden: You cannot cancel another student's permission");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    if (item.status !== "PENDING") {
      throw new Error("Only pending permission requests can be cancelled");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "CANCELLED",
      updatedAt: now,
    });

    await audit(ctx, user._id, "PERMISSION_CANCELLED", "permissions", args.id);
    return args.id;
  },
});

export const approvePermission = mutation({
  args: {
    id: v.id("permissions"),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Permission request not found");

    if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      if (!wardenHostels.some((hId) => hId.toString() === item.hostelId.toString())) {
        throw new Error("Forbidden: You do not have jurisdiction over this hostel");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    if (item.status !== "PENDING") {
      throw new Error(`Cannot approve permission in ${item.status} status`);
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "APPROVED",
      reviewedBy: user._id,
      reviewedAt: now,
      remarks: args.remarks?.trim() || item.remarks,
      updatedAt: now,
    });

    await audit(ctx, user._id, "PERMISSION_APPROVED", "permissions", args.id, {
      reviewedBy: user._id,
      remarks: args.remarks,
    });

    return args.id;
  },
});

export const rejectPermission = mutation({
  args: {
    id: v.id("permissions"),
    remarks: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Permission request not found");

    if (!args.remarks || !args.remarks.trim()) {
      throw new Error("A reason/remark is required when rejecting a permission request");
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
      throw new Error(`Cannot reject permission in ${item.status} status`);
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "REJECTED",
      reviewedBy: user._id,
      reviewedAt: now,
      remarks: args.remarks.trim(),
      updatedAt: now,
    });

    await audit(ctx, user._id, "PERMISSION_REJECTED", "permissions", args.id, {
      reviewedBy: user._id,
      remarks: args.remarks,
    });

    return args.id;
  },
});
