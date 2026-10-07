import { EffectDefinition, ActiveEffect, EffectCode, WorldOfWiegenPool } from '../types/worldOfWiegen';
import { Player } from '../../types';

export const WORLD_OF_WIEGEN_EFFECTS: EffectDefinition[] = [
  {
    id: 'E01',
    code: 'E01',
    name: 'Blindwiegen',
    subtitle: 'Doppelte Meisterschaft',
    description: 'Der Questgewinner übernimmt in der nächsten Runde sowohl die Appmeister- als auch die Wiegemeister-Rolle und bestimmt die Reihenfolge.',
    flavorText: 'Machtdemonstration am Wiegetisch! Du führst die Waage und diktierst das Protokoll.',
    duration: 'next_round',
    durationLabel: 'Nächste Runde',
    pool: 'championswieg',
    isAsymmetric: true,
    icon: '👁️'
  },
  {
    id: 'E02',
    code: 'E02',
    name: 'Drinkbuddy',
    subtitle: 'Schicksalsgemeinschaft',
    description: 'Ein Drinkbuddy wird zugewiesen: Wann immer der Auserwählte trinken muss, trinkt sein Buddy solidarisch mit (ohne Score-Abzug).',
    flavorText: 'Geteiltes Leid ist doppeltes Vergnügen am Tresen der Ewigkeit!',
    duration: 'rest_of_game',
    durationLabel: 'Restliches Spiel',
    pool: 'championswieg',
    isAsymmetric: true,
    icon: '🍻'
  },
  {
    id: 'E03',
    code: 'E03',
    name: 'Zur Hand gehen',
    subtitle: 'Kavaliersdienst am Glas',
    description: 'Beim Trinken hält ab sofort jeder Spieler seinem linken Nachbarn das Glas an den Mund. (Der Questgewinner ist als Zeremonienmeister ausgenommen).',
    flavorText: 'Dienet einander! Kein Krug wird mehr durch die eigene Hand erhoben.',
    duration: 'rest_of_game',
    durationLabel: 'Restliches Spiel',
    pool: 'championswieg',
    isAsymmetric: true,
    icon: '🤝'
  },
  {
    id: 'E04',
    code: 'E04',
    name: 'Schwaches Händchen',
    subtitle: 'Die falsche Hand',
    description: 'Alle betroffenen Kontrahenten müssen ab sofort ausnahmslos mit ihrer schwachen Hand anstoßen und trinken.',
    flavorText: 'Die Rechte ruht, die Linke zittert – ein Test purer motorischer Disziplin!',
    duration: 'rest_of_game',
    durationLabel: 'Restliches Spiel',
    pool: 'kreiswiega',
    isAsymmetric: false,
    icon: '🖐️'
  },
  {
    id: 'E05',
    code: 'E05',
    name: 'Niemand bleibt zurück',
    subtitle: 'Bürde der Besten',
    description: 'Der Schnaps des Spielers mit der weitesten Abweichung wird vom Rundenbesten getrunken! (Der Strafpunkt verbleibt regulär beim Verlierer).',
    flavorText: 'Der Starke trägt die Schwachen – wahrer Sportsgeist der Kreiswiega!',
    duration: 'rest_of_game',
    durationLabel: 'Restliches Spiel',
    pool: 'kreiswiega',
    isAsymmetric: false,
    icon: '🛡️'
  },
  {
    id: 'E06',
    code: 'E06',
    name: 'Doppelt hält besser',
    subtitle: 'Doppel-Runde',
    description: 'Alle regulären Strafschnäpse der kommenden Runde werden verdoppelt (reales Trinken x2, keine Zusatzstrafe im Score).',
    flavorText: 'Die Taverne brennt! Wer jetzt patzt, schenkt sich doppelt ein.',
    duration: 'next_round',
    durationLabel: 'Nächste Runde',
    pool: 'championswieg',
    isAsymmetric: true,
    icon: '🔥'
  },
  {
    id: 'E07',
    code: 'E07',
    name: 'Zwiwa – Zwischenwasser',
    subtitle: 'Das hydrierende Minigame',
    description: '1. Alle füllen ein Schnapsglas mit Wasser → Gesamtgewicht wird gewogen. 2. Ziel = Gesamtgewicht - (10g * Spieleranzahl). 3. Jeder trinkt etwa die Hälfte. 4. Weicht das neue Gewicht um > 20% ab, trinken ALLE einen Strafschnaps!',
    flavorText: 'Hydration ist der Schlüssel zum Sieg! Zeigt euer Gruppengefühl beim Wasserteilen.',
    duration: 'instant_minigame',
    durationLabel: 'Minigame (Sofort)',
    pool: 'kreiswiega',
    isAsymmetric: false,
    icon: '💧',
    isMinigame: true
  },
  {
    id: 'E08',
    code: 'E08',
    name: 'Last Round',
    subtitle: 'Das Glas auf der Waage',
    description: 'In der Finalrunde muss zusätzlich zum Dosenleergewicht das reale Schnapsglas mitgewogen und geschätzt werden.',
    flavorText: 'Das große Finale verlangt nach schwerem Glaswerk auf den Wiegetellern.',
    duration: 'final_round',
    durationLabel: 'Finalrunde',
    pool: 'kreiswiega',
    isAsymmetric: false,
    icon: '🥃'
  },
  {
    id: 'E09',
    code: 'E09',
    name: 'David & Goliath',
    subtitle: 'Extremansage',
    description: 'Der betroffene Spieler darf als Zielansage in der nächsten Runde nur das oberste Perzentil (Goliath) oder unterste Perzentil (David) der erlaubten Range wählen.',
    flavorText: 'Entweder Zwergenschluck oder Riesenhieb – kein Mittelmaß!',
    duration: 'next_round',
    durationLabel: 'Nächste Runde',
    pool: 'championswieg',
    isAsymmetric: true,
    icon: '⚡'
  },
  {
    id: 'E10',
    code: 'E10',
    name: 'Das Spiel heißt Wiegen',
    subtitle: 'Alltags-Wiege Minigame',
    description: 'Die App generiert ein Zielgewicht (70g - 520g). Jeder sucht einen beliebigen Alltagsgegenstand (außer Getränk). Der Gegenstand, der am weitesten entfernt ist, zahlt eine Schnapsrunde!',
    flavorText: 'Schlüssel, Feuerzeug, Schuhwerk oder Bierdeckel – wiegt alles, was die Taverne hergibt!',
    duration: 'instant_minigame',
    durationLabel: 'Minigame (Sofort)',
    pool: 'kreiswiega',
    isAsymmetric: false,
    icon: '🔑',
    isMinigame: true
  },
  {
    id: 'E11',
    code: 'E11',
    name: 'Wiegeruf / Zwischenruf',
    subtitle: 'Göttlicher Einspruch',
    description: 'Der Questgewinner darf einmalig außerhalb der regulären Reihenfolge ein zusätzliches Zwischenziel ausrufen.',
    flavorText: 'Ein Ruf hallt durch die Runde – alle müssen dem Diktat des Gewinners folgen!',
    duration: 'once',
    durationLabel: 'Einmalig einsetzbar',
    pool: 'championswieg',
    isAsymmetric: true,
    icon: '📢'
  },
  {
    id: 'E12',
    code: 'E12',
    name: 'Brotherdrinks',
    subtitle: 'Verschränkte Arme',
    description: 'Getrunken wird in der nächsten Runde ausschließlich paarweise mit traditionell verschränkten Armen (Brüderschaftstrunk).',
    flavorText: 'Eingehakt und angestoßen! Bruderschaft am Tresen kennt kein Zögern.',
    duration: 'next_round',
    durationLabel: 'Nächste Runde',
    pool: 'kreiswiega',
    isAsymmetric: false,
    icon: '🤜🤛'
  },
  {
    id: 'E13',
    code: 'E13',
    name: 'Ritual',
    subtitle: 'Heilige Sitte',
    description: 'Jeder Trinkvorgang muss ab sofort durch ein vom Questgewinner erfundenes Ritual (z.B. 2x Tisch klopfen, Wolfsgeheul oder Krug-Salutschlag) eingeleitet werden.',
    flavorText: 'Ohne das Ritual fließt kein Tropfen ungestraft die Kehle hinab!',
    duration: 'rest_of_game',
    durationLabel: 'Restliches Spiel',
    pool: 'championswieg',
    isAsymmetric: true,
    icon: '🧙‍♂️'
  }
];

