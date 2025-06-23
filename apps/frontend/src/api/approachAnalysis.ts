import { apiClient } from './client';
import { ID } from '@ai-agent-trpg/types';

interface GameContext {
  sessionMode: 'exploration' | 'combat' | 'social';
  currentLocation: string;
  activeNPCs: string[];
  recentEvents: string[];
  campaignTension: number; // 0-100: current story tension
  characterStates: Record<ID, {
    health: number;
    stress: number;
    resources: number;
  }>;
}

interface ApproachAnalysisRequest {
  sessionId: ID;
  characterId: ID;
  playerInput: string;
  context: GameContext;
  targetDifficulty?: number;
  provider: string;
  apiKey: string;
  model?: string;
}

interface DifficultyModifier {
  id: ID;
  type: 'creativity_bonus' | 'logic_bonus' | 'appropriateness_penalty' | 'feasibility_penalty' | 
        'character_expertise' | 'situation_modifier' | 'retry_reduction';
  name: string;
  description: string;
  modifier: number; // +/- difficulty points
  reasoning: string;
}

interface ApproachAnalysis {
  id: ID;
  sessionId: ID;
  characterId: ID;
  playerInput: string;
  
  // 解析結果
  approachType: 'combat' | 'stealth' | 'social' | 'investigation' | 'magic' | 'creative' | 'direct';
  creativity: number; // 0-100: 創造性スコア
  logicality: number; // 0-100: 論理性スコア
  appropriateness: number; // 0-100: 状況適切性スコア
  feasibility: number; // 0-100: 実現可能性スコア
  
  // 難易度調整
  baseDifficulty: number; // 基本難易度 (5-30)
  adjustedDifficulty: number; // 調整後難易度 (5-30)
  difficultyModifiers: DifficultyModifier[];
  
  // チェック種別
  checkType: 'skill' | 'power' | 'combat' | 'special' | 'narrative';
  recommendedSkills: string[];
  
  // AI評価
  aiEvaluation: {
    reasoning: string;
    suggestions: string[];
    encouragement: string;
    riskAssessment: string;
  };
  
  // リトライ情報
  retryCount: number;
  previousAttempts: string[];
  difficultyReduction: number; // リトライ時の難易度減少量
  
  // メタデータ
  timestamp: string;
  processingTime: number;
  context: GameContext;
}

interface ApproachResponse {
  analysis: ApproachAnalysis;
  recommendedAction: string;
  alternativeApproaches: string[];
  checkInstructions: {
    type: ApproachAnalysis['checkType'];
    difficulty: number;
    skills: string[];
    description: string;
  };
}

interface QuickAnalysis {
  approachType: string;
  estimatedDifficulty: number;
  recommendedCheckType: string;
  suggestions: string[];
}

interface BatchAnalysisResult {
  success?: boolean;
  data?: ApproachResponse;
  error?: string;
  approach?: string;
}


