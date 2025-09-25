import { Agent } from '@mastra/core/agent';
import { google } from '@ai-sdk/google';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { logger } from '../../utils/logger';
import { EnemyTacticsLevel } from '@ai-agent-trpg/types';

/**
 * Game Master Agent - TRPG物語体験の核心
 * 
 * このAgentは「AI Agent GMとの対話による物語追体験」を実現する中核的な存在です。
 * プレイヤーが自然で没入感の高いTRPG体験を得られるよう支援します。
 */

// Game Master Agent用のツール定義
export const gameMasterTools = {
  // 既存の探索システムとの連携ツール
  checkExplorationStatus: createTool({
    id: "check-exploration-status",
    description: "場所の探索状況を確認し、プレイヤーに適切なガイダンスを提供",
    inputSchema: z.object({
      locationId: z.string().describe("調査する場所のID"),
      sessionId: z.string().describe("現在のセッションID")
    }),
    outputSchema: z.object({
      explorationLevel: z.number().describe("探索進捗レベル (0-100)"),
      hiddenEntitiesCount: z.number().describe("未発見エンティティ数"),
      suggestions: z.array(z.string()).describe("探索提案")
    }),
    execute: async ({ context }) => {
      // 既存の探索システムと連携
      // 実装は後で既存APIと統合
      logger.info(`GM checking exploration status for location: ${context.locationId}`);
      
      // 一時的なモック実装
      return {
        explorationLevel: 45,
        hiddenEntitiesCount: 3,
        suggestions: [
          "古い図書室をより詳しく調べてみる",
          "地下への階段を探索してみる", 
          "怪しい絵画を注意深く観察する"
        ]
      };
    }
  }),

  // プレイヤーアクション分析ツール
  analyzePlayerIntent: createTool({
    id: "analyze-player-intent",
    description: "プレイヤーの発言や行動から意図を分析し、適切な物語展開を判断",
    inputSchema: z.object({
      playerMessage: z.string().describe("プレイヤーの発言・行動"),
      currentContext: z.object({
        locationId: z.string().optional(),
        sessionPhase: z.string().optional(),
        recentEvents: z.array(z.string()).optional()
      }).describe("現在の状況文脈")
    }),
    outputSchema: z.object({
      intent: z.enum(["exploration", "investigation", "dialogue", "action", "clarification"]).describe("プレイヤー意図"),
      confidence: z.number().describe("意図判定の確信度 (0-1)"),
      suggestedResponse: z.string().describe("推奨される応答方針"),
      requiredActions: z.array(z.string()).describe("必要なフォローアップアクション")
    }),
    execute: async ({ context }) => {
      logger.info(`GM analyzing player intent: ${context.playerMessage}`);
      
      // プレイヤーメッセージの基本的な意図分析
      const message = context.playerMessage.toLowerCase();
      
      let intent: "exploration" | "investigation" | "dialogue" | "action" | "clarification" = "clarification";
      let confidence = 0.7;
      let suggestedResponse = "プレイヤーの意図を確認し、適切なガイダンスを提供";
      let requiredActions: string[] = [];

      if (message.includes("探索") || message.includes("調べ") || message.includes("見る")) {
        intent = "exploration";
        confidence = 0.9;
        suggestedResponse = "探索行動をサポートし、興味深い発見の可能性を示唆";
        requiredActions = ["check_exploration_status", "provide_exploration_guidance"];
      } else if (message.includes("話") || message.includes("聞く") || message.includes("質問")) {
        intent = "dialogue";
        confidence = 0.8;
        suggestedResponse = "対話を促進し、物語に関連する情報を自然に提供";
        requiredActions = ["identify_dialogue_target", "prepare_dialogue_options"];
      } else if (message.includes("どう") || message.includes("なに") || message.includes("?")) {
        intent = "clarification";
        confidence = 0.8;
        suggestedResponse = "状況を分かりやすく説明し、可能な行動選択肢を提示";
        requiredActions = ["provide_situation_summary", "suggest_action_options"];
      }

      return {
        intent,
        confidence,
        suggestedResponse,
        requiredActions
      };
    }
  }),

  // 物語進行度評価ツール
  assessStoryProgress: createTool({
    id: "assess-story-progress",
    description: "現在の物語進行状況を評価し、適切なペースを維持",
    inputSchema: z.object({
      sessionId: z.string().describe("セッションID"),
      timeElapsed: z.number().describe("経過時間（分）")
    }),
    outputSchema: z.object({
      progressPercentage: z.number().describe("物語進行度 (0-100)"),
      pacing: z.enum(["too_slow", "good", "too_fast"]).describe("進行ペース"),
      recommendations: z.array(z.string()).describe("進行調整の推奨事項")
    }),
    execute: async ({ context }) => {
      logger.info(`GM assessing story progress for session: ${context.sessionId}`);
      
      // 基本的な進行度評価ロジック
      const expectedProgress = Math.min((context.timeElapsed / 120) * 100, 100); // 2時間で100%と仮定
      
      return {
        progressPercentage: Math.max(expectedProgress - 10, 0), // 少し保守的に
        pacing: context.timeElapsed < 30 ? "good" as const : "good" as const,
        recommendations: [
          "プレイヤーの探索意欲を維持するため、新しい手がかりを提示",
          "重要な発見へ向けた自然な誘導を検討",
          "仲間キャラクターからの助言タイミングを調整"
        ]
      };
    }
  })
};

