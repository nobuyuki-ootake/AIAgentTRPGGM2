import { Database } from 'better-sqlite3';
import { 
  AIMilestone,
  SessionDurationConfig
} from '@ai-agent-trpg/types';
import { getDatabase } from '../database/database';
import { logger } from '../utils/logger';
// import { getAIService } from './aiService'; // TODO: AI誘導機能実装時に再有効化

/**
 * マスクされた進捗情報（プレイヤー向け）
 */
export interface MaskedProgressInfo {
  availableActions: string[];
  ambiguousHints: string[];
  atmosphereDescription: string;
  discoveredElements: string[];
  explorationProgress: 'beginning' | 'exploring' | 'discovering' | 'concluding';
}

/**
 * セッションコンテキスト
 */
export interface SessionContext {
  sessionId: string;
  campaignId: string;
  themeId: string;
  currentLocationId: string;
  playerActions: string[];
  discoveredEntities: string[];
  sessionDuration: SessionDurationConfig;
}

/**
 * ガイダンス生成リクエスト
 */
export interface GuidanceRequest {
  sessionContext: SessionContext;
  currentSituation: string;
  playerQuery?: string;
  guidanceType: 'subtle_hint' | 'atmosphere' | 'natural_guidance' | 'reward_message';
}

/**
 * プレイヤー体験演出サービス
 * 
 * 目的：
 * - マイルストーン進捗をプレイヤーから隠蔽
 * - 暗示的なヒントで自然な誘導を提供
 * - 手探り感を維持しながら満足度の高い体験を演出
 * - 報酬発見時の自然な驚きと達成感を提供
 */
export class PlayerExperienceService {
  private db: Database;

  constructor() {
    this.db = getDatabase();
  }

  // ==========================================
  // 主要API（プレイヤー体験演出）
  // ==========================================

  /**
   * マスクされた進捗情報取得
   */
  async getMaskedProgressInfo(sessionId: string): Promise<MaskedProgressInfo> {
    logger.debug('🎭 マスクされた進捗情報取得開始', { sessionId });

    try {
      // 内部進捗情報を取得
      const internalProgress = await this.getInternalProgress(sessionId);
      
      // セッションコンテキストを取得
      const sessionContext = await this.getSessionContext(sessionId);
      
      // 利用可能アクション生成
      const availableActions = await this.generateAvailableActions(sessionContext, internalProgress);
      
      // 暗示的ヒント生成
      const ambiguousHints = await this.generateAmbiguousHints(sessionContext, internalProgress);
      
      // 雰囲気描写生成
      const atmosphereDescription = await this.generateAtmosphereDescription(sessionContext, internalProgress);
      
      // 発見済み要素リスト
      const discoveredElements = await this.getDiscoveredElements(sessionId);
      
      // 探索進行度判定
      const explorationProgress = this.calculateExplorationProgress(internalProgress);

      const maskedProgress: MaskedProgressInfo = {
        availableActions,
        ambiguousHints,
        atmosphereDescription,
        discoveredElements,
        explorationProgress
      };

      logger.info('✅ マスクされた進捗情報取得完了', { 
        sessionId,
        actionsCount: availableActions.length,
        hintsCount: ambiguousHints.length,
        explorationProgress 
      });

      return maskedProgress;

    } catch (error) {
      logger.error('❌ マスクされた進捗情報取得エラー', { error, sessionId });
      return this.createFallbackMaskedProgress();
    }
  }

  /**
   * 暗示的ヒント生成
   */
  async generateSubtleHints(milestoneProgress: number, milestoneId: string): Promise<string[]> {
    logger.debug('💭 暗示的ヒント生成開始', { milestoneProgress, milestoneId });

    try {
      // マイルストーン詳細を取得
      const milestone = await this.getMilestoneById(milestoneId);
      if (!milestone) {
        logger.warn('⚠️ マイルストーンが見つかりません', { milestoneId });
        return this.createFallbackHints();
      }

      // 進捗レベルに応じたヒント生成
      const hints = await this.generateProgressBasedHints(milestone, milestoneProgress);

      logger.info('✅ 暗示的ヒント生成完了', { 
        milestoneId, 
        milestoneProgress,
        hintsCount: hints.length 
      });

      return hints;

    } catch (error) {
      logger.error('❌ 暗示的ヒント生成エラー', { error, milestoneId });
      return this.createFallbackHints();
    }
  }

  /**
   * プレイヤー表示コンテンツフィルタリング
   */
  async filterPlayerVisibleContent(content: any): Promise<any> {
    logger.debug('🔍 プレイヤー表示コンテンツフィルタリング開始');

    // 隠すべき情報を除去
    const filteredContent = { ...content };

    // マイルストーン進捗関連情報を削除
    delete filteredContent.milestoneProgress;
    delete filteredContent.targetEntityIds;
    delete filteredContent.progressContributions;
    delete filteredContent.hiddenFromPlayer;

    // 内部状態情報を削除
    delete filteredContent.internalState;
    delete filteredContent.systemMessages;
    delete filteredContent.debugInfo;

    // プレイヤー向けの表現に変換
    if (filteredContent.reward) {
      filteredContent.reward = await this.createAmbiguousRewardMessage(filteredContent.reward);
    }

    logger.debug('✅ プレイヤー表示コンテンツフィルタリング完了');
    return filteredContent;
  }

