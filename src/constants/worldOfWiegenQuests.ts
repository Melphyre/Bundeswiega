import { QuestDefinition, ActiveQuest, WorldOfWiegenPool } from '../types/worldOfWiegen';
import { Player, Round } from '../../types';

export const WORLD_OF_WIEGEN_QUESTS: QuestDefinition[] = [
  {
    id: 'better_than_x',
    name: 'Sei besser als Spieler X',
    shortTitle: 'Rivale schlagen',
    description: 'Erzielen in den nächsten Runden einen niedrigeren Durchschnittsfehler als dein ausgewählter Rivale.',
    epicLore: 'Die Ahnen des Tresens fordern ein Duell! Weise deinen Rivalen in seine Schranken.',
    category: 'precision',
    durationRounds: 3,
    pool: 'both',
    icon: '⚔️',
    difficulty: 'normal',
    requiresRankMin: 2,
    requiresMinPlayers: 2
  },
  {
    id: 'over_under_target',
    name: 'Über/Unter Zielgewicht',
    shortTitle: 'Einseitig wiegen',
    description: 'Lande 3 Runden in Folge konsequent auf derselben Seite des Zielgewichts (entweder immer drüber oder immer drunter).',
    epicLore: 'Der Wind der Einseitigkeit weht über deine Waage! Weiche 3 Runden nicht vom Kurs ab.',
    category: 'consistency',
    durationRounds: 3,
    pool: 'both',
    icon: '⚖️',
    difficulty: 'normal'
  },
  {
    id: 'opposite_to_x',
    name: 'Gegenläufig zu Spieler X',
    shortTitle: 'Gegenstrom',
    description: 'Wiege in 2 Runden in Folge immer entgegengesetzt zu deinem Partner (einer drüber, einer drunter).',
    epicLore: 'Wie Feuer und Eis, Hopfen und Malz – tretet in gegensätzlichen Sphären an!',
    category: 'social',
    durationRounds: 2,
    pool: 'both',
    icon: '🔄',
    difficulty: 'normal',
    requiresMinPlayers: 2
  },
  {
    id: 'parallel_to_x',
    name: 'Gleichläufig zu Spieler X',
    shortTitle: 'Gleichklang',
    description: 'Wiege in 2 Runden in Folge immer auf derselben Seite wie dein Verbündeter (beide drüber oder beide drunter).',
    epicLore: 'Verschmelzt eure Wiegegeister im Gleichklang der Dosenströme.',
    category: 'social',
    durationRounds: 2,
    pool: 'kreiswiega',
    icon: '👥',
    difficulty: 'normal',
    requiresMinPlayers: 2
  },
  {
    id: 'drop_lantern',
    name: 'Schlusslicht abgeben',
    shortTitle: 'Rote Laterne weg',
    description: 'Verlasse innerhalb der nächsten 3 Runden den letzten Platz der Tabelle.',
    epicLore: 'Schüttle die Fesseln des Kellerkinds ab und steige empor aus den Tiefen des Ranglisten-Tals!',
    category: 'comeback',
    durationRounds: 3,
    pool: 'kreiswiega',
    icon: '🏮',
    difficulty: 'normal',
    requiresTail: true,
    requiresMinPlayers: 3
  },
  {
    id: 'climb_rank',
    name: 'Platz im Post',
    shortTitle: 'Rang klettern',
    description: 'Verbessere deinen Rang in der Tabelle innerhalb der nächsten 3 Runden um mindestens einen Platz.',
    epicLore: 'Ein Krieger verweilt nicht im Mittelfeld! Klettere die Rangstufen hinauf.',
    category: 'comeback',
    durationRounds: 3,
    pool: 'championswieg',
    icon: '🧗',
    difficulty: 'hard',
    requiresRankMin: 2,
    requiresMinPlayers: 3
  },
  {
    id: 'defend_lead',
    name: 'Führung verteidigen',
    shortTitle: 'Krone behalten',
    description: 'Verteidige 3 Runden lang Platz 1 in der Rangliste ohne nachzulassen.',
    epicLore: 'Schwer wiegt die Krone des Wiegemeisters! Lass dir das Zepter nicht entreißen.',
    category: 'leader',
    durationRounds: 3,
    pool: 'championswieg',
    icon: '👑',
    difficulty: 'hard',
    requiresLeader: true,
    requiresMinPlayers: 2
  },
  {
    id: 'catch_leader',
    name: 'Spitze einholen',
    shortTitle: 'Jagd auf Platz 1',
    description: 'Verringere innerhalb von 3 Runden deinen Abstand zum Führenden um mindestens 3g.',
    epicLore: 'Blut geleckt! Verfolge die Fährte des Spitzenreiters und sitze ihm im Nacken.',
    category: 'comeback',
    durationRounds: 3,
    pool: 'championswieg',
    icon: '🎯',
    difficulty: 'hard',
    requiresRankMin: 2,
    requiresMinPlayers: 2
  },
  {
    id: 'no_schnaps',
    name: 'Schnapsfrei',
    shortTitle: 'Trockenperiode',
    description: 'Überstehe 3 Runden in Folge, ohne einen einzigen Strafschnaps zu kassieren.',
    epicLore: 'Ein eiserner Magen und ruhige Hand – wehre alle Trinkstrafen ab!',
    category: 'consistency',
    durationRounds: 3,
    pool: 'both',
    icon: '🛡️',
    difficulty: 'normal'
  },
  {
    id: 'schnapszahl',
    name: 'Schnapszahl',
    shortTitle: 'Magische Schnapszahl',
    description: 'Triff bei deinem Wiegeergebnis eine echte Schnapszahl (z.B. 222g, 333g, 444g oder Enddoppel 11, 22, 33). Nur für Meister (Pre-Average < 7.0g).',
    epicLore: 'Die uralten Wiegemagier verlangen die magische Doppelung der Zahlen!',
    category: 'precision',
    durationRounds: 3,
    pool: 'championswieg',
    icon: '🎲',
    difficulty: 'extreme',
    maxPreAverage: 7.0
  },
  {
    id: 'bullseye',
    name: 'Lande einen Treffer',
    shortTitle: 'Volltreffer',
    description: 'Lande in den nächsten Runden einen Volltreffer (Kreiswiega: ±2g / Championswieg: chirurgisch ±1g).',
    epicLore: 'Haarscharf! Treffe die Mitte des Ziels mit chirurgischer Präzision.',
    category: 'precision',
    durationRounds: 3,
    pool: 'both',
    icon: '🎯',
    difficulty: 'hard',
    maxPreAverage: 9.0
  },
  {
    id: 'improver',
    name: 'Steigern',
    shortTitle: 'Aufwärtstrend',
    description: 'Verbessere deine Genauigkeit 2 Runden hintereinander (jede Runde geringere Abweichung als in der Vorrunde).',
    epicLore: 'Jeder Schluck schärft deinen Fokus – werde von Runde zu Runde präziser.',
    category: 'consistency',
    durationRounds: 2,
    pool: 'kreiswiega',
    icon: '📈',
    difficulty: 'normal'
  },
  {
    id: 'no_schnaps_when_x',
    name: 'Kein Schnaps wenn X trinkt',
    shortTitle: 'Schadenfreude',
    description: 'Kassiere in den nächsten 3 Runden keinen Schnaps in einer Runde, in der dein Rivale trinken muss.',
    epicLore: 'Stoße ins Horn, während dein Kontrahent das Strafglas leert!',
    category: 'social',
    durationRounds: 3,
    pool: 'championswieg',
    icon: '🍺',
    difficulty: 'hard',
    requiresMinPlayers: 2
  },
  {
    id: 'same_weight',
    name: 'Gleiche Zahl',
    shortTitle: 'Seelenverwandtschaft',
    description: 'Lande innerhalb der nächsten 3 Runden in mindestens einer Runde auf exakt demselben Gramm-Endwert wie ein anderer Spieler.',
    epicLore: 'Zwei Krüge, ein Geist! Trefft denselben Eichwert.',
    category: 'social',
    durationRounds: 3,
    pool: 'both',
    icon: '👯',
    difficulty: 'hard',
    requiresMinPlayers: 2
  },
  {
    id: 'even_only',
    name: 'Nur gerade Zahlen',
    shortTitle: 'Gerade Treffer',
    description: 'Deine Wiegeergebnisse müssen in 2 Runden hintereinander auf eine gerade Gramm-Zahl enden (z.B. 248g, 192g).',
    epicLore: 'Die Götter der Symmetrie dulden keine ungeraden Ziffern.',
    category: 'precision',
    durationRounds: 2,
    pool: 'both',
    icon: '🔢',
    difficulty: 'normal'
  },
  {
    id: 'target_end_digit',
    name: 'Endziffer-Treffer',
    shortTitle: 'Glückszahl treffen',
    description: 'Lande innerhalb der nächsten 3 Runden mindestens einmal auf deiner zugewiesenen Endziffer.',
    epicLore: 'Die Rune des Schicksals verlangt nach einer ganz bestimmten Schlussziffer!',
    category: 'precision',
    durationRounds: 3,
    pool: 'both',
    icon: '✨',
    difficulty: 'normal'
  }
];

