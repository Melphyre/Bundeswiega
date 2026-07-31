
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
  
  const upperBound = Math.max(0, minW - 10);
  let lowerBound = Math.max(0, maxW - 100);

  if (lowerBound > upperBound) {
    lowerBound = upperBound;
  }

  return {
    min: lowerBound,
    max: upperBound
  };
}

export function checkTournamentAchievements(
  tournamentData: {
    config?: any;
    tables?: any[];
    results: Array<{ tableId: string; playerName: string; rank: number; avg: number; schnaepse: number }>;
  }
): Array<{ id: string; earnedBy: string[] }> {
  const { results = [] } = tournamentData;
  const earned: Array<{ id: string; earnedBy: string[] }> = [];

  const addAchievement = (id: string, playerNames: string[]) => {
    if (playerNames.length === 0) return;
    earned.push({ id, earnedBy: Array.from(new Set(playerNames)) });
  };

  const finalResults = results.filter(r => r.tableId === 'table_final').sort((a, b) => a.rank - b.rank);
  const secondChanceResults = results.filter(r => r.tableId === 'table_second_chance').sort((a, b) => a.rank - b.rank);
  const vorrundeResults = results.filter(r => r.tableId !== 'table_final' && r.tableId !== 'table_second_chance');

  // Group by player
  const playerMap: Record<string, typeof results> = {};
  results.forEach(r => {
    if (!playerMap[r.playerName]) playerMap[r.playerName] = [];
    playerMap[r.playerName].push(r);
  });

  // Group by table
  const tableMap: Record<string, typeof results> = {};
  results.forEach(r => {
    if (!tableMap[r.tableId]) tableMap[r.tableId] = [];
    tableMap[r.tableId].push(r);
  });

  // 1. Goldwaage (Platz 1 im Finale)
  if (finalResults.length >= 1 && finalResults[0].rank === 1) {
    addAchievement('tournament_gold', [finalResults[0].playerName]);
  }

  // 2. Silberwaage (Platz 2 im Finale)
  const silverPlayer = finalResults.find(r => r.rank === 2);
  if (silverPlayer) {
    addAchievement('tournament_silver', [silverPlayer.playerName]);
  }

  // 3. Bronzewaage (Platz 3 im Finale)
  const bronzePlayer = finalResults.find(r => r.rank === 3);
  if (bronzePlayer) {
    addAchievement('tournament_bronze', [bronzePlayer.playerName]);
  }

  // 4. Second Chance Finalist (Über Second Chance ins Finale)
  const scPlayerNames = secondChanceResults.map(r => r.playerName);
  const finalPlayerNames = finalResults.map(r => r.playerName);
  const scFinalists = scPlayerNames.filter(p => finalPlayerNames.includes(p));
  addAchievement('tournament_second_chance_finalist', scFinalists);

  // 5. Second Chance Winner (Aus Second Chance und Turnier gewonnen)
  if (finalResults.length >= 1 && finalResults[0].rank === 1) {
    const winnerName = finalResults[0].playerName;
    if (scPlayerNames.includes(winnerName)) {
      addAchievement('tournament_second_chance_winner', [winnerName]);
    }
  }

  // Aggregate player stats across all tournament tables
  const playerList = Object.keys(playerMap);
  const playerStats: Record<string, { totalSchnaepse: number; totalAvg: number; tablesCount: number }> = {};
  playerList.forEach(p => {
    const pResList = playerMap[p];
    const totalSchnaepse = pResList.reduce((sum, r) => sum + r.schnaepse, 0);
    const totalAvg = pResList.reduce((sum, r) => sum + r.avg, 0);
    playerStats[p] = { totalSchnaepse, totalAvg, tablesCount: pResList.length };
  });

  if (playerList.length > 0) {
    // 6. Die meisten Schnäpse im gesamten Turnier
    const maxSchnaepse = Math.max(...playerList.map(p => playerStats[p].totalSchnaepse));
    if (maxSchnaepse > 0) {
      const mostSchnaepsePlayers = playerList.filter(p => playerStats[p].totalSchnaepse === maxSchnaepse);
      addAchievement('tournament_most_schnaepse', mostSchnaepsePlayers);
      addAchievement('tournament_schnapskoenig', mostSchnaepsePlayers);
    }

    // 7. Kleinsten Durchschnitt über alle Tische
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

  // 9. Final-Favorit (niedrigster Gesamtscore Avg + Schnaepse in allen Vorrundentischen)
  if (vorrundeResults.length > 0) {
    const minVorrundeScore = Math.min(...vorrundeResults.map(r => r.avg + r.schnaepse));
    const tischKoenigPlayers = vorrundeResults
      .filter(r => (r.avg + r.schnaepse) === minVorrundeScore)
      .map(r => r.playerName);
    addAchievement('tournament_tischkoenig', tischKoenigPlayers);
  }

  // 10. Sauber geblieben (0 Schnäpse im gesamten Turnier)
  const sauberPlayers = playerList.filter(p => {
    const hasFinal = finalResults.some(r => r.playerName === p);
    return hasFinal && playerStats[p].totalSchnaepse === 0;
  });
  addAchievement('tournament_sauber', sauberPlayers);

  // 11. Eiserner Wille (Aus Second Chance ins Finale & Platz 1-3)
  const eisernerWillePlayers = finalResults
    .filter(r => r.rank <= 3 && scPlayerNames.includes(r.playerName))
    .map(r => r.playerName);
  addAchievement('tournament_eiserner_wille', eisernerWillePlayers);

  // 12. Durchstarter (Ø Abstand im Finale besser als in der Vorrunde)
  const durchstarterPlayers: string[] = [];
  finalResults.forEach(fRes => {
    const vRes = vorrundeResults.find(r => r.playerName === fRes.playerName);
    if (vRes && fRes.avg < vRes.avg) {
      durchstarterPlayers.push(fRes.playerName);
    }
  });
  addAchievement('tournament_durchstarter', durchstarterPlayers);

  // 13. Konstanz-Monster (In allen gespielten Tischen Ø Abstand < 15.0g)
  const konstanzPlayers = playerList.filter(p => {
    const hasFinal = finalResults.some(r => r.playerName === p);
    return hasFinal && playerMap[p].every(r => r.avg < 15.0);
  });
  addAchievement('tournament_konstanz', konstanzPlayers);

  // 14. Streber (Vorrunde Platz 1 UND Finale Platz 1)
  const streberPlayers = finalResults
    .filter(fRes => fRes.rank === 1)
    .filter(fRes => {
      const vRes = vorrundeResults.find(r => r.playerName === fRes.playerName);
      return vRes && vRes.rank === 1;
    })
    .map(r => r.playerName);
  addAchievement('tournament_streber', streberPlayers);

  // 15. Tisch-Dominator (Vorrundentisch mit ≥ 10g Vorsprung auf Platz 2 gewonnen)
  const dominatorPlayers: string[] = [];
  Object.values(tableMap).forEach(tResults => {
    const isVorrunde = tResults.some(r => r.tableId !== 'table_final' && r.tableId !== 'table_second_chance');
    if (isVorrunde && tResults.length >= 2) {
      const sortedByScore = [...tResults].sort((a, b) => (a.avg + a.schnaepse) - (b.avg + b.schnaepse));
      const rank1 = sortedByScore[0];
      const rank2 = sortedByScore[1];
      const lead = (rank2.avg + rank2.schnaepse) - (rank1.avg + rank1.schnaepse);
      if (lead >= 10.0) {
        dominatorPlayers.push(rank1.playerName);
      }
    }
  });
  addAchievement('tournament_dominator', dominatorPlayers);

  // 16. Marathon-Mann (Vorrunde, Second Chance UND Finale gespielt)
  const marathonPlayers = playerList.filter(p => {
    const hasVorrunde = vorrundeResults.some(r => r.playerName === p);
    const hasSecondChance = secondChanceResults.some(r => r.playerName === p);
    const hasFinal = finalResults.some(r => r.playerName === p);
    return hasVorrunde && hasSecondChance && hasFinal;
  });
  addAchievement('tournament_marathon', marathonPlayers);

  // 17. Pechvogel des Turniers (Bester Ø Abstand im Finale, aber nicht Platz 1 im Finale)
  if (finalResults.length > 0) {
    const minFinalAvg = Math.min(...finalResults.map(r => r.avg));
    const pechvogelPlayers = finalResults
      .filter(r => r.avg === minFinalAvg && r.rank !== 1)
      .map(r => r.playerName);
    addAchievement('tournament_pechvogel', pechvogelPlayers);
  }

  // 18. Stehaufmännchen (In Vorrunde Letzter an seinem Tisch, aber im Finale nicht Letzter)
  if (finalResults.length > 0) {
    const maxFinalRank = Math.max(...finalResults.map(r => r.rank));
    const stehaufPlayers: string[] = [];
    finalResults.forEach(fRes => {
      if (fRes.rank < maxFinalRank) {
        const vRes = vorrundeResults.find(r => r.playerName === fRes.playerName);
        if (vRes) {
          const vTableResults = tableMap[vRes.tableId] || [];
          const maxVRank = Math.max(...vTableResults.map(r => r.rank));
          if (vRes.rank === maxVRank && maxVRank > 1) {
            stehaufPlayers.push(fRes.playerName);
          }
        }
      }
    });
    addAchievement('tournament_stehauf', stehaufPlayers);
  }

  // 19. Der Minimalist (Im Finale exakt Platz 4)
  const minimalistPlayer = finalResults.find(r => r.rank === 4);
  if (minimalistPlayer) {
    addAchievement('tournament_minimalist', [minimalistPlayer.playerName]);
  }

  return earned;
}
