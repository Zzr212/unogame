import { create } from 'zustand';
import { GameState, GameStatus, Player, Card, CardColor } from './types';
import { createDeck, isValidMove, getNextPlayerIndex } from './services/gameLogic';

interface Store extends GameState {
  // Actions
  createLobby: (playerName: string) => void;
  joinLobby: (roomId: string, playerName: string) => void;
  startGame: () => void;
  playCard: (playerId: string, cardId: string) => void;
  drawCard: (playerId: string) => void;
  setColor: (color: CardColor) => void;
  resetGame: () => void;
  
  // Helper for bot moves
  processBotTurn: () => void;
}

const INITIAL_STATE: Omit<Store, 'createLobby' | 'joinLobby' | 'startGame' | 'playCard' | 'drawCard' | 'setColor' | 'resetGame' | 'processBotTurn'> = {
  roomId: null,
  status: GameStatus.LOBBY,
  players: [],
  currentPlayerIndex: 0,
  direction: 1,
  discardPile: [],
  drawPileCount: 0, // In a real app, the draw pile is hidden on server
  currentColor: 'red',
  winner: null,
  waitingForColorSelection: false,
};

// Hidden server state simulation
let serverDeck: Card[] = [];

export const useGameStore = create<Store>((set, get) => ({
  ...INITIAL_STATE,

  createLobby: (playerName) => {
    const host: Player = { id: 'p1', name: playerName, isBot: false, cardCount: 0, hand: [] };
    // Simulate bots for demo
    const bots: Player[] = [
      { id: 'b1', name: 'Bot Alice', isBot: true, cardCount: 0, hand: [] },
      { id: 'b2', name: 'Bot Bob', isBot: true, cardCount: 0, hand: [] },
      { id: 'b3', name: 'Bot Charlie', isBot: true, cardCount: 0, hand: [] },
    ];
    set({ 
      roomId: Math.random().toString(36).substring(7).toUpperCase(), 
      players: [host, ...bots],
      status: GameStatus.LOBBY 
    });
  },

  joinLobby: (roomId, playerName) => {
    // In this offline demo, joining just creates a new game basically
    get().createLobby(playerName);
  },

  startGame: () => {
    serverDeck = createDeck();
    const players = [...get().players];
    
    // Deal 7 cards to each
    players.forEach(p => {
      p.hand = serverDeck.splice(0, 7);
      p.cardCount = 7;
    });

    // Flip first card
    let firstCard = serverDeck.shift()!;
    while(firstCard.color === 'black') {
        serverDeck.push(firstCard); // Put back wild
        firstCard = serverDeck.shift()!; // Try again
    }

    set({
      status: GameStatus.PLAYING,
      players,
      discardPile: [firstCard],
      currentColor: firstCard.color,
      drawPileCount: serverDeck.length,
      currentPlayerIndex: 0,
      direction: 1,
    });
  },

  playCard: (playerId, cardId) => {
    const { players, currentPlayerIndex, discardPile, direction, currentColor, waitingForColorSelection } = get();
    
    // Validation
    if (waitingForColorSelection) return;
    if (players[currentPlayerIndex].id !== playerId) return;

    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const card = player.hand[cardIndex];
    const topCard = discardPile[discardPile.length - 1];

    if (!isValidMove(card, topCard, currentColor)) return;

    // Execute Move
    const newHand = [...player.hand];
    newHand.splice(cardIndex, 1);
    const newDiscard = [...discardPile, card];
    
    const newPlayers = players.map(p => 
      p.id === playerId ? { ...p, hand: newHand, cardCount: newHand.length } : p
    );

    // Check Win
    if (newHand.length === 0) {
      set({ winner: player, status: GameStatus.GAME_OVER, players: newPlayers, discardPile: newDiscard });
      return;
    }

    // Effect Logic
    let nextIndex = getNextPlayerIndex(currentPlayerIndex, players.length, direction);
    let newDirection = direction;
    let shouldSkip = false;
    let cardsToDraw = 0;
    let waitForColor = false;
    let nextColor = card.color;

    if (card.color === 'black') {
      waitForColor = true;
      // If bot played it, randomly pick color immediately
      if (player.isBot) {
        const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
        nextColor = colors[Math.floor(Math.random() * 4)];
        waitForColor = false;
      }
    }

    if (card.value === 'skip') {
      shouldSkip = true;
    } else if (card.value === 'reverse') {
        if (players.length === 2) {
            shouldSkip = true; // Reverse acts like skip in 2 player
        } else {
            newDirection = direction * -1 as 1 | -1;
            // Re-calculate next index based on new direction
            nextIndex = getNextPlayerIndex(currentPlayerIndex, players.length, newDirection);
        }
    } else if (card.value === 'draw2') {
      cardsToDraw = 2;
    } else if (card.value === 'wild4') {
      cardsToDraw = 4;
    }

    // Update State
    set({
      players: newPlayers,
      discardPile: newDiscard,
      currentColor: waitForColor ? 'black' : nextColor, // Temp black if waiting
      direction: newDirection,
      waitingForColorSelection: waitForColor && !player.isBot,
      currentPlayerIndex: waitForColor ? currentPlayerIndex : nextIndex 
    });

    if (!waitForColor) {
      // Handle draw cards for the NEXT player
      if (cardsToDraw > 0) {
        const victimIndex = nextIndex;
        const victim = newPlayers[victimIndex];
        const drawn = [];
        for(let i=0; i<cardsToDraw; i++) {
           if(serverDeck.length === 0) {
             // Reshuffle discard if empty (excluding top card)
             const top = newDiscard.pop()!;
             serverDeck = [...newDiscard]; // Simplify shuffle for demo
             newDiscard.length = 0;
             newDiscard.push(top);
           }
           if (serverDeck.length > 0) drawn.push(serverDeck.shift()!);
        }
        
        const updatedVictim = { ...victim, hand: [...victim.hand, ...drawn], cardCount: victim.cardCount + drawn.length };
        newPlayers[victimIndex] = updatedVictim;
        
        set({ 
            players: newPlayers, 
            drawPileCount: serverDeck.length,
            // Skip the victim's turn if they drew cards (Standard rules vary, usually Draw2 skips turn)
            currentPlayerIndex: getNextPlayerIndex(nextIndex, players.length, newDirection) 
        });
      } else if (shouldSkip) {
         set({ currentPlayerIndex: getNextPlayerIndex(nextIndex, players.length, newDirection) });
      }
    }

    // Trigger Bot if next
    setTimeout(() => get().processBotTurn(), 1000);
  },

  setColor: (color) => {
     const { currentPlayerIndex, players, direction } = get();
     let nextIndex = getNextPlayerIndex(currentPlayerIndex, players.length, direction);
     
     // Check if the card played was a +4, if so, next player draws
     const topCard = get().discardPile[get().discardPile.length - 1];
     if (topCard.value === 'wild4') {
        // ... (Simplified: We just skip turn logic here to keep file size managed, real draw logic is complex with challenges)
        // For this demo: Deal 4 cards to next player and skip them
        const victim = players[nextIndex];
         const drawn = [];
        for(let i=0; i<4; i++) {
            if (serverDeck.length > 0) drawn.push(serverDeck.shift()!);
        }
        const newPlayers = [...players];
        newPlayers[nextIndex] = { ...victim, hand: [...victim.hand, ...drawn], cardCount: victim.cardCount + 4 };
        set({ players: newPlayers, drawPileCount: serverDeck.length });
        nextIndex = getNextPlayerIndex(nextIndex, players.length, direction);
     }

     set({ currentColor: color, waitingForColorSelection: false, currentPlayerIndex: nextIndex });
     setTimeout(() => get().processBotTurn(), 1000);
  },

  drawCard: (playerId) => {
    const { players, currentPlayerIndex, direction, currentColor } = get();
    if (players[currentPlayerIndex].id !== playerId) return;

    if (serverDeck.length === 0) {
         // Reshuffle logic mock
         serverDeck = createDeck(); 
    }
    
    const card = serverDeck.shift();
    if (!card) return;

    const player = players[currentPlayerIndex];
    const newHand = [...player.hand, card];
    const newPlayers = players.map(p => p.id === playerId ? { ...p, hand: newHand, cardCount: newHand.length } : p);

    set({ players: newPlayers, drawPileCount: serverDeck.length });

    // If playable, AI plays it, Human can choose. 
    // For simplicity, we pass turn unless it's immediately playable (simplified House Rule)
    if (!isValidMove(card, get().discardPile[get().discardPile.length-1], currentColor)) {
       set({ currentPlayerIndex: getNextPlayerIndex(currentPlayerIndex, players.length, direction) });
       setTimeout(() => get().processBotTurn(), 1000);
    } else {
        // If it's a bot, play it immediately
        if (player.isBot) {
             setTimeout(() => get().playCard(player.id, card.id), 500);
        }
    }
  },

  processBotTurn: () => {
    const { status, players, currentPlayerIndex, currentColor, discardPile } = get();
    if (status !== GameStatus.PLAYING) return;
    
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer.isBot) return;

    const topCard = discardPile[discardPile.length - 1];
    
    // Simple AI: Find first valid card
    const validCard = currentPlayer.hand.find(c => isValidMove(c, topCard, currentColor));

    if (validCard) {
      get().playCard(currentPlayer.id, validCard.id);
    } else {
      get().drawCard(currentPlayer.id);
    }
  },

  resetGame: () => set(INITIAL_STATE)
}));