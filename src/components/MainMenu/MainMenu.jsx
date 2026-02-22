import React from 'react';
import { useGame } from '../../contexts/GameContext';
import { Play, Zap, Gem, Pickaxe } from 'lucide-react';
import TalentTree from './TalentTree';

const MainMenu = ({ onStart }) => {
    const { resources, settings, updateSettings, runStats, debugAddResources, resetSave } = useGame();
    const [view, setView] = React.useState('main'); // main, talents
    const bestRun = runStats?.bestRun || null;
    const recentRuns = runStats?.recentRuns || [];

    const formatDuration = (sec = 0) => {
        const total = Math.max(0, Math.floor(sec));
        const hh = Math.floor(total / 3600);
        const mm = Math.floor((total % 3600) / 60);
        const ss = total % 60;
        if (hh > 0) return `${hh}時 ${String(mm).padStart(2, '0')}分 ${String(ss).padStart(2, '0')}秒`;
        return `${mm}分 ${String(ss).padStart(2, '0')}秒`;
    };

    const formatPlayedAt = (iso) => {
        if (!iso) return '-';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '-';
        return d.toLocaleString('zh-TW', { hour12: false });
    };

    if (view === 'talents') {
        return <TalentTree onBack={() => setView('main')} />;
    }

    return (
        <div className="menu-container" style={{ textAlign: 'center', display: 'grid', gridTemplateRows: 'auto auto auto 1fr auto', gap: '1.2rem', width: 'min(1100px, 96vw)', height: 'min(92vh, 900px)', margin: '0 auto' }}>
            <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '0.03em' }}>肉鴿塔防</h1>

            <div className="resources-display" style={{ display: 'flex', gap: '26px', justifyContent: 'center', background: '#333', padding: '14px 18px', borderRadius: '10px', fontSize: '1.3rem', border: '1px solid #444' }}>
                <div title="能量" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Zap size={24} color="var(--energy)" /> {resources.energy}</div>
                <div title="紅水晶" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Gem size={24} color="#ff6b6b" /> {resources.red_crystal || 0}</div>
                <div title="綠寶石" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Gem size={24} color="#67d39a" /> {resources.green_gem || 0}</div>
                <div title="藍水晶" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Gem size={24} color="#7fb7ff" /> {resources.blue_crystal || 0}</div>
                <div title="金礦" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Pickaxe size={24} color="#f5c451" /> {resources.gold_ore || 0}</div>
            </div>

            <div className="menu-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', width: 'min(520px, 86vw)', margin: '0 auto' }}>
                <button onClick={onStart} style={{ fontSize: '1.55rem', padding: '18px 20px', fontWeight: 700 }}>
                    <Play size={28} style={{ marginRight: '10px', verticalAlign: 'bottom' }} /> 開始遊戲
                </button>

                <button onClick={() => setView('talents')} style={{ fontSize: '1.35rem', padding: '14px 18px', fontWeight: 700 }}>
                    開啟天賦樹
                </button>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button
                        onClick={() => updateSettings({ bgmEnabled: !settings?.bgmEnabled })}
                        style={{
                            fontSize: '1rem',
                            padding: '10px 14px',
                            border: `1px solid ${settings?.bgmEnabled ? '#6ad58a' : '#555'}`,
                            background: settings?.bgmEnabled ? '#264b2f' : '#2a2a2a'
                        }}
                    >
                        BGM {settings?.bgmEnabled ? '開' : '關'}
                    </button>
                    <button
                        onClick={() => updateSettings({ sfxEnabled: !settings?.sfxEnabled })}
                        style={{
                            fontSize: '1rem',
                            padding: '10px 14px',
                            border: `1px solid ${settings?.sfxEnabled ? '#79b8ff' : '#555'}`,
                            background: settings?.sfxEnabled ? '#2b374a' : '#2a2a2a'
                        }}
                    >
                        音效 {settings?.sfxEnabled ? '開' : '關'}
                    </button>
                </div>

                <div style={{ marginTop: '8px', borderTop: '1px solid #444', paddingTop: '10px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button onClick={debugAddResources} style={{ fontSize: '0.9rem' }}>測試：新增資源</button>
                    <button onClick={resetSave} style={{ fontSize: '0.9rem', background: '#500' }}>重置存檔</button>
                </div>
            </div>

            <div />

            <div style={{ width: 'min(1000px, 92vw)', margin: '0 auto', background: '#252525', border: '1px solid #444', borderRadius: '8px', padding: '12px', textAlign: 'left', lineHeight: 1.45, alignSelf: 'end' }}>
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>最高守護波數紀錄</div>
                {bestRun ? (
                    <div style={{ color: '#ddd', fontSize: '0.92rem' }}>
                        <div>最高波數: {bestRun.highestWave}</div>
                        <div>遊戲時長: {formatDuration(bestRun.durationSec)}</div>
                        <div>遊玩時間: {formatPlayedAt(bestRun.playedAt)}</div>
                        <div>MVP塔: {bestRun.mvpTowerName}（傷害 {bestRun.mvpTowerDamage}）</div>
                    </div>
                ) : (
                    <div style={{ color: '#9a9a9a', fontSize: '0.9rem' }}>尚無紀錄</div>
                )}

                <div style={{ borderTop: '1px solid #3a3a3a', marginTop: '10px', paddingTop: '8px' }}>
                    <div style={{ fontWeight: 700, marginBottom: '6px' }}>近期遊玩次數: {recentRuns.length}</div>
                    {recentRuns.length > 0 ? (
                        <div style={{ display: 'grid', gap: '4px', maxHeight: '140px', overflowY: 'auto', fontSize: '0.86rem', color: '#d6d6d6' }}>
                            {recentRuns.slice(0, 5).map((run, idx) => (
                                <div key={`run-${idx}`} style={{ border: '1px solid #3a3a3a', borderRadius: '6px', padding: '4px 6px' }}>
                                    波數 {run.highestWave} | 時長 {formatDuration(run.durationSec)} | 遊玩時間 {formatPlayedAt(run.playedAt)} | MVP {run.mvpTowerName}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ color: '#9a9a9a', fontSize: '0.86rem' }}>尚無近期紀錄</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MainMenu;
