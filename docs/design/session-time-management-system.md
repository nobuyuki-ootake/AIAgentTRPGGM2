# セッション時間管理システム 詳細設計書

## 概要

本システムは、TRPGセッションにおける時間制約と進行管理を自動化し、プレイヤーに明確な目標とゲーム進行を提供するためのシステムです。

## 1. システム全体構成

### 1.1 主要コンポーネント

```
┌─────────────────────────────────────────┐
│           セッション時間管理             │
├─────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────────┐ │
│ │ 時間設定選択 │ │   コンテンツプール   │ │
│ │ ダイアログ   │ │   管理システム       │ │
│ └─────────────┘ └─────────────────────┘ │
│ ┌─────────────┐ ┌─────────────────────┐ │
│ │ 日進行・     │ │   マイルストーン     │ │
│ │ アクション   │ │   自動生成システム   │ │
│ │ 管理システム │ └─────────────────────┘ │
│ └─────────────┘ ┌─────────────────────┐ │
│ ┌─────────────┐ │   期限・ヒント       │ │
│ │ 時間UI       │ │   管理システム       │ │
│ │ コンポーネント│ └─────────────────────┘ │
│ └─────────────┘                         │
└─────────────────────────────────────────┘
```

## 2. セッション時間設定

### 2.1 プレイ時間プリセット

| タイプ | 総日数 | 1日行動数 | 推定時間 | マイルストーン数 | 説明 |
|--------|--------|-----------|----------|------------------|------|
| 短     | 3日    | 3回       | 30分     | 1個              | 最終マイルストーンのみ |
| 中     | 7日    | 3回       | 70分     | 3個              | 中間2個 + 最終1個 |
| 長     | 11日   | 3回       | 120分    | 5個              | 中間3個 + 分岐最終1個 |
| カスタム| 任意  | 任意      | 任意     | 任意             | 自由設定 |

### 2.2 マイルストーン期限配分

#### 短時間プレイ (3日)
- **最終マイルストーン**: 3日目 (期限なし)

#### 中時間プレイ (7日)
- **1st マイルストーン**: 3日目までに達成
- **2nd マイルストーン**: 5日目までに達成  
- **最終マイルストーン**: 7日目 (期限なし)

#### 長時間プレイ (11日)
- **1st マイルストーン**: 3日目までに達成
- **2nd マイルストーン**: 5日目までに達成
- **3rd マイルストーン**: 8日目までに達成
- **最終マイルストーン**: 11日目 (期限なし、条件分岐あり)

## 3. マイルストーン目標システム

### 3.1 マイルストーン目標タイプ

#### 3.1.1 特定エネミー討伐
```typescript
interface EnemyDefeatObjective {
  type: 'enemy_defeat';
  targetEnemyId: string;
  targetEnemyName: string;
  description: string;
  isMilestoneTarget: boolean; // マイルストーン対象かどうか
}
```

#### 3.1.2 特定イベントクリア
```typescript
interface EventClearObjective {
  type: 'event_clear';
  targetEventId: string;
  targetEventName: string;
  description: string;
  isMilestoneTarget: boolean;
}
```

#### 3.1.3 NPC コネクション確立
```typescript
interface NPCConnectionObjective {
  type: 'npc_connection';
  targetNPCId: string;
  targetNPCName: string;
  requiredRelationshipLevel: number; // 1-5の信頼度レベル
  description: string;
  isMilestoneTarget: boolean;
}
```

#### 3.1.4 キーアイテム取得
```typescript
interface ItemAcquisitionObjective {
  type: 'item_acquisition';
  targetItemId: string;
  targetItemName: string;
  description: string;
  isMilestoneTarget: boolean;
}
```

### 3.2 マイルストーン目標複合パターン

```typescript
interface MilestoneObjective {
  id: string;
  title: string;
  description: string;
  deadlineDay?: number; // 期限日（最終マイルストーンはundefined）
  requirements: {
    type: 'AND' | 'OR'; // 複数条件の結合方法
    objectives: (EnemyDefeatObjective | EventClearObjective | NPCConnectionObjective | ItemAcquisitionObjective)[];
  };
  rewards?: {
    experience: number;
    items?: string[];
    storyProgression: number;
  };
}
```

## 4. コンテンツプールシステム

### 4.1 プール構造

#### 4.1.1 エネミープール
```typescript
interface EnemyPoolEntry {
  id: string;
  name: string;
  description: string;
  level: number;
  type: 'boss' | 'elite' | 'normal' | 'minion';
  tags: string[]; // ['undead', 'magic', 'forest'] など
  isMilestoneCandidate: boolean; // マイルストーン対象候補
  isGenerated: boolean; // 既にゲーム内に配置済みか
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  requiredDay: number; // 何日目以降に出現可能か
}
```

