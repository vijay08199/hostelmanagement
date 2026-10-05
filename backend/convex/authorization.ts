import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
type Ctx = QueryCtx | MutationCtx;
export async function requireAuthenticatedUser(ctx: Ctx) { const identity = await ctx.auth.getUserIdentity(); if (!identity) throw new Error("Authentication required"); const user = await ctx.db.query("users").withIndex("by_identity", q => q.eq("identitySubject", identity.subject)).unique(); if (!user || user.status !== "ACTIVE") throw new Error("Active application user required"); return user; }
export async function requireRole(ctx: Ctx, role: "ADMIN" | "WARDEN" | "STUDENT") { const user = await requireAuthenticatedUser(ctx); if (user.role !== role) throw new Error("Forbidden"); return user; }
export const requireAdmin = (ctx: Ctx) => requireRole(ctx, "ADMIN");
export const requireWarden = (ctx: Ctx) => requireRole(ctx, "WARDEN");
export const requireStudent = (ctx: Ctx) => requireRole(ctx, "STUDENT");
export async function requireHostelAccess(ctx: Ctx, userId: Id<"users">, hostelId: Id<"hostels">) { const user = await requireWarden(ctx); if (user._id !== userId) throw new Error("Forbidden"); const warden = await ctx.db.query("wardens").withIndex("by_user", q => q.eq("userId", user._id)).unique(); if (!warden?.assignedHostelIds.some(id => id === hostelId)) throw new Error("Unauthorized hostel"); return user; }

export async function getStudentForUser(ctx: Ctx, userId: Id<"users">) {
  const student = await ctx.db.query("students").withIndex("by_user", q => q.eq("userId", userId)).unique();
  if (!student) throw new Error("Student profile not found for this user");
  return student;
}

export async function getWardenHostels(ctx: Ctx, userId: Id<"users">) {
  const warden = await ctx.db.query("wardens").withIndex("by_user", q => q.eq("userId", userId)).unique();
  return warden?.assignedHostelIds || [];
}
