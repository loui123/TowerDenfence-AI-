import React, { useState, useEffect, useRef, useMemo } from 'react';
import { generateMap } from '../../engine/MapGenerator';
import { GameEngine } from '../../engine/GameEngine';
import { useGame } from '../../contexts/GameContext';
import { RESOURCES, TOWER_TYPES } from '../../data/constants';
import { ITEM_DEFS, ITEM_TYPES } from '../../data/items';
import { Heart } from 'lucide-react';

const CELL_SIZE = 40;
const INITIAL_CRIT_DMG = 2.0;

const hasAnyTwoAilmentTalents = (tower) => {
    const count = [
        tower?.upgradeStats?.magic_wood_poison_talent || 0,
        tower?.upgradeStats?.magic_water_frostbite_talent || 0,
        tower?.upgradeStats?.magic_fire_scorch_talent || 0
    ].filter((v) => v > 1).length;
    return count >= 2;
};

const supportBookUpgradeCount = (tower) => (
    (tower?.upgradeStats?.support_gain_level_book || 0)
    + (tower?.upgradeStats?.support_gain_speed_book || 0)
    + (tower?.upgradeStats?.support_gain_power_book || 0)
    + (tower?.upgradeStats?.support_gain_crit_book || 0)
);

const UPGRADE_POOL = [
    { id: 'base_magic_dmg', label: '法術基礎傷害 +20', desc: '法術塔基礎傷害提高 20', onlyMagic: true },
    { id: 'speed_magic', label: '急速施法', desc: '攻擊間隔縮短 20%（最多 5 次）', onlyMagic: true, maxCount: 5 },
    { id: 'trigger_magic', label: '法術觸發率 +20%', desc: '元素法術觸發機率提高 20%（最多 1 次）', onlyMagic: true, onlyAfterMagicElement: true, maxCount: 1 },
    { id: 'elemental_fire_magic', label: '法術-炎爆', desc: '攻擊時機率觸發炎爆，升級後提升傷害量', onlyMagic: true, magicElement: 'fire' },
    { id: 'elemental_water_magic', label: '法術-水球', desc: '攻擊時機率觸發水球，升級後提升傷害量', onlyMagic: true, magicElement: 'water' },
    { id: 'elemental_wood_magic', label: '法術-龍捲風', desc: '攻擊時機率觸發龍捲風（龍捲風在場上持續3秒，每秒對範圍內怪物造成傷害），升級後提升傷害量', onlyMagic: true, magicElement: 'wood' },
    { id: 'magic_wood_poison_talent', label: '木法毒蝕', desc: '龍捲風每次造成傷害對怪物附加中毒效果', onlyMagic: true, requiredMagicElement: 'wood', maxCount: 3 },
    { id: 'magic_water_frostbite_talent', label: '水法凍傷', desc: '水球擊中怪物附加5層凍傷效果', onlyMagic: true, requiredMagicElement: 'water', maxCount: 3 },
    { id: 'magic_fire_scorch_talent', label: '火法灼燒', desc: '炎爆擊中怪物附加1層灼燒效果', onlyMagic: true, requiredMagicElement: 'fire', maxCount: 3 },
    { id: 'fire_dmg', label: '火屬性附加傷害 +25%', desc: '增加火屬性追加傷害，並附加灼傷（3秒）', element: 'fire' },
    { id: 'water_dmg', label: '水屬性附加傷害 +25%', desc: '增加水屬性追加傷害，並附加凍傷（3秒）', element: 'water' },
    { id: 'wood_dmg', label: '木屬性附加傷害 +25%', desc: '增加木屬性追加傷害，並附加中毒效果', element: 'wood' },
    { id: 'poison_dmg', label: '中毒傷害 +40%', desc: '木附傷帶來的中毒每級 +40% 傷害', element: 'wood', maxCount: 3 },
    { id: 'poison_duration', label: '中毒時間 +2秒', desc: '木附傷帶來的中毒持續時間 +2 秒', element: 'wood', maxCount: 3 },
    { id: 'poison_frequency', label: '中毒頻率 +25%', desc: '木附傷帶來的中毒傷害頻率每級 +25%', element: 'wood' },
    { id: 'base_dmg', label: '基礎傷害 +25%', desc: '直接提升基礎傷害' },
    { id: 'crit_chance', label: '暴擊率 +10%', desc: '提高暴擊觸發機率' },
    { id: 'crit_dmg', label: '暴擊傷害 +20%', desc: '提高暴擊倍率' },
    { id: 'speed', label: '攻速 +10%', desc: '縮短攻擊間隔', maxCount: 4 },
    { id: 'range', label: '攻擊距離 +1', desc: '提升攻擊範圍', maxCount: 4 },
    { id: 'proj_chain_up', label: '連鎖次數 +1', desc: '投射物額外連鎖一次', onlyProjectile: true, maxCount: 4 },
    { id: 'proj_count_up', label: '攻擊數量 +1', desc: '投射物額外命中目標 +1', onlyProjectile: true, maxCount: 2 },
    { id: 'melee_bleed', label: '附加流血', desc: '近戰命中，25%機率附加流血效果(增加怪物承受傷害30%)三秒。怪物下次受到流血效果的攻擊時，會額外受到一次當次傷害', onlyMelee: true },
    { id: 'addition_attack', label: '額外攻擊 +1', desc: '命中時追加 50% 基礎傷害攻擊', onlyMelee: true, maxCount: 3 },
    { id: 'melee_boss_dmg', label: '頭目殺手', desc: '對 Boss 造成的傷害加成 +50%', onlyMelee: true, maxCount: 3 },
    { id: 'slow_power_up', label: '緩速效果增加 +10%', desc: '緩速塔每級額外 +10% 緩速，緩速效果達到上限改為增加怪物承受傷害', onlySlowTower: true, maxCount: 3 },
    { id: 'knockback_up', label: '攻擊爆炸擊退距離 +0.25', desc: '砲擊塔爆炸命中時：擊退距離 +0.25，且每次擊退使該塔對該怪承傷 +10%（上限 +50%）', onlyArtillery: true },
    { id: 'knockback_stun', label: '爆炸暈眩 +0.2秒', desc: '砲擊塔爆炸附加 0.2 秒暈眩', onlyArtillery: true },
    { id: 'knockback_radius', label: '爆炸範圍 +1', desc: '砲擊塔爆炸範圍增加 1 格', onlyArtillery: true }
];

const SPECIALIZATION_POOL = [
    { id: 'spec_speed_aura', label: '加速靈氣', desc: '所有塔攻速 +5%', condition: (t) => (t.upgradeStats?.speed || 0) >= 4 },
    { id: 'spec_fire_global', label: '火之靈氣', desc: '附近五格塔命中怪物附加灼傷效果（基礎持續3秒，擊中後刷新持續時間）', condition: (t) => (t.upgradeStats?.fire_dmg || 0) >= 4 },
    { id: 'spec_water_global', label: '水之靈氣', desc: '附近五格塔命中怪物附加凍傷效果（基礎持續3秒，擊中後刷新持續時間）', condition: (t) => (t.upgradeStats?.water_dmg || 0) >= 4 },
    { id: 'spec_wood_global', label: '木專精', desc: '附近五格塔命中怪物附加中毒效果（基礎持續5秒，擊中後刷新持續時間）', condition: (t) => (t.upgradeStats?.wood_dmg || 0) >= 4 },
    { id: 'spec_crit_global', label: '暴擊靈氣', desc: '所有塔暴擊機率 +10%', condition: (t) => (t.upgradeStats?.crit_chance || 0) >= 4 },
    { id: 'spec_crit_dmg_global', label: '暴傷靈氣', desc: '所有塔暴擊傷害 +10%', condition: (t) => (t.upgradeStats?.crit_dmg || 0) >= 4 },
    { id: 'spec_chain_no_limit', label: '連鎖彈射', desc: '連鎖傷害不衰減，且可重複連鎖已命中目標', condition: (t) => (t.upgradeStats?.proj_chain_up || 0) >= 3 },
    { id: 'spec_tower_speed_50', label: '攻速提升 20%', desc: '該塔攻速提升 20%' },
    { id: 'spec_tower_base_100', label: '基礎傷害提升 100%', desc: '該塔基礎傷害 x2' },
    { id: 'spec_tower_range_3', label: '攻擊範圍 +3', desc: '該塔攻擊範圍 +3 格' },
    { id: 'spec_tower_share_exp', label: '經驗外溢', desc: '該塔擊殺經驗隨機分配給其他塔' },
    { id: 'spec_tower_crit_random', label: '隨機暴傷', desc: '該塔暴擊額外 +10%~1000%' },
    { id: 'spec_tower_stun_02', label: '攻擊暈眩', desc: '該塔每次攻擊暈眩 0.2 秒' },
    { id: 'spec_tower_fire_explosion', label: '火焰爆炸', desc: '該塔命中觸發 50% 基礎火焰爆炸（3 格）' },
    { id: 'spec_tower_attr_off_triple', label: '基礎屬性強化', desc: '屬性攻擊失效，基礎傷害 x3' },
    { id: 'spec_tower_half_dmg_double_speed', label: '高速連擊', desc: '基礎傷害減半，攻速翻倍' },
    { id: 'spec_tower_boss_killer', label: '巨獸行刑者', desc: '對 Boss 造成的傷害追加 200%', condition: (t) => (t.upgradeStats?.melee_boss_dmg || 0) >= 3 },
    { id: 'spec_tower_bleed', label: '血蝕之刃', desc: '流血傷害 +200%，流血持續時間改為 10 秒', condition: (t) => (t.upgradeStats?.melee_bleed || 0) >= 3 },
    { id: 'spec_tower_poison', label: '毒蝕蔓延', desc: '所有塔中毒傷害 +200%、中毒持續至少 10 秒，並附加 15% 緩速', condition: (t) => (t.upgradeStats?.poison_dmg || 0) >= 3 },
    { id: 'spec_tower_poison_frequency', label: '劇毒高頻', desc: '所有塔中毒頻率 +200%，並附加 15% 緩速', condition: (t) => (t.upgradeStats?.poison_frequency || 0) >= 3 },
    { id: 'spec_global_wood_base', label: '木源增幅', desc: '全塔基礎傷害 +20%，木屬性傷害 +25%', condition: (t) => (t.upgradeStats?.wood_dmg || 0) >= 1 && (t.upgradeStats?.base_dmg || 0) >= 1 },
    { id: 'spec_global_wood_crit_dmg', label: '木源暴傷', desc: '全塔暴擊傷害 +25%，木屬性暴擊傷害 +25%', condition: (t) => (t.upgradeStats?.wood_dmg || 0) >= 1 && (t.upgradeStats?.crit_dmg || 0) >= 1 },
    { id: 'spec_global_water_base', label: '水源增幅', desc: '全塔基礎傷害 +20%，水屬性傷害 +25%', condition: (t) => (t.upgradeStats?.water_dmg || 0) >= 1 && (t.upgradeStats?.base_dmg || 0) >= 1 },
    { id: 'spec_global_water_speed', label: '水源急速', desc: '全塔攻速 +12%，水屬性傷害 +25%', condition: (t) => (t.upgradeStats?.water_dmg || 0) >= 1 && (t.upgradeStats?.speed || 0) >= 1 },
    { id: 'spec_global_fire_speed', label: '炎源急速', desc: '全塔攻速 +12%，火屬性傷害 +25%', condition: (t) => (t.upgradeStats?.fire_dmg || 0) >= 1 && (t.upgradeStats?.speed || 0) >= 1 },
    { id: 'spec_global_fire_crit', label: '炎源暴擊', desc: '全塔暴擊率 +10%，火屬性傷害 +25%', condition: (t) => (t.upgradeStats?.fire_dmg || 0) >= 1 && (t.upgradeStats?.crit_chance || 0) >= 1 },
    { id: 'spec_global_bleed_speed', label: '血戰急速', desc: '全塔攻速 +10%，木屬性傷害 +25%', condition: (t) => (t.upgradeStats?.melee_bleed || 0) >= 1 && (t.upgradeStats?.speed || 0) >= 1 },
    { id: 'spec_global_bleed_base', label: '血戰強襲', desc: '全塔基礎傷害 +15%，木屬性傷害 +25%', condition: (t) => (t.upgradeStats?.melee_bleed || 0) >= 1 && (t.upgradeStats?.base_dmg || 0) >= 1 },
    { id: 'spec_magic_wood_base', label: '木法增幅', desc: '該塔木屬性法術傷害 +100%', condition: (t) => (t.upgradeStats?.elemental_wood_magic || 0) >= 1 && (t.upgradeStats?.base_magic_dmg || 0) >= 1 },
    { id: 'spec_magic_water_frost_trigger', label: '寒脈共振', desc: '該塔水屬性法術傷害 +100%', condition: (t) => (t.upgradeStats?.elemental_water_magic || 0) >= 1 && (t.upgradeStats?.magic_water_frostbite_talent || 0) >= 1 },
    { id: 'spec_magic_fire_speed', label: '炎術疾馳', desc: '該塔火屬性法術傷害 +100%', condition: (t) => (t.upgradeStats?.elemental_fire_magic || 0) >= 1 },
    { id: 'spec_magic_combo_wood_fire', label: '焚森術', desc: '攻擊時機率觸發法術-焚森術（取代原本龍捲風/炎爆）', condition: (t) => (t.upgradeStats?.elemental_wood_magic || 0) >= 1 && (t.upgradeStats?.elemental_fire_magic || 0) >= 1 },
    { id: 'spec_magic_combo_fire_water', label: '蒸潮術', desc: '攻擊時機率觸發法術-蒸潮術（取代原本炎爆/水球）', condition: (t) => (t.upgradeStats?.elemental_fire_magic || 0) >= 1 && (t.upgradeStats?.elemental_water_magic || 0) >= 1 },
    { id: 'spec_magic_combo_water_wood', label: '潮林術', desc: '攻擊時機率觸發法術-潮林術（取代原本水球/龍捲風）', condition: (t) => (t.upgradeStats?.elemental_water_magic || 0) >= 1 && (t.upgradeStats?.elemental_wood_magic || 0) >= 1 },
    { id: 'spec_magic_dual_ailment', label: '雙異常共鳴', desc: '該塔造成的異常效果及異常傷害提升200%', condition: (t) => hasAnyTwoAilmentTalents(t) }
];

const SUPPORT_UPGRADE_POOL = [
    { id: 'support_attack_aura_up', label: '強化攻擊靈氣效果', desc: '攻擊靈氣效果每級 +10%', requireAura: 'attack' },
    { id: 'support_speed_aura_up', label: '強化速度靈氣效果', desc: '速度靈氣效果每級 +10%', requireAura: 'speed' },
    { id: 'support_slow_aura_up', label: '強化緩速靈氣效果', desc: '緩速靈氣效果每級 +10%', requireAura: 'slow' },
    { id: 'support_crit_aura_up', label: '強化暴擊靈氣效果', desc: '暴擊靈氣效果每級 +10%', requireAura: 'crit' },
    { id: 'support_spell_aura_up', label: '強化法術靈氣效果', desc: '法術靈氣每級 +10%（最高 5 級）', requireAura: 'spell', maxCount: 5 },
    { id: 'support_convert_speed_aura', label: '轉換為速度靈氣', desc: '將攻擊靈氣轉為速度靈氣（僅一次）', requireAura: 'attack', isConvert: true },
    { id: 'support_convert_slow_aura', label: '轉換為緩速靈氣', desc: '將攻擊靈氣轉為緩速靈氣（僅一次）', requireAura: 'attack', isConvert: true },
    { id: 'support_convert_crit_aura', label: '轉換為暴擊靈氣', desc: '將攻擊靈氣轉為暴擊靈氣（僅一次）', requireAura: 'attack', isConvert: true },
    { id: 'support_convert_spell_aura', label: '轉換為法術靈氣', desc: '將攻擊靈氣轉為法術靈氣（僅一次）', requireAura: 'attack', isConvert: true },
    { id: 'support_aura_range_up', label: '範圍增加 1 格', desc: '當前靈氣範圍 +1' },
    { id: 'support_gain_level_book', label: '獲得經驗之書 x1', desc: '立即獲得 1 本經驗之書' },
    { id: 'support_gain_speed_book', label: '獲得速度之書 x1', desc: '立即獲得 1 本速度之書' },
    { id: 'support_gain_power_book', label: '獲得力量之書 x1', desc: '立即獲得 2 本力量之書' },
    { id: 'support_gain_crit_book', label: '獲得暴擊之書 x1', desc: '立即獲得 1 本暴擊之書' },
    { id: 'support_gain_gold_1000', label: '獲得金幣 1000', desc: '立即獲得 1000 金幣' }
];

const SUPPORT_SPECIALIZATION_POOL = [
    { id: 'support_spec_level_books_10', label: '經驗之書 x5', desc: '立即獲得 5 本經驗之書' },
    { id: 'support_spec_speed_books_10', label: '速度之書 x5', desc: '立即獲得 5 本速度之書' },
    { id: 'support_spec_power_books_10', label: '力量之書 x15', desc: '立即獲得 15 本力量之書' },
    { id: 'support_spec_crit_books_10', label: '暴擊傷害之書 x5', desc: '立即獲得 5 本暴擊之書' },
    { id: 'support_spec_double_aura', label: '靈氣效果翻倍', desc: '當前塔的靈氣效果提升一倍' },
    { id: 'support_spec_range_5', label: '靈氣範圍 +5', desc: '當前塔的靈氣範圍增加五格' },
    { id: 'support_spec_lucky_aura', label: '幸運靈氣', desc: '附近塔暴擊傷害每秒隨機增加 0~2 倍' },
    { id: 'support_spec_global_item_drop', label: '尋寶指揮', desc: '全域道具/裝備掉落機率 +15%（需書系升級總計 >=3）', condition: (t) => supportBookUpgradeCount(t) >= 3 }
];

