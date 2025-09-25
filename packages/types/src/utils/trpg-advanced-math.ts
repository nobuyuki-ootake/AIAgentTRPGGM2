/**
 * 高度なTRPG数学ユーティリティ
 * Advanced TRPG Mathematical Utilities
 * 
 * 提供機能:
 * - 高度なダメージ計算と分析
 * - エンカウンターバランシング
 * - 確率分布と統計分析
 * - レーティングシステム
 * - 戦闘シミュレーション
 */

import type { BaseStats, DerivedStats } from '../base';

// ==========================================
// 確率分布インターフェース
// ==========================================

export interface ProbabilityDistribution {
  mean: number;
  variance: number;
  standardDeviation: number;
  outcomes: Map<number, number>; // 結果 -> 確率
  percentiles: {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };
}

export interface DamageAnalysis {
  expectedDamage: number;
  minDamage: number;
  maxDamage: number;
  distribution: ProbabilityDistribution;
  criticalRate: number;
  effectiveDPS: number;
}

export interface EncounterRating {
  difficultyClass: 'trivial' | 'easy' | 'medium' | 'hard' | 'deadly';
  challengeRating: number;
  actionEconomy: number;
  tacticalComplexity: number;
  resourceDrain: number;
  balanceScore: number;
}

// ==========================================
// 確率計算ユーティリティ
// ==========================================

/**
 * ダイス分布の確率計算
 */
export function calculateDiceDistribution(
  diceCount: number,
  diceSides: number,
  modifier: number = 0
): ProbabilityDistribution {
  const outcomes = new Map<number, number>();
  const totalCombinations = Math.pow(diceSides, diceCount);
  
  // 全ての組み合わせを計算
  function generateCombinations(
    currentSum: number,
    remainingDice: number,
    probability: number
  ) {
    if (remainingDice === 0) {
      const finalSum = currentSum + modifier;
      outcomes.set(finalSum, (outcomes.get(finalSum) || 0) + probability);
      return;
    }
    
    for (let roll = 1; roll <= diceSides; roll++) {
      generateCombinations(
        currentSum + roll,
        remainingDice - 1,
        probability / diceSides
      );
    }
  }
  
  generateCombinations(0, diceCount, 1);
  
  // 統計値を計算
  let mean = 0;
  let variance = 0;
  
  for (const [value, probability] of outcomes) {
    mean += value * probability;
  }
  
  for (const [value, probability] of outcomes) {
    variance += Math.pow(value - mean, 2) * probability;
  }
  
  const standardDeviation = Math.sqrt(variance);
  
  // パーセンタイルを計算
  const sortedOutcomes = Array.from(outcomes.entries())
    .sort(([a], [b]) => a - b);
  
  let cumulativeProbability = 0;
  const percentiles = { p5: 0, p25: 0, p50: 0, p75: 0, p95: 0 };
  
  for (const [value, probability] of sortedOutcomes) {
    cumulativeProbability += probability;
    
    if (percentiles.p5 === 0 && cumulativeProbability >= 0.05) percentiles.p5 = value;
    if (percentiles.p25 === 0 && cumulativeProbability >= 0.25) percentiles.p25 = value;
    if (percentiles.p50 === 0 && cumulativeProbability >= 0.50) percentiles.p50 = value;
    if (percentiles.p75 === 0 && cumulativeProbability >= 0.75) percentiles.p75 = value;
    if (percentiles.p95 === 0 && cumulativeProbability >= 0.95) percentiles.p95 = value;
  }
  
  return {
    mean,
    variance,
    standardDeviation,
    outcomes,
    percentiles
  };
}

/**
 * 複雑なダメージ式の分析
 */
