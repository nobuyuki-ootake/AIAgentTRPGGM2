# シナリオ管理システム実装計画

## 📋 概要

このドキュメントは、`シナリオ管理.md`で定義したTRPGシナリオ管理システムの実装計画をチェックリスト形式で管理します。

## 🎯 実装方針

**トップダウンアプローチ**により、以下の順序で実装を進めます：
1. マイルストーン概要生成
2. コアエンティティプール生成（マイルストーン必須）
3. 追加エンティティプール生成（報酬・体験向上系）
4. 場所生成・配置最適化
5. 詳細化・バランス調整

## 📊 現在の実装状況分析

### ✅ 完全実装済み (100%)
- [x] 基本型定義（AIMilestone, EntityPool, PoolEnemy, PoolNPC, PoolItem, PoolQuest）
- [x] 基本的なマイルストーン生成API routes
- [x] フロントエンドAPIクライアント
- [x] 基本的な場所管理システム
- [x] AIサービス統合基盤

### 🔶 部分実装済み (60-80%)
- [x] aiMilestoneGenerationService基本機能
- [x] エンティティプール生成（基本版）
- [x] データベーススキーマ（基本版）

### ❌ 未実装 (0-30%)
- [ ] 二層構造エンティティプール
- [ ] 複数エンティティ紐付けマイルストーン
- [ ] 場所ベースエンティティ配置システム
- [ ] トップダウン生成フロー
- [ ] 手探り体験演出システム
- [ ] 報酬分類システム（実用的/トロフィー/ミステリー）

---

## 🗂️ Phase 1: 型定義・データベース拡張

### 1.1 型定義拡張 📝

#### ✅ 必要な型定義追加
- [ ] **AIMilestone拡張** (`packages/types/src/index.ts`)
  - [ ] `targetEntityIds: string[]` (複数エンティティ対応)
  - [ ] `progressContributions: number[]` (各エンティティの進捗貢献度)
  - [ ] `hiddenFromPlayer: boolean` (プレイヤー非表示フラグ)
  - [ ] `categoryType: 'core' | 'bonus'` 削除（マイルストーンには不要）

- [ ] **EntityPoolCollection拡張**
  - [ ] `coreEntities: CoreEntityCollection` (マイルストーン必須)
  - [ ] `bonusEntities: BonusEntityCollection` (追加報酬系)

- [ ] **新しい型定義追加**
  ```typescript
  interface CoreEntityCollection {
    enemies: PoolEnemy[];
    events: InteractiveEvent[];
    npcs: PoolNPC[];
    items: PoolItem[];
    quests: PoolQuest[];
  }
  
  interface BonusEntityCollection {
    practicalRewards: PracticalRewardEntity[];
    trophyItems: TrophyEntity[];
    mysteryItems: MysteryEntity[];
  }
  
  interface LocationEntityMapping {
    id: string;
    sessionId: string;
    locationId: string;
    entityId: string;
    entityType: 'core' | 'bonus';
    entityCategory: 'enemy' | 'event' | 'npc' | 'item' | 'quest';
    timeConditions?: string[];
    prerequisiteEntities?: string[];
    isAvailable: boolean;
    discoveredAt?: string;
  }
  
  interface PracticalRewardEntity {
    id: string;
    name: string;
    type: 'healing' | 'equipment' | 'enhancement';
    rewards: {
      items: Array<{
        name: string;
        effect: string;
        quantity: number;
        rarity: ItemRarity;
      }>;
      experience: number;
    };
  }
  
  interface TrophyEntity {
    id: string;
    name: string;
    description: string;
    rewards: {
      items: Array<{
        name: string;
        effect: "なし";
        description: string;
        category: "trophy";
        rarity: ItemRarity;
      }>;
      information: string[];
      experience: number;
    };
  }
  
  interface MysteryEntity {
    id: string;
    name: string;
    description: string;
    rewards: {
      items: Array<{
        name: string;
        effect: "なし" | "不明";
        description: string;
        category: "mystery_item";
      }>;
      information: string[];
      experience: number;
    };
  }
  ```

