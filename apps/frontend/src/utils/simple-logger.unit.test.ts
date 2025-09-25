import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Simple Logger Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should import logger without errors', async () => {
    const loggerModule = await import('./logger');
    expect(loggerModule).toBeDefined();
    expect(loggerModule.logger).toBeDefined();
    expect(loggerModule.LogLevel).toBeDefined();
  });

  it('should have correct log levels', async () => {
    const { LogLevel } = await import('./logger');
    expect(LogLevel.DEBUG).toBe(0);
    expect(LogLevel.INFO).toBe(1);
    expect(LogLevel.WARN).toBe(2);
    expect(LogLevel.ERROR).toBe(3);
    expect(LogLevel.FATAL).toBe(4);
  });

  it('should log messages', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { logger } = await import('./logger');
    
    // Test basic logging
    logger.error('Test error message');
    logger.fatal('Test fatal message');
    
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});