const TOWER_SHORT_LABEL = {
    melee: '近',
    projectile: '弓',
    projectile_slow: '緩',
    projectile_aoe: '砲',
    magic: '法',
    support: '輔'
};

const TERRAIN_META = {
    highland: {
        name: '高地',
        description: '投射物塔傷害 +30%',
        image: 'linear-gradient(135deg, rgba(190,170,120,0.30), rgba(130,110,70,0.18))'
    },
    forest: {
        name: '森林',
        description: '投射物塔 30% 丟失攻擊，近戰塔暴擊 +20%，中毒傷害 +30%',
        image: 'repeating-linear-gradient(45deg, rgba(40,120,55,0.28) 0 8px, rgba(20,80,35,0.16) 8px 16px)'
    },
    plain: {
        name: '平原',
        description: '近戰塔攻速 +20%，路徑怪物移速 +10%',
        image: 'linear-gradient(180deg, rgba(165,200,95,0.22), rgba(120,160,70,0.14))'
    },
    swamp: {
        name: '沼澤',
        description: '緩速塔緩速效果 +20%，近戰塔攻速 -20%，路徑怪物移速 -30%，凍傷每層增傷 +30%，灼傷傷害 -20%',
        image: 'repeating-radial-gradient(circle at 25% 35%, rgba(70,100,60,0.24) 0 10px, rgba(50,70,40,0.1) 10px 18px)'
    },
    desert: {
        name: '沙地',
        description: '塔攻速 -10%，塔傷害 +20%，灼傷傷害 +40%，凍傷每層增傷 -20%',
        image: 'linear-gradient(140deg, rgba(220,190,120,0.2), rgba(170,140,85,0.12))'
    },
    rocky: {
        name: '岩地',
        description: '無額外效果',
        image: 'repeating-linear-gradient(25deg, rgba(120,120,130,0.22) 0 7px, rgba(80,80,90,0.12) 7px 14px)'
    },
    ruins: {
        name: '遺跡',
        description: '法術塔攻速 +20%，輔助塔靈氣範圍 +1',
        image: 'linear-gradient(120deg, rgba(150,130,100,0.2), rgba(90,80,70,0.1))'
    }
};

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

const getTowerColor = (typeId) => {
    const type = Object.values(TOWER_TYPES).find((t) => t.id === typeId);
    return type ? type.color : '#fff';
};

const getCellColor = (cell) => {
    if (cell.type === 'start') return '#4CAF50';
    if (cell.type === 'end') return '#F44336';
    if (cell.type === 'path') return '#5D4037';
    if (cell.type === 'build') return '#2a2a2a';
    if (cell.type === 'tower') return '#2a2a2a';
    if (cell.type === 'obstacle') return '#212121';
    return '#1e1e1e';
};

const getMobColor = (typeId) => {
    switch (typeId) {
        case 'fire': return '#ff4444';
        case 'water': return '#4444ff';
        case 'wood': return '#44aa44';
        default: return '#cccccc';
    }
};

const getMobImage = (typeId) => {
    if (typeId === 'fire') return '/monster_fire.png';
    if (typeId === 'water') return '/monster_water.png';
    if (typeId === 'wood') return '/monster_wood.png';
    return '/monster_normal.png';
};

const getTowerLabel = (typeId) => TOWER_SHORT_LABEL[typeId] || '塔';
const getTowerName = (typeId) => {
    if (typeId === 'melee') return '近戰塔';
    if (typeId === 'projectile') return '弓箭塔';
    if (typeId === 'projectile_slow') return '緩速塔';
    if (typeId === 'projectile_aoe') return '砲擊塔';
    if (typeId === 'magic') return '法術塔';
    if (typeId === 'support') return '輔助塔';
    return '塔';
};
const getTowerArchetypeLabel = (type) => {
    if (type?.stats?.type === 'magic') return '法術';
    if (type?.stats?.type === 'support') return '輔助';
    if (type?.stats?.type === 'projectile') return '投射物';
    return '近戰';
};

const getBuildPanelLines = (type) => {
    if (!type) return [];
    const baseLine = `花費: ${type.cost} | 型態: ${getTowerArchetypeLabel(type)}`;
    const statLineA = `傷害: ${type.stats.damage} | 攻速: ${type.stats.speed.toFixed(2)}`;
    const statLineB = `距離: ${type.stats.range} | 暴擊: ${(type.stats.crit * 100).toFixed(0)}%`;

    if (type.id === 'support') {
        return [
            baseLine,
            '定位: 輔助靈氣塔(無法攻擊)附近1格友方塔+15%'
        ];
    }

    if (type.id === 'projectile_slow') {
        return [
            baseLine,
            statLineA,
            statLineB,
            '定位: 遠距離範圍控場 具備緩速能力',
            '基礎緩速: 30%（可透過天賦持續強化）'
        ];
    }

    if (type.id === 'projectile_aoe') {
        return [
            baseLine,
            statLineA,
            statLineB,
            '定位: 遠距離範圍控場 具備擊退能力'
        ];
    }

    if (type.id === 'magic') {
        return [
            baseLine,
            statLineA,
            statLineB,
            '定位: 攻擊機率觸發法術'
        ];
    }

    return [baseLine, statLineA, statLineB];
};
const TERRAIN_TILE_MAP = {
    highland: '/tiles/terrain_highland.svg',
    forest: '/tiles/terrain_forest.svg',
    plain: '/tiles/terrain_plain.svg',
    swamp: '/tiles/terrain_swamp.svg',
    desert: '/tiles/terrain_desert.svg',
    rocky: '/tiles/terrain_rocky.svg',
    ruins: '/tiles/terrain_ruins.svg'
};
const CELL_TILE_MAP = {
    start: '/tiles/cell_start.svg',
    end: '/tiles/cell_end.svg',
    path: '/tiles/cell_path.svg',
    obstacle: '/tiles/cell_obstacle.svg'
};
const isMeleeTower = (tower) => tower?.type === 'melee';
const isProjectileTower = (tower) => tower?.type === 'projectile';
const isSlowTower = (tower) => tower?.type === 'projectile_slow';
const isArtilleryTower = (tower) => tower?.type === 'projectile_aoe';
const isMagicTower = (tower) => tower?.type === 'magic';
const isSupportTower = (tower) => tower?.type === 'support' || tower?.stats?.type === 'support';

const lerp = (a, b, t) => Math.round(a + (b - a) * t);

const getTowerLevelColor = (level) => {
    if (level >= 10) return 'rgb(192, 192, 204)';

    const start = { r: 255, g: 136, b: 40 }; // orange
    const end = { r: 132, g: 66, b: 186 }; // purple
    const t = Math.max(0, Math.min(1, (level - 1) / 9));
    return `rgb(${lerp(start.r, end.r, t)}, ${lerp(start.g, end.g, t)}, ${lerp(start.b, end.b, t)})`;
};

const getTerrainLabel = (terrain) => TERRAIN_META[terrain]?.name || '無';
const getTerrainEffectText = (terrain) => TERRAIN_META[terrain]?.description || '無特殊效果';
const getTerrainImage = (terrain) => TERRAIN_TILE_MAP[terrain] || null;
const getCellTexture = (cell) => {
    if (!cell) return null;
    if (cell.type === 'build') return getTerrainImage(cell.terrain) || '/tiles/cell_build.svg';
    if (CELL_TILE_MAP[cell.type]) return CELL_TILE_MAP[cell.type];
    return getTerrainImage(cell.terrain) || '/tiles/cell_build.svg';
};
const ALL_UPGRADE_POOL = [...UPGRADE_POOL, ...SUPPORT_UPGRADE_POOL];
const ALL_SPECIALIZATION_POOL = [...SPECIALIZATION_POOL, ...SUPPORT_SPECIALIZATION_POOL];
const UPGRADE_OPTION_MAP = Object.fromEntries(ALL_UPGRADE_POOL.map((x) => [x.id, x]));
const UPGRADE_LABEL_MAP = Object.fromEntries(ALL_UPGRADE_POOL.map((x) => [x.id, x.label]));
const SPECIALIZATION_LABEL_MAP = Object.fromEntries(ALL_SPECIALIZATION_POOL.map((x) => [x.id, x.label]));
const BGM_PATTERN = [52, 55, 59, 55, 60, 59, 55, 52, 50, 52, 55, 57, 55, 52, 50, 48];
const UPDATE_LOG_ITEMS = [
    '新增輔助塔：可提供攻擊/速度/緩速/暴擊/幸運靈氣。',
    '左側塔資訊面板改為可點選同步（非 hover）。',
    '怪物資訊面板改為左右雙欄（當波/下波）。',
    '新增道具與裝備效果顯示與平衡調整。'
];

