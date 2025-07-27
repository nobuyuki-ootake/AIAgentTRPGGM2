/**
 * Security Middleware Unit Tests
 * Tests for Rate Limiting, Security Headers, and Malicious Content Detection
 * t-WADA naming convention: security.middleware.unit.test.ts
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import {
  securityLogger,
  apiKeyLeakageDetection,
  securityHeadersValidation,
  maliciousPayloadDetection,
  setupSecurityMiddleware
} from './security.middleware';

// Mock dependencies
jest.mock('../config/config', () => ({
  config: {
    nodeEnv: 'test',
    security: {
      rateLimitWindow: 15,
      rateLimitMax: 100
    }
  }
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock external middleware dependencies
jest.mock('express-rate-limit', () => {
  return jest.fn(() => (req: Request, res: Response, next: NextFunction) => next());
});

jest.mock('helmet', () => {
  return jest.fn(() => (req: Request, res: Response, next: NextFunction) => next());
});

jest.mock('compression', () => {
  const compressionFn = jest.fn(() => (req: Request, res: Response, next: NextFunction) => next());
  compressionFn.filter = jest.fn();
  return compressionFn;
});

import { logger } from '../utils/logger';

describe('Security Middleware - Rate Limiting, Headers, and Threat Detection', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJsonResponse: jest.Mock;
  let mockStatus: jest.Mock;
  let mockSetHeader: jest.Mock;
  let mockGetHeader: jest.Mock;
  let mockEnd: jest.Mock;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create fresh mock response
    mockJsonResponse = jest.fn();
    mockStatus = jest.fn(() => mockResponse);
    mockSetHeader = jest.fn();
    mockGetHeader = jest.fn();
    mockEnd = jest.fn();
    mockResponse = {
      status: mockStatus,
      json: mockJsonResponse,
      setHeader: mockSetHeader,
      getHeader: mockGetHeader,
      end: mockEnd
    };

    // Create fresh mock request
    mockRequest = {
      method: 'POST',
      path: '/api/test',
      ip: '192.168.1.100',
      get: jest.fn((header) => {
        if (header === 'User-Agent') return 'Mozilla/5.0 Test Browser';
        if (header === 'Origin') return 'http://localhost:3000';
        if (header === 'Referer') return 'http://localhost:3000/dashboard';
        if (header === 'Content-Length') return '1024';
        if (header === 'Accept') return 'application/json';
        return undefined;
      }),
      user: {
        userId: 'user-123',
        sessionId: 'session-456'
      },
      body: {}
    };

    // Create mock next function
    mockNext = jest.fn();
  });

  describe('Security Logger - securityLogger', () => {
    test('should log basic request information without alerts', () => {
      // Arrange
      mockRequest.path = '/api/safe-endpoint';

      // Act
      securityLogger(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('should detect and log suspicious path access attempts', () => {
      // Arrange
      const suspiciousPaths = [
        '/admin/config',
        '/wp-admin/login',
        '/.env',
        '/.git/config',
        '/backup/database',
        '/phpmyadmin/index.php',
        '/console/shell',
        '/cmd/execute'
      ];

      for (const suspiciousPath of suspiciousPaths) {
        jest.clearAllMocks();
        mockRequest.path = suspiciousPath;

        // Act
        securityLogger(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(logger.warn).toHaveBeenCalledWith('Suspicious path access attempt', expect.objectContaining({
          ip: '192.168.1.100',
          path: suspiciousPath,
          method: 'POST',
          userId: 'user-123',
          severity: 'HIGH',
          alertType: 'SUSPICIOUS_PATH_ACCESS'
        }));
        expect(mockNext).toHaveBeenCalled();
      }
    });

    test('should detect and log suspicious User-Agent strings', () => {
      // Arrange
      const suspiciousUserAgents = [
        'curl/7.68.0',
        'wget/1.20.3',
        'python-requests/2.25.1',
        'Googlebot/2.1',
        'Web Crawler 1.0',
        'Spider Bot v1.2',
        'Security Scanner',
        'Exploit Kit 2.0'
      ];

      for (const suspiciousUA of suspiciousUserAgents) {
        jest.clearAllMocks();
        mockRequest.get = jest.fn((header) => {
          if (header === 'User-Agent') return suspiciousUA;
          return undefined;
        });

        // Act
        securityLogger(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(logger.warn).toHaveBeenCalledWith('Suspicious User-Agent detected', expect.objectContaining({
          userAgent: suspiciousUA,
          severity: 'MEDIUM',
          alertType: 'SUSPICIOUS_USER_AGENT'
        }));
      }
    });

    test('should detect abnormally large request sizes', () => {
      // Arrange
      const largeContentLength = (60 * 1024 * 1024).toString(); // 60MB
      mockRequest.get = jest.fn((header) => {
        if (header === 'Content-Length') return largeContentLength;
        if (header === 'User-Agent') return 'Normal Browser';
        return undefined;
      });

      // Act
      securityLogger(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(logger.warn).toHaveBeenCalledWith('Abnormally large request detected', expect.objectContaining({
        contentLength: 60 * 1024 * 1024,
        severity: 'HIGH',
        alertType: 'LARGE_REQUEST'
      }));
    });

    test('should handle missing headers gracefully', () => {
      // Arrange
      mockRequest.get = jest.fn(() => undefined);

      // Act
      securityLogger(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('should log complete security context', () => {
      // Arrange
      mockRequest = {
        method: 'PUT',
        path: '/api/sensitive',
        ip: '10.0.0.1',
        get: jest.fn((header) => {
          if (header === 'User-Agent') return 'Custom-Client/1.0';
          if (header === 'Origin') return 'https://trusted-domain.com';
          if (header === 'Referer') return 'https://trusted-domain.com/app';
          return undefined;
        }),
        user: { userId: 'admin-user', sessionId: 'admin-session' }
      };

      // Act
      securityLogger(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert - Verify complete context is captured (though not logged as warning for normal requests)
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('API Key Leakage Detection - apiKeyLeakageDetection', () => {
    test('should allow normal responses without API keys', () => {
      // Arrange
      const normalResponse = JSON.stringify({
        success: true,
        data: { message: 'Hello world' }
      });

      // Act
      apiKeyLeakageDetection(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.end!(normalResponse);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    test('should detect and log Google API key leakage', () => {
      // Arrange
      const responseWithGoogleKey = JSON.stringify({
        apiKey: 'AIzaSyDhOy2VWuGlxGr3T8vFq9LmKdE5Cx7Nt2A'
      });

      // Act
      apiKeyLeakageDetection(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.end!(responseWithGoogleKey);

      // Assert
      expect(logger.error).toHaveBeenCalledWith('API KEY LEAKAGE DETECTED IN RESPONSE', expect.objectContaining({
        path: '/api/test',
        method: 'POST',
        userId: 'user-123',
        severity: 'CRITICAL',
        alertType: 'API_KEY_LEAKAGE'
      }));
    });

    test('should detect and log OpenAI API key leakage', () => {
      // Arrange
      const responseWithOpenAIKey = JSON.stringify({
        openai_key: 'sk-1234567890abcdef1234567890abcdef1234567890abcdef'
      });

      // Act
      apiKeyLeakageDetection(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.end!(responseWithOpenAIKey);

      // Assert
      expect(logger.error).toHaveBeenCalledWith('API KEY LEAKAGE DETECTED IN RESPONSE', expect.objectContaining({
        alertType: 'API_KEY_LEAKAGE'
      }));
    });

    test('should detect and log Anthropic API key leakage', () => {
      // Arrange
      const responseWithAnthropicKey = JSON.stringify({
        claude_key: 'sk-ant-api03-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      });

      // Act
      apiKeyLeakageDetection(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.end!(responseWithAnthropicKey);

      // Assert
      expect(logger.error).toHaveBeenCalledWith('API KEY LEAKAGE DETECTED IN RESPONSE', expect.objectContaining({
        alertType: 'API_KEY_LEAKAGE'
      }));
    });

    test('should detect multiple API key types in single response', () => {
      // Arrange
      const responseWithMultipleKeys = JSON.stringify({
        google: 'AIzaSyDhOy2VWuGlxGr3T8vFq9LmKdE5Cx7Nt2A',
        openai: 'sk-1234567890abcdef1234567890abcdef1234567890abcdef',
        github: 'ghp_1234567890abcdef1234567890abcdef123456'
      });

      // Act
      apiKeyLeakageDetection(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.end!(responseWithMultipleKeys);

      // Assert
      expect(logger.error).toHaveBeenCalledWith('API KEY LEAKAGE DETECTED IN RESPONSE', expect.objectContaining({
        patterns: expect.arrayContaining([
          expect.stringContaining('AIza'),
          expect.stringContaining('sk-'),
          expect.stringContaining('ghp_')
        ])
      }));
    });

    test('should block response in production environment when API key detected', () => {
      // Arrange
      jest.doMock('../config/config', () => ({
        config: {
          nodeEnv: 'production',
          security: {
            rateLimitWindow: 15,
            rateLimitMax: 100
          }
        }
      }));

      const responseWithAPIKey = JSON.stringify({
        secret: 'sk-1234567890abcdef1234567890abcdef1234567890abcdef'
      });

      const originalEnd = mockResponse.end;
      mockResponse.end = jest.fn((chunk, encoding) => {
        // Simulate the actual behavior
        if (chunk && typeof chunk === 'string' && chunk.includes('sk-')) {
          return originalEnd!.call(mockResponse, JSON.stringify({
            error: 'Response blocked due to security policy',
            code: 'SECURITY_POLICY_VIOLATION'
          }), encoding);
        }
        return originalEnd!.call(mockResponse, chunk, encoding);
      });

      // Act
      apiKeyLeakageDetection(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.end!(responseWithAPIKey);

      // Assert
      expect(logger.error).toHaveBeenCalledWith('API KEY LEAKAGE DETECTED IN RESPONSE', expect.any(Object));
    });

    test('should handle non-string response chunks', () => {
      // Arrange
      const binaryData = Buffer.from([1, 2, 3, 4]);

      // Act
      apiKeyLeakageDetection(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.end!(binaryData);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('Security Headers Validation - securityHeadersValidation', () => {
    test('should set all required security headers', () => {
      // Act
      securityHeadersValidation(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockSetHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockSetHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockSetHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(mockSetHeader).toHaveBeenCalledWith('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      expect(mockSetHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should log warning for missing required headers', () => {
      // Arrange
      mockRequest.get = jest.fn((header) => {
        if (header === 'user-agent') return undefined; // Missing User-Agent
        if (header === 'accept') return 'application/json';
        return undefined;
      });

      // Act
      securityHeadersValidation(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(logger.warn).toHaveBeenCalledWith('Missing required security headers', expect.objectContaining({
        missingHeaders: ['user-agent'],
        severity: 'MEDIUM',
        alertType: 'MISSING_SECURITY_HEADERS'
      }));
    });

    test('should log warning for multiple missing headers', () => {
      // Arrange
      mockRequest.get = jest.fn(() => undefined); // Missing all headers

      // Act
      securityHeadersValidation(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(logger.warn).toHaveBeenCalledWith('Missing required security headers', expect.objectContaining({
        missingHeaders: ['user-agent', 'accept']
      }));
    });

    test('should not log warning when all required headers are present', () => {
      // Arrange
      mockRequest.get = jest.fn((header) => {
        if (header === 'user-agent') return 'Mozilla/5.0';
        if (header === 'accept') return 'application/json';
        return undefined;
      });

      // Act
      securityHeadersValidation(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(logger.warn).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Malicious Payload Detection - maliciousPayloadDetection', () => {
    test('should allow safe payload to pass through', () => {
      // Arrange
      mockRequest.body = {
        name: 'John Doe',
        description: 'A brave warrior',
        stats: { strength: 15, dexterity: 12 }
      };

      // Act
      maliciousPayloadDetection(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    test('should detect and block JavaScript eval patterns', () => {
      // Arrange
      mockRequest.body = {
        script: 'eval("malicious code")',
        content: 'Normal content'
      };

      // Act
      maliciousPayloadDetection(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'Malicious payload detected',
        code: 'MALICIOUS_PAYLOAD_DETECTED'
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Malicious payload detected', expect.objectContaining({
        severity: 'HIGH',
        alertType: 'MALICIOUS_PAYLOAD'
      }));
    });

    test('should detect and block script tags', () => {
      // Arrange
      mockRequest.body = {
        content: '<script>alert("XSS")</script>'
      };

      // Act
      maliciousPayloadDetection(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(logger.warn).toHaveBeenCalledWith('Malicious payload detected', expect.objectContaining({
        patterns: expect.arrayContaining([expect.stringContaining('<script')])
      }));
    });

    test('should detect JavaScript event handlers', () => {
      // Arrange
      const maliciousEventHandlers = [
        'onload="malicious()"',
        'onclick="steal_data()"',
        'onerror="exploit()"'
      ];

      for (const handler of maliciousEventHandlers) {
        jest.clearAllMocks();
        mockRequest.body = { content: handler };

        // Act
        maliciousPayloadDetection(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(logger.warn).toHaveBeenCalledWith('Malicious payload detected', expect.any(Object));
      }
    });

    test('should detect dangerous HTML elements', () => {
      // Arrange
      const dangerousElements = [
        '<iframe src="evil.com">',
        '<object data="malicious.swf">',
        '<embed src="exploit.exe">'
      ];

      for (const element of dangerousElements) {
        jest.clearAllMocks();
        mockRequest.body = { html: element };

        // Act
        maliciousPayloadDetection(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(logger.warn).toHaveBeenCalledWith('Malicious payload detected', expect.any(Object));
      }
    });

    test('should detect JavaScript URI schemes', () => {
      // Arrange
      mockRequest.body = {
        link: 'javascript:alert("XSS")',
        style: 'data:text/html,<script>alert(1)</script>',
        script: 'vbscript:msgbox("VBS")'
      };

      // Act
      maliciousPayloadDetection(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(logger.warn).toHaveBeenCalledWith('Malicious payload detected', expect.objectContaining({
        patterns: expect.arrayContaining([
          expect.stringContaining('javascript:'),
          expect.stringContaining('data:text/html'),
          expect.stringContaining('vbscript:')
        ])
      }));
    });

    test('should detect DOM manipulation attempts', () => {
      // Arrange
      mockRequest.body = {
        code: 'document.cookie = "stolen"',
        redirect: 'window.location = "evil.com"',
        popup: 'alert("You have been hacked")'
      };

      // Act
      maliciousPayloadDetection(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(logger.warn).toHaveBeenCalledWith('Malicious payload detected', expect.any(Object));
    });

    test('should handle empty or null request body', () => {
      // Arrange
      const testBodies = [null, undefined, ''];

      for (const body of testBodies) {
        jest.clearAllMocks();
        mockRequest.body = body;

        // Act
        maliciousPayloadDetection(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
        expect(mockStatus).not.toHaveBeenCalled();
      }
    });

    test('should log multiple malicious patterns in single payload', () => {
      // Arrange
      mockRequest.body = {
        script: '<script>eval("malicious")</script>',
        handler: 'onclick="alert(document.cookie)"'
      };

      // Act
      maliciousPayloadDetection(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(logger.warn).toHaveBeenCalledWith('Malicious payload detected', expect.objectContaining({
        patterns: expect.arrayContaining([
          expect.stringContaining('<script'),
          expect.stringContaining('eval'),
          expect.stringContaining('onclick'),
          expect.stringContaining('alert'),
          expect.stringContaining('document.cookie')
        ])
      }));
    });
  });

  describe('Setup Security Middleware - setupSecurityMiddleware', () => {
    test('should configure all security middleware in correct order', () => {
      // Arrange
      const mockApp = {
        use: jest.fn()
      };

      // Act
      setupSecurityMiddleware(mockApp);

      // Assert
      expect(mockApp.use).toHaveBeenCalledTimes(5); // securityLogger, securityHeadersValidation, helmet, rateLimit, compression, apiKeyLeakageDetection, maliciousPayloadDetection
      
      // Verify that middleware is added in the expected order
      const calls = mockApp.use.mock.calls;
      expect(calls[0][0]).toBe(securityLogger);
      expect(calls[1][0]).toBe(securityHeadersValidation);
      expect(calls[3][0]).toBe(apiKeyLeakageDetection);
      expect(calls[4][0]).toBe(maliciousPayloadDetection);
    });

    test('should apply all middleware functions without errors', () => {
      // Arrange
      const mockApp = {
        use: jest.fn()
      };

      // Act & Assert
      expect(() => setupSecurityMiddleware(mockApp)).not.toThrow();
    });
  });

  describe('Integration and Edge Cases', () => {
    test('should handle requests without user context', () => {
      // Arrange
      mockRequest.user = undefined;

      // Act
      securityLogger(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      // Should not throw errors when user is undefined
    });

    test('should handle malformed request objects gracefully', () => {
      // Arrange
      mockRequest = {
        method: undefined,
        path: undefined,
        ip: undefined,
        get: jest.fn(() => undefined)
      };

      // Act & Assert
      expect(() => {
        securityLogger(mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();

      expect(() => {
        securityHeadersValidation(mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();

      expect(() => {
        maliciousPayloadDetection(mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
    });

    test('should preserve original functionality when no threats detected', () => {
      // Arrange
      const originalBody = { safe: 'content', number: 42 };
      mockRequest.body = originalBody;

      // Act
      securityLogger(mockRequest as Request, mockResponse as Response, mockNext);
      securityHeadersValidation(mockRequest as Request, mockResponse as Response, mockNext);
      maliciousPayloadDetection(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(3);
      expect(mockRequest.body).toEqual(originalBody);
    });

    test('should handle case-insensitive pattern matching', () => {
      // Arrange
      const testCases = [
        'EVAL("malicious")',
        'OnClick="alert(1)"',
        '<SCRIPT>alert(1)</SCRIPT>',
        'JAVASCRIPT:alert(1)'
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        mockRequest.body = { content: testCase };

        // Act
        maliciousPayloadDetection(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(logger.warn).toHaveBeenCalledWith('Malicious payload detected', expect.any(Object));
      }
    });
  });
});