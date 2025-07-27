import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required");
  }
  
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Check if user is admin in members table
  const member = await ctx.db
    .query("members")
    .withIndex("by_email", (q) => q.eq("email", user.email || ""))
    .unique();
  
  if (!member || member.role !== "admin") {
    throw new Error("Admin access required");
  }
  
  return { userId, user, member };
}

export const listUnits = query({
  args: {
    building: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"), v.literal("vacant"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    let units;
    
    if (args.building && args.status) {
      units = await ctx.db
        .query("units")
        .withIndex("by_building", (q) => q.eq("building", args.building!))
        .filter((q) => q.eq(q.field("status"), args.status!))
        .order("asc")
        .collect();
    } else if (args.building) {
      units = await ctx.db
        .query("units")
        .withIndex("by_building", (q) => q.eq("building", args.building!))
        .order("asc")
        .collect();
    } else if (args.status) {
      units = await ctx.db
        .query("units")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("asc")
        .collect();
    } else {
      units = await ctx.db.query("units").order("asc").collect();
    }
    
    // Get member count for each unit
    const unitsWithMembers = await Promise.all(
      units.map(async (unit) => {
        const members = await ctx.db
          .query("members")
          .withIndex("by_unit", (q) => q.eq("unit", unit.name))
          .collect();
        
        return {
          ...unit,
          memberCount: members.length,
          members: members.map(m => ({ name: m.name, email: m.email, status: m.status })),
        };
      })
    );
    
    return unitsWithMembers;
  },
});

export const createUnit = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    building: v.optional(v.string()),
    floor: v.optional(v.number()),
    type: v.optional(v.string()),
    size: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("vacant")),
  },
  handler: async (ctx, args) => {
    const { userId, member } = await requireAdmin(ctx);
    
    // Check if unit name already exists
    const existingUnit = await ctx.db
      .query("units")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();
    
    if (existingUnit) {
      throw new Error("A unit with this name already exists");
    }
    
    const unitId = await ctx.db.insert("units", {
      name: args.name,
      description: args.description,
      building: args.building,
      floor: args.floor,
      type: args.type,
      size: args.size,
      status: args.status,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log audit event
    await ctx.runMutation(internal.audit.logAuditEvent, {
      userId,
      memberId: member._id,
      action: "unit_created",
      entityType: "unit",
      entityId: unitId,
      description: `Created unit ${args.name}${args.building ? ` in ${args.building}` : ""}`,
      metadata: {
        unitName: args.name,
        building: args.building,
        floor: args.floor,
        type: args.type,
        size: args.size,
        status: args.status,
      },
    });
    
    return await ctx.db.get(unitId);
  },
});

export const updateUnit = mutation({
  args: {
    unitId: v.id("units"),
    name: v.string(),
    description: v.optional(v.string()),
    building: v.optional(v.string()),
    floor: v.optional(v.number()),
    type: v.optional(v.string()),
    size: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("vacant")),
  },
  handler: async (ctx, args) => {
    const { userId, member } = await requireAdmin(ctx);
    
    const unit = await ctx.db.get(args.unitId);
    if (!unit) {
      throw new Error("Unit not found");
    }
    
    // Check if new name conflicts with existing unit (excluding current unit)
    if (args.name !== unit.name) {
      const existingUnit = await ctx.db
        .query("units")
        .withIndex("by_name", (q) => q.eq("name", args.name))
        .unique();
      
      if (existingUnit) {
        throw new Error("A unit with this name already exists");
      }
    }
    
    // Update unit
    await ctx.db.patch(args.unitId, {
      name: args.name,
      description: args.description,
      building: args.building,
      floor: args.floor,
      type: args.type,
      size: args.size,
      status: args.status,
      updatedAt: Date.now(),
    });
    
    // If unit name changed, update all members with this unit
    if (args.name !== unit.name) {
      const members = await ctx.db
        .query("members")
        .withIndex("by_unit", (q) => q.eq("unit", unit.name))
        .collect();
      
      for (const member of members) {
        await ctx.db.patch(member._id, {
          unit: args.name,
        });
      }
    }

    // Log audit event
    await ctx.runMutation(internal.audit.logAuditEvent, {
      userId,
      memberId: member._id,
      action: "unit_updated",
      entityType: "unit",
      entityId: args.unitId,
      description: `Updated unit ${unit.name}${unit.name !== args.name ? ` (renamed to ${args.name})` : ""}`,
      metadata: {
        oldName: unit.name,
        newName: args.name,
        changes: {
          name: unit.name !== args.name,
          description: unit.description !== args.description,
          building: unit.building !== args.building,
          floor: unit.floor !== args.floor,
          type: unit.type !== args.type,
          size: unit.size !== args.size,
          status: unit.status !== args.status,
        },
      },
    });
    
    return await ctx.db.get(args.unitId);
  },
});

