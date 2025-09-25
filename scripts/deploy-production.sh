#!/bin/bash

# 本番環境デプロイメントスクリプト
# 安全な本番デプロイメントのための統合スクリプト

set -euo pipefail

# 設定
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backup"
DEPLOY_LOG="$PROJECT_ROOT/deploy.log"
ENVIRONMENT="${1:-production}"

# 色付きログ出力
log_info() {
    echo -e "\e[32m[INFO]\e[0m $1" | tee -a "$DEPLOY_LOG"
}

log_warn() {
    echo -e "\e[33m[WARN]\e[0m $1" | tee -a "$DEPLOY_LOG"
}

log_error() {
    echo -e "\e[31m[ERROR]\e[0m $1" | tee -a "$DEPLOY_LOG"
}

log_success() {
    echo -e "\e[32m[SUCCESS]\e[0m $1" | tee -a "$DEPLOY_LOG"
}

# エラーハンドリング
error_exit() {
    log_error "Deployment failed: $1"
    exit 1
}

# シャットダウンハンドラ
cleanup() {
    log_info "Cleaning up deployment process..."
    # 必要に応じてリソースをクリーンアップ
}

trap cleanup EXIT

# 必要なコマンドの確認
check_dependencies() {
    log_info "Checking dependencies..."
    
    local required_commands=(
        "docker"
        "docker-compose"
        "pnpm"
        "curl"
        "sqlite3"
    )
    
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error_exit "Required command not found: $cmd"
        fi
    done
    
    log_success "All dependencies are available"
}

