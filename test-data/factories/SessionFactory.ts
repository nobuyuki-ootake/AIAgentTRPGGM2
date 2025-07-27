/**
 * ファクトリ: セッションデータ生成器
 * t-WADA命名規則: SessionFactory.ts
 * 本番型定義（@ai-agent-trpg/types）を使用
 * 
 * 用途: TRPGセッション、イベント、ダイスロールの動的生成
 */

import { 
  TRPGSession, 
  TRPGEvent, 
  ChatMessage, 
  DiceRoll, 
  SessionLogEntry 
} from '@ai-agent-trpg/types';

// ===================================
// セッションファクトリ
// ===================================

export class SessionFactory {
  private session: Partial<TRPGSession> = {};
  private static instanceCounter = 0;

  constructor() {
    this.reset();
  }

  // ===================================
  // 基本設定メソッド
  // ===================================

  withId(id: string): SessionFactory {
    this.session.id = id;
    return this;
  }

  withCampaign(campaignId: string): SessionFactory {
    this.session.campaignId = campaignId;
    return this;
  }

  withName(name: string): SessionFactory {
    this.session.name = name;
    return this;
  }

  withDescription(description: string): SessionFactory {
    this.session.description = description;
    return this;
  }

  withStatus(status: 'preparing' | 'active' | 'paused' | 'completed' | 'cancelled'): SessionFactory {
    this.session.status = status;
    return this;
  }

  withMode(mode: 'exploration' | 'combat' | 'social' | 'rest' | 'planning'): SessionFactory {
    this.session.mode = mode;
    return this;
  }

  withScheduledStart(startTime: string): SessionFactory {
    this.session.scheduledStartTime = startTime;
    return this;
  }

  withActualTimes(startTime: string, endTime?: string): SessionFactory {
    this.session.actualStartTime = startTime;
    if (endTime) {
      this.session.actualEndTime = endTime;
    }
    return this;
  }

  withDuration(minutes: number): SessionFactory {
    this.session.estimatedDuration = minutes;
    return this;
  }

  withPlayers(playerIds: string[]): SessionFactory {
    this.session.players = [...playerIds];
    return this;
  }

  addPlayer(playerId: string): SessionFactory {
    if (!this.session.players) {
      this.session.players = [];
    }
    this.session.players.push(playerId);
    return this;
  }

  withCharacters(characterIds: string[]): SessionFactory {
    this.session.characterIds = [...characterIds];
    return this;
  }

  addCharacter(characterId: string): SessionFactory {
    if (!this.session.characterIds) {
      this.session.characterIds = [];
    }
    this.session.characterIds.push(characterId);
    return this;
  }

  withGM(gmId: string): SessionFactory {
    this.session.gameMasterId = gmId;
    return this;
  }

  withNotes(notes: string): SessionFactory {
    this.session.notes = notes;
    return this;
  }

  withSessionNumber(number: number): SessionFactory {
    this.session.sessionNumber = number;
    return this;
  }

  withRecording(enabled: boolean): SessionFactory {
    this.session.isRecordingEnabled = enabled;
    return this;
  }

  withCurrentEvent(eventId: string): SessionFactory {
    this.session.currentEventId = eventId;
    return this;
  }

  withCompletedEvents(eventIds: string[]): SessionFactory {
    this.session.completedEvents = [...eventIds];
    return this;
  }

  addCompletedEvent(eventId: string): SessionFactory {
    if (!this.session.completedEvents) {
      this.session.completedEvents = [];
    }
    this.session.completedEvents.push(eventId);
    return this;
  }

  withSessionLog(logEntries: SessionLogEntry[]): SessionFactory {
    this.session.sessionLog = [...logEntries];
    return this;
  }

  addLogEntry(entry: SessionLogEntry): SessionFactory {
    if (!this.session.sessionLog) {
      this.session.sessionLog = [];
    }
    this.session.sessionLog.push(entry);
    return this;
  }

  // ===================================
  // プリセットセッション
  // ===================================

  asPreparing(): SessionFactory {
    return this
      .withStatus('preparing')
      .withMode('planning')
      .withScheduledStart(new Date(Date.now() + 3600000).toISOString()) // 1時間後
      .withDuration(180)
      .withRecording(false);
  }

