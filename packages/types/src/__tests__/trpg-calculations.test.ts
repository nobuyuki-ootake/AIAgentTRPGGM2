/**
 * TRPG計算ユーティリティの包括的テスト
 * TRPG Calculation Utilities Comprehensive Tests
 * 
 * テスト対象:
 * - ダイスロール計算
 * - 能力値修正の計算
 * - 統計と確率の計算
 * - 戦闘関連の計算
 * - レベル進行とEXP計算
 * - バランス調整関数
 */

import type { BaseStats, DerivedStats } from '../index';

// ==========================================
// ダイスロール関数の実装
// ==========================================

/**
 * ダイス記法のパース結果
 */
export interface DiceExpression {
  count: number;      // ダイスの個数
  sides: number;      // ダイスの面数
  modifier: number;   // 修正値
  advantage: boolean; // 有利
  disadvantage: boolean; // 不利
}

/**
 * ダイスロール結果
 */
export interface DiceResult {
  expression: string;
  rolls: number[];
  modifier: number;
  total: number;
  isAdvantage: boolean;
  isDisadvantage: boolean;
  isCritical: boolean;
  isFumble: boolean;
}

/**
 * ダイス記法をパースする
 * 例: "1d20+5", "2d6", "1d20adv", "1d20dis-2"
 */
export function parseDiceExpression(expression: string): DiceExpression {
  const cleaned = expression.toLowerCase().replace(/\s/g, '');
  
  // 基本パターン: XdY±Z
  const basicMatch = cleaned.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (basicMatch) {
    return {
      count: parseInt(basicMatch[1]),
      sides: parseInt(basicMatch[2]),
      modifier: basicMatch[3] ? parseInt(basicMatch[3]) : 0,
      advantage: false,
      disadvantage: false
    };
  }
  
  // アドバンテージ/ディスアドバンテージパターン
  const advMatch = cleaned.match(/^(\d+)d(\d+)(adv|advantage)([+-]\d+)?$/);
  if (advMatch) {
    return {
      count: parseInt(advMatch[1]),
      sides: parseInt(advMatch[2]),
      modifier: advMatch[4] ? parseInt(advMatch[4]) : 0,
      advantage: true,
      disadvantage: false
    };
  }
  
  const disMatch = cleaned.match(/^(\d+)d(\d+)(dis|disadvantage)([+-]\d+)?$/);
  if (disMatch) {
    return {
      count: parseInt(disMatch[1]),
      sides: parseInt(disMatch[2]),
      modifier: disMatch[4] ? parseInt(disMatch[4]) : 0,
      advantage: false,
      disadvantage: true
    };
  }
  
  throw new Error(`Invalid dice expression: ${expression}`);
}

/**
 * ダイスロールを実行する
 */
export function rollDice(expression: string, randomFunction?: () => number): DiceResult {
  const parsed = parseDiceExpression(expression);
  const rng = randomFunction || Math.random;
  
  let rolls: number[] = [];
  
  if (parsed.advantage || parsed.disadvantage) {
    // 有利/不利の場合は2回振って選択
    const roll1 = Math.floor(rng() * parsed.sides) + 1;
    const roll2 = Math.floor(rng() * parsed.sides) + 1;
    rolls = [roll1, roll2];
    
    // 有利なら大きい方、不利なら小さい方を選択
    const selectedRoll = parsed.advantage ? Math.max(roll1, roll2) : Math.min(roll1, roll2);
    rolls = [selectedRoll];
  } else {
    // 通常のロール
    for (let i = 0; i < parsed.count; i++) {
      rolls.push(Math.floor(rng() * parsed.sides) + 1);
    }
  }
  
  const rollSum = rolls.reduce((sum, roll) => sum + roll, 0);
  const total = rollSum + parsed.modifier;
  
  return {
    expression,
    rolls,
    modifier: parsed.modifier,
    total,
    isAdvantage: parsed.advantage,
    isDisadvantage: parsed.disadvantage,
    isCritical: parsed.sides === 20 && rolls.some(roll => roll === 20),
    isFumble: parsed.sides === 20 && rolls.some(roll => roll === 1)
  };
}

