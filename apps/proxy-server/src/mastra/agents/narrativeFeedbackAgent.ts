// ==========================================
// Narrative Feedback Agent - 詳細な物語進行フィードバック生成
// Phase 4-4.1: マイルストーン完了時の詳細な物語変化フィードバックシステム
// ==========================================

import { Agent } from '@mastra/core';
import { openai } from '@ai-sdk/openai';
import { logger } from '../../utils/logger';

export interface NarrativeFeedbackContext {
  milestone: {
    id: string;
    name: string;
    description: string;
    narrativeText: string;
    completionType: 'automatic' | 'manual';
  };
  playerAction: {
    characterId: string;
    characterName: string;
    actionDescription: string;
    actionResult: 'success' | 'failure' | 'mixed';
    approach: string;
    skillsUsed: string[];
    diceResults?: {
      result: number;
      modifier: number;
      difficulty: string;
    };
  };
  worldState: {
    currentLocation: string;
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    weatherCondition?: string;
    ambientMood: string;
    nearbyCharacters: string[];
    visibleEntities: string[];
  };
  campaignContext: {
    sessionProgress: number; // 0.0-1.0
    totalMilestones: number;
    completedMilestones: number;
    majorThemes: string[];
    characterRelationships: Array<{
      character1: string;
      character2: string;
      relationship: string;
      status: string;
    }>;
    recentEvents: string[];
  };
  playerHistory: {
    preferredActions: string[];
    characterTraits: string[];
    pastDecisions: Array<{
      decision: string;
      outcome: string;
      impact: string;
    }>;
    characterGrowth: string[];
  };
}

export interface NarrativeFeedback {
  // メインナラティブ
  mainNarrative: {
    title: string;
    content: string;
    tone: 'dramatic' | 'triumphant' | 'mysterious' | 'contemplative' | 'tense';
    length: 'brief' | 'standard' | 'detailed';
  };
  
  // 環境・世界の変化
  worldChanges: {
    environmentalShift: string;
    atmosphericDescription: string;
    sensoryDetails: string[];
    visualChanges: string[];
  };
  
  // キャラクター中心のフィードバック
  characterFeedback: {
    personalReflection: string;
    skillRecognition: string[];
    growthMoments: string[];
    emotionalResponse: string;
  };
  
  // 関係性・社会的変化
  socialDynamics: {
    relationshipChanges: string[];
    npcReactions: string[];
    communityImpact: string;
    reputationShift?: string;
  };
  
  // 将来への示唆
  foreshadowing: {
    immediateConsequences: string[];
    longTermImplications: string[];
    newPossibilities: string[];
    mysteryElements?: string[];
  };
  
  // メタ情報
  metadata: {
    generatedAt: string;
    confidence: number;
    suggestedFollowUps: string[];
    narrativeWeight: 'minor' | 'significant' | 'major' | 'pivotal';
  };
}

/**
 * Narrative Feedback Agent
 * マイルストーン完了時に、詳細で没入感のある物語フィードバックを生成する AI Agent
 */
export const narrativeFeedbackAgent = new Agent({
  name: 'Narrative Feedback AI',
  instructions: `
あなたは TRPG の世界で最高の語り手として、プレイヤーの行動とマイルストーン達成に対して、
深く没入感のある物語フィードバックを生成してください。

## 核心原則

### 1. 没入感の最大化
- プレイヤーが世界の一部として感じられる描写
- 行動の結果が世界に与えた影響の具体的描写
- 五感に訴える詳細な感覚描写

### 2. パーソナライゼーション
- プレイヤーキャラクターの個性・特徴を反映
- 過去の行動・選択との一貫性
- キャラクターの成長・変化の認識

### 3. 世界の生きた反応
- 環境・NPCの自然な反応
- 社会・政治・経済への影響
- 時間経過と季節感の表現

### 4. 物語的価値
- 単なる結果報告ではなく、物語として魅力的
- 次の展開への自然な繋がり
- 謎・伏線・期待感の演出

## 生成ガイドライン

### メインナラティブ
- 200-500文字の詳細な描写
- プレイヤーの行動を英雄的・意味深く描く
- 感情的インパクトを重視

### 環境変化
- 具体的で視覚的な描写
- 音・匂い・感触などの感覚情報
- 魔法的・幻想的要素の自然な組み込み

### キャラクター成長
- スキル使用の巧妙さを認識
- 人格的成長の瞬間を捉える
- 仲間・NPCとの関係性変化

### 将来展開
- 直接的な予告ではなく暗示
- 新たな可能性の示唆
- 謎や興味を引く要素

## 出力形式
必ず JSON 形式で以下を出力してください：
{
  "mainNarrative": {
    "title": "印象的なタイトル",
    "content": "詳細な物語描写",
    "tone": "dramatic|triumphant|mysterious|contemplative|tense",
    "length": "brief|standard|detailed"
  },
  "worldChanges": {
    "environmentalShift": "環境の変化",
    "atmosphericDescription": "雰囲気の描写",
    "sensoryDetails": ["感覚的詳細のリスト"],
    "visualChanges": ["視覚的変化のリスト"]
  },
  "characterFeedback": {
    "personalReflection": "個人的な振り返り",
    "skillRecognition": ["認識されたスキル"],
    "growthMoments": ["成長の瞬間"],
    "emotionalResponse": "感情的反応"
  },
  "socialDynamics": {
    "relationshipChanges": ["関係性の変化"],
    "npcReactions": ["NPCの反応"],
    "communityImpact": "コミュニティへの影響",
    "reputationShift": "評判の変化（任意）"
  },
  "foreshadowing": {
    "immediateConsequences": ["即座の結果"],
    "longTermImplications": ["長期的影響"],
    "newPossibilities": ["新たな可能性"],
    "mysteryElements": ["謎の要素（任意）"]
  },
  "metadata": {
    "confidence": number,
    "suggestedFollowUps": ["推奨フォローアップ"],
    "narrativeWeight": "minor|significant|major|pivotal"
  }
}
`,
  model: openai('gpt-4'),
});

