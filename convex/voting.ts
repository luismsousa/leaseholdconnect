import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required");
  }
  return userId;
}

async function getCurrentMember(ctx: QueryCtx | MutationCtx) {
  const userId = await requireAuth(ctx);
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const member = await ctx.db
    .query("members")
    .withIndex("by_email", (q) => q.eq("email", user.email || ""))
    .unique();
  
  if (!member) {
    throw new Error("Member not found");
  }

  return { userId, user, member };
}

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const { userId, user, member } = await getCurrentMember(ctx);
  
  if (member.role !== "admin") {
    throw new Error("Admin access required");
  }
  
  return { userId, user, member };
}

export const createVotingTopic = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    options: v.array(v.string()),
    startDate: v.number(),
    endDate: v.number(),
    allowMultipleVotes: v.boolean(),
    visibilityType: v.union(v.literal("all"), v.literal("units"), v.literal("admin")),
    visibleToUnits: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { userId, member } = await requireAdmin(ctx);
    
    const topicId = await ctx.db.insert("votingTopics", {
      title: args.title,
      description: args.description,
      options: args.options,
      createdBy: userId,
      createdAt: Date.now(),
      startDate: args.startDate,
      endDate: args.endDate,
      status: "draft",
      allowMultipleVotes: args.allowMultipleVotes,
      visibilityType: args.visibilityType,
      visibleToUnits: args.visibleToUnits,
    });

    // Log audit event
    await ctx.runMutation(internal.audit.logAuditEvent, {
      userId,
      memberId: member._id,
      action: "voting_topic_created",
      entityType: "voting_topic",
      entityId: topicId,
      description: `Created voting topic "${args.title}" with ${args.options.length} options`,
      metadata: {
        title: args.title,
        optionsCount: args.options.length,
        options: args.options,
        startDate: args.startDate,
        endDate: args.endDate,
        allowMultipleVotes: args.allowMultipleVotes,
        visibilityType: args.visibilityType,
        visibleToUnits: args.visibleToUnits,
      },
    });
  },
});

export const listVotingTopics = query({
  args: {
    status: v.optional(v.union(v.literal("draft"), v.literal("active"), v.literal("closed"))),
  },
  handler: async (ctx, args) => {
    const { member } = await getCurrentMember(ctx);
    
    let topics = await ctx.db.query("votingTopics").order("desc").collect();
    
    // Filter topics based on member's access level and unit
    topics = topics.filter(topic => {
      // Admins can see all topics
      if (member.role === "admin") {
        return true;
      }
      
      // Check visibility type (default to "all" for backward compatibility)
      const visibilityType = topic.visibilityType || "all";
      
      if (visibilityType === "admin") {
        return false; // Only admins can see admin-only topics
      }
      
      if (visibilityType === "all") {
        return true; // All members can see these topics
      }
      
      if (visibilityType === "units" && topic.visibleToUnits && member.unit) {
        return topic.visibleToUnits.includes(member.unit);
      }
      
      // Default to showing all topics for backward compatibility
      return true;
    });

    // Filter by status if specified
    if (args.status) {
      topics = topics.filter(topic => topic.status === args.status);
    }
    
    return topics;
  },
});

export const activateVotingTopic = mutation({
  args: {
    topicId: v.id("votingTopics"),
  },
  handler: async (ctx, args) => {
    const { userId, member } = await requireAdmin(ctx);
    
    const topic = await ctx.db.get(args.topicId);
    if (!topic) {
      throw new Error("Voting topic not found");
    }
    
    await ctx.db.patch(args.topicId, {
      status: "active",
    });

    // Log audit event
    await ctx.runMutation(internal.audit.logAuditEvent, {
      userId,
      memberId: member._id,
      action: "voting_topic_activated",
      entityType: "voting_topic",
      entityId: args.topicId,
      description: `Activated voting topic "${topic.title}"`,
      metadata: {
        title: topic.title,
        startDate: topic.startDate,
        endDate: topic.endDate,
      },
    });
  },
});