export function analyzeDamageFormula(
  formula: string,
  attackBonus: number,
  targetAC: number,
  advantageState: 'none' | 'advantage' | 'disadvantage' = 'none',
  criticalRange: number = 20
): DamageAnalysis {
  // ダメージ式をパース（例: "2d6+3" or "1d8+4,2d6" for critical）
  const [normalDamage, criticalDamage] = formula.split(',');
  
  const normalDist = parseDamageExpression(normalDamage.trim());
  const criticalDist = criticalDamage ? 
    parseDamageExpression(criticalDamage.trim()) : 
    { ...normalDist, diceCount: normalDist.diceCount * 2 }; // デフォルトはダイス数倍
  
  // 命中確率の計算
  const hitProbability = calculateHitProbability(
    attackBonus, 
    targetAC, 
    advantageState
  );
  
  // クリティカル確率の計算
  const criticalProbability = calculateCriticalProbability(
    criticalRange,
    advantageState
  );
  
  // 通常ヒット確率（クリティカルを除く）
  const normalHitProbability = hitProbability - criticalProbability;
  
  // ダメージ分布の計算
  const normalDamageDistribution = calculateDiceDistribution(
    normalDist.diceCount,
    normalDist.diceSides,
    normalDist.modifier
  );
  
  const criticalDamageDistribution = calculateDiceDistribution(
    criticalDist.diceCount,
    criticalDist.diceSides,
    criticalDist.modifier
  );
  
  // 期待ダメージの計算
  const expectedDamage = 
    (normalHitProbability * normalDamageDistribution.mean) +
    (criticalProbability * criticalDamageDistribution.mean);
  
  // 効果的DPS（1ラウンドあたりの期待ダメージ）
  const effectiveDPS = expectedDamage;
  
  // 複合分布の作成
  const combinedOutcomes = new Map<number, number>();
  
  // ミス
  combinedOutcomes.set(0, 1 - hitProbability);
  
  // 通常ヒット
  for (const [damage, probability] of normalDamageDistribution.outcomes) {
    const totalProbability = normalHitProbability * probability;
    combinedOutcomes.set(damage, (combinedOutcomes.get(damage) || 0) + totalProbability);
  }
  
  // クリティカルヒット
  for (const [damage, probability] of criticalDamageDistribution.outcomes) {
    const totalProbability = criticalProbability * probability;
    combinedOutcomes.set(damage, (combinedOutcomes.get(damage) || 0) + totalProbability);
  }
  
  // 統計値の再計算
  let mean = 0;
  let variance = 0;
  for (const [value, probability] of combinedOutcomes) {
    mean += value * probability;
  }
  for (const [value, probability] of combinedOutcomes) {
    variance += Math.pow(value - mean, 2) * probability;
  }
  
  const distribution: ProbabilityDistribution = {
    mean,
    variance,
    standardDeviation: Math.sqrt(variance),
    outcomes: combinedOutcomes,
    percentiles: calculatePercentiles(combinedOutcomes)
  };
  
  return {
    expectedDamage,
    minDamage: Math.min(...Array.from(combinedOutcomes.keys())),
    maxDamage: Math.max(...Array.from(combinedOutcomes.keys())),
    distribution,
    criticalRate: criticalProbability,
    effectiveDPS
  };
}

// ==========================================
// エンカウンターバランシング
// ==========================================

/**
 * パーティの戦闘能力評価
 */
