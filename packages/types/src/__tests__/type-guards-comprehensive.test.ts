/**
 * 型ガード関数とバリデーション関数の包括的テスト
 * Type Guards and Validation Functions Comprehensive Tests
 * 
 * テスト対象:
 * - 基本型定義のバリデーション
 * - TRPG特有型のガード関数
 * - 型変換ユーティリティ
 * - 型安全性の保証
 */

import type {
  ID,
  DateTime,
  BaseStats,
  DerivedStats,
  StatusEffect,
  Skill,
  Feat,
  Equipment,
  Weapon,
  Armor,
  APIResponse,
  ValidationError,
  TRPGCharacter,
  TRPGCampaign,
  TRPGSession,
  TRPGEvent,
  SessionState,
  ChatMessage,
  DiceRoll,
  Timeline,
  TimelineEntry,
  DEFAULT_DERIVED_STATS
} from '../index';
import {
  DEFAULT_BASE_STATS
} from '../index';

// ==========================================
// 型ガード関数の実装
// ==========================================

/**
 * ID型のガード関数
 */
export function isValidID(value: unknown): value is ID {
  return typeof value === 'string' && value.length > 0;
}

/**
 * DateTime型のガード関数（ISO 8601形式）
 */
export function isValidDateTime(value: unknown): value is DateTime {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && value === date.toISOString();
}

/**
 * BaseStats型のガード関数
 */
export function isValidBaseStats(value: unknown): value is BaseStats {
  if (!value || typeof value !== 'object') return false;
  const stats = value as Record<string, unknown>;
  
  const requiredFields = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  return requiredFields.every(field => 
    typeof stats[field] === 'number' && 
    stats[field] >= 1 && 
    stats[field] <= 30
  );
}

/**
 * DerivedStats型のガード関数
 */
export function isValidDerivedStats(value: unknown): value is DerivedStats {
  if (!value || typeof value !== 'object') return false;
  const stats = value as Record<string, unknown>;
  
  const requiredFields = ['hitPoints', 'maxHitPoints', 'magicPoints', 'maxMagicPoints', 'armorClass', 'initiative', 'speed'];
  return requiredFields.every(field => typeof stats[field] === 'number' && stats[field] >= 0);
}

/**
 * StatusEffect型のガード関数
 */
export function isValidStatusEffect(value: unknown): value is StatusEffect {
  if (!value || typeof value !== 'object') return false;
  const effect = value as Record<string, unknown>;
  
  return (
    isValidID(effect.id) &&
    typeof effect.name === 'string' &&
    typeof effect.description === 'string' &&
    typeof effect.duration === 'number' &&
    ['buff', 'debuff', 'neutral'].includes(effect.type as string) &&
    typeof effect.effects === 'object' &&
    effect.effects !== null
  );
}

/**
 * Equipment型のガード関数
 */
export function isValidEquipment(value: unknown): value is Equipment {
  if (!value || typeof value !== 'object') return false;
  const equipment = value as Record<string, unknown>;
  
  return (
    isValidID(equipment.id) &&
    typeof equipment.name === 'string' &&
    typeof equipment.description === 'string' &&
    ['weapon', 'armor', 'shield', 'accessory', 'consumable', 'tool'].includes(equipment.type as string) &&
    typeof equipment.weight === 'number' &&
    typeof equipment.cost === 'number' &&
    ['common', 'uncommon', 'rare', 'epic', 'legendary'].includes(equipment.rarity as string) &&
    Array.isArray(equipment.properties) &&
    typeof equipment.isEquipped === 'boolean'
  );
}

/**
 * TRPGCharacter型のガード関数
 */
export function isValidTRPGCharacter(value: unknown): value is TRPGCharacter {
  if (!value || typeof value !== 'object') return false;
  const character = value as Record<string, unknown>;
  
  return (
    isValidID(character.id) &&
    isValidID(character.campaignId) &&
    typeof character.name === 'string' &&
    ['pc', 'npc', 'enemy'].includes(character.type as string) &&
    typeof character.description === 'string' &&
    isValidBaseStats(character.stats) &&
    ['active', 'inactive', 'dead', 'unconscious'].includes(character.status as string) &&
    isValidDateTime(character.createdAt) &&
    isValidDateTime(character.updatedAt)
  );
}

