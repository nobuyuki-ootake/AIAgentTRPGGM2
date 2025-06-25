# TRPGシナリオ管理システム - マイルストーン・エンティティプール設計

## 概要

TRPGセッションにおけるシナリオ生成・管理システムの詳細仕様です。プレイヤーが手探りでゲームを進めながら、充実した物語体験と報酬システムを提供します。

## 🎯 基本設計思想

### トップダウンアプローチの採用理由

**1. AI生成の効率性・一貫性**
- マイルストーン（目標）が先に決まることで、AIが目的意識を持ってエンティティを生成
- 散発的な要素ではなく、連結した物語要素を確実に生成
- 後付けでストーリーを作る無理やり感を排除

**2. プレイヤー体験の質的向上**
- **手探り感の演出**: マイルストーンという「答え」があってこそ、AIゲームマスターがプレイヤーを適切に誘導できる
- **達成感の保証**: 全エンティティがマイルストーン達成に寄与するため、プレイヤーの行動に意味がある
- **ストーリーの一貫性**: 散発的な要素ではなく、連結した物語体験

**3. 実装上の安全性**
- マイルストーンが先に決まるため、エンティティとの紐付けが確実
- 進捗計算の論理的整合性を保証
- データベース整合性の維持

## 📋 生成システムフロー

### Phase 1: 目標設計
```
1. テーマ分析
   ↓
2. マイルストーン概要生成（3個程度）
   ↓ 
3. マイルストーン間の関係性設定
```

### Phase 2: コンテンツ生成
```
4. マイルストーン必須エンティティ決定
   ↓
5. コアエンティティプール生成（9個程度）
   ↓
6. 追加エンティティプール生成（6個程度）
   ↓
7. 場所生成・配置最適化
```

### Phase 3: 最終調整
```
8. マイルストーン詳細化
   ↓
9. バランス調整
   ↓
10. データベース一括コミット
```

## 🎭 マイルストーンシステム

### マイルストーンの特徴
- **プレイヤーには非表示**: 進捗バーや達成状況を直接表示しない
- **AIゲームマスター専用**: 内部進捗管理とプレイヤー誘導に使用
- **暗示的演出**: 「そういえば...」「気になることが...」等の自然な誘導

### マイルストーンタイプ
1. **特定エネミー討伐**（テーマにより無効化：ほのぼの日常等）
2. **特定イベントクリア**
3. **特定NPCとの特定コミュニケーション**
4. **キーアイテム取得**
5. **クエストクリア**

### 複数エンティティ紐付けシステム
```typescript
interface Milestone {
  id: string;
  title: string; // プレイヤーには非表示
  description: string; // プレイヤーには非表示
  targetEntityIds: string[]; // 基本3個のエンティティ
  progressContributions: number[]; // [33%, 33%, 34%] 等
  status: 'pending' | 'in_progress' | 'completed';
  hiddenProgress: number; // 0-100、プレイヤーには非表示
}
```

## 🎲 エンティティプールシステム

### エンティティプール構成

#### 1. コアエンティティ（マイルストーン必須）
**数量**: 9個程度（3マイルストーン × 3エンティティ）
**特徴**: 
- 各マイルストーン達成に必須
- ストーリーの核となる要素
- 達成時にマイルストーン進捗が更新される

**例：「村の謎解明」マイルストーン**
```typescript
coreEntities = [
  {
    id: "evidence-001",
    type: "event",
    title: "血痕の調査",
    milestoneId: "village-mystery",
    progressContribution: 33,
    rewards: {
      experience: 50,
      information: ["犯人は左利きの可能性"],
      items: []
    }
  },
  {
    id: "witness-001", 
    type: "npc",
    title: "目撃者との対話",
    milestoneId: "village-mystery",
    progressContribution: 33,
    rewards: {
      experience: 40,
      information: ["事件当夜の怪しい人影"],
      relationships: [{ npcId: "witness-001", change: +20 }]
    }
  },
  {
    id: "culprit-001",
    type: "enemy", 
    title: "真犯人との対決",
    milestoneId: "village-mystery",
    progressContribution: 34,
    rewards: {
      experience: 80,
      information: ["事件の真相"],
      items: ["stolen-evidence"]
    }
  }
]
```

#### 2. 追加エンティティ（報酬・体験向上系）
**数量**: 6個程度
**特徴**:
- マイルストーン達成には寄与しない
- プレイヤーの探索意欲・満足度向上
- 多様な報酬でゲーム体験を豊かにする

