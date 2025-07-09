import { Router } from 'express';
import { conversationService } from '../services/conversationService';
import { ConversationStartRequest, ID } from '@ai-agent-trpg/types';
import { logger } from '../utils/logger';

const router = Router();

// 会話を開始
router.post('/', async (req, res) => {
  try {
    const request: ConversationStartRequest = req.body;
    
    // バリデーション
    if (!request.locationId || !request.initiatorId || !request.targetCharacterIds || request.targetCharacterIds.length === 0) {
      res.status(400).json({ 
        error: 'Missing required fields: locationId, initiatorId, targetCharacterIds' 
      });
      return;
    }

    const conversation = await conversationService.startConversation(request);
    
    logger.info(`Conversation started: ${conversation.id} at location ${conversation.locationId}`);
    res.status(201).json(conversation);
  } catch (error) {
    logger.error('Failed to start conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 特定の会話を取得
router.get('/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await conversationService.getConversation(conversationId as ID);
    
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    res.json(conversation);
  } catch (error) {
    logger.error('Failed to get conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 会話にメッセージを追加
router.post('/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { speakerId, content, messageType, metadata } = req.body;

    if (!speakerId || !content) {
      res.status(400).json({ 
        error: 'Missing required fields: speakerId, content' 
      });
      return;
    }

    const message = await conversationService.addMessage(
      conversationId as ID,
      speakerId,
      content,
      messageType,
      metadata
    );

    res.status(201).json(message);
  } catch (error) {
    logger.error('Failed to add message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 場所でアクティブな会話を取得
router.get('/location/:locationId', async (req, res) => {
  try {
    const { locationId } = req.params;
    const conversations = await conversationService.getActiveConversationsInLocation(locationId as ID);
    
    res.json(conversations);
  } catch (error) {
    logger.error('Failed to get location conversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// キャラクターの会話履歴を取得
router.get('/character/:characterId', async (req, res) => {
  try {
    const { characterId } = req.params;
    const { limit = '10' } = req.query;
    
    const conversations = await conversationService.getCharacterConversations(
      characterId as ID, 
      parseInt(limit as string)
    );
    
    res.json(conversations);
  } catch (error) {
    logger.error('Failed to get character conversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI応答を生成
router.post('/:conversationId/ai-response', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { targetCharacterId, context } = req.body;

    if (!targetCharacterId) {
      res.status(400).json({ 
        error: 'Missing required field: targetCharacterId' 
      });
      return;
    }

    const aiResponse = await conversationService.generateAIResponse(
      conversationId as ID,
      targetCharacterId,
      context
    );

    // AI応答をメッセージとして会話に追加
    const message = await conversationService.addMessage(
      conversationId as ID,
      targetCharacterId,
      aiResponse.response,
      'dialogue',
      {
        emotion: aiResponse.emotion,
        volume: 'normal',
        tone: 'serious',
      }
    );

    res.json({
      aiResponse,
      message,
    });
  } catch (error) {
    logger.error('Failed to generate AI response:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 会話を終了
router.put('/:conversationId/end', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    await conversationService.endConversation(conversationId as ID);
    
    logger.info(`Conversation ended: ${conversationId}`);
    res.json({ message: 'Conversation ended successfully' });
  } catch (error) {
    logger.error('Failed to end conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;