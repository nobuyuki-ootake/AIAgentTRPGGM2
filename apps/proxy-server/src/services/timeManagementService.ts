import { Database } from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { ID, DayPeriod, GameDay, DayEvent, TurnState, TurnSettings, SessionDurationConfig, DayPeriodConfig } from '@ai-agent-trpg/types';
import { getDatabase } from '../database/database';

export class TimeManagementService {
  private db: Database;

  constructor() {
    this.db = getDatabase();
  }

  // DayPeriodConfigをDayPeriodに変換
  private convertToDayPeriod(config: DayPeriodConfig): DayPeriod {
    return {
      id: config.id,
      name: config.name,
      description: config.description,
      order: config.order,
      actionsAllowed: 1, // 各日単位分割で1アクション
      isRestPeriod: config.id === 'night', // 夜は休息時間
    };
  }

  // SessionDurationConfigから日単位分割システムを生成
  private generateDayPeriods(config: SessionDurationConfig): DayPeriod[] {
    return config.dayPeriods.map(periodConfig => this.convertToDayPeriod(periodConfig));
  }


  // デフォルトの日単位分割システム設定
  private getDefaultDayPeriods(): DayPeriod[] {
    return [
      {
        id: 'morning',
        name: '朝',
        description: '1日の始まり。情報収集や準備に適した時間',
        order: 0,
        actionsAllowed: 1,
        isRestPeriod: false,
      },
      {
        id: 'day',
        name: '昼',
        description: 'メインの活動時間。探索や調査、戦闘など',
        order: 1,
        actionsAllowed: 2,
        isRestPeriod: false,
      },
      {
        id: 'evening',
        name: '夕方',
        description: '社交や情報交換に適した時間',
        order: 2,
        actionsAllowed: 1,
        isRestPeriod: false,
      },
      {
        id: 'night',
        name: '夜',
        description: '休息時間。体力とMPの回復',
        order: 3,
        actionsAllowed: 0,
        isRestPeriod: true,
      },
    ];
  }

  // デフォルトのターン設定
  private getDefaultTurnSettings(): TurnSettings {
    return {
      maxActionsPerDay: 4,
      maxDays: 30,
      dayPeriods: this.getDefaultDayPeriods(),
      autoProgressDay: true,
      restRequired: true,
      simultaneousTurns: false,
    };
  }

  // ターン状態管理
  async initializeTurnState(
    sessionId: ID, 
    campaignId: ID, 
    sessionConfig?: SessionDurationConfig,
    settings?: Partial<TurnSettings>
  ): Promise<TurnState> {
    const id = randomUUID();
    const now = new Date().toISOString();
    
    const defaultSettings = this.getDefaultTurnSettings();
    
    // SessionDurationConfigがある場合はそれを優先
    let finalSettings: TurnSettings;
    if (sessionConfig) {
      const configSettings: Partial<TurnSettings> = {
        maxActionsPerDay: sessionConfig.actionsPerDay,
        maxDays: sessionConfig.totalDays,
        dayPeriods: this.generateDayPeriods(sessionConfig),
      };
      finalSettings = { ...defaultSettings, ...configSettings, ...settings };
    } else {
      finalSettings = { ...defaultSettings, ...settings };
    }

    const turnState: TurnState = {
      id,
      sessionId,
      campaignId,
      currentDay: 1,
      maxDays: finalSettings.maxDays,
      currentPhase: 'planning',
      turnOrder: [],
      phaseStartTime: now,
      settings: finalSettings,
      createdAt: now,
      updatedAt: now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO turn_states (
        id, session_id, campaign_id, current_day, max_days,
        current_phase, active_character_id, turn_order,
        phase_start_time, settings, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      turnState.id,
      turnState.sessionId,
      turnState.campaignId,
      turnState.currentDay,
      turnState.maxDays,
      turnState.currentPhase,
      turnState.activeCharacterId,
      JSON.stringify(turnState.turnOrder),
      turnState.phaseStartTime,
      JSON.stringify(turnState.settings),
      turnState.createdAt,
      turnState.updatedAt,
    ]);

    // 初日を作成
    await this.createGameDay(campaignId, sessionId, 1);

    return turnState;
  }

