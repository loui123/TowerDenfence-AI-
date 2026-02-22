import React from 'react';
import { useGame } from '../../contexts/GameContext';
import { Play, Zap, Gem, Pickaxe } from 'lucide-react';
import TalentTree from './TalentTree';

const MainMenu = ({ onStart }) => {
    const { resources, debugAddResources, resetSave } = useGame();
    const [view, setView] = React.useState('main'); // main, talents

    if (view === 'talents') {
        return <TalentTree onBack={() => setView('main')} />;
    }

    return (
        <div className="menu-container" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <h1>Roguelike Tower Defense</h1>

            <div className="resources-display" style={{ display: 'flex', gap: '20px', justifyContent: 'center', background: '#333', padding: '10px', borderRadius: '8px' }}>
                <div title="Energy"><Zap size={20} color="var(--energy)" /> {resources.energy}</div>
                <div title="Red Crystal"><Gem size={20} color="#ff6b6b" /> {resources.red_crystal || 0}</div>
                <div title="Green Gem"><Gem size={20} color="#67d39a" /> {resources.green_gem || 0}</div>
                <div title="Blue Crystal"><Gem size={20} color="#7fb7ff" /> {resources.blue_crystal || 0}</div>
                <div title="Gold Ore"><Pickaxe size={20} color="#f5c451" /> {resources.gold_ore || 0}</div>
            </div>

            <div className="menu-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px', margin: '0 auto' }}>
                <button onClick={onStart} style={{ fontSize: '1.2rem', padding: '15px' }}>
                    <Play size={24} style={{ marginRight: '8px', verticalAlign: 'bottom' }} /> Start Game
                </button>

                <button onClick={() => setView('talents')} style={{ fontSize: '1rem' }}>
                    Open Talent Tree (One Page)
                </button>

                <div style={{ marginTop: '20px', borderTop: '1px solid #444', paddingTop: '10px' }}>
                    <button onClick={debugAddResources} style={{ fontSize: '0.8rem', marginRight: '10px' }}>Debug: Add Resources</button>
                    <button onClick={resetSave} style={{ fontSize: '0.8rem', background: '#500' }}>Reset Save</button>
                </div>
            </div>
        </div>
    );
};

export default MainMenu;
