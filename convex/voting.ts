import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getClerkUserId } from "./clerkHelpers";
import { Id } from "./_generated/dataModel";

// Helper function to check if user is member of association
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

// List voting topics for an association
export const listTopics = query({
  args: { 
    associationId: v.id("associations"),
    status: v.optional(v.union(v.literal("draft"), v.literal("active"), v.literal("closed"))),
  },
  handler: async (ctx, args) => {
    const { userId, membership } = await requireAssociationMember(ctx, args.associationId);

    let query = ctx.db
      .query("votingTopics")
      .withIndex("by_association", (q) => q.eq("associationId", args.associationId));

    if (args.status) {
      query = ctx.db
        .query("votingTopics")
        .withIndex("by_association_and_status", (q) => 
          q.eq("associationId", args.associationId).eq("status", args.status!)
        );
    }

    let topics = await query.order("desc").collect();

    // Non-admin members should only see:
    // - Active topics
    // - Their own drafts (proposals)
    if (membership.role !== "owner" && membership.role !== "admin") {
      topics = topics.filter((t) => t.status === "active" || t.createdBy === userId);
    }

    // Preload unit assignments to determine vote weights (units per member)
    const assignments = await ctx.db
      .query("memberUnits")
      .withIndex("by_association_and_member", (q) =>
        q.eq("associationId", args.associationId)
      )
      .collect();

    const memberUnitCount = new Map<string, number>();
    for (const a of assignments) {
      const key = (a as any).memberId as string;
      memberUnitCount.set(key, (memberUnitCount.get(key) ?? 0) + 1);
    }

    // Total units in the association (denominator for participation %)
    const totalUnitsCount = (
      await ctx.db
        .query("units")
        .withIndex("by_association", (q) => q.eq("associationId", args.associationId))
        .collect()
    ).length;

    // Get weighted vote counts and unit participation for each topic
    const topicsWithCounts = await Promise.all(
      topics.map(async (topic) => {
        const votes = await ctx.db
          .query("votes")
          .withIndex("by_association_and_topic", (q) =>
            q.eq("associationId", args.associationId).eq("topicId", topic._id)
          )
          .collect();

        const voteCounts: Record<string, number> = {};
        topic.options.forEach((option) => {
          voteCounts[option] = 0;
        });

        const voterIds = new Set<string>();

        for (const vote of votes) {
          const memberId = (vote as any).memberId as string;
          voterIds.add(memberId);
          const weight = memberUnitCount.get(memberId) ?? 0; // vote weight = number of units owned
          for (const option of vote.selectedOptions) {
            if (voteCounts[option] === undefined) voteCounts[option] = 0;
            voteCounts[option] += weight;
          }
        }

        const totalWeightedVotes = Object.values(voteCounts).reduce(
          (sum, n) => sum + n,
          0,
        );

        // Units that have voted = sum of units owned by members who cast a vote
        const unitsVoted = Array.from(voterIds).reduce(
          (sum, id) => sum + (memberUnitCount.get(id) ?? 0),
          0,
        );
        const unitsVotedPercent = totalUnitsCount > 0 ? (unitsVoted / totalUnitsCount) * 100 : 0;

        return {
          ...topic,
          totalVotes: totalWeightedVotes,
          voteCounts,
          unitsVoted,
          totalUnits: totalUnitsCount,
          unitsVotedPercent,
        };
      })
    );

    return topicsWithCounts;
  },
});

