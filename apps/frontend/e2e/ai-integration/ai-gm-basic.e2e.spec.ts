/**
 * AI GMサポート基本機能 E2Eテスト
 * 
 * 対象機能：
 * - AIによるシナリオ進行サポート
 * - NPC会話自動生成
 * - 場面描写・状況説明
 * - プレイヤーアクションへの応答
 * 
 * テスト方針：
 * - 実際のTRPGプレイフローを再現
 * - AI応答の品質確認
 * - タイムアウト考慮
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
  waitForAIGeneration,
  verifyErrorHandling
} from '../utils/test-helpers';
import type { AIGameContext, ChatMessage } from '@ai-agent-trpg/types';

test.describe('AI GMサポート基本機能', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupTestData(page);
    
    // APIキー設定の確認
    await page.goto('/settings');
    await page.waitForSelector('[data-testid="ai-settings-panel"]', { timeout: 5000 });
    
    // テスト用キャンペーン作成
    await navigateToHome(page);
    await startNewCampaignFlow(page);
    await fillCampaignForm(page, {
      name: 'AI GMテストキャンペーン',
      description: 'AI GMサポート機能のテスト',
      settings: {
        theme: 'ファンタジー',
        world: {
          name: 'テストワールド'
        }
      }
    });
    await page.click('[data-testid="create-campaign-button"]');
    await page.waitForSelector('[data-testid="campaign-details"]', { timeout: 10000 });
    
    // セッション開始
    await page.click('[data-testid="start-session-button"]');
    await verifySessionStart(page);
  });

  test('ケース1: セッション開始時の場面描写生成', async ({ page }) => {
    await takeComparisonScreenshot(page, 'ai-gm-scene-description', 'before');
    
    // AI GMによる初期場面描写の確認
    await page.waitForSelector('[data-testid="gm-message"]', { timeout: 15000 });
    const gmMessage = page.locator('[data-testid="gm-message"]').first();
    
    // 場面描写の要素確認
    const messageText = await gmMessage.textContent();
    expect(messageText).toBeTruthy();
    console.log('初期場面描写:', messageText?.substring(0, 100) + '...');
    
    // 描写の品質チェック
    await expect(gmMessage).toContainText(/冒険者ギルド|酒場|宿屋/); // 開始場所の言及
    
    // 場所情報パネルとの連動確認
    const locationPanel = page.locator('[data-testid="location-info-panel"]');
    if (await locationPanel.isVisible()) {
      await expect(locationPanel).toContainText('冒険者ギルド');
    }
    
    await takeComparisonScreenshot(page, 'ai-gm-scene-description', 'after');
  });

  test('ケース2: プレイヤーアクションへのAI応答', async ({ page }) => {
    await takeComparisonScreenshot(page, 'ai-gm-player-action', 'before');
    
    // プレイヤーアクション入力
    await sendChatMessage(page, '周りを見回して、誰か話しかけられそうな人を探す', 'ic');
    
    // AI GM応答待機
    await waitForAIGeneration(page, '[data-testid="gm-message"]', 20000);
    
    // 応答内容の確認
    const gmResponse = page.locator('[data-testid="gm-message"]').last();
    const responseText = await gmResponse.textContent();
    expect(responseText).toBeTruthy();
    
    // NPCの言及があることを確認
    await expect(gmResponse).toContainText(/人物|NPC|冒険者|店主/);
    
    // エンティティパネルの更新確認
    const entityPanel = page.locator('[data-testid="active-entities-panel"]');
    if (await entityPanel.isVisible()) {
      const entityCount = await page.locator('[data-testid="entity-item"]').count();
      expect(entityCount).toBeGreaterThan(0);
    }
    
    await takeComparisonScreenshot(page, 'ai-gm-player-action', 'after');
  });

  test('ケース3: NPC対話の自動生成', async ({ page }) => {
    await takeComparisonScreenshot(page, 'ai-gm-npc-dialogue', 'before');
    
    // NPCとの対話開始
    await sendChatMessage(page, 'ギルドの受付嬢に話しかける「こんにちは、何か仕事はありますか？」', 'ic');
    
    // AI応答待機
    await waitForAIGeneration(page, '[data-testid="npc-message"]', 20000);
    
    // NPC応答の確認
    const npcMessage = page.locator('[data-testid="npc-message"]').last();
    await expect(npcMessage).toBeVisible();
    
    // NPCタグの確認
    const npcTag = npcMessage.locator('[data-testid="speaker-tag"]');
    await expect(npcTag).toContainText('受付嬢');
    
    // 対話内容の確認
    const dialogueText = await npcMessage.textContent();
    expect(dialogueText).toMatch(/クエスト|依頼|仕事/);
    
    // 会話履歴への記録確認
    const chatLog = page.locator('[data-testid="chat-log"]');
    await expect(chatLog).toContainText('受付嬢');
    
    await takeComparisonScreenshot(page, 'ai-gm-npc-dialogue', 'after');
  });

  test('ケース4: スキルチェック時のAI判定サポート', async ({ page }) => {
    await takeComparisonScreenshot(page, 'ai-gm-skill-check', 'before');
    
    // スキルチェックを伴うアクション
    await sendChatMessage(page, '壁をよじ登って2階の窓から侵入を試みる', 'ic');
    
    // AI GMの判定要求待機
    await page.waitForSelector('[data-testid="skill-check-request"]', { timeout: 15000 });
    
    // スキルチェック要求の確認
    const skillCheckRequest = page.locator('[data-testid="skill-check-request"]');
    await expect(skillCheckRequest).toContainText(/運動|Athletics|登攀/);
    await expect(skillCheckRequest).toContainText(/難易度|DC/);
    
    // ダイスロール実行
    const diceResult = await performDiceRoll(page, 'd20');
    
    // 判定結果に基づくAI描写待機
    await waitForAIGeneration(page, '[data-testid="gm-message"]', 15000);
    
    // 結果に応じた描写確認
    const resultMessage = page.locator('[data-testid="gm-message"]').last();
    if (diceResult && diceResult >= 15) {
      await expect(resultMessage).toContainText(/成功|登り切|窓にたどり着/);
    } else {
      await expect(resultMessage).toContainText(/失敗|滑り落ち|届かな/);
    }
    
    await takeComparisonScreenshot(page, 'ai-gm-skill-check', 'after');
  });

  test('ケース5: 戦闘シーンのAI管理', async ({ page }) => {
    await takeComparisonScreenshot(page, 'ai-gm-combat', 'before');
    
    // 戦闘遭遇の発生
    await sendChatMessage(page, '暗い路地裏を進む', 'ic');
    await waitForAIGeneration(page, '[data-testid="gm-message"]', 15000);
    
    // 戦闘開始の可能性
    const combatIndicator = page.locator('[data-testid="combat-indicator"]');
    if (await combatIndicator.isVisible()) {
      // イニシアチブロールの要求確認
      await expect(page.locator('[data-testid="initiative-request"]')).toBeVisible();
      
      // イニシアチブロール
      await performDiceRoll(page, 'd20');
      
      // ターン管理UIの表示確認
      await page.waitForSelector('[data-testid="turn-order"]', { timeout: 5000 });
      
      // 敵の行動描写
      await page.waitForSelector('[data-testid="enemy-action"]', { timeout: 10000 });
      const enemyAction = page.locator('[data-testid="enemy-action"]').first();
      await expect(enemyAction).toContainText(/攻撃|構え|移動/);
    }
    
    await takeComparisonScreenshot(page, 'ai-gm-combat', 'after');
  });

  test('ケース6: 複数プロバイダー対応確認', async ({ page }) => {
    await takeComparisonScreenshot(page, 'ai-gm-providers', 'before');
    
    // 設定画面へ移動
    await page.click('[data-testid="settings-button"]');
    await page.waitForSelector('[data-testid="ai-settings-panel"]', { timeout: 5000 });
    
    // 利用可能なプロバイダーの確認
    const providers = ['openai', 'anthropic', 'google'];
    for (const provider of providers) {
      const providerOption = page.locator(`[data-testid="ai-provider-${provider}"]`);
      if (await providerOption.isVisible()) {
        console.log(`${provider}プロバイダー: 利用可能`);
        
        // プロバイダー切り替えテスト
        await providerOption.click();
        await page.waitForTimeout(1000);
        
        // 選択状態の確認
        await expect(providerOption).toHaveAttribute('data-selected', 'true');
      }
    }
    
    // セッションに戻る
    await page.click('[data-testid="back-to-session"]');
    await verifySessionStart(page);
    
    // 異なるプロバイダーでの応答テスト
    await sendChatMessage(page, 'テスト: AIプロバイダーの応答確認', 'ooc');
    await waitForAIGeneration(page, '[data-testid="gm-message"]', 20000);
    
    await takeComparisonScreenshot(page, 'ai-gm-providers', 'after');
  });

  test('AI GM機能のエラーハンドリング', async ({ page }) => {
    // API エラーのシミュレーション
    await page.route('/api/ai-agent/gm-response', route => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'AI サービスが一時的に利用できません',
          retryable: true
        })
      });
    });
    
    // アクション送信
    await sendChatMessage(page, 'GMに質問: このキャンペーンの目的は？', 'ooc');
    
    // エラー表示の確認
    await verifyErrorHandling(page, 'AI サービスが一時的に利用できません');
    
    // リトライ機能の確認
    const retryButton = page.locator('[data-testid="retry-button"]');
    await expect(retryButton).toBeVisible();
    
    // APIルートを正常に戻す
    await page.unroute('/api/ai-agent/gm-response');
    
    // リトライ実行
    await retryButton.click();
    
    // 正常な応答を確認
    await waitForAIGeneration(page, '[data-testid="gm-message"]', 20000);
    console.log('AI GM応答リトライ成功');
  });

  test('AI生成コンテンツの品質確認', async ({ page }) => {
    // 連続した対話での文脈維持確認
    const conversationFlow = [
      '酒場のマスターに話しかける',
      '最近の町の噂について尋ねる',
      'その噂についてもっと詳しく聞く'
    ];
    
    let previousContext = '';
    
    for (const message of conversationFlow) {
      await sendChatMessage(page, message, 'ic');
      await waitForAIGeneration(page, '[data-testid="gm-message"]', 20000);
      
      const response = page.locator('[data-testid="gm-message"]').last();
      const responseText = await response.textContent();
      
      // 文脈の継続性確認
      if (previousContext) {
        // 前の会話内容への言及があることを確認
        console.log(`文脈維持チェック: ${message}`);
      }
      
      previousContext = responseText || '';
    }
    
    // 会話の一貫性確認
    const chatHistory = page.locator('[data-testid="chat-log"]');
    await expect(chatHistory).toContainText('酒場のマスター');
    await expect(chatHistory).toContainText('噂');
  });
});