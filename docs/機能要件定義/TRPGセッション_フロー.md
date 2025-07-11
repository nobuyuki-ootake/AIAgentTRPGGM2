# TRPGセッション フロー

## 全体フロー図

```mermaid
flowchart TD
    Start([セッション開始]) --> CharSelect[キャラクター選択]
    CharSelect --> AIStart[AIセッション開始]
    AIStart --> GameIntro[AI: ゲーム概要アナウンス]
    GameIntro --> TurnStart{ターン開始}
    
    TurnStart --> ActionSelect[行動選択]
    
    ActionSelect --> Explore[探索行動]
    ActionSelect --> Base[拠点行動]
    ActionSelect --> Comm[仲間との交流]
    ActionSelect --> Quest[クエスト実行]
    ActionSelect --> Move[場所移動]
    ActionSelect --> Combat[戦闘開始]
    
    Explore --> TaskAnnounce[AI: タスク内容説明]
    Base --> TaskAnnounce
    Comm --> TaskAnnounce
    Quest --> TaskAnnounce
    Move --> MoveExecute[移動実行<br/>1ターン消費]
    Combat --> CombatFlow[戦闘フロー ※1]
    
    TaskAnnounce --> PlayerApproach[プレイヤー:<br/>アプローチ方法をチャット入力]
    PlayerApproach --> AIDifficulty[AI: 難易度判定<br/>アプローチの論理性を評価]
    
    AIDifficulty --> CheckSelect{チェック種別判定}
    CheckSelect --> DiceCheck[ダイスチェック<br/>攻撃系]
    CheckSelect --> PowerCheck[パワーチェック<br/>強行突破系]
    CheckSelect --> SkillCheck[スキルチェック<br/>技能系]
    
    DiceCheck --> CheckResult[チェック結果]
    PowerCheck --> CheckResult
    SkillCheck --> CheckResult
    
    CheckResult --> AIJudge[AI: 結果判定]
    AIJudge --> Success{成功？}
    
    Success -->|成功| Reward[報酬獲得<br/>・アイテム<br/>・マイルストーン達成<br/>・クリアフラグ]
    Success -->|失敗| Retry[難易度低下<br/>リトライ可能]
    
    Reward --> TurnEnd[ターン終了<br/>行動回数+1]
    Retry --> TurnEnd
    MoveExecute --> TurnEnd
    CombatFlow --> TurnEnd
    
    TurnEnd --> CompanionTrigger[WebSocket仲間システム<br/>・サーバー側状況分析<br/>・行動必要性判定]
    
    CompanionTrigger --> CompanionReaction{仲間反応判定<br/>・発言すべきか？<br/>・どの仲間が？}
    
    CompanionReaction -->|反応有り| CompanionAction[サーバー側仲間行動生成<br/>・AI生成メッセージ<br/>・WebSocketプッシュ]
    CompanionReaction -->|反応無し| DayCheck{1日の行動回数<br/>上限到達？}
    
    CompanionAction --> DayCheck
    DayCheck -->|未達| TurnStart
    DayCheck -->|達成| DayEnd[日付進行]
    
    DayEnd --> FinalDay{最終日？}
    FinalDay -->|No| TurnStart
    FinalDay -->|Yes| GameEnd[ゲーム終了判定]
    
    GameEnd --> ClearCheck{クリア条件<br/>達成？}
    ClearCheck -->|達成| Victory[ゲームクリア！]
    ClearCheck -->|未達成| GameOver[ゲームオーバー]
```

## 詳細フロー説明

### 1. セッション開始フェーズ
1. **キャラクター選択**: プレイヤーが操作するキャラクターを選択
2. **セッション時間設定**: プレイ時間を選択
   - **短時間プレイ**: 3日間、1日3アクション、マイルストーン1個、約30分
     - 日単位分割: 朝・昼・夜（3つの時間帯）
   - **中時間プレイ**: 7日間、1日4アクション、マイルストーン3個、約70分
     - 日単位分割: 朝・昼・夕方・夜（4つの時間帯）
   - **長時間プレイ**: 11日間、1日4アクション、マイルストーン5個、約2時間
     - 日単位分割: 朝・昼・夕方・夜（4つの時間帯）
   - **カスタム**: 自由設定（1日3～4アクション選択可能、日単位分割数も選択可能）
