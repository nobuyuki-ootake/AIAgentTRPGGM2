/**
 * AIキャラクター生成 E2Eテスト
 * 
 * 対象機能：
 * - NPC自動生成
 * - キャラクター能力値生成
 * - 背景・性格設定生成
 * - キャラクター画像生成
 * 
 * テスト方針：
 * - 生成品質の確認
 * - バリエーション確認
 * - 生成時間の許容範囲内確認
 */
import { test, expect } from '@playwright/test';
import {
  navigateToHome,
  startNewCampaignFlow,
  fillCampaignForm,
  takeComparisonScreenshot,
  cleanupTestData,
  waitForAIGeneration,
  verifyErrorHandling
} from '../utils/test-helpers';
import type { TRPGCharacter, NPCCharacter, EnemyCharacter } from '@ai-agent-trpg/types';

test.describe('AIキャラクター生成機能', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupTestData(page);
    
    // キャンペーン作成
    await navigateToHome(page);
    await startNewCampaignFlow(page);
    await fillCampaignForm(page, {
      name: 'AIキャラクター生成テスト',
      description: 'AIによるキャラクター生成機能のテスト',
      settings: {
        theme: 'ファンタジー',
        world: { name: 'テストワールド' }
      }
    });
    await page.click('[data-testid="create-campaign-button"]');
    await page.waitForSelector('[data-testid="campaign-details"]', { timeout: 10000 });
  });

  test('ケース1: NPC自動生成（基本機能）', async ({ page }) => {
    await takeComparisonScreenshot(page, 'npc-generation-basic', 'before');
    
    // キャラクター管理画面へ移動
    await page.click('[data-testid="character-management-tab"]');
    await page.waitForSelector('[data-testid="character-list"]', { timeout: 5000 });
    
    // NPC生成ボタンをクリック
    await page.click('[data-testid="generate-npc-button"]');
    await page.waitForSelector('[data-testid="npc-generation-panel"]', { timeout: 3000 });
    
    // 生成パラメータ設定
    await page.selectOption('[data-testid="npc-role-select"]', 'shopkeeper');
    await page.fill('[data-testid="npc-location-input"]', '武器屋');
    
    // 生成実行
    await page.click('[data-testid="start-generation-button"]');
    
    // AI生成完了待機
    await waitForAIGeneration(page, '[data-testid="generated-npc"]', 30000);
    
    // 生成されたNPCの確認
    const generatedNPC = page.locator('[data-testid="generated-npc"]');
    await expect(generatedNPC).toBeVisible();
    
    // 基本情報の確認
    await expect(generatedNPC.locator('[data-testid="npc-name"]')).not.toBeEmpty();
    await expect(generatedNPC.locator('[data-testid="npc-description"]')).not.toBeEmpty();
    await expect(generatedNPC.locator('[data-testid="npc-role"]')).toContainText('shopkeeper');
    
    // 能力値の確認
    const abilityScores = generatedNPC.locator('[data-testid="ability-score"]');
    const scoreCount = await abilityScores.count();
    expect(scoreCount).toBeGreaterThanOrEqual(6); // D&D基本能力値
    
    // 各能力値が適切な範囲内か確認
    for (let i = 0; i < scoreCount; i++) {
      const score = await abilityScores.nth(i).textContent();
      const scoreValue = parseInt(score || '0');
      expect(scoreValue).toBeGreaterThanOrEqual(3);
      expect(scoreValue).toBeLessThanOrEqual(18);
    }
    
    await takeComparisonScreenshot(page, 'npc-generation-basic', 'after');
  });

  test('ケース2: キャラクター背景・性格の詳細生成', async ({ page }) => {
    await takeComparisonScreenshot(page, 'character-background-generation', 'before');
    
    await page.click('[data-testid="character-management-tab"]');
    await page.waitForSelector('[data-testid="character-list"]', { timeout: 5000 });
    
    // 詳細生成モードを選択
    await page.click('[data-testid="generate-npc-button"]');
    await page.waitForSelector('[data-testid="npc-generation-panel"]', { timeout: 3000 });
    
    // 詳細モード有効化
    await page.check('[data-testid="detailed-generation-mode"]');
    
    // キャラクタータイプ選択
    await page.selectOption('[data-testid="npc-role-select"]', 'noble');
    await page.fill('[data-testid="npc-location-input"]', '貴族の館');
    
    // 生成実行
    await page.click('[data-testid="start-generation-button"]');
    await waitForAIGeneration(page, '[data-testid="generated-npc"]', 45000);
    
    const detailedNPC = page.locator('[data-testid="generated-npc"]');
    
    // 詳細情報の確認
    await expect(detailedNPC.locator('[data-testid="npc-background"]')).not.toBeEmpty();
    await expect(detailedNPC.locator('[data-testid="npc-personality"]')).not.toBeEmpty();
    await expect(detailedNPC.locator('[data-testid="npc-motivation"]')).not.toBeEmpty();
    
    // 固有の特徴・癖の確認
    const quirks = detailedNPC.locator('[data-testid="npc-quirks"]');
    if (await quirks.isVisible()) {
      const quirksText = await quirks.textContent();
      expect(quirksText).toBeTruthy();
    }
    
    // 関係性情報の確認
    const relationships = detailedNPC.locator('[data-testid="npc-relationships"]');
    if (await relationships.isVisible()) {
      const relationshipCount = await relationships.locator('[data-testid="relationship-item"]').count();
      expect(relationshipCount).toBeGreaterThan(0);
    }
    
    await takeComparisonScreenshot(page, 'character-background-generation', 'after');
  });

  test('ケース3: 敵キャラクター生成（戦闘統計込み）', async ({ page }) => {
    await takeComparisonScreenshot(page, 'enemy-generation', 'before');
    
    await page.click('[data-testid="character-management-tab"]');
    await page.waitForSelector('[data-testid="character-list"]', { timeout: 5000 });
    
    // 敵キャラクター生成
    await page.click('[data-testid="generate-enemy-button"]');
    await page.waitForSelector('[data-testid="enemy-generation-panel"]', { timeout: 3000 });
    
    // 敵のタイプ・レベル設定
    await page.selectOption('[data-testid="enemy-type-select"]', 'orc_warrior');
    await page.fill('[data-testid="enemy-level-input"]', '3');
    
    // 戦闘統計生成オプション
    await page.check('[data-testid="include-combat-stats"]');
    
    // 生成実行
    await page.click('[data-testid="start-generation-button"]');
    await waitForAIGeneration(page, '[data-testid="generated-enemy"]', 30000);
    
    const generatedEnemy = page.locator('[data-testid="generated-enemy"]');
    
    // 基本情報確認
    await expect(generatedEnemy.locator('[data-testid="enemy-name"]')).not.toBeEmpty();
    await expect(generatedEnemy.locator('[data-testid="enemy-type"]')).toContainText('orc');
    
    // 戦闘統計の確認
    await expect(generatedEnemy.locator('[data-testid="hit-points"]')).not.toBeEmpty();
    await expect(generatedEnemy.locator('[data-testid="armor-class"]')).not.toBeEmpty();
    await expect(generatedEnemy.locator('[data-testid="attack-bonus"]')).not.toBeEmpty();
    
    // HPが適切な範囲か確認
    const hpText = await generatedEnemy.locator('[data-testid="hit-points"]').textContent();
    const hp = parseInt(hpText?.match(/\d+/)?.[0] || '0');
    expect(hp).toBeGreaterThan(0);
    expect(hp).toBeLessThan(200); // レベル3なので妥当な範囲
    
    // 攻撃手段の確認
    const attacks = generatedEnemy.locator('[data-testid="attack-option"]');
    const attackCount = await attacks.count();
    expect(attackCount).toBeGreaterThan(0);
    
    await takeComparisonScreenshot(page, 'enemy-generation', 'after');
  });

  test('ケース4: キャラクター画像生成', async ({ page }) => {
    await takeComparisonScreenshot(page, 'character-image-generation', 'before');
    
    await page.click('[data-testid="character-management-tab"]');
    await page.click('[data-testid="generate-npc-button"]');
    await page.waitForSelector('[data-testid="npc-generation-panel"]', { timeout: 3000 });
    
    // 画像生成オプション有効化
    await page.check('[data-testid="generate-character-image"]');
    
    // キャラクター設定
    await page.selectOption('[data-testid="npc-role-select"]', 'mage');
    await page.fill('[data-testid="image-style-input"]', 'fantasy art style');
    
    // 生成実行（画像生成は時間がかかる）
    await page.click('[data-testid="start-generation-button"]');
    
    // 画像生成完了待機（長めのタイムアウト）
    await waitForAIGeneration(page, '[data-testid="generated-character-image"]', 60000);
    
    // 生成された画像の確認
    const characterImage = page.locator('[data-testid="generated-character-image"]');
    await expect(characterImage).toBeVisible();
    
    // 画像の読み込み確認
    await page.waitForLoadState('networkidle');
    const imageElement = characterImage.locator('img');
    await expect(imageElement).toHaveAttribute('src');
    
    // 画像保存ボタンの確認
    const saveImageButton = page.locator('[data-testid="save-character-image"]');
    await expect(saveImageButton).toBeVisible();
    
    await takeComparisonScreenshot(page, 'character-image-generation', 'after');
  });

  test('ケース5: バッチキャラクター生成', async ({ page }) => {
    await takeComparisonScreenshot(page, 'batch-character-generation', 'before');
    
    await page.click('[data-testid="character-management-tab"]');
    await page.click('[data-testid="batch-generation-button"]');
    await page.waitForSelector('[data-testid="batch-generation-panel"]', { timeout: 3000 });
    
    // バッチ生成設定
    await page.fill('[data-testid="batch-count-input"]', '5');
    await page.selectOption('[data-testid="batch-type-select"]', 'tavern_crowd');
    
    // 生成実行
    await page.click('[data-testid="start-batch-generation"]');
    
    // 進捗表示の確認
    await expect(page.locator('[data-testid="generation-progress"]')).toBeVisible();
    
    // バッチ生成完了待機
    await waitForAIGeneration(page, '[data-testid="batch-generation-complete"]', 90000);
    
    // 生成されたキャラクター群の確認
    const generatedCharacters = page.locator('[data-testid="generated-character-item"]');
    const characterCount = await generatedCharacters.count();
    expect(characterCount).toBe(5);
    
    // 各キャラクターの基本情報確認
    for (let i = 0; i < characterCount; i++) {
      const character = generatedCharacters.nth(i);
      await expect(character.locator('[data-testid="character-name"]')).not.toBeEmpty();
      await expect(character.locator('[data-testid="character-role"]')).not.toBeEmpty();
    }
    
    // 重複チェック（名前の重複がないか）
    const names = [];
    for (let i = 0; i < characterCount; i++) {
      const nameElement = generatedCharacters.nth(i).locator('[data-testid="character-name"]');
      const name = await nameElement.textContent();
      expect(names).not.toContain(name);
      names.push(name);
    }
    
    await takeComparisonScreenshot(page, 'batch-character-generation', 'after');
  });

  test('ケース6: キャラクター生成のカスタマイズ', async ({ page }) => {
    await page.click('[data-testid="character-management-tab"]');
    await page.click('[data-testid="generate-npc-button"]');
    await page.waitForSelector('[data-testid="npc-generation-panel"]', { timeout: 3000 });
    
    // 詳細カスタマイズモード
    await page.click('[data-testid="advanced-customization"]');
    await page.waitForSelector('[data-testid="customization-options"]', { timeout: 3000 });
    
    // カスタム設定
    await page.fill('[data-testid="character-age-range"]', '25-35');
    await page.selectOption('[data-testid="character-race"]', 'elf');
    await page.selectOption('[data-testid="character-class"]', 'ranger');
    await page.fill('[data-testid="special-traits"]', '弓の名手, 動物との会話');
    
    // 生成実行
    await page.click('[data-testid="start-generation-button"]');
    await waitForAIGeneration(page, '[data-testid="generated-npc"]', 30000);
    
    // カスタマイズ反映確認
    const customNPC = page.locator('[data-testid="generated-npc"]');
    await expect(customNPC.locator('[data-testid="character-race"]')).toContainText('エルフ');
    await expect(customNPC.locator('[data-testid="character-class"]')).toContainText('レンジャー');
    
    // 特殊能力の反映確認
    const traits = customNPC.locator('[data-testid="special-traits"]');
    await expect(traits).toContainText('弓');
    await expect(traits).toContainText('動物');
  });

  test('キャラクター生成のエラーハンドリング', async ({ page }) => {
    // AI生成サービスエラーのシミュレーション
    await page.route('/api/ai-agent/generate-character', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'API利用制限に達しました。しばらくお待ちください。',
          retryAfter: 60
        })
      });
    });
    
    await page.click('[data-testid="character-management-tab"]');
    await page.click('[data-testid="generate-npc-button"]');
    await page.waitForSelector('[data-testid="npc-generation-panel"]', { timeout: 3000 });
    
    // 生成実行
    await page.click('[data-testid="start-generation-button"]');
    
    // エラー表示確認
    await verifyErrorHandling(page, 'API利用制限に達しました');
    
    // 制限情報の表示確認
    const limitInfo = page.locator('[data-testid="rate-limit-info"]');
    if (await limitInfo.isVisible()) {
      await expect(limitInfo).toContainText('60');
    }
    
    // APIルートを正常に戻す
    await page.unroute('/api/ai-agent/generate-character');
    
    // リトライ実行
    await page.click('[data-testid="retry-button"]');
    await waitForAIGeneration(page, '[data-testid="generated-npc"]', 30000);
    console.log('キャラクター生成リトライ成功');
  });

  test('生成キャラクターのキャンペーンへの保存', async ({ page }) => {
    await page.click('[data-testid="character-management-tab"]');
    await page.click('[data-testid="generate-npc-button"]');
    await page.waitForSelector('[data-testid="npc-generation-panel"]', { timeout: 3000 });
    
    await page.selectOption('[data-testid="npc-role-select"]', 'merchant');
    await page.click('[data-testid="start-generation-button"]');
    await waitForAIGeneration(page, '[data-testid="generated-npc"]', 30000);
    
    // 生成されたキャラクターをキャンペーンに保存
    await page.click('[data-testid="save-to-campaign-button"]');
    
    // 保存確認ダイアログ
    await page.waitForSelector('[data-testid="save-character-dialog"]', { timeout: 3000 });
    await page.click('[data-testid="confirm-save-button"]');
    
    // キャラクターリストに追加されることを確認
    await page.waitForSelector('[data-testid="character-saved-notification"]', { timeout: 5000 });
    
    // キャンペーンキャラクターリストで確認
    const characterList = page.locator('[data-testid="campaign-character-list"]');
    const savedCharacter = characterList.locator('[data-testid="character-item"]').last();
    await expect(savedCharacter).toContainText('merchant');
    
    console.log('キャラクター保存テスト完了');
  });
});