export function evaluatePartyCombatCapability(
  party: Array<{
    stats: BaseStats;
    derivedStats: DerivedStats;
    level: number;
    equipment?: any[];
  }>
): {
  offensivePower: number;
  defensiveRating: number;
  sustainability: number;
  versatility: number;
  overallRating: number;
} {
  if (party.length === 0) {
    return {
      offensivePower: 0,
      defensiveRating: 0,
      sustainability: 0,
      versatility: 0,
      overallRating: 0
    };
  }
  
  let totalOffensive = 0;
  let totalDefensive = 0;
  let totalSustainability = 0;
  let totalVersatility = 0;
  
  for (const member of party) {
    // 攻撃力評価
    const strMod = Math.floor((member.stats.strength - 10) / 2);
    const dexMod = Math.floor((member.stats.dexterity - 10) / 2);
    const offensive = (Math.max(strMod, dexMod) + member.level) * 2;
    totalOffensive += offensive;
    
    // 防御力評価
    const conMod = Math.floor((member.stats.constitution - 10) / 2);
    const defensive = member.derivedStats.armorClass + 
                     member.derivedStats.maxHitPoints / 10 +
                     conMod;
    totalDefensive += defensive;
    
    // 持続力評価
    const sustainability = member.derivedStats.maxHitPoints +
                          member.derivedStats.maxMagicPoints +
                          conMod * 5;
    totalSustainability += sustainability;
    
    // 汎用性評価
    const intMod = Math.floor((member.stats.intelligence - 10) / 2);
    const wisMod = Math.floor((member.stats.wisdom - 10) / 2);
    const chaMod = Math.floor((member.stats.charisma - 10) / 2);
    const versatility = Math.max(intMod, wisMod, chaMod) + member.level;
    totalVersatility += versatility;
  }
  
  const avgOffensive = totalOffensive / party.length;
  const avgDefensive = totalDefensive / party.length;
  const avgSustainability = totalSustainability / party.length;
  const avgVersatility = totalVersatility / party.length;
  
  const overallRating = (avgOffensive + avgDefensive + avgSustainability + avgVersatility) / 4;
  
  return {
    offensivePower: avgOffensive,
    defensiveRating: avgDefensive,
    sustainability: avgSustainability,
    versatility: avgVersatility,
    overallRating
  };
}

/**
 * 敵エンカウンターの難易度評価
 */
export function calculateEncounterDifficulty(
  partySize: number,
  partyLevel: number,
  enemies: Array<{
    challengeRating: number;
    hitPoints: number;
    armorClass: number;
    damagePerRound: number;
    specialAbilities?: number;
  }>
): EncounterRating {
  if (enemies.length === 0) {
    return {
      difficultyClass: 'trivial',
      challengeRating: 0,
      actionEconomy: 0,
      tacticalComplexity: 0,
      resourceDrain: 0,
      balanceScore: 0
    };
  }
  
  // 基本CR計算
  const totalCR = enemies.reduce((sum, enemy) => sum + enemy.challengeRating, 0);
  
  // アクションエコノミーの評価
  const enemyActionCount = enemies.length;
  const actionEconomyRatio = enemyActionCount / partySize;
  let actionEconomyMultiplier = 1;
  
  if (actionEconomyRatio > 1.5) actionEconomyMultiplier = 1.5;
  else if (actionEconomyRatio > 1) actionEconomyMultiplier = 1.2;
  else if (actionEconomyRatio < 0.5) actionEconomyMultiplier = 0.8;
  
  // 戦術的複雑性の評価
  const tacticalComplexity = enemies.reduce((sum, enemy) => {
    let complexity = 1;
    if (enemy.armorClass > 15) complexity += 0.2;
    if (enemy.hitPoints > 50) complexity += 0.2;
    if (enemy.specialAbilities && enemy.specialAbilities > 0) complexity += enemy.specialAbilities * 0.1;
    return sum + complexity;
  }, 0) / enemies.length;
  
  // リソース消耗の評価
  const totalDamagePerRound = enemies.reduce((sum, enemy) => sum + enemy.damagePerRound, 0);
  const estimatedCombatRounds = Math.max(3, Math.min(10, totalCR / partyLevel));
  const resourceDrain = (totalDamagePerRound * estimatedCombatRounds) / (partySize * partyLevel * 10);
  
  // 調整済みCR
  const adjustedCR = totalCR * actionEconomyMultiplier * tacticalComplexity;
  
  // 難易度分類
  let difficultyClass: EncounterRating['difficultyClass'];
  const crPerPartyMember = adjustedCR / partySize;
  const levelAdjustedCR = crPerPartyMember / partyLevel;
  
  if (levelAdjustedCR < 0.25) difficultyClass = 'trivial';
  else if (levelAdjustedCR < 0.5) difficultyClass = 'easy';
  else if (levelAdjustedCR < 1) difficultyClass = 'medium';
  else if (levelAdjustedCR < 1.5) difficultyClass = 'hard';
  else difficultyClass = 'deadly';
  
  // バランススコア（0-1、1が最適バランス）
  const idealCR = partySize * partyLevel * 0.75; // 理想的なCR
  const crDifference = Math.abs(adjustedCR - idealCR) / idealCR;
  const balanceScore = Math.max(0, 1 - crDifference);
  
  return {
    difficultyClass,
    challengeRating: adjustedCR,
    actionEconomy: actionEconomyRatio,
    tacticalComplexity,
    resourceDrain,
    balanceScore
  };
}

