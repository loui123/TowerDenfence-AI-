import React, { useEffect, useState } from 'react';
import { useGame } from '../../contexts/GameContext';
import { TALENTS, RESOURCES } from '../../data/constants';
import { ArrowLeft, Zap, Trees, Pickaxe, Droplet } from 'lucide-react';

const RESOURCE_COLORS = {
    [RESOURCES.ENERGY]: 'var(--energy)',
    [RESOURCES.WOOD]: 'var(--wood)',
    [RESOURCES.ORE]: 'var(--ore)',
    [RESOURCES.WATER]: 'var(--water)'
};

const RESOURCE_LABELS = {
    [RESOURCES.ENERGY]: 'Energy',
    [RESOURCES.WOOD]: 'Wood',
    [RESOURCES.ORE]: 'Ore',
    [RESOURCES.WATER]: 'Water'
};

const TALENT_CATEGORIES = [
    { id: 'level', title: '關卡設定', talentIds: ['initial_gold', 'player_max_hp', 'mob_hp_drop', 'mob_density', 'item_drop_rate'] },
    { id: 'melee', title: '近戰塔特性', talentIds: ['melee_tower_dmg_base', 'melee_tower_attr_dmg', 'melee_tower_crit_chance', 'melee_tower_atk_speed', 'melee_tower_range'] },
    { id: 'range', title: '遠程塔特性', talentIds: ['range_tower_dmg_base', 'range_tower_attr_dmg', 'range_tower_atk_speed', 'range_tower_crit_chance', 'range_tower_chain', 'range_tower_proj_count', 'range_tower_range'] },
    { id: 'spell', title: '法術塔特性', talentIds: ['spell_tower_dmg_base', 'spell_tower_atk_speed', 'spell_tower_range'] }
];

const getTalent = (talentId) => Object.values(TALENTS).find((talent) => talent.id === talentId);

const formatTalentEffect = (talentId, perLevel) => {
    if (talentId === 'range_tower_proj_count') return `每級 +${perLevel} 額外攻擊目標`;
    if (talentId === 'range_tower_chain') return `每級 +${perLevel} 連鎖次數`;
    if (talentId === 'melee_tower_range' || talentId === 'range_tower_range' || talentId === 'spell_tower_range') return `每級 +${perLevel} 格`;
    if (talentId === 'initial_gold') return `Per level +${perLevel} gold`;
    if (talentId === 'player_max_hp') return `Per level +${perLevel} max HP`;
    if (talentId === 'mob_hp_drop') return '每級 +30% 怪物血量，+10% 資源掉落';
    if (talentId === 'mob_density') return '每級 怪物數量 x2（波次時間不變）';
    if (talentId === 'item_drop_rate') return `每級 +${Math.floor(perLevel * 100)}% 道具掉落率`;
    if (
        talentId === 'melee_tower_attr_dmg'
        || talentId === 'range_tower_attr_dmg'
        || talentId === 'melee_tower_atk_speed'
        || talentId === 'range_tower_atk_speed'
        || talentId === 'spell_tower_atk_speed'
        || talentId === 'melee_tower_crit_chance'
        || talentId === 'range_tower_crit_chance'
    ) {
        return `Per level +${Math.floor(perLevel * 100)}%`;
    }
    return `Per level +${perLevel}`;
};

const ResourceIcon = ({ type, size = 16 }) => {
    if (type === RESOURCES.ENERGY) return <Zap size={size} color={RESOURCE_COLORS[type]} />;
    if (type === RESOURCES.WOOD) return <Trees size={size} color={RESOURCE_COLORS[type]} />;
    if (type === RESOURCES.ORE) return <Pickaxe size={size} color={RESOURCE_COLORS[type]} />;
    if (type === RESOURCES.WATER) return <Droplet size={size} color={RESOURCE_COLORS[type]} />;
    return null;
};

