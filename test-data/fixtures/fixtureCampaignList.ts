/**
 * フィクスチャ: 現実的なキャンペーンリスト
 * t-WADA命名規則: fixtureCampaignList.ts
 * 本番型定義（@ai-agent-trpg/types）を使用
 * 
 * 用途: E2Eテスト、UI表示確認、実際のTRPGシナリオテスト
 */

import { TRPGCampaign } from '@ai-agent-trpg/types';

// 初心者向けキャンペーン: 村を救う典型的な冒険
export const fixtureBeginnerCampaign: TRPGCampaign = {
  id: 'fixture-campaign-beginner',
  title: '失われた村の秘密',
  description: '平和だった村に突然現れた謎の霧。村人たちが次々と姿を消し、冒険者たちは真相を突き止めなければならない。D&D5eの典型的な1-3レベル向けアドベンチャー。',
  gameSystem: 'D&D5e',
  status: 'active',
  
  // GM設定
  gmId: 'gm-veteran-001',
  
  // プレイヤー構成（4人パーティ）
  playerIds: [
    'player-tank-main',
    'player-healer-support', 
    'player-dps-ranged',
    'player-utility-rogue'
  ],
  characterIds: [
    'char-fighter-human',
    'char-cleric-dwarf',
    'char-wizard-elf',
    'char-rogue-halfling'
  ],
  
  // 進行状況
  currentLocationId: 'location-village-greenhill',
  currentTimelineId: 'timeline-village-mystery',
  currentSessionId: 'session-investigation-003',
  
  // キャンペーン設定
  settings: {
    aiAssistanceLevel: 'standard',
    difficultyLevel: 'normal',
    sessionDuration: 180, // 3時間セッション
    maxPlayers: 4,
    useVoiceChat: true,
    allowPlayerActions: true,
    customRules: {
      inspirationPoints: true,
      criticalFailures: false,
      flanking: true,
      healingPotionBonus: false
    }
  },
  
  // タイムスタンプ（キャンペーン開始から3週間経過）
  createdAt: '2024-01-01T19:00:00Z',
  updatedAt: '2024-01-22T21:30:00Z',
  lastSessionDate: '2024-01-20T19:00:00Z'
};

// 中級者向けキャンペーン: 政治的陰謀を含む複雑なストーリー
export const fixtureIntermediateCampaign: TRPGCampaign = {
  id: 'fixture-campaign-intermediate',
  title: '王都の陰謀 ～裏切りの刃～',
  description: '王国の首都で起きる政治的陰謀。表向きは平和な王都だが、裏では貴族間の権力争いが激化。プレイヤーは様々な勢力の間で選択を迫られる。5-8レベル向けの政治・社交重視アドベンチャー。',
  gameSystem: 'D&D5e',
  status: 'active',
  
  gmId: 'gm-veteran-002',
  
  // 6人パーティ（大規模セッション）
  playerIds: [
    'player-paladin-leader',
    'player-sorcerer-damage',
    'player-ranger-tracker',
    'player-bard-social',
    'player-warlock-mysterious',
    'player-monk-stealth'
  ],
  characterIds: [
    'char-paladin-dragonborn',
    'char-sorcerer-tiefling',
    'char-ranger-wood-elf',
    'char-bard-human-noble',
    'char-warlock-half-elf',
    'char-monk-variant-human'
  ],
  
  currentLocationId: 'location-capital-silverspire',
  currentTimelineId: 'timeline-court-intrigue',
  currentSessionId: 'session-noble-meeting-007',
  
  settings: {
    aiAssistanceLevel: 'advanced',
    difficultyLevel: 'hard',
    sessionDuration: 240, // 4時間セッション
    maxPlayers: 6,
    useVoiceChat: true,
    allowPlayerActions: true,
    customRules: {
      socialCombat: true,
      reputationSystem: true,
      politicalInfluence: true,
      extendedRests: true
    }
  },
  
  createdAt: '2023-10-15T18:00:00Z',
  updatedAt: '2024-01-25T22:15:00Z',
  lastSessionDate: '2024-01-23T18:00:00Z'
};

// 上級者向けキャンペーン: ハイレベル・世界規模の脅威
export const fixtureAdvancedCampaign: TRPGCampaign = {
  id: 'fixture-campaign-advanced',
  title: '終末の預言者 ～世界を統べる者～',
  description: '古代の封印が解かれ、世界を滅ぼす力を持つ存在が復活しようとしている。15-20レベルのエピックアドベンチャー。プレイヤーは伝説の英雄として、世界そのものの運命を背負う。',
  gameSystem: 'D&D5e',
  status: 'active',
  
  gmId: 'gm-master-001',
  
  // 5人の伝説的英雄
  playerIds: [
    'player-champion-legendary',
    'player-archmage-ancient',
    'player-saint-divine',
    'player-shadowmaster-void',
    'player-warden-nature'
  ],
  characterIds: [
    'char-fighter-champion-20',
    'char-wizard-archmage-19',
    'char-cleric-saint-18',
    'char-rogue-shadowdancer-20',
    'char-druid-archdruid-19'
  ],
  
  currentLocationId: 'location-planar-nexus',
  currentTimelineId: 'timeline-apocalypse-prevention',
  currentSessionId: 'session-final-battle-012',
  
  settings: {
    aiAssistanceLevel: 'expert',
    difficultyLevel: 'extreme',
    sessionDuration: 300, // 5時間エピックセッション
    maxPlayers: 5,
    useVoiceChat: true,
    allowPlayerActions: true,
    customRules: {
      epicBoons: true,
      legendaryItems: true,
      planarTravel: true,
      deityIntervention: true,
      massiveScale: true
    }
  },
  
  createdAt: '2023-06-01T19:00:00Z',
  updatedAt: '2024-01-26T23:45:00Z',
  lastSessionDate: '2024-01-24T19:00:00Z'
};

