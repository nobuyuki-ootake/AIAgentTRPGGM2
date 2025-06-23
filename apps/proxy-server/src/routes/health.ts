import { Router } from 'express';
import { getDatabase } from '../database/database';

const router = Router();

/**
 * データベース接続をチェック
 */
function checkDatabaseConnection(): boolean {
  try {
    const db = getDatabase();
    // 簡単なクエリでDB接続をテスト
    const result = db.prepare('SELECT 1 as test').get();
    return result !== undefined;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

/**
 * APIキー設定状況をチェック（セキュリティ保護）
 * APIキーの値は返さず、存在の有無のみを返す
 */
router.get('/', (_req, res): void => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      apiKeys: {
        google: !!process.env.GOOGLE_API_KEY,
        openai: !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
      },
      database: {
        connected: checkDatabaseConnection(),
      },
      version: '1.0.0',
    };

    console.log('Health check performed:', {
      timestamp: healthStatus.timestamp,
      googleApiKey: healthStatus.apiKeys.google ? 'CONFIGURED' : 'NOT_CONFIGURED',
      openaiApiKey: healthStatus.apiKeys.openai ? 'CONFIGURED' : 'NOT_CONFIGURED',
      anthropicApiKey: healthStatus.apiKeys.anthropic ? 'CONFIGURED' : 'NOT_CONFIGURED',
    });

    res.json(healthStatus);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      apiKeys: {
        google: false,
        openai: false,
        anthropic: false,
      },
      database: {
        connected: checkDatabaseConnection(),
      },
    });
  }
});

/**
 * APIキー接続テスト（プロバイダー別）
 */
router.post('/test-api-key', async (req, res): Promise<void> => {
  try {
    const { provider } = req.body;
    
    if (!provider) {
      res.status(400).json({
        error: 'Provider is required',
        supportedProviders: ['google', 'openai', 'anthropic'],
      });
      return;
    }

    let hasApiKey = false;
    let keySource = 'not_found';

    switch (provider.toLowerCase()) {
      case 'google':
        hasApiKey = !!process.env.GOOGLE_API_KEY;
        keySource = hasApiKey ? 'environment' : 'not_found';
        break;
      case 'openai':
        hasApiKey = !!process.env.OPENAI_API_KEY;
        keySource = hasApiKey ? 'environment' : 'not_found';
        break;
      case 'anthropic':
        hasApiKey = !!process.env.ANTHROPIC_API_KEY;
        keySource = hasApiKey ? 'environment' : 'not_found';
        break;
      default:
        res.status(400).json({
          error: `Unsupported provider: ${provider}`,
          supportedProviders: ['google', 'openai', 'anthropic'],
        });
        return;
    }

    console.log(`API key test for ${provider}:`, {
      hasApiKey,
      keySource,
      timestamp: new Date().toISOString(),
    });

    res.json({
      provider,
      hasApiKey,
      keySource,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('API key test failed:', error);
    res.status(500).json({
      error: 'API key test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;