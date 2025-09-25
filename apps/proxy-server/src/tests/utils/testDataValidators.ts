/**
 * テストデータバリデーター
 * t-WADA命名規則: testDataValidators.ts
 * 本番型定義に準拠したテストデータの検証
 */

import { 
  TRPGCampaign, 
  TRPGCharacter, 
  TRPGSession, 
  NPCCharacter, 
  EnemyCharacter,
  Quest,
  Location,
  Milestone,
  AIEntity 
} from '@ai-agent-trpg/types';

/**
 * TRPGCampaignの完全性検証
 * 本番型定義に完全準拠しているかチェック
 */
export const validateCampaignData = (campaign: TRPGCampaign): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  // 必須フィールドの検証
  if (!campaign.id || typeof campaign.id !== 'string') {
    errors.push('campaign.id is required and must be string');
  }
  
  if (!campaign.title || typeof campaign.title !== 'string') {
    errors.push('campaign.title is required and must be string');
  }
  
  if (!campaign.gameSystem || typeof campaign.gameSystem !== 'string') {
    errors.push('campaign.gameSystem is required and must be string');
  }
  
  if (!campaign.gmId || typeof campaign.gmId !== 'string') {
    errors.push('campaign.gmId is required and must be string');
  }
  
  if (!Array.isArray(campaign.playerIds)) {
    errors.push('campaign.playerIds must be array');
  }
  
  if (!Array.isArray(campaign.characterIds)) {
    errors.push('campaign.characterIds must be array');
  }
  
  if (!['active', 'paused', 'completed', 'archived'].includes(campaign.status)) {
    errors.push('campaign.status must be valid enum value');
  }
  
  // 日付フィールドの検証
  if (!(campaign.createdAt instanceof Date)) {
    errors.push('campaign.createdAt must be Date instance');
  }
  
  if (!(campaign.updatedAt instanceof Date)) {
    errors.push('campaign.updatedAt must be Date instance');
  }
  
  // settings オブジェクトの検証
  if (campaign.settings) {
    if (typeof campaign.settings.aiAssistanceLevel !== 'string') {
      errors.push('campaign.settings.aiAssistanceLevel must be string');
    }
    
    if (typeof campaign.settings.difficultyLevel !== 'string') {
      errors.push('campaign.settings.difficultyLevel must be string');
    }
    
    if (typeof campaign.settings.sessionDuration !== 'number') {
      errors.push('campaign.settings.sessionDuration must be number');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * TRPGCharacterの完全性検証
 */
export const validateCharacterData = (character: TRPGCharacter): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  // 必須フィールド
  if (!character.id || typeof character.id !== 'string') {
    errors.push('character.id is required and must be string');
  }
  
  if (!character.campaignId || typeof character.campaignId !== 'string') {
    errors.push('character.campaignId is required and must be string');
  }
  
  if (!character.name || typeof character.name !== 'string') {
    errors.push('character.name is required and must be string');
  }
  
  if (!['player_character', 'npc', 'enemy'].includes(character.type)) {
    errors.push('character.type must be valid enum value');
  }
  
  if (typeof character.level !== 'number' || character.level < 1) {
    errors.push('character.level must be positive number');
  }
  
  // stats オブジェクトの検証
  if (character.stats) {
    const requiredStats = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    for (const stat of requiredStats) {
      if (typeof character.stats[stat] !== 'number') {
        errors.push(`character.stats.${stat} must be number`);
      }
    }
    
    if (typeof character.stats.hitPoints !== 'number' || character.stats.hitPoints < 0) {
      errors.push('character.stats.hitPoints must be non-negative number');
    }
    
    if (typeof character.stats.maxHitPoints !== 'number' || character.stats.maxHitPoints < 1) {
      errors.push('character.stats.maxHitPoints must be positive number');
    }
  }
  
  // 日付フィールド
  if (!(character.createdAt instanceof Date)) {
    errors.push('character.createdAt must be Date instance');
  }
  
  if (!(character.updatedAt instanceof Date)) {
    errors.push('character.updatedAt must be Date instance');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * TRPGSessionの完全性検証
 */
export const validateSessionData = (session: TRPGSession): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  // 必須フィールド
  if (!session.id || typeof session.id !== 'string') {
    errors.push('session.id is required and must be string');
  }
  
  if (!session.campaignId || typeof session.campaignId !== 'string') {
    errors.push('session.campaignId is required and must be string');
  }
  
  if (!session.title || typeof session.title !== 'string') {
    errors.push('session.title is required and must be string');
  }
  
  if (!['planned', 'in_progress', 'completed', 'cancelled'].includes(session.status)) {
    errors.push('session.status must be valid enum value');
  }
  
  if (typeof session.sessionNumber !== 'number' || session.sessionNumber < 1) {
    errors.push('session.sessionNumber must be positive number');
  }
  
  if (!Array.isArray(session.playerIds)) {
    errors.push('session.playerIds must be array');
  }
  
  if (!Array.isArray(session.characterIds)) {
    errors.push('session.characterIds must be array');
  }
  
  // 日付フィールド
  if (!(session.createdAt instanceof Date)) {
    errors.push('session.createdAt must be Date instance');
  }
  
  if (!(session.updatedAt instanceof Date)) {
    errors.push('session.updatedAt must be Date instance');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * NPCCharacterの完全性検証
 */
export const validateNPCData = (npc: NPCCharacter): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  // 基本キャラクター検証を継承
  const baseValidation = validateCharacterData(npc);
  errors.push(...baseValidation.errors);

  // NPC固有フィールド
  if (npc.role && typeof npc.role !== 'string') {
    errors.push('npc.role must be string');
  }
  
  if (npc.disposition && !['hostile', 'unfriendly', 'neutral', 'friendly', 'helpful'].includes(npc.disposition)) {
    errors.push('npc.disposition must be valid enum value');
  }
  
  if (npc.location && typeof npc.location !== 'string') {
    errors.push('npc.location must be string');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * EnemyCharacterの完全性検証
 */
export const validateEnemyData = (enemy: EnemyCharacter): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  // 基本キャラクター検証を継承
  const baseValidation = validateCharacterData(enemy);
  errors.push(...baseValidation.errors);

  // Enemy固有フィールド
  if (typeof enemy.challengeRating !== 'number' || enemy.challengeRating < 0) {
    errors.push('enemy.challengeRating must be non-negative number');
  }
  
  if (typeof enemy.experienceValue !== 'number' || enemy.experienceValue < 0) {
    errors.push('enemy.experienceValue must be non-negative number');
  }
  
  if (enemy.behavior) {
    if (typeof enemy.behavior.aggressive !== 'boolean') {
      errors.push('enemy.behavior.aggressive must be boolean');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Questの完全性検証
 */
export const validateQuestData = (quest: Quest): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  // 必須フィールド
  if (!quest.id || typeof quest.id !== 'string') {
    errors.push('quest.id is required and must be string');
  }
  
  if (!quest.campaignId || typeof quest.campaignId !== 'string') {
    errors.push('quest.campaignId is required and must be string');
  }
  
  if (!quest.title || typeof quest.title !== 'string') {
    errors.push('quest.title is required and must be string');
  }
  
  if (!['active', 'completed', 'failed', 'available'].includes(quest.status)) {
    errors.push('quest.status must be valid enum value');
  }
  
  if (!['low', 'medium', 'high', 'critical'].includes(quest.priority)) {
    errors.push('quest.priority must be valid enum value');
  }
  
  // objectives 配列の検証
  if (quest.objectives && Array.isArray(quest.objectives)) {
    quest.objectives.forEach((objective, index) => {
      if (!objective.id || typeof objective.id !== 'string') {
        errors.push(`quest.objectives[${index}].id is required and must be string`);
      }
      if (!objective.description || typeof objective.description !== 'string') {
        errors.push(`quest.objectives[${index}].description is required and must be string`);
      }
      if (typeof objective.completed !== 'boolean') {
        errors.push(`quest.objectives[${index}].completed must be boolean`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * テストデータの包括的検証
 * 複数のエンティティ間の整合性もチェック
 */
export const validateTestDataConsistency = (data: {
  campaigns?: TRPGCampaign[];
  characters?: TRPGCharacter[];
  sessions?: TRPGSession[];
  quests?: Quest[];
  locations?: Location[];
}): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // キャンペーンとキャラクターの整合性
  if (data.campaigns && data.characters) {
    for (const campaign of data.campaigns) {
      for (const characterId of campaign.characterIds) {
        const character = data.characters.find(c => c.id === characterId);
        if (!character) {
          errors.push(`Campaign ${campaign.id} references non-existent character ${characterId}`);
        } else if (character.campaignId !== campaign.id) {
          errors.push(`Character ${characterId} campaign mismatch`);
        }
      }
    }
  }

  // セッションとキャンペーンの整合性
  if (data.campaigns && data.sessions) {
    for (const session of data.sessions) {
      const campaign = data.campaigns.find(c => c.id === session.campaignId);
      if (!campaign) {
        errors.push(`Session ${session.id} references non-existent campaign ${session.campaignId}`);
      }
    }
  }

  // IDの重複チェック
  const allIds: string[] = [];
  const entityTypes = ['campaigns', 'characters', 'sessions', 'quests', 'locations'];
  
  for (const entityType of entityTypes) {
    if (data[entityType]) {
      for (const entity of data[entityType]) {
        if (allIds.includes(entity.id)) {
          errors.push(`Duplicate ID found: ${entity.id}`);
        }
        allIds.push(entity.id);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};