export const approachAnalysisAPI = {
  /**
   * プレイヤーのアプローチを完全分析
   */
  async analyzeApproach(request: ApproachAnalysisRequest): Promise<ApproachResponse> {
    const response = await apiClient.post<ApproachResponse>(
      '/approach-analysis/analyze',
      request,
    );
    return response;
  },

  /**
   * セッションのアプローチ分析履歴を取得
   */
  async getAnalysisHistory(sessionId: ID, limit: number = 10): Promise<ApproachAnalysis[]> {
    const response = await apiClient.get<ApproachAnalysis[]>(
      `/approach-analysis/history/${sessionId}?limit=${limit}`,
    );
    return response;
  },

  /**
   * 特定の分析結果を取得
   */
  async getAnalysisById(analysisId: ID): Promise<ApproachAnalysis> {
    const response = await apiClient.get<ApproachAnalysis>(
      `/approach-analysis/${analysisId}`,
    );
    return response;
  },

  /**
   * 簡易アプローチ分析（AI使用なし）
   */
  async quickAnalyze(playerInput: string, context: GameContext): Promise<QuickAnalysis> {
    const response = await apiClient.post<QuickAnalysis>(
      '/approach-analysis/quick-analyze',
      { playerInput, context },
    );
    return response;
  },

  /**
   * 複数のアプローチを一度に分析
   */
  async batchAnalyze(
    approaches: Omit<ApproachAnalysisRequest, 'provider' | 'apiKey' | 'model'>[],
    provider: string,
    apiKey: string,
    model?: string,
  ): Promise<BatchAnalysisResult[]> {
    const response = await apiClient.post<BatchAnalysisResult[]>(
      '/approach-analysis/batch-analyze',
      { approaches, provider, apiKey, model },
    );
    return response;
  },

  /**
   * アプローチタイプの説明を取得（便利メソッド）
   */
  getApproachTypeDescription(type: ApproachAnalysis['approachType']): string {
    const descriptions = {
      combat: '直接的な戦闘アプローチ。力で問題を解決しようとする方法。',
      stealth: '隠密アプローチ。発見されずに目的を達成しようとする方法。',
      social: '社交的アプローチ。対話や交渉で問題を解決しようとする方法。',
      investigation: '調査アプローチ。情報収集や分析で問題を解決しようとする方法。',
      magic: '魔法的アプローチ。魔術や超自然的な力を用いる方法。',
      creative: '創造的アプローチ。独創的で非常識な解決方法。',
      direct: '直接的アプローチ。シンプルで率直な解決方法。',
    };
    return descriptions[type] || '不明なアプローチタイプ';
  },

  /**
   * チェックタイプの説明を取得（便利メソッド）
   */
  getCheckTypeDescription(type: ApproachAnalysis['checkType']): string {
    const descriptions = {
      skill: 'スキルチェック - 技能や能力値を使った判定',
      power: 'パワーチェック - 力や持久力を使った強行突破判定',
      combat: '戦闘判定 - 戦闘技術や戦術的判断の判定',
      special: '特殊判定 - 魔法や特殊能力を使った判定',
      narrative: 'ナラティブ判定 - 物語的な判定や演出重視の判定',
    };
    return descriptions[type] || '不明なチェックタイプ';
  },

  /**
   * 難易度の説明を取得（便利メソッド）
   */
  getDifficultyDescription(difficulty: number): string {
    if (difficulty <= 8) return '非常に簡単 - 失敗することはほとんどない';
    if (difficulty <= 12) return '簡単 - 大抵の場合成功する';
    if (difficulty <= 16) return '普通 - 半々程度の成功率';
    if (difficulty <= 20) return '困難 - 成功するには努力が必要';
    if (difficulty <= 25) return '非常に困難 - 成功は運と技術次第';
    return '極めて困難 - 奇跡的な成功が必要';
  },

  /**
   * スコアの評価を取得（便利メソッド）
   */
  getScoreEvaluation(score: number): { level: string; description: string; color: string } {
    if (score >= 90) {
      return {
        level: '最高',
        description: '完璧に近い評価',
        color: 'success',
      };
    } else if (score >= 75) {
      return {
        level: '優秀',
        description: '非常に良い評価',
        color: 'success',
      };
    } else if (score >= 60) {
      return {
        level: '良好',
        description: '標準以上の評価',
        color: 'info',
      };
    } else if (score >= 40) {
      return {
        level: '普通',
        description: '平均的な評価',
        color: 'warning',
      };
    } else if (score >= 25) {
      return {
        level: '改善必要',
        description: '見直しが必要な評価',
        color: 'warning',
      };
    } else {
      return {
        level: '不適切',
        description: '大幅な見直しが必要',
        color: 'error',
      };
    }
  },

  /**
   * 修正要因の合計を計算（便利メソッド）
   */
  calculateTotalModifiers(modifiers: DifficultyModifier[]): {
    total: number;
    positive: number;
    negative: number;
    breakdown: Record<string, number>;
  } {
    let positive = 0;
    let negative = 0;
    const breakdown: Record<string, number> = {};

    modifiers.forEach(modifier => {
      if (modifier.modifier > 0) {
        positive += modifier.modifier;
      } else {
        negative += modifier.modifier;
      }
      breakdown[modifier.type] = (breakdown[modifier.type] || 0) + modifier.modifier;
    });

    return {
      total: positive + negative,
      positive,
      negative,
      breakdown,
    };
  },
};

// Export types for convenience
export type {
  ApproachAnalysisRequest,
  ApproachAnalysis,
  ApproachResponse,
  DifficultyModifier,
  GameContext,
  QuickAnalysis,
  BatchAnalysisResult,
};