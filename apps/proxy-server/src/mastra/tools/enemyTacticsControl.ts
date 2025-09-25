import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { FocusType } from '@ai-agent-trpg/types';

/**
 * エネミー戦術制御ツール
 * AI Agent可視化・制御システム用
 * 
 * エネミーの戦術レベルに基づいて行動を決定し、
 * TRPGらしい直感的な難易度調整を実現します。
 */
export const enemyTacticsControlTool = createTool({
  id: "enemy-tactics-control",
  description: "エネミーの戦術レベルに基づいて行動を決定",
  inputSchema: z.object({
    tacticsLevel: z.enum(['basic', 'strategic', 'cunning']).describe('戦術レベル'),
    primaryFocus: z.enum(['damage', 'control', 'survival']).describe('主要行動方針'),
    teamwork: z.boolean().describe('チーム連携の有効性'),
    currentSituation: z.string().describe('現在の戦闘状況'),
    availableEnemies: z.array(z.object({
      id: z.string(),
      type: z.string(),
      health: z.number(),
      abilities: z.array(z.string())
    })).describe('利用可能なエネミー一覧'),
    playerCharacters: z.array(z.object({
      id: z.string(),
      class: z.string(),
      health: z.number(),
      role: z.string()
    })).describe('プレイヤーキャラクター情報')
  }),
  outputSchema: z.object({
    enemyAction: z.string().describe('決定されたエネミー行動'),
    reasoning: z.string().describe('行動決定の理由'),
    appliedTactics: z.string().describe('適用された戦術設定'),
    targetPriority: z.array(z.string()).describe('ターゲット優先順位'),
    expectedOutcome: z.string().describe('期待される結果'),
    tacticalAdvantage: z.number().describe('戦術的優位度 (0-100)')
  }),
  execute: async ({ context }) => {
    const { tacticsLevel, primaryFocus, teamwork, availableEnemies, playerCharacters } = context;
    
    logger.info(`🎯 Enemy tactics control: ${tacticsLevel}/${primaryFocus}/teamwork:${teamwork}`);
    
    let enemyAction = "";
    let reasoning = "";
    let targetPriority: string[] = [];
    let expectedOutcome = "";
    let tacticalAdvantage = 0;
    
    // 戦術レベルに基づく基本行動決定
    switch (tacticsLevel) {
      case 'basic':
        // 基本戦術: 単純で直接的
        enemyAction = determineBasicTactics(availableEnemies, playerCharacters, primaryFocus);
        reasoning = "基本戦術: 最も近い敵への直接攻撃を選択";
        tacticalAdvantage = 30;
        expectedOutcome = "プレイヤーが対処しやすい予測可能な行動";
        break;
        
      case 'strategic':
        // 戦術的思考: 効果的な選択
        enemyAction = determineStrategicTactics(availableEnemies, playerCharacters, primaryFocus, teamwork);
        reasoning = "戦術的思考: 弱点を狙った効果的な攻撃を実行";
        tacticalAdvantage = 65;
        expectedOutcome = "バランスの取れた挑戦的な戦闘";
        break;
        
      case 'cunning':
        // 狡猾戦術: 高度な連携
        enemyAction = determineCunningTactics(availableEnemies, playerCharacters, primaryFocus, teamwork);
        reasoning = "狡猾戦術: 罠と心理戦を駆使した高度な戦術を展開";
        tacticalAdvantage = 85;
        expectedOutcome = "高度な戦術を要求する難易度";
        break;
    }
    
    // 行動方針に基づくターゲット優先順位決定
    targetPriority = determineTargetPriority(playerCharacters, primaryFocus);
    
    // チーム連携による修正
    if (teamwork && availableEnemies.length > 1) {
      enemyAction = applyTeamworkModifications(enemyAction, availableEnemies.length);
      reasoning += ` チーム連携により、${availableEnemies.length}体での協調行動を実行。`;
      tacticalAdvantage += 15;
    }
    
    const appliedTactics = `${tacticsLevel}/${primaryFocus}${teamwork ? '/連携' : '/単独'}`;
    
    logger.info(`✅ Enemy action determined: ${enemyAction} (advantage: ${tacticalAdvantage}%)`);
    
    return {
      enemyAction,
      reasoning,
      appliedTactics,
      targetPriority,
      expectedOutcome,
      tacticalAdvantage
    };
  }
});

/**
 * 基本戦術の行動決定
 */
