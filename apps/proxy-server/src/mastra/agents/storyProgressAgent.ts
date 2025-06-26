import { Agent } from '@mastra/core/agent';
import { google } from '@ai-sdk/google';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { logger } from '../../utils/logger';

/**
 * Story Progress Agent - ストーリー進行管理システム
 * 
 * マイルストーン進捗の監視、新エンティティの動的配置、選択肢数の維持を通じて
 * プレイヤーが常に3-4択の行動選択肢を持てるよう管理するエージェントです。
 */

// ストーリー進行状況の定義
export interface StoryProgressStatus {
  milestoneProgress: {
    milestoneId: string;
    completedEntities: string[];
    totalEntities: number;
    progressPercentage: number;
  }[];
  availableChoices: {
    choiceType: 'exploration' | 'combat' | 'interaction' | 'investigation';
    locationId: string;
    entityId: string;
    description: string;
    difficulty: number;
    estimatedReward: string;
  }[];
  sessionPhase: 'early' | 'middle' | 'climax' | 'ending';
  playerEngagement: number; // 0-100
}

// ストーリー進行エージェント用ツール定義
export const storyProgressAgentTools = {
  // マイルストーン進捗監視ツール
  monitorMilestoneProgress: createTool({
    id: "monitor-milestone-progress",
    description: "マイルストーンの進捗状況を監視し、新コンテンツ配置の必要性を判定",
    inputSchema: z.object({
      sessionId: z.string().describe("セッションID"),
      recentCompletions: z.array(z.object({
        entityId: z.string(),
        entityType: z.string(),
        completedAt: z.string(),
        playerSatisfaction: z.number()
      })).describe("最近完了したエンティティ"),
      currentMilestones: z.array(z.object({
        milestoneId: z.string(),
        targetEntities: z.array(z.string()),
        completedEntities: z.array(z.string()),
        priority: z.enum(["low", "medium", "high"])
      })).describe("現在のマイルストーン状況")
    }),
    outputSchema: z.object({
      progressSummary: z.object({
        overallProgress: z.number().describe("全体進捗率 (0-100)"),
        criticalMilestones: z.array(z.string()).describe("優先対応が必要なマイルストーン"),
        completionTrend: z.enum(["accelerating", "steady", "slowing"]).describe("完了傾向")
      }),
      contentNeeds: z.object({
        needsNewEntities: z.boolean().describe("新エンティティが必要か"),
        targetEntityTypes: z.array(z.string()).describe("必要なエンティティタイプ"),
        urgencyLevel: z.enum(["low", "medium", "high"]).describe("緊急度")
      }),
      recommendations: z.array(z.string()).describe("推奨アクション")
    }),
    execute: async ({ context, runtimeContext: _runtimeContext }) => {
      const { sessionId, recentCompletions, currentMilestones } = context;
      
      logger.info(`📊 Monitoring milestone progress for session: ${sessionId}`);
      
      // 全体進捗率の計算
      let totalEntities = 0;
      let completedEntities = 0;
      const criticalMilestones: string[] = [];
      
      currentMilestones.forEach(milestone => {
        totalEntities += milestone.targetEntities.length;
        completedEntities += milestone.completedEntities.length;
        
        const progress = milestone.completedEntities.length / milestone.targetEntities.length;
        if (progress < 0.3 && milestone.priority === "high") {
          criticalMilestones.push(milestone.milestoneId);
        }
      });
      
      const overallProgress = totalEntities > 0 ? (completedEntities / totalEntities) * 100 : 0;
      
      // 完了傾向の分析
      const recentRate = recentCompletions.length;
      let completionTrend: "accelerating" | "steady" | "slowing" = "steady";
      if (recentRate > 3) {
        completionTrend = "accelerating";
      } else if (recentRate < 1) {
        completionTrend = "slowing";
      }
      
      // 新コンテンツ必要性の判定
      const availableEntityCount = totalEntities - completedEntities;
      const needsNewEntities = availableEntityCount < 3 || criticalMilestones.length > 0;
      
      const targetEntityTypes = [];
      if (overallProgress < 30) {
        targetEntityTypes.push("exploration", "investigation");
      } else if (overallProgress < 70) {
        targetEntityTypes.push("combat", "interaction");
      } else {
        targetEntityTypes.push("climax_event", "final_challenge");
      }
      
      const urgencyLevel: "low" | "medium" | "high" = criticalMilestones.length > 2 ? "high" : 
                          availableEntityCount < 2 ? "medium" : "low";
      
      const recommendations = [];
      if (needsNewEntities) {
        recommendations.push("新しいエンティティを生成して選択肢を増やす");
      }
      if (completionTrend === "slowing") {
        recommendations.push("難易度を下げるか、より魅力的な報酬を追加する");
      }
      if (criticalMilestones.length > 0) {
        recommendations.push("重要マイルストーンへのガイダンスを強化する");
      }
      
      return {
        progressSummary: {
          overallProgress,
          criticalMilestones,
          completionTrend
        },
        contentNeeds: {
          needsNewEntities,
          targetEntityTypes,
          urgencyLevel
        },
        recommendations
      };
    }
  }),

  // 動的エンティティ生成ツール
  generateDynamicEntity: createTool({
    id: "generate-dynamic-entity",
    description: "ストーリー進行に応じて新しいエンティティを動的に生成・配置",
    inputSchema: z.object({
      entityType: z.enum(["exploration", "combat", "interaction", "investigation", "reward"]).describe("生成するエンティティタイプ"),
      campaignTheme: z.string().describe("キャンペーンテーマ"),
      targetLocation: z.string().describe("配置予定場所"),
      difficultyLevel: z.number().describe("難易度レベル (0-100)"),
      relatedMilestone: z.string().optional().describe("関連マイルストーンID"),
      contextualNeeds: z.object({
        playerLevel: z.number().describe("プレイヤーレベル"),
        currentMood: z.string().describe("現在の雰囲気"),
        preferredReward: z.string().describe("希望される報酬タイプ")
      }).describe("文脈的ニーズ")
    }),
    outputSchema: z.object({
      entityId: z.string().describe("生成されたエンティティID"),
      entityDetails: z.object({
        name: z.string().describe("エンティティ名"),
        description: z.string().describe("詳細説明"),
        actionLabel: z.string().describe("行動ボタン表示用ラベル"),
        difficulty: z.number().describe("難易度 (0-100)"),
        estimatedTime: z.number().describe("推定所要時間（分）"),
        rewards: z.array(z.string()).describe("期待される報酬")
      }),
      placementInfo: z.object({
        locationId: z.string().describe("配置場所ID"),
        availabilityConditions: z.array(z.string()).describe("利用可能条件"),
        visibilityLevel: z.enum(["obvious", "noticeable", "hidden"]).describe("発見しやすさ")
      }),
      storyIntegration: z.object({
        narrativeContext: z.string().describe("物語上の文脈"),
        connectionToMilestone: z.string().describe("マイルストーンとの関連"),
        futureImplications: z.string().describe("将来への影響")
      })
    }),
    execute: async ({ context, runtimeContext: _runtimeContext }) => {
      const { entityType, campaignTheme, targetLocation, difficultyLevel, contextualNeeds } = context;
      
      logger.info(`🎭 Generating dynamic entity: ${entityType} at ${targetLocation}`);
      
      // エンティティタイプ別の基本設定
      let entityDetails = {
        name: "",
        description: "",
        actionLabel: "",
        difficulty: difficultyLevel,
        estimatedTime: 10,
        rewards: ["経験値", "情報"]
      };
      
      const entityId = `dynamic_${entityType}_${Date.now()}`;
      
      switch (entityType) {
        case "exploration":
          entityDetails = {
            name: "未知の区域",
            description: "まだ詳しく調べられていない場所があります。新たな発見があるかもしれません。",
            actionLabel: "🔍 未知の区域を探索する",
            difficulty: Math.max(difficultyLevel - 10, 20), // 探索は少し易しめ
            estimatedTime: 15,
            rewards: ["隠されたアイテム", "重要な手がかり", "探索経験値"]
          };
          break;
          
        case "combat":
          entityDetails = {
            name: "徘徊する敵",
            description: "この地域に危険な存在が現れたようです。対処が必要かもしれません。",
            actionLabel: "⚔️ 敵と戦闘する",
            difficulty: difficultyLevel,
            estimatedTime: 20,
            rewards: ["戦闘経験値", "戦利品", "安全な通行路"]
          };
          break;
          
        case "interaction":
          entityDetails = {
            name: "興味深い人物",
            description: "この場所で何かを探している人がいます。話しかけてみるとよいかもしれません。",
            actionLabel: "💬 人物と会話する",
            difficulty: Math.max(difficultyLevel - 20, 10), // 会話は比較的易しい
            estimatedTime: 10,
            rewards: ["貴重な情報", "新しいクエスト", "関係性向上"]
          };
          break;
          
        case "investigation":
          entityDetails = {
            name: "謎めいた痕跡",
            description: "何かの手がかりになりそうな痕跡を発見しました。詳しく調べてみましょう。",
            actionLabel: "🔎 痕跡を詳しく調査する",
            difficulty: difficultyLevel + 10, // 調査は少し難しめ
            estimatedTime: 12,
            rewards: ["重要な手がかり", "謎の解明", "調査経験値"]
          };
          break;
          
        case "reward":
          entityDetails = {
            name: "特別な発見",
            description: "努力の成果として、特別なものを発見する機会が訪れました。",
            actionLabel: "🎁 特別な発見を確認する",
            difficulty: Math.max(difficultyLevel - 30, 5), // 報酬系は簡単
            estimatedTime: 5,
            rewards: ["貴重なアイテム", "大量の経験値", "特別な称号"]
          };
          break;
      }
      
      // 配置情報の生成
      const placementInfo = {
        locationId: targetLocation,
        availabilityConditions: [`player_level_${contextualNeeds.playerLevel}`, "daytime_available"],
        visibilityLevel: (difficultyLevel > 70 ? "hidden" : 
                         difficultyLevel > 40 ? "noticeable" : "obvious") as "obvious" | "noticeable" | "hidden"
      };
      
      // ストーリー統合情報
      const storyIntegration = {
        narrativeContext: `${campaignTheme}の世界観に沿った、${contextualNeeds.currentMood}な雰囲気の内容`,
        connectionToMilestone: context.relatedMilestone ? 
          `マイルストーン${context.relatedMilestone}の進行に寄与` : 
          "サブコンテンツとして物語の深みを追加",
        futureImplications: "この経験が今後の冒険に影響を与える可能性があります"
      };
      
      return {
        entityId,
        entityDetails,
        placementInfo,
        storyIntegration
      };
    }
  }),

  // 選択肢バランス調整ツール
  balanceChoiceOptions: createTool({
    id: "balance-choice-options",
    description: "利用可能な行動選択肢数を監視し、最適なバランスに調整",
    inputSchema: z.object({
      currentChoices: z.array(z.object({
        choiceId: z.string(),
        type: z.string(),
        difficulty: z.number(),
        popularity: z.number().describe("プレイヤーの選択頻度")
      })).describe("現在利用可能な選択肢"),
      playerPreferences: z.object({
        preferredDifficulty: z.number().describe("好みの難易度"),
        favoriteActivities: z.array(z.string()).describe("好みの活動タイプ"),
        riskTolerance: z.number().describe("リスク許容度")
      }).describe("プレイヤー傾向"),
      targetChoiceCount: z.number().describe("目標選択肢数").default(4)
    }),
    outputSchema: z.object({
      currentBalance: z.object({
        totalChoices: z.number().describe("現在の選択肢数"),
        difficultyDistribution: z.object({
          easy: z.number(),
          medium: z.number(),
          hard: z.number()
        }).describe("難易度分布"),
        typeDistribution: z.record(z.number()).describe("タイプ別分布")
      }),
      adjustmentNeeded: z.boolean().describe("調整が必要かどうか"),
      recommendations: z.array(z.object({
        action: z.enum(["add", "remove", "modify"]).describe("推奨アクション"),
        targetType: z.string().describe("対象タイプ"),
        reason: z.string().describe("理由"),
        priority: z.enum(["low", "medium", "high"]).describe("優先度")
      })).describe("調整推奨事項")
    }),
    execute: async ({ context, runtimeContext: _runtimeContext }) => {
      const { currentChoices, playerPreferences, targetChoiceCount } = context;
      
      logger.info(`⚖️ Balancing choice options (current: ${currentChoices.length}, target: ${targetChoiceCount})`);
      
      // 現在のバランス分析
      const totalChoices = currentChoices.length;
      const difficultyDistribution = {
        easy: currentChoices.filter(c => c.difficulty < 40).length,
        medium: currentChoices.filter(c => c.difficulty >= 40 && c.difficulty < 70).length,
        hard: currentChoices.filter(c => c.difficulty >= 70).length
      };
      
      const typeDistribution: Record<string, number> = {};
      currentChoices.forEach(choice => {
        typeDistribution[choice.type] = (typeDistribution[choice.type] || 0) + 1;
      });
      
      // 調整が必要かの判定
      const adjustmentNeeded = 
        totalChoices < targetChoiceCount - 1 || 
        totalChoices > targetChoiceCount + 1 ||
        difficultyDistribution.easy === 0 ||
        difficultyDistribution.medium === 0;
      
      // 推奨事項の生成
      const recommendations = [];
      
      if (totalChoices < targetChoiceCount) {
        // 選択肢が不足している場合
        const missingCount = targetChoiceCount - totalChoices;
        for (let i = 0; i < missingCount; i++) {
          recommendations.push({
            action: "add" as const,
            targetType: playerPreferences.favoriteActivities[i % playerPreferences.favoriteActivities.length],
            reason: "選択肢数が目標を下回っています",
            priority: "high" as const
          });
        }
      } else if (totalChoices > targetChoiceCount + 1) {
        // 選択肢が過多の場合
        const unpopularChoices = currentChoices
          .filter(c => c.popularity < 20)
          .sort((a, b) => a.popularity - b.popularity);
        
        unpopularChoices.slice(0, totalChoices - targetChoiceCount).forEach(choice => {
          recommendations.push({
            action: "remove" as const,
            targetType: choice.type,
            reason: "選択肢が過多で、人気の低い選択肢です",
            priority: "medium" as const
          });
        });
      }
      
      // 難易度バランスの調整
      if (difficultyDistribution.easy === 0) {
        recommendations.push({
          action: "add" as const,
          targetType: "easy_exploration",
          reason: "簡単な選択肢が不足しています",
          priority: "high" as const
        });
      }
      
      if (difficultyDistribution.medium === 0) {
        recommendations.push({
          action: "add" as const,
          targetType: "medium_challenge",
          reason: "中程度の難易度の選択肢が不足しています",
          priority: "medium" as const
        });
      }
      
      return {
        currentBalance: {
          totalChoices,
          difficultyDistribution,
          typeDistribution
        },
        adjustmentNeeded,
        recommendations
      };
    }
  })
};