  /**
   * 自然な誘導メッセージ生成
   */
  async generateNaturalGuidance(context: SessionContext): Promise<string> {
    logger.debug('🧭 自然な誘導メッセージ生成開始', { sessionId: context.sessionId });

    try {
      // TODO: AI による自然誘導メッセージ生成機能の実装
      // const _aiService = getAIService();
      // const _provider = process.env.DEFAULT_AI_PROVIDER || 'google';
      // const _internalProgress = await this.getInternalProgress(context.sessionId);
      // const _guidanceRequest = {
      //   sessionContext: context,
      //   currentSituation: '[現在状況の説明]',
      //   guidanceType: 'natural_guidance'
      // };

      // AIに自然な誘導メッセージ生成を依頼（簡易実装：現在はフォールバック）
      // TODO: aiService.generatePlayerGuidanceメソッドの実装
      const guidanceMessage = this.createFallbackGuidance(context);

      logger.info('✅ 自然な誘導メッセージ生成完了', { 
        sessionId: context.sessionId,
        messageLength: guidanceMessage.length 
      });

      return guidanceMessage;

    } catch (error) {
      logger.error('❌ 自然な誘導メッセージ生成エラー', { error, sessionId: context.sessionId });
      return this.createFallbackGuidance(context);
    }
  }

  /**
   * 曖昧な報酬メッセージ作成
   */
  async createAmbiguousRewardMessage(reward: any): Promise<string> {
    logger.debug('🎁 曖昧な報酬メッセージ作成開始');

    try {
      // 報酬の種類に応じて曖昧な表現を生成
      if (reward.items && reward.items.length > 0) {
        const item = reward.items[0];
        
        switch (item.category) {
          case 'trophy':
            return `興味深いものを発見しました。「${item.name}」- これまでの冒険の記念になりそうです。`;
          case 'mystery_item':
            return `謎めいたものを手に入れました。「${item.name}」- 今はよくわかりませんが、いつか役に立つかもしれません。`;
          default:
            return `有用なものを発見しました。「${item.name}」- 冒険の助けになりそうです。`;
        }
      }

      if (reward.information && reward.information.length > 0) {
        return `新たな情報を得ました。物語の理解が深まったようです。`;
      }

      if (reward.experiencePoints > 0) {
        return `この体験から多くを学びました。成長を実感できます。`;
      }

      return `何かしらの成果を得ることができました。`;

    } catch (error) {
      logger.error('❌ 曖昧な報酬メッセージ作成エラー', { error });
      return `何かを発見したようですが、詳細は定かではありません。`;
    }
  }

  // ==========================================
  // 内部処理メソッド
  // ==========================================

  /**
   * 内部進捗情報取得
   */
  private async getInternalProgress(sessionId: string): Promise<any> {
    const stmt = this.db.prepare(`
      SELECT * FROM ai_milestones 
      WHERE session_id = ? 
      ORDER BY created_at ASC
    `);

    const milestones = stmt.all(sessionId) as any[];
    
    return {
      milestones: milestones.map(m => ({
        id: m.id,
        title: m.title,
        progress: m.progress,
        status: m.status,
        targetEntityIds: JSON.parse(m.target_entity_ids || '[]'),
        progressContributions: JSON.parse(m.progress_contributions || '[]')
      })),
      totalProgress: this.calculateTotalProgress(milestones),
      activeObjectives: milestones.filter(m => m.status === 'in_progress').length,
      completedObjectives: milestones.filter(m => m.status === 'completed').length
    };
  }

  /**
   * セッションコンテキスト取得
   */
  private async getSessionContext(sessionId: string): Promise<SessionContext> {
    // TODO: 実際のセッションデータから取得
    return {
      sessionId,
      campaignId: 'default-campaign',
      themeId: 'mystery-horror',
      currentLocationId: 'village-center',
      playerActions: [],
      discoveredEntities: [],
      sessionDuration: {
        type: 'medium',
        totalDays: 7,
        actionsPerDay: 4,
        dayPeriods: [],
        estimatedPlayTime: 70,
        milestoneCount: 3,
        description: 'テスト用中時間プレイ'
      }
    };
  }

  /**
   * 利用可能アクション生成
   */
  private async generateAvailableActions(_context: SessionContext, internalProgress: any): Promise<string[]> {
    const baseActions = [
      '周囲を詳しく調べる',
      '近くの人と話してみる',
      '気になる場所に向かう',
      '持ち物を確認する'
    ];

    // 進捗に応じて動的にアクションを追加
    if (internalProgress.totalProgress > 0.3) {
      baseActions.push('得た情報を整理する');
    }

    if (internalProgress.totalProgress > 0.6) {
      baseActions.push('重要な決断を下す');
    }

    return baseActions;
  }

