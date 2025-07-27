# Backend Testing Setup - Comprehensive Guide

## Overview

This document provides a complete guide to the backend testing setup for the AI-powered TRPG Game Master proxy server. The testing infrastructure is built on Jest with TypeScript support and follows t-WADA naming conventions.

## Quick Start

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit         # Run unit tests only
npm run test:integration  # Run integration tests only

# Development workflows
npm run test:watch        # Watch mode for development
npm run test:coverage     # Generate coverage report
npm run test:debug        # Debug mode with verbose output

# Type checking
npm run typecheck         # TypeScript type checking
```

## Project Structure

```
apps/proxy-server/
├── jest.config.ts                      # Main Jest configuration
├── jest.config.simple.ts               # Simplified configuration for basic testing
├── src/
│   ├── tests/
│   │   ├── setup/                       # Test setup and utilities
│   │   │   ├── index.ts                 # Centralized exports
│   │   │   ├── jest.setup.ts            # Global Jest setup (advanced)
│   │   │   ├── testDatabase.ts          # In-memory SQLite database utilities
│   │   │   └── testEnvironment.ts       # Test environment management
│   │   ├── utils/                       # Test helper functions
│   │   │   ├── testHelpers.ts           # Original test helpers (enhanced)
│   │   │   ├── testUtils.ts             # Comprehensive test utilities
│   │   │   └── testDataValidators.ts    # Data validation utilities
│   │   ├── services/                    # Service tests
│   │   │   └── aiGameMasterService.integration.test.ts
│   │   ├── simple.test.ts               # Basic functionality test
│   │   ├── sample.unit.test.ts          # Comprehensive setup demonstration
│   │   └── testRunner.ts                # Custom test runner utility
│   └── ...other source files
└── coverage/                            # Generated coverage reports
```

## Testing Conventions

### Naming Conventions (t-WADA)

- **Unit Tests**: `*.unit.test.ts` - Test individual functions/classes in isolation
- **Integration Tests**: `*.integration.test.ts` - Test component interactions
- **General Tests**: `*.test.ts` - Basic tests or mixed types

### File Organization

```typescript
// Example unit test structure
describe('ServiceName Unit Tests', () => {
  describe('methodName', () => {
    test('should handle normal case', () => {
      // Test implementation
    });
    
    test('should handle edge case', () => {
      // Test implementation
    });
    
    test('should throw error for invalid input', () => {
      // Test implementation
    });
  });
});
```

## Test Utilities

### Basic Test Helpers

```typescript
import { createMockRequest, createMockResponse } from './tests/utils/testHelpers';

// Express mocks
const mockReq = createMockRequest({
  method: 'POST',
  body: { campaignId: 'test-123' }
});

const mockRes = createMockResponse();
```

### Data Factory with Production Types

```typescript
import { TestDataFactory } from './tests/setup/testDatabase';

// Create test data using production types
const campaign = TestDataFactory.createTestCampaign({
  name: 'My Test Campaign',
  status: 'active'
});

const character = TestDataFactory.createTestCharacter(campaign.id, {
  name: 'Test Hero',
  type: 'PC',
  stats: { level: 5, hp: 100 }
});
```

### AI Provider Mocks

```typescript
import { AIProviderMocks } from './tests/utils/testUtils';

// Mock OpenAI response
const openAIResponse = AIProviderMocks.mockOpenAIResponse('AI generated content');

// Mock Anthropic (Claude) response
const claudeResponse = AIProviderMocks.mockAnthropicResponse('Claude response');

// Mock Google (Gemini) response
const geminiResponse = AIProviderMocks.mockGoogleResponse('Gemini response');
```

### Database Testing

```typescript
import { DatabaseTestUtils } from './tests/utils/testUtils';

// Insert test data
DatabaseTestUtils.insertTestCampaign(testDb, campaign);
DatabaseTestUtils.insertTestCharacter(testDb, character);

