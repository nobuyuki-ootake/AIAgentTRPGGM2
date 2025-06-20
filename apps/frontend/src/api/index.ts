export { apiClient } from './client';
export { aiAgentAPI } from './aiAgent';
export { campaignAPI } from './campaigns';
export { characterAPI } from './characters';
export { sessionAPI } from './sessions';
export { eventAPI } from './events';

// Re-export types for convenience
export type {
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