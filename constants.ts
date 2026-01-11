import { CardColor } from './types';

export const COLORS: CardColor[] = ['red', 'blue', 'green', 'yellow'];
export const SPECIAL_COLORS: CardColor[] = ['black'];

export const CARD_WIDTH = 1.2;
export const CARD_HEIGHT = 1.8;
export const CARD_THICKNESS = 0.05;

// Color hex codes for 3D materials
export const COLOR_MAP: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  black: '#1f2937',
  white: '#ffffff',
};

export const getCardLabel = (value: string) => {
  switch (value) {
    case 'skip': return '⊘';
    case 'reverse': return '⇄';
    case 'draw2': return '+2';
    case 'wild': return 'W';
    case 'wild4': return '+4';
    default: return value;
  }
};