const TalentNode = ({ talentId, compact = false }) => {
    const {
        getTalentLevel,
        getTalentCost,
        getTalentRefund,
        canAffordTalent,
        canRefundTalent,
        upgradeTalent,
        refundTalent
    } = useGame();
    const talent = getTalent(talentId);

    if (!talent) return null;

    const level = getTalentLevel(talentId);
    const cost = getTalentCost(talentId);
    const refund = getTalentRefund(talentId);
    const canAfford = canAffordTalent(talentId);
    const canRefund = canRefundTalent(talentId);

    return (
        <div style={{
            background: '#202020',
            border: '1px solid #3a3a3a',
            borderRadius: '10px',
            padding: compact ? '8px' : '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            minHeight: compact ? '108px' : '122px',
            minWidth: 0,
            overflow: 'hidden'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, color: '#f6f6f6', fontSize: compact ? '0.88rem' : '0.95rem', textAlign: 'left', minWidth: 0, overflowWrap: 'anywhere' }}>
                    {talent.name}
                </div>
                <div style={{
                    minWidth: '48px',
                    fontSize: compact ? '0.74rem' : '0.8rem',
                    borderRadius: '999px',
                    background: '#2d2d2d',
                    padding: '2px 8px'
                }}>
                    Lv.{level}
                </div>
            </div>

            <div style={{ fontSize: compact ? '0.72rem' : '0.8rem', color: '#a9a9a9', textAlign: 'left', minWidth: 0, overflowWrap: 'anywhere' }}>
                {formatTalentEffect(talentId, talent.perLevel)}
            </div>

            <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '8px' }}>
                <button
                    disabled={!canAfford}
                    onClick={() => upgradeTalent(talentId)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        minWidth: 0,
                        width: '100%',
                        padding: compact ? '6px 8px' : '7px 8px',
                        fontWeight: 600,
                        fontSize: compact ? '0.74rem' : '0.82rem',
                        borderColor: canAfford ? RESOURCE_COLORS[talent.costType] : '#4a4a4a',
                        whiteSpace: 'nowrap'
                    }}
                >
                    Upgrade
                    <ResourceIcon type={talent.costType} />
                    {cost}
                </button>

                <button
                    disabled={!canRefund}
                    onClick={() => refundTalent(talentId)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        minWidth: 0,
                        width: '100%',
                        padding: compact ? '6px 8px' : '7px 8px',
                        fontWeight: 600,
                        fontSize: compact ? '0.74rem' : '0.82rem',
                        borderColor: canRefund ? '#67d39a' : '#4a4a4a',
                        color: canRefund ? '#c9ffe2' : undefined,
                        whiteSpace: 'nowrap'
                    }}
                >
                    Refund
                    <ResourceIcon type={talent.costType} />
                    {refund}
                </button>
            </div>
        </div>
    );
};

const TalentSection = ({ title, talentIds, compact = false }) => (
    <section style={{
        background: '#171717',
        border: '1px solid #2f2f2f',
        borderRadius: '10px',
        padding: compact ? '8px' : '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minWidth: 0,
        overflow: 'hidden'
    }}>
        <h3 style={{ textAlign: 'left', fontSize: compact ? '0.9rem' : '0.95rem', letterSpacing: '0.02em', margin: 0 }}>{title}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))', gap: '8px', minWidth: 0 }}>
            {talentIds.map((talentId) => <TalentNode key={talentId} talentId={talentId} compact={compact} />)}
        </div>
    </section>
);

const TalentTree = ({ onBack }) => {
    const { resources } = useGame();
    const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
    const [activeCategoryId, setActiveCategoryId] = useState(TALENT_CATEGORIES[0]?.id || '');
    const isMobile = viewportWidth <= 900;
    const desktopColumnCount = viewportWidth >= 1500 ? 2 : 1;

    useEffect(() => {
        const onResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    return (
        <div style={{
            padding: isMobile ? '8px' : '12px',
            height: '100%',
            width: 'min(1500px, 100vw)',
            maxWidth: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            overflow: 'hidden'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
                <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <ArrowLeft size={16} />
                    Back
                </button>
                <h2 style={{ fontSize: isMobile ? '1.05rem' : '1.5rem', margin: 0 }}>Talent Overview</h2>
                <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px', alignItems: 'center', flexWrap: 'wrap', fontSize: isMobile ? '0.85rem' : '1rem' }}>
                    <span title={RESOURCE_LABELS[RESOURCES.ENERGY]}><ResourceIcon type={RESOURCES.ENERGY} /> {resources.energy}</span>
                    <span title={RESOURCE_LABELS[RESOURCES.WOOD]}><ResourceIcon type={RESOURCES.WOOD} /> {resources.wood}</span>
                    <span title={RESOURCE_LABELS[RESOURCES.ORE]}><ResourceIcon type={RESOURCES.ORE} /> {resources.ore}</span>
                    <span title={RESOURCE_LABELS[RESOURCES.WATER]}><ResourceIcon type={RESOURCES.WATER} /> {resources.water}</span>
                </div>
            </div>

            {isMobile && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
                    {TALENT_CATEGORIES.map((category) => (
                        <button
                            key={category.id}
                            onClick={() => setActiveCategoryId(category.id)}
                            style={{
                                fontSize: '0.72rem',
                                padding: '6px 4px',
                                border: `1px solid ${activeCategoryId === category.id ? '#67d39a' : '#4a4a4a'}`,
                                color: activeCategoryId === category.id ? '#c9ffe2' : '#ddd',
                                background: activeCategoryId === category.id ? '#1e3b2b' : '#252525'
                            }}
                        >
                            {category.title}
                        </button>
                    ))}
                </div>
            )}

            {!isMobile && (
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    display: 'grid',
                    gridTemplateColumns: `repeat(${desktopColumnCount}, minmax(0, 1fr))`,
                    gridAutoRows: 'min-content',
                    gap: '10px',
                    alignContent: 'stretch'
                }}>
                    {TALENT_CATEGORIES.map((category) => (
                        <TalentSection key={category.id} title={category.title} talentIds={category.talentIds.filter((talentId) => !!getTalent(talentId))} />
                    ))}
                </div>
            )}

            {isMobile && (
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    {TALENT_CATEGORIES.filter((c) => c.id === activeCategoryId).map((category) => (
                        <TalentSection
                            key={category.id}
                            compact
                            title={category.title}
                            talentIds={category.talentIds.filter((talentId) => !!getTalent(talentId))}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default TalentTree;
