# Leaseholder-Based Architecture Implementation Plan

## Target Data Architecture

### Core Entities

#### 1. Plots (replaces Units)
```typescript
plots: defineTable({
  associationId: v.id("associations"),
  name: v.string(), // e.g., "Plot 101", "A-1", "Unit 5"
  description: v.optional(v.string()),
  building: v.optional(v.string()),
  floor: v.optional(v.number()),
  size: v.optional(v.string()), // "1200 sq ft", "2BR/2BA"
  votingShares: v.number(), // Number of voting shares this plot represents
  status: v.union(v.literal("active"), v.literal("inactive"), v.literal("vacant")),
  createdBy: v.optional(v.string()), // Clerk user ID
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

#### 2. Leaseholders (replaces Members)
```typescript
leaseholders: defineTable({
  associationId: v.id("associations"),
  userId: v.string(), // Clerk user ID
  name: v.string(),
  email: v.string(),
  phone: v.optional(v.string()),
  address: v.optional(v.string()),
  totalVotingShares: v.number(), // Calculated from plot ownership
  status: v.union(v.literal("active"), v.literal("inactive"), v.literal("invited")),
  invitedBy: v.optional(v.string()), // Clerk user ID
  invitedAt: v.optional(v.number()),
  joinedAt: v.optional(v.number()),
  permissions: v.optional(v.array(v.string())),
})
```

#### 3. Plot Ownership (new)
```typescript
plotOwnership: defineTable({
  associationId: v.id("associations"),
  plotId: v.id("plots"),
  leaseholderId: v.id("leaseholders"),
  votingShares: v.number(), // Shares for this specific plot
  ownershipStartDate: v.number(),
  ownershipEndDate: v.optional(v.number()),
  status: v.union(v.literal("active"), v.literal("pending"), v.literal("terminated")),
})
```

#### 4. Residents (new)
```typescript
residents: defineTable({
  associationId: v.id("associations"),
  plotId: v.id("plots"),
  name: v.string(),
  email: v.string(),
  phone: v.optional(v.string()),
  relationship: v.optional(v.string()), // "tenant", "family", "guest"
  moveInDate: v.number(),
  moveOutDate: v.optional(v.number()),
  status: v.union(v.literal("active"), v.literal("inactive"), v.literal("moved_out")),
  hasVotingRights: v.boolean(), // Whether they have delegated voting rights
  delegatedBy: v.optional(v.id("leaseholders")), // Who delegated voting rights
  delegationStartDate: v.optional(v.number()),
  delegationEndDate: v.optional(v.number()),
})
```

#### 5. Updated Association Settings
```typescript
associations: defineTable({
  // ... existing fields ...
  settings: v.optional(
    v.object({
      allowSelfRegistration: v.boolean(),
      requireAdminApproval: v.boolean(),
      maxLeaseholders: v.optional(v.number()),
      maxPlots: v.optional(v.number()),
      unclaimedVotesToResidents: v.boolean(), // New setting
    }),
  ),
})
```

#### 6. Updated Voting System
```typescript
votingTopics: defineTable({
  // ... existing fields ...
  votingSharesRequired: v.optional(v.number()), // Minimum shares to pass
})

votes: defineTable({
  associationId: v.id("associations"),
  topicId: v.id("votingTopics"),
  voterId: v.string(), // Can be leaseholder or resident ID
  voterType: v.union(v.literal("leaseholder"), v.literal("resident")),
  votingShares: v.number(), // Number of shares used in this vote
  selectedOptions: v.array(v.string()),
  votedAt: v.number(),
})
```

#### 7. Updated Meeting System
```typescript
meetings: defineTable({
  // ... existing fields ...
  inviteAllLeaseholders: v.optional(v.boolean()),
  inviteAllResidents: v.optional(v.boolean()),
  invitedPlots: v.optional(v.array(v.string())), // Plot names
})

