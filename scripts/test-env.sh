#!/bin/bash
# 環境変数設定テストスクリプト

echo "🧪 環境変数設定テスト"
echo "========================"

# 基本環境変数の確認
echo "📁 PROJECT_ROOT: $PROJECT_ROOT"
echo "🗄️ DATABASE_PATH: $DATABASE_PATH"
echo "🌐 FRONTEND_URL: $FRONTEND_URL"
echo "🔗 BACKEND_URL: $BACKEND_URL"
echo "🔧 NODE_ENV: $NODE_ENV"

echo ""
echo "🔑 APIキー設定状況:"

# APIキーの存在確認（値は表示しない）
if [[ -n "$GOOGLE_API_KEY" && "$GOOGLE_API_KEY" != "YOUR_GOOGLE_API_KEY_HERE" ]]; then
    echo "✅ Google API Key: 設定済み"
else
    echo "❌ Google API Key: 未設定"
fi

if [[ -n "$OPENAI_API_KEY" && "$OPENAI_API_KEY" != "YOUR_OPENAI_API_KEY_HERE" ]]; then
    echo "✅ OpenAI API Key: 設定済み"
else
    echo "❌ OpenAI API Key: 未設定"
fi

if [[ -n "$ANTHROPIC_API_KEY" && "$ANTHROPIC_API_KEY" != "YOUR_ANTHROPIC_API_KEY_HERE" ]]; then
    echo "✅ Anthropic API Key: 設定済み"
else
    echo "❌ Anthropic API Key: 未設定"
fi

echo ""
echo "📦 ツール確認:"

# 必要ツールの確認
if command -v node >/dev/null 2>&1; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js: 未インストール"
fi

if command -v pnpm >/dev/null 2>&1; then
    echo "✅ pnpm: $(pnpm --version)"
else
    echo "❌ pnpm: 未インストール"
fi

if command -v direnv >/dev/null 2>&1; then
    echo "✅ direnv: $(direnv --version)"
else
    echo "❌ direnv: 未インストール"
fi

echo ""
echo "📂 ファイル確認:"

if [[ -f ".envrc" ]]; then
    echo "✅ .envrc: 存在"
else
    echo "❌ .envrc: 不存在"
fi

if [[ -f ".env.local" ]]; then
    echo "✅ .env.local: 存在"
else
    echo "❌ .env.local: 不存在"
fi

echo ""
echo "🎯 次のステップ:"
echo "1. APIキーが未設定の場合は .env.local を編集してください"
echo "2. direnv allow を実行してください"
echo "3. ./start-dev.sh でプロジェクトを起動してください"