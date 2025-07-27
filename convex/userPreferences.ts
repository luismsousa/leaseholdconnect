import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getClerkUserId } from "./clerkHelpers";

// Get user preferences
export const getUserPreferences = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      return null;
    }

    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return preferences;
  },
});

// Set selected association
export const setSelectedAssociation = mutation({
  args: {
    associationId: v.optional(v.id("associations")),
  },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Check if user is a PaaS admin
    const paasAdmin = await ctx.db
      .query("paasAdmins")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    // Verify user has access to this association if provided (skip for PaaS admins)
    if (args.associationId && !paasAdmin) {
      const membership = await ctx.db
        .query("associationMembers")
        .withIndex("by_association_and_user", (q) => 
          q.eq("associationId", args.associationId!).eq("userId", userId)
        )
        .filter((q) => q.eq(q.field("status"), "active"))
        .first();

      if (!membership) {
        throw new Error("Not authorized for this association");
      }
    }

    const existingPreferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingPreferences) {
      await ctx.db.patch(existingPreferences._id, {
        selectedAssociationId: args.associationId,
        updatedAt: Date.now(),
      });
      return existingPreferences._id;
    } else {
      const preferencesId = await ctx.db.insert("userPreferences", {
        userId: userId,
        selectedAssociationId: args.associationId,
        updatedAt: Date.now(),
      });
      return preferencesId;
    }
  },
});

// Update user preferences
export const updatePreferences = mutation({
  args: {
    preferences: v.object({
      theme: v.optional(v.string()),
      notifications: v.optional(v.boolean()),
      language: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const existingPreferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingPreferences) {
      await ctx.db.patch(existingPreferences._id, {
        preferences: args.preferences,
        updatedAt: Date.now(),
      });
      return existingPreferences._id;
    } else {
      const preferencesId = await ctx.db.insert("userPreferences", {
        userId: userId,
        preferences: args.preferences,
        updatedAt: Date.now(),
      });
      return preferencesId;
    }
  },
});