3. **AIセッション開始**: 設定を確認して「セッション開始」ボタンをクリック
4. **プール・マイルストーン生成**: AIが以下をバッチ処理で生成
   - **エンティティプール生成**: テーマに適応したエネミー、イベント、NPC、アイテム、クエストプールを生成
   - **マイルストーン自動生成**: 基本3個程度のマイルストーンを以下のタイプから選択して生成
     - 特定のエネミーを倒す（テーマにより無効化：ほのぼの日常など）
     - 特定のイベントをクリア
     - 特定のNPCとの特定のコミュニケーションの実施
     - キーアイテムの取得
     - クエストクリア
   - **場所連携設定**: イベント・エネミーを適切な場所に配置
5. **ゲーム概要アナウンス**: AIゲームマスターが世界観とシナリオを説明

### 2. 行動選択フェーズ
プレイヤーは以下の行動から選択：

#### a. 探索行動
- **マイルストーン関連**: マイルストーンに設定されたイベント・エネミー・NPCとの遭遇
- **プール内探索**: プール内のエネミー討伐・イベント体験・NPCとの自由対話
- **場所別コンテンツ**: 現在地に配置されたイベント・エネミーの発見
- 調査、追跡、偵察などの行動

#### b. 拠点行動
- 拠点タブに設定された施設での行動
- 買い物、休息、情報収集など

#### c. 仲間との交流
- パーティメンバーとのコミュニケーション
- 相談、作戦会議など

#### d. クエスト実行
- クエスト管理画面から選択
- メインクエスト、サブクエストの進行

#### e. 場所移動
- 現在地から別の場所へ移動
- 固定1ターン消費

#### f. 戦闘
- 「探索」タブが「戦闘」タブに切り替わる
- 詳細は戦闘フロー参照

### 3. タスク実行フェーズ

#### 3.1 インタラクティブイベント実行フロー
1. **イベント選択肢表示**: AIが複数の行動選択肢を提示（何択か）
2. **選択肢選択**: プレイヤーが希望する行動を選択
3. **GMクリア方針問いかけ**: AIゲームマスターが「どのようにタスクをクリアしますか？」と質問
4. **クリア方針説明**: プレイヤーがチャットで具体的な実行方針を説明
5. **AI難易度判定**: プレイヤーの方針に基づきAIが難易度を算出
6. **ダイスチェック実行**: 既存のダイスチェックUIとの連携
7. **結果判定・GM解説**: 成功・失敗に応じたGMの詳細な結果説明

#### 3.2 リトライシステム
- **リトライ可能**: 失敗時は何度でもリトライ可能
- **段階的難易度低下**: リトライごとに難易度が下がる
- **フィードバック変化**: リトライ回数に応じたGMのアドバイス内容変化

#### 3.3 従来のタスク実行（非イベント）
1. **タスク内容説明**: AIがタスクの詳細を説明
2. **アプローチ決定**: プレイヤーがチャットでアプローチ方法を入力
3. **難易度判定**: AIがアプローチの論理性を評価し、難易度を調整

### 4. チェック実行フェーズ
アプローチに応じて適切なチェックを実行：

- **ダイスチェック**: 攻撃や一般的な判定
- **パワーチェック**: 力技での突破
- **スキルチェック**: 特定技能を使用した判定

### 5. 結果処理フェーズ

#### 5.1 マイルストーン関連活動の成功時
- **マイルストーン達成**: 対象マイルストーンの進捗更新・完了
- **キーアイテム獲得**: マイルストーン必須アイテムの入手
- **クリアフラグ設定**: 重要イベント・NPCコミュニケーション完了
- **経験値・報酬獲得**: マイルストーン価値に応じた大きな報酬

