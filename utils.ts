
import { Round, Player } from './types';

export const SPECIAL_NUMBERS = [555, 444, 333, 222, 111, 99, 88, 77, 66, 55, 44, 33, 22, 11];

export function calculateAverageDistance(playerId: string, rounds: Round[]): number {
  if (rounds.length === 0) return 0;
  
  const distances = rounds
    .filter(r => !r.isFinal)
    .map(r => {
      const weight = r.results[playerId];
      const target = r.targetWeight;
      return weight !== undefined && target !== undefined ? Math.abs(weight - target) : null;
    })
    .filter((d): d is number => d !== null);
    
  if (distances.length === 0) return 0;
  return distances.reduce((a, b) => a + b, 0) / distances.length;
}

export function getRoundSummary(round: Round, players: Player[], tournamentMode: boolean = true): {
  furthestPlayers: string[];
  specialHits: { playerName: string; value: number }[];
  duplicates: { weight: number; playerNames: string[] }[];
  exactHits: string[];
  pointsToAward: string[]; // This will now contain duplicate IDs if multiple points are awarded
  isFinal: boolean;
} {
  let maxDist = -1;
  let furthestPlayerIds: string[] = [];
  const specialHits: { playerName: string; value: number }[] = [];
  const weightGroups: Record<number, string[]> = {};
  const weightGroupsIds: Record<number, string[]> = {};
  const exactHits: string[] = [];
  const pointsToAward: string[] = [];

  const activePlayers = players.filter(p => !p.isDisqualified);

  activePlayers.forEach(p => {
    const weight = round.results[p.id];
    if (weight === undefined) return;

    const target = (round.isFinal && round.individualTargets) ? round.individualTargets[p.id] : round.targetWeight;
    const dist = Math.abs(weight - target!);
    
    if (dist > maxDist) {
      maxDist = dist;
      furthestPlayerIds = [p.id];
    } else if (dist === maxDist && dist >= 0) {
      furthestPlayerIds.push(p.id);
    }

    if (weight === target) {
      exactHits.push(p.name);
      pointsToAward.push(p.id);
    }

    // Special Numbers (Schnapszahlen)
    if (!round.isFinal && SPECIAL_NUMBERS.includes(weight)) {
      specialHits.push({ playerName: p.name, value: weight });
      pointsToAward.push(p.id);
    }
    
    if (!weightGroups[weight]) {
      weightGroups[weight] = [];
      weightGroupsIds[weight] = [];
    }
    weightGroups[weight].push(p.name);
    weightGroupsIds[weight].push(p.id);
  });

  if (!round.isFinal) {
    if (!tournamentMode || maxDist < 50) {
      furthestPlayerIds.forEach(id => pointsToAward.push(id));
    }

    // Weight Twins (Wiegezwillinge)
    Object.values(weightGroupsIds).forEach(ids => {
      if (ids.length > 1) {
        ids.forEach(id => pointsToAward.push(id));
      }
    });
  } else {
    // In final round, only furthest distance and exact hits are called out
    furthestPlayerIds.forEach(id => pointsToAward.push(id));
  }

  const duplicates = !round.isFinal 
    ? Object.entries(weightGroups)
        .filter(([_, names]) => names.length > 1)
        .map(([weight, names]) => ({
          weight: parseInt(weight),
          playerNames: names
        }))
    : [];

  return {
    furthestPlayers: players.filter(p => furthestPlayerIds.includes(p.id)).map(p => p.name),
    specialHits,
    duplicates,
    exactHits,
    pointsToAward,
    isFinal: !!round.isFinal
  };
}

export function getTargetRange(previousWeights: number[]): { min: number; max: number } {
  if (previousWeights.length === 0) return { min: 0, max: 0 };
  const minW = Math.min(...previousWeights);
  const maxW = Math.max(...previousWeights);
  
  // Rule: Target must be >= maxW - 100 and <= minW - 10
  return {
    min: Math.max(0, maxW - 100),
    max: Math.max(0, minW - 10)
  };
}
