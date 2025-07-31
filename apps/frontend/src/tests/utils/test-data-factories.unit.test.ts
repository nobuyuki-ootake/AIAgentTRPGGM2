import { describe, it, expect } from 'vitest';
import {
  createTestCampaign,
  createTestCharacter,
  createTestTRPGCharacter,
  createTestNPCCharacter,
  createTestEnemyCharacter,
  createTestSession,
  createTestSessionState,
  createTestChatMessage,
  createTestDiceRoll,
  createTestLocation,
  createTestQuest,
  createTestAIGameContext,
  createTestCharacterAISettings,
  createTestMovementProposal,
  createTestMovementVote,
  createTestConsensusSettings,
  createTestSessionInitializationProgressDetail,
  createTestSessionInitializationProgress,
  createTestGMNotification,
  createCompleteTestCampaignSetup,
  createActiveSessionTestData,
  createErrorTestData,
} from './test-data-factories';
import {
  TRPGCampaign,
  Character,
  TRPGCharacter,
  NPCCharacter,
  EnemyCharacter,
  SessionState,
  TRPGSession,
  ChatMessage,
  DiceRoll,
  Quest,
  Location,
  AIGameContext,
  CharacterAISettings,
  PartyMovementProposal,
  MovementVote,
  ConsensusSettings,
  SessionInitializationProgress,
  SessionInitializationProgressDetail,
  GMNotification,
} from '@ai-agent-trpg/types';

