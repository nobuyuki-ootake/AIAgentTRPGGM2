"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEntityRelationshipGraph = exports.isAIConditionExpression = exports.isAIIntegratedEntity = exports.isPoolQuest = exports.isPoolItem = exports.isPoolNPC = exports.isInteractiveEvent = exports.isPoolEnemy = exports.SESSION_DURATION_PRESETS = exports.DAY_PERIODS_4_ACTIONS = exports.DAY_PERIODS_3_ACTIONS = exports.DEFAULT_DERIVED_STATS = exports.DEFAULT_BASE_STATS = exports.DIFFICULTY_LEVELS = exports.EVENT_TYPES = exports.QUEST_STATUSES = exports.CAMPAIGN_STATUSES = exports.SESSION_STATUSES = exports.CHARACTER_TYPES = exports.isEnemyCharacter = exports.isNPCCharacter = exports.isTRPGCharacter = void 0;
function isTRPGCharacter(character) {
    return character.characterType === 'PC';
}
exports.isTRPGCharacter = isTRPGCharacter;
function isNPCCharacter(character) {
    return character.characterType === 'NPC';
}
exports.isNPCCharacter = isNPCCharacter;
function isEnemyCharacter(character) {
    return character.characterType === 'Enemy';
}
exports.isEnemyCharacter = isEnemyCharacter;
exports.CHARACTER_TYPES = ['PC', 'NPC', 'Enemy'];
exports.SESSION_STATUSES = ['preparing', 'active', 'paused', 'completed', 'cancelled'];
exports.CAMPAIGN_STATUSES = ['planning', 'active', 'on_hold', 'completed', 'cancelled'];
exports.QUEST_STATUSES = ['not_started', 'active', 'completed', 'failed', 'cancelled'];
exports.EVENT_TYPES = ['story', 'combat', 'social', 'exploration', 'puzzle', 'rest'];
exports.DIFFICULTY_LEVELS = ['trivial', 'easy', 'medium', 'hard', 'extreme'];
exports.DEFAULT_BASE_STATS = {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
};
exports.DEFAULT_DERIVED_STATS = {
    hitPoints: 20,
    maxHitPoints: 20,
    magicPoints: 10,
    maxMagicPoints: 10,
    armorClass: 10,
    initiative: 0,
    speed: 30,
};
exports.DAY_PERIODS_3_ACTIONS = [
    { id: 'morning', name: '朝', description: '1日の始まり。情報収集や準備に適した時間', order: 0, icon: 'morning' },
    { id: 'day', name: '昼', description: 'メインの活動時間。探索や調査、戦闘など', order: 1, icon: 'day' },
    { id: 'night', name: '夜', description: '1日の終わり。休息や振り返りの時間', order: 2, icon: 'night' }
];
exports.DAY_PERIODS_4_ACTIONS = [
    { id: 'morning', name: '朝', description: '1日の始まり。情報収集や準備に適した時間', order: 0, icon: 'morning' },
    { id: 'day', name: '昼', description: 'メインの活動時間。探索や調査など', order: 1, icon: 'day' },
    { id: 'evening', name: '夕方', description: '社交や情報交換に適した時間', order: 2, icon: 'evening' },
    { id: 'night', name: '夜', description: '1日の終わり。休息や振り返りの時間', order: 3, icon: 'night' }
];
exports.SESSION_DURATION_PRESETS = {
    short: {
        type: 'short',
        totalDays: 3,
        actionsPerDay: 3,
        dayPeriods: exports.DAY_PERIODS_3_ACTIONS,
        estimatedPlayTime: 30,
        milestoneCount: 1,
        description: '短時間プレイ: 3日間、日単位分割数3回、1つの最終マイルストーン、約30分'
    },
    medium: {
        type: 'medium',
        totalDays: 7,
        actionsPerDay: 4,
        dayPeriods: exports.DAY_PERIODS_4_ACTIONS,
        estimatedPlayTime: 70,
        milestoneCount: 3,
        description: '中時間プレイ: 7日間、日単位分割数4回、3つのマイルストーン（中間2つ）、約70分'
    },
    long: {
        type: 'long',
        totalDays: 11,
        actionsPerDay: 4,
        dayPeriods: exports.DAY_PERIODS_4_ACTIONS,
        estimatedPlayTime: 120,
        milestoneCount: 5,
        description: '長時間プレイ: 11日間、日単位分割数4回、5つのマイルストーン（中間3つ、最終条件分岐）、約2時間'
    },
    custom: {
        type: 'custom',
        totalDays: 5,
        actionsPerDay: 3,
        dayPeriods: exports.DAY_PERIODS_3_ACTIONS,
        estimatedPlayTime: 60,
        milestoneCount: 2,
        description: 'カスタム設定: 自由に設定可能'
    }
};
function isPoolEnemy(entity) {
    return entity && typeof entity.isMilestoneTarget === 'boolean' && entity.abilities;
}
exports.isPoolEnemy = isPoolEnemy;
function isInteractiveEvent(entity) {
    return entity && Array.isArray(entity.choices) && Array.isArray(entity.locationIds);
}
exports.isInteractiveEvent = isInteractiveEvent;
function isPoolNPC(entity) {
    return entity && entity.personality && Array.isArray(entity.dialoguePatterns);
}
exports.isPoolNPC = isPoolNPC;
function isPoolItem(entity) {
    return entity && Array.isArray(entity.acquisitionMethods) && typeof entity.isMilestoneTarget === 'boolean';
}
exports.isPoolItem = isPoolItem;
function isPoolQuest(entity) {
    return entity && Array.isArray(entity.objectives) && typeof entity.isMilestoneTarget === 'boolean';
}
exports.isPoolQuest = isPoolQuest;
function isAIIntegratedEntity(entity) {
    return entity && entity.aiProcessor && entity.aiContext;
}
exports.isAIIntegratedEntity = isAIIntegratedEntity;
function isAIConditionExpression(obj) {
    return obj && typeof obj.expression === 'string' && Array.isArray(obj.variables);
}
exports.isAIConditionExpression = isAIConditionExpression;
function isEntityRelationshipGraph(obj) {
    return obj && Array.isArray(obj.nodes) && Array.isArray(obj.edges);
}
exports.isEntityRelationshipGraph = isEntityRelationshipGraph;
//# sourceMappingURL=index.js.map