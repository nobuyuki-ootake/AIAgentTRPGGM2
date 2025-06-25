# NPC管理要件定義（AI Agent GM向け）

## 基本概念

NPC（Non-Player Character）は AI Agent GMが演じるキャラクターエンティティ。AIが自律的に会話生成、行動決定、関係性管理を行い、プレイヤーとの動的なインタラクションを実現する。

## AI Agent演技用データ構造

### NPCコア定義
```typescript
interface AINPCCharacter {
  id: ID;
  name: string;
  
  // AI演技用基本設定
  aiPersona: {
    corePersonality: string;        // "親切で慎重な商人"
    speechPattern: string;          // "丁寧語、商売っ気のある口調"
    emotionalRange: [-10, 10];      // 感情表現の幅
    knowledgeLevel: 'low' | 'medium' | 'high' | 'expert';
    reactivity: number;             // 0-1, プレイヤー行動への反応速度
  };
  
  // AI判断用メタデータ
  behaviorParams: {
    trustfulness: number;           // -10〜10, 信頼しやすさ
    helpfulness: number;            // -10〜10, 協力的な度合い
    information_sharing: number;    // -10〜10, 情報を共有する傾向
    risk_tolerance: number;         // -10〜10, リスクを取る傾向
    social_engagement: number;      // -10〜10, 社交性
  };
}
```

### AI会話生成用データ
```typescript
interface AIDialogueSystem {
  // コンテキスト認識
  contextAwareness: {
    player_actions: string[];       // 最近のプレイヤー行動
    world_events: string[];         // 現在の世界情勢
    relationship_state: number;     // 現在の関係値
    location_context: string;       // 現在の場所・状況
  };
  
  // 応答生成ガイド
  responseGeneration: {
    greeting_style: string;         // "気さくに手を振る"
    information_delivery: string;   // "ヒントとして暗示する"
    emotional_expression: string;   // "表情と身振りで表現"
    conflict_resolution: string;    // "妥協案を提示する"
  };
  
  // AI生成制約
  constraints: {
    max_info_reveal: number;        // 1回で明かせる情報の上限
    personality_consistency: boolean; // 性格の一貫性を保つか
    memory_span: number;            // 過去の会話を何ターン覚えているか
  };
}
```

### AI自律行動システム
```typescript
interface AIAutonomousBehavior {
  // 自発的行動の定義
  autonomousActions: {
    trigger_conditions: string[];   // ["player_enters_shop", "evening_time"]
    action_probability: number;     // 0-1, 行動する確率
    action_type: 'dialogue' | 'movement' | 'task' | 'emotion';
    action_description: string;     // AI実行用の行動説明
  }[];
  
  // 学習・適応機能
  adaptability: {
    learns_player_preferences: boolean;  // プレイヤーの好みを学習するか
    adjusts_difficulty: boolean;         // 交渉難易度等を調整するか
    remembers_interactions: boolean;     // 過去のやりとりを覚えているか
    evolves_personality: boolean;        // 時間で性格が変化するか
  };
}

## AI実行システム

### AI自動判断による会話開始
```typescript
interface AIDialogueTrigger {
  trigger_type: 'player_proximity' | 'time_based' | 'event_based' | 'emotional_state';
  condition: {
    proximity_distance?: number;     // プレイヤーとの距離（メートル）
    time_condition?: string;         // "morning", "evening", "after_quest_completion"
    world_event?: string;           // "merchant_caravan_arrives", "monster_attack"
    emotional_trigger?: string;     // "excitement_high", "trust_level_increased"
  };
  ai_decision_weight: number;       // 0-1, AIが会話を開始する確率
  conversation_starter: string;     // AI生成用の会話開始ガイド
}
```

### AI動的応答システム
```typescript
interface AIResponseGeneration {
  // プレイヤー入力解析
  inputAnalysis: {
    intent_recognition: string[];    // ["question", "request", "greeting", "complaint"]
    emotion_detection: string;       // "happy", "angry", "confused", "neutral"
    topic_extraction: string[];     // 話題のキーワード抽出
  };
  
