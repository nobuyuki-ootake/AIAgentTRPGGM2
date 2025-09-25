/**
 * Authentication Middleware Unit Tests
 * Tests for JWT, API Key, Session, and Development Authentication
 * t-WADA naming convention: auth.middleware.unit.test.ts
 */

import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  authenticateToken,
  developmentAuth,
  authenticateApiKey,
  authenticateSession,
  generateToken
} from './auth.middleware';

// Mock dependencies
jest.mock('../config/config', () => ({
  config: {
    nodeEnv: 'test',
    security: {
      jwtSecret: 'test-jwt-secret-key-for-unit-tests'
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

import { logger } from '../utils/logger';

describe('Authentication Middleware - JWT, API Key, and Session Authentication', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJsonResponse: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create fresh mock response
    mockJsonResponse = jest.fn();
    mockStatus = jest.fn(() => mockResponse);
    mockResponse = {
      status: mockStatus,
      json: mockJsonResponse
    };

    // Create fresh mock request
    mockRequest = {
      headers: {},
      path: '/test-endpoint',
      method: 'GET',
      ip: '127.0.0.1',
      get: jest.fn(() => 'Test-User-Agent')
    };

    // Create mock next function
    mockNext = jest.fn();

    // Clear process.env for clean state
    delete process.env.VALID_API_KEYS;
  });

  afterEach(() => {
    // Clean up any environment variables
    delete process.env.VALID_API_KEYS;
  });

  describe('JWT Token Authentication - authenticateToken', () => {
    test('should authenticate valid JWT token successfully', () => {
      // Arrange
      const userId = 'user-123';
      const sessionId = 'session-456';
      const validToken = jwt.sign(
        { userId, sessionId },
        'test-jwt-secret-key-for-unit-tests',
        { expiresIn: '1h' }
      );

      mockRequest.headers = {
        authorization: `Bearer ${validToken}`
      };

      // Act
      authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.user).toEqual({
        userId,
        sessionId
      });
      expect(mockNext).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Authentication successful', expect.objectContaining({
        userId,
        sessionId,
        path: '/test-endpoint',
        method: 'GET'
      }));
    });

    test('should reject request when no token is provided', () => {
      // Arrange
      mockRequest.headers = {};

      // Act
      authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'Access token is required',
        code: 'TOKEN_REQUIRED'
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Authentication failed: No token provided', expect.any(Object));
    });

    test('should reject request when authorization header has invalid format', () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'InvalidFormat'
      };

      // Act
      authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'Access token is required',
        code: 'TOKEN_REQUIRED'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject expired JWT tokens', () => {
      // Arrange
      const expiredToken = jwt.sign(
        { userId: 'user-123', sessionId: 'session-456' },
        'test-jwt-secret-key-for-unit-tests',
        { expiresIn: '-1h' } // Already expired
      );

      mockRequest.headers = {
        authorization: `Bearer ${expiredToken}`
      };

      // Act
      authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Authentication failed: Invalid token', expect.any(Object));
    });

    test('should reject malformed JWT tokens', () => {
      // Arrange
      const malformedToken = 'not.a.valid.jwt.token';

      mockRequest.headers = {
        authorization: `Bearer ${malformedToken}`
      };

      // Act
      authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'Invalid token format',
        code: 'TOKEN_INVALID'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject tokens with invalid secret', () => {
      // Arrange
      const tokenWithWrongSecret = jwt.sign(
        { userId: 'user-123', sessionId: 'session-456' },
        'wrong-secret-key',
        { expiresIn: '1h' }
      );

      mockRequest.headers = {
        authorization: `Bearer ${tokenWithWrongSecret}`
      };

      // Act
      authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'Invalid token format',
        code: 'TOKEN_INVALID'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject tokens with missing required payload fields', () => {
      // Arrange
      const incompleteToken = jwt.sign(
        { userId: 'user-123' }, // Missing sessionId
        'test-jwt-secret-key-for-unit-tests',
        { expiresIn: '1h' }
      );

      mockRequest.headers = {
        authorization: `Bearer ${incompleteToken}`
      };

      // Act
      authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'Token verification failed',
        code: 'TOKEN_VERIFICATION_FAILED'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Development Authentication - developmentAuth', () => {
    test('should authenticate with valid development token in development environment', () => {
      // Arrange
      jest.doMock('../config/config', () => ({
        config: {
          nodeEnv: 'development',
          security: {
            jwtSecret: 'test-jwt-secret-key-for-unit-tests'
          }
        }
      }));

      mockRequest.headers = {
        'x-dev-auth': 'dev-mode-enabled'
      };

      // Act
      developmentAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.user).toEqual({
        userId: 'dev-user-id',
        sessionId: 'dev-session-id'
      });
      expect(mockNext).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Development authentication successful', expect.any(Object));
    });

    test('should reject request with invalid development token in development environment', () => {
      // Arrange
      jest.doMock('../config/config', () => ({
        config: {
          nodeEnv: 'development',
          security: {
            jwtSecret: 'test-jwt-secret-key-for-unit-tests'
          }
        }
      }));

      mockRequest.headers = {
        'x-dev-auth': 'invalid-token'
      };

      // Act
      developmentAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'Development authentication required',
        code: 'DEV_AUTH_REQUIRED'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject request without development token in development environment', () => {
      // Arrange
      jest.doMock('../config/config', () => ({
        config: {
          nodeEnv: 'development',
          security: {
            jwtSecret: 'test-jwt-secret-key-for-unit-tests'
          }
        }
      }));

      mockRequest.headers = {};

      // Act
      developmentAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'Development authentication required',
        code: 'DEV_AUTH_REQUIRED'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should fallback to JWT authentication in production environment', () => {
      // Arrange
      jest.doMock('../config/config', () => ({
        config: {
          nodeEnv: 'production',
          security: {
            jwtSecret: 'test-jwt-secret-key-for-unit-tests'
          }
        }
      }));

      const validToken = jwt.sign(
        { userId: 'user-123', sessionId: 'session-456' },
        'test-jwt-secret-key-for-unit-tests',
        { expiresIn: '1h' }
      );

      mockRequest.headers = {
        'x-dev-auth': 'dev-mode-enabled',
        authorization: `Bearer ${validToken}`
      };

      // Act
      developmentAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.user).toEqual({
        userId: 'user-123',
        sessionId: 'session-456'
      });
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('API Key Authentication - authenticateApiKey', () => {
    test('should authenticate valid API key in production environment', () => {
      // Arrange
      jest.doMock('../config/config', () => ({
        config: {
          nodeEnv: 'production',
          security: {
            jwtSecret: 'test-jwt-secret-key-for-unit-tests'
          }
        }
      }));

      process.env.VALID_API_KEYS = 'prod-key-1,prod-key-2,prod-key-3';
      mockRequest.headers = {
        'x-api-key': 'prod-key-2'
      };

      // Act
      authenticateApiKey(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('API key authentication successful', expect.objectContaining({
        path: '/test-endpoint',
        method: 'GET',
        apiKeyPrefix: 'prod-key...'
      }));
    });

    test('should reject invalid API key in production environment', () => {
      // Arrange
      jest.doMock('../config/config', () => ({
        config: {
          nodeEnv: 'production',
          security: {
            jwtSecret: 'test-jwt-secret-key-for-unit-tests'
          }
        }
      }));

      process.env.VALID_API_KEYS = 'prod-key-1,prod-key-2,prod-key-3';
      mockRequest.headers = {
        'x-api-key': 'invalid-key'
      };

      // Act
      authenticateApiKey(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'Invalid API key',
        code: 'API_KEY_INVALID'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should authenticate valid development API key in development environment', () => {
      // Arrange
      jest.doMock('../config/config', () => ({
        config: {
          nodeEnv: 'development',
          security: {
            jwtSecret: 'test-jwt-secret-key-for-unit-tests'
          }
        }
      }));

      mockRequest.headers = {
        'x-api-key': 'dev-api-test-key-123'
      };

      // Act
      authenticateApiKey(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('API key authentication successful', expect.any(Object));
    });

    test('should reject invalid development API key format in development environment', () => {
      // Arrange
      jest.doMock('../config/config', () => ({
        config: {
          nodeEnv: 'development',
          security: {
            jwtSecret: 'test-jwt-secret-key-for-unit-tests'
          }
        }
      }));

      mockRequest.headers = {
        'x-api-key': 'invalid-dev-key'
      };

      // Act
      authenticateApiKey(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'Invalid development API key format',
        code: 'DEV_API_KEY_INVALID'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject request without API key', () => {
      // Arrange
      mockRequest.headers = {};

      // Act
      authenticateApiKey(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'API key is required',
        code: 'API_KEY_REQUIRED'
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('API key authentication failed: No API key provided', expect.any(Object));
    });
  });

  describe('Session Authentication - authenticateSession', () => {
    test('should authenticate valid session ID', () => {
      // Arrange
      mockRequest.headers = {
        'x-session-id': 'valid-session-12345'
      };

      // Act
      authenticateSession(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
    });

    test('should reject invalid session ID format', () => {
      // Arrange
      mockRequest.headers = {
        'x-session-id': 'invalid'
      };

      // Act
      authenticateSession(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'Invalid or expired session',
        code: 'SESSION_INVALID'
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Session authentication failed: Invalid session', expect.any(Object));
    });

    test('should reject request without session ID', () => {
      // Arrange
      mockRequest.headers = {};

      // Act
      authenticateSession(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'Session ID is required',
        code: 'SESSION_ID_REQUIRED'
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Session authentication failed: No session ID provided', expect.any(Object));
    });

    test('should reject short session IDs', () => {
      // Arrange
      mockRequest.headers = {
        'x-session-id': 'short'
      };

      // Act
      authenticateSession(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'Invalid or expired session',
        code: 'SESSION_INVALID'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject session IDs without required format', () => {
      // Arrange
      mockRequest.headers = {
        'x-session-id': 'longsessionidwithoutdash'
      };

      // Act
      authenticateSession(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'Invalid or expired session',
        code: 'SESSION_INVALID'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('JWT Token Generation - generateToken', () => {
    test('should generate valid JWT token with correct payload', () => {
      // Arrange
      const userId = 'user-123';
      const sessionId = 'session-456';

      // Act
      const token = generateToken(userId, sessionId);

      // Assert
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify token can be decoded and contains correct data
      const decoded = jwt.verify(token, 'test-jwt-secret-key-for-unit-tests') as any;
      expect(decoded.userId).toBe(userId);
      expect(decoded.sessionId).toBe(sessionId);
      expect(decoded.iss).toBe('trpg-ai-gm');
      expect(decoded.aud).toBe('trpg-users');
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });

    test('should generate unique tokens for different users', () => {
      // Arrange & Act
      const token1 = generateToken('user-1', 'session-1');
      const token2 = generateToken('user-2', 'session-2');

      // Assert
      expect(token1).not.toBe(token2);

      const decoded1 = jwt.verify(token1, 'test-jwt-secret-key-for-unit-tests') as any;
      const decoded2 = jwt.verify(token2, 'test-jwt-secret-key-for-unit-tests') as any;

      expect(decoded1.userId).toBe('user-1');
      expect(decoded2.userId).toBe('user-2');
    });

    test('should generate tokens with proper expiration', () => {
      // Arrange
      const userId = 'user-123';
      const sessionId = 'session-456';

      // Act
      const token = generateToken(userId, sessionId);

      // Assert
      const decoded = jwt.verify(token, 'test-jwt-secret-key-for-unit-tests') as any;
      const now = Math.floor(Date.now() / 1000);
      const expectedExpiry = now + (7 * 24 * 60 * 60); // 7 days for test environment

      // Allow some tolerance for timing differences
      expect(decoded.exp).toBeGreaterThan(now);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExpiry + 60); // 1 minute tolerance
    });
  });

  describe('Request Information Logging', () => {
    test('should log request details on authentication failure', () => {
      // Arrange
      mockRequest = {
        headers: {},
        path: '/api/sensitive-endpoint',
        method: 'POST',
        ip: '192.168.1.100',
        get: jest.fn((header) => {
          if (header === 'User-Agent') return 'Mozilla/5.0 Test Browser';
          return undefined;
        })
      };

      // Act
      authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(logger.warn).toHaveBeenCalledWith('Authentication failed: No token provided', {
        path: '/api/sensitive-endpoint',
        method: 'POST',
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser'
      });
    });

    test('should log successful authentication with user details', () => {
      // Arrange
      const userId = 'user-789';
      const sessionId = 'session-012';
      const validToken = jwt.sign(
        { userId, sessionId },
        'test-jwt-secret-key-for-unit-tests',
        { expiresIn: '1h' }
      );

      mockRequest = {
        headers: {
          authorization: `Bearer ${validToken}`
        },
        path: '/api/protected-resource',
        method: 'GET',
        ip: '10.0.0.1',
        get: jest.fn(() => 'Test-Client/1.0')
      };

      // Act
      authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(logger.info).toHaveBeenCalledWith('Authentication successful', {
        userId,
        sessionId,
        path: '/api/protected-resource',
        method: 'GET'
      });
    });

    test('should mask sensitive information in API key logs', () => {
      // Arrange
      jest.doMock('../config/config', () => ({
        config: {
          nodeEnv: 'development',
          security: {
            jwtSecret: 'test-jwt-secret-key-for-unit-tests'
          }
        }
      }));

      const longApiKey = 'dev-api-very-long-secret-key-12345';
      mockRequest.headers = {
        'x-api-key': longApiKey
      };

      // Act
      authenticateApiKey(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(logger.info).toHaveBeenCalledWith('API key authentication successful', expect.objectContaining({
        apiKeyPrefix: 'dev-api-...'
      }));

      // Ensure full API key is not logged
      const logCalls = (logger.info as jest.Mock).mock.calls;
      const loggedData = JSON.stringify(logCalls);
      expect(loggedData).not.toContain(longApiKey);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed authorization header gracefully', () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer'
      };

      // Act
      authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'Access token is required',
        code: 'TOKEN_REQUIRED'
      });
    });

    test('should handle empty environment variables for API keys', () => {
      // Arrange
      jest.doMock('../config/config', () => ({
        config: {
          nodeEnv: 'production',
          security: {
            jwtSecret: 'test-jwt-secret-key-for-unit-tests'
          }
        }
      }));

      delete process.env.VALID_API_KEYS;
      mockRequest.headers = {
        'x-api-key': 'any-key'
      };

      // Act
      authenticateApiKey(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        error: 'Invalid API key',
        code: 'API_KEY_INVALID'
      });
    });

    test('should handle JWT verification errors consistently', () => {
      // Arrange
      const invalidTokens = [
        'completely.invalid.token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        'not-even-jwt-format'
      ];

      for (const invalidToken of invalidTokens) {
        jest.clearAllMocks();
        mockRequest.headers = {
          authorization: `Bearer ${invalidToken}`
        };

        // Act
        authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockStatus).toHaveBeenCalledWith(403);
        expect(mockJsonResponse).toHaveBeenCalledWith(expect.objectContaining({
          code: expect.stringMatching(/TOKEN_INVALID|TOKEN_VERIFICATION_FAILED/)
        }));
      }
    });
  });
});