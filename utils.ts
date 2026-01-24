
import { Round, Player } from './types';

export const SPECIAL_NUMBERS = [444, 333, 222, 111, 99, 88, 77, 66, 55, 44, 33];

export function calculateAverageDistance(playerId: string, rounds: Round[]): number {
  if (rounds.length === 0) return 0;
  
  const distances = rounds
    .map(r => {
      const weight = r.results[playerId];
      return weight !== undefined ? Math.abs(weight - r.targetWeight) : null;
    })
    .filter((d): d is number => d !== null);
    
  if (distances.length === 0) return 0;
  return distances.reduce((a, b) => a + b, 0) / distances.length;
}

export function getRoundSummary(round: Round, players: Player[]): {
  furthestPlayer: string;
  specialHits: { playerName: string; value: number }[];
  duplicates: number[];
} {
  let maxDist = -1;
  let furthestPlayerId = '';
  const specialHits: { playerName: string; value: number }[] = [];
  const weightCounts: Record<number, number> = {};

  players.forEach(p => {
    const weight = round.results[p.id];
    const dist = Math.abs(weight - round.targetWeight);
    if (dist > maxDist) {
      maxDist = dist;
      furthestPlayerId = p.name;
    }
    
    if (SPECIAL_NUMBERS.includes(weight)) {
      specialHits.push({ playerName: p.name, value: weight });
    }
    
    weightCounts[weight] = (weightCounts[weight] || 0) + 1;
  });

  const duplicates = Object.entries(weightCounts)
    .filter(([_, count]) => count > 1)
    .map(([weight, _]) => parseInt(weight));

  return {
    furthestPlayer: furthestPlayerId,
    specialHits,
    duplicates
  };
}

export function getTargetRange(previousWeights: number[]): { min: number; max: number } {
  if (previousWeights.length === 0) return { min: 0, max: 0 };
  const minW = Math.min(...previousWeights);
  const maxW = Math.max(...previousWeights);
  
  // Requirement: maximal 100 unter dem höchsten, minimal 10 unter dem niedrigsten
  // This defines a band: [Highest - 100, Lowest - 10]
  return {
    min: maxW - 100,
    max: minW - 10
  };
}
