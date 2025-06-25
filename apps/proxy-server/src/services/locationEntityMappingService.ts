import { Database } from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { 
  LocationEntityMapping
} from '@ai-agent-trpg/types';
import { getDatabase } from '../database/database';
import { logger } from '../utils/logger';

/**
 * エンティティ参照型（場所で利用可能なエンティティ一覧用）
 */
export interface EntityReference {
  id: string;
  name: string;
  type: 'core' | 'bonus';
  category: 'enemy' | 'event' | 'npc' | 'item' | 'quest' | 'practical' | 'trophy' | 'mystery';
  description: string;
  isAvailable: boolean;
  timeConditions?: string[];
  prerequisiteEntities?: string[];
  discoveredAt?: string;
}

/**
 * 時間条件チェック結果
 */
export interface TimeConditionResult {
  isValid: boolean;
  reason?: string;
  nextAvailableTime?: string;
}

/**
 * 前提条件チェック結果
 */
export interface PrerequisiteResult {
  isValid: boolean;
  missingEntities: string[];
  completedEntities: string[];
}

/**
 * 探索アクション結果
 */
export interface ExplorationResult {
  success: boolean;
  locationId: string;
  characterId: string;
  explorationLevel: number; // 0-100 この探索での達成レベル
  totalExplorationLevel: number; // 0-100 場所の総探索レベル
  
  // 発見されたエンティティ
  discoveredEntities: {
    entity: EntityReference;
    discoveryMessage: string; // AI generated discovery message
    rarity: 'common' | 'uncommon' | 'rare' | 'epic';
  }[];
  
  // 探索情報
  timeSpent: number; // 分
  encounterChance: number; // 0-1 遭遇確率
  
  // AI生成コンテンツ
  narrativeDescription: string; // 探索の物語的描写
  hints: string[]; // 次の探索に向けたヒント
  
  // 探索状態
  isFullyExplored: boolean;
  hiddenEntitiesRemaining: number;
}

/**
 * 場所エンティティマッピング管理サービス
 * 
 * 目的：
 * - エンティティと場所の関係性を管理
 * - 時間条件・前提条件による動的な利用可能性制御
 * - プレイヤーの手探り体験を演出するための場所ベース表示
 */
export class LocationEntityMappingService {
  private db: Database;

  constructor() {
    this.db = getDatabase();
  }

  // ==========================================
  // 基本CRUD操作
  // ==========================================

