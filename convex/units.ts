import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getClerkUserId } from "./clerkHelpers";
import { Id } from "./_generated/dataModel";

// Helper function to check if user is admin of association
async function requireAssociationAdmin(ctx: any, associationId: Id<"associations">) {
  const userId = await getClerkUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required");
  }

  const membership = await ctx.db
    .query("associationMembers")
    .withIndex("by_association_and_user", (q: any) => 
      q.eq("associationId", associationId).eq("userId", userId)
    )
    .filter((q: any) => q.eq(q.field("status"), "active"))
    .first();

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    throw new Error("Admin access required");
  }

  return { userId, membership };
}

// List units for an association
export const list = query({
  args: { 
    associationId: v.id("associations"),
    building: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAssociationAdmin(ctx, args.associationId);

    let query = ctx.db
      .query("units")
      .withIndex("by_association", (q) => q.eq("associationId", args.associationId));

    if (args.building) {
      query = ctx.db
        .query("units")
        .withIndex("by_association_and_building", (q) => 
          q.eq("associationId", args.associationId).eq("building", args.building)
        );
    }

    return await query.order("asc").collect();
  },
});

// Create unit
export const create = mutation({
  args: {
    associationId: v.id("associations"),
    name: v.string(),
    description: v.optional(v.string()),
    building: v.optional(v.string()),
    floor: v.optional(v.number()),
    type: v.optional(v.string()),
    size: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("vacant"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAssociationAdmin(ctx, args.associationId);

    // Check if unit name already exists in this association
    const existingUnit = await ctx.db
      .query("units")
      .withIndex("by_association_and_name", (q) => 
        q.eq("associationId", args.associationId).eq("name", args.name)
      )
      .first();

    if (existingUnit) {
      throw new Error("Unit with this name already exists");
    }

    const unitId = await ctx.db.insert("units", {
      ...args,
      status: args.status || "active",
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return unitId;
  },
});

// Update unit
export const update = mutation({
  args: {
    id: v.id("units"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    building: v.optional(v.string()),
    floor: v.optional(v.number()),
    type: v.optional(v.string()),
    size: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("vacant"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const unit = await ctx.db.get(args.id);
    if (!unit) {
      throw new Error("Unit not found");
    }

    await requireAssociationAdmin(ctx, unit.associationId);

    // If updating name, check for duplicates
    if (args.name && args.name !== unit.name) {
      const existingUnit = await ctx.db
        .query("units")
        .withIndex("by_association_and_name", (q) => 
          q.eq("associationId", unit.associationId).eq("name", args.name!)
        )
        .first();

      if (existingUnit) {
        throw new Error("Unit with this name already exists");
      }
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

// Delete unit
export const remove = mutation({
  args: {
    id: v.id("units"),
  },
  handler: async (ctx, args) => {
    const unit = await ctx.db.get(args.id);
    if (!unit) {
      throw new Error("Unit not found");
    }

    await requireAssociationAdmin(ctx, unit.associationId);

    await ctx.db.delete(args.id);
    return args.id;
  },
});
