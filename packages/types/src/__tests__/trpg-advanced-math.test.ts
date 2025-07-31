/**
 * 高度なTRPG数学ユーティリティの包括的テスト
 * Advanced TRPG Mathematical Utilities Comprehensive Tests
 * 
 * テスト対象:
 * - 確率分布計算と統計分析
 * - 高度なダメージ計算と分析
 * - エンカウンターバランシング
 * - 戦闘シミュレーション
 * - パーティ能力評価
 */

import type { BaseStats, DerivedStats } from '../index';
import {
  calculateDiceDistribution,
  analyzeDamageFormula,
  evaluatePartyCombatCapability,
  calculateEncounterDifficulty,
  simulateCombat,
  type ProbabilityDistribution,
  type DamageAnalysis,
  type EncounterRating
} from '../utils/trpg-advanced-math';

// ==========================================
// テストデータファクトリー
// ==========================================

function createTestPartyMember(overrides: Partial<{
  stats: BaseStats;
  derivedStats: DerivedStats;
  level: number;
}> = {}) {
  return {
    stats: {
      strength: 14,
      dexterity: 12,
      constitution: 13,
      intelligence: 10,
      wisdom: 11,
      charisma: 8,
      ...overrides.stats
    },
    derivedStats: {
      hitPoints: 25,
      maxHitPoints: 25,
      magicPoints: 0,
      maxMagicPoints: 0,
      armorClass: 15,
      initiative: 1,
      speed: 30,
      ...overrides.derivedStats
    },
    level: 3,
    ...overrides
  };
}

function createTestEnemy(overrides: Partial<{
  challengeRating: number;
  hitPoints: number;
  armorClass: number;
  damagePerRound: number;
  specialAbilities: number;
}> = {}) {
  return {
    challengeRating: 2,
    hitPoints: 45,
    armorClass: 14,
    damagePerRound: 8,
    specialAbilities: 1,
    ...overrides
  };
}

// ==========================================
// テストスイート
// ==========================================

