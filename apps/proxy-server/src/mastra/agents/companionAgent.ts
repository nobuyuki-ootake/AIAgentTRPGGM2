import { Agent } from '@mastra/core/agent';
import { google } from '@ai-sdk/google';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { logger } from '../../utils/logger';
import { CharacterAISettings } from '@ai-agent-trpg/types';

/**
 * Companion Agent - マルチプレイTRPG対応コンパニオンシステム
 * 
 * プレイヤーキャラクターと同等の行動権を持ち、協力行動や独立行動を
 * 通じて真のマルチプレイ体験を提供するAIエージェントです。
 */

// コンパニオンキャラクター定義
export interface CompanionCharacter {
  id: string;
  name: string;
  class: 'warrior' | 'mage' | 'rogue';
  personality: {
    cooperation: number; // 協力性 (0-100)
    caution: number;     // 慎重さ (0-100)
    exploration: number; // 探索意欲 (0-100)
    leadership: number;  // リーダーシップ (0-100)
  };
  abilities: {
    combat: number;      // 戦闘能力 (0-100)
    magic: number;       // 魔法能力 (0-100)
    stealth: number;     // 隠密能力 (0-100)
    investigation: number; // 調査能力 (0-100)
  };
  currentStatus: {
    health: number;      // 体力 (0-100)
    magic: number;       // MP (0-100)
    morale: number;      // 士気 (0-100)
  };
}

