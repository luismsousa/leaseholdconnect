import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getClerkUserId } from "./clerkHelpers";

// Update user profile information
export const updateUserProfile = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
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
      const phoneRegex = /^[\+]?[\d\s\-\(\)]+$/;
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
    return userId;
  },
});
