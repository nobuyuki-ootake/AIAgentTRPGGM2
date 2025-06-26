import { Agent } from '@mastra/core/agent';
import { google } from '@ai-sdk/google';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { logger } from '../../utils/logger';

/**
 * Environment Management Agent - 環境管理システム
 * 
 * 天候、時間、NPC態度、噂の発生など、TRPG世界の「生きている感」を演出し、
 * 自然で動的な環境変化を管理するエージェントです。
 */

// 環境状態の定義
export interface EnvironmentState {
  weather: {
    condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'foggy' | 'snowy';
    intensity: number; // 0-100
    duration: number; // 残り時間（分）
  };
  timeOfDay: {
    current: 'dawn' | 'morning' | 'noon' | 'afternoon' | 'evening' | 'night' | 'late_night';
    nextTransition: number; // 次の時間帯まで（分）
  };
  atmosphere: {
    tension: number; // 緊張感 (0-100)
    mystery: number; // 神秘性 (0-100)
    comfort: number; // 安心感 (0-100)
  };
  npcStates: {
    npcId: string;
    attitude: 'friendly' | 'neutral' | 'cautious' | 'hostile';
    mood: 'happy' | 'normal' | 'worried' | 'angry' | 'excited';
    availability: boolean;
  }[];
  rumors: {
    rumorId: string;
    content: string;
    credibility: number; // 信憑性 (0-100)
    spreadLevel: number; // 広がり度 (0-100)
    source: string;
  }[];
}

