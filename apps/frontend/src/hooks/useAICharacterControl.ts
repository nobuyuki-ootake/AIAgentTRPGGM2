import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  AIAction, 
  AISessionController, 
  AIDecisionContext,
  Character,
  SessionState,
  ID, 
} from '@ai-agent-trpg/types';
import { aiCharacterAPI, AISessionSettings } from '@/api/aiCharacters';
import { useNotification } from '@/components/common/NotificationProvider';

export interface UseAICharacterControlOptions {
  sessionId: ID;
  characters: Character[];
  sessionState?: SessionState;
  autoStart?: boolean;
  aiSettings?: AISessionSettings;
}

export const useAICharacterControl = ({
  sessionId,
  characters,
  sessionState,
  autoStart = false,
  aiSettings,
}: UseAICharacterControlOptions) => {
  const [isActive, setIsActive] = useState(false);
  const [controller, setController] = useState<AISessionController | null>(null);
  const [recentActions, setRecentActions] = useState<AIAction[]>([]);
  const [controlledCharacters, setControlledCharacters] = useState<ID[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { showSuccess, showInfo, showError } = useNotification();
  const intervalRef = useRef<number | null>(null);

  // AI制御対象キャラクター（NPCとEnemy）を抽出
  const aiCharacters = characters.filter(c => c.characterType === 'NPC' || c.characterType === 'Enemy');

  // ==========================================
  // AI制御開始・停止
  // ==========================================

  const startAIControl = useCallback(async (settings?: AISessionSettings) => {
    try {
      setLoading(true);
      const sessionController = await aiCharacterAPI.startSessionAIControl(
        sessionId, 
        settings || aiSettings,
      );
      
      setController(sessionController);
      setIsActive(true);
      setControlledCharacters(Object.keys(sessionController.characterControllers));
      
      showSuccess('AI自動制御を開始しました');
      return sessionController;
    } catch (error) {
      console.error('Failed to start AI control:', error);
      showError('AI制御の開始に失敗しました');
      return null;
    } finally {
      setLoading(false);
    }
  }, [sessionId, aiSettings, showSuccess, showError]);

  const stopAIControl = useCallback(async () => {
    try {
      setLoading(true);
      await aiCharacterAPI.stopSessionAIControl(sessionId);
      
      setController(null);
      setIsActive(false);
      setControlledCharacters([]);
      
      // 自動実行タイマーをクリア
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      showInfo('AI自動制御を停止しました');
    } catch (error) {
      console.error('Failed to stop AI control:', error);
      showError('AI制御の停止に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [sessionId, showInfo, showError]);

  // ==========================================
  // キャラクター行動制御
  // ==========================================

  const triggerCharacterAction = useCallback(async (
    characterId: ID,
    context?: Partial<AIDecisionContext>,
  ) => {
    try {
      const action = await aiCharacterAPI.triggerCharacterAction(
        characterId,
        sessionId,
        context,
      );
      
      if (action) {
        setRecentActions(prev => [action, ...prev.slice(0, 19)]); // 最新20件を保持
        await aiCharacterAPI.executeAIAction(action.id);
        
        const character = characters.find(c => c.id === characterId);
        showInfo(`${character?.name || '不明'}が行動しました: ${action.details.description}`);
        
        return action;
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to trigger action for character ${characterId}:`, error);
      return null;
    }
  }, [sessionId, characters, showInfo]);

  const triggerAllAICharacterActions = useCallback(async (
    context?: Partial<AIDecisionContext>,
  ) => {
    if (!isActive || controlledCharacters.length === 0) return [];

    try {
      const results = await aiCharacterAPI.controlAllAICharacters(sessionId, context || {});
      
      // 成功した行動を記録
      const successfulActions = results
        .filter(result => result.action !== null)
        .map(result => result.action!);
      
      if (successfulActions.length > 0) {
        setRecentActions(prev => [...successfulActions, ...prev.slice(0, 20 - successfulActions.length)]);
        showInfo(`${successfulActions.length}体のキャラクターが行動しました`);
      }
      
      return results;
    } catch (error) {
      console.error('Failed to trigger all AI character actions:', error);
      return [];
    }
  }, [isActive, controlledCharacters, sessionId, showInfo]);

  // ==========================================
  // 自動実行制御
  // ==========================================

  const startAutoExecution = useCallback((intervalMs: number = 30000) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // AIキャラクター制御は廃止 - WebSocketによるイベント駆動型に変更
    console.warn('⚠️ Auto-execution is deprecated. Use WebSocket event-driven AI character control instead.');
  }, []);

  const stopAutoExecution = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ==========================================
  // フィードバック管理
  // ==========================================

  const sendActionFeedback = useCallback(async (
    actionId: ID,
    rating: number,
    comment?: string,
  ) => {
    try {
      await aiCharacterAPI.sendActionFeedback(actionId, rating, comment);
      showSuccess('フィードバックを送信しました');
    } catch (error) {
      console.error('Failed to send feedback:', error);
      showError('フィードバックの送信に失敗しました');
    }
  }, [showSuccess, showError]);

  // ==========================================
  // 設定管理
  // ==========================================

  const updateAutomationLevel = useCallback(async (
    level: 'minimal' | 'moderate' | 'extensive',
  ) => {
    try {
      setLoading(true);
      await aiCharacterAPI.setSessionAutomationLevel(sessionId, level);
      
      // 状態を更新
      if (controller) {
        setController(prev => prev ? {
          ...prev,
          sessionSettings: {
            ...prev.sessionSettings,
            aiAutomationLevel: level,
          },
        } : null);
      }
      
      showSuccess(`自動化レベルを「${level}」に変更しました`);
    } catch (error) {
      console.error('Failed to update automation level:', error);
      showError('自動化レベルの変更に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [sessionId, controller, showSuccess, showError]);

  const toggleCharacterAI = useCallback(async (
    characterId: ID,
    enabled: boolean,
  ) => {
    try {
      await aiCharacterAPI.toggleCharacterAI(characterId, enabled);
      
      const character = characters.find(c => c.id === characterId);
      const action = enabled ? '有効' : '無効';
      showSuccess(`${character?.name || '不明'}のAI制御を${action}にしました`);
      
      // 制御対象リストを更新
      if (enabled && !controlledCharacters.includes(characterId)) {
        setControlledCharacters(prev => [...prev, characterId]);
      } else if (!enabled) {
        setControlledCharacters(prev => prev.filter(id => id !== characterId));
      }
    } catch (error) {
      console.error('Failed to toggle character AI:', error);
      showError('AI制御の切り替えに失敗しました');
    }
  }, [characters, controlledCharacters, showSuccess, showError]);

  // ==========================================
  // 緊急制御
  // ==========================================

  const emergencyStop = useCallback(async () => {
    try {
      await aiCharacterAPI.emergencyStop(sessionId);
      setIsActive(false);
      setController(null);
      setControlledCharacters([]);
      stopAutoExecution();
      
      showInfo('緊急停止を実行しました');
    } catch (error) {
      console.error('Failed to emergency stop:', error);
      showError('緊急停止に失敗しました');
    }
  }, [sessionId, stopAutoExecution, showInfo, showError]);

  // ==========================================
  // Effect hooks
  // ==========================================

  // 自動開始
  useEffect(() => {
    if (autoStart && !isActive && aiCharacters.length > 0) {
      startAIControl();
    }
  }, [autoStart, isActive, aiCharacters.length, startAIControl]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // ==========================================
  // 戻り値
  // ==========================================

  return {
    // 状態
    isActive,
    controller,
    recentActions,
    controlledCharacters,
    loading,
    aiCharacters,

    // AI制御
    startAIControl,
    stopAIControl,
    
    // キャラクター行動
    triggerCharacterAction,
    triggerAllAICharacterActions,
    
    // 自動実行
    startAutoExecution,
    stopAutoExecution,
    
    // フィードバック
    sendActionFeedback,
    
    // 設定
    updateAutomationLevel,
    toggleCharacterAI,
    
    // 緊急制御
    emergencyStop,

    // ユーティリティ
    hasAICharacters: aiCharacters.length > 0,
    isAutoExecuting: intervalRef.current !== null,
  };
};