  /**
   * 複数のマッピングを一括作成
   */
  async createMappings(sessionId: string, mappings: Omit<LocationEntityMapping, 'id' | 'created_at'>[]): Promise<void> {
    logger.debug('📍 場所エンティティマッピング一括作成開始', { 
      sessionId, 
      mappingsCount: mappings.length 
    });

    const stmt = this.db.prepare(`
      INSERT INTO location_entity_mappings (
        id, session_id, location_id, entity_id, entity_type,
        entity_category, time_conditions, prerequisite_entities,
        is_available, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      for (const mapping of mappings) {
        const id = randomUUID();
        const now = new Date().toISOString();
        
        stmt.run(
          id,
          sessionId,
          mapping.locationId,
          mapping.entityId,
          mapping.entityType,
          mapping.entityCategory,
          JSON.stringify(mapping.timeConditions || []),
          JSON.stringify(mapping.prerequisiteEntities || []),
          mapping.isAvailable ? 1 : 0,
          now
        );
      }
    });

    transaction();

    logger.info('✅ 場所エンティティマッピング一括作成完了', { 
      sessionId, 
      createdCount: mappings.length 
    });
  }

  /**
   * 特定場所のマッピング取得
   */
  async getMappingsByLocation(locationId: string, sessionId: string): Promise<LocationEntityMapping[]> {
    logger.debug('🔍 場所別マッピング取得', { locationId, sessionId });

    const stmt = this.db.prepare(`
      SELECT * FROM location_entity_mappings 
      WHERE location_id = ? AND session_id = ?
      ORDER BY created_at ASC
    `);

    const rows = stmt.all(locationId, sessionId) as any[];
    const mappings = rows.map(this.rowToLocationEntityMapping);

    logger.debug('✅ 場所別マッピング取得完了', { 
      locationId, 
      mappingsCount: mappings.length 
    });

    return mappings;
  }

  /**
   * 特定エンティティのマッピング取得
   */
  async getMappingsByEntity(entityId: string): Promise<LocationEntityMapping[]> {
    logger.debug('🔍 エンティティ別マッピング取得', { entityId });

    const stmt = this.db.prepare(`
      SELECT * FROM location_entity_mappings 
      WHERE entity_id = ?
      ORDER BY created_at ASC
    `);

    const rows = stmt.all(entityId) as any[];
    const mappings = rows.map(this.rowToLocationEntityMapping);

    logger.debug('✅ エンティティ別マッピング取得完了', { 
      entityId, 
      mappingsCount: mappings.length 
    });

    return mappings;
  }

  /**
   * 利用可能性の更新
   */
  async updateAvailability(mappingId: string, isAvailable: boolean): Promise<void> {
    logger.debug('🔄 マッピング利用可能性更新', { mappingId, isAvailable });

    const stmt = this.db.prepare(`
      UPDATE location_entity_mappings 
      SET is_available = ?
      WHERE id = ?
    `);

    const result = stmt.run(isAvailable ? 1 : 0, mappingId);

    if (result.changes === 0) {
      throw new Error(`LocationEntityMapping with ID ${mappingId} not found`);
    }

    logger.info('✅ マッピング利用可能性更新完了', { 
      mappingId, 
      isAvailable, 
      updatedRows: result.changes 
    });
  }

  /**
   * エンティティ発見マーク
   */
  async markDiscovered(mappingId: string): Promise<void> {
    logger.debug('🔍 エンティティ発見マーク', { mappingId });

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE location_entity_mappings 
      SET discovered_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(now, mappingId);

    if (result.changes === 0) {
      throw new Error(`LocationEntityMapping with ID ${mappingId} not found`);
    }

    logger.info('✅ エンティティ発見マーク完了', { 
      mappingId, 
      discoveredAt: now, 
      updatedRows: result.changes 
    });
  }

  // ==========================================
  // 高度なクエリ操作
  // ==========================================

  /**
   * 特定場所で利用可能なエンティティ一覧取得
   */
  async getAvailableEntitiesForLocation(locationId: string, sessionId: string): Promise<EntityReference[]> {
    logger.debug('📍 場所利用可能エンティティ取得', { locationId, sessionId });

    // 基本マッピングを取得
    const mappings = await this.getMappingsByLocation(locationId, sessionId);
    
    // 時間条件・前提条件をチェックしてフィルタリング
    const availableEntities: EntityReference[] = [];
    
    for (const mapping of mappings) {
      // 時間条件チェック
      const timeCheck = await this.checkTimeConditions(mapping.timeConditions);
      if (!timeCheck.isValid) {
        logger.debug('⏰ 時間条件不適合でスキップ', { 
          entityId: mapping.entityId, 
          reason: timeCheck.reason 
        });
        continue;
      }

      // 前提条件チェック
      const prerequisiteCheck = await this.checkPrerequisites(mapping.prerequisiteEntities || [], sessionId);
      if (!prerequisiteCheck.isValid) {
        logger.debug('📋 前提条件不適合でスキップ', { 
          entityId: mapping.entityId, 
          missingEntities: prerequisiteCheck.missingEntities 
        });
        continue;
      }

      // 利用可能フラグチェック
      if (!mapping.isAvailable) {
        logger.debug('🚫 利用不可フラグでスキップ', { entityId: mapping.entityId });
        continue;
      }

      // エンティティ詳細を取得（簡易実装）
      const entityReference: EntityReference = {
        id: mapping.entityId,
        name: await this.getEntityName(mapping.entityId, mapping.entityCategory),
        type: mapping.entityType,
        category: mapping.entityCategory,
        description: await this.getEntityDescription(mapping.entityId, mapping.entityCategory),
        isAvailable: mapping.isAvailable,
        timeConditions: mapping.timeConditions,
        prerequisiteEntities: mapping.prerequisiteEntities,
        discoveredAt: mapping.discoveredAt
      };

      availableEntities.push(entityReference);
    }

    logger.info('✅ 場所利用可能エンティティ取得完了', { 
      locationId, 
      totalMappings: mappings.length,
      availableEntities: availableEntities.length 
    });

    return availableEntities;
  }

  // ==========================================
  // 条件チェック機能
  // ==========================================

  /**
   * 時間条件チェック
   */
  async checkTimeConditions(timeConditions?: string[]): Promise<TimeConditionResult> {
    if (!timeConditions || timeConditions.length === 0) {
      return { isValid: true };
    }

    const now = new Date();
    const currentHour = now.getHours();
    
    for (const condition of timeConditions) {
      switch (condition) {
        case 'day_time':
          if (currentHour >= 6 && currentHour < 18) {
            return { isValid: true };
          }
          break;
        case 'night_only':
          if (currentHour < 6 || currentHour >= 18) {
            return { isValid: true };
          }
          break;
        case 'morning_only':
          if (currentHour >= 6 && currentHour < 12) {
            return { isValid: true };
          }
          break;
        case 'afternoon_only':
          if (currentHour >= 12 && currentHour < 18) {
            return { isValid: true };
          }
          break;
        case 'any':
          return { isValid: true };
        default:
          logger.warn('⚠️ 未知の時間条件', { condition });
          break;
      }
    }

    return {
      isValid: false,
      reason: `時間条件に適合しません: ${timeConditions.join(', ')}`,
      nextAvailableTime: this.calculateNextAvailableTime(timeConditions)
    };
  }

  /**
   * 前提条件チェック
   */
  async checkPrerequisites(prerequisiteEntities: string[], sessionId: string): Promise<PrerequisiteResult> {
    if (prerequisiteEntities.length === 0) {
      return { isValid: true, missingEntities: [], completedEntities: [] };
    }

    // 発見済みエンティティ一覧を取得
    const discoveredEntities = await this.getDiscoveredEntities(sessionId);
    const discoveredEntityIds = discoveredEntities.map(e => e.entityId);

    const missingEntities: string[] = [];
    const completedEntities: string[] = [];

    for (const entityId of prerequisiteEntities) {
      if (discoveredEntityIds.includes(entityId)) {
        completedEntities.push(entityId);
      } else {
        missingEntities.push(entityId);
      }
    }

    return {
      isValid: missingEntities.length === 0,
      missingEntities,
      completedEntities
    };
  }

  /**
   * 動的利用可能性更新
   */
  async updateDynamicAvailability(sessionId: string): Promise<void> {
    logger.debug('🔄 動的利用可能性更新開始', { sessionId });

    const stmt = this.db.prepare(`
      SELECT * FROM location_entity_mappings 
      WHERE session_id = ?
    `);

    const rows = stmt.all(sessionId) as any[];
    const mappings = rows.map(this.rowToLocationEntityMapping);

    let updatedCount = 0;

    for (const mapping of mappings) {
      // 時間条件チェック
      const timeCheck = await this.checkTimeConditions(mapping.timeConditions);
      
      // 前提条件チェック
      const prerequisiteCheck = await this.checkPrerequisites(mapping.prerequisiteEntities || [], sessionId);
      
      // 新しい利用可能性
      const newAvailability = timeCheck.isValid && prerequisiteCheck.isValid;
      
      // 状態が変更された場合のみ更新
      if (mapping.isAvailable !== newAvailability) {
        await this.updateAvailability(mapping.id, newAvailability);
        updatedCount++;
        
        logger.debug('🔄 利用可能性変更', { 
          entityId: mapping.entityId,
          oldAvailability: mapping.isAvailable,
          newAvailability,
          timeValid: timeCheck.isValid,
          prerequisiteValid: prerequisiteCheck.isValid
        });
      }
    }

    logger.info('✅ 動的利用可能性更新完了', { 
      sessionId, 
      totalMappings: mappings.length,
      updatedCount 
    });
  }

  // ==========================================
  // プライベートヘルパーメソッド
  // ==========================================

  /**
   * データベース行をLocationEntityMappingに変換
   */
  private rowToLocationEntityMapping(row: any): LocationEntityMapping {
    return {
      id: row.id,
      sessionId: row.session_id,
      locationId: row.location_id,
      entityId: row.entity_id,
      entityType: row.entity_type,
      entityCategory: row.entity_category,
      timeConditions: row.time_conditions ? JSON.parse(row.time_conditions) : undefined,
      prerequisiteEntities: row.prerequisite_entities ? JSON.parse(row.prerequisite_entities) : undefined,
      isAvailable: Boolean(row.is_available),
      discoveredAt: row.discovered_at,
      createdAt: row.created_at
    };
  }

  /**
   * 発見済みエンティティ一覧取得
   */
  private async getDiscoveredEntities(sessionId: string): Promise<LocationEntityMapping[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM location_entity_mappings 
      WHERE session_id = ? AND discovered_at IS NOT NULL
      ORDER BY discovered_at ASC
    `);

    const rows = stmt.all(sessionId) as any[];
    return rows.map(this.rowToLocationEntityMapping);
  }

