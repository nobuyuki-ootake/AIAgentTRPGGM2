/**
 * テスト用ヘルパー関数
 * 
 * CLAUDE.mdのテストルールに従った共通処理を提供
 */
import { Page, expect } from '@playwright/test';
import type { TRPGCampaign, TRPGSession } from '@ai-agent-trpg/types';

/**
 * アプリケーションの基本読み込み確認
 */
export async function waitForAppLoad(page: Page) {
  // AppLayoutコンポーネントの読み込み確認
  await page.waitForSelector('[data-testid="app-layout"]', { timeout: 10000 });
  
  // 基本的なナビゲーション要素の確認
  await expect(page.locator('[data-testid="navigation"]')).toBeVisible();
}

/**
 * ホームページへの安全な遷移
 */
export async function navigateToHome(page: Page) {
  await page.goto('/');
  await waitForAppLoad(page);
  await expect(page).toHaveTitle(/TRPG GM Assistant/);
}

/**
 * 新しいキャンペーン作成フローの開始
 */
export async function startNewCampaignFlow(page: Page) {
  await navigateToHome(page);
  
  // 新規キャンペーン作成ボタンをクリック
  await page.click('[data-testid="create-new-campaign"]');
  
  // キャンペーン設定ページの読み込み確認
  await page.waitForSelector('[data-testid="campaign-setup-form"]', { timeout: 5000 });
}

/**
 * キャンペーン設定フォームの入力
 */
export async function fillCampaignForm(page: Page, campaign: Partial<TRPGCampaign>) {
  if (campaign.name) {
    await page.fill('[data-testid="campaign-name-input"]', campaign.name);
  }
  
  if (campaign.description) {
    await page.fill('[data-testid="campaign-description-input"]', campaign.description);
  }
  
  if (campaign.settings?.theme) {
    await page.fill('[data-testid="campaign-theme-input"]', campaign.settings.theme);
  }
  
  if (campaign.settings?.world?.name) {
    await page.fill('[data-testid="world-name-input"]', campaign.settings.world.name);
  }
}

/**
 * セッション開始の確認
 */
export async function verifySessionStart(page: Page) {
  // セッションインターフェースの読み込み確認
  await page.waitForSelector('[data-testid="session-interface"]', { timeout: 10000 });
  
  // 基本的なセッション要素の確認
  await expect(page.locator('[data-testid="chat-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="dice-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="character-panel"]')).toBeVisible();
}

/**
 * ダイスロール操作の実行
 */
export async function performDiceRoll(page: Page, diceType: string = 'd20') {
  // ダイスパネルを開く
  await page.click('[data-testid="dice-panel-toggle"]');
  await page.waitForSelector('[data-testid="dice-panel-content"]', { timeout: 3000 });
  
  // 指定されたダイスボタンをクリック
  await page.click(`[data-testid="dice-${diceType}"]`);
  
  // ダイス結果の表示確認
  await page.waitForSelector('[data-testid="dice-result"]', { timeout: 5000 });
  
  // 結果の値を取得
  const result = await page.textContent('[data-testid="dice-result-value"]');
  return result ? parseInt(result) : null;
}

/**
 * チャットメッセージの送信
 */
export async function sendChatMessage(page: Page, message: string, type: 'ic' | 'ooc' = 'ic') {
  // チャット入力フィールドに入力
  await page.fill('[data-testid="chat-input"]', message);
  
  // メッセージタイプを選択（必要に応じて）
  if (type === 'ooc') {
    await page.click('[data-testid="chat-type-ooc"]');
  }
  
  // 送信ボタンをクリック
  await page.click('[data-testid="chat-send-button"]');
  
  // メッセージがチャットログに表示されることを確認
  await page.waitForSelector(`[data-testid="chat-message"]:has-text("${message}")`, { timeout: 3000 });
}

/**
 * AI生成機能のテスト（タイムアウト考慮）
 */
export async function waitForAIGeneration(page: Page, elementSelector: string, timeoutMs: number = 30000) {
  // AI生成中の表示確認
  await expect(page.locator('[data-testid="ai-generating"]')).toBeVisible();
  
  // 生成完了まで待機
  await page.waitForSelector(elementSelector, { timeout: timeoutMs });
  
  // 生成中表示の消失確認
  await expect(page.locator('[data-testid="ai-generating"]')).not.toBeVisible();
}

/**
 * エラー表示の確認
 */
export async function verifyErrorHandling(page: Page, expectedErrorMessage?: string) {
  // エラー表示要素の確認
  await expect(page.locator('[data-testid="error-display"]')).toBeVisible();
  
  if (expectedErrorMessage) {
    await expect(page.locator('[data-testid="error-message"]')).toContainText(expectedErrorMessage);
  }
  
  // リトライボタンの表示確認（フォールバック禁止のため）
  await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
}

/**
 * テスト前のクリーンアップ
 */
export async function cleanupTestData(page: Page) {
  // ローカルストレージのクリア
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  // IndexedDBのクリア（必要に応じて）
  await page.evaluate(() => {
    if ('indexedDB' in window) {
      indexedDB.deleteDatabase('trpg-app-data');
    }
  });
}

/**
 * スクリーンショット撮影（before/after比較用）
 */
export async function takeComparisonScreenshot(page: Page, name: string, step: 'before' | 'after') {
  await page.screenshot({ 
    path: `test-results/screenshots/${name}-${step}.png`,
    fullPage: true
  });
}

/**
 * ページロード時間の測定
 */
export async function measurePageLoadTime(page: Page, url: string): Promise<number> {
  const startTime = Date.now();
  await page.goto(url);
  await waitForAppLoad(page);
  const endTime = Date.now();
  
  return endTime - startTime;
}

/**
 * AI APIキーの設定確認
 */
export async function verifyAIApiKeyConfiguration(page: Page) {
  await page.goto('/settings');
  await page.waitForSelector('[data-testid="ai-settings-panel"]', { timeout: 5000 });
  
  // APIキー設定の確認（実際のキーは表示されない）
  const hasApiKey = await page.locator('[data-testid="api-key-configured"]').isVisible();
  return hasApiKey;
}