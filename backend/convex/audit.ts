import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./authorization";

export const list = query({ args: { paginationOpts: v.any() }, handler: async (ctx, args) => { await requireAdmin(ctx); return ctx.db.query("auditLogs").order("desc").paginate(args.paginationOpts); } });

export const listAuditLogs = query({ args: { search: v.optional(v.string()), action: v.optional(v.string()), entityType: v.optional(v.string()), actorId: v.optional(v.id("users")), from: v.optional(v.number()), to: v.optional(v.number()), limit: v.optional(v.number()) }, handler: async (ctx, args) => {
  await requireAdmin(ctx); const limit = Math.min(Math.max(args.limit ?? 50, 1), 100); const logs = await ctx.db.query("auditLogs").order("desc").take(500); const users = await ctx.db.query("users").collect(); const byId = new Map(users.map(user => [user._id, user])); const search = args.search?.trim().toLowerCase();
  return logs.filter(log => { const actor = byId.get(log.actorId); const text = [actor?.name, actor?.email, log.action, log.entityId].filter(Boolean).join(" ").toLowerCase(); return (!search || text.includes(search)) && (!args.action || log.action === args.action) && (!args.entityType || log.entityType === args.entityType) && (!args.actorId || log.actorId === args.actorId) && (args.from === undefined || log.createdAt >= args.from) && (args.to === undefined || log.createdAt <= args.to); }).slice(0, limit).map(log => { const actor = byId.get(log.actorId); return { ...log, actorName: actor?.name ?? "Unknown user", actorEmail: actor?.email ?? "" }; });
} });
