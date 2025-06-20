import { Request, Response, NextFunction } from 'express';
import { APIResponse } from '@ai-agent-trpg/types';
import { logger } from '../utils/logger';

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
  
  // エラーをログに記録（本番環境でのデバッグ用）
  logger.error(`${req.method} ${req.path} - ${statusCode} ${code}`, {
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    details: error.details,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

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