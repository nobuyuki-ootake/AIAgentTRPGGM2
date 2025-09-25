/**
 * スタブ: WebSocketサービスの最小限実装
 * t-WADA命名規則: stubWebSocketService.ts
 * 本番型定義（@ai-agent-trpg/types）を使用
 * 
 * 用途: リアルタイム通信を持つコンポーネントのテスト、WebSocket依存の代替実装
 */

import { 
  ChatMessage, 
  DiceRoll, 
  SessionState,
  PartyLocation,
  MovementProposal 
} from '@ai-agent-trpg/types';

// ===================================
// WebSocketイベント型定義
// ===================================

export type WebSocketEventType = 
  | 'chat_message'
  | 'dice_roll' 
  | 'session_state_update'
  | 'party_location_update'
  | 'movement_proposal'
  | 'player_join'
  | 'player_leave'
  | 'session_start'
  | 'session_end'
  | 'system_message';

export interface WebSocketEvent<T = any> {
  type: WebSocketEventType;
  data: T;
  timestamp: string;
  sessionId: string;
  senderId?: string;
}

export type WebSocketEventListener<T = any> = (event: WebSocketEvent<T>) => void;

// ===================================
// WebSocketスタブクラス
// ===================================

export class StubWebSocketService {
  private isConnected: boolean = false;
  private listeners: Map<WebSocketEventType, Set<WebSocketEventListener>> = new Map();
  private connectionDelay: number = 100; // ms
  private messageDelay: number = 50; // ms
  private failureRate: number = 0; // 0-1の失敗率
  private shouldAutoReconnect: boolean = true;
  private currentSessionId: string | null = null;

  constructor(options?: {
    connectionDelay?: number;
    messageDelay?: number;
    failureRate?: number;
    autoReconnect?: boolean;
  }) {
    if (options) {
      this.connectionDelay = options.connectionDelay ?? 100;
      this.messageDelay = options.messageDelay ?? 50;
      this.failureRate = options.failureRate ?? 0;
      this.shouldAutoReconnect = options.autoReconnect ?? true;
    }
  }

  // ===================================
  // 接続管理
  // ===================================

  async connect(sessionId: string): Promise<boolean> {
    await this.simulateDelay(this.connectionDelay);
    
    if (this.shouldFail()) {
      return false;
    }

    this.isConnected = true;
    this.currentSessionId = sessionId;

    // 接続成功イベントをシミュレート
    setTimeout(() => {
      this.emitEvent('system_message', {
        content: 'WebSocket接続が確立されました（スタブ）',
        timestamp: new Date().toISOString()
      });
    }, 10);

    return true;
  }

  async disconnect(): Promise<void> {
    await this.simulateDelay(50);
    
    this.isConnected = false;
    this.currentSessionId = null;

    // 切断イベントをシミュレート
    this.emitEvent('system_message', {
      content: 'WebSocket接続が切断されました（スタブ）',
      timestamp: new Date().toISOString()
    });
  }

  isConnectionOpen(): boolean {
    return this.isConnected;
  }

  // ===================================
  // メッセージ送信
  // ===================================

  async sendChatMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<boolean> {
    if (!this.isConnected || !this.currentSessionId) {
      return false;
    }

    await this.simulateDelay(this.messageDelay);
    
    if (this.shouldFail()) {
      return false;
    }

    const fullMessage: ChatMessage = {
      ...message,
      id: `stub-msg-${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    // 他のクライアントへのブロードキャストをシミュレート
    setTimeout(() => {
      this.emitEvent('chat_message', fullMessage);
    }, 10);

    return true;
  }

  async sendDiceRoll(diceRoll: Omit<DiceRoll, 'id' | 'timestamp'>): Promise<boolean> {
    if (!this.isConnected || !this.currentSessionId) {
      return false;
    }

    await this.simulateDelay(this.messageDelay);
    
    if (this.shouldFail()) {
      return false;
    }

    const fullDiceRoll: DiceRoll = {
      ...diceRoll,
      id: `stub-dice-${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    setTimeout(() => {
      this.emitEvent('dice_roll', fullDiceRoll);
    }, 10);

    return true;
  }

  async updateSessionState(sessionState: Partial<SessionState>): Promise<boolean> {
    if (!this.isConnected || !this.currentSessionId) {
      return false;
    }

    await this.simulateDelay(this.messageDelay);
    
    if (this.shouldFail()) {
      return false;
    }

    setTimeout(() => {
      this.emitEvent('session_state_update', sessionState);
    }, 10);

    return true;
  }

  async updatePartyLocation(location: PartyLocation): Promise<boolean> {
    if (!this.isConnected || !this.currentSessionId) {
      return false;
    }

    await this.simulateDelay(this.messageDelay);
    
    if (this.shouldFail()) {
      return false;
    }

    setTimeout(() => {
      this.emitEvent('party_location_update', location);
    }, 10);

    return true;
  }

  async sendMovementProposal(proposal: MovementProposal): Promise<boolean> {
    if (!this.isConnected || !this.currentSessionId) {
      return false;
    }

    await this.simulateDelay(this.messageDelay);
    
    if (this.shouldFail()) {
      return false;
    }

    setTimeout(() => {
      this.emitEvent('movement_proposal', proposal);
    }, 10);

    return true;
  }

  // ===================================
  // イベントリスナー管理
  // ===================================

  addEventListener<T>(
    eventType: WebSocketEventType, 
    listener: WebSocketEventListener<T>
  ): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener as WebSocketEventListener);
  }

