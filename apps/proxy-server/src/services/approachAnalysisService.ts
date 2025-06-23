import { Database } from 'better-sqlite3';
import { ID } from '@ai-agent-trpg/types';
import { getDatabase } from '../database/database';
import { getAIService } from './aiService';

export interface ApproachAnalysis {
  id: ID;
  sessionId: ID;
  characterId: ID;
  playerInput: string;
  
  // 解析結果
  approachType: 'combat' | 'stealth' | 'social' | 'investigation' | 'magic' | 'creative' | 'direct';
  creativity: number; // 0-100: 創造性スコア
  logicality: number; // 0-100: 論理性スコア
  appropriateness: number; // 0-100: 状況適切性スコア
  feasibility: number; // 0-100: 実現可能性スコア
  
  // 難易度調整
  baseDifficulty: number; // 基本難易度 (5-30)
  adjustedDifficulty: number; // 調整後難易度 (5-30)
  difficultyModifiers: DifficultyModifier[];
  
  // チェック種別
  checkType: 'skill' | 'power' | 'combat' | 'special' | 'narrative';
  recommendedSkills: string[];
  
  // AI評価
  aiEvaluation: {
    reasoning: string;
    suggestions: string[];
    encouragement: string;
    riskAssessment: string;
  };
  
  // リトライ情報
  retryCount: number;
  previousAttempts: string[];
  difficultyReduction: number; // リトライ時の難易度減少量
  
  // メタデータ
  timestamp: string;
  processingTime: number;
  context: GameContext;
}

export interface DifficultyModifier {
  id: ID;
  type: 'creativity_bonus' | 'logic_bonus' | 'appropriateness_penalty' | 'feasibility_penalty' | 
        'character_expertise' | 'situation_modifier' | 'retry_reduction';
  name: string;
  description: string;
  modifier: number; // +/- difficulty points
  reasoning: string;
}

export interface GameContext {
  sessionMode: 'exploration' | 'combat' | 'social';
  currentLocation: string;
  activeNPCs: string[];
  recentEvents: string[];
  campaignTension: number; // 0-100: current story tension
  characterStates: Record<ID, {
    health: number;
    stress: number;
    resources: number;
  }>;
}

export interface ApproachRequest {
  sessionId: ID;
  characterId: ID;
  playerInput: string;
  context: GameContext;
  targetDifficulty?: number;
  // AI settings
  provider: string;
  apiKey: string;
  model?: string;
}

export interface ApproachResponse {
  analysis: ApproachAnalysis;
  recommendedAction: string;
  alternativeApproaches: string[];
  checkInstructions: {
    type: ApproachAnalysis['checkType'];
    difficulty: number;
    skills: string[];
    description: string;
  };
}

export class ApproachAnalysisService {
  private db: Database;

  constructor() {
    this.db = getDatabase();
    this.initTables();
  }

