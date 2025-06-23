import { 
  CharacterConversation, 
  ConversationMessage, 
  ConversationStartRequest,
  AIConversationResponse,
  ID, 
} from '@ai-agent-trpg/types';

const API_BASE = '/api/conversations';

// 会話を開始
export async function startConversation(request: ConversationStartRequest): Promise<CharacterConversation> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start conversation');
  }

  return response.json();
}

// 特定の会話を取得
export async function getConversation(conversationId: ID): Promise<CharacterConversation> {
  const response = await fetch(`${API_BASE}/${conversationId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get conversation');
  }

  return response.json();
}

// 会話にメッセージを追加
export async function addMessage(
  conversationId: ID,
  speakerId: ID,
  content: string,
  messageType: ConversationMessage['messageType'] = 'dialogue',
  metadata?: ConversationMessage['metadata'],
): Promise<ConversationMessage> {
  const response = await fetch(`${API_BASE}/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      speakerId,
      content,
      messageType,
      metadata,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add message');
  }

  return response.json();
}

// 場所でアクティブな会話を取得
export async function getLocationConversations(locationId: ID): Promise<CharacterConversation[]> {
  const response = await fetch(`${API_BASE}/location/${locationId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get location conversations');
  }

  return response.json();
}

// キャラクターの会話履歴を取得
export async function getCharacterConversations(
  characterId: ID, 
  limit: number = 10,
): Promise<CharacterConversation[]> {
  const response = await fetch(`${API_BASE}/character/${characterId}?limit=${limit}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get character conversations');
  }

  return response.json();
}

// AI応答を生成
export async function generateAIResponse(
  conversationId: ID,
  targetCharacterId: ID,
  context?: any,
): Promise<{ aiResponse: AIConversationResponse; message: ConversationMessage }> {
  const response = await fetch(`${API_BASE}/${conversationId}/ai-response`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      targetCharacterId,
      context,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate AI response');
  }

  return response.json();
}

// 会話を終了
export async function endConversation(conversationId: ID): Promise<void> {
  const response = await fetch(`${API_BASE}/${conversationId}/end`, {
    method: 'PUT',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to end conversation');
  }
}