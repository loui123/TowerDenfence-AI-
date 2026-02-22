export const ITEM_TYPES = {
    CONSUMABLE: 'consumable',
    EQUIPMENT: 'equipment'
};

export const ITEM_DEFS = {
    level_book: {
        id: 'level_book',
        name: '等級之書',
        type: ITEM_TYPES.CONSUMABLE,
        description: '升級塔 1 級（不可對滿等塔使用）',
        icon: 'Lv',
        source: 'water'
    },
    speed_book: {
        id: 'speed_book',
        name: '速度之書',
        type: ITEM_TYPES.CONSUMABLE,
        description: '塔攻擊速度 +10%',
        icon: '速',
        source: 'wood'
    },
    power_book: {
        id: 'power_book',
        name: '力量之書',
        type: ITEM_TYPES.CONSUMABLE,
        description: '塔基礎傷害 +10%',
        icon: '力',
        source: 'fire'
    },
    crit_book: {
        id: 'crit_book',
        name: '暴擊之書',
        type: ITEM_TYPES.CONSUMABLE,
        description: '塔暴擊機率 +10%',
        icon: '暴',
        source: 'all'
    },
    build_book: {
        id: 'build_book',
        name: '建設之書',
        type: ITEM_TYPES.CONSUMABLE,
        description: '本局可建塔上限 +1',
        icon: '建',
        source: 'boss'
    },
    lubricant: {
        id: 'lubricant',
        name: '潤滑油',
        type: ITEM_TYPES.EQUIPMENT,
        description: '裝備後將塔的基礎攻擊速度改為 1（不可卸下）',
        icon: '油',
        source: 'all'
    },
    full_firepower: {
        id: 'full_firepower',
        name: '火力全開',
        type: ITEM_TYPES.EQUIPMENT,
        description: '裝備後將塔的基礎攻擊力改為 40（不可卸下）',
        icon: '火',
        source: 'all'
    },
    chain_lightning: {
        id: 'chain_lightning',
        name: '閃電鏈',
        type: ITEM_TYPES.EQUIPMENT,
        description: '攻擊命中觸發連鎖閃電（20 傷害、連鎖 20 次、10% 機率麻痺 1 秒）',
        icon: '鏈',
        source: 'all'
    },
    courage_banner: {
        id: 'courage_banner',
        name: '勇氣旗幟',
        type: ITEM_TYPES.EQUIPMENT,
        description: '附近 3 格塔的暴擊機率 +25%（可疊加）',
        icon: '勇',
        source: 'all'
    },
    slaughter_banner: {
        id: 'slaughter_banner',
        name: '殺戮旗幟',
        type: ITEM_TYPES.EQUIPMENT,
        description: '附近 3 格塔的暴擊傷害 +40%（可疊加）',
        icon: '殺',
        source: 'all'
    },
    agility_banner: {
        id: 'agility_banner',
        name: '靈活旗幟',
        type: ITEM_TYPES.EQUIPMENT,
        description: '附近 3 格塔的攻擊速度 +10%（可疊加）',
        icon: '靈',
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
