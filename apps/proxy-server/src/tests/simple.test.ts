/**
 * Simple Test - Basic Jest functionality verification
 */

import { TRPGCampaign } from '@ai-agent-trpg/types';

describe('Simple Test Suite', () => {
  test('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should import types correctly', () => {
    const campaign: Partial<TRPGCampaign> = {
      id: 'test-campaign',
      name: 'Test Campaign',
      status: 'planning'
    };
    
    expect(campaign.id).toBe('test-campaign');
    expect(campaign.name).toBe('Test Campaign');
  });

  test('should work with mock functions', () => {
    const mockFn = jest.fn();
    mockFn('test');
    
    expect(mockFn).toHaveBeenCalledWith('test');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});