  asActive(): SessionFactory {
    const now = new Date();
    return this
      .withStatus('active')
      .withMode('exploration')
      .withScheduledStart(new Date(now.getTime() - 900000).toISOString()) // 15分前
      .withActualTimes(new Date(now.getTime() - 600000).toISOString()) // 10分前開始
      .withDuration(180)
      .withRecording(true);
  }

  asCompleted(): SessionFactory {
    const now = new Date();
    const startTime = new Date(now.getTime() - 10800000); // 3時間前
    const endTime = new Date(now.getTime() - 1800000); // 30分前
    
    return this
      .withStatus('completed')
      .withMode('rest')
      .withScheduledStart(startTime.toISOString())
      .withActualTimes(startTime.toISOString(), endTime.toISOString())
      .withDuration(180)
      .withRecording(true)
      .withNotes('セッション完了\n- 全イベント達成\n- 経験値配布済み');
  }

  asCombatSession(): SessionFactory {
    return this
      .asActive()
      .withMode('combat')
      .withName('戦闘セッション')
      .withDescription('敵との戦闘メインのセッション');
  }

  asSocialSession(): SessionFactory {
    return this
      .asActive()
      .withMode('social')
      .withName('社交セッション')
      .withDescription('NPCとの対話や交渉がメインのセッション');
  }

  asOneshot(): SessionFactory {
    return this
      .withStatus('preparing')
      .withMode('exploration')
      .withDuration(360) // 6時間
      .withName('ワンショットセッション')
      .withDescription('1回完結のアドベンチャーセッション')
      .withSessionNumber(1);
  }

  // ===================================
  // ビルドメソッド
  // ===================================

  build(): TRPGSession {
    const session: TRPGSession = {
      id: this.session.id || `factory-session-${++SessionFactory.instanceCounter}`,
      campaignId: this.session.campaignId || 'factory-campaign',
      name: this.session.name || 'ファクトリセッション',
      description: this.session.description || 'ファクトリで生成されたテストセッション',
      status: this.session.status || 'preparing',
      mode: this.session.mode || 'exploration',
      
      scheduledStartTime: this.session.scheduledStartTime || new Date().toISOString(),
      estimatedDuration: this.session.estimatedDuration || 180,
      
      players: this.session.players || [],
      characterIds: this.session.characterIds || [],
      gameMasterId: this.session.gameMasterId || 'factory-gm',
      
      notes: this.session.notes || '',
      sessionNumber: this.session.sessionNumber || 1,
      isRecordingEnabled: this.session.isRecordingEnabled || false,
      
      completedEvents: this.session.completedEvents || [],
      sessionLog: this.session.sessionLog || [],
      
      ...(this.session.actualStartTime && { actualStartTime: this.session.actualStartTime }),
      ...(this.session.actualEndTime && { actualEndTime: this.session.actualEndTime }),
      ...(this.session.currentEventId && { currentEventId: this.session.currentEventId })
    };

    return session;
  }

  buildMultiple(count: number): TRPGSession[] {
    const sessions: TRPGSession[] = [];
    
    for (let i = 0; i < count; i++) {
      const session = this.build();
      session.id = `${session.id}-${i + 1}`;
      session.sessionNumber = i + 1;
      session.name = `${session.name} ${i + 1}`;
      sessions.push(session);
    }
    
    return sessions;
  }

  reset(): SessionFactory {
    this.session = {};
    return this;
  }

  clone(): SessionFactory {
    const newFactory = new SessionFactory();
    newFactory.session = { 
      ...this.session,
      players: this.session.players ? [...this.session.players] : undefined,
      characterIds: this.session.characterIds ? [...this.session.characterIds] : undefined,
      completedEvents: this.session.completedEvents ? [...this.session.completedEvents] : undefined,
      sessionLog: this.session.sessionLog ? [...this.session.sessionLog] : undefined
    };
    return newFactory;
  }

  // ===================================
  // 静的ファクトリメソッド
  // ===================================

  static create(): SessionFactory {
    return new SessionFactory();
  }

  static createPreparing(): SessionFactory {
    return new SessionFactory().asPreparing();
  }

  static createActive(): SessionFactory {
    return new SessionFactory().asActive();
  }

  static createCompleted(): SessionFactory {
    return new SessionFactory().asCompleted();
  }

  static createCombat(): SessionFactory {
    return new SessionFactory().asCombatSession();
  }

