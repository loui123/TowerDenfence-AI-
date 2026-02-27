
import { TOWER_TYPES, MONSTER_TYPES, WAVE_CONFIG, TALENTS, RESOURCES } from '../data/constants';
import { ITEM_DEFS, ITEM_TYPES, MONSTER_ITEM_DROP_TABLE, BOSS_EXTRA_DROP_TABLE } from '../data/items';

export class GameEngine {
    constructor(grid, path, talents, events) {
        this.grid = grid;
        this.path = path;
        this.talents = talents;
        this.events = events;

        this.width = 15;
        this.height = 15;
        this.cellSize = 40;

        this.mobs = [];
        this.towers = [];
        this.projectiles = [];
        this.floatingTexts = [];
        this.effects = [];
        this.areaEffects = [];

        this.wave = 1;
        this.gold = 200 + (this.getTalentValue('initial_gold') || 0);
        this.maxHp = 5 + Math.max(0, Math.floor(this.getTalentValue('player_max_hp')));
        this.hp = this.maxHp;
        this.victory = false;

        this.waveActive = false;
        this.waveTimer = 0;
        this.mobsSpawned = 0;
        this.spawnTimer = 0;

        this.paused = false;
        this.lastTime = 0;
        this.userGameSpeed = 1;
        this.globalMasteries = this.getDefaultGlobalMasteries();
        this.waveAffixCache = {};
        this.waveTypeCache = {};
        this.waveResonanceHintCache = {};
        this.lastPlaceTowerError = null;
        this.towerLimitBonus = 0;

        console.log("GameEngine Initialized", { pathLength: path?.length, wave: this.wave });
    }

    getDefaultGlobalMasteries() {
        return {
            speedAura: false,
            fireMastery: false,
            waterMastery: false,
            woodMastery: false,
            woodPoisonDurationBonus: 0,
            poisonMastery: false,
            poisonFrequencyMastery: false,
            poisonDamageMult: 1,
            poisonDurationMin: 0,
            poisonTickRateMult: 1,
            poisonSlowPct: 0,
            critAura: false,
            critDmgAura: false,
            baseDamageAuraMult: 1,
            attackSpeedAuraMult: 1,
            critChanceAuraBonus: 0,
            critDmgAuraBonus: 0,
            fireAttrDamageMult: 1,
            waterAttrDamageMult: 1,
            woodAttrDamageMult: 1,
            itemDropRateBonus: 0,
            woodBaseAura: false,
            woodCritDmgAura: false,
            waterBaseAura: false,
            waterSpeedAura: false,
            fireSpeedAura: false,
            fireCritAura: false,
            bleedSpeedAura: false,
            bleedBaseAura: false,
            itemDropAura: false
        };
    }

    getWaveAffixProgress(wave) {
        return Math.max(0, Math.min(1, (wave - 10) / 40));
    }

    lerpByWave(wave, from, to) {
        const t = this.getWaveAffixProgress(wave);
        return from + ((to - from) * t);
    }

    buildAffixById(id, wave) {
        if (id === 'slow_resist_cap') {
            const minSpeedMult = this.lerpByWave(wave, 0.8, 0.4);
            return {
                id,
                name: '緩速效果減免',
                value: minSpeedMult,
                desc: `被緩速效果最多至 ${(minSpeedMult * 100).toFixed(0)}%`
            };
        }
        if (id === 'stun_hardness') {
            return {
                id,
                name: '暈眩效果硬質',
                value: 0.5,
                desc: '每 1 秒最多承受 0.5 秒暈眩'
            };
        }
        if (id === 'stun_duration_reduction') {
            const reduction = this.lerpByWave(wave, 0.4, 0.8);
            return {
                id,
                name: '暈眩效果減免',
                value: reduction,
                desc: `暈眩持續時間減少 ${(reduction * 100).toFixed(0)}%`
            };
        }
        if (id === 'palsy_resist_cap') {
            return {
                id,
                name: '麻痺效果硬質',
                value: 0.1,
                desc: '每 1 秒最多承受 0.1 秒麻痺'
            };
        }
        if (id === 'crit_damage_reduction') {
            const reduction = this.lerpByWave(wave, 1.0, 2.0);
            return {
                id,
                name: '暴擊傷害減免',
                value: reduction,
                desc: `承受暴擊傷害減少 ${(reduction * 100).toFixed(0)}%（不得低於 0%）`
            };
        }
        if (id === 'crit_resist') {
            const resist = this.lerpByWave(wave, 0.1, 0.8);
            return {
                id,
                name: '暴擊抵抗',
                value: resist,
                desc: `命中該怪物時暴擊率減少 ${(resist * 100).toFixed(0)}%`
            };
        }
        if (id === 'melee_dmg_reduction') return { id, name: '近戰傷害減免', value: 0.3, desc: '承受近戰傷害減少 30%' };
        if (id === 'bleed_dmg_reduction') return { id, name: '流血減免', value: 0.3, desc: '承受流血傷害減少 30%' };
        if (id === 'poison_dmg_reduction') return { id, name: '中毒傷害減免', value: 0.5, desc: '承受中毒傷害減少 50%' };
        if (id === 'projectile_dmg_reduction') return { id, name: '投射物傷害減免', value: 0.3, desc: '承受投射物傷害減少 30%' };
        if (id === 'elemental_dmg_reduction') return { id, name: '元素傷害減免', value: 0.3, desc: '承受元素傷害減少 30%' };
        if (id === 'magic_dmg_reduction') return { id, name: '法術傷害減免', value: 0.3, desc: '承受法術傷害減少 30%' };
        if (id === 'move_speed_up') {
            const progress = Math.max(0, Math.min(1, (wave - 10) / 50));
            const speedUp = 0.1 + ((0.6 - 0.1) * progress);
            return {
                id,
                name: '怪物移動速度提升',
                value: speedUp,
                desc: `怪物移動速度增加 ${(speedUp * 100).toFixed(0)}%`
            };
        }
        if (id === 'hp_percent_up') {
            const progress = Math.max(0, Math.min(1, (wave - 10) / 50));
            const hpUp = 0.1 + ((0.6 - 0.1) * progress);
            return {
                id,
                name: '怪物生命提升',
                value: hpUp,
                desc: `怪物生命增加 ${(hpUp * 100).toFixed(0)}%`
            };
        }
        if (id === 'knockback_resist') {
            const progress = Math.max(0, Math.min(1, (wave - 1) / 49));
            const resist = 0.1 + ((0.95 - 0.1) * progress);
            return {
                id,
                name: '擊退效果減免',
                value: resist,
                desc: `承受擊退效果減少 ${(resist * 100).toFixed(0)}%`
            };
        }
        if (id === 'mob_count_up') {
            if (wave < 30) return null;
            const mult = 1.25 + (Math.random() * (3.0 - 1.25));
            return {
                id,
                name: '怪物數量增加',
                value: mult,
                desc: `怪物數量提升 x${mult.toFixed(2)}`
            };
        }
        if (id === 'boss_count_up') {
            if (wave < 30) return null;
            const extraBoss = 1 + Math.floor(Math.random() * 5);
            return {
                id,
                name: 'BOSS數量增加',
                value: extraBoss,
                desc: `額外 BOSS +${extraBoss}`
            };
        }
        if (id === 'frostbite_dmg_reduction') {
            if (wave < 10) return null;
            const progress = Math.max(0, Math.min(1, (wave - 10) / 90));
            const reduction = 0.1 + ((0.95 - 0.1) * progress);
            return {
                id,
                name: '凍傷傷害減免',
                value: reduction,
                desc: `凍傷增傷效果減少 ${(reduction * 100).toFixed(0)}%`
            };
        }
        if (id === 'scorch_dmg_reduction') {
            if (wave < 10) return null;
            const progress = Math.max(0, Math.min(1, (wave - 10) / 90));
            const reduction = 0.1 + ((0.95 - 0.1) * progress);
            return {
                id,
                name: '灼燒傷害減免',
                value: reduction,
                desc: `灼燒傷害減少 ${(reduction * 100).toFixed(0)}%`
            };
        }
        return null;
    }

    getWaveAffixWeights() {
        return {
            slow_resist_cap: 5,
            stun_hardness: 5,
            stun_duration_reduction: 5,
            palsy_resist_cap: 5,
            crit_damage_reduction: 5,
            crit_resist: 5,
            melee_dmg_reduction: 10,
            bleed_dmg_reduction: 10,
            poison_dmg_reduction: 10,
            projectile_dmg_reduction: 10,
            elemental_dmg_reduction: 10,
            magic_dmg_reduction: 10,
            move_speed_up: 30,
            hp_percent_up: 40,
            knockback_resist: 40,
            mob_count_up: 10,
            boss_count_up: 10,
            frostbite_dmg_reduction: 10,
            scorch_dmg_reduction: 10
        };
    }

    getWaveAffixTargetCount(wave) {
        const safeWave = Math.max(1, Math.floor(wave || 1));
        if (safeWave <= 10) return 0;
        return Math.max(1, Math.floor(safeWave / 10));
    }

    getAffixControlGroup(id) {
        if (id === 'slow_resist_cap') return 'slow';
        if (id === 'stun_hardness' || id === 'stun_duration_reduction') return 'stun';
        if (id === 'palsy_resist_cap') return 'palsy';
        if (id === 'knockback_resist') return 'knockback';
        return null;
    }

    canRepeatAffixId(id, wave) {
        const safeWave = Math.max(1, Math.floor(wave || 1));
        if (safeWave < 30) return false;
        return id === 'move_speed_up' || id === 'hp_percent_up';
    }

    pickWeightedAffixIds(count, wave) {
        const safeWave = Math.max(1, Math.floor(wave || 1));
        const weights = this.getWaveAffixWeights();
        const entries = Object.entries(weights)
            .filter(([, weight]) => weight > 0)
            .filter(([id]) => !!this.buildAffixById(id, wave))
            .map(([id, weight]) => ({ id, weight }));

        const picks = [];
        const pickedIdCounts = {};
        const pickedControlGroups = new Set();

        while (picks.length < count && entries.length > 0) {
            const candidates = entries.filter((entry) => {
                const id = entry.id;
                const alreadyPicked = (pickedIdCounts[id] || 0) > 0;
                if (alreadyPicked && !this.canRepeatAffixId(id, safeWave)) {
                    return false;
                }
                if (safeWave >= 30) {
                    const controlGroup = this.getAffixControlGroup(id);
                    if (controlGroup && pickedControlGroups.has(controlGroup)) {
                        return false;
                    }
                }
                return true;
            });

            if (candidates.length <= 0) break;

            const totalWeight = candidates.reduce((sum, entry) => sum + entry.weight, 0);
            let roll = Math.random() * totalWeight;
            let index = 0;
            for (let i = 0; i < candidates.length; i++) {
                roll -= candidates[i].weight;
                if (roll <= 0) {
                    index = i;
                    break;
                }
            }
            const picked = candidates[index];
            picks.push(picked.id);
            pickedIdCounts[picked.id] = (pickedIdCounts[picked.id] || 0) + 1;

            const controlGroup = this.getAffixControlGroup(picked.id);
            if (safeWave >= 30 && controlGroup) {
                pickedControlGroups.add(controlGroup);
            }

            if (!this.canRepeatAffixId(picked.id, safeWave)) {
                const baseIndex = entries.findIndex((entry) => entry.id === picked.id);
                if (baseIndex >= 0) {
                    entries.splice(baseIndex, 1);
                }
            }
        }

        return picks;
    }

    rollWaveAffixes(wave) {
        const affixCount = this.getWaveAffixTargetCount(wave);

        if (affixCount <= 0) return [];
        const pickedIds = this.pickWeightedAffixIds(affixCount, wave);
        return pickedIds.map((id) => this.buildAffixById(id, wave)).filter(Boolean);
    }

    getWaveAffixes(wave) {
        if (!this.waveAffixCache[wave]) {
            this.waveAffixCache[wave] = this.rollWaveAffixes(wave);
        }
        return this.waveAffixCache[wave];
    }

    getWaveAffixMap(wave) {
        const map = {};
        for (const affix of this.getWaveAffixes(wave)) {
            map[affix.id] = affix.value;
        }
        return map;
    }

    getControlResistMultiplier(mob, controlType) {
        if (!mob || !controlType) return 1;
        const stacks = Math.max(0, mob.controlResistStacks?.[controlType] || 0);
        return Math.max(0.35, Math.pow(0.8, stacks));
    }

    registerControlEffect(mob, controlType) {
        if (!mob || !controlType) return;
        mob.controlResistStacks = mob.controlResistStacks || {};
        mob.controlResistTimers = mob.controlResistTimers || {};
        const nextStacks = Math.min(8, (mob.controlResistStacks[controlType] || 0) + 1);
        mob.controlResistStacks[controlType] = nextStacks;
        mob.controlResistTimers[controlType] = 5;
    }

    getResonanceCatalog() {
        return [
            {
                id: 'res_swamp_chain_control',
                name: '沼雷渦流',
                desc: '沼澤+緩速塔+閃電：緩速/連鎖強化',
                condition: (tower, terrain) => terrain === 'swamp' && tower?.type === 'projectile_slow' && tower?.equipmentId === 'chain_lightning',
                effects: { slowEffectMult: 1.2, chainLightningDamageMult: 1.35, chainLightningChainBonus: 6, chainLightningParalyzeBonus: 0.05 }
            },
            {
                id: 'res_highland_archer_courage',
                name: '高地鷹眼',
                desc: '高地+弓箭塔+勇氣戰旗：暴擊與傷害提升',
                condition: (tower, terrain) => terrain === 'highland' && tower?.type === 'projectile' && tower?.equipmentId === 'courage_banner',
                effects: { damageMult: 1.15, critChanceBonus: 0.2 }
            },
            {
                id: 'res_desert_artillery_firepower',
                name: '焦土重砲',
                desc: '沙地+砲擊塔+火力全開：砲擊與擊退強化',
                condition: (tower, terrain) => terrain === 'desert' && tower?.type === 'projectile_aoe' && tower?.equipmentId === 'full_firepower',
                effects: { damageMult: 1.3, knockbackDistanceMult: 1.2, knockbackRadiusBonus: 1 }
            },
            {
                id: 'res_forest_melee_slaughter',
                name: '森血狩獵',
                desc: '森林+近戰塔+殺戮戰旗：流血強化',
                condition: (tower, terrain) => terrain === 'forest' && tower?.type === 'melee' && tower?.equipmentId === 'slaughter_banner',
                effects: { bleedDamageMult: 1.8, bleedDurationBonus: 2, critDmgBonus: 0.25 }
            },
            {
                id: 'res_ruins_magic_chain',
                name: '遺跡雷術',
                desc: '遺跡+法術塔+閃電：施法與連鎖強化',
                condition: (tower, terrain) => terrain === 'ruins' && tower?.type === 'magic' && tower?.equipmentId === 'chain_lightning',
                effects: { speedMult: 1.15, chainLightningDamageMult: 1.2, chainLightningParalyzeBonus: 0.04 }
            },
            {
                id: 'res_plain_melee_agility',
                name: '平原突襲',
                desc: '平原+近戰塔+敏捷戰旗：攻速與傷害提升',
                condition: (tower, terrain) => terrain === 'plain' && tower?.type === 'melee' && tower?.equipmentId === 'agility_banner',
                effects: { speedMult: 1.2, damageMult: 1.15 }
            }
        ];
    }

    getTowerResonanceEffects(tower) {
        const base = {
            damageMult: 1,
            speedMult: 1,
            critChanceBonus: 0,
            critDmgBonus: 0,
            chainBonus: 0,
            slowEffectMult: 1,
            knockbackDistanceMult: 1,
            knockbackRadiusBonus: 0,
            knockbackStunBonus: 0,
            bleedDamageMult: 1,
            bleedDurationBonus: 0,
            chainLightningDamageMult: 1,
            chainLightningChainBonus: 0,
            chainLightningParalyzeBonus: 0,
            chainLightningParalyzeDurationBonus: 0
        };
        if (!tower) return base;

        const terrain = tower.terrain || this.getCellAtWorld(tower.x, tower.y)?.terrain;
        if (!terrain) return base;

        const activeIds = [];
        for (const resonance of this.getResonanceCatalog()) {
            if (!resonance.condition?.(tower, terrain)) continue;
            activeIds.push(resonance.id);
            const fx = resonance.effects || {};
            if (fx.damageMult) base.damageMult *= fx.damageMult;
            if (fx.speedMult) base.speedMult *= fx.speedMult;
            base.critChanceBonus += fx.critChanceBonus || 0;
            base.critDmgBonus += fx.critDmgBonus || 0;
            base.chainBonus += fx.chainBonus || 0;
            if (fx.slowEffectMult) base.slowEffectMult *= fx.slowEffectMult;
            if (fx.knockbackDistanceMult) base.knockbackDistanceMult *= fx.knockbackDistanceMult;
            base.knockbackRadiusBonus += fx.knockbackRadiusBonus || 0;
            base.knockbackStunBonus += fx.knockbackStunBonus || 0;
            if (fx.bleedDamageMult) base.bleedDamageMult *= fx.bleedDamageMult;
            base.bleedDurationBonus += fx.bleedDurationBonus || 0;
            if (fx.chainLightningDamageMult) base.chainLightningDamageMult *= fx.chainLightningDamageMult;
            base.chainLightningChainBonus += fx.chainLightningChainBonus || 0;
            base.chainLightningParalyzeBonus += fx.chainLightningParalyzeBonus || 0;
            base.chainLightningParalyzeDurationBonus += fx.chainLightningParalyzeDurationBonus || 0;
        }

        base.activeIds = activeIds;
        return base;
    }

    getWaveResonanceHints(wave) {
        const safeWave = Math.max(1, Math.floor(wave || 1));
        if (!this.waveResonanceHintCache[safeWave]) {
            const pool = this.getResonanceCatalog().map((r) => ({
                id: r.id,
                name: r.name,
                desc: r.desc
            }));
            if (pool.length <= 2) {
                this.waveResonanceHintCache[safeWave] = pool;
            } else {
                const first = (safeWave * 3) % pool.length;
                const second = (safeWave * 5 + 1) % pool.length;
                const hints = [pool[first]];
                if (second !== first) hints.push(pool[second]);
                else hints.push(pool[(second + 1) % pool.length]);
                this.waveResonanceHintCache[safeWave] = hints;
            }
        }
        return this.waveResonanceHintCache[safeWave];
    }

    getTalentValue(id) {
        const level = this.talents[id] || 0;
        const def = Object.values(TALENTS).find(t => t.id === id);
        if (!def) return 0;
        return level * def.perLevel;
    }

    getTowerTalentPrefix(typeId) {
        if (typeId === 'melee') return 'melee_tower';
        if (typeId === 'magic') return 'spell_tower';
        if (typeId === 'projectile' || typeId === 'projectile_slow' || typeId === 'projectile_aoe') return 'range_tower';
        return null;
    }

    getTowerTalentValue(typeId, statSuffix) {
        const prefix = this.getTowerTalentPrefix(typeId);
        if (!prefix) return 0;
        return this.getTalentValue(`${prefix}_${statSuffix}`);
    }

    getTowerTalentModifiersForType(typeId) {
        return {
            baseDamageBonus: this.getTowerTalentValue(typeId, 'dmg_base'),
            attrDamageMult: 1 + this.getTowerTalentValue(typeId, 'attr_dmg'),
            speedMult: 1 + this.getTowerTalentValue(typeId, 'atk_speed'),
            rangeBonus: this.getTowerTalentValue(typeId, 'range'),
            critBonus: this.getTowerTalentValue(typeId, 'crit_chance')
        };
    }

