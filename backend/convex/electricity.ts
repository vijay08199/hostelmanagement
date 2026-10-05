import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  requireAdmin,
  requireWarden,
  requireStudent,
  requireAuthenticatedUser,
  getStudentForUser,
  getWardenHostels,
  requireHostelAccess,
} from "./authorization";

const electricityStatusUnion = v.union(
  v.literal("PENDING"),
  v.literal("PAID"),
  v.literal("OVERDUE"),
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

// ==========================================
// ELECTRICITY BILLS (ADMIN & WARDEN)
// ==========================================

export const listBills = query({
  args: {
    hostelId: v.optional(v.id("hostels")),
    roomId: v.optional(v.id("rooms")),
    billingMonth: v.optional(v.string()),
    status: v.optional(electricityStatusUnion),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    let allowedHostelIds: string[] | null = null;

    if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      allowedHostelIds = wardenHostels.map((id) => id.toString());
      if (args.hostelId && !allowedHostelIds.includes(args.hostelId.toString())) {
        throw new Error("Forbidden: You do not have access to this hostel");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    let bills = await ctx.db.query("electricityBills").collect();

    if (allowedHostelIds !== null) {
      bills = bills.filter((b) => allowedHostelIds!.includes(b.hostelId.toString()));
    }
    if (args.hostelId) {
      bills = bills.filter((b) => b.hostelId === args.hostelId);
    }
    if (args.roomId) {
      bills = bills.filter((b) => b.roomId === args.roomId);
    }
    if (args.billingMonth) {
      bills = bills.filter((b) => b.billingMonth === args.billingMonth);
    }
    if (args.status) {
      bills = bills.filter((b) => b.status === args.status);
    }

    const now = Date.now();

    const enriched = await Promise.all(
      bills.map(async (b) => {
        const hostel = await ctx.db.get(b.hostelId);
        const room = await ctx.db.get(b.roomId);
        const floor = room ? await ctx.db.get(room.floorId) : null;
        const block = floor ? await ctx.db.get(floor.blockId) : null;

        let computedStatus = b.status;
        if (b.status !== "PAID" && b.status !== "CANCELLED" && b.dueDate < now) {
          computedStatus = "OVERDUE";
        }

        return {
          ...b,
          status: computedStatus,
          hostelName: hostel?.name || "Unknown",
          hostelCode: hostel?.code || "",
          roomNumber: room?.roomNumber || "Unknown",
          blockCode: block?.code || "",
          floorNumber: floor?.floorNumber,
        };
      })
    );

    return enriched.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getBill = query({
  args: { billId: v.id("electricityBills") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const bill = await ctx.db.get(args.billId);
    if (!bill) return null;

    if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      if (!wardenHostels.some((id) => id === bill.hostelId)) {
        throw new Error("Forbidden: This bill belongs to an unassigned hostel");
      }
    } else if (user.role === "STUDENT") {
      const student = await getStudentForUser(ctx, user._id);
      const activeAlloc = await ctx.db
        .query("allocations")
        .withIndex("by_student_status", (q) => q.eq("studentId", student._id).eq("status", "ACTIVE"))
        .first();
      if (!activeAlloc || activeAlloc.roomId !== bill.roomId) {
        throw new Error("Forbidden: You cannot access electricity records for this room");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    const hostel = await ctx.db.get(bill.hostelId);
    const room = await ctx.db.get(bill.roomId);
    const floor = room ? await ctx.db.get(room.floorId) : null;
    const block = floor ? await ctx.db.get(floor.blockId) : null;

    return {
      ...bill,
      hostel,
      room,
      floor,
      block,
    };
  },
});

export const getStats = query({
  args: { hostelId: v.optional(v.id("hostels")) },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    let allowedHostelIds: string[] | null = null;

    if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      allowedHostelIds = wardenHostels.map((id) => id.toString());
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    let bills = await ctx.db.query("electricityBills").collect();
    if (allowedHostelIds !== null) {
      bills = bills.filter((b) => allowedHostelIds!.includes(b.hostelId.toString()));
    }
    if (args.hostelId) {
      bills = bills.filter((b) => b.hostelId === args.hostelId);
    }

    const now = Date.now();
    let totalBills = 0;
    let totalAmount = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    let totalUnits = 0;

    for (const b of bills) {
      if (b.status !== "CANCELLED") {
        totalBills++;
        totalAmount += b.totalAmount;
        totalUnits += b.unitsConsumed;

        if (b.status === "PAID") {
          totalPaid += b.totalAmount;
        } else {
          totalPending += b.totalAmount;
          if (b.dueDate < now) {
            totalOverdue += b.totalAmount;
          }
        }
      }
    }

    return {
      totalBills,
      totalAmount,
      totalPaid,
      totalPending,
      totalOverdue,
      totalUnits,
    };
  },
});

export const createBill = mutation({
  args: {
    hostelId: v.id("hostels"),
    roomId: v.id("rooms"),
    meterNumber: v.optional(v.string()),
    billingMonth: v.string(), // "YYYY-MM"
    previousReading: v.number(),
    currentReading: v.number(),
    ratePerUnit: v.number(),
    dueDate: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    if (user.role === "WARDEN") {
      await requireHostelAccess(ctx, user._id, args.hostelId);
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    if (args.currentReading < args.previousReading) {
      throw new Error("Current meter reading cannot be less than previous meter reading");
    }
    if (args.ratePerUnit < 0) {
      throw new Error("Rate per unit cannot be negative");
    }
    if (args.previousReading < 0) {
      throw new Error("Previous reading cannot be negative");
    }

    const hostel = await ctx.db.get(args.hostelId);
    if (!hostel) throw new Error("Hostel not found");
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    const unitsConsumed = args.currentReading - args.previousReading;
    const totalAmount = Math.round(unitsConsumed * args.ratePerUnit * 100) / 100;

    const now = Date.now();
    const status = args.dueDate < now ? "OVERDUE" : "PENDING";

    const billId = await ctx.db.insert("electricityBills", {
      hostelId: args.hostelId,
      roomId: args.roomId,
      meterNumber: args.meterNumber?.trim(),
      billingMonth: args.billingMonth.trim(),
      previousReading: args.previousReading,
      currentReading: args.currentReading,
      unitsConsumed,
      ratePerUnit: args.ratePerUnit,
      totalAmount,
      dueDate: args.dueDate,
      status,
      notes: args.notes?.trim(),
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await audit(ctx, user._id, "ELECTRICITY_BILL_CREATED", "electricityBill", billId, {
      hostelId: args.hostelId,
      roomId: args.roomId,
      billingMonth: args.billingMonth,
      unitsConsumed,
      totalAmount,
    });

    return billId;
  },
});

export const recordPayment = mutation({
  args: {
    billId: v.id("electricityBills"),
    paymentReference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const bill = await ctx.db.get(args.billId);
    if (!bill) throw new Error("Electricity bill not found");

    if (user.role === "WARDEN") {
      await requireHostelAccess(ctx, user._id, bill.hostelId);
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    if (bill.status === "PAID") throw new Error("This bill is already marked as paid");

    const now = Date.now();
    await ctx.db.patch(args.billId, {
      status: "PAID",
      paidAt: now,
      paidBy: user._id,
      paymentReference: args.paymentReference?.trim(),
      notes: args.notes?.trim() || bill.notes,
      updatedAt: now,
    });

    await audit(ctx, user._id, "ELECTRICITY_STATUS_UPDATED", "electricityBill", args.billId, {
      status: "PAID",
      amount: bill.totalAmount,
      paymentReference: args.paymentReference,
    });

    return args.billId;
  },
});

// ==========================================
// STUDENT ELECTRICITY VIEW
// ==========================================

export const myBills = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireStudent(ctx);
    const student = await getStudentForUser(ctx, user._id);

    // Find student's active allocation to know their room
    const activeAlloc = await ctx.db
      .query("allocations")
      .withIndex("by_student_status", (q) => q.eq("studentId", student._id).eq("status", "ACTIVE"))
      .first();

    if (!activeAlloc) {
      return {
        hasAllocation: false,
        roomNumber: null,
        hostelName: null,
        bills: [],
        currentBill: null,
      };
    }

    const room = await ctx.db.get(activeAlloc.roomId);
    const hostel = await ctx.db.get(room ? (await ctx.db.get((await ctx.db.get(room.floorId))?.blockId!))?.hostelId! : activeAlloc.roomId as never);

    const bills = await ctx.db
      .query("electricityBills")
      .withIndex("by_room", (q) => q.eq("roomId", activeAlloc.roomId))
      .collect();

    const now = Date.now();

    const enriched = bills.map((b) => {
      let computedStatus = b.status;
      if (b.status !== "PAID" && b.status !== "CANCELLED" && b.dueDate < now) {
        computedStatus = "OVERDUE";
      }
      return {
        ...b,
        status: computedStatus,
        roomNumber: room?.roomNumber,
        hostelName: hostel?.name,
      };
    });

    const sorted = enriched.sort((a, b) => b.createdAt - a.createdAt);

    return {
      hasAllocation: true,
      roomNumber: room?.roomNumber || "Unknown",
      hostelName: hostel?.name || "Campus Hostel",
      bills: sorted,
      currentBill: sorted[0] || null,
    };
  },
});

