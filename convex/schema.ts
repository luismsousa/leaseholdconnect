import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  members: defineTable({
    email: v.string(),
    name: v.string(),
    unit: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("member")),
    status: v.union(v.literal("active"), v.literal("invited"), v.literal("inactive")),
    invitedBy: v.optional(v.id("users")),
    invitedAt: v.optional(v.number()),
    joinedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_unit", ["unit"]),

  units: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    building: v.optional(v.string()),
    floor: v.optional(v.number()),
    type: v.optional(v.string()), // e.g., "apartment", "townhouse", "commercial"
    size: v.optional(v.string()), // e.g., "2BR/2BA", "1500 sq ft"
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("vacant")),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_building", ["building"])
    .index("by_status", ["status"])
    .index("by_floor", ["floor"]),

  documents: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    fileId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    uploadedBy: v.id("users"),
    uploadedAt: v.number(),
    isPublic: v.boolean(),
    visibleToUnits: v.optional(v.array(v.string())), // Units that can see this document
    visibilityType: v.optional(v.union(v.literal("all"), v.literal("units"), v.literal("admin"))), // New field for visibility control
  })
    .index("by_category", ["category"])
    .index("by_uploaded_at", ["uploadedAt"]),

  votingTopics: defineTable({
    title: v.string(),
    description: v.string(),
    options: v.array(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("closed")),
    allowMultipleVotes: v.boolean(),
    visibleToUnits: v.optional(v.array(v.string())), // Units that can vote on this topic
    visibilityType: v.optional(v.union(v.literal("all"), v.literal("units"), v.literal("admin"))), // New field for visibility control
  })
    .index("by_status", ["status"])
    .index("by_end_date", ["endDate"]),

  votes: defineTable({
    topicId: v.id("votingTopics"),
    memberId: v.id("members"),
    selectedOptions: v.array(v.string()),
    votedAt: v.number(),
  })
    .index("by_topic", ["topicId"])
    .index("by_member_and_topic", ["memberId", "topicId"]),

  invitations: defineTable({
    email: v.string(),
    name: v.string(),
    unit: v.optional(v.string()),
    invitedBy: v.id("users"),
    invitedAt: v.number(),
    token: v.string(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("expired")),
    expiresAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_token", ["token"])
    .index("by_status", ["status"]),

  auditLogs: defineTable({
    userId: v.id("users"),
    memberId: v.optional(v.id("members")),
    action: v.string(), // e.g., "member_invited", "document_uploaded", "vote_cast"
    entityType: v.string(), // e.g., "member", "document", "vote", "unit"
    entityId: v.optional(v.string()), // ID of the affected entity
    details: v.object({
      description: v.string(),
      metadata: v.optional(v.any()), // Additional context data
    }),
    timestamp: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_member", ["memberId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_action", ["action"])
    .index("by_entity_type", ["entityType"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
