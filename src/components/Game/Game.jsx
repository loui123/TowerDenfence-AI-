import React, { useState, useEffect, useRef, useMemo } from 'react';
import { generateMap } from '../../engine/MapGenerator';
import { GameEngine } from '../../engine/GameEngine';
import { useGame } from '../../contexts/GameContext';
import { RESOURCES, TOWER_TYPES } from '../../data/constants';
import { ITEM_DEFS, ITEM_TYPES } from '../../data/items';
import { Heart, Play, FastForward } from 'lucide-react';

const CELL_SIZE = 40;
const INITIAL_CRIT_DMG = 2.0;

const UPGRADE_POOL = [
    { id: 'base_magic_dmg', label: '法術基礎傷害 +20', desc: '法術塔基礎傷害提高 20', onlyMagic: true },
    { id: 'speed_magic', label: '急速施法', desc: '攻擊間隔縮短 20%（最多 5 次）', onlyMagic: true, maxCount: 5 },
    { id: 'trigger_magic', label: '法術觸發率 +20%', desc: '元素法術觸發機率提高 20%（最多 3 次）', onlyMagic: true, onlyAfterMagicElement: true, maxCount: 3 },
    { id: 'elemental_fire_magic', label: '火元素術式', desc: '基礎傷害轉火傷；觸發火爆（基礎+40，後續每級+60）', onlyMagic: true, magicElement: 'fire' },
    { id: 'elemental_water_magic', label: '水元素術式', desc: '基礎傷害轉水傷；觸發水花（基礎+40，後續每級+60）', onlyMagic: true, magicElement: 'water' },
    { id: 'elemental_wood_magic', label: '木元素術式', desc: '基礎傷害轉木傷；觸發龍捲（基礎+20，後續每級+40）', onlyMagic: true, magicElement: 'wood' },
    { id: 'fire_dmg', label: '火屬性附加傷害 +25%', desc: '增加火屬性追加傷害', element: 'fire' },
    { id: 'water_dmg', label: '水屬性附加傷害 +25%', desc: '增加水屬性追加傷害', element: 'water' },
    { id: 'wood_dmg', label: '木屬性附加傷害 +25%', desc: '增加木屬性追加傷害', element: 'wood' },
    { id: 'base_dmg', label: '基礎傷害 +25%', desc: '直接提升基礎傷害' },
    { id: 'crit_chance', label: '暴擊率 +10%', desc: '提高暴擊觸發機率' },
    { id: 'crit_dmg', label: '暴擊傷害 +20%', desc: '提高暴擊倍率' },
    { id: 'speed', label: '攻速 +10%', desc: '縮短攻擊間隔', maxCount: 5 },
    { id: 'range', label: '攻擊距離 +1', desc: '提升攻擊範圍', maxCount: 2 },
    { id: 'proj_chain_up', label: '連鎖次數 +1', desc: '投射物額外連鎖一次', onlyProjectile: true, maxCount: 2 },
    { id: 'proj_count_up', label: '攻擊數量 +1', desc: '投射物額外命中目標 +1', onlyProjectile: true, maxCount: 2 },
    { id: 'melee_bleed', label: '附加流血', desc: '近戰命中後 4 秒流血，每秒 30% 基礎傷害（每級 +30%）', onlyMelee: true },
    { id: 'addition_attack', label: '額外攻擊 +1', desc: '命中時追加 50% 基礎傷害攻擊', onlyMelee: true, maxCount: 3 },
    { id: 'slow_power_up', label: '緩速效果增加 +10%', desc: '緩速塔每級額外 +10% 緩速', onlySlowTower: true, maxCount: 3 },
    { id: 'knockback_up', label: '擊退距離 +0.5', desc: '砲擊塔命中擊退更遠', onlyArtillery: true }
];

