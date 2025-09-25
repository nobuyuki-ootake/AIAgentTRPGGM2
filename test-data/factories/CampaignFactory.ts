/**
 * ファクトリ: キャンペーンデータ生成器
 * t-WADA命名規則: CampaignFactory.ts
 * 本番型定義（@ai-agent-trpg/types）を使用
 * 
 * 用途: テストケースごとのカスタムデータ生成、フルエントインタフェースでの柔軟な設定
 */

import { TRPGCampaign } from '@ai-agent-trpg/types';

// ===================================
// キャンペーンファクトリクラス
// ===================================

export class CampaignFactory {
  private campaign: Partial<TRPGCampaign> = {};
  private static instanceCounter = 0;

  constructor() {
    // デフォルト値の設定
    this.reset();
  }

  // ===================================
  // ファクトリメソッド（フルエントインタフェース）
  // ===================================

  withId(id: string): CampaignFactory {
    this.campaign.id = id;
    return this;
  }

  withTitle(title: string): CampaignFactory {
    this.campaign.title = title;
    return this;
  }

  withDescription(description: string): CampaignFactory {
    this.campaign.description = description;
    return this;
  }

  withGameSystem(gameSystem: string): CampaignFactory {
    this.campaign.gameSystem = gameSystem;
    return this;
  }

  withGM(gmId: string): CampaignFactory {
    this.campaign.gmId = gmId;
    return this;
  }

  withPlayers(playerIds: string[]): CampaignFactory {
    this.campaign.playerIds = [...playerIds];
    return this;
  }

  addPlayer(playerId: string): CampaignFactory {
    if (!this.campaign.playerIds) {
      this.campaign.playerIds = [];
    }
    this.campaign.playerIds.push(playerId);
    return this;
  }

  withCharacters(characterIds: string[]): CampaignFactory {
    this.campaign.characterIds = [...characterIds];
    return this;
  }

  addCharacter(characterId: string): CampaignFactory {
    if (!this.campaign.characterIds) {
      this.campaign.characterIds = [];
    }
    this.campaign.characterIds.push(characterId);
    return this;
  }

  withLocation(locationId: string): CampaignFactory {
    this.campaign.currentLocationId = locationId;
    return this;
  }

  withTimeline(timelineId: string): CampaignFactory {
    this.campaign.currentTimelineId = timelineId;
    return this;
  }

  withSession(sessionId: string): CampaignFactory {
    this.campaign.currentSessionId = sessionId;
    return this;
  }

  withStatus(status: 'preparing' | 'active' | 'paused' | 'completed' | 'cancelled'): CampaignFactory {
    this.campaign.status = status;
    return this;
  }

  withDifficulty(difficulty: 'trivial' | 'easy' | 'normal' | 'hard' | 'extreme'): CampaignFactory {
    if (!this.campaign.settings) {
      this.campaign.settings = this.getDefaultSettings();
    }
    this.campaign.settings.difficultyLevel = difficulty;
    return this;
  }

  withAIAssistance(level: 'minimal' | 'standard' | 'advanced' | 'expert'): CampaignFactory {
    if (!this.campaign.settings) {
      this.campaign.settings = this.getDefaultSettings();
    }
    this.campaign.settings.aiAssistanceLevel = level;
    return this;
  }

  withSessionDuration(minutes: number): CampaignFactory {
    if (!this.campaign.settings) {
      this.campaign.settings = this.getDefaultSettings();
    }
    this.campaign.settings.sessionDuration = minutes;
    return this;
  }

  withMaxPlayers(maxPlayers: number): CampaignFactory {
    if (!this.campaign.settings) {
      this.campaign.settings = this.getDefaultSettings();
    }
    this.campaign.settings.maxPlayers = maxPlayers;
    return this;
  }

  withVoiceChat(enabled: boolean): CampaignFactory {
    if (!this.campaign.settings) {
      this.campaign.settings = this.getDefaultSettings();
    }
    this.campaign.settings.useVoiceChat = enabled;
    return this;
  }

