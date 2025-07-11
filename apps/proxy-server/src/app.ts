import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { router } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { logger } from './utils/logger';

export function createApp(): express.Application {
  const app = express();

  // Trust proxy (for rate limiting behind reverse proxy)
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.openai.com", "https://api.anthropic.com", "https://generativelanguage.googleapis.com"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // CORS configuration
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://ai-agent-trpg-gm.vercel.app'] // 本番環境のフロントエンドURL
      : ['http://localhost:5173', 'http://localhost:3000'], // 開発環境
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }));

  // Rate limiting (開発環境では緩い制限)
  const limiter = rateLimit({
    windowMs: process.env.NODE_ENV === 'development' ? 1 * 60 * 1000 : 15 * 60 * 1000, // 開発環境では1分、本番では15分
    max: process.env.NODE_ENV === 'development' ? 1000 : 100, // 開発環境では1000、本番では100
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: process.env.NODE_ENV === 'development' ? '1 minute' : '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // AI専用のより厳しいレート制限 (開発環境では緩い制限)
  const aiLimiter = rateLimit({
    windowMs: process.env.NODE_ENV === 'development' ? 1 * 60 * 1000 : 5 * 60 * 1000, // 開発環境では1分、本番では5分
    max: process.env.NODE_ENV === 'development' ? 200 : 20, // 開発環境では200、本番では20
    message: {
      error: 'Too many AI requests from this IP, please try again later.',
      retryAfter: process.env.NODE_ENV === 'development' ? '1 minute' : '5 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(limiter);
  app.use('/api/ai-agent', aiLimiter);

  // Logging
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      }
    }
  }));

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // API routes
  app.use('/api', router);

  // Error handling middleware (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}