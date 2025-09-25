# Frontend Test Utilities

This directory contains comprehensive testing infrastructure for the TRPG frontend application, following the project's strict guidelines for type safety and quality.

## 📋 Core Principles

Following CLAUDE.md guidelines:

- **Production Types Only**: All test data uses production types from `@ai-agent-trpg/types`
- **No Test-Specific Types**: Never create test-specific type definitions
- **t-WADA Naming**: Tests follow `*.{unit,integration}.spec.{ts,tsx}` conventions
- **Real User Workflows**: Test only normal user interactions, no forced clicks on disabled elements

## 🗂️ Directory Structure

```
src/tests/
├── setup.ts                 # Global test setup and mocks
├── vitest.d.ts              # TypeScript declarations for Vitest
├── utils/
│   ├── index.ts             # Main exports
│   ├── render.tsx           # Custom render functions with providers
│   ├── websocket-mock.ts    # WebSocket/Socket.IO mocking
│   ├── test-data-factories.ts # Production type factories
│   ├── test-helpers.ts      # Common test utilities
│   └── example.unit.spec.tsx # Usage examples
└── README.md                # This file
```

## 🚀 Quick Start

### Basic Component Testing

```tsx
import { renderWithProviders, setupUserEvent } from '@/tests/utils';

describe('MyComponent', () => {
  it('should render and handle interactions', async () => {
    const user = setupUserEvent();
    const { getByTestId } = renderWithProviders(<MyComponent />);
    
    const button = getByTestId('my-button');
    await user.click(button);
    
    expect(getByTestId('result')).toBeInTheDocument();
  });
});
```

### Recoil State Testing

```tsx
import { renderWithRecoil, createTestCampaign } from '@/tests/utils';
import { currentCampaignAtom } from '@/store/atoms';

it('should work with Recoil state', () => {
  const campaign = createTestCampaign();
  
  const { getByText } = renderWithRecoil(<CampaignComponent />, {
    recoilState: [
      { recoilState: currentCampaignAtom, initialValue: campaign }
    ]
  });
  
  expect(getByText(campaign.title)).toBeInTheDocument();
});
```

### WebSocket Testing

```tsx
import { createWebSocketTestEnvironment, TRPGWebSocketEvents } from '@/tests/utils';

describe('Session WebSocket', () => {
  it('should handle session events', () => {
    const { mockSocket, simulator } = createWebSocketTestEnvironment();
    
    // Setup component with mock socket
    const { getByTestId } = renderWithProviders(
      <SessionComponent socket={mockSocket} />
    );
    
    // Simulate events
    simulator.simulateSessionStart({ sessionId: 'test-session' });
    
    expect(getByTestId('session-active')).toBeInTheDocument();
  });
});
```

## 🧪 Available Scripts

```bash
# Run all unit tests
pnpm test:unit

# Run tests in watch mode
pnpm test:unit:watch

# Run tests with UI
pnpm test:unit:ui

# Run tests with coverage
pnpm test:unit:coverage

# Run tests once (CI mode)
pnpm test:unit:run
```

## 📚 Available Utilities

### Render Functions

- `renderWithProviders()`: Full provider setup (Recoil, Router, Theme, Snackbar)
- `renderWithRecoil()`: Recoil state management only
- `renderWithRouter()`: React Router only
- `renderWithTheme()`: Material-UI theme only
- `renderWithMinimalProviders()`: Lightweight setup

### Test Data Factories

All factories create data using production types:

- `createTestCampaign()`
- `createTestCharacter()`, `createTestTRPGCharacter()`, `createTestNPCCharacter()`
- `createTestSession()`, `createTestSessionState()`
- `createTestChatMessage()`, `createTestDiceRoll()`
- `createTestLocation()`, `createTestQuest()`
- `createCompleteTestCampaignSetup()`

### WebSocket Mocking

- `createMockSocket()`: Mock socket instance
- `TRPGWebSocketSimulator`: TRPG-specific event simulation
- `createWebSocketTestEnvironment()`: Complete WebSocket test setup
- `waitForSocketEvent()`: Async event waiting

### Test Helpers

- `setupUserEvent()`: Configured user event simulation
- `fillForm()`: Form filling helper
- `expectErrorMessage()`, `expectSuccessMessage()`: Message assertions
- `expectLoadingState()`: Loading state verification
- `setupTimers()`: Timer mocking utilities
- `cleanupAfterTest()`: Comprehensive cleanup

## 🎯 Test Naming Conventions

Following t-WADA conventions:

- `*.unit.spec.tsx`: Unit tests for individual components
- `*.integration.spec.tsx`: Integration tests across multiple components
- `*.test.tsx`: General test files (discouraged, prefer spec files)

## ⚠️ Important Guidelines

### Type Safety

```tsx
// ✅ Correct: Using production types
const campaign = createTestCampaign();
expect(campaign.id).toBe('test-campaign-1');

// ❌ Wrong: Creating test-specific types
interface TestCampaign { // Don't do this!
  id: string;
  name: string;
}
```

### User Interactions

```tsx
// ✅ Correct: Normal user flow
const button = getByRole('button');
if (!button.disabled) {
  await user.click(button);
}

// ❌ Wrong: Forcing disabled interactions
await user.click(disabledButton); // Don't do this!
```

### Error Handling

```tsx
// ✅ Correct: Test actual error states
it('should show retry option on API error', () => {
  mockFetchResponse(null, 500);
  // ... test retry functionality
});

// ❌ Wrong: Hiding errors with fallbacks
it('should show fallback content', () => {
  // This violates the "no fallback" principle
});
```

## 🔧 Configuration

### Vitest Configuration

Key settings in `vitest.config.ts`:

- **Environment**: jsdom for DOM testing
- **Setup Files**: Global mocks and extensions
- **Coverage**: v8 provider with 70% thresholds
- **Timeouts**: 10s for async operations
- **Include Pattern**: `*.{unit,integration}.spec.{ts,tsx}`

### Coverage Thresholds

- Branches: 70%
- Functions: 70% 
- Lines: 70%
- Statements: 70%

## 🐛 Debugging

### Debug Utilities

```tsx
import { debugDOM, debugRecoilState } from '@/tests/utils';

it('should debug test state', () => {
  renderWithProviders(<MyComponent />);
  
  // Debug DOM state
  debugDOM();
  
  // Debug Recoil state (development only)
  debugRecoilState();
});
```

### Console Error Suppression

```tsx
import { suppressConsoleError } from '@/tests/utils';

describe('Component with expected errors', () => {
  it('should suppress known console errors', () => {
    const restore = suppressConsoleError([
      'Warning: ReactDOM.render is deprecated',
      /Failed to load resource/
    ]);
    
    // ... test code
    
    restore();
  });
});
```

## 📖 Examples

See `example.unit.spec.tsx` for comprehensive usage examples demonstrating:

- Basic component rendering
- Recoil state management
- User interaction testing
- Async operation handling
- Error state testing
- API mocking
- Accessibility testing

## 🤝 Contributing

When adding new test utilities:

1. Follow the existing patterns
2. Use production types only
3. Add JSDoc documentation
4. Include usage examples
5. Update this README if needed

Remember: **"テストデータは、本番と同じ型を使って作成してください"**