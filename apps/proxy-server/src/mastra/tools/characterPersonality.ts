import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { ActionPriority, PersonalityType, CommunicationStyle } from '@ai-agent-trpg/types';

/**
 * キャラクター性格制御ツール
 * AI Agent可視化・制御システム用
 * 
 * キャラクターの性格設定に基づいて行動と発話を決定し、
 * TRPGらしい自然なキャラクター表現を実現します。
 */
export const characterPersonalityTool = createTool({
  id: "character-personality",
  description: "キャラクターの性格設定に基づいて行動と発話を決定",
  inputSchema: z.object({
    actionPriority: z.enum(['attack_focus', 'healing_focus', 'support_focus', 'balanced']).describe('行動優先度'),
    personality: z.enum(['aggressive', 'cautious', 'calm']).describe('性格タイプ'),
    communicationStyle: z.enum(['direct', 'polite', 'casual']).describe('コミュニケーションスタイル'),
    situation: z.string().describe('現在の状況'),
    characterClass: z.string().describe('キャラクタークラス'),
    currentHealth: z.number().min(0).max(100).describe('現在の体力 (0-100)'),
    partyMembers: z.array(z.object({
      name: z.string(),
      class: z.string(),
      health: z.number(),
      status: z.string()
    })).describe('パーティメンバー情報'),
    availableActions: z.array(z.string()).describe('選択可能な行動リスト')
  }),
  outputSchema: z.object({
    dialogue: z.string().describe('キャラクターの発話'),
    action: z.string().describe('選択した行動'),
    reasoning: z.string().describe('行動選択の理由'),
    emotionalState: z.string().describe('感情状態'),
    priorityScore: z.number().describe('行動優先度スコア (0-100)'),
    socialInteraction: z.string().describe('他メンバーへの働きかけ')
  }),
  execute: async ({ context }) => {
    const { 
      actionPriority, 
      personality, 
      communicationStyle, 
      situation, 
      characterClass,
      currentHealth,
      partyMembers,
      availableActions 
    } = context;
    
    logger.info(`🎭 Character personality: ${actionPriority}/${personality}/${communicationStyle}`);
    
    // 行動優先度に基づく基本行動選択
    const baseAction = determineBaseAction(actionPriority, availableActions, currentHealth, partyMembers);
    
    // 性格による行動修正
    const modifiedAction = applyPersonalityModification(baseAction, personality, situation, currentHealth);
    
    // コミュニケーションスタイルに基づく発話生成
    const dialogue = generateDialogue(modifiedAction, communicationStyle, personality, characterClass, situation);
    
    // 感情状態の判定
    const emotionalState = determineEmotionalState(personality, currentHealth, situation);
    
    // 行動優先度スコア算出
    const priorityScore = calculatePriorityScore(actionPriority, modifiedAction, currentHealth);
    
    // 社会的相互作用の決定
    const socialInteraction = determineSocialInteraction(communicationStyle, personality, partyMembers);
    
    // 行動理由の生成
    const reasoning = generateReasoning(actionPriority, personality, modifiedAction, situation);
    
    logger.info(`✅ Character decision: ${modifiedAction} with dialogue: "${dialogue}"`);
    
    return {
      dialogue,
      action: modifiedAction,
      reasoning,
      emotionalState,
      priorityScore,
      socialInteraction
    };
  }
});

/**
 * 行動優先度に基づく基本行動決定
 */
function determineBaseAction(
  actionPriority: ActionPriority,
  availableActions: string[],
  currentHealth: number,
  partyMembers: any[]
): string {
  const lowHealthMembers = partyMembers.filter(member => member.health < 30);
  const isDangerous = currentHealth < 50 || lowHealthMembers.length > 0;
  
  switch (actionPriority) {
    case 'attack_focus':
      // 攻撃優先: 敵への攻撃を最優先
      return availableActions.find(action => 
        action.includes('攻撃') || action.includes('attack') || action.includes('スキル')
      ) || availableActions[0];
      
    case 'healing_focus':
      // 回復優先: 回復行動を最優先
      if (isDangerous) {
        return availableActions.find(action => 
          action.includes('回復') || action.includes('heal') || action.includes('支援')
        ) || availableActions[0];
      }
      return availableActions.find(action => 
        action.includes('回復') || action.includes('heal')
      ) || availableActions[0];
      
    case 'support_focus':
      // 補助行動優先: 調査、罠解除、情報収集を重視
      return availableActions.find(action => 
        action.includes('調査') || action.includes('探索') || action.includes('調べる') || action.includes('解除')
      ) || availableActions[0];
      
    case 'balanced':
      // バランス型: 状況に応じて最適な行動を選択
      if (currentHealth < 30) {
        return availableActions.find(action => action.includes('回復') || action.includes('heal')) || availableActions[0];
      }
      if (lowHealthMembers.length > 0) {
        return availableActions.find(action => action.includes('支援') || action.includes('回復')) || availableActions[0];
      }
      return availableActions[Math.floor(availableActions.length / 2)]; // 中間的な選択
      
    default:
      return availableActions[0];
  }
}

/**
 * 性格による行動修正
 */
function applyPersonalityModification(
  baseAction: string,
  personality: PersonalityType,
  situation: string,
  currentHealth: number
): string {
  const isDangerous = situation.includes('危険') || situation.includes('敵') || currentHealth < 40;
  
  switch (personality) {
    case 'aggressive':
      // 積極的: より行動的で冒険的な選択
      if (baseAction.includes('様子を見る') || baseAction.includes('待機')) {
        return baseAction.replace('様子を見る', '積極的に行動').replace('待機', '前進');
      }
      return baseAction;
      
    case 'cautious':
      // 慎重: よりリスクの低い選択
      if (isDangerous && (baseAction.includes('攻撃') || baseAction.includes('前進'))) {
        return '慎重に' + baseAction;
      }
      return baseAction;
      
    case 'calm':
      // 冷静: 論理的で効率的な選択
      return baseAction; // 基本行動を維持
      
    default:
      return baseAction;
  }
}

