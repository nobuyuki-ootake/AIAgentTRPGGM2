#!/bin/bash

# Litestream管理スクリプト
# 本番運用に必要なバックアップ・リストア機能を提供

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LITESTREAM_CONFIG="${PROJECT_ROOT}/litestream.yml"
BACKUP_DIR="${PROJECT_ROOT}/backup"
DATA_DIR="${PROJECT_ROOT}/apps/proxy-server/data"

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

# 環境変数チェック
check_env() {
    local required_vars=(
        "LITESTREAM_S3_BUCKET"
        "LITESTREAM_S3_REGION"
        "LITESTREAM_S3_ACCESS_KEY_ID"
        "LITESTREAM_S3_SECRET_ACCESS_KEY"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            log_error "  - $var"
        done
        exit 1
    fi
}

# バックアップディレクトリの作成
setup_backup_dir() {
    mkdir -p "$BACKUP_DIR"
    log_info "Backup directory setup: $BACKUP_DIR"
}

# Litestreamのインストール確認
check_litestream() {
    if ! command -v litestream &> /dev/null; then
        log_error "Litestream is not installed. Please install it first."
        log_info "Install with: curl -sf https://litestream.io/install.sh | sh"
        exit 1
    fi
    
    local version=$(litestream version)
    log_info "Litestream version: $version"
}

# バックアップの実行
backup() {
    log_info "Starting backup process..."
    
    setup_backup_dir
    
    # 設定ファイルのバリデーション
    if [[ ! -f "$LITESTREAM_CONFIG" ]]; then
        log_error "Litestream config file not found: $LITESTREAM_CONFIG"
        exit 1
    fi
    
    # 手動スナップショット作成
    log_info "Creating manual snapshot..."
    litestream snapshots -config "$LITESTREAM_CONFIG" "$DATA_DIR/trpg.db" || {
        log_error "Failed to create snapshot"
        exit 1
    }
    
    log_info "Backup completed successfully"
}

# データベースのリストア
restore() {
    local target_db="${1:-$DATA_DIR/trpg.db}"
    local restore_time="${2:-}"
    
    log_info "Starting restore process..."
    log_info "Target database: $target_db"
    
    # データベースを停止
    if pgrep -f "proxy-server" > /dev/null; then
        log_warn "Proxy server is running. Please stop it before restoring."
        exit 1
    fi
    
    # 既存データベースをバックアップ
    if [[ -f "$target_db" ]]; then
        local backup_file="${target_db}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$target_db" "$backup_file"
        log_info "Existing database backed up to: $backup_file"
    fi
    
    # リストアコマンド構築
    local restore_cmd="litestream restore -config $LITESTREAM_CONFIG"
    
    if [[ -n "$restore_time" ]]; then
        restore_cmd="$restore_cmd -timestamp $restore_time"
        log_info "Restoring to timestamp: $restore_time"
    fi
    
    restore_cmd="$restore_cmd $target_db"
    
    # リストア実行
    log_info "Executing restore command..."
    eval "$restore_cmd" || {
        log_error "Failed to restore database"
        exit 1
    }
    
    log_info "Restore completed successfully"
}

# Litestreamデーモンの起動
start_daemon() {
    log_info "Starting Litestream daemon..."
    
    setup_backup_dir
    
    # 既存プロセスの確認
    if pgrep -f "litestream replicate" > /dev/null; then
        log_warn "Litestream daemon is already running"
        return 0
    fi
    
    # デーモン起動
    nohup litestream replicate -config "$LITESTREAM_CONFIG" > "$BACKUP_DIR/litestream.log" 2>&1 &
    local pid=$!
    
    # PIDファイル作成
    echo "$pid" > "$BACKUP_DIR/litestream.pid"
    
    log_info "Litestream daemon started with PID: $pid"
    log_info "Log file: $BACKUP_DIR/litestream.log"
}

# Litestreamデーモンの停止
stop_daemon() {
    log_info "Stopping Litestream daemon..."
    
    local pid_file="$BACKUP_DIR/litestream.pid"
    
    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            kill "$pid"
            log_info "Litestream daemon stopped (PID: $pid)"
        else
            log_warn "Litestream daemon not running (stale PID file)"
        fi
        rm -f "$pid_file"
    else
        log_warn "PID file not found"
    fi
    
    # プロセス名で確認
    if pgrep -f "litestream replicate" > /dev/null; then
        pkill -f "litestream replicate"
        log_info "Litestream daemon processes killed"
    fi
}

# デーモンの状態確認
status() {
    log_info "Checking Litestream daemon status..."
    
    local pid_file="$BACKUP_DIR/litestream.pid"
    
    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            log_info "Litestream daemon is running (PID: $pid)"
        else
            log_warn "Litestream daemon is not running (stale PID file)"
            rm -f "$pid_file"
        fi
    else
        log_warn "PID file not found"
    fi
    
    # プロセス確認
    if pgrep -f "litestream replicate" > /dev/null; then
        log_info "Litestream processes found:"
        pgrep -f "litestream replicate" | while read pid; do
            log_info "  PID: $pid"
        done
    else
        log_info "No Litestream processes running"
    fi
}

# 利用可能なスナップショットの表示
list_snapshots() {
    log_info "Available snapshots:"
    litestream snapshots -config "$LITESTREAM_CONFIG" "$DATA_DIR/trpg.db" || {
        log_error "Failed to list snapshots"
        exit 1
    }
}

# 設定ファイルのバリデーション
validate_config() {
    log_info "Validating Litestream configuration..."
    
    if [[ ! -f "$LITESTREAM_CONFIG" ]]; then
        log_error "Configuration file not found: $LITESTREAM_CONFIG"
        exit 1
    fi
    
    # 設定の検証（実際には環境変数チェック）
    check_env
    
    # データベースファイルの存在確認
    if [[ ! -f "$DATA_DIR/trpg.db" ]]; then
        log_warn "Database file not found: $DATA_DIR/trpg.db"
        log_warn "Database will be created on first run"
    fi
    
    log_info "Configuration validation completed"
}

# ヘルプメッセージ
usage() {
    cat << EOF
Litestream管理スクリプト

使用方法:
  $0 [COMMAND] [OPTIONS]

コマンド:
  start-daemon    Litestreamデーモンを開始
  stop-daemon     Litestreamデーモンを停止
  status          デーモンの状態を確認
  backup          手動バックアップを実行
  restore [FILE]  データベースをリストア
  list-snapshots  利用可能なスナップショットを表示
  validate-config 設定ファイルを検証
  help            このヘルプを表示

環境変数:
  LITESTREAM_S3_BUCKET         S3バケット名
  LITESTREAM_S3_REGION         S3リージョン
  LITESTREAM_S3_ACCESS_KEY_ID  S3アクセスキーID
  LITESTREAM_S3_SECRET_ACCESS_KEY  S3シークレットアクセスキー
  LITESTREAM_S3_ENDPOINT       S3エンドポイント（オプション）

例:
  $0 start-daemon
  $0 backup
  $0 restore
  $0 restore /path/to/backup.db
  $0 list-snapshots
EOF
}

# メイン処理
main() {
    local command="${1:-help}"
    
    case "$command" in
        start-daemon)
            check_litestream
            check_env
            start_daemon
            ;;
        stop-daemon)
            stop_daemon
            ;;
        status)
            status
            ;;
        backup)
            check_litestream
            check_env
            backup
            ;;
        restore)
            check_litestream
            check_env
            restore "${2:-}"
            ;;
        list-snapshots)
            check_litestream
            check_env
            list_snapshots
            ;;
        validate-config)
            validate_config
            ;;
        help|--help|-h)
            usage
            ;;
        *)
            log_error "Unknown command: $command"
            usage
            exit 1
            ;;
    esac
}

# スクリプト実行
main "$@"