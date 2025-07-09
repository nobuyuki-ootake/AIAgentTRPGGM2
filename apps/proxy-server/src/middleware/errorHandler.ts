import { Request, Response, NextFunction } from 'express';
import { APIResponse } from '@ai-agent-trpg/types';
import { logger } from '../utils/logger';
import { errorMonitoringService } from '../services/errorMonitoringService';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: Record<string, any>;
  userMessage?: string;
}

export class ValidationError extends Error implements AppError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  userMessage: string;
  
  constructor(message: string, public details?: Record<string, any>) {
    super(message);
    this.name = 'ValidationError';
    this.userMessage = message;
  }
}

export class AIServiceError extends Error implements AppError {
  statusCode = 502;
  code = 'AI_SERVICE_ERROR';
  userMessage: string;
  
  constructor(
    message: string, 
    public provider: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AIServiceError';
    this.userMessage = `AI service error: ${message}. Please check your API key and try again.`;
  }
}

export class DatabaseError extends Error implements AppError {
  statusCode = 500;
  code = 'DATABASE_ERROR';
  userMessage: string;
  
  constructor(message: string, public details?: Record<string, any>) {
    super(message);
    this.name = 'DatabaseError';
    this.userMessage = 'Database error occurred. Please try again later.';
  }
}

export class NotFoundError extends Error implements AppError {
  statusCode = 404;
  code = 'NOT_FOUND';
  userMessage: string;
  
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    super(message);
    this.name = 'NotFoundError';
    this.userMessage = message;
  }
}

export class UnauthorizedError extends Error implements AppError {
  statusCode = 401;
  code = 'UNAUTHORIZED';
  userMessage: string;
  
  constructor(message: string = 'Unauthorized access') {
    super(message);
    this.name = 'UnauthorizedError';
    this.userMessage = message;
  }
}

export class RateLimitError extends Error implements AppError {
  statusCode = 429;
  code = 'RATE_LIMIT_EXCEEDED';
  userMessage: string;
  
  constructor(public retryAfter: number) {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
    this.userMessage = `Rate limit exceeded. Please try again in ${retryAfter} seconds.`;
  }
}

export function errorHandler(
  error: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_SERVER_ERROR';
  
  // エラーを監視システムに記録
  const component = determineComponent(req.path);
  const context = {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?.id,
    sessionId: (req as any).sessionId,
    campaignId: (req as any).campaignId,
    statusCode
  };
  
  errorMonitoringService.logError(error, component, context);

  // API キーを含むエラーメッセージを絶対に返さない
  const sanitizedMessage = sanitizeErrorMessage(error.message);
  const userMessage = error.userMessage || sanitizedMessage;

  const response: APIResponse<null> = {
    success: false,
    error: userMessage,
    timestamp: new Date().toISOString(),
  };

  // 開発環境でのみ詳細なエラー情報を含める
  if (process.env.NODE_ENV === 'development') {
    (response as any).debug = {
      originalMessage: error.message,
      stack: error.stack,
      details: error.details,
    };
  }

  // レート制限の場合は Retry-After ヘッダーを設定
  if (error instanceof RateLimitError) {
    res.set('Retry-After', error.retryAfter.toString());
  }

  res.status(statusCode).json(response);
}

/**
 * リクエストパスからコンポーネントを判定
 */
function determineComponent(path: string): string {
  if (path.startsWith('/api/ai-agent')) return 'ai-agent';
  if (path.startsWith('/api/ai-game-master')) return 'ai-game-master';
  if (path.startsWith('/api/ai-character')) return 'ai-character';
  if (path.startsWith('/api/ai-milestone')) return 'ai-milestone';
  if (path.startsWith('/api/campaigns')) return 'campaigns';
  if (path.startsWith('/api/characters')) return 'characters';
  if (path.startsWith('/api/sessions')) return 'sessions';
  if (path.startsWith('/api/quests')) return 'quests';
  if (path.startsWith('/api/milestones')) return 'milestones';
  if (path.startsWith('/api/locations')) return 'locations';
  if (path.startsWith('/api/entity-pool')) return 'entity-pool';
  if (path.startsWith('/api/monitoring')) return 'monitoring';
  if (path.startsWith('/api/logs')) return 'logs';
  if (path.startsWith('/api/health')) return 'health';
  return 'unknown';
}

/**
 * エラーメッセージからAPIキーや機密情報を除去
 */
function sanitizeErrorMessage(message: string): string {
  // API キーパターンを除去
  const patterns = [
    /sk-[a-zA-Z0-9]+/g, // OpenAI API key
    /Bearer\s+[a-zA-Z0-9\-_]+/g, // Bearer token
    /token[:\s=]+[a-zA-Z0-9\-_]+/gi, // Various token formats
    /key[:\s=]+[a-zA-Z0-9\-_]+/gi, // Various key formats
    /secret[:\s=]+[a-zA-Z0-9\-_]+/gi, // Secret keys
  ];

  let sanitized = message;
  patterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });

  return sanitized;
}

/**
 * 非同期エラーハンドラー用のラッパー
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}