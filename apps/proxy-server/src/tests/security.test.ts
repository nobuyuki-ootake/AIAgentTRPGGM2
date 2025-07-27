import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { 
  authenticateToken, 
  developmentAuth, 
  authenticateApiKey, 
  generateToken 
} from '../middleware/auth.middleware';
import { 
  validateRequest, 
  securityValidation 
} from '../middleware/validation.middleware';
import { z } from 'zod';

// テスト用のモック
const mockRequest = (overrides = {}) => {
  const req = {
    headers: {},
    body: {},
    query: {},
    params: {},
    path: '/test',
    method: 'GET',
    ip: '127.0.0.1',
    get: jest.fn(),
    user: undefined,
    ...overrides
  };
  
  req.get.mockImplementation((header: string) => {
    const headers: Record<string, string> = {
      'User-Agent': 'test-agent',
      'Content-Type': 'application/json',
      ...req.headers
    };
    return headers[header];
  });

  return req as unknown as Request;
};

const mockResponse = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
    setHeader: jest.fn(),
    getHeader: jest.fn(),
    end: jest.fn()
  };
  
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  
  return res as unknown as Response;
};

const mockNext = jest.fn() as NextFunction;

// テスト用の設定
process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only';
process.env.NODE_ENV = 'test';

describe('Security Middleware Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('JWT Authentication Tests', () => {
    test('should reject request without token', () => {
      const req = mockRequest();
      const res = mockResponse();

      authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Access token is required',
          code: 'TOKEN_REQUIRED'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should accept valid JWT token', () => {
      const userId = 'test-user-123';
      const sessionId = 'test-session-456';
      const token = generateToken(userId, sessionId);

      const req = mockRequest({
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      const res = mockResponse();

      authenticateToken(req, res, mockNext);

      expect(req.user).toEqual({
        userId,
        sessionId
      });
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject expired JWT token', () => {
      const expiredToken = jwt.sign(
        { userId: 'test-user', sessionId: 'test-session' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' }
      );

      const req = mockRequest({
        headers: {
          authorization: `Bearer ${expiredToken}`
        }
      });
      const res = mockResponse();

      authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject invalid JWT token', () => {
      const req = mockRequest({
        headers: {
          authorization: 'Bearer invalid-token'
        }
      });
      const res = mockResponse();

      authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid token format',
          code: 'TOKEN_INVALID'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Development Authentication Tests', () => {
    test('should require dev token in development mode', () => {
      process.env.NODE_ENV = 'development';

      const req = mockRequest();
      const res = mockResponse();

      developmentAuth(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Development authentication required',
          code: 'DEV_AUTH_REQUIRED'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should accept valid dev token in development mode', () => {
      process.env.NODE_ENV = 'development';

      const req = mockRequest({
        headers: {
          'x-dev-auth': 'dev-mode-enabled'
        }
      });
      const res = mockResponse();

      developmentAuth(req, res, mockNext);

      expect(req.user).toEqual({
        userId: 'dev-user-id',
        sessionId: 'dev-session-id'
      });
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('API Key Authentication Tests', () => {
    test('should reject request without API key', () => {
      const req = mockRequest();
      const res = mockResponse();

      authenticateApiKey(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'API key is required',
          code: 'API_KEY_REQUIRED'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should accept valid development API key', () => {
      process.env.NODE_ENV = 'development';

      const req = mockRequest({
        headers: {
          'x-api-key': 'dev-api-test-key'
        }
      });
      const res = mockResponse();

      authenticateApiKey(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject invalid development API key format', () => {
      process.env.NODE_ENV = 'development';

      const req = mockRequest({
        headers: {
          'x-api-key': 'invalid-key'
        }
      });
      const res = mockResponse();

      authenticateApiKey(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid development API key format',
          code: 'DEV_API_KEY_INVALID'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Input Validation Tests', () => {
    test('should validate request body successfully', () => {
      const schema = {
        body: z.object({
          name: z.string().min(1),
          email: z.string().email()
        })
      };

      const req = mockRequest({
        body: {
          name: 'Test User',
          email: 'test@example.com'
        }
      });
      const res = mockResponse();

      const middleware = validateRequest(schema);
      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject invalid request body', () => {
      const schema = {
        body: z.object({
          name: z.string().min(1),
          email: z.string().email()
        })
      };

      const req = mockRequest({
        body: {
          name: '',
          email: 'invalid-email'
        }
      });
      const res = mockResponse();

      const middleware = validateRequest(schema);
      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid request data',
          code: 'VALIDATION_ERROR',
          details: expect.any(Array)
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Security Validation Tests', () => {
    test('should detect XSS in request body', () => {
      const req = mockRequest({
        body: {
          comment: '<script>alert("XSS")</script>'
        }
      });
      const res = mockResponse();

      securityValidation(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Security validation failed',
          code: 'SECURITY_VIOLATION'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should detect SQL injection in request body', () => {
      const req = mockRequest({
        body: {
          query: "SELECT * FROM users WHERE id = 1 OR '1'='1'"
        }
      });
      const res = mockResponse();

      securityValidation(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Security validation failed',
          code: 'SECURITY_VIOLATION'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should detect excessively long input', () => {
      const req = mockRequest({
        body: {
          content: 'a'.repeat(10001)
        }
      });
      const res = mockResponse();

      securityValidation(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Security validation failed',
          code: 'SECURITY_VIOLATION'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should pass clean input', () => {
      const req = mockRequest({
        body: {
          message: 'This is a clean message',
          title: 'Clean Title'
        }
      });
      const res = mockResponse();

      securityValidation(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Token Generation Tests', () => {
    test('should generate valid JWT token', () => {
      const userId = 'test-user-123';
      const sessionId = 'test-session-456';
      
      const token = generateToken(userId, sessionId);
      
      expect(token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      expect(decoded.userId).toBe(userId);
      expect(decoded.sessionId).toBe(sessionId);
      expect(decoded.iss).toBe('trpg-ai-gm');
      expect(decoded.aud).toBe('trpg-users');
    });

    test('should generate token with expiration', () => {
      const userId = 'test-user-123';
      const sessionId = 'test-session-456';
      
      const token = generateToken(userId, sessionId);
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });
  });
});

describe('Security Integration Tests', () => {
  test('should handle authentication flow correctly', async () => {
    const userId = 'integration-user';
    const sessionId = 'integration-session';
    
    // 1. Generate token
    const token = generateToken(userId, sessionId);
    
    // 2. Use token in request
    const req = mockRequest({
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    const res = mockResponse();
    
    // 3. Authenticate
    authenticateToken(req, res, mockNext);
    
    // 4. Verify user information is set
    expect(req.user).toEqual({
      userId,
      sessionId
    });
    expect(mockNext).toHaveBeenCalled();
  });

  test('should handle validation and security checks together', () => {
    const schema = {
      body: z.object({
        message: z.string().min(1)
      })
    };

    const req = mockRequest({
      body: {
        message: 'Clean message'
      }
    });
    const res = mockResponse();

    // 1. Validate request structure
    const validateMiddleware = validateRequest(schema);
    validateMiddleware(req, res, () => {
      // 2. Perform security validation
      securityValidation(req, res, mockNext);
    });

    expect(mockNext).toHaveBeenCalled();
  });
});

// テストの後処理
afterAll(() => {
  jest.resetModules();
  process.env.NODE_ENV = 'test';
});