  /**
   * 次回利用可能時間計算
   */
  private calculateNextAvailableTime(_timeConditions: string[]): string {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 簡易実装：明日の同時刻
    return tomorrow.toISOString();
  }

  /**
   * エンティティ名取得（簡易実装）
   */
  private async getEntityName(entityId: string, category: string): Promise<string> {
    // TODO: 実際のエンティティデータベースと連携
    return `${category}_${entityId.slice(0, 8)}`;
  }

  /**
   * エンティティ説明取得（簡易実装）
   */
  private async getEntityDescription(entityId: string, category: string): Promise<string> {
    // TODO: 実際のエンティティデータベースと連携
    return `${category}カテゴリのエンティティ (ID: ${entityId})`;
  }

  /**
   * 場所を探索してエンティティを発見する
   * 「探索している感」を実現する核心機能
   */
  async exploreLocation(
    locationId: string, 
    characterId: string, 
    sessionId: string,
    explorationIntensity: 'light' | 'thorough' | 'exhaustive' = 'thorough'
  ): Promise<ExplorationResult> {
    logger.info(`🔍 探索アクション開始`, { locationId, characterId, explorationIntensity });
    
    try {
      // 1. 場所の未発見エンティティを取得
      const hiddenEntities = await this.getHiddenEntitiesAtLocation(locationId, sessionId);
      
      // 2. 探索設定に基づく発見確率計算
      const baseDiscoveryRate = this.getDiscoveryRate(explorationIntensity);
      const timeSpent = this.getExplorationTime(explorationIntensity);
      
      // 3. エンティティ発見判定
      const discoveredEntities = [];
      for (const entity of hiddenEntities) {
        const discoveryChance = this.calculateDiscoveryChance(entity, baseDiscoveryRate);
        if (Math.random() < discoveryChance) {
          // エンティティ発見！
          await this.markEntityDiscovered(entity.id, characterId);
          
          discoveredEntities.push({
            entity,
            discoveryMessage: await this.generateDiscoveryMessage(entity, locationId),
            rarity: this.determineEntityRarity(entity)
          });
        }
      }
      
      // 4. 探索レベル計算
      const explorationLevel = Math.min(
        this.getExplorationLevelGain(explorationIntensity, discoveredEntities.length),
        100
      );
      
      // 5. 総探索レベル更新
      const totalExplorationLevel = await this.updateLocationExplorationLevel(
        locationId, sessionId, explorationLevel
      );
      
      // 6. 残り隠しエンティティ数計算
      const remainingHidden = hiddenEntities.length - discoveredEntities.length;
      
      // 7. 結果構築
      const result: ExplorationResult = {
        success: true,
        locationId,
        characterId,
        explorationLevel,
        totalExplorationLevel,
        discoveredEntities,
        timeSpent,
        encounterChance: this.calculateEncounterChance(explorationIntensity),
        narrativeDescription: await this.generateNarrativeDescription(
          locationId, explorationIntensity, discoveredEntities
        ),
        hints: await this.generateExplorationHints(locationId, remainingHidden),
        isFullyExplored: totalExplorationLevel >= 100 && remainingHidden === 0,
        hiddenEntitiesRemaining: remainingHidden
      };
      
      logger.info(`✅ 探索完了`, {
        locationId,
        discoveredCount: discoveredEntities.length,
        totalExploration: totalExplorationLevel,
        timeSpent
      });
      
      return result;
      
    } catch (error) {
      logger.error(`❌ 探索エラー`, { locationId, characterId, error });
      throw new Error(`探索に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  /**
   * 場所の未発見エンティティを取得
   */
  private async getHiddenEntitiesAtLocation(
    locationId: string, 
    sessionId: string
  ): Promise<EntityReference[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM location_entity_mappings 
      WHERE location_id = ? AND session_id = ? 
        AND is_available = 1 
        AND discovered_at IS NULL
      ORDER BY entity_type, entity_category
    `);
    
    const rows = stmt.all(locationId, sessionId) as any[];
    const mappings = rows.map(this.rowToLocationEntityMapping);
    
    // EntityReferenceに変換
    const entities = [];
    for (const mapping of mappings) {
      // 時間条件・前提条件チェック
      const timeCheck = await this.checkTimeConditions(mapping.id);
      const prereqCheck = await this.checkPrerequisites(mapping.id);
      
      if (timeCheck.isValid && prereqCheck.isValid) {
        entities.push({
          id: mapping.entityId,
          name: await this.getEntityName(mapping.entityId, mapping.entityCategory),
          type: mapping.entityType as 'core' | 'bonus',
          category: mapping.entityCategory as any,
          description: await this.getEntityDescription(mapping.entityId, mapping.entityCategory),
          isAvailable: true,
          timeConditions: mapping.discoveryConditions,
          prerequisiteEntities: mapping.prerequisiteEntities
        });
      }
    }
    
    return entities;
  }

  /**
   * 探索強度に基づく発見率を取得
   */
  private getDiscoveryRate(intensity: 'light' | 'thorough' | 'exhaustive'): number {
    const rates = {
      light: 0.3,      // 30% 基本発見率
      thorough: 0.6,   // 60% 基本発見率  
      exhaustive: 0.9  // 90% 基本発見率
    };
    return rates[intensity];
  }

  /**
   * 探索強度に基づく所要時間を取得（分）
   */
  private getExplorationTime(intensity: 'light' | 'thorough' | 'exhaustive'): number {
    const times = {
      light: 15,      // 15分
      thorough: 45,   // 45分
      exhaustive: 90  // 90分
    };
    return times[intensity];
  }

  /**
   * エンティティ発見確率を計算
   */
  private calculateDiscoveryChance(entity: EntityReference, baseRate: number): number {
    // エンティティタイプによる補正
    const typeModifier = entity.type === 'core' ? 1.2 : 0.8; // コアエンティティは見つかりやすい
    
    // カテゴリによる補正
    const categoryModifiers = {
      item: 1.0,      // アイテムは標準
      npc: 0.9,       // NPCは少し見つかりにくい
      event: 0.8,     // イベントは隠れている  
      quest: 0.7,     // クエストは発見困難
      enemy: 0.6,     // 敵は隠れている
      practical: 1.0,
      trophy: 0.5,    // トロフィーは稀少
      mystery: 0.3    // ミステリーは最も稀少
    };
    
    const categoryModifier = categoryModifiers[entity.category] || 1.0;
    
    return Math.min(baseRate * typeModifier * categoryModifier, 1.0);
  }

  /**
   * エンティティを発見済みとしてマーク
   */
  private async markEntityDiscovered(entityId: string, characterId: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE location_entity_mappings 
      SET discovered_at = ?
      WHERE entity_id = ?
    `);
    
    stmt.run(new Date().toISOString(), entityId);
  }

  /**
   * 発見メッセージを生成
   */
  private async generateDiscoveryMessage(entity: EntityReference, locationId: string): Promise<string> {
    // Phase 1実装：シンプルなメッセージ
    // Phase 2でAI生成に拡張予定
    const messages = {
      item: `${entity.name}を発見しました！`,
      npc: `${entity.name}と出会いました。`,
      event: `興味深い出来事を発見：${entity.name}`,
      quest: `新たな任務を発見：${entity.name}`,
      enemy: `危険な存在を発見：${entity.name}`,
      practical: `実用的な報酬を発見：${entity.name}`,
      trophy: `貴重なトロフィーを発見：${entity.name}`,
      mystery: `謎めいた何かを発見：${entity.name}`
    };
    
    return messages[entity.category] || `${entity.name}を発見しました。`;
  }

  /**
   * エンティティレア度を判定
   */
  private determineEntityRarity(entity: EntityReference): 'common' | 'uncommon' | 'rare' | 'epic' {
    if (entity.category === 'mystery') return 'epic';
    if (entity.category === 'trophy') return 'rare';
    if (entity.type === 'bonus') return 'uncommon';
    return 'common';
  }

  /**
   * 探索レベル上昇値を計算
   */
  private getExplorationLevelGain(
    intensity: 'light' | 'thorough' | 'exhaustive',
    discoveredCount: number
  ): number {
    const baseGains = {
      light: 10,      // 基本10%上昇
      thorough: 25,   // 基本25%上昇
      exhaustive: 40  // 基本40%上昇
    };
    
    const baseGain = baseGains[intensity];
    const discoveryBonus = discoveredCount * 5; // 発見1個につき5%ボーナス
    
    return baseGain + discoveryBonus;
  }

  /**
   * 場所の総探索レベルを更新
   */
  private async updateLocationExplorationLevel(
    locationId: string,
    sessionId: string,
    additionalLevel: number
  ): Promise<number> {
    // Phase 1実装：単純な計算
    // 実際の実装では場所テーブルの exploration_level を更新
    return Math.min(additionalLevel, 100);
  }

  /**
   * 遭遇確率を計算
   */
  private calculateEncounterChance(intensity: 'light' | 'thorough' | 'exhaustive'): number {
    const encounterRates = {
      light: 0.1,      // 10%
      thorough: 0.2,   // 20%  
      exhaustive: 0.35 // 35%
    };
    return encounterRates[intensity];
  }

  /**
   * 物語的描写を生成
   */
  private async generateNarrativeDescription(
    locationId: string,
    intensity: 'light' | 'thorough' | 'exhaustive',
    discoveries: any[]
  ): Promise<string> {
    // Phase 1実装：テンプレートベース
    // Phase 2でAI生成に拡張予定
    const intensityDesc = {
      light: 'ざっと辺りを見回し',
      thorough: '注意深く調査し',
      exhaustive: '徹底的に探索し'
    };
    
    if (discoveries.length === 0) {
      return `${intensityDesc[intensity]}ましたが、特に目立つものは見つかりませんでした。`;
    }
    
    return `${intensityDesc[intensity]}、${discoveries.length}個の興味深いものを発見しました。`;
  }

  /**
   * 探索ヒントを生成
   */
  private async generateExplorationHints(locationId: string, remainingHidden: number): Promise<string[]> {
    // Phase 1実装：シンプルなヒント
    // Phase 2でAI生成に拡張予定
    const hints = [];
    
    if (remainingHidden > 0) {
      hints.push('まだ見つけていないものがありそうです。');
      hints.push('別の時間帯や条件で探索すると、新たな発見があるかもしれません。');
    } else {
      hints.push('この場所は十分に探索されたようです。');
    }
    
    return hints;
  }
}

// Lazy initialization
let _locationEntityMappingService: LocationEntityMappingService | null = null;
export function getLocationEntityMappingService(): LocationEntityMappingService {
  if (!_locationEntityMappingService) {
    _locationEntityMappingService = new LocationEntityMappingService();
  }
  return _locationEntityMappingService;
}