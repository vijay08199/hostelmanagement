import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  requireWarden,
  requireStudent,
  requireAuthenticatedUser,
  getStudentForUser,
  getWardenHostels,
} from "./authorization";

const maintenanceCategoryUnion = v.union(
  v.literal("ELECTRICAL"),
  v.literal("PLUMBING"),
  v.literal("CLEANING"),
  v.literal("FURNITURE"),
  v.literal("INTERNET"),
  v.literal("AC_FAN"),
  v.literal("BATHROOM"),
  v.literal("ROOM"),
  v.literal("OTHER")
);

const maintenancePriorityUnion = v.union(
  v.literal("LOW"),
  v.literal("MEDIUM"),
  v.literal("HIGH"),
  v.literal("URGENT")
);

const maintenanceStatusUnion = v.union(
  v.literal("SUBMITTED"),
  v.literal("ASSIGNED"),
  v.literal("IN_PROGRESS"),
  v.literal("RESOLVED"),
  v.literal("CLOSED"),
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
// MAINTENANCE QUERIES
// ==========================================

export const listMaintenance = query({
  args: {
    hostelId: v.optional(v.id("hostels")),
    status: v.optional(maintenanceStatusUnion),
    category: v.optional(maintenanceCategoryUnion),
    priority: v.optional(maintenancePriorityUnion),
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

    let records = await ctx.db.query("maintenanceRequests").collect();

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
        const room = await ctx.db.get(r.roomId);
        const resolver = r.resolvedBy ? await ctx.db.get(r.resolvedBy) : null;

        return {
          ...r,
          studentName: student ? `${student.firstName} ${student.lastName}`.trim() : "Student",
          studentIdNumber: student?.studentId || "",
          rollNumber: student?.rollNumber || "",
          hostelName: hostel ? hostel.name : "Hostel",
          roomNumber: room ? room.roomNumber : "N/A",
          resolverName: resolver ? resolver.name : null,
        };
      })
    );

    const search = args.search?.trim().toLowerCase();
    if (search) {
      return enriched.filter((r) => {
        const text = [
          r.description,
          r.category,
          r.priority,
          r.roomNumber,
          r.studentName,
          r.studentIdNumber,
          r.hostelName,
          r.assignedTo,
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

export const getMaintenance = query({
  args: { id: v.id("maintenanceRequests") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) return null;

    if (user.role === "STUDENT") {
      const student = await getStudentForUser(ctx, user._id);
      if (!student || item.studentId.toString() !== student._id.toString()) {
        throw new Error("Forbidden: You cannot access another student's maintenance request");
      }
    } else if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      if (!wardenHostels.some((hId) => hId.toString() === item.hostelId.toString())) {
        throw new Error("Forbidden: You do not have access to this hostel");
      }
    }

    const student = await ctx.db.get(item.studentId);
    const hostel = await ctx.db.get(item.hostelId);
    const room = await ctx.db.get(item.roomId);
    const resolver = item.resolvedBy ? await ctx.db.get(item.resolvedBy) : null;

    return {
      ...item,
      studentName: student ? `${student.firstName} ${student.lastName}`.trim() : "Student",
      studentIdNumber: student?.studentId || "",
      rollNumber: student?.rollNumber || "",
      studentPhone: student?.phone || "",
      hostelName: hostel ? hostel.name : "Hostel",
      roomNumber: room ? room.roomNumber : "N/A",
      resolverName: resolver ? resolver.name : null,
    };
  },
});

export const getMaintenanceStats = query({
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

    let records = await ctx.db.query("maintenanceRequests").collect();
    if (allowedHostelIds !== null) {
      records = records.filter((r) => allowedHostelIds!.includes(r.hostelId.toString()));
    }
    if (args.hostelId) {
      records = records.filter((r) => r.hostelId === args.hostelId);
    }

    let open = 0;
    let urgent = 0;
    let inProgress = 0;
    let resolved = 0;

    for (const r of records) {
      if (r.status === "SUBMITTED" || r.status === "ASSIGNED") {
        open++;
      } else if (r.status === "IN_PROGRESS") {
        inProgress++;
      } else if (r.status === "RESOLVED" || r.status === "CLOSED") {
        resolved++;
      }
      if (r.priority === "URGENT" && r.status !== "RESOLVED" && r.status !== "CLOSED" && r.status !== "CANCELLED") {
        urgent++;
      }
    }

    return {
      open,
      urgent,
      inProgress,
      resolved,
      total: records.length,
    };
  },
});

export const myMaintenance = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireStudent(ctx);
    const student = await getStudentForUser(ctx, user._id);
    if (!student) return [];

    const records = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .collect();

    records.sort((a, b) => b.createdAt - a.createdAt);

    return await Promise.all(
      records.map(async (r) => {
        const hostel = await ctx.db.get(r.hostelId);
        const room = await ctx.db.get(r.roomId);
        return {
          ...r,
          hostelName: hostel ? hostel.name : "Hostel",
          roomNumber: room ? room.roomNumber : "N/A",
        };
      })
    );
  },
});

// ==========================================
// MAINTENANCE MUTATIONS
// ==========================================

