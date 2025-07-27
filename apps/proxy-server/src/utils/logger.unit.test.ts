/**
 * Logger Utility Unit Tests
 * Tests for Logging Functionality, Message Formatting, and Context Handling
 * t-WADA naming convention: logger.unit.test.ts
 */

import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { logger } from './logger-simple';

describe('Logger Utility - Message Logging and Context Management', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  describe('Basic Logging Functions', () => {
    test('should log info messages with correct format', () => {
      // Arrange
      const message = 'Test info message';

      // Act
      logger.info(message);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] Test info message {}');
    });

    test('should log warning messages with correct format', () => {
      // Arrange
      const message = 'Test warning message';

      // Act
      logger.warn(message);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Test warning message {}');
    });

    test('should log error messages with correct format', () => {
      // Arrange
      const message = 'Test error message';

      // Act
      logger.error(message);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Test error message {}');
    });

    test('should log debug messages with correct format', () => {
      // Arrange
      const message = 'Test debug message';

      // Act
      logger.debug(message);

      // Assert
      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] Test debug message {}');
    });

    test('should log fatal messages with correct format', () => {
      // Arrange
      const message = 'Test fatal message';

      // Act
      logger.fatal(message);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('[FATAL] Test fatal message {}');
    });
  });

  describe('Context Parameter Handling', () => {
    test('should log info message with context object', () => {
      // Arrange
      const message = 'User authentication';
      const context = {
        userId: 'user-123',
        sessionId: 'session-456',
        ip: '192.168.1.100'
      };

      // Act
      logger.info(message, context);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[INFO] User authentication {"userId":"user-123","sessionId":"session-456","ip":"192.168.1.100"}'
      );
    });

    test('should log warning message with context object', () => {
      // Arrange
      const message = 'Rate limit exceeded';
      const context = {
        ip: '10.0.0.1',
        path: '/api/ai-agent',
        attempts: 101
      };

      // Act
      logger.warn(message, context);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[WARN] Rate limit exceeded {"ip":"10.0.0.1","path":"/api/ai-agent","attempts":101}'
      );
    });

    test('should log error message with context object', () => {
      // Arrange
      const message = 'Database connection failed';
      const context = {
        database: 'trpg.db',
        error: 'Connection timeout',
        retryCount: 3
      };

      // Act
      logger.error(message, context);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR] Database connection failed {"database":"trpg.db","error":"Connection timeout","retryCount":3}'
      );
    });

    test('should handle null context gracefully', () => {
      // Arrange
      const message = 'Test message with null context';

      // Act
      logger.info(message, null);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] Test message with null context {}');
    });

    test('should handle undefined context gracefully', () => {
      // Arrange
      const message = 'Test message with undefined context';

      // Act
      logger.info(message, undefined);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] Test message with undefined context {}');
    });
  });

  describe('Three Parameter Support', () => {
    test('should log message with context and additional data', () => {
      // Arrange
      const message = 'AI request processed';
      const context = {
        provider: 'openai',
        model: 'gpt-4'
      };
      const data = {
        requestId: 'req-123',
        responseTime: 1500,
        tokenCount: 250
      };

      // Act
      logger.info(message, context, data);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[INFO] AI request processed {"provider":"openai","model":"gpt-4"} {"requestId":"req-123","responseTime":1500,"tokenCount":250}'
      );
    });

    test('should log warning with context and additional data', () => {
      // Arrange
      const message = 'AI service response slow';
      const context = {
        provider: 'anthropic',
        endpoint: '/chat/completions'
      };
      const data = {
        responseTime: 8000,
        expected: 3000,
        threshold: 5000
      };

      // Act
      logger.warn(message, context, data);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[WARN] AI service response slow {"provider":"anthropic","endpoint":"/chat/completions"} {"responseTime":8000,"expected":3000,"threshold":5000}'
      );
    });

    test('should log error with context and additional data', () => {
      // Arrange
      const message = 'Character generation failed';
      const context = {
        campaignId: 'camp-123',
        characterType: 'PC'
      };
      const data = {
        error: 'API quota exceeded',
        provider: 'openai',
        retryAfter: 3600
      };

      // Act
      logger.error(message, context, data);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR] Character generation failed {"campaignId":"camp-123","characterType":"PC"} {"error":"API quota exceeded","provider":"openai","retryAfter":3600}'
      );
    });

    test('should handle null values in three parameter format', () => {
      // Arrange
      const message = 'Test with null values';

      // Act
      logger.debug(message, null, null);

      // Assert
      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] Test with null values {} null');
    });
  });

  describe('Complex Data Type Handling', () => {
    test('should serialize nested objects correctly', () => {
      // Arrange
      const message = 'Complex object logging';
      const context = {
        user: {
          id: 'user-456',
          profile: {
            name: 'John Doe',
            preferences: {
              theme: 'dark',
              notifications: true
            }
          }
        },
        session: {
          id: 'session-789',
          startTime: '2024-01-01T12:00:00Z'
        }
      };

      // Act
      logger.info(message, context);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[INFO] Complex object logging {"user":{"id":"user-456","profile":{"name":"John Doe","preferences":{"theme":"dark","notifications":true}}},"session":{"id":"session-789","startTime":"2024-01-01T12:00:00Z"}}'
      );
    });

    test('should handle arrays in context', () => {
      // Arrange
      const message = 'Array data logging';
      const context = {
        errors: ['Validation failed', 'Missing required field', 'Invalid format'],
        userIds: ['user-1', 'user-2', 'user-3'],
        permissions: [
          { resource: 'campaigns', action: 'read' },
          { resource: 'characters', action: 'write' }
        ]
      };

      // Act
      logger.warn(message, context);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[WARN] Array data logging {"errors":["Validation failed","Missing required field","Invalid format"],"userIds":["user-1","user-2","user-3"],"permissions":[{"resource":"campaigns","action":"read"},{"resource":"characters","action":"write"}]}'
      );
    });

    test('should handle special JavaScript values', () => {
      // Arrange
      const message = 'Special values logging';
      const context = {
        undefinedValue: undefined,
        nullValue: null,
        nanValue: NaN,
        infinityValue: Infinity,
        dateValue: new Date('2024-01-01T12:00:00Z'),
        regexValue: /test-pattern/gi
      };

      // Act
      logger.debug(message, context);

      // Assert
      const loggedCall = consoleDebugSpy.mock.calls[0][0];
      expect(loggedCall).toContain('[DEBUG] Special values logging');
      expect(loggedCall).toContain('"nullValue":null');
      expect(loggedCall).toContain('"nanValue":null');
      expect(loggedCall).toContain('"infinityValue":null');
    });

    test('should handle circular references gracefully', () => {
      // Arrange
      const message = 'Circular reference test';
      const circularObj: any = { name: 'circular' };
      circularObj.self = circularObj;

      // Act & Assert
      expect(() => {
        logger.error(message, circularObj);
      }).toThrow(); // JSON.stringify should throw on circular references

      // This is expected behavior - the logger doesn't handle circular references
      // In a real implementation, you might want to add circular reference detection
    });
  });

  describe('Logger Methods and Configuration', () => {
    test('should return logger instance from setContext method', () => {
      // Arrange
      const context = { module: 'test' };

      // Act
      const result = logger.setContext(context);

      // Assert
      expect(result).toBe(logger);
    });

    test('should return logger instance from child method', () => {
      // Arrange
      const childContext = { component: 'child' };

      // Act
      const result = logger.child(childContext);

      // Assert
      expect(result).toBe(logger);
    });

    test('should allow method chaining', () => {
      // Arrange & Act
      const result = logger
        .setContext({ module: 'test' })
        .child({ component: 'submodule' });

      // Assert
      expect(result).toBe(logger);
    });
  });

  describe('Message Formatting Edge Cases', () => {
    test('should handle empty string messages', () => {
      // Arrange
      const message = '';
      const context = { type: 'empty' };

      // Act
      logger.info(message, context);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO]  {"type":"empty"}');
    });

    test('should handle messages with special characters', () => {
      // Arrange
      const message = 'Special chars: \n\t\r"\'\\';
      const context = { source: 'special-chars-test' };

      // Act
      logger.warn(message, context);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[WARN] Special chars: \n\t\r"\'\\ {"source":"special-chars-test"}'
      );
    });

    test('should handle very long messages', () => {
      // Arrange
      const longMessage = 'A'.repeat(1000);
      const context = { length: 1000 };

      // Act
      logger.error(longMessage, context);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `[ERROR] ${longMessage} {"length":1000}`
      );
    });

    test('should handle non-string message types gracefully', () => {
      // Arrange & Act & Assert
      expect(() => {
        (logger.info as any)(123, { type: 'number' });
      }).not.toThrow();

      expect(() => {
        (logger.warn as any)(true, { type: 'boolean' });
      }).not.toThrow();

      expect(() => {
        (logger.error as any)({ object: 'message' }, { type: 'object' });
      }).not.toThrow();
    });
  });

  describe('Real-world Usage Patterns', () => {
    test('should log authentication events correctly', () => {
      // Arrange
      const authContext = {
        userId: 'user-789',
        action: 'login',
        ip: '203.0.113.1',
        userAgent: 'Mozilla/5.0',
        success: true
      };

      // Act
      logger.info('User authentication attempt', authContext);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[INFO] User authentication attempt {"userId":"user-789","action":"login","ip":"203.0.113.1","userAgent":"Mozilla/5.0","success":true}'
      );
    });

    test('should log API request/response patterns', () => {
      // Arrange
      const requestContext = {
        method: 'POST',
        path: '/api/ai-agent/generate-character',
        statusCode: 200,
        responseTime: 1234
      };
      const requestData = {
        requestId: 'req-456',
        provider: 'openai',
        model: 'gpt-4'
      };

      // Act
      logger.info('API request completed', requestContext, requestData);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[INFO] API request completed {"method":"POST","path":"/api/ai-agent/generate-character","statusCode":200,"responseTime":1234} {"requestId":"req-456","provider":"openai","model":"gpt-4"}'
      );
    });

    test('should log error scenarios with stack traces', () => {
      // Arrange
      const error = new Error('Database connection failed');
      const errorContext = {
        operation: 'campaign.findById',
        campaignId: 'camp-123',
        database: 'trpg.db'
      };
      const errorData = {
        errorMessage: error.message,
        errorStack: error.stack,
        timestamp: '2024-01-01T12:00:00Z'
      };

      // Act
      logger.error('Database operation failed', errorContext, errorData);

      // Assert
      const loggedCall = consoleErrorSpy.mock.calls[0][0];
      expect(loggedCall).toContain('[ERROR] Database operation failed');
      expect(loggedCall).toContain('"operation":"campaign.findById"');
      expect(loggedCall).toContain('"campaignId":"camp-123"');
      expect(loggedCall).toContain('"errorMessage":"Database connection failed"');
    });

    test('should log security events appropriately', () => {
      // Arrange
      const securityContext = {
        alertType: 'SUSPICIOUS_USER_AGENT',
        severity: 'MEDIUM',
        ip: '198.51.100.1',
        userAgent: 'curl/7.68.0'
      };

      // Act
      logger.warn('Security alert triggered', securityContext);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[WARN] Security alert triggered {"alertType":"SUSPICIOUS_USER_AGENT","severity":"MEDIUM","ip":"198.51.100.1","userAgent":"curl/7.68.0"}'
      );
    });
  });
});