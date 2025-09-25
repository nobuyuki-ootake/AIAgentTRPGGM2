# TRPG AI システム Mastra移行計画

## 🎯 移行目標

現在の個別AI機能ベースのシステムを、**Mastra Framework**を使用した統合AI Agentアーキテクチャに段階的に移行し、「AI Agent GMとの対話による物語追体験」を実現する。

## 📊 現状分析

### **既存システム構成**

#### ✅ **優秀な基盤（移行活用）**
- **型定義システム**: `packages/types/src/index.ts` - AI Agent対応済み
- **データベース**: 探索システム、マイルストーン管理完備
- **探索システム**: locationEntityMappingService.ts - 完全実装済み
- **フロントエンドAPI**: 体系的なAPI設計

#### 🔄 **移行対象（段階的変更）**
- **AIサービス**: `apps/proxy-server/src/utils/aiService.ts`
- **システムプロンプト**: `apps/proxy-server/src/utils/systemPrompts.ts`  
- **フロントエンドAI API**: `apps/frontend/src/api/aiAgent.ts`
- **WebSocket仲間システム**: `apps/proxy-server/src/services/socketService.ts`

#### ⚠️ **課題点（要対策）**
- **個別実装の散在**: AI機能が複数ファイルに分散
- **文脈管理の限界**: セッション状態の一貫性課題
- **拡張性制約**: 新AI機能追加時の影響範囲拡大

## 🗺️ 段階的移行戦略

### **移行原則**

1. **ゼロダウンタイム**: 既存機能を停止しない
2. **段階的切り替え**: 機能別に順次移行
3. **完全後方互換**: 既存APIの維持
4. **品質保証**: 各段階で徹底的なテスト
5. **即座ロールバック**: 問題発生時の迅速復旧

### **移行アーキテクチャ**

```
Phase 1: Mastra基盤準備
└── 既存システム（現行稼働）
    └── Mastraインフラ（並行構築）

Phase 2: 核心Agent実装
└── 既存システム（メイン）
    └── Game Master Agent（限定機能）

Phase 3: 機能別Agent移行
└── ハイブリッド運用
    ├── 既存システム（一部機能）
    └── Mastra Agent（探索・GM対話）

Phase 4: 完全移行
└── Mastra Agent System（メイン）
    └── 既存システム（バックアップ）
```

## 📋 Phase別実装計画

---

## 🚀 Phase 1: Mastra基盤準備（2週間）

### **目標**: 既存システムに影響せずMastra環境構築

#### **1.1 環境セットアップ**

```bash
# 依存関係追加
cd apps/proxy-server
npm install @mastra/core@latest @ai-sdk/google @mastra/memory @mastra/libsql

# 環境変数設定
echo "GOOGLE_GENERATIVE_AI_API_KEY=your-api-key" >> .env
```

#### **1.2 基盤インフラ実装**

```typescript
// apps/proxy-server/src/mastra/index.ts （新規作成）
import { Mastra } from '@mastra/core';
import { LibSQLStore } from '@mastra/libsql';

export const mastra = new Mastra({
  storage: new LibSQLStore({
    url: "file:./mastra-trpg.db" // 既存DBと分離
  }),
  logger: new PinoLogger({
    name: 'TRPG-Mastra',
    level: 'debug' // 初期は詳細ログ
  })
});

// 初期化関数
export async function initializeMastra() {
  console.log('🤖 Mastra TRPG System initializing...');
  // 初期化処理
  console.log('✅ Mastra TRPG System ready');
}
```

#### **1.3 並行稼働確認**

```typescript
// apps/proxy-server/src/index.ts への追加
import { initializeMastra } from './mastra';

// 既存の初期化処理の後に追加
initializeMastra().catch(console.error);
```

**Phase 1 完了条件**:
- [ ] Mastra環境が既存システムと並行稼働
- [ ] 基本ログ出力確認
- [ ] データベース分離確認
- [ ] パフォーマンス影響なし確認

