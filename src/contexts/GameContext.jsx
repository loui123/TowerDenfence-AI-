
import React, { createContext, useContext, useState, useEffect } from 'react';
import { TALENTS, RESOURCES } from '../data/constants';

const GameContext = createContext();

const INITIAL_STATE = {
    resources: {
        [RESOURCES.ENERGY]: 0,
        [RESOURCES.WOOD]: 0,
        [RESOURCES.ORE]: 0,
        [RESOURCES.WATER]: 0,
    },
    talents: {} // id: level
};

export const GameProvider = ({ children }) => {
    const [saveData, setSaveData] = useState(() => {
        try {
            const saved = localStorage.getItem('rogue_td_save');
            return saved ? JSON.parse(saved) : INITIAL_STATE;
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
                [type]: Math.floor(prev.resources[type] + amount)
            }
        }));
    };

    const getTalentDef = (talentId) => TALENTS[Object.keys(TALENTS).find(k => TALENTS[k].id === talentId)];

    const canAffordTalent = (talentId) => {
        const talent = getTalentDef(talentId);
        if (!talent) return false;

        const level = saveData.talents[talentId] || 0;
        if (talent.maxLevel !== undefined && level >= talent.maxLevel) return false;
        // Simple cost formula: base * (level + 1)
        const cost = Math.floor(talent.baseCost * Math.pow(1.5, level));
        return saveData.resources[talent.costType] >= cost;
    };

    const getTalentCost = (talentId) => {
        const talent = getTalentDef(talentId);
        if (!talent) return 0;
        const level = saveData.talents[talentId] || 0;
        return Math.floor(talent.baseCost * Math.pow(1.5, level));
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
                [talent.costType]: prev.resources[talent.costType] - cost
            },
            talents: {
                ...prev.talents,
                [talentId]: (prev.talents[talentId] || 0) + 1
            }
        }));
    };

    const canRefundTalent = (talentId) => (saveData.talents[talentId] || 0) > 0;

    const getTalentRefund = (talentId) => {
        const talent = getTalentDef(talentId);
        if (!talent) return 0;

        const level = saveData.talents[talentId] || 0;
        if (level <= 0) return 0;

        // Refund the exact cost paid for the latest level.
        return Math.floor(talent.baseCost * Math.pow(1.5, level - 1));
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

            return {
                ...prev,
                resources: {
                    ...prev.resources,
                    [talent.costType]: prev.resources[talent.costType] + refund
                },
                talents: nextTalents
            };
        });
    };

    const getTalentLevel = (talentId) => saveData.talents[talentId] || 0;

    // Cheat function for debug
    const debugAddResources = () => {
        setSaveData(prev => ({
            ...prev,
            resources: { energy: 1000, wood: 1000, ore: 1000, water: 1000 }
        }));
    };

    const resetSave = () => {
        setSaveData(INITIAL_STATE);
    };

    return (
        <GameContext.Provider value={{
            resources: saveData.resources,
            talents: saveData.talents,
            addResource,
            upgradeTalent,
            getTalentCost,
            getTalentRefund,
            canAffordTalent,
            canRefundTalent,
            getTalentLevel,
            refundTalent,
            debugAddResources,
            resetSave
        }}>
            {children}
        </GameContext.Provider>
    );
};

export const useGame = () => useContext(GameContext);
