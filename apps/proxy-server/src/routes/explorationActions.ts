// ==========================================
// 探索アクション・エンティティ発見API
// ==========================================

import express from 'express';
import { explorationActionService } from '../services/explorationActionService';
import { logger } from '../utils/logger';
import {
  StartExplorationActionRequest,
  ProvideUserInputRequest,
  ExecuteSkillCheckRequest,
  GetLocationEntitiesRequest,
  GetExplorationFlowStateRequest,
  EntityGenerationRequest,
  ExplorationActionType,
  SkillCheckType
} from '@repo/types';

const router = express.Router();

// ==========================================
// 場所のエンティティ一覧取得
// ==========================================

router.get('/entities/:sessionId/:locationId', async (req, res) => {
  try {
    const { sessionId, locationId } = req.params;
    
    const request: GetLocationEntitiesRequest = {
      sessionId,
      locationId,
      includeDiscovered: req.query.includeDiscovered === 'true',
      includeHidden: req.query.includeHidden === 'true'
    };

    const response = await explorationActionService.getLocationEntities(request);
    res.json(response);

  } catch (error) {
    logger.error('Failed to get location entities:', error);
    res.status(500).json({
      success: false,
      entities: [],
      totalCount: 0,
      error: 'エンティティの取得に失敗しました'
    });
  }
});

// ==========================================
// 探索アクション開始
// ==========================================

router.post('/start', async (req, res) => {
  try {
    const request: StartExplorationActionRequest = {
      sessionId: req.body.sessionId,
      characterId: req.body.characterId,
      targetEntityId: req.body.targetEntityId,
      actionType: req.body.actionType as ExplorationActionType,
      customDescription: req.body.customDescription
    };

    // 必須フィールドの検証
    if (!request.sessionId || !request.characterId || !request.targetEntityId || !request.actionType) {
      return res.status(400).json({
        success: false,
        error: '必要なパラメータが不足しています'
      });
    }

    const response = await explorationActionService.startExplorationAction(request);
    res.json(response);

  } catch (error) {
    logger.error('Failed to start exploration action:', error);
    res.status(500).json({
      success: false,
      error: '探索アクションの開始に失敗しました'
    });
  }
});

// ==========================================
// ユーザー入力提供
// ==========================================

router.post('/user-input', async (req, res) => {
  try {
    const request: ProvideUserInputRequest = {
      executionId: req.body.executionId,
      characterId: req.body.characterId,
      userApproach: req.body.userApproach
    };

    // 必須フィールドの検証
    if (!request.executionId || !request.characterId || !request.userApproach) {
      return res.status(400).json({
        success: false,
        judgmentTriggered: false,
        error: '必要なパラメータが不足しています'
      });
    }

    const response = await explorationActionService.provideUserInput(request);
    res.json(response);

  } catch (error) {
    logger.error('Failed to provide user input:', error);
    res.status(500).json({
      success: false,
      judgmentTriggered: false,
      error: 'ユーザー入力の処理に失敗しました'
    });
  }
});

// ==========================================
// スキルチェック実行（手動）
// ==========================================

router.post('/skill-check', async (req, res) => {
  try {
    const request: ExecuteSkillCheckRequest = {
      executionId: req.body.executionId,
      characterId: req.body.characterId,
      skillType: req.body.skillType as SkillCheckType,
      targetNumber: req.body.targetNumber,
      modifiers: req.body.modifiers
    };

    // 必須フィールドの検証
    if (!request.executionId || !request.characterId || !request.skillType) {
      return res.status(400).json({
        success: false,
        error: '必要なパラメータが不足しています'
      });
    }

    const response = await explorationActionService.executeSkillCheck(request);
    res.json(response);

  } catch (error) {
    logger.error('Failed to execute skill check:', error);
    res.status(500).json({
      success: false,
      error: 'スキルチェックの実行に失敗しました'
    });
  }
});

// ==========================================
// 新しいエンティティ生成（開発・テスト用）
// ==========================================