describe('高度なTRPG数学ユーティリティの包括的テスト', () => {

  describe('確率分布計算', () => {
    test('1d6の分布計算が正確である', () => {
      const distribution = calculateDiceDistribution(1, 6, 0);
      
      expect(distribution.mean).toBeCloseTo(3.5, 2);
      expect(distribution.variance).toBeCloseTo(2.92, 2);
      expect(distribution.standardDeviation).toBeCloseTo(1.71, 2);
      
      // 各結果の確率が1/6であることを確認
      for (let i = 1; i <= 6; i++) {
        expect(distribution.outcomes.get(i)).toBeCloseTo(1/6, 3);
      }
      
      expect(distribution.percentiles.p50).toBe(3.5); // 中央値は3.5の近似
    });

    test('2d6の分布計算が正確である', () => {
      const distribution = calculateDiceDistribution(2, 6, 0);
      
      expect(distribution.mean).toBeCloseTo(7, 2);
      expect(distribution.variance).toBeCloseTo(5.83, 2);
      
      // 7が最も高い確率を持つことを確認
      const prob7 = distribution.outcomes.get(7);
      expect(prob7).toBeCloseTo(6/36, 3); // 6/36 = 1/6
      
      // 2と12が最も低い確率を持つことを確認
      expect(distribution.outcomes.get(2)).toBeCloseTo(1/36, 3);
      expect(distribution.outcomes.get(12)).toBeCloseTo(1/36, 3);
    });

    test('修正値付きダイスの分布計算', () => {
      const distribution = calculateDiceDistribution(1, 20, 5);
      
      expect(distribution.mean).toBeCloseTo(15.5, 2); // 10.5 + 5
      
      // 最小値と最大値の確認
      const outcomes = Array.from(distribution.outcomes.keys());
      expect(Math.min(...outcomes)).toBe(6); // 1 + 5
      expect(Math.max(...outcomes)).toBe(25); // 20 + 5
    });

    test('複数ダイスの分布計算', () => {
      const distribution = calculateDiceDistribution(3, 8, 2);
      
      expect(distribution.mean).toBeCloseTo(15.5, 2); // 3 * 4.5 + 2
      
      // パーセンタイルの妥当性確認
      expect(distribution.percentiles.p5).toBeLessThan(distribution.percentiles.p25);
      expect(distribution.percentiles.p25).toBeLessThan(distribution.percentiles.p50);
      expect(distribution.percentiles.p50).toBeLessThan(distribution.percentiles.p75);
      expect(distribution.percentiles.p75).toBeLessThan(distribution.percentiles.p95);
    });

    test('エッジケース: 1d1の処理', () => {
      const distribution = calculateDiceDistribution(1, 1, 0);
      
      expect(distribution.mean).toBe(1);
      expect(distribution.variance).toBe(0);
      expect(distribution.standardDeviation).toBe(0);
      expect(distribution.outcomes.get(1)).toBe(1);
    });

    test('確率の合計が1になることを確認', () => {
      const distribution = calculateDiceDistribution(2, 10, 3);
      
      let totalProbability = 0;
      for (const probability of distribution.outcomes.values()) {
        totalProbability += probability;
      }
      
      expect(totalProbability).toBeCloseTo(1, 6);
    });
  });

  describe('ダメージ分析', () => {
    test('基本的なダメージ分析', () => {
      const analysis = analyzeDamageFormula(
        '1d8+3',
        5, // 攻撃ボーナス
        15, // 目標AC
        'none',
        20
      );
      
      expect(analysis.expectedDamage).toBeGreaterThan(0);
      expect(analysis.minDamage).toBe(0); // ミスの場合
      expect(analysis.maxDamage).toBeGreaterThan(analysis.minDamage);
      expect(analysis.criticalRate).toBeCloseTo(0.05, 2); // 5%
      expect(analysis.effectiveDPS).toBe(analysis.expectedDamage);
    });

    test('アドバンテージ付きダメージ分析', () => {
      const normalAnalysis = analyzeDamageFormula('1d8+3', 5, 15, 'none');
      const advantageAnalysis = analyzeDamageFormula('1d8+3', 5, 15, 'advantage');
      
      // アドバンテージの方が期待ダメージが高い
      expect(advantageAnalysis.expectedDamage).toBeGreaterThan(normalAnalysis.expectedDamage);
      expect(advantageAnalysis.criticalRate).toBeGreaterThan(normalAnalysis.criticalRate);
    });

    test('ディスアドバンテージ付きダメージ分析', () => {
      const normalAnalysis = analyzeDamageFormula('1d8+3', 5, 15, 'none');
      const disadvantageAnalysis = analyzeDamageFormula('1d8+3', 5, 15, 'disadvantage');
      
      // ディスアドバンテージの方が期待ダメージが低い
      expect(disadvantageAnalysis.expectedDamage).toBeLessThan(normalAnalysis.expectedDamage);
      expect(disadvantageAnalysis.criticalRate).toBeLessThan(normalAnalysis.criticalRate);
    });

    test('クリティカル範囲の影響', () => {
      const crit20Analysis = analyzeDamageFormula('1d8+3', 8, 12, 'none', 20);
      const crit19Analysis = analyzeDamageFormula('1d8+3', 8, 12, 'none', 19);
      
      expect(crit19Analysis.criticalRate).toBeGreaterThan(crit20Analysis.criticalRate);
      expect(crit19Analysis.expectedDamage).toBeGreaterThan(crit20Analysis.expectedDamage);
    });

    test('カスタムクリティカルダメージの処理', () => {
      const analysis = analyzeDamageFormula(
        '1d8+3,1d6+3', // 通常ダメージ,クリティカル追加ダメージ
        5,
        15,
        'none',
        20
      );
      
      expect(analysis.maxDamage).toBeGreaterThan(11); // 基本最大値より大きい
    });

    test('高AC対象への攻撃分析', () => {
      const lowACAnalysis = analyzeDamageFormula('1d8+3', 5, 12);
      const highACAnalysis = analyzeDamageFormula('1d8+3', 5, 18);
      
      expect(lowACAnalysis.expectedDamage).toBeGreaterThan(highACAnalysis.expectedDamage);
    });

    test('ダメージ分布の妥当性', () => {
      const analysis = analyzeDamageFormula('2d6+4', 6, 14);
      
      expect(analysis.distribution.mean).toBeCloseTo(analysis.expectedDamage, 2);
      expect(analysis.distribution.outcomes.get(0)).toBeGreaterThan(0); // ミス確率
    });
  });

  describe('パーティ戦闘能力評価', () => {
    test('標準的なパーティの評価', () => {
      const party = [
        createTestPartyMember({ stats: { strength: 16, dexterity: 12, constitution: 14, intelligence: 10, wisdom: 13, charisma: 8 } }), // ファイター
        createTestPartyMember({ stats: { strength: 8, dexterity: 16, constitution: 12, intelligence: 14, wisdom: 13, charisma: 10 } }), // ローグ
        createTestPartyMember({ stats: { strength: 10, dexterity: 14, constitution: 12, intelligence: 16, wisdom: 13, charisma: 8 } }), // ウィザード
        createTestPartyMember({ stats: { strength: 12, dexterity: 10, constitution: 14, intelligence: 8, wisdom: 16, charisma: 13 } })  // クレリック
      ];
      
      const evaluation = evaluatePartyCombatCapability(party);
      
      expect(evaluation.offensivePower).toBeGreaterThan(0);
      expect(evaluation.defensiveRating).toBeGreaterThan(0);
      expect(evaluation.sustainability).toBeGreaterThan(0);
      expect(evaluation.versatility).toBeGreaterThan(0);
      expect(evaluation.overallRating).toBeGreaterThan(0);
      
      // 各カテゴリが論理的な範囲内であることを確認
      expect(evaluation.offensivePower).toBeLessThan(50); // 妥当な上限
      expect(evaluation.defensiveRating).toBeLessThan(100);
    });

    test('空のパーティの評価', () => {
      const evaluation = evaluatePartyCombatCapability([]);
      
      expect(evaluation.offensivePower).toBe(0);
      expect(evaluation.defensiveRating).toBe(0);
      expect(evaluation.sustainability).toBe(0);
      expect(evaluation.versatility).toBe(0);
      expect(evaluation.overallRating).toBe(0);
    });

    test('高レベルパーティの評価', () => {
      const lowLevelParty = [createTestPartyMember({ level: 1 })];
      const highLevelParty = [createTestPartyMember({ level: 10 })];
      
      const lowEval = evaluatePartyCombatCapability(lowLevelParty);
      const highEval = evaluatePartyCombatCapability(highLevelParty);
      
      expect(highEval.offensivePower).toBeGreaterThan(lowEval.offensivePower);
      expect(highEval.overallRating).toBeGreaterThan(lowEval.overallRating);
    });

    test('特化型パーティの評価', () => {
      // 攻撃特化パーティ
      const offensiveParty = [
        createTestPartyMember({ stats: { strength: 20, dexterity: 16, constitution: 14, intelligence: 8, wisdom: 8, charisma: 8 } }),
        createTestPartyMember({ stats: { strength: 18, dexterity: 18, constitution: 14, intelligence: 8, wisdom: 8, charisma: 8 } })
      ];
      
      // 防御特化パーティ
      const defensiveParty = [
        createTestPartyMember({ 
          stats: { strength: 10, dexterity: 10, constitution: 20, intelligence: 10, wisdom: 16, charisma: 10 },
          derivedStats: { hitPoints: 80, maxHitPoints: 80, magicPoints: 20, maxMagicPoints: 20, armorClass: 20, initiative: 0, speed: 30 }
        })
      ];
      
      const offensiveEval = evaluatePartyCombatCapability(offensiveParty);
      const defensiveEval = evaluatePartyCombatCapability(defensiveParty);
      
      expect(offensiveEval.offensivePower).toBeGreaterThan(defensiveEval.offensivePower);
      expect(defensiveEval.defensiveRating).toBeGreaterThan(offensiveEval.defensiveRating);
    });
  });

  describe('エンカウンター難易度計算', () => {
    test('標準的なエンカウンターの評価', () => {
      const enemies = [createTestEnemy()];
      const rating = calculateEncounterDifficulty(4, 3, enemies);
      
      expect(rating.challengeRating).toBeGreaterThan(0);
      expect(rating.actionEconomy).toBeGreaterThan(0);
      expect(rating.tacticalComplexity).toBeGreaterThan(0);
      expect(rating.resourceDrain).toBeGreaterThan(0);
      expect(rating.balanceScore).toBeGreaterThanOrEqual(0);
      expect(rating.balanceScore).toBeLessThanOrEqual(1);
      
      expect(['trivial', 'easy', 'medium', 'hard', 'deadly']).toContain(rating.difficultyClass);
    });

    test('空のエンカウンターの評価', () => {
      const rating = calculateEncounterDifficulty(4, 3, []);
      
      expect(rating.difficultyClass).toBe('trivial');
      expect(rating.challengeRating).toBe(0);
      expect(rating.actionEconomy).toBe(0);
      expect(rating.tacticalComplexity).toBe(0);
      expect(rating.resourceDrain).toBe(0);
      expect(rating.balanceScore).toBe(0);
    });

    test('複数敵のアクションエコノミー', () => {
      const singleEnemy = [createTestEnemy({ challengeRating: 4 })];
      const multipleEnemies = [
        createTestEnemy({ challengeRating: 1 }),
        createTestEnemy({ challengeRating: 1 }),
        createTestEnemy({ challengeRating: 1 }),
        createTestEnemy({ challengeRating: 1 })
      ];
      
      const singleRating = calculateEncounterDifficulty(4, 3, singleEnemy);
      const multipleRating = calculateEncounterDifficulty(4, 3, multipleEnemies);
      
      expect(multipleRating.actionEconomy).toBeGreaterThan(singleRating.actionEconomy);
      expect(multipleRating.challengeRating).toBeGreaterThan(singleRating.challengeRating);
    });

    test('高CR敵の難易度分類', () => {
      const weakEnemy = [createTestEnemy({ challengeRating: 0.5 })];
      const strongEnemy = [createTestEnemy({ challengeRating: 8 })];
      
      const weakRating = calculateEncounterDifficulty(4, 3, weakEnemy);
      const strongRating = calculateEncounterDifficulty(4, 3, strongEnemy);
      
      const difficultyOrder = ['trivial', 'easy', 'medium', 'hard', 'deadly'];
      const weakIndex = difficultyOrder.indexOf(weakRating.difficultyClass);
      const strongIndex = difficultyOrder.indexOf(strongRating.difficultyClass);
      
      expect(strongIndex).toBeGreaterThan(weakIndex);
    });

    test('特殊能力による複雑性の増加', () => {
      const simpleEnemy = [createTestEnemy({ specialAbilities: 0 })];
      const complexEnemy = [createTestEnemy({ specialAbilities: 3 })];
      
      const simpleRating = calculateEncounterDifficulty(4, 3, simpleEnemy);
      const complexRating = calculateEncounterDifficulty(4, 3, complexEnemy);
      
      expect(complexRating.tacticalComplexity).toBeGreaterThan(simpleRating.tacticalComplexity);
    });

    test('パーティサイズの影響', () => {
      const enemies = [createTestEnemy({ challengeRating: 2 })];
      
      const smallPartyRating = calculateEncounterDifficulty(2, 3, enemies);
      const largePartyRating = calculateEncounterDifficulty(6, 3, enemies);
      
      // 同じ敵でも小さいパーティには相対的に難しい
      const difficultyOrder = ['trivial', 'easy', 'medium', 'hard', 'deadly'];
      const smallIndex = difficultyOrder.indexOf(smallPartyRating.difficultyClass);
      const largeIndex = difficultyOrder.indexOf(largePartyRating.difficultyClass);
      
      expect(smallIndex).toBeGreaterThanOrEqual(largeIndex);
    });

    test('バランススコアの妥当性', () => {
      // 理想的なバランスに近いエンカウンター
      const balancedEnemies = [createTestEnemy({ challengeRating: 3 })];
      const balancedRating = calculateEncounterDifficulty(4, 4, balancedEnemies);
      
      // 極端に難しいエンカウンター
      const overwhelmingEnemies = [createTestEnemy({ challengeRating: 20 })];
      const overwhelmingRating = calculateEncounterDifficulty(4, 4, overwhelmingEnemies);
      
      expect(balancedRating.balanceScore).toBeGreaterThan(overwhelmingRating.balanceScore);
    });
  });

  describe('戦闘シミュレーション', () => {
    beforeEach(() => {
      // ランダムのシードを固定して一貫したテスト結果を得る
      jest.spyOn(Math, 'random').mockImplementation(() => 0.5);
    });

    test('基本的な戦闘シミュレーション', () => {
      const attacker = {
        attackBonus: 5,
        damage: '1d8+3',
        hitPoints: 30,
        armorClass: 15
      };
      
      const defender = {
        armorClass: 14,
        hitPoints: 25
      };
      
      const result = simulateCombat(attacker, defender, 10, 100);
      
      expect(result.attackerWinRate).toBeGreaterThanOrEqual(0);
      expect(result.attackerWinRate).toBeLessThanOrEqual(1);
      expect(result.defenderWinRate).toBeGreaterThanOrEqual(0);
      expect(result.defenderWinRate).toBeLessThanOrEqual(1);
      expect(result.averageRoundsToEnd).toBeGreaterThan(0);
      expect(result.averageAttackerHPRemaining).toBeGreaterThanOrEqual(0);
      expect(result.averageDefenderHPRemaining).toBeGreaterThanOrEqual(0);
    });

    test('相互戦闘シミュレーション', () => {
      const combatant1 = {
        attackBonus: 5,
        damage: '1d8+3',
        hitPoints: 30,
        armorClass: 15
      };
      
      const combatant2 = {
        armorClass: 14,
        hitPoints: 25,
        damage: '1d6+2',
        attackBonus: 4
      };
      
      const result = simulateCombat(combatant1, combatant2, 10, 100);
      
      // 勝率の合計が1に近いことを確認（引き分けもあり得る）
      expect(result.attackerWinRate + result.defenderWinRate).toBeLessThanOrEqual(1);
      
      // より強い攻撃者が有利であることを確認
      expect(result.attackerWinRate).toBeGreaterThan(result.defenderWinRate);
    });

    test('一方的な戦闘（反撃なし）', () => {
      const attacker = {
        attackBonus: 10,
        damage: '2d8+5',
        hitPoints: 50,
        armorClass: 18
      };
      
      const defender = {
        armorClass: 10,
        hitPoints: 15
      };
      
      const result = simulateCombat(attacker, defender, 10, 100);
      
      // 攻撃者がほぼ確実に勝利する
      expect(result.attackerWinRate).toBeGreaterThan(0.8);
      expect(result.defenderWinRate).toBeLessThan(0.2);
    });

    test('長期戦のシミュレーション', () => {
      const tank1 = {
        attackBonus: 2,
        damage: '1d4+1',
        hitPoints: 100,
        armorClass: 20
      };
      
      const tank2 = {
        armorClass: 20,
        hitPoints: 100,
        damage: '1d4+1',
        attackBonus: 2
      };
      
      const result = simulateCombat(tank1, tank2, 50, 100);
      
      expect(result.averageRoundsToEnd).toBeGreaterThan(10);
    });

    test('ダメージ分布の生成', () => {
      const attacker = {
        attackBonus: 5,
        damage: '1d8+3',
        hitPoints: 30,
        armorClass: 15
      };
      
      const defender = {
        armorClass: 14,
        hitPoints: 25,
        damage: '1d6+2',
        attackBonus: 4
      };
      
      const result = simulateCombat(attacker, defender, 10, 100);
      
      expect(result.damageDistribution.attackerDealt.mean).toBeGreaterThan(0);
      expect(result.damageDistribution.defenderDealt.mean).toBeGreaterThan(0);
      expect(result.damageDistribution.attackerDealt.variance).toBeGreaterThanOrEqual(0);
      expect(result.damageDistribution.defenderDealt.variance).toBeGreaterThanOrEqual(0);
    });

    test('シミュレーション回数の影響', () => {
      const attacker = {
        attackBonus: 5,
        damage: '1d8+3',
        hitPoints: 30,
        armorClass: 15
      };
      
      const defender = {
        armorClass: 14,
        hitPoints: 25
      };
      
      const smallSample = simulateCombat(attacker, defender, 10, 10);
      const largeSample = simulateCombat(attacker, defender, 10, 1000);
      
      // 大きなサンプルの方がより安定した結果を提供する
      // (統計的検証は限定的だが、基本的な動作確認)
      expect(typeof smallSample.attackerWinRate).toBe('number');
      expect(typeof largeSample.attackerWinRate).toBe('number');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });
  });

  describe('数学的正確性の検証', () => {
    test('確率の基本法則の遵守', () => {
      const distribution = calculateDiceDistribution(2, 6, 0);
      
      // 確率の合計が1
      let totalProbability = 0;
      for (const probability of distribution.outcomes.values()) {
        totalProbability += probability;
      }
      expect(totalProbability).toBeCloseTo(1, 6);
      
      // 各確率が0以上1以下
      for (const probability of distribution.outcomes.values()) {
        expect(probability).toBeGreaterThanOrEqual(0);
        expect(probability).toBeLessThanOrEqual(1);
      }
    });

    test('期待値の線形性', () => {
      const dist1 = calculateDiceDistribution(1, 6, 0);
      const dist2 = calculateDiceDistribution(1, 6, 3); // +3修正
      
      expect(dist2.mean).toBeCloseTo(dist1.mean + 3, 6);
    });

    test('分散の加法性（独立な場合）', () => {
      const single = calculateDiceDistribution(1, 6, 0);
      const double = calculateDiceDistribution(2, 6, 0);
      
      expect(double.variance).toBeCloseTo(single.variance * 2, 6);
    });

    test('統計量の一貫性', () => {
      const distribution = calculateDiceDistribution(3, 4, 2);
      
      // 標準偏差は分散の平方根
      expect(distribution.standardDeviation).toBeCloseTo(Math.sqrt(distribution.variance), 6);
      
      // 最小値と最大値が論理的
      const outcomes = Array.from(distribution.outcomes.keys());
      expect(Math.min(...outcomes)).toBe(5); // 3*1 + 2
      expect(Math.max(...outcomes)).toBe(14); // 3*4 + 2
    });

    test('パーセンタイルの単調性', () => {
      const distribution = calculateDiceDistribution(2, 8, 1);
      const p = distribution.percentiles;
      
      expect(p.p5).toBeLessThanOrEqual(p.p25);
      expect(p.p25).toBeLessThanOrEqual(p.p50);
      expect(p.p50).toBeLessThanOrEqual(p.p75);
      expect(p.p75).toBeLessThanOrEqual(p.p95);
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量ダイスの計算パフォーマンス', () => {
      const startTime = Date.now();
      
      // 10d10の計算（大量の組み合わせ）
      const distribution = calculateDiceDistribution(10, 10, 0);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(5000); // 5秒以内
      expect(distribution.mean).toBeCloseTo(55, 1); // 10 * 5.5
    });

    test('戦闘シミュレーションのパフォーマンス', () => {
      const attacker = {
        attackBonus: 5,
        damage: '1d8+3',
        hitPoints: 30,
        armorClass: 15
      };
      
      const defender = {
        armorClass: 14,
        hitPoints: 25,
        damage: '1d6+2',
        attackBonus: 4
      };
      
      const startTime = Date.now();
      
      // 大量シミュレーション
      const result = simulateCombat(attacker, defender, 20, 5000);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10000); // 10秒以内
      expect(result.attackerWinRate).toBeGreaterThanOrEqual(0);
    });

    test('複雑なエンカウンター評価のパフォーマンス', () => {
      const largeEnemyGroup = Array.from({ length: 20 }, (_, i) => 
        createTestEnemy({ challengeRating: i + 1 })
      );
      
      const startTime = Date.now();
      
      const rating = calculateEncounterDifficulty(4, 5, largeEnemyGroup);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // 1秒以内
      expect(rating.challengeRating).toBeGreaterThan(0);
    });
  });

  describe('エッジケースとエラーハンドリング', () => {
    test('0面ダイスの処理', () => {
      expect(() => calculateDiceDistribution(1, 0, 0)).toThrow();
    });

    test('負のダイス数の処理', () => {
      expect(() => calculateDiceDistribution(-1, 6, 0)).toThrow();
    });

    test('無効なダメージ式の処理', () => {
      expect(() => {
        analyzeDamageFormula('invalid', 5, 15);
      }).toThrow();
    });

    test('極端なAC値の処理', () => {
      // AC 100（ほぼ命中不可能）
      const analysis = analyzeDamageFormula('1d8+3', 5, 100);
      expect(analysis.expectedDamage).toBeCloseTo(0, 2);
      
      // AC -10（常に命中）
      const analysis2 = analyzeDamageFormula('1d8+3', 5, -10);
      expect(analysis2.expectedDamage).toBeGreaterThan(6); // 必ず命中
    });

    test('0HPキャラクターの戦闘シミュレーション', () => {
      const attacker = {
        attackBonus: 5,
        damage: '1d8+3',
        hitPoints: 1,
        armorClass: 15
      };
      
      const defender = {
        armorClass: 14,
        hitPoints: 0 // 既に死亡
      };
      
      const result = simulateCombat(attacker, defender, 10, 100);
      
      expect(result.attackerWinRate).toBe(1); // 攻撃者が必ず勝利
      expect(result.defenderWinRate).toBe(0);
      expect(result.averageRoundsToEnd).toBeLessThanOrEqual(1);
    });

    test('最大ラウンド制限のテスト', () => {
      const tank1 = {
        attackBonus: 0,
        damage: '1d1+0', // 最小ダメージ
        hitPoints: 1000,
        armorClass: 30 // 非常に高いAC
      };
      
      const tank2 = {
        armorClass: 30,
        hitPoints: 1000,
        damage: '1d1+0',
        attackBonus: 0
      };
      
      const result = simulateCombat(tank1, tank2, 5, 100); // 最大5ラウンド
      
      expect(result.averageRoundsToEnd).toBeLessThanOrEqual(5);
      // ほとんどが引き分けになる
      expect(result.attackerWinRate + result.defenderWinRate).toBeLessThan(0.1);
    });
  });
});