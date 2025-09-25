import { ID, Milestone } from '@ai-agent-trpg/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001';

export interface MilestoneManagementAPI {
  // マイルストーン進捗情報取得
  getMilestoneProgress: (sessionId: ID, milestoneId: ID) => Promise<{
    milestoneId: ID;
    currentProgress: number;
    maxProgress: number;
    progressPercentage: number;
    completedEntities: string[];
    remainingEntities: string[];
    lastUpdated: string;
  }>;

  // マイルストーン手動完了
  completeMilestoneManually: (sessionId: ID, milestoneId: ID, options: {
    skipValidation?: boolean;
    narrativeMessage?: string;
    gmNote?: string;
  }) => Promise<{
    success: boolean;
    milestoneId: ID;
    newStatus: 'completed';
    triggeredEvents: string[];
    narrativeMessage: string;
  }>;

  // シナリオ進行トリガー
  triggerScenarioProgression: (sessionId: ID, options: {
    progressionType: 'milestone_based' | 'manual' | 'time_based';
    milestoneId?: ID;
    customMessage?: string;
    unlockEntities?: string[];
  }) => Promise<{
    success: boolean;
    unlockedEntities: string[];
    newNPCs: string[];
    newEvents: string[];
    narrativeAnnouncement: string;
  }>;

  // GM物語アナウンス投稿
  postGMNarrativeAnnouncement: (sessionId: ID, announcement: {
    title: string;
    message: string;
    type: 'milestone_completion' | 'scenario_progression' | 'custom';
    priority: 'low' | 'medium' | 'high';
    relatedMilestoneId?: ID;
  }) => Promise<{
    success: boolean;
    messageId: string;
    timestamp: string;
  }>;
}

export const milestoneManagementAPI: MilestoneManagementAPI = {
  async getMilestoneProgress(sessionId: ID, milestoneId: ID) {
    const response = await fetch(`${API_BASE_URL}/api/milestone-management/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        milestoneId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get milestone progress: ${response.statusText}`);
    }

    return response.json();
  },

  async completeMilestoneManually(sessionId: ID, milestoneId: ID, options) {
    const response = await fetch(`${API_BASE_URL}/api/milestone-management/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        milestoneId,
        ...options,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to complete milestone manually: ${response.statusText}`);
    }

    return response.json();
  },

  async triggerScenarioProgression(sessionId: ID, options) {
    const response = await fetch(`${API_BASE_URL}/api/milestone-management/scenario-progression`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        ...options,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to trigger scenario progression: ${response.statusText}`);
    }

    return response.json();
  },

  async postGMNarrativeAnnouncement(sessionId: ID, announcement) {
    const response = await fetch(`${API_BASE_URL}/api/milestone-management/gm-announcement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        ...announcement,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to post GM narrative announcement: ${response.statusText}`);
    }

    return response.json();
  },
};