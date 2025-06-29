import { Database } from 'better-sqlite3';
import { ID, SessionStatus, Character, Quest, Milestone, SessionDurationConfig, TRPGSession } from '@ai-agent-trpg/types';
import { getDatabase } from '../database/database';
import { getAIService } from './aiService';
import { getSessionService } from './sessionService';
import { randomUUID } from 'crypto';

export interface GameOverview {
  id: ID;
  sessionId: ID;
  campaignId: ID;
  
  // セッション概要
  sessionSummary: string;
  currentObjectives: string[];
  keyNPCs: Array<{
    id: ID;
    name: string;
    role: string;
    status: string;
  }>;
  
  // 状況説明
  currentSituation: string;
  atmosphere: string;
  tensions: string[];
  opportunities: string[];
  
  // プレイヤー向け情報
  playerBriefing: string;
  suggestedActions: string[];
  warningsAndHints: string[];
  
  // メタデータ
  generatedAt: string;
  aiProvider: string;
  context: SessionContext;
}

export interface TaskExplanation {
  id: ID;
  sessionId: ID;
  questId?: ID;
  milestoneId?: ID;
  
  // タスク詳細
  taskTitle: string;
  taskDescription: string;
  objectives: TaskObjective[];
  
  // 背景情報
  backgroundContext: string;
  relevantHistory: string[];
  stakeholders: string[];
  
  // 実行ガイダンス
  approachSuggestions: string[];
  potentialChallenges: string[];
  successCriteria: string[];
  failureConsequences: string[];
  
  // 演出要素
  atmosphericDetails: string;
  sensoryDescriptions: string;
  moodSetting: string;
  
  // メタデータ
  difficulty: 'trivial' | 'easy' | 'medium' | 'hard' | 'extreme';
  estimatedDuration: number; // 分
  generatedAt: string;
  aiProvider: string;
}

export interface TaskObjective {
  id: ID;
  description: string;
  type: 'primary' | 'secondary' | 'optional' | 'bonus';
  completed: boolean;
  requirements: string[];
  rewards: {
    experience: number;
    items: string[];
    story: string[];
  };
}

export interface ResultJudgment {
  id: ID;
  sessionId: ID;
  characterId: ID;
  actionDescription: string;
  
  // 判定結果
  outcome: 'critical_success' | 'success' | 'partial_success' | 'failure' | 'critical_failure';
  successLevel: number; // 0-100
  
  // 詳細フィードバック
  immediateResults: string;
  longtermConsequences: string[];
  characterImpact: string;
  storyProgression: string;
  
  // 演出
  dramaticDescription: string;
  atmosphericChanges: string;
  npcReactions: Array<{
    npcId: ID;
    npcName: string;
    reaction: string;
  }>;
  
  // 次の展開
  newOpportunities: string[];
  emergingChallenges: string[];
  suggestedFollowups: string[];
  
  // メタデータ
  difficulty: number;
  modifiers: string[];
  timestamp: string;
  aiProvider: string;
}

export interface ScenarioAdjustment {
  id: ID;
  sessionId: ID;
  
  // 調整理由
  trigger: 'player_success' | 'player_failure' | 'unexpected_action' | 'pacing_issue' | 'story_balance';
  analysis: string;
  
  // 調整内容
  adjustmentType: 'difficulty' | 'story' | 'npcs' | 'environment' | 'objectives';
  adjustments: Array<{
    element: string;
    change: string;
    reasoning: string;
  }>;
  
  // 新しい要素
  newElements: Array<{
    type: 'npc' | 'location' | 'item' | 'event' | 'challenge';
    name: string;
    description: string;
    purpose: string;
  }>;
  
  // GM向けアドバイス
  implementationGuide: string;
  timingRecommendations: string[];
  playerCommunication: string;
  
  // メタデータ
  confidence: number; // 0-100
  timestamp: string;
  aiProvider: string;
}

export interface SessionContext {
  currentSession: TRPGSession;
  characters: Character[];
  activeQuests: Quest[];
  completedMilestones: Milestone[];
  recentEvents: string[];
  campaignTension: number;
  playerEngagement: number;
  storyProgression: number;
  difficulty: string;
  mood: string;
}

// セッション開始時自動生成システム関連の型定義
export interface EntityPool {
  enemies: EntityPoolEnemy[];
  events: EntityPoolEvent[];
  npcs: EntityPoolNPC[];
  items: EntityPoolItem[];
  quests: EntityPoolQuest[];
}

export interface EntityPoolEnemy {
  id: ID;
  name: string;
  description: string;
  level: number;
  hitPoints: number;
  abilities: string[];
  location?: string;
  theme: string;
}

export interface EntityPoolEvent {
  id: ID;
  title: string;
  description: string;
  eventType: 'investigation' | 'social' | 'exploration' | 'puzzle' | 'discovery';
  difficulty: 'easy' | 'medium' | 'hard';
  location?: string;
  theme: string;
  choices: string[];
}

export interface EntityPoolNPC {
  id: ID;
  name: string;
  description: string;
  personality: string;
  role: string;
  location?: string;
  communicationConditions: string[];
  theme: string;
}

export interface EntityPoolItem {
  id: ID;
  name: string;
  description: string;
  itemType: 'key' | 'tool' | 'weapon' | 'consumable';
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  obtainMethods: string[];
  theme: string;
}

export interface EntityPoolQuest {
  id: ID;
  title: string;
  description: string;
  questType: 'main' | 'side' | 'personal';
  difficulty: 'easy' | 'medium' | 'hard';
  requirements: string[];
  rewards: string[];
  theme: string;
}

export interface SessionInitializationResult {
  milestones: Milestone[];
  entityPool: EntityPool;
  gameOverview: GameOverview;
  success: boolean;
  message: string;
}

export class AIGameMasterService {
  private db: Database;

  constructor() {
    this.db = getDatabase();
    this.initTables();
  }