#### 5.2 プール内活動の成功時（マイルストーン外）
- **良いフィードバック提供**: マイルストーン進展はないが、プレイヤー体験を向上
- **サブ報酬獲得**: 小さなアイテム・経験値・情報の入手
- **NPCとの関係性向上**: 自由対話による好感度上昇
- **世界観の深掘り**: 追加の背景情報・ストーリー要素の発見

#### 5.3 失敗時の処理
- **難易度が低下してリトライ可能**: すべての活動でリトライ機能提供
- **建設的フィードバック**: 失敗理由の説明と改善提案
- **状況に応じたペナルティ**: 軽微なペナルティ（時間消費のみなど）

### 6. ターン管理・仲間自律行動
- 各行動で1ターン消費
- 1日あたりの行動回数制限あり（日単位分割システム）：
  - **短時間プレイ**: 1日3アクション（朝・昼・夜の3つの時間帯）
  - **中時間プレイ**: 1日4アクション（朝・昼・夕方・夜の4つの時間帯）
  - **長時間プレイ**: 1日4アクション（朝・昼・夕方・夜の4つの時間帯）
  - **カスタム**: 3～4アクション選択可能（日単位分割数も選択可能）
- **WebSocket仲間自律システム**の実行：

#### 6.1 サーバー側状況分析フェーズ
1. **行動結果分析**: プレイヤーの行動結果と現在状況を分析
2. **仲間反応判定**: 各仲間キャラクターが反応すべきかを判定
3. **個性別反応生成**: キャラクター性格に基づいたAI反応生成
4. **WebSocket配信**: 生成されたメッセージをリアルタイムでプッシュ

#### 6.2 リアルタイム配信フェーズ
1. **即時配信**: AI生成された仲間メッセージを即座にクライアントにプッシュ
2. **チャット統合**: WebSocketメッセージがチャットインターフェースに自動表示
3. **状況更新**: 仲間の行動に基づいて次のAI監視サイクル更新
4. **継続監視**: WebSocketを通じて継続的なセッション監視実行

#### 6.3 キャラクター職業別反応パターン
- **戦士**: 戦術的アドバイス、危険察知、仲間保護
- **魔法使い**: 知識提供、魔法的解決策、慎重な判断
- **盗賊**: 危険回避、効率的ルート、隠し要素発見

#### 6.4 状況適応システム
- **成功連続時**: 励まし、次の挑戦提案
- **失敗連続時**: 慰め、戦略変更提案
- **リスク高時**: 警告、安全策提案
- **探索長期化時**: 休息提案、モチベーション維持

### 7. ゲーム終了判定
最終日の最終ターンで以下を確認：
- キーアイテムの所持
- マイルストーンのクリア状況
- 特定イベントのクリアフラグ
- その他、キャンペーン設定で定義されたクリア条件

## WebSocket仲間自律行動システム（※1）

```mermaid
flowchart TD
    PlayerAction([プレイヤー行動実行]) --> ServerReceive[サーバー側行動受信<br/>・WebSocket経由<br/>・セッション状態更新]
    
    ServerReceive --> AnalyzeSituation[状況分析<br/>・行動結果評価<br/>・セッション文脈把握<br/>・仲間反応必要性判定]
    
    AnalyzeSituation --> ShouldReact{仲間反応<br/>すべきか？}
    
    ShouldReact -->|Yes| SelectCharacter[反応キャラクター選択<br/>・状況に最適なキャラクター<br/>・前回発言からの間隔考慮<br/>・個性別得意分野判定]
    ShouldReact -->|No| MonitorContinue[監視継続<br/>・次の行動を待機]
    
    SelectCharacter --> GenerateMessage[AI仲間メッセージ生成<br/>・キャラクター性格反映<br/>・現在状況に基づく内容<br/>・自然なタイミング調整]
    
    GenerateMessage --> WebSocketPush[WebSocketプッシュ<br/>・即時配信<br/>・チャット統合<br/>・UI自動更新]
    
    WebSocketPush --> UpdateContext[セッション文脈更新<br/>・仲間発言履歴追加<br/>・次回反応準備<br/>・監視サイクル継続]
    
    UpdateContext --> MonitorContinue
    MonitorContinue --> PlayerAction
```