#### 4.1.2 イベントプール
```typescript
interface EventPoolEntry {
  id: string;
  name: string;
  description: string;
  type: 'main' | 'side' | 'random' | 'social';
  duration: number; // 消費アクション数
  prerequisites?: string[]; // 前提条件（アイテム、NPC関係など）
  tags: string[];
  isMilestoneCandidate: boolean;
  isGenerated: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  requiredDay: number;
  locationTags?: string[]; // 発生可能な場所タグ
}
```

#### 4.1.3 NPCプール
```typescript
interface NPCPoolEntry {
  id: string;
  name: string;
  description: string;
  role: 'merchant' | 'questgiver' | 'ally' | 'informant' | 'rival' | 'neutral';
  personality: string[];
  relationshipLevel: number; // 0-5 (0:敵対, 1:不信, 2:中立, 3:友好, 4:信頼, 5:深い絆)
  maxRelationshipLevel: number;
  tags: string[];
  isMilestoneCandidate: boolean;
  isGenerated: boolean;
  requiredDay: number;
  locationId?: string;
}
```

#### 4.1.4 アイテムプール
```typescript
interface ItemPoolEntry {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'accessory' | 'consumable' | 'key_item' | 'quest_item';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  tags: string[];
  isMilestoneCandidate: boolean;
  isGenerated: boolean;
  requiredDay: number;
  sourceType: 'enemy_drop' | 'quest_reward' | 'merchant' | 'exploration' | 'crafting';
  sourceId?: string; // 入手元のID
}
```

### 4.2 プール管理アルゴリズム

#### 4.2.1 コンテンツ配分ルール

**マイルストーン対象**: プール全体の20-30%
**寄り道コンテンツ**: プール全体の70-80%

#### 4.2.2 難易度スケーリング
```typescript
interface DifficultyScaling {
  day1_3: {
    enemy: 'easy' | 'medium';
    event: 'easy' | 'medium';
    itemRarity: 'common' | 'uncommon';
  };
  day4_6: {
    enemy: 'medium' | 'hard';
    event: 'medium' | 'hard';
    itemRarity: 'uncommon' | 'rare';
  };
  day7_11: {
    enemy: 'hard' | 'extreme';
    event: 'hard';
    itemRarity: 'rare' | 'epic' | 'legendary';
  };
}
```

## 5. 期限管理とGMヒントシステム

### 5.1 期限チェック機能

```typescript
interface DeadlineMonitor {
  checkMilestoneDeadlines(): {
    overdue: MilestoneObjective[];
    approaching: MilestoneObjective[]; // 1日前警告
    onTime: MilestoneObjective[];
  };
  
  generateHints(overdueMilestone: MilestoneObjective): GMHint[];
}

interface GMHint {
  type: 'npc_dialogue' | 'event_trigger' | 'item_placement' | 'enemy_weakness';
  urgency: 'subtle' | 'obvious' | 'direct';
  content: string;
  targetObjective: string;
}
```

### 5.2 GMヒント生成パターン

#### 5.2.1 遅れレベル別ヒント強度

**1日遅れ (subtle)**:
- NPCが何気なく関連情報をほのめかす
- 噂や看板で情報提供
- 偶然関連アイテムを発見

**2日遅れ (obvious)**:
- NPCが直接的に助言
- 明確なクエストヒント
- 関連エネミーの情報提供

**3日以上遅れ (direct)**:
- 緊急イベントで強制的に関連
- 重要NPCが直接案内
- アイテムやスキルの一時提供

### 5.3 ヒント配信システム

```typescript
interface HintDeliverySystem {
  scheduleHint(hint: GMHint, deliveryDay: number): void;
  deliverHint(hint: GMHint, currentContext: SessionContext): void;
  trackHintEffectiveness(hintId: string, playerResponse: PlayerAction): void;
}
```

## 6. 非同期コンテンツ生成システム

### 6.1 バッチ生成フロー

#### 6.1.1 セッション開始時
1. **即座生成** (ブロッキング):
   - 1stマイルストーン目標とその関連コンテンツ
   - 1-3日目の基本コンテンツプール
   - 開始エリアのNPC・イベント・アイテム

2. **バックグラウンド生成** (非ブロッキング):
   - 2nd, 3rd マイルストーン候補
   - 4-7日目のコンテンツプール
   - 後半エリアのコンテンツ

#### 6.1.2 進行中生成

