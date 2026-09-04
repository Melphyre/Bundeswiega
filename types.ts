
export interface Player {
  id: string;
  name: string;
  startWeight: number;
  schnaepse: number;
  isDisqualified?: boolean;
}

export const GAME_MODES = [
  'Standardspiel (500ml)',
  'Standardspiel (0,33L)',
  'Speedwiegen (500ml)',
  'Speedwiegen (0,33L)'
] as const;

export type GameMode = typeof GAME_MODES[number];

export interface GameResult {
  id?: string;
  user_id: string;
  game_mode: string;
  date?: string;
  avg: number;
  schnaepse?: number;
  total?: number;
  levels?: number;
  time_seconds?: number;
  team_name?: string;
  created_at?: string;
}

export interface Friendship {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at?: string;
}

export interface FriendshipProfileJoin {
  id: string;
  username: string;
  avatar_url?: string | null;
}

export interface FriendshipJoined {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  requester?: FriendshipProfileJoin | FriendshipProfileJoin[] | null;
  receiver?: FriendshipProfileJoin | FriendshipProfileJoin[] | null;
}

export interface Friend {
  id: string;
  name: string;
  imageUrl?: string;
  friendshipId: string;
}

export interface PendingFriendRequest {
  id: string;
  requesterId: string;
  requesterName: string;
}

export interface RecordItem {
  id?: string;
  user_id?: string;
  game_mode: string;
  gameMode?: string;
  playerName: string;
  date: string;
  avg: number;
  schnaepse: number;
  total?: number;
  levels?: number;
  time_seconds?: number;
  team_name?: string;
  created_at?: string;
  achievements?: Array<{
    id: string;
    title: string;
    icon: string;
    rarity: string;
    earnedBy?: string[];
    earnedTogether?: boolean;
  }>;
}

export interface Achievement {
  id: string;          // z.B. "sharpshooter"
  title: string;       // z.B. "Scharfschütze"
  description: string; // z.B. "3x hintereinander unter 5g Abstand"
  icon: string;        // Emoji oder FontAwesome-Klasse
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedBy: string[];  // Spielernamen die es bekommen haben
  earnedTogether?: boolean; // true wenn als Gruppe/Zusammenspiel erlangt
}

export interface ParsedRecord {
  game_mode: string;
  gameMode: string;
  playerName: string;
  date: string;
  avg: number;
  schnaepse: number;
  levels?: number;
  time_seconds?: number;
  total?: number;
  achievements?: Array<{
    id: string;
    title: string;
    icon: string;
    rarity: string;
    earnedBy: string[];
    earnedTogether?: boolean;
  }>;
}

export interface Team {
  id: string;
  name: string;
  playerIds: string[];
  points: number;
}

export interface Round {
  targetWeight: number;
  individualTargets?: Record<string, number>; // For the final round (estimated empty weights)
  results: Record<string, number>; // playerId -> weight in grams
  isFinal?: boolean;
  announcingPlayerId?: string;
}

export enum GameState {
  START = 'START',
  PLAYER_COUNT = 'PLAYER_COUNT',
  PLAYER_NAMES = 'PLAYER_NAMES',
  START_WEIGHTS = 'START_WEIGHTS',
  ROUND_TARGET = 'ROUND_TARGET',
  GAMEPLAY = 'GAMEPLAY',
  FINAL_ROUND_TARGETS = 'FINAL_ROUND_TARGETS',
  FINAL_ROUND_RESULTS = 'FINAL_ROUND_RESULTS',
  RESULT_SCREEN = 'RESULT_SCREEN',
  // Added missing game states for Teamwiegen and Speedwiegen modes
  TEAM_SETUP = 'TEAM_SETUP',
  TEAM_NAMES = 'TEAM_NAMES',
  TEAM_START_WEIGHTS = 'TEAM_START_WEIGHTS',
  TEAM_ROUND_TARGET = 'TEAM_ROUND_TARGET',
  TEAM_GAMEPLAY = 'TEAM_GAMEPLAY',
  SPEED_SETUP = 'SPEED_SETUP',
  SPEED_CONFIG = 'SPEED_CONFIG',
  SPEED_COUNTDOWN = 'SPEED_COUNTDOWN',
  SPEED_GAMEPLAY = 'SPEED_GAMEPLAY',
  SPEED_RESULT = 'SPEED_RESULT'
}