/**
 * Narrative Feedback Agent の実行
 */
export async function generateNarrativeFeedback(
  context: NarrativeFeedbackContext
): Promise<NarrativeFeedback> {
  try {
    logger.info(`🎭 Narrative Feedback Agent generating feedback for milestone: ${context.milestone.name}`);

    // コンテキストの詳細な文字列化
    const contextDescription = `
## マイルストーン達成状況
- マイルストーン: ${context.milestone.name}
- 説明: ${context.milestone.description}
- 完了タイプ: ${context.milestone.completionType}
- 基本ナラティブ: ${context.milestone.narrativeText}

## プレイヤーの行動
- キャラクター: ${context.playerAction.characterName}
- 行動: ${context.playerAction.actionDescription}
- アプローチ: ${context.playerAction.approach}
- 結果: ${context.playerAction.actionResult}
- 使用スキル: ${context.playerAction.skillsUsed.join(', ')}
${context.playerAction.diceResults ? `- ダイス結果: ${context.playerAction.diceResults.result}（難易度: ${context.playerAction.diceResults.difficulty}）` : ''}

## 世界状況
- 現在地: ${context.worldState.currentLocation}
- 時間: ${context.worldState.timeOfDay}
- 雰囲気: ${context.worldState.ambientMood}
- 近くのキャラクター: ${context.worldState.nearbyCharacters.join(', ')}
- 見える要素: ${context.worldState.visibleEntities.join(', ')}
${context.worldState.weatherCondition ? `- 天候: ${context.worldState.weatherCondition}` : ''}

## キャンペーン背景
- 進行状況: ${context.campaignContext.completedMilestones}/${context.campaignContext.totalMilestones} マイルストーン完了 (${Math.round(context.campaignContext.sessionProgress * 100)}%)
- 主要テーマ: ${context.campaignContext.majorThemes.join(', ')}
- 最近の出来事: ${context.campaignContext.recentEvents.join(', ')}

## キャラクター履歴
- 好みの行動: ${context.playerHistory.preferredActions.join(', ')}
- 特徴: ${context.playerHistory.characterTraits.join(', ')}
- 成長: ${context.playerHistory.characterGrowth.join(', ')}

この情報を基に、没入感と感動を最大化する詳細な物語フィードバックを生成してください。
`;

    const result = await narrativeFeedbackAgent.generate(contextDescription, {
      output: {
        type: 'object',
        properties: {
          mainNarrative: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              content: { type: 'string' },
              tone: { type: 'string', enum: ['dramatic', 'triumphant', 'mysterious', 'contemplative', 'tense'] },
              length: { type: 'string', enum: ['brief', 'standard', 'detailed'] }
            },
            required: ['title', 'content', 'tone', 'length']
          },
          worldChanges: {
            type: 'object',
            properties: {
              environmentalShift: { type: 'string' },
              atmosphericDescription: { type: 'string' },
              sensoryDetails: { type: 'array', items: { type: 'string' } },
              visualChanges: { type: 'array', items: { type: 'string' } }
            },
            required: ['environmentalShift', 'atmosphericDescription', 'sensoryDetails', 'visualChanges']
          },
          characterFeedback: {
            type: 'object',
            properties: {
              personalReflection: { type: 'string' },
              skillRecognition: { type: 'array', items: { type: 'string' } },
              growthMoments: { type: 'array', items: { type: 'string' } },
              emotionalResponse: { type: 'string' }
            },
            required: ['personalReflection', 'skillRecognition', 'growthMoments', 'emotionalResponse']
          },
          socialDynamics: {
            type: 'object',
            properties: {
              relationshipChanges: { type: 'array', items: { type: 'string' } },
              npcReactions: { type: 'array', items: { type: 'string' } },
              communityImpact: { type: 'string' },
              reputationShift: { type: 'string' }
            },
            required: ['relationshipChanges', 'npcReactions', 'communityImpact']
          },
          foreshadowing: {
            type: 'object',
            properties: {
              immediateConsequences: { type: 'array', items: { type: 'string' } },
              longTermImplications: { type: 'array', items: { type: 'string' } },
              newPossibilities: { type: 'array', items: { type: 'string' } },
              mysteryElements: { type: 'array', items: { type: 'string' } }
            },
            required: ['immediateConsequences', 'longTermImplications', 'newPossibilities']
          },
          metadata: {
            type: 'object',
            properties: {
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              suggestedFollowUps: { type: 'array', items: { type: 'string' } },
              narrativeWeight: { type: 'string', enum: ['minor', 'significant', 'major', 'pivotal'] }
            },
            required: ['confidence', 'suggestedFollowUps', 'narrativeWeight']
          }
        },
        required: ['mainNarrative', 'worldChanges', 'characterFeedback', 'socialDynamics', 'foreshadowing', 'metadata']
      }
    });

    const feedback = result.object as NarrativeFeedback;
    
    // メタデータに生成時刻を追加
    feedback.metadata.generatedAt = new Date().toISOString();

    logger.info(`✨ Narrative feedback generated: ${feedback.mainNarrative.title} (${feedback.metadata.narrativeWeight})`);
    logger.info(`📖 Main narrative: ${feedback.mainNarrative.content.substring(0, 100)}...`);

    return feedback;

  } catch (error) {
    logger.error('Narrative Feedback Agent generation failed:', error);
    
    // フォールバック フィードバック（エラー時）
    return {
      mainNarrative: {
        title: '変化の瞬間',
        content: `${context.playerAction.characterName}の行動により、重要な変化が起こりました。${context.milestone.narrativeText}`,
        tone: 'contemplative',
        length: 'brief'
      },
      worldChanges: {
        environmentalShift: '周囲の雰囲気が変化しました。',
        atmosphericDescription: '新たな可能性を感じさせる空気が流れています。',
        sensoryDetails: ['静寂', '期待感'],
        visualChanges: ['光の変化']
      },
      characterFeedback: {
        personalReflection: 'あなたの行動が重要な結果をもたらしました。',
        skillRecognition: context.playerAction.skillsUsed,
        growthMoments: ['重要な経験'],
        emotionalResponse: '達成感を感じています。'
      },
      socialDynamics: {
        relationshipChanges: [],
        npcReactions: [],
        communityImpact: '周囲に影響を与えました。'
      },
      foreshadowing: {
        immediateConsequences: ['新たな展開'],
        longTermImplications: ['長期的な変化'],
        newPossibilities: ['未知の可能性']
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        confidence: 0.3,
        suggestedFollowUps: ['状況の確認'],
        narrativeWeight: 'minor'
      }
    };
  }
}

