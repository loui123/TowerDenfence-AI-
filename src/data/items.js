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
        description: '塔的攻擊速度 +5%。',
        icon: '速',
        source: 'wood'
    },
    power_book: {
        id: 'power_book',
        name: '力量之書',
        type: ITEM_TYPES.CONSUMABLE,
        description: '塔的基礎點傷 +5。',
        icon: '力',
        source: 'fire'
    },
    crit_book: {
        id: 'crit_book',
        name: '暴擊之書',
        type: ITEM_TYPES.CONSUMABLE,
        description: '塔的暴擊率 +5%（最高 100%）。',
        icon: '暴',
        source: 'all'
    },
    crit_dmg_book: {
        id: 'crit_dmg_book',
        name: '暴傷之書',
        type: ITEM_TYPES.CONSUMABLE,
        description: '塔的暴擊傷害 +20%。',
        icon: '爆',
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
    range_book: {
        id: 'range_book',
        name: '射程之書',
        type: ITEM_TYPES.CONSUMABLE,
        description: '塔的攻擊距離 +1。',
        icon: '距',
        source: 'all'
    },
    fury_book: {
        id: 'fury_book',
        name: '狂怒之書',
        type: ITEM_TYPES.CONSUMABLE,
        description: '塔的攻速 +20%。',
        icon: '怒',
        source: 'all'
    },
    precision_book: {
        id: 'precision_book',
        name: '精準之書',
        type: ITEM_TYPES.CONSUMABLE,
        description: '塔的暴擊率 +15%（最高 100%）。',
        icon: '精',
        source: 'all'
    },
    fire_oil: {
        id: 'fire_oil',
        name: '烈火塗層',
        type: ITEM_TYPES.CONSUMABLE,
        description: '塔獲得等同基礎傷害 25% 的火附傷。',
        icon: '焰',
        source: 'fire'
    },
    water_oil: {
        id: 'water_oil',
        name: '寒流塗層',
        type: ITEM_TYPES.CONSUMABLE,
        description: '塔獲得等同基礎傷害 25% 的水附傷。',
        icon: '霜',
        source: 'water'
    },
    wood_oil: {
        id: 'wood_oil',
        name: '荊棘塗層',
        type: ITEM_TYPES.CONSUMABLE,
        description: '塔獲得等同基礎傷害 25% 的木附傷。',
        icon: '棘',
        source: 'wood'
    },
    fortify_book: {
        id: 'fortify_book',
        name: '強化之書',
        type: ITEM_TYPES.CONSUMABLE,
        description: '塔的傷害 +20%。',
        icon: '強',
        source: 'all'
    },
    split_manual: {
        id: 'split_manual',
        name: '分裂手冊',
        type: ITEM_TYPES.CONSUMABLE,
        description: '投射塔攻擊目標數 +1。',
        icon: '裂',
        source: 'all'
    },
    chain_manual: {
        id: 'chain_manual',
        name: '連鎖手冊',
        type: ITEM_TYPES.CONSUMABLE,
        description: '投射塔連鎖次數 +1。',
        icon: '鏈',
        source: 'all'
    },
    repair_kit: {
        id: 'repair_kit',
        name: '急救套件',
        type: ITEM_TYPES.CONSUMABLE,
        description: '連點兩下立即使用：生命 +1；若已滿血則先最大生命 +1，再恢復 1 點生命。',
        icon: '補',
        source: 'all'
    },
    specialization_reset_scroll: {
        id: 'specialization_reset_scroll',
        name: '專精重置卷軸',
        type: ITEM_TYPES.CONSUMABLE,
        description: '重置已點過的滿等塔專精，並可重新選擇。',
        icon: '重',
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
        name: '閃電',
        type: ITEM_TYPES.EQUIPMENT,
        description: '塔攻擊命中時 有40%機率觸發連鎖閃電（1x基礎傷害、10 次連鎖、10% 機率麻痺 1 秒；可吃連鎖加成）。',
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
    },
    sniper_scope: {
        id: 'sniper_scope',
        name: '狙擊鏡',
        type: ITEM_TYPES.EQUIPMENT,
        description: '裝備塔攻擊距離 +2。',
        icon: '鏡',
        source: 'all'
    },
    war_drum: {
        id: 'war_drum',
        name: '戰鼓',
        type: ITEM_TYPES.EQUIPMENT,
        description: '裝備塔攻速 +20%。',
        icon: '鼓',
        source: 'all'
    },
    giant_slayer: {
        id: 'giant_slayer',
        name: '巨人殺手',
        type: ITEM_TYPES.EQUIPMENT,
        description: '對 Boss 造成傷害 +60%。',
        icon: '斬',
        source: 'all'
    },
    executioner_axe: {
        id: 'executioner_axe',
        name: '處決之斧',
        type: ITEM_TYPES.EQUIPMENT,
        description: '對 35% 以下生命目標造成傷害 +50%。',
        icon: '刑',
        source: 'all'
    },
    frost_emblem: {
        id: 'frost_emblem',
        name: '寒霜徽記',
        type: ITEM_TYPES.EQUIPMENT,
        description: '命中有機率施加短暫緩速。',
        icon: '冰',
        source: 'water'
    },
    burn_emblem: {
        id: 'burn_emblem',
        name: '灼燒徽記',
        type: ITEM_TYPES.EQUIPMENT,
        description: '命中附加灼燒持續傷害。',
        icon: '灼',
        source: 'fire'
    },
    venom_core: {
        id: 'venom_core',
        name: '毒液核心',
        type: ITEM_TYPES.EQUIPMENT,
        description: '命中附加中毒效果。',
        icon: '毒',
        source: 'wood'
    },
    ricochet_module: {
        id: 'ricochet_module',
        name: '彈射模組',
        type: ITEM_TYPES.EQUIPMENT,
        description: '投射塔連鎖次數 +2。',
        icon: '彈',
        source: 'all'
    },
    multishot_module: {
        id: 'multishot_module',
        name: '多重模組',
        type: ITEM_TYPES.EQUIPMENT,
        description: '投射塔攻擊目標數 +1。',
        icon: '多',
        source: 'all'
    },
    shock_core: {
        id: 'shock_core',
        name: '電震核心',
        type: ITEM_TYPES.EQUIPMENT,
        description: '命中有機率暈眩目標 0.2 秒。',
        icon: '震',
        source: 'all'
    },
    rupture_blade: {
        id: 'rupture_blade',
        name: '裂傷之刃',
        type: ITEM_TYPES.EQUIPMENT,
        description: '命中附加流血效果（可與近戰流血疊加等級）。',
        icon: '裂',
        source: 'all'
    },
    siege_shell: {
        id: 'siege_shell',
        name: '攻城彈頭',
        type: ITEM_TYPES.EQUIPMENT,
        description: '砲擊塔爆炸範圍/擊退提升。',
        icon: '砲',
        source: 'fire'
    },
    gravity_well: {
        id: 'gravity_well',
        name: '重力井',
        type: ITEM_TYPES.EQUIPMENT,
        description: '緩速塔緩速範圍與持續時間提升。',
        icon: '井',
        source: 'water'
    },
    mana_reactor: {
        id: 'mana_reactor',
        name: '法力反應爐',
        type: ITEM_TYPES.EQUIPMENT,
        description: '法術塔觸發等級 +1。',
        icon: '爐',
        source: 'all'
    },
    crystal_lens: {
        id: 'crystal_lens',
        name: '晶核透鏡',
        type: ITEM_TYPES.EQUIPMENT,
        description: '裝備塔暴擊傷害 +50%。',
        icon: '晶',
        source: 'all'
    },
    lucky_coin: {
        id: 'lucky_coin',
        name: '幸運硬幣',
        type: ITEM_TYPES.EQUIPMENT,
        description: '擊殺有機率額外掉落資源。',
        icon: '幣',
        source: 'all'
    },
    vampire_fang: {
        id: 'vampire_fang',
        name: '吸血獠牙',
        type: ITEM_TYPES.EQUIPMENT,
        description: '擊殺有機率回復玩家生命 1 點。',
        icon: '牙',
        source: 'all'
    },
    time_weaver: {
        id: 'time_weaver',
        name: '織時器',
        type: ITEM_TYPES.EQUIPMENT,
        description: '裝備塔攻速 +15%。',
        icon: '時',
        source: 'all'
    },
    last_stand_emblem: {
        id: 'last_stand_emblem',
        name: '背水徽記',
        type: ITEM_TYPES.EQUIPMENT,
        description: '玩家生命低於等於 1 時，裝備塔傷害 +35%。',
        icon: '背',
        source: 'all'
    },
    echo_rune: {
        id: 'echo_rune',
        name: '回響符文',
        type: ITEM_TYPES.EQUIPMENT,
        description: '命中有機率觸發一次回響打擊。',
        icon: '響',
        source: 'all'
    },
    hard_gloves: {
        id: 'hard_gloves',
        name: '堅硬手套',
        type: ITEM_TYPES.EQUIPMENT,
        description: '暴擊命中時疊加脆弱：目標承受暴擊傷害 +1%（上限 100%）。',
        icon: '堅',
        source: 'boss'
    },
    toxic_gloves: {
        id: 'toxic_gloves',
        name: '毒性手套',
        type: ITEM_TYPES.EQUIPMENT,
        description: '造成中毒時，該次中毒傷害改為隨機 0.5~4.0 倍。',
        icon: '毒',
        source: 'boss'
    }
};

