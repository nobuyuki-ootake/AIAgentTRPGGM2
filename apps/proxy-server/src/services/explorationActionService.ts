// ==========================================
// 探索アクション・エンティティ発見サービス
// ==========================================

import { v4 as uuidv4 } from 'uuid';
import { database } from '../database/database';
import { logger } from '../utils/logger';
import {
  EntityExplorationAction,
  ExplorationActionExecution,
  ExplorationFlowState,
  ExplorationActionType,
  ExplorationState,
  SkillCheckType,
  ExplorationResult,
  StartExplorationActionRequest,
  StartExplorationActionResponse,
  ProvideUserInputRequest,
  ProvideUserInputResponse,
  ExecuteSkillCheckRequest,
  ExecuteSkillCheckResponse,
  GetLocationEntitiesRequest,
  GetLocationEntitiesResponse,
  GetExplorationFlowStateRequest,
  GetExplorationFlowStateResponse,
  EntityGenerationRequest,
  EntityGenerationResponse,
  DiceRoll
} from '@repo/types';
import { aiAgentMonitoringService } from './aiAgentMonitoringService';

export class ExplorationActionService {

  constructor() {
    this.initializeDatabase();
  }

  // ==========================================
  // データベース初期化
  // ==========================================

  private initializeDatabase() {
    try {
      // エンティティ探索アクションテーブル
      database.exec(`
        CREATE TABLE IF NOT EXISTS entity_exploration_actions (
          id TEXT PRIMARY KEY,
          entity_id TEXT NOT NULL,
          entity_name TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          available_actions TEXT NOT NULL,
          is_discovered BOOLEAN NOT NULL,
          is_interacted BOOLEAN NOT NULL,
          times_interacted INTEGER NOT NULL,
          last_interaction_time TEXT,
          location_id TEXT NOT NULL,
          session_id TEXT NOT NULL,
          discovered_by TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      // 探索アクション実行テーブル
      database.exec(`
        CREATE TABLE IF NOT EXISTS exploration_action_executions (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          character_id TEXT NOT NULL,
          character_name TEXT NOT NULL,
          target_entity_id TEXT NOT NULL,
          target_entity_name TEXT NOT NULL,
          action_type TEXT NOT NULL,
          action_description TEXT NOT NULL,
          user_approach TEXT,
          user_input_required BOOLEAN NOT NULL,
          skill_check TEXT,
          state TEXT NOT NULL,
          dice_roll TEXT,
          success BOOLEAN,
          result TEXT,
          ai_initial_description TEXT,
          ai_result_narration TEXT,
          initiated_at TEXT NOT NULL,
          user_input_at TEXT,
          resolved_at TEXT,
          chat_message_ids TEXT NOT NULL
        )
      `);

      // 探索フロー状態テーブル
      database.exec(`
        CREATE TABLE IF NOT EXISTS exploration_flow_states (
          session_id TEXT PRIMARY KEY,
          current_location_id TEXT NOT NULL,
          active_explorations TEXT NOT NULL,
          pending_user_inputs TEXT NOT NULL,
          recent_discoveries TEXT NOT NULL,
          settings TEXT NOT NULL,
          last_updated TEXT NOT NULL
        )
      `);

      // インデックス作成
      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_entities_session_location 
        ON entity_exploration_actions(session_id, location_id)
      `);

      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_executions_session_state 
        ON exploration_action_executions(session_id, state)
      `);

      logger.info('Exploration action database initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize exploration action database:', error);
      throw error;
    }
  }

  // ==========================================
  // エンティティ管理
  // ==========================================

  /**
   * 場所のエンティティ一覧を取得
   */
  async getLocationEntities(request: GetLocationEntitiesRequest): Promise<GetLocationEntitiesResponse> {
    try {
      let query = `
        SELECT * FROM entity_exploration_actions 
        WHERE session_id = ? AND location_id = ?
      `;
      const params: any[] = [request.sessionId, request.locationId];

      if (!request.includeHidden) {
        query += ` AND is_discovered = 1`;
      }

      query += ` ORDER BY created_at ASC`;

      const rows = database.prepare(query).all(...params) as any[];
      const entities = rows.map(row => this.rowToEntityExplorationAction(row));

      return {
        success: true,
        entities,
        totalCount: entities.length
      };

    } catch (error) {
      logger.error('Failed to get location entities:', error);
      return {
        success: false,
        entities: [],
        totalCount: 0,
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }

  /**
   * 新しいエンティティを生成
   */
  async generateNewEntity(
    sessionId: string,
    locationId: string,
    entityName: string,
    entityType: 'object' | 'npc' | 'location_feature' | 'hazard' | 'treasure',
    availableActions: Array<{
      actionType: ExplorationActionType;
      actionName: string;
      description: string;
      difficulty: 'easy' | 'normal' | 'hard' | 'expert';
      requiredSkill?: SkillCheckType;
      riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'dangerous';
    }>
  ): Promise<EntityExplorationAction> {

    const entityId = uuidv4();
    const timestamp = new Date().toISOString();

    const entity: EntityExplorationAction = {
      id: entityId,
      entityId,
      entityName,
      entityType,
      availableActions,
      isDiscovered: false, // 初期は未発見
      isInteracted: false,
      timesInteracted: 0,
      locationId,
      sessionId,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const stmt = database.prepare(`
      INSERT INTO entity_exploration_actions (
        id, entity_id, entity_name, entity_type, available_actions,
        is_discovered, is_interacted, times_interacted, last_interaction_time,
        location_id, session_id, discovered_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      entityId,
      entityId,
      entityName,
      entityType,
      JSON.stringify(availableActions),
      false,
      false,
      0,
      null,
      locationId,
      sessionId,
      null,
      timestamp,
      timestamp
    );

    logger.info(`Generated new entity: ${entityName} in ${locationId}`);
    return entity;
  }

  // ==========================================
  // 探索アクション実行
  // ==========================================

  /**
   * 探索アクション開始
   */
  async startExplorationAction(request: StartExplorationActionRequest): Promise<StartExplorationActionResponse> {
    try {
      // エンティティ情報を取得
      const entityRow = database.prepare(`
        SELECT * FROM entity_exploration_actions WHERE entity_id = ? AND session_id = ?
      `).get(request.targetEntityId, request.sessionId) as any;

      if (!entityRow) {
        return {
          success: false,
          error: '対象エンティティが見つかりません'
        };
      }

      const entity = this.rowToEntityExplorationAction(entityRow);

      // 利用可能なアクションかチェック
      const availableAction = entity.availableActions.find(action => 
        action.actionType === request.actionType
      );

      if (!availableAction) {
        return {
          success: false,
          error: 'このアクションは利用できません'
        };
      }

      // キャラクター情報を取得
      const characterRow = database.prepare(`
        SELECT name FROM characters WHERE id = ?
      `).get(request.characterId) as any;

      if (!characterRow) {
        return {
          success: false,
          error: 'キャラクター情報が見つかりません'
        };
      }

      // 探索アクション実行オブジェクト作成
      const executionId = uuidv4();
      const timestamp = new Date().toISOString();

      const execution: ExplorationActionExecution = {
        id: executionId,
        sessionId: request.sessionId,
        characterId: request.characterId,
        characterName: characterRow.name,
        targetEntityId: request.targetEntityId,
        targetEntityName: entity.entityName,
        actionType: request.actionType,
        actionDescription: request.customDescription || availableAction.description,
        userInputRequired: true, // 常にユーザー入力を求める
        state: 'processing',
        initiatedAt: timestamp,
        chatMessageIds: []
      };

      // データベースに保存
      await this.saveExplorationExecution(execution);

      // AI初期説明を生成
      const aiInitialDescription = await this.generateAIInitialDescription(
        execution,
        entity,
        availableAction
      );

      // AI初期説明をチャットに投稿
      const aiMessageId = await this.postAIMessageToChat(
        request.sessionId,
        'AI Agent',
        aiInitialDescription,
        'ai_initial',
        executionId
      );

      // 実行オブジェクトを更新
      execution.aiInitialDescription = aiInitialDescription;
      execution.chatMessageIds.push(aiMessageId);
      execution.state = 'waiting_input';
      await this.updateExplorationExecution(execution);

      // エンティティを発見済みにマーク
      await this.markEntityDiscovered(request.targetEntityId, request.characterId);

      return {
        success: true,
        execution,
        aiInitialMessage: {
          messageId: aiMessageId,
          content: aiInitialDescription,
          characterName: 'AI Agent'
        }
      };

    } catch (error) {
      logger.error('Failed to start exploration action:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }

  /**
   * ユーザー入力を提供
   */
  async provideUserInput(request: ProvideUserInputRequest): Promise<ProvideUserInputResponse> {
    try {
      // 実行オブジェクトを取得
      const execution = await this.getExplorationExecution(request.executionId);
      if (!execution) {
        return {
          success: false,
          error: '探索アクション実行が見つかりません'
        };
      }

      if (execution.characterId !== request.characterId) {
        return {
          success: false,
          error: '権限がありません'
        };
      }

      if (execution.state !== 'waiting_input') {
        return {
          success: false,
          error: 'ユーザー入力を受け付けていません'
        };
      }

      // ユーザー入力を保存
      execution.userApproach = request.userApproach;
      execution.userInputAt = new Date().toISOString();
      execution.state = 'rolling';

      await this.updateExplorationExecution(execution);

      // スキルチェックを自動実行
      const judgmentTriggered = await this.triggerAutomaticSkillCheck(execution);

      return {
        success: true,
        execution,
        judgmentTriggered
      };

    } catch (error) {
      logger.error('Failed to provide user input:', error);
      return {
        success: false,
        judgmentTriggered: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }

  /**
   * 自動スキルチェック実行
   */
  private async triggerAutomaticSkillCheck(execution: ExplorationActionExecution): Promise<boolean> {
    try {
      // エンティティ情報から適切なスキルチェックを決定
      const entityRow = database.prepare(`
        SELECT * FROM entity_exploration_actions WHERE entity_id = ?
      `).get(execution.targetEntityId) as any;

      if (!entityRow) {
        logger.error('Entity not found for skill check');
        return false;
      }

      const entity = this.rowToEntityExplorationAction(entityRow);
      const availableAction = entity.availableActions.find(action => 
        action.actionType === execution.actionType
      );

      if (!availableAction) {
        logger.error('Available action not found for skill check');
        return false;
      }

      // スキルチェック設定
      const skillType = availableAction.requiredSkill || this.inferSkillFromAction(execution.actionType);
      const targetNumber = this.calculateTargetNumber(availableAction.difficulty);

      const skillCheckRequest: ExecuteSkillCheckRequest = {
        executionId: execution.id,
        characterId: execution.characterId,
        skillType,
        targetNumber
      };

      const result = await this.executeSkillCheck(skillCheckRequest);
      return result.success;

    } catch (error) {
      logger.error('Failed to trigger automatic skill check:', error);
      return false;
    }
  }

  /**
   * スキルチェック実行
   */
  async executeSkillCheck(request: ExecuteSkillCheckRequest): Promise<ExecuteSkillCheckResponse> {
    try {
      const execution = await this.getExplorationExecution(request.executionId);
      if (!execution) {
        return {
          success: false,
          error: '探索アクション実行が見つかりません'
        };
      }

      // ダイスロール実行
      const diceRoll: DiceRoll = {
        id: uuidv4(),
        rollerId: request.characterId,
        rollerName: execution.characterName,
        diceType: 'd20',
        diceCount: 1,
        modifier: 0, // TODO: キャラクターのスキル修正値を取得
        result: Math.floor(Math.random() * 20) + 1,
        timestamp: new Date().toISOString(),
        purpose: `${request.skillType}判定`
      };

      const totalResult = diceRoll.result + diceRoll.modifier;
      const targetNumber = request.targetNumber || 15;
      const success = totalResult >= targetNumber;

      // 結果をシステムメッセージとしてチャットに投稿
      const resultMessage = `🎲 ${request.skillType}判定: ${diceRoll.result}${diceRoll.modifier > 0 ? `+${diceRoll.modifier}` : ''} = ${totalResult} (目標値: ${targetNumber}) → ${success ? '成功' : '失敗'}`;
      
      const resultMessageId = await this.postSystemMessageToChat(
        execution.sessionId,
        resultMessage,
        execution.id
      );

      // 実行オブジェクト更新
      execution.diceRoll = diceRoll;
      execution.success = success;
      execution.state = 'completed';
      execution.resolvedAt = new Date().toISOString();
      execution.chatMessageIds.push(resultMessageId);

      // 結果に基づくナレーション生成
      const aiNarration = await this.generateAIResultNarration(execution, success);
      
      const narrationMessageId = await this.postAIMessageToChat(
        execution.sessionId,
        'GM',
        aiNarration,
        'ai_narration',
        execution.id
      );

      execution.aiResultNarration = aiNarration;
      execution.chatMessageIds.push(narrationMessageId);

      await this.updateExplorationExecution(execution);

      // エンティティとの相互作用を記録
      await this.recordEntityInteraction(execution.targetEntityId, execution.characterId);

      // AI監視ログに記録
      await this.logExplorationActionToMonitoring(execution, success);

      return {
        success: true,
        execution,
        diceRoll,
        autoResultMessage: {
          messageId: resultMessageId,
          content: resultMessage,
          isSystemMessage: true
        },
        aiNarrationMessage: {
          messageId: narrationMessageId,
          content: aiNarration,
          characterName: 'GM'
        }
      };

    } catch (error) {
      logger.error('Failed to execute skill check:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }

  // ==========================================
  // AI統合機能
  // ==========================================

  /**
   * AI初期説明生成
   */
  private async generateAIInitialDescription(
    execution: ExplorationActionExecution,
    entity: EntityExplorationAction,
    availableAction: any
  ): Promise<string> {
    try {
      // シンプルなルールベース生成（将来的にはAI APIを使用可能）
      const actionDescriptions = {
        investigate: '調査すると',
        interact: '近づいて接触すると',
        attack: '攻撃を試みると',
        avoid: '回避しようとすると',
        search: '探索すると',
        observe: '観察すると',
        use_skill: 'スキルを使用すると',
        negotiate: '交渉を試みると',
        stealth: '隠密で行動すると',
        custom: 'アクションを実行すると'
      };

      const entityDescriptions = {
        object: '物体',
        npc: 'キャラクター',
        location_feature: '地形的特徴',
        hazard: '危険な要素',
        treasure: '貴重品'
      };

      const riskWarnings = {
        safe: '',
        low: '注意深く行う必要があります。',
        medium: '慎重に行動してください。',
        high: '危険が伴います。十分注意してください。',
        dangerous: '⚠️ 非常に危険です！慎重に計画を立ててください。'
      };

      const description = `${execution.characterName}が${entity.entityName}（${entityDescriptions[entity.entityType]}）に${actionDescriptions[execution.actionType]}...

${availableAction.description}

${riskWarnings[availableAction.riskLevel]}

どのようにアプローチしますか？具体的な方法を説明してください。`;

      return description;

    } catch (error) {
      logger.error('Failed to generate AI initial description:', error);
      return `${execution.characterName}が${execution.targetEntityName}に対してアクションを実行しようとしています。どのようにアプローチしますか？`;
    }
  }

  /**
   * AI結果ナレーション生成
   */
  private async generateAIResultNarration(
    execution: ExplorationActionExecution,
    success: boolean
  ): Promise<string> {
    try {
      const successTemplates = [
        `${execution.characterName}の${execution.userApproach}は見事に成功しました！`,
        `${execution.characterName}は慎重に行動し、期待通りの結果を得ました。`,
        `${execution.characterName}のアプローチは効果的で、良い成果を上げました。`
      ];

      const failureTemplates = [
        `${execution.characterName}の${execution.userApproach}は思うようにいきませんでした...`,
        `残念ながら${execution.characterName}の試みは失敗に終わりました。`,
        `${execution.characterName}の行動は期待した結果をもたらしませんでした。`
      ];

      const templates = success ? successTemplates : failureTemplates;
      const baseNarration = templates[Math.floor(Math.random() * templates.length)];

      // アクションタイプ別の詳細追加
      let additionalDetail = '';
      if (success) {
        switch (execution.actionType) {
          case 'investigate':
            additionalDetail = ' 新たな情報や手がかりを発見しました。';
            break;
          case 'interact':
            additionalDetail = ' 良好な反応を得ることができました。';
            break;
          case 'search':
            additionalDetail = ' 何か価値のあるものを見つけたかもしれません。';
            break;
          case 'observe':
            additionalDetail = ' 重要な詳細を見逃しませんでした。';
            break;
          default:
            additionalDetail = ' 目的を達成することができました。';
        }
      } else {
        additionalDetail = ' 別のアプローチを試してみるか、他の選択肢を検討してください。';
      }

      return baseNarration + additionalDetail;

    } catch (error) {
      logger.error('Failed to generate AI result narration:', error);
      return success 
        ? `${execution.characterName}の行動は成功しました。`
        : `${execution.characterName}の行動は失敗しました。`;
    }
  }

  // ==========================================
  // ユーティリティメソッド
  // ==========================================

  private inferSkillFromAction(actionType: ExplorationActionType): SkillCheckType {
    switch (actionType) {
      case 'investigate': return 'investigation';
      case 'interact': return 'persuasion';
      case 'attack': return 'athletics';
      case 'avoid': return 'acrobatics';
      case 'search': return 'perception';
      case 'observe': return 'perception';
      case 'use_skill': return 'arcana';
      case 'negotiate': return 'persuasion';
      case 'stealth': return 'stealth';
      default: return 'perception';
    }
  }

  private calculateTargetNumber(difficulty: string): number {
    switch (difficulty) {
      case 'easy': return 10;
      case 'normal': return 15;
      case 'hard': return 20;
      case 'expert': return 25;
      default: return 15;
    }
  }

  private async postAIMessageToChat(
    sessionId: string,
    characterName: string,
    content: string,
    messageType: string,
    executionId: string
  ): Promise<string> {
    // TODO: 実際のチャットシステムとの統合
    // 現在は仮実装
    const messageId = uuidv4();
    logger.info(`AI Chat Message [${messageType}]: ${characterName} - ${content}`);
    return messageId;
  }

  private async postSystemMessageToChat(
    sessionId: string,
    content: string,
    executionId: string
  ): Promise<string> {
    // TODO: 実際のチャットシステムとの統合
    const messageId = uuidv4();
    logger.info(`System Chat Message: ${content}`);
    return messageId;
  }

  private async markEntityDiscovered(entityId: string, characterId: string): Promise<void> {
    const stmt = database.prepare(`
      UPDATE entity_exploration_actions 
      SET is_discovered = 1, discovered_by = ?, updated_at = ?
      WHERE entity_id = ?
    `);
    
    stmt.run(characterId, new Date().toISOString(), entityId);
  }

  private async recordEntityInteraction(entityId: string, characterId: string): Promise<void> {
    const stmt = database.prepare(`
      UPDATE entity_exploration_actions 
      SET is_interacted = 1, times_interacted = times_interacted + 1, 
          last_interaction_time = ?, updated_at = ?
      WHERE entity_id = ?
    `);
    
    stmt.run(new Date().toISOString(), new Date().toISOString(), entityId);
  }

  private async logExplorationActionToMonitoring(
    execution: ExplorationActionExecution,
    success: boolean
  ): Promise<void> {
    try {
      await aiAgentMonitoringService.logAIAgentAction({
        sessionId: execution.sessionId,
        characterId: execution.characterId,
        characterName: execution.characterName,
        actionType: 'exploration_action',
        actionContext: `探索アクション: ${execution.actionType} → ${execution.targetEntityName}`,
        actionDescription: `${execution.actionDescription} (${execution.userApproach})`,
        decisionReasoning: execution.aiInitialDescription || '探索アクション実行',
        alternativesConsidered: ['別の手法', '回避', '慎重なアプローチ'],
        confidenceScore: success ? 85 : 45,
        executionResult: success ? 'success' : 'failure',
        resultDetails: execution.aiResultNarration || '探索結果',
        logLevel: 'info',
        processingTimeMs: execution.resolvedAt && execution.initiatedAt ? 
          new Date(execution.resolvedAt).getTime() - new Date(execution.initiatedAt).getTime() : 0,
        tags: ['exploration', execution.actionType, success ? 'success' : 'failure']
      });
    } catch (error) {
      logger.error('Failed to log exploration action to monitoring:', error);
    }
  }

  // データベース操作メソッド
  private async saveExplorationExecution(execution: ExplorationActionExecution): Promise<void> {
    const stmt = database.prepare(`
      INSERT INTO exploration_action_executions (
        id, session_id, character_id, character_name, target_entity_id,
        target_entity_name, action_type, action_description, user_approach,
        user_input_required, skill_check, state, dice_roll, success, result,
        ai_initial_description, ai_result_narration, initiated_at, user_input_at,
        resolved_at, chat_message_ids
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      execution.id,
      execution.sessionId,
      execution.characterId,
      execution.characterName,
      execution.targetEntityId,
      execution.targetEntityName,
      execution.actionType,
      execution.actionDescription,
      execution.userApproach || null,
      execution.userInputRequired,
      execution.skillCheck ? JSON.stringify(execution.skillCheck) : null,
      execution.state,
      execution.diceRoll ? JSON.stringify(execution.diceRoll) : null,
      execution.success || null,
      execution.result ? JSON.stringify(execution.result) : null,
      execution.aiInitialDescription || null,
      execution.aiResultNarration || null,
      execution.initiatedAt,
      execution.userInputAt || null,
      execution.resolvedAt || null,
      JSON.stringify(execution.chatMessageIds)
    );
  }

  private async updateExplorationExecution(execution: ExplorationActionExecution): Promise<void> {
    const stmt = database.prepare(`
      UPDATE exploration_action_executions SET
        user_approach = ?, skill_check = ?, state = ?, dice_roll = ?,
        success = ?, result = ?, ai_initial_description = ?, ai_result_narration = ?,
        user_input_at = ?, resolved_at = ?, chat_message_ids = ?
      WHERE id = ?
    `);

    stmt.run(
      execution.userApproach || null,
      execution.skillCheck ? JSON.stringify(execution.skillCheck) : null,
      execution.state,
      execution.diceRoll ? JSON.stringify(execution.diceRoll) : null,
      execution.success || null,
      execution.result ? JSON.stringify(execution.result) : null,
      execution.aiInitialDescription || null,
      execution.aiResultNarration || null,
      execution.userInputAt || null,
      execution.resolvedAt || null,
      JSON.stringify(execution.chatMessageIds),
      execution.id
    );
  }

  private async getExplorationExecution(executionId: string): Promise<ExplorationActionExecution | null> {
    const row = database.prepare(`
      SELECT * FROM exploration_action_executions WHERE id = ?
    `).get(executionId) as any;

    return row ? this.rowToExplorationExecution(row) : null;
  }

  private rowToEntityExplorationAction(row: any): EntityExplorationAction {
    return {
      id: row.id,
      entityId: row.entity_id,
      entityName: row.entity_name,
      entityType: row.entity_type,
      availableActions: JSON.parse(row.available_actions),
      isDiscovered: row.is_discovered,
      isInteracted: row.is_interacted,
      timesInteracted: row.times_interacted,
      lastInteractionTime: row.last_interaction_time,
      locationId: row.location_id,
      sessionId: row.session_id,
      discoveredBy: row.discovered_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private rowToExplorationExecution(row: any): ExplorationActionExecution {
    return {
      id: row.id,
      sessionId: row.session_id,
      characterId: row.character_id,
      characterName: row.character_name,
      targetEntityId: row.target_entity_id,
      targetEntityName: row.target_entity_name,
      actionType: row.action_type,
      actionDescription: row.action_description,
      userApproach: row.user_approach,
      userInputRequired: row.user_input_required,
      skillCheck: row.skill_check ? JSON.parse(row.skill_check) : undefined,
      state: row.state,
      diceRoll: row.dice_roll ? JSON.parse(row.dice_roll) : undefined,
      success: row.success,
      result: row.result ? JSON.parse(row.result) : undefined,
      aiInitialDescription: row.ai_initial_description,
      aiResultNarration: row.ai_result_narration,
      initiatedAt: row.initiated_at,
      userInputAt: row.user_input_at,
      resolvedAt: row.resolved_at,
      chatMessageIds: JSON.parse(row.chat_message_ids)
    };
  }
}

// シングルトンインスタンス
export const explorationActionService = new ExplorationActionService();