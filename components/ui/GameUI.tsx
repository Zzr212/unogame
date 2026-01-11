import React from 'react';
import { useGameStore } from '../../store';
import { CardColor } from '../../types';

const GameUI = () => {
  const { 
    roomId, 
    players, 
    currentPlayerIndex, 
    winner, 
    resetGame, 
    currentColor, 
    waitingForColorSelection,
    setColor,
    startGame,
  } = useGameStore();

  const localPlayer = players[0];
  const isMyTurn = players[currentPlayerIndex]?.id === localPlayer?.id;

  if (winner) {
    return (
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 text-white">
        <h2 className="text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">WINNER!</h2>
        <p className="text-3xl mb-12 font-light">{winner.name}</p>
        <button 
          onClick={resetGame}
          className="bg-white text-black px-10 py-4 rounded-full font-bold text-xl hover:scale-105 transition-transform shadow-xl"
        >
          Back to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start pointer-events-auto">
          {/* Home / Room Info */}
          <div className="bg-gray-900/80 backdrop-blur border border-white/10 rounded-2xl px-6 py-3 text-white shadow-lg flex flex-col">
            <span className="text-xs text-gray-400 font-bold tracking-wider">ROOM</span>
            <span className="text-xl font-mono text-blue-400">{roomId}</span>
          </div>

          {/* Player Profile / Status */}
          <div className="flex flex-col items-end gap-2">
             <div className="bg-gray-900/80 backdrop-blur border border-white/10 rounded-full px-6 py-2 text-white shadow-lg flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold">
                    {localPlayer?.name.charAt(0)}
                </div>
                <span className="font-medium">{localPlayer?.name}</span>
             </div>
             
             <button 
                onClick={() => startGame()}
                className="bg-green-600/90 hover:bg-green-500 text-white text-sm font-bold py-2 px-4 rounded-full shadow-lg transition-colors backdrop-blur-sm"
             >
                Restart / Deal
             </button>
          </div>
      </div>

      {/* Color Picker Modal */}
      {waitingForColorSelection && isMyTurn && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-auto z-40 backdrop-blur-sm">
           <div className="bg-gray-900 p-8 rounded-3xl shadow-2xl border border-white/10">
              <h3 className="text-2xl font-bold mb-6 text-center text-white">Select Color</h3>
              <div className="grid grid-cols-2 gap-4">
                 {(['red', 'blue', 'green', 'yellow'] as CardColor[]).map(c => (
                    <button 
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-24 h-24 rounded-2xl shadow-lg transform hover:scale-105 transition-all border-4 border-transparent hover:border-white/50`}
                      style={{ backgroundColor: c === 'yellow' ? '#facc15' : c === 'red' ? '#ef4444' : c === 'blue' ? '#3b82f6' : '#22c55e' }}
                    />
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* Current Turn Indicator (Bottom Center) */}
      {!isMyTurn && (
         <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-6 py-2 rounded-full border border-white/10 backdrop-blur-md">
            Waiting for {players[currentPlayerIndex]?.name}...
         </div>
      )}

      {/* Active Color Indicator (HUD) */}
      <div className="absolute bottom-6 right-6 pointer-events-auto">
         <div className="flex flex-col items-center bg-gray-900/80 border border-white/10 p-3 rounded-2xl text-white shadow-lg backdrop-blur-md">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Active Color</span>
            <div 
              className="w-12 h-12 rounded-full shadow-inner transition-colors duration-500"
              style={{ 
                  backgroundColor: currentColor === 'black' ? '#333' : 
                                   currentColor === 'red' ? '#ef4444' :
                                   currentColor === 'blue' ? '#3b82f6' :
                                   currentColor === 'green' ? '#22c55e' : '#facc15',
                  boxShadow: `0 0 20px ${currentColor === 'black' ? '#333' : 
                                   currentColor === 'red' ? '#ef4444' :
                                   currentColor === 'blue' ? '#3b82f6' :
                                   currentColor === 'green' ? '#22c55e' : '#facc15'}`
              }}
            />
         </div>
      </div>

      {/* UNO Button */}
      {localPlayer?.hand.length === 1 && (
         <div className="absolute bottom-40 left-1/2 transform -translate-x-1/2 pointer-events-auto animate-bounce z-30">
            <button className="bg-gradient-to-r from-red-600 to-red-500 text-white font-black italic text-3xl px-10 py-4 rounded-full border-4 border-yellow-400 shadow-2xl hover:scale-110 transition-transform tracking-wider">
               UNO!
            </button>
         </div>
      )}
    </div>
  );
};

export default GameUI;