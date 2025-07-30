# Audit Logging System

This document describes the audit logging system implemented for the leaseholders association management app.

## Overview

The audit logging system tracks user activities within associations, providing administrators with visibility into system usage and helping with compliance and security monitoring.

## Features

- **Role-based access**: Admins see all logs, members see only their own activity
- **Comprehensive filtering**: Filter by entity type, entity ID, action type, and date ranges
- **Statistics dashboard**: View audit statistics and trends
- **Real-time logging**: Events are logged immediately as they occur
- **Rich metadata**: Support for additional context and metadata

## Database Schema

The audit logs are stored in the `auditLogs` table with the following structure:

```typescript
auditLogs: defineTable({
  associationId: v.id("associations"),
  userId: v.string(), // Clerk user ID
  memberId: v.optional(v.id("members")),
  action: v.string(),
  entityType: v.string(),
  entityId: v.optional(v.string()),
  description: v.optional(v.string()),
  details: v.optional(v.any()),
  metadata: v.optional(v.any()),
  timestamp: v.number(),
});
```

## Backend Functions

### Core Functions (`convex/audit.ts`)

- `log`: Log an audit event
- `list`: Retrieve audit logs with filtering
- `getStats`: Get audit statistics
- `getMyActivity`: Get current user's activity

### Helper Functions (`convex/auditHelpers.ts`)

- `logAuditEvent`: Internal helper for logging events
- `logAuditEventMutation`: Client-accessible mutation for logging
- `AUDIT_ACTIONS`: Predefined action constants
- `ENTITY_TYPES`: Predefined entity type constants

## Frontend Integration

### React Hook (`src/lib/useAuditLog.ts`)

```typescript
import { useAuditLog, AUDIT_ACTIONS, ENTITY_TYPES } from "../lib/useAuditLog";

function MyComponent() {
  const { logEvent } = useAuditLog();

  const handleSomeAction = () => {
    logEvent(
      associationId,
      AUDIT_ACTIONS.CREATE,
      ENTITY_TYPES.MEMBER,
      "Created new member",
      memberId,
      memberId,
      { additionalData: "context" },
    );
  };
}
```

### Audit Tab Component (`src/components/AuditTab.tsx`)

The main audit interface provides:

- Statistics dashboard
- Personal activity feed
- Advanced filtering options
- Detailed audit log table

## Usage Examples

### Logging Member Creation

```typescript
// In a mutation or action
await logAuditEvent(
  ctx,
  associationId,
  "create",
  "member",
  `Created new member: ${memberName}`,
  memberId,
  memberId,
  { email: memberEmail, role: memberRole },
);
```

### Logging Document Access

```typescript
// In a query or mutation
await logAuditEvent(
  ctx,
  associationId,
  "view",
  "document",
  `Viewed document: ${documentTitle}`,
  documentId,
  undefined,
  { category: documentCategory },
);
```

### Logging Meeting Actions

```typescript
// In a mutation
await logAuditEvent(
  ctx,
  associationId,
  "update",
  "meeting",
  `Updated meeting: ${meetingTitle}`,
  meetingId,
  undefined,
  { changes: ["date", "location"] },
);
```

## Access Control

### Admin Access

- Association owners and admins can view all audit logs
- Full filtering and statistics access
- Can see activity from all users

### Member Access

- Regular members can only see their own activity
- Limited to personal audit trail
- Cannot access admin statistics

## Filtering Options

The audit system supports multiple filtering methods:

1. **By Entity**: Filter logs for specific entity types and IDs
2. **By Action**: Filter logs for specific action types
3. **By Date**: View logs within specific time ranges
4. **By User**: Admins can filter by specific users
5. **By Member**: Filter logs related to specific members

## Best Practices

### When to Log Events

Log audit events for:

- **Data modifications**: Create, update, delete operations
- **Access events**: Login, logout, document views
- **Administrative actions**: Role changes, permissions updates
- **Sensitive operations**: Member removals, association settings changes

### What to Include

- **Clear descriptions**: Use human-readable descriptions
- **Entity IDs**: Include relevant entity identifiers
- **Metadata**: Add context-specific information
- **Member associations**: Link events to specific members when relevant

### Performance Considerations

- Audit logging is asynchronous and non-blocking
- Failed audit logs don't break main functionality
- Use appropriate indexes for efficient querying
- Consider log retention policies for long-term storage

## Integration Guide

### Adding Audit Logging to Existing Components

1. Import the audit hook:

```typescript
import { useAuditLog, AUDIT_ACTIONS, ENTITY_TYPES } from "../lib/useAuditLog";
```

2. Use the hook in your component:

```typescript
const { logEvent } = useAuditLog();
```

3. Log events after successful operations:

```typescript
const handleCreateMember = async () => {
  try {
    await createMember(memberData);
    await logEvent(
      associationId,
      AUDIT_ACTIONS.CREATE,
      ENTITY_TYPES.MEMBER,
      `Created member: ${memberData.name}`,
      newMemberId,
      newMemberId,
    );
    toast.success("Member created successfully");
  } catch (error) {
    toast.error("Failed to create member");
  }
};
```

### Backend Integration

For backend-only audit logging:

```typescript
import { logAuditEvent } from "./auditHelpers";

export const someMutation = mutation({
  args: {
    /* ... */
  },
  handler: async (ctx, args) => {
    // ... main logic ...

    await logAuditEvent(
      ctx,
      args.associationId,
      "create",
      "member",
      "Created new member",
      memberId,
      memberId,
    );

    return result;
  },
});
```

## Monitoring and Maintenance

### Regular Tasks

1. **Review audit logs**: Regularly check for unusual patterns
2. **Clean old logs**: Implement retention policies
3. **Monitor performance**: Ensure queries remain efficient
4. **Update filters**: Add new entity types and actions as needed

### Troubleshooting

- **Missing logs**: Check authentication and permissions
- **Performance issues**: Review query indexes and filters
- **Permission errors**: Verify user roles and association membership

## Security Considerations

- Audit logs are immutable once created
- Access is controlled by association membership and role
- Sensitive data should be carefully considered in descriptions
- Log retention should align with data protection requirements