  // AI応答生成
  responseStrategy: {
    information_level: 'basic' | 'detailed' | 'hint' | 'refuse';
    emotional_tone: 'friendly' | 'neutral' | 'defensive' | 'enthusiastic';
    action_suggestion?: string;      // プレイヤーへの行動提案
    follow_up_question?: string;     // 会話継続のための質問
  };
  
  // 関係値動的更新
  relationshipUpdate: {
    change_amount: number;           // -5〜+5の関係値変化
    change_reason: string;           // 変化の理由（ログ用）
    threshold_effects?: string[];   // 特定値到達時の効果
  };
}
```

### AI自律取引システム
```typescript
interface AITransactionSystem {
  // 価格動的計算
  dynamicPricing: {
    base_price: number;
    relationship_modifier: number;   // -0.5〜+0.5の関係値による調整
    supply_demand_factor: number;   // 需給による価格変動
    event_modifier: number;         // イベント影響による調整
  };
  
  // AI交渉判断
  negotiation: {
    accepts_haggling: boolean;       // 価格交渉を受け入れるか
    max_discount: number;           // 最大割引率
    negotiation_difficulty: number; // 交渉の難易度（0-1）
    ai_counter_offer: boolean;      // AIからの対案提示
  };
  
  // サービス提供判断
  serviceDecision: {
    availability_check: string[];   // ["has_required_items", "player_level_sufficient"]
    ai_recommendation?: string;     // AIからのサービス推奨
    conditional_offers: ConditionalOffer[]; // 条件付きオファー
  };
}
```

## AI管理報酬システム

### 動的情報提供
```typescript
interface AIDynamicInformation {
  // コンテキスト適応情報
  contextualInfo: {
    player_level_appropriate: boolean;    // プレイヤーレベルに適した情報か
    current_quest_relevant: boolean;      // 現在のクエストに関連するか
    timing_appropriate: boolean;          // 今話すべき情報か
    spoiler_level: 'none' | 'minor' | 'major'; // ネタバレレベル
  };
  
  // AI情報選別
  informationFiltering: {
    max_info_per_conversation: number;    // 1回の会話での情報上限
    priority_topics: string[];           // 優先的に伝える話題
    forbidden_topics: string[];          // 絶対に話さない話題
    hint_delivery_style: string;         // ヒントの伝え方
  };
}
```

### AI計算報酬システム
```typescript
interface AIRewardCalculation {
  // 動的報酬計算
  rewardLogic: {
    base_reward: number;
    relationship_bonus: number;          // 関係値によるボーナス
    quest_progress_bonus: number;        // クエスト進行によるボーナス
    rarity_modifier: number;             // アイテムレアリティ調整
    balancing_factor: number;            // 全体バランス調整
  };
  
  // AI判断による報酬選択
  rewardSelection: {
    player_preference_analysis: string[];  // プレイヤーの好み分析
    optimal_reward_type: string;          // 最適な報酬タイプ
    alternative_options: string[];        // 代替選択肢
    long_term_impact: string;             // 長期的な影響評価
  };
}

## 場所との紐付け

### 常駐場所
- **固定常駐**: 常に同じ場所にいる
- **時間別移動**: 時間帯により場所を移動
- **日別パターン**: 曜日により異なる場所
- **イベント連動**: 特定イベント時に移動

### 活動範囲
- **職場**: 仕事を行う場所
- **居住地**: 住んでいる場所
- **社交場**: 交流を行う場所
- **特別場所**: 特定条件でのみ現れる場所

### 場所での役割
- **情報源**: その場所の詳細情報提供
- **案内役**: 場所の利用方法や注意点の説明
- **管理者**: 場所の運営・管理
- **警備員**: 場所の安全・秩序維持

## マイルストーンとの関係

### ストーリー進行の鍵
- **情報提供者**: 重要な手がかりの提供
- **依頼者**: 重要クエストの発行
- **協力者**: 困難な課題の共同解決
- **証人**: 重要な出来事の証明

### キャラクター成長の支援
- **師匠役**: スキル・知識の教授
- **相談相手**: 重要な決断の助言
- **励まし役**: 困難時の精神的支援
- **挑戦者**: 成長のための試練提供

