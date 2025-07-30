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
      
      console.log("Stripe webhook received:", {
        eventType: event.type,
        eventId: event.id
      });

      // Handle different webhook events
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Extract client reference ID for tracking
        const clientReferenceId = session.client_reference_id;
        const customerEmail = session.customer_details?.email;
        const amount = session.amount_total;
        const currency = session.currency;
        const paymentStatus = session.payment_status;
        
        console.log("Processing checkout session completion:", {
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
      } else if (event.type === "customer.subscription.created" || 
                 event.type === "customer.subscription.updated") {
        const subscription = event.data.object as Stripe.Subscription;
        
        console.log("Processing subscription event:", {
          eventType: event.type,
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status
        });

        // For now, we'll handle this in the existing handleSubscriptionCompletion function
        // TODO: Implement separate handlers for subscription events
        console.log("Subscription event received but not yet processed:", event.type);
      } else if (event.type === "customer.subscription.deleted") {
        const subscription = event.data.object as Stripe.Subscription;
        
        console.log("Processing subscription deletion:", {
          subscriptionId: subscription.id,
          customerId: subscription.customer
        });

        // For now, we'll handle this in the existing handleSubscriptionCompletion function
        // TODO: Implement separate handlers for subscription events
        console.log("Subscription deletion received but not yet processed");
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

// Handle subscription events (created/updated)
export const handleSubscriptionEvent = internalMutation({
  args: {
    subscriptionId: v.string(),
    customerId: v.string(),
    status: v.string(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    priceId: v.optional(v.string()),
    eventType: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    associationId: v.optional(v.id("associations")),
  }),
  handler: async (ctx, args) => {
    console.log("Processing subscription event:", args);

    // Find association by Stripe customer ID
    const association = await ctx.db
      .query("associations")
      .withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", args.customerId))
      .first();

    if (!association) {
      console.log("No association found for customer ID:", args.customerId);
      return { success: false };
    }

    // Determine subscription tier based on price ID
    let subscriptionTier: "free" | "pro" | "enterprise" = "free";
    if (args.priceId) {
      // Map Stripe price IDs to subscription tiers
      // You'll need to update these with your actual Stripe price IDs
      if (args.priceId.includes("pro") || args.priceId.includes("price_pro")) {
        subscriptionTier = "pro";
      } else if (args.priceId.includes("enterprise") || args.priceId.includes("price_enterprise")) {
        subscriptionTier = "enterprise";
      }
    }

    // Update association subscription details
    await ctx.db.patch(association._id, {
      stripeSubscriptionId: args.subscriptionId,
      subscriptionTier,
      subscriptionStatus: args.status === "active" ? "active" : "inactive",
      subscriptionStartDate: args.currentPeriodStart * 1000, // Convert to milliseconds
      subscriptionEndDate: args.currentPeriodEnd * 1000,
      lastBillingDate: Date.now(),
      nextBillingDate: args.currentPeriodEnd * 1000,
      updatedAt: Date.now(),
    });

    // Log the subscription event
    await ctx.db.insert("auditLogs", {
      associationId: association._id,
      userId: association.createdBy,
      action: "subscription_updated",
      entityType: "subscription",
      entityId: args.subscriptionId,
      description: `Subscription ${args.eventType} - Tier: ${subscriptionTier}, Status: ${args.status}`,
      details: {
        subscriptionId: args.subscriptionId,
        customerId: args.customerId,
        status: args.status,
        tier: subscriptionTier,
        priceId: args.priceId,
        eventType: args.eventType,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
      },
      timestamp: Date.now(),
    });

    console.log("Association subscription updated:", association._id);
    return { success: true, associationId: association._id };
  },
});

// Handle subscription cancellation
export const handleSubscriptionCancellation = internalMutation({
  args: {
    subscriptionId: v.string(),
    customerId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    associationId: v.optional(v.id("associations")),
  }),
  handler: async (ctx, args) => {
    console.log("Processing subscription cancellation:", args);

    // Find association by Stripe customer ID
    const association = await ctx.db
      .query("associations")
      .withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", args.customerId))
      .first();

    if (!association) {
      console.log("No association found for customer ID:", args.customerId);
      return { success: false };
    }

    // Update association to free tier
    await ctx.db.patch(association._id, {
      subscriptionTier: "free",
      subscriptionStatus: "inactive",
      stripeSubscriptionId: undefined,
      subscriptionEndDate: Date.now(),
      updatedAt: Date.now(),
    });

    // Log the cancellation
    await ctx.db.insert("auditLogs", {
      associationId: association._id,
      userId: association.createdBy,
      action: "subscription_cancelled",
      entityType: "subscription",
      entityId: args.subscriptionId,
      description: "Subscription cancelled - reverted to free tier",
      details: {
        subscriptionId: args.subscriptionId,
        customerId: args.customerId,
        cancelledAt: Date.now(),
      },
      timestamp: Date.now(),
    });

    console.log("Association subscription cancelled:", association._id);
    return { success: true, associationId: association._id };
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
    associationId: v.optional(v.id("associations")),
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

    // Parse the client reference ID to extract user and association information
    // Format: ${userId}_${associationId}_${timestamp} or ${userId}_${timestamp}
    const clientRefParts = args.clientReferenceId.split('_');
    let userId = null;
    let associationId = null;
    
    if (clientRefParts.length >= 3) {
      // Check if it starts with "user" (Clerk user ID format)
      if (clientRefParts[0] === 'user') {
        // Extract the full user ID (which includes the "user_" prefix)
        // Join back the parts that make up the user ID
        const userIdParts = clientRefParts.slice(0, -2); // All parts except the last two (associationId and timestamp)
        userId = userIdParts.join('_');
        associationId = clientRefParts[clientRefParts.length - 2]; // Second to last part is associationId
      } else if (clientRefParts[0] === 'anonymous') {
        // Handle anonymous users
        userId = null;
        associationId = clientRefParts[clientRefParts.length - 2];
      }
    } else if (clientRefParts.length >= 2) {
      // Legacy format: ${userId}_${timestamp}
      if (clientRefParts[0] === 'user') {
        const userIdParts = clientRefParts.slice(0, -1);
        userId = userIdParts.join('_');
      }
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

    // Handle association-level subscription
    if (associationId) {
      try {
        const association = await ctx.db.get(associationId as any);
        if (association) {
          console.log("Found association for subscription:", association._id);
          
          // Check if association already has an active subscription
          if ((association as any).stripeSubscriptionId && (association as any).subscriptionStatus === "active") {
            console.log("Association already has an active subscription:", association._id);
            // Log this as a duplicate subscription attempt
            await ctx.db.insert("auditLogs", {
              associationId: association._id as any,
              userId: userId || "anonymous",
              action: "subscription_duplicate_attempt",
              entityType: "subscription",
              entityId: args.subscriptionId || args.sessionId,
              description: "Duplicate subscription attempt - association already has active subscription",
              details: {
                clientReferenceId: args.clientReferenceId,
                customerEmail: args.customerEmail,
                amount: args.amount,
                currency: args.currency,
                paymentStatus: args.paymentStatus,
                sessionId: args.sessionId,
                customerId: args.customerId,
                subscriptionId: args.subscriptionId,
                existingSubscriptionId: (association as any).stripeSubscriptionId,
                timestamp: Date.now()
              },
              timestamp: Date.now(),
            });
            
            return {
              success: false,
              userId: user?._id,
              subscriptionEventId: "",
              associationId: association._id as any
            };
          }

          // Determine subscription tier based on amount
          let subscriptionTier: "free" | "pro" | "enterprise" = "free";
          if (args.amount >= 5000) { // $50.00 or more
            subscriptionTier = "enterprise";
          } else if (args.amount >= 2000) { // $20.00 or more
            subscriptionTier = "pro";
          }

          // Update association subscription details
          await ctx.db.patch(association._id as any, {
            stripeCustomerId: args.customerId,
            stripeSubscriptionId: args.subscriptionId,
            subscriptionTier,
            subscriptionStatus: "active",
            subscriptionStartDate: Date.now(),
            lastBillingDate: Date.now(),
            updatedAt: Date.now(),
          });

          console.log("Association subscription updated:", association._id);
        }
      } catch (error) {
        console.error("Error processing association subscription:", error);
      }
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
      associationId: associationId || "system", // Use association ID if available, otherwise system
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
      subscriptionEventId,
      associationId: associationId as any
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

// Test mutation to manually update association subscription (for testing)
export const updateAssociationSubscription = mutation({
  args: {
    associationId: v.id("associations"),
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
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    associationId: v.id("associations"),
  }),
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Update association subscription details
    await ctx.db.patch(args.associationId, {
      subscriptionTier: args.subscriptionTier,
      subscriptionStatus: args.subscriptionStatus,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      subscriptionStartDate: args.subscriptionStatus === "active" ? Date.now() : undefined,
      lastBillingDate: args.subscriptionStatus === "active" ? Date.now() : undefined,
      updatedAt: Date.now(),
    });

    // Log the manual update
    await ctx.db.insert("auditLogs", {
      associationId: args.associationId,
      userId: userId,
      action: "subscription_manually_updated",
      entityType: "subscription",
      entityId: args.stripeSubscriptionId || "manual",
      description: `Subscription manually updated - Tier: ${args.subscriptionTier}, Status: ${args.subscriptionStatus}`,
      details: {
        subscriptionTier: args.subscriptionTier,
        subscriptionStatus: args.subscriptionStatus,
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        updatedBy: userId,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });

    console.log("Association subscription manually updated:", args.associationId);
    return { success: true, associationId: args.associationId };
  },
}); 

// Create Stripe customer portal session for subscription management
export const createCustomerPortalSession = mutation({
  args: {
    associationId: v.id("associations"),
  },
  returns: v.object({
    url: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Get the association
    const association = await ctx.db.get(args.associationId);
    if (!association) {
      throw new Error("Association not found");
    }

    // Check if user has access to this association
    const membership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", args.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    // Allow PaaS admins to access any association
    const paasAdmin = await ctx.db
      .query("paasAdmins")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!membership && !paasAdmin) {
      throw new Error("Not authorized for this association");
    }

    // Check if association has a Stripe customer ID
    if (!association.stripeCustomerId) {
      throw new Error("No subscription found for this association");
    }

    // Create customer portal session
    const stripe = new Stripe(process.env.STRIPE_KEY!);
    const session = await stripe.billingPortal.sessions.create({
      customer: association.stripeCustomerId,
      return_url: `${process.env.CLERK_FRONTEND_API}/dashboard`,
    });

    return { url: session.url };
  },
}); 