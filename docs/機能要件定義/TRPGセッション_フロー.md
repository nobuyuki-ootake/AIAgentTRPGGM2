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
2. **AIセッション開始**: 「AIセッションを開始します」ボタンをクリック
3. **ゲーム概要アナウンス**: AIゲームマスターが世界観とシナリオを説明

### 2. 行動選択フェーズ
プレイヤーは以下の行動から選択：

#### a. 探索行動
- マイルストーンに設定されたイベントから選択
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
1. **タスク内容説明**: AIがタスクの詳細を説明
2. **アプローチ決定**: プレイヤーがチャットでアプローチ方法を入力
3. **難易度判定**: AIがアプローチの論理性を評価し、難易度を調整

### 4. チェック実行フェーズ
アプローチに応じて適切なチェックを実行：

- **ダイスチェック**: 攻撃や一般的な判定
- **パワーチェック**: 力技での突破
- **スキルチェック**: 特定技能を使用した判定

### 5. 結果処理フェーズ
- **成功時**: 
  - アイテム獲得
  - マイルストーン達成
  - クリアフラグ設定
  - 経験値獲得
  
- **失敗時**:
  - 難易度が低下してリトライ可能
  - 状況に応じたペナルティ

### 6. ターン管理・仲間自律行動
- 各行動で1ターン消費
- 1日あたりの行動回数制限あり（通常3回）
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

### AIゲームマスターとの連携
- AIゲームマスターは常にプレイヤーの行動を監視し、適切な演出とフィードバックを提供
- 仲間システムとGMは独立して動作し、自然な多角的サポートを実現
- 難易度はプレイヤーのアプローチによって動的に調整される

### 技術的実装ポイント
- **WebSocket通信**: Socket.IOによる安定したリアルタイム通信
- **サーバー管理**: グローバルsocketService経由での統一的な仲間メッセージ管理
- **拡張性**: 新キャラクター・新反応パターンの追加が容易な設計
- **フォールト耐性**: WebSocket接続失敗時の適切なフォールバック機能