import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export function useAuditLog() {
  const logAuditEvent = useMutation(api.auditHelpers.logAuditEventMutation);

  const logEvent = async (
    associationId: Id<"associations">,
    action: string,
    entityType: string,
    description: string,
    entityId?: string,
    memberId?: Id<"members">,
    metadata?: any,
  ) => {
    try {
      await logAuditEvent({
        associationId,
        action,
        entityType,
        description,
        entityId,
        memberId,
        metadata,
      });
    } catch (error) {
      console.error("Failed to log audit event:", error);
      // Don't throw - audit logging should not break the main functionality
    }
  };

  return { logEvent };
}

// Predefined audit actions for consistency
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

// Predefined entity types for consistency
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
