// ==========================================
// AI プロバイダーサービス
// 基本的なAI接続・認証・リクエスト処理機能
// aiService.tsから分割 (800行以下の適切なサイズ)
// ==========================================

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { AIRequest, AIProviderType } from '@ai-agent-trpg/types';
import { logger } from '../utils/logger';
import { AIServiceError, ValidationError } from '../middleware/errorHandler';
import { getDatabase } from '../database/database';

// ==========================================
// 型定義
// ==========================================

export interface AIServiceRequest {
  provider: string;
  apiKey?: string; // オプショナル（環境変数から取得可能）
  model?: string;
  message?: string;
  systemPrompt?: string;
  context?: Record<string, any>;
  temperature?: number;
  maxTokens?: number;
}

export interface AIServiceResponse {
  response: string;
  tokensUsed?: number;
  processingTime: number;
  provider: string;
  model: string;
}

// ==========================================
// AI プロバイダーサービスクラス
// ==========================================

export class AIProviderService {
  private readonly defaultModels = {
    openai: 'gpt-3.5-turbo',
    anthropic: 'claude-3-haiku-20240307',
    google: 'gemini-2.0-flash-lite',
  };

  private readonly defaultTemperature = 0.7;
  private readonly defaultMaxTokens = 2000;

  // ==========================================
  // API キー管理
  // ==========================================

  /**
   * 環境変数からAPIキーを取得
   */
  private getApiKeyFromEnv(provider: string): string | null {
    switch (provider.toLowerCase()) {
      case 'openai':
        return process.env.OPENAI_API_KEY || null;
      case 'anthropic':
        return process.env.ANTHROPIC_API_KEY || null;
      case 'google':
        return process.env.GOOGLE_API_KEY || null;
      default:
        return null;
    }
  }

  /**
   * APIキーを取得（環境変数を優先、フォールバックでリクエストから）
   */
  private getApiKey(provider: string, requestApiKey?: string): string {
    const envApiKey = this.getApiKeyFromEnv(provider);
    
    if (envApiKey) {
      logger.debug(`Using API key from environment for provider: ${provider}`);
      return envApiKey;
    }
    
    if (requestApiKey) {
      logger.debug(`Using API key from request for provider: ${provider}`);
      return requestApiKey;
    }
    
    throw new ValidationError(`No API key found for provider: ${provider}. Please set ${provider.toUpperCase()}_API_KEY environment variable.`);
  }

  // ==========================================
  // 接続テスト
  // ==========================================

  /**
   * プロバイダー接続テスト
   */
  async testProviderConnection(
    provider: string, 
    apiKey: string, 
    model?: string
  ): Promise<boolean> {
    const testModel = model || this.defaultModels[provider as keyof typeof this.defaultModels];
    
    try {
      const startTime = Date.now();
      
      const response = await this.makeAIRequest({
        provider,
        apiKey,
        model: testModel,
        message: 'Test connection. Please respond with "Connection successful."',
        maxTokens: 50,
        temperature: 0,
      });

      const processingTime = Date.now() - startTime;
      
      logger.info(`AI Provider test successful: ${provider} (${processingTime}ms)`);
      return response.response.toLowerCase().includes('connection successful');
      
    } catch (error) {
      logger.error(`AI Provider test failed: ${provider}`, error);
      return false;
    }
  }

  // ==========================================
  // 基本AIリクエスト処理
  // ==========================================

  /**
   * 汎用AIリクエスト実行
   */
  async makeAIRequest(params: AIServiceRequest): Promise<AIServiceResponse> {
    const startTime = Date.now();
    const model = params.model || this.defaultModels[params.provider as keyof typeof this.defaultModels];
    
    // 環境変数からAPIキーを取得
    const apiKey = this.getApiKey(params.provider, params.apiKey);
    const requestWithApiKey = { ...params, apiKey };
    
    try {
      let response: string;
      let tokensUsed: number | undefined;

      switch (params.provider.toLowerCase()) {
        case 'openai':
          ({ response, tokensUsed } = await this.callOpenAI(requestWithApiKey, model));
          break;
        case 'anthropic':
          ({ response, tokensUsed } = await this.callAnthropic(requestWithApiKey, model));
          break;
        case 'google':
          ({ response, tokensUsed } = await this.callGoogle(requestWithApiKey, model));
          break;
        case 'custom':
          ({ response, tokensUsed } = await this.callCustomEndpoint(requestWithApiKey, model));
          break;
        default:
          throw new ValidationError(`Unsupported AI provider: ${params.provider}`);
      }

      const processingTime = Date.now() - startTime;

      return {
        response,
        tokensUsed,
        processingTime,
        provider: params.provider,
        model,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`AI request failed: ${params.provider}`, error);
      
      throw new AIServiceError(
        error instanceof Error ? error.message : 'Unknown AI service error',
        params.provider,
        { model, processingTime }
      );
    }
  }