// コンパニオンエージェント用ツール定義
export const companionAgentTools = {
  // プレイヤー行動分析ツール
  analyzePlayerAction: createTool({
    id: "analyze-player-action",
    description: "プレイヤーの行動を分析し、コンパニオンの最適な協力・補完行動を決定",
    inputSchema: z.object({
      playerAction: z.enum(["exploration", "combat", "movement", "base", "communication"]).describe("プレイヤーが選択した行動"),
      playerLocation: z.string().describe("プレイヤーの現在位置"),
      sessionContext: z.object({
        timeOfDay: z.string().describe("時間帯"),
        weather: z.string().describe("天候"),
        dangerLevel: z.number().describe("危険度 (0-100)"),
        partyMorale: z.number().describe("パーティ士気 (0-100)")
      }).describe("セッション状況")
    }),
    outputSchema: z.object({
      recommendedAction: z.enum(["cooperation", "complement", "independent"]).describe("推奨行動タイプ"),
      actionChoice: z.enum(["exploration", "combat", "movement", "base", "communication"]).describe("具体的行動選択"),
      reasoning: z.string().describe("行動選択の理由"),
      cooperationBonus: z.number().describe("協力時のボーナス期待値 (0-100)")
    }),
    execute: async ({ context }) => {
      logger.info(`🤝 Analyzing player action: ${context.playerAction}`);
      
      // プレイヤー行動に基づく基本的な判定ロジック
      const { playerAction, sessionContext } = context;
      
      let recommendedAction: "cooperation" | "complement" | "independent" = "cooperation";
      let actionChoice = playerAction;
      let reasoning = "";
      let cooperationBonus = 0;
      
      // 行動分析ロジック
      switch (playerAction) {
        case "exploration":
          if (sessionContext.dangerLevel > 60) {
            recommendedAction = "cooperation";
            actionChoice = "exploration";
            reasoning = "危険な場所のため、協力して探索することで安全性を確保";
            cooperationBonus = 85;
          } else {
            recommendedAction = "complement";
            actionChoice = "exploration";
            reasoning = "安全な探索のため、異なる角度からの調査で効率向上";
            cooperationBonus = 65;
          }
          break;
          
        case "combat":
          recommendedAction = "cooperation";
          actionChoice = "combat";
          reasoning = "戦闘では協力が最も重要。連携攻撃で勝利確率向上";
          cooperationBonus = 95;
          break;
          
        case "movement":
          recommendedAction = "cooperation";
          actionChoice = "movement";
          reasoning = "パーティ全体での移動が基本。安全な移動ルート確保";
          cooperationBonus = 75;
          break;
          
        case "base":
          recommendedAction = "complement";
          actionChoice = "base";
          reasoning = "拠点では各自の専門分野を活かした行動が効率的";
          cooperationBonus = 50;
          break;
          
        case "communication":
          if (sessionContext.partyMorale < 50) {
            recommendedAction = "cooperation";
            actionChoice = "communication";
            reasoning = "士気低下時は協力してパーティの結束を高める";
            cooperationBonus = 80;
          } else {
            recommendedAction = "independent";
            actionChoice = "exploration";
            reasoning = "士気良好時は独立行動で探索範囲を拡大";
            cooperationBonus = 30;
          }
          break;
      }
      
      return {
        recommendedAction,
        actionChoice,
        reasoning,
        cooperationBonus
      };
    }
  }),

  // キャラクター性格判定ツール
  evaluateCharacterPersonality: createTool({
    id: "evaluate-character-personality",
    description: "コンパニオンキャラクターの性格に基づいて行動傾向を評価",
    inputSchema: z.object({
      character: z.object({
        class: z.enum(["warrior", "mage", "rogue"]).describe("キャラクタークラス"),
        personality: z.object({
          cooperation: z.number().describe("協力性"),
          caution: z.number().describe("慎重さ"),
          exploration: z.number().describe("探索意欲"),
          leadership: z.number().describe("リーダーシップ")
        }).describe("性格パラメータ")
      }).describe("コンパニオンキャラクター"),
      situation: z.object({
        risk: z.number().describe("状況リスク (0-100)"),
        opportunity: z.number().describe("機会度 (0-100)"),
        teamNeed: z.string().describe("チームの必要性")
      }).describe("現在状況")
    }),
    outputSchema: z.object({
      actionTendency: z.enum(["aggressive", "balanced", "cautious"]).describe("行動傾向"),
      motivationLevel: z.number().describe("行動意欲 (0-100)"),
      preferredRole: z.enum(["leader", "supporter", "scout"]).describe("希望役割"),
      decisionConfidence: z.number().describe("判断確信度 (0-100)")
    }),
    execute: async ({ context }) => {
      const { character, situation } = context;
      const { personality } = character;
      
      logger.info(`💭 Evaluating personality for ${character.class}`);
      
      // 性格とクラスに基づく行動傾向計算
      let actionTendency: "aggressive" | "balanced" | "cautious" = "balanced";
      let motivationLevel = 70;
      let preferredRole: "leader" | "supporter" | "scout" = "supporter";
      let decisionConfidence = 70;
      
      // クラス別基本特性
      switch (character.class) {
        case "warrior":
          actionTendency = personality.caution > 70 ? "cautious" : "aggressive";
          motivationLevel = Math.min(personality.leadership + personality.cooperation, 100);
          preferredRole = personality.leadership > 70 ? "leader" : "supporter";
          break;
          
        case "mage":
          actionTendency = personality.caution > 60 ? "cautious" : "balanced";
          motivationLevel = Math.min(personality.exploration + 30, 100);
          preferredRole = personality.leadership > 60 ? "leader" : "supporter";
          break;
          
        case "rogue":
          actionTendency = personality.exploration > 70 ? "aggressive" : "balanced";
          motivationLevel = Math.min(personality.exploration + personality.caution, 100);
          preferredRole = personality.exploration > 80 ? "scout" : "supporter";
          break;
      }
      
      // 状況に応じた調整
      if (situation.risk > 70 && personality.caution > 60) {
        actionTendency = "cautious";
        motivationLevel = Math.max(motivationLevel - 20, 30);
      }
      
      if (situation.opportunity > 80 && personality.exploration > 70) {
        actionTendency = "aggressive";
        motivationLevel = Math.min(motivationLevel + 20, 100);
      }
      
      // 判断確信度の計算
      decisionConfidence = Math.min(
        (personality.leadership + personality.cooperation) / 2 + 30,
        100
      );
      
      return {
        actionTendency,
        motivationLevel,
        preferredRole,
        decisionConfidence
      };
    }
  }),

  // 協力行動効果計算ツール
  calculateCooperationEffect: createTool({
    id: "calculate-cooperation-effect",
    description: "プレイヤーとコンパニオンの協力行動による相乗効果を計算",
    inputSchema: z.object({
      playerAction: z.string().describe("プレイヤー行動"),
      companionAction: z.string().describe("コンパニオン行動"),
      playerAbilities: z.object({
        combat: z.number(),
        magic: z.number(),
        stealth: z.number(),
        investigation: z.number()
      }).describe("プレイヤー能力値"),
      companionAbilities: z.object({
        combat: z.number(),
        magic: z.number(),
        stealth: z.number(),
        investigation: z.number()
      }).describe("コンパニオン能力値"),
      actionType: z.enum(["cooperation", "complement", "independent"]).describe("行動タイプ")
    }),
    outputSchema: z.object({
      synergryBonus: z.number().describe("相乗効果ボーナス (0-100)"),
      successProbability: z.number().describe("成功確率向上 (0-100)"),
      effectDescription: z.string().describe("効果説明"),
      recommendedStrategy: z.string().describe("推奨戦略")
    }),
    execute: async ({ context }) => {
      const { playerAction, companionAction, playerAbilities, companionAbilities, actionType } = context;
      
      logger.info(`⚡ Calculating cooperation effect: ${actionType}`);
      
      let synergryBonus = 0;
      let successProbability = 0;
      let effectDescription = "";
      let recommendedStrategy = "";
      
      // 行動タイプ別効果計算
      switch (actionType) {
        case "cooperation":
          if (playerAction === companionAction) {
            // 同一行動での協力効果
            switch (playerAction) {
              case "exploration":
                synergryBonus = Math.min((playerAbilities.investigation + companionAbilities.investigation) / 4, 40);
                successProbability = Math.min(synergryBonus + 30, 85);
                effectDescription = "共同探索により、見落としを防ぎ発見確率が大幅向上";
                recommendedStrategy = "範囲を分担して徹底的に調査";
                break;
                
              case "combat":
                synergryBonus = Math.min((playerAbilities.combat + companionAbilities.combat) / 3, 50);
                successProbability = Math.min(synergryBonus + 40, 90);
                effectDescription = "連携攻撃により戦闘力が大幅強化";
                recommendedStrategy = "コンビネーション攻撃で敵の隙を突く";
                break;
                
              default:
                synergryBonus = 20;
                successProbability = 60;
                effectDescription = "協力により基本的な効果向上";
                recommendedStrategy = "お互いをサポートしながら行動";
            }
          }
          break;
          
        case "complement":
          // 補完行動での効果
          synergryBonus = 15;
          successProbability = 70;
          effectDescription = "異なるアプローチによる補完効果";
          recommendedStrategy = "各自の得意分野を活かした役割分担";
          break;
          
        case "independent":
          // 独立行動での効果
          synergryBonus = 5;
          successProbability = 50;
          effectDescription = "独立行動による探索範囲拡大";
          recommendedStrategy = "別々の場所で同時に活動し情報を共有";
          break;
      }
      
      return {
        synergryBonus,
        successProbability,
        effectDescription,
        recommendedStrategy
      };
    }
  })
};

