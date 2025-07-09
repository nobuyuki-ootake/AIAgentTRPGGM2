import { useCallback, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { sessionInitializationProgressAtom } from '../store/atoms';
import { useSessionInitialization } from './useSessionInitialization';
import { SessionInitializationRequest } from '../api/aiGameMaster';

export function useSessionInitializationModal() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const progress = useRecoilValue(sessionInitializationProgressAtom);
  const { 
    startInitialization, 
    cancelInitialization, 
    resetProgress 
  } = useSessionInitialization();

  /**
   * セッション初期化を開始してモーダルを表示
   */
  const startInitializationWithModal = useCallback(async (
    request: SessionInitializationRequest
  ) => {
    setIsModalOpen(true);
    
    try {
      const result = await startInitialization(request, {
        onProgress: (progress) => {
          // 進捗更新は useSessionInitialization フックで処理
          console.log('Progress update:', progress);
        },
        onPhaseChange: (phase, progress) => {
          console.log(`Phase changed to ${phase} with progress ${progress}%`);
        },
        onComplete: (result) => {
          console.log('Session initialization completed:', result);
          // モーダルは自動的に閉じない（ユーザーが手動で閉じる）
        },
        onError: (error) => {
          console.error('Session initialization error:', error);
          // エラーの場合も、モーダルは開いたままにしてエラーを表示
        },
      });
      
      return result;
    } catch (error) {
      console.error('Failed to start session initialization:', error);
      throw error;
    }
  }, [startInitialization]);

  /**
   * セッション初期化をキャンセル
   */
  const cancelInitializationWithModal = useCallback(() => {
    cancelInitialization();
    // モーダルは開いたままにしてキャンセル状態を表示
  }, [cancelInitialization]);

  /**
   * モーダルを閉じる
   */
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    // 進捗データをリセット（必要に応じて）
    if (!progress.isInitializing) {
      resetProgress();
    }
  }, [progress.isInitializing, resetProgress]);

  /**
   * モーダルを開く（進捗データが既にある場合）
   */
  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  /**
   * 初期化が進行中かどうかを確認
   */
  const isInitializing = progress.isInitializing;

  /**
   * 初期化が完了したかどうかを確認
   */
  const isCompleted = !progress.isInitializing && progress.overallProgress === 100 && !progress.error;

  /**
   * エラーが発生したかどうかを確認
   */
  const hasError = !!progress.error;

  return {
    isModalOpen,
    isInitializing,
    isCompleted,
    hasError,
    progress,
    startInitializationWithModal,
    cancelInitializationWithModal,
    closeModal,
    openModal,
  };
}