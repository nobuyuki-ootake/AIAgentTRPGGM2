import { atom } from 'recoil';
import { TRPGCampaign, Character, SessionState, GMNotification } from '@ai-agent-trpg/types';

// ==========================================
// キャンペーン関連の状態
// ==========================================

export const currentCampaignAtom = atom<TRPGCampaign | null>({
  key: 'currentCampaign',
  default: null,
});

export const campaignListAtom = atom<TRPGCampaign[]>({
  key: 'campaignList',
  default: [],
});

export const campaignLoadingAtom = atom<boolean>({
  key: 'campaignLoading',
  default: false,
});

// ==========================================
// キャラクター関連の状態
// ==========================================

export const charactersAtom = atom<Character[]>({
  key: 'characters',
  default: [],
});

export const selectedCharacterAtom = atom<Character | null>({
  key: 'selectedCharacter',
  default: null,
});

export const characterLoadingAtom = atom<boolean>({
  key: 'characterLoading',
  default: false,
});

// ==========================================
// セッション関連の状態
// ==========================================

export const currentSessionAtom = atom<SessionState | null>({
  key: 'currentSession',
  default: null,
});

export const sessionListAtom = atom<SessionState[]>({
  key: 'sessionList',
  default: [],
});

export const sessionLoadingAtom = atom<boolean>({
  key: 'sessionLoading',
  default: false,
});

// ==========================================
// AI統合関連の状態
// ==========================================

export const aiProviderAtom = atom<string>({
  key: 'aiProvider',
  default: localStorage.getItem('aiProvider') || 'openai',
  effects: [
    ({ onSet }) => {
      onSet((newValue) => {
        localStorage.setItem('aiProvider', newValue);
      });
    },
  ],
});

export const aiModelAtom = atom<string>({
  key: 'aiModel',
  default: localStorage.getItem('aiModel') || 'gpt-3.5-turbo',
  effects: [
    ({ onSet }) => {
      onSet((newValue) => {
        localStorage.setItem('aiModel', newValue);
      });
    },
  ],
});

export const aiApiKeyAtom = atom<string>({
  key: 'aiApiKey',
  default: localStorage.getItem('aiApiKey') || '',
  effects: [
    ({ onSet }) => {
      onSet((newValue) => {
        if (newValue) {
          localStorage.setItem('aiApiKey', newValue);
        } else {
          localStorage.removeItem('aiApiKey');
        }
      });
    },
  ],
});

export const aiLoadingAtom = atom<boolean>({
  key: 'aiLoading',
  default: false,
});

export const aiErrorAtom = atom<string | null>({
  key: 'aiError',
  default: null,
});

// ==========================================
// UI状態管理
// ==========================================

export const sidebarOpenAtom = atom<boolean>({
  key: 'sidebarOpen',
  default: true,
});

export const themeAtom = atom<'light' | 'dark'>({
  key: 'theme',
  default: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
  effects: [
    ({ onSet }) => {
      onSet((newValue) => {
        localStorage.setItem('theme', newValue);
      });
    },
  ],
});

export const developerModeAtom = atom<boolean>({
  key: 'developerMode',
  default: localStorage.getItem('developerMode') === 'true',
  effects: [
    ({ onSet }) => {
      onSet((newValue) => {
        localStorage.setItem('developerMode', newValue.toString());
      });
    },
  ],
});

// ユーザーモード（プレイヤー体験モード）
export const userModeAtom = atom<boolean>({
  key: 'userMode',
  default: localStorage.getItem('userMode') === 'true',
  effects: [
    ({ onSet }) => {
      onSet((newValue) => {
        localStorage.setItem('userMode', newValue.toString());
      });
    },
  ],
});

// アプリケーションモード（開発者、ユーザー、標準）
export type AppMode = 'standard' | 'developer' | 'user';

export const appModeAtom = atom<AppMode>({
  key: 'appMode',
  default: (localStorage.getItem('appMode') as AppMode) || 'standard',
  effects: [
    ({ onSet }) => {
      onSet((newValue) => {
        localStorage.setItem('appMode', newValue);
      });
    },
  ],
});

// プレイヤーキャラクター（ユーザーモード時に操作するキャラクター）
export const playerCharacterAtom = atom<Character | null>({
  key: 'playerCharacter',
  default: null,
});

