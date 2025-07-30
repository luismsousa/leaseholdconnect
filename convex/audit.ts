import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getClerkUserId } from "./clerkHelpers";
import { Id } from "./_generated/dataModel";

async function requireAssociationAdmin(
  ctx: any,
  associationId: Id<"associations">,
) {
  const userId = await getClerkUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required");
  }

  const associationMembership = await ctx.db
    .query("associationMembers")
    .withIndex("by_association_and_user", (q: any) =>
      q.eq("associationId", associationId).eq("userId", userId),
    )
    .filter((q: any) => q.eq(q.field("status"), "active"))
    .first();

  if (
    !associationMembership ||
    (associationMembership.role !== "owner" &&
      associationMembership.role !== "admin")
  ) {
    throw new Error("Admin access required");
  }

  return { userId, associationMembership };
}

async function requireAssociationMember(
  ctx: any,
  associationId: Id<"associations">,
) {
  const userId = await getClerkUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required");
  }

  const associationMembership = await ctx.db
    .query("associationMembers")
    .withIndex("by_association_and_user", (q: any) =>
      q.eq("associationId", associationId).eq("userId", userId),
    )
    .filter((q: any) => q.eq(q.field("status"), "active"))
    .first();

  if (!associationMembership) {
    throw new Error("Association membership required");
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
    description: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.null(),
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
    return null;
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
  returns: v.array(
    v.object({
      _id: v.id("auditLogs"),
      _creationTime: v.number(),
      associationId: v.id("associations"),
      userId: v.string(),
      memberId: v.optional(v.id("members")),
      action: v.string(),
      entityType: v.string(),
      entityId: v.optional(v.string()),
      description: v.optional(v.string()),
      metadata: v.optional(v.any()),
      timestamp: v.number(),
      user: v.object({
        _id: v.string(),
        name: v.string(),
        email: v.string(),
      }),
      member: v.optional(
        v.object({
          _id: v.id("members"),
          name: v.string(),
          email: v.string(),
          unit: v.optional(v.string()),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const { userId, associationMembership } = await requireAssociationMember(
      ctx,
      args.associationId,
    );
    const isAdmin =
      associationMembership.role === "owner" ||
      associationMembership.role === "admin";

    let query = ctx.db
      .query("auditLogs")
      .withIndex("by_association_and_timestamp", (q) =>
        q.eq("associationId", args.associationId),
      )
      .order("desc");

    // If not admin, only show user's own activity
    if (!isAdmin) {
      query = ctx.db
        .query("auditLogs")
        .withIndex("by_association_and_user", (q) =>
          q.eq("associationId", args.associationId).eq("userId", userId),
        )
        .order("desc");
    } else if (args.entityType && args.entityId) {
      query = ctx.db
        .query("auditLogs")
        .withIndex("by_association_and_entity", (q) =>
          q
            .eq("associationId", args.associationId)
            .eq("entityType", args.entityType as string)
            .eq("entityId", args.entityId as string),
        )
        .order("desc");
    } else if (args.action) {
      query = ctx.db
        .query("auditLogs")
        .withIndex("by_association_and_action", (q) =>
          q
            .eq("associationId", args.associationId)
            .eq("action", args.action!),
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
          email: "user@example.com", // Placeholder
        };
        const member = log.memberId ? await ctx.db.get(log.memberId) : null;
        return {
          _id: log._id,
          _creationTime: log._creationTime,
          associationId: log.associationId as Id<"associations">,
          userId: log.userId,
          memberId: log.memberId,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          description: log.description,
          metadata: log.metadata,
          timestamp: log.timestamp,
          user,
          member: member
            ? {
                _id: member._id,
                name: member.name,
                email: member.email,
                unit: member.unit,
              }
            : undefined,
        };
      }),
    );

    return enrichedLogs;
  },
});

export const getStats = query({
  args: {
    associationId: v.id("associations"),
  },
  returns: v.object({
    totalLogs: v.number(),
    actionCounts: v.record(v.string(), v.number()),
    entityCounts: v.record(v.string(), v.number()),
  }),
  handler: async (ctx, args) => {
    const { userId, associationMembership } = await requireAssociationMember(
      ctx,
      args.associationId,
    );
    const isAdmin =
      associationMembership.role === "owner" ||
      associationMembership.role === "admin";

    let query = ctx.db
      .query("auditLogs")
      .withIndex("by_association", (q) =>
        q.eq("associationId", args.associationId),
      );

    // If not admin, only count user's own activity
    if (!isAdmin) {
      query = ctx.db
        .query("auditLogs")
        .withIndex("by_association_and_user", (q) =>
          q.eq("associationId", args.associationId).eq("userId", userId),
        );
    }

    const logs = await query.collect();

    const totalLogs = logs.length;

    // Count actions
    const actionCounts: Record<string, number> = {};
    const entityCounts: Record<string, number> = {};

    logs.forEach((log) => {
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

export const getMyActivity = query({
  args: {
    associationId: v.id("associations"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("auditLogs"),
      _creationTime: v.number(),
      associationId: v.id("associations"),
      userId: v.string(),
      memberId: v.optional(v.id("members")),
      action: v.string(),
      entityType: v.string(),
      entityId: v.optional(v.string()),
      description: v.optional(v.string()),
      metadata: v.optional(v.any()),
      timestamp: v.number(),
      user: v.object({
        _id: v.string(),
        name: v.string(),
        email: v.string(),
      }),
      member: v.optional(
        v.object({
          _id: v.id("members"),
          name: v.string(),
          email: v.string(),
          unit: v.optional(v.string()),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const { userId } = await requireAssociationMember(ctx, args.associationId);

    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_association_and_user", (q) =>
        q.eq("associationId", args.associationId).eq("userId", userId),
      )
      .order("desc")
      .take(args.limit || 50);

    // Enrich with user and member information
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        const user = {
          _id: log.userId,
          name: "User", // Would need Clerk API call for real name
          email: "user@example.com", // Placeholder
        };
        const member = log.memberId ? await ctx.db.get(log.memberId) : null;
        return {
          _id: log._id,
          _creationTime: log._creationTime,
          associationId: log.associationId as Id<"associations">,
          userId: log.userId,
          memberId: log.memberId,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          description: log.description,
          metadata: log.metadata,
          timestamp: log.timestamp,
          user,
          member: member
            ? {
                _id: member._id,
                name: member.name,
                email: member.email,
                unit: member.unit,
              }
            : undefined,
        };
      }),
    );

    return enrichedLogs;
  },
});