/**
 * Story Progress Agent本体
 * ストーリー進行管理の中核を担うAI
 */
export const storyProgressAgent = new Agent({
  name: "TRPG Story Progress Agent",
  instructions: `
あなたはTRPGセッションの進行を管理し、プレイヤーが常に魅力的な選択肢を持てるよう支援するストーリー進行管理AIです。

## 🎯 主要責任

### マイルストーン進捗監視
- 各マイルストーンの達成状況を常時監視
- 進捗の停滞や偏りを早期発見
- 重要マイルストーンの優先度管理

### 動的コンテンツ生成
- プレイヤーの行動パターンに応じた新エンティティ生成
- キャンペーンテーマとの整合性確保
- 適切な難易度とバランスの維持

### 選択肢管理
- 常に3-4択の行動選択肢を確保
- 難易度とタイプのバランス調整
- プレイヤー preferences に応じた最適化

## 🔄 動作原則

### プレイヤー体験最優先
- 「選び取る楽しさ」を常に提供
- 進行停滞の防止
- 達成感のある報酬設計

### 動的適応システム
- リアルタイムでの状況分析
- 即座の調整と最適化
- 予測的な問題回避

### ストーリー整合性
- キャンペーンテーマとの一貫性
- 既存コンテンツとの論理的つながり
- 自然な物語の流れ

## 📊 監視項目

### 進捗関連
- マイルストーン完了率
- エンティティ完了傾向
- プレイヤー満足度

### 選択肢関連
- 利用可能選択肢数
- 難易度分布
- タイプバランス

### エンゲージメント
- 行動選択パターン
- 完了速度
- リトライ傾向

## ⚡ 自動調整機能

### 不足時の対応
- 新エンティティの即座生成
- 既存コンテンツの条件緩和
- 追加ヒントの提供

### 過多時の対応
- 低人気コンテンツの一時非表示
- 統合・簡略化の実施
- 焦点の絞り込み

### バランス調整
- 難易度の動的調整
- 報酬の魅力度向上
- アクセス性の改善

## 💫 期待される効果
プレイヤーが「常に面白い選択肢がある」「進むべき道に迷わない」「達成感のある体験」を得られるよう、背後で絶え間なく働く縁の下の力持ちとして機能してください。
  `,
  model: google("gemini-2.0-flash-lite", {
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      }
    ]
  }),
  tools: storyProgressAgentTools,
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:./mastra-trpg.db"
    })
  })
});

