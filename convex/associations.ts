import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { getClerkUserId, requireClerkAuth } from "./clerkHelpers";
import { Id } from "./_generated/dataModel";

// Get current user's associations
export const getUserAssociations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      return [];
    }

    const memberships = await ctx.db
      .query("associationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const associations = await Promise.all(
      memberships.map(async (membership) => {
        const association = await ctx.db.get(membership.associationId);
        return association ? { ...association, role: membership.role } : null;
      })
    );

    return associations.filter(Boolean);
  },
});

// Get association details (internal, no auth required)
export const getAssociationInternal = internalQuery({
  args: {
    associationId: v.id("associations"),
  },
  handler: async (ctx, args) => {
    const association = await ctx.db.get(args.associationId);
    if (!association) {
      return null;
    }
    return association;
  },
});

// Get association details (requires authentication)
export const getAssociation = query({
  args: { associationId: v.id("associations") },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is a member of this association
    const membership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", args.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error("Not authorized to view this association");
    }

    const association = await ctx.db.get(args.associationId);
    if (!association) {
      throw new Error("Association not found");
    }

    return { ...association, role: membership.role };
  },
});

// Create new association
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();

    // Create the association
    const associationId = await ctx.db.insert("associations", {
      ...args,
      subscriptionTier: "free",
      subscriptionStatus: "trial",
      trialEndsAt: now + (30 * 24 * 60 * 60 * 1000), // 30 days trial
      settings: {
        allowSelfRegistration: false,
        requireAdminApproval: true,
        maxMembers: 50, // Free tier limit
        maxUnits: 25,   // Free tier limit
      },
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    });

    // Add creator as owner
    await ctx.db.insert("associationMembers", {
      associationId,
      userId,
      role: "owner",
      status: "active",
      joinedAt: now,
    });

    // Get user identity to create member record
    const identity = await ctx.auth.getUserIdentity();
    if (identity?.email) {
      // Create member record for the creator
      await ctx.db.insert("members", {
        associationId,
        email: identity.email,
        name: identity.name || identity.email.split('@')[0],
        role: "admin", // Owner gets admin role in members table
        status: "active",
        joinedAt: now,
      });
    }

    return associationId;
  },
});

// Update association
export const update = mutation({
  args: {
    associationId: v.id("associations"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    website: v.optional(v.string()),
    settings: v.optional(v.object({
      allowSelfRegistration: v.boolean(),
      requireAdminApproval: v.boolean(),
      maxMembers: v.optional(v.number()),
      maxUnits: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is owner or admin
    const membership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", args.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("Not authorized to update this association");
    }

    const { associationId, ...updates } = args;
    await ctx.db.patch(associationId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return associationId;
  },
});

// Accept invitation
export const acceptInvitation = mutation({
  args: {
    associationId: v.id("associations"),
  },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const membership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", args.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "invited"))
      .first();

    if (!membership) {
      throw new Error("No invitation found");
    }

    await ctx.db.patch(membership._id, {
      status: "active",
      joinedAt: Date.now(),
    });

    return membership._id;
  },
});

// Get association members
export const getMembers = query({
  args: { associationId: v.id("associations") },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is a member of this association
    const membership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", args.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error("Not authorized to view members");
    }

    const memberships = await ctx.db
      .query("associationMembers")
      .withIndex("by_association", (q) => q.eq("associationId", args.associationId))
      .collect();

    const members = await Promise.all(
      memberships.map(async (membership) => {
        // With Clerk, we can't get user details from our DB
        // Return membership with placeholder user data
        return {
          ...membership,
          user: {
            _id: membership.userId,
            name: "User", // Would need Clerk API call for real name
            email: "user@example.com" // Placeholder
          }
        };
      })
    );

    return members.filter(Boolean);
  },
});

// Remove member from association
export const removeMember = mutation({
  args: {
    associationId: v.id("associations"),
    membershipId: v.id("associationMembers"),
  },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is owner or admin
    const userMembership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", args.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!userMembership || (userMembership.role !== "owner" && userMembership.role !== "admin")) {
      throw new Error("Not authorized to remove members");
    }

    const membershipToRemove = await ctx.db.get(args.membershipId);
    if (!membershipToRemove || membershipToRemove.associationId !== args.associationId) {
      throw new Error("Membership not found");
    }

    // Can't remove the owner
    if (membershipToRemove.role === "owner") {
      throw new Error("Cannot remove the association owner");
    }

    await ctx.db.delete(args.membershipId);
    return args.membershipId;
  },
});

// Get user's current association context
export const getCurrentAssociation = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      return null;
    }

    // For now, return the first active association
    // In a real app, you'd store the user's selected association in a separate table or session
    const membership = await ctx.db
      .query("associationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      return null;
    }

    const association = await ctx.db.get(membership.associationId);
    return association ? { ...association, role: membership.role } : null;
  },
});