  // ==========================================
  // プロバイダー別実装
  // ==========================================

  /**
   * OpenAI API 呼び出し
   */
  private async callOpenAI(params: AIServiceRequest, model: string) {
    if (!params.apiKey) {
      throw new ValidationError('OpenAI API key is required');
    }
    
    const openai = new OpenAI({ apiKey: params.apiKey });
    
    const messages: OpenAI.Chat.Completions.ChatCompletionMessage[] = [];
    
    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }
    
    if (params.message) {
      messages.push({ role: 'user', content: params.message });
    }

    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature: params.temperature || this.defaultTemperature,
      max_tokens: params.maxTokens || this.defaultMaxTokens,
    });

    return {
      response: completion.choices[0]?.message?.content || '',
      tokensUsed: completion.usage?.total_tokens,
    };
  }

  /**
   * Anthropic API 呼び出し
   */
  private async callAnthropic(params: AIServiceRequest, model: string) {
    if (!params.apiKey) {
      throw new ValidationError('Anthropic API key is required');
    }
    
    const anthropic = new Anthropic({ apiKey: params.apiKey });
    
    const completion = await anthropic.messages.create({
      model,
      max_tokens: params.maxTokens || this.defaultMaxTokens,
      system: params.systemPrompt,
      messages: params.message ? [{ role: 'user', content: params.message }] : [],
      temperature: params.temperature || this.defaultTemperature,
    });

    return {
      response: completion.content[0]?.type === 'text' ? completion.content[0].text : '',
      tokensUsed: completion.usage?.input_tokens + completion.usage?.output_tokens,
    };
  }

  /**
   * Google Gemini API 呼び出し
   */
  private async callGoogle(params: AIServiceRequest, model: string) {
    if (!params.apiKey) {
      throw new ValidationError('Google API key is required');
    }
    
    const genAI = new GoogleGenerativeAI(params.apiKey);
    const geminiModel = genAI.getGenerativeModel({ model });

    const prompt = params.systemPrompt 
      ? `${params.systemPrompt}\n\nUser: ${params.message}`
      : params.message || '';

    const result = await geminiModel.generateContent(prompt);
    const response = result.response;

    return {
      response: response.text(),
      tokensUsed: undefined, // Google doesn't provide token usage in the same way
    };
  }

  /**
   * カスタムエンドポイント呼び出し（OpenAI互換）
   */
  private async callCustomEndpoint(params: AIServiceRequest, model: string) {
    if (!params.apiKey) {
      throw new ValidationError('API key is required for custom endpoint');
    }
    
    // カスタムエンドポイント（OpenAI互換API）のサポート
    const endpoint = params.context?.endpoint || 'http://localhost:8000/v1';
    
    const requestData = {
      model,
      messages: [
        ...(params.systemPrompt ? [{ role: 'system', content: params.systemPrompt }] : []),
        ...(params.message ? [{ role: 'user', content: params.message }] : []),
      ],
      temperature: params.temperature || this.defaultTemperature,
      max_tokens: params.maxTokens || this.defaultMaxTokens,
    };

    const response = await axios.post(`${endpoint}/chat/completions`, requestData, {
      headers: {
        'Authorization': `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    return {
      response: response.data.choices[0]?.message?.content || '',
      tokensUsed: response.data.usage?.total_tokens,
    };
  }

  // ==========================================
  // ログ記録
  // ==========================================

  /**
   * AIリクエストをデータベースにログ記録
   */
  async logAIRequest(request: {
    provider: string;
    model: string;
    prompt: string;
    response: string;
    tokensUsed?: number;
    processingTime: number;
    category: string;
    context?: any;
    campaignId?: string;
  }): Promise<void> {
    const db = getDatabase();
    
    const aiRequest: Omit<AIRequest, 'id'> = {
      provider: request.provider as AIProviderType,
      model: request.model,
      prompt: request.prompt,
      context: request.context || {},
      timestamp: new Date().toISOString(),
      response: request.response,
      tokensUsed: request.tokensUsed,
      processingTime: request.processingTime,
      category: request.category as any,
    };

    try {
      db.prepare(`
        INSERT INTO ai_requests (
          provider, model, prompt, context, timestamp, response, 
          tokens_used, processing_time, category
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        aiRequest.provider,
        aiRequest.model,
        aiRequest.prompt,
        JSON.stringify(aiRequest.context),
        aiRequest.timestamp,
        aiRequest.response,
        aiRequest.tokensUsed || 0,
        aiRequest.processingTime,
        aiRequest.category
      );

      logger.debug(`AI request logged: ${request.provider}/${request.category}`);
    } catch (error) {
      logger.error('Failed to log AI request:', error);
    }
  }
}

// シングルトンインスタンス
export const aiProviderService = new AIProviderService();