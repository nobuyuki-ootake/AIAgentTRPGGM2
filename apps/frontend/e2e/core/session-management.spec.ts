/**
 * TRPGセッション管理システム - Critical Priority
 * 
 * 1stリリース必須テスト：セッション開始〜終了の基本管理
 * - セッション作成と開始
 * - 参加者管理（追加・削除）
 * - セッション状態管理（準備中→進行中→完了）
 * - セッション情報の保存・復元
 */
import { test, expect } from '@playwright/test';
import { 
  navigateToHome,
  startNewCampaignFlow,
  fillCampaignForm,
  verifySessionStart,
  cleanupTestData,
  takeComparisonScreenshot
} from '../utils/test-helpers';
import { testCampaignBasic } from '../data/test-campaigns';

test.describe('TRPGセッション管理システム - Critical Priority', () => {

  test.beforeEach(async ({ page }) => {
    await cleanupTestData(page);
  });

  test('ケース1: セッション作成と開始', async ({ page }) => {
    await takeComparisonScreenshot(page, 'session-creation', 'before');
    
    // Step 1: キャンペーンの準備
    await navigateToHome(page);
    await startNewCampaignFlow(page);
    await fillCampaignForm(page, testCampaignBasic);
    await page.click('[data-testid="create-campaign-button"]');
    
    // キャンペーン詳細ページの確認
    await page.waitForSelector('[data-testid="campaign-details"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="campaign-name"]')).toContainText(testCampaignBasic.name);
    
    // Step 2: セッション作成の確認
    const startSessionButton = page.locator('[data-testid="start-session-button"]');
    await expect(startSessionButton).toBeVisible();
    await expect(startSessionButton).toBeEnabled();
    
    // セッション設定オプションがある場合の確認
    const sessionSettingsPanel = page.locator('[data-testid="session-settings"]');
    if (await sessionSettingsPanel.isVisible()) {
      // セッション名設定
      const sessionNameInput = page.locator('[data-testid="session-name-input"]');
      if (await sessionNameInput.isVisible()) {
        await sessionNameInput.fill('テストセッション1');
      }
      
      // 予定時間設定
      const sessionDurationInput = page.locator('[data-testid="session-duration-input"]');
      if (await sessionDurationInput.isVisible()) {
        await sessionDurationInput.fill('180'); // 3時間
      }
    }
    
    // Step 3: セッション開始実行
    await startSessionButton.click();
    
    // Step 4: セッション開始状態の確認
    await verifySessionStart(page);
    
    // セッション情報の表示確認
    await expect(page.locator('[data-testid="session-info"]')).toBeVisible();
    
    // セッション状態が「進行中」であることを確認
    const sessionStatus = page.locator('[data-testid="session-status"]');
    await expect(sessionStatus).toBeVisible();
    await expect(sessionStatus).toContainText(/進行中|Active|Running/i);
    
    await takeComparisonScreenshot(page, 'session-creation', 'after');
    
    console.log('セッション作成と開始テスト完了');
  });

  test('ケース2: 参加者管理（追加・削除）', async ({ page }) => {
    await takeComparisonScreenshot(page, 'participant-management', 'before');
    
    // セッション準備
    await navigateToHome(page);
    await startNewCampaignFlow(page);
    await fillCampaignForm(page, {
      name: '参加者管理テスト',
      description: 'プレイヤー追加・削除のテスト'
    });
    await page.click('[data-testid="create-campaign-button"]');
    await page.waitForSelector('[data-testid="campaign-details"]', { timeout: 10000 });
    await page.click('[data-testid="start-session-button"]');
    await verifySessionStart(page);
    
    // Step 1: 参加者パネルの確認
    const participantsPanel = page.locator('[data-testid="participants-panel"]');
    await expect(participantsPanel).toBeVisible();
    
    // 初期参加者（GM）の確認
    const initialParticipants = page.locator('[data-testid="participant-item"]');
    const initialCount = await initialParticipants.count();
    expect(initialCount).toBeGreaterThanOrEqual(1); // 最低でもGMが存在
    
    // Step 2: 新しい参加者の追加
    const addParticipantButton = page.locator('[data-testid="add-participant-button"]');
    if (await addParticipantButton.isVisible()) {
      await addParticipantButton.click();
      
      // 参加者情報入力
      await page.waitForSelector('[data-testid="participant-form"]', { timeout: 5000 });
      
      const nameInput = page.locator('[data-testid="participant-name-input"]');
      await nameInput.fill('テストプレイヤー1');
      
      const roleSelect = page.locator('[data-testid="participant-role-select"]');
      if (await roleSelect.isVisible()) {
        await roleSelect.selectOption('player');
      }
      
      // 追加実行
      await page.click('[data-testid="confirm-add-participant"]');
      
      // 参加者が追加されたことを確認
      await page.waitForSelector('[data-testid="participant-item"]:has-text("テストプレイヤー1")', { timeout: 5000 });
      const newCount = await page.locator('[data-testid="participant-item"]').count();
      expect(newCount).toBe(initialCount + 1);
    }
    
    // Step 3: 複数参加者の追加
    if (await addParticipantButton.isVisible()) {
      for (let i = 2; i <= 3; i++) {
        await addParticipantButton.click();
        await page.waitForSelector('[data-testid="participant-form"]', { timeout: 5000 });
        await page.fill('[data-testid="participant-name-input"]', `テストプレイヤー${i}`);
        await page.click('[data-testid="confirm-add-participant"]');
        await page.waitForSelector(`[data-testid="participant-item"]:has-text("テストプレイヤー${i}")`, { timeout: 5000 });
      }
    }
    
    // Step 4: 参加者削除機能のテスト
    const targetParticipant = page.locator('[data-testid="participant-item"]:has-text("テストプレイヤー2")');
    if (await targetParticipant.isVisible()) {
      const removeButton = targetParticipant.locator('[data-testid="remove-participant-button"]');
      if (await removeButton.isVisible()) {
        await removeButton.click();
        
        // 確認ダイアログがある場合
        const confirmDialog = page.locator('[data-testid="confirm-remove-dialog"]');
        if (await confirmDialog.isVisible()) {
          await page.click('[data-testid="confirm-remove-button"]');
        }
        
        // 参加者が削除されたことを確認
        await expect(page.locator('[data-testid="participant-item"]:has-text("テストプレイヤー2")')).not.toBeVisible();
      }
    }
    
    // Step 5: 最終的な参加者リストの確認
    const finalParticipants = await page.locator('[data-testid="participant-item"]').count();
    console.log(`参加者管理テスト完了：初期=${initialCount}人 → 最終=${finalParticipants}人`);
    
    await takeComparisonScreenshot(page, 'participant-management', 'after');
  });

  test('ケース3: セッション状態管理（準備中→進行中→完了）', async ({ page }) => {
    await takeComparisonScreenshot(page, 'session-state-management', 'before');
    
    // Step 1: 準備中状態の確認
    await navigateToHome(page);
    await startNewCampaignFlow(page);
    await fillCampaignForm(page, {
      name: '状態管理テスト',
      description: 'セッション状態遷移のテスト'
    });
    await page.click('[data-testid="create-campaign-button"]');
    await page.waitForSelector('[data-testid="campaign-details"]', { timeout: 10000 });
    
    // セッション開始前の状態確認
    const sessionStatus = page.locator('[data-testid="session-status"]');
    if (await sessionStatus.isVisible()) {
      await expect(sessionStatus).toContainText(/準備中|Preparing|Ready/i);
    }
    
    // Step 2: 進行中状態への遷移
    await page.click('[data-testid="start-session-button"]');
    await verifySessionStart(page);
    
    // 進行中状態の確認
    await expect(page.locator('[data-testid="session-status"]')).toContainText(/進行中|Active|Running/i);
    
    // 進行中状態での機能確認
    await expect(page.locator('[data-testid="chat-input"]')).toBeEnabled();
    await expect(page.locator('[data-testid="dice-panel-toggle"]')).toBeEnabled();
    
    // Step 3: 一時停止機能（あれば）
    const pauseButton = page.locator('[data-testid="pause-session-button"]');
    if (await pauseButton.isVisible()) {
      await pauseButton.click();
      await expect(page.locator('[data-testid="session-status"]')).toContainText(/一時停止|Paused/i);
      
      // 再開機能
      const resumeButton = page.locator('[data-testid="resume-session-button"]');
      if (await resumeButton.isVisible()) {
        await resumeButton.click();
        await expect(page.locator('[data-testid="session-status"]')).toContainText(/進行中|Active|Running/i);
      }
    }
    
    // Step 4: セッション終了への遷移
    const endSessionButton = page.locator('[data-testid="end-session-button"]');
    if (await endSessionButton.isVisible()) {
      await endSessionButton.click();
      
      // 終了確認ダイアログ
      const confirmEndDialog = page.locator('[data-testid="confirm-end-session-dialog"]');
      if (await confirmEndDialog.isVisible()) {
        await page.click('[data-testid="confirm-end-session-button"]');
      }
      
      // 完了状態の確認
      await expect(page.locator('[data-testid="session-status"]')).toContainText(/完了|Completed|Ended/i);
      
      // 完了状態での機能制限確認
      await expect(page.locator('[data-testid="chat-input"]')).toBeDisabled();
      await expect(page.locator('[data-testid="dice-panel-toggle"]')).toBeDisabled();
    }
    
    await takeComparisonScreenshot(page, 'session-state-management', 'after');
    
    console.log('セッション状態管理テスト完了：準備中 → 進行中 → 完了');
  });

  test('ケース4: セッション情報の保存・復元', async ({ page }) => {
    await takeComparisonScreenshot(page, 'session-persistence', 'before');
    
    // Step 1: セッション開始とデータ作成
    await navigateToHome(page);
    await startNewCampaignFlow(page);
    await fillCampaignForm(page, {
      name: 'データ永続化テスト',
      description: 'セッション情報の保存・復元確認'
    });
    await page.click('[data-testid="create-campaign-button"]');
    await page.waitForSelector('[data-testid="campaign-details"]', { timeout: 10000 });
    await page.click('[data-testid="start-session-button"]');
    await verifySessionStart(page);
    
    // テストデータの作成
    const testMessage = 'データ永続化テスト用メッセージ';
    
    // チャットメッセージ送信
    await page.fill('[data-testid="chat-input"]', testMessage);
    await page.click('[data-testid="chat-send-button"]');
    await page.waitForSelector(`[data-testid="chat-message"]:has-text("${testMessage}")`, { timeout: 3000 });
    
    // ダイスロール実行
    await page.click('[data-testid="dice-panel-toggle"]');
    await page.waitForSelector('[data-testid="dice-panel-content"]', { timeout: 3000 });
    await page.click('[data-testid="dice-d20"]');
    await page.waitForSelector('[data-testid="dice-result"]', { timeout: 5000 });
    
    // セッション情報の取得
    const sessionId = await page.getAttribute('[data-testid="session-info"]', 'data-session-id');
    
    // Step 2: ページリロードによる復元テスト
    await page.reload();
    await page.waitForSelector('[data-testid="session-interface"]', { timeout: 15000 });
    
    // データ復元の確認
    await expect(page.locator('[data-testid="chat-log"]')).toContainText(testMessage);
    await expect(page.locator('[data-testid="chat-log"]')).toContainText('d20');
    
    // セッション状態の復元確認
    await expect(page.locator('[data-testid="session-status"]')).toContainText(/進行中|Active|Running/i);
    
    // Step 3: ブラウザ再起動シミュレーション
    // 新しいページコンテキストで同じセッションにアクセス
    const newPage = await page.context().newPage();
    
    if (sessionId) {
      await newPage.goto(`/session/${sessionId}`);
      await newPage.waitForSelector('[data-testid="session-interface"]', { timeout: 15000 });
      
      // 別ページでもデータが復元されているか確認
      await expect(newPage.locator('[data-testid="chat-log"]')).toContainText(testMessage);
      await expect(newPage.locator('[data-testid="session-status"]')).toContainText(/進行中|Active|Running/i);
    }
    
    await newPage.close();
    
    // Step 4: セッション履歴の保存確認
    const sessionHistoryButton = page.locator('[data-testid="session-history-button"]');
    if (await sessionHistoryButton.isVisible()) {
      await sessionHistoryButton.click();
      
      const historyPanel = page.locator('[data-testid="session-history-panel"]');
      await expect(historyPanel).toBeVisible();
      
      // 履歴にチャットとダイスの記録があることを確認
      await expect(historyPanel).toContainText(testMessage);
      await expect(historyPanel).toContainText('d20');
    }
    
    await takeComparisonScreenshot(page, 'session-persistence', 'after');
    
    console.log(`セッション情報保存・復元テスト完了：セッションID=${sessionId}`);
  });

  test('複数セッション管理機能', async ({ page }) => {
    // 複数のキャンペーンでセッションを作成
    const campaigns = [
      { name: 'キャンペーン1', description: '複数セッションテスト1' },
      { name: 'キャンペーン2', description: '複数セッションテスト2' }
    ];
    
    const sessionIds: string[] = [];
    
    for (let i = 0; i < campaigns.length; i++) {
      await navigateToHome(page);
      await startNewCampaignFlow(page);
      await fillCampaignForm(page, campaigns[i]);
      await page.click('[data-testid="create-campaign-button"]');
      await page.waitForSelector('[data-testid="campaign-details"]', { timeout: 10000 });
      await page.click('[data-testid="start-session-button"]');
      await verifySessionStart(page);
      
      // セッション固有のメッセージ送信
      const uniqueMessage = `${campaigns[i].name}のテストメッセージ`;
      await page.fill('[data-testid="chat-input"]', uniqueMessage);
      await page.click('[data-testid="chat-send-button"]');
      await page.waitForSelector(`[data-testid="chat-message"]:has-text("${uniqueMessage}")`, { timeout: 3000 });
      
      const sessionId = await page.getAttribute('[data-testid="session-info"]', 'data-session-id');
      if (sessionId) sessionIds.push(sessionId);
    }
    
    // セッション一覧の確認
    await navigateToHome(page);
    const sessionsList = page.locator('[data-testid="sessions-list"]');
    if (await sessionsList.isVisible()) {
      const sessionItems = page.locator('[data-testid="session-item"]');
      const sessionCount = await sessionItems.count();
      expect(sessionCount).toBeGreaterThanOrEqual(campaigns.length);
    }
    
    // 各セッションの独立性確認
    for (let i = 0; i < sessionIds.length; i++) {
      if (sessionIds[i]) {
        await page.goto(`/session/${sessionIds[i]}`);
        await page.waitForSelector('[data-testid="session-interface"]', { timeout: 15000 });
        
        const expectedMessage = `${campaigns[i].name}のテストメッセージ`;
        await expect(page.locator('[data-testid="chat-log"]')).toContainText(expectedMessage);
        
        // 他のセッションのメッセージが含まれていないことを確認
        for (let j = 0; j < campaigns.length; j++) {
          if (i !== j) {
            const otherMessage = `${campaigns[j].name}のテストメッセージ`;
            await expect(page.locator('[data-testid="chat-log"]')).not.toContainText(otherMessage);
          }
        }
      }
    }
    
    console.log(`複数セッション管理テスト完了：${sessionIds.length}個のセッション作成・確認`);
  });

  test('セッション管理のエラーハンドリング', async ({ page }) => {
    // 無効なセッションIDでのアクセステスト
    await page.goto('/session/invalid-session-id');
    
    // エラーページまたはリダイレクトの確認
    const errorPage = page.locator('[data-testid="session-not-found"]');
    const redirected = page.locator('[data-testid="home-page"]');
    
    expect(await errorPage.isVisible() || await redirected.isVisible()).toBe(true);
    
    // セッション削除後のアクセステスト（実装があれば）
    await navigateToHome(page);
    await startNewCampaignFlow(page);
    await fillCampaignForm(page, {
      name: 'エラーハンドリングテスト',
      description: '削除後アクセステスト'
    });
    await page.click('[data-testid="create-campaign-button"]');
    await page.waitForSelector('[data-testid="campaign-details"]', { timeout: 10000 });
    await page.click('[data-testid="start-session-button"]');
    await verifySessionStart(page);
    
    const sessionId = await page.getAttribute('[data-testid="session-info"]', 'data-session-id');
    
    // セッション終了
    const endSessionButton = page.locator('[data-testid="end-session-button"]');
    if (await endSessionButton.isVisible()) {
      await endSessionButton.click();
      
      const confirmDialog = page.locator('[data-testid="confirm-end-session-dialog"]');
      if (await confirmDialog.isVisible()) {
        await page.click('[data-testid="confirm-end-session-button"]');
      }
    }
    
    // 終了後のセッションへの再アクセス確認
    if (sessionId) {
      await page.goto(`/session/${sessionId}`);
      
      // 終了済みセッションとして表示されるか、エラーになるかを確認
      const completedSession = page.locator('[data-testid="session-completed"]');
      const accessError = page.locator('[data-testid="session-access-error"]');
      
      expect(await completedSession.isVisible() || await accessError.isVisible()).toBe(true);
    }
    
    console.log('セッション管理エラーハンドリングテスト完了');
  });

});