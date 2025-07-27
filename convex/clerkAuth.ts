import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./clerkHelpers";
import { api, internal } from "./_generated/api";

export const loggedInUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    
    // Extract just the user ID part from tokenIdentifier
    const parts = identity.tokenIdentifier.split('|');
    const tokenIdentifier = parts.length > 1 ? parts[1] : identity.tokenIdentifier;
    
    // Check if user exists in our users table
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", tokenIdentifier)
      )
      .unique();
    
    if (existingUser) {
      return existingUser;
    }
    
    // Return null for queries, user will be created on first mutation
    return null;
  },
});

export const getCurrentUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      image: user.image,
    };
  },
});

export const updateUserProfile = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User not authenticated");
    }
    
    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.email !== undefined) updates.email = args.email;
    
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(user._id, updates);
    }
    
    return await ctx.db.get(user._id);
  },
});

export const createUserIfNotExists = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("User not authenticated");
    }
    
    // Extract just the user ID part from tokenIdentifier
    const parts = identity.tokenIdentifier.split('|');
    const tokenIdentifier = parts.length > 1 ? parts[1] : identity.tokenIdentifier;
    
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", tokenIdentifier)
      )
      .unique();
    
    if (existingUser) {
      return existingUser;
    }
    
    // Create new user
    const userId = await ctx.db.insert("users", {
      name: identity.name ?? identity.email ?? "Unknown User",
      email: identity.email,
      image: identity.pictureUrl,
      tokenIdentifier: tokenIdentifier,
      isAnonymous: false,
    });
    
    return await ctx.db.get(userId);
  },
});

export const checkPendingInvitations = mutation({
  args: {},
  handler: async (ctx) => {
    // First ensure user exists
    const user: any = await ctx.runMutation(api.clerkAuth.createUserIfNotExists, {});
    if (!user || !user.email) return 0;
    
    // Check for pending member invitations
    const pendingInvitations = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", user.email))
      .filter((q) => q.eq(q.field("status"), "invited"))
      .collect();
    
    // Auto-accept invitations and update status
    for (const invitation of pendingInvitations) {
      await ctx.db.patch(invitation._id, {
        status: "active",
        joinedAt: Date.now(),
      });
      
      // Create associationMembers record for the user
      // Extract user ID from tokenIdentifier
      const parts = user.tokenIdentifier.split('|');
      const userId = parts.length > 1 ? parts[1] : user.tokenIdentifier;
      
      // Check if associationMembers record already exists
      const existingMembership = await ctx.db
        .query("associationMembers")
        .withIndex("by_association_and_user", (q) => 
          q.eq("associationId", invitation.associationId).eq("userId", userId)
        )
        .first();
      
      if (!existingMembership) {
        // Create associationMembers record
        await ctx.db.insert("associationMembers", {
          associationId: invitation.associationId,
          userId: userId,
          role: invitation.role === "admin" ? "admin" : "member",
          status: "active",
          joinedAt: Date.now(),
        });
      }
      
      // Log the acceptance
      await ctx.db.insert("auditLogs", {
        associationId: invitation.associationId,
        userId: user.tokenIdentifier,
        memberId: invitation._id,
        action: "member_invitation_accepted",
        entityType: "member",
        entityId: invitation._id,
        description: `${user.name} accepted invitation to join association`,
        timestamp: Date.now(),
      });

      // Get association details for welcome email
      const association = await ctx.db.get(invitation.associationId);
      
      // Send welcome email
      try {
        await ctx.scheduler.runAfter(0, internal.emails.sendWelcomeEmail, {
          email: user.email,
          name: user.name,
          associationId: invitation.associationId,
        });
      } catch (error) {
        console.error("Failed to schedule welcome email:", error);
        // Don't throw error to avoid breaking the invitation acceptance process
      }
    }
    
    return pendingInvitations.length;
  },
});