// ==========================================
// 戦闘シミュレーション
// ==========================================

/**
 * 戦闘結果のシミュレーション
 */
export function simulateCombat(
  attackerStats: {
    attackBonus: number;
    damage: string;
    hitPoints: number;
    armorClass: number;
  },
  defenderStats: {
    armorClass: number;
    hitPoints: number;
    damage?: string;
    attackBonus?: number;
  },
  rounds: number = 10,
  iterations: number = 1000
): {
  attackerWinRate: number;
  defenderWinRate: number;
  averageRoundsToEnd: number;
  averageAttackerHPRemaining: number;
  averageDefenderHPRemaining: number;
  damageDistribution: {
    attackerDealt: ProbabilityDistribution;
    defenderDealt: ProbabilityDistribution;
  };
} {
  let attackerWins = 0;
  let defenderWins = 0;
  let totalRounds = 0;
  let totalAttackerHPRemaining = 0;
  let totalDefenderHPRemaining = 0;
  
  const attackerDamageDealt: number[] = [];
  const defenderDamageDealt: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    let attackerHP = attackerStats.hitPoints;
    let defenderHP = defenderStats.hitPoints;
    let roundCount = 0;
    let attackerTotalDamage = 0;
    let defenderTotalDamage = 0;
    
    while (roundCount < rounds && attackerHP > 0 && defenderHP > 0) {
      roundCount++;
      
      // 攻撃者のターン
      if (attackerHP > 0) {
        const hitRoll = Math.floor(Math.random() * 20) + 1 + attackerStats.attackBonus;
        if (hitRoll >= defenderStats.armorClass) {
          const damage = rollDamageFromString(attackerStats.damage);
          defenderHP -= damage;
          attackerTotalDamage += damage;
        }
      }
      
      // 防御者のターン（反撃可能な場合）
      if (defenderHP > 0 && defenderStats.damage && defenderStats.attackBonus !== undefined) {
        const hitRoll = Math.floor(Math.random() * 20) + 1 + defenderStats.attackBonus;
        if (hitRoll >= attackerStats.armorClass) {
          const damage = rollDamageFromString(defenderStats.damage);
          attackerHP -= damage;
          defenderTotalDamage += damage;
        }
      }
    }
    
    if (attackerHP > 0 && defenderHP <= 0) {
      attackerWins++;
    } else if (defenderHP > 0 && attackerHP <= 0) {
      defenderWins++;
    }
    
    totalRounds += roundCount;
    totalAttackerHPRemaining += Math.max(0, attackerHP);
    totalDefenderHPRemaining += Math.max(0, defenderHP);
    attackerDamageDealt.push(attackerTotalDamage);
    defenderDamageDealt.push(defenderTotalDamage);
  }
  
  return {
    attackerWinRate: attackerWins / iterations,
    defenderWinRate: defenderWins / iterations,
    averageRoundsToEnd: totalRounds / iterations,
    averageAttackerHPRemaining: totalAttackerHPRemaining / iterations,
    averageDefenderHPRemaining: totalDefenderHPRemaining / iterations,
    damageDistribution: {
      attackerDealt: createDistributionFromSamples(attackerDamageDealt),
      defenderDealt: createDistributionFromSamples(defenderDamageDealt)
    }
  };
}

