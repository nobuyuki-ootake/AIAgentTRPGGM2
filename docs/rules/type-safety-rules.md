# 型安全性ルール

このファイルは AIAgentTRPGGM プロジェクトの型安全性に関する重要なルールをまとめています。

## 基本方針

### TypeScript の活用
- **any 型の使用を避ける**
- TypeScript の型システムの恩恵を最大限受ける
- 型安全性を優先した実装

### 共通型定義の運用
- **プロジェクト共通の型定義は `packages/types/index.ts` を使用**
- フロントエンド・バックエンド共通で使用する型はここに集約
- 画面間や proxy-server との連携で齟齬を防ぐ

## 型定義ファイルの構成

### ファイル位置
```
packages/types/index.ts   # 共通型定義
```

### 含まれる型
- TRPGCampaign（キャンペーン）
- TRPGCharacter（キャラクター）
- TRPGEnemy（エネミー）
- TRPGEvent（イベント）
- キャラクター動作のためのイベント型
- その他プロジェクト共通型

## 型定義運用ルール

### 共通型の優先使用
- **ファイル内での一時的な型定義はできるだけ避ける**
- 共通の型の仕様を優先使用
- 新しい型が必要な場合は packages/types に追加検討

### 型定義修正時の注意点
- **共通型定義修正時は他ページの使用箇所も同時修正**
- 影響範囲の確認を徹底
- 破壊的変更の場合は慎重に実施

## テストデータの型安全性

### 最重要ルール
- **テストデータ用の型定義は絶対に作成しない**
- **テストデータは本番と同じ型を使って作成**
- **型変換が不要なテストデータの作成**

### 正しいテストデータ作成
```typescript
// ✅ 正しい例
import { TRPGCampaign, TRPGCharacter } from '@/packages/types';

export const testCampaign: TRPGCampaign = {
  id: 'test-campaign-1',
  name: 'テストキャンペーン',
  // ... 本番と同じ型構造
};

export const testCharacter: TRPGCharacter = {
  id: 'test-character-1',
  name: 'テストキャラクター',
  // ... 本番と同じ型構造
};
```

### 禁止パターン
```typescript
// ❌ 禁止例1: テストデータ用型定義
interface TestCampaignData {
  // テスト用の型定義は禁止
}

// ❌ 禁止例2: 互換性のある型
type CompatibleCampaign = Partial<TRPGCampaign>;

// ❌ 禁止例3: ローカルヘルパー関数による型変換
function convertToTestData(campaign: TRPGCampaign): any {
  // 型変換による使い捨て型作成は禁止
}
```

## 型エラー対応

### 修正優先順位
1. **テストデータが本番型と異なる場合 → テストデータを修正**
2. 本番型定義の修正が必要な場合 → packages/types を修正
3. 影響範囲の確認と他ファイルの同時修正

### ローカル型変換の禁止
- **ローカルでヘルパー関数を作って型変換する実装は禁止**
- 使い捨て型の大量生成を防ぐ
- 適切な型運用自体を修正する

## 型安全性のメリット

### 開発時の利点
- コンパイル時エラー検出
- IDE による強力な補完・リファクタリング支援
- ランタイムエラーの削減

### 保守性の向上
- 型による自己文書化
- リファクタリング時の安全性
- 破壊的変更の早期発見

## 型定義のベストプラクティス

### 命名規則
- TRPG 関連の型は `TRPG` プレフィックス
- 明確で説明的な型名
- 一貫性のある命名パターン

### 型の設計原則
- 必要最小限の型定義
- 拡張性を考慮した設計
- nullable / undefined の明確な区別

### インポート規則
```typescript
// ✅ 推奨: 共通型の明示的インポート
import { TRPGCampaign, TRPGCharacter } from '@/packages/types';

// ❌ 避ける: any 型の使用
const campaign: any = getCampaignData();
```

## 型チェックの実行

### コミット前チェック
```bash
pnpm lint                 # 型チェック含む
pnpm build               # ビルド時型チェック
```

### 継続的な型安全性確保
- TypeScript strict モードの活用
- noImplicitAny の有効化
- 型チェックエラーの即座対応