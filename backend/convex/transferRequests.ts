import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireAuthenticatedUser, requireHostelAccess, requireStudent, requireWarden } from "./authorization";

const transferStatus = v.union(v.literal("PENDING"), v.literal("APPROVED"), v.literal("REJECTED"), v.literal("CANCELLED"));

async function getStudentActiveAllocation(ctx: any, studentId: any) {
  const allocation = await ctx.db.query("allocations").withIndex("by_student_status", (q: any) => q.eq("studentId", studentId).eq("status", "ACTIVE")).unique();
  if (!allocation) return null;
  const bed = await ctx.db.get(allocation.bedId);
  const room = bed ? await ctx.db.get(bed.roomId) : null;
  const floor = room ? await ctx.db.get(room.floorId) : null;
  const block = floor ? await ctx.db.get(floor.blockId) : null;
  const hostel = block ? await ctx.db.get(block.hostelId) : null;
  return { allocation, bed, room, floor, block, hostel };
}

async function enrichTransferRequest(ctx: any, req: any) {
  const student = await ctx.db.get(req.studentId);
  const currentAlloc = await ctx.db.get(req.currentAllocationId);
  const currentBed = currentAlloc ? await ctx.db.get(currentAlloc.bedId) : null;
  const currentRoom = currentBed ? await ctx.db.get(currentBed.roomId) : null;
  const currentFloor = currentRoom ? await ctx.db.get(currentRoom.floorId) : null;
  const currentBlock = currentFloor ? await ctx.db.get(currentFloor.blockId) : null;
  const currentHostel = currentBlock ? await ctx.db.get(currentBlock.hostelId) : null;

  const targetHostel = req.targetHostelId ? await ctx.db.get(req.targetHostelId) : null;
  const targetRoom = req.targetRoomId ? await ctx.db.get(req.targetRoomId) : null;
  const targetBed = req.targetBedId ? await ctx.db.get(req.targetBedId) : null;
  const reviewer = req.reviewedBy ? await ctx.db.get(req.reviewedBy) : null;

  return {
    ...req,
    studentName: student ? `${student.firstName} ${student.lastName}`.trim() : "Unknown Student",
    studentIdentifier: student?.studentId ?? "—",
    currentHostelId: currentHostel?._id,
    currentHostelName: currentHostel?.name ?? "—",
    currentRoomNumber: currentRoom?.roomNumber ?? "—",
    currentBedLabel: currentBed?.label ?? "—",
    targetHostelName: targetHostel?.name ?? "Any Available",
    targetRoomNumber: targetRoom?.roomNumber ?? "Any Room",
    targetBedLabel: targetBed?.label ?? "Any Bed",
    reviewerName: reviewer?.name ?? undefined,
  };
}

export const create = mutation({
  args: {
    reason: v.string(),
    description: v.string(),
    targetHostelId: v.optional(v.id("hostels")),
    targetRoomId: v.optional(v.id("rooms")),
    targetBedId: v.optional(v.id("beds")),
  },
  handler: async (ctx, args) => {
    const user = await requireStudent(ctx);
    const student = await ctx.db.query("students").withIndex("by_user", (q: any) => q.eq("userId", user._id)).unique();
    if (!student) throw new Error("Student profile not found");

    const activeInfo = await getStudentActiveAllocation(ctx, student._id);
    if (!activeInfo || !activeInfo.hostel) {
      throw new Error("You must have an active room allocation to request a transfer.");
    }

    const pending = await ctx.db.query("transferRequests").withIndex("by_student", (q: any) => q.eq("studentId", student._id)).collect();
    if (pending.some((p: any) => p.status === "PENDING")) {
      throw new Error("You already have a pending transfer request. Please wait for warden review or cancel it.");
    }

    const reason = args.reason.trim();
    const description = args.description.trim();
    if (!reason || !description) throw new Error("Reason and description are required.");

    const now = Date.now();
    const id = await ctx.db.insert("transferRequests", {
      studentId: student._id,
      currentAllocationId: activeInfo.allocation._id,
      targetHostelId: args.targetHostelId,
      targetRoomId: args.targetRoomId,
      targetBedId: args.targetBedId,
      reason,
      description,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      actorId: user._id,
      action: "TRANSFER_REQUEST_CREATED",
      entityType: "transferRequest",
      entityId: id,
      metadata: JSON.stringify({ reason, targetHostelId: args.targetHostelId }),
      createdAt: now,
    });

    return id;
  },
});

