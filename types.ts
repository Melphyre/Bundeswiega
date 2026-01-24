
export interface Player {
  id: string;
  name: string;
  startWeight: number;
}

export interface Round {
  targetWeight: number;
  results: Record<string, number>; // playerId -> weight in grams
}

export enum GameState {
  START = 'START',
  PLAYER_COUNT = 'PLAYER_COUNT',
  PLAYER_NAMES = 'PLAYER_NAMES',
  START_WEIGHTS = 'START_WEIGHTS',
  GAMEPLAY = 'GAMEPLAY'
}

export interface RoundSummary {
  furthestPlayer: string;
  specialNumbers: { playerName: string; number: number }[];
  duplicateWeights: number[];
}
