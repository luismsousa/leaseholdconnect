import { mutation, internalMutation, internalAction, action } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./clerkHelpers";
import { internal } from "./_generated/api";
import Stripe from "stripe";

// Helper function to create Stripe instance
function createStripeInstance(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }
  return new Stripe(apiKey, {
    apiVersion: "2025-07-30.basil",
  });
}

// Helper function to get price ID using lookup key
async function getPriceIdFromLookupKey(lookupKey: string): Promise<string> {
  try {
    const stripe = createStripeInstance();
    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
    });

    if (prices.data.length === 0) {
      throw new Error(`No active price found for lookup key: ${lookupKey}`);
    }

    return prices.data[0].id;
  } catch (error) {
    console.error(`Error fetching price for lookup key ${lookupKey}:`, error);
    throw new Error(`Failed to fetch price for lookup key: ${lookupKey}`);
  }
}

// Helper function to get price ID based on tier and billing interval
async function getPriceIdForTierAndBillingInterval(tier: string, billingInterval: string): Promise<string> {
  let lookupKey: string;
  
  switch (tier.toLowerCase()) {
    case "pro":
      lookupKey = billingInterval === "yearly" ? "pro_yearly" : "pro_monthly";
      break;
    case "enterprise":
      lookupKey = billingInterval === "yearly" ? "enterprise_yearly" : "enterprise_monthly";
      break;
    default:
      throw new Error(`Unsupported subscription tier: ${tier}`);
  }

  return await getPriceIdFromLookupKey(lookupKey);
}

// Helper function to get detailed price information from Stripe
async function getPriceDetailsFromStripe(lookupKey: string): Promise<{
  id: string;
  unitAmount: number | null;
  currency: string;
  recurring: { interval: string; intervalCount?: number } | null;
  active: boolean;
} | null> {
  try {
    const stripe = createStripeInstance();
    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
    });

    if (prices.data.length === 0) {
      console.warn(`No active price found for lookup key: ${lookupKey}`);
      return null;
    }

    const price = prices.data[0];
    return {
      id: price.id,
      unitAmount: price.unit_amount,
      currency: price.currency,
      recurring: price.recurring,
      active: price.active,
    };
  } catch (error) {
    console.error(`Error fetching price details for lookup key ${lookupKey}:`, error);
    return null;
  }
}

// Internal action to sync pricing from Stripe to database
export const syncPricingFromStripe = internalAction({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    updatedTiers: v.array(v.string()),
  }),
  handler: async (ctx): Promise<{ success: boolean; message: string; updatedTiers: string[] }> => {
    try {
      const updatedTiers: string[] = [];
      
      // Get all subscription tiers from database
      const tiers = await ctx.runQuery(internal.subscriptionTiers.listAllTiers);
      
      for (const tier of tiers) {
        let updated = false;
        const updates: any = {};
        
        // Fetch monthly pricing if tier has a monthly lookup key
        if (tier.name === "pro" || tier.name === "enterprise") {
          const monthlyLookupKey = `${tier.name}_monthly`;
          const monthlyPriceDetails = await getPriceDetailsFromStripe(monthlyLookupKey);
          
          if (monthlyPriceDetails && monthlyPriceDetails.unitAmount) {
            updates.price = monthlyPriceDetails.unitAmount;
            updates.currency = monthlyPriceDetails.currency;
            updates.stripePriceId = monthlyPriceDetails.id;
            updated = true;
          }
          
          // Fetch yearly pricing if tier has a yearly lookup key
          const yearlyLookupKey = `${tier.name}_yearly`;
          const yearlyPriceDetails = await getPriceDetailsFromStripe(yearlyLookupKey);
          
          if (yearlyPriceDetails && yearlyPriceDetails.unitAmount) {
            updates.yearlyPrice = yearlyPriceDetails.unitAmount;
            updates.stripeYearlyPriceId = yearlyPriceDetails.id;
            updated = true;
          }
        }
        
        // Update the tier if we have new pricing information
        if (updated) {
          await ctx.runMutation(internal.subscriptionTiers.updateTierPricing, {
            tierId: tier._id,
            updates: {
              ...updates,
              updatedAt: Date.now(),
            },
          });
          updatedTiers.push(tier.name);
        }
      }
      
      if (updatedTiers.length > 0) {
        return {
          success: true,
          message: `Successfully synced pricing for ${updatedTiers.length} tiers from Stripe`,
          updatedTiers,
        };
      } else {
        return {
          success: true,
          message: "No pricing updates needed - all tiers are up to date",
          updatedTiers: [],
        };
      }
    } catch (error) {
      console.error("Error syncing pricing from Stripe:", error);
      return {
        success: false,
        message: `Failed to sync pricing from Stripe: ${error instanceof Error ? error.message : 'Unknown error'}`,
        updatedTiers: [],
      };
    }
  },
});