export const createMaintenance = mutation({
  args: {
    category: maintenanceCategoryUnion,
    priority: maintenancePriorityUnion,
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireStudent(ctx);
    const student = await getStudentForUser(ctx, user._id);
    if (!student) throw new Error("Student profile not found");

    if (!args.description.trim()) {
      throw new Error("Description of the issue is required");
    }

    const allocCtx = await getStudentAllocationContext(ctx, student._id);
    if (!allocCtx) {
      throw new Error("Active room allocation required to submit a maintenance request");
    }

    const now = Date.now();
    const historyEntry = {
      status: "SUBMITTED",
      timestamp: now,
      note: "Request submitted by student",
      actorName: `${student.firstName} ${student.lastName}`.trim(),
    };

    const id = await ctx.db.insert("maintenanceRequests", {
      studentId: student._id,
      hostelId: allocCtx.hostelId,
      roomId: allocCtx.roomId,
      category: args.category,
      priority: args.priority,
      description: args.description.trim(),
      status: "SUBMITTED",
      statusHistory: [historyEntry],
      createdAt: now,
      updatedAt: now,
    });

    await audit(ctx, user._id, "MAINTENANCE_CREATED", "maintenanceRequests", id, {
      studentId: student._id,
      hostelId: allocCtx.hostelId,
      roomId: allocCtx.roomId,
      category: args.category,
      priority: args.priority,
    });

    return id;
  },
});

export const assignMaintenance = mutation({
  args: {
    id: v.id("maintenanceRequests"),
    assignedTo: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Maintenance request not found");

    if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      if (!wardenHostels.some((hId) => hId.toString() === item.hostelId.toString())) {
        throw new Error("Forbidden: You do not have jurisdiction over this hostel");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    if (!args.assignedTo.trim()) {
      throw new Error("Technician or staff name is required for assignment");
    }

    const now = Date.now();
    const history = item.statusHistory || [];
    history.push({
      status: "ASSIGNED",
      timestamp: now,
      note: args.note?.trim() || `Assigned to ${args.assignedTo.trim()}`,
      actorName: user.name,
    });

    await ctx.db.patch(args.id, {
      status: "ASSIGNED",
      assignedTo: args.assignedTo.trim(),
      assignedAt: now,
      statusHistory: history,
      updatedAt: now,
    });

    await audit(ctx, user._id, "MAINTENANCE_ASSIGNED", "maintenanceRequests", args.id, {
      assignedTo: args.assignedTo,
    });

    return args.id;
  },
});

export const startMaintenance = mutation({
  args: {
    id: v.id("maintenanceRequests"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Maintenance request not found");

    if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      if (!wardenHostels.some((hId) => hId.toString() === item.hostelId.toString())) {
        throw new Error("Forbidden: You do not have jurisdiction over this hostel");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    const now = Date.now();
    const history = item.statusHistory || [];
    history.push({
      status: "IN_PROGRESS",
      timestamp: now,
      note: args.note?.trim() || "Work commenced on maintenance request",
      actorName: user.name,
    });

    await ctx.db.patch(args.id, {
      status: "IN_PROGRESS",
      startedAt: now,
      statusHistory: history,
      updatedAt: now,
    });

    await audit(ctx, user._id, "MAINTENANCE_STARTED", "maintenanceRequests", args.id);
    return args.id;
  },
});

export const resolveMaintenance = mutation({
  args: {
    id: v.id("maintenanceRequests"),
    resolutionNotes: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Maintenance request not found");

    if (!args.resolutionNotes.trim()) {
      throw new Error("Resolution notes are required to mark maintenance as resolved");
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
    const history = item.statusHistory || [];
    history.push({
      status: "RESOLVED",
      timestamp: now,
      note: args.resolutionNotes.trim(),
      actorName: user.name,
    });

    await ctx.db.patch(args.id, {
      status: "RESOLVED",
      resolvedBy: user._id,
      resolvedAt: now,
      resolutionNotes: args.resolutionNotes.trim(),
      statusHistory: history,
      updatedAt: now,
    });

    await audit(ctx, user._id, "MAINTENANCE_RESOLVED", "maintenanceRequests", args.id, {
      resolutionNotes: args.resolutionNotes,
    });

    return args.id;
  },
});

export const closeMaintenance = mutation({
  args: {
    id: v.id("maintenanceRequests"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Maintenance request not found");

    if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      if (!wardenHostels.some((hId) => hId.toString() === item.hostelId.toString())) {
        throw new Error("Forbidden: You do not have jurisdiction over this hostel");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    const now = Date.now();
    const history = item.statusHistory || [];
    history.push({
      status: "CLOSED",
      timestamp: now,
      note: args.note?.trim() || "Maintenance request closed",
      actorName: user.name,
    });

    await ctx.db.patch(args.id, {
      status: "CLOSED",
      closedAt: now,
      statusHistory: history,
      updatedAt: now,
    });

    await audit(ctx, user._id, "MAINTENANCE_CLOSED", "maintenanceRequests", args.id);
    return args.id;
  },
});

export const cancelMaintenance = mutation({
  args: { id: v.id("maintenanceRequests") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Maintenance request not found");

    if (user.role === "STUDENT") {
      const student = await getStudentForUser(ctx, user._id);
      if (!student || item.studentId.toString() !== student._id.toString()) {
        throw new Error("Forbidden: You cannot cancel another student's request");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    if (item.status === "RESOLVED" || item.status === "CLOSED") {
      throw new Error("Cannot cancel a completed maintenance request");
    }

    const now = Date.now();
    const history = item.statusHistory || [];
    history.push({
      status: "CANCELLED",
      timestamp: now,
      note: "Cancelled by requester",
      actorName: user.name,
    });

    await ctx.db.patch(args.id, {
      status: "CANCELLED",
      statusHistory: history,
      updatedAt: now,
    });

    await audit(ctx, user._id, "MAINTENANCE_CANCELLED", "maintenanceRequests", args.id);
    return args.id;
  },
});
