/**
 * データ変換ユーティリティ
 * Data Transformation Utilities
 * 
 * 提供機能:
 * - JSON シリアライゼーション/デシリアライゼーション
 * - 型変換とキャスト
 * - データマッピングと変換
 * - API レスポンス変換
 */

import type { ID, DateTime, BaseStats, APIResponse, ValidationError } from '../base';
import type { TRPGCharacter, NPCCharacter, EnemyCharacter } from '../character';
import type { TRPGSession, DiceRoll, ChatMessage } from '../session';

// ==========================================
// 型変換インターフェース
// ==========================================

export interface DataTransformOptions {
  preserveOriginal?: boolean;
  validateTypes?: boolean;
  stripUndefined?: boolean;
  convertDates?: boolean;
}

export interface MappingRule<TSource, TTarget> {
  source: keyof TSource;
  target: keyof TTarget;
  transform?: (value: any) => any;
  required?: boolean;
  defaultValue?: any;
}

// ==========================================
// JSON シリアライゼーション
// ==========================================

/**
 * 安全なJSONシリアライゼーション
 */
export function safeJsonStringify(
  obj: any,
  replacer?: (key: string, value: any) => any,
  space?: string | number
): string {
  try {
    const defaultReplacer = (key: string, value: any) => {
      // Date オブジェクトの処理
      if (value instanceof Date) {
        return value.toISOString();
      }
      
      // undefined の除去
      if (value === undefined) {
        return null;
      }
      
      // 循環参照の検出
      if (typeof value === 'object' && value !== null) {
        const seen = new WeakSet();
        return JSON.parse(JSON.stringify(value, (k, v) => {
          if (typeof v === 'object' && v !== null) {
            if (seen.has(v)) {
              return '[Circular Reference]';
            }
            seen.add(v);
          }
          return v;
        }));
      }
      
      return replacer ? replacer(key, value) : value;
    };
    
    return JSON.stringify(obj, defaultReplacer, space);
  } catch (error) {
    throw new Error(`JSON serialization failed: ${error.message}`);
  }
}

/**
 * 安全なJSONパース
 */
export function safeJsonParse<T = any>(
  json: string,
  reviver?: (key: string, value: any) => any
): T {
  try {
    const defaultReviver = (key: string, value: any) => {
      // ISO 8601 日時文字列の自動変換
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
        return new Date(value);
      }
      
      return reviver ? reviver(key, value) : value;
    };
    
    return JSON.parse(json, defaultReviver);
  } catch (error) {
    throw new Error(`JSON parsing failed: ${error.message}`);
  }
}

// ==========================================
// 型変換ユーティリティ
// ==========================================

/**
 * 安全な文字列変換
 */
export function safeString(value: unknown, defaultValue: string = ''): string {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  return String(value);
}

/**
 * 安全な数値変換
 */
export function safeNumber(value: unknown, defaultValue: number = 0): number {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * 安全な真偽値変換
 */
export function safeBoolean(value: unknown, defaultValue: boolean = false): boolean {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  
  if (typeof value === 'boolean') {
    return value;
  }
  
  if (typeof value === 'string') {
    const lowered = value.toLowerCase();
    return lowered === 'true' || lowered === '1' || lowered === 'yes';
  }
  
  if (typeof value === 'number') {
    return value !== 0;
  }
  
  return Boolean(value);
}

/**
 * 安全な配列変換
 */
export function safeArray<T>(value: unknown, defaultValue: T[] = []): T[] {
  if (Array.isArray(value)) {
    return value;
  }
  return defaultValue;
}

/**
 * 安全な日時変換
 */
export function safeDateTime(value: unknown, defaultValue?: DateTime): DateTime | undefined {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? defaultValue : date.toISOString();
  }
  
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? defaultValue : value.toISOString();
  }
  
  return defaultValue;
}

// ==========================================
// データマッピング
// ==========================================

/**
 * オブジェクトのマッピング変換
 */
