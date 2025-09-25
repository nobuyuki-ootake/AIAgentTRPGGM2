import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { logger } from '../utils/logger';

// JWT認証用の型定義
interface JwtPayload {
  userId: string;
  sessionId: string;
  iat: number;
  exp: number;
}

// 認証されたリクエストの型拡張
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        sessionId: string;
      };
    }
  }
}

// JWT認証ミドルウェア
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.warn('Authentication failed: No token provided', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    return res.status(401).json({ 
      error: 'Access token is required',
      code: 'TOKEN_REQUIRED'
    });
  }

  try {
    const decoded = jwt.verify(token, config.security.jwtSecret) as JwtPayload;
    
    // トークンの有効性をさらに検証
    if (!decoded.userId || !decoded.sessionId) {
      throw new Error('Invalid token payload');
    }

    // リクエストオブジェクトにユーザー情報を追加
    req.user = {
      userId: decoded.userId,
      sessionId: decoded.sessionId
    };

    logger.info('Authentication successful', {
      userId: decoded.userId,
      sessionId: decoded.sessionId,
      path: req.path,
      method: req.method
    });

    return next();
  } catch (error) {
    logger.warn('Authentication failed: Invalid token', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ 
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ 
        error: 'Invalid token format',
        code: 'TOKEN_INVALID'
      });
    }

    return res.status(403).json({ 
      error: 'Token verification failed',
      code: 'TOKEN_VERIFICATION_FAILED'
    });
  }
};

// 開発環境用の認証ミドルウェア（制限付き）
export const developmentAuth = (req: Request, res: Response, next: NextFunction) => {
  // 開発環境でのみ使用、本番環境では使用禁止
  if (config.nodeEnv !== 'development') {
    return authenticateToken(req, res, next);
  }

  // 開発環境でも基本的なセキュリティチェック
  const devToken = req.headers['x-dev-auth'] as string;
  
  if (!devToken || devToken !== 'dev-mode-enabled') {
    logger.warn('Development authentication failed: Invalid dev token', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    return res.status(401).json({ 
      error: 'Development authentication required',
      code: 'DEV_AUTH_REQUIRED'
    });
  }

  // 開発環境用のユーザー情報を設定
  req.user = {
    userId: 'dev-user-id',
    sessionId: 'dev-session-id'
  };

  logger.info('Development authentication successful', {
    path: req.path,
    method: req.method
  });

  return next();
};

// API Key認証ミドルウェア（強化版）
export const authenticateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    logger.warn('API key authentication failed: No API key provided', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    return res.status(401).json({ 
      error: 'API key is required',
      code: 'API_KEY_REQUIRED'
    });
  }

  // 本番環境では環境変数からAPIキーを検証
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (config.nodeEnv === 'production' && !validApiKeys.includes(apiKey)) {
    logger.warn('API key authentication failed: Invalid API key', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    return res.status(403).json({ 
      error: 'Invalid API key',
      code: 'API_KEY_INVALID'
    });
  }

  // 開発環境用のAPIキー検証
  if (config.nodeEnv === 'development' && !apiKey.startsWith('dev-api-')) {
    logger.warn('Development API key authentication failed: Invalid format', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      error: 'Invalid development API key format',
      code: 'DEV_API_KEY_INVALID'
    });
  }

  logger.info('API key authentication successful', {
    path: req.path,
    method: req.method,
    apiKeyPrefix: apiKey.substring(0, 8) + '...'
  });

  return next();
};

// JWT トークン生成関数
export const generateToken = (userId: string, sessionId: string): string => {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    userId,
    sessionId
  };

  return jwt.sign(payload, config.security.jwtSecret, {
    expiresIn: config.nodeEnv === 'production' ? '24h' : '7d', // 本番環境では短く
    issuer: 'trpg-ai-gm',
    audience: 'trpg-users'
  });
};

// セッション認証用のミドルウェア
export const authenticateSession = (req: Request, res: Response, next: NextFunction) => {
  const sessionId = req.headers['x-session-id'] as string;
  
  if (!sessionId) {
    logger.warn('Session authentication failed: No session ID provided', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    return res.status(401).json({ 
      error: 'Session ID is required',
      code: 'SESSION_ID_REQUIRED'
    });
  }

  // セッションの有効性チェック（実際の実装では DB でセッションを確認）
  if (!isValidSession(sessionId)) {
    logger.warn('Session authentication failed: Invalid session', {
      sessionId,
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    return res.status(403).json({ 
      error: 'Invalid or expired session',
      code: 'SESSION_INVALID'
    });
  }

  return next();
};

// セッション有効性チェック関数（実装例）
function isValidSession(sessionId: string): boolean {
  // 実際の実装では、データベースやRedisでセッションを確認
  // 開発環境では簡易チェック
  return sessionId.length > 10 && sessionId.includes('-');
}