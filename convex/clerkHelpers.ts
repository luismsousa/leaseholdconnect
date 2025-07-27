import { QueryCtx, MutationCtx } from "./_generated/server";

export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  
  // Extract just the user ID part from tokenIdentifier
  const parts = identity.tokenIdentifier.split('|');
  const tokenIdentifier = parts.length > 1 ? parts[1] : identity.tokenIdentifier;
  
  // Try to find existing user
  const existingUser = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", tokenIdentifier)
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
  if (!identity?.tokenIdentifier) {
    return null;
  }
  
  // Extract just the user ID part after the | character
  // tokenIdentifier format: "https://domain.clerk.accounts.dev|user_123456"
  const parts = identity.tokenIdentifier.split('|');
  return parts.length > 1 ? parts[1] : identity.tokenIdentifier;
}

export async function requireClerkAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("User not authenticated");
  }
  
  // Extract just the user ID part after the | character
  // tokenIdentifier format: "https://domain.clerk.accounts.dev|user_123456"
  const parts = identity.tokenIdentifier.split('|');
  return parts.length > 1 ? parts[1] : identity.tokenIdentifier;
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
