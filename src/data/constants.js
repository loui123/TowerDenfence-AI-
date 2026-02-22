export const RESOURCES = {
  ENERGY: 'energy',
  RED_CRYSTAL: 'red_crystal',
  GREEN_GEM: 'green_gem',
  BLUE_CRYSTAL: 'blue_crystal',
  GOLD_ORE: 'gold_ore',
};

export const MONSTER_TYPES = {
  NORMAL: { id: 'normal', name: '普通', resource: RESOURCES.ENERGY, color: '#aaaaaa' },
  FIRE: { id: 'fire', name: '火', resource: RESOURCES.RED_CRYSTAL, color: '#ff4444' },
  WATER: { id: 'water', name: '水', resource: RESOURCES.BLUE_CRYSTAL, color: '#4444ff' },
  WOOD: { id: 'wood', name: '木', resource: RESOURCES.GREEN_GEM, color: '#44aa44' },
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
  },
  SUPPORT: {
    id: 'support',
    name: '輔助塔',
    cost: 100,
    stats: { damage: 0, range: 1, speed: 0, crit: 0, type: 'support' },
    color: '#46D1C4'
  }
};

export const TALENTS = {
  // 關卡設定
  INITIAL_GOLD: { id: 'initial_gold', name: '初始金幣', costType: RESOURCES.ENERGY, baseCost: 10, perLevel: 50 },
  PLAYER_MAX_HP: { id: 'player_max_hp', name: '提升玩家最大生命', costType: RESOURCES.ENERGY, baseCost: 25, perLevel: 1 },
  ITEM_DROP_RATE: { id: 'item_drop_rate', name: '增加道具掉落機率', costType: RESOURCES.ENERGY, baseCost: 25, perLevel: 0.1 },
  MOB_HP_DROP: { id: 'mob_hp_drop', name: '增加怪物血量與資源掉落', costType: RESOURCES.GOLD_ORE, baseCost: 10, perLevel: 0.3, dropPerLevel: 0.1 },
  MOB_DENSITY: { id: 'mob_density', name: '增加怪物密集度', costType: RESOURCES.GOLD_ORE, baseCost: 20, perLevel: 1 },

  // 近戰塔特性（紅水晶）
  MELEE_TOWER_DMG_BASE: { id: 'melee_tower_dmg_base', name: '增加塔基礎傷害', costType: RESOURCES.RED_CRYSTAL, baseCost: 10, perLevel: 1 },
  MELEE_TOWER_ATTR_DMG: { id: 'melee_tower_attr_dmg', name: '增加塔屬性傷害', costType: RESOURCES.RED_CRYSTAL, baseCost: 15, perLevel: 0.1 },
  MELEE_TOWER_CRIT_CHANCE: { id: 'melee_tower_crit_chance', name: '增加暴擊機率', costType: RESOURCES.RED_CRYSTAL, baseCost: 20, perLevel: 0.05 },
  MELEE_TOWER_ATK_SPEED: { id: 'melee_tower_atk_speed', name: '增加塔攻擊速度', costType: RESOURCES.RED_CRYSTAL, baseCost: 10, perLevel: 0.05 },
  MELEE_TOWER_RANGE: { id: 'melee_tower_range', name: '增加塔攻擊距離', costType: RESOURCES.RED_CRYSTAL, baseCost: 10, perLevel: 0.5 },

  // 遠程塔特性（綠寶石）
  RANGE_TOWER_DMG_BASE: { id: 'range_tower_dmg_base', name: '增加塔基礎傷害', costType: RESOURCES.GREEN_GEM, baseCost: 10, perLevel: 1 },
  RANGE_TOWER_ATTR_DMG: { id: 'range_tower_attr_dmg', name: '增加塔屬性傷害', costType: RESOURCES.GREEN_GEM, baseCost: 15, perLevel: 0.1 },
  RANGE_TOWER_ATK_SPEED: { id: 'range_tower_atk_speed', name: '增加塔攻擊速度', costType: RESOURCES.GREEN_GEM, baseCost: 10, perLevel: 0.05 },
  RANGE_TOWER_CRIT_CHANCE: { id: 'range_tower_crit_chance', name: '增加暴擊機率', costType: RESOURCES.GREEN_GEM, baseCost: 20, perLevel: 0.05 },
  RANGE_TOWER_CHAIN: { id: 'range_tower_chain', name: '增加投射物連鎖次數', costType: RESOURCES.GREEN_GEM, baseCost: 40, perLevel: 1 },
  RANGE_TOWER_PROJ_COUNT: { id: 'range_tower_proj_count', name: '增加攻擊數量', costType: RESOURCES.GREEN_GEM, baseCost: 50, perLevel: 1 },
  RANGE_TOWER_RANGE: { id: 'range_tower_range', name: '增加塔攻擊距離', costType: RESOURCES.GREEN_GEM, baseCost: 10, perLevel: 0.5 },

  // 法術塔特性（藍水晶）
  SPELL_TOWER_DMG_BASE: { id: 'spell_tower_dmg_base', name: '增加塔基礎傷害', costType: RESOURCES.BLUE_CRYSTAL, baseCost: 10, perLevel: 1 },
  SPELL_TOWER_ATK_SPEED: { id: 'spell_tower_atk_speed', name: '增加塔攻擊速度', costType: RESOURCES.BLUE_CRYSTAL, baseCost: 10, perLevel: 0.05 },
  SPELL_TOWER_RANGE: { id: 'spell_tower_range', name: '增加塔攻擊距離', costType: RESOURCES.BLUE_CRYSTAL, baseCost: 10, perLevel: 0.5 },
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
