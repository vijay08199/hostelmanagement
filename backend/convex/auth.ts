import { query, mutation } from "./_generated/server";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return {
        authenticated: false,
        state: "UNAUTHENTICATED",
        identity: null,
        user: null,
      };
    }

    let user = await ctx.db
      .query("users")
      .withIndex("by_identity", q =>
        q.eq("identitySubject", identity.subject)
      )
      .unique();

    if (!user && identity.email) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", q => q.eq("email", identity.email!))
        .unique();
    }

    return {
      authenticated: true,
      state: !user || user.status === "PENDING"
        ? "PENDING"
        : user.status === "INACTIVE"
          ? "INACTIVE"
          : `ACTIVE_${user.role}`,
      identity: {
        subject: identity.subject,
        email: identity.email,
        name: identity.name,
      },
      user: user
        ? {
            id: user._id,
            identitySubject: user.identitySubject,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
          }
        : null,
    };
  },
});

export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return {
        authenticated: false,
        state: "UNAUTHENTICATED",
        user: null,
      };
    }

    let user = await ctx.db
      .query("users")
      .withIndex("by_identity", q =>
        q.eq("identitySubject", identity.subject)
      )
      .unique();

    if (!user && identity.email) {
      const existingByEmail = await ctx.db
        .query("users")
        .withIndex("by_email", q => q.eq("email", identity.email!))
        .unique();

      if (existingByEmail) {
        await ctx.db.patch(existingByEmail._id, {
          identitySubject: identity.subject,
          name: existingByEmail.name || identity.name || identity.email.split("@")[0],
          updatedAt: Date.now(),
        });
        user = await ctx.db.get(existingByEmail._id);
      }
    }

    if (!user) {
      const now = Date.now();
      const newId = await ctx.db.insert("users", {
        identitySubject: identity.subject,
        name: identity.name || identity.email?.split("@")[0] || "New User",
        email: identity.email || "",
        phone: identity.phoneNumber,
        role: "STUDENT",
        status: "PENDING",
        createdAt: now,
        updatedAt: now,
      });

      user = await ctx.db.get(newId);

      if (user) {
        await ctx.db.insert("auditLogs", {
          actorId: user._id,
          action: "USER_REGISTERED_PENDING",
          entityType: "user",
          entityId: user._id,
          metadata: JSON.stringify({ email: user.email, name: user.name }),
          createdAt: now,
        });
      }
    }

    const state = !user || user.status === "PENDING"
      ? "PENDING"
      : user.status === "INACTIVE"
        ? "INACTIVE"
        : `ACTIVE_${user.role}`;

    return {
      authenticated: true,
      state,
      user: user
        ? {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
          }
        : null,
    };
  },
});

