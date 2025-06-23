import { v4 as uuidv4 } from 'uuid';
import { Character, TRPGCharacter, NPCCharacter, EnemyCharacter, DEFAULT_BASE_STATS, DEFAULT_DERIVED_STATS } from '@ai-agent-trpg/types';
import { getDatabase, withTransaction } from '../database/database';
import { DatabaseError, ValidationError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

class CharacterService {
  async getCharactersByCampaign(campaignId: string, characterType?: string): Promise<Character[]> {
    const db = getDatabase();
    
    try {
      let query = 'SELECT * FROM characters WHERE campaign_id = ?';
      const params: any[] = [campaignId];
      
      if (characterType) {
        query += ' AND character_type = ?';
        params.push(characterType);
      }
      
      query += ' ORDER BY name ASC';
      
      const rows = db.prepare(query).all(params) as any[];
      return rows.map(this.mapRowToCharacter);
      
    } catch (error) {
      logger.error(`Failed to get characters for campaign ${campaignId}:`, error);
      throw new DatabaseError('Failed to retrieve characters', { error, campaignId });
    }
  }

  async getCharacterById(id: string): Promise<Character | null> {
    const db = getDatabase();
    
    try {
      const row = db.prepare('SELECT * FROM characters WHERE id = ?').get(id) as any;
      
      if (!row) {
        return null;
      }
      
      return this.mapRowToCharacter(row);
      
    } catch (error) {
      logger.error(`Failed to get character ${id}:`, error);
      throw new DatabaseError('Failed to retrieve character', { error, characterId: id });
    }
  }

  async createCharacter(characterData: Partial<Character> & { campaignId: string }): Promise<Character> {
    if (!characterData.name || !characterData.characterType || !characterData.campaignId) {
      throw new ValidationError('Name, character type, and campaign ID are required');
    }

    // Check if campaign exists, if not, use the most recent valid campaign
    const db = getDatabase();
    const campaignExists = db.prepare('SELECT id FROM campaigns WHERE id = ?').get(characterData.campaignId);
    
    if (!campaignExists) {
      // Get the most recent campaign as fallback
      const latestCampaign = db.prepare('SELECT id FROM campaigns ORDER BY created_at DESC LIMIT 1').get() as { id: string } | undefined;
      
      if (latestCampaign) {
        logger.warn(`Campaign ${characterData.campaignId} not found, using latest campaign ${latestCampaign.id} instead`);
        characterData.campaignId = latestCampaign.id;
      } else {
        throw new ValidationError(`Campaign ${characterData.campaignId} does not exist and no fallback campaign available`);
      }
    }

    const now = new Date().toISOString();
    const baseCharacter = {
      id: uuidv4(),
      name: characterData.name,
      description: characterData.description || '',
      age: characterData.age || 25,
      race: characterData.race || 'Human',
      characterClass: characterData.characterClass || 'Fighter',
      level: characterData.level || 1,
      experience: characterData.experience || 0,
      baseStats: characterData.baseStats || DEFAULT_BASE_STATS,
      derivedStats: characterData.derivedStats || DEFAULT_DERIVED_STATS,
      skills: characterData.skills || [],
      feats: characterData.feats || [],
      equipment: characterData.equipment || {
        weapon: null,
        armor: null,
        shield: null,
        accessories: [],
        inventory: [],
        totalWeight: 0,
        carryingCapacity: 100,
      },
      statusEffects: characterData.statusEffects || [],
      appearance: characterData.appearance || {
        height: '5\'8"',
        weight: '150 lbs',
        eyeColor: 'Brown',
        hairColor: 'Brown',
        skinColor: 'Medium',
        distinguishingFeatures: '',
      },
      background: characterData.background || {
        backstory: '',
        personality: '',
        ideals: '',
        bonds: '',
        flaws: '',
        languages: ['Common'],
        proficiencies: [],
      },
      currentLocationId: characterData.currentLocationId,
      locationHistory: characterData.locationHistory || [],
      createdAt: now,
      updatedAt: now,
    };

    let character: Character;

    switch (characterData.characterType) {
      case 'PC':
        character = {
          ...baseCharacter,
          characterType: 'PC' as const,
          growth: {
            levelUpHistory: [],
            nextLevelExp: 1000,
            unspentSkillPoints: 0,
            unspentFeatPoints: 0,
          },
          party: {
            role: 'dps',
            position: 'front',
            leadership: false,
          },
          playerNotes: '',
          gmNotes: '',
        };
        break;

      case 'NPC':
        character = {
          ...baseCharacter,
          characterType: 'NPC' as const,
          npcData: {
            importance: 'minor',
            disposition: 'neutral',
            occupation: '',
            location: '',
            aiPersonality: {
              traits: [],
              goals: [],
              motivations: [],
              fears: [],
              autonomyLevel: 'assisted' as const,
              decisionMaking: {
                aggressiveness: 0,
                curiosity: 5,
                loyalty: 5,
                rationality: 5,
                sociability: 7,
              },
              actionPriorities: {
                self_preservation: 8,
                goal_achievement: 5,
                relationship_maintenance: 7,
                information_gathering: 3,
                conflict_avoidance: 8,
              },
              responsePatterns: {
                greetings: ['こんにちは'],
                farewells: ['さようなら'],
                agreements: ['はい'],
                disagreements: ['いいえ'],
                questions: ['？'],
                combat_taunts: [],
                help_requests: ['助けて'],
                thank_you: ['ありがとう'],
              },
              relationships: {},
            },
            storyRole: {
              questInvolvement: [],
              plotHooks: [],
              secrets: [],
              information: [],
            },
            memory: {
              interactions: [],
              relationshipChanges: [],
            },
          },
        };
        break;

      case 'Enemy':
        character = {
          ...baseCharacter,
          characterType: 'Enemy' as const,
          enemyData: {
            category: 'minion',
            challengeRating: 1,
            encounterLevel: 1,
            combat: {
              tactics: [],
              specialAbilities: [],
              weaknesses: [],
              resistances: [],
              immunities: [],
              aiCombatBehavior: {
                autonomyLevel: 'autonomous' as const,
                aggression: 7,
                intelligence: 3,
                teamwork: 2,
                preservation: 5,
                preferredTargets: ['closest'],
                combatDialogue: {
                  battle_start: ['戦え！'],
                  taking_damage: ['ぐっ！'],
                  dealing_damage: ['やったぞ！'],
                  low_health: ['まずい...'],
                  victory: ['勝った！'],
                  defeat: ['やられた...'],
                },
                tacticalDecisions: {
                  retreat_threshold: 25,
                  ability_usage_strategy: 'balanced' as const,
                  positioning_preference: 'front' as const,
                  focus_fire: false,
                },
              },
            },
            encounter: {
              environment: [],
              companions: [],
              tactics: '',
              escapeThreshold: 25,
              morale: 10,
            },
            loot: {
              experience: 100,
              currency: 10,
              items: [],
            },
          },
        };
        break;

      default:
        throw new ValidationError(`Invalid character type: ${characterData.characterType}`);
    }

    return withTransaction((db) => {
      try {
        // キャラクター固有データを取得
        const characterTypeData = this.getCharacterTypeData(character);

        db.prepare(`
          INSERT INTO characters (
            id, campaign_id, name, character_type, description, age, race, class,
            level, experience, base_stats, derived_stats, skills, feats,
            equipment, status_effects, appearance, background, character_data,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          character.id,
          (characterData as any).campaignId,
          character.name,
          character.characterType,
          character.description,
          character.age,
          character.race,
          character.characterClass,
          character.level,
          character.experience,
          JSON.stringify(character.baseStats),
          JSON.stringify(character.derivedStats),
          JSON.stringify(character.skills),
          JSON.stringify(character.feats),
          JSON.stringify(character.equipment),
          JSON.stringify(character.statusEffects),
          JSON.stringify(character.appearance),
          JSON.stringify(character.background),
          JSON.stringify(characterTypeData),
          character.createdAt,
          character.updatedAt
        );

        logger.info(`Character created: ${character.id} - ${character.name} (${character.characterType})`);
        return character;
        
      } catch (error) {
        logger.error('Failed to create character:', error);
        throw new DatabaseError('Failed to create character', { error });
      }
    });
  }

  async updateCharacter(id: string, updateData: Partial<Omit<Character, 'id' | 'characterType' | 'createdAt'>>): Promise<Character | null> {
    const db = getDatabase();
    
    try {
      const existingCharacter = await this.getCharacterById(id);
      if (!existingCharacter) {
        return null;
      }

      const updatedCharacter = {
        ...existingCharacter,
        ...updateData,
        id: existingCharacter.id, // IDは変更不可
        characterType: existingCharacter.characterType, // キャラクタータイプは変更不可
        createdAt: existingCharacter.createdAt, // 作成日時は変更不可
        updatedAt: new Date().toISOString(),
      } as Character;

      const characterTypeData = this.getCharacterTypeData(updatedCharacter);

      db.prepare(`
        UPDATE characters SET
          name = ?, description = ?, age = ?, race = ?, class = ?, level = ?,
          experience = ?, base_stats = ?, derived_stats = ?, skills = ?, feats = ?,
          equipment = ?, status_effects = ?, appearance = ?, background = ?,
          character_data = ?, updated_at = ?
        WHERE id = ?
      `).run(
        updatedCharacter.name,
        updatedCharacter.description,
        updatedCharacter.age,
        updatedCharacter.race,
        updatedCharacter.characterClass,
        updatedCharacter.level,
        updatedCharacter.experience,
        JSON.stringify(updatedCharacter.baseStats),
        JSON.stringify(updatedCharacter.derivedStats),
        JSON.stringify(updatedCharacter.skills),
        JSON.stringify(updatedCharacter.feats),
        JSON.stringify(updatedCharacter.equipment),
        JSON.stringify(updatedCharacter.statusEffects),
        JSON.stringify(updatedCharacter.appearance),
        JSON.stringify(updatedCharacter.background),
        JSON.stringify(characterTypeData),
        updatedCharacter.updatedAt,
        id
      );

      logger.info(`Character updated: ${id}`);
      return updatedCharacter;
      
    } catch (error) {
      logger.error(`Failed to update character ${id}:`, error);
      throw new DatabaseError('Failed to update character', { error, characterId: id });
    }
  }

  async deleteCharacter(id: string): Promise<boolean> {
    const db = getDatabase();
    
    try {
      const result = db.prepare('DELETE FROM characters WHERE id = ?').run(id);
      
      if (result.changes === 0) {
        return false;
      }
      
      logger.info(`Character deleted: ${id}`);
      return true;
      
    } catch (error) {
      logger.error(`Failed to delete character ${id}:`, error);
      throw new DatabaseError('Failed to delete character', { error, characterId: id });
    }
  }

  async updateCharacterLevel(id: string, newLevel: number, improvements?: string[]): Promise<Character | null> {
    const character = await this.getCharacterById(id);
    if (!character) {
      return null;
    }

    const updates: Partial<Character> = {
      level: newLevel,
    };

    // PCの場合、成長履歴を更新
    if (character.characterType === 'PC') {
      const pcCharacter = character as TRPGCharacter;
      pcCharacter.growth.levelUpHistory.push({
        level: newLevel,
        date: new Date().toISOString(),
        improvements: improvements || [],
      });
      (updates as any).growth = pcCharacter.growth;
    }

    return this.updateCharacter(id, updates);
  }

  async updateCharacterHP(id: string, newHP: number): Promise<Character | null> {
    const character = await this.getCharacterById(id);
    if (!character) {
      return null;
    }

    const updates = {
      derivedStats: {
        ...character.derivedStats,
        hitPoints: Math.max(0, Math.min(newHP, character.derivedStats.maxHitPoints)),
      },
    };

    return this.updateCharacter(id, updates);
  }

  private mapRowToCharacter(row: any): Character {
    const baseCharacter = {
      id: row.id,
      name: row.name,
      description: row.description,
      age: row.age,
      race: row.race,
      characterClass: row.class,
      level: row.level,
      experience: row.experience,
      baseStats: JSON.parse(row.base_stats),
      derivedStats: JSON.parse(row.derived_stats),
      skills: JSON.parse(row.skills),
      feats: JSON.parse(row.feats),
      equipment: JSON.parse(row.equipment),
      statusEffects: JSON.parse(row.status_effects),
      appearance: JSON.parse(row.appearance),
      background: JSON.parse(row.background),
      currentLocationId: row.current_location_id,
      locationHistory: JSON.parse(row.location_history || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    const characterData = JSON.parse(row.character_data);

    switch (row.character_type) {
      case 'PC':
        return {
          ...baseCharacter,
          characterType: 'PC',
          ...characterData,
        } as TRPGCharacter;

      case 'NPC':
        return {
          ...baseCharacter,
          characterType: 'NPC',
          npcData: characterData,
        } as NPCCharacter;

      case 'Enemy':
        return {
          ...baseCharacter,
          characterType: 'Enemy',
          enemyData: characterData,
        } as EnemyCharacter;

      default:
        throw new Error(`Unknown character type: ${row.character_type}`);
    }
  }

  private getCharacterTypeData(character: Character): any {
    switch (character.characterType) {
      case 'PC':
        const pc = character as TRPGCharacter;
        return {
          playerId: pc.playerId,
          growth: pc.growth,
          party: pc.party,
          playerNotes: pc.playerNotes,
          gmNotes: pc.gmNotes,
        };

      case 'NPC':
        const npc = character as NPCCharacter;
        return npc.npcData;

      case 'Enemy':
        const enemy = character as EnemyCharacter;
        return enemy.enemyData;

      default:
        return {};
    }
  }
}

// Lazy initialization to avoid early instantiation
let _characterService: CharacterService | null = null;
export function getCharacterService(): CharacterService {
  if (!_characterService) {
    _characterService = new CharacterService();
  }
  return _characterService;
}