### 1.2 データベーススキーマ拡張 🗄️

#### ✅ テーブル拡張
- [ ] **ai_milestones テーブル拡張**
  ```sql
  ALTER TABLE ai_milestones ADD COLUMN target_entity_ids TEXT NOT NULL DEFAULT '[]'; -- JSON配列
  ALTER TABLE ai_milestones ADD COLUMN progress_contributions TEXT NOT NULL DEFAULT '[]'; -- JSON配列 [33, 33, 34]
  ALTER TABLE ai_milestones ADD COLUMN hidden_from_player BOOLEAN NOT NULL DEFAULT true;
  ALTER TABLE ai_milestones DROP COLUMN target_id; -- 単一ID削除
  ```

- [ ] **entity_pools テーブル拡張**
  ```sql
  ALTER TABLE entity_pools ADD COLUMN core_entities TEXT NOT NULL DEFAULT '{}'; -- JSON: マイルストーン必須
  ALTER TABLE entity_pools ADD COLUMN bonus_entities TEXT NOT NULL DEFAULT '{}'; -- JSON: 追加報酬系
  -- 既存の entities カラムは後方互換性のため残す
  ```

- [ ] **新テーブル作成**
  ```sql
  CREATE TABLE location_entity_mappings (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'core' | 'bonus'
    entity_category TEXT NOT NULL, -- 'enemy' | 'event' | 'npc' | 'item' | 'quest'
    time_conditions TEXT, -- JSON配列
    prerequisite_entities TEXT, -- JSON配列
    is_available BOOLEAN DEFAULT TRUE,
    discovered_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );
  
  CREATE TABLE scenario_generation_log (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    phase TEXT NOT NULL, -- 'milestone_outline' | 'core_entities' | 'bonus_entities' | 'location_mapping'
    ai_provider TEXT NOT NULL,
    input_data TEXT NOT NULL, -- JSON
    output_data TEXT NOT NULL, -- JSON
    processing_time INTEGER NOT NULL, -- milliseconds
    tokens_used INTEGER,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );
  ```

---

## 🗂️ Phase 2: バックエンドサービス拡張

### 2.1 AIMilestoneGenerationService拡張 ⚙️

#### ✅ トップダウン生成フロー実装
- [ ] **generateMilestonesAndPools メソッド完全リファクタリング**
  ```typescript
  async generateMilestonesAndPools(request: MilestoneGenerationRequest): Promise<MilestoneGenerationResponse> {
    // Phase 1: 目標設計
    const milestoneOutlines = await this.generateMilestoneOutlines(request);
    const milestoneRelations = await this.defineMilestoneRelations(milestoneOutlines, request);
    
    // Phase 2: コンテンツ生成
    const coreEntityRequirements = await this.defineCoreEntityRequirements(milestoneRelations);
    const coreEntities = await this.generateCoreEntities(coreEntityRequirements, request);
    const bonusEntities = await this.generateBonusEntities(request, coreEntities);
    const locationMappings = await this.generateLocationMappings(coreEntities, bonusEntities, request);
    
    // Phase 3: 最終調整
    const detailedMilestones = await this.detailizeMilestones(milestoneOutlines, coreEntities);
    const balancedSystem = await this.balanceSystem(detailedMilestones, coreEntities, bonusEntities);
    
    return await this.commitToDatabase(balancedSystem);
  }
  ```

- [ ] **新メソッド実装**
  - [ ] `generateMilestoneOutlines()` - マイルストーン概要生成
  - [ ] `defineMilestoneRelations()` - マイルストーン関係性設定
  - [ ] `defineCoreEntityRequirements()` - 必須エンティティ要件決定
  - [ ] `generateCoreEntities()` - コアエンティティ生成
  - [ ] `generateBonusEntities()` - 追加エンティティ生成
  - [ ] `generateLocationMappings()` - 場所配置最適化
  - [ ] `detailizeMilestones()` - マイルストーン詳細化
  - [ ] `balanceSystem()` - バランス調整
  - [ ] `commitToDatabase()` - 一括データベースコミット