  private initTables(): void {
    // ゲーム概要テーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS game_overviews (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        campaign_id TEXT NOT NULL,
        session_summary TEXT NOT NULL,
        current_objectives TEXT NOT NULL DEFAULT '[]',
        key_npcs TEXT NOT NULL DEFAULT '[]',
        current_situation TEXT NOT NULL,
        atmosphere TEXT NOT NULL,
        tensions TEXT NOT NULL DEFAULT '[]',
        opportunities TEXT NOT NULL DEFAULT '[]',
        player_briefing TEXT NOT NULL,
        suggested_actions TEXT NOT NULL DEFAULT '[]',
        warnings_and_hints TEXT NOT NULL DEFAULT '[]',
        generated_at TEXT NOT NULL,
        ai_provider TEXT NOT NULL,
        context TEXT NOT NULL DEFAULT '{}',
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    // タスク説明テーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS task_explanations (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        quest_id TEXT,
        milestone_id TEXT,
        task_title TEXT NOT NULL,
        task_description TEXT NOT NULL,
        objectives TEXT NOT NULL DEFAULT '[]',
        background_context TEXT NOT NULL,
        relevant_history TEXT NOT NULL DEFAULT '[]',
        stakeholders TEXT NOT NULL DEFAULT '[]',
        approach_suggestions TEXT NOT NULL DEFAULT '[]',
        potential_challenges TEXT NOT NULL DEFAULT '[]',
        success_criteria TEXT NOT NULL DEFAULT '[]',
        failure_consequences TEXT NOT NULL DEFAULT '[]',
        atmospheric_details TEXT NOT NULL,
        sensory_descriptions TEXT NOT NULL,
        mood_setting TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        estimated_duration INTEGER NOT NULL,
        generated_at TEXT NOT NULL,
        ai_provider TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    // 結果判定テーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS result_judgments (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        character_id TEXT NOT NULL,
        action_description TEXT NOT NULL,
        outcome TEXT NOT NULL,
        success_level INTEGER NOT NULL,
        immediate_results TEXT NOT NULL,
        longterm_consequences TEXT NOT NULL DEFAULT '[]',
        character_impact TEXT NOT NULL,
        story_progression TEXT NOT NULL,
        dramatic_description TEXT NOT NULL,
        atmospheric_changes TEXT NOT NULL,
        npc_reactions TEXT NOT NULL DEFAULT '[]',
        new_opportunities TEXT NOT NULL DEFAULT '[]',
        emerging_challenges TEXT NOT NULL DEFAULT '[]',
        suggested_followups TEXT NOT NULL DEFAULT '[]',
        difficulty INTEGER NOT NULL,
        modifiers TEXT NOT NULL DEFAULT '[]',
        timestamp TEXT NOT NULL,
        ai_provider TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    // シナリオ調整テーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scenario_adjustments (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        trigger_type TEXT NOT NULL,
        analysis TEXT NOT NULL,
        adjustment_type TEXT NOT NULL,
        adjustments TEXT NOT NULL DEFAULT '[]',
        new_elements TEXT NOT NULL DEFAULT '[]',
        implementation_guide TEXT NOT NULL,
        timing_recommendations TEXT NOT NULL DEFAULT '[]',
        player_communication TEXT NOT NULL,
        confidence INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        ai_provider TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);
  }

  // セッション開始時のゲーム概要生成
  async generateGameOverview(
    sessionId: ID,
    campaignId: ID,
    context: SessionContext,
    aiSettings: { provider: string; model?: string }
  ): Promise<GameOverview> {
    const prompt = this.buildGameOverviewPrompt(context);

    try {
      // APIキーは環境変数から自動取得される（aiServiceで処理）
      const response = await getAIService().chat({
        provider: aiSettings.provider,
        model: aiSettings.model,
        message: prompt,
        persona: 'gm_assistant',
      });

      // AIからのレスポンスをテキストとしてそのまま使用
      const overview: GameOverview = {
        id: randomUUID(),
        sessionId,
        campaignId,
        sessionSummary: response.message,
        currentObjectives: [],
        keyNPCs: [],
        currentSituation: 'AI生成中',
        atmosphere: 'AI生成による概要',
        tensions: [],
        opportunities: [],
        playerBriefing: response.message,
        suggestedActions: [],
        warningsAndHints: [],
        generatedAt: new Date().toISOString(),
        aiProvider: aiSettings.provider,
        context,
      };

      await this.saveGameOverview(overview);
      
      // GMメッセージとしてチャットに投稿
      await this.postGMMessageToChat(sessionId, response.message);
      
      return overview;
    } catch (error) {
      console.error('Failed to generate game overview:', error);
      return this.generateFallbackOverview(sessionId, campaignId, context);
    }
  }

  private buildGameOverviewPrompt(context: SessionContext): string {
    return `
TRPGセッションのゲームマスターとして、セッション開始時の包括的な概要を読みやすいマークダウン形式で生成してください。

## 現在の状況
- セッション状態: ${context.currentSession.status}
- モード: ${context.currentSession.mode}
- キャンペーンテンション: ${context.campaignTension}/100
- プレイヤー関与度: ${context.playerEngagement}/100
- ストーリー進行度: ${context.storyProgression}/100
- 全体的な難易度: ${context.difficulty}
- 現在のムード: ${context.mood}

## キャラクター情報
${context.characters.map(char => `- ${char.name} (${char.characterType}): レベル${char.level}`).join('\n')}

## アクティブクエスト
${context.activeQuests.map(quest => `- ${quest.title}: ${quest.status}`).join('\n')}

## 完了済みマイルストーン
${context.completedMilestones.map(milestone => `- ${milestone.title}`).join('\n')}

## 最近の出来事
${context.recentEvents.join('\n')}

プレイヤーに向けたゲームマスターの案内として、臨場感のある読みやすいマークダウン形式で説明してください。

セッション開始の雰囲気を演出し、プレイヤーたちにこれから始まる冒険への期待感を与える文章にしてください。

回答はマークダウン形式のみで、メタ情報や説明は含めないでください。
`;
  }

  // タスク内容説明生成
  async generateTaskExplanation(
    sessionId: ID,
    taskContext: {
      questId?: ID;
      milestoneId?: ID;
      taskTitle: string;
      basicDescription: string;
    },
    sessionContext: SessionContext,
    aiSettings: { provider: string; apiKey: string; model?: string }
  ): Promise<TaskExplanation> {
    const prompt = this.buildTaskExplanationPrompt(taskContext, sessionContext);

    try {
      const response = await getAIService().chat({
        provider: aiSettings.provider,
        apiKey: aiSettings.apiKey,
        model: aiSettings.model,
        message: prompt,
        persona: 'story_teller',
      });

      const aiResult = JSON.parse(response.message);
      
      const explanation: TaskExplanation = {
        id: randomUUID(),
        sessionId,
        questId: taskContext.questId,
        milestoneId: taskContext.milestoneId,
        taskTitle: aiResult.taskTitle,
        taskDescription: aiResult.taskDescription,
        objectives: aiResult.objectives || [],
        backgroundContext: aiResult.backgroundContext,
        relevantHistory: aiResult.relevantHistory || [],
        stakeholders: aiResult.stakeholders || [],
        approachSuggestions: aiResult.approachSuggestions || [],
        potentialChallenges: aiResult.potentialChallenges || [],
        successCriteria: aiResult.successCriteria || [],
        failureConsequences: aiResult.failureConsequences || [],
        atmosphericDetails: aiResult.atmosphericDetails,
        sensoryDescriptions: aiResult.sensoryDescriptions,
        moodSetting: aiResult.moodSetting,
        difficulty: aiResult.difficulty || 'medium',
        estimatedDuration: aiResult.estimatedDuration || 60,
        generatedAt: new Date().toISOString(),
        aiProvider: aiSettings.provider,
      };

      await this.saveTaskExplanation(explanation);
      return explanation;
    } catch (error) {
      console.error('Failed to generate task explanation:', error);
      return this.generateFallbackTaskExplanation(sessionId, taskContext);
    }
  }

  private buildTaskExplanationPrompt(taskContext: any, sessionContext: SessionContext): string {
    return `
TRPGのストーリーテラーとして、指定されたタスクの詳細な説明を生成してください。

## タスク基本情報
- タイトル: ${taskContext.taskTitle}
- 基本説明: ${taskContext.basicDescription}

## セッション文脈
- 現在のムード: ${sessionContext.mood}
- 難易度レベル: ${sessionContext.difficulty}
- キャンペーンテンション: ${sessionContext.campaignTension}/100

## キャラクター情報
${sessionContext.characters.map(char => `- ${char.name} (${char.characterType})`).join('\n')}

以下の形式でJSONレスポンスを返してください：

{
  "taskTitle": "魅力的なタスクタイトル",
  "taskDescription": "詳細で没入感のあるタスク説明",
  "objectives": [
    {
      "id": "obj1",
      "description": "目標1の説明",
      "type": "primary",
      "completed": false,
      "requirements": ["要件1", "要件2"],
      "rewards": {
        "experience": 100,
        "items": ["報酬アイテム"],
        "story": ["ストーリー報酬"]
      }
    }
  ],
  "backgroundContext": "このタスクの背景と重要性",
  "relevantHistory": ["関連する過去の出来事1", "関連する過去の出来事2"],
  "stakeholders": ["関係者1", "関係者2"],
  "approachSuggestions": ["アプローチ提案1", "アプローチ提案2"],
  "potentialChallenges": ["予想される困難1", "予想される困難2"],
  "successCriteria": ["成功条件1", "成功条件2"],
  "failureConsequences": ["失敗時の結果1", "失敗時の結果2"],
  "atmosphericDetails": "雰囲気や環境の詳細な描写",
  "sensoryDescriptions": "五感に訴える描写",
  "moodSetting": "ムードや感情的な設定",
  "difficulty": "medium",
  "estimatedDuration": 90
}

回答はJSONのみで、説明文は含めないでください。
`;
  }

  // 結果判定・フィードバック生成
  async generateResultJudgment(
    sessionId: ID,
    characterId: ID,
    actionDescription: string,
    checkResult: {
      outcome: ResultJudgment['outcome'];
      successLevel: number;
      difficulty: number;
      modifiers: string[];
    },
    sessionContext: SessionContext,
    aiSettings: { provider: string; apiKey: string; model?: string }
  ): Promise<ResultJudgment> {
    const prompt = this.buildResultJudgmentPrompt(actionDescription, checkResult, sessionContext);

    try {
      const response = await getAIService().chat({
        provider: aiSettings.provider,
        apiKey: aiSettings.apiKey,
        model: aiSettings.model,
        message: prompt,
        persona: 'gm_assistant',
      });

      const aiResult = JSON.parse(response.message);
      
      const judgment: ResultJudgment = {
        id: randomUUID(),
        sessionId,
        characterId,
        actionDescription,
        outcome: checkResult.outcome,
        successLevel: checkResult.successLevel,
        immediateResults: aiResult.immediateResults,
        longtermConsequences: aiResult.longtermConsequences || [],
        characterImpact: aiResult.characterImpact,
        storyProgression: aiResult.storyProgression,
        dramaticDescription: aiResult.dramaticDescription,
        atmosphericChanges: aiResult.atmosphericChanges,
        npcReactions: aiResult.npcReactions || [],
        newOpportunities: aiResult.newOpportunities || [],
        emergingChallenges: aiResult.emergingChallenges || [],
        suggestedFollowups: aiResult.suggestedFollowups || [],
        difficulty: checkResult.difficulty,
        modifiers: checkResult.modifiers,
        timestamp: new Date().toISOString(),
        aiProvider: aiSettings.provider,
      };

      await this.saveResultJudgment(judgment);
      return judgment;
    } catch (error) {
      console.error('Failed to generate result judgment:', error);
      return this.generateFallbackResultJudgment(sessionId, characterId, actionDescription, checkResult);
    }
  }

  private buildResultJudgmentPrompt(
    actionDescription: string,
    checkResult: any,
    sessionContext: SessionContext
  ): string {
    return `
TRPGゲームマスターとして、プレイヤーの行動結果を劇的で詳細にフィードバックしてください。

## 実行された行動
"${actionDescription}"

## 判定結果
- 結果: ${checkResult.outcome}
- 成功レベル: ${checkResult.successLevel}/100
- 難易度: ${checkResult.difficulty}
- 修正要因: ${checkResult.modifiers.join(', ')}

## セッション文脈
- 現在のムード: ${sessionContext.mood}
- キャンペーンテンション: ${sessionContext.campaignTension}/100

以下の形式でJSONレスポンスを返してください：

{
  "immediateResults": "行動の直接的な結果の詳細な描写",
  "longtermConsequences": ["長期的な影響1", "長期的な影響2"],
  "characterImpact": "キャラクターへの具体的な影響",
  "storyProgression": "ストーリー進行への影響",
  "dramaticDescription": "劇的で臨場感のある結果描写",
  "atmosphericChanges": "雰囲気や環境の変化",
  "npcReactions": [
    {
      "npcId": "npc1",
      "npcName": "NPC名",
      "reaction": "NPCの反応"
    }
  ],
  "newOpportunities": ["新たなチャンス1", "新たなチャンス2"],
  "emergingChallenges": ["新たな困難1", "新たな困難2"],
  "suggestedFollowups": ["推奨次手1", "推奨次手2"]
}

回答はJSONのみで、説明文は含めないでください。
`;
  }

  // 動的シナリオ調整
  async generateScenarioAdjustment(
    sessionId: ID,
    trigger: ScenarioAdjustment['trigger'],
    triggerContext: string,
    sessionContext: SessionContext,
    aiSettings: { provider: string; apiKey: string; model?: string }
  ): Promise<ScenarioAdjustment> {
    const prompt = this.buildScenarioAdjustmentPrompt(trigger, triggerContext, sessionContext);

    try {
      const response = await getAIService().chat({
        provider: aiSettings.provider,
        apiKey: aiSettings.apiKey,
        model: aiSettings.model,
        message: prompt,
        persona: 'gm_assistant',
      });

      const aiResult = JSON.parse(response.message);
      
      const adjustment: ScenarioAdjustment = {
        id: randomUUID(),
        sessionId,
        trigger,
        analysis: aiResult.analysis,
        adjustmentType: aiResult.adjustmentType,
        adjustments: aiResult.adjustments || [],
        newElements: aiResult.newElements || [],
        implementationGuide: aiResult.implementationGuide,
        timingRecommendations: aiResult.timingRecommendations || [],
        playerCommunication: aiResult.playerCommunication,
        confidence: aiResult.confidence || 75,
        timestamp: new Date().toISOString(),
        aiProvider: aiSettings.provider,
      };

      await this.saveScenarioAdjustment(adjustment);
      return adjustment;
    } catch (error) {
      console.error('Failed to generate scenario adjustment:', error);
      return this.generateFallbackScenarioAdjustment(sessionId, trigger);
    }
  }

  private buildScenarioAdjustmentPrompt(
    trigger: ScenarioAdjustment['trigger'],
    triggerContext: string,
    sessionContext: SessionContext
  ): string {
    return `
経験豊富なTRPGゲームマスターとして、現在のセッション状況を分析し、適切なシナリオ調整を提案してください。

## 調整トリガー
- 原因: ${trigger}
- 詳細: ${triggerContext}

## 現在のセッション状況
- プレイヤー関与度: ${sessionContext.playerEngagement}/100
- ストーリー進行度: ${sessionContext.storyProgression}/100
- キャンペーンテンション: ${sessionContext.campaignTension}/100
- 現在の難易度: ${sessionContext.difficulty}
- 現在のムード: ${sessionContext.mood}

以下の形式でJSONレスポンスを返してください：

{
  "analysis": "現在の状況分析と調整が必要な理由",
  "adjustmentType": "difficulty",
  "adjustments": [
    {
      "element": "調整対象の要素",
      "change": "具体的な変更内容",
      "reasoning": "変更の理由"
    }
  ],
  "newElements": [
    {
      "type": "npc",
      "name": "新要素の名前",
      "description": "詳細説明",
      "purpose": "導入目的"
    }
  ],
  "implementationGuide": "実装方法の詳細ガイド",
  "timingRecommendations": ["実装タイミング1", "実装タイミング2"],
  "playerCommunication": "プレイヤーへの伝え方",
  "confidence": 85
}

回答はJSONのみで、説明文は含めないでください。
`;
  }

  // データベース保存メソッド群
  private async saveGameOverview(overview: GameOverview): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO game_overviews (
        id, session_id, campaign_id, session_summary, current_objectives,
        key_npcs, current_situation, atmosphere, tensions, opportunities,
        player_briefing, suggested_actions, warnings_and_hints,
        generated_at, ai_provider, context
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      overview.id,
      overview.sessionId,
      overview.campaignId,
      overview.sessionSummary,
      JSON.stringify(overview.currentObjectives),
      JSON.stringify(overview.keyNPCs),
      overview.currentSituation,
      overview.atmosphere,
      JSON.stringify(overview.tensions),
      JSON.stringify(overview.opportunities),
      overview.playerBriefing,
      JSON.stringify(overview.suggestedActions),
      JSON.stringify(overview.warningsAndHints),
      overview.generatedAt,
      overview.aiProvider,
      JSON.stringify(overview.context),
    ]);
  }

  private async saveTaskExplanation(explanation: TaskExplanation): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO task_explanations (
        id, session_id, quest_id, milestone_id, task_title, task_description,
        objectives, background_context, relevant_history, stakeholders,
        approach_suggestions, potential_challenges, success_criteria,
        failure_consequences, atmospheric_details, sensory_descriptions,
        mood_setting, difficulty, estimated_duration, generated_at, ai_provider
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      explanation.id,
      explanation.sessionId,
      explanation.questId,
      explanation.milestoneId,
      explanation.taskTitle,
      explanation.taskDescription,
      JSON.stringify(explanation.objectives),
      explanation.backgroundContext,
      JSON.stringify(explanation.relevantHistory),
      JSON.stringify(explanation.stakeholders),
      JSON.stringify(explanation.approachSuggestions),
      JSON.stringify(explanation.potentialChallenges),
      JSON.stringify(explanation.successCriteria),
      JSON.stringify(explanation.failureConsequences),
      explanation.atmosphericDetails,
      explanation.sensoryDescriptions,
      explanation.moodSetting,
      explanation.difficulty,
      explanation.estimatedDuration,
      explanation.generatedAt,
      explanation.aiProvider,
    ]);
  }

  private async saveResultJudgment(judgment: ResultJudgment): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO result_judgments (
        id, session_id, character_id, action_description, outcome,
        success_level, immediate_results, longterm_consequences,
        character_impact, story_progression, dramatic_description,
        atmospheric_changes, npc_reactions, new_opportunities,
        emerging_challenges, suggested_followups, difficulty,
        modifiers, timestamp, ai_provider
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      judgment.id,
      judgment.sessionId,
      judgment.characterId,
      judgment.actionDescription,
      judgment.outcome,
      judgment.successLevel,
      judgment.immediateResults,
      JSON.stringify(judgment.longtermConsequences),
      judgment.characterImpact,
      judgment.storyProgression,
      judgment.dramaticDescription,
      judgment.atmosphericChanges,
      JSON.stringify(judgment.npcReactions),
      JSON.stringify(judgment.newOpportunities),
      JSON.stringify(judgment.emergingChallenges),
      JSON.stringify(judgment.suggestedFollowups),
      judgment.difficulty,
      JSON.stringify(judgment.modifiers),
      judgment.timestamp,
      judgment.aiProvider,
    ]);
  }

  private async saveScenarioAdjustment(adjustment: ScenarioAdjustment): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO scenario_adjustments (
        id, session_id, trigger_type, analysis, adjustment_type,
        adjustments, new_elements, implementation_guide,
        timing_recommendations, player_communication, confidence,
        timestamp, ai_provider
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      adjustment.id,
      adjustment.sessionId,
      adjustment.trigger,
      adjustment.analysis,
      adjustment.adjustmentType,
      JSON.stringify(adjustment.adjustments),
      JSON.stringify(adjustment.newElements),
      adjustment.implementationGuide,
      JSON.stringify(adjustment.timingRecommendations),
      adjustment.playerCommunication,
      adjustment.confidence,
      adjustment.timestamp,
      adjustment.aiProvider,
    ]);
  }

  // フォールバック生成メソッド群
  private generateFallbackOverview(sessionId: ID, campaignId: ID, context: SessionContext): GameOverview {
    return {
      id: randomUUID(),
      sessionId,
      campaignId,
      sessionSummary: '冒険は続いています。新たな挑戦があなたたちを待っています。',
      currentObjectives: ['現在の状況を把握する', '次の行動を決定する'],
      keyNPCs: [],
      currentSituation: '現在の状況は安定していますが、注意深く進む必要があります。',
      atmosphere: '緊張感のある静寂が辺りを包んでいます。',
      tensions: ['未知への不安'],
      opportunities: ['新たな発見の可能性'],
      playerBriefing: 'プレイヤーの皆さん、現在の状況を確認し、次の行動を検討してください。',
      suggestedActions: ['周囲を調査する', '仲間と相談する'],
      warningsAndHints: ['慎重に行動することをお勧めします'],
      generatedAt: new Date().toISOString(),
      aiProvider: 'fallback',
      context,
    };
  }

  private generateFallbackTaskExplanation(sessionId: ID, taskContext: any): TaskExplanation {
    return {
      id: randomUUID(),
      sessionId,
      questId: taskContext.questId,
      milestoneId: taskContext.milestoneId,
      taskTitle: taskContext.taskTitle || '重要なタスク',
      taskDescription: taskContext.basicDescription || 'このタスクを完了するために最善を尽くしてください。',
      objectives: [],
      backgroundContext: '詳細な背景情報はまだ明らかになっていません。',
      relevantHistory: [],
      stakeholders: [],
      approachSuggestions: ['慎重に計画を立てる', '仲間と協力する'],
      potentialChallenges: ['未知の困難'],
      successCriteria: ['目標の達成'],
      failureConsequences: ['計画の見直しが必要'],
      atmosphericDetails: '静寂と緊張が漂っています。',
      sensoryDescriptions: '周囲の音に注意を払ってください。',
      moodSetting: '集中力が求められる状況です。',
      difficulty: 'medium',
      estimatedDuration: 60,
      generatedAt: new Date().toISOString(),
      aiProvider: 'fallback',
    };
  }

  private generateFallbackResultJudgment(
    sessionId: ID,
    characterId: ID,
    actionDescription: string,
    checkResult: any
  ): ResultJudgment {
    return {
      id: randomUUID(),
      sessionId,
      characterId,
      actionDescription,
      outcome: checkResult.outcome,
      successLevel: checkResult.successLevel,
      immediateResults: '行動の結果が明らかになりました。',
      longtermConsequences: [],
      characterImpact: 'キャラクターに変化が起こりました。',
      storyProgression: 'ストーリーが進展しました。',
      dramaticDescription: 'あなたの行動は重要な意味を持ちました。',
      atmosphericChanges: '周囲の雰囲気が変化しました。',
      npcReactions: [],
      newOpportunities: [],
      emergingChallenges: [],
      suggestedFollowups: ['次の行動を検討する'],
      difficulty: checkResult.difficulty,
      modifiers: checkResult.modifiers,
      timestamp: new Date().toISOString(),
      aiProvider: 'fallback',
    };
  }

  private generateFallbackScenarioAdjustment(sessionId: ID, trigger: ScenarioAdjustment['trigger']): ScenarioAdjustment {
    return {
      id: randomUUID(),
      sessionId,
      trigger,
      analysis: '現在の状況を分析し、必要に応じて調整を行います。',
      adjustmentType: 'story',
      adjustments: [],
      newElements: [],
      implementationGuide: '状況に応じて柔軟に対応してください。',
      timingRecommendations: ['適切なタイミングで実装'],
      playerCommunication: 'プレイヤーと密接にコミュニケーションを取ってください。',
      confidence: 50,
      timestamp: new Date().toISOString(),
      aiProvider: 'fallback',
    };
  }

  // 公開メソッド：データ取得
  async getGameOverview(sessionId: ID): Promise<GameOverview | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM game_overviews 
      WHERE session_id = ? 
      ORDER BY generated_at DESC 
      LIMIT 1
    `);
    const row = stmt.get(sessionId) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      sessionId: row.session_id,
      campaignId: row.campaign_id,
      sessionSummary: row.session_summary,
      currentObjectives: JSON.parse(row.current_objectives),
      keyNPCs: JSON.parse(row.key_npcs),
      currentSituation: row.current_situation,
      atmosphere: row.atmosphere,
      tensions: JSON.parse(row.tensions),
      opportunities: JSON.parse(row.opportunities),
      playerBriefing: row.player_briefing,
      suggestedActions: JSON.parse(row.suggested_actions),
      warningsAndHints: JSON.parse(row.warnings_and_hints),
      generatedAt: row.generated_at,
      aiProvider: row.ai_provider,
      context: JSON.parse(row.context),
    };
  }

  async getTaskExplanation(sessionId: ID, taskId?: ID): Promise<TaskExplanation | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM task_explanations 
      WHERE session_id = ? ${taskId ? 'AND (quest_id = ? OR milestone_id = ?)' : ''}
      ORDER BY generated_at DESC 
      LIMIT 1
    `);
    
    const row = taskId 
      ? stmt.get(sessionId, taskId, taskId) as any
      : stmt.get(sessionId) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      sessionId: row.session_id,
      questId: row.quest_id,
      milestoneId: row.milestone_id,
      taskTitle: row.task_title,
      taskDescription: row.task_description,
      objectives: JSON.parse(row.objectives),
      backgroundContext: row.background_context,
      relevantHistory: JSON.parse(row.relevant_history),
      stakeholders: JSON.parse(row.stakeholders),
      approachSuggestions: JSON.parse(row.approach_suggestions),
      potentialChallenges: JSON.parse(row.potential_challenges),
      successCriteria: JSON.parse(row.success_criteria),
      failureConsequences: JSON.parse(row.failure_consequences),
      atmosphericDetails: row.atmospheric_details,
      sensoryDescriptions: row.sensory_descriptions,
      moodSetting: row.mood_setting,
      difficulty: row.difficulty,
      estimatedDuration: row.estimated_duration,
      generatedAt: row.generated_at,
      aiProvider: row.ai_provider,
    };
  }

  async getRecentResultJudgments(sessionId: ID, limit: number = 5): Promise<ResultJudgment[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM result_judgments 
      WHERE session_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    
    const rows = stmt.all(sessionId, limit) as any[];
    
    return rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      characterId: row.character_id,
      actionDescription: row.action_description,
      outcome: row.outcome,
      successLevel: row.success_level,
      immediateResults: row.immediate_results,
      longtermConsequences: JSON.parse(row.longterm_consequences),
      characterImpact: row.character_impact,
      storyProgression: row.story_progression,
      dramaticDescription: row.dramatic_description,
      atmosphericChanges: row.atmospheric_changes,
      npcReactions: JSON.parse(row.npc_reactions),
      newOpportunities: JSON.parse(row.new_opportunities),
      emergingChallenges: JSON.parse(row.emerging_challenges),
      suggestedFollowups: JSON.parse(row.suggested_followups),
      difficulty: row.difficulty,
      modifiers: JSON.parse(row.modifiers),
      timestamp: row.timestamp,
      aiProvider: row.ai_provider,
    }));
  }

  async getRecentScenarioAdjustments(sessionId: ID, limit: number = 3): Promise<ScenarioAdjustment[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM scenario_adjustments 
      WHERE session_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    
    const rows = stmt.all(sessionId, limit) as any[];
    
    return rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      trigger: row.trigger_type,
      analysis: row.analysis,
      adjustmentType: row.adjustment_type,
      adjustments: JSON.parse(row.adjustments),
      newElements: JSON.parse(row.new_elements),
      implementationGuide: row.implementation_guide,
      timingRecommendations: JSON.parse(row.timing_recommendations),
      playerCommunication: row.player_communication,
      confidence: row.confidence,
      timestamp: row.timestamp,
      aiProvider: row.ai_provider,
    }));
  }

  /**
   * GMメッセージをセッションチャットに投稿
   */
  private async postGMMessageToChat(sessionId: ID, message: string): Promise<void> {
    try {
      console.log(`💬 GMメッセージ投稿開始 - Session: ${sessionId}, Message length: ${message?.length || 0}`);
      console.log(`💬 Message content: ${message?.substring(0, 100)}...`);
      
      if (!message || message.trim().length === 0) {
        console.error('❌ Empty message cannot be posted to chat');
        return;
      }

      await getSessionService().addChatMessage(sessionId, {
        speaker: 'ゲームマスター',
        message: message.trim(),
        type: 'system',
      });
      
      console.log(`✅ GMメッセージ投稿完了 - Session: ${sessionId}`);
    } catch (error) {
      console.error('❌ Failed to post GM message to chat:', error);
    }
  }

  /**
   * プレイヤーアクションに対するAI応答を生成してチャットに投稿
   */
  async generatePlayerActionResponse(
    sessionId: ID,
    playerCharacterId: ID,
    playerAction: string,
    sessionContext: SessionContext,
    aiSettings: { provider: string; model?: string }
  ): Promise<void> {
    const prompt = this.buildPlayerActionResponsePrompt(playerAction, playerCharacterId, sessionContext);

    try {
      const response = await getAIService().chat({
        provider: aiSettings.provider,
        model: aiSettings.model,
        message: prompt,
        persona: 'gm_assistant',
      });

      // AI応答をチャットに投稿
      await this.postGMMessageToChat(sessionId, response.message);
      
    } catch (error) {
      console.error('Failed to generate player action response:', error);
      
      // フォールバック応答
      const fallbackResponse = this.generateFallbackActionResponse(playerAction);
      await this.postGMMessageToChat(sessionId, fallbackResponse);
    }
  }

  private buildPlayerActionResponsePrompt(
    playerAction: string,
    playerCharacterId: ID,
    sessionContext: SessionContext
  ): string {
    const playerCharacter = sessionContext.characters.find(c => c.id === playerCharacterId);
    const characterName = playerCharacter?.name || 'プレイヤー';

    return `
TRPGのゲームマスターとして、プレイヤーの行動に対して適切に応答してください。

## プレイヤーアクション
${characterName}の行動: "${playerAction}"

## 現在のセッション状況
- セッション状態: ${sessionContext.currentSession.status}
- モード: ${sessionContext.currentSession.mode}
- キャンペーンテンション: ${sessionContext.campaignTension}/100
- 現在のムード: ${sessionContext.mood}

## キャラクター情報
${sessionContext.characters.map(char => 
  `- ${char.name} (${char.characterType}): レベル${char.level}${char.id === playerCharacterId ? ' ★プレイヤー' : ''}`
).join('\n')}

## アクティブクエスト
${sessionContext.activeQuests.map(quest => `- ${quest.title}: ${quest.status}`).join('\n')}

## 最近の出来事
${sessionContext.recentEvents.slice(-3).join('\n')}

ゲームマスターとして以下の点を考慮して応答してください：

1. **NPCや環境の反応**: プレイヤーの行動に対して、NPCや周囲の環境がどう反応するか
2. **結果の描写**: 行動の結果を具体的で臨場感のある文章で描写
3. **新たな情報**: プレイヤーが発見した新しい情報や手がかり
4. **次の展開への誘導**: 自然にストーリーを次の段階へ進める

応答は自然な日本語で、プレイヤーがワクワクするような魅力的な描写にしてください。
メタ情報や説明は含めず、ゲーム内での出来事として直接的に応答してください。
`;
  }

  private generateFallbackActionResponse(playerAction: string): string {
    const responses = [
      `あなたの行動により、周囲の状況に変化が生まれました。注意深く周りを観察してみてください。`,
      `${playerAction}を受けて、新たな可能性が開かれているようです。`,
      `あなたの決断が物語に影響を与えました。どのような結果をもたらすのでしょうか...`,
      `興味深い行動ですね。この選択がどのような運命を導くか、見守りましょう。`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * イベント開始時の導入シーンを生成してチャットに投稿
   */
  async generateEventIntroduction(
    sessionId: ID,
    campaignId: ID,
    eventType: string,
    context: {
      characters: Array<{ name: string; class: string; level: number }>;
      setting: string;
      playerCharacter: string;
      currentScenario: string;
    },
    aiSettings: { provider: string; model?: string },
    customPrompt?: string
  ): Promise<string> {
    const prompt = customPrompt || this.buildEventIntroductionPrompt(eventType, context);

    try {
      console.log(`🎭 イベント導入生成開始 - Session: ${sessionId}, Campaign: ${campaignId}, Type: ${eventType}`);
      
      const response = await getAIService().chat({
        provider: aiSettings.provider,
        model: aiSettings.model,
        message: prompt,
        persona: 'gm_assistant',
      });

      // AI生成されたイベント導入をチャットに投稿
      await this.postGMMessageToChat(sessionId, response.message);
      
      console.log(`✅ イベント導入生成完了 - Campaign: ${campaignId}`);
      return response.message;
      
    } catch (error) {
      console.error(`❌ イベント導入生成失敗 - Campaign: ${campaignId}, Error:`, error);
      
      // フォールバック応答
      const fallbackResponse = this.generateFallbackEventIntroduction(eventType);
      await this.postGMMessageToChat(sessionId, fallbackResponse);
      
      return fallbackResponse;
    }
  }

  private buildEventIntroductionPrompt(
    eventType: string,
    context: {
      characters: Array<{ name: string; class: string; level: number }>;
      setting: string;
      playerCharacter: string;
      currentScenario: string;
    }
  ): string {
    const characterDescriptions = context.characters.map(c => 
      `${c.name}（${c.class} レベル${c.level}）`
    ).join('、');

    return `
TRPGのゲームマスターとして、以下のイベントの導入シーンを魅力的に描写してください。

## イベント情報
- イベントタイプ: ${eventType}
- 設定世界: ${context.setting}
- 現在のシナリオ: ${context.currentScenario}

## 参加キャラクター
${characterDescriptions}
- 主人公: ${context.playerCharacter}

## 導入シーン作成指針

1. **臨場感のある描写**: ${eventType}イベントにふさわしい緊張感や雰囲気を演出
2. **キャラクター配慮**: 参加キャラクターが自然に関わることができる状況設定
3. **プレイヤー誘導**: 最後に「皆さんはどうしますか？」で自然にプレイヤーの行動を促す
4. **適度な長さ**: 200〜300文字程度で集中力を保つ

## 出力形式
イベント導入の描写のみを自然な日本語で記述してください。
メタ情報や説明は含めず、ゲーム内での出来事として直接的に描写し、
最後に「皆さんはどうしますか？」で締めてください。

例：
「突然、森の奥から不穏な唸り声が響いてきました。${context.playerCharacter}たちの前に現れたのは...（イベント内容の描写）...皆さんはどうしますか？」
`;
  }

  private generateFallbackEventIntroduction(eventType: string): string {
    const eventTypeMap: Record<string, string> = {
      'mystery_investigation': '謎の手がかりが発見されました',
      'social_encounter': '重要な人物との出会いがありました', 
      'exploration': '新たな場所への探索が始まります',
      'combat_encounter': '敵との遭遇が発生しました',
      'puzzle_challenge': '謎解きの挑戦が待っています'
    };

    const eventDescription = eventTypeMap[eventType] || `${eventType}イベントが発生しました`;
    
    return `${eventDescription}。周囲の状況を注意深く観察し、慎重に行動してください。皆さんはどうしますか？`;
  }

  /**
   * セッション開始時の自動生成システム - メイン処理
   */
  async initializeSessionWithAI(
    sessionId: ID,
    campaignId: ID,
    durationConfig: SessionDurationConfig,
    characters: Character[],
    campaignTheme: string,
    aiSettings: { provider: string; model?: string }
  ): Promise<SessionInitializationResult> {
    try {
      console.log(`🎯 セッション自動初期化開始 - Session: ${sessionId}, Theme: ${campaignTheme}`);

      // 1. エンティティプール生成
      const entityPool = await this.generateEntityPool(
        campaignId,
        campaignTheme,
        durationConfig,
        characters,
        aiSettings
      );

      // 2. マイルストーン自動生成
      const milestones = await this.generateMilestones(
        campaignId,
        campaignTheme,
        durationConfig,
        entityPool,
        characters,
        aiSettings
      );

      // 3. ゲーム概要生成
      const gameOverview = await this.generateSessionGameOverview(
        sessionId,
        campaignId,
        campaignTheme,
        characters,
        milestones,
        entityPool,
        aiSettings
      );

      // 4. 結果をチャットに投稿
      await this.postInitializationMessageToChat(sessionId, gameOverview);

      console.log(`✅ セッション自動初期化完了 - ${milestones.length}マイルストーン, ${entityPool.enemies.length}エネミー生成`);

      return {
        milestones,
        entityPool,
        gameOverview,
        success: true,
        message: 'セッションが正常に初期化されました'
      };

    } catch (error) {
      console.error('❌ セッション自動初期化失敗:', error);
      
      // エラーを再スローしてフロントエンドで適切にハンドリング
      throw new Error(`セッション初期化に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * エンティティプール生成
   */
  private async generateEntityPool(
    _campaignId: ID,
    campaignTheme: string,
    durationConfig: SessionDurationConfig,
    characters: Character[],
    aiSettings: { provider: string; model?: string }
  ): Promise<EntityPool> {
    const prompt = this.buildEntityPoolPrompt(campaignTheme, durationConfig, characters);

    try {
      const response = await getAIService().chat({
        provider: aiSettings.provider,
        model: aiSettings.model,
        message: prompt,
        persona: 'game_designer',
      });

      // AI応答から構造化データを抽出
      const entityPool = this.parseEntityPoolFromAI(response.message, campaignTheme);
      return entityPool;

    } catch (error) {
      console.error('エンティティプール生成失敗:', error);
      throw new Error(`エンティティプール生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildEntityPoolPrompt(
    campaignTheme: string,
    durationConfig: SessionDurationConfig,
    characters: Character[]
  ): string {
    const characterLevels = characters.map(c => c.level).filter(l => l > 0);
    const avgLevel = characterLevels.length > 0 ? Math.round(characterLevels.reduce((a, b) => a + b, 0) / characterLevels.length) : 1;

    return `
TRPGセッション用のエンティティプールを生成してください。

## セッション情報
- テーマ: ${campaignTheme}
- 期間: ${durationConfig.totalDays}日間
- 1日の行動回数: ${durationConfig.actionsPerDay}
- 総マイルストーン数: ${durationConfig.milestoneCount}
- キャラクター平均レベル: ${avgLevel}

## 生成要件
1. **エネミー**: 3-5体（レベル${avgLevel-1}から${avgLevel+2}）
2. **イベント**: 4-6個（調査、社交、探索、謎解き、発見系）
3. **NPC**: 3-5人（各種役割を持つ重要人物）
4. **アイテム**: 3-5個（キーアイテム、道具、武器、消耗品）
5. **クエスト**: 2-3個（メイン1、サブ1-2）

## テーマ適応ルール
- ほのぼの日常: エネミー無効化、平和的イベント重視
- ホラーミステリー: 謎解き、証拠収集重視
- クラシックファンタジー: 魔王討伐、伝説武器系
- SF宇宙冒険: 未知技術、惑星探索系

## 出力形式（JSON）
\`\`\`json
{
  "enemies": [{"name":"敵名","description":"説明","level":1,"hitPoints":10,"abilities":["能力1"],"theme":"${campaignTheme}"}],
  "events": [{"title":"イベント名","description":"説明","eventType":"investigation","difficulty":"medium","choices":["選択肢1","選択肢2"],"theme":"${campaignTheme}"}],
  "npcs": [{"name":"NPC名","description":"説明","personality":"性格","role":"役割","communicationConditions":["条件1"],"theme":"${campaignTheme}"}],
  "items": [{"name":"アイテム名","description":"説明","itemType":"key","rarity":"uncommon","obtainMethods":["入手方法1"],"theme":"${campaignTheme}"}],
  "quests": [{"title":"クエスト名","description":"説明","questType":"main","difficulty":"medium","requirements":["要件1"],"rewards":["報酬1"],"theme":"${campaignTheme}"}]
}
\`\`\`

JSONのみを出力してください。`;
  }

  private parseEntityPoolFromAI(aiResponse: string, _theme: string): EntityPool {
    try {
      // JSON部分を抽出
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        throw new Error('JSON形式が見つかりません');
      }

      const parsed = JSON.parse(jsonMatch[1]);
      
      // IDを追加
      const entityPool: EntityPool = {
        enemies: (parsed.enemies || []).map((enemy: any) => ({
          id: randomUUID(),
          ...enemy
        })),
        events: (parsed.events || []).map((event: any) => ({
          id: randomUUID(),
          ...event
        })),
        npcs: (parsed.npcs || []).map((npc: any) => ({
          id: randomUUID(),
          ...npc
        })),
        items: (parsed.items || []).map((item: any) => ({
          id: randomUUID(),
          ...item
        })),
        quests: (parsed.quests || []).map((quest: any) => ({
          id: randomUUID(),
          ...quest
        }))
      };

      return entityPool;

    } catch (error) {
      console.error('AI応答パース失敗:', error);
      throw error;
    }
  }

  /**
   * マイルストーン自動生成
   */
  private async generateMilestones(
    campaignId: ID,
    campaignTheme: string,
    durationConfig: SessionDurationConfig,
    entityPool: EntityPool,
    characters: Character[],
    aiSettings: { provider: string; model?: string }
  ): Promise<Milestone[]> {
    const prompt = this.buildMilestonePrompt(campaignTheme, durationConfig, entityPool, characters);

    try {
      const response = await getAIService().chat({
        provider: aiSettings.provider,
        model: aiSettings.model,
        message: prompt,
        persona: 'game_designer',
      });

      const milestones = this.parseMilestonesFromAI(response.message, campaignId);
      return milestones;

    } catch (error) {
      console.error('マイルストーン生成失敗:', error);
      throw new Error(`マイルストーン生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildMilestonePrompt(
    campaignTheme: string,
    durationConfig: SessionDurationConfig,
    entityPool: EntityPool,
    _characters: Character[]
  ): string {
    const enemyNames = entityPool.enemies.map(e => e.name).join(', ');
    const eventTitles = entityPool.events.map(e => e.title).join(', ');
    const npcNames = entityPool.npcs.map(n => n.name).join(', ');
    const itemNames = entityPool.items.map(i => i.name).join(', ');
    const questTitles = entityPool.quests.map(q => q.title).join(', ');

    return `
${durationConfig.milestoneCount}個のマイルストーンを生成してください。

## セッション情報
- テーマ: ${campaignTheme}
- 期間: ${durationConfig.totalDays}日間
- マイルストーン数: ${durationConfig.milestoneCount}

## 利用可能なエンティティ
- エネミー: ${enemyNames}
- イベント: ${eventTitles}  
- NPC: ${npcNames}
- アイテム: ${itemNames}
- クエスト: ${questTitles}

## マイルストーンタイプ
1. 特定エネミー討伐
2. 特定イベントクリア
3. 特定NPCコミュニケーション
4. キーアイテム取得
5. クエストクリア

## テーマ適応
- ほのぼの日常: エネミー討伐マイルストーン無効化
- 他テーマ: 全タイプ有効

## 出力形式（JSON）
\`\`\`json
[
  {
    "title": "マイルストーン名",
    "description": "詳細説明",
    "category": "combat|exploration|social|story|character",
    "importance": "high|medium|low",
    "estimatedTime": 60,
    "requirements": ["要件1", "要件2"],
    "rewards": ["報酬1", "報酬2"]
  }
]
\`\`\`

JSONのみを出力してください。`;
  }

  private parseMilestonesFromAI(aiResponse: string, campaignId: ID): Milestone[] {
    try {
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        throw new Error('JSON形式が見つかりません');
      }

      const parsed = JSON.parse(jsonMatch[1]);
      
      return parsed.map((milestone: any, index: number) => ({
        id: randomUUID(),
        campaignId,
        title: milestone.title,
        description: milestone.description,
        category: milestone.category || 'story',
        status: 'not_started' as const,
        progress: 0,
        estimatedTime: milestone.estimatedTime || 60,
        requirements: (milestone.requirements || []).map((req: string) => ({
          id: randomUUID(),
          description: req,
          type: 'custom' as const,
          completed: false,
          optional: false
        })),
        rewards: {
          experience: 100,
          currency: 0,
          items: [],
          abilities: milestone.rewards || [],
          storyProgression: [milestone.title],
          unlockedContent: []
        },
        dependencies: [],
        tags: [`auto-generated-${index + 1}`],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

    } catch (error) {
      console.error('マイルストーンパース失敗:', error);
      throw error;
    }
  }

  /**
   * セッション用ゲーム概要生成
   */
  private async generateSessionGameOverview(
    sessionId: ID,
    campaignId: ID,
    campaignTheme: string,
    characters: Character[],
    milestones: Milestone[],
    entityPool: EntityPool,
    aiSettings: { provider: string; model?: string }
  ): Promise<GameOverview> {
    const prompt = this.buildSessionOverviewPrompt(campaignTheme, characters, milestones, entityPool);

    try {
      const response = await getAIService().chat({
        provider: aiSettings.provider,
        model: aiSettings.model,
        message: prompt,
        persona: 'gm_assistant',
      });

      return {
        id: randomUUID(),
        sessionId,
        campaignId,
        sessionSummary: response.message,
        currentObjectives: milestones.slice(0, 3).map(m => m.title),
        keyNPCs: entityPool.npcs.map(npc => ({
          id: npc.id,
          name: npc.name,
          role: npc.role,
          status: 'available'
        })),
        currentSituation: '冒険が始まろうとしています。',
        atmosphere: 'わくわくするような期待感に満ちています。',
        tensions: ['未知への不安'],
        opportunities: ['新たな発見', '仲間との絆'],
        playerBriefing: response.message,
        suggestedActions: ['状況を確認する', '仲間と相談する', '周囲を探索する'],
        warningsAndHints: ['慎重に行動しましょう'],
        generatedAt: new Date().toISOString(),
        aiProvider: aiSettings.provider,
        context: {
          currentSession: {} as TRPGSession,
          characters,
          activeQuests: [],
          completedMilestones: [],
          recentEvents: [],
          campaignTension: 30,
          playerEngagement: 80,
          storyProgression: 0,
          difficulty: 'medium',
          mood: 'excited'
        }
      };

    } catch (error) {
      console.error('セッション概要生成失敗:', error);
      throw error;
    }
  }

  private buildSessionOverviewPrompt(
    campaignTheme: string,
    characters: Character[],
    milestones: Milestone[],
    entityPool: EntityPool
  ): string {
    const characterDescriptions = characters.map(c => 
      `${c.name} (${c.characterClass || '冒険者'} Lv.${c.level})`
    ).join(', ');

    return `
TRPGセッション開始時のゲーム概要とプレイヤーへの説明を生成してください。

## セッション設定
- テーマ: ${campaignTheme}
- 参加キャラクター: ${characterDescriptions}

## 主要マイルストーン
${milestones.map(m => `- ${m.title}: ${m.description}`).join('\n')}

## 利用可能な要素
- 重要NPC: ${entityPool.npcs.map(n => n.name).join(', ')}
- 主要イベント: ${entityPool.events.map(e => e.title).join(', ')}
- 重要アイテム: ${entityPool.items.map(i => i.name).join(', ')}

## 要求事項
1. **魅力的な世界観の提示**: ${campaignTheme}にふさわしい雰囲気作り
2. **キャラクターへの歓迎**: プレイヤーキャラクターを自然に物語に組み込む
3. **目標の明確化**: 最初のマイルストーンへの導線を示す
4. **わくわく感の演出**: 冒険への期待感を高める

250-350文字程度で、TRPGゲームマスターとして冒険の始まりを告げてください。
メタ情報は含めず、ゲーム内世界での出来事として自然に描写してください。`;
  }

  /**
   * エラー通知用メソッド
   */

  private async postInitializationMessageToChat(sessionId: ID, gameOverview: GameOverview): Promise<void> {
    try {
      await this.postGMMessageToChat(sessionId, gameOverview.playerBriefing);
      console.log(`✅ セッション初期化メッセージをチャットに投稿完了 - Session: ${sessionId}`);
    } catch (error) {
      console.error('❌ セッション初期化メッセージ投稿失敗:', error);
    }
  }
}

// Export factory function instead of instance to avoid early instantiation
export function createAIGameMasterService(): AIGameMasterService {
  return new AIGameMasterService();
}

// Lazy initialization
let _aiGameMasterService: AIGameMasterService | null = null;
export function getAIGameMasterService(): AIGameMasterService {
  if (!_aiGameMasterService) {
    _aiGameMasterService = new AIGameMasterService();
  }
  return _aiGameMasterService;
}