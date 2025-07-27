/**
 * Test Data Organization - Main Index
 * t-WADA パターン対応テストデータの統一エクスポート
 * 
 * このファイルは、プロジェクト全体のテストデータとヘルパーをまとめてエクスポートします。
 * 各テストファイルは、このインデックスを通じて必要なテストデータにアクセスできます。
 */

// ===================================
// Fixtures (実際のデータに近い固定データ)
// ===================================

export {
  fixtureCampaignList,
  fixtureBeginnerCampaign,
  fixtureIntermediateCampaign,
  fixtureAdvancedCampaign,
  fixtureOneshotCampaign,
  fixtureCompletedCampaign,
  fixtureActiveCampaigns,
  fixturePreparingCampaigns,
  fixtureCompletedCampaigns,
  fixtureBeginnerCampaigns,
  fixtureAdvancedCampaigns
} from './fixtures/fixtureCampaignList';

export {
  fixtureCharacterTank,
  fixtureCharacterHealer,
  fixtureCharacterDPS,
  fixtureCharacterUtility,
  fixtureBalancedParty,
  fixturePartyStats
} from './fixtures/fixtureCharacterParty';

// ===================================
// Mocks (完全なダミーデータ)
// ===================================

export {
  mockCampaign,
  mockCampaignEmpty,
  mockCampaignMaxSettings,
  mockCampaignCompleted,
  mockCampaignCancelled,
  mockQuest,
  mockQuestCompleted,
  mockLocation,
  mockLocationUndiscovered,
  mockCampaignList,
  mockActiveCampaigns,
  mockCompletedCampaigns,
  mockQuestList,
  mockLocationList
} from './mocks/mockCampaign';

export {
  mockCharacterPC,
  mockCharacterPCEmpty,
  mockCharacterPCHighLevel,
  mockCharacterNPC,
  mockCharacterNPCHostile,
  mockCharacterEnemy,
  mockCharacterEnemyBoss,
  mockCharacterList,
  mockPCList,
  mockNPCList,
  mockEnemyList,
  mockLowLevelCharacters,
  mockHighLevelCharacters
} from './mocks/mockCharacters';

export {
  mockSession,
  mockSessionActive,
  mockSessionCompleted,
  mockEvent,
  mockEventCombat,
  mockEventSocial,
  mockChatMessage,
  mockChatMessageGM,
  mockChatMessageSystem,
  mockDiceRoll,
  mockDiceRollMultiple,
  mockDiceRollCriticalFail,
  mockSessionList,
  mockEventList,
  mockChatMessageList,
  mockDiceRollList,
  mockActiveSessions,
  mockCompletedSessions,
  mockCombatEvents,
  mockSocialEvents
} from './mocks/mockSessions';

// ===================================
// Stubs (最小限の代替実装)
// ===================================

export {
  StubAIService,
  stubAIService,
  createStubAIService,
  stubAIServiceOffline,
  stubAIServiceSlow,
  stubAIServiceUnreliable
} from './stubs/stubAIService';

export {
  StubDatabaseService,
  stubDatabaseService,
  createStubDatabaseService,
  stubDatabaseServiceOffline,
  stubDatabaseServiceSlow,
  stubDatabaseServiceUnreliable
} from './stubs/stubDatabaseService';

export {
  StubWebSocketService,
  stubWebSocketService,
  createStubWebSocketService,
  stubWebSocketServiceSlow,
  stubWebSocketServiceUnreliable,
  stubWebSocketServiceNoAutoReconnect
} from './stubs/stubWebSocketService';

// ===================================
// Factories (テストデータ生成器)
// ===================================

export { CampaignFactory } from './factories/CampaignFactory';

export {
  PCCharacterFactory,
  NPCCharacterFactory,
  EnemyCharacterFactory,
  PartyFactory
} from './factories/CharacterFactory';

export {
  SessionFactory,
  EventFactory,
  ChatMessageFactory,
  DiceRollFactory
} from './factories/SessionFactory';

// ===================================
// Scenarios (包括的なTRPGシナリオ)
// ===================================

export {
  TRPGScenarios,
  BeginnerVillageScenario,
  PoliticalIntrigueScenario,
  HorrorOneshotScenario,
  FullIntegrationScenario,
  createBeginnerVillageScenario,
  createPoliticalIntrigueScenario,
  createHorrorOneshotScenario,
  createFullIntegrationScenario
} from './scenarios/trpgScenarios';

// ===================================
// Utils (テストヘルパーとAAA パターンサポート)
// ===================================

export {
  AAATestCase,
  ArrangeHelpers,
  ActHelpers,
  AssertHelpers,
  IntegrationTestHelpers
} from './utils/testHelpers';

// ===================================
// 便利なプリセット
// ===================================

/**
 * よく使用されるテストデータのプリセット
 */
