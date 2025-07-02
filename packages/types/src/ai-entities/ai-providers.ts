// ==========================================
// AIプロバイダー・リクエスト・メッセージ関連型定義
// ==========================================

import { ID, DateTime } from '../base';

// ==========================================
// AIプロバイダー関連型定義
// ==========================================

export type AIProviderType = 'openai' | 'anthropic' | 'google' | 'custom';

export interface AIProvider {
  id: string;
  name: string;
  type: AIProviderType;
  model: string;
  maxTokens: number;
  temperature: number;
  available: boolean;
  endpoint?: string; // customプロバイダー用
}

export interface AIRequest {
  id?: ID;
  provider: AIProviderType;
  model: string;
  messages?: AIMessage[];
  prompt?: string; // 互換性のため
  response?: string; // 互換性のため
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
  tokensUsed?: number; // 互換性のため
  processingTime?: number; // 互換性のため
  category?: string; // 互換性のため
  timestamp?: DateTime; // 互換性のため
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: DateTime;
}