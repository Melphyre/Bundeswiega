import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { MASTER_ACHIEVEMENTS_DEFINITIONS } from '../achievementsData';

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type AchievementCategory = 
  | 'precision'
  | 'penalty'
  | 'special'
  | 'progress'
  | 'result'
  | 'announcement'
  | 'speed'
  | 'team'
  | 'tournament';

export interface AdminAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  condition: string;
  category: AchievementCategory;
  categoryLabel: string;
  earnedTogether?: boolean;
  isCustomized?: boolean;
  updatedAt?: string;
}

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  precision: '🎯 Präzision',
  penalty: '🪨 Strafen',
  special: '✨ Spezial',
  progress: '📈 Verlauf',
  result: '🏆 Ergebnis',
  announcement: '🔮 Ansage',
  speed: '⚡ Speedwiegen',
  team: '👥 Teamwiegen',
  tournament: '🥇 Turnier'
};

export const RARITY_LABELS: Record<AchievementRarity, string> = {
  common: 'Gewöhnlich',
  rare: 'Selten',
  epic: 'Episch',
  legendary: 'Legendär'
};

// Standard-Auslösebedingungen & Kategorien für alle 86 Achievements
export const DEFAULT_ACHIEVEMENTS_CATALOG: AdminAchievement[] = [
  // --- Präzision ---
  {
    id: 'sharpshooter',
    title: 'Scharfschütze',
    description: '3x hintereinander unter 5g Abstand',
    icon: '🎯',
    rarity: 'rare',
    condition: 'streak(dist < 5g) >= 3',
    category: 'precision',
    categoryLabel: CATEGORY_LABELS.precision
  },
  {
    id: 'bullseye_king',
    title: 'Volltreffer-König',
    description: '3x Volltreffer (exakt 0g Abstand) in einem Spiel',
    icon: '👑',
    rarity: 'epic',
    condition: 'count(dist == 0g) >= 3',
    category: 'precision',
    categoryLabel: CATEGORY_LABELS.precision
  },
  {
    id: 'millimeter',
    title: 'Millimeterarbeit',
    description: 'Durchschnittsabstand unter 3,5g',
    icon: '🔬',
    rarity: 'rare',
    condition: 'end_of_game && avg_dist < 3.5g',
    category: 'precision',
    categoryLabel: CATEGORY_LABELS.precision
  },
  {
    id: 'perfect_balance',
    title: 'Die Waage',
    description: 'Durchschnittsabstand exakt 0g (jede Runde Volltreffer)',
    icon: '⚖️',
    rarity: 'legendary',
    condition: 'end_of_game && all_rounds(dist == 0g)',
    category: 'precision',
    categoryLabel: CATEGORY_LABELS.precision
  },
  {
    id: 'drop_by_drop',
    title: 'Tropfen für Tropfen',
    description: 'Nie mehr als 5g Abstand in einer Runde gehabt',
    icon: '💧',
    rarity: 'rare',
    condition: 'end_of_game && all_rounds(dist <= 5g)',
    category: 'precision',
    categoryLabel: CATEGORY_LABELS.precision
  },
  {
    id: 'perfectionist',
    title: 'Jungfrau',
    description: 'Das Spiel mit 0 Strafpunkten beendet',
    icon: '✨',
    rarity: 'epic',
    condition: 'end_of_game && schnaepse == 0 && !isDisqualified',
    category: 'precision',
    categoryLabel: CATEGORY_LABELS.precision
  },
  {
    id: 'poker_face',
    title: 'Poker Face',
    description: 'In 3 aufeinanderfolgenden Runden exakt denselben Abstand (±1g)',
    icon: '🃏',
    rarity: 'rare',
    condition: 'consecutive_rounds(max(dist) - min(dist) <= 1g) == 3',
    category: 'precision',
    categoryLabel: CATEGORY_LABELS.precision
  },

  // --- Straf-Achievements ---
  {
    id: 'lead_hand',
    title: 'Bleihand',
    description: 'In jeder Runde den größten Abstand gehabt',
    icon: '🪨',
    rarity: 'common',
    condition: 'all_rounds(isMaxDistInRound == true)',
    category: 'penalty',
    categoryLabel: CATEGORY_LABELS.penalty
  },
  {
    id: 'schnaepse_king',
    title: 'Schnäpse-König',
    description: 'Die meiste Strafpunkte im Spiel',
    icon: '🍺',
    rarity: 'common',
    condition: 'end_of_game && max(schnaepse) in game',
    category: 'penalty',
    categoryLabel: CATEGORY_LABELS.penalty
  },
  {
    id: 'catastrophe',
    title: 'Katastrophe',
    description: 'Einmal mehr als 35g Abstand gehabt',
    icon: '💥',
    rarity: 'common',
    condition: 'any_round(dist > 35g)',
    category: 'penalty',
    categoryLabel: CATEGORY_LABELS.penalty
  },
  {
    id: 'consistently_bad',
    title: 'Noch kein Meister vom Himmel gefallen',
    description: 'Abstand in jeder Runde zwischen 15g und 25g',
    icon: '📉',
    rarity: 'common',
    condition: 'all_rounds(dist >= 15g && dist <= 25g)',
    category: 'penalty',
    categoryLabel: CATEGORY_LABELS.penalty
  },
  {
    id: 'unlucky_bird',
    title: 'Unglücksvogel',
    description: 'Nie den größten Abstand, aber trotzdem ≥5 Strafpunkte',
    icon: '🐦',
    rarity: 'rare',
    condition: 'schnaepse >= 5 && all_rounds(!isMaxDistInRound)',
    category: 'penalty',
    categoryLabel: CATEGORY_LABELS.penalty
  },
  {
    id: 'eternal_second',
    title: 'Ewiger Zweiter',
    description: 'In jeder Runde den zweitkleinsten Abstand gehabt',
    icon: '🥈',
    rarity: 'common',
    condition: 'all_rounds(isSecondMinDistInRound == true)',
    category: 'penalty',
    categoryLabel: CATEGORY_LABELS.penalty
  },

  // --- Spezial-Achievements ---
  {
    id: 'twins',
    title: 'Zwillinge',
    description: 'Zwei Spieler mit exakt demselben Gewicht in 3+ Runden',
    icon: '👯',
    rarity: 'rare',
    condition: 'count_rounds(playerA.weight == playerB.weight) >= 3',
    category: 'special',
    categoryLabel: CATEGORY_LABELS.special,
    earnedTogether: true
  },
  {
    id: 'doppelganger',
    title: 'Doppelgänger',
    description: 'Dasselbe Spielerpaar mit exakt demselben Gewicht in 3+ Runden',
    icon: '👤',
    rarity: 'epic',
    condition: 'same_pair_rounds(playerA.weight == playerB.weight) >= 3',
    category: 'special',
    categoryLabel: CATEGORY_LABELS.special,
    earnedTogether: true
  },
  {
    id: 'schnapps_hunter',
    title: 'Schnappszahl-Jäger',
    description: 'In einem Spiel 2+ Schnappszahlen getroffen',
    icon: '🎯',
    rarity: 'rare',
    condition: 'count(weight in [11,22,33,44,55,66,77,88,99,...]) >= 2',
    category: 'special',
    categoryLabel: CATEGORY_LABELS.special
  },
  {
    id: 'triple_seven',
    title: '777',
    description: 'Exakt 77g in einer Runde getroffen',
    icon: '🎰',
    rarity: 'epic',
    condition: 'any_round(weight == 77g)',
    category: 'special',
    categoryLabel: CATEGORY_LABELS.special
  },
  {
    id: 'mirror_number',
    title: 'Spiegelzahl',
    description: 'Zwei Spieler mit gespiegelten Gewichten in einer Runde',
    icon: '🪞',
    rarity: 'epic',
    condition: 'reverse_digits(weightA) == weightB && weightA != weightB',
    category: 'special',
    categoryLabel: CATEGORY_LABELS.special,
    earnedTogether: true
  },
  {
    id: 'round_number',
    title: 'Runde Sache',
    description: 'Exakt 100g, 200g oder 300g getroffen',
    icon: '🔵',
    rarity: 'common',
    condition: 'any_round(weight in [100, 200, 300])',
    category: 'special',
    categoryLabel: CATEGORY_LABELS.special
  },
  {
    id: 'so_close',
    title: 'Knapp daneben',
    description: 'In 2+ Runden exakt 1g vom Volltreffer entfernt',
    icon: '😬',
    rarity: 'common',
    condition: 'count(dist == 1g) >= 2',
    category: 'special',
    categoryLabel: CATEGORY_LABELS.special
  },
  {
    id: 'outsider',
    title: 'Außenseiter',
    description: 'In jeder Runde mindestens 10g von allen anderen entfernt',
    icon: '🏝️',
    rarity: 'rare',
    condition: 'all_rounds(min_diff_to_others >= 10g)',
    category: 'special',
    categoryLabel: CATEGORY_LABELS.special
  },
  {
    id: 'shadow',
    title: 'Schatten',
    description: 'Zwei Spieler in jeder Runde maximal 2g voneinander entfernt',
    icon: '👥',
    rarity: 'epic',
    condition: 'all_rounds(abs(weightA - weightB) <= 2g)',
    category: 'special',
    categoryLabel: CATEGORY_LABELS.special,
    earnedTogether: true
  },
  {
    id: 'six_seven',
    title: 'Six Seven',
    description: 'In einer Runde exakt 67g getroffen',
    icon: '6️⃣7️⃣',
    rarity: 'rare',
    condition: 'any_round(weight == 67g)',
    category: 'special',
    categoryLabel: CATEGORY_LABELS.special
  },
  {
    id: 'four_twenty',
    title: 'Four Twenty',
    description: 'In einer Runde exakt 420g getroffen',
    icon: '🌿',
    rarity: 'rare',
    condition: 'any_round(weight == 420g)',
    category: 'special',
    categoryLabel: CATEGORY_LABELS.special
  },
  {
    id: 'sixty_nine',
    title: '69',
    description: 'In einer Runde exakt 69g getroffen',
    icon: '♋',
    rarity: 'rare',
    condition: 'any_round(weight == 69g)',
    category: 'special',
    categoryLabel: CATEGORY_LABELS.special
  },

  // --- Verlaufs-Achievements ---
  {
    id: 'rising_star',
    title: 'Aufsteiger',
    description: 'Abstand in jeder Runde kleiner als in der vorherigen',
    icon: '📈',
    rarity: 'rare',
    condition: 'strictly_decreasing(dist) && rounds >= 2',
    category: 'progress',
    categoryLabel: CATEGORY_LABELS.progress
  },
  {
    id: 'falling_star',
    title: 'Absteiger',
    description: 'Abstand in jeder Runde größer als in der vorherigen',
    icon: '📉',
    rarity: 'common',
    condition: 'strictly_increasing(dist) && rounds >= 2',
    category: 'progress',
    categoryLabel: CATEGORY_LABELS.progress
  },
  {
    id: 'rollercoaster',
    title: 'Achterbahn',
    description: 'Abwechselnd bester und schlechtester Spieler in ≥4 Runden',
    icon: '🎢',
    rarity: 'rare',
    condition: 'alternating(isMinDist, isMaxDist) >= 4',
    category: 'progress',
    categoryLabel: CATEGORY_LABELS.progress
  },
  {
    id: 'sandbagging',
    title: 'Sandbagging',
    description: 'Erste 3 Runden der Schlechteste, am Ende Gesamtdurchschnitt < 5g',
    icon: '🎭',
    rarity: 'legendary',
    condition: 'first_3_rounds(isMaxDist) && avg_dist < 5.0g',
    category: 'progress',
    categoryLabel: CATEGORY_LABELS.progress
  },

  // --- Ergebnis-Achievements ---
  {
    id: 'lucky_loser',
    title: 'Lucky Loser',
    description: 'Meiste Strafpunkte, aber niedrigster Gesamtscore aller Spieler',
    icon: '🍀',
    rarity: 'rare',
    condition: 'schnaepse == max(schnaepse) && total_score == min(total_score)',
    category: 'result',
    categoryLabel: CATEGORY_LABELS.result
  },
  {
    id: 'comeback',
    title: 'Comeback',
    description: 'Nach Runde 1 Letzter, am Ende das Spiel gewonnen',
    icon: '💪',
    rarity: 'epic',
    condition: 'rank_round_1 == last && rank_final == 1',
    category: 'result',
    categoryLabel: CATEGORY_LABELS.result
  },
  {
    id: 'equilibrium',
    title: 'Gleichgewicht',
    description: 'Alle Spieler in jeder Runde unter 5g Abstand',
    icon: '☯️',
    rarity: 'legendary',
    condition: 'all_players_all_rounds(dist < 5.0g)',
    category: 'result',
    categoryLabel: CATEGORY_LABELS.result,
    earnedTogether: true
  },

  // --- Ansage-Achievements ---
  {
    id: 'prophet',
    title: 'Hellseher',
    description: 'Zielgewicht angesagt und selbst einen Volltreffer gelandet',
    icon: '🔮',
    rarity: 'legendary',
    condition: 'is_announcer && !isFinal && abs(weight - target) == 0g',
    category: 'announcement',
    categoryLabel: CATEGORY_LABELS.announcement
  },
  {
    id: 'strategist',
    title: 'Stratege',
    description: 'Zielgewicht angesagt und ein anderer Spieler landet einen Volltreffer',
    icon: '🧠',
    rarity: 'epic',
    condition: 'is_announcer && !isFinal && other_player(dist == 0g)',
    category: 'announcement',
    categoryLabel: CATEGORY_LABELS.announcement
  },
  {
    id: 'calculator',
    title: 'Kopfrechner',
    description: 'Im Finale das eigene Gewicht exakt so getroffen wie angesagt (0g Abstand)',
    icon: '🧮',
    rarity: 'epic',
    condition: 'isFinal && abs(weight - individualTarget) == 0g',
    category: 'announcement',
    categoryLabel: CATEGORY_LABELS.announcement
  },
  {
    id: 'thirsty',
    title: 'Durstiger',
    description: 'In einer Runde mehr als 20g unter dem Zielgewicht gelandet',
    icon: '🫗',
    rarity: 'common',
    condition: 'any_round(weight < target - 20g)',
    category: 'announcement',
    categoryLabel: CATEGORY_LABELS.announcement
  },
  {
    id: 'guzzler',
    title: 'Schluckspecht',
    description: 'In jeder Runde unter dem Zielgewicht gelandet',
    icon: '🍻',
    rarity: 'common',
    condition: 'all_rounds(weight < target)',
    category: 'announcement',
    categoryLabel: CATEGORY_LABELS.announcement
  },

  // --- Speedwiegen Achievements ---
  {
    id: 'speed_blitzpraezise',
    title: 'Blitzpräzise',
    description: 'Unter 3g Durchschnitt UND unter 90 Sekunden Gesamtzeit',
    icon: '⚡',
    rarity: 'epic',
    condition: 'speed: avg_dist < 3.0g && total_time < 90s',
    category: 'speed',
    categoryLabel: CATEGORY_LABELS.speed
  },
  {
    id: 'speed_zeitlos',
    title: 'Zeitlos',
    description: 'Alle Stufen unter 2g Abstand, unabhängig von der Zeit',
    icon: '🎯',
    rarity: 'rare',
    condition: 'speed: all_stages(dist < 2.0g)',
    category: 'speed',
    categoryLabel: CATEGORY_LABELS.speed
  },
  {
    id: 'speed_stufenmeister',
    title: 'Stufen-Meister',
    description: 'Jede Stufe hatte einen kleineren oder gleichen Abstand als die vorherige',
    icon: '📈',
    rarity: 'rare',
    condition: 'speed: monotonic_decreasing(dist)',
    category: 'speed',
    categoryLabel: CATEGORY_LABELS.speed
  },
  {
    id: 'speed_steigerungsmeister',
    title: 'Steigerungs-Meister',
    description: 'Jede aufeinanderfolgende Stufe hatte einen strikt kleineren Abstand als die vorherige',
    icon: '🚀',
    rarity: 'epic',
    condition: 'speed: strictly_decreasing(dist)',
    category: 'speed',
    categoryLabel: CATEGORY_LABELS.speed
  },
  {
    id: 'speed_nullsumme',
    title: 'Nullsumme',
    description: 'Mindestens 2 Volltreffer (exakt 0g Abstand) in einer Speed-Runde',
    icon: '🎰',
    rarity: 'epic',
    condition: 'speed: count(dist == 0g) >= 2',
    category: 'speed',
    categoryLabel: CATEGORY_LABELS.speed
  },
  {
    id: 'speed_roboter',
    title: 'Roboter',
    description: 'In jeder Stufe unter 3g Abstand',
    icon: '🤖',
    rarity: 'legendary',
    condition: 'speed: all_stages(dist < 3.0g)',
    category: 'speed',
    categoryLabel: CATEGORY_LABELS.speed
  },
  {
    id: 'speed_speedstar',
    title: 'Speedstar',
    description: 'Gesamtzeit unter 60 Sekunden',
    icon: '⭐',
    rarity: 'rare',
    condition: 'speed: total_time < 60s',
    category: 'speed',
    categoryLabel: CATEGORY_LABELS.speed
  },
  {
    id: 'speed_hastig',
    title: 'Hastig',
    description: 'Gesamtzeit unter 50 Sekunden (unabhängig von Präzision)',
    icon: '💨',
    rarity: 'common',
    condition: 'speed: total_time < 50s',
    category: 'speed',
    categoryLabel: CATEGORY_LABELS.speed
  },
  {
    id: 'speed_gemuetlich',
    title: 'Gemütlich',
    description: 'Trotz über 150 Sekunden Gesamtzeit unter 5g Durchschnitt',
    icon: '🛋️',
    rarity: 'rare',
    condition: 'speed: total_time > 150s && avg_dist < 5.0g',
    category: 'speed',
    categoryLabel: CATEGORY_LABELS.speed
  },
  {
    id: 'speed_warmup',
    title: 'Warm-up',
    description: 'Erste Stufe war die schlechteste, letzte Stufe war die beste (strikt)',
    icon: '🔥',
    rarity: 'common',
    condition: 'speed: stage[0] == max_dist && stage[last] == min_dist',
    category: 'speed',
    categoryLabel: CATEGORY_LABELS.speed
  },
  {
    id: 'speed_kaltstart',
    title: 'Kaltstart',
    description: 'Erste Stufe war die beste, letzte Stufe war die schlechteste (strikt)',
    icon: '❄️',
    rarity: 'common',
    condition: 'speed: stage[0] == min_dist && stage[last] == max_dist',
    category: 'speed',
    categoryLabel: CATEGORY_LABELS.speed
  },
  {
    id: 'speed_spiegellaeufer',
    title: 'Spiegelläufer',
    description: 'Zwei aufeinanderfolgende Stufen hatten gespiegelte Abstände (z.B. 12g & 21g)',
    icon: '🪞',
    rarity: 'epic',
    condition: 'speed: consecutive_mirror(dist[i], dist[i+1])',
    category: 'speed',
    categoryLabel: CATEGORY_LABELS.speed
  },
  {
    id: 'speed_gleichlauf',
    title: 'Gleichlauf',
    description: 'Alle Stufen hatten exakt denselben Abstand zum Zielgewicht',
    icon: '🔄',
    rarity: 'rare',
    condition: 'speed: all_stages(dist == dist[0])',
    category: 'speed',
    categoryLabel: CATEGORY_LABELS.speed
  },
  {
    id: 'speed_schnappsstufe',
    title: 'Schnappsstufe',
    description: 'Mindestens 2 mal einen Abstand mit einer Schnappszahl auf einer Stufe getroffen',
    icon: '🥂',
    rarity: 'rare',
    condition: 'speed: count(dist in [11,22,33,...]) >= 2',
    category: 'speed',
    categoryLabel: CATEGORY_LABELS.speed
  },
  {
    id: 'speed_maxattack',
    title: 'Max-Attack',
    description: 'Auf allen Stufen exakt das Zielgewicht getroffen (0g Abstand auf jeder Stufe)',
    icon: '👑',
    rarity: 'legendary',
    condition: 'speed: all_stages(dist == 0g)',
    category: 'speed',
    categoryLabel: CATEGORY_LABELS.speed
  },

  // --- Teamwiegen Achievements ---
  {
    id: 'team_traumteam',
    title: 'Traumteam',
    description: 'Alle Teammitglieder eines Teams lagen in einer Runde unter 5g Abstand vom Zielgewicht',
    icon: '🌟',
    rarity: 'rare',
    condition: 'team: all_members_in_round(dist < 5.0g)',
    category: 'team',
    categoryLabel: CATEGORY_LABELS.team,
    earnedTogether: true
  },
  {
    id: 'team_perfekt',
    title: 'Perfektes Team',
    description: 'Ein Team erreicht in einer Runde einen Gesamtabstand von exakt 0g',
    icon: '🎯',
    rarity: 'epic',
    condition: 'team: round_total_dist == 0g',
    category: 'team',
    categoryLabel: CATEGORY_LABELS.team,
    earnedTogether: true
  },
  {
    id: 'team_ausgleich',
    title: 'Ausgleichskünstler',
    description: 'Nachdem alle Teammitglieder eines Teams eingegeben haben, wurde das Zielgewicht als Teamgesamtabstand exakt erreicht (0g)',
    icon: '⚖️',
    rarity: 'epic',
    condition: 'team: final_team_dist == 0g',
    category: 'team',
    categoryLabel: CATEGORY_LABELS.team,
    earnedTogether: true
  },
  {
    id: 'team_synchron',
    title: 'Synchronschwimmer',
    description: 'Alle Teammitglieder eines Teams treffen in einer Runde exakt dasselbe Gewicht',
    icon: '🏊',
    rarity: 'legendary',
    condition: 'team: all_members_in_round(weight == weight[0])',
    category: 'team',
    categoryLabel: CATEGORY_LABELS.team,
    earnedTogether: true
  },
  {
    id: 'team_rueckendeckung',
    title: 'Rückendeckung',
    description: 'Ein Teammitglied hatte über 20g Abstand vom Ziel, und die anderen Teammitglieder haben die Abweichung gemeinsam komplett ausgeglichen (Gesamtabstand = 0g)',
    icon: '💪',
    rarity: 'epic',
    condition: 'team: any_member(dist > 20g) && team_dist == 0g',
    category: 'team',
    categoryLabel: CATEGORY_LABELS.team,
    earnedTogether: true
  },
  {
    id: 'team_taktiker',
    title: 'Taktiker',
    description: 'Ein Team gewinnt das Spiel ohne je in einer Runde den niedrigsten Einzelabstand aller Spieler gehabt zu haben',
    icon: '🧠',
    rarity: 'epic',
    condition: 'team: team_won && never_had_lowest_single_dist',
    category: 'team',
    categoryLabel: CATEGORY_LABELS.team,
    earnedTogether: true
  },
  {
    id: 'team_underdog',
    title: 'Underdog-Team',
    description: 'Nach der Hälfte der Runden auf dem letzten Platz (meiste Strafpunkte) und am Ende trotzdem gewonnen',
    icon: '🐾',
    rarity: 'legendary',
    condition: 'team: halftime_rank == last && final_rank == 1',
    category: 'team',
    categoryLabel: CATEGORY_LABELS.team,
    earnedTogether: true
  },
  {
    id: 'team_champions',
    title: 'Championswieg-Team',
    description: 'Der Team-Gesamtabstand weicht in keiner Runde mehr als 5g vom eigenen Durchschnitt ab',
    icon: '🏆',
    rarity: 'epic',
    condition: 'team: all_rounds(abs(team_dist - avg_dist) <= 5.0g)',
    category: 'team',
    categoryLabel: CATEGORY_LABELS.team,
    earnedTogether: true
  },
  {
    id: 'team_nerven',
    title: 'Nerven aus Stahl',
    description: 'In der letzten Runde vom letzten Platz auf den ersten Platz gekommen',
    icon: '🔩',
    rarity: 'legendary',
    condition: 'team: penultimate_rank == last && final_rank == 1',
    category: 'team',
    categoryLabel: CATEGORY_LABELS.team,
    earnedTogether: true
  },
  {
    id: 'team_schnapps',
    title: 'Schnappsteam',
    description: 'Ein Team hat in 2 aufeinanderfolgenden Runden einen Gesamtabstand mit einer Schnappszahl erreicht',
    icon: '🥂',
    rarity: 'rare',
    condition: 'team: consecutive_schnapps(team_dist) >= 2',
    category: 'team',
    categoryLabel: CATEGORY_LABELS.team,
    earnedTogether: true
  },
  {
    id: 'team_spiegel',
    title: 'Spiegelteams',
    description: 'Zwei Teams haben in einer Runde gespiegelte Gesamtabstände (z.B. 12g & 21g)',
    icon: '🪞',
    rarity: 'epic',
    condition: 'team: reverse_digits(teamA_dist) == teamB_dist',
    category: 'team',
    categoryLabel: CATEGORY_LABELS.team,
    earnedTogether: true
  },
  {
    id: 'team_gleichstand',
    title: 'Gleichstand-Könige',
    description: 'Ein Team hatte in 3 aufeinanderfolgenden Runden Gleichstand mit mindestens einem anderen Team',
    icon: '👑',
    rarity: 'rare',
    condition: 'team: consecutive_ties_with_other_team >= 3',
    category: 'team',
    categoryLabel: CATEGORY_LABELS.team,
    earnedTogether: true
  },
  {
    id: 'team_unschlagbar',
    title: 'Mehr Jungfrauen',
    description: 'Ein Team bekommt im gesamten Spiel keinen einzigen Strafpunkt',
    icon: '😇',
    rarity: 'legendary',
    condition: 'team: total_schnaepse == 0',
    category: 'team',
    categoryLabel: CATEGORY_LABELS.team,
    earnedTogether: true
  },
  {
    id: 'team_pechvoegel',
    title: 'Pechvögel',
    description: 'Ein Team hat 3 mal im Spiel eine Schnappszahl als Gesamtabstand erreicht und dadurch Strafpunkte erhalten',
    icon: '🐦',
    rarity: 'common',
    condition: 'team: count(schnapps_penalty) >= 3',
    category: 'team',
    categoryLabel: CATEGORY_LABELS.team,
    earnedTogether: true
  },

  // --- Turnier Achievements ---
  {
    id: 'tournament_gold',
    title: 'Goldwaage',
    description: 'Sieger des Finales (Platz 1 im Finaltisch)',
    icon: '🥇',
    rarity: 'legendary',
    condition: 'tournament: final_table_rank == 1',
    category: 'tournament',
    categoryLabel: CATEGORY_LABELS.tournament
  },
  {
    id: 'tournament_silver',
    title: 'Silberwaage',
    description: '2. Platz im Finale des Turniers',
    icon: '🥈',
    rarity: 'epic',
    condition: 'tournament: final_table_rank == 2',
    category: 'tournament',
    categoryLabel: CATEGORY_LABELS.tournament
  },
  {
    id: 'tournament_bronze',
    title: 'Bronzewaage',
    description: '3. Platz im Finale des Turniers',
    icon: '🥉',
    rarity: 'rare',
    condition: 'tournament: final_table_rank == 3',
    category: 'tournament',
    categoryLabel: CATEGORY_LABELS.tournament
  },
  {
    id: 'tournament_second_chance_finalist',
    title: 'Ohne Proben nach oben',
    description: 'Über den Second Chance Tisch ins Finale eingezogen',
    icon: '🔄',
    rarity: 'epic',
    condition: 'tournament: qualified_via_second_chance',
    category: 'tournament',
    categoryLabel: CATEGORY_LABELS.tournament
  },
  {
    id: 'tournament_second_chance_winner',
    title: 'Unerwarteter Favorit',
    description: 'War im Second Chance Tisch und hat das Turnier gewonnen',
    icon: '🎭',
    rarity: 'legendary',
    condition: 'tournament: was_second_chance && final_rank == 1',
    category: 'tournament',
    categoryLabel: CATEGORY_LABELS.tournament
  },
  {
    id: 'tournament_most_schnaepse',
    title: 'Hart im Nehmen',
    description: 'Die meisten Schnäpse im gesamten Turnier über alle Tische',
    icon: '🍺',
    rarity: 'common',
    condition: 'tournament: max(total_schnaepse)',
    category: 'tournament',
    categoryLabel: CATEGORY_LABELS.tournament
  },
  {
    id: 'tournament_schnapskoenig',
    title: 'Schnaps-König des Turniers',
    description: 'Die meisten Schnäpse im gesamten Turnier getrunken',
    icon: '🍻',
    rarity: 'epic',
    condition: 'tournament: rank(schnaepse) == 1',
    category: 'tournament',
    categoryLabel: CATEGORY_LABELS.tournament
  },
  {
    id: 'tournament_best_avg',
    title: 'Nah dran',
    description: 'Den kleinsten Durchschnitt über alle Tische im Turnier',
    icon: '🎯',
    rarity: 'rare',
    condition: 'tournament: min(overall_avg_dist)',
    category: 'tournament',
    categoryLabel: CATEGORY_LABELS.tournament
  },
  {
    id: 'tournament_avg_better_than_rank',
    title: 'Weggeschnappt',
    description: 'Bester Durchschnitt im Turnier, aber wegen Strafpunkten schlechter als Platz 4 im Finale',
    icon: '😤',
    rarity: 'epic',
    condition: 'tournament: best_avg && final_rank > 4',
    category: 'tournament',
    categoryLabel: CATEGORY_LABELS.tournament
  },
  {
    id: 'tournament_tischkoenig',
    title: 'Final-Favorit',
    description: 'Niedrigster Gesamtscore aller Spieler in der Vorrunde',
    icon: '👑',
    rarity: 'epic',
    condition: 'tournament: min(preliminary_total_score)',
    category: 'tournament',
    categoryLabel: CATEGORY_LABELS.tournament
  },
  {
    id: 'tournament_sauber',
    title: 'Sauber geblieben',
    description: 'Im gesamten Turnier keinen einzigen Schnaps getrunken',
    icon: '✨',
    rarity: 'epic',
    condition: 'tournament: tournament_schnaepse == 0',
    category: 'tournament',
    categoryLabel: CATEGORY_LABELS.tournament
  },
  {
    id: 'tournament_eiserner_wille',
    title: 'Eiserner Wille',
    description: 'Aus dem Second Chance Tisch bis ins Finale und dort unter die Top 3 gekommen',
    icon: '🛡️',
    rarity: 'epic',
    condition: 'tournament: was_second_chance && final_rank <= 3',
    category: 'tournament',
    categoryLabel: CATEGORY_LABELS.tournament
  },
  {
    id: 'tournament_durchstarter',
    title: 'Durchstarter',
    description: 'Durchschnittsabstand im Finale war besser als in der Vorrunde',
    icon: '🚀',
    rarity: 'rare',
    condition: 'tournament: final_avg_dist < preliminary_avg_dist',
    category: 'tournament',
    categoryLabel: CATEGORY_LABELS.tournament
  },
  {
    id: 'tournament_konstanz',
    title: 'Konstanz-Monster',
    description: 'In allen gespielten Tischen einen Ø Abstand unter 15,0g gehabt',
    icon: '📏',
    rarity: 'epic',
    condition: 'tournament: all_tables(avg_dist < 15.0g)',
    category: 'tournament',
    categoryLabel: CATEGORY_LABELS.tournament
  },
  {
    id: 'tournament_streber',
    title: 'Streber',
    description: 'Sowohl Vorrundentisch als auch Finaltisch gewonnen',
    icon: '🤓',
    rarity: 'legendary',
    condition: 'tournament: preliminary_rank == 1 && final_table_rank == 1',
    category: 'tournament',
    categoryLabel: CATEGORY_LABELS.tournament
  },
  {
    id: 'tournament_dominator',
    title: 'Tisch-Dominator',
    description: 'Vorrundentisch mit mindestens 10g Vorsprung gewonnen',
    icon: '💥',
    rarity: 'epic',
    condition: 'tournament: preliminary_lead >= 10.0g',
    category: 'tournament',
    categoryLabel: CATEGORY_LABELS.tournament
  },
  {
    id: 'tournament_marathon',
    title: 'Marathon-Mann',
    description: 'Vorrunde, Second Chance und Finale gespielt',
    icon: '🏃',
    rarity: 'epic',
    condition: 'tournament: played_tables >= 3 (Vorrunde, 2nd Chance, Finale)',
    category: 'tournament',
    categoryLabel: CATEGORY_LABELS.tournament
  },
  {
    id: 'tournament_pechvogel',
    title: 'Pechvogel des Turniers',
    description: 'Bester Ø Abstand im Finale, aber nicht gewonnen',
    icon: '😭',
    rarity: 'rare',
    condition: 'tournament: min(final_avg_dist) && final_rank > 1',
    category: 'tournament',
    categoryLabel: CATEGORY_LABELS.tournament
  },
  {
    id: 'tournament_stehauf',
    title: 'Stehaufmännchen',
    description: 'In der Vorrunde Letzter an seinem Tisch, aber im Finale nicht Letzter',
    icon: '🧗',
    rarity: 'rare',
    condition: 'tournament: preliminary_rank == last && final_rank < last',
    category: 'tournament',
    categoryLabel: CATEGORY_LABELS.tournament
  },
  {
    id: 'tournament_minimalist',
    title: 'Der Minimalist',
    description: 'Im Finale genau den 4. Platz belegt',
    icon: '🤏',
    rarity: 'common',
    condition: 'tournament: final_rank == 4',
    category: 'tournament',
    categoryLabel: CATEGORY_LABELS.tournament
  }
];