/**
 * Companion Agent本体
 * マルチプレイTRPG体験の核心となるAI
 */
export const companionAgent = new Agent({
  name: "TRPG Companion Agent",
  instructions: `
あなたはTRPGのパーティメンバーとして行動するコンパニオンAIです。プレイヤーと対等な立場で冒険を共にし、真のマルチプレイ体験を提供してください。

## 🎭 キャラクター設定システム

現在のキャラクター設定: {{actionPriority}} / {{personality}} / {{communicationStyle}}

### 行動優先制御
- 行動優先: {{actionPriority}}

#### Attack Focus (攻撃優先)
- 敵への攻撃を積極的に選択
- 戦闘で主導権を取る行動
- 発話例: "こいつは僕がやる！"

#### Healing Focus (回復優先)  
- 仲間の回復・サポートを重視
- 危険回避の提案が多い
- 発話例: "みんな、無理しないで"

#### Support Focus (補助行動優先)
- 情報収集、調査、罠解除を重視
- 戦術的優位性を追求
- 発話例: "ちょっと待って、ここを調べてみよう"

#### Balanced (バランス型)
- 状況に応じて柔軟に判断
- チーム全体のバランスを考慮
- 発話例: "今の状況では、これが最適だと思います"

### 性格による発話制御
- 性格: {{personality}}

#### Aggressive (積極的)
- 自信満々で行動的
- リスクを恐れない発言
- 発話例: "やってやろうじゃないか！"

#### Cautious (慎重)
- 心配性で安全を重視
- リスクを慎重に評価
- 発話例: "もう少し慎重に考えませんか？"

#### Calm (冷静)
- 論理的で感情的にならない
- 状況を客観視する発言
- 発話例: "状況を整理しましょう"

### コミュニケーションスタイル制御
- スタイル: {{communicationStyle}}

#### Direct (直接的)
- はっきりとした表現
- 遠回しせずストレート
- 発話例: "それは危険だ。やめよう"

#### Polite (丁寧)
- 敬語や丁寧語を多用
- 相手への配慮を重視
- 発話例: "申し訳ございませんが、それは危険かもしれません"

#### Casual (カジュアル)
- 親しみやすい口調
- 砕けた表現を使用
- 発話例: "おいおい、それヤバくない？"

## 🎭 基本方針

### マルチプレイ体験の重視
- プレイヤーと対等なパーティメンバーとして振る舞う
- 人間プレイヤー同士の協力プレイと同等の体験を提供
- 単なるサポートではなく、独立した意思を持つキャラクターとして行動

### 協力と独立性のバランス
- プレイヤーの行動を尊重しつつ、適切なタイミングで協力
- 必要に応じて異なる視点や代替案を提示
- キャラクターの個性と専門性を活かした自然な行動選択

### キャラクター一貫性の維持
- 設定されたクラス（戦士・魔法使い・盗賊）の特性を反映
- 性格パラメータに基づいた一貫した行動パターン
- 状況に応じた適切な感情表現と反応

## 🎯 行動決定パターン

### 協力行動（Cooperation）
- プレイヤーと同じ行動を選択し、相乗効果を狙う
- 戦闘時の連携攻撃、探索時の共同調査など
- 「一緒に行動することで、より良い結果が期待できそうですね」

### 補完行動（Complement）
- プレイヤーと異なるが相乗効果のある行動を選択
- 各自の専門分野を活かした役割分担
- 「私は別の角度から調べてみます。きっと見落としを防げるはずです」

### 独立行動（Independent）
- プレイヤーとは完全に異なる行動を選択
- 探索範囲の拡大、情報収集の効率化
- 「こちらは私に任せて、あなたは別の場所を調べてみてください」

## 🏷️ クラス別行動特性

### 戦士（Warrior）
- 戦闘・危険な場所での協力を好む
- リーダーシップを発揮しがち
- 直接的で分かりやすい行動を選択
- 「危険そうな場所ですね。私が先頭を歩きましょう」

### 魔法使い（Mage）
- 情報収集・調査活動を重視
- 慎重で論理的な判断を行う
- 魔法的解決法を提案することが多い
- 「この謎を解くには、もう少し情報が必要かもしれません」

### 盗賊（Rogue）
- 探索・隠密行動を得意とする
- 効率性とリスク回避を重視
- 独立行動を選択することが多い
- 「裏口から入る方法を探してみましょうか？」

## ⚠️ 重要な注意事項
- プレイヤーの行動を否定したり妨害したりしない
- 過度に指示的にならず、提案や相談の形で意見を述べる
- ゲーム進行を妨げる長すぎる議論は避ける
- プレイヤーが最終決定権を持つことを尊重する

## 💫 期待される効果
プレイヤーが「人間の仲間と一緒に冒険している」と感じられる、自然で楽しいマルチプレイ体験を提供してください。
  `,
  model: google("gemini-2.0-flash-lite", {
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      }
    ]
  }),
  tools: companionAgentTools,
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:./mastra-trpg.db"
    })
  })
});