export function getQuestById(id: string): QuestDefinition | undefined {
  return WORLD_OF_WIEGEN_QUESTS.find(q => q.id === id);
}

/**
 * Dynamic Skill & Leaderboard Gating Quest Selector
 */
export function selectEligibleQuest(
  player: Player,
  allPlayers: Player[],
  currentRoundNumber: number,
  playerRanks: Map<string, number>,
  playerAverages: Map<string, number>,
  pool: WorldOfWiegenPool | 'both',
  existingActiveQuestIds: string[]
): { quest: QuestDefinition; targetPlayer?: Player; targetValue?: number } | null {
  const rank = playerRanks.get(player.id) || 1;
  const preAvg = playerAverages.get(player.id) || 15.0;
  const totalPlayers = allPlayers.length;
  const isLeader = rank === 1;
  const isTail = rank === totalPlayers && totalPlayers > 1;

  // Filter out already active quests for this player
  const poolFiltered = WORLD_OF_WIEGEN_QUESTS.filter(q => {
    if (existingActiveQuestIds.includes(q.id)) return false;
    if (pool !== 'both' && q.pool !== 'both' && q.pool !== pool) return false;
    if (q.requiresMinPlayers && totalPlayers < q.requiresMinPlayers) return false;

    // Gating checks
    if (q.requiresLeader && !isLeader) return false;
    if (q.requiresTail && !isTail) return false;
    if (q.requiresRankMin && rank < q.requiresRankMin) return false;
    // Spieler, die sich bereits auf dem ersten Platz befinden, können better_than_x nicht erhalten!
    if (q.id === 'better_than_x' && isLeader) return false;
    if (q.maxPreAverage && preAvg > q.maxPreAverage) return false;
    if (q.minPreAverage && preAvg < q.minPreAverage) return false;

    return true;
  });

  if (poolFiltered.length === 0) return null;

  // Weight quests by role & skill for maximum immersion
  const weighted = poolFiltered.map(q => {
    let weight = 10;
    if (preAvg < 7.0 && q.category === 'precision') weight += 25;
    if (isLeader && q.category === 'leader') weight += 30;
    if (isTail && q.category === 'comeback') weight += 30;
    if (rank > 1 && q.id === 'catch_leader') weight += 20;
    if (rank > 1 && q.id === 'better_than_x') weight += 25;
    if (q.category === 'social') weight += 15;
    return { q, weight };
  });

  const totalWeight = weighted.reduce((acc, item) => acc + item.weight, 0);
  let random = Math.random() * totalWeight;
  let chosen = weighted[0].q;

  for (const item of weighted) {
    if (random < item.weight) {
      chosen = item.q;
      break;
    }
    random -= item.weight;
  }

  // Pick suitable target player for rival / partner quests
  let targetPlayer: Player | undefined;
  if (['better_than_x', 'opposite_to_x', 'parallel_to_x', 'no_schnaps_when_x'].includes(chosen.id)) {
    const opponents = allPlayers.filter(p => p.id !== player.id && !p.isDisqualified);
    if (opponents.length > 0) {
      if (chosen.id === 'better_than_x') {
        if (pool === 'kreiswiega') {
          // Kreiswiega (einfacher Modus): Rivale nicht weit von seinem Abstand weg (nächster Tabellennachbar)
          const sortedByProximity = [...opponents].sort((a, b) => {
            const rankA = playerRanks.get(a.id) || 1;
            const rankB = playerRanks.get(b.id) || 1;
            const distA = Math.abs(rankA - rank);
            const distB = Math.abs(rankB - rank);
            if (distA !== distB) return distA - distB;
            // Bei gleichem Abstand bevorzugt 1 Platz besser
            if (rankA < rank && rankB >= rank) return -1;
            if (rankB < rank && rankA >= rank) return 1;
            const avgA = Math.abs((playerAverages.get(a.id) || 15) - preAvg);
            const avgB = Math.abs((playerAverages.get(b.id) || 15) - preAvg);
            return avgA - avgB;
          });
          targetPlayer = sortedByProximity[0];
        } else {
          // Championswieg (schwerer Modus): Rivale wesentlich besser als der Spieler (Spitzenreiter / Platz 1)
          const betterOpponents = opponents.filter(opp => {
            const oppRank = playerRanks.get(opp.id) || 1;
            return oppRank < rank;
          });
          if (betterOpponents.length > 0) {
            betterOpponents.sort((a, b) => {
              const rankA = playerRanks.get(a.id) || 1;
              const rankB = playerRanks.get(b.id) || 1;
              if (rankA !== rankB) return rankA - rankB; // Niedrigster Rang = Platz 1
              const avgA = playerAverages.get(a.id) || 15;
              const avgB = playerAverages.get(b.id) || 15;
              return avgA - avgB;
            });
            targetPlayer = betterOpponents[0]; // Platz 1 (Spitzenreiter)
          } else {
            // Fallback wenn alle auf demselben Rang liegen: bester Durchschnitt
            const sortedByAvg = [...opponents].sort((a, b) => {
              const avgA = playerAverages.get(a.id) || 15;
              const avgB = playerAverages.get(b.id) || 15;
              return avgA - avgB;
            });
            targetPlayer = sortedByAvg[0];
          }
        }
      } else {
        targetPlayer = opponents[Math.floor(Math.random() * opponents.length)];
      }
    }
  }

  let targetValue: number | undefined;
  if (chosen.id === 'target_end_digit') {
    // End digit 0-9
    targetValue = Math.floor(Math.random() * 10);
  }

  return { quest: chosen, targetPlayer, targetValue };
}

