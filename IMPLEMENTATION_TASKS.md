# Implementation Tasks - Simplified Approach (No Live Users)

## Phase 1: Database Schema Migration

### Task 1.1: Update Schema Definition
**Priority: High | Estimated Time: 4-6 hours**

#### Subtasks:
- [ ] Add new table definitions to `convex/schema.ts`:
  - [ ] `plots` table (replaces `units`)
  - [ ] `leaseholders` table (replaces `members`)
  - [ ] `plotOwnership` table (new)
  - [ ] `residents` table (new)
- [ ] Update existing table definitions:
  - [ ] Update `associations.settings` to include `unclaimedVotesToResidents`
  - [ ] Update `votingTopics` to include `votingSharesRequired`
  - [ ] Update `votes` to include `voterType` and `votingShares`
  - [ ] Update `meetings` to include plot-based invitation fields
  - [ ] Update `meetingAttendance` to include `attendeeType`
- [ ] Remove old table definitions:
  - [ ] Remove `units` table
  - [ ] Remove `members` table
- [ ] Add appropriate indexes for new tables
- [ ] Test schema compilation

#### Files to modify:
- `convex/schema.ts`

### Task 1.2: Wipe Database and Deploy New Schema
**Priority: High | Estimated Time: 1-2 hours**

#### Subtasks:
- [ ] Backup current schema (for reference)
- [ ] Deploy new schema to Convex
- [ ] Verify all tables are created correctly
- [ ] Test basic functionality

#### Commands to run:
```bash
# Deploy new schema
npx convex dev --once

# Verify deployment
npx convex dashboard
```

## Phase 2: Backend API Development

### Task 2.1: Create New API Files
**Priority: High | Estimated Time: 8-10 hours**

#### Subtasks:
- [ ] Create `convex/plots.ts`:
  - [ ] `list` - List plots for association
  - [ ] `create` - Create new plot
  - [ ] `update` - Update plot details
  - [ ] `remove` - Remove plot
  - [ ] `getByName` - Get plot by name
- [ ] Create `convex/leaseholders.ts`:
  - [ ] `list` - List leaseholders
  - [ ] `create` - Add leaseholder
  - [ ] `update` - Update leaseholder
  - [ ] `remove` - Remove leaseholder
  - [ ] `getByEmail` - Get leaseholder by email
- [ ] Create `convex/plotOwnership.ts`:
  - [ ] `assign` - Assign plot to leaseholder
  - [ ] `transfer` - Transfer plot ownership
  - [ ] `listByLeaseholder` - List plots owned by leaseholder
  - [ ] `listByPlot` - List leaseholders for plot
- [ ] Create `convex/residents.ts`:
  - [ ] `list` - List residents
  - [ ] `create` - Add resident
  - [ ] `update` - Update resident
  - [ ] `remove` - Remove resident
  - [ ] `delegateVoting` - Delegate voting rights to resident

#### Files to create:
- `convex/plots.ts`
- `convex/leaseholders.ts`
- `convex/plotOwnership.ts`
- `convex/residents.ts`

### Task 2.2: Remove Old API Files
**Priority: High | Estimated Time: 1-2 hours**

#### Subtasks:
- [ ] Delete `convex/units.ts`
- [ ] Delete `convex/members.ts`
- [ ] Update any imports in other files
- [ ] Test that no references remain

#### Files to delete:
- `convex/units.ts`
- `convex/members.ts`

### Task 2.3: Update Voting System
**Priority: Medium | Estimated Time: 6-8 hours**

#### Subtasks:
- [ ] Update `convex/voting.ts`:
  - [ ] Update `createTopic` to support voting shares
  - [ ] Update `castVote` to handle different voter types
  - [ ] Add `calculateVotingShares` helper function
  - [ ] Add `validateVotingRights` helper function
- [ ] Create `convex/votingHelpers.ts`:
  - [ ] `getLeaseholderVotingShares` - Calculate total shares for leaseholder
  - [ ] `getResidentVotingRights` - Check if resident has voting rights
  - [ ] `handleUnclaimedVotes` - Handle unclaimed voting shares logic

#### Files to modify:
- `convex/voting.ts`
- `convex/votingHelpers.ts` (new)

### Task 2.4: Update Meeting System
**Priority: Medium | Estimated Time: 4-6 hours**

#### Subtasks:
- [ ] Update `convex/meetings.ts`:
  - [ ] Update `create` to support plot-based invitations
  - [ ] Update `sendInvitations` to handle leaseholders and residents
  - [ ] Update `getAttendance` to show attendee types
- [ ] Update `convex/meetingAttendance.ts`:
  - [ ] Update attendance tracking for different attendee types
  - [ ] Add functions to handle leaseholder vs resident attendance

#### Files to modify:
- `convex/meetings.ts`
- `convex/meetingAttendance.ts`

## Phase 3: Frontend UI Development

### Task 3.1: Create New UI Components
**Priority: Medium | Estimated Time: 8-10 hours**

#### Subtasks:
- [ ] Create `src/components/PlotsTab.tsx`:
  - [ ] Copy and modify `UnitsTab.tsx`
  - [ ] Update to use new plots API
  - [ ] Add voting shares display
  - [ ] Add ownership information
