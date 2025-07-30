import { v } from "convex/values";
import { query, mutation, internalMutation, internalAction } from "./_generated/server";
import { getClerkUserId, requireClerkAuth, requirePaasAdmin } from "./clerkHelpers";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// Helper function moved to clerkHelpers.ts

// Check if current user is a PaaS admin
export const isPaasAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      return false;
    }

    const paasAdmin = await ctx.db
      .query("paasAdmins")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    return !!paasAdmin;
  },
});

// Get current PaaS admin details
export const getCurrentPaasAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      return null;
    }

    const paasAdmin = await ctx.db
      .query("paasAdmins")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!paasAdmin) {
      return null;
    }

    const identity = await ctx.auth.getUserIdentity();
    const user = {
      _id: userId,
      name: identity?.name,
      email: identity?.email,
      image: identity?.pictureUrl,
    };
    return { ...paasAdmin, user };
  },
});

// List all associations (PaaS admin only)
export const listAllAssociations = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"), v.literal("trial"), v.literal("suspended"))),
    tier: v.optional(v.union(v.literal("free"), v.literal("basic"), v.literal("premium"))),
  },
  handler: async (ctx, args) => {
    await requirePaasAdmin(ctx);

    let associations;

    if (args.status) {
      associations = await ctx.db
        .query("associations")
        .withIndex("by_status_and_subscription", (q) => q.eq("isActive", true).eq("subscriptionStatus", args.status!))
        .order("desc")
        .collect();
    } else if (args.tier) {
      associations = await ctx.db
        .query("associations")
        .withIndex("by_subscription_tier", (q) => q.eq("subscriptionTier", args.tier!))
        .order("desc")
        .collect();
    } else {
      associations = await ctx.db.query("associations").order("desc").collect();
    }

    // Get member counts for each association
    const associationsWithStats = await Promise.all(
      associations.map(async (association) => {
        const memberCount = await ctx.db
          .query("associationMembers")
          .withIndex("by_association", (q) => q.eq("associationId", association._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect()
          .then(members => members.length);

        const owner = await ctx.db
          .query("associationMembers")
          .withIndex("by_association", (q) => q.eq("associationId", association._id))
          .filter((q) => q.eq(q.field("role"), "owner"))
          .first();

        let ownerUser = null;
        if (owner) {
          // Since we're using Clerk, we can't get user details from DB
          // We'll need to get this from Clerk or store it differently
          ownerUser = {
            _id: owner.userId,
            name: "User", // Placeholder - would need Clerk API call to get real name
            email: "user@example.com" // Placeholder
          };
        }

        return {
          ...association,
          memberCount,
          owner: ownerUser,
        };
      })
    );

    return associationsWithStats;
  },
});

// Create association as PaaS admin
export const createAssociationAsAdmin = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    website: v.optional(v.string()),
    ownerEmail: v.string(),
    subscriptionTier: v.union(v.literal("free"), v.literal("basic"), v.literal("premium")),
    subscriptionStatus: v.union(v.literal("active"), v.literal("inactive"), v.literal("trial")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requirePaasAdmin(ctx);

    // With Clerk, we don't need to check for existing users in our DB

    const now = Date.now();
    const { ownerEmail, ...associationData } = args;

    // Create the association
    const associationId = await ctx.db.insert("associations", {
      ...associationData,
      settings: {
        allowSelfRegistration: false,
        requireAdminApproval: true,
        maxMembers: args.subscriptionTier === "free" ? 50 : args.subscriptionTier === "basic" ? 200 : undefined,
        maxUnits: args.subscriptionTier === "free" ? 25 : args.subscriptionTier === "basic" ? 100 : undefined,
      },
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      trialEndsAt: args.subscriptionStatus === "trial" ? now + (30 * 24 * 60 * 60 * 1000) : undefined, // 30 days
    });

    // Create a member record for the owner (invited status)
    const memberId = await ctx.db.insert("members", {
      associationId,
      email: args.ownerEmail,
      name: args.ownerEmail.split('@')[0], // Use email prefix as default name
      role: "admin",
      status: "invited",
      invitedBy: userId,
      invitedAt: now,
    });

    // Note: Association membership will be created when user signs up and activates invitation
    // We also need to create a placeholder associationMembers record that will be updated when the user signs up

    // Schedule sending the invitation email
    await ctx.scheduler.runAfter(0, internal.emails.sendEmail, {
      to: args.ownerEmail,
      subject: `Invitation to manage ${args.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Welcome to ${args.name}!</h2>
          <p>You have been invited to manage this association as the administrator.</p>
          <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p><strong>To get started:</strong></p>
            <ol>
              <li>Visit the portal below</li>
              <li>Create an account using: <strong>${args.ownerEmail}</strong></li>
              <li>You'll automatically have admin access</li>
            </ol>
          </div>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${process.env.SITE_URL || 'https://your-app-url.com'}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Access Portal</a>
          </div>
        </div>
      `,
    });

    return associationId;
  },
});