---

## 🎯 Phase 2: 核心Agent実装（3週間）

### **目標**: Game Master Agentの基本機能実装

#### **2.1 Game Master Agent実装**

```typescript
// apps/proxy-server/src/mastra/agents/gameMaster.ts （新規）
import { Agent } from '@mastra/core/agent';
import { google } from '@ai-sdk/google';

export const gameMasterAgent = new Agent({
  name: "TRPG Game Master",
  instructions: `/* AI agent機能.mdの詳細プロンプト */`,
  model: google("gemini-1.5-pro"),
  tools: {
    // 段階的にツールを追加
  }
});
```

#### **2.2 ハイブリッドエンドポイント作成**

```typescript
// apps/proxy-server/src/routes/mastraAgent.ts （新規）
import { Router } from 'express';
import { mastra } from '../mastra';

const router = Router();

// 新しいMastra Agent エンドポイント
router.post('/mastra/gm-chat', async (req, res) => {
  try {
    const agent = await mastra.getAgent('gameMaster');
    const result = await agent.generate([
      { role: 'user', content: req.body.message }
    ]);
    
    res.json({
      success: true,
      response: result.text,
      source: 'mastra-agent'
    });
  } catch (error) {
    // 既存システムにフォールバック
    console.warn('Mastra agent failed, falling back to legacy:', error);
    res.status(500).json({ 
      success: false,
      error: 'Agent temporarily unavailable',
      fallback: true
    });
  }
});

export { router as mastraAgentRouter };
```

#### **2.3 フロントエンド段階的統合**

```typescript
// apps/frontend/src/api/mastraAgent.ts （新規）
import { apiClient } from './client';

export const mastraAgentAPI = {
  async chatWithGM(message: string, sessionId: string) {
    try {
      // 新しいMastra Agent API試行
      const response = await apiClient.post('/mastra-agent/gm-chat', {
        message,
        sessionId
      });
      
      if (response.success) {
        return {
          response: response.response,
          source: 'mastra'
        };
      }
      throw new Error('Mastra agent failed');
      
    } catch (error) {
      console.warn('Mastra agent unavailable, using legacy API');
      // 既存APIにフォールバック
      const legacyResponse = await aiAgentAPI.sendMessage(message);
      return {
        response: legacyResponse.response,
        source: 'legacy'
      };
    }
  }
};
```

**Phase 2 完了条件**:
- [ ] Game Master Agent基本動作確認
- [ ] ハイブリッドエンドポイント稼働
- [ ] フォールバック機構動作確認
- [ ] レスポンス品質評価（既存同等以上）

---

## 🔍 Phase 3: 機能別Agent移行（4週間）

### **目標**: 探索・仲間システムのAgent化

#### **3.1 Exploration Guide Agent実装**

```typescript
// apps/proxy-server/src/mastra/agents/explorationGuide.ts
export const explorationGuideAgent = new Agent({
  name: "Exploration Guide",
  instructions: `/* 探索専門プロンプト */`,
  model: google("gemini-1.5-flash"),
  tools: {
    exploreLocationTool,
    getExplorationStatusTool
  }
});

// 既存探索システムとの統合
export const exploreLocationTool = createTool({
  id: "explore-location",
  description: "指定場所の探索実行",
  inputSchema: z.object({
    locationId: z.string(),
    characterId: z.string(),
    sessionId: z.string(),
    explorationIntensity: z.enum(['light', 'thorough', 'exhaustive'])
  }),
  execute: async ({ context }) => {
    // 既存のlocationEntityMappingService.tsを活用
    return await locationEntityMappingService.exploreLocation(
      context.locationId,
      context.characterId, 
      context.sessionId,
      context.explorationIntensity
    );
  }
});
```

#### **3.2 Companion Network Agent化**

