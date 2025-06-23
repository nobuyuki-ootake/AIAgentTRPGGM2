# TRPGセッション機能要件定義

## 概要
実際のTRPGセッション実行時に使用するリアルタイム進行管理システム。ゲームマスターとプレイヤーの協力的なゲーム進行を支援する中核機能。

## 基本機能

### 1. セッション管理
- **セッション開始**: 新規セッションの開始処理
- **セッション状態管理**: 進行中・休憩・終了等の状態制御
- **参加者管理**: プレイヤーとキャラクターの対応
- **セッション履歴**: 過去セッションの記録・参照

### 2. キャラクター表示・管理
- **パーティ表示**: 参加キャラクターの一覧表示
- **キャラクター詳細**: ステータス・装備・スキルの確認
- **リアルタイム更新**: HP・MP等のリアルタイム変更
- **状態管理**: 毒・麻痺等の状態異常管理

### 3. チャットインターフェース
- **メッセージ交換**: GM・プレイヤー間のコミュニケーション
- **ロール分け**: IC（インキャラクター）・OOC（アウトオブキャラクター）
- **システムメッセージ**: ダイスロール結果・システム通知
- **ログ保存**: セッション内容の自動記録

### 4. インタラクションパネル
- **クイックアクション**: よく使用する行動のボタン化
- **スキル使用**: スキル・魔法・特技の実行
- **アイテム使用**: 所持アイテムの使用・管理
- **環境インタラクション**: 場所・オブジェクトとの相互作用

## ダイスシステム

### 1. ダイスロール機能
- **基本ダイス**: D4、D6、D8、D10、D12、D20、D100
- **複数ダイス**: 複数個のダイス同時ロール
- **修正値適用**: 能力値・装備による修正
- **結果表示**: 視覚的なダイス表示とアニメーション

### 2. スキルチェック
- **自動計算**: 能力値＋修正値の自動計算
- **難易度設定**: DC（難易度クラス）の設定
- **成功・失敗判定**: 結果の自動判定と表示
- **クリティカル**: 自動成功・自動失敗の処理

### 3. 戦闘サポート
- **攻撃ロール**: 命中判定と自動計算
- **ダメージロール**: ダメージ計算と適用
- **イニシアチブ**: 行動順序の管理
- **戦闘ラウンド**: ターンベース戦闘の管理

## AI統合機能

### 1. ゲームマスターアシスタント
- **ルール参照**: ゲームルールの即座検索・表示
- **裁定支援**: 曖昧な状況での判断支援
- **バランス調整**: リアルタイムでの難易度調整提案
- **時間管理**: セッション時間の効率的な配分提案

### 2. NPC制御
- **AI行動**: NPCの自然な会話・行動生成
- **感情シミュレーション**: NPCの感情状態に基づく反応
- **記憶機能**: 過去の出来事を記憶した一貫性のある行動
- **関係性反映**: PC との関係性に基づく態度変化

### 3. 動的イベント生成
- **状況対応**: 予期しない展開への対応イベント生成
- **興味分析**: プレイヤーの興味に基づくコンテンツ調整
- **緊張管理**: セッションの緊張感を適切に保つ調整

### 4. マイルストーン・プール生成システム
- **AIマイルストーン生成**: セッション開始時に基本3個程度の自動生成
- **エンティティプール生成**: テーマ適応したエネミー・イベント・NPC・アイテム・クエストの自動生成
- **テーマ適応機能**: キャンペーンテーマに応じた要素無効化（ほのぼの日常でエネミー無し等）
- **場所連携機能**: エネミー・イベントの適切な場所配置

### 5. インタラクティブイベントシステム
- **選択肢自動生成**: AI による複数行動選択肢の動的生成
- **GM問いかけ機能**: 「どのようにタスクをクリアしますか？」の自動質問
- **方針理解システム**: プレイヤーの自然言語説明の理解・分析
- **段階的難易度調整**: リトライ時の自動難易度低下機能

## セッションモード

### 1. 探索モード
- **マップ表示**: 現在地と周辺環境の表示
- **移動管理**: キャラクターの位置移動
- **発見システム**: 隠された要素の発見判定
- **環境情報**: 場所の詳細情報提供

### 2. 戦闘モード
- **戦闘マップ**: 戦術的な位置関係表示
- **行動順管理**: イニシアチブに基づく行動順
- **アクション管理**: 行動・移動・ボーナスアクション
- **効果範囲**: 呪文・特技の効果範囲表示