const Game = ({ onExit }) => {
    const { talents, resources, settings, addResource, recordRunSession } = useGame();
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const visualsRef = useRef({});
    const topBarRef = useRef(null);
    const waveStartTimeoutRef = useRef(null);
    const audioCtxRef = useRef(null);
    const bgmGainRef = useRef(null);
    const sfxGainRef = useRef(null);
    const bgmTimerRef = useRef(null);
    const bgmStepRef = useRef(0);
    const bgmNextTimeRef = useRef(0);
    const sfxEnabledRef = useRef(true);
    const combatSfxCooldownRef = useRef({ attack: 0, explosion: 0 });
    const sessionStartRef = useRef(Date.now());
    const exitHandledRef = useRef(false);
    const isPausedRef = useRef(false);
    const isInteractionModalOpenRef = useRef(false);
    const gameOverRef = useRef(false);

    const [mapData] = useState(() => generateMap(15, 15));
    const [grid, setGrid] = useState(mapData.grid);

    const [gameState, setGameState] = useState({
        gold: 200,
        wave: 1,
        hp: 5,
        maxHp: 5,
        mobsCount: 0,
        waveActive: false,
        gameSpeed: 1,
        gameSpeedCap: 5,
        pendingUpgradePoints: 0
    });

    const [gameOver, setGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    const [buildTarget, setBuildTarget] = useState(null); // {x, y}
    const [upgradeTarget, setUpgradeTarget] = useState(null); // {x, y}
    const [upgradeOptions, setUpgradeOptions] = useState([]);
    const [towerPanelMode, setTowerPanelMode] = useState('upgrade'); // upgrade | specialization
    const [selectedTowerId, setSelectedTowerId] = useState(null);
    const [viewport, setViewport] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 1280,
        height: typeof window !== 'undefined' ? window.innerHeight : 720
    });
    const [inventory, setInventory] = useState(() => {
        const initial = [];
        if ((talents?.equip_absorption_force || 0) > 0) {
            initial.push({ id: 'absorption_force', count: 1 });
        }
        return initial;
    }); // [{id, count}]
    const [selectedItemId, setSelectedItemId] = useState(null);
    const [, setDropLog] = useState([]);
    const [consoleLog, setConsoleLog] = useState([]);
    const [inventoryTab, setInventoryTab] = useState(ITEM_TYPES.CONSUMABLE);
    const [inventoryPageByType, setInventoryPageByType] = useState({
        [ITEM_TYPES.CONSUMABLE]: 0,
        [ITEM_TYPES.EQUIPMENT]: 0
    });
    const [mobilePanelTab, setMobilePanelTab] = useState('consumable'); // consumable | equipment | wave | towers | rank
    const [topBarHeight, setTopBarHeight] = useState(70);
    const [bgmEnabled, setBgmEnabled] = useState(settings?.bgmEnabled !== false);
    const [sfxEnabled, setSfxEnabled] = useState(settings?.sfxEnabled !== false);

    const isInteractionModalOpen = !!buildTarget || !!upgradeTarget;

    const clearAutoWaveTimer = () => {
        if (waveStartTimeoutRef.current) {
            window.clearTimeout(waveStartTimeoutRef.current);
            waveStartTimeoutRef.current = null;
        }
    };

    const queueAutoWaveStart = (delayMs = 2000) => {
        clearAutoWaveTimer();
        const tryStartWave = () => {
            const eng = engineRef.current;
            if (!eng || eng.hp <= 0 || eng.victory) {
                waveStartTimeoutRef.current = null;
                return;
            }
            if (eng.waveActive) {
                waveStartTimeoutRef.current = null;
                return;
            }
            if (eng.paused || isPausedRef.current || isInteractionModalOpenRef.current || gameOverRef.current) {
                waveStartTimeoutRef.current = window.setTimeout(tryStartWave, 250);
                return;
            }
            triggerSfx('wave');
            eng.startNextWave();
            waveStartTimeoutRef.current = null;
        };
        waveStartTimeoutRef.current = window.setTimeout(tryStartWave, delayMs);
    };

    const handleExitWithRecord = () => {
        if (exitHandledRef.current) return;
        exitHandledRef.current = true;

        const engine = engineRef.current;
        const towers = engine?.towers || [];
        const mvp = towers.length
            ? [...towers].sort((a, b) => (b.totalDamageDealt || 0) - (a.totalDamageDealt || 0))[0]
            : null;

        recordRunSession?.({
            highestWave: Math.max(1, Math.floor(engine?.wave || gameState.wave || 1)),
            durationSec: Math.floor((Date.now() - sessionStartRef.current) / 1000),
            playedAt: new Date().toISOString(),
            mvpTowerName: mvp ? getTowerName(mvp.type) : '無',
            mvpTowerDamage: Math.floor(mvp?.totalDamageDealt || 0)
        });

        onExit();
    };

    useEffect(() => {
        const nextBgmEnabled = settings?.bgmEnabled !== false;
        const nextSfxEnabled = settings?.sfxEnabled !== false;
        setBgmEnabled(nextBgmEnabled);
        setSfxEnabled(nextSfxEnabled);
        sfxEnabledRef.current = nextSfxEnabled;
    }, [settings?.bgmEnabled, settings?.sfxEnabled]);

    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    useEffect(() => {
        isInteractionModalOpenRef.current = isInteractionModalOpen;
    }, [isInteractionModalOpen]);

    useEffect(() => {
        gameOverRef.current = gameOver;
    }, [gameOver]);

    useEffect(() => {
        sfxEnabledRef.current = sfxEnabled;
    }, [sfxEnabled]);

    useEffect(() => {
        if (!selectedItemId) return;
        const stillExists = inventory.some((entry) => entry.id === selectedItemId);
        if (!stillExists) {
            setSelectedItemId(null);
        }
    }, [inventory, selectedItemId]);

    useEffect(() => {
        const onResize = () => {
            const vv = window.visualViewport;
            setViewport({
                width: vv?.width || window.innerWidth,
                height: vv?.height || window.innerHeight
            });
        };
        window.addEventListener('resize', onResize);
        window.visualViewport?.addEventListener('resize', onResize);
        onResize();
        return () => {
            window.removeEventListener('resize', onResize);
            window.visualViewport?.removeEventListener('resize', onResize);
        };
    }, []);

    useEffect(() => {
        if (!topBarRef.current) return;
        const updateHeight = () => {
            const h = Math.ceil(topBarRef.current?.getBoundingClientRect().height || 70);
            setTopBarHeight((prev) => (prev === h ? prev : h));
        };
        updateHeight();
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, [viewport.width, gameState.waveActive, gameOver, isPaused]);

    const ensureAudioContext = () => {
        if (typeof window === 'undefined') return null;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;

        if (!audioCtxRef.current) {
            const ctx = new AudioCtx();
            const bgmGain = ctx.createGain();
            const sfxGain = ctx.createGain();
            bgmGain.gain.value = 0.28;
            sfxGain.gain.value = 0.1;
            bgmGain.connect(ctx.destination);
            sfxGain.connect(ctx.destination);
            audioCtxRef.current = ctx;
            bgmGainRef.current = bgmGain;
            sfxGainRef.current = sfxGain;
        }

        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
        return audioCtxRef.current;
    };

    const triggerSfx = (kind) => {
        if (!sfxEnabledRef.current) return;
        const ctx = ensureAudioContext();
        if (!ctx || !sfxGainRef.current) return;

        const now = ctx.currentTime;
        const playTone = (freq, duration, offset = 0, type = 'triangle', volume = 1) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, now + offset);
            gain.gain.setValueAtTime(0.0001, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.16 * volume, now + offset + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + duration);
            osc.connect(gain);
            gain.connect(sfxGainRef.current);
            osc.start(now + offset);
            osc.stop(now + offset + duration + 0.01);
        };

        if (kind === 'wave') {
            playTone(523.25, 0.11, 0, 'square', 0.8);
            playTone(659.25, 0.14, 0.1, 'square', 0.7);
            return;
        }
        if (kind === 'build') {
            playTone(392, 0.08, 0, 'triangle', 0.75);
            playTone(523.25, 0.12, 0.08, 'triangle', 0.7);
            return;
        }
        if (kind === 'attack') {
            playTone(420, 0.05, 0, 'square', 0.48);
            return;
        }
        if (kind === 'explosion') {
            playTone(155, 0.08, 0, 'sawtooth', 0.55);
            playTone(110, 0.12, 0.04, 'sawtooth', 0.45);
            return;
        }
        if (kind === 'upgrade') {
            playTone(659.25, 0.08, 0, 'triangle', 0.8);
            playTone(783.99, 0.12, 0.08, 'triangle', 0.8);
            return;
        }
        if (kind === 'drop') {
            playTone(880, 0.08, 0, 'sine', 0.55);
            return;
        }
        if (kind === 'item') {
            playTone(698.46, 0.08, 0, 'triangle', 0.7);
            playTone(932.33, 0.09, 0.08, 'triangle', 0.65);
            return;
        }
        if (kind === 'victory') {
            playTone(659.25, 0.12, 0, 'triangle', 0.85);
            playTone(783.99, 0.13, 0.12, 'triangle', 0.85);
            playTone(1046.5, 0.17, 0.24, 'triangle', 0.85);
            return;
        }
        if (kind === 'defeat') {
            playTone(329.63, 0.16, 0, 'sawtooth', 0.7);
            playTone(246.94, 0.2, 0.14, 'sawtooth', 0.72);
            return;
        }
        if (kind === 'error') {
            playTone(220, 0.09, 0, 'square', 0.6);
            playTone(196, 0.09, 0.08, 'square', 0.6);
        }
    };

    const stopBgmLoop = () => {
        if (bgmTimerRef.current) {
            window.clearInterval(bgmTimerRef.current);
            bgmTimerRef.current = null;
        }
    };

    const startBgmLoop = () => {
        if (!bgmEnabled || bgmTimerRef.current) return;
        const ctx = ensureAudioContext();
        if (!ctx || !bgmGainRef.current) return;

        bgmStepRef.current = 0;
        bgmNextTimeRef.current = ctx.currentTime + 0.05;
        const stepDuration = 0.28;

        bgmTimerRef.current = window.setInterval(() => {
            const audioCtx = audioCtxRef.current;
            if (!audioCtx || !bgmGainRef.current) return;

            while (bgmNextTimeRef.current < audioCtx.currentTime + 0.4) {
                const midi = BGM_PATTERN[bgmStepRef.current % BGM_PATTERN.length];
                const freq = 440 * (2 ** ((midi - 69) / 12));
                const noteTime = bgmNextTimeRef.current;

                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, noteTime);
                gain.gain.setValueAtTime(0.0001, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.05, noteTime + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + stepDuration * 0.95);
                osc.connect(gain);
                gain.connect(bgmGainRef.current);
                osc.start(noteTime);
                osc.stop(noteTime + stepDuration);

                bgmStepRef.current += 1;
                bgmNextTimeRef.current += stepDuration;
            }
        }, 120);
    };

    useEffect(() => {
        if (bgmEnabled) {
            startBgmLoop();
        } else {
            stopBgmLoop();
        }
    }, [bgmEnabled]);

    useEffect(() => () => {
        stopBgmLoop();
        if (audioCtxRef.current) {
            audioCtxRef.current.close();
            audioCtxRef.current = null;
        }
    }, []);

    useEffect(() => {
        const loadImg = (src) => {
            const img = new Image();
            img.src = src;
            return img;
        };

        visualsRef.current = {
            normal: loadImg('/monster_normal.png'),
            fire: loadImg('/monster_fire.png'),
            water: loadImg('/monster_water.png'),
            wood: loadImg('/monster_wood.png'),
            magic_tower: loadImg('/magic_tower.png'),
            melee_tower: loadImg('/melee_tower.png'),
            projectile_tower: loadImg('/projectile_tower.png'),
            slow_tower: loadImg('/slow_tower.png'),
            aoe_tower: loadImg('/aoe_tower.png'),
            support_tower: loadImg('/support_tower.png'),
            spell_1: loadImg('/spell_1.png'),
            spell_2: loadImg('/spell_2.png'),
            spell_3: loadImg('/spell_3.png'),
            spell_4: loadImg('/spell_4.png'),
            melee_hit_1: loadImg('/melee_hit_1.png'),
            melee_hit_2: loadImg('/melee_hit_2.png'),
            melee_hit_3: loadImg('/melee_hit_3.png'),
            proj_hit_1: loadImg('/proj_hit_1.png'),
            proj_hit_2: loadImg('/proj_hit_2.png'),
            proj_hit_3: loadImg('/proj_hit_3.png'),
            tornado_1: loadImg('/tornado_1.png'),
            tornado_2: loadImg('/tornado_2.png'),
            tornado_3: loadImg('/tornado_3.png'),
            water_1: loadImg('/water_1.png'),
            water_2: loadImg('/water_2.png'),
            water_3: loadImg('/water_3.png'),
            lightning_1: loadImg('/lightning_1.png'),
            lightning_2: loadImg('/lightning_2.png'),
            lightning_3: loadImg('/lightning_3.png'),
            fire_vortex_1: loadImg('/fire_vortex_1.png'),
            fire_vortex_2: loadImg('/fire_vortex_2.png'),
            fire_vortex_3: loadImg('/fire_vortex_3.png'),
            eruption_1: loadImg('/eruption_1.png'),
            eruption_2: loadImg('/eruption_2.png'),
            eruption_3: loadImg('/eruption_3.png'),
            leaf: loadImg('/leaf.png'),
            water_drop: loadImg('/water_drop.png'),
            bullet_arrow: loadImg('/bullet_arrow.png'),
            bullet_slow: loadImg('/bullet_slow.png'),
            bullet_aoe: loadImg('/bullet_aoe.png')
        };
    }, []);

    useEffect(() => {
        const engine = new GameEngine(mapData.grid, mapData.path, talents, {
            onGameOver: () => {
                triggerSfx('defeat');
                setGameOver(true);
                setIsPaused(false);
                clearAutoWaveTimer();
                engine.stop();
            },
            onWaveComplete: (wave) => {
                triggerSfx('wave');
                appendConsoleLog(`第 ${wave - 1} 波完成`);
                queueAutoWaveStart(2000);
            },
            onResourceDrop: (type, amount) => {
                addResource(type, amount);
                appendConsoleLog(`資源掉落: ${type} +${amount}`);
            },
            onItemDrop: (itemId, count = 1, fromMobType = 'unknown') => {
                const def = ITEM_DEFS[itemId];
                if (!def) return;
                triggerSfx('drop');
                setInventory((prev) => {
                    const found = prev.find((entry) => entry.id === itemId);
                    if (found) {
                        return prev.map((entry) => (
                            entry.id === itemId ? { ...entry, count: entry.count + count } : entry
                        ));
                    }
                    return [...prev, { id: itemId, count }];
                });
                setDropLog((prev) => [
                    `${def.name} +${count}（來源: ${fromMobType}）`,
                    ...prev
                ].slice(0, 5));
                appendConsoleLog(`道具掉落: ${def.name} +${count}（來源: ${fromMobType}）`);
            },
            onTowerUpgradeAvailable: () => {
                // Pending points are rendered via requestDraw.
            },
            onTowerSpecializationAvailable: () => {
                // Specialization state is read from tower data when clicking towers.
            },
            requestDraw: () => {
                const pendingUpgradePoints = engine.towers.reduce(
                    (sum, tower) => sum + (tower.pendingUpgrades || 0) + (tower.pendingSpecialization ? 1 : 0),
                    0
                );
                setGameState({
                    gold: engine.gold,
                    wave: engine.wave,
                    hp: engine.hp,
                    maxHp: engine.maxHp,
                    mobsCount: engine.mobs.length,
                    waveActive: engine.waveActive,
                    gameSpeed: engine.getGameSpeedMultiplier(),
                    gameSpeedCap: engine.getMaxGameSpeedMultiplier(),
                    pendingUpgradePoints
                });
            }
        });

        engineRef.current = engine;
        engine.start();
        queueAutoWaveStart(2000);

        let animationFrameId;
        const renderLoop = () => {
            animationFrameId = requestAnimationFrame(renderLoop);

            if (!canvasRef.current || !engineRef.current) return;

            const ctx = canvasRef.current.getContext('2d');
            const eng = engineRef.current;
            const images = visualsRef.current;
            const nowMs = performance.now();
            const canPlayCombatSfx = !eng.paused && !isPausedRef.current && !isInteractionModalOpenRef.current && !gameOverRef.current;
            if (canPlayCombatSfx) {
                const hasAttackEffect = eng.effects.some((eff) => eff.type === 'hit' || eff.type === 'slash');
                const hasExplosionEffect = eng.effects.some((eff) => (
                    eff.type === 'magic_burst'
                    || eff.type === 'fire_burst'
                    || eff.type === 'water_burst'
                    || eff.type === 'wood_burst'
                ));

                if (hasAttackEffect && nowMs - combatSfxCooldownRef.current.attack > 90) {
                    triggerSfx('attack');
                    combatSfxCooldownRef.current.attack = nowMs;
                }
                if (hasExplosionEffect && nowMs - combatSfxCooldownRef.current.explosion > 160) {
                    triggerSfx('explosion');
                    combatSfxCooldownRef.current.explosion = nowMs;
                }
            }

            ctx.clearRect(0, 0, 600, 600);

            eng.mobs.forEach((mob) => {
                if (mob.x === undefined || mob.y === undefined) return;

                let img = images.normal;
                if (mob.type === 'fire') img = images.fire;
                if (mob.type === 'water') img = images.water;
                if (mob.type === 'wood') img = images.wood;

                const w = mob.isBoss ? 40 : 30;
                const h = mob.isBoss ? 40 : 30;
                const screenX = mob.x * CELL_SIZE + CELL_SIZE / 2 - w / 2;
                const screenY = mob.y * CELL_SIZE + CELL_SIZE / 2 - h / 2;

                if (img && img.complete) {
                    ctx.drawImage(img, screenX, screenY, w, h);
                } else {
                    ctx.fillStyle = getMobColor(mob.type);
                    ctx.beginPath();
                    ctx.arc(mob.x * CELL_SIZE, mob.y * CELL_SIZE, 10, 0, Math.PI * 2);
                    ctx.fill();
                }

                const mobCx = mob.x * CELL_SIZE + CELL_SIZE / 2;
                const mobCy = mob.y * CELL_SIZE + CELL_SIZE / 2;
                const pulse = (Math.sin(nowMs * 0.02) + 1) * 0.5;

                if ((mob.stunVisualTimer || 0) > 0) {
                    ctx.fillStyle = `rgba(255, 220, 90, ${0.45 + pulse * 0.4})`;
                    for (let i = 0; i < 3; i++) {
                        const a = (nowMs * 0.006) + (i * (Math.PI * 2 / 3));
                        ctx.beginPath();
                        ctx.arc(mobCx + Math.cos(a) * 11, mobCy - 14 + Math.sin(a) * 4, 2.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                if ((mob.palsyVisualTimer || 0) > 0) {
                    ctx.strokeStyle = `rgba(120, 220, 255, ${0.45 + pulse * 0.5})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(mobCx - 8, mobCy - 6);
                    ctx.lineTo(mobCx - 2, mobCy - 12);
                    ctx.lineTo(mobCx + 1, mobCy - 4);
                    ctx.lineTo(mobCx + 7, mobCy - 10);
                    ctx.stroke();
                }

                if ((mob.slowMultiplier || 1) < 0.99 || (mob.slowEffectTimer || 0) > 0) {
                    ctx.strokeStyle = `rgba(120, 180, 255, ${0.25 + pulse * 0.35})`;
                    ctx.lineWidth = 1.8;
                    ctx.beginPath();
                    ctx.arc(mobCx, mobCy, 12 + pulse * 2, 0, Math.PI * 2);
                    ctx.stroke();
                }

                if ((mob.knockbackFxTimer || 0) > 0) {
                    ctx.strokeStyle = 'rgba(255, 170, 90, 0.75)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(mobCx - 10, mobCy + 6);
                    ctx.lineTo(mobCx - 16, mobCy + 10);
                    ctx.moveTo(mobCx - 8, mobCy);
                    ctx.lineTo(mobCx - 15, mobCy + 2);
                    ctx.stroke();
                }

                if ((mob.poisonStacks?.length || 0) > 0 || (mob.poisonEffectTimer || 0) > 0) {
                    ctx.fillStyle = `rgba(100, 255, 130, ${0.25 + pulse * 0.35})`;
                    ctx.beginPath();
                    ctx.arc(mobCx + 7, mobCy - 10, 3, 0, Math.PI * 2);
                    ctx.arc(mobCx - 6, mobCy - 8, 2.2, 0, Math.PI * 2);
                    ctx.fill();
                }

                const hpPct = Math.max(0, mob.hp / mob.maxHp);
                const hue = hpPct * 120;

                const barW = 24;
                const barH = 4;
                const barX = (mob.x * CELL_SIZE) + (CELL_SIZE - barW) / 2;
                const barY = (mob.y * CELL_SIZE) + 2;

                ctx.strokeStyle = '#333';
                ctx.strokeRect(barX, barY, barW, barH);
                ctx.fillStyle = '#333';
                ctx.fillRect(barX, barY, barW, barH);

                ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                ctx.fillRect(barX, barY, barW * hpPct, barH);

                if (mob.isBoss) {
                    ctx.strokeStyle = '#ffd166';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(screenX, screenY, w, h);
                    ctx.fillStyle = '#ffd166';
                    ctx.font = 'bold 11px sans-serif';
                    ctx.fillText('B', screenX + w - 10, screenY + 12);
                }
            });

            eng.projectiles.forEach((proj) => {
                const type = proj.sourceTower?.type;
                let bulletImg = null;

                if (type === 'projectile') bulletImg = images.bullet_arrow;
                else if (type === 'projectile_slow') bulletImg = images.bullet_slow;
                else if (type === 'projectile_aoe') bulletImg = images.bullet_aoe;

                if (bulletImg && bulletImg.complete && bulletImg.naturalHeight > 0) {
                    const dx = proj.lastKnownTargetX - proj.x;
                    const dy = proj.lastKnownTargetY - proj.y;
                    const angle = Math.atan2(dy, dx);

                    ctx.save();
                    ctx.translate(proj.x * CELL_SIZE, proj.y * CELL_SIZE);
                    ctx.rotate(angle);
                    const w = CELL_SIZE * 0.8;
                    const h = CELL_SIZE * 0.8;
                    ctx.drawImage(bulletImg, -w / 2, -h / 2, w, h);
                    ctx.restore();
                    return;
                }

                let projectileColor = '#ffd54a';
                if (type === 'projectile_slow') projectileColor = '#66b8ff';
                if (type === 'projectile_aoe') projectileColor = '#ff4d4d';
                if (type === 'magic') projectileColor = '#b67bff';

                if (proj.isNatureFusion) {
                    if (proj.visualType === 'leaf') {
                        const img = images['leaf'];
                        if (img && img.complete && img.naturalHeight > 0) {
                            ctx.save();
                            ctx.translate(proj.x * CELL_SIZE, proj.y * CELL_SIZE);
                            const dx = proj.lastKnownTargetX - proj.x;
                            const dy = proj.lastKnownTargetY - proj.y;
                            const wobble = Math.sin(Date.now() / 80 + proj.id * 10) * 0.3;
                            ctx.rotate(Math.atan2(dy, dx) + Math.PI / 2 + wobble);
                            const w = CELL_SIZE * 0.4;
                            const h = CELL_SIZE * 0.4;
                            ctx.drawImage(img, -w / 2, -h / 2, w, h);
                            ctx.restore();
                            return;
                        }
                    } else if (proj.visualType === 'water_drop') {
                        const img = images['water_drop'];
                        if (img && img.complete && img.naturalHeight > 0) {
                            ctx.save();
                            ctx.translate(proj.x * CELL_SIZE, proj.y * CELL_SIZE);
                            const dx = proj.lastKnownTargetX - proj.x;
                            const dy = proj.lastKnownTargetY - proj.y;
                            const wobble = Math.sin(Date.now() / 80 + proj.id * 10) * 0.2;
                            ctx.rotate(Math.atan2(dy, dx) - Math.PI / 2 + wobble);
                            const w = CELL_SIZE * 0.4;
                            const h = CELL_SIZE * 0.4;
                            ctx.drawImage(img, -w / 2, -h / 2, w, h);
                            ctx.restore();
                            return;
                        }
                    }
                }

                ctx.fillStyle = projectileColor;
                ctx.beginPath();
                ctx.arc(proj.x * CELL_SIZE, proj.y * CELL_SIZE, 4, 0, Math.PI * 2);
                ctx.fill();
            });

            eng.effects.forEach((eff) => {
                const cx = eff.x * CELL_SIZE;
                const cy = eff.y * CELL_SIZE;

                if (eff.type === 'slash') {
                    const pct = Math.max(0, 1 - (eff.life / 0.3));
                    let frameNum = 1;
                    if (pct > 0.66) frameNum = 3;
                    else if (pct > 0.33) frameNum = 2;
                    const frameImg = images[`melee_hit_${frameNum}`];

                    if (frameImg && frameImg.complete && frameImg.naturalHeight > 0) {
                        ctx.save();
                        ctx.translate(cx, cy);
                        if (eff.angle !== undefined) {
                            ctx.rotate(eff.angle);
                        }
                        const r = CELL_SIZE * 0.8;
                        ctx.globalAlpha = eff.life / 0.3;
                        ctx.drawImage(frameImg, -r / 2, -r / 2, r, r);
                        ctx.restore();
                    } else {
                        ctx.strokeStyle = `rgba(255, 255, 255, ${eff.life / 0.3})`;
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        const startAngle = (eff.angle || 0) - Math.PI / 4;
                        const endAngle = (eff.angle || 0) + Math.PI / 4;
                        ctx.arc(cx, cy, 20, startAngle, endAngle);
                        ctx.stroke();
                    }
                } else if (eff.type === 'hit') {
                    ctx.fillStyle = `rgba(255, 255, 0, ${eff.life / 0.3})`;
                    ctx.beginPath();
                    ctx.arc(cx, cy, 10 * (1 - eff.life / 0.3), 0, Math.PI * 2);
                    ctx.fill();
                } else if (eff.type === 'magic_orb') {
                    const alpha = Math.max(0, eff.life / (eff.maxLife || 0.12));
                    ctx.fillStyle = `rgba(182, 123, 255, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
                    ctx.fill();
                } else if (eff.type === 'magic_burst') {
                    const alpha = Math.max(0, eff.life / (eff.maxLife || 0.28));
                    ctx.strokeStyle = `rgba(198, 150, 255, ${alpha})`;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(cx, cy, 16 * (1 - alpha * 0.2), 0, Math.PI * 2);
                    ctx.stroke();
                } else if (eff.type === 'fire_burst') {
                    const alpha = Math.max(0, eff.life / (eff.maxLife || 0.28));
                    ctx.fillStyle = `rgba(255, 115, 90, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(cx, cy, 12 * (1 - alpha * 0.1), 0, Math.PI * 2);
                    ctx.fill();
                } else if (eff.type === 'water_burst') {
                    const alpha = Math.max(0, eff.life / (eff.maxLife || 0.3));
                    ctx.strokeStyle = `rgba(111, 180, 255, ${alpha})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(cx, cy, 8 + (1 - alpha) * 12, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (eff.type === 'wood_burst') {
                    const alpha = Math.max(0, eff.life / (eff.maxLife || 0.35));
                    ctx.strokeStyle = `rgba(120, 220, 140, ${alpha})`;
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.moveTo(cx - 10, cy + 10);
                    ctx.lineTo(cx + 10, cy - 10);
                    ctx.moveTo(cx + 10, cy + 10);
                    ctx.lineTo(cx - 10, cy - 10);
                    ctx.stroke();
                } else if (eff.type === 'fire_spell') {
                    const alpha = Math.max(0, eff.life / (eff.maxLife || 0.35));

                    const pct = Math.max(0, 1 - (eff.life / (eff.maxLife || 0.35)));
                    let frameNum = 1;
                    if (pct > 0.75) frameNum = 4;
                    else if (pct > 0.5) frameNum = 3;
                    else if (pct > 0.25) frameNum = 2;

                    const frameImg = images[`spell_${frameNum}`];
                    if (frameImg && frameImg.complete && frameImg.naturalHeight > 0) {
                        ctx.globalAlpha = alpha;
                        ctx.drawImage(frameImg, cx - CELL_SIZE / 2, cy - CELL_SIZE / 2, CELL_SIZE, CELL_SIZE);
                        ctx.globalAlpha = 1.0;
                    } else {
                        ctx.strokeStyle = `rgba(255, 120, 80, ${alpha})`;
                        ctx.lineWidth = 2.2;
                        ctx.beginPath();
                        ctx.arc(cx, cy, ((eff.radius || 2) * CELL_SIZE * 0.35) + (1 - alpha) * 10, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                } else if (eff.type === 'water_spell') {
                    const alpha = Math.max(0, eff.life / (eff.maxLife || 0.35));
                    const pct = Math.max(0, 1 - (eff.life / (eff.maxLife || 0.35)));
                    let frameNum = Math.min(3, Math.max(1, Math.ceil(pct * 3)));

                    const frameImg = images[`water_${frameNum}`];
                    if (frameImg && frameImg.complete && frameImg.naturalHeight > 0) {
                        ctx.globalAlpha = Math.min(0.75, alpha); // allow monster to be seen under ice
                        // Limit to slightly larger than monster but within grid size
                        const drawSize = CELL_SIZE * 1.2;
                        ctx.drawImage(frameImg, cx - drawSize / 2, cy - drawSize / 2, drawSize, drawSize);
                        ctx.globalAlpha = 1.0;
                    } else {
                        ctx.strokeStyle = `rgba(120, 190, 255, ${alpha})`;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(cx, cy, ((eff.radius || 2) * CELL_SIZE * 0.3) + (1 - alpha) * 12, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                } else if (eff.type === 'fire_aura_proc') {
                    const alpha = Math.max(0, eff.life / (eff.maxLife || 0.3));
                    const r = ((eff.radius || 2) * CELL_SIZE * 0.28) + (1 - alpha) * 10;
                    ctx.strokeStyle = `rgba(255, 145, 95, ${alpha})`;
                    ctx.lineWidth = 2.4;
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.fillStyle = `rgba(255, 110, 70, ${alpha * 0.28})`;
                    ctx.beginPath();
                    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
                    ctx.fill();
                } else if (eff.type === 'water_aura_proc') {
                    const alpha = Math.max(0, eff.life / (eff.maxLife || 0.32));
                    ctx.strokeStyle = `rgba(120, 215, 255, ${alpha})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(cx, cy, 7 + (1 - alpha) * 14, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(cx, cy, 4 + (1 - alpha) * 8, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (eff.type === 'lightning_strike') {
                    const alpha = Math.max(0, eff.life / (eff.maxLife || 0.16));
                    const pct = Math.max(0, 1 - (eff.life / (eff.maxLife || 0.16)));
                    let frameNum = Math.min(3, Math.max(1, Math.ceil(pct * 3)));

                    const frameImg = images[`lightning_${frameNum}`];
                    if (frameImg && frameImg.complete && frameImg.naturalHeight > 0) {
                        ctx.globalAlpha = alpha;
                        const w = CELL_SIZE;
                        const h = CELL_SIZE * 3;
                        ctx.drawImage(frameImg, cx - w / 2, cy - h / 2 - CELL_SIZE, w, h);
                        ctx.globalAlpha = 1.0;
                    } else {
                        ctx.strokeStyle = `rgba(150, 230, 255, ${alpha})`;
                        ctx.lineWidth = 2.2;
                        ctx.beginPath();
                        ctx.moveTo(cx - 3, cy - 12);
                        ctx.lineTo(cx + 2, cy - 5);
                        ctx.lineTo(cx - 1, cy - 1);
                        ctx.lineTo(cx + 4, cy + 6);
                        ctx.stroke();
                    }
                } else if (eff.type === 'chain_arc') {
                    const alpha = Math.max(0, eff.life / (eff.maxLife || 0.12));
                    const pct = Math.max(0, 1 - (eff.life / (eff.maxLife || 0.12)));
                    let frameNum = Math.min(3, Math.max(1, Math.ceil(pct * 3)));

                    const fromX = (eff.fromX ?? eff.x) * CELL_SIZE;
                    const fromY = (eff.fromY ?? eff.y) * CELL_SIZE;
                    const toX = (eff.toX ?? eff.x) * CELL_SIZE;
                    const toY = (eff.toY ?? eff.y) * CELL_SIZE;

                    const frameImg = images[`lightning_${frameNum}`];
                    if (frameImg && frameImg.complete && frameImg.naturalHeight > 0) {
                        const dx = toX - fromX;
                        const dy = toY - fromY;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const angle = Math.atan2(dy, dx);

                        ctx.save();
                        ctx.globalAlpha = alpha;
                        ctx.translate(fromX, fromY);
                        ctx.rotate(angle - Math.PI / 2);
                        const width = CELL_SIZE / 1.5;
                        ctx.drawImage(frameImg, -width / 2, 0, width, dist);
                        ctx.restore();
                    } else {
                        ctx.strokeStyle = `rgba(140, 220, 255, ${alpha})`;
                        ctx.lineWidth = 1.8;
                        const midX = (fromX + toX) * 0.5 + ((Math.random() - 0.5) * 12);
                        const midY = (fromY + toY) * 0.5 + ((Math.random() - 0.5) * 12);
                        ctx.beginPath();
                        ctx.moveTo(fromX, fromY);
                        ctx.lineTo(midX, midY);
                        ctx.lineTo(toX, toY);
                        ctx.stroke();
                    }
                }
            });

            eng.areaEffects?.forEach((area) => {
                const cx = area.x * CELL_SIZE;
                const cy = area.y * CELL_SIZE;

                if (area.type === 'tornado') {
                    const alpha = Math.max(0, area.life / 3);
                    const pct = (performance.now() % 300) / 300;
                    let frameNum = Math.min(3, Math.max(1, Math.ceil(pct * 3)));

                    const frameImg = images[`tornado_${frameNum}`];
                    if (frameImg && frameImg.complete && frameImg.naturalHeight > 0) {
                        ctx.globalAlpha = Math.min(1, alpha);
                        const radius = area.radius * CELL_SIZE;
                        ctx.drawImage(frameImg, cx - radius, cy - radius, radius * 2, radius * 2);
                        ctx.globalAlpha = 1.0;
                    } else {
                        ctx.strokeStyle = `rgba(120, 220, 140, ${Math.min(1, alpha)})`;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(cx, cy, area.radius * CELL_SIZE, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                } else if (area.type === 'fusion_fire_wood') {
                    const alpha = Math.max(0, area.life / 3);
                    const pct = (performance.now() % 300) / 300;
                    let frameNum = Math.min(3, Math.max(1, Math.ceil(pct * 3)));

                    const frameImg = images[`fire_vortex_${frameNum}`];
                    if (frameImg && frameImg.complete && frameImg.naturalHeight > 0) {
                        ctx.globalAlpha = Math.min(1, alpha);
                        const radius = 1.5 * CELL_SIZE;
                        ctx.drawImage(frameImg, cx - radius, cy - radius, radius * 2, radius * 2);
                        ctx.globalAlpha = 1.0;
                    } else {
                        ctx.strokeStyle = `rgba(255, 100, 50, ${Math.min(1, alpha)})`;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(cx, cy, 1.5 * CELL_SIZE, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                } else if (area.type === 'fusion_fire_water') {
                    const alpha = Math.max(0, area.life / 3);
                    const flowScale = 1 + Math.sin(performance.now() / 300) * 0.05; // flowing magma feel

                    const frameImg = images['eruption_1'];
                    if (frameImg && frameImg.complete && frameImg.naturalHeight > 0) {
                        ctx.globalAlpha = Math.min(0.7, area.life / 1.5);
                        const radius = 1.5 * CELL_SIZE * flowScale;
                        ctx.drawImage(frameImg, cx - radius, cy - radius, radius * 2, radius * 2);
                        ctx.globalAlpha = 1.0;
                    } else {
                        ctx.strokeStyle = `rgba(100, 200, 255, ${Math.min(1, alpha)})`;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(cx, cy, 1.5 * CELL_SIZE * flowScale, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }
            });

            ctx.font = 'bold 14px "Segoe UI", Arial';
            ctx.textAlign = 'center';
            eng.floatingTexts.forEach((ft) => {
                ctx.fillStyle = ft.forceColor || ft.color || 'white';
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;
                ctx.strokeText(ft.text, ft.x * CELL_SIZE, ft.y * CELL_SIZE);
                ctx.fillText(ft.text, ft.x * CELL_SIZE, ft.y * CELL_SIZE);
            });
        };

        renderLoop();

        return () => {
            engine.stop();
            cancelAnimationFrame(animationFrameId);
            clearAutoWaveTimer();
            engineRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!engineRef.current) return;

        if (gameOver || isInteractionModalOpen || isPaused) {
            engineRef.current.stop();
            return;
        }

        engineRef.current.resume();
    }, [gameOver, isInteractionModalOpen, isPaused]);

    const upgradeTower = useMemo(() => {
        if (!upgradeTarget || !engineRef.current) return null;
        return engineRef.current.getTowerAt(upgradeTarget.x, upgradeTarget.y);
    }, [upgradeTarget, gameState.pendingUpgradePoints]);

    const selectedTower = useMemo(() => {
        if (!selectedTowerId || !engineRef.current) return null;
        return engineRef.current.towers.find((tower) => tower.id === selectedTowerId) || null;
    }, [selectedTowerId, gameState.pendingUpgradePoints, gameState.mobsCount]);

    useEffect(() => {
        if (selectedTowerId && !selectedTower) {
            setSelectedTowerId(null);
        }
    }, [selectedTowerId, selectedTower]);

    const upgradeAuraSnapshot = useMemo(() => {
        if (!upgradeTower || !engineRef.current) return null;
        return engineRef.current.getTowerAuraSnapshot?.(upgradeTower) || null;
    }, [upgradeTower, gameState.mobsCount, gameState.pendingUpgradePoints]);

    const upgradeSupportAuraStatus = useMemo(() => {
        if (!upgradeTower || !engineRef.current || !isSupportTower(upgradeTower)) return null;
        return engineRef.current.getSupportAuraStatus?.(upgradeTower) || null;
    }, [upgradeTower, gameState.mobsCount, gameState.pendingUpgradePoints]);

    const buildCell = useMemo(() => {
        if (!buildTarget) return null;
        return grid[buildTarget.y]?.[buildTarget.x] || null;
    }, [buildTarget, grid]);

    const upgradeCell = useMemo(() => {
        if (!upgradeTarget) return null;
        return grid[upgradeTarget.y]?.[upgradeTarget.x] || null;
    }, [upgradeTarget, grid]);

    const selectedInventoryItem = useMemo(() => {
        if (!selectedItemId) return null;
        const stack = inventory.find((entry) => entry.id === selectedItemId);
        if (!stack) return null;
        const def = ITEM_DEFS[selectedItemId];
        if (!def) return null;
        return { ...def, count: stack.count };
    }, [inventory, selectedItemId]);

    const inventoryByType = useMemo(() => {
        const grouped = {
            [ITEM_TYPES.CONSUMABLE]: [],
            [ITEM_TYPES.EQUIPMENT]: []
        };

        inventory.forEach((stack) => {
            const def = ITEM_DEFS[stack.id];
            if (!def) return;
            grouped[def.type]?.push({ ...def, count: stack.count });
        });

        grouped[ITEM_TYPES.CONSUMABLE].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
        grouped[ITEM_TYPES.EQUIPMENT].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
        return grouped;
    }, [inventory]);

    const buildUpgradeChoices = (tower) => {
        if (!tower) return [];

        if (isSupportTower(tower)) {
            const filtered = SUPPORT_UPGRADE_POOL.filter((option) => {
                if (option.requireAura && option.requireAura !== (tower.supportAuraType || 'attack')) return false;
                if (option.isConvert && (tower.supportAuraType || 'attack') !== 'attack') return false;
                if (option.maxCount && (tower.upgradeStats?.[option.id] || 0) >= option.maxCount) return false;
                return true;
            });
            return shuffle(filtered).slice(0, 3);
        }

        const filtered = UPGRADE_POOL.filter((option) => {
            if (isMagicTower(tower) && !option.onlyMagic) return false;
            if (!isMagicTower(tower) && option.onlyMagic) return false;
            if (option.onlyMelee && !isMeleeTower(tower)) return false;
            if (option.onlyProjectile && !isProjectileTower(tower)) return false;
            if (option.onlySlowTower && !isSlowTower(tower)) return false;
            if (option.onlyArtillery && !isArtilleryTower(tower)) return false;
            if (
                (option.id === 'poison_dmg' || option.id === 'poison_duration' || option.id === 'poison_frequency')
                && (tower.upgradeStats?.wood_dmg || 0) <= 0
            ) return false;
            if (option.id === 'crit_chance' && (tower.stats?.crit || 0) >= 1) return false;
            if (option.maxCount && (tower.upgradeStats?.[option.id] || 0) >= option.maxCount) return false;
            const magicElements = tower.magicElements || {};
            if (option.requiredMagicElement && !(magicElements[option.requiredMagicElement] > 0)) return false;
            if (option.onlyAfterMagicElement && Object.values(magicElements).every((v) => (v || 0) <= 0)) return false;
            if (!option.element) return true;
            if (!tower.lockedElement) return true;
            return option.element === tower.lockedElement;
        });

        return shuffle(filtered).slice(0, 3);
    };

    const getUpgradeChoices = (tower, forceNew = false) => {
        if (!tower) return [];
        if (!forceNew && Array.isArray(tower.cachedUpgradeOptionIds) && tower.cachedUpgradeOptionIds.length > 0) {
            const cached = tower.cachedUpgradeOptionIds.map((id) => UPGRADE_OPTION_MAP[id]).filter(Boolean);
            if (cached.length > 0) return cached;
        }

        const next = buildUpgradeChoices(tower);
        tower.cachedUpgradeOptionIds = next.map((opt) => opt.id);
        return next;
    };

    const getSpecializationChoices = (tower) => {
        if (!tower) return [];
        if (isSupportTower(tower)) {
            const globalMasteries = engineRef.current?.globalMasteries || {};
            const filteredSupport = SUPPORT_SPECIALIZATION_POOL.filter((option) => {
                if (option.id === 'support_spec_global_item_drop' && globalMasteries.itemDropAura) return false;
                if (option.condition && !option.condition(tower)) return false;
                return true;
            });
            return shuffle(filteredSupport).slice(0, 3);
        }
        const globalMasteries = engineRef.current?.globalMasteries || {};

        const filtered = SPECIALIZATION_POOL.filter((option) => {
            if (option.id === 'spec_speed_aura' && globalMasteries.speedAura) return false;
            if (option.id === 'spec_fire_global' && globalMasteries.fireMastery) return false;
            if (option.id === 'spec_water_global' && globalMasteries.waterMastery) return false;
            if (option.id === 'spec_wood_global' && globalMasteries.woodMastery) return false;
            if (option.id === 'spec_crit_global' && globalMasteries.critAura) return false;
            if (option.id === 'spec_crit_dmg_global' && globalMasteries.critDmgAura) return false;
            if (option.id === 'spec_tower_poison' && globalMasteries.poisonMastery) return false;
            if (option.id === 'spec_tower_poison_frequency' && globalMasteries.poisonFrequencyMastery) return false;
            if (option.id === 'spec_global_wood_base' && globalMasteries.woodBaseAura) return false;
            if (option.id === 'spec_global_wood_crit_dmg' && globalMasteries.woodCritDmgAura) return false;
            if (option.id === 'spec_global_water_base' && globalMasteries.waterBaseAura) return false;
            if (option.id === 'spec_global_water_speed' && globalMasteries.waterSpeedAura) return false;
            if (option.id === 'spec_global_fire_speed' && globalMasteries.fireSpeedAura) return false;
            if (option.id === 'spec_global_fire_crit' && globalMasteries.fireCritAura) return false;
            if (option.id === 'spec_global_bleed_speed' && globalMasteries.bleedSpeedAura) return false;
            if (option.id === 'spec_global_bleed_base' && globalMasteries.bleedBaseAura) return false;
            if (option.condition && !option.condition(tower)) return false;
            return true;
        });

        const category = isSlowTower(tower) ? 'slow' : isMeleeTower(tower) ? 'melee' : 'projectile';
        const getPriority = (option) => {
            const id = option.id;
            let p = 0;

            if (id.startsWith('spec_') && id.includes('global')) p += 40;
            if (id === 'spec_tower_range_3') p += 15;
            if (id === 'spec_tower_base_100') p += 15;
            if (id === 'spec_tower_speed_50') p += 15;

            if (category === 'projectile') {
                if (id === 'spec_fire_global' || id === 'spec_tower_fire_explosion') p += 50;
                if (id === 'spec_tower_crit_random') p += 35;
            }

            if (category === 'melee') {
                if (id === 'spec_tower_stun_02') p += 45;
                if (id === 'spec_speed_aura') p += 35;
                if (id === 'spec_tower_half_dmg_double_speed') p += 25;
                if (id === 'spec_tower_boss_killer') p += 50;
            }

            if (category === 'slow') {
                if (id === 'spec_water_global') p += 55;
                if (id === 'spec_tower_stun_02') p += 35;
                if (id === 'spec_speed_aura') p += 20;
            }

            if (tower.lockedElement === 'fire' && id === 'spec_fire_global') p += 35;
            if (tower.lockedElement === 'water' && id === 'spec_water_global') p += 35;
            if (tower.lockedElement === 'wood' && id === 'spec_wood_global') p += 35;
            if (isMagicTower(tower) && id.startsWith('spec_magic_')) p += 60;
            if (!isMagicTower(tower) && id.startsWith('spec_magic_')) p -= 100;
            if (id.startsWith('spec_global_')) p += 30;

            return p;
        };

        return [...filtered]
            .sort((a, b) => getPriority(b) - getPriority(a))
            .slice(0, 3);
    };

    useEffect(() => {
        if (!upgradeTower) {
            setUpgradeOptions([]);
            return;
        }

        if ((upgradeTower.pendingUpgrades || 0) <= 0 && !upgradeTower.pendingSpecialization) {
            setUpgradeTarget(null);
            setUpgradeOptions([]);
            return;
        }

        if ((upgradeTower.pendingUpgrades || 0) > 0) {
            setTowerPanelMode('upgrade');
            setUpgradeOptions(getUpgradeChoices(upgradeTower, false));
        } else if (upgradeTower.pendingSpecialization) {
            setTowerPanelMode('specialization');
            setUpgradeOptions(getSpecializationChoices(upgradeTower));
        }
    }, [upgradeTower]);

    const handleTogglePause = () => {
        if (!engineRef.current || gameOver) return;
        const nextPaused = !isPaused;
        setIsPaused(nextPaused);
        if (!nextPaused && !engineRef.current.waveActive) queueAutoWaveStart(2000);
        appendConsoleLog(nextPaused ? '遊戲暫停' : '遊戲繼續');
    };

    const changeGameSpeed = (direction) => {
        if (!engineRef.current) return;
        const step = 0.25;
        const nextSpeed = engineRef.current.getGameSpeedMultiplier() + (direction * step);
        const appliedSpeed = engineRef.current.setGameSpeedMultiplier(nextSpeed);
        setGameState((prev) => ({
            ...prev,
            gameSpeed: appliedSpeed,
            gameSpeedCap: engineRef.current.getMaxGameSpeedMultiplier()
        }));
    };

    const appendConsoleLog = (line) => {
        const stamp = new Date().toLocaleTimeString('zh-TW', { hour12: false });
        setConsoleLog((prev) => [...prev, `[${stamp}] ${line}`].slice(-7));
    };

    const shiftInventoryPage = (type, delta) => {
        setInventoryPageByType((prev) => {
            const total = Math.max(1, Math.ceil((inventoryByType[type]?.length || 0) / inventorySlotsPerPage));
            const current = prev[type] || 0;
            const nextPage = Math.max(0, Math.min(total - 1, current + delta));
            return { ...prev, [type]: nextPage };
        });
    };

    const consumeSelectedItem = (itemId) => {
        setInventory((prev) => {
            return prev
                .map((entry) => (entry.id === itemId ? { ...entry, count: entry.count - 1 } : entry))
                .filter((entry) => entry.count > 0);
        });
    };

    const tryUseGlobalItem = (itemId) => {
        if (!engineRef.current) return false;
        if (itemId !== 'build_book' && itemId !== 'repair_kit') return false;

        const result = engineRef.current.applyGlobalItem(itemId);
        if (!result?.ok) {
            appendConsoleLog(result?.message || '道具使用失敗');
            triggerSfx('error');
            return true;
        }

        consumeSelectedItem(itemId);
        if (selectedItemId === itemId) setSelectedItemId(null);
        appendConsoleLog(result.message);
        triggerSfx('item');
        return true;
    };

    const handleCellClick = (x, y) => {
        if (gameOver || isInteractionModalOpen || !engineRef.current) return;

        const cell = grid[y][x];

        if (cell.type === 'tower') {
            const tower = engineRef.current.getTowerAt(x, y);
            if (tower) setSelectedTowerId(tower.id);

            if (tower && selectedInventoryItem) {
                const result = engineRef.current.applyInventoryItem(tower, selectedInventoryItem.id);
                if (!result?.ok) {
                    triggerSfx('error');
                    appendConsoleLog(result?.message || '使用道具失敗');
                    return;
                }

                consumeSelectedItem(selectedInventoryItem.id);
                setDropLog((prev) => [`對 ${getTowerName(tower.type)} 使用 ${selectedInventoryItem.name}`, ...prev].slice(0, 5));
                triggerSfx('item');
                return;
            }

            if (tower && ((tower.pendingUpgrades || 0) > 0 || tower.pendingSpecialization)) {
                setUpgradeTarget({ x, y });
            }
            return;
        }

        if (cell.type === 'build') {
            setBuildTarget({ x, y });
        }
    };

    const handleBuildTower = (towerTypeId) => {
        if (!buildTarget || !engineRef.current) return;

        const placedTower = engineRef.current.placeTower(buildTarget.x, buildTarget.y, towerTypeId);
        if (!placedTower) {
            triggerSfx('error');
            const reason = engineRef.current.getLastPlaceTowerError?.();
            if (reason === 'tower_limit') {
                appendConsoleLog(`塔數已達上限 (${engineRef.current.towers.length}/${engineRef.current.getTowerLimit?.() || 5})`);
            } else if (reason === 'insufficient_gold') {
                appendConsoleLog('金錢不足');
            }
            return;
        }

        const newGrid = [...grid];
        newGrid[buildTarget.y][buildTarget.x] = {
            ...newGrid[buildTarget.y][buildTarget.x],
            type: 'tower',
            towerType: towerTypeId
        };
        setGrid(newGrid);
        setBuildTarget(null);
        triggerSfx('build');
    };

    const handleUpgradeSelect = (optionId) => {
        if (!upgradeTarget || !engineRef.current) return;

        const tower = engineRef.current.getTowerAt(upgradeTarget.x, upgradeTarget.y);
        if (!tower) {
            setUpgradeTarget(null);
            return;
        }

        const success = towerPanelMode === 'specialization'
            ? engineRef.current.applyTowerSpecialization(tower, optionId)
            : engineRef.current.applyTowerUpgrade(tower, optionId);
        if (!success) {
            triggerSfx('error');
            setUpgradeTarget(null);
            return;
        }
        triggerSfx('upgrade');

        if (towerPanelMode === 'upgrade') {
            tower.cachedUpgradeOptionIds = null;
        }

        if ((tower.pendingUpgrades || 0) > 0) {
            setTowerPanelMode('upgrade');
            setUpgradeOptions(getUpgradeChoices(tower, true));
        } else if (tower.pendingSpecialization) {
            setTowerPanelMode('specialization');
            tower.cachedUpgradeOptionIds = null;
            setUpgradeOptions(getSpecializationChoices(tower));
        } else {
            tower.cachedUpgradeOptionIds = null;
            setUpgradeTarget(null);
            setUpgradeOptions([]);
        }
    };

    const handleUpgradeReroll = () => {
        if (!upgradeTarget || !engineRef.current || towerPanelMode !== 'upgrade') return;
        const tower = engineRef.current.getTowerAt(upgradeTarget.x, upgradeTarget.y);
        if (!tower || (tower.pendingUpgrades || 0) <= 0) return;

        const rerollCost = (tower.level || 1) * 20;
        if (engineRef.current.gold < rerollCost) {
            triggerSfx('error');
            appendConsoleLog(`金幣不足，重骰需要 ${rerollCost}`);
            return;
        }

        engineRef.current.gold -= rerollCost;
        const nextOptions = getUpgradeChoices(tower, true);
        setUpgradeOptions(nextOptions);
        setGameState((prev) => ({ ...prev, gold: engineRef.current.gold }));
        triggerSfx('upgrade');
    };

    const closeUpgradePanel = () => {
        setUpgradeTarget(null);
        setUpgradeOptions([]);
        setTowerPanelMode('upgrade');
    };

    const engine = engineRef.current;
    const selectedTowerDetail = (() => {
        if (!selectedTower) return null;
        const typeDef = Object.values(TOWER_TYPES).find((t) => t.id === selectedTower.type);
        const resonanceCatalog = engine?.getResonanceCatalog?.() || [];
        const resonanceNameMap = Object.fromEntries(resonanceCatalog.map((r) => [r.id, r.name]));
        const resonance = engine?.getTowerResonanceEffects?.(selectedTower) || {};
        const resonanceNames = (resonance.activeIds || []).map((id) => resonanceNameMap[id]).filter(Boolean);
        const baseStats = typeDef?.stats || {};
        const auraSnapshot = engine?.getTowerAuraSnapshot?.(selectedTower) || {
            damagePct: 0,
            speedPct: 0,
            critChancePct: 0,
            critDmgBonus: 0,
            bannerCritDmgBonus: 0,
            luckCritDmgBonus: 0
        };
        const supportAuraStatus = isSupportTower(selectedTower)
            ? (engine?.getSupportAuraStatus?.(selectedTower) || null)
            : null;

        const towerTalentMods = engine?.getTowerTalentModifiersForType?.(selectedTower.type) || {
            baseDamageBonus: 0,
            attrDamageMult: 1,
            speedMult: 1,
            rangeBonus: 0,
            critBonus: 0
        };
        const talentBaseDamageBonus = towerTalentMods.baseDamageBonus || 0;
        const talentAttrDamageMult = towerTalentMods.attrDamageMult || 1;
        const talentSpeedMult = towerTalentMods.speedMult || 1;
        const displayBaseDamage = selectedTower.equipmentId === 'full_firepower' ? 40 : (baseStats.damage || 0);
        const displayBaseSpeed = selectedTower.equipmentId === 'lubricant' ? 1 : (baseStats.speed || 0);

        const initialDamage = displayBaseDamage * talentAttrDamageMult + (talentBaseDamageBonus * talentAttrDamageMult);
        const currentBaseDamage = selectedTower.stats?.damage || 0;
        const bonusBaseDamage = Math.max(0, currentBaseDamage - initialDamage);

        const extraFire = selectedTower.stats?.extraFire || 0;
        const extraWater = selectedTower.stats?.extraWater || 0;
        const extraWood = selectedTower.stats?.extraWood || 0;

        const initialCrit = ((baseStats.crit || 0) + (towerTalentMods.critBonus || 0)) * 100;
        const currentCrit = (selectedTower.stats?.crit || 0) * 100;
        const extraCrit = currentCrit - initialCrit;

        const currentCritDmg = (selectedTower.stats?.critDmg || INITIAL_CRIT_DMG) + (selectedTower.stats?.critDmgBookBonus || 0);
        const extraCritDmg = currentCritDmg - INITIAL_CRIT_DMG;

        const initialSpeed = displayBaseSpeed * talentSpeedMult;
        const currentSpeed = selectedTower.stats?.speed || 0;
        const extraSpeed = currentSpeed - initialSpeed;

        const initialRange = (baseStats.range || 0) + (towerTalentMods.rangeBonus || 0);
        const currentRange = selectedTower.stats?.range || 0;
        const extraRange = currentRange - initialRange;

        const specRows = selectedTower.specializationId
            ? [{
                key: selectedTower.specializationId,
                label: SPECIALIZATION_LABEL_MAP[selectedTower.specializationId] || selectedTower.specializationId,
                isSpec: true
            }]
            : [];
        const upgradeRows = Object.entries(selectedTower.upgradeStats || {})
            .filter(([, lv]) => lv > 0)
            .map(([id, lv]) => {
                const option = UPGRADE_OPTION_MAP[id] || null;
                const maxCount = option?.maxCount ?? null;
                return {
                    key: id,
                    label: UPGRADE_LABEL_MAP[id] || id,
                    level: lv,
                    maxCount,
                    isMax: maxCount !== null && lv >= maxCount,
                    isSpec: false
                };
            })
            .sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'));

        return {
            initialDamage,
            bonusBaseDamage,
            extraFire,
            extraWater,
            extraWood,
            initialCrit,
            extraCrit,
            extraCritDmg,
            initialSpeed,
            extraSpeed,
            initialRange,
            extraRange,
            equipmentName: selectedTower.equipmentName || null,
            resonanceNames,
            talentRows: [...specRows, ...upgradeRows],
            auraSnapshot,
            supportAuraStatus
        };
    })();

    const sessionElapsedSec = Math.max(1, Math.floor((Date.now() - sessionStartRef.current) / 1000));
    const towerRows = engine
        ? [...engine.towers].map((tower) => {
            const resonanceCatalog = engine.getResonanceCatalog?.() || [];
            const resonanceNameMap = Object.fromEntries(resonanceCatalog.map((r) => [r.id, r.name]));
            const resonance = engine.getTowerResonanceEffects?.(tower) || {};
            const resonanceNames = (resonance.activeIds || []).map((id) => resonanceNameMap[id]).filter(Boolean);
            const auraSnapshot = engine.getTowerAuraSnapshot?.(tower) || null;
            const supportAuraStatus = isSupportTower(tower) ? (engine.getSupportAuraStatus?.(tower) || null) : null;
            const totalDamage = Math.floor(tower.totalDamageDealt || 0);
            return {
                id: tower.id,
                name: getTowerName(tower.type),
                level: tower.level || 1,
                pendingUpgrades: tower.pendingUpgrades || 0,
                pendingSpecialization: !!tower.pendingSpecialization,
                kills: tower.kills || 0,
                supportExp: tower.supportExp || 0,
                supportAuraType: tower.supportAuraType || null,
                supportAuraRange: tower.type === 'support' ? (1 + (tower.supportAuraRangeBonus || 0)) : null,
                damage: totalDamage,
                dps: totalDamage / sessionElapsedSec,
                equipmentName: tower.equipmentName || null,
                resonanceNames,
                auraSnapshot,
                supportAuraStatus
            };
        })
            .sort((a, b) => (b.dps - a.dps) || (b.damage - a.damage) || (b.kills - a.kills))
        : [];

    const towerRankRows = [...towerRows]
        .sort((a, b) => (b.damage - a.damage) || (b.kills - a.kills))
        .slice(0, 10);
    const towerLimit = engine?.getTowerLimit?.() || 5;
    const towerCount = towerRows.length;

    const waveInfo = engine
        ? (() => {
            const cfg = engine.getWaveConfig(gameState.wave);
            const affixes = engine.getWaveAffixes ? engine.getWaveAffixes(gameState.wave) : [];
            const speedUp = affixes.find((a) => a.id === 'move_speed_up')?.value || 0;
            const hpUp = affixes.find((a) => a.id === 'hp_percent_up')?.value || 0;
            const hp = 10 * gameState.wave * engine.getMobHpMultiplier() * engine.getWaveHpScale(gameState.wave) * (1 + hpUp);
            const spawnTarget = engine.getWaveSpawnTarget ? engine.getWaveSpawnTarget(gameState.wave) : Math.max(1, cfg.count);
            const bossCount = engine.getWaveBossCount ? engine.getWaveBossCount(gameState.wave, spawnTarget) : 1;
            return {
                type: cfg.type,
                spawnTarget,
                bossCount,
                spawned: engine.mobsSpawned || 0,
                alive: engine.mobs.length || 0,
                hpScale: engine.getWaveHpScale(gameState.wave),
                hp: Math.floor(hp),
                speed: 2.0 * (1 + speedUp),
                image: getMobImage(cfg.type),
                affixes
            };
        })()
        : null;

    const nextWaveInfo = engine
        ? (() => {
            const nextWave = gameState.wave + 1;
            const cfg = engine.getWaveConfig(nextWave);
            const affixes = engine.getWaveAffixes ? engine.getWaveAffixes(nextWave) : [];
            const speedUp = affixes.find((a) => a.id === 'move_speed_up')?.value || 0;
            const hpUp = affixes.find((a) => a.id === 'hp_percent_up')?.value || 0;
            const hp = 10 * nextWave * engine.getMobHpMultiplier() * engine.getWaveHpScale(nextWave) * (1 + hpUp);
            const spawnTarget = engine.getWaveSpawnTarget ? engine.getWaveSpawnTarget(nextWave) : Math.max(1, cfg.count);
            const bossCount = engine.getWaveBossCount ? engine.getWaveBossCount(nextWave, spawnTarget) : 1;
            return {
                wave: nextWave,
                type: cfg.type,
                spawnTarget,
                bossCount,
                hpScale: engine.getWaveHpScale(nextWave),
                hp: Math.floor(hp),
                speed: 2.0 * (1 + speedUp),
                image: getMobImage(cfg.type),
                affixes
            };
        })()
        : null;

    useEffect(() => {
        setInventoryPageByType((prev) => {
            const next = { ...prev };
            for (const type of [ITEM_TYPES.CONSUMABLE, ITEM_TYPES.EQUIPMENT]) {
                const total = Math.max(1, Math.ceil((inventoryByType[type]?.length || 0) / 12));
                next[type] = Math.min(next[type] || 0, total - 1);
            }
            return next;
        });
    }, [inventoryByType]);

    const isMobile = viewport.width <= 980;
    const baseMapSize = 600;
    const mobileTopBarOffset = topBarHeight;
    const mobileBottomPanelHeight = Math.max(280, Math.min(430, Math.floor(viewport.height * 0.46)));
    const mobileMiddleHeight = Math.max(180, viewport.height - mobileTopBarOffset - mobileBottomPanelHeight - 8);
    const mapScale = isMobile
        ? Math.min(1, (viewport.width - 16) / baseMapSize, mobileMiddleHeight / baseMapSize)
        : 1;
    const scaledMapSize = baseMapSize * mapScale;
    const topBarOffset = isMobile ? mobileTopBarOffset : Math.max(70, topBarHeight);
    const desktopContentHeight = `calc(100vh - ${topBarOffset + 12}px)`;
    const inventoryCols = 4;
    const inventoryRows = 3;
    const inventorySlotsPerPage = inventoryCols * inventoryRows;
    const centerInventoryWidth = isMobile ? scaledMapSize : Math.max(420, Math.floor(scaledMapSize * 0.88));
    const activeInventoryStacks = inventoryByType[inventoryTab] || [];
    const totalInventoryPages = Math.max(1, Math.ceil(activeInventoryStacks.length / inventorySlotsPerPage));
    const activeInventoryPage = Math.min(inventoryPageByType[inventoryTab] || 0, totalInventoryPages - 1);
    const inventoryPageStart = activeInventoryPage * inventorySlotsPerPage;
    const visibleInventoryStacks = activeInventoryStacks.slice(inventoryPageStart, inventoryPageStart + inventorySlotsPerPage);
    const visibleInventorySlots = [...visibleInventoryStacks];
    while (visibleInventorySlots.length < inventorySlotsPerPage) {
        visibleInventorySlots.push(null);
    }
    const mobileVisibleInventorySlots = visibleInventorySlots.slice(0, 8);
    const mobileInfoTabs = [
        { key: 'wave', label: '關卡' },
        { key: 'towers', label: '塔資訊' },
        { key: 'tower_detail', label: '塔詳情' },
        { key: 'rank', label: '排名' },
        { key: 'console', label: 'Console' }
    ];

    return (
        <div
            className="game-screen"
            onWheel={(e) => e.preventDefault()}
            style={{ position: 'relative', width: '100vw', height: isMobile ? `${Math.floor(viewport.height)}px` : '100vh', background: '#111', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', userSelect: 'none', WebkitUserSelect: 'none', overflow: 'hidden' }}
        >
            <style>{`
                @keyframes tower-ready-blink {
                    0% { box-shadow: 0 0 0 1px rgba(94,255,122,0.35) inset; }
                    50% { box-shadow: 0 0 0 3px rgba(94,255,122,0.95) inset; }
                    100% { box-shadow: 0 0 0 1px rgba(94,255,122,0.35) inset; }
                }
            `}</style>

            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                minHeight: '54px',
                background: '#222',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                padding: isMobile ? '6px 10px' : '6px 16px',
                borderBottom: '1px solid #444',
                zIndex: 10,
                gap: isMobile ? '8px' : '14px',
                flexWrap: 'nowrap',
                overflowX: 'auto',
                whiteSpace: 'nowrap'
            }} ref={topBarRef}>
                <span style={{ color: 'gold', fontWeight: 'bold' }}>金幣 {Math.floor(gameState.gold)}</span>
                <span style={{ color: 'red', display: 'flex', alignItems: 'center', gap: '5px' }}><Heart size={16} /> {gameState.hp}/{gameState.maxHp}</span>
                <span style={{ color: '#aaa' }}>波數: {gameState.wave}</span>
                <span style={{ color: '#b9d4ff' }}>塔數: {towerCount}/{towerLimit}</span>
                <span style={{ color: '#8ec5ff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    速度 x{gameState.gameSpeed.toFixed(2)}
                    <button
                        onClick={() => changeGameSpeed(-1)}
                        disabled={gameState.gameSpeed <= 1}
                        style={{ padding: '1px 6px', lineHeight: 1, opacity: gameState.gameSpeed <= 1 ? 0.45 : 1 }}
                        title="降低遊戲速度"
                    >
                        -
                    </button>
                    <button
                        onClick={() => changeGameSpeed(1)}
                        disabled={gameState.gameSpeed >= gameState.gameSpeedCap}
                        style={{ padding: '1px 6px', lineHeight: 1, opacity: gameState.gameSpeed >= gameState.gameSpeedCap ? 0.45 : 1 }}
                        title="提高遊戲速度"
                    >
                        +
                    </button>
                </span>
                {!isMobile && (
                    <>
                        <span style={{ color: '#9ee493' }}>能量: {resources.energy || 0}</span>
                        <span style={{ color: '#ff7f7f' }}>紅水晶: {resources.red_crystal || 0}</span>
                        <span style={{ color: '#67d39a' }}>綠寶石: {resources.green_gem || 0}</span>
                        <span style={{ color: '#79b8ff' }}>藍水晶: {resources.blue_crystal || 0}</span>
                        <span style={{ color: '#f5c451' }}>金礦: {resources.gold_ore || 0}</span>
                    </>
                )}

                <button
                    onClick={handleTogglePause}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: isPaused ? '#6b4b0e' : '#333',
                        border: `1px solid ${isPaused ? '#e0b35a' : '#555'}`
                    }}
                >
                    {isPaused ? '繼續' : '暫停'}
                </button>

                <button onClick={handleExitWithRecord} style={{ marginLeft: 'auto' }}>離開</button>
            </div>

            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                flexWrap: 'wrap',
                gap: isMobile ? 0 : '24px',
                alignItems: isMobile ? 'center' : 'stretch',
                justifyContent: isMobile ? 'center' : 'flex-start',
                marginTop: `${topBarOffset}px`,
                width: isMobile ? '100%' : 'calc(100vw - 40px)',
                maxWidth: isMobile ? '100%' : '1780px',
                height: isMobile ? `${mobileMiddleHeight}px` : desktopContentHeight,
                padding: isMobile ? '0 8px' : '0 0 12px',
                boxSizing: 'border-box',
                overflow: 'hidden'
            }}>
                <div style={{
                    width: isMobile ? '100%' : '30%',
                    minWidth: isMobile ? 0 : '320px',
                    maxWidth: isMobile ? 'none' : '520px',
                    display: isMobile ? 'none' : 'grid',
                    gridTemplateRows: isMobile ? 'auto auto' : '38% 1fr',
                    gap: '8px',
                    order: isMobile ? 3 : 1
                }}>
                    <div style={{ border: '2px solid #ddd', padding: '14px', background: 'rgba(0,0,0,0.35)', overflow: 'hidden' }}>
                        <div style={{ fontSize: '1.1rem', marginBottom: '10px' }}>塔的詳細資訊</div>
                        {selectedTower && selectedTowerDetail ? (
                            <div style={{ lineHeight: 1.42, color: '#ddd', height: 'calc(100% - 32px)', display: 'grid', gridTemplateColumns: '1.2fr 0.95fr', gap: '10px', minHeight: 0 }}>
                                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                    <div>名稱: {getTowerName(selectedTower.type)}</div>
                                    <div>等級: {selectedTower.level}</div>
                                    {selectedTowerDetail.equipmentName && <div>裝備: {selectedTowerDetail.equipmentName}</div>}
                                    <div>傷害: {Math.floor(selectedTowerDetail.initialDamage)} + {Math.floor(selectedTowerDetail.bonusBaseDamage)} + <span style={{ color: '#ff7373' }}>火 {Math.floor(selectedTowerDetail.extraFire)}</span> / <span style={{ color: '#7fb7ff' }}>水 {Math.floor(selectedTowerDetail.extraWater)}</span> / <span style={{ color: '#8ddc8d' }}>木 {Math.floor(selectedTowerDetail.extraWood)}</span></div>
                                    <div>暴擊率: {selectedTowerDetail.initialCrit.toFixed(0)}% + ({selectedTowerDetail.extraCrit >= 0 ? '+' : ''}{selectedTowerDetail.extraCrit.toFixed(0)}%)</div>
                                    <div>暴擊傷害: {((INITIAL_CRIT_DMG - 1) * 100).toFixed(0)}% + ({selectedTowerDetail.extraCritDmg >= 0 ? '+' : ''}{(selectedTowerDetail.extraCritDmg * 100).toFixed(0)}%)</div>
                                    <div>攻速: {selectedTowerDetail.initialSpeed.toFixed(2)} + ({selectedTowerDetail.extraSpeed >= 0 ? '+' : ''}{selectedTowerDetail.extraSpeed.toFixed(2)})</div>
                                    <div>距離: {selectedTowerDetail.initialRange.toFixed(1)} + ({selectedTowerDetail.extraRange >= 0 ? '+' : ''}{selectedTowerDetail.extraRange.toFixed(1)})</div>
                                    {!isSupportTower(selectedTower) && (
                                        <>
                                            <div style={{ color: '#ffd99b' }}>靈氣加成: 傷害 +{selectedTowerDetail.auraSnapshot.damagePct.toFixed(0)}% | 攻速 +{selectedTowerDetail.auraSnapshot.speedPct.toFixed(0)}%</div>
                                            <div style={{ color: '#ffd99b' }}>靈氣加成: 暴擊率 +{selectedTowerDetail.auraSnapshot.critChancePct.toFixed(0)}% | 暴傷 +{selectedTowerDetail.auraSnapshot.critDmgBonus.toFixed(2)}</div>
                                        </>
                                    )}
                                    {isSupportTower(selectedTower) && selectedTowerDetail.supportAuraStatus && (
                                        <>
                                            <div style={{ color: '#8de8df' }}>輔助靈氣: {selectedTowerDetail.supportAuraStatus.auraType} | 效果 +{selectedTowerDetail.supportAuraStatus.effectPct.toFixed(0)}%</div>
                                            <div style={{ color: '#8de8df' }}>
                                                範圍: {selectedTowerDetail.supportAuraStatus.range.toFixed(1)} | 影響塔: {selectedTowerDetail.supportAuraStatus.affectedTowerCount}
                                                {selectedTowerDetail.supportAuraStatus.auraType === 'slow' ? ` | 影響怪: ${selectedTowerDetail.supportAuraStatus.affectedMobCount}` : ''}
                                            </div>
                                        </>
                                    )}
                                    {selectedTowerDetail.resonanceNames?.length > 0 && (
                                        <div style={{ color: '#9ad7ff' }}>
                                            共鳴: {selectedTowerDetail.resonanceNames.join('、')}
                                        </div>
                                    )}
                                </div>

                                <div style={{ borderLeft: '1px solid #2f2f2f', paddingLeft: '10px', overflow: 'hidden', minWidth: 0 }}>
                                    <div style={{ marginBottom: '4px', color: '#e5e5e5' }}>已選天賦</div>
                                    {selectedTowerDetail.talentRows.length === 0 ? (
                                        <div style={{ color: '#8a8a8a' }}>尚未選擇天賦</div>
                                    ) : (
                                        selectedTowerDetail.talentRows.map((row) => (
                                            <div key={row.key} style={{ color: row.isSpec ? '#c0c0c0' : '#d7d7d7' }}>
                                                {row.label} {row.isSpec ? '專精' : (row.isMax ? 'LVMax' : `LV${row.level}`)}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div style={{ color: '#8a8a8a' }}>請點選地圖上的塔，或在下方列表點選一座塔</div>
                        )}
                    </div>

                    <div style={{ border: '2px solid #ddd', padding: '14px', background: 'rgba(0,0,0,0.35)', overflowY: 'auto', overflowX: 'hidden' }}>
                        <div style={{ fontSize: '1.1rem', marginBottom: '10px' }}>所有塔資訊</div>
                        {towerRows.length === 0 ? (
                            <div style={{ color: '#8a8a8a' }}>目前還沒有塔</div>
                        ) : (
                            towerRows.map((row) => (
                                <div
                                    key={row.id}
                                    onClick={() => setSelectedTowerId(row.id)}
                                    style={{
                                        border: selectedTowerId === row.id ? '1px solid #55c18f' : '1px solid #2f2f2f',
                                        background: selectedTowerId === row.id ? 'rgba(85, 193, 143, 0.14)' : 'transparent',
                                        borderRadius: '6px',
                                        padding: '6px',
                                        marginBottom: '6px',
                                        fontSize: '0.9rem',
                                        lineHeight: 1.35,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div style={{ color: '#f0f0f0' }}>{row.name} Lv.{row.level}</div>
                                    {row.supportAuraType ? (
                                        <div style={{ color: '#bcbcbc' }}>
                                            待升級: {row.pendingUpgrades} | 待專精: {row.pendingSpecialization ? '是' : '否'} | EXP: {row.supportExp}/15 | 靈氣: {row.supportAuraType} | 範圍: {row.supportAuraRange}
                                        </div>
                                    ) : (
                                        <div style={{ color: '#bcbcbc' }}>
                                            待升級: {row.pendingUpgrades} | 待專精: {row.pendingSpecialization ? '是' : '否'} | K: {row.kills} | Dmg: {row.damage}
                                        </div>
                                    )}
                                    {row.supportAuraStatus ? (
                                        <div style={{ color: '#8de8df' }}>
                                            靈氣效果 +{(row.supportAuraStatus.effectPct || 0).toFixed(0)}% | 影響塔 {row.supportAuraStatus.affectedTowerCount || 0}
                                        </div>
                                    ) : (
                                        <div style={{ color: '#ffd99b' }}>
                                            靈氣加成: 傷 +{(row.auraSnapshot?.damagePct || 0).toFixed(0)}% | 速 +{(row.auraSnapshot?.speedPct || 0).toFixed(0)}% | 暴 +{(row.auraSnapshot?.critChancePct || 0).toFixed(0)}%
                                        </div>
                                    )}
                                    {row.equipmentName && (
                                        <div style={{ color: '#9ad7ff' }}>裝備: {row.equipmentName}</div>
                                    )}
                                    {row.resonanceNames?.length > 0 && (
                                        <div style={{ color: '#9ad7ff' }}>共鳴: {row.resonanceNames.join('、')}</div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div style={{ width: scaledMapSize, margin: '0 auto', flex: '0 0 auto', order: isMobile ? 1 : 2 }}>
                    <div style={{ position: 'relative', width: scaledMapSize, height: scaledMapSize }}>
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: baseMapSize,
                            height: baseMapSize,
                            transform: `scale(${mapScale})`,
                            transformOrigin: 'top left'
                        }}>
                            <div style={{
                                position: 'absolute', top: 0, left: 0,
                                display: 'grid',
                                gridTemplateColumns: `repeat(15, ${CELL_SIZE}px)`,
                                gridTemplateRows: `repeat(15, ${CELL_SIZE}px)`
                            }}>
                                {grid.map((row, y) => row.map((cell, x) => {
                                    const tower = cell.type === 'tower' && engineRef.current
                                        ? engineRef.current.getTowerAt(x, y)
                                        : null;
                                    const cellTexture = getCellTexture(cell);
                                    const pendingUpgrades = tower ? (tower.pendingUpgrades || 0) : 0;
                                    const pendingSpecs = tower?.pendingSpecialization ? 1 : 0;
                                    const pending = pendingUpgrades + pendingSpecs;
                                    const isReady = pending > 0;
                                    const hasEquipment = !!tower?.equipmentId || !!tower?.equipmentName;

                                    return (
                                        <div
                                            key={`${x}-${y}`}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => handleCellClick(x, y)}
                                            style={{
                                                width: CELL_SIZE,
                                                height: CELL_SIZE,
                                                backgroundColor: getCellColor(cell),
                                                backgroundImage: cellTexture
                                                    ? (
                                                        cell.type === 'build'
                                                            ? `linear-gradient(rgba(16,16,16,0.36), rgba(16,16,16,0.36)), url(${cellTexture})`
                                                            : `url(${cellTexture})`
                                                    )
                                                    : 'none',
                                                backgroundSize: 'cover',
                                                backgroundBlendMode: 'normal',
                                                opacity: cell.type === 'build' ? 0.72 : 1,
                                                filter: cell.type === 'build' ? 'saturate(0.58) brightness(0.9)' : 'none',
                                                border: '1px solid #333',
                                                cursor: (cell.type === 'build' || (cell.type === 'tower' && (isReady || !!selectedInventoryItem))) ? 'pointer' : 'default',
                                                position: 'relative',
                                                userSelect: 'none',
                                                WebkitUserSelect: 'none',
                                                animation: isReady ? 'tower-ready-blink 1.1s infinite' : 'none',
                                                boxShadow: (cell.type === 'tower' && selectedInventoryItem)
                                                    ? 'inset 0 0 0 2px rgba(126, 213, 255, 0.55)'
                                                    : 'none'
                                            }}
                                        >
                                            {cell.type === 'tower' && (
                                                <div style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    position: 'relative',
                                                    borderRadius: '4px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        border: `2px solid ${getTowerColor(cell.towerType)}`,
                                                        zIndex: 2,
                                                        pointerEvents: 'none'
                                                    }} />
                                                    {tower && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            bottom: 0,
                                                            right: 0,
                                                            width: '16px',
                                                            height: '16px',
                                                            background: getTowerLevelColor(tower.level || 1),
                                                            borderTopLeftRadius: '4px',
                                                            borderTop: '1px solid #111',
                                                            borderLeft: '1px solid #111',
                                                            zIndex: 3,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: (tower.level || 1) >= 10 ? '#222' : '#fff',
                                                            fontSize: '11px',
                                                            fontWeight: 'bold',
                                                            textShadow: (tower.level || 1) >= 10 ? 'none' : '1px 1px 1px rgba(0,0,0,0.8)',
                                                            animation: isReady ? 'tower-ready-blink 1.1s infinite' : 'none',
                                                        }}>
                                                            {tower.level}
                                                        </div>
                                                    )}
                                                    {cell.towerType === 'magic' ? (
                                                        <img src="/magic_tower.png" style={{ width: '85%', height: '85%', objectFit: 'contain', zIndex: 1 }} alt="magic tower" />
                                                    ) : cell.towerType === 'melee' ? (
                                                        <img src="/melee_tower.png" style={{ width: '85%', height: '85%', objectFit: 'contain', zIndex: 1 }} alt="melee tower" />
                                                    ) : cell.towerType === 'projectile' ? (
                                                        <img src="/projectile_tower.png" style={{ width: '85%', height: '85%', objectFit: 'contain', zIndex: 1 }} alt="projectile tower" />
                                                    ) : cell.towerType === 'projectile_slow' ? (
                                                        <img src="/slow_tower.png" style={{ width: '85%', height: '85%', objectFit: 'contain', zIndex: 1 }} alt="slow tower" />
                                                    ) : cell.towerType === 'projectile_aoe' ? (
                                                        <img src="/aoe_tower.png" style={{ width: '85%', height: '85%', objectFit: 'contain', zIndex: 1 }} alt="aoe tower" />
                                                    ) : cell.towerType === 'support' ? (
                                                        <img src="/support_tower.png" style={{ width: '85%', height: '85%', objectFit: 'contain', zIndex: 1 }} alt="support tower" />
                                                    ) : (
                                                        <span style={{ zIndex: 1 }}>{getTowerLabel(cell.towerType)}</span>
                                                    )}
                                                </div>
                                            )}

                                            {hasEquipment && (
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: 0,
                                                    left: 0,
                                                    width: 16,
                                                    height: 16,
                                                    borderTopRightRadius: '4px',
                                                    background: '#4fa6ff',
                                                    color: '#eaf4ff',
                                                    fontSize: 11,
                                                    fontWeight: 800,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    boxShadow: '1px -1px 0 rgba(0,0,0,0.5)',
                                                    zIndex: 10
                                                }}>
                                                    E
                                                </div>
                                            )}
                                        </div>
                                    );
                                }))}
                            </div>

                            <canvas
                                ref={canvasRef}
                                width={600}
                                height={600}
                                style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
                            />

                            {gameOver && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: 'rgba(0,0,0,0.8)',
                                    color: 'white',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 30,
                                    gap: '10px'
                                }}>
                                    <h1>遊戲結束</h1>
                                    <button onClick={handleExitWithRecord}>回主選單</button>
                                </div>
                            )}

                            {buildTarget && (
                                <div style={{
                                    position: 'absolute',
                                    top: '24px',
                                    left: '24px',
                                    right: '24px',
                                    bottom: '24px',
                                    background: '#222',
                                    border: '2px solid #66ccff',
                                    padding: '14px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    overflow: 'hidden',
                                    zIndex: 20
                                }}>
                                    <h3>選擇要建造的塔</h3>
                                    <div style={{ color: '#cde8ff', textAlign: 'left' }}>
                                        地形: {getTerrainLabel(buildCell?.terrain)} | 效果: {getTerrainEffectText(buildCell?.terrain)}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridAutoRows: '1fr', gap: '8px', flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '2px' }}>
                                        {Object.values(TOWER_TYPES).map((type) => (
                                            <button
                                                key={type.id}
                                                onClick={() => handleBuildTower(type.id)}
                                                style={{
                                                    background: '#2f2f2f',
                                                    border: `2px solid ${type.color}`,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '4px',
                                                    alignItems: 'flex-start',
                                                    textAlign: 'left',
                                                    justifyContent: 'flex-start',
                                                    padding: '8px',
                                                    fontSize: '0.78rem',
                                                    lineHeight: 1.2
                                                }}
                                            >
                                                <div style={{ fontWeight: 700 }}>{getTowerLabel(type.id)} 塔</div>
                                                {getBuildPanelLines(type).map((line, idx) => (
                                                    <div key={`${type.id}-line-${idx}`} style={{ color: idx === 0 ? '#ffffff' : '#cfd6df' }}>
                                                        {line}
                                                    </div>
                                                ))}
                                            </button>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '2px' }}>
                                        <button onClick={() => setBuildTarget(null)}>取消</button>
                                    </div>
                                </div>
                            )}

                            {upgradeTarget && upgradeTower && (
                                <div style={{
                                    position: 'absolute',
                                    top: '60px',
                                    left: '50px',
                                    right: '50px',
                                    bottom: '60px',
                                    background: '#222',
                                    border: '2px solid #5eff7a',
                                    padding: '20px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px',
                                    zIndex: 25
                                }}>
                                    <h3>
                                        {towerPanelMode === 'specialization'
                                            ? '塔專精三選一'
                                            : `塔升級選擇（剩餘 ${upgradeTower.pendingUpgrades || 0} 次）`}
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', textAlign: 'left', fontSize: '0.9rem', color: '#d6d6d6' }}>
                                        <div>地形: {getTerrainLabel(upgradeCell?.terrain)}</div>
                                        <div>地形效果: {getTerrainEffectText(upgradeCell?.terrain)}</div>
                                        <div>塔等級: {upgradeTower.level}</div>
                                        {isSupportTower(upgradeTower) ? (
                                            <>
                                                <div>輔助經驗: {upgradeTower.supportExp || 0}/15</div>
                                                <div>靈氣型態: {upgradeTower.supportAuraType || 'attack'}</div>
                                                <div>靈氣範圍: {(1 + (upgradeTower.supportAuraRangeBonus || 0)).toFixed(1)}</div>
                                                <div>靈氣效果: +{(upgradeSupportAuraStatus?.effectPct || 0).toFixed(0)}%</div>
                                                <div>影響塔數: {upgradeSupportAuraStatus?.affectedTowerCount || 0}</div>
                                                <div>幸運靈氣: {upgradeTower.supportLuckyAura ? `+${(upgradeTower.supportLuckyCritDmgBonus || 0).toFixed(2)} 暴傷` : '未啟用'}</div>
                                            </>
                                        ) : (
                                            <>
                                                <div>擊殺計數: {upgradeTower.kills}/10</div>
                                                <div>基礎傷害: {Math.floor(upgradeTower.stats.damage)}</div>
                                                <div>攻速: {upgradeTower.stats.speed.toFixed(2)}</div>
                                                <div>暴擊率: {(upgradeTower.stats.crit * 100).toFixed(0)}%</div>
                                                <div>攻擊距離: {upgradeTower.stats.range.toFixed(1)}</div>
                                                <div>靈氣傷害加成: +{(upgradeAuraSnapshot?.damagePct || 0).toFixed(0)}%</div>
                                                <div>靈氣攻速加成: +{(upgradeAuraSnapshot?.speedPct || 0).toFixed(0)}%</div>
                                                <div>靈氣暴擊加成: +{(upgradeAuraSnapshot?.critChancePct || 0).toFixed(0)}%</div>
                                                <div>靈氣暴傷加成: +{(upgradeAuraSnapshot?.critDmgBonus || 0).toFixed(2)}</div>
                                            </>
                                        )}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', flex: 1 }}>
                                        {upgradeOptions.map((opt) => (
                                            <button
                                                key={opt.id}
                                                onClick={() => handleUpgradeSelect(opt.id)}
                                                style={{ background: '#333', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}
                                            >
                                                <div style={{ fontWeight: 'bold', color: '#7cff9a' }}>{opt.label}</div>
                                                <div style={{ fontSize: '0.82rem', color: '#ccc' }}>{opt.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                    <div style={{ alignSelf: 'flex-end', display: 'flex', gap: '8px' }}>
                                        {towerPanelMode === 'upgrade' && (
                                            <button onClick={handleUpgradeReroll}>
                                                重骰（{(upgradeTower.level || 1) * 20} 金幣）
                                            </button>
                                        )}
                                        <button onClick={closeUpgradePanel}>暫緩</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{
                        width: centerInventoryWidth,
                        border: '2px solid #ddd',
                        background: 'rgba(0,0,0,0.35)',
                        padding: '10px',
                        display: isMobile ? 'none' : 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr',
                        gap: '10px',
                        margin: '10px auto 0'
                    }}>
                        <div style={{
                            border: '1px solid #444',
                            background: 'rgba(0,0,0,0.28)',
                            padding: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                    onClick={() => setInventoryTab(ITEM_TYPES.CONSUMABLE)}
                                    style={{
                                        border: inventoryTab === ITEM_TYPES.CONSUMABLE ? '1px solid #7cff9a' : '1px solid #555',
                                        background: inventoryTab === ITEM_TYPES.CONSUMABLE ? '#1f3a25' : '#1f1f1f',
                                        color: '#ddd',
                                        padding: '4px 8px',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    道具 {inventoryByType[ITEM_TYPES.CONSUMABLE].length > 0 ? `(${inventoryByType[ITEM_TYPES.CONSUMABLE].length})` : ''}
                                </button>
                                <button
                                    onClick={() => setInventoryTab(ITEM_TYPES.EQUIPMENT)}
                                    style={{
                                        border: inventoryTab === ITEM_TYPES.EQUIPMENT ? '1px solid #7cff9a' : '1px solid #555',
                                        background: inventoryTab === ITEM_TYPES.EQUIPMENT ? '#1f2d3a' : '#1f1f1f',
                                        color: '#ddd',
                                        padding: '4px 8px',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    裝備 {inventoryByType[ITEM_TYPES.EQUIPMENT].length > 0 ? `(${inventoryByType[ITEM_TYPES.EQUIPMENT].length})` : ''}
                                </button>
                                <div style={{ marginLeft: 'auto', color: '#89a7bf', fontSize: '0.78rem' }}>
                                    第 {activeInventoryPage + 1}/{totalInventoryPages} 頁
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 32px', gap: '8px', alignItems: 'stretch' }}>
                                <button
                                    onClick={() => shiftInventoryPage(inventoryTab, -1)}
                                    disabled={activeInventoryPage <= 0}
                                    style={{ height: '100%', opacity: activeInventoryPage <= 0 ? 0.4 : 1 }}
                                >
                                    {'<'}
                                </button>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${inventoryCols}, minmax(0, 1fr))`,
                                    gap: '6px'
                                }}>
                                    {visibleInventorySlots.map((stack, idx) => {
                                        const isSelected = !!stack && selectedItemId === stack.id;
                                        return (
                                            <button
                                                key={`inv-slot-${inventoryTab}-${activeInventoryPage}-${idx}`}
                                                onClick={(e) => {
                                                    if (!stack) return;
                                                    if (stack.id === 'repair_kit' && e.detail < 2) {
                                                        appendConsoleLog('急救套件：連點兩下可立即使用');
                                                        return;
                                                    }
                                                    if (tryUseGlobalItem(stack.id)) return;
                                                    setSelectedItemId((prev) => (prev === stack.id ? null : stack.id));
                                                }}
                                                style={{
                                                    width: '100%',
                                                    aspectRatio: '1 / 1',
                                                    border: isSelected ? '2px solid #7cff9a' : '1px solid #666',
                                                    background: stack ? '#1f1f1f' : '#111',
                                                    color: '#ddd',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: '4px',
                                                    padding: '4px 6px',
                                                    fontSize: '0.75rem'
                                                }}
                                            >
                                                <span>{stack?.icon || ''}</span>
                                                <span>{stack?.count || ''}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => shiftInventoryPage(inventoryTab, 1)}
                                    disabled={activeInventoryPage >= totalInventoryPages - 1}
                                    style={{ height: '100%', opacity: activeInventoryPage >= totalInventoryPages - 1 ? 0.4 : 1 }}
                                >
                                    {'>'}
                                </button>
                            </div>
                        </div>

                        <div style={{ border: '1px solid #444', background: 'rgba(0,0,0,0.28)', padding: '10px', minHeight: '110px', color: '#ddd' }}>
                            <div style={{ color: '#8dd2ff', marginBottom: '6px' }}>道具說明</div>
                            {selectedInventoryItem ? (
                                <div style={{ lineHeight: 1.4 }}>
                                    <div style={{ color: '#fff', fontWeight: 700, marginBottom: '4px' }}>
                                        {selectedInventoryItem.name} x{selectedInventoryItem.count}
                                    </div>
                                    <div style={{ color: '#bfc6d1', marginBottom: '4px' }}>{selectedInventoryItem.description}</div>
                                    <div style={{ color: '#8dd2ff' }}>
                                        類型: {selectedInventoryItem.type === ITEM_TYPES.EQUIPMENT ? '裝備（每塔僅 1 件，不可卸下）' : '道具（點塔使用）'}
                                    </div>
                                    <div style={{ color: '#9bcf9f', marginTop: '4px' }}>
                                        已選取，請點擊地圖上的塔套用
                                    </div>
                                    <div style={{ marginTop: '6px' }}>
                                        <button onClick={() => setSelectedItemId(null)} style={{ fontSize: '0.78rem', padding: '3px 8px' }}>
                                            取消選取
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ lineHeight: 1.45 }}>
                                    <div style={{ color: '#bfc6d1' }}>先在左側選擇「道具」或「裝備」分頁，再點選物品。</div>
                                    <div style={{ color: '#8dd2ff' }}>選取後點擊地圖上的塔即可使用或裝備。</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{
                    width: isMobile ? '100%' : '30%',
                    minWidth: isMobile ? 0 : '320px',
                    maxWidth: isMobile ? 'none' : '520px',
                    display: isMobile ? 'none' : 'grid',
                    gridTemplateRows: isMobile ? 'auto auto' : '40% 1fr',
                    gap: '8px',
                    order: isMobile ? 2 : 3,
                    minHeight: 0,
                    overflow: 'hidden'
                }}>
                    <div style={{ border: '2px solid #ddd', padding: '14px', background: 'rgba(0,0,0,0.35)', overflow: 'hidden', minHeight: 0 }}>
                        <div style={{ fontSize: '1.1rem', marginBottom: '10px' }}>當波怪物資訊</div>
                        {waveInfo && (
                            <div style={{ display: 'grid', gridTemplateColumns: nextWaveInfo ? '1fr 1fr' : '1fr', gap: '12px', lineHeight: 1.35, color: '#ddd', fontSize: '0.9rem' }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ color: '#8dd2ff', marginBottom: '6px' }}>當波怪物資訊</div>
                                    <div style={{ marginBottom: '6px' }}>
                                        <img src={waveInfo.image} alt={waveInfo.type} style={{ width: 36, height: 36, objectFit: 'contain' }} />
                                    </div>
                                    <div>波數: {gameState.wave}</div>
                                    <div>怪物類型: {waveInfo.type}</div>
                                    <div>單位生命值: {waveInfo.hp}</div>
                                    <div>基礎移動速度: {waveInfo.speed.toFixed(2)}</div>
                                    <div>目標出怪數: {waveInfo.spawnTarget}</div>
                                    <div>波尾 Boss: {waveInfo.bossCount}</div>
                                    <div>已出怪數: {waveInfo.spawned}</div>
                                    <div>場上存活: {waveInfo.alive}</div>
                                    <div>關卡血量倍率: x{waveInfo.hpScale.toFixed(2)}</div>
                                    <div style={{ marginTop: '6px', color: '#f7d9a7' }}>
                                        詞墜: {waveInfo.affixes?.length ? waveInfo.affixes.map((a) => a.name).join('、') : '無'}
                                    </div>
                                    {waveInfo.affixes?.length > 0 && (
                                        <div style={{ color: '#c2d6e8', fontSize: '0.82rem' }}>
                                            {waveInfo.affixes.map((a) => a.desc).join(' / ')}
                                        </div>
                                    )}
                                </div>
                                {nextWaveInfo && (
                                    <div style={{ minWidth: 0, borderLeft: '1px solid #2f2f2f', paddingLeft: '10px' }}>
                                        <div style={{ color: '#8dd2ff', marginBottom: '6px' }}>下波怪物資訊</div>
                                        <div style={{ marginBottom: '6px' }}>
                                            <img src={nextWaveInfo.image} alt={nextWaveInfo.type} style={{ width: 36, height: 36, objectFit: 'contain' }} />
                                        </div>
                                        <div>波數: {nextWaveInfo.wave}</div>
                                        <div>怪物類型: {nextWaveInfo.type}</div>
                                        <div>單位生命值: {nextWaveInfo.hp}</div>
                                        <div>基礎移動速度: {nextWaveInfo.speed.toFixed(2)}</div>
                                        <div>目標出怪數: {nextWaveInfo.spawnTarget}</div>
                                        <div>波尾 Boss: {nextWaveInfo.bossCount}</div>
                                        <div>關卡血量倍率: x{nextWaveInfo.hpScale.toFixed(2)}</div>
                                        <div style={{ marginTop: '6px', color: '#f7d9a7' }}>
                                            詞墜: {nextWaveInfo.affixes?.length ? nextWaveInfo.affixes.map((a) => a.name).join('、') : '無'}
                                        </div>
                                        {nextWaveInfo.affixes?.length > 0 && (
                                            <div style={{ color: '#c2d6e8', fontSize: '0.82rem' }}>
                                                {nextWaveInfo.affixes.map((a) => a.desc).join(' / ')}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{ border: '2px solid #ddd', padding: '14px', background: 'rgba(0,0,0,0.35)', overflow: 'hidden', display: 'grid', gridTemplateRows: 'auto 1fr', gap: '10px', minHeight: 0, boxSizing: 'border-box' }}>
                        <div style={{ fontSize: '1.1rem' }}>更新日誌 / Console</div>
                        <div style={{ minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '10px' }}>
                            <div style={{ border: '1px solid #3b3b3b', borderRadius: '6px', padding: '8px', overflow: 'hidden' }}>
                                <div style={{ color: '#8dd2ff', marginBottom: '6px' }}>更新日誌</div>
                                {UPDATE_LOG_ITEMS.map((item, idx) => (
                                    <div key={`update-${idx}`} style={{ color: '#cfd6df', fontSize: '0.84rem', lineHeight: 1.4, marginBottom: '4px' }}>
                                        {idx + 1}. {item}
                                    </div>
                                ))}
                            </div>
                            <div style={{ border: '1px solid #3b3b3b', borderRadius: '6px', padding: '8px', overflow: 'hidden' }}>
                                <div style={{ color: '#8dd2ff', marginBottom: '6px' }}>Console</div>
                                {consoleLog.length === 0 ? (
                                    <div style={{ color: '#8a8a8a', fontSize: '0.84rem' }}>尚無紀錄</div>
                                ) : (
                                    consoleLog.map((line, idx) => (
                                        <div key={`console-${idx}`} style={{ color: '#9bcf9f', fontSize: '0.82rem', lineHeight: 1.35, borderBottom: '1px solid #272727', padding: '3px 0' }}>
                                            {line}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {isMobile && (
                <div style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: `${mobileBottomPanelHeight}px`,
                    background: '#1a1a1a',
                    borderTop: '1px solid #444',
                    padding: '8px 8px max(8px, env(safe-area-inset-bottom))',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    overflow: 'hidden',
                    zIndex: 12
                }}>
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                        {[
                            { key: 'consumable', label: '道具' },
                            { key: 'equipment', label: '裝備' },
                            { key: 'wave', label: '關卡' },
                            { key: 'towers', label: '塔資訊' },
                            { key: 'tower_detail', label: '塔詳情' },
                            { key: 'rank', label: '排名' },
                            { key: 'console', label: 'Console' }
                        ].map((tab) => (
                            <button
                                key={`mobile-panel-${tab.key}`}
                                onClick={() => {
                                    setMobilePanelTab(tab.key);
                                    if (tab.key === 'consumable') setInventoryTab(ITEM_TYPES.CONSUMABLE);
                                    if (tab.key === 'equipment') setInventoryTab(ITEM_TYPES.EQUIPMENT);
                                }}
                                style={{
                                    padding: '4px 6px',
                                    fontSize: '0.72rem',
                                    minWidth: '72px',
                                    whiteSpace: 'nowrap',
                                    flex: '0 0 auto',
                                    border: mobilePanelTab === tab.key ? '1px solid #7cff9a' : '1px solid #555',
                                    background: mobilePanelTab === tab.key ? '#213025' : '#1f1f1f',
                                    color: '#ddd'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div style={{ border: '1px solid #444', background: 'rgba(0,0,0,0.25)', padding: '6px', display: 'flex', flexDirection: 'column', gap: '6px', overflow: 'hidden', color: '#ddd', minHeight: 0 }}>
                        {(mobilePanelTab === 'consumable' || mobilePanelTab === 'equipment') && (
                            <>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <button
                                        onClick={() => shiftInventoryPage(inventoryTab, -1)}
                                        disabled={activeInventoryPage <= 0}
                                        style={{
                                            opacity: activeInventoryPage <= 0 ? 0.4 : 1,
                                            padding: '2px 8px'
                                        }}
                                    >
                                        {'<'}
                                    </button>
                                    <div style={{ marginLeft: 'auto', marginRight: 'auto', fontSize: '0.72rem', color: '#8dd2ff' }}>
                                        第 {activeInventoryPage + 1}/{totalInventoryPages} 頁
                                    </div>
                                    <button
                                        onClick={() => shiftInventoryPage(inventoryTab, 1)}
                                        disabled={activeInventoryPage >= totalInventoryPages - 1}
                                        style={{
                                            opacity: activeInventoryPage >= totalInventoryPages - 1 ? 0.4 : 1,
                                            padding: '2px 8px'
                                        }}
                                    >
                                        {'>'}
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '4px' }}>
                                    {mobileVisibleInventorySlots.map((stack, idx) => (
                                        <button
                                            key={`mobile-inv-slot-${inventoryTab}-${activeInventoryPage}-${idx}`}
                                            onClick={(e) => {
                                                if (!stack) return;
                                                if (stack.id === 'repair_kit' && e.detail < 2) {
                                                    appendConsoleLog('急救套件：連點兩下可立即使用');
                                                    return;
                                                }
                                                if (tryUseGlobalItem(stack.id)) return;
                                                setSelectedItemId((prev) => (prev === stack.id ? null : stack.id));
                                            }}
                                            style={{
                                                aspectRatio: '1 / 1',
                                                border: stack && selectedItemId === stack.id ? '2px solid #7cff9a' : '1px solid #666',
                                                background: stack ? '#1f1f1f' : '#111',
                                                color: '#ddd',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '2px 5px',
                                                fontSize: '0.72rem'
                                            }}
                                        >
                                            <span>{stack?.icon || ''}</span>
                                            <span>{stack?.count || ''}</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        <div style={{ fontSize: '0.76rem', lineHeight: 1.35, overflowY: 'auto', minHeight: 0 }}>
                            {mobilePanelTab === 'wave' && (
                                waveInfo ? (
                                    <div style={{ display: 'grid', gap: '8px' }}>
                                        <div style={{ color: '#8dd2ff', fontSize: '0.8rem' }}>當波怪物資訊</div>
                                        <div style={{ border: '1px solid #2f2f2f', borderRadius: '6px', padding: '6px' }}>
                                            <div>波數: {gameState.wave}</div>
                                            <div>怪物類型: {waveInfo.type}</div>
                                            <div>單位生命值: {waveInfo.hp}</div>
                                            <div>基礎移動速度: {waveInfo.speed.toFixed(2)}</div>
                                            <div>目標出怪數: {waveInfo.spawnTarget}</div>
                                            <div>波尾 Boss: {waveInfo.bossCount}</div>
                                            <div>已出怪數: {waveInfo.spawned}</div>
                                            <div>場上存活: {waveInfo.alive}</div>
                                            <div>關卡血量倍率: x{waveInfo.hpScale.toFixed(2)}</div>
                                            <div style={{ marginTop: '4px', color: '#f7d9a7' }}>
                                                詞墜: {waveInfo.affixes?.length ? waveInfo.affixes.map((a) => a.name).join('、') : '無'}
                                            </div>
                                            {waveInfo.affixes?.length > 0 && (
                                                <div style={{ color: '#c2d6e8' }}>
                                                    {waveInfo.affixes.map((a) => a.desc).join(' / ')}
                                                </div>
                                            )}
                                        </div>
                                        {nextWaveInfo && (
                                            <>
                                                <div style={{ color: '#8dd2ff', fontSize: '0.8rem' }}>下波怪物資訊</div>
                                                <div style={{ border: '1px solid #2f2f2f', borderRadius: '6px', padding: '6px' }}>
                                                    <div>波數: {nextWaveInfo.wave}</div>
                                                    <div>怪物類型: {nextWaveInfo.type}</div>
                                                    <div>單位生命值: {nextWaveInfo.hp}</div>
                                                    <div>基礎移動速度: {nextWaveInfo.speed.toFixed(2)}</div>
                                                    <div>目標出怪數: {nextWaveInfo.spawnTarget}</div>
                                                    <div>波尾 Boss: {nextWaveInfo.bossCount}</div>
                                                    <div>關卡血量倍率: x{nextWaveInfo.hpScale.toFixed(2)}</div>
                                                    <div style={{ marginTop: '4px', color: '#f7d9a7' }}>
                                                        詞墜: {nextWaveInfo.affixes?.length ? nextWaveInfo.affixes.map((a) => a.name).join('、') : '無'}
                                                    </div>
                                                    {nextWaveInfo.affixes?.length > 0 && (
                                                        <div style={{ color: '#c2d6e8' }}>
                                                            {nextWaveInfo.affixes.map((a) => a.desc).join(' / ')}
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ color: '#8a8a8a' }}>尚無關卡資訊</div>
                                )
                            )}
                            {mobilePanelTab === 'towers' && (
                                towerRows.length === 0 ? (
                                    <div style={{ color: '#8a8a8a' }}>目前還沒有塔</div>
                                ) : (
                                    <div style={{ display: 'grid', gap: '6px' }}>
                                        {towerRows.map((row) => (
                                            <div
                                                key={`mobile-tower-${row.id}`}
                                                onClick={() => setSelectedTowerId(row.id)}
                                                style={{
                                                    border: selectedTowerId === row.id ? '1px solid #55c18f' : '1px solid #2f2f2f',
                                                    background: selectedTowerId === row.id ? 'rgba(85, 193, 143, 0.14)' : 'transparent',
                                                    borderRadius: '6px',
                                                    padding: '6px'
                                                }}
                                            >
                                                <div style={{ color: '#f0f0f0' }}>{row.name} Lv.{row.level}</div>
                                                {row.supportAuraType ? (
                                                    <div style={{ color: '#bcbcbc' }}>
                                                        待升級: {row.pendingUpgrades} | 待專精: {row.pendingSpecialization ? '是' : '否'} | EXP: {row.supportExp}/15 | 靈氣: {row.supportAuraType} | 範圍: {row.supportAuraRange}
                                                    </div>
                                                ) : (
                                                    <div style={{ color: '#bcbcbc' }}>
                                                        待升級: {row.pendingUpgrades} | 待專精: {row.pendingSpecialization ? '是' : '否'} | K: {row.kills} | Dmg: {row.damage}
                                                    </div>
                                                )}
                                                {row.supportAuraStatus ? (
                                                    <div style={{ color: '#8de8df' }}>
                                                        靈氣效果 +{(row.supportAuraStatus.effectPct || 0).toFixed(0)}% | 影響塔 {row.supportAuraStatus.affectedTowerCount || 0}
                                                    </div>
                                                ) : (
                                                    <div style={{ color: '#ffd99b' }}>
                                                        靈氣加成: 傷 +{(row.auraSnapshot?.damagePct || 0).toFixed(0)}% | 速 +{(row.auraSnapshot?.speedPct || 0).toFixed(0)}% | 暴 +{(row.auraSnapshot?.critChancePct || 0).toFixed(0)}%
                                                    </div>
                                                )}
                                                {row.equipmentName && (
                                                    <div style={{ color: '#9ad7ff' }}>裝備: {row.equipmentName}</div>
                                                )}
                                                {row.resonanceNames?.length > 0 && (
                                                    <div style={{ color: '#9ad7ff' }}>共鳴: {row.resonanceNames.join('、')}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                            {mobilePanelTab === 'tower_detail' && (
                                selectedTower && selectedTowerDetail ? (
                                    <div style={{ display: 'grid', gap: '6px' }}>
                                        <div style={{ color: '#8dd2ff', fontSize: '0.8rem' }}>選取塔詳細資訊</div>
                                        <div style={{ border: '1px solid #2f2f2f', borderRadius: '6px', padding: '6px', color: '#ddd' }}>
                                            <div>名稱: {getTowerName(selectedTower.type)}</div>
                                            <div>等級: {selectedTower.level}</div>
                                            {selectedTowerDetail.equipmentName && <div>裝備: {selectedTowerDetail.equipmentName}</div>}
                                            <div>傷害: {Math.floor(selectedTowerDetail.initialDamage)} + {Math.floor(selectedTowerDetail.bonusBaseDamage)} + 火 {Math.floor(selectedTowerDetail.extraFire)} / 水 {Math.floor(selectedTowerDetail.extraWater)} / 木 {Math.floor(selectedTowerDetail.extraWood)}</div>
                                            <div>暴擊率: {selectedTowerDetail.initialCrit.toFixed(0)}% + ({selectedTowerDetail.extraCrit >= 0 ? '+' : ''}{selectedTowerDetail.extraCrit.toFixed(0)}%)</div>
                                            <div>暴擊傷害: {((INITIAL_CRIT_DMG - 1) * 100).toFixed(0)}% + ({selectedTowerDetail.extraCritDmg >= 0 ? '+' : ''}{(selectedTowerDetail.extraCritDmg * 100).toFixed(0)}%)</div>
                                            <div>攻速: {selectedTowerDetail.initialSpeed.toFixed(2)} + ({selectedTowerDetail.extraSpeed >= 0 ? '+' : ''}{selectedTowerDetail.extraSpeed.toFixed(2)})</div>
                                            <div>距離: {selectedTowerDetail.initialRange.toFixed(1)} + ({selectedTowerDetail.extraRange >= 0 ? '+' : ''}{selectedTowerDetail.extraRange.toFixed(1)})</div>
                                            <div style={{ color: '#ffd99b' }}>靈氣加成: 傷 +{selectedTowerDetail.auraSnapshot.damagePct.toFixed(0)}% | 速 +{selectedTowerDetail.auraSnapshot.speedPct.toFixed(0)}% | 暴 +{selectedTowerDetail.auraSnapshot.critChancePct.toFixed(0)}%</div>
                                            <div style={{ color: '#ffd99b' }}>靈氣暴傷加成: +{selectedTowerDetail.auraSnapshot.critDmgBonus.toFixed(2)}</div>
                                            {selectedTowerDetail.resonanceNames?.length > 0 && (
                                                <div style={{ color: '#9ad7ff' }}>共鳴: {selectedTowerDetail.resonanceNames.join('、')}</div>
                                            )}
                                        </div>
                                        <div style={{ border: '1px solid #2f2f2f', borderRadius: '6px', padding: '6px' }}>
                                            <div style={{ color: '#8dd2ff', marginBottom: '4px' }}>已選天賦</div>
                                            {selectedTowerDetail.talentRows.length === 0 ? (
                                                <div style={{ color: '#8a8a8a' }}>尚未選擇天賦</div>
                                            ) : (
                                                selectedTowerDetail.talentRows.map((row) => (
                                                    <div key={`mobile-talent-${row.key}`} style={{ color: '#d7d7d7' }}>
                                                        {row.label} {row.isSpec ? '專精' : (row.isMax ? 'LVMax' : `LV${row.level}`)}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ color: '#8a8a8a' }}>請先點選一座塔</div>
                                )
                            )}
                            {mobilePanelTab === 'rank' && (
                                towerRankRows.length === 0 ? (
                                    <div style={{ color: '#8a8a8a' }}>目前沒有可排名的塔</div>
                                ) : (
                                    <div style={{ display: 'grid', gap: '6px' }}>
                                        {towerRankRows.map((row, idx) => (
                                            <div key={`mobile-rank-${row.id}`} style={{ border: '1px solid #2f2f2f', borderRadius: '6px', padding: '6px' }}>
                                                <div style={{ color: '#f0f0f0' }}>#{idx + 1} {row.name} Lv.{row.level}</div>
                                                <div style={{ color: '#bcbcbc' }}>傷害 {row.damage} | 擊殺 {row.kills} | DPS {row.dps.toFixed(1)}</div>
                                                {row.supportAuraType ? (
                                                    <div style={{ color: '#8de8df' }}>
                                                        靈氣: {row.supportAuraType} | 效果 +{(row.supportAuraStatus?.effectPct || 0).toFixed(0)}%
                                                    </div>
                                                ) : (
                                                    <div style={{ color: '#ffd99b' }}>
                                                        靈氣加成: 傷 +{(row.auraSnapshot?.damagePct || 0).toFixed(0)}% | 速 +{(row.auraSnapshot?.speedPct || 0).toFixed(0)}%
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                            {mobilePanelTab === 'console' && (
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    <div style={{ border: '1px solid #3b3b3b', borderRadius: '6px', padding: '6px' }}>
                                        <div style={{ color: '#8dd2ff', marginBottom: '6px' }}>更新日誌</div>
                                        {UPDATE_LOG_ITEMS.map((item, idx) => (
                                            <div key={`mobile-update-${idx}`} style={{ color: '#cfd6df', marginBottom: '3px' }}>
                                                {idx + 1}. {item}
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ border: '1px solid #3b3b3b', borderRadius: '6px', padding: '6px' }}>
                                        <div style={{ color: '#8dd2ff', marginBottom: '6px' }}>Console</div>
                                        {consoleLog.length === 0 ? (
                                            <div style={{ color: '#8a8a8a' }}>尚無紀錄</div>
                                        ) : (
                                            consoleLog.map((line, idx) => (
                                                <div key={`mobile-console-${idx}`} style={{ color: '#9bcf9f', borderBottom: '1px solid #272727', padding: '3px 0' }}>
                                                    {line}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                            {(mobilePanelTab === 'consumable' || mobilePanelTab === 'equipment') && (
                                <>
                                    <div style={{ color: '#8dd2ff' }}>道具說明</div>
                                    {!selectedInventoryItem && (
                                        <div style={{ marginTop: '4px', color: '#8dd2ff' }}>
                                            選取道具後點地圖上的塔使用
                                        </div>
                                    )}
                                    {selectedInventoryItem && (
                                        <div style={{ marginTop: '4px', color: '#ddd', border: '1px solid #2f2f2f', borderRadius: '6px', padding: '6px' }}>
                                            <div style={{ color: '#fff', fontWeight: 700 }}>
                                                {selectedInventoryItem.name} x{selectedInventoryItem.count}
                                            </div>
                                            <div style={{ color: '#bfc6d1', marginTop: '4px' }}>{selectedInventoryItem.description}</div>
                                            <div style={{ color: '#8dd2ff', marginTop: '4px' }}>
                                                類型: {selectedInventoryItem.type === ITEM_TYPES.EQUIPMENT ? '裝備（每塔僅 1 件，不可卸下）' : '道具（點塔使用）'}
                                            </div>
                                            <div style={{ marginTop: '6px' }}>
                                                <button onClick={() => setSelectedItemId(null)} style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                                                    取消選取
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Game;




