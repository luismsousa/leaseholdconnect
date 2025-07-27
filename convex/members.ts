import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getClerkUserId, requireClerkAuth } from "./clerkHelpers";
import { Id } from "./_generated/dataModel";
import { internal, api } from "./_generated/api";

// Get current member for a specific association
export const getCurrentMember = query({
  args: { associationId: v.id("associations") },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      return null;
    }

    // Check if user is a member of this association
    const associationMembership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", args.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!associationMembership) {
      return null;
    }

    // Get user identity from Clerk
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      return null;
    }

    // Find the member record for this association
    const member = await ctx.db
      .query("members")
      .withIndex("by_association_and_email", (q) => 
        q.eq("associationId", args.associationId).eq("email", identity.email || "")
      )
      .first();

    return member;
  },
});

// Bootstrap member record when user first accesses an association
export const bootstrap = mutation({
  args: { associationId: v.id("associations") },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is a member of this association
    const associationMembership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", args.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!associationMembership) {
      return null;
    }

    // Get user identity from Clerk
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      return null;
    }

    // Check if member record already exists
    const existingMember = await ctx.db
      .query("members")
      .withIndex("by_association_and_email", (q) => 
        q.eq("associationId", args.associationId).eq("email", identity.email || "")
      )
      .first();

    if (existingMember) {
      return existingMember._id;
    }

    // Create member record
    const memberId = await ctx.db.insert("members", {
      associationId: args.associationId,
      email: identity.email || "",
      name: identity.name || identity.email || "User",
      role: associationMembership.role === "owner" ? "admin" : "member",
      status: "active",
      joinedAt: Date.now(),
    });

    return memberId;
  },
});

// List all members for an association
export const list = query({
  args: { associationId: v.id("associations") },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is a member of this association
    const associationMembership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", args.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!associationMembership) {
      throw new Error("Not authorized");
    }

    return await ctx.db
      .query("members")
      .withIndex("by_association", (q) => q.eq("associationId", args.associationId))
      .collect();
  },
});

// List members by unit
export const listByUnit = query({
  args: { 
    associationId: v.id("associations"),
    unit: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is a member of this association
    const associationMembership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", args.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!associationMembership) {
      throw new Error("Not authorized");
    }

    return await ctx.db
      .query("members")
      .withIndex("by_association_and_unit", (q) => 
        q.eq("associationId", args.associationId).eq("unit", args.unit)
      )
      .collect();
  },
});

// Create new member
export const create = mutation({
  args: {
    associationId: v.id("associations"),
    email: v.string(),
    name: v.string(),
    unit: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is admin of this association
    const associationMembership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", args.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!associationMembership || (associationMembership.role !== "owner" && associationMembership.role !== "admin")) {
      throw new Error("Not authorized");
    }

    // Check if member already exists
    const existingMember = await ctx.db
      .query("members")
      .withIndex("by_association_and_email", (q) => 
        q.eq("associationId", args.associationId).eq("email", args.email)
      )
      .first();

    if (existingMember) {
      throw new Error("Member with this email already exists");
    }

    // Validate unit if provided
    if (args.unit) {
      const unit = await ctx.db
        .query("units")
        .withIndex("by_association_and_name", (q) => 
          q.eq("associationId", args.associationId).eq("name", args.unit!)
        )
        .first();

      if (!unit) {
        throw new Error("Unit not found");
      }
    }

    const memberId = await ctx.db.insert("members", {
      ...args,
      status: "invited",
      invitedBy: userId,
      invitedAt: Date.now(),
    });

    // Log the audit event
    try {
      await ctx.runMutation(api.audit.log, {
        associationId: args.associationId,
        userId,
        memberId,
        action: "member_invited",
        entityType: "member",
        entityId: memberId,
        description: `Invited ${args.name} (${args.email}) to join the association`,
        metadata: { email: args.email, name: args.name, unit: args.unit, role: args.role },
      });
    } catch (error) {
      console.error("Failed to log audit event:", error);
    }

    // Get the inviter's information from Clerk identity
    const identity = await ctx.auth.getUserIdentity();
    const inviterName = identity?.name || identity?.email || "Administrator";

    // Send invitation email
    try {
      await ctx.scheduler.runAfter(0, internal.emails.sendInvitationEmail, {
        email: args.email,
        name: args.name,
        inviterName,
        unit: args.unit,
        associationId: args.associationId,
      });
    } catch (error) {
      console.error("Failed to schedule invitation email:", error);
      // Don't throw error to avoid breaking the member creation process
    }

    return memberId;
  },
});

// Update member
export const update = mutation({
  args: {
    id: v.id("members"),
    name: v.optional(v.string()),
    unit: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("member"))),
  },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const member = await ctx.db.get(args.id);
    if (!member) {
      throw new Error("Member not found");
    }

    // Check if user is admin of this association
    const associationMembership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", member.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!associationMembership || (associationMembership.role !== "owner" && associationMembership.role !== "admin")) {
      throw new Error("Not authorized");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
  },
});

// Deactivate member
export const deactivate = mutation({
  args: {
    id: v.id("members"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const member = await ctx.db.get(args.id);
    if (!member) {
      throw new Error("Member not found");
    }

    // Check if user is admin of this association
    const associationMembership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", member.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!associationMembership || (associationMembership.role !== "owner" && associationMembership.role !== "admin")) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.id, {
      status: "inactive",
      deactivatedAt: Date.now(),
      deactivatedBy: userId,
      deactivationReason: args.reason,
    });

    return args.id;
  },
});

// Reactivate member
export const reactivate = mutation({
  args: {
    id: v.id("members"),
  },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const member = await ctx.db.get(args.id);
    if (!member) {
      throw new Error("Member not found");
    }

    // Check if user is admin of this association
    const associationMembership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", member.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!associationMembership || (associationMembership.role !== "owner" && associationMembership.role !== "admin")) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.id, {
      status: "active",
      reactivatedAt: Date.now(),
      reactivatedBy: userId,
      deactivatedAt: undefined,
      deactivatedBy: undefined,
      deactivationReason: undefined,
    });

    return args.id;
  },
});

// Delete member
export const remove = mutation({
  args: {
    id: v.id("members"),
  },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const member = await ctx.db.get(args.id);
    if (!member) {
      throw new Error("Member not found");
    }

    // Check if user is admin of this association
    const associationMembership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", member.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!associationMembership || (associationMembership.role !== "owner" && associationMembership.role !== "admin")) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});