- [ ] **エンティティ分類生成機能**
  - [ ] `generatePracticalRewards()` - 実用的報酬エンティティ
  - [ ] `generateTrophyItems()` - トロフィー・収集系エンティティ
  - [ ] `generateMysteryItems()` - ミステリー系エンティティ

### 2.2 LocationEntityMappingService新規作成 📍

#### ✅ 場所ベースエンティティ管理
- [ ] **新サービス作成** (`apps/proxy-server/src/services/locationEntityMappingService.ts`)
  ```typescript
  class LocationEntityMappingService {
    async createMappings(sessionId: string, mappings: LocationEntityMapping[]): Promise<void>
    async getMappingsByLocation(locationId: string, sessionId: string): Promise<LocationEntityMapping[]>
    async getMappingsByEntity(entityId: string): Promise<LocationEntityMapping[]>
    async updateAvailability(mappingId: string, isAvailable: boolean): Promise<void>
    async markDiscovered(mappingId: string): Promise<void>
    async getAvailableEntitiesForLocation(locationId: string, sessionId: string): Promise<EntityReference[]>
  }
  ```

- [ ] **時間条件・前提条件チェック機能**
  - [ ] `checkTimeConditions()` - 時間帯による表示制御
  - [ ] `checkPrerequisites()` - 前提エンティティ達成確認
  - [ ] `updateDynamicAvailability()` - 動的な利用可能性更新

### 2.3 手探り体験演出サービス 🎭

#### ✅ PlayerExperienceService新規作成
- [ ] **新サービス作成** (`apps/proxy-server/src/services/playerExperienceService.ts`)
  ```typescript
  class PlayerExperienceService {
    async getMaskedProgressInfo(sessionId: string): Promise<MaskedProgressInfo>
    async generateSubtleHints(milestoneProgress: number, milestoneId: string): Promise<string[]>
    async filterPlayerVisibleContent(content: any): Promise<any>
    async generateNaturalGuidance(context: SessionContext): Promise<string>
    async createAmbiguousRewardMessage(reward: any): Promise<string>
  }
  
  interface MaskedProgressInfo {
    availableActions: string[];
    ambiguousHints: string[];
    atmosphereDescription: string;
    discoveredElements: string[];
  }
  ```

---

## 🗂️ Phase 3: API Routes拡張

### 3.1 既存API拡張 🔌

#### ✅ aiMilestoneGeneration.ts拡張
- [ ] **新エンドポイント追加**
  ```typescript
  POST /api/ai-milestone-generation/generate-scenario-topdown
  GET  /api/ai-milestone-generation/session/:sessionId/player-progress
  GET  /api/ai-milestone-generation/location/:locationId/available-actions
  PATCH /api/ai-milestone-generation/entity/:entityId/discover
  GET  /api/ai-milestone-generation/session/:sessionId/subtle-hints
  ```

- [ ] **既存エンドポイント拡張**
  - [ ] `GET /session/:sessionId/entity-pool` - 二層構造対応
  - [ ] `PATCH /milestone/:milestoneId/progress` - 複数エンティティ進捗対応

### 3.2 新規API作成

#### ✅ locationEntityMapping.ts新規作成
- [ ] **新ルートファイル作成** (`apps/proxy-server/src/routes/locationEntityMapping.ts`)
  ```typescript
  GET    /api/location-entity-mapping/location/:locationId/entities
  POST   /api/location-entity-mapping/create-mappings
  PATCH  /api/location-entity-mapping/:mappingId/availability
  PATCH  /api/location-entity-mapping/:mappingId/discover
  GET    /api/location-entity-mapping/session/:sessionId/all-mappings
  ```

#### ✅ playerExperience.ts新規作成
- [ ] **新ルートファイル作成** (`apps/proxy-server/src/routes/playerExperience.ts`)
  ```typescript
  GET /api/player-experience/session/:sessionId/masked-progress
  GET /api/player-experience/session/:sessionId/available-actions
  GET /api/player-experience/session/:sessionId/subtle-hints
  POST /api/player-experience/generate-natural-guidance
  ```

