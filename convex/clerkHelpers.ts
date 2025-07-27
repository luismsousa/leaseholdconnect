import { QueryCtx, MutationCtx } from "./_generated/server";

export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  
  // Try to find existing user
  const existingUser = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique();
  
  if (existingUser) {
    return existingUser;
  }
  
  return null;
}

export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("User not authenticated");
  }
  return user;
}

// Legacy function names for backward compatibility
export async function getClerkUserId(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.tokenIdentifier ?? null;
}

export async function requireClerkAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("User not authenticated");
  }
  return identity.tokenIdentifier;
}

export async function requirePaasAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await requireClerkAuth(ctx);
  
  const paasAdmin = await ctx.db
    .query("paasAdmins")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("isActive"), true))
    .unique();
  
  if (!paasAdmin) {
    throw new Error("Access denied: PaaS admin privileges required");
  }
  
  return paasAdmin;
}
