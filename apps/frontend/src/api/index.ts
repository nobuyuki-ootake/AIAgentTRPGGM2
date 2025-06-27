export { apiClient } from './client';
export { aiAgentAPI } from './aiAgent';
export { campaignAPI } from './campaigns';
export { characterAPI } from './characters';
export { sessionAPI } from './sessions';
export { eventAPI } from './events';
export { questAPI } from './quests';
export { milestoneAPI } from './milestones';
export { timeManagementAPI } from './timeManagement';
export { approachAnalysisAPI } from './approachAnalysis';
export { aiCharacterGenerationAPI } from './aiCharacterGeneration';
export { aiMilestoneGenerationAPI } from './aiMilestoneGeneration';
export { interactiveEventsAPI } from './interactiveEvents';
export { locationEntityMappingAPI } from './locationEntityMapping';
export { playerExperienceAPI } from './playerExperience';
export { entityPoolAPI } from './entityPool';
export { aiEntityManagementAPI } from './aiEntityManagement';

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