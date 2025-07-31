import { config, validateConfig } from '../../config/config';

describe('Configuration Module', () => {
  test('should have valid configuration structure', () => {
    expect(config).toBeDefined();
    expect(config.nodeEnv).toBeDefined();
    expect(config.port).toBeGreaterThan(0);
    expect(config.security).toBeDefined();
    expect(config.database).toBeDefined();
    expect(config.ai).toBeDefined();
  });

  test('should validate configuration without errors', () => {
    expect(() => validateConfig()).not.toThrow();
  });

  test('should have security configuration', () => {
    expect(config.security.jwtSecret).toBeDefined();
    expect(config.security.corsOrigin).toBeDefined();
    expect(config.security.rateLimitWindow).toBeGreaterThan(0);
    expect(config.security.rateLimitMax).toBeGreaterThan(0);
  });

  test('should have AI configuration', () => {
    expect(config.ai.openai).toBeDefined();
    expect(config.ai.anthropic).toBeDefined();
    expect(config.ai.google).toBeDefined();
    expect(config.ai.timeout).toBeGreaterThan(0);
    expect(config.ai.maxConcurrentRequests).toBeGreaterThan(0);
  });

  test('should have database configuration', () => {
    expect(config.database.path).toBeDefined();
    expect(config.database.poolSize).toBeGreaterThan(0);
  });
});