##### a. 実用的報酬エンティティ
```typescript
practicalEntities = [
  {
    id: "healing-herb-001",
    type: "item",
    title: "薬草の発見",
    rewards: {
      items: [
        { name: "上級治療薬", effect: "HP+50", quantity: 3 },
        { name: "魔力回復薬", effect: "MP+30", quantity: 2 }
      ],
      experience: 20
    }
  },
  {
    id: "equipment-cache-001", 
    type: "event",
    title: "古い武器庫の発見",
    rewards: {
      items: [
        { name: "魔法強化の剣", effect: "攻撃力+15", rarity: "rare" },
        { name: "守護の盾", effect: "防御力+12", rarity: "uncommon" }
      ],
      experience: 30
    }
  },
  {
    id: "merchant-encounter-001",
    type: "npc", 
    title: "行商人との出会い",
    rewards: {
      shop_access: true,
      information: ["他の村の情報", "珍しい商品の情報"],
      relationships: [{ npcId: "traveling-merchant", change: +15 }]
    }
  }
]
```

##### b. トロフィー・収集系エンティティ
```typescript
trophyEntities = [
  {
    id: "collectible-001",
    type: "item",
    title: "古い人形の発見", 
    rewards: {
      items: [
        { 
          name: "村娘の人形", 
          effect: "なし", 
          description: "昔の職人が作った精巧な人形。特に効果はないが、村の歴史を感じさせる。",
          category: "trophy",
          rarity: "unique"
        }
      ],
      information: ["村の古い伝統について"],
      experience: 10
    }
  },
  {
    id: "lore-discovery-001",
    type: "event",
    title: "古い碑文の解読",
    rewards: {
      information: [
        "村の建立者について",
        "隠された歴史の断片",
        "古代語の知識"
      ],
      items: [
        {
          name: "古代文字の写し",
          effect: "なし",
          description: "学者なら喜びそうな古代文字の記録。実用性はないが、知的好奇心を満たす。",
          category: "trophy"
        }
      ],
      experience: 25
    }
  },
  {
    id: "easter-egg-001",
    type: "npc",
    title: "謎めいた老人との遭遇",
    rewards: {
      items: [
        {
          name: "謎の石ころ",
          effect: "なし", 
          description: "『いつか役に立つかもしれない』と老人が言っていた普通の石。本当に普通の石のようだ。",
          category: "mystery_item"
        }
      ],
      information: ["意味深な言葉", "世界の不思議について"],
      experience: 5
    }
  }
]
```

### エンティティ配置戦略

#### 場所ベース配置
```typescript
interface LocationEntityMapping {
  locationId: string;
  locationName: string;
  coreEntities: string[]; // マイルストーン必須
  bonusEntities: string[]; // 追加報酬系
  timeConditions?: string[]; // "night_only", "after_rain" 等
  prerequisiteEntities?: string[]; // 前提条件
}

// 配置例
locationMappings = [
  {
    locationId: "village-center",
    locationName: "村の中央広場", 
    coreEntities: ["witness-001"], // 目撃者との対話
    bonusEntities: ["merchant-encounter-001"], // 行商人
    timeConditions: ["day_time"]
  },
  {
    locationId: "crime-scene",
    locationName: "事件現場",
    coreEntities: ["evidence-001"], // 血痕の調査
    bonusEntities: ["collectible-001"], // 古い人形
    timeConditions: ["any"]
  },
  {
    locationId: "old-warehouse", 
    locationName: "古い倉庫",
    coreEntities: ["culprit-001"], // 真犯人との対決
    bonusEntities: ["equipment-cache-001"], // 武器庫発見
    timeConditions: ["night_only"],
    prerequisiteEntities: ["evidence-001", "witness-001"] // 証拠と証言が必要
  }
]
```

## 🎮 プレイヤー体験設計

### 手探り感の演出技法

#### 1. 右サイドバー表示（プレイヤー視点）
```
📍 現在地: 村の中央広場

🗡️ 可能な行動:
├── 🔍 "血痕を調査する"
├── 💬 "住民と話す"
├── 🎯 "怪しい建物を調べる"
└── ✨ "広場をよく観察する"

💭 気になるもの:
├── ❓ "この村には何か秘密がありそうだ..."
├── ❓ "住民たちが何かを隠している様子"
└── ❓ "夜になると不気味な気配を感じる"
```

#### 2. AIゲームマスターの暗示的誘導
**マイルストーン進捗0%時**:
> "村人たちは皆、何かに怯えているようです。特に夜の話になると、急に口を閉ざしてしまいます..."

**マイルストーン進捗33%時（証拠発見後）**:
> "血痕を調べた結果、興味深い発見がありました。この手がかりを誰かに相談してみると、新たな情報が得られるかもしれませんね..."