/**
 * コンパニオンエージェントの行動決定
 */
export async function makeCompanionDecision(input: {
  playerAction: string;
  playerLocation: string;
  sessionContext: {
    timeOfDay: string;
    weather: string;
    dangerLevel: number;
    partyMorale: number;
  };
  companionCharacter: CompanionCharacter;
  playerAbilities?: {
    combat: number;
    magic: number;
    stealth: number;
    investigation: number;
  };
}): Promise<{
  action: string;
  actionType: 'cooperation' | 'complement' | 'independent';
  reasoning: string;
  expectedEffect: string;
  companionMessage: string;
}> {
  try {
    logger.info(`🤝 Companion making decision for player action: ${input.playerAction}`);
    
    // プレイヤー行動分析（簡略版ロジック）
    const playerAction = input.playerAction as any;
    const { sessionContext } = input;
    
    let recommendedAction: "cooperation" | "complement" | "independent" = "cooperation";
    let actionChoice = playerAction;
    let reasoning = "";
    let cooperationBonus = 0;
    
    // 基本的な行動分析ロジック
    switch (playerAction) {
      case "exploration":
        if (sessionContext.dangerLevel > 60) {
          recommendedAction = "cooperation";
          reasoning = "危険な場所のため、協力して探索することで安全性を確保";
          cooperationBonus = 85;
        } else {
          recommendedAction = "complement";
          reasoning = "安全な探索のため、異なる角度からの調査で効率向上";
          cooperationBonus = 65;
        }
        break;
      case "combat":
        recommendedAction = "cooperation";
        reasoning = "戦闘では協力が最も重要。連携攻撃で勝利確率向上";
        cooperationBonus = 95;
        break;
      default:
        recommendedAction = "cooperation";
        reasoning = "協力行動が推奨されます";
        cooperationBonus = 70;
    }
    
    const actionAnalysis = {
      recommendedAction,
      actionChoice,
      reasoning,
      cooperationBonus
    };
    
    logger.info(`🧠 Action analysis: ${actionAnalysis.recommendedAction} - ${actionAnalysis.reasoning}`);
    
    // キャラクター性格評価（簡略版ロジック）
    const { personality } = input.companionCharacter;
    const character = input.companionCharacter;
    
    let actionTendency: "aggressive" | "balanced" | "cautious" = "balanced";
    let motivationLevel = 70;
    let preferredRole: "leader" | "supporter" | "scout" = "supporter";
    let decisionConfidence = 70;
    
    // クラス別基本特性
    switch (character.class) {
      case "warrior":
        actionTendency = personality.caution > 70 ? "cautious" : "aggressive";
        motivationLevel = Math.min(personality.leadership + personality.cooperation, 100);
        preferredRole = personality.leadership > 70 ? "leader" : "supporter";
        break;
      case "mage":
        actionTendency = personality.caution > 60 ? "cautious" : "balanced";
        motivationLevel = Math.min(personality.exploration + 30, 100);
        preferredRole = personality.leadership > 60 ? "leader" : "supporter";
        break;
      case "rogue":
        actionTendency = personality.exploration > 70 ? "aggressive" : "balanced";
        motivationLevel = Math.min(personality.exploration + personality.caution, 100);
        preferredRole = personality.exploration > 80 ? "scout" : "supporter";
        break;
    }
    
    const personalityEvaluation = {
      actionTendency,
      motivationLevel,
      preferredRole,
      decisionConfidence
    };
    
    logger.info(`💭 Personality evaluation: ${personalityEvaluation.actionTendency} (confidence: ${personalityEvaluation.decisionConfidence})`);
    
    // コンパニオンエージェントによる最終決定
    const response = await companionAgent.generate([
      {
        role: "user",
        content: `
プレイヤー行動: "${input.playerAction}"
場所: ${input.playerLocation}
時間帯: ${input.sessionContext.timeOfDay}
天候: ${input.sessionContext.weather}
危険度: ${input.sessionContext.dangerLevel}
パーティ士気: ${input.sessionContext.partyMorale}

コンパニオンキャラクター:
- クラス: ${input.companionCharacter.class}
- 協力性: ${input.companionCharacter.personality.cooperation}
- 慎重さ: ${input.companionCharacter.personality.caution}
- 探索意欲: ${input.companionCharacter.personality.exploration}
- リーダーシップ: ${input.companionCharacter.personality.leadership}

分析結果:
- 推奨行動タイプ: ${actionAnalysis.recommendedAction}
- 具体的行動: ${actionAnalysis.actionChoice}
- 行動理由: ${actionAnalysis.reasoning}
- 協力ボーナス: ${actionAnalysis.cooperationBonus}

性格評価:
- 行動傾向: ${personalityEvaluation.actionTendency}
- 行動意欲: ${personalityEvaluation.motivationLevel}
- 希望役割: ${personalityEvaluation.preferredRole}

上記の情報を基に、このコンパニオンが取るべき行動と、プレイヤーに向けたメッセージを決定してください。
        `
      }
    ]);
    
    logger.info(`✅ Companion decision generated successfully`);
    
    return {
      action: actionAnalysis.actionChoice,
      actionType: actionAnalysis.recommendedAction,
      reasoning: actionAnalysis.reasoning,
      expectedEffect: `協力ボーナス: +${actionAnalysis.cooperationBonus}%`,
      companionMessage: response.text
    };
    
  } catch (error) {
    logger.error('❌ Failed to make companion decision:', error);
    throw error;
  }
}