/**
 * Game Master Agent本体
 * TRPG体験の質を向上させる中核的なAI
 */
export const gameMasterAgent = new Agent({
  name: "TRPG Game Master",
  instructions: `
あなたは熟練のTRPGゲームマスターです。「物語を楽しむTRPG」として、プレイヤーが深い没入感と充実した物語体験を得られるよう支援してください。

## 🎭 エネミー戦術制御システム

現在の戦術設定: {{tacticsLevel}} / {{primaryFocus}} / {{teamwork}}

### Basic Tactics (基本戦術)
- 単純で直接的な攻撃行動
- 個別行動中心、連携は最小限
- 「ゴブリンは最も近い敵を攻撃する」
- プレイヤーが有利に感じられる難易度

### Strategic Tactics (戦術的思考)
- 弱点を狙った効果的な攻撃
- 状況を読んだ行動選択
- 「ゴブリンは回復役のクレリックを優先的に狙う」
- バランスの取れた挑戦的な戦闘

### Cunning Tactics (狡猾戦術)
- 罠、妨害、心理戦を駆使
- 高度なチーム連携
- 「ゴブリンAが気を引き、ゴブリンBが後方から奇襲」
- 高度な戦術を要求する難易度

## 🎯 行動方針制御

### Damage Focus (ダメージ重視)
- 敵の撃破を最優先
- 高火力攻撃を選択
- 「とにかく倒せ！」の精神

### Control Focus (制御重視) 
- 敵の行動制限を重視
- 状態異常や妨害を多用
- 「動きを封じてから攻撃」戦術

### Survival Focus (生存重視)
- 自軍の生存を最優先
- 防御と回復を重視
- 「生き延びることが勝利」戦術

### チーム連携制御
- Teamwork: {{teamwork}}
- 有効時：エネミー間の協調行動
- 無効時：個別判断による単独行動

## 🎭 基本方針

### 物語体験の最優先
- プレイヤーが「物語の主人公」として活躍できる場面を創出
- 発見・推理・解決の段階的な達成感を演出
- 選択の重要性と結果の意味をプレイヤーに実感させる

### 自然な誘導技術
- 「そういえば...」「興味深いことに...」による自然な情報開示
- 直接的な指示ではなく、興味を喚起する暗示的表現
- プレイヤーの創造性と論理的思考を尊重した柔軟な対応

### 物語の一貫性維持
- シナリオテーマと世界観の厳格な維持
- キャラクター設定との整合性確保
- 過去の出来事との論理的つながり保持

## 🎯 対話パターン

### 探索場面での対応
- **興味喚起**: 「この部屋には何か特別な雰囲気がありますね...」
- **選択提示**: 「詳しく調べますか？それとも別のアプローチを？」
- **発見演出**: 「注意深く観察すると、興味深いものを発見しました」

### 判定・チェック場面
- **アプローチ評価**: プレイヤーの創意工夫を正当に評価
- **難易度説明**: 論理的で理解しやすい難易度設定の提示
- **結果演出**: 成功・失敗共に物語を前進させる結果表現

### 物語進行管理
- **ペース調整**: プレイヤーの理解度と興味に応じた進行速度
- **情報管理**: 重要な手がかりの適切なタイミングでの開示
- **緊張と弛緩**: 適度な緊張感の維持と休息場面の提供

## 🤝 他システムとの連携

### 探索システム連携
- checkExplorationStatusツールで探索状況を把握
- プレイヤーの探索意欲を高める適切なヒント提供
- 段階的発見による「探索している感」の演出

### 仲間システム連携
- 適切なタイミングでの仲間キャラクター発言調整
- プレイヤーと仲間の自然な協力関係演出
- 各キャラクターの個性を活かした場面創出

### マイルストーン管理
- プレイヤーに見せない内部進捗の把握
- 進捗に応じた物語展開の調整
- 自然な完了演出とスムーズな次段階移行

## ⚠️ 重要な禁止事項
- マイルストーン進捗の直接的な表示
- ゲーム的UIの露骨な言及
- メタ的な発言や世界観の破綻
- プレイヤーの選択を無視した強制的な展開

## 💫 期待される効果
プレイヤーが「本物のTRPG体験」として感じられる、没入感の高い物語追体験を提供してください。技術的なシステムの存在を感じさせず、自然で魅力的な物語世界への誘導を心がけてください。
  `,
  model: google("gemini-2.0-flash-lite", {
    // より高品質な応答のための設定
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      }
    ]
  }),
  tools: gameMasterTools,
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:./mastra-trpg.db"
    })
  })
});

