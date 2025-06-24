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
}

// Lazy initialization
let _locationEntityMappingService: LocationEntityMappingService | null = null;
export function getLocationEntityMappingService(): LocationEntityMappingService {
  if (!_locationEntityMappingService) {
    _locationEntityMappingService = new LocationEntityMappingService();
  }
  return _locationEntityMappingService;
}