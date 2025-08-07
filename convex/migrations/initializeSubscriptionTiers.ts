import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Migration to initialize default subscription tiers and update existing ones with yearly pricing
export const initializeDefaultTiers = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();

    // Check if tiers already exist
    const existingTiers = await ctx.db.query("subscriptionTiers").collect();
    
    if (existingTiers.length === 0) {
      // Create default tiers for new installations
      const defaultTiers = [
        {
          name: "free",
          displayName: "Free",
          description: "Perfect for testing and small associations",
        maxMembers: 10,
        maxUnits: 25,
          price: 0,
          yearlyPrice: 0,
          currency: "gbp",
          billingInterval: "monthly" as const,
          stripePriceId: undefined,
          stripeYearlyPriceId: undefined,
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
          price: 12000, // £120.00 in pence
          yearlyPrice: 120000, // £1200.00 in pence (10 months worth, giving 2 months free)
          currency: "gbp",
          billingInterval: "monthly" as const,
          stripePriceId: "pro_monthly",
          stripeYearlyPriceId: "pro_yearly",
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
          maxLeaseholders: undefined, // No limit
          maxPlots: undefined, // No limit
          price: undefined, // Contact for pricing
          yearlyPrice: undefined, // Contact for pricing
          currency: "gbp",
          billingInterval: "monthly" as const,
          stripePriceId: undefined,
          stripeYearlyPriceId: undefined,
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
    } else {
      // Update existing tiers with yearly pricing data
      console.log("Updating existing subscription tiers with yearly pricing...");
      
      for (const tier of existingTiers) {
        const updates: any = { updatedAt: now };
        
        // Update based on tier name
        switch (tier.name) {
          case "free":
            updates.yearlyPrice = 0;
            updates.stripePriceId = undefined;
            updates.stripeYearlyPriceId = undefined;
            break;
          case "pro":
            updates.price = 12000; // £120.00 in pence
            updates.yearlyPrice = 120000; // £1200.00 in pence (10 months worth, giving 2 months free)
            updates.stripePriceId = "pro_monthly";
            updates.stripeYearlyPriceId = "pro_yearly";
            break;
          case "enterprise":
            updates.yearlyPrice = undefined; // Contact for pricing
            updates.stripePriceId = undefined;
            updates.stripeYearlyPriceId = undefined;
            break;
        }
        
        // Only update if yearlyPrice is not already set
        if (tier.yearlyPrice === undefined) {
          await ctx.db.patch(tier._id, updates);
          console.log(`Updated tier ${tier.name} with pricing data`);
        } else {
          console.log(`Tier ${tier.name} already has correct pricing, skipping`);
        }
      }
      
      console.log("Finished updating existing tiers with yearly pricing");
    }

    return null;
  },
}); 