### 3. 社交モード
- **NPC対話**: 重要NPCとの会話インターフェース
- **判定サポート**: 説得・威圧・欺瞞等の社交判定
- **関係性表示**: NPCとの関係性の可視化
- **情報管理**: 得られた情報の整理・表示

## パワーチェックミニゲーム

### 1. ゲーム種別
- **反射神経**: 素早い反応を要するゲーム
- **記憶力**: パターン記憶ゲーム
- **判断力**: 状況判断ゲーム
- **集中力**: 持続的な集中を要するゲーム

### 2. 難易度調整
- **キャラクター能力反映**: 関連能力値による難易度調整
- **装備効果**: 装備による有利・不利の反映
- **状態効果**: 状態異常による影響

### 3. 結果統合
- **成功度**: ミニゲーム結果の段階的評価
- **ストーリー反映**: 結果のストーリーへの影響
- **経験値**: 成功による経験値獲得

## データ構造

### セッション状態
```typescript
interface TRPGSessionState {
  id: string;
  campaignId: string;
  sessionNumber: number;
  startTime: Date;
  status: SessionStatus;
  participants: SessionParticipant[];
  currentScene: SceneInfo;
  chatLog: ChatMessage[];
  eventLog: SessionEvent[];
}
```

### キャラクター状態
```typescript
interface CharacterSessionState {
  characterId: string;
  currentHP: number;
  currentMP: number;
  statusEffects: StatusEffect[];
  position: Position;
  inventory: InventoryState;
  actionHistory: ActionRecord[];
}
```

### セッションイベント
```typescript
interface SessionEvent {
  id: string;
  timestamp: Date;
  type: EventType;
  actor: string;
  target?: string;
  action: ActionInfo;
  result: EventResult;
  diceRolls?: DiceRollResult[];
}
```

### マイルストーンシステム

#### マイルストーン
```typescript
interface Milestone {
  id: string;
  campaignId: string;
  sessionId: string;
  title: string;
  description: string;
  type: MilestoneType; // 'enemy_defeat' | 'event_clear' | 'npc_communication' | 'item_acquisition' | 'quest_completion'
  targetId: string; // 対象エンティティのID
  targetDetails: MilestoneTargetDetails;
  status: MilestoneStatus; // 'pending' | 'in_progress' | 'completed'
  progress: number; // 0-100
  requiredConditions: MilestoneCondition[];
  reward: MilestoneReward;
  createdAt: Date;
  completedAt?: Date;
}

interface MilestoneTargetDetails {
  entityType: 'enemy' | 'event' | 'npc' | 'item' | 'quest';
  entityId: string;
  specificConditions: Record<string, any>; // 特定の条件（NPCとの特定会話内容等）
}

interface MilestoneCondition {
  type: string;
  description: string;
  required: boolean;
  completed: boolean;
}

interface MilestoneReward {
  experiencePoints: number;
  items: string[]; // アイテムID配列
  characterBenefits: Record<string, any>;
  storyProgression: string;
}
```

#### エンティティプール
```typescript
interface EntityPool {
  id: string;
  campaignId: string;
  sessionId: string;
  themeId: string;
  entities: EntityPoolCollection;
  generatedAt: Date;
  lastUpdated: Date;
}

interface EntityPoolCollection {
  enemies: Enemy[];
  events: InteractiveEvent[];
  npcs: NPC[];
  items: Item[];
  quests: Quest[];
}

interface Enemy {
  id: string;
  name: string;
  description: string;
  level: number;
  abilities: EnemyAbilities;
  locationIds: string[]; // 配置場所
  isMilestoneTarget: boolean;
  rewards: EnemyReward[];
  behavior: EnemyBehavior;
}

interface InteractiveEvent {
  id: string;
  name: string;
  description: string;
  locationIds: string[]; // 発生場所
  choices: EventChoice[];
  isMilestoneTarget: boolean;
  requiredConditions: EventCondition[];
  outcomes: EventOutcome[];
}

interface EventChoice {
  id: string;
  text: string;
  description: string;
  requirements: ChoiceRequirement[];
  consequences: ChoiceConsequence[];
}

interface NPC {
  id: string;
  name: string;
  description: string;
  personality: NPCPersonality;
  locationIds: string[]; // 存在場所
  dialoguePatterns: DialoguePattern[];
  communicationConditions: CommunicationCondition[];
  isMilestoneTarget: boolean;
  relationshipLevel: number; // プレイヤーとの関係性
}

interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  effects: ItemEffect[];
  acquisitionMethods: AcquisitionMethod[]; // 入手方法
  isMilestoneTarget: boolean;
  value: number;
}
```

