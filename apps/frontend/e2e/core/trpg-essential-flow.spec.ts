/**
 * TRPGの本質的な体験フロー - Critical Priority
 * 
 * 1stリリース必須テスト：初回ユーザーの完全体験を確認
 * - 0からプレイ開始まで
 * - セッション開始30秒以内達成
 * - 基本的なTRPG行動フロー
 */
import { test, expect } from '@playwright/test';
import { 
  navigateToHome,
  startNewCampaignFlow,
  fillCampaignForm,
  verifySessionStart,
  performDiceRoll,
  sendChatMessage,
  cleanupTestData,
  takeComparisonScreenshot,
  measurePageLoadTime
} from '../utils/test-helpers';
import { testCampaignBasic } from '../data/test-campaigns';

test.describe('TRPG本質的体験フロー - Critical Priority', () => {

  test.beforeEach(async ({ page }) => {
    await cleanupTestData(page);
  });

  test('シナリオ1: 初回ユーザーの完全体験（0→プレイ開始まで）', async ({ page }) => {
    await takeComparisonScreenshot(page, 'essential-flow-complete', 'before');
    
    const totalStartTime = Date.now();
    
    // Step 1: ホームページアクセス
    await navigateToHome(page);
    await expect(page.locator('[data-testid="app-title"]')).toBeVisible();
    
    // Step 2: 新規キャンペーン作成フロー開始
    await startNewCampaignFlow(page);
    await expect(page.locator('[data-testid="campaign-setup-form"]')).toBeVisible();
    
    // Step 3: 最低限のキャンペーン設定
    await fillCampaignForm(page, testCampaignBasic);
    await page.click('[data-testid="create-campaign-button"]');
    
    // Step 4: キャンペーン詳細ページの確認
    await page.waitForSelector('[data-testid="campaign-details"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="campaign-name"]')).toContainText(testCampaignBasic.name);
    
    // Step 5: セッション開始ボタンの確認と実行
    const sessionStartButton = page.locator('[data-testid="start-session-button"]');
    await expect(sessionStartButton).toBeVisible();
    await expect(sessionStartButton).toBeEnabled();
    
    await sessionStartButton.click();
    
    // Step 6: TRPGセッション画面でのプレイ可能状態確認
    await verifySessionStart(page);
    
    const totalEndTime = Date.now();
    const totalElapsedTime = totalEndTime - totalStartTime;
    
    await takeComparisonScreenshot(page, 'essential-flow-complete', 'after');
    
    // 完全体験が3分以内で完了することを確認
    expect(totalElapsedTime).toBeLessThan(180000); // 3分
    console.log(`初回ユーザー完全体験時間: ${totalElapsedTime}ms`);
    
    // プレイ可能状態の最終確認
    await expect(page.locator('[data-testid="session-interface"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="dice-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="character-panel"]')).toBeVisible();
  });

  test('シナリオ2: セッション開始30秒以内達成確認', async ({ page }) => {
    await takeComparisonScreenshot(page, 'session-start-30sec', 'before');
    
    // 事前準備：キャンペーンがすでに存在する状態を想定
    await navigateToHome(page);
    await startNewCampaignFlow(page);
    await fillCampaignForm(page, {
      name: 'セッション開始速度テスト',
      description: '30秒以内確認用'
    });
    await page.click('[data-testid="create-campaign-button"]');
    await page.waitForSelector('[data-testid="campaign-details"]', { timeout: 10000 });
    
    // 実際の30秒測定開始
    const startTime = Date.now();
    
    // セッション開始ボタンクリック
    await page.click('[data-testid="start-session-button"]');
    
    // プレイ可能状態到達の確認
    await verifySessionStart(page);
    
    const endTime = Date.now();
    const elapsedTime = endTime - startTime;
    
    await takeComparisonScreenshot(page, 'session-start-30sec', 'after');
    
    // 30秒以内の確認（Critical Priority 要件）
    expect(elapsedTime).toBeLessThan(30000);
    console.log(`セッション開始時間: ${elapsedTime}ms`);
    
    // 開始状態の詳細確認
    await expect(page.locator('[data-testid="session-status"]')).toContainText('進行中');
    await expect(page.locator('[data-testid="chat-input"]')).toBeEnabled();
    await expect(page.locator('[data-testid="dice-panel-toggle"]')).toBeEnabled();
  });

  test('シナリオ3: 基本的なTRPG行動（ダイス→チャット→結果）', async ({ page }) => {
    // 事前準備：セッション開始状態まで
    await navigateToHome(page);
    await startNewCampaignFlow(page);
    await fillCampaignForm(page, {
      name: 'TRPG基本行動テスト',
      description: 'ダイス→チャット→結果フロー確認'
    });
    await page.click('[data-testid="create-campaign-button"]');
    await page.waitForSelector('[data-testid="campaign-details"]', { timeout: 10000 });
    await page.click('[data-testid="start-session-button"]');
    await verifySessionStart(page);
    
    await takeComparisonScreenshot(page, 'trpg-basic-actions', 'before');
    
    // Step 1: ダイスロール実行
    const diceResult = await performDiceRoll(page, 'd20');
    expect(diceResult).toBeGreaterThan(0);
    expect(diceResult).toBeLessThanOrEqual(20);
    
    // ダイス結果がチャットログに表示されることを確認
    await expect(page.locator('[data-testid="chat-log"]')).toContainText(`d20: ${diceResult}`);
    
    // Step 2: プレイヤーのアクション宣言（IC メッセージ）
    const actionMessage = '村の酒場で情報収集を行います';
    await sendChatMessage(page, actionMessage, 'ic');
    
    // メッセージが正しく表示されることを確認
    await expect(page.locator('[data-testid="chat-log"]')).toContainText(actionMessage);
    
    // Step 3: OOC コミュニケーション
    const oocMessage = 'このダイス結果なら成功しそうですね';
    await sendChatMessage(page, oocMessage, 'ooc');
    
    // OOCメッセージが正しく表示されることを確認
    await expect(page.locator('[data-testid="chat-log"]')).toContainText(oocMessage);
    
    // Step 4: 結果確認（チャットログの内容）
    const chatMessages = page.locator('[data-testid="chat-message"]');
    const messageCount = await chatMessages.count();
    
    // 最低3つのメッセージ（ダイス、IC、OOC）が存在することを確認
    expect(messageCount).toBeGreaterThanOrEqual(3);
    
    await takeComparisonScreenshot(page, 'trpg-basic-actions', 'after');
    
    // フロー完了の確認
    console.log(`基本TRPG行動フロー完了：ダイス結果=${diceResult}, メッセージ数=${messageCount}`);
  });

  test('エラー回復力テスト：基本フローの中断と再開', async ({ page }) => {
    // セッション準備
    await navigateToHome(page);
    await startNewCampaignFlow(page);
    await fillCampaignForm(page, {
      name: 'エラー回復テスト',
      description: '中断・再開確認'
    });
    await page.click('[data-testid="create-campaign-button"]');
    await page.waitForSelector('[data-testid="campaign-details"]', { timeout: 10000 });
    await page.click('[data-testid="start-session-button"]');
    await verifySessionStart(page);
    
    // Step 1: 基本動作の確認
    await performDiceRoll(page, 'd6');
    await sendChatMessage(page, 'テストメッセージ1', 'ic');
    
    // Step 2: ページリロード（セッション中断をシミュレート）
    await page.reload();
    
    // Step 3: セッション状態の復元確認
    await page.waitForSelector('[data-testid="session-interface"]', { timeout: 15000 });
    
    // 以前のチャットログが復元されているか確認
    await expect(page.locator('[data-testid="chat-log"]')).toContainText('テストメッセージ1');
    
    // Step 4: 機能継続性の確認
    await performDiceRoll(page, 'd8');
    await sendChatMessage(page, 'テストメッセージ2（復旧後）', 'ic');
    
    // 新しいメッセージも正常に動作することを確認
    await expect(page.locator('[data-testid="chat-log"]')).toContainText('テストメッセージ2（復旧後）');
    
    console.log('エラー回復力テスト完了：セッション状態の復元と継続動作を確認');
  });

});

