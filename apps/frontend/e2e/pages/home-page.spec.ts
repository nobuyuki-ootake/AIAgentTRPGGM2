/**
 * ホームページの基本機能テスト - 制限版
 * 
 * 1stリリース品質：基本ナビゲーションのみ確認
 * Critical Priority テストで詳細機能は確認済み
 */
import { test, expect } from '@playwright/test';
import { 
  navigateToHome, 
  cleanupTestData
} from '../utils/test-helpers';

test.describe('ホームページ基本機能 - 制限版', () => {
  
  test.beforeEach(async ({ page }) => {
    await cleanupTestData(page);
  });

  test('ホームページの基本読み込みとナビゲーション', async ({ page }) => {
    // ホームページへの遷移
    await navigateToHome(page);
    
    // 基本要素の確認
    await expect(page.locator('[data-testid="app-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="navigation"]')).toBeVisible();
    
    // 基本ナビゲーションの動作確認
    await expect(page.locator('[data-testid="nav-home"]')).toBeVisible();
    
    console.log('ホームページ基本機能確認完了');
  });

});

// エラーハンドリングは Critical Priority テストでカバー済み