/**
 * パーティ統一移動 WebSocket E2Eテスト
 * 
 * 対象機能：
 * - パーティ移動提案システム
 * - リアルタイム投票機能
 * - 合意形成プロセス
 * - 場所移動の同期
 * 
 * テスト方針：
 * - 複数プレイヤーの移動合意をシミュレーション
 * - WebSocketでのリアルタイム更新確認
 * - 投票システムの整合性確認
 */
import { test, expect } from '@playwright/test';
import {
  navigateToHome,
  startNewCampaignFlow,
  fillCampaignForm,
  verifySessionStart,
  takeComparisonScreenshot,
  cleanupTestData
} from '../utils/test-helpers';
import type { 
  PartyMovementProposal, 
  MovementVote, 
  PartyMovementState,
  MovementProposalStatus 
} from '@ai-agent-trpg/types';

test.describe('パーティ統一移動 WebSocket機能', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupTestData(page);
    
    // マルチプレイヤーセッションの準備
    await navigateToHome(page);
    await startNewCampaignFlow(page);
    await fillCampaignForm(page, {
      name: 'パーティ移動テストキャンペーン',
      description: 'パーティ統一移動機能のテスト'
    });
    await page.click('[data-testid="create-campaign-button"]');
    await page.waitForSelector('[data-testid="campaign-details"]', { timeout: 10000 });
    
    // セッション開始
    await page.click('[data-testid="start-session-button"]');
    await verifySessionStart(page);
    
    // パーティ移動パネルの確認
    await page.waitForSelector('[data-testid="party-movement-panel"]', { timeout: 5000 });
  });

  test('ケース1: 移動提案の作成と表示', async ({ page }) => {
    await takeComparisonScreenshot(page, 'movement-proposal-creation', 'before');
    
    // 現在地の確認
    const currentLocation = page.locator('[data-testid="current-party-location"]');
    await expect(currentLocation).toContainText('冒険者ギルド');
    
    // 移動提案ボタンをクリック
    await page.click('[data-testid="create-movement-proposal"]');
    await page.waitForSelector('[data-testid="movement-proposal-form"]', { timeout: 3000 });
    
    // 移動先選択
    await page.selectOption('[data-testid="destination-select"]', 'market');
    await page.fill('[data-testid="proposal-reason"]', '食料と装備の補給のため');
    
    // 提案作成
    await page.click('[data-testid="submit-proposal-button"]');
    
    // 提案の表示確認
    await page.waitForSelector('[data-testid="active-movement-proposal"]', { timeout: 5000 });
    
    const activeProposal = page.locator('[data-testid="active-movement-proposal"]');
    await expect(activeProposal).toContainText('市場');
    await expect(activeProposal).toContainText('食料と装備の補給');
    
    // 提案者情報の確認
    const proposer = activeProposal.locator('[data-testid="proposal-proposer"]');
    await expect(proposer).toBeVisible();
    
    // 投票期限の表示確認
    const votingDeadline = activeProposal.locator('[data-testid="voting-deadline"]');
    if (await votingDeadline.isVisible()) {
      const deadlineText = await votingDeadline.textContent();
      expect(deadlineText).toMatch(/\d+:\d+/); // 時間形式の確認
    }
    
    await takeComparisonScreenshot(page, 'movement-proposal-creation', 'after');
  });

  test('ケース2: 投票システムの動作', async ({ page }) => {
    await takeComparisonScreenshot(page, 'voting-system', 'before');
    
    // 移動提案を作成
    await page.click('[data-testid="create-movement-proposal"]');
    await page.waitForSelector('[data-testid="movement-proposal-form"]', { timeout: 3000 });
    await page.selectOption('[data-testid="destination-select"]', 'tavern');
    await page.fill('[data-testid="proposal-reason"]', '情報収集と休息');
    await page.click('[data-testid="submit-proposal-button"]');
    
    // 投票パネルの表示確認
    await page.waitForSelector('[data-testid="voting-panel"]', { timeout: 5000 });
    
    // 投票オプションの確認
    const voteOptions = page.locator('[data-testid="vote-option"]');
    const optionCount = await voteOptions.count();
    expect(optionCount).toBeGreaterThanOrEqual(3); // 賛成、反対、保留など
    
    // 賛成投票
    await page.click('[data-testid="vote-approve"]');
    
    // 投票確認ダイアログ
    await page.waitForSelector('[data-testid="vote-confirmation"]', { timeout: 2000 });
    await page.click('[data-testid="confirm-vote-button"]');
    
    // 投票結果の即座反映確認
    await page.waitForSelector('[data-testid="vote-cast-notification"]', { timeout: 3000 });
    
    // 投票状況の表示確認
    const votingSummary = page.locator('[data-testid="voting-summary"]');
    await expect(votingSummary).toBeVisible();
    await expect(votingSummary).toContainText('賛成: 1');
    
    // 自分の投票が記録されていることを確認
    const myVote = page.locator('[data-testid="my-vote-status"]');
    await expect(myVote).toContainText('賛成');
    await expect(myVote).toHaveAttribute('data-vote', 'approve');
    
    await takeComparisonScreenshot(page, 'voting-system', 'after');
  });

  test('ケース3: リアルタイム投票状況更新', async ({ page }) => {
    await takeComparisonScreenshot(page, 'realtime-voting-updates', 'before');
    
    // 移動提案作成
    await page.click('[data-testid="create-movement-proposal"]');
    await page.waitForSelector('[data-testid="movement-proposal-form"]', { timeout: 3000 });
    await page.selectOption('[data-testid="destination-select"]', 'forest');
    await page.click('[data-testid="submit-proposal-button"]');
    
    await page.waitForSelector('[data-testid="voting-panel"]', { timeout: 5000 });
    
    // 初期投票状況の確認
    const initialSummary = page.locator('[data-testid="voting-summary"]');
    await expect(initialSummary).toContainText('賛成: 0');
    
    // 模擬的な他プレイヤー投票のシミュレーション（WebSocket経由）
    // 実際のテストでは開発者ツールまたはAPIでシミュレート
    await page.evaluate(() => {
      // WebSocketメッセージのシミュレーション
      const mockVoteUpdate = {
        type: 'vote_cast',
        proposalId: 'test-proposal-1',
        vote: {
          playerId: 'player-2',
          choice: 'approve',
          timestamp: new Date().toISOString()
        }
      };
      
      // カスタムイベントでWebSocket更新をシミュレート
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: mockVoteUpdate
      }));
    });
    
    // 投票状況の更新確認
    await page.waitForTimeout(1000);
    await expect(initialSummary).toContainText('賛成: 1');
    
    // 投票者リストの更新確認
    const votersList = page.locator('[data-testid="voters-list"]');
    if (await votersList.isVisible()) {
      await expect(votersList).toContainText('player-2');
    }
    
    await takeComparisonScreenshot(page, 'realtime-voting-updates', 'after');
  });

  test('ケース4: 合意形成と移動実行', async ({ page }) => {
    await takeComparisonScreenshot(page, 'consensus-and-movement', 'before');
    
    // 移動提案作成
    await page.click('[data-testid="create-movement-proposal"]');
    await page.waitForSelector('[data-testid="movement-proposal-form"]', { timeout: 3000 });
    await page.selectOption('[data-testid="destination-select"]', 'temple');
    await page.click('[data-testid="submit-proposal-button"]');
    
    await page.waitForSelector('[data-testid="voting-panel"]', { timeout: 5000 });
    
    // 賛成投票
    await page.click('[data-testid="vote-approve"]');
    await page.waitForSelector('[data-testid="vote-confirmation"]', { timeout: 2000 });
    await page.click('[data-testid="confirm-vote-button"]');
    
    // 必要な票数に達するまで他の投票をシミュレート
    await page.evaluate(() => {
      // 複数の賛成票をシミュレート
      for (let i = 2; i <= 3; i++) {
        const mockVote = {
          type: 'vote_cast',
          proposalId: 'test-proposal-1',
          vote: {
            playerId: `player-${i}`,
            choice: 'approve',
            timestamp: new Date().toISOString()
          }
        };
        
        window.dispatchEvent(new CustomEvent('websocket-message', {
          detail: mockVote
        }));
      }
    });
    
    // 合意形成の確認
    await page.waitForSelector('[data-testid="consensus-reached"]', { timeout: 5000 });
    const consensusNotification = page.locator('[data-testid="consensus-reached"]');
    await expect(consensusNotification).toContainText('合意が形成されました');
    
    // 移動実行ボタンの表示
    const executeMovementButton = page.locator('[data-testid="execute-movement-button"]');
    await expect(executeMovementButton).toBeVisible();
    await expect(executeMovementButton).toBeEnabled();
    
    // 移動実行
    await executeMovementButton.click();
    
    // 移動中表示の確認
    await page.waitForSelector('[data-testid="movement-in-progress"]', { timeout: 3000 });
    const movementProgress = page.locator('[data-testid="movement-in-progress"]');
    await expect(movementProgress).toContainText('神殿へ移動中');
    
    // 移動完了後の場所確認
    await page.waitForSelector('[data-testid="movement-completed"]', { timeout: 10000 });
    const currentLocation = page.locator('[data-testid="current-party-location"]');
    await expect(currentLocation).toContainText('神殿');
    
    await takeComparisonScreenshot(page, 'consensus-and-movement', 'after');
  });

  test('ケース5: 投票期限と自動決定', async ({ page }) => {
    await takeComparisonScreenshot(page, 'voting-deadline', 'before');
    
    // 短い投票期限の提案作成
    await page.click('[data-testid="create-movement-proposal"]');
    await page.waitForSelector('[data-testid="movement-proposal-form"]', { timeout: 3000 });
    await page.selectOption('[data-testid="destination-select"]', 'dungeon');
    
    // 投票期限設定（テスト用に短く設定）
    const deadlineSelect = page.locator('[data-testid="voting-deadline-select"]');
    if (await deadlineSelect.isVisible()) {
      await deadlineSelect.selectOption('30'); // 30秒
    }
    
    await page.click('[data-testid="submit-proposal-button"]');
    
    // 投票期限カウントダウンの確認
    await page.waitForSelector('[data-testid="voting-countdown"]', { timeout: 5000 });
    const countdown = page.locator('[data-testid="voting-countdown"]');
    await expect(countdown).toBeVisible();
    
    // カウントダウンの動作確認
    const initialTime = await countdown.textContent();
    await page.waitForTimeout(2000);
    const updatedTime = await countdown.textContent();
    expect(parseInt(updatedTime || '0')).toBeLessThan(parseInt(initialTime || '0'));
    
    // 期限切れ前に投票
    await page.click('[data-testid="vote-approve"]');
    await page.waitForSelector('[data-testid="vote-confirmation"]', { timeout: 2000 });
    await page.click('[data-testid="confirm-vote-button"]');
    
    // 期限切れまで待機（実際のテストでは時間短縮）
    await page.waitForSelector('[data-testid="voting-expired"]', { timeout: 35000 });
    
    // 期限切れ後の処理確認
    const expiredNotification = page.locator('[data-testid="voting-expired"]');
    await expect(expiredNotification).toContainText('投票期限が終了');
    
    // 自動決定の結果確認
    const finalDecision = page.locator('[data-testid="automatic-decision"]');
    if (await finalDecision.isVisible()) {
      const decisionText = await finalDecision.textContent();
      expect(decisionText).toMatch(/承認|却下|保留/);
    }
    
    await takeComparisonScreenshot(page, 'voting-deadline', 'after');
  });

  test('ケース6: 提案の却下と代替案', async ({ page }) => {
    await takeComparisonScreenshot(page, 'proposal-rejection', 'before');
    
    // 移動提案作成
    await page.click('[data-testid="create-movement-proposal"]');
    await page.waitForSelector('[data-testid="movement-proposal-form"]', { timeout: 3000 });
    await page.selectOption('[data-testid="destination-select"]', 'dangerous_area');
    await page.fill('[data-testid="proposal-reason"]', '危険地帯の探索');
    await page.click('[data-testid="submit-proposal-button"]');
    
    await page.waitForSelector('[data-testid="voting-panel"]', { timeout: 5000 });
    
    // 反対投票
    await page.click('[data-testid="vote-reject"]');
    await page.waitForSelector('[data-testid="vote-confirmation"]', { timeout: 2000 });
    
    // 反対理由の入力
    const rejectionReason = page.locator('[data-testid="rejection-reason-input"]');
    if (await rejectionReason.isVisible()) {
      await rejectionReason.fill('装備が不十分で危険すぎる');
    }
    
    await page.click('[data-testid="confirm-vote-button"]');
    
    // 他プレイヤーの反対票をシミュレート
    await page.evaluate(() => {
      for (let i = 2; i <= 3; i++) {
        const mockVote = {
          type: 'vote_cast',
          proposalId: 'test-proposal-1',
          vote: {
            playerId: `player-${i}`,
            choice: 'reject',
            reason: '危険すぎる',
            timestamp: new Date().toISOString()
          }
        };
        
        window.dispatchEvent(new CustomEvent('websocket-message', {
          detail: mockVote
        }));
      }
    });
    
    // 提案却下の確認
    await page.waitForSelector('[data-testid="proposal-rejected"]', { timeout: 5000 });
    const rejectionNotification = page.locator('[data-testid="proposal-rejected"]');
    await expect(rejectionNotification).toContainText('提案が却下');
    
    // 代替案提案ボタンの表示
    const alternativeButton = page.locator('[data-testid="propose-alternative"]');
    if (await alternativeButton.isVisible()) {
      await expect(alternativeButton).toBeEnabled();
    }
    
    // 却下理由の表示確認
    const rejectionReasons = page.locator('[data-testid="rejection-reasons"]');
    if (await rejectionReasons.isVisible()) {
      await expect(rejectionReasons).toContainText('装備が不十分');
    }
    
    await takeComparisonScreenshot(page, 'proposal-rejection', 'after');
  });

  test('パーティ移動の通信エラーハンドリング', async ({ page }) => {
    // WebSocket接続エラーのシミュレーション
    await page.route('**/party-movement', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'パーティ移動サービスエラー' })
      });
    });
    
    // 移動提案の作成試行
    await page.click('[data-testid="create-movement-proposal"]');
    await page.waitForSelector('[data-testid="movement-proposal-form"]', { timeout: 3000 });
    await page.selectOption('[data-testid="destination-select"]', 'market');
    await page.click('[data-testid="submit-proposal-button"]');
    
    // エラー表示の確認
    await page.waitForSelector('[data-testid="error-display"]', { timeout: 5000 });
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toContainText('パーティ移動サービスエラー');
    
    // リトライボタンの確認
    const retryButton = page.locator('[data-testid="retry-button"]');
    await expect(retryButton).toBeVisible();
    
    // ルートを正常に戻す
    await page.unroute('**/party-movement');
    
    // リトライ実行
    await retryButton.click();
    
    // 正常な提案作成を確認
    await page.waitForSelector('[data-testid="active-movement-proposal"]', { timeout: 5000 });
    console.log('パーティ移動エラー・復旧テスト完了');
  });

  test('合意設定の管理', async ({ page }) => {
    // パーティ設定画面へ移動
    await page.click('[data-testid="party-settings-button"]');
    await page.waitForSelector('[data-testid="consensus-settings"]', { timeout: 5000 });
    
    // 合意形成ルールの確認
    const consensusThreshold = page.locator('[data-testid="consensus-threshold"]');
    await expect(consensusThreshold).toBeVisible();
    
    // 閾値設定の変更
    await page.selectOption('[data-testid="threshold-select"]', '75'); // 75%の合意
    
    // 投票期限のデフォルト設定
    const defaultDeadline = page.locator('[data-testid="default-voting-deadline"]');
    await defaultDeadline.fill('300'); // 5分
    
    // 設定保存
    await page.click('[data-testid="save-consensus-settings"]');
    
    // 設定反映の確認
    await page.waitForSelector('[data-testid="settings-saved"]', { timeout: 3000 });
    
    // セッションに戻って設定確認
    await page.click('[data-testid="back-to-session"]');
    await verifySessionStart(page);
    
    console.log('合意設定管理テスト完了');
  });
});