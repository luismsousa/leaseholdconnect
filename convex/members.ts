import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getClerkUserId, requireClerkAuth } from "./clerkHelpers";
import { Id, Doc } from "./_generated/dataModel";
import { internal, api } from "./_generated/api";

// Get current member for a specific association
export const getCurrentMember = query({
  args: { associationId: v.id("associations") },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      return null;
    }

    // Check if user is a member of this association
    const associationMembership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", args.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!associationMembership) {
      return null;
    }

    // Get user identity from Clerk
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      return null;
    }

    // Find the member record for this association
    const member = await ctx.db
      .query("members")
      .withIndex("by_association_and_email", (q) => 
        q.eq("associationId", args.associationId).eq("email", identity.email || "")
      )
      .first();

    return member;
  },
});

// Bootstrap member record when user first accesses an association
export const bootstrap = mutation({
  args: { associationId: v.id("associations") },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is a member of this association
    const associationMembership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", args.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!associationMembership) {
      return null;
    }

    // Get user identity from Clerk
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      return null;
    }

    // Check if member record already exists
    const existingMember = await ctx.db
      .query("members")
      .withIndex("by_association_and_email", (q) => 
        q.eq("associationId", args.associationId).eq("email", identity.email || "")
      )
      .first();

    if (existingMember) {
      return existingMember._id;
    }

    // Check member limit for the association
    const association = await ctx.db.get(args.associationId);
    if (!association) {
      throw new Error("Association not found");
    }

    if (association.settings?.maxMembers) {
      // Count current active members
      const currentMemberCount = await ctx.db
        .query("members")
        .withIndex("by_association", (q) => q.eq("associationId", args.associationId))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      if (currentMemberCount.length >= association.settings.maxMembers) {
        throw new Error(`Member limit reached. Maximum ${association.settings.maxMembers} members allowed for ${association.subscriptionTier} tier.`);
      }
    }

    // Create member record
    const memberId = await ctx.db.insert("members", {
      associationId: args.associationId,
      email: identity.email || "",
      name: identity.name || identity.email || "User",
      userId: userId,
      role: associationMembership.role === "owner" ? "admin" : "member",
      status: "active",
      joinedAt: Date.now(),
    });

    return memberId;
  },
});

// List all members for an association
export const list = query({
  args: { associationId: v.id("associations") },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is a member of this association
    const associationMembership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", args.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!associationMembership) {
      throw new Error("Not authorized");
    }

    return await ctx.db
      .query("members")
      .withIndex("by_association", (q) => q.eq("associationId", args.associationId))
      .collect();
  },
});

// List members including their assigned units (many-to-many)
export const listWithUnits = query({
  args: { associationId: v.id("associations") },
  returns: v.array(
    v.object({
      _id: v.id("members"),
      associationId: v.id("associations"),
      email: v.string(),
      name: v.string(),
      role: v.union(v.literal("admin"), v.literal("member")),
      status: v.union(v.literal("active"), v.literal("inactive"), v.literal("invited")),
      joinedAt: v.optional(v.number()),
      invitedAt: v.optional(v.number()),
      units: v.array(
        v.object({ _id: v.id("units"), name: v.string(), building: v.optional(v.string()) })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const associationMembership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) =>
        q.eq("associationId", args.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!associationMembership) {
      throw new Error("Not authorized");
    }

    const members = await ctx.db
      .query("members")
      .withIndex("by_association", (q) => q.eq("associationId", args.associationId))
      .collect();

    // Load all assignments for the association
    const assignments = await ctx.db
      .query("memberUnits")
      .withIndex("by_association_and_member", (q) => q.eq("associationId", args.associationId))
      .collect();

    const unitIds = Array.from(new Set(assignments.map((a) => a.unitId)));
    const units: Array<Doc<"units"> | null> = await Promise.all(unitIds.map((id) => ctx.db.get(id)));
    const unitMap = new Map<string, Doc<"units">>();
    for (const u of units) {
      if (u) unitMap.set(u._id, u);
    }

    return members.map((m) => {
      const mAssignments = assignments.filter((a) => a.memberId === m._id);
      const mUnits = mAssignments
        .map((a) => unitMap.get(a.unitId))
        .filter((u): u is Doc<"units"> => Boolean(u))
        .map((u) => ({ _id: u._id, name: u.name, building: u.building }));
      return {
        _id: m._id,
        associationId: m.associationId,
        email: m.email,
        name: m.name,
        role: m.role,
        status: m.status,
        joinedAt: (m as any).joinedAt,
        invitedAt: (m as any).invitedAt,
        units: mUnits,
      };
    });
  },
});

// List all unit assignments for an association
export const listAssignments = query({
  args: { associationId: v.id("associations") },
  returns: v.array(v.object({ memberId: v.id("members"), unitId: v.id("units") })),
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const associationMembership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) =>
        q.eq("associationId", args.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!associationMembership) {
      throw new Error("Not authorized");
    }

    const rows = await ctx.db
      .query("memberUnits")
      .withIndex("by_association_and_member", (q) => q.eq("associationId", args.associationId))
      .collect();
    return rows.map((r) => ({ memberId: r.memberId, unitId: r.unitId }));
  },
});

