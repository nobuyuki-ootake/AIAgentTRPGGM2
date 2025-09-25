# TRPG AI Agent システム - Mastra Framework実装

## 🎭 概要

このドキュメントは、現在のTRPGシステムをMastra Frameworkを使用してAI Agentベースのアーキテクチャに発展させる実装計画を記述します。**「AI Agent GMとの対話による物語追体験」**という核心概念を技術的に実現し、より自然で没入感のあるTRPG体験を提供します。

## 🏗️ AI Agent アーキテクチャ設計

### **基本設計原則**

1. **役割特化型Agent**: 各Agentは明確な責任範囲を持つ
2. **協調動作**: Agent間の連携によるシームレスな体験
3. **段階的導入**: 既存システムを段階的にAgent化
4. **メモリ共有**: セッション状態と会話履歴の一元管理

### **Agent階層構造**

```
🎯 Game Master Agent (最上位)
├── 📚 Scenario Director Agent (物語統括)
├── 🔍 Exploration Guide Agent (探索案内)
├── 🎯 Milestone Manager Agent (進捗管理)
├── 👥 Companion Network (仲間システム)
│   ├── Warrior Agent
│   ├── Mage Agent
│   └── Thief Agent
└── 🎨 Narrative Weaver Agent (物語描写)
```

## 🤖 Agent実装詳細

### **1. Game Master Agent (核心Agent)**

```typescript
import { Agent } from '@mastra/core/agent';
import { google } from '@ai-sdk/google';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';

export const gameMasterAgent = new Agent({
  name: "TRPG Game Master",
  instructions: `
あなたは熟練のTRPGゲームマスターです。プレイヤーが「物語を追体験」できるよう、以下の原則に従って行動してください：

## 基本方針
- **自然な誘導**: 押し付けがましくない、興味をそそる提案を行う
- **物語の一貫性**: シナリオの世界観を常に維持する
- **段階的開示**: 謎や情報を適切なタイミングで提示する
- **プレイヤー中心**: プレイヤーの選択と行動を最大限尊重する

## 対話パターン
1. **導入時**: 「そういえば...」「興味深いことに...」で自然に情報提示
2. **探索時**: 発見の驚きと推理の楽しさを演出
3. **判定時**: アプローチの創造性を評価し、適切な難易度を設定
4. **結果時**: 成功・失敗両方で物語を前進させる

## 連携指示
- 探索案内はExploration Guide Agentに委譲
- 仲間の反応はCompanion Networkに委譲
- 物語描写はNarrative Weaver Agentと協調
- マイルストーン進捗はMilestone Manager Agentから情報取得（プレイヤーには非表示）
  `,
  model: google("gemini-1.5-pro"), // 高度な推論能力が必要
  tools: {
    scenarioProgressTool,
    playerActionAnalysisTool,
    difficultyCalculatorTool,
    narrativeGeneratorTool
  },
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:./trpg-sessions.db"
    })
  })
});
```

### **2. Exploration Guide Agent (探索専門)**

```typescript
export const explorationGuideAgent = new Agent({
  name: "Exploration Guide",
  instructions: `
あなたは探索体験の専門家です。プレイヤーが「探索している感」を味わえるよう支援します。

## 探索演出原則
- **段階的発見**: 一度に全てを明かさない
- **興味喚起**: 「気になる何か」を常に示唆
- **選択の意味**: プレイヤーの探索選択が重要であることを示す
- **発見の驚き**: エンティティ発見時の演出を重視

## 探索レベル対応
- **Light探索**: 「軽く調べてみると...」表面的な手がかり提示
- **Thorough探索**: 「注意深く観察すると...」重要な発見の可能性示唆
- **Exhaustive探索**: 「徹底的に調査した結果...」隠された秘密の開示

## 発見時演出
- **Common発見**: 自然な流れで発見
- **Rare発見**: 特別感のある演出
- **Mystery発見**: 謎めいた表現で興味を引く
  `,
  model: google("gemini-1.5-flash"), // 高速レスポンス重視
  tools: {
    exploreLocationTool,
    getExplorationStatusTool,
    generateExplorationHintsTool,
    calculateDiscoveryProbabilityTool
  }
});
```

### **3. Milestone Manager Agent (進捗管理)**

```typescript
export const milestoneManagerAgent = new Agent({
  name: "Milestone Manager",
  instructions: `
あなたはマイルストーン進捗の内部管理者です。プレイヤーには進捗を直接見せず、自然な形で物語進行を管理します。