### インタラクティブイベント実行状態
```typescript
interface EventExecutionState {
  eventId: string;
  sessionId: string;
  currentChoiceId?: string;
  playerApproach?: string;
  retryCount: number;
  difficulty: DifficultyLevel;
  baseDifficulty: DifficultyLevel;
  status: EventExecutionStatus; // 'choice_selection' | 'approach_input' | 'dice_check' | 'result_processing' | 'completed'
  executionHistory: EventExecution[];
}

interface EventExecution {
  attempt: number;
  choiceId: string;
  playerApproach: string;
  difficulty: DifficultyLevel;
  diceResult: DiceRollResult;
  outcome: EventExecutionOutcome;
  timestamp: Date;
}

interface DiceRollResult {
  diceType: string; // 'D20', 'D10', etc.
  rawRoll: number;
  modifiers: number;
  totalResult: number;
  targetNumber: number;
  success: boolean;
  criticalSuccess?: boolean;
  criticalFailure?: boolean;
}
```

### プール活動フィードバック
```typescript
interface PoolActivityFeedback {
  id: string;
  sessionId: string;
  activityType: PoolActivityType; // 'enemy_defeat' | 'event_participation' | 'npc_interaction' | 'item_discovery'
  entityId: string;
  playerId: string;
  isMilestoneRelated: boolean;
  feedback: ActivityFeedback;
  rewards: ActivityReward[];
  timestamp: Date;
}

interface ActivityFeedback {
  message: string;
  tone: FeedbackTone; // 'encouraging' | 'informative' | 'rewarding' | 'story_advancing'
  experienceValue: ExperienceValue; // 体験価値の評価
  relationshipImpact: RelationshipImpact[];
}

interface ActivityReward {
  type: RewardType; // 'experience' | 'item' | 'information' | 'relationship' | 'story_element'
  value: number;
  description: string;
  permanent: boolean; // 永続的な効果か
}
```

## UI/UX要件

### 1. レイアウト設計
- **メイン画面**: セッション情報・チャット・アクションパネル
- **サイドバー**: キャラクター状態・ルール参照
- **モーダル**: 詳細情報・設定変更
- **レスポンシブ**: 様々な画面サイズへの対応

### 2. リアルタイム性
- **即座更新**: 状態変化の即座反映
- **同期機能**: 複数参加者間での状態同期
- **オフライン対応**: ネットワーク断絶時の対応

### 3. アクセシビリティ
- **視覚支援**: 色覚障害対応・高コントラスト
- **聴覚支援**: 視覚的な情報提示
- **操作支援**: キーボード・タッチ操作の最適化

## セッション記録・分析

### 1. 自動記録
- **行動ログ**: 全ての行動・判定の記録
- **会話ログ**: チャット内容の保存
- **時間記録**: 各イベントの所要時間
- **統計情報**: ダイスロール・成功率等の統計

### 2. セッション分析
- **参加度分析**: 各プレイヤーの参加度測定
- **バランス分析**: 戦闘・探索・社交の時間配分
- **問題点抽出**: 改善すべき点の特定

### 3. 改善提案
- **次回への提案**: セッション改善の具体的提案
- **プレイヤーフィードバック**: 個別の成長ポイント提示
- **GMアドバイス**: ゲームマスタリングの改善点

## エラーハンドリング

### 1. 接続エラー
- **再接続機能**: 自動再接続とデータ復旧
- **オフライン継続**: 一時的なオフライン動作
- **データ同期**: 再接続時のデータ整合性確保

### 2. 計算エラー
- **計算検証**: 自動計算結果の妥当性確認
- **手動修正**: 必要に応じた手動調整機能
- **履歴管理**: 修正履歴の保持

## テスト要件

### 1. 機能テスト
- **セッション進行**: 全体的なセッション流れのテスト
- **ダイスシステム**: 確率的正確性の検証
- **AI統合**: AI機能の期待動作確認

### 2. パフォーマンステスト
- **リアルタイム性**: 応答速度の測定
- **同時接続**: 複数ユーザー時の安定性
- **長時間セッション**: 長時間使用時の安定性

### 3. ユーザビリティテスト
- **直感性**: 新規ユーザーの操作習得速度
- **効率性**: 熟練ユーザーの作業効率
- **満足度**: ゲーム体験の向上度測定