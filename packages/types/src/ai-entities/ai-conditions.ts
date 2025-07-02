// ==========================================
// AI条件式・ゲームコンテキスト関連型定義
// ==========================================

import { ID, DateTime } from '../base';

// ==========================================
// AI条件式システム
// ==========================================

export interface AIConditionExpression {
  id?: ID;
  type: 'simple' | 'compound' | 'function' | 'contextual';
  description?: string;
  priority?: number;
  field?: string;
  operator?: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'and' | 'or' | 'not';
  value?: any;
  conditions?: AIConditionExpression[];
  function_name?: string;
  parameters?: any;
  context_type?: string;
  context_data?: any;
}

// ==========================================
// AIゲームコンテキスト
// ==========================================

export interface AIGameContext {
  sessionId: ID;
  campaignId: ID;
  sessionMode: 'exploration' | 'combat' | 'social' | 'rest' | 'planning';
  
  currentState: {
    player?: {
      id: string;
      name: string;
      level: number;
      location: string;
      stats: Record<string, number>;
      items: string[];
      status: string[];
      relationships: Record<string, number>;
    };
    time?: {
      hour: number;
      day: number;
      season: string;
    };
    weather?: string | {
      type: string;
      severity: number;
    };
    flags?: Record<string, boolean>;
    story?: {
      currentChapter?: string;
      progress?: number;
      keyEvents?: string[];
    };
  };
  
  recentHistory?: {
    events: Array<{
      type: string;
      description: string;
      timestamp: string;
      actualStartTime?: DateTime;
      scheduledDate?: DateTime;
    }>;
    actions: string[];
    decisions: Array<{
      choice: string;
      outcome: string;
      timestamp: string;
    }>;
  };
  
  metadata?: {
    turn?: number;
    difficulty?: number;
    pacing?: 'slow' | 'normal' | 'fast';
  };
  
  contextTags?: string[];
  npcsPresent?: string[];
}

// ==========================================
// AI決定コンテキスト
// ==========================================

export interface AIDecisionContext {
  characterId: ID;
  currentLocation: string;
  availableActions: string[];
  recentEvents: string[];
  partyMembers: ID[];
  timeOfDay: string;
  urgency: number;
}

// ==========================================
// 型ガード関数（条件式用）
// ==========================================

export function isAIConditionExpression(obj: any): obj is AIConditionExpression {
  return obj && typeof obj.type === 'string' && ['simple', 'compound', 'function', 'contextual'].includes(obj.type);
}