const SPECIALIZATION_POOL = [
    { id: 'spec_speed_aura', label: '加速靈氣', desc: '所有塔攻速 +10%', condition: (t) => (t.upgradeStats?.speed || 0) >= 5 },
    { id: 'spec_fire_global', label: '火之靈氣', desc: '所有塔命中觸發 20% 基礎火傷（2 格）', condition: (t) => (t.upgradeStats?.fire_dmg || 0) >= 5 },
    { id: 'spec_water_global', label: '水之靈氣', desc: '所有塔命中 25% 機率暈眩 0.15 秒並附加 50% 基礎水傷', condition: (t) => (t.upgradeStats?.water_dmg || 0) >= 5 },
    { id: 'spec_wood_global', label: '木專精', desc: '所有塔命中附加中毒（每秒 10% 基礎木傷，4 秒，可疊）', condition: (t) => (t.upgradeStats?.wood_dmg || 0) >= 5 },
    { id: 'spec_crit_global', label: '暴擊靈氣', desc: '所有塔暴擊機率 +20%', condition: (t) => (t.upgradeStats?.crit_chance || 0) >= 5 },
    { id: 'spec_crit_dmg_global', label: '暴傷靈氣', desc: '所有塔暴擊傷害 +20%', condition: (t) => (t.upgradeStats?.crit_dmg || 0) >= 5 },
    { id: 'spec_tower_speed_50', label: '攻速提升 20%', desc: '該塔攻速提升 20%' },
    { id: 'spec_tower_base_100', label: '基礎傷害提升 100%', desc: '該塔基礎傷害 x2' },
    { id: 'spec_tower_range_3', label: '攻擊範圍 +3', desc: '該塔攻擊範圍 +3 格' },
    { id: 'spec_tower_share_exp', label: '經驗外溢', desc: '該塔擊殺經驗隨機分配給其他塔' },
    { id: 'spec_tower_crit_random', label: '隨機暴傷', desc: '該塔暴擊額外 +10%~1000%' },
    { id: 'spec_tower_stun_02', label: '攻擊暈眩', desc: '該塔每次攻擊暈眩 0.2 秒' },
    { id: 'spec_tower_fire_explosion', label: '火焰爆炸', desc: '該塔命中觸發 50% 基礎火焰爆炸（3 格）' },
    { id: 'spec_tower_attr_off_triple', label: '棄屬性強化', desc: '屬性攻擊失效，基礎傷害 x3' },
    { id: 'spec_tower_half_dmg_double_speed', label: '高速連擊', desc: '基礎傷害減半，攻速翻倍' }
];

const SUPPORT_UPGRADE_POOL = [
    { id: 'support_attack_aura_up', label: '強化攻擊靈氣效果', desc: '攻擊靈氣效果每級 +15%', requireAura: 'attack' },
    { id: 'support_speed_aura_up', label: '強化速度靈氣效果', desc: '速度靈氣效果每級 +15%', requireAura: 'speed' },
    { id: 'support_slow_aura_up', label: '強化緩速靈氣效果', desc: '緩速靈氣效果每級 +15%', requireAura: 'slow' },
    { id: 'support_crit_aura_up', label: '強化暴擊靈氣效果', desc: '暴擊靈氣效果每級 +15%', requireAura: 'crit' },
    { id: 'support_convert_speed_aura', label: '轉換為速度靈氣', desc: '將攻擊靈氣轉為速度靈氣（僅一次）', requireAura: 'attack', isConvert: true },
    { id: 'support_convert_slow_aura', label: '轉換為緩速靈氣', desc: '將攻擊靈氣轉為緩速靈氣（僅一次）', requireAura: 'attack', isConvert: true },
    { id: 'support_convert_crit_aura', label: '轉換為暴擊靈氣', desc: '將攻擊靈氣轉為暴擊靈氣（僅一次）', requireAura: 'attack', isConvert: true },
    { id: 'support_aura_range_up', label: '範圍增加 1 格', desc: '當前靈氣範圍 +1' },
    { id: 'support_gain_level_book', label: '獲得經驗之書 x1', desc: '立即獲得 1 本經驗之書' },
    { id: 'support_gain_speed_book', label: '獲得速度之書 x1', desc: '立即獲得 1 本速度之書' },
    { id: 'support_gain_power_book', label: '獲得力量之書 x1', desc: '立即獲得 1 本力量之書' },
    { id: 'support_gain_crit_book', label: '獲得暴擊之書 x1', desc: '立即獲得 1 本暴擊之書' },
    { id: 'support_gain_gold_1000', label: '獲得金幣 1000', desc: '立即獲得 1000 金幣' }
];

