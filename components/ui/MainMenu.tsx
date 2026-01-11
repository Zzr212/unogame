import React, { useState } from 'react';
import { useGameStore } from '../../store';

const MainMenu = () => {
  const { createLobby, joinLobby } = useGameStore();
  const [name, setName] = useState('');
  const [roomInput, setRoomInput] = useState('');

  const handleCreate = () => {
    if (!name) return alert('Please enter a name');
    createLobby(name);
  };

  const handleJoin = () => {
    if (!name || !roomInput) return alert('Please enter name and room ID');
    joinLobby(roomInput, name);
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-white z-50">
      <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/20 w-96">
        <h1 className="text-4xl font-extrabold text-center mb-2 tracking-tighter text-yellow-400 drop-shadow-md">
          3D UNO
        </h1>
        <p className="text-center text-gray-300 mb-8">Multiplayer Edition</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Nickname</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              placeholder="Enter your name"
            />
          </div>

          <div className="pt-4 border-t border-gray-600">
            <button 
              onClick={handleCreate}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-lg transition-all transform hover:scale-105 mb-4"
            >
              Create New Game
            </button>

            <div className="flex items-center space-x-2">
              <input 
                type="text" 
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Room Code"
              />
              <button 
                onClick={handleJoin}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;