import { v4 as uuidv4 } from 'uuid';
import { SessionState, TRPGCharacter } from '@ai-agent-trpg/types';
import { getDatabase, withTransaction } from '../database/database';
import { DatabaseError, ValidationError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { getCharacterService } from './characterService';
import { Server as SocketIOServer } from 'socket.io';

// Use types from SessionState.chatLog and SessionState.diceRolls
type ChatMessage = SessionState['chatLog'][0];
type DiceRoll = SessionState['diceRolls'][0];

class SessionService {
  private io: SocketIOServer | null = null;

  /**
   * Socket.IOインスタンスを設定
   */
  setSocketIO(io: SocketIOServer): void {
    this.io = io;
    logger.info('SessionService initialized with Socket.IO server');
  }

  async getSessionsByCampaign(campaignId: string): Promise<SessionState[]> {
    const db = getDatabase();
    
    try {
      const rows = db.prepare(`
        SELECT * FROM sessions 
        WHERE campaign_id = ? 
        ORDER BY session_number DESC
      `).all(campaignId) as any[];
      
      return rows.map(this.mapRowToSession);
      
    } catch (error) {
      logger.error(`Failed to get sessions for campaign ${campaignId}:`, error);
      throw new DatabaseError('Failed to retrieve sessions', { error, campaignId });
    }
  }

  async getSessionById(id: string): Promise<SessionState | null> {
    const db = getDatabase();
    
    try {
      const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as any;
      
      if (!row) {
        return null;
      }
      
      return this.mapRowToSession(row);
      
    } catch (error) {
      logger.error(`Failed to get session ${id}:`, error);
      throw new DatabaseError('Failed to retrieve session', { error, sessionId: id });
    }
  }

  async createSession(sessionData: Partial<SessionState>): Promise<SessionState> {
    if (!sessionData.campaignId) {
      throw new ValidationError('Campaign ID is required');
    }

    const now = new Date().toISOString();

    // 次のセッション番号を取得
    const sessionNumber = await this.getNextSessionNumber(sessionData.campaignId);

    const session: SessionState = {
      id: uuidv4(),
      campaignId: sessionData.campaignId,
      sessionNumber,
      status: sessionData.status || 'preparing',
      mode: sessionData.mode || 'exploration',
      participants: sessionData.participants || [],
      gamemaster: sessionData.gamemaster || '',
      startTime: sessionData.startTime,
      endTime: sessionData.endTime,
      breaks: [],
      currentEvent: sessionData.currentEvent,
      eventQueue: sessionData.eventQueue || [],
      completedEvents: [],
      combat: sessionData.combat,
      chatLog: [],
      diceRolls: [],
      notes: {
        gm: '',
        players: {},
        shared: '',
      },
      createdAt: now,
      updatedAt: now,
    };

    return withTransaction((db) => {
      try {
        db.prepare(`
          INSERT INTO sessions (
            id, campaign_id, session_number, status, mode, participants,
            gamemaster, start_time, end_time, breaks, current_event,
            event_queue, completed_events, combat, chat_log, dice_rolls,
            notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          session.id,
          session.campaignId,
          session.sessionNumber,
          session.status,
          session.mode,
          JSON.stringify(session.participants),
          session.gamemaster,
          session.startTime || null,
          session.endTime || null,
          JSON.stringify(session.breaks),
          session.currentEvent || null,
          JSON.stringify(session.eventQueue),
          JSON.stringify(session.completedEvents),
          session.combat ? JSON.stringify(session.combat) : null,
          JSON.stringify(session.chatLog),
          JSON.stringify(session.diceRolls),
          JSON.stringify(session.notes),
          session.createdAt,
          session.updatedAt
        );

        logger.info(`Session created: ${session.id} - Session ${session.sessionNumber} for campaign ${session.campaignId}`);
        return session;
        
      } catch (error) {
        logger.error('Failed to create session:', error);
        throw new DatabaseError('Failed to create session', { error });
      }
    });
  }

  async updateSessionStatus(id: string, status: string): Promise<SessionState | null> {
    const validStatuses = ['preparing', 'active', 'paused', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Invalid status: ${status}. Valid statuses: ${validStatuses.join(', ')}`);
    }

    const db = getDatabase();
    const now = new Date().toISOString();
    
    try {
      const session = await this.getSessionById(id);
      if (!session) {
        return null;
      }

      // ステータス変更時の自動処理
      if (status === 'active' && session.status === 'preparing') {
        session.startTime = now;
      } else if (status === 'completed' && session.status === 'active') {
        session.endTime = now;
      }

      session.status = status as any;
      session.updatedAt = now;

      db.prepare(`
        UPDATE sessions SET 
          status = ?, start_time = ?, end_time = ?, updated_at = ?
        WHERE id = ?
      `).run(
        session.status,
        session.startTime || null,
        session.endTime || null,
        session.updatedAt,
        id
      );

      logger.info(`Session status updated: ${id} -> ${status}`);
      return session;
      
    } catch (error) {
      logger.error(`Failed to update session status ${id}:`, error);
      throw new DatabaseError('Failed to update session status', { error, sessionId: id });
    }
  }

  async addChatMessage(sessionId: string, messageData: Partial<ChatMessage>): Promise<SessionState | null> {
    if (!messageData.speaker || !messageData.message) {
      throw new ValidationError('Speaker and message are required');
    }

    const session = await this.getSessionById(sessionId);
    if (!session) {
      return null;
    }

    const chatMessage: ChatMessage = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      speaker: messageData.speaker,
      characterId: messageData.characterId,
      message: messageData.message,
      type: messageData.type || 'ic',
      recipients: messageData.recipients,
    };

    session.chatLog.push(chatMessage);
    session.updatedAt = new Date().toISOString();

    return this.updateSessionData(sessionId, {
      chatLog: session.chatLog,
      updatedAt: session.updatedAt,
    });
  }

  async addDiceRoll(sessionId: string, diceData: Partial<DiceRoll>): Promise<SessionState | null> {
    if (!diceData.roller || !diceData.dice) {
      throw new ValidationError('Roller and dice are required');
    }

    const session = await this.getSessionById(sessionId);
    if (!session) {
      return null;
    }

    // ダイスロールの計算
    const rollResults = this.calculateDiceRoll(diceData.dice);

    const diceRoll: DiceRoll = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      roller: diceData.roller,
      characterId: diceData.characterId,
      dice: diceData.dice,
      results: rollResults.results,
      total: rollResults.total,
      purpose: diceData.purpose || 'General roll',
      target: diceData.target,
      success: diceData.target ? rollResults.total >= diceData.target : undefined,
    };

    session.diceRolls.push(diceRoll);
    session.updatedAt = new Date().toISOString();

    // システムメッセージとしてチャットログにも追加
    const systemMessage: ChatMessage = {
      id: uuidv4(),
      timestamp: diceRoll.timestamp,
      speaker: 'System',
      message: this.formatDiceRollMessage(diceRoll),
      type: 'system',
    };

    session.chatLog.push(systemMessage);

    return this.updateSessionData(sessionId, {
      diceRolls: session.diceRolls,
      chatLog: session.chatLog,
      updatedAt: session.updatedAt,
    });
  }

  async startCombat(sessionId: string, participants: Array<{ characterId: string; initiative: number }>): Promise<SessionState | null> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      return null;
    }

    // イニシアチブ順でソート
    const turnOrder = participants
      .sort((a, b) => b.initiative - a.initiative)
      .map(p => ({
        characterId: p.characterId,
        initiative: p.initiative,
        hasActed: false,
      }));

    const combat = {
      active: true,
      currentTurn: 0,
      turnOrder,
      round: 1,
      conditions: [],
    };

    session.mode = 'combat';
    session.combat = combat;
    session.updatedAt = new Date().toISOString();

    return this.updateSessionData(sessionId, {
      mode: session.mode,
      combat: session.combat,
      updatedAt: session.updatedAt,
    });
  }

  async endCombat(sessionId: string): Promise<SessionState | null> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      return null;
    }

    session.mode = 'exploration';
    session.combat = undefined;
    session.updatedAt = new Date().toISOString();

    return this.updateSessionData(sessionId, {
      mode: session.mode,
      combat: session.combat,
      updatedAt: session.updatedAt,
    });
  }

  /**
   * セッションの仲間キャラクター（NPC companions）を取得
   */
  async getSessionCompanions(sessionId: string): Promise<TRPGCharacter[]> {
    try {
      const session = await this.getSessionById(sessionId);
      if (!session) {
        return [];
      }

      // キャンペーンの全キャラクターを取得
      const allCharacters = await getCharacterService().getCharactersByCampaign(session.campaignId);
      
      // 仲間キャラクターを抽出（NPCタイプで重要度が高く、敵対的でない）
      const companions = allCharacters.filter(character => {
        if (character.characterType !== 'NPC') {
          return false;
        }
        
        // アクティブな仲間のみ（NPCCharacterとしてキャスト）
        const npcCharacter = character as any;
        return npcCharacter.isActive !== false;
      });

      return companions as any[];
      
    } catch (error) {
      logger.error(`Failed to get session companions for session ${sessionId}:`, error);
      return [];
    }
  }

  private async updateSessionData(sessionId: string, updates: Partial<SessionState>): Promise<SessionState | null> {
    const db = getDatabase();
    
    try {
      const session = await this.getSessionById(sessionId);
      if (!session) {
        return null;
      }

      const updatedSession = { ...session, ...updates };

      db.prepare(`
        UPDATE sessions SET
          status = ?, mode = ?, participants = ?, gamemaster = ?,
          start_time = ?, end_time = ?, breaks = ?, current_event = ?,
          event_queue = ?, completed_events = ?, combat = ?, chat_log = ?,
          dice_rolls = ?, notes = ?, updated_at = ?
        WHERE id = ?
      `).run(
        updatedSession.status,
        updatedSession.mode,
        JSON.stringify(updatedSession.participants),
        updatedSession.gamemaster,
        updatedSession.startTime || null,
        updatedSession.endTime || null,
        JSON.stringify(updatedSession.breaks),
        updatedSession.currentEvent || null,
        JSON.stringify(updatedSession.eventQueue),
        JSON.stringify(updatedSession.completedEvents),
        updatedSession.combat ? JSON.stringify(updatedSession.combat) : null,
        JSON.stringify(updatedSession.chatLog),
        JSON.stringify(updatedSession.diceRolls),
        JSON.stringify(updatedSession.notes),
        updatedSession.updatedAt,
        sessionId
      );

      // WebSocketでセッション更新をブロードキャスト
      if (this.io) {
        this.io.to(`session-${sessionId}`).emit('session-updated', {
          sessionId: sessionId,
          updatedData: updates,
          timestamp: new Date().toISOString(),
        });
        
        // チャットログが更新された場合は専用イベントも送信
        if (updates.chatLog) {
          const latestMessage = updates.chatLog[updates.chatLog.length - 1];
          this.io.to(`session-${sessionId}`).emit('chat-message', {
            sessionId: sessionId,
            message: latestMessage,
            timestamp: new Date().toISOString(),
          });
          logger.info(`💬 WebSocket: Chat message broadcasted to session ${sessionId}`);
        }
        
        logger.info(`📡 WebSocket: Session update broadcasted to session ${sessionId}`);
      } else {
        logger.warn('⚠️ WebSocket: No Socket.IO instance available for broadcasting');
      }

      return updatedSession;
      
    } catch (error) {
      logger.error(`Failed to update session ${sessionId}:`, error);
      throw new DatabaseError('Failed to update session', { error, sessionId });
    }
  }

  private async getNextSessionNumber(campaignId: string): Promise<number> {
    const db = getDatabase();
    
    const result = db.prepare(`
      SELECT MAX(session_number) as max_number 
      FROM sessions 
      WHERE campaign_id = ?
    `).get(campaignId) as { max_number: number | null };
    
    return (result.max_number || 0) + 1;
  }

  private calculateDiceRoll(diceString: string): { results: number[]; total: number } {
    // 基本的なダイスロール計算（例: "2d6+3", "1d20", "3d8-1"）
    const match = diceString.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
    if (!match) {
      throw new ValidationError(`Invalid dice format: ${diceString}`);
    }

    const numDice = parseInt(match[1]);
    const dieSize = parseInt(match[2]);
    const modifier = match[3] ? parseInt(match[3]) : 0;

    const results: number[] = [];
    for (let i = 0; i < numDice; i++) {
      results.push(Math.floor(Math.random() * dieSize) + 1);
    }

    const total = results.reduce((sum, roll) => sum + roll, 0) + modifier;

    return { results, total };
  }

  private formatDiceRollMessage(roll: DiceRoll): string {
    const resultText = roll.results.join(', ');
    const modifierMatch = roll.dice.match(/([+-]\d+)$/);
    const modifier = modifierMatch ? modifierMatch[1] : '';
    
    let message = `🎲 ${roll.roller} rolled ${roll.dice}: [${resultText}]${modifier ? ` ${modifier}` : ''} = ${roll.total}`;
    
    if (roll.purpose !== 'General roll') {
      message += ` (${roll.purpose})`;
    }
    
    if (roll.target !== undefined) {
      message += ` vs ${roll.target} - ${roll.success ? '✅ Success' : '❌ Failure'}`;
    }
    
    return message;
  }

  private mapRowToSession(row: any): SessionState {
    return {
      id: row.id,
      campaignId: row.campaign_id,
      sessionNumber: row.session_number,
      status: row.status,
      mode: row.mode,
      participants: JSON.parse(row.participants),
      gamemaster: row.gamemaster,
      startTime: row.start_time,
      endTime: row.end_time,
      breaks: JSON.parse(row.breaks),
      currentEvent: row.current_event,
      eventQueue: JSON.parse(row.event_queue),
      completedEvents: JSON.parse(row.completed_events),
      combat: row.combat ? JSON.parse(row.combat) : undefined,
      chatLog: JSON.parse(row.chat_log),
      diceRolls: JSON.parse(row.dice_rolls),
      notes: JSON.parse(row.notes),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Lazy initialization to avoid early instantiation
let _sessionService: SessionService | null = null;
export function getSessionService(): SessionService {
  if (!_sessionService) {
    _sessionService = new SessionService();
  }
  return _sessionService;
}