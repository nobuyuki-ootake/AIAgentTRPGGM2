/**
 * aiCharacterGenerationService Unit Tests
 * Tests for AI Character Generation Service - Character Creation and AI Integration
 * t-WADA naming convention: aiCharacterGenerationService.unit.test.ts
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import type { Database } from 'better-sqlite3';
import { aiCharacterGenerationService } from './aiCharacterGenerationService';
import type { GameTheme, CharacterType, Character, TRPGCharacter } from '@ai-agent-trpg/types';
import { TestDataFactory } from '../tests/setup';
import { aiOnlyMockSetup } from '../tests/mocks';

// Mock dependencies
jest.mock('./aiService', () => ({
  getAIService: jest.fn(() => ({
    generateCharacter: jest.fn()
  }))
}));
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-12345')
}));

import { getAIService } from './aiService';

describe('AICharacterGenerationService - AI Character Generation and Processing', () => {
  let testDb: Database;
  let mockAIService: jest.Mocked<ReturnType<typeof getAIService>>;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup AI-only mock environment
    await aiOnlyMockSetup();
    
    // Use global test database
    testDb = global.testDb;
    
    // Setup mock AI service
    mockAIService = {
      generateCharacter: jest.fn()
    } as any;
    (getAIService as jest.Mock).mockReturnValue(mockAIService);

    // Setup environment variables for API keys
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.GOOGLE_API_KEY = 'test-google-key';

    // Clear console logs to reduce test noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('Character Concept Generation', () => {
    test('should generate character concepts successfully', async () => {
      // Arrange
      const theme: GameTheme = {
        id: 'classic-fantasy',
        name: 'クラシックファンタジー',
        description: '剣と魔法の世界',
        genre: 'fantasy',
        setting: 'Medieval fantasy world',
        mood: 'heroic',
        difficulty: 'normal',
        style: 'balanced',
        keyElements: ['magic', 'dragons', 'kingdoms']
      };

      const mockAIResponse = {
        characterData: `
        \`\`\`json
        {
          "characters": [
            {
              "name": "アリック",
              "role": "勇敢な戦士タイプ。剣と盾で前線に立ち、仲間を守る",
              "characterClass": "戦士",
              "characterType": "PC",
              "brief": "勇敢で頼りになる前衛戦士"
            },
            {
              "name": "エルダ",
              "role": "知恵豊かな魔法使いタイプ。魔法と知識で冒険をサポート",
              "characterClass": "魔法使い",
              "characterType": "PC",
              "brief": "聡明で魔法に長けた後衛"
            },
            {
              "name": "シャドウ",
              "role": "身軽な盗賊タイプ。技と素早さで危険を回避し、宝を見つける",
              "characterClass": "盗賊",
              "characterType": "PC",
              "brief": "機敏で器用な技能特化型"
            }
          ]
        }
        \`\`\`
        `
      };

      mockAIService.generateCharacter.mockResolvedValue(mockAIResponse);

      // Act
      const result = await aiCharacterGenerationService.generateCharacterConcepts(theme, { provider: 'google' });

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        name: 'アリック',
        role: '勇敢な戦士タイプ。剣と盾で前線に立ち、仲間を守る',
        characterClass: '戦士',
        characterType: 'PC',
        brief: '勇敢で頼りになる前衛戦士'
      });
      expect(result[1].name).toBe('エルダ');
      expect(result[2].name).toBe('シャドウ');
      expect(mockAIService.generateCharacter).toHaveBeenCalledWith(expect.objectContaining({
        provider: 'google',
        apiKey: 'test-google-key',
        characterType: 'PC'
      }));
    });

    test('should handle malformed JSON in character concepts', async () => {
      // Arrange
      const theme: GameTheme = {
        id: 'test-theme',
        name: 'Test Theme',
        description: 'Test description',
        genre: 'fantasy',
        setting: 'Test setting',
        mood: 'balanced',
        difficulty: 'normal',
        style: 'balanced',
        keyElements: []
      };

      const mockAIResponse = {
        characterData: `
        \`\`\`json
        {
          "characters": [
            {
              "name": "Test Character",
              // Missing comma here
              "role": "Test role"
              "characterClass": "Fighter",
              "characterType": "PC",
              "brief": "Test brief"
            }
          ]
        }
        \`\`\`
        `
      };

      mockAIService.generateCharacter.mockResolvedValue(mockAIResponse);

      // Act & Assert
      await expect(
        aiCharacterGenerationService.generateCharacterConcepts(theme)
      ).rejects.toThrow('Failed to parse AI character concept response');
    });

    test('should throw error when API key is missing', async () => {
      // Arrange
      delete process.env.GOOGLE_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      const theme: GameTheme = {
        id: 'test-theme',
        name: 'Test Theme',
        description: 'Test description',
        genre: 'fantasy',
        setting: 'Test setting',
        mood: 'balanced',
        difficulty: 'normal',
        style: 'balanced',
        keyElements: []
      };

      // Act & Assert
      await expect(
        aiCharacterGenerationService.generateCharacterConcepts(theme, { provider: 'google' })
      ).rejects.toThrow('API key for provider google is not configured');
    });

    test('should handle alternative JSON extraction when JSON block is missing', async () => {
      // Arrange
      const theme: GameTheme = {
        id: 'test-theme',
        name: 'Test Theme',
        description: 'Test description',
        genre: 'fantasy',
        setting: 'Test setting',
        mood: 'balanced',
        difficulty: 'normal',
        style: 'balanced',
        keyElements: []
      };

      const mockAIResponse = {
        characterData: `
        Here's your character data:
        {
          "characters": [
            {
              "name": "テストキャラクター",
              "role": "テスト役割",
              "characterClass": "テスト職業",
              "characterType": "PC",
              "brief": "テスト概要"
            }
          ]
        }
        `
      };

      mockAIService.generateCharacter.mockResolvedValue(mockAIResponse);

      // Act
      const result = await aiCharacterGenerationService.generateCharacterConcepts(theme);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('テストキャラクター');
    });
  });

  describe('Character Generation for Theme', () => {
    test('should generate multiple characters for theme', async () => {
      // Arrange
      const campaignId = 'test-campaign-id';
      const theme: GameTheme = {
        id: 'sci-fi',
        name: 'SF宇宙冒険',
        description: '宇宙を舞台にした冒険',
        genre: 'sci-fi',
        setting: 'Space stations and alien worlds',
        mood: 'adventurous',
        difficulty: 'normal',
        style: 'balanced',
        keyElements: ['space travel', 'aliens', 'technology']
      };

      // Mock multiple AI responses for different character types
      const mockResponses = [
        {
          characterData: `
          \`\`\`json
          {
            "name": "コマンダー・スミス",
            "characterClass": "戦士",
            "description": "宇宙軍の元指揮官",
            "background": "銀河戦争の英雄",
            "personality": "責任感が強く勇敢",
            "alignment": "善",
            "baseStats": {
              "strength": 16,
              "dexterity": 12,
              "constitution": 14,
              "intelligence": 10,
              "wisdom": 11,
              "charisma": 13
            },
            "level": 1,
            "maxHitPoints": 40,
            "maxMagicPoints": 0
          }
          \`\`\`
          `
        },
        {
          characterData: `
          \`\`\`json
          {
            "name": "ドクター・ヤマダ",
            "characterClass": "科学者",
            "description": "天才的な宇宙科学者",
            "background": "研究所での長年の経験",
            "personality": "知的で好奇心旺盛",
            "alignment": "善",
            "baseStats": {
              "strength": 8,
              "dexterity": 10,
              "constitution": 12,
              "intelligence": 18,
              "wisdom": 14,
              "charisma": 11
            },
            "level": 1,
            "maxHitPoints": 25,
            "maxMagicPoints": 45
          }
          \`\`\`
          `
        },
        {
          characterData: `
          \`\`\`json
          {
            "name": "エージェント・サトウ",
            "characterClass": "スパイ",
            "description": "熟練のスパイエージェント",
            "background": "秘密組織での訓練",
            "personality": "慎重で機転が利く",
            "alignment": "中立",
            "baseStats": {
              "strength": 12,
              "dexterity": 16,
              "constitution": 13,
              "intelligence": 14,
              "wisdom": 15,
              "charisma": 12
            },
            "level": 1,
            "maxHitPoints": 30,
            "maxMagicPoints": 20
          }
          \`\`\`
          `
        }
      ];

      mockAIService.generateCharacter
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2]);

      // Act
      const result = await aiCharacterGenerationService.generateCharactersForTheme(
        campaignId,
        theme,
        { provider: 'openai' }
      );

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'mock-uuid-12345',
        campaignId,
        name: 'コマンダー・スミス',
        characterClass: '戦士',
        characterType: 'PC'
      }));
      expect(result[1].name).toBe('ドクター・ヤマダ');
      expect(result[2].name).toBe('エージェント・サトウ');
      expect(mockAIService.generateCharacter).toHaveBeenCalledTimes(3);
    });

    test('should handle partial failure during character generation', async () => {
      // Arrange
      const campaignId = 'test-campaign-id';
      const theme: GameTheme = {
        id: 'test-theme',
        name: 'Test Theme',
        description: 'Test description',
        genre: 'fantasy',
        setting: 'Test setting',
        mood: 'balanced',
        difficulty: 'normal',
        style: 'balanced',
        keyElements: []
      };

      mockAIService.generateCharacter
        .mockResolvedValueOnce({
          characterData: `{"name": "Valid Character", "characterClass": "Fighter", "description": "Valid", "baseStats": {"strength": 15, "dexterity": 12, "constitution": 14, "intelligence": 10, "wisdom": 11, "charisma": 13}, "level": 1, "maxHitPoints": 40, "maxMagicPoints": 0}`
        })
        .mockRejectedValueOnce(new Error('AI service failed'))
        .mockResolvedValueOnce({
          characterData: `{"name": "Another Valid", "characterClass": "Mage", "description": "Valid", "baseStats": {"strength": 10, "dexterity": 12, "constitution": 13, "intelligence": 16, "wisdom": 14, "charisma": 11}, "level": 1, "maxHitPoints": 25, "maxMagicPoints": 40}`
        });

      // Act & Assert
      await expect(
        aiCharacterGenerationService.generateCharactersForTheme(campaignId, theme)
      ).rejects.toThrow('AI character generation failed for PC character');
    });

    test('should throw error when all character generation fails', async () => {
      // Arrange
      const campaignId = 'test-campaign-id';
      const theme: GameTheme = {
        id: 'test-theme',
        name: 'Test Theme',
        description: 'Test description',
        genre: 'fantasy',
        setting: 'Test setting',
        mood: 'balanced',
        difficulty: 'normal',
        style: 'balanced',
        keyElements: []
      };

      mockAIService.generateCharacter.mockRejectedValue(new Error('Complete AI failure'));

      // Act & Assert
      await expect(
        aiCharacterGenerationService.generateCharactersForTheme(campaignId, theme)
      ).rejects.toThrow('AI character generation failed for PC character');
    });
  });

  describe('Single Character Generation', () => {
    test('should generate single character successfully', async () => {
      // Arrange
      const campaignId = 'test-campaign-id';
      const characterType: CharacterType = 'PC';
      const description = 'A brave knight seeking adventure';

      const mockAIResponse = {
        characterData: `
        \`\`\`json
        {
          "name": "サー・ガラハッド",
          "characterClass": "騎士",
          "description": "白銀の鎧を身に纏った高潔な騎士",
          "background": "王室直属の騎士団出身",
          "personality": "正義感が強く、弱者を守る",
          "alignment": "秩序にして善",
          "baseStats": {
            "strength": 16,
            "dexterity": 12,
            "constitution": 15,
            "intelligence": 11,
            "wisdom": 13,
            "charisma": 14
          },
          "level": 1,
          "maxHitPoints": 45,
          "maxMagicPoints": 10
        }
        \`\`\`
        `
      };

      mockAIService.generateCharacter.mockResolvedValue(mockAIResponse);

      // Act
      const result = await aiCharacterGenerationService.generateSingleCharacter(
        campaignId,
        characterType,
        description,
        { provider: 'anthropic' }
      );

      // Assert
      expect(result).toEqual(expect.objectContaining({
        id: 'mock-uuid-12345',
        campaignId,
        name: 'サー・ガラハッド',
        characterClass: '騎士',
        characterType: 'PC',
        description: '白銀の鎧を身に纏った高潔な騎士',
        level: 1
      }));
      expect((result as TRPGCharacter).characterType).toBe('PC');
      expect((result as TRPGCharacter).growth).toBeDefined();
      expect((result as TRPGCharacter).party).toBeDefined();
    });

    test('should generate NPC character with correct structure', async () => {
      // Arrange
      const campaignId = 'test-campaign-id';
      const characterType: CharacterType = 'NPC';
      const description = 'A wise old shopkeeper';

      const mockAIResponse = {
        characterData: `
        {
          "name": "おじいさん田中",
          "characterClass": "商人",
          "description": "親切な老齢の店主",
          "background": "長年この街で商売を営む",
          "personality": "親切で知恵がある",
          "alignment": "善",
          "baseStats": {
            "strength": 10,
            "dexterity": 8,
            "constitution": 12,
            "intelligence": 15,
            "wisdom": 16,
            "charisma": 14
          },
          "level": 2,
          "maxHitPoints": 25,
          "maxMagicPoints": 15
        }
        `
      };

      mockAIService.generateCharacter.mockResolvedValue(mockAIResponse);

      // Act
      const result = await aiCharacterGenerationService.generateSingleCharacter(
        campaignId,
        characterType,
        description
      );

      // Assert
      expect(result).toEqual(expect.objectContaining({
        name: 'おじいさん田中',
        characterClass: '商人',
        characterType: 'NPC'
      }));
      expect((result as any).npcData).toBeDefined();
      expect((result as any).npcData.aiPersonality).toBeDefined();
      expect((result as any).npcData.storyRole).toBeDefined();
    });

    test('should generate Enemy character with correct structure', async () => {
      // Arrange
      const campaignId = 'test-campaign-id';
      const characterType: CharacterType = 'Enemy';
      const description = 'A fierce goblin warrior';

      const mockAIResponse = {
        characterData: `
        {
          "name": "ゴブリン戦士",
          "characterClass": "戦士",
          "description": "緑色の肌を持つ凶暴な戦士",
          "background": "洞窟の奥深くで育った",
          "personality": "攻撃的で縄張り意識が強い",
          "alignment": "悪",
          "baseStats": {
            "strength": 14,
            "dexterity": 13,
            "constitution": 12,
            "intelligence": 8,
            "wisdom": 9,
            "charisma": 6
          },
          "level": 1,
          "maxHitPoints": 30,
          "maxMagicPoints": 0
        }
        `
      };

      mockAIService.generateCharacter.mockResolvedValue(mockAIResponse);

      // Act
      const result = await aiCharacterGenerationService.generateSingleCharacter(
        campaignId,
        characterType,
        description
      );

      // Assert
      expect(result).toEqual(expect.objectContaining({
        name: 'ゴブリン戦士',
        characterClass: '戦士',
        characterType: 'Enemy'
      }));
      expect((result as any).enemyData).toBeDefined();
      expect((result as any).enemyData.combat).toBeDefined();
      expect((result as any).enemyData.encounter).toBeDefined();
      expect((result as any).enemyData.loot).toBeDefined();
    });
  });

  describe('Character Concept to Detailed Character', () => {
    test('should generate detailed character from concept', async () => {
      // Arrange
      const campaignId = 'test-campaign-id';
      const concept = {
        name: 'ミスティック・セージ',
        role: '知恵豊かな魔法使いタイプ',
        characterClass: '魔法使い',
        characterType: 'PC' as CharacterType,
        brief: '聡明で魔法に長けた後衛'
      };
      const theme: GameTheme = {
        id: 'fantasy',
        name: 'Fantasy',
        description: 'Magical world',
        genre: 'fantasy',
        setting: 'Medieval fantasy',
        mood: 'mystical',
        difficulty: 'normal',
        style: 'balanced',
        keyElements: ['magic']
      };

      const mockAIResponse = {
        characterData: `
        {
          "name": "ミスティック・セージ",
          "characterClass": "魔法使い",
          "description": "星々の知識を持つ神秘的な魔法使い",
          "background": "古代図書館で研鑽を積んだ",
          "personality": "知的で落ち着いている",
          "alignment": "秩序にして善",
          "baseStats": {
            "strength": 8,
            "dexterity": 12,
            "constitution": 10,
            "intelligence": 18,
            "wisdom": 15,
            "charisma": 13
          },
          "level": 1,
          "maxHitPoints": 20,
          "maxMagicPoints": 50
        }
        `
      };

      mockAIService.generateCharacter.mockResolvedValue(mockAIResponse);

      // Act
      const result = await aiCharacterGenerationService.generateCharacterFromConcept(
        campaignId,
        concept,
        theme,
        { provider: 'google' }
      );

      // Assert
      expect(result).toEqual(expect.objectContaining({
        name: 'ミスティック・セージ',
        characterClass: '魔法使い',
        description: '星々の知識を持つ神秘的な魔法使い',
        background: '古代図書館で研鑽を積んだ'
      }));
      expect(result.baseStats.intelligence).toBe(18);
      expect(result.derivedStats.maxMagicPoints).toBe(50);
    });
  });

  describe('JSON Parsing and Validation', () => {
    test('should validate and fix stat values', async () => {
      // Arrange
      const campaignId = 'test-campaign-id';
      const characterType: CharacterType = 'PC';
      const description = 'Test character';

      const mockAIResponse = {
        characterData: `
        {
          "name": "テストキャラクター",
          "characterClass": "テスト職業",
          "description": "テスト説明",
          "background": "テスト背景",
          "personality": "テスト性格",
          "alignment": "善",
          "baseStats": {
            "strength": 25,
            "dexterity": -5,
            "constitution": "invalid",
            "intelligence": 15,
            "wisdom": 0,
            "charisma": 18
          },
          "level": 10,
          "maxHitPoints": 150,
          "maxMagicPoints": 200
        }
        `
      };

      mockAIService.generateCharacter.mockResolvedValue(mockAIResponse);

      // Act
      const result = await aiCharacterGenerationService.generateSingleCharacter(
        campaignId,
        characterType,
        description
      );

      // Assert
      // Invalid stats should be replaced with default values
      expect(result.baseStats.strength).toBe(12); // 25 > 18, so default
      expect(result.baseStats.dexterity).toBe(12); // -5 < 3, so default
      expect(result.baseStats.constitution).toBe(12); // "invalid" is NaN, so default
      expect(result.baseStats.intelligence).toBe(15); // Valid value
      expect(result.baseStats.wisdom).toBe(12); // 0 < 3, so default
      expect(result.baseStats.charisma).toBe(18); // Valid value
      
      // Level and HP should be clamped
      expect(result.level).toBe(5); // Max 5
      expect(result.derivedStats.maxHitPoints).toBe(100); // Max 100
      expect(result.derivedStats.maxMagicPoints).toBe(100); // Max 100
    });

    test('should handle missing required fields', async () => {
      // Arrange
      const campaignId = 'test-campaign-id';
      const characterType: CharacterType = 'PC';
      const description = 'Test character';

      const mockAIResponse = {
        characterData: `
        {
          "name": "テストキャラクター",
          "description": "テスト説明"
        }
        `
      };

      mockAIService.generateCharacter.mockResolvedValue(mockAIResponse);

      // Act & Assert
      await expect(
        aiCharacterGenerationService.generateSingleCharacter(campaignId, characterType, description)
      ).rejects.toThrow('Missing required field');
    });

    test('should handle JSON with comments and formatting issues', async () => {
      // Arrange
      const campaignId = 'test-campaign-id';
      const characterType: CharacterType = 'PC';
      const description = 'Test character';

      const mockAIResponse = {
        characterData: `
        \`\`\`json
        {
          // This is a comment that should be removed
          "name": "テストキャラクター",
          "characterClass": "テスト職業", // Another comment
          "description": "テスト説明",
          "background": "テスト背景",
          "personality": "テスト性格",
          "alignment": "善",
          "baseStats": {
            "strength": 15,
            "dexterity": 12,
            "constitution": 14,
            "intelligence": 10,
            "wisdom": 11,
            "charisma": 13
          },
          "level": 1,
          "maxHitPoints": 40,
          "maxMagicPoints": 20,
        }
        \`\`\`
        `
      };

      mockAIService.generateCharacter.mockResolvedValue(mockAIResponse);

      // Act
      const result = await aiCharacterGenerationService.generateSingleCharacter(
        campaignId,
        characterType,
        description
      );

      // Assert
      expect(result.name).toBe('テストキャラクター');
      expect(result.characterClass).toBe('テスト職業');
    });

    test('should clean JSON with quote formatting issues', async () => {
      // Arrange
      const campaignId = 'test-campaign-id';
      const characterType: CharacterType = 'PC';
      const description = 'Test character';

      const mockAIResponse = {
        characterData: `
        {
          "name : "テストキャラクター",
          "characterClass": "テスト職業",
          "description": "テスト説明",
          "background": "テスト背景",
          "personality": "テスト性格",
          "alignment": "善",
          "baseStats": {
            "strength": 15,
            "dexterity": 12,
            "constitution": 14,
            "intelligence": 10,
            "wisdom": 11,
            "charisma": 13
          },
          "level": 1,
          "maxHitPoints": 40,
          "maxMagicPoints": 20
        }
        `
      };

      mockAIService.generateCharacter.mockResolvedValue(mockAIResponse);

      // Act
      const result = await aiCharacterGenerationService.generateSingleCharacter(
        campaignId,
        characterType,
        description
      );

      // Assert
      expect(result.name).toBe('テストキャラクター');
    });
  });

  describe('Derived Stats Calculation', () => {
    test('should calculate derived stats correctly', async () => {
      // Arrange
      const campaignId = 'test-campaign-id';
      const characterType: CharacterType = 'PC';
      const description = 'High dexterity character';

      const mockAIResponse = {
        characterData: `
        {
          "name": "俊敏なローグ",
          "characterClass": "盗賊",
          "description": "非常に素早い盗賊",
          "background": "盗賊ギルド出身",
          "personality": "機敏で用心深い",
          "alignment": "中立",
          "baseStats": {
            "strength": 12,
            "dexterity": 18,
            "constitution": 14,
            "intelligence": 13,
            "wisdom": 15,
            "charisma": 11
          },
          "level": 1,
          "maxHitPoints": 30,
          "maxMagicPoints": 10
        }
        `
      };

      mockAIService.generateCharacter.mockResolvedValue(mockAIResponse);

      // Act
      const result = await aiCharacterGenerationService.generateSingleCharacter(
        campaignId,
        characterType,
        description
      );

      // Assert
      const dexMod = Math.floor((18 - 10) / 2); // Should be 4
      expect(result.derivedStats.armorClass).toBe(10 + dexMod); // 14
      expect(result.derivedStats.initiative).toBe(dexMod); // 4
      expect(result.derivedStats.speed).toBe(30); // Default speed
    });
  });

  describe('Error Handling', () => {
    test('should handle AI service failure', async () => {
      // Arrange
      const theme: GameTheme = {
        id: 'test-theme',
        name: 'Test Theme',
        description: 'Test description',
        genre: 'fantasy',
        setting: 'Test setting',
        mood: 'balanced',
        difficulty: 'normal',
        style: 'balanced',
        keyElements: []
      };

      mockAIService.generateCharacter.mockRejectedValue(new Error('AI service timeout'));

      // Act & Assert
      await expect(
        aiCharacterGenerationService.generateCharacterConcepts(theme)
      ).rejects.toThrow('AI character concept generation failed: AI service timeout');
    });

    test('should handle completely invalid JSON response', async () => {
      // Arrange
      const campaignId = 'test-campaign-id';
      const characterType: CharacterType = 'PC';
      const description = 'Test character';

      const mockAIResponse = {
        characterData: 'This is not JSON at all'
      };

      mockAIService.generateCharacter.mockResolvedValue(mockAIResponse);

      // Act & Assert
      await expect(
        aiCharacterGenerationService.generateSingleCharacter(campaignId, characterType, description)
      ).rejects.toThrow('Failed to parse AI character response');
    });

    test('should handle empty character concepts array', async () => {
      // Arrange
      const theme: GameTheme = {
        id: 'test-theme',
        name: 'Test Theme',
        description: 'Test description',
        genre: 'fantasy',
        setting: 'Test setting',
        mood: 'balanced',
        difficulty: 'normal',
        style: 'balanced',
        keyElements: []
      };

      const mockAIResponse = {
        characterData: `
        {
          "characters": []
        }
        `
      };

      mockAIService.generateCharacter.mockResolvedValue(mockAIResponse);

      // Act & Assert
      await expect(
        aiCharacterGenerationService.generateCharacterConcepts(theme)
      ).rejects.toThrow('No valid character concepts found in AI response');
    });

    test('should handle missing characters array in concept response', async () => {
      // Arrange
      const theme: GameTheme = {
        id: 'test-theme',
        name: 'Test Theme',
        description: 'Test description',
        genre: 'fantasy',
        setting: 'Test setting',
        mood: 'balanced',
        difficulty: 'normal',
        style: 'balanced',
        keyElements: []
      };

      const mockAIResponse = {
        characterData: `
        {
          "invalidKey": "value"
        }
        `
      };

      mockAIService.generateCharacter.mockResolvedValue(mockAIResponse);

      // Act & Assert
      await expect(
        aiCharacterGenerationService.generateCharacterConcepts(theme)
      ).rejects.toThrow('Invalid character concepts format: missing characters array');
    });
  });

  describe('Provider Support', () => {
    test('should support different AI providers', async () => {
      // Arrange
      const providers = ['google', 'openai', 'anthropic'];
      const theme: GameTheme = {
        id: 'test-theme',
        name: 'Test Theme',
        description: 'Test description',
        genre: 'fantasy',
        setting: 'Test setting',
        mood: 'balanced',
        difficulty: 'normal',
        style: 'balanced',
        keyElements: []
      };

      const mockResponse = {
        characterData: `
        {
          "characters": [
            {
              "name": "テストキャラクター",
              "role": "テスト役割",
              "characterClass": "テスト職業",
              "characterType": "PC",
              "brief": "テスト概要"
            }
          ]
        }
        `
      };

      for (const provider of providers) {
        mockAIService.generateCharacter.mockResolvedValue(mockResponse);

        // Act
        const result = await aiCharacterGenerationService.generateCharacterConcepts(
          theme,
          { provider }
        );

        // Assert
        expect(result).toHaveLength(1);
        expect(mockAIService.generateCharacter).toHaveBeenCalledWith(
          expect.objectContaining({
            provider,
            apiKey: `test-${provider}-key`
          })
        );
      }
    });

    test('should default to google provider when not specified', async () => {
      // Arrange
      const theme: GameTheme = {
        id: 'test-theme',
        name: 'Test Theme',
        description: 'Test description',
        genre: 'fantasy',
        setting: 'Test setting',
        mood: 'balanced',
        difficulty: 'normal',
        style: 'balanced',
        keyElements: []
      };

      const mockResponse = {
        characterData: `
        {
          "characters": [
            {
              "name": "デフォルトキャラクター",
              "role": "デフォルト役割",
              "characterClass": "戦士",
              "characterType": "PC",
              "brief": "デフォルト概要"
            }
          ]
        }
        `
      };

      mockAIService.generateCharacter.mockResolvedValue(mockResponse);

      // Act
      await aiCharacterGenerationService.generateCharacterConcepts(theme);

      // Assert
      expect(mockAIService.generateCharacter).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'google',
          apiKey: 'test-google-key'
        })
      );
    });
  });
});