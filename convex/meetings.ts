import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getClerkUserId } from "./clerkHelpers";
import { Id } from "./_generated/dataModel";

// Helper function to check if user is admin of association
async function requireAssociationMember(ctx: any, associationId: Id<"associations">) {
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

  if (!membership) {
    throw new Error("Not authorized for this association");
  }

  return { userId, membership };
}

async function requireAssociationAdmin(ctx: any, associationId: Id<"associations">) {
  const { userId, membership } = await requireAssociationMember(ctx, associationId);
  
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Admin access required");
  }

  return { userId, membership };
}

// List meetings for an association
export const list = query({
  args: { 
    associationId: v.id("associations"),
    status: v.optional(v.union(v.literal("draft"), v.literal("scheduled"), v.literal("cancelled"), v.literal("completed"))),
  },
  handler: async (ctx, args) => {
    await requireAssociationMember(ctx, args.associationId);

    let query = ctx.db
      .query("meetings")
      .withIndex("by_association", (q) => q.eq("associationId", args.associationId));

    if (args.status) {
      query = ctx.db
        .query("meetings")
        .withIndex("by_association_and_status", (q) => 
          q.eq("associationId", args.associationId).eq("status", args.status!)
        );
    }

    return await query.order("desc").collect();
  },
});

// Create meeting
export const create = mutation({
  args: {
    associationId: v.id("associations"),
    title: v.string(),
    description: v.string(),
    type: v.union(v.literal("agm"), v.literal("egm"), v.literal("board"), v.literal("general")),
    scheduledDate: v.number(),
    location: v.string(),
    inviteAllMembers: v.optional(v.boolean()),
    invitedUnits: v.optional(v.array(v.string())),
    agenda: v.array(v.object({
      id: v.string(),
      title: v.string(),
      description: v.optional(v.string()),
      type: v.union(v.literal("discussion"), v.literal("voting"), v.literal("presentation"), v.literal("other")),
      estimatedDuration: v.optional(v.number()),
      votingTopicId: v.optional(v.id("votingTopics")),
      documentIds: v.optional(v.array(v.id("documents"))),
    })),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAssociationAdmin(ctx, args.associationId);

    const meetingId = await ctx.db.insert("meetings", {
      ...args,
      status: "draft",
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      notificationsSent: false,
      remindersSent: false,
    });

    return meetingId;
  },
});

// Update meeting
export const update = mutation({
  args: {
    id: v.id("meetings"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    scheduledDate: v.optional(v.number()),
    location: v.optional(v.string()),
    status: v.optional(v.union(v.literal("draft"), v.literal("scheduled"), v.literal("cancelled"), v.literal("completed"))),
    agenda: v.optional(v.array(v.object({
      id: v.string(),
      title: v.string(),
      description: v.optional(v.string()),
      type: v.union(v.literal("discussion"), v.literal("voting"), v.literal("presentation"), v.literal("other")),
      estimatedDuration: v.optional(v.number()),
      votingTopicId: v.optional(v.id("votingTopics")),
      documentIds: v.optional(v.array(v.id("documents"))),
    }))),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.id);
    if (!meeting) {
      throw new Error("Meeting not found");
    }

    await requireAssociationAdmin(ctx, meeting.associationId);

    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

// Delete meeting
export const remove = mutation({
  args: {
    id: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.id);
    if (!meeting) {
      throw new Error("Meeting not found");
    }

    await requireAssociationAdmin(ctx, meeting.associationId);

    await ctx.db.delete(args.id);
    return args.id;
  },
});

// RSVP to meeting
export const rsvp = mutation({
  args: {
    meetingId: v.id("meetings"),
    status: v.union(v.literal("attending"), v.literal("not_attending"), v.literal("maybe")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) {
      throw new Error("Meeting not found");
    }

    const { userId } = await requireAssociationMember(ctx, meeting.associationId);

    // Get current member
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("User email not found");
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_association_and_email", (q) => 
        q.eq("associationId", meeting.associationId).eq("email", identity.email!)
      )
      .first();

    if (!member) {
      throw new Error("Member record not found");
    }

    // Check if RSVP already exists
    const existingRsvp = await ctx.db
      .query("meetingAttendance")
      .withIndex("by_meeting_and_member", (q) => 
        q.eq("meetingId", args.meetingId).eq("memberId", member._id)
      )
      .first();

    if (existingRsvp) {
      await ctx.db.patch(existingRsvp._id, {
        status: args.status,
        notes: args.notes,
        responseDate: Date.now(),
      });
      return existingRsvp._id;
    } else {
      const rsvpId = await ctx.db.insert("meetingAttendance", {
        associationId: meeting.associationId,
        meetingId: args.meetingId,
        memberId: member._id,
        status: args.status,
        notes: args.notes,
        responseDate: Date.now(),
      });
      return rsvpId;
    }
  },
});
