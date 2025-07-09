#!/bin/bash

# 定期バックアップスクリプト
# 本番環境でのデータ保護のための自動バックアップ

set -euo pipefail

# 設定
BACKUP_DIR="/backup"
DATABASE_DIR="/app/data"
RETENTION_DAYS=7
LOG_FILE="$BACKUP_DIR/backup.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# ログ関数
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# バックアップディレクトリの作成
mkdir -p "$BACKUP_DIR"

# 開始ログ
log "Starting backup process..."

# データベースバックアップ
if [[ -f "$DATABASE_DIR/trpg.db" ]]; then
    log "Backing up main database..."
    sqlite3 "$DATABASE_DIR/trpg.db" ".backup $BACKUP_DIR/trpg_backup_$TIMESTAMP.db"
    
    # 圧縮
    gzip "$BACKUP_DIR/trpg_backup_$TIMESTAMP.db"
    log "Database backup completed and compressed"
else
    log "WARNING: Main database not found at $DATABASE_DIR/trpg.db"
fi

# Mastraデータベースバックアップ
if [[ -f "$DATABASE_DIR/mastra-trpg.db" ]]; then
    log "Backing up Mastra database..."
    sqlite3 "$DATABASE_DIR/mastra-trpg.db" ".backup $BACKUP_DIR/mastra_backup_$TIMESTAMP.db"
    
    # 圧縮
    gzip "$BACKUP_DIR/mastra_backup_$TIMESTAMP.db"
    log "Mastra database backup completed and compressed"
else
    log "WARNING: Mastra database not found at $DATABASE_DIR/mastra-trpg.db"
fi

# 設定ファイルのバックアップ
log "Backing up configuration files..."
tar -czf "$BACKUP_DIR/config_backup_$TIMESTAMP.tar.gz" \
    -C /app \
    litestream.yml \
    nginx/ \
    monitoring/ \
    2>/dev/null || log "Some config files may not exist"

# 古いバックアップの削除
log "Cleaning up old backups..."
find "$BACKUP_DIR" -name "*backup_*.db.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "*backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

# バックアップファイルの一覧表示
log "Current backups:"
ls -la "$BACKUP_DIR"/*backup_* 2>/dev/null || log "No backup files found"

# 完了ログ
log "Backup process completed successfully"

# ヘルスチェック（オプション）
if [[ "${HEALTHCHECK_URL:-}" ]]; then
    log "Sending health check..."
    curl -m 10 -s "$HEALTHCHECK_URL" || log "Health check failed"
fi

# 通知（オプション）
if [[ "${NOTIFICATION_WEBHOOK:-}" ]]; then
    log "Sending notification..."
    curl -m 10 -s -H "Content-Type: application/json" \
        -d "{\"text\":\"Backup completed successfully at $(date)\"}" \
        "$NOTIFICATION_WEBHOOK" || log "Notification failed"
fi

exit 0