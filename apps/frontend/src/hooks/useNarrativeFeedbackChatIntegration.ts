import { useEffect, useCallback } from 'react';
import { useRecoilValue } from 'recoil';
import { 
  narrativeFeedbacksAtom, 
  narrativeFeedbackSettingsAtom,
  type NarrativeFeedback 
} from '../store/atoms';

interface UseNarrativeFeedbackChatIntegrationOptions {
  sessionId?: string;
  onSendMessage?: (message: string, type: 'ic' | 'ooc' | 'system', characterId?: string) => void;
  enabled?: boolean;
}

export const useNarrativeFeedbackChatIntegration = ({
  sessionId,
  onSendMessage,
  enabled = true,
}: UseNarrativeFeedbackChatIntegrationOptions) => {
  const narrativeFeedbacks = useRecoilValue(narrativeFeedbacksAtom);
  const settings = useRecoilValue(narrativeFeedbackSettingsAtom);

  // ナラティブフィードバックをチャットメッセージに変換
  const formatNarrativeForChat = useCallback((feedback: NarrativeFeedback): string => {
    const toneEmoji = {
      dramatic: '🎭',
      triumphant: '🏆', 
      mysterious: '🔮',
      contemplative: '💭',
      tense: '⚡',
    };

    const weightPrefix = {
      minor: '',
      significant: '📖 ',
      major: '⭐ ',
      pivotal: '🌟 ',
    };

    const emoji = toneEmoji[feedback.mainNarrative.tone] || '📚';
    const prefix = weightPrefix[feedback.narrativeWeight] || '';
    
    return `${prefix}${emoji} **${feedback.mainNarrative.title}**\n\n${feedback.mainNarrative.content}\n\n*マイルストーン「${feedback.milestoneName}」の進展*`;
  }, []);

  // ナラティブフィードバックの投稿処理
  const postNarrativeToChat = useCallback((feedback: NarrativeFeedback) => {
    if (!onSendMessage || !enabled || !sessionId) {
      return;
    }

    // セッションIDが一致しない場合はスキップ
    if (feedback.sessionId !== sessionId) {
      return;
    }

    // チャット統合が無効の場合はスキップ
    if (!settings.enableChatIntegration) {
      return;
    }

    // 重みフィルターをチェック
    if (!settings.weightFilter.includes(feedback.narrativeWeight)) {
      return;
    }

    // minorの場合は簡潔版を投稿
    let chatMessage: string;
    if (feedback.narrativeWeight === 'minor') {
      chatMessage = `📖 ${feedback.mainNarrative.title}\n*${feedback.milestoneName}の進展*`;
    } else {
      chatMessage = formatNarrativeForChat(feedback);
    }

    try {
      // システムメッセージとして投稿（AIナレーターとして）
      onSendMessage(chatMessage, 'system', 'ai-narrator');
    } catch (error) {
      console.error('Failed to post narrative feedback to chat:', error);
    }
  }, [onSendMessage, enabled, sessionId, settings.enableChatIntegration, settings.weightFilter, formatNarrativeForChat]);

  // 新しいナラティブフィードバックの監視と自動投稿
  useEffect(() => {
    if (!enabled || !onSendMessage || !sessionId) {
      return;
    }

    // 最新のフィードバックをチェック（最初の要素）
    const latestFeedback = narrativeFeedbacks[0];
    
    if (latestFeedback && 
        latestFeedback.sessionId === sessionId &&
        !latestFeedback.isRead) {
      
      // 少し遅延を入れてチャットに投稿（UIの更新タイミングを調整）
      const timeoutId = setTimeout(() => {
        postNarrativeToChat(latestFeedback);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [narrativeFeedbacks, enabled, onSendMessage, sessionId, postNarrativeToChat]);

  // マニュアル投稿用の関数を返す
  const manualPostToChat = useCallback((feedbackId: string) => {
    const feedback = narrativeFeedbacks.find(f => f.id === feedbackId);
    if (feedback) {
      postNarrativeToChat(feedback);
    }
  }, [narrativeFeedbacks, postNarrativeToChat]);

  // 複数のフィードバックを一括投稿
  const postMultipleToChat = useCallback((feedbackIds: string[]) => {
    feedbackIds.forEach((id, index) => {
      setTimeout(() => {
        manualPostToChat(id);
      }, index * 2000); // 2秒間隔で投稿
    });
  }, [manualPostToChat]);

  return {
    postNarrativeToChat: manualPostToChat,
    postMultipleToChat,
    formatNarrativeForChat,
    isIntegrationEnabled: enabled && settings.enableChatIntegration,
  };
};