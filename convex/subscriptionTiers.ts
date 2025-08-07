import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { getClerkUserId } from "./clerkHelpers";

// Get all active subscription tiers (public - for landing page)
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("subscriptionTiers"),
      _creationTime: v.number(),
      name: v.string(),
      displayName: v.string(),
      description: v.optional(v.string()),
      maxMembers: v.optional(v.number()),
      maxUnits: v.optional(v.number()),
      price: v.optional(v.number()),
      yearlyPrice: v.optional(v.number()),
      currency: v.optional(v.string()),
      billingInterval: v.optional(v.union(v.literal("monthly"), v.literal("yearly"))),
      stripePriceId: v.optional(v.string()),
      stripeYearlyPriceId: v.optional(v.string()),
      features: v.optional(v.array(v.string())),
      isActive: v.boolean(),
      sortOrder: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("subscriptionTiers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .order("asc")
      .collect();
  },
});

// Get all active subscription tiers (authenticated users only)
export const listAuthenticated = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("subscriptionTiers"),
      _creationTime: v.number(),
      name: v.string(),
      displayName: v.string(),
      description: v.optional(v.string()),
      maxMembers: v.optional(v.number()),
      maxUnits: v.optional(v.number()),
      price: v.optional(v.number()),
      yearlyPrice: v.optional(v.number()),
      currency: v.optional(v.string()),
      billingInterval: v.optional(v.union(v.literal("monthly"), v.literal("yearly"))),
      stripePriceId: v.optional(v.string()),
      stripeYearlyPriceId: v.optional(v.string()),
      features: v.optional(v.array(v.string())),
      isActive: v.boolean(),
      sortOrder: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    // Require authentication
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    return await ctx.db
      .query("subscriptionTiers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .order("asc")
      .collect();
  },
});

// Get subscription tier by name (authenticated users only)
export const getByName = query({
  args: { name: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("subscriptionTiers"),
      _creationTime: v.number(),
      name: v.string(),
      displayName: v.string(),
      description: v.optional(v.string()),
      maxMembers: v.optional(v.number()),
      maxUnits: v.optional(v.number()),
      price: v.optional(v.number()),
      yearlyPrice: v.optional(v.number()),
      currency: v.optional(v.string()),
      billingInterval: v.optional(v.union(v.literal("monthly"), v.literal("yearly"))),
      stripePriceId: v.optional(v.string()),
      stripeYearlyPriceId: v.optional(v.string()),
      features: v.optional(v.array(v.string())),
      isActive: v.boolean(),
      sortOrder: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Require authentication
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    return await ctx.db
      .query("subscriptionTiers")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
  },
});

// Get subscription tier limits (internal function)
export const getTierLimits = internalQuery({
  args: { tierName: v.string() },
  returns: v.object({
    maxMembers: v.optional(v.number()),
    maxUnits: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const tier = await ctx.db
      .query("subscriptionTiers")
      .withIndex("by_name", (q) => q.eq("name", args.tierName))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!tier) {
      // Return default limits if tier not found
      return {
        maxMembers: args.tierName === "free" ? 10 : args.tierName === "pro" ? 50 : undefined,
        maxUnits: args.tierName === "free" ? 25 : args.tierName === "pro" ? 100 : undefined,
      };
    }

    return {
      maxMembers: tier.maxMembers,
      maxUnits: tier.maxUnits,
    };
  },
});

// Create subscription tier (admin only)
export const create = mutation({
  args: {
    name: v.string(),
    displayName: v.string(),
    description: v.optional(v.string()),
    maxMembers: v.optional(v.number()),
    maxUnits: v.optional(v.number()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    billingInterval: v.optional(v.union(v.literal("monthly"), v.literal("yearly"))),
    stripePriceId: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
    sortOrder: v.number(),
  },
  returns: v.id("subscriptionTiers"),
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // TODO: Add admin check here when admin system is implemented
    // For now, allow any authenticated user to create tiers

    const now = Date.now();
    return await ctx.db.insert("subscriptionTiers", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update subscription tier (admin only)
export const update = mutation({
  args: {
    id: v.id("subscriptionTiers"),
    displayName: v.optional(v.string()),
    description: v.optional(v.string()),
    maxMembers: v.optional(v.number()),
    maxUnits: v.optional(v.number()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    billingInterval: v.optional(v.union(v.literal("monthly"), v.literal("yearly"))),
    stripePriceId: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
    sortOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.id("subscriptionTiers"),
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // TODO: Add admin check here when admin system is implemented

    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

// Delete subscription tier (admin only)
export const remove = mutation({
  args: { id: v.id("subscriptionTiers") },
  returns: v.id("subscriptionTiers"),
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // TODO: Add admin check here when admin system is implemented

    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Initialize default subscription tiers
export const initializeDefaultTiers = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

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

// Get all subscription tiers (internal function for pricing sync)
export const listAllTiers = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("subscriptionTiers"),
      name: v.string(),
      displayName: v.string(),
      price: v.optional(v.number()),
      yearlyPrice: v.optional(v.number()),
      currency: v.optional(v.string()),
      stripePriceId: v.optional(v.string()),
      stripeYearlyPriceId: v.optional(v.string()),
      isActive: v.boolean(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("subscriptionTiers")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Update tier pricing (internal function for pricing sync)
export const updateTierPricing = internalMutation({
  args: {
    tierId: v.id("subscriptionTiers"),
    updates: v.object({
      price: v.optional(v.number()),
      yearlyPrice: v.optional(v.number()),
      currency: v.optional(v.string()),
      stripePriceId: v.optional(v.string()),
      stripeYearlyPriceId: v.optional(v.string()),
      updatedAt: v.number(),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tierId, args.updates);
    return null;
  },
}); 

 