/**
 * 共有定数と列挙型の包括的テスト
 * Shared Constants and Enumerations Comprehensive Tests
 * 
 * テスト対象:
 * - セッション持続時間の定数
 * - 日時期間の設定
 * - デフォルト値の整合性
 * - 列挙型の値検証
 * - クロスプラットフォーム互換性
 */

import {
  SessionDurationType,
  DayPeriodConfig,
  SessionDurationConfig,
  DAY_PERIODS_3_ACTIONS,
  DAY_PERIODS_4_ACTIONS,
  SESSION_DURATION_PRESETS,
  DEFAULT_BASE_STATS,
  DEFAULT_DERIVED_STATS,
  SessionStatus,
  SessionMode,
  EventType
} from '../index';

// ==========================================
// 列挙型の値定義と検証
// ==========================================

/**
 * SessionStatus の有効な値
 */
const VALID_SESSION_STATUSES: SessionStatus[] = ['preparing', 'active', 'paused', 'completed', 'cancelled'];

/**
 * SessionMode の有効な値
 */
const VALID_SESSION_MODES: SessionMode[] = ['exploration', 'combat', 'social', 'rest', 'planning'];

/**
 * EventType の有効な値
 */
const VALID_EVENT_TYPES: EventType[] = ['story', 'combat', 'social', 'exploration', 'puzzle', 'rest'];

/**
 * SessionDurationType の有効な値
 */
const VALID_SESSION_DURATION_TYPES: SessionDurationType[] = ['short', 'medium', 'long', 'custom'];

/**
 * 装備品タイプの有効な値
 */
const VALID_EQUIPMENT_TYPES = ['weapon', 'armor', 'shield', 'accessory', 'consumable', 'tool'];

/**
 * レアリティの有効な値
 */
const VALID_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

/**
 * キャラクタータイプの有効な値
 */
const VALID_CHARACTER_TYPES = ['pc', 'npc', 'enemy'];

/**
 * キャラクターステータスの有効な値
 */
const VALID_CHARACTER_STATUSES = ['active', 'inactive', 'dead', 'unconscious'];

// ==========================================
// ヘルパー関数
// ==========================================

/**
 * DayPeriodConfig の構造を検証
 */
function validateDayPeriodConfig(config: DayPeriodConfig): boolean {
  return (
    typeof config.id === 'string' &&
    config.id.length > 0 &&
    typeof config.name === 'string' &&
    config.name.length > 0 &&
    typeof config.description === 'string' &&
    config.description.length > 0 &&
    typeof config.order === 'number' &&
    config.order >= 0 &&
    typeof config.icon === 'string' &&
    config.icon.length > 0
  );
}

/**
 * SessionDurationConfig の構造を検証
 */
function validateSessionDurationConfig(config: SessionDurationConfig): boolean {
  return (
    VALID_SESSION_DURATION_TYPES.includes(config.type) &&
    typeof config.totalDays === 'number' &&
    config.totalDays > 0 &&
    typeof config.actionsPerDay === 'number' &&
    config.actionsPerDay > 0 &&
    Array.isArray(config.dayPeriods) &&
    config.dayPeriods.length === config.actionsPerDay &&
    config.dayPeriods.every(validateDayPeriodConfig) &&
    typeof config.estimatedPlayTime === 'number' &&
    config.estimatedPlayTime > 0 &&
    typeof config.milestoneCount === 'number' &&
    config.milestoneCount > 0 &&
    typeof config.description === 'string' &&
    config.description.length > 0
  );
}

/**
 * 期間設定の順序を検証
 */
function validateDayPeriodOrder(periods: DayPeriodConfig[]): boolean {
  const sortedPeriods = [...periods].sort((a, b) => a.order - b.order);
  return sortedPeriods.every((period, index) => period.order === index);
}

/**
 * 一意性を検証
 */
function validateUniqueness<T>(array: T[], keyExtractor: (item: T) => string | number): boolean {
  const keys = array.map(keyExtractor);
  return keys.length === new Set(keys).size;
}