export function getEffectByCode(code: string): EffectDefinition | undefined {
  return WORLD_OF_WIEGEN_EFFECTS.find(e => e.code === code);
}

/**
 * Selects an effect as reward when a quest is completed
 */
export function selectRewardEffect(
  winnerPlayer: Player,
  allPlayers: Player[],
  pool: WorldOfWiegenPool,
  currentRoundNumber: number,
  activeEffects: ActiveEffect[]
): { effect: EffectDefinition; activeEffect: ActiveEffect } {
  const existingCodes = activeEffects.map(e => e.effectId);

  // Filter available effects according to pool and constraints
  const eligible = WORLD_OF_WIEGEN_EFFECTS.filter(e => {
    // E12 requires even player count
    if (e.code === 'E12' && allPlayers.length % 2 !== 0) return false;
    // Don't repeat permanent rest_of_game effects that are already active
    if (e.duration === 'rest_of_game' && existingCodes.includes(e.code)) return false;
    // Pool filter
    if (e.pool !== 'both' && e.pool !== pool) return false;
    return true;
  });

  const poolToUse = eligible.length > 0 ? eligible : WORLD_OF_WIEGEN_EFFECTS;
  const chosenEffect = poolToUse[Math.floor(Math.random() * poolToUse.length)];

  // Prepare effect parameters
  let targetPlayerIds: string[] | undefined;
  let targetPlayerNames: string[] | undefined;
  let drinkBuddyPairs: Array<{ playerA: string; playerB: string }> | undefined;
  let ritualDesc: string | undefined;

  if (chosenEffect.code === 'E02') {
    // Drinkbuddy assignment: Pair winner with another random player
    const others = allPlayers.filter(p => p.id !== winnerPlayer.id);
    if (others.length > 0) {
      const buddy = others[Math.floor(Math.random() * others.length)];
      drinkBuddyPairs = [{ playerA: winnerPlayer.name, playerB: buddy.name }];
      targetPlayerIds = [buddy.id];
      targetPlayerNames = [buddy.name];
    }
  } else if (chosenEffect.code === 'E13') {
    const rituals = [
      'Zweimal kräftig auf den Tisch klopfen',
      'Kurzes Wolfsgeheul (Awoooo!) anstimmen',
      'Glas an die Stirn tippen vor dem Schluck',
      'Mit beiden Füßen kurz stampfen',
      'Laut "WIEGEN FOREVER!" rufen'
    ];
    ritualDesc = rituals[Math.floor(Math.random() * rituals.length)];
  }

  const activeInstance: ActiveEffect = {
    id: `eff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    effectId: chosenEffect.code,
    name: chosenEffect.name,
    description: chosenEffect.description,
    icon: chosenEffect.icon,
    activatedRound: currentRoundNumber,
    expiresRound: chosenEffect.duration === 'next_round' ? currentRoundNumber + 1 : undefined,
    triggeredByPlayerId: winnerPlayer.id,
    triggeredByPlayerName: winnerPlayer.name,
    targetPlayerIds,
    targetPlayerNames,
    drinkBuddyPairs,
    ritualDescription: ritualDesc
  };

  return { effect: chosenEffect, activeEffect: activeInstance };
}
