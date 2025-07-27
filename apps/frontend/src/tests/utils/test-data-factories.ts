/**
 * Test Data Factories - TRPG Production Types
 * 
 * 重要: 「テストデータ=本番と同じ型定義を使用」原則に従い、
 * @ai-agent-trpg/types の本番型のみを使用してテストデータを作成
 * 
 * このファイルは以下の原則に従います：
 * - テストデータ用の型定義は一切作成しない
 * - 本番型定義と完全に一致する構造のデータのみ作成
 * - テストデータとプロジェクト共通型が異なる場合、修正するのはテストデータ
 */

import { 
  TRPGCampaign, 
  Character, 
  TRPGCharacter, 
  NPCCharacter, 
  EnemyCharacter,
  SessionState, 
  TRPGSession, 
  ChatMessage, 
  DiceRoll,
  Quest,
  Location,
  TRPGEvent,
  Timeline,
  PartyLocation,
  MovementProposal,
  AIGameContext,
  CharacterAISettings,
  TacticsLevel,
  PartyMovementProposal,
  MovementVote,
  VotingSummary,
  PartyMovementState,
  ConsensusSettings,
  SessionInitializationProgress,
  SessionInitializationPhase,
  SessionInitializationProgressDetail,
  GMNotification,
  NarrativeFeedback
} from '@ai-agent-trpg/types';

/**
 * Base Factory Interface
 * 全ての Factory は本番型を返す
 */
type FactoryFunction<T> = (overrides?: Partial<T>) => T;

// ==========================================
// Campaign Factory
// ==========================================

export const createTestCampaign: FactoryFunction<TRPGCampaign> = (overrides = {}) => ({
  id: 'test-campaign-1',
  title: 'テストキャンペーン',
  description: 'ユニットテスト用のTRPGキャンペーンです',
  gameSystem: 'D&D 5e',
  gmId: 'test-gm-1',
  playerIds: ['test-player-1', 'test-player-2'],
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  worldSetting: {
    name: 'テスト世界',
    description: 'テスト用の架空世界設定',
    theme: 'ファンタジー'
  },
  ...overrides
});

// ==========================================
// Character Factories
// ==========================================

export const createTestCharacter: FactoryFunction<Character> = (overrides = {}) => ({
  id: 'test-character-1',
  name: 'テストキャラクター',
  type: 'pc',
  description: 'ユニットテスト用キャラクター',
  level: 1,
  hitPoints: 10,
  maxHitPoints: 10,
  armorClass: 12,
  stats: {
    strength: 10,
    dexterity: 12,
    constitution: 10,
    intelligence: 14,
    wisdom: 13,
    charisma: 11
  },
  skills: ['調査', '説得'],
  equipment: ['短剣', '革の鎧'],
  backstory: 'テスト用の背景設定',
  imageUrl: '',
  campaignId: 'test-campaign-1',
  ownerId: 'test-player-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides
});

export const createTestTRPGCharacter: FactoryFunction<TRPGCharacter> = (overrides = {}) => ({
  ...createTestCharacter({ type: 'pc' }),
  playerNotes: 'プレイヤー用メモ',
  characterClass: 'ローグ',
  race: 'ハーフリング',
  alignment: 'chaotic_neutral',
  ...overrides
});

export const createTestNPCCharacter: FactoryFunction<NPCCharacter> = (overrides = {}) => ({
  ...createTestCharacter({ type: 'npc' }),
  role: 'ally',
  personalityTraits: ['好奇心旺盛', '慎重'],
  motivations: ['真実の探求', '仲間の安全'],
  relationships: [],
  ...overrides
});

export const createTestEnemyCharacter: FactoryFunction<EnemyCharacter> = (overrides = {}) => ({
  ...createTestCharacter({ type: 'enemy' }),
  challengeRating: 1,
  abilities: ['急襲', '毒攻撃'],
  weaknesses: ['火に弱い'],
  tactics: 'aggressive',
  ...overrides
});

// ==========================================
// Session & Timeline Factories
// ==========================================

