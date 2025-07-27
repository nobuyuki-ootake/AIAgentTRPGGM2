/**
 * AAA パターン対応テストヘルパー
 * t-WADA命名規則: testHelpers.ts
 * 本番型定義（@ai-agent-trpg/types）を使用
 * 
 * 用途: Arrange, Act, Assert パターンのサポート、テストデータ検証、共通テストユーティリティ
 */

import { 
  TRPGCampaign, 
  TRPGCharacter, 
  NPCCharacter, 
  EnemyCharacter,
  TRPGSession,
  TRPGEvent,
  Quest,
  Location,
  ChatMessage,
  DiceRoll,
  APIResponse
} from '@ai-agent-trpg/types';

// ===================================
// AAA パターン基底クラス
// ===================================

export abstract class AAATestCase<TArrange, TAct, TAssert> {
  // Arrange: テストデータの準備
  abstract arrange(): TArrange;
  
  // Act: テスト対象の操作実行
  abstract act(arrangedData: TArrange): Promise<TAct> | TAct;
  
  // Assert: 結果の検証
  abstract assert(result: TAct, arrangedData: TArrange): TAssert;
  
  // テスト実行
  async execute(): Promise<{
    arranged: TArrange;
    acted: TAct;
    asserted: TAssert;
  }> {
    const arranged = this.arrange();
    const acted = await this.act(arranged);
    const asserted = this.assert(acted, arranged);
    
    return { arranged, acted, asserted };
  }
}

// ===================================
// Arrange: テストデータ準備ヘルパー
// ===================================