// List members by unit
export const listByUnit = query({
  args: { 
    associationId: v.id("associations"),
    unit: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is a member of this association
    const associationMembership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", args.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!associationMembership) {
      throw new Error("Not authorized");
    }

    return await ctx.db
      .query("members")
      .withIndex("by_association_and_unit", (q) => 
        q.eq("associationId", args.associationId).eq("unit", args.unit)
      )
      .collect();
  },
});

// Create new member
export const create = mutation({
  args: {
    associationId: v.id("associations"),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    // New: optional multi-unit assignment at creation time
    unitIds: v.optional(v.array(v.id("units"))),
    // Backward compatibility: allow legacy single unit name
    unit: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is admin of this association
    const associationMembership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", args.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!associationMembership || (associationMembership.role !== "owner" && associationMembership.role !== "admin")) {
      throw new Error("Not authorized");
    }

    // Check if member already exists
    const existingMember = await ctx.db
      .query("members")
      .withIndex("by_association_and_email", (q) => 
        q.eq("associationId", args.associationId).eq("email", args.email)
      )
      .first();

    if (existingMember) {
      throw new Error("Member with this email already exists");
    }

    // Validate unitIds if provided (and map legacy unit name if provided)
    let unitIdsToAssign: Array<Id<"units">> = [];
    if (args.unitIds && args.unitIds.length > 0) {
      unitIdsToAssign = args.unitIds;
    } else if (args.unit) {
      const unit = await ctx.db
        .query("units")
        .withIndex("by_association_and_name", (q) =>
          q.eq("associationId", args.associationId).eq("name", args.unit!)
        )
        .first();
      if (!unit) {
        throw new Error("Unit not found");
      }
      unitIdsToAssign = [unit._id];
    }

    // Check member limit for the association
    const association = await ctx.db.get(args.associationId);
    if (!association) {
      throw new Error("Association not found");
    }

    if (association.settings?.maxMembers) {
      // Count current active members
      const currentMemberCount = await ctx.db
        .query("members")
        .withIndex("by_association", (q) => q.eq("associationId", args.associationId))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      if (currentMemberCount.length >= association.settings.maxMembers) {
        throw new Error(`Member limit reached. Maximum ${association.settings.maxMembers} members allowed for ${association.subscriptionTier} tier.`);
      }
    }

    const memberId = await ctx.db.insert("members", {
      associationId: args.associationId,
      email: args.email,
      name: args.name,
      // userId will be set upon acceptance when we know who claimed the invite
      role: args.role,
      status: "invited",
      invitedBy: userId,
      invitedAt: Date.now(),
    });

    // Enforce: a unit can belong to only one member
    if (unitIdsToAssign.length > 0) {
      for (const unitId of unitIdsToAssign) {
        const existing = await ctx.db
          .query("memberUnits")
          .withIndex("by_association_and_unit", (q) =>
            q.eq("associationId", args.associationId).eq("unitId", unitId)
          )
          .first();
        if (existing) {
          const unitDoc = await ctx.db.get(unitId);
          const unitName = unitDoc?.name ?? "Unit";
          throw new Error(`${unitName} is already assigned to another member`);
        }
      }

      // Create unit assignments
      for (const unitId of unitIdsToAssign) {
        await ctx.db.insert("memberUnits", {
          associationId: args.associationId,
          memberId,
          unitId,
          createdAt: Date.now(),
        });
      }
    }

    // Log the audit event
    try {
      await ctx.runMutation(api.audit.log, {
        associationId: args.associationId,
        userId,
        memberId,
        action: "member_invited",
        entityType: "member",
        entityId: memberId,
        description: `Invited ${args.name} (${args.email}) to join the association`,
        metadata: { email: args.email, name: args.name, unit: args.unit, role: args.role },
      });
    } catch (error) {
      console.error("Failed to log audit event:", error);
    }

    // Get the inviter's information from Clerk identity
    const identity = await ctx.auth.getUserIdentity();
    const inviterName = identity?.name || identity?.email || "Administrator";

    // Send invitation email
    try {
      await ctx.scheduler.runAfter(0, internal.emails.sendInvitationEmail, {
        email: args.email,
        name: args.name,
        inviterName,
        unit: undefined,
        associationId: args.associationId,
      });
    } catch (error) {
      console.error("Failed to schedule invitation email:", error);
      // Don't throw error to avoid breaking the member creation process
    }

    return memberId;
  },
});