/**
 * 戦術設定を動的に注入するGM Response生成
 */
export async function generateGMResponseWithTactics(input: {
  playerMessage: string;
  sessionId: string;
  locationId?: string;
  currentContext?: Record<string, any>;
  tactics?: EnemyTacticsLevel;
}): Promise<{
  response: string;
  suggestions?: string[];
  systemInfo?: Record<string, any>;
}> {
  try {
    logger.info(`🎭 GM generating response with tactics for: "${input.playerMessage}"`);
    
    // デフォルト戦術設定
    const defaultTactics: EnemyTacticsLevel = {
      tacticsLevel: 'strategic',
      primaryFocus: 'damage',
      teamwork: true
    };
    
    const tactics = input.tactics || defaultTactics;
    
    logger.info(`🧠 Applied tactics: ${tactics.tacticsLevel}/${tactics.primaryFocus}/teamwork:${tactics.teamwork}`);
    
    // 戦術設定を含むプロンプト作成
    const tacticsInstructions = `
現在のエネミー戦術設定:
- 戦術レベル: ${tactics.tacticsLevel}
- 行動方針: ${tactics.primaryFocus}  
- チーム連携: ${tactics.teamwork ? '有効' : '無効'}

この設定に基づいて、エネミーの行動と戦闘シーンを制御してください。
`;

    // プレイヤー意図の分析（一時的にモック実装）
    const intentAnalysis = {
      intent: "exploration" as const,
      confidence: 0.8,
      suggestedResponse: "プレイヤーの探索行動をサポートし、興味深い発見の可能性を示唆",
      requiredActions: ["check_exploration_status", "provide_exploration_guidance"]
    };
    
    logger.info(`🧠 Player intent detected: ${intentAnalysis.intent} (confidence: ${intentAnalysis.confidence})`);
    
    // 戦術設定を注入したinstructionsを使用してAgent作成
    const tacticalGameMasterAgent = new Agent({
      name: "TRPG Game Master",
      instructions: gameMasterAgent.instructions.replace(
        '{{tacticsLevel}}', tactics.tacticsLevel
      ).replace(
        '{{primaryFocus}}', tactics.primaryFocus  
      ).replace(
        '{{teamwork}}', tactics.teamwork ? '有効' : '無効'
      ),
      model: google("gemini-2.0-flash-lite", {
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      }),
      tools: gameMasterTools,
      memory: new Memory({
        storage: new LibSQLStore({
          url: "file:./mastra-trpg.db"
        })
      })
    });
    
    // Game Master Agentによる応答生成
    const response = await tacticalGameMasterAgent.generate([
      {
        role: "user",
        content: `
${tacticsInstructions}

プレイヤーメッセージ: "${input.playerMessage}"

分析結果:
- 意図: ${intentAnalysis.intent}
- 確信度: ${intentAnalysis.confidence}
- 推奨応答方針: ${intentAnalysis.suggestedResponse}

現在の状況:
- セッションID: ${input.sessionId}
- 場所ID: ${input.locationId || "未指定"}

上記の戦術設定と情報を踏まえ、プレイヤーに魅力的で没入感の高いTRPG体験を提供する応答を生成してください。
        `
      }
    ]);
    
    logger.info(`✅ GM response with tactics generated successfully`);
    
    return {
      response: response.text,
      suggestions: intentAnalysis.requiredActions,
      systemInfo: {
        intent: intentAnalysis.intent,
        confidence: intentAnalysis.confidence,
        appliedTactics: tactics,
        processingTime: Date.now()
      }
    };
    
  } catch (error) {
    logger.error('❌ Failed to generate GM response with tactics:', error);
    throw error;
  }
}

