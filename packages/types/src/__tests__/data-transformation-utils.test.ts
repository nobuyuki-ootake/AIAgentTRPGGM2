/**
 * データ変換ユーティリティの包括的テスト
 * Data Transformation Utilities Comprehensive Tests
 * 
 * テスト対象:
 * - JSON シリアライゼーション/デシリアライゼーション
 * - 型変換とキャスト
 * - データマッピングと変換
 * - TRPG特有のデータ変換
 * - API レスポンス変換
 * - バッチ処理とエラーハンドリング
 */

import type {
  BaseStats,
  TRPGCharacter,
  APIResponse,
  ValidationError
} from '../index';
import {
  safeJsonStringify,
  safeJsonParse,
  safeString,
  safeNumber,
  safeBoolean,
  safeArray,
  safeDateTime,
  mapObject,
  mapArray,
  normalizeBaseStats,
  normalizeDiceNotation,
  normalizeId,
  dbRecordToTRPGCharacter,
  trpgCharacterToDbRecord,
  standardizeErrorResponse,
  transformBatch,
  conditionalTransform,
  findObjectDifferences,
  estimateDataSize,
  type MappingRule,
  type DataTransformOptions
} from '../utils/data-transformation';

// ==========================================
// テストデータファクトリー
// ==========================================

function createTestCharacter(): TRPGCharacter {
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
    baseStats: {
      strength: 16,
      dexterity: 14,
      constitution: 15,
      intelligence: 12,
      wisdom: 13,
      charisma: 10
    },
    derivedStats: {
      hitPoints: 30,
      maxHitPoints: 30,
      magicPoints: 0,
      maxMagicPoints: 0,
      armorClass: 16,
      initiative: 2,
      speed: 30
    },
    level: 3,
    experience: 900,
    skills: [],
    feats: [],
    equipment: [],
    statusEffects: [],
    currentLocationId: 'location_001',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  };
}

function createDbRecord(): Record<string, any> {
  return {
    id: 'char_001',
    campaign_id: 'campaign_001',
    name: 'Test Hero',
    character_type: 'PC',
    description: 'A brave test character',
    age: 25,
    race: 'Human',
    character_class: 'Fighter',
    background: 'Soldier',
    player_id: 'player_001',
    appearance: 'Tall and strong',
    base_stats: {
      strength: 16,
      dexterity: 14,
      constitution: 15,
      intelligence: 12,
      wisdom: 13,
      charisma: 10
    },
    hit_points: 30,
    max_hit_points: 30,
    magic_points: 0,
    max_magic_points: 0,
    armor_class: 16,
    initiative: 2,
    speed: 30,
    level: 3,
    experience: 900,
    skills: [],
    feats: [],
    equipment: [],
    status_effects: [],
    current_location_id: 'location_001',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  };
}

// ==========================================
// テストスイート
// ==========================================