// ==========================================
// 能力値修正計算
// ==========================================

/**
 * 能力値から修正値を計算する（D&D 5e形式）
 */
export function getAbilityModifier(abilityScore: number): number {
  return Math.floor((abilityScore - 10) / 2);
}

/**
 * レベルとクラスからProficiency Bonusを計算
 */
export function getProficiencyBonus(level: number): number {
  if (level < 1) return 0;
  return Math.ceil(level / 4) + 1;
}

/**
 * 能力値修正とProficiency Bonusを含むスキル修正を計算
 */
export function getSkillModifier(
  abilityScore: number,
  level: number,
  isProficient: boolean = false,
  expertise: boolean = false
): number {
  const abilityMod = getAbilityModifier(abilityScore);
  if (!isProficient) return abilityMod;
  
  const profBonus = getProficiencyBonus(level);
  const multiplier = expertise ? 2 : 1;
  
  return abilityMod + (profBonus * multiplier);
}

// ==========================================
// 戦闘計算
// ==========================================

/**
 * 攻撃ロールの計算
 */
export function calculateAttackRoll(
  abilityScore: number,
  level: number,
  weaponBonus: number = 0,
  isProficient: boolean = true
): number {
  const abilityMod = getAbilityModifier(abilityScore);
  const profBonus = isProficient ? getProficiencyBonus(level) : 0;
  return abilityMod + profBonus + weaponBonus;
}

/**
 * ダメージロールの計算
 */
export function calculateDamageRoll(
  weaponDamage: string,
  abilityScore: number,
  weaponBonus: number = 0,
  randomFunction?: () => number
): DiceResult {
  const abilityMod = getAbilityModifier(abilityScore);
  const totalModifier = abilityMod + weaponBonus;
  
  // 武器ダメージに修正値を追加
  const modifiedExpression = totalModifier !== 0 
    ? `${weaponDamage}${totalModifier >= 0 ? '+' : ''}${totalModifier}`
    : weaponDamage;
  
  return rollDice(modifiedExpression, randomFunction);
}

/**
 * AC計算（軽装鎧の場合）
 */
export function calculateArmorClass(
  baseAC: number,
  dexterityScore: number,
  armorType: 'light' | 'medium' | 'heavy' = 'light',
  maxDexBonus?: number
): number {
  const dexMod = getAbilityModifier(dexterityScore);
  
  switch (armorType) {
    case 'light':
      return baseAC + dexMod;
    case 'medium':
      return baseAC + Math.min(dexMod, maxDexBonus || 2);
    case 'heavy':
      return baseAC; // 敏捷修正なし
    default:
      return baseAC;
  }
}

// ==========================================
// レベル進行とEXP計算
// ==========================================

/**
 * レベルアップに必要なEXPテーブル（D&D 5e準拠）
 */
export const EXP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000
];

/**
 * 現在のEXPから適切なレベルを計算
 */
export function calculateLevel(currentExp: number): number {
  for (let level = EXP_THRESHOLDS.length - 1; level >= 0; level--) {
    if (currentExp >= EXP_THRESHOLDS[level]) {
      return level + 1;
    }
  }
  return 1;
}

/**
 * 次のレベルまでに必要なEXP
 */
export function getExpToNextLevel(currentExp: number): number {
  const currentLevel = calculateLevel(currentExp);
  if (currentLevel >= EXP_THRESHOLDS.length) {
    return 0; // 最大レベル
  }
  
  return EXP_THRESHOLDS[currentLevel] - currentExp;
}

// ==========================================
// 統計と確率計算
// ==========================================

/**
 * ダイス期待値の計算
 */
export function calculateDiceExpectedValue(expression: string): number {
  const parsed = parseDiceExpression(expression);
  const diceExpectedValue = parsed.count * (parsed.sides + 1) / 2;
  return diceExpectedValue + parsed.modifier;
}

/**
 * 成功確率の計算（DC判定）
 */
