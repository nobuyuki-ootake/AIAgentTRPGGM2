/**
 * ファクトリ: キャラクターデータ生成器
 * t-WADA命名規則: CharacterFactory.ts
 * 本番型定義（@ai-agent-trpg/types）を使用
 * 
 * 用途: PC/NPC/Enemyキャラクターの動的生成、バランスの取れたパーティ編成
 */

import { 
  TRPGCharacter, 
  NPCCharacter, 
  EnemyCharacter,
  BaseStats,
  DerivedStats,
  Equipment,
  Skill,
  Feat,
  DEFAULT_BASE_STATS,
  DEFAULT_DERIVED_STATS
} from '@ai-agent-trpg/types';

// ===================================
// キャラクタータイプ別ファクトリ基底クラス
// ===================================

abstract class BaseCharacterFactory<T> {
  protected character: Partial<T> = {};
  protected static instanceCounter = 0;

  constructor() {
    this.reset();
  }

  // 共通メソッド
  withId(id: string): this {
    (this.character as any).id = id;
    return this;
  }

  withName(name: string): this {
    (this.character as any).name = name;
    return this;
  }

  withDescription(description: string): this {
    (this.character as any).description = description;
    return this;
  }

  withAge(age: number): this {
    (this.character as any).age = age;
    return this;
  }

  withRace(race: string): this {
    (this.character as any).race = race;
    return this;
  }

  withClass(characterClass: string): this {
    (this.character as any).characterClass = characterClass;
    return this;
  }

  withLevel(level: number): this {
    (this.character as any).level = level;
    return this;
  }

  withExperience(experience: number): this {
    (this.character as any).experience = experience;
    return this;
  }

  withAppearance(appearance: string): this {
    (this.character as any).appearance = appearance;
    return this;
  }

  withBaseStats(stats: Partial<BaseStats>): this {
    (this.character as any).baseStats = { ...DEFAULT_BASE_STATS, ...stats };
    return this;
  }

  withDerivedStats(stats: Partial<DerivedStats>): this {
    (this.character as any).derivedStats = { ...DEFAULT_DERIVED_STATS, ...stats };
    return this;
  }

  withCampaign(campaignId: string): this {
    (this.character as any).campaignId = campaignId;
    return this;
  }

  withLocation(locationId: string): this {
    (this.character as any).currentLocationId = locationId;
    return this;
  }

  abstract build(): T;
  abstract reset(): this;
}

// ===================================
// PCキャラクターファクトリ
// ===================================

export class PCCharacterFactory extends BaseCharacterFactory<TRPGCharacter> {
  withBackground(background: string): PCCharacterFactory {
    (this.character as any).background = background;
    return this;
  }

  withPlayer(playerId: string): PCCharacterFactory {
    (this.character as any).playerId = playerId;
    return this;
  }

  withPersonality(traits: string[], ideals: string[], bonds: string[], flaws: string[]): PCCharacterFactory {
    (this.character as any).personalityTraits = [...traits];
    (this.character as any).ideals = [...ideals];
    (this.character as any).bonds = [...bonds];
    (this.character as any).flaws = [...flaws];
    return this;
  }

  withEquipment(equipment: Equipment[]): PCCharacterFactory {
    (this.character as any).equipment = [...equipment];
    return this;
  }

  addEquipment(equipment: Equipment): PCCharacterFactory {
    if (!(this.character as any).equipment) {
      (this.character as any).equipment = [];
    }
    (this.character as any).equipment.push(equipment);
    return this;
  }

  withSkills(skills: Skill[]): PCCharacterFactory {
    (this.character as any).skills = [...skills];
    return this;
  }

  addSkill(skill: Skill): PCCharacterFactory {
    if (!(this.character as any).skills) {
      (this.character as any).skills = [];
    }
    (this.character as any).skills.push(skill);
    return this;
  }

  // プリセットキャラクター
  asFighter(): PCCharacterFactory {
    return this
      .withClass('fighter')
      .withBackground('soldier')
      .withBaseStats({
        strength: 16,
        dexterity: 12,
        constitution: 15,
        intelligence: 10,
        wisdom: 13,
        charisma: 14
      })
      .withDerivedStats({
        hitPoints: 34,
        maxHitPoints: 34,
        armorClass: 18,
        initiative: 1,
        speed: 30
      })
      .withPersonality(
        ['勇敢', '責任感が強い'],
        ['正義', '守護'],
        ['仲間への忠誠'],
        ['時として無謀']
      );
  }

