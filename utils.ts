
import { Round, Player } from './types';

export const SPECIAL_NUMBERS = [444, 333, 222, 111, 99, 88, 77, 66, 55, 44, 33];

export function calculateAverageDistance(playerId: string, rounds: Round[]): number {
  if (rounds.length === 0) return 0;
  
  const distances = rounds
    .map(r => {
      const weight = r.results[playerId];
      const target = (r.isFinal && r.individualTargets) ? r.individualTargets[playerId] : r.targetWeight;
      return weight !== undefined && target !== undefined ? Math.abs(weight - target) : null;
    })
    .filter((d): d is number => d !== null);
    
  if (distances.length === 0) return 0;
  return distances.reduce((a, b) => a + b, 0) / distances.length;
}

export function getRoundSummary(round: Round, players: Player[]): {
  furthestPlayers: string[];
  specialHits: { playerName: string; value: number }[];
  duplicates: { weight: number; playerNames: string[] }[];
  exactHits: string[];
  pointsToAward: string[];
  isFinal: boolean;
} {
  let maxDist = -1;
  let furthestPlayerIds: string[] = [];
  const specialHits: { playerName: string; value: number }[] = [];
  const weightGroups: Record<number, string[]> = {};
  const weightGroupsIds: Record<number, string[]> = {};
  const exactHits: string[] = [];
  const pointsToAwardSet = new Set<string>();

  players.forEach(p => {
    const weight = round.results[p.id];
    if (weight === undefined) return;

    const target = (round.isFinal && round.individualTargets) ? round.individualTargets[p.id] : round.targetWeight;
    const dist = Math.abs(weight - target);
    
    // Furthest players logic (Always applies)
    if (dist > maxDist) {
      maxDist = dist;
      furthestPlayerIds = [p.id];
    } else if (dist === maxDist && dist >= 0) {
      furthestPlayerIds.push(p.id);
    }

    // Exact hits (Now applies to ALL rounds including final)
    if (weight === target) {
      exactHits.push(p.name);
      pointsToAwardSet.add(p.id);
    }

    // Normal round bonuses only
    if (!round.isFinal) {
      // Special numbers (Schnapszahl)
      if (SPECIAL_NUMBERS.includes(weight)) {
        specialHits.push({ playerName: p.name, value: weight });
        pointsToAwardSet.add(p.id);
      }
      
      // Grouping for duplicates
      if (!weightGroups[weight]) {
        weightGroups[weight] = [];
        weightGroupsIds[weight] = [];
      }
      weightGroups[weight].push(p.name);
      weightGroupsIds[weight].push(p.id);
    }
  });

  // Award point for being furthest (Applies in ALL rounds)
  furthestPlayerIds.forEach(id => pointsToAwardSet.add(id));

  // Award points for duplicates (Normal rounds only)
  if (!round.isFinal) {
    Object.values(weightGroupsIds).forEach(ids => {
      if (ids.length > 1) {
        ids.forEach(id => pointsToAwardSet.add(id));
      }
    });
  }

  const duplicates = Object.entries(weightGroups)
    .filter(([_, names]) => names.length > 1)
    .map(([weight, names]) => ({
      weight: parseInt(weight),
      playerNames: names
    }));

  return {
    furthestPlayers: players.filter(p => furthestPlayerIds.includes(p.id)).map(p => p.name),
    specialHits,
    duplicates,
    exactHits,
    pointsToAward: Array.from(pointsToAwardSet),
    isFinal: !!round.isFinal
  };
}

export function getTargetRange(previousWeights: number[]): { min: number; max: number } {
  if (previousWeights.length === 0) return { min: 0, max: 0 };
  const minW = Math.min(...previousWeights);
  const maxW = Math.max(...previousWeights);
  
  return {
    min: Math.max(0, maxW - 100),
    max: Math.max(0, minW - 10)
  };
}