export function calculateSuccessProbability(
  modifier: number,
  difficultyClass: number,
  advantage: boolean = false,
  disadvantage: boolean = false
): number {
  const baseChance = Math.max(0, Math.min(1, (22 - difficultyClass + modifier) / 20));
  
  if (advantage) {
    return 1 - Math.pow(1 - baseChance, 2);
  }
  
  if (disadvantage) {
    return Math.pow(baseChance, 2);
  }
  
  return baseChance;
}

/**
 * クリティカルヒット確率
 */
export function calculateCriticalProbability(
  criticalRange: number = 20,
  advantage: boolean = false
): number {
  const baseCritChance = (21 - criticalRange) / 20;
  
  if (advantage) {
    return 1 - Math.pow(1 - baseCritChance, 2);
  }
  
  return baseCritChance;
}

// ==========================================
// バランス調整関数
// ==========================================

/**
 * Challenge Rating (CR) の計算
 */
export function calculateChallengeRating(
  hitPoints: number,
  armorClass: number,
  attackBonus: number,
  damagePerRound: number
): number {
  // 防御CR
  const defensiveCR = Math.max(0, Math.log2(hitPoints / 10));
  const acAdjustment = (armorClass - 13) * 0.25;
  const adjustedDefensiveCR = defensiveCR + acAdjustment;
  
  // 攻撃CR
  const offensiveCR = Math.max(0, Math.log2(damagePerRound / 5));
  const attackAdjustment = (attackBonus - 5) * 0.25;
  const adjustedOffensiveCR = offensiveCR + attackAdjustment;
  
  // 平均CR
  return Math.round((adjustedDefensiveCR + adjustedOffensiveCR) / 2 * 4) / 4;
}

/**
 * パーティバランスの評価
 */
export function evaluatePartyBalance(characters: BaseStats[]): {
  frontline: number;
  support: number;
  damage: number;
  utility: number;
  balance: number;
} {
  if (characters.length === 0) {
    return { frontline: 0, support: 0, damage: 0, utility: 0, balance: 0 };
  }
  
  let frontline = 0;
  let support = 0;
  let damage = 0;
  let utility = 0;
  
  characters.forEach(stats => {
    const strMod = getAbilityModifier(stats.strength);
    const conMod = getAbilityModifier(stats.constitution);
    const wisMod = getAbilityModifier(stats.wisdom);
    const intMod = getAbilityModifier(stats.intelligence);
    const chaMod = getAbilityModifier(stats.charisma);
    
    frontline += Math.max(strMod, conMod);
    support += Math.max(wisMod, chaMod);
    damage += Math.max(strMod, getAbilityModifier(stats.dexterity));
    utility += Math.max(intMod, wisMod);
  });
  
  const total = frontline + support + damage + utility;
  const averageScore = total / 4;
  const variance = [frontline, support, damage, utility]
    .map(score => Math.pow(score - averageScore, 2))
    .reduce((sum, variance) => sum + variance, 0) / 4;
  
  const balance = Math.max(0, 1 - variance / (averageScore * averageScore || 1));
  
  return { frontline, support, damage, utility, balance };
}

// ==========================================
// テストスイート
// ==========================================