**マイルストーン進捗66%時（証人との対話後）**:
> "目撃者の証言と現場の証拠が一致しました。真実に近づいている実感があります。そういえば、最近古い倉庫の方で物音がするという話を聞きましたが..."

#### 3. 報酬発見の自然な演出
**実用的報酬**:
> "倉庫の奥で古い武器庫を発見しました。中には使えそうな装備が眠っています。冒険者にとっては嬉しい発見ですね。"

**トロフィー系報酬**:
> "古い人形を見つけました。特に実用性はありませんが、村の歴史を感じさせる品です。なぜかほっとする気持ちになります。"

**ミステリー系報酬**:
> "謎めいた老人から石ころをもらいました。『いつか役に立つ』と言っていましたが...まあ、記念品として持っておくのも悪くないでしょう。"

## 🔧 技術実装仕様

### データベース設計

#### マイルストーンテーブル
```sql
CREATE TABLE ai_milestones (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  title TEXT NOT NULL, -- プレイヤー非表示
  description TEXT NOT NULL, -- プレイヤー非表示
  type TEXT NOT NULL,
  target_entity_ids TEXT NOT NULL, -- JSON配列
  progress_contributions TEXT NOT NULL, -- JSON配列 [33, 33, 34]
  status TEXT NOT NULL DEFAULT 'pending',
  hidden_progress INTEGER NOT NULL DEFAULT 0, -- プレイヤー非表示
  created_at TEXT NOT NULL,
  completed_at TEXT
);
```

#### エンティティプールテーブル
```sql
CREATE TABLE entity_pools (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  theme_id TEXT NOT NULL,
  core_entities TEXT NOT NULL, -- JSON: マイルストーン必須
  bonus_entities TEXT NOT NULL, -- JSON: 追加報酬系
  generated_at TEXT NOT NULL,
  last_updated TEXT NOT NULL
);
```

#### 場所エンティティマッピングテーブル
```sql
CREATE TABLE location_entity_mappings (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'core' | 'bonus'
  time_conditions TEXT, -- JSON配列
  prerequisite_entities TEXT, -- JSON配列
  is_available BOOLEAN DEFAULT TRUE,
  discovered_at TEXT
);
```

### API実装方針

#### エンドポイント設計
```typescript
// セッション開始時の一括生成
POST /api/ai-milestone-generation/generate-scenario
{
  campaignId: string,
  sessionId: string, 
  themeId: string,
  sessionDuration: SessionDurationConfig,
  milestoneCount: number = 3
}

// レスポンス
{
  milestones: AIMilestone[], // プレイヤー非表示
  entityPool: {
    core: CoreEntity[], // マイルストーン必須
    bonus: BonusEntity[] // 追加報酬系
  },
  locationMappings: LocationEntityMapping[],
  generationMetadata: {
    processingTime: number,
    aiProvider: string,
    themeAdaptations: string[]
  }
}
```

## 🎯 バランス設計指針

### 報酬配分バランス
- **コアエンティティ**: 高経験値、マイルストーン進捗、ストーリー情報
- **実用的ボーナス**: 中経験値、装備・回復アイテム、戦闘支援
- **トロフィー系**: 低経験値、収集要素、世界観深化
- **ミステリー系**: 最低経験値、好奇心満足、隠し要素

### プレイ時間配分目安
```
短時間プレイ（30分）:
- コアエンティティ: 3個（各5分）
- ボーナスエンティティ: 3個（各3分）
- 移動・思考時間: 12分

中時間プレイ（70分）:
- コアエンティティ: 9個（各5分）
- ボーナスエンティティ: 6個（各3分）
- 移動・思考時間: 7分

長時間プレイ（120分）:
- コアエンティティ: 15個（各5分）
- ボーナスエンティティ: 9個（各3分）
- 移動・思考時間: 18分
```

## 📈 継続改善要素

### プレイヤーフィードバック収集
1. **エンティティ達成率**: どのエンティティが発見されやすいか
2. **滞在時間**: 各場所での平均滞在時間
3. **リトライ率**: どのエンティティでリトライが多いか
4. **満足度**: トロフィー系エンティティの受け取られ方

### AI生成品質向上
1. **テーマ適応精度**: テーマに沿ったエンティティ生成率
2. **ストーリー整合性**: マイルストーンとエンティティの論理的つながり
3. **難易度調整**: プレイヤーレベルに応じた適切な難易度
4. **多様性**: 同じテーマでも異なるシナリオバリエーション

---

この設計により、プレイヤーは手探りでゲームを進めながらも、充実した報酬と物語体験を得られる、バランスの取れたTRPGシナリオシステムが実現されます。