export const cancel = mutation({
  args: { requestId: v.id("transferRequests") },
  handler: async (ctx, args) => {
    const user = await requireStudent(ctx);
    const student = await ctx.db.query("students").withIndex("by_user", (q: any) => q.eq("userId", user._id)).unique();
    if (!student) throw new Error("Student profile not found");

    const request = await ctx.db.get(args.requestId);
    if (!request || request.studentId !== student._id || request.status !== "PENDING") {
      throw new Error("Transfer request cannot be cancelled.");
    }

    const now = Date.now();
    await ctx.db.patch(request._id, { status: "CANCELLED", updatedAt: now });

    await ctx.db.insert("auditLogs", {
      actorId: user._id,
      action: "TRANSFER_REQUEST_CANCELLED",
      entityType: "transferRequest",
      entityId: request._id,
      createdAt: now,
    });

    return request._id;
  },
});

export const listForStudent = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireStudent(ctx);
    const student = await ctx.db.query("students").withIndex("by_user", (q: any) => q.eq("userId", user._id)).unique();
    if (!student) throw new Error("Student profile not found");

    const rows = await ctx.db.query("transferRequests").withIndex("by_student", (q: any) => q.eq("studentId", student._id)).order("desc").collect();
    return Promise.all(rows.map((r: any) => enrichTransferRequest(ctx, r)));
  },
});

export const listForWarden = query({
  args: {
    statusFilter: v.optional(transferStatus),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireWarden(ctx);
    const warden = await ctx.db.query("wardens").withIndex("by_user", (q: any) => q.eq("userId", user._id)).unique();
    if (!warden) throw new Error("Warden profile not found");
    const assignedIds = new Set(warden.assignedHostelIds.map((id: any) => id.toString()));

    const rows = await ctx.db.query("transferRequests").order("desc").collect();
    const enriched = await Promise.all(rows.map((r: any) => enrichTransferRequest(ctx, r)));

    const search = args.search?.trim().toLowerCase();
    return enriched.filter((r: any) => {
      // Must be a student currently allocated in or targeted to warden's assigned hostel
      const isInCurrent = r.currentHostelId && assignedIds.has(r.currentHostelId.toString());
      const isInTarget = r.targetHostelId && assignedIds.has(r.targetHostelId.toString());
      if (!isInCurrent && !isInTarget) return false;

      if (args.statusFilter && r.status !== args.statusFilter) return false;
      if (search) {
        const text = [r.studentName, r.studentIdentifier, r.reason, r.description, r.currentRoomNumber, r.targetRoomNumber].filter(Boolean).join(" ").toLowerCase();
        if (!text.includes(search)) return false;
      }
      return true;
    });
  },
});

export const listForAdmin = query({
  args: {
    statusFilter: v.optional(transferStatus),
    hostelId: v.optional(v.id("hostels")),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("transferRequests").order("desc").collect();
    const enriched = await Promise.all(rows.map((r: any) => enrichTransferRequest(ctx, r)));

    const search = args.search?.trim().toLowerCase();
    return enriched.filter((r: any) => {
      if (args.statusFilter && r.status !== args.statusFilter) return false;
      if (args.hostelId && r.currentHostelId !== args.hostelId && r.targetHostelId !== args.hostelId) return false;
      if (search) {
        const text = [r.studentName, r.studentIdentifier, r.currentHostelName, r.targetHostelName, r.reason, r.description].filter(Boolean).join(" ").toLowerCase();
        if (!text.includes(search)) return false;
      }
      return true;
    });
  },
});

