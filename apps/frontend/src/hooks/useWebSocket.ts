import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ChatMessage, ID } from '@ai-agent-trpg/types';
import { logger } from '../utils/logger';

interface WebSocketEvents {
  'companion-message': {
    type: 'companion_reaction';
    message: ChatMessage;
    timestamp: string;
  };
  'player-action': {
    type: 'action_performed';
    sessionId: ID;
    actionData: any;
    timestamp: string;
  };
}

interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  joinSession: (sessionId: ID) => void;
  leaveSession: (sessionId: ID) => void;
  onCompanionMessage: (callback: (data: WebSocketEvents['companion-message']) => void) => void;
  onPlayerAction: (callback: (data: WebSocketEvents['player-action']) => void) => void;
  disconnect: () => void;
}

/**
 * WebSocket接続とセッション管理を行うカスタムフック
 */
export function useWebSocket(): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const currentSessionRef = useRef<ID | null>(null);

  useEffect(() => {
    // WebSocket接続の初期化
    const initializeSocket = () => {
      const serverUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      
      logger.info('Initializing WebSocket connection to:', serverUrl);
      
      const socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // 接続イベント
      socket.on('connect', () => {
        logger.info('WebSocket connected:', socket.id);
        setIsConnected(true);
        
        // セッション再参加（必要に応じて）
        if (currentSessionRef.current) {
          socket.emit('join-session', currentSessionRef.current);
        }
      });

      // 切断イベント
      socket.on('disconnect', (reason) => {
        logger.warn('WebSocket disconnected:', reason);
        setIsConnected(false);
      });

      // 接続エラー
      socket.on('connect_error', (error) => {
        logger.error('WebSocket connection error:', error);
        setIsConnected(false);
      });

      // 再接続成功
      socket.on('reconnect', (attemptNumber) => {
        logger.info('WebSocket reconnected after', attemptNumber, 'attempts');
        setIsConnected(true);
      });

      socketRef.current = socket;
    };

    initializeSocket();

    // クリーンアップ
    return () => {
      if (socketRef.current) {
        logger.info('Cleaning up WebSocket connection');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, []);

  // セッション参加
  const joinSession = (sessionId: ID) => {
    if (!socketRef.current || !isConnected) {
      logger.warn('Cannot join session: WebSocket not connected');
      return;
    }

    // 既存セッションから離脱
    if (currentSessionRef.current && currentSessionRef.current !== sessionId) {
      socketRef.current.emit('leave-session', currentSessionRef.current);
    }

    // 新しいセッションに参加
    socketRef.current.emit('join-session', sessionId);
    currentSessionRef.current = sessionId;
    
    logger.info('Joined WebSocket session:', sessionId);
  };

  // セッション離脱
  const leaveSession = (sessionId: ID) => {
    if (!socketRef.current) {
      return;
    }

    socketRef.current.emit('leave-session', sessionId);
    
    if (currentSessionRef.current === sessionId) {
      currentSessionRef.current = null;
    }
    
    logger.info('Left WebSocket session:', sessionId);
  };

  // 仲間メッセージ受信
  const onCompanionMessage = (callback: (data: WebSocketEvents['companion-message']) => void) => {
    if (!socketRef.current) {
      logger.warn('Cannot register companion message listener: WebSocket not connected');
      return;
    }

    socketRef.current.on('companion-message', (data) => {
      logger.debug('Received companion message:', data);
      callback(data);
    });
  };

  // プレイヤー行動受信
  const onPlayerAction = (callback: (data: WebSocketEvents['player-action']) => void) => {
    if (!socketRef.current) {
      logger.warn('Cannot register player action listener: WebSocket not connected');
      return;
    }

    socketRef.current.on('player-action', (data) => {
      logger.debug('Received player action:', data);
      callback(data);
    });
  };

  // 手動切断
  const disconnect = () => {
    if (socketRef.current) {
      if (currentSessionRef.current) {
        socketRef.current.emit('leave-session', currentSessionRef.current);
      }
      socketRef.current.disconnect();
      socketRef.current = null;
      currentSessionRef.current = null;
      setIsConnected(false);
      logger.info('WebSocket manually disconnected');
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    joinSession,
    leaveSession,
    onCompanionMessage,
    onPlayerAction,
    disconnect,
  };
}