  private initTables(): void {
    // アプローチ解析テーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS approach_analyses (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        character_id TEXT NOT NULL,
        player_input TEXT NOT NULL,
        approach_type TEXT NOT NULL,
        creativity INTEGER NOT NULL,
        logicality INTEGER NOT NULL,
        appropriateness INTEGER NOT NULL,
        feasibility INTEGER NOT NULL,
        base_difficulty INTEGER NOT NULL,
        adjusted_difficulty INTEGER NOT NULL,
        difficulty_modifiers TEXT NOT NULL DEFAULT '[]',
        check_type TEXT NOT NULL,
        recommended_skills TEXT NOT NULL DEFAULT '[]',
        ai_evaluation TEXT NOT NULL DEFAULT '{}',
        retry_count INTEGER NOT NULL DEFAULT 0,
        previous_attempts TEXT NOT NULL DEFAULT '[]',
        difficulty_reduction INTEGER NOT NULL DEFAULT 0,
        timestamp TEXT NOT NULL,
        processing_time INTEGER NOT NULL,
        context TEXT NOT NULL DEFAULT '{}',
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    // 難易度修正要因テーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS difficulty_modifiers (
        id TEXT PRIMARY KEY,
        analysis_id TEXT NOT NULL,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        modifier INTEGER NOT NULL,
        reasoning TEXT NOT NULL,
        FOREIGN KEY (analysis_id) REFERENCES approach_analyses(id) ON DELETE CASCADE
      )
    `);
  }

  async analyzeApproach(request: ApproachRequest): Promise<ApproachResponse> {
    const startTime = Date.now();
    
    try {
      // AI分析を実行
      const aiAnalysis = await this.performAIAnalysis(request);
      
      // 難易度修正要因を計算
      const modifiers = await this.calculateDifficultyModifiers(aiAnalysis, request);
      
      // 最終難易度を計算
      const adjustedDifficulty = this.calculateFinalDifficulty(
        aiAnalysis.baseDifficulty,
        modifiers,
        request
      );

      // 結果を構築
      const analysis: ApproachAnalysis = {
        id: crypto.randomUUID(),
        sessionId: request.sessionId,
        characterId: request.characterId,
        playerInput: request.playerInput,
        approachType: aiAnalysis.approachType,
        creativity: aiAnalysis.creativity,
        logicality: aiAnalysis.logicality,
        appropriateness: aiAnalysis.appropriateness,
        feasibility: aiAnalysis.feasibility,
        baseDifficulty: aiAnalysis.baseDifficulty,
        adjustedDifficulty,
        difficultyModifiers: modifiers,
        checkType: aiAnalysis.checkType,
        recommendedSkills: aiAnalysis.recommendedSkills,
        aiEvaluation: aiAnalysis.aiEvaluation,
        retryCount: await this.getRetryCount(request.sessionId, request.characterId),
        previousAttempts: await this.getPreviousAttempts(request.sessionId, request.characterId),
        difficultyReduction: await this.calculateRetryReduction(request.sessionId, request.characterId),
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        context: request.context,
      };

      // データベースに保存
      await this.saveAnalysis(analysis);

      // レスポンス構築
      const response: ApproachResponse = {
        analysis,
        recommendedAction: await this.generateRecommendedAction(analysis),
        alternativeApproaches: await this.generateAlternativeApproaches(analysis),
        checkInstructions: {
          type: analysis.checkType,
          difficulty: analysis.adjustedDifficulty,
          skills: analysis.recommendedSkills,
          description: await this.generateCheckDescription(analysis),
        },
      };

      return response;
    } catch (error) {
      console.error('Error analyzing approach:', error);
      throw new Error('Failed to analyze approach');
    }
  }

  private async performAIAnalysis(request: ApproachRequest): Promise<{
    approachType: ApproachAnalysis['approachType'];
    creativity: number;
    logicality: number;
    appropriateness: number;
    feasibility: number;
    baseDifficulty: number;
    checkType: ApproachAnalysis['checkType'];
    recommendedSkills: string[];
    aiEvaluation: ApproachAnalysis['aiEvaluation'];
  }> {
    const prompt = `
TRPGゲームマスターとして、プレイヤーのアプローチを詳細に分析してください。

## 状況
- セッションモード: ${request.context.sessionMode}
- 現在地: ${request.context.currentLocation}
- 周囲のNPC: ${request.context.activeNPCs.join(', ') || 'なし'}
- 最近の出来事: ${request.context.recentEvents.join(', ') || 'なし'}
- ストーリーテンション: ${request.context.campaignTension}/100

## プレイヤーの提案
"${request.playerInput}"

## 分析項目
以下の形式でJSONレスポンスを返してください：

{
  "approachType": "combat|stealth|social|investigation|magic|creative|direct",
  "creativity": 0-100の数値,
  "logicality": 0-100の数値, 
  "appropriateness": 0-100の数値,
  "feasibility": 0-100の数値,
  "baseDifficulty": 5-30の数値,
  "checkType": "skill|power|combat|special|narrative",
  "recommendedSkills": ["スキル名の配列"],
  "aiEvaluation": {
    "reasoning": "このアプローチの論理的評価",
    "suggestions": ["改善提案の配列"],
    "encouragement": "プレイヤーへの前向きなコメント",
    "riskAssessment": "リスクと注意点"
  }
}

## 評価基準
- **創造性**: 独創的で面白いアイデアか
- **論理性**: 状況に対して筋道立てて考えられているか  
- **適切性**: 現在の状況・文脈に合っているか
- **実現可能性**: キャラクターの能力で実行可能か
- **基本難易度**: 標準的なプレイヤーにとっての困難さ

回答はJSONのみで、説明文は含めないでください。
`;

    try {
      const response = await getAIService().chat({
        provider: request.provider,
        apiKey: request.apiKey,
        model: request.model,
        message: prompt,
        persona: 'gm_assistant',
      });

      const analysis = JSON.parse(response.message);
      
      // バリデーション
      if (!this.validateAIAnalysis(analysis)) {
        throw new Error('Invalid AI analysis response');
      }

      return analysis;
    } catch (error) {
      console.error('AI analysis failed:', error);
      
      // フォールバック: 基本的な分析を返す
      return {
        approachType: 'direct',
        creativity: 50,
        logicality: 50,
        appropriateness: 50,
        feasibility: 50,
        baseDifficulty: 15,
        checkType: 'skill',
        recommendedSkills: ['一般技能'],
        aiEvaluation: {
          reasoning: 'AI分析が失敗したため、標準的な評価を適用しました。',
          suggestions: ['より具体的なアプローチを検討してください。'],
          encouragement: '素晴らしいアイデアです！挑戦してみましょう。',
          riskAssessment: '通常のリスクがあります。慎重に行動してください。'
        }
      };
    }
  }

  private validateAIAnalysis(analysis: any): boolean {
    const requiredFields = ['approachType', 'creativity', 'logicality', 'appropriateness', 'feasibility', 'baseDifficulty', 'checkType', 'recommendedSkills', 'aiEvaluation'];
    
    for (const field of requiredFields) {
      if (!(field in analysis)) return false;
    }

    // 数値範囲チェック
    if (analysis.creativity < 0 || analysis.creativity > 100) return false;
    if (analysis.logicality < 0 || analysis.logicality > 100) return false;
    if (analysis.appropriateness < 0 || analysis.appropriateness > 100) return false;
    if (analysis.feasibility < 0 || analysis.feasibility > 100) return false;
    if (analysis.baseDifficulty < 5 || analysis.baseDifficulty > 30) return false;

    // aiEvaluationの構造チェック
    const evaluation = analysis.aiEvaluation;
    if (!evaluation || typeof evaluation !== 'object') return false;
    if (!evaluation.reasoning || !evaluation.suggestions || !evaluation.encouragement || !evaluation.riskAssessment) return false;

    return true;
  }

  private async calculateDifficultyModifiers(
    aiAnalysis: any,
    request: ApproachRequest
  ): Promise<DifficultyModifier[]> {
    const modifiers: DifficultyModifier[] = [];

    // 創造性ボーナス
    if (aiAnalysis.creativity >= 80) {
      modifiers.push({
        id: crypto.randomUUID(),
        type: 'creativity_bonus',
        name: '創造性ボーナス',
        description: '非常に創造的なアプローチ',
        modifier: -3,
        reasoning: '独創的なアイデアは予想外の成功をもたらすことがある'
      });
    } else if (aiAnalysis.creativity >= 60) {
      modifiers.push({
        id: crypto.randomUUID(),
        type: 'creativity_bonus',
        name: '創造性ボーナス（小）',
        description: '創造的なアプローチ',
        modifier: -1,
        reasoning: '工夫されたアプローチは若干有利'
      });
    }

    // 論理性ボーナス
    if (aiAnalysis.logicality >= 80) {
      modifiers.push({
        id: crypto.randomUUID(),
        type: 'logic_bonus',
        name: '論理性ボーナス',
        description: '非常に論理的なアプローチ',
        modifier: -2,
        reasoning: '筋道立てた計画は成功率を高める'
      });
    }

    // 適切性ペナルティ
    if (aiAnalysis.appropriateness < 40) {
      modifiers.push({
        id: crypto.randomUUID(),
        type: 'appropriateness_penalty',
        name: '状況不適切ペナルティ',
        description: '状況に適さないアプローチ',
        modifier: 4,
        reasoning: '現在の状況に合わないアプローチは困難を増す'
      });
    } else if (aiAnalysis.appropriateness < 60) {
      modifiers.push({
        id: crypto.randomUUID(),
        type: 'appropriateness_penalty',
        name: '状況不適切ペナルティ（小）',
        description: 'やや状況に適さないアプローチ',
        modifier: 2,
        reasoning: '状況への配慮が不足している'
      });
    }

    // 実現可能性ペナルティ
    if (aiAnalysis.feasibility < 30) {
      modifiers.push({
        id: crypto.randomUUID(),
        type: 'feasibility_penalty',
        name: '実現困難ペナルティ',
        description: '実現が非常に困難',
        modifier: 5,
        reasoning: '現在の能力では実行が極めて困難'
      });
    } else if (aiAnalysis.feasibility < 50) {
      modifiers.push({
        id: crypto.randomUUID(),
        type: 'feasibility_penalty',
        name: '実現困難ペナルティ（小）',
        description: '実現がやや困難',
        modifier: 2,
        reasoning: '能力的に挑戦的なアプローチ'
      });
    }

    // リトライ減少
    const retryCount = await this.getRetryCount(request.sessionId, request.characterId);
    if (retryCount > 0) {
      const reduction = Math.min(retryCount * 2, 6); // 最大6ポイント減少
      modifiers.push({
        id: crypto.randomUUID(),
        type: 'retry_reduction',
        name: 'リトライ補正',
        description: `${retryCount}回目の挑戦`,
        modifier: -reduction,
        reasoning: '経験から学習し、より良いアプローチが可能'
      });
    }

    return modifiers;
  }

  private calculateFinalDifficulty(
    baseDifficulty: number,
    modifiers: DifficultyModifier[],
    request: ApproachRequest
  ): number {
    let finalDifficulty = baseDifficulty;
    
    // 修正要因を適用
    for (const modifier of modifiers) {
      finalDifficulty += modifier.modifier;
    }

    // 目標難易度が指定されている場合は考慮
    if (request.targetDifficulty) {
      const targetDiff = request.targetDifficulty - finalDifficulty;
      if (Math.abs(targetDiff) > 3) {
        finalDifficulty += Math.sign(targetDiff) * Math.min(Math.abs(targetDiff), 3);
      }
    }

    // 範囲制限 (5-30)
    return Math.max(5, Math.min(30, finalDifficulty));
  }

  private async getRetryCount(sessionId: ID, characterId: ID): Promise<number> {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM approach_analyses 
      WHERE session_id = ? AND character_id = ?
      AND timestamp >= datetime('now', '-1 hour')
    `);
    
    const result = stmt.get(sessionId, characterId) as any;
    return result.count || 0;
  }

  private async getPreviousAttempts(sessionId: ID, characterId: ID): Promise<string[]> {
    const stmt = this.db.prepare(`
      SELECT player_input
      FROM approach_analyses 
      WHERE session_id = ? AND character_id = ?
      AND timestamp >= datetime('now', '-1 hour')
      ORDER BY timestamp DESC
      LIMIT 3
    `);
    
    const results = stmt.all(sessionId, characterId) as any[];
    return results.map(r => r.player_input);
  }

  private async calculateRetryReduction(sessionId: ID, characterId: ID): Promise<number> {
    const retryCount = await this.getRetryCount(sessionId, characterId);
    return Math.min(retryCount * 2, 6);
  }

  private async saveAnalysis(analysis: ApproachAnalysis): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO approach_analyses (
        id, session_id, character_id, player_input, approach_type,
        creativity, logicality, appropriateness, feasibility,
        base_difficulty, adjusted_difficulty, difficulty_modifiers,
        check_type, recommended_skills, ai_evaluation,
        retry_count, previous_attempts, difficulty_reduction,
        timestamp, processing_time, context
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      analysis.id,
      analysis.sessionId,
      analysis.characterId,
      analysis.playerInput,
      analysis.approachType,
      analysis.creativity,
      analysis.logicality,
      analysis.appropriateness,
      analysis.feasibility,
      analysis.baseDifficulty,
      analysis.adjustedDifficulty,
      JSON.stringify(analysis.difficultyModifiers),
      analysis.checkType,
      JSON.stringify(analysis.recommendedSkills),
      JSON.stringify(analysis.aiEvaluation),
      analysis.retryCount,
      JSON.stringify(analysis.previousAttempts),
      analysis.difficultyReduction,
      analysis.timestamp,
      analysis.processingTime,
      JSON.stringify(analysis.context),
    ]);
  }

  private async generateRecommendedAction(analysis: ApproachAnalysis): Promise<string> {
    const checkTypeMap = {
      skill: 'スキルチェック',
      power: 'パワーチェック',
      combat: '戦闘判定',
      special: '特殊判定',
      narrative: 'ナラティブ判定'
    };

    const skillsText = analysis.recommendedSkills.length > 0 
      ? `使用スキル: ${analysis.recommendedSkills.join('、')}`
      : '';

    return `${checkTypeMap[analysis.checkType]}を実行してください。難易度: ${analysis.adjustedDifficulty} ${skillsText}`;
  }

  private async generateAlternativeApproaches(analysis: ApproachAnalysis): Promise<string[]> {
    const alternatives: string[] = [];

    // アプローチタイプに基づく代替案
    switch (analysis.approachType) {
      case 'direct':
        alternatives.push('より慎重なアプローチを検討する', '周囲の状況をよく観察してから行動する');
        break;
      case 'stealth':
        alternatives.push('正面からのアプローチを試す', '仲間と連携して注意を逸らす');
        break;
      case 'social':
        alternatives.push('情報収集から始める', '異なる相手にアプローチする');
        break;
      case 'investigation':
        alternatives.push('物理的な手がかりを探す', '関係者に直接尋ねる');
        break;
      case 'magic':
        alternatives.push('非魔法的な手段を考える', '魔法の効果を弱めて安全性を高める');
        break;
      case 'creative':
        alternatives.push('より基本的なアプローチを試す', '段階的に複雑さを増していく');
        break;
      case 'combat':
        alternatives.push('交渉による解決を試す', '戦術的退却を検討する');
        break;
    }

    // 評価スコアに基づく追加提案
    if (analysis.creativity < 50) {
      alternatives.push('より創造的な解決策を考える');
    }
    if (analysis.logicality < 50) {
      alternatives.push('計画をもう一度整理する');
    }
    if (analysis.appropriateness < 50) {
      alternatives.push('現在の状況により適した方法を検討する');
    }

    return alternatives.slice(0, 3); // 最大3つの代替案
  }

  private async generateCheckDescription(analysis: ApproachAnalysis): Promise<string> {
    const difficulty = analysis.adjustedDifficulty;
    let difficultyText = '';
    
    if (difficulty <= 8) difficultyText = '非常に簡単';
    else if (difficulty <= 12) difficultyText = '簡単';
    else if (difficulty <= 16) difficultyText = '普通';
    else if (difficulty <= 20) difficultyText = '困難';
    else if (difficulty <= 25) difficultyText = '非常に困難';
    else difficultyText = '極めて困難';

    const modifierDescriptions = analysis.difficultyModifiers
      .filter(m => Math.abs(m.modifier) >= 2)
      .map(m => `${m.name}(${m.modifier > 0 ? '+' : ''}${m.modifier})`)
      .join('、');

    let description = `${difficultyText}な判定です（難易度${difficulty}）。`;
    
    if (modifierDescriptions) {
      description += ` 修正: ${modifierDescriptions}`;
    }

    return description;
  }

  // 公開メソッド
  async getAnalysisHistory(sessionId: ID, limit: number = 10): Promise<ApproachAnalysis[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM approach_analyses
      WHERE session_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    
    const rows = stmt.all(sessionId, limit) as any[];
    
    return rows.map(this.mapRowToAnalysis);
  }

  async getAnalysisById(id: ID): Promise<ApproachAnalysis | null> {
    const stmt = this.db.prepare('SELECT * FROM approach_analyses WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return this.mapRowToAnalysis(row);
  }

  private mapRowToAnalysis(row: any): ApproachAnalysis {
    return {
      id: row.id,
      sessionId: row.session_id,
      characterId: row.character_id,
      playerInput: row.player_input,
      approachType: row.approach_type,
      creativity: row.creativity,
      logicality: row.logicality,
      appropriateness: row.appropriateness,
      feasibility: row.feasibility,
      baseDifficulty: row.base_difficulty,
      adjustedDifficulty: row.adjusted_difficulty,
      difficultyModifiers: JSON.parse(row.difficulty_modifiers),
      checkType: row.check_type,
      recommendedSkills: JSON.parse(row.recommended_skills),
      aiEvaluation: JSON.parse(row.ai_evaluation),
      retryCount: row.retry_count,
      previousAttempts: JSON.parse(row.previous_attempts),
      difficultyReduction: row.difficulty_reduction,
      timestamp: row.timestamp,
      processingTime: row.processing_time,
      context: JSON.parse(row.context),
    };
  }
}

// Lazy initialization to avoid early instantiation
let _approachAnalysisService: ApproachAnalysisService | null = null;
export function getApproachAnalysisService(): ApproachAnalysisService {
  if (!_approachAnalysisService) {
    _approachAnalysisService = new ApproachAnalysisService();
  }
  return _approachAnalysisService;
}