/**
 * APIResponse型のガード関数
 */
export function isValidAPIResponse<T>(value: unknown, dataValidator?: (data: unknown) => data is T): value is APIResponse<T> {
  if (!value || typeof value !== 'object') return false;
  const response = value as Record<string, unknown>;
  
  const isValidResponse = (
    typeof response.success === 'boolean' &&
    isValidDateTime(response.timestamp)
  );
  
  if (!isValidResponse) return false;
  
  // データの存在確認
  if (response.data !== undefined && dataValidator) {
    return dataValidator(response.data);
  }
  
  // エラーの存在確認
  if (response.error !== undefined) {
    return typeof response.error === 'string';
  }
  
  return true;
}

// ==========================================
// テストデータファクトリー
// ==========================================

/**
 * 有効なBaseStatsを作成
 */
function createValidBaseStats(): BaseStats {
  return {
    strength: 14,
    dexterity: 16,
    constitution: 13,
    intelligence: 12,
    wisdom: 15,
    charisma: 10
  };
}

/**
 * 有効なDerivedStatsを作成
 */
function createValidDerivedStats(): DerivedStats {
  return {
    hitPoints: 25,
    maxHitPoints: 30,
    magicPoints: 10,
    maxMagicPoints: 15,
    armorClass: 16,
    initiative: 3,
    speed: 30
  };
}

/**
 * 有効なStatusEffectを作成
 */
function createValidStatusEffect(): StatusEffect {
  return {
    id: 'status_001',
    name: 'Blessing',
    description: 'Divine protection increases all abilities',
    duration: 10,
    type: 'buff',
    effects: {
      strength: 2,
      wisdom: 1
    }
  };
}

/**
 * 有効なEquipmentを作成
 */
function createValidEquipment(): Equipment {
  return {
    id: 'equipment_001',
    name: 'Iron Sword',
    description: 'A well-crafted iron sword',
    type: 'weapon',
    weight: 3,
    cost: 50,
    rarity: 'common',
    properties: ['martial', 'versatile'],
    isEquipped: true
  };
}

/**
 * 有効なTRPGCharacterを作成
 */
