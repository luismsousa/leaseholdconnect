import { v } from "convex/values";
import { internalMutation, internalQuery, query, mutation, internalAction } from "./_generated/server";
import { getClerkUserId } from "./clerkHelpers";
import { internal } from "./_generated/api";
import Stripe from "stripe";

// Handle webhook fulfillment using Stripe SDK
export const fulfill = internalAction({
  args: { 
    signature: v.string(), 
    payload: v.string() 
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async ({ runMutation }, { signature, payload }) => {
    const stripe = new Stripe(process.env.STRIPE_KEY!);

    const webhookSecret = process.env.STRIPE_WEBHOOKS_SECRET as string;
    try {
      const event = await stripe.webhooks.constructEventAsync(
        payload,
        signature,
        webhookSecret
      );
      
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Extract client reference ID for tracking
        const clientReferenceId = session.client_reference_id;
        const customerEmail = session.customer_details?.email;
        const amount = session.amount_total;
        const currency = session.currency;
        const paymentStatus = session.payment_status;
        
        console.log("Stripe webhook received:", {
          eventType: event.type,
          clientReferenceId,
          customerEmail,
          amount,
          currency,
          paymentStatus
        });

        // Process the subscription completion
        if (clientReferenceId) {
          await runMutation(internal.stripe.handleSubscriptionCompletion, {
            clientReferenceId,
            customerEmail: customerEmail || "",
            amount: amount || 0,
            currency: currency || "usd",
            paymentStatus: paymentStatus || "unknown",
            sessionId: session.id,
            customerId: typeof session.customer === 'string' ? session.customer : undefined,
            subscriptionId: typeof session.subscription === 'string' ? session.subscription : undefined
          });
        }
      }
      
      return { success: true };
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return { 
        success: false, 
        error: (err as { message: string }).message 
      };
    }
  },
});

// Handle subscription completion from Stripe webhook
export const handleSubscriptionCompletion = internalMutation({
  args: {
    clientReferenceId: v.string(),
    customerEmail: v.string(),
    amount: v.number(),
    currency: v.string(),
    paymentStatus: v.string(),
    sessionId: v.string(),
    customerId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    userId: v.optional(v.string()),
    subscriptionEventId: v.string(),
  }),
  handler: async (ctx, args) => {
    console.log("Processing subscription completion:", {
      clientReferenceId: args.clientReferenceId,
      customerEmail: args.customerEmail,
      amount: args.amount,
      currency: args.currency,
      paymentStatus: args.paymentStatus,
      sessionId: args.sessionId,
      customerId: args.customerId,
      subscriptionId: args.subscriptionId
    });

    // Parse the client reference ID to extract user information
    // Format: user_${userId}_${timestamp} or anonymous_${timestamp}
    const clientRefParts = args.clientReferenceId.split('_');
    let userId = null;
    
    if (clientRefParts[0] === 'user' && clientRefParts.length >= 3) {
      // Extract user ID from the client reference ID
      userId = clientRefParts[1];
    }

    // Find the user by email if we have it
    let user = null;
    if (args.customerEmail) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.customerEmail))
        .first();
    }

    // If we have a userId from client reference, try to find user that way too
    if (!user && userId) {
      // Note: We'd need to store the mapping between Clerk user ID and our user ID
      // For now, we'll rely on email matching
      console.log("User ID from client reference:", userId);
    }

    if (user) {
      console.log("Found user for subscription completion:", user._id);
      
      // Update user's subscription status
      // Note: We could add subscription fields to the user table if needed
      // For now, we'll just log the completion
      console.log("User subscription completed:", user._id);

      // Log the subscription completion in audit logs
      // You might want to create a separate table for subscription events
      console.log("Subscription completed for user:", user._id);
    } else {
      console.log("No user found for subscription completion");
    }

    // Store subscription completion event
    // You could create a separate table for this if needed
    const subscriptionEventId = await ctx.db.insert("auditLogs", {
      associationId: "system", // Use a system association ID for subscription events
      userId: userId || "anonymous",
      action: "subscription_completed",
      entityType: "subscription",
      entityId: args.subscriptionId || args.sessionId,
      description: `Subscription payment completed - ${args.currency.toUpperCase()} ${args.amount / 100}`,
      details: {
        clientReferenceId: args.clientReferenceId,
        customerEmail: args.customerEmail,
        amount: args.amount,
        currency: args.currency,
        paymentStatus: args.paymentStatus,
        sessionId: args.sessionId,
        customerId: args.customerId,
        subscriptionId: args.subscriptionId,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
    });

    console.log("Subscription completion logged with ID:", subscriptionEventId);

    return {
      success: true,
      userId: user?._id,
      subscriptionEventId
    };
  },
});

// Query to get subscription completion events
export const getSubscriptionEvents = internalQuery({
  args: {
    userId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.string(),
    _creationTime: v.number(),
    associationId: v.union(v.string(), v.string()),
    userId: v.string(),
    memberId: v.optional(v.string()),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    description: v.optional(v.string()),
    details: v.optional(v.any()),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
  })),
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("auditLogs")
      .withIndex("by_association_and_action", (q) => 
        q.eq("associationId", "system").eq("action", "subscription_completed")
      )
      .order("desc")
      .take(args.limit || 50);

    return events;
  },
});

// Public query to check if user has completed subscription
export const checkSubscriptionStatus = query({
  args: {},
  returns: v.object({
    hasSubscription: v.boolean(),
    events: v.array(v.object({
      id: v.string(),
      timestamp: v.number(),
      description: v.optional(v.string()),
      details: v.optional(v.any()),
    })),
  }),
  handler: async (ctx) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      return { hasSubscription: false, events: [] };
    }

    // Check for subscription completion events for this user
    const events = await ctx.db
      .query("auditLogs")
      .withIndex("by_association_and_action", (q) => 
        q.eq("associationId", "system").eq("action", "subscription_completed")
      )
      .filter((q) => q.eq(q.field("userId"), userId))
      .order("desc")
      .take(10);

    return {
      hasSubscription: events.length > 0,
      events: events.map(event => ({
        id: event._id,
        timestamp: event.timestamp,
        description: event.description,
        details: event.details
      }))
    };
  },
});

// Test mutation to manually trigger subscription completion (for testing)
export const testSubscriptionCompletion = mutation({
  args: {
    clientReferenceId: v.string(),
    customerEmail: v.string(),
    amount: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    userId: v.optional(v.string()),
    subscriptionEventId: v.string(),
  }),
  handler: async (ctx, args) => {
    // This is for testing purposes only
    const result: {
      success: boolean;
      userId?: string;
      subscriptionEventId: string;
    } = await ctx.runMutation(internal.stripe.handleSubscriptionCompletion, {
      clientReferenceId: args.clientReferenceId,
      customerEmail: args.customerEmail,
      amount: args.amount,
      currency: "usd",
      paymentStatus: "paid",
      sessionId: `test_session_${Date.now()}`,
      customerId: undefined,
      subscriptionId: undefined
    });
    return result;
  },
}); 