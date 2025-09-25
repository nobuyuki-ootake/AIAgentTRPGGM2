import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ID, GMNotificationEvent } from '@ai-agent-trpg/types';

interface ChatMessage {
  id: ID;
  content: string;
  timestamp: string;
  sender: string;
  type?: string;
}
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
    actionData: unknown;
    timestamp: string;
  };
  'party-movement-updated': {
    type: 'proposal-created' | 'vote-cast' | 'movement-executed';
    sessionId?: ID;
    proposalId?: ID;
    proposal?: any;
    voterId?: ID;
    choice?: string;
    consensusReached?: boolean;
    timestamp: string;
  };
  'location-entities-updated': {
    type: 'entity-status-changed' | 'entities-refreshed' | 'entity-discovered';
    sessionId: ID;
    locationId: ID;
    entityId?: ID;
    entityIds?: ID[];
    newStatus?: string;
    timestamp: string;
  };
  'gm-notification': GMNotificationEvent;
  'gm-story-progression': {
    type: 'gm_story_progression';
    timestamp: string;
    data: {
      messageId: string;
      title: string;
      message: string;
      priority: string;
      sender: string;
      sessionId: string;
      isAIGenerated: boolean;
    };
  };
  'narrative-feedback': {
    type: 'narrative_feedback';
    timestamp: string;
    data: {
      milestoneName: string;
      mainNarrative: {
        title: string;
        content: string;
        tone: 'dramatic' | 'triumphant' | 'mysterious' | 'contemplative' | 'tense';
      };
      narrativeWeight: 'minor' | 'significant' | 'major' | 'pivotal';
      tone: string;
      isDetailedFeedback: boolean;
    };
  };
  'chat-message': {
    sessionId: ID;
    message: ChatMessage;
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
  onGMNotification: (callback: (data: WebSocketEvents['gm-notification']) => void) => void;
  onGMStoryProgression: (callback: (data: WebSocketEvents['gm-story-progression']) => void) => void;
  onNarrativeFeedback: (callback: (data: WebSocketEvents['narrative-feedback']) => void) => void;
  onChatMessage: (callback: (data: WebSocketEvents['chat-message']) => void) => (() => void);
  onPartyMovementUpdated: (callback: (data: WebSocketEvents['party-movement-updated']) => void) => (() => void);
  onLocationEntitiesUpdated: (callback: (data: WebSocketEvents['location-entities-updated']) => void) => (() => void);
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
      const serverUrl = import.meta.env.VITE_WS_BASE_URL || 'http://localhost:4001';
      
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

  // GM通知受信
  const onGMNotification = (callback: (data: WebSocketEvents['gm-notification']) => void) => {
    if (!socketRef.current) {
      logger.warn('Cannot register GM notification listener: WebSocket not connected');
      return;
    }

    socketRef.current.on('gm-notification', (data) => {
      logger.info('Received GM notification:', data.notification.title);
      callback(data);
    });
  };

  // GMストーリー進行受信
  const onGMStoryProgression = (callback: (data: WebSocketEvents['gm-story-progression']) => void) => {
    if (!socketRef.current) {
      logger.warn('Cannot register GM story progression listener: WebSocket not connected');
      return;
    }

    socketRef.current.on('gm-story-progression', (data) => {
      logger.info('Received GM story progression:', data.data.title);
      callback(data);
    });
  };

  // ナラティブフィードバック受信
  const onNarrativeFeedback = (callback: (data: WebSocketEvents['narrative-feedback']) => void) => {
    if (!socketRef.current) {
      logger.warn('Cannot register narrative feedback listener: WebSocket not connected');
      return;
    }

    socketRef.current.on('narrative-feedback', (data) => {
      logger.info('Received narrative feedback:', data.data.mainNarrative.title);
      callback(data);
    });
  };

  // チャットメッセージ受信
  const onChatMessage = (callback: (data: WebSocketEvents['chat-message']) => void) => {
    if (!socketRef.current) {
      logger.warn('Cannot register chat message listener: WebSocket not connected');
      return () => {};
    }

    const eventHandler = (data: WebSocketEvents['chat-message']) => {
      logger.info('Received chat message:', data.message.sender, data.message.content?.substring(0, 50));
      callback(data);
    };

    socketRef.current.on('chat-message', eventHandler);
    
    // クリーンアップ関数を返す
    return () => {
      if (socketRef.current) {
        socketRef.current.off('chat-message', eventHandler);
      }
    };
  };

  // パーティ移動更新受信
  const onPartyMovementUpdated = (callback: (data: WebSocketEvents['party-movement-updated']) => void) => {
    if (!socketRef.current) {
      logger.warn('Cannot register party movement listener: WebSocket not connected');
      return () => {};
    }

    const eventHandler = (data: WebSocketEvents['party-movement-updated']) => {
      logger.info(`Received party movement update: ${data.type}`, { 
        sessionId: data.sessionId, 
        proposalId: data.proposalId 
      });
      callback(data);
    };

    socketRef.current.on('party-movement-updated', eventHandler);
    
    // クリーンアップ関数を返す
    return () => {
      if (socketRef.current) {
        socketRef.current.off('party-movement-updated', eventHandler);
      }
    };
  };

  // 場所エンティティ更新受信
  const onLocationEntitiesUpdated = (callback: (data: WebSocketEvents['location-entities-updated']) => void) => {
    if (!socketRef.current) {
      logger.warn('Cannot register location entities listener: WebSocket not connected');
      return () => {};
    }

    const eventHandler = (data: WebSocketEvents['location-entities-updated']) => {
      logger.info(`Received location entities update: ${data.type}`, { 
        sessionId: data.sessionId, 
        locationId: data.locationId,
        entityId: data.entityId 
      });
      callback(data);
    };

    socketRef.current.on('location-entities-updated', eventHandler);
    
    // クリーンアップ関数を返す
    return () => {
      if (socketRef.current) {
        socketRef.current.off('location-entities-updated', eventHandler);
      }
    };
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
    onGMNotification,
    onGMStoryProgression,
    onNarrativeFeedback,
    onChatMessage,
    onPartyMovementUpdated,
    onLocationEntitiesUpdated,
    disconnect,
  };
}