  /**
   * 曖昧なヒント生成
   */
  private async generateAmbiguousHints(_context: SessionContext, internalProgress: any): Promise<string[]> {
    const hints: string[] = [];

    // 進捗レベルに応じたヒント
    if (internalProgress.totalProgress < 0.3) {
      hints.push('この場所には何か秘密がありそうです...');
      hints.push('住民たちが何かを隠している様子です');
    } else if (internalProgress.totalProgress < 0.7) {
      hints.push('これまでの手がかりが繋がりそうです');
      hints.push('真実に近づいている実感があります');
    } else {
      hints.push('すべての答えが見えてきました');
      hints.push('最後の重要な決断の時が来ています');
    }

    return hints;
  }

  /**
   * 雰囲気描写生成
   */
  private async generateAtmosphereDescription(_context: SessionContext, internalProgress: any): Promise<string> {
    const progressPhases = [
      '静寂に包まれた村には、何かしらの緊張感が漂っています。',
      '謎が少しずつ明らかになり、物語の核心に迫っているようです。',
      'すべての断片が組み合わさり、真実の全貌が見えてきています。',
      '物語のクライマックスが近づき、重要な選択の時が来ています。'
    ];

    const phaseIndex = Math.min(Math.floor(internalProgress.totalProgress * 4), 3);
    return progressPhases[phaseIndex];
  }

  /**
   * 発見済み要素取得
   */
  private async getDiscoveredElements(sessionId: string): Promise<string[]> {
    const stmt = this.db.prepare(`
      SELECT entity_id FROM location_entity_mappings 
      WHERE session_id = ? AND discovered_at IS NOT NULL
      ORDER BY discovered_at ASC
    `);

    const rows = stmt.all(sessionId) as any[];
    return rows.map(row => `発見済み要素 ${row.entity_id.slice(0, 8)}`);
  }

  /**
   * 探索進行度計算
   */
  private calculateExplorationProgress(internalProgress: any): 'beginning' | 'exploring' | 'discovering' | 'concluding' {
    const progress = internalProgress.totalProgress;
    
    if (progress < 0.25) return 'beginning';
    if (progress < 0.5) return 'exploring';
    if (progress < 0.8) return 'discovering';
    return 'concluding';
  }

  /**
   * 進捗ベースヒント生成
   */
  private async generateProgressBasedHints(_milestone: AIMilestone, progress: number): Promise<string[]> {
    const hints: string[] = [];

    if (progress === 0) {
      hints.push(`何かを見逃しているような気がします...`);
      hints.push(`この辺りをもう少し詳しく調べてみましょう`);
    } else if (progress < 50) {
      hints.push(`手がかりが見つかりました。この調子で続けましょう`);
      hints.push(`他にも関連する情報があるかもしれません`);
    } else if (progress < 100) {
      hints.push(`真実に近づいています。最後の一歩です`);
      hints.push(`これまでの発見を整理すると、答えが見えてきそうです`);
    }

    return hints;
  }

  /**
   * 現在状況の説明生成
   */
  // 注: describCurrentSituation メソッドは削除されました（未使用のため）

  /**
   * マイルストーン取得
   */
  private async getMilestoneById(milestoneId: string): Promise<AIMilestone | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM ai_milestones WHERE id = ?
    `);

    const row = stmt.get(milestoneId) as any;
    if (!row) return null;

    const milestone: AIMilestone = {
      id: row.id,
      name: row.title,
      description: row.description,
      type: row.type as ('story' | 'combat' | 'exploration' | 'social'),
      conditions: JSON.parse(row.required_conditions || '[]'),
      rewards: JSON.parse(row.reward || '{}'),
      difficulty: row.difficulty || 5,
      estimatedTime: row.estimated_time || 30
    };
    
    return milestone;
  }

  /**
   * 総進捗計算
   */
  private calculateTotalProgress(milestones: any[]): number {
    if (milestones.length === 0) return 0;
    
    const totalProgress = milestones.reduce((sum, m) => sum + m.progress, 0);
    return totalProgress / (milestones.length * 100);
  }

  // ==========================================
  // フォールバック処理
  // ==========================================

  private createFallbackMaskedProgress(): MaskedProgressInfo {
    return {
      availableActions: ['周囲を調べる', '人と話す'],
      ambiguousHints: ['何かがありそうです...'],
      atmosphereDescription: '静かな雰囲気に包まれています。',
      discoveredElements: [],
      explorationProgress: 'beginning'
    };
  }

  private createFallbackHints(): string[] {
    return [
      '何か気になることがありそうです...',
      '周囲をよく観察してみましょう',
      '人々と話してみると新しい発見があるかもしれません'
    ];
  }

  private createFallbackGuidance(context: SessionContext): string {
    return `${context.currentLocationId}で新たな冒険の手がかりを探してみましょう。周囲には興味深いものがありそうです。`;
  }
}

// Lazy initialization
let _playerExperienceService: PlayerExperienceService | null = null;
export function getPlayerExperienceService(): PlayerExperienceService {
  if (!_playerExperienceService) {
    _playerExperienceService = new PlayerExperienceService();
  }
  return _playerExperienceService;
}