const LOCAL_STORAGE_KEY = 'bundeswiega_custom_achievements_v1';

/**
 * Lädt alle Achievements und wendet gespeicherte Admin-Anpassungen an.
 */
export function loadAdminAchievements(): AdminAchievement[] {
  let customizedMap: Record<string, Partial<AdminAchievement>> = {};
  
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        customizedMap = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Fehler beim Laden angepasster Achievements aus localStorage:', e);
    }
  }

  return DEFAULT_ACHIEVEMENTS_CATALOG.map(base => {
    const custom = customizedMap[base.id];
    if (!custom) {
      return { ...base, isCustomized: false };
    }
    return {
      ...base,
      title: custom.title ?? base.title,
      description: custom.description ?? base.description,
      icon: custom.icon ?? base.icon,
      rarity: custom.rarity ?? base.rarity,
      condition: custom.condition ?? base.condition,
      isCustomized: true,
      updatedAt: custom.updatedAt
    };
  });
}

/**
 * Speichert ein angepasstes Achievement in localStorage und synchronisiert es bei Bedarf mit Supabase.
 */
export async function saveAdminAchievement(updated: AdminAchievement): Promise<{ success: boolean; error?: string }> {
  try {
    let customMap: Record<string, Partial<AdminAchievement>> = {};
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) customMap = JSON.parse(stored);
      } catch (e) {
        console.warn('Ladefehler customMap:', e);
      }
      
      customMap[updated.id] = {
        title: updated.title,
        description: updated.description,
        icon: updated.icon,
        rarity: updated.rarity,
        condition: updated.condition,
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customMap));
    }

    // In-Memory MASTER_ACHIEVEMENTS_DEFINITIONS synchronisieren falls vorhanden
    const def = MASTER_ACHIEVEMENTS_DEFINITIONS.find(d => d.id === updated.id);
    if (def) {
      def.title = updated.title;
      def.description = updated.description;
      def.icon = updated.icon;
      def.rarity = updated.rarity;
    }

    // Supabase Update versuchen (falls Tabelle 'achievement_definitions' oder 'achievements' existiert)
    if (isSupabaseConfigured()) {
      try {
        // Versuch 1: achievement_definitions Tabelle aktualisieren
        const { error: defErr } = await supabase
          .from('achievement_definitions')
          .upsert({
            id: updated.id,
            title: updated.title,
            description: updated.description,
            icon: updated.icon,
            rarity: updated.rarity,
            condition: updated.condition,
            category: updated.category,
            updated_at: new Date().toISOString()
          });
        
        if (defErr) {
          // Falls keine dedizierte achievement_definitions Tabelle existiert, 
          // optional bestehende achievements-Metadaten in der achievements-Tabelle aktualisieren
          await supabase
            .from('achievements')
            .update({
              title: updated.title,
              description: updated.description,
              icon: updated.icon,
              rarity: updated.rarity
            })
            .eq('achievement_id', updated.id);
        }
      } catch (dbErr: any) {
        // Nicht blockierend: localStorage hat bereits gesichert
        console.warn('Supabase Achievement Sync Hinweis:', dbErr?.message || dbErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Fehler beim Speichern des Achievements:', err);
    return { success: false, error: err.message || 'Unbekannter Fehler' };
  }
}

/**
 * Setzt ein Achievement auf die Standard-Definition zurück.
 */
export function resetAdminAchievement(id: string): AdminAchievement | undefined {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const customMap: Record<string, Partial<AdminAchievement>> = JSON.parse(stored);
        delete customMap[id];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customMap));
      }
    } catch (e) {
      console.warn('Fehler beim Zurücksetzen in localStorage:', e);
    }
  }

  const base = DEFAULT_ACHIEVEMENTS_CATALOG.find(a => a.id === id);
  if (base) {
    const def = MASTER_ACHIEVEMENTS_DEFINITIONS.find(d => d.id === id);
    if (def) {
      def.title = base.title;
      def.description = base.description;
      def.icon = base.icon;
      def.rarity = base.rarity;
    }
    return { ...base, isCustomized: false };
  }
  return undefined;
}