// Migration function to fix existing PaaS admin user IDs and users table
export const migratePaasAdminUserIds = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Fix PaaS admin user IDs
    const allPaasAdmins = await ctx.db.query("paasAdmins").collect();
    
    for (const admin of allPaasAdmins) {
      // Check if the userId contains the full tokenIdentifier format
      if (admin.userId.includes('|')) {
        const parts = admin.userId.split('|');
        const newUserId = parts.length > 1 ? parts[1] : admin.userId;
        
        // Update the record with the correct user ID
        await ctx.db.patch(admin._id, {
          userId: newUserId,
        });
      }
    }
    
    // Fix users table tokenIdentifier
    const allUsers = await ctx.db.query("users").collect();
    
    for (const user of allUsers) {
      // Check if the tokenIdentifier contains the full format
      if (user.tokenIdentifier.includes('|')) {
        const parts = user.tokenIdentifier.split('|');
        const newTokenIdentifier = parts.length > 1 ? parts[1] : user.tokenIdentifier;
        
        // Update the record with the correct tokenIdentifier
        await ctx.db.patch(user._id, {
          tokenIdentifier: newTokenIdentifier,
        });
      }
    }
    
    return null;
  },
});

// Public mutation to trigger the migration (for admin use)
export const runMigration = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Only allow PaaS admins to run migrations
    await requirePaasAdmin(ctx);
    
    // Run the migration
    await ctx.runMutation(internal.paasAdmin.migratePaasAdminUserIds, {});
    
    return null;
  },
});

// Create PaaS admin
export const createPaasAdmin = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("super_admin"), v.literal("support"), v.literal("billing")),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const paasAdmin = await requirePaasAdmin(ctx);
    
    // Only super_admin can create other admins
    if (paasAdmin.role !== "super_admin") {
      throw new Error("Only super admins can create PaaS admins");
    }

    // Find the user by email in the users table
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("User not found. The user must sign up with this email first.");
    }

    // Extract the user ID from the tokenIdentifier
    const parts = user.tokenIdentifier.split('|');
    const userId = parts.length > 1 ? parts[1] : user.tokenIdentifier;
    
    // Check if user is already a PaaS admin
    const existingAdmin = await ctx.db
      .query("paasAdmins")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingAdmin) {
      throw new Error("User is already a PaaS admin");
    }

    const adminId = await ctx.db.insert("paasAdmins", {
      userId: userId,
      role: args.role,
      permissions: args.permissions,
      createdAt: Date.now(),
      createdBy: paasAdmin.userId,
      isActive: true,
    });

    return adminId;
  },
});

// Suspend association
export const suspendAssociation = mutation({
  args: {
    associationId: v.id("associations"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requirePaasAdmin(ctx);

    const association = await ctx.db.get(args.associationId);
    if (!association) {
      throw new Error("Association not found");
    }

    await ctx.db.patch(args.associationId, {
      subscriptionStatus: "suspended",
      suspendedAt: Date.now(),
      suspendedBy: userId,
      suspensionReason: args.reason,
      updatedAt: Date.now(),
    });

    return args.associationId;
  },
});

// Reactivate association
export const reactivateAssociation = mutation({
  args: {
    associationId: v.id("associations"),
  },
  handler: async (ctx, args) => {
    await requirePaasAdmin(ctx);

    const association = await ctx.db.get(args.associationId);
    if (!association) {
      throw new Error("Association not found");
    }

    await ctx.db.patch(args.associationId, {
      subscriptionStatus: "active",
      suspendedAt: undefined,
      suspendedBy: undefined,
      suspensionReason: undefined,
      updatedAt: Date.now(),
    });

    return args.associationId;
  },
});

// Update association subscription
export const updateAssociationSubscription = mutation({
  args: {
    associationId: v.id("associations"),
    tier: v.union(v.literal("free"), v.literal("basic"), v.literal("premium")),
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("trial")),
  },
  handler: async (ctx, args) => {
    await requirePaasAdmin(ctx);

    const association = await ctx.db.get(args.associationId);
    if (!association) {
      throw new Error("Association not found");
    }

    await ctx.db.patch(args.associationId, {
      subscriptionTier: args.tier,
      subscriptionStatus: args.status,
      updatedAt: Date.now(),
    });

    return args.associationId;
  },
});

// Check if any PaaS admins exist in the system
export const anyPaasAdminsExist = query({
  args: {},
  handler: async (ctx) => {
    const admins = await ctx.db.query("paasAdmins").collect();
    return admins.length > 0;
  },
});

