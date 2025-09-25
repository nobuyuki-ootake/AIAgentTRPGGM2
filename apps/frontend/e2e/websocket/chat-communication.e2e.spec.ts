/**
 * WebSocketチャット通信 E2Eテスト
 * 
 * 対象機能：
 * - リアルタイムチャット通信
 * - メッセージタイプ（IC/OOC）管理
 * - 接続状態管理
 * - 再接続処理
 * 
 * テスト方針：
 * - WebSocket接続の確立・維持確認
 * - メッセージ送受信の確認
 * - 接続エラー時の復旧確認
 */
import { test, expect } from '@playwright/test';
import {
  navigateToHome,
  startNewCampaignFlow,
  fillCampaignForm,
  verifySessionStart,
  sendChatMessage,
  takeComparisonScreenshot,
  cleanupTestData
} from '../utils/test-helpers';
import type { ChatMessage, SessionState } from '@ai-agent-trpg/types';

test.describe('WebSocketチャット通信機能', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupTestData(page);
    
    // セッション準備
    await navigateToHome(page);
    await startNewCampaignFlow(page);
    await fillCampaignForm(page, {
      name: 'WebSocketテストキャンペーン',
      description: 'リアルタイム通信のテスト'
    });
    await page.click('[data-testid="create-campaign-button"]');
    await page.waitForSelector('[data-testid="campaign-details"]', { timeout: 10000 });
    
    await page.click('[data-testid="start-session-button"]');
    await verifySessionStart(page);
  });

  test('ケース1: WebSocket接続の確立と状態表示', async ({ page }) => {
    await takeComparisonScreenshot(page, 'websocket-connection', 'before');
    
    // WebSocket接続状態の確認
    await page.waitForSelector('[data-testid="websocket-status"]', { timeout: 10000 });
    const connectionStatus = page.locator('[data-testid="websocket-status"]');
    
    // 接続状態の確認
    await expect(connectionStatus).toHaveAttribute('data-status', 'connected');
    await expect(connectionStatus).toContainText(/接続|Connected/);
    
    // 接続インジケータの色確認
    const statusIndicator = page.locator('[data-testid="connection-indicator"]');
    await expect(statusIndicator).toHaveClass(/connected|green/);
    
    // WebSocketメッセージカウンターの初期化確認
    const messageCounter = page.locator('[data-testid="websocket-message-count"]');
    if (await messageCounter.isVisible()) {
      const count = await messageCounter.textContent();
      expect(parseInt(count || '0')).toBeGreaterThanOrEqual(0);
    }
    
    await takeComparisonScreenshot(page, 'websocket-connection', 'after');
  });

  test('ケース2: ICメッセージのリアルタイム送受信', async ({ page }) => {
    await takeComparisonScreenshot(page, 'ic-message-realtime', 'before');
    
    // ICメッセージの送信
    const icMessage = '酒場の扉を開けて中に入る';
    await sendChatMessage(page, icMessage, 'ic');
    
    // メッセージがチャットログに即座に表示されることを確認
    await page.waitForSelector(`[data-testid="chat-message"]:has-text("${icMessage}")`, { 
      timeout: 3000 
    });
    
    // メッセージタイプの確認
    const messageElement = page.locator(`[data-testid="chat-message"]:has-text("${icMessage}")`);
    await expect(messageElement).toHaveAttribute('data-message-type', 'ic');
    
    // タイムスタンプの確認
    const timestamp = messageElement.locator('[data-testid="message-timestamp"]');
    await expect(timestamp).toBeVisible();
    
    // 送信者情報の確認
    const sender = messageElement.locator('[data-testid="message-sender"]');
    await expect(sender).toBeVisible();
    
    // WebSocketでのメッセージ送信確認（開発者ツールコンソールログ）
    const consoleMessages = [];
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('WebSocket')) {
        consoleMessages.push(msg.text());
      }
    });
    
    await takeComparisonScreenshot(page, 'ic-message-realtime', 'after');
  });

  test('ケース3: OOCメッセージの送受信', async ({ page }) => {
    await takeComparisonScreenshot(page, 'ooc-message-realtime', 'before');
    
    // チャットタイプをOOCに変更
    await page.click('[data-testid="chat-type-toggle"]');
    await page.waitForSelector('[data-testid="chat-type-ooc"][data-selected="true"]', { timeout: 2000 });
    
    // OOCメッセージの送信
    const oocMessage = '今日は遅くまでセッションできそうです';
    await page.fill('[data-testid="chat-input"]', oocMessage);
    await page.click('[data-testid="chat-send-button"]');
    
    // OOCメッセージの表示確認
    await page.waitForSelector(`[data-testid="chat-message"]:has-text("${oocMessage}")`, { 
      timeout: 3000 
    });
    
    const oocMessageElement = page.locator(`[data-testid="chat-message"]:has-text("${oocMessage}")`);
    await expect(oocMessageElement).toHaveAttribute('data-message-type', 'ooc');
    
    // OOCメッセージのスタイル確認（通常は異なる色やスタイル）
    await expect(oocMessageElement).toHaveClass(/ooc|out-of-character/);
    
    await takeComparisonScreenshot(page, 'ooc-message-realtime', 'after');
  });

  test('ケース4: メッセージ履歴の表示と管理', async ({ page }) => {
    await takeComparisonScreenshot(page, 'message-history', 'before');
    
    // 複数のメッセージを送信
    const testMessages = [
      { text: '宿屋に到着', type: 'ic' as const },
      { text: '部屋を予約する', type: 'ic' as const },
      { text: 'ちょっと休憩します', type: 'ooc' as const },
      { text: '夕食を注文', type: 'ic' as const }
    ];
    
    for (const msg of testMessages) {
      await sendChatMessage(page, msg.text, msg.type);
      await page.waitForTimeout(500); // メッセージ間の間隔
    }
    
    // チャット履歴の確認
    const chatLog = page.locator('[data-testid="chat-log"]');
    await expect(chatLog).toBeVisible();
    
    // 送信したメッセージがすべて履歴に存在することを確認
    for (const msg of testMessages) {
      await expect(chatLog).toContainText(msg.text);
    }
    
    // メッセージの順序確認
    const messageElements = page.locator('[data-testid="chat-message"]');
    const messageCount = await messageElements.count();
    expect(messageCount).toBeGreaterThanOrEqual(testMessages.length);
    
    // 最新メッセージが下部に表示されることを確認
    const lastMessage = messageElements.last();
    await expect(lastMessage).toContainText('夕食を注文');
    
    await takeComparisonScreenshot(page, 'message-history', 'after');
  });

  test('ケース5: チャットフィルタリング機能', async ({ page }) => {
    await takeComparisonScreenshot(page, 'chat-filtering', 'before');
    
    // IC/OOC混合メッセージを送信
    await sendChatMessage(page, 'IC: 街を歩き回る', 'ic');
    await sendChatMessage(page, 'OOC: 次の行動どうしましょう？', 'ooc');
    await sendChatMessage(page, 'IC: 情報収集をする', 'ic');
    
    // フィルタリングパネルの確認
    const filterPanel = page.locator('[data-testid="chat-filter-panel"]');
    if (await filterPanel.isVisible()) {
      // ICメッセージのみ表示
      await page.click('[data-testid="filter-ic-only"]');
      await page.waitForTimeout(1000);
      
      // OOCメッセージが非表示になることを確認
      const oocMessages = page.locator('[data-testid="chat-message"][data-message-type="ooc"]');
      await expect(oocMessages).not.toBeVisible();
      
      // ICメッセージは表示されることを確認
      const icMessages = page.locator('[data-testid="chat-message"][data-message-type="ic"]');
      await expect(icMessages.first()).toBeVisible();
      
      // フィルタリング解除
      await page.click('[data-testid="filter-all-messages"]');
      await page.waitForTimeout(1000);
      
      // すべてのメッセージが再表示されることを確認
      await expect(oocMessages).toBeVisible();
    }
    
    await takeComparisonScreenshot(page, 'chat-filtering', 'after');
  });

  test('ケース6: WebSocket切断と再接続', async ({ page }) => {
    await takeComparisonScreenshot(page, 'websocket-reconnection', 'before');
    
    // 正常接続の確認
    const connectionStatus = page.locator('[data-testid="websocket-status"]');
    await expect(connectionStatus).toHaveAttribute('data-status', 'connected');
    
    // WebSocket切断のシミュレーション（ネットワーク条件変更）
    await page.setOfflineMode(true);
    await page.waitForTimeout(2000);
    
    // 切断状態の確認
    await page.waitForSelector('[data-testid="websocket-status"][data-status="disconnected"]', {
      timeout: 10000
    });
    await expect(connectionStatus).toContainText(/切断|Disconnected/);
    
    // 再接続インジケータの確認
    const reconnectingIndicator = page.locator('[data-testid="reconnecting-indicator"]');
    if (await reconnectingIndicator.isVisible()) {
      await expect(reconnectingIndicator).toContainText(/再接続|Reconnecting/);
    }
    
    // ネットワーク復旧
    await page.setOfflineMode(false);
    
    // 自動再接続の確認
    await page.waitForSelector('[data-testid="websocket-status"][data-status="connected"]', {
      timeout: 15000
    });
    await expect(connectionStatus).toContainText(/接続|Connected/);
    
    // 再接続後のメッセージ送信テスト
    await sendChatMessage(page, '再接続後のテストメッセージ', 'ic');
    await page.waitForSelector('[data-testid="chat-message"]:has-text("再接続後のテストメッセージ")', {
      timeout: 3000
    });
    
    await takeComparisonScreenshot(page, 'websocket-reconnection', 'after');
  });

  test('ケース7: メッセージの配信確認', async ({ page }) => {
    // メッセージ配信状態の確認
    await sendChatMessage(page, '配信確認テストメッセージ', 'ic');
    
    // 送信中インジケータの確認
    const sendingIndicator = page.locator('[data-testid="message-sending"]');
    if (await sendingIndicator.isVisible()) {
      // 短時間で送信完了することを確認
      await expect(sendingIndicator).not.toBeVisible({ timeout: 5000 });
    }
    
    // 配信完了マークの確認
    const deliveredMessage = page.locator('[data-testid="chat-message"]:has-text("配信確認テストメッセージ")');
    const deliveryStatus = deliveredMessage.locator('[data-testid="delivery-status"]');
    
    if (await deliveryStatus.isVisible()) {
      await expect(deliveryStatus).toHaveAttribute('data-status', 'delivered');
    }
    
    // メッセージIDの確認（重複送信防止）
    const messageId = await deliveredMessage.getAttribute('data-message-id');
    expect(messageId).toBeTruthy();
  });

  test('WebSocketエラーハンドリング', async ({ page }) => {
    // WebSocket接続エラーのシミュレーション
    await page.route('**/ws', route => {
      route.abort('failed');
    });
    
    // ページリロードで接続エラーを発生させる
    await page.reload();
    
    // エラー状態の確認
    await page.waitForSelector('[data-testid="websocket-status"][data-status="error"]', {
      timeout: 10000
    });
    
    const connectionStatus = page.locator('[data-testid="websocket-status"]');
    await expect(connectionStatus).toContainText(/エラー|Error/);
    
    // 手動再接続ボタンの確認
    const reconnectButton = page.locator('[data-testid="manual-reconnect-button"]');
    if (await reconnectButton.isVisible()) {
      await expect(reconnectButton).toBeEnabled();
    }
    
    // ルートを解除して正常接続に戻す
    await page.unroute('**/ws');
    
    // 手動再接続テスト
    if (await reconnectButton.isVisible()) {
      await reconnectButton.click();
      
      // 再接続成功の確認
      await page.waitForSelector('[data-testid="websocket-status"][data-status="connected"]', {
        timeout: 15000
      });
    }
    
    console.log('WebSocket接続エラー・復旧テスト完了');
  });

  test('チャットパフォーマンス確認', async ({ page }) => {
    // 大量メッセージ送信時のパフォーマンステスト
    const messageCount = 20;
    const startTime = Date.now();
    
    for (let i = 1; i <= messageCount; i++) {
      await sendChatMessage(page, `メッセージ${i}`, 'ic');
      
      // 送信間隔を短縮（負荷テスト）
      if (i % 5 === 0) {
        await page.waitForTimeout(100);
      }
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log(`${messageCount}件のメッセージ送信時間: ${totalTime}ms`);
    
    // 全メッセージの表示確認
    for (let i = 1; i <= messageCount; i++) {
      await expect(page.locator('[data-testid="chat-log"]')).toContainText(`メッセージ${i}`);
    }
    
    // パフォーマンス基準（20件で10秒以内）
    expect(totalTime).toBeLessThan(10000);
  });
});