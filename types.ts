export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'black';
export type CardValue = 
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' 
  | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';

export interface Card {
  id: string;
  color: CardColor;
  value: CardValue;
  // Visual state
  isPlayable?: boolean;
}

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  cardCount: number;
  hand: Card[]; // Only populated for the local player in a real secure server env, but we store all for this demo
}

export enum GameStatus {
  LOBBY = 'LOBBY',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export interface GameState {
  roomId: string | null;
  status: GameStatus;
  players: Player[];
  currentPlayerIndex: number;
  direction: 1 | -1; // 1 for clockwise, -1 for counter-clockwise
  discardPile: Card[];
  drawPileCount: number;
  currentColor: CardColor; // Tracks active color (important for wild cards)
  winner: Player | null;
  waitingForColorSelection: boolean; // When a wild card is played
}