export const TestDataPresets = {
  // キャンペーンプリセット
  campaigns: {
    beginner: () => import('./fixtures/fixtureCampaignList').then(m => m.fixtureBeginnerCampaign),
    mock: () => import('./mocks/mockCampaign').then(m => m.mockCampaign),
    factory: () => import('./factories/CampaignFactory').then(m => m.CampaignFactory.createBeginner().build())
  },
  
  // キャラクタープリセット
  characters: {
    balancedParty: () => import('./fixtures/fixtureCharacterParty').then(m => m.fixtureBalancedParty),
    mockPC: () => import('./mocks/mockCharacters').then(m => m.mockCharacterPC),
    factoryFighter: () => import('./factories/CharacterFactory').then(m => m.PCCharacterFactory.createFighter().build())
  },
  
  // セッションプリセット
  sessions: {
    active: () => import('./mocks/mockSessions').then(m => m.mockSessionActive),
    completed: () => import('./mocks/mockSessions').then(m => m.mockSessionCompleted),
    factory: () => import('./factories/SessionFactory').then(m => m.SessionFactory.createActive().build())
  },
  
  // シナリオプリセット
  scenarios: {
    beginnerVillage: () => import('./scenarios/trpgScenarios').then(m => m.createBeginnerVillageScenario()),
    politicalIntrigue: () => import('./scenarios/trpgScenarios').then(m => m.createPoliticalIntrigueScenario()),
    horrorOneshot: () => import('./scenarios/trpgScenarios').then(m => m.createHorrorOneshotScenario())
  }
};

/**
 * テスト用サービスのプリセット
 */
export const TestServicePresets = {
  // AIサービス
  ai: {
    online: () => import('./stubs/stubAIService').then(m => m.createStubAIService({ isOnline: true })),
    offline: () => import('./stubs/stubAIService').then(m => m.createStubAIService({ isOnline: false })),
    slow: () => import('./stubs/stubAIService').then(m => m.createStubAIService({ responseDelay: 2000 })),
    unreliable: () => import('./stubs/stubAIService').then(m => m.createStubAIService({ failureRate: 0.3 }))
  },
  
  // データベースサービス
  database: {
    online: () => import('./stubs/stubDatabaseService').then(m => m.createStubDatabaseService({ isOnline: true })),
    offline: () => import('./stubs/stubDatabaseService').then(m => m.createStubDatabaseService({ isOnline: false })),
    slow: () => import('./stubs/stubDatabaseService').then(m => m.createStubDatabaseService({ operationDelay: 1000 })),
    unreliable: () => import('./stubs/stubDatabaseService').then(m => m.createStubDatabaseService({ failureRate: 0.2 }))
  },
  
  // WebSocketサービス
  websocket: {
    normal: () => import('./stubs/stubWebSocketService').then(m => m.createStubWebSocketService()),
    slow: () => import('./stubs/stubWebSocketService').then(m => m.createStubWebSocketService({ connectionDelay: 2000 })),
    unreliable: () => import('./stubs/stubWebSocketService').then(m => m.createStubWebSocketService({ failureRate: 0.1 }))
  }
};

/**
 * AAA パターンのテンプレート
 */
export const AAATemplates = {
  // キャンペーン作成のテストテンプレート
  campaignCreation: {
    arrange: () => import('./utils/testHelpers').then(m => m.ArrangeHelpers.prepareCampaignTestData()),
    act: (data: any) => import('./utils/testHelpers').then(m => m.ActHelpers.simulateAPICall(data)),
    assert: (result: any) => import('./utils/testHelpers').then(m => m.AssertHelpers.assertAPIResponse(result))
  },
  
  // キャラクター管理のテストテンプレート
  characterManagement: {
    arrange: () => import('./utils/testHelpers').then(m => m.ArrangeHelpers.prepareCharacterTestData()),
    act: (data: any) => import('./utils/testHelpers').then(m => m.ActHelpers.simulateAsyncOperation(() => data)),
    assert: (result: any) => import('./utils/testHelpers').then(m => m.AssertHelpers.assertTRPGCharacter(result))
  },
  
  // セッション実行のテストテンプレート
  sessionExecution: {
    arrange: () => import('./utils/testHelpers').then(m => m.ArrangeHelpers.prepareSessionTestData()),
    act: (data: any) => import('./utils/testHelpers').then(m => m.ActHelpers.simulateAsyncOperation(() => data)),
    assert: (result: any) => import('./utils/testHelpers').then(m => m.AssertHelpers.assertTRPGSession(result))
  }
};

// ===================================
// 型定義エクスポート
// ===================================

export type {
  BeginnerVillageScenario,
  PoliticalIntrigueScenario,
  HorrorOneshotScenario,
  FullIntegrationScenario
} from './scenarios/trpgScenarios';