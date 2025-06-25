/**
 * AI拡張シナリオ生成機能のテスト
 * 
 * Phase 5で実装したトップダウンアプローチの品質保証
 * 30秒以内でのプレイ可能状態到達の実現確認
 */
import { test, expect } from '@playwright/test';
import { 
  navigateToHome,
  waitForAIGeneration,
  verifyErrorHandling,
  cleanupTestData,
  takeComparisonScreenshot
} from '../utils/test-helpers';
import { testCampaignAIEnhanced } from '../data/test-campaigns';

test.describe('AI シナリオ生成 - トップダウンアプローチ', () => {

  test.beforeEach(async ({ page }) => {
    await cleanupTestData(page);
    
    // AI API キーの設定確認（環境変数から）
    await page.goto('/settings');
    const hasApiKey = await page.locator('[data-testid="api-key-configured"]').isVisible();
    if (!hasApiKey) {
      test.skip('AI APIキーが設定されていません');
    }
  });

  test('マイルストーン概要生成（Phase 1）', async ({ page }) => {
    await takeComparisonScreenshot(page, 'milestone-generation', 'before');
    
    await navigateToHome(page);
    await page.click('[data-testid="create-new-campaign"]');
    
    // AI強化設定でキャンペーン作成
    await page.fill('[data-testid="campaign-name-input"]', testCampaignAIEnhanced.name);
    await page.fill('[data-testid="campaign-theme-input"]', '謎解きミステリー');
    await page.click('[data-testid="ai-enhancement-toggle"]');
    
    // シナリオ生成開始
    await page.click('[data-testid="generate-scenario-button"]');
    
    // Phase 1: マイルストーン概要生成の確認
    await waitForAIGeneration(page, '[data-testid="milestone-outlines"]', 30000);
    
    // 生成されたマイルストーンの確認
    const milestones = page.locator('[data-testid="milestone-item"]');
    const milestoneCount = await milestones.count();
    
    expect(milestoneCount).toBeGreaterThan(0);
    expect(milestoneCount).toBeLessThanOrEqual(5); // 適切な数
    
    // 各マイルストーンの内容確認
    for (let i = 0; i < milestoneCount; i++) {
      const milestone = milestones.nth(i);
      await expect(milestone.locator('[data-testid="milestone-title"]')).toBeVisible();
      await expect(milestone.locator('[data-testid="milestone-description"]')).toBeVisible();
      
      // 手探り感の確認（進捗バーが表示されていない）
      await expect(milestone.locator('[data-testid="progress-bar"]')).not.toBeVisible();
    }
    
    await takeComparisonScreenshot(page, 'milestone-generation', 'after');
  });

  test('二層構造エンティティプール生成（Phase 2）', async ({ page }) => {
    await navigateToHome(page);
    await page.click('[data-testid="create-new-campaign"]');
    
    // 基本設定
    await page.fill('[data-testid="campaign-name-input"]', 'エンティティプールテスト');
    await page.click('[data-testid="ai-enhancement-toggle"]');
    await page.click('[data-testid="generate-scenario-button"]');
    
    // Phase 2: エンティティプール生成まで待機
    await waitForAIGeneration(page, '[data-testid="entity-pool-display"]', 45000);
    
    // コアエンティティプールの確認
    const corePool = page.locator('[data-testid="core-entity-pool"]');
    await expect(corePool).toBeVisible();
    
    // ボーナスエンティティプールの確認
    const bonusPool = page.locator('[data-testid="bonus-entity-pool"]');
    await expect(bonusPool).toBeVisible();
    
    // 各エンティティタイプの確認
    const entityTypes = ['events', 'npcs', 'items', 'quests'];
    for (const type of entityTypes) {
      await expect(corePool.locator(`[data-testid="core-${type}"]`)).toBeVisible();
    }
    
    // ボーナスカテゴリの確認
    const bonusCategories = ['practical-rewards', 'trophy-items', 'mystery-items'];
    for (const category of bonusCategories) {
      await expect(bonusPool.locator(`[data-testid="bonus-${category}"]`)).toBeVisible();
    }
  });

  test('場所配置最適化（Phase 2.4）', async ({ page }) => {
    await page.goto('/campaign/test-campaign-ai-002/scenario-editor');
    
    // 場所配置ボタン
    await page.click('[data-testid="optimize-location-mapping"]');
    
    // AI場所配置の実行
    await waitForAIGeneration(page, '[data-testid="location-mapping-result"]', 30000);
    
    // 配置結果の確認
    const locationMappings = page.locator('[data-testid="location-mapping-item"]');
    const mappingCount = await locationMappings.count();
    
    expect(mappingCount).toBeGreaterThan(0);
    
    // 各配置の詳細確認
    for (let i = 0; i < mappingCount; i++) {
      const mapping = locationMappings.nth(i);
      
      // 場所名の確認
      await expect(mapping.locator('[data-testid="location-name"]')).toBeVisible();
      
      // 配置されたエンティティの確認
      await expect(mapping.locator('[data-testid="mapped-entities"]')).toBeVisible();
      
      // 時間条件の確認
      const timeConditions = mapping.locator('[data-testid="time-conditions"]');
      if (await timeConditions.isVisible()) {
        const conditions = await timeConditions.textContent();
        expect(conditions).toMatch(/day_time|night_only|any/);
      }
    }
  });

  test('手探り感演出機能', async ({ page }) => {
    await page.goto('/session/test-session-ai-enhanced');
    
    // 暗示的ヒント生成のテスト
    await page.click('[data-testid="request-hint-button"]');
    
    await waitForAIGeneration(page, '[data-testid="subtle-hints-display"]', 20000);
    
    // ヒント内容の確認
    const hints = page.locator('[data-testid="hint-message"]');
    const hintCount = await hints.count();
    
    expect(hintCount).toBeGreaterThan(0);
    
    for (let i = 0; i < hintCount; i++) {
      const hint = await hints.nth(i).textContent();
      
      // 直接的でない表現の確認
      expect(hint).not.toMatch(/達成|完了|進捗|%/);
      
      // 暗示的表現の確認
      expect(hint).toMatch(/気になる|興味深い|なにか|ありそう|かもしれない/);
    }
    
    // 自然な誘導メッセージのテスト
    await page.click('[data-testid="request-guidance-button"]');
    
    await waitForAIGeneration(page, '[data-testid="natural-guidance"]', 20000);
    
    const guidance = await page.textContent('[data-testid="guidance-message"]');
    expect(guidance).toBeTruthy();
    expect(guidance!.length).toBeGreaterThan(20);
    
    // 強制感のない表現の確認
    expect(guidance).not.toMatch(/する必要がある|しなければならない|要求/);
  });

});

