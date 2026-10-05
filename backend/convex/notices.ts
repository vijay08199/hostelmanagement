import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireAuthenticatedUser } from "./authorization";

const noticeStatus = v.union(v.literal("DRAFT"), v.literal("PUBLISHED"), v.literal("ARCHIVED"));
const noticeAudience = v.union(v.literal("ALL"), v.literal("STUDENTS"), v.literal("WARDENS"), v.literal("HOSTEL"), v.literal("SPECIFIC_ROLE"));
const userRole = v.union(v.literal("ADMIN"), v.literal("WARDEN"), v.literal("STUDENT"));

async function enrichNotice(ctx: any, n: any) {
  const creator = await ctx.db.get(n.createdBy);
  const hostel = n.hostelId ? await ctx.db.get(n.hostelId) : null;
  return {
    ...n,
    creatorName: creator?.name ?? "Administrator",
    hostelName: hostel?.name ?? undefined,
    hostelCode: hostel?.code ?? undefined,
  };
}

export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    audience: noticeAudience,
    roleTarget: v.optional(userRole),
    hostelId: v.optional(v.id("hostels")),
    expiresAt: v.optional(v.number()),
    status: v.optional(noticeStatus),
  },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const title = args.title.trim();
    const content = args.content.trim();
    if (!title || !content) throw new Error("Title and content are required.");

    if (args.audience === "HOSTEL" && !args.hostelId) {
      throw new Error("A target hostel is required when audience is set to HOSTEL.");
    }
    if (args.audience === "SPECIFIC_ROLE" && !args.roleTarget) {
      throw new Error("A target role is required when audience is set to SPECIFIC_ROLE.");
    }

    const now = Date.now();
    const status = args.status ?? "PUBLISHED";
    const id = await ctx.db.insert("notices", {
      title,
      content,
      audience: args.audience,
      roleTarget: args.roleTarget,
      hostelId: args.hostelId,
      expiresAt: args.expiresAt,
      status,
      createdBy: actor._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      action: "NOTICE_CREATED",
      entityType: "notice",
      entityId: id,
      metadata: JSON.stringify({ title, audience: args.audience, status }),
      createdAt: now,
    });

    return id;
  },
});

export const update = mutation({
  args: {
    noticeId: v.id("notices"),
    title: v.string(),
    content: v.string(),
    audience: noticeAudience,
    roleTarget: v.optional(userRole),
    hostelId: v.optional(v.id("hostels")),
    expiresAt: v.optional(v.number()),
    status: noticeStatus,
  },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const existing = await ctx.db.get(args.noticeId);
    if (!existing) throw new Error("Notice not found.");

    const title = args.title.trim();
    const content = args.content.trim();
    if (!title || !content) throw new Error("Title and content are required.");

    const now = Date.now();
    await ctx.db.patch(args.noticeId, {
      title,
      content,
      audience: args.audience,
      roleTarget: args.roleTarget,
      hostelId: args.hostelId,
      expiresAt: args.expiresAt,
      status: args.status,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      action: "NOTICE_UPDATED",
      entityType: "notice",
      entityId: args.noticeId,
      metadata: JSON.stringify({ title, status: args.status }),
      createdAt: now,
    });

    return args.noticeId;
  },
});

export const publish = mutation({
  args: { noticeId: v.id("notices") },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const existing = await ctx.db.get(args.noticeId);
    if (!existing) throw new Error("Notice not found.");

    const now = Date.now();
    await ctx.db.patch(args.noticeId, {
      status: "PUBLISHED",
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      action: "NOTICE_PUBLISHED",
      entityType: "notice",
      entityId: args.noticeId,
      createdAt: now,
    });

    return args.noticeId;
  },
});

export const archive = mutation({
  args: { noticeId: v.id("notices") },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const existing = await ctx.db.get(args.noticeId);
    if (!existing) throw new Error("Notice not found.");

    const now = Date.now();
    await ctx.db.patch(args.noticeId, {
      status: "ARCHIVED",
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      action: "NOTICE_ARCHIVED",
      entityType: "notice",
      entityId: args.noticeId,
      createdAt: now,
    });

    return args.noticeId;
  },
});

export const listForAdmin = query({
  args: {
    status: v.optional(noticeStatus),
    audience: v.optional(noticeAudience),
    hostelId: v.optional(v.id("hostels")),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("notices").order("desc").collect();
    const enriched = await Promise.all(rows.map((n: any) => enrichNotice(ctx, n)));

    const search = args.search?.trim().toLowerCase();
    return enriched.filter((n: any) => {
      if (args.status && n.status !== args.status) return false;
      if (args.audience && n.audience !== args.audience) return false;
      if (args.hostelId && n.hostelId !== args.hostelId) return false;
      if (search) {
        const text = [n.title, n.content, n.hostelName, n.creatorName].filter(Boolean).join(" ").toLowerCase();
        if (!text.includes(search)) return false;
      }
      return true;
    });
  },
});

export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthenticatedUser(ctx);
    const now = Date.now();

    // Determine user's hostel context if student or warden
    let userHostelIds: string[] = [];
    if (user.role === "STUDENT") {
      const student = await ctx.db.query("students").withIndex("by_user", (q: any) => q.eq("userId", user._id)).unique();
      if (student) {
        const allocation = await ctx.db.query("allocations").withIndex("by_student_status", (q: any) => q.eq("studentId", student._id).eq("status", "ACTIVE")).unique();
        if (allocation) {
          const bed = await ctx.db.get(allocation.bedId);
          const room = bed ? await ctx.db.get(bed.roomId) : null;
          const floor = room ? await ctx.db.get(room.floorId) : null;
          const block = floor ? await ctx.db.get(floor.blockId) : null;
          if (block?.hostelId) {
            userHostelIds = [block.hostelId.toString()];
          }
        }
      }
    } else if (user.role === "WARDEN") {
      const warden = await ctx.db.query("wardens").withIndex("by_user", (q: any) => q.eq("userId", user._id)).unique();
      if (warden) {
        userHostelIds = warden.assignedHostelIds.map((id: any) => id.toString());
      }
    }

    const rows = await ctx.db.query("notices").withIndex("by_status", (q: any) => q.eq("status", "PUBLISHED")).order("desc").collect();
    const enriched = await Promise.all(rows.map((n: any) => enrichNotice(ctx, n)));

    return enriched.filter((n: any) => {
      // Expiry check
      if (n.expiresAt && n.expiresAt < now) return false;

      // Admin sees all published notices
      if (user.role === "ADMIN") return true;

      if (n.audience === "ALL") return true;
      if (n.audience === "STUDENTS" && user.role === "STUDENT") return true;
      if (n.audience === "WARDENS" && user.role === "WARDEN") return true;
      if (n.audience === "SPECIFIC_ROLE" && n.roleTarget === user.role) return true;
      if (n.audience === "HOSTEL" && n.hostelId) {
        return userHostelIds.includes(n.hostelId.toString());
      }

      return false;
    });
  },
});
