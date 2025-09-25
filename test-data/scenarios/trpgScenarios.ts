/**
 * 包括的なTRPGテストシナリオ
 * t-WADA命名規則: trpgScenarios.ts
 * 本番型定義（@ai-agent-trpg/types）を使用
 * 
 * 用途: E2Eテスト、統合テスト、現実的なTRPGセッション流れのテスト
 */

import { 
  TRPGCampaign, 
  TRPGCharacter, 
  NPCCharacter, 
  EnemyCharacter,
  TRPGSession,
  TRPGEvent,
  Quest,
  Location,
  ChatMessage,
  DiceRoll
} from '@ai-agent-trpg/types';

import { CampaignFactory } from '../factories/CampaignFactory';
import { PCCharacterFactory, NPCCharacterFactory, EnemyCharacterFactory, PartyFactory } from '../factories/CharacterFactory';
import { SessionFactory, EventFactory, ChatMessageFactory, DiceRollFactory } from '../factories/SessionFactory';

// ===================================
// シナリオ1: 初心者向け村救済クエスト
// ===================================

export interface BeginnerVillageScenario {
  campaign: TRPGCampaign;
  party: {
    tank: TRPGCharacter;
    healer: TRPGCharacter;
    dps: TRPGCharacter;
    utility: TRPGCharacter;
  };
  npcs: NPCCharacter[];
  enemies: EnemyCharacter[];
  locations: Location[];
  quest: Quest;
  sessions: TRPGSession[];
  events: TRPGEvent[];
  sampleChatMessages: ChatMessage[];
  sampleDiceRolls: DiceRoll[];
}

