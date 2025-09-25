#!/bin/bash

# 統一された安全起動スクリプト
# 🔒 多重起動防止機能付き - 必ずこのスクリプトを使用してください

set -e

# 色付きログ出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ出力関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 多重起動防止
LOCK_FILE="/tmp/aiagent-trpg-dev.lock"
PID_FILE="/tmp/aiagent-trpg-dev.pid"

cleanup() {
    # 重複実行防止
    if [ "${CLEANUP_RUNNING:-}" = "true" ]; then
        return 0
    fi
    export CLEANUP_RUNNING=true
    
    log_info "クリーンアップ中..."
    
    # 自分自身のPIDと比較して、異なる場合のみkill
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if [ "$PID" != "$$" ] && kill -0 "$PID" 2>/dev/null; then
            log_info "プロセス $PID を終了しています..."
            kill "$PID" 2>/dev/null || true
            sleep 1
            kill -9 "$PID" 2>/dev/null || true
        fi
        rm -f "$PID_FILE"
    fi
    rm -f "$LOCK_FILE"
    log_success "クリーンアップ完了"
}

# シグナルハンドラー設定
trap cleanup EXIT INT TERM

# 既存のプロセスチェック
if [ -f "$LOCK_FILE" ]; then
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        if kill -0 "$OLD_PID" 2>/dev/null; then
            log_error "開発サーバーは既に実行中です (PID: $OLD_PID)"
            log_info "終了するには: kill $OLD_PID"
            exit 1
        else
            log_warning "古いロックファイルを削除しています..."
            rm -f "$LOCK_FILE" "$PID_FILE"
        fi
    else
        rm -f "$LOCK_FILE"
    fi
fi

# ロックファイル作成
echo $$ > "$LOCK_FILE"
echo $$ > "$PID_FILE"

# 引数解析
USE_DOCKER=false
DOCKER_BUILD=false
DOCKER_CLEAN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --docker)
            USE_DOCKER=true
            shift
            ;;
        --build)
            DOCKER_BUILD=true
            shift
            ;;
        --clean)
            DOCKER_CLEAN=true
            shift
            ;;
        *)
            log_error "不明なオプション: $1"
            echo "使用方法:"
            echo "  $0                     # ローカル開発環境"
            echo "  $0 --docker            # Docker開発環境"
            echo "  $0 --docker --build    # Dockerビルド付き起動"
            echo "  $0 --docker --clean    # Dockerキャッシュクリア付き起動"
            exit 1
            ;;
    esac
done

# 依存関係のインストール確認
if [ ! -d "node_modules" ]; then
    log_info "依存関係をインストール中..."
    pnpm install
fi

# TypeScript型定義ファイルのビルド
log_info "TypeScript型定義ファイルをビルド中..."
pnpm build:typescript
log_success "TypeScript型定義ファイルのビルドが完了しました"

if [ "$USE_DOCKER" = true ]; then
    log_info "Docker開発環境を起動中..."
    
    # Dockerコンテナの停止・削除
    docker-compose down --remove-orphans 2>/dev/null || true
    
    if [ "$DOCKER_CLEAN" = true ]; then
        log_info "Dockerキャッシュをクリア中..."
        docker system prune -f
        docker volume prune -f
    fi
    
    if [ "$DOCKER_BUILD" = true ]; then
        log_info "Dockerイメージをビルド中..."
        # WSL環境でのDocker認証問題を回避
        export DOCKER_BUILDKIT=0
        docker-compose build --no-cache
    fi
    
    log_info "Dockerコンテナを起動中..."
    # WSL環境でのDocker認証問題を回避
    export DOCKER_BUILDKIT=0
    docker-compose up --remove-orphans
else
    log_info "ローカル開発環境を起動中..."
    
    # 既存のプロセスを停止
    pkill -f "pnpm.*dev" || true
    pkill -f "turbo.*dev" || true
    sleep 2
    
    # 開発サーバー起動
    log_success "開発サーバーを起動しています..."
    log_info "フロントエンド: http://localhost:5173"
    log_info "バックエンド: http://localhost:3001"
    log_info "停止するには: Ctrl+C"
    
    # 並列実行でCPU負荷を制御
    pnpm turbo dev --parallel --concurrency=2
fi