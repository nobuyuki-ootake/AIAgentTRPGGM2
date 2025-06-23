import { Character, TRPGCharacter, NPCCharacter, EnemyCharacter, BaseStats, DerivedStats } from '@ai-agent-trpg/types';
import { apiClient } from './client';

class CharacterAPI {
  // キャラクター一覧取得（キャンペーン別）
  async getCharactersByCampaign(campaignId: string, characterType?: string): Promise<Character[]> {
    const params = new URLSearchParams();
    params.append('campaignId', campaignId);
    if (characterType) params.append('characterType', characterType);
    
    return apiClient.get<Character[]>(`/characters?${params.toString()}`);
  }

  // キャラクター詳細取得
  async getCharacterById(id: string): Promise<Character> {
    return apiClient.get<Character>(`/characters/${id}`);
  }

  // キャラクター作成
  async createCharacter(characterData: Character): Promise<Character> {
    return apiClient.post<Character>('/characters', characterData);
  }

  // キャラクター更新
  async updateCharacter(id: string, updateData: Partial<Character>): Promise<Character> {
    return apiClient.put<Character>(`/characters/${id}`, updateData);
  }

  // キャラクター削除
  async deleteCharacter(id: string): Promise<void> {
    await apiClient.delete(`/characters/${id}`);
  }

  // HP更新（セッション中によく使用）
  async updateCharacterHP(id: string, newHP: number): Promise<Character> {
    return apiClient.patch<Character>(`/characters/${id}/hp`, { hp: newHP });
  }

  // モックPC作成（開発用）
  createMockPC(campaignId: string, name: string = 'テスト冒険者'): Partial<TRPGCharacter> & { campaignId: string } {
    const baseStats: BaseStats = {
      strength: 16,
      dexterity: 14,
      constitution: 15,
      intelligence: 10,
      wisdom: 12,
      charisma: 8,
    };

    const derivedStats: DerivedStats = {
      hitPoints: 28,
      maxHitPoints: 28,
      magicPoints: 10,
      maxMagicPoints: 10,
      armorClass: 16,
      initiative: 2,
      speed: 30,
    };

    return {
      campaignId,
      characterType: 'PC',
      name,
      description: 'テスト用のプレイヤーキャラクター',
      age: 25,
      race: 'ヒューマン',
      characterClass: 'ファイター',
      level: 3,
      experience: 900,
      baseStats,
      derivedStats,
      skills: [
        {
          id: '1',
          name: '剣術',
          description: '剣での戦闘技術',
          attribute: 'strength',
          level: 3,
          experience: 150,
          isClassSkill: true,
        },
      ],
      feats: [
        {
          id: '1',
          name: '強打',
          description: '攻撃に+5ダメージ、命中に-2',
          prerequisites: ['筋力13以上'],
          effects: ['ダメージ+5', '命中-2'],
          category: 'combat',
        },
      ],
      equipment: {
        weapon: {
          id: '1',
          name: 'ロングソード',
          description: '標準的な片手剣',
          type: 'weapon',
          rarity: 'common',
          value: 15,
          weight: 3,
          quantity: 1,
          properties: { damage: '1d8', damageType: '斬撃' },
        },
        armor: {
          id: '2',
          name: 'チェインメイル',
          description: '鎖帷子の鎧',
          type: 'armor',
          rarity: 'common',
          value: 75,
          weight: 55,
          quantity: 1,
          properties: { armorClass: 16, stealthDisadvantage: true },
        },
        shield: null,
        accessories: [],
        inventory: [],
        totalWeight: 58,
        carryingCapacity: 240,
      },
      statusEffects: [],
      appearance: {
        height: '175cm',
        weight: '70kg',
        eyeColor: '茶色',
        hairColor: '黒',
        skinColor: '小麦色',
        distinguishingFeatures: '左頬に小さな傷跡',
      },
      background: {
        backstory: '小さな村の出身で、冒険者として名を上げるために旅立った',
        personality: '勇敢で正義感が強いが、少し単純',
        ideals: '困っている人を助けること',
        bonds: '故郷の村を守りたい',
        flaws: '考えるより先に行動してしまう',
        languages: ['共通語', 'ドワーフ語'],
        proficiencies: ['全ての武器', '全ての防具', '盾'],
      },
      growth: {
        levelUpHistory: [
          { level: 2, date: '2024-01-15T10:00:00Z', improvements: ['HP+8'] },
          { level: 3, date: '2024-02-01T10:00:00Z', improvements: ['HP+7', '強打習得'] },
        ],
        nextLevelExp: 2700,
        unspentSkillPoints: 0,
        unspentFeatPoints: 0,
      },
      party: {
        role: 'tank',
        position: 'front',
        leadership: true,
      },
      playerNotes: '',
      gmNotes: '',
    };
  }

