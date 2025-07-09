import { Router } from 'express';
import { campaignRouter } from './campaigns';
import { characterRouter } from './characters';
import { sessionRouter } from './sessions';
import { questRouter } from './quests';
import { milestoneRouter } from './milestones';
import { timeManagementRouter } from './timeManagement';
import { approachAnalysisRouter } from './approachAnalysis';
import { aiAgentRouter } from './aiAgent';
import { aiGameMasterRouter } from './aiGameMaster';
import aiCharacterGenerationRouter from './aiCharacterGeneration';
import aiMilestoneGenerationRouter from './aiMilestoneGeneration';
import locationEntityMappingRouter from './locationEntityMapping';
import playerExperienceRouter from './playerExperience';
import { interactiveEventsRouter } from './interactiveEvents';
import { entityPoolRouter } from './entityPool';
import healthRouter from './health';
import logsRouter from './logs';
import monitoringRouter from './monitoring';

export const router = Router();

// API バージョニング用のヘッダー
router.use((_req, res, next) => {
  res.set('API-Version', '1.0.0');
  next();
});

// AI統合エンドポイント
router.use('/ai-agent', aiAgentRouter);
router.use('/ai-game-master', aiGameMasterRouter);
router.use('/ai-character-generation', aiCharacterGenerationRouter);
router.use('/ai-milestone-generation', aiMilestoneGenerationRouter);

// シナリオ管理エンドポイント
router.use('/location-entity-mapping', locationEntityMappingRouter);
router.use('/player-experience', playerExperienceRouter);
router.use('/entity-pool', entityPoolRouter);

// TRPG機能エンドポイント
router.use('/campaigns', campaignRouter);
router.use('/characters', characterRouter);
router.use('/sessions', sessionRouter);
router.use('/quests', questRouter);
router.use('/milestones', milestoneRouter);
router.use('/time-management', timeManagementRouter);
router.use('/approach-analysis', approachAnalysisRouter);
router.use('/interactive-events', interactiveEventsRouter);

// ヘルスチェック・システム状態エンドポイント
router.use('/health', healthRouter);
router.use('/logs', logsRouter);
router.use('/monitoring', monitoringRouter);

// API情報エンドポイント
router.get('/', (_req, res) => {
  res.json({
    name: 'AI Agent TRPG GM API',
    version: '1.0.0',
    description: 'API for AI-powered TRPG campaign management and game master assistance',
    endpoints: {
      health: '/health',
      aiAgent: '/api/ai-agent',
      aiGameMaster: '/api/ai-game-master',
      aiCharacterGeneration: '/api/ai-character-generation',
      aiMilestoneGeneration: '/api/ai-milestone-generation',
      locationEntityMapping: '/api/location-entity-mapping',
      playerExperience: '/api/player-experience',
      entityPool: '/api/entity-pool',
      campaigns: '/api/campaigns',
      characters: '/api/characters', 
      sessions: '/api/sessions',
      quests: '/api/quests',
      milestones: '/api/milestones',
      timeManagement: '/api/time-management',
      approachAnalysis: '/api/approach-analysis',
      interactiveEvents: '/api/interactive-events',
      logs: '/api/logs',
      monitoring: '/api/monitoring',
    },
    timestamp: new Date().toISOString(),
  });
});