```typescript
interface AsyncContentGenerator {
  // 現在の進行状況に基づいて次のコンテンツを生成
  generateUpcomingContent(
    currentDay: number,
    completedObjectives: string[],
    playerBehaviorPattern: PlayerBehaviorAnalysis
  ): Promise<GeneratedContent>;
  
  // プレイヤーの行動パターンを分析
  analyzePlayerBehavior(
    actionHistory: DayAction[],
    preferredContentTypes: string[]
  ): PlayerBehaviorAnalysis;
}

interface PlayerBehaviorAnalysis {
  preferredCombatRatio: number; // 0-1
  explorationFocus: number; // 0-1
  socialInteractionLevel: number; // 0-1
  questCompletionRate: number; // 0-1
  riskTakingTendency: number; // 0-1
}
```

### 6.2 生成タイミング

| タイミング | 生成対象 | 生成方式 | 所要時間目安 |
|------------|----------|----------|--------------|
| セッション開始 | 1stマイルストーン一式 | 同期 | 3-5秒 |
| 1日目終了後 | 2ndマイルストーン候補 | 非同期 | 10-15秒 |
| 2日目終了後 | 3rdマイルストーン候補 | 非同期 | 10-15秒 |
| 各マイルストーン達成時 | 次期コンテンツ最適化 | 非同期 | 5-10秒 |

### 6.3 コンテンツキャッシュシステム

```typescript
interface ContentCache {
  // 生成済みコンテンツの管理
  cacheContent(content: GeneratedContent, expiresAfterDays: number): void;
  
  // 条件に合致するコンテンツの検索
  findCachedContent(criteria: ContentCriteria): GeneratedContent[];
  
  // 未使用コンテンツの再利用
  recycleUnusedContent(day: number): GeneratedContent[];
}
```

## 7. アクション消費システム

### 7.1 アクション分類と消費量

| アクションタイプ | 基本消費量 | 条件による変動 |
|------------------|------------|----------------|
| 探索 | 1 | 危険エリア: +1 |
| クエスト進行 | 1 | 複雑クエスト: +1 |
| 戦闘 | 1 | ボス戦: +2 |
| 社交・会話 | 0.5 | 重要NPC: 1 |
| 休憩・回復 | 0.5 | 完全回復: 1 |
| 買い物・取引 | 0.5 | 複雑交渉: 1 |

### 7.2 アクション実行フロー

```typescript
interface ActionExecutionFlow {
  // アクション実行前の確認
  validateAction(action: ActionRequest): ActionValidation;
  
  // アクション実行と消費
  executeAction(action: ActionRequest): ActionResult;
  
  // 日進行チェック
  checkDayProgression(remainingActions: number): DayProgressionResult;
}

interface ActionRequest {
  type: ActionType;
  characterId: string;
  targetId?: string;
  description: string;
  estimatedDuration: number;
}

interface ActionValidation {
  isValid: boolean;
  requiredActions: number;
  warnings?: string[];
  confirmation?: string; // プレイヤーへの確認メッセージ
}
```

## 8. 実装フェーズ

### フェーズ1: 基礎UI実装 (1-2日)
- [x] SessionDurationDialog の実装
- [ ] SessionDurationDialog のテスト
- [ ] 基本的な時間管理UIの表示

### フェーズ2: バックエンドAPI実装 (2-3日)
- [ ] SessionState に timeManagement フィールド追加
- [ ] proxy-server での時間管理API実装
- [ ] マイルストーン生成API実装

### フェーズ3: コンテンツプールシステム (3-4日)
- [ ] 各種プール型定義と基本データ
- [ ] プール管理ロジック実装
- [ ] コンテンツ生成アルゴリズム

### フェーズ4: 期限・ヒントシステム (2-3日)
- [ ] 期限監視システム
- [ ] GMヒント生成システム
- [ ] ヒント配信システム

### フェーズ5: 非同期生成システム (3-4日)
- [ ] バックグラウンド生成処理
- [ ] プレイヤー行動分析
- [ ] コンテンツキャッシュシステム

### フェーズ6: 統合・テスト・最適化 (2-3日)
- [ ] 全システム統合
- [ ] パフォーマンス最適化
- [ ] エンドツーエンドテスト

**総実装期間予定: 13-19日**

## 9. 技術的考慮事項

### 9.1 パフォーマンス
- コンテンツ生成の非同期実行
- プール検索のインデックス最適化
- キャッシュ機能による応答速度向上

### 9.2 スケーラビリティ  
- プール内容の動的拡張
- 難易度設定の柔軟性
- マイルストーン目標タイプの拡張性

### 9.3 ユーザー体験
- 進行状況の明確な可視化
- 選択の結果が分かりやすいフィードバック
- 期限プレッシャーの適切なバランス

---

*このドキュメントは、セッション時間管理システムの包括的な設計書です。実装時には各フェーズごとに詳細な技術仕様書を作成し、継続的にドキュメントを更新していきます。*