# 環境設定の確認
check_environment() {
    log_info "Checking environment configuration..."
    
    # 必要な環境変数
    local required_vars=(
        "LITESTREAM_S3_BUCKET"
        "LITESTREAM_S3_REGION"
        "LITESTREAM_S3_ACCESS_KEY_ID"
        "LITESTREAM_S3_SECRET_ACCESS_KEY"
        "OPENAI_API_KEY"
        "ANTHROPIC_API_KEY"
        "GOOGLE_API_KEY"
        "JWT_SECRET"
        "REDIS_PASSWORD"
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
        error_exit "Environment configuration incomplete"
    fi
    
    log_success "Environment configuration is complete"
}

# 現在のサービスのバックアップ
backup_current_state() {
    log_info "Backing up current state..."
    
    mkdir -p "$BACKUP_DIR"
    
    # データベースのバックアップ
    if [[ -f "$PROJECT_ROOT/apps/proxy-server/data/trpg.db" ]]; then
        cp "$PROJECT_ROOT/apps/proxy-server/data/trpg.db" "$BACKUP_DIR/trpg_pre_deploy_$(date +%Y%m%d_%H%M%S).db"
        log_info "Database backed up"
    fi
    
    # 設定ファイルのバックアップ
    tar -czf "$BACKUP_DIR/config_pre_deploy_$(date +%Y%m%d_%H%M%S).tar.gz" \
        -C "$PROJECT_ROOT" \
        litestream.yml \
        nginx/ \
        monitoring/ \
        2>/dev/null || log_warn "Some config files may not exist"
    
    log_success "Current state backed up"
}

# ビルドプロセス
build_application() {
    log_info "Building application..."
    
    cd "$PROJECT_ROOT"
    
    # 依存関係のインストール
    log_info "Installing dependencies..."
    pnpm install --frozen-lockfile || error_exit "Failed to install dependencies"
    
    # TypeScriptコンパイル
    log_info "Compiling TypeScript..."
    pnpm run build || error_exit "Failed to build application"
    
    log_success "Application built successfully"
}

# データベースマイグレーション
run_migrations() {
    log_info "Running database migrations..."
    
    cd "$PROJECT_ROOT"
    
    # マイグレーションの検証
    pnpm migrate:validate || error_exit "Migration validation failed"
    
    # マイグレーションの実行
    pnpm migrate:up || error_exit "Migration execution failed"
    
    # マイグレーション状態の確認
    pnpm migrate:status
    
    log_success "Database migrations completed"
}

# Dockerイメージのビルド
build_docker_images() {
    log_info "Building Docker images..."
    
    cd "$PROJECT_ROOT"
    
    # プロキシサーバーのイメージビルド
    docker build \
        --target production \
        -t ai-trpg-proxy:$ENVIRONMENT \
        -f Dockerfile.proxy-server \
        . || error_exit "Failed to build proxy server image"
    
    # フロントエンドのイメージビルド
    docker build \
        --target production \
        -t ai-trpg-frontend:$ENVIRONMENT \
        -f Dockerfile.frontend \
        . || error_exit "Failed to build frontend image"
    
    log_success "Docker images built successfully"
}

# サービスのデプロイ
deploy_services() {
    log_info "Deploying services..."
    
    cd "$PROJECT_ROOT"
    
    # 既存のサービスを停止
    log_info "Stopping existing services..."
    docker-compose -f docker-compose.prod.yml down || log_warn "No existing services to stop"
    
    # 新しいサービスを起動
    log_info "Starting new services..."
    docker-compose -f docker-compose.prod.yml up -d || error_exit "Failed to start services"
    
    log_success "Services deployed successfully"
}

# ヘルスチェック
health_check() {
    log_info "Performing health check..."
    
    local max_retries=30
    local retry_count=0
    
    while [[ $retry_count -lt $max_retries ]]; do
        if curl -f http://localhost:4001/api/health > /dev/null 2>&1; then
            log_success "Proxy server is healthy"
            break
        fi
        
        ((retry_count++))
        log_info "Waiting for proxy server to be ready... ($retry_count/$max_retries)"
        sleep 10
    done
    
    if [[ $retry_count -eq $max_retries ]]; then
        error_exit "Health check failed after $max_retries attempts"
    fi
    
    # フロントエンドのヘルスチェック
    retry_count=0
    while [[ $retry_count -lt $max_retries ]]; do
        if curl -f http://localhost:3000 > /dev/null 2>&1; then
            log_success "Frontend is healthy"
            break
        fi
        
        ((retry_count++))
        log_info "Waiting for frontend to be ready... ($retry_count/$max_retries)"
        sleep 10
    done
    
    if [[ $retry_count -eq $max_retries ]]; then
        error_exit "Frontend health check failed after $max_retries attempts"
    fi
}

# バックアップシステムの起動
start_backup_system() {
    log_info "Starting backup system..."
    
    # Litestreamの起動
    "$PROJECT_ROOT/scripts/litestream-manager.sh" start-daemon || error_exit "Failed to start Litestream"
    
    # バックアップcronの設定（本番環境でのみ）
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log_info "Setting up backup cron job..."
        (crontab -l 2>/dev/null; echo "0 2 * * * $PROJECT_ROOT/scripts/backup-cron.sh") | crontab -
    fi
    
    log_success "Backup system started"
}

# 監視システムの確認
verify_monitoring() {
    log_info "Verifying monitoring systems..."
    
    # Prometheusの確認
    if curl -f http://localhost:9090/-/healthy > /dev/null 2>&1; then
        log_success "Prometheus is healthy"
    else
        log_warn "Prometheus may not be accessible"
    fi
    
    # Grafanaの確認
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        log_success "Grafana is healthy"
    else
        log_warn "Grafana may not be accessible"
    fi
}

# デプロイメント完了処理
finalize_deployment() {
    log_info "Finalizing deployment..."
    
    # サービス状態の確認
    docker-compose -f docker-compose.prod.yml ps
    
    # ログの出力
    log_info "Recent service logs:"
    docker-compose -f docker-compose.prod.yml logs --tail=50
    
    # 成功メッセージ
    log_success "Deployment completed successfully!"
    log_info "Services are running at:"
    log_info "  - Frontend: http://localhost:3000"
    log_info "  - API: http://localhost:4001"
    log_info "  - Monitoring: http://localhost:3001"
    log_info "  - Metrics: http://localhost:9090"
}

# 使用方法の表示
usage() {
    cat << EOF
Usage: $0 [ENVIRONMENT]

Deploy AI Agent TRPG GM to specified environment

Arguments:
  ENVIRONMENT    Target environment (default: production)
                 Options: production, staging

Examples:
  $0 production
  $0 staging

Environment variables required:
  - LITESTREAM_S3_BUCKET
  - LITESTREAM_S3_REGION
  - LITESTREAM_S3_ACCESS_KEY_ID
  - LITESTREAM_S3_SECRET_ACCESS_KEY
  - OPENAI_API_KEY
  - ANTHROPIC_API_KEY
  - GOOGLE_API_KEY
  - JWT_SECRET
  - REDIS_PASSWORD
EOF
}

# メイン処理
main() {
    log_info "Starting deployment to $ENVIRONMENT environment..."
    log_info "Timestamp: $(date)"
    
    # 引数の確認
    if [[ "$1" == "--help" || "$1" == "-h" ]]; then
        usage
        exit 0
    fi
    
    # デプロイメントプロセス
    check_dependencies
    check_environment
    backup_current_state
    build_application
    run_migrations
    build_docker_images
    deploy_services
    health_check
    start_backup_system
    verify_monitoring
    finalize_deployment
    
    log_success "Deployment process completed successfully!"
}

# スクリプト実行
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi