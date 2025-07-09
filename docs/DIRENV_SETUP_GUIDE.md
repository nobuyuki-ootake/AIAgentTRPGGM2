# direnv セットアップガイド

## 📋 概要

このプロジェクトでは、API キーや環境変数の安全な管理のために direnv を使用しています。direnv は、ディレクトリごとに環境変数を自動的に設定・解除するツールです。

## 🚀 クイックセットアップ

### 1. direnv のインストール

#### macOS
```bash
brew install direnv
```

#### Ubuntu/Debian
```bash
apt update && apt install direnv
```

#### Windows (WSL)
```bash
curl -sfL https://direnv.net/install.sh | bash
```

### 2. シェル統合の設定

使用しているシェルに応じて、以下のいずれかを実行してください：

#### Bash
```bash
echo 'eval "$(direnv hook bash)"' >> ~/.bashrc
source ~/.bashrc
```

#### Zsh
```bash
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc
source ~/.zshrc
```

#### Fish
```bash
echo 'direnv hook fish | source' >> ~/.config/fish/config.fish
```

### 3. プロジェクト環境の設定

```bash
# プロジェクトディレクトリに移動
cd /path/to/AIAgentTRPGGM2

# direnv を有効化
direnv allow

# 環境変数の確認
./scripts/test-env.sh
```

### 4. API キーの設定

```bash
# .env.local ファイルを編集
nano .env.local
# または
code .env.local

# 実際のAPIキーに置き換えてください：
# export GOOGLE_API_KEY="AIza************************"
# export OPENAI_API_KEY="sk-proj-********************"
# export ANTHROPIC_API_KEY="sk-ant-********************"
```

### 5. 設定の確認

```bash
# 環境変数テストを実行
./scripts/test-env.sh

# プロジェクトを起動
./start-dev.sh
```

## 🔒 セキュリティのベストプラクティス

### ✅ DO（推奨）
- `.env.local` にのみ実際のAPIキーを記載
- `direnv allow` を実行する前に `.envrc` の内容を確認
- API キーを定期的にローテーション
- チーム内での `.env.local.template` の共有

### ❌ DON'T（非推奨）
- `.envrc` にAPIキーを直接記載
- `.env.local` をGitにコミット
- API キーをSlackやメールで共有
- 他人の`.env.local`をコピー

## 🛠️ トラブルシューティング

### direnv が認識されない場合
```bash
# direnv のパスを確認
which direnv

# シェル設定を再読み込み
source ~/.bashrc  # または ~/.zshrc
```

### 環境変数が設定されない場合
```bash
# .envrc の権限を確認
ls -la .envrc

# direnv を再度有効化
direnv allow

# デバッグモード
direnv exec . env | grep -E "(GOOGLE|OPENAI|ANTHROPIC)_API_KEY"
```

### APIキーが読み込まれない場合
```bash
# .env.local の存在確認
ls -la .env.local

# ファイル内容の確認（キーは表示されません）
./scripts/test-env.sh
```

## 📁 ファイル構成

```
AIAgentTRPGGM2/
├── .envrc                    # チーム共有の環境変数
├── .env.local               # 個人のAPIキー（Gitignored）
├── .env.local.template      # APIキー設定のテンプレート
├── scripts/
│   └── test-env.sh         # 環境変数テストスクリプト
└── docs/
    └── DIRENV_SETUP_GUIDE.md # このファイル
```

## 🎯 開発ワークフロー

### 新しい開発者の受け入れ
1. プロジェクトをクローン
2. direnv をインストール・設定
3. `.env.local.template` をコピーして `.env.local` を作成
4. 必要なAPIキーを設定
5. `direnv allow` で環境を有効化
6. `./scripts/test-env.sh` で確認
7. `./start-dev.sh` で開発開始

### 環境変数の追加
1. 共通変数は `.envrc` に追加
2. 秘密情報は `.env.local.template` と `.env.local` に追加
3. `direnv allow` で再読み込み
4. チームに変更を共有

## 🔄 従来の .env からの移行

既存の `.env` ファイルがある場合：

```bash
# 既存の .env をバックアップ
cp .env .env.backup

# .env.local にコピー（APIキー部分のみ）
grep -E "(API_KEY|SECRET)" .env >> .env.local

# .env を削除（Gitから除外済み）
rm .env

# direnv を有効化
direnv allow
```

## 📞 サポート

問題が発生した場合は、以下の情報と合わせてチームに報告してください：

```bash
# システム情報
echo "OS: $(uname -s)"
echo "Shell: $SHELL"
echo "direnv: $(direnv --version)"

# 環境変数テスト結果
./scripts/test-env.sh
```