test.describe('AI品質・一貫性テスト', () => {

  test('複数回生成での一貫性確認', async ({ page }) => {
    const results = [];
    
    // 同じ条件で3回生成
    for (let i = 0; i < 3; i++) {
      await navigateToHome(page);
      await page.click('[data-testid="create-new-campaign"]');
      
      await page.fill('[data-testid="campaign-name-input"]', `一貫性テスト${i + 1}`);
      await page.fill('[data-testid="campaign-theme-input"]', '謎解きミステリー');
      await page.click('[data-testid="generate-scenario-button"]');
      
      await waitForAIGeneration(page, '[data-testid="milestone-outlines"]', 30000);
      
      // 生成結果の取得
      const milestoneCount = await page.locator('[data-testid="milestone-item"]').count();
      const firstTitle = await page.locator('[data-testid="milestone-item"]').first().locator('[data-testid="milestone-title"]').textContent();
      
      results.push({
        milestoneCount,
        firstTitle
      });
    }
    
    // 一貫性の確認（完全に同じである必要はないが、合理的な範囲内）
    const counts = results.map(r => r.milestoneCount);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    
    expect(maxCount - minCount).toBeLessThanOrEqual(2); // 差は2以内
    
    // タイトルの多様性確認（同じタイトルばかりでない）
    const titles = results.map(r => r.firstTitle);
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBeGreaterThanOrEqual(2); // 少なくとも2つは異なる
  });

  test('日本語コンテンツの品質確認', async ({ page }) => {
    await navigateToHome(page);
    await page.click('[data-testid="create-new-campaign"]');
    
    await page.fill('[data-testid="campaign-name-input"]', '日本語品質テスト');
    await page.fill('[data-testid="campaign-theme-input"]', '江戸時代の怪談');
    await page.click('[data-testid="generate-scenario-button"]');
    
    await waitForAIGeneration(page, '[data-testid="milestone-outlines"]', 30000);
    
    // 生成された内容の日本語品質確認
    const milestones = page.locator('[data-testid="milestone-item"]');
    const milestoneCount = await milestones.count();
    
    for (let i = 0; i < milestoneCount; i++) {
      const title = await milestones.nth(i).locator('[data-testid="milestone-title"]').textContent();
      const description = await milestones.nth(i).locator('[data-testid="milestone-description"]').textContent();
      
      // 日本語文字の確認
      expect(title).toMatch(/[ひらがなカタカナ漢字]/);
      expect(description).toMatch(/[ひらがなカタカナ漢字]/);
      
      // 適切な長さの確認
      expect(title!.length).toBeLessThan(50);
      expect(description!.length).toBeGreaterThan(10);
      expect(description!.length).toBeLessThan(200);
      
      // テーマとの一貫性確認
      expect(description).toMatch(/江戸|時代|怪談|妖怪|武士|町人/);
    }
  });

});

