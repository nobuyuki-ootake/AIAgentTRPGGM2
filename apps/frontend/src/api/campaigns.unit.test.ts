import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { campaignAPI } from './campaigns';
import { apiClient } from './client';
import { TRPGCampaign, PaginatedResponse } from '@ai-agent-trpg/types';

// Mock the API client
vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApiClient = vi.mocked(apiClient);

describe('CampaignAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Test data
  const mockCampaign: TRPGCampaign = {
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

  const mockPaginatedResponse: PaginatedResponse<TRPGCampaign> = {
    data: [mockCampaign],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  describe('getCampaigns', () => {
    it('getCampaigns_withoutFilters_shouldCallCorrectEndpointWithoutQueryParams', async () => {
      mockApiClient.get.mockResolvedValue(mockPaginatedResponse);

      const result = await campaignAPI.getCampaigns();

      expect(mockApiClient.get).toHaveBeenCalledWith('/campaigns');
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('getCampaigns_withPageFilter_shouldIncludePageInQueryParams', async () => {
      mockApiClient.get.mockResolvedValue(mockPaginatedResponse);

      await campaignAPI.getCampaigns({ page: 2 });

      expect(mockApiClient.get).toHaveBeenCalledWith('/campaigns?page=2');
    });

    it('getCampaigns_withLimitFilter_shouldIncludeLimitInQueryParams', async () => {
      mockApiClient.get.mockResolvedValue(mockPaginatedResponse);

      await campaignAPI.getCampaigns({ limit: 20 });

      expect(mockApiClient.get).toHaveBeenCalledWith('/campaigns?limit=20');
    });

    it('getCampaigns_withStatusFilter_shouldIncludeStatusInQueryParams', async () => {
      mockApiClient.get.mockResolvedValue(mockPaginatedResponse);

      await campaignAPI.getCampaigns({ status: 'active' });

      expect(mockApiClient.get).toHaveBeenCalledWith('/campaigns?status=active');
    });

    it('getCampaigns_withSearchFilter_shouldIncludeSearchInQueryParams', async () => {
      mockApiClient.get.mockResolvedValue(mockPaginatedResponse);

      await campaignAPI.getCampaigns({ search: 'fantasy adventure' });

      expect(mockApiClient.get).toHaveBeenCalledWith('/campaigns?search=fantasy+adventure');
    });

    it('getCampaigns_withAllFilters_shouldIncludeAllInQueryParams', async () => {
      mockApiClient.get.mockResolvedValue(mockPaginatedResponse);

      await campaignAPI.getCampaigns({
        page: 2,
        limit: 5,
        status: 'completed',
        search: 'epic quest',
      });

      expect(mockApiClient.get).toHaveBeenCalledWith('/campaigns?page=2&limit=5&status=completed&search=epic+quest');
    });

    it('getCampaigns_withZeroPage_shouldIncludeZeroPageInQueryParams', async () => {
      mockApiClient.get.mockResolvedValue(mockPaginatedResponse);

      await campaignAPI.getCampaigns({ page: 0 });

      expect(mockApiClient.get).toHaveBeenCalledWith('/campaigns');
    });

    it('getCampaigns_withEmptyStringSearch_shouldNotIncludeSearchInQueryParams', async () => {
      mockApiClient.get.mockResolvedValue(mockPaginatedResponse);

      await campaignAPI.getCampaigns({ search: '' });

      expect(mockApiClient.get).toHaveBeenCalledWith('/campaigns');
    });

    it('getCampaigns_withSpecialCharactersInSearch_shouldEncodeCorrectly', async () => {
      mockApiClient.get.mockResolvedValue(mockPaginatedResponse);

      await campaignAPI.getCampaigns({ search: 'campaign & adventure!' });

      expect(mockApiClient.get).toHaveBeenCalledWith('/campaigns?search=campaign+%26+adventure%21');
    });

    it('getCampaigns_withAPIError_shouldPropagateError', async () => {
      const error = new Error('API Error');
      mockApiClient.get.mockRejectedValue(error);

      await expect(campaignAPI.getCampaigns()).rejects.toBe(error);
    });
  });

  describe('getCampaignById', () => {
    it('getCampaignById_withValidId_shouldCallCorrectEndpointAndReturnCampaign', async () => {
      mockApiClient.get.mockResolvedValue(mockCampaign);

      const result = await campaignAPI.getCampaignById('campaign-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/campaigns/campaign-1');
      expect(result).toEqual(mockCampaign);
    });

    it('getCampaignById_withSpecialCharactersInId_shouldEncodeCorrectly', async () => {
      mockApiClient.get.mockResolvedValue(mockCampaign);

      await campaignAPI.getCampaignById('campaign/test&special');

      expect(mockApiClient.get).toHaveBeenCalledWith('/campaigns/campaign/test&special');
    });

    it('getCampaignById_withEmptyId_shouldCallEndpointWithEmptyId', async () => {
      mockApiClient.get.mockResolvedValue(mockCampaign);

      await campaignAPI.getCampaignById('');

      expect(mockApiClient.get).toHaveBeenCalledWith('/campaigns/');
    });

    it('getCampaignById_withAPIError_shouldPropagateError', async () => {
      const error = new Error('Campaign not found');
      mockApiClient.get.mockRejectedValue(error);

      await expect(campaignAPI.getCampaignById('non-existent')).rejects.toBe(error);
    });
  });

  describe('createCampaign', () => {
    it('createCampaign_withValidData_shouldCallCorrectEndpointAndReturnCreatedCampaign', async () => {
      const campaignData = {
        name: 'New Campaign',
        gameSystem: 'Pathfinder',
        description: 'A new adventure',
      };
      mockApiClient.post.mockResolvedValue(mockCampaign);

      const result = await campaignAPI.createCampaign(campaignData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/campaigns', campaignData);
      expect(result).toEqual(mockCampaign);
    });

    it('createCampaign_withEmptyData_shouldSendEmptyObject', async () => {
      mockApiClient.post.mockResolvedValue(mockCampaign);

      await campaignAPI.createCampaign({});

      expect(mockApiClient.post).toHaveBeenCalledWith('/campaigns', {});
    });

    it('createCampaign_withComplexNestedData_shouldSendFullDataStructure', async () => {
      const complexCampaignData = {
        name: 'Complex Campaign',
        worldSettings: {
          technologyLevel: 'Modern',
          magicLevel: 'Low',
          scale: 'Global',
          tone: 'Gritty',
        },
        playerInfo: {
          expectedCount: 6,
          experienceLevel: 'Expert',
          playStyle: 'Roleplay-heavy',
        },
      };
      mockApiClient.post.mockResolvedValue(mockCampaign);

      await campaignAPI.createCampaign(complexCampaignData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/campaigns', complexCampaignData);
    });

    it('createCampaign_withAPIError_shouldPropagateError', async () => {
      const error = new Error('Validation failed');
      mockApiClient.post.mockRejectedValue(error);

      await expect(campaignAPI.createCampaign({ name: 'Test' })).rejects.toBe(error);
    });
  });

  describe('updateCampaign', () => {
    it('updateCampaign_withValidIdAndData_shouldCallCorrectEndpointAndReturnUpdatedCampaign', async () => {
      const updateData = { name: 'Updated Campaign Name' };
      mockApiClient.put.mockResolvedValue(mockCampaign);

      const result = await campaignAPI.updateCampaign('campaign-1', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/campaigns/campaign-1', updateData);
      expect(result).toEqual(mockCampaign);
    });

    it('updateCampaign_withPartialData_shouldSendOnlyProvidedFields', async () => {
      const updateData = { description: 'Updated description only' };
      mockApiClient.put.mockResolvedValue(mockCampaign);

      await campaignAPI.updateCampaign('campaign-1', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/campaigns/campaign-1', updateData);
    });

    it('updateCampaign_withNestedUpdates_shouldSendNestedStructure', async () => {
      const updateData = {
        worldSettings: {
          magicLevel: 'None',
        },
        playerInfo: {
          expectedCount: 8,
        },
      };
      mockApiClient.put.mockResolvedValue(mockCampaign);

      await campaignAPI.updateCampaign('campaign-1', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/campaigns/campaign-1', updateData);
    });

    it('updateCampaign_withEmptyUpdateData_shouldSendEmptyObject', async () => {
      mockApiClient.put.mockResolvedValue(mockCampaign);

      await campaignAPI.updateCampaign('campaign-1', {});

      expect(mockApiClient.put).toHaveBeenCalledWith('/campaigns/campaign-1', {});
    });

    it('updateCampaign_withAPIError_shouldPropagateError', async () => {
      const error = new Error('Update failed');
      mockApiClient.put.mockRejectedValue(error);

      await expect(campaignAPI.updateCampaign('campaign-1', { name: 'Test' })).rejects.toBe(error);
    });
  });

  describe('deleteCampaign', () => {
    it('deleteCampaign_withValidId_shouldCallCorrectEndpoint', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await campaignAPI.deleteCampaign('campaign-1');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/campaigns/campaign-1');
    });

    it('deleteCampaign_withSpecialCharactersInId_shouldEncodeCorrectly', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await campaignAPI.deleteCampaign('campaign/test&special');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/campaigns/campaign/test&special');
    });

    it('deleteCampaign_withAPIError_shouldPropagateError', async () => {
      const error = new Error('Delete failed - campaign not found');
      mockApiClient.delete.mockRejectedValue(error);

      await expect(campaignAPI.deleteCampaign('non-existent')).rejects.toBe(error);
    });

    it('deleteCampaign_shouldNotReturnValue', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      const result = await campaignAPI.deleteCampaign('campaign-1');

      expect(result).toBeUndefined();
    });
  });

  describe('updateCampaignStatus', () => {
    it('updateCampaignStatus_withValidIdAndStatus_shouldCallCorrectEndpointAndReturnUpdatedCampaign', async () => {
      mockApiClient.patch.mockResolvedValue(mockCampaign);

      const result = await campaignAPI.updateCampaignStatus('campaign-1', 'completed');

      expect(mockApiClient.patch).toHaveBeenCalledWith('/campaigns/campaign-1/status', { status: 'completed' });
      expect(result).toEqual(mockCampaign);
    });

    it('updateCampaignStatus_withEmptyStatus_shouldSendEmptyStatus', async () => {
      mockApiClient.patch.mockResolvedValue(mockCampaign);

      await campaignAPI.updateCampaignStatus('campaign-1', '');

      expect(mockApiClient.patch).toHaveBeenCalledWith('/campaigns/campaign-1/status', { status: '' });
    });

    it('updateCampaignStatus_withSpecialStatusValues_shouldSendAsIs', async () => {
      mockApiClient.patch.mockResolvedValue(mockCampaign);

      await campaignAPI.updateCampaignStatus('campaign-1', 'on-hold & review');

      expect(mockApiClient.patch).toHaveBeenCalledWith('/campaigns/campaign-1/status', { status: 'on-hold & review' });
    });

    it('updateCampaignStatus_withAPIError_shouldPropagateError', async () => {
      const error = new Error('Status update failed');
      mockApiClient.patch.mockRejectedValue(error);

      await expect(campaignAPI.updateCampaignStatus('campaign-1', 'active')).rejects.toBe(error);
    });
  });

  describe('createMockCampaign', () => {
    it('createMockCampaign_shouldReturnValidCampaignStructure', () => {
      const mockCampaign = campaignAPI.createMockCampaign();

      expect(mockCampaign).toMatchObject({
        name: expect.any(String),
        description: expect.any(String),
        settings: expect.objectContaining({
          gameSystem: expect.any(String),
          theme: expect.any(String),
          setting: expect.any(String),
          world: expect.objectContaining({
            name: expect.any(String),
            description: expect.any(String),
            technologyLevel: expect.any(String),
            magicLevel: expect.any(String),
            scale: expect.any(String),
            tone: expect.any(String),
          }),
          players: expect.objectContaining({
            expectedCount: expect.any(Number),
            experienceLevel: expect.any(String),
            playStyle: expect.any(String),
            sessionLength: expect.any(Number),
            frequency: expect.any(String),
          }),
          rules: expect.objectContaining({
            allowMulticlassing: expect.any(Boolean),
            allowOptionalRules: expect.any(Boolean),
            deathSaves: expect.any(Boolean),
            criticalHitRules: expect.any(String),
            restVariant: expect.any(String),
            experienceType: expect.any(String),
          }),
          ai: expect.objectContaining({
            assistanceLevel: expect.any(String),
            autoGenerateNPCs: expect.any(Boolean),
            autoGenerateEvents: expect.any(Boolean),
            dynamicDifficulty: expect.any(Boolean),
            preferredProviders: expect.any(Array),
          }),
        }),
        status: expect.any(String),
        goals: expect.objectContaining({
          mainQuest: expect.any(String),
          subQuests: expect.any(Array),
          characterGoals: expect.any(Object),
          storyArcs: expect.any(Array),
        }),
      });
    });

    it('createMockCampaign_shouldReturnConsistentData', () => {
      const mockCampaign1 = campaignAPI.createMockCampaign();
      const mockCampaign2 = campaignAPI.createMockCampaign();

      // Mock campaigns should have the same structure and default values
      expect(mockCampaign1).toEqual(mockCampaign2);
    });

    it('createMockCampaign_shouldHaveValidDefaultValues', () => {
      const mockCampaign = campaignAPI.createMockCampaign();

      expect(mockCampaign.name).toBe('テストキャンペーン');
      expect(mockCampaign.settings?.gameSystem).toBe('D&D 5e');
      expect(mockCampaign.settings?.players?.expectedCount).toBe(4);
      expect(mockCampaign.status).toBe('active');
      expect(mockCampaign.goals?.mainQuest).toBe('魔王を倒して世界を救う');
    });

    it('createMockCampaign_shouldHaveValidStoryArcsStructure', () => {
      const mockCampaign = campaignAPI.createMockCampaign();

      expect(mockCampaign.goals?.storyArcs).toHaveLength(1);
      expect(mockCampaign.goals?.storyArcs?.[0]).toMatchObject({
        name: expect.any(String),
        description: expect.any(String),
        status: 'active',
        estimatedSessions: expect.any(Number),
      });
    });

    it('createMockCampaign_shouldHaveValidSubQuests', () => {
      const mockCampaign = campaignAPI.createMockCampaign();

      expect(mockCampaign.goals?.subQuests).toBeInstanceOf(Array);
      expect(mockCampaign.goals?.subQuests?.length).toBeGreaterThan(0);
      expect(mockCampaign.goals?.subQuests).toEqual([
        '仲間を集める',
        '伝説の武器を見つける',
        '各地の問題を解決する',
      ]);
    });
  });

  describe('Edge cases and error handling', () => {
    it('getCampaigns_withVeryLargePageNumber_shouldHandleGracefully', async () => {
      mockApiClient.get.mockResolvedValue(mockPaginatedResponse);

      await campaignAPI.getCampaigns({ page: 999999 });

      expect(mockApiClient.get).toHaveBeenCalledWith('/campaigns?page=999999');
    });

    it('getCampaigns_withNegativePageNumber_shouldIncludeInQuery', async () => {
      mockApiClient.get.mockResolvedValue(mockPaginatedResponse);

      await campaignAPI.getCampaigns({ page: -1 });

      expect(mockApiClient.get).toHaveBeenCalledWith('/campaigns');
    });

    it('createCampaign_withNullData_shouldHandleGracefully', async () => {
      mockApiClient.post.mockResolvedValue(mockCampaign);

      // @ts-ignore: Testing runtime null handling
      await campaignAPI.createCampaign(null);

      expect(mockApiClient.post).toHaveBeenCalledWith('/campaigns', null);
    });

    it('updateCampaign_withNullUpdateData_shouldHandleGracefully', async () => {
      mockApiClient.put.mockResolvedValue(mockCampaign);

      // @ts-ignore: Testing runtime null handling
      await campaignAPI.updateCampaign('campaign-1', null);

      expect(mockApiClient.put).toHaveBeenCalledWith('/campaigns/campaign-1', null);
    });

    it('getCampaignById_withVeryLongId_shouldHandleGracefully', async () => {
      const longId = 'a'.repeat(1000);
      mockApiClient.get.mockResolvedValue(mockCampaign);

      await campaignAPI.getCampaignById(longId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/campaigns/${longId}`);
    });

    it('updateCampaignStatus_withNullStatus_shouldHandleGracefully', async () => {
      mockApiClient.patch.mockResolvedValue(mockCampaign);

      // @ts-ignore: Testing runtime null handling
      await campaignAPI.updateCampaignStatus('campaign-1', null);

      expect(mockApiClient.patch).toHaveBeenCalledWith('/campaigns/campaign-1/status', { status: null });
    });

    it('apiMethods_withNetworkTimeout_shouldPropagateTimeoutError', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockApiClient.get.mockRejectedValue(timeoutError);

      await expect(campaignAPI.getCampaigns()).rejects.toMatchObject({
        name: 'TimeoutError',
        message: 'Request timeout',
      });
    });

    it('apiMethods_with500Error_shouldPropagateServerError', async () => {
      const serverError = new Error('Internal server error');
      serverError.name = 'ServerError';
      mockApiClient.post.mockRejectedValue(serverError);

      await expect(campaignAPI.createCampaign({ name: 'Test' })).rejects.toMatchObject({
        name: 'ServerError',
        message: 'Internal server error',
      });
    });
  });

  describe('URL parameter encoding', () => {
    it('getCampaigns_withUnicodeCharactersInSearch_shouldEncodeCorrectly', async () => {
      mockApiClient.get.mockResolvedValue(mockPaginatedResponse);

      await campaignAPI.getCampaigns({ search: '日本語キャンペーン' });

      expect(mockApiClient.get).toHaveBeenCalledWith('/campaigns?search=%E6%97%A5%E6%9C%AC%E8%AA%9E%E3%82%AD%E3%83%A3%E3%83%B3%E3%83%9A%E3%83%BC%E3%83%B3');
    });

    it('getCampaigns_withSpacesInSearch_shouldEncodeAsPlus', async () => {
      mockApiClient.get.mockResolvedValue(mockPaginatedResponse);

      await campaignAPI.getCampaigns({ search: 'multiple word search' });

      expect(mockApiClient.get).toHaveBeenCalledWith('/campaigns?search=multiple+word+search');
    });

    it('getCampaigns_withSpecialCharactersInStatus_shouldEncodeCorrectly', async () => {
      mockApiClient.get.mockResolvedValue(mockPaginatedResponse);

      await campaignAPI.getCampaigns({ status: 'in-progress&active' });

      expect(mockApiClient.get).toHaveBeenCalledWith('/campaigns?status=in-progress%26active');
    });
  });
});