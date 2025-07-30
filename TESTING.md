# Testing Documentation

This document describes the testing setup for the Leaseholders Association Management App.

## Test Setup

The project uses Vitest for testing with the following configuration:

- **Test Framework**: Vitest
- **Testing Library**: @testing-library/react for component testing
- **User Events**: @testing-library/user-event for user interaction testing
- **Environment**: jsdom for DOM simulation

## Running Tests

### Available Scripts

```bash
# Run tests in watch mode
npm test

# Run tests with UI
npm run test:ui

# Run tests once
npm run test:run
```

### Test Files

- `src/test/setup.ts` - Test setup and global mocks
- `src/test/meetings-simple.test.tsx` - Basic meetings functionality tests
- `convex/test/meetings.test.ts` - Backend meetings function tests (work in progress)

## Test Structure

### Component Tests

Component tests focus on:
- Rendering behavior
- User interactions
- State management
- Form validation
- Error handling

### Backend Tests

Backend tests focus on:
- Function logic
- Database operations
- Authentication
- Authorization
- Data validation

## Mocking Strategy

### Convex Mocks

Due to Convex's architecture, we use the following mocking strategy:

```typescript
// Mock Convex hooks
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));
```

### Component Mocks

For complex components that depend heavily on Convex, we create simplified mocks:

```typescript
vi.mock("../components/MeetingsTab", () => ({
  MeetingsTab: ({ associationId }: { associationId: string }) => (
    <div data-testid="meetings-tab">
      <h1>Meetings</h1>
      <p>Association ID: {associationId}</p>
    </div>
  ),
}));
```

## Test Categories

### 1. Unit Tests
- Individual function testing
- Component rendering
- State management
- Form validation

### 2. Integration Tests
- Component interaction
- Data flow
- API integration

### 3. User Experience Tests
- User interactions
- Form submissions
- Navigation
- Error handling

## Meeting Functionality Tests

### Frontend Tests

The meetings functionality includes tests for:

1. **Component Rendering**
   - Meetings list display
   - Loading states
   - Empty states
   - Status filtering

2. **User Interactions**
   - Creating meetings
   - Editing meetings
   - Deleting meetings
   - Status changes (schedule, complete, archive, cancel)

3. **Form Handling**
   - Meeting creation form
   - Agenda item management
   - Unit selection for invitations
   - Date and time handling

4. **Data Validation**
   - Required fields
   - Meeting types
   - Status transitions
   - Date validation

### Backend Tests

The backend meetings functions include tests for:

1. **CRUD Operations**
   - Create meetings
   - Read meetings (list, get)
   - Update meetings
   - Delete meetings

2. **Status Management**
   - Draft to scheduled
   - Scheduled to completed
   - Completed to archived
   - Cancellation handling

3. **Authorization**
   - Admin access requirements
   - Member access validation
   - Association membership checks

4. **Data Integrity**
   - Meeting validation
   - Agenda item validation
   - RSVP handling
   - Attendance tracking

## Test Data

### Mock Meetings

```typescript
const mockMeetings = [
  {
    _id: "meeting1",
    title: "Annual General Meeting",
    description: "Annual meeting for all members",
    type: "agm",
    scheduledDate: Date.now() + 86400000,
    location: "Community Hall",
    status: "scheduled",
    // ... other properties
  }
];
```

### Mock Users and Associations

```typescript
const mockAssociationId = "association123";
const mockUserId = "user123";
```

## Best Practices

### 1. Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### 2. Mocking
- Mock external dependencies
- Use realistic mock data
- Avoid over-mocking

### 3. Assertions
- Test behavior, not implementation
- Use specific assertions
- Test error conditions

### 4. Test Isolation
- Reset mocks between tests
- Use beforeEach for setup
- Avoid test interdependence

## Running Specific Tests

### Run a specific test file
```bash
npm test meetings-simple.test.tsx
```

### Run tests matching a pattern
```bash
npm test -- --grep "MeetingsTab"
```

### Run tests in a specific directory
```bash
npm test src/test/
```

## Debugging Tests

### Enable Debug Output
```bash
npm test -- --reporter=verbose
```

### Debug with Console
```bash
npm test -- --reporter=verbose --no-coverage
```

## Coverage

To generate coverage reports:

```bash
npm test -- --coverage
```

## Continuous Integration

Tests are configured to run in CI environments with:

- Node.js 18+
- npm install
- npm run test:run

## Troubleshooting

### Common Issues

1. **Convex Mock Issues**
   - Ensure proper mock setup in setup.ts
   - Check import paths
   - Verify mock function signatures

2. **Component Rendering Issues**
   - Check for missing dependencies
   - Verify mock implementations
   - Ensure proper test environment setup

3. **Async Test Issues**
   - Use proper async/await patterns
   - Wait for state updates
   - Handle promise rejections

### Debug Tips

1. **Console Logging**
   ```typescript
   console.log('Test data:', mockData);
   ```

2. **Screen Debug**
   ```typescript
   screen.debug();
   ```

3. **Mock Inspection**
   ```typescript
   console.log('Mock calls:', mockFunction.mock.calls);
   ```

## Future Improvements

1. **Enhanced Backend Testing**
   - Complete Convex function testing
   - Database operation mocking
   - Authentication flow testing

2. **E2E Testing**
   - Playwright integration
   - Full user journey testing
   - Cross-browser testing

3. **Performance Testing**
   - Component rendering performance
   - Database query optimization
   - Memory leak detection

4. **Accessibility Testing**
   - Screen reader compatibility
   - Keyboard navigation
   - Color contrast validation 