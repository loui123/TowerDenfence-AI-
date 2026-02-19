export const RESOURCES = {
  ENERGY: 'energy',
  WOOD: 'wood',
  ORE: 'ore',
  WATER: 'water',
};

export const MONSTER_TYPES = {
  NORMAL: { id: 'normal', name: '普通', resource: RESOURCES.ENERGY, color: '#aaaaaa' },
  FIRE: { id: 'fire', name: '火', resource: RESOURCES.ORE, color: '#ff4444' },
  WATER: { id: 'water', name: '水', resource: RESOURCES.WATER, color: '#4444ff' },
  WOOD: { id: 'wood', name: '木', resource: RESOURCES.WOOD, color: '#44aa44' },
};

export const TOWER_TYPES = {
  MELEE: {
    id: 'melee',
    name: '近戰塔',
    cost: 100,
    stats: { damage: 15, range: 2, speed: 0.85, crit: 0.2, type: 'melee' },
    color: '#8B4513'
  },
  PROJECTILE: {
    id: 'projectile',
    name: '弓箭塔',
    cost: 100,
    stats: { damage: 10, range: 6, speed: 0.5, crit: 0, type: 'projectile' },
    color: '#FFD700'
  },
  MELEE_AOE: {
    id: 'projectile_slow',
    name: '緩速塔',
    cost: 100,
    stats: { damage: 6, range: 4, speed: 0.6, crit: 0, type: 'projectile', aoe: true, slowAura: true },
    color: '#A0522D'
  },
  PROJECTILE_AOE: {
    id: 'projectile_aoe',
    name: '砲擊塔',
    cost: 100,
    stats: { damage: 14, range: 4, speed: 0.5, crit: 0, type: 'projectile', aoe: true },
    color: '#2F4F4F'
  },
  MAGIC: {
    id: 'magic',
    name: '法術塔',
    cost: 100,
    stats: { damage: 8, range: 12, speed: 0.3, crit: 0, type: 'magic' },
    color: '#9C6BFF'
  }
};

export const TALENTS = {
  // Player stats
  INITIAL_GOLD: { id: 'initial_gold', name: '初始金幣', costType: RESOURCES.ENERGY, baseCost: 10, perLevel: 50 },
  PLAYER_MAX_HP: { id: 'player_max_hp', name: '提升玩家最大生命', costType: RESOURCES.WATER, baseCost: 25, perLevel: 1 },

  // Tower stats
  TOWER_DMG_BASE: { id: 'tower_dmg_base', name: '增加塔基礎傷害', costType: RESOURCES.ORE, baseCost: 10, perLevel: 1 },
  TOWER_ATTR_DMG: { id: 'tower_attr_dmg', name: '增加塔屬性傷害', costType: RESOURCES.ORE, baseCost: 15, perLevel: 0.1 },
  TOWER_ATK_SPEED: { id: 'tower_atk_speed', name: '增加塔攻擊速度', costType: RESOURCES.WOOD, baseCost: 10, perLevel: 0.05 },
  TOWER_RANGE: { id: 'tower_range', name: '增加塔攻擊距離', costType: RESOURCES.WOOD, baseCost: 10, perLevel: 0.5 },
  TOWER_AOE_RANGE: { id: 'tower_aoe_range', name: '增加範圍效果距離', costType: RESOURCES.WATER, baseCost: 15, perLevel: 0.5 },
  TOWER_PROJ_COUNT: { id: 'tower_proj_count', name: '增加攻擊數量', costType: RESOURCES.WOOD, baseCost: 50, perLevel: 1 },
  TOWER_CRIT_CHANCE: { id: 'tower_crit_chance', name: '增加暴擊機率', costType: RESOURCES.ORE, baseCost: 20, perLevel: 0.05 },
  TOWER_CHAIN: { id: 'tower_chain', name: '增加投射物連鎖次數', costType: RESOURCES.WATER, baseCost: 40, perLevel: 1 },

  // Level stats
  MOB_HP_DROP: { id: 'mob_hp_drop', name: '增加怪物血量與資源掉落', costType: RESOURCES.ENERGY, baseCost: 10, perLevel: 0.3, dropPerLevel: 0.1 },
  MOB_DENSITY: { id: 'mob_density', name: '增加怪物密集度', costType: RESOURCES.ENERGY, baseCost: 20, perLevel: 1 },
  GAME_SPEED: { id: 'game_speed', name: '增加遊戲速度', costType: RESOURCES.WATER, baseCost: 35, perLevel: 0.25, maxLevel: 4 },
};

export const WAVE_CONFIG = [
  { type: 'normal', count: 15 },
  { type: 'normal', count: 15 },
  { type: 'wood', count: 15 },
  { type: 'wood', count: 15 },
  { type: 'fire', count: 15 },
  { type: 'fire', count: 15 },
  { type: 'water', count: 15 },
  { type: 'water', count: 15 },
  { type: 'normal', count: 30 },
  { type: 'fire', count: 30 },
];
