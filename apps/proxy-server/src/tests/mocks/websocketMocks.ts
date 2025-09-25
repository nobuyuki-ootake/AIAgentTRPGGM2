// ==========================================
// WebSocket / Socket.io モッククラス群
// リアルタイム機能のテスト用モック
// ==========================================

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';

// ==========================================
// 型定義
// ==========================================

export interface MockSocketOptions {
  id?: string;
  autoConnect?: boolean;
  simulateLatency?: number;
  simulateErrors?: boolean;
  connectionState?: 'connected' | 'disconnected' | 'connecting' | 'error';
}

export interface MockServerOptions {
  port?: number;
  cors?: any;
  simulateConnectionFailures?: boolean;
  maxConnections?: number;
}

export interface SessionMessage {
  type: 'join_session' | 'leave_session' | 'session_update' | 'player_action' | 'gm_response';
  sessionId: string;
  playerId?: string;
  data?: any;
  timestamp?: string;
}

export interface GMNotification {
  type: 'milestone_completed' | 'player_stuck' | 'session_ready' | 'error_occurred';
  sessionId: string;
  data: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

// ==========================================
// Socket.io クライアントモック
// ==========================================

export class MockSocket extends EventEmitter {
  public id: string;
  public connected: boolean = false;
  public disconnected: boolean = true;
  private rooms: Set<string> = new Set();
  private simulateLatency: number;
  private simulateErrors: boolean;

  constructor(options: MockSocketOptions = {}) {
    super();
    this.id = options.id || `mock-socket-${Math.random().toString(36).substr(2, 9)}`;
    this.simulateLatency = options.simulateLatency || 10;
    this.simulateErrors = options.simulateErrors || false;

    if (options.autoConnect !== false) {
      this.connect();
    }
  }

  connect(): this {
    setTimeout(() => {
      this.connected = true;
      this.disconnected = false;
      this.emit('connect');
      logger.debug(`Mock socket ${this.id} connected`);
    }, this.simulateLatency);
    return this;
  }

  disconnect(): this {
    this.connected = false;
    this.disconnected = true;
    this.rooms.clear();
    this.emit('disconnect', 'client disconnect');
    logger.debug(`Mock socket ${this.id} disconnected`);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    // エラーシミュレーション
    if (this.simulateErrors && Math.random() < 0.1) {
      setTimeout(() => {
        this.emit('error', new Error(`Simulated socket error for event: ${event}`));
      }, this.simulateLatency / 2);
      return false;
    }

    // 遅延シミュレーション
    setTimeout(() => {
      super.emit(event, ...args);
    }, this.simulateLatency);

    return true;
  }

  join(room: string): void {
    this.rooms.add(room);
    this.emit('join_room', room);
    logger.debug(`Mock socket ${this.id} joined room: ${room}`);
  }

  leave(room: string): void {
    this.rooms.delete(room);
    this.emit('leave_room', room);
    logger.debug(`Mock socket ${this.id} left room: ${room}`);
  }

  to(room: string): MockSocketBroadcast {
    return new MockSocketBroadcast([room], this);
  }

  getRooms(): Set<string> {
    return new Set(this.rooms);
  }

  // セッション関連の特別なメソッド
  joinSession(sessionId: string, playerId?: string): void {
    const message: SessionMessage = {
      type: 'join_session',
      sessionId,
      playerId,
      timestamp: new Date().toISOString()
    };
    
    this.join(`session:${sessionId}`);
    this.emit('session_message', message);
  }

  leaveSession(sessionId: string, playerId?: string): void {
    const message: SessionMessage = {
      type: 'leave_session',
      sessionId,
      playerId,
      timestamp: new Date().toISOString()
    };
    
    this.leave(`session:${sessionId}`);
    this.emit('session_message', message);
  }

