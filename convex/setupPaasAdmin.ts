import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getClerkUserId } from "./clerkHelpers";

// One-time setup function to make the current user a PaaS admin
// This should only be used during initial setup
export const setupInitialPaasAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Check if any PaaS admins exist
    const existingAdmins = await ctx.db.query("paasAdmins").collect();
    if (existingAdmins.length > 0) {
      throw new Error("PaaS admins already exist. Use the regular admin creation process.");
    }

    // Create the first PaaS admin
    const adminId = await ctx.db.insert("paasAdmins", {
      userId: userId,
      role: "super_admin",
      permissions: [
        "manage_associations",
        "manage_subscriptions", 
        "manage_admins",
        "view_analytics",
        "suspend_associations",
        "billing_access"
      ],
      createdAt: Date.now(),
      isActive: true,
    });

    return adminId;
  },
});