export const closeVotingTopic = mutation({
  args: {
    topicId: v.id("votingTopics"),
  },
  handler: async (ctx, args) => {
    const { userId, member } = await requireAdmin(ctx);
    
    const topic = await ctx.db.get(args.topicId);
    if (!topic) {
      throw new Error("Voting topic not found");
    }
    
    await ctx.db.patch(args.topicId, {
      status: "closed",
    });

    // Log audit event
    await ctx.runMutation(internal.audit.logAuditEvent, {
      userId,
      memberId: member._id,
      action: "voting_topic_closed",
      entityType: "voting_topic",
      entityId: args.topicId,
      description: `Closed voting topic "${topic.title}"`,
      metadata: {
        title: topic.title,
        endDate: topic.endDate,
      },
    });
  },
});

export const castVote = mutation({
  args: {
    topicId: v.id("votingTopics"),
    selectedOptions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, member } = await getCurrentMember(ctx);
    
    if (member.status !== "active") {
      throw new Error("Only active members can vote");
    }

    const topic = await ctx.db.get(args.topicId);
    if (!topic) {
      throw new Error("Voting topic not found");
    }
    
    // Check if member can access this topic
    if (member.role !== "admin") {
      const visibilityType = topic.visibilityType || "all";
      
      if (visibilityType === "admin") {
        throw new Error("Access denied");
      }
      
      if (visibilityType === "units" && topic.visibleToUnits && member.unit) {
        if (!topic.visibleToUnits.includes(member.unit)) {
          throw new Error("This voting topic is not available for your unit");
        }
      }
    }
    
    if (topic.status !== "active") {
      throw new Error("Voting is not active for this topic");
    }
    
    if (Date.now() > topic.endDate) {
      throw new Error("Voting period has ended");
    }

    // Check if user already voted
    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_member_and_topic", (q) => 
        q.eq("memberId", member._id).eq("topicId", args.topicId)
      )
      .unique();
    
    if (existingVote) {
      throw new Error("You have already voted on this topic");
    }

    // Validate selected options
    if (!topic.allowMultipleVotes && args.selectedOptions.length > 1) {
      throw new Error("Multiple votes not allowed for this topic");
    }
    
    for (const option of args.selectedOptions) {
      if (!topic.options.includes(option)) {
        throw new Error("Invalid voting option");
      }
    }

    const voteId = await ctx.db.insert("votes", {
      topicId: args.topicId,
      memberId: member._id,
      selectedOptions: args.selectedOptions,
      votedAt: Date.now(),
    });

    // Log audit event
    await ctx.runMutation(internal.audit.logAuditEvent, {
      userId,
      memberId: member._id,
      action: "vote_cast",
      entityType: "vote",
      entityId: voteId,
      description: `Cast vote on "${topic.title}" with ${args.selectedOptions.length} selection(s)`,
      metadata: {
        topicTitle: topic.title,
        topicId: args.topicId,
        selectedOptions: args.selectedOptions,
        memberUnit: member.unit,
      },
    });
  },
});

export const getVotingResults = query({
  args: {
    topicId: v.id("votingTopics"),
  },
  handler: async (ctx, args) => {
    const { member } = await getCurrentMember(ctx);
    
    const topic = await ctx.db.get(args.topicId);
    if (!topic) {
      throw new Error("Voting topic not found");
    }

    // Check if member can access this topic
    if (member.role !== "admin") {
      const visibilityType = topic.visibilityType || "all";
      
      if (visibilityType === "admin") {
        throw new Error("Access denied");
      }
      
      if (visibilityType === "units" && topic.visibleToUnits && member.unit) {
        if (!topic.visibleToUnits.includes(member.unit)) {
          throw new Error("Access denied");
        }
      }
    }

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_topic", (q) => q.eq("topicId", args.topicId))
      .collect();

    const results: Record<string, number> = {};
    topic.options.forEach(option => {
      results[option] = 0;
    });

    votes.forEach(vote => {
      vote.selectedOptions.forEach(option => {
        results[option] = (results[option] || 0) + 1;
      });
    });

    return {
      topic,
      results,
      totalVotes: votes.length,
    };
  },
});