export class ArrangeHelpers {
  // キャンペーン関連のテストデータ準備
  static prepareCampaignTestData(): {
    validCampaign: TRPGCampaign;
    invalidCampaign: Partial<TRPGCampaign>;
    emptyCampaign: Partial<TRPGCampaign>;
  } {
    return {
      validCampaign: {
        id: 'arrange-valid-campaign',
        title: 'アレンジテストキャンペーン',
        description: '有効なキャンペーンデータ',
        gameSystem: 'D&D5e',
        gmId: 'arrange-gm',
        playerIds: ['arrange-player-1', 'arrange-player-2'],
        characterIds: ['arrange-char-1', 'arrange-char-2'],
        status: 'active',
        settings: {
          aiAssistanceLevel: 'standard',
          difficultyLevel: 'normal',
          sessionDuration: 180,
          maxPlayers: 4,
          useVoiceChat: false,
          allowPlayerActions: true
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      invalidCampaign: {
        id: '',
        title: '',
        // 必須フィールドの欠落
      },
      emptyCampaign: {}
    };
  }

  // キャラクター関連のテストデータ準備
  static prepareCharacterTestData(): {
    validPC: TRPGCharacter;
    validNPC: NPCCharacter;
    validEnemy: EnemyCharacter;
    invalidCharacter: Partial<TRPGCharacter>;
  } {
    return {
      validPC: {
        id: 'arrange-pc',
        name: 'アレンジPC',
        description: '有効なPCデータ',
        characterType: 'PC',
        age: 25,
        race: 'human',
        characterClass: 'fighter',
        background: 'soldier',
        appearance: 'テスト用外見',
        baseStats: {
          strength: 16,
          dexterity: 12,
          constitution: 15,
          intelligence: 10,
          wisdom: 13,
          charisma: 14
        },
        derivedStats: {
          hitPoints: 34,
          maxHitPoints: 34,
          magicPoints: 0,
          maxMagicPoints: 0,
          armorClass: 18,
          initiative: 1,
          speed: 30
        },
        level: 3,
        experience: 900,
        skills: [],
        feats: [],
        equipment: [],
        statusEffects: [],
        personalityTraits: ['勇敢'],
        ideals: ['正義'],
        bonds: ['仲間'],
        flaws: ['無謀'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        campaignId: 'arrange-campaign'
      },
      validNPC: {
        id: 'arrange-npc',
        name: 'アレンジNPC',
        description: '有効なNPCデータ',
        characterType: 'NPC',
        age: 35,
        race: 'human',
        characterClass: 'commoner',
        appearance: 'NPC外見',
        baseStats: {
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10
        },
        derivedStats: {
          hitPoints: 10,
          maxHitPoints: 10,
          magicPoints: 0,
          maxMagicPoints: 0,
          armorClass: 10,
          initiative: 0,
          speed: 30
        },
        level: 1,
        experience: 0,
        skills: [],
        feats: [],
        equipment: [],
        statusEffects: [],
        role: 'questGiver',
        disposition: 'friendly',
        dialoguePatterns: [],
        questIds: [],
        behaviorTags: [],
        npcData: {
          importance: 'minor',
          disposition: 'friendly',
          occupation: 'commoner',
          location: 'test-location',
          aiPersonality: {}
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        campaignId: 'arrange-campaign'
      },
      validEnemy: {
        id: 'arrange-enemy',
        name: 'アレンジエネミー',
        description: '有効な敵データ',
        characterType: 'Enemy',
        race: 'goblin',
        characterClass: 'warrior',
        appearance: 'エネミー外見',
        baseStats: {
          strength: 8,
          dexterity: 14,
          constitution: 10,
          intelligence: 10,
          wisdom: 8,
          charisma: 8
        },
        derivedStats: {
          hitPoints: 7,
          maxHitPoints: 7,
          magicPoints: 0,
          maxMagicPoints: 0,
          armorClass: 15,
          initiative: 2,
          speed: 30
        },
        level: 1,
        experience: 0,
        skills: [],
        feats: [],
        equipment: [],
        statusEffects: [],
        challengeRating: 0.25,
        specialAbilities: [],
        legendaryActions: [],
        combatTactics: ['群れ攻撃'],
        combatRole: 'striker',
        environment: ['forest'],
        groupSize: { min: 2, max: 6 },
        treasureIds: [],
        enemyData: {
          category: 'humanoid',
          challengeRating: 0.25,
          encounterLevel: 1,
          combat: {},
          encounter: {},
          loot: {}
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        campaignId: 'arrange-campaign'
      },
      invalidCharacter: {
        id: '',
        name: '',
        // 必須フィールドの欠落
      }
    };
  }

  // セッション関連のテストデータ準備
  static prepareSessionTestData(): {
    validSession: TRPGSession;
    activeSession: TRPGSession;
    completedSession: TRPGSession;
    invalidSession: Partial<TRPGSession>;
  } {
    return {
      validSession: {
        id: 'arrange-session',
        campaignId: 'arrange-campaign',
        name: 'アレンジセッション',
        description: '有効なセッションデータ',
        status: 'preparing',
        mode: 'exploration',
        scheduledStartTime: '2024-01-01T19:00:00Z',
        estimatedDuration: 180,
        players: ['arrange-player-1'],
        characterIds: ['arrange-char-1'],
        gameMasterId: 'arrange-gm',
        notes: 'テストノート',
        sessionNumber: 1,
        isRecordingEnabled: false,
        completedEvents: [],
        sessionLog: []
      },
      activeSession: {
        id: 'arrange-active-session',
        campaignId: 'arrange-campaign',
        name: 'アクティブセッション',
        description: '進行中セッション',
        status: 'active',
        mode: 'combat',
        scheduledStartTime: '2024-01-01T19:00:00Z',
        actualStartTime: '2024-01-01T19:05:00Z',
        estimatedDuration: 180,
        players: ['arrange-player-1'],
        characterIds: ['arrange-char-1'],
        gameMasterId: 'arrange-gm',
        notes: '',
        sessionNumber: 2,
        isRecordingEnabled: true,
        currentEventId: 'arrange-event-1',
        completedEvents: [],
        sessionLog: []
      },
      completedSession: {
        id: 'arrange-completed-session',
        campaignId: 'arrange-campaign',
        name: '完了セッション',
        description: '完了済みセッション',
        status: 'completed',
        mode: 'rest',
        scheduledStartTime: '2024-01-01T19:00:00Z',
        actualStartTime: '2024-01-01T19:00:00Z',
        actualEndTime: '2024-01-01T22:00:00Z',
        estimatedDuration: 180,
        players: ['arrange-player-1'],
        characterIds: ['arrange-char-1'],
        gameMasterId: 'arrange-gm',
        notes: '完了ノート',
        sessionNumber: 3,
        isRecordingEnabled: true,
        completedEvents: ['arrange-event-1'],
        sessionLog: []
      },
      invalidSession: {
        id: '',
        // 必須フィールドの欠落
      }
    };
  }

  // APIレスポンス形式の準備
  static prepareAPIResponseData<T>(data: T): {
    successResponse: APIResponse<T>;
    errorResponse: APIResponse<never>;
    validationErrorResponse: APIResponse<never>;
  } {
    return {
      successResponse: {
        success: true,
        data,
        timestamp: '2024-01-01T00:00:00Z'
      },
      errorResponse: {
        success: false,
        error: 'テストエラーメッセージ',
        timestamp: '2024-01-01T00:00:00Z'
      },
      validationErrorResponse: {
        success: false,
        error: 'バリデーションエラー',
        errors: [
          {
            field: 'name',
            message: '名前は必須です',
            code: 'REQUIRED'
          },
          {
            field: 'level',
            message: 'レベルは1以上である必要があります',
            code: 'MIN_VALUE'
          }
        ],
        timestamp: '2024-01-01T00:00:00Z'
      }
    };
  }
}

// ===================================
// Act: 操作実行ヘルパー
// ===================================

export class ActHelpers {
  // 非同期操作のシミュレート
  static async simulateAsyncOperation<T>(
    operation: () => T,
    delay: number = 100
  ): Promise<T> {
    await new Promise(resolve => setTimeout(resolve, delay));
    return operation();
  }

  // エラーのシミュレート
  static simulateError(errorMessage: string = 'テストエラー'): never {
    throw new Error(errorMessage);
  }

  // API呼び出しのシミュレート
  static async simulateAPICall<T>(
    data: T,
    shouldSucceed: boolean = true,
    delay: number = 100
  ): Promise<APIResponse<T>> {
    await new Promise(resolve => setTimeout(resolve, delay));
    
    if (shouldSucceed) {
      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        success: false,
        error: 'API呼び出しが失敗しました',
        timestamp: new Date().toISOString()
      };
    }
  }

  // バリデーション実行のシミュレート
  static validateTestData<T>(
    data: T,
    validator: (data: T) => boolean,
    errorMessage: string = 'バリデーションエラー'
  ): T {
    if (!validator(data)) {
      throw new Error(errorMessage);
    }
    return data;
  }
}

// ===================================
// Assert: 検証ヘルパー
// ===================================

export class AssertHelpers {
  // 基本的な等価性チェック
  static assertEquals<T>(actual: T, expected: T, message?: string): boolean {
    const isEqual = JSON.stringify(actual) === JSON.stringify(expected);
    if (!isEqual && message) {
      throw new Error(`${message}: expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
    }
    return isEqual;
  }

  // 真偽値の検証
  static assertTrue(condition: boolean, message?: string): boolean {
    if (!condition && message) {
      throw new Error(message);
    }
    return condition;
  }

  // null/undefined チェック
  static assertNotNull<T>(value: T | null | undefined, message?: string): T {
    if (value == null) {
      throw new Error(message || 'Value should not be null or undefined');
    }
    return value;
  }

  // 配列の長さチェック
  static assertArrayLength<T>(
    array: T[], 
    expectedLength: number, 
    message?: string
  ): boolean {
    const isCorrectLength = array.length === expectedLength;
    if (!isCorrectLength && message) {
      throw new Error(`${message}: expected length ${expectedLength}, but got ${array.length}`);
    }
    return isCorrectLength;
  }

  // オブジェクトのプロパティ存在チェック
  static assertHasProperty<T extends object>(
    obj: T, 
    property: keyof T, 
    message?: string
  ): boolean {
    const hasProperty = property in obj;
    if (!hasProperty && message) {
      throw new Error(`${message}: property '${String(property)}' not found`);
    }
    return hasProperty;
  }

  // APIレスポンスの検証
  static assertAPIResponse<T>(
    response: APIResponse<T>,
    shouldSucceed: boolean = true
  ): APIResponse<T> {
    if (shouldSucceed) {
      this.assertTrue(response.success, 'API response should be successful');
      this.assertNotNull(response.data, 'API response data should not be null');
    } else {
      this.assertTrue(!response.success, 'API response should be unsuccessful');
      this.assertNotNull(response.error, 'API response should have error message');
    }
    return response;
  }

  // TRPGエンティティの検証
  static assertTRPGCampaign(campaign: TRPGCampaign): boolean {
    this.assertNotNull(campaign.id, 'Campaign ID should not be null');
    this.assertNotNull(campaign.title, 'Campaign title should not be null');
    this.assertNotNull(campaign.gameSystem, 'Game system should not be null');
    this.assertTrue(campaign.playerIds.length >= 0, 'Player IDs should be array');
    this.assertTrue(campaign.characterIds.length >= 0, 'Character IDs should be array');
    return true;
  }

  static assertTRPGCharacter(character: TRPGCharacter | NPCCharacter | EnemyCharacter): boolean {
    this.assertNotNull(character.id, 'Character ID should not be null');
    this.assertNotNull(character.name, 'Character name should not be null');
    this.assertNotNull(character.characterType, 'Character type should not be null');
    this.assertNotNull(character.baseStats, 'Base stats should not be null');
    this.assertNotNull(character.derivedStats, 'Derived stats should not be null');
    this.assertTrue(character.level >= 1, 'Level should be at least 1');
    return true;
  }

  static assertTRPGSession(session: TRPGSession): boolean {
    this.assertNotNull(session.id, 'Session ID should not be null');
    this.assertNotNull(session.campaignId, 'Campaign ID should not be null');
    this.assertNotNull(session.status, 'Session status should not be null');
    this.assertTrue(session.estimatedDuration > 0, 'Duration should be positive');
    this.assertTrue(session.sessionNumber >= 1, 'Session number should be at least 1');
    return true;
  }

  // ダイスロールの検証
  static assertDiceRoll(diceRoll: DiceRoll): boolean {
    this.assertNotNull(diceRoll.diceExpression, 'Dice expression should not be null');
    this.assertTrue(diceRoll.result >= 1, 'Dice result should be at least 1');
    this.assertTrue(diceRoll.individualRolls.length > 0, 'Individual rolls should not be empty');
    this.assertNotNull(diceRoll.purpose, 'Dice roll purpose should not be null');
    return true;
  }

  // チャットメッセージの検証
  static assertChatMessage(message: ChatMessage): boolean {
    this.assertNotNull(message.id, 'Message ID should not be null');
    this.assertNotNull(message.senderId, 'Sender ID should not be null');
    this.assertNotNull(message.content, 'Message content should not be null');
    this.assertNotNull(message.timestamp, 'Timestamp should not be null');
    return true;
  }
}

// ===================================
// 統合テストヘルパー
// ===================================

export class IntegrationTestHelpers {
  // テストシナリオの実行
  static async executeTestScenario<TArrange, TAct, TAssert>(
    testCase: AAATestCase<TArrange, TAct, TAssert>
  ): Promise<{
    success: boolean;
    result?: {
      arranged: TArrange;
      acted: TAct;
      asserted: TAssert;
    };
    error?: Error;
  }> {
    try {
      const result = await testCase.execute();
      return {
        success: true,
        result
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error
      };
    }
  }

  // 複数テストケースの並列実行
  static async executeParallelTests<T>(
    testCases: (() => Promise<T>)[]
  ): Promise<{
    results: T[];
    errors: Error[];
    successCount: number;
    failureCount: number;
  }> {
    const results: T[] = [];
    const errors: Error[] = [];

    const promises = testCases.map(async (testCase) => {
      try {
        const result = await testCase();
        results.push(result);
        return { success: true, result };
      } catch (error) {
        errors.push(error as Error);
        return { success: false, error };
      }
    });

    await Promise.all(promises);

    return {
      results,
      errors,
      successCount: results.length,
      failureCount: errors.length
    };
  }

  // テストデータのクリーンアップ
  static cleanupTestData(testIds: string[]): void {
    // テスト後のクリーンアップ処理
    // 実際の実装では、データベースからテストデータを削除する
    console.log(`Cleaning up test data: ${testIds.join(', ')}`);
  }

  // テスト結果のレポート生成
  static generateTestReport(results: {
    testName: string;
    success: boolean;
    duration: number;
    details?: any;
  }[]): string {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    return `
=== TRPG Test Report ===
Total Tests: ${totalTests}
Passed: ${passedTests}
Failed: ${failedTests}
Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%
Total Duration: ${totalDuration}ms
Average Duration: ${(totalDuration / totalTests).toFixed(2)}ms

Failed Tests:
${results.filter(r => !r.success).map(r => `- ${r.testName}`).join('\n')}
`;
  }
}

// ===================================
// エクスポート
// ===================================

export {
  ArrangeHelpers,
  ActHelpers,
  AssertHelpers,
  IntegrationTestHelpers,
  AAATestCase
};