  static createSocial(): SessionFactory {
    return new SessionFactory().asSocialSession();
  }

  static createOneshot(): SessionFactory {
    return new SessionFactory().asOneshot();
  }
}

// ===================================
// イベントファクトリ
// ===================================

export class EventFactory {
  private event: Partial<TRPGEvent> = {};
  private static instanceCounter = 0;

  constructor() {
    this.reset();
  }

  withId(id: string): EventFactory {
    this.event.id = id;
    return this;
  }

  withTitle(title: string): EventFactory {
    this.event.title = title;
    return this;
  }

  withDescription(description: string): EventFactory {
    this.event.description = description;
    return this;
  }

  withType(type: 'story' | 'combat' | 'social' | 'exploration' | 'puzzle' | 'rest'): EventFactory {
    this.event.type = type;
    return this;
  }

  withScheduledDate(date: string): EventFactory {
    this.event.scheduledDate = date;
    return this;
  }

  withDuration(minutes: number): EventFactory {
    this.event.duration = minutes;
    return this;
  }

  withActualTimes(startTime: string, endTime?: string): EventFactory {
    this.event.actualStartTime = startTime;
    if (endTime) {
      this.event.actualEndTime = endTime;
    }
    return this;
  }

  withQuest(questId: string): EventFactory {
    this.event.questId = questId;
    return this;
  }

  withLocation(locationId: string): EventFactory {
    this.event.locationId = locationId;
    return this;
  }

  withParticipants(participants: string[]): EventFactory {
    this.event.participants = [...participants];
    return this;
  }

  withDifficulty(difficulty: 'trivial' | 'easy' | 'medium' | 'hard' | 'extreme'): EventFactory {
    this.event.difficulty = difficulty;
    return this;
  }

  withChallengeRating(rating: number): EventFactory {
    this.event.challengeRating = rating;
    return this;
  }

  withOutcomes(outcomes: {
    success: boolean;
    experience: number;
    rewards: string[];
    consequences: string[];
    storyImpact: string[];
  }): EventFactory {
    this.event.outcomes = { ...outcomes };
    return this;
  }

  asAIGenerated(seedPrompt: string): EventFactory {
    this.event.aiGenerated = true;
    this.event.seedPrompt = seedPrompt;
    return this;
  }

  // プリセットイベント
  asCombatEvent(): EventFactory {
    return this
      .withType('combat')
      .withDuration(45)
      .withDifficulty('medium')
      .withChallengeRating(3)
      .withTitle('戦闘イベント')
      .withDescription('敵との戦闘イベント');
  }

  asSocialEvent(): EventFactory {
    return this
      .withType('social')
      .withDuration(20)
      .withDifficulty('easy')
      .withChallengeRating(1)
      .withTitle('社交イベント')
      .withDescription('NPCとの対話イベント');
  }

  asExplorationEvent(): EventFactory {
    return this
      .withType('exploration')
      .withDuration(30)
      .withDifficulty('medium')
      .withChallengeRating(2)
      .withTitle('探索イベント')
      .withDescription('新しい場所の探索イベント');
  }

  asPuzzleEvent(): EventFactory {
    return this
      .withType('puzzle')
      .withDuration(40)
      .withDifficulty('hard')
      .withChallengeRating(4)
      .withTitle('謎解きイベント')
      .withDescription('知恵と推理力を試すパズルイベント');
  }

  build(): TRPGEvent {
    const event: TRPGEvent = {
      id: this.event.id || `factory-event-${++EventFactory.instanceCounter}`,
      title: this.event.title || 'ファクトリイベント',
      description: this.event.description || 'ファクトリで生成されたテストイベント',
      type: this.event.type || 'story',
      
      scheduledDate: this.event.scheduledDate || new Date().toISOString(),
      duration: this.event.duration || 30,
      
      participants: this.event.participants || [],
      
      difficulty: this.event.difficulty || 'medium',
      challengeRating: this.event.challengeRating || 2,
      
      outcomes: this.event.outcomes || {
        success: false,
        experience: 0,
        rewards: [],
        consequences: [],
        storyImpact: []
      },
      
      aiGenerated: this.event.aiGenerated || false,
      
      createdAt: this.event.createdAt || new Date().toISOString(),
      updatedAt: this.event.updatedAt || new Date().toISOString(),
      
      ...(this.event.questId && { questId: this.event.questId }),
      ...(this.event.locationId && { locationId: this.event.locationId }),
      ...(this.event.actualStartTime && { actualStartTime: this.event.actualStartTime }),
      ...(this.event.actualEndTime && { actualEndTime: this.event.actualEndTime }),
      ...(this.event.completedAt && { completedAt: this.event.completedAt }),
      ...(this.event.seedPrompt && { seedPrompt: this.event.seedPrompt })
    };

    return event;
  }

