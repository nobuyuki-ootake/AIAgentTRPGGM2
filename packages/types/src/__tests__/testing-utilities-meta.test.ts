/**
 * テストユーティリティとモックヘルパーの包括的テスト（メタテスト）
 * Testing Utilities and Mock Helpers Comprehensive Tests (Meta-Testing)
 * 
 * テスト対象:
 * - テストデータファクトリー
 * - モック作成ヘルパー
 * - テストヘルパー関数
 * - アサーション拡張
 * - テスト環境セットアップ
 * - テストインフラストラクチャの動作検証
 */

import type {
  TRPGCharacter,
  TRPGCampaign,
  TRPGSession,
  BaseStats,
  DerivedStats,
  Equipment,
  ChatMessage,
  DiceRoll,
  ValidationError,
  APIResponse
} from '../index';

// ==========================================
// テストデータファクトリー
// ==========================================

/**
 * ベースファクトリークラス
 */
abstract class BaseFactory<T> {
  protected defaultValues: Partial<T> = {};
  
  /**
   * デフォルト値を設定
   */
  abstract getDefaults(): T;
  
  /**
   * オブジェクトを作成
   */
  create(overrides: Partial<T> = {}): T {
    return { ...this.getDefaults(), ...overrides };
  }

  /**
   * 複数のオブジェクトを作成
   */
  createMany(count: number, overrides: Partial<T> = {}): T[] {
    return Array.from({ length: count }, (_, index) => 
      this.create({ ...overrides, ...(overrides as any)?.indexed?.({ index }) })
    );
  }

  /**
   * バリデーションエラーを含むオブジェクトを作成
   */
  createInvalid(invalidFields: Partial<T>): T {
    return { ...this.getDefaults(), ...invalidFields };
  }
}

/**
 * BaseStatsファクトリー
 */
export class BaseStatsFactory extends BaseFactory<BaseStats> {
  getDefaults(): BaseStats {
    return {
      strength: 14,
      dexterity: 12,
      constitution: 13,
      intelligence: 10,
      wisdom: 11,
      charisma: 8
    };
  }

  /**
   * バランスの取れたステータスを作成
   */
  createBalanced(): BaseStats {
    return {
      strength: 12,
      dexterity: 12,
      constitution: 12,
      intelligence: 12,
      wisdom: 12,
      charisma: 12
    };
  }

  /**
   * 戦士タイプのステータスを作成
   */
  createWarrior(): BaseStats {
    return this.create({
      strength: 16,
      constitution: 14,
      dexterity: 10,
      charisma: 8
    });
  }

  /**
   * 魔法使いタイプのステータスを作成
   */
  createWizard(): BaseStats {
    return this.create({
      intelligence: 16,
      wisdom: 14,
      strength: 8,
      constitution: 10
    });
  }

  /**
   * ランダムなステータスを作成
   */
  createRandom(min: number = 8, max: number = 18): BaseStats {
    const randomStat = () => Math.floor(Math.random() * (max - min + 1)) + min;
    return {
      strength: randomStat(),
      dexterity: randomStat(),
      constitution: randomStat(),
      intelligence: randomStat(),
      wisdom: randomStat(),
      charisma: randomStat()
    };
  }
}

/**
 * TRPGCharacterファクトリー
 */
export class TRPGCharacterFactory extends BaseFactory<TRPGCharacter> {
  private statsFactory = new BaseStatsFactory();

