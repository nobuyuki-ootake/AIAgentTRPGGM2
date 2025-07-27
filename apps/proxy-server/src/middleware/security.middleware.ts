import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import { config } from '../config/config';
import { logger } from '../utils/logger';

// 包括的なセキュリティミドルウェア
export const securityMiddleware = [
  // Helmet - セキュリティヘッダーの設定
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.openai.com", "https://api.anthropic.com", "https://generativelanguage.googleapis.com"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }),

  // レート制限の設定
  rateLimit({
    windowMs: config.security.rateLimitWindow * 60 * 1000, // 分を秒に変換
    max: config.security.rateLimitMax,
    message: {
      error: 'Too many requests from this IP',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: config.security.rateLimitWindow * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        userId: req.user?.userId
      });

      res.status(429).json({
        error: 'Too many requests from this IP',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: config.security.rateLimitWindow * 60
      });
    },
    keyGenerator: (req: Request) => {
      // ユーザーIDがある場合はそれを使用、なければIPアドレス
      return req.user?.userId || req.ip;
    }
  }),

  // 圧縮の設定
  compression({
    level: 6,
    threshold: 1024,
    filter: (req: Request, res: Response) => {
      // 圧縮を適用しないコンテンツタイプ
      const nonCompressibleTypes = [
        'image/',
        'video/',
        'audio/',
        'application/pdf',
        'application/zip'
      ];

      const contentType = res.getHeader('Content-Type') as string;
      if (contentType && nonCompressibleTypes.some(type => contentType.includes(type))) {
        return false;
      }

      return compression.filter(req, res);
    }
  })
];

// AI API 専用のレート制限
export const aiApiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1分
  max: 20, // 1分あたり20リクエスト
  message: {
    error: 'Too many AI API requests',
    code: 'AI_API_RATE_LIMIT_EXCEEDED',
    retryAfter: 60
  },
  keyGenerator: (req: Request) => {
    return req.user?.userId || req.ip;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('AI API rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      userId: req.user?.userId
    });

    res.status(429).json({
      error: 'Too many AI API requests. Please wait before making another request.',
      code: 'AI_API_RATE_LIMIT_EXCEEDED',
      retryAfter: 60
    });
  }
});

// ファイルアップロード専用のレート制限
export const fileUploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 10, // 15分あたり10ファイル
  message: {
    error: 'Too many file uploads',
    code: 'FILE_UPLOAD_RATE_LIMIT_EXCEEDED',
    retryAfter: 15 * 60
  },
  keyGenerator: (req: Request) => {
    return req.user?.userId || req.ip;
  }
});

// セキュリティログを強化するミドルウェア
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const securityContext = {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    path: req.path,
    method: req.method,
    userId: req.user?.userId,
    sessionId: req.user?.sessionId,
    timestamp: new Date().toISOString(),
    origin: req.get('Origin'),
    referer: req.get('Referer')
  };

  // 疑わしい活動の検出
  const suspiciousPatterns = [
    /\/admin/i,
    /\/config/i,
    /\/\.env/i,
    /\/\.git/i,
    /\/backup/i,
    /\/wp-admin/i,
    /\/phpmyadmin/i,
    /\/console/i,
    /\/shell/i,
    /\/cmd/i
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(req.path))) {
    logger.warn('Suspicious path access attempt', {
      ...securityContext,
      severity: 'HIGH',
      alertType: 'SUSPICIOUS_PATH_ACCESS'
    });
  }

  // 異常なUser-Agentの検出
  const userAgent = req.get('User-Agent') || '';
  const suspiciousUserAgents = [
    /curl/i,
    /wget/i,
    /python/i,
    /bot/i,
    /crawler/i,
    /spider/i,
    /scanner/i,
    /exploit/i
  ];

  if (suspiciousUserAgents.some(pattern => pattern.test(userAgent))) {
    logger.warn('Suspicious User-Agent detected', {
      ...securityContext,
      severity: 'MEDIUM',
      alertType: 'SUSPICIOUS_USER_AGENT'
    });
  }

  // 異常なリクエストサイズの検出
  const contentLength = parseInt(req.get('Content-Length') || '0', 10);
  if (contentLength > 50 * 1024 * 1024) { // 50MB
    logger.warn('Abnormally large request detected', {
      ...securityContext,
      contentLength,
      severity: 'HIGH',
      alertType: 'LARGE_REQUEST'
    });
  }

  next();
};

