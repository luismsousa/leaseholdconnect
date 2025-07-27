import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getClerkUserId } from "./clerkHelpers";
import { Id } from "./_generated/dataModel";

async function requireAssociationAdmin(ctx: any, associationId: Id<"associations">) {
  const userId = await getClerkUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required");
  }

  const associationMembership = await ctx.db
    .query("associationMembers")
    .withIndex("by_association_and_user", (q: any) => 
      q.eq("associationId", associationId).eq("userId", userId)
    )
    .filter((q: any) => q.eq(q.field("status"), "active"))
    .first();

  if (!associationMembership || (associationMembership.role !== "owner" && associationMembership.role !== "admin")) {
    throw new Error("Admin access required");
  }

  return { userId, associationMembership };
}

export const log = mutation({
  args: {
    associationId: v.id("associations"),
    userId: v.string(), // Clerk user ID
    memberId: v.optional(v.id("members")),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    description: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLogs", {
      associationId: args.associationId,
      userId: args.userId,
      memberId: args.memberId,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      description: args.description,
      metadata: args.metadata,
      timestamp: Date.now(),
    });
  },
});

export const list = query({
  args: {
    associationId: v.id("associations"),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    action: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAssociationAdmin(ctx, args.associationId);

    let query = ctx.db
      .query("auditLogs")
      .withIndex("by_association_and_timestamp", (q) => q.eq("associationId", args.associationId))
      .order("desc");

    if (args.entityType && args.entityId) {
      query = ctx.db
        .query("auditLogs")
        .withIndex("by_association_and_entity", (q) => 
          q.eq("associationId", args.associationId)
           .eq("entityType", args.entityType!)
           .eq("entityId", args.entityId!)
        )
        .order("desc");
    } else if (args.action) {
      query = ctx.db
        .query("auditLogs")
        .withIndex("by_association_and_action", (q) => 
          q.eq("associationId", args.associationId).eq("action", args.action!)
        )
        .order("desc");
    }

    const logs = await query.take(args.limit || 100);

    // Enrich with user and member information
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        // With Clerk, we can't get user details from our DB
        // We'd need to make Clerk API calls to get real user data
        const user = {
          _id: log.userId,
          name: "User", // Would need Clerk API call for real name
          email: "user@example.com" // Placeholder
        };
        const member = log.memberId ? await ctx.db.get(log.memberId) : null;
        return {
          ...log,
          user,
          member,
        };
      })
    );

    return enrichedLogs;
  },
});

export const getStats = query({
  args: {
    associationId: v.id("associations"),
  },
  handler: async (ctx, args) => {
    await requireAssociationAdmin(ctx, args.associationId);

    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_association", (q) => q.eq("associationId", args.associationId))
      .collect();

    const totalLogs = logs.length;
    
    // Count actions
    const actionCounts: Record<string, number> = {};
    const entityCounts: Record<string, number> = {};
    
    logs.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      entityCounts[log.entityType] = (entityCounts[log.entityType] || 0) + 1;
    });

    return {
      totalLogs,
      actionCounts,
      entityCounts,
    };
  },
});
