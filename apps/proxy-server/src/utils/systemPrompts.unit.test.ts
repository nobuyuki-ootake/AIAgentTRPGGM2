/**
 * System Prompts Utility Unit Tests
 * Tests for AI System Prompts Generation and Content Management
 * t-WADA naming convention: systemPrompts.unit.test.ts
 */

import { describe, test, expect } from '@jest/globals';
import { systemPrompts } from './systemPrompts';

describe('System Prompts Utility - AI Prompt Generation and Management', () => {
  
  describe('Campaign Creation Prompts - getCampaignCreationPrompt', () => {
    test('should return campaign creation prompt with core guidelines', () => {
      // Act
      const prompt = systemPrompts.getCampaignCreationPrompt();

      // Assert
      expect(prompt).toContain('TRPG Game Master');
      expect(prompt).toContain('campaign designer');
      expect(prompt).toContain('World Building');
      expect(prompt).toContain('Story Structure');
      expect(prompt).toContain('Character Integration');
      expect(prompt).toContain('Balance');
      expect(prompt).toContain('Creativity');
    });

    test('should include specific campaign design guidelines', () => {
      // Act
      const prompt = systemPrompts.getCampaignCreationPrompt();

      // Assert
      expect(prompt).toContain('game system\'s rules');
      expect(prompt).toContain('experience level');
      expect(prompt).toContain('combat, exploration, social interaction');
      expect(prompt).toContain('engaging for all player types');
    });

    test('should return non-empty string', () => {
      // Act
      const prompt = systemPrompts.getCampaignCreationPrompt();

      // Assert
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(100);
    });
  });

  describe('Character Generation Prompts - getCharacterGenerationPrompt', () => {
    test('should return PC-specific prompt with appropriate guidelines', () => {
      // Act
      const prompt = systemPrompts.getCharacterGenerationPrompt('PC');

      // Assert
      expect(prompt).toContain('Player Characters');
      expect(prompt).toContain('Mechanically viable');
      expect(prompt).toContain('roleplay opportunities');
      expect(prompt).toContain('backstories and goals');
      expect(prompt).toContain('complete character sheets');
    });

    test('should return NPC-specific prompt with appropriate guidelines', () => {
      // Act
      const prompt = systemPrompts.getCharacterGenerationPrompt('NPC');

      // Assert
      expect(prompt).toContain('Non-Player Characters');
      expect(prompt).toContain('distinct personalities');
      expect(prompt).toContain('clear motivations');
      expect(prompt).toContain('story hooks');
      expect(prompt).toContain('meaningful interactions');
    });

    test('should return Enemy-specific prompt with appropriate guidelines', () => {
      // Act
      const prompt = systemPrompts.getCharacterGenerationPrompt('Enemy');

      // Assert
      expect(prompt).toContain('Enemy Characters');
      expect(prompt).toContain('challenge rating');
      expect(prompt).toContain('tactically interesting');
      expect(prompt).toContain('balanced combat encounters');
      expect(prompt).toContain('appropriate loot');
    });

    test('should return base prompt for invalid character type', () => {
      // Act
      const prompt = systemPrompts.getCharacterGenerationPrompt('Invalid' as any);

      // Assert
      expect(prompt).toContain('expert character creator');
      expect(prompt).not.toContain('Player Characters');
      expect(prompt).not.toContain('Non-Player Characters');
      expect(prompt).not.toContain('Enemy Characters');
    });

    test('should have distinct prompts for each character type', () => {
      // Act
      const pcPrompt = systemPrompts.getCharacterGenerationPrompt('PC');
      const npcPrompt = systemPrompts.getCharacterGenerationPrompt('NPC');
      const enemyPrompt = systemPrompts.getCharacterGenerationPrompt('Enemy');

      // Assert
      expect(pcPrompt).not.toBe(npcPrompt);
      expect(npcPrompt).not.toBe(enemyPrompt);
      expect(enemyPrompt).not.toBe(pcPrompt);
      expect(pcPrompt.length).toBeGreaterThan(200);
      expect(npcPrompt.length).toBeGreaterThan(200);
      expect(enemyPrompt.length).toBeGreaterThan(200);
    });
  });

  describe('Event Generation Prompts - getEventGenerationPrompt', () => {
    test('should return comprehensive event generation guidelines', () => {
      // Act
      const prompt = systemPrompts.getEventGenerationPrompt();

      // Assert
      expect(prompt).toContain('event designer');
      expect(prompt).toContain('Combat Events');
      expect(prompt).toContain('Social Events');
      expect(prompt).toContain('Exploration Events');
      expect(prompt).toContain('Story Events');
    });

    test('should include specific event design considerations', () => {
      // Act
      const prompt = systemPrompts.getEventGenerationPrompt();

      // Assert
      expect(prompt).toContain('tactically interesting encounters');
      expect(prompt).toContain('complex NPCs');
      expect(prompt).toContain('environmental challenges');
      expect(prompt).toContain('meaningful choices');
      expect(prompt).toContain('party composition');
    });
  });

  describe('GM Assistant Prompts - getGMAssistantPrompt', () => {
    test('should return GM assistance guidelines for real-time support', () => {
      // Act
      const prompt = systemPrompts.getGMAssistantPrompt();

      // Assert
      expect(prompt).toContain('Game Master\'s assistant');
      expect(prompt).toContain('real-time session management');
      expect(prompt).toContain('Rules Support');
      expect(prompt).toContain('Session Management');
      expect(prompt).toContain('Player Engagement');
    });

    test('should include practical advice categories', () => {
      // Act
      const prompt = systemPrompts.getGMAssistantPrompt();

      // Assert
      expect(prompt).toContain('quick, accurate rule interpretations');
      expect(prompt).toContain('maintain pacing');
      expect(prompt).toContain('spotlight different players');
      expect(prompt).toContain('multiple options');
    });
  });

  describe('NPC Behavior Prompts - getNPCBehaviorPrompt', () => {
    test('should return NPC portrayal and psychology guidelines', () => {
      // Act
      const prompt = systemPrompts.getNPCBehaviorPrompt();

      // Assert
      expect(prompt).toContain('NPC portrayal');
      expect(prompt).toContain('character psychology');
      expect(prompt).toContain('Personality Consistency');
      expect(prompt).toContain('Realistic Reactions');
      expect(prompt).toContain('Dialogue Quality');
    });

    test('should include relationship and story integration guidance', () => {
      // Act
      const prompt = systemPrompts.getNPCBehaviorPrompt();

      // Assert
      expect(prompt).toContain('Relationship Dynamics');
      expect(prompt).toContain('Story Integration');
      expect(prompt).toContain('power dynamics');
      expect(prompt).toContain('character development');
    });
  });

  describe('Rules Assistant Prompts - getRulesAssistantPrompt', () => {
    test('should return system-specific rules assistance prompt', () => {
      // Arrange
      const gameSystem = 'D&D 5e';

      // Act
      const prompt = systemPrompts.getRulesAssistantPrompt(gameSystem);

      // Assert
      expect(prompt).toContain('D&D 5e');
      expect(prompt).toContain('rules expert');
      expect(prompt).toContain('core rules and supplements');
      expect(prompt).toContain('game balance');
    });

    test('should include rules assistance categories', () => {
      // Arrange
      const gameSystem = 'Pathfinder 2e';

      // Act
      const prompt = systemPrompts.getRulesAssistantPrompt(gameSystem);

      // Assert
      expect(prompt).toContain('Pathfinder 2e');
      expect(prompt).toContain('Accuracy');
      expect(prompt).toContain('Clarity');
      expect(prompt).toContain('Balance');
      expect(prompt).toContain('Practicality');
      expect(prompt).toContain('Fairness');
    });

    test('should adapt to different game systems', () => {
      // Act
      const dndPrompt = systemPrompts.getRulesAssistantPrompt('D&D 5e');
      const pfPrompt = systemPrompts.getRulesAssistantPrompt('Pathfinder');
      const gurpsPrompt = systemPrompts.getRulesAssistantPrompt('GURPS');

      // Assert
      expect(dndPrompt).toContain('D&D 5e');
      expect(pfPrompt).toContain('Pathfinder');
      expect(gurpsPrompt).toContain('GURPS');
      expect(dndPrompt).not.toBe(pfPrompt);
      expect(pfPrompt).not.toBe(gurpsPrompt);
    });
  });

  describe('Milestone Generation Prompts - getMilestoneGenerationPrompt', () => {
    test('should return milestone design guidelines', () => {
      // Act
      const prompt = systemPrompts.getMilestoneGenerationPrompt();

      // Assert
      expect(prompt).toContain('milestone designer');
      expect(prompt).toContain('game progression');
      expect(prompt).toContain('Enemy Defeat');
      expect(prompt).toContain('Event Clear');
      expect(prompt).toContain('NPC Communication');
      expect(prompt).toContain('Item Acquisition');
      expect(prompt).toContain('Quest Completion');
    });

    test('should include milestone design principles', () => {
      // Act
      const prompt = systemPrompts.getMilestoneGenerationPrompt();

      // Assert
      expect(prompt).toContain('Theme Adaptation');
      expect(prompt).toContain('Milestone Design Principles');
      expect(prompt).toContain('approximately 3 milestones per session');
      expect(prompt).toContain('clear success criteria');
    });
  });

  describe('Entity Pool Generation Prompts - getEntityPoolGenerationPrompt', () => {
    test('should return entity pool creation guidelines', () => {
      // Act
      const prompt = systemPrompts.getEntityPoolGenerationPrompt();

      // Assert
      expect(prompt).toContain('entity pools');
      expect(prompt).toContain('Enemy Generation');
      expect(prompt).toContain('Event Generation');
      expect(prompt).toContain('NPC Generation');
      expect(prompt).toContain('Item Generation');
      expect(prompt).toContain('Quest Generation');
    });

    test('should include theme integration requirements', () => {
      // Act
      const prompt = systemPrompts.getEntityPoolGenerationPrompt();

      // Assert
      expect(prompt).toContain('Theme Integration');
      expect(prompt).toContain('thematic coherence');
      expect(prompt).toContain('campaign tone and setting');
      expect(prompt).toContain('balanced challenge distribution');
    });
  });

  describe('Theme Adaptation Prompts - getThemeAdaptationPrompt', () => {
    test('should return theme adaptation guidelines', () => {
      // Act
      const prompt = systemPrompts.getThemeAdaptationPrompt();

      // Assert
      expect(prompt).toContain('theme adaptation');
      expect(prompt).toContain('campaign settings');
      expect(prompt).toContain('Content Adaptation Strategies');
      expect(prompt).toContain('Specific Theme Considerations');
    });

    test('should include specific theme examples', () => {
      // Act
      const prompt = systemPrompts.getThemeAdaptationPrompt();

      // Assert
      expect(prompt).toContain('Peaceful/Daily Life Themes');
      expect(prompt).toContain('Horror Themes');
      expect(prompt).toContain('Political/Intrigue Themes');
      expect(prompt).toContain('Exploration/Discovery Themes');
    });
  });

  describe('Persona-specific Prompts - getPersonaPrompt', () => {
    test('should return GM assistant prompt for gm_assistant persona', () => {
      // Act
      const prompt = systemPrompts.getPersonaPrompt('gm_assistant');

      // Assert
      expect(prompt).toContain('Game Master\'s assistant');
      expect(prompt).toContain('real-time session management');
    });

    test('should return world builder prompt for world_builder persona', () => {
      // Act
      const prompt = systemPrompts.getPersonaPrompt('world_builder');

      // Assert
      expect(prompt).toContain('master world-builder');
      expect(prompt).toContain('fantasy and sci-fi settings');
      expect(prompt).toContain('internal consistency');
    });

    test('should return character creator prompt for character_creator persona', () => {
      // Act
      const prompt = systemPrompts.getPersonaPrompt('character_creator');

      // Assert
      expect(prompt).toContain('expert character designer');
      expect(prompt).toContain('balanced characters');
      expect(prompt).toContain('rich backstories');
    });

    test('should return story teller prompt for story_teller persona', () => {
      // Act
      const prompt = systemPrompts.getPersonaPrompt('story_teller');

      // Assert
      expect(prompt).toContain('master storyteller');
      expect(prompt).toContain('narrative structure');
      expect(prompt).toContain('emotional engagement');
    });

    test('should return rule advisor prompt for rule_advisor persona', () => {
      // Act
      const prompt = systemPrompts.getPersonaPrompt('rule_advisor');

      // Assert
      expect(prompt).toContain('rules expert');
      expect(prompt).toContain('game mechanics');
      expect(prompt).toContain('game balance');
    });

    test('should return balance checker prompt for balance_checker persona', () => {
      // Act
      const prompt = systemPrompts.getPersonaPrompt('balance_checker');

      // Assert
      expect(prompt).toContain('game balance');
      expect(prompt).toContain('encounter design');
      expect(prompt).toContain('fair gameplay');
    });

    test('should return milestone designer prompt for milestone_designer persona', () => {
      // Act
      const prompt = systemPrompts.getPersonaPrompt('milestone_designer');

      // Assert
      expect(prompt).toContain('milestone designer');
      expect(prompt).toContain('game progression');
    });

    test('should return entity pool generator prompt for entity_pool_generator persona', () => {
      // Act
      const prompt = systemPrompts.getPersonaPrompt('entity_pool_generator');

      // Assert
      expect(prompt).toContain('entity pools');
      expect(prompt).toContain('dynamic gameplay');
    });

    test('should return theme adapter prompt for theme_adapter persona', () => {
      // Act
      const prompt = systemPrompts.getPersonaPrompt('theme_adapter');

      // Assert
      expect(prompt).toContain('theme adaptation');
      expect(prompt).toContain('campaign settings');
    });

    test('should return general assistant prompt for unknown persona', () => {
      // Act
      const prompt = systemPrompts.getPersonaPrompt('unknown_persona');

      // Assert
      expect(prompt).toContain('helpful TRPG assistant');
      expect(prompt).toContain('tabletop gaming');
      expect(prompt).toContain('broad knowledge');
    });
  });

  describe('General Assistant Prompts - getGeneralAssistantPrompt', () => {
    test('should return comprehensive general assistance guidelines', () => {
      // Act
      const prompt = systemPrompts.getGeneralAssistantPrompt();

      // Assert
      expect(prompt).toContain('helpful TRPG assistant');
      expect(prompt).toContain('tabletop gaming');
      expect(prompt).toContain('storytelling');
      expect(prompt).toContain('game mechanics');
      expect(prompt).toContain('player agency');
      expect(prompt).toContain('inclusive and welcoming');
    });

    test('should include response quality guidelines', () => {
      // Act
      const prompt = systemPrompts.getGeneralAssistantPrompt();

      // Assert
      expect(prompt).toContain('Helpful and practical');
      expect(prompt).toContain('experience level');
      expect(prompt).toContain('multiple perspectives');
      expect(prompt).toContain('collaborative nature');
    });
  });

  describe('Interactive Event System Prompts', () => {
    describe('Choice Interpretation - getChoiceInterpretationPrompt', () => {
      test('should return choice interpretation guidelines with JSON format', () => {
        // Act
        const prompt = systemPrompts.getChoiceInterpretationPrompt();

        // Assert
        expect(prompt).toContain('interpreting player choices');
        expect(prompt).toContain('dynamic, engaging tasks');
        expect(prompt).toContain('Choice Analysis');
        expect(prompt).toContain('Task Generation');
        expect(prompt).toContain('RESPONSE FORMAT (JSON)');
        expect(prompt).toContain('"id"');
        expect(prompt).toContain('"choiceId"');
        expect(prompt).toContain('"interpretation"');
      });

      test('should include difficulty assessment guidelines', () => {
        // Act
        const prompt = systemPrompts.getChoiceInterpretationPrompt();

        // Assert
        expect(prompt).toContain('Difficulty Assessment');
        expect(prompt).toContain('Narrative Integration');
        expect(prompt).toContain('easy|medium|hard|extreme');
        expect(prompt).toContain('character level');
      });
    });

    describe('Task Evaluation - getTaskEvaluationPrompt', () => {
      test('should return task evaluation criteria and JSON format', () => {
        // Act
        const prompt = systemPrompts.getTaskEvaluationPrompt();

        // Assert
        expect(prompt).toContain('evaluating player solutions');
        expect(prompt).toContain('dynamic difficulty adjustments');
        expect(prompt).toContain('Feasibility (0-100)');
        expect(prompt).toContain('Creativity (0-100)');
        expect(prompt).toContain('Risk Level (0-100)');
        expect(prompt).toContain('RESPONSE FORMAT (JSON)');
      });

      test('should include difficulty modifiers', () => {
        // Act
        const prompt = systemPrompts.getTaskEvaluationPrompt();

        // Assert
        expect(prompt).toContain('DIFFICULTY MODIFIERS');
        expect(prompt).toContain('High creativity: -2');
        expect(prompt).toContain('Excellent approach: -3');
        expect(prompt).toContain('Low feasibility: +2');
      });
    });

    describe('Result Narration - getResultNarrationPrompt', () => {
      test('should return narrative creation guidelines', () => {
        // Act
        const prompt = systemPrompts.getResultNarrationPrompt();

        // Assert
        expect(prompt).toContain('compelling narratives');
        expect(prompt).toContain('action resolution');
        expect(prompt).toContain('Success Narratives');
        expect(prompt).toContain('Failure Narratives');
        expect(prompt).toContain('Critical Results');
      });

      test('should include narrative examples', () => {
        // Act
        const prompt = systemPrompts.getResultNarrationPrompt();

        // Assert
        expect(prompt).toContain('Examples:');
        expect(prompt).toContain('SUCCESS:');
        expect(prompt).toContain('FAILURE:');
        expect(prompt).toContain('2-4 sentences');
      });
    });

    describe('Difficulty Calculation - getDifficultyCalculationPrompt', () => {
      test('should return difficulty calculation system with DC levels', () => {
        // Act
        const prompt = systemPrompts.getDifficultyCalculationPrompt();

        // Assert
        expect(prompt).toContain('dynamic difficulty calculation');
        expect(prompt).toContain('BASE DIFFICULTY LEVELS');
        expect(prompt).toContain('Trivial (DC 5)');
        expect(prompt).toContain('Easy (DC 10)');
        expect(prompt).toContain('Medium (DC 15)');
        expect(prompt).toContain('Hard (DC 20)');
        expect(prompt).toContain('Extreme (DC 25)');
      });

      test('should include modifier categories and JSON format', () => {
        // Act
        const prompt = systemPrompts.getDifficultyCalculationPrompt();

        // Assert
        expect(prompt).toContain('MODIFIER CATEGORIES');
        expect(prompt).toContain('Character Factors');
        expect(prompt).toContain('Approach Quality');
        expect(prompt).toContain('Environmental Factors');
        expect(prompt).toContain('RESPONSE FORMAT (JSON)');
      });
    });
  });

  describe('Phase 5: Top-Down Generation Prompts (Japanese)', () => {
    describe('Milestone Outlines - getMilestoneOutlinesPrompt', () => {
      test('should return Japanese milestone outline generation guidelines', () => {
        // Act
        const prompt = systemPrompts.getMilestoneOutlinesPrompt();

        // Assert
        expect(prompt).toContain('マイルストーン概要');
        expect(prompt).toContain('プレイヤーの手探り体験');
        expect(prompt).toContain('特定エネミー討伐');
        expect(prompt).toContain('特定イベントクリア');
        expect(prompt).toContain('特定NPCとの特定コミュニケーション');
        expect(prompt).toContain('JSON');
      });

      test('should include milestone generation requirements', () => {
        // Act
        const prompt = systemPrompts.getMilestoneOutlinesPrompt();

        // Assert
        expect(prompt).toContain('生成要件');
        expect(prompt).toContain('エンティティ3個');
        expect(prompt).toContain('33%, 33%, 34%');
        expect(prompt).toContain('日本語で自然で魅力的');
      });
    });

    describe('Core Entities - getCoreEntitiesPrompt', () => {
      test('should return Japanese core entity generation guidelines', () => {
        // Act
        const prompt = systemPrompts.getCoreEntitiesPrompt();

        // Assert
        expect(prompt).toContain('コアエンティティ');
        expect(prompt).toContain('マイルストーン達成に直結');
        expect(prompt).toContain('Events（イベント）');
        expect(prompt).toContain('NPCs（ノンプレイヤーキャラクター）');
        expect(prompt).toContain('Items（アイテム）');
      });

      test('should include progress contribution guidelines', () => {
        // Act
        const prompt = systemPrompts.getCoreEntitiesPrompt();

        // Assert
        expect(prompt).toContain('進捗貢献度');
        expect(prompt).toContain('通常40%');
        expect(prompt).toContain('通常30%');
        expect(prompt).toContain('合計100%');
      });
    });

    describe('Bonus Entities - getBonusEntitiesPrompt', () => {
      test('should return Japanese bonus entity generation guidelines', () => {
        // Act
        const prompt = systemPrompts.getBonusEntitiesPrompt();

        // Assert
        expect(prompt).toContain('ボーナスエンティティ');
        expect(prompt).toContain('マイルストーン達成には寄与しない');
        expect(prompt).toContain('実用的報酬エンティティ');
        expect(prompt).toContain('トロフィー・収集系エンティティ');
        expect(prompt).toContain('ミステリー系エンティティ');
      });

      test('should include entity categorization', () => {
        // Act
        const prompt = systemPrompts.getBonusEntitiesPrompt();

        // Assert
        expect(prompt).toContain('Practical Rewards');
        expect(prompt).toContain('Trophy Items');
        expect(prompt).toContain('Mystery Items');
        expect(prompt).toContain('各カテゴリから2個程度');
      });
    });

    describe('Subtle Hints - getSubtleHintsPrompt', () => {
      test('should return Japanese subtle hint generation guidelines', () => {
        // Act
        const prompt = systemPrompts.getSubtleHintsPrompt();

        // Assert
        expect(prompt).toContain('暗示的ヒント生成');
        expect(prompt).toContain('プレイヤーの手探り体験');
        expect(prompt).toContain('間接的表現');
        expect(prompt).toContain('自然な誘導');
        expect(prompt).toContain('好奇心刺激');
      });

      test('should include hint types and examples', () => {
        // Act
        const prompt = systemPrompts.getSubtleHintsPrompt();

        // Assert
        expect(prompt).toContain('環境的ヒント');
        expect(prompt).toContain('情報的ヒント');
        expect(prompt).toContain('行動示唆ヒント');
        expect(prompt).toContain('夜になると不気味な気配');
      });
    });

    describe('Natural Guidance - getNaturalGuidancePrompt', () => {
      test('should return Japanese natural guidance generation guidelines', () => {
        // Act
        const prompt = systemPrompts.getNaturalGuidancePrompt();

        // Assert
        expect(prompt).toContain('自然な誘導');
        expect(prompt).toContain('強制感のない');
        expect(prompt).toContain('プレイヤーの自主性');
        expect(prompt).toContain('選択肢の提示');
        expect(prompt).toContain('興味の喚起');
      });

      test('should include guidance techniques', () => {
        // Act
        const prompt = systemPrompts.getNaturalGuidancePrompt();

        // Assert
        expect(prompt).toContain('環境描写による誘導');
        expect(prompt).toContain('NPCの自然な発言');
        expect(prompt).toContain('状況の変化による誘導');
        expect(prompt).toContain('単一の自然な誘導メッセージ');
      });
    });

    describe('Location Mapping - getLocationMappingPrompt', () => {
      test('should return Japanese location mapping guidelines', () => {
        // Act
        const prompt = systemPrompts.getLocationMappingPrompt();

        // Assert
        expect(prompt).toContain('場所配置を最適化');
        expect(prompt).toContain('エンティティを適切な場所に論理的に配置');
        expect(prompt).toContain('時間条件');
        expect(prompt).toContain('前提条件');
        expect(prompt).toContain('論理的配置');
      });

      test('should include placement principles and examples', () => {
        // Act
        const prompt = systemPrompts.getLocationMappingPrompt();

        // Assert
        expect(prompt).toContain('場所配置の原則');
        expect(prompt).toContain('アクセシビリティ');
        expect(prompt).toContain('day_time');
        expect(prompt).toContain('night_only');
        expect(prompt).toContain('村の中央広場');
      });
    });
  });

  describe('Prompt Content Quality and Consistency', () => {
    test('should return non-empty strings for all prompt methods', () => {
      // Act & Assert
      expect(systemPrompts.getCampaignCreationPrompt().length).toBeGreaterThan(50);
      expect(systemPrompts.getCharacterGenerationPrompt('PC').length).toBeGreaterThan(50);
      expect(systemPrompts.getEventGenerationPrompt().length).toBeGreaterThan(50);
      expect(systemPrompts.getGMAssistantPrompt().length).toBeGreaterThan(50);
      expect(systemPrompts.getNPCBehaviorPrompt().length).toBeGreaterThan(50);
      expect(systemPrompts.getRulesAssistantPrompt('Test System').length).toBeGreaterThan(50);
      expect(systemPrompts.getMilestoneGenerationPrompt().length).toBeGreaterThan(50);
      expect(systemPrompts.getEntityPoolGenerationPrompt().length).toBeGreaterThan(50);
      expect(systemPrompts.getThemeAdaptationPrompt().length).toBeGreaterThan(50);
      expect(systemPrompts.getGeneralAssistantPrompt().length).toBeGreaterThan(50);
    });

    test('should have consistent prompt structure and quality', () => {
      // Act
      const prompts = [
        systemPrompts.getCampaignCreationPrompt(),
        systemPrompts.getCharacterGenerationPrompt('PC'),
        systemPrompts.getEventGenerationPrompt(),
        systemPrompts.getGMAssistantPrompt(),
        systemPrompts.getNPCBehaviorPrompt()
      ];

      // Assert
      prompts.forEach(prompt => {
        expect(prompt).toContain('You are');
        expect(prompt).toContain('expert');
        expect(prompt.length).toBeGreaterThan(200);
        expect(prompt).not.toContain('undefined');
        expect(prompt).not.toContain('null');
      });
    });

    test('should have appropriate Japanese language content for Phase 5 prompts', () => {
      // Act
      const japanesePrompts = [
        systemPrompts.getMilestoneOutlinesPrompt(),
        systemPrompts.getCoreEntitiesPrompt(),
        systemPrompts.getBonusEntitiesPrompt(),
        systemPrompts.getSubtleHintsPrompt(),
        systemPrompts.getNaturalGuidancePrompt(),
        systemPrompts.getLocationMappingPrompt()
      ];

      // Assert
      japanesePrompts.forEach(prompt => {
        expect(prompt).toMatch(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/); // Contains Japanese characters
        expect(prompt.length).toBeGreaterThan(200);
        expect(prompt).toContain('JSON');
      });
    });

    test('should have unique content for different prompt types', () => {
      // Act
      const uniquePrompts = [
        systemPrompts.getCampaignCreationPrompt(),
        systemPrompts.getCharacterGenerationPrompt('PC'),
        systemPrompts.getEventGenerationPrompt(),
        systemPrompts.getGMAssistantPrompt(),
        systemPrompts.getNPCBehaviorPrompt(),
        systemPrompts.getMilestoneGenerationPrompt(),
        systemPrompts.getEntityPoolGenerationPrompt()
      ];

      // Assert
      for (let i = 0; i < uniquePrompts.length; i++) {
        for (let j = i + 1; j < uniquePrompts.length; j++) {
          expect(uniquePrompts[i]).not.toBe(uniquePrompts[j]);
        }
      }
    });
  });

  describe('Interactive Event System Prompt Completeness', () => {
    test('should have all required interactive event system prompts', () => {
      // Act & Assert
      expect(systemPrompts.getChoiceInterpretationPrompt).toBeDefined();
      expect(systemPrompts.getTaskEvaluationPrompt).toBeDefined();
      expect(systemPrompts.getResultNarrationPrompt).toBeDefined();
      expect(systemPrompts.getDifficultyCalculationPrompt).toBeDefined();

      expect(systemPrompts.getChoiceInterpretationPrompt().length).toBeGreaterThan(300);
      expect(systemPrompts.getTaskEvaluationPrompt().length).toBeGreaterThan(300);
      expect(systemPrompts.getResultNarrationPrompt().length).toBeGreaterThan(300);
      expect(systemPrompts.getDifficultyCalculationPrompt().length).toBeGreaterThan(300);
    });

    test('should have proper JSON format specifications in interactive prompts', () => {
      // Act
      const interactivePrompts = [
        systemPrompts.getChoiceInterpretationPrompt(),
        systemPrompts.getTaskEvaluationPrompt(),
        systemPrompts.getDifficultyCalculationPrompt()
      ];

      // Assert
      interactivePrompts.forEach(prompt => {
        expect(prompt).toContain('RESPONSE FORMAT (JSON)');
        expect(prompt).toContain('{');
        expect(prompt).toContain('}');
      });
    });
  });
});