export function mapObject<TSource, TTarget>(
  source: TSource,
  mappingRules: MappingRule<TSource, TTarget>[]
): Partial<TTarget> {
  const result = {} as Partial<TTarget>;
  
  for (const rule of mappingRules) {
    const sourceValue = source[rule.source];
    
    // 必須フィールドのチェック
    if (rule.required && (sourceValue === undefined || sourceValue === null)) {
      if (rule.defaultValue !== undefined) {
        result[rule.target] = rule.defaultValue;
      } else {
        throw new Error(`Required field '${String(rule.source)}' is missing`);
      }
      continue;
    }
    
    // 値の変換
    let targetValue = sourceValue;
    if (rule.transform && sourceValue !== undefined && sourceValue !== null) {
      targetValue = rule.transform(sourceValue);
    }
    
    // デフォルト値の適用
    if (targetValue === undefined && rule.defaultValue !== undefined) {
      targetValue = rule.defaultValue;
    }
    
    if (targetValue !== undefined) {
      result[rule.target] = targetValue;
    }
  }
  
  return result;
}

/**
 * 配列のマッピング変換
 */
export function mapArray<TSource, TTarget>(
  source: TSource[],
  mappingRules: MappingRule<TSource, TTarget>[]
): Partial<TTarget>[] {
  return source.map(item => mapObject(item, mappingRules));
}

// ==========================================
// TRPG特有のデータ変換
// ==========================================

/**
 * BaseStatsの正規化
 */
export function normalizeBaseStats(stats: Partial<BaseStats>): BaseStats {
  return {
    strength: safeNumber(stats.strength, 10),
    dexterity: safeNumber(stats.dexterity, 10),
    constitution: safeNumber(stats.constitution, 10),
    intelligence: safeNumber(stats.intelligence, 10),
    wisdom: safeNumber(stats.wisdom, 10),
    charisma: safeNumber(stats.charisma, 10)
  };
}

/**
 * ダイス記法の正規化
 */
export function normalizeDiceNotation(dice: string): string {
  const cleaned = dice.trim().toLowerCase().replace(/\s+/g, '');
  
  // 基本形式の検証
  const dicePattern = /^(\d+)d(\d+)([+-]\d+)?$/;
  const match = cleaned.match(dicePattern);
  
  if (!match) {
    throw new Error(`Invalid dice notation: ${dice}`);
  }
  
  const [, count, sides, modifier] = match;
  return `${count}d${sides}${modifier || ''}`;
}

/**
 * IDの正規化
 */
export function normalizeId(id: unknown): ID {
  const strId = safeString(id);
  if (!strId || strId.trim().length === 0) {
    throw new Error('ID cannot be empty');
  }
  return strId.trim();
}

// ==========================================
// API レスポンス変換
// ==========================================

/**
 * データベースレコードからTRPGCharacterへの変換
 */
export function dbRecordToTRPGCharacter(record: any): TRPGCharacter {
  return {
    id: normalizeId(record.id),
    campaignId: normalizeId(record.campaign_id || record.campaignId),
    name: safeString(record.name),
    characterType: 'PC',
    description: safeString(record.description),
    age: safeNumber(record.age),
    race: safeString(record.race),
    characterClass: safeString(record.character_class || record.characterClass),
    background: safeString(record.background),
    playerId: record.player_id || record.playerId,
    appearance: safeString(record.appearance),
    baseStats: normalizeBaseStats(record.base_stats || record.baseStats || {}),
    derivedStats: {
      hitPoints: safeNumber(record.hit_points || record.hitPoints, 10),
      maxHitPoints: safeNumber(record.max_hit_points || record.maxHitPoints, 10),
      magicPoints: safeNumber(record.magic_points || record.magicPoints, 0),
      maxMagicPoints: safeNumber(record.max_magic_points || record.maxMagicPoints, 0),
      armorClass: safeNumber(record.armor_class || record.armorClass, 10),
      initiative: safeNumber(record.initiative, 0),
      speed: safeNumber(record.speed, 30)
    },
    level: safeNumber(record.level, 1),
    experience: safeNumber(record.experience, 0),
    skills: safeArray(record.skills, []),
    feats: safeArray(record.feats, []),
    equipment: safeArray(record.equipment, []),
    statusEffects: safeArray(record.status_effects || record.statusEffects, []),
    currentLocationId: record.current_location_id || record.currentLocationId,
    createdAt: safeDateTime(record.created_at || record.createdAt) || new Date().toISOString(),
    updatedAt: safeDateTime(record.updated_at || record.updatedAt) || new Date().toISOString()
  };
}