export const deleteUnit = mutation({
  args: {
    unitId: v.id("units"),
  },
  handler: async (ctx, args) => {
    const { userId, member } = await requireAdmin(ctx);
    
    const unit = await ctx.db.get(args.unitId);
    if (!unit) {
      throw new Error("Unit not found");
    }
    
    // Check if any members are assigned to this unit
    const members = await ctx.db
      .query("members")
      .withIndex("by_unit", (q) => q.eq("unit", unit.name))
      .collect();
    
    if (members.length > 0) {
      throw new Error("Cannot delete unit with assigned members. Please reassign or remove members first.");
    }
    
    await ctx.db.delete(args.unitId);

    // Log audit event
    await ctx.runMutation(internal.audit.logAuditEvent, {
      userId,
      memberId: member._id,
      action: "unit_deleted",
      entityType: "unit",
      entityId: args.unitId,
      description: `Deleted unit ${unit.name}${unit.building ? ` from ${unit.building}` : ""}`,
      metadata: {
        unitName: unit.name,
        building: unit.building,
        floor: unit.floor,
        type: unit.type,
        size: unit.size,
        status: unit.status,
      },
    });
  },
});

export const getUnitBuildings = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    
    const units = await ctx.db.query("units").collect();
    const buildings = [...new Set(units.map(unit => unit.building).filter(Boolean))];
    
    return buildings.sort();
  },
});

export const getUnitTypes = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    
    const units = await ctx.db.query("units").collect();
    const types = [...new Set(units.map(unit => unit.type).filter(Boolean))];
    
    return types.sort();
  },
});

export const getUnitStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    
    const units = await ctx.db.query("units").collect();
    const members = await ctx.db.query("members").collect();
    
    const stats = {
      totalUnits: units.length,
      activeUnits: units.filter(u => u.status === "active").length,
      vacantUnits: units.filter(u => u.status === "vacant").length,
      inactiveUnits: units.filter(u => u.status === "inactive").length,
      occupiedUnits: 0,
      totalMembers: members.length,
    };
    
    // Count occupied units (units with at least one member)
    const unitNames = new Set(members.map(m => m.unit).filter(Boolean));
    stats.occupiedUnits = unitNames.size;
    
    return stats;
  },
});

export const assignMemberToUnit = mutation({
  args: {
    memberId: v.id("members"),
    unitName: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, member: currentMember } = await requireAdmin(ctx);
    
    // Verify unit exists
    const unit = await ctx.db
      .query("units")
      .withIndex("by_name", (q) => q.eq("name", args.unitName))
      .unique();
    
    if (!unit) {
      throw new Error("Unit not found");
    }

    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    const oldUnit = member.unit;
    
    // Update member's unit
    await ctx.db.patch(args.memberId, {
      unit: args.unitName,
    });

    // Log audit event
    await ctx.runMutation(internal.audit.logAuditEvent, {
      userId,
      memberId: currentMember._id,
      action: "member_unit_assigned",
      entityType: "member",
      entityId: args.memberId,
      description: `Assigned ${member.name} to unit ${args.unitName}${oldUnit ? ` (previously ${oldUnit})` : ""}`,
      metadata: {
        memberName: member.name,
        memberEmail: member.email,
        oldUnit,
        newUnit: args.unitName,
      },
    });
  },
});

export const removeMemberFromUnit = mutation({
  args: {
    memberId: v.id("members"),
  },
  handler: async (ctx, args) => {
    const { userId, member: currentMember } = await requireAdmin(ctx);

    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    const oldUnit = member.unit;
    
    // Remove unit assignment from member
    await ctx.db.patch(args.memberId, {
      unit: undefined,
    });

    // Log audit event
    await ctx.runMutation(internal.audit.logAuditEvent, {
      userId,
      memberId: currentMember._id,
      action: "member_unit_removed",
      entityType: "member",
      entityId: args.memberId,
      description: `Removed ${member.name} from unit ${oldUnit || "unknown"}`,
      metadata: {
        memberName: member.name,
        memberEmail: member.email,
        removedFromUnit: oldUnit,
      },
    });
  },
});