export const createTestSession: FactoryFunction<TRPGSession> = (overrides = {}) => ({
  id: 'test-session-1',
  campaignId: 'test-campaign-1',
  sessionNumber: 1,
  title: 'テストセッション',
  description: 'ユニットテスト用セッション',
  status: 'planned',
  scheduledDate: '2024-01-15T19:00:00Z',
  duration: 180, // 3 hours
  participantIds: ['test-player-1', 'test-player-2'],
  gmNotes: 'GMメモ',
  playerNotes: 'プレイヤーメモ',
  tags: ['テスト', '初回セッション'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides
});

export const createTestSessionState: FactoryFunction<SessionState> = (overrides = {}) => ({
  id: 'test-session-state-1',
  sessionId: 'test-session-1',
  campaignId: 'test-campaign-1',
  currentScene: 'テストシーン',
  activeCharacterIds: ['test-character-1'],
  timestamp: '2024-01-15T19:30:00Z',
  chatMessages: [],
  diceRolls: [],
  notes: 'セッション状態メモ',
  ...overrides
});

export const createTestChatMessage: FactoryFunction<ChatMessage> = (overrides = {}) => ({
  id: 'test-message-1',
  sessionId: 'test-session-1',
  senderId: 'test-player-1',
  senderName: 'テストプレイヤー',
  senderType: 'player',
  content: 'テストメッセージです',
  messageType: 'chat',
  timestamp: '2024-01-15T19:31:00Z',
  ...overrides
});

export const createTestDiceRoll: FactoryFunction<DiceRoll> = (overrides = {}) => ({
  id: 'test-roll-1',
  characterId: 'test-character-1',
  characterName: 'テストキャラクター',
  rollType: 'ability_check',
  dice: '1d20',
  result: 15,
  modifier: 2,
  total: 17,
  purpose: '調査判定',
  timestamp: '2024-01-15T19:32:00Z',
  ...overrides
});

// ==========================================
// Location & Quest Factories
// ==========================================

export const createTestLocation: FactoryFunction<Location> = (overrides = {}) => ({
  id: 'test-location-1',
  name: 'テスト酒場',
  description: '冒険者が集う賑やかな酒場',
  type: 'settlement',
  connections: ['test-location-2'],
  campaignId: 'test-campaign-1',
  isCurrentLocation: true,
  ...overrides
});

export const createTestQuest: FactoryFunction<Quest> = (overrides = {}) => ({
  id: 'test-quest-1',
  title: '失われた宝物の捜索',
  description: '古い遺跡に眠る宝物を見つけ出せ',
  status: 'active',
  difficulty: 'medium',
  rewards: ['500ゴールド', '魔法のアミュレット'],
  campaignId: 'test-campaign-1',
  ...overrides
});

// ==========================================
// AI & System Factories
// ==========================================

export const createTestAIGameContext: FactoryFunction<AIGameContext> = (overrides = {}) => ({
  campaignId: 'test-campaign-1',
  sessionId: 'test-session-1',
  currentLocation: 'test-location-1',
  activeCharacters: ['test-character-1'],
  sessionPhase: 'exploration',
  lastUserAction: 'character_interaction',
  relevantHistory: ['パーティが酒場に到着', 'バーテンダーと会話開始'],
  ...overrides
});

export const createTestCharacterAISettings: FactoryFunction<CharacterAISettings> = (overrides = {}) => ({
  characterId: 'test-character-1',
  personalityType: 'cautious',
  communicationStyle: 'formal',
  actionPriority: 'support',
  autonomyLevel: 0.5,
  ...overrides
});

// ==========================================
// Party Movement Factories
// ==========================================

export const createTestMovementProposal: FactoryFunction<PartyMovementProposal> = (overrides = {}) => ({
  id: 'test-proposal-1',
  campaignId: 'test-campaign-1',
  proposerId: 'test-character-1',
  targetLocationId: 'test-location-2',
  reason: 'クエストの手がかりを探すため',
  status: 'voting',
  createdAt: '2024-01-15T19:40:00Z',
  votingDeadline: '2024-01-15T19:45:00Z',
  ...overrides
});

export const createTestMovementVote: FactoryFunction<MovementVote> = (overrides = {}) => ({
  id: 'test-vote-1',
  proposalId: 'test-proposal-1',
  voterId: 'test-character-1',
  choice: 'agree',
  reason: '良いアイデアだと思う',
  timestamp: '2024-01-15T19:41:00Z',
  ...overrides
});

export const createTestConsensusSettings: FactoryFunction<ConsensusSettings> = (overrides = {}) => ({
  votingTimeLimit: 300, // 5 minutes
  requiredAgreementRatio: 0.6,
  allowAbstention: true,
  autoExecuteOnConsensus: true,
  ...overrides
});

// ==========================================
// Session Initialization Factories
// ==========================================

export const createTestSessionInitializationProgressDetail: FactoryFunction<SessionInitializationProgressDetail> = (
  phase: SessionInitializationPhase,
  overrides = {}
) => ({
  phase,
  phaseName: phase === 'scenario' ? 'シナリオ生成' : 
            phase === 'milestone' ? 'マイルストーン生成' : 'エンティティ生成',
  progress: 0,
  status: 'pending' as const,
  currentTask: '',
  completedTasks: [],
  totalTasks: 5,
  estimatedTimeRemaining: 60,
  ...overrides
});

export const createTestSessionInitializationProgress: FactoryFunction<SessionInitializationProgress> = (overrides = {}) => ({
  isInitializing: false,
  currentPhase: null,
  overallProgress: 0,
  phases: {
    scenario: createTestSessionInitializationProgressDetail('scenario'),
    milestone: createTestSessionInitializationProgressDetail('milestone'),
    entity: createTestSessionInitializationProgressDetail('entity'),
  },
  sessionId: null,
  campaignId: null,
  ...overrides
});

// ==========================================
// Notification Factories
// ==========================================

export const createTestGMNotification: FactoryFunction<GMNotification> = (overrides = {}) => ({
  id: 'test-gm-notification-1',
  type: 'character_action',
  priority: 'medium',
  title: 'キャラクターアクション',
  message: 'テストキャラクターが重要な行動を取りました',
  timestamp: '2024-01-15T19:45:00Z',
  isRead: false,
  sessionId: 'test-session-1',
  campaignId: 'test-campaign-1',
  ...overrides
});

// ==========================================
// Mock データセット作成ヘルパー
// ==========================================

/**
 * 完全なテストキャンペーンセットアップを作成
 * 関連するエンティティを含む包括的なテストデータセット
 */
export function createCompleteTestCampaignSetup() {
  const campaign = createTestCampaign();
  const playerCharacter = createTestTRPGCharacter();
  const npcCharacter = createTestNPCCharacter();
  const enemyCharacter = createTestEnemyCharacter();
  const location = createTestLocation();
  const quest = createTestQuest();
  const session = createTestSession();
  const sessionState = createTestSessionState();
  
  return {
    campaign,
    characters: [playerCharacter, npcCharacter, enemyCharacter],
    locations: [location],
    quests: [quest],
    session,
    sessionState,
  };
}

/**
 * アクティブセッション用テストデータセット
 */
export function createActiveSessionTestData() {
  const { campaign, characters, session } = createCompleteTestCampaignSetup();
  const chatMessages = [
    createTestChatMessage({ content: 'セッション開始！' }),
    createTestChatMessage({ 
      content: '調査判定を行います',
      senderId: characters[0].id,
      senderName: characters[0].name 
    }),
  ];
  const diceRolls = [
    createTestDiceRoll({ characterId: characters[0].id }),
  ];
  
  return {
    campaign,
    characters,
    session: { ...session, status: 'active' as const },
    chatMessages,
    diceRolls,
  };
}

/**
 * エラー状況のテストデータ
 */
export function createErrorTestData() {
  return {
    invalidCampaign: { ...createTestCampaign(), id: '' }, // 無効なID
    invalidCharacter: { ...createTestCharacter(), campaignId: '' }, // 無効な参照
    networkError: new Error('ネットワークエラー'),
    validationError: new Error('バリデーションエラー'),
  };
}