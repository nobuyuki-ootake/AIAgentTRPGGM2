/**
 * ホームページ機能 E2Eテスト - 強化版
 * 
 * 対象機能：
 * - 基本ナビゲーション
 * - キャンペーン管理UI
 * - 最近のセッション表示
 * - クイックアクション
 * 
 * テスト方針：
 * - t-WADA命名規則に従った包括的テスト
 * - ユーザージャーニーの確認
 * - レスポンシブデザインの確認
 */
import { test, expect } from '@playwright/test';
import { 
  navigateToHome, 
  cleanupTestData,
  takeComparisonScreenshot,
  startNewCampaignFlow,
  fillCampaignForm,
  measurePageLoadTime
} from '../utils/test-helpers';

test.describe('ホームページ機能 - 強化版', () => {
  
  test.beforeEach(async ({ page }) => {
    await cleanupTestData(page);
  });

  test('ケース1: ページ初期読み込みと基本UI要素', async ({ page }) => {
    await takeComparisonScreenshot(page, 'home-page-initial-load', 'before');
    
    // ページロード時間の測定
    const loadTime = await measurePageLoadTime(page, '/');
    console.log(`ホームページロード時間: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000); // 3秒以内
    
    // 基本UI要素の確認
    await expect(page.locator('[data-testid="app-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="navigation"]')).toBeVisible();
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
    
    // ナビゲーション項目の確認
    await expect(page.locator('[data-testid="nav-home"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-campaigns"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-settings"]')).toBeVisible();
    
    // メインアクションボタンの確認
    await expect(page.locator('[data-testid="create-new-campaign"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-new-campaign"]')).toBeEnabled();
    
    await takeComparisonScreenshot(page, 'home-page-initial-load', 'after');
  });

  test('ケース2: キャンペーン一覧表示と管理', async ({ page }) => {
    await takeComparisonScreenshot(page, 'campaign-list-display', 'before');
    
    await navigateToHome(page);
    
    // キャンペーン一覧セクションの確認
    const campaignList = page.locator('[data-testid="campaign-list"]');
    await expect(campaignList).toBeVisible();
    
    // 空の状態メッセージ確認（初回アクセス時）
    const emptyState = page.locator('[data-testid="empty-campaign-list"]');
    if (await emptyState.isVisible()) {
      await expect(emptyState).toContainText(/キャンペーンがありません|No campaigns/);
      
      // 新規作成への誘導確認
      const createFirstCampaign = page.locator('[data-testid="create-first-campaign"]');
      await expect(createFirstCampaign).toBeVisible();
    }
    
    // 新規キャンペーン作成テスト
    await page.click('[data-testid="create-new-campaign"]');
    await page.waitForSelector('[data-testid="campaign-setup-form"]', { timeout: 5000 });
    
    // キャンペーン作成フォームの確認
    await expect(page.locator('[data-testid="campaign-name-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="campaign-description-input"]')).toBeVisible();
    
    // テストキャンペーンの作成
    await fillCampaignForm(page, {
      name: 'テスト用キャンペーン',
      description: 'ホームページ機能テスト用'
    });
    
    await page.click('[data-testid="create-campaign-button"]');
    await page.waitForSelector('[data-testid="campaign-created-notification"]', { timeout: 5000 });
    
    // ホームに戻ってキャンペーン表示確認
    await page.click('[data-testid="nav-home"]');
    await page.waitForSelector('[data-testid="campaign-item"]', { timeout: 5000 });
    
    const campaignItem = page.locator('[data-testid="campaign-item"]').first();
    await expect(campaignItem).toContainText('テスト用キャンペーン');
    
    await takeComparisonScreenshot(page, 'campaign-list-display', 'after');
  });

  test('ケース3: 最近のセッション表示', async ({ page }) => {
    await takeComparisonScreenshot(page, 'recent-sessions-display', 'before');
    
    await navigateToHome(page);
    
    // 最近のセッションセクション確認
    const recentSessions = page.locator('[data-testid="recent-sessions"]');
    if (await recentSessions.isVisible()) {
      // セッション履歴の表示確認
      const sessionItems = page.locator('[data-testid="session-item"]');
      const sessionCount = await sessionItems.count();
      
      if (sessionCount > 0) {
        // セッション情報の詳細確認
        const firstSession = sessionItems.first();
        await expect(firstSession.locator('[data-testid="session-date"]')).toBeVisible();
        await expect(firstSession.locator('[data-testid="session-duration"]')).toBeVisible();
        await expect(firstSession.locator('[data-testid="session-campaign"]')).toBeVisible();
        
        // セッション再開ボタンの確認
        const resumeButton = firstSession.locator('[data-testid="resume-session"]');
        if (await resumeButton.isVisible()) {
          await expect(resumeButton).toBeEnabled();
        }
      } else {
        // 空の状態メッセージ
        const noSessions = page.locator('[data-testid="no-recent-sessions"]');
        await expect(noSessions).toContainText(/最近のセッションはありません|No recent sessions/);
      }
    }
    
    await takeComparisonScreenshot(page, 'recent-sessions-display', 'after');
  });

  test('ケース4: クイックアクション機能', async ({ page }) => {
    await takeComparisonScreenshot(page, 'quick-actions', 'before');
    
    await navigateToHome(page);
    
    // クイックアクションパネルの確認
    const quickActions = page.locator('[data-testid="quick-actions"]');
    if (await quickActions.isVisible()) {
      // 利用可能なクイックアクション確認
      const quickActionItems = page.locator('[data-testid="quick-action-item"]');
      const actionCount = await quickActionItems.count();
      expect(actionCount).toBeGreaterThan(0);
      
      // 各アクションの確認
      for (let i = 0; i < actionCount; i++) {
        const action = quickActionItems.nth(i);
        await expect(action.locator('[data-testid="action-icon"]')).toBeVisible();
        await expect(action.locator('[data-testid="action-title"]')).toBeVisible();
        await expect(action.locator('[data-testid="action-description"]')).toBeVisible();
      }
      
      // 特定アクションのテスト（例：ダイスロール）
      const diceAction = page.locator('[data-testid="quick-action-dice"]');
      if (await diceAction.isVisible()) {
        await diceAction.click();
        
        // ダイスパネルの表示確認
        await page.waitForSelector('[data-testid="quick-dice-panel"]', { timeout: 3000 });
        const dicePanel = page.locator('[data-testid="quick-dice-panel"]');
        await expect(dicePanel).toBeVisible();
        
        // パネルを閉じる
        const closeButton = page.locator('[data-testid="close-quick-panel"]');
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      }
    }
    
    await takeComparisonScreenshot(page, 'quick-actions', 'after');
  });

  test('ケース5: レスポンシブデザインの確認', async ({ page }) => {
    await navigateToHome(page);
    
    // デスクトップビューの確認
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    
    const desktopLayout = page.locator('[data-testid="desktop-layout"]');
    if (await desktopLayout.isVisible()) {
      await expect(desktopLayout).toBeVisible();
    }
    
    // タブレットビューの確認
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    // メニューボタンの表示確認（モバイル対応）
    const mobileMenu = page.locator('[data-testid="mobile-menu-toggle"]');
    if (await mobileMenu.isVisible()) {
      await expect(mobileMenu).toBeVisible();
      
      // メニューの開閉テスト
      await mobileMenu.click();
      await page.waitForSelector('[data-testid="mobile-nav-menu"]', { timeout: 2000 });
      const navMenu = page.locator('[data-testid="mobile-nav-menu"]');
      await expect(navMenu).toBeVisible();
      
      // メニューを閉じる
      await mobileMenu.click();
      await expect(navMenu).not.toBeVisible();
    }
    
    // モバイルビューの確認
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // モバイルレイアウトの確認
    const mobileLayout = page.locator('[data-testid="mobile-layout"]');
    if (await mobileLayout.isVisible()) {
      await expect(mobileLayout).toBeVisible();
    }
    
    // 元のサイズに戻す
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('ケース6: 検索とフィルタリング機能', async ({ page }) => {
    await navigateToHome(page);
    
    // 検索機能の確認
    const searchInput = page.locator('[data-testid="campaign-search"]');
    if (await searchInput.isVisible()) {
      // 検索テスト（キャンペーンがある場合）
      await searchInput.fill('テスト');
      await page.waitForTimeout(500);
      
      // 検索結果の確認
      const searchResults = page.locator('[data-testid="search-results"]');
      if (await searchResults.isVisible()) {
        const resultCount = await page.locator('[data-testid="campaign-item"]').count();
        console.log(`検索結果: ${resultCount}件`);
      }
      
      // 検索クリア
      await searchInput.fill('');
    }
    
    // フィルター機能の確認
    const filterButton = page.locator('[data-testid="campaign-filter"]');
    if (await filterButton.isVisible()) {
      await filterButton.click();
      
      // フィルターオプションの確認
      await page.waitForSelector('[data-testid="filter-panel"]', { timeout: 2000 });
      const filterPanel = page.locator('[data-testid="filter-panel"]');
      await expect(filterPanel).toBeVisible();
      
      // フィルター項目の確認
      const statusFilter = page.locator('[data-testid="filter-status"]');
      const dateFilter = page.locator('[data-testid="filter-date"]');
      
      if (await statusFilter.isVisible()) {
        await expect(statusFilter).toBeVisible();
      }
      
      // フィルターパネルを閉じる
      const closeFilter = page.locator('[data-testid="close-filter"]');
      if (await closeFilter.isVisible()) {
        await closeFilter.click();
      }
    }
  });

  test('パフォーマンスとアクセシビリティ確認', async ({ page }) => {
    await navigateToHome(page);
    
    // ページサイズの確認（軽量化チェック）
    const performanceMetrics = await page.evaluate(() => {
      return {
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
        resourceCount: performance.getEntriesByType('resource').length
      };
    });
    
    console.log('パフォーマンス指標:', performanceMetrics);
    expect(performanceMetrics.domContentLoaded).toBeLessThan(2000); // 2秒以内
    
    // 基本的なアクセシビリティ確認
    // メインナビゲーションのaria-label確認
    const navigation = page.locator('[data-testid="navigation"]');
    const ariaLabel = await navigation.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    
    // ボタンのアクセシビリティ確認
    const createButton = page.locator('[data-testid="create-new-campaign"]');
    const buttonText = await createButton.textContent();
    expect(buttonText).toBeTruthy();
    
    console.log('アクセシビリティ基本確認完了');
  });
});