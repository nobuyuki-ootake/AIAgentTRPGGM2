# テストファイル現状分析・計画書整合性確認

## 🔍 分析実施日
2025-06-24

## 📋 現状ファイル一覧

### 存在するテストファイル
```
/e2e/
├── ai-enhanced/
│   └── scenario-generation.spec.ts          ❌ 計画書で禁止
├── data/
│   ├── test-campaigns.ts                     ✅ 既存・OK  
│   └── test-sessions.ts                      ✅ 既存・OK
├── pages/
│   ├── home-page.spec.ts                     ⚠️ 基本UI・要検証
│   └── trpg-session-page.spec.ts             ⚠️ 一部Critical Priority移行要
├── setup/
│   ├── global-setup.ts                       ✅ インフラ・OK
│   └── global-teardown.ts                    ✅ インフラ・OK
└── utils/
    └── test-helpers.ts                       ✅ 共通機能・OK
```

## 🎯 計画書との整合性チェック

### ❌ 問題点

#### 1. 重要コア機能のディレクトリ配置要検討
- **ファイル**: `/e2e/ai-enhanced/scenario-generation.spec.ts`
- **内容**: TRPGセッションのコア機能（マイルストーン生成、エンティティプール、手探り演出）
- **問題**: ディレクトリ名が「高度機能」を示唆するが、実際は1stリリース必須機能
- **対応**: `/e2e/features/`に移動し、計画書との整合性確保

#### 2. Critical Priority ファイルが不存在
- **不足ファイル**: 
  - `/e2e/core/trpg-essential-flow.spec.ts`
  - `/e2e/core/dice-system.spec.ts`
  - `/e2e/core/session-management.spec.ts`
- **問題**: 1stリリース必須テストが存在しない
- **対応**: 新規作成必要

#### 3. 必要テストデータの不足
- **不足ファイル**:
  - `/e2e/data/test-characters.ts`
  - `/e2e/data/test-dice-scenarios.ts`
- **問題**: Critical Priority テストで必要なデータが不足
- **対応**: 新規作成必要

### ⚠️ 要検証・移行ファイル

#### 1. `trpg-session-page.spec.ts`の内容精査
**現在の責任範囲**: TRPGセッションページの機能テスト
**問題**: Critical Priority と重複する内容が含まれている可能性

**重複確認項目**:
- セッション開始30秒以内（→ trpg-essential-flow.spec.ts）
- ダイスロール基本機能（→ dice-system.spec.ts） 
- セッション管理機能（→ session-management.spec.ts）

**対応方針**: 重複部分を Critical Priority ファイルに移行、残りを適切に整理

#### 2. `home-page.spec.ts`の妥当性
**現在の責任範囲**: ホームページ基本機能
**問題**: 計画書で明確に定義されていない
**対応方針**: 基本UI確認として許容するが、スコープを制限

## 📋 修正アクションプラン

### Phase 1: コア機能ファイル整理 🟡 重要
- [ ] `/e2e/ai-enhanced/scenario-generation.spec.ts` を `/e2e/features/` に移動
- [ ] 内容をHigh Priority `ai-gm-basic.spec.ts` と統合検討
- [ ] セッション開始30秒確認部分をCritical Priority `trpg-essential-flow.spec.ts` に移行

### Phase 2: Critical Priority ファイル作成 🔴 必須
- [ ] `/e2e/core/` ディレクトリ作成
- [ ] `trpg-essential-flow.spec.ts` 作成
- [ ] `dice-system.spec.ts` 作成 
- [ ] `session-management.spec.ts` 作成

### Phase 3: テストデータ追加 🔴 必須
- [ ] `test-characters.ts` 作成（プロダクション型使用）
- [ ] `test-dice-scenarios.ts` 作成（プロダクション型使用）

### Phase 4: 既存ファイル整理 🟡 重要
- [ ] `trpg-session-page.spec.ts` 重複内容をCritical Priorityに移行
- [ ] `home-page.spec.ts` スコープ制限
- [ ] テストヘルパー関数の適切な分離

## 🎯 計画書適合性確認

### ✅ 適合項目
- Production型のみ使用（既存データファイル確認済み）
- Docker開発環境対応（Playwright設定確認済み）
- エラーハンドリング重視（既存ヘルパー確認済み）

### ❌ 非適合項目
- シナリオ生成テストのディレクトリ配置
- Critical Priority の不存在
- テストデータの不足

## 📊 リリース判定への影響

### 現在のリスク
- **Critical Priority 0/3 完成**: リリース不可状態
- **シナリオ生成テスト配置**: 整理必要
- **テストデータ不足**: テスト実行不可

### 修正後の期待値
- **Critical Priority 3/3 完成**: リリース判定可能
- **計画書100%適合**: 品質管理達成
- **必要データ完備**: 確実なテスト実行

## 次のアクション

1. **重要機能保護**: scenario-generation.spec.ts を適切なディレクトリに移動
2. **優先実装**: Critical Priority 3ファイル作成
3. **並行作業**: 必要テストデータ作成
4. **最終調整**: 重複テスト内容の整理統合

---

**重要**: このドキュメントに記載された修正プランに従い、計画書外のファイル作成は一切行わない。1stリリース品質に必要な最小限のテストファイルのみ作成する。