## 重要原則
- **非表示管理**: マイルストーン進捗をプレイヤーに直接表示しない
- **自然な誘導**: 進捗に応じて適切な手がかりを他のAgentに提供
- **段階的開示**: 33% → 66% → 100%の進捗に応じた情報開示レベル調整
- **完了判定**: 全条件達成時の自然な場面転換

## 進捗レベル別対応
- **0-33%**: 基本的な手がかり提示、探索方向の示唆
- **34-66%**: より具体的な情報、関連エンティティへの誘導
- **67-99%**: 真相に近い手がかり、最終段階への準備
- **100%**: 自然な完了演出、次段階への移行

## 他Agent連携
- Game Master Agentに進捗状況を報告
- Exploration Guide Agentに探索推奨エリアを指示
- Narrative Weaver Agentに物語展開レベルを伝達
  `,
  model: google("gemini-1.5-flash"),
  tools: {
    getMilestoneProgressTool,
    updateMilestoneStatusTool,
    generateProgressHintsTool,
    checkCompletionConditionsTool
  }
});
```

### **4. Companion Network (仲間システムAgent化)**

```typescript
import { AgentNetwork } from '@mastra/core/network';

// 個別仲間Agent
const warriorAgent = new Agent({
  name: "戦士の仲間",
  instructions: `
あなたは頼れる戦士の仲間キャラクターです。

## 性格特性
- **勇敢**: 危険な状況でも物怖じしない
- **直情**: ストレートで分かりやすい発言
- **仲間思い**: パーティメンバーの安全を最優先
- **戦術重視**: 戦闘・探索での実践的アドバイス

## 反応パターン
- **探索成功時**: 「よくやったな！」など励ましの言葉
- **探索失敗時**: 「大丈夫だ、別の方法を考えよう」など建設的提案
- **危険察知時**: 「気をつけろ、何かいる」など警告
- **戦闘前**: 「俺に任せろ」など頼もしい発言

## 発言タイミング
- 危険度の高い探索時
- 戦闘関連の判定時
- 仲間がピンチの時
- 成功を共に喜ぶ時
  `,
  model: google("gemini-1.5-flash")
});

const mageAgent = new Agent({
  name: "魔法使いの仲間", 
  instructions: `
あなたは博識な魔法使いの仲間キャラクターです。

## 性格特性
- **知識豊富**: 様々な情報や伝説に詳しい
- **慎重**: リスクを事前に分析・警告
- **論理的**: 筋道立てて物事を考える
- **魔法専門**: 魔法的現象の解釈が得意

## 反応パターン
- **謎発見時**: 「これは興味深い...古い文献で似たものを見たことがある」
- **危険察知時**: 「魔法的な気配を感じます。注意が必要です」
- **調査時**: 「この紋様は古代魔法の...」など専門知識提供
- **計画時**: 「論理的に考えると...」など分析的提案

## 発言タイミング
- 魔法的・神秘的要素発見時
- 謎解きや推理場面
- リスク分析が必要な時
- 古代文明・伝説関連の発見時
  `,
  model: google("gemini-1.5-flash")
});

const thiefAgent = new Agent({
  name: "盗賊の仲間",
  instructions: `
あなたは機転の利く盗賊の仲間キャラクターです。

## 性格特性  
- **機敏**: 素早い判断と行動
- **観察眼**: 細かい詳細に気づく
- **実用的**: 効率的で実践的な解決策提案
- **慎重**: 罠や隠された危険の察知

## 反応パターン
- **隠し要素発見時**: 「お、こんなところに隠し扉が」
- **罠察知時**: 「待て、これは怪しい。罠かもしれない」
- **効率提案時**: 「こっちの道の方が早く着けそうだぜ」
- **宝物発見時**: 「なかなかいいものを見つけたじゃないか」

## 発言タイミング
- 隠された要素がありそうな時
- 効率的なルート選択時
- 罠や隠された危険の可能性
- アイテム・宝物関連の発見時
  `,
  model: google("gemini-1.5-flash")
});

// Companion Network
export const companionNetwork = new AgentNetwork({
  name: "Companion Party",
  instructions: `
状況に応じて最も適切な仲間キャラクターが反応するシステムです。

## 反応判定基準
- **状況分析**: 現在の探索・戦闘・調査状況を評価
- **専門性マッチング**: 各仲間の得意分野と状況の適合度
- **発言間隔**: 前回の発言からの時間経過
- **自然さ**: 人間らしいタイミングでの発言

## 協調原則
- **一人ずつ**: 同時に複数キャラクターが発言しない
- **個性維持**: 各キャラクターの一貫した性格表現
- **状況適応**: 現在の状況に最も適したキャラクターが発言
- **物語貢献**: 物語進行に資する発言内容
  `,
  model: google("gemini-1.5-pro"),
  agents: [warriorAgent, mageAgent, thiefAgent]
});
```