export const approve = mutation({
  args: {
    requestId: v.id("transferRequests"),
    targetBedId: v.id("beds"),
    targetRoomId: v.id("rooms"),
    reviewNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireWarden(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.status !== "PENDING") {
      throw new Error("Transfer request is not pending or does not exist.");
    }

    const currentAlloc = await ctx.db.get(request.currentAllocationId);
    if (!currentAlloc || currentAlloc.status !== "ACTIVE") {
      throw new Error("The student no longer has an active allocation to transfer from.");
    }

    // Verify current allocation hostel access
    const oldBed = await ctx.db.get(currentAlloc.bedId);
    const oldRoom = oldBed ? await ctx.db.get(oldBed.roomId) : null;
    const oldFloor = oldRoom ? await ctx.db.get(oldRoom.floorId) : null;
    const oldBlock = oldFloor ? await ctx.db.get(oldFloor.blockId) : null;
    const oldHostel = oldBlock ? await ctx.db.get(oldBlock.hostelId) : null;
    if (!oldHostel) throw new Error("Current allocation hierarchy is invalid.");
    await requireHostelAccess(ctx, actor._id, oldHostel._id);

    // Verify target bed, room, hierarchy and destination hostel access
    const bed = await ctx.db.get(args.targetBedId);
    const room = await ctx.db.get(args.targetRoomId);
    const floor = room ? await ctx.db.get(room.floorId) : null;
    const block = floor ? await ctx.db.get(floor.blockId) : null;
    const hostel = block ? await ctx.db.get(block.hostelId) : null;

    if (!bed || bed.status !== "AVAILABLE" || bed.roomId !== args.targetRoomId) {
      throw new Error("Target bed is unavailable or not in the specified room.");
    }
    if (!room || room.status === "MAINTENANCE" || room.status === "INACTIVE" || !floor || floor.status !== "ACTIVE" || !block || block.status !== "ACTIVE" || !hostel || hostel.status !== "ACTIVE") {
      throw new Error("Target hostel, block, floor, or room is inactive or unavailable.");
    }

    await requireHostelAccess(ctx, actor._id, hostel._id);

    // Prevent duplicate active allocations on the target bed
    const existingAllocation = await ctx.db.query("allocations").withIndex("by_bed_status", (q: any) => q.eq("bedId", args.targetBedId).eq("status", "ACTIVE")).unique();
    if (existingAllocation) {
      throw new Error("Target bed is already allocated to another student.");
    }

    const now = Date.now();

    // End previous allocation safely
    await ctx.db.patch(currentAlloc._id, {
      status: "ENDED",
      endDate: now,
      updatedAt: now,
    });
    await ctx.db.patch(currentAlloc.bedId, {
      status: "AVAILABLE",
      updatedAt: now,
    });

    // Create new allocation safely
    const newAllocationId = await ctx.db.insert("allocations", {
      studentId: request.studentId,
      bedId: args.targetBedId,
      roomId: args.targetRoomId,
      allocatedBy: actor._id,
      status: "ACTIVE",
      startDate: now,
      createdAt: now,
      updatedAt: now,
    });

    // Update target bed state to OCCUPIED
    await ctx.db.patch(args.targetBedId, {
      status: "OCCUPIED",
      updatedAt: now,
    });

    // Mark transfer request as APPROVED
    await ctx.db.patch(request._id, {
      status: "APPROVED",
      targetBedId: args.targetBedId,
      targetRoomId: args.targetRoomId,
      targetHostelId: hostel._id,
      reviewedBy: actor._id,
      reviewedAt: now,
      reviewNote: args.reviewNote?.trim() || undefined,
      updatedAt: now,
    });

    // Audit logs
    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      action: "ALLOCATION_TRANSFERRED",
      entityType: "allocation",
      entityId: newAllocationId,
      metadata: JSON.stringify({ previousAllocationId: currentAlloc._id, transferRequestId: request._id }),
      createdAt: now,
    });

    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      action: "TRANSFER_REQUEST_APPROVED",
      entityType: "transferRequest",
      entityId: request._id,
      metadata: JSON.stringify({ newAllocationId, targetBedId: args.targetBedId, reviewNote: args.reviewNote }),
      createdAt: now,
    });

    return newAllocationId;
  },
});

export const reject = mutation({
  args: {
    requestId: v.id("transferRequests"),
    reviewNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireWarden(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.status !== "PENDING") {
      throw new Error("Transfer request is not pending or does not exist.");
    }

    const currentAlloc = await ctx.db.get(request.currentAllocationId);
    if (currentAlloc) {
      const oldBed = await ctx.db.get(currentAlloc.bedId);
      const oldRoom = oldBed ? await ctx.db.get(oldBed.roomId) : null;
      const oldFloor = oldRoom ? await ctx.db.get(oldRoom.floorId) : null;
      const oldBlock = oldFloor ? await ctx.db.get(oldFloor.blockId) : null;
      const oldHostel = oldBlock ? await ctx.db.get(oldBlock.hostelId) : null;
      if (oldHostel) {
        await requireHostelAccess(ctx, actor._id, oldHostel._id);
      }
    }

    const now = Date.now();
    const reviewNote = args.reviewNote?.trim() || undefined;

    await ctx.db.patch(request._id, {
      status: "REJECTED",
      reviewedBy: actor._id,
      reviewedAt: now,
      reviewNote,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      action: "TRANSFER_REQUEST_REJECTED",
      entityType: "transferRequest",
      entityId: request._id,
      metadata: JSON.stringify({ reviewNote }),
      createdAt: now,
    });

    return request._id;
  },
});