function determineBasicTactics(
  enemies: any[], 
  players: any[], 
  focus: FocusType
): string {
  const enemy = enemies[0];
  const nearestPlayer = players[0]; // 簡易実装: 最初のプレイヤーを対象
  
  switch (focus) {
    case 'damage':
      return `${enemy.type}が${nearestPlayer.class}に直接攻撃`;
    case 'control':
      return `${enemy.type}が${nearestPlayer.class}に状態異常攻撃`;
    case 'survival':
      return `${enemy.type}が防御姿勢を取る`;
    default:
      return `${enemy.type}が基本攻撃を実行`;
  }
}

/**
 * 戦術的思考の行動決定
 */
function determineStrategicTactics(
  enemies: any[], 
  players: any[], 
  focus: FocusType,
  _teamwork: boolean
): string {
  const enemy = enemies[0];
  
  // 戦術的ターゲット選択
  let target = players[0];
  
  // 回復役を優先的に狙う戦術的判断
  const healer = players.find(p => p.class.toLowerCase().includes('cleric') || p.class.toLowerCase().includes('healer'));
  if (healer) {
    target = healer;
  }
  
  switch (focus) {
    case 'damage':
      return `${enemy.type}が戦術的判断により${target.class}に集中攻撃`;
    case 'control':
      return `${enemy.type}が${target.class}の行動を妨害する戦術を実行`;
    case 'survival':
      return `${enemy.type}が戦術的撤退と反撃の機会を狙う`;
    default:
      return `${enemy.type}が戦術的な最適解を選択`;
  }
}

/**
 * 狡猾戦術の行動決定
 */
function determineCunningTactics(
  enemies: any[], 
  _players: any[], 
  focus: FocusType,
  teamwork: boolean
): string {
  const primaryEnemy = enemies[0];
  const supportEnemy = enemies.length > 1 ? enemies[1] : null;
  
  if (teamwork && supportEnemy) {
    switch (focus) {
      case 'damage':
        return `${primaryEnemy.type}が気を引く間に${supportEnemy.type}が後方から奇襲攻撃`;
      case 'control':
        return `${primaryEnemy.type}が範囲妨害、${supportEnemy.type}が個別制圧の連携戦術`;
      case 'survival':
        return `${primaryEnemy.type}が囮となり${supportEnemy.type}が安全確保と援軍召喚`;
      default:
        return `複数エネミーによる高度な連携戦術を展開`;
    }
  } else {
    switch (focus) {
      case 'damage':
        return `${primaryEnemy.type}が罠を設置してからの強力な攻撃コンボ`;
      case 'control':
        return `${primaryEnemy.type}が心理戦と幻惑を駆使した制圧戦術`;
      case 'survival':
        return `${primaryEnemy.type}が戦場環境を利用した巧妙な撤退戦術`;
      default:
        return `${primaryEnemy.type}が狡猾な個人戦術を展開`;
    }
  }
}

/**
 * ターゲット優先順位の決定
 */
function determineTargetPriority(players: any[], focus: FocusType): string[] {
  const priority: string[] = [];
  
  switch (focus) {
    case 'damage':
      // ダメージ重視: 高火力→低HP→回復役の順
      priority.push(...players
        .sort((a, b) => b.health - a.health)
        .map(p => p.class)
      );
      break;
      
    case 'control':
      // 制御重視: 回復役→支援役→攻撃役の順
      const healers = players.filter(p => p.role === 'healer');
      const supporters = players.filter(p => p.role === 'support');
      const attackers = players.filter(p => p.role === 'attacker');
      
      priority.push(
        ...healers.map(p => p.class),
        ...supporters.map(p => p.class),
        ...attackers.map(p => p.class)
      );
      break;
      
    case 'survival':
      // 生存重視: 脅威度の低い順
      priority.push(...players
        .sort((a, b) => a.health - b.health)
        .map(p => p.class)
      );
      break;
      
    default:
      priority.push(...players.map(p => p.class));
  }
  
  return priority;
}

/**
 * チーム連携による行動修正
 */
function applyTeamworkModifications(baseAction: string, enemyCount: number): string {
  if (enemyCount === 1) {
    return baseAction;
  }
  
  const teamworkPhrases = [
    "連携して",
    "協調行動により",
    "チーム戦術で",
    "組織的に"
  ];
  
  const randomPhrase = teamworkPhrases[Math.floor(Math.random() * teamworkPhrases.length)];
  return `${randomPhrase}${baseAction}`;
}