// Get platform statistics
export const getPlatformStats = query({
  args: {},
  handler: async (ctx) => {
    await requirePaasAdmin(ctx);

    const associations = await ctx.db.query("associations").collect();
    const totalAssociations = associations.length;
    const activeAssociations = associations.filter(a => a.subscriptionStatus === "active").length;
    const trialAssociations = associations.filter(a => a.subscriptionStatus === "trial").length;
    const suspendedAssociations = associations.filter(a => a.subscriptionStatus === "suspended").length;

    const allMembers = await ctx.db.query("associationMembers").collect();
    const totalUsers = allMembers.length;
    const activeUsers = allMembers.filter(m => m.status === "active").length;

    const tierCounts = {
      free: associations.filter(a => a.subscriptionTier === "free").length,
      basic: associations.filter(a => a.subscriptionTier === "basic").length,
      premium: associations.filter(a => a.subscriptionTier === "premium").length,
    };

    return {
      totalAssociations,
      activeAssociations,
      trialAssociations,
      suspendedAssociations,
      totalUsers,
      activeUsers,
      tierCounts,
    };
  },
});

// Get association members (PaaS admin only)
export const getAssociationMembers = query({
  args: {
    associationId: v.id("associations"),
  },
  returns: v.array(
    v.object({
      _id: v.id("associationMembers"),
      _creationTime: v.number(),
      associationId: v.id("associations"),
      userId: v.string(),
      role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
      status: v.union(v.literal("active"), v.literal("inactive"), v.literal("invited")),
      invitedBy: v.optional(v.string()),
      invitedAt: v.optional(v.number()),
      joinedAt: v.optional(v.number()),
      permissions: v.optional(v.array(v.string())),
      user: v.object({
        _id: v.string(),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
      }),
    })
  ),
  handler: async (ctx, args) => {
    await requirePaasAdmin(ctx);

    const association = await ctx.db.get(args.associationId);
    if (!association) {
      throw new Error("Association not found");
    }

    const memberships = await ctx.db
      .query("associationMembers")
      .withIndex("by_association", (q) => q.eq("associationId", args.associationId))
      .collect();

    // Get user details for each membership
    const membersWithDetails = await Promise.all(
      memberships.map(async (membership) => {
        // Get user details from users table
        const user = await ctx.db
          .query("users")
          .withIndex("by_token", (q) => q.eq("tokenIdentifier", membership.userId))
          .first();

        return {
          ...membership,
          user: {
            _id: membership.userId,
            name: user?.name || "Unknown User",
            email: user?.email || "unknown@example.com",
          },
        };
      })
    );

    return membersWithDetails;
  },
});

// Add admin to association (PaaS admin only)
export const addAssociationAdmin = mutation({
  args: {
    associationId: v.id("associations"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  returns: v.id("associationMembers"),
  handler: async (ctx, args) => {
    const { userId } = await requirePaasAdmin(ctx);

    const association = await ctx.db.get(args.associationId);
    if (!association) {
      throw new Error("Association not found");
    }

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("User not found. The user must sign up with this email first.");
    }

    // Extract the user ID from the tokenIdentifier
    const parts = user.tokenIdentifier.split('|');
    const targetUserId = parts.length > 1 ? parts[1] : user.tokenIdentifier;

    // Check if user is already a member of this association
    const existingMembership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", args.associationId).eq("userId", targetUserId)
      )
      .first();

    if (existingMembership) {
      // Update existing membership
      await ctx.db.patch(existingMembership._id, {
        role: args.role,
        status: "active",
        joinedAt: Date.now(),
      });
      return existingMembership._id;
    }

    // Create new membership
    const membershipId = await ctx.db.insert("associationMembers", {
      associationId: args.associationId,
      userId: targetUserId,
      role: args.role,
      status: "active",
      joinedAt: Date.now(),
    });

    return membershipId;
  },
});

// Remove admin from association (PaaS admin only)
export const removeAssociationAdmin = mutation({
  args: {
    associationId: v.id("associations"),
    membershipId: v.id("associationMembers"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requirePaasAdmin(ctx);

    const association = await ctx.db.get(args.associationId);
    if (!association) {
      throw new Error("Association not found");
    }

    const membership = await ctx.db.get(args.membershipId);
    if (!membership || membership.associationId !== args.associationId) {
      throw new Error("Membership not found");
    }

    // Can't remove the owner
    if (membership.role === "owner") {
      throw new Error("Cannot remove the association owner");
    }

    await ctx.db.delete(args.membershipId);
    return null;
  },
});

// Update association member role (PaaS admin only)
export const updateAssociationMemberRole = mutation({
  args: {
    associationId: v.id("associations"),
    membershipId: v.id("associationMembers"),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requirePaasAdmin(ctx);

    const association = await ctx.db.get(args.associationId);
    if (!association) {
      throw new Error("Association not found");
    }

    const membership = await ctx.db.get(args.membershipId);
    if (!membership || membership.associationId !== args.associationId) {
      throw new Error("Membership not found");
    }

    // Can't change owner role
    if (membership.role === "owner") {
      throw new Error("Cannot change the owner's role");
    }

    await ctx.db.patch(args.membershipId, {
      role: args.role,
    });

    return null;
  },
});