  removeEventListener<T>(
    eventType: WebSocketEventType, 
    listener: WebSocketEventListener<T>
  ): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.delete(listener as WebSocketEventListener);
    }
  }

  removeAllEventListeners(eventType?: WebSocketEventType): void {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }

  // ===================================
  // テスト用ヘルパー
  // ===================================

  // 外部からイベントを発火させる（テスト用）
  simulateIncomingEvent<T>(eventType: WebSocketEventType, data: T): void {
    if (!this.currentSessionId) {
      return;
    }

    const event: WebSocketEvent<T> = {
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
      sessionId: this.currentSessionId,
      senderId: 'stub-sender'
    };

    this.emitEvent(eventType, data);
  }

  // チャットメッセージの受信をシミュレート
  simulateIncomingChatMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): void {
    const fullMessage: ChatMessage = {
      ...message,
      id: `stub-incoming-${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    this.simulateIncomingEvent('chat_message', fullMessage);
  }

  // ダイスロールの受信をシミュレート
  simulateIncomingDiceRoll(diceRoll: Omit<DiceRoll, 'id' | 'timestamp'>): void {
    const fullDiceRoll: DiceRoll = {
      ...diceRoll,
      id: `stub-incoming-dice-${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    this.simulateIncomingEvent('dice_roll', fullDiceRoll);
  }

  // プレイヤーの参加をシミュレート
  simulatePlayerJoin(playerId: string, playerName: string): void {
    this.simulateIncomingEvent('player_join', {
      playerId,
      playerName,
      timestamp: new Date().toISOString()
    });
  }

  // プレイヤーの離脱をシミュレート
  simulatePlayerLeave(playerId: string, playerName: string): void {
    this.simulateIncomingEvent('player_leave', {
      playerId,
      playerName,
      timestamp: new Date().toISOString()
    });
  }

  // 接続エラーをシミュレート
  simulateConnectionError(): void {
    this.isConnected = false;
    this.emitEvent('system_message', {
      content: 'WebSocket接続エラーが発生しました（スタブ）',
      timestamp: new Date().toISOString(),
      error: true
    });

    // 自動再接続をシミュレート
    if (this.shouldAutoReconnect && this.currentSessionId) {
      setTimeout(() => {
        this.connect(this.currentSessionId!);
      }, 1000);
    }
  }

  // ===================================
  // 内部ヘルパーメソッド
  // ===================================

  private async simulateDelay(delay: number): Promise<void> {
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  private shouldFail(): boolean {
    return Math.random() < this.failureRate;
  }

  private emitEvent<T>(eventType: WebSocketEventType, data: T): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners && this.currentSessionId) {
      const event: WebSocketEvent<T> = {
        type: eventType,
        data,
        timestamp: new Date().toISOString(),
        sessionId: this.currentSessionId
      };

      eventListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.warn('WebSocket event listener error:', error);
        }
      });
    }
  }

  // ===================================
  // 設定変更メソッド
  // ===================================

  setConnectionDelay(delay: number): void {
    this.connectionDelay = delay;
  }

  setMessageDelay(delay: number): void {
    this.messageDelay = delay;
  }

  setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  setAutoReconnect(autoReconnect: boolean): void {
    this.shouldAutoReconnect = autoReconnect;
  }

  // サービス状態の確認
  getStatus(): {
    isConnected: boolean;
    currentSessionId: string | null;
    connectionDelay: number;
    messageDelay: number;
    failureRate: number;
    autoReconnect: boolean;
    listenerCounts: Record<WebSocketEventType, number>;
  } {
    const listenerCounts = {} as Record<WebSocketEventType, number>;
    this.listeners.forEach((listeners, eventType) => {
      listenerCounts[eventType] = listeners.size;
    });

    return {
      isConnected: this.isConnected,
      currentSessionId: this.currentSessionId,
      connectionDelay: this.connectionDelay,
      messageDelay: this.messageDelay,
      failureRate: this.failureRate,
      autoReconnect: this.shouldAutoReconnect,
      listenerCounts
    };
  }
}

// ===================================
// シングルトンインスタンス
// ===================================

export const stubWebSocketService = new StubWebSocketService();

// ===================================
// ファクトリ関数
// ===================================

export function createStubWebSocketService(options?: {
  connectionDelay?: number;
  messageDelay?: number;
  failureRate?: number;
  autoReconnect?: boolean;
}): StubWebSocketService {
  return new StubWebSocketService(options);
}

// 事前定義されたスタブサービス
export const stubWebSocketServiceSlow = new StubWebSocketService({ 
  connectionDelay: 2000, 
  messageDelay: 500 
});

export const stubWebSocketServiceUnreliable = new StubWebSocketService({ 
  failureRate: 0.1 
});

export const stubWebSocketServiceNoAutoReconnect = new StubWebSocketService({ 
  autoReconnect: false 
});