  async getTurnState(sessionId: ID): Promise<TurnState | null> {
    const stmt = this.db.prepare('SELECT * FROM turn_states WHERE session_id = ?');
    const row = stmt.get(sessionId) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      sessionId: row.session_id,
      campaignId: row.campaign_id,
      currentDay: row.current_day,
      maxDays: row.max_days,
      currentPhase: row.current_phase,
      activeCharacterId: row.active_character_id,
      turnOrder: JSON.parse(row.turn_order),
      phaseStartTime: row.phase_start_time,
      settings: JSON.parse(row.settings),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateTurnState(sessionId: ID, updates: Partial<TurnState>): Promise<TurnState> {
    const existing = await this.getTurnState(sessionId);
    if (!existing) {
      throw new Error('Turn state not found');
    }

    const updated: TurnState = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const stmt = this.db.prepare(`
      UPDATE turn_states SET
        current_day = ?, max_days = ?, current_phase = ?,
        active_character_id = ?, turn_order = ?, phase_start_time = ?,
        settings = ?, updated_at = ?
      WHERE session_id = ?
    `);

    stmt.run([
      updated.currentDay,
      updated.maxDays,
      updated.currentPhase,
      updated.activeCharacterId,
      JSON.stringify(updated.turnOrder),
      updated.phaseStartTime,
      JSON.stringify(updated.settings),
      updated.updatedAt,
      sessionId,
    ]);

    return updated;
  }

  // ゲーム日数管理
  async createGameDay(campaignId: ID, sessionId?: ID, dayNumber?: number): Promise<GameDay> {
    const id = randomUUID();
    const now = new Date().toISOString();

    // 既存の日数を確認して次の日数を決定
    let newDayNumber = dayNumber;
    if (!newDayNumber) {
      const lastDay = await this.getLatestGameDay(campaignId);
      newDayNumber = lastDay ? lastDay.dayNumber + 1 : 1;
    }

    const gameDay: GameDay = {
      id,
      campaignId,
      sessionId,
      dayNumber: newDayNumber,
      currentDayPeriod: 0, // 現在の日単位分割（新フィールド名）
      actionsRemaining: 4, // デフォルト
      isComplete: false,
      events: [],
      createdAt: now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO game_days (
        id, campaign_id, session_id, day_number,
        current_period, remaining_actions, status,
        events, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      gameDay.id,
      gameDay.campaignId,
      gameDay.sessionId,
      gameDay.dayNumber,
      '朝', // current_period: デフォルトで朝から開始
      gameDay.actionsRemaining, // remaining_actions
      'active', // status: is_complete の代わり
      JSON.stringify(gameDay.events),
      gameDay.createdAt,
      now, // updated_at
    ]);

    return gameDay;
  }

  async getGameDay(campaignId: ID, dayNumber: number): Promise<GameDay | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM game_days 
      WHERE campaign_id = ? AND day_number = ?
    `);
    const row = stmt.get(campaignId, dayNumber) as any;
    
    if (!row) return null;

    return this.mapRowToGameDay(row);
  }

  async getLatestGameDay(campaignId: ID): Promise<GameDay | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM game_days 
      WHERE campaign_id = ? 
      ORDER BY day_number DESC 
      LIMIT 1
    `);
    const row = stmt.get(campaignId) as any;
    
    if (!row) return null;