  sendPlayerAction(sessionId: string, playerId: string, action: any): void {
    const message: SessionMessage = {
      type: 'player_action',
      sessionId,
      playerId,
      data: action,
      timestamp: new Date().toISOString()
    };
    
    this.emit('session_message', message);
  }

  sendGMResponse(sessionId: string, response: any): void {
    const message: SessionMessage = {
      type: 'gm_response',
      sessionId,
      data: response,
      timestamp: new Date().toISOString()
    };
    
    this.emit('session_message', message);
  }
}

// ==========================================
// ブロードキャストモック
// ==========================================

class MockSocketBroadcast {
  constructor(
    private rooms: string[], 
    private socket: MockSocket
  ) {}

  emit(event: string, ...args: any[]): boolean {
    // ルーム内の他のソケットに送信をシミュレート
    this.rooms.forEach(room => {
      logger.debug(`Broadcasting to room ${room}: ${event}`);
      // 実際のテストでは MockSocketIOServer で管理される他のソケットに送信
    });
    return true;
  }
}

// ==========================================
// Socket.io サーバーモック
// ==========================================

export class MockSocketIOServer extends EventEmitter {
  private sockets: Map<string, MockSocket> = new Map();
  private rooms: Map<string, Set<string>> = new Map();
  private simulateConnectionFailures: boolean;
  private maxConnections: number;

  constructor(server?: any, options: MockServerOptions = {}) {
    super();
    this.simulateConnectionFailures = options.simulateConnectionFailures || false;
    this.maxConnections = options.maxConnections || 100;
    
    logger.debug('Mock Socket.IO server created');
  }

  // 新しい接続をシミュレート
  simulateConnection(socketOptions: MockSocketOptions = {}): MockSocket {
    if (this.sockets.size >= this.maxConnections) {
      throw new Error('Maximum connections reached');
    }

    if (this.simulateConnectionFailures && Math.random() < 0.1) {
      throw new Error('Simulated connection failure');
    }

    const socket = new MockSocket({
      ...socketOptions,
      autoConnect: false
    });

    this.sockets.set(socket.id, socket);
    
    // 接続イベントの処理
    socket.on('join_room', (room: string) => {
      this.addSocketToRoom(socket.id, room);
    });

    socket.on('leave_room', (room: string) => {
      this.removeSocketFromRoom(socket.id, room);
    });

    socket.on('disconnect', () => {
      this.removeSocket(socket.id);
    });

    // 接続完了
    setTimeout(() => {
      socket.connected = true;
      socket.disconnected = false;
      socket.emit('connect');
      this.emit('connection', socket);
    }, socketOptions.simulateLatency || 10);

    return socket;
  }

  // ソケット管理
  private addSocketToRoom(socketId: string, room: string): void {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(socketId);
  }

  private removeSocketFromRoom(socketId: string, room: string): void {
    const roomSockets = this.rooms.get(room);
    if (roomSockets) {
      roomSockets.delete(socketId);
      if (roomSockets.size === 0) {
        this.rooms.delete(room);
      }
    }
  }

  private removeSocket(socketId: string): void {
    this.sockets.delete(socketId);
    // 全てのルームからソケットを削除
    this.rooms.forEach((sockets, room) => {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.rooms.delete(room);
      }
    });
  }

  // ブロードキャスト機能
  to(room: string): MockServerBroadcast {
    return new MockServerBroadcast([room], this);
  }

  emit(event: string, ...args: any[]): boolean {
    // 全てのソケットに送信
    this.sockets.forEach(socket => {
      socket.emit(event, ...args);
    });
    return true;
  }

  // セッション関連の便利メソッド
  broadcastToSession(sessionId: string, event: string, data: any): void {
    const roomName = `session:${sessionId}`;
    this.to(roomName).emit(event, data);
  }

  sendGMNotification(notification: GMNotification): void {
    const roomName = `session:${notification.sessionId}`;
    this.to(roomName).emit('gm_notification', notification);
  }