---

## 🗂️ Phase 4: フロントエンド実装

### 4.1 API クライアント拡張 💻

#### ✅ aiMilestoneGeneration.ts拡張
- [ ] **フロントエンドAPIクライアント拡張** (`apps/frontend/src/api/aiMilestoneGeneration.ts`)
  ```typescript
  async generateScenarioTopDown(request: TopDownGenerationRequest): Promise<ScenarioGenerationResponse>
  async getPlayerProgress(sessionId: string): Promise<MaskedProgressInfo>
  async getAvailableActions(locationId: string, sessionId: string): Promise<string[]>
  async discoverEntity(entityId: string): Promise<void>
  async getSubtleHints(sessionId: string): Promise<string[]>
  ```

#### ✅ 新APIクライアント作成
- [ ] **locationEntityMapping.ts** (`apps/frontend/src/api/locationEntityMapping.ts`)
- [ ] **playerExperience.ts** (`apps/frontend/src/api/playerExperience.ts`)

### 4.2 UI コンポーネント拡張 🎨

#### ✅ 右サイドバー実装
- [ ] **LocationBasedActionSidebar.tsx新規作成**
  ```typescript
  interface LocationBasedActionSidebarProps {
    sessionId: string;
    currentLocationId: string;
    onActionSelect: (actionId: string) => void;
  }
  ```
  - [ ] 現在地ベースの行動表示
  - [ ] 時間条件による動的表示
  - [ ] マイルストーン進捗の内部管理（非表示）
  - [ ] 曖昧なヒント表示（「気になるもの」）

#### ✅ シナリオ生成UI拡張
- [ ] **ScenarioMilestoneEditor.tsx拡張**
  - [ ] 二層構造エンティティプール表示
  - [ ] コア/ボーナス エンティティの区別表示
  - [ ] トップダウン生成進捗表示
  - [ ] 手探り体験モード切り替え

#### ✅ セッション画面拡張
- [ ] **SessionInterface.tsx拡張**
  - [ ] 右サイドバー統合
  - [ ] 手探り体験モード対応
  - [ ] マイルストーン進捗の非表示化
  - [ ] 自然な報酬表示演出

---

## 🗂️ Phase 5: AI サービス拡張

### 5.1 AIService拡張 🤖

#### ✅ プロンプト拡張
- [ ] **新生成メソッド追加** (`apps/proxy-server/src/services/aiService.ts`)
  ```typescript
  async generateMilestoneOutlines(context: CampaignContext): Promise<MilestoneOutline[]>
  async generateCoreEntities(requirements: CoreEntityRequirements): Promise<CoreEntityCollection>
  async generateBonusEntities(context: any): Promise<BonusEntityCollection>
  async generateSubtleHints(progress: ProgressContext): Promise<string[]>
  async generateNaturalGuidance(situation: SituationContext): Promise<string>
  ```

- [ ] **プロンプト最適化**
  - [ ] 日本語対応の強化
  - [ ] テーマ別プロンプト調整
  - [ ] 手探り感演出用プロンプト
  - [ ] トロフィー/ミステリーアイテム生成プロンプト

### 5.2 systemPrompts.ts拡張 📝

#### ✅ 新プロンプト追加
- [ ] **マイルストーン概要生成プロンプト**
- [ ] **二層構造エンティティ生成プロンプト**
- [ ] **場所配置最適化プロンプト**
- [ ] **手探り感演出プロンプト**
- [ ] **報酬分類別生成プロンプト**

---

## 🗂️ Phase 6: テスト・品質保証

### 6.1 単体テスト 🧪

#### ✅ バックエンドテスト
- [ ] **AIMilestoneGenerationService テスト**
  - [ ] トップダウン生成フロー
  - [ ] 二層構造エンティティプール
  - [ ] マイルストーン複数エンティティ紐付け
  - [ ] エラーハンドリング

- [ ] **LocationEntityMappingService テスト**
  - [ ] 場所ベース配置ロジック
  - [ ] 時間条件・前提条件チェック
  - [ ] 動的利用可能性更新