```typescript
// apps/proxy-server/src/mastra/agents/companions.ts
import { AgentNetwork } from '@mastra/core/network';

export const companionNetwork = new AgentNetwork({
  name: "Companion Party",
  instructions: `/* 仲間協調プロンプト */`,
  model: google("gemini-1.5-pro"),
  agents: [warriorAgent, mageAgent, thiefAgent]
});

// 既存WebSocketシステムとの統合
export async function handleCompanionReaction(
  playerAction: string, 
  sessionContext: any
) {
  try {
    // Mastra Companion Network使用
    const reaction = await companionNetwork.generate([
      { role: 'user', content: `Player action: ${playerAction}` }
    ]);
    
    return {
      message: reaction.text,
      source: 'mastra'
    };
  } catch (error) {
    // 既存仲間システムにフォールバック
    return legacyCompanionSystem.generateReaction(playerAction, sessionContext);
  }
}
```

#### **3.3 統合API実装**

```typescript
// apps/proxy-server/src/routes/integratedAgent.ts
router.post('/integrated/explore-with-guidance', async (req, res) => {
  const { locationId, characterId, sessionId, playerMessage } = req.body;
  
  try {
    // 1. Exploration Guide Agentで探索ガイダンス
    const explorationAgent = await mastra.getAgent('explorationGuide');
    const guidance = await explorationAgent.generate([
      { role: 'user', content: `Player wants to explore: ${playerMessage}` }
    ]);
    
    // 2. 実際の探索実行（既存システム活用）
    const explorationResult = await locationEntityMappingService.exploreLocation(
      locationId, characterId, sessionId, 'thorough'
    );
    
    // 3. Game Master Agentで結果統合
    const gmAgent = await mastra.getAgent('gameMaster');
    const finalResponse = await gmAgent.generate([
      { 
        role: 'user', 
        content: `Guidance: ${guidance.text}\nExploration result: ${JSON.stringify(explorationResult)}\nProvide integrated response.`
      }
    ]);
    
    // 4. Companion反応判定
    const companionReaction = await handleCompanionReaction(
      `explored ${locationId}`, 
      { explorationResult }
    );
    
    res.json({
      success: true,
      guidance: guidance.text,
      explorationResult,
      gmResponse: finalResponse.text,
      companionReaction: companionReaction.message
    });
    
  } catch (error) {
    // 完全フォールバック
    const legacyResult = await legacyExplorationSystem.explore(req.body);
    res.json({ ...legacyResult, source: 'legacy' });
  }
});
```

**Phase 3 完了条件**:
- [ ] 探索システムAgent化完了
- [ ] 仲間システムAgent化完了
- [ ] 既存システムとの完全互換性
- [ ] パフォーマンス向上確認
- [ ] エラー率既存以下

---

## 🎨 Phase 4: 完全移行・最適化（3週間）

### **目標**: 完全Agent化と最適化

#### **4.1 Milestone Manager Agent実装**

```typescript
export const milestoneManagerAgent = new Agent({
  name: "Milestone Manager",
  instructions: `/* 進捗管理プロンプト */`,
  model: google("gemini-1.5-flash"),
  tools: {
    getMilestoneProgressTool,
    updateMilestoneStatusTool
  }
});
```

#### **4.2 Narrative Weaver Agent実装**

```typescript
export const narrativeWeaverAgent = new Agent({
  name: "Narrative Weaver", 
  instructions: `/* 物語描写プロンプト */`,
  model: google("gemini-1.5-pro"),
  tools: {
    generateSceneDescriptionTool,
    createAtmosphereTool
  }
});
```

#### **4.3 統合ワークフロー実装**

```typescript
const trpgSessionWorkflow = createWorkflow({
  id: 'complete-trpg-session',
  inputSchema: z.object({
    playerAction: z.string(),
    sessionId: z.string(),
    currentContext: z.any()
  })
})
  .then(analyzePlayerIntent)      // GM Agent
  .then(executeExploration)       // Exploration Agent  
  .then(updateProgress)           // Milestone Agent
  .then(generateNarrative)        // Narrative Agent
  .then(triggerCompanions)        // Companion Network
  .then(prepareResponse);         // 統合レスポンス

trpgSessionWorkflow.commit();
```

