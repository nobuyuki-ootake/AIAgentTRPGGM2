import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { aiAgentAPI } from './aiAgent';
import { apiClient } from './client';
import {
  TestKeyRequest,
  TestKeyResponse,
  CampaignAssistanceRequest,
  CampaignAssistanceResponse,
  CharacterGenerationRequest,
  CharacterGenerationResponse,
  EventGenerationRequest,
  EventGenerationResponse,
  GMAssistanceRequest,
  GMAssistanceResponse,
  NPCBehaviorRequest,
  NPCBehaviorResponse,
  RulesAssistanceRequest,
  RulesAssistanceResponse,
  ChatRequest,
  ChatResponse,
} from './aiAgent';
import { AIProvider, TriggerChainRequest, TriggerChainResponse } from '@ai-agent-trpg/types';

// Mock the API client
vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockApiClient = vi.mocked(apiClient);

describe('AIAgentAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('testKey', () => {
    it('testKey_withValidRequest_shouldCallCorrectEndpointAndReturnResponse', async () => {
      const request: TestKeyRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-3.5-turbo',
      };
      const response: TestKeyResponse = {
        valid: true,
        provider: 'openai',
      };
      mockApiClient.post.mockResolvedValue(response);

      const result = await aiAgentAPI.testKey(request);

      expect(mockApiClient.post).toHaveBeenCalledWith('/ai-agent/test-key', request);
      expect(result).toEqual(response);
    });

    it('testKey_withoutModel_shouldStillWork', async () => {
      const request: TestKeyRequest = {
        provider: 'anthropic',
        apiKey: 'test-api-key',
      };
      const response: TestKeyResponse = {
        valid: false,
        provider: 'anthropic',
      };
      mockApiClient.post.mockResolvedValue(response);

      const result = await aiAgentAPI.testKey(request);

      expect(mockApiClient.post).toHaveBeenCalledWith('/ai-agent/test-key', request);
      expect(result).toEqual(response);
    });

    it('testKey_withInvalidKey_shouldReturnInvalidResponse', async () => {
      const request: TestKeyRequest = {
        provider: 'openai',
        apiKey: 'invalid-key',
      };
      const response: TestKeyResponse = {
        valid: false,
        provider: 'openai',
      };
      mockApiClient.post.mockResolvedValue(response);

      const result = await aiAgentAPI.testKey(request);

      expect(result.valid).toBe(false);
    });

    it('testKey_withAPIError_shouldPropagateError', async () => {
      const request: TestKeyRequest = {
        provider: 'openai',
        apiKey: 'test-key',
      };
      const error = new Error('API Error');
      mockApiClient.post.mockRejectedValue(error);

      await expect(aiAgentAPI.testKey(request)).rejects.toBe(error);
    });
  });

  describe('getCampaignAssistance', () => {
    it('getCampaignAssistance_withCompleteRequest_shouldCallCorrectEndpointAndReturnResponse', async () => {
      const request: CampaignAssistanceRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        campaignBasics: {
          name: 'Epic Fantasy Campaign',
          gameSystem: 'D&D 5e',
          theme: 'High Fantasy',
          description: 'A campaign about saving the world',
        },
        worldSettings: {
          technologyLevel: 'Medieval',
          magicLevel: 'High',
          scale: 'Continental',
          tone: 'Heroic',
        },
        playerInfo: {
          expectedCount: 4,
          experienceLevel: 'Intermediate',
          playStyle: 'Balanced',
        },
      };
      const response: CampaignAssistanceResponse = {
        assistance: 'Here are some suggestions for your campaign...',
        suggestions: {
          suggestions: 'Consider adding political intrigue...',
        },
      };
      mockApiClient.post.mockResolvedValue(response);

      const result = await aiAgentAPI.getCampaignAssistance(request);

      expect(mockApiClient.post).toHaveBeenCalledWith('/ai-agent/campaign/create-assistance', request);
      expect(result).toEqual(response);
    });

    it('getCampaignAssistance_withMinimalRequest_shouldWork', async () => {
      const request: CampaignAssistanceRequest = {
        provider: 'anthropic',
        apiKey: 'test-key',
        campaignBasics: {
          name: 'Simple Campaign',
          gameSystem: 'D&D 5e',
          theme: 'Adventure',
        },
      };
      const response: CampaignAssistanceResponse = {
        assistance: 'Basic campaign assistance...',
        suggestions: {
          suggestions: 'Start with simple encounters...',
        },
      };
      mockApiClient.post.mockResolvedValue(response);

      const result = await aiAgentAPI.getCampaignAssistance(request);

      expect(mockApiClient.post).toHaveBeenCalledWith('/ai-agent/campaign/create-assistance', request);
      expect(result).toEqual(response);
    });

    it('getCampaignAssistance_withAPIError_shouldPropagateError', async () => {
      const request: CampaignAssistanceRequest = {
        provider: 'openai',
        apiKey: 'invalid-key',
        campaignBasics: {
          name: 'Test',
          gameSystem: 'D&D 5e',
          theme: 'Fantasy',
        },
      };
      const error = new Error('Invalid API key');
      mockApiClient.post.mockRejectedValue(error);

      await expect(aiAgentAPI.getCampaignAssistance(request)).rejects.toBe(error);
    });
  });

  describe('generateCharacter', () => {
    it('generateCharacter_withCompleteRequest_shouldCallCorrectEndpointAndReturnResponse', async () => {
      const request: CharacterGenerationRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        characterType: 'PC',
        characterBasics: {
          name: 'Aelar',
          race: 'Elf',
          class: 'Wizard',
          level: 3,
        },
        campaignContext: {
          theme: 'High Fantasy',
          setting: 'Forgotten Realms',
        },
      };
      const response: CharacterGenerationResponse = {
        characterData: 'Generated character data...',
        generatedCharacter: {
          name: 'Aelar',
          race: 'Elf',
          class: 'Wizard',
          stats: { str: 8, dex: 14, con: 12, int: 16, wis: 13, cha: 11 },
        },
      };
      mockApiClient.post.mockResolvedValue(response);

      const result = await aiAgentAPI.generateCharacter(request);

      expect(mockApiClient.post).toHaveBeenCalledWith('/ai-agent/character/generate', request);
      expect(result).toEqual(response);
    });

    it('generateCharacter_forNPC_shouldWork', async () => {
      const request: CharacterGenerationRequest = {
        provider: 'anthropic',
        apiKey: 'test-key',
        characterType: 'NPC',
        campaignContext: { setting: 'Urban' },
      };
      const response: CharacterGenerationResponse = {
        characterData: 'NPC character data...',
        generatedCharacter: {
          name: 'Shopkeeper Bob',
          occupation: 'Merchant',
        },
      };
      mockApiClient.post.mockResolvedValue(response);

      const result = await aiAgentAPI.generateCharacter(request);

      expect(result.generatedCharacter.name).toBe('Shopkeeper Bob');
    });

    it('generateCharacter_forEnemy_shouldWork', async () => {
      const request: CharacterGenerationRequest = {
        provider: 'openai',
        apiKey: 'test-key',
        characterType: 'Enemy',
        campaignContext: { encounterType: 'boss' },
      };
      const response: CharacterGenerationResponse = {
        characterData: 'Enemy character data...',
        generatedCharacter: {
          name: 'Dragon Lord',
          type: 'Dragon',
          cr: 15,
        },
      };
      mockApiClient.post.mockResolvedValue(response);

      const result = await aiAgentAPI.generateCharacter(request);

      expect(result.generatedCharacter.type).toBe('Dragon');
    });

    it('generateCharacter_withAPIError_shouldPropagateError', async () => {
      const request: CharacterGenerationRequest = {
        provider: 'openai',
        apiKey: 'test-key',
        characterType: 'PC',
      };
      const error = new Error('Character generation failed');
      mockApiClient.post.mockRejectedValue(error);

      await expect(aiAgentAPI.generateCharacter(request)).rejects.toBe(error);
    });
  });

  describe('generateEvent', () => {
    it('generateEvent_withCompleteRequest_shouldCallCorrectEndpointAndReturnResponse', async () => {
      const request: EventGenerationRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        eventType: 'combat',
        campaignContext: {
          setting: 'forest',
          theme: 'mystery',
        },
        sessionContext: {
          currentLocation: 'Dark Woods',
          partyLevel: 5,
        },
        difficulty: 'medium',
      };
      const response: EventGenerationResponse = {
        eventData: 'Generated event data...',
        generatedEvent: {
          type: 'combat',
          title: 'Ambush in the Dark Woods',
          description: 'Bandits attack from the shadows...',
          enemies: ['Bandit Leader', 'Bandit x3'],
        },
      };
      mockApiClient.post.mockResolvedValue(response);

      const result = await aiAgentAPI.generateEvent(request);

      expect(mockApiClient.post).toHaveBeenCalledWith('/ai-agent/event/generate', request);
      expect(result).toEqual(response);
    });

    it('generateEvent_withSocialEventType_shouldWork', async () => {
      const request: EventGenerationRequest = {
        provider: 'anthropic',
        apiKey: 'test-key',
        eventType: 'social',
        difficulty: 'easy',
      };
      const response: EventGenerationResponse = {
        eventData: 'Social event data...',
        generatedEvent: {
          type: 'social',
          title: 'Tavern Encounter',
          npcs: ['Friendly Bard', 'Suspicious Stranger'],
        },
      };
      mockApiClient.post.mockResolvedValue(response);

      const result = await aiAgentAPI.generateEvent(request);

      expect(result.generatedEvent.type).toBe('social');
    });

    it('generateEvent_withAPIError_shouldPropagateError', async () => {
      const request: EventGenerationRequest = {
        provider: 'openai',
        apiKey: 'test-key',
        eventType: 'exploration',
      };
      const error = new Error('Event generation failed');
      mockApiClient.post.mockRejectedValue(error);

      await expect(aiAgentAPI.generateEvent(request)).rejects.toBe(error);
    });
  });

  describe('getGMAssistance', () => {
    it('getGMAssistance_withCompleteRequest_shouldCallCorrectEndpointAndReturnResponse', async () => {
      const request: GMAssistanceRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        assistanceType: 'rule-clarification',
        sessionState: {
          currentScene: 'combat',
          activeCharacters: ['PC1', 'Monster1'],
        },
        playerAction: 'I want to grapple the monster',
        context: {
          currentRound: 3,
          initiative: ['PC1', 'Monster1'],
        },
      };
      const response: GMAssistanceResponse = {
        assistance: 'For grappling rules...',
        suggestions: {
          suggestions: 'Consider allowing athletics check...',
        },
      };
      mockApiClient.post.mockResolvedValue(response);

      const result = await aiAgentAPI.getGMAssistance(request);

      expect(mockApiClient.post).toHaveBeenCalledWith('/ai-agent/session/gm-assistance', request);
      expect(result).toEqual(response);
    });

    it('getGMAssistance_withDifferentAssistanceTypes_shouldWork', async () => {
      const request: GMAssistanceRequest = {
        provider: 'anthropic',
        apiKey: 'test-key',
        assistanceType: 'story-suggestion',
        sessionState: {
          storyProgress: 'midpoint',
        },
      };
      const response: GMAssistanceResponse = {
        assistance: 'Story development suggestions...',
        suggestions: {
          suggestions: 'Introduce plot twist here...',
        },
      };
      mockApiClient.post.mockResolvedValue(response);

      const result = await aiAgentAPI.getGMAssistance(request);

      expect(result.assistance).toContain('Story development');
    });

    it('getGMAssistance_withAPIError_shouldPropagateError', async () => {
      const request: GMAssistanceRequest = {
        provider: 'openai',
        apiKey: 'test-key',
        assistanceType: 'general',
        sessionState: {},
      };
      const error = new Error('GM assistance failed');
      mockApiClient.post.mockRejectedValue(error);

      await expect(aiAgentAPI.getGMAssistance(request)).rejects.toBe(error);
    });
  });

  describe('generateNPCBehavior', () => {
    it('generateNPCBehavior_withCompleteRequest_shouldCallCorrectEndpointAndReturnResponse', async () => {
      const request: NPCBehaviorRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        npcId: 'npc-shopkeeper-1',
        npcData: {
          name: 'Marcus the Merchant',
          personality: 'Friendly but cautious',
          motivation: 'Profit and reputation',
        },
        situation: 'Players are trying to negotiate prices',
        playerActions: ['Attempted to haggle', 'Showed expensive item'],
        campaignContext: {
          economy: 'struggling',
          reputation: 'trusted',
        },
      };
      const response: NPCBehaviorResponse = {
        behavior: 'Marcus smiles but remains firm on his prices...',
        dialogue: [
          'Well now, I can see you have discerning taste...',
          'But I\'m afraid my prices are already quite fair.',
        ],
        actions: {
          actions: 'Examine the item carefully, quote fair price',
        },
      };
      mockApiClient.post.mockResolvedValue(response);

      const result = await aiAgentAPI.generateNPCBehavior(request);

      expect(mockApiClient.post).toHaveBeenCalledWith('/ai-agent/npc/behavior', request);
      expect(result).toEqual(response);
    });

    it('generateNPCBehavior_withHostileNPC_shouldGenerateAppropriateResponse', async () => {
      const request: NPCBehaviorRequest = {
        provider: 'anthropic',
        apiKey: 'test-key',
        npcId: 'npc-guard-1',
        npcData: {
          name: 'Captain Stern',
          personality: 'Suspicious and aggressive',
        },
        situation: 'Players are trespassing',
      };
      const response: NPCBehaviorResponse = {
        behavior: 'Captain Stern draws his weapon...',
        dialogue: ['Halt! You\'re not supposed to be here!'],
        actions: {
          actions: 'Ready weapon, call for backup',
        },
      };
      mockApiClient.post.mockResolvedValue(response);

      const result = await aiAgentAPI.generateNPCBehavior(request);

      expect(result.dialogue[0]).toContain('Halt!');
    });

    it('generateNPCBehavior_withAPIError_shouldPropagateError', async () => {
      const request: NPCBehaviorRequest = {
        provider: 'openai',
        apiKey: 'test-key',
        npcId: 'test-npc',
        npcData: {},
        situation: 'test situation',
      };
      const error = new Error('NPC behavior generation failed');
      mockApiClient.post.mockRejectedValue(error);

      await expect(aiAgentAPI.generateNPCBehavior(request)).rejects.toBe(error);
    });
  });

  describe('getRulesAssistance', () => {
    it('getRulesAssistance_withCompleteRequest_shouldCallCorrectEndpointAndReturnResponse', async () => {
      const request: RulesAssistanceRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        gameSystem: 'D&D 5e',
        situation: 'Combat encounter with difficult terrain',
        question: 'How does difficult terrain affect movement and spells?',
        context: {
          terrain: 'swamp',
          weather: 'heavy rain',
        },
      };
      const response: RulesAssistanceResponse = {
        assistance: 'Difficult terrain rules explanation...',
        rules: {
          rules: 'Movement costs double, area spells affected...',
        },
      };
      mockApiClient.post.mockResolvedValue(response);

      const result = await aiAgentAPI.getRulesAssistance(request);

      expect(mockApiClient.post).toHaveBeenCalledWith('/ai-agent/rules/assistance', request);
      expect(result).toEqual(response);
    });

    it('getRulesAssistance_withDifferentGameSystem_shouldWork', async () => {
      const request: RulesAssistanceRequest = {
        provider: 'anthropic',
        apiKey: 'test-key',
        gameSystem: 'Pathfinder 2e',
        situation: 'Spell interaction',
        question: 'Can I cast while flanked?',
      };
      const response: RulesAssistanceResponse = {
        assistance: 'Pathfinder 2e spellcasting rules...',
        rules: {
          rules: 'Flanking affects AC, not spellcasting...',
        },
      };
      mockApiClient.post.mockResolvedValue(response);

      const result = await aiAgentAPI.getRulesAssistance(request);

      expect(result.rules.rules).toContain('Flanking');
    });

    it('getRulesAssistance_withAPIError_shouldPropagateError', async () => {
      const request: RulesAssistanceRequest = {
        provider: 'openai',
        apiKey: 'test-key',
        gameSystem: 'D&D 5e',
        situation: 'test',
        question: 'test question',
      };
      const error = new Error('Rules assistance failed');
      mockApiClient.post.mockRejectedValue(error);

      await expect(aiAgentAPI.getRulesAssistance(request)).rejects.toBe(error);
    });
  });

  describe('chat', () => {
    it('chat_withCompleteRequest_shouldCallCorrectEndpointAndReturnResponse', async () => {
      const request: ChatRequest = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        message: 'Hello, I need help with my campaign',
        persona: 'helpful-gm',
        context: {
          gameSystem: 'D&D 5e',
          experience: 'beginner',
        },
        conversationHistory: [
          { role: 'user', content: 'Previous message' },
          { role: 'assistant', content: 'Previous response' },
        ],
      };
      const response: ChatResponse = {
        message: 'Hello! I\'d be happy to help with your D&D campaign...',
        persona: 'helpful-gm',
      };
      mockApiClient.post.mockResolvedValue(response);

      const result = await aiAgentAPI.chat(request);

      expect(mockApiClient.post).toHaveBeenCalledWith('/ai-agent/chat', request);
      expect(result).toEqual(response);
    });

    it('chat_withoutPersona_shouldWork', async () => {
      const request: ChatRequest = {
        provider: 'anthropic',
        apiKey: 'test-key',
        message: 'What are good encounter ideas?',
      };
      const response: ChatResponse = {
        message: 'Here are some encounter ideas...',
      };
      mockApiClient.post.mockResolvedValue(response);

      const result = await aiAgentAPI.chat(request);

      expect(result.message).toContain('encounter ideas');
    });

    it('chat_withLongConversationHistory_shouldWork', async () => {
      const longHistory = Array.from({ length: 50 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }));

      const request: ChatRequest = {
        provider: 'openai',
        apiKey: 'test-key',
        message: 'Continue our conversation',
        conversationHistory: longHistory,
      };
      const response: ChatResponse = {
        message: 'Continuing our conversation...',
      };
      mockApiClient.post.mockResolvedValue(response);

      const result = await aiAgentAPI.chat(request);

      expect(mockApiClient.post).toHaveBeenCalledWith('/ai-agent/chat', request);
      expect(result.message).toBeDefined();
    });

    it('chat_withAPIError_shouldPropagateError', async () => {
      const request: ChatRequest = {
        provider: 'openai',
        apiKey: 'test-key',
        message: 'test message',
      };
      const error = new Error('Chat failed');
      mockApiClient.post.mockRejectedValue(error);

      await expect(aiAgentAPI.chat(request)).rejects.toBe(error);
    });
  });

  describe('getProviders', () => {
    it('getProviders_shouldCallCorrectEndpointAndReturnProviders', async () => {
      const providers: AIProvider[] = [
        {
          id: 'openai',
          name: 'OpenAI',
          models: ['gpt-3.5-turbo', 'gpt-4'],
          supportsStreaming: true,
          maxTokens: 4096,
        },
        {
          id: 'anthropic',
          name: 'Anthropic',
          models: ['claude-3-opus', 'claude-3-sonnet'],
          supportsStreaming: true,
          maxTokens: 200000,
        },
      ];
      mockApiClient.get.mockResolvedValue(providers);

      const result = await aiAgentAPI.getProviders();

      expect(mockApiClient.get).toHaveBeenCalledWith('/ai-agent/providers');
      expect(result).toEqual(providers);
    });

    it('getProviders_withEmptyResponse_shouldReturnEmptyArray', async () => {
      mockApiClient.get.mockResolvedValue([]);

      const result = await aiAgentAPI.getProviders();

      expect(result).toEqual([]);
    });

    it('getProviders_withAPIError_shouldPropagateError', async () => {
      const error = new Error('Failed to fetch providers');
      mockApiClient.get.mockRejectedValue(error);

      await expect(aiAgentAPI.getProviders()).rejects.toBe(error);
    });
  });

  describe('getStats', () => {
    it('getStats_shouldCallCorrectEndpointAndReturnStats', async () => {
      const stats = {
        totalRequests: 1234,
        totalTokens: 567890,
        averageResponseTime: 2.5,
        providerUsage: {
          openai: 800,
          anthropic: 434,
        },
      };
      mockApiClient.get.mockResolvedValue(stats);

      const result = await aiAgentAPI.getStats();

      expect(mockApiClient.get).toHaveBeenCalledWith('/ai-agent/stats');
      expect(result).toEqual(stats);
    });

    it('getStats_withAPIError_shouldPropagateError', async () => {
      const error = new Error('Stats unavailable');
      mockApiClient.get.mockRejectedValue(error);

      await expect(aiAgentAPI.getStats()).rejects.toBe(error);
    });
  });

  describe('triggerChain', () => {
    it('triggerChain_withCompleteRequest_shouldCallCorrectEndpointAndReturnResponse', async () => {
      const request: TriggerChainRequest = {
        chainType: 'session-initialization',
        campaignId: 'campaign-1',
        sessionId: 'session-1',
        context: {
          playerCount: 4,
          theme: 'mystery',
        },
        parameters: {
          difficulty: 'medium',
          duration: 4,
        },
      };
      const response: TriggerChainResponse = {
        chainId: 'chain-123',
        status: 'started',
        estimatedDuration: 300,
        steps: [
          {
            stepId: 'step-1',
            name: 'Generate scenario',
            status: 'pending',
            estimatedDuration: 100,
          },
        ],
      };
      mockApiClient.post.mockResolvedValue(response);

      const result = await aiAgentAPI.triggerChain(request);

      expect(mockApiClient.post).toHaveBeenCalledWith('/ai-agent/trigger-chain', request);
      expect(result).toEqual(response);
    });

    it('triggerChain_withMinimalRequest_shouldWork', async () => {
      const request: TriggerChainRequest = {
        chainType: 'character-generation',
        campaignId: 'campaign-1',
      };
      const response: TriggerChainResponse = {
        chainId: 'chain-456',
        status: 'started',
        estimatedDuration: 60,
        steps: [],
      };
      mockApiClient.post.mockResolvedValue(response);

      const result = await aiAgentAPI.triggerChain(request);

      expect(result.chainId).toBe('chain-456');
    });

    it('triggerChain_withAPIError_shouldPropagateError', async () => {
      const request: TriggerChainRequest = {
        chainType: 'test-chain',
        campaignId: 'campaign-1',
      };
      const error = new Error('Chain trigger failed');
      mockApiClient.post.mockRejectedValue(error);

      await expect(aiAgentAPI.triggerChain(request)).rejects.toBe(error);
    });
  });

  describe('Edge cases and error handling', () => {
    it('allMethods_withNetworkTimeout_shouldPropagateTimeoutError', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockApiClient.post.mockRejectedValue(timeoutError);

      const testRequest: TestKeyRequest = {
        provider: 'openai',
        apiKey: 'test-key',
      };

      await expect(aiAgentAPI.testKey(testRequest)).rejects.toMatchObject({
        name: 'TimeoutError',
        message: 'Request timeout',
      });
    });

    it('allMethods_with500Error_shouldPropagateServerError', async () => {
      const serverError = new Error('Internal server error');
      serverError.name = 'ServerError';
      mockApiClient.get.mockRejectedValue(serverError);

      await expect(aiAgentAPI.getProviders()).rejects.toMatchObject({
        name: 'ServerError',
        message: 'Internal server error',
      });
    });

    it('requestsWithLargePayloads_shouldHandleGracefully', async () => {
      const largeContext = {
        largeData: 'x'.repeat(100000), // 100KB of data
        nestedData: {
          deepNesting: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` })),
        },
      };

      const request: ChatRequest = {
        provider: 'openai',
        apiKey: 'test-key',
        message: 'Process this large context',
        context: largeContext,
      };
      const response: ChatResponse = {
        message: 'Large context processed successfully',
      };
      mockApiClient.post.mockResolvedValue(response);

      const result = await aiAgentAPI.chat(request);

      expect(mockApiClient.post).toHaveBeenCalledWith('/ai-agent/chat', request);
      expect(result.message).toBeDefined();
    });

    it('requestsWithSpecialCharacters_shouldHandleCorrectly', async () => {
      const request: ChatRequest = {
        provider: 'openai',
        apiKey: 'test-key',
        message: 'Message with special characters: 漢字, émojis 🎲, and symbols !@#$%^&*()',
      };
      const response: ChatResponse = {
        message: 'Response with special characters processed',
      };
      mockApiClient.post.mockResolvedValue(response);

      const result = await aiAgentAPI.chat(request);

      expect(result.message).toBeDefined();
    });

    it('requestsWithNullOrUndefinedValues_shouldHandleGracefully', async () => {
      const request: CharacterGenerationRequest = {
        provider: 'openai',
        apiKey: 'test-key',
        characterType: 'PC',
        characterBasics: {
          name: undefined,
          race: null as any,
          class: '',
        },
        campaignContext: null as any,
      };
      const response: CharacterGenerationResponse = {
        characterData: 'Generated with null handling',
        generatedCharacter: {},
      };
      mockApiClient.post.mockResolvedValue(response);

      expect(() => aiAgentAPI.generateCharacter(request)).not.toThrow();
    });
  });
});