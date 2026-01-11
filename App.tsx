import React from 'react';
import { useGameStore } from './store';
import MainMenu from './components/ui/MainMenu';
import GameScene from './components/3d/GameScene';
import GameUI from './components/ui/GameUI';
import { GameStatus } from './types';

function App() {
  const { status } = useGameStore();

  return (
    <div className="w-full h-full relative bg-gray-900">
      {status === GameStatus.LOBBY && <MainMenu />}
      
      {/* We keep the Scene mounted but hidden in lobby if we wanted transitions, 
          but for simplicity, we mount it when playing or if we want a 3D background in menu later.
          Here we mount it when playing to save resources or create a fresh context. */}
      {status !== GameStatus.LOBBY && (
        <>
          <GameScene />
          <GameUI />
        </>
      )}
    </div>
  );
}

export default App;