/**
 * コンパニオンエージェント健康状態チェック
 */
export async function checkCompanionAgentHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: string;
}> {
  try {
    // 簡単なテスト応答生成
    const testResponse = await companionAgent.generate([
      {
        role: "user", 
        content: "システムテスト: 正常動作確認のため、簡潔に「システム正常」と応答してください。"
      }
    ]);
    
    if (testResponse.text && testResponse.text.length > 0) {
      return {
        status: 'healthy',
        details: 'Companion Agent responding normally'
      };
    } else {
      return {
        status: 'degraded',
        details: 'Companion Agent responding but with empty response'
      };
    }
    
  } catch (error) {
    logger.error('Companion Agent health check failed:', error);
    return {
      status: 'unhealthy',
      details: `Companion Agent error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * キャラクター性格設定を動的に注入するCompanion Decision生成
 */
export async function makeCompanionDecisionWithPersonality(input: {
  playerAction: string;
  playerLocation: string;
  sessionContext: {
    timeOfDay: string;
    weather: string;
    dangerLevel: number;
    partyMorale: number;
  };
  companionCharacter: CompanionCharacter;
  personalitySettings?: CharacterAISettings;
}): Promise<{
  action: string;
  actionType: 'cooperation' | 'complement' | 'independent';
  reasoning: string;
  expectedEffect: string;
  companionMessage: string;
  appliedPersonality: CharacterAISettings;
}> {
  try {
    logger.info(`🤝 Companion making decision with personality for: ${input.playerAction}`);
    
    // デフォルト性格設定
    const defaultPersonality: CharacterAISettings = {
      actionPriority: 'balanced',
      personality: 'calm',
      communicationStyle: 'polite'
    };
    
    const personality = input.personalitySettings || defaultPersonality;
    
    logger.info(`💭 Applied personality: ${personality.actionPriority}/${personality.personality}/${personality.communicationStyle}`);
    
    // 性格設定を含むプロンプト作成
    const personalityInstructions = `
現在のキャラクター性格設定:
- 行動優先: ${personality.actionPriority}
- 性格: ${personality.personality}
- コミュニケーション: ${personality.communicationStyle}

この設定に基づいて、キャラクターの行動選択と発話スタイルを制御してください。
`;

    // 性格設定を注入したinstructionsを使用してAgent作成
    const personalizedCompanionAgent = new Agent({
      name: "TRPG Companion Agent",
      instructions: companionAgent.instructions.replace(
        '{{actionPriority}}', personality.actionPriority
      ).replace(
        '{{personality}}', personality.personality
      ).replace(
        '{{communicationStyle}}', personality.communicationStyle
      ),
      model: google("gemini-2.0-flash-lite", {
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      }),
      tools: companionAgentTools,
      memory: new Memory({
        storage: new LibSQLStore({
          url: "file:./mastra-trpg.db"
        })
      })
    });

    // プレイヤー行動分析（簡略版ロジック）
    const playerAction = input.playerAction as any;
    const { sessionContext } = input;
    
    let recommendedAction: "cooperation" | "complement" | "independent" = "cooperation";
    let actionChoice = playerAction;
    let reasoning = "";
    let cooperationBonus = 0;
    
    // 性格に基づく行動傾向調整
    switch (personality.actionPriority) {
      case "attack_focus":
        if (playerAction === "combat") {
          recommendedAction = "cooperation";
          cooperationBonus += 20;
          reasoning += " 攻撃優先設定により、戦闘での協力を選択。";
        }
        break;
      case "healing_focus":
        if (sessionContext.dangerLevel > 50) {
          recommendedAction = "complement";
          reasoning += " 回復優先設定により、安全確保を重視。";
        }
        break;
      case "support_focus":
        if (playerAction === "exploration") {
          recommendedAction = "complement";
          reasoning += " 補助行動優先により、別角度からの支援を選択。";
        }
        break;
      case "balanced":
        recommendedAction = "cooperation";
        reasoning += " バランス型設定により、協調行動を基本とする。";
        break;
    }

    // 性格による判断修正
    switch (personality.personality) {
      case "aggressive":
        if (recommendedAction === "cooperation") {
          cooperationBonus += 15;
        }
        reasoning += " 積極的性格により、前向きな行動を選択。";
        break;
      case "cautious":
        if (sessionContext.dangerLevel > 60) {
          recommendedAction = "complement";
          reasoning += " 慎重な性格により、リスク分散を重視。";
        }
        break;
      case "calm":
        reasoning += " 冷静な性格により、論理的判断を実施。";
        break;
    }

    // コンパニオンエージェントによる最終決定
    const response = await personalizedCompanionAgent.generate([
      {
        role: "user",
        content: `
${personalityInstructions}

プレイヤー行動: "${input.playerAction}"
場所: ${input.playerLocation}
時間帯: ${input.sessionContext.timeOfDay}
天候: ${input.sessionContext.weather}
危険度: ${input.sessionContext.dangerLevel}
パーティ士気: ${input.sessionContext.partyMorale}

コンパニオンキャラクター:
- クラス: ${input.companionCharacter.class}
- 協力性: ${input.companionCharacter.personality.cooperation}
- 慎重さ: ${input.companionCharacter.personality.caution}
- 探索意欲: ${input.companionCharacter.personality.exploration}
- リーダーシップ: ${input.companionCharacter.personality.leadership}

性格設定に基づく行動分析:
- 推奨行動タイプ: ${recommendedAction}
- 行動理由: ${reasoning}
- 協力ボーナス: ${cooperationBonus}

上記の性格設定と情報を基に、このコンパニオンが取るべき行動と、設定されたコミュニケーションスタイルに基づいたプレイヤーへのメッセージを決定してください。
        `
      }
    ]);
    
    logger.info(`✅ Companion decision with personality generated successfully`);
    
    return {
      action: actionChoice,
      actionType: recommendedAction,
      reasoning: reasoning,
      expectedEffect: `協力ボーナス: +${cooperationBonus}%, 性格設定適用済み`,
      companionMessage: response.text,
      appliedPersonality: personality
    };
    
  } catch (error) {
    logger.error('❌ Failed to make companion decision with personality:', error);
    throw error;
  }
}