// Public action to create checkout session
export const createCheckoutSession = action({
  args: {
    associationId: v.id("associations"),
    tier: v.union(v.literal("pro"), v.literal("enterprise")),
    billingInterval: v.union(v.literal("monthly"), v.literal("yearly")),
    successUrl: v.string(),
    cancelUrl: v.string(),
    userId: v.string(),
    userEmail: v.string(),
  },
  returns: v.object({
    url: v.string(),
  }),
  handler: async (ctx, args): Promise<{ url: string }> => {
    // Get association details
    const association: any = await ctx.runQuery(internal.associations.getAssociationInternal, {
      associationId: args.associationId,
    });

    if (!association) {
      throw new Error("Association not found");
    }

    // Get the correct price ID for the tier and billing interval
    const priceId = await getPriceIdForTierAndBillingInterval(args.tier, args.billingInterval);

    // Create checkout session
    const stripe = createStripeInstance();
    
    // Add trial period for Pro tier (14 days = 2 weeks)
    const trialPeriodDays = args.tier === "pro" ? 14 : undefined;
    
    const session: Stripe.Checkout.Session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      customer_email: args.userEmail,
      metadata: {
        userId: args.userId,
        associationId: args.associationId,
        associationName: association.name,
        tier: args.tier,
      },
      subscription_data: {
        metadata: {
          userId: args.userId,
          associationId: args.associationId,
          associationName: association.name,
          tier: args.tier,
        },
        // Add trial period for Pro tier
        ...(trialPeriodDays && { trial_period_days: trialPeriodDays }),
      },
    });

    return { url: session.url! };
  },
});