    getTowerStats(typeId) {
        const towerDef = Object.values(TOWER_TYPES).find(t => t.id === typeId);
        const statsBase = towerDef ? towerDef.stats : TOWER_TYPES.MELEE.stats;

        if (statsBase.type === 'support') {
            return {
                ...statsBase,
                damage: statsBase.damage,
                range: statsBase.range,
                speed: statsBase.speed,
                crit: statsBase.crit,
                kills: 0,
                level: 1,
                extraFire: 0,
                extraWater: 0,
                extraWood: 0
            };
        }

        const mods = this.getTowerTalentModifiersForType(typeId);
        const levelMults = {
            range: statsBase.range + mods.rangeBonus,
            speed: statsBase.speed * mods.speedMult,
            crit: statsBase.crit + mods.critBonus,
        };

        const baseDmgCalc = (statsBase.damage + mods.baseDamageBonus) * mods.attrDamageMult;

        return {
            ...statsBase,
            damage: baseDmgCalc,
            range: levelMults.range,
            speed: levelMults.speed,
            crit: levelMults.crit,
            kills: 0,
            level: 1,
            extraFire: 0,
            extraWater: 0,
            extraWood: 0
        };
    }

    start() {
        this.lastTime = performance.now();
        this.loop();
        console.log("Game Loop Started");
    }

    stop() {
        this.paused = true;
    }

    resume() {
        if (!this.paused) return;
        this.paused = false;
        this.lastTime = performance.now();
        this.loop();
    }

    startNextWave() {
        if (this.waveActive || this.victory || this.hp <= 0) return;
        console.log("Starting Wave", this.wave);
        this.waveActive = true;
        this.mobsSpawned = 0;
        this.spawnTimer = 0;
    }

    loop() {
        if (this.paused) return;

        const now = performance.now();
        const dt = (now - this.lastTime) / 1000;

        // Foreground keeps tighter cap; background allows larger dt so tab switching still advances waves.
        const hidden = (typeof document !== 'undefined' && !!document.hidden);
        const dtCap = hidden ? 1.0 : 0.1;
        const safeDt = Math.min(dt, dtCap) * this.getGameSpeedMultiplier();

        this.lastTime = now;

        this.update(safeDt);

        if (this.events.requestDraw) this.events.requestDraw();

        // Use timer-driven simulation loop so game logic can continue in background tabs.
        window.setTimeout(() => this.loop(), 16);
    }

    update(dt) {
        if (this.hp <= 0 || this.victory) return;

        this.updateSupportAuraState(dt);

        if (this.waveActive) {
            this.updateSpawning(dt);
        }

        this.updateMobs(dt);
        this.updateTowers(dt);
        this.updateProjectiles(dt);
        this.updateAreaEffects(dt);
        this.updateFloatingTexts(dt);
        this.updateEffects(dt);
    }