const SUPPORT_SPECIALIZATION_POOL = [
    { id: 'support_spec_level_books_10', label: '經驗之書 x10', desc: '立即獲得 10 本經驗之書' },
    { id: 'support_spec_speed_books_10', label: '速度之書 x10', desc: '立即獲得 10 本速度之書' },
    { id: 'support_spec_power_books_10', label: '力量之書 x10', desc: '立即獲得 10 本力量之書' },
    { id: 'support_spec_crit_books_10', label: '暴擊之書 x10', desc: '立即獲得 10 本暴擊之書' },
    { id: 'support_spec_double_aura', label: '靈氣效果翻倍', desc: '當前塔的靈氣效果提升一倍' },
    { id: 'support_spec_range_5', label: '靈氣範圍 +5', desc: '當前塔的靈氣範圍增加五格' },
    { id: 'support_spec_lucky_aura', label: '幸運靈氣', desc: '附近塔暴擊傷害每秒隨機增加 0~2 倍' }
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
        description: '投射物塔 30% 丟失攻擊，近戰塔暴擊 +20%',
        image: 'repeating-linear-gradient(45deg, rgba(40,120,55,0.28) 0 8px, rgba(20,80,35,0.16) 8px 16px)'
    },
    plain: {
        name: '平原',
        description: '近戰塔攻速 +20%，路徑怪物移速 +10%',
        image: 'linear-gradient(180deg, rgba(165,200,95,0.22), rgba(120,160,70,0.14))'
    },
    swamp: {
        name: '沼澤',
        description: '近戰塔攻速 -20%，路徑怪物移速 -30%',
        image: 'repeating-radial-gradient(circle at 25% 35%, rgba(70,100,60,0.24) 0 10px, rgba(50,70,40,0.1) 10px 18px)'
    },
    desert: {
        name: '沙地',
        description: '無額外效果',
        image: 'linear-gradient(140deg, rgba(220,190,120,0.2), rgba(170,140,85,0.12))'
    },
    rocky: {
        name: '岩地',
        description: '無額外效果',
        image: 'repeating-linear-gradient(25deg, rgba(120,120,130,0.22) 0 7px, rgba(80,80,90,0.12) 7px 14px)'
    },
    ruins: {
        name: '遺跡',
        description: '無額外效果',
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
const isMeleeTower = (tower) => tower?.type === 'melee';
const isProjectileTower = (tower) => tower?.stats?.type === 'projectile';
const isSlowTower = (tower) => tower?.type === 'projectile_slow';
const isArtilleryTower = (tower) => tower?.type === 'projectile_aoe';
const isMagicTower = (tower) => tower?.type === 'magic';
const isSupportTower = (tower) => tower?.type === 'support' || tower?.stats?.type === 'support';

const lerp = (a, b, t) => Math.round(a + (b - a) * t);

const getTowerLevelColor = (level) => {
    if (level >= 15) return 'rgb(192, 192, 204)';

    const start = { r: 255, g: 136, b: 40 }; // orange
    const end = { r: 132, g: 66, b: 186 }; // purple
    const t = Math.max(0, Math.min(1, (level - 1) / 14));
    return `rgb(${lerp(start.r, end.r, t)}, ${lerp(start.g, end.g, t)}, ${lerp(start.b, end.b, t)})`;
};

const getTerrainLabel = (terrain) => TERRAIN_META[terrain]?.name || '無';
const getTerrainEffectText = (terrain) => TERRAIN_META[terrain]?.description || '無特殊效果';
const getTerrainImage = (terrain) => TERRAIN_META[terrain]?.image || 'none';
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
    const { talents, resources, addResource } = useGame();
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const visualsRef = useRef({});
    const autoNextWaveRef = useRef(false);
    const crystalGrantedRef = useRef(false);
    const topBarRef = useRef(null);
    const audioCtxRef = useRef(null);
    const bgmGainRef = useRef(null);
    const sfxGainRef = useRef(null);
    const bgmTimerRef = useRef(null);
    const bgmStepRef = useRef(0);
    const bgmNextTimeRef = useRef(0);
    const sfxEnabledRef = useRef(true);
    const combatSfxCooldownRef = useRef({ attack: 0, explosion: 0 });

    const [mapData] = useState(() => generateMap(15, 15));
    const [grid, setGrid] = useState(mapData.grid);

    const [gameState, setGameState] = useState({
        gold: 200,
        wave: 1,
        hp: 1,
        maxHp: 1,
        mobsCount: 0,
        waveActive: false,
        gameSpeed: 1,
        gameSpeedCap: 2,
        pendingUpgradePoints: 0
    });

    const [gameOver, setGameOver] = useState(false);
    const [autoNextWave, setAutoNextWave] = useState(false);

    const [buildTarget, setBuildTarget] = useState(null); // {x, y}
    const [upgradeTarget, setUpgradeTarget] = useState(null); // {x, y}
    const [upgradeOptions, setUpgradeOptions] = useState([]);
    const [towerPanelMode, setTowerPanelMode] = useState('upgrade'); // upgrade | specialization
    const [selectedTowerId, setSelectedTowerId] = useState(null);
    const [viewport, setViewport] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 1280,
        height: typeof window !== 'undefined' ? window.innerHeight : 720
    });
    const [inventory, setInventory] = useState([]); // [{id, count}]
    const [selectedItemId, setSelectedItemId] = useState(null);
    const [, setDropLog] = useState([]);
    const [consoleLog, setConsoleLog] = useState([]);
    const [inventoryTab, setInventoryTab] = useState(ITEM_TYPES.CONSUMABLE);
    const [inventoryPageByType, setInventoryPageByType] = useState({
        [ITEM_TYPES.CONSUMABLE]: 0,
        [ITEM_TYPES.EQUIPMENT]: 0
    });
    const [mobileInfoTab, setMobileInfoTab] = useState('wave'); // wave | towers | rank
    const [topBarHeight, setTopBarHeight] = useState(70);
    const [bgmEnabled, setBgmEnabled] = useState(true);
    const [sfxEnabled, setSfxEnabled] = useState(true);

    const isInteractionModalOpen = !!buildTarget || !!upgradeTarget;

    useEffect(() => {
        autoNextWaveRef.current = autoNextWave;
    }, [autoNextWave]);

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
    }, [viewport.width, gameState.waveActive, gameOver, autoNextWave]);

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

    const toggleBgm = () => {
        ensureAudioContext();
        setBgmEnabled((prev) => !prev);
    };

    const toggleSfx = () => {
        ensureAudioContext();
        const next = !sfxEnabledRef.current;
        sfxEnabledRef.current = next;
        setSfxEnabled(next);
        if (next) triggerSfx('item');
    };

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
            wood: loadImg('/monster_wood.png')
        };
    }, []);

    useEffect(() => {
        const engine = new GameEngine(mapData.grid, mapData.path, talents, {
            onGameOver: () => {
                triggerSfx('defeat');
                setGameOver(true);
                engine.stop();
            },
            onVictory: () => {
                triggerSfx('victory');
                if (!crystalGrantedRef.current) {
                    addResource(RESOURCES.WATER, 1);
                    crystalGrantedRef.current = true;
                }

                const continuePlay = window.confirm('已完成第10關，獲得 1 水晶。按「確定」繼續遊玩（後續不再獲得水晶），按「取消」返回主選單。');
                if (!continuePlay) {
                    engine.stop();
                    onExit();
                    return false;
                }

                return true;
            },
            onWaveComplete: (wave) => {
                triggerSfx('wave');
                appendConsoleLog(`第 ${wave - 1} 波完成`);
                if (autoNextWaveRef.current) {
                    setTimeout(() => {
                        if (engineRef.current) engineRef.current.startNextWave();
                    }, 200);
                }
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

        let animationFrameId;
        const renderLoop = () => {
            animationFrameId = requestAnimationFrame(renderLoop);

            if (!canvasRef.current || !engineRef.current) return;

            const ctx = canvasRef.current.getContext('2d');
            const eng = engineRef.current;
            const images = visualsRef.current;
            const nowMs = performance.now();
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
                let projectileColor = '#ffd54a';
                if (proj.sourceTower?.type === 'projectile_slow') projectileColor = '#66b8ff';
                if (proj.sourceTower?.type === 'projectile') projectileColor = '#ffd54a';
                if (proj.sourceTower?.type === 'magic') projectileColor = '#b67bff';
                ctx.fillStyle = projectileColor;
                ctx.beginPath();
                ctx.arc(proj.x * CELL_SIZE, proj.y * CELL_SIZE, 4, 0, Math.PI * 2);
                ctx.fill();
            });

            eng.effects.forEach((eff) => {
                const cx = eff.x * CELL_SIZE;
                const cy = eff.y * CELL_SIZE;

                if (eff.type === 'slash') {
                    ctx.strokeStyle = `rgba(255, 255, 255, ${eff.life / 0.3})`;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    const startAngle = eff.angle - Math.PI / 4;
                    const endAngle = eff.angle + Math.PI / 4;
                    ctx.arc(cx, cy, 20, startAngle, endAngle);
                    ctx.stroke();
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
                }
            });

            eng.areaEffects?.forEach((area) => {
                if (area.type !== 'tornado') return;
                const cx = area.x * CELL_SIZE;
                const cy = area.y * CELL_SIZE;
                const alpha = Math.max(0, area.life / 3);
                ctx.strokeStyle = `rgba(120, 220, 140, ${Math.min(1, alpha)})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(cx, cy, area.radius * CELL_SIZE, 0, Math.PI * 2);
                ctx.stroke();
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
        };
    }, []);

    useEffect(() => {
        if (!engineRef.current) return;

        if (gameOver || isInteractionModalOpen) {
            engineRef.current.stop();
            return;
        }

        engineRef.current.resume();
    }, [gameOver, isInteractionModalOpen]);

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
            if (option.id === 'crit_chance' && (tower.stats?.crit || 0) >= 1) return false;
            if (option.maxCount && (tower.upgradeStats?.[option.id] || 0) >= option.maxCount) return false;
            if (option.magicElement && tower.magicElement && tower.magicElement !== option.magicElement) return false;
            if (option.onlyAfterMagicElement && !tower.magicElement) return false;
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
            return shuffle(SUPPORT_SPECIALIZATION_POOL).slice(0, 3);
        }
        const globalMasteries = engineRef.current?.globalMasteries || {};

        const filtered = SPECIALIZATION_POOL.filter((option) => {
            if (option.id === 'spec_speed_aura' && globalMasteries.speedAura) return false;
            if (option.id === 'spec_fire_global' && globalMasteries.fireMastery) return false;
            if (option.id === 'spec_water_global' && globalMasteries.waterMastery) return false;
            if (option.id === 'spec_wood_global' && globalMasteries.woodMastery) return false;
            if (option.id === 'spec_crit_global' && globalMasteries.critAura) return false;
            if (option.id === 'spec_crit_dmg_global' && globalMasteries.critDmgAura) return false;
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
            }

            if (category === 'slow') {
                if (id === 'spec_water_global') p += 55;
                if (id === 'spec_tower_stun_02') p += 35;
                if (id === 'spec_speed_aura') p += 20;
            }

            if (tower.lockedElement === 'fire' && id === 'spec_fire_global') p += 35;
            if (tower.lockedElement === 'water' && id === 'spec_water_global') p += 35;
            if (tower.lockedElement === 'wood' && id === 'spec_wood_global') p += 35;

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

    const handleStartWave = () => {
        if (!engineRef.current) return;
        ensureAudioContext();
        startBgmLoop();
        triggerSfx('wave');
        engineRef.current.startNextWave();
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
                    window.alert(result?.message || '使用道具失敗');
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
            window.alert(`金幣不足，重骰需要 ${rerollCost}`);
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

        const initialDamage = baseStats.damage || 0;
        const currentBaseDamage = selectedTower.stats?.damage || 0;
        const bonusBaseDamage = Math.max(0, currentBaseDamage - initialDamage);

        const extraFire = selectedTower.stats?.extraFire || 0;
        const extraWater = selectedTower.stats?.extraWater || 0;
        const extraWood = selectedTower.stats?.extraWood || 0;

        const initialCrit = (baseStats.crit || 0) * 100;
        const currentCrit = (selectedTower.stats?.crit || 0) * 100;
        const extraCrit = currentCrit - initialCrit;

        const currentCritDmg = selectedTower.stats?.critDmg || INITIAL_CRIT_DMG;
        const extraCritDmg = currentCritDmg - INITIAL_CRIT_DMG;

        const initialSpeed = baseStats.speed || 0;
        const currentSpeed = selectedTower.stats?.speed || 0;
        const extraSpeed = currentSpeed - initialSpeed;

        const initialRange = baseStats.range || 0;
        const currentRange = selectedTower.stats?.range || 0;
        const extraRange = currentRange - initialRange;

        const specRows = selectedTower.specializationId
            ? [{ key: selectedTower.specializationId, label: SPECIALIZATION_LABEL_MAP[selectedTower.specializationId] || selectedTower.specializationId, isSpec: true }]
            : [];
        const upgradeRows = Object.entries(selectedTower.upgradeStats || {})
            .filter(([, lv]) => lv > 0)
            .map(([id, lv]) => ({
                key: id,
                label: UPGRADE_LABEL_MAP[id] || id,
                level: lv,
                isSpec: false
            }))
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
            talentRows: [...specRows, ...upgradeRows],
            auraSnapshot,
            supportAuraStatus
        };
    })();

    const towerRows = engine
        ? [...engine.towers].map((tower) => {
            const auraSnapshot = engine.getTowerAuraSnapshot?.(tower) || null;
            const supportAuraStatus = isSupportTower(tower) ? (engine.getSupportAuraStatus?.(tower) || null) : null;
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
                damage: Math.floor(tower.totalDamageDealt || 0),
                equipmentName: tower.equipmentName || null,
                auraSnapshot,
                supportAuraStatus
            };
        })
        : [];

    const towerRankRows = [...towerRows]
        .sort((a, b) => (b.damage - a.damage) || (b.kills - a.kills))
        .slice(0, 10);

    const waveInfo = engine
        ? (() => {
            const cfg = engine.getWaveConfig(gameState.wave);
            const density = engine.getMobDensityMultiplier();
            const hp = 10 * gameState.wave * engine.getMobHpMultiplier() * engine.getWaveHpScale(gameState.wave);
            return {
                type: cfg.type,
                spawnTarget: Math.max(1, Math.floor(cfg.count * density)),
                bossCount: 1,
                spawned: engine.mobsSpawned || 0,
                alive: engine.mobs.length || 0,
                hpScale: engine.getWaveHpScale(gameState.wave),
                hp: Math.floor(hp),
                speed: 2.0,
                image: getMobImage(cfg.type)
            };
        })()
        : null;

    const nextWaveInfo = engine
        ? (() => {
            const nextWave = gameState.wave + 1;
            const cfg = engine.getWaveConfig(nextWave);
            const density = engine.getMobDensityMultiplier();
            const hp = 10 * nextWave * engine.getMobHpMultiplier() * engine.getWaveHpScale(nextWave);
            return {
                wave: nextWave,
                type: cfg.type,
                spawnTarget: Math.max(1, Math.floor(cfg.count * density)),
                bossCount: 1,
                hpScale: engine.getWaveHpScale(nextWave),
                hp: Math.floor(hp),
                speed: 2.0,
                image: getMobImage(cfg.type)
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
    const mobileBottomPanelHeight = 232;
    const mobileMiddleHeight = Math.max(220, viewport.height - mobileTopBarOffset - mobileBottomPanelHeight - 8);
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
        { key: 'wave', label: '關卡資訊' },
        { key: 'towers', label: '塔資訊' },
        { key: 'rank', label: '排名' }
    ];
    const mobileInfoIndex = Math.max(0, mobileInfoTabs.findIndex((tab) => tab.key === mobileInfoTab));
    const cycleMobileInfoTab = (direction) => {
        const nextIndex = (mobileInfoIndex + direction + mobileInfoTabs.length) % mobileInfoTabs.length;
        setMobileInfoTab(mobileInfoTabs[nextIndex].key);
    };

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
                minHeight: '60px',
                background: '#222',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'stretch' : 'center',
                justifyContent: 'space-between',
                padding: isMobile ? '8px 10px' : '0 20px',
                borderBottom: '1px solid #444',
                zIndex: 10,
                gap: isMobile ? '8px' : 0
            }} ref={topBarRef}>
                <div style={{ display: 'flex', gap: isMobile ? '10px' : '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ color: 'gold', fontWeight: 'bold' }}>金幣 {Math.floor(gameState.gold)}</span>
                    <span style={{ color: 'red', display: 'flex', alignItems: 'center', gap: '5px' }}><Heart size={16} /> {gameState.hp}/{gameState.maxHp}</span>
                    <span style={{ color: '#aaa' }}>波數: {gameState.wave}</span>
                    <span>怪物: {gameState.mobsCount}</span>
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
                            title={gameState.gameSpeedCap > 2 ? '提高遊戲速度' : '需先在主選單升級遊戲速度天賦'}
                        >
                            +
                        </button>
                        <span style={{ color: '#7aa8d8', fontSize: '0.85em' }}>上限 x{gameState.gameSpeedCap.toFixed(2)}</span>
                    </span>
                    <span style={{ color: '#9ee493' }}>能量: {resources.energy}</span>
                    <span style={{ color: '#86c5ff' }}>木材: {resources.wood}</span>
                    <span style={{ color: '#ffb36a' }}>礦石: {resources.ore}</span>
                    <span style={{ color: '#79b8ff' }}>水晶: {resources.water}</span>

                    {!gameState.waveActive && !gameOver && (
                        <button onClick={handleStartWave} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'green', border: 'none' }}>
                            <Play size={16} fill="white" /> 下一波
                        </button>
                    )}

                    <button
                        onClick={() => setAutoNextWave((prev) => !prev)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: autoNextWave ? '#0e6b2a' : '#333',
                            border: `1px solid ${autoNextWave ? '#54d67a' : '#555'}`
                        }}
                    >
                        <FastForward size={14} /> 自動跳關: {autoNextWave ? '開' : '關'}
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
                    <div style={{ color: '#7cff9a', fontWeight: 700 }}>待選升級: {gameState.pendingUpgradePoints}</div>
                    <button
                        onClick={toggleBgm}
                        style={{
                            background: bgmEnabled ? '#264b2f' : '#2a2a2a',
                            border: `1px solid ${bgmEnabled ? '#6ad58a' : '#555'}`
                        }}
                    >
                        BGM {bgmEnabled ? '開' : '關'}
                    </button>
                    <button
                        onClick={toggleSfx}
                        style={{
                            background: sfxEnabled ? '#2b374a' : '#2a2a2a',
                            border: `1px solid ${sfxEnabled ? '#79b8ff' : '#555'}`
                        }}
                    >
                        音效 {sfxEnabled ? '開' : '關'}
                    </button>
                    <button onClick={onExit}>離開</button>
                </div>
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
                                    <div>暴擊傷害: {INITIAL_CRIT_DMG.toFixed(2)} + ({selectedTowerDetail.extraCritDmg >= 0 ? '+' : ''}{selectedTowerDetail.extraCritDmg.toFixed(2)})</div>
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
                                </div>

                                <div style={{ borderLeft: '1px solid #2f2f2f', paddingLeft: '10px', overflow: 'hidden', minWidth: 0 }}>
                                    <div style={{ marginBottom: '4px', color: '#e5e5e5' }}>已選天賦</div>
                                    {selectedTowerDetail.talentRows.length === 0 ? (
                                        <div style={{ color: '#8a8a8a' }}>尚未選擇天賦</div>
                                    ) : (
                                        selectedTowerDetail.talentRows.map((row) => (
                                            <div key={row.key} style={{ color: row.isSpec ? '#c0c0c0' : '#d7d7d7' }}>
                                                {row.label} {row.isSpec ? '' : `LV${row.level}`}
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
                                        backgroundImage: getTerrainImage(cell.terrain),
                                        backgroundSize: 'cover',
                                        backgroundBlendMode: 'screen',
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
                                            background: getTowerLevelColor(tower?.level || 1),
                                            borderRadius: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 700,
                                            fontSize: '14px',
                                            color: '#111',
                                            border: `1px solid ${getTowerColor(cell.towerType)}`
                                        }}>
                                            {getTowerLabel(cell.towerType)}
                                        </div>
                                    )}

                                    {isReady && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 1,
                                            right: hasEquipment ? 20 : 1,
                                            minWidth: 16,
                                            height: 16,
                                            borderRadius: 999,
                                            background: '#7cff9a',
                                            color: '#0d3318',
                                            fontSize: 11,
                                            fontWeight: 800,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '0 4px'
                                        }}>
                                            {pending}
                                        </div>
                                    )}
                                    {hasEquipment && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 1,
                                            right: 1,
                                            width: 16,
                                            height: 16,
                                            borderRadius: 3,
                                            background: '#4fa6ff',
                                            color: '#eaf4ff',
                                            fontSize: 11,
                                            fontWeight: 800,
                                            lineHeight: '16px',
                                            textAlign: 'center',
                                            boxShadow: '0 0 0 1px rgba(12, 35, 64, 0.7)'
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
                            <button onClick={onExit}>回主選單</button>
                        </div>
                    )}

                    {buildTarget && (
                        <div style={{
                            position: 'absolute',
                            top: '50px',
                            left: '50px',
                            right: '50px',
                            bottom: '50px',
                            background: '#222',
                            border: '2px solid #66ccff',
                            padding: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            zIndex: 20
                        }}>
                            <h3>選擇要建造的塔</h3>
                            <div style={{ color: '#cde8ff', textAlign: 'left' }}>
                                地形: {getTerrainLabel(buildCell?.terrain)} | 效果: {getTerrainEffectText(buildCell?.terrain)}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridAutoRows: '1fr', gap: '8px', flex: 1, minHeight: 0 }}>
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
                                    <div>
                                        花費: {type.cost} | 型態: {type.stats.type === 'projectile' ? '投射物' : (type.stats.type === 'magic' ? '法術' : (type.stats.type === 'support' ? '輔助' : '近戰'))}
                                    </div>
                                        <div style={{ color: '#cfd6df' }}>傷害: {type.stats.damage} | 攻速: {type.stats.speed.toFixed(2)}</div>
                                        <div style={{ color: '#cfd6df' }}>距離: {type.stats.range} | 暴擊: {(type.stats.crit * 100).toFixed(0)}%</div>
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setBuildTarget(null)} style={{ alignSelf: 'flex-end' }}>取消</button>
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
                                            onClick={() => {
                                                if (!stack) return;
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
                    display: 'grid',
                    gridTemplateRows: '116px 1fr',
                    gap: '8px',
                    overflow: 'hidden',
                    zIndex: 12
                }}>
                    <div style={{ border: '1px solid #444', background: 'rgba(0,0,0,0.25)', padding: '6px', display: 'flex', flexDirection: 'column', gap: '6px', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button
                                onClick={() => setInventoryTab(ITEM_TYPES.CONSUMABLE)}
                                style={{
                                    border: inventoryTab === ITEM_TYPES.CONSUMABLE ? '1px solid #7cff9a' : '1px solid #555',
                                    background: inventoryTab === ITEM_TYPES.CONSUMABLE ? '#1f3a25' : '#1f1f1f',
                                    color: '#ddd',
                                    padding: '3px 7px',
                                    fontSize: '0.74rem'
                                }}
                            >
                                道具
                            </button>
                            <button
                                onClick={() => setInventoryTab(ITEM_TYPES.EQUIPMENT)}
                                style={{
                                    border: inventoryTab === ITEM_TYPES.EQUIPMENT ? '1px solid #7cff9a' : '1px solid #555',
                                    background: inventoryTab === ITEM_TYPES.EQUIPMENT ? '#1f2d3a' : '#1f1f1f',
                                    color: '#ddd',
                                    padding: '3px 7px',
                                    fontSize: '0.74rem'
                                }}
                            >
                                裝備
                            </button>
                            <button
                                onClick={() => shiftInventoryPage(inventoryTab, -1)}
                                disabled={activeInventoryPage <= 0}
                                style={{ marginLeft: 'auto', opacity: activeInventoryPage <= 0 ? 0.4 : 1, padding: '2px 8px' }}
                            >
                                {'<'}
                            </button>
                            <button
                                onClick={() => shiftInventoryPage(inventoryTab, 1)}
                                disabled={activeInventoryPage >= totalInventoryPages - 1}
                                style={{ opacity: activeInventoryPage >= totalInventoryPages - 1 ? 0.4 : 1, padding: '2px 8px' }}
                            >
                                {'>'}
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '4px' }}>
                            {mobileVisibleInventorySlots.map((stack, idx) => (
                                <button
                                    key={`mobile-inv-slot-${inventoryTab}-${activeInventoryPage}-${idx}`}
                                    onClick={() => {
                                        if (!stack) return;
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
                    </div>

                    <div style={{ border: '1px solid #444', background: 'rgba(0,0,0,0.25)', padding: '6px', display: 'flex', flexDirection: 'column', gap: '6px', overflow: 'hidden', color: '#ddd' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 30px', gap: '6px', alignItems: 'center' }}>
                            <button onClick={() => cycleMobileInfoTab(-1)}>{'<'}</button>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                                {mobileInfoTabs.map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setMobileInfoTab(tab.key)}
                                        style={{
                                            padding: '2px 6px',
                                            fontSize: '0.72rem',
                                            border: mobileInfoTab === tab.key ? '1px solid #7cff9a' : '1px solid #555',
                                            background: mobileInfoTab === tab.key ? '#213025' : '#1f1f1f'
                                        }}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => cycleMobileInfoTab(1)}>{'>'}</button>
                        </div>

                        <div style={{ fontSize: '0.76rem', lineHeight: 1.35, overflow: 'hidden' }}>
                            {mobileInfoTab === 'wave' && waveInfo && (
                                <div>
                                    <div>波數 {gameState.wave} | 類型 {waveInfo.type} | 血量 {waveInfo.hp}</div>
                                    <div>出怪 {waveInfo.spawned}/{waveInfo.spawnTarget} | Boss 1 | 場上 {waveInfo.alive}</div>
                                    {nextWaveInfo && <div>下波 {nextWaveInfo.type} | HP {nextWaveInfo.hp} | 目標 {nextWaveInfo.spawnTarget} | Boss 1</div>}
                                </div>
                            )}
                            {mobileInfoTab === 'towers' && (
                                towerRows.length === 0 ? (
                                    <div style={{ color: '#8a8a8a' }}>目前還沒有塔</div>
                                ) : (
                                    towerRows.slice(0, 4).map((row) => (
                                        <div key={`mobile-tower-${row.id}`}>
                                            {row.name} Lv.{row.level} | 升級 {row.pendingUpgrades} | 專精 {row.pendingSpecialization ? '是' : '否'}
                                            {row.supportAuraType
                                                ? ` | 靈氣 ${row.supportAuraType} +${(row.supportAuraStatus?.effectPct || 0).toFixed(0)}%`
                                                : ` | 靈氣傷 +${(row.auraSnapshot?.damagePct || 0).toFixed(0)}%`}
                                        </div>
                                    ))
                                )
                            )}
                            {mobileInfoTab === 'rank' && (
                                towerRankRows.length === 0 ? (
                                    <div style={{ color: '#8a8a8a' }}>目前沒有可排名的塔</div>
                                ) : (
                                    towerRankRows.slice(0, 4).map((row, idx) => (
                                        <div key={`mobile-rank-${row.id}`}>
                                            #{idx + 1} {row.name} Lv.{row.level} | 傷害 {row.damage} | 擊殺 {row.kills}
                                        </div>
                                    ))
                                )
                            )}
                            {!selectedInventoryItem && (
                                <div style={{ marginTop: '4px', color: '#8dd2ff' }}>選取道具後點地圖上的塔使用</div>
                            )}
                            {selectedInventoryItem && (
                                <div style={{ marginTop: '4px', color: '#9bcf9f' }}>
                                    已選: {selectedInventoryItem.name} x{selectedInventoryItem.count}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Game;