test.describe('パフォーマンステスト', () => {

  test('大規模シナリオ生成のパフォーマンス', async ({ page }) => {
    const startTime = Date.now();
    
    await navigateToHome(page);
    await page.click('[data-testid="create-new-campaign"]');
    
    // 大規模設定
    await page.fill('[data-testid="campaign-name-input"]', '大規模パフォーマンステスト');
    await page.fill('[data-testid="milestone-count-input"]', '5');
    await page.fill('[data-testid="session-duration-input"]', '240');
    await page.click('[data-testid="generate-scenario-button"]');
    
    // 生成完了まで待機
    await waitForAIGeneration(page, '[data-testid="generation-complete"]', 120000); // 2分
    
    const endTime = Date.now();
    const elapsedTime = endTime - startTime;
    
    // パフォーマンス要件の確認
    expect(elapsedTime).toBeLessThan(120000); // 2分以内
    
    console.log(`大規模シナリオ生成時間: ${elapsedTime}ms`);
    
    // メモリ使用量の確認
    const memoryUsage = await page.evaluate(() => {
      return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
    });
    
    // 100MB以下であることを確認
    expect(memoryUsage).toBeLessThan(100 * 1024 * 1024);
  });

  test('AI APIリクエスト最適化', async ({ page }) => {
    let apiCallCount = 0;
    
    // API呼び出しをカウント
    await page.route('**/api/ai-**', (route) => {
      apiCallCount++;
      route.continue();
    });
    
    await navigateToHome(page);
    await page.click('[data-testid="create-new-campaign"]');
    
    await page.fill('[data-testid="campaign-name-input"]', 'API最適化テスト');
    await page.click('[data-testid="generate-scenario-button"]');
    
    await waitForAIGeneration(page, '[data-testid="generation-complete"]', 60000);
    
    // API呼び出し回数の確認（効率的な実装の確認）
    expect(apiCallCount).toBeLessThan(10); // 10回以下
    expect(apiCallCount).toBeGreaterThan(0); // 0回でない
    
    console.log(`API呼び出し回数: ${apiCallCount}`);
  });

});

test.describe('エラーハンドリング', () => {

  test('AI API失敗時の適切なエラー処理', async ({ page }) => {
    // AI APIを失敗させる
    await page.route('**/api/ai-**', route => {
      route.abort('failed');
    });
    
    await navigateToHome(page);
    await page.click('[data-testid="create-new-campaign"]');
    
    await page.fill('[data-testid="campaign-name-input"]', 'エラーテスト');
    await page.click('[data-testid="generate-scenario-button"]');
    
    // エラーハンドリングの確認
    await verifyErrorHandling(page, 'シナリオ生成に失敗しました');
    
    // フォールバック処理ではなく、リトライ可能なエラー表示
    await expect(page.locator('[data-testid="retry-generation-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-details"]')).toBeVisible();
  });

  test('部分的な生成失敗時の対応', async ({ page }) => {
    let callCount = 0;
    
    // 3回目のAPIコールのみ失敗させる
    await page.route('**/api/ai-**', route => {
      callCount++;
      if (callCount === 3) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });
    
    await navigateToHome(page);
    await page.click('[data-testid="create-new-campaign"]');
    
    await page.fill('[data-testid="campaign-name-input"]', '部分失敗テスト');
    await page.click('[data-testid="generate-scenario-button"]');
    
    // 部分的な結果の表示確認
    await page.waitForSelector('[data-testid="partial-generation-result"]', { timeout: 30000 });
    
    // 失敗した部分の再生成オプション
    await expect(page.locator('[data-testid="regenerate-failed-parts"]')).toBeVisible();
  });

});