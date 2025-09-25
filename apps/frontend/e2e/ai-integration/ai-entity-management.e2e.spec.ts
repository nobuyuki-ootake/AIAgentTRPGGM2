/**
 * AIエンティティ管理 E2Eテスト
 * 
 * 対象機能：
 * - NPCリアルタイム管理
 * - 場所移動時のエンティティ更新
 * - エンティティ関係性・重要度管理
 * - エンティティ表示/非表示制御
 * 
 * テスト方針：
 * - 通常のユーザーフローで操作
 * - モックAPIレスポンスで一貫性確保
 * - リアルタイム更新の確認
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
  waitForAIGeneration
} from '../utils/test-helpers';
import type { LocationBasedEntity, EntityRelationship, AIGameContext } from '@ai-agent-trpg/types';

test.describe('AIエンティティ管理機能', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupTestData(page);
    
    // テスト用キャンペーンとセッションの準備
    await navigateToHome(page);
    await startNewCampaignFlow(page);
    await fillCampaignForm(page, {
      name: 'エンティティ管理テストキャンペーン',
      description: 'AIエンティティ管理機能のテスト'
    });
    await page.click('[data-testid="create-campaign-button"]');
    await page.waitForSelector('[data-testid="campaign-details"]', { timeout: 10000 });
    
    // セッション開始
    await page.click('[data-testid="start-session-button"]');
    await verifySessionStart(page);
  });

  test('ケース1: 場所移動時のエンティティ自動更新', async ({ page }) => {
    await takeComparisonScreenshot(page, 'entity-location-update', 'before');
    
    // 現在地の確認（初期位置）
    await expect(page.locator('[data-testid="current-location"]')).toContainText('冒険者ギルド');
    
    // 初期エンティティの表示確認
    await page.waitForSelector('[data-testid="active-entities-panel"]', { timeout: 5000 });
    const initialEntities = page.locator('[data-testid="entity-item"]');
    const initialCount = await initialEntities.count();
    console.log(`初期エンティティ数: ${initialCount}`);
    
    // 場所移動パネルを開く
    await page.click('[data-testid="location-panel-toggle"]');
    await page.waitForSelector('[data-testid="location-panel-content"]', { timeout: 3000 });
    
    // 市場への移動を選択
    await page.click('[data-testid="location-option-market"]');
    await page.click('[data-testid="move-to-location-button"]');
    
    // エンティティ更新の確認
    await page.waitForTimeout(2000); // リアルタイム更新を待機
    
    // 新しい場所でのエンティティ確認
    await expect(page.locator('[data-testid="current-location"]')).toContainText('市場');
    
    // エンティティリストの変化を確認
    const marketEntities = page.locator('[data-testid="entity-item"]');
    const marketCount = await marketEntities.count();
    console.log(`市場のエンティティ数: ${marketCount}`);
    
    // 市場特有のエンティティ確認
    await expect(page.locator('[data-testid="entity-type-merchant"]')).toBeVisible();
    await expect(page.locator('[data-testid="entity-type-customer"]')).toBeVisible();
    
    await takeComparisonScreenshot(page, 'entity-location-update', 'after');
  });

  test('ケース2: エンティティ重要度による表示優先順位', async ({ page }) => {
    await takeComparisonScreenshot(page, 'entity-importance', 'before');
    
    // エンティティパネルの展開
    await page.click('[data-testid="active-entities-panel-header"]');
    await page.waitForSelector('[data-testid="entity-list"]', { timeout: 3000 });
    
    // 重要度フィルターの確認
    const importanceFilter = page.locator('[data-testid="entity-importance-filter"]');
    if (await importanceFilter.isVisible()) {
      // 高重要度のみ表示
      await importanceFilter.selectOption('high');
      await page.waitForTimeout(1000);
      
      // 高重要度エンティティのみ表示されることを確認
      const highImportanceEntities = page.locator('[data-testid="entity-importance-high"]');
      const highCount = await highImportanceEntities.count();
      expect(highCount).toBeGreaterThan(0);
      
      // 低重要度エンティティが非表示であることを確認
      const lowImportanceEntities = page.locator('[data-testid="entity-importance-low"]');
      await expect(lowImportanceEntities).not.toBeVisible();
    }
    
    // エンティティの詳細確認（ストーリー上の役割）
    const firstEntity = page.locator('[data-testid="entity-item"]').first();
    await firstEntity.click();
    
    await page.waitForSelector('[data-testid="entity-detail-panel"]', { timeout: 3000 });
    await expect(page.locator('[data-testid="entity-role"]')).toBeVisible();
    await expect(page.locator('[data-testid="entity-description"]')).toBeVisible();
    
    await takeComparisonScreenshot(page, 'entity-importance', 'after');
  });

  test('ケース3: エンティティ関係性の管理と表示', async ({ page }) => {
    await takeComparisonScreenshot(page, 'entity-relationships', 'before');
    
    // エンティティ関係性ビューを開く
    const relationshipViewToggle = page.locator('[data-testid="relationship-view-toggle"]');
    if (await relationshipViewToggle.isVisible()) {
      await relationshipViewToggle.click();
      await page.waitForSelector('[data-testid="relationship-graph"]', { timeout: 5000 });
      
      // 関係性の線が表示されることを確認
      await expect(page.locator('[data-testid="relationship-edge"]')).toBeVisible();
      
      // エンティティノードのホバーで関係性詳細表示
      const entityNode = page.locator('[data-testid="entity-node"]').first();
      await entityNode.hover();
      
      await page.waitForSelector('[data-testid="relationship-tooltip"]', { timeout: 2000 });
      await expect(page.locator('[data-testid="relationship-type"]')).toBeVisible();
      await expect(page.locator('[data-testid="relationship-strength"]')).toBeVisible();
    }
    
    // 特定エンティティとの対話で関係性更新
    await sendChatMessage(page, '商人と取引について話す', 'ic');
    
    // AI応答待機
    await waitForAIGeneration(page, '[data-testid="ai-response"]', 15000);
    
    // 関係性の更新確認
    const updatedRelationship = page.locator('[data-testid="relationship-updated-indicator"]');
    if (await updatedRelationship.isVisible()) {
      await expect(updatedRelationship).toContainText('関係性が更新されました');
    }
    
    await takeComparisonScreenshot(page, 'entity-relationships', 'after');
  });

  test('ケース4: リアルタイムエンティティ状態更新', async ({ page }) => {
    await takeComparisonScreenshot(page, 'entity-realtime-update', 'before');
    
    // アクティブエンティティの確認
    const activeEntity = page.locator('[data-testid="entity-item"][data-state="active"]').first();
    await expect(activeEntity).toBeVisible();
    
    const entityName = await activeEntity.getAttribute('data-entity-name');
    console.log(`アクティブエンティティ: ${entityName}`);
    
    // エンティティとの対話開始
    await sendChatMessage(page, `${entityName}に話しかける`, 'ic');
    
    // エンティティ状態の変化を監視
    await page.waitForSelector(`[data-testid="entity-state-talking"][data-entity-name="${entityName}"]`, { 
      timeout: 5000 
    });
    
    // 会話中インジケータの確認
    const talkingIndicator = page.locator('[data-testid="entity-talking-indicator"]');
    await expect(talkingIndicator).toBeVisible();
    
    // AI応答を待機
    await waitForAIGeneration(page, '[data-testid="ai-response"]', 15000);
    
    // エンティティの感情状態変化確認
    const emotionIndicator = page.locator(`[data-testid="entity-emotion"][data-entity-name="${entityName}"]`);
    if (await emotionIndicator.isVisible()) {
      const emotion = await emotionIndicator.getAttribute('data-emotion');
      console.log(`エンティティの感情: ${emotion}`);
    }
    
    await takeComparisonScreenshot(page, 'entity-realtime-update', 'after');
  });

  test('ケース5: マイルストーン進行によるエンティティ変化', async ({ page }) => {
    await takeComparisonScreenshot(page, 'entity-milestone-change', 'before');
    
    // 現在のマイルストーン確認
    const currentMilestone = page.locator('[data-testid="current-milestone"]');
    if (await currentMilestone.isVisible()) {
      const milestoneName = await currentMilestone.textContent();
      console.log(`現在のマイルストーン: ${milestoneName}`);
    }
    
    // マイルストーン進行アクション
    await sendChatMessage(page, 'クエスト依頼を受ける', 'ic');
    await waitForAIGeneration(page, '[data-testid="ai-response"]', 15000);
    
    // マイルストーン更新の確認
    const milestoneUpdate = page.locator('[data-testid="milestone-updated"]');
    if (await milestoneUpdate.isVisible()) {
      // 新しいエンティティの追加確認
      await page.waitForSelector('[data-testid="new-entity-added"]', { timeout: 5000 });
      
      const newEntities = page.locator('[data-testid="entity-item"][data-new="true"]');
      const newCount = await newEntities.count();
      console.log(`新規追加エンティティ数: ${newCount}`);
      
      // 新エンティティの重要度確認
      for (let i = 0; i < newCount; i++) {
        const entity = newEntities.nth(i);
        const importance = await entity.getAttribute('data-importance');
        expect(['high', 'medium', 'low']).toContain(importance);
      }
    }
    
    await takeComparisonScreenshot(page, 'entity-milestone-change', 'after');
  });

  test('ケース6: エンティティ表示上限と自動調整', async ({ page }) => {
    await takeComparisonScreenshot(page, 'entity-display-limit', 'before');
    
    // 混雑した場所への移動（多数のエンティティ）
    await page.click('[data-testid="location-panel-toggle"]');
    await page.waitForSelector('[data-testid="location-panel-content"]', { timeout: 3000 });
    
    await page.click('[data-testid="location-option-town-square"]');
    await page.click('[data-testid="move-to-location-button"]');
    
    await page.waitForTimeout(2000); // エンティティ読み込み待機
    
    // 表示エンティティ数の確認
    const visibleEntities = page.locator('[data-testid="entity-item"]:visible');
    const visibleCount = await visibleEntities.count();
    console.log(`表示エンティティ数: ${visibleCount}`);
    
    // 表示上限の確認（通常は10体程度）
    expect(visibleCount).toBeLessThanOrEqual(15);
    
    // 「その他のエンティティ」表示の確認
    const moreEntitiesIndicator = page.locator('[data-testid="more-entities-indicator"]');
    if (await moreEntitiesIndicator.isVisible()) {
      const moreCount = await moreEntitiesIndicator.textContent();
      console.log(`非表示エンティティ: ${moreCount}`);
      
      // 展開ボタンで追加表示
      await page.click('[data-testid="show-more-entities"]');
      await page.waitForTimeout(1000);
      
      const expandedCount = await visibleEntities.count();
      expect(expandedCount).toBeGreaterThan(visibleCount);
    }
    
    await takeComparisonScreenshot(page, 'entity-display-limit', 'after');
  });

  test('エンティティ管理のエラーハンドリング', async ({ page }) => {
    // エンティティ読み込みエラーのシミュレーション
    await page.route('/api/ai-agent/entities/*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'エンティティデータの取得に失敗しました' })
      });
    });
    
    // 場所移動を試行
    await page.click('[data-testid="location-panel-toggle"]');
    await page.click('[data-testid="location-option-market"]');
    await page.click('[data-testid="move-to-location-button"]');
    
    // エラー表示の確認
    await page.waitForSelector('[data-testid="error-display"]', { timeout: 5000 });
    await expect(page.locator('[data-testid="error-message"]')).toContainText('エンティティデータの取得に失敗');
    
    // リトライボタンの確認
    const retryButton = page.locator('[data-testid="retry-button"]');
    await expect(retryButton).toBeVisible();
    
    // APIルートを正常に戻す
    await page.unroute('/api/ai-agent/entities/*');
    
    // リトライ実行
    await retryButton.click();
    
    // 正常な読み込みを確認
    await page.waitForSelector('[data-testid="entity-item"]', { timeout: 5000 });
    console.log('エンティティ読み込みリトライ成功');
  });
});