#### **4.4 レガシーシステム段階的削除**

```typescript
// 段階的な機能移行
const MIGRATION_FLAGS = {
  GM_AGENT: true,           // Game Master Agent使用
  EXPLORATION_AGENT: true,  // Exploration Guide Agent使用  
  COMPANION_NETWORK: true,  // Companion Network使用
  NARRATIVE_AGENT: true,    // Narrative Weaver Agent使用
  MILESTONE_AGENT: true,    // Milestone Manager Agent使用
  LEGACY_FALLBACK: false    // レガシーシステムフォールバック無効
};

// 機能フラグによる段階的切り替え
export async function getAIResponse(input: AIRequestInput) {
  if (MIGRATION_FLAGS.GM_AGENT) {
    return await mastraAIService.handleRequest(input);
  } else {
    return await legacyAIService.handleRequest(input);
  }
}
```

**Phase 4 完了条件**:
- [ ] 全Agent機能稼働
- [ ] レガシーシステム依存完全除去
- [ ] パフォーマンス目標達成
- [ ] 品質指標達成（エラー率<1%）

---

## 🔒 リスク管理・対策

### **技術的リスク**

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| **Mastra Agent応答遅延** | 高 | 中 | 既存システムフォールバック + タイムアウト設定 |
| **APIキー制限到達** | 高 | 低 | 複数プロバイダー対応 + 使用量監視 |
| **Agent間連携エラー** | 中 | 中 | 個別Agent独立動作保証 + エラー分離 |
| **メモリリーク** | 中 | 低 | 定期リスタート + 監視強化 |

### **運用リスク**

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| **既存機能破綻** | 高 | 低 | 段階的移行 + 徹底テスト |
| **ユーザー体験劣化** | 高 | 中 | A/Bテスト + フィードバック収集 |
| **データ不整合** | 中 | 低 | 既存DB活用 + 整合性チェック |
| **開発スケジュール遅延** | 中 | 中 | バッファ期間設定 + 優先度調整 |

### **対策実装**

#### **自動フォールバック機構**

```typescript
// apps/proxy-server/src/utils/agentFallback.ts
export class AgentFallbackManager {
  private static legacyServices = {
    aiService: legacyAIService,
    explorationService: legacyExplorationService,
    companionService: legacyCompanionService
  };
  
  static async withFallback<T>(
    mastraOperation: () => Promise<T>,
    legacyOperation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    try {
      const result = await Promise.race([
        mastraOperation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]);
      
      // 成功ログ
      logger.info(`✅ Mastra ${operationName} succeeded`);
      return result;
      
    } catch (error) {
      logger.warn(`⚠️ Mastra ${operationName} failed, using fallback:`, error);
      
      // レガシーシステムにフォールバック
      return await legacyOperation();
    }
  }
}
```

#### **品質監視システム**

```typescript
// apps/proxy-server/src/monitoring/agentMonitor.ts
export class AgentQualityMonitor {
  private static metrics = {
    responseTime: new Map<string, number[]>(),
    errorRate: new Map<string, number>(),
    userSatisfaction: new Map<string, number[]>()
  };
  
  static recordResponse(agentName: string, responseTime: number, success: boolean) {
    // レスポンス時間記録
    if (!this.metrics.responseTime.has(agentName)) {
      this.metrics.responseTime.set(agentName, []);
    }
    this.metrics.responseTime.get(agentName)!.push(responseTime);
    
    // エラー率更新
    const currentErrorRate = this.metrics.errorRate.get(agentName) || 0;
    const newErrorRate = success ? currentErrorRate * 0.99 : currentErrorRate * 1.01;
    this.metrics.errorRate.set(agentName, Math.min(newErrorRate, 1));
    
    // アラート判定
    if (newErrorRate > 0.05) { // 5%以上のエラー率
      this.alertHighErrorRate(agentName, newErrorRate);
    }
  }
  
  private static alertHighErrorRate(agentName: string, errorRate: number) {
    logger.error(`🚨 High error rate detected for ${agentName}: ${errorRate * 100}%`);
    // 必要に応じて自動フォールバック有効化
  }
}
```