meetingAttendance: defineTable({
  associationId: v.id("associations"),
  meetingId: v.id("meetings"),
  attendeeId: v.string(), // Can be leaseholder or resident ID
  attendeeType: v.union(v.literal("leaseholder"), v.literal("resident")),
  status: v.union(v.literal("attending"), v.literal("not_attending"), v.literal("maybe")),
  responseDate: v.number(),
  notes: v.optional(v.string()),
})
```

## Implementation Plan

### Phase 1: Database Schema Migration
**Priority: High | Estimated Time: 2-3 days**

#### Tasks:
1. **Create new schema tables**
   - [ ] Add `plots` table
   - [ ] Add `leaseholders` table  
   - [ ] Add `plotOwnership` table
   - [ ] Add `residents` table
   - [ ] Update `associations` table with new settings
   - [ ] Update `votingTopics` and `votes` tables
   - [ ] Update `meetings` and `meetingAttendance` tables

2. **Create migration functions**
   - [ ] Write data migration from `units` to `plots`
   - [ ] Write data migration from `members` to `leaseholders`
   - [ ] Create `plotOwnership` records based on existing member-unit relationships
   - [ ] Handle edge cases and data validation

3. **Update indexes and queries**
   - [ ] Add appropriate indexes for new tables
   - [ ] Update existing queries to work with new schema
   - [ ] Test data integrity and performance

### Phase 2: Backend API Updates
**Priority: High | Estimated Time: 3-4 days**

#### Tasks:
1. **Create new API functions**
   - [ ] `plots.list` - List plots for association
   - [ ] `plots.create` - Create new plot
   - [ ] `plots.update` - Update plot details
   - [ ] `plots.remove` - Remove plot
   - [ ] `leaseholders.list` - List leaseholders
   - [ ] `leaseholders.create` - Add leaseholder
   - [ ] `leaseholders.update` - Update leaseholder
   - [ ] `leaseholders.remove` - Remove leaseholder
   - [ ] `plotOwnership.assign` - Assign plot to leaseholder
   - [ ] `plotOwnership.transfer` - Transfer plot ownership
   - [ ] `residents.list` - List residents
   - [ ] `residents.create` - Add resident
   - [ ] `residents.update` - Update resident
   - [ ] `residents.remove` - Remove resident
   - [ ] `residents.delegateVoting` - Delegate voting rights to resident

2. **Update existing API functions**
   - [ ] Update `meetings.create` to support plot-based invitations
   - [ ] Update `votingTopics.create` to support voting shares
   - [ ] Update `votes.cast` to handle different voter types
   - [ ] Update `documents.create` to support plot-based visibility

3. **Add helper functions**
   - [ ] Calculate total voting shares for leaseholders
   - [ ] Validate voting rights for residents
   - [ ] Handle unclaimed voting shares logic
   - [ ] Generate voting reports

### Phase 3: Frontend UI Updates
**Priority: Medium | Estimated Time: 4-5 days**

#### Tasks:
1. **Create new UI components**
   - [ ] `PlotsTab.tsx` - Replace UnitsTab
   - [ ] `LeaseholdersTab.tsx` - Replace MembersTab
   - [ ] `ResidentsTab.tsx` - New component
   - [ ] `PlotOwnershipModal.tsx` - Assign plots to leaseholders
   - [ ] `VotingRightsModal.tsx` - Delegate voting rights

2. **Update existing components**
   - [ ] Update `Dashboard.tsx` to show new tabs
   - [ ] Update `MeetingsTab.tsx` for plot-based invitations
   - [ ] Update `VotingTab.tsx` for voting shares
   - [ ] Update `DocumentsTab.tsx` for plot-based visibility

3. **Add new features**
   - [ ] Plot ownership management interface
   - [ ] Voting rights delegation interface
   - [ ] Voting share calculations display
   - [ ] Resident management interface

### Phase 4: Data Migration
**Priority: High | Estimated Time: 1-2 days**

#### Tasks:
1. **Create migration scripts**
   - [ ] Convert existing units to plots
   - [ ] Convert existing members to leaseholders
   - [ ] Create plot ownership records
   - [ ] Handle data validation and error cases
   - [ ] Create rollback procedures

2. **Test migration**
   - [ ] Test on development environment
   - [ ] Validate data integrity
   - [ ] Test performance impact
   - [ ] Create backup procedures

### Phase 5: Testing and Validation
**Priority: Medium | Estimated Time: 2-3 days**

#### Tasks:
1. **Unit testing**
   - [ ] Test all new API functions
   - [ ] Test data validation
   - [ ] Test edge cases

2. **Integration testing**
   - [ ] Test complete workflows
   - [ ] Test voting system with new architecture
   - [ ] Test meeting invitations
   - [ ] Test document visibility

3. **User acceptance testing**
   - [ ] Test with sample data
   - [ ] Validate business logic
   - [ ] Test performance

### Phase 6: Documentation and Training
**Priority: Low | Estimated Time: 1 day**

#### Tasks:
1. **Update documentation**
   - [ ] Update API documentation
   - [ ] Update user guides
   - [ ] Create migration guides

2. **User training**
   - [ ] Create training materials
   - [ ] Document new features
   - [ ] Create troubleshooting guides

## Risk Assessment

### High Risk Items:
1. **Data Migration**: Risk of data loss during migration
   - Mitigation: Comprehensive backup and rollback procedures
   
2. **Voting System Changes**: Risk of breaking existing voting functionality
   - Mitigation: Thorough testing and gradual rollout

3. **Performance Impact**: New schema might impact performance
   - Mitigation: Performance testing and optimization

### Medium Risk Items:
1. **UI Complexity**: New interface might be confusing
   - Mitigation: User testing and clear documentation

2. **Data Validation**: Complex relationships might lead to data inconsistencies
   - Mitigation: Comprehensive validation rules

## Success Criteria

1. **Data Integrity**: All existing data successfully migrated
2. **Functionality**: All existing features work with new architecture
3. **Performance**: No significant performance degradation
4. **User Experience**: New interface is intuitive and efficient
5. **Business Logic**: Voting rights correctly reflect property ownership

## Timeline Estimate

- **Phase 1**: 2-3 days
- **Phase 2**: 3-4 days  
- **Phase 3**: 4-5 days
- **Phase 4**: 1-2 days
- **Phase 5**: 2-3 days
- **Phase 6**: 1 day

**Total Estimated Time: 13-18 days**

## Next Steps

1. **Review and approve architecture design**
2. **Set up development environment for new schema**
3. **Begin Phase 1 implementation**
4. **Create detailed task breakdown for each phase**
5. **Set up testing environment**
6. **Begin implementation following the phased approach** 