  reset(): EventFactory {
    this.event = {};
    return this;
  }

  static create(): EventFactory {
    return new EventFactory();
  }

  static createCombat(): EventFactory {
    return new EventFactory().asCombatEvent();
  }

  static createSocial(): EventFactory {
    return new EventFactory().asSocialEvent();
  }

  static createExploration(): EventFactory {
    return new EventFactory().asExplorationEvent();
  }

  static createPuzzle(): EventFactory {
    return new EventFactory().asPuzzleEvent();
  }
}

// ===================================
// チャットメッセージファクトリ
// ===================================

export class ChatMessageFactory {
  private message: Partial<ChatMessage> = {};
  private static instanceCounter = 0;

  withId(id: string): ChatMessageFactory {
    this.message.id = id;
    return this;
  }

  withSender(senderId: string, senderName: string, senderType: 'player' | 'gm' | 'system'): ChatMessageFactory {
    this.message.senderId = senderId;
    this.message.senderName = senderName;
    this.message.senderType = senderType;
    return this;
  }

  withContent(content: string): ChatMessageFactory {
    this.message.content = content;
    return this;
  }

  withTimestamp(timestamp: string): ChatMessageFactory {
    this.message.timestamp = timestamp;
    return this;
  }

  asSystemMessage(): ChatMessageFactory {
    this.message.isSystemMessage = true;
    this.message.senderId = 'system';
    this.message.senderName = 'システム';
    this.message.senderType = 'system';
    return this;
  }

  asPlayerMessage(playerId: string, playerName: string): ChatMessageFactory {
    this.message.senderId = playerId;
    this.message.senderName = playerName;
    this.message.senderType = 'player';
    this.message.isSystemMessage = false;
    return this;
  }

  asGMMessage(gmId: string, gmName: string): ChatMessageFactory {
    this.message.senderId = gmId;
    this.message.senderName = gmName;
    this.message.senderType = 'gm';
    this.message.isSystemMessage = false;
    return this;
  }

  build(): ChatMessage {
    return {
      id: this.message.id || `factory-chat-${++ChatMessageFactory.instanceCounter}`,
      senderId: this.message.senderId || 'factory-sender',
      senderName: this.message.senderName || 'ファクトリ送信者',
      senderType: this.message.senderType || 'player',
      content: this.message.content || 'ファクトリで生成されたメッセージ',
      timestamp: this.message.timestamp || new Date().toISOString(),
      isSystemMessage: this.message.isSystemMessage || false
    };
  }

  static create(): ChatMessageFactory {
    return new ChatMessageFactory();
  }

  static createPlayerMessage(playerId: string, playerName: string, content: string): ChatMessage {
    return new ChatMessageFactory()
      .asPlayerMessage(playerId, playerName)
      .withContent(content)
      .build();
  }

  static createGMMessage(gmId: string, gmName: string, content: string): ChatMessage {
    return new ChatMessageFactory()
      .asGMMessage(gmId, gmName)
      .withContent(content)
      .build();
  }

  static createSystemMessage(content: string): ChatMessage {
    return new ChatMessageFactory()
      .asSystemMessage()
      .withContent(content)
      .build();
  }
}

// ===================================
// ダイスロールファクトリ
// ===================================

export class DiceRollFactory {
  private diceRoll: Partial<DiceRoll> = {};
  private static instanceCounter = 0;

  withId(id: string): DiceRollFactory {
    this.diceRoll.id = id;
    return this;
  }

  withPlayer(playerId: string, playerName: string): DiceRollFactory {
    this.diceRoll.playerId = playerId;
    this.diceRoll.playerName = playerName;
    return this;
  }

