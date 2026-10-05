import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  requireStudent,
  requireAuthenticatedUser,
  getStudentForUser,
  getWardenHostels,
} from "./authorization";

const mealTypeUnion = v.union(
  v.literal("BREAKFAST"),
  v.literal("LUNCH"),
  v.literal("SNACKS"),
  v.literal("DINNER")
);

const messMenuStatusUnion = v.union(
  v.literal("DRAFT"),
  v.literal("PUBLISHED"),
  v.literal("ARCHIVED")
);

const mealAttendanceStatusUnion = v.union(
  v.literal("TAKEN"),
  v.literal("SKIPPED"),
  v.literal("LEAVE")
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

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function getHostelIdForRoom(ctx: any, roomId: any) {
  const room = await ctx.db.get(roomId);
  if (!room) return null;
  const floor = await ctx.db.get(room.floorId);
  if (!floor) return null;
  const block = await ctx.db.get(floor.blockId);
  return block ? block.hostelId : null;
}

// ==========================================
// MESS MENUS
// ==========================================

export const listMenus = query({
  args: {
    hostelId: v.optional(v.id("hostels")),
    date: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    mealType: v.optional(mealTypeUnion),
    status: v.optional(messMenuStatusUnion),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);

    let allowedHostelIds: string[] | null = null;
    let studentHostelId: string | null = null;

    if (user.role === "STUDENT") {
      const student = await getStudentForUser(ctx, user._id);
      if (student) {
        const allocation = await ctx.db
          .query("allocations")
          .withIndex("by_student_status", (q) =>
            q.eq("studentId", student._id).eq("status", "ACTIVE")
          )
          .first();
        if (allocation) {
          const hostelId = await getHostelIdForRoom(ctx, allocation.roomId);
          if (hostelId) {
            studentHostelId = hostelId.toString();
          }
        }
      }
    } else if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      allowedHostelIds = wardenHostels.map((id) => id.toString());
      if (args.hostelId && !allowedHostelIds.includes(args.hostelId.toString())) {
        throw new Error("Forbidden: You do not have access to this hostel");
      }
    }

    let menus = await ctx.db.query("messMenus").collect();

    // Role-based visibility
    if (user.role === "STUDENT") {
      // Students only see PUBLISHED menus, matching either their hostel or global (hostelId = undefined)
      menus = menus.filter((m) => m.status === "PUBLISHED");
      if (studentHostelId) {
        menus = menus.filter((m) => !m.hostelId || m.hostelId.toString() === studentHostelId);
      } else {
        menus = menus.filter((m) => !m.hostelId);
      }
    } else if (user.role === "WARDEN" && allowedHostelIds !== null) {
      menus = menus.filter((m) => !m.hostelId || allowedHostelIds!.includes(m.hostelId.toString()));
    }

    // Filter args
    if (args.hostelId) {
      menus = menus.filter((m) => m.hostelId === args.hostelId);
    }
    if (args.date) {
      menus = menus.filter((m) => m.date === args.date);
    }
    if (args.startDate) {
      menus = menus.filter((m) => m.date >= args.startDate!);
    }
    if (args.endDate) {
      menus = menus.filter((m) => m.date <= args.endDate!);
    }
    if (args.mealType) {
      menus = menus.filter((m) => m.mealType === args.mealType);
    }
    if (args.status && user.role !== "STUDENT") {
      menus = menus.filter((m) => m.status === args.status);
    }

    menus.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      const order = { BREAKFAST: 1, LUNCH: 2, SNACKS: 3, DINNER: 4 };
      return (order[a.mealType] || 0) - (order[b.mealType] || 0);
    });

    return await Promise.all(
      menus.map(async (m) => {
        const hostel = m.hostelId ? await ctx.db.get(m.hostelId) : null;
        return {
          ...m,
          hostelName: hostel ? hostel.name : "All Hostels (Global)",
        };
      })
    );
  },
});

