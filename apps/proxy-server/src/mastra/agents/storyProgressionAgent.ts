// ==========================================
// Story Progression Agent - AI自律判断によるシナリオ進行
// Phase 4-2.3.2: マイルストーン完了時のAI自律判断機能
// ==========================================

import { Agent, type Step } from '@mastra/core';
import { logger } from '../../utils/logger';

export interface StoryProgressionContext {
  sessionId: string;
  milestoneId: string;
  milestoneName: string;
  narrativeText: string;
  completedBy: string;
  sessionState: {
    currentLocation?: string;
    activeCharacters: string[];
    totalMilestones: number;
    completedMilestones: number;
    sessionDuration: number; // セッション継続時間（分）
    lastPlayerAction?: string;
    recentActionCount: number; // 直近の行動回数
  };
  contextualFactors: {
    storyTension: 'low' | 'medium' | 'high'; // 物語の緊張感
    playerEngagement: 'low' | 'medium' | 'high'; // プレイヤーの関与度
    narrativePacing: 'slow' | 'normal' | 'fast'; // 物語のペース
    timeOfSession: 'early' | 'middle' | 'late'; // セッション時間帯
  };
}

export interface StoryProgressionDecision {
  shouldProgress: boolean;
  progressionType: 'immediate' | 'delayed' | 'none';
  confidence: number; // 0.0-1.0
  reasoning: string;
  suggestedActions: {
    narrativeAnnouncement?: string;
    unlockEntities?: string[];
    spawnNPCs?: string[];
    environmentChanges?: string[];
    nextStoryBeat?: string;
  };
  timing: {
    delayMinutes?: number;
    triggerCondition?: string;
  };
}

/**
 * Story Progression Agent
 * マイルストーン完了時に、現在のセッション状況を分析し、
 * 自然なタイミングでのシナリオ進行を自律的に判断する AI Agent
 */
export const storyProgressionAgent = new Agent({
  name: 'Story Progression AI',
  instructions: `
あなたは TRPG セッションの物語進行を管理する AI ゲームマスターです。
マイルストーン完了時に、以下の判断を行ってください：

## 判断基準

### 1. シナリオ進行の必要性
- プレイヤーの行動の結果として自然か？
- 物語の流れが停滞していないか？
- 新展開が物語を豊かにするか？

### 2. タイミングの適切性
- プレイヤーが「やりきった感」を感じているか？
- 次の行動を迷っているサインがあるか？
- セッション時間と進行バランスは適切か？

### 3. 進行タイプの選択
- **immediate**: 即座に新展開（劇的な変化、重要な発見）
- **delayed**: 少し間を置いて進行（緊張感の醸成、期待の高まり）
- **none**: 進行せず、プレイヤーの自然な探索を継続

### 4. 自然性の重視
- プレイヤーが「システム操作」を感じないように
- 行動の結果として当然の展開に見えるように
- TRPGの楽しさ（考えて、対話して、シナリオを進める）を最優先

## 出力形式
必ず JSON 形式で以下を出力してください：
{
  "shouldProgress": boolean,
  "progressionType": "immediate" | "delayed" | "none",
  "confidence": number,
  "reasoning": "判断理由の詳細説明",
  "suggestedActions": {
    "narrativeAnnouncement": "GMからの物語的アナウンス（任意）",
    "unlockEntities": ["解放するエンティティのリスト"],
    "spawnNPCs": ["登場させるNPCのリスト"],
    "environmentChanges": ["環境変化のリスト"],
    "nextStoryBeat": "次の物語展開のヒント"
  },
  "timing": {
    "delayMinutes": number,
    "triggerCondition": "遅延トリガー条件（任意）"
  }
}
`,
  model: {
    provider: 'openai',
    name: 'gpt-4',
    toolChoice: 'auto',
  },
});

/**
 * Story Progression Agent の実行
 */
