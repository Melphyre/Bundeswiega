
export interface Player {
  id: string;
  name: string;
  startWeight: number;
  schnaepse: number;
  isDisqualified?: boolean;
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
