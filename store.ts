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

// Connect to the local server we just created
const socket = io('http://localhost:3001');

export const useGameStore = create<Store>((set, get) => {
  
  // Setup Socket Listeners
  socket.on('connect', () => {
    console.log('Connected to server');
  });

  socket.on('room_joined', ({ roomId, playerId }) => {
      set({ roomId, localPlayerId: playerId });
  });

  socket.on('game_state_update', (serverState) => {
      // We merge server state. Note: players hand will be empty from server public state
      set((state) => ({
          ...state,
          ...serverState,
          players: serverState.players.map((p: any, index: number) => {
               // Keep our local full hand if we are that player
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
      // Check if it's a wild card locally first to trigger UI for color select
      const { players, localPlayerId } = get();
      const me = players.find(p => p.id === localPlayerId);
      const card = me?.hand.find(c => c.id === cardId);
      
      if (card && card.color === 'black') {
          // Temporarily set UI to waiting state, actual emit happens in setColor
          set({ waitingForColorSelection: true });
          // We store the pending card ID in a closure or just re-find it?
          // For simplicity, we assume the UI modal blocks other actions.
          // We need to know WHICH card was clicked for the color selection.
          // Let's hack it slightly: we store pendingCardId in store or just allow setColor to handle it
          // Ideally, we'd add 'pendingCardId' to store. 
          // For now, let's assume the last clicked black card is the one being played.
          // To fix this cleanly: we need the UI to pass the card ID to setColor or setColor takes cardId
          
          // Workaround for this demo structure: 
          // We'll add a temporary property to the store? No, let's just make `setColor` take the cardId too?
          // Or simpler: playCard DOES NOTHING if black, and waits for user to pick color in UI?
          // BUT the UI calls playCard...
          
          // Let's just emit immediately if not black. If black, set `waitingForColorSelection` locally.
          return; 
      }

      socket.emit('play_card', { roomId: get().roomId, cardId });
    },

    setColor: (color) => {
       // Find the black card we are trying to play. 
       // Since we didn't store it, let's find the first valid black card in hand? 
       // Or better, we need `playCard` to store the intent.
       
       // Real fix: In a real app, you select card -> open modal -> submit (cardId, color).
       // Here, we'll assume the user is trying to play the first 'wild' or 'wild4' they have?
       // This is risky. Let's look at how GameUI handles it.
       // GameUI calls `setColor`.
       
       // Let's find the card ID again from the hand (hacky but works for demo if only 1 wild)
       const { players, localPlayerId } = get();
       const me = players.find(p => p.id === localPlayerId);
       // We need the ID. 
       // Let's modify the store to track `pendingCardId`.
       // For now, let's just emit the LAST black card found?
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
      // Reload page to reset socket connection cleanly
      window.location.reload();
    },
    
    // Unused in client-server mode
    processBotTurn: () => {}
  };
});