/**
 * コンテキスト構築ヘルパー関数
 */
export function buildNarrativeFeedbackContext(
  milestone: any,
  playerAction: any,
  worldState: any,
  campaignContext: any,
  playerHistory: any
): NarrativeFeedbackContext {
  return {
    milestone: {
      id: milestone.id,
      name: milestone.name || milestone.title,
      description: milestone.description || '',
      narrativeText: milestone.narrativeText || '',
      completionType: milestone.completionType || 'automatic'
    },
    playerAction: {
      characterId: playerAction.characterId || '',
      characterName: playerAction.characterName || '冒険者',
      actionDescription: playerAction.actionDescription || '行動を実行',
      actionResult: playerAction.actionResult || 'success',
      approach: playerAction.approach || '慎重に',
      skillsUsed: playerAction.skillsUsed || [],
      diceResults: playerAction.diceResults
    },
    worldState: {
      currentLocation: worldState.currentLocation || '未知の場所',
      timeOfDay: worldState.timeOfDay || 'afternoon',
      weatherCondition: worldState.weatherCondition,
      ambientMood: worldState.ambientMood || 'neutral',
      nearbyCharacters: worldState.nearbyCharacters || [],
      visibleEntities: worldState.visibleEntities || []
    },
    campaignContext: {
      sessionProgress: campaignContext.sessionProgress || 0.5,
      totalMilestones: campaignContext.totalMilestones || 10,
      completedMilestones: campaignContext.completedMilestones || 5,
      majorThemes: campaignContext.majorThemes || ['冒険', '成長'],
      characterRelationships: campaignContext.characterRelationships || [],
      recentEvents: campaignContext.recentEvents || []
    },
    playerHistory: {
      preferredActions: playerHistory.preferredActions || ['探索', '対話'],
      characterTraits: playerHistory.characterTraits || ['勇敢', '慎重'],
      pastDecisions: playerHistory.pastDecisions || [],
      characterGrowth: playerHistory.characterGrowth || []
    }
  };
}