/**
 * TRPGCharacterからデータベースレコードへの変換
 */
export function trpgCharacterToDbRecord(character: TRPGCharacter): Record<string, any> {
  return {
    id: character.id,
    campaign_id: character.campaignId,
    name: character.name,
    character_type: character.characterType,
    description: character.description,
    age: character.age,
    race: character.race,
    character_class: character.characterClass,
    background: character.background,
    player_id: character.playerId,
    appearance: character.appearance,
    base_stats: character.baseStats,
    derived_stats: character.derivedStats,
    level: character.level,
    experience: character.experience,
    skills: character.skills,
    feats: character.feats,
    equipment: character.equipment,
    status_effects: character.statusEffects,
    current_location_id: character.currentLocationId,
    created_at: character.createdAt,
    updated_at: character.updatedAt
  };
}

/**
 * エラーレスポンスの標準化
 */
export function standardizeErrorResponse(
  error: unknown,
  context?: string
): APIResponse<never> {
  let errorMessage = 'Unknown error occurred';
  let validationErrors: ValidationError[] = [];
  
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }
  
  if (context) {
    errorMessage = `${context}: ${errorMessage}`;
  }
  
  return {
    success: false,
    error: errorMessage,
    errors: validationErrors.length > 0 ? validationErrors : undefined,
    timestamp: new Date().toISOString()
  };
}

// ==========================================
// バッチ処理ユーティリティ
// ==========================================

/**
 * バッチ処理でデータを変換
 */
export async function transformBatch<TSource, TTarget>(
  items: TSource[],
  transformer: (item: TSource) => Promise<TTarget> | TTarget,
  options: {
    batchSize?: number;
    onProgress?: (completed: number, total: number) => void;
    onError?: (error: Error, item: TSource, index: number) => void;
  } = {}
): Promise<TTarget[]> {
  const { batchSize = 100, onProgress, onError } = options;
  const results: TTarget[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map(async (item, index) => {
      try {
        return await transformer(item);
      } catch (error) {
        if (onError) {
          onError(error as Error, item, i + index);
        }
        throw error;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    if (onProgress) {
      onProgress(Math.min(i + batchSize, items.length), items.length);
    }
  }
  
  return results;
}

/**
 * 条件付きデータ変換
 */
export function conditionalTransform<T>(
  data: T,
  conditions: Array<{
    condition: (data: T) => boolean;
    transform: (data: T) => T;
  }>
): T {
  let result = data;
  
  for (const { condition, transform } of conditions) {
    if (condition(result)) {
      result = transform(result);
    }
  }
  
  return result;
}

// ==========================================
// デバッグとロギング用の変換
// ==========================================

/**
 * オブジェクトの差分検出
 */
export function findObjectDifferences<T extends Record<string, any>>(
  obj1: T,
  obj2: T,
  path: string = ''
): Array<{ path: string; oldValue: any; newValue: any }> {
  const differences: Array<{ path: string; oldValue: any; newValue: any }> = [];
  
  const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
  
  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key;
    const val1 = obj1[key];
    const val2 = obj2[key];
    
    if (val1 === val2) {
      continue;
    }
    
    if (typeof val1 === 'object' && typeof val2 === 'object' && val1 !== null && val2 !== null) {
      differences.push(...findObjectDifferences(val1, val2, currentPath));
    } else {
      differences.push({
        path: currentPath,
        oldValue: val1,
        newValue: val2
      });
    }
  }
  
  return differences;
}

/**
 * データサイズの推定
 */
export function estimateDataSize(data: any): number {
  try {
    return new Blob([JSON.stringify(data)]).size;
  } catch {
    // フォールバック：文字列長による概算
    return JSON.stringify(data).length * 2; // UTF-16 換算
  }
}