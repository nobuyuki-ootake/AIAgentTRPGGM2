import { SessionState, SessionDurationConfig, SESSION_DURATION_PRESETS } from '@ai-agent-trpg/types';
import { apiClient } from './client';

interface ChatMessage {
  speaker: string;
  characterId?: string;
  message: string;
  type?: 'ic' | 'ooc' | 'system' | 'dice' | 'whisper';
  recipients?: string[];
}

interface DiceRoll {
  roller: string;
  characterId?: string;
  dice: string;
  purpose?: string;
  target?: number;
}

interface CombatParticipant {
  characterId: string;
  initiative: number;
}

class SessionAPI {
  // セッション一覧取得（キャンペーン別）
  async getSessionsByCampaign(campaignId: string): Promise<SessionState[]> {
    return apiClient.get<SessionState[]>(`/sessions?campaignId=${campaignId}`);
  }

  // セッション詳細取得
  async getSessionById(id: string): Promise<SessionState> {
    return apiClient.get<SessionState>(`/sessions/${id}`);
  }

  // セッション作成
  async createSession(sessionData: Partial<SessionState> & { campaignId: string }): Promise<SessionState> {
    return apiClient.post<SessionState>('/sessions', sessionData);
  }

  // セッション状態更新
  async updateSessionStatus(id: string, status: string, timeConfig?: SessionDurationConfig): Promise<SessionState> {
    return apiClient.patch<SessionState>(`/sessions/${id}/status`, { status, timeConfig });
  }

  // チャットメッセージ送信
  async sendChatMessage(sessionId: string, message: ChatMessage): Promise<SessionState> {
    return apiClient.post<SessionState>(`/sessions/${sessionId}/chat`, message);
  }

  // ダイスロール
  async rollDice(sessionId: string, diceData: DiceRoll): Promise<SessionState> {
    return apiClient.post<SessionState>(`/sessions/${sessionId}/dice-roll`, diceData);
  }

  // 戦闘開始
  async startCombat(sessionId: string, participants: CombatParticipant[]): Promise<SessionState> {
    return apiClient.post<SessionState>(`/sessions/${sessionId}/combat/start`, { participants });
  }

  // 戦闘終了
  async endCombat(sessionId: string): Promise<SessionState> {
    return apiClient.post<SessionState>(`/sessions/${sessionId}/combat/end`);
  }

  // セッション更新のポーリング（リアルタイム更新の簡易実装）
  async pollSession(sessionId: string, callback: (session: SessionState) => void, interval: number = 10000): Promise<() => void> {
    let isPolling = true;
    let timeoutId: number | null = null;
    let consecutiveFailures = 0;
    const maxFailures = 3;
    
    const poll = async () => {
      if (!isPolling) return;
      
      try {
        const session = await this.getSessionById(sessionId);
        if (isPolling) {
          callback(session);
          consecutiveFailures = 0; // リセット on success
        }
      } catch (error) {
        consecutiveFailures++;
        console.error(`Session polling error (${consecutiveFailures}/${maxFailures}):`, error);
        
        // 連続失敗が多い場合はポーリングを停止
        if (consecutiveFailures >= maxFailures) {
          console.log(`🚫 Stopping polling due to ${maxFailures} consecutive failures`);
          isPolling = false;
          return;
        }
        
        // ネットワークエラーの場合は間隔を延長
        if (error instanceof Error && error.message.includes('Network')) {
          interval = Math.min(interval * 1.5, 30000); // 最大30秒まで延長
          console.log(`📡 Network error detected, extending polling interval to ${interval}ms`);
        }
      }
      
      if (isPolling) {
        timeoutId = setTimeout(poll, interval);
      }
    };

    // 最初のポーリングを開始（少し遅延を入れる）
    timeoutId = setTimeout(poll, 1000);

    // ポーリング停止用の関数を返す
    return () => {
      isPolling = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      console.log('📡 Session polling stopped');
    };
  }

  // モックセッション作成（開発用）
  createMockSession(campaignId: string): Partial<SessionState> & { campaignId: string } {
    return {
      campaignId,
      sessionNumber: 1,
      status: 'preparing',
      mode: 'exploration',
      participants: [],
      gamemaster: 'テストGM',
      eventQueue: [],
      completedEvents: [],
      chatLog: [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          speaker: 'System',
          message: 'セッションが作成されました',
          type: 'system',
        },
      ],
      diceRolls: [],
      notes: {
        gm: '',
        players: {},
        shared: '',
      },
      // デフォルトのセッション期間設定（中時間プレイ - ユーザー満足度が最も高い想定）
      durationConfig: SESSION_DURATION_PRESETS.medium,
    };
  }

  // ダイス表記のパース（クライアントサイド用）
  parseDiceNotation(notation: string): { count: number; sides: number; modifier: number } | null {
    const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
    if (!match) return null;

    return {
      count: parseInt(match[1]),
      sides: parseInt(match[2]),
      modifier: match[3] ? parseInt(match[3]) : 0,
    };
  }

  // ダイスロールのシミュレーション（UIプレビュー用）
  simulateDiceRoll(notation: string): { results: number[]; total: number } | null {
    const parsed = this.parseDiceNotation(notation);
    if (!parsed) return null;

    const results: number[] = [];
    for (let i = 0; i < parsed.count; i++) {
      results.push(Math.floor(Math.random() * parsed.sides) + 1);
    }

    const total = results.reduce((sum, roll) => sum + roll, 0) + parsed.modifier;

    return { results, total };
  }
}

export const sessionAPI = new SessionAPI();