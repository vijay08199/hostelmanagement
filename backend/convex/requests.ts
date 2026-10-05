import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireAuthenticatedUser, requireStudent, requireWarden } from "./authorization";

const category = v.union(v.literal("MAINTENANCE"), v.literal("LEAVE"), v.literal("ROOM_CHANGE"), v.literal("COMPLAINT"), v.literal("OTHER"));
const status = v.union(v.literal("PENDING"), v.literal("IN_PROGRESS"), v.literal("APPROVED"), v.literal("REJECTED"), v.literal("RESOLVED"), v.literal("CANCELLED"));
const priority = v.union(v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH"));

async function student(ctx: any) {
  const user = await requireStudent(ctx);
  const record = await ctx.db.query("students").withIndex("by_user", (q: any) => q.eq("userId", user._id)).unique();
  if (!record) throw new Error("Student profile not found");
  const allocation = await ctx.db.query("allocations").withIndex("by_student_status", (q: any) => q.eq("studentId", record._id).eq("status", "ACTIVE")).unique();
  if (!allocation) throw new Error("Active allocation required to submit requests");
  const bed = await ctx.db.get(allocation.bedId);
  const room = bed ? await ctx.db.get(bed.roomId) : null;
  const floor = room ? await ctx.db.get(room.floorId) : null;
  const block = floor ? await ctx.db.get(floor.blockId) : null;
  if (!block) throw new Error("Allocation hierarchy is invalid");
  return { user, record, hostelId: block.hostelId, roomNumber: room?.roomNumber };
}

async function enrichRequest(ctx: any, req: any) {
  const student = await ctx.db.get(req.studentId);
  const hostel = await ctx.db.get(req.hostelId);
  const allocation = await ctx.db.query("allocations").withIndex("by_student_status", (q: any) => q.eq("studentId", req.studentId).eq("status", "ACTIVE")).unique();
  const room = allocation ? await ctx.db.get(allocation.roomId) : null;
  const resolver = req.resolvedBy ? await ctx.db.get(req.resolvedBy) : null;
  return {
    ...req,
    studentName: student ? `${student.firstName} ${student.lastName}`.trim() : "Unknown Student",
    studentIdentifier: student?.studentId ?? "—",
    studentRollNumber: student?.rollNumber ?? student?.studentId ?? "—",
    hostelName: hostel?.name ?? "—",
    hostelCode: hostel?.code ?? "—",
    roomNumber: room?.roomNumber ?? "—",
    resolvedByName: resolver?.name ?? undefined,
  };
}

export const create = mutation({
  args: {
    category,
    subject: v.string(),
    description: v.string(),
    priority
  },
  handler: async (ctx, args) => {
    const { user, record, hostelId } = await student(ctx);
    const subject = args.subject.trim();
    const description = args.description.trim();
    if (!subject || !description) throw new Error("Subject and description are required");
    const now = Date.now();
    const id = await ctx.db.insert("requests", {
      studentId: record._id,
      hostelId,
      category: args.category,
      subject,
      description,
      priority: args.priority,
      status: "PENDING",
      createdAt: now,
      updatedAt: now
    });
    await ctx.db.insert("auditLogs", {
      actorId: user._id,
      action: "REQUEST_CREATED",
      entityType: "request",
      entityId: id,
      metadata: JSON.stringify({ category: args.category, priority: args.priority, subject }),
      createdAt: now
    });
    return id;
  }
});

export const cancel = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const { user, record } = await student(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.studentId !== record._id || request.status !== "PENDING") {
      throw new Error("Request cannot be cancelled");
    }
    const now = Date.now();
    await ctx.db.patch(request._id, { status: "CANCELLED", updatedAt: now });
    await ctx.db.insert("auditLogs", {
      actorId: user._id,
      action: "REQUEST_CANCELLED",
      entityType: "request",
      entityId: request._id,
      createdAt: now
    });
    return request._id;
  }
});

