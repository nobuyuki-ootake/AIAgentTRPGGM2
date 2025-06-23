import { Router, Request, Response } from 'express';
import { getApproachAnalysisService, ApproachRequest } from '../services/approachAnalysisService';
import { asyncHandler, ValidationError, AIServiceError } from '../middleware/errorHandler';

const router = Router();

/**
 * @route POST /api/approach-analysis/analyze
 * @desc プレイヤーのアプローチを分析
 */
router.post('/analyze', asyncHandler(async (req: Request, res: Response) => {
  const {
    sessionId,
    characterId,
    playerInput,
    context,
    targetDifficulty,
    provider,
    apiKey,
    model
  } = req.body as ApproachRequest;

  // 必須フィールドの検証
  if (!sessionId || !characterId || !playerInput || !context || !provider || !apiKey) {
    throw new ValidationError('Session ID, character ID, player input, context, provider, and API key are required');
  }

  if (!playerInput.trim()) {
    throw new ValidationError('Player input cannot be empty');
  }

  try {
    const response = await getApproachAnalysisService().analyzeApproach({
      sessionId,
      characterId,
      playerInput: playerInput.trim(),
      context,
      targetDifficulty,
      provider,
      apiKey,
      model,
    });

    return res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error analyzing approach:', error);
    
    if (error instanceof Error && error.message.includes('AI')) {
      throw new AIServiceError(
        'Failed to analyze approach using AI',
        provider,
        { originalError: error.message }
      );
    }
    
    throw new Error('Failed to analyze approach');
  }
}));

/**
 * @route GET /api/approach-analysis/history/:sessionId
 * @desc セッションのアプローチ分析履歴を取得
 */
router.get('/history/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { limit } = req.query;

  if (!sessionId) {
    throw new ValidationError('Session ID is required');
  }

  try {
    const history = await getApproachAnalysisService().getAnalysisHistory(
      sessionId,
      limit ? parseInt(limit as string) : 10
    );

    return res.json({
      success: true,
      data: history,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching analysis history:', error);
    throw new Error('Failed to fetch analysis history');
  }
}));

/**
 * @route GET /api/approach-analysis/:analysisId
 * @desc 特定の分析結果を取得
 */
router.get('/:analysisId', asyncHandler(async (req: Request, res: Response) => {
  const { analysisId } = req.params;

  if (!analysisId) {
    throw new ValidationError('Analysis ID is required');
  }

  try {
    const analysis = await getApproachAnalysisService().getAnalysisById(analysisId);

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found',
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching analysis:', error);
    throw new Error('Failed to fetch analysis');
  }
}));

/**
 * @route POST /api/approach-analysis/quick-analyze
 * @desc 簡易アプローチ分析（AI使用なし）
 */
router.post('/quick-analyze', asyncHandler(async (req: Request, res: Response) => {
  const { playerInput, context } = req.body;

  if (!playerInput || !context) {
    throw new ValidationError('Player input and context are required');
  }

  try {
    // 簡易分析ロジック（AI未使用）
    const quickAnalysis = {
      approachType: classifyApproachType(playerInput),
      estimatedDifficulty: estimateDifficulty(playerInput, context),
      recommendedCheckType: recommendCheckType(playerInput),
      suggestions: generateBasicSuggestions(playerInput),
    };

    return res.json({
      success: true,
      data: quickAnalysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in quick analysis:', error);
    throw new Error('Failed to perform quick analysis');
  }
}));

/**
 * @route POST /api/approach-analysis/batch-analyze
 * @desc 複数のアプローチを一度に分析
 */
router.post('/batch-analyze', asyncHandler(async (req: Request, res: Response) => {
  const { approaches, provider, apiKey, model } = req.body;

  if (!approaches || !Array.isArray(approaches) || approaches.length === 0) {
    throw new ValidationError('Approaches array is required and cannot be empty');
  }

  if (!provider || !apiKey) {
    throw new ValidationError('Provider and API key are required');
  }

  if (approaches.length > 5) {
    throw new ValidationError('Maximum 5 approaches can be analyzed at once');
  }

  try {
    const results = [];

    for (const approach of approaches) {
      if (!approach.sessionId || !approach.characterId || !approach.playerInput || !approach.context) {
        results.push({
          error: 'Missing required fields',
          approach: approach.playerInput?.substring(0, 50) || 'Unknown',
        });
        continue;
      }

      try {
        const response = await getApproachAnalysisService().analyzeApproach({
          ...approach,
          provider,
          apiKey,
          model,
        });
        
        results.push({
          success: true,
          data: response,
        });
      } catch (error) {
        results.push({
          error: error instanceof Error ? error.message : 'Analysis failed',
          approach: approach.playerInput?.substring(0, 50) || 'Unknown',
        });
      }
    }

    return res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in batch analysis:', error);
    throw new Error('Failed to perform batch analysis');
  }
}));

// ヘルパー関数（簡易分析用）
function classifyApproachType(input: string): string {
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes('攻撃') || lowerInput.includes('戦闘') || lowerInput.includes('戦う')) {
    return 'combat';
  } else if (lowerInput.includes('隠れ') || lowerInput.includes('こっそり') || lowerInput.includes('忍び')) {
    return 'stealth';
  } else if (lowerInput.includes('話') || lowerInput.includes('交渉') || lowerInput.includes('説得')) {
    return 'social';
  } else if (lowerInput.includes('調べ') || lowerInput.includes('探') || lowerInput.includes('調査')) {
    return 'investigation';
  } else if (lowerInput.includes('魔法') || lowerInput.includes('呪文') || lowerInput.includes('魔術')) {
    return 'magic';
  } else {
    return 'direct';
  }
}

function estimateDifficulty(input: string, context: any): number {
  let baseDifficulty = 15; // 基本難易度
  
  // 入力の複雑さで調整
  if (input.length > 100) baseDifficulty -= 2; // 詳細な計画は有利
  if (input.length < 20) baseDifficulty += 2; // 簡潔すぎる場合は不利
  
  // 状況テンションで調整
  if (context.campaignTension > 70) baseDifficulty += 3;
  if (context.campaignTension < 30) baseDifficulty -= 2;
  
  return Math.max(5, Math.min(25, baseDifficulty));
}

function recommendCheckType(input: string): string {
  const approachType = classifyApproachType(input);
  
  switch (approachType) {
    case 'combat': return 'combat';
    case 'stealth': return 'skill';
    case 'social': return 'skill';
    case 'investigation': return 'skill';
    case 'magic': return 'special';
    default: return 'skill';
  }
}

function generateBasicSuggestions(input: string): string[] {
  const suggestions = [
    '詳細な計画を立ててみてください',
    '他のキャラクターとの連携を考慮してください',
    'リスクと利益を慎重に検討してください',
  ];
  
  const approachType = classifyApproachType(input);
  
  switch (approachType) {
    case 'combat':
      suggestions.push('戦術的ポジショニングを考慮してください');
      break;
    case 'stealth':
      suggestions.push('環境や敵の視界を活用してください');
      break;
    case 'social':
      suggestions.push('相手の動機や感情を考慮してください');
      break;
    case 'investigation':
      suggestions.push('体系的な調査方法を検討してください');
      break;
    case 'magic':
      suggestions.push('魔法の副作用や制限を考慮してください');
      break;
  }
  
  return suggestions;
}

export { router as approachAnalysisRouter };