// ==========================================
// ヘルパー関数
// ==========================================

function parseDamageExpression(expression: string): {
  diceCount: number;
  diceSides: number;
  modifier: number;
} {
  const match = expression.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) {
    throw new Error(`Invalid damage expression: ${expression}`);
  }
  
  return {
    diceCount: parseInt(match[1]),
    diceSides: parseInt(match[2]),
    modifier: match[3] ? parseInt(match[3]) : 0
  };
}

function rollDamageFromString(damageString: string): number {
  const { diceCount, diceSides, modifier } = parseDamageExpression(damageString);
  
  let total = 0;
  for (let i = 0; i < diceCount; i++) {
    total += Math.floor(Math.random() * diceSides) + 1;
  }
  
  return total + modifier;
}

function calculateHitProbability(
  attackBonus: number,
  targetAC: number,
  advantageState: 'none' | 'advantage' | 'disadvantage'
): number {
  const baseChance = Math.max(0, Math.min(1, (22 - targetAC + attackBonus) / 20));
  
  switch (advantageState) {
    case 'advantage':
      return 1 - Math.pow(1 - baseChance, 2);
    case 'disadvantage':
      return Math.pow(baseChance, 2);
    default:
      return baseChance;
  }
}

function calculateCriticalProbability(
  criticalRange: number,
  advantageState: 'none' | 'advantage' | 'disadvantage'
): number {
  const baseCritChance = (21 - criticalRange) / 20;
  
  switch (advantageState) {
    case 'advantage':
      return 1 - Math.pow(1 - baseCritChance, 2);
    case 'disadvantage':
      return Math.pow(baseCritChance, 2);
    default:
      return baseCritChance;
  }
}

function calculatePercentiles(outcomes: Map<number, number>): {
  p5: number; p25: number; p50: number; p75: number; p95: number;
} {
  const sortedOutcomes = Array.from(outcomes.entries())
    .sort(([a], [b]) => a - b);
  
  let cumulativeProbability = 0;
  const percentiles = { p5: 0, p25: 0, p50: 0, p75: 0, p95: 0 };
  
  for (const [value, probability] of sortedOutcomes) {
    cumulativeProbability += probability;
    
    if (percentiles.p5 === 0 && cumulativeProbability >= 0.05) percentiles.p5 = value;
    if (percentiles.p25 === 0 && cumulativeProbability >= 0.25) percentiles.p25 = value;
    if (percentiles.p50 === 0 && cumulativeProbability >= 0.50) percentiles.p50 = value;
    if (percentiles.p75 === 0 && cumulativeProbability >= 0.75) percentiles.p75 = value;
    if (percentiles.p95 === 0 && cumulativeProbability >= 0.95) percentiles.p95 = value;
  }
  
  return percentiles;
}

function createDistributionFromSamples(samples: number[]): ProbabilityDistribution {
  if (samples.length === 0) {
    return {
      mean: 0,
      variance: 0,
      standardDeviation: 0,
      outcomes: new Map(),
      percentiles: { p5: 0, p25: 0, p50: 0, p75: 0, p95: 0 }
    };
  }
  
  const mean = samples.reduce((sum, val) => sum + val, 0) / samples.length;
  const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
  const standardDeviation = Math.sqrt(variance);
  
  const outcomes = new Map<number, number>();
  for (const sample of samples) {
    outcomes.set(sample, (outcomes.get(sample) || 0) + 1 / samples.length);
  }
  
  const sorted = samples.slice().sort((a, b) => a - b);
  const percentiles = {
    p5: sorted[Math.floor(samples.length * 0.05)],
    p25: sorted[Math.floor(samples.length * 0.25)],
    p50: sorted[Math.floor(samples.length * 0.50)],
    p75: sorted[Math.floor(samples.length * 0.75)],
    p95: sorted[Math.floor(samples.length * 0.95)]
  };
  
  return {
    mean,
    variance,
    standardDeviation,
    outcomes,
    percentiles
  };
}