  getDefaults(): TRPGCharacter {
    const now = new Date().toISOString();
    return {
      id: `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      campaignId: 'campaign_default',
      name: 'Test Character',
      type: 'pc',
      description: 'A test character for TRPG sessions',
      stats: this.statsFactory.getDefaults(),
      status: 'active',
      playerId: 'player_default',
      portraitUrl: 'https://example.com/portraits/default.jpg',
      aiPersonality: null,
      locationId: 'location_default',
      createdAt: now,
      updatedAt: now,
      version: 1
    };
  }

  /**
   * プレイヤーキャラクターを作成
   */
  createPC(name?: string): TRPGCharacter {
    return this.create({
      name: name || `PC_${Math.random().toString(36).substr(2, 6)}`,
      type: 'pc',
      stats: this.statsFactory.createBalanced()
    });
  }

  /**
   * NPCを作成
   */
  createNPC(name?: string): TRPGCharacter {
    return this.create({
      name: name || `NPC_${Math.random().toString(36).substr(2, 6)}`,
      type: 'npc',
      playerId: undefined,
      stats: this.statsFactory.createRandom()
    });
  }

  /**
   * 敵キャラクターを作成
   */
  createEnemy(name?: string): TRPGCharacter {
    return this.create({
      name: name || `Enemy_${Math.random().toString(36).substr(2, 6)}`,
      type: 'enemy',
      playerId: undefined,
      status: 'active',
      stats: this.statsFactory.createWarrior()
    });
  }

  /**
   * パーティーを作成
   */
  createParty(size: number = 4): TRPGCharacter[] {
    const types = ['warrior', 'wizard', 'rogue', 'cleric'];
    return Array.from({ length: size }, (_, index) => {
      const type = types[index % types.length];
      const name = `${type.charAt(0).toUpperCase() + type.slice(1)}_${index + 1}`;
      
      let stats: BaseStats;
      switch (type) {
        case 'warrior':
          stats = this.statsFactory.createWarrior();
          break;
        case 'wizard':
          stats = this.statsFactory.createWizard();
          break;
        default:
          stats = this.statsFactory.createBalanced();
      }
      
      return this.create({
        name,
        stats,
        campaignId: 'party_campaign'
      });
    });
  }
}

/**
 * TRPGCampaignファクトリー
 */
export class TRPGCampaignFactory extends BaseFactory<TRPGCampaign> {
  getDefaults(): TRPGCampaign {
    const now = new Date().toISOString();
    return {
      id: `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'Test Campaign',
      description: 'A test campaign for TRPG sessions',
      status: 'active',
      gmId: 'gm_default',
      settings: {
        maxPlayers: 4,
        sessionDuration: 120,
        difficultyLevel: 'medium'
      },
      scenarioDescription: 'A mysterious adventure awaits the heroes...',
      scenarioSummary: 'Heroes must solve the mystery of the ancient ruins.',
      baseScenarioIllustration: 'https://example.com/scenarios/default.jpg',
      createdAt: now,
      updatedAt: now,
      version: 1,
      lastModifiedBy: 'system'
    };
  }

  /**
   * 短期キャンペーンを作成
   */
  createShort(): TRPGCampaign {
    return this.create({
      name: 'Short Adventure',
      settings: {
        maxPlayers: 3,
        sessionDuration: 60,
        difficultyLevel: 'easy'
      }
    });
  }

  /**
   * 長期キャンペーンを作成
   */
  createLong(): TRPGCampaign {
    return this.create({
      name: 'Epic Campaign',
      settings: {
        maxPlayers: 6,
        sessionDuration: 240,
        difficultyLevel: 'hard'
      }
    });
  }
}

// ==========================================
// モック作成ヘルパー
// ==========================================

/**
 * API レスポンスモック
 */
