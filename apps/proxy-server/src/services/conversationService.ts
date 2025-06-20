import { 
  CharacterConversation, 
  ConversationMessage, 
  ConversationStartRequest,
  AIConversationResponse,
  Location,
  ID,
  DateTime 
} from '@ai-agent-trpg/types';
import { database } from '../database/database';
import { v4 as uuidv4 } from 'uuid';

class ConversationService {
  // ==========================================
  // 会話管理
  // ==========================================

  async startConversation(request: ConversationStartRequest): Promise<CharacterConversation> {
    const id = uuidv4();
    const now = new Date().toISOString() as DateTime;

    const conversation: CharacterConversation = {
      id,
      locationId: request.locationId,
      participants: [request.initiatorId, ...request.targetCharacterIds],
      initiatorId: request.initiatorId,
      title: `${request.conversationType || 'casual'} conversation`,
      messages: [],
      status: 'active',
      startTime: now,
      conversationType: request.conversationType || 'casual',
      mood: 'neutral',
      context: {
        recentEvents: [],
        relationshipChanges: {},
        informationShared: [],
        decisionsAgreed: [],
        secretsRevealed: [],
        ...request.context,
      },
    };

    // 初期メッセージがある場合は追加
    if (request.initialMessage) {
      const messageId = uuidv4();
      const initialMessage: ConversationMessage = {
        id: messageId,
        conversationId: id,
        speakerId: request.initiatorId,
        content: request.initialMessage,
        messageType: 'dialogue',
        timestamp: now,
        metadata: {
          emotion: 'neutral',
          volume: 'normal',
          tone: 'serious',
        },
      };
      conversation.messages = [initialMessage];

      // メッセージをデータベースに保存
      database.prepare(`
        INSERT INTO conversation_messages (
          id, conversation_id, speaker_id, content, message_type, 
          timestamp, emotion, volume, tone
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        messageId,
        id,
        request.initiatorId,
        request.initialMessage,
        'dialogue',
        now,
        'neutral',
        'normal',
        'serious'
      );
    }

    // 会話をデータベースに保存
    database.prepare(`
      INSERT INTO conversations (
        id, location_id, participants, initiator_id, title, status, 
        start_time, conversation_type, mood, context
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      request.locationId,
      JSON.stringify(conversation.participants),
      request.initiatorId,
      conversation.title,
      conversation.status,
      now,
      conversation.conversationType,
      conversation.mood,
      JSON.stringify(conversation.context)
    );

    return conversation;
  }

  async addMessage(
    conversationId: ID, 
    speakerId: ID, 
    content: string, 
    messageType: ConversationMessage['messageType'] = 'dialogue',
    metadata?: ConversationMessage['metadata']
  ): Promise<ConversationMessage> {
    const messageId = uuidv4();
    const now = new Date().toISOString() as DateTime;

    const message: ConversationMessage = {
      id: messageId,
      conversationId,
      speakerId,
      content,
      messageType,
      timestamp: now,
      metadata: {
        emotion: 'neutral',
        volume: 'normal',
        tone: 'serious',
        ...metadata,
      },
    };

    // メッセージをデータベースに保存
    database.prepare(`
      INSERT INTO conversation_messages (
        id, conversation_id, speaker_id, content, message_type, 
        timestamp, emotion, volume, tone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      messageId,
      conversationId,
      speakerId,
      content,
      messageType,
      now,
      message.metadata?.emotion || 'neutral',
      message.metadata?.volume || 'normal',
      message.metadata?.tone || 'serious'
    );

    return message;
  }

  async getConversation(conversationId: ID): Promise<CharacterConversation | null> {
    const conversationRow = database.prepare(`
      SELECT * FROM conversations WHERE id = ?
    `).get(conversationId) as any;

    if (!conversationRow) {
      return null;
    }

    const messageRows = database.prepare(`
      SELECT * FROM conversation_messages 
      WHERE conversation_id = ? 
      ORDER BY timestamp ASC
    `).all(conversationId) as any[];

    const messages: ConversationMessage[] = messageRows.map(row => ({
      id: row.id,
      conversationId: row.conversation_id,
      speakerId: row.speaker_id,
      content: row.content,
      messageType: row.message_type,
      timestamp: row.timestamp,
      metadata: {
        emotion: row.emotion,
        volume: row.volume,
        tone: row.tone,
      },
    }));

    const conversation: CharacterConversation = {
      id: conversationRow.id,
      locationId: conversationRow.location_id,
      participants: JSON.parse(conversationRow.participants),
      initiatorId: conversationRow.initiator_id,
      title: conversationRow.title,
      messages,
      status: conversationRow.status,
      startTime: conversationRow.start_time,
      endTime: conversationRow.end_time,
      conversationType: conversationRow.conversation_type,
      mood: conversationRow.mood,
      context: JSON.parse(conversationRow.context),
    };

    return conversation;
  }

  async getActiveConversationsInLocation(locationId: ID): Promise<CharacterConversation[]> {
    const conversationRows = database.prepare(`
      SELECT * FROM conversations 
      WHERE location_id = ? AND status = 'active'
      ORDER BY start_time DESC
    `).all(locationId) as any[];

    const conversations: CharacterConversation[] = [];

    for (const row of conversationRows) {
      const conversation = await this.getConversation(row.id);
      if (conversation) {
        conversations.push(conversation);
      }
    }

    return conversations;
  }

  async endConversation(conversationId: ID): Promise<void> {
    const now = new Date().toISOString();

    database.prepare(`
      UPDATE conversations 
      SET status = 'ended', end_time = ? 
      WHERE id = ?
    `).run(now, conversationId);
  }

  async getCharacterConversations(characterId: ID, limit: number = 10): Promise<CharacterConversation[]> {
    const conversationRows = database.prepare(`
      SELECT * FROM conversations 
      WHERE JSON_EXTRACT(participants, '$') LIKE '%"' || ? || '"%'
      ORDER BY start_time DESC
      LIMIT ?
    `).all(characterId, limit) as any[];

    const conversations: CharacterConversation[] = [];

    for (const row of conversationRows) {
      const conversation = await this.getConversation(row.id);
      if (conversation) {
        conversations.push(conversation);
      }
    }

    return conversations;
  }

  // ==========================================
  // AI会話生成
  // ==========================================

  async generateAIResponse(
    conversationId: ID, 
    targetCharacterId: ID, 
    _context?: {
      recentMessages?: ConversationMessage[];
      characterPersonality?: string;
      currentMood?: string;
      location?: Location;
    }
  ): Promise<AIConversationResponse> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // ここで実際のAI APIを呼び出して応答を生成
    // 現在はモック応答を返す
    const mockResponses = [
      { response: "そうですね、それは興味深い提案ですね。", emotion: "neutral" as const },
      { response: "ちょっと待ってください、それについてもう少し考えさせてください。", emotion: "confused" as const },
      { response: "素晴らしいアイデアです！賛成します。", emotion: "happy" as const },
      { response: "うーん、それは少し難しいかもしれませんね。", emotion: "neutral" as const },
      { response: "分かりました。一緒に解決策を見つけましょう。", emotion: "neutral" as const },
    ];

    const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];

    return {
      characterId: targetCharacterId,
      response: randomResponse.response,
      action: "考え込む表情を見せる",
      emotion: randomResponse.emotion,
      relationshipChanges: {},
      nextAction: 'continue',
    };
  }

}

export const conversationService = new ConversationService();