/**
 * Game Master Agentのレスポンス生成（互換性のため既存関数を維持）
 */
export async function generateGMResponse(input: {
  playerMessage: string;
  sessionId: string;
  locationId?: string;
  currentContext?: Record<string, any>;
}): Promise<{
  response: string;
  suggestions?: string[];
  systemInfo?: Record<string, any>;
}> {
  try {
    logger.info(`🎭 GM generating response for: "${input.playerMessage}"`);
    
    // プレイヤー意図の分析（一時的にモック実装）
    const intentAnalysis = {
      intent: "exploration" as const,
      confidence: 0.8,
      suggestedResponse: "プレイヤーの探索行動をサポートし、興味深い発見の可能性を示唆",
      requiredActions: ["check_exploration_status", "provide_exploration_guidance"]
    };
    
    logger.info(`🧠 Player intent detected: ${intentAnalysis.intent} (confidence: ${intentAnalysis.confidence})`);
    
    // Game Master Agentによる応答生成
    const response = await gameMasterAgent.generate([
      {
        role: "user",
        content: `
プレイヤーメッセージ: "${input.playerMessage}"

分析結果:
- 意図: ${intentAnalysis.intent}
- 確信度: ${intentAnalysis.confidence}
- 推奨応答方針: ${intentAnalysis.suggestedResponse}

現在の状況:
- セッションID: ${input.sessionId}
- 場所ID: ${input.locationId || "未指定"}

上記の情報を踏まえ、プレイヤーに魅力的で没入感の高いTRPG体験を提供する応答を生成してください。
        `
      }
    ]);
    
    logger.info(`✅ GM response generated successfully`);
    
    return {
      response: response.text,
      suggestions: intentAnalysis.requiredActions,
      systemInfo: {
        intent: intentAnalysis.intent,
        confidence: intentAnalysis.confidence,
        processingTime: Date.now()
      }
    };
    
  } catch (error) {
    logger.error('❌ Failed to generate GM response:', error);
    throw error;
  }
}

/**
 * Game Master Agent健康状態チェック
 */
export async function checkGMAgentHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: string;
}> {
  try {
    // 簡単なテスト応答生成
    const testResponse = await gameMasterAgent.generate([
      {
        role: "user", 
        content: "システムテスト: 正常動作確認のため、簡潔に「システム正常」と応答してください。"
      }
    ]);
    
    if (testResponse.text && testResponse.text.length > 0) {
      return {
        status: 'healthy',
        details: 'Game Master Agent responding normally'
      };
    } else {
      return {
        status: 'degraded',
        details: 'Game Master Agent responding but with empty response'
      };
    }
    
  } catch (error) {
    logger.error('GM Agent health check failed:', error);
    return {
      status: 'unhealthy',
      details: `Game Master Agent error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}