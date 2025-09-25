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

/**
 * WebSocket接続状態の確認
 */
export async function verifyWebSocketConnection(page: Page) {
  await page.waitForSelector('[data-testid="websocket-status"][data-status="connected"]', { 
    timeout: 10000 
  });
  const connectionStatus = page.locator('[data-testid="websocket-status"]');
  await expect(connectionStatus).toHaveAttribute('data-status', 'connected');
}

/**
 * AIプロバイダーの切り替え
 */
export async function switchAIProvider(page: Page, provider: 'openai' | 'anthropic' | 'google') {
  await page.click('[data-testid="settings-button"]');
  await page.waitForSelector('[data-testid="ai-settings-panel"]', { timeout: 5000 });
  
  const providerOption = page.locator(`[data-testid="ai-provider-${provider}"]`);
  await providerOption.click();
  await page.waitForTimeout(1000);
  
  await expect(providerOption).toHaveAttribute('data-selected', 'true');
  
  // 設定を保存
  const saveButton = page.locator('[data-testid="save-ai-settings"]');
  if (await saveButton.isVisible()) {
    await saveButton.click();
  }
}

/**
 * エンティティ操作のヘルパー
 */
export async function interactWithEntity(page: Page, entityId: string, action: 'talk' | 'examine' | 'follow') {
  const entity = page.locator(`[data-testid="entity-item"][data-entity-id="${entityId}"]`);
  await entity.click();
  
  await page.waitForSelector('[data-testid="entity-interaction-menu"]', { timeout: 3000 });
  
  const actionButton = page.locator(`[data-testid="entity-action-${action}"]`);
  await actionButton.click();
}

/**
 * パーティ移動提案の作成
 */
export async function createMovementProposal(page: Page, destination: string, reason?: string) {
  await page.click('[data-testid="create-movement-proposal"]');
  await page.waitForSelector('[data-testid="movement-proposal-form"]', { timeout: 3000 });
  
  await page.selectOption('[data-testid="destination-select"]', destination);
  
  if (reason) {
    await page.fill('[data-testid="proposal-reason"]', reason);
  }
  
  await page.click('[data-testid="submit-proposal-button"]');
  await page.waitForSelector('[data-testid="active-movement-proposal"]', { timeout: 5000 });
}

/**
 * 投票の実行
 */
export async function castVote(page: Page, choice: 'approve' | 'reject' | 'abstain', reason?: string) {
  await page.click(`[data-testid="vote-${choice}"]`);
  
  if (reason && choice === 'reject') {
    const reasonInput = page.locator('[data-testid="rejection-reason-input"]');
    if (await reasonInput.isVisible()) {
      await reasonInput.fill(reason);
    }
  }
  
  await page.waitForSelector('[data-testid="vote-confirmation"]', { timeout: 2000 });
  await page.click('[data-testid="confirm-vote-button"]');
  
  await page.waitForSelector('[data-testid="vote-cast-notification"]', { timeout: 3000 });
}

/**
 * セッション復元の確認
 */
export async function verifySessionRestoredCorrectly(page: Page, expectedData: {
  location?: string;
  messageCount?: number;
  lastMessage?: string;
}) {
  if (expectedData.location) {
    const currentLocation = page.locator('[data-testid="current-location"]');
    await expect(currentLocation).toContainText(expectedData.location);
  }
  
  if (expectedData.messageCount) {
    const messages = page.locator('[data-testid="chat-message"]');
    const count = await messages.count();
    expect(count).toBe(expectedData.messageCount);
  }
  
  if (expectedData.lastMessage) {
    await expect(page.locator('[data-testid="chat-log"]')).toContainText(expectedData.lastMessage);
  }
}

/**
 * ネットワーク状態のシミュレーション
 */
export async function simulateNetworkCondition(page: Page, condition: 'offline' | 'slow' | 'fast') {
  switch (condition) {
    case 'offline':
      await page.setOfflineMode(true);
      break;
    case 'slow':
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 2000); // 2秒遅延
      });
      break;
    case 'fast':
      await page.setOfflineMode(false);
      await page.unroute('**/*');
      break;
  }
}

/**
 * AIサービスエラーのシミュレーション
 */
export async function simulateAIServiceError(page: Page, errorType: 'connection' | 'rate_limit' | 'invalid_key' | 'timeout') {
  const errorResponses = {
    connection: {
      status: 503,
      body: JSON.stringify({
        error: 'AIプロバイダーに接続できません',
        code: 'AI_CONNECTION_FAILED',
        retryable: true
      })
    },
    rate_limit: {
      status: 429,
      body: JSON.stringify({
        error: 'API利用制限に達しました',
        code: 'RATE_LIMIT_EXCEEDED',
        resetTime: new Date(Date.now() + 300000).toISOString()
      })
    },
    invalid_key: {
      status: 401,
      body: JSON.stringify({
        error: 'APIキーが無効または期限切れです',
        code: 'INVALID_API_KEY'
      })
    },
    timeout: {
      status: 408,
      body: JSON.stringify({
        error: 'AI生成がタイムアウトしました',
        code: 'GENERATION_TIMEOUT'
      })
    }
  };
  
  const response = errorResponses[errorType];
  await page.route('**/api/ai-agent/**', route => {
    route.fulfill({
      status: response.status,
      contentType: 'application/json',
      body: response.body
    });
  });
}

/**
 * コンソールエラーの監視
 */
export async function monitorConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', error => {
    errors.push(error.message);
  });
  
  return errors;
}

/**
 * レスポンシブデザインテスト用ビューポート設定
 */
export async function testResponsiveDesign(page: Page, callback: (device: string) => Promise<void>) {
  const devices = [
    { name: 'desktop', width: 1920, height: 1080 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 667 }
  ];
  
  for (const device of devices) {
    await page.setViewportSize({ width: device.width, height: device.height });
    await page.waitForTimeout(500); // レイアウト調整を待機
    await callback(device.name);
  }
  
  // デフォルトサイズに戻す
  await page.setViewportSize({ width: 1280, height: 720 });
}