## 📈 検証・テスト戦略

### **段階別テストプラン**

#### **Phase 1 テスト**
- [ ] Mastra環境初期化テスト
- [ ] 既存システム影響なしテスト
- [ ] 基本ログ出力テスト

#### **Phase 2 テスト**
- [ ] Game Master Agent応答品質テスト
- [ ] フォールバック機構テスト
- [ ] レスポンス時間テスト（目標: 5秒以内）

#### **Phase 3 テスト**
- [ ] 探索システム統合テスト
- [ ] 仲間システム統合テスト
- [ ] Agent間連携テスト
- [ ] エンドツーエンドテスト

#### **Phase 4 テスト**
- [ ] 完全統合テスト
- [ ] パフォーマンステスト
- [ ] 負荷テスト
- [ ] ユーザー受入テスト

### **自動テストスイート**

```typescript
// apps/proxy-server/tests/mastra/agentIntegration.test.ts
describe('Mastra Agent Integration', () => {
  test('Game Master Agent responds appropriately', async () => {
    const agent = await mastra.getAgent('gameMaster');
    const response = await agent.generate([
      { role: 'user', content: '古い城を探索したい' }
    ]);
    
    expect(response.text).toBeTruthy();
    expect(response.text.length).toBeGreaterThan(50);
    expect(response.text).toMatch(/城|探索|調査/);
  });
  
  test('Fallback works when Mastra fails', async () => {
    // Mastraを意図的に失敗させる
    jest.spyOn(mastra, 'getAgent').mockRejectedValue(new Error('Test failure'));
    
    const result = await AgentFallbackManager.withFallback(
      () => mastra.getAgent('gameMaster'),
      () => Promise.resolve(legacyAIService.generateResponse('test')),
      'test-operation'
    );
    
    expect(result).toBeTruthy();
  });
});
```

## 📅 実装スケジュール

| フェーズ | 期間 | 主要成果物 | 担当 |
|----------|------|------------|------|
| **Phase 1** | 2週間 | Mastra基盤構築 | バックエンド |
| **Phase 2** | 3週間 | Game Master Agent実装 | バックエンド + AI |
| **Phase 3** | 4週間 | 探索・仲間Agent化 | フルスタック |
| **Phase 4** | 3週間 | 完全移行・最適化 | フルスタック |
| **総期間** | **12週間** | **完全Agent化システム** | **全チーム** |

### **マイルストーン**

- **Week 2**: Mastra環境稼働
- **Week 5**: GM Agent基本動作  
- **Week 9**: 主要機能Agent化完了
- **Week 12**: 完全移行・リリース準備

## 🎯 成功指標

### **技術指標**
- **エラー率**: < 1%
- **レスポンス時間**: 平均 < 3秒
- **可用性**: > 99.5%
- **フォールバック率**: < 5%

### **体験指標**
- **物語理解度**: > 90%
- **没入感**: > 85%
- **AI応答品質**: > 88%
- **ユーザー満足度**: > 85%

### **運用指標**
- **開発効率**: 新機能開発時間 50%短縮
- **保守性**: バグ修正時間 60%短縮
- **拡張性**: 新Agent追加工数 < 1人日

---

この移行計画により、既存システムの安定性を保ちながら、革新的なAI Agent基盤への進化を実現し、真の意味での「AI Agent GMとの対話による物語追体験」システムを構築できます。