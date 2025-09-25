/**
 * AIサービスエラー E2Eテスト
 * 
 * 対象機能：
 * - AIプロバイダー接続エラー
 * - API利用制限エラー
 * - AIレスポンス品質エラー
 * - プロバイダー切り替え機能
 * 
 * テスト方針：
 * - 各種AIサービスエラーの再現
 * - ユーザー解決可能なエラー表示
 * - 自動フォールバック機能なし（明示的なエラー表示）
 * - 代替手段の提示
 */
import { test, expect } from '@playwright/test';
import {
  navigateToHome,
  startNewCampaignFlow,
  fillCampaignForm,
  verifySessionStart,
  sendChatMessage,
  takeComparisonScreenshot,
  cleanupTestData,
  verifyErrorHandling,
  waitForAIGeneration
} from '../utils/test-helpers';

test.describe('AIサービスエラーハンドリング', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupTestData(page);
    
    // テストセッション準備
    await navigateToHome(page);
    await startNewCampaignFlow(page);
    await fillCampaignForm(page, {
      name: 'AIエラーテストキャンペーン',
      description: 'AIサービスエラーハンドリングのテスト'
    });
    await page.click('[data-testid="create-campaign-button"]');
    await page.waitForSelector('[data-testid="campaign-details"]', { timeout: 10000 });
    
    await page.click('[data-testid="start-session-button"]');
    await verifySessionStart(page);
  });

  test('ケース1: AIプロバイダー接続エラー', async ({ page }) => {
    await takeComparisonScreenshot(page, 'ai-provider-connection-error', 'before');
    
    // AI接続エラーのシミュレーション
    await page.route('**/api/ai-agent/**', route => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'AIプロバイダーに接続できません',
          code: 'AI_CONNECTION_FAILED',
          provider: 'openai',
          retryable: true
        })
      });
    });
    
    // AI機能を必要とする操作
    await sendChatMessage(page, 'AIに質問: この世界の歴史を教えて', 'ooc');
    
    // エラー表示の確認
    await verifyErrorHandling(page, 'AIプロバイダーに接続できません');
    
    // エラー詳細の表示確認
    const errorDetails = page.locator('[data-testid="error-details"]');
    await expect(errorDetails).toContainText('openai');
    await expect(errorDetails).toContainText('AI_CONNECTION_FAILED');
    
    // 代替手段の提示確認
    const alternativeOptions = page.locator('[data-testid="alternative-options"]');
    await expect(alternativeOptions).toBeVisible();
    
    // 手動操作での継続オプション
    const manualContinueButton = page.locator('[data-testid="continue-manually"]');
    if (await manualContinueButton.isVisible()) {
      await expect(manualContinueButton).toContainText('手動で続行');
    }
    
    // プロバイダー変更オプション
    const changeProviderButton = page.locator('[data-testid="change-ai-provider"]');
    if (await changeProviderButton.isVisible()) {
      await expect(changeProviderButton).toContainText('プロバイダー変更');
    }
    
    await takeComparisonScreenshot(page, 'ai-provider-connection-error', 'after');
  });

  test('ケース2: API利用制限エラー', async ({ page }) => {
    await takeComparisonScreenshot(page, 'api-rate-limit-error', 'before');
    
    // API利用制限エラーのシミュレーション
    await page.route('**/api/ai-agent/gm-response', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'API利用制限に達しました',
          code: 'RATE_LIMIT_EXCEEDED',
          resetTime: new Date(Date.now() + 300000).toISOString(), // 5分後
          dailyLimit: 1000,
          dailyUsed: 1000
        })
      });
    });
    
    // AI応答を要求するアクション
    await sendChatMessage(page, '酒場の様子を詳しく描写してください', 'ic');
    
    // 利用制限エラーの表示確認
    await page.waitForSelector('[data-testid="rate-limit-error"]', { timeout: 5000 });
    const rateLimitError = page.locator('[data-testid="rate-limit-error"]');
    await expect(rateLimitError).toContainText('API利用制限に達しました');
    
    // 制限情報の詳細表示
    const limitDetails = page.locator('[data-testid="limit-details"]');
    await expect(limitDetails).toContainText('1000 / 1000');
    
    // リセット時間の表示
    const resetTime = page.locator('[data-testid="reset-time"]');
    await expect(resetTime).toBeVisible();
    const resetText = await resetTime.textContent();
    expect(resetText).toMatch(/\d+:\d+/); // 時間形式
    
    // 解決方法の提示
    const resolutionOptions = page.locator('[data-testid="resolution-options"]');
    await expect(resolutionOptions).toBeVisible();
    
    // 別プロバイダーへの切り替え提案
    const switchProviderButton = page.locator('[data-testid="switch-provider-suggestion"]');
    if (await switchProviderButton.isVisible()) {
      await expect(switchProviderButton).toContainText('別のAIプロバイダー');
    }
    
    // 手動操作での継続
    const manualModeButton = page.locator('[data-testid="manual-mode-button"]');
    if (await manualModeButton.isVisible()) {
      await manualModeButton.click();
      
      // 手動モード移行の確認
      await page.waitForSelector('[data-testid="manual-mode-active"]', { timeout: 3000 });
      const manualModeIndicator = page.locator('[data-testid="manual-mode-active"]');
      await expect(manualModeIndicator).toContainText('手動モード');
    }
    
    await takeComparisonScreenshot(page, 'api-rate-limit-error', 'after');
  });

  test('ケース3: 不正なAPIキーエラー', async ({ page }) => {
    await takeComparisonScreenshot(page, 'invalid-api-key-error', 'before');
    
    // 不正なAPIキーエラーのシミュレーション
    await page.route('**/api/ai-agent/**', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'APIキーが無効または期限切れです',
          code: 'INVALID_API_KEY',
          provider: 'anthropic'
        })
      });
    });
    
    // AI機能の使用試行
    await page.click('[data-testid="generate-npc-button"]');
    await page.waitForSelector('[data-testid="npc-generation-panel"]', { timeout: 3000 });
    await page.click('[data-testid="start-generation-button"]');
    
    // APIキーエラーの表示確認
    await page.waitForSelector('[data-testid="api-key-error"]', { timeout: 5000 });
    const apiKeyError = page.locator('[data-testid="api-key-error"]');
    await expect(apiKeyError).toContainText('APIキーが無効または期限切れ');
    
    // セキュリティのため、具体的なキーは表示しない
    const apiKeyDisplay = page.locator('[data-testid="api-key-display"]');
    await expect(apiKeyDisplay).not.toBeVisible();
    
    // APIキー設定画面への案内
    const configureKeyButton = page.locator('[data-testid="configure-api-key"]');
    await expect(configureKeyButton).toBeVisible();
    await expect(configureKeyButton).toContainText('APIキー設定');
    
    // 設定画面への遷移
    await configureKeyButton.click();
    await page.waitForSelector('[data-testid="ai-settings-panel"]', { timeout: 5000 });
    
    // 該当プロバイダーの設定欄がハイライト
    const anthropicSettings = page.locator('[data-testid="ai-provider-anthropic"]');
    if (await anthropicSettings.isVisible()) {
      await expect(anthropicSettings).toHaveClass(/highlighted|error/);
    }
    
    // APIキー入力フィールドの確認
    const apiKeyInput = page.locator('[data-testid="anthropic-api-key-input"]');
    await expect(apiKeyInput).toBeVisible();
    await expect(apiKeyInput).toBeEnabled();
    
    await takeComparisonScreenshot(page, 'invalid-api-key-error', 'after');
  });

  test('ケース4: AIレスポンス品質エラー', async ({ page }) => {
    await takeComparisonScreenshot(page, 'ai-response-quality-error', 'before');
    
    // 不適切なAIレスポンスのシミュレーション
    await page.route('**/api/ai-agent/gm-response', route => {
      route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'AIレスポンスが不適切です',
          code: 'INAPPROPRIATE_CONTENT',
          reason: 'Content violated safety guidelines',
          retryable: true
        })
      });
    });
    
    // AI応答を要求
    await sendChatMessage(page, '何か面白いことが起こりますか？', 'ic');
    
    // 品質エラーの表示確認
    await page.waitForSelector('[data-testid="content-quality-error"]', { timeout: 5000 });
    const qualityError = page.locator('[data-testid="content-quality-error"]');
    await expect(qualityError).toContainText('AIレスポンスが不適切');
    
    // エラー理由の表示（技術的詳細は非表示）
    const userFriendlyReason = page.locator('[data-testid="user-friendly-reason"]');
    await expect(userFriendlyReason).toContainText('安全性ガイドライン');
    
    // 再試行オプション
    const retryButton = page.locator('[data-testid="retry-button"]');
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toContainText('再試行');
    
    // 質問の再表現提案
    const rephraseSuggestion = page.locator('[data-testid="rephrase-suggestion"]');
    if (await rephraseSuggestion.isVisible()) {
      await expect(rephraseSuggestion).toContainText('質問を変更');
    }
    
    // APIを正常に戻す
    await page.unroute('**/api/ai-agent/gm-response');
    
    // 再試行実行
    await retryButton.click();
    
    // 正常なレスポンスの確認
    await waitForAIGeneration(page, '[data-testid="gm-message"]', 15000);
    
    await takeComparisonScreenshot(page, 'ai-response-quality-error', 'after');
  });

  test('ケース5: プロバイダー自動切り替えの拒否', async ({ page }) => {
    await takeComparisonScreenshot(page, 'provider-fallback-rejection', 'before');
    
    // メインプロバイダーのエラー
    await page.route('**/api/ai-agent/**', route => {
      if (route.request().url().includes('provider=openai')) {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'OpenAI サービスが利用できません',
            code: 'SERVICE_UNAVAILABLE'
          })
        });
      } else {
        route.continue();
      }
    });
    
    // AI機能使用試行
    await sendChatMessage(page, 'AI GM: シナリオを開始してください', 'ooc');
    
    // エラー表示の確認
    await page.waitForSelector('[data-testid="service-unavailable-error"]', { timeout: 5000 });
    
    // 自動フォールバックが発生しないことを確認
    const automaticFallback = page.locator('[data-testid="automatic-fallback"]');
    await expect(automaticFallback).not.toBeVisible();
    
    // 明示的な選択肢の提示
    const providerOptions = page.locator('[data-testid="provider-selection"]');
    await expect(providerOptions).toBeVisible();
    
    const alternativeProviders = page.locator('[data-testid="alternative-provider"]');
    const providerCount = await alternativeProviders.count();
    expect(providerCount).toBeGreaterThan(0);
    
    // 手動でプロバイダー選択
    const anthropicOption = page.locator('[data-testid="select-anthropic"]');
    if (await anthropicOption.isVisible()) {
      await anthropicOption.click();
      
      // 選択確認ダイアログ
      await page.waitForSelector('[data-testid="provider-change-confirmation"]', { timeout: 3000 });
      await page.click('[data-testid="confirm-provider-change"]');
      
      // プロバイダー変更完了の確認
      await page.waitForSelector('[data-testid="provider-changed-notification"]', { timeout: 3000 });
    }
    
    await takeComparisonScreenshot(page, 'provider-fallback-rejection', 'after');
  });

  test('ケース6: AI生成タイムアウトエラー', async ({ page }) => {
    await takeComparisonScreenshot(page, 'ai-generation-timeout', 'before');
    
    // 長時間応答しないAIサービスのシミュレーション
    await page.route('**/api/ai-agent/generate-character', route => {
      // 意図的に応答しない（タイムアウトを発生させる）
      setTimeout(() => {
        route.fulfill({
          status: 408,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'AI生成がタイムアウトしました',
            code: 'GENERATION_TIMEOUT',
            timeoutDuration: 30000
          })
        });
      }, 5000); // 5秒後にタイムアウト応答
    });
    
    // 時間のかかるAI生成を実行
    await page.click('[data-testid="character-management-tab"]');
    await page.click('[data-testid="generate-npc-button"]');
    await page.waitForSelector('[data-testid="npc-generation-panel"]', { timeout: 3000 });
    await page.check('[data-testid="detailed-generation-mode"]');
    await page.click('[data-testid="start-generation-button"]');
    
    // 生成中表示の確認
    await page.waitForSelector('[data-testid="ai-generating"]', { timeout: 3000 });
    const generatingIndicator = page.locator('[data-testid="ai-generating"]');
    await expect(generatingIndicator).toContainText('生成中');
    
    // プログレスバーまたはスピナーの確認
    const progressIndicator = page.locator('[data-testid="generation-progress"]');
    if (await progressIndicator.isVisible()) {
      await expect(progressIndicator).toBeVisible();
    }
    
    // タイムアウトエラーの表示確認
    await page.waitForSelector('[data-testid="timeout-error"]', { timeout: 10000 });
    const timeoutError = page.locator('[data-testid="timeout-error"]');
    await expect(timeoutError).toContainText('タイムアウト');
    
    // タイムアウト時間の表示
    const timeoutDuration = page.locator('[data-testid="timeout-duration"]');
    await expect(timeoutDuration).toContainText('30');
    
    // 再試行オプション
    const retryWithOptionsButton = page.locator('[data-testid="retry-with-options"]');
    await expect(retryWithOptionsButton).toBeVisible();
    
    // より簡単な生成オプションの提案
    const simplifiedOptions = page.locator('[data-testid="simplified-generation"]');
    if (await simplifiedOptions.isVisible()) {
      await expect(simplifiedOptions).toContainText('簡易生成');
    }
    
    await takeComparisonScreenshot(page, 'ai-generation-timeout', 'after');
  });

  test('ケース7: 複数プロバイダー同時エラー', async ({ page }) => {
    // 全てのAIプロバイダーでエラーをシミュレート
    await page.route('**/api/ai-agent/**', route => {
      const provider = route.request().url().includes('provider=') 
        ? route.request().url().match(/provider=([^&]+)/)?.[1] 
        : 'unknown';
      
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: `${provider} プロバイダーでエラーが発生しました`,
          code: 'PROVIDER_ERROR',
          provider: provider
        })
      });
    });
    
    // AI機能の使用試行
    await sendChatMessage(page, 'AI機能テスト', 'ooc');
    
    // 全プロバイダーエラーの表示
    await page.waitForSelector('[data-testid="all-providers-error"]', { timeout: 5000 });
    const allProvidersError = page.locator('[data-testid="all-providers-error"]');
    await expect(allProvidersError).toContainText('すべてのAIプロバイダーでエラー');
    
    // 手動モードへの移行提案
    const manualModeOption = page.locator('[data-testid="switch-to-manual"]');
    await expect(manualModeOption).toBeVisible();
    await expect(manualModeOption).toContainText('手動モードで続行');
    
    // AIなしでの継続ガイド
    const noAiGuide = page.locator('[data-testid="no-ai-guide"]');
    if (await noAiGuide.isVisible()) {
      await expect(noAiGuide).toContainText('AI機能なしでTRPGを続行');
    }
    
    // 手動モードへ切り替え
    await manualModeOption.click();
    
    // 手動モード確認
    await page.waitForSelector('[data-testid="manual-mode-activated"]', { timeout: 3000 });
    const manualModeActive = page.locator('[data-testid="manual-mode-activated"]');
    await expect(manualModeActive).toContainText('手動モードが有効');
    
    console.log('複数プロバイダー同時エラーテスト完了');
  });

  test('AIエラー統計とユーザーサポート', async ({ page }) => {
    // エラー発生履歴の確認
    await page.goto('/settings');
    await page.waitForSelector('[data-testid="ai-settings-panel"]', { timeout: 5000 });
    
    // エラー統計パネル
    const errorStatsPanel = page.locator('[data-testid="ai-error-stats"]');
    if (await errorStatsPanel.isVisible()) {
      // 過去24時間のエラー数
      const errorCount = page.locator('[data-testid="error-count-24h"]');
      await expect(errorCount).toBeVisible();
      
      // 最も多いエラータイプ
      const commonErrors = page.locator('[data-testid="common-error-types"]');
      await expect(commonErrors).toBeVisible();
    }
    
    // サポート情報の表示
    const supportInfo = page.locator('[data-testid="ai-support-info"]');
    if (await supportInfo.isVisible()) {
      // トラブルシューティングガイドへのリンク
      const troubleshootingLink = page.locator('[data-testid="troubleshooting-guide"]');
      await expect(troubleshootingLink).toBeVisible();
      
      // サポートコンタクト情報
      const supportContact = page.locator('[data-testid="support-contact"]');
      await expect(supportContact).toBeVisible();
    }
    
    console.log('AIエラー統計・サポートテスト完了');
  });
});