- [ ] Create `src/components/LeaseholdersTab.tsx`:
  - [ ] Copy and modify `MembersTab.tsx`
  - [ ] Update to use new leaseholders API
  - [ ] Add voting shares display
  - [ ] Add plot ownership management
- [ ] Create `src/components/ResidentsTab.tsx`:
  - [ ] New component for resident management
  - [ ] Add resident creation/editing
  - [ ] Add voting rights delegation
  - [ ] Add move-in/move-out tracking

#### Files to create:
- `src/components/PlotsTab.tsx`
- `src/components/LeaseholdersTab.tsx`
- `src/components/ResidentsTab.tsx`

### Task 3.2: Create Modal Components
**Priority: Medium | Estimated Time: 6-8 hours**

#### Subtasks:
- [ ] Create `src/components/PlotOwnershipModal.tsx`:
  - [ ] Modal to assign plots to leaseholders
  - [ ] Transfer ownership functionality
  - [ ] Voting shares assignment
- [ ] Create `src/components/VotingRightsModal.tsx`:
  - [ ] Modal to delegate voting rights to residents
  - [ ] Set delegation period
  - [ ] Revoke delegation functionality
- [ ] Create `src/components/ResidentModal.tsx`:
  - [ ] Modal to add/edit residents
  - [ ] Move-in/move-out date tracking
  - [ ] Relationship type selection

#### Files to create:
- `src/components/PlotOwnershipModal.tsx`
- `src/components/VotingRightsModal.tsx`
- `src/components/ResidentModal.tsx`

### Task 3.3: Update Existing Components
**Priority: Medium | Estimated Time: 6-8 hours**

#### Subtasks:
- [ ] Update `src/components/Dashboard.tsx`:
  - [ ] Replace Units tab with Plots tab
  - [ ] Replace Members tab with Leaseholders tab
  - [ ] Add Residents tab
  - [ ] Update statistics to show voting shares
- [ ] Update `src/components/MeetingsTab.tsx`:
  - [ ] Update invitation system for plots
  - [ ] Show leaseholder vs resident attendance
  - [ ] Update attendance tracking
- [ ] Update `src/components/VotingTab.tsx`:
  - [ ] Show voting shares in results
  - [ ] Handle different voter types
  - [ ] Update vote casting interface

#### Files to modify:
- `src/components/Dashboard.tsx`
- `src/components/MeetingsTab.tsx`
- `src/components/VotingTab.tsx`

### Task 3.4: Remove Old Components
**Priority: Low | Estimated Time: 1-2 hours**

#### Subtasks:
- [ ] Delete `src/components/UnitsTab.tsx`
- [ ] Delete `src/components/MembersTab.tsx`
- [ ] Update any imports in other files
- [ ] Test that no references remain

#### Files to delete:
- `src/components/UnitsTab.tsx`
- `src/components/MembersTab.tsx`

## Phase 4: Testing and Validation

### Task 4.1: Comprehensive Testing
**Priority: High | Estimated Time: 4-6 hours**

#### Subtasks:
- [ ] Test all new API functions
- [ ] Test UI components
- [ ] Test complete workflows
- [ ] Test voting system with new architecture
- [ ] Test meeting invitations
- [ ] Test document visibility
- [ ] Performance testing

### Task 4.2: Create Sample Data
**Priority: Medium | Estimated Time: 2-3 hours**

#### Subtasks:
- [ ] Create sample associations
- [ ] Create sample plots
- [ ] Create sample leaseholders
- [ ] Create sample residents
- [ ] Test plot ownership assignments
- [ ] Test voting rights delegation

## Immediate Next Steps (This Week)

### Day 1: Schema Update
- [ ] **Task 1.1**: Update schema definition
- [ ] **Task 1.2**: Wipe database and deploy new schema

### Day 2-3: Backend API
- [ ] **Task 2.1**: Create plots and leaseholders API files
- [ ] **Task 2.2**: Remove old API files

### Day 4-5: Frontend Components
- [ ] **Task 3.1**: Create PlotsTab and LeaseholdersTab
- [ ] **Task 3.3**: Update Dashboard to show new tabs

## Success Metrics

### Week 1 Goals:
- [ ] Schema updated and deployed
- [ ] Basic plots and leaseholders API functional
- [ ] PlotsTab and LeaseholdersTab components working
- [ ] No breaking changes to existing functionality

### Week 2 Goals:
- [ ] Complete voting system updates
- [ ] Complete meeting system updates
- [ ] All UI components functional
- [ ] Performance testing completed

## Benefits of Simplified Approach

### Advantages:
1. **No Migration Complexity**: Eliminates risk of data loss or corruption
2. **Clean Slate**: Start with optimal schema design
3. **Faster Implementation**: No need for complex migration logic
4. **Reduced Risk**: No data transformation issues
5. **Easier Testing**: Fresh start with known state

### Timeline Reduction:
- **Original Estimate**: 13-18 days
- **Simplified Estimate**: 8-12 days
- **Time Saved**: 5-6 days

## Risk Mitigation

### High Priority:
1. **Backup current schema** before changes
2. **Test thoroughly** before deploying
3. **Keep existing functionality** working during transition
4. **Document all changes** for reference

### Medium Priority:
1. **Gradual rollout** of new features
2. **User training** for new interface
3. **Performance monitoring** during transition
4. **Error handling** for edge cases 