  withCustomRules(rules: Record<string, any>): CampaignFactory {
    if (!this.campaign.settings) {
      this.campaign.settings = this.getDefaultSettings();
    }
    this.campaign.settings.customRules = { ...rules };
    return this;
  }

  addCustomRule(key: string, value: any): CampaignFactory {
    if (!this.campaign.settings) {
      this.campaign.settings = this.getDefaultSettings();
    }
    if (!this.campaign.settings.customRules) {
      this.campaign.settings.customRules = {};
    }
    this.campaign.settings.customRules[key] = value;
    return this;
  }

  withTimestamps(createdAt: string, updatedAt?: string): CampaignFactory {
    this.campaign.createdAt = createdAt;
    this.campaign.updatedAt = updatedAt || createdAt;
    return this;
  }

  withLastSession(lastSessionDate: string): CampaignFactory {
    this.campaign.lastSessionDate = lastSessionDate;
    return this;
  }

  asCompleted(completedAt?: string): CampaignFactory {
    this.campaign.status = 'completed';
    this.campaign.completedAt = completedAt || new Date().toISOString();
    return this;
  }

  asCancelled(): CampaignFactory {
    this.campaign.status = 'cancelled';
    return this;
  }

  asActive(): CampaignFactory {
    this.campaign.status = 'active';
    return this;
  }

  asPreparing(): CampaignFactory {
    this.campaign.status = 'preparing';
    return this;
  }

  // ===================================
  // プリセットメソッド
  // ===================================

  asBeginner(): CampaignFactory {
    return this
      .withDifficulty('normal')
      .withAIAssistance('standard')
      .withSessionDuration(180)
      .withMaxPlayers(4)
      .withTitle('初心者向けキャンペーン')
      .withDescription('D&D5eの基本ルールを学ぶ初心者向けキャンペーン');
  }

  asIntermediate(): CampaignFactory {
    return this
      .withDifficulty('hard')
      .withAIAssistance('advanced')
      .withSessionDuration(240)
      .withMaxPlayers(5)
      .withTitle('中級者向けキャンペーン')
      .withDescription('複雑なストーリーと戦術を楽しむ中級者向けキャンペーン');
  }

  asAdvanced(): CampaignFactory {
    return this
      .withDifficulty('extreme')
      .withAIAssistance('expert')
      .withSessionDuration(300)
      .withMaxPlayers(6)
      .withTitle('上級者向けキャンペーン')
      .withDescription('エピックな冒険を楽しむ上級者向けキャンペーン')
      .addCustomRule('epicBoons', true)
      .addCustomRule('legendaryItems', true);
  }

  asOneshot(): CampaignFactory {
    return this
      .withDifficulty('normal')
      .withAIAssistance('standard')
      .withSessionDuration(360)
      .withMaxPlayers(4)
      .withTitle('ワンショットキャンペーン')
      .withDescription('1回で完結するワンショットアドベンチャー')
      .addCustomRule('pregenCharacters', true)
      .addCustomRule('timeLimit', true);
  }

  asHorror(): CampaignFactory {
    return this
      .withDifficulty('hard')
      .withAIAssistance('advanced')
      .withTitle('ホラーキャンペーン')
      .withDescription('恐怖と緊張感に満ちたホラーキャンペーン')
      .addCustomRule('sanitySystem', true)
      .addCustomRule('fearEffects', true)
      .withVoiceChat(false); // テキストベースでより雰囲気重視
  }

  asPolitical(): CampaignFactory {
    return this
      .withDifficulty('hard')
      .withAIAssistance('expert')
      .withTitle('政治陰謀キャンペーン')
      .withDescription('政治的駆け引きと陰謀が渦巻くキャンペーン')
      .addCustomRule('socialCombat', true)
      .addCustomRule('reputationSystem', true)
      .addCustomRule('politicalInfluence', true);
  }

  // ===================================
  // ビルドメソッド
  // ===================================

