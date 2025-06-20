import { Request, Response, NextFunction } from 'express';

// 開発環境用のシンプルな認証ミドルウェア
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  // 開発環境では認証をスキップ
  if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token is required' });
  }

  // 実際のプロダクション環境では、ここでJWTの検証を行う
  if (token === 'test-token' || token === 'dev-token') {
    return next();
  }

  return res.status(403).json({ error: 'Invalid or expired token' });
};

// API Key認証ミドルウェア
export const authenticateApiKey = (req: Request, res: Response, next: NextFunction) => {
  // 開発環境では認証をスキップ
  if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    return next();
  }

  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key is required' });
  }

  // 実際のプロダクション環境では、ここでAPI Keyの検証を行う
  if (apiKey === 'test-api-key' || apiKey === 'dev-api-key') {
    return next();
  }

  return res.status(403).json({ error: 'Invalid API key' });
};