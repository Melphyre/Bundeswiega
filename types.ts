
export interface Player {
  id: string;
  name: string;
  startWeight: number;
  schnaepse: number;
}

export interface Round {
  targetWeight: number;
  individualTargets?: Record<string, number>; // For the final round
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
  RESULT_SCREEN = 'RESULT_SCREEN'
}