describe('TRPG計算ユーティリティの包括的テスト', () => {
  
  describe('ダイス記法のパース', () => {
    test('基本的なダイス記法を正しくパースする', () => {
      expect(parseDiceExpression('1d20')).toEqual({
        count: 1, sides: 20, modifier: 0, advantage: false, disadvantage: false
      });
      
      expect(parseDiceExpression('2d6+3')).toEqual({
        count: 2, sides: 6, modifier: 3, advantage: false, disadvantage: false
      });
      
      expect(parseDiceExpression('1d8-1')).toEqual({
        count: 1, sides: 8, modifier: -1, advantage: false, disadvantage: false
      });
    });

    test('アドバンテージ/ディスアドバンテージを正しくパースする', () => {
      expect(parseDiceExpression('1d20adv')).toEqual({
        count: 1, sides: 20, modifier: 0, advantage: true, disadvantage: false
      });
      
      expect(parseDiceExpression('1d20dis+5')).toEqual({
        count: 1, sides: 20, modifier: 5, advantage: false, disadvantage: true
      });
      
      expect(parseDiceExpression('1d20advantage-2')).toEqual({
        count: 1, sides: 20, modifier: -2, advantage: true, disadvantage: false
      });
    });

    test('無効なダイス記法でエラーを投げる', () => {
      expect(() => parseDiceExpression('invalid')).toThrow();
      expect(() => parseDiceExpression('d20')).toThrow();
      expect(() => parseDiceExpression('1d')).toThrow();
    });
  });

  describe('ダイスロール実行', () => {
    test('固定値を返すランダム関数でテストする', () => {
      // 固定値0.5を返すランダム関数（d20で11、d6で4を返す）
      const fixedRandom = () => 0.5;
      
      const result = rollDice('1d20+5', fixedRandom);
      expect(result.rolls).toEqual([11]);
      expect(result.modifier).toBe(5);
      expect(result.total).toBe(16);
      expect(result.isCritical).toBe(false);
      expect(result.isFumble).toBe(false);
    });

    test('クリティカルとファンブルを正しく検出する', () => {
      const alwaysMax = () => 0.999; // d20で20を返す
      const alwaysMin = () => 0.001; // d20で1を返す
      
      const critResult = rollDice('1d20', alwaysMax);
      expect(critResult.rolls).toEqual([20]);
      expect(critResult.isCritical).toBe(true);
      expect(critResult.isFumble).toBe(false);
      
      const fumbleResult = rollDice('1d20', alwaysMin);
      expect(fumbleResult.rolls).toEqual([1]);
      expect(fumbleResult.isCritical).toBe(false);
      expect(fumbleResult.isFumble).toBe(true);
    });

    test('アドバンテージで高い方を選択する', () => {
      let callCount = 0;
      const alternatingRandom = () => {
        callCount++;
        return callCount === 1 ? 0.1 : 0.9; // 1回目: 3, 2回目: 19
      };
      
      const result = rollDice('1d20adv', alternatingRandom);
      expect(result.rolls).toEqual([19]); // 高い方が選択される
      expect(result.isAdvantage).toBe(true);
    });

    test('ディスアドバンテージで低い方を選択する', () => {
      let callCount = 0;
      const alternatingRandom = () => {
        callCount++;
        return callCount === 1 ? 0.1 : 0.9; // 1回目: 3, 2回目: 19
      };
      
      const result = rollDice('1d20dis', alternatingRandom);
      expect(result.rolls).toEqual([3]); // 低い方が選択される
      expect(result.isDisadvantage).toBe(true);
    });

    test('複数ダイスのロールが正しく動作する', () => {
      const fixedRandom = () => 0.5; // 各ダイスで中央値を返す
      
      const result = rollDice('3d6', fixedRandom);
      expect(result.rolls).toEqual([4, 4, 4]); // d6で4が3回
      expect(result.total).toBe(12);
    });
  });

  describe('能力値修正計算', () => {
    test('標準的な能力値修正を正しく計算する', () => {
      expect(getAbilityModifier(8)).toBe(-1);
      expect(getAbilityModifier(10)).toBe(0);
      expect(getAbilityModifier(12)).toBe(1);
      expect(getAbilityModifier(14)).toBe(2);
      expect(getAbilityModifier(16)).toBe(3);
      expect(getAbilityModifier(18)).toBe(4);
      expect(getAbilityModifier(20)).toBe(5);
    });

    test('極端な能力値での修正計算', () => {
      expect(getAbilityModifier(1)).toBe(-5);
      expect(getAbilityModifier(3)).toBe(-4);
      expect(getAbilityModifier(30)).toBe(10);
    });

    test('プロフィシエンシーボーナスの計算', () => {
      expect(getProficiencyBonus(1)).toBe(2);
      expect(getProficiencyBonus(4)).toBe(2);
      expect(getProficiencyBonus(5)).toBe(3);
      expect(getProficiencyBonus(8)).toBe(3);
      expect(getProficiencyBonus(9)).toBe(4);
      expect(getProficiencyBonus(20)).toBe(6);
    });

    test('スキル修正の計算', () => {
      // レベル5、筋力16、習熟あり
      expect(getSkillModifier(16, 5, true)).toBe(6); // +3(能力値) +3(習熟)
      
      // レベル5、筋力16、習熟なし
      expect(getSkillModifier(16, 5, false)).toBe(3); // +3(能力値)のみ
      
      // レベル5、筋力16、習熟あり、専門技能
      expect(getSkillModifier(16, 5, true, true)).toBe(9); // +3(能力値) +6(習熟×2)
    });
  });

  describe('戦闘計算', () => {
    test('攻撃ロール修正の計算', () => {
      // レベル5、筋力16、+1武器、習熟あり
      expect(calculateAttackRoll(16, 5, 1, true)).toBe(7); // +3(筋力) +3(習熟) +1(武器)
      
      // レベル1、敏捷14、習熟なし
      expect(calculateAttackRoll(14, 1, 0, false)).toBe(2); // +2(敏捷)のみ
    });

    test('ダメージロールの計算', () => {
      const fixedRandom = () => 0.5; // 各ダイスで中央値
      
      // 1d8+筋力修正
      const result = calculateDamageRoll('1d8', 16, 0, fixedRandom);
      expect(result.rolls).toEqual([5]); // d8の中央値
      expect(result.modifier).toBe(3); // 筋力修正
      expect(result.total).toBe(8);
    });

    test('アーマークラス計算', () => {
      // 軽装鎧：敏捷修正をすべて適用
      expect(calculateArmorClass(12, 16, 'light')).toBe(15); // 12+3
      
      // 中装鎧：敏捷修正は最大+2
      expect(calculateArmorClass(14, 16, 'medium')).toBe(16); // 14+2
      
      // 重装鎧：敏捷修正なし
      expect(calculateArmorClass(18, 16, 'heavy')).toBe(18); // 18
    });
  });

  describe('レベル進行とEXP', () => {
    test('EXPからレベルを正しく計算する', () => {
      expect(calculateLevel(0)).toBe(1);
      expect(calculateLevel(299)).toBe(1);
      expect(calculateLevel(300)).toBe(2);
      expect(calculateLevel(899)).toBe(2);
      expect(calculateLevel(900)).toBe(3);
      expect(calculateLevel(100000)).toBe(11);
    });

    test('次のレベルまでのEXPを計算する', () => {
      expect(getExpToNextLevel(0)).toBe(300);
      expect(getExpToNextLevel(200)).toBe(100);
      expect(getExpToNextLevel(300)).toBe(600);
      expect(getExpToNextLevel(355000)).toBe(0); // 最大レベル
    });

    test('EXPテーブルの整合性', () => {
      // テーブルが昇順であることを確認
      for (let i = 1; i < EXP_THRESHOLDS.length; i++) {
        expect(EXP_THRESHOLDS[i]).toBeGreaterThan(EXP_THRESHOLDS[i - 1]);
      }
    });
  });

  describe('統計と確率計算', () => {
    test('ダイス期待値の計算', () => {
      expect(calculateDiceExpectedValue('1d20')).toBe(10.5);
      expect(calculateDiceExpectedValue('2d6')).toBe(7);
      expect(calculateDiceExpectedValue('1d8+3')).toBe(7.5);
      expect(calculateDiceExpectedValue('3d6+6')).toBe(16.5);
    });

    test('成功確率の計算', () => {
      // DC15、修正+5：11以上で成功（50%）
      expect(calculateSuccessProbability(5, 15)).toBeCloseTo(0.5, 2);
      
      // DC10、修正+0：11以上で成功（50%）
      expect(calculateSuccessProbability(0, 10)).toBeCloseTo(0.5, 2);
      
      // DC20、修正+10：11以上で成功（50%）
      expect(calculateSuccessProbability(10, 20)).toBeCloseTo(0.5, 2);
    });

    test('アドバンテージでの成功確率計算', () => {
      const baseChance = 0.5;
      const advChance = calculateSuccessProbability(5, 15, true);
      const disChance = calculateSuccessProbability(5, 15, false, true);
      
      expect(advChance).toBeGreaterThan(baseChance);
      expect(disChance).toBeLessThan(baseChance);
      expect(advChance).toBeCloseTo(0.75, 2); // 1 - (0.5)²
      expect(disChance).toBeCloseTo(0.25, 2); // (0.5)²
    });

    test('クリティカル確率の計算', () => {
      expect(calculateCriticalProbability(20)).toBeCloseTo(0.05, 2); // 5%
      expect(calculateCriticalProbability(19)).toBeCloseTo(0.1, 2);  // 10%
      
      // アドバンテージ付きクリティカル
      const advCrit = calculateCriticalProbability(20, true);
      expect(advCrit).toBeCloseTo(0.0975, 3); // 1 - (0.95)²
    });
  });

  describe('バランス調整', () => {
    test('Challenge Ratingの計算', () => {
      // 標準的な敵の例
      const cr = calculateChallengeRating(50, 15, 7, 12);
      expect(cr).toBeGreaterThan(0);
      expect(cr).toBeLessThan(10);
    });

    test('パーティバランスの評価', () => {
      const balancedParty: BaseStats[] = [
        { strength: 16, dexterity: 12, constitution: 14, intelligence: 10, wisdom: 13, charisma: 8 }, // ファイター
        { strength: 8, dexterity: 16, constitution: 12, intelligence: 14, wisdom: 13, charisma: 10 }, // ローグ
        { strength: 10, dexterity: 14, constitution: 12, intelligence: 16, wisdom: 13, charisma: 8 }, // ウィザード
        { strength: 12, dexterity: 10, constitution: 14, intelligence: 8, wisdom: 16, charisma: 13 }  // クレリック
      ];
      
      const evaluation = evaluatePartyBalance(balancedParty);
      
      expect(evaluation.frontline).toBeGreaterThan(0);
      expect(evaluation.support).toBeGreaterThan(0);
      expect(evaluation.damage).toBeGreaterThan(0);
      expect(evaluation.utility).toBeGreaterThan(0);
      expect(evaluation.balance).toBeGreaterThan(0.5); // それなりにバランスが取れている
    });

    test('空のパーティでの評価', () => {
      const evaluation = evaluatePartyBalance([]);
      expect(evaluation).toEqual({
        frontline: 0, support: 0, damage: 0, utility: 0, balance: 0
      });
    });
  });

  describe('エッジケースと境界値', () => {
    test('ゼロや負の値での計算', () => {
      expect(getAbilityModifier(0)).toBe(-5);
      expect(getProficiencyBonus(0)).toBe(0);
      expect(calculateLevel(-100)).toBe(1); // 最低レベル
    });

    test('極端に大きな値での計算', () => {
      expect(getAbilityModifier(1000)).toBe(495);
      expect(calculateLevel(1000000)).toBe(20); // テーブルの最大レベル
    });

    test('浮動小数点の精度問題', () => {
      // 期待値計算での小数点精度
      const expectedValue = calculateDiceExpectedValue('1d3');
      expect(expectedValue).toBeCloseTo(2, 10);
    });
  });

  describe('ランダム性のテスト', () => {
    test('実際のMath.randomでの動作確認', () => {
      // モックせずに実際のランダム関数を使用
      const results = [];
      for (let i = 0; i < 100; i++) {
        const result = rollDice('1d20');
        results.push(result.total);
      }
      
      // 1-20の範囲内であることを確認
      results.forEach(total => {
        expect(total).toBeGreaterThanOrEqual(1);
        expect(total).toBeLessThanOrEqual(20);
      });
      
      // 統計的な検証（平均が期待値に近い）
      const average = results.reduce((sum, val) => sum + val, 0) / results.length;
      expect(average).toBeGreaterThan(8);  // 期待値10.5の周辺
      expect(average).toBeLessThan(13);
    });

    test('シード可能なランダム関数での再現性', () => {
      let seed = 12345;
      const seededRandom = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
      
      const result1 = rollDice('2d6+3', seededRandom);
      
      // 同じシードでリセット
      seed = 12345;
      const result2 = rollDice('2d6+3', seededRandom);
      
      expect(result1.rolls).toEqual(result2.rolls);
      expect(result1.total).toBe(result2.total);
    });
  });
});