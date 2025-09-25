import React, { useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useNotification } from '../common/NotificationProvider';
import { 
  gmNotificationsAtom, 
  gmNotificationUnreadCountAtom, 
  gmNotificationSettingsAtom,
  narrativeFeedbacksAtom,
  narrativeFeedbackUnreadCountAtom,
  narrativeFeedbackSettingsAtom,
  type NarrativeFeedback
} from '../../store/atoms';
import { GMNotification } from '@ai-agent-trpg/types';
import { v4 as uuidv4 } from 'uuid';

interface GMNotificationProviderProps {
  children: React.ReactNode;
  sessionId?: string;
}

export const GMNotificationProvider: React.FC<GMNotificationProviderProps> = ({ 
  children, 
  sessionId 
}) => {
  const { onGMNotification, onNarrativeFeedback, joinSession } = useWebSocket();
  const { showInfo, showWarning, showSuccess } = useNotification();
  
  const [gmNotifications, setGmNotifications] = useRecoilState(gmNotificationsAtom);
  const [unreadCount, setUnreadCount] = useRecoilState(gmNotificationUnreadCountAtom);
  const [settings] = useRecoilState(gmNotificationSettingsAtom);
  
  // 🆕 Phase 4-4.2: ナラティブフィードバック状態管理
  const [narrativeFeedbacks, setNarrativeFeedbacks] = useRecoilState(narrativeFeedbacksAtom);
  const [narrativeFeedbackUnreadCount, setNarrativeFeedbackUnreadCount] = useRecoilState(narrativeFeedbackUnreadCountAtom);
  const [narrativeFeedbackSettings] = useRecoilState(narrativeFeedbackSettingsAtom);

  // セッション参加
  useEffect(() => {
    if (sessionId) {
      joinSession(sessionId);
    }
  }, [sessionId, joinSession]);

  // GM通知受信処理
  useEffect(() => {
    onGMNotification((data) => {
      const notification = data.notification;
      
      // 通知を状態に追加
      setGmNotifications(prev => [notification, ...prev.slice(0, 49)]);
      
      // 未読カウント更新
      if (notification.status === 'unread') {
        setUnreadCount(prev => prev + 1);
      }

      // 優先度フィルタリング
      if (!settings.priorityFilter.includes(notification.priority)) {
        return;
      }

      // UI通知表示
      const message = `${notification.title}: ${notification.message}`;
      if (notification.priority === 'high') {
        showWarning(message);
      } else {
        showInfo(message);
      }

      // サウンド再生
      if (settings.enableSound) {
        playNotificationSound(notification.priority);
      }

      // デスクトップ通知
      if (settings.enableDesktop && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico',
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission();
        }
      }
    });
  }, [onGMNotification, setGmNotifications, setUnreadCount, settings, showInfo, showWarning]);

  // 🆕 Phase 4-4.2: ナラティブフィードバック受信処理
  useEffect(() => {
    onNarrativeFeedback((data) => {
      const narrativeFeedback: NarrativeFeedback = {
        id: uuidv4(),
        sessionId: sessionId || '',
        milestoneName: data.data.milestoneName,
        mainNarrative: {
          title: data.data.mainNarrative.title,
          content: data.data.mainNarrative.content,
          tone: data.data.mainNarrative.tone,
          length: 'standard' // デフォルト値
        },
        narrativeWeight: data.data.narrativeWeight,
        timestamp: data.timestamp,
        isDetailedFeedback: data.data.isDetailedFeedback,
        isRead: false
      };
      
      // ナラティブフィードバックを状態に追加
      setNarrativeFeedbacks(prev => [narrativeFeedback, ...prev.slice(0, 29)]); // 上位30件を保持
      
      // 未読カウント更新
      setNarrativeFeedbackUnreadCount(prev => prev + 1);

      // 重みフィルタリング
      if (!narrativeFeedbackSettings.weightFilter.includes(narrativeFeedback.narrativeWeight)) {
        return;
      }

      // トーンフィルタリング
      if (!narrativeFeedbackSettings.tonePreference.includes(narrativeFeedback.mainNarrative.tone)) {
        return;
      }

      // UI通知表示
      const message = `📜 ${narrativeFeedback.mainNarrative.title}`;
      const details = narrativeFeedback.mainNarrative.content.length > 100 
        ? narrativeFeedback.mainNarrative.content.substring(0, 100) + '...' 
        : narrativeFeedback.mainNarrative.content;
      
      if (narrativeFeedback.narrativeWeight === 'pivotal' || narrativeFeedback.narrativeWeight === 'major') {
        showWarning(`${message}\n${details}`);
      } else if (narrativeFeedback.narrativeWeight === 'significant') {
        showInfo(`${message}\n${details}`);
      } else {
        showSuccess(message);
      }

      // サウンド再生（major以上の場合のみ）
      if (narrativeFeedbackSettings.enableSoundForMajor && 
          (narrativeFeedback.narrativeWeight === 'major' || narrativeFeedback.narrativeWeight === 'pivotal')) {
        playNarrativeSound(narrativeFeedback.mainNarrative.tone);
      }

      // デスクトップ通知（pivotalの場合のみ）
      if (narrativeFeedback.narrativeWeight === 'pivotal' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(`🎧 ${narrativeFeedback.milestoneName} の物語が進展しました`, {
            body: narrativeFeedback.mainNarrative.title,
            icon: '/favicon.ico',
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission();
        }
      }
    });
  }, [onNarrativeFeedback, setNarrativeFeedbacks, setNarrativeFeedbackUnreadCount, narrativeFeedbackSettings, sessionId, showInfo, showWarning, showSuccess]);

  const playNotificationSound = (priority: GMNotification['priority']) => {
    try {
      const audio = new Audio();
      audio.src = priority === 'high' ? '/sounds/alert-high.mp3' : '/sounds/alert.mp3';
      audio.volume = 0.5;
      audio.play().catch(() => {}); // 音声再生失敗は無視
    } catch (error) {
      // 音声ファイルが存在しない場合は無視
    }
  };

  const playNarrativeSound = (tone: NarrativeFeedback['mainNarrative']['tone']) => {
    try {
      const audio = new Audio();
      // トーンに応じた音声ファイルを選択
      switch (tone) {
        case 'dramatic':
        case 'tense':
          audio.src = '/sounds/narrative-dramatic.mp3';
          break;
        case 'triumphant':
          audio.src = '/sounds/narrative-triumphant.mp3';
          break;
        case 'mysterious':
          audio.src = '/sounds/narrative-mysterious.mp3';
          break;
        case 'contemplative':
          audio.src = '/sounds/narrative-contemplative.mp3';
          break;
        default:
          audio.src = '/sounds/narrative-default.mp3';
      }
      audio.volume = 0.4;
      audio.play().catch(() => {}); // 音声再生失敗は無視
    } catch (error) {
      // 音声ファイルが存在しない場合は無視
    }
  };

  return <>{children}</>;
};