export const getTodayMenu = query({
  args: {
    hostelId: v.optional(v.id("hostels")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const today = getTodayString();

    let targetHostelId = args.hostelId ? args.hostelId.toString() : null;

    if (user.role === "STUDENT" && !targetHostelId) {
      const student = await getStudentForUser(ctx, user._id);
      if (student) {
        const allocation = await ctx.db
          .query("allocations")
          .withIndex("by_student_status", (q) =>
            q.eq("studentId", student._id).eq("status", "ACTIVE")
          )
          .first();
        if (allocation) {
          const hostelId = await getHostelIdForRoom(ctx, allocation.roomId);
          if (hostelId) {
            targetHostelId = hostelId.toString();
          }
        }
      }
    }

    let menus = await ctx.db
      .query("messMenus")
      .withIndex("by_date", (q) => q.eq("date", today))
      .collect();

    if (user.role === "STUDENT") {
      menus = menus.filter((m) => m.status === "PUBLISHED");
    }

    if (targetHostelId) {
      menus = menus.filter((m) => !m.hostelId || m.hostelId.toString() === targetHostelId);
    }

    const mealOrder: Record<string, number> = { BREAKFAST: 1, LUNCH: 2, SNACKS: 3, DINNER: 4 };
    menus.sort((a, b) => (mealOrder[a.mealType] || 0) - (mealOrder[b.mealType] || 0));

    return await Promise.all(
      menus.map(async (m) => {
        const hostel = m.hostelId ? await ctx.db.get(m.hostelId) : null;
        return {
          ...m,
          hostelName: hostel ? hostel.name : "All Hostels (Global)",
        };
      })
    );
  },
});

export const createMenu = mutation({
  args: {
    hostelId: v.optional(v.id("hostels")),
    date: v.string(), // YYYY-MM-DD
    mealType: mealTypeUnion,
    items: v.string(),
    specialDietNote: v.optional(v.string()),
    status: messMenuStatusUnion,
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      if (!args.hostelId || !wardenHostels.some((id) => id.toString() === args.hostelId!.toString())) {
        throw new Error("Forbidden: Wardens can only create menus for assigned hostels");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    if (!args.items || args.items.trim().length === 0) {
      throw new Error("Menu items cannot be empty");
    }

    const now = Date.now();
    const menuId = await ctx.db.insert("messMenus", {
      hostelId: args.hostelId,
      date: args.date,
      mealType: args.mealType,
      items: args.items.trim(),
      specialDietNote: args.specialDietNote?.trim() || undefined,
      status: args.status,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await audit(ctx, user._id, "MESS_MENU_CREATED", "messMenus", menuId, {
      date: args.date,
      mealType: args.mealType,
      hostelId: args.hostelId,
    });

    return menuId;
  },
});

export const updateMenu = mutation({
  args: {
    id: v.id("messMenus"),
    items: v.optional(v.string()),
    specialDietNote: v.optional(v.string()),
    status: v.optional(messMenuStatusUnion),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const menu = await ctx.db.get(args.id);
    if (!menu) throw new Error("Menu not found");

    if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      if (!menu.hostelId || !wardenHostels.some((id) => id.toString() === menu.hostelId!.toString())) {
        throw new Error("Forbidden: You do not have permission to edit this menu");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    const patch: any = { updatedAt: Date.now() };
    if (args.items !== undefined) {
      if (!args.items.trim()) throw new Error("Items cannot be empty");
      patch.items = args.items.trim();
    }
    if (args.specialDietNote !== undefined) {
      patch.specialDietNote = args.specialDietNote.trim() || undefined;
    }
    if (args.status !== undefined) {
      patch.status = args.status;
    }

    await ctx.db.patch(args.id, patch);
    await audit(ctx, user._id, "MESS_MENU_UPDATED", "messMenus", args.id, patch);
    return args.id;
  },
});

export const deleteMenu = mutation({
  args: {
    id: v.id("messMenus"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const menu = await ctx.db.get(args.id);
    if (!menu) throw new Error("Menu not found");

    if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      if (!menu.hostelId || !wardenHostels.some((id) => id.toString() === menu.hostelId!.toString())) {
        throw new Error("Forbidden: You do not have permission to delete this menu");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    await ctx.db.delete(args.id);
    await audit(ctx, user._id, "MESS_MENU_DELETED", "messMenus", args.id, {
      date: menu.date,
      mealType: menu.mealType,
    });
    return true;
  },
});

// ==========================================
// MEAL ATTENDANCE
// ==========================================

export const listMealAttendance = query({
  args: {
    hostelId: v.optional(v.id("hostels")),
    date: v.optional(v.string()),
    mealType: v.optional(mealTypeUnion),
    studentId: v.optional(v.id("students")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    let allowedHostelIds: string[] | null = null;

    if (user.role === "STUDENT") {
      const student = await getStudentForUser(ctx, user._id);
      if (!student) return [];
      const records = await ctx.db
        .query("mealAttendance")
        .withIndex("by_student_date_meal", (q) =>
          args.date && args.mealType
            ? q.eq("studentId", student._id).eq("date", args.date).eq("mealType", args.mealType)
            : q.eq("studentId", student._id)
        )
        .collect();

      return await Promise.all(
        records.map(async (r) => {
          const hostel = await ctx.db.get(r.hostelId);
          return {
            ...r,
            hostelName: hostel ? hostel.name : "Unknown Hostel",
            studentName: `${student.firstName} ${student.lastName}`.trim(),
          };
        })
      );
    } else if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      allowedHostelIds = wardenHostels.map((id) => id.toString());
      if (args.hostelId && !allowedHostelIds.includes(args.hostelId.toString())) {
        throw new Error("Forbidden: You do not have access to this hostel");
      }
    }

    let records = await ctx.db.query("mealAttendance").collect();

    if (allowedHostelIds !== null) {
      records = records.filter((r) => allowedHostelIds!.includes(r.hostelId.toString()));
    }
    if (args.hostelId) {
      records = records.filter((r) => r.hostelId === args.hostelId);
    }
    if (args.date) {
      records = records.filter((r) => r.date === args.date);
    }
    if (args.mealType) {
      records = records.filter((r) => r.mealType === args.mealType);
    }
    if (args.studentId) {
      records = records.filter((r) => r.studentId === args.studentId);
    }

    records.sort((a, b) => b.createdAt - a.createdAt);

    return await Promise.all(
      records.map(async (r) => {
        const student = await ctx.db.get(r.studentId);
        const hostel = await ctx.db.get(r.hostelId);

        return {
          ...r,
          hostelName: hostel ? hostel.name : "Unknown Hostel",
          studentName: student ? `${student.firstName} ${student.lastName}`.trim() : "Unknown Student",
          studentRegistrationNumber: student?.registrationNumber || student?.studentId || "",
        };
      })
    );
  },
});

export const markMealAttendance = mutation({
  args: {
    studentId: v.id("students"),
    hostelId: v.id("hostels"),
    date: v.string(), // YYYY-MM-DD
    mealType: mealTypeUnion,
    status: mealAttendanceStatusUnion,
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      if (!wardenHostels.some((id) => id.toString() === args.hostelId.toString())) {
        throw new Error("Forbidden: Wardens can only mark attendance for assigned hostels");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    // Check if attendance record already exists for (studentId, date, mealType)
    const existing = await ctx.db
      .query("mealAttendance")
      .withIndex("by_student_date_meal", (q) =>
        q.eq("studentId", args.studentId).eq("date", args.date).eq("mealType", args.mealType)
      )
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        markedBy: user._id,
        hostelId: args.hostelId,
      });
      await audit(ctx, user._id, "MEAL_ATTENDANCE_UPDATED", "mealAttendance", existing._id, {
        studentId: args.studentId,
        date: args.date,
        mealType: args.mealType,
        status: args.status,
      });
      return existing._id;
    } else {
      const id = await ctx.db.insert("mealAttendance", {
        studentId: args.studentId,
        hostelId: args.hostelId,
        date: args.date,
        mealType: args.mealType,
        status: args.status,
        markedBy: user._id,
        createdAt: now,
      });
      await audit(ctx, user._id, "MEAL_ATTENDANCE_RECORDED", "mealAttendance", id, {
        studentId: args.studentId,
        date: args.date,
        mealType: args.mealType,
        status: args.status,
      });
      return id;
    }
  },
});

export const batchMarkMealAttendance = mutation({
  args: {
    hostelId: v.id("hostels"),
    date: v.string(),
    mealType: mealTypeUnion,
    records: v.array(
      v.object({
        studentId: v.id("students"),
        status: mealAttendanceStatusUnion,
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      if (!wardenHostels.some((id) => id.toString() === args.hostelId.toString())) {
        throw new Error("Forbidden: Wardens can only mark attendance for assigned hostels");
      }
    } else if (user.role !== "ADMIN") {
      throw new Error("Forbidden");
    }

    const now = Date.now();
    let updatedCount = 0;

    for (const record of args.records) {
      const existing = await ctx.db
        .query("mealAttendance")
        .withIndex("by_student_date_meal", (q) =>
          q.eq("studentId", record.studentId).eq("date", args.date).eq("mealType", args.mealType)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          status: record.status,
          markedBy: user._id,
          hostelId: args.hostelId,
        });
      } else {
        await ctx.db.insert("mealAttendance", {
          studentId: record.studentId,
          hostelId: args.hostelId,
          date: args.date,
          mealType: args.mealType,
          status: record.status,
          markedBy: user._id,
          createdAt: now,
        });
      }
      updatedCount++;
    }

    await audit(ctx, user._id, "BATCH_MEAL_ATTENDANCE_RECORDED", "mealAttendance", args.hostelId, {
      date: args.date,
      mealType: args.mealType,
      count: updatedCount,
    });

    return { success: true, count: updatedCount };
  },
});

// ==========================================
// FOOD FEEDBACK
// ==========================================

export const submitFeedback = mutation({
  args: {
    mealType: mealTypeUnion,
    date: v.string(), // YYYY-MM-DD
    rating: v.number(), // 1 to 5
    comment: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireStudent(ctx);
    const student = await getStudentForUser(ctx, user._id);
    if (!student) throw new Error("Student profile not found");

    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }
    if (!args.comment || args.comment.trim().length === 0) {
      throw new Error("Feedback comment cannot be empty");
    }

    const allocation = await ctx.db
      .query("allocations")
      .withIndex("by_student_status", (q) =>
        q.eq("studentId", student._id).eq("status", "ACTIVE")
      )
      .first();

    let hostelId = undefined;
    if (allocation) {
      const hId = await getHostelIdForRoom(ctx, allocation.roomId);
      if (hId) {
        hostelId = hId;
      }
    }

    const id = await ctx.db.insert("foodFeedback", {
      studentId: student._id,
      hostelId,
      date: args.date,
      mealType: args.mealType,
      rating: Math.round(args.rating),
      comment: args.comment.trim(),
      createdAt: Date.now(),
    });

    await audit(ctx, user._id, "FOOD_FEEDBACK_SUBMITTED", "foodFeedback", id, {
      mealType: args.mealType,
      rating: args.rating,
      date: args.date,
    });

    return id;
  },
});

export const listFeedback = query({
  args: {
    hostelId: v.optional(v.id("hostels")),
    mealType: v.optional(mealTypeUnion),
    date: v.optional(v.string()),
    limit: v.optional(v.number()),
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
    }

    let feedbackList = await ctx.db.query("foodFeedback").collect();

    if (user.role === "STUDENT") {
      const student = await getStudentForUser(ctx, user._id);
      if (!student) return [];
      feedbackList = feedbackList.filter((f) => f.studentId === student._id);
    } else if (allowedHostelIds !== null) {
      feedbackList = feedbackList.filter(
        (f) => !f.hostelId || allowedHostelIds!.includes(f.hostelId.toString())
      );
    }

    if (args.hostelId) {
      feedbackList = feedbackList.filter((f) => f.hostelId === args.hostelId);
    }
    if (args.mealType) {
      feedbackList = feedbackList.filter((f) => f.mealType === args.mealType);
    }
    if (args.date) {
      feedbackList = feedbackList.filter((f) => f.date === args.date);
    }

    feedbackList.sort((a, b) => b.createdAt - a.createdAt);

    if (args.limit) {
      feedbackList = feedbackList.slice(0, args.limit);
    }

    return await Promise.all(
      feedbackList.map(async (f) => {
        const student = await ctx.db.get(f.studentId);
        const hostel = f.hostelId ? await ctx.db.get(f.hostelId) : null;

        return {
          ...f,
          hostelName: hostel ? hostel.name : "All Hostels",
          studentName: student ? `${student.firstName} ${student.lastName}`.trim() : "Student",
        };
      })
    );
  },
});

// ==========================================
// MESS STATS
// ==========================================

export const getMessStats = query({
  args: {
    hostelId: v.optional(v.id("hostels")),
    date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const date = args.date || getTodayString();

    let allowedHostelIds: string[] | null = null;
    if (user.role === "WARDEN") {
      const wardenHostels = await getWardenHostels(ctx, user._id);
      allowedHostelIds = wardenHostels.map((id) => id.toString());
      if (args.hostelId && !allowedHostelIds.includes(args.hostelId.toString())) {
        throw new Error("Forbidden: You do not have access to this hostel");
      }
    }

    // Expected headcounts: active allocations
    let allocations = await ctx.db
      .query("allocations")
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .collect();

    // Map allocations to their hostel
    const enrichedAllocations = await Promise.all(
      allocations.map(async (a) => {
        const hostelId = await getHostelIdForRoom(ctx, a.roomId);
        return {
          ...a,
          hostelId,
        };
      })
    );

    let filteredAllocations = enrichedAllocations;
    if (allowedHostelIds !== null) {
      filteredAllocations = filteredAllocations.filter(
        (a) => a.hostelId && allowedHostelIds!.includes(a.hostelId.toString())
      );
    }
    if (args.hostelId) {
      filteredAllocations = filteredAllocations.filter(
        (a) => a.hostelId && a.hostelId.toString() === args.hostelId!.toString()
      );
    }
    const expectedStudents = filteredAllocations.length;

    // Attendance records for this date
    let attendance = await ctx.db
      .query("mealAttendance")
      .withIndex("by_date", (q) => q.eq("date", date))
      .collect();

    if (allowedHostelIds !== null) {
      attendance = attendance.filter((a) => allowedHostelIds!.includes(a.hostelId.toString()));
    }
    if (args.hostelId) {
      attendance = attendance.filter((a) => a.hostelId === args.hostelId);
    }

    const mealStats = {
      BREAKFAST: { taken: 0, skipped: 0, leave: 0, totalMarked: 0 },
      LUNCH: { taken: 0, skipped: 0, leave: 0, totalMarked: 0 },
      SNACKS: { taken: 0, skipped: 0, leave: 0, totalMarked: 0 },
      DINNER: { taken: 0, skipped: 0, leave: 0, totalMarked: 0 },
    };

    for (const record of attendance) {
      const type = record.mealType as keyof typeof mealStats;
      if (mealStats[type]) {
        mealStats[type].totalMarked++;
        if (record.status === "TAKEN") mealStats[type].taken++;
        else if (record.status === "SKIPPED") mealStats[type].skipped++;
        else if (record.status === "LEAVE") mealStats[type].leave++;
      }
    }

    // Feedback ratings
    let feedback = await ctx.db.query("foodFeedback").collect();
    if (allowedHostelIds !== null) {
      feedback = feedback.filter((f) => !f.hostelId || allowedHostelIds!.includes(f.hostelId.toString()));
    }
    if (args.hostelId) {
      feedback = feedback.filter((f) => f.hostelId === args.hostelId);
    }

    const totalRatings = feedback.length;
    const avgRating = totalRatings > 0
      ? Math.round((feedback.reduce((sum, f) => sum + f.rating, 0) / totalRatings) * 10) / 10
      : 0;

    return {
      date,
      expectedStudents,
      mealStats,
      totalFeedback: totalRatings,
      averageRating: avgRating,
    };
  },
});
