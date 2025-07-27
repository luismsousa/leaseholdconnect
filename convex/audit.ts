import { v } from "convex/values";
import { query, mutation, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required");
  }
  return userId;
}

async function getCurrentMember(ctx: QueryCtx | MutationCtx) {
  const userId = await requireAuth(ctx);
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const member = await ctx.db
    .query("members")
    .withIndex("by_email", (q) => q.eq("email", user.email || ""))
    .unique();
  
  if (!member) {
    throw new Error("Member not found");
  }

  return { userId, user, member };
}

// Internal function to log audit events
export const logAuditEvent = internalMutation({
  args: {
    userId: v.id("users"),
    memberId: v.optional(v.id("members")),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    description: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLogs", {
      userId: args.userId,
      memberId: args.memberId,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      details: {
        description: args.description,
        metadata: args.metadata,
      },
      timestamp: Date.now(),
    });
  },
});

// Query to get audit logs with filtering
export const getAuditLogs = query({
  args: {
    action: v.optional(v.string()),
    entityType: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { member } = await getCurrentMember(ctx);
    
    let logs;
    
    // Apply filters based on user role
    if (member.role !== "admin") {
      // Non-admin users can only see their own audit logs
      logs = await ctx.db
        .query("auditLogs")
        .withIndex("by_member", (q) => q.eq("memberId", member._id))
        .order("desc")
        .collect();
    } else {
      logs = await ctx.db.query("auditLogs").order("desc").collect();
    }
    
    // Apply additional filters
    if (args.action) {
      logs = logs.filter(log => log.action === args.action);
    }
    
    if (args.entityType) {
      logs = logs.filter(log => log.entityType === args.entityType);
    }
    
    if (args.startDate) {
      logs = logs.filter(log => log.timestamp >= args.startDate!);
    }
    
    if (args.endDate) {
      logs = logs.filter(log => log.timestamp <= args.endDate!);
    }
    
    // Apply limit
    if (args.limit) {
      logs = logs.slice(0, args.limit);
    }
    
    // Enrich logs with user and member information
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        const user = await ctx.db.get(log.userId);
        const logMember = log.memberId ? await ctx.db.get(log.memberId) : null;
        
        return {
          ...log,
          user: user ? { name: user.name, email: user.email } : null,
          member: logMember ? { name: logMember.name, email: logMember.email, unit: logMember.unit } : null,
        };
      })
    );
    
    return enrichedLogs;
  },
});

// Query to get audit statistics
export const getAuditStats = query({
  args: {
    days: v.optional(v.number()), // Number of days to look back (default: 30)
  },
  handler: async (ctx, args) => {
    const { member } = await getCurrentMember(ctx);
    
    if (member.role !== "admin") {
      throw new Error("Admin access required");
    }
    
    const days = args.days || 30;
    const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", startTime))
      .collect();
    
    // Calculate statistics
    const stats = {
      totalEvents: logs.length,
      uniqueUsers: new Set(logs.map(log => log.userId)).size,
      eventsByAction: {} as Record<string, number>,
      eventsByEntityType: {} as Record<string, number>,
      eventsByDay: {} as Record<string, number>,
      topUsers: {} as Record<string, { count: number; name: string; email: string }>,
    };
    
    // Process logs for statistics
    for (const log of logs) {
      // Count by action
      stats.eventsByAction[log.action] = (stats.eventsByAction[log.action] || 0) + 1;
      
      // Count by entity type
      stats.eventsByEntityType[log.entityType] = (stats.eventsByEntityType[log.entityType] || 0) + 1;
      
      // Count by day
      const day = new Date(log.timestamp).toISOString().split('T')[0];
      stats.eventsByDay[day] = (stats.eventsByDay[day] || 0) + 1;
      
      // Count by user
      const user = await ctx.db.get(log.userId);
      if (user) {
        const userKey = log.userId;
        if (!stats.topUsers[userKey]) {
          stats.topUsers[userKey] = { count: 0, name: user.name || "Unknown", email: user.email || "Unknown" };
        }
        stats.topUsers[userKey].count++;
      }
    }
    
    return stats;
  },
});

// Query to get available filter options
export const getAuditFilters = query({
  args: {},
  handler: async (ctx) => {
    const { member } = await getCurrentMember(ctx);
    
    let logs;
    
    if (member.role !== "admin") {
      logs = await ctx.db
        .query("auditLogs")
        .withIndex("by_member", (q) => q.eq("memberId", member._id))
        .collect();
    } else {
      logs = await ctx.db.query("auditLogs").collect();
    }
    
    const actions = [...new Set(logs.map(log => log.action))].sort();
    const entityTypes = [...new Set(logs.map(log => log.entityType))].sort();
    
    return {
      actions,
      entityTypes,
    };
  },
});