### WebSocketシステムの特徴

#### **リアルタイム応答メカニズム**
- **即時判定**: プレイヤー行動後、サーバー側で即座に反応判定
- **適切なタイミング**: 状況に応じた自然な反応タイミング
- **プッシュ配信**: WebSocketによる即時メッセージ配信
- **省エネ監視**: 必要時のみAI生成実行で効率的

#### **自然な会話流れ**
- **文脈保持**: セッション全体の文脈を踏まえた適切な反応
- **キャラクター一貫性**: 各仲間の性格・専門性を正確に反映
- **状況適応**: 現在の状況に最も適したキャラクターが発言
- **個性表現**: 戦士・魔法使い・盗賊の特色ある反応

#### **サーバー管理の利点**
- **集中管理**: セッション状態をサーバー側で一元管理
- **データ整合性**: WebSocketによる確実な状態同期
- **拡張性**: 新キャラクターや新機能の追加が容易
- **リアルタイム性**: 人間が操作しているような自然な反応速度

## 戦闘フロー（※2）

```mermaid
flowchart TD
    CombatStart([戦闘開始]) --> Initiative[イニシアチブ決定]
    Initiative --> TurnOrder[ターン順確定]
    TurnOrder --> PlayerTurn{プレイヤーターン}
    
    PlayerTurn --> CombatAction[行動選択]
    CombatAction --> Attack[攻撃]
    CombatAction --> UseItem[アイテム使用]
    CombatAction --> UseSkill[スキル使用]
    CombatAction --> Talk[コミュニケーション]
    CombatAction --> Escape[逃走]
    
    Attack --> DiceRoll[ダイスチェック]
    UseItem --> ItemSelect[アイテム選択・使用]
    UseSkill --> SkillSelect[スキル選択・発動]
    Talk --> TargetSelect[対象選択・会話]
    Escape --> EscapeCheck[逃走判定]
    
    DiceRoll --> Damage[ダメージ計算]
    ItemSelect --> Effect[効果発動]
    SkillSelect --> Effect
    TargetSelect --> Response[相手の反応]
    EscapeCheck --> EscapeResult{成功？}
    
    Damage --> EnemyTurn
    Effect --> EnemyTurn
    Response --> EnemyTurn
    EscapeResult -->|成功| CombatEnd[戦闘終了]
    EscapeResult -->|失敗| EnemyTurn
    
    EnemyTurn[敵ターン] --> EnemyAction[敵行動実行]
    EnemyAction --> CompanionTurn[仲間ターン]
    CompanionTurn --> CompanionAI[仲間AI行動]
    
    CompanionAI --> CheckEnd{戦闘終了？}
    CheckEnd -->|継続| PlayerTurn
    CheckEnd -->|終了| CombatEnd
```

### 戦闘詳細
- **1ターンに1回行動**: 攻撃、アイテム使用、スキル使用、会話、逃走から選択
- **仲間の自律行動**: AIが状況に応じて最適な行動を選択
- **敵の行動**: 基本的にAIが制御、一部は事前設定された行動パターン

## NPC・エネミー配置
- **NPC**: 各拠点に配属（宿屋、道具屋、武器屋の店主など）
- **エネミー**: 
  - クエストで指定された固定配置
  - AIが自律的に動かすランダムエンカウント

## 特記事項

### 仲間自律行動システムの革新的特徴
- **WebSocket AI**: サーバー側で状況を判断し、リアルタイムで仲間が自然に反応
- **適応的発言**: 行動結果に応じて最も適切なキャラクターが適切なタイミングで発言
- **自然な会話**: AIエージェントが人間プレイヤーを代理操作している前提での自然な反応
- **個性表現**: 各キャラクターの職業・性格に応じた独自の反応パターン

