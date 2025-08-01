import { mutation, query, internalMutation, internalAction, action } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./clerkHelpers";
import { internal } from "./_generated/api";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil",
});

// Get price IDs from environment variables or use lookup keys
const STRIPE_LOOKUP_KEYS = {
  PRO_SUBSCRIPTION: process.env.STRIPE_PRO_LOOKUP_KEY || "pro_monthly",
  ENTERPRISE_SUBSCRIPTION: process.env.STRIPE_ENTERPRISE_LOOKUP_KEY || "enterprise_monthly",
} as const;

// Helper function to get price ID using lookup key
async function getPriceIdFromLookupKey(lookupKey: string): Promise<string> {
  try {
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

// Helper function to get price ID based on tier
async function getPriceIdForTier(tier: string): Promise<string> {
  let lookupKey: string;
  
  switch (tier.toLowerCase()) {
    case "pro":
      lookupKey = STRIPE_LOOKUP_KEYS.PRO_SUBSCRIPTION;
      break;
    case "enterprise":
      lookupKey = STRIPE_LOOKUP_KEYS.ENTERPRISE_SUBSCRIPTION;
      break;
    default:
      throw new Error(`Unsupported subscription tier: ${tier}`);
  }

  return await getPriceIdFromLookupKey(lookupKey);
}

// Public action to create checkout session
export const createCheckoutSession = action({
  args: {
    associationId: v.id("associations"),
    tier: v.union(v.literal("pro"), v.literal("enterprise")),
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

    // Get the correct price ID for the tier
    const priceId = await getPriceIdForTier(args.tier);

    // Create checkout session
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