// ==========================================
// 通知・エラー管理
// ==========================================

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
}

export const notificationsAtom = atom<Notification[]>({
  key: 'notifications',
  default: [],
});

// ==========================================
// ローディング状態の統合管理
// ==========================================

export interface LoadingState {
  campaigns: boolean;
  characters: boolean;
  sessions: boolean;
  ai: boolean;
  general: boolean;
}

export const loadingStateAtom = atom<LoadingState>({
  key: 'loadingState',
  default: {
    campaigns: false,
    characters: false,
    sessions: false,
    ai: false,
    general: false,
  },
});

// ==========================================
// 選択要素（AI用コンテキスト）
// ==========================================

export interface SelectedElements {
  campaign?: TRPGCampaign;
  characters?: Character[];
  session?: SessionState;
  events?: unknown[];
  quests?: unknown[];
  notes?: string;
}

export const selectedElementsAtom = atom<SelectedElements>({
  key: 'selectedElements',
  default: {},
});

// ==========================================
// フォーム状態管理
// ==========================================

export const formDirtyAtom = atom<boolean>({
  key: 'formDirty',
  default: false,
});

export const unsavedChangesAtom = atom<boolean>({
  key: 'unsavedChanges',
  default: false,
});

// ==========================================
// Phase 4-1: GM通知システム関連の状態
// ==========================================

export const gmNotificationsAtom = atom<GMNotification[]>({
  key: 'gmNotifications',
  default: [],
});

export const gmNotificationUnreadCountAtom = atom<number>({
  key: 'gmNotificationUnreadCount',
  default: 0,
});

export const gmNotificationSettingsAtom = atom<{
  enableSound: boolean;
  enableDesktop: boolean;
  autoMarkAsRead: boolean;
  priorityFilter: ('high' | 'medium' | 'low')[];
}>({
  key: 'gmNotificationSettings',
  default: {
    enableSound: true,
    enableDesktop: true,
    autoMarkAsRead: false,
    priorityFilter: ['high', 'medium', 'low'],
  },
});

export const gmNotificationLoadingAtom = atom<boolean>({
  key: 'gmNotificationLoading',
  default: false,
});

export const gmNotificationErrorAtom = atom<string | null>({
  key: 'gmNotificationError',
  default: null,
});

// ==========================================
// Phase 4-4.2: ナラティブフィードバック関連の状態
// ==========================================

export interface NarrativeFeedback {
  id: string;
  sessionId: string;
  milestoneName: string;
  mainNarrative: {
    title: string;
    content: string;
    tone: 'dramatic' | 'triumphant' | 'mysterious' | 'contemplative' | 'tense';
    length: 'brief' | 'standard' | 'detailed';
  };
  narrativeWeight: 'minor' | 'significant' | 'major' | 'pivotal';
  timestamp: string;
  isDetailedFeedback: boolean;
  isRead: boolean;
}

export const narrativeFeedbacksAtom = atom<NarrativeFeedback[]>({
  key: 'narrativeFeedbacks',
  default: [],
});

export const narrativeFeedbackUnreadCountAtom = atom<number>({
  key: 'narrativeFeedbackUnreadCount',
  default: 0,
});

export const narrativeFeedbackSettingsAtom = atom<{
  enableDetailedDisplay: boolean;
  enableChatIntegration: boolean;
  enableSoundForMajor: boolean;
  weightFilter: ('minor' | 'significant' | 'major' | 'pivotal')[];
  tonePreference: ('dramatic' | 'triumphant' | 'mysterious' | 'contemplative' | 'tense')[];
}>({
  key: 'narrativeFeedbackSettings',
  default: {
    enableDetailedDisplay: true,
    enableChatIntegration: true,
    enableSoundForMajor: true,
    weightFilter: ['minor', 'significant', 'major', 'pivotal'],
    tonePreference: ['dramatic', 'triumphant', 'mysterious', 'contemplative', 'tense'],
  },
});

export const narrativeFeedbackLoadingAtom = atom<boolean>({
  key: 'narrativeFeedbackLoading',
  default: false,
});

export const narrativeFeedbackErrorAtom = atom<string | null>({
  key: 'narrativeFeedbackError',
  default: null,
});