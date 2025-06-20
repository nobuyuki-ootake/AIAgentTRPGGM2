import { Router } from 'express';
import { aiAgentRouter } from './aiAgent';
import { aiCharacterRouter } from './aiCharacters';
import { campaignRouter } from './campaigns';
import { characterRouter } from './characters';
import { sessionRouter } from './sessions';
import { eventRouter } from './events';
import { locationRouter } from './locations';
import conversationRouter from './conversations';

export const router = Router();

// API バージョニング用のヘッダー
router.use((_req, res, next) => {
  res.set('API-Version', '1.0.0');
  next();
});

// AI統合エンドポイント
router.use('/ai-agent', aiAgentRouter);
router.use('/ai-characters', aiCharacterRouter);

// TRPG機能エンドポイント
router.use('/campaigns', campaignRouter);
router.use('/characters', characterRouter);
router.use('/sessions', sessionRouter);
router.use('/events', eventRouter);
router.use('/locations', locationRouter);
router.use('/conversations', conversationRouter);

// API情報エンドポイント
router.get('/', (_req, res) => {
  res.json({
    name: 'AI Agent TRPG GM API',
    version: '1.0.0',
    description: 'API for AI-powered TRPG campaign management and game master assistance',
    endpoints: {
      health: '/health',
      ai: '/api/ai-agent',
      aiCharacters: '/api/ai-characters',
      campaigns: '/api/campaigns',
      characters: '/api/characters', 
      sessions: '/api/sessions',
      events: '/api/events',
      locations: '/api/locations',
      conversations: '/api/conversations',
    },
    timestamp: new Date().toISOString(),
  });
});