import { useState, useCallback, useEffect } from 'react';
import { 
  CharacterConversation, 
  ConversationMessage, 
  ConversationStartRequest,
  Character,
  ID 
} from '@ai-agent-trpg/types';
import * as conversationApi from '../api/conversations';
import { useSnackbar } from 'notistack';

export function useConversations(locationId?: ID) {
  const [conversations, setConversations] = useState<CharacterConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<CharacterConversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  // 場所の会話を取得
  const fetchLocationConversations = useCallback(async (locId: ID) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await conversationApi.getLocationConversations(locId);
      setConversations(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversations';
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  // 会話を開始
  const startConversation = useCallback(async (request: ConversationStartRequest) => {
    try {
      const newConversation = await conversationApi.startConversation(request);
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversation(newConversation);
      enqueueSnackbar('会話を開始しました', { variant: 'success' });
      return newConversation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start conversation';
      enqueueSnackbar(errorMessage, { variant: 'error' });
      throw err;
    }
  }, [enqueueSnackbar]);

  // メッセージを追加
  const addMessage = useCallback(async (
    conversationId: ID,
    speakerId: ID,
    content: string,
    messageType: ConversationMessage['messageType'] = 'dialogue'
  ) => {
    try {
      const message = await conversationApi.addMessage(conversationId, speakerId, content, messageType);
      
      // ローカル状態を更新
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, messages: [...conv.messages, message] }
            : conv
        )
      );

      if (activeConversation?.id === conversationId) {
        setActiveConversation(prev => 
          prev ? { ...prev, messages: [...prev.messages, message] } : null
        );
      }

      return message;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add message';
      enqueueSnackbar(errorMessage, { variant: 'error' });
      throw err;
    }
  }, [activeConversation, enqueueSnackbar]);

  // AI応答を生成
  const generateAIResponse = useCallback(async (
    conversationId: ID,
    targetCharacterId: ID
  ) => {
    try {
      const { aiResponse, message } = await conversationApi.generateAIResponse(
        conversationId, 
        targetCharacterId
      );
      
      // ローカル状態を更新
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, messages: [...conv.messages, message] }
            : conv
        )
      );

      if (activeConversation?.id === conversationId) {
        setActiveConversation(prev => 
          prev ? { ...prev, messages: [...prev.messages, message] } : null
        );
      }

      return { aiResponse, message };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate AI response';
      enqueueSnackbar(errorMessage, { variant: 'error' });
      throw err;
    }
  }, [activeConversation, enqueueSnackbar]);

  // 会話を終了
  const endConversation = useCallback(async (conversationId: ID) => {
    try {
      await conversationApi.endConversation(conversationId);
      
      // ローカル状態を更新
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, status: 'ended' as const }
            : conv
        )
      );

      if (activeConversation?.id === conversationId) {
        setActiveConversation(null);
      }

      enqueueSnackbar('会話を終了しました', { variant: 'success' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end conversation';
      enqueueSnackbar(errorMessage, { variant: 'error' });
      throw err;
    }
  }, [activeConversation, enqueueSnackbar]);

  // 特定の会話を選択
  const selectConversation = useCallback(async (conversationId: ID) => {
    try {
      const conversation = await conversationApi.getConversation(conversationId);
      setActiveConversation(conversation);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversation';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  }, [enqueueSnackbar]);

  // 場所が変更されたら会話を取得
  useEffect(() => {
    if (locationId) {
      fetchLocationConversations(locationId);
    }
  }, [locationId, fetchLocationConversations]);

  return {
    conversations,
    activeConversation,
    loading,
    error,
    startConversation,
    addMessage,
    generateAIResponse,
    endConversation,
    selectConversation,
    fetchLocationConversations,
  };
}

// キャラクター別の会話フック
export function useCharacterConversations(characterId: ID) {
  const [conversations, setConversations] = useState<CharacterConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  const fetchCharacterConversations = useCallback(async (limit: number = 10) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await conversationApi.getCharacterConversations(characterId, limit);
      setConversations(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch character conversations';
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [characterId, enqueueSnackbar]);

  useEffect(() => {
    fetchCharacterConversations();
  }, [fetchCharacterConversations]);

  return {
    conversations,
    loading,
    error,
    fetchCharacterConversations,
  };
}