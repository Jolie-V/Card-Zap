
import { CardColor } from './types';

export const CARD_COLORS: Record<CardColor, { bg: string; text: string; ring: string }> = {
  [CardColor.Pink]: { bg: 'bg-pink-500', text: 'text-white', ring: 'ring-pink-400' },
  [CardColor.Blue]: { bg: 'bg-blue-500', text: 'text-white', ring: 'ring-blue-400' },
  [CardColor.Red]: { bg: 'bg-red-500', text: 'text-white', ring: 'ring-red-400' },
  [CardColor.Yellow]: { bg: 'bg-yellow-400', text: 'text-gray-800', ring: 'ring-yellow-300' },
  [CardColor.Green]: { bg: 'bg-green-500', text: 'text-white', ring: 'ring-green-400' },
  [CardColor.Gray]: { bg: 'bg-gray-500', text: 'text-white', ring: 'ring-gray-400' },
  [CardColor.Orange]: { bg: 'bg-orange-500', text: 'text-white', ring: 'ring-orange-400' },
  [CardColor.Purple]: { bg: 'bg-purple-500', text: 'text-white', ring: 'ring-purple-400' },
};