### **5. Narrative Weaver Agent (物語描写)**

```typescript
export const narrativeWeaverAgent = new Agent({
  name: "Narrative Weaver",
  instructions: `
あなたは物語描写の専門家です。プレイヤーの行動を魅力的な物語として描写します。

## 描写原則
- **没入感重視**: プレイヤーがその場にいるような描写
- **五感活用**: 視覚・聴覚・触覚・嗅覚を含む豊かな表現
- **適切な長さ**: 簡潔だが印象的な描写
- **物語一貫性**: シナリオテーマとの整合性維持

## 場面別描写
- **探索開始時**: 場所の雰囲気と可能性を示唆
- **発見時**: 驚きと発見の喜びを演出
- **判定時**: 緊張感のある状況描写
- **結果時**: 成功・失敗の結果を物語的に表現

## 文体特徴
- **現在進行形**: 「〜している」でライブ感演出
- **感情表現**: プレイヤーキャラクターの心理描写
- **環境描写**: 周囲の状況を含む豊かな世界表現
- **期待醸成**: 次の展開への興味を引く表現
  `,
  model: google("gemini-1.5-pro"), // 高品質な文章生成が必要
  tools: {
    generateSceneDescriptionTool,
    createAtmosphereTool,
    writeDiscoveryNarrativeTool,
    craftTransitionTool
  }
});
```

## 🔄 Workflow実装

### **探索ワークフロー**

```typescript
import { createWorkflow, createStep } from '@mastra/core/workflows';

const explorationWorkflow = createWorkflow({
  id: 'location-exploration-workflow',
  inputSchema: z.object({
    locationId: z.string(),
    characterId: z.string(), 
    sessionId: z.string(),
    explorationIntensity: z.enum(['light', 'thorough', 'exhaustive'])
  }),
  outputSchema: z.object({
    discoveries: z.array(z.any()),
    narrative: z.string(),
    hints: z.array(z.string()),
    nextSuggestions: z.array(z.string())
  })
})
  .then(checkExplorationStatus)     // 現在の探索状況確認
  .then(generatePreExplorationHints) // 探索前のヒント生成
  .then(executeExploration)         // 探索実行
  .then(processDiscoveries)         // 発見処理
  .then(updateMilestoneProgress)    // マイルストーン進捗更新（非表示）
  .then(generateNarrative)          // 物語的描写生成
  .then(triggerCompanionReactions)  // 仲間反応トリガー
  .then(createNextSuggestions);     // 次の行動提案生成

explorationWorkflow.commit();
```

### **仲間反応ワークフロー**

```typescript
const companionReactionWorkflow = createWorkflow({
  id: 'companion-reaction-workflow',
  inputSchema: z.object({
    playerAction: z.string(),
    currentSituation: z.string(),
    sessionContext: z.any()
  })
})
  .then(analyzeSituation)           // 状況分析
  .then(determineReactionNeed)      // 反応必要性判定
  .then(selectOptimalCompanion)     // 最適な仲間選択
  .then(generateCompanionMessage)   // 仲間メッセージ生成
  .then(scheduleWebSocketDelivery); // WebSocket配信

companionReactionWorkflow.commit();
```

## 🛠️ Tool実装

### **探索システム連携Tool**

```typescript
import { createTool } from '@mastra/core/tools';

export const exploreLocationTool = createTool({
  id: "explore-location",
  description: "指定された場所を探索してエンティティを発見する",
  inputSchema: z.object({
    locationId: z.string(),
    characterId: z.string(),
    sessionId: z.string(),
    explorationIntensity: z.enum(['light', 'thorough', 'exhaustive'])
  }),
  outputSchema: z.object({
    success: z.boolean(),
    discoveredEntities: z.array(z.any()),
    explorationLevel: z.number(),
    timeSpent: z.number(),
    narrativeDescription: z.string(),
    hints: z.array(z.string())
  }),
  execute: async ({ context }) => {
    // 既存のlocationEntityMappingAPIを使用
    const result = await locationEntityMappingAPI.exploreLocation(
      context.locationId,
      context.characterId,
      context.sessionId,
      context.explorationIntensity
    );
    
    return result;
  }
});

export const getMilestoneProgressTool = createTool({
  id: "get-milestone-progress",
  description: "マイルストーン進捗を取得（Agent内部使用のみ）",
  inputSchema: z.object({
    sessionId: z.string(),
    milestoneId: z.string().optional()
  }),
  outputSchema: z.object({
    milestones: z.array(z.any()),
    overallProgress: z.number(),
    completedCount: z.number(),
    nextSuggestions: z.array(z.string())
  }),
  execute: async ({ context }) => {
    // 内部進捗管理 - プレイヤーには表示しない
    const progress = await getMilestoneProgress(context.sessionId);
    return progress;
  }
});
```