### 社会関係の構築
- **人脈の核**: 他NPCとの関係構築の仲介
- **評判の源**: 社会的地位向上の鍵
- **権力者**: 重要な決定権の保持者
- **影響力者**: 世界情勢への影響力保持

## NPC管理画面の機能要件

### 基本機能
1. **NPC一覧表示**
   - 重要度別フィルタリング（主要、準主要、背景）
   - 所在地別グループ表示
   - 関係レベルでのソート
   - 職業・所属別分類

2. **詳細編集パネル**
   - 基本情報の編集
   - パーソナリティ設定
   - AI行動パラメータ調整
   - 対話パターン管理

### 専用機能
1. **関係値管理システム**
   - 全NPCとの関係値一覧表示
   - 関係変化の履歴追跡
   - 関係改善・悪化の要因分析
   - 関係ネットワークの可視化

2. **AI行動シミュレーター**
   - 行動パラメータに基づく行動予測
   - 状況別反応のテスト
   - 対話パターンの確認
   - 自律行動の調整

3. **対話システム管理**
   - 会話パターンの作成・編集
   - トリガー条件の設定
   - 応答の分岐管理
   - 会話ログの管理

4. **情報・サービス管理**
   - 提供可能な情報の登録
   - サービス内容と価格設定
   - 在庫・利用可能性の管理
   - 特別条件・制限の設定

5. **スケジュール管理**
   - 時間別・日別の行動スケジュール
   - 移動パターンの設定
   - イベント連動の行動変化
   - 季節・天候による変化

## 技術仕様

### データ構造
```typescript
interface NPCCharacter {
  id: ID;
  name: string;
  description: string;
  importance: 'major' | 'minor' | 'background';
  disposition: 'friendly' | 'neutral' | 'hostile' | 'unknown';
  occupation: string;
  location: string;
  relationshipLevel: number;  // -100 to 100
  
  personality: {
    traits: string[];
    goals: string[];
    motivations: string[];
    fears: string[];
    values: string[];
    quirks: string[];
  };
  
  socialStatus: {
    organization?: string;
    rank?: string;
    wealth?: 'poor' | 'modest' | 'comfortable' | 'wealthy' | 'rich';
    reputation?: number;
    connections?: string[];
  };
  
  dialoguePatterns: DialoguePattern[];
  services?: NPCService[];
  schedule?: NPCSchedule;
  
  aiPersonality: {
    autonomyLevel: 'manual' | 'assisted' | 'autonomous';
    decisionMaking: {
      aggressiveness: number;  // -10 to 10
      curiosity: number;
      loyalty: number;
      caution: number;
      sociability: number;
    };
  };
  
  storyRole?: {
    questInvolvement: string[];
    plotHooks: string[];
    secrets: string[];
    information: string[];
  };
}

interface DialoguePattern {
  trigger: 'greeting' | 'farewell' | 'quest_offer' | 'quest_complete' | 'trade' | 'combat' | 'idle';
  responses: string[];
  conditions?: DialogueCondition[];
  consequences?: DialogueConsequence[];
}
```

### API エンドポイント
- `GET /api/npcs` - NPC一覧取得
- `POST /api/npcs` - 新規NPC作成
- `PUT /api/npcs/:id` - NPC更新
- `DELETE /api/npcs/:id` - NPC削除
- `POST /api/npcs/:id/interact` - NPC交流実行
- `GET /api/npcs/:id/dialogue` - 対話選択肢取得
- `POST /api/npcs/:id/dialogue/:choiceId` - 対話選択実行
- `GET /api/npcs/:id/services` - 提供サービス一覧
- `GET /api/npcs/:id/relationship` - 関係レベル取得

### バリデーション規則
- NPC名は必須、1-100文字
- 説明は必須、10-1000文字
- 関係レベルは-100〜100の範囲
- 行動パラメータは-10〜10の範囲
- 対話パターンは最低1つ必須
- 循環参照防止（NPC同士の関係）
- スケジュール設定の論理的整合性確認