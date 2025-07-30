import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getClerkUserId } from "./clerkHelpers";
import { Id } from "./_generated/dataModel";

// Helper function to log audit events
export async function logAuditEvent(
  ctx: any,
  associationId: Id<"associations">,
  action: string,
  entityType: string,
  description: string,
  entityId?: string,
  memberId?: Id<"members">,
  metadata?: any,
) {
  const userId = await getClerkUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required for audit logging");
  }

  await ctx.db.insert("auditLogs", {
    associationId,
    userId,
    memberId,
    action,
    entityType,
    entityId,
    description,
    metadata,
    timestamp: Date.now(),
  });
}

// Common audit actions
export const AUDIT_ACTIONS = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  VIEW: "view",
  LOGIN: "login",
  LOGOUT: "logout",
  APPROVE: "approve",
  REJECT: "reject",
  INVITE: "invite",
  REMOVE: "remove",
  UPLOAD: "upload",
  DOWNLOAD: "download",
  VOTE: "vote",
  ATTEND: "attend",
} as const;

// Common entity types
export const ENTITY_TYPES = {
  MEMBER: "member",
  MEETING: "meeting",
  DOCUMENT: "document",
  UNIT: "unit",
  ASSOCIATION: "association",
  VOTING_TOPIC: "voting_topic",
  VOTE: "vote",
  ATTENDANCE: "attendance",
} as const;

// Helper mutation for logging audit events from the client
export const logAuditEventMutation = mutation({
  args: {
    associationId: v.id("associations"),
    action: v.string(),
    entityType: v.string(),
    description: v.string(),
    entityId: v.optional(v.string()),
    memberId: v.optional(v.id("members")),
    metadata: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await logAuditEvent(
      ctx,
      args.associationId,
      args.action,
      args.entityType,
      args.description,
      args.entityId,
      args.memberId,
      args.metadata,
    );
    return null;
  },
});
