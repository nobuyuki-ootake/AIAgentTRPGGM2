import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { logger } from '../utils/logger';

// 入力検証用のミドルウェア
export const validateRequest = (schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // リクエストボディの検証
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      // クエリパラメータの検証
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }

      // パスパラメータの検証
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }

      // ヘッダーの検証
      if (schema.headers) {
        req.headers = schema.headers.parse(req.headers);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Request validation failed', {
          path: req.path,
          method: req.method,
          errors: error.errors,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.status(400).json({
          error: 'Invalid request data',
          code: 'VALIDATION_ERROR',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }

      logger.error('Unexpected validation error', {
        path: req.path,
        method: req.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: req.ip
      });

      return res.status(500).json({
        error: 'Internal server error during validation',
        code: 'INTERNAL_VALIDATION_ERROR'
      });
    }
  };
};

// セキュリティ検証用のミドルウェア
export const securityValidation = (req: Request, res: Response, next: NextFunction) => {
  const errors: string[] = [];

  // XSS攻撃の基本的な検出
  const xssPattern = /<script[^>]*>.*?<\/script>/gi;
  const checkXSS = (value: string) => xssPattern.test(value);

  // SQL インジェクション攻撃の基本的な検出
  const sqlInjectionPattern = /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b|\bEXEC\b|\bUNION\b)/gi;
  const checkSQLInjection = (value: string) => sqlInjectionPattern.test(value);

  // リクエストボディのセキュリティチェック
  if (req.body && typeof req.body === 'object') {
    const checkObject = (obj: any, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          
          if (checkXSS(value)) {
            errors.push(`XSS detected in ${fullKey}`);
          }
          
          if (checkSQLInjection(value)) {
            errors.push(`SQL injection detected in ${fullKey}`);
          }
          
          // 異常に長い文字列の検出
          if (value.length > 10000) {
            errors.push(`Excessively long input in ${fullKey}`);
          }
        } else if (typeof value === 'object' && value !== null) {
          checkObject(value, prefix ? `${prefix}.${key}` : key);
        }
      }
    };

    checkObject(req.body);
  }

  // クエリパラメータのセキュリティチェック
  if (req.query && typeof req.query === 'object') {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        if (checkXSS(value)) {
          errors.push(`XSS detected in query parameter: ${key}`);
        }
        
        if (checkSQLInjection(value)) {
          errors.push(`SQL injection detected in query parameter: ${key}`);
        }
      }
    }
  }

  // セキュリティ違反が検出された場合
  if (errors.length > 0) {
    logger.warn('Security validation failed', {
      path: req.path,
      method: req.method,
      errors,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.userId
    });

    return res.status(400).json({
      error: 'Security validation failed',
      code: 'SECURITY_VIOLATION',
      message: 'Request contains potentially malicious content'
    });
  }

  next();
};

// レート制限情報の検証
export const rateLimitInfo = (req: Request, res: Response, next: NextFunction) => {
  const identifier = req.ip + (req.user?.userId || 'anonymous');
  
  // レート制限ヘッダーの追加
  res.setHeader('X-RateLimit-Identifier', identifier);
  res.setHeader('X-RateLimit-Reset', Date.now() + 15 * 60 * 1000); // 15分後

  next();
};

// ファイルアップロード検証
export const fileUploadValidation = (req: Request, res: Response, next: NextFunction) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'application/json'
  ];

  const maxFileSize = 10 * 1024 * 1024; // 10MB

  if (req.files) {
    const files = Array.isArray(req.files) ? req.files : [req.files];
    
    for (const file of files) {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        logger.warn('File upload validation failed: Invalid MIME type', {
          path: req.path,
          method: req.method,
          mimetype: file.mimetype,
          filename: file.originalname,
          ip: req.ip,
          userId: req.user?.userId
        });

        return res.status(400).json({
          error: 'Invalid file type',
          code: 'INVALID_FILE_TYPE',
          allowedTypes: allowedMimeTypes
        });
      }

      if (file.size > maxFileSize) {
        logger.warn('File upload validation failed: File too large', {
          path: req.path,
          method: req.method,
          size: file.size,
          maxSize: maxFileSize,
          filename: file.originalname,
          ip: req.ip,
          userId: req.user?.userId
        });

        return res.status(400).json({
          error: 'File too large',
          code: 'FILE_TOO_LARGE',
          maxSize: maxFileSize
        });
      }
    }
  }

  next();
};

// CORS セキュリティ検証
export const corsSecurityValidation = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('Origin');
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://localhost:3000',
    'https://localhost:5173'
  ];

  // 本番環境では環境変数から許可されたオリジンを取得
  if (process.env.NODE_ENV === 'production') {
    const prodOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    allowedOrigins.push(...prodOrigins);
  }

  if (origin && !allowedOrigins.includes(origin)) {
    logger.warn('CORS validation failed: Origin not allowed', {
      path: req.path,
      method: req.method,
      origin,
      allowedOrigins,
      ip: req.ip
    });

    return res.status(403).json({
      error: 'Origin not allowed',
      code: 'CORS_ORIGIN_NOT_ALLOWED'
    });
  }

  next();
};

// APIレスポンス時間の監視
export const responseTimeMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // レスポンス時間のログ
    logger.info('Request completed', {
      path: req.path,
      method: req.method,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.userId
    });

    // 異常に遅いレスポンスの警告
    if (duration > 5000) {
      logger.warn('Slow response detected', {
        path: req.path,
        method: req.method,
        duration: `${duration}ms`,
        ip: req.ip,
        userId: req.user?.userId
      });
    }
  });

  next();
};