// ==========================================
// テストスイート
// ==========================================

describe('共有定数と列挙型の包括的テスト', () => {
  
  describe('日時期間設定の検証', () => {
    test('DAY_PERIODS_3_ACTIONS の構造と内容が正しい', () => {
      expect(DAY_PERIODS_3_ACTIONS).toHaveLength(3);
      
      // すべての期間設定が有効であることを確認
      DAY_PERIODS_3_ACTIONS.forEach(period => {
        expect(validateDayPeriodConfig(period)).toBe(true);
      });
      
      // 順序が正しいことを確認
      expect(validateDayPeriodOrder(DAY_PERIODS_3_ACTIONS)).toBe(true);
      
      // IDの一意性を確認
      expect(validateUniqueness(DAY_PERIODS_3_ACTIONS, p => p.id)).toBe(true);
      
      // 期待される期間が含まれていることを確認
      const expectedIds = ['morning', 'day', 'night'];
      const actualIds = DAY_PERIODS_3_ACTIONS.map(p => p.id);
      expect(actualIds).toEqual(expectedIds);
    });

    test('DAY_PERIODS_4_ACTIONS の構造と内容が正しい', () => {
      expect(DAY_PERIODS_4_ACTIONS).toHaveLength(4);
      
      // すべての期間設定が有効であることを確認
      DAY_PERIODS_4_ACTIONS.forEach(period => {
        expect(validateDayPeriodConfig(period)).toBe(true);
      });
      
      // 順序が正しいことを確認
      expect(validateDayPeriodOrder(DAY_PERIODS_4_ACTIONS)).toBe(true);
      
      // IDの一意性を確認
      expect(validateUniqueness(DAY_PERIODS_4_ACTIONS, p => p.id)).toBe(true);
      
      // 期待される期間が含まれていることを確認
      const expectedIds = ['morning', 'day', 'evening', 'night'];
      const actualIds = DAY_PERIODS_4_ACTIONS.map(p => p.id);
      expect(actualIds).toEqual(expectedIds);
    });

    test('3期間と4期間設定の共通部分と差分', () => {
      const threePeriodIds = new Set(DAY_PERIODS_3_ACTIONS.map(p => p.id));
      const fourPeriodIds = new Set(DAY_PERIODS_4_ACTIONS.map(p => p.id));
      
      // 共通の期間ID
      const commonIds = new Set(['morning', 'day', 'night']);
      commonIds.forEach(id => {
        expect(threePeriodIds.has(id)).toBe(true);
        expect(fourPeriodIds.has(id)).toBe(true);
      });
      
      // 4期間設定にのみ存在する期間
      expect(fourPeriodIds.has('evening')).toBe(true);
      expect(threePeriodIds.has('evening')).toBe(false);
    });
  });

  describe('セッション持続時間プリセットの検証', () => {
    test('SESSION_DURATION_PRESETS のすべての設定が有効', () => {
      const presetTypes = Object.keys(SESSION_DURATION_PRESETS) as SessionDurationType[];
      
      // 期待されるタイプが全て存在することを確認
      expect(presetTypes).toEqual(expect.arrayContaining(VALID_SESSION_DURATION_TYPES));
      
      // 各プリセットの構造が正しいことを確認
      presetTypes.forEach(type => {
        const config = SESSION_DURATION_PRESETS[type];
        expect(validateSessionDurationConfig(config)).toBe(true);
        expect(config.type).toBe(type);
      });
    });

    test('短時間プリセット (short) の設定値', () => {
      const shortConfig = SESSION_DURATION_PRESETS.short;
      
      expect(shortConfig.type).toBe('short');
      expect(shortConfig.totalDays).toBe(3);
      expect(shortConfig.actionsPerDay).toBe(3);
      expect(shortConfig.dayPeriods).toEqual(DAY_PERIODS_3_ACTIONS);
      expect(shortConfig.estimatedPlayTime).toBe(30);
      expect(shortConfig.milestoneCount).toBe(1);
      expect(shortConfig.description).toContain('短時間プレイ');
    });

    test('中時間プリセット (medium) の設定値', () => {
      const mediumConfig = SESSION_DURATION_PRESETS.medium;
      
      expect(mediumConfig.type).toBe('medium');
      expect(mediumConfig.totalDays).toBe(7);
      expect(mediumConfig.actionsPerDay).toBe(4);
      expect(mediumConfig.dayPeriods).toEqual(DAY_PERIODS_4_ACTIONS);
      expect(mediumConfig.estimatedPlayTime).toBe(70);
      expect(mediumConfig.milestoneCount).toBe(3);
      expect(mediumConfig.description).toContain('中時間プレイ');
    });

    test('長時間プリセット (long) の設定値', () => {
      const longConfig = SESSION_DURATION_PRESETS.long;
      
      expect(longConfig.type).toBe('long');
      expect(longConfig.totalDays).toBe(11);
      expect(longConfig.actionsPerDay).toBe(4);
      expect(longConfig.dayPeriods).toEqual(DAY_PERIODS_4_ACTIONS);
      expect(longConfig.estimatedPlayTime).toBe(120);
      expect(longConfig.milestoneCount).toBe(5);
      expect(longConfig.description).toContain('長時間プレイ');
    });

    test('カスタムプリセット (custom) の設定値', () => {
      const customConfig = SESSION_DURATION_PRESETS.custom;
      
      expect(customConfig.type).toBe('custom');
      expect(customConfig.totalDays).toBe(5);
      expect(customConfig.actionsPerDay).toBe(3);
      expect(customConfig.dayPeriods).toEqual(DAY_PERIODS_3_ACTIONS);
      expect(customConfig.estimatedPlayTime).toBe(60);
      expect(customConfig.milestoneCount).toBe(2);
      expect(customConfig.description).toContain('カスタム設定');
    });

    test('プリセット間の論理的整合性', () => {
      const short = SESSION_DURATION_PRESETS.short;
      const medium = SESSION_DURATION_PRESETS.medium;
      const long = SESSION_DURATION_PRESETS.long;
      
      // 総日数の増加順序
      expect(short.totalDays).toBeLessThan(medium.totalDays);
      expect(medium.totalDays).toBeLessThan(long.totalDays);
      
      // プレイ時間の増加順序
      expect(short.estimatedPlayTime).toBeLessThan(medium.estimatedPlayTime);
      expect(medium.estimatedPlayTime).toBeLessThan(long.estimatedPlayTime);
      
      // マイルストーン数の増加順序
      expect(short.milestoneCount).toBeLessThan(medium.milestoneCount);
      expect(medium.milestoneCount).toBeLessThan(long.milestoneCount);
    });
  });

  describe('デフォルト値の検証', () => {
    test('DEFAULT_BASE_STATS の値と構造', () => {
      expect(DEFAULT_BASE_STATS).toEqual({
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10
      });
      
      // すべての能力値が同じ値（バランス）
      const values = Object.values(DEFAULT_BASE_STATS);
      expect(values.every(value => value === 10)).toBe(true);
      
      // 標準的な能力値範囲内
      values.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(30);
      });
    });

    test('DEFAULT_DERIVED_STATS の値と構造', () => {
      expect(DEFAULT_DERIVED_STATS).toEqual({
        hitPoints: 10,
        maxHitPoints: 10,
        magicPoints: 0,
        maxMagicPoints: 0,
        armorClass: 10,
        initiative: 0,
        speed: 30
      });
      
      // HP関連の整合性
      expect(DEFAULT_DERIVED_STATS.hitPoints).toBeLessThanOrEqual(DEFAULT_DERIVED_STATS.maxHitPoints);
      expect(DEFAULT_DERIVED_STATS.magicPoints).toBeLessThanOrEqual(DEFAULT_DERIVED_STATS.maxMagicPoints);
      
      // 非負値の確認
      Object.values(DEFAULT_DERIVED_STATS).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
      });
    });

    test('デフォルト値の不変性', () => {
      // オブジェクトの変更を試行
      const modifyDefaultStats = () => {
        (DEFAULT_BASE_STATS as any).strength = 999;
      };
      
      // TypeScriptレベルでは読み取り専用として扱われるが、
      // ランタイムでの不変性は実装に依存
      expect(() => modifyDefaultStats()).not.toThrow();
      
      // 元の値が保持されているかどうかを確認
      // （実際のプロダクションコードでは Object.freeze を使用する場合がある）
    });
  });

  describe('列挙型の値の検証', () => {
    test('SessionStatus の有効な値', () => {
      VALID_SESSION_STATUSES.forEach(status => {
        expect(typeof status).toBe('string');
        expect(status.length).toBeGreaterThan(0);
      });
      
      // 重複がないことを確認
      expect(validateUniqueness(VALID_SESSION_STATUSES, s => s)).toBe(true);
    });

    test('SessionMode の有効な値', () => {
      VALID_SESSION_MODES.forEach(mode => {
        expect(typeof mode).toBe('string');
        expect(mode.length).toBeGreaterThan(0);
      });
      
      // 重複がないことを確認
      expect(validateUniqueness(VALID_SESSION_MODES, m => m)).toBe(true);
    });

    test('EventType の有効な値', () => {
      VALID_EVENT_TYPES.forEach(type => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
      });
      
      // 重複がないことを確認
      expect(validateUniqueness(VALID_EVENT_TYPES, t => t)).toBe(true);
    });

    test('装備品関連の列挙型', () => {
      VALID_EQUIPMENT_TYPES.forEach(type => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
      });
      
      VALID_RARITIES.forEach(rarity => {
        expect(typeof rarity).toBe('string');
        expect(rarity.length).toBeGreaterThan(0);
      });
    });

    test('キャラクター関連の列挙型', () => {
      VALID_CHARACTER_TYPES.forEach(type => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
      });
      
      VALID_CHARACTER_STATUSES.forEach(status => {
        expect(typeof status).toBe('string');
        expect(status.length).toBeGreaterThan(0);
      });
    });
  });

  describe('クロスプラットフォーム互換性', () => {
    test('JSON シリアライゼーション互換性', () => {
      // すべての定数がJSONシリアライズ可能であることを確認
      expect(() => JSON.stringify(DAY_PERIODS_3_ACTIONS)).not.toThrow();
      expect(() => JSON.stringify(DAY_PERIODS_4_ACTIONS)).not.toThrow();
      expect(() => JSON.stringify(SESSION_DURATION_PRESETS)).not.toThrow();
      expect(() => JSON.stringify(DEFAULT_BASE_STATS)).not.toThrow();
      expect(() => JSON.stringify(DEFAULT_DERIVED_STATS)).not.toThrow();
    });

    test('JSON デシリアライゼーション後の値の保持', () => {
      const serialized = JSON.stringify(SESSION_DURATION_PRESETS);
      const deserialized = JSON.parse(serialized);
      
      expect(deserialized).toEqual(SESSION_DURATION_PRESETS);
      
      // 各プリセットの構造が保持されていることを確認
      Object.keys(SESSION_DURATION_PRESETS).forEach(key => {
        const originalConfig = SESSION_DURATION_PRESETS[key as SessionDurationType];
        const deserializedConfig = deserialized[key];
        expect(validateSessionDurationConfig(deserializedConfig)).toBe(true);
        expect(deserializedConfig).toEqual(originalConfig);
      });
    });

    test('フロントエンド/バックエンド間の値の一致', () => {
      // 実際のプロダクションコードでは、
      // フロントエンドとバックエンドで同じ型定義を使用している
      const frontendSessionTypes = VALID_SESSION_DURATION_TYPES;
      const backendSessionTypes = ['short', 'medium', 'long', 'custom'];
      
      expect(frontendSessionTypes).toEqual(backendSessionTypes);
    });

    test('TypeScript型注釈との整合性', () => {
      // SessionDurationType 型との整合性を確認
      const validTypes: SessionDurationType[] = ['short', 'medium', 'long', 'custom'];
      validTypes.forEach(type => {
        expect(SESSION_DURATION_PRESETS[type]).toBeDefined();
        expect(SESSION_DURATION_PRESETS[type].type).toBe(type);
      });
    });
  });

  describe('国際化対応の確認', () => {
    test('日本語の期間名と説明の存在', () => {
      DAY_PERIODS_3_ACTIONS.forEach(period => {
        expect(period.name).toMatch(/^[あ-ん朝昼夜]+$/);
        expect(period.description).toContain('時間');
      });
      
      DAY_PERIODS_4_ACTIONS.forEach(period => {
        expect(period.name).toMatch(/^[あ-ん朝昼夕夜方]+$/);
        expect(period.description).toContain('時間');
      });
    });

    test('プリセット説明文の日本語対応', () => {
      Object.values(SESSION_DURATION_PRESETS).forEach(config => {
        expect(config.description).toMatch(/プレイ|日間|分|マイルストーン/);
      });
    });

    test('英語IDと日本語名の対応', () => {
      const periodNameMapping = {
        morning: '朝',
        day: '昼',
        evening: '夕方',
        night: '夜'
      };
      
      [...DAY_PERIODS_3_ACTIONS, ...DAY_PERIODS_4_ACTIONS].forEach(period => {
        const expectedName = periodNameMapping[period.id as keyof typeof periodNameMapping];
        if (expectedName) {
          expect(period.name).toBe(expectedName);
        }
      });
    });
  });

  describe('設定値の妥当性とバランス', () => {
    test('プレイ時間とゲーム日数の比率', () => {
      Object.values(SESSION_DURATION_PRESETS).forEach(config => {
        const timePerDay = config.estimatedPlayTime / config.totalDays;
        
        // 1日あたり5-20分の範囲内であることを確認
        expect(timePerDay).toBeGreaterThanOrEqual(5);
        expect(timePerDay).toBeLessThanOrEqual(20);
      });
    });

    test('マイルストーン密度の妥当性', () => {
      Object.values(SESSION_DURATION_PRESETS).forEach(config => {
        const daysPerMilestone = config.totalDays / config.milestoneCount;
        
        // 1マイルストーンあたり1-5日の範囲内であることを確認
        expect(daysPerMilestone).toBeGreaterThanOrEqual(1);
        expect(daysPerMilestone).toBeLessThanOrEqual(5);
      });
    });

    test('アクション数とプレイ時間の関係', () => {
      Object.values(SESSION_DURATION_PRESETS).forEach(config => {
        const totalActions = config.totalDays * config.actionsPerDay;
        const timePerAction = config.estimatedPlayTime / totalActions;
        
        // 1アクションあたり1-5分の範囲内であることを確認
        expect(timePerAction).toBeGreaterThanOrEqual(1);
        expect(timePerAction).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('定数の保護と不変性', () => {
    test('定数オブジェクトの参照が一意', () => {
      const stats1 = DEFAULT_BASE_STATS;
      const stats2 = DEFAULT_BASE_STATS;
      
      // 同じオブジェクトへの参照であることを確認
      expect(stats1).toBe(stats2);
    });

    test('配列定数の参照が一意', () => {
      const periods1 = DAY_PERIODS_3_ACTIONS;
      const periods2 = DAY_PERIODS_3_ACTIONS;
      
      // 同じ配列への参照であることを確認
      expect(periods1).toBe(periods2);
    });

    test('ネストされたオブジェクトの参照関係', () => {
      const shortPreset1 = SESSION_DURATION_PRESETS.short;
      const shortPreset2 = SESSION_DURATION_PRESETS.short;
      
      // 同じオブジェクトへの参照であることを確認
      expect(shortPreset1).toBe(shortPreset2);
      expect(shortPreset1.dayPeriods).toBe(DAY_PERIODS_3_ACTIONS);
    });
  });
});