// APIキー漏洩検出ミドルウェア
export const apiKeyLeakageDetection = (req: Request, res: Response, next: NextFunction) => {
  const responseEnd = res.end;
  
  res.end = function(chunk?: any, encoding?: any) {
    if (chunk && typeof chunk === 'string') {
      // APIキーパターンの検出
      const apiKeyPatterns = [
        /AIza[0-9A-Za-z-_]{35}/, // Google API Key
        /sk-[0-9A-Za-z]{48}/, // OpenAI API Key
        /sk-ant-[0-9A-Za-z-_]{95}/, // Anthropic API Key
        /ya29\.[0-9A-Za-z-_]+/, // Google OAuth Token
        /xoxb-[0-9A-Za-z-]+/, // Slack Bot Token
        /ghp_[0-9A-Za-z]{36}/, // GitHub Personal Access Token
        /gho_[0-9A-Za-z]{36}/, // GitHub OAuth Token
        /ghu_[0-9A-Za-z]{36}/, // GitHub User Token
        /ghs_[0-9A-Za-z]{36}/, // GitHub Server Token
        /ghr_[0-9A-Za-z]{36}/, // GitHub Refresh Token
      ];

      const foundPatterns = apiKeyPatterns.filter(pattern => pattern.test(chunk));
      
      if (foundPatterns.length > 0) {
        logger.error('API KEY LEAKAGE DETECTED IN RESPONSE', {
          path: req.path,
          method: req.method,
          userId: req.user?.userId,
          ip: req.ip,
          patterns: foundPatterns.map(p => p.toString()),
          severity: 'CRITICAL',
          alertType: 'API_KEY_LEAKAGE'
        });

        // 本番環境では即座にレスポンスを停止
        if (config.nodeEnv === 'production') {
          return responseEnd.call(this, JSON.stringify({
            error: 'Response blocked due to security policy',
            code: 'SECURITY_POLICY_VIOLATION'
          }), encoding);
        }
      }
    }

    return responseEnd.call(this, chunk, encoding);
  };

  next();
};

// セキュリティヘッダーの検証
export const securityHeadersValidation = (req: Request, res: Response, next: NextFunction) => {
  const requiredHeaders = ['user-agent', 'accept'];
  const missingHeaders = requiredHeaders.filter(header => !req.get(header));

  if (missingHeaders.length > 0) {
    logger.warn('Missing required security headers', {
      path: req.path,
      method: req.method,
      missingHeaders,
      ip: req.ip,
      severity: 'MEDIUM',
      alertType: 'MISSING_SECURITY_HEADERS'
    });
  }

  // セキュリティヘッダーの追加
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
};

// 不正なペイロードの検出
export const maliciousPayloadDetection = (req: Request, res: Response, next: NextFunction) => {
  const payload = JSON.stringify(req.body);
  
  const maliciousPatterns = [
    /eval\s*\(/i,
    /function\s*\(/i,
    /javascript:/i,
    /data:text\/html/i,
    /vbscript:/i,
    /onload\s*=/i,
    /onclick\s*=/i,
    /onerror\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<script/i,
    /document\.cookie/i,
    /window\.location/i,
    /alert\s*\(/i,
    /confirm\s*\(/i,
    /prompt\s*\(/i
  ];

  const foundPatterns = maliciousPatterns.filter(pattern => pattern.test(payload));
  
  if (foundPatterns.length > 0) {
    logger.warn('Malicious payload detected', {
      path: req.path,
      method: req.method,
      userId: req.user?.userId,
      ip: req.ip,
      patterns: foundPatterns.map(p => p.toString()),
      severity: 'HIGH',
      alertType: 'MALICIOUS_PAYLOAD'
    });

    return res.status(400).json({
      error: 'Malicious payload detected',
      code: 'MALICIOUS_PAYLOAD_DETECTED'
    });
  }

  next();
};

// セキュリティミドルウェアの統合設定
export const setupSecurityMiddleware = (app: any) => {
  // セキュリティログの設定
  app.use(securityLogger);
  
  // セキュリティヘッダーの設定
  app.use(securityHeadersValidation);
  
  // 基本的なセキュリティミドルウェア
  securityMiddleware.forEach(middleware => {
    app.use(middleware);
  });
  
  // APIキー漏洩検出
  app.use(apiKeyLeakageDetection);
  
  // 不正なペイロードの検出
  app.use(maliciousPayloadDetection);
};

export default {
  securityMiddleware,
  aiApiRateLimit,
  fileUploadRateLimit,
  securityLogger,
  setupSecurityMiddleware
};