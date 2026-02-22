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
    { id: 'economy', title: 'Economy', talentIds: ['initial_gold', 'player_max_hp'] },
    { id: 'damage', title: 'Tower Damage', talentIds: ['tower_dmg_base', 'tower_attr_dmg', 'tower_crit_chance'] },
    { id: 'attack_pattern', title: 'Attack Pattern', talentIds: ['tower_proj_count', 'tower_chain', 'tower_aoe_range'] },
    { id: 'tempo', title: 'Tempo and Coverage', talentIds: ['tower_atk_speed', 'tower_range', 'game_speed'] },
    { id: 'level', title: 'Level Rules', talentIds: ['mob_hp_drop', 'mob_density'] }
];

const getTalent = (talentId) => Object.values(TALENTS).find((talent) => talent.id === talentId);

const formatTalentEffect = (talentId, perLevel) => {
    if (talentId === 'tower_proj_count') return `Per level +${perLevel} extra targets`;
    if (talentId === 'tower_chain') return `Per level +${perLevel} chain jumps`;
    if (talentId === 'tower_range' || talentId === 'tower_aoe_range') return `Per level +${perLevel} tiles`;
    if (talentId === 'initial_gold') return `Per level +${perLevel} gold`;
    if (talentId === 'player_max_hp') return `Per level +${perLevel} max HP`;
    if (talentId === 'mob_hp_drop') return 'Per level +30% mob HP, +10% resource drop';
    if (talentId === 'mob_density') return 'Per level x2 mob count, same wave duration';
    if (talentId === 'game_speed') return `Per level +${perLevel.toFixed(2)}x game speed (max x2.00)`;
    if (talentId === 'tower_attr_dmg' || talentId === 'tower_atk_speed' || talentId === 'tower_crit_chance' || talentId === 'mob_hp_drop' || talentId === 'mob_density') {
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
