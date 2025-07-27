/**
 * Validation Middleware Unit Tests
 * Tests for Request Validation, Security Checks, and Input Sanitization
 * t-WADA naming convention: validation.middleware.unit.test.ts
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import {
  validateRequest,
  securityValidation,
  rateLimitInfo,
  fileUploadValidation,
  corsSecurityValidation,
  responseTimeMonitoring
} from './validation.middleware';

// Mock the logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

import { logger } from '../utils/logger';

describe('Validation Middleware - Request Validation and Security Checks', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJsonResponse: jest.Mock;
  let mockStatus: jest.Mock;
  let mockSetHeader: jest.Mock;
  let mockOn: jest.Mock;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create fresh mock response
    mockJsonResponse = jest.fn();
    mockStatus = jest.fn(() => mockResponse);
    mockSetHeader = jest.fn();
    mockOn = jest.fn();
    mockResponse = {
      status: mockStatus,
      json: mockJsonResponse,
      setHeader: mockSetHeader,
      on: mockOn,
      statusCode: 200
    };

    // Create fresh mock request
    mockRequest = {
      method: 'POST',
      path: '/api/test',
      ip: '192.168.1.100',
      get: jest.fn((header) => {
        if (header === 'User-Agent') return 'Test-User-Agent/1.0';
        if (header === 'Origin') return 'http://localhost:3000';
        return undefined;
      }),
      user: {
        userId: 'user-123',
        sessionId: 'session-456'
      },
      body: {},
      query: {},
      params: {},
      headers: {}
    };

    // Create mock next function
    mockNext = jest.fn();

    // Reset environment variables
    delete process.env.NODE_ENV;
    delete process.env.ALLOWED_ORIGINS;
  });

  describe('Request Validation with Zod Schemas - validateRequest', () => {
    test('should validate request body successfully with valid data', () => {
      // Arrange
      const schema = {
        body: z.object({
          name: z.string().min(1),
          email: z.string().email(),
          age: z.number().min(0)
        })
      };

      mockRequest.body = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        age: 30
      };

      const middleware = validateRequest(schema);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.body).toEqual({
        name: 'John Doe',
        email: 'john.doe@example.com',
        age: 30
      });
    });

    test('should validate query parameters successfully', () => {
      // Arrange
      const schema = {
        query: z.object({
          page: z.string().transform(Number),
          limit: z.string().transform(Number),
          search: z.string().optional()
        })
      };

      mockRequest.query = {
        page: '1',
        limit: '10',
        search: 'test query'
      };

      const middleware = validateRequest(schema);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.query).toEqual({
        page: 1,
        limit: 10,
        search: 'test query'
      });
    });

    test('should validate path parameters successfully', () => {
      // Arrange
      const schema = {
        params: z.object({
          campaignId: z.string().uuid(),
          characterId: z.string().min(1)
        })
      };

      mockRequest.params = {
        campaignId: '123e4567-e89b-12d3-a456-426614174000',
        characterId: 'char-123'
      };

      const middleware = validateRequest(schema);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.params.campaignId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(mockRequest.params.characterId).toBe('char-123');
    });

    test('should validate headers successfully', () => {
      // Arrange
      const schema = {
        headers: z.object({
          'content-type': z.string(),
          'authorization': z.string().optional(),
          'x-api-key': z.string().optional()
        }).passthrough()
      };

      mockRequest.headers = {
        'content-type': 'application/json',
        'authorization': 'Bearer token123',
        'x-api-key': 'api-key-456'
      };

      const middleware = validateRequest(schema);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.headers['content-type']).toBe('application/json');
      expect(mockRequest.headers['authorization']).toBe('Bearer token123');
    });

    test('should reject invalid request body data', () => {
      // Arrange
      const schema = {
        body: z.object({
          name: z.string().min(1),
          email: z.string().email(),
          age: z.number().min(0)
        })
      };

      mockRequest.body = {
        name: '', // Invalid: empty string
        email: 'invalid-email', // Invalid: not email format
        age: -5 // Invalid: negative number
      };

      const middleware = validateRequest(schema);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        details: [
          {
            field: 'name',
            message: 'String must contain at least 1 character(s)',
            code: 'too_small'
          },
          {
            field: 'email',
            message: 'Invalid email',
            code: 'invalid_string'
          },
          {
            field: 'age',
            message: 'Number must be greater than or equal to 0',
            code: 'too_small'
          }
        ]
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Request validation failed', expect.any(Object));
    });

    test('should reject missing required fields', () => {
      // Arrange
      const schema = {
        body: z.object({
          name: z.string(),
          email: z.string().email(),
          password: z.string().min(8)
        })
      };

      mockRequest.body = {
        name: 'John Doe'
        // Missing email and password
      };

      const middleware = validateRequest(schema);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        details: [
          {
            field: 'email',
            message: 'Required',
            code: 'invalid_type'
          },
          {
            field: 'password',
            message: 'Required',
            code: 'invalid_type'
          }
        ]
      });
    });

    test('should handle multiple schema validations simultaneously', () => {
      // Arrange
      const schema = {
        body: z.object({
          data: z.string()
        }),
        query: z.object({
          format: z.enum(['json', 'xml'])
        }),
        params: z.object({
          id: z.string().uuid()
        })
      };

      mockRequest.body = { data: 'test data' };
      mockRequest.query = { format: 'json' };
      mockRequest.params = { id: '123e4567-e89b-12d3-a456-426614174000' };

      const middleware = validateRequest(schema);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.body.data).toBe('test data');
      expect(mockRequest.query.format).toBe('json');
      expect(mockRequest.params.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    test('should handle unexpected validation errors gracefully', () => {
      // Arrange
      const schema = {
        body: z.object({
          data: z.string()
        })
      };

      // Mock a non-Zod error
      const mockSchema = {
        parse: jest.fn(() => {
          throw new Error('Unexpected error');
        })
      };

      const middleware = validateRequest({ body: mockSchema as ZodSchema });

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'Internal server error during validation',
        code: 'INTERNAL_VALIDATION_ERROR'
      });
      expect(logger.error).toHaveBeenCalledWith('Unexpected validation error', expect.any(Object));
    });
  });

  describe('Security Validation - securityValidation', () => {
    test('should allow safe request data to pass through', () => {
      // Arrange
      mockRequest.body = {
        name: 'John Doe',
        description: 'A brave warrior who fights for justice',
        stats: {
          strength: 15,
          dexterity: 12
        }
      };
      mockRequest.query = {
        search: 'fantasy characters',
        sort: 'name'
      };

      // Act
      securityValidation(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    test('should detect and block XSS attacks in request body', () => {
      // Arrange
      mockRequest.body = {
        name: 'Malicious User',
        description: '<script>alert("XSS Attack")</script>',
        bio: 'Normal text content'
      };

      // Act
      securityValidation(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'Security validation failed',
        code: 'SECURITY_VIOLATION',
        message: 'Request contains potentially malicious content'
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Security validation failed', expect.objectContaining({
        errors: ['XSS detected in description']
      }));
    });

    test('should detect and block SQL injection attacks in request body', () => {
      // Arrange
      mockRequest.body = {
        search: "'; DROP TABLE users; --",
        filter: 'name = user'
      };

      // Act
      securityValidation(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'Security validation failed',
        code: 'SECURITY_VIOLATION',
        message: 'Request contains potentially malicious content'
      });
      expect(logger.warn).toHaveBeenCalledWith('Security validation failed', expect.objectContaining({
        errors: ['SQL injection detected in search']
      }));
    });

    test('should detect XSS attacks in query parameters', () => {
      // Arrange
      mockRequest.query = {
        search: 'normal search',
        filter: '<script>window.location="http://evil.com"</script>'
      };

      // Act
      securityValidation(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(logger.warn).toHaveBeenCalledWith('Security validation failed', expect.objectContaining({
        errors: ['XSS detected in query parameter: filter']
      }));
    });

    test('should detect SQL injection in query parameters', () => {
      // Arrange
      mockRequest.query = {
        id: '1 UNION SELECT * FROM users',
        category: 'fantasy'
      };

      // Act
      securityValidation(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(logger.warn).toHaveBeenCalledWith('Security validation failed', expect.objectContaining({
        errors: ['SQL injection detected in query parameter: id']
      }));
    });

    test('should detect excessively long input strings', () => {
      // Arrange
      const longString = 'A'.repeat(15000); // Over 10,000 character limit
      mockRequest.body = {
        description: longString,
        name: 'Normal Name'
      };

      // Act
      securityValidation(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(logger.warn).toHaveBeenCalledWith('Security validation failed', expect.objectContaining({
        errors: ['Excessively long input in description']
      }));
    });

    test('should handle nested objects in security validation', () => {
      // Arrange
      mockRequest.body = {
        user: {
          profile: {
            bio: '<script>alert("nested XSS")</script>',
            preferences: {
              theme: 'dark'
            }
          }
        }
      };

      // Act
      securityValidation(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(logger.warn).toHaveBeenCalledWith('Security validation failed', expect.objectContaining({
        errors: ['XSS detected in user.profile.bio']
      }));
    });

    test('should handle multiple security violations', () => {
      // Arrange
      mockRequest.body = {
        title: '<script>alert("XSS")</script>',
        query: 'SELECT * FROM secrets',
        description: 'B'.repeat(12000)
      };

      // Act
      securityValidation(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(logger.warn).toHaveBeenCalledWith('Security validation failed', expect.objectContaining({
        errors: [
          'XSS detected in title',
          'SQL injection detected in query',
          'Excessively long input in description'
        ]
      }));
    });
  });

  describe('Rate Limit Information - rateLimitInfo', () => {
    test('should set rate limit headers for authenticated user', () => {
      // Arrange
      mockRequest.ip = '192.168.1.100';
      mockRequest.user = { userId: 'user-123', sessionId: 'session-456' };

      // Act
      rateLimitInfo(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockSetHeader).toHaveBeenCalledWith('X-RateLimit-Identifier', '192.168.1.100user-123');
      expect(mockSetHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
      expect(mockNext).toHaveBeenCalled();
    });

    test('should set rate limit headers for anonymous user', () => {
      // Arrange
      mockRequest.ip = '10.0.0.1';
      mockRequest.user = undefined;

      // Act
      rateLimitInfo(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockSetHeader).toHaveBeenCalledWith('X-RateLimit-Identifier', '10.0.0.1anonymous');
      expect(mockSetHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
      expect(mockNext).toHaveBeenCalled();
    });

    test('should set reset time approximately 15 minutes in the future', () => {
      // Arrange
      const now = Date.now();

      // Act
      rateLimitInfo(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      const resetTime = mockSetHeader.mock.calls.find(call => call[0] === 'X-RateLimit-Reset')[1];
      const expectedResetTime = now + 15 * 60 * 1000;
      expect(resetTime).toBeGreaterThan(now);
      expect(resetTime).toBeLessThanOrEqual(expectedResetTime + 1000); // Allow 1 second tolerance
    });
  });

  describe('File Upload Validation - fileUploadValidation', () => {
    test('should allow valid file uploads', () => {
      // Arrange
      mockRequest.files = [
        {
          originalname: 'profile.jpg',
          mimetype: 'image/jpeg',
          size: 1024 * 1024 // 1MB
        },
        {
          originalname: 'config.json',
          mimetype: 'application/json',
          size: 512 // 512 bytes
        }
      ];

      // Act
      fileUploadValidation(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    test('should reject files with invalid MIME types', () => {
      // Arrange
      mockRequest.files = [
        {
          originalname: 'malicious.exe',
          mimetype: 'application/x-msdownload',
          size: 1024
        }
      ];

      // Act
      fileUploadValidation(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'Invalid file type',
        code: 'INVALID_FILE_TYPE',
        allowedTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'text/plain',
          'application/json'
        ]
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('File upload validation failed: Invalid MIME type', expect.any(Object));
    });

    test('should reject files that are too large', () => {
      // Arrange
      mockRequest.files = [
        {
          originalname: 'large-image.jpg',
          mimetype: 'image/jpeg',
          size: 15 * 1024 * 1024 // 15MB (over 10MB limit)
        }
      ];

      // Act
      fileUploadValidation(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'File too large',
        code: 'FILE_TOO_LARGE',
        maxSize: 10 * 1024 * 1024
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('File upload validation failed: File too large', expect.any(Object));
    });

    test('should handle single file upload', () => {
      // Arrange
      mockRequest.files = {
        originalname: 'avatar.png',
        mimetype: 'image/png',
        size: 2048
      };

      // Act
      fileUploadValidation(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
    });

    test('should pass through when no files are uploaded', () => {
      // Arrange
      mockRequest.files = undefined;

      // Act
      fileUploadValidation(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });
  });

  describe('CORS Security Validation - corsSecurityValidation', () => {
    test('should allow requests from localhost origins in development', () => {
      // Arrange
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://localhost:3000'
      ];

      for (const origin of allowedOrigins) {
        jest.clearAllMocks();
        mockRequest.get = jest.fn((header) => {
          if (header === 'Origin') return origin;
          return undefined;
        });

        // Act
        corsSecurityValidation(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
        expect(mockStatus).not.toHaveBeenCalled();
      }
    });

    test('should reject requests from unauthorized origins', () => {
      // Arrange
      mockRequest.get = jest.fn((header) => {
        if (header === 'Origin') return 'http://malicious-site.com';
        return undefined;
      });

      // Act
      corsSecurityValidation(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'Origin not allowed',
        code: 'CORS_ORIGIN_NOT_ALLOWED'
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('CORS validation failed: Origin not allowed', expect.any(Object));
    });

    test('should allow production origins when configured', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://myapp.com,https://www.myapp.com';
      
      mockRequest.get = jest.fn((header) => {
        if (header === 'Origin') return 'https://myapp.com';
        return undefined;
      });

      // Act
      corsSecurityValidation(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    test('should allow requests without Origin header', () => {
      // Arrange
      mockRequest.get = jest.fn(() => undefined);

      // Act
      corsSecurityValidation(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });
  });

  describe('Response Time Monitoring - responseTimeMonitoring', () => {
    test('should log normal response times', () => {
      // Arrange
      const mockFinishCallback = jest.fn();
      mockResponse.on = jest.fn((event, callback) => {
        if (event === 'finish') {
          mockFinishCallback.mockImplementation(callback);
        }
      });

      // Act
      responseTimeMonitoring(mockRequest as Request, mockResponse as Response, mockNext);

      // Simulate response completion after 100ms
      setTimeout(() => {
        mockFinishCallback();
      }, 100);

      // Wait for the timeout to complete
      return new Promise(resolve => {
        setTimeout(() => {
          // Assert
          expect(mockNext).toHaveBeenCalled();
          expect(logger.info).toHaveBeenCalledWith('Request completed', expect.objectContaining({
            path: '/api/test',
            method: 'POST',
            status: 200,
            duration: expect.stringMatching(/\d+ms/),
            ip: '192.168.1.100',
            userId: 'user-123'
          }));
          resolve(undefined);
        }, 150);
      });
    });

    test('should warn about slow responses', () => {
      // Arrange
      const mockFinishCallback = jest.fn();
      mockResponse.on = jest.fn((event, callback) => {
        if (event === 'finish') {
          mockFinishCallback.mockImplementation(callback);
        }
      });

      // Mock Date.now to simulate slow response
      const originalDateNow = Date.now;
      let startTime = 1000000;
      Date.now = jest.fn()
        .mockReturnValueOnce(startTime) // Start time
        .mockReturnValueOnce(startTime + 6000); // End time (6 seconds later)

      // Act
      responseTimeMonitoring(mockRequest as Request, mockResponse as Response, mockNext);
      mockFinishCallback();

      // Assert
      expect(logger.warn).toHaveBeenCalledWith('Slow response detected', expect.objectContaining({
        path: '/api/test',
        method: 'POST',
        duration: '6000ms'
      }));

      // Restore Date.now
      Date.now = originalDateNow;
    });

    test('should handle responses without user information', () => {
      // Arrange
      mockRequest.user = undefined;
      const mockFinishCallback = jest.fn();
      mockResponse.on = jest.fn((event, callback) => {
        if (event === 'finish') {
          mockFinishCallback.mockImplementation(callback);
        }
      });

      // Act
      responseTimeMonitoring(mockRequest as Request, mockResponse as Response, mockNext);
      mockFinishCallback();

      // Assert
      expect(logger.info).toHaveBeenCalledWith('Request completed', expect.objectContaining({
        userId: undefined
      }));
    });
  });

  describe('Integration and Edge Cases', () => {
    test('should handle empty request objects gracefully', () => {
      // Arrange
      mockRequest = {
        method: 'GET',
        path: '/api/empty',
        ip: '127.0.0.1',
        get: jest.fn(() => undefined)
      };

      // Act & Assert - should not throw errors
      expect(() => {
        securityValidation(mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();

      expect(() => {
        rateLimitInfo(mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();

      expect(() => {
        fileUploadValidation(mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
    });

    test('should handle malformed request data gracefully', () => {
      // Arrange
      mockRequest.body = null;
      mockRequest.query = null;

      // Act
      securityValidation(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    test('should preserve request data after successful validation', () => {
      // Arrange
      const originalBody = {
        name: 'Test User',
        data: { nested: 'value' }
      };
      mockRequest.body = originalBody;

      // Act
      securityValidation(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.body).toEqual(originalBody);
    });
  });
});