
import React, { useState } from 'react';
import { GameProvider } from './contexts/GameContext';
import MainMenu from './components/MainMenu/MainMenu';
import Game from './components/Game/Game';

function App() {
  const [inGame, setInGame] = useState(false);

  return (
    <GameProvider>
      <div className="app-container">
        {inGame ? (
          <Game onExit={() => setInGame(false)} />
        ) : (
          <MainMenu onStart={() => setInGame(true)} />
        )}
      </div>
    </GameProvider>
  );
}

export default App;
