import type { AchievementType } from './types.js';

export interface AchievementMetadata {
  type: AchievementType;
  name: string;
  description: string;
  category: 'combat' | 'collection' | 'milestone' | 'special';
  rarity?: number; // percentage 0-100
}

export const ACHIEVEMENT_METADATA: Record<AchievementType, AchievementMetadata> = {
  FIRST_MATCH: {
    type: 'FIRST_MATCH',
    name: 'First of Many',
    description: 'Complete your first match of Phalanx Duel.',
    category: 'milestone',
  },
  FIRST_WIN: {
    type: 'FIRST_WIN',
    name: 'Victorious Debut',
    description: 'Secure your first victory against a human or bot opponent.',
    category: 'milestone',
  },
  TEN_WINS: {
    type: 'TEN_WINS',
    name: 'Rising Star',
    description: 'Win 10 matches in any game mode.',
    category: 'milestone',
  },
  FIFTY_WINS: {
    type: 'FIFTY_WINS',
    name: 'Veteran Duelist',
    description: 'Win 50 matches in any game mode.',
    category: 'milestone',
  },
  HUNDRED_WINS: {
    type: 'HUNDRED_WINS',
    name: 'Phalanx Master',
    description: 'Win 100 matches in any game mode.',
    category: 'milestone',
  },
  ACE_SLAYER: {
    type: 'ACE_SLAYER',
    name: 'The Higher They Fall',
    description: 'Destroy an opponent\'s Ace card in combat.',
    category: 'combat',
  },
  CLEAN_SWEEP: {
    type: 'CLEAN_SWEEP',
    name: 'Total Dominance',
    description: 'Win a match without losing a single card from your battlefield.',
    category: 'combat',
  },
  FULL_HOUSE: {
    type: 'FULL_HOUSE',
    name: 'Full House',
    description: 'Have 3 cards of one face and 2 of another on your battlefield at the end of a match.',
    category: 'collection',
  },
  ROYAL_GUARD: {
    type: 'ROYAL_GUARD',
    name: 'Palace Guard',
    description: 'Defend your back rank with three Face cards (J, Q, K) simultaneously.',
    category: 'combat',
  },
  DOUBLE_DOWN: {
    type: 'DOUBLE_DOWN',
    name: 'Risky Business',
    description: 'Win a match after being reduced to exactly 1 Life Point.',
    category: 'special',
  },
  LAST_STAND: {
    type: 'LAST_STAND',
    name: 'The Final Frontier',
    description: 'Win a match on the final turn of a competitive game.',
    category: 'milestone',
  },
  IRON_WALL: {
    type: 'IRON_WALL',
    name: 'Indomitable',
    description: 'Successfully defend against 3 consecutive attacks without taking any Life Point damage.',
    category: 'combat',
  },
  HIGH_CARD: {
    type: 'HIGH_CARD',
    name: 'High Stakes',
    description: 'Win a match using a deck or final battlefield containing only high-value cards (10, J, Q, K, A).',
    category: 'special',
  },
  COMEBACK_KID: {
    type: 'COMEBACK_KID',
    name: 'Against the Odds',
    description: 'Win a match after trailing your opponent by 10 or more Life Points.',
    category: 'milestone',
  },
  OPENING_GAMBIT: {
    type: 'OPENING_GAMBIT',
    name: 'Fast Starter',
    description: 'Deal Life Point damage to your opponent in each of the first 3 turns.',
    category: 'combat',
  },
  DEUCE_COUP: {
    type: 'DEUCE_COUP',
    name: 'Two for One',
    description: 'Destroy two rank-2 cards in a single attack\'s combat steps.',
    category: 'combat',
  },
  TRIPLE_THREAT: {
    type: 'TRIPLE_THREAT',
    name: 'Three of a Kind',
    description: 'Deploy three cards of the same face value in consecutive own-turn deploys.',
    category: 'collection',
  },
  DEAD_MANS_HAND: {
    type: 'DEAD_MANS_HAND',
    name: 'Dead Man\'s Hand',
    description: 'Have both Aces and Eights in your back rank at the end of a match.',
    category: 'collection',
  },
  FLAWLESS_VICTORY: {
    type: 'FLAWLESS_VICTORY',
    name: 'Perfect Game',
    description: 'Win the match without losing a single Life Point.',
    category: 'special',
  },
  BLITZKRIEG: {
    type: 'BLITZKRIEG',
    name: 'Lightning Strike',
    description: 'Achieve victory in 8 turns or less.',
    category: 'milestone',
  },
  OVERKILL: {
    type: 'OVERKILL',
    name: 'Total Annihilation',
    description: 'Deliver a final blow that exceeds the opponent\'s remaining life points by 5 or more.',
    category: 'combat',
  },
};
