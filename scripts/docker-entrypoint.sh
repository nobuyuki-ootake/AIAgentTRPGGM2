#!/bin/bash

# Dockerコンテナ用エントリーポイントスクリプト
# Litestreamとproxy-serverを統合起動

set -euo pipefail

# 色付きログ出力
log_info() {
    echo -e "\e[32m[INFO]\e[0m $1"
}

log_warn() {
    echo -e "\e[33m[WARN]\e[0m $1"
}

log_error() {
    echo -e "\e[31m[ERROR]\e[0m $1"
}

# 環境変数設定
export DATABASE_PATH="/app/data/trpg.db"
export LITESTREAM_CONFIG="/app/litestream.yml"

# シャットダウンハンドラ
shutdown_handler() {
    log_info "Shutting down services..."
    
    # Litestreamデーモンを停止
    if [[ -n "${LITESTREAM_PID:-}" ]]; then
        log_info "Stopping Litestream daemon..."
        kill -TERM "$LITESTREAM_PID" 2>/dev/null || true
        wait "$LITESTREAM_PID" 2>/dev/null || true
    fi
    
    # proxy-serverを停止
    if [[ -n "${SERVER_PID:-}" ]]; then
        log_info "Stopping proxy server..."
        kill -TERM "$SERVER_PID" 2>/dev/null || true
        wait "$SERVER_PID" 2>/dev/null || true
    fi
    
    log_info "Shutdown complete"
    exit 0
}

# シグナルハンドラ設定
trap shutdown_handler SIGTERM SIGINT

# 必要なディレクトリの作成
mkdir -p /app/data /app/backup

# Litestreamの設定確認
validate_litestream_config() {
    log_info "Validating Litestream configuration..."
    
    if [[ ! -f "$LITESTREAM_CONFIG" ]]; then
        log_error "Litestream configuration file not found: $LITESTREAM_CONFIG"
        exit 1
    fi
    
    # 基本的な環境変数チェック（S3設定がある場合のみ）
    if [[ -n "${LITESTREAM_S3_BUCKET:-}" ]]; then
        local required_vars=(
            "LITESTREAM_S3_REGION"
            "LITESTREAM_S3_ACCESS_KEY_ID"
            "LITESTREAM_S3_SECRET_ACCESS_KEY"
        )
        
        for var in "${required_vars[@]}"; do
            if [[ -z "${!var:-}" ]]; then
                log_warn "S3 environment variable not set: $var"
                log_warn "S3 backup will be disabled"
                break
            fi
        done
    fi
    
    log_info "Litestream configuration validated"
}

# データベースのリストア（必要に応じて）
restore_database() {
    if [[ "${LITESTREAM_RESTORE_ON_STARTUP:-false}" == "true" ]]; then
        log_info "Restoring database from backup..."
        
        if [[ -f "$DATABASE_PATH" ]]; then
            local backup_file="${DATABASE_PATH}.startup-backup.$(date +%Y%m%d_%H%M%S)"
            cp "$DATABASE_PATH" "$backup_file"
            log_info "Existing database backed up to: $backup_file"
        fi
        
        litestream restore -config "$LITESTREAM_CONFIG" "$DATABASE_PATH" || {
            log_error "Failed to restore database"
            exit 1
        }
        
        log_info "Database restored successfully"
    fi
}

# Litestreamデーモンの起動
start_litestream() {
    log_info "Starting Litestream daemon..."
    
    # バックグラウンドでLitestreamを起動
    litestream replicate -config "$LITESTREAM_CONFIG" &
    LITESTREAM_PID=$!
    
    # プロセス起動確認
    sleep 2
    if ! ps -p "$LITESTREAM_PID" > /dev/null 2>&1; then
        log_error "Failed to start Litestream daemon"
        exit 1
    fi
    
    log_info "Litestream daemon started with PID: $LITESTREAM_PID"
}

# proxy-serverの起動
start_proxy_server() {
    log_info "Starting proxy server..."
    
    # 開発モードか本番モードかを判定
    if [[ "${NODE_ENV:-development}" == "production" ]]; then
        log_info "Starting in production mode..."
        node dist/index.js &
    else
        log_info "Starting in development mode..."
        pnpm dev &
    fi
    
    SERVER_PID=$!
    
    # プロセス起動確認
    sleep 2
    if ! ps -p "$SERVER_PID" > /dev/null 2>&1; then
        log_error "Failed to start proxy server"
        exit 1
    fi
    
    log_info "Proxy server started with PID: $SERVER_PID"
}

# ヘルスチェック
health_check() {
    local max_retries=30
    local retry_count=0
    
    log_info "Performing health check..."
    
    while [[ $retry_count -lt $max_retries ]]; do
        if curl -f "http://localhost:4001/api/health" > /dev/null 2>&1; then
            log_info "Health check passed"
            return 0
        fi
        
        sleep 1
        ((retry_count++))
    done
    
    log_error "Health check failed after $max_retries attempts"
    return 1
}

# メイン処理
main() {
    log_info "Starting AI Agent TRPG GM Proxy Server with Litestream..."
    log_info "Database path: $DATABASE_PATH"
    log_info "Litestream config: $LITESTREAM_CONFIG"
    
    # 設定の検証
    validate_litestream_config
    
    # データベースのリストア（必要に応じて）
    restore_database
    
    # Litestreamの起動
    start_litestream
    
    # proxy-serverの起動
    start_proxy_server
    
    # ヘルスチェック
    if ! health_check; then
        log_error "Service startup failed"
        exit 1
    fi
    
    log_info "All services started successfully"
    log_info "Proxy server: http://localhost:4001"
    log_info "Litestream monitoring: PID $LITESTREAM_PID"
    
    # サービスの監視
    while true; do
        # Litestreamの状態確認
        if ! ps -p "$LITESTREAM_PID" > /dev/null 2>&1; then
            log_error "Litestream daemon has stopped"
            exit 1
        fi
        
        # proxy-serverの状態確認
        if ! ps -p "$SERVER_PID" > /dev/null 2>&1; then
            log_error "Proxy server has stopped"
            exit 1
        fi
        
        sleep 10
    done
}

# スクリプト実行
main "$@"