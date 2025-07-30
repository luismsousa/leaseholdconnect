import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getClerkUserId } from "./clerkHelpers";
import { Id } from "./_generated/dataModel";

// Helper function to check if user is admin of association
async function requireAssociationMember(
  ctx: any,
  associationId: Id<"associations">,
) {
  const userId = await getClerkUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required");
  }

  const membership = await ctx.db
    .query("associationMembers")
    .withIndex("by_association_and_user", (q: any) =>
      q.eq("associationId", associationId).eq("userId", userId),
    )
    .filter((q: any) => q.eq(q.field("status"), "active"))
    .first();

  if (!membership) {
    throw new Error("Not authorized for this association");
  }

  return { userId, membership };
}

async function requireAssociationAdmin(
  ctx: any,
  associationId: Id<"associations">,
) {
  const { userId, membership } = await requireAssociationMember(
    ctx,
    associationId,
  );

  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Admin access required");
  }

  return { userId, membership };
}

// List meetings for an association
export const list = query({
  args: {
    associationId: v.id("associations"),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("scheduled"),
        v.literal("cancelled"),
        v.literal("completed"),
        v.literal("archived"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    await requireAssociationMember(ctx, args.associationId);

    let query = ctx.db
      .query("meetings")
      .withIndex("by_association", (q) =>
        q.eq("associationId", args.associationId),
      );

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

// Get a single meeting by ID
export const get = query({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) {
      throw new Error("Meeting not found");
    }

    await requireAssociationMember(ctx, meeting.associationId);
    return meeting;
  },
});

// Create meeting
export const create = mutation({
  args: {
    associationId: v.id("associations"),
    title: v.string(),
    description: v.string(),
    type: v.union(
      v.literal("agm"),
      v.literal("egm"),
      v.literal("board"),
      v.literal("general"),
    ),
    scheduledDate: v.number(),
    location: v.string(),
    inviteAllMembers: v.optional(v.boolean()),
    invitedUnits: v.optional(v.array(v.string())),
    agenda: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        type: v.union(
          v.literal("discussion"),
          v.literal("voting"),
          v.literal("presentation"),
          v.literal("other"),
        ),
        estimatedDuration: v.optional(v.number()),
        votingTopicId: v.optional(v.id("votingTopics")),
        documentIds: v.optional(v.array(v.id("documents"))),
      }),
    ),
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
    type: v.optional(
      v.union(
        v.literal("agm"),
        v.literal("egm"),
        v.literal("board"),
        v.literal("general"),
      ),
    ),
    scheduledDate: v.optional(v.number()),
    location: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("scheduled"),
        v.literal("cancelled"),
        v.literal("completed"),
        v.literal("archived"),
      ),
    ),
    inviteAllMembers: v.optional(v.boolean()),
    invitedUnits: v.optional(v.array(v.string())),
    agenda: v.optional(
      v.array(
        v.object({
          id: v.string(),
          title: v.string(),
          description: v.optional(v.string()),
          type: v.union(
            v.literal("discussion"),
            v.literal("voting"),
            v.literal("presentation"),
            v.literal("other"),
          ),
          estimatedDuration: v.optional(v.number()),
          votingTopicId: v.optional(v.id("votingTopics")),
          documentIds: v.optional(v.array(v.id("documents"))),
        }),
      ),
    ),
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
    status: v.union(
      v.literal("attending"),
      v.literal("not_attending"),
      v.literal("maybe"),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) {
      throw new Error("Meeting not found");
    }


    // Get current member
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("User email not found");
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_association_and_email", (q) =>
        q
          .eq("associationId", meeting.associationId)
          .eq("email", identity.email!)
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

// Schedule a meeting (change status from draft to scheduled)
export const schedule = mutation({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) {
      throw new Error("Meeting not found");
    }

    if (meeting.status !== "draft") {
      throw new Error("Only draft meetings can be scheduled");
    }

    await requireAssociationAdmin(ctx, meeting.associationId);

    const userId = await getClerkUserId(ctx);
    await ctx.db.patch(args.meetingId, {
      status: "scheduled",
      scheduledAt: Date.now(),
      scheduledBy: userId || undefined,
      updatedAt: Date.now(),
    });

    return args.meetingId;
  },
});

// Complete a meeting (change status from scheduled to completed)
export const complete = mutation({
  args: {
    meetingId: v.id("meetings"),
    attendanceCount: v.optional(v.number()),
    notes: v.optional(v.string()),
    minutesDocumentId: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) {
      throw new Error("Meeting not found");
    }

    if (meeting.status !== "scheduled") {
      throw new Error("Only scheduled meetings can be completed");
    }

    await requireAssociationAdmin(ctx, meeting.associationId);

    const { meetingId, ...updates } = args;
    await ctx.db.patch(meetingId, {
      status: "completed",
      ...updates,
      updatedAt: Date.now(),
    });

    return meetingId;
  },
});

// Archive a meeting (change status from completed to archived)
export const archive = mutation({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) {
      throw new Error("Meeting not found");
    }

    if (meeting.status !== "completed") {
      throw new Error("Only completed meetings can be archived");
    }

    await requireAssociationAdmin(ctx, meeting.associationId);

    await ctx.db.patch(args.meetingId, {
      status: "archived",
      updatedAt: Date.now(),
    });

    return args.meetingId;
  },
});

// Cancel a meeting
export const cancel = mutation({
  args: {
    meetingId: v.id("meetings"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) {
      throw new Error("Meeting not found");
    }

    if (meeting.status === "completed" || meeting.status === "archived") {
      throw new Error("Cannot cancel completed or archived meetings");
    }

    await requireAssociationAdmin(ctx, meeting.associationId);

    await ctx.db.patch(args.meetingId, {
      status: "cancelled",
      notes: args.reason ? `Cancelled: ${args.reason}` : "Meeting cancelled",
      updatedAt: Date.now(),
    });

    return args.meetingId;
  },
});

// Get meeting attendance
export const getAttendance = query({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) {
      throw new Error("Meeting not found");
    }

    await requireAssociationMember(ctx, meeting.associationId);

    const attendance = await ctx.db
      .query("meetingAttendance")
      .withIndex("by_association_and_meeting", (q) =>
        q
          .eq("associationId", meeting.associationId)
          .eq("meetingId", args.meetingId)
      )
      .collect();

    // Get member details for each attendance record
    const attendanceWithDetails = await Promise.all(
      attendance.map(async (record) => {
        const member = await ctx.db.get(record.memberId);
        return {
          ...record,
          member: member,
        };
      }),
    );

    return attendanceWithDetails;
  },
});

// Get attendance statistics for a meeting
export const getAttendanceStats = query({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) {
      throw new Error("Meeting not found");
    }

    await requireAssociationMember(ctx, meeting.associationId);

    const attendance = await ctx.db
      .query("meetingAttendance")
      .withIndex("by_association_and_meeting", (q) =>
        q
          .eq("associationId", meeting.associationId)
          .eq("meetingId", args.meetingId)
      )
      .collect();

    const stats = {
      total: attendance.length,
      attending: attendance.filter((a) => a.status === "attending").length,
      notAttending: attendance.filter((a) => a.status === "not_attending")
        .length,
      maybe: attendance.filter((a) => a.status === "maybe").length,
      noResponse: 0, // Will be calculated below
    };

    // Get total members to calculate no response
    const totalMembers = await ctx.db
      .query("members")
      .withIndex("by_association_and_status", (q) =>
        q.eq("associationId", meeting.associationId).eq("status", "active")
      )
      .collect();

    stats.noResponse = totalMembers.length - stats.total;

    return stats;
  },
});
