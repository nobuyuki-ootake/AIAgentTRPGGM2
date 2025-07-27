# Test Data Organization - t-WADA Pattern

このディレクトリは、AIAgentTRPGGMプロジェクトのテストデータを t-WADA パターンに従って整理したものです。

## 📁 ディレクトリ構造

```
test-data/
├── fixtures/         # 実際のデータに近い固定データ
├── mocks/            # 完全なダミーデータ  
├── stubs/            # 最小限の代替実装
├── factories/        # テストデータ生成ファクトリ
└── README.md         # このファイル
```

## 🎯 各ディレクトリの用途

### fixtures/ - フィクスチャ（固定データ）
実際の本番環境に近いリアルなテストデータです。

**用途:**
- E2Eテストでの現実的なシナリオ
- UIテストでの実際のデータ表示確認
- 統合テストでの複雑なデータ関係性テスト

**命名規則:** `fixture{エンティティ名}.ts`

**例:**
- `fixtureCampaignList.ts` - 現実的なキャンペーンリスト
- `fixtureSessionFlow.ts` - 実際のセッション進行データ
- `fixtureCharacterParty.ts` - バランスの取れたパーティ構成

### mocks/ - モックデータ（完全なダミー）
テスト用の完全なダミーデータです。プロダクション型定義に完全準拠。

**用途:**
- ユニットテストでの基本動作確認
- コンポーネントの表示テスト
- API レスポンステスト

**命名規則:** `mock{エンティティ名}.ts`

**例:**
- `mockCampaign.ts` - 基本的なキャンペーンデータ
- `mockCharacters.ts` - PC/NPC/Enemy キャラクター
- `mockSessions.ts` - セッションデータ

### stubs/ - スタブ（最小限実装）
実際のサービスやAPIの最小限代替実装です。

**用途:**
- 外部依存を持つコンポーネントのテスト
- AI サービスの代替実装
- データベース操作の代替実装

**命名規則:** `stub{サービス名}.ts`

**例:**
- `stubAIService.ts` - AI サービスの代替実装
- `stubDatabaseService.ts` - データベースの代替実装
- `stubWebSocketService.ts` - WebSocket の代替実装

### factories/ - ファクトリ（データ生成器）
テストデータを動的に生成するためのファクトリクラスです。

**用途:**
- テストケースごとのカスタムデータ生成
- 大量のテストデータ生成
- フルエントインタフェースでの柔軟な設定

**命名規則:** `{エンティティ名}Factory.ts`

**例:**
- `CampaignFactory.ts` - キャンペーンデータ生成
- `CharacterFactory.ts` - キャラクターデータ生成
- `SessionFactory.ts` - セッションデータ生成

## 🔧 使用方法

### 基本的なインポート

```typescript
// フィクスチャ（E2Eテスト）
import { fixtureCampaignList } from '../test-data/fixtures/fixtureCampaignList';

// モック（ユニットテスト）
import { mockCampaign } from '../test-data/mocks/mockCampaign';

// スタブ（統合テスト）
import { stubAIService } from '../test-data/stubs/stubAIService';

// ファクトリ（動的生成）
import { CampaignFactory } from '../test-data/factories/CampaignFactory';
```

### ファクトリの使用例

```typescript
// フルエントインタフェースでのデータ生成
const campaign = new CampaignFactory()
  .withTitle('テストキャンペーン')
  .withDifficulty('normal')
  .withPlayers(4)
  .build();

// 複数データの生成
const campaigns = CampaignFactory.createMultiple(5);
```

## 📋 重要ルール

### 1. 型安全性の最優先
- **すべてのテストデータは本番型定義（@ai-agent-trpg/types）を使用**
- テスト専用の型定義は作成禁止
- any型の使用は避ける

### 2. AAA パターン対応
すべてのテストデータは AAA パターン（Arrange, Act, Assert）に対応：

```typescript
describe('キャンペーン作成', () => {
  it('正常なデータでキャンペーンが作成される', () => {
    // Arrange - 準備
    const campaignData = mockCampaign;
    
    // Act - 実行
    const result = createCampaign(campaignData);
    
    // Assert - 検証
    expect(result.success).toBe(true);
  });
});
```

### 3. 現実的なTRPGシナリオ
- D&D5e, Pathfinder などの実際のシステムに準拠
- 現実的なキャラクター能力値とバランス
- 実際のTRPGセッションの流れを反映

### 4. 保守性とスケーラビリティ
- データ変更時の影響範囲を最小化
- 再利用可能なコンポーネントベース設計
- 明確な責任分離

## 🎲 TRPG 特化データ設計

### キャラクター設計原則
- **バランスの取れた能力値:** 極端に強い/弱いキャラクターは避ける
- **多様性の確保:** 戦士、魔法使い、盗賊、僧侶などの典型的な役割
- **成長要素:** レベルアップやスキル習得の要素を含む

### セッション設計原則
- **典型的な進行:** 探索→戦闘→報酬のサイクル
- **プレイヤー相互作用:** パーティ間の協力要素
- **AI制御要素:** NPCの自動行動とプレイヤーとの対話

### キャンペーン設計原則
- **段階的な難易度:** 初心者から上級者まで対応
- **ストーリー連続性:** イベント間の論理的なつながり
- **プレイヤー選択:** 複数の解決方法がある問題設定

## 🔄 継続的改善

このテストデータ構造は、プロジェクトの進化とともに継続的に改善されます：

1. **新機能追加時:** 対応するテストデータの追加
2. **バグ発見時:** 再現用テストデータの作成
3. **パフォーマンス改善:** より効率的なデータ構造への変更
4. **型定義変更:** テストデータの自動更新

---

**注意:** このテストデータは学習目的のプロジェクトで使用されています。実際のゲームデータや個人情報は含まれていません。