  build(): TRPGCampaign {
    // 必須フィールドのデフォルト値設定
    const campaign: TRPGCampaign = {
      id: this.campaign.id || `factory-campaign-${++CampaignFactory.instanceCounter}`,
      title: this.campaign.title || 'ファクトリキャンペーン',
      description: this.campaign.description || 'ファクトリで生成されたテストキャンペーン',
      gameSystem: this.campaign.gameSystem || 'D&D5e',
      gmId: this.campaign.gmId || 'factory-gm-001',
      playerIds: this.campaign.playerIds || [],
      characterIds: this.campaign.characterIds || [],
      status: this.campaign.status || 'preparing',
      settings: this.campaign.settings || this.getDefaultSettings(),
      createdAt: this.campaign.createdAt || new Date().toISOString(),
      updatedAt: this.campaign.updatedAt || new Date().toISOString(),
      
      // オプションフィールド
      ...(this.campaign.currentLocationId && { currentLocationId: this.campaign.currentLocationId }),
      ...(this.campaign.currentTimelineId && { currentTimelineId: this.campaign.currentTimelineId }),
      ...(this.campaign.currentSessionId && { currentSessionId: this.campaign.currentSessionId }),
      ...(this.campaign.lastSessionDate && { lastSessionDate: this.campaign.lastSessionDate }),
      ...(this.campaign.completedAt && { completedAt: this.campaign.completedAt })
    };

    return campaign;
  }

  // ===================================
  // 複数生成メソッド
  // ===================================

  buildMultiple(count: number): TRPGCampaign[] {
    const campaigns: TRPGCampaign[] = [];
    
    for (let i = 0; i < count; i++) {
      // 各キャンペーンに一意のIDとタイトルを設定
      const campaign = this.build();
      campaign.id = `${campaign.id}-${i + 1}`;
      campaign.title = `${campaign.title} ${i + 1}`;
      campaigns.push(campaign);
    }
    
    return campaigns;
  }

  // ===================================
  // ユーティリティメソッド
  // ===================================

  reset(): CampaignFactory {
    this.campaign = {};
    return this;
  }

  clone(): CampaignFactory {
    const newFactory = new CampaignFactory();
    newFactory.campaign = { 
      ...this.campaign,
      settings: this.campaign.settings ? { ...this.campaign.settings } : undefined,
      playerIds: this.campaign.playerIds ? [...this.campaign.playerIds] : undefined,
      characterIds: this.campaign.characterIds ? [...this.campaign.characterIds] : undefined
    };
    return newFactory;
  }

  private getDefaultSettings() {
    return {
      aiAssistanceLevel: 'standard' as const,
      difficultyLevel: 'normal' as const,
      sessionDuration: 180,
      maxPlayers: 4,
      useVoiceChat: false,
      allowPlayerActions: true
    };
  }

  // ===================================
  // 静的ファクトリメソッド
  // ===================================

  static create(): CampaignFactory {
    return new CampaignFactory();
  }

  static createBeginner(): CampaignFactory {
    return new CampaignFactory().asBeginner();
  }

  static createIntermediate(): CampaignFactory {
    return new CampaignFactory().asIntermediate();
  }

  static createAdvanced(): CampaignFactory {
    return new CampaignFactory().asAdvanced();
  }

  static createOneshot(): CampaignFactory {
    return new CampaignFactory().asOneshot();
  }

  static createHorror(): CampaignFactory {
    return new CampaignFactory().asHorror();
  }

  static createPolitical(): CampaignFactory {
    return new CampaignFactory().asPolitical();
  }

  static createMultiple(count: number, preset?: 'beginner' | 'intermediate' | 'advanced' | 'oneshot'): TRPGCampaign[] {
    let factory: CampaignFactory;
    
    switch (preset) {
      case 'beginner':
        factory = CampaignFactory.createBeginner();
        break;
      case 'intermediate':
        factory = CampaignFactory.createIntermediate();
        break;
      case 'advanced':
        factory = CampaignFactory.createAdvanced();
        break;
      case 'oneshot':
        factory = CampaignFactory.createOneshot();
        break;
      default:
        factory = CampaignFactory.create();
    }
    
    return factory.buildMultiple(count);
  }
}

// ===================================
// エクスポート
// ===================================

export default CampaignFactory;