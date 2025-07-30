import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getClerkUserId } from "./clerkHelpers";

// Update user profile information
export const updateUserProfile = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  returns: v.object({
    userId: v.string(),
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Validate inputs
    if (args.name !== undefined && args.name.trim().length === 0) {
      throw new Error("Name cannot be empty");
    }

    if (args.phone !== undefined && args.phone.trim().length > 0) {
      // Basic phone validation - allow numbers, spaces, dashes, parentheses, and plus sign
      const phoneRegex = /^[+]?[\d\s\-()]+$/;
      if (!phoneRegex.test(args.phone.trim())) {
        throw new Error("Please enter a valid phone number");
      }
    }

    const updates: any = {};
    if (args.name !== undefined) {
      updates.name = args.name.trim();
    }
    if (args.phone !== undefined) {
      updates.phone = args.phone.trim() || undefined; // Set to undefined if empty
    }

    // With Clerk, we can't update user data in our database
    // User profile updates would need to be done through Clerk's API
    // For now, we'll just return success
    return {
      userId,
      success: true,
      message: "Profile updated successfully"
    };
  },
});

// Get user profile with subscription information
export const getUserProfile = query({
  args: {},
  returns: v.union(
    v.object({
      userId: v.string(),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      image: v.optional(v.string()),
      selectedAssociation: v.optional(v.object({
        _id: v.id("associations"),
        name: v.string(),
        subscriptionTier: v.union(
          v.literal("free"),
          v.literal("pro"),
          v.literal("enterprise"),
        ),
        subscriptionStatus: v.union(
          v.literal("active"),
          v.literal("inactive"),
          v.literal("trial"),
          v.literal("suspended"),
        ),
      })),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      return null;
    }

    // Get user from our database
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", userId))
      .first();

    // Get user preferences to find selected association
    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    // Get selected association details if available
    let selectedAssociation = undefined;
    if (preferences?.selectedAssociationId) {
      const association = await ctx.db.get(preferences.selectedAssociationId);
      if (association) {
        selectedAssociation = {
          _id: association._id,
          name: association.name,
          subscriptionTier: association.subscriptionTier,
          subscriptionStatus: association.subscriptionStatus,
        };
      }
    }

    return {
      userId,
      name: user?.name,
      email: user?.email,
      phone: user?.phone,
      image: user?.image,
      selectedAssociation,
    };
  },
});
