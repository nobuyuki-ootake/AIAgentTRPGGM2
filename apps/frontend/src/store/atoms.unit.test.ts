import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RecoilRoot, useRecoilState, useRecoilValue } from 'recoil';
import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import {
  currentCampaignAtom,
  campaignListAtom,
  campaignLoadingAtom,
  charactersAtom,
  selectedCharacterAtom,
  characterLoadingAtom,
  currentSessionAtom,
  sessionListAtom,
  sessionLoadingAtom,
  aiProviderAtom,
  aiModelAtom,
  aiApiKeyAtom,
  aiLoadingAtom,
  aiErrorAtom,
  sidebarOpenAtom,
  themeAtom,
  developerModeAtom,
  appModeAtom,
  userModeAtom,
  playerCharacterAtom,
  notificationsAtom,
  loadingStateAtom,
  selectedElementsAtom,
  formDirtyAtom,
  unsavedChangesAtom,
  gmNotificationsAtom,
  gmNotificationUnreadCountAtom,
  gmNotificationSettingsAtom,
  gmNotificationLoadingAtom,
  gmNotificationErrorAtom,
  narrativeFeedbacksAtom,
  narrativeFeedbackUnreadCountAtom,
  narrativeFeedbackSettingsAtom,
  narrativeFeedbackLoadingAtom,
  narrativeFeedbackErrorAtom,
  sessionInitializationProgressAtom,
  AppMode,
} from './atoms';
import {
  TRPGCampaign,
  Character,
  SessionState,
  GMNotification,
} from '@ai-agent-trpg/types';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Test wrapper component
const wrapper = ({ children }: { children: ReactNode }) => (
  <RecoilRoot>{children}</RecoilRoot>
);