/**
 * Setzt alle Achievements auf den Werkszustand zurück.
 */
export function resetAllAdminAchievements(): AdminAchievement[] {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      console.warn('Fehler beim Löschen des Achievement-Storage:', e);
    }
  }

  DEFAULT_ACHIEVEMENTS_CATALOG.forEach(base => {
    const def = MASTER_ACHIEVEMENTS_DEFINITIONS.find(d => d.id === base.id);
    if (def) {
      def.title = base.title;
      def.description = base.description;
      def.icon = base.icon;
      def.rarity = base.rarity;
    }
  });

  return DEFAULT_ACHIEVEMENTS_CATALOG.map(b => ({ ...b, isCustomized: false }));
}

/**
 * Gibt Styling-Klassen für Raritäts-Badges zurück.
 */
export function getRarityBadgeProps(rarity: AchievementRarity): {
  label: string;
  badgeClass: string;
  dotColor: string;
} {
  switch (rarity) {
    case 'common':
      return {
        label: 'Gewöhnlich',
        badgeClass: 'bg-slate-700/60 text-slate-300 border-slate-600',
        dotColor: 'bg-slate-400'
      };
    case 'rare':
      return {
        label: 'Selten',
        badgeClass: 'bg-blue-900/40 text-blue-300 border-blue-500/50',
        dotColor: 'bg-blue-400'
      };
    case 'epic':
      return {
        label: 'Episch',
        badgeClass: 'bg-purple-900/40 text-purple-300 border-purple-500/50',
        dotColor: 'bg-purple-400'
      };
    case 'legendary':
      return {
        label: 'Legendär',
        badgeClass: 'bg-amber-900/40 text-amber-300 border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.25)]',
        dotColor: 'bg-amber-400'
      };
  }
}