### AIゲームマスターとの連携（手探り体験の演出責任者）
- **内部進捗監視**: マイルストーン進捗を内部で追跡し、プレイヤーには絶対に直接表示しない
- **自然な誘導**: 「そういえば村の人が...」「気になる話を聞いたのですが...」等の自然な手がかり提示
- **暗示的演出**: 進捗に応じて状況描写を変化させ、プレイヤーが自然に次の行動を思いつくよう誘導
- **手探り感維持**: 「○○を達成しました」ではなく「何か重要な発見をしたようです」等の曖昧な表現
- **仲間システムとの連携**: 仲間キャラクターを通じてさりげなくヒントを提供
- **動的難易度調整**: プレイヤーのアプローチと内部進捗状況に応じた適切な難易度設定

### 技術的実装ポイント
- **WebSocket通信**: Socket.IOによる安定したリアルタイム通信
- **サーバー管理**: グローバルsocketService経由での統一的な仲間メッセージ管理
- **拡張性**: 新キャラクター・新反応パターンの追加が容易な設計
- **フォールト耐性**: WebSocket接続失敗時の適切なフォールバック機能

## マイルストーン・プールシステム詳細フロー

### マイルストーン構造と紐付けシステム

#### マイルストーンの基本構造
各マイルストーンは以下の要素から構成される：

1. **複数エンティティ紐付け**（基本3個）
   - `targetEntityIds`: 達成に必要なエンティティのIDリスト
   - `targetDetails`: 各エンティティの詳細な達成条件
   - `requiredConditions`: 達成に必要な前提条件

2. **エンティティタイプ組み合わせ例**
   ```
   マイルストーン: "村の謎を解明せよ"
   └── エネミー討伐: "怪しい影を倒す" (enemy-001)
   └── イベントクリア: "古い手紙を調査" (event-003)  
   └── NPCコミュニケーション: "村長から真実を聞く" (npc-002)
   ```

3. **達成判定ロジック**
   - すべての紐付けエンティティが達成されたときにマイルストーン完了
   - 部分達成でも進捗率が更新される（33%, 66%, 100%）
   - エンティティの達成順序は問わない（柔軟な攻略順）

#### エンティティ個別達成報酬システム

**各エンティティは独立した報酬を持つ**
```
エネミー討伐 (enemy-001):
├── 即時報酬: 戦闘経験値 50 EXP
├── アイテム: 怪しい布切れ
└── 情報: "影の正体に関する手がかり"

イベントクリア (event-003):
├── 即時報酬: 調査経験値 30 EXP  
├── アイテム: 古い鍵
└── 情報: "村の過去に関する重要な記録"

NPCコミュニケーション (npc-002):
├── 即時報酬: 社交経験値 40 EXP
├── 関係性: 村長好感度 +20
└── 情報: "事件の真相と解決策"
```

**マイルストーン完了時の追加報酬**
- 全エンティティ達成後のボーナス報酬
- ストーリー進行報酬
- 特別アイテム・称号の獲得

### 場所ベース行動表示システム

#### TRPGセッション右サイドバー行動表示の仕組み

**重要**: この機能はTRPGセッション中の**右サイドバー**で動作します。左サイドバーはメイン機能用で、TRPGセッション中のみ右側に専用サイドバーが表示されます。

**場所紐付けデータ構造**
```typescript
interface LocationEntity {
  entityId: string;
  entityType: 'enemy' | 'event' | 'npc' | 'item' | 'quest';
  locationId: string;
  isAvailable: boolean;
  displayConditions: string[];
  actionLabel: string; // 右サイドバー表示用ラベル
}
```

**右サイドバー表示ロジック**
1. **現在地確認**: プレイヤーの現在位置を取得
2. **エンティティフィルタ**: 現在地に紐付くエンティティを抽出
3. **可用性チェック**: 表示条件・前提条件を確認
4. **行動ボタン生成**: 達成可能なエンティティを右サイドバー行動ボタンとして表示

**右サイドバー表示例（プレイヤー視点）**
```
📍 現在地: 古い村の中央広場

🗡️ 可能な行動:
├── 🔍 "影の痕跡を調査"
├── 💬 "村長と話す" 
├── ⚔️ "怪しい影と戦う" [夜のみ]
└── 🎯 "古い井戸を調べる"

💭 気になるもの:
├── ❓ "この村には何か秘密がありそうだ..."
├── ❓ "住民たちが何かを隠している様子"
└── ❓ "夜になると不気味な気配を感じる"
```