    return this.mapRowToGameDay(row);
  }

  async getCurrentGameDay(campaignId: ID): Promise<GameDay | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM game_days 
      WHERE campaign_id = ? AND status = 'active'
      ORDER BY day_number ASC 
      LIMIT 1
    `);
    const row = stmt.get(campaignId) as any;
    
    if (!row) return null;

    return this.mapRowToGameDay(row);
  }

  private mapRowToGameDay(row: any): GameDay {
    return {
      id: row.id,
      campaignId: row.campaign_id,
      sessionId: row.session_id,
      dayNumber: row.day_number,
      currentDayPeriod: row.current_time_slot, // DBの古いカラム名から新フィールド名にマッピング
      actionsRemaining: row.actions_remaining,
      isComplete: row.is_complete === 1,
      events: JSON.parse(row.events),
      createdAt: row.created_at,
      completedAt: row.completed_at,
    };
  }

  // アクション実行
  async executeAction(
    campaignId: ID, 
    characterId: ID, 
    actionDescription: string, 
    metadata: Record<string, any> = {}
  ): Promise<{ success: boolean; actionsRemaining: number; message: string }> {
    const currentDay = await this.getCurrentGameDay(campaignId);
    if (!currentDay) {
      throw new Error('No active game day found');
    }

    if (currentDay.actionsRemaining <= 0) {
      return {
        success: false,
        actionsRemaining: 0,
        message: '本日の行動回数を使い切りました。時間を進めてください。'
      };
    }

    // アクションを記録
    const event: DayEvent = {
      id: crypto.randomUUID(),
      type: 'action',
      description: actionDescription,
      dayPeriod: currentDay.currentDayPeriod, // 新フィールド名に更新
      characterId,
      metadata,
      timestamp: new Date().toISOString(),
    };

    await this.addDayEvent(currentDay.id, event);

    // 行動回数を減らす
    const newActionsRemaining = currentDay.actionsRemaining - 1;
    await this.updateGameDay(currentDay.id, {
      actionsRemaining: newActionsRemaining,
    });

    return {
      success: true,
      actionsRemaining: newActionsRemaining,
      message: `アクション実行: ${actionDescription}`
    };
  }

  // 時間進行
  async advanceTime(campaignId: ID): Promise<{ newDayPeriod: number; newDay?: number; message: string }> {
    const currentDay = await this.getCurrentGameDay(campaignId);
    if (!currentDay) {
      throw new Error('No active game day found');
    }

    const turnState = await this.getTurnStateByCompaign(campaignId);
    const dayPeriods = turnState?.settings.dayPeriods || this.getDefaultDayPeriods();

    let newDayPeriod = currentDay.currentDayPeriod + 1;
    let newDay: number | undefined;
    let message = '';

    // 日単位分割進行
    if (newDayPeriod >= dayPeriods.length) {
      // 日付変更
      await this.updateGameDay(currentDay.id, {
        isComplete: true,
        completedAt: new Date().toISOString(),
      });

      newDay = currentDay.dayNumber + 1;
      
      // 最大日数チェック
      if (turnState && newDay > turnState.maxDays) {
        message = 'キャンペーン期間が終了しました！';
        return { newDayPeriod: 0, newDay, message };
      }

      // 新しい日を作成
      await this.createGameDay(campaignId, currentDay.sessionId, newDay);
      newDayPeriod = 0;
      message = `${newDay}日目が始まりました`;
    } else {
      // 日単位分割更新
      await this.updateGameDay(currentDay.id, {
        currentDayPeriod: newDayPeriod,
      });

      const currentPeriod = dayPeriods.find(period => period.order === newDayPeriod);
      message = currentPeriod ? `${currentPeriod.name}になりました` : '時間が進みました';
    }

    return { newDayPeriod, newDay, message };
  }

  // 休息実行
  async takeRest(campaignId: ID): Promise<{ success: boolean; message: string }> {
    const currentDay = await this.getCurrentGameDay(campaignId);
    if (!currentDay) {
      throw new Error('No active game day found');
    }

    const turnState = await this.getTurnStateByCompaign(campaignId);
    const dayPeriods = turnState?.settings.dayPeriods || this.getDefaultDayPeriods();
    const currentPeriod = dayPeriods.find(period => period.order === currentDay.currentDayPeriod);

    if (!currentPeriod?.isRestPeriod) {
      return {
        success: false,
        message: '現在の時間帯では休息できません。'
      };
    }

    // 休息イベントを記録
    const event: DayEvent = {
      id: crypto.randomUUID(),
      type: 'rest',
      description: '休息を取りました。HPとMPが回復します。',
      dayPeriod: currentDay.currentDayPeriod, // 新フィールド名に更新
      metadata: { recovered: true },
      timestamp: new Date().toISOString(),
    };

    await this.addDayEvent(currentDay.id, event);

    return {
      success: true,
      message: '休息を取りました。体力が回復しました。'
    };
  }

  // ヘルパーメソッド
  async getTurnStateByCompaign(campaignId: ID): Promise<TurnState | null> {
    const stmt = this.db.prepare('SELECT * FROM turn_states WHERE campaign_id = ? ORDER BY created_at DESC LIMIT 1');
    const row = stmt.get(campaignId) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      sessionId: row.session_id,
      campaignId: row.campaign_id,
      currentDay: row.current_day,
      maxDays: row.max_days,
      currentPhase: row.current_phase,
      activeCharacterId: row.active_character_id,
      turnOrder: JSON.parse(row.turn_order),
      phaseStartTime: row.phase_start_time,
      settings: JSON.parse(row.settings),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async addDayEvent(dayId: ID, event: DayEvent): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO day_events (
        id, day_id, type, description, time_slot,
        character_id, metadata, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      event.id,
      dayId,
      event.type,
      event.description,
      event.dayPeriod, // 新フィールド名を使用、DBの古いカラム名にマッピング
      event.characterId,
      JSON.stringify(event.metadata),
      event.timestamp,
    ]);
  }

  async updateGameDay(dayId: ID, updates: Partial<GameDay>): Promise<void> {
    const fields = [];
    const values = [];

    // 新フィールド名 currentDayPeriod を優先、下位互換性のため currentTimeSlot も対応
    if (updates.currentDayPeriod !== undefined) {
      fields.push('current_time_slot = ?'); // DBは古いカラム名のまま
      values.push(updates.currentDayPeriod);
    }
    if (updates.actionsRemaining !== undefined) {
      fields.push('actions_remaining = ?');
      values.push(updates.actionsRemaining);
    }
    if (updates.isComplete !== undefined) {
      fields.push('is_complete = ?');
      values.push(updates.isComplete ? 1 : 0);
    }
    if (updates.completedAt !== undefined) {
      fields.push('completed_at = ?');
      values.push(updates.completedAt);
    }

    if (fields.length === 0) return;

    values.push(dayId);
    const stmt = this.db.prepare(`UPDATE game_days SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(values);
  }

  // キャンペーン終了判定
  async checkCampaignEnd(campaignId: ID): Promise<{ isEnded: boolean; reason?: string }> {
    const turnState = await this.getTurnStateByCompaign(campaignId);
    if (!turnState) {
      return { isEnded: false };
    }

    if (turnState.currentDay > turnState.maxDays) {
      return { 
        isEnded: true, 
        reason: `期間終了（${turnState.maxDays}日経過）`
      };
    }

    return { isEnded: false };
  }
}

// Lazy initialization to avoid early instantiation
let _timeManagementService: TimeManagementService | null = null;
export function getTimeManagementService(): TimeManagementService {
  if (!_timeManagementService) {
    _timeManagementService = new TimeManagementService();
  }
  return _timeManagementService;
}