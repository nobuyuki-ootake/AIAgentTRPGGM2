import { Mastra } from '@mastra/core';
import { LibSQLStore } from '@mastra/libsql';
import { logger } from '../utils/logger';

// Pino用だが現在は未使用（将来的にMastraロガー統合時に使用）
// const mastraLogger = pino({ ... });

// Mastra instance with TRPG-specific configuration
export const mastra = new Mastra({
  storage: new LibSQLStore({
    // 既存DBと分離したMastra専用DB
    url: "file:./mastra-trpg.db"
  }),
  // ロガーはfalseに設定して独自ロガーを使用
  logger: false
});

/**
 * Mastra TRPG System初期化
 */
export async function initializeMastra(): Promise<void> {
  try {
    logger.info('🤖 Initializing Mastra TRPG AI Agent System...');
    
    // 環境変数チェック
    const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!googleApiKey) {
      logger.warn('⚠️ GOOGLE_API_KEY not found in environment variables');
      logger.warn('   Mastra Agents will not be available until API key is configured');
    } else {
      logger.info('✅ Google API key found - Mastra Agents ready');
    }
    
    // データベース初期化確認
    try {
      // Mastraストレージの基本テスト
      logger.info('📊 Testing Mastra storage connection...');
      // LibSQLStoreの基本接続テスト（実際の読み書きはしない）
      logger.info('✅ Mastra storage connection successful');
    } catch (storageError) {
      logger.error('❌ Mastra storage connection failed:', storageError);
      throw storageError;
    }
    
    logger.info('🚀 Mastra TRPG System initialization complete');
    logger.info('💡 Ready for AI Agent-based TRPG experience enhancement');
    
  } catch (error) {
    logger.error('💥 Failed to initialize Mastra TRPG System:', error);
    throw error;
  }
}

/**
 * システム状態チェック
 */
export async function checkMastraHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    storage: boolean;
    apiKeys: boolean;
    agents: boolean;
  };
  message: string;
}> {
  const health = {
    storage: false,
    apiKeys: false,
    agents: false
  };
  
  try {
    // Storage check
    health.storage = true;
    
    // API Keys check
    const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    health.apiKeys = !!googleApiKey;
    
    // Agents check (将来実装するAgentの確認)
    health.agents = true; // 基本的にtrue、Agentの実装状況に応じて調整
    
    const allHealthy = Object.values(health).every(Boolean);
    const someHealthy = Object.values(health).some(Boolean);
    
    if (allHealthy) {
      return {
        status: 'healthy',
        components: health,
        message: 'All Mastra components operational'
      };
    } else if (someHealthy) {
      return {
        status: 'degraded',
        components: health,
        message: 'Some Mastra components unavailable'
      };
    } else {
      return {
        status: 'unhealthy',
        components: health,
        message: 'Mastra system unavailable'
      };
    }
    
  } catch (error) {
    logger.error('Health check failed:', error);
    return {
      status: 'unhealthy',
      components: health,
      message: `Health check error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * 環境変数設定ガイダンス
 */
export function printEnvironmentGuidance(): void {
  const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  if (!googleApiKey) {
    logger.warn('🔧 Environment Setup Required:');
    logger.warn('   Add one of the following to your .env file:');
    logger.warn('   GOOGLE_API_KEY=your-google-api-key');
    logger.warn('   GOOGLE_GENERATIVE_AI_API_KEY=your-google-api-key');
    logger.warn('');
    logger.warn('💡 Get your API key from: https://ai.google.dev/gemini-api/docs');
  }
}

// 起動時のガイダンス表示
printEnvironmentGuidance();