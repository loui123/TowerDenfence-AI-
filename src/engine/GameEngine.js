
import { TOWER_TYPES, MONSTER_TYPES, WAVE_CONFIG, TALENTS, RESOURCES } from '../data/constants';
import { ITEM_DEFS, ITEM_TYPES, MONSTER_ITEM_DROP_TABLE } from '../data/items';

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
        this.maxHp = 1 + Math.max(0, Math.floor(this.getTalentValue('player_max_hp')));
        this.hp = this.maxHp;
        this.victory = false;

        this.waveActive = false;
        this.waveTimer = 0;
        this.mobsSpawned = 0;
        this.spawnTimer = 0;

        this.paused = false;
        this.lastTime = 0;
        this.userGameSpeed = 1;
        this.globalMasteries = {
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
            critDmgAura: false
        };
        this.waveAffixCache = {};

        console.log("GameEngine Initialized", { pathLength: path?.length, wave: this.wave });
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
                desc: '每一秒最多承受 0.5 秒暈眩'
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
        if (id === 'crit_damage_reduction') {
            const reduction = this.lerpByWave(wave, 1.0, 2.0);
            return {
                id,
                name: '暴擊傷害減免',
                value: reduction,
                desc: `承受暴擊傷害減少 ${(reduction * 100).toFixed(0)}%（不低於 0%）`
            };
        }
        if (id === 'melee_dmg_reduction') return { id, name: '近戰傷害減免', value: 0.3, desc: '承受近戰傷害減少 30%' };
        if (id === 'bleed_dmg_reduction') return { id, name: '流血減免', value: 0.3, desc: '承受流血傷害減少 30%' };
        if (id === 'poison_dmg_reduction') return { id, name: '中毒傷害減免', value: 0.5, desc: '承受中毒傷害減少 50%' };
        if (id === 'projectile_dmg_reduction') return { id, name: '投射物傷害減免', value: 0.3, desc: '承受投射物傷害減少 30%' };
        if (id === 'elemental_dmg_reduction') return { id, name: '元素傷害減免', value: 0.3, desc: '承受元素傷害減少 30%' };
        if (id === 'move_speed_up') {
            const speedUp = this.lerpByWave(wave, 0.4, 0.8);
            return {
                id,
                name: '怪物移動速度提升',
                value: speedUp,
                desc: `怪物移動速度增加 ${(speedUp * 100).toFixed(0)}%`
            };
        }
        return null;
    }

    rollWaveAffixes(wave) {
        if (wave <= 10) return [];
        const pool = [
            'slow_resist_cap',
            'stun_hardness',
            'stun_duration_reduction',
            'crit_damage_reduction',
            'melee_dmg_reduction',
            'bleed_dmg_reduction',
            'poison_dmg_reduction',
            'projectile_dmg_reduction',
            'elemental_dmg_reduction',
            'move_speed_up'
        ];

        const affixCount = (() => {
            if (wave >= 50) {
                let count = 1;
                if (Math.random() < 0.55) count += 1;
                if (Math.random() < 0.3) count += 1;
                return count;
            }
            return Math.random() < 0.35 ? 1 : 0;
        })();

        if (affixCount <= 0) return [];
        const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(pool.length, affixCount));
        return shuffled.map((id) => this.buildAffixById(id, wave)).filter(Boolean);
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

        // Safety cap dt to prevent huge jumps if tab was backgrounded or lag spike
        const safeDt = Math.min(dt, 0.1) * this.getGameSpeedMultiplier();

        this.lastTime = now;

        this.update(safeDt);

        if (this.events.requestDraw) this.events.requestDraw();

        requestAnimationFrame(() => this.loop());
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
            angle: Math.random() * Math.PI * 2
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
        const waveCount = Math.max(1, Math.floor(config.count * densityMultiplier));
        const spawnInterval = 1.0 / densityMultiplier;

        if (this.mobsSpawned < waveCount) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                console.log("Spawning Mob...", this.mobsSpawned + 1, "/", waveCount);
                const isBoss = this.mobsSpawned === waveCount - 1;
                this.spawnMob(config.type, { isBoss });
                this.mobsSpawned++;
                this.spawnTimer = spawnInterval;
            }
        } else if (this.mobs.length === 0) {
            console.log("Wave Complete", this.wave);
            this.waveActive = false;
            const completedWave = this.wave;

            if (completedWave === 10) {
                const continueRun = this.events.onVictory ? this.events.onVictory() : false;
                if (!continueRun) {
                    this.victory = true;
                    this.paused = true;
                    return;
                }
                this.wave++;
                this.events.onWaveComplete(this.wave);
                return;
            }

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

        const newMob = {
            id: Math.random(),
            type: typeId,
            isBoss,
            hp: 10 * this.wave * buff * this.getWaveHpScale(this.wave) * bossHpMultiplier,
            maxHp: 10 * this.wave * buff * this.getWaveHpScale(this.wave) * bossHpMultiplier,
            speed: 2 * bossSpeedMultiplier * (1 + moveSpeedUp),
            slowTimer: 0,
            slowMultiplier: 1,
            stunTimer: 0,
            stunHardnessWindow: 0,
            stunHardnessApplied: 0,
            pathIndex: 0,
            progress: 0,
            x: this.path[0].x,
            y: this.path[0].y,
            affixes: waveAffixes,
            affixMap: waveAffixMap
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
            }

            const waterSlowMult = 1 - (0.2 * Math.min(5, mob.magicWaterSlowStacks || 0));
            const tornadoSpeedMult = this.getMobTornadoSpeedMultiplier(mob);
            const currentSpeed = mob.speed
                * this.getMobTerrainSpeedMultiplier(mob)
                * (mob.slowMultiplier || 1)
                * (mob.poisonSlowMultiplier || 1)
                * Math.max(0.05, waterSlowMult)
                * Math.max(0.05, 1 - this.getSupportSlowPctForMob(mob))
                * tornadoSpeedMult;
            if (mob.stunTimer > 0) {
                continue;
            }
            const dist = currentSpeed * dt;

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
            const globalSpeedMult = this.globalMasteries.speedAura ? 1.1 : 1.0;
            const towerSpeedMult = tower.masterySpeedMult || 1.0;
            const auraBonus = this.getBannerAuraBonuses(tower);
            const effectiveSpeed = Math.max(0.01, tower.stats.speed * terrainMods.speedMult * globalSpeedMult * towerSpeedMult * (1 + auraBonus.speedPct));
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
        return Math.max(0, Math.floor(this.getTowerTalentValue(tower?.type, 'chain'))) + (tower?.bonusChain || 0);
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

    fireTower(tower, targets) {
        const terrainMods = this.getTowerTerrainModifiers(tower);
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

        const globalCritBonus = this.globalMasteries.critAura ? 0.2 : 0;
        const auraBonus = this.getBannerAuraBonuses(tower);
        const critChance = Math.max(0, Math.min(1, tower.stats.crit + terrainMods.critBonus + globalCritBonus + auraBonus.critChance));
        const damage = {
            base: tower.stats.damage * terrainMods.damageMult * auraBonus.damageMult,
            fire: (tower.stats.extraFire || 0) * terrainMods.damageMult * auraBonus.damageMult,
            water: (tower.stats.extraWater || 0) * terrainMods.damageMult * auraBonus.damageMult,
            wood: (tower.stats.extraWood || 0) * terrainMods.damageMult * auraBonus.damageMult,
        };
        if (tower.magicElement) {
            const baseVal = damage.base;
            damage.base = 0;
            if (tower.magicElement === 'fire') damage.fire += baseVal;
            if (tower.magicElement === 'water') damage.water += baseVal;
            if (tower.magicElement === 'wood') damage.wood += baseVal;
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
                    crit: Math.random() < critChance,
                    sourceTower: tower,
                    remainingChains: initialChains,
                    chainMultiplier: 1,
                    hitHistory: []
                });
            });
        } else if (tower.stats.type === 'magic') {
            const isCrit = Math.random() < critChance;
            targets.forEach((target) => {
                this.addEffect(target.x + 0.5, target.y + 0.5, 'magic_orb', { life: 0.12, maxLife: 0.12 });
                if (!tower.magicElement) {
                    this.addEffect(target.x + 0.5, target.y + 0.5, 'magic_burst', { life: 0.28, maxLife: 0.28 });
                } else if (tower.magicElement === 'fire') {
                    this.addEffect(target.x + 0.5, target.y + 0.5, 'fire_burst', { life: 0.28, maxLife: 0.28 });
                } else if (tower.magicElement === 'water') {
                    this.addEffect(target.x + 0.5, target.y + 0.5, 'water_burst', { life: 0.3, maxLife: 0.3 });
                } else if (tower.magicElement === 'wood') {
                    this.addEffect(target.x + 0.5, target.y + 0.5, 'wood_burst', { life: 0.35, maxLife: 0.35 });
                }
                this.damageMob(target, damage, tower, isCrit);
                this.applyOnHitEffects(target, tower);
            });
        } else {
            const isCrit = Math.random() < critChance;
            targets.forEach((target) => {
                this.addEffect(target.x + 0.5, target.y + 0.5, 'slash');
                this.damageMob(target, damage, tower, isCrit);
                this.applyOnHitEffects(target, tower);
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
                    this.damageMob(target, this.scaleDamage(p.damage, p.chainMultiplier || 1), p.sourceTower, p.crit);
                    this.applyOnHitEffects(target, p.sourceTower);
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
                }

                this.projectiles.splice(i, 1);
            } else {
                const move = p.speed * dt;
                p.x += (dx / dist) * move;
                p.y += (dy / dist) * move;
            }
        }
    }

    damageMob(mob, damageObj, tower, isCrit) {
        let totalDamage = 0;
        const globalCritDmgBonus = this.globalMasteries.critDmgAura ? 0.2 : 0;
        const auraBonus = tower ? this.getBannerAuraBonuses(tower) : { critDmgBonus: 0, luckCritDmgBonus: 0 };
        let critMult = isCrit
            ? ((tower?.stats?.critDmg || 2.0) + globalCritDmgBonus + (auraBonus.critDmgBonus || 0) + (auraBonus.luckCritDmgBonus || 0))
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
            }
            let finalVal = val * effectiveCritMult;
            let multiplier = 1.0;

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
            if ((typeId === 'fire' || typeId === 'water' || typeId === 'wood') && (mob.affixMap?.elemental_dmg_reduction || 0) > 0) {
                finalVal *= (1 - mob.affixMap.elemental_dmg_reduction);
            }

            totalDamage += finalVal;

            const offsetX = (Math.random() - 0.5) * 0.5;
            const offsetY = (Math.random() - 0.5) * 0.5;

            this.floatingTexts.push({
                x: mob.x + 0.5 + offsetX,
                y: mob.y + offsetY - 0.5,
                text: Math.floor(finalVal).toString() + (multiplier > 1 ? '!' : ''),
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
        let dropAmount = 1;
        dropAmount = Math.max(1, Math.floor(dropAmount * this.getMobDropMultiplier()));

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
        if (table.length === 0) return;
        const itemDropMult = 1 + Math.max(0, this.getTalentValue('item_drop_rate'));

        for (const entry of table) {
            if (Math.random() < Math.min(1, entry.chance * itemDropMult)) {
                this.events.onItemDrop(entry.itemId, 1, mob.type);
            }
        }
    }

    applyTowerUpgrade(tower, upgradeType) {
        if (!tower || (tower.pendingUpgrades || 0) <= 0) return false;
        if (tower.type === 'support' && !upgradeType.startsWith('support_')) return false;

        switch (upgradeType) {
            case 'fire_dmg':
                tower.stats.extraFire = (tower.stats.extraFire || 0) + (tower.stats.damage * 0.25);
                tower.lockedElement = tower.lockedElement || 'fire';
                break;
            case 'water_dmg':
                tower.stats.extraWater = (tower.stats.extraWater || 0) + (tower.stats.damage * 0.25);
                tower.lockedElement = tower.lockedElement || 'water';
                break;
            case 'wood_dmg':
                tower.stats.extraWood = (tower.stats.extraWood || 0) + (tower.stats.damage * 0.25);
                tower.lockedElement = tower.lockedElement || 'wood';
                break;
            case 'base_dmg': tower.stats.damage *= 1.25; break;
            case 'base_magic_dmg':
                tower.stats.damage += 20;
                break;
            case 'crit_chance': tower.stats.crit = Math.min(1, tower.stats.crit + 0.1); break;
            case 'crit_dmg': tower.stats.critDmg = (tower.stats.critDmg || 1.5) + 0.2; break;
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
            case 'slow_power_up':
                tower.slowPowerLevel = (tower.slowPowerLevel || 0) + 1;
                break;
            case 'knockback_up':
                tower.knockbackBonus = (tower.knockbackBonus || 0) + 0.5;
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
                if (!tower.magicElement) return false;
                tower.triggerMagicLevel = (tower.triggerMagicLevel || 0) + 1;
                break;
            case 'elemental_fire_magic':
            case 'elemental_water_magic':
            case 'elemental_wood_magic': {
                const nextElement = upgradeType.includes('fire') ? 'fire' : upgradeType.includes('water') ? 'water' : 'wood';
                if (tower.magicElement && tower.magicElement !== nextElement) return false;
                tower.magicElement = nextElement;
                tower.magicElementLevel = (tower.magicElementLevel || 0) + 1;
                break;
            }
            default:
                return false;
        }

        tower.upgradeStats = tower.upgradeStats || {};
        tower.upgradeStats[upgradeType] = (tower.upgradeStats[upgradeType] || 0) + 1;

        tower.pendingUpgrades = Math.max(0, (tower.pendingUpgrades || 0) - 1);
        return true;
    }

    applyTowerSpecialization(tower, specId) {
        if (!tower || !tower.pendingSpecialization || tower.specializationChosen) return false;

        if (tower.type === 'support') {
            switch (specId) {
                case 'support_spec_level_books_10':
                    this.events?.onItemDrop?.('level_book', 10, 'support_spec');
                    break;
                case 'support_spec_speed_books_10':
                    this.events?.onItemDrop?.('speed_book', 10, 'support_spec');
                    break;
                case 'support_spec_power_books_10':
                    this.events?.onItemDrop?.('power_book', 10, 'support_spec');
                    break;
                case 'support_spec_crit_books_10':
                    this.events?.onItemDrop?.('crit_book', 10, 'support_spec');
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
                default:
                    return false;
            }

            tower.pendingSpecialization = false;
            tower.specializationChosen = true;
            tower.specializationId = specId;
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
                tower.masterySpeedMult = (tower.masterySpeedMult || 1) * 1.2;
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
            default:
                return false;
        }

        tower.pendingSpecialization = false;
        tower.specializationChosen = true;
        tower.specializationId = specId;
        return true;
    }

    placeTower(x, y, typeId) {
        const typeDef = Object.values(TOWER_TYPES).find(t => t.id === typeId);
        const cell = this.grid[y]?.[x];

        if (cell?.type !== 'build' || this.gold < typeDef.cost) {
            return null;
        }

        if (this.gold >= typeDef.cost) {
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
                poisonDamageLevel: 0,
                poisonDurationLevel: 0,
                poisonFrequencyLevel: 0,
                upgradeStats: {},
                pendingSpecialization: false,
                specializationChosen: false,
                masterySpeedMult: 1,
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
                magicElementLevel: 0,
                specializationId: null,
                totalDamageDealt: 0,
                equipmentId: null,
                equipmentName: null,
                supportExp: 0,
                supportAuraType: typeId === 'support' ? 'attack' : null,
                supportAttackAuraLevel: 0,
                supportSpeedAuraLevel: 0,
                supportSlowAuraLevel: 0,
                supportCritAuraLevel: 0,
                supportAuraRangeBonus: 0,
                supportAuraDouble: false,
                supportLuckyAura: false,
                supportLuckyAuraTimer: 0,
                supportLuckyCritDmgBonus: 0
            };
            this.towers.push(tower);
            return tower;
        }
        return null;
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
        const level = this.talents.mob_density || 0;
        return Math.pow(2, level);
    }

    getGameSpeedMultiplier() {
        return this.userGameSpeed;
    }

    getMaxGameSpeedMultiplier() {
        return 2;
    }

    setGameSpeedMultiplier(nextSpeed) {
        const cap = this.getMaxGameSpeedMultiplier();
        const clamped = Math.max(1, Math.min(cap, Number(nextSpeed) || 1));
        this.userGameSpeed = Math.round(clamped * 100) / 100;
        return this.userGameSpeed;
    }

    getWaveConfig(wave) {
        const direct = WAVE_CONFIG[wave - 1];
        if (direct) return direct;
        const fallback = WAVE_CONFIG[WAVE_CONFIG.length - 1] || { type: 'normal', count: 30 };
        return {
            type: fallback.type,
            count: fallback.count
        };
    }

    getWaveHpScale(wave) {
        if (wave <= 10) return 1.1;
        return 1.1 * Math.pow(1.2, wave - 10);
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

        let pct = 0.15 + (level * 0.15);
        if (tower.supportAuraDouble) pct *= 2;
        return pct;
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
                // Moving toward tornado center -> speed up.
                mult *= 1.3;
            } else if (dot < -0.1) {
                // Moving away from tornado center -> slow down.
                mult *= 0.7;
            }
        }

        return Math.max(0.05, mult);
    }

    applyStun(mob, durationSec) {
        if (!mob || durationSec <= 0) return;
        let duration = durationSec;

        const stunReduction = Math.max(0, mob.affixMap?.stun_duration_reduction || 0);
        duration *= Math.max(0, 1 - stunReduction);
        if (duration <= 0) return;

        if ((mob.affixMap?.stun_hardness || 0) > 0) {
            const remaining = Math.max(0, 0.5 - (mob.stunHardnessApplied || 0));
            if (remaining <= 0) return;
            duration = Math.min(duration, remaining);
            mob.stunHardnessApplied = (mob.stunHardnessApplied || 0) + duration;
        }

        mob.stunTimer = Math.max(mob.stunTimer || 0, duration);
    }

    applyOnHitEffects(primaryTarget, sourceTower) {
        if (!primaryTarget || !sourceTower) return;
        const sourceBase = sourceTower.stats.damage;

        if (sourceTower.type === 'melee') {
            this.applyBleed(primaryTarget, sourceTower);
        }

        if (sourceTower.type === 'projectile_slow') {
            this.applySlowArea(primaryTarget, sourceTower);
        }

        if (sourceTower.type === 'projectile_aoe' && this.mobs.includes(primaryTarget)) {
            const aoeRadius = 1 + (sourceTower.knockbackRadiusBonus || 0);
            const radiusSq = aoeRadius * aoeRadius;
            const knockbackDist = 0.5 + (sourceTower.knockbackBonus || 0);
            const knockbackStun = sourceTower.knockbackStun || 0;

            for (const mob of this.mobs) {
                const dx = mob.x - primaryTarget.x;
                const dy = mob.y - primaryTarget.y;
                if (dx * dx + dy * dy > radiusSq) continue;
                this.knockbackMob(mob, knockbackDist);
                if (knockbackStun > 0) {
                    this.applyStun(mob, knockbackStun);
                }
            }
        }

        if (sourceTower.hitStun) {
            this.applyStun(primaryTarget, sourceTower.hitStun);
        }

        if (this.globalMasteries.waterMastery && Math.random() < 0.25) {
            this.applyStun(primaryTarget, 0.15);
            this.damageMob(primaryTarget, { base: 0, fire: 0, water: sourceBase * 0.5, wood: 0 }, sourceTower, false);
        }

        if (this.globalMasteries.woodMastery) {
            const extraDuration = this.globalMasteries.woodPoisonDurationBonus || 0;
            this.addPoisonStack(primaryTarget, sourceTower, sourceBase * 0.3, 4 + extraDuration, sourceTower.poisonFrequencyLevel || 0);
        }

        if (this.globalMasteries.fireMastery) {
            this.applyFireExplosion(primaryTarget, sourceTower, sourceBase * 0.2, 2);
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

        if (sourceTower.equipmentId === 'chain_lightning') {
            this.triggerChainLightning(primaryTarget, sourceTower, 50, 20, 0.2, 1.0);
        }
    }

    triggerChainLightning(originTarget, sourceTower, damage, maxChains, paralyzeChance, paralyzeSec) {
        let currentTarget = originTarget;
        const chainedIds = new Set();

        for (let i = 0; i <= maxChains; i++) {
            if (!currentTarget) break;
            const currentId = currentTarget.id;
            if (currentId !== undefined) chainedIds.add(currentId);

            if (this.mobs.includes(currentTarget)) {
                this.addEffect(currentTarget.x + 0.5, currentTarget.y + 0.5, 'hit', { life: 0.12, maxLife: 0.12 });
                this.damageMob(currentTarget, { base: damage, fire: 0, water: 0, wood: 0 }, sourceTower, false);
                if (this.mobs.includes(currentTarget) && Math.random() < paralyzeChance) {
                    this.applyStun(currentTarget, paralyzeSec);
                }
            }

            const nextTarget = this.findChainTarget(currentTarget, chainedIds);
            if (!nextTarget) break;
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

    applyInventoryItem(tower, itemId) {
        if (!tower || !itemId) {
            return { ok: false, message: '無效的目標或道具' };
        }

        const item = ITEM_DEFS[itemId];
        if (!item) {
            return { ok: false, message: '找不到道具定義' };
        }

        if (item.type === ITEM_TYPES.CONSUMABLE) {
            if (itemId === 'level_book') {
                if (tower.level >= 10) {
                    return { ok: false, message: '滿等塔無法使用等級之書' };
                }
                this.levelUpTower(tower, 1);
                return { ok: true, message: `${item.name} 已使用` };
            }
            if (itemId === 'speed_book') {
                tower.stats.speed *= 1.1;
                return { ok: true, message: `${item.name} 已使用` };
            }
            if (itemId === 'power_book') {
                tower.stats.damage *= 1.1;
                return { ok: true, message: `${item.name} 已使用` };
            }
            if (itemId === 'crit_book') {
                tower.stats.crit = Math.min(1, (tower.stats.crit || 0) + 0.1);
                return { ok: true, message: `${item.name} 已使用` };
            }
            return { ok: false, message: '此消耗道具尚未實作' };
        }

        if (item.type === ITEM_TYPES.EQUIPMENT) {
            if (tower.equipmentId) {
                return { ok: false, message: '每座塔只能裝備一件裝備，且無法卸下' };
            }

            if (itemId === 'lubricant') {
                const towerDef = Object.values(TOWER_TYPES).find((t) => t.id === tower.type) || TOWER_TYPES.MELEE;
                const typeBaseSpeed = towerDef?.stats?.speed || 1;
                const talentSpeedMult = this.getTowerTalentModifiersForType(tower.type).speedMult;
                const previousBaseWithTalent = Math.max(0.0001, typeBaseSpeed * talentSpeedMult);
                const existingBonusMult = Math.max(0, (tower.stats.speed || 0) / previousBaseWithTalent);
                tower.stats.speed = talentSpeedMult * existingBonusMult;
            } else if (itemId === 'full_firepower') {
                const towerDef = Object.values(TOWER_TYPES).find((t) => t.id === tower.type) || TOWER_TYPES.MELEE;
                const typeBaseDamage = towerDef?.stats?.damage || 1;
                const towerMods = this.getTowerTalentModifiersForType(tower.type);
                const talentBaseBonus = towerMods.baseDamageBonus;
                const talentAttrMult = towerMods.attrDamageMult;
                const previousBaseWithTalent = Math.max(0.0001, (typeBaseDamage + talentBaseBonus) * talentAttrMult);
                const existingBonusMult = Math.max(0, (tower.stats.damage || 0) / previousBaseWithTalent);
                tower.stats.damage = Math.max(0, (40 + talentBaseBonus) * talentAttrMult * existingBonusMult);
            } else if (
                itemId !== 'chain_lightning'
                && itemId !== 'courage_banner'
                && itemId !== 'slaughter_banner'
                && itemId !== 'agility_banner'
                && itemId !== 'full_firepower'
            ) {
                return { ok: false, message: '此裝備尚未實作' };
            }

            tower.equipmentId = itemId;
            tower.equipmentName = item.name;
            return { ok: true, message: `${item.name} 裝備完成` };
        }

        return { ok: false, message: '未知道具類型' };
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

            if (sourceTower.equipmentId === 'courage_banner') {
                result.critChance += 0.25;
            } else if (sourceTower.equipmentId === 'slaughter_banner') {
                result.critDmgBonus += 0.4;
            } else if (sourceTower.equipmentId === 'agility_banner') {
                result.speedPct += 0.1;
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
        const radius = 2;
        const radiusSq = radius * radius;
        const slowPct = Math.min(0.95, 0.3 + ((sourceTower.slowPowerLevel || 0) * 0.1));
        const slowMult = 1 - slowPct;

        for (const mob of this.mobs) {
            const dx = mob.x - primaryTarget.x;
            const dy = mob.y - primaryTarget.y;
            if (dx * dx + dy * dy <= radiusSq) {
                mob.slowStacks = mob.slowStacks || [];
                mob.slowStacks.push({ mult: slowMult, duration: 3 });
            }
        }
    }

    applyBleed(target, sourceTower) {
        const level = sourceTower.bleedLevel || 0;
        if (level <= 0) return;

        const bleedMult = sourceTower.bleedDamageMult || 1;
        const duration = sourceTower.bleedDurationOverride || 4;
        const bleedReduction = Math.max(0, target.affixMap?.bleed_dmg_reduction || 0);
        const perTick = sourceTower.stats.damage * (0.3 * level) * bleedMult * (1 - bleedReduction);
        target.bleedMap = {};
        target.bleedMap[sourceTower.id] = {
            damagePerTick: perTick,
            duration,
            tickTimer: 1,
            sourceTowerId: sourceTower.id
        };

        // Immediate burst on apply/refresh.
        this.damageMob(target, { base: perTick, fire: 0, water: 0, wood: 0 }, sourceTower, false);
    }

    addPoisonStack(target, sourceTower, perTickDamage, durationSec, sourcePoisonFreqLevel = 0) {
        const globalDamageMult = this.globalMasteries.poisonDamageMult || 1;
        const globalDurationMin = this.globalMasteries.poisonDurationMin || 0;
        const globalTickRateMult = this.globalMasteries.poisonTickRateMult || 1;
        const sourceTickRateMult = 1 + (0.1 * Math.max(0, sourcePoisonFreqLevel));
        const tickInterval = 1 / Math.max(0.1, sourceTickRateMult * globalTickRateMult);

        const poisonReduction = Math.max(0, target.affixMap?.poison_dmg_reduction || 0);
        target.poisonStacks = target.poisonStacks || [];
        target.poisonStacks.push({
            sourceTowerId: sourceTower.id,
            damagePerTick: perTickDamage * globalDamageMult * (1 - poisonReduction),
            duration: Math.max(durationSec, globalDurationMin),
            tickTimer: tickInterval,
            tickInterval
        });
    }

    applyFireExplosion(centerTarget, sourceTower, damage, radius) {
        const radiusSq = radius * radius;
        for (const mob of this.mobs) {
            const dx = mob.x - centerTarget.x;
            const dy = mob.y - centerTarget.y;
            if (dx * dx + dy * dy <= radiusSq) {
                this.damageMob(mob, { base: 0, fire: damage, water: 0, wood: 0 }, sourceTower, false);
                if (sourceTower?.magicElement === 'fire') {
                    mob.fireVulnerabilityStacks = Math.min(5, (mob.fireVulnerabilityStacks || 0) + 1);
                }
            }
        }
    }

    applyMagicElementEffects(primaryTarget, sourceTower) {
        if (!primaryTarget || !sourceTower?.magicElement) return;
        const triggerChance = Math.min(1, 0.4 + ((sourceTower.triggerMagicLevel || 0) * 0.2));
        if (Math.random() >= triggerChance) return;

        const level = Math.max(1, sourceTower.magicElementLevel || 1);
        const sourceBase = sourceTower.stats.damage || 0;
        if (sourceTower.magicElement === 'fire') {
            const damage = sourceBase + 40 + ((level - 1) * 60);
            this.applyFireExplosion(primaryTarget, sourceTower, damage, 3);
            return;
        }

        if (sourceTower.magicElement === 'water') {
            const damage = sourceBase + 40 + ((level - 1) * 60);
            this.applyWaterSplash(primaryTarget, sourceTower, damage, 3);
            return;
        }

        if (sourceTower.magicElement === 'wood') {
            const damagePerSecond = sourceBase + 20 + ((level - 1) * 40);
            this.spawnTornado(primaryTarget.x, primaryTarget.y, sourceTower, damagePerSecond, 3, 3);
        }
    }

    applyWaterSplash(centerTarget, sourceTower, damage, radius) {
        const radiusSq = radius * radius;
        for (const mob of this.mobs) {
            const dx = mob.x - centerTarget.x;
            const dy = mob.y - centerTarget.y;
            if (dx * dx + dy * dy <= radiusSq) {
                this.damageMob(mob, { base: 0, fire: 0, water: damage, wood: 0 }, sourceTower, false);
                mob.magicWaterSlowStacks = Math.min(5, (mob.magicWaterSlowStacks || 0) + 1);
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
        for (let i = this.areaEffects.length - 1; i >= 0; i--) {
            const eff = this.areaEffects[i];
            eff.life -= dt;
            if (eff.type === 'tornado') {
                eff.damageTickTimer -= dt;
                eff.pullTickTimer -= dt;
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
                        }
                    }
                }

                while (eff.damageTickTimer <= 0) {
                    eff.damageTickTimer += 1.0;
                    for (const mob of this.mobs) {
                        const dx = eff.x - mob.x;
                        const dy = eff.y - mob.y;
                        const distSq = dx * dx + dy * dy;
                        if (distSq <= damageRadiusSq) {
                            this.damageMob(mob, { base: 0, fire: 0, water: 0, wood: eff.damagePerSecond }, src, false);
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
        if (mob.bleedMap) {
            for (const key of Object.keys(mob.bleedMap)) {
                const entry = mob.bleedMap[key];
                entry.duration -= dt;
                entry.tickTimer -= dt;

                while (entry.tickTimer <= 0 && entry.duration > 0 && this.mobs.includes(mob)) {
                    entry.tickTimer += 1;
                    const sourceTower = this.towers.find(t => t.id === entry.sourceTowerId);
                    this.damageMob(mob, { base: entry.damagePerTick, fire: 0, water: 0, wood: 0 }, sourceTower, false);
                    if (!this.mobs.includes(mob)) return;
                }

                if (entry.duration <= 0) {
                    delete mob.bleedMap[key];
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

            let mult = 1;
            for (const stack of mob.slowStacks) {
                mult *= stack.mult;
            }
            const slowCap = Math.max(0.05, mob.affixMap?.slow_resist_cap || 0.05);
            mob.slowMultiplier = Math.max(slowCap, mult);
            mob.slowTimer = 0;
        }
    }

    knockbackMob(mob, distance) {
        const current = (mob.pathIndex || 0) + (mob.progress || 0);
        const next = Math.max(0, current - distance);
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
