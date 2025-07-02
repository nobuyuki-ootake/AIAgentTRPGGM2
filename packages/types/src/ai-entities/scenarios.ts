// ==========================================
// ゲームテーマ・シナリオ生成関連型定義
// ==========================================

import { ID, DateTime } from '../base';
import { AIMilestone, EntityPool } from './milestones';

// ==========================================
// ゲームテーマ・シナリオ
// ==========================================

export interface GameTheme {
  id: ID;
  name: string;
  description: string;
  tags: string[];
  atmosphere: string;
  commonElements: string[];
}

export interface SessionScenario {
  id: ID;
  name: string;
  description: string;
  theme: string;
  estimatedDuration: number;
  milestones: AIMilestone[];
  startingConditions: Record<string, any>;
}

export interface ScenarioGenerationRequest {
  campaignId: ID;
  milestoneIds: ID[];
  theme: string;
  playerCount: number;
}

export interface ScenarioGenerationResponse {
  scenario: SessionScenario;
  entities: EntityPool[];
  timeline: string[];
}

export interface ThemeAdaptation {
  themeId: ID;
  adaptations: Record<string, any>;
  playerFeedback: string[];
  effectivenessScore: number;
}

// ==========================================
// インタラクティブイベント・タスク
// ==========================================

export interface ConversationStartRequest {
  characterId: ID;
  npcId: ID;
  context: string;
  location: string;
}

export interface InteractiveEventSession {
  id: ID;
  sessionId: ID;
  eventType: string;
  status: string;
  playerChoices: any[];
  aiResponses: any[];
  currentStep: string;
}

export interface AITaskDefinition {
  id: ID;
  name: string;
  description: string;
  difficulty: number;
  requiredSkills: string[];
  timeLimit?: number;
}

export interface TaskEvaluation {
  taskId: ID;
  playerId: ID;
  success: boolean;
  score: number;
  feedback: string;
  improvements: string[];
}

// ==========================================
// ダイナミック難易度・イベント結果
// ==========================================

export interface DynamicDifficultySettings {
  baseLevel: number;
  adaptationRate: number;
  minLevel: number;
  maxLevel: number;
  playerSkillMetrics: Record<string, number>;
}

export interface EventResult {
  success: boolean;
  score: number;
  description: string;
  consequences: string[];
  nextSteps: string[];
}

export interface RetryOption {
  id: ID;
  description: string;
  cost: string;
  difficultyModifier: number;
}

export interface EventChoice {
  id: ID;
  text: string;
  requirements: string[];
  consequences: EventResult;
}