/**
 * Error Handler Middleware Unit Tests
 * Tests for Error Handling, Sanitization, and Monitoring Integration
 * t-WADA naming convention: errorHandler.unit.test.ts
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import type { APIResponse } from '@ai-agent-trpg/types';
import {
  errorHandler,
  asyncHandler,
  AppError,
  ValidationError,
  AIServiceError,
  DatabaseError,
  NotFoundError,
  UnauthorizedError,
  RateLimitError
} from './errorHandler';

// Mock the error monitoring service
jest.mock('../services/errorMonitoringService', () => ({
  errorMonitoringService: {
    logError: jest.fn()
  }
}));

import { errorMonitoringService } from '../services/errorMonitoringService';

describe('Error Handler Middleware - Error Processing and Response Generation', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJsonResponse: jest.Mock;
  let mockStatus: jest.Mock;
  let mockSet: jest.Mock;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create fresh mock response
    mockJsonResponse = jest.fn();
    mockStatus = jest.fn(() => mockResponse);
    mockSet = jest.fn();
    mockResponse = {
      status: mockStatus,
      json: mockJsonResponse,
      set: mockSet
    };

    // Create fresh mock request
    mockRequest = {
      method: 'POST',
      path: '/api/test-endpoint',
      ip: '192.168.1.100',
      get: jest.fn((header) => {
        if (header === 'User-Agent') return 'Test-User-Agent/1.0';
        return undefined;
      }),
      user: {
        userId: 'user-123',
        sessionId: 'session-456'
      }
    };

    // Create mock next function
    mockNext = jest.fn();

    // Reset environment variables
    delete process.env.NODE_ENV;
  });

  describe('Custom Error Classes', () => {
    test('should create ValidationError with correct properties', () => {
      // Arrange
      const message = 'Invalid input data';
      const details = { field: 'email', value: 'invalid-email' };

      // Act
      const error = new ValidationError(message, details);

      // Assert
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe(message);
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.userMessage).toBe(message);
      expect(error.details).toEqual(details);
    });

    test('should create AIServiceError with provider information', () => {
      // Arrange
      const message = 'OpenAI API request failed';
      const provider = 'openai';
      const details = { requestId: 'req-123', model: 'gpt-4' };

      // Act
      const error = new AIServiceError(message, provider, details);

      // Assert
      expect(error.name).toBe('AIServiceError');
      expect(error.message).toBe(message);
      expect(error.statusCode).toBe(502);
      expect(error.code).toBe('AI_SERVICE_ERROR');
      expect(error.provider).toBe(provider);
      expect(error.userMessage).toBe('AI service error: OpenAI API request failed. Please check your API key and try again.');
      expect(error.details).toEqual(details);
    });

    test('should create DatabaseError with appropriate user message', () => {
      // Arrange
      const message = 'Connection timeout to SQLite database';
      const details = { timeout: 5000, query: 'SELECT * FROM campaigns' };

      // Act
      const error = new DatabaseError(message, details);

      // Assert
      expect(error.name).toBe('DatabaseError');
      expect(error.message).toBe(message);
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.userMessage).toBe('Database error occurred. Please try again later.');
      expect(error.details).toEqual(details);
    });

    test('should create NotFoundError with resource information', () => {
      // Arrange
      const resource = 'Campaign';
      const id = 'campaign-123';

      // Act
      const error = new NotFoundError(resource, id);

      // Assert
      expect(error.name).toBe('NotFoundError');
      expect(error.message).toBe('Campaign with ID campaign-123 not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.userMessage).toBe('Campaign with ID campaign-123 not found');
    });

    test('should create NotFoundError without ID', () => {
      // Arrange
      const resource = 'User Profile';

      // Act
      const error = new NotFoundError(resource);

      // Assert
      expect(error.message).toBe('User Profile not found');
      expect(error.userMessage).toBe('User Profile not found');
    });

    test('should create UnauthorizedError with default message', () => {
      // Act
      const error = new UnauthorizedError();

      // Assert
      expect(error.name).toBe('UnauthorizedError');
      expect(error.message).toBe('Unauthorized access');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.userMessage).toBe('Unauthorized access');
    });

    test('should create UnauthorizedError with custom message', () => {
      // Arrange
      const customMessage = 'Invalid session token';

      // Act
      const error = new UnauthorizedError(customMessage);

      // Assert
      expect(error.message).toBe(customMessage);
      expect(error.userMessage).toBe(customMessage);
    });

    test('should create RateLimitError with retry information', () => {
      // Arrange
      const retryAfter = 300; // 5 minutes

      // Act
      const error = new RateLimitError(retryAfter);

      // Assert
      expect(error.name).toBe('RateLimitError');
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.retryAfter).toBe(retryAfter);
      expect(error.userMessage).toBe('Rate limit exceeded. Please try again in 300 seconds.');
    });
  });

  describe('Error Handler Middleware Processing', () => {
    test('should handle ValidationError correctly', () => {
      // Arrange
      const error = new ValidationError('Email format is invalid', { field: 'email' });

      // Act
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Email format is invalid',
        timestamp: expect.any(String)
      });
      expect(errorMonitoringService.logError).toHaveBeenCalledWith(
        error,
        'unknown',
        expect.objectContaining({
          method: 'POST',
          path: '/api/test-endpoint',
          statusCode: 400
        })
      );
    });

    test('should handle AIServiceError with provider context', () => {
      // Arrange
      const error = new AIServiceError('API quota exceeded', 'anthropic', { quotaType: 'monthly' });

      // Act
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(502);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'AI service error: API quota exceeded. Please check your API key and try again.',
        timestamp: expect.any(String)
      });
    });

    test('should handle DatabaseError with sanitized message', () => {
      // Arrange
      const error = new DatabaseError('Connection failed to database');

      // Act
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Database error occurred. Please try again later.',
        timestamp: expect.any(String)
      });
    });

    test('should handle NotFoundError for campaigns', () => {
      // Arrange
      const error = new NotFoundError('Campaign', 'camp-404');
      mockRequest.path = '/api/campaigns/camp-404';

      // Act
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Campaign with ID camp-404 not found',
        timestamp: expect.any(String)
      });
      expect(errorMonitoringService.logError).toHaveBeenCalledWith(
        error,
        'campaigns',
        expect.any(Object)
      );
    });

    test('should handle RateLimitError with retry header', () => {
      // Arrange
      const retryAfter = 60;
      const error = new RateLimitError(retryAfter);

      // Act
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(429);
      expect(mockSet).toHaveBeenCalledWith('Retry-After', '60');
      expect(mockJsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Rate limit exceeded. Please try again in 60 seconds.',
        timestamp: expect.any(String)
      });
    });

    test('should handle generic errors with default status code', () => {
      // Arrange
      const error = new Error('Unexpected application error') as AppError;

      // Act
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Unexpected application error',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Development Environment Debug Information', () => {
    test('should include debug information in development environment', () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const error = new ValidationError('Test validation error');
      error.stack = 'Error stack trace';

      // Act
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockJsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Test validation error',
        timestamp: expect.any(String),
        debug: {
          originalMessage: 'Test validation error',
          stack: 'Error stack trace',
          details: undefined
        }
      });
    });

    test('should not include debug information in production environment', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const error = new ValidationError('Production validation error');
      error.stack = 'Error stack trace';

      // Act
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      const response = mockJsonResponse.mock.calls[0][0];
      expect(response.debug).toBeUndefined();
      expect(response).toEqual({
        success: false,
        error: 'Production validation error',
        timestamp: expect.any(String)
      });
    });

    test('should include error details in development debug info', () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const details = { invalidFields: ['email', 'password'], requestId: 'req-123' };
      const error = new ValidationError('Multiple validation errors', details);

      // Act
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      const response = mockJsonResponse.mock.calls[0][0];
      expect(response.debug.details).toEqual(details);
    });
  });

  describe('Component Path Resolution', () => {
    test('should correctly identify AI agent component', () => {
      // Arrange
      const error = new ValidationError('AI agent validation error');
      mockRequest.path = '/api/ai-agent/generate-character';

      // Act
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(errorMonitoringService.logError).toHaveBeenCalledWith(
        error,
        'ai-agent',
        expect.any(Object)
      );
    });

    test('should correctly identify AI game master component', () => {
      // Arrange
      const error = new AIServiceError('Game master service error', 'openai');
      mockRequest.path = '/api/ai-game-master/session-overview';

      // Act
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(errorMonitoringService.logError).toHaveBeenCalledWith(
        error,
        'ai-game-master',
        expect.any(Object)
      );
    });

    test('should correctly identify character management component', () => {
      // Arrange
      const error = new NotFoundError('Character');
      mockRequest.path = '/api/characters/char-123';

      // Act
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(errorMonitoringService.logError).toHaveBeenCalledWith(
        error,
        'characters',
        expect.any(Object)
      );
    });

    test('should correctly identify session management component', () => {
      // Arrange
      const error = new DatabaseError('Session database error');
      mockRequest.path = '/api/sessions/sess-456/messages';

      // Act
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(errorMonitoringService.logError).toHaveBeenCalledWith(
        error,
        'sessions',
        expect.any(Object)
      );
    });

    test('should identify unknown component for unrecognized paths', () => {
      // Arrange
      const error = new ValidationError('Unknown endpoint error');
      mockRequest.path = '/api/unknown-endpoint/test';

      // Act
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(errorMonitoringService.logError).toHaveBeenCalledWith(
        error,
        'unknown',
        expect.any(Object)
      );
    });

    test('should identify all supported component types correctly', () => {
      // Arrange
      const testCases = [
        { path: '/api/ai-character/generate', expected: 'ai-character' },
        { path: '/api/ai-milestone/create', expected: 'ai-milestone' },
        { path: '/api/quests/quest-123', expected: 'quests' },
        { path: '/api/milestones/milestone-456', expected: 'milestones' },
        { path: '/api/locations/loc-789', expected: 'locations' },
        { path: '/api/entity-pool/search', expected: 'entity-pool' },
        { path: '/api/monitoring/metrics', expected: 'monitoring' },
        { path: '/api/logs/system', expected: 'logs' },
        { path: '/api/health/check', expected: 'health' }
      ];

      testCases.forEach(({ path, expected }) => {
        jest.clearAllMocks();
        const error = new ValidationError('Test error');
        mockRequest.path = path;

        // Act
        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(errorMonitoringService.logError).toHaveBeenCalledWith(
          error,
          expected,
          expect.any(Object)
        );
      });
    });
  });

  describe('Error Message Sanitization', () => {
    test('should sanitize OpenAI API keys from error messages', () => {
      // Arrange
      const error = new Error('Authentication failed with key sk-1234567890abcdef') as AppError;

      // Act
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockJsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication failed with key [REDACTED]',
        timestamp: expect.any(String)
      });
    });

    test('should sanitize Bearer tokens from error messages', () => {
      // Arrange
      const error = new Error('Invalid Bearer abc123def456') as AppError;

      // Act
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockJsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid [REDACTED]',
        timestamp: expect.any(String)
      });
    });

    test('should sanitize various token patterns from error messages', () => {
      // Arrange
      const testCases = [
        {
          input: 'Failed with token: abc123def456',
          expected: 'Failed with [REDACTED]'
        },
        {
          input: 'Invalid key=secret789xyz',
          expected: 'Invalid [REDACTED]'
        },
        {
          input: 'Error secret: confidential-data-123',
          expected: 'Error [REDACTED]'
        }
      ];

      testCases.forEach(({ input, expected }) => {
        jest.clearAllMocks();
        const error = new Error(input) as AppError;

        // Act
        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        // Assert
        expect(mockJsonResponse).toHaveBeenCalledWith({
          success: false,
          error: expected,
          timestamp: expect.any(String)
        });
      });
    });

    test('should not modify safe error messages', () => {
      // Arrange
      const safeMessage = 'User validation failed: email format is invalid';
      const error = new Error(safeMessage) as AppError;

      // Act
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockJsonResponse).toHaveBeenCalledWith({
        success: false,
        error: safeMessage,
        timestamp: expect.any(String)
      });
    });
  });

  describe('Request Context Logging', () => {
    test('should log complete request context with user information', () => {
      // Arrange
      const error = new DatabaseError('Test database error');
      mockRequest = {
        method: 'PUT',
        path: '/api/campaigns/camp-123',
        ip: '10.0.0.1',
        get: jest.fn(() => 'Custom-Client/2.0'),
        user: { userId: 'user-789', sessionId: 'session-012' },
        sessionId: 'req-session-345',
        campaignId: 'campaign-678'
      };

      // Act
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(errorMonitoringService.logError).toHaveBeenCalledWith(
        error,
        'campaigns',
        {
          method: 'PUT',
          path: '/api/campaigns/camp-123',
          userAgent: 'Custom-Client/2.0',
          ip: '10.0.0.1',
          userId: 'user-789',
          sessionId: 'req-session-345',
          campaignId: 'campaign-678',
          statusCode: 500
        }
      );
    });

    test('should log context without optional fields when not present', () => {
      // Arrange
      const error = new ValidationError('Test validation error');
      mockRequest = {
        method: 'GET',
        path: '/api/health/check',
        ip: '192.168.1.1',
        get: jest.fn(() => undefined)
      };

      // Act
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(errorMonitoringService.logError).toHaveBeenCalledWith(
        error,
        'health',
        {
          method: 'GET',
          path: '/api/health/check',
          userAgent: undefined,
          ip: '192.168.1.1',
          userId: undefined,
          sessionId: undefined,
          campaignId: undefined,
          statusCode: 400
        }
      );
    });
  });

  describe('Async Handler Wrapper', () => {
    test('should wrap async functions and catch rejections', async () => {
      // Arrange
      const asyncFunction = jest.fn().mockRejectedValue(new Error('Async error'));
      const wrappedFunction = asyncHandler(asyncFunction);

      // Act
      await wrappedFunction(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(asyncFunction).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalledWith(new Error('Async error'));
    });

    test('should pass through successful async function calls', async () => {
      // Arrange
      const successfulResult = { data: 'success' };
      const asyncFunction = jest.fn().mockResolvedValue(successfulResult);
      const wrappedFunction = asyncHandler(asyncFunction);

      // Act
      const result = await wrappedFunction(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(asyncFunction).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(result).toBe(successfulResult);
    });

    test('should handle synchronous errors in async wrapper', async () => {
      // Arrange
      const asyncFunction = jest.fn().mockImplementation(() => {
        throw new Error('Sync error in async function');
      });
      const wrappedFunction = asyncHandler(asyncFunction);

      // Act
      await wrappedFunction(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(new Error('Sync error in async function'));
    });

    test('should handle async functions that return promises', async () => {
      // Arrange
      const asyncFunction = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'delayed result';
      });
      const wrappedFunction = asyncHandler(asyncFunction);

      // Act
      const result = await wrappedFunction(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(result).toBe('delayed result');
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Error Response Format Validation', () => {
    test('should always return APIResponse format', () => {
      // Arrange
      const error = new ValidationError('Format test error');

      // Act
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      const response = mockJsonResponse.mock.calls[0][0] as APIResponse<null>;
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.timestamp).toBeDefined();
      expect(new Date(response.timestamp)).toBeInstanceOf(Date);
    });

    test('should maintain consistent timestamp format', () => {
      // Arrange
      const error = new DatabaseError('Timestamp test error');

      // Act
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      const response = mockJsonResponse.mock.calls[0][0] as APIResponse<null>;
      expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('should handle errors without userMessage property', () => {
      // Arrange
      const error = new Error('Generic error without userMessage') as AppError;

      // Act
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockJsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Generic error without userMessage',
        timestamp: expect.any(String)
      });
    });
  });
});