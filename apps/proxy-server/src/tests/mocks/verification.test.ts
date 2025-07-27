// ==========================================
// モックインフラストラクチャ動作確認テスト
// 基本的な動作を確認するためのシンプルなテスト
// ==========================================

import { describe, test, expect } from '@jest/globals';
import { AIProviderMockFactory } from './aiProviderMocks';
import { WebSocketTestHelper } from './websocketMocks';
import { DatabaseTestHelper } from './databaseMocks';

// ==========================================
// 基本動作確認テスト
// ==========================================

describe('Mock Infrastructure Verification', () => {
  
  test('AI Provider mocks should be creatable and functional', async () => {
    // OpenAI mock
    const openai = AIProviderMockFactory.createOpenAIMock('test-key');
    expect(openai).toBeDefined();
    expect(openai.chat).toBeDefined();
    expect(openai.chat.completions).toBeDefined();
    expect(typeof openai.chat.completions.create).toBe('function');

    // Anthropic mock
    const anthropic = AIProviderMockFactory.createAnthropicMock('test-key');
    expect(anthropic).toBeDefined();
    expect(anthropic.messages).toBeDefined();
    expect(typeof anthropic.messages.create).toBe('function');

    // Google mock
    const google = AIProviderMockFactory.createGoogleMock('test-key');
    expect(google).toBeDefined();
    expect(typeof google.getGenerativeModel).toBe('function');
  });

  test('WebSocket mock should handle basic operations', () => {
    const wsHelper = new WebSocketTestHelper();
    expect(wsHelper).toBeDefined();

    const client = wsHelper.createClient({ id: 'test-client' });
    expect(client).toBeDefined();
    expect(client.id).toBe('test-client');
    expect(typeof client.joinSession).toBe('function');
    expect(typeof client.sendPlayerAction).toBe('function');

    const server = wsHelper.getServer();
    expect(server).toBeDefined();
    expect(typeof server.broadcastToSession).toBe('function');
  });

  test('Database mock should handle basic operations', async () => {
    const dbHelper = new DatabaseTestHelper();
    expect(dbHelper).toBeDefined();

    const db = await dbHelper.setupTestDatabase();
    expect(db).toBeDefined();
    expect(typeof db.prepare).toBe('function');
    expect(typeof db.exec).toBe('function');

    // Test basic query
    const campaigns = db.prepare('SELECT * FROM campaigns').all();
    expect(Array.isArray(campaigns)).toBe(true);
  });

  test('Mock factory should manage instances correctly', () => {
    // Clear any existing instances
    AIProviderMockFactory.clearInstances();

    // Create multiple instances
    const openai1 = AIProviderMockFactory.createOpenAIMock('key1');
    const openai2 = AIProviderMockFactory.createOpenAIMock('key1'); // Same key
    const openai3 = AIProviderMockFactory.createOpenAIMock('key2'); // Different key

    // Same key should return same instance
    expect(openai1).toBe(openai2);
    // Different key should return different instance
    expect(openai1).not.toBe(openai3);

    // Clear instances
    AIProviderMockFactory.clearInstances();
    const openai4 = AIProviderMockFactory.createOpenAIMock('key1');
    expect(openai4).not.toBe(openai1); // Should be new instance after clear
  });

  test('Mock scenarios should be configurable', () => {
    const mockAI = AIProviderMockFactory.createOpenAIMock('test-key');
    
    // Set success scenario
    mockAI.setMockScenario({
      scenario: 'success',
      delay: 50,
      customResponse: 'Custom test response'
    });

    // Set error scenario
    mockAI.setMockScenario({
      scenario: 'api_error',
      customError: new Error('Test error')
    });

    // Global scenario setting
    AIProviderMockFactory.setGlobalMockScenario({
      scenario: 'success',
      delay: 100
    });

    // These operations should not throw errors
    expect(() => {
      mockAI.setMockScenario({ scenario: 'timeout' });
    }).not.toThrow();
  });
});