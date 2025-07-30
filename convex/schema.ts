import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const applicationTables = {
  // Users table for Clerk integration
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    tokenIdentifier: v.string(),
    isAnonymous: v.optional(v.boolean()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"]),

  // PaaS Admin table for platform administrators
  paasAdmins: defineTable({
    userId: v.string(), // Clerk user ID
    role: v.union(
      v.literal("super_admin"),
      v.literal("support"),
      v.literal("billing"),
    ),
    permissions: v.array(v.string()),
    createdAt: v.number(),
    createdBy: v.optional(v.string()), // Clerk user ID
    isActive: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_role_and_status", ["role", "isActive"]),

  associations: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    website: v.optional(v.string()),
    // Subscription/billing info
    subscriptionTier: v.union(
      v.literal("free"),
      v.literal("basic"),
      v.literal("premium"),
    ),
    subscriptionStatus: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("trial"),
      v.literal("suspended"),
    ),
    trialEndsAt: v.optional(v.number()),
    // Settings
    settings: v.optional(
      v.object({
        allowSelfRegistration: v.boolean(),
        requireAdminApproval: v.boolean(),
        maxMembers: v.optional(v.number()),
        maxUnits: v.optional(v.number()),
      }),
    ),
    // Metadata
    createdBy: v.string(), // Clerk user ID
    createdAt: v.number(),
    updatedAt: v.number(),
    isActive: v.boolean(),
    // PaaS admin fields
    suspendedAt: v.optional(v.number()),
    suspendedBy: v.optional(v.string()), // Clerk user ID
    suspensionReason: v.optional(v.string()),
  })
    .index("by_name", ["name"])
    .index("by_creator", ["createdBy"])
    .index("by_status_and_subscription", ["isActive", "subscriptionStatus"])
    .index("by_subscription_tier", ["subscriptionTier"]),

  associationMembers: defineTable({
    associationId: v.id("associations"),
    userId: v.string(), // Clerk user ID
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("invited"),
    ),
    invitedBy: v.optional(v.string()), // Clerk user ID
    invitedAt: v.optional(v.number()),
    joinedAt: v.optional(v.number()),
    // Permissions
    permissions: v.optional(v.array(v.string())),
  })
    .index("by_association", ["associationId"])
    .index("by_user", ["userId"])
    .index("by_association_and_user", ["associationId", "userId"])
    .index("by_association_and_role", ["associationId", "role"])
    .index("by_association_and_status", ["associationId", "status"]),

  // User preferences for association context
  userPreferences: defineTable({
    userId: v.string(), // Clerk user ID
    selectedAssociationId: v.optional(v.id("associations")),
    preferences: v.optional(
      v.object({
        theme: v.optional(v.string()),
        notifications: v.optional(v.boolean()),
        language: v.optional(v.string()),
      }),
    ),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  members: defineTable({
    associationId: v.id("associations"),
    email: v.string(),
    name: v.string(),
    unit: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("member")),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("invited"),
    ),
    invitedBy: v.optional(v.string()), // Clerk user ID
    invitedAt: v.optional(v.number()),
    joinedAt: v.optional(v.number()),
    // Deactivation fields
    deactivatedAt: v.optional(v.number()),
    deactivatedBy: v.optional(v.string()), // Clerk user ID
    deactivationReason: v.optional(v.string()),
    // Reactivation fields
    reactivatedAt: v.optional(v.number()),
    reactivatedBy: v.optional(v.string()), // Clerk user ID
  })
    .index("by_association", ["associationId"])
    .index("by_association_and_email", ["associationId", "email"])
    .index("by_association_and_status", ["associationId", "status"])
    .index("by_association_and_role", ["associationId", "role"])
    .index("by_association_and_unit", ["associationId", "unit"])
    .index("by_email", ["email"]),

  units: defineTable({
    associationId: v.id("associations"),
    name: v.string(),
    description: v.optional(v.string()),
    building: v.optional(v.string()),
    floor: v.optional(v.number()),
    type: v.optional(v.string()),
    size: v.optional(v.string()),
    createdBy: v.optional(v.string()), // Clerk user ID
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_association", ["associationId"])
    .index("by_association_and_name", ["associationId", "name"])
    .index("by_association_and_building", ["associationId", "building"]),

  documents: defineTable({
    associationId: v.id("associations"),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    fileId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    uploadedBy: v.id("members"),
    uploadedAt: v.number(),
    isPublic: v.boolean(),
    visibilityType: v.union(
      v.literal("all"),
      v.literal("buildings"),
      v.literal("admin"),
    ),
    visibleToBuildings: v.optional(v.array(v.string())),
    downloadUrl: v.optional(v.string()),
    meetingId: v.optional(v.id("meetings")),
  })
    .index("by_association", ["associationId"])
    .index("by_association_and_category", ["associationId", "category"])
    .index("by_association_and_uploader", ["associationId", "uploadedBy"])
    .index("by_association_and_visibility", ["associationId", "visibilityType"])
    .index("by_association_and_upload_date", ["associationId", "uploadedAt"])
    .index("by_association_and_meeting", ["associationId", "meetingId"]),

  meetings: defineTable({
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
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("cancelled"),
      v.literal("completed"),
      v.literal("archived"),
    ),
    createdBy: v.string(), // Clerk user ID
    createdAt: v.number(),
    updatedAt: v.number(),
    scheduledAt: v.optional(v.number()), // When the meeting was scheduled (notifications sent)
    scheduledBy: v.optional(v.string()), // Clerk user ID - Who scheduled the meeting
    // Invitation settings
    inviteAllMembers: v.optional(v.boolean()),
    invitedUnits: v.optional(v.array(v.string())),
    // Meeting details
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
        estimatedDuration: v.optional(v.number()), // in minutes
        votingTopicId: v.optional(v.id("votingTopics")),
        documentIds: v.optional(v.array(v.id("documents"))),
      }),
    ),
    // Notifications
    notificationsSent: v.boolean(),
    remindersSent: v.boolean(),
    // Meeting outcomes
    attendanceCount: v.optional(v.number()),
    minutesDocumentId: v.optional(v.id("documents")),
    notes: v.optional(v.string()),
  })
    .index("by_association", ["associationId"])
    .index("by_association_and_date", ["associationId", "scheduledDate"])
    .index("by_association_and_status", ["associationId", "status"])
    .index("by_association_and_type", ["associationId", "type"])
    .index("by_association_and_creator", ["associationId", "createdBy"]),

  meetingAttendance: defineTable({
    associationId: v.id("associations"),
    meetingId: v.id("meetings"),
    memberId: v.id("members"),
    status: v.union(
      v.literal("attending"),
      v.literal("not_attending"),
      v.literal("maybe"),
    ),
    responseDate: v.number(),
    notes: v.optional(v.string()),
  })
    .index("by_association", ["associationId"])
    .index("by_association_and_meeting", ["associationId", "meetingId"])
    .index("by_association_and_member", ["associationId", "memberId"])
    .index("by_meeting_and_member", ["meetingId", "memberId"])
    .index("by_meeting_and_status", ["meetingId", "status"]),

  votingTopics: defineTable({
    associationId: v.id("associations"),
    title: v.string(),
    description: v.string(),
    options: v.array(v.string()),
    createdBy: v.string(), // Clerk user ID
    createdAt: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("closed"),
    ),
    allowMultipleVotes: v.boolean(),
    visibilityType: v.optional(
      v.union(v.literal("all"), v.literal("units"), v.literal("admin")),
    ),
    visibleToUnits: v.optional(v.array(v.string())),
    meetingId: v.optional(v.id("meetings")),
  })
    .index("by_association", ["associationId"])
    .index("by_association_and_status", ["associationId", "status"])
    .index("by_association_and_creator", ["associationId", "createdBy"])
    .index("by_association_and_dates", [
      "associationId",
      "startDate",
      "endDate",
    ])
    .index("by_association_and_meeting", ["associationId", "meetingId"]),

  votes: defineTable({
    associationId: v.id("associations"),
    topicId: v.id("votingTopics"),
    memberId: v.id("members"),
    selectedOptions: v.array(v.string()),
    votedAt: v.number(),
  })
    .index("by_association", ["associationId"])
    .index("by_association_and_topic", ["associationId", "topicId"])
    .index("by_association_and_member", ["associationId", "memberId"])
    .index("by_member_and_topic", ["memberId", "topicId"]),

  auditLogs: defineTable({
    associationId: v.union(v.id("associations"), v.string()), // Allow system-level logs
    userId: v.string(), // Clerk user ID
    memberId: v.optional(v.id("members")),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    description: v.optional(v.string()),
    details: v.optional(v.any()),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_association", ["associationId"])
    .index("by_association_and_timestamp", ["associationId", "timestamp"])
    .index("by_association_and_user", ["associationId", "userId"])
    .index("by_association_and_member", ["associationId", "memberId"])
    .index("by_association_and_action", ["associationId", "action"])
    .index("by_association_and_entity", [
      "associationId",
      "entityType",
      "entityId",
    ]),

  // Enterprise leads table for contact form submissions
  leads: defineTable({
    name: v.string(),
    email: v.string(),
    companyName: v.string(),
    phoneNumber: v.string(),
    message: v.string(),
    status: v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("qualified"),
      v.literal("converted"),
      v.literal("lost"),
    ),
    notes: v.optional(v.string()),
    assignedTo: v.optional(v.string()), // Clerk user ID of PaaS admin
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"])
    .index("by_assigned_to", ["assignedTo"]),
};

export default defineSchema({
  ...applicationTables,
});
