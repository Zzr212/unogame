import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { GameState, GameStatus, Player, Card, CardColor } from './types';

interface Store extends GameState {
  // Actions
  createLobby: (playerName: string) => void;
  joinLobby: (roomId: string, playerName: string) => void;
  startGame: () => void;
  playCard: (playerId: string, cardId: string) => void;
  drawCard: (playerId: string) => void;
  setColor: (color: CardColor) => void;
  resetGame: () => void;
  
  // Socket
  socket: Socket | null;
  localPlayerId: string | null;
}

const INITIAL_STATE: Omit<Store, 'createLobby' | 'joinLobby' | 'startGame' | 'playCard' | 'drawCard' | 'setColor' | 'resetGame' | 'socket' | 'localPlayerId'> = {
  roomId: null,
  status: GameStatus.LOBBY,
  players: [],
  currentPlayerIndex: 0,
  direction: 1,
  discardPile: [],
  drawPileCount: 0,
  currentColor: 'red',
  winner: null,
  waitingForColorSelection: false,
};

// AUTO-DETECT URL:
// Use optional chaining to safely check for production environment.
// If import.meta.env is undefined, we assume development (localhost:3001).
// In production builds, this usually resolves to true, setting URL to undefined (same origin).
const isProduction = (import.meta as any).env?.PROD;
const URL = isProduction ? undefined : 'http://localhost:3001';

const socket = io(URL);

export const useGameStore = create<Store>((set, get) => {
  
  // Setup Socket Listeners
  socket.on('connect', () => {
    console.log('Connected to server');
  });

  socket.on('room_joined', ({ roomId, playerId }) => {
      set({ roomId, localPlayerId: playerId });
  });

  socket.on('game_state_update', (serverState) => {
      set((state) => ({
          ...state,
          ...serverState,
          players: serverState.players.map((p: any, index: number) => {
               const existing = state.players.find(ep => ep.id === p.id);
               if (existing && existing.id === state.localPlayerId) {
                   return { ...p, hand: existing.hand };
               }
               return p;
          })
      }));
  });

  socket.on('hand_update', (hand: Card[]) => {
      set((state) => ({
          players: state.players.map(p => 
              p.id === state.localPlayerId ? { ...p, hand, cardCount: hand.length } : p
          )
      }));
  });

  socket.on('error', (msg) => alert(msg));

  return {
    ...INITIAL_STATE,
    socket: socket,
    localPlayerId: null,

    createLobby: (playerName) => {
      socket.emit('create_room', { playerName });
    },

    joinLobby: (roomId, playerName) => {
      socket.emit('join_room', { roomId, playerName });
    },

    startGame: () => {
      const { roomId } = get();
      socket.emit('start_game', { roomId });
    },

    playCard: (playerId, cardId) => {
      const { players, localPlayerId } = get();
      const me = players.find(p => p.id === localPlayerId);
      const card = me?.hand.find(c => c.id === cardId);
      
      if (card && card.color === 'black') {
          set({ waitingForColorSelection: true });
          return; 
      }

      socket.emit('play_card', { roomId: get().roomId, cardId });
    },

    setColor: (color) => {
       const { players, localPlayerId } = get();
       const me = players.find(p => p.id === localPlayerId);
       // Select the first black card to play (simplification for this demo)
       const card = me?.hand.find(c => c.color === 'black');
       if (card) {
           socket.emit('play_card', { roomId: get().roomId, cardId: card.id, selectedColor: color });
           set({ waitingForColorSelection: false });
       }
    },

    drawCard: (playerId) => {
      socket.emit('draw_card', { roomId: get().roomId });
    },

    resetGame: () => {
      window.location.reload();
    },
  };
});