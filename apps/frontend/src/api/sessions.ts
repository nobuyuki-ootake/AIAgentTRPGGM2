import { SessionState } from '@ai-agent-trpg/types';
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
  async updateSessionStatus(id: string, status: string): Promise<SessionState> {
    return apiClient.patch<SessionState>(`/sessions/${id}/status`, { status });
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
  async pollSession(sessionId: string, callback: (session: SessionState) => void, interval: number = 2000): Promise<() => void> {
    let isPolling = true;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const poll = async () => {
      if (!isPolling) return;
      
      try {
        const session = await this.getSessionById(sessionId);
        if (isPolling) {
          callback(session);
        }
      } catch (error) {
        console.error('Session polling error:', error);
        // エラーが発生してもポーリングを続行
      }
      
      if (isPolling) {
        timeoutId = setTimeout(poll, interval);
      }
    };

    // 最初のポーリングを開始
    timeoutId = setTimeout(poll, 100);

    // ポーリング停止用の関数を返す
    return () => {
      isPolling = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
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