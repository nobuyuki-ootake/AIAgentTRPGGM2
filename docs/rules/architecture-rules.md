# アーキテクチャルール

このファイルは AIAgentTRPGGM プロジェクトのアーキテクチャに関する重要なルールをまとめています。

## モノレポ構造

### 基本構成
```
apps/
├── frontend/          # React 18 SPA (Material UI, Recoil, React Router v7)
├── proxy-server/      # Express.js API サーバー
packages/
├── types/            # 共通 TypeScript 型定義
```

### 技術スタック
- **フロントエンド**: React 18, Material UI, Recoil, React Router v7, Slate.js, Vite
- **バックエンド**: Express.js, TypeScript, Mastra AI framework
- **データベース**: Litestream
- **ストレージ**: Google Cloud Storage
- **AI統合**: OpenAI, Anthropic (Claude), Google (Gemini)

## 重要なアーキテクチャパターン

### 1. AI 統合アーキテクチャ
```
Frontend → /api/ai-agent/* → Proxy Server → AI Providers
```
- フロントエンドから proxy server の `/api/ai-agent/*` にリクエスト
- proxy server で API キー管理とプロバイダー選択
- 複数 AI プロバイダーの統一インターフェース
- "selected elements" パターンによるコンテキスト蓄積

### 2. 状態管理フロー
- **Recoil atoms**: グローバル状態 (currentCampaignAtom, sessionStateAtom, etc.)
- **ローカル state**: UI インタラクション用
- **Litestream**: キャンペーン永続化
- **Cloud Storage**: キャラクター画像・ベースイラスト

### 3. 画面ナビゲーションパターン
```
Home → Campaign Setup → Characters (PC/NPC) → World Building → Session Planning → TRPG Session
```
- 開発者モード切り替えで UI 複雑度制御
- 各画面でキャンペーンコンテキスト構築
- AI アシスタント統合

### 4. TRPG セッションインターフェースアーキテクチャ
- メインセッションビュー（キャラクター表示、チャットインターフェース、インタラクションパネル）
- 統合ダイスロール、スキルチェック、パワーチェックミニゲーム
- リアルタイムセッション状態管理
- AI 駆動ゲームマスターアシスタント・NPC 行動

## コンポーネント設計原則

### 単一責任の原則
- **コンポーネントは単一の責任を持つ**
- 適切な粒度でのコンポーネント作成
- UI とロジックの分離

### ファイル分割基準
- **800行程度**を目安に分割検討
- 読みやすさを最優先
- 機能単位での分割

## ディレクトリ構造ルール

### 重要ファイルの配置
```
apps/frontend/src/
├── components/
│   ├── ai/AIChatPanel.tsx           # AI インタラクションコア
│   ├── trpg-session/                # TRPG セッション UI
│   └── characters/CharacterForm.tsx # キャラクターシート管理
├── hooks/
│   └── useAIChatIntegration.ts      # AI チャット状態管理
├── pages/
│   └── TRPGSessionPage.tsx          # メインセッションインターフェース
└── store/atoms.ts                   # キャンペーン・セッション状態

apps/proxy-server/src/
├── routes/aiAgent.ts                # AI エンドポイント
└── utils/systemPrompts.ts           # TRPG 固有 AI ペルソナ

packages/types/index.ts              # TRPG エンティティ型定義
```

## API 設計パターン

### AI 機能追加時の手順
1. `apps/proxy-server/src/routes/aiAgent.ts` にエンドポイント追加
2. `apps/frontend/src/api/aiAgent.ts` に対応関数追加
3. React hook 作成または更新
4. AIChatPanel assist タブとの統合（必要に応じて）

### TRPG 画面追加時の手順
1. `apps/frontend/src/pages/` にページコンポーネント作成
2. `App.tsx` にルート追加
3. コンテキストプロバイダー作成（必要に応じて）
4. サイドバーナビゲーション項目追加（開発者モード考慮）
5. AI アシスタンス統合実装
6. TRPG 固有 UI コンポーネント追加（ダイス、キャラクターシート等）
7. `/docs/` フォルダーにドキュメント追加

## エラーハンドリングパターン

### AI リクエスト
- try-catch でユーザーフレンドリーなエラーメッセージ
- Recoil atoms でローディング状態管理
- Snackbar 通知でユーザーフィードバック
- proxy server での包括的エラーログ

### 型安全性
- TypeScript 型システムの最大活用
- any 型の使用回避
- 共通型定義の活用（packages/types）

## デプロイメント構成

### プラットフォーム
- **Google Cloud Run**: プライマリデプロイメント
- **Google Cloud Storage**: 画像・アセットストレージ
- **Litestream**: 自動バックアップ付きデータベース
- **Docker Compose**: ローカル開発（Redis、Cloud Storage エミュレーション）

## 後方互換性ポリシー

- **後方互換機能は不要**
- 現在、TRPG を AI agent が実行するプロジェクトとして単体動作
- Novel Tool からの移行完了済み

## 主要な変更点（Novel Tool から）

- キャンペーン中心のデータ構造（小説中心から変更）
- PC/NPC キャラクター区別とフルキャラクターシート
- セッションベースタイムライン（時系列ナラティブから変更）
- 開発者モード UI 可視性制御
- ライブプレイ用リアルタイムセッション状態管理