// Update member
export const update = mutation({
  args: {
    id: v.id("members"),
    name: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("member"))),
    // New: replace assigned units with this set
    unitIds: v.optional(v.array(v.id("units"))),
    // Backward compatibility: allow setting legacy single unit name; ignored if unitIds provided
    unit: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const member = await ctx.db.get(args.id);
    if (!member) {
      throw new Error("Member not found");
    }

    // Check if user is admin of this association
    const associationMembership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", member.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!associationMembership || (associationMembership.role !== "owner" && associationMembership.role !== "admin")) {
      throw new Error("Not authorized");
    }

    const { id, unitIds, unit, ...updates } = args;
    await ctx.db.patch(id, updates);

    // If unitIds provided, replace all assignments for this member
    if (unitIds) {
      // Enforce: a unit can belong to only one member
      for (const unitId of unitIds) {
        const existing = await ctx.db
          .query("memberUnits")
          .withIndex("by_association_and_unit", (q) =>
            q.eq("associationId", member.associationId).eq("unitId", unitId)
          )
          .first();
        if (existing && existing.memberId !== id) {
          const unitDoc = await ctx.db.get(unitId);
          const unitName = unitDoc?.name ?? "Unit";
          throw new Error(`${unitName} is already assigned to another member`);
        }
      }

      // Delete existing assignments
      const current = await ctx.db
        .query("memberUnits")
        .withIndex("by_association_and_member", (q) =>
          q.eq("associationId", member.associationId).eq("memberId", id)
        )
        .collect();
      for (const row of current) {
        await ctx.db.delete(row._id);
      }
      // Insert new ones
      for (const unitId of unitIds) {
        await ctx.db.insert("memberUnits", {
          associationId: member.associationId,
          memberId: id,
          unitId,
          createdAt: Date.now(),
        });
      }
    } else if (typeof unit === "string") {
      // Legacy: map the single unit name to an id and set as the sole assignment
      const u = await ctx.db
        .query("units")
        .withIndex("by_association_and_name", (q) =>
          q.eq("associationId", member.associationId).eq("name", unit)
        )
        .first();
      // Clear existing and insert if found; if not found, clear assignments
      const current = await ctx.db
        .query("memberUnits")
        .withIndex("by_association_and_member", (q) =>
          q.eq("associationId", member.associationId).eq("memberId", id)
        )
        .collect();
      for (const row of current) {
        await ctx.db.delete(row._id);
      }
      if (u) {
        await ctx.db.insert("memberUnits", {
          associationId: member.associationId,
          memberId: id,
          unitId: u._id,
          createdAt: Date.now(),
        });
      }
    }
    return id;
  },
});

// Deactivate member
export const deactivate = mutation({
  args: {
    id: v.id("members"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const member = await ctx.db.get(args.id);
    if (!member) {
      throw new Error("Member not found");
    }

    // Check if user is admin of this association
    const associationMembership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", member.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!associationMembership || (associationMembership.role !== "owner" && associationMembership.role !== "admin")) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.id, {
      status: "inactive",
      deactivatedAt: Date.now(),
      deactivatedBy: userId,
      deactivationReason: args.reason,
    });

    return args.id;
  },
});

// Reactivate member
export const reactivate = mutation({
  args: {
    id: v.id("members"),
  },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const member = await ctx.db.get(args.id);
    if (!member) {
      throw new Error("Member not found");
    }

    // Check if user is admin of this association
    const associationMembership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", member.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!associationMembership || (associationMembership.role !== "owner" && associationMembership.role !== "admin")) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.id, {
      status: "active",
      reactivatedAt: Date.now(),
      reactivatedBy: userId,
      deactivatedAt: undefined,
      deactivatedBy: undefined,
      deactivationReason: undefined,
    });

    return args.id;
  },
});

// Delete member
export const remove = mutation({
  args: {
    id: v.id("members"),
  },
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const member = await ctx.db.get(args.id);
    if (!member) {
      throw new Error("Member not found");
    }

    // Check if user is admin of this association
    const associationMembership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", member.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!associationMembership || (associationMembership.role !== "owner" && associationMembership.role !== "admin")) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Get member count and limits for an association
export const getMemberStats = query({
  args: { associationId: v.id("associations") },
  returns: v.object({
    currentCount: v.number(),
    maxMembers: v.optional(v.number()),
    subscriptionTier: v.string(),
    isAtLimit: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const userId = await getClerkUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is a member of this association
    const associationMembership = await ctx.db
      .query("associationMembers")
      .withIndex("by_association_and_user", (q) => 
        q.eq("associationId", args.associationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!associationMembership) {
      throw new Error("Not authorized");
    }

    // Get association details
    const association = await ctx.db.get(args.associationId);
    if (!association) {
      throw new Error("Association not found");
    }

    // Count current active members
    const currentMembers = await ctx.db
      .query("members")
      .withIndex("by_association", (q) => q.eq("associationId", args.associationId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const currentCount = currentMembers.length;
    const maxMembers = association.settings?.maxMembers;
    const isAtLimit = maxMembers ? currentCount >= maxMembers : false;

    return {
      currentCount,
      maxMembers,
      subscriptionTier: association.subscriptionTier,
      isAtLimit,
    };
  },
});
