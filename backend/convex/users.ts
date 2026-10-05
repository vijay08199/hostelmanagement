import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./authorization";

const userRole = v.union(v.literal("ADMIN"), v.literal("WARDEN"), v.literal("STUDENT"));
const userStatus = v.union(v.literal("ACTIVE"), v.literal("INACTIVE"), v.literal("PENDING"));

export const listUsers = query({
  args: {
    search: v.optional(v.string()),
    role: v.optional(userRole),
    status: v.optional(userStatus),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();

    const enriched = await Promise.all(
      users.map(async (u) => {
        let wardenProfile = null;
        let studentProfile = null;

        if (u.role === "WARDEN") {
          const warden = await ctx.db
            .query("wardens")
            .withIndex("by_user", (q) => q.eq("userId", u._id))
            .unique();
          if (warden) {
            const hostels = await Promise.all(
              warden.assignedHostelIds.map((id) => ctx.db.get(id))
            );
            wardenProfile = {
              ...warden,
              hostels: hostels.filter(Boolean).map((h) => ({
                id: h!._id,
                name: h!.name,
                code: h!.code,
              })),
            };
          }
        } else if (u.role === "STUDENT") {
          const student = await ctx.db
            .query("students")
            .withIndex("by_user", (q) => q.eq("userId", u._id))
            .unique();
          if (student) {
            studentProfile = {
              id: student._id,
              studentId: student.studentId,
              rollNumber: student.rollNumber,
              department: student.department,
              program: student.program,
              year: student.year,
            };
          }
        }

        return {
          ...u,
          wardenProfile,
          studentProfile,
        };
      })
    );

    const search = args.search?.trim().toLowerCase();

    return enriched
      .filter((u) => {
        if (args.role && u.role !== args.role) return false;
        if (args.status && u.status !== args.status) return false;
        if (search) {
          const haystack = [
            u.name,
            u.email,
            u.role,
            u.status,
            u.wardenProfile?.employeeId,
            u.studentProfile?.studentId,
            u.studentProfile?.rollNumber,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(search);
        }
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getUserStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();

    return {
      totalUsers: users.length,
      active: users.filter((u) => u.status === "ACTIVE").length,
      pending: users.filter((u) => u.status === "PENDING").length,
      inactive: users.filter((u) => u.status === "INACTIVE").length,
      admins: users.filter((u) => u.role === "ADMIN").length,
      wardens: users.filter((u) => u.role === "WARDEN").length,
      students: users.filter((u) => u.role === "STUDENT").length,
    };
  },
});

export const updateUserStatus = mutation({
  args: {
    userId: v.id("users"),
    status: userStatus,
  },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const now = Date.now();
    await ctx.db.patch(args.userId, {
      status: args.status,
      updatedAt: now,
    });

    let action = "USER_STATUS_UPDATED";
    if (args.status === "ACTIVE") action = "USER_ACTIVATED";
    else if (args.status === "INACTIVE") action = "USER_DEACTIVATED";
    else if (args.status === "PENDING") action = "USER_ACCESS_REVOKED";

    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      action,
      entityType: "user",
      entityId: args.userId,
      metadata: JSON.stringify({
        email: user.email,
        oldStatus: user.status,
        newStatus: args.status,
      }),
      createdAt: now,
    });

    return args.userId;
  },
});

export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: userRole,
  },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const now = Date.now();
    await ctx.db.patch(args.userId, {
      role: args.role,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      action: "USER_ROLE_CHANGED",
      entityType: "user",
      entityId: args.userId,
      metadata: JSON.stringify({
        email: user.email,
        oldRole: user.role,
        newRole: args.role,
      }),
      createdAt: now,
    });

    return args.userId;
  },
});

