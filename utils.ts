
import { Round, Player } from './types';

export const SPECIAL_NUMBERS = [555, 444, 333, 222, 111, 99, 88, 77, 66, 55, 44, 33, 22, 11];

export const TOGETHER_ACHIEVEMENT_IDS = [
  'twins',          // Zwillinge
  'doppelganger',   // Doppelgänger
  'mirror_number',  // Spiegelzahl
  'shadow',         // Schatten
  'equilibrium',    // Gleichgewicht
  'team_traumteam',
  'team_perfekt',
  'team_ausgleich',
  'team_synchron',
  'team_rueckendeckung',
  'team_taktiker',
  'team_underdog',
  'team_champions',
  'team_nerven',
  'team_schnapps',
  'team_spiegel',
  'team_gleichstand',
  'team_unschlagbar',
  'team_pechvoegel'
];

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

export function checkTournamentAchievements(
  tournamentData: {
    config: any;
    tables: any[];
    results: Array<{ tableId: string; playerName: string; rank: number; avg: number; schnaepse: number }>;
  }
): Array<{ id: string; earnedBy: string[] }> {
  const { tables, results } = tournamentData;
  const earned: Array<{ id: string; earnedBy: string[] }> = [];

  const finalResults = results.filter(r => r.tableId === 'table_final').sort((a, b) => a.rank - b.rank);
  const secondChanceResults = results.filter(r => r.tableId === 'table_second_chance');

  const addAchievement = (id: string, playerNames: string[]) => {
    if (playerNames.length === 0) return;
    earned.push({ id, earnedBy: Array.from(new Set(playerNames)) });
  };

  // 1. Goldwaage (Platz 1 im Finale)
  if (finalResults.length >= 1 && finalResults[0].rank === 1) {
    addAchievement('tournament_gold', [finalResults[0].playerName]);
  }

  // 2. Silberwaage (Platz 2 im Finale)
  if (finalResults.length >= 2 && finalResults[1].rank === 2) {
    addAchievement('tournament_silver', [finalResults[1].playerName]);
  }

  // 3. Bronzewaage (Platz 3 im Finale)
  if (finalResults.length >= 3 && finalResults[2].rank === 3) {
    addAchievement('tournament_bronze', [finalResults[2].playerName]);
  }

  // 4. Second Chance Finalist
  const scPlayerNames = secondChanceResults.map(r => r.playerName);
  const finalPlayerNames = finalResults.map(r => r.playerName);
  const scFinalists = scPlayerNames.filter(p => finalPlayerNames.includes(p));
  addAchievement('tournament_second_chance_finalist', scFinalists);

  // 5. Second Chance Winner
  if (finalResults.length >= 1 && finalResults[0].rank === 1) {
    const winnerName = finalResults[0].playerName;
    if (scPlayerNames.includes(winnerName)) {
      addAchievement('tournament_second_chance_winner', [winnerName]);
    }
  }

  // Aggregate player stats across all tournament tables
  const playerStats: Record<string, { totalSchnaepse: number; totalAvg: number; tablesCount: number }> = {};
  results.forEach(r => {
    if (!playerStats[r.playerName]) {
      playerStats[r.playerName] = { totalSchnaepse: 0, totalAvg: 0, tablesCount: 0 };
    }
    playerStats[r.playerName].totalSchnaepse += r.schnaepse;
    playerStats[r.playerName].totalAvg += r.avg;
    playerStats[r.playerName].tablesCount += 1;
  });

  const playerList = Object.keys(playerStats);
  if (playerList.length > 0) {
    // 6. Most Schnäpse in Tournament
    const maxSchnaepse = Math.max(...playerList.map(p => playerStats[p].totalSchnaepse));
    if (maxSchnaepse > 0) {
      const mostSchnaepsePlayers = playerList.filter(p => playerStats[p].totalSchnaepse === maxSchnaepse);
      addAchievement('tournament_most_schnaepse', mostSchnaepsePlayers);
    }

    // 7. Smallest Average in Tournament
    const minAvg = Math.min(...playerList.map(p => playerStats[p].totalAvg / playerStats[p].tablesCount));
    const bestAvgPlayers = playerList.filter(p => (playerStats[p].totalAvg / playerStats[p].tablesCount) === minAvg);
    addAchievement('tournament_best_avg', bestAvgPlayers);

    // 8. Bester Durchschnitt aber schlechter als Platz 4 im Finale
    bestAvgPlayers.forEach(p => {
      const fRes = finalResults.find(r => r.playerName === p);
      if (fRes && fRes.rank > 3) {
        addAchievement('tournament_avg_better_than_rank', [p]);
      }
    });
  }

  return earned;
}
