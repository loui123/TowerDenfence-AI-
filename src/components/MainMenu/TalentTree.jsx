import React, { useEffect, useState } from 'react';
import { useGame } from '../../contexts/GameContext';
import { TALENTS, RESOURCES } from '../../data/constants';
import { ArrowLeft, Zap, Gem, Pickaxe } from 'lucide-react';

const RESOURCE_COLORS = {
    [RESOURCES.ENERGY]: 'var(--energy)',
    [RESOURCES.RED_CRYSTAL]: '#ff6b6b',
    [RESOURCES.GREEN_GEM]: '#67d39a',
    [RESOURCES.BLUE_CRYSTAL]: '#7fb7ff',
    [RESOURCES.GOLD_ORE]: '#f5c451'
};

const RESOURCE_LABELS = {
    [RESOURCES.ENERGY]: '能量',
    [RESOURCES.RED_CRYSTAL]: '紅水晶',
    [RESOURCES.GREEN_GEM]: '綠寶石',
    [RESOURCES.BLUE_CRYSTAL]: '藍水晶',
    [RESOURCES.GOLD_ORE]: '金礦'
};

const TALENT_CATEGORIES = [
    { id: 'level_config', title: '關卡設定', talentIds: ['initial_gold', 'player_max_hp', 'item_drop_rate', 'tower_limit', 'mob_hp_drop', 'mob_density', 'equip_absorption_force'] },
    {
        id: 'melee',
        title: '近戰塔特性',
        talentIds: ['melee_tower_dmg_base', 'melee_tower_attr_dmg', 'melee_tower_crit_chance', 'melee_tower_atk_speed', 'melee_tower_range']
    },
    {
        id: 'range',
        title: '遠程塔特性',
        talentIds: ['range_tower_dmg_base', 'range_tower_attr_dmg', 'range_tower_atk_speed', 'range_tower_crit_chance', 'range_tower_chain', 'range_tower_proj_count', 'range_tower_range']
    },
    {
        id: 'spell',
        title: '法術塔特性',
        talentIds: ['spell_tower_dmg_base', 'spell_tower_atk_speed', 'spell_tower_range']
    }
];

const getTalent = (talentId) => Object.values(TALENTS).find((talent) => talent.id === talentId);

const formatTalentEffect = (talentId, perLevel) => {
    if (talentId === 'range_tower_proj_count') return `每級 +${perLevel} 攻擊數量`;
    if (talentId === 'range_tower_chain') return `每級 +${perLevel} 連鎖次數`;
    if (talentId.endsWith('_range')) return `每級 +${perLevel} 格`;
    if (talentId === 'initial_gold') return `每級 +${perLevel} 金幣`;
    if (talentId === 'player_max_hp') return `每級 +${perLevel} 最大生命`;
    if (talentId === 'tower_limit') return `每級 +${perLevel} 可建塔上限`;
    if (talentId === 'mob_hp_drop') return '每級 +30% 怪物血量、+10% 資源掉落';
    if (talentId === 'mob_density') return '每級怪物密度 x1.4（同波時長）';
    if (talentId === 'equip_absorption_force') return '最多 1 次，開始遊戲獲得裝備「吸收之力」';
    if (talentId === 'item_drop_rate') return `每級 +${Math.floor(perLevel * 100)}% 道具掉落率`;
    if (
        talentId.endsWith('_attr_dmg')
        || talentId.endsWith('_atk_speed')
        || talentId.endsWith('_crit_chance')
    ) {
        return `每級 +${Math.floor(perLevel * 100)}%`;
    }
    return `每級 +${perLevel}`;
};

const ResourceIcon = ({ type, size = 16 }) => {
    if (type === RESOURCES.ENERGY) return <Zap size={size} color={RESOURCE_COLORS[type]} />;
    if (type === RESOURCES.RED_CRYSTAL) return <Gem size={size} color={RESOURCE_COLORS[type]} />;
    if (type === RESOURCES.GREEN_GEM) return <Gem size={size} color={RESOURCE_COLORS[type]} />;
    if (type === RESOURCES.BLUE_CRYSTAL) return <Gem size={size} color={RESOURCE_COLORS[type]} />;
    if (type === RESOURCES.GOLD_ORE) return <Pickaxe size={size} color={RESOURCE_COLORS[type]} />;
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
                    升級
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
                    退款
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
            padding: isMobile ? '10px' : '16px',
            height: '100dvh',
            maxHeight: '100dvh',
            width: 'min(1700px, 100vw)',
            maxWidth: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflowY: 'auto',
            overflowX: 'hidden'
        }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', justifyItems: 'center', gap: '10px' }}>
                <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '5px', justifySelf: 'start' }}>
                    <ArrowLeft size={16} />
                    返回
                </button>
                <h2 style={{ fontSize: isMobile ? '1.45rem' : '2.1rem', margin: 0 }}>主選單天賦樹</h2>
                <div style={{ display: 'flex', gap: isMobile ? '12px' : '22px', alignItems: 'center', flexWrap: 'wrap', fontSize: isMobile ? '1rem' : '1.3rem', background: '#2a2a2a', border: '1px solid #444', borderRadius: '10px', padding: isMobile ? '10px 14px' : '14px 22px', justifyContent: 'center', width: 'min(980px, 96vw)' }}>
                    <span title={RESOURCE_LABELS[RESOURCES.ENERGY]} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ResourceIcon type={RESOURCES.ENERGY} size={isMobile ? 18 : 22} /> {resources.energy}</span>
                    <span title={RESOURCE_LABELS[RESOURCES.RED_CRYSTAL]} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ResourceIcon type={RESOURCES.RED_CRYSTAL} size={isMobile ? 18 : 22} /> {resources.red_crystal || 0}</span>
                    <span title={RESOURCE_LABELS[RESOURCES.GREEN_GEM]} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ResourceIcon type={RESOURCES.GREEN_GEM} size={isMobile ? 18 : 22} /> {resources.green_gem || 0}</span>
                    <span title={RESOURCE_LABELS[RESOURCES.BLUE_CRYSTAL]} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ResourceIcon type={RESOURCES.BLUE_CRYSTAL} size={isMobile ? 18 : 22} /> {resources.blue_crystal || 0}</span>
                    <span title={RESOURCE_LABELS[RESOURCES.GOLD_ORE]} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ResourceIcon type={RESOURCES.GOLD_ORE} size={isMobile ? 18 : 22} /> {resources.gold_ore || 0}</span>
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
                <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
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
