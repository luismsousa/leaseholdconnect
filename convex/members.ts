import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required");
  }
  return userId;
}

async function getCurrentMemberInternal(ctx: QueryCtx | MutationCtx) {
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

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const { userId, user, member } = await getCurrentMemberInternal(ctx);
  
  if (member.role !== "admin") {
    throw new Error("Admin access required");
  }
  
  return { userId, user, member };
}

export const getCurrentMember = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", user.email || ""))
      .unique();
    
    return member;
  },
});

export const listMembers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("members").order("asc").collect();
  },
});

export const inviteMember = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    unit: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, member: currentMember } = await requireAdmin(ctx);
    
    // Check if member already exists
    const existingMember = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    
    if (existingMember) {
      throw new Error("A member with this email already exists");
    }

    // Create the member
    const memberId = await ctx.db.insert("members", {
      email: args.email,
      name: args.name,
      unit: args.unit,
      role: "member",
      status: "invited",
      invitedBy: userId,
      invitedAt: Date.now(),
    });

    // Log audit event
    await ctx.runMutation(internal.audit.logAuditEvent, {
      userId,
      memberId: currentMember._id,
      action: "member_invited",
      entityType: "member",
      entityId: memberId,
      description: `Invited ${args.name} (${args.email})${args.unit ? ` to unit ${args.unit}` : ""}`,
      metadata: {
        invitedEmail: args.email,
        invitedName: args.name,
        assignedUnit: args.unit,
      },
    });

    return await ctx.db.get(memberId);
  },
});

export const updateMemberRole = mutation({
  args: {
    memberId: v.id("members"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const { userId, member: currentMember } = await requireAdmin(ctx);
    
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    const oldRole = member.role;
    
    await ctx.db.patch(args.memberId, {
      role: args.role,
    });

    // Log audit event
    await ctx.runMutation(internal.audit.logAuditEvent, {
      userId,
      memberId: currentMember._id,
      action: "member_role_updated",
      entityType: "member",
      entityId: args.memberId,
      description: `Changed ${member.name}'s role from ${oldRole} to ${args.role}`,
      metadata: {
        targetMember: member.name,
        targetEmail: member.email,
        oldRole,
        newRole: args.role,
      },
    });
  },
});

export const updateMemberStatus = mutation({
  args: {
    memberId: v.id("members"),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  handler: async (ctx, args) => {
    const { userId, member: currentMember } = await requireAdmin(ctx);
    
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    const oldStatus = member.status;
    
    await ctx.db.patch(args.memberId, {
      status: args.status,
    });

    // Log audit event
    await ctx.runMutation(internal.audit.logAuditEvent, {
      userId,
      memberId: currentMember._id,
      action: "member_status_updated",
      entityType: "member",
      entityId: args.memberId,
      description: `Changed ${member.name}'s status from ${oldStatus} to ${args.status}`,
      metadata: {
        targetMember: member.name,
        targetEmail: member.email,
        oldStatus,
        newStatus: args.status,
      },
    });
  },
});

export const bootstrap = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");
    
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const existingMember = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", user.email || ""))
      .unique();
    
    if (existingMember) return existingMember;

    const memberCount = await ctx.db.query("members").collect();
    const isFirstUser = memberCount.length === 0;

    const memberId = await ctx.db.insert("members", {
      email: user.email || "",
      name: user.name || "Unknown User",
      role: isFirstUser ? "admin" : "member",
      status: isFirstUser ? "active" : "invited",
      joinedAt: Date.now(),
    });

    return await ctx.db.get(memberId);
  },
});
