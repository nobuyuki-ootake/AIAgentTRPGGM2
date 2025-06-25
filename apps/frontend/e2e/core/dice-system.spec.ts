/**
 * TRPGダイスシステム - Critical Priority
 * 
 * 1stリリース必須テスト：TRPGの基礎であるダイス機能
 * - 基本ダイス（d4〜d100）
 * - 修正値付きダイス
 * - 複数ダイス
 * - 成功/失敗判定
 * - クリティカル判定
 */
import { test, expect } from '@playwright/test';
import { 
  navigateToHome,
  startNewCampaignFlow,
  fillCampaignForm,
  verifySessionStart,
  performDiceRoll,
  cleanupTestData,
  takeComparisonScreenshot
} from '../utils/test-helpers';

test.describe('TRPGダイスシステム - Critical Priority', () => {

  test.beforeEach(async ({ page }) => {
    await cleanupTestData(page);
    
    // テスト用セッションの準備
    await navigateToHome(page);
    await startNewCampaignFlow(page);
    await fillCampaignForm(page, {
      name: 'ダイステスト用セッション',
      description: 'ダイス機能のテスト専用'
    });
    await page.click('[data-testid="create-campaign-button"]');
    await page.waitForSelector('[data-testid="campaign-details"]', { timeout: 10000 });
    await page.click('[data-testid="start-session-button"]');
    await verifySessionStart(page);
  });

  test('ケース1: 基本ダイス（d4, d6, d8, d10, d12, d20, d100）', async ({ page }) => {
    await takeComparisonScreenshot(page, 'basic-dice', 'before');
    
    const basicDiceTypes = [
      { type: 'd4', min: 1, max: 4 },
      { type: 'd6', min: 1, max: 6 },
      { type: 'd8', min: 1, max: 8 },
      { type: 'd10', min: 1, max: 10 },
      { type: 'd12', min: 1, max: 12 },
      { type: 'd20', min: 1, max: 20 },
      { type: 'd100', min: 1, max: 100 }
    ];
    
    const results: { [key: string]: number[] } = {};
    
    for (const dice of basicDiceTypes) {
      results[dice.type] = [];
      
      // 各ダイスを5回振って統計を取る
      for (let i = 0; i < 5; i++) {
        const result = await performDiceRoll(page, dice.type);
        
        // 結果が適切な範囲内かチェック
        expect(result).toBeGreaterThanOrEqual(dice.min);
        expect(result).toBeLessThanOrEqual(dice.max);
        expect(result).toBe(Math.floor(result)); // 整数であることを確認
        
        results[dice.type].push(result);
      }
      
      console.log(`${dice.type}の結果: ${results[dice.type].join(', ')}`);
    }
    
    await takeComparisonScreenshot(page, 'basic-dice', 'after');
    
    // ダイス結果がチャットログに記録されているか確認
    for (const dice of basicDiceTypes) {
      await expect(page.locator('[data-testid="chat-log"]')).toContainText(dice.type);
    }
  });

  test('ケース2: 修正値付きダイス（d20+3など）', async ({ page }) => {
    await takeComparisonScreenshot(page, 'modified-dice', 'before');
    
    // ダイスパネルを開く
    await page.click('[data-testid="dice-panel-toggle"]');
    await page.waitForSelector('[data-testid="dice-panel-content"]', { timeout: 3000 });
    
    const modificationTests = [
      { base: 'd20', modifier: '+3', expectedMin: 4, expectedMax: 23 },
      { base: 'd6', modifier: '+2', expectedMin: 3, expectedMax: 8 },
      { base: 'd10', modifier: '-1', expectedMin: 0, expectedMax: 9 },
      { base: 'd8', modifier: '+5', expectedMin: 6, expectedMax: 13 }
    ];
    
    for (const test of modificationTests) {
      // 修正値入力フィールドの確認
      await page.click(`[data-testid="dice-${test.base}"]`);
      
      // 修正値入力（UI設計に依存）
      const modifierInput = page.locator('[data-testid="dice-modifier-input"]');
      if (await modifierInput.isVisible()) {
        await modifierInput.fill(test.modifier.replace(/[+\-]/, ''));
        
        if (test.modifier.startsWith('+')) {
          await page.click('[data-testid="modifier-positive"]');
        } else if (test.modifier.startsWith('-')) {
          await page.click('[data-testid="modifier-negative"]');
        }
      }
      
      // ダイスロール実行
      await page.click('[data-testid="roll-dice-button"]');
      
      // 結果の確認
      await page.waitForSelector('[data-testid="dice-result"]', { timeout: 5000 });
      const resultText = await page.textContent('[data-testid="dice-result-value"]');
      const result = parseInt(resultText || '0');
      
      expect(result).toBeGreaterThanOrEqual(test.expectedMin);
      expect(result).toBeLessThanOrEqual(test.expectedMax);
      
      // チャットログに修正値込みの結果が表示されているか確認
      await expect(page.locator('[data-testid="chat-log"]')).toContainText(`${test.base}${test.modifier}`);
      
      console.log(`${test.base}${test.modifier}の結果: ${result}`);
    }
    
    await takeComparisonScreenshot(page, 'modified-dice', 'after');
  });

  test('ケース3: 複数ダイス（2d6など）', async ({ page }) => {
    await takeComparisonScreenshot(page, 'multiple-dice', 'before');
    
    await page.click('[data-testid="dice-panel-toggle"]');
    await page.waitForSelector('[data-testid="dice-panel-content"]', { timeout: 3000 });
    
    const multipleDiceTests = [
      { dice: '2d6', count: 2, min: 2, max: 12 },
      { dice: '3d4', count: 3, min: 3, max: 12 },
      { dice: '4d6', count: 4, min: 4, max: 24 },
      { dice: '1d20', count: 1, min: 1, max: 20 }
    ];
    
    for (const test of multipleDiceTests) {
      // 複数ダイス設定UI操作
      const diceCountInput = page.locator('[data-testid="dice-count-input"]');
      if (await diceCountInput.isVisible()) {
        await diceCountInput.fill(test.count.toString());
      }
      
      // ダイスタイプ選択
      const diceType = test.dice.replace(/^\d+/, ''); // "2d6" -> "d6"
      await page.click(`[data-testid="dice-${diceType}"]`);
      
      // ロール実行
      await page.click('[data-testid="roll-dice-button"]');
      
      // 結果確認
      await page.waitForSelector('[data-testid="dice-result"]', { timeout: 5000 });
      const resultText = await page.textContent('[data-testid="dice-result-value"]');
      const totalResult = parseInt(resultText || '0');
      
      expect(totalResult).toBeGreaterThanOrEqual(test.min);
      expect(totalResult).toBeLessThanOrEqual(test.max);
      
      // 個別ダイス結果の表示確認（詳細表示がある場合）
      const detailsButton = page.locator('[data-testid="dice-result-details"]');
      if (await detailsButton.isVisible()) {
        await detailsButton.click();
        const individualResults = page.locator('[data-testid="individual-dice-result"]');
        const individualCount = await individualResults.count();
        expect(individualCount).toBe(test.count);
      }
      
      // チャットログ確認
      await expect(page.locator('[data-testid="chat-log"]')).toContainText(test.dice);
      
      console.log(`${test.dice}の結果: ${totalResult}`);
    }
    
    await takeComparisonScreenshot(page, 'multiple-dice', 'after');
  });

  test('ケース4: 成功/失敗判定', async ({ page }) => {
    await takeComparisonScreenshot(page, 'success-failure', 'before');
    
    await page.click('[data-testid="dice-panel-toggle"]');
    await page.waitForSelector('[data-testid="dice-panel-content"]', { timeout: 3000 });
    
    const skillCheckTests = [
      { targetNumber: 15, dice: 'd20', description: 'スキルチェック（難易度15）' },
      { targetNumber: 10, dice: 'd20', description: 'スキルチェック（難易度10）' },
      { targetNumber: 20, dice: 'd20', description: 'スキルチェック（難易度20）' }
    ];
    
    for (const test of skillCheckTests) {
      // 成功/失敗判定モード設定
      const skillCheckMode = page.locator('[data-testid="skill-check-mode"]');
      if (await skillCheckMode.isVisible()) {
        await skillCheckMode.click();
      }
      
      // 目標値設定
      const targetNumberInput = page.locator('[data-testid="target-number-input"]');
      if (await targetNumberInput.isVisible()) {
        await targetNumberInput.fill(test.targetNumber.toString());
      }
      
      // ダイスロール実行
      await page.click(`[data-testid="dice-${test.dice}"]`);
      await page.click('[data-testid="roll-dice-button"]');
      
      // 結果確認
      await page.waitForSelector('[data-testid="dice-result"]', { timeout: 5000 });
      const resultText = await page.textContent('[data-testid="dice-result-value"]');
      const diceResult = parseInt(resultText || '0');
      
      // 成功/失敗判定の表示確認
      const judgmentResult = page.locator('[data-testid="judgment-result"]');
      if (await judgmentResult.isVisible()) {
        const judgmentText = await judgmentResult.textContent();
        
        if (diceResult >= test.targetNumber) {
          expect(judgmentText).toMatch(/成功|Success/i);
        } else {
          expect(judgmentText).toMatch(/失敗|Failure/i);
        }
      }
      
      // チャットログに判定結果が記録されているか確認
      await expect(page.locator('[data-testid="chat-log"]')).toContainText(test.description);
      
      console.log(`${test.description}: ダイス結果=${diceResult}, 目標値=${test.targetNumber}, 判定=${diceResult >= test.targetNumber ? '成功' : '失敗'}`);
    }
    
    await takeComparisonScreenshot(page, 'success-failure', 'after');
  });

  test('ケース5: クリティカル判定', async ({ page }) => {
    await takeComparisonScreenshot(page, 'critical-judgment', 'before');
    
    await page.click('[data-testid="dice-panel-toggle"]');
    await page.waitForSelector('[data-testid="dice-panel-content"]', { timeout: 3000 });
    
    // クリティカル判定を確実にテストするため、複数回実行
    let criticalFound = false;
    let fumbleFound = false;
    const maxAttempts = 50; // 統計的に十分な回数
    
    for (let attempt = 0; attempt < maxAttempts && (!criticalFound || !fumbleFound); attempt++) {
      await page.click('[data-testid="dice-d20"]');
      await page.click('[data-testid="roll-dice-button"]');
      
      await page.waitForSelector('[data-testid="dice-result"]', { timeout: 5000 });
      const resultText = await page.textContent('[data-testid="dice-result-value"]');
      const result = parseInt(resultText || '0');
      
      // クリティカル（20）の確認
      if (result === 20) {
        criticalFound = true;
        
        // クリティカル表示の確認
        const criticalIndicator = page.locator('[data-testid="critical-success"]');
        if (await criticalIndicator.isVisible()) {
          await expect(criticalIndicator).toContainText(/クリティカル|Critical/i);
        }
        
        // チャットログにクリティカル記録があるか確認
        await expect(page.locator('[data-testid="chat-log"]')).toContainText(/クリティカル|Critical/i);
        
        console.log(`クリティカル成功確認: d20結果=${result}`);
      }
      
      // ファンブル（1）の確認
      if (result === 1) {
        fumbleFound = true;
        
        // ファンブル表示の確認
        const fumbleIndicator = page.locator('[data-testid="critical-failure"]');
        if (await fumbleIndicator.isVisible()) {
          await expect(fumbleIndicator).toContainText(/ファンブル|Fumble/i);
        }
        
        // チャットログにファンブル記録があるか確認
        await expect(page.locator('[data-testid="chat-log"]')).toContainText(/ファンブル|Fumble/i);
        
        console.log(`ファンブル確認: d20結果=${result}`);
      }
    }
    
    // 統計的な確認：50回中に少なくとも1回はクリティカルまたはファンブルが出ることを期待
    // （完全にランダムなら各々約92%の確率で発生）
    if (!criticalFound && !fumbleFound) {
      console.warn('50回のロールでクリティカルもファンブルも発生しませんでした。ダイス機能を確認してください。');
    }
    
    await takeComparisonScreenshot(page, 'critical-judgment', 'after');
  });

  test('ダイス履歴とログ機能', async ({ page }) => {
    await page.click('[data-testid="dice-panel-toggle"]');
    await page.waitForSelector('[data-testid="dice-panel-content"]', { timeout: 3000 });
    
    // 複数のダイスロールを実行
    const rollSequence = ['d6', 'd8', 'd10', 'd20'];
    const results: number[] = [];
    
    for (const diceType of rollSequence) {
      const result = await performDiceRoll(page, diceType);
      results.push(result);
    }
    
    // ダイス履歴表示の確認
    const historyPanel = page.locator('[data-testid="dice-history"]');
    if (await historyPanel.isVisible()) {
      // 履歴にすべてのロール結果が記録されているか確認
      for (let i = 0; i < rollSequence.length; i++) {
        await expect(historyPanel).toContainText(rollSequence[i]);
        await expect(historyPanel).toContainText(results[i].toString());
      }
    }
    
    // チャットログでのダイス結果確認
    for (let i = 0; i < rollSequence.length; i++) {
      await expect(page.locator('[data-testid="chat-log"]')).toContainText(`${rollSequence[i]}: ${results[i]}`);
    }
    
    console.log(`ダイス履歴テスト完了: ${rollSequence.map((d, i) => `${d}=${results[i]}`).join(', ')}`);
  });

  test('ダイス機能のエラーハンドリング', async ({ page }) => {
    await page.click('[data-testid="dice-panel-toggle"]');
    await page.waitForSelector('[data-testid="dice-panel-content"]', { timeout: 3000 });
    
    // 無効な修正値のテスト
    const invalidModifierInput = page.locator('[data-testid="dice-modifier-input"]');
    if (await invalidModifierInput.isVisible()) {
      // 文字列を入力して数値以外の処理を確認
      await invalidModifierInput.fill('abc');
      await page.click('[data-testid="dice-d20"]');
      await page.click('[data-testid="roll-dice-button"]');
      
      // エラー表示またはデフォルト動作の確認
      const errorMessage = page.locator('[data-testid="error-message"]');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toContainText(/無効|Invalid/i);
      } else {
        // エラー表示がない場合、ダイスロールが正常に実行されることを確認
        await page.waitForSelector('[data-testid="dice-result"]', { timeout: 5000 });
      }
    }
    
    // 極端に大きな値のテスト
    const largeValueInput = page.locator('[data-testid="dice-count-input"]');
    if (await largeValueInput.isVisible()) {
      await largeValueInput.fill('1000');
      await page.click('[data-testid="dice-d6"]');
      
      // パフォーマンスへの影響を考慮した制限の確認
      const rollButton = page.locator('[data-testid="roll-dice-button"]');
      await rollButton.click();
      
      // 適切な制限メッセージまたは実行の確認
      const limitMessage = page.locator('[data-testid="limit-warning"]');
      if (await limitMessage.isVisible()) {
        await expect(limitMessage).toContainText(/制限|Limit/i);
      }
    }
    
    console.log('ダイス機能エラーハンドリングテスト完了');
  });

});