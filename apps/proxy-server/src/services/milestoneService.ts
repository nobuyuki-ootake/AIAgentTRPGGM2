import { Database } from 'better-sqlite3';
import { Milestone, ProgressTracker, LevelUpEvent, CampaignCompletion, ID } from '@ai-agent-trpg/types';
import { getDatabase } from '../database/database';

export class MilestoneService {
  private db: Database;

  constructor() {
    this.db = getDatabase();
    this.initTables();
  }

  private initTables(): void {
    // マイルストーンテーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS milestones (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'not_started',
        importance TEXT NOT NULL DEFAULT 'minor',
        progress INTEGER NOT NULL DEFAULT 0,
        requirements TEXT NOT NULL DEFAULT '[]',
        rewards TEXT NOT NULL DEFAULT '{}',
        estimated_time INTEGER,
        dependencies TEXT DEFAULT '[]',
        tags TEXT DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        created_by TEXT,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      )
    `);

    // 進捗トラッカーテーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS progress_trackers (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL UNIQUE,
        overall_progress TEXT NOT NULL DEFAULT '{}',
        category_progress TEXT NOT NULL DEFAULT '{}',
        recent_achievements TEXT NOT NULL DEFAULT '[]',
        statistics TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      )
    `);

    // レベルアップイベントテーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS level_up_events (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        character_id TEXT,
        previous_level INTEGER NOT NULL,
        new_level INTEGER NOT NULL,
        experience_gained INTEGER NOT NULL,
        total_experience INTEGER NOT NULL,
        new_abilities TEXT DEFAULT '[]',
        stat_improvements TEXT DEFAULT '{}',
        milestone_id TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE SET NULL
      )
    `);

    // キャンペーン完了テーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS campaign_completions (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL UNIQUE,
        completion_type TEXT NOT NULL,
        completion_date TEXT NOT NULL,
        final_statistics TEXT NOT NULL DEFAULT '{}',
        achievements TEXT NOT NULL DEFAULT '[]',
        completion_notes TEXT,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      )
    `);
  }

  // マイルストーン管理
  async createMilestone(milestoneData: Partial<Milestone>): Promise<Milestone> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const milestone: Milestone = {
      id,
      campaignId: milestoneData.campaignId!,
      name: milestoneData.title || '',
      title: milestoneData.title || '',
      description: milestoneData.description || '',
      category: milestoneData.category || 'custom',
      status: milestoneData.status || 'not_started',
      importance: typeof milestoneData.importance === 'number' ? milestoneData.importance : 1,
      progress: milestoneData.progress || 0,
      requirements: milestoneData.requirements || [],
      conditions: milestoneData.requirements || [],
      rewards: milestoneData.rewards || {
        experience: 0,
        currency: 0,
        items: [],
        abilities: [],
        storyProgression: [],
        unlockedContent: []
      },
      order: 0,
      prerequisites: milestoneData.prerequisites || [],
      unlocks: milestoneData.unlocks || [],
      dependencies: milestoneData.dependencies || [],
      estimatedTimeToComplete: milestoneData.estimatedTimeToComplete || 60,
      estimatedTime: milestoneData.estimatedTime || 60,
      difficulty: typeof milestoneData.difficulty === 'number' ? milestoneData.difficulty : 2,
      tags: milestoneData.tags || [],
      createdAt: now,
      updatedAt: now,
      completedAt: milestoneData.completedAt,
      createdBy: milestoneData.createdBy,
    };

    const stmt = this.db.prepare(`
      INSERT INTO milestones (
        id, campaign_id, title, description, category, status, importance,
        progress, requirements, rewards, estimated_time, dependencies,
        tags, created_at, updated_at, completed_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      milestone.id,
      milestone.campaignId,
      milestone.title,
      milestone.description,
      milestone.category,
      milestone.status,
      milestone.importance,
      milestone.progress,
      JSON.stringify(milestone.requirements),
      JSON.stringify(milestone.rewards),
      milestone.estimatedTime,
      JSON.stringify(milestone.dependencies),
      JSON.stringify(milestone.tags),
      milestone.createdAt,
      milestone.updatedAt,
      milestone.completedAt,
      milestone.createdBy,
    ]);

    await this.updateProgressTracker(milestone.campaignId);
    return milestone;
  }

  async getMilestonesByCampaign(campaignId: ID): Promise<Milestone[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM milestones 
      WHERE campaign_id = ? 
      ORDER BY created_at ASC
    `);
    
    const rows = stmt.all(campaignId) as any[];
    
    return rows.map((row): Milestone => ({
      id: row.id,
      campaignId: row.campaign_id,
      name: row.title,
      title: row.title,
      description: row.description,
      category: row.category,
      status: row.status,
      importance: row.importance,
      progress: row.progress,
      requirements: JSON.parse(row.requirements),
      conditions: JSON.parse(row.requirements),
      rewards: JSON.parse(row.rewards),
      order: 0,
      prerequisites: JSON.parse(row.dependencies || '[]'),
      unlocks: JSON.parse(row.tags || '[]'),
      dependencies: JSON.parse(row.dependencies || '[]'),
      estimatedTimeToComplete: row.estimated_time || 60,
      estimatedTime: row.estimated_time || 60,
      difficulty: 2,
      tags: JSON.parse(row.tags || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      createdBy: row.created_by,
    }));
  }

  async updateMilestone(milestoneId: ID, updates: Partial<Milestone>): Promise<Milestone> {
    const existingMilestone = await this.getMilestoneById(milestoneId);
    if (!existingMilestone) {
      throw new Error('Milestone not found');
    }

    const updatedMilestone: Milestone = {
      ...existingMilestone,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const stmt = this.db.prepare(`
      UPDATE milestones SET
        title = ?, description = ?, category = ?, status = ?, importance = ?,
        progress = ?, requirements = ?, rewards = ?, estimated_time = ?,
        dependencies = ?, tags = ?, updated_at = ?, completed_at = ?
      WHERE id = ?
    `);

    stmt.run([
      updatedMilestone.title,
      updatedMilestone.description,
      updatedMilestone.category,
      updatedMilestone.status,
      updatedMilestone.importance,
      updatedMilestone.progress,
      JSON.stringify(updatedMilestone.requirements),
      JSON.stringify(updatedMilestone.rewards),
      updatedMilestone.estimatedTimeToComplete,
      JSON.stringify(updatedMilestone.dependencies || []),
      JSON.stringify(updatedMilestone.tags || []),
      updatedMilestone.updatedAt,
      updatedMilestone.completedAt,
      milestoneId,
    ]);

    await this.updateProgressTracker(updatedMilestone.campaignId);
    
    // マイルストーン完了時にレベルアップイベントを作成
    if (updates.status === 'completed' && existingMilestone.status !== 'completed') {
      await this.createLevelUpEvent(updatedMilestone);
    }

    return updatedMilestone;
  }

  async getMilestoneById(milestoneId: ID): Promise<Milestone | null> {
    const stmt = this.db.prepare('SELECT * FROM milestones WHERE id = ?');
    const row = stmt.get(milestoneId) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      campaignId: row.campaign_id,
      name: row.title,
      title: row.title,
      description: row.description,
      category: row.category,
      status: row.status,
      importance: row.importance,
      progress: row.progress,
      requirements: JSON.parse(row.requirements),
      conditions: JSON.parse(row.requirements),
      rewards: JSON.parse(row.rewards),
      order: 0,
      prerequisites: JSON.parse(row.dependencies || '[]'),
      unlocks: JSON.parse(row.tags || '[]'),
      dependencies: JSON.parse(row.dependencies || '[]'),
      estimatedTimeToComplete: row.estimated_time || 60,
      estimatedTime: row.estimated_time || 60,
      difficulty: 2,
      tags: JSON.parse(row.tags || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      createdBy: row.created_by
    };
  }

  // 進捗トラッカー管理
  async getProgressTracker(campaignId: ID): Promise<ProgressTracker> {
    let stmt = this.db.prepare('SELECT * FROM progress_trackers WHERE campaign_id = ?');
    let row = stmt.get(campaignId) as any;
    
    if (!row) {
      // 進捗トラッカーが存在しない場合は作成
      await this.createProgressTracker(campaignId);
      row = stmt.get(campaignId) as any;
    }

    return {
      id: row.id,
      campaignId: row.campaign_id,
      overallProgress: JSON.parse(row.overall_progress),
      categoryProgress: JSON.parse(row.category_progress),
      recentAchievements: JSON.parse(row.recent_achievements),
      upcomingMilestones: [], // 必要なプロパティを追加
      statistics: JSON.parse(row.statistics),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private async createProgressTracker(campaignId: ID): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const defaultProgress = {
      totalMilestones: 0,
      completedMilestones: 0,
      estimatedCompletion: 0,
      experienceGained: 0,
    };

    const stmt = this.db.prepare(`
      INSERT INTO progress_trackers (
        id, campaign_id, overall_progress, category_progress,
        recent_achievements, statistics, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      id,
      campaignId,
      JSON.stringify(defaultProgress),
      JSON.stringify({}),
      JSON.stringify([]),
      JSON.stringify({}),
      now,
      now,
    ]);
  }

  private async updateProgressTracker(campaignId: ID): Promise<void> {
    const milestones = await this.getMilestonesByCampaign(campaignId);
    
    // 全体進捗計算
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(m => m.status === 'completed').length;
    const estimatedCompletion = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
    const experienceGained = milestones
      .filter(m => m.status === 'completed')
      .reduce((total, m) => total + (m.rewards.experience || 0), 0);

    // カテゴリ別進捗
    const categoryProgress: Record<string, any> = {};
    const categoriesSet = new Set(milestones.map(m => m.category));
    const categories: string[] = [];
    categoriesSet.forEach(cat => cat && categories.push(cat));
    
    categories.forEach(category => {
      const categoryMilestones = milestones.filter(m => m.category === category);
      const completed = categoryMilestones.filter(m => m.status === 'completed').length;
      
      categoryProgress[category] = {
        total: categoryMilestones.length,
        completed: completed,
        progress: categoryMilestones.length > 0 ? Math.round((completed / categoryMilestones.length) * 100) : 0,
      };
    });

    // 最近の達成
    const recentAchievements = milestones
      .filter(m => m.status === 'completed' && m.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
      .slice(0, 5)
      .map(m => ({
        milestoneId: m.id,
        milestoneTitle: m.title,
        experience: m.rewards.experience || 0,
        completedAt: m.completedAt!,
      }));

    const overallProgress = {
      totalMilestones,
      completedMilestones,
      estimatedCompletion,
      experienceGained,
    };

    const statistics = {
      averageProgressPerMilestone: totalMilestones > 0 ? Math.round(milestones.reduce((sum, m) => sum + (m.progress || 0), 0) / totalMilestones) : 0,
      mostActiveCategory: Object.entries(categoryProgress).reduce((max, [cat, data]) => {
        if (!max) return cat;
        const maxData = categoryProgress[max] as any;
        return (data as any).completed > (maxData?.completed || 0) ? cat : max;
      }, Object.keys(categoryProgress)[0] || 'story'),
    };

    const stmt = this.db.prepare(`
      UPDATE progress_trackers SET
        overall_progress = ?, category_progress = ?, recent_achievements = ?,
        statistics = ?, updated_at = ?
      WHERE campaign_id = ?
    `);

    stmt.run([
      JSON.stringify(overallProgress),
      JSON.stringify(categoryProgress),
      JSON.stringify(recentAchievements),
      JSON.stringify(statistics),
      new Date().toISOString(),
      campaignId,
    ]);
  }

  // レベルアップイベント管理
  async createLevelUpEvent(milestone: Milestone): Promise<LevelUpEvent> {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    // 簡単なレベル計算（経験値ベース）
    const experienceGained = milestone.rewards.experience || 0;
    const currentExp = await this.getTotalExperience(milestone.campaignId);
    const previousLevel = Math.floor(currentExp / 1000) + 1;
    const newLevel = Math.floor((currentExp + experienceGained) / 1000) + 1;

    const levelUpEvent: LevelUpEvent = {
      id,
      campaignId: milestone.campaignId,
      characterId: '', // キャンペーン全体のレベル
      previousLevel,
      newLevel,
      experienceGained,
      totalExperience: currentExp + experienceGained,
      statIncreases: {},
      statImprovements: {},
      newSkills: [],
      newAbilities: milestone.rewards.abilities || [],
      newFeats: [],
      hitPointIncrease: 0,
      milestoneId: milestone.id,
      pendingChoices: [],
      timestamp,
      source: 'milestone_completion',
    };

    const stmt = this.db.prepare(`
      INSERT INTO level_up_events (
        id, campaign_id, character_id, previous_level, new_level,
        experience_gained, total_experience, new_abilities,
        stat_improvements, milestone_id, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      levelUpEvent.id,
      levelUpEvent.campaignId,
      levelUpEvent.characterId,
      levelUpEvent.previousLevel,
      levelUpEvent.newLevel,
      levelUpEvent.experienceGained,
      levelUpEvent.totalExperience,
      JSON.stringify(levelUpEvent.newAbilities),
      JSON.stringify(levelUpEvent.statImprovements),
      levelUpEvent.milestoneId || null,
      levelUpEvent.timestamp,
    ]);

    return levelUpEvent;
  }

  async getLevelUpEventsByCampaign(campaignId: ID): Promise<LevelUpEvent[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM level_up_events 
      WHERE campaign_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 10
    `);
    
    const rows = stmt.all(campaignId) as any[];
    
    return rows.map((row): LevelUpEvent => ({
      id: row.id,
      campaignId: row.campaign_id,
      characterId: row.character_id,
      previousLevel: row.previous_level,
      newLevel: row.new_level,
      experienceGained: row.experience_gained,
      totalExperience: row.total_experience,
      statIncreases: JSON.parse(row.stat_improvements || '{}'),
      statImprovements: JSON.parse(row.stat_improvements || '{}'),
      newSkills: [],
      newAbilities: JSON.parse(row.new_abilities || '[]'),
      newFeats: [],
      hitPointIncrease: 0,
      milestoneId: row.milestone_id,
      pendingChoices: [],
      timestamp: row.timestamp,
      source: 'milestone_completion',
    }));
  }


  private async getTotalExperience(campaignId: ID): Promise<number> {
    const stmt = this.db.prepare(`
      SELECT COALESCE(SUM(experience_gained), 0) as total
      FROM level_up_events 
      WHERE campaign_id = ?
    `);
    
    const result = stmt.get(campaignId) as any;
    return result.total || 0;
  }

  // キャンペーン完了管理
  async getCampaignCompletion(campaignId: ID): Promise<CampaignCompletion | null> {
    const stmt = this.db.prepare('SELECT * FROM campaign_completions WHERE campaign_id = ?');
    const row = stmt.get(campaignId) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      campaignId: row.campaign_id,
      isCompleted: true,
      completionPercentage: 100,
      completionType: row.completion_type,
      completionDate: row.completion_date,
      completionNotes: row.completion_notes,
      winConditions: [],
      failConditions: [],
      availableEndings: [],
      finalStatistics: JSON.parse(row.final_statistics),
      achievements: JSON.parse(row.achievements),
    };
  }

  async completeCampaign(
    campaignId: ID,
    completionType: 'success' | 'failure' | 'abandoned',
    completionNotes?: string
  ): Promise<CampaignCompletion> {
    const id = crypto.randomUUID();
    const completionDate = new Date().toISOString();
    
    const progressTracker = await this.getProgressTracker(campaignId);
    
    const finalStatistics = {
      totalPlayTime: progressTracker.statistics.totalPlayTime || 0,
      sessionsPlayed: 0,
      milestonesCompleted: progressTracker.overallProgress.completedMilestones || 0,
      questsCompleted: 0,
      charactersLost: 0,
      finalCharacterLevels: {},
    };

    const achievements = progressTracker.recentAchievements.map((a: any) => `${a.milestoneId}: ${a.experience} exp`);

    const completion: CampaignCompletion = {
      id,
      campaignId,
      isCompleted: true,
      completionPercentage: 100,
      completionType,
      completionDate,
      completionNotes,
      winConditions: [],
      failConditions: [],
      availableEndings: [],
      finalStatistics,
      achievements,
    };

    const stmt = this.db.prepare(`
      INSERT INTO campaign_completions (
        id, campaign_id, completion_type, completion_date,
        final_statistics, achievements, completion_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      completion.id,
      completion.campaignId,
      completion.completionType,
      completion.completionDate,
      JSON.stringify(completion.finalStatistics),
      JSON.stringify(completion.achievements),
      completion.completionNotes,
    ]);

    return completion;
  }

  async deleteMilestone(milestoneId: ID): Promise<void> {
    const milestone = await this.getMilestoneById(milestoneId);
    if (!milestone) {
      throw new Error('Milestone not found');
    }

    const stmt = this.db.prepare('DELETE FROM milestones WHERE id = ?');
    stmt.run(milestoneId);

    await this.updateProgressTracker(milestone.campaignId);
  }
}

// Lazy initialization to avoid early instantiation
let _milestoneService: MilestoneService | null = null;
export function getMilestoneService(): MilestoneService {
  if (!_milestoneService) {
    _milestoneService = new MilestoneService();
  }
  return _milestoneService;
}