# AI Agent TRPG Game Master

AI を活用した TRPG（テーブルトーク RPG）キャンペーン管理およびゲームマスター支援ツール

## 🚀 プロジェクト概要

AIAgentTRPGGM は、AI を活用した包括的な TRPG 支援ツールです。ゲームマスターがキャンペーンの作成・運営を効率的に行えるよう、複数の AI プロバイダーによる支援機能を提供します。

### 主要機能

- **📋 キャンペーン管理**: キャンペーンの作成から運営まで一元管理
- **👥 キャラクター管理**: PC・NPC・敵キャラクターの包括的管理
- **🎮 セッション実行**: リアルタイムでのセッション進行支援
- **🤖 AI 統合**: 複数の AI プロバイダーによる包括的支援
- **📅 タイムライン管理**: イベントとクエストの時系列管理

## 🏗️ 技術スタック

### フロントエンド
- **React 18**: SPA フレームワーク
- **Material UI**: UI コンポーネントライブラリ
- **Recoil**: 状態管理
- **React Router v7**: ルーティング
- **Vite**: ビルドツール
- **TypeScript**: 型安全性

### バックエンド
- **Express.js**: Web サーバーフレームワーク
- **TypeScript**: 型安全性
- **Litestream**: データベース
- **Better SQLite3**: SQLite ドライバー

### AI 統合
- **OpenAI**: GPT-3.5, GPT-4
- **Anthropic**: Claude 2, Claude 3
- **Google**: Gemini Pro
- **カスタムエンドポイント**: OpenAI 互換 API

## 📦 プロジェクト構造

```
AIAgentTRPGGM/
├── apps/
│   ├── frontend/          # React 18 SPA
│   └── proxy-server/      # Express.js API
├── packages/
│   └── types/            # 共通型定義
├── docs/                 # プロジェクトドキュメント
│   ├── rules/           # 開発ルール・規約
│   ├── 機能要件定義/     # 機能要件
│   ├── 非機能要件定義/   # 非機能要件
│   └── プロジェクト概要/ # プロジェクト概要
└── CLAUDE.md            # Claude Code 向けガイド
```

## 🛠️ 開発環境セットアップ

### 前提条件

- Node.js 18.0.0 以上
- pnpm 8.0.0 以上

### インストール

```bash
# リポジトリのクローン
git clone <repository-url>
cd AIAgentTRPGGM

# 依存関係のインストール
pnpm install
```

### 開発サーバーの起動

⚠️ **重要**: 必ず統一された安全起動スクリプトを使用してください

```bash
# ローカル開発環境
./start-dev.sh

# Docker開発環境
./start-dev.sh --docker

# Dockerビルド付き起動
./start-dev.sh --docker --build

# Dockerキャッシュクリア付き起動
./start-dev.sh --docker --clean
```

**注意**: `docker compose` や `pnpm run dev` を直接実行しないでください。PC負荷100%によるハングを防ぐため、必ず `start-dev.sh` を使用してください。

### ビルド

```bash
# 全パッケージビルド
pnpm build

# フロントエンドのみビルド
pnpm build:frontend

# バックエンドのみビルド
pnpm build:proxy
```

### テスト

```bash
# E2Eテスト実行
pnpm test:e2e

# テストUI起動
pnpm test:e2e:ui

# TRPGセッション機能テスト
pnpm test:trpg-session

# AI強化機能テスト
pnpm test:ai-enhanced
```

### Storybook

```bash
# Storybook開発サーバー起動
pnpm storybook

# Storybookビルド
pnpm build-storybook
```

## 📚 ドキュメント

詳細なドキュメントは `docs/` ディレクトリにあります：

- **[プロジェクト概要](docs/プロジェクト概要/readme.md)**: 完全なプロジェクト概要
- **[要件定義](docs/プロジェクト概要/要件定義.md)**: 包括的な要件定義
- **[開発ルール](docs/rules/development-rules.md)**: 開発ガイドライン
- **[CLAUDE.md](CLAUDE.md)**: Claude Code 向けの実装ガイド

## 🔧 設定

### 環境変数

フロントエンド用の環境変数を設定：

```bash
cd apps/frontend
cp .env.example .env
```

### AI API キー設定

各AIプロバイダーのAPIキーは、フロントエンドのUI上で設定します：

1. 設定ページにアクセス
2. AI設定タブを選択
3. 使用したいプロバイダーのAPIキーを入力
4. 接続テストを実行

**重要**: APIキーはブラウザのlocalStorageに保存され、バックエンドには送信されません。

## 🚀 デプロイ

### Google Cloud Run デプロイ

```bash
# 本番ビルド
pnpm build

# Docker イメージビルド
docker build -t ai-trpg-gm .

# Cloud Run デプロイ
gcloud run deploy ai-trpg-gm --image ai-trpg-gm --platform managed
```

## 🧪 テスト戦略

### E2Eテスト

Playwrightを使用したE2Eテスト：

```bash
# 特定のテストファイル実行
pnpm playwright test e2e/pages/trpg-session-page.spec.ts

# 特定のテスト名で実行
pnpm playwright test -g "should create new campaign"

# ヘッドありモードで実行
pnpm playwright test --headed

# デバッグモード
pnpm playwright test --debug
```

### 視覚的テスト

スクリーンショット比較による視覚的回帰テスト：

```bash
# UI変更前後のスクリーンショット比較
pnpm test:visual
```

## 🔒 セキュリティ

### API キー保護

- フロントエンドでのAPIキー露出を防止
- 全通信はHTTPS経由
- 入力値の検証とサニタイゼーション

### データ保護

- ローカルデータの暗号化保存
- プロンプトインジェクション対策
- 機密情報フィルタリング

## 📈 パフォーマンス

### 要件

- ページ表示速度: 初回3秒以内、遷移1秒以内
- AI機能応答: チャット10秒以内、生成15秒以内
- 同時ユーザー数: 開発環境5名、本番環境50名

### 最適化

- コード分割とレイジーローディング
- AIリクエストの並列処理
- 適切なキャッシュ戦略

## 🤝 コントリビューション

### 開発ルール

1. **型安全性**: テストデータ用の型定義は作成禁止
2. **エラーハンドリング**: フォールバック実装を避ける
3. **ドキュメント**: 変更時は必ずドキュメント更新
4. **テスト**: コアロジックはTDD、UIは視覚的確認

### プルリクエスト

1. 機能ブランチで開発
2. テスト実行とリント確認
3. ドキュメント更新
4. スクリーンショット付きでPR作成

## 📄 ライセンス

このプロジェクトは学習目的のためのものです。

## 🆘 サポート

- **ドキュメント**: `docs/` ディレクトリを参照
- **Issues**: GitHubのIssueページで問題を報告
- **Discord**: 開発者コミュニティ（実装予定）

---

このプロジェクトは **バイブコーディング学習** のための教育的プロジェクトです。高品質なコード、包括的なテスト、詳細なドキュメントを通じて、現代的なWeb開発のベストプラクティスを学習できます。