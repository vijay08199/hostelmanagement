import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireStudent, requireWarden } from "./authorization";

const state = v.union(v.literal("PRESENT"), v.literal("ABSENT"), v.literal("LATE"), v.literal("LEAVE"));

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

async function wardenStudent(ctx: any, user: any, studentId: any) {
  const row = await ctx.db.query("wardens").withIndex("by_user", (q: any) => q.eq("userId", user._id)).unique();
  const active = await ctx.db.query("allocations").withIndex("by_student_status", (q: any) => q.eq("studentId", studentId).eq("status", "ACTIVE")).unique();
  if (!row || !active) throw new Error("Student is not assigned to an accessible hostel");
  const bed = await ctx.db.get(active.bedId);
  const room = bed ? await ctx.db.get(bed.roomId) : null;
  const floor = room ? await ctx.db.get(room.floorId) : null;
  const block = floor ? await ctx.db.get(floor.blockId) : null;
  if (!block || !row.assignedHostelIds.some((id: any) => id === block.hostelId)) throw new Error("Forbidden");
  return active;
}

async function enrichAttendance(ctx: any, row: any) {
  const student = await ctx.db.get(row.studentId);
  const active = await ctx.db.query("allocations").withIndex("by_student_status", (q: any) => q.eq("studentId", row.studentId).eq("status", "ACTIVE")).unique();
  const bed = active ? await ctx.db.get(active.bedId) : null;
  const room = bed ? await ctx.db.get(bed.roomId) : null;
  const floor = room ? await ctx.db.get(room.floorId) : null;
  const block = floor ? await ctx.db.get(floor.blockId) : null;
  const hostel = block ? await ctx.db.get(block.hostelId) : null;
  const marker = await ctx.db.get(row.markedBy);
  return {
    ...row,
    studentName: student ? `${student.firstName} ${student.lastName}`.trim() : "Unknown Student",
    studentIdentifier: student?.studentId ?? "—",
    hostelId: hostel?._id,
    hostelName: hostel?.name ?? "—",
    roomNumber: room?.roomNumber ?? "—",
    bedLabel: bed?.label ?? "—",
    markedByName: marker?.name ?? "Staff",
  };
}

async function queryAttendanceRows(ctx: any, args: { date?: number; studentId?: any }) {
  if (args.studentId && args.date !== undefined) {
    const targetDate = startOfDay(args.date);
    return ctx.db.query("attendance").withIndex("by_student_date", (q: any) => q.eq("studentId", args.studentId).eq("date", targetDate)).collect();
  }
  if (args.studentId) {
    return ctx.db.query("attendance").withIndex("by_student_date", (q: any) => q.eq("studentId", args.studentId)).collect();
  }
  if (args.date !== undefined) {
    const targetDate = startOfDay(args.date);
    return ctx.db.query("attendance").withIndex("by_date", (q: any) => q.eq("date", targetDate)).collect();
  }
  return ctx.db.query("attendance").order("desc").collect();
}

export const listForWarden = query({
  args: {
    date: v.optional(v.number()),
    studentId: v.optional(v.id("students")),
    status: v.optional(state),
    hostelId: v.optional(v.id("hostels")),
    search: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const actor = await requireWarden(ctx);
    const warden = await ctx.db.query("wardens").withIndex("by_user", (q: any) => q.eq("userId", actor._id)).unique();
    if (!warden) throw new Error("Warden profile not found");
    const assignedSet = new Set(warden.assignedHostelIds.map((id: any) => id.toString()));

    const rows = await queryAttendanceRows(ctx, args);
    const enriched = await Promise.all(rows.map((row: any) => enrichAttendance(ctx, row)));
    const search = args.search?.trim().toLowerCase();

    return enriched.filter((item: any) => {
      if (!item.hostelId || !assignedSet.has(item.hostelId.toString())) return false;
      if (args.hostelId && item.hostelId !== args.hostelId) return false;
      if (args.status && item.status !== args.status) return false;
      if (search) {
        const text = [item.studentName, item.studentIdentifier, item.roomNumber, item.bedLabel, item.remarks].filter(Boolean).join(" ").toLowerCase();
        if (!text.includes(search)) return false;
      }
      return true;
    });
  }
});

export const listForAdmin = query({
  args: {
    date: v.optional(v.number()),
    studentId: v.optional(v.id("students")),
    status: v.optional(state),
    hostelId: v.optional(v.id("hostels")),
    search: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await queryAttendanceRows(ctx, args);
    const enriched = await Promise.all(rows.map((row: any) => enrichAttendance(ctx, row)));
    const search = args.search?.trim().toLowerCase();

    return enriched.filter((item: any) => {
      if (args.hostelId && item.hostelId !== args.hostelId) return false;
      if (args.status && item.status !== args.status) return false;
      if (search) {
        const text = [item.studentName, item.studentIdentifier, item.hostelName, item.roomNumber, item.bedLabel, item.markedByName, item.remarks].filter(Boolean).join(" ").toLowerCase();
        if (!text.includes(search)) return false;
      }
      return true;
    });
  }
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireStudent(ctx);
    const student = await ctx.db.query("students").withIndex("by_user", (q: any) => q.eq("userId", user._id)).unique();
    if (!student) throw new Error("Student profile not found");
    return ctx.db.query("attendance").withIndex("by_student_date", (q: any) => q.eq("studentId", student._id)).order("desc").collect();
  }
});

export const mark = mutation({
  args: {
    studentId: v.id("students"),
    date: v.number(),
    status: state,
    remarks: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const actor = await requireWarden(ctx);
    const student = await ctx.db.get(args.studentId);
    if (!student || student.status !== "ACTIVE") throw new Error("Student is inactive or missing");
    await wardenStudent(ctx, actor, args.studentId);
    const normalizedDate = startOfDay(args.date);
    const existing = await ctx.db.query("attendance").withIndex("by_student_date", (q: any) => q.eq("studentId", args.studentId).eq("date", normalizedDate)).unique();
    const now = Date.now();
    const remarks = args.remarks?.trim() || undefined;

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        remarks,
        markedBy: actor._id,
        updatedAt: now
      });
      await ctx.db.insert("auditLogs", {
        actorId: actor._id,
        action: "ATTENDANCE_UPDATED",
        entityType: "attendance",
        entityId: existing._id,
        metadata: JSON.stringify({ studentId: args.studentId, date: normalizedDate, status: args.status, remarks }),
        createdAt: now
      });
      return existing._id;
    }

    const id = await ctx.db.insert("attendance", {
      studentId: args.studentId,
      date: normalizedDate,
      status: args.status,
      remarks,
      markedBy: actor._id,
      createdAt: now,
      updatedAt: now
    });
    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      action: "ATTENDANCE_MARKED",
      entityType: "attendance",
      entityId: id,
      metadata: JSON.stringify({ studentId: args.studentId, date: normalizedDate, status: args.status, remarks }),
      createdAt: now
    });
    return id;
  }
});