describe('Test Data Factories', () => {
  describe('Campaign Factory', () => {
    it('createTestCampaign_withoutOverrides_shouldReturnValidCampaignStructure', () => {
      const campaign = createTestCampaign();

      expect(campaign).toMatchObject<TRPGCampaign>({
        id: expect.any(String),
        title: expect.any(String),
        description: expect.any(String),
        gameSystem: expect.any(String),
        gmId: expect.any(String),
        playerIds: expect.any(Array),
        status: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        worldSetting: expect.objectContaining({
          name: expect.any(String),
          description: expect.any(String),
          theme: expect.any(String),
        }),
      });

      // Validate specific default values
      expect(campaign.id).toBe('test-campaign-1');
      expect(campaign.gameSystem).toBe('D&D 5e');
      expect(campaign.status).toBe('active');
      expect(campaign.playerIds).toHaveLength(2);
    });

    it('createTestCampaign_withOverrides_shouldMergeOverridesWithDefaults', () => {
      const overrides = {
        id: 'custom-campaign',
        title: 'Custom Campaign Title',
        gameSystem: 'Pathfinder 2e',
        status: 'planning' as const,
      };

      const campaign = createTestCampaign(overrides);

      expect(campaign.id).toBe('custom-campaign');
      expect(campaign.title).toBe('Custom Campaign Title');
      expect(campaign.gameSystem).toBe('Pathfinder 2e');
      expect(campaign.status).toBe('planning');
      // Should preserve defaults for non-overridden fields
      expect(campaign.gmId).toBe('test-gm-1');
      expect(campaign.playerIds).toEqual(['test-player-1', 'test-player-2']);
    });

    it('createTestCampaign_withNestedOverrides_shouldMergeNestedObjects', () => {
      const overrides = {
        worldSetting: {
          name: 'Custom World',
          theme: 'Sci-Fi',
        },
      };

      const campaign = createTestCampaign(overrides);

      expect(campaign.worldSetting).toEqual({
        name: 'Custom World',
        description: 'テスト用の架空世界設定', // Should preserve default
        theme: 'Sci-Fi',
      });
    });

    it('createTestCampaign_multipleCreations_shouldProduceDifferentInstances', () => {
      const campaign1 = createTestCampaign();
      const campaign2 = createTestCampaign();

      expect(campaign1).not.toBe(campaign2); // Different instances
      expect(campaign1).toEqual(campaign2); // Same content
    });
  });

  describe('Character Factories', () => {
    it('createTestCharacter_shouldReturnValidCharacterStructure', () => {
      const character = createTestCharacter();

      expect(character).toMatchObject<Character>({
        id: expect.any(String),
        name: expect.any(String),
        type: expect.any(String),
        description: expect.any(String),
        level: expect.any(Number),
        hitPoints: expect.any(Number),
        maxHitPoints: expect.any(Number),
        armorClass: expect.any(Number),
        stats: expect.objectContaining({
          strength: expect.any(Number),
          dexterity: expect.any(Number),
          constitution: expect.any(Number),
          intelligence: expect.any(Number),
          wisdom: expect.any(Number),
          charisma: expect.any(Number),
        }),
        skills: expect.any(Array),
        equipment: expect.any(Array),
        backstory: expect.any(String),
        imageUrl: expect.any(String),
        campaignId: expect.any(String),
        ownerId: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      expect(character.type).toBe('pc');
      expect(character.level).toBe(1);
      expect(character.skills).toEqual(['調査', '説得']);
      expect(character.equipment).toEqual(['短剣', '革の鎧']);
    });

    it('createTestTRPGCharacter_shouldExtendBaseCharacterWithTRPGSpecificFields', () => {
      const character = createTestTRPGCharacter();

      expect(character).toMatchObject<TRPGCharacter>({
        ...createTestCharacter({ type: 'pc' }),
        playerNotes: expect.any(String),
        characterClass: expect.any(String),
        race: expect.any(String),
        alignment: expect.any(String),
      });

      expect(character.characterClass).toBe('ローグ');
      expect(character.race).toBe('ハーフリング');
      expect(character.alignment).toBe('chaotic_neutral');
    });

    it('createTestNPCCharacter_shouldExtendBaseCharacterWithNPCSpecificFields', () => {
      const character = createTestNPCCharacter();

      expect(character).toMatchObject<NPCCharacter>({
        ...createTestCharacter({ type: 'npc' }),
        role: expect.any(String),
        personalityTraits: expect.any(Array),
        motivations: expect.any(Array),
        relationships: expect.any(Array),
      });

      expect(character.type).toBe('npc');
      expect(character.role).toBe('ally');
      expect(character.personalityTraits).toEqual(['好奇心旺盛', '慎重']);
      expect(character.motivations).toEqual(['真実の探求', '仲間の安全']);
    });

    it('createTestEnemyCharacter_shouldExtendBaseCharacterWithEnemySpecificFields', () => {
      const character = createTestEnemyCharacter();

      expect(character).toMatchObject<EnemyCharacter>({
        ...createTestCharacter({ type: 'enemy' }),
        challengeRating: expect.any(Number),
        abilities: expect.any(Array),
        weaknesses: expect.any(Array),
        tactics: expect.any(String),
      });

      expect(character.type).toBe('enemy');
      expect(character.challengeRating).toBe(1);
      expect(character.abilities).toEqual(['急襲', '毒攻撃']);
      expect(character.weaknesses).toEqual(['火に弱い']);
      expect(character.tactics).toBe('aggressive');
    });

    it('characterFactories_withOverrides_shouldMergeCorrectly', () => {
      const overrides = {
        name: 'Custom Character',
        level: 5,
        stats: {
          strength: 18,
        },
      };

      const character = createTestCharacter(overrides);

      expect(character.name).toBe('Custom Character');
      expect(character.level).toBe(5);
      expect(character.stats.strength).toBe(18);
      // Should preserve other default stats
      expect(character.stats.dexterity).toBe(12);
      expect(character.stats.constitution).toBe(10);
    });
  });

  describe('Session Factories', () => {
    it('createTestSession_shouldReturnValidSessionStructure', () => {
      const session = createTestSession();

      expect(session).toMatchObject<TRPGSession>({
        id: expect.any(String),
        campaignId: expect.any(String),
        sessionNumber: expect.any(Number),
        title: expect.any(String),
        description: expect.any(String),
        status: expect.any(String),
        scheduledDate: expect.any(String),
        duration: expect.any(Number),
        participantIds: expect.any(Array),
        gmNotes: expect.any(String),
        playerNotes: expect.any(String),
        tags: expect.any(Array),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      expect(session.status).toBe('planned');
      expect(session.duration).toBe(180);
      expect(session.tags).toEqual(['テスト', '初回セッション']);
    });

    it('createTestSessionState_shouldReturnValidSessionStateStructure', () => {
      const sessionState = createTestSessionState();

      expect(sessionState).toMatchObject<SessionState>({
        id: expect.any(String),
        sessionId: expect.any(String),
        campaignId: expect.any(String),
        currentScene: expect.any(String),
        activeCharacterIds: expect.any(Array),
        timestamp: expect.any(String),
        chatMessages: expect.any(Array),
        diceRolls: expect.any(Array),
        notes: expect.any(String),
      });

      expect(sessionState.activeCharacterIds).toEqual(['test-character-1']);
      expect(sessionState.chatMessages).toEqual([]);
      expect(sessionState.diceRolls).toEqual([]);
    });

    it('createTestChatMessage_shouldReturnValidChatMessageStructure', () => {
      const message = createTestChatMessage();

      expect(message).toMatchObject<ChatMessage>({
        id: expect.any(String),
        sessionId: expect.any(String),
        senderId: expect.any(String),
        senderName: expect.any(String),
        senderType: expect.any(String),
        content: expect.any(String),
        messageType: expect.any(String),
        timestamp: expect.any(String),
      });

      expect(message.senderType).toBe('player');
      expect(message.messageType).toBe('chat');
    });

    it('createTestDiceRoll_shouldReturnValidDiceRollStructure', () => {
      const diceRoll = createTestDiceRoll();

      expect(diceRoll).toMatchObject<DiceRoll>({
        id: expect.any(String),
        characterId: expect.any(String),
        characterName: expect.any(String),
        rollType: expect.any(String),
        dice: expect.any(String),
        result: expect.any(Number),
        modifier: expect.any(Number),
        total: expect.any(Number),
        purpose: expect.any(String),
        timestamp: expect.any(String),
      });

      expect(diceRoll.rollType).toBe('ability_check');
      expect(diceRoll.dice).toBe('1d20');
      expect(diceRoll.total).toBe(17); // result + modifier
    });
  });

  describe('Location and Quest Factories', () => {
    it('createTestLocation_shouldReturnValidLocationStructure', () => {
      const location = createTestLocation();

      expect(location).toMatchObject<Location>({
        id: expect.any(String),
        name: expect.any(String),
        description: expect.any(String),
        type: expect.any(String),
        connections: expect.any(Array),
        campaignId: expect.any(String),
        isCurrentLocation: expect.any(Boolean),
      });

      expect(location.type).toBe('settlement');
      expect(location.isCurrentLocation).toBe(true);
      expect(location.connections).toEqual(['test-location-2']);
    });

    it('createTestQuest_shouldReturnValidQuestStructure', () => {
      const quest = createTestQuest();

      expect(quest).toMatchObject<Quest>({
        id: expect.any(String),
        title: expect.any(String),
        description: expect.any(String),
        status: expect.any(String),
        difficulty: expect.any(String),
        rewards: expect.any(Array),
        campaignId: expect.any(String),
      });

      expect(quest.status).toBe('active');
      expect(quest.difficulty).toBe('medium');
      expect(quest.rewards).toEqual(['500ゴールド', '魔法のアミュレット']);
    });
  });

  describe('AI and System Factories', () => {
    it('createTestAIGameContext_shouldReturnValidAIGameContextStructure', () => {
      const context = createTestAIGameContext();

      expect(context).toMatchObject<AIGameContext>({
        campaignId: expect.any(String),
        sessionId: expect.any(String),
        currentLocation: expect.any(String),
        activeCharacters: expect.any(Array),
        sessionPhase: expect.any(String),
        lastUserAction: expect.any(String),
        relevantHistory: expect.any(Array),
      });

      expect(context.sessionPhase).toBe('exploration');
      expect(context.lastUserAction).toBe('character_interaction');
      expect(context.relevantHistory).toHaveLength(2);
    });

    it('createTestCharacterAISettings_shouldReturnValidCharacterAISettingsStructure', () => {
      const settings = createTestCharacterAISettings();

      expect(settings).toMatchObject<CharacterAISettings>({
        characterId: expect.any(String),
        personalityType: expect.any(String),
        communicationStyle: expect.any(String),
        actionPriority: expect.any(String),
        autonomyLevel: expect.any(Number),
      });

      expect(settings.personalityType).toBe('cautious');
      expect(settings.communicationStyle).toBe('formal');
      expect(settings.autonomyLevel).toBe(0.5);
    });
  });

  describe('Party Movement Factories', () => {
    it('createTestMovementProposal_shouldReturnValidMovementProposalStructure', () => {
      const proposal = createTestMovementProposal();

      expect(proposal).toMatchObject<PartyMovementProposal>({
        id: expect.any(String),
        campaignId: expect.any(String),
        proposerId: expect.any(String),
        targetLocationId: expect.any(String),
        reason: expect.any(String),
        status: expect.any(String),
        createdAt: expect.any(String),
        votingDeadline: expect.any(String),
      });

      expect(proposal.status).toBe('voting');
    });

    it('createTestMovementVote_shouldReturnValidMovementVoteStructure', () => {
      const vote = createTestMovementVote();

      expect(vote).toMatchObject<MovementVote>({
        id: expect.any(String),
        proposalId: expect.any(String),
        voterId: expect.any(String),
        choice: expect.any(String),
        reason: expect.any(String),
        timestamp: expect.any(String),
      });

      expect(vote.choice).toBe('agree');
    });

    it('createTestConsensusSettings_shouldReturnValidConsensusSettingsStructure', () => {
      const settings = createTestConsensusSettings();

      expect(settings).toMatchObject<ConsensusSettings>({
        votingTimeLimit: expect.any(Number),
        requiredAgreementRatio: expect.any(Number),
        allowAbstention: expect.any(Boolean),
        autoExecuteOnConsensus: expect.any(Boolean),
      });

      expect(settings.votingTimeLimit).toBe(300);
      expect(settings.requiredAgreementRatio).toBe(0.6);
    });
  });

  describe('Session Initialization Factories', () => {
    it('createTestSessionInitializationProgressDetail_shouldReturnValidProgressDetailForEachPhase', () => {
      const scenarioDetail = createTestSessionInitializationProgressDetail('scenario');
      const milestoneDetail = createTestSessionInitializationProgressDetail('milestone');
      const entityDetail = createTestSessionInitializationProgressDetail('entity');

      expect(scenarioDetail).toMatchObject<SessionInitializationProgressDetail>({
        phase: 'scenario',
        phaseName: 'シナリオ生成',
        progress: expect.any(Number),
        status: expect.any(String),
        currentTask: expect.any(String),
        completedTasks: expect.any(Array),
        totalTasks: expect.any(Number),
        estimatedTimeRemaining: expect.any(Number),
      });

      expect(milestoneDetail.phaseName).toBe('マイルストーン生成');
      expect(entityDetail.phaseName).toBe('エンティティ生成');
      expect(scenarioDetail.status).toBe('pending');
    });

    it('createTestSessionInitializationProgress_shouldReturnValidInitializationProgressStructure', () => {
      const progress = createTestSessionInitializationProgress();

      expect(progress).toMatchObject<SessionInitializationProgress>({
        isInitializing: expect.any(Boolean),
        currentPhase: null,
        overallProgress: expect.any(Number),
        phases: expect.objectContaining({
          scenario: expect.any(Object),
          milestone: expect.any(Object),
          entity: expect.any(Object),
        }),
        sessionId: null,
        campaignId: null,
      });

      expect(progress.isInitializing).toBe(false);
      expect(progress.overallProgress).toBe(0);
      expect(progress.phases.scenario.phase).toBe('scenario');
      expect(progress.phases.milestone.phase).toBe('milestone');
      expect(progress.phases.entity.phase).toBe('entity');
    });

    it('createTestSessionInitializationProgressDetail_withOverrides_shouldMergeCorrectly', () => {
      const overrides = {
        progress: 75,
        status: 'completed' as const,
        currentTask: 'Finalizing scenario',
        completedTasks: ['Task 1', 'Task 2', 'Task 3'],
      };

      const detail = createTestSessionInitializationProgressDetail('scenario', overrides);

      expect(detail.progress).toBe(75);
      expect(detail.status).toBe('completed');
      expect(detail.currentTask).toBe('Finalizing scenario');
      expect(detail.completedTasks).toEqual(['Task 1', 'Task 2', 'Task 3']);
      expect(detail.totalTasks).toBe(5); // Should preserve default
    });
  });

  describe('Notification Factories', () => {
    it('createTestGMNotification_shouldReturnValidGMNotificationStructure', () => {
      const notification = createTestGMNotification();

      expect(notification).toMatchObject<GMNotification>({
        id: expect.any(String),
        type: expect.any(String),
        priority: expect.any(String),
        title: expect.any(String),
        message: expect.any(String),
        timestamp: expect.any(String),
        isRead: expect.any(Boolean),
        sessionId: expect.any(String),
        campaignId: expect.any(String),
      });

      expect(notification.type).toBe('character_action');
      expect(notification.priority).toBe('medium');
      expect(notification.isRead).toBe(false);
    });
  });

  describe('Complex Test Data Creation Helpers', () => {
    it('createCompleteTestCampaignSetup_shouldReturnFullCampaignDataset', () => {
      const setup = createCompleteTestCampaignSetup();

      expect(setup).toMatchObject({
        campaign: expect.any(Object),
        characters: expect.any(Array),
        locations: expect.any(Array),
        quests: expect.any(Array),
        session: expect.any(Object),
        sessionState: expect.any(Object),
      });

      expect(setup.characters).toHaveLength(3);
      expect(setup.characters[0].type).toBe('pc');
      expect(setup.characters[1].type).toBe('npc');
      expect(setup.characters[2].type).toBe('enemy');
      expect(setup.locations).toHaveLength(1);
      expect(setup.quests).toHaveLength(1);
    });

    it('createActiveSessionTestData_shouldReturnActiveSessionDataset', () => {
      const data = createActiveSessionTestData();

      expect(data).toMatchObject({
        campaign: expect.any(Object),
        characters: expect.any(Array),
        session: expect.objectContaining({
          status: 'active',
        }),
        chatMessages: expect.any(Array),
        diceRolls: expect.any(Array),
      });

      expect(data.session.status).toBe('active');
      expect(data.chatMessages).toHaveLength(2);
      expect(data.diceRolls).toHaveLength(1);
      expect(data.chatMessages[0].content).toBe('セッション開始！');
    });

    it('createErrorTestData_shouldReturnErrorScenarioData', () => {
      const errorData = createErrorTestData();

      expect(errorData).toMatchObject({
        invalidCampaign: expect.any(Object),
        invalidCharacter: expect.any(Object),
        networkError: expect.any(Error),
        validationError: expect.any(Error),
      });

      expect(errorData.invalidCampaign.id).toBe('');
      expect(errorData.invalidCharacter.campaignId).toBe('');
      expect(errorData.networkError.message).toBe('ネットワークエラー');
      expect(errorData.validationError.message).toBe('バリデーションエラー');
    });
  });

  describe('Type Safety and Production Compatibility', () => {
    it('allFactories_shouldProduceTypesCompatibleWithProductionTypes', () => {
      // This test ensures that test data factories produce objects 
      // that are fully compatible with production types
      const campaign: TRPGCampaign = createTestCampaign();
      const character: Character = createTestCharacter();
      const trpgCharacter: TRPGCharacter = createTestTRPGCharacter();
      const npcCharacter: NPCCharacter = createTestNPCCharacter();
      const enemyCharacter: EnemyCharacter = createTestEnemyCharacter();
      const session: TRPGSession = createTestSession();
      const sessionState: SessionState = createTestSessionState();
      const chatMessage: ChatMessage = createTestChatMessage();
      const diceRoll: DiceRoll = createTestDiceRoll();
      const location: Location = createTestLocation();
      const quest: Quest = createTestQuest();
      const aiContext: AIGameContext = createTestAIGameContext();
      const aiSettings: CharacterAISettings = createTestCharacterAISettings();
      const movementProposal: PartyMovementProposal = createTestMovementProposal();
      const movementVote: MovementVote = createTestMovementVote();
      const consensusSettings: ConsensusSettings = createTestConsensusSettings();
      const progress: SessionInitializationProgress = createTestSessionInitializationProgress();
      const notification: GMNotification = createTestGMNotification();

      // If TypeScript compilation succeeds, these assignments prove type compatibility
      expect(campaign).toBeDefined();
      expect(character).toBeDefined();
      expect(trpgCharacter).toBeDefined();
      expect(npcCharacter).toBeDefined();
      expect(enemyCharacter).toBeDefined();
      expect(session).toBeDefined();
      expect(sessionState).toBeDefined();
      expect(chatMessage).toBeDefined();
      expect(diceRoll).toBeDefined();
      expect(location).toBeDefined();
      expect(quest).toBeDefined();
      expect(aiContext).toBeDefined();
      expect(aiSettings).toBeDefined();
      expect(movementProposal).toBeDefined();
      expect(movementVote).toBeDefined();
      expect(consensusSettings).toBeDefined();
      expect(progress).toBeDefined();
      expect(notification).toBeDefined();
    });

    it('factoriesWithOverrides_shouldMaintainTypeIntegrity', () => {
      // Test that factories with overrides still produce valid types
      const campaignWithOverrides = createTestCampaign({
        id: 'custom-id',
        status: 'completed',
        worldSetting: {
          name: 'Custom World',
          description: 'Custom description',
          theme: 'Custom theme',
        },
      });

      const characterWithOverrides = createTestCharacter({
        name: 'Custom Character',
        level: 10,
        stats: {
          strength: 20,
          dexterity: 18,
          constitution: 16,
          intelligence: 14,
          wisdom: 12,
          charisma: 10,
        },
      });

      // Type assignments should succeed
      const campaign: TRPGCampaign = campaignWithOverrides;
      const character: Character = characterWithOverrides;

      expect(campaign.id).toBe('custom-id');
      expect(character.level).toBe(10);
    });
  });

  describe('Factory Consistency and Reliability', () => {
    it('factories_multipleInvocations_shouldProduceConsistentStructures', () => {
      const campaign1 = createTestCampaign();
      const campaign2 = createTestCampaign();
      const character1 = createTestCharacter();
      const character2 = createTestCharacter();

      // Should have same structure but different instances
      expect(campaign1).toEqual(campaign2);
      expect(character1).toEqual(character2);
      expect(campaign1).not.toBe(campaign2);
      expect(character1).not.toBe(character2);
    });

    it('factories_withSameOverrides_shouldProduceSameResults', () => {
      const overrides = { name: 'Consistent Name', level: 5 };
      const character1 = createTestCharacter(overrides);
      const character2 = createTestCharacter(overrides);

      expect(character1).toEqual(character2);
      expect(character1.name).toBe('Consistent Name');
      expect(character2.name).toBe('Consistent Name');
    });

    it('factoryChaining_shouldWorkCorrectly', () => {
      // Test that factories can be used to build upon each other
      const baseCharacter = createTestCharacter();
      const enhancedCharacter = createTestTRPGCharacter({
        ...baseCharacter,
        name: 'Enhanced Character',
        level: 10,
      });

      expect(enhancedCharacter.name).toBe('Enhanced Character');
      expect(enhancedCharacter.level).toBe(10);
      expect(enhancedCharacter.characterClass).toBe('ローグ'); // From TRPGCharacter factory
      expect(enhancedCharacter.type).toBe('pc'); // From base character
    });

    it('complexHelpers_shouldProduceCoherentDataSets', () => {
      const setup = createCompleteTestCampaignSetup();
      const activeData = createActiveSessionTestData();

      // All related entities should have consistent references
      expect(setup.session.campaignId).toBe(setup.campaign.id);
      expect(setup.sessionState.campaignId).toBe(setup.campaign.id);
      expect(setup.sessionState.sessionId).toBe(setup.session.id);

      expect(activeData.session.campaignId).toBe(activeData.campaign.id);
      expect(activeData.chatMessages[1].senderId).toBe(activeData.characters[0].id);
      expect(activeData.diceRolls[0].characterId).toBe(activeData.characters[0].id);
    });
  });
});