describe('Recoil Atoms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Campaign atoms', () => {
    it('currentCampaignAtom_defaultValue_shouldBeNull', () => {
      const { result } = renderHook(
        () => useRecoilValue(currentCampaignAtom),
        { wrapper }
      );

      expect(result.current).toBeNull();
    });

    it('currentCampaignAtom_setValue_shouldUpdateValue', () => {
      const testCampaign: TRPGCampaign = {
        id: 'campaign-1',
        name: 'Test Campaign',
        gameSystem: 'D&D 5e',
        theme: 'Fantasy',
        description: 'A test campaign',
        worldSettings: {
          technologyLevel: 'Medieval',
          magicLevel: 'High',
          scale: 'Regional',
          tone: 'Heroic',
        },
        playerInfo: {
          expectedCount: 4,
          experienceLevel: 'Beginner',
          playStyle: 'Balanced',
        },
        status: 'planning',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      const { result } = renderHook(
        () => useRecoilState(currentCampaignAtom),
        { wrapper }
      );

      act(() => {
        result.current[1](testCampaign);
      });

      expect(result.current[0]).toEqual(testCampaign);
    });

    it('campaignListAtom_defaultValue_shouldBeEmptyArray', () => {
      const { result } = renderHook(
        () => useRecoilValue(campaignListAtom),
        { wrapper }
      );

      expect(result.current).toEqual([]);
    });

    it('campaignLoadingAtom_defaultValue_shouldBeFalse', () => {
      const { result } = renderHook(
        () => useRecoilValue(campaignLoadingAtom),
        { wrapper }
      );

      expect(result.current).toBe(false);
    });
  });

  describe('Character atoms', () => {
    it('charactersAtom_defaultValue_shouldBeEmptyArray', () => {
      const { result } = renderHook(
        () => useRecoilValue(charactersAtom),
        { wrapper }
      );

      expect(result.current).toEqual([]);
    });

    it('selectedCharacterAtom_defaultValue_shouldBeNull', () => {
      const { result } = renderHook(
        () => useRecoilValue(selectedCharacterAtom),
        { wrapper }
      );

      expect(result.current).toBeNull();
    });

    it('charactersAtom_withMultipleCharacters_shouldMaintainOrder', () => {
      const characters: Character[] = [
        {
          id: 'char-1',
          name: 'Character 1',
          type: 'PC',
          campaignId: 'campaign-1',
          race: 'Human',
          characterClass: 'Fighter',
          level: 1,
          abilities: { strength: 16, dexterity: 14, constitution: 15, intelligence: 12, wisdom: 13, charisma: 10 },
          hitPoints: { current: 12, maximum: 12 },
          armorClass: 16,
          skills: [],
          equipment: [],
          spells: [],
          backstory: '',
          traits: [],
          ideals: [],
          bonds: [],
          flaws: [],
          notes: '',
          imageUrl: '',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        {
          id: 'char-2',
          name: 'Character 2',
          type: 'NPC',
          campaignId: 'campaign-1',
          race: 'Elf',
          characterClass: 'Wizard',
          level: 3,
          abilities: { strength: 8, dexterity: 14, constitution: 12, intelligence: 16, wisdom: 15, charisma: 13 },
          hitPoints: { current: 18, maximum: 18 },
          armorClass: 12,
          skills: [],
          equipment: [],
          spells: [],
          backstory: '',
          traits: [],
          ideals: [],
          bonds: [],
          flaws: [],
          notes: '',
          imageUrl: '',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
      ];

      const { result } = renderHook(
        () => useRecoilState(charactersAtom),
        { wrapper }
      );

      act(() => {
        result.current[1](characters);
      });

      expect(result.current[0]).toEqual(characters);
      expect(result.current[0]).toHaveLength(2);
    });

    it('characterLoadingAtom_setValue_shouldUpdateValue', () => {
      const { result } = renderHook(
        () => useRecoilState(characterLoadingAtom),
        { wrapper }
      );

      act(() => {
        result.current[1](true);
      });

      expect(result.current[0]).toBe(true);
    });
  });

  describe('Session atoms', () => {
    it('currentSessionAtom_defaultValue_shouldBeNull', () => {
      const { result } = renderHook(
        () => useRecoilValue(currentSessionAtom),
        { wrapper }
      );

      expect(result.current).toBeNull();
    });

    it('sessionListAtom_defaultValue_shouldBeEmptyArray', () => {
      const { result } = renderHook(
        () => useRecoilValue(sessionListAtom),
        { wrapper }
      );

      expect(result.current).toEqual([]);
    });

    it('sessionLoadingAtom_defaultValue_shouldBeFalse', () => {
      const { result } = renderHook(
        () => useRecoilValue(sessionLoadingAtom),
        { wrapper }
      );

      expect(result.current).toBe(false);
    });
  });

  describe('AI provider atoms with localStorage effects', () => {
    it('aiProviderAtom_withStoredValue_shouldUseStoredValue', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'aiProvider') return 'anthropic';
        return null;
      });

      const { result } = renderHook(
        () => useRecoilValue(aiProviderAtom),
        { wrapper }
      );

      expect(result.current).toBe('anthropic');
    });

    it('aiProviderAtom_withoutStoredValue_shouldUseDefaultValue', () => {
      const { result } = renderHook(
        () => useRecoilValue(aiProviderAtom),
        { wrapper }
      );

      expect(result.current).toBe('openai');
    });

    it('aiProviderAtom_setValue_shouldUpdateLocalStorage', () => {
      const { result } = renderHook(
        () => useRecoilState(aiProviderAtom),
        { wrapper }
      );

      act(() => {
        result.current[1]('anthropic');
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('aiProvider', 'anthropic');
      expect(result.current[0]).toBe('anthropic');
    });

    it('aiModelAtom_withStoredValue_shouldUseStoredValue', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'aiModel') return 'gpt-4';
        return null;
      });

      const { result } = renderHook(
        () => useRecoilValue(aiModelAtom),
        { wrapper }
      );

      expect(result.current).toBe('gpt-4');
    });

    it('aiModelAtom_setValue_shouldUpdateLocalStorage', () => {
      const { result } = renderHook(
        () => useRecoilState(aiModelAtom),
        { wrapper }
      );

      act(() => {
        result.current[1]('claude-3-opus');
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('aiModel', 'claude-3-opus');
    });

    it('aiApiKeyAtom_withStoredValue_shouldUseStoredValue', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'aiApiKey') return 'test-api-key';
        return null;
      });

      const { result } = renderHook(
        () => useRecoilValue(aiApiKeyAtom),
        { wrapper }
      );

      expect(result.current).toBe('test-api-key');
    });

    it('aiApiKeyAtom_setEmptyValue_shouldRemoveFromLocalStorage', () => {
      const { result } = renderHook(
        () => useRecoilState(aiApiKeyAtom),
        { wrapper }
      );

      act(() => {
        result.current[1]('');
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('aiApiKey');
    });

    it('aiApiKeyAtom_setNonEmptyValue_shouldUpdateLocalStorage', () => {
      const { result } = renderHook(
        () => useRecoilState(aiApiKeyAtom),
        { wrapper }
      );

      act(() => {
        result.current[1]('new-api-key');
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('aiApiKey', 'new-api-key');
    });
  });

  describe('AI state atoms', () => {
    it('aiLoadingAtom_defaultValue_shouldBeFalse', () => {
      const { result } = renderHook(
        () => useRecoilValue(aiLoadingAtom),
        { wrapper }
      );

      expect(result.current).toBe(false);
    });

    it('aiErrorAtom_defaultValue_shouldBeNull', () => {
      const { result } = renderHook(
        () => useRecoilValue(aiErrorAtom),
        { wrapper }
      );

      expect(result.current).toBeNull();
    });

    it('aiErrorAtom_setValue_shouldUpdateValue', () => {
      const { result } = renderHook(
        () => useRecoilState(aiErrorAtom),
        { wrapper }
      );

      act(() => {
        result.current[1]('API key is invalid');
      });

      expect(result.current[0]).toBe('API key is invalid');
    });
  });

  describe('UI state atoms with localStorage effects', () => {
    it('sidebarOpenAtom_defaultValue_shouldBeTrue', () => {
      const { result } = renderHook(
        () => useRecoilValue(sidebarOpenAtom),
        { wrapper }
      );

      expect(result.current).toBe(true);
    });

    it('themeAtom_withStoredValue_shouldUseStoredValue', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'theme') return 'dark';
        return null;
      });

      const { result } = renderHook(
        () => useRecoilValue(themeAtom),
        { wrapper }
      );

      expect(result.current).toBe('dark');
    });

    it('themeAtom_setValue_shouldUpdateLocalStorage', () => {
      const { result } = renderHook(
        () => useRecoilState(themeAtom),
        { wrapper }
      );

      act(() => {
        result.current[1]('dark');
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
    });

    it('developerModeAtom_withStoredTrueValue_shouldBeTrue', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'developerMode') return 'true';
        return null;
      });

      const { result } = renderHook(
        () => useRecoilValue(developerModeAtom),
        { wrapper }
      );

      expect(result.current).toBe(true);
    });

    it('developerModeAtom_setValue_shouldUpdateLocalStorage', () => {
      const { result } = renderHook(
        () => useRecoilState(developerModeAtom),
        { wrapper }
      );

      act(() => {
        result.current[1](true);
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('developerMode', 'true');
    });

    it('userModeAtom_withStoredTrueValue_shouldBeTrue', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'userMode') return 'true';
        return null;
      });

      const { result } = renderHook(
        () => useRecoilValue(userModeAtom),
        { wrapper }
      );

      expect(result.current).toBe(true);
    });

    it('appModeAtom_withStoredValue_shouldUseStoredValue', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'appMode') return 'developer';
        return null;
      });

      const { result } = renderHook(
        () => useRecoilValue(appModeAtom),
        { wrapper }
      );

      expect(result.current).toBe('developer');
    });

    it('appModeAtom_setValue_shouldUpdateLocalStorage', () => {
      const { result } = renderHook(
        () => useRecoilState(appModeAtom),
        { wrapper }
      );

      act(() => {
        result.current[1]('user' as AppMode);
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('appMode', 'user');
    });

    it('playerCharacterAtom_defaultValue_shouldBeNull', () => {
      const { result } = renderHook(
        () => useRecoilValue(playerCharacterAtom),
        { wrapper }
      );

      expect(result.current).toBeNull();
    });
  });

  describe('Notification atoms', () => {
    it('notificationsAtom_defaultValue_shouldBeEmptyArray', () => {
      const { result } = renderHook(
        () => useRecoilValue(notificationsAtom),
        { wrapper }
      );

      expect(result.current).toEqual([]);
    });

    it('notificationsAtom_addNotification_shouldUpdateArray', () => {
      const { result } = renderHook(
        () => useRecoilState(notificationsAtom),
        { wrapper }
      );

      const notification = {
        id: 'notif-1',
        type: 'success' as const,
        message: 'Operation successful',
        timestamp: '2023-01-01T00:00:00Z',
      };

      act(() => {
        result.current[1]([notification]);
      });

      expect(result.current[0]).toEqual([notification]);
    });

    it('notificationsAtom_addPersistentNotification_shouldIncludePersistentFlag', () => {
      const { result } = renderHook(
        () => useRecoilState(notificationsAtom),
        { wrapper }
      );

      const notification = {
        id: 'notif-1',
        type: '404-error' as const,
        message: 'API endpoint not found',
        timestamp: '2023-01-01T00:00:00Z',
        persistent: true,
        details: 'Detailed error information',
      };

      act(() => {
        result.current[1]([notification]);
      });

      expect(result.current[0][0]).toMatchObject({
        ...notification,
        persistent: true,
        details: 'Detailed error information',
      });
    });
  });

  describe('Loading state atom', () => {
    it('loadingStateAtom_defaultValue_shouldHaveAllFalseStates', () => {
      const { result } = renderHook(
        () => useRecoilValue(loadingStateAtom),
        { wrapper }
      );

      expect(result.current).toEqual({
        campaigns: false,
        characters: false,
        sessions: false,
        ai: false,
        general: false,
      });
    });

    it('loadingStateAtom_updateSpecificState_shouldOnlyUpdateThatState', () => {
      const { result } = renderHook(
        () => useRecoilState(loadingStateAtom),
        { wrapper }
      );

      act(() => {
        result.current[1]({
          ...result.current[0],
          campaigns: true,
        });
      });

      expect(result.current[0]).toEqual({
        campaigns: true,
        characters: false,
        sessions: false,
        ai: false,
        general: false,
      });
    });
  });

  describe('Selected elements atom', () => {
    it('selectedElementsAtom_defaultValue_shouldBeEmptyObject', () => {
      const { result } = renderHook(
        () => useRecoilValue(selectedElementsAtom),
        { wrapper }
      );

      expect(result.current).toEqual({});
    });

    it('selectedElementsAtom_setComplexSelection_shouldStoreAllElements', () => {
      const { result } = renderHook(
        () => useRecoilState(selectedElementsAtom),
        { wrapper }
      );

      const testCampaign: TRPGCampaign = {
        id: 'campaign-1',
        name: 'Test Campaign',
        gameSystem: 'D&D 5e',
        theme: 'Fantasy',
        description: 'A test campaign',
        worldSettings: {
          technologyLevel: 'Medieval',
          magicLevel: 'High',
          scale: 'Regional',
          tone: 'Heroic',
        },
        playerInfo: {
          expectedCount: 4,
          experienceLevel: 'Beginner',
          playStyle: 'Balanced',
        },
        status: 'planning',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      const testCharacters: Character[] = [
        {
          id: 'char-1',
          name: 'Test Character',
          type: 'PC',
          campaignId: 'campaign-1',
          race: 'Human',
          characterClass: 'Fighter',
          level: 1,
          abilities: { strength: 16, dexterity: 14, constitution: 15, intelligence: 12, wisdom: 13, charisma: 10 },
          hitPoints: { current: 12, maximum: 12 },
          armorClass: 16,
          skills: [],
          equipment: [],
          spells: [],
          backstory: '',
          traits: [],
          ideals: [],
          bonds: [],
          flaws: [],
          notes: '',
          imageUrl: '',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
      ];

      act(() => {
        result.current[1]({
          campaign: testCampaign,
          characters: testCharacters,
          notes: 'Selected for AI context',
        });
      });

      expect(result.current[0]).toEqual({
        campaign: testCampaign,
        characters: testCharacters,
        notes: 'Selected for AI context',
      });
    });
  });

  describe('Form state atoms', () => {
    it('formDirtyAtom_defaultValue_shouldBeFalse', () => {
      const { result } = renderHook(
        () => useRecoilValue(formDirtyAtom),
        { wrapper }
      );

      expect(result.current).toBe(false);
    });

    it('unsavedChangesAtom_defaultValue_shouldBeFalse', () => {
      const { result } = renderHook(
        () => useRecoilValue(unsavedChangesAtom),
        { wrapper }
      );

      expect(result.current).toBe(false);
    });

    it('formDirtyAtom_setValue_shouldUpdateValue', () => {
      const { result } = renderHook(
        () => useRecoilState(formDirtyAtom),
        { wrapper }
      );

      act(() => {
        result.current[1](true);
      });

      expect(result.current[0]).toBe(true);
    });

    it('unsavedChangesAtom_setValue_shouldUpdateValue', () => {
      const { result } = renderHook(
        () => useRecoilState(unsavedChangesAtom),
        { wrapper }
      );

      act(() => {
        result.current[1](true);
      });

      expect(result.current[0]).toBe(true);
    });
  });

  describe('GM notification atoms', () => {
    it('gmNotificationsAtom_defaultValue_shouldBeEmptyArray', () => {
      const { result } = renderHook(
        () => useRecoilValue(gmNotificationsAtom),
        { wrapper }
      );

      expect(result.current).toEqual([]);
    });

    it('gmNotificationUnreadCountAtom_defaultValue_shouldBeZero', () => {
      const { result } = renderHook(
        () => useRecoilValue(gmNotificationUnreadCountAtom),
        { wrapper }
      );

      expect(result.current).toBe(0);
    });

    it('gmNotificationSettingsAtom_defaultValue_shouldHaveCorrectDefaults', () => {
      const { result } = renderHook(
        () => useRecoilValue(gmNotificationSettingsAtom),
        { wrapper }
      );

      expect(result.current).toEqual({
        enableSound: true,
        enableDesktop: true,
        autoMarkAsRead: false,
        priorityFilter: ['high', 'medium', 'low'],
      });
    });

    it('gmNotificationLoadingAtom_defaultValue_shouldBeFalse', () => {
      const { result } = renderHook(
        () => useRecoilValue(gmNotificationLoadingAtom),
        { wrapper }
      );

      expect(result.current).toBe(false);
    });

    it('gmNotificationErrorAtom_defaultValue_shouldBeNull', () => {
      const { result } = renderHook(
        () => useRecoilValue(gmNotificationErrorAtom),
        { wrapper }
      );

      expect(result.current).toBeNull();
    });
  });

  describe('Narrative feedback atoms', () => {
    it('narrativeFeedbacksAtom_defaultValue_shouldBeEmptyArray', () => {
      const { result } = renderHook(
        () => useRecoilValue(narrativeFeedbacksAtom),
        { wrapper }
      );

      expect(result.current).toEqual([]);
    });

    it('narrativeFeedbackUnreadCountAtom_defaultValue_shouldBeZero', () => {
      const { result } = renderHook(
        () => useRecoilValue(narrativeFeedbackUnreadCountAtom),
        { wrapper }
      );

      expect(result.current).toBe(0);
    });

    it('narrativeFeedbackSettingsAtom_defaultValue_shouldHaveCorrectDefaults', () => {
      const { result } = renderHook(
        () => useRecoilValue(narrativeFeedbackSettingsAtom),
        { wrapper }
      );

      expect(result.current).toEqual({
        enableDetailedDisplay: true,
        enableChatIntegration: true,
        enableSoundForMajor: true,
        weightFilter: ['minor', 'significant', 'major', 'pivotal'],
        tonePreference: ['dramatic', 'triumphant', 'mysterious', 'contemplative', 'tense'],
      });
    });

    it('narrativeFeedbackLoadingAtom_defaultValue_shouldBeFalse', () => {
      const { result } = renderHook(
        () => useRecoilValue(narrativeFeedbackLoadingAtom),
        { wrapper }
      );

      expect(result.current).toBe(false);
    });

    it('narrativeFeedbackErrorAtom_defaultValue_shouldBeNull', () => {
      const { result } = renderHook(
        () => useRecoilValue(narrativeFeedbackErrorAtom),
        { wrapper }
      );

      expect(result.current).toBeNull();
    });

    it('narrativeFeedbacksAtom_addFeedback_shouldUpdateArray', () => {
      const { result } = renderHook(
        () => useRecoilState(narrativeFeedbacksAtom),
        { wrapper }
      );

      const feedback = {
        id: 'feedback-1',
        sessionId: 'session-1',
        milestoneName: 'First Encounter',
        mainNarrative: {
          title: 'The Adventure Begins',
          content: 'Your party encounters their first challenge...',
          tone: 'dramatic' as const,
          length: 'standard' as const,
        },
        narrativeWeight: 'significant' as const,
        timestamp: '2023-01-01T00:00:00Z',
        isDetailedFeedback: true,
        isRead: false,
      };

      act(() => {
        result.current[1]([feedback]);
      });

      expect(result.current[0]).toEqual([feedback]);
    });
  });

  describe('Session initialization progress atom', () => {
    it('sessionInitializationProgressAtom_defaultValue_shouldHaveCorrectStructure', () => {
      const { result } = renderHook(
        () => useRecoilValue(sessionInitializationProgressAtom),
        { wrapper }
      );

      expect(result.current).toEqual({
        isInitializing: false,
        currentPhase: null,
        overallProgress: 0,
        phases: {
          scenario: {
            phase: 'scenario',
            phaseName: 'シナリオ生成',
            progress: 0,
            status: 'pending',
            currentTask: '',
            completedTasks: [],
            totalTasks: 0,
            estimatedTimeRemaining: 0,
          },
          milestone: {
            phase: 'milestone',
            phaseName: 'マイルストーン生成',
            progress: 0,
            status: 'pending',
            currentTask: '',
            completedTasks: [],
            totalTasks: 0,
            estimatedTimeRemaining: 0,
          },
          entity: {
            phase: 'entity',
            phaseName: 'エンティティ生成',
            progress: 0,
            status: 'pending',
            currentTask: '',
            completedTasks: [],
            totalTasks: 0,
            estimatedTimeRemaining: 0,
          },
        },
        sessionId: null,
        campaignId: null,
      });
    });

    it('sessionInitializationProgressAtom_updateProgress_shouldUpdateCorrectly', () => {
      const { result } = renderHook(
        () => useRecoilState(sessionInitializationProgressAtom),
        { wrapper }
      );

      act(() => {
        result.current[1]({
          ...result.current[0],
          isInitializing: true,
          currentPhase: 'scenario',
          overallProgress: 33,
          phases: {
            ...result.current[0].phases,
            scenario: {
              ...result.current[0].phases.scenario,
              progress: 100,
              status: 'completed',
              currentTask: 'Scenario generation complete',
              completedTasks: ['Generate basic scenario', 'Add details', 'Validate scenario'],
              totalTasks: 3,
              estimatedTimeRemaining: 0,
              startTime: '2023-01-01T00:00:00Z',
              endTime: '2023-01-01T00:05:00Z',
            },
          },
          sessionId: 'session-1',
          campaignId: 'campaign-1',
          startTime: '2023-01-01T00:00:00Z',
        });
      });

      expect(result.current[0].isInitializing).toBe(true);
      expect(result.current[0].currentPhase).toBe('scenario');
      expect(result.current[0].overallProgress).toBe(33);
      expect(result.current[0].phases.scenario.status).toBe('completed');
      expect(result.current[0].phases.scenario.progress).toBe(100);
    });

    it('sessionInitializationProgressAtom_updateWithError_shouldStoreErrorState', () => {
      const { result } = renderHook(
        () => useRecoilState(sessionInitializationProgressAtom),
        { wrapper }
      );

      act(() => {
        result.current[1]({
          ...result.current[0],
          isInitializing: false,
          currentPhase: 'milestone',
          phases: {
            ...result.current[0].phases,
            milestone: {
              ...result.current[0].phases.milestone,
              status: 'error',
              error: 'Failed to generate milestones: API timeout',
            },
          },
          error: 'Session initialization failed',
        });
      });

      expect(result.current[0].phases.milestone.status).toBe('error');
      expect(result.current[0].phases.milestone.error).toBe('Failed to generate milestones: API timeout');
      expect(result.current[0].error).toBe('Session initialization failed');
    });
  });

  describe('Complex atom interactions', () => {
    it('multipleAtoms_simultaneousUpdates_shouldMaintainConsistency', () => {
      const { result: campaignResult } = renderHook(
        () => useRecoilState(currentCampaignAtom),
        { wrapper }
      );
      const { result: loadingResult } = renderHook(
        () => useRecoilState(campaignLoadingAtom),
        { wrapper }
      );

      const testCampaign: TRPGCampaign = {
        id: 'campaign-1',
        name: 'Multi-Update Test',
        gameSystem: 'D&D 5e',
        theme: 'Fantasy',
        description: 'Testing simultaneous updates',
        worldSettings: {
          technologyLevel: 'Medieval',
          magicLevel: 'High',
          scale: 'Regional',
          tone: 'Heroic',
        },
        playerInfo: {
          expectedCount: 4,
          experienceLevel: 'Beginner',
          playStyle: 'Balanced',
        },
        status: 'planning',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      act(() => {
        loadingResult.current[1](true);
        campaignResult.current[1](testCampaign);
        loadingResult.current[1](false);
      });

      expect(campaignResult.current[0]).toEqual(testCampaign);
      expect(loadingResult.current[0]).toBe(false);
    });

    it('localStorage_multipleAtomsWithEffects_shouldUpdateStorageCorrectly', () => {
      const { result: themeResult } = renderHook(
        () => useRecoilState(themeAtom),
        { wrapper }
      );
      const { result: providerResult } = renderHook(
        () => useRecoilState(aiProviderAtom),
        { wrapper }
      );
      const { result: modeResult } = renderHook(
        () => useRecoilState(appModeAtom),
        { wrapper }
      );

      act(() => {
        themeResult.current[1]('dark');
        providerResult.current[1]('anthropic');
        modeResult.current[1]('developer');
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('aiProvider', 'anthropic');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('appMode', 'developer');
    });
  });

  describe('Edge cases and error handling', () => {
    it('atomWithLocalStorageEffect_whenLocalStorageThrows_shouldUseDefaultValue', () => {
      // Mock console.error to suppress expected error logs
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('LocalStorage access denied');
      });

      const { result } = renderHook(
        () => useRecoilValue(themeAtom),
        { wrapper }
      );

      expect(result.current).toBe('light'); // Should fall back to default
      
      consoleSpy.mockRestore();
    });

    it('atomWithLocalStorageEffect_whenSetItemThrows_shouldNotBreakApp', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const { result } = renderHook(
        () => useRecoilState(themeAtom),
        { wrapper }
      );

      expect(() => {
        act(() => {
          result.current[1]('dark');
        });
      }).not.toThrow();
    });

    it('complexAtom_withInvalidDataStructure_shouldHandleGracefully', () => {
      const { result } = renderHook(
        () => useRecoilState(sessionInitializationProgressAtom),
        { wrapper }
      );

      // Try to set invalid data structure
      expect(() => {
        act(() => {
          // @ts-ignore: Testing runtime validation
          result.current[1]({ invalidStructure: true });
        });
      }).not.toThrow();
    });
  });
});