/**
 * Creates an ActiveQuest instance tailored specifically to the chosen difficulty pool (Kreiswiega = leichter, Championswieg = schwerer).
 */
export function createQuestInstance(
  questDef: QuestDefinition,
  player: Player,
  chosenPool: WorldOfWiegenPool,
  currentRoundIdx: number,
  playerRanks: Map<string, number>,
  playerAverages: Map<string, number>,
  targetPlayer?: Player,
  targetValue?: number
): ActiveQuest {
  const isChampionswieg = chosenPool === 'championswieg';

  let requiredStreak = questDef.durationRounds;
  let durationRounds = questDef.durationRounds;
  let tolerance = 1;
  let customDescription = questDef.description;

  if (questDef.id === 'bullseye') {
    tolerance = isChampionswieg ? 1 : 2;
    requiredStreak = 1;
    customDescription = isChampionswieg
      ? 'Chirurgische Meisterleistung: Lande in den nächsten 3 Runden einen Volltreffer mit höchstens ±1g Abweichung!'
      : 'Kreiswiega-Toleranz: Lande in den nächsten 3 Runden einen Treffer mit maximal ±2g Abweichung (Leichter).';
  } else if (questDef.id === 'even_only') {
    requiredStreak = isChampionswieg ? 3 : 2;
    durationRounds = isChampionswieg ? 3 : 2;
    customDescription = isChampionswieg
      ? '3 Runden in Folge konsequent auf eine gerade Zahl wiegen!'
      : '2 Runden in Folge auf eine gerade Gramm-Zahl wiegen.';
  } else if (questDef.id === 'over_under_target') {
    requiredStreak = isChampionswieg ? 3 : 2;
    durationRounds = isChampionswieg ? 3 : 2;
    customDescription = isChampionswieg
      ? '3 Runden in Folge stur auf derselben Seite des Zielgewichts landen!'
      : '2 Runden in Folge auf derselben Seite des Zielgewichts landen (beide drüber oder beide drunter).';
  } else if (questDef.id === 'no_schnaps') {
    requiredStreak = isChampionswieg ? 3 : 2;
    durationRounds = isChampionswieg ? 3 : 2;
    customDescription = isChampionswieg
      ? 'Überstehe 3 Runden in Folge ohne einen einzigen Strafschnaps!'
      : 'Überstehe 2 Runden in Folge ohne Strafschnaps.';
  } else if (questDef.id === 'better_than_x') {
    requiredStreak = isChampionswieg ? 2 : 1;
    durationRounds = isChampionswieg ? 3 : 2;
    const myRank = playerRanks.get(player.id) || 2;
    const targetRank = targetPlayer ? (playerRanks.get(targetPlayer.id) || 1) : (isChampionswieg ? 1 : Math.max(1, myRank - 1));
    const rivalName = targetPlayer?.name || 'dein Rivale';

    customDescription = isChampionswieg
      ? `Meister-Herausforderung: Besiege Spitzenreiter ${rivalName} (Platz ${targetRank}, du: Platz ${myRank}) in mindestens 2 Runden im direkten Duell!`
      : `Tabellenduell: Sei in mindestens einer Runde präziser als dein direkter Tabellennachbar ${rivalName} (Platz ${targetRank}, du: Platz ${myRank}).`;
  } else if (questDef.id === 'same_weight') {
    tolerance = isChampionswieg ? 0 : 1;
    customDescription = isChampionswieg
      ? 'Triff auf das exakt selbe Gramm-Gewicht wie ein Kontrahent!'
      : 'Lande bis auf ±1g am Wiegeergebnis eines Mitspielers.';
  } else if (questDef.id === 'target_end_digit') {
    tolerance = isChampionswieg ? 0 : 1;
    customDescription = isChampionswieg
      ? `Lande exakt auf deiner Endziffer ${targetValue}!`
      : `Lande auf deiner Glücks-Endziffer ${targetValue} (oder Nachbar ±1)!`;
  } else if (questDef.id === 'improver') {
    requiredStreak = isChampionswieg ? 2 : 1;
    customDescription = isChampionswieg
      ? 'Verbessere deine Genauigkeit 2 Runden hintereinander!'
      : 'Sei in der nächsten Runde genauer als in der Vorrunde.';
  }

  return {
    id: `wow_quest_${player.id}_r${currentRoundIdx + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    questId: questDef.id,
    playerId: player.id,
    playerName: player.name,
    pool: chosenPool,
    targetPlayerId: targetPlayer?.id,
    targetPlayerName: targetPlayer?.name,
    assignedRound: currentRoundIdx,
    targetRound: currentRoundIdx + durationRounds,
    initialRank: playerRanks.get(player.id) || 1,
    initialPreAverage: playerAverages.get(player.id) || 15.0,
    targetValue,
    streakCount: 0,
    requiredStreak,
    tolerance,
    customDescription,
    progressText: `Neu erhalten (${isChampionswieg ? '👑 Championswieg' : '🤝 Kreiswiega'}). Noch ${durationRounds} Runden Zeit.`,
    status: 'active'
  };
}

/**
 * Evaluates an active quest after a round has been submitted
 */
export function evaluateQuestAtRoundEnd(
  quest: ActiveQuest,
  player: Player,
  allPlayers: Player[],
  rounds: Round[],
  currentRoundIndex: number,
  playerRanks: Map<string, number>
): { status: 'active' | 'completed' | 'failed'; progressText: string; streakCount: number } {
  const currentRound = rounds[currentRoundIndex];
  if (!currentRound || currentRound.results[player.id] === undefined) {
    return { status: quest.status, progressText: quest.progressText, streakCount: quest.streakCount };
  }

  const weight = currentRound.results[player.id];
  const target = currentRound.targetWeight;
  const diff = Math.abs(weight - target);
  const currentRank = playerRanks.get(player.id) || 1;
  const roundsAssigned = currentRoundIndex - quest.assignedRound + 1;
  const isLastAllowedRound = currentRoundIndex >= quest.targetRound;

  let newStreak = quest.streakCount;
  let newStatus: 'active' | 'completed' | 'failed' = 'active';
  let progressText = quest.progressText;

  switch (quest.questId) {
    case 'bullseye': {
      const allowedTolerance = quest.tolerance !== undefined ? quest.tolerance : (quest.pool === 'kreiswiega' ? 2 : 1);
      if (diff <= allowedTolerance) {
        newStatus = 'completed';
        progressText = `🎯 Volltreffer erzielt (${weight}g bei Ziel ${target}g, Abweichung ${diff}g ≤ ${allowedTolerance}g)! Quest bestanden!`;
      } else if (isLastAllowedRound) {
        newStatus = 'failed';
        progressText = `Leider kein Treffer ±${allowedTolerance}g bis Runde ${quest.targetRound + 1}.`;
      } else {
        progressText = `Aktuelle Abweichung: ${diff}g (Ziel: ≤ ${allowedTolerance}g). Noch ${quest.targetRound - currentRoundIndex} Runden Zeit.`;
      }
      break;
    }

    case 'schnapszahl': {
      const isSchnaps =
        weight === 111 ||
        weight === 222 ||
        weight === 333 ||
        weight === 444 ||
        weight === 555 ||
        weight % 10 === Math.floor((weight % 100) / 10);

      if (isSchnaps) {
        newStatus = 'completed';
        progressText = `🎲 Schnapszahl gewogen (${weight}g)! Magischer Treffer!`;
      } else if (isLastAllowedRound) {
        newStatus = 'failed';
        progressText = `Keine Schnapszahl erzielt.`;
      } else {
        progressText = `Gewicht: ${weight}g. Noch ${quest.targetRound - currentRoundIndex} Runden Zeit für eine Schnapszahl!`;
      }
      break;
    }

    case 'even_only': {
      if (weight % 2 === 0) {
        newStreak += 1;
        if (newStreak >= quest.requiredStreak) {
          newStatus = 'completed';
          progressText = `🔢 ${quest.requiredStreak} Runden in Folge geradzahlig gewogen (${weight}g)!`;
        } else {
          progressText = `Gerade Zahl getroffen (${weight}g)! Streak: ${newStreak}/${quest.requiredStreak}.`;
        }
      } else {
        newStreak = 0;
        if (isLastAllowedRound) {
          newStatus = 'failed';
          progressText = `Ungerade Zahl gewogen (${weight}g). Quest fehlgeschlagen.`;
        } else {
          progressText = `Ungerade Zahl (${weight}g) – Streak zurückgesetzt auf 0/${quest.requiredStreak}.`;
        }
      }
      break;
    }

    case 'target_end_digit': {
      const endDigit = weight % 10;
      const targetDigit = quest.targetValue !== undefined ? quest.targetValue : 5;
      const diffDigit = Math.min(Math.abs(endDigit - targetDigit), 10 - Math.abs(endDigit - targetDigit));
      const allowedTol = quest.tolerance !== undefined ? quest.tolerance : (quest.pool === 'kreiswiega' ? 1 : 0);
      if (diffDigit <= allowedTol) {
        newStatus = 'completed';
        progressText = `✨ Endziffer ${endDigit} getroffen (Ziel: ${targetDigit}${allowedTol > 0 ? ' ±1' : ''})!`;
      } else if (isLastAllowedRound) {
        newStatus = 'failed';
        progressText = `Endziffer ${targetDigit} nicht erreicht (Zuletzt: ${endDigit}).`;
      } else {
        progressText = `Endziffer war ${endDigit}, gesucht ist ${targetDigit}${allowedTol > 0 ? ' (±1 Toleranz)' : ''}. Noch ${quest.targetRound - currentRoundIndex} Runden.`;
      }
      break;
    }

    case 'drop_lantern': {
      const totalPlayers = allPlayers.length;
      if (currentRank < totalPlayers) {
        newStatus = 'completed';
        progressText = `🏮 Rote Laterne abgegeben! Du bist auf Rang ${currentRank}!`;
      } else if (isLastAllowedRound) {
        newStatus = 'failed';
        progressText = `Immer noch auf dem letzten Rang. Quest abgelaufen.`;
      } else {
        progressText = `Aktuell noch Rang ${currentRank} (Letzter). Noch ${quest.targetRound - currentRoundIndex} Runden.`;
      }
      break;
    }

    case 'climb_rank': {
      if (currentRank < quest.initialRank) {
        newStatus = 'completed';
        progressText = `🧗 Rang verbessert von ${quest.initialRank} auf Rang ${currentRank}!`;
      } else if (isLastAllowedRound) {
        newStatus = 'failed';
        progressText = `Rang nicht verbessert (${currentRank} vs Start ${quest.initialRank}).`;
      } else {
        progressText = `Aktueller Rang: ${currentRank} (Start: ${quest.initialRank}). Noch ${quest.targetRound - currentRoundIndex} Runden.`;
      }
      break;
    }

    case 'defend_lead': {
      if (currentRank === 1) {
        newStreak += 1;
        if (newStreak >= quest.requiredStreak) {
          newStatus = 'completed';
          progressText = `👑 Führung über ${quest.requiredStreak} Runden erfolgreich verteidigt!`;
        } else {
          progressText = `Platz 1 verteidigt! Streak: ${newStreak}/${quest.requiredStreak}.`;
        }
      } else {
        newStatus = 'failed';
        progressText = `Führung an Kontrahenten verloren (Jetzt Rang ${currentRank}).`;
      }
      break;
    }

    case 'catch_leader': {
      // Check if distance to leader decreased
      const leader = allPlayers.find(p => (playerRanks.get(p.id) || 1) === 1);
      if (currentRank === 1) {
        newStatus = 'completed';
        progressText = `🎯 Selbst die Führung übernommen!`;
      } else if (isLastAllowedRound) {
        if (currentRank < quest.initialRank) {
          newStatus = 'completed';
          progressText = `Abstand zur Spitze spürbar verringert!`;
        } else {
          newStatus = 'failed';
          progressText = `Konnte die Spitze nicht einholen.`;
        }
      } else {
        progressText = `Auf der Jagd! Aktuell Rang ${currentRank}. Noch ${quest.targetRound - currentRoundIndex} Runden.`;
      }
      break;
    }

    case 'no_schnaps': {
      // Check if player had schnaps this round
      // A schnaps is awarded if deviation was largest or specific tournament penalty
      const thisRoundDistances = allPlayers.map(p => ({
        id: p.id,
        dist: Math.abs((currentRound.results[p.id] || 0) - target)
      }));
      const maxDist = Math.max(...thisRoundDistances.map(d => d.dist));
      const gotSchnaps = diff === maxDist;

      if (!gotSchnaps) {
        newStreak += 1;
        if (newStreak >= quest.requiredStreak) {
          newStatus = 'completed';
          progressText = `🛡️ ${quest.requiredStreak} Runden schnapsfrei überstanden!`;
        } else {
          progressText = `Schnapsfrei überlebt! Streak: ${newStreak}/${quest.requiredStreak}.`;
        }
      } else {
        newStreak = 0;
        if (isLastAllowedRound) {
          newStatus = 'failed';
          progressText = `Schnaps kassiert (${diff}g Abweichung). Quest beendet.`;
        } else {
          progressText = `Schnaps kassiert! Streak zurückgesetzt auf 0/${quest.requiredStreak}.`;
        }
      }
      break;
    }

    case 'better_than_x': {
      if (quest.targetPlayerId) {
        const rivalWeight = currentRound.results[quest.targetPlayerId];
        if (rivalWeight !== undefined) {
          const rivalDiff = Math.abs(rivalWeight - target);
          if (diff < rivalDiff) {
            newStreak += 1;
          }
        }
        const neededWins = quest.requiredStreak || (quest.pool === 'kreiswiega' ? 1 : 2);
        if (newStreak >= neededWins) {
          newStatus = 'completed';
          progressText = `⚔️ ${quest.targetPlayerName || 'Rivalen'} in ${newStreak} Runden übertrumpft!`;
        } else if (isLastAllowedRound) {
          newStatus = 'failed';
          progressText = `${quest.targetPlayerName || 'Rivale'} war über die Runden präziser (${newStreak}/${neededWins} Siege).`;
        } else {
          progressText = `Duelle gegen ${quest.targetPlayerName}: ${newStreak}/${neededWins} Runden gewonnen. Noch ${quest.targetRound - currentRoundIndex} Runden.`;
        }
      }
      break;
    }

    case 'over_under_target': {
      // Check if on same side (all over or all under)
      const isOver = weight > target;
      if (quest.targetValue === undefined) {
        quest.targetValue = isOver ? 1 : 0;
        newStreak = 1;
        progressText = `Erste Runde ${isOver ? 'drüber' : 'drunter'} (${weight}g vs ${target}g). Streak: 1/${quest.requiredStreak}.`;
      } else {
        const matchesInitialSide = (quest.targetValue === 1 && isOver) || (quest.targetValue === 0 && !isOver);
        if (matchesInitialSide) {
          newStreak += 1;
          if (newStreak >= quest.requiredStreak) {
            newStatus = 'completed';
            progressText = `⚖️ ${quest.requiredStreak} Runden in Folge ${isOver ? 'über' : 'unter'} dem Ziel gewogen!`;
          } else {
            progressText = `Wieder ${isOver ? 'drüber' : 'drunter'}! Streak: ${newStreak}/${quest.requiredStreak}.`;
          }
        } else {
          newStreak = 1;
          quest.targetValue = isOver ? 1 : 0;
          if (isLastAllowedRound) {
            newStatus = 'failed';
            progressText = `Seite gewechselt. Quest fehlgeschlagen.`;
          } else {
            progressText = `Seite gewechselt (${isOver ? 'drüber' : 'drunter'}). Streak neu gestartet: 1/${quest.requiredStreak}.`;
          }
        }
      }
      break;
    }

    case 'opposite_to_x': {
      if (quest.targetPlayerId) {
        const rivalWeight = currentRound.results[quest.targetPlayerId];
        if (rivalWeight !== undefined) {
          const myOver = weight > target;
          const rivalOver = rivalWeight > target;
          if (myOver !== rivalOver) {
            newStreak += 1;
            if (newStreak >= quest.requiredStreak) {
              newStatus = 'completed';
              progressText = `🔄 ${quest.requiredStreak} Runden entgegengesetzt zu ${quest.targetPlayerName} gewogen!`;
            } else {
              progressText = `Entgegengesetzt gewogen! Streak: ${newStreak}/${quest.requiredStreak}.`;
            }
          } else {
            newStreak = 0;
            if (isLastAllowedRound) {
              newStatus = 'failed';
              progressText = `Gleiche Seite wie ${quest.targetPlayerName} gewogen.`;
            } else {
              progressText = `Gleiche Seite wie ${quest.targetPlayerName} – Streak 0/${quest.requiredStreak}.`;
            }
          }
        }
      }
      break;
    }

    case 'parallel_to_x': {
      if (quest.targetPlayerId) {
        const rivalWeight = currentRound.results[quest.targetPlayerId];
        if (rivalWeight !== undefined) {
          const myOver = weight >= target;
          const rivalOver = rivalWeight >= target;
          if (myOver === rivalOver) {
            newStreak += 1;
            if (newStreak >= quest.requiredStreak) {
              newStatus = 'completed';
              progressText = `👥 ${quest.requiredStreak} Runden im Gleichschritt mit ${quest.targetPlayerName} gewogen!`;
            } else {
              progressText = `Gleichläufig gewogen! Streak: ${newStreak}/${quest.requiredStreak}.`;
            }
          } else {
            newStreak = 0;
            if (isLastAllowedRound) {
              newStatus = 'failed';
              progressText = `Nicht parallel zu ${quest.targetPlayerName} gewogen.`;
            } else {
              progressText = `Entgegengesetzt zu ${quest.targetPlayerName} – Streak 0/${quest.requiredStreak}.`;
            }
          }
        }
      }
      break;
    }

    case 'improver': {
      if (currentRoundIndex > 0) {
        const prevRound = rounds[currentRoundIndex - 1];
        if (prevRound && prevRound.results[player.id] !== undefined) {
          const prevDiff = Math.abs(prevRound.results[player.id] - prevRound.targetWeight);
          if (diff < prevDiff) {
            newStreak += 1;
            if (newStreak >= quest.requiredStreak) {
              newStatus = 'completed';
              progressText = `📈 2 Runden in Folge gesteigert (${prevDiff}g → ${diff}g)!`;
            } else {
              progressText = `Gesteigert von ${prevDiff}g auf ${diff}g! Streak: ${newStreak}/${quest.requiredStreak}.`;
            }
          } else {
            newStreak = 0;
            if (isLastAllowedRound) {
              newStatus = 'failed';
              progressText = `Abweichung verschlechtert (${prevDiff}g → ${diff}g).`;
            } else {
              progressText = `Verschlechtert (${prevDiff}g → ${diff}g). Streak 0/${quest.requiredStreak}.`;
            }
          }
        }
      }
      break;
    }

    case 'same_weight': {
      const allowedTol = quest.tolerance !== undefined ? quest.tolerance : (quest.pool === 'kreiswiega' ? 1 : 0);
      const matchWithOther = allPlayers.some(
        p => p.id !== player.id && currentRound.results[p.id] !== undefined && Math.abs(currentRound.results[p.id] - weight) <= allowedTol
      );
      if (matchWithOther) {
        newStatus = 'completed';
        progressText = `👯 Zahlengleichheit mit Mitspieler (${weight}g)! Quest bestanden!`;
      } else if (isLastAllowedRound) {
        newStatus = 'failed';
        progressText = `Keine Zahlengleichheit erzielt.`;
      } else {
        progressText = `Gewicht: ${weight}g. Noch ${quest.targetRound - currentRoundIndex} Runden.`;
      }
      break;
    }

    case 'no_schnaps_when_x': {
      if (quest.targetPlayerId) {
        const rivalDist = Math.abs((currentRound.results[quest.targetPlayerId] || 0) - target);
        const thisRoundDists = allPlayers.map(p => Math.abs((currentRound.results[p.id] || 0) - target));
        const maxD = Math.max(...thisRoundDists);
        const rivalGotSchnaps = rivalDist === maxD;
        const iGotSchnaps = diff === maxD;

        if (rivalGotSchnaps && !iGotSchnaps) {
          newStatus = 'completed';
          progressText = `🍺 ${quest.targetPlayerName} musste trinken, während du trocken bliebst! Quest erfüllt!`;
        } else if (isLastAllowedRound) {
          newStatus = 'failed';
          progressText = `Bedingung nicht eingetroffen.`;
        } else {
          progressText = `Warten auf ${quest.targetPlayerName}'s Schnaps-Patzer... Noch ${quest.targetRound - currentRoundIndex} Runden.`;
        }
      }
      break;
    }

    default:
      if (isLastAllowedRound && newStatus === 'active') {
        newStatus = 'failed';
        progressText = 'Zeit abgelaufen.';
      }
  }

  return { status: newStatus, progressText, streakCount: newStreak };
}
