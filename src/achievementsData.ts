import { GameState, Player, Round, Team, Achievement } from '../types';
import { calculateAverageDistance, SPECIAL_NUMBERS, TOGETHER_ACHIEVEMENT_IDS } from '../utils';

export const MASTER_ACHIEVEMENTS_DEFINITIONS: Array<{
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedTogether?: boolean;
}> = [
  // Präzision
  { id: 'sharpshooter', title: 'Scharfschütze', description: '3x hintereinander unter 5g Abstand', icon: '🎯', rarity: 'rare' },
  { id: 'bullseye_king', title: 'Volltreffer-König', description: '3x Volltreffer (exakt 0g Abstand) in einem Spiel', icon: '👑', rarity: 'epic' },
  { id: 'millimeter', title: 'Millimeterarbeit', description: 'Durchschnittsabstand unter 3,5g', icon: '🔬', rarity: 'rare' },
  { id: 'perfect_balance', title: 'Die Waage', description: 'Durchschnittsabstand exakt 0g (jede Runde Volltreffer)', icon: '⚖️', rarity: 'legendary' },
  { id: 'drop_by_drop', title: 'Tropfen für Tropfen', description: 'Nie mehr als 5g Abstand in einer Runde gehabt', icon: '💧', rarity: 'rare' },
  { id: 'perfectionist', title: 'Jungfrau', description: 'Das Spiel mit 0 Strafpunkten beendet', icon: '✨', rarity: 'epic' },
  { id: 'poker_face', title: 'Poker Face', description: 'In 3 aufeinanderfolgenden Runden exakt denselben Abstand (±1g)', icon: '🃏', rarity: 'rare' },

  // Straf-Achievements
  { id: 'lead_hand', title: 'Bleihand', description: 'In jeder Runde den größten Abstand gehabt', icon: '🪨', rarity: 'common' },
  { id: 'schnaepse_king', title: 'Schnäpse-König', description: 'Die meiste Strafpunkte im Spiel', icon: '🍺', rarity: 'common' },
  { id: 'catastrophe', title: 'Katastrophe', description: 'Einmal mehr als 35g Abstand gehabt', icon: '💥', rarity: 'common' },
  { id: 'consistently_bad', title: 'Noch kein Meister vom Himmel gefallen', description: 'Abstand in jeder Runde zwischen 15g und 25g', icon: '📉', rarity: 'common' },
  { id: 'unlucky_bird', title: 'Unglücksvogel', description: 'Nie den größten Abstand, aber trotzdem ≥5 Strafpunkte', icon: '🐦', rarity: 'rare' },
  { id: 'eternal_second', title: 'Ewiger Zweiter', description: 'In jeder Runde den zweitkleinsten Abstand gehabt', icon: '🥈', rarity: 'common' },

  // Spezial-Achievements
  { id: 'twins', title: 'Zwillinge', description: 'Zwei Spieler mit exakt demselben Gewicht in 3+ Runden', icon: '👯', rarity: 'rare', earnedTogether: true },
  { id: 'doppelganger', title: 'Doppelgänger', description: 'Dasselbe Spielerpaar mit exakt demselben Gewicht in 3+ Runden', icon: '👤', rarity: 'epic', earnedTogether: true },
  { id: 'schnapps_hunter', title: 'Schnappszahl-Jäger', description: 'In einem Spiel 2+ Schnappszahlen getroffen', icon: '🎯', rarity: 'rare' },
  { id: 'triple_seven', title: '777', description: 'Exakt 77g in einer Runde getroffen', icon: '🎰', rarity: 'epic' },
  { id: 'mirror_number', title: 'Spiegelzahl', description: 'Zwei Spieler mit gespiegelten Gewichten in einer Runde', icon: '🪞', rarity: 'epic', earnedTogether: true },
  { id: 'round_number', title: 'Runde Sache', description: 'Exakt 100g, 200g oder 300g getroffen', icon: '🔵', rarity: 'common' },
  { id: 'so_close', title: 'Knapp daneben', description: 'In 2+ Runden exakt 1g vom Volltreffer entfernt', icon: '😬', rarity: 'common' },
  { id: 'outsider', title: 'Außenseiter', description: 'In jeder Runde mindestens 10g von allen anderen entfernt', icon: '🏝️', rarity: 'rare' },
  { id: 'shadow', title: 'Schatten', description: 'Zwei Spieler in jeder Runde maximal 2g voneinander entfernt', icon: '👥', rarity: 'epic', earnedTogether: true },
  { id: 'six_seven', title: 'Six Seven', description: 'In einer Runde exakt 67g getroffen', icon: '6️⃣7️⃣', rarity: 'rare' },
  { id: 'four_twenty', title: 'Four Twenty', description: 'In einer Runde exakt 420g getroffen', icon: '🌿', rarity: 'rare' },
  { id: 'sixty_nine', title: '69', description: 'In einer Runde exakt 69g getroffen', icon: '♋', rarity: 'rare' },

  // Verlaufs-Achievements
  { id: 'rising_star', title: 'Aufsteiger', description: 'Abstand in jeder Runde kleiner als in der vorherigen', icon: '📈', rarity: 'rare' },
  { id: 'falling_star', title: 'Absteiger', description: 'Abstand in jeder Runde größer als in der vorherigen', icon: '📉', rarity: 'common' },
  { id: 'rollercoaster', title: 'Achterbahn', description: 'Abwechselnd bester und schlechtester Spieler in ≥4 Runden', icon: '🎢', rarity: 'rare' },
  { id: 'sandbagging', title: 'Sandbagging', description: 'Erste 3 Runden der Schlechteste, am Ende Gesamtdurchschnitt < 5g', icon: '🎭', rarity: 'legendary' },

  // Ergebnis-Achievements
  { id: 'lucky_loser', title: 'Lucky Loser', description: 'Meiste Strafpunkte, aber niedrigster Gesamtscore aller Spieler', icon: '🍀', rarity: 'rare' },
  { id: 'comeback', title: 'Comeback', description: 'Nach Runde 1 Letzter, am Ende das Spiel gewonnen', icon: '💪', rarity: 'epic' },
  { id: 'equilibrium', title: 'Gleichgewicht', description: 'Alle Spieler in jeder Runde unter 5g Abstand', icon: '☯️', rarity: 'legendary', earnedTogether: true },

  // Ansage-Achievements
  { id: 'prophet', title: 'Hellseher', description: 'Zielgewicht angesagt und selbst einen Volltreffer gelandet', icon: '🔮', rarity: 'legendary' },
  { id: 'strategist', title: 'Stratege', description: 'Zielgewicht angesagt und ein anderer Spieler landet einen Volltreffer', icon: '🧠', rarity: 'epic' },
  { id: 'calculator', title: 'Kopfrechner', description: 'Im Finale das eigene Gewicht exakt so getroffen wie angesagt (0g Abstand)', icon: '🧮', rarity: 'epic' },
  { id: 'thirsty', title: 'Durstiger', description: 'In einer Runde mehr als 20g unter dem Zielgewicht gelandet', icon: '🫗', rarity: 'common' },
  { id: 'guzzler', title: 'Schluckspecht', description: 'In jeder Runde unter dem Zielgewicht gelandet', icon: '🍻', rarity: 'common' },

  // Speedwiegen Achievements
  { id: 'speed_blitzpraezise', title: 'Blitzpräzise', description: 'Unter 3g Durchschnitt UND unter 90 Sekunden Gesamtzeit', icon: '⚡', rarity: 'epic' },
  { id: 'speed_zeitlos', title: 'Zeitlos', description: 'Alle Stufen unter 2g Abstand, unabhängig von der Zeit', icon: '🎯', rarity: 'rare' },
  { id: 'speed_stufenmeister', title: 'Stufen-Meister', description: 'Jede Stufe hatte einen kleineren oder gleichen Abstand als die vorherige', icon: '📈', rarity: 'rare' },
  { id: 'speed_steigerungsmeister', title: 'Steigerungs-Meister', description: 'Jede aufeinanderfolgende Stufe hatte einen strikt kleineren Abstand als die vorherige', icon: '🚀', rarity: 'epic' },
  { id: 'speed_nullsumme', title: 'Nullsumme', description: 'Mindestens 2 Volltreffer (exakt 0g Abstand) in einer Speed-Runde', icon: '🎰', rarity: 'epic' },
  { id: 'speed_roboter', title: 'Roboter', description: 'In jeder Stufe unter 3g Abstand', icon: '🤖', rarity: 'legendary' },
  { id: 'speed_speedstar', title: 'Speedstar', description: 'Gesamtzeit unter 60 Sekunden', icon: '⭐', rarity: 'rare' },
  { id: 'speed_hastig', title: 'Hastig', description: 'Gesamtzeit unter 50 Sekunden (unabhängig von Präzision)', icon: '💨', rarity: 'common' },
  { id: 'speed_gemuetlich', title: 'Gemütlich', description: 'Trotz über 150 Sekunden Gesamtzeit unter 5g Durchschnitt', icon: '🛋️', rarity: 'rare' },
  { id: 'speed_warmup', title: 'Warm-up', description: 'Erste Stufe war die schlechteste, letzte Stufe war die beste (strikt)', icon: '🔥', rarity: 'common' },
  { id: 'speed_kaltstart', title: 'Kaltstart', description: 'Erste Stufe war die beste, letzte Stufe war die schlechteste (strikt)', icon: '❄️', rarity: 'common' },
  { id: 'speed_spiegellaeufer', title: 'Spiegelläufer', description: 'Zwei aufeinanderfolgende Stufen hatten gespiegelte Abstände (z.B. 12g & 21g)', icon: '🪞', rarity: 'epic' },
  { id: 'speed_gleichlauf', title: 'Gleichlauf', description: 'Alle Stufen hatten exakt denselben Abstand zum Zielgewicht', icon: '🔄', rarity: 'rare' },
  { id: 'speed_schnappsstufe', title: 'Schnappsstufe', description: 'Mindestens 2 mal einen Abstand mit einer Schnappszahl auf einer Stufe getroffen', icon: '🥂', rarity: 'rare' },
  { id: 'speed_maxattack', title: 'Max-Attack', description: 'Auf allen Stufen exakt das Zielgewicht getroffen (0g Abstand auf jeder Stufe)', icon: '👑', rarity: 'legendary' },

  // Teamwiegen Achievements
  { id: 'team_traumteam', title: 'Traumteam', description: 'Alle Teammitglieder eines Teams lagen in einer Runde unter 5g Abstand vom Zielgewicht', icon: '🌟', rarity: 'rare', earnedTogether: true },
  { id: 'team_perfekt', title: 'Perfektes Team', description: 'Ein Team erreicht in einer Runde einen Gesamtabstand von exakt 0g', icon: '🎯', rarity: 'epic', earnedTogether: true },
  { id: 'team_ausgleich', title: 'Ausgleichskünstler', description: 'Nachdem alle Teammitglieder eines Teams eingegeben haben, wurde das Zielgewicht als Teamgesamtabstand exakt erreicht (0g)', icon: '⚖️', rarity: 'epic', earnedTogether: true },
  { id: 'team_synchron', title: 'Synchronschwimmer', description: 'Alle Teammitglieder eines Teams treffen in einer Runde exakt dasselbe Gewicht', icon: '🏊', rarity: 'legendary', earnedTogether: true },
  { id: 'team_rueckendeckung', title: 'Rückendeckung', description: 'Ein Teammitglied hatte über 20g Abstand vom Ziel, und die anderen Teammitglieder haben die Abweichung gemeinsam komplett ausgeglichen (Gesamtabstand = 0g)', icon: '💪', rarity: 'epic', earnedTogether: true },
  { id: 'team_taktiker', title: 'Taktiker', description: 'Ein Team gewinnt das Spiel ohne je in einer Runde den niedrigsten Einzelabstand aller Spieler gehabt zu haben', icon: '🧠', rarity: 'epic', earnedTogether: true },
  { id: 'team_underdog', title: 'Underdog-Team', description: 'Nach der Hälfte der Runden auf dem letzten Platz (meiste Strafpunkte) und am Ende trotzdem gewonnen', icon: '🐾', rarity: 'legendary', earnedTogether: true },
  { id: 'team_champions', title: 'Championswieg-Team', description: 'Der Team-Gesamtabstand weicht in keiner Runde mehr als 5g vom eigenen Durchschnitt ab', icon: '🏆', rarity: 'epic', earnedTogether: true },
  { id: 'team_nerven', title: 'Nerven aus Stahl', description: 'In der letzten Runde vom letzten Platz auf den ersten Platz gekommen', icon: '🔩', rarity: 'legendary', earnedTogether: true },
  { id: 'team_schnapps', title: 'Schnappsteam', description: 'Ein Team hat in 2 aufeinanderfolgenden Runden einen Gesamtabstand mit einer Schnappszahl erreicht', icon: '🥂', rarity: 'rare', earnedTogether: true },
  { id: 'team_spiegel', title: 'Spiegelteams', description: 'Zwei Teams haben in einer Runde gespiegelte Gesamtabstände (z.B. 12g & 21g)', icon: '🪞', rarity: 'epic', earnedTogether: true },
  { id: 'team_gleichstand', title: 'Gleichstand-Könige', description: 'Ein Team hatte in 3 aufeinanderfolgenden Runden Gleichstand mit mindestens einem anderen Team', icon: '👑', rarity: 'rare', earnedTogether: true },
  { id: 'team_unschlagbar', title: 'Mehr Jungfrauen', description: 'Ein Team bekommt im gesamten Spiel keinen einzigen Strafpunkt', icon: '😇', rarity: 'legendary', earnedTogether: true },
  { id: 'team_pechvoegel', title: 'Pechvögel', description: 'Ein Team hat 3 mal im Spiel eine Schnappszahl als Gesamtabstand erreicht und dadurch Strafpunkte erhalten', icon: '🐦', rarity: 'common', earnedTogether: true },

  // Turnier Achievements
  { id: 'tournament_gold', title: 'Goldwaage', description: 'Sieger des Finales (Platz 1 im Finaltisch)', icon: '🥇', rarity: 'legendary' },
  { id: 'tournament_silver', title: 'Silberwaage', description: '2. Platz im Finale des Turniers', icon: '🥈', rarity: 'epic' },
  { id: 'tournament_bronze', title: 'Bronzewaage', description: '3. Platz im Finale des Turniers', icon: '🥉', rarity: 'rare' },
  { id: 'tournament_second_chance_finalist', title: 'Ohne Proben nach oben', description: 'Über den Second Chance Tisch ins Finale eingezogen', icon: '🔄', rarity: 'epic' },
  { id: 'tournament_second_chance_winner', title: 'Unerwarteter Favorit', description: 'War im Second Chance Tisch und hat das Turnier gewonnen', icon: '🎭', rarity: 'legendary' },
  { id: 'tournament_most_schnaepse', title: 'Hart im Nehmen', description: 'Die meisten Schnäpse im gesamten Turnier über alle Tische', icon: '🍺', rarity: 'common' },
  { id: 'tournament_schnapskoenig', title: 'Schnaps-König des Turniers', description: 'Die meisten Schnäpse im gesamten Turnier getrunken', icon: '🍻', rarity: 'epic' },
  { id: 'tournament_best_avg', title: 'Nah dran', description: 'Den kleinsten Durchschnitt über alle Tische im Turnier', icon: '🎯', rarity: 'rare' },
  { id: 'tournament_avg_better_than_rank', title: 'Weggeschnappt', description: 'Bester Durchschnitt im Turnier, aber wegen Strafpunkten schlechter als Platz 4 im Finale', icon: '😤', rarity: 'epic' },
  { id: 'tournament_tischkoenig', title: 'Final-Favorit', description: 'Niedrigster Gesamtscore aller Spieler in der Vorrunde', icon: '👑', rarity: 'epic' },
  { id: 'tournament_sauber', title: 'Sauber geblieben', description: 'Im gesamten Turnier keinen einzigen Schnaps getrunken', icon: '✨', rarity: 'epic' },
  { id: 'tournament_eiserner_wille', title: 'Eiserner Wille', description: 'Aus dem Second Chance Tisch bis ins Finale und dort unter die Top 3 gekommen', icon: '🛡️', rarity: 'epic' },
  { id: 'tournament_durchstarter', title: 'Durchstarter', description: 'Durchschnittsabstand im Finale war besser als in der Vorrunde', icon: '🚀', rarity: 'rare' },
  { id: 'tournament_konstanz', title: 'Konstanz-Monster', description: 'In allen gespielten Tischen einen Ø Abstand unter 15,0g gehabt', icon: '📏', rarity: 'epic' },
  { id: 'tournament_streber', title: 'Streber', description: 'Sowohl Vorrundentisch als auch Finaltisch gewonnen', icon: '🤓', rarity: 'legendary' },
  { id: 'tournament_dominator', title: 'Tisch-Dominator', description: 'Vorrundentisch mit mindestens 10g Vorsprung gewonnen', icon: '💥', rarity: 'epic' },
  { id: 'tournament_marathon', title: 'Marathon-Mann', description: 'Vorrunde, Second Chance und Finale gespielt', icon: '🏃', rarity: 'epic' },
  { id: 'tournament_pechvogel', title: 'Pechvogel des Turniers', description: 'Bester Ø Abstand im Finale, aber nicht gewonnen', icon: '😭', rarity: 'rare' },
  { id: 'tournament_stehauf', title: 'Stehaufmännchen', description: 'In der Vorrunde Letzter an seinem Tisch, aber im Finale nicht Letzter', icon: '🧗', rarity: 'rare' },
  { id: 'tournament_minimalist', title: 'Der Minimalist', description: 'Im Finale genau den 4. Platz belegt', icon: '🤏', rarity: 'common' },
];

