# TRPG 1stリリース テスト設計書

## 🎯 目的とスコープ

**目標**: ユーザーがTRPGを実際に遊べる体験を提供する1stリリース品質の確保

**対象範囲**: TRPGコア機能 + セッションフロー + 基本的なAI支援

**除外範囲**: 高度なAI機能、管理者機能、詳細設定、パフォーマンス最適化

## 📋 必須テストファイル一覧

### 🔴 Critical Priority（リリース必須）

#### 1. `/e2e/core/trpg-essential-flow.spec.ts`
**責任範囲**: TRPGの本質的な体験フロー
- **シナリオ1**: 初回ユーザーの完全体験（0→プレイ開始まで）
- **シナリオ2**: セッション開始30秒以内達成確認
- **シナリオ3**: 基本的なTRPG行動（ダイス→チャット→結果）

#### 2. `/e2e/core/dice-system.spec.ts`
**責任範囲**: TRPGの基礎であるダイス機能
- **ケース1**: 基本ダイス（d4, d6, d8, d10, d12, d20, d100）
- **ケース2**: 修正値付きダイス（d20+3など）
- **ケース3**: 複数ダイス（2d6など）
- **ケース4**: 成功/失敗判定
- **ケース5**: クリティカル判定

#### 3. `/e2e/core/session-management.spec.ts`
**責任範囲**: セッション開始〜終了の基本管理
- **ケース1**: セッション作成と開始
- **ケース2**: 参加者管理（追加・削除）
- **ケース3**: セッション状態管理（準備中→進行中→完了）
- **ケース4**: セッション情報の保存・復元

### 🟡 High Priority（品質向上）

#### 4. `/e2e/features/chat-communication.spec.ts`
**責任範囲**: プレイヤー間のコミュニケーション
- **ケース1**: IC（In Character）メッセージ
- **ケース2**: OOC（Out of Character）メッセージ
- **ケース3**: システムメッセージ
- **ケース4**: チャット履歴の表示

#### 5. `/e2e/features/character-basic.spec.ts`
**責任範囲**: キャラクター情報の基本表示・操作
- **ケース1**: キャラクターステータス表示
- **ケース2**: HP/MP管理
- **ケース3**: 基本的なステータス変更
- **ケース4**: キャラクター情報の保存

#### 6. `/e2e/features/ai-gm-basic.spec.ts`
**責任範囲**: AI GMの基本支援機能
- **ケース1**: シンプルなGM応答生成
- **ケース2**: ルール質問への回答
- **ケース3**: シナリオ進行支援
- **ケース4**: AI生成エラーハンドリング

### 🟢 Medium Priority（必要に応じて）

#### 7. `/e2e/scenarios/complete-session.spec.ts`
**責任範囲**: 完全なTRPGセッションのシナリオテスト
- **シナリオ1**: 探索→イベント→戦闘→解決の1サイクル
- **シナリオ2**: 複数プレイヤーでの協力シナリオ
- **シナリオ3**: AI支援を使った長時間セッション

#### 8. `/e2e/scenarios/error-recovery.spec.ts`
**責任範囲**: エラー発生時の回復シナリオ
- **ケース1**: ネットワーク断線からの復旧
- **ケース2**: AI API失敗時の代替手段
- **ケース3**: データ保存失敗時の対応

## 🚫 作成禁止ファイル

以下のテストファイルは**1stリリースでは作成しない**：

- `/e2e/advanced/` - 高度な機能テスト
- `/e2e/admin/` - 管理者機能テスト
- `/e2e/performance/` - 詳細パフォーマンステスト
- `/e2e/integration/external-api.spec.ts` - 外部API統合テスト
- `/e2e/ui/design-system.spec.ts` - デザインシステムテスト
- `/e2e/accessibility/` - アクセシビリティ詳細テスト

## 📊 品質基準

### ✅ 合格基準
1. **機能性**: 上記Critical Priorityのすべてが合格
2. **実用性**: 実際のユーザーがTRPGを1セッション完走可能
3. **安定性**: 基本操作でクラッシュやデータ消失が発生しない
4. **応答性**: セッション開始30秒以内達成

### ⚠️ 許容可能な制限
- 高度なAI機能の不完全性
- UI/UXの細かい粗さ
- 管理機能の不足
- パフォーマンスの若干の遅延

## 📝 テスト実行順序

### Phase 1: 個別機能確認（並列実行可能）
1. `dice-system.spec.ts`
2. `chat-communication.spec.ts`
3. `character-basic.spec.ts`

### Phase 2: 統合機能確認（順次実行）
1. `session-management.spec.ts`
2. `ai-gm-basic.spec.ts`

### Phase 3: エンドツーエンド確認（最終確認）
1. `trpg-essential-flow.spec.ts`
2. `complete-session.spec.ts`

### Phase 4: エラー対応確認（必要に応じて）
1. `error-recovery.spec.ts`

## 🔄 テストデータ管理

### 統一ルール
- **Production型定義のみ使用**（テスト専用型は禁止）
- **テストデータは`/e2e/data/`に集約**
- **各テストファイルは独立して実行可能**

### 共通テストデータファイル
- `test-campaigns.ts` - キャンペーンデータ（既存）
- `test-sessions.ts` - セッションデータ（既存）
- `test-characters.ts` - キャラクターデータ（新規作成予定）
- `test-dice-scenarios.ts` - ダイステストシナリオ（新規作成予定）

## 📈 成功指標

### 定量指標
- Critical Priority テスト合格率: **100%**
- High Priority テスト合格率: **80%以上**
- セッション開始時間: **30秒以内**
- 基本操作の成功率: **95%以上**

### 定性指標
- 実際のTRPGプレイヤーが使用可能
- 基本的なセッション運営が可能
- AI支援が実用的に機能

## 🚀 リリース判定基準

### ✅ リリース可能
- Critical Priority（3ファイル）すべて合格
- High Priority（3ファイル）の80%以上合格
- エラーハンドリングが適切に動作

### ❌ リリース不可
- Critical Priorityの1つでも不合格
- セッション開始30秒を超過
- データ消失やクラッシュが発生

---

## 📋 実装チェックリスト

### Phase 1: Critical Priority実装
- [ ] `/e2e/core/trpg-essential-flow.spec.ts`
- [ ] `/e2e/core/dice-system.spec.ts`
- [ ] `/e2e/core/session-management.spec.ts`

### Phase 2: High Priority実装
- [ ] `/e2e/features/chat-communication.spec.ts`
- [ ] `/e2e/features/character-basic.spec.ts`
- [ ] `/e2e/features/ai-gm-basic.spec.ts`

### Phase 3: テストデータ追加
- [ ] `/e2e/data/test-characters.ts`
- [ ] `/e2e/data/test-dice-scenarios.ts`

### Phase 4: 品質確認
- [ ] 全テスト実行・合格確認
- [ ] 実際のユーザーシナリオでの動作確認
- [ ] リリース判定基準の評価

---

**重要**: このドキュメント記載外のテストファイルは作成せず、1stリリース品質に集中してテスト開発を進める。