describe('データ変換ユーティリティの包括的テスト', () => {

  describe('JSON シリアライゼーション', () => {
    test('safeJsonStringify が正常なオブジェクトをシリアライズする', () => {
      const obj = { name: 'test', value: 123, active: true };
      const result = safeJsonStringify(obj);
      
      expect(result).toBe('{"name":"test","value":123,"active":true}');
      expect(() => JSON.parse(result)).not.toThrow();
    });

    test('safeJsonStringify が Date オブジェクトを ISO 文字列に変換する', () => {
      const obj = { 
        name: 'test', 
        createdAt: new Date('2024-01-01T00:00:00.000Z')
      };
      const result = safeJsonStringify(obj);
      
      expect(result).toContain('"createdAt":"2024-01-01T00:00:00.000Z"');
    });

    test('safeJsonStringify が undefined を null に変換する', () => {
      const obj = { name: 'test', value: undefined };
      const result = safeJsonStringify(obj);
      
      expect(result).toContain('"value":null');
    });

    test('safeJsonStringify が循環参照を検出する', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;
      
      const result = safeJsonStringify(obj);
      expect(result).toContain('[Circular Reference]');
    });

    test('safeJsonStringify が無効なオブジェクトでエラーを投げる', () => {
      const invalidObj = { toString: () => { throw new Error('Cannot convert'); } };
      
      expect(() => safeJsonStringify(invalidObj)).toThrow('JSON serialization failed');
    });

    test('safeJsonParse が正常な JSON をパースする', () => {
      const json = '{"name":"test","value":123,"active":true}';
      const result = safeJsonParse(json);
      
      expect(result).toEqual({ name: 'test', value: 123, active: true });
    });

    test('safeJsonParse が ISO 日時文字列を Date オブジェクトに変換する', () => {
      const json = '{"name":"test","createdAt":"2024-01-01T00:00:00.000Z"}';
      const result = safeJsonParse(json);
      
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.createdAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });

    test('safeJsonParse が無効な JSON でエラーを投げる', () => {
      const invalidJson = '{"name": invalid}';
      
      expect(() => safeJsonParse(invalidJson)).toThrow('JSON parsing failed');
    });

    test('カスタム replacer と reviver の動作', () => {
      const obj = { secret: 'hidden', public: 'visible' };
      
      // replacer でシークレット情報を除外
      const serialized = safeJsonStringify(obj, (key, value) => {
        return key === 'secret' ? undefined : value;
      });
      
      expect(serialized).not.toContain('hidden');
      expect(serialized).toContain('visible');
      
      // reviver でデフォルト値を設定
      const parsed = safeJsonParse(serialized, (key, value) => {
        return key === 'secret' ? 'default' : value;
      });
      
      expect(parsed.secret).toBe('default');
    });
  });

  describe('型変換ユーティリティ', () => {
    describe('safeString', () => {
      test('文字列をそのまま返す', () => {
        expect(safeString('hello')).toBe('hello');
      });

      test('数値を文字列に変換する', () => {
        expect(safeString(123)).toBe('123');
      });

      test('null/undefined にデフォルト値を適用する', () => {
        expect(safeString(null)).toBe('');
        expect(safeString(undefined)).toBe('');
        expect(safeString(null, 'default')).toBe('default');
      });

      test('オブジェクトを文字列に変換する', () => {
        expect(safeString({ name: 'test' })).toBe('[object Object]');
      });
    });

    describe('safeNumber', () => {
      test('数値をそのまま返す', () => {
        expect(safeNumber(123)).toBe(123);
        expect(safeNumber(123.45)).toBe(123.45);
      });

      test('文字列数値を数値に変換する', () => {
        expect(safeNumber('123')).toBe(123);
        expect(safeNumber('123.45')).toBe(123.45);
      });

      test('無効な値にデフォルト値を適用する', () => {
        expect(safeNumber(null)).toBe(0);
        expect(safeNumber(undefined)).toBe(0);
        expect(safeNumber('invalid')).toBe(0);
        expect(safeNumber(NaN)).toBe(0);
        expect(safeNumber('invalid', 999)).toBe(999);
      });

      test('特殊な数値を処理する', () => {
        expect(safeNumber(Infinity)).toBe(Infinity);
        expect(safeNumber(-Infinity)).toBe(-Infinity);
      });
    });

    describe('safeBoolean', () => {
      test('真偽値をそのまま返す', () => {
        expect(safeBoolean(true)).toBe(true);
        expect(safeBoolean(false)).toBe(false);
      });

      test('文字列を真偽値に変換する', () => {
        expect(safeBoolean('true')).toBe(true);
        expect(safeBoolean('TRUE')).toBe(true);
        expect(safeBoolean('1')).toBe(true);
        expect(safeBoolean('yes')).toBe(true);
        expect(safeBoolean('false')).toBe(false);
        expect(safeBoolean('0')).toBe(false);
        expect(safeBoolean('no')).toBe(false);
        expect(safeBoolean('other')).toBe(false);
      });

      test('数値を真偽値に変換する', () => {
        expect(safeBoolean(1)).toBe(true);
        expect(safeBoolean(-1)).toBe(true);
        expect(safeBoolean(0)).toBe(false);
      });

      test('null/undefined にデフォルト値を適用する', () => {
        expect(safeBoolean(null)).toBe(false);
        expect(safeBoolean(undefined)).toBe(false);
        expect(safeBoolean(null, true)).toBe(true);
      });
    });

    describe('safeArray', () => {
      test('配列をそのまま返す', () => {
        const arr = [1, 2, 3];
        expect(safeArray(arr)).toBe(arr);
      });

      test('非配列にデフォルト値を適用する', () => {
        expect(safeArray(null)).toEqual([]);
        expect(safeArray(undefined)).toEqual([]);
        expect(safeArray('string')).toEqual([]);
        expect(safeArray(123)).toEqual([]);
        expect(safeArray(null, ['default'])).toEqual(['default']);
      });
    });

    describe('safeDateTime', () => {
      test('有効な日時文字列を変換する', () => {
        const dateStr = '2024-01-01T00:00:00.000Z';
        expect(safeDateTime(dateStr)).toBe(dateStr);
      });

      test('Date オブジェクトを ISO 文字列に変換する', () => {
        const date = new Date('2024-01-01T00:00:00.000Z');
        expect(safeDateTime(date)).toBe('2024-01-01T00:00:00.000Z');
      });

      test('無効な日時にデフォルト値を適用する', () => {
        expect(safeDateTime(null)).toBeUndefined();
        expect(safeDateTime(undefined)).toBeUndefined();
        expect(safeDateTime('invalid')).toBeUndefined();
        expect(safeDateTime(null, '2024-01-01T00:00:00.000Z')).toBe('2024-01-01T00:00:00.000Z');
      });

      test('無効な Date オブジェクトを処理する', () => {
        const invalidDate = new Date('invalid');
        expect(safeDateTime(invalidDate)).toBeUndefined();
      });
    });
  });

  describe('データマッピング', () => {
    interface SourceType {
      firstName: string;
      lastName: string;
      age: number;
      email?: string;
    }

    interface TargetType {
      fullName: string;
      userAge: number;
      contactEmail: string;
      isAdult: boolean;
    }

    test('mapObject が基本的なマッピングを実行する', () => {
      const source: SourceType = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        email: 'john@example.com'
      };

      const mappingRules: MappingRule<SourceType, TargetType>[] = [
        { 
          source: 'firstName', 
          target: 'fullName',
          transform: (value) => `${source.firstName} ${source.lastName}`
        },
        { source: 'age', target: 'userAge' },
        { source: 'email', target: 'contactEmail', defaultValue: 'no-email@example.com' }
      ];

      const result = mapObject(source, mappingRules);

      expect(result.fullName).toBe('John Doe');
      expect(result.userAge).toBe(30);
      expect(result.contactEmail).toBe('john@example.com');
    });

    test('mapObject がデフォルト値を適用する', () => {
      const source: SourceType = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30
        // email is missing
      };

      const mappingRules: MappingRule<SourceType, TargetType>[] = [
        { source: 'firstName', target: 'fullName' },
        { source: 'email', target: 'contactEmail', defaultValue: 'no-email@example.com' }
      ];

      const result = mapObject(source, mappingRules);

      expect(result.contactEmail).toBe('no-email@example.com');
    });

    test('mapObject が必須フィールドのエラーを投げる', () => {
      const source: SourceType = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30
      };

      const mappingRules: MappingRule<SourceType, TargetType>[] = [
        { source: 'email', target: 'contactEmail', required: true }
      ];

      expect(() => mapObject(source, mappingRules)).toThrow("Required field 'email' is missing");
    });

    test('mapArray が配列全体をマッピングする', () => {
      const sources: SourceType[] = [
        { firstName: 'John', lastName: 'Doe', age: 30 },
        { firstName: 'Jane', lastName: 'Smith', age: 25 }
      ];

      const mappingRules: MappingRule<SourceType, TargetType>[] = [
        { source: 'age', target: 'userAge' },
        { source: 'email', target: 'contactEmail', defaultValue: 'unknown@example.com' }
      ];

      const results = mapArray(sources, mappingRules);

      expect(results).toHaveLength(2);
      expect(results[0].userAge).toBe(30);
      expect(results[1].userAge).toBe(25);
      expect(results[0].contactEmail).toBe('unknown@example.com');
    });
  });

  describe('TRPG特有のデータ変換', () => {
    test('normalizeBaseStats が部分的な stats を正規化する', () => {
      const partialStats = {
        strength: 16,
        dexterity: 14
        // 他の値は欠如
      };

      const normalized = normalizeBaseStats(partialStats);

      expect(normalized).toEqual({
        strength: 16,
        dexterity: 14,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10
      });
    });

    test('normalizeBaseStats が無効な値をデフォルト値に変換する', () => {
      const invalidStats = {
        strength: 'invalid' as any,
        dexterity: null as any,
        constitution: undefined as any
      };

      const normalized = normalizeBaseStats(invalidStats);

      expect(normalized.strength).toBe(10);
      expect(normalized.dexterity).toBe(10);
      expect(normalized.constitution).toBe(10);
    });

    test('normalizeDiceNotation が有効なダイス記法を正規化する', () => {
      expect(normalizeDiceNotation('1d20')).toBe('1d20');
      expect(normalizeDiceNotation('2d6+3')).toBe('2d6+3');
      expect(normalizeDiceNotation('  3D8 - 1  ')).toBe('3d8-1');
      expect(normalizeDiceNotation('1D20')).toBe('1d20');
    });

    test('normalizeDiceNotation が無効なダイス記法でエラーを投げる', () => {
      expect(() => normalizeDiceNotation('invalid')).toThrow('Invalid dice notation');
      expect(() => normalizeDiceNotation('d20')).toThrow('Invalid dice notation');
      expect(() => normalizeDiceNotation('1d')).toThrow('Invalid dice notation');
      expect(() => normalizeDiceNotation('1d20x')).toThrow('Invalid dice notation');
    });

    test('normalizeId が有効な ID を正規化する', () => {
      expect(normalizeId('  valid_id  ')).toBe('valid_id');
      expect(normalizeId('test-123')).toBe('test-123');
    });

    test('normalizeId が無効な ID でエラーを投げる', () => {
      expect(() => normalizeId('')).toThrow('ID cannot be empty');
      expect(() => normalizeId('   ')).toThrow('ID cannot be empty');
      expect(() => normalizeId(null)).toThrow('ID cannot be empty');
      expect(() => normalizeId(undefined)).toThrow('ID cannot be empty');
    });
  });

  describe('データベース変換', () => {
    test('dbRecordToTRPGCharacter が DB レコードを TRPG キャラクターに変換する', () => {
      const dbRecord = createDbRecord();
      const character = dbRecordToTRPGCharacter(dbRecord);

      expect(character.id).toBe('char_001');
      expect(character.name).toBe('Test Hero');
      expect(character.characterType).toBe('PC');
      expect(character.baseStats.strength).toBe(16);
      expect(character.derivedStats.hitPoints).toBe(30);
    });

    test('dbRecordToTRPGCharacter がキャメルケースとスネークケースの両方に対応する', () => {
      const dbRecord = {
        id: 'char_001',
        campaignId: 'campaign_001', // キャメルケース
        campaign_id: 'campaign_002', // スネークケース（優先される）
        name: 'Test',
        hitPoints: 20, // キャメルケース
        hit_points: 25 // スネークケース（優先される）
      };

      const character = dbRecordToTRPGCharacter(dbRecord);

      expect(character.campaignId).toBe('campaign_002'); // スネークケースが優先
      expect(character.derivedStats.hitPoints).toBe(25); // スネークケースが優先
    });

    test('dbRecordToTRPGCharacter が欠損データにデフォルト値を適用する', () => {
      const minimalRecord = {
        id: 'char_001',
        name: 'Minimal Character'
      };

      const character = dbRecordToTRPGCharacter(minimalRecord);

      expect(character.baseStats).toEqual({
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10
      });
      expect(character.level).toBe(1);
      expect(character.experience).toBe(0);
    });

    test('trpgCharacterToDbRecord が TRPG キャラクターを DB レコードに変換する', () => {
      const character = createTestCharacter();
      const dbRecord = trpgCharacterToDbRecord(character);

      expect(dbRecord.id).toBe('char_001');
      expect(dbRecord.campaign_id).toBe('campaign_001');
      expect(dbRecord.character_type).toBe('PC');
      expect(dbRecord.base_stats.strength).toBe(16);
      expect(dbRecord.hit_points).toBe(30);
    });

    test('DB 変換の往復で データが保持される', () => {
      const originalCharacter = createTestCharacter();
      const dbRecord = trpgCharacterToDbRecord(originalCharacter);
      const restoredCharacter = dbRecordToTRPGCharacter(dbRecord);

      expect(restoredCharacter).toEqual(originalCharacter);
    });
  });

  describe('エラーレスポンス標準化', () => {
    test('standardizeErrorResponse が Error オブジェクトを処理する', () => {
      const error = new Error('Test error message');
      const response = standardizeErrorResponse(error, 'Database operation');

      expect(response.success).toBe(false);
      expect(response.error).toBe('Database operation: Test error message');
      expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('standardizeErrorResponse が文字列エラーを処理する', () => {
      const response = standardizeErrorResponse('Simple error message');

      expect(response.success).toBe(false);
      expect(response.error).toBe('Simple error message');
    });

    test('standardizeErrorResponse が不明なエラーを処理する', () => {
      const response = standardizeErrorResponse({ unknown: 'object' });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Unknown error occurred');
    });

    test('standardizeErrorResponse がコンテキストを追加する', () => {
      const response = standardizeErrorResponse('Base error', 'User validation');

      expect(response.error).toBe('User validation: Base error');
    });
  });

  describe('バッチ処理', () => {
    test('transformBatch が同期変換を実行する', async () => {
      const items = [1, 2, 3, 4, 5];
      const transformer = (item: number) => item * 2;

      const results = await transformBatch(items, transformer);

      expect(results).toEqual([2, 4, 6, 8, 10]);
    });

    test('transformBatch が非同期変換を実行する', async () => {
      const items = ['a', 'b', 'c'];
      const transformer = async (item: string) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return item.toUpperCase();
      };

      const results = await transformBatch(items, transformer);

      expect(results).toEqual(['A', 'B', 'C']);
    });

    test('transformBatch がバッチサイズを考慮する', async () => {
      const items = [1, 2, 3, 4, 5];
      let batchCount = 0;
      
      const transformer = (item: number) => {
        batchCount++;
        return item * 2;
      };

      await transformBatch(items, transformer, { batchSize: 2 });

      expect(batchCount).toBe(5); // 全て処理される
    });

    test('transformBatch が進捗コールバックを呼び出す', async () => {
      const items = [1, 2, 3, 4, 5];
      const progressCalls: Array<{ completed: number; total: number }> = [];
      
      const transformer = (item: number) => item * 2;
      
      await transformBatch(items, transformer, {
        batchSize: 2,
        onProgress: (completed, total) => {
          progressCalls.push({ completed, total });
        }
      });

      expect(progressCalls).toHaveLength(3); // バッチが3回
      expect(progressCalls[0]).toEqual({ completed: 2, total: 5 });
      expect(progressCalls[1]).toEqual({ completed: 4, total: 5 });
      expect(progressCalls[2]).toEqual({ completed: 5, total: 5 });
    });

    test('transformBatch がエラーを適切に処理する', async () => {
      const items = [1, 2, 3];
      const errors: Array<{ error: Error; item: number; index: number }> = [];
      
      const transformer = (item: number) => {
        if (item === 2) throw new Error(`Error processing ${item}`);
        return item * 2;
      };

      await expect(
        transformBatch(items, transformer, {
          onError: (error, item, index) => {
            errors.push({ error, item, index });
          }
        })
      ).rejects.toThrow('Error processing 2');

      expect(errors).toHaveLength(1);
      expect(errors[0].item).toBe(2);
      expect(errors[0].index).toBe(1);
    });
  });

  describe('条件付き変換', () => {
    test('conditionalTransform が条件に基づいて変換を適用する', () => {
      const data = { value: 5, type: 'number' };
      
      const result = conditionalTransform(data, [
        {
          condition: (d) => d.type === 'number' && d.value < 10,
          transform: (d) => ({ ...d, value: d.value * 2 })
        },
        {
          condition: (d) => d.value > 5,
          transform: (d) => ({ ...d, processed: true })
        }
      ]);

      expect(result).toEqual({
        value: 10,
        type: 'number',
        processed: true
      });
    });

    test('conditionalTransform が複数の変換を順次適用する', () => {
      const data = { count: 1 };
      
      const result = conditionalTransform(data, [
        {
          condition: (d) => d.count === 1,
          transform: (d) => ({ ...d, count: d.count + 1 })
        },
        {
          condition: (d) => d.count === 2,
          transform: (d) => ({ ...d, doubled: true })
        }
      ]);

      expect(result).toEqual({
        count: 2,
        doubled: true
      });
    });

    test('conditionalTransform が条件に合わない場合は変換しない', () => {
      const data = { value: 10, type: 'text' };
      
      const result = conditionalTransform(data, [
        {
          condition: (d) => d.type === 'number',
          transform: (d) => ({ ...d, processed: true })
        }
      ]);

      expect(result).toEqual(data); // 変更されない
    });
  });

  describe('デバッグユーティリティ', () => {
    test('findObjectDifferences がオブジェクトの差分を検出する', () => {
      const obj1 = {
        name: 'John',
        age: 30,
        address: {
          city: 'Tokyo',
          country: 'Japan'
        }
      };

      const obj2 = {
        name: 'John',
        age: 31,
        address: {
          city: 'Osaka',
          country: 'Japan'
        }
      };

      const differences = findObjectDifferences(obj1, obj2);

      expect(differences).toHaveLength(2);
      expect(differences).toContainEqual({
        path: 'age',
        oldValue: 30,
        newValue: 31
      });
      expect(differences).toContainEqual({
        path: 'address.city',
        oldValue: 'Tokyo',
        newValue: 'Osaka'
      });
    });

    test('findObjectDifferences が新しいプロパティと削除されたプロパティを検出する', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, c: 3 };

      const differences = findObjectDifferences(obj1, obj2);

      expect(differences).toContainEqual({
        path: 'b',
        oldValue: 2,
        newValue: undefined
      });
      expect(differences).toContainEqual({
        path: 'c',
        oldValue: undefined,
        newValue: 3
      });
    });

    test('estimateDataSize がデータサイズを推定する', () => {
      const smallData = { name: 'test' };
      const largeData = {
        users: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`
        }))
      };

      const smallSize = estimateDataSize(smallData);
      const largeSize = estimateDataSize(largeData);

      expect(smallSize).toBeGreaterThan(0);
      expect(largeSize).toBeGreaterThan(smallSize);
      expect(typeof smallSize).toBe('number');
      expect(typeof largeSize).toBe('number');
    });

    test('estimateDataSize がフォールバック計算を使用する', () => {
      // Blob が利用できない環境をシミュレート
      const originalBlob = global.Blob;
      delete (global as any).Blob;

      const data = { name: 'test', value: 123 };
      const size = estimateDataSize(data);

      expect(size).toBeGreaterThan(0);
      expect(typeof size).toBe('number');

      // Blob を復元
      global.Blob = originalBlob;
    });
  });

  describe('エッジケースと境界値', () => {
    test('空のオブジェクトと配列の処理', () => {
      expect(safeJsonStringify({})).toBe('{}');
      expect(safeJsonStringify([])).toBe('[]');
      expect(safeJsonParse('{}')).toEqual({});
      expect(safeJsonParse('[]')).toEqual([]);
    });

    test('深くネストされたオブジェクトの処理', () => {
      const deepObject = { level1: { level2: { level3: { value: 'deep' } } } };
      const serialized = safeJsonStringify(deepObject);
      const parsed = safeJsonParse(serialized);
      
      expect(parsed.level1.level2.level3.value).toBe('deep');
    });

    test('大きなデータセットでのパフォーマンス', async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item_${i}` }));
      
      const startTime = Date.now();
      const results = await transformBatch(
        largeArray,
        (item) => ({ ...item, processed: true }),
        { batchSize: 100 }
      );
      const endTime = Date.now();

      expect(results).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
    });

    test('Unicode 文字列の処理', () => {
      const unicodeData = {
        japanese: 'こんにちは世界',
        emoji: '🎲🐉⚔️',
        symbols: '←↑→↓'
      };

      const serialized = safeJsonStringify(unicodeData);
      const parsed = safeJsonParse(serialized);

      expect(parsed).toEqual(unicodeData);
    });

    test('特殊な数値の処理', () => {
      const specialNumbers = {
        infinity: Infinity,
        negativeInfinity: -Infinity,
        nan: NaN,
        zero: 0,
        negativeZero: -0
      };

      // JSON では Infinity と NaN は null になる
      const serialized = safeJsonStringify(specialNumbers);
      expect(serialized).toContain('null');
      
      const parsed = safeJsonParse(serialized);
      expect(parsed.infinity).toBeNull();
      expect(parsed.nan).toBeNull();
    });
  });

  describe('型安全性の検証', () => {
    test('型ガードとしての変換関数の動作', () => {
      function processData(data: unknown): string {
        const id = normalizeId(data);
        return `Processed: ${id}`;
      }

      expect(processData('valid_id')).toBe('Processed: valid_id');
      expect(() => processData(null)).toThrow('ID cannot be empty');
    });

    test('型変換での型安全性の保持', () => {
      interface TypedData {
        id: string;
        count: number;
        active: boolean;
        items: string[];
      }

      function createTypedData(raw: Record<string, any>): TypedData {
        return {
          id: normalizeId(raw.id),
          count: safeNumber(raw.count),
          active: safeBoolean(raw.active),
          items: safeArray(raw.items, [])
        };
      }

      const rawData = {
        id: 'test_id',
        count: '42',
        active: 'true',
        items: ['a', 'b', 'c']
      };

      const typedData = createTypedData(rawData);

      expect(typedData.id).toBe('test_id');
      expect(typedData.count).toBe(42);
      expect(typedData.active).toBe(true);
      expect(typedData.items).toEqual(['a', 'b', 'c']);
    });
  });
});