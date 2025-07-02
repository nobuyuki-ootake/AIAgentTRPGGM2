// ==========================================
// AIクエリシステム関連型定義
// ==========================================

import { ID, DateTime } from '../base';
import { AIConditionExpression } from './ai-conditions';

// ==========================================
// AIクエリシステム
// ==========================================

export interface AIQueryFilter {
  entityTypes?: string[];
  priority?: {
    min: number;
    max: number;
  };
  tags?: string[];
  excludeIds?: ID[];
  conditions?: AIConditionExpression[];
  contextFactors?: Record<string, any>;
  timeConstraints?: {
    startTime?: DateTime;
    endTime?: DateTime;
  };
  location?: string;
  
  // AI判断フィルタ
  aiCriteria?: {
    recommendationScore?: {
      min: number; // 0-1
      max: number;
    };
    playerAlignment?: {
      min: number; // プレイヤー好みとの一致度
    };
    storyRelevance?: {
      min: number; // ストーリーとの関連度
    };
    difficultyMatch?: {
      target: number; // 目標難易度
      tolerance: number; // 許容範囲
    };
  };
}

export interface AIQueryResult<T = any> {
  entities: T[];
  totalCount: number;
  executionTime: number;
  relevanceScores: number[];
  metadata: {
    filtersApplied: string[];
    sortedBy: string;
    cacheHit: boolean;
    suggestions: string[];
  };
}