export const updateStatus = mutation({
  args: {
    requestId: v.id("requests"),
    status,
    resolutionNote: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const actor = await requireAuthenticatedUser(ctx);
    if (actor.role !== "ADMIN" && actor.role !== "WARDEN") {
      throw new Error("Forbidden: Only Admins and Wardens can update request statuses");
    }
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");

    if (actor.role === "WARDEN") {
      const warden = await ctx.db.query("wardens").withIndex("by_user", (q: any) => q.eq("userId", actor._id)).unique();
      if (!warden || !warden.assignedHostelIds.some((id: any) => id === request.hostelId)) {
        throw new Error("Forbidden: Request is not within your assigned hostels");
      }
    }

    const now = Date.now();
    const isResolved = ["RESOLVED", "REJECTED"].includes(args.status);
    const resolutionNote = args.resolutionNote?.trim() || undefined;

    await ctx.db.patch(request._id, {
      status: args.status,
      resolutionNote,
      resolvedAt: isResolved ? now : undefined,
      resolvedBy: isResolved ? actor._id : undefined,
      updatedAt: now
    });

    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      action: args.status === "RESOLVED" ? "REQUEST_RESOLVED" : "REQUEST_STATUS_UPDATED",
      entityType: "request",
      entityId: request._id,
      metadata: JSON.stringify({ status: args.status, resolutionNote }),
      createdAt: now
    });
    return request._id;
  }
});

export const listForStudent = query({
  args: {},
  handler: async (ctx) => {
    const { record } = await student(ctx);
    const rows = await ctx.db.query("requests").withIndex("by_student", (q: any) => q.eq("studentId", record._id)).order("desc").collect();
    return Promise.all(rows.map((r: any) => enrichRequest(ctx, r)));
  }
});

export const listForWarden = query({
  args: {
    statusFilter: v.optional(status),
    category: v.optional(category),
    priority: v.optional(priority),
    search: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const user = await requireWarden(ctx);
    const warden = await ctx.db.query("wardens").withIndex("by_user", (q: any) => q.eq("userId", user._id)).unique();
    if (!warden) throw new Error("Warden profile not found");
    const assignedIds = new Set(warden.assignedHostelIds.map((id: any) => id.toString()));

    const rows = await ctx.db.query("requests").order("desc").collect();
    const authorizedRows = rows.filter((r: any) => assignedIds.has(r.hostelId.toString()));
    const enriched = await Promise.all(authorizedRows.map((r: any) => enrichRequest(ctx, r)));

    const search = args.search?.trim().toLowerCase();
    return enriched.filter((r: any) => {
      if (args.statusFilter && r.status !== args.statusFilter) return false;
      if (args.category && r.category !== args.category) return false;
      if (args.priority && r.priority !== args.priority) return false;
      if (search) {
        const text = [r.studentName, r.studentIdentifier, r.subject, r.description, r.roomNumber, r.resolutionNote].filter(Boolean).join(" ").toLowerCase();
        if (!text.includes(search)) return false;
      }
      return true;
    });
  }
});

export const listForAdmin = query({
  args: {
    statusFilter: v.optional(status),
    category: v.optional(category),
    priority: v.optional(priority),
    hostelId: v.optional(v.id("hostels")),
    search: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("requests").order("desc").collect();
    const enriched = await Promise.all(rows.map((r: any) => enrichRequest(ctx, r)));

    const search = args.search?.trim().toLowerCase();
    return enriched.filter((r: any) => {
      if (args.statusFilter && r.status !== args.statusFilter) return false;
      if (args.category && r.category !== args.category) return false;
      if (args.priority && r.priority !== args.priority) return false;
      if (args.hostelId && r.hostelId !== args.hostelId) return false;
      if (search) {
        const text = [r.studentName, r.studentIdentifier, r.hostelName, r.subject, r.description, r.roomNumber, r.resolutionNote].filter(Boolean).join(" ").toLowerCase();
        if (!text.includes(search)) return false;
      }
      return true;
    });
  }
});