#### 動的コンテンツ更新（プレイヤーには非表示の内部処理）
- **時間帯による変化**: 朝/昼/夕方/夜で表示内容が変化
- **前提条件**: 他のエンティティ達成により解放される行動
- **イベント状態**: 一度達成したエンティティは表示から除外
- **内部進捗管理**: マイルストーン関連のエンティティを内部で追跡（プレイヤーには非表示）

#### 右サイドバーからのアクション実行フロー

**行動選択→実行の流れ**
1. **右サイドバー行動選択**: プレイヤーが利用可能な行動ボタンをクリック
2. **行動詳細表示**: 選択した行動の詳細情報をメイン画面に表示
3. **アプローチ入力**: プレイヤーがチャットで具体的なアプローチ方法を説明
4. **AI難易度判定**: アプローチの論理性・創造性に基づく難易度算出
5. **チェック実行**: ダイス・パワー・スキルチェックのいずれかを実行
6. **結果処理**: 成功時は報酬付与・マイルストーン進捗更新、失敗時はリトライ提案

**内部マイルストーン進捗管理（プレイヤーには非表示）**
- エンティティ達成時に内部でマイルストーン進捗を更新（バックエンドのみ）
- 進捗率の変化（33% → 66% → 100%）を内部で管理
- AIゲームマスターがそれとなく進捗をほのめかすメッセージを生成
- 完了したエンティティは右サイドバーから除外（理由は自然に演出）

#### エンティティ個別報酬システムの詳細実装

**即時報酬配布システム**
各エンティティ達成時に以下の即時報酬が配布されます：

```typescript
interface EntityReward {
  entityId: string;
  entityType: 'enemy' | 'event' | 'npc' | 'item' | 'quest';
  immediateRewards: {
    experience: number;           // 即時経験値
    items: PoolItem[];           // 獲得アイテム
    information: string[];        // 入手情報・手がかり
    relationships?: {             // NPC関係性（NPC系のみ）
      npcId: string;
      relationshipChange: number; // 好感度変化
    }[];
  };
  milestoneContribution: {
    milestoneId: string;
    progressContribution: number; // 33%, 66%, etc.
  }[];
}
```

**報酬配布タイミング（プレイヤー体験重視）**
1. **エンティティチェック成功時**: 即座に個別報酬を配布
2. **右サイドバー更新**: 完了したエンティティを自然に除外（「もう調べる必要がなさそうだ」等）
3. **内部進捗計算**: 該当マイルストーンの進捗率を内部で更新（非表示）
4. **AIゲームマスターヒント**: 進捗に応じてそれとなく次の手がかりを提示
5. **ボーナス報酬判定**: マイルストーン完了時は自然な流れで追加報酬を配布

**複数マイルストーン紐付けの処理**
- 1つのエンティティが複数のマイルストーンに紐付けられている場合
- 達成時にすべての関連マイルストーンの進捗が同時に更新される
- 各マイルストーンで異なる進捗貢献度を持つことが可能

### セッション開始時生成システムフロー（トップダウン設計）