  // 統計情報
  getConnectedSockets(): MockSocket[] {
    return Array.from(this.sockets.values()).filter(s => s.connected);
  }

  getSocketsInRoom(room: string): MockSocket[] {
    const socketIds = this.rooms.get(room) || new Set();
    return Array.from(socketIds)
      .map(id => this.sockets.get(id))
      .filter((socket): socket is MockSocket => socket !== undefined);
  }

  getSessionSockets(sessionId: string): MockSocket[] {
    return this.getSocketsInRoom(`session:${sessionId}`);
  }

  // クリーンアップ
  disconnectAll(): void {
    this.sockets.forEach(socket => {
      socket.disconnect();
    });
    this.sockets.clear();
    this.rooms.clear();
  }
}

// ==========================================
// サーバーブロードキャストモック
// ==========================================

class MockServerBroadcast {
  constructor(
    private rooms: string[],
    private server: MockSocketIOServer
  ) {}

  emit(event: string, ...args: any[]): boolean {
    this.rooms.forEach(room => {
      const sockets = this.server.getSocketsInRoom(room);
      sockets.forEach(socket => {
        socket.emit(event, ...args);
      });
    });
    return true;
  }
}

// ==========================================
// テストヘルパー
// ==========================================

export class WebSocketTestHelper {
  private server: MockSocketIOServer;
  private clients: MockSocket[] = [];

  constructor(serverOptions: MockServerOptions = {}) {
    this.server = new MockSocketIOServer(null, serverOptions);
  }

  createClient(options: MockSocketOptions = {}): MockSocket {
    const client = this.server.simulateConnection(options);
    this.clients.push(client);
    return client;
  }

  createSessionClients(sessionId: string, playerCount: number): MockSocket[] {
    const clients: MockSocket[] = [];
    
    for (let i = 0; i < playerCount; i++) {
      const client = this.createClient({
        id: `player-${i}-${sessionId}`,
        simulateLatency: 20 + Math.random() * 30 // 20-50ms
      });
      
      client.joinSession(sessionId, `player-${i}`);
      clients.push(client);
    }
    
    return clients;
  }

  simulateSessionActivity(sessionId: string, clients: MockSocket[]): void {
    // プレイヤーアクションをシミュレート
    clients.forEach((client, index) => {
      setTimeout(() => {
        client.sendPlayerAction(sessionId, `player-${index}`, {
          action: 'move',
          target: 'north',
          message: `Player ${index} moves north`
        });
      }, 100 * (index + 1));
    });

    // GM応答をシミュレート
    setTimeout(() => {
      this.server.broadcastToSession(sessionId, 'gm_response', {
        message: 'You all move north into a dark corridor...',
        newLocation: 'Dark Corridor',
        availableActions: ['investigate', 'continue', 'retreat']
      });
    }, 500);
  }

  waitForEvent(socket: MockSocket, event: string, timeout: number = 1000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      socket.once(event, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  getServer(): MockSocketIOServer {
    return this.server;
  }

  cleanup(): void {
    this.clients.forEach(client => client.disconnect());
    this.server.disconnectAll();
    this.clients = [];
  }
}

// ==========================================
// Jest 設定
// ==========================================

export function setupWebSocketMocks(): void {
  // Socket.io server mock
  jest.mock('socket.io', () => {
    return {
      Server: jest.fn().mockImplementation((server, options) => {
        return new MockSocketIOServer(server, options);
      })
    };
  });

  // Socket.io client mock
  jest.mock('socket.io-client', () => {
    return {
      io: jest.fn().mockImplementation((url, options) => {
        return new MockSocket({
          ...options,
          id: `client-${Math.random().toString(36).substr(2, 9)}`
        });
      })
    };
  });

  logger.debug('WebSocket mocks configured for Jest');
}

// ==========================================
// エクスポート
// ==========================================

export {
  MockSocket,
  MockSocketIOServer,
  WebSocketTestHelper
};