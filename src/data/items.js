export const ITEM_TYPES = {
    CONSUMABLE: 'consumable',
    EQUIPMENT: 'equipment'
};

export const ITEM_DEFS = {
    level_book: {
        id: 'level_book',
        name: '經驗之書',
        type: ITEM_TYPES.CONSUMABLE,
        description: '立即讓塔升級 1 次（滿級塔無法使用）。',
        icon: 'Lv',
        source: 'water'
    },
    speed_book: {
        id: 'speed_book',
        name: '速度之書',
        type: ITEM_TYPES.CONSUMABLE,
        description: '塔的攻擊速度 +10%。',
        icon: '速',
        source: 'wood'
    },
    power_book: {
        id: 'power_book',
        name: '力量之書',
        type: ITEM_TYPES.CONSUMABLE,
        description: '塔的傷害 +10%。',
        icon: '力',
        source: 'fire'
    },
    crit_book: {
        id: 'crit_book',
        name: '暴擊之書',
        type: ITEM_TYPES.CONSUMABLE,
        description: '塔的暴擊率 +10%（最高 100%）。',
        icon: '暴',
        source: 'all'
    },
    build_book: {
        id: 'build_book',
        name: '建設之書',
        type: ITEM_TYPES.CONSUMABLE,
        description: '本局可建造塔上限 +1。',
        icon: '建',
        source: 'boss'
    },
    lubricant: {
        id: 'lubricant',
        name: '潤滑油',
        type: ITEM_TYPES.EQUIPMENT,
        description: '裝備後，該塔基礎攻速改為 1（仍可受天賦與靈氣影響）。',
        icon: '潤',
        source: 'all'
    },
    full_firepower: {
        id: 'full_firepower',
        name: '火力全開',
        type: ITEM_TYPES.EQUIPMENT,
        description: '裝備後，該塔基礎攻擊力改為 40（仍可受天賦與靈氣影響）。',
        icon: '火',
        source: 'all'
    },
    absorption_force: {
        id: 'absorption_force',
        name: '吸收之力',
        type: ITEM_TYPES.EQUIPMENT,
        description: '每擊殺一隻怪物，該塔基礎攻擊力 +1。',
        icon: '吸',
        source: 'talent'
    },
    chain_lightning: {
        id: 'chain_lightning',
        name: '連鎖雷擊',
        type: ITEM_TYPES.EQUIPMENT,
        description: '攻擊命中時，對同目標追加連鎖雷擊（20 傷害，10% 機率麻痺 1 秒）。',
        icon: '雷',
        source: 'all'
    },
    courage_banner: {
        id: 'courage_banner',
        name: '勇氣戰旗',
        type: ITEM_TYPES.EQUIPMENT,
        description: '附近 3 格友方塔暴擊率 +25%。',
        icon: '勇',
        source: 'all'
    },
    slaughter_banner: {
        id: 'slaughter_banner',
        name: '殺戮戰旗',
        type: ITEM_TYPES.EQUIPMENT,
        description: '附近 3 格友方塔暴擊傷害 +40%。',
        icon: '殺',
        source: 'all'
    },
    agility_banner: {
        id: 'agility_banner',
        name: '敏捷戰旗',
        type: ITEM_TYPES.EQUIPMENT,
        description: '附近 3 格友方塔攻速 +10%。',
        icon: '敏',
        source: 'all'
    }
};

export const MONSTER_ITEM_DROP_TABLE = {
    fire: [
        { itemId: 'power_book', chance: 0.02 },
        { itemId: 'lubricant', chance: 0.004 },
        { itemId: 'full_firepower', chance: 0.004 },
        { itemId: 'chain_lightning', chance: 0.002 },
        { itemId: 'courage_banner', chance: 0.002 },
        { itemId: 'slaughter_banner', chance: 0.002 },
        { itemId: 'agility_banner', chance: 0.002 }
    ],
    water: [
        { itemId: 'level_book', chance: 0.01 },
        { itemId: 'lubricant', chance: 0.004 },
        { itemId: 'full_firepower', chance: 0.004 },
        { itemId: 'chain_lightning', chance: 0.002 },
        { itemId: 'courage_banner', chance: 0.002 },
        { itemId: 'slaughter_banner', chance: 0.002 },
        { itemId: 'agility_banner', chance: 0.002 }
    ],
    wood: [
        { itemId: 'speed_book', chance: 0.01 },
        { itemId: 'lubricant', chance: 0.004 },
        { itemId: 'full_firepower', chance: 0.004 },
        { itemId: 'chain_lightning', chance: 0.002 },
        { itemId: 'courage_banner', chance: 0.002 },
        { itemId: 'slaughter_banner', chance: 0.002 },
        { itemId: 'agility_banner', chance: 0.002 }
    ],
    normal: [
        { itemId: 'lubricant', chance: 0.004 },
        { itemId: 'full_firepower', chance: 0.004 },
        { itemId: 'chain_lightning', chance: 0.002 },
        { itemId: 'courage_banner', chance: 0.002 },
        { itemId: 'slaughter_banner', chance: 0.002 },
        { itemId: 'agility_banner', chance: 0.002 }
    ]
};
