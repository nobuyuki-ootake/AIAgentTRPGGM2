import dotenv from 'dotenv';
import path from 'path';

// 環境変数の設定ファイルを読み込み
const NODE_ENV = process.env.NODE_ENV || 'development';
const envPath = path.join(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

// セキュリティ設定の検証
interface SecurityConfig {
  jwtSecret: string;
  corsOrigin: string;
  rateLimitWindow: number;
  rateLimitMax: number;
}

interface DatabaseConfig {
  path: string;
  poolSize: number;
}

interface AIConfig {
  openai: {
    apiKey: string | null;
    model: string;
  };
  anthropic: {
    apiKey: string | null;
    model: string;
  };
  google: {
    apiKey: string | null;
    model: string;
  };
  timeout: number;
  maxConcurrentRequests: number;
}

interface AppConfig {
  nodeEnv: string;
  port: number;
  frontendPort: number;
  security: SecurityConfig;
  database: DatabaseConfig;
  ai: AIConfig;
  logLevel: string;
  metricsEnabled: boolean;
}

// 環境変数検証関数
function validateEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value;
}

function validateOptionalEnv(key: string): string | null {
  return process.env[key] || null;
}

// セキュリティ設定の強化
function createSecurityConfig(): SecurityConfig {
  const jwtSecret = validateEnv('JWT_SECRET');
  
  // 本番環境でのセキュリティ要件チェック
  if (NODE_ENV === 'production') {
    if (jwtSecret === 'dev-secret-key-change-in-production') {
      throw new Error('JWT_SECRET must be changed in production environment');
    }
    if (jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters in production');
    }
  }

  return {
    jwtSecret,
    corsOrigin: validateEnv('CORS_ORIGIN', 'http://localhost:3000'),
    rateLimitWindow: parseInt(validateEnv('RATE_LIMIT_WINDOW', '15'), 10),
    rateLimitMax: parseInt(validateEnv('RATE_LIMIT_MAX', '100'), 10),
  };
}

// AI設定の強化
function createAIConfig(): AIConfig {
  return {
    openai: {
      apiKey: validateOptionalEnv('OPENAI_API_KEY'),
      model: validateEnv('OPENAI_MODEL', 'gpt-4-turbo-preview'),
    },
    anthropic: {
      apiKey: validateOptionalEnv('ANTHROPIC_API_KEY'),
      model: validateEnv('ANTHROPIC_MODEL', 'claude-3-opus-20240229'),
    },
    google: {
      apiKey: validateOptionalEnv('GOOGLE_API_KEY'),
      model: validateEnv('GOOGLE_MODEL', 'gemini-pro'),
    },
    timeout: parseInt(validateEnv('AI_REQUEST_TIMEOUT', '60000'), 10),
    maxConcurrentRequests: parseInt(validateEnv('MAX_CONCURRENT_AI_REQUESTS', '5'), 10),
  };
}

// データベース設定の強化
function createDatabaseConfig(): DatabaseConfig {
  return {
    path: validateEnv('DATABASE_PATH', './data/trpg.db'),
    poolSize: parseInt(validateEnv('DATABASE_POOL_SIZE', '10'), 10),
  };
}

// 統合設定の作成
export const config: AppConfig = {
  nodeEnv: NODE_ENV,
  port: parseInt(validateEnv('PORT', '4001'), 10),
  frontendPort: parseInt(validateEnv('FRONTEND_PORT', '3000'), 10),
  security: createSecurityConfig(),
  database: createDatabaseConfig(),
  ai: createAIConfig(),
  logLevel: validateEnv('LOG_LEVEL', 'info'),
  metricsEnabled: validateEnv('METRICS_ENABLED', 'true') === 'true',
};

// 設定の妥当性チェック
export function validateConfig(): void {
  const issues: string[] = [];

  // セキュリティチェック
  if (config.nodeEnv === 'production' && config.security.jwtSecret.length < 32) {
    issues.push('JWT_SECRET must be at least 32 characters in production');
  }

  // AI設定チェック
  const hasAnyApiKey = config.ai.openai.apiKey || config.ai.anthropic.apiKey || config.ai.google.apiKey;
  if (!hasAnyApiKey) {
    issues.push('At least one AI provider API key must be configured');
  }

  // ポートチェック
  if (config.port === config.frontendPort) {
    issues.push('Backend and frontend ports must be different');
  }

  if (issues.length > 0) {
    throw new Error(`Configuration validation failed:\n${issues.join('\n')}`);
  }
}

// 設定の表示（デバッグ用）
export function logConfig(): void {
  console.log('🔧 Configuration loaded:');
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  Port: ${config.port}`);
  console.log(`  Frontend Port: ${config.frontendPort}`);
  console.log(`  Database Path: ${config.database.path}`);
  console.log(`  AI Providers: ${Object.keys(config.ai).filter(key => 
    key !== 'timeout' && key !== 'maxConcurrentRequests' && 
    config.ai[key as keyof AIConfig] && 
    typeof config.ai[key as keyof AIConfig] === 'object' && 
    (config.ai[key as keyof AIConfig] as any).apiKey
  ).join(', ')}`);
  console.log(`  Log Level: ${config.logLevel}`);
  console.log(`  Metrics Enabled: ${config.metricsEnabled}`);
}

// 設定の初期化
export function initializeConfig(): void {
  try {
    validateConfig();
    logConfig();
  } catch (error) {
    console.error('❌ Configuration error:', error);
    process.exit(1);
  }
}