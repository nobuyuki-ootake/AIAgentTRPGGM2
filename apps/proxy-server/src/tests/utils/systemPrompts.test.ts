import { describe, test, expect } from '@jest/globals';
import { systemPrompts } from '../../utils/systemPrompts';

// t-WADA naming conventions:
// - should[ExpectedBehavior]When[StateUnderTest]
// - can[DoSomething]Given[Condition]

describe('System Prompts Utility', () => {
  describe('Campaign Creation Prompts', () => {
    test('shouldReturnComprehensiveCampaignCreationPrompt', () => {
      // Given: キャンペーン作成プロンプトの要求
      
      // When: キャンペーン作成プロンプトを取得
      const prompt = systemPrompts.getCampaignCreationPrompt();
      
      // Then: 包括的なプロンプトが返される
      expect(prompt).toContain('TRPG Game Master');
      expect(prompt).toContain('campaign designer');
      expect(prompt).toContain('World Building');
      expect(prompt).toContain('Story Structure');
      expect(prompt).toContain('Character Integration');
      expect(prompt).toContain('Balance');
      expect(prompt).toContain('Creativity');
    });

    test('shouldIncludePracticalGuidelines', () => {
      // Given: キャンペーン作成プロンプト
      const prompt = systemPrompts.getCampaignCreationPrompt();
      
      // When: プロンプトの内容を確認
      
      // Then: 実践的なガイドラインが含まれている
      expect(prompt).toContain('game system\'s rules');
      expect(prompt).toContain('experience level');
      expect(prompt).toContain('actionable advice');
      expect(prompt).toContain('multiple options');
      expect(prompt).toContain('combat, exploration, social interaction');
    });

    test('shouldEmphasizeEngagementAndBalance', () => {
      // Given: キャンペーン作成プロンプト
      const prompt = systemPrompts.getCampaignCreationPrompt();
      
      // When: プロンプトの内容を確認
      
      // Then: エンゲージメントとバランスが強調されている
      expect(prompt).toContain('Engaging for all player types');
      expect(prompt).toContain('Scalable based on session length');
      expect(prompt).toContain('Rich in roleplay opportunities');
      expect(prompt).toContain('Balanced in challenge and reward');
      expect(prompt).toContain('Memorable and emotionally impactful');
    });
  });

  describe('Character Generation Prompts', () => {
    test('shouldReturnPCSpecificPromptWhenRequestingPC', () => {
      // Given: PC (Player Character) タイプ
      
      // When: PCキャラクター生成プロンプトを取得
      const prompt = systemPrompts.getCharacterGenerationPrompt('PC');
      
      // Then: PC専用のプロンプトが返される
      expect(prompt).toContain('Player Characters');
      expect(prompt).toContain('Mechanically viable');
      expect(prompt).toContain('roleplay opportunities');
      expect(prompt).toContain('party composition');
      expect(prompt).toContain('complete character sheets');
    });

    test('shouldReturnNPCSpecificPromptWhenRequestingNPC', () => {
      // Given: NPC (Non-Player Character) タイプ
      
      // When: NPCキャラクター生成プロンプトを取得
      const prompt = systemPrompts.getCharacterGenerationPrompt('NPC');
      
      // Then: NPC専用のプロンプトが返される
      expect(prompt).toContain('Non-Player Characters');
      expect(prompt).toContain('Memorable and distinct');
      expect(prompt).toContain('Well-motivated');
      expect(prompt).toContain('plot hooks');
      expect(prompt).toContain('story potential');
    });

    test('shouldReturnEnemySpecificPromptWhenRequestingEnemy', () => {
      // Given: Enemy キャラクタータイプ
      
      // When: Enemyキャラクター生成プロンプトを取得
      const prompt = systemPrompts.getCharacterGenerationPrompt('Enemy');
      
      // Then: Enemy専用のプロンプトが返される
      expect(prompt).toContain('Enemy Characters');
      expect(prompt).toContain('appropriately challenging');
      expect(prompt).toContain('tactically interesting');
      expect(prompt).toContain('challenge rating');
      expect(prompt).toContain('engaging, balanced combat');
    });

    test('shouldReturnBasePromptForUnknownCharacterType', () => {
      // Given: 未知のキャラクタータイプ
      
      // When: 未知のタイプでプロンプトを取得
      const prompt = systemPrompts.getCharacterGenerationPrompt('Unknown' as any);
      
      // Then: ベースプロンプトが返される
      expect(prompt).toContain('expert character creator');
      expect(prompt).not.toContain('Player Characters');
      expect(prompt).not.toContain('Non-Player Characters');
      expect(prompt).not.toContain('Enemy Characters');
    });

    test('shouldIncludeCharacterCreationStepsForPC', () => {
      // Given: PCキャラクター生成プロンプト
      const prompt = systemPrompts.getCharacterGenerationPrompt('PC');
      
      // When: プロンプトの内容を確認
      
      // Then: PC作成の具体的ステップが含まれている
      expect(prompt).toContain('mechanical competence');
      expect(prompt).toContain('personality traits and flaws');
      expect(prompt).toContain('connections to the world');
      expect(prompt).toContain('Balance power level');
      expect(prompt).toContain('character growth opportunities');
    });

    test('shouldIncludeNPCDesignPrinciplesForNPC', () => {
      // Given: NPCキャラクター生成プロンプト
      const prompt = systemPrompts.getCharacterGenerationPrompt('NPC');
      
      // When: プロンプトの内容を確認
      
      // Then: NPC設計原則が含まれている
      expect(prompt).toContain('distinct personalities');
      expect(prompt).toContain('clear motivations');
      expect(prompt).toContain('relationships with PCs');
      expect(prompt).toContain('appropriate power levels');
      expect(prompt).toContain('larger narrative');
    });

    test('shouldIncludeEnemyDesignPrinciplesForEnemy', () => {
      // Given: Enemyキャラクター生成プロンプト
      const prompt = systemPrompts.getCharacterGenerationPrompt('Enemy');
      
      // When: プロンプトの内容を確認
      
      // Then: Enemy設計原則が含まれている
      expect(prompt).toContain('challenge rating');
      expect(prompt).toContain('tactical options');
      expect(prompt).toContain('appropriate loot');
      expect(prompt).toContain('thematic consistency');
      expect(prompt).toContain('environmental factors');
    });
  });

  describe('Event Generation Prompts', () => {
    test('shouldReturnComprehensiveEventGenerationPrompt', () => {
      // Given: イベント生成プロンプトの要求
      
      // When: イベント生成プロンプトを取得
      const prompt = systemPrompts.getEventGenerationPrompt();
      
      // Then: 包括的なイベント生成プロンプトが返される
      expect(prompt).toContain('TRPG event designer');
      expect(prompt).toContain('engaging, balanced encounters');
      expect(prompt).toContain('Combat Events');
      expect(prompt).toContain('Social Events');
      expect(prompt).toContain('Exploration Events');
      expect(prompt).toContain('Story Events');
    });

    test('shouldIncludeCombatEventGuidelines', () => {
      // Given: イベント生成プロンプト
      const prompt = systemPrompts.getEventGenerationPrompt();
      
      // When: プロンプトの内容を確認
      
      // Then: 戦闘イベントのガイドラインが含まれている
      expect(prompt).toContain('tactically interesting encounters');
      expect(prompt).toContain('action economy');
      expect(prompt).toContain('creative solutions');
      expect(prompt).toContain('environmental factors');
    });

    test('shouldIncludeSocialEventGuidelines', () => {
      // Given: イベント生成プロンプト
      const prompt = systemPrompts.getEventGenerationPrompt();
      
      // When: プロンプトの内容を確認
      
      // Then: 社交イベントのガイドラインが含まれている
      expect(prompt).toContain('complex NPCs');
      expect(prompt).toContain('negotiation, deception, or persuasion');
      expect(prompt).toContain('multiple potential outcomes');
      expect(prompt).toContain('character backgrounds');
    });

    test('shouldIncludeExplorationEventGuidelines', () => {
      // Given: イベント生成プロンプト
      const prompt = systemPrompts.getEventGenerationPrompt();
      
      // When: プロンプトの内容を確認
      
      // Then: 探索イベントのガイドラインが含まれている
      expect(prompt).toContain('interesting locations');
      expect(prompt).toContain('environmental challenges');
      expect(prompt).toContain('different skills to shine');
      expect(prompt).toContain('risk and reward');
    });

    test('shouldIncludeConsiderationFactors', () => {
      // Given: イベント生成プロンプト
      const prompt = systemPrompts.getEventGenerationPrompt();
      
      // When: プロンプトの内容を確認
      
      // Then: 考慮すべき要因が含まれている
      expect(prompt).toContain('Party composition and level');
      expect(prompt).toContain('Campaign tone and themes');
      expect(prompt).toContain('Available session time');
      expect(prompt).toContain('Player preferences');
      expect(prompt).toContain('existing story elements');
    });
  });

  describe('GM Assistant Prompts', () => {
    test('shouldReturnComprehensiveGMAssistantPrompt', () => {
      // Given: GMアシスタントプロンプトの要求
      
      // When: GMアシスタントプロンプトを取得
      const prompt = systemPrompts.getGMAssistantPrompt();
      
      // Then: 包括的なGMアシスタントプロンプトが返される
      expect(prompt).toContain('Game Master\'s assistant');
      expect(prompt).toContain('real-time session management');
      expect(prompt).toContain('Rules Support');
      expect(prompt).toContain('Session Management');
      expect(prompt).toContain('Story Assistance');
      expect(prompt).toContain('Player Engagement');
    });

    test('shouldIncludeRulesSupportGuidelines', () => {
      // Given: GMアシスタントプロンプト
      const prompt = systemPrompts.getGMAssistantPrompt();
      
      // When: プロンプトの内容を確認
      
      // Then: ルールサポートのガイドラインが含まれている
      expect(prompt).toContain('accurate rule interpretations');
      expect(prompt).toContain('difficulty classes');
      expect(prompt).toContain('mechanical interactions');
      expect(prompt).toContain('balanced rulings');
    });

    test('shouldIncludeSessionManagementAdvice', () => {
      // Given: GMアシスタントプロンプト
      const prompt = systemPrompts.getGMAssistantPrompt();
      
      // When: プロンプトの内容を確認
      
      // Then: セッション管理のアドバイスが含まれている
      expect(prompt).toContain('maintain pacing');
      expect(prompt).toContain('spotlight different players');
      expect(prompt).toContain('improvised content');
      expect(prompt).toContain('time management');
    });

    test('shouldIncludePlayerEngagementStrategies', () => {
      // Given: GMアシスタントプロンプト
      const prompt = systemPrompts.getGMAssistantPrompt();
      
      // When: プロンプトの内容を確認
      
      // Then: プレイヤーエンゲージメント戦略が含まれている
      expect(prompt).toContain('players seem disengaged');
      expect(prompt).toContain('involve quiet players');
      expect(prompt).toContain('spotlight time fairly');
      expect(prompt).toContain('difficult situations');
    });

    test('shouldProvideActionableAdvice', () => {
      // Given: GMアシスタントプロンプト
      const prompt = systemPrompts.getGMAssistantPrompt();
      
      // When: プロンプトの内容を確認
      
      // Then: 実行可能なアドバイスの提供が明記されている
      expect(prompt).toContain('Quick, actionable advice');
      expect(prompt).toContain('Multiple alternative approaches');
      expect(prompt).toContain('player agency');
      expect(prompt).toContain('game flow and enjoyment');
    });
  });

  describe('NPC Behavior Prompts', () => {
    test('shouldReturnComprehensiveNPCBehaviorPrompt', () => {
      // Given: NPCビヘイビアプロンプトの要求
      
      // When: NPCビヘイビアプロンプトを取得
      const prompt = systemPrompts.getNPCBehaviorPrompt();
      
      // Then: 包括的なNPCビヘイビアプロンプトが返される
      expect(prompt).toContain('NPC portrayal');
      expect(prompt).toContain('character psychology');
      expect(prompt).toContain('believable, consistent');
      expect(prompt).toContain('Personality Consistency');
      expect(prompt).toContain('Realistic Reactions');
    });

    test('shouldIncludePersonalityConsistencyGuidelines', () => {
      // Given: NPCビヘイビアプロンプト
      const prompt = systemPrompts.getNPCBehaviorPrompt();
      
      // When: プロンプトの内容を確認
      
      // Then: 性格の一貫性ガイドラインが含まれている
      expect(prompt).toContain('established character traits');
      expect(prompt).toContain('past interactions');
      expect(prompt).toContain('emotional state');
      expect(prompt).toContain('speech patterns');
    });

    test('shouldIncludeDialogueQualityGuidelines', () => {
      // Given: NPCビヘイビアプロンプト
      const prompt = systemPrompts.getNPCBehaviorPrompt();
      
      // When: プロンプトの内容を確認
      
      // Then: 対話品質のガイドラインが含まれている
      expect(prompt).toContain('natural, character-appropriate');
      expect(prompt).toContain('subtext and personality');
      expect(prompt).toContain('education and background');
      expect(prompt).toContain('reveal character');
    });

    test('shouldIncludeRelationshipDynamics', () => {
      // Given: NPCビヘイビアプロンプト
      const prompt = systemPrompts.getNPCBehaviorPrompt();
      
      // When: プロンプトの内容を確認
      
      // Then: 関係性の動態が含まれている
      expect(prompt).toContain('power dynamics');
      expect(prompt).toContain('relationships over time');
      expect(prompt).toContain('intimacy levels');
      expect(prompt).toContain('conflict and cooperation');
    });

    test('shouldEmphasizePsychologicalRealism', () => {
      // Given: NPCビヘイビアプロンプト
      const prompt = systemPrompts.getNPCBehaviorPrompt();
      
      // When: プロンプトの内容を確認
      
      // Then: 心理的リアリズムが強調されている
      expect(prompt).toContain('Psychologically believable');
      expect(prompt).toContain('Consistent with established character');
      expect(prompt).toContain('Appropriate to the situation');
      expect(prompt).toContain('Engaging for players');
    });
  });

  describe('Rules Assistant Prompts', () => {
    test('shouldReturnGameSystemSpecificRulesPrompt', () => {
      // Given: 特定のゲームシステム
      const gameSystem = 'Dungeons & Dragons 5th Edition';
      
      // When: ルールアシスタントプロンプトを取得
      const prompt = systemPrompts.getRulesAssistantPrompt(gameSystem);
      
      // Then: ゲームシステム専用のプロンプトが返される
      expect(prompt).toContain(`rules expert for ${gameSystem}`);
      expect(prompt).toContain(`${gameSystem} core rules`);
      expect(prompt).toContain('Complete understanding');
      expect(prompt).toContain('supplements');
    });

    test('shouldIncludeAccuracyRequirements', () => {
      // Given: ルールアシスタントプロンプト
      const prompt = systemPrompts.getRulesAssistantPrompt('Pathfinder 2e');
      
      // When: プロンプトの内容を確認
      
      // Then: 正確性要件が含まれている
      expect(prompt).toContain('precise rule references');
      expect(prompt).toContain('official rules and common interpretations');
      expect(prompt).toContain('ambiguous or open to interpretation');
      expect(prompt).toContain('conditions, restrictions, or exceptions');
    });

    test('shouldIncludeClarityGuidelines', () => {
      // Given: ルールアシスタントプロンプト
      const prompt = systemPrompts.getRulesAssistantPrompt('Call of Cthulhu');
      
      // When: プロンプトの内容を確認
      
      // Then: 明確性ガイドラインが含まれている
      expect(prompt).toContain('simple, understandable terms');
      expect(prompt).toContain('examples to illustrate');
      expect(prompt).toContain('step by step');
      expect(prompt).toContain('appropriate for the group\'s experience');
    });

    test('shouldEmphasizeBalanceAndFairness', () => {
      // Given: ルールアシスタントプロンプト
      const prompt = systemPrompts.getRulesAssistantPrompt('GURPS');
      
      // When: プロンプトの内容を確認
      
      // Then: バランスと公平性が強調されている
      expect(prompt).toContain('impact of rulings on game balance');
      expect(prompt).toContain('equitable for all players');
      expect(prompt).toContain('immediate and long-term implications');
      expect(prompt).toContain('fun and fairness');
    });

    test('shouldProvideMultipleOptionsForAmbiguousRules', () => {
      // Given: ルールアシスタントプロンプト
      const prompt = systemPrompts.getRulesAssistantPrompt('Savage Worlds');
      
      // When: プロンプトの内容を確認
      
      // Then: 曖昧なルールに対する複数選択肢の提供が含まれている
      expect(prompt).toContain('definitive guidance when rules are explicit');
      expect(prompt).toContain('Multiple reasonable options when rules are ambiguous');
      expect(prompt).toContain('campaign context and player experience');
    });
  });

  describe('Persona System', () => {
    test('shouldReturnCorrectPersonaPromptForGMAssistant', () => {
      // Given: GMアシスタントペルソナ
      
      // When: ペルソナプロンプトを取得
      const prompt = systemPrompts.getPersonaPrompt('gm_assistant');
      
      // Then: GMアシスタントプロンプトが返される
      expect(prompt).toEqual(systemPrompts.getGMAssistantPrompt());
    });

    test('shouldReturnWorldBuilderPersonaPrompt', () => {
      // Given: ワールドビルダーペルソナ
      
      // When: ペルソナプロンプトを取得
      const prompt = systemPrompts.getPersonaPrompt('world_builder');
      
      // Then: ワールドビルダー専用のプロンプトが返される
      expect(prompt).toContain('master world-builder');
      expect(prompt).toContain('fantasy and sci-fi settings');
      expect(prompt).toContain('internal consistency');
      expect(prompt).toContain('cultural development');
    });

    test('shouldReturnCharacterCreatorPersonaPrompt', () => {
      // Given: キャラクタークリエイターペルソナ
      
      // When: ペルソナプロンプトを取得
      const prompt = systemPrompts.getPersonaPrompt('character_creator');
      
      // Then: キャラクタークリエイター専用のプロンプトが返される
      expect(prompt).toContain('expert character designer');
      expect(prompt).toContain('compelling, balanced characters');
      expect(prompt).toContain('rich backstories');
      expect(prompt).toContain('campaign settings');
    });

    test('shouldReturnStoryTellerPersonaPrompt', () => {
      // Given: ストーリーテラーペルソナ
      
      // When: ペルソナプロンプトを取得
      const prompt = systemPrompts.getPersonaPrompt('story_teller');
      
      // Then: ストーリーテラー専用のプロンプトが返される
      expect(prompt).toContain('master storyteller');
      expect(prompt).toContain('narrative structure');
      expect(prompt).toContain('emotional engagement');
      expect(prompt).toContain('character arcs');
    });

    test('shouldReturnGeneralAssistantPromptForUnknownPersona', () => {
      // Given: 未知のペルソナ
      
      // When: ペルソナプロンプトを取得
      const prompt = systemPrompts.getPersonaPrompt('unknown_persona');
      
      // Then: 一般的なアシスタントプロンプトが返される
      expect(prompt).toEqual(systemPrompts.getGeneralAssistantPrompt());
    });
  });

  describe('General Assistant Prompt', () => {
    test('shouldReturnComprehensiveGeneralAssistantPrompt', () => {
      // Given: 一般的なアシスタントプロンプトの要求
      
      // When: 一般的なアシスタントプロンプトを取得
      const prompt = systemPrompts.getGeneralAssistantPrompt();
      
      // Then: 包括的な一般アシスタントプロンプトが返される
      expect(prompt).toContain('helpful TRPG assistant');
      expect(prompt).toContain('tabletop gaming');
      expect(prompt).toContain('General TRPG advice');
      expect(prompt).toContain('Creative inspiration');
      expect(prompt).toContain('Rules clarification');
    });

    test('shouldIncludeInclusivityAndWelcomingGuidelines', () => {
      // Given: 一般的なアシスタントプロンプト
      const prompt = systemPrompts.getGeneralAssistantPrompt();
      
      // When: プロンプトの内容を確認
      
      // Then: 包摂性と歓迎的な環境のガイドラインが含まれている
      expect(prompt).toContain('inclusive and welcoming gaming environments');
      expect(prompt).toContain('different play styles and preferences');
      expect(prompt).toContain('collaborative nature');
      expect(prompt).toContain('fun and memorable experiences');
    });

    test('shouldEmphasizePlayerAgencyAndMeaningfulChoices', () => {
      // Given: 一般的なアシスタントプロンプト
      const prompt = systemPrompts.getGeneralAssistantPrompt();
      
      // When: プロンプトの内容を確認
      
      // Then: プレイヤーエージェンシーと意味のある選択が強調されている
      expect(prompt).toContain('player agency and meaningful choices');
      expect(prompt).toContain('multiple perspectives');
      expect(prompt).toContain('Encouraging of creativity');
    });
  });

  describe('Advanced Interactive System Prompts', () => {
    test('shouldReturnChoiceInterpretationPrompt', () => {
      // Given: 選択解釈プロンプトの要求
      
      // When: 選択解釈プロンプトを取得
      const prompt = systemPrompts.getChoiceInterpretationPrompt();
      
      // Then: 選択解釈専用のプロンプトが返される
      expect(prompt).toContain('interpreting player choices');
      expect(prompt).toContain('dynamic, engaging tasks');
      expect(prompt).toContain('Choice Analysis');
      expect(prompt).toContain('Task Generation');
      expect(prompt).toContain('JSON');
    });

    test('shouldReturnTaskEvaluationPrompt', () => {
      // Given: タスク評価プロンプトの要求
      
      // When: タスク評価プロンプトを取得
      const prompt = systemPrompts.getTaskEvaluationPrompt();
      
      // Then: タスク評価専用のプロンプトが返される
      expect(prompt).toContain('evaluating player solutions');
      expect(prompt).toContain('dynamic difficulty adjustments');
      expect(prompt).toContain('Feasibility (0-100)');
      expect(prompt).toContain('Creativity (0-100)');
      expect(prompt).toContain('DIFFICULTY MODIFIERS');
    });

    test('shouldReturnResultNarrationPrompt', () => {
      // Given: 結果ナレーションプロンプトの要求
      
      // When: 結果ナレーションプロンプトを取得
      const prompt = systemPrompts.getResultNarrationPrompt();
      
      // Then: 結果ナレーション専用のプロンプトが返される
      expect(prompt).toContain('compelling narratives for action resolution');
      expect(prompt).toContain('Success Narratives');
      expect(prompt).toContain('Failure Narratives');
      expect(prompt).toContain('Critical Results');
      expect(prompt).toContain('2-4 sentences');
    });

    test('shouldReturnDifficultyCalculationPrompt', () => {
      // Given: 難易度計算プロンプトの要求
      
      // When: 難易度計算プロンプトを取得
      const prompt = systemPrompts.getDifficultyCalculationPrompt();
      
      // Then: 難易度計算専用のプロンプトが返される
      expect(prompt).toContain('dynamic difficulty calculation');
      expect(prompt).toContain('BASE DIFFICULTY LEVELS');
      expect(prompt).toContain('Trivial (DC 5)');
      expect(prompt).toContain('Extreme (DC 25)');
      expect(prompt).toContain('MODIFIER CATEGORIES');
    });
  });

  describe('Phase 5 Advanced Generation Prompts', () => {
    test('shouldReturnMilestoneOutlinesPrompt', () => {
      // Given: マイルストーン概要プロンプトの要求
      
      // When: マイルストーン概要プロンプトを取得
      const prompt = systemPrompts.getMilestoneOutlinesPrompt();
      
      // Then: マイルストーン概要専用のプロンプトが返される（日本語）
      expect(prompt).toContain('マイルストーン概要を生成');
      expect(prompt).toContain('テーマに沿った一貫性');
      expect(prompt).toContain('プレイヤーの手探り体験');
      expect(prompt).toContain('AIゲームマスター専用');
      expect(prompt).toContain('JSON');
    });

    test('shouldReturnCoreEntitiesPrompt', () => {
      // Given: コアエンティティプロンプトの要求
      
      // When: コアエンティティプロンプトを取得
      const prompt = systemPrompts.getCoreEntitiesPrompt();
      
      // Then: コアエンティティ専用のプロンプトが返される（日本語）
      expect(prompt).toContain('コアエンティティを生成');
      expect(prompt).toContain('マイルストーン達成に直結');
      expect(prompt).toContain('3エンティティ構成');
      expect(prompt).toContain('進捗貢献度');
      expect(prompt).toContain('Events（イベント）');
    });

    test('shouldReturnBonusEntitiesPrompt', () => {
      // Given: ボーナスエンティティプロンプトの要求
      
      // When: ボーナスエンティティプロンプトを取得
      const prompt = systemPrompts.getBonusEntitiesPrompt();
      
      // Then: ボーナスエンティティ専用のプロンプトが返される（日本語）
      expect(prompt).toContain('ボーナスエンティティを生成');
      expect(prompt).toContain('マイルストーン達成には寄与しない');
      expect(prompt).toContain('実用的報酬エンティティ');
      expect(prompt).toContain('トロフィー・収集系');
      expect(prompt).toContain('ミステリー系');
    });

    test('shouldReturnSubtleHintsPrompt', () => {
      // Given: 暗示的ヒントプロンプトの要求
      
      // When: 暗示的ヒントプロンプトを取得
      const prompt = systemPrompts.getSubtleHintsPrompt();
      
      // Then: 暗示的ヒント専用のプロンプトが返される（日本語）
      expect(prompt).toContain('暗示的ヒント生成');
      expect(prompt).toContain('手探り体験を演出');
      expect(prompt).toContain('直接的でない');
      expect(prompt).toContain('環境的ヒント');
      expect(prompt).toContain('情報的ヒント');
    });

    test('shouldReturnNaturalGuidancePrompt', () => {
      // Given: 自然な誘導プロンプトの要求
      
      // When: 自然な誘導プロンプトを取得
      const prompt = systemPrompts.getNaturalGuidancePrompt();
      
      // Then: 自然な誘導専用のプロンプトが返される（日本語）
      expect(prompt).toContain('自然な誘導を提供');
      expect(prompt).toContain('強制感のない');
      expect(prompt).toContain('プレイヤーの自主性');
      expect(prompt).toContain('環境描写による誘導');
      expect(prompt).toContain('NPCの自然な発言');
    });

    test('shouldReturnLocationMappingPrompt', () => {
      // Given: 場所マッピングプロンプトの要求
      
      // When: 場所マッピングプロンプトを取得
      const prompt = systemPrompts.getLocationMappingPrompt();
      
      // Then: 場所マッピング専用のプロンプトが返される（日本語）
      expect(prompt).toContain('エンティティの場所配置');
      expect(prompt).toContain('論理的配置');
      expect(prompt).toContain('アクセシビリティ');
      expect(prompt).toContain('時間制約');
      expect(prompt).toContain('前提条件');
    });
  });

  describe('Specialized Prompts', () => {
    test('shouldReturnMilestoneGenerationPrompt', () => {
      // Given: マイルストーン生成プロンプトの要求
      
      // When: マイルストーン生成プロンプトを取得
      const prompt = systemPrompts.getMilestoneGenerationPrompt();
      
      // Then: マイルストーン生成専用のプロンプトが返される
      expect(prompt).toContain('milestone designer');
      expect(prompt).toContain('game progression');
      expect(prompt).toContain('Enemy Defeat');
      expect(prompt).toContain('Event Clear');
      expect(prompt).toContain('NPC Communication');
      expect(prompt).toContain('Item Acquisition');
      expect(prompt).toContain('Quest Completion');
    });

    test('shouldReturnEntityPoolGenerationPrompt', () => {
      // Given: エンティティプール生成プロンプトの要求
      
      // When: エンティティプール生成プロンプトを取得
      const prompt = systemPrompts.getEntityPoolGenerationPrompt();
      
      // Then: エンティティプール生成専用のプロンプトが返される
      expect(prompt).toContain('entity pools for dynamic gameplay');
      expect(prompt).toContain('thematic consistency');
      expect(prompt).toContain('Enemy Generation');
      expect(prompt).toContain('Event Generation');
      expect(prompt).toContain('NPC Generation');
      expect(prompt).toContain('Item Generation');
      expect(prompt).toContain('Quest Generation');
    });

    test('shouldReturnThemeAdaptationPrompt', () => {
      // Given: テーマ適応プロンプトの要求
      
      // When: テーマ適応プロンプトを取得
      const prompt = systemPrompts.getThemeAdaptationPrompt();
      
      // Then: テーマ適応専用のプロンプトが返される
      expect(prompt).toContain('theme adaptation');
      expect(prompt).toContain('campaign settings influence');
      expect(prompt).toContain('Peaceful/Daily Life Themes');
      expect(prompt).toContain('Horror Themes');
      expect(prompt).toContain('Political/Intrigue Themes');
      expect(prompt).toContain('Exploration/Discovery Themes');
    });
  });

  describe('Prompt Content Quality and Consistency', () => {
    test('shouldHaveConsistentFormattingAcrossAllPrompts', () => {
      // Given: 全てのプロンプトメソッド
      const promptMethods = [
        'getCampaignCreationPrompt',
        'getEventGenerationPrompt',
        'getGMAssistantPrompt',
        'getNPCBehaviorPrompt',
        'getGeneralAssistantPrompt'
      ];
      
      // When: 各プロンプトを取得
      const prompts = promptMethods.map(method => systemPrompts[method]());
      
      // Then: 全てのプロンプトが適切な長さを持つ
      prompts.forEach((prompt, index) => {
        expect(prompt.length).toBeGreaterThan(100);
        expect(prompt).not.toContain('undefined');
        expect(prompt).not.toContain('null');
      });
    });

    test('shouldIncludeKeyTermsInTRPGPrompts', () => {
      // Given: TRPG関連のプロンプト
      const trpgPrompts = [
        systemPrompts.getCampaignCreationPrompt(),
        systemPrompts.getEventGenerationPrompt(),
        systemPrompts.getGMAssistantPrompt()
      ];
      
      // When: プロンプトの内容を確認
      
      // Then: 全てのプロンプトにTRPG用語が含まれている
      trpgPrompts.forEach(prompt => {
        expect(prompt.toLowerCase()).toMatch(/trpg|tabletop|game master|gm|campaign|character|player/);
      });
    });

    test('shouldProvideActionableGuidanceInAllPrompts', () => {
      // Given: 主要なプロンプト
      const mainPrompts = [
        systemPrompts.getCampaignCreationPrompt(),
        systemPrompts.getCharacterGenerationPrompt('PC'),
        systemPrompts.getEventGenerationPrompt(),
        systemPrompts.getGMAssistantPrompt()
      ];
      
      // When: プロンプトの内容を確認
      
      // Then: 全てのプロンプトに実行可能なガイダンスが含まれている
      mainPrompts.forEach(prompt => {
        expect(prompt.toLowerCase()).toMatch(/when|how|should|provide|create|design|ensure|focus|consider/);
      });
    });

    test('shouldMaintainProfessionalToneAcrossAllPrompts', () => {
      // Given: 全ての主要プロンプト
      const allPrompts = [
        systemPrompts.getCampaignCreationPrompt(),
        systemPrompts.getCharacterGenerationPrompt('NPC'),
        systemPrompts.getEventGenerationPrompt(),
        systemPrompts.getGMAssistantPrompt(),
        systemPrompts.getNPCBehaviorPrompt(),
        systemPrompts.getRulesAssistantPrompt('D&D 5e')
      ];
      
      // When: プロンプトの内容を確認
      
      // Then: 全てのプロンプトがプロフェッショナルなトーンを維持している
      allPrompts.forEach(prompt => {
        expect(prompt).toContain('expert');
        expect(prompt).not.toContain('casual');
        expect(prompt).not.toContain('slang');
        expect(prompt.length).toBeGreaterThan(200); // 十分な詳細度
      });
    });
  });
});