export const linkWardenProfile = mutation({
  args: {
    userId: v.id("users"),
    employeeId: v.string(),
    assignedHostelIds: v.array(v.id("hostels")),
  },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const employeeId = args.employeeId.trim();
    if (!employeeId) throw new Error("Employee ID is required");

    const otherWarden = await ctx.db
      .query("wardens")
      .withIndex("by_employee_id", (q) => q.eq("employeeId", employeeId))
      .unique();

    if (otherWarden && otherWarden.userId !== args.userId) {
      throw new Error("Employee ID is already in use by another warden");
    }

    const uniqueHostelIds = [...new Set(args.assignedHostelIds)];
    for (const hId of uniqueHostelIds) {
      if (!(await ctx.db.get(hId))) throw new Error("Assigned hostel not found");
    }

    const now = Date.now();

    // Ensure role is WARDEN
    if (user.role !== "WARDEN") {
      await ctx.db.patch(args.userId, { role: "WARDEN", updatedAt: now });
    }

    const existingWarden = await ctx.db
      .query("wardens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    let wardenId;
    if (existingWarden) {
      await ctx.db.patch(existingWarden._id, {
        employeeId,
        assignedHostelIds: uniqueHostelIds,
        updatedAt: now,
      });
      wardenId = existingWarden._id;
    } else {
      wardenId = await ctx.db.insert("wardens", {
        userId: args.userId,
        employeeId,
        assignedHostelIds: uniqueHostelIds,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      action: "USER_ACCESS_GRANTED",
      entityType: "warden",
      entityId: wardenId,
      metadata: JSON.stringify({
        userId: args.userId,
        email: user.email,
        employeeId,
        assignedHostelIds: uniqueHostelIds,
      }),
      createdAt: now,
    });

    return wardenId;
  },
});

export const linkStudentProfile = mutation({
  args: {
    userId: v.id("users"),
    studentId: v.string(),
    rollNumber: v.optional(v.string()),
    department: v.optional(v.string()),
    program: v.optional(v.string()),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const studentIdCode = args.studentId.trim();
    if (!studentIdCode) throw new Error("Student ID is required");

    const now = Date.now();

    // Ensure user role is STUDENT
    if (user.role !== "STUDENT") {
      await ctx.db.patch(args.userId, { role: "STUDENT", updatedAt: now });
    }

    // Check if a student with this studentId already exists
    const existingStudent = await ctx.db
      .query("students")
      .withIndex("by_student_id", (q) => q.eq("studentId", studentIdCode))
      .unique();

    let studentProfileId;
    if (existingStudent) {
      await ctx.db.patch(existingStudent._id, {
        userId: args.userId,
        email: user.email,
        rollNumber: args.rollNumber?.trim() || existingStudent.rollNumber,
        department: args.department?.trim() || existingStudent.department,
        program: args.program?.trim() || existingStudent.program,
        year: args.year !== undefined ? args.year : existingStudent.year,
        updatedAt: now,
      });
      studentProfileId = existingStudent._id;
    } else {
      // Split user name into firstName and lastName
      const nameParts = (user.name || "Student User").trim().split(" ");
      const firstName = nameParts[0] || "Student";
      const lastName = nameParts.slice(1).join(" ") || "Resident";

      studentProfileId = await ctx.db.insert("students", {
        userId: args.userId,
        studentId: studentIdCode,
        firstName,
        lastName,
        email: user.email,
        rollNumber: args.rollNumber?.trim(),
        department: args.department?.trim(),
        program: args.program?.trim(),
        year: args.year,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      action: "USER_ACCESS_GRANTED",
      entityType: "student",
      entityId: studentProfileId,
      metadata: JSON.stringify({
        userId: args.userId,
        email: user.email,
        studentId: studentIdCode,
      }),
      createdAt: now,
    });

    return studentProfileId;
  },
});

export const provisionByAdmin = mutation({
  args: {
    identitySubject: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    role: userRole,
  },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    if (
      await ctx.db
        .query("users")
        .withIndex("by_identity", (q) => q.eq("identitySubject", args.identitySubject))
        .unique()
    ) {
      throw new Error("Identity is already provisioned");
    }
    const now = Date.now();
    const id = await ctx.db.insert("users", {
      ...args,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      action: "USER_PROVISIONED",
      entityType: "user",
      entityId: id,
      createdAt: now,
    });
    return id;
  },
});