```mermaid
flowchart TD
    SessionStart([「セッション開始！」押下]) --> ThemeAnalysis[Phase 1: 目標設計<br/>・キャンペーンテーマ分析<br/>・プレイ時間・難易度確認<br/>・許可エンティティタイプ決定]
    
    ThemeAnalysis --> MilestoneOutline[マイルストーン概要生成<br/>・基本3個のストーリー目標<br/>・「村の謎解明」「遺跡探索」等<br/>・抽象レベルでの目標設定]
    
    MilestoneOutline --> MilestoneRelation[マイルストーン関係性設定<br/>・独立型 vs 連鎖型<br/>・難易度グラデーション<br/>・プレイ時間配分]
    
    MilestoneRelation --> Phase2[Phase 2: コンテンツ生成]
    
    Phase2 --> EntityRequirement[マイルストーン必須エンティティ決定<br/>・各マイルストーンに3エンティティ<br/>・エネミー・イベント・NPC・アイテム・クエスト<br/>・テーマ制約適用]
    
    EntityRequirement --> CoreEntityGeneration[コアエンティティプール生成<br/>・マイルストーン必須: 9個<br/>・AIがテーマ適応生成<br/>・達成条件と報酬設定]
    
    CoreEntityGeneration --> AdditionalEntityGeneration[追加エンティティプール生成<br/>・自由探索用: 6個程度<br/>・世界観深化コンテンツ<br/>・サブ報酬系エンティティ]
    
    AdditionalEntityGeneration --> LocationGeneration[場所生成・配置最適化<br/>・エンティティに適した場所生成<br/>・論理的な場所間つながり<br/>・移動効率を考慮した配置]
    
    LocationGeneration --> Phase3[Phase 3: 最終調整]
    
    Phase3 --> MilestoneDetailization[マイルストーン詳細化<br/>・具体的エンティティIDとの紐付け<br/>・達成条件の具体化<br/>・進捗率配分決定]
    
    MilestoneDetailization --> BalanceAdjustment[バランス調整<br/>・難易度確認・調整<br/>・プレイ時間配分確認<br/>・エンティティ配置の論理性確認]
    
    BalanceAdjustment --> DatabaseCommit[データベース一括コミット<br/>・マイルストーンテーブル<br/>・エンティティプールテーブル<br/>・場所紐付けテーブル]
    
    DatabaseCommit --> GameReady[ゲーム開始準備完了<br/>・右サイドバー初期表示<br/>・AIゲームマスター初期化<br/>・セッション状態初期化]
```

### インタラクティブイベントシステムフロー（手探り体験重視）

```mermaid
flowchart TD
    EventEncounter([イベント遭遇]) --> EventType{イベントタイプ<br/>判定}
    
    EventType -->|内部マイルストーン| HiddenMilestoneEvent[内部マイルストーン<br/>関連イベント<br/>※プレイヤーには非表示]
    EventType -->|プール内| PoolEvent[プール内<br/>自由イベント]
    
    HiddenMilestoneEvent --> NaturalPresentation[自然な状況描写<br/>・AIが目標を暗示する状況生成<br/>・プレイヤーが自然に気づく仕掛け]
    PoolEvent --> NaturalPresentation
    
    NaturalPresentation --> PlayerChoice[プレイヤー選択<br/>・手探りで行動方針決定]
    
    PlayerChoice --> GMSubtleGuide[GM微妙な誘導<br/>「そういえば...」<br/>「気になることが...」<br/>※直接的でない助言]
    
    GMSubtleGuide --> PlayerExplanation[プレイヤー方針説明<br/>・チャットで具体的実行方法入力<br/>・創造性・論理性を含む説明]
    
    PlayerExplanation --> AIDifficulty[AI難易度判定<br/>・方針の論理性評価<br/>・実現可能性分析<br/>・ダイス目標値算出]
    
    AIDifficulty --> DiceCheck[ダイスチェック実行<br/>・既存UIとの統合<br/>・適切なチェック種別選択]
    
    DiceCheck --> ResultJudge{結果判定}
    
    ResultJudge -->|成功| SuccessResult[成功処理<br/>・GM詳細解説<br/>・報酬獲得<br/>・内部進捗更新（非表示）<br/>・次の手がかりほのめかし]
    ResultJudge -->|失敗| FailureResult[失敗処理<br/>・GM建設的フィードバック<br/>・リトライ提案]
    
    FailureResult --> RetryOption{リトライ？}
    RetryOption -->|Yes| DifficultyReduce[難易度低下<br/>・目標値を下げる<br/>・GMアドバイス更新]
    RetryOption -->|No| TurnEnd[ターン終了]
    
    DifficultyReduce --> PlayerExplanation
    SuccessResult --> TurnEnd
```

### プール内活動フィードバックシステム