export function getTeamAlternatingPlayerSequence(teams: Team[]): Array<{ playerId: string; teamId: string }> {
  const sequence: Array<{ playerId: string; teamId: string }> = [];
  if (!teams || teams.length === 0) return sequence;
  const maxTeamSize = Math.max(...teams.map(t => t.playerIds.length));
  for (let m = 0; m < maxTeamSize; m++) {
    for (let t = 0; t < teams.length; t++) {
      if (m < teams[t].playerIds.length) {
        sequence.push({
          playerId: teams[t].playerIds[m],
          teamId: teams[t].id
        });
      }
    }
  }
  return sequence;
}

export const checkAchievements = (
  players: Player[],
  rounds: Round[],
  teams: Team[] = [],
  isEndOfGame: boolean = false,
  previouslyEarned: Achievement[] = []
): Achievement[] => {
  if (teams && teams.length > 0) return [];
  if (!players || players.length === 0 || !rounds || rounds.length === 0) {
    return [];
  }

  const completedRounds = rounds.filter(r => r.results && Object.keys(r.results).length > 0);
  if (completedRounds.length === 0) return [];

  const achievementMap: Record<string, {
    id: string;
    title: string;
    description: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    earnedBy: Set<string>;
  }> = {
    // Präzision
    sharpshooter: { id: 'sharpshooter', title: 'Scharfschütze', description: '3x hintereinander unter 5g Abstand', icon: '🎯', rarity: 'rare', earnedBy: new Set() },
    bullseye_king: { id: 'bullseye_king', title: 'Volltreffer-König', description: '3x Volltreffer (exakt 0g Abstand) in einem Spiel', icon: '👑', rarity: 'epic', earnedBy: new Set() },
    millimeter: { id: 'millimeter', title: 'Millimeterarbeit', description: 'Durchschnittsabstand unter 3,5g', icon: '🔬', rarity: 'rare', earnedBy: new Set() },
    perfect_balance: { id: 'perfect_balance', title: 'Die Waage', description: 'Durchschnittsabstand exakt 0g (jede Runde Volltreffer)', icon: '⚖️', rarity: 'legendary', earnedBy: new Set() },
    drop_by_drop: { id: 'drop_by_drop', title: 'Tropfen für Tropfen', description: 'Nie mehr als 5g Abstand in einer Runde gehabt', icon: '💧', rarity: 'rare', earnedBy: new Set() },
    perfectionist: { id: 'perfectionist', title: 'Jungfrau', description: 'Das Spiel mit 0 Strafpunkten beendet', icon: '✨', rarity: 'epic', earnedBy: new Set() },
    poker_face: { id: 'poker_face', title: 'Poker Face', description: 'In 3 aufeinanderfolgenden Runden exakt denselben Abstand (±1g)', icon: '🃏', rarity: 'rare', earnedBy: new Set() },

    // Straf-Achievements
    lead_hand: { id: 'lead_hand', title: 'Bleihand', description: 'In jeder Runde den größten Abstand gehabt', icon: '🪨', rarity: 'common', earnedBy: new Set() },
    schnaepse_king: { id: 'schnaepse_king', title: 'Schnäpse-König', description: 'Die meisten Strafpunkte im Spiel', icon: '🍺', rarity: 'common', earnedBy: new Set() },
    catastrophe: { id: 'catastrophe', title: 'Katastrophe', description: 'Einmal mehr als 35g Abstand gehabt', icon: '💥', rarity: 'common', earnedBy: new Set() },
    consistently_bad: { id: 'consistently_bad', title: 'Noch kein Meister vom Himmel gefallen', description: 'Abstand in jeder Runde zwischen 15g und 25g', icon: '📉', rarity: 'common', earnedBy: new Set() },
    unlucky_bird: { id: 'unlucky_bird', title: 'Unglücksvogel', description: 'Nie den größten Abstand, aber trotzdem ≥5 Strafpunkte', icon: '🐦', rarity: 'rare', earnedBy: new Set() },
    eternal_second: { id: 'eternal_second', title: 'Ewiger Zweiter', description: 'In jeder Runde den zweitkleinsten Abstand gehabt', icon: '🥈', rarity: 'common', earnedBy: new Set() },

    // Spezial-Achievements
    twins: { id: 'twins', title: 'Zwillinge', description: 'Zwei Spieler mit exakt demselben Gewicht in 3+ Runden', icon: '👯', rarity: 'rare', earnedBy: new Set() },
    doppelganger: { id: 'doppelganger', title: 'Doppelgänger', description: 'Dasselbe Spielerpaar mit exakt demselben Gewicht in 3+ Runden', icon: '👤', rarity: 'epic', earnedBy: new Set() },
    schnapps_hunter: { id: 'schnapps_hunter', title: 'Schnappszahl-Jäger', description: 'In einem Spiel 2+ Schnappszahlen getroffen', icon: '🎯', rarity: 'rare', earnedBy: new Set() },
    triple_seven: { id: 'triple_seven', title: '777', description: 'Exakt 77g in einer Runde getroffen', icon: '🎰', rarity: 'epic', earnedBy: new Set() },
    mirror_number: { id: 'mirror_number', title: 'Spiegelzahl', description: 'Zwei Spieler mit gespiegelten Gewichten in einer Runde', icon: '🪞', rarity: 'epic', earnedBy: new Set() },
    round_number: { id: 'round_number', title: 'Runde Sache', description: 'Exakt 100g, 200g oder 300g getroffen', icon: '🔵', rarity: 'common', earnedBy: new Set() },
    so_close: { id: 'so_close', title: 'Knapp daneben', description: 'In 2+ Runden exakt 1g vom Volltreffer entfernt', icon: '😬', rarity: 'common', earnedBy: new Set() },
    outsider: { id: 'outsider', title: 'Außenseiter', description: 'In jeder Runde mindestens 10g von allen anderen entfernt', icon: '🏝️', rarity: 'rare', earnedBy: new Set() },
    shadow: { id: 'shadow', title: 'Schatten', description: 'Zwei Spieler in jeder Runde maximal 2g voneinander entfernt', icon: '👥', rarity: 'epic', earnedBy: new Set() },
    six_seven: { id: 'six_seven', title: 'Six Seven', description: 'In einer Runde exakt 67g getroffen', icon: '6️⃣7️⃣', rarity: 'rare', earnedBy: new Set() },
    four_twenty: { id: 'four_twenty', title: 'Four Twenty', description: 'In einer Runde exakt 420g getroffen', icon: '🌿', rarity: 'rare', earnedBy: new Set() },
    sixty_nine: { id: 'sixty_nine', title: '69', description: 'In einer Runde exakt 69g getroffen', icon: '♋', rarity: 'rare', earnedBy: new Set() },

    // Verlaufs-Achievements
    rising_star: { id: 'rising_star', title: 'Aufsteiger', description: 'Abstand in jeder Runde kleiner als in der vorherigen', icon: '📈', rarity: 'rare', earnedBy: new Set() },
    falling_star: { id: 'falling_star', title: 'Absteiger', description: 'Abstand in jeder Runde größer als in der vorherigen', icon: '📉', rarity: 'common', earnedBy: new Set() },
    rollercoaster: { id: 'rollercoaster', title: 'Achterbahn', description: 'Abwechselnd bester und schlechtester Spieler in ≥4 Runden', icon: '🎢', rarity: 'rare', earnedBy: new Set() },
    sandbagging: { id: 'sandbagging', title: 'Sandbagging', description: 'Erste 3 Runden der Schlechteste, am Ende Gesamtdurchschnitt < 5g', icon: '🎭', rarity: 'legendary', earnedBy: new Set() },

    // Ergebnis-Achievements
    lucky_loser: { id: 'lucky_loser', title: 'Lucky Loser', description: 'Meiste Strafpunkte, aber niedrigster Gesamtscore aller Spieler', icon: '🍀', rarity: 'rare', earnedBy: new Set() },
    comeback: { id: 'comeback', title: 'Comeback', description: 'Nach Runde 1 Letzter, am Ende das Spiel gewonnen', icon: '💪', rarity: 'epic', earnedBy: new Set() },
    equilibrium: { id: 'equilibrium', title: 'Gleichgewicht', description: 'Alle Spieler in jeder Runde unter 5g Abstand', icon: '☯️', rarity: 'legendary', earnedBy: new Set() },

    // Ansage-Achievements
    prophet: { id: 'prophet', title: 'Hellseher', description: 'Zielgewicht angesagt und selbst einen Volltreffer gelandet', icon: '🔮', rarity: 'legendary', earnedBy: new Set() },
    strategist: { id: 'strategist', title: 'Stratege', description: 'Zielgewicht angesagt und ein anderer Spieler landet einen Volltreffer', icon: '🧠', rarity: 'epic', earnedBy: new Set() },
    calculator: { id: 'calculator', title: 'Kopfrechner', description: 'Im Finale das eigene Gewicht exakt so getroffen wie angesagt (0g Abstand)', icon: '🧮', rarity: 'epic', earnedBy: new Set() },
    thirsty: { id: 'thirsty', title: 'Durstiger', description: 'In einer Runde mehr als 20g unter dem Zielgewicht gelandet', icon: '🫗', rarity: 'common', earnedBy: new Set() },
    guzzler: { id: 'guzzler', title: 'Schluckspecht', description: 'In jeder Runde unter dem Zielgewicht gelandet', icon: '🍻', rarity: 'common', earnedBy: new Set() },
  };

  const playerRoundData: Record<string, Array<{
    roundIndex: number;
    weight: number;
    target: number;
    dist: number;
    isMinDistInRound: boolean;
    isMaxDistInRound: boolean;
    isSecondMinDistInRound: boolean;
  }>> = {};

  players.forEach(p => {
    playerRoundData[p.id] = [];
  });

  completedRounds.forEach((r, rIdx) => {
    const activePlayerIdsInRound = players
      .filter(p => r.results[p.id] !== undefined)
      .map(p => p.id);

    if (activePlayerIdsInRound.length === 0) return;

    const roundDistances: Record<string, number> = {};
    activePlayerIdsInRound.forEach(pid => {
      const w = r.results[pid];
      const target = (r.isFinal && r.individualTargets) ? r.individualTargets[pid] : r.targetWeight;
      roundDistances[pid] = Math.abs(w - target);
    });

    const distValues = Object.values(roundDistances);
    const minDist = Math.min(...distValues);
    const maxDist = Math.max(...distValues);

    const sortedUniqueDists = Array.from(new Set(distValues)).sort((a, b) => a - b);
    const secondMinDist = sortedUniqueDists.length > 1 ? sortedUniqueDists[1] : null;

    activePlayerIdsInRound.forEach(pid => {
      const w = r.results[pid];
      const target = (r.isFinal && r.individualTargets) ? r.individualTargets[pid] : r.targetWeight;
      const dist = roundDistances[pid];

      playerRoundData[pid].push({
        roundIndex: rIdx,
        weight: w,
        target,
        dist,
        isMinDistInRound: dist === minDist,
        isMaxDistInRound: dist === maxDist,
        isSecondMinDistInRound: secondMinDist !== null && dist === secondMinDist,
      });
    });
  });

  // Check player-specific achievements
  players.forEach(p => {
    const pData = playerRoundData[p.id] || [];
    if (pData.length === 0) return;

    // --- 1) Precision & Event Achievements (Counted for all players during their active rounds) ---
    let currStreak = 0;
    let maxStreak = 0;
    pData.forEach(d => {
      if (d.dist < 5) {
        currStreak++;
        if (currStreak > maxStreak) maxStreak = currStreak;
      } else {
        currStreak = 0;
      }
    });
    if (maxStreak >= 3) achievementMap.sharpshooter.earnedBy.add(p.name);

    const exactHitsCount = pData.filter(d => d.dist === 0).length;
    if (exactHitsCount >= 3) achievementMap.bullseye_king.earnedBy.add(p.name);

    for (let i = 0; i <= pData.length - 3; i++) {
      const d1 = pData[i].dist;
      const d2 = pData[i + 1].dist;
      const d3 = pData[i + 2].dist;
      if (Math.max(d1, d2, d3) - Math.min(d1, d2, d3) <= 1) {
        achievementMap.poker_face.earnedBy.add(p.name);
        break;
      }
    }

    if (pData.some(d => d.dist > 35)) {
      achievementMap.catastrophe.earnedBy.add(p.name);
    }

    const schnapsCount = pData.filter(d => SPECIAL_NUMBERS.includes(d.weight)).length;
    if (schnapsCount >= 2) achievementMap.schnapps_hunter.earnedBy.add(p.name);

    if (pData.some(d => d.weight === 77)) {
      achievementMap.triple_seven.earnedBy.add(p.name);
    }

    if (pData.some(d => d.weight === 67)) {
      achievementMap.six_seven.earnedBy.add(p.name);
    }

    if (pData.some(d => d.weight === 420)) {
      achievementMap.four_twenty.earnedBy.add(p.name);
    }

    if (pData.some(d => d.weight === 69)) {
      achievementMap.sixty_nine.earnedBy.add(p.name);
    }

    if (pData.some(d => [100, 200, 300].includes(d.weight))) {
      achievementMap.round_number.earnedBy.add(p.name);
    }

    const closeCount = pData.filter(d => d.dist === 1).length;
    if (closeCount >= 2) achievementMap.so_close.earnedBy.add(p.name);

    if (pData.some(d => d.weight < d.target - 20)) {
      achievementMap.thirsty.earnedBy.add(p.name);
    }

    completedRounds.forEach(r => {
      if (r.announcingPlayerId === p.id) {
        // RÜCKWÄRTSKOMPATIBILITÄT / FINALE AUSSCHLIESSEN:
        // Hellseher (prophet) und Stratege (strategist) werden im Finale nicht vergeben.
        if (r.isFinal) return;

        const pWeight = r.results[p.id];
        const pTarget = (r.isFinal && r.individualTargets) ? r.individualTargets[p.id] : r.targetWeight;
        if (pWeight !== undefined && Math.abs(pWeight - pTarget) === 0) {
          achievementMap.prophet.earnedBy.add(p.name);
        }

        const someoneElseExactHit = players.some(other => {
          if (other.id === p.id) return false;
          const ow = r.results[other.id];
          if (ow === undefined) return false;
          const ot = (r.isFinal && r.individualTargets) ? r.individualTargets[other.id] : r.targetWeight;
          return Math.abs(ow - ot) === 0;
        });

        if (someoneElseExactHit) {
          achievementMap.strategist.earnedBy.add(p.name);
        }
      }

      if (r.isFinal && r.individualTargets && r.individualTargets[p.id] !== undefined && r.results[p.id] !== undefined) {
        const estDist = Math.abs(r.results[p.id] - r.individualTargets[p.id]);
        if (estDist === 0) {
          achievementMap.calculator.earnedBy.add(p.name);
        }
      }
    });

    // --- 2) End-of-Game Precision Achievements (active rounds evaluated at end of game) ---
    if (isEndOfGame) {
      const avgDist = pData.reduce((acc, d) => acc + d.dist, 0) / pData.length;

      // Korrektur 1: "Tropfen für Tropfen" (drop_by_drop)
      // Checks if distance in EVERY round played by the player was <= 5g.
      if (pData.length >= 1 && pData.every(d => d.dist <= 5)) {
        achievementMap.drop_by_drop.earnedBy.add(p.name);
      }

      if (avgDist < 3.5) {
        achievementMap.millimeter.earnedBy.add(p.name);
      }

      if (pData.every(d => d.dist === 0)) {
        achievementMap.perfect_balance.earnedBy.add(p.name);
      }

      // --- 3) Full Game Achievements (EXCLUDE disqualified players) ---
      if (!p.isDisqualified) {
        if (p.schnaepse === 0) {
          achievementMap.perfectionist.earnedBy.add(p.name);
        }

        if (pData.length === completedRounds.length && pData.every(d => d.isMaxDistInRound)) {
          achievementMap.lead_hand.earnedBy.add(p.name);
        }

        if (pData.length === completedRounds.length && pData.every(d => d.dist >= 15 && d.dist <= 25)) {
          achievementMap.consistently_bad.earnedBy.add(p.name);
        }

        if (p.schnaepse >= 5 && pData.every(d => !d.isMaxDistInRound)) {
          achievementMap.unlucky_bird.earnedBy.add(p.name);
        }

        if (pData.length === completedRounds.length && pData.every(d => d.isSecondMinDistInRound)) {
          achievementMap.eternal_second.earnedBy.add(p.name);
        }

        if (pData.length === completedRounds.length && pData.every(d => d.weight < d.target)) {
          achievementMap.guzzler.earnedBy.add(p.name);
        }

        if (pData.length === completedRounds.length) {
          const isOutsiderInAll = completedRounds.every(r => {
            const pW = r.results[p.id];
            if (pW === undefined) return true;
            return Object.entries(r.results).every(([otherId, otherW]) => {
              if (otherId === p.id) return true;
              return Math.abs(pW - otherW) >= 10;
            });
          });
          if (isOutsiderInAll) {
            achievementMap.outsider.earnedBy.add(p.name);
          }
        }

        if (pData.length === completedRounds.length && pData.length >= 2) {
          let isRising = true;
          for (let i = 1; i < pData.length; i++) {
            if (pData[i].dist >= pData[i - 1].dist) {
              isRising = false;
              break;
            }
          }
          if (isRising) achievementMap.rising_star.earnedBy.add(p.name);
        }

        if (pData.length === completedRounds.length && pData.length >= 2) {
          let isFalling = true;
          for (let i = 1; i < pData.length; i++) {
            if (pData[i].dist <= pData[i - 1].dist) {
              isFalling = false;
              break;
            }
          }
          if (isFalling) achievementMap.falling_star.earnedBy.add(p.name);
        }

        if (pData.length >= 4) {
          for (let i = 0; i <= pData.length - 4; i++) {
            const slice = pData.slice(i, i + 4);
            const isBW = slice[0].isMinDistInRound && slice[1].isMaxDistInRound && slice[2].isMinDistInRound && slice[3].isMaxDistInRound;
            const isWB = slice[0].isMaxDistInRound && slice[1].isMinDistInRound && slice[2].isMaxDistInRound && slice[3].isMinDistInRound;
            if (isBW || isWB) {
              achievementMap.rollercoaster.earnedBy.add(p.name);
              break;
            }
          }
        }

        if (pData.length >= 3 && pData[0].isMaxDistInRound && pData[1].isMaxDistInRound && pData[2].isMaxDistInRound && avgDist < 5.0) {
          achievementMap.sandbagging.earnedBy.add(p.name);
        }
      }
    }
  });

  // Pairwise achievements (Zwillinge, Doppelgänger, Spiegelzahl, Schatten)
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const p1 = players[i];
      const p2 = players[j];

      let sameWeightRoundsCount = 0;
      completedRounds.forEach(r => {
        if (r.results[p1.id] !== undefined && r.results[p2.id] !== undefined) {
          if (r.results[p1.id] === r.results[p2.id]) {
            sameWeightRoundsCount++;
          }
        }
      });

      if (sameWeightRoundsCount >= 3) {
        achievementMap.twins.earnedBy.add(p1.name);
        achievementMap.twins.earnedBy.add(p2.name);
        achievementMap.doppelganger.earnedBy.add(p1.name);
        achievementMap.doppelganger.earnedBy.add(p2.name);
      }

      completedRounds.forEach(r => {
        const w1 = r.results[p1.id];
        const w2 = r.results[p2.id];
        if (w1 !== undefined && w2 !== undefined) {
          const s1 = String(w1);
          const s2 = String(w2);
          if (s1.length > 1 && s1 !== s2 && s1 === s2.split('').reverse().join('')) {
            achievementMap.mirror_number.earnedBy.add(p1.name);
            achievementMap.mirror_number.earnedBy.add(p2.name);
          }
        }
      });

      if (isEndOfGame && !p1.isDisqualified && !p2.isDisqualified && completedRounds.length >= 1) {
        const isShadowAll = completedRounds.every(r => {
          const w1 = r.results[p1.id];
          const w2 = r.results[p2.id];
          if (w1 === undefined || w2 === undefined) return false;
          return Math.abs(w1 - w2) <= 2;
        });
        if (isShadowAll) {
          achievementMap.shadow.earnedBy.add(p1.name);
          achievementMap.shadow.earnedBy.add(p2.name);
        }
      }
    }
  }

  // End of game group achievements (Schnäpse-König, Lucky Loser, Comeback, Gleichgewicht)
  if (isEndOfGame) {
    const nonDisqualifiedPlayers = players.filter(p => !p.isDisqualified);
    const candidatePlayers = nonDisqualifiedPlayers.length > 0 ? nonDisqualifiedPlayers : players;

    const maxSchnaepse = Math.max(...candidatePlayers.map(p => p.schnaepse));
    if (maxSchnaepse > 0) {
      candidatePlayers.filter(p => p.schnaepse === maxSchnaepse).forEach(p => {
        achievementMap.schnaepse_king.earnedBy.add(p.name);
      });
    }

    const playerTotalScores = candidatePlayers.map(p => {
      const pData = playerRoundData[p.id] || [];
      const avg = pData.length > 0 ? pData.reduce((acc, d) => acc + d.dist, 0) / pData.length : 0;
      return {
        id: p.id,
        name: p.name,
        avgDist: avg,
        schnaepse: p.schnaepse,
        totalScore: avg + p.schnaepse,
      };
    });

    if (playerTotalScores.length > 0) {
      const minTotalScore = Math.min(...playerTotalScores.map(p => p.totalScore));

      if (maxSchnaepse > 0) {
        playerTotalScores.forEach(p => {
          if (p.schnaepse === maxSchnaepse && p.totalScore === minTotalScore) {
            achievementMap.lucky_loser.earnedBy.add(p.name);
          }
        });
      }

      const round1Dists = candidatePlayers.map(p => {
        const d0 = playerRoundData[p.id]?.[0];
        return { name: p.name, isMax: d0 ? d0.isMaxDistInRound : false };
      });
      const worstInRound1Names = round1Dists.filter(x => x.isMax).map(x => x.name);

      playerTotalScores.forEach(p => {
        if (p.totalScore === minTotalScore && worstInRound1Names.includes(p.name)) {
          achievementMap.comeback.earnedBy.add(p.name);
        }
      });
    }

    const allRoundsUnder5g = completedRounds.every(r => {
      return Object.entries(r.results).every(([pid, w]) => {
        const target = (r.isFinal && r.individualTargets) ? r.individualTargets[pid] : r.targetWeight;
        return Math.abs(w - target) < 5;
      });
    });

    if (allRoundsUnder5g) {
      candidatePlayers.forEach(p => {
        achievementMap.equilibrium.earnedBy.add(p.name);
      });
    }
  }

  const newlyUnlockedAchievements: Achievement[] = [];

  Object.values(achievementMap).forEach(def => {
    if (def.earnedBy.size === 0) return;

    const alreadyEarnedNames = new Set<string>();
    previouslyEarned.forEach(prev => {
      if (prev.id === def.id && prev.earnedBy) {
        prev.earnedBy.forEach(name => alreadyEarnedNames.add(name));
      }
    });

    const brandNewEarnedNames = Array.from(def.earnedBy).filter(name => !alreadyEarnedNames.has(name));

    if (brandNewEarnedNames.length > 0) {
      const isTogether = TOGETHER_ACHIEVEMENT_IDS.includes(def.id);
      newlyUnlockedAchievements.push({
        id: def.id,
        title: def.title,
        description: def.description,
        icon: def.icon,
        rarity: def.rarity,
        earnedBy: brandNewEarnedNames,
        ...(isTogether ? { earnedTogether: true } : {})
      });
    }
  });

  return newlyUnlockedAchievements;
};

