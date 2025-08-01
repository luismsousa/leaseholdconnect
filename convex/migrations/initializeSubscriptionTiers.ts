import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Migration to initialize default subscription tiers
export const initializeDefaultTiers = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();

    // Check if tiers already exist
    const existingTiers = await ctx.db.query("subscriptionTiers").collect();
    if (existingTiers.length > 0) {
      console.log("Subscription tiers already exist, skipping initialization");
      return null;
    }

    // Create default tiers
    const defaultTiers = [
      {
        name: "free",
        displayName: "Free",
        description: "Perfect for testing and small associations",
        maxMembers: 10,
        maxUnits: 25,
        price: 0,
        currency: "gbp",
        billingInterval: "monthly" as const,
        features: [
          "Meeting management",
          "Voting topics", 
          "Document storage",
          "Member management"
        ],
        sortOrder: 1,
      },
      {
        name: "pro",
        displayName: "Pro",
        description: "For associations of any size",
        maxMembers: 50,
        maxUnits: 100,
        price: 2900, // £29.00 in pence
        currency: "gbp",
        billingInterval: "monthly" as const,
        features: [
          "All Free features",
          "Advanced meeting features",
          "Enhanced voting systems",
          "Priority support"
        ],
        sortOrder: 2,
      },
      {
        name: "enterprise",
        displayName: "Enterprise",
        description: "For management companies managing multiple sites",
        maxMembers: undefined, // No limit
        maxUnits: undefined, // No limit
        price: undefined, // Contact for pricing
        currency: "gbp",
        billingInterval: "monthly" as const,
        features: [
          "Multi-site management",
          "All Pro features",
          "Custom integrations",
          "Dedicated account manager",
          "White-label options"
        ],
        sortOrder: 3,
      },
    ];

    for (const tier of defaultTiers) {
      await ctx.db.insert("subscriptionTiers", {
        ...tier,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    console.log("Default subscription tiers initialized");
    return null;
  },
}); 