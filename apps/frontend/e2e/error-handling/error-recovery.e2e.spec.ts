/**
 * エラー復旧 E2Eテスト
 * 
 * 対象機能：
 * - ネットワークエラーからの復旧
 * - セッション状態の復元
 * - データの整合性確保
 * - ユーザー操作の継続性
 * 
 * テスト方針：
 * - 各種エラー状況を再現
 * - 自動復旧機能の確認
 * - ユーザー解決可能なエラー表示
 * - データ損失防止の確認
 */
import { test, expect } from '@playwright/test';
import {
  navigateToHome,
  startNewCampaignFlow,
  fillCampaignForm,
  verifySessionStart,
  sendChatMessage,
  performDiceRoll,
  takeComparisonScreenshot,
  cleanupTestData,
  verifyErrorHandling
} from '../utils/test-helpers';
import type { SessionState, TRPGCampaign } from '@ai-agent-trpg/types';

test.describe('エラー復旧機能', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupTestData(page);
    
    // 基本セッションの準備
    await navigateToHome(page);
    await startNewCampaignFlow(page);
    await fillCampaignForm(page, {
      name: 'エラー復旧テストキャンペーン',
      description: 'エラーハンドリングと復旧機能のテスト'
    });
    await page.click('[data-testid="create-campaign-button"]');
    await page.waitForSelector('[data-testid="campaign-details"]', { timeout: 10000 });
    
    await page.click('[data-testid="start-session-button"]');
    await verifySessionStart(page);
  });

  test('ケース1: ネットワーク断絶からの自動復旧', async ({ page }) => {
    await takeComparisonScreenshot(page, 'network-disconnection-recovery', 'before');
    
    // 初期状態の確認
    await expect(page.locator('[data-testid="websocket-status"]')).toHaveAttribute('data-status', 'connected');
    
    // 正常なメッセージ送信
    await sendChatMessage(page, '断絶前のテストメッセージ', 'ic');
    await page.waitForSelector('[data-testid="chat-message"]:has-text("断絶前のテストメッセージ")', { 
      timeout: 3000 
    });
    
    // ネットワーク断絶のシミュレーション
    console.log('ネットワーク断絶を開始');
    await page.setOfflineMode(true);
    
    // 切断状態の確認
    await page.waitForSelector('[data-testid="websocket-status"][data-status="disconnected"]', {
      timeout: 10000
    });
    
    // オフライン状態インジケータの確認
    const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
    await expect(offlineIndicator).toBeVisible();
    await expect(offlineIndicator).toContainText(/オフライン|Offline/);
    
    // オフライン中のメッセージ送信試行
    await page.fill('[data-testid="chat-input"]', 'オフライン中のメッセージ');
    await page.click('[data-testid="chat-send-button"]');
    
    // メッセージが保留キューに入ることを確認
    const pendingMessage = page.locator('[data-testid="pending-message"]');
    if (await pendingMessage.isVisible()) {
      await expect(pendingMessage).toContainText('オフライン中のメッセージ');
    }
    
    // ネットワーク復旧
    console.log('ネットワーク復旧を開始');
    await page.setOfflineMode(false);
    
    // 自動再接続の確認
    await page.waitForSelector('[data-testid="websocket-status"][data-status="connected"]', {
      timeout: 20000
    });
    
    // 保留メッセージの自動送信確認
    await page.waitForSelector('[data-testid="chat-message"]:has-text("オフライン中のメッセージ")', {
      timeout: 5000
    });
    
    // セッション状態の復元確認
    await expect(page.locator('[data-testid="session-state-indicator"]')).toContainText('進行中');
    
    await takeComparisonScreenshot(page, 'network-disconnection-recovery', 'after');
  });

  test('ケース2: ページリロード後のセッション復元', async ({ page }) => {
    await takeComparisonScreenshot(page, 'page-reload-recovery', 'before');
    
    // セッション開始前のデータ作成
    await sendChatMessage(page, 'リロード前のメッセージ1', 'ic');
    await sendChatMessage(page, 'リロード前のメッセージ2', 'ooc');
    await performDiceRoll(page, 'd20');
    
    // セッション状態の記録
    const preReloadLocation = await page.locator('[data-testid="current-location"]').textContent();
    const preReloadMessages = await page.locator('[data-testid="chat-message"]').count();
    
    console.log(`リロード前: 場所=${preReloadLocation}, メッセージ数=${preReloadMessages}`);
    
    // ページリロード
    await page.reload();
    
    // ローディング画面の確認
    const loadingIndicator = page.locator('[data-testid="loading-indicator"]');
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).toContainText(/読み込み|Loading/);
    }
    
    // セッション復元の確認
    await verifySessionStart(page);
    
    // 場所情報の復元確認
    const postReloadLocation = await page.locator('[data-testid="current-location"]').textContent();
    expect(postReloadLocation).toBe(preReloadLocation);
    
    // チャット履歴の復元確認
    await page.waitForSelector('[data-testid="chat-message"]', { timeout: 5000 });
    const postReloadMessages = await page.locator('[data-testid="chat-message"]').count();
    expect(postReloadMessages).toBe(preReloadMessages);
    
    // 特定メッセージの復元確認
    await expect(page.locator('[data-testid="chat-log"]')).toContainText('リロード前のメッセージ1');
    await expect(page.locator('[data-testid="chat-log"]')).toContainText('リロード前のメッセージ2');
    
    // WebSocket再接続の確認
    await expect(page.locator('[data-testid="websocket-status"]')).toHaveAttribute('data-status', 'connected');
    
    await takeComparisonScreenshot(page, 'page-reload-recovery', 'after');
  });

  test('ケース3: ブラウザタブ切り替え時の状態管理', async ({ page }) => {
    await takeComparisonScreenshot(page, 'tab-switch-recovery', 'before');
    
    // アクティブ状態での操作
    await sendChatMessage(page, 'タブ切り替え前のメッセージ', 'ic');
    
    // ページをバックグラウンドに移す（visibilityAPI）
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true
      });
      Object.defineProperty(document, 'hidden', {
        value: true,
        writable: true
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    // バックグラウンド状態の確認
    const backgroundIndicator = page.locator('[data-testid="background-mode"]');
    if (await backgroundIndicator.isVisible()) {
      await expect(backgroundIndicator).toContainText(/バックグラウンド|Background/);
    }
    
    // バックグラウンド中の更新シミュレート
    await page.evaluate(() => {
      const backgroundUpdate = {
        type: 'chat_message',
        message: {
          id: 'bg-message-1',
          text: 'バックグラウンド中の他プレイヤーメッセージ',
          sender: 'player-2',
          type: 'ic',
          timestamp: new Date().toISOString()
        }
      };
      
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: backgroundUpdate
      }));
    });
    
    // フォアグラウンドに復帰
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true
      });
      Object.defineProperty(document, 'hidden', {
        value: false,
        writable: true
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    // 未読メッセージ通知の確認
    const unreadNotification = page.locator('[data-testid="unread-messages"]');
    if (await unreadNotification.isVisible()) {
      await expect(unreadNotification).toContainText('1');
    }
    
    // バックグラウンド中のメッセージ表示確認
    await expect(page.locator('[data-testid="chat-log"]')).toContainText('バックグラウンド中の他プレイヤーメッセージ');
    
    await takeComparisonScreenshot(page, 'tab-switch-recovery', 'after');
  });

  test('ケース4: データ保存エラーからの復旧', async ({ page }) => {
    await takeComparisonScreenshot(page, 'data-save-error-recovery', 'before');
    
    // データ保存APIエラーのシミュレーション
    await page.route('**/api/sessions/save', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'データベース接続エラー',
          code: 'DB_CONNECTION_FAILED'
        })
      });
    });
    
    // データ保存が発生する操作
    await sendChatMessage(page, '保存エラーテストメッセージ', 'ic');
    
    // エラー表示の確認
    await page.waitForSelector('[data-testid="save-error-notification"]', { timeout: 5000 });
    const saveError = page.locator('[data-testid="save-error-notification"]');
    await expect(saveError).toContainText('データベース接続エラー');
    
    // ローカル保存フォールバックの確認
    const localSaveIndicator = page.locator('[data-testid="local-save-active"]');
    if (await localSaveIndicator.isVisible()) {
      await expect(localSaveIndicator).toContainText('ローカル保存中');
    }
    
    // 手動リトライボタンの確認
    const retryButton = page.locator('[data-testid="retry-save-button"]');
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toBeEnabled();
    
    // APIを正常に戻す
    await page.unroute('**/api/sessions/save');
    
    // リトライ実行
    await retryButton.click();
    
    // 保存成功の確認
    await page.waitForSelector('[data-testid="save-success-notification"]', { timeout: 5000 });
    const saveSuccess = page.locator('[data-testid="save-success-notification"]');
    await expect(saveSuccess).toContainText('保存完了');
    
    // ローカル保存データの同期確認
    const syncStatus = page.locator('[data-testid="sync-status"]');
    if (await syncStatus.isVisible()) {
      await expect(syncStatus).toContainText('同期済み');
    }
    
    await takeComparisonScreenshot(page, 'data-save-error-recovery', 'after');
  });

  test('ケース5: セッション競合の解決', async ({ page }) => {
    await takeComparisonScreenshot(page, 'session-conflict-resolution', 'before');
    
    // 同じセッションへの複数接続をシミュレート
    await page.evaluate(() => {
      const conflictNotification = {
        type: 'session_conflict',
        conflict: {
          type: 'multiple_connections',
          sessionId: 'test-session-1',
          conflictingConnectionId: 'conn-2',
          timestamp: new Date().toISOString()
        }
      };
      
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: conflictNotification
      }));
    });
    
    // 競合通知の表示確認
    await page.waitForSelector('[data-testid="session-conflict-dialog"]', { timeout: 3000 });
    const conflictDialog = page.locator('[data-testid="session-conflict-dialog"]');
    await expect(conflictDialog).toContainText('セッション競合');
    
    // 解決オプションの確認
    const takeOverButton = page.locator('[data-testid="takeover-session-button"]');
    const joinModeButton = page.locator('[data-testid="join-mode-button"]');
    
    await expect(takeOverButton).toBeVisible();
    await expect(joinModeButton).toBeVisible();
    
    // セッション引き継ぎを選択
    await takeOverButton.click();
    
    // 引き継ぎ確認ダイアログ
    await page.waitForSelector('[data-testid="takeover-confirmation"]', { timeout: 2000 });
    await page.click('[data-testid="confirm-takeover-button"]');
    
    // セッション再開の確認
    await page.waitForSelector('[data-testid="session-resumed"]', { timeout: 5000 });
    await expect(page.locator('[data-testid="session-state-indicator"]')).toContainText('進行中');
    
    await takeComparisonScreenshot(page, 'session-conflict-resolution', 'after');
  });

  test('ケース6: 容量制限エラーの処理', async ({ page }) => {
    // ローカルストレージ容量制限のシミュレーション
    await page.evaluate(() => {
      // ローカルストレージをほぼ満杯にする
      try {
        const largeData = 'x'.repeat(1024 * 1024); // 1MB
        for (let i = 0; i < 10; i++) {
          localStorage.setItem(`large-data-${i}`, largeData);
        }
      } catch (e) {
        console.log('ストレージ制限に達しました');
      }
    });
    
    // 大量のチャットメッセージ送信
    for (let i = 1; i <= 20; i++) {
      await sendChatMessage(page, `容量テストメッセージ${i}`, 'ic');
      
      if (i % 5 === 0) {
        await page.waitForTimeout(100);
      }
    }
    
    // 容量警告の確認
    const storageWarning = page.locator('[data-testid="storage-warning"]');
    if (await storageWarning.isVisible()) {
      await expect(storageWarning).toContainText(/容量|Storage/);
      
      // クリーンアップ提案の確認
      const cleanupButton = page.locator('[data-testid="cleanup-storage-button"]');
      if (await cleanupButton.isVisible()) {
        await cleanupButton.click();
        
        // クリーンアップ完了の確認
        await page.waitForSelector('[data-testid="cleanup-completed"]', { timeout: 5000 });
      }
    }
    
    console.log('容量制限エラー処理テスト完了');
  });

  test('ケース7: 認証エラーからの復旧', async ({ page }) => {
    // 認証エラーのシミュレーション
    await page.route('**/api/auth/**', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: '認証トークンが無効です',
          code: 'INVALID_TOKEN'
        })
      });
    });
    
    // 認証が必要な操作を実行
    await page.click('[data-testid="save-campaign-button"]');
    
    // 認証エラー表示の確認
    await page.waitForSelector('[data-testid="auth-error-dialog"]', { timeout: 5000 });
    const authError = page.locator('[data-testid="auth-error-dialog"]');
    await expect(authError).toContainText('認証トークンが無効');
    
    // 再認証ボタンの確認
    const reAuthButton = page.locator('[data-testid="reauth-button"]');
    await expect(reAuthButton).toBeVisible();
    
    // APIを正常に戻す
    await page.unroute('**/api/auth/**');
    
    // 再認証実行
    await reAuthButton.click();
    
    // 認証成功後の操作継続確認
    await page.waitForSelector('[data-testid="auth-success"]', { timeout: 5000 });
    await expect(page.locator('[data-testid="session-state-indicator"]')).toContainText('進行中');
    
    console.log('認証エラー復旧テスト完了');
  });

  test('総合的な障害復旧シナリオ', async ({ page }) => {
    // 複合的な障害状況を再現
    
    // 1. 正常な操作でデータ蓄積
    await sendChatMessage(page, '障害テスト開始', 'ooc');
    await performDiceRoll(page, 'd20');
    
    // 2. ネットワーク障害発生
    await page.setOfflineMode(true);
    await page.waitForTimeout(2000);
    
    // 3. オフライン中の操作
    await page.fill('[data-testid="chat-input"]', 'オフライン中の操作');
    await page.click('[data-testid="chat-send-button"]');
    
    // 4. ネットワーク復旧
    await page.setOfflineMode(false);
    await page.waitForSelector('[data-testid="websocket-status"][data-status="connected"]', {
      timeout: 15000
    });
    
    // 5. データ整合性の確認
    await page.waitForSelector('[data-testid="chat-message"]:has-text("オフライン中の操作")', {
      timeout: 5000
    });
    
    // 6. セッション状態の完全復元確認
    await expect(page.locator('[data-testid="session-state-indicator"]')).toContainText('進行中');
    await expect(page.locator('[data-testid="chat-log"]')).toContainText('障害テスト開始');
    
    console.log('総合障害復旧テスト完了');
  });
});