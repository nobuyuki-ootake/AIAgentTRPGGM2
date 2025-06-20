import { useState, useEffect, useCallback, useRef } from 'react';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { SessionState, Character } from '@ai-agent-trpg/types';
import { sessionAPI, characterAPI } from '@/api';
import { 
  currentSessionAtom, 
  charactersAtom, 
  sessionLoadingAtom,
  notificationsAtom 
} from '@/store/atoms';
import { useNotification } from '@/components/common/NotificationProvider';
import { useWebSocket } from './useWebSocket';

export interface UseSessionOptions {
  sessionId?: string;
  campaignId: string;
  pollingInterval?: number;
}

export const useSession = ({ sessionId, campaignId, pollingInterval = 3000 }: UseSessionOptions) => {
  const [currentSession, setCurrentSession] = useRecoilState(currentSessionAtom);
  const [characters, setCharacters] = useRecoilState(charactersAtom);
  const [loading, setLoading] = useRecoilState(sessionLoadingAtom);
  const [error, setError] = useState<string | null>(null);
  
  const { showSuccess, showError, showInfo } = useNotification();
  const stopPollingRef = useRef<(() => void) | null>(null);
  
  // WebSocket接続
  const { 
    isConnected: wsConnected, 
    joinSession: wsJoinSession, 
    leaveSession: wsLeaveSession,
    onCompanionMessage,
    onPlayerAction
  } = useWebSocket();

  // 初期化フラグ（重複実行防止）
  const initializingRef = useRef(false);
  const initializedRef = useRef(false);

  // セッション作成または読み込み
  const initializeSession = useCallback(async () => {
    if (initializingRef.current || initializedRef.current) return;
    initializingRef.current = true;

    setLoading(true);
    setError(null);

    try {
      let session: SessionState;
      
      if (sessionId) {
        // 既存セッションを読み込み
        session = await sessionAPI.getSessionById(sessionId);
      } else {
        // 新規セッション作成
        const sessionData = sessionAPI.createMockSession(campaignId);
        session = await sessionAPI.createSession(sessionData);
        showSuccess('新しいセッションが作成されました');
      }

      setCurrentSession(session);

      // キャラクターデータ読み込み
      const campaignCharacters = await characterAPI.getCharactersByCampaign(campaignId);
      setCharacters(campaignCharacters);

      // WebSocketセッション参加
      if (wsConnected && session.id) {
        wsJoinSession(session.id);
      }

      // ポーリング開始
      if (session.status === 'active') {
        startPolling(session.id);
      }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'セッションの初期化に失敗しました';
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
      initializingRef.current = false;
      initializedRef.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, campaignId]);

  // セッション状態のポーリング
  const startPolling = useCallback((sessionId: string) => {
    if (stopPollingRef.current) {
      stopPollingRef.current();
    }

    sessionAPI.pollSession(
      sessionId,
      (updatedSession) => {
        setCurrentSession(updatedSession);
      },
      pollingInterval
    ).then(stopFunction => {
      stopPollingRef.current = stopFunction;
    });
  }, [pollingInterval, setCurrentSession]);

  // セッション開始
  const startSession = useCallback(async () => {
    if (!currentSession) return;

    try {
      const updatedSession = await sessionAPI.updateSessionStatus(currentSession.id, 'active');
      setCurrentSession(updatedSession);
      showSuccess('セッションを開始しました');
      startPolling(updatedSession.id);
    } catch (err) {
      showError('セッションの開始に失敗しました');
    }
  }, [currentSession, setCurrentSession, showSuccess, showError, startPolling]);

  // セッション終了
  const endSession = useCallback(async () => {
    if (!currentSession) return;

    try {
      const updatedSession = await sessionAPI.updateSessionStatus(currentSession.id, 'completed');
      setCurrentSession(updatedSession);
      showInfo('セッションを終了しました');
      
      if (stopPollingRef.current) {
        stopPollingRef.current();
      }
    } catch (err) {
      showError('セッションの終了に失敗しました');
    }
  }, [currentSession, setCurrentSession, showInfo, showError]);

  // チャットメッセージ送信
  const sendMessage = useCallback(async (
    message: string,
    type: 'ic' | 'ooc' = 'ic',
    characterId?: string
  ) => {
    if (!currentSession) return;

    try {
      const chatMessage = {
        speaker: characterId ? 
          characters.find(c => c.id === characterId)?.name || 'Unknown' : 
          'Player',
        characterId,
        message,
        type,
      };

      const updatedSession = await sessionAPI.sendChatMessage(currentSession.id, chatMessage);
      setCurrentSession(updatedSession);
    } catch (err) {
      showError('メッセージの送信に失敗しました');
    }
  }, [currentSession, characters, setCurrentSession, showError]);

  // ダイスロール
  const rollDice = useCallback(async (
    dice: string,
    purpose: string = 'General roll',
    characterId?: string
  ) => {
    if (!currentSession) return;

    try {
      const diceData = {
        roller: characterId ? 
          characters.find(c => c.id === characterId)?.name || 'Unknown' : 
          'Player',
        characterId,
        dice,
        purpose,
      };

      const updatedSession = await sessionAPI.rollDice(currentSession.id, diceData);
      setCurrentSession(updatedSession);
    } catch (err) {
      showError('ダイスロールに失敗しました');
    }
  }, [currentSession, characters, setCurrentSession, showError]);

  // 戦闘開始
  const startCombat = useCallback(async (participantIds: string[]) => {
    if (!currentSession) return;

    try {
      // 各キャラクターのイニシアチブをロール
      const participants = participantIds.map(id => {
        const character = characters.find(c => c.id === id);
        if (!character) throw new Error(`Character ${id} not found`);
        
        // イニシアチブ = 1d20 + DEXボーナス
        const roll = Math.floor(Math.random() * 20) + 1;
        const initiative = roll + character.derivedStats.initiative;
        
        return { characterId: id, initiative };
      });

      const updatedSession = await sessionAPI.startCombat(currentSession.id, participants);
      setCurrentSession(updatedSession);
      showInfo('戦闘を開始しました');
    } catch (err) {
      showError('戦闘の開始に失敗しました');
    }
  }, [currentSession, characters, setCurrentSession, showInfo, showError]);

  // 戦闘終了
  const endCombat = useCallback(async () => {
    if (!currentSession) return;

    try {
      const updatedSession = await sessionAPI.endCombat(currentSession.id);
      setCurrentSession(updatedSession);
      showInfo('戦闘を終了しました');
    } catch (err) {
      showError('戦闘の終了に失敗しました');
    }
  }, [currentSession, setCurrentSession, showInfo, showError]);

  // WebSocket仲間メッセージ受信設定
  useEffect(() => {
    if (!currentSession) return;

    onCompanionMessage((data) => {
      // 仲間メッセージをチャットに追加
      setCurrentSession(prevSession => {
        if (!prevSession) return prevSession;
        
        return {
          ...prevSession,
          chatMessages: [...prevSession.chatMessages, data.message]
        };
      });
      
      showInfo(`${data.message.speaker}が反応しました`);
    });

    onPlayerAction((data) => {
      // プレイヤー行動の処理（必要に応じて）
      console.log('Player action received:', data);
    });
  }, [currentSession, onCompanionMessage, onPlayerAction, setCurrentSession, showInfo]);

  // WebSocket接続状態変化時の処理
  useEffect(() => {
    if (wsConnected && currentSession?.id) {
      wsJoinSession(currentSession.id);
    }
  }, [wsConnected, currentSession?.id, wsJoinSession]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (stopPollingRef.current) {
        stopPollingRef.current();
      }
      if (currentSession?.id) {
        wsLeaveSession(currentSession.id);
      }
    };
  }, [currentSession?.id, wsLeaveSession]);

  // 初期化
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  return {
    session: currentSession,
    characters,
    loading,
    error,
    wsConnected,
    actions: {
      startSession,
      endSession,
      sendMessage,
      rollDice,
      startCombat,
      endCombat,
    },
  };
};