  asWizard(): PCCharacterFactory {
    return this
      .withClass('wizard')
      .withBackground('sage')
      .withBaseStats({
        strength: 8,
        dexterity: 14,
        constitution: 12,
        intelligence: 16,
        wisdom: 13,
        charisma: 11
      })
      .withDerivedStats({
        hitPoints: 20,
        maxHitPoints: 20,
        magicPoints: 12,
        maxMagicPoints: 12,
        armorClass: 12,
        initiative: 2,
        speed: 30
      })
      .withPersonality(
        ['好奇心旺盛', '理論的'],
        ['知識', '真理の探求'],
        ['古代の書物'],
        ['実戦経験不足']
      );
  }

  asCleric(): PCCharacterFactory {
    return this
      .withClass('cleric')
      .withBackground('acolyte')
      .withBaseStats({
        strength: 13,
        dexterity: 10,
        constitution: 14,
        intelligence: 12,
        wisdom: 16,
        charisma: 11
      })
      .withDerivedStats({
        hitPoints: 26,
        maxHitPoints: 26,
        magicPoints: 8,
        maxMagicPoints: 8,
        armorClass: 15,
        initiative: 0,
        speed: 30
      })
      .withPersonality(
        ['慈悲深い', '忍耐強い'],
        ['慈悲', '奉仕'],
        ['神殿への信仰'],
        ['やや頑固']
      );
  }

  asRogue(): PCCharacterFactory {
    return this
      .withClass('rogue')
      .withBackground('criminal')
      .withBaseStats({
        strength: 10,
        dexterity: 16,
        constitution: 13,
        intelligence: 14,
        wisdom: 12,
        charisma: 11
      })
      .withDerivedStats({
        hitPoints: 24,
        maxHitPoints: 24,
        armorClass: 14,
        initiative: 3,
        speed: 30
      })
      .withPersonality(
        ['楽観的', '機敏'],
        ['自由', '効率性'],
        ['盗賊ギルドの仲間'],
        ['財宝への欲望']
      );
  }

  build(): TRPGCharacter {
    const character: TRPGCharacter = {
      id: (this.character as any).id || `factory-pc-${++BaseCharacterFactory.instanceCounter}`,
      name: (this.character as any).name || 'ファクトリPC',
      description: (this.character as any).description || 'ファクトリで生成されたPCキャラクター',
      characterType: 'PC',
      
      age: (this.character as any).age || 25,
      race: (this.character as any).race || 'human',
      characterClass: (this.character as any).characterClass || 'fighter',
      background: (this.character as any).background || 'folk_hero',
      playerId: (this.character as any).playerId,
      
      appearance: (this.character as any).appearance || 'ファクトリで生成された外見',
      
      baseStats: (this.character as any).baseStats || DEFAULT_BASE_STATS,
      derivedStats: (this.character as any).derivedStats || DEFAULT_DERIVED_STATS,
      
      level: (this.character as any).level || 1,
      experience: (this.character as any).experience || 0,
      
      skills: (this.character as any).skills || [],
      feats: (this.character as any).feats || [],
      equipment: (this.character as any).equipment || [],
      statusEffects: (this.character as any).statusEffects || [],
      
      currentLocationId: (this.character as any).currentLocationId,
      
      personalityTraits: (this.character as any).personalityTraits || ['ファクトリ生成'],
      ideals: (this.character as any).ideals || ['テスト'],
      bonds: (this.character as any).bonds || ['ファクトリ'],
      flaws: (this.character as any).flaws || ['仮の設定'],
      
      createdAt: (this.character as any).createdAt || new Date().toISOString(),
      updatedAt: (this.character as any).updatedAt || new Date().toISOString(),
      campaignId: (this.character as any).campaignId || 'factory-campaign'
    };

    return character;
  }

  reset(): PCCharacterFactory {
    this.character = {};
    return this;
  }

  static create(): PCCharacterFactory {
    return new PCCharacterFactory();
  }

  static createFighter(): PCCharacterFactory {
    return new PCCharacterFactory().asFighter();
  }

  static createWizard(): PCCharacterFactory {
    return new PCCharacterFactory().asWizard();
  }

  static createCleric(): PCCharacterFactory {
    return new PCCharacterFactory().asCleric();
  }

  static createRogue(): PCCharacterFactory {
    return new PCCharacterFactory().asRogue();
  }
}

// ===================================
// NPCキャラクターファクトリ
// ===================================