export const checkSpeedAchievements = (
  playerName: string,
  levels: number,
  speedTargets: Record<number, string>,
  speedResults: Record<number, string>,
  startTime: number | null,
  endTime: number | null,
  previouslyEarned: Achievement[] = []
): Achievement[] => {
  if (!startTime || !endTime || levels <= 0) return [];
  const totalSeconds = (endTime - startTime) / 1000;

  const levelKeys = Array.from({ length: levels }, (_, i) => i + 1);
  const diffs: number[] = [];
  let totalDiff = 0;

  for (const k of levelKeys) {
    const target = parseInt(speedTargets[k]) || 0;
    const result = parseInt(speedResults[k]) || 0;
    const diff = Math.abs(result - target);
    diffs.push(diff);
    totalDiff += diff;
  }

  const avgDiff = totalDiff / levels;
  const earnedSet = new Set<string>();

  // 1. speed_blitzpraezise
  if (avgDiff < 3 && totalSeconds < 90) earnedSet.add('speed_blitzpraezise');

  // 2. speed_zeitlos
  if (diffs.every(d => d < 2)) earnedSet.add('speed_zeitlos');

  // 3. speed_stufenmeister
  if (diffs.length > 1 && diffs.every((d, i) => i === 0 || d <= diffs[i - 1])) {
    earnedSet.add('speed_stufenmeister');
  }

  // 4. speed_steigerungsmeister
  if (diffs.length > 1 && diffs.every((d, i) => i === 0 || d < diffs[i - 1])) {
    earnedSet.add('speed_steigerungsmeister');
  }

  // 5. speed_nullsumme
  if (diffs.filter(d => d === 0).length >= 2) earnedSet.add('speed_nullsumme');

  // 6. speed_roboter
  if (diffs.every(d => d < 3)) earnedSet.add('speed_roboter');

  // 7. speed_speedstar
  if (totalSeconds < 60) earnedSet.add('speed_speedstar');

  // 8. speed_hastig
  if (totalSeconds < 50) earnedSet.add('speed_hastig');

  // 9. speed_gemuetlich
  if (totalSeconds > 150 && avgDiff < 5) earnedSet.add('speed_gemuetlich');

  // 10. speed_warmup
  if (diffs.length >= 2) {
    const maxDiff = Math.max(...diffs);
    const minDiff = Math.min(...diffs);
    if (diffs[0] === maxDiff && diffs[diffs.length - 1] === minDiff && diffs[0] > diffs[diffs.length - 1]) {
      earnedSet.add('speed_warmup');
    }
  }

  // 11. speed_kaltstart
  if (diffs.length >= 2) {
    const maxDiff = Math.max(...diffs);
    const minDiff = Math.min(...diffs);
    if (diffs[0] === minDiff && diffs[diffs.length - 1] === maxDiff && diffs[0] < diffs[diffs.length - 1]) {
      earnedSet.add('speed_kaltstart');
    }
  }

  // 12. speed_spiegellaeufer
  for (let i = 1; i < diffs.length; i++) {
    const d1 = diffs[i - 1];
    const d2 = diffs[i];
    if (d1 >= 10 && d2 >= 10 && d1 !== d2) {
      const s1 = d1.toString();
      const s2Rev = d2.toString().split('').reverse().join('');
      if (s1 === s2Rev) {
        earnedSet.add('speed_spiegellaeufer');
        break;
      }
    }
  }

  // 13. speed_gleichlauf
  if (diffs.length > 1 && diffs.every(d => d === diffs[0])) {
    earnedSet.add('speed_gleichlauf');
  }

  // 14. speed_schnappsstufe
  if (diffs.filter(d => SPECIAL_NUMBERS.includes(d)).length >= 2) {
    earnedSet.add('speed_schnappsstufe');
  }

  // 15. speed_maxattack
  if (diffs.every(d => d === 0)) earnedSet.add('speed_maxattack');

  const brandNew: Achievement[] = [];
  earnedSet.forEach(id => {
    const def = MASTER_ACHIEVEMENTS_DEFINITIONS.find(a => a.id === id);
    if (!def) return;
    const alreadyEarned = previouslyEarned.some(p => p.id === id && p.earnedBy?.includes(playerName));
    if (!alreadyEarned) {
      brandNew.push({
        id: def.id,
        title: def.title,
        description: def.description,
        icon: def.icon,
        rarity: def.rarity as any,
        earnedBy: [playerName]
      });
    }
  });

  return brandNew;
};