export async function evaluateStoryProgression(
  context: StoryProgressionContext
): Promise<StoryProgressionDecision> {
  try {
    logger.info(`🎭 Story Progression Agent evaluating milestone completion: ${context.milestoneName}`);

    // Agent にコンテキストを渡して判断を実行
    const result = await storyProgressionAgent.generate(
      `マイルストーン「${context.milestoneName}」が完了しました。以下の状況を分析して、シナリオ進行の判断を行ってください：

## マイルストーン情報
- ID: ${context.milestoneId}
- 名前: ${context.milestoneName}
- 完了者: ${context.completedBy}
- ナラティブ: ${context.narrativeText}

## セッション状態
- セッションID: ${context.sessionId}
- 現在地: ${context.sessionState.currentLocation || '不明'}
- アクティブキャラクター: ${context.sessionState.activeCharacters.join(', ')}
- 進行状況: ${context.sessionState.completedMilestones}/${context.sessionState.totalMilestones} マイルストーン完了
- セッション時間: ${context.sessionState.sessionDuration}分
- 最近の行動: ${context.sessionState.lastPlayerAction || '不明'}
- 行動頻度: ${context.sessionState.recentActionCount}回（直近）

## コンテキスト要因
- 物語緊張感: ${context.contextualFactors.storyTension}
- プレイヤー関与: ${context.contextualFactors.playerEngagement}
- 物語ペース: ${context.contextualFactors.narrativePacing}
- セッション段階: ${context.contextualFactors.timeOfSession}

上記を総合的に判断して、シナリオ進行の決定を JSON 形式で出力してください。`,
      {
        schema: {
          type: 'object',
          properties: {
            shouldProgress: { type: 'boolean' },
            progressionType: { type: 'string', enum: ['immediate', 'delayed', 'none'] },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            reasoning: { type: 'string' },
            suggestedActions: {
              type: 'object',
              properties: {
                narrativeAnnouncement: { type: 'string' },
                unlockEntities: { type: 'array', items: { type: 'string' } },
                spawnNPCs: { type: 'array', items: { type: 'string' } },
                environmentChanges: { type: 'array', items: { type: 'string' } },
                nextStoryBeat: { type: 'string' }
              }
            },
            timing: {
              type: 'object',
              properties: {
                delayMinutes: { type: 'number' },
                triggerCondition: { type: 'string' }
              }
            }
          },
          required: ['shouldProgress', 'progressionType', 'confidence', 'reasoning', 'suggestedActions']
        }
      }
    );

    const decision = result.object as StoryProgressionDecision;

    logger.info(`🎯 Story Progression Decision: ${decision.shouldProgress ? 'PROGRESS' : 'WAIT'} (${decision.confidence * 100}% confidence)`);
    logger.info(`🎪 Reasoning: ${decision.reasoning}`);

    return decision;

  } catch (error) {
    logger.error('Story Progression Agent evaluation failed:', error);
    
    // フォールバック決定（エラー時は進行させない）
    return {
      shouldProgress: false,
      progressionType: 'none',
      confidence: 0.0,
      reasoning: 'AI判断エラーのため自動進行を停止。手動での進行を推奨。',
      suggestedActions: {},
      timing: {}
    };
  }
}

/**
 * セッション状況の分析（ヘルパー関数）
 */
export function analyzeSessionContext(
  sessionData: any,
  recentActions: any[]
): StoryProgressionContext['sessionState'] {
  return {
    currentLocation: sessionData.currentLocation,
    activeCharacters: sessionData.characters?.map((c: any) => c.name) || [],
    totalMilestones: sessionData.milestones?.length || 0,
    completedMilestones: sessionData.milestones?.filter((m: any) => m.status === 'completed')?.length || 0,
    sessionDuration: Math.floor((Date.now() - new Date(sessionData.startTime).getTime()) / 60000),
    lastPlayerAction: recentActions[0]?.action || undefined,
    recentActionCount: recentActions.length
  };
}

/**
 * コンテキスト要因の評価（ヘルパー関数）
 */
export function evaluateContextualFactors(
  sessionState: StoryProgressionContext['sessionState'],
  recentActions: any[]
): StoryProgressionContext['contextualFactors'] {
  // 簡易的な評価ロジック（実際のプロジェクトでは詳細な分析を実装）
  const progressRatio = sessionState.completedMilestones / sessionState.totalMilestones;
  const actionFrequency = sessionState.recentActionCount / Math.max(sessionState.sessionDuration / 10, 1);
  
  return {
    storyTension: progressRatio > 0.7 ? 'high' : progressRatio > 0.3 ? 'medium' : 'low',
    playerEngagement: actionFrequency > 2 ? 'high' : actionFrequency > 1 ? 'medium' : 'low',
    narrativePacing: sessionState.sessionDuration > 90 ? 'slow' : sessionState.sessionDuration > 30 ? 'normal' : 'fast',
    timeOfSession: progressRatio > 0.8 ? 'late' : progressRatio > 0.3 ? 'middle' : 'early'
  };
}