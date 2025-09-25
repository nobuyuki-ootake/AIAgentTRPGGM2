import { vi, MockedFunction } from 'vitest';
import { io, Socket } from 'socket.io-client';

// Type for socket.io mock events
type SocketEventHandler = (...args: any[]) => void;

interface MockSocket {
  id: string;
  connected: boolean;
  emit: MockedFunction<(event: string, ...args: any[]) => Socket>;
  on: MockedFunction<(event: string, handler: SocketEventHandler) => Socket>;
  off: MockedFunction<(event: string, handler?: SocketEventHandler) => Socket>;
  connect: MockedFunction<() => Socket>;
  disconnect: MockedFunction<() => Socket>;
  close: MockedFunction<() => Socket>;
  removeAllListeners: MockedFunction<(event?: string) => Socket>;
  // Event simulation helpers
  simulateConnect: () => void;
  simulateDisconnect: () => void;
  simulateEvent: (event: string, ...args: any[]) => void;
  simulateError: (error: Error) => void;
  getListeners: (event: string) => SocketEventHandler[];
  hasListeners: (event: string) => boolean;
}

/**
 * Creates a mock socket.io client for testing
 * Supports all common WebSocket operations used in TRPG session management
 */
export function createMockSocket(): MockSocket {
  const eventHandlers = new Map<string, SocketEventHandler[]>();
  
  const mockSocket = {
    id: 'mock-socket-id',
    connected: false,
    
    emit: vi.fn((event: string, ...args: any[]) => {
      console.log(`Mock socket emit: ${event}`, args);
      return mockSocket as any;
    }),
    
    on: vi.fn((event: string, handler: SocketEventHandler) => {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, []);
      }
      eventHandlers.get(event)!.push(handler);
      return mockSocket as any;
    }),
    
    off: vi.fn((event: string, handler?: SocketEventHandler) => {
      if (handler && eventHandlers.has(event)) {
        const handlers = eventHandlers.get(event)!;
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      } else {
        eventHandlers.delete(event);
      }
      return mockSocket as any;
    }),
    
    connect: vi.fn(() => {
      mockSocket.connected = true;
      mockSocket.simulateConnect();
      return mockSocket as any;
    }),
    
    disconnect: vi.fn(() => {
      mockSocket.connected = false;
      mockSocket.simulateDisconnect();
      return mockSocket as any;
    }),
    
    close: vi.fn(() => {
      mockSocket.connected = false;
      mockSocket.simulateDisconnect();
      return mockSocket as any;
    }),
    
    removeAllListeners: vi.fn((event?: string) => {
      if (event) {
        eventHandlers.delete(event);
      } else {
        eventHandlers.clear();
      }
      return mockSocket as any;
    }),
    
    // Test utilities
    simulateConnect: () => {
      mockSocket.connected = true;
      const connectHandlers = eventHandlers.get('connect') || [];
      connectHandlers.forEach(handler => handler());
    },
    
    simulateDisconnect: () => {
      mockSocket.connected = false;
      const disconnectHandlers = eventHandlers.get('disconnect') || [];
      disconnectHandlers.forEach(handler => handler());
    },
    
    simulateEvent: (event: string, ...args: any[]) => {
      const handlers = eventHandlers.get(event) || [];
      handlers.forEach(handler => handler(...args));
    },
    
    simulateError: (error: Error) => {
      const errorHandlers = eventHandlers.get('error') || [];
      errorHandlers.forEach(handler => handler(error));
    },
    
    getListeners: (event: string) => {
      return eventHandlers.get(event) || [];
    },
    
    hasListeners: (event: string) => {
      return eventHandlers.has(event) && eventHandlers.get(event)!.length > 0;
    },
  };
  
  return mockSocket;
}

/**
 * Mock socket.io-client module
 * This should be used in test setup to replace the real socket.io-client
 */
export function mockSocketIOClient() {
  const mockSocket = createMockSocket();
  
  // Mock the io function
  const mockIo = vi.fn((...args: any[]) => {
    console.log('Mock io called with:', args);
    return mockSocket as any;
  });
  
  return {
    io: mockIo,
    socket: mockSocket,
  };
}

/**
 * WebSocket event utilities for TRPG-specific events
 * These match the events used in the real application
 */
export const TRPGWebSocketEvents = {
  // Session events
  SESSION_START: 'session:start',
  SESSION_END: 'session:end',
  SESSION_UPDATE: 'session:update',
  
  // Chat events
  CHAT_MESSAGE: 'chat:message',
  CHAT_TYPING: 'chat:typing',
  
  // Character events
  CHARACTER_UPDATE: 'character:update',
  CHARACTER_MOVE: 'character:move',
  
  // Game events
  DICE_ROLL: 'game:dice_roll',
  SKILL_CHECK: 'game:skill_check',
  POWER_CHECK: 'game:power_check',
  
  // AI events
  AI_RESPONSE: 'ai:response',
  AI_THINKING: 'ai:thinking',
  
  // System events
  ERROR: 'error',
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect',
} as const;

/**
 * Helper function to simulate TRPG session events
 */
export class TRPGWebSocketSimulator {
  constructor(private mockSocket: MockSocket) {}
  
  simulateSessionStart(sessionData: any) {
    this.mockSocket.simulateEvent(TRPGWebSocketEvents.SESSION_START, sessionData);
  }
  
  simulateSessionEnd(sessionData: any) {
    this.mockSocket.simulateEvent(TRPGWebSocketEvents.SESSION_END, sessionData);
  }
  
  simulateChatMessage(message: any) {
    this.mockSocket.simulateEvent(TRPGWebSocketEvents.CHAT_MESSAGE, message);
  }
  
  simulateDiceRoll(rollData: any) {
    this.mockSocket.simulateEvent(TRPGWebSocketEvents.DICE_ROLL, rollData);
  }
  
  simulateCharacterUpdate(characterData: any) {
    this.mockSocket.simulateEvent(TRPGWebSocketEvents.CHARACTER_UPDATE, characterData);
  }
  
  simulateAIResponse(response: any) {
    this.mockSocket.simulateEvent(TRPGWebSocketEvents.AI_RESPONSE, response);
  }
  
  simulateError(error: string | Error) {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    this.mockSocket.simulateError(errorObj);
  }
  
  simulateConnectionIssues() {
    this.mockSocket.simulateDisconnect();
    // Simulate reconnection after delay
    setTimeout(() => {
      this.mockSocket.simulateConnect();
    }, 100);
  }
}

/**
 * Test helper to create a complete WebSocket testing environment
 */
export function createWebSocketTestEnvironment() {
  const mockSocket = createMockSocket();
  const simulator = new TRPGWebSocketSimulator(mockSocket);
  
  return {
    mockSocket,
    simulator,
    cleanup: () => {
      mockSocket.removeAllListeners();
      vi.clearAllMocks();
    },
  };
}

/**
 * Utility to wait for socket events in async tests
 */
export function waitForSocketEvent(
  mockSocket: MockSocket, 
  event: string, 
  timeout = 5000
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout waiting for socket event: ${event}`));
    }, timeout);
    
    const handler = (...args: any[]) => {
      clearTimeout(timeoutId);
      mockSocket.off(event, handler);
      resolve(args);
    };
    
    mockSocket.on(event, handler);
  });
}