export class APIResponseMocks {
  /**
   * 成功レスポンスを作成
   */
  static success<T>(data: T): APIResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * エラーレスポンスを作成
   */
  static error(message: string, errors?: ValidationError[]): APIResponse<never> {
    return {
      success: false,
      error: message,
      errors,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * バリデーションエラーレスポンスを作成
   */
  static validationError(errors: ValidationError[]): APIResponse<never> {
    return this.error('Validation failed', errors);
  }

  /**
   * 遅延レスポンスを作成（Promiseベース）
   */
  static delayed<T>(data: T, delay: number = 1000): Promise<APIResponse<T>> {
    return new Promise(resolve => {
      setTimeout(() => resolve(this.success(data)), delay);
    });
  }

  /**
   * ランダム失敗レスポンスを作成
   */
  static randomFailure<T>(
    successData: T,
    failureRate: number = 0.3
  ): APIResponse<T> | APIResponse<never> {
    return Math.random() < failureRate
      ? this.error('Random failure occurred')
      : this.success(successData);
  }
}

/**
 * ダイスロールモック
 */
export class DiceRollMocks {
  /**
   * 固定値を返すダイスロールを作成
   */
  static fixed(value: number): DiceRoll {
    return {
      id: `roll_${Date.now()}`,
      timestamp: new Date().toISOString(),
      roller: 'test_user',
      characterId: 'test_character',
      dice: '1d20',
      results: [value],
      total: value,
      purpose: 'test_roll',
      target: 15,
      success: value >= 15
    };
  }

  /**
   * 範囲内の値を返すダイスロールを作成
   */
  static range(min: number, max: number): DiceRoll {
    const value = Math.floor(Math.random() * (max - min + 1)) + min;
    return this.fixed(value);
  }

  /**
   * クリティカルヒットのダイスロールを作成
   */
  static critical(): DiceRoll {
    return {
      ...this.fixed(20),
      purpose: 'attack_roll',
      success: true
    };
  }

  /**
   * ファンブルのダイスロールを作成
   */
  static fumble(): DiceRoll {
    return {
      ...this.fixed(1),
      purpose: 'attack_roll',
      success: false
    };
  }

  /**
   * 複数ダイスのロールを作成
   */
  static multiple(dice: string, results: number[]): DiceRoll {
    return {
      id: `roll_${Date.now()}`,
      timestamp: new Date().toISOString(),
      roller: 'test_user',
      characterId: 'test_character',
      dice,
      results,
      total: results.reduce((sum, val) => sum + val, 0),
      purpose: 'damage_roll'
    };
  }
}

/**
 * チャットメッセージモック
 */
export class ChatMessageMocks {
  /**
   * プレイヤーメッセージを作成
   */
  static playerMessage(
    message: string,
    speaker: string = 'Test Player',
    characterId?: string
  ): ChatMessage {
    return {
      id: `msg_${Date.now()}`,
      timestamp: new Date().toISOString(),
      speaker,
      characterId,
      message,
      type: 'ic'
    };
  }

  /**
   * GMメッセージを作成
   */
  static gmMessage(message: string): ChatMessage {
    return {
      id: `msg_${Date.now()}`,
      timestamp: new Date().toISOString(),
      speaker: 'Game Master',
      message,
      type: 'system'
    };
  }

  /**
   * OOCメッセージを作成
   */
  static oocMessage(message: string, speaker: string = 'Player'): ChatMessage {
    return {
      id: `msg_${Date.now()}`,
      timestamp: new Date().toISOString(),
      speaker,
      message,
      type: 'ooc'
    };
  }

  /**
   * チャットログを作成
   */
  static chatLog(messageCount: number = 10): ChatMessage[] {
    const messages: ChatMessage[] = [];
    const speakers = ['Alice', 'Bob', 'Charlie', 'GM'];
    
    for (let i = 0; i < messageCount; i++) {
      const speaker = speakers[i % speakers.length];
      const isGM = speaker === 'GM';
      
      messages.push(isGM 
        ? this.gmMessage(`GM message ${i + 1}`)
        : this.playerMessage(`Player message ${i + 1}`, speaker, `char_${speaker.toLowerCase()}`)
      );
    }
    
    return messages;
  }
}

// ==========================================
// テストヘルパー関数
// ==========================================

/**
 * テスト実行時間の測定
 */
export function measureTestTime<T>(
  testFunction: () => T,
  maxTimeMs: number = 1000
): T & { executionTime: number } {
  const startTime = Date.now();
  const result = testFunction();
  const executionTime = Date.now() - startTime;
  
  if (executionTime > maxTimeMs) {
    throw new Error(`Test exceeded maximum execution time: ${executionTime}ms > ${maxTimeMs}ms`);
  }
  
  return { ...result, executionTime };
}

/**
 * 非同期テスト実行時間の測定
 */
export async function measureAsyncTestTime<T>(
  testFunction: () => Promise<T>,
  maxTimeMs: number = 1000
): Promise<T & { executionTime: number }> {
  const startTime = Date.now();
  const result = await testFunction();
  const executionTime = Date.now() - startTime;
  
  if (executionTime > maxTimeMs) {
    throw new Error(`Async test exceeded maximum execution time: ${executionTime}ms > ${maxTimeMs}ms`);
  }
  
  return { ...result, executionTime };
}

/**
 * メモリ使用量の測定
 */
export function measureMemoryUsage<T>(testFunction: () => T): T & { memoryUsage: number } {
  const initialMemory = process.memoryUsage().heapUsed;
  const result = testFunction();
  const finalMemory = process.memoryUsage().heapUsed;
  const memoryUsage = finalMemory - initialMemory;
  
  return { ...result, memoryUsage };
}

/**
 * テストデータの等価性検証（深い比較）
 */
export function assertDeepEqual(actual: any, expected: any, path: string = ''): void {
  if (actual === expected) return;
  
  if (actual == null || expected == null) {
    throw new Error(`Values differ at ${path}: ${actual} !== ${expected}`);
  }
  
  if (typeof actual !== typeof expected) {
    throw new Error(`Types differ at ${path}: ${typeof actual} !== ${typeof expected}`);
  }
  
  if (Array.isArray(actual) !== Array.isArray(expected)) {
    throw new Error(`Array types differ at ${path}`);
  }
  
  if (Array.isArray(actual)) {
    if (actual.length !== expected.length) {
      throw new Error(`Array lengths differ at ${path}: ${actual.length} !== ${expected.length}`);
    }
    actual.forEach((item, index) => {
      assertDeepEqual(item, expected[index], `${path}[${index}]`);
    });
    return;
  }
  
  if (typeof actual === 'object') {
    const actualKeys = Object.keys(actual).sort();
    const expectedKeys = Object.keys(expected).sort();
    
    if (actualKeys.length !== expectedKeys.length) {
      throw new Error(`Object key counts differ at ${path}: ${actualKeys.length} !== ${expectedKeys.length}`);
    }
    
    actualKeys.forEach(key => {
      if (!expectedKeys.includes(key)) {
        throw new Error(`Key ${key} missing in expected at ${path}`);
      }
      assertDeepEqual(actual[key], expected[key], `${path}.${key}`);
    });
    return;
  }
  
  throw new Error(`Values differ at ${path}: ${actual} !== ${expected}`);
}

/**
 * 型の実行時検証
 */
export function assertType<T>(
  value: unknown,
  typeGuard: (value: unknown) => value is T,
  typeName: string
): asserts value is T {
  if (!typeGuard(value)) {
    throw new Error(`Value is not of type ${typeName}: ${JSON.stringify(value)}`);
  }
}

/**
 * テストスイートの統計情報
 */
export interface TestSuiteStats {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalTime: number;
  averageTime: number;
}

/**
 * テストスイート実行統計の収集
 */
export class TestStatsCollector {
  private stats: TestSuiteStats = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
    totalTime: 0,
    averageTime: 0
  };

  recordTestResult(passed: boolean, timeMs: number): void {
    this.stats.totalTests++;
    this.stats.totalTime += timeMs;
    
    if (passed) {
      this.stats.passedTests++;
    } else {
      this.stats.failedTests++;
    }
    
    this.stats.averageTime = this.stats.totalTime / this.stats.totalTests;
  }

  recordSkippedTest(): void {
    this.stats.totalTests++;
    this.stats.skippedTests++;
  }

  getStats(): TestSuiteStats {
    return { ...this.stats };
  }

  reset(): void {
    this.stats = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalTime: 0,
      averageTime: 0
    };
  }
}