  withDice(expression: string, result: number, individualRolls: number[], modifier: number = 0): DiceRollFactory {
    this.diceRoll.diceExpression = expression;
    this.diceRoll.result = result;
    this.diceRoll.individualRolls = [...individualRolls];
    this.diceRoll.modifier = modifier;
    return this;
  }

  withPurpose(purpose: string): DiceRollFactory {
    this.diceRoll.purpose = purpose;
    return this;
  }

  withDifficulty(difficulty: number, isSuccess?: boolean): DiceRollFactory {
    this.diceRoll.difficulty = difficulty;
    if (isSuccess !== undefined) {
      this.diceRoll.isSuccess = isSuccess;
    } else {
      this.diceRoll.isSuccess = (this.diceRoll.result || 0) >= difficulty;
    }
    return this;
  }

  withTimestamp(timestamp: string): DiceRollFactory {
    this.diceRoll.timestamp = timestamp;
    return this;
  }

  asCriticalSuccess(): DiceRollFactory {
    this.diceRoll.isCriticalSuccess = true;
    this.diceRoll.isSuccess = true;
    return this;
  }

  asCriticalFailure(): DiceRollFactory {
    this.diceRoll.isCriticalFailure = true;
    this.diceRoll.isSuccess = false;
    return this;
  }

  // プリセットダイス
  asD20Attack(modifier: number = 0): DiceRollFactory {
    const roll = Math.floor(Math.random() * 20) + 1;
    return this
      .withDice(`1d20+${modifier}`, roll + modifier, [roll], modifier)
      .withPurpose('攻撃ロール');
  }

  asD20Skill(modifier: number = 0, difficulty: number = 15): DiceRollFactory {
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + modifier;
    return this
      .withDice(`1d20+${modifier}`, total, [roll], modifier)
      .withPurpose('技能判定')
      .withDifficulty(difficulty, total >= difficulty);
  }

  asDamageRoll(diceCount: number = 1, diceSize: number = 8, modifier: number = 0): DiceRollFactory {
    const rolls = Array.from({ length: diceCount }, () => Math.floor(Math.random() * diceSize) + 1);
    const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;
    return this
      .withDice(`${diceCount}d${diceSize}+${modifier}`, total, rolls, modifier)
      .withPurpose('ダメージロール');
  }

  build(): DiceRoll {
    return {
      id: this.diceRoll.id || `factory-dice-${++DiceRollFactory.instanceCounter}`,
      playerId: this.diceRoll.playerId || 'factory-player',
      playerName: this.diceRoll.playerName || 'ファクトリプレイヤー',
      diceExpression: this.diceRoll.diceExpression || '1d20',
      result: this.diceRoll.result || 10,
      individualRolls: this.diceRoll.individualRolls || [10],
      modifier: this.diceRoll.modifier || 0,
      purpose: this.diceRoll.purpose || 'テストロール',
      timestamp: this.diceRoll.timestamp || new Date().toISOString(),
      isSuccess: this.diceRoll.isSuccess || false,
      difficulty: this.diceRoll.difficulty || 0,
      ...(this.diceRoll.isCriticalSuccess && { isCriticalSuccess: this.diceRoll.isCriticalSuccess }),
      ...(this.diceRoll.isCriticalFailure && { isCriticalFailure: this.diceRoll.isCriticalFailure })
    };
  }

  static create(): DiceRollFactory {
    return new DiceRollFactory();
  }

  static createAttack(playerId: string, playerName: string, modifier: number = 0): DiceRoll {
    return new DiceRollFactory()
      .withPlayer(playerId, playerName)
      .asD20Attack(modifier)
      .build();
  }

  static createSkillCheck(playerId: string, playerName: string, modifier: number = 0, difficulty: number = 15): DiceRoll {
    return new DiceRollFactory()
      .withPlayer(playerId, playerName)
      .asD20Skill(modifier, difficulty)
      .build();
  }

  static createDamage(playerId: string, playerName: string, diceCount: number = 1, diceSize: number = 8, modifier: number = 0): DiceRoll {
    return new DiceRollFactory()
      .withPlayer(playerId, playerName)
      .asDamageRoll(diceCount, diceSize, modifier)
      .build();
  }
}

// ===================================
// エクスポート
// ===================================

export { SessionFactory, EventFactory, ChatMessageFactory, DiceRollFactory };
export default { SessionFactory, EventFactory, ChatMessageFactory, DiceRollFactory };