// Retrieve and verify
const retrievedCampaign = DatabaseTestUtils.getCampaign(testDb, campaign.id);
expect(retrievedCampaign).not.toBeNull();
```

## Configuration Details

### Jest Configuration (`jest.config.ts`)

Key features:
- **TypeScript Support**: Full ts-jest integration
- **Module Resolution**: Path mapping for imports
- **Coverage**: Configurable coverage collection and reporting
- **Timeouts**: 10-second default timeout for AI operations
- **Environment**: Node.js environment with test-specific setup

### Environment Variables

Test environment automatically sets:
```bash
NODE_ENV=test
DATABASE_URL=:memory:
LOG_LEVEL=error
```

## Writing Effective Tests

### 1. Unit Tests

Focus on testing individual functions in isolation:

```typescript
describe('campaignService.createCampaign', () => {
  test('should create campaign with valid data', async () => {
    const campaignData = TestDataFactory.createTestCampaign();
    const result = await campaignService.createCampaign(campaignData);
    
    expect(result).toBeValidTRPGCampaign();
    expect(result.id).toBeDefined();
  });
});
```

### 2. Integration Tests

Test component interactions and data flow:

```typescript
describe('AI Game Master Integration', () => {
  test('should generate response based on game context', async () => {
    // Setup test campaign and characters
    const campaign = TestDataFactory.createTestCampaign();
    const character = TestDataFactory.createTestCharacter(campaign.id);
    
    // Mock AI service
    const mockAI = jest.fn().mockResolvedValue('AI response');
    
    // Test the full flow
    const result = await aiGameMasterService.generateResponse(context);
    expect(result).toContain('AI response');
  });
});
```

### 3. Error Handling Tests

Always test error conditions:

```typescript
test('should handle AI service timeout', async () => {
  const slowCall = () => new Promise(resolve => 
    setTimeout(resolve, 1000)
  );
  
  await expect(
    AsyncTestUtils.withTimeout(slowCall(), 100)
  ).rejects.toThrow('Timeout after 100ms');
});
```

## Custom Jest Matchers

The setup includes custom matchers for TRPG-specific assertions:

```typescript
// Test TRPG entities
expect(campaign).toBeValidTRPGCampaign();
expect(character).toBeValidTRPGCharacter();
expect(aiResponse).toBeValidAIResponse();
```

## Best Practices

### 1. Use Production Types

**Always use production types from `@ai-agent-trpg/types`:**

```typescript
// ✅ Good
import { TRPGCampaign } from '@ai-agent-trpg/types';
const campaign: TRPGCampaign = TestDataFactory.createTestCampaign();

// ❌ Bad
const campaign = { id: 'test', name: 'test' }; // Incomplete, not type-safe
```

### 2. Test Environment Isolation

Each test runs in a clean environment:
- Fresh in-memory database
- Cleared mocks
- Reset environment variables

### 3. Meaningful Test Names

```typescript
// ✅ Good
test('should create campaign with AI-generated scenario when description provided', () => {});

// ❌ Bad
test('creates campaign', () => {});
```

### 4. Async Testing

Handle promises and timeouts properly:

```typescript
test('should handle async AI calls', async () => {
  const result = await AsyncTestUtils.withTimeout(
    aiService.generateContent(),
    5000
  );
  expect(result).toBeDefined();
});
```

## Coverage and Quality

### Coverage Goals
- **80%+ overall coverage** (configurable)
- **85%+ for core services** (aiGameMasterService, campaignService, characterService)

### Coverage Commands
```bash
npm run test:coverage              # Generate coverage report
npm run test:coverage:open         # Generate and open in browser
```

### Quality Checks
```bash
npm run lint                       # ESLint checks
npm run typecheck                  # TypeScript compilation check
npm run test:debug                 # Verbose test output for debugging
```

## Troubleshooting

### Common Issues

1. **"Cannot find module" errors**
   - Check `moduleNameMapper` in `jest.config.ts`
   - Verify import paths are correct

2. **Test timeouts**
   - Increase timeout for AI operations: `jest.setTimeout(30000)`
   - Use `AsyncTestUtils.withTimeout()` for specific operations

3. **Database errors**
   - Ensure test database is properly initialized
   - Check that tests are using the global `testDb` instance

4. **Mock issues**
   - Clear mocks between tests: `jest.clearAllMocks()`
   - Restore mocks after tests: `jest.restoreAllMocks()`

### Debug Mode

```bash
npm run test:debug                 # Verbose output
npm test -- --detectOpenHandles   # Find hanging processes
npm test -- --runInBand          # Run tests serially
```

## Example Test Files

See the following examples:
- `src/tests/simple.test.ts` - Basic Jest functionality
- `src/tests/sample.unit.test.ts` - Comprehensive setup demonstration
- `src/tests/services/aiGameMasterService.integration.test.ts` - Integration testing

## Contributing

When adding new tests:

1. **Follow naming conventions** (t-WADA)
2. **Use production types** from `@ai-agent-trpg/types`
3. **Include error handling tests**
4. **Add appropriate `data-testid` attributes** for UI components
5. **Update this documentation** if adding new utilities

## Future Enhancements

Planned improvements:
- [ ] Advanced test environment setup with full database seeding
- [ ] Visual regression testing for generated content
- [ ] Performance benchmarking for AI operations
- [ ] End-to-end testing with real AI providers (optional)
- [ ] Automated test data generation for edge cases