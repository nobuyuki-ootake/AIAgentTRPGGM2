import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    })),
    CancelToken: {
      source: vi.fn(() => ({
        token: 'mock-token',
        cancel: vi.fn(),
      })),
    },
  },
}));

describe('Simple API Client Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should import API client without errors', async () => {
    const clientModule = await import('./client');
    expect(clientModule).toBeDefined();
    expect(clientModule.apiClient).toBeDefined();
  });

  it('should create cancel token', async () => {
    const { apiClient } = await import('./client');
    const { token, cancel } = apiClient.createCancelToken();
    
    expect(token).toBe('mock-token');
    expect(cancel).toBeDefined();
  });

  it('should set notification callback', async () => {
    const { setGlobalNotificationCallback } = await import('./client');
    const mockCallback = vi.fn();
    
    expect(() => setGlobalNotificationCallback(mockCallback)).not.toThrow();
    expect(() => setGlobalNotificationCallback(null)).not.toThrow();
  });
});