/**
 * コミュニケーションスタイルに基づく発話生成
 */
function generateDialogue(
  action: string,
  communicationStyle: CommunicationStyle,
  personality: PersonalityType,
  _characterClass: string,
  _situation: string
): string {
  const actionTemplates = {
    direct: {
      aggressive: [
        `${action}する！`,
        `よし、${action}だ！`,
        `${action}で決める！`
      ],
      cautious: [
        `${action}した方がいいかもしれない`,
        `${action}が安全だと思う`,
        `${action}を提案する`
      ],
      calm: [
        `${action}を実行する`,
        `${action}が最適だ`,
        `${action}を選択する`
      ]
    },
    polite: {
      aggressive: [
        `${action}させていただきます！`,
        `恐れ入りますが、${action}いたします`,
        `失礼ながら、${action}を実行いたします`
      ],
      cautious: [
        `もしよろしければ、${action}してみませんか？`,
        `${action}するのはいかがでしょうか？`,
        `恐縮ですが、${action}を提案いたします`
      ],
      calm: [
        `${action}いたします`,
        `${action}を実行いたします`,
        `${action}が適切かと存じます`
      ]
    },
    casual: {
      aggressive: [
        `${action}するぞ！`,
        `よーし、${action}だ！`,
        `${action}で行こう！`
      ],
      cautious: [
        `${action}した方がいいんじゃない？`,
        `${action}とかどう？`,
        `${action}してみる？`
      ],
      calm: [
        `${action}しよう`,
        `${action}でいこう`,
        `${action}が良さそうだ`
      ]
    }
  };
  
  const templates = actionTemplates[communicationStyle][personality];
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * 感情状態の判定
 */
function determineEmotionalState(
  personality: PersonalityType,
  currentHealth: number,
  situation: string
): string {
  const isDangerous = situation.includes('危険') || situation.includes('敵') || currentHealth < 40;
  const isSuccessful = situation.includes('成功') || situation.includes('勝利');
  
  if (isSuccessful) {
    switch (personality) {
      case 'aggressive': return '興奮';
      case 'cautious': return '安堵';
      case 'calm': return '満足';
    }
  }
  
  if (isDangerous) {
    switch (personality) {
      case 'aggressive': return '闘志';
      case 'cautious': return '不安';
      case 'calm': return '集中';
    }
  }
  
  if (currentHealth < 30) {
    switch (personality) {
      case 'aggressive': return '苛立ち';
      case 'cautious': return '心配';
      case 'calm': return '警戒';
    }
  }
  
  return '平常';
}

/**
 * 行動優先度スコア算出
 */
function calculatePriorityScore(
  actionPriority: ActionPriority,
  action: string,
  currentHealth: number
): number {
  let baseScore = 50;
  
  // 行動優先度による基本スコア
  switch (actionPriority) {
    case 'attack_focus':
      if (action.includes('攻撃') || action.includes('スキル')) baseScore += 30;
      break;
    case 'healing_focus':
      if (action.includes('回復') || action.includes('支援')) baseScore += 30;
      break;
    case 'support_focus':
      if (action.includes('調査') || action.includes('探索')) baseScore += 30;
      break;
    case 'balanced':
      baseScore += 15; // バランス型は中程度のスコア
      break;
  }
  
  // 健康状態による修正
  if (currentHealth < 30 && action.includes('回復')) {
    baseScore += 25; // 低体力時の回復行動は高優先度
  }
  
  return Math.min(Math.max(baseScore, 0), 100);
}

/**
 * 社会的相互作用の決定
 */
function determineSocialInteraction(
  communicationStyle: CommunicationStyle,
  personality: PersonalityType,
  _partyMembers: any[]
): string {
  const interactions = {
    direct: {
      aggressive: "仲間を鼓舞する",
      cautious: "状況を確認し合う",
      calm: "戦術を提案する"
    },
    polite: {
      aggressive: "礼儀正しく指示を出す",
      cautious: "丁寧に意見を求める",
      calm: "敬意を持って提案する"
    },
    casual: {
      aggressive: "気さくに仲間を励ます",
      cautious: "軽い調子で相談する",
      calm: "リラックスした雰囲気で話し合う"
    }
  };
  
  return interactions[communicationStyle][personality];
}

/**
 * 行動理由の生成
 */
function generateReasoning(
  actionPriority: ActionPriority,
  personality: PersonalityType,
  action: string,
  situation: string
): string {
  const priorityReasons = {
    attack_focus: "攻撃優先設定により、積極的な行動を選択。",
    healing_focus: "回復優先設定により、安全と支援を重視。",
    support_focus: "補助行動優先により、情報収集と戦術的優位を追求。",
    balanced: "バランス型設定により、状況に応じた最適解を選択。"
  };
  
  const personalityReasons = {
    aggressive: "積極的性格により、前向きで行動的な判断。",
    cautious: "慎重な性格により、リスクを考慮した安全な選択。",
    calm: "冷静な性格により、論理的で効率的な判断。"
  };
  
  return `${priorityReasons[actionPriority]} ${personalityReasons[personality]} 現在の状況「${situation}」を考慮した結果、「${action}」が最適と判断。`;
}