export class NPCCharacterFactory extends BaseCharacterFactory<NPCCharacter> {
  withRole(role: 'questGiver' | 'merchant' | 'ally' | 'neutral' | 'informant' | 'guard'): NPCCharacterFactory {
    (this.character as any).role = role;
    return this;
  }

  withDisposition(disposition: 'friendly' | 'neutral' | 'hostile' | 'unknown'): NPCCharacterFactory {
    (this.character as any).disposition = disposition;
    return this;
  }

  withFaction(faction: string): NPCCharacterFactory {
    (this.character as any).faction = faction;
    return this;
  }

  withOccupation(occupation: string): NPCCharacterFactory {
    (this.character as any).occupation = occupation;
    return this;
  }

  withDialogue(patterns: any[]): NPCCharacterFactory {
    (this.character as any).dialoguePatterns = [...patterns];
    return this;
  }

  withQuests(questIds: string[]): NPCCharacterFactory {
    (this.character as any).questIds = [...questIds];
    return this;
  }

  // プリセットNPC
  asMayor(): NPCCharacterFactory {
    return this
      .withClass('commoner')
      .withRole('questGiver')
      .withDisposition('friendly')
      .withOccupation('mayor')
      .withFaction('villagers')
      .withAge(55)
      .withDialogue([{
        trigger: 'greeting',
        response: 'こんにちは、冒険者の皆さん！',
        conditions: [],
        outcomes: []
      }]);
  }

  asMerchant(): NPCCharacterFactory {
    return this
      .withClass('commoner')
      .withRole('merchant')
      .withDisposition('neutral')
      .withOccupation('merchant')
      .withFaction('merchants_guild')
      .withAge(35)
      .withDialogue([{
        trigger: 'greeting',
        response: 'いらっしゃいませ！何かお探しですか？',
        conditions: [],
        outcomes: []
      }]);
  }

  asGuard(): NPCCharacterFactory {
    return this
      .withClass('fighter')
      .withRole('guard')
      .withDisposition('neutral')
      .withOccupation('guard')
      .withFaction('city_watch')
      .withAge(30)
      .withBaseStats({
        strength: 14,
        dexterity: 12,
        constitution: 14,
        intelligence: 10,
        wisdom: 12,
        charisma: 10
      })
      .withDialogue([{
        trigger: 'greeting',
        response: '止まれ！ここで何をしている？',
        conditions: [],
        outcomes: []
      }]);
  }

  build(): NPCCharacter {
    const character: NPCCharacter = {
      id: (this.character as any).id || `factory-npc-${++BaseCharacterFactory.instanceCounter}`,
      name: (this.character as any).name || 'ファクトリNPC',
      description: (this.character as any).description || 'ファクトリで生成されたNPCキャラクター',
      characterType: 'NPC',
      
      age: (this.character as any).age || 35,
      race: (this.character as any).race || 'human',
      characterClass: (this.character as any).characterClass || 'commoner',
      
      appearance: (this.character as any).appearance || 'ファクトリで生成されたNPCの外見',
      
      baseStats: (this.character as any).baseStats || DEFAULT_BASE_STATS,
      derivedStats: (this.character as any).derivedStats || DEFAULT_DERIVED_STATS,
      
      level: (this.character as any).level || 1,
      experience: (this.character as any).experience || 0,
      
      skills: (this.character as any).skills || [],
      feats: (this.character as any).feats || [],
      equipment: (this.character as any).equipment || [],
      statusEffects: (this.character as any).statusEffects || [],
      
      currentLocationId: (this.character as any).currentLocationId,
      
      faction: (this.character as any).faction,
      occupation: (this.character as any).occupation,
      
      role: (this.character as any).role || 'neutral',
      disposition: (this.character as any).disposition || 'friendly',
      
      dialoguePatterns: (this.character as any).dialoguePatterns || [],
      questIds: (this.character as any).questIds || [],
      behaviorTags: (this.character as any).behaviorTags || ['factory-generated'],
      
      npcData: {
        importance: 'minor',
        disposition: (this.character as any).disposition || 'friendly',
        occupation: (this.character as any).occupation || 'commoner',
        location: (this.character as any).currentLocationId || 'unknown',
        aiPersonality: {
          traits: ['factory-generated'],
          speechPattern: 'normal'
        }
      },
      
      createdAt: (this.character as any).createdAt || new Date().toISOString(),
      updatedAt: (this.character as any).updatedAt || new Date().toISOString(),
      campaignId: (this.character as any).campaignId || 'factory-campaign'
    };

    return character;
  }

