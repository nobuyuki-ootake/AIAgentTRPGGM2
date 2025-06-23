import { Router } from 'express';
import { aiCharacterGenerationService } from '../services/aiCharacterGenerationService';
import { GameTheme } from '@ai-agent-trpg/types';

const router = Router();

/**
 * テーマに基づいてキャラクター概要リストを生成（バッチ処理用）
 */
router.post('/generate-character-concepts', async (req, res): Promise<void> => {
  try {
    console.log('=== Character Concepts Request ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { theme, provider = 'google' } = req.body;

    if (!theme) {
      console.log('Error: theme is missing from request');
      res.status(400).json({
        error: 'theme is required'
      });
      return;
    }

    console.log('Using theme:', JSON.stringify(theme, null, 2));
    console.log('Using provider:', provider);

    const concepts = await aiCharacterGenerationService.generateCharacterConcepts(
      theme as GameTheme,
      { provider }
    );

    res.json({
      success: true,
      concepts
    });
  } catch (error) {
    console.error('=== Character Concepts Error ===');
    console.error('Failed to generate character concepts:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({
      error: 'Failed to generate character concepts',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * キャラクター概要から詳細キャラクターを生成（バッチ・単体共通）
 */
router.post('/generate-character-from-concept', async (req, res): Promise<void> => {
  try {
    const { campaignId, concept, theme, provider = 'google' } = req.body;

    if (!campaignId || !concept || !theme) {
      res.status(400).json({
        error: 'campaignId, concept, and theme are required'
      });
      return;
    }

    const character = await aiCharacterGenerationService.generateCharacterFromConcept(
      campaignId,
      concept,
      theme as GameTheme,
      { provider }
    );

    res.json({
      success: true,
      character
    });
  } catch (error) {
    console.error('Failed to generate character from concept:', error);
    res.status(500).json({
      error: 'Failed to generate character from concept',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * テーマに基づいてキャラクターを生成（従来方式）
 */
router.post('/generate-characters-for-theme', async (req, res): Promise<void> => {
  try {
    const { campaignId, theme, provider = 'google' } = req.body;

    if (!campaignId || !theme) {
      res.status(400).json({
        error: 'campaignId and theme are required'
      });
      return;
    }

    const characters = await aiCharacterGenerationService.generateCharactersForTheme(
      campaignId,
      theme as GameTheme,
      { provider }
    );

    res.json({
      success: true,
      characters
    });
  } catch (error) {
    console.error('Failed to generate characters for theme:', error);
    res.status(500).json({
      error: 'Failed to generate characters',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 単一キャラクターをAI生成
 */
router.post('/generate-character', async (req, res): Promise<void> => {
  try {
    console.log('=== /generate-character endpoint called ===');
    console.log('Request headers:', req.headers);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { campaignId, characterType, description, provider = 'google' } = req.body;

    console.log('Extracted parameters:', {
      campaignId,
      characterType,
      description,
      provider
    });

    if (!campaignId || !characterType || !description) {
      console.log('Validation failed - missing required parameters');
      res.status(400).json({
        error: 'campaignId, characterType, and description are required'
      });
      return;
    }

    console.log('Calling aiCharacterGenerationService.generateSingleCharacter...');
    const character = await aiCharacterGenerationService.generateSingleCharacter(
      campaignId,
      characterType,
      description,
      { provider }
    );

    console.log('Character generation successful:', character ? 'Character created' : 'No character returned');
    res.json({
      success: true,
      character
    });
  } catch (error) {
    console.error('=== Character generation error ===');
    console.error('Error details:', error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Request body that caused error:', JSON.stringify(req.body, null, 2));
    
    res.status(500).json({
      error: 'Failed to generate character',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;