// 一回完結型キャンペーン: ワンショット
export const fixtureOneshotCampaign: TRPGCampaign = {
  id: 'fixture-campaign-oneshot',
  title: '呪われた館の一夜',
  description: '雨の夜、旅人たちは古い館に避難する。しかし、その館には恐ろしい秘密が隠されていた。4-6時間で完結するホラー系ワンショットアドベンチャー。',
  gameSystem: 'D&D5e',
  status: 'preparing',
  
  gmId: 'gm-oneshot-specialist',
  
  // プリジェネキャラクター使用
  playerIds: [
    'player-temp-001',
    'player-temp-002',
    'player-temp-003',
    'player-temp-004'
  ],
  characterIds: [
    'char-pregen-investigator',
    'char-pregen-scholar',
    'char-pregen-soldier',
    'char-pregen-mystic'
  ],
  
  currentLocationId: 'location-mansion-cursed',
  currentTimelineId: 'timeline-oneshot-horror',
  
  settings: {
    aiAssistanceLevel: 'standard',
    difficultyLevel: 'normal',
    sessionDuration: 360, // 6時間ワンショット
    maxPlayers: 4,
    useVoiceChat: false, // テキストベース
    allowPlayerActions: true,
    customRules: {
      sanitySystem: true,
      fearEffects: true,
      timeLimit: true,
      pregenCharacters: true
    }
  },
  
  createdAt: '2024-01-25T15:00:00Z',
  updatedAt: '2024-01-25T15:00:00Z'
};

// 完了済みキャンペーン: 成功例
export const fixtureCompletedCampaign: TRPGCampaign = {
  id: 'fixture-campaign-completed',
  title: 'ドラゴンロードの逆襲 ～完結編～',
  description: '1年間に渡って展開された壮大な冒険の物語。プレイヤーたちは1レベルから15レベルまで成長し、ついにドラゴンロードを倒して世界に平和をもたらした。',
  gameSystem: 'D&D5e',
  status: 'completed',
  
  gmId: 'gm-veteran-001',
  
  playerIds: [
    'player-veteran-alpha',
    'player-veteran-beta',
    'player-veteran-gamma',
    'player-veteran-delta'
  ],
  characterIds: [
    'char-hero-final-fighter',
    'char-hero-final-wizard',
    'char-hero-final-rogue',
    'char-hero-final-cleric'
  ],
  
  currentLocationId: 'location-dragon-throne',
  currentTimelineId: 'timeline-dragon-war',
  
  settings: {
    aiAssistanceLevel: 'standard',
    difficultyLevel: 'hard',
    sessionDuration: 210, // 3.5時間セッション
    maxPlayers: 4,
    useVoiceChat: true,
    allowPlayerActions: true,
    customRules: {
      heroicActions: true,
      epicMoments: true,
      storyMilestones: true
    }
  },
  
  createdAt: '2023-01-15T18:00:00Z',
  updatedAt: '2024-01-15T22:30:00Z',
  completedAt: '2024-01-15T22:30:00Z',
  lastSessionDate: '2024-01-15T18:00:00Z'
};

// テスト用キャンペーンリスト
export const fixtureCampaignList: TRPGCampaign[] = [
  fixtureBeginnerCampaign,
  fixtureIntermediateCampaign,
  fixtureAdvancedCampaign,
  fixtureOneshotCampaign,
  fixtureCompletedCampaign
];

// ステータス別キャンペーンリスト
export const fixtureActiveCampaigns: TRPGCampaign[] = 
  fixtureCampaignList.filter(campaign => campaign.status === 'active');

export const fixturePreparingCampaigns: TRPGCampaign[] = 
  fixtureCampaignList.filter(campaign => campaign.status === 'preparing');

export const fixtureCompletedCampaigns: TRPGCampaign[] = 
  fixtureCampaignList.filter(campaign => campaign.status === 'completed');

// 難易度別キャンペーンリスト
export const fixtureBeginnerCampaigns: TRPGCampaign[] = 
  fixtureCampaignList.filter(campaign => campaign.settings.difficultyLevel === 'normal');

export const fixtureAdvancedCampaigns: TRPGCampaign[] = 
  fixtureCampaignList.filter(campaign => 
    campaign.settings.difficultyLevel === 'hard' || 
    campaign.settings.difficultyLevel === 'extreme'
  );