  // モックNPC作成（開発用）
  createMockNPC(campaignId: string, name: string = '酒場の主人'): Partial<NPCCharacter> & { campaignId: string } {
    return {
      campaignId,
      characterType: 'NPC',
      name,
      description: '冒険者の宿を営む気さくな中年男性',
      age: 45,
      race: 'ヒューマン',
      characterClass: '一般人',
      level: 1,
      experience: 0,
      baseStats: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 12,
        wisdom: 14,
        charisma: 13,
      },
      derivedStats: {
        hitPoints: 6,
        maxHitPoints: 6,
        magicPoints: 0,
        maxMagicPoints: 0,
        armorClass: 10,
        initiative: 0,
        speed: 30,
      },
      npcData: {
        importance: 'minor',
        disposition: 'friendly',
        occupation: '宿屋の主人',
        location: '冒険者の宿「銀の竜」',
        aiPersonality: {
          traits: ['親切', '話好き', '商売上手'],
          goals: ['宿を繁盛させる', '冒険者を支援する'],
          motivations: ['家族を養う', '地域の安全'],
          fears: ['モンスターの襲撃', '客が来なくなること'],
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
          plotHooks: ['地域の噂話を提供', 'クエスト情報の仲介'],
          secrets: ['元は冒険者だった'],
          information: ['近くの遺跡の情報', 'モンスターの出没情報'],
        },
        memory: {
          interactions: [],
          relationshipChanges: [],
        },
      },
    };
  }

  // モックEnemy作成（開発用）
  createMockEnemy(campaignId: string, name: string = 'ゴブリン'): Partial<EnemyCharacter> & { campaignId: string } {
    return {
      campaignId,
      characterType: 'Enemy',
      name,
      description: '小柄で狡猾な人型生物',
      age: 15,
      race: 'ゴブリン',
      characterClass: 'モンスター',
      level: 1,
      experience: 0,
      baseStats: {
        strength: 8,
        dexterity: 14,
        constitution: 10,
        intelligence: 10,
        wisdom: 8,
        charisma: 8,
      },
      derivedStats: {
        hitPoints: 7,
        maxHitPoints: 7,
        magicPoints: 0,
        maxMagicPoints: 0,
        armorClass: 15,
        initiative: 2,
        speed: 30,
      },
      enemyData: {
        category: 'minion',
        challengeRating: 0.25,
        encounterLevel: 1,
        combat: {
          tactics: ['群れで攻撃', '弱い敵を狙う', '不利なら逃げる'],
          specialAbilities: [
            {
              name: 'こそこそ移動',
              description: '隠密行動にボーナス+6',
              cooldown: 0,
              cost: 0,
              type: 'passive',
            },
          ],
          weaknesses: ['明るい光'],
          resistances: [],
          immunities: [],
          aiCombatBehavior: {
            autonomyLevel: 'autonomous' as const,
            aggression: 6,
            intelligence: 4,
            teamwork: 8,
            preservation: 7,
            preferredTargets: ['weakest', 'closest'],
            combatDialogue: {
              battle_start: ['ギャー！', '襲え！'],
              taking_damage: ['ぎゃっ！', '痛い！'],
              dealing_damage: ['やったぞ！', 'ざまぁ！'],
              low_health: ['やばい...', '逃げろ！'],
              victory: ['勝った！', 'ひゃっほー！'],
              defeat: ['ぐああ...', '死んだ...'],
            },
            tacticalDecisions: {
              retreat_threshold: 30,
              ability_usage_strategy: 'conservative' as const,
              positioning_preference: 'flanking' as const,
              focus_fire: true,
            },
          },
        },
        encounter: {
          environment: ['洞窟', '森', '廃墟'],
          companions: [],
          tactics: '数で圧倒する',
          escapeThreshold: 50,
          morale: 7,
        },
        loot: {
          experience: 50,
          currency: 10,
          items: [
            {
              itemId: 'short-sword',
              dropRate: 0.5,
              quantity: 1,
            },
          ],
        },
      },
    };
  }

  // 汎用モックキャラクター作成
  createMockCharacter(campaignId: string, characterType: 'PC' | 'NPC' | 'Enemy' = 'PC'): Character {
    switch (characterType) {
    case 'PC':
      return this.createMockPC(campaignId) as Character;
    case 'NPC':
      return this.createMockNPC(campaignId) as Character;
    case 'Enemy':
      return this.createMockEnemy(campaignId) as Character;
    default:
      return this.createMockPC(campaignId) as Character;
    }
  }
}

export const characterAPI = new CharacterAPI();