// Create customer portal session for subscription management
export const createCustomerPortalSession = mutation({
  args: {
    associationId: v.id("associations"),
  },
  returns: v.object({
    url: v.string(),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get association details
    const association = await ctx.db.get(args.associationId);
    if (!association) {
      throw new Error("Association not found");
    }

    if (!association.stripeCustomerId) {
      throw new Error("No Stripe customer found for this association");
    }

    // Create portal session
    const stripe = createStripeInstance();
    const session = await stripe.billingPortal.sessions.create({
      customer: association.stripeCustomerId,
      return_url: `${process.env.CONVEX_SITE_URL}/dashboard`,
    });

    return { url: session.url };
  },
});

// Handle Stripe webhooks
export const handleStripeWebhook = internalAction({
  args: {
    body: v.string(),
    signature: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    
    let event: Stripe.Event;
    
    try {
      const stripe = createStripeInstance();
      event = stripe.webhooks.constructEvent(args.body, args.signature, endpointSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      throw new Error("Webhook signature verification failed");
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(ctx, event.data.object);
        break;
      case "customer.subscription.created":
        await handleSubscriptionCreated(ctx, event.data.object);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(ctx, event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(ctx, event.data.object);
        break;
      case "customer.subscription.trial_will_end":
        await handleSubscriptionTrialWillEnd(ctx, event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return null;
  },
});

async function handleCheckoutSessionCompleted(
  ctx: any,
  session: Stripe.Checkout.Session
) {
  const associationId = session.metadata?.associationId;
  const userId = session.metadata?.userId;

  if (!associationId || !userId) {
    console.error("Missing metadata in checkout session");
    return;
  }

  // Update association with Stripe customer ID
  await ctx.runMutation(internal.stripe.updateAssociationWithCustomer, {
    associationId: associationId as any,
    customerId: session.customer as string,
    subscriptionId: session.subscription as string,
  });
}

async function handleSubscriptionCreated(
  ctx: any,
  subscription: Stripe.Subscription
) {
  const associationId = subscription.metadata?.associationId;
  
  if (!associationId) {
    console.error("Missing association ID in subscription metadata");
    return;
  }

  await ctx.runMutation(internal.stripe.updateAssociationSubscription, {
    associationId: associationId as any,
    subscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodEnd: Date.now() + (30 * 24 * 60 * 60 * 1000), // Default to 30 days from now
  });
}

async function handleSubscriptionUpdated(
  ctx: any,
  subscription: Stripe.Subscription
) {
  const associationId = subscription.metadata?.associationId;
  
  if (!associationId) {
    console.error("Missing association ID in subscription metadata");
    return;
  }

  await ctx.runMutation(internal.stripe.updateAssociationSubscription, {
    associationId: associationId as any,
    subscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodEnd: Date.now() + (30 * 24 * 60 * 60 * 1000), // Default to 30 days from now
  });
}

async function handleSubscriptionDeleted(
  ctx: any,
  subscription: Stripe.Subscription
) {
  const associationId = subscription.metadata?.associationId;
  
  if (!associationId) {
    console.error("Missing association ID in subscription metadata");
    return;
  }

  await ctx.runMutation(internal.stripe.updateAssociationSubscription, {
    associationId: associationId as any,
    subscriptionId: subscription.id,
    status: "canceled",
    currentPeriodEnd: Date.now() + (30 * 24 * 60 * 60 * 1000), // Default to 30 days from now
  });
}

async function handleSubscriptionTrialWillEnd(
  ctx: any,
  subscription: Stripe.Subscription
) {
  const associationId = subscription.metadata?.associationId;
  
  if (!associationId) {
    console.error("Missing association ID in subscription metadata");
    return;
  }

  // Log trial end event for monitoring
  console.log(`Trial will end for subscription ${subscription.id} in association ${associationId}`);
  
  // You can add additional logic here like:
  // - Sending email notifications to users
  // - Updating UI to show trial ending soon
  // - Sending reminders to add payment method
  
  // For now, we'll just log the event
  // In a production app, you might want to send an email or notification
}

// Internal mutations for updating association data
export const updateAssociationWithCustomer = internalMutation({
  args: {
    associationId: v.id("associations"),
    customerId: v.string(),
    subscriptionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.associationId, {
      stripeCustomerId: args.customerId,
      stripeSubscriptionId: args.subscriptionId,
      subscriptionStatus: "active",
      subscriptionTier: "pro",
    });
    return null;
  },
}); 

export const updateAssociationSubscription = internalMutation({
  args: {
    associationId: v.id("associations"),
    subscriptionId: v.string(),
    status: v.string(),
    currentPeriodEnd: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Map Stripe status to our schema status
    let mappedStatus: "active" | "inactive" | "trial" | "suspended" = "inactive";
    
    switch (args.status) {
      case "active":
        mappedStatus = "active";
        break;
      case "canceled":
      case "past_due":
      case "unpaid":
        mappedStatus = "inactive";
        break;
      case "trialing":
        mappedStatus = "trial";
        break;
      case "paused":
        mappedStatus = "suspended";
        break;
      default:
        mappedStatus = "inactive";
    }

    await ctx.db.patch(args.associationId, {
      stripeSubscriptionId: args.subscriptionId,
      subscriptionStatus: mappedStatus,
      subscriptionCurrentPeriodEnd: args.currentPeriodEnd,
    });
    return null;
  },
}); 