function createValidTRPGCharacter(): TRPGCharacter {
  return {
    id: 'char_001',
    campaignId: 'campaign_001',
    name: 'Test Hero',
    characterType: 'PC',
    description: 'A brave test character',
    age: 25,
    race: 'Human',
    characterClass: 'Fighter',
    background: 'Soldier',
    playerId: 'player_001',
    appearance: 'Tall and strong',
    baseStats: createValidBaseStats(),
    derivedStats: createValidDerivedStats(),
    level: 3,
    experience: 900,
    skills: [],
    feats: [],
    equipment: [],
    statusEffects: [],
    currentLocationId: 'location_001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// ==========================================
// テストスイート
// ==========================================

describe('型ガード関数の包括的テスト', () => {
  describe('isValidID', () => {
    test('有効なIDを正しく識別する', () => {
      expect(isValidID('valid_id')).toBe(true);
      expect(isValidID('test-123')).toBe(true);
      expect(isValidID('a')).toBe(true);
    });

    test('無効なIDを正しく拒否する', () => {
      expect(isValidID('')).toBe(false);
      expect(isValidID(null)).toBe(false);
      expect(isValidID(undefined)).toBe(false);
      expect(isValidID(123)).toBe(false);
      expect(isValidID({})).toBe(false);
    });
  });

  describe('isValidDateTime', () => {
    test('有効なISO 8601形式の日時を正しく識別する', () => {
      const validDate = new Date().toISOString();
      expect(isValidDateTime(validDate)).toBe(true);
      expect(isValidDateTime('2024-01-01T00:00:00.000Z')).toBe(true);
    });

    test('無効な日時形式を正しく拒否する', () => {
      expect(isValidDateTime('2024-01-01')).toBe(false);
      expect(isValidDateTime('invalid-date')).toBe(false);
      expect(isValidDateTime(null)).toBe(false);
      expect(isValidDateTime(123)).toBe(false);
      expect(isValidDateTime('2024-13-01T00:00:00.000Z')).toBe(false);
    });
  });

  describe('isValidBaseStats', () => {
    test('有効なBaseStatsを正しく識別する', () => {
      const validStats = createValidBaseStats();
      expect(isValidBaseStats(validStats)).toBe(true);
      
      // 境界値テスト
      expect(isValidBaseStats({
        strength: 1, dexterity: 1, constitution: 1,
        intelligence: 1, wisdom: 1, charisma: 1
      })).toBe(true);
      
      expect(isValidBaseStats({
        strength: 30, dexterity: 30, constitution: 30,
        intelligence: 30, wisdom: 30, charisma: 30
      })).toBe(true);
    });

    test('無効なBaseStatsを正しく拒否する', () => {
      expect(isValidBaseStats(null)).toBe(false);
      expect(isValidBaseStats({})).toBe(false);
      
      // 必須フィールド不足
      expect(isValidBaseStats({
        strength: 10, dexterity: 10 // constitution以下が不足
      })).toBe(false);
      
      // 無効な値の範囲
      expect(isValidBaseStats({
        strength: 0, dexterity: 10, constitution: 10,
        intelligence: 10, wisdom: 10, charisma: 10
      })).toBe(false);
      
      expect(isValidBaseStats({
        strength: 31, dexterity: 10, constitution: 10,
        intelligence: 10, wisdom: 10, charisma: 10
      })).toBe(false);
      
      // 型の不一致
      expect(isValidBaseStats({
        strength: '10', dexterity: 10, constitution: 10,
        intelligence: 10, wisdom: 10, charisma: 10
      })).toBe(false);
    });
  });

  describe('isValidDerivedStats', () => {
    test('有効なDerivedStatsを正しく識別する', () => {
      const validStats = createValidDerivedStats();
      expect(isValidDerivedStats(validStats)).toBe(true);
      
      // ゼロ値テスト
      expect(isValidDerivedStats({
        hitPoints: 0, maxHitPoints: 0, magicPoints: 0,
        maxMagicPoints: 0, armorClass: 0, initiative: 0, speed: 0
      })).toBe(true);
    });

    test('無効なDerivedStatsを正しく拒否する', () => {
      expect(isValidDerivedStats(null)).toBe(false);
      expect(isValidDerivedStats({})).toBe(false);
      
      // 負の値
      expect(isValidDerivedStats({
        hitPoints: -1, maxHitPoints: 10, magicPoints: 0,
        maxMagicPoints: 0, armorClass: 10, initiative: 0, speed: 30
      })).toBe(false);
      
      // 型の不一致
      expect(isValidDerivedStats({
        hitPoints: '10', maxHitPoints: 10, magicPoints: 0,
        maxMagicPoints: 0, armorClass: 10, initiative: 0, speed: 30
      })).toBe(false);
    });
  });

  describe('isValidStatusEffect', () => {
    test('有効なStatusEffectを正しく識別する', () => {
      const validEffect = createValidStatusEffect();
      expect(isValidStatusEffect(validEffect)).toBe(true);
      
      // 永続効果のテスト
      const permanentEffect = {
        ...validEffect,
        duration: -1
      };
      expect(isValidStatusEffect(permanentEffect)).toBe(true);
    });

    test('無効なStatusEffectを正しく拒否する', () => {
      expect(isValidStatusEffect(null)).toBe(false);
      expect(isValidStatusEffect({})).toBe(false);
      
      const invalidEffect = {
        id: 'test',
        name: 'Test',
        description: 'Test effect',
        duration: 5,
        type: 'invalid_type', // 無効なtype
        effects: {}
      };
      expect(isValidStatusEffect(invalidEffect)).toBe(false);
    });
  });

  describe('isValidEquipment', () => {
    test('有効なEquipmentを正しく識別する', () => {
      const validEquipment = createValidEquipment();
      expect(isValidEquipment(validEquipment)).toBe(true);
    });

    test('無効なEquipmentを正しく拒否する', () => {
      expect(isValidEquipment(null)).toBe(false);
      expect(isValidEquipment({})).toBe(false);
      
      const invalidEquipment = {
        id: 'test',
        name: 'Test Item',
        description: 'Test description',
        type: 'invalid_type', // 無効なtype
        weight: 1,
        cost: 10,
        rarity: 'common',
        properties: [],
        isEquipped: false
      };
      expect(isValidEquipment(invalidEquipment)).toBe(false);
    });
  });

  describe('isValidTRPGCharacter', () => {
    test('有効なTRPGCharacterを正しく識別する', () => {
      const validCharacter = createValidTRPGCharacter();
      expect(isValidTRPGCharacter(validCharacter)).toBe(true);
    });

    test('無効なTRPGCharacterを正しく拒否する', () => {
      expect(isValidTRPGCharacter(null)).toBe(false);
      expect(isValidTRPGCharacter({})).toBe(false);
      
      const invalidCharacter = {
        id: 'char_001',
        campaignId: 'campaign_001',
        name: 'Test Character',
        type: 'invalid_type', // 無効なtype
        description: 'Test description',
        stats: createValidBaseStats(),
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      expect(isValidTRPGCharacter(invalidCharacter)).toBe(false);
    });
  });

  describe('isValidAPIResponse', () => {
    test('有効なAPIResponseを正しく識別する', () => {
      const validResponse: APIResponse<string> = {
        success: true,
        data: 'test data',
        timestamp: new Date().toISOString()
      };
      expect(isValidAPIResponse(validResponse)).toBe(true);
      expect(isValidAPIResponse(validResponse, (data): data is string => typeof data === 'string')).toBe(true);
    });

    test('エラーレスポンスを正しく識別する', () => {
      const errorResponse: APIResponse<never> = {
        success: false,
        error: 'Test error message',
        timestamp: new Date().toISOString()
      };
      expect(isValidAPIResponse(errorResponse)).toBe(true);
    });

    test('無効なAPIResponseを正しく拒否する', () => {
      expect(isValidAPIResponse(null)).toBe(false);
      expect(isValidAPIResponse({})).toBe(false);
      
      const invalidResponse = {
        success: 'true', // boolean ではなく string
        timestamp: new Date().toISOString()
      };
      expect(isValidAPIResponse(invalidResponse)).toBe(false);
    });
  });
});

describe('デフォルト値の検証', () => {
  test('DEFAULT_BASE_STATSが有効な値を持つ', () => {
    expect(isValidBaseStats(DEFAULT_BASE_STATS)).toBe(true);
    expect(DEFAULT_BASE_STATS.strength).toBe(10);
    expect(DEFAULT_BASE_STATS.dexterity).toBe(10);
    expect(DEFAULT_BASE_STATS.constitution).toBe(10);
    expect(DEFAULT_BASE_STATS.intelligence).toBe(10);
    expect(DEFAULT_BASE_STATS.wisdom).toBe(10);
    expect(DEFAULT_BASE_STATS.charisma).toBe(10);
  });

  test('DEFAULT_DERIVED_STATSが有効な値を持つ', () => {
    expect(isValidDerivedStats(DEFAULT_DERIVED_STATS)).toBe(true);
    expect(DEFAULT_DERIVED_STATS.hitPoints).toBe(10);
    expect(DEFAULT_DERIVED_STATS.maxHitPoints).toBe(10);
    expect(DEFAULT_DERIVED_STATS.armorClass).toBe(10);
    expect(DEFAULT_DERIVED_STATS.speed).toBe(30);
  });
});

describe('型変換とシリアライゼーション', () => {
  test('BaseStatsのJSON変換が正しく動作する', () => {
    const stats = createValidBaseStats();
    const jsonString = JSON.stringify(stats);
    const parsedStats = JSON.parse(jsonString);
    
    expect(isValidBaseStats(parsedStats)).toBe(true);
    expect(parsedStats).toEqual(stats);
  });

  test('TRPGCharacterのJSON変換が正しく動作する', () => {
    const character = createValidTRPGCharacter();
    const jsonString = JSON.stringify(character);
    const parsedCharacter = JSON.parse(jsonString);
    
    expect(isValidTRPGCharacter(parsedCharacter)).toBe(true);
    expect(parsedCharacter).toEqual(character);
  });

  test('複雑なオブジェクトの深い等価性を確認する', () => {
    const originalStats = createValidBaseStats();
    const clonedStats = { ...originalStats };
    
    expect(clonedStats).toEqual(originalStats);
    expect(clonedStats).not.toBe(originalStats); // 参照が異なることを確認
  });
});

describe('境界値とエッジケースのテスト', () => {
  test('空文字列のIDを拒否する', () => {
    expect(isValidID('')).toBe(false);
    expect(isValidID('   ')).toBe(true); // スペースは有効
  });

  test('極端な日時値を処理する', () => {
    // 最小日時
    expect(isValidDateTime('1970-01-01T00:00:00.000Z')).toBe(true);
    
    // 未来の日時
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 100); // 100年後
    expect(isValidDateTime(futureDate.toISOString())).toBe(true);
  });

  test('能力値の境界値を正確に処理する', () => {
    // 最小値
    const minStats: BaseStats = {
      strength: 1, dexterity: 1, constitution: 1,
      intelligence: 1, wisdom: 1, charisma: 1
    };
    expect(isValidBaseStats(minStats)).toBe(true);
    
    // 最大値
    const maxStats: BaseStats = {
      strength: 30, dexterity: 30, constitution: 30,
      intelligence: 30, wisdom: 30, charisma: 30
    };
    expect(isValidBaseStats(maxStats)).toBe(true);
    
    // 範囲外の値
    const invalidStats = {
      strength: 0, dexterity: 10, constitution: 10,
      intelligence: 10, wisdom: 10, charisma: 10
    };
    expect(isValidBaseStats(invalidStats)).toBe(false);
  });

  test('装備品の重量とコストの境界値', () => {
    const equipment = createValidEquipment();
    
    // ゼロ重量・ゼロコスト
    equipment.weight = 0;
    equipment.cost = 0;
    expect(isValidEquipment(equipment)).toBe(true);
    
    // 負の値（無効）
    equipment.weight = -1;
    expect(isValidEquipment(equipment)).toBe(false);
  });
});

describe('型安全性の実証', () => {
  test('型ガードが型の絞り込みを正しく行う', () => {
    function processUnknownValue(value: unknown): string {
      if (isValidTRPGCharacter(value)) {
        // ここで value は TRPGCharacter 型として扱われる
        return `Character: ${value.name} (${value.type})`;
      }
      return 'Invalid character';
    }
    
    const character = createValidTRPGCharacter();
    expect(processUnknownValue(character)).toBe(`Character: ${character.name} (${character.type})`);
    expect(processUnknownValue(null)).toBe('Invalid character');
    expect(processUnknownValue({})).toBe('Invalid character');
  });

  test('ジェネリック型の型安全性', () => {
    function processAPIResponse<T>(
      response: unknown,
      validator: (data: unknown) => data is T
    ): T | null {
      if (isValidAPIResponse(response, validator)) {
        return response.data || null;
      }
      return null;
    }
    
    const characterResponse = {
      success: true,
      data: createValidTRPGCharacter(),
      timestamp: new Date().toISOString()
    };
    
    const result = processAPIResponse(characterResponse, isValidTRPGCharacter);
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Test Hero');
  });
});