// Create voting topic
export const createTopic = mutation({
  args: {
    associationId: v.id("associations"),
    title: v.string(),
    description: v.string(),
    options: v.array(v.string()),
    startDate: v.number(),
    endDate: v.number(),
    allowMultipleVotes: v.boolean(),
    visibilityType: v.optional(v.union(v.literal("all"), v.literal("units"), v.literal("admin"))),
    visibleToUnits: v.optional(v.array(v.string())),
    meetingId: v.optional(v.id("meetings")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAssociationAdmin(ctx, args.associationId);

    const topicId = await ctx.db.insert("votingTopics", {
      ...args,
      status: "draft",
      createdBy: userId,
      createdAt: Date.now(),
    });

    return topicId;
  },
});

// Allow regular members to propose a topic. Proposals are stored as drafts
// and are only visible to the creator and admins in listTopics.
export const proposeTopic = mutation({
  args: {
    associationId: v.id("associations"),
    title: v.string(),
    description: v.string(),
    options: v.array(v.string()),
    startDate: v.number(),
    endDate: v.number(),
    allowMultipleVotes: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAssociationMember(ctx, args.associationId);

    const topicId = await ctx.db.insert("votingTopics", {
      associationId: args.associationId,
      title: args.title,
      description: args.description,
      options: args.options,
      startDate: args.startDate,
      endDate: args.endDate,
      allowMultipleVotes: args.allowMultipleVotes,
      status: "draft",
      createdBy: userId,
      createdAt: Date.now(),
    });

    return topicId;
  },
});

// Update voting topic
export const updateTopic = mutation({
  args: {
    id: v.id("votingTopics"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    options: v.optional(v.array(v.string())),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    status: v.optional(v.union(v.literal("draft"), v.literal("active"), v.literal("closed"))),
    allowMultipleVotes: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const topic = await ctx.db.get(args.id);
    if (!topic) {
      throw new Error("Voting topic not found");
    }

    await requireAssociationAdmin(ctx, topic.associationId);

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);

    return id;
  },
});

// Cast vote
export const vote = mutation({
  args: {
    topicId: v.id("votingTopics"),
    selectedOptions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const topic = await ctx.db.get(args.topicId);
    if (!topic) {
      throw new Error("Voting topic not found");
    }

    if (topic.status !== "active") {
      throw new Error("Voting is not currently active for this topic");
    }

    const now = Date.now();
    if (now < topic.startDate || now > topic.endDate) {
      throw new Error("Voting period has ended or not yet started");
    }

    const { userId } = await requireAssociationMember(ctx, topic.associationId);

    // Get current member
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("User email not found");
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_association_and_email", (q) => 
        q.eq("associationId", topic.associationId).eq("email", identity.email!)
      )
      .first();

    if (!member) {
      throw new Error("Member record not found");
    }

    // Validate selected options
    const invalidOptions = args.selectedOptions.filter(option => 
      !topic.options.includes(option)
    );
    if (invalidOptions.length > 0) {
      throw new Error(`Invalid options: ${invalidOptions.join(", ")}`);
    }

    if (!topic.allowMultipleVotes && args.selectedOptions.length > 1) {
      throw new Error("Multiple votes not allowed for this topic");
    }

    // Check if user has already voted
    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_member_and_topic", (q) => 
        q.eq("memberId", member._id).eq("topicId", args.topicId)
      )
      .first();

    if (existingVote) {
      // Update existing vote
      await ctx.db.patch(existingVote._id, {
        selectedOptions: args.selectedOptions,
        votedAt: Date.now(),
      });
      return existingVote._id;
    } else {
      // Create new vote
      const voteId = await ctx.db.insert("votes", {
        associationId: topic.associationId,
        topicId: args.topicId,
        memberId: member._id,
        selectedOptions: args.selectedOptions,
        votedAt: Date.now(),
      });
      return voteId;
    }
  },
});

// Get user's vote for a topic
export const getUserVote = query({
  args: {
    topicId: v.id("votingTopics"),
  },
  handler: async (ctx, args) => {
    const topic = await ctx.db.get(args.topicId);
    if (!topic) {
      throw new Error("Voting topic not found");
    }

    const { userId } = await requireAssociationMember(ctx, topic.associationId);

    // Get current member
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      return null;
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_association_and_email", (q) => 
        q.eq("associationId", topic.associationId).eq("email", identity.email!)
      )
      .first();

    if (!member) {
      return null;
    }

    const vote = await ctx.db
      .query("votes")
      .withIndex("by_member_and_topic", (q) => 
        q.eq("memberId", member._id).eq("topicId", args.topicId)
      )
      .first();

    return vote;
  },
});