export const MONSTER_ITEM_DROP_TABLE = {
    normal: [
        { itemId: 'crit_book', chance: 0.02 },
        { itemId: 'crit_dmg_book', chance: 0.02 },
        { itemId: 'speed_book', chance: 0.02 },
        { itemId: 'power_book', chance: 0.04 },
        { itemId: 'build_book', chance: 0.003 }
    ],
    fire: [
        { itemId: 'crit_book', chance: 0.02 },
        { itemId: 'crit_dmg_book', chance: 0.02 },
        { itemId: 'power_book', chance: 0.06 },
        { itemId: 'build_book', chance: 0.003 }
    ],
    water: [
        { itemId: 'speed_book', chance: 0.04 },
        { itemId: 'crit_book', chance: 0.02 },
        { itemId: 'crit_dmg_book', chance: 0.02 },
        { itemId: 'build_book', chance: 0.003 }
    ],
    wood: [
        { itemId: 'power_book', chance: 0.05 },
        { itemId: 'crit_book', chance: 0.02 },
        { itemId: 'crit_dmg_book', chance: 0.02 },
        { itemId: 'speed_book', chance: 0.01 },
        { itemId: 'build_book', chance: 0.003 }
    ]
};

export const BOSS_EXTRA_DROP_TABLE = [
    { itemId: 'build_book', chance: 0.08 },
    { itemId: 'level_book', chance: 0.1 },
    { itemId: 'specialization_reset_scroll', chance: 0.02 },
    { itemId: 'lubricant', chance: 0.02 },
    { itemId: 'full_firepower', chance: 0.02 },
    { itemId: 'chain_lightning', chance: 0.02 },
    { itemId: 'hard_gloves', chance: 0.02 },
    { itemId: 'toxic_gloves', chance: 0.02 },
    { itemId: 'courage_banner', chance: 0.03 },
    { itemId: 'slaughter_banner', chance: 0.03 },
    { itemId: 'agility_banner', chance: 0.03 }
];