test.describe('パフォーマンス要件確認', () => {

  test('複数の基本操作の連続実行性能', async ({ page }) => {
    // セッション準備
    await navigateToHome(page);
    await startNewCampaignFlow(page);
    await fillCampaignForm(page, {
      name: 'パフォーマンステスト',
      description: '連続操作性能確認'
    });
    await page.click('[data-testid="create-campaign-button"]');
    await page.waitForSelector('[data-testid="campaign-details"]', { timeout: 10000 });
    await page.click('[data-testid="start-session-button"]');
    await verifySessionStart(page);
    
    const startTime = Date.now();
    
    // 連続操作の実行
    for (let i = 0; i < 10; i++) {
      await performDiceRoll(page, 'd20');
      await sendChatMessage(page, `連続操作テスト ${i + 1}`, 'ic');
    }
    
    const endTime = Date.now();
    const elapsedTime = endTime - startTime;
    
    // 10回の操作が30秒以内で完了することを確認
    expect(elapsedTime).toBeLessThan(30000);
    
    // UIの応答性確認
    await expect(page.locator('[data-testid="chat-input"]')).toBeEnabled();
    await expect(page.locator('[data-testid="dice-panel-toggle"]')).toBeEnabled();
    
    console.log(`連続操作性能テスト: 10回の操作を ${elapsedTime}ms で完了`);
  });

  test('ページロード性能確認', async ({ page }) => {
    // 各主要ページのロード時間を測定
    const homeLoadTime = await measurePageLoadTime(page, '/');
    expect(homeLoadTime).toBeLessThan(5000); // 5秒以内
    
    const campaignSetupLoadTime = await measurePageLoadTime(page, '/campaign-setup');
    expect(campaignSetupLoadTime).toBeLessThan(5000); // 5秒以内
    
    console.log(`ページロード性能: Home=${homeLoadTime}ms, Setup=${campaignSetupLoadTime}ms`);
  });

});