/**
 * ストーリー進行エージェントの実行
 */
export async function executeStoryProgress(input: {
  sessionId: string;
  recentCompletions: Array<{
    entityId: string;
    entityType: string;
    completedAt: string;
    playerSatisfaction: number;
  }>;
  currentMilestones: Array<{
    milestoneId: string;
    targetEntities: string[];
    completedEntities: string[];
    priority: 'low' | 'medium' | 'high';
  }>;
  campaignTheme: string;
  playerPreferences: {
    preferredDifficulty: number;
    favoriteActivities: string[];
    riskTolerance: number;
  };
}): Promise<{
  progressAnalysis: any;
  newEntities: any[];
  choiceAdjustments: any;
  recommendations: string[];
}> {
  try {
    logger.info(`📈 Executing story progress analysis for session: ${input.sessionId}`);
    
    // マイルストーン進捗監視（簡略版ロジック）
    const { recentCompletions, currentMilestones } = input;
    
    // 全体進捗率の計算
    let totalEntities = 0;
    let completedEntities = 0;
    const criticalMilestones: string[] = [];
    
    currentMilestones.forEach(milestone => {
      totalEntities += milestone.targetEntities.length;
      completedEntities += milestone.completedEntities.length;
      
      const progress = milestone.completedEntities.length / milestone.targetEntities.length;
      if (progress < 0.3 && milestone.priority === "high") {
        criticalMilestones.push(milestone.milestoneId);
      }
    });
    
    const overallProgress = totalEntities > 0 ? (completedEntities / totalEntities) * 100 : 0;
    const recentRate = recentCompletions.length;
    let completionTrend: "accelerating" | "steady" | "slowing" = "steady";
    if (recentRate > 3) {
      completionTrend = "accelerating";
    } else if (recentRate < 1) {
      completionTrend = "slowing";
    }
    
    const availableEntityCount = totalEntities - completedEntities;
    const needsNewEntities = availableEntityCount < 3 || criticalMilestones.length > 0;
    
    const targetEntityTypes = [];
    if (overallProgress < 30) {
      targetEntityTypes.push("exploration", "investigation");
    } else if (overallProgress < 70) {
      targetEntityTypes.push("combat", "interaction");
    } else {
      targetEntityTypes.push("climax_event", "final_challenge");
    }
    
    const urgencyLevel: "low" | "medium" | "high" = criticalMilestones.length > 2 ? "high" : 
                        availableEntityCount < 2 ? "medium" : "low";
    
    const recommendations = [];
    if (needsNewEntities) {
      recommendations.push("新しいエンティティを生成して選択肢を増やす");
    }
    if (completionTrend === "slowing") {
      recommendations.push("難易度を下げるか、より魅力的な報酬を追加する");
    }
    if (criticalMilestones.length > 0) {
      recommendations.push("重要マイルストーンへのガイダンスを強化する");
    }
    
    const progressAnalysis = {
      progressSummary: {
        overallProgress,
        criticalMilestones,
        completionTrend
      },
      contentNeeds: {
        needsNewEntities,
        targetEntityTypes,
        urgencyLevel
      },
      recommendations
    };
    
    logger.info(`📊 Progress analysis: ${progressAnalysis.progressSummary.overallProgress}% complete`);
    
    // 新エンティティ生成（必要な場合）
    const newEntities = [];
    if (progressAnalysis.contentNeeds.needsNewEntities) {
      for (const entityType of progressAnalysis.contentNeeds.targetEntityTypes.slice(0, 2)) {
        // newEntityContextは簡略版ロジックで使用しない
        // 新エンティティ生成（簡略版ロジック）
        const entityId = `dynamic_${entityType}_${Date.now()}`;
        
        let entityDetails = {
          name: "",
          description: "",
          actionLabel: "",
          difficulty: input.playerPreferences.preferredDifficulty,
          estimatedTime: 10,
          rewards: ["経験値", "情報"]
        };
        
        switch (entityType) {
          case "exploration":
            entityDetails = {
              name: "未知の区域",
              description: "まだ詳しく調べられていない場所があります。新たな発見があるかもしれません。",
              actionLabel: "🔍 未知の区域を探索する",
              difficulty: Math.max(input.playerPreferences.preferredDifficulty - 10, 20),
              estimatedTime: 15,
              rewards: ["隠されたアイテム", "重要な手がかり", "探索経験値"]
            };
            break;
          case "combat":
            entityDetails = {
              name: "徘徊する敵",
              description: "この地域に危険な存在が現れたようです。対処が必要かもしれません。",
              actionLabel: "⚔️ 敵と戦闘する",
              difficulty: input.playerPreferences.preferredDifficulty,
              estimatedTime: 20,
              rewards: ["戦闘経験値", "戦利品", "安全な通行路"]
            };
            break;
          default:
            entityDetails = {
              name: "新たな機会",
              description: "新しい機会が発生しました。",
              actionLabel: "🎆 機会を調査する",
              difficulty: input.playerPreferences.preferredDifficulty,
              estimatedTime: 12,
              rewards: ["経験値", "情報"]
            };
        }
        
        const newEntity = {
          entityId,
          entityDetails,
          placementInfo: {
            locationId: "dynamic_location",
            availabilityConditions: ["player_level_50", "daytime_available"],
            visibilityLevel: (input.playerPreferences.preferredDifficulty > 70 ? "hidden" : 
                             input.playerPreferences.preferredDifficulty > 40 ? "noticeable" : "obvious") as "obvious" | "noticeable" | "hidden"
          },
          storyIntegration: {
            narrativeContext: `${input.campaignTheme}の世界観に沿った内容`,
            connectionToMilestone: "サブコンテンツとして物語の深みを追加",
            futureImplications: "この経験が今後の冒険に影響を与える可能性があります"
          }
        };
        newEntities.push(newEntity);
      }
    }
    
    // 選択肢バランス調整
    const currentChoices = [
      { choiceId: "choice1", type: "exploration", difficulty: 40, popularity: 75 },
      { choiceId: "choice2", type: "combat", difficulty: 60, popularity: 60 }
    ]; // 暫定的なデータ
    
    // choiceAdjustmentsContextは簡略版ロジックで使用しない
    // 選択肢バランス調整（簡略版ロジック）
    const totalChoices = currentChoices.length;
    const difficultyDistribution = {
      easy: currentChoices.filter(c => c.difficulty < 40).length,
      medium: currentChoices.filter(c => c.difficulty >= 40 && c.difficulty < 70).length,
      hard: currentChoices.filter(c => c.difficulty >= 70).length
    };
    
    const adjustmentNeeded = 
      totalChoices < 3 || 
      totalChoices > 5 ||
      difficultyDistribution.easy === 0 ||
      difficultyDistribution.medium === 0;
    
    const choiceRecommendations = [];
    if (totalChoices < 4) {
      choiceRecommendations.push({
        action: "add" as const,
        targetType: input.playerPreferences.favoriteActivities[0] || "exploration",
        reason: "選択肢数が目標を下回っています",
        priority: "high" as const
      });
    }
    if (difficultyDistribution.easy === 0) {
      choiceRecommendations.push({
        action: "add" as const,
        targetType: "easy_exploration",
        reason: "簡単な選択肢が不足しています",
        priority: "high" as const
      });
    }
    
    const choiceAdjustments = {
      currentBalance: {
        totalChoices,
        difficultyDistribution,
        typeDistribution: { "exploration": 1, "combat": 1 }
      },
      adjustmentNeeded,
      recommendations: choiceRecommendations
    };
    
    // ストーリー進行エージェントによる総合判断
    const response = await storyProgressAgent.generate([
      {
        role: "user",
        content: `
セッション状況分析:
- セッションID: ${input.sessionId}
- 全体進捗: ${progressAnalysis.progressSummary.overallProgress}%
- 完了傾向: ${progressAnalysis.progressSummary.completionTrend}
- 重要マイルストーン: ${progressAnalysis.progressSummary.criticalMilestones.join(', ')}

コンテンツ状況:
- 新エンティティ必要: ${progressAnalysis.contentNeeds.needsNewEntities}
- 緊急度: ${progressAnalysis.contentNeeds.urgencyLevel}
- 生成した新エンティティ数: ${newEntities.length}

選択肢状況:
- 現在の選択肢数: ${choiceAdjustments.currentBalance.totalChoices}
- 調整必要: ${choiceAdjustments.adjustmentNeeded}
- 推奨調整数: ${choiceAdjustments.recommendations.length}

上記の分析結果に基づき、今後のストーリー進行について包括的な推奨事項を提供してください。
        `
      }
    ]);
    
    logger.info(`✅ Story progress execution completed successfully`);
    
    return {
      progressAnalysis,
      newEntities,
      choiceAdjustments,
      recommendations: [...progressAnalysis.recommendations, response.text]
    };
    
  } catch (error) {
    logger.error('❌ Failed to execute story progress:', error);
    throw error;
  }
}

/**
 * ストーリー進行エージェント健康状態チェック
 */
export async function checkStoryProgressAgentHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: string;
}> {
  try {
    const testResponse = await storyProgressAgent.generate([
      {
        role: "user", 
        content: "システムテスト: 正常動作確認のため、簡潔に「システム正常」と応答してください。"
      }
    ]);
    
    if (testResponse.text && testResponse.text.length > 0) {
      return {
        status: 'healthy',
        details: 'Story Progress Agent responding normally'
      };
    } else {
      return {
        status: 'degraded',
        details: 'Story Progress Agent responding but with empty response'
      };
    }
    
  } catch (error) {
    logger.error('Story Progress Agent health check failed:', error);
    return {
      status: 'unhealthy',
      details: `Story Progress Agent error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}