export const checkTeamAchievements = (
  teams: Team[],
  players: Player[],
  rounds: Round[],
  isEndOfGame: boolean = false,
  previouslyEarned: Achievement[] = []
): Achievement[] => {
  if (!teams || teams.length === 0 || !rounds || rounds.length === 0) return [];

  const completedRounds = rounds.filter(r => r.results && Object.keys(r.results).length > 0);
  if (completedRounds.length === 0) return [];

  const teamEarnedMap: Record<string, Set<string>> = {};
  teams.forEach(t => { teamEarnedMap[t.id] = new Set<string>(); });

  const playerMap = new Map<string, string>();
  players.forEach(p => playerMap.set(p.id, p.name));

  const teamRoundStats: Array<Record<string, { rawOffsetSum: number; absDist: number; playerDiffs: number[] }>> = [];

  completedRounds.forEach(r => {
    const statsThisRound: Record<string, { rawOffsetSum: number; absDist: number; playerDiffs: number[] }> = {};
    teams.forEach(t => {
      let rawSum = 0;
      const pDiffs: number[] = [];
      t.playerIds.forEach(pid => {
        const val = r.results[pid] || 0;
        const diff = val - r.targetWeight;
        rawSum += diff;
        pDiffs.push(Math.abs(diff));
      });
      statsThisRound[t.id] = {
        rawOffsetSum: rawSum,
        absDist: Math.abs(rawSum),
        playerDiffs: pDiffs
      };
    });
    teamRoundStats.push(statsThisRound);
  });

  teams.forEach(t => {
    const tSet = teamEarnedMap[t.id];

    // 1. team_traumteam
    const hasTraumteam = teamRoundStats.some(s => s[t.id] && s[t.id].playerDiffs.every(d => d < 5));
    if (hasTraumteam) tSet.add('team_traumteam');

    // 2. team_perfekt
    const hasPerfekt = teamRoundStats.some(s => s[t.id] && s[t.id].absDist === 0);
    if (hasPerfekt) tSet.add('team_perfekt');

    // 3. team_ausgleich
    if (hasPerfekt) tSet.add('team_ausgleich');

    // 4. team_synchron
    const hasSynchron = completedRounds.some(r => {
      const vals = t.playerIds.map(pid => r.results[pid]);
      return vals.length > 0 && vals.every(v => v === vals[0]);
    });
    if (hasSynchron) tSet.add('team_synchron');

    // 5. team_rueckendeckung
    const hasRueckendeckung = teamRoundStats.some(s => {
      const st = s[t.id];
      if (!st) return false;
      return st.absDist === 0 && st.playerDiffs.some(d => d > 20);
    });
    if (hasRueckendeckung) tSet.add('team_rueckendeckung');

    // 8. team_champions
    const allAbsDists = teamRoundStats.map(s => s[t.id]?.absDist || 0);
    if (allAbsDists.length > 0) {
      const avgDist = allAbsDists.reduce((sum, d) => sum + d, 0) / allAbsDists.length;
      if (allAbsDists.every(d => Math.abs(d - avgDist) <= 5)) {
        tSet.add('team_champions');
      }
    }

    // 10. team_schnapps
    for (let rIdx = 1; rIdx < teamRoundStats.length; rIdx++) {
      const d1 = teamRoundStats[rIdx - 1][t.id]?.absDist;
      const d2 = teamRoundStats[rIdx][t.id]?.absDist;
      if (d1 !== undefined && d2 !== undefined && SPECIAL_NUMBERS.includes(d1) && SPECIAL_NUMBERS.includes(d2)) {
        tSet.add('team_schnapps');
        break;
      }
    }

    // 12. team_gleichstand
    if (teams.length > 1 && teamRoundStats.length >= 3) {
      for (let rIdx = 2; rIdx < teamRoundStats.length; rIdx++) {
        const checkRound = (idx: number) => {
          const myDist = teamRoundStats[idx][t.id]?.absDist;
          return teams.some(otherT => otherT.id !== t.id && teamRoundStats[idx][otherT.id]?.absDist === myDist);
        };
        if (checkRound(rIdx - 2) && checkRound(rIdx - 1) && checkRound(rIdx)) {
          tSet.add('team_gleichstand');
          break;
        }
      }
    }

    // 14. team_pechvoegel
    const schnappsCount = allAbsDists.filter(d => SPECIAL_NUMBERS.includes(d)).length;
    if (schnappsCount >= 3) tSet.add('team_pechvoegel');

    if (isEndOfGame) {
      const sortedTeams = [...teams].sort((a, b) => a.points - b.points);
      const isWinner = sortedTeams[0]?.id === t.id;

      // 6. team_taktiker
      if (isWinner) {
        const hadLowestSingleInAnyRound = completedRounds.some(r => {
          const allPlayerDiffsInRound: number[] = [];
          players.forEach(p => {
            allPlayerDiffsInRound.push(Math.abs((r.results[p.id] || 0) - r.targetWeight));
          });
          const minSingleDiff = Math.min(...allPlayerDiffsInRound);
          const tMemberDiffs = t.playerIds.map(pid => Math.abs((r.results[pid] || 0) - r.targetWeight));
          return tMemberDiffs.includes(minSingleDiff);
        });
        if (!hadLowestSingleInAnyRound) tSet.add('team_taktiker');
      }

      // 7. team_underdog
      if (isWinner && teamRoundStats.length >= 2) {
        const halfRounds = Math.floor(teamRoundStats.length / 2);
        const pointsAtHalf: Record<string, number> = {};
        teams.forEach(tm => { pointsAtHalf[tm.id] = 0; });

        for (let rIdx = 0; rIdx < halfRounds; rIdx++) {
          const stats = teamRoundStats[rIdx];
          const dists = teams.map(tm => stats[tm.id]?.absDist || 0);
          const maxD = Math.max(...dists);
          teams.forEach(tm => {
            if (stats[tm.id]?.absDist === maxD) pointsAtHalf[tm.id] += 1;
            if (SPECIAL_NUMBERS.includes(stats[tm.id]?.absDist || -1)) pointsAtHalf[tm.id] += 1;
          });
        }
        const sortedByPointsAtHalf = [...teams].sort((a, b) => pointsAtHalf[b.id] - pointsAtHalf[a.id]);
        if (sortedByPointsAtHalf[0]?.id === t.id) {
          tSet.add('team_underdog');
        }
      }

      // 9. team_nerven
      if (isWinner && teamRoundStats.length >= 2) {
        const pointsBeforeLast: Record<string, number> = {};
        teams.forEach(tm => { pointsBeforeLast[tm.id] = 0; });
        for (let rIdx = 0; rIdx < teamRoundStats.length - 1; rIdx++) {
          const stats = teamRoundStats[rIdx];
          const dists = teams.map(tm => stats[tm.id]?.absDist || 0);
          const maxD = Math.max(...dists);
          teams.forEach(tm => {
            if (stats[tm.id]?.absDist === maxD) pointsBeforeLast[tm.id] += 1;
            if (SPECIAL_NUMBERS.includes(stats[tm.id]?.absDist || -1)) pointsBeforeLast[tm.id] += 1;
          });
        }
        const sortedBeforeLast = [...teams].sort((a, b) => pointsBeforeLast[b.id] - pointsBeforeLast[a.id]);
        if (sortedBeforeLast[0]?.id === t.id) {
          tSet.add('team_nerven');
        }
      }

      // 13. team_unschlagbar
      if (t.points === 0) tSet.add('team_unschlagbar');
    }
  });

  // 11. team_spiegel
  if (teams.length >= 2) {
    teamRoundStats.forEach(stats => {
      const teamIds = teams.map(tm => tm.id);
      for (let i = 0; i < teamIds.length; i++) {
        for (let j = i + 1; j < teamIds.length; j++) {
          const d1 = stats[teamIds[i]]?.absDist;
          const d2 = stats[teamIds[j]]?.absDist;
          if (d1 !== undefined && d2 !== undefined && d1 >= 10 && d2 >= 10 && d1 !== d2) {
            const s1 = d1.toString();
            const s2Rev = d2.toString().split('').reverse().join('');
            if (s1 === s2Rev) {
              teamEarnedMap[teamIds[i]].add('team_spiegel');
              teamEarnedMap[teamIds[j]].add('team_spiegel');
            }
          }
        }
      }
    });
  }

  const brandNew: Achievement[] = [];

  teams.forEach(t => {
    const tSet = teamEarnedMap[t.id];
    const memberNames = t.playerIds.map(pid => playerMap.get(pid) || pid).filter(Boolean);

    tSet.forEach(achId => {
      const def = MASTER_ACHIEVEMENTS_DEFINITIONS.find(a => a.id === achId);
      if (!def) return;

      const alreadyEarned = previouslyEarned.some(p => p.id === achId && memberNames.every(m => p.earnedBy?.includes(m)));
      if (!alreadyEarned) {
        const existingInBrandNew = brandNew.find(b => b.id === achId);
        if (existingInBrandNew) {
          memberNames.forEach(m => {
            if (!existingInBrandNew.earnedBy.includes(m)) existingInBrandNew.earnedBy.push(m);
          });
        } else {
          brandNew.push({
            id: def.id,
            title: def.title,
            description: def.description,
            icon: def.icon,
            rarity: def.rarity as any,
            earnedBy: [...memberNames],
            earnedTogether: true
          });
        }
      }
    });
  });

  return brandNew;
};