- [ ] **PlayerExperienceService テスト**
  - [ ] 進捗情報マスキング
  - [ ] 暗示的ヒント生成
  - [ ] 自然な誘導メッセージ

#### ✅ フロントエンドテスト
- [ ] **LocationBasedActionSidebar テスト**
  - [ ] 行動表示ロジック
  - [ ] 時間条件による表示変化
  - [ ] ユーザーインタラクション

- [ ] **シナリオ生成フロー テスト**
  - [ ] トップダウン生成UI
  - [ ] エラー表示・リトライ
  - [ ] 生成進捗表示

### 6.2 統合テスト 🔗

#### ✅ エンドツーエンド テスト
- [ ] **「セッション開始！」→プレイ可能まで フロー**
  - [ ] マイルストーン概要生成
  - [ ] エンティティプール生成
  - [ ] 場所配置完了
  - [ ] 右サイドバー初期表示
  - [ ] プレイヤー行動実行

- [ ] **手探り体験シナリオ テスト**
  - [ ] マイルストーン進捗非表示
  - [ ] 暗示的ヒント表示
  - [ ] 自然な報酬演出
  - [ ] エンティティ発見フロー

### 6.3 パフォーマンステスト ⚡

#### ✅ 生成時間・メモリ使用量
- [ ] **大規模シナリオ生成テスト**
  - [ ] 15エンティティ + 6ボーナス生成時間
  - [ ] メモリ使用量監視
  - [ ] AI API呼び出し最適化

- [ ] **リアルタイム更新テスト**
  - [ ] 右サイドバー更新レスポンス
  - [ ] エンティティ発見時の更新速度
  - [ ] WebSocket通信負荷

---

## 🗂️ Phase 7: ドキュメント・最終調整

### 7.1 ドキュメント更新 📚

#### ✅ 技術ドキュメント
- [ ] **API仕様書更新**
  - [ ] 新エンドポイント追加
  - [ ] レスポンス形式変更
  - [ ] エラーコード定義

- [ ] **データベース設計書更新**
  - [ ] 新テーブル仕様
  - [ ] ER図更新
  - [ ] インデックス設計

#### ✅ ユーザーガイド
- [ ] **ゲームマスター向けガイド**
  - [ ] シナリオ生成の使い方
  - [ ] 手探り体験の調整方法
  - [ ] トラブルシューティング

### 7.2 本番環境準備 🚀

#### ✅ デプロイメント
- [ ] **データベースマイグレーション**
  - [ ] 既存データ互換性確認
  - [ ] ロールバック手順準備
  - [ ] 本番環境テスト

- [ ] **AI API使用量監視**
  - [ ] 生成コスト計算
  - [ ] 使用量アラート設定
  - [ ] キャッシュ戦略実装

---

## 📊 進捗管理

### 🎯 マイルストーン
- **Phase 1 完了**: 2025-02-15 (予定)
- **Phase 2-3 完了**: 2025-03-01 (予定)  
- **Phase 4 完了**: 2025-03-15 (予定)
- **Phase 5-6 完了**: 2025-03-30 (予定)
- **Phase 7 完了**: 2025-04-10 (予定)

### 📈 優先度
1. **High**: Phase 1-2 (型定義・バックエンド基盤)
2. **Medium**: Phase 3-4 (API・フロントエンド)
3. **Low**: Phase 5-7 (AI拡張・テスト・ドキュメント)

### ⚠️ リスク要因
- AI生成品質の一貫性確保
- 大規模エンティティプール生成のパフォーマンス
- 手探り体験の調整難易度
- 既存データとの互換性維持

---

## 🎉 完了予定効果

このシナリオ管理システムが完全実装されると：

1. **「セッション開始！」から30秒以内**にプレイ可能状態到達
2. **手探り感を維持**しながら充実した報酬システム提供
3. **AIによる一貫したストーリー**でプレイヤー満足度向上
4. **多様な報酬分類**で探索意欲促進
5. **スケーラブルな生成システム**で様々なテーマ対応

これにより、真の意味での「AI駆動TRPG体験」が実現されます。