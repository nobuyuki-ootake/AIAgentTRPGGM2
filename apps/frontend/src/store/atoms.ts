import { atom } from 'recoil';
import { TRPGCampaign, Character, SessionState } from '@ai-agent-trpg/types';

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
  events?: any[];
  quests?: any[];
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