// 環境管理エージェント用ツール定義
export const environmentAgentTools = {
  // 天候変化管理ツール
  manageWeatherTransition: createTool({
    id: "manage-weather-transition",
    description: "天候の自然な変化を管理し、ゲームプレイへの影響を計算",
    inputSchema: z.object({
      currentWeather: z.object({
        condition: z.enum(["sunny", "cloudy", "rainy", "stormy", "foggy", "snowy"]),
        intensity: z.number().describe("現在の強度"),
        duration: z.number().describe("継続時間")
      }).describe("現在の天候"),
      seasonalContext: z.object({
        season: z.enum(["spring", "summer", "autumn", "winter"]),
        climate: z.enum(["temperate", "tropical", "arctic", "desert", "mountain"])
      }).describe("季節・気候的背景"),
      gameplayImpact: z.object({
        currentActivity: z.string().describe("現在の活動"),
        locationtype: z.string().describe("場所の種類"),
        playerActions: z.array(z.string()).describe("プレイヤーの最近の行動")
      }).describe("ゲームプレイコンテキスト")
    }),
    outputSchema: z.object({
      weatherChange: z.object({
        newCondition: z.enum(["sunny", "cloudy", "rainy", "stormy", "foggy", "snowy"]),
        transitionReason: z.string().describe("変化の理由"),
        changeIntensity: z.number().describe("変化の強さ"),
        estimatedDuration: z.number().describe("新天候の推定継続時間")
      }),
      gameplayEffects: z.object({
        visibilityModifier: z.number().describe("視界への影響 (-50 to +20)"),
        movementModifier: z.number().describe("移動への影響 (-30 to +10)"),
        moodModifier: z.number().describe("雰囲気への影響 (-20 to +30)"),
        specialOpportunities: z.array(z.string()).describe("特別な機会")
      }),
      narrativeDescription: z.string().describe("天候変化の物語的描写")
    }),
    execute: async ({ context, runtimeContext: _runtimeContext }) => {
      const { currentWeather, seasonalContext, gameplayImpact } = context;
      
      logger.info(`🌤️ Managing weather transition from ${currentWeather.condition}`);
      
      // 季節と気候に基づく天候変化の確率計算
      const weatherTransitions: Record<string, string[]> = {
        sunny: ["cloudy", "sunny", "cloudy"],
        cloudy: ["rainy", "sunny", "cloudy", "foggy"],
        rainy: ["cloudy", "stormy", "foggy"],
        stormy: ["rainy", "cloudy"],
        foggy: ["cloudy", "sunny"],
        snowy: ["cloudy", "snowy"]
      };
      
      // 季節的調整
      let possibleTransitions = weatherTransitions[currentWeather.condition] || ["cloudy"];
      if (seasonalContext.season === "winter" && seasonalContext.climate !== "tropical") {
        possibleTransitions.push("snowy");
      }
      if (seasonalContext.season === "summer" && seasonalContext.climate === "tropical") {
        possibleTransitions = possibleTransitions.filter(w => w !== "snowy");
      }
      
      // ランダム選択（重み付け）
      const newCondition = possibleTransitions[Math.floor(Math.random() * possibleTransitions.length)] as any;
      
      const transitionReason = (() => {
        if (currentWeather.duration <= 0) return "自然な時間経過による変化";
        if (gameplayImpact.currentActivity.includes("探索")) return "探索活動に応じた環境変化";
        return "大気の状態変化";
      })();
      
      // ゲームプレイ効果の計算
      const gameplayEffects = {
        visibilityModifier: (() => {
          switch (newCondition) {
            case "foggy": return -40;
            case "stormy": return -30;
            case "rainy": return -20;
            case "snowy": return -25;
            case "cloudy": return -5;
            case "sunny": return 10;
            default: return 0;
          }
        })(),
        movementModifier: (() => {
          switch (newCondition) {
            case "stormy": return -25;
            case "snowy": return -20;
            case "rainy": return -15;
            case "foggy": return -10;
            case "cloudy": return 0;
            case "sunny": return 5;
            default: return 0;
          }
        })(),
        moodModifier: (() => {
          switch (newCondition) {
            case "sunny": return 20;
            case "cloudy": return -5;
            case "rainy": return -10;
            case "stormy": return -15;
            case "foggy": return -8;
            case "snowy": return 0; // 美しさもあるため中性
            default: return 0;
          }
        })(),
        specialOpportunities: (() => {
          const opportunities = [];
          if (newCondition === "rainy") opportunities.push("雨水を利用した隠し通路の発見");
          if (newCondition === "foggy") opportunities.push("霧に隠れた隠密行動の機会");
          if (newCondition === "stormy") opportunities.push("嵐の音に紛れた潜入の機会");
          if (newCondition === "snowy") opportunities.push("雪景色による新たな視点");
          if (newCondition === "sunny") opportunities.push("良好な視界による遠方の観察");
          return opportunities;
        })()
      };
      
      const narrativeDescription = (() => {
        switch (newCondition) {
          case "sunny": return "雲間から陽光が差し込み、世界が明るく輝いて見えます";
          case "cloudy": return "空を厚い雲が覆い、薄暗い光が辺りを包みます";
          case "rainy": return "雨粒が地面を叩く音が響き、しっとりとした空気が漂います";
          case "stormy": return "激しい風と雨が吹き荒れ、緊張感が高まります";
          case "foggy": return "深い霧が立ち込め、視界が不鮮明になります";
          case "snowy": return "白い雪が静かに舞い降り、世界を覆い隠していきます";
          default: return "天候が変化し、環境に新たな印象が生まれます";
        }
      })();
      
      return {
        weatherChange: {
          newCondition,
          transitionReason,
          changeIntensity: Math.floor(Math.random() * 30) + 20,
          estimatedDuration: Math.floor(Math.random() * 60) + 30
        },
        gameplayEffects,
        narrativeDescription
      };
    }
  }),

  // NPC態度変化管理ツール
  manageNPCAttitudeChanges: createTool({
    id: "manage-npc-attitude-changes",
    description: "NPCの態度や気分の変化を管理し、プレイヤーとの関係性に反映",
    inputSchema: z.object({
      npcs: z.array(z.object({
        npcId: z.string(),
        currentAttitude: z.enum(["friendly", "neutral", "cautious", "hostile"]),
        currentMood: z.enum(["happy", "normal", "worried", "angry", "excited"]),
        relationshipLevel: z.number().describe("プレイヤーとの関係度 (0-100)")
      })).describe("対象NPCリスト"),
      recentEvents: z.array(z.object({
        eventType: z.string(),
        impact: z.number().describe("影響度 (-50 to +50)"),
        involvedNPCs: z.array(z.string())
      })).describe("最近の出来事"),
      environmentFactors: z.object({
        weather: z.string(),
        timeOfDay: z.string(),
        locationSafety: z.number().describe("場所の安全度 (0-100)")
      }).describe("環境要因")
    }),
    outputSchema: z.object({
      attitudeChanges: z.array(z.object({
        npcId: z.string(),
        oldAttitude: z.string(),
        newAttitude: z.enum(["friendly", "neutral", "cautious", "hostile"]),
        oldMood: z.string(),
        newMood: z.enum(["happy", "normal", "worried", "angry", "excited"]),
        changeReason: z.string().describe("変化の理由"),
        relationshipImpact: z.number().describe("関係性への影響")
      })),
      socialDynamics: z.object({
        overallMoodShift: z.number().describe("全体的な雰囲気の変化"),
        keyRelationshipChanges: z.array(z.string()).describe("重要な関係性変化"),
        newInteractionOpportunities: z.array(z.string()).describe("新たな交流機会")
      }),
      narrativeImpact: z.string().describe("物語への影響の説明")
    }),
    execute: async ({ context, runtimeContext: _runtimeContext }) => {
      const { npcs, recentEvents, environmentFactors } = context;
      
      logger.info(`👥 Managing NPC attitude changes for ${npcs.length} NPCs`);
      
      const attitudeChanges = [];
      let overallMoodShift = 0;
      const keyRelationshipChanges = [];
      const newInteractionOpportunities = [];
      
      for (const npc of npcs) {
        let attitudeChange = 0;
        let moodChange = 0;
        let changeReasons = [];
        
        // 最近の出来事による影響
        for (const event of recentEvents) {
          if (event.involvedNPCs.includes(npc.npcId)) {
            attitudeChange += event.impact * 0.02; // 態度への影響
            moodChange += event.impact * 0.03; // 気分への影響
            changeReasons.push(`${event.eventType}による影響`);
          }
        }
        
        // 環境要因による影響
        if (environmentFactors.weather === "stormy") {
          moodChange -= 10;
          changeReasons.push("嵐による不安");
        } else if (environmentFactors.weather === "sunny") {
          moodChange += 5;
          changeReasons.push("良い天気による気分向上");
        }
        
        if (environmentFactors.locationSafety < 30) {
          attitudeChange -= 5;
          moodChange -= 15;
          changeReasons.push("危険な状況への懸念");
        }
        
        // 態度の変化計算
        const attitudeMapping = { "hostile": 0, "cautious": 1, "neutral": 2, "friendly": 3 };
        const reverseMapping = ["hostile", "cautious", "neutral", "friendly"];
        const currentAttitudeValue = attitudeMapping[npc.currentAttitude as keyof typeof attitudeMapping];
        const newAttitudeValue = Math.max(0, Math.min(3, Math.round(currentAttitudeValue + attitudeChange / 25)));
        const newAttitude = reverseMapping[newAttitudeValue] as any;
        
        // 気分の変化計算
        const moodMapping = { "angry": 0, "worried": 1, "normal": 2, "happy": 3, "excited": 4 };
        const reverseMoodMapping = ["angry", "worried", "normal", "happy", "excited"];
        const currentMoodValue = moodMapping[npc.currentMood as keyof typeof moodMapping];
        const newMoodValue = Math.max(0, Math.min(4, Math.round(currentMoodValue + moodChange / 20)));
        const newMood = reverseMoodMapping[newMoodValue] as any;
        
        // 変化があった場合のみ記録
        if (newAttitude !== npc.currentAttitude || newMood !== npc.currentMood) {
          attitudeChanges.push({
            npcId: npc.npcId,
            oldAttitude: npc.currentAttitude,
            newAttitude,
            oldMood: npc.currentMood,
            newMood,
            changeReason: changeReasons.join(", ") || "自然な変化",
            relationshipImpact: attitudeChange
          });
          
          overallMoodShift += moodChange;
          
          if (Math.abs(attitudeChange) > 10) {
            keyRelationshipChanges.push(`${npc.npcId}との関係が${attitudeChange > 0 ? "改善" : "悪化"}`);
          }
          
          if (newAttitude === "friendly" && npc.currentAttitude !== "friendly") {
            newInteractionOpportunities.push(`${npc.npcId}との深い会話の機会`);
          }
        }
      }
      
      const narrativeImpact = (() => {
        if (overallMoodShift > 20) return "周囲の人々の雰囲気が明らかに良くなっています";
        if (overallMoodShift < -20) return "人々の間に不安や緊張が漂っています";
        if (keyRelationshipChanges.length > 0) return "重要な人物との関係に変化が生じています";
        return "社会的環境に微細な変化が見られます";
      })();
      
      return {
        attitudeChanges,
        socialDynamics: {
          overallMoodShift,
          keyRelationshipChanges,
          newInteractionOpportunities
        },
        narrativeImpact
      };
    }
  }),

  // 噂・情報拡散管理ツール
  manageRumorSpread: createTool({
    id: "manage-rumor-spread",
    description: "噂や情報の自然な拡散と新しい噂の発生を管理",
    inputSchema: z.object({
      existingRumors: z.array(z.object({
        rumorId: z.string(),
        content: z.string(),
        credibility: z.number(),
        spreadLevel: z.number(),
        source: z.string(),
        ageInDays: z.number()
      })).describe("既存の噂"),
      recentPlayerActions: z.array(z.object({
        action: z.string(),
        location: z.string(),
        visibility: z.number().describe("行動の目立ち度 (0-100)"),
        impact: z.number().describe("社会的影響度 (0-100)")
      })).describe("プレイヤーの最近の行動"),
      socialContext: z.object({
        populationDensity: z.number().describe("人口密度 (0-100)"),
        communicationSpeed: z.number().describe("情報伝達速度 (0-100)"),
        trustLevel: z.number().describe("人々の信頼度 (0-100)")
      }).describe("社会的コンテキスト")
    }),
    outputSchema: z.object({
      rumorUpdates: z.array(z.object({
        rumorId: z.string(),
        credibilityChange: z.number(),
        spreadChange: z.number(),
        newVariations: z.array(z.string()).describe("噂の新しいバリエーション")
      })),
      newRumors: z.array(z.object({
        rumorId: z.string(),
        content: z.string(),
        source: z.string(),
        initialCredibility: z.number(),
        category: z.enum(["player_action", "local_event", "distant_news", "mystery"])
      })),
      informationOpportunities: z.array(z.object({
        opportunity: z.string(),
        location: z.string(),
        difficulty: z.number().describe("情報入手の難易度"),
        value: z.number().describe("情報の価値")
      })),
      socialClimateChange: z.string().describe("社会情勢の変化")
    }),
    execute: async ({ context, runtimeContext: _runtimeContext }) => {
      const { existingRumors, recentPlayerActions, socialContext } = context;
      
      logger.info(`📰 Managing rumor spread for ${existingRumors.length} existing rumors`);
      
      const rumorUpdates = [];
      const newRumors = [];
      const informationOpportunities = [];
      
      // 既存の噂の更新
      for (const rumor of existingRumors) {
        let credibilityChange = 0;
        let spreadChange = 0;
        const newVariations = [];
        
        // 時間経過による変化
        if (rumor.ageInDays > 7) {
          credibilityChange -= 5; // 古い噂は信憑性が下がる
        }
        
        if (rumor.ageInDays > 3) {
          spreadChange += Math.min(socialContext.communicationSpeed / 10, 10); // 拡散は続く
        }
        
        // プレイヤー行動の影響
        for (const action of recentPlayerActions) {
          if (rumor.content.includes(action.location) || rumor.content.includes(action.action)) {
            credibilityChange += action.impact / 10;
            spreadChange += action.visibility / 10;
            newVariations.push(`${action.action}に関連した新たな目撃情報`);
          }
        }
        
        rumorUpdates.push({
          rumorId: rumor.rumorId,
          credibilityChange,
          spreadChange,
          newVariations
        });
      }
      
      // 新しい噂の生成
      for (const action of recentPlayerActions) {
        if (action.visibility > 50) {
          const rumorContent = (() => {
            switch (action.action) {
              case "exploration":
                return `${action.location}で謎の人物が何かを探していたという話`;
              case "combat":
                return `${action.location}で激しい戦闘があったという噂`;
              case "interaction":
                return `${action.location}で重要人物と会談があったという情報`;
              default:
                return `${action.location}で何か重要な出来事があったという話`;
            }
          })();
          
          newRumors.push({
            rumorId: `rumor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            content: rumorContent,
            source: "目撃者",
            initialCredibility: Math.min(action.visibility + socialContext.trustLevel, 100),
            category: "player_action" as const
          });
        }
      }
      
      // ランダムな地域イベント噂
      if (Math.random() < 0.3) {
        const randomRumors = [
          "遠方の王国で政変があったという話",
          "古い遺跡で宝物が発見されたという噂",
          "森の奥で不思議な現象が目撃されたという報告",
          "商人が珍しい品物を持ち込んだという情報"
        ];
        
        const selectedRumor = randomRumors[Math.floor(Math.random() * randomRumors.length)];
        newRumors.push({
          rumorId: `random_rumor_${Date.now()}`,
          content: selectedRumor,
          source: "旅人",
          initialCredibility: 40 + Math.random() * 30,
          category: "distant_news" as const
        });
      }
      
      // 情報入手機会の生成
      if (newRumors.length > 0 || rumorUpdates.some(u => u.credibilityChange > 10)) {
        informationOpportunities.push({
          opportunity: "酒場での情報収集",
          location: "tavern",
          difficulty: 20,
          value: 70
        });
      }
      
      if (rumorUpdates.some(u => u.spreadChange > 15)) {
        informationOpportunities.push({
          opportunity: "市場での立ち話",
          location: "market",
          difficulty: 10,
          value: 50
        });
      }
      
      const socialClimateChange = (() => {
        const totalNewRumors = newRumors.length;
        const highImpactActions = recentPlayerActions.filter(a => a.impact > 70).length;
        
        if (totalNewRumors > 2 && highImpactActions > 0) {
          return "人々の間で活発な情報交換が行われ、緊張感が高まっています";
        } else if (totalNewRumors > 1) {
          return "新しい話題が生まれ、コミュニティに活気が戻ってきています";
        } else {
          return "情報の流れは比較的静かで、日常的な状況が続いています";
        }
      })();
      
      return {
        rumorUpdates,
        newRumors,
        informationOpportunities,
        socialClimateChange
      };
    }
  })
};

/**
 * Environment Management Agent本体
 * 世界の動的変化を管理する環境AI
 */
export const environmentAgent = new Agent({
  name: "TRPG Environment Management Agent",
  instructions: `
あなたはTRPG世界の環境管理を担当し、プレイヤーが「生きた世界」を体験できるよう、動的で自然な変化を提供する環境管理AIです。

## 🌍 主要責任

### 天候システム管理
- 季節と気候に応じた自然な天候変化
- ゲームプレイへの意味のある影響
- 物語的雰囲気の演出強化

### 社会動態管理
- NPCの態度と気分の自然な変化
- プレイヤー行動への社会的反応
- 関係性の進展と複雑化

### 情報流通管理
- 噂と情報の自然な拡散
- プレイヤー行動の社会的影響
- 新しい情報入手機会の創出

## 🎭 動作原則

### 自然性の重視
- 現実的で説得力のある変化
- 急激すぎない段階的変化
- 因果関係の明確性

### ゲームプレイとの統合
- プレイヤー行動への適切な反応
- 戦略的選択への影響
- 新しい機会の創出

### 物語的価値
- 世界観の深化と拡張
- 緊張感と期待感の演出
- 没入感の向上

## 🌤️ 天候管理

### 変化パターン
- 季節的適切性の確保
- 地域的特徴の反映
- ゲームプレイへの配慮

### 影響システム
- 視界・移動への物理的影響
- 雰囲気・士気への心理的影響
- 特別な機会の創出

## 👥 社会管理

### NPC態度システム
- プレイヤー行動への反応
- 環境要因による変化
- 関係性の進展

### 噂システム
- 情報の自然な拡散
- 信憑性の時間変化
- 新しい話題の創出

## ⚡ 変化の演出

### 段階的変化
- 予兆から結果への流れ
- プレイヤーの認識と理解
- 適応のための時間

### 意味のある影響
- 単なる装飾を超えた実用性
- 戦略的考慮の対象
- 物語的価値の付加

## 💫 期待される効果
プレイヤーが「世界が本当に生きている」「自分の行動が世界に影響を与えている」と実感できる、動的で魅力的な環境を提供してください。
  `,
  model: google("gemini-2.0-flash-lite", {
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      }
    ]
  }),
  tools: environmentAgentTools,
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:./mastra-trpg.db"
    })
  })
});

/**
 * 環境管理エージェントの実行
 */
export async function executeEnvironmentManagement(input: {
  currentEnvironment: {
    weather: { condition: string; intensity: number; duration: number };
    timeOfDay: string;
    atmosphere: { tension: number; mystery: number; comfort: number };
  };
  npcs: Array<{
    npcId: string;
    currentAttitude: 'friendly' | 'neutral' | 'cautious' | 'hostile';
    currentMood: 'happy' | 'normal' | 'worried' | 'angry' | 'excited';
    relationshipLevel: number;
  }>;
  recentEvents: Array<{
    eventType: string;
    impact: number;
    involvedNPCs: string[];
  }>;
  recentPlayerActions: Array<{
    action: string;
    location: string;
    visibility: number;
    impact: number;
  }>;
  existingRumors: Array<{
    rumorId: string;
    content: string;
    credibility: number;
    spreadLevel: number;
    source: string;
    ageInDays: number;
  }>;
  seasonalContext: {
    season: 'spring' | 'summer' | 'autumn' | 'winter';
    climate: 'temperate' | 'tropical' | 'arctic' | 'desert' | 'mountain';
  };
}): Promise<{
  weatherUpdate: any;
  npcChanges: any;
  rumorUpdates: any;
  environmentalNarrative: string;
}> {
  try {
    logger.info(`🌍 Executing environment management`);
    
    // 天候変化管理（簡略版ロジック）
    const currentWeather = input.currentEnvironment.weather;
    const seasonalContext = input.seasonalContext;
    
    // 天候変化の基本ロジック
    const weatherTransitions: Record<string, string[]> = {
      sunny: ["cloudy", "sunny", "cloudy"],
      cloudy: ["rainy", "sunny", "cloudy", "foggy"],
      rainy: ["cloudy", "stormy", "foggy"],
      stormy: ["rainy", "cloudy"],
      foggy: ["cloudy", "sunny"],
      snowy: ["cloudy", "snowy"]
    };
    
    let possibleTransitions = weatherTransitions[currentWeather.condition] || ["cloudy"];
    if (seasonalContext.season === "winter" && seasonalContext.climate !== "tropical") {
      possibleTransitions.push("snowy");
    }
    
    const newCondition = possibleTransitions[Math.floor(Math.random() * possibleTransitions.length)] as any;
    
    const weatherUpdate = {
      weatherChange: {
        newCondition,
        transitionReason: "自然な時間経過による変化",
        changeIntensity: Math.floor(Math.random() * 30) + 20,
        estimatedDuration: Math.floor(Math.random() * 60) + 30
      },
      gameplayEffects: {
        visibilityModifier: newCondition === "foggy" ? -40 : newCondition === "sunny" ? 10 : 0,
        movementModifier: newCondition === "stormy" ? -25 : newCondition === "sunny" ? 5 : 0,
        moodModifier: newCondition === "sunny" ? 20 : newCondition === "rainy" ? -10 : 0,
        specialOpportunities: newCondition === "rainy" ? ["雨水を利用した隠し通路の発見"] : []
      },
      narrativeDescription: newCondition === "sunny" ? "雲間から陽光が差し込み、世界が明るく輝いて見えます" : "天候が変化し、環境に新たな印象が生まれます"
    };
    
    // NPC態度変化管理（簡略版ロジック）
    const npcs = input.npcs;
    const recentEvents = input.recentEvents;
    const attitudeChanges: any[] = [];
    let overallMoodShift = 0;
    const keyRelationshipChanges: string[] = [];
    const newInteractionOpportunities: string[] = [];
    
    for (const npc of npcs) {
      let attitudeChange = 0;
      let moodChange = 0;
      
      // 最近の出来事による影響
      for (const event of recentEvents) {
        if (event.involvedNPCs.includes(npc.npcId)) {
          attitudeChange += event.impact * 0.02;
          moodChange += event.impact * 0.03;
        }
      }
      
      // 天候による影響
      if (weatherUpdate.weatherChange.newCondition === "stormy") {
        moodChange -= 10;
      } else if (weatherUpdate.weatherChange.newCondition === "sunny") {
        moodChange += 5;
      }
      
      // 変化があった場合のみ記録
      if (Math.abs(attitudeChange) > 5 || Math.abs(moodChange) > 5) {
        attitudeChanges.push({
          npcId: npc.npcId,
          oldAttitude: npc.currentAttitude,
          newAttitude: npc.currentAttitude, // 簡略化のため同じ
          oldMood: npc.currentMood,
          newMood: npc.currentMood, // 簡略化のため同じ
          changeReason: "環境変化による影響",
          relationshipImpact: attitudeChange
        });
        
        overallMoodShift += moodChange;
      }
    }
    
    const npcChanges = {
      attitudeChanges,
      socialDynamics: {
        overallMoodShift,
        keyRelationshipChanges,
        newInteractionOpportunities
      },
      narrativeImpact: overallMoodShift > 10 ? "人々の雰囲気が明らかに良くなっています" : "社会的環境に微細な変化が見られます"
    };
    
    // 噂拡散管理（簡略版ロジック）
    const existingRumors = input.existingRumors;
    const recentPlayerActions = input.recentPlayerActions;
    
    const rumorUpdates = {
      rumorUpdates: existingRumors.map(rumor => ({
        rumorId: rumor.rumorId,
        credibilityChange: rumor.ageInDays > 7 ? -5 : 0,
        spreadChange: rumor.ageInDays > 3 ? 5 : 0,
        newVariations: []
      })),
      newRumors: recentPlayerActions.filter(action => action.visibility > 50).map(action => ({
        rumorId: `rumor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: `${action.location}で謎の人物が${action.action}をしていたという話`,
        source: "目撃者",
        initialCredibility: Math.min(action.visibility + 50, 100),
        category: "player_action" as const
      })),
      informationOpportunities: [
        {
          opportunity: "酒場での情報収集",
          location: "tavern",
          difficulty: 20,
          value: 70
        }
      ],
      socialClimateChange: "情報の流れは比較的静かで、日常的な状況が続いています"
    };
    
    // 環境管理エージェントによる総合評価
    const response = await environmentAgent.generate([
      {
        role: "user",
        content: `
環境変化分析:

天候変化:
- ${input.currentEnvironment.weather.condition} → ${weatherUpdate.weatherChange.newCondition}
- 理由: ${weatherUpdate.weatherChange.transitionReason}
- ゲームプレイ影響: 視界${weatherUpdate.gameplayEffects.visibilityModifier}, 移動${weatherUpdate.gameplayEffects.movementModifier}, 雰囲気${weatherUpdate.gameplayEffects.moodModifier}

NPC変化:
- 態度変化: ${npcChanges.attitudeChanges.length}件
- 全体的雰囲気変化: ${npcChanges.socialDynamics.overallMoodShift}
- ${npcChanges.narrativeImpact}

噂・情報:
- 既存噂更新: ${rumorUpdates.rumorUpdates.length}件
- 新しい噂: ${rumorUpdates.newRumors.length}件
- 情報機会: ${rumorUpdates.informationOpportunities.length}件
- ${rumorUpdates.socialClimateChange}

これらの環境変化を統合して、プレイヤーが体験する「生きた世界」の物語的描写を提供してください。
        `
      }
    ]);
    
    logger.info(`✅ Environment management execution completed`);
    
    return {
      weatherUpdate,
      npcChanges,
      rumorUpdates,
      environmentalNarrative: response.text
    };
    
  } catch (error) {
    logger.error('❌ Failed to execute environment management:', error);
    throw error;
  }
}

/**
 * 環境管理エージェント健康状態チェック
 */
export async function checkEnvironmentAgentHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: string;
}> {
  try {
    const testResponse = await environmentAgent.generate([
      {
        role: "user", 
        content: "システムテスト: 正常動作確認のため、簡潔に「システム正常」と応答してください。"
      }
    ]);
    
    if (testResponse.text && testResponse.text.length > 0) {
      return {
        status: 'healthy',
        details: 'Environment Agent responding normally'
      };
    } else {
      return {
        status: 'degraded',
        details: 'Environment Agent responding but with empty response'
      };
    }
    
  } catch (error) {
    logger.error('Environment Agent health check failed:', error);
    return {
      status: 'unhealthy',
      details: `Environment Agent error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}