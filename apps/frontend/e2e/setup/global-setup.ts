import { chromium, FullConfig } from '@playwright/test';

/**
 * グローバルセットアップ - テスト実行前の準備
 * 
 * 重要な設計方針：
 * - Dockerの開発サーバーが起動するまで待機
 * - 必要に応じて認証状態の準備
 * - テストデータの初期化
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 テスト環境セットアップ開始');

  const { baseURL } = config.projects[0].use;
  
  if (!baseURL) {
    throw new Error('baseURL が設定されていません');
  }

  // 開発サーバーの起動確認
  console.log('📡 開発サーバーの起動確認中...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // ヘルスチェック（最大30秒待機）
    let retries = 30;
    while (retries > 0) {
      try {
        await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 5000 });
        console.log('✅ 開発サーバーが応答しています');
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw new Error(`開発サーバーに接続できません: ${baseURL}`);
        }
        console.log(`⏳ 開発サーバー起動待機中... (残り${retries}秒)`);
        await page.waitForTimeout(1000);
      }
    }

    // アプリケーションの基本動作確認
    await page.waitForSelector('[data-testid="app-layout"]', { timeout: 10000 });
    console.log('✅ アプリケーションが正常に読み込まれました');

  } finally {
    await browser.close();
  }

  console.log('✅ グローバルセットアップ完了');
}

export default globalSetup;