export function createBeginnerVillageScenario(): BeginnerVillageScenario {
  // キャンペーン作成
  const campaign = CampaignFactory.createBeginner()
    .withId('scenario-beginner-village')
    .withTitle('緑丘村の危機')
    .withDescription('平和な村を脅かすゴブリンを討伐する初心者向けキャンペーン')
    .withGM('gm-master-001')
    .withLocation('location-greenhill-village')
    .withTimeline('timeline-village-crisis')
    .asActive()
    .build();

  // パーティ作成
  const party = PartyFactory.createBalancedParty(campaign.id);

  // 村のNPC作成
  const npcs = [
    NPCCharacterFactory.createMayor()
      .withId('npc-mayor-theodor')
      .withName('村長テオドール')
      .withCampaign(campaign.id)
      .withLocation('location-greenhill-village')
      .withQuests(['quest-goblin-threat'])
      .build(),
    
    NPCCharacterFactory.createMerchant()
      .withId('npc-merchant-marga')
      .withName('商人マルガ')
      .withCampaign(campaign.id)
      .withLocation('location-greenhill-village')
      .build(),
    
    NPCCharacterFactory.createGuard()
      .withId('npc-guard-garen')
      .withName('衛兵ガレン')
      .withCampaign(campaign.id)
      .withLocation('location-greenhill-village')
      .build()
  ];

  // ゴブリンの群れ作成
  const enemies = PartyFactory.createGoblinWarband(campaign.id, 'location-dark-forest');

  // 場所データ
  const locations: Location[] = [
    {
      id: 'location-greenhill-village',
      name: '緑丘村',
      description: '平和な農村。最近ゴブリンの襲撃に悩まされている。',
      type: 'settlement',
      parentLocationId: undefined,
      childLocationIds: ['location-village-square', 'location-village-inn'],
      coordinates: { x: 0, y: 0 },
      climate: 'temperate',
      terrain: ['plains', 'farmland'],
      npcs: npcs.map(npc => npc.id),
      items: ['village-key', 'old-map'],
      events: ['event-village-meeting'],
      isDiscovered: true,
      firstVisitDate: '2024-01-01T00:00:00Z',
      visitCount: 1,
      tags: ['safe', 'starting_area'],
      imageUrl: 'https://example.com/greenhill-village.jpg'
    },
    {
      id: 'location-dark-forest',
      name: '暗黒の森',
      description: '村の北にある深い森。ゴブリンの巣窟があると噂されている。',
      type: 'wilderness',
      parentLocationId: 'location-greenhill-village',
      childLocationIds: ['location-goblin-cave'],
      coordinates: { x: 0, y: 5 },
      climate: 'temperate',
      terrain: ['forest', 'dense_woods'],
      npcs: [],
      items: ['forest-herbs', 'ancient-stones'],
      events: ['event-goblin-ambush'],
      isDiscovered: false,
      visitCount: 0,
      tags: ['dangerous', 'wilderness']
    }
  ];

  // クエスト
  const quest: Quest = {
    id: 'quest-goblin-threat',
    campaignId: campaign.id,
    title: 'ゴブリンの脅威',
    description: '村を脅かすゴブリンの群れを討伐し、村に平和を取り戻せ',
    status: 'active',
    priority: 'high',
    objectives: [
      {
        id: 'obj-investigate-attacks',
        description: 'ゴブリンの襲撃について調査する',
        completed: true,
        required: true
      },
      {
        id: 'obj-find-goblin-lair',
        description: 'ゴブリンの巣窟を発見する',
        completed: true,
        required: true
      },
      {
        id: 'obj-defeat-goblin-leader',
        description: 'ゴブリンのリーダーを倒す',
        completed: false,
        required: true
      },
      {
        id: 'obj-return-to-village',
        description: '村に戻って報告する',
        completed: false,
        required: true
      }
    ],
    rewards: {
      experience: 500,
      gold: 200,
      items: ['silver-sword', 'healing-potion-greater', 'village-hero-medal']
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-22T21:30:00Z'
  };

  // セッション履歴
  const sessions = [
    SessionFactory.createCompleted()
      .withId('session-village-arrival')
      .withCampaign(campaign.id)
      .withName('第1回：村への到着')
      .withDescription('冒険者たちが緑丘村に到着し、村の問題を知る')
      .withSessionNumber(1)
      .withPlayers(Object.values(party).map(char => char.playerId!))
      .withCharacters(Object.values(party).map(char => char.id))
      .withGM('gm-master-001')
      .build(),
    
    SessionFactory.createCompleted()
      .withId('session-forest-exploration')
      .withCampaign(campaign.id)
      .withName('第2回：森の探索')
      .withDescription('暗黒の森でゴブリンの痕跡を発見')
      .withSessionNumber(2)
      .withPlayers(Object.values(party).map(char => char.playerId!))
      .withCharacters(Object.values(party).map(char => char.id))
      .withGM('gm-master-001')
      .build(),
    
    SessionFactory.createActive()
      .withId('session-goblin-lair-assault')
      .withCampaign(campaign.id)
      .withName('第3回：ゴブリンの巣窟攻略')
      .withDescription('ついに発見したゴブリンの巣窟に突入')
      .withSessionNumber(3)
      .withPlayers(Object.values(party).map(char => char.playerId!))
      .withCharacters(Object.values(party).map(char => char.id))
      .withGM('gm-master-001')
      .withCurrentEvent('event-final-boss-battle')
      .build()
  ];

  // イベント履歴
  const events = [
    EventFactory.createSocial()
      .withId('event-village-meeting')
      .withTitle('村長との面談')
      .withDescription('村長テオドールから村の問題について説明を受ける')
      .withLocation('location-greenhill-village')
      .withParticipants([party.tank.id, party.healer.id, party.dps.id, party.utility.id, 'npc-mayor-theodor'])
      .withOutcomes({
        success: true,
        experience: 50,
        rewards: ['村の信頼', 'クエスト情報'],
        consequences: [],
        storyImpact: ['村との関係確立']
      })
      .build(),
    
    EventFactory.createExploration()
      .withId('event-forest-investigation')
      .withTitle('森の調査')
      .withDescription('暗黒の森でゴブリンの痕跡を発見')
      .withLocation('location-dark-forest')
      .withParticipants([party.tank.id, party.utility.id])
      .withOutcomes({
        success: true,
        experience: 100,
        rewards: ['ゴブリンの足跡', '巣窟の手がかり'],
        consequences: [],
        storyImpact: ['ゴブリンの巣窟発見']
      })
      .build(),
    
    EventFactory.createCombat()
      .withId('event-final-boss-battle')
      .withTitle('ゴブリンリーダーとの決戦')
      .withDescription('ゴブリンの巣窟でリーダーと配下たちとの最終決戦')
      .withLocation('location-goblin-cave')
      .withParticipants([
        ...Object.values(party).map(char => char.id),
        ...enemies.map(enemy => enemy.id)
      ])
      .withDifficulty('hard')
      .withChallengeRating(5)
      .build()
  ];

  // サンプルチャットメッセージ
  const sampleChatMessages = [
    ChatMessageFactory.createSystemMessage('セッション開始：ゴブリンの巣窟攻略'),
    ChatMessageFactory.createGMMessage('gm-master-001', 'GMマスター', '洞窟の入り口は薄暗く、奥からかすかにゴブリンの声が聞こえます。'),
    ChatMessageFactory.createPlayerMessage(party.tank.playerId!, party.tank.name, '慎重に進みたいと思います。先頭を歩きます。'),
    ChatMessageFactory.createPlayerMessage(party.utility.playerId!, party.utility.name, '罠がないか調べてみます。'),
    ChatMessageFactory.createPlayerMessage(party.dps.playerId!, party.dps.name, 'ディテクトマジックを唱えて魔法的な罠を調べます。'),
    ChatMessageFactory.createPlayerMessage(party.healer.playerId!, party.healer.name, '皆さんに加護を与えておきますね。')
  ];

  // サンプルダイスロール
  const sampleDiceRolls = [
    DiceRollFactory.createSkillCheck(party.utility.playerId!, party.utility.name, 5, 15), // 罠探知
    DiceRollFactory.createAttack(party.tank.playerId!, party.tank.name, 5), // 攻撃ロール
    DiceRollFactory.createDamage(party.tank.playerId!, party.tank.name, 1, 8, 3), // ダメージロール
    DiceRollFactory.createSkillCheck(party.dps.playerId!, party.dps.name, 8, 12) // 呪文判定
  ];

  return {
    campaign,
    party,
    npcs,
    enemies,
    locations,
    quest,
    sessions,
    events,
    sampleChatMessages,
    sampleDiceRolls
  };
}

// ===================================
// シナリオ2: 中級者向け政治陰謀
// ===================================

export interface PoliticalIntrigueScenario {
  campaign: TRPGCampaign;
  characters: TRPGCharacter[];
  nobles: NPCCharacter[];
  spies: NPCCharacter[];
  locations: Location[];
  quests: Quest[];
  sessions: TRPGSession[];
  events: TRPGEvent[];
}

export function createPoliticalIntrigueScenario(): PoliticalIntrigueScenario {
  const campaign = CampaignFactory.createPolitical()
    .withId('scenario-political-intrigue')
    .withTitle('王都の陰謀')
    .withDescription('王国の首都で繰り広げられる政治的陰謀と権力闘争')
    .withGM('gm-politics-expert')
    .withLocation('location-royal-capital')
    .asActive()
    .build();

  // 高レベルパーティ
  const characters = [
    PCCharacterFactory.createFighter()
      .withId('char-noble-knight')
      .withName('サー・アリスタン')
      .withLevel(8)
      .withBackground('noble')
      .withCampaign(campaign.id)
      .withPlayer('player-knight')
      .build(),
    
    PCCharacterFactory.createRogue()
      .withId('char-spy-master')
      .withName('シャドウ')
      .withLevel(8)
      .withBackground('spy')
      .withCampaign(campaign.id)
      .withPlayer('player-spy')
      .build(),
    
    PCCharacterFactory.createWizard()
      .withId('char-court-mage')
      .withName('アルケイン')
      .withLevel(8)
      .withBackground('court_scholar')
      .withCampaign(campaign.id)
      .withPlayer('player-mage')
      .build()
  ];

  // 貴族NPCs
  const nobles = [
    NPCCharacterFactory.create()
      .withId('npc-duke-ravencrest')
      .withName('レイヴンクレスト公爵')
      .withCampaign(campaign.id)
      .withRole('questGiver')
      .withDisposition('neutral')
      .withFaction('house_ravencrest')
      .withOccupation('duke')
      .build(),
    
    NPCCharacterFactory.create()
      .withId('npc-countess-silvermoon')
      .withName('シルバームーン伯爵夫人')
      .withCampaign(campaign.id)
      .withRole('ally')
      .withDisposition('friendly')
      .withFaction('house_silvermoon')
      .withOccupation('countess')
      .build()
  ];

  // スパイNPCs
  const spies = [
    NPCCharacterFactory.create()
      .withId('npc-master-informant')
      .withName('情報商ヴィクター')
      .withCampaign(campaign.id)
      .withRole('informant')
      .withDisposition('neutral')
      .withFaction('information_brokers')
      .withOccupation('spy_master')
      .build()
  ];

  // 政治的場所
  const locations: Location[] = [
    {
      id: 'location-royal-capital',
      name: '王都シルヴァースパイア',
      description: '王国の首都。政治と陰謀の中心地。',
      type: 'settlement',
      parentLocationId: undefined,
      childLocationIds: ['location-royal-palace', 'location-noble-district'],
      coordinates: { x: 0, y: 0 },
      climate: 'temperate',
      terrain: ['urban', 'fortified'],
      npcs: [...nobles.map(n => n.id), ...spies.map(s => s.id)],
      items: ['royal-seal', 'encrypted-documents'],
      events: ['event-royal-court'],
      isDiscovered: true,
      firstVisitDate: '2024-01-01T00:00:00Z',
      visitCount: 10,
      tags: ['capital', 'political', 'intrigue']
    }
  ];

  // 政治クエスト
  const quests: Quest[] = [
    {
      id: 'quest-succession-crisis',
      campaignId: campaign.id,
      title: '王位継承の危機',
      description: '王の後継者を巡る陰謀を解明し、王国の安定を保て',
      status: 'active',
      priority: 'high',
      objectives: [
        {
          id: 'obj-gather-intelligence',
          description: '各貴族家の動向を調査する',
          completed: true,
          required: true
        },
        {
          id: 'obj-uncover-conspiracy',
          description: '陰謀の首謀者を特定する',
          completed: false,
          required: true
        },
        {
          id: 'obj-prevent-assassination',
          description: '王子暗殺計画を阻止する',
          completed: false,
          required: true
        }
      ],
      rewards: {
        experience: 2000,
        gold: 5000,
        items: ['royal-favor', 'noble-title', 'political-influence']
      },
      createdAt: '2023-10-15T00:00:00Z',
      updatedAt: '2024-01-25T22:15:00Z'
    }
  ];

  const sessions = [
    SessionFactory.createSocial()
      .withId('session-court-intrigue')
      .withCampaign(campaign.id)
      .withName('宮廷での駆け引き')
      .withDescription('王宮での政治的交渉と情報収集')
      .withSessionNumber(7)
      .build()
  ];

  const events = [
    EventFactory.createSocial()
      .withId('event-royal-court')
      .withTitle('王宮謁見')
      .withDescription('王との謁見で重要な政治的決定に関与')
      .withDifficulty('extreme')
      .withChallengeRating(8)
      .build()
  ];

  return {
    campaign,
    characters,
    nobles,
    spies,
    locations,
    quests,
    sessions,
    events
  };
}

// ===================================
// シナリオ3: ワンショット・ホラー
// ===================================

export interface HorrorOneshotScenario {
  campaign: TRPGCampaign;
  investigators: TRPGCharacter[];
  mansion: Location;
  ghostly_npcs: NPCCharacter[];
  horrors: EnemyCharacter[];
  session: TRPGSession;
  events: TRPGEvent[];
  chatLog: ChatMessage[];
}

export function createHorrorOneshotScenario(): HorrorOneshotScenario {
  const campaign = CampaignFactory.createHorror()
    .withId('scenario-cursed-mansion')
    .withTitle('呪われた館の一夜')
    .withDescription('雨の夜、調査員たちは古い館で恐怖の一夜を過ごす')
    .withSessionDuration(360) // 6時間ワンショット
    .asPreparing()
    .build();

  // 調査員キャラクター（プリジェン）
  const investigators = [
    PCCharacterFactory.create()
      .withId('char-detective')
      .withName('探偵ホームズ')
      .withClass('investigator')
      .withBackground('detective')
      .withCampaign(campaign.id)
      .withPlayer('player-detective')
      .build(),
    
    PCCharacterFactory.create()
      .withId('char-scholar')
      .withName('学者ミラ')
      .withClass('scholar')
      .withBackground('researcher')
      .withCampaign(campaign.id)
      .withPlayer('player-scholar')
      .build(),
    
    PCCharacterFactory.create()
      .withId('char-soldier')
      .withName('元兵士ジェイク')
      .withClass('fighter')
      .withBackground('soldier')
      .withCampaign(campaign.id)
      .withPlayer('player-soldier')
      .build(),
    
    PCCharacterFactory.create()
      .withId('char-mystic')
      .withName('霊媒師エマ')
      .withClass('oracle')
      .withBackground('mystic')
      .withCampaign(campaign.id)
      .withPlayer('player-mystic')
      .build()
  ];

  // 呪われた館
  const mansion: Location = {
    id: 'location-blackwood-mansion',
    name: 'ブラックウッド館',
    description: '100年前に一家が謎の死を遂げた古い洋館。今も霊が徘徊すると噂される。',
    type: 'building',
    parentLocationId: undefined,
    childLocationIds: [
      'location-mansion-foyer',
      'location-mansion-library',
      'location-mansion-master-bedroom',
      'location-mansion-basement'
    ],
    coordinates: { x: 0, y: 0 },
    climate: 'temperate',
    terrain: ['building', 'haunted'],
    npcs: ['npc-ghost-lady', 'npc-butler-spirit'],
    items: ['old-diary', 'cursed-mirror', 'family-portrait'],
    events: ['event-midnight-manifestation'],
    isDiscovered: true,
    firstVisitDate: '2024-01-26T00:00:00Z',
    visitCount: 1,
    tags: ['haunted', 'dangerous', 'mystery', 'oneshot']
  };

  // 霊的存在
  const ghostly_npcs = [
    NPCCharacterFactory.create()
      .withId('npc-ghost-lady')
      .withName('レディ・ブラックウッドの霊')
      .withCampaign(campaign.id)
      .withLocation('location-blackwood-mansion')
      .withRole('questGiver')
      .withDisposition('unknown')
      .withFaction('undead')
      .build(),
    
    NPCCharacterFactory.create()
      .withId('npc-butler-spirit')
      .withName('執事の霊魂')
      .withCampaign(campaign.id)
      .withLocation('location-blackwood-mansion')
      .withRole('informant')
      .withDisposition('hostile')
      .withFaction('undead')
      .build()
  ];

  // 恐怖の存在
  const horrors = [
    EnemyCharacterFactory.create()
      .withId('enemy-shadow-wraith')
      .withName('影の怨霊')
      .withRace('undead')
      .withClass('wraith')
      .withChallengeRating(5)
      .withCombatRole('controller')
      .withCampaign(campaign.id)
      .withLocation('location-blackwood-mansion')
      .build(),
    
    EnemyCharacterFactory.create()
      .withId('enemy-cursed-doll')
      .withName('呪いの人形')
      .withRace('construct')
      .withClass('animated_object')
      .withChallengeRating(3)
      .withCombatRole('striker')
      .withCampaign(campaign.id)
      .withLocation('location-blackwood-mansion')
      .build()
  ];

  // ワンショットセッション
  const session = SessionFactory.createOneshot()
    .withId('session-haunted-night')
    .withCampaign(campaign.id)
    .withName('呪われた館の一夜')
    .withDescription('嵐の夜、調査員たちは古い館で一夜を過ごすことになる')
    .withPlayers(investigators.map(char => char.playerId!))
    .withCharacters(investigators.map(char => char.id))
    .build();

  // ホラーイベント
  const events = [
    EventFactory.create()
      .withId('event-arrival-at-mansion')
      .withTitle('館への到着')
      .withDescription('嵐で車が故障し、調査員たちは古い館に避難する')
      .withType('story')
      .withDuration(15)
      .build(),
    
    EventFactory.create()
      .withId('event-midnight-manifestation')
      .withTitle('真夜中の怪奇現象')
      .withDescription('12時の鐘と共に館で超常現象が発生する')
      .withType('puzzle')
      .withDifficulty('extreme')
      .withDuration(60)
      .build(),
    
    EventFactory.create()
      .withId('event-final-revelation')
      .withTitle('真実の暴露')
      .withDescription('100年前の悲劇の真相が明らかになる')
      .withType('story')
      .withDuration(30)
      .build()
  ];

  // ホラー系チャットログ
  const chatLog = [
    ChatMessageFactory.createSystemMessage('ワンショット開始：呪われた館の一夜'),
    ChatMessageFactory.createGMMessage('gm-horror-master', 'ホラーマスター', '嵐の音が激しく、館の古い木材がきしむ音が響いています...'),
    ChatMessageFactory.createPlayerMessage('player-detective', '探偵ホームズ', 'この館に何か違和感を感じます。注意深く調べてみましょう。'),
    ChatMessageFactory.createPlayerMessage('player-mystic', '霊媒師エマ', 'ここには強い霊的なエネルギーを感じます...悪意のある存在がいるようです。'),
    ChatMessageFactory.createSystemMessage('突然、館の時計が12時を打ち鳴らした...'),
    ChatMessageFactory.createGMMessage('gm-horror-master', 'ホラーマスター', '鏡に映った影が、あなたたちとは違う動きをしているのに気づきます。')
  ];

  return {
    campaign,
    investigators,
    mansion,
    ghostly_npcs,
    horrors,
    session,
    events,
    chatLog
  };
}

// ===================================
// 完全統合シナリオ（AAA パターン対応）
// ===================================

export interface FullIntegrationScenario {
  // Arrange - テストデータの準備
  testData: {
    campaign: TRPGCampaign;
    characters: (TRPGCharacter | NPCCharacter | EnemyCharacter)[];
    sessions: TRPGSession[];
    events: TRPGEvent[];
    chatMessages: ChatMessage[];
    diceRolls: DiceRoll[];
  };
  
  // Act - 実行する操作のシナリオ
  actionScenarios: {
    characterCreation: () => TRPGCharacter;
    sessionStart: () => TRPGSession;
    combatRound: () => DiceRoll[];
    questCompletion: () => Quest;
  };
  
  // Assert - 期待される結果
  expectedOutcomes: {
    campaignProgression: string[];
    characterGrowth: Record<string, number>;
    sessionResults: Record<string, boolean>;
    storyProgression: string[];
  };
}

export function createFullIntegrationScenario(): FullIntegrationScenario {
  const scenario = createBeginnerVillageScenario();
  
  return {
    testData: {
      campaign: scenario.campaign,
      characters: [
        ...Object.values(scenario.party),
        ...scenario.npcs,
        ...scenario.enemies
      ],
      sessions: scenario.sessions,
      events: scenario.events,
      chatMessages: scenario.sampleChatMessages,
      diceRolls: scenario.sampleDiceRolls
    },
    
    actionScenarios: {
      characterCreation: () => PCCharacterFactory.createFighter()
        .withCampaign(scenario.campaign.id)
        .withName('新規キャラクター')
        .build(),
      
      sessionStart: () => SessionFactory.createActive()
        .withCampaign(scenario.campaign.id)
        .withName('新規セッション')
        .build(),
      
      combatRound: () => [
        DiceRollFactory.createAttack('player-1', 'プレイヤー1', 5),
        DiceRollFactory.createDamage('player-1', 'プレイヤー1', 1, 8, 3)
      ],
      
      questCompletion: () => ({
        ...scenario.quest,
        status: 'completed' as const,
        objectives: scenario.quest.objectives.map(obj => ({
          ...obj,
          completed: true
        }))
      })
    },
    
    expectedOutcomes: {
      campaignProgression: [
        '村での問題発見',
        '森の探索完了',
        'ゴブリンの巣窟発見',
        'ボス戦勝利',
        'クエスト完了'
      ],
      characterGrowth: {
        [scenario.party.tank.id]: 4, // レベルアップ
        [scenario.party.healer.id]: 4,
        [scenario.party.dps.id]: 4,
        [scenario.party.utility.id]: 4
      },
      sessionResults: {
        'session-village-arrival': true,
        'session-forest-exploration': true,
        'session-goblin-lair-assault': true
      },
      storyProgression: [
        '冒険者たちの村到着',
        'ゴブリン問題の発覚',
        '森での痕跡発見',
        '巣窟突入',
        '平和の回復'
      ]
    }
  };
}

// ===================================
// エクスポート
// ===================================

export const TRPGScenarios = {
  beginnerVillage: createBeginnerVillageScenario,
  politicalIntrigue: createPoliticalIntrigueScenario,
  horrorOneshot: createHorrorOneshotScenario,
  fullIntegration: createFullIntegrationScenario
};