    updateEffects(dt) {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.life -= dt;
            if (effect.life <= 0) {
                this.effects.splice(i, 1);
            }
        }
    }

    addEffect(x, y, type, opts = {}) {
        this.effects.push({
            x, y, type,
            life: opts.life ?? 0.3,
            maxLife: opts.maxLife ?? (opts.life ?? 0.3),
            angle: Math.random() * Math.PI * 2,
            ...opts
        });
    }

    updateFloatingTexts(dt) {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.life -= dt;
            ft.y -= ft.vy * dt;
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    updateSpawning(dt) {
        const config = this.getWaveConfig(this.wave);
        const densityMultiplier = this.getMobDensityMultiplier();
        const waveCount = this.getWaveSpawnTarget(this.wave);
        const bossCount = this.getWaveBossCount(this.wave, waveCount);
        const spawnInterval = 1.0 / Math.max(1, densityMultiplier);

        if (this.mobsSpawned < waveCount) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                console.log("Spawning Mob...", this.mobsSpawned + 1, "/", waveCount);
                const isBoss = this.mobsSpawned >= (waveCount - bossCount);
                this.spawnMob(config.type, { isBoss });
                this.mobsSpawned++;
                this.spawnTimer = spawnInterval;
            }
        } else if (this.mobs.length === 0) {
            console.log("Wave Complete", this.wave);
            this.waveActive = false;
            this.wave++;
            this.events.onWaveComplete(this.wave);
        }
    }

    spawnMob(typeId, options = {}) {
        if (!this.path || this.path.length === 0) {
            console.error("Path missing! Cannot spawn mob.");
            return;
        }
        const buff = this.getMobHpMultiplier();
        const isBoss = !!options.isBoss;
        const bossHpMultiplier = isBoss ? 6 : 1;
        const bossSpeedMultiplier = isBoss ? 0.9 : 1;
        const waveAffixes = this.getWaveAffixes(this.wave);
        const waveAffixMap = this.getWaveAffixMap(this.wave);
        const moveSpeedUp = waveAffixMap.move_speed_up || 0;
        const hpPercentUp = waveAffixMap.hp_percent_up || 0;
        const hpMult = 1 + hpPercentUp;

        const newMob = {
            id: Math.random(),
            type: typeId,
            isBoss,
            spawnWave: this.wave,
            hp: 10 * this.wave * buff * this.getWaveHpScale(this.wave) * bossHpMultiplier * hpMult,
            maxHp: 10 * this.wave * buff * this.getWaveHpScale(this.wave) * bossHpMultiplier * hpMult,
            speed: 2 * bossSpeedMultiplier * (1 + moveSpeedUp),
            slowTimer: 0,
            slowMultiplier: 1,
            frostbiteStacks: 0,
            frostbiteTimer: 0,
            scorchStacks: 0,
            scorchTimer: 0,
            scorchAvgHit: 0,
            scorchSamples: 0,
            scorchTickTimer: 1,
            critVulnerabilityStacks: 0,
            stunTimer: 0,
            stunHardnessWindow: 0,
            stunHardnessApplied: 0,
            palsyHardnessApplied: 0,
            pathIndex: 0,
            progress: 0,
            x: this.path[0].x,
            y: this.path[0].y,
            affixes: waveAffixes,
            affixMap: waveAffixMap,
            controlResistStacks: { slow: 0, stun: 0, palsy: 0, knockback: 0 },
            controlResistTimers: { slow: 0, stun: 0, palsy: 0, knockback: 0 },
            slowOverflowDamageTakenBonus: 0,
            supportSlowOverflowDamageTakenBonus: 0,
            combinedSlowOverflowDamageTakenBonus: 0,
            knockbackDamageTakenByTower: {}
        };

        console.log("Mob Spawned:", isBoss ? "boss" : "mob", newMob.type, "at", newMob.x, newMob.y);
        this.mobs.push(newMob);
    }

    updateMobs(dt) {
        for (let i = this.mobs.length - 1; i >= 0; i--) {
            const mob = this.mobs[i];

            this.updateMobStatusEffects(mob, dt);

            if (mob.slowTimer > 0) {
                mob.slowTimer -= dt;
                if (mob.slowTimer <= 0) {
                    mob.slowTimer = 0;
                    mob.slowMultiplier = 1;
                }
            }

            if (mob.stunTimer > 0) {
                mob.stunTimer -= dt;
                if (mob.stunTimer < 0) mob.stunTimer = 0;
            }

            mob.stunHardnessWindow = (mob.stunHardnessWindow || 0) - dt;
            if (mob.stunHardnessWindow <= 0) {
                mob.stunHardnessWindow = 1;
                mob.stunHardnessApplied = 0;
                mob.palsyHardnessApplied = 0;
            }

            const waterSlowMult = 1 - (0.2 * Math.min(5, mob.magicWaterSlowStacks || 0));
            const tornadoSpeedMult = this.getMobTornadoSpeedMultiplier(mob);
            const currentSpeed = mob.speed
                * this.getMobTerrainSpeedMultiplier(mob)
                * (mob.poisonSlowMultiplier || 1)
                * Math.max(0.05, waterSlowMult)
                * tornadoSpeedMult;
            const slowCap = Math.max(0.05, mob.affixMap?.slow_resist_cap || 0.05);
            const supportSlowRawPct = this.getSupportSlowPctForMob(mob);
            const supportSlowAfterResistPct = Math.min(Math.max(0, supportSlowRawPct), 1 - slowCap);
            const supportOverflowPct = Math.max(0, supportSlowAfterResistPct - 0.75);
            const supportAppliedPct = Math.min(0.75, supportSlowAfterResistPct);
            mob.supportSlowOverflowDamageTakenBonus = supportOverflowPct;
            const baseAppliedPct = Math.max(0, Math.min(1 - slowCap, 1 - (mob.slowMultiplier || 1)));
            const combinedCapPct = supportAppliedPct > 0 ? 0.75 : 0.8;
            const combinedRawPct = baseAppliedPct + supportAppliedPct;
            const combinedAppliedPct = Math.min(combinedCapPct, combinedRawPct);
            const combinedOverflowPct = Math.max(0, combinedRawPct - combinedCapPct);
            mob.combinedSlowOverflowDamageTakenBonus = combinedOverflowPct;
            const finalSpeed = currentSpeed * Math.max(0.05, 1 - combinedAppliedPct);
            if (mob.stunTimer > 0) {
                continue;
            }
            const dist = finalSpeed * dt;

            // Debug extreme values
            if (isNaN(mob.x) || isNaN(mob.y)) {
                console.error("Mob has NaN pos:", mob);
                this.mobs.splice(i, 1);
                continue;
            }

            const targetNode = this.path[mob.pathIndex + 1];
            if (!targetNode) {
                console.log("Mob Removed: No Target Node", mob.pathIndex, this.path.length);
                this.hp -= 1;
                this.mobs.splice(i, 1);
                if (this.hp <= 0) this.events.onGameOver();
                continue;
            }

            mob.progress += dist;
            if (mob.progress >= 1.0) {
                mob.progress -= 1.0;
                mob.pathIndex++;
                if (mob.pathIndex >= this.path.length - 1) {
                    console.log("Mob Removed: Reached End");
                    this.hp -= 1;
                    this.mobs.splice(i, 1);
                    if (this.hp <= 0) this.events.onGameOver();
                    continue;
                }
            }

            const n1 = this.path[mob.pathIndex];
            const n2 = this.path[mob.pathIndex + 1];

            if (!n1 || !n2) {
                console.error("Mob Path Error: n1/n2 missing", mob.pathIndex, n1, n2);
                this.mobs.splice(i, 1);
                continue;
            }

            mob.x = n1.x + (n2.x - n1.x) * mob.progress;
            mob.y = n1.y + (n2.y - n1.y) * mob.progress;
        }
    }

    updateTowers(dt) {
        this.towers.forEach(tower => {
            if (tower?.stats?.type === 'support') return;
            const terrainMods = this.getTowerTerrainModifiers(tower);
            const resonance = this.getTowerResonanceEffects(tower);
            const globalSpeedMult = this.globalMasteries.speedAura ? 1.05 : 1.0;
            const towerSpeedMult = tower.masterySpeedMult || 1.0;
            const auraBonus = this.getBannerAuraBonuses(tower);
            const globalAuraSpeedMult = this.globalMasteries.attackSpeedAuraMult || 1;
            const effectiveSpeed = Math.max(0.01, tower.stats.speed * terrainMods.speedMult * resonance.speedMult * globalSpeedMult * globalAuraSpeedMult * towerSpeedMult * (1 + auraBonus.speedPct));
            tower.cooldown -= dt;
            if (tower.cooldown <= 0) {
                const targets = this.findTargets(tower, this.getAttackTargetCount(tower));
                if (targets.length > 0) {
                    this.fireTower(tower, targets);
                    tower.cooldown = 1 / effectiveSpeed;
                }
            }
        });
    }

    getAttackTargetCount(tower) {
        if (tower?.type === 'melee') {
            return Infinity;
        }
        if (tower?.stats?.type === 'magic') {
            return 1;
        }
        const baseCount = 1;
        const bonusCount = Math.max(0, Math.floor(this.getTowerTalentValue(tower?.type, 'proj_count'))) + (tower?.bonusTargets || 0);
        return baseCount + bonusCount;
    }

    getChainCount(tower) {
        if (tower?.stats?.type === 'magic') {
            return 0;
        }
        const resonance = this.getTowerResonanceEffects(tower);
        return Math.max(0, Math.floor(this.getTowerTalentValue(tower?.type, 'chain'))) + (tower?.bonusChain || 0) + Math.max(0, Math.floor(resonance.chainBonus || 0));
    }

    findTargets(tower, maxTargets = 1) {
        const inRange = this.mobs.filter((mob) => {
            const dx = mob.x - tower.x;
            const dy = mob.y - tower.y;
            return dx * dx + dy * dy <= tower.stats.range * tower.stats.range;
        });

        inRange.sort((a, b) => (b.pathIndex + b.progress) - (a.pathIndex + a.progress));
        return inRange.slice(0, maxTargets);
    }

    findChainTarget(originMob, excludedIds) {
        const chainRadius = 4;
        const chainRadiusSq = chainRadius * chainRadius;
        let best = null;
        let bestDistSq = Infinity;

        for (const mob of this.mobs) {
            if (!mob || excludedIds.has(mob.id)) continue;
            const dx = mob.x - originMob.x;
            const dy = mob.y - originMob.y;
            const distSq = dx * dx + dy * dy;

            if (distSq <= chainRadiusSq && distSq < bestDistSq) {
                best = mob;
                bestDistSq = distSq;
            }
        }

        return best;
    }

    scaleDamage(damageObj, multiplier) {
        return {
            base: (damageObj.base || 0) * multiplier,
            fire: (damageObj.fire || 0) * multiplier,
            water: (damageObj.water || 0) * multiplier,
            wood: (damageObj.wood || 0) * multiplier
        };
    }

    getTowerRawCritChance(tower, terrainMods, resonance, auraBonus) {
        return Math.max(0,
            (tower?.stats?.crit || 0)
            + (terrainMods?.critBonus || 0)
            + (resonance?.critChanceBonus || 0)
            + (this.globalMasteries.critAura ? 0.1 : 0)
            + (this.globalMasteries.critChanceAuraBonus || 0)
            + (auraBonus?.critChance || 0)
        );
    }

    getEffectiveCritChanceAgainstMob(rawCritChance, mob) {
        const critResist = Math.max(0, mob?.affixMap?.crit_resist || 0);
        return Math.max(0, rawCritChance - critResist);
    }

    rollCritAgainstMob(rawCritChance, mob) {
        const effective = this.getEffectiveCritChanceAgainstMob(rawCritChance, mob);
        return Math.random() < Math.min(1, effective);
    }

    fireTower(tower, targets) {
        const terrainMods = this.getTowerTerrainModifiers(tower);
        const resonance = this.getTowerResonanceEffects(tower);
        if (Math.random() < terrainMods.missChance) {
            this.floatingTexts.push({
                x: tower.x,
                y: tower.y - 0.3,
                text: 'MISS',
                color: '#9bd68f',
                forceColor: '#9bd68f',
                life: 0.6,
                vy: 0.8,
                isCrit: false
            });
            return;
        }

        const auraBonus = this.getBannerAuraBonuses(tower);
        const rawCritChance = this.getTowerRawCritChance(tower, terrainMods, resonance, auraBonus);
        const globalBaseDamageMult = this.globalMasteries.baseDamageAuraMult || 1;
        const damage = {
            base: tower.stats.damage * globalBaseDamageMult * terrainMods.damageMult * resonance.damageMult * auraBonus.damageMult,
            fire: (tower.stats.extraFire || 0) * terrainMods.damageMult * resonance.damageMult * auraBonus.damageMult * (this.globalMasteries.fireAttrDamageMult || 1),
            water: (tower.stats.extraWater || 0) * terrainMods.damageMult * resonance.damageMult * auraBonus.damageMult * (this.globalMasteries.waterAttrDamageMult || 1),
            wood: (tower.stats.extraWood || 0) * terrainMods.damageMult * resonance.damageMult * auraBonus.damageMult * (this.globalMasteries.woodAttrDamageMult || 1),
        };
        const magicElements = this.getTowerMagicElements(tower);
        if (magicElements.length > 0) {
            const baseVal = damage.base;
            damage.base = 0;
            const split = baseVal / magicElements.length;
            if (magicElements.includes('fire')) damage.fire += split;
            if (magicElements.includes('water')) damage.water += split;
            if (magicElements.includes('wood')) damage.wood += split;
        }
        if (tower.disableAttributes) {
            damage.fire = 0;
            damage.water = 0;
            damage.wood = 0;
        }

        if (tower.stats.type === 'projectile') {
            const initialChains = this.getChainCount(tower);
            targets.forEach((target) => {
                this.projectiles.push({
                    x: tower.x,
                    y: tower.y,
                    targetId: target.id,
                    lastKnownTargetX: target.x + 0.5,
                    lastKnownTargetY: target.y + 0.5,
                    speed: 10,
                    damage: damage,
                    rawCritChance,
                    sourceTower: tower,
                    remainingChains: initialChains,
                    chainMultiplier: 1,
                    hitHistory: []
                });
            });
        } else if (tower.stats.type === 'magic') {
            targets.forEach((target) => {
                this.addEffect(target.x + 0.5, target.y + 0.5, 'magic_orb', { life: 0.12, maxLife: 0.12 });
                if (magicElements.length <= 0) {
                    this.addEffect(target.x + 0.5, target.y + 0.5, 'magic_burst', { life: 0.28, maxLife: 0.28 });
                } else if (magicElements.length === 1 && magicElements[0] === 'fire') {
                    this.addEffect(target.x + 0.5, target.y + 0.5, 'fire_burst', { life: 0.28, maxLife: 0.28 });
                } else if (magicElements.length === 1 && magicElements[0] === 'water') {
                    this.addEffect(target.x + 0.5, target.y + 0.5, 'water_burst', { life: 0.3, maxLife: 0.3 });
                } else if (magicElements.length === 1 && magicElements[0] === 'wood') {
                    this.addEffect(target.x + 0.5, target.y + 0.5, 'wood_burst', { life: 0.35, maxLife: 0.35 });
                } else {
                    this.addEffect(target.x + 0.5, target.y + 0.5, 'magic_burst', { life: 0.32, maxLife: 0.32 });
                }
                const isCrit = this.rollCritAgainstMob(rawCritChance, target);
                const dealt = this.damageMob(target, damage, tower, isCrit);
                this.applyOnHitEffects(target, tower, dealt);
            });
        } else {
            targets.forEach((target) => {
                this.addEffect(target.x + 0.5, target.y + 0.5, 'slash');
                const isCrit = this.rollCritAgainstMob(rawCritChance, target);
                const dealt = this.damageMob(target, damage, tower, isCrit);
                this.applyOnHitEffects(target, tower, dealt);
                if (tower.type === 'melee' && (tower.additionalAttackCount || 0) > 0) {
                    const extraTimes = Math.max(0, tower.additionalAttackCount || 0);
                    for (let i = 0; i < extraTimes; i++) {
                        const extraDamage = { base: tower.stats.damage * 0.5, fire: 0, water: 0, wood: 0 };
                        this.damageMob(target, extraDamage, tower, false);
                    }
                }
            });
        }
    }

    updateProjectiles(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const target = this.mobs.find(m => m.id === p.targetId);

            let targetX = p.lastKnownTargetX;
            let targetY = p.lastKnownTargetY;
            let canHit = false;

            if (target) {
                targetX = target.x + 0.5;
                targetY = target.y + 0.5;
                p.lastKnownTargetX = targetX;
                p.lastKnownTargetY = targetY;
                canHit = true;
            } else if (targetX === undefined || targetY === undefined) {
                this.projectiles.splice(i, 1);
                continue;
            }

            const dx = targetX - p.x;
            const dy = targetY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 0.5) {
                if (canHit) {
                    this.addEffect(target.x + 0.5, target.y + 0.5, 'hit');
                    const isCrit = this.rollCritAgainstMob(p.rawCritChance || 0, target);
                    const dealt = this.damageMob(target, this.scaleDamage(p.damage, p.chainMultiplier || 1), p.sourceTower, isCrit);
                    this.applyOnHitEffects(target, p.sourceTower, dealt);

                    if (p.isNatureFusion) {
                        const randomAilment = Math.floor(Math.random() * 8);
                        switch (randomAilment) {
                            case 0: this.addPoisonStack(target, p.sourceTower, Math.max(1, p.damage.base * 0.2), 5, 0); break;
                            case 1: {
                                target.bleedStacks = target.bleedStacks || [];
                                const perTick = Math.max(1, p.damage.base * 0.2);
                                target.bleedStacks.push({ damagePerTick: perTick, duration: 5, tickTimer: 1, sourceTowerId: p.sourceTower?.id || null });
                                this.damageMob(target, { base: perTick, fire: 0, water: 0, wood: 0 }, p.sourceTower, false);
                                break;
                            }
                            case 2: this.applyFrostbite(target, 5); break;
                            case 3: this.applyScorch(target, p.sourceTower, Math.max(1, p.damage.base * 0.2)); break;
                            case 4: this.addSlowStack(target, 0.4, 3); target.slowEffectTimer = 3; break;
                            case 5: this.applyStun(target, 1, 'palsy'); break;
                            case 6: this.applyStun(target, 0.5, 'stun'); break;
                            case 7: {
                                const angle = Math.atan2(target.y - p.y, target.x - p.x);
                                target.x += Math.cos(angle) * 0.5;
                                target.y += Math.sin(angle) * 0.5;
                                break;
                            }
                        }
                    }
                }

                if (canHit && (p.remainingChains || 0) > 0) {
                    const allowRepeatChain = !!p.sourceTower?.chainNoLimit;
                    const excludedIds = allowRepeatChain
                        ? new Set([target.id])
                        : new Set([...(p.hitHistory || []), target.id]);
                    const nextTarget = this.findChainTarget(target, excludedIds);
                    if (nextTarget) {
                        p.targetId = nextTarget.id;
                        p.x = target.x + 0.5;
                        p.y = target.y + 0.5;
                        p.lastKnownTargetX = nextTarget.x + 0.5;
                        p.lastKnownTargetY = nextTarget.y + 0.5;
                        p.remainingChains -= 1;
                        p.chainMultiplier = allowRepeatChain ? (p.chainMultiplier || 1) : (p.chainMultiplier || 1) * 0.7;
                        p.hitHistory = allowRepeatChain ? [] : [...excludedIds];
                        continue;
                    }
                    if (allowRepeatChain && canHit) {
                        const bonusHits = Math.max(0, p.remainingChains || 0);
                        if (bonusHits > 0) {
                            const bonusMultiplier = (p.chainMultiplier || 1) * bonusHits;
                            const isCrit = this.rollCritAgainstMob(p.rawCritChance || 0, target);
                            this.damageMob(target, this.scaleDamage(p.damage, bonusMultiplier), p.sourceTower, isCrit);
                            p.remainingChains = 0;
                        }
                    }
                }

                this.projectiles.splice(i, 1);
            } else {
                const move = p.speed * dt;
                p.x += (dx / dist) * move;
                p.y += (dy / dist) * move;
            }
        }
    }

    formatDamage(value) {
        if (value >= 100000000) { // 1億
            return (value / 100000000).toFixed(1) + '億';
        } else if (value >= 10000) { // 1萬
            return (value / 10000).toFixed(1) + '萬';
        }
        return Math.floor(value).toString();
    }

    damageMob(mob, damageObj, tower, isCrit) {
        let totalDamage = 0;
        const globalCritDmgBonus = (this.globalMasteries.critDmgAura ? 0.1 : 0) + (this.globalMasteries.critDmgAuraBonus || 0);
        const auraBonus = tower ? this.getBannerAuraBonuses(tower) : { critDmgBonus: 0, luckCritDmgBonus: 0 };
        const resonance = tower ? this.getTowerResonanceEffects(tower) : { critDmgBonus: 0 };
        let critMult = isCrit
            ? ((tower?.stats?.critDmg || 2.0) + globalCritDmgBonus + (auraBonus.critDmgBonus || 0) + (auraBonus.luckCritDmgBonus || 0) + (resonance.critDmgBonus || 0))
            : 1.0;
        if (isCrit && tower?.randomCritBonus) {
            critMult += (0.1 + (Math.random() * 9.9));
        }

        const process = (val, type, color, typeId) => {
            if (!val || val <= 0) return;

            let effectiveCritMult = critMult;
            if (isCrit) {
                const critReduction = Math.max(0, mob.affixMap?.crit_damage_reduction || 0);
                const extra = Math.max(0, critMult - 1);
                effectiveCritMult = 1 + Math.max(0, extra * Math.max(0, 1 - critReduction));
                const critVulnStacks = Math.max(0, Math.min(100, mob.critVulnerabilityStacks || 0));
                if (critVulnStacks > 0) {
                    effectiveCritMult *= (1 + (0.01 * critVulnStacks));
                }
            }
            let finalVal = val * effectiveCritMult;
            let multiplier = 1.0;

            if (mob.isBoss && tower && tower.type === 'melee') {
                let bossMult = 1 + (tower.upgradeStats?.melee_boss_dmg || 0) * 0.5;
                if (tower.specializationId === 'spec_tower_boss_killer') bossMult += 2.0;
                finalVal *= Math.max(1, bossMult);
            }

            if (mob.type === 'wood' && typeId === 'fire') multiplier = 2.0;
            if (mob.type === 'fire' && typeId === 'water') multiplier = 2.0;
            if (mob.type === 'water' && typeId === 'wood') multiplier = 2.0;

            if (typeId === 'fire' && mob.fireVulnerabilityStacks) {
                multiplier *= (1 + (0.1 * Math.min(5, mob.fireVulnerabilityStacks)));
            }

            finalVal *= multiplier;

            if (tower?.type === 'melee' && (mob.affixMap?.melee_dmg_reduction || 0) > 0) {
                finalVal *= (1 - mob.affixMap.melee_dmg_reduction);
            }
            if (tower?.stats?.type === 'projectile' && (mob.affixMap?.projectile_dmg_reduction || 0) > 0) {
                finalVal *= (1 - mob.affixMap.projectile_dmg_reduction);
            }
            if (tower?.stats?.type === 'magic' && (mob.affixMap?.magic_dmg_reduction || 0) > 0) {
                finalVal *= (1 - mob.affixMap.magic_dmg_reduction);
            }
            if ((typeId === 'fire' || typeId === 'water' || typeId === 'wood') && (mob.affixMap?.elemental_dmg_reduction || 0) > 0) {
                finalVal *= (1 - mob.affixMap.elemental_dmg_reduction);
            }

            const ailmentTerrainMods = this.getMobAilmentTerrainModifiers(mob);
            const slowOverflowTakenBonus = Math.max(0, mob.slowOverflowDamageTakenBonus || 0)
                + Math.max(0, mob.supportSlowOverflowDamageTakenBonus || 0)
                + Math.max(0, mob.combinedSlowOverflowDamageTakenBonus || 0);
            if (slowOverflowTakenBonus > 0) {
                finalVal *= (1 + slowOverflowTakenBonus);
            }
            const knockbackTakenBonus = this.getKnockbackDamageTakenBonus(mob);
            if (knockbackTakenBonus > 0) {
                finalVal *= (1 + knockbackTakenBonus);
            }
            const frostbiteStacks = Math.max(0, mob.frostbiteStacks || 0);
            if (frostbiteStacks > 0) {
                const frostbiteReduction = Math.max(0, Math.min(0.95, mob.affixMap?.frostbite_dmg_reduction || 0));
                const frostbiteBonus = frostbiteStacks * ailmentTerrainMods.frostbitePerStack * (1 - frostbiteReduction);
                finalVal *= (1 + Math.max(0, frostbiteBonus));
            }

            const equipmentLevel = this.getTowerEquipmentLevel(tower);
            if (mob?.isBoss) {
                const bossDmgBonus = (tower?.upgradeStats?.melee_boss_dmg || 0) * 0.5;
                const bossKillerBonus = tower?.specBossKiller ? 2.0 : 0;
                if (bossDmgBonus > 0 || bossKillerBonus > 0) {
                    finalVal *= (1 + bossDmgBonus + bossKillerBonus);
                }
            }
            if (tower?.equipmentId === 'giant_slayer' && mob?.isBoss) {
                finalVal *= (1 + (0.6 * Math.max(1, equipmentLevel)));
            }
            if (tower?.equipmentId === 'executioner_axe' && mob?.maxHp > 0 && (mob.hp / mob.maxHp) <= 0.35) {
                finalVal *= (1 + (0.5 * Math.max(1, equipmentLevel)));
            }
            if (tower?.equipmentId === 'last_stand_emblem' && this.hp <= 1) {
                finalVal *= (1 + (0.35 * Math.max(1, equipmentLevel)));
            }

            totalDamage += finalVal;

            const offsetX = (Math.random() - 0.5) * 0.5;
            const offsetY = (Math.random() - 0.5) * 0.5;

            this.floatingTexts.push({
                x: mob.x + 0.5 + offsetX,
                y: mob.y + offsetY - 0.5,
                text: this.formatDamage(finalVal) + (multiplier > 1 ? '!' : ''),
                color: isCrit ? '#ffff00' : color,
                forceColor: color,
                life: 0.8,
                vy: 1.0,
                isCrit: isCrit
            });
        };

        process(damageObj.base, 'base', 'white', 'base');
        process(damageObj.fire, 'fire', '#ff4444', 'fire');
        process(damageObj.water, 'water', '#4444ff', 'water');
        process(damageObj.wood, 'wood', '#006400', 'wood');

        if (tower?.equipmentId === 'hard_gloves' && isCrit && totalDamage > 0) {
            mob.critVulnerabilityStacks = Math.min(100, Math.max(0, mob.critVulnerabilityStacks || 0) + 1);
        }

        mob.hp -= totalDamage;
        if (tower) {
            tower.totalDamageDealt = (tower.totalDamageDealt || 0) + totalDamage;
        }

        if (mob.hp <= 0) {
            console.log("Mob Died (HP <= 0)");
            const idx = this.mobs.indexOf(mob);
            if (idx !== -1) {
                this.mobs.splice(idx, 1);
                this.handleKill(mob, tower);
            }
        }
    }

    handleKill(mob, tower) {
        const waveDropMult = this.getWaveResourceDropMultiplier(mob?.spawnWave || this.wave);
        const dropAmount = Math.max(1, Math.floor(waveDropMult * this.getMobDropMultiplier()));

        const typeDef = Object.values(MONSTER_TYPES).find(m => m.id === mob.type);
        if (typeDef) {
            this.events.onResourceDrop(typeDef.resource, dropAmount);
        }
        if (mob?.isBoss) {
            this.events.onResourceDrop(RESOURCES.GOLD_ORE, 1);
        }
        this.rollItemDrop(mob);

        this.gold += 10;

        if (mob?.isBoss) {
            for (const t of this.towers) {
                this.grantTowerExp(t, 2);
            }
        }

        if (!tower) return;

        const equipmentLevel = this.getTowerEquipmentLevel(tower);
        if (tower.equipmentId === 'absorption_force') {
            tower.absorptionKillCount = (tower.absorptionKillCount || 0) + 1;
            tower.stats.damage = (tower.stats.damage || 0) + Math.max(1, equipmentLevel);
        }
        const luckyChance = Math.min(0.6, 0.12 + (0.04 * Math.max(0, equipmentLevel - 1)));
        if (tower.equipmentId === 'lucky_coin' && Math.random() < luckyChance && typeDef) {
            this.events.onResourceDrop(typeDef.resource, 1);
        }
        const vampireChance = Math.min(0.8, 0.25 + (0.1 * Math.max(0, equipmentLevel - 1)));
        if (tower.equipmentId === 'vampire_fang' && this.hp < this.maxHp && Math.random() < vampireChance) {
            this.hp = Math.min(this.maxHp, this.hp + 1);
        }

        this.grantSupportExpFromNearbyKill(tower);

        if (tower.redistributeKillExp && this.towers.length > 1) {
            const others = this.towers.filter(t => t.id !== tower.id);
            const randomTower = others[Math.floor(Math.random() * others.length)];
            this.grantTowerKill(randomTower);
            return;
        }

        this.grantTowerKill(tower);
    }

    rollItemDrop(mob) {
        if (!mob || !this.events?.onItemDrop) return;
        const table = MONSTER_ITEM_DROP_TABLE[mob.type] || [];
        const itemDropMult = 1 + Math.max(0, this.getTalentValue('item_drop_rate')) + Math.max(0, this.globalMasteries.itemDropRateBonus || 0);
        for (const entry of table) {
            const chance = Math.min(1, Math.max(0, entry.chance * itemDropMult));
            if (Math.random() < chance) {
                this.events.onItemDrop(entry.itemId, 1, mob.type);
            }
        }

        if (mob.isBoss) {
            for (const entry of BOSS_EXTRA_DROP_TABLE) {
                const chance = Math.min(1, Math.max(0, entry.chance * itemDropMult));
                if (Math.random() < chance) {
                    this.events.onItemDrop(entry.itemId, 1, 'boss_extra');
                }
            }
        }
    }

    applyTowerUpgrade(tower, upgradeType) {
        if (!tower || (tower.pendingUpgrades || 0) <= 0) return false;
        if (tower.type === 'support' && !upgradeType.startsWith('support_')) return false;

        switch (upgradeType) {
            case 'fire_dmg':
                tower.lockedElement = tower.lockedElement || 'fire';
                break;
            case 'water_dmg':
                tower.lockedElement = tower.lockedElement || 'water';
                break;
            case 'wood_dmg':
                tower.lockedElement = tower.lockedElement || 'wood';
                break;
            case 'base_dmg':
                break;
            case 'base_magic_dmg':
                tower.baseMagicDmgBonus = (tower.baseMagicDmgBonus || 0) + 20;
                break;
            case 'crit_chance': tower.stats.crit = (tower.stats.crit || 0) + 0.1; break;
            case 'crit_dmg': tower.stats.critDmg = (tower.stats.critDmg || 2.0) + 0.2; break;
            case 'speed': tower.stats.speed *= 1.1; break;
            case 'range': tower.stats.range += 1; break;
            case 'proj_chain_up': tower.bonusChain = (tower.bonusChain || 0) + 1; break;
            case 'proj_count_up': tower.bonusTargets = (tower.bonusTargets || 0) + 1; break;
            case 'melee_bleed':
                tower.bleedLevel = (tower.bleedLevel || 0) + 1;
                break;
            case 'poison_dmg':
                tower.poisonDamageLevel = (tower.poisonDamageLevel || 0) + 1;
                break;
            case 'poison_duration':
                tower.poisonDurationLevel = (tower.poisonDurationLevel || 0) + 1;
                break;
            case 'poison_frequency':
                tower.poisonFrequencyLevel = (tower.poisonFrequencyLevel || 0) + 1;
                break;
            case 'addition_attack':
                tower.additionalAttackCount = (tower.additionalAttackCount || 0) + 1;
                break;
            case 'melee_boss_dmg':
                break;
            case 'slow_power_up':
                tower.slowPowerLevel = (tower.slowPowerLevel || 0) + 1;
                break;
            case 'knockback_up':
                tower.knockbackBonus = (tower.knockbackBonus || 0) + 0.25;
                break;
            case 'knockback_stun':
                tower.knockbackStun = (tower.knockbackStun || 0) + 0.2;
                break;
            case 'knockback_radius':
                tower.knockbackRadiusBonus = (tower.knockbackRadiusBonus || 0) + 1;
                break;
            case 'speed_magic':
                tower.stats.speed *= 1.25;
                tower.speedMagicApplied = true;
                tower.speedMagicLevel = (tower.speedMagicLevel || 0) + 1;
                break;
            case 'support_attack_aura_up':
                if (tower.type !== 'support' || tower.supportAuraType !== 'attack') return false;
                tower.supportAttackAuraLevel = (tower.supportAttackAuraLevel || 0) + 1;
                break;
            case 'support_speed_aura_up':
                if (tower.type !== 'support' || tower.supportAuraType !== 'speed') return false;
                tower.supportSpeedAuraLevel = (tower.supportSpeedAuraLevel || 0) + 1;
                break;
            case 'support_slow_aura_up':
                if (tower.type !== 'support' || tower.supportAuraType !== 'slow') return false;
                tower.supportSlowAuraLevel = (tower.supportSlowAuraLevel || 0) + 1;
                break;
            case 'support_crit_aura_up':
                if (tower.type !== 'support' || tower.supportAuraType !== 'crit') return false;
                tower.supportCritAuraLevel = (tower.supportCritAuraLevel || 0) + 1;
                break;
            case 'support_spell_aura_up':
                if (tower.type !== 'support' || tower.supportAuraType !== 'spell') return false;
                if ((tower.supportSpellAuraLevel || 0) >= 5) return false;
                tower.supportSpellAuraLevel = (tower.supportSpellAuraLevel || 0) + 1;
                break;
            case 'support_convert_speed_aura':
                if (tower.type !== 'support' || tower.supportAuraType !== 'attack') return false;
                tower.supportAuraType = 'speed';
                break;
            case 'support_convert_slow_aura':
                if (tower.type !== 'support' || tower.supportAuraType !== 'attack') return false;
                tower.supportAuraType = 'slow';
                break;
            case 'support_convert_crit_aura':
                if (tower.type !== 'support' || tower.supportAuraType !== 'attack') return false;
                tower.supportAuraType = 'crit';
                break;
            case 'support_convert_spell_aura':
                if (tower.type !== 'support' || tower.supportAuraType !== 'attack') return false;
                tower.supportAuraType = 'spell';
                break;
            case 'support_aura_range_up':
                if (tower.type !== 'support') return false;
                tower.supportAuraRangeBonus = (tower.supportAuraRangeBonus || 0) + 1;
                break;
            case 'support_gain_level_book':
                if (tower.type !== 'support') return false;
                this.events?.onItemDrop?.('level_book', 1, 'support');
                break;
            case 'support_gain_speed_book':
                if (tower.type !== 'support') return false;
                this.events?.onItemDrop?.('speed_book', 1, 'support');
                break;
            case 'support_gain_power_book':
                if (tower.type !== 'support') return false;
                this.events?.onItemDrop?.('power_book', 1, 'support');
                break;
            case 'support_gain_crit_book':
                if (tower.type !== 'support') return false;
                this.events?.onItemDrop?.('crit_book', 1, 'support');
                break;
            case 'support_gain_gold_1000':
                if (tower.type !== 'support') return false;
                this.gold += 1000;
                break;
            case 'trigger_magic':
                if (this.getTowerMagicElements(tower).length <= 0) return false;
                tower.triggerMagicLevel = (tower.triggerMagicLevel || 0) + 1;
                break;
            case 'elemental_fire_magic':
            case 'elemental_water_magic':
            case 'elemental_wood_magic': {
                const nextElement = upgradeType.includes('fire') ? 'fire' : upgradeType.includes('water') ? 'water' : 'wood';
                tower.magicElements = tower.magicElements || {};
                tower.magicElements[nextElement] = (tower.magicElements[nextElement] || 0) + 1;
                if (!tower.magicElement) tower.magicElement = nextElement;
                tower.magicElementLevel = (tower.magicElementLevel || 0) + 1;
                break;
            }
            case 'magic_wood_poison_talent':
                if ((tower.magicElements?.wood || 0) <= 0) return false;
                tower.magicWoodPoisonTalent = (tower.magicWoodPoisonTalent || 0) + 1;
                break;
            case 'magic_water_frostbite_talent':
                if ((tower.magicElements?.water || 0) <= 0) return false;
                tower.magicWaterFrostbiteTalent = (tower.magicWaterFrostbiteTalent || 0) + 1;
                break;
            case 'magic_fire_scorch_talent':
                if ((tower.magicElements?.fire || 0) <= 0) return false;
                tower.magicFireScorchTalent = (tower.magicFireScorchTalent || 0) + 1;
                break;
            default:
                return false;
        }

        tower.upgradeStats = tower.upgradeStats || {};
        tower.upgradeStats[upgradeType] = (tower.upgradeStats[upgradeType] || 0) + 1;

        tower.pendingUpgrades = Math.max(0, (tower.pendingUpgrades || 0) - 1);
        this.recalculateTowerDamage(tower);
        return true;
    }

    createSpecializationSnapshot(tower) {
        return {
            stats: { ...(tower.stats || {}) },
            speedBookStacks: Math.max(0, Math.floor(tower.speedBookStacks || 0)),
            powerBookStacks: Math.max(0, Math.floor(tower.powerBookStacks || 0)),
            chainNoLimit: !!tower.chainNoLimit,
            masterySpeedMult: tower.masterySpeedMult || 1,
            redistributeKillExp: !!tower.redistributeKillExp,
            randomCritBonus: !!tower.randomCritBonus,
            hitStun: tower.hitStun || 0,
            localFireExplosion: !!tower.localFireExplosion,
            disableAttributes: !!tower.disableAttributes,
            bleedDamageMult: tower.bleedDamageMult || 1,
            bleedDurationOverride: tower.bleedDurationOverride || 0,
            magicTriggerChanceBonus: tower.magicTriggerChanceBonus || 0,
            magicAilmentPowerMult: tower.magicAilmentPowerMult || 1,
            magicFireDamageMult: tower.magicFireDamageMult || 1,
            magicWaterDamageMult: tower.magicWaterDamageMult || 1,
            magicWoodDamageMult: tower.magicWoodDamageMult || 1,
            supportAuraDouble: !!tower.supportAuraDouble,
            supportAuraRangeBonus: tower.supportAuraRangeBonus || 0,
            supportSpellAuraLevel: tower.supportSpellAuraLevel || 0,
            supportLuckyAura: !!tower.supportLuckyAura,
            supportLuckyAuraTimer: tower.supportLuckyAuraTimer || 0,
            supportLuckyCritDmgBonus: tower.supportLuckyCritDmgBonus || 0
        };
    }

    restoreSpecializationSnapshot(tower, snapshot) {
        if (!tower || !snapshot) return;
        tower.stats = { ...(snapshot.stats || tower.stats) };
        tower.speedBookStacks = Math.max(0, Math.floor(snapshot.speedBookStacks || 0));
        tower.powerBookStacks = Math.max(0, Math.floor(snapshot.powerBookStacks || 0));
        tower.chainNoLimit = !!snapshot.chainNoLimit;
        tower.masterySpeedMult = snapshot.masterySpeedMult || 1;
        tower.redistributeKillExp = !!snapshot.redistributeKillExp;
        tower.randomCritBonus = !!snapshot.randomCritBonus;
        tower.hitStun = snapshot.hitStun || 0;
        tower.localFireExplosion = !!snapshot.localFireExplosion;
        tower.disableAttributes = !!snapshot.disableAttributes;
        tower.bleedDamageMult = snapshot.bleedDamageMult || 1;
        tower.bleedDurationOverride = snapshot.bleedDurationOverride || 0;
        tower.magicTriggerChanceBonus = snapshot.magicTriggerChanceBonus || 0;
        tower.magicAilmentPowerMult = snapshot.magicAilmentPowerMult || 1;
        tower.magicFireDamageMult = snapshot.magicFireDamageMult || 1;
        tower.magicWaterDamageMult = snapshot.magicWaterDamageMult || 1;
        tower.magicWoodDamageMult = snapshot.magicWoodDamageMult || 1;
        tower.supportAuraDouble = !!snapshot.supportAuraDouble;
        tower.supportAuraRangeBonus = snapshot.supportAuraRangeBonus || 0;
        tower.supportSpellAuraLevel = snapshot.supportSpellAuraLevel || 0;
        tower.supportLuckyAura = !!snapshot.supportLuckyAura;
        tower.supportLuckyAuraTimer = snapshot.supportLuckyAuraTimer || 0;
        tower.supportLuckyCritDmgBonus = snapshot.supportLuckyCritDmgBonus || 0;
    }

    recomputeGlobalMasteriesFromSpecializations() {
        const next = this.getDefaultGlobalMasteries();
        for (const tower of this.towers) {
            if (!tower?.specializationChosen || !tower.specializationId) continue;
            switch (tower.specializationId) {
                case 'spec_speed_aura':
                    next.speedAura = true;
                    break;
                case 'spec_fire_global':
                    next.fireMastery = true;
                    break;
                case 'spec_water_global':
                    next.waterMastery = true;
                    break;
                case 'spec_wood_global':
                    next.woodMastery = true;
                    next.woodPoisonDurationBonus = Math.max(next.woodPoisonDurationBonus, 5);
                    break;
                case 'spec_crit_global':
                    next.critAura = true;
                    break;
                case 'spec_crit_dmg_global':
                    next.critDmgAura = true;
                    break;
                case 'spec_tower_poison':
                    next.poisonMastery = true;
                    next.poisonDamageMult = Math.max(next.poisonDamageMult, 3);
                    next.poisonDurationMin = Math.max(next.poisonDurationMin, 10);
                    next.poisonSlowPct = Math.max(next.poisonSlowPct, 0.15);
                    break;
                case 'spec_tower_poison_frequency':
                    next.poisonFrequencyMastery = true;
                    next.poisonTickRateMult = Math.max(next.poisonTickRateMult, 3);
                    next.poisonSlowPct = Math.max(next.poisonSlowPct, 0.15);
                    break;
                case 'spec_global_wood_base':
                    next.woodBaseAura = true;
                    next.baseDamageAuraMult *= 1.2;
                    next.woodAttrDamageMult *= 1.25;
                    break;
                case 'spec_global_wood_crit_dmg':
                    next.woodCritDmgAura = true;
                    next.critDmgAuraBonus += 0.25;
                    next.woodAttrDamageMult *= 1.25;
                    break;
                case 'spec_global_water_base':
                    next.waterBaseAura = true;
                    next.baseDamageAuraMult *= 1.2;
                    next.waterAttrDamageMult *= 1.25;
                    break;
                case 'spec_global_water_speed':
                    next.waterSpeedAura = true;
                    next.attackSpeedAuraMult *= 1.12;
                    next.waterAttrDamageMult *= 1.25;
                    break;
                case 'spec_global_fire_speed':
                    next.fireSpeedAura = true;
                    next.attackSpeedAuraMult *= 1.12;
                    next.fireAttrDamageMult *= 1.25;
                    break;
                case 'spec_global_fire_crit':
                    next.fireCritAura = true;
                    next.critChanceAuraBonus += 0.1;
                    next.fireAttrDamageMult *= 1.25;
                    break;
                case 'spec_global_bleed_speed':
                    next.bleedSpeedAura = true;
                    next.attackSpeedAuraMult *= 1.1;
                    next.woodAttrDamageMult *= 1.25;
                    break;
                case 'spec_global_bleed_base':
                    next.bleedBaseAura = true;
                    next.baseDamageAuraMult *= 1.15;
                    next.woodAttrDamageMult *= 1.25;
                    break;
                case 'support_spec_global_item_drop':
                    next.itemDropAura = true;
                    next.itemDropRateBonus = Math.max(next.itemDropRateBonus, 0.15);
                    break;
                default:
                    break;
            }
        }
        this.globalMasteries = next;
    }

    resetTowerSpecialization(tower) {
        if (!tower || !tower.specializationChosen) return false;
        if (tower.level < 10) return false;
        if (!tower.preSpecializationSnapshot) return false;

        this.restoreSpecializationSnapshot(tower, tower.preSpecializationSnapshot);
        tower.specializationChosen = false;
        tower.specializationId = null;
        tower.pendingSpecialization = true;
        this.recomputeGlobalMasteriesFromSpecializations();
        return true;
    }

    applyTowerSpecialization(tower, specId) {
        if (!tower || !tower.pendingSpecialization || tower.specializationChosen) return false;
        if (!tower.preSpecializationSnapshot) {
            tower.preSpecializationSnapshot = this.createSpecializationSnapshot(tower);
        }

        if (tower.type === 'support') {
            switch (specId) {
                case 'support_spec_level_books_10':
                    this.events?.onItemDrop?.('level_book', 5, 'support_spec');
                    break;
                case 'support_spec_speed_books_10':
                    this.events?.onItemDrop?.('speed_book', 15, 'support_spec');
                    break;
                case 'support_spec_power_books_10':
                    this.events?.onItemDrop?.('power_book', 15, 'support_spec');
                    break;
                case 'support_spec_crit_books_10':
                    this.events?.onItemDrop?.('crit_book', 5, 'support_spec');
                    break;
                case 'support_spec_double_aura':
                    tower.supportAuraDouble = true;
                    break;
                case 'support_spec_range_5':
                    tower.supportAuraRangeBonus = (tower.supportAuraRangeBonus || 0) + 5;
                    break;
                case 'support_spec_lucky_aura':
                    tower.supportLuckyAura = true;
                    tower.supportLuckyAuraTimer = 0;
                    tower.supportLuckyCritDmgBonus = 0;
                    break;
                case 'support_spec_global_item_drop':
                    this.globalMasteries.itemDropAura = true;
                    this.globalMasteries.itemDropRateBonus = Math.max(this.globalMasteries.itemDropRateBonus || 0, 0.15);
                    break;
                default:
                    return false;
            }

            tower.pendingSpecialization = false;
            tower.specializationChosen = true;
            tower.specializationId = specId;
            this.recomputeGlobalMasteriesFromSpecializations();
            return true;
        }

        switch (specId) {
            case 'spec_speed_aura':
                this.globalMasteries.speedAura = true;
                break;
            case 'spec_fire_global':
                this.globalMasteries.fireMastery = true;
                break;
            case 'spec_water_global':
                this.globalMasteries.waterMastery = true;
                break;
            case 'spec_wood_global':
                this.globalMasteries.woodMastery = true;
                this.globalMasteries.woodPoisonDurationBonus = 5;
                break;
            case 'spec_crit_global':
                this.globalMasteries.critAura = true;
                break;
            case 'spec_crit_dmg_global':
                this.globalMasteries.critDmgAura = true;
                break;
            case 'spec_chain_no_limit':
                tower.chainNoLimit = true;
                break;
            case 'spec_tower_speed_50':
                tower.masterySpeedMult = (tower.masterySpeedMult || 1) * 1.4;
                break;
            case 'spec_tower_base_100':
                tower.stats.damage *= 2.0;
                break;
            case 'spec_tower_range_3':
                tower.stats.range += 3;
                break;
            case 'spec_tower_share_exp':
                tower.redistributeKillExp = true;
                break;
            case 'spec_tower_crit_random':
                tower.randomCritBonus = true;
                break;
            case 'spec_tower_stun_02':
                tower.hitStun = Math.max(tower.hitStun || 0, 0.2);
                break;
            case 'spec_tower_fire_explosion':
                tower.localFireExplosion = true;
                break;
            case 'spec_tower_attr_off_triple':
                tower.disableAttributes = true;
                tower.stats.damage *= 3;
                break;
            case 'spec_tower_half_dmg_double_speed':
                tower.stats.damage *= 0.5;
                tower.masterySpeedMult = (tower.masterySpeedMult || 1) * 2.0;
                break;
            case 'spec_tower_boss_killer':
                tower.specBossKiller = true;
                break;
            case 'spec_tower_bleed':
                tower.bleedDamageMult = (tower.bleedDamageMult || 1) * 3.0;
                tower.bleedDurationOverride = Math.max(tower.bleedDurationOverride || 0, 10);
                break;
            case 'spec_tower_poison':
                this.globalMasteries.poisonMastery = true;
                this.globalMasteries.poisonDamageMult = Math.max(this.globalMasteries.poisonDamageMult || 1, 3);
                this.globalMasteries.poisonDurationMin = Math.max(this.globalMasteries.poisonDurationMin || 0, 10);
                this.globalMasteries.poisonSlowPct = Math.max(this.globalMasteries.poisonSlowPct || 0, 0.15);
                break;
            case 'spec_tower_poison_frequency':
                this.globalMasteries.poisonFrequencyMastery = true;
                this.globalMasteries.poisonTickRateMult = Math.max(this.globalMasteries.poisonTickRateMult || 1, 3);
                this.globalMasteries.poisonSlowPct = Math.max(this.globalMasteries.poisonSlowPct || 0, 0.15);
                break;
            case 'spec_global_wood_base':
                this.globalMasteries.woodBaseAura = true;
                this.globalMasteries.baseDamageAuraMult = (this.globalMasteries.baseDamageAuraMult || 1) * 1.2;
                this.globalMasteries.woodAttrDamageMult = (this.globalMasteries.woodAttrDamageMult || 1) * 1.25;
                break;
            case 'spec_global_wood_crit_dmg':
                this.globalMasteries.woodCritDmgAura = true;
                this.globalMasteries.critDmgAuraBonus = (this.globalMasteries.critDmgAuraBonus || 0) + 0.25;
                this.globalMasteries.woodAttrDamageMult = (this.globalMasteries.woodAttrDamageMult || 1) * 1.25;
                break;
            case 'spec_global_water_base':
                this.globalMasteries.waterBaseAura = true;
                this.globalMasteries.baseDamageAuraMult = (this.globalMasteries.baseDamageAuraMult || 1) * 1.2;
                this.globalMasteries.waterAttrDamageMult = (this.globalMasteries.waterAttrDamageMult || 1) * 1.25;
                break;
            case 'spec_global_water_speed':
                this.globalMasteries.waterSpeedAura = true;
                this.globalMasteries.attackSpeedAuraMult = (this.globalMasteries.attackSpeedAuraMult || 1) * 1.12;
                this.globalMasteries.waterAttrDamageMult = (this.globalMasteries.waterAttrDamageMult || 1) * 1.25;
                break;
            case 'spec_global_fire_speed':
                this.globalMasteries.fireSpeedAura = true;
                this.globalMasteries.attackSpeedAuraMult = (this.globalMasteries.attackSpeedAuraMult || 1) * 1.12;
                this.globalMasteries.fireAttrDamageMult = (this.globalMasteries.fireAttrDamageMult || 1) * 1.25;
                break;
            case 'spec_global_fire_crit':
                this.globalMasteries.fireCritAura = true;
                this.globalMasteries.critChanceAuraBonus = (this.globalMasteries.critChanceAuraBonus || 0) + 0.1;
                this.globalMasteries.fireAttrDamageMult = (this.globalMasteries.fireAttrDamageMult || 1) * 1.25;
                break;
            case 'spec_global_bleed_speed':
                this.globalMasteries.bleedSpeedAura = true;
                this.globalMasteries.attackSpeedAuraMult = (this.globalMasteries.attackSpeedAuraMult || 1) * 1.1;
                this.globalMasteries.woodAttrDamageMult = (this.globalMasteries.woodAttrDamageMult || 1) * 1.25;
                break;
            case 'spec_global_bleed_base':
                this.globalMasteries.bleedBaseAura = true;
                this.globalMasteries.baseDamageAuraMult = (this.globalMasteries.baseDamageAuraMult || 1) * 1.15;
                this.globalMasteries.woodAttrDamageMult = (this.globalMasteries.woodAttrDamageMult || 1) * 1.25;
                break;
            case 'spec_magic_wood_base':
                tower.magicWoodDamageMult = (tower.magicWoodDamageMult || 1) * 2.0;
                break;
            case 'spec_magic_water_frost_trigger':
                tower.magicWaterDamageMult = (tower.magicWaterDamageMult || 1) * 2.0;
                break;
            case 'spec_magic_fire_speed':
                tower.magicFireDamageMult = (tower.magicFireDamageMult || 1) * 2.0;
                break;
            case 'spec_magic_combo_wood_fire':
            case 'spec_magic_combo_fire_water':
            case 'spec_magic_combo_water_wood':
                break;
            case 'spec_magic_dual_ailment':
                tower.magicAilmentPowerMult = (tower.magicAilmentPowerMult || 1) * 3.0;
                break;
            default:
                return false;
        }

        tower.pendingSpecialization = false;
        tower.specializationChosen = true;
        tower.specializationId = specId;
        this.recomputeGlobalMasteriesFromSpecializations();
        this.recalculateTowerDamage(tower);
        return true;
    }

    placeTower(x, y, typeId) {
        const typeDef = Object.values(TOWER_TYPES).find(t => t.id === typeId);
        const cell = this.grid[y]?.[x];
        this.lastPlaceTowerError = null;

        if (!typeDef) {
            this.lastPlaceTowerError = 'invalid_type';
            return null;
        }

        if (cell?.type !== 'build') {
            this.lastPlaceTowerError = 'invalid_cell';
            return null;
        }

        if (this.towers.length >= this.getTowerLimit()) {
            this.lastPlaceTowerError = 'tower_limit';
            return null;
        }

        if (this.gold < typeDef.cost) {
            this.lastPlaceTowerError = 'insufficient_gold';
            return null;
        }

        this.gold -= typeDef.cost;
        this.grid[y][x].type = 'tower';

        const stats = this.getTowerStats(typeId);
        const tower = {
            id: Math.random(),
            x: x + 0.5,
            y: y + 0.5,
            type: typeId,
            stats: stats,
            kills: 0,
            cooldown: 0,
            level: 1,
            pendingUpgrades: 0,
            lockedElement: null,
            terrain: cell.terrain || null,
            bonusChain: 0,
            bonusTargets: 0,
            bleedLevel: 0,
            bleedDamageMult: 1,
            bleedDurationOverride: 0,
            slowPowerLevel: 0,
            slowAreaRadiusBonus: 0,
            slowDurationBonus: 0,
            poisonDamageLevel: 0,
            poisonDurationLevel: 0,
            poisonFrequencyLevel: 0,
            upgradeStats: {},
            pendingSpecialization: false,
            specializationChosen: false,
            preSpecializationSnapshot: null,
            masterySpeedMult: 1,
            speedBookStacks: 0,
            powerBookStacks: 0,
            redistributeKillExp: false,
            randomCritBonus: false,
            hitStun: 0,
            localFireExplosion: false,
            disableAttributes: false,
            chainNoLimit: false,
            additionalAttackCount: 0,
            knockbackBonus: 0,
            knockbackStun: 0,
            knockbackRadiusBonus: 0,
            speedMagicApplied: false,
            speedMagicLevel: 0,
            triggerMagicLevel: 0,
            magicElement: null,
            magicElements: { fire: 0, water: 0, wood: 0 },
            magicElementLevel: 0,
            magicWoodPoisonTalent: 0,
            magicWaterFrostbiteTalent: 0,
            magicFireScorchTalent: 0,
            magicTriggerChanceBonus: 0,
            magicAilmentPowerMult: 1,
            magicFireDamageMult: 1,
            magicWaterDamageMult: 1,
            magicWoodDamageMult: 1,
            specializationId: null,
            totalDamageDealt: 0,
            equipmentId: null,
            equipmentName: null,
            equipmentLevel: 0,
            supportExp: 0,
            supportAuraType: typeId === 'support' ? 'attack' : null,
            supportAttackAuraLevel: 0,
            supportSpeedAuraLevel: 0,
            supportSlowAuraLevel: 0,
            supportCritAuraLevel: 0,
            supportSpellAuraLevel: 0,
            supportAuraRangeBonus: 0,
            supportAuraDouble: false,
            supportLuckyAura: false,
            supportLuckyAuraTimer: 0,
            supportLuckyCritDmgBonus: 0
        };
        this.towers.push(tower);
        return tower;
    }

    getMobHpMultiplier() {
        const level = this.talents.mob_hp_drop || 0;
        return 1 + (level * 0.3);
    }

    getMobDropMultiplier() {
        const level = this.talents.mob_hp_drop || 0;
        return 1 + (level * 0.1);
    }

    getMobDensityMultiplier() {
        return Math.min(2, 1 + Math.max(0, this.getTalentValue('mob_density')));
    }

    getGameSpeedMultiplier() {
        return this.userGameSpeed;
    }

    getTowerLimit() {
        return 5 + Math.max(0, Math.floor(this.getTalentValue('tower_limit'))) + Math.max(0, this.towerLimitBonus || 0);
    }

    getLastPlaceTowerError() {
        return this.lastPlaceTowerError;
    }

    getMaxGameSpeedMultiplier() {
        return 5;
    }

    setGameSpeedMultiplier(nextSpeed) {
        const cap = this.getMaxGameSpeedMultiplier();
        const clamped = Math.max(1, Math.min(cap, Number(nextSpeed) || 1));
        this.userGameSpeed = Math.round(clamped * 100) / 100;
        return this.userGameSpeed;
    }

    getMobTypeSelectionWeight(typeId) {
        if (typeId === 'fire') {
            return Math.max(0.05, 1 + this.getTalentValue('fire_mob_rate_up') - this.getTalentValue('fire_mob_rate_down'));
        }
        if (typeId === 'water') {
            return Math.max(0.05, 1 + this.getTalentValue('water_mob_rate_up') - this.getTalentValue('water_mob_rate_down'));
        }
        if (typeId === 'wood') {
            return Math.max(0.05, 1 + this.getTalentValue('wood_mob_rate_up') - this.getTalentValue('wood_mob_rate_down'));
        }
        return 1;
    }

    pickWeightedMobType(fallbackType = 'normal') {
        const entries = Object.values(MONSTER_TYPES).map((m) => ({
            id: m.id,
            weight: this.getMobTypeSelectionWeight(m.id)
        }));
        const totalWeight = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
        if (totalWeight <= 0) return fallbackType;

        let roll = Math.random() * totalWeight;
        for (const entry of entries) {
            roll -= Math.max(0, entry.weight);
            if (roll <= 0) return entry.id;
        }
        return fallbackType;
    }

    getWaveConfig(wave) {
        const direct = WAVE_CONFIG[wave - 1];
        if (direct) return direct;
        const fallback = WAVE_CONFIG[WAVE_CONFIG.length - 1] || { type: 'normal', count: 30 };
        if (!this.waveTypeCache[wave]) {
            this.waveTypeCache[wave] = this.pickWeightedMobType(fallback.type);
        }
        return {
            type: this.waveTypeCache[wave],
            count: fallback.count
        };
    }

    getWaveResourceDropMultiplier(wave) {
        const safeWave = Math.max(1, Math.floor(wave || 1));
        return 1 + ((safeWave - 1) * 0.1);
    }

    getWaveHpScale(wave) {
        if (wave <= 10) return 1;
        return Math.pow(1.15, wave - 10);
    }

    getWaveMobCountScale(wave) {
        const safeWave = Math.max(1, Math.floor(wave || 1));
        const config = this.getWaveConfig(safeWave);
        const baseCount = Math.max(1, config?.count || 30);
        return this.getWaveBaseMobCount(safeWave) / baseCount;
    }

    getWaveBaseMobCount(wave) {
        const safeWave = Math.max(1, Math.floor(wave || 1));
        // Target curve (no talent): W10~20, W20~35, W30~55, W40~80 then cap at 80.
        const raw = (0.025 * safeWave * safeWave) + (0.75 * safeWave) + 10;
        return Math.min(80, raw);
    }

    getWaveSpawnTarget(wave) {
        const safeWave = Math.max(1, Math.floor(wave || 1));
        const densityMultiplier = this.getMobDensityMultiplier();
        const affixMap = this.getWaveAffixMap(safeWave);
        const mobCountUp = Math.max(1, affixMap.mob_count_up || 1);
        const count = this.getWaveBaseMobCount(safeWave) * densityMultiplier * mobCountUp;
        return Math.max(1, Math.floor(count));
    }

    getWaveBossCount(wave, totalSpawnTarget = null) {
        const safeWave = Math.max(1, Math.floor(wave || 1));
        const affixMap = this.getWaveAffixMap(safeWave);
        const extraBoss = Math.max(0, Math.floor(affixMap.boss_count_up || 0));
        const total = Math.max(1, Math.floor(totalSpawnTarget || this.getWaveSpawnTarget(safeWave)));
        return Math.max(1, Math.min(total, 1 + extraBoss));
    }

    getTowerAt(gridX, gridY) {
        const x = gridX + 0.5;
        const y = gridY + 0.5;
        return this.towers.find((tower) => tower.x === x && tower.y === y) || null;
    }

    getCellAtWorld(x, y) {
        const gx = Math.floor(x);
        const gy = Math.floor(y);
        if (gy < 0 || gy >= this.grid.length) return null;
        if (gx < 0 || gx >= this.grid[gy].length) return null;
        return this.grid[gy][gx];
    }

    isMeleeTower(tower) {
        return tower.type === 'melee';
    }

    isArcherTower(tower) {
        return tower?.stats?.type === 'projectile';
    }

    isSupportTower(tower) {
        return tower?.type === 'support' || tower?.stats?.type === 'support';
    }

    getTowerMagicElements(tower) {
        if (!tower) return [];
        const map = tower.magicElements || {};
        const selected = ['fire', 'water', 'wood'].filter((key) => (map[key] || 0) > 0);
        if (selected.length > 0) return selected;
        if (tower.magicElement) return [tower.magicElement];
        return [];
    }

    getSupportAuraRange(tower) {
        const terrain = tower?.terrain || this.getCellAtWorld(tower?.x || 0, tower?.y || 0)?.terrain;
        const ruinsBonus = terrain === 'ruins' ? 1 : 0;
        return 1 + (tower?.supportAuraRangeBonus || 0) + ruinsBonus;
    }

    getSupportAuraEffectPct(tower) {
        if (!this.isSupportTower(tower)) return 0;

        const auraType = tower.supportAuraType || 'attack';
        let level = 0;
        if (auraType === 'attack') level = tower.supportAttackAuraLevel || 0;
        if (auraType === 'speed') level = tower.supportSpeedAuraLevel || 0;
        if (auraType === 'slow') level = tower.supportSlowAuraLevel || 0;
        if (auraType === 'crit') level = tower.supportCritAuraLevel || 0;
        if (auraType === 'spell') level = tower.supportSpellAuraLevel || 0;

        if (auraType === 'spell') {
            let pct = Math.min(1, Math.max(0, level * 0.2));
            if (tower.supportAuraDouble) pct *= 2;
            return pct;
        }

        let basePct = 0.15;
        let perLevelPct = 0.15;
        if (auraType === 'speed') {
            basePct = 0.05; // nerfed from 0.10
            perLevelPct = 0.08; // nerfed from 0.15
        }

        let pct = basePct + (level * perLevelPct);
        if (tower.supportAuraDouble) pct *= 2;
        return pct;
    }

    getSupportSpellDamageMultForTower(targetTower) {
        if (!targetTower || this.isSupportTower(targetTower)) return 1;
        let spellPct = 0;
        for (const sourceTower of this.towers) {
            if (!this.isSupportTower(sourceTower)) continue;
            if (sourceTower.id === targetTower.id) continue;
            if ((sourceTower.supportAuraType || 'attack') !== 'spell') continue;

            const range = this.getSupportAuraRange(sourceTower);
            const dx = sourceTower.x - targetTower.x;
            const dy = sourceTower.y - targetTower.y;
            if ((dx * dx + dy * dy) > (range * range)) continue;

            spellPct += this.getSupportAuraEffectPct(sourceTower);
        }
        return Math.max(0, 1 + spellPct);
    }

    updateSupportAuraState(dt) {
        for (const tower of this.towers) {
            if (!this.isSupportTower(tower) || !tower.supportLuckyAura) continue;
            tower.supportLuckyAuraTimer = (tower.supportLuckyAuraTimer || 0) - dt;
            if (tower.supportLuckyAuraTimer <= 0) {
                tower.supportLuckyAuraTimer = 1;
                tower.supportLuckyCritDmgBonus = Math.round((Math.random() * 2) * 100) / 100;
            }
        }
    }

    getTowerTerrainModifiers(tower) {
        const terrain = tower.terrain || this.getCellAtWorld(tower.x, tower.y)?.terrain;
        const mods = {
            damageMult: 1,
            speedMult: 1,
            slowEffectMult: 1,
            critBonus: 0,
            missChance: 0
        };

        if (terrain === 'highland' && this.isArcherTower(tower)) {
            mods.damageMult *= 1.3;
        }

        if (terrain === 'forest') {
            if (this.isArcherTower(tower)) mods.missChance = 0.3;
            if (this.isMeleeTower(tower)) mods.critBonus += 0.2;
        }

        if (terrain === 'plain' && this.isMeleeTower(tower)) {
            mods.speedMult *= 1.2;
        }

        if (terrain === 'swamp' && this.isMeleeTower(tower)) {
            mods.speedMult *= 0.8;
        }

        if (terrain === 'swamp' && tower?.type === 'projectile_slow') {
            mods.slowEffectMult *= 1.2;
        }

        if (terrain === 'desert') {
            mods.speedMult *= 0.9;
            mods.damageMult *= 1.2;
        }

        if (terrain === 'ruins' && tower?.type === 'magic') {
            mods.speedMult *= 1.2;
        }

        return mods;
    }

    getMobTerrainSpeedMultiplier(mob) {
        const terrain = this.getCellAtWorld(mob.x, mob.y)?.terrain;
        if (terrain === 'swamp') return 0.7;
        if (terrain === 'plain') return 1.1;
        return 1;
    }

    getMobAilmentTerrainModifiers(mob) {
        const terrain = this.getCellAtWorld(mob?.x || 0, mob?.y || 0)?.terrain;
        const mods = {
            frostbitePerStack: 0.05,
            scorchDamageMult: 1,
            poisonDamageMult: 1
        };

        if (terrain === 'swamp') {
            mods.frostbitePerStack *= 1.3;
            mods.scorchDamageMult *= 0.8;
        }
        if (terrain === 'desert') {
            mods.frostbitePerStack *= 0.8;
            mods.scorchDamageMult *= 1.4;
        }
        if (terrain === 'forest') {
            mods.poisonDamageMult *= 1.3;
        }

        return mods;
    }

    getMobPathDirection(mob) {
        const n1 = this.path[mob.pathIndex];
        const n2 = this.path[mob.pathIndex + 1];
        if (!n1 || !n2) return null;
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const mag = Math.sqrt(dx * dx + dy * dy) || 0;
        if (mag <= 0) return null;
        return { x: dx / mag, y: dy / mag };
    }

    getMobTornadoSpeedMultiplier(mob) {
        if (!this.areaEffects || this.areaEffects.length === 0) return 1;
        const moveDir = this.getMobPathDirection(mob);
        let mult = 1;

        for (const eff of this.areaEffects) {
            if (eff.type !== 'tornado') continue;
            const dx = eff.x - mob.x;
            const dy = eff.y - mob.y;
            const distSq = dx * dx + dy * dy;
            if (distSq > eff.pullRadius * eff.pullRadius) continue;

            // If a mob is effectively not moving (stunned or no path direction),
            // tornado pull in updateAreaEffects handles "sucked into center".
            if (mob.stunTimer > 0 || !moveDir) continue;

            const dist = Math.sqrt(distSq) || 1;
            const toCenter = { x: dx / dist, y: dy / dist };
            const dot = (moveDir.x * toCenter.x) + (moveDir.y * toCenter.y);

            if (dot > 0.1) {
                // Moving toward tornado center -> speed up significantly (sucked in)
                mult *= 2.0;
            } else if (dot < -0.1) {
                // Moving away from tornado center -> slow down massively (struggling to escape)
                mult *= 0.2;
            }
        }

        return Math.max(0.05, mult);
    }

    applyStun(mob, durationSec, effectType = 'stun') {
        if (!mob || durationSec <= 0) return;
        let duration = durationSec;

        const stunReduction = Math.max(0, mob.affixMap?.stun_duration_reduction || 0);
        duration *= Math.max(0, 1 - stunReduction);
        duration *= this.getControlResistMultiplier(mob, effectType === 'palsy' ? 'palsy' : 'stun');
        if (duration <= 0) return;

        if (effectType === 'palsy') {
            if ((mob.affixMap?.palsy_resist_cap || 0) > 0) {
                const remaining = Math.max(0, 0.1 - (mob.palsyHardnessApplied || 0));
                if (remaining <= 0) return;
                duration = Math.min(duration, remaining);
                mob.palsyHardnessApplied = (mob.palsyHardnessApplied || 0) + duration;
            }
        } else if ((mob.affixMap?.stun_hardness || 0) > 0) {
            const remaining = Math.max(0, 0.5 - (mob.stunHardnessApplied || 0));
            if (remaining <= 0) return;
            duration = Math.min(duration, remaining);
            mob.stunHardnessApplied = (mob.stunHardnessApplied || 0) + duration;
        }

        mob.stunTimer = Math.max(mob.stunTimer || 0, duration);
        this.registerControlEffect(mob, effectType === 'palsy' ? 'palsy' : 'stun');
        if (effectType === 'palsy') {
            mob.palsyVisualTimer = Math.max(mob.palsyVisualTimer || 0, duration);
            this.addEffect(mob.x + 0.5, mob.y + 0.5, 'palsy_status', { life: 0.25, maxLife: 0.25 });
        } else {
            mob.stunVisualTimer = Math.max(mob.stunVisualTimer || 0, duration);
            this.addEffect(mob.x + 0.5, mob.y + 0.5, 'stun_status', { life: 0.25, maxLife: 0.25 });
        }
    }

    getNearbySpecializationCount(sourceTower, specializationId, range = 5) {
        if (!sourceTower || !specializationId) return 0;
        const rangeSq = range * range;
        let count = 0;
        for (const tower of this.towers) {
            if (!tower?.specializationChosen || tower.specializationId !== specializationId) continue;
            const dx = tower.x - sourceTower.x;
            const dy = tower.y - sourceTower.y;
            if ((dx * dx + dy * dy) <= rangeSq) count += 1;
        }
        return count;
    }

    applyOnHitEffects(primaryTarget, sourceTower, hitDamage = 0) {
        if (!primaryTarget || !sourceTower) return;
        const sourceBase = sourceTower.stats.damage;
        const resonance = this.getTowerResonanceEffects(sourceTower);

        if (sourceTower.type === 'melee' || (sourceTower.bleedLevel || 0) > 0) {
            this.applyBleed(primaryTarget, sourceTower);
        }

        if (sourceTower.type === 'projectile_slow') {
            this.applySlowArea(primaryTarget, sourceTower);
        }

        if (sourceTower.type === 'projectile_aoe' && this.mobs.includes(primaryTarget)) {
            const aoeRadius = 1 + (sourceTower.knockbackRadiusBonus || 0) + (resonance.knockbackRadiusBonus || 0);
            const radiusSq = aoeRadius * aoeRadius;
            const knockbackDist = (0.5 + (sourceTower.knockbackBonus || 0)) * (resonance.knockbackDistanceMult || 1);
            const knockbackStun = (sourceTower.knockbackStun || 0) + (resonance.knockbackStunBonus || 0);

            for (const mob of this.mobs) {
                const dx = mob.x - primaryTarget.x;
                const dy = mob.y - primaryTarget.y;
                if (dx * dx + dy * dy > radiusSq) continue;
                this.knockbackMob(mob, knockbackDist, sourceTower);
                mob.knockbackFxTimer = Math.max(mob.knockbackFxTimer || 0, 0.25);
                this.addEffect(mob.x + 0.5, mob.y + 0.5, 'knockback_status', { life: 0.2, maxLife: 0.2 });
                if (knockbackStun > 0) {
                    this.applyStun(mob, knockbackStun);
                }
            }
        }

        if (sourceTower.hitStun) {
            this.applyStun(primaryTarget, sourceTower.hitStun);
        }

        if ((sourceTower.upgradeStats?.water_dmg || 0) > 0) {
            this.applyFrostbite(primaryTarget, 1);
        }

        if ((sourceTower.upgradeStats?.fire_dmg || 0) > 0) {
            const sampleHit = Math.max(1, hitDamage || sourceBase);
            this.applyScorch(primaryTarget, sampleHit, 1);
        }

        const nearbyWaterAuraCount = this.getNearbySpecializationCount(sourceTower, 'spec_water_global', 5);
        if (nearbyWaterAuraCount > 0) {
            this.addEffect(primaryTarget.x + 0.5, primaryTarget.y + 0.5, 'water_aura_proc', { life: 0.32, maxLife: 0.32 });
            this.applyFrostbite(primaryTarget, nearbyWaterAuraCount);
        }

        const nearbyWoodAuraCount = this.getNearbySpecializationCount(sourceTower, 'spec_wood_global', 5);
        if (nearbyWoodAuraCount > 0) {
            this.addPoisonStack(primaryTarget, sourceTower, sourceBase * 0.3 * nearbyWoodAuraCount, 5, sourceTower.poisonFrequencyLevel || 0);
        }

        const nearbyFireAuraCount = this.getNearbySpecializationCount(sourceTower, 'spec_fire_global', 5);
        if (nearbyFireAuraCount > 0) {
            this.addEffect(primaryTarget.x + 0.5, primaryTarget.y + 0.5, 'fire_aura_proc', { life: 0.3, maxLife: 0.3, radius: 2 });
            const sampleHit = Math.max(1, hitDamage || sourceBase);
            this.applyScorch(primaryTarget, sampleHit, nearbyFireAuraCount);
        }
        if (sourceTower.localFireExplosion) {
            this.applyFireExplosion(primaryTarget, sourceTower, sourceBase * 0.5, 3);
        }

        if ((sourceTower.upgradeStats?.wood_dmg || 0) > 0) {
            const poisonDmgLv = sourceTower.poisonDamageLevel || 0;
            const poisonDurationLv = sourceTower.poisonDurationLevel || 0;
            const perTick = sourceBase * 0.1 * (1 + (0.4 * poisonDmgLv));
            const duration = 4 + (2 * poisonDurationLv);
            this.addPoisonStack(primaryTarget, sourceTower, perTick, duration, sourceTower.poisonFrequencyLevel || 0);
        }

        this.applyMagicElementEffects(primaryTarget, sourceTower);
        this.applyEquipmentOnHit(primaryTarget, sourceTower);
    }

    applyEquipmentOnHit(primaryTarget, sourceTower) {
        if (!primaryTarget || !sourceTower?.equipmentId) return;
        const equipmentLevel = this.getTowerEquipmentLevel(sourceTower);

        if (sourceTower.equipmentId === 'chain_lightning') {
            const spellAuraMult = this.getSupportSpellDamageMultForTower(sourceTower);
            const damage = Math.max(1, (sourceTower.stats?.damage || 0) * spellAuraMult);
            const chainBonus = Math.max(0, this.getChainCount(sourceTower));
            const maxChains = 10 + chainBonus;
            const paralyzeChance = 0.1;
            const paralyzeSec = 1.0;
            this.triggerChainLightning(primaryTarget, sourceTower, damage, maxChains, paralyzeChance, paralyzeSec);
        }

        if (sourceTower.equipmentId === 'frost_emblem') {
            const chance = Math.min(0.95, 0.35 + (0.1 * Math.max(0, equipmentLevel - 1)));
            if (Math.random() < chance) {
                const stacks = 1 + Math.floor(Math.max(0, equipmentLevel - 1) / 2);
                this.applyFrostbite(primaryTarget, stacks);
            }
        }

        if (sourceTower.equipmentId === 'burn_emblem') {
            const damageScale = 0.2 * (1 + (0.4 * Math.max(0, equipmentLevel - 1)));
            this.addBurnStack(primaryTarget, sourceTower, sourceTower.stats.damage * damageScale, 4);
        }

        if (sourceTower.equipmentId === 'venom_core') {
            const damageScale = 0.15 * (1 + (0.35 * Math.max(0, equipmentLevel - 1)));
            this.addPoisonStack(primaryTarget, sourceTower, sourceTower.stats.damage * damageScale, 5, sourceTower.poisonFrequencyLevel || 0);
        }

        if (sourceTower.equipmentId === 'shock_core' && Math.random() < Math.min(0.8, 0.18 + (0.06 * Math.max(0, equipmentLevel - 1)))) {
            this.applyStun(primaryTarget, 0.2 + (0.05 * Math.max(0, equipmentLevel - 1)), 'stun');
        }

        if (sourceTower.equipmentId === 'echo_rune' && Math.random() < Math.min(0.8, 0.18 + (0.06 * Math.max(0, equipmentLevel - 1)))) {
            const spellAuraMult = this.getSupportSpellDamageMultForTower(sourceTower);
            const echoMult = 0.6 + (0.15 * Math.max(0, equipmentLevel - 1));
            this.damageMob(primaryTarget, {
                base: sourceTower.stats.damage * echoMult * spellAuraMult,
                fire: (sourceTower.stats.extraFire || 0) * echoMult * spellAuraMult,
                water: (sourceTower.stats.extraWater || 0) * echoMult * spellAuraMult,
                wood: (sourceTower.stats.extraWood || 0) * echoMult * spellAuraMult
            }, sourceTower, false);
        }
    }

    triggerChainLightning(originTarget, sourceTower, damage, maxChains, paralyzeChance, paralyzeSec) {
        let currentTarget = originTarget;
        const chainedIds = new Set();
        const allowRepeatChain = !!sourceTower?.chainNoLimit;
        let prevX = sourceTower.x + 0.5;
        let prevY = sourceTower.y + 0.5;

        for (let i = 0; i <= maxChains; i++) {
            if (!currentTarget) break;
            const currentId = currentTarget.id;
            if (!allowRepeatChain && currentId !== undefined) chainedIds.add(currentId);

            if (this.mobs.includes(currentTarget)) {
                this.addEffect(currentTarget.x + 0.5, currentTarget.y + 0.5, 'lightning_strike', { life: 0.16, maxLife: 0.16 });
                this.addEffect((prevX + currentTarget.x + 0.5) / 2, (prevY + currentTarget.y + 0.5) / 2, 'chain_arc', {
                    life: 0.12,
                    maxLife: 0.12,
                    fromX: prevX,
                    fromY: prevY,
                    toX: currentTarget.x + 0.5,
                    toY: currentTarget.y + 0.5
                });
                this.addEffect(currentTarget.x + 0.5, currentTarget.y + 0.5, 'hit', { life: 0.12, maxLife: 0.12 });
                this.damageMob(currentTarget, { base: damage, fire: 0, water: 0, wood: 0 }, sourceTower, false);
                // 每段連鎖命中都獨立計算一次麻痺機率
                const shouldParalyze = Math.random() < paralyzeChance;
                if (this.mobs.includes(currentTarget) && shouldParalyze) {
                    this.applyStun(currentTarget, paralyzeSec, 'palsy');
                }
            }

            const nextExcluded = allowRepeatChain
                ? new Set(currentId !== undefined ? [currentId] : [])
                : chainedIds;
            const nextTarget = this.findChainTarget(currentTarget, nextExcluded);
            if (!nextTarget) break;
            prevX = currentTarget.x + 0.5;
            prevY = currentTarget.y + 0.5;
            currentTarget = nextTarget;
        }
    }

    grantTowerKill(tower) {
        this.grantTowerExp(tower, 1);
    }

    grantTowerExp(tower, amount = 1) {
        if (!tower || amount <= 0) return;

        if (this.isSupportTower(tower)) {
            tower.supportExp = (tower.supportExp || 0) + amount;
            while ((tower.supportExp || 0) >= 15 && tower.level < 10) {
                tower.supportExp -= 15;
                this.levelUpTower(tower, 1);
            }
            return;
        }

        tower.kills = (tower.kills || 0) + amount;
        while (tower.kills >= 10 && tower.level < 10) {
            tower.kills -= 10;
            this.levelUpTower(tower, 1);
        }
    }

    levelUpTower(tower, levels = 1) {
        if (!tower || levels <= 0) return false;
        let leveled = false;

        for (let i = 0; i < levels; i++) {
            if (tower.level >= 10) break;
            tower.level += 1;
            tower.pendingUpgrades = (tower.pendingUpgrades || 0) + 1;
            leveled = true;

            if (this.events.onTowerUpgradeAvailable) {
                this.events.onTowerUpgradeAvailable(tower);
            }

            if (tower.level >= 10 && !tower.specializationChosen) {
                tower.pendingSpecialization = true;
                if (this.events.onTowerSpecializationAvailable) {
                    this.events.onTowerSpecializationAvailable(tower);
                }
                break;
            }
        }

        return leveled;
    }

    applyGlobalItem(itemId) {
        if (!itemId) return { ok: false, message: '未指定道具。' };
        if (itemId === 'build_book') {
            this.towerLimitBonus = (this.towerLimitBonus || 0) + 1;
            return { ok: true, message: '建設之書使用成功，本局建塔上限 +1' };
        }
        if (itemId === 'repair_kit') {
            if (this.hp >= this.maxHp) {
                this.maxHp += 1;
                this.hp = Math.min(this.maxHp, this.hp + 1);
                return { ok: true, message: '急救套件使用成功：生命已滿，先擴充最大生命 +1，再恢復 1 點生命' };
            }
            this.hp = Math.min(this.maxHp, this.hp + 1);
            return { ok: true, message: '急救套件使用成功，生命恢復 1' };
        }
        return { ok: false, message: '此道具不是全域立即使用道具。' };
    }

    isBannerEquipment(itemId) {
        return itemId === 'courage_banner'
            || itemId === 'slaughter_banner'
            || itemId === 'agility_banner';
    }

    getTowerEquipmentLevel(tower) {
        if (!tower?.equipmentId) return 0;
        return Math.max(1, Math.floor(tower.equipmentLevel || 1));
    }

    applyEquipmentImmediateBonuses(tower, itemId, previousLevel = 0) {
        const currentLevel = this.getTowerEquipmentLevel(tower);
        const levelDelta = Math.max(0, currentLevel - Math.max(0, previousLevel));

        if (itemId === 'lubricant') {
            const towerDef = Object.values(TOWER_TYPES).find((t) => t.id === tower.type) || TOWER_TYPES.MELEE;
            const typeBaseSpeed = towerDef?.stats?.speed || 1;
            const talentSpeedMult = this.getTowerTalentModifiersForType(tower.type).speedMult;
            const previousCoreBase = previousLevel <= 0
                ? typeBaseSpeed
                : (1 * (1 + (0.08 * (previousLevel - 1))));
            const currentCoreBase = 1 * (1 + (0.08 * (currentLevel - 1)));
            const previousBaseWithTalent = Math.max(0.0001, previousCoreBase * talentSpeedMult);
            const existingBonusMult = Math.max(0, (tower.stats.speed || 0) / previousBaseWithTalent);
            tower.stats.speed = Math.max(0.0001, currentCoreBase * talentSpeedMult * existingBonusMult);
            return { ok: true };
        }

        if (itemId === 'full_firepower') {
            const towerDef = Object.values(TOWER_TYPES).find((t) => t.id === tower.type) || TOWER_TYPES.MELEE;
            const typeBaseDamage = towerDef?.stats?.damage || 1;
            const towerMods = this.getTowerTalentModifiersForType(tower.type);
            const talentBaseBonus = towerMods.baseDamageBonus;
            const talentAttrMult = towerMods.attrDamageMult;
            const previousCoreBase = previousLevel <= 0
                ? typeBaseDamage
                : (40 + (12 * (previousLevel - 1)));
            const currentCoreBase = 40 + (12 * (currentLevel - 1));
            const previousBaseWithTalent = Math.max(0.0001, (previousCoreBase + talentBaseBonus) * talentAttrMult);
            const existingBonusMult = Math.max(0, (tower.stats.damage || 0) / previousBaseWithTalent);
            tower.stats.damage = Math.max(0, (currentCoreBase + talentBaseBonus) * talentAttrMult * existingBonusMult);
            return { ok: true };
        }

        if (itemId === 'absorption_force') {
            tower.absorptionKillCount = tower.absorptionKillCount || 0;
            return { ok: true };
        }
        if (itemId === 'sniper_scope') {
            tower.stats.range += (2 * levelDelta);
            return { ok: true };
        }
        if (itemId === 'war_drum') {
            tower.stats.speed *= Math.pow(1.2, levelDelta);
            return { ok: true };
        }
        if (itemId === 'ricochet_module') {
            if (tower.stats.type !== 'projectile') return { ok: false, message: '僅投射塔可裝備。' };
            tower.bonusChain = (tower.bonusChain || 0) + (2 * levelDelta);
            return { ok: true };
        }
        if (itemId === 'multishot_module') {
            if (tower.stats.type !== 'projectile') return { ok: false, message: '僅投射塔可裝備。' };
            tower.bonusTargets = (tower.bonusTargets || 0) + levelDelta;
            return { ok: true };
        }
        if (itemId === 'rupture_blade') {
            tower.bleedLevel = (tower.bleedLevel || 0) + levelDelta;
            return { ok: true };
        }
        if (itemId === 'siege_shell') {
            if (tower.type !== 'projectile_aoe') return { ok: false, message: '僅砲擊塔可裝備。' };
            tower.knockbackRadiusBonus = (tower.knockbackRadiusBonus || 0) + levelDelta;
            tower.knockbackBonus = (tower.knockbackBonus || 0) + (0.5 * levelDelta);
            return { ok: true };
        }
        if (itemId === 'gravity_well') {
            if (tower.type !== 'projectile_slow') return { ok: false, message: '僅緩速塔可裝備。' };
            tower.slowAreaRadiusBonus = (tower.slowAreaRadiusBonus || 0) + levelDelta;
            tower.slowDurationBonus = (tower.slowDurationBonus || 0) + levelDelta;
            return { ok: true };
        }
        if (itemId === 'mana_reactor') {
            if (tower.type !== 'magic') return { ok: false, message: '僅法術塔可裝備。' };
            tower.triggerMagicLevel = (tower.triggerMagicLevel || 0) + levelDelta;
            return { ok: true };
        }
        if (itemId === 'crystal_lens') {
            tower.stats.critDmg = (tower.stats.critDmg || 2.0) + (0.5 * levelDelta);
            return { ok: true };
        }
        if (itemId === 'time_weaver') {
            tower.stats.speed *= Math.pow(1.15, levelDelta);
            return { ok: true };
        }

        if (
            itemId === 'chain_lightning'
            || itemId === 'courage_banner'
            || itemId === 'slaughter_banner'
            || itemId === 'agility_banner'
            || itemId === 'giant_slayer'
            || itemId === 'executioner_axe'
            || itemId === 'frost_emblem'
            || itemId === 'burn_emblem'
            || itemId === 'venom_core'
            || itemId === 'shock_core'
            || itemId === 'lucky_coin'
            || itemId === 'vampire_fang'
            || itemId === 'last_stand_emblem'
            || itemId === 'echo_rune'
            || itemId === 'hard_gloves'
            || itemId === 'toxic_gloves'
        ) {
            return { ok: true };
        }

        return { ok: false, message: '此裝備尚未實作效果。' };
    }

    recalculateTowerDamage(tower) {
        if (!tower || !tower.stats) return;
        const typeDef = Object.values(TOWER_TYPES).find(t => t.id === tower.type) || TOWER_TYPES.MELEE;
        const baseDmg = typeDef.stats?.damage || 1;
        const mods = this.getTowerTalentModifiersForType(tower.type);

        let powerBookBase = (tower.powerBookStacks || 0) * 5;
        let absorptionBase = tower.absorptionKillCount || 0;
        let magicBase = tower.baseMagicDmgBonus || 0;

        let overrideBase = null;
        const eqLv = this.getTowerEquipmentLevel(tower);
        if (tower.equipmentId === 'full_firepower') {
            overrideBase = 40 + 12 * (eqLv - 1);
        }

        let flatBase = (overrideBase ?? baseDmg) + (mods.baseDamageBonus || 0) + powerBookBase + absorptionBase + magicBase;

        let pctMult = mods.attrDamageMult || 1;
        pctMult += (tower.upgradeStats?.base_dmg || 0) * 0.25;
        if (tower.specBase100) pctMult += 1.0;
        if (tower.specAttrOffTriple) pctMult += 2.0;

        let finalDamage = flatBase * Math.max(0.1, pctMult);
        if (tower.specHalfDamage) finalDamage *= 0.5;

        // Fortify book modifier (it was *1.2 per stack before)
        if (tower.fortifyBookStacks) {
            finalDamage *= Math.pow(1.2, tower.fortifyBookStacks);
        }

        tower.stats.damage = finalDamage;
        tower.stats.extraFire = finalDamage * 0.25 * (tower.upgradeStats?.fire_dmg || 0);
        tower.stats.extraWater = finalDamage * 0.25 * (tower.upgradeStats?.water_dmg || 0);
        tower.stats.extraWood = finalDamage * 0.25 * (tower.upgradeStats?.wood_dmg || 0);
    }

    applyInventoryItem(tower, itemId) {
        if (!tower || !itemId) {
            return { ok: false, message: '請先選擇塔與道具。' };
        }

        const item = ITEM_DEFS[itemId];
        if (!item) {
            return { ok: false, message: '找不到該道具。' };
        }

        if (item.type === ITEM_TYPES.CONSUMABLE) {
            if (itemId === 'level_book') {
                if (tower.level >= 10) {
                    return { ok: false, message: '該塔已滿級，無法再升級。' };
                }
                this.levelUpTower(tower, 1);
                return { ok: true, message: `${item.name} 使用成功` };
            }
            if (itemId === 'speed_book') {
                const currentStacks = Math.max(0, Math.floor(tower.speedBookStacks || 0));
                const nextStacks = currentStacks + 1;
                const prevMult = 1 + (0.1 * currentStacks);
                const nextMult = 1 + (0.1 * nextStacks);
                tower.stats.speed = Math.max(0.0001, (tower.stats.speed || 0) / prevMult * nextMult);
                tower.speedBookStacks = nextStacks;
                return { ok: true, message: `${item.name} 使用成功` };
            }
            if (itemId === 'crit_dmg_book') {
                tower.stats.critDmgBookBonus = (tower.stats.critDmgBookBonus || 0) + 0.2;
                tower.stats.critDmg = (tower.stats.critDmg || 2.0) + 0.2;
                return { ok: true, message: `${item.name} 使用成功` };
            }
            if (itemId === 'power_book') {
                tower.powerBookStacks = (tower.powerBookStacks || 0) + 1;
                this.recalculateTowerDamage(tower);
                return { ok: true, message: `${item.name} 使用成功` };
            }
            if (itemId === 'crit_book') {
                tower.stats.crit = (tower.stats.crit || 0) + 0.1;
                return { ok: true, message: `${item.name} 使用成功` };
            }
            if (itemId === 'build_book') {
                this.towerLimitBonus = (this.towerLimitBonus || 0) + 1;
                return { ok: true, message: `${item.name} 使用成功，本局建塔上限 +1` };
            }
            if (itemId === 'range_book') {
                tower.stats.range += 1;
                return { ok: true, message: `${item.name} 使用成功` };
            }
            if (itemId === 'fury_book') {
                tower.stats.speed *= 1.2;
                return { ok: true, message: `${item.name} 使用成功` };
            }
            if (itemId === 'precision_book') {
                tower.stats.crit = (tower.stats.crit || 0) + 0.15;
                return { ok: true, message: `${item.name} 使用成功` };
            }
            if (itemId === 'fire_oil') {
                tower.stats.extraFire = (tower.stats.extraFire || 0) + (tower.stats.damage * 0.25);
                return { ok: true, message: `${item.name} 使用成功` };
            }
            if (itemId === 'water_oil') {
                tower.stats.extraWater = (tower.stats.extraWater || 0) + (tower.stats.damage * 0.25);
                return { ok: true, message: `${item.name} 使用成功` };
            }
            if (itemId === 'wood_oil') {
                tower.stats.extraWood = (tower.stats.extraWood || 0) + (tower.stats.damage * 0.25);
                return { ok: true, message: `${item.name} 使用成功` };
            }
            if (itemId === 'fortify_book') {
                tower.stats.damage *= 1.2;
                return { ok: true, message: `${item.name} 使用成功` };
            }
            if (itemId === 'split_manual') {
                if (tower.stats.type !== 'projectile') return { ok: false, message: '僅投射塔可使用。' };
                tower.bonusTargets = (tower.bonusTargets || 0) + 1;
                return { ok: true, message: `${item.name} 使用成功` };
            }
            if (itemId === 'chain_manual') {
                if (tower.stats.type !== 'projectile') return { ok: false, message: '僅投射塔可使用。' };
                tower.bonusChain = (tower.bonusChain || 0) + 1;
                return { ok: true, message: `${item.name} 使用成功` };
            }
            if (itemId === 'repair_kit') {
                this.hp = Math.min(this.maxHp, this.hp + 1);
                return { ok: true, message: `${item.name} 使用成功，生命恢復 1` };
            }
            if (itemId === 'specialization_reset_scroll') {
                if (tower.level < 10 || !tower.specializationChosen) {
                    return { ok: false, message: '僅可對已選過專精的滿等塔使用。' };
                }
                const ok = this.resetTowerSpecialization(tower);
                if (!ok) return { ok: false, message: '該塔目前無法重置專精。' };
                return { ok: true, message: `${item.name} 使用成功，請重新選擇專精。` };
            }
            return { ok: false, message: '此消耗道具尚未實作效果。' };
        }

        if (item.type === ITEM_TYPES.EQUIPMENT) {
            if (tower.equipmentId) {
                if (tower.equipmentId !== itemId) {
                    return { ok: false, message: '此塔已裝備其他道具，請先移除現有裝備。' };
                }
                const currentLevel = this.getTowerEquipmentLevel(tower);
                if (!this.isBannerEquipment(itemId) && currentLevel >= 5) {
                    return { ok: false, message: `${item.name} 已達最高等級（5）。` };
                }
                const previousLevel = currentLevel;
                tower.equipmentLevel = currentLevel + 1;
                const applyResult = this.applyEquipmentImmediateBonuses(tower, itemId, previousLevel);
                if (!applyResult.ok) {
                    tower.equipmentLevel = previousLevel;
                    return applyResult;
                }
                return { ok: true, message: `${item.name} 升級成功（Lv.${tower.equipmentLevel}）` };
            }

            tower.equipmentId = itemId;
            tower.equipmentName = item.name;
            tower.equipmentLevel = 1;
            const applyResult = this.applyEquipmentImmediateBonuses(tower, itemId, 0);
            if (!applyResult.ok) {
                tower.equipmentId = null;
                tower.equipmentName = null;
                tower.equipmentLevel = 0;
                return applyResult;
            }
            return { ok: true, message: `${item.name} 裝備成功` };
        }

        return { ok: false, message: '未知的道具類型。' };
    }

    getBannerAuraBonuses(targetTower) {
        const result = {
            critChance: 0,
            critDmgBonus: 0,
            speedPct: 0,
            damageMult: 1,
            luckCritDmgBonus: 0
        };

        if (!targetTower || this.isSupportTower(targetTower)) return result;
        const bannerRadiusSq = 3 * 3;
        let supportDamagePct = 0;
        let supportSpeedPct = 0;
        let supportCritPct = 0;

        for (const sourceTower of this.towers) {
            if (!sourceTower?.equipmentId) continue;
            if (
                sourceTower.equipmentId !== 'courage_banner'
                && sourceTower.equipmentId !== 'slaughter_banner'
                && sourceTower.equipmentId !== 'agility_banner'
            ) continue;

            const dx = sourceTower.x - targetTower.x;
            const dy = sourceTower.y - targetTower.y;
            if ((dx * dx + dy * dy) > bannerRadiusSq) continue;

            const bannerLevel = this.getTowerEquipmentLevel(sourceTower);
            const levelMult = Math.max(1, bannerLevel);
            if (sourceTower.equipmentId === 'courage_banner') {
                result.critChance += (0.1 * levelMult);
            } else if (sourceTower.equipmentId === 'slaughter_banner') {
                result.critDmgBonus += (0.1 * levelMult);
            } else if (sourceTower.equipmentId === 'agility_banner') {
                result.speedPct += (0.1 * levelMult);
            }
        }

        for (const sourceTower of this.towers) {
            if (!this.isSupportTower(sourceTower)) continue;
            if (sourceTower.id === targetTower.id) continue;

            const range = this.getSupportAuraRange(sourceTower);
            const dx = sourceTower.x - targetTower.x;
            const dy = sourceTower.y - targetTower.y;
            if ((dx * dx + dy * dy) > (range * range)) continue;

            const pct = this.getSupportAuraEffectPct(sourceTower);
            if ((sourceTower.supportAuraType || 'attack') === 'attack') {
                supportDamagePct += pct;
            } else if (sourceTower.supportAuraType === 'speed') {
                supportSpeedPct += pct;
            } else if (sourceTower.supportAuraType === 'crit') {
                supportCritPct += pct;
            }

            if (sourceTower.supportLuckyAura) {
                result.luckCritDmgBonus += sourceTower.supportLuckyCritDmgBonus || 0;
            }
        }

        result.damageMult = Math.max(0, 1 + supportDamagePct);
        result.speedPct += supportSpeedPct;
        result.critChance += supportCritPct;

        return result;
    }

    getSupportSlowPctForMob(mob) {
        if (!mob) return 0;
        let totalSlowPct = 0;

        for (const tower of this.towers) {
            if (!this.isSupportTower(tower)) continue;
            if (tower.supportAuraType !== 'slow') continue;

            const range = this.getSupportAuraRange(tower);
            const dx = tower.x - mob.x;
            const dy = tower.y - mob.y;
            if ((dx * dx + dy * dy) > (range * range)) continue;

            totalSlowPct += this.getSupportAuraEffectPct(tower);
        }

        return Math.min(0.95, Math.max(0, totalSlowPct));
    }

    getTowerAuraSnapshot(targetTower) {
        if (!targetTower) {
            return {
                damagePct: 0,
                speedPct: 0,
                critChancePct: 0,
                critDmgBonus: 0,
                bannerCritDmgBonus: 0,
                luckCritDmgBonus: 0
            };
        }

        const bonus = this.getBannerAuraBonuses(targetTower);
        return {
            damagePct: Math.max(0, (bonus.damageMult - 1) * 100),
            speedPct: (bonus.speedPct || 0) * 100,
            critChancePct: (bonus.critChance || 0) * 100,
            critDmgBonus: (bonus.critDmgBonus || 0) + (bonus.luckCritDmgBonus || 0),
            bannerCritDmgBonus: bonus.critDmgBonus || 0,
            luckCritDmgBonus: bonus.luckCritDmgBonus || 0
        };
    }

    getSupportAuraStatus(sourceTower) {
        if (!this.isSupportTower(sourceTower)) {
            return {
                auraType: null,
                effectPct: 0,
                range: 0,
                affectedTowerCount: 0,
                affectedMobCount: 0,
                luckyCritDmgBonus: 0
            };
        }

        const auraType = sourceTower.supportAuraType || 'attack';
        const range = this.getSupportAuraRange(sourceTower);
        const rangeSq = range * range;
        let affectedTowerCount = 0;
        let affectedMobCount = 0;

        for (const tower of this.towers) {
            if (!tower || tower.id === sourceTower.id || this.isSupportTower(tower)) continue;
            const dx = sourceTower.x - tower.x;
            const dy = sourceTower.y - tower.y;
            if ((dx * dx + dy * dy) <= rangeSq) {
                affectedTowerCount += 1;
            }
        }

        if (auraType === 'slow') {
            for (const mob of this.mobs) {
                const dx = sourceTower.x - mob.x;
                const dy = sourceTower.y - mob.y;
                if ((dx * dx + dy * dy) <= rangeSq) {
                    affectedMobCount += 1;
                }
            }
        }

        return {
            auraType,
            effectPct: this.getSupportAuraEffectPct(sourceTower) * 100,
            range,
            affectedTowerCount,
            affectedMobCount,
            luckyCritDmgBonus: sourceTower.supportLuckyAura ? (sourceTower.supportLuckyCritDmgBonus || 0) : 0
        };
    }

    grantSupportExpFromNearbyKill(killerTower) {
        if (!killerTower || this.isSupportTower(killerTower)) return;

        for (const tower of this.towers) {
            if (!this.isSupportTower(tower)) continue;

            const range = this.getSupportAuraRange(tower);
            const dx = tower.x - killerTower.x;
            const dy = tower.y - killerTower.y;
            if ((dx * dx + dy * dy) > (range * range)) continue;

            tower.supportExp = (tower.supportExp || 0) + 1;
            while ((tower.supportExp || 0) >= 15 && tower.level < 10) {
                tower.supportExp -= 15;
                this.levelUpTower(tower, 1);
            }
        }
    }

    applySlowArea(primaryTarget, sourceTower) {
        const radius = 2 + (sourceTower.slowAreaRadiusBonus || 0);
        const radiusSq = radius * radius;
        const terrainMods = this.getTowerTerrainModifiers(sourceTower);
        const resonance = this.getTowerResonanceEffects(sourceTower);
        const baseSlowPct = 0.3 + ((sourceTower.slowPowerLevel || 0) * 0.1);
        const slowPct = Math.min(0.95, baseSlowPct * (terrainMods.slowEffectMult || 1) * (resonance.slowEffectMult || 1));
        const duration = 3 + (sourceTower.slowDurationBonus || 0);

        for (const mob of this.mobs) {
            const dx = mob.x - primaryTarget.x;
            const dy = mob.y - primaryTarget.y;
            if (dx * dx + dy * dy <= radiusSq) {
                const controlMult = this.getControlResistMultiplier(mob, 'slow');
                const effectiveSlowPct = Math.min(0.95, slowPct * controlMult);
                if (effectiveSlowPct <= 0.01) continue;
                this.addSlowStack(mob, 1 - effectiveSlowPct, duration);
                mob.slowEffectTimer = Math.max(mob.slowEffectTimer || 0, 0.4);
                this.addEffect(mob.x + 0.5, mob.y + 0.5, 'slow_status', { life: 0.2, maxLife: 0.2 });
                this.registerControlEffect(mob, 'slow');
            }
        }
    }

    addSlowStack(mob, mult, duration) {
        if (!mob || duration <= 0) return;
        const nextMult = Math.max(0.05, Math.min(1, mult || 1));
        mob.slowStacks = mob.slowStacks || [];

        const similar = mob.slowStacks.find((stack) => Math.abs((stack.mult || 1) - nextMult) <= 0.001);
        if (similar) {
            similar.duration = Math.max(similar.duration || 0, duration);
            return;
        }

        const maxSlowStacks = 8;
        if (mob.slowStacks.length >= maxSlowStacks) {
            let weakestIndex = 0;
            let weakestSlowPct = Math.max(0, Math.min(0.95, 1 - (mob.slowStacks[0].mult || 1)));
            for (let i = 1; i < mob.slowStacks.length; i++) {
                const slowPct = Math.max(0, Math.min(0.95, 1 - (mob.slowStacks[i].mult || 1)));
                if (slowPct < weakestSlowPct) {
                    weakestSlowPct = slowPct;
                    weakestIndex = i;
                }
            }
            const incomingSlowPct = Math.max(0, Math.min(0.95, 1 - nextMult));
            if (incomingSlowPct <= weakestSlowPct) {
                mob.slowStacks[weakestIndex].duration = Math.max(mob.slowStacks[weakestIndex].duration || 0, duration);
                return;
            }
            mob.slowStacks[weakestIndex] = { mult: nextMult, duration };
            return;
        }

        mob.slowStacks.push({ mult: nextMult, duration });
    }

    addBurnStack(target, sourceTower, perTickDamage, durationSec) {
        if (!target || !sourceTower || perTickDamage <= 0 || durationSec <= 0) return;
        target.burnStacks = target.burnStacks || [];
        target.burnStacks.push({
            sourceTowerId: sourceTower.id,
            damagePerTick: perTickDamage,
            duration: durationSec,
            tickTimer: 1,
            tickInterval: 1
        });
    }

    applyFrostbite(target, addStacks = 1) {
        if (!target || addStacks <= 0) return;
        target.frostbiteStacks = Math.min(100, Math.max(0, (target.frostbiteStacks || 0) + addStacks));
        target.frostbiteTimer = 3;
    }

    applyScorch(target, hitDamage, addStacks = 1) {
        if (!target || addStacks <= 0) return;
        const sample = Math.max(1, hitDamage || 1);
        const prevStacks = Math.max(0, target.scorchStacks || 0);
        const prevSamples = Math.max(0, target.scorchSamples || 0);
        const nextStacks = Math.min(100, prevStacks + addStacks);
        target.scorchStacks = nextStacks;
        target.scorchSamples = prevSamples + 1;
        target.scorchAvgHit = ((target.scorchAvgHit || 0) * prevSamples + sample) / Math.max(1, target.scorchSamples);
        target.scorchTimer = 3;
        target.scorchTickTimer = Math.min(1, target.scorchTickTimer || 1);
    }

    applyBleed(target, sourceTower) {
        const level = sourceTower.bleedLevel || 0;
        if (level <= 0) return;

        const resonance = this.getTowerResonanceEffects(sourceTower);
        const bleedMult = sourceTower.bleedDamageMult || 1;
        const duration = (sourceTower.bleedDurationOverride || 4) + (resonance.bleedDurationBonus || 0);
        const bleedReduction = Math.max(0, target.affixMap?.bleed_dmg_reduction || 0);
        const perTick = sourceTower.stats.damage * (0.3 * level) * bleedMult * (resonance.bleedDamageMult || 1) * (1 - bleedReduction);
        target.bleedStacks = target.bleedStacks || [];
        target.bleedStacks.push({
            damagePerTick: perTick,
            duration,
            tickTimer: 1,
            sourceTowerId: sourceTower.id
        });

        // Immediate burst on apply/refresh.
        this.damageMob(target, { base: perTick, fire: 0, water: 0, wood: 0 }, sourceTower, false);
    }

    addPoisonStack(target, sourceTower, perTickDamage, durationSec, sourcePoisonFreqLevel = 0) {
        const globalDamageMult = this.globalMasteries.poisonDamageMult || 1;
        const globalDurationMin = this.globalMasteries.poisonDurationMin || 0;
        const globalTickRateMult = this.globalMasteries.poisonTickRateMult || 1;
        const sourceTickRateMult = 1 + (0.25 * Math.max(0, sourcePoisonFreqLevel));
        const tickInterval = 1 / Math.max(0.1, sourceTickRateMult * globalTickRateMult);
        const ailmentTerrainMods = this.getMobAilmentTerrainModifiers(target);
        const toxicMult = sourceTower?.equipmentId === 'toxic_gloves'
            ? (0.5 + (Math.random() * 3.5))
            : 1;

        const poisonReduction = Math.max(0, target.affixMap?.poison_dmg_reduction || 0);
        target.poisonStacks = target.poisonStacks || [];
        target.poisonStacks.push({
            sourceTowerId: sourceTower.id,
            damagePerTick: perTickDamage * toxicMult * globalDamageMult * (ailmentTerrainMods.poisonDamageMult || 1) * (1 - poisonReduction),
            duration: Math.max(durationSec, globalDurationMin),
            tickTimer: tickInterval,
            tickInterval
        });
        target.poisonEffectTimer = Math.max(target.poisonEffectTimer || 0, 0.5);
        this.addEffect(target.x + 0.5, target.y + 0.5, 'poison_status', { life: 0.25, maxLife: 0.25 });
    }

    applyFireExplosion(centerTarget, sourceTower, damage, radius) {
        const spellAuraMult = this.getSupportSpellDamageMultForTower(sourceTower);
        const radiusSq = radius * radius;
        const hasFireMagic = this.getTowerMagicElements(sourceTower).includes('fire');
        const ailmentPower = Math.max(1, sourceTower?.magicAilmentPowerMult || 1);
        const scorchTalentLevel = Math.max(0, sourceTower?.magicFireScorchTalent || 0);
        for (const mob of this.mobs) {
            const dx = mob.x - centerTarget.x;
            const dy = mob.y - centerTarget.y;
            if (dx * dx + dy * dy <= radiusSq) {
                this.addEffect(mob.x + 0.5, mob.y + 0.5, 'fire_spell', { life: 0.35, maxLife: 0.35, radius: 1 });
                this.damageMob(mob, { base: 0, fire: damage * spellAuraMult, water: 0, wood: 0 }, sourceTower, false);
                if (hasFireMagic) {
                    mob.fireVulnerabilityStacks = Math.min(5, (mob.fireVulnerabilityStacks || 0) + 1);
                }
                if (scorchTalentLevel > 0) {
                    this.applyScorch(mob, damage * spellAuraMult * ailmentPower, 1);
                }
            }
        }
    }

    applyWoodFireFusion(centerTarget, sourceTower, powerScale = 1) {
        const radius = 3.5;
        const radiusSq = radius * radius;
        const spellAuraMult = this.getSupportSpellDamageMultForTower(sourceTower);
        const base = (sourceTower.stats.damage || 0) * powerScale * spellAuraMult;
        this.addEffect(centerTarget.x + 0.5, centerTarget.y + 0.5, 'fire_spell', { life: 0.45, maxLife: 0.45, radius });
        for (const mob of this.mobs) {
            const dx = mob.x - centerTarget.x;
            const dy = mob.y - centerTarget.y;
            if (dx * dx + dy * dy > radiusSq) continue;
            this.damageMob(mob, { base: 0, fire: base * 1.3, water: 0, wood: base * 0.9 }, sourceTower, false);
            this.addPoisonStack(mob, sourceTower, Math.max(1, base * 0.2), 5, sourceTower.poisonFrequencyLevel || 0);
            this.applyScorch(mob, base * 0.8, 1);
        }
    }

    applyFireWaterFusion(centerTarget, sourceTower, powerScale = 1) {
        const radius = 4;
        const radiusSq = radius * radius;
        const spellAuraMult = this.getSupportSpellDamageMultForTower(sourceTower);
        const base = (sourceTower.stats.damage || 0) * powerScale * spellAuraMult;
        this.addEffect(centerTarget.x + 0.5, centerTarget.y + 0.5, 'water_spell', { life: 0.4, maxLife: 0.4, radius });
        for (const mob of this.mobs) {
            const dx = mob.x - centerTarget.x;
            const dy = mob.y - centerTarget.y;
            if (dx * dx + dy * dy > radiusSq) continue;
            this.damageMob(mob, { base: 0, fire: base * 1.1, water: base * 1.1, wood: 0 }, sourceTower, false);
            this.applyFrostbite(mob, 2);
            this.applyScorch(mob, base * 0.9, 1);
        }
    }

    applyWaterWoodFusion(centerTarget, sourceTower, powerScale = 1) {
        const radius = 3.5;
        const radiusSq = radius * radius;
        const spellAuraMult = this.getSupportSpellDamageMultForTower(sourceTower);
        const base = (sourceTower.stats.damage || 0) * powerScale * spellAuraMult;
        this.addEffect(centerTarget.x + 0.5, centerTarget.y + 0.5, 'water_spell', { life: 0.45, maxLife: 0.45, radius });
        for (const mob of this.mobs) {
            const dx = mob.x - centerTarget.x;
            const dy = mob.y - centerTarget.y;
            if (dx * dx + dy * dy > radiusSq) continue;
            this.damageMob(mob, { base: 0, fire: 0, water: base * 1.1, wood: base * 1.1 }, sourceTower, false);
            this.applyFrostbite(mob, 1);
            this.addPoisonStack(mob, sourceTower, Math.max(1, base * 0.22), 5, sourceTower.poisonFrequencyLevel || 0);
            mob.magicWaterSlowStacks = Math.min(7, (mob.magicWaterSlowStacks || 0) + 2);
        }
    }

    spawnFusionControlZone(x, y, sourceTower, mode = 'neutral') {
        this.areaEffects.push({
            type: 'fusion_control',
            mode,
            x,
            y,
            sourceTowerId: sourceTower?.id || null,
            radius: 3.5,
            pullRadius: 4.5,
            life: 3,
            controlTickTimer: 0.2
        });
    }

    applyMagicElementEffects(primaryTarget, sourceTower) {
        const magicElements = this.getTowerMagicElements(sourceTower);
        if (!primaryTarget || magicElements.length <= 0) return;

        const triggerBonus = Math.max(0, sourceTower.magicTriggerChanceBonus || 0);
        const triggerChance = Math.min(1, 0.4 + ((sourceTower.triggerMagicLevel || 0) * 0.2) + triggerBonus);
        if (Math.random() >= triggerChance) return;

        const level = Math.max(1, sourceTower.magicElementLevel || 1);
        const sourceBase = sourceTower.stats.damage || 0;

        if (sourceTower.specializationId === 'spec_magic_combo_wood_fire' && magicElements.includes('wood') && magicElements.includes('fire')) {
            this.areaEffects = this.areaEffects.filter(e => !(e.type === 'fusion_fire_wood' && e.sourceTowerId === sourceTower.id));
            this.areaEffects.push({
                type: 'fusion_fire_wood',
                x: primaryTarget.x,
                y: primaryTarget.y,
                sourceTowerId: sourceTower.id,
                life: 3,
                maxLife: 3,
                pullTickTimer: 0,
                damageTickTimer: 0
            });
            return;
        }
        if (sourceTower.specializationId === 'spec_magic_combo_fire_water' && magicElements.includes('fire') && magicElements.includes('water')) {
            this.areaEffects = this.areaEffects.filter(e => !(e.type === 'fusion_fire_water' && e.sourceTowerId === sourceTower.id));
            this.areaEffects.push({
                type: 'fusion_fire_water',
                x: primaryTarget.x,
                y: primaryTarget.y,
                sourceTowerId: sourceTower.id,
                life: 3,
                maxLife: 3,
                pullTickTimer: 0,
                damageTickTimer: 0
            });
            return;
        }
        if (sourceTower.specializationId === 'spec_magic_combo_water_wood' && magicElements.includes('water') && magicElements.includes('wood')) {
            const numProjectiles = 1 + Math.floor(Math.random() * 3);
            const baseDamage = (sourceTower.stats?.damage || 0) + this.wave;
            for (let i = 0; i < numProjectiles; i++) {
                const target = this.mobs[Math.floor(Math.random() * this.mobs.length)];
                if (!target) continue;
                this.projectiles.push({
                    x: sourceTower.x,
                    y: sourceTower.y,
                    targetId: target.id,
                    lastKnownTargetX: target.x,
                    lastKnownTargetY: target.y,
                    speed: 12 + Math.random() * 6,
                    damage: { base: baseDamage, fire: 0, water: 0, wood: 0 },
                    sourceTower,
                    isNatureFusion: true,
                    visualType: Math.random() > 0.5 ? 'leaf' : 'water_drop'
                });
            }
            return;
        }

        const picked = magicElements[Math.floor(Math.random() * magicElements.length)];
        if (picked === 'fire') {
            const damage = (sourceBase + 40 + ((level - 1) * 60)) * Math.max(1, sourceTower.magicFireDamageMult || 1);
            this.applyFireExplosion(primaryTarget, sourceTower, damage, 3);
            return;
        }

        if (picked === 'water') {
            const damage = (sourceBase + 40 + ((level - 1) * 60)) * Math.max(1, sourceTower.magicWaterDamageMult || 1);
            this.applyWaterSplash(primaryTarget, sourceTower, damage, 3);
            return;
        }

        if (picked === 'wood') {
            const damagePerSecond = (sourceBase + 20 + ((level - 1) * 40)) * Math.max(1, sourceTower.magicWoodDamageMult || 1);
            this.spawnTornado(primaryTarget.x, primaryTarget.y, sourceTower, damagePerSecond, 3, 3);
        }
    }

    applyWaterSplash(centerTarget, sourceTower, damage, radius) {
        const spellAuraMult = this.getSupportSpellDamageMultForTower(sourceTower);
        const radiusSq = radius * radius;
        for (const mob of this.mobs) {
            const dx = mob.x - centerTarget.x;
            const dy = mob.y - centerTarget.y;
            if (dx * dx + dy * dy <= radiusSq) {
                this.addEffect(mob.x + 0.5, mob.y + 0.5, 'water_spell', { life: 0.35, maxLife: 0.35, radius: 1.2 });
                this.damageMob(mob, { base: 0, fire: 0, water: damage * spellAuraMult, wood: 0 }, sourceTower, false);
                mob.magicWaterSlowStacks = Math.min(5, (mob.magicWaterSlowStacks || 0) + 1);
                if ((sourceTower?.magicWaterFrostbiteTalent || 0) > 0) {
                    const ailmentPower = Math.max(1, sourceTower?.magicAilmentPowerMult || 1);
                    const frostbiteStacks = Math.max(1, Math.round(5 * ailmentPower));
                    this.applyFrostbite(mob, frostbiteStacks);
                }
            }
        }
    }

    spawnTornado(x, y, sourceTower, damagePerSecond, radius, duration) {
        if (sourceTower?.id) {
            this.areaEffects = this.areaEffects.filter(
                (eff) => !(eff.type === 'tornado' && eff.sourceTowerId === sourceTower.id)
            );
        }

        this.areaEffects.push({
            type: 'tornado',
            x,
            y,
            sourceTowerId: sourceTower.id,
            radius,
            pullRadius: 5,
            damagePerSecond,
            damageTickTimer: 1.0,
            pullTickTimer: 0.02,
            life: duration
        });
    }

    updateAreaEffects(dt) {
        for (const mob of this.mobs) {
            mob.pullingEffectIndex = undefined;
        }

        for (let i = this.areaEffects.length - 1; i >= 0; i--) {
            const eff = this.areaEffects[i];
            eff.life -= dt;
            if (eff.type === 'tornado' || eff.type === 'fusion_fire_wood' || eff.type === 'fusion_fire_water') {
                eff.damageTickTimer -= dt;
                eff.pullTickTimer -= dt;
            }
            if (eff.type === 'fusion_control') {
                eff.controlTickTimer -= dt;
            }

            if (eff.type === 'tornado') {
                const src = this.towers.find((t) => t.id === eff.sourceTowerId) || null;
                const pullRadiusSq = eff.pullRadius * eff.pullRadius;
                const damageRadiusSq = eff.radius * eff.radius;

                while (eff.pullTickTimer <= 0) {
                    eff.pullTickTimer += 0.02;
                    for (const mob of this.mobs) {
                        const dx = eff.x - mob.x;
                        const dy = eff.y - mob.y;
                        const distSq = dx * dx + dy * dy;
                        if (distSq <= pullRadiusSq) {
                            const dist = Math.sqrt(distSq) || 1;
                            const pull = Math.min(0.01, dist);
                            mob.x += (dx / dist) * pull;
                            mob.y += (dy / dist) * pull;
                            this.addSlowStack(mob, 0.85, 0.3);
                            mob.slowEffectTimer = Math.max(mob.slowEffectTimer || 0, 0.2);
                            this.registerControlEffect(mob, 'slow');
                        }
                    }
                }

                while (eff.damageTickTimer <= 0) {
                    eff.damageTickTimer += 1.0;
                    const spellAuraMult = src ? this.getSupportSpellDamageMultForTower(src) : 1;
                    for (const mob of this.mobs) {
                        const dx = eff.x - mob.x;
                        const dy = eff.y - mob.y;
                        const distSq = dx * dx + dy * dy;
                        if (distSq <= damageRadiusSq) {
                            this.damageMob(mob, { base: 0, fire: 0, water: 0, wood: eff.damagePerSecond * spellAuraMult }, src, false);
                            if (src && (src.magicWoodPoisonTalent || 0) > 0) {
                                const ailmentPower = Math.max(1, src.magicAilmentPowerMult || 1);
                                this.addPoisonStack(
                                    mob,
                                    src,
                                    Math.max(1, (src.stats?.damage || 1) * 0.2 * ailmentPower),
                                    5,
                                    src.poisonFrequencyLevel || 0
                                );
                            }
                        }
                    }
                }
            }

            if (eff.type === 'fusion_fire_wood' || eff.type === 'fusion_fire_water') {
                const src = this.towers.find((t) => t.id === eff.sourceTowerId) || null;
                const pullRadiusSq = 4.5 * 4.5;
                const damageRadiusSq = 1.5 * 1.5;

                while (eff.pullTickTimer <= 0) {
                    eff.pullTickTimer += 0.02;
                    for (const mob of this.mobs) {
                        const dx = eff.x - mob.x;
                        const dy = eff.y - mob.y;
                        const distSq = dx * dx + dy * dy;
                        if (distSq <= pullRadiusSq) {
                            if (mob.pullingEffectIndex === undefined || mob.pullingEffectIndex === i) {
                                mob.pullingEffectIndex = i;
                                const dist = Math.sqrt(distSq) || 1;
                                const pull = Math.min(0.01, dist);
                                mob.x += (dx / dist) * pull;
                                mob.y += (dy / dist) * pull;
                                this.addSlowStack(mob, 0.85, 0.3);
                                mob.slowEffectTimer = Math.max(mob.slowEffectTimer || 0, 0.2);
                                this.registerControlEffect(mob, 'slow');
                            }
                        }
                    }
                }

                while (eff.damageTickTimer <= 0) {
                    eff.damageTickTimer += 0.5;
                    const spellAuraMult = src ? this.getSupportSpellDamageMultForTower(src) : 1;
                    const baseBaseDamage = src ? (src.stats?.damage || 0) : 0;
                    const dmgNum = baseBaseDamage + (this.wave * 5);
                    const damageObj = eff.type === 'fusion_fire_wood'
                        ? { base: 0, fire: dmgNum * spellAuraMult * 0.5, water: 0, wood: dmgNum * spellAuraMult * 0.5 }
                        : { base: 0, fire: dmgNum * spellAuraMult * 0.5, water: dmgNum * spellAuraMult * 0.5, wood: 0 };

                    for (const mob of this.mobs) {
                        const dx = eff.x - mob.x;
                        const dy = eff.y - mob.y;
                        const distSq = dx * dx + dy * dy;
                        if (distSq <= damageRadiusSq) {
                            this.damageMob(mob, damageObj, src, false);

                            const ailmentDmg = Math.max(1, dmgNum * 0.2);
                            this.applyScorch(mob, src, ailmentDmg);
                            this.applyScorch(mob, src, ailmentDmg);
                            this.addPoisonStack(mob, src, ailmentDmg, 5, src?.poisonFrequencyLevel || 0);
                            this.addPoisonStack(mob, src, ailmentDmg, 5, src?.poisonFrequencyLevel || 0);
                        }
                    }
                }
            }

            if (eff.type === 'fusion_control') {
                const sourceTower = eff.sourceTowerId ? (this.towers.find((t) => t.id === eff.sourceTowerId) || null) : null;
                const radiusSq = (eff.radius || 3.5) * (eff.radius || 3.5);
                const pullRadiusSq = (eff.pullRadius || 4.5) * (eff.pullRadius || 4.5);

                while (eff.controlTickTimer <= 0) {
                    eff.controlTickTimer += 0.2;
                    for (const mob of this.mobs) {
                        const dx = eff.x - mob.x;
                        const dy = eff.y - mob.y;
                        const distSq = dx * dx + dy * dy;

                        if (distSq <= radiusSq) {
                            let slowMult = 0.8;
                            if (eff.mode === 'fire_water') slowMult = 0.7;
                            if (eff.mode === 'water_wood') slowMult = 0.75;
                            this.addSlowStack(mob, slowMult, 0.35);
                            mob.slowEffectTimer = Math.max(mob.slowEffectTimer || 0, 0.2);
                            this.registerControlEffect(mob, 'slow');
                        }

                        if ((eff.mode === 'wood_fire' || eff.mode === 'water_wood') && distSq <= pullRadiusSq) {
                            if (mob.pullingEffectIndex === undefined || mob.pullingEffectIndex === i) {
                                mob.pullingEffectIndex = i;
                                const dist = Math.sqrt(distSq) || 1;
                                const pull = Math.min(0.014, dist);
                                mob.x += (dx / dist) * pull;
                                mob.y += (dy / dist) * pull;
                            }
                        }

                        if (eff.mode === 'fire_water' && distSq <= radiusSq && sourceTower && Math.random() < 0.12) {
                            this.applyStun(mob, 0.12, 'stun');
                        }
                    }
                }
            }

            if (eff.life <= 0) {
                this.areaEffects.splice(i, 1);
            }
        }
    }

    updateMobStatusEffects(mob, dt) {
        mob.stunVisualTimer = Math.max(0, (mob.stunVisualTimer || 0) - dt);
        mob.palsyVisualTimer = Math.max(0, (mob.palsyVisualTimer || 0) - dt);
        mob.slowEffectTimer = Math.max(0, (mob.slowEffectTimer || 0) - dt);
        mob.knockbackFxTimer = Math.max(0, (mob.knockbackFxTimer || 0) - dt);
        mob.poisonEffectTimer = Math.max(0, (mob.poisonEffectTimer || 0) - dt);

        mob.frostbiteTimer = Math.max(0, (mob.frostbiteTimer || 0) - dt);
        if ((mob.frostbiteTimer || 0) <= 0) {
            mob.frostbiteStacks = 0;
        }

        mob.scorchTimer = Math.max(0, (mob.scorchTimer || 0) - dt);
        if ((mob.scorchTimer || 0) <= 0) {
            mob.scorchStacks = 0;
            mob.scorchAvgHit = 0;
            mob.scorchSamples = 0;
            mob.scorchTickTimer = 1;
        } else {
            mob.scorchTickTimer = (mob.scorchTickTimer || 1) - dt;
            const ailmentTerrainMods = this.getMobAilmentTerrainModifiers(mob);
            const scorchReduction = Math.max(0, Math.min(0.95, mob.affixMap?.scorch_dmg_reduction || 0));
            while ((mob.scorchTickTimer || 0) <= 0 && this.mobs.includes(mob)) {
                mob.scorchTickTimer += 1;
                const scorchDps = Math.max(
                    0,
                    (mob.scorchStacks || 0)
                    * (mob.scorchAvgHit || 0)
                    * (ailmentTerrainMods.scorchDamageMult || 1)
                    * (1 - scorchReduction)
                );
                if (scorchDps > 0) {
                    this.damageMob(mob, { base: 0, fire: scorchDps, water: 0, wood: 0 }, null, false);
                    if (!this.mobs.includes(mob)) return;
                }
            }
        }

        if (mob.bleedStacks && mob.bleedStacks.length > 0) {
            for (let i = mob.bleedStacks.length - 1; i >= 0; i--) {
                const stack = mob.bleedStacks[i];
                stack.duration -= dt;
                stack.tickTimer -= dt;

                while (stack.tickTimer <= 0 && stack.duration > 0 && this.mobs.includes(mob)) {
                    stack.tickTimer += 1;
                    const sourceTower = this.towers.find(t => t.id === stack.sourceTowerId);
                    this.damageMob(mob, { base: stack.damagePerTick, fire: 0, water: 0, wood: 0 }, sourceTower, false);
                    if (!this.mobs.includes(mob)) return;
                }

                if (stack.duration <= 0) {
                    mob.bleedStacks.splice(i, 1);
                }
            }
        }

        if (mob.poisonStacks && mob.poisonStacks.length > 0) {
            for (let i = mob.poisonStacks.length - 1; i >= 0; i--) {
                const stack = mob.poisonStacks[i];
                stack.duration -= dt;
                stack.tickTimer -= dt;

                while (stack.tickTimer <= 0 && stack.duration > 0 && this.mobs.includes(mob)) {
                    stack.tickTimer += (stack.tickInterval || 1);
                    const sourceTower = this.towers.find(t => t.id === stack.sourceTowerId);
                    this.damageMob(mob, { base: 0, fire: 0, water: 0, wood: stack.damagePerTick }, sourceTower, false);
                    if (!this.mobs.includes(mob)) return;
                }

                if (stack.duration <= 0) {
                    mob.poisonStacks.splice(i, 1);
                }
            }
        }

        if (mob.burnStacks && mob.burnStacks.length > 0) {
            for (let i = mob.burnStacks.length - 1; i >= 0; i--) {
                const stack = mob.burnStacks[i];
                stack.duration -= dt;
                stack.tickTimer -= dt;

                while (stack.tickTimer <= 0 && stack.duration > 0 && this.mobs.includes(mob)) {
                    stack.tickTimer += (stack.tickInterval || 1);
                    const sourceTower = this.towers.find(t => t.id === stack.sourceTowerId);
                    this.damageMob(mob, { base: 0, fire: stack.damagePerTick, water: 0, wood: 0 }, sourceTower, false);
                    if (!this.mobs.includes(mob)) return;
                }

                if (stack.duration <= 0) {
                    mob.burnStacks.splice(i, 1);
                }
            }
        }

        const hasPoison = !!(mob.poisonStacks && mob.poisonStacks.length > 0);
        mob.poisonSlowMultiplier = hasPoison
            ? Math.max(0.05, 1 - (this.globalMasteries.poisonSlowPct || 0))
            : 1;

        if (mob.slowStacks && mob.slowStacks.length > 0) {
            for (let i = mob.slowStacks.length - 1; i >= 0; i--) {
                mob.slowStacks[i].duration -= dt;
                if (mob.slowStacks[i].duration <= 0) {
                    mob.slowStacks.splice(i, 1);
                }
            }

            const slowPcts = mob.slowStacks
                .map((stack) => Math.max(0, Math.min(0.95, 1 - (stack.mult || 1))))
                .sort((a, b) => b - a);
            let totalSlowPct = slowPcts[0] || 0;
            for (let i = 1; i < slowPcts.length; i++) {
                totalSlowPct += slowPcts[i] * 0.3;
            }
            totalSlowPct = Math.min(0.95, totalSlowPct);
            const slowCap = Math.max(0.05, mob.affixMap?.slow_resist_cap || 0.05);
            const effectiveSlowPctAfterResist = Math.min(totalSlowPct, 1 - slowCap);
            const overflowSlowPct = Math.max(0, effectiveSlowPctAfterResist - 0.8);
            const appliedSlowPct = Math.min(0.8, effectiveSlowPctAfterResist);
            mob.slowOverflowDamageTakenBonus = overflowSlowPct;
            mob.slowMultiplier = Math.max(slowCap, 1 - appliedSlowPct);
            mob.slowTimer = 0;
        } else {
            mob.slowMultiplier = 1;
            mob.slowOverflowDamageTakenBonus = 0;
        }
        if ((mob.supportSlowOverflowDamageTakenBonus || 0) < 0.000001) {
            mob.supportSlowOverflowDamageTakenBonus = Math.max(0, mob.supportSlowOverflowDamageTakenBonus || 0);
        }
        if ((mob.combinedSlowOverflowDamageTakenBonus || 0) < 0.000001) {
            mob.combinedSlowOverflowDamageTakenBonus = Math.max(0, mob.combinedSlowOverflowDamageTakenBonus || 0);
        }

        if (mob.controlResistTimers) {
            for (const key of Object.keys(mob.controlResistTimers)) {
                mob.controlResistTimers[key] -= dt;
                if (mob.controlResistTimers[key] <= 0) {
                    mob.controlResistTimers[key] = 0;
                    if (mob.controlResistStacks) mob.controlResistStacks[key] = 0;
                }
            }
        }
    }

    getKnockbackDamageTakenBonus(mob) {
        if (!mob?.knockbackDamageTakenByTower) return 0;
        return Object.values(mob.knockbackDamageTakenByTower)
            .reduce((sum, val) => sum + Math.max(0, Math.min(0.5, val || 0)), 0);
    }

    applyKnockbackDamageTakenStack(mob, sourceTower) {
        if (!mob || !sourceTower?.id) return;
        mob.knockbackDamageTakenByTower = mob.knockbackDamageTakenByTower || {};
        const key = String(sourceTower.id);
        const prev = Math.max(0, mob.knockbackDamageTakenByTower[key] || 0);
        mob.knockbackDamageTakenByTower[key] = Math.min(0.5, prev + 0.1);
    }

    knockbackMob(mob, distance, sourceTower = null) {
        const knockbackResist = Math.max(0, Math.min(0.95, mob?.affixMap?.knockback_resist || 0));
        const controlMult = this.getControlResistMultiplier(mob, 'knockback');
        const effectiveDistance = Math.max(0, distance * controlMult * (1 - knockbackResist));
        if (effectiveDistance <= 0) return;
        this.registerControlEffect(mob, 'knockback');
        this.applyKnockbackDamageTakenStack(mob, sourceTower);

        const current = (mob.pathIndex || 0) + (mob.progress || 0);
        const next = Math.max(0, current - effectiveDistance);
        const nextIndex = Math.floor(next);
        const nextProgress = next - nextIndex;

        mob.pathIndex = Math.min(nextIndex, Math.max(0, this.path.length - 2));
        mob.progress = nextProgress;

        const n1 = this.path[mob.pathIndex];
        const n2 = this.path[mob.pathIndex + 1];
        if (!n1 || !n2) return;
        mob.x = n1.x + (n2.x - n1.x) * mob.progress;
        mob.y = n1.y + (n2.y - n1.y) * mob.progress;
    }
}


