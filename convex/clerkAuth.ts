import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./clerkHelpers";
import { api } from "./_generated/api";

export const loggedInUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    
    // Check if user exists in our users table
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
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
    
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
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
      tokenIdentifier: identity.tokenIdentifier,
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
    }
    
    return pendingInvitations.length;
  },
});