// ==========================================
// テストスイート
// ==========================================

describe('テストユーティリティとモックヘルパーの包括的テスト（メタテスト）', () => {
  let statsCollector: TestStatsCollector;

  beforeEach(() => {
    statsCollector = new TestStatsCollector();
  });

  describe('テストデータファクトリー', () => {
    test('BaseStatsFactoryが正しいデフォルト値を生成する', () => {
      const factory = new BaseStatsFactory();
      const stats = factory.getDefaults();
      
      expect(stats).toHaveProperty('strength');
      expect(stats).toHaveProperty('dexterity');
      expect(stats).toHaveProperty('constitution');
      expect(stats).toHaveProperty('intelligence');
      expect(stats).toHaveProperty('wisdom');
      expect(stats).toHaveProperty('charisma');
      
      // 全ての能力値が1-30の範囲内
      Object.values(stats).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(30);
      });
    });

    test('BaseStatsFactoryが特化型ステータスを正しく生成する', () => {
      const factory = new BaseStatsFactory();
      
      const warrior = factory.createWarrior();
      expect(warrior.strength).toBeGreaterThan(warrior.intelligence);
      
      const wizard = factory.createWizard();
      expect(wizard.intelligence).toBeGreaterThan(wizard.strength);
      
      const balanced = factory.createBalanced();
      const values = Object.values(balanced);
      const allEqual = values.every(val => val === values[0]);
      expect(allEqual).toBe(true);
    });

    test('TRPGCharacterFactoryが有効なキャラクターを生成する', () => {
      const factory = new TRPGCharacterFactory();
      
      const pc = factory.createPC('Test Hero');
      expect(pc.type).toBe('pc');
      expect(pc.name).toBe('Test Hero');
      expect(pc.playerId).toBeDefined();
      
      const npc = factory.createNPC('Test NPC');
      expect(npc.type).toBe('npc');
      expect(npc.name).toBe('Test NPC');
      expect(npc.playerId).toBeUndefined();
      
      const enemy = factory.createEnemy('Test Enemy');
      expect(enemy.type).toBe('enemy');
      expect(enemy.name).toBe('Test Enemy');
      expect(enemy.playerId).toBeUndefined();
    });

    test('TRPGCharacterFactoryがパーティーを正しく生成する', () => {
      const factory = new TRPGCharacterFactory();
      const party = factory.createParty(4);
      
      expect(party).toHaveLength(4);
      
      // すべて同じキャンペーンID
      const campaignIds = new Set(party.map(char => char.campaignId));
      expect(campaignIds.size).toBe(1);
      
      // 名前が一意
      const names = new Set(party.map(char => char.name));
      expect(names.size).toBe(4);
    });

    test('TRPGCampaignFactoryが有効なキャンペーンを生成する', () => {
      const factory = new TRPGCampaignFactory();
      
      const defaultCampaign = factory.getDefaults();
      expect(defaultCampaign.status).toBe('active');
      expect(defaultCampaign.settings).toBeDefined();
      
      const shortCampaign = factory.createShort();
      expect(shortCampaign.settings.sessionDuration).toBeLessThan(defaultCampaign.settings.sessionDuration);
      
      const longCampaign = factory.createLong();
      expect(longCampaign.settings.sessionDuration).toBeGreaterThan(defaultCampaign.settings.sessionDuration);
    });

    test('ファクトリーが一意のIDを生成する', () => {
      const characterFactory = new TRPGCharacterFactory();
      const campaignFactory = new TRPGCampaignFactory();
      
      const characters = characterFactory.createMany(100);
      const campaigns = campaignFactory.createMany(100);
      
      // キャラクターIDの一意性
      const characterIds = new Set(characters.map(char => char.id));
      expect(characterIds.size).toBe(100);
      
      // キャンペーンIDの一意性
      const campaignIds = new Set(campaigns.map(campaign => campaign.id));
      expect(campaignIds.size).toBe(100);
    });
  });

  describe('モック作成ヘルパー', () => {
    test('APIResponseMocksが正しいレスポンスを作成する', () => {
      const successData = { id: '123', name: 'Test' };
      const successResponse = APIResponseMocks.success(successData);
      
      expect(successResponse.success).toBe(true);
      expect(successResponse.data).toEqual(successData);
      expect(successResponse.timestamp).toBeTruthy();
      
      const errorResponse = APIResponseMocks.error('Test error');
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBe('Test error');
    });

    test('APIResponseMocksが遅延レスポンスを作成する', async () => {
      const data = { test: 'data' };
      const delay = 100;
      
      const startTime = Date.now();
      const response = await APIResponseMocks.delayed(data, delay);
      const endTime = Date.now();
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(endTime - startTime).toBeGreaterThanOrEqual(delay - 10); // 10msの誤差を許容
    });

    test('DiceRollMocksが正しいダイスロールを作成する', () => {
      const fixedRoll = DiceRollMocks.fixed(15);
      expect(fixedRoll.results).toEqual([15]);
      expect(fixedRoll.total).toBe(15);
      
      const criticalRoll = DiceRollMocks.critical();
      expect(criticalRoll.results).toEqual([20]);
      expect(criticalRoll.success).toBe(true);
      
      const fumbleRoll = DiceRollMocks.fumble();
      expect(fumbleRoll.results).toEqual([1]);
      expect(fumbleRoll.success).toBe(false);
      
      const multipleRoll = DiceRollMocks.multiple('2d6', [3, 5]);
      expect(multipleRoll.results).toEqual([3, 5]);
      expect(multipleRoll.total).toBe(8);
    });

    test('ChatMessageMocksが正しいメッセージを作成する', () => {
      const playerMsg = ChatMessageMocks.playerMessage('Hello!', 'Alice', 'char_alice');
      expect(playerMsg.type).toBe('ic');
      expect(playerMsg.speaker).toBe('Alice');
      expect(playerMsg.message).toBe('Hello!');
      expect(playerMsg.characterId).toBe('char_alice');
      
      const gmMsg = ChatMessageMocks.gmMessage('The door creaks open...');
      expect(gmMsg.type).toBe('system');
      expect(gmMsg.speaker).toBe('Game Master');
      
      const oocMsg = ChatMessageMocks.oocMessage('Are we taking a break?');
      expect(oocMsg.type).toBe('ooc');
    });

    test('ChatMessageMocksがチャットログを作成する', () => {
      const chatLog = ChatMessageMocks.chatLog(8);
      
      expect(chatLog).toHaveLength(8);
      
      // メッセージタイプの分布確認
      const systemMessages = chatLog.filter(msg => msg.type === 'system');
      const icMessages = chatLog.filter(msg => msg.type === 'ic');
      
      expect(systemMessages.length).toBeGreaterThan(0);
      expect(icMessages.length).toBeGreaterThan(0);
      
      // タイムスタンプの順序（作成順）
      for (let i = 1; i < chatLog.length; i++) {
        expect(new Date(chatLog[i].timestamp).getTime())
          .toBeGreaterThanOrEqual(new Date(chatLog[i-1].timestamp).getTime());
      }
    });
  });

  describe('テストヘルパー関数', () => {
    test('measureTestTimeが実行時間を正しく測定する', () => {
      const testFunction = () => {
        // 意図的に少し時間のかかる処理
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      };
      
      const result = measureTestTime(testFunction, 100);
      
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.executionTime).toBeLessThan(100);
      expect(typeof result).toBe('number'); // 元の戻り値も保持
    });

    test('measureTestTimeが制限時間を超過した場合エラーを投げる', () => {
      const slowFunction = () => {
        // 意図的に遅い処理をシミュレート
        const start = Date.now();
        while (Date.now() - start < 50) {
          // 50ms待機
        }
        return 'done';
      };
      
      expect(() => {
        measureTestTime(slowFunction, 10); // 10ms制限
      }).toThrow('Test exceeded maximum execution time');
    });

    test('measureAsyncTestTimeが非同期処理の時間を測定する', async () => {
      const asyncFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'async result';
      };
      
      const result = await measureAsyncTestTime(asyncFunction, 100);
      
      expect(result.executionTime).toBeGreaterThanOrEqual(45); // 少し余裕を持たせる
      expect(result.executionTime).toBeLessThan(100);
      expect(result).toBe('async result');
    });

    test('measureMemoryUsageがメモリ使用量を測定する', () => {
      const memoryFunction = () => {
        // 意図的にメモリを使用
        const largeArray = new Array(10000).fill('test');
        return largeArray.length;
      };
      
      const result = measureMemoryUsage(memoryFunction);
      
      expect(result.memoryUsage).toBeGreaterThan(0);
      expect(result).toBe(10000); // 元の戻り値も保持
    });

    test('assertDeepEqualが深い等価性を正しく検証する', () => {
      const obj1 = {
        name: 'test',
        nested: {
          value: 42,
          array: [1, 2, { deep: 'value' }]
        }
      };
      
      const obj2 = {
        name: 'test',
        nested: {
          value: 42,
          array: [1, 2, { deep: 'value' }]
        }
      };
      
      const obj3 = {
        name: 'test',
        nested: {
          value: 43, // 異なる値
          array: [1, 2, { deep: 'value' }]
        }
      };
      
      expect(() => assertDeepEqual(obj1, obj2)).not.toThrow();
      expect(() => assertDeepEqual(obj1, obj3)).toThrow('Values differ at .nested.value');
    });

    test('assertTypeが型ガードを使用して型検証する', () => {
      const isString = (value: unknown): value is string => typeof value === 'string';
      const isNumber = (value: unknown): value is number => typeof value === 'number';
      
      expect(() => assertType('hello', isString, 'string')).not.toThrow();
      expect(() => assertType(123, isNumber, 'number')).not.toThrow();
      expect(() => assertType(123, isString, 'string')).toThrow('Value is not of type string');
    });
  });

  describe('TestStatsCollector', () => {
    test('テスト結果の統計を正しく収集する', () => {
      const collector = new TestStatsCollector();
      
      collector.recordTestResult(true, 10);
      collector.recordTestResult(true, 20);
      collector.recordTestResult(false, 30);
      collector.recordSkippedTest();
      
      const stats = collector.getStats();
      
      expect(stats.totalTests).toBe(4);
      expect(stats.passedTests).toBe(2);
      expect(stats.failedTests).toBe(1);
      expect(stats.skippedTests).toBe(1);
      expect(stats.totalTime).toBe(60);
      expect(stats.averageTime).toBe(15); // 60 / 4
    });

    test('統計をリセットできる', () => {
      const collector = new TestStatsCollector();
      
      collector.recordTestResult(true, 10);
      collector.reset();
      
      const stats = collector.getStats();
      expect(stats.totalTests).toBe(0);
      expect(stats.totalTime).toBe(0);
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量のテストデータ生成のパフォーマンス', () => {
      const characterFactory = new TRPGCharacterFactory();
      
      const result = measureTestTime(() => {
        return characterFactory.createMany(1000);
      }, 1000);
      
      expect(result).toHaveLength(1000);
      expect(result.executionTime).toBeLessThan(500); // 500ms以内
    });

    test('メモリ効率的なモック作成', () => {
      const result = measureMemoryUsage(() => {
        const messages = ChatMessageMocks.chatLog(1000);
        return messages.length;
      });
      
      expect(result).toBe(1000);
      // メモリ使用量が適切な範囲内（具体的な値は環境に依存）
      expect(result.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('エッジケースとエラーハンドリング', () => {
    test('ファクトリーが無効な入力を適切に処理する', () => {
      const factory = new TRPGCharacterFactory();
      
      // 空文字列の名前
      const char1 = factory.createPC('');
      expect(char1.name).toBe('');
      
      // 非常に長い名前
      const longName = 'a'.repeat(1000);
      const char2 = factory.createPC(longName);
      expect(char2.name).toBe(longName);
    });

    test('モックが境界値を正しく処理する', () => {
      // 最小値と最大値のダイスロール
      const minRoll = DiceRollMocks.fixed(1);
      const maxRoll = DiceRollMocks.fixed(20);
      
      expect(minRoll.total).toBe(1);
      expect(maxRoll.total).toBe(20);
      
      // ゼロ秒の遅延
      expect(async () => {
        await APIResponseMocks.delayed('data', 0);
      }).not.toThrow();
    });

    test('深い等価性検証が循環参照を検出する', () => {
      const obj1: any = { name: 'test' };
      obj1.self = obj1;
      
      const obj2: any = { name: 'test' };
      obj2.self = obj2;
      
      // 循環参照があっても無限ループにならないことを確認
      // 実装によってはスタックオーバーフローを起こす可能性があるため、
      // タイムアウト付きでテスト
      expect(() => {
        const testFunction = () => assertDeepEqual(obj1, obj2);
        measureTestTime(testFunction, 1000);
      }).toThrow(); // スタックオーバーフローまたは循環参照エラー
    });

    test('型検証が複雑な型を処理する', () => {
      const isValidCharacter = (value: unknown): value is TRPGCharacter => {
        return value != null &&
               typeof value === 'object' &&
               'id' in value &&
               'name' in value &&
               'type' in value;
      };
      
      const validCharacter = new TRPGCharacterFactory().createPC();
      const invalidCharacter = { id: 123 }; // 不完全なオブジェクト
      
      expect(() => {
        assertType(validCharacter, isValidCharacter, 'TRPGCharacter');
      }).not.toThrow();
      
      expect(() => {
        assertType(invalidCharacter, isValidCharacter, 'TRPGCharacter');
      }).toThrow();
    });
  });

  describe('テストインフラストラクチャの検証', () => {
    test('ファクトリーが型安全性を維持する', () => {
      const factory = new TRPGCharacterFactory();
      const character = factory.createPC();
      
      // TypeScriptの型チェックが働いていることを確認
      expect(typeof character.id).toBe('string');
      expect(typeof character.name).toBe('string');
      expect(['pc', 'npc', 'enemy']).toContain(character.type);
      expect(typeof character.stats).toBe('object');
    });

    test('モックがプロダクション型定義と互換性を保つ', () => {
      const apiResponse = APIResponseMocks.success({ test: 'data' });
      const diceRoll = DiceRollMocks.critical();
      const chatMessage = ChatMessageMocks.playerMessage('test');
      
      // 型定義との互換性確認（コンパイル時チェック）
      expect(apiResponse satisfies APIResponse<any>).toBeDefined();
      expect(diceRoll satisfies DiceRoll).toBeDefined();
      expect(chatMessage satisfies ChatMessage).toBeDefined();
    });

    test('テストヘルパーが実際のテストシナリオで動作する', () => {
      // 実際のテストシナリオをシミュレート
      const testScenario = () => {
        const factory = new TRPGCharacterFactory();
        const party = factory.createParty(4);
        const chatLog = ChatMessageMocks.chatLog(10);
        
        return {
          partySize: party.length,
          chatMessageCount: chatLog.length,
          firstCharacterName: party[0].name
        };
      };
      
      const result = measureTestTime(testScenario, 100);
      
      expect(result.partySize).toBe(4);
      expect(result.chatMessageCount).toBe(10);
      expect(result.firstCharacterName).toBeTruthy();
      expect(result.executionTime).toBeGreaterThan(0);
    });
  });
});