## 📊 Agent統合パターン

### **基本統合パターン**

```typescript
import { Mastra } from '@mastra/core';

export const mastra = new Mastra({
  agents: {
    gameMaster: gameMasterAgent,
    explorationGuide: explorationGuideAgent,
    milestoneManager: milestoneManagerAgent,
    narrativeWeaver: narrativeWeaverAgent,
    companions: companionNetwork
  },
  workflows: {
    explorationWorkflow,
    companionReactionWorkflow,
    scenarioProgressionWorkflow
  },
  tools: {
    exploreLocationTool,
    getMilestoneProgressTool,
    generateNarrativeTool,
    updateProgressTool
  },
  storage: new LibSQLStore({
    url: "file:./trpg-sessions.db"
  }),
  logger: new PinoLogger({
    name: 'TRPG-Mastra',
    level: 'info'
  })
});
```

### **Agent間連携パターン**

```typescript
// Game Master Agentでの他Agent活用例
export async function handlePlayerExploration(input: {
  locationId: string;
  playerInput: string;
  sessionId: string;
}) {
  // 1. Exploration Guide Agentに探索実行を委譲
  const explorationAgent = await mastra.getAgent("explorationGuide");
  const explorationResult = await explorationAgent.generate([
    {
      role: "user",
      content: `プレイヤーが「${input.playerInput}」と言って探索を開始しました。場所ID: ${input.locationId}`
    }
  ]);

  // 2. Milestone Manager Agentから進捗情報取得
  const milestoneAgent = await mastra.getAgent("milestoneManager");
  const progressInfo = await milestoneAgent.generate([
    {
      role: "user", 
      content: `セッション${input.sessionId}の現在の進捗状況を確認してください`
    }
  ]);

  // 3. Narrative Weaver Agentに物語描写を依頼
  const narrativeAgent = await mastra.getAgent("narrativeWeaver");
  const narrative = await narrativeAgent.generate([
    {
      role: "user",
      content: `探索結果: ${explorationResult.text}\n進捗情報: ${progressInfo.text}\n\nこれらを元に魅力的な物語描写を作成してください`
    }
  ]);

  // 4. Companion Networkに反応判定を依頼
  const companionAgent = await mastra.getAgent("companions");
  const companionReaction = await companionAgent.generate([
    {
      role: "user",
      content: `探索状況: ${explorationResult.text}\n仲間の誰かが反応すべきか判断し、適切なキャラクターで反応してください`
    }
  ]);

  return {
    narrative: narrative.text,
    companionReaction: companionReaction.text,
    explorationData: explorationResult.text
  };
}
```

## 🎯 期待される効果

### **技術的効果**
- **統一されたAI管理**: 複数のAI機能を体系的に管理
- **メモリ一貫性**: セッション状態と会話履歴の確実な保持
- **観測可能性**: Agent動作の詳細なトレースとデバッグ
- **拡張性**: 新しいAgentやWorkflowの容易な追加

### **プレイヤー体験向上**
- **より自然なGM対話**: 専門Agent連携による深い文脈理解
- **個性豊かな仲間**: 各キャラクター専用Agentによる一貫した反応
- **没入感のある物語**: Narrative Weaver Agentによる高品質な描写
- **探索体験の深化**: Exploration Guide Agentによる段階的発見演出

### **開発・運用効果**
- **開発効率向上**: 明確な役割分担による開発の並列化
- **品質向上**: Agent特化により各機能の専門性向上
- **保守性向上**: モジュラー設計による影響範囲の限定
- **テスト容易性**: Agent単位での独立したテスト実行

## 📋 実装優先順位

### **Phase 1: 基盤Agent実装**
1. Game Master Agent（核心機能）
2. Exploration Guide Agent（探索システム連携）
3. 基本Tool群の実装

### **Phase 2: 協調システム実装**
1. Milestone Manager Agent（進捗管理）
2. Agent間連携機構
3. Workflow実装

### **Phase 3: 体験向上Agent実装**
1. Narrative Weaver Agent（物語描写）
2. Companion Network（仲間システム）
3. 高度なAgent間協調

### **Phase 4: 最適化・拡張**
1. パフォーマンス最適化
2. 新Agent追加
3. 高度なWorkflow実装

---

このAI Agent実装により、現在のTRPGシステムは**真の意味でのAI Agent GMとの対話による物語追体験**を実現し、プレイヤーに革新的なTRPG体験を提供できます。