```mermaid
flowchart TD
    PoolActivity([プール内活動実行]) --> ActivityType{活動タイプ}
    
    ActivityType --> PoolEnemy[プール内エネミー討伐]
    ActivityType --> PoolEvent[プール内イベント体験]
    ActivityType --> PoolNPC[プール内NPC対話]
    ActivityType --> PoolItem[プール内アイテム探索]
    
    PoolEnemy --> EnemyReward[エネミー討伐報酬<br/>・戦闘経験値<br/>・小アイテム獲得<br/>・戦術スキル向上]
    PoolEvent --> EventExperience[イベント体験価値<br/>・世界観理解深化<br/>・追加情報獲得<br/>・キャラクター成長]
    PoolNPC --> NPCRelation[NPC関係性向上<br/>・好感度上昇<br/>・特別情報入手<br/>・将来的協力関係]
    PoolItem --> ItemDiscovery[アイテム発見<br/>・便利道具獲得<br/>・希少素材収集<br/>・クラフト材料確保]
    
    EnemyReward --> FeedbackGeneration[良いフィードバック生成<br/>・プレイヤー満足度向上<br/>・継続プレイ動機維持]
    EventExperience --> FeedbackGeneration
    NPCRelation --> FeedbackGeneration
    ItemDiscovery --> FeedbackGeneration
    
    FeedbackGeneration --> ExperienceBoost[体験価値向上<br/>・マイルストーン外でも<br/>充実したゲーム体験<br/>・自由度の高い探索奨励<br/>・手探り感を損なわない報酬]
```

### 開発者モード管理フロー

```mermaid
flowchart TD
    DevMode([開発者モード]) --> EntitySelect[エンティティ選択<br/>・エネミー<br/>・イベント<br/>・NPC<br/>・アイテム<br/>・マイルストーン]
    
    EntitySelect --> EnemyMgmt[エネミー管理画面]
    EntitySelect --> EventMgmt[イベント管理画面]
    EntitySelect --> NPCMgmt[NPC管理画面]
    EntitySelect --> ItemMgmt[アイテム管理画面]
    EntitySelect --> MilestoneMgmt[マイルストーン管理画面]
    
    EnemyMgmt --> EnemyEdit[エネミー編集<br/>・能力値調整<br/>・場所配置設定<br/>・報酬設定<br/>・AI行動パターン]
    EventMgmt --> EventEdit[イベント編集<br/>・内容詳細編集<br/>・選択肢設定<br/>・結果分岐編集<br/>・場所紐付け]
    NPCMgmt --> NPCEdit[NPC編集<br/>・個性・性格設定<br/>・対話パターン編集<br/>・コミュニケーション条件<br/>・提供情報設定]
    ItemMgmt --> ItemEdit[アイテム編集<br/>・効果・説明編集<br/>・入手方法設定<br/>・希少度調整<br/>・価値設定]
    MilestoneMgmt --> MilestoneEdit[マイルストーン編集<br/>・達成条件詳細<br/>・進捗監視<br/>・報酬設定<br/>・優先度調整]
    
    EnemyEdit --> SaveChanges[変更保存<br/>・リアルタイム反映<br/>・セッション継続中更新<br/>・整合性チェック]
    EventEdit --> SaveChanges
    NPCEdit --> SaveChanges
    ItemEdit --> SaveChanges
    MilestoneEdit --> SaveChanges
```

### テーマ適応システム

#### テーマ別制約・特徴

**ほのぼの日常テーマ**
- ✅ **有効**: イベント、NPC対話、アイテム獲得、クエスト
- ❌ **無効**: エネミー討伐マイルストーン
- 🎯 **特化**: 料理、手芸、農業、友情、地域貢献系イベント

**ホラーミステリーテーマ**
- ✅ **有効**: 全マイルストーンタイプ対応
- 🎯 **特化**: 謎解き、証拠収集、真犯人発見、呪い解除

**クラシックファンタジーテーマ**
- ✅ **有効**: 全マイルストーンタイプ対応
- 🎯 **特化**: 魔王討伐、伝説武器獲得、古代遺跡探索

**SF宇宙冒険テーマ**
- ✅ **有効**: 全マイルストーンタイプ対応（エネミー=エイリアン等）
- 🎯 **特化**: 未知技術獲得、惑星探索、宇宙戦争