  reset(): NPCCharacterFactory {
    this.character = {};
    return this;
  }

  static create(): NPCCharacterFactory {
    return new NPCCharacterFactory();
  }

  static createMayor(): NPCCharacterFactory {
    return new NPCCharacterFactory().asMayor();
  }

  static createMerchant(): NPCCharacterFactory {
    return new NPCCharacterFactory().asMerchant();
  }

  static createGuard(): NPCCharacterFactory {
    return new NPCCharacterFactory().asGuard();
  }
}

// ===================================
// Enemyキャラクターファクトリ
// ===================================

export class EnemyCharacterFactory extends BaseCharacterFactory<EnemyCharacter> {
  withChallengeRating(cr: number): EnemyCharacterFactory {
    (this.character as any).challengeRating = cr;
    return this;
  }

  withCombatRole(role: 'tank' | 'damage' | 'support' | 'controller' | 'striker'): EnemyCharacterFactory {
    (this.character as any).combatRole = role;
    return this;
  }

  withTactics(tactics: string[]): EnemyCharacterFactory {
    (this.character as any).combatTactics = [...tactics];
    return this;
  }

  withEnvironment(environments: string[]): EnemyCharacterFactory {
    (this.character as any).environment = [...environments];
    return this;
  }

  withGroupSize(min: number, max: number): EnemyCharacterFactory {
    (this.character as any).groupSize = { min, max };
    return this;
  }

  // プリセット敵
  asGoblin(): EnemyCharacterFactory {
    return this
      .withRace('goblin')
      .withClass('warrior')
      .withChallengeRating(0.25)
      .withCombatRole('striker')
      .withBaseStats({
        strength: 8,
        dexterity: 14,
        constitution: 10,
        intelligence: 10,
        wisdom: 8,
        charisma: 8
      })
      .withDerivedStats({
        hitPoints: 7,
        maxHitPoints: 7,
        armorClass: 15,
        initiative: 2,
        speed: 30
      })
      .withTactics(['群れで攻撃', '有利な位置取り'])
      .withEnvironment(['forest', 'caves'])
      .withGroupSize(2, 6);
  }

  asOrc(): EnemyCharacterFactory {
    return this
      .withRace('orc')
      .withClass('barbarian')
      .withChallengeRating(1)
      .withCombatRole('tank')
      .withBaseStats({
        strength: 16,
        dexterity: 12,
        constitution: 16,
        intelligence: 7,
        wisdom: 11,
        charisma: 10
      })
      .withDerivedStats({
        hitPoints: 15,
        maxHitPoints: 15,
        armorClass: 13,
        initiative: 1,
        speed: 30
      })
      .withTactics(['正面攻撃', '怒りの突撃'])
      .withEnvironment(['mountains', 'plains'])
      .withGroupSize(1, 3);
  }

  asDragon(): EnemyCharacterFactory {
    return this
      .withRace('dragon')
      .withClass('sorcerer')
      .withChallengeRating(8)
      .withCombatRole('controller')
      .withLevel(10)
      .withBaseStats({
        strength: 22,
        dexterity: 10,
        constitution: 21,
        intelligence: 14,
        wisdom: 13,
        charisma: 17
      })
      .withDerivedStats({
        hitPoints: 152,
        maxHitPoints: 152,
        magicPoints: 20,
        maxMagicPoints: 20,
        armorClass: 18,
        initiative: 0,
        speed: 40
      })
      .withTactics(['空中戦', 'ブレス攻撃', '恐怖効果'])
      .withEnvironment(['mountains', 'lair'])
      .withGroupSize(1, 1);
  }

  build(): EnemyCharacter {
    const character: EnemyCharacter = {
      id: (this.character as any).id || `factory-enemy-${++BaseCharacterFactory.instanceCounter}`,
      name: (this.character as any).name || 'ファクトリエネミー',
      description: (this.character as any).description || 'ファクトリで生成された敵キャラクター',
      characterType: 'Enemy',
      
      race: (this.character as any).race || 'humanoid',
      characterClass: (this.character as any).characterClass || 'warrior',
      
      appearance: (this.character as any).appearance || 'ファクトリで生成された敵の外見',
      
      baseStats: (this.character as any).baseStats || DEFAULT_BASE_STATS,
      derivedStats: (this.character as any).derivedStats || DEFAULT_DERIVED_STATS,
      
      level: (this.character as any).level || 1,
      experience: (this.character as any).experience || 0,
      
      skills: (this.character as any).skills || [],
      feats: (this.character as any).feats || [],
      equipment: (this.character as any).equipment || [],
      statusEffects: (this.character as any).statusEffects || [],
      
      currentLocationId: (this.character as any).currentLocationId,
      
      challengeRating: (this.character as any).challengeRating || 1,
      specialAbilities: (this.character as any).specialAbilities || [],
      legendaryActions: (this.character as any).legendaryActions || [],
      
      combatTactics: (this.character as any).combatTactics || ['基本攻撃'],
      combatRole: (this.character as any).combatRole || 'striker',
      
      environment: (this.character as any).environment || ['any'],
      groupSize: (this.character as any).groupSize || { min: 1, max: 1 },
      treasureIds: (this.character as any).treasureIds || [],
      
      enemyData: {
        category: 'humanoid',
        challengeRating: (this.character as any).challengeRating || 1,
        encounterLevel: (this.character as any).level || 1,
        combat: {
          tactics: 'basic',
          preferred_range: 'melee'
        },
        encounter: {
          environment: (this.character as any).environment || ['any']
        },
        loot: {
          coins: '1d4 gold',
          items: ['common equipment']
        }
      },
      
      createdAt: (this.character as any).createdAt || new Date().toISOString(),
      updatedAt: (this.character as any).updatedAt || new Date().toISOString(),
      campaignId: (this.character as any).campaignId || 'factory-campaign'
    };

    return character;
  }

  reset(): EnemyCharacterFactory {
    this.character = {};
    return this;
  }

  static create(): EnemyCharacterFactory {
    return new EnemyCharacterFactory();
  }

  static createGoblin(): EnemyCharacterFactory {
    return new EnemyCharacterFactory().asGoblin();
  }

  static createOrc(): EnemyCharacterFactory {
    return new EnemyCharacterFactory().asOrc();
  }

  static createDragon(): EnemyCharacterFactory {
    return new EnemyCharacterFactory().asDragon();
  }
}

// ===================================
// パーティファクトリ（複数キャラクター生成）
// ===================================

export class PartyFactory {
  static createBalancedParty(campaignId: string): {
    tank: TRPGCharacter;
    healer: TRPGCharacter;
    dps: TRPGCharacter;
    utility: TRPGCharacter;
  } {
    const tank = PCCharacterFactory.createFighter()
      .withCampaign(campaignId)
      .withName('パーティタンク')
      .withPlayer('party-player-tank')
      .build();

    const healer = PCCharacterFactory.createCleric()
      .withCampaign(campaignId)
      .withName('パーティヒーラー')
      .withPlayer('party-player-healer')
      .build();

    const dps = PCCharacterFactory.createWizard()
      .withCampaign(campaignId)
      .withName('パーティDPS')
      .withPlayer('party-player-dps')
      .build();

    const utility = PCCharacterFactory.createRogue()
      .withCampaign(campaignId)
      .withName('パーティユーティリティ')
      .withPlayer('party-player-utility')
      .build();

    return { tank, healer, dps, utility };
  }

  static createVillageNPCs(campaignId: string, locationId: string): NPCCharacter[] {
    return [
      NPCCharacterFactory.createMayor()
        .withCampaign(campaignId)
        .withLocation(locationId)
        .withName('村長テオドール')
        .build(),
      
      NPCCharacterFactory.createMerchant()
        .withCampaign(campaignId)
        .withLocation(locationId)
        .withName('商人マルガ')
        .build(),
      
      NPCCharacterFactory.createGuard()
        .withCampaign(campaignId)
        .withLocation(locationId)
        .withName('衛兵ガレン')
        .build()
    ];
  }

  static createGoblinWarband(campaignId: string, locationId: string): EnemyCharacter[] {
    const leader = EnemyCharacterFactory.createOrc()
      .withCampaign(campaignId)
      .withLocation(locationId)
      .withName('ゴブリンリーダー')
      .withChallengeRating(2)
      .build();

    const goblins = Array.from({ length: 4 }, (_, i) =>
      EnemyCharacterFactory.createGoblin()
        .withCampaign(campaignId)
        .withLocation(locationId)
        .withName(`ゴブリン戦士${i + 1}`)
        .build()
    );

    return [leader, ...goblins];
  }
}

// ===================================
// エクスポート
// ===================================

export { PCCharacterFactory, NPCCharacterFactory, EnemyCharacterFactory, PartyFactory };
export default { PCCharacterFactory, NPCCharacterFactory, EnemyCharacterFactory, PartyFactory };