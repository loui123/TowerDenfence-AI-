
import React, { createContext, useContext, useState, useEffect } from 'react';
import { TALENTS, RESOURCES } from '../data/constants';

const GameContext = createContext();

const INITIAL_STATE = {
    resources: {
        [RESOURCES.ENERGY]: 0,
        [RESOURCES.RED_CRYSTAL]: 0,
        [RESOURCES.GREEN_GEM]: 0,
        [RESOURCES.BLUE_CRYSTAL]: 0,
        [RESOURCES.GOLD_ORE]: 0,
    },
    talents: {}, // id: level
    talentPurchaseCosts: {}, // id: number[]
    settings: {
        bgmEnabled: true,
        sfxEnabled: true
    },
    runStats: {
        bestRun: null,
        recentRuns: []
    }
};

export const GameProvider = ({ children }) => {
    const [saveData, setSaveData] = useState(() => {
        try {
            const saved = localStorage.getItem('rogue_td_save');
            const parsed = saved ? JSON.parse(saved) : INITIAL_STATE;
            return {
                ...INITIAL_STATE,
                ...parsed,
                resources: {
                    ...INITIAL_STATE.resources,
                    ...(parsed?.resources || {})
                },
                talentPurchaseCosts: parsed?.talentPurchaseCosts && typeof parsed.talentPurchaseCosts === 'object'
                    ? parsed.talentPurchaseCosts
                    : {},
                runStats: {
                    ...INITIAL_STATE.runStats,
                    ...(parsed?.runStats || {}),
                    recentRuns: Array.isArray(parsed?.runStats?.recentRuns) ? parsed.runStats.recentRuns : []
                },
                settings: {
                    ...INITIAL_STATE.settings,
                    ...(parsed?.settings || {})
                }
            };
        } catch {
            return INITIAL_STATE;
        }
    });

    useEffect(() => {
        localStorage.setItem('rogue_td_save', JSON.stringify(saveData));
    }, [saveData]);

    const addResource = (type, amount) => {
        setSaveData(prev => ({
            ...prev,
            resources: {
                ...prev.resources,
                [type]: Math.floor((prev.resources[type] || 0) + amount)
            }
        }));
    };

    const getTalentDef = (talentId) => TALENTS[Object.keys(TALENTS).find(k => TALENTS[k].id === talentId)];

    const getTalentCostGroup = (talent) => {
        if (!talent) return 'shared';
        return talent.costType === RESOURCES.GOLD_ORE ? 'gold_ore' : 'shared';
    };

    const getCostGrowthForGroup = (group) => {
        if (group === 'gold_ore') return 1.16;
        return 1.12;
    };

    const getGroupSpentLevels = (group, talentsMap) => {
        const safeTalents = talentsMap || {};
        return Object.values(TALENTS).reduce((sum, talent) => {
            if (getTalentCostGroup(talent) !== group) return sum;
            return sum + Math.max(0, safeTalents[talent.id] || 0);
        }, 0);
    };

    const getSharedCurveCost = (talent, talentsMap) => {
        if (!talent) return 0;
        const group = getTalentCostGroup(talent);
        const spentLevels = getGroupSpentLevels(group, talentsMap);
        const growth = getCostGrowthForGroup(group);
        return Math.floor(talent.baseCost * Math.pow(growth, spentLevels));
    };

    const canAffordTalent = (talentId) => {
        const talent = getTalentDef(talentId);
        if (!talent) return false;

        const level = saveData.talents[talentId] || 0;
        if (talent.maxLevel !== undefined && level >= talent.maxLevel) return false;
        const cost = getSharedCurveCost(talent, saveData.talents);
        return (saveData.resources[talent.costType] || 0) >= cost;
    };

    const getTalentCost = (talentId) => {
        const talent = getTalentDef(talentId);
        if (!talent) return 0;
        return getSharedCurveCost(talent, saveData.talents);
    };

    const upgradeTalent = (talentId) => {
        if (!canAffordTalent(talentId)) return;

        const talent = getTalentDef(talentId);
        const currentLevel = saveData.talents[talentId] || 0;
        if (talent.maxLevel !== undefined && currentLevel >= talent.maxLevel) return;
        const cost = getTalentCost(talentId);

        setSaveData(prev => ({
            ...prev,
            resources: {
                    ...prev.resources,
                    [talent.costType]: (prev.resources[talent.costType] || 0) - cost
                },
            talents: {
                ...prev.talents,
                [talentId]: (prev.talents[talentId] || 0) + 1
            },
            talentPurchaseCosts: {
                ...(prev.talentPurchaseCosts || {}),
                [talentId]: [...(prev.talentPurchaseCosts?.[talentId] || []), cost]
            }
        }));
    };

    const canRefundTalent = (talentId) => (saveData.talents[talentId] || 0) > 0;

    const getTalentRefund = (talentId) => {
        const talent = getTalentDef(talentId);
        if (!talent) return 0;

        const level = saveData.talents[talentId] || 0;
        if (level <= 0) return 0;

        const history = saveData.talentPurchaseCosts?.[talentId];
        if (Array.isArray(history) && history.length > 0) {
            return Math.floor(history[history.length - 1]);
        }

        // Backward compatibility for legacy saves without purchase history.
        return Math.floor(talent.baseCost * Math.pow(1.5, Math.max(0, level - 1)));
    };

    const refundTalent = (talentId) => {
        if (!canRefundTalent(talentId)) return;

        const talent = getTalentDef(talentId);
        if (!talent) return;

        const refund = getTalentRefund(talentId);
        setSaveData(prev => {
            const currentLevel = prev.talents[talentId] || 0;
            if (currentLevel <= 0) return prev;

            const nextLevel = currentLevel - 1;
            const nextTalents = { ...prev.talents };
            if (nextLevel === 0) {
                delete nextTalents[talentId];
            } else {
                nextTalents[talentId] = nextLevel;
            }

            const nextPurchaseCosts = { ...(prev.talentPurchaseCosts || {}) };
            if (Array.isArray(nextPurchaseCosts[talentId]) && nextPurchaseCosts[talentId].length > 0) {
                nextPurchaseCosts[talentId] = nextPurchaseCosts[talentId].slice(0, -1);
                if (nextPurchaseCosts[talentId].length === 0) {
                    delete nextPurchaseCosts[talentId];
                }
            }

            return {
                ...prev,
                resources: {
                    ...prev.resources,
                    [talent.costType]: (prev.resources[talent.costType] || 0) + refund
                },
                talents: nextTalents,
                talentPurchaseCosts: nextPurchaseCosts
            };
        });
    };

    const getTalentLevel = (talentId) => saveData.talents[talentId] || 0;

    const updateSettings = (nextSettings) => {
        setSaveData((prev) => ({
            ...prev,
            settings: {
                ...prev.settings,
                ...(nextSettings || {})
            }
        }));
    };

    const recordRunSession = (runSummary) => {
        if (!runSummary) return;
        const normalized = {
            highestWave: Math.max(1, Math.floor(runSummary.highestWave || 1)),
            durationSec: Math.max(0, Math.floor(runSummary.durationSec || 0)),
            playedAt: runSummary.playedAt || new Date().toISOString(),
            mvpTowerName: runSummary.mvpTowerName || '無',
            mvpTowerDamage: Math.max(0, Math.floor(runSummary.mvpTowerDamage || 0))
        };

        setSaveData((prev) => {
            const prevStats = prev.runStats || { bestRun: null, recentRuns: [] };
            const nextRecentRuns = [normalized, ...(prevStats.recentRuns || [])].slice(0, 20);
            const prevBest = prevStats.bestRun || null;
            const shouldReplaceBest = !prevBest
                || normalized.highestWave > prevBest.highestWave
                || (normalized.highestWave === prevBest.highestWave && normalized.durationSec > (prevBest.durationSec || 0));
            const nextBestRun = shouldReplaceBest ? normalized : prevBest;

            return {
                ...prev,
                runStats: {
                    bestRun: nextBestRun,
                    recentRuns: nextRecentRuns
                }
            };
        });
    };

    // Cheat function for debug
    const debugAddResources = () => {
        setSaveData(prev => ({
            ...prev,
            resources: {
                energy: 1000,
                red_crystal: 1000,
                green_gem: 1000,
                blue_crystal: 1000,
                gold_ore: 1000
            }
        }));
    };

    const resetSave = () => {
        setSaveData(INITIAL_STATE);
    };

    return (
        <GameContext.Provider value={{
            resources: saveData.resources,
            talents: saveData.talents,
            settings: saveData.settings || INITIAL_STATE.settings,
            runStats: saveData.runStats || { bestRun: null, recentRuns: [] },
            addResource,
            upgradeTalent,
            getTalentCost,
            getTalentRefund,
            canAffordTalent,
            canRefundTalent,
            getTalentLevel,
            refundTalent,
            recordRunSession,
            updateSettings,
            debugAddResources,
            resetSave
        }}>
            {children}
        </GameContext.Provider>
    );
};

export const useGame = () => useContext(GameContext);