router.post('/generate-entity', async (req, res) => {
  try {
    const { sessionId, locationId, entityName, entityType } = req.body;

    if (!sessionId || !locationId || !entityName || !entityType) {
      return res.status(400).json({
        success: false,
        error: '必要なパラメータが不足しています'
      });
    }

    // デフォルトのアクション設定
    const defaultActions = [
      {
        actionType: 'investigate' as ExplorationActionType,
        actionName: '調査する',
        description: '詳しく調べてみます',
        difficulty: 'normal' as const,
        requiredSkill: 'investigation' as SkillCheckType,
        riskLevel: 'low' as const
      },
      {
        actionType: 'observe' as ExplorationActionType,
        actionName: '観察する',
        description: '遠くから注意深く観察します',
        difficulty: 'easy' as const,
        requiredSkill: 'perception' as SkillCheckType,
        riskLevel: 'safe' as const
      }
    ];

    // エンティティタイプ別の追加アクション
    if (entityType === 'npc') {
      defaultActions.push({
        actionType: 'interact' as ExplorationActionType,
        actionName: '話しかける',
        description: '友好的に話しかけてみます',
        difficulty: 'normal' as const,
        requiredSkill: 'persuasion' as SkillCheckType,
        riskLevel: 'low' as const
      });
    }

    if (entityType === 'treasure') {
      defaultActions.push({
        actionType: 'search' as ExplorationActionType,
        actionName: '探索する',
        description: '慎重に探索してみます',
        difficulty: 'normal' as const,
        requiredSkill: 'investigation' as SkillCheckType,
        riskLevel: 'medium' as const
      });
    }

    const entity = await explorationActionService.generateNewEntity(
      sessionId,
      locationId,
      entityName,
      entityType,
      defaultActions
    );

    res.json({
      success: true,
      entity
    });

  } catch (error) {
    logger.error('Failed to generate entity:', error);
    res.status(500).json({
      success: false,
      error: 'エンティティの生成に失敗しました'
    });
  }
});

// ==========================================
// 探索フロー状態取得
// ==========================================

router.get('/flow-state/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    
    // TODO: ExplorationFlowStateの取得実装
    // 現在は基本的な状態を返す
    const basicState = {
      sessionId,
      currentLocationId: req.query.locationId || 'default',
      activeExplorations: [],
      pendingUserInputs: [],
      recentDiscoveries: [],
      settings: {
        autoProgressTimeout: 300,
        allowSimultaneousActions: true,
        requireUserInput: true,
        aiNarrationEnabled: true
      },
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      flowState: basicState
    });

  } catch (error) {
    logger.error('Failed to get exploration flow state:', error);
    res.status(500).json({
      success: false,
      error: '探索フロー状態の取得に失敗しました'
    });
  }
});

// ==========================================
// アクティブな探索アクション一覧
// ==========================================

router.get('/active/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    
    // TODO: アクティブな探索アクション取得の実装
    // 現在は空の配列を返す
    res.json({
      success: true,
      activeExplorations: [],
      pendingInputs: [],
      totalCount: 0
    });

  } catch (error) {
    logger.error('Failed to get active explorations:', error);
    res.status(500).json({
      success: false,
      activeExplorations: [],
      pendingInputs: [],
      totalCount: 0,
      error: 'アクティブな探索の取得に失敗しました'
    });
  }
});

// ==========================================
// 探索履歴取得
// ==========================================

router.get('/history/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const characterId = req.query.characterId as string;
    const limit = parseInt(req.query.limit as string) || 20;
    
    // TODO: 探索履歴取得の実装
    res.json({
      success: true,
      history: [],
      totalCount: 0,
      hasMore: false
    });

  } catch (error) {
    logger.error('Failed to get exploration history:', error);
    res.status(500).json({
      success: false,
      history: [],
      totalCount: 0,
      hasMore: false,
      error: '探索履歴の取得に失敗しました'
    });
  }
});

// ==========================================
// エンティティ詳細取得
// ==========================================

router.get('/entity/:entityId', async (req, res) => {
  try {
    const entityId = req.params.entityId;
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'セッションIDが必要です'
      });
    }

    // TODO: 個別エンティティ取得の実装
    res.json({
      success: true,
      entity: null,
      interactions: [],
      availableActions: []
    });

  } catch (error) {
    logger.error('Failed to get entity details:', error);
    res.status(500).json({
      success: false,
      error: 'エンティティ詳細の取得に失敗しました'
    });
  }
});

// ==========================================
// ヘルスチェック
// ==========================================

router.get('/health', async (req, res) => {
  try {
    res.json({
      success: true,
      service: 'exploration-actions',
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Exploration actions health check failed:', error);
    res.status(500).json({
      success: false,
      service: 'exploration-actions',
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : '不明なエラー'
    });
  }
});

export default router;