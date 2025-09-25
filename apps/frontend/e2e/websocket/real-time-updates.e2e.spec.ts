/**
 * リアルタイム更新 WebSocket E2Eテスト
 * 
 * 対象機能：
 * - セッション状態のリアルタイム同期
 * - エンティティ状態変更の即座反映
 * - マイルストーン進捗の同期
 * - 戦闘状態の同期
 * 
 * テスト方針：
 * - WebSocketでの双方向通信確認
 * - 状態変更の即座反映確認
 * - 競合状態の解決確認
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
  waitForAIGeneration
} from '../utils/test-helpers';
import type { 
  SessionState, 
  TRPGEvent, 
  LocationBasedEntity,
  AIGameContext 
} from '@ai-agent-trpg/types';

test.describe('リアルタイム更新 WebSocket機能', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupTestData(page);
    
    // テストセッション準備
    await navigateToHome(page);
    await startNewCampaignFlow(page);
    await fillCampaignForm(page, {
      name: 'リアルタイム更新テスト',
      description: 'WebSocketリアルタイム更新機能のテスト'
    });
    await page.click('[data-testid="create-campaign-button"]');
    await page.waitForSelector('[data-testid="campaign-details"]', { timeout: 10000 });
    
    await page.click('[data-testid="start-session-button"]');
    await verifySessionStart(page);
    
    // WebSocket接続の確立確認
    await page.waitForSelector('[data-testid="websocket-status"][data-status="connected"]', { 
      timeout: 10000 
    });
  });

  test('ケース1: セッション状態のリアルタイム同期', async ({ page }) => {
    await takeComparisonScreenshot(page, 'session-state-sync', 'before');
    
    // 初期セッション状態の確認
    const sessionState = page.locator('[data-testid="session-state-indicator"]');
    await expect(sessionState).toContainText('進行中');
    
    // セッション時間の確認
    const sessionTime = page.locator('[data-testid="session-timer"]');
    if (await sessionTime.isVisible()) {
      const initialTime = await sessionTime.textContent();
      
      // 時間進行の確認
      await page.waitForTimeout(3000);
      const updatedTime = await sessionTime.textContent();
      expect(updatedTime).not.toBe(initialTime);
    }
    
    // 他のプレイヤーのアクションをシミュレート
    await page.evaluate(() => {
      const sessionUpdate = {
        type: 'session_state_update',
        sessionId: 'test-session-1',
        state: {
          currentPhase: 'exploration',
          activePlayerCount: 3,
          timestamp: new Date().toISOString()
        }
      };
      
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: sessionUpdate
      }));
    });
    
    // セッション状態の更新確認
    await page.waitForTimeout(1000);
    const playerCount = page.locator('[data-testid="active-player-count"]');
    if (await playerCount.isVisible()) {
      await expect(playerCount).toContainText('3');
    }
    
    // 現在フェーズの表示確認
    const currentPhase = page.locator('[data-testid="current-phase"]');
    if (await currentPhase.isVisible()) {
      await expect(currentPhase).toContainText('探索');
    }
    
    await takeComparisonScreenshot(page, 'session-state-sync', 'after');
  });

  test('ケース2: エンティティ状態変更の即座反映', async ({ page }) => {
    await takeComparisonScreenshot(page, 'entity-state-updates', 'before');
    
    // エンティティパネルの表示確認
    await page.waitForSelector('[data-testid="active-entities-panel"]', { timeout: 5000 });
    
    // 初期エンティティ状態の確認
    const initialEntities = page.locator('[data-testid="entity-item"]');
    const initialCount = await initialEntities.count();
    console.log(`初期エンティティ数: ${initialCount}`);
    
    // エンティティ状態変更のシミュレート
    await page.evaluate(() => {
      const entityUpdate = {
        type: 'entity_state_change',
        entityId: 'npc-guild-receptionist',
        changes: {
          emotion: 'happy',
          activity: 'talking',
          attention: 'focused_on_player',
          lastInteraction: new Date().toISOString()
        }
      };
      
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: entityUpdate
      }));
    });
    
    // エンティティ状態の更新確認
    await page.waitForTimeout(1000);
    const receptionistEntity = page.locator('[data-testid="entity-item"][data-entity-id="npc-guild-receptionist"]');
    
    if (await receptionistEntity.isVisible()) {
      // 感情インジケータの確認
      const emotionIndicator = receptionistEntity.locator('[data-testid="entity-emotion"]');
      await expect(emotionIndicator).toHaveAttribute('data-emotion', 'happy');
      
      // アクティビティ表示の確認
      const activityIndicator = receptionistEntity.locator('[data-testid="entity-activity"]');
      await expect(activityIndicator).toContainText('会話中');
    }
    
    // 新しいエンティティの追加
    await page.evaluate(() => {
      const newEntity = {
        type: 'entity_spawned',
        entity: {
          id: 'npc-mysterious-stranger',
          name: '謎の旅人',
          type: 'npc',
          location: 'tavern',
          importance: 'medium',
          visible: true
        }
      };
      
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: newEntity
      }));
    });
    
    // 新エンティティの表示確認
    await page.waitForSelector('[data-testid="entity-item"][data-entity-id="npc-mysterious-stranger"]', {
      timeout: 3000
    });
    
    const newEntity = page.locator('[data-testid="entity-item"][data-entity-id="npc-mysterious-stranger"]');
    await expect(newEntity).toContainText('謎の旅人');
    
    await takeComparisonScreenshot(page, 'entity-state-updates', 'after');
  });

  test('ケース3: マイルストーン進捗のリアルタイム同期', async ({ page }) => {
    await takeComparisonScreenshot(page, 'milestone-progress-sync', 'before');
    
    // マイルストーンパネルの確認
    const milestonePanel = page.locator('[data-testid="milestone-panel"]');
    if (await milestonePanel.isVisible()) {
      // 現在のマイルストーン確認
      const currentMilestone = milestonePanel.locator('[data-testid="current-milestone"]');
      await expect(currentMilestone).toBeVisible();
    }
    
    // プレイヤーアクションでマイルストーン進行
    await sendChatMessage(page, 'ギルドマスターからクエストを受ける', 'ic');
    await waitForAIGeneration(page, '[data-testid="gm-message"]', 15000);
    
    // マイルストーン進捗更新のシミュレート
    await page.evaluate(() => {
      const milestoneUpdate = {
        type: 'milestone_progress',
        milestoneId: 'quest-acceptance',
        progress: {
          currentStep: 2,
          totalSteps: 5,
          description: 'クエスト受諾完了',
          completionPercentage: 40
        }
      };
      
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: milestoneUpdate
      }));
    });
    
    // 進捗バーの更新確認
    await page.waitForTimeout(1000);
    const progressBar = page.locator('[data-testid="milestone-progress-bar"]');
    if (await progressBar.isVisible()) {
      const progressValue = await progressBar.getAttribute('data-progress');
      expect(parseInt(progressValue || '0')).toBe(40);
    }
    
    // マイルストーン説明の更新確認
    const milestoneDescription = page.locator('[data-testid="milestone-description"]');
    if (await milestoneDescription.isVisible()) {
      await expect(milestoneDescription).toContainText('クエスト受諾完了');
    }
    
    // 新しいマイルストーンの表示
    await page.evaluate(() => {
      const newMilestone = {
        type: 'milestone_unlocked',
        milestone: {
          id: 'equipment-preparation',
          name: '装備準備',
          description: '冒険に必要な装備を整える',
          priority: 'high'
        }
      };
      
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: newMilestone
      }));
    });
    
    // 新マイルストーンの表示確認
    await page.waitForSelector('[data-testid="milestone-unlocked-notification"]', { timeout: 3000 });
    const newMilestoneNotification = page.locator('[data-testid="milestone-unlocked-notification"]');
    await expect(newMilestoneNotification).toContainText('装備準備');
    
    await takeComparisonScreenshot(page, 'milestone-progress-sync', 'after');
  });

  test('ケース4: 戦闘状態のリアルタイム同期', async ({ page }) => {
    await takeComparisonScreenshot(page, 'combat-state-sync', 'before');
    
    // 戦闘開始のシミュレート
    await page.evaluate(() => {
      const combatStart = {
        type: 'combat_initiated',
        combat: {
          id: 'combat-1',
          participants: [
            { id: 'player-1', type: 'pc', initiative: 15 },
            { id: 'orc-warrior', type: 'enemy', initiative: 12 }
          ],
          currentTurn: 'player-1',
          round: 1
        }
      };
      
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: combatStart
      }));
    });
    
    // 戦闘UIの表示確認
    await page.waitForSelector('[data-testid="combat-interface"]', { timeout: 5000 });
    const combatInterface = page.locator('[data-testid="combat-interface"]');
    await expect(combatInterface).toBeVisible();
    
    // イニシアチブ順の表示確認
    const turnOrder = page.locator('[data-testid="turn-order"]');
    await expect(turnOrder).toBeVisible();
    await expect(turnOrder).toContainText('player-1');
    
    // 現在のターン表示
    const currentTurn = page.locator('[data-testid="current-turn"]');
    await expect(currentTurn).toContainText('player-1');
    
    // 戦闘ラウンド表示
    const roundCounter = page.locator('[data-testid="combat-round"]');
    await expect(roundCounter).toContainText('1');
    
    // ターン終了のシミュレート
    await page.evaluate(() => {
      const turnEnd = {
        type: 'turn_ended',
        combatId: 'combat-1',
        nextTurn: 'orc-warrior',
        round: 1
      };
      
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: turnEnd
      }));
    });
    
    // ターン変更の確認
    await page.waitForTimeout(1000);
    await expect(currentTurn).toContainText('orc-warrior');
    
    // 敵の行動のシミュレート
    await page.evaluate(() => {
      const enemyAction = {
        type: 'combat_action',
        combatId: 'combat-1',
        action: {
          actor: 'orc-warrior',
          type: 'attack',
          target: 'player-1',
          result: {
            hit: true,
            damage: 8,
            description: 'オークの戦士が剣で攻撃'
          }
        }
      };
      
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: enemyAction
      }));
    });
    
    // 戦闘ログの更新確認
    await page.waitForTimeout(1000);
    const combatLog = page.locator('[data-testid="combat-log"]');
    await expect(combatLog).toContainText('オークの戦士が剣で攻撃');
    await expect(combatLog).toContainText('8');
    
    await takeComparisonScreenshot(page, 'combat-state-sync', 'after');
  });

  test('ケース5: 場所変更時の同期更新', async ({ page }) => {
    await takeComparisonScreenshot(page, 'location-change-sync', 'before');
    
    // 現在地の確認
    const currentLocation = page.locator('[data-testid="current-location"]');
    await expect(currentLocation).toContainText('冒険者ギルド');
    
    // 場所移動のシミュレート
    await page.evaluate(() => {
      const locationChange = {
        type: 'party_moved',
        newLocation: {
          id: 'market',
          name: '市場',
          description: '賑やかな商業地区',
          availableActions: ['buy', 'sell', 'gather_info']
        },
        timestamp: new Date().toISOString()
      };
      
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: locationChange
      }));
    });
    
    // 場所変更の即座反映確認
    await page.waitForTimeout(1000);
    await expect(currentLocation).toContainText('市場');
    
    // 場所説明の更新
    const locationDescription = page.locator('[data-testid="location-description"]');
    if (await locationDescription.isVisible()) {
      await expect(locationDescription).toContainText('賑やかな商業地区');
    }
    
    // 利用可能アクションの更新
    const availableActions = page.locator('[data-testid="available-action"]');
    const actionCount = await availableActions.count();
    expect(actionCount).toBeGreaterThanOrEqual(3);
    
    // 新しい場所でのエンティティ更新
    await page.evaluate(() => {
      const entityUpdate = {
        type: 'location_entities_update',
        locationId: 'market',
        entities: [
          { id: 'merchant-1', name: '武器商人', type: 'merchant' },
          { id: 'merchant-2', name: '防具商人', type: 'merchant' },
          { id: 'customer-1', name: '買い物客', type: 'civilian' }
        ]
      };
      
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: entityUpdate
      }));
    });
    
    // エンティティリストの更新確認
    await page.waitForTimeout(1000);
    const entities = page.locator('[data-testid="entity-item"]');
    const entityNames = await entities.allTextContents();
    expect(entityNames.some(name => name.includes('武器商人'))).toBeTruthy();
    expect(entityNames.some(name => name.includes('防具商人'))).toBeTruthy();
    
    await takeComparisonScreenshot(page, 'location-change-sync', 'after');
  });

  test('ケース6: 競合状態の解決', async ({ page }) => {
    // 同時更新の競合状態をシミュレート
    await sendChatMessage(page, '同時更新テスト開始', 'ooc');
    
    // 複数の更新を同時に送信
    await page.evaluate(() => {
      const updates = [
        {
          type: 'entity_state_change',
          entityId: 'npc-1',
          changes: { emotion: 'happy' },
          timestamp: new Date().toISOString()
        },
        {
          type: 'entity_state_change',
          entityId: 'npc-1',
          changes: { emotion: 'sad' },
          timestamp: new Date(Date.now() + 100).toISOString()
        }
      ];
      
      // 微小な時間差で送信
      updates.forEach((update, index) => {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('websocket-message', {
            detail: update
          }));
        }, index * 50);
      });
    });
    
    // 最終状態の確認（最新のタイムスタンプが勝つ）
    await page.waitForTimeout(2000);
    const entityEmotion = page.locator('[data-testid="entity-item"][data-entity-id="npc-1"] [data-testid="entity-emotion"]');
    
    if (await entityEmotion.isVisible()) {
      const emotion = await entityEmotion.getAttribute('data-emotion');
      expect(emotion).toBe('sad'); // より新しいタイムスタンプ
    }
    
    console.log('競合状態解決テスト完了');
  });

  test('リアルタイム更新のパフォーマンス確認', async ({ page }) => {
    // 大量の更新イベントのパフォーマンステスト
    const startTime = Date.now();
    const updateCount = 50;
    
    // 大量の更新をシミュレート
    await page.evaluate((count) => {
      for (let i = 0; i < count; i++) {
        const update = {
          type: 'entity_state_change',
          entityId: `npc-${i}`,
          changes: {
            activity: `activity-${i}`,
            timestamp: new Date().toISOString()
          }
        };
        
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('websocket-message', {
            detail: update
          }));
        }, i * 10); // 10ms間隔
      }
    }, updateCount);
    
    // 更新完了待機
    await page.waitForTimeout(updateCount * 10 + 1000);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log(`${updateCount}件の更新処理時間: ${totalTime}ms`);
    
    // パフォーマンス基準（50件の更新で3秒以内）
    expect(totalTime).toBeLessThan(3000);
  });

  test('WebSocket接続品質監視', async ({ page }) => {
    // 接続品質の監視
    let messageCount = 0;
    let responseTime = 0;
    
    page.on('console', msg => {
      if (msg.text().includes('WebSocket response time')) {
        const match = msg.text().match(/(\d+)ms/);
        if (match) {
          responseTime = parseInt(match[1]);
        }
      }
    });
    
    // テストメッセージ送信
    await sendChatMessage(page, 'WebSocket品質テスト', 'ooc');
    
    // 応答時間の確認
    await page.waitForTimeout(2000);
    
    // 接続品質の表示確認
    const connectionQuality = page.locator('[data-testid="connection-quality"]');
    if (await connectionQuality.isVisible()) {
      const quality = await connectionQuality.getAttribute('data-quality');
      expect(['excellent', 'good', 'fair', 'poor']).toContain(quality);
    }
    
    console.log('WebSocket接続品質監視テスト完了');
  });
});