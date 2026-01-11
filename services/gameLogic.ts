import { v4 as uuidv4 } from 'uuid';
import { Card, CardColor, CardValue } from '../types';
import { COLORS } from '../constants';

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  
  COLORS.forEach(color => {
    // 0 appears once
    deck.push({ id: uuidv4(), color, value: '0' });
    
    // 1-9, skip, reverse, draw2 appear twice
    const values: CardValue[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];
    values.forEach(value => {
      deck.push({ id: uuidv4(), color, value });
      deck.push({ id: uuidv4(), color, value });
    });
  });

  // Wild and Wild Draw 4 appear 4 times
  for (let i = 0; i < 4; i++) {
    deck.push({ id: uuidv4(), color: 'black', value: 'wild' });
    deck.push({ id: uuidv4(), color: 'black', value: 'wild4' });
  }

  return shuffleDeck(deck);
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

export const isValidMove = (card: Card, topCard: Card, activeColor: CardColor): boolean => {
  // Wild cards are always playable
  if (card.color === 'black') return true;

  // Match color (use activeColor because topCard might be black)
  if (card.color === activeColor) return true;

  // Match value (e.g., 5 on 5)
  if (card.value === topCard.value) return true;

  return false;
};

export const getNextPlayerIndex = (currentIndex: number, totalPlayers: number, direction: 1 | -1): number => {
  let nextIndex = (currentIndex + direction) % totalPlayers;
  if (nextIndex < 0) nextIndex += totalPlayers;
  return nextIndex;
};