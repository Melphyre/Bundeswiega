import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { User, Session } from '@supabase/supabase-js';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { GameState, Player, Round, Team, Achievement, ParsedRecord } from './types';
import { calculateAverageDistance, getRoundSummary, getTargetRange, SPECIAL_NUMBERS, TOGETHER_ACHIEVEMENT_IDS, checkTournamentAchievements } from './utils';

function formatTableName(tableIndex: number, customName: string): string {
  const clean = (customName || '').trim();
  if (!clean) return `Tisch ${tableIndex}`;
  if (clean.toLowerCase().startsWith('tisch')) return clean;
  return `Tisch ${tableIndex} (${clean})`;
}

function extractCustomName(rawTableName: string, tableIndex: number): string {
  if (!rawTableName) return '';
  const match = rawTableName.match(/\(([^)]+)\)/);
  if (match && match[1]) return match[1].trim();
  if (rawTableName.startsWith(`Tisch ${tableIndex}`)) {
    const rest = rawTableName.replace(`Tisch ${tableIndex}`, '').trim();
    if (rest.startsWith('(') && rest.endsWith(')')) return rest.slice(1, -1).trim();
    return rest;
  }
  return rawTableName;
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function distributePlayers(names: string[], tableIds: string[]): Record<string, string[]> {
  const distribution: Record<string, string[]> = {};
  tableIds.forEach(id => { distribution[id] = []; });
  if (names.length === 0 || tableIds.length === 0) return distribution;

  const shuffled = shuffleArray(names);
  shuffled.forEach((name, idx) => {
    const targetTableId = tableIds[idx % tableIds.length];
    distribution[targetTableId].push(name);
  });
  return distribution;
}

/**
 * 1. BUNDESWIEGA - Das ultimative Wiegen-Spiel
 */

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

declare const html2canvas: any;

const LOGO_URL = "https://github.com/Melphyre/Bundeswiega/blob/main/Bundeswiega.png?raw=true";
const INSTAGRAM_URL = "https://www.instagram.com/bundeswiega/";

const BRAND_COLOR = "#238183";
const GOLD_COLOR = "#D4AF37";
const DARK_GRAY = "#374151";

const TOURNAMENT_TABLE_COLORS = [
  '#3B82F6', // Blau
  '#10B981', // Grün
  '#F59E0B', // Orange
  '#8B5CF6', // Lila
  '#EF4444', // Rot
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#84CC16', // Hellgrün
  '#F97316', // Dunkelorange
  '#6366F1', // Indigo
];

// Optionen-Button temporär ausgeblendet – auf true setzen um ihn wieder anzuzeigen
const SHOW_OPTIONS_BUTTON = false;

const PLAYER_COLORS = [
  '#238183', '#6366f1', '#f43f5e', '#f59e0b', '#06b6d4', 
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#3b82f6'
];

const getPlayerColor = (name: string, playersList: Player[] = []): string => {
  if (!name) return PLAYER_COLORS[0];
  const pIdx = playersList.findIndex(p => p.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (pIdx !== -1) {
    return PLAYER_COLORS[pIdx % PLAYER_COLORS.length];
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % PLAYER_COLORS.length;
  return PLAYER_COLORS[idx];
};

const PlayerBadges: React.FC<{
  earnedBy: string[];
  playersList?: Player[];
  darkMode: boolean;
}> = ({ earnedBy, playersList = [], darkMode }) => {
  if (!earnedBy || earnedBy.length === 0) return null;

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      {earnedBy.map((name, i) => {
        const color = getPlayerColor(name, playersList);
        return (
          <span
            key={i}
            className={`inline-flex items-center space-x-1 text-[11px] font-black px-2.5 py-1 rounded-full border shadow-sm ${
              darkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-black/10 text-gray-900'
            }`}
          >
            <span className="opacity-70 text-[10px]">👤</span>
            <span style={{ color }}>{name}</span>
          </span>
        );
      })}
    </div>
  );
};

const ExpandableDates: React.FC<{ dates: string[] }> = ({ dates }) => {
  const [showAll, setShowAll] = useState(false);

  if (!dates || dates.length === 0) return null;

  if (dates.length <= 3) {
    return <span className="opacity-60 text-[10px] font-mono">{dates.join(' • ')}</span>;
  }

  if (showAll) {
    return (
      <span className="opacity-75 text-[10px] font-mono flex flex-wrap items-center gap-1">
        <span>{dates.join(' • ')}</span>
        <button
          onClick={() => setShowAll(false)}
          className="text-indigo-400 underline font-bold text-[10px] cursor-pointer hover:opacity-80 ml-1"
        >
          weniger
        </button>
      </span>
    );
  }

  return (
    <span className="opacity-60 text-[10px] font-mono inline-flex items-center gap-1">
      <span>{dates.slice(0, 3).join(' • ')}</span>
      <button
        onClick={() => setShowAll(true)}
        className="text-indigo-400 font-bold hover:underline cursor-pointer ml-1"
        title={dates.join(' • ')}
      >
        +{dates.length - 3} weitere
      </button>
    </span>
  );
};

const VerticalText: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex flex-col items-center justify-center leading-[0.9] py-1 font-black text-[10px] md:text-xs select-none">
    {text.split('').map((char, i) => (
      <span key={i} className="block">{char === ' ' ? '\u00A0' : char}</span>
    ))}
  </div>
);

  const GameTable = ({ showInputs = false, players, rounds, darkMode, currentRoundResults, setCurrentRoundResults, playerAccountLinks }: { 
    showInputs?: boolean, 
    players: Player[], 
    rounds: Round[], 
    darkMode: boolean, 
    currentRoundResults: Record<string, string>,
    setCurrentRoundResults: (val: Record<string, string>) => void,
    playerAccountLinks?: Record<string, { userId: string; userName: string; imageUrl?: string }>
  }) => {
    return (
      <div className={`p-2 md:p-4 rounded-3xl ${darkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'} border shadow-sm overflow-x-auto w-full mb-6`}>
        <table className={`w-full text-[10px] md:text-xs text-left border-collapse min-w-[320px] ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <thead>
            <tr className={`border-b ${darkMode ? 'border-white/20' : 'border-gray-700/20'} font-black`}>
              <th className="py-2 px-1">RND</th>
              {players.map((p, idx) => {
                const accountLink = playerAccountLinks?.[p.id];
                return (
                  <th key={p.id} className="text-center p-1">
                    <div className="flex flex-col items-center space-y-1">
                      {accountLink?.imageUrl ? (
                        <img
                          src={accountLink.imageUrl}
                          alt={p.name}
                          className="w-6 h-6 rounded-full object-cover border-2 shadow-sm"
                          style={{ borderColor: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}
                        />
                      ) : (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black text-white shadow-sm"
                          style={{ backgroundColor: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}
                        >
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <VerticalText text={p.name} />
                    </div>
                  </th>
                );
              })}
              <th className="py-2 text-right px-1">ZIEL</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((r, i) => (
              <tr key={i} className={`border-b ${darkMode ? 'border-white/10' : 'border-gray-700/10'}`}>
                <td className="py-2 px-1 opacity-70 font-bold">#{i+1}</td>
                {players.map(p => {
                  const v = r.results[p.id];
                  const tg = r.isFinal ? r.individualTargets?.[p.id] : r.targetWeight;
                  const dist = v !== undefined && tg !== undefined ? Math.abs(v - tg) : null;
                  return (
                    <td key={p.id} className="text-center py-2">
                      <div className="font-bold">{v !== undefined ? `${v}g` : '-'}</div>
                      {dist !== null && (
                        <div className={`text-[8px] md:text-[10px] ${dist === 0 ? 'text-emerald-500 font-black' : dist > 50 ? 'text-red-500 font-black' : (darkMode ? 'text-white/40' : 'text-black/40')}`}>
                          {dist === 0 ? '🎯' : `+${dist}`}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="py-2 text-right font-black px-1">{r.isFinal ? 'FIN' : `${r.targetWeight}g`}</td>
              </tr>
            ))}
            {showInputs && (
              <tr className={`${darkMode ? 'bg-brand/20' : 'bg-brand/5'}`}>
                <td className="py-3 font-bold text-brand italic px-1">Akt.</td>
                {players.map(p => (
                  <td key={p.id} className="text-center p-1">
                    {!p.isDisqualified ? (
                      <input 
                        type="number" 
                        min="0"
                        value={currentRoundResults[p.id] || ''} 
                        onChange={e => setCurrentRoundResults({...currentRoundResults, [p.id]: e.target.value})}
                        className={`w-12 md:w-16 p-1 rounded border-2 ${darkMode ? 'border-brand/60 bg-slate-800 text-white' : 'border-brand/40 bg-white text-black'} text-center font-black`}
                        placeholder="g"
                      />
                    ) : (
                      <div className="text-center opacity-30">💀</div>
                    )}
                  </td>
                ))}
                <td className="py-3 text-right font-black opacity-30 px-1">---</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

const parseRecords = (data: any[][]): ParsedRecord[] => {
  if (!data || data.length < 2) return [];
  const list: ParsedRecord[] = [];
  
  // Skip row 0 which is the header row: Datum;Modus;Name;Avg;Schnaepse
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    if (!row || row.length < 5) continue;
    
    const dateVal = row[0];
    const gameMode = row[1];
    const playerName = row[2];
    const avgVal = row[3] !== undefined && row[3] !== null ? Number(row[3]) : 0;
    const schnaepseVal = row[4] !== undefined && row[4] !== null ? Number(row[4]) : 0;
    const levelsVal = row[5] !== undefined && row[5] !== null && row[5] !== "" && !isNaN(Number(row[5])) ? Number(row[5]) : undefined;

    let achievementsVal: ParsedRecord['achievements'] = undefined;
    const rawAch = row[6] || (row[5] && (row[5].startsWith('%5B') || row[5].startsWith('[')) ? row[5] : undefined);
    if (rawAch) {
      try {
        const decoded = rawAch.startsWith('%') ? decodeURIComponent(rawAch) : rawAch;
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed)) {
          achievementsVal = parsed.map((a: any) => {
            const isTogether = typeof a.earnedTogether === 'boolean'
              ? a.earnedTogether
              : (TOGETHER_ACHIEVEMENT_IDS.includes(a.id) ? true : undefined);

            return {
              id: String(a.id || ''),
              title: String(a.title || ''),
              icon: String(a.icon || ''),
              rarity: String(a.rarity || 'common'),
              earnedBy: Array.isArray(a.earnedBy) && a.earnedBy.length > 0 ? a.earnedBy.map(String) : [String(playerName)],
              ...(isTogether ? { earnedTogether: true } : {})
            };
          });
        }
      } catch (e) {
        console.warn("Could not parse achievements column from CSV:", e);
      }
    }

    if (dateVal && playerName) {
      list.push({
        gameMode: String(gameMode),
        playerName: String(playerName),
        date: String(dateVal),
        avg: avgVal,
        schnaepse: schnaepseVal,
        levels: levelsVal,
        achievements: achievementsVal,
      });
    }
  }
  return list;
};

const KLASSISCH_TARGETS: Record<number, string> = {
  1: '480',
  2: '420',
  3: '369',
  4: '332',
  5: '250',
  6: '222',
  7: '169',
  8: '123',
  9: '69',
  10: '0'
};

const App: React.FC = () => {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const isSignedIn = !!supabaseUser;
  const user = supabaseUser;
  const isAdmin = supabaseUser?.user_metadata?.role === 'admin';

  // Auth Modal States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmailOrUsername, setAuthEmailOrUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitLoading, setAuthSubmitLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseSession(session);
      setSupabaseUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSupabaseSession(session);
        setSupabaseUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setAuthSubmitLoading(true);
    setAuthError(null);

    let emailToUse = authEmailOrUsername.trim();

    // Prüfen ob Username oder E-Mail eingegeben wurde
    if (!emailToUse.includes('@')) {
      try {
        const res = await fetch(
          `/api/users/find-by-username?username=${encodeURIComponent(emailToUse)}`
        );
        const json = await res.json();
        if (!json.email) {
          setAuthError('Kein Account mit diesem Benutzernamen gefunden.');
          setAuthSubmitLoading(false);
          return;
        }
        emailToUse = json.email;
      } catch (e) {
        setAuthError('Fehler beim Suchen des Benutzernamens.');
        setAuthSubmitLoading(false);
        return;
      }
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: authPassword
    });
    if (error) setAuthError('Benutzername/E-Mail oder Passwort falsch.');
    else setShowAuthModal(false);
    setAuthSubmitLoading(false);
  };

  const handleSignUp = async () => {
    setAuthSubmitLoading(true);
    setAuthError(null);
    if (!authUsername.trim()) {
      setAuthError('Bitte gib einen Nutzernamen ein.');
      setAuthSubmitLoading(false);
      return;
    }
    // Check if username is taken
    try {
      const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(authUsername.trim())}`);
      const checkJson = await res.json();
      if (checkJson.taken) {
        setAuthError('Dieser Nutzername ist bereits vergeben.');
        setAuthSubmitLoading(false);
        return;
      }
    } catch (e) {}

    const { error } = await supabase.auth.signUp({
      email: authEmailOrUsername.trim(),
      password: authPassword,
      options: {
        data: {
          username: authUsername.trim(),
          role: 'user'
        }
      }
    });
    if (error) setAuthError(error.message);
    else {
      setAuthError(null);
      setShowAuthModal(false);
    }
    setAuthSubmitLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSupabaseUser(null);
    window.location.reload();
  };
  
  // QR Join Table States
  const [showJoinTableModal, setShowJoinTableModal] = useState(false);
  const [qrCodeValue, setQrCodeValue] = useState('');
  const [qrExpiry, setQrExpiry] = useState<number | null>(null);

  // QR Scanner & Player Account Link States
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [scanningForPlayerId, setScanningForPlayerId] = useState<string | null>(null);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [playerAccountLinks, setPlayerAccountLinks] = useState<Record<string, { userId: string; userName: string; imageUrl?: string }>>({});
  const [teamMemberAccountLinks, setTeamMemberAccountLinks] = useState<Record<string, { userId: string; userName: string; imageUrl?: string }>>({});
  const [clerkUsers, setClerkUsers] = useState<Array<{ id: string; name: string; email?: string; imageUrl?: string }>>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminUsersError, setAdminUsersError] = useState<string | null>(null);
  const [accountResultsSaved, setAccountResultsSaved] = useState<string[]>([]);

  // Friends & Privacy States
  const [friends, setFriends] = useState<Array<{ id: string; name: string; imageUrl?: string; friendshipId: string }>>([]);
  const [pendingRequests, setPendingRequests] = useState<Array<{ id: string; requesterName: string; requesterId: string }>>([]);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [friendRequestError, setFriendRequestError] = useState<string | null>(null);
  const [friendRequestSuccess, setFriendRequestSuccess] = useState<string | null>(null);
  const [privacyState, setPrivacyState] = useState<Record<string, boolean>>({
    showRecords: true,
    showStandardspiel: true,
    showSpeedwiegen: true,
    showTeamwiegen: true,
    showAchievements: true,
  });

  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileTab, setProfileTab] = useState<'profil' | 'rekorde' | 'freunde'>('profil');
  const [showDeleteProfileModal, setShowDeleteProfileModal] = useState(false);
  const [deleteProfileInput, setDeleteProfileInput] = useState('');
  const [deletingProfile, setDeletingProfile] = useState(false);
  const [recordsSortBy, setRecordsSortBy] = useState<'datum' | 'avg' | 'schnaepse' | 'total'>('datum');
  const [recordsSortDir, setRecordsSortDir] = useState<'asc' | 'desc'>('desc');
  const [profileUsername, setProfileUsername] = useState('');
  const [profileSaveState, setProfileSaveState] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});
  const [profileSaveMessage, setProfileSaveMessage] = useState<Record<string, string>>({});
  const [profileEmail, setProfileEmail] = useState('');
  const [profileCurrentPw, setProfileCurrentPw] = useState('');
  const [profileNewPw, setProfileNewPw] = useState('');
  const [profileNewPwConfirm, setProfileNewPwConfirm] = useState('');
  const [profileShowRecords, setProfileShowRecords] = useState(true);
  const [profileSaveMessageOld, setProfileSaveMessageOld] = useState<{ section: string; type: 'success' | 'error'; text: string } | null>(null);
  const [profileLoadingSection, setProfileLoadingSection] = useState<string | null>(null);

  const handleUsernameChange = async () => {
    if (!profileUsername.trim()) return;
    setProfileSaveState(prev => ({ ...prev, username: 'loading' }));
    try {
      const checkRes = await fetch(
        `/api/users/check-username?username=${encodeURIComponent(profileUsername.trim())}&currentUserId=${supabaseUser?.id || ''}`
      );
      const checkJson = await checkRes.json();

      if (checkJson.taken) {
        setProfileSaveState(prev => ({ ...prev, username: 'error' }));
        setProfileSaveMessage(prev => ({
          ...prev,
          username: `"${profileUsername.trim()}" ist bereits vergeben. Bitte wähle einen anderen Namen.`
        }));
        return;
      }

      const { error } = await supabase.auth.updateUser({
        data: { username: profileUsername.trim() }
      });
      if (error) throw error;
      setProfileSaveState(prev => ({ ...prev, username: 'success' }));
      setProfileSaveMessage(prev => ({ ...prev, username: 'Nutzername gespeichert!' }));
    } catch (err: any) {
      setProfileSaveState(prev => ({ ...prev, username: 'error' }));
      setProfileSaveMessage(prev => ({ ...prev, username: err.message || 'Fehler beim Speichern' }));
    }
  };

  const handleDeleteProfile = async () => {
    if (deleteProfileInput !== 'delete' || !supabaseUser) return;
    setDeletingProfile(true);
    try {
      const res = await fetch('/api/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: supabaseUser.id })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await handleSignOut();
    } catch (err: any) {
      alert(`Fehler beim Löschen: ${err.message}`);
    } finally {
      setDeletingProfile(false);
    }
  };

  const myGameData = (user?.publicMetadata?.gameData as any[]) || [];

  const sortedGameData = [...myGameData].sort((a, b) => {
    let valA: any, valB: any;
    switch (recordsSortBy) {
      case 'datum':
        valA = new Date(a.date ? a.date.split('.').reverse().join('-') : 0).getTime();
        valB = new Date(b.date ? b.date.split('.').reverse().join('-') : 0).getTime();
        break;
      case 'avg': valA = a.avg || 0; valB = b.avg || 0; break;
      case 'schnaepse': valA = a.schnaepse || 0; valB = b.schnaepse || 0; break;
      case 'total': valA = a.total || 0; valB = b.total || 0; break;
    }
    return recordsSortDir === 'asc' ? valA - valB : valB - valA;
  });

  // Admin Account Assign State
  const [assignCsvName, setAssignCsvName] = useState('');
  const [assignTargetUserId, setAssignTargetUserId] = useState('');
  const [assignPreviewCount, setAssignPreviewCount] = useState<number | null>(null);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignMessage, setAssignMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAdminUsersView, setShowAdminUsersView] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [playerCount, setPlayerCount] = useState(2);
  const [isShortMode, setIsShortMode] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRoundResults, setCurrentRoundResults] = useState<Record<string, string>>({});
  const [currentRoundTargets, setCurrentRoundTargets] = useState<Record<string, string>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [showFinalIntro, setShowFinalIntro] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showModeInfo, setShowModeInfo] = useState(false);
  const [tournamentMode, setTournamentMode] = useState(true);
  const [showTournamentInfo, setShowTournamentInfo] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showAutoTargetModal, setShowAutoTargetModal] = useState<{ target: number, reason: string } | null>(null);
  const [startWeightError, setStartWeightError] = useState<string | null>(null);
  const [targetWeightError, setTargetWeightError] = useState<{ message: string, correction: number } | null>(null);
  const [disqualifiedNotice, setDisqualifiedNotice] = useState<Array<{name: string, diff: number, reason: string}> | null>(null);
  const [finalTriggered, setFinalTriggered] = useState(false);
  const [triggeringPlayers, setTriggeringPlayers] = useState<Array<{name: string, weight: number, limit: number}>>([]);
  const [nextTargetInput, setNextTargetInput] = useState('');
  const [summaryData, setSummaryData] = useState<any>(null);
  const [tempWeights, setTempWeights] = useState<string[]>([]);
  const [uploadState, setUploadState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState<string>('');
  
  // Achievement States
  const [earnedAchievements, setEarnedAchievements] = useState<Achievement[]>([]);
  const [showAchievements, setShowAchievements] = useState<boolean>(false);
  const [newlyEarnedAchievements, setNewlyEarnedAchievements] = useState<Achievement[]>([]);

  // Announcer State
  const [announcingPlayerIndex, setAnnouncingPlayerIndex] = useState<number>(0);

  // Records States
  const [showRecords, setShowRecords] = useState(false);
  const [recordsData, setRecordsData] = useState<any[][] | null>(null);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [activeRecordsTab, setActiveRecordsTab] = useState<'Standardspiel' | 'Speedwiegen' | 'Teamwiegen' | 'Achievements'>('Standardspiel');
  const [activeAchSubTab, setActiveAchSubTab] = useState<'Alle' | 'Standardspiel' | 'Speedwiegen' | 'Teamwiegen' | 'Turnier'>('Alle');
  const [showAdminOptionsModal, setShowAdminOptionsModal] = useState(false);
  const [mergeOldName, setMergeOldName] = useState('');
  const [mergeNewName, setMergeNewName] = useState('');
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const [mergeSubmitting, setMergeSubmitting] = useState(false);
  const [mergeMessage, setMergeMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeStandardSubTab, setActiveStandardSubTab] = useState<'all' | 'highest_schnaepse' | 'best_avg' | 'best_total'>('all');
  const [standardspielSizeTab, setStandardspielSizeTab] = useState<'500ml' | '0,33L'>('500ml');
  const [speedwiegenSizeTab, setSpeedwiegenSizeTab] = useState<'500ml' | '0,33L'>('500ml');
  const [selectedPlayerForDetails, setSelectedPlayerForDetails] = useState<string | null>(null);
  const [activePlayerNameTab, setActivePlayerNameTab] = useState<string | null>(null);
  const [schnaepseSortMode, setSchnaepseSortMode] = useState<'gesamt' | 'einzelspiel'>('gesamt');
  const [avgSortMode, setAvgSortMode] = useState<'gesamt' | 'einzelspiel'>('gesamt');
  const [totalSortMode, setTotalSortMode] = useState<'gesamt' | 'einzelspiel'>('gesamt');
  
  // Tournament States
  const [showTournamentOverview, setShowTournamentOverview] = useState(false);
  const [showCreateTournamentModal, setShowCreateTournamentModal] = useState(false);
  const [showTournamentDetailModal, setShowTournamentDetailModal] = useState(false);
  const [tournamentsList, setTournamentsList] = useState<any[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [selectedTournamentName, setSelectedTournamentName] = useState<string | null>(null);
  const [activeTournamentData, setActiveTournamentData] = useState<any | null>(null);
  const [tournamentDetailLoading, setTournamentDetailLoading] = useState(false);

  // Create Tournament Form States
  const [newTournamentName, setNewTournamentName] = useState('');
  const [newTournamentTableCount, setNewTournamentTableCount] = useState<number>(0);
  const [tableCountError, setTableCountError] = useState<string | null>(null);
  const [newTournamentQualiVorrunde, setNewTournamentQualiVorrunde] = useState<number>(1);
  const [newTournamentQualiSecondChance, setNewTournamentQualiSecondChance] = useState<number>(1);
  const [newTournamentSecondChance, setNewTournamentSecondChance] = useState<boolean>(true);
  const [createTournamentSubmitting, setCreateTournamentSubmitting] = useState(false);
  const [createTournamentError, setCreateTournamentError] = useState<string | null>(null);

  // Tournament Delete States
  const [showDeleteTournamentModal, setShowDeleteTournamentModal] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState<string | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deletingTournament, setDeletingTournament] = useState(false);
  const [deleteTournamentError, setDeleteTournamentError] = useState<string | null>(null);

  // Active Tournament Table Session state
  const [activeTournamentTableId, setActiveTournamentTableId] = useState<string | null>(null);
  const [activeTournamentTableName, setActiveTournamentTableName] = useState<string | null>(null);
  const [activeTournamentTable, setActiveTournamentTable] = useState<{
    tournamentName: string;
    tableId: string | number;
    tableColor: string;
    tableName?: string;
  } | null>(null);
  
  // Tournament Table Auto-Save States
  const [tournamentTableSaved, setTournamentTableSaved] = useState(false);
  const [tournamentTableSaveState, setTournamentTableSaveState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [tournamentTableSaveMessage, setTournamentTableSaveMessage] = useState<string>('');

  // Tournament Standings States
  const [showTournamentStandings, setShowTournamentStandings] = useState(false);
  const [tournamentStandingsData, setTournamentStandingsData] = useState<any>(null);
  const [tournamentStandingsLoading, setTournamentStandingsLoading] = useState(false);

  // Tournament Participant Management States
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [tableCustomNames, setTableCustomNames] = useState<Record<string, string>>({});
  const [participantNamesText, setParticipantNamesText] = useState<string>('');
  const [participantsDistribution, setParticipantsDistribution] = useState<Record<string, string[]>>({});
  const [isSavingParticipants, setIsSavingParticipants] = useState<boolean>(false);
  const [participantsSaveError, setParticipantsSaveError] = useState<string | null>(null);
  const [participantSaveState, setParticipantSaveState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [participantSaveMessage, setParticipantSaveMessage] = useState<string>('');

  // Screenshot States
  const [showScreenshotNotice, setShowScreenshotNotice] = useState(false);

  // Speedwiegen Empty Weight States
  const [showEmptyWeightModal, setShowEmptyWeightModal] = useState(false);
  const [emptyWeightGuess, setEmptyWeightGuess] = useState('');
  const [emptyWeightActual, setEmptyWeightActual] = useState('');

  // Second Chance Selection Modal States
  const [showSecondChancePlayerSelect, setShowSecondChancePlayerSelect] = useState(false);
  const [secondChancePlayers, setSecondChancePlayers] = useState<Array<{name: string; sourceTisch: string; placement: number; selected: boolean}>>([]);
  const [secondChanceTableData, setSecondChanceTableData] = useState<any>(null);
  const [isSavingSecondChance, setIsSavingSecondChance] = useState(false);
  
  // Speedwiegen States
  const [speedPlayerName, setSpeedPlayerName] = useState('');
  const [speedLevels, setSpeedLevels] = useState<string>('3');
  const [speedIsShortMode, setSpeedIsShortMode] = useState<boolean>(false);
  const [showSpeedKlassischModal, setShowSpeedKlassischModal] = useState<boolean>(false);
  const [speedTargets, setSpeedTargets] = useState<Record<number, string>>({});
  const [speedResults, setSpeedResults] = useState<Record<number, string>>({});
  const [speedCountdown, setSpeedCountdown] = useState<string | number>(3);
  const [speedStartTime, setSpeedStartTime] = useState<number | null>(null);
  const [speedEndTime, setSpeedEndTime] = useState<number | null>(null);
  const [speedCurrentTime, setSpeedCurrentTime] = useState<number>(0);

  // Save Results Modal States
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [resultsSaved, setResultsSaved] = useState(false);
  const [showExitWithoutSaveConfirm, setShowExitWithoutSaveConfirm] = useState(false);
  const [csvNames, setCsvNames] = useState<string[]>([]);
  const [csvNamesError, setCsvNamesError] = useState<string | null>(null);
  const [saveModalLoadingCsv, setSaveModalLoadingCsv] = useState(false);
  const [saveModalCsvError, setSaveModalCsvError] = useState<string | null>(null);
  const [saveModalChecked, setSaveModalChecked] = useState<Record<string, boolean>>({});
  const [saveModalMappings, setSaveModalMappings] = useState<Record<string, string>>({});
  const [saveAchievementsChecked, setSaveAchievementsChecked] = useState(true);
  const [saveModalSubmitting, setSaveModalSubmitting] = useState(false);
  const [saveModalSuccess, setSaveModalSuccess] = useState(false);
  const [saveModalError, setSaveModalError] = useState<string | null>(null);

  // Teamwiegen States
  const [teamCount, setTeamCount] = useState(2);
  const [teamSizes, setTeamSizes] = useState<Record<number, number>>({ 1: 2, 2: 2 });
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const [showStartPlayerModal, setShowStartPlayerModal] = useState(false);
  const [teamStepIndex, setTeamStepIndex] = useState(0);
  
  const rankingAreaRef = useRef<HTMLDivElement>(null);
  const roundsAreaRef = useRef<HTMLDivElement>(null);
  const statsAreaRef = useRef<HTMLDivElement>(null);

  // QR Expiry timer effect
  useEffect(() => {
    if (!qrExpiry) return;
    const timer = setInterval(() => {
      if (Date.now() > qrExpiry) {
        setQrCodeValue('');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [qrExpiry]);

  const loadCsvNames = async () => {
    try {
      const res = await fetch('/api/records');
      const contentType = res.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Non-JSON: ${text.substring(0, 100)}`);
      }
      const json = await res.json();

      // Alle eindeutigen Spielernamen aus CSV extrahieren
      const allRows = json.data || [];
      const uniqueNames = [...new Set(
        allRows
          .filter((row: string[]) => row[2] && row[2] !== 'Name')
          .map((row: string[]) => row[2])
      )].sort();

      setCsvNames(uniqueNames as string[]);
    } catch (err: any) {
      console.error('CSV Namen laden Fehler:', err);
      setCsvNamesError(err.message);
    }
  };

  useEffect(() => {
    if (showAdminPanel) {
      loadCsvNames();
    }
  }, [showAdminPanel]);

  // Function to open Admin Panel and load users
  const openAdminPanel = async () => {
    setShowAdminPanel(true);
    setAdminUsersLoading(true);
    setAdminUsersError(null);
    try {
      const res = await fetch('/api/users/list');
      const contentType = res.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await res.text();
        throw new Error(`API returned non-JSON: ${text.substring(0, 100)}`);
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Fehler beim Laden der Nutzer');
      setClerkUsers(json.users || []);
    } catch (err: any) {
      setAdminUsersError(err.message);
      setClerkUsers([]);
    } finally {
      setAdminUsersLoading(false);
    }
  };

  // Load clerk users list for player account mapping
  useEffect(() => {
    fetch('/api/users/list')
      .then(r => r.json())
      .then(data => setClerkUsers(data.users || []))
      .catch(err => console.error('Error fetching clerk users:', err));
  }, []);

  // Sync profile form states when Profile Modal opens
  const refreshUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setSupabaseUser(user);
  };

  useEffect(() => {
    if (showProfileModal) {
      refreshUserData();
      if (supabaseUser) {
        setProfileUsername(supabaseUser.user_metadata?.username || '');
        setProfileEmail(supabaseUser.email || '');
        const p = supabaseUser.user_metadata?.privacy || {};
        setPrivacyState({
          showRecords: p.showRecords ?? (supabaseUser.user_metadata?.showRecords ?? true),
          showStandardspiel: p.showStandardspiel ?? true,
          showSpeedwiegen: p.showSpeedwiegen ?? true,
          showTeamwiegen: p.showTeamwiegen ?? true,
          showAchievements: p.showAchievements ?? true,
        });
        setProfileCurrentPw('');
        setProfileNewPw('');
        setProfileNewPwConfirm('');
        setProfileSaveMessageOld(null);
        setProfileSaveState({});
        setProfileSaveMessage({});
      }
    }
  }, [showProfileModal]);

  // Speedwiegen auto fill logged in username
  useEffect(() => {
    if (gameState === GameState.SPEED_SETUP && isSignedIn && supabaseUser) {
      const username = supabaseUser.user_metadata?.username || supabaseUser.email || '';
      if (username) setSpeedPlayerName(username);
    }
  }, [gameState, isSignedIn, supabaseUser]);

  // QR Scanner Functions (html5-qrcode)
  const startQrScanner = async (playerId: string) => {
    setScanningForPlayerId(playerId);
    setShowQrScanner(true);
    setQrError(null);

    await new Promise(resolve => setTimeout(resolve, 300));

    const html5QrCode = new Html5Qrcode('qr-reader');
    qrScannerRef.current = html5QrCode;

    try {
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleQrScan(decodedText, playerId);
          html5QrCode.stop().catch(() => {});
          qrScannerRef.current = null;
          setShowQrScanner(false);
          setScanningForPlayerId(null);
        },
        (_errorMessage) => {}
      );
    } catch (err) {
      setQrError('Kamera konnte nicht gestartet werden.');
    }
  };

  const stopQrScanner = async () => {
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.stop();
        qrScannerRef.current = null;
      } catch {}
    }
    setShowQrScanner(false);
    setScanningForPlayerId(null);
    setQrError(null);
  };

  const handleQrScan = (decodedText: string, playerId: string) => {
    try {
      const payload = JSON.parse(atob(decodedText));

      if (Date.now() > payload.expires) {
        setQrError('QR-Code ist abgelaufen. Bitte neu generieren.');
        return;
      }

      if (!payload.userId || !payload.userName) {
        setQrError('Falscher QR-Code. Bitte einen Bundeswiega QR-Code scannen.');
        return;
      }

      const usedUserIds = [
        ...(Object.values(playerAccountLinks) as Array<{ userId: string }>).map(l => l.userId),
        ...(Object.values(teamMemberAccountLinks) as Array<{ userId: string }>).map(l => l.userId)
      ];
      if (usedUserIds.includes(payload.userId)) {
        setQrError(`${payload.userName} ist bereits einem anderen Spieler zugewiesen.`);
        return;
      }

      const isStandardPlayer = players.some(p => p.id === playerId);
      if (isStandardPlayer) {
        setPlayers(prev => prev.map(p =>
          p.id === playerId ? { ...p, name: payload.userName } : p
        ));
        setPlayerAccountLinks(prev => ({
          ...prev,
          [playerId]: {
            userId: payload.userId,
            userName: payload.userName,
            imageUrl: payload.imageUrl || undefined
          }
        }));
      } else {
        setTeamMemberAccountLinks(prev => ({
          ...prev,
          [playerId]: {
            userId: payload.userId,
            userName: payload.userName,
            imageUrl: payload.imageUrl || undefined
          }
        }));
        setTeams(prevTeams => prevTeams.map(t => ({
          ...t,
          members: t.members.map(m => m.id === playerId ? { ...m, name: payload.userName } : m)
        })));
      }
      setQrError(null);
    } catch {
      setQrError('Falscher QR-Code. Bitte einen gültigen Bundeswiega QR-Code scannen.');
    }
  };

  const generateQrCode = () => {
    if (!supabaseUser) return;
    const userName = supabaseUser.user_metadata?.username || supabaseUser.email || 'Spieler';
    const expires = Date.now() + 5 * 60 * 1000;
    const qrPayload = {
      userId: supabaseUser.id,
      userName: userName,
      imageUrl: supabaseUser.user_metadata?.avatar_url || null,
      timestamp: Date.now(),
      expires,
    };
    setQrCodeValue(btoa(JSON.stringify(qrPayload)));
    setQrExpiry(expires);
  };

  const openJoinTableModal = () => {
    generateQrCode();
    setShowJoinTableModal(true);
  };

  const getAvailableAccountsForDropdown = (currentAssignedId?: string) => {
    const usedIds = [
      ...(Object.values(playerAccountLinks) as Array<{ userId: string }>).map(l => l.userId),
      ...(Object.values(teamMemberAccountLinks) as Array<{ userId: string }>).map(l => l.userId)
    ];
    const friendUserIds = new Set(friends.map(f => f.id));

    return clerkUsers
      .filter(u => !usedIds.includes(u.id) || u.id === currentAssignedId)
      .sort((a, b) => {
        const aIsFriend = friendUserIds.has(a.id);
        const bIsFriend = friendUserIds.has(b.id);
        if (aIsFriend && !bIsFriend) return -1;
        if (!aIsFriend && bIsFriend) return 1;
        return a.name.localeCompare(b.name, 'de');
      });
  };

  const assignAccountToPlayer = (playerId: string, accountId: string) => {
    if (!accountId) return;
    const match = clerkUsers.find(u => u.id === accountId);
    if (match) {
      setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, name: match.name } : p));
      setPlayerAccountLinks(prev => ({
        ...prev,
        [playerId]: { userId: match.id, userName: match.name, imageUrl: match.imageUrl }
      }));
    }
  };

  const unlinkAccount = (playerId: string) => {
    setPlayerAccountLinks(prev => {
      const copy = { ...prev };
      delete copy[playerId];
      return copy;
    });
  };

  const assignAccountToTeamMember = (teamId: string, memberId: string, accountId: string) => {
    if (!accountId) return;
    const match = clerkUsers.find(u => u.id === accountId);
    if (match) {
      setTeams(prevTeams => prevTeams.map(t => t.id === teamId ? {
        ...t,
        members: t.members.map(m => m.id === memberId ? { ...m, name: match.name } : m)
      } : t));
      setTeamMemberAccountLinks(prev => ({
        ...prev,
        [memberId]: { userId: match.id, userName: match.name, imageUrl: match.imageUrl }
      }));
    }
  };

  const unlinkTeamMemberAccount = (memberId: string) => {
    setTeamMemberAccountLinks(prev => {
      const copy = { ...prev };
      delete copy[memberId];
      return copy;
    });
  };

  // Friends Functions & Effects
  const loadFriends = async () => {
    if (!supabaseUser) return;
    const { data } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${supabaseUser.id},receiver_id.eq.${supabaseUser.id}`)
      .eq('status', 'accepted');

    const friendIds = (data || []).map(f =>
      f.requester_id === supabaseUser.id ? f.receiver_id : f.requester_id
    );
    try {
      const res = await fetch(`/api/users/list`);
      const json = await res.json();
      const allUsers = json.users || [];
      const friendList = friendIds.map(id => {
        const u = allUsers.find((u: any) => u.id === id);
        const friendship = (data || []).find(f => f.requester_id === id || f.receiver_id === id);
        return u ? { ...u, friendshipId: friendship?.id } : null;
      }).filter(Boolean);
      setFriends(friendList.sort((a: any, b: any) => a.name.localeCompare(b.name, 'de')));
    } catch (err) {
      console.error('Error loading friends:', err);
    }
  };

  const loadPendingRequests = async () => {
    if (!supabaseUser) return;
    const { data } = await supabase
      .from('friendships')
      .select('*')
      .eq('receiver_id', supabaseUser.id)
      .eq('status', 'pending');

    try {
      const res = await fetch('/api/users/list');
      const json = await res.json();
      const allUsers = json.users || [];
      const requests = (data || []).map(f => {
        const requester = allUsers.find((u: any) => u.id === f.requester_id);
        return { id: f.id, requesterId: f.requester_id, requesterName: requester?.name || 'Unbekannt' };
      });
      setPendingRequests(requests);
    } catch (err) {
      console.error('Error loading pending requests:', err);
    }
  };

  const sendFriendRequest = async () => {
    setFriendRequestError(null);
    setFriendRequestSuccess(null);
    if (!friendSearchQuery.trim()) return;
    try {
      const res = await fetch('/api/users/list');
      const json = await res.json();
      const targetUser = (json.users || []).find((u: any) =>
        u.name.toLowerCase() === friendSearchQuery.trim().toLowerCase()
      );
      if (!targetUser) {
        setFriendRequestError('Kein Nutzer mit diesem Benutzernamen gefunden.');
        return;
      }
      if (targetUser.id === supabaseUser?.id) {
        setFriendRequestError('Du kannst dir nicht selbst eine Anfrage senden.');
        return;
      }
      const { error } = await supabase.from('friendships').insert({
        requester_id: supabaseUser?.id,
        receiver_id: targetUser.id,
        status: 'pending'
      });
      if (error) setFriendRequestError('Anfrage konnte nicht gesendet werden.');
      else {
        setFriendRequestSuccess(`Anfrage an ${targetUser.name} gesendet!`);
        setFriendSearchQuery('');
      }
    } catch (err: any) {
      setFriendRequestError('Fehler beim Senden der Anfrage.');
    }
  };

  const acceptFriendRequest = async (friendshipId: string) => {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    loadFriends();
    loadPendingRequests();
  };

  const rejectFriendRequest = async (friendshipId: string) => {
    await supabase.from('friendships').update({ status: 'rejected' }).eq('id', friendshipId);
    loadPendingRequests();
  };

  const removeFriend = async (friendshipId: string) => {
    await supabase.from('friendships').delete().eq('id', friendshipId);
    loadFriends();
  };

  useEffect(() => {
    if (showProfileModal && profileTab === 'freunde') {
      loadFriends();
      loadPendingRequests();
    }
  }, [showProfileModal, profileTab]);

  useEffect(() => {
    if (!supabaseUser) return;
    const channel = supabase
      .channel('friendships')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'friendships',
        filter: `receiver_id=eq.${supabaseUser.id}`
      }, () => {
        loadPendingRequests();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabaseUser]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isResultScreen = gameState === GameState.RESULT_SCREEN || gameState === GameState.SPEED_RESULT;
      const shouldWarn = (gameState !== GameState.START && !isResultScreen) || (isResultScreen && !resultsSaved);

      if (shouldWarn) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [gameState, resultsSaved]);

  useEffect(() => {
    let interval: any;
    if (gameState === GameState.SPEED_GAMEPLAY && speedStartTime && !speedEndTime) {
      interval = setInterval(() => {
        setSpeedCurrentTime(Date.now() - speedStartTime);
      }, 50);
    }
    return () => clearInterval(interval);
  }, [gameState, speedStartTime, speedEndTime]);

  useEffect(() => {
    if (gameState === GameState.SPEED_CONFIG) {
      const lastLevel = parseInt(speedLevels);
      setSpeedTargets(prev => {
        if (prev[lastLevel] !== '0') {
          return { ...prev, [lastLevel]: '0' };
        }
        return prev;
      });
    }
  }, [gameState, speedLevels]);

  const captureElement = async (ref: React.RefObject<HTMLDivElement>, filename: string) => {
    if (!ref.current) return;
    try {
      const canvas = await html2canvas(ref.current, {
        backgroundColor: darkMode ? '#111827' : '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false
      });
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      alert("Screenshot konnte nicht erstellt werden.");
    }
  };

  useEffect(() => {
    if (gameState === GameState.RESULT_SCREEN) {
      setShowScreenshotNotice(true);
      const noticeTimer = setTimeout(() => setShowScreenshotNotice(false), 3000);

      const timer = setTimeout(async () => {
        if (rankingAreaRef.current) {
          await captureElement(rankingAreaRef, 'Bundeswiega_Ranking');
        }
        await new Promise(resolve => setTimeout(resolve, 500));
        if (roundsAreaRef.current) {
          await captureElement(roundsAreaRef, 'Bundeswiega_Tabelle');
        }
      }, 800);

      return () => {
        clearTimeout(timer);
        clearTimeout(noticeTimer);
      };
    }

    if (gameState === GameState.SPEED_RESULT) {
      setShowScreenshotNotice(true);
      const noticeTimer = setTimeout(() => setShowScreenshotNotice(false), 3000);

      const timer = setTimeout(async () => {
        if (rankingAreaRef.current) {
          await captureElement(rankingAreaRef, `Bundeswiega_Speed_Result_${speedPlayerName || 'Gast'}`);
        }
      }, 800);

      return () => {
        clearTimeout(timer);
        clearTimeout(noticeTimer);
      };
    }
  }, [gameState]);

  // Auto-save results to Clerk user accounts when RESULT_SCREEN is loaded
  useEffect(() => {
    if (gameState !== GameState.RESULT_SCREEN) return;

    Object.entries(playerAccountLinks).forEach(async ([playerId, accountLink]: [string, { userId: string; userName: string; imageUrl?: string }]) => {
      if (!accountLink.userId) return;
      const player = players.find(p => p.id === playerId);
      if (!player) return;

      if (accountResultsSaved.includes(accountLink.userId)) return;

      const avg = calculateAverageDistance(playerId, rounds);
      const gameMode = teams.length > 0
        ? 'Teamwiegen'
        : isShortMode ? 'Standardspiel (0,33L)' : 'Standardspiel (500ml)';
      const today = new Date().toLocaleDateString('de-DE');

      const playerAchievements = earnedAchievements.filter(a =>
        a.earnedBy && a.earnedBy.includes(player.name)
      );

      try {
        const res = await fetch('/api/users/save-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: accountLink.userId,
            result: {
              date: today,
              gameMode,
              avg: Number(avg.toFixed(2)),
              schnaepse: player.schnaepse,
              total: Number((avg + player.schnaepse).toFixed(2)),
              achievements: playerAchievements
            }
          })
        });
        if (res.ok) {
          setAccountResultsSaved(prev => prev.includes(accountLink.userId) ? prev : [...prev, accountLink.userId]);
        }
      } catch (err) {
        console.error('Auto-save to Clerk account failed:', err);
      }
    });
  }, [gameState]);

  const saveTournamentParticipants = async () => {
    const currentTournamentName = selectedTournamentName || activeTournamentData?.config?.name;
    if (!currentTournamentName) return;

    setParticipantSaveState('loading');
    setParticipantSaveMessage('Spielerzuteilung wird gespeichert...');

    try {
      const getRes = await fetch(
        `/api/tournament/get?name=${encodeURIComponent(currentTournamentName)}`
      );
      const contentType = getRes.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await getRes.text();
        throw new Error(`API returned non-JSON: ${text.substring(0, 100)}`);
      }
      const getJson = await getRes.json();
      if (!getRes.ok) throw new Error(getJson.error || 'Fehler beim Laden');

      const updatedTablesPayload = (activeTournamentData?.tables || []).map((t: any, idx: number) => {
        if (t.id === 'table_second_chance' || t.id === 'table_final') return t;
        const custom = tableCustomNames[t.id] || '';
        const formattedName = formatTableName(idx + 1, custom);
        const playersList = participantsDistribution[t.id] || [];
        return {
          ...t,
          id: t.id,
          name: formattedName,
          players: playersList,
          color: t.color
        };
      });

      const saveRes = await fetch('/api/tournament/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateParticipantsAndTables',
          name: currentTournamentName,
          tables: updatedTablesPayload
        })
      });

      const saveCT = saveRes.headers.get('content-type');
      if (!saveCT?.includes('application/json')) {
        const text = await saveRes.text();
        throw new Error(`Save API returned non-JSON: ${text.substring(0, 100)}`);
      }

      const saveJson = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveJson.error || 'Fehler beim Speichern');

      setParticipantSaveState('success');
      setParticipantSaveMessage('✅ Spielerzuteilung gespeichert! Seite wird neu geladen...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setParticipantSaveState('error');
      setParticipantSaveMessage(`❌ Fehler: ${err.message}`);
    }
  };

  const saveTournamentTableResults = async () => {
    if (!activeTournamentTable || tournamentTableSaved) return;

    setTournamentTableSaveState('loading');
    setTournamentTableSaveMessage('Tischergebnisse werden gespeichert...');

    try {
      // 1. Erst GET zur Verifikation/Laden
      const getRes = await fetch(
        `/api/tournament/get?name=${encodeURIComponent(activeTournamentTable.tournamentName)}`
      );

      // Prüfen ob Response wirklich JSON ist
      const contentType = getRes.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await getRes.text();
        throw new Error(`API returned non-JSON: ${text.substring(0, 100)}`);
      }

      const getJson = await getRes.json();
      if (!getRes.ok) throw new Error(getJson.error || 'Fehler beim Laden der Turnier-CSV');

      // 2. Player results zusammenstellen
      const playerResults = players
        .map(p => {
          const avg = calculateAverageDistance(p.id, rounds);
          const total = avg + p.schnaepse;
          return {
            id: p.id,
            name: p.name,
            avg: avg,
            schnaepse: p.schnaepse,
            total: total,
            isDisqualified: p.isDisqualified
          };
        })
        .sort((a, b) => (a.isDisqualified ? 1 : b.isDisqualified ? -1 : a.total - b.total))
        .map((p, idx) => ({
          name: p.name,
          rank: idx + 1,
          avg: Number(p.avg.toFixed(2)),
          schnaepse: p.schnaepse,
          total: Number(p.total.toFixed(2))
        }));

      const targetTableId = activeTournamentTableId || activeTournamentTable.tableId;
      const isSecondChance = targetTableId === 'table_second_chance' || targetTableId === 'SecondChance';
      const outPlayers = isSecondChance ? secondChancePlayers.filter(p => !p.selected).map(p => p.name) : [];

      // 3. Dann SAVE
      const saveRes = await fetch('/api/tournament/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveTableResult',
          name: activeTournamentTable.tournamentName,
          tableId: targetTableId,
          results: playerResults,
          outPlayers: outPlayers,
          date: new Date().toLocaleDateString('de-DE')
        })
      });

      const saveCT = saveRes.headers.get('content-type');
      if (!saveCT || !saveCT.includes('application/json')) {
        const text = await saveRes.text();
        throw new Error(`Save API returned non-JSON: ${text.substring(0, 100)}`);
      }

      const saveJson = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveJson.error || 'Fehler beim Speichern');

      setTournamentTableSaved(true);
      setTournamentTableSaveState('success');
      setTournamentTableSaveMessage('Tischergebnisse erfolgreich im Turnier gespeichert!');

      // Reload tournament detail if modal is active
      if (selectedTournamentName) {
        openTournamentDetail(selectedTournamentName);
      }

    } catch (err: any) {
      console.error('Tournament save error:', err);
      setTournamentTableSaveState('error');
      setTournamentTableSaveMessage(
        `Fehler: ${err.message}. Bitte prüfe die Vercel Environment Variables (BLOB_READ_WRITE_TOKEN).`
      );
    }
  };

  useEffect(() => {
    if (
      gameState === GameState.RESULT_SCREEN &&
      activeTournamentTable !== null &&
      !tournamentTableSaved
    ) {
      saveTournamentTableResults();
    }
  }, [gameState, activeTournamentTable, tournamentTableSaved]);

  const loadTournamentStandings = async (tName?: string) => {
    const name = tName || activeTournamentData?.config?.name || selectedTournamentName || activeTournamentTable?.tournamentName;
    if (!name) return;

    setShowTournamentStandings(true);
    setTournamentStandingsLoading(true);

    try {
      const res = await fetch(`/api/tournament/get?name=${encodeURIComponent(name)}`);
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`API returned non-JSON: ${text.substring(0, 100)}`);
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Fehler beim Laden des Spielstands');
      setTournamentStandingsData(json);
    } catch (err: any) {
      console.error('Error loading tournament standings:', err);
    } finally {
      setTournamentStandingsLoading(false);
    }
  };

  const startGame = () => {
    setGameState(GameState.PLAYER_COUNT);
    setResultsSaved(false);
    setRounds([]);
    setPlayers([]);
    setTeams([]);
    setFinalTriggered(false);
    setIsShortMode(false);
    setTournamentMode(true);
    setUploadState('idle');
    setUploadMessage('');
    setAnnouncingPlayerIndex(0);
    setTournamentTableSaved(false);
    setTournamentTableSaveState('idle');
    setTournamentTableSaveMessage('');
  };

  const startTeamwiegen = () => {
    setGameState(GameState.TEAM_SETUP);
    setResultsSaved(false);
    setTeamCount(2);
    setTeamSizes({ 1: 2, 2: 2 });
    setRounds([]);
    setPlayers([]);
    setTeams([]);
    setIsShortMode(false);
    setUploadState('idle');
    setUploadMessage('');
    setAnnouncingPlayerIndex(0);
    setTournamentTableSaved(false);
    setTournamentTableSaveState('idle');
    setTournamentTableSaveMessage('');
  };

  const startSpeedwiegen = () => {
    setGameState(GameState.SPEED_SETUP);
    setResultsSaved(false);
    setSpeedPlayerName('');
    setSpeedLevels('3');
    setSpeedIsShortMode(false);
    setSpeedTargets({});
    setSpeedResults({});
    setSpeedStartTime(null);
    setSpeedEndTime(null);
    setSpeedCurrentTime(0);
    setUploadState('idle');
    setUploadMessage('');
    setTournamentTableSaved(false);
    setTournamentTableSaveState('idle');
    setTournamentTableSaveMessage('');
  };

  const resetToStart = () => {
    setGameState(GameState.START);
    setResultsSaved(false);
    setShowExitWithoutSaveConfirm(false);
    setRounds([]);
    setPlayers([]);
    setTeams([]);
    setShowResetConfirm(false);
    setUploadState('idle');
    setUploadMessage('');
    setAnnouncingPlayerIndex(0);
    setActiveTournamentTable(null);
    setTournamentTableSaved(false);
    setTournamentTableSaveState('idle');
    setTournamentTableSaveMessage('');
    setPlayerAccountLinks({});
    setAccountResultsSaved([]);
  };

  const handleExitToMainMenu = () => {
    if (resultsSaved) {
      window.location.reload();
    } else {
      setShowExitWithoutSaveConfirm(true);
    }
  };

  const fetchTournamentsList = async () => {
    setTournamentsLoading(true);
    try {
      const res = await fetch('/api/tournament/list');
      const json = await res.json();
      if (res.ok) {
        setTournamentsList(json.tournaments || []);
      }
    } catch (err) {
      console.error('Error fetching tournaments list:', err);
    } finally {
      setTournamentsLoading(false);
    }
  };

  const openTournamentDetail = async (name: string) => {
    setSelectedTournamentName(name);
    setShowTournamentDetailModal(true);
    setTournamentDetailLoading(true);
    try {
      const res = await fetch(`/api/tournament/get?name=${encodeURIComponent(name)}`);
      const json = await res.json();
      if (res.ok) {
        setActiveTournamentData(json);
      }
    } catch (err) {
      console.error('Error fetching tournament details:', err);
    } finally {
      setTournamentDetailLoading(false);
    }
  };

  const handleCreateTournamentSubmit = async () => {
    if (!newTournamentName.trim()) {
      setCreateTournamentError('Bitte einen Turniernamen eingeben.');
      return;
    }
    if (!newTournamentTableCount || newTournamentTableCount < 2 || newTournamentTableCount > 10) {
      setTableCountError('Bitte eine gültige Anzahl zwischen 2 und 10 Tischen eingeben.');
      return;
    }
    setCreateTournamentSubmitting(true);
    setCreateTournamentError(null);
    setTableCountError(null);
    try {
      const res = await fetch('/api/tournament/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: newTournamentName.trim(),
          tablesCount: newTournamentTableCount,
          qualifikationVorrunde: newTournamentQualiVorrunde,
          qualifikationSecondChance: newTournamentQualiSecondChance,
          hasSecondChance: newTournamentSecondChance
        })
      });
      const json = await res.json();
      if (res.ok) {
        setShowCreateTournamentModal(false);
        const createdName = newTournamentName.trim();
        setNewTournamentName('');
        setNewTournamentTableCount(0);
        setTableCountError(null);
        await fetchTournamentsList();
        openTournamentDetail(createdName);
      } else {
        setCreateTournamentError(json.error || 'Fehler beim Erstellen des Turniers.');
      }
    } catch (err: any) {
      setCreateTournamentError(err.message || 'Verbindungsfehler.');
    } finally {
      setCreateTournamentSubmitting(false);
    }
  };

  const handleOpenDeleteModal = (name: string) => {
    setTournamentToDelete(name);
    setDeleteConfirmInput('');
    setDeleteTournamentError(null);
    setShowDeleteTournamentModal(true);
  };

  const handleConfirmDeleteTournament = async () => {
    if (!tournamentToDelete) return;
    if (deleteConfirmInput.trim().toLowerCase() !== 'delete') return;

    setDeletingTournament(true);
    setDeleteTournamentError(null);

    try {
      const res = await fetch('/api/tournament/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tournamentToDelete })
      });
      const json = await res.json();

      if (res.ok) {
        setShowDeleteTournamentModal(false);
        setDeleteConfirmInput('');
        const deletedName = tournamentToDelete;
        setTournamentToDelete(null);
        await fetchTournamentsList();
        if (selectedTournamentName === deletedName) {
          setShowTournamentDetailModal(false);
        }
      } else {
        setDeleteTournamentError(json.error || 'Fehler beim Löschen des Turniers.');
      }
    } catch (err: any) {
      setDeleteTournamentError(err.message || 'Verbindungsfehler.');
    } finally {
      setDeletingTournament(false);
    }
  };

  const openParticipantsModal = () => {
    if (!activeTournamentData) return;
    const allTables = activeTournamentData.tables || [];
    const vorrundeTables = allTables.filter((t: any) => t.id.startsWith("table_") && t.id !== "table_second_chance" && t.id !== "table_final");

    const initCustomNames: Record<string, string> = {};
    const initDistribution: Record<string, string[]> = {};
    const allExistingNamesSet = new Set<string>();

    vorrundeTables.forEach((t: any, idx: number) => {
      initCustomNames[t.id] = extractCustomName(t.name, idx + 1);
      initDistribution[t.id] = t.players || [];
      (t.players || []).forEach((p: string) => allExistingNamesSet.add(p));
    });

    setTableCustomNames(initCustomNames);
    setParticipantsDistribution(initDistribution);
    setParticipantNamesText(Array.from(allExistingNamesSet).join('\n'));
    setParticipantsSaveError(null);
    setShowParticipantsModal(true);
  };

  const handleShuffleAndDistribute = () => {
    if (!activeTournamentData) return;
    const vorrundeTables = (activeTournamentData.tables || []).filter((t: any) => t.id.startsWith("table_") && t.id !== "table_second_chance" && t.id !== "table_final");
    const rawNames = participantNamesText.split('\n').map(n => n.trim()).filter(Boolean);
    if (rawNames.length === 0) {
      setParticipantsSaveError('Bitte gib mindestens einen Teilnehmernamen ein.');
      return;
    }
    setParticipantsSaveError(null);
    const tableIds = vorrundeTables.map((t: any) => t.id);
    const newDist = distributePlayers(rawNames, tableIds);
    setParticipantsDistribution(newDist);
  };

  const handleSaveParticipants = async () => {
    await saveTournamentParticipants();
  };

  const openSecondChanceModal = (scTable: any) => {
    if (!activeTournamentData || !activeTournamentData.results || activeTournamentData.results.length === 0) {
      alert("Bitte zuerst alle Vorrundentische abschließen");
      return;
    }

    const qVorrunde = activeTournamentData.config?.qualifikationVorrunde || 1;
    const allResults = activeTournamentData.results || [];
    const allTables = activeTournamentData.tables || [];
    const vorrundeTables = allTables.filter((t: any) => t.id.startsWith("table_") && t.id !== "table_second_chance" && t.id !== "table_final");

    const eligible: Array<{ name: string; sourceTisch: string; placement: number; selected: boolean }> = [];

    vorrundeTables.forEach((vt: any) => {
      const vtResults = allResults.filter((r: any) => r.tableId === vt.id);
      vtResults.forEach((r: any) => {
        if (r.rank > qVorrunde) {
          eligible.push({
            name: r.playerName,
            sourceTisch: vt.name || `Tisch ${vt.id.replace('table_', '')}`,
            placement: r.rank,
            selected: true
          });
        }
      });
    });

    if (eligible.length === 0) {
      alert("Bitte zuerst alle Vorrundentische abschließen");
      return;
    }

    eligible.sort((a, b) => a.placement - b.placement || a.sourceTisch.localeCompare(b.sourceTisch));

    setSecondChancePlayers(eligible);
    setSecondChanceTableData(scTable);
    setShowSecondChancePlayerSelect(true);
  };

  const handleConfirmSecondChance = async () => {
    const selectedPlayers = secondChancePlayers.filter(p => p.selected);
    if (selectedPlayers.length < 2 || !secondChanceTableData) return;

    setIsSavingSecondChance(true);
    const selectedNames = selectedPlayers.map(p => p.name);

    const updatedTable = {
      id: secondChanceTableData.id,
      name: secondChanceTableData.name || 'Second Chance',
      players: selectedNames,
      color: secondChanceTableData.color || '#F59E0B'
    };

    try {
      if (selectedTournamentName) {
        await fetch('/api/tournament/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updateParticipantsAndTables',
            name: selectedTournamentName,
            tables: [updatedTable]
          })
        });

        await openTournamentDetail(selectedTournamentName);
      }

      setShowSecondChancePlayerSelect(false);

      const prefilledPlayers = selectedNames.map((pName: string, i: number) => ({
        id: `p${i}`,
        name: pName,
        startWeight: 0,
        schnaepse: 0,
        isDisqualified: false
      }));

      setActiveTournamentTableId(secondChanceTableData.id);
      setActiveTournamentTableName(secondChanceTableData.name || 'Second Chance');
      setActiveTournamentTable({
        tournamentName: selectedTournamentName || activeTournamentData?.config?.name || 'Turnier',
        tableId: secondChanceTableData.id,
        tableName: secondChanceTableData.name || 'Second Chance',
        tableColor: secondChanceTableData.color || '#F59E0B'
      });

      setTournamentTableSaved(false);
      setTournamentTableSaveState('idle');
      setTournamentTableSaveMessage('');

      setShowTournamentDetailModal(false);
      setShowTournamentOverview(false);

      setPlayerCount(prefilledPlayers.length);
      setPlayers(prefilledPlayers);
      setTempWeights(new Array(prefilledPlayers.length).fill(''));
      setGameState(GameState.START_WEIGHTS);
      setTournamentMode(true);
    } catch (err: any) {
      alert("Fehler beim Starten des Second Chance Tisches: " + err.message);
    } finally {
      setIsSavingSecondChance(false);
    }
  };

  const startTournamentTable = (table: any) => {
    if (table.id === 'table_second_chance') {
      openSecondChanceModal(table);
      return;
    }

    const tableColor = table.color || (
      table.id === 'table_second_chance' ? '#F59E0B' :
      table.id === 'table_final' ? '#D4AF37' :
      table.id.startsWith('table_') ? (
        TOURNAMENT_TABLE_COLORS[(parseInt(table.id.replace('table_', '')) - 1) % TOURNAMENT_TABLE_COLORS.length] || TOURNAMENT_TABLE_COLORS[0]
      ) : TOURNAMENT_TABLE_COLORS[0]
    );

    setActiveTournamentTableId(table.id);
    setActiveTournamentTableName(table.name);
    setActiveTournamentTable({
      tournamentName: selectedTournamentName || activeTournamentData?.config?.name || 'Turnier',
      tableId: table.id,
      tableColor: tableColor,
      tableName: table.name
    });

    setTournamentTableSaved(false);
    setTournamentTableSaveState('idle');
    setTournamentTableSaveMessage('');

    setShowTournamentDetailModal(false);
    setShowTournamentOverview(false);

    let effectivePlayers = table.players || [];
    if ((table.id === 'table_final' || table.id === 'Final') && (!effectivePlayers || effectivePlayers.length === 0)) {
      const config = activeTournamentData?.config || {};
      const qVorrunde = config.qualifikationVorrunde || 1;
      const qSecondChance = config.qualifikationSecondChance || 1;
      const allResults = activeTournamentData?.results || [];
      const allTables = activeTournamentData?.tables || [];
      const vorrundeTables = allTables.filter((t: any) => t.id.startsWith("table_") && t.id !== "table_second_chance" && t.id !== "table_final");
      const scTable = allTables.find((t: any) => t.id === "table_second_chance");

      const computedFinalists: string[] = [];
      vorrundeTables.forEach((vt: any) => {
        const vtResults = allResults.filter((r: any) => r.tableId === vt.id).sort((a: any, b: any) => a.rank - b.rank);
        vtResults.forEach((r: any) => {
          if (r.rank <= qVorrunde) {
            computedFinalists.push(r.playerName);
          }
        });
      });

      if (scTable && (scTable.status === 'Abgeschlossen' || scTable.status === 'gespielt')) {
        const scResults = allResults.filter((r: any) => r.tableId === scTable.id).sort((a: any, b: any) => a.rank - b.rank);
        scResults.forEach((r: any) => {
          if (r.rank <= qSecondChance) {
            computedFinalists.push(r.playerName);
          }
        });
      }
      effectivePlayers = computedFinalists;
    }

    if (effectivePlayers && effectivePlayers.length > 0) {
      const prefilledPlayers = effectivePlayers.map((pName: string, i: number) => ({
        id: `p${i}`,
        name: pName,
        startWeight: 0,
        schnaepse: 0,
        isDisqualified: false
      }));
      setPlayerCount(prefilledPlayers.length);
      setPlayers(prefilledPlayers);
      setTempWeights(new Array(prefilledPlayers.length).fill(''));
      setGameState(GameState.START_WEIGHTS);
    } else {
      setPlayerCount(4);
      setGameState(GameState.PLAYER_COUNT);
    }
    setTournamentMode(true);
  };

  const handlePlayerCountConfirm = () => {
    const initialPlayers = Array.from({ length: playerCount }, (_, i) => ({
      id: `p${i}`,
      name: '',
      startWeight: 0,
      schnaepse: 0,
      isDisqualified: false
    }));
    setPlayers(initialPlayers);
    setGameState(GameState.PLAYER_NAMES);
    setAnnouncingPlayerIndex(0);
  };

  const handlePlayerNamesConfirm = () => {
    if (players.some(p => !p.name.trim())) {
      alert("Bitte alle Namen ausfüllen.");
      return;
    }
    setTempWeights(new Array(players.length).fill(''));
    setGameState(GameState.START_WEIGHTS);
  };

  const onWeightsSubmit = () => {
    const limit = isShortMode ? 330 : 500;
    const numericWeights = tempWeights.map(w => parseInt(w));
    for (let i = 0; i < numericWeights.length; i++) {
        if (isNaN(numericWeights[i]) || numericWeights[i] < limit) {
            setStartWeightError(`Das eingegebene Startgewicht bei "${players[i].name}" ist mit ${numericWeights[i] || 0}g zu niedrig (Minimum: ${limit}g).`);
            return;
        }
    }
    const updatedPlayers = players.map((p, i) => ({ ...p, startWeight: numericWeights[i] }));
    setPlayers(updatedPlayers);

    // Pick random start player before first target weight
    const active = updatedPlayers.filter(p => !p.isDisqualified);
    if (active.length > 0) {
      const randomIndex = Math.floor(Math.random() * active.length);
      setAnnouncingPlayerIndex(randomIndex);
      setShowStartPlayerModal(true);
    } else {
      setGameState(teams.length > 0 ? GameState.TEAM_ROUND_TARGET : GameState.ROUND_TARGET);
    }
  };

  const handleTargetWeightConfirm = (customTarget?: number) => {
    const target = (typeof customTarget === 'number') ? customTarget : parseInt(nextTargetInput);
    const activePlayers = players.filter(p => !p.isDisqualified);
    const prevResults = rounds.length === 0 
      ? activePlayers.map(p => p.startWeight) 
      : activePlayers.map(p => rounds[rounds.length - 1].results[p.id]);
    
    const range = getTargetRange(prevResults);
    
    if (typeof customTarget !== 'number') {
        if (isNaN(target) || target < range.min || target > range.max) {
            let reason = "";
            let correction = target;
            const currentMin = Math.min(...prevResults);
            const currentMax = Math.max(...prevResults);
            
            if (isNaN(target) || nextTargetInput.trim() === '') {
                reason = "Bitte ein gültiges Zielgewicht eingeben.";
                correction = Math.round(range.max);
            } else if (target > currentMin - 10) {
                reason = `Das Zielgewicht von ${target}g ist zu hoch. Es muss mindestens 10g unter dem aktuell niedrigsten Füllstand (${currentMin}g) liegen.`;
                correction = currentMin - 10;
            } else if (target < currentMax - 100) {
                reason = `Das Zielgewicht von ${target}g ist zu niedrig. Es darf maximal 100g unter dem aktuell höchsten Füllstand (${currentMax}g) liegen.`;
                correction = currentMax - 100;
            } else {
                reason = `Das Zielgewicht von ${target}g liegt außerhalb des gültigen Bereichs (${Math.round(range.min)}g - ${Math.round(range.max)}g).`;
                correction = Math.round(range.max);
            }
            setTargetWeightError({ message: reason, correction });
            return;
        }
    }

    const currentAnnouncer = activePlayers.length > 0 ? activePlayers[announcingPlayerIndex % activePlayers.length] : null;

    setRounds([...rounds, { targetWeight: target, results: {}, announcingPlayerId: currentAnnouncer?.id }]);
    setCurrentRoundResults({});
    setNextTargetInput('');
    setTeamStepIndex(0);
    setGameState(teams.length > 0 ? GameState.TEAM_GAMEPLAY : GameState.GAMEPLAY);
  };

  const handleNextRound = () => {
    const activePlayers = players.filter(p => !p.isDisqualified);
    if (!activePlayers.every(p => currentRoundResults[p.id] && !isNaN(parseInt(currentRoundResults[p.id])))) {
      alert("Bitte alle Gewichte eintragen.");
      return;
    }

    // Gameplay input validation: Weight cannot be higher than previous round
    for (const p of activePlayers) {
      const currWeight = parseInt(currentRoundResults[p.id]);
      const prevWeight = rounds.length <= 1 ? p.startWeight : rounds[rounds.length - 2].results[p.id];
      if (prevWeight !== undefined && currWeight > prevWeight) {
        alert(`Eingabefehler bei ${p.name}: Das eingegebene Gewicht (${currWeight}g) darf nicht höher sein als das vorherige Gewicht (${prevWeight}g).`);
        return;
      }
    }

    const updatedRounds = [...rounds];
    const currentRound = updatedRounds[updatedRounds.length - 1];
    activePlayers.forEach(p => { currentRound.results[p.id] = parseInt(currentRoundResults[p.id]); });

    const summary = getRoundSummary(currentRound, players, tournamentMode);
    const newlyDisqualified: any[] = [];
    const updatedPlayers = players.map(p => {
      if (p.isDisqualified) return p;
      const weight = currentRound.results[p.id];
      const dist = Math.abs(weight - currentRound.targetWeight);
      let disq = p.isDisqualified;
      if (tournamentMode && dist >= 50) { 
        disq = true; 
        newlyDisqualified.push({ name: p.name, diff: dist, reason: "Abweichung ≥ 50g" }); 
      }
      
      // Award points for EACH achievement (count occurrences in pointsToAward)
      const pointsThisRound = summary.pointsToAward.filter((id: string) => id === p.id).length;
      
      return { ...p, schnaepse: p.schnaepse + pointsThisRound, isDisqualified: disq };
    });

    finishRoundLogic(updatedPlayers, updatedRounds, newlyDisqualified, summary);
  };

  const finishRoundLogic = (updatedPlayers: Player[], updatedRounds: Round[], newlyDisqualified: any[], summary: any) => {
    const currentRound = updatedRounds[updatedRounds.length - 1];
    const triggerThreshold = isShortMode ? 278 : 445;
    const minStart = Math.min(...updatedPlayers.map(p => p.startWeight));
    const triggers: any[] = [];
    
    const allDisqualified = tournamentMode && updatedPlayers.length > 0 && updatedPlayers.every(p => p.isDisqualified);

    if (!currentRound.isFinal) {
      if (allDisqualified) {
        setFinalTriggered(false);
        setShowAutoTargetModal(null);
      } else {
        updatedPlayers.forEach(p => {
          if (currentRound.results[p.id] < minStart - triggerThreshold) {
            triggers.push({ name: p.name, weight: currentRound.results[p.id], limit: minStart - triggerThreshold });
          }
        });

        if (triggers.length > 0) {
          setFinalTriggered(true);
          setTriggeringPlayers(triggers);
          setShowAutoTargetModal(null);
        } else {
          const active = updatedPlayers.filter(p => !p.isDisqualified);
          const weights = active.map(p => currentRound.results[p.id]);
          const minW = Math.min(...weights);
          const maxW = Math.max(...weights);
          
          // Auto-target if range size < 10
          // Range is [maxW - 100, minW - 10]
          // Size is (minW - 10) - (maxW - 100) = minW - maxW + 90
          if (active.length > 0 && (minW - maxW + 90 < 10)) {
            setShowAutoTargetModal({ 
              target: Math.round(minW - 10), 
              reason: "Automatisches Zielgewicht gesetzt, da der berechnete Bereich für das Zielgewicht kleiner als 10 Gramm ist." 
            });
          } else {
            setShowAutoTargetModal(null);
          }
        }
      }
    }

    // Check achievements for intermediate round
    if (teams.length === 0 && gameState !== GameState.SPEED_RESULT && gameState !== GameState.SPEED_GAMEPLAY) {
      const newAch = checkAchievements(updatedPlayers, updatedRounds, teams, currentRound.isFinal || false, earnedAchievements);
      if (newAch && newAch.length > 0) {
        setNewlyEarnedAchievements(newAch);
        setEarnedAchievements(prev => {
          const updated = [...prev];
          newAch.forEach(ach => {
            const existing = updated.find(a => a.id === ach.id);
            if (existing) {
              ach.earnedBy.forEach(name => {
                if (!existing.earnedBy.includes(name)) {
                  existing.earnedBy.push(name);
                }
              });
            } else {
              updated.push({ ...ach });
            }
          });
          return updated;
        });
      }
    }

    setAnnouncingPlayerIndex(prev => prev + 1);
    setPlayers(updatedPlayers);
    setSummaryData(summary);
    setRounds(updatedRounds);
    setDisqualifiedNotice(newlyDisqualified.length > 0 ? newlyDisqualified : null);
    setShowSummary(true);
  };

  const handleModalSequence = () => {
    if (showSummary) {
      setShowSummary(false);
      if (newlyEarnedAchievements.length > 0) {
        setShowAchievements(true);
        return;
      }
    }

    if (showAchievements) {
      setShowAchievements(false);
      setNewlyEarnedAchievements([]);
    }

    if (gameState === GameState.SPEED_GAMEPLAY || gameState === GameState.SPEED_RESULT) {
      setGameState(GameState.SPEED_RESULT);
      return;
    }

    if (rounds.length > 0 && rounds[rounds.length - 1].isFinal) {
      setGameState(GameState.RESULT_SCREEN);
      if (teams.length === 0 && gameState !== GameState.SPEED_RESULT && gameState !== GameState.SPEED_GAMEPLAY) {
        const finalAch = checkAchievements(players, rounds, teams, true, earnedAchievements);
        if (finalAch && finalAch.length > 0) {
          setNewlyEarnedAchievements(finalAch);
          setEarnedAchievements(prev => {
            const updated = [...prev];
            finalAch.forEach(ach => {
              const existing = updated.find(a => a.id === ach.id);
              if (existing) {
                ach.earnedBy.forEach(name => {
                  if (!existing.earnedBy.includes(name)) {
                    existing.earnedBy.push(name);
                  }
                });
              } else {
                updated.push({ ...ach });
              }
            });
            return updated;
          });
          setShowAchievements(true);
        }
      }
    } else if (!disqualifiedNotice) {
      triggerNextStep();
    }
  };

  const triggerNextStep = () => {
    if (gameState === GameState.SPEED_GAMEPLAY || gameState === GameState.SPEED_RESULT) {
      setGameState(GameState.SPEED_RESULT);
      return;
    }
    const allDisqualified = tournamentMode && players.length > 0 && players.every(p => p.isDisqualified);
    if (allDisqualified) {
      setGameState(GameState.RESULT_SCREEN);
      return;
    }
    if (showAutoTargetModal) {
      handleTargetWeightConfirm(showAutoTargetModal.target);
      setShowAutoTargetModal(null);
      return;
    }
    if (finalTriggered) { setShowFinalIntro(true); return; }
    setGameState(teams.length > 0 ? GameState.TEAM_ROUND_TARGET : GameState.ROUND_TARGET);
  };

  const startFinalSequence = () => { 
    setShowFinalIntro(false); 
    setCurrentRoundTargets({});
    setGameState(GameState.FINAL_ROUND_TARGETS); 
  };

  const handleFinalTargetsConfirm = () => {
    const active = players.filter(p => !p.isDisqualified);
    if (!active.every(p => currentRoundTargets[p.id])) { alert("Alle Leergewichte schätzen."); return; }
    const indTargets: Record<string, number> = {};
    active.forEach(p => indTargets[p.id] = parseInt(currentRoundTargets[p.id]));
    const currentAnnouncer = active.length > 0 ? active[announcingPlayerIndex % active.length] : null;
    setRounds([...rounds, { targetWeight: 0, individualTargets: indTargets, results: {}, isFinal: true, announcingPlayerId: currentAnnouncer?.id }]);
    setCurrentRoundResults({});
    setGameState(GameState.FINAL_ROUND_RESULTS);
  };

  const handleFinalResultsConfirm = () => {
    const active = players.filter(p => !p.isDisqualified);
    if (!active.every(p => currentRoundResults[p.id])) { alert("Bitte alle Ergebnisse eintragen."); return; }
    const updatedRounds = [...rounds];
    const currentRound = updatedRounds[updatedRounds.length - 1];
    active.forEach(p => { currentRound.results[p.id] = parseInt(currentRoundResults[p.id]); });
    
    if (teams.length > 0) {
      const teamEval = teams.map(t => {
        let rawOffsetSum = 0;
        t.playerIds.forEach(pid => {
          const target = currentRound.individualTargets?.[pid] || 0;
          rawOffsetSum += (currentRound.results[pid] - target);
        });
        const absDist = Math.abs(rawOffsetSum);
        return { team: t, rawOffsetSum, absDist };
      });

      const absDists = teamEval.map(e => e.absDist);
      const isAllTie = teams.length > 1 && absDists.every(d => d === absDists[0]);
      const bullseyeTeams = teamEval.filter(e => e.absDist === 0);

      const penaltyPoints: Record<string, number> = {};
      teams.forEach(t => { penaltyPoints[t.id] = 0; });
      const eventMessages: string[] = [];

      if (isAllTie) {
        eventMessages.push("🤝 Gleichstand! Keine Punkte in dieser Runde.");
      } else {
        const maxDist = Math.max(...absDists);
        const worstTeams = teamEval.filter(e => e.absDist === maxDist);
        worstTeams.forEach(wt => {
          penaltyPoints[wt.team.id] += 1;
          eventMessages.push(`🪨 ${wt.team.name} hat den größten Abstand (${wt.absDist}g) und erhält 1 Strafpunkt.`);
        });

        if (bullseyeTeams.length > 0) {
          bullseyeTeams.forEach(be => {
            eventMessages.push(`🎯 ${be.team.name} trifft exakt! Alle anderen Teams erhalten 1 zusätzlichen Strafpunkt!`);
          });
          teamEval.forEach(e => {
            if (e.absDist > 0) {
              penaltyPoints[e.team.id] += 1;
            }
          });
        }
      }

      teamEval.forEach(e => {
        if (SPECIAL_NUMBERS.includes(e.absDist)) {
          penaltyPoints[e.team.id] += 1;
          eventMessages.push(`🥂 ${e.team.name} hat eine Schnappszahl als Abstand (${e.absDist}g)! +1 Strafpunkt.`);
        }
      });

      const updatedTeams = teams.map(t => ({
        ...t,
        points: t.points + (penaltyPoints[t.id] || 0)
      }));
      setTeams(updatedTeams);

      const summary = {
        isTeamSummary: true,
        teamEval,
        eventMessages,
        furthestPlayers: [],
        exactHits: [],
        specialHits: [],
        duplicates: [],
        pointsToAward: []
      };
      finishRoundLogic(players, updatedRounds, [], summary);
    } else {
      const summary = getRoundSummary(currentRound, players, tournamentMode);
      finishRoundLogic(players, updatedRounds, [], summary);
    }
  };

  // Speedwiegen Handlers
  const handleSpeedSetupConfirm = () => {
    if (!speedPlayerName.trim()) { alert("Bitte Namen eingeben."); return; }
    const lastLevel = parseInt(speedLevels);
    setSpeedTargets(prev => ({ ...prev, [lastLevel]: '0' }));
    setGameState(GameState.SPEED_CONFIG);
  };

  const startSpeedCountdown = () => {
    setGameState(GameState.SPEED_COUNTDOWN);
    setSpeedCountdown(3);
    const interval = setInterval(() => {
      setSpeedCountdown(prev => {
        if (prev === 3) return 2;
        if (prev === 2) return 1;
        if (prev === 1) return "LOS!";
        clearInterval(interval);
        setTimeout(() => {
          setGameState(GameState.SPEED_GAMEPLAY);
          setSpeedStartTime(Date.now());
        }, 1000);
        return prev;
      });
    }, 1000);
  };

  const handleSpeedConfigConfirm = () => {
    const lastLevel = parseInt(speedLevels);
    if (speedTargets[lastLevel] !== '0') {
      speedTargets[lastLevel] = '0'; // automatisch korrigieren
    }
    for (let i = 1; i <= lastLevel; i++) {
      if (!speedTargets[i] && speedTargets[i] !== '0') { alert("Bitte alle Zielgewichte ausfüllen."); return; }
    }
    startSpeedCountdown();
  };

  const handleLeertrinkenClick = () => {
    const levels = parseInt(speedLevels);
    for (let i = 1; i < levels; i++) {
      if (!speedResults[i]) { alert("Bitte alle bisherigen Ergebnisse eintragen."); return; }
    }
    setSpeedEndTime(Date.now());
    setEmptyWeightGuess('');
    setEmptyWeightActual('');
    setShowEmptyWeightModal(true);
  };

  const handleConfirmEmptyWeight = () => {
    if (!emptyWeightActual || isNaN(parseInt(emptyWeightActual))) {
      alert('Bitte tatsächliches Leergewicht eintragen.');
      return;
    }
    if (!emptyWeightGuess || isNaN(parseInt(emptyWeightGuess))) {
      alert('Bitte geschätztes Leergewicht eintragen.');
      return;
    }

    const lastLevel = parseInt(speedLevels);
    const updatedResults = { ...speedResults, [lastLevel]: emptyWeightActual };
    setSpeedResults(updatedResults);

    setShowEmptyWeightModal(false);
    setEmptyWeightGuess('');
    setEmptyWeightActual('');

    setGameState(GameState.SPEED_RESULT);

    const speedAch = checkSpeedAchievements(
      speedPlayerName || 'Gast',
      lastLevel,
      speedTargets,
      updatedResults,
      speedStartTime,
      speedEndTime || Date.now(),
      earnedAchievements
    );

    if (speedAch && speedAch.length > 0) {
      setNewlyEarnedAchievements(speedAch);
      setEarnedAchievements(prev => {
        const updated = [...prev];
        speedAch.forEach(ach => {
          const existing = updated.find(a => a.id === ach.id);
          if (existing) {
            ach.earnedBy.forEach(name => {
              if (!existing.earnedBy.includes(name)) {
                existing.earnedBy.push(name);
              }
            });
          } else {
            updated.push({ ...ach });
          }
        });
        return updated;
      });
      setShowAchievements(true);
    }
  };

  const handleSpeedGameplayConfirm = () => {
    handleLeertrinkenClick();
  };

  // Teamwiegen Handlers
  const handleTeamSetupConfirm = () => {
    const initialTeams: Team[] = [];
    const initialPlayers: Player[] = [];
    let pIdx = 0;
    for (let i = 1; i <= teamCount; i++) {
      const pIds: string[] = [];
      const size = teamSizes[i] || 2;
      for (let s = 0; s < size; s++) {
        const pId = `p${pIdx++}`;
        pIds.push(pId);
        initialPlayers.push({ id: pId, name: '', startWeight: 0, schnaepse: 0 });
      }
      initialTeams.push({ id: `t${i}`, name: `Team ${i}`, playerIds: pIds, points: 0 });
    }
    setTeams(initialTeams);
    setPlayers(initialPlayers);
    setGameState(GameState.TEAM_NAMES);
  };

  const handleTeamNamesConfirm = () => {
    if (players.some(p => !p.name.trim()) || teams.some(t => !t.name.trim())) {
      alert("Bitte alle Namen ausfüllen.");
      return;
    }
    setTempWeights(new Array(players.length).fill(''));
    setGameState(GameState.TEAM_START_WEIGHTS);
  };

  const handleTeamNextStep = () => {
    if (teams.length === 0) return;
    const maxTeamSize = Math.max(...teams.map(t => t.playerIds.length));
    const safeRowIndex = Math.min(teamStepIndex, maxTeamSize - 1);

    // Find all player IDs present in row safeRowIndex
    const activeRowPlayerIds = teams
      .map(t => t.playerIds[safeRowIndex])
      .filter((pid): pid is string => Boolean(pid));

    const missing = activeRowPlayerIds.some(
      pid => !currentRoundResults[pid] || currentRoundResults[pid] === '' || isNaN(parseInt(currentRoundResults[pid]))
    );
    if (missing) {
      alert("Bitte die Gewichte für alle Mitglieder dieser Reihe eintragen.");
      return;
    }

    if (safeRowIndex < maxTeamSize - 1) {
      setTeamStepIndex(safeRowIndex + 1);
      return;
    }

    // Evaluate whole round
    const updatedRounds = [...rounds];
    const currentRound = updatedRounds[updatedRounds.length - 1];
    players.forEach(p => {
      currentRound.results[p.id] = parseInt(currentRoundResults[p.id]) || 0;
    });

    const targetWeight = currentRound.targetWeight;

    const teamEval = teams.map(t => {
      let rawOffsetSum = 0;
      t.playerIds.forEach(pId => {
        const val = currentRound.results[pId] || 0;
        rawOffsetSum += (val - targetWeight);
      });
      const absDist = Math.abs(rawOffsetSum);
      return { team: t, rawOffsetSum, absDist };
    });

    const absDists = teamEval.map(e => e.absDist);
    const isAllTie = teams.length > 1 && absDists.every(d => d === absDists[0]);
    const bullseyeTeams = teamEval.filter(e => e.absDist === 0);

    const penaltyPoints: Record<string, number> = {};
    teams.forEach(t => { penaltyPoints[t.id] = 0; });
    const eventMessages: string[] = [];

    // 1. Gleichstand
    if (isAllTie) {
      eventMessages.push("🤝 Gleichstand! Keine Punkte in dieser Runde.");
    } else {
      // 2. Normaler Fall
      const maxDist = Math.max(...absDists);
      const worstTeams = teamEval.filter(e => e.absDist === maxDist);
      worstTeams.forEach(wt => {
        penaltyPoints[wt.team.id] += 1;
        eventMessages.push(`🪨 ${wt.team.name} hat den größten Abstand (${wt.absDist}g) und erhält 1 Strafpunkt.`);
      });

      // 3. Volltreffer
      if (bullseyeTeams.length > 0) {
        bullseyeTeams.forEach(be => {
          eventMessages.push(`🎯 ${be.team.name} trifft exakt! Alle anderen Teams erhalten 1 zusätzlichen Strafpunkt!`);
        });
        teamEval.forEach(e => {
          if (e.absDist > 0) {
            penaltyPoints[e.team.id] += 1;
          }
        });
      }
    }

    // 4. Schnappszahl
    teamEval.forEach(e => {
      if (SPECIAL_NUMBERS.includes(e.absDist)) {
        penaltyPoints[e.team.id] += 1;
        eventMessages.push(`🥂 ${e.team.name} hat eine Schnappszahl als Abstand (${e.absDist}g)! +1 Strafpunkt.`);
      }
    });

    const updatedTeams = teams.map(t => ({
      ...t,
      points: t.points + (penaltyPoints[t.id] || 0)
    }));

    setTeams(updatedTeams);
    setRounds(updatedRounds);

    // Check for final round trigger
    const triggerThreshold = isShortMode ? 278 : 450;
    const minStart = Math.min(...players.map(p => p.startWeight));
    const triggers: any[] = [];
    players.forEach(p => {
      if (currentRound.results[p.id] < minStart - triggerThreshold) {
        triggers.push({ name: p.name, weight: currentRound.results[p.id], limit: minStart - triggerThreshold });
      }
    });

    if (triggers.length > 0) {
      setFinalTriggered(true);
      setTriggeringPlayers(triggers);
    }

    const teamAch = checkTeamAchievements(
      updatedTeams,
      players,
      updatedRounds,
      triggers.length > 0,
      earnedAchievements
    );

    if (teamAch && teamAch.length > 0) {
      setNewlyEarnedAchievements(teamAch);
      setEarnedAchievements(prev => {
        const updated = [...prev];
        teamAch.forEach(ach => {
          const existing = updated.find(a => a.id === ach.id);
          if (existing) {
            ach.earnedBy.forEach(name => {
              if (!existing.earnedBy.includes(name)) {
                existing.earnedBy.push(name);
              }
            });
          } else {
            updated.push({ ...ach });
          }
        });
        return updated;
      });
    }

    setAnnouncingPlayerIndex(prev => prev + 1);

    setSummaryData({
      isTeamSummary: true,
      teamEval,
      eventMessages,
      furthestPlayers: [],
      exactHits: [],
      specialHits: [],
      duplicates: [],
      pointsToAward: []
    });
    setShowSummary(true);
  };

  const downloadCSV = () => {
    let csv = "";
    if (gameState === GameState.SPEED_RESULT) {
      csv = "Stufe;Ziel;Ergebnis;Abstand\n";
      Array.from({ length: parseInt(speedLevels) }).forEach((_, i) => {
        const target = speedTargets[i+1];
        const result = speedResults[i+1];
        const diff = Math.abs((parseInt(result) || 0) - (parseInt(target) || 0));
        csv += `${i+1};${target}g;${result}g;${diff}g\n`;
      });
      const timeSec = (speedEndTime! - speedStartTime!) / 1000;
      csv += `\nZeit;${timeSec.toFixed(2)}s\n`;
      const totalDiff = Object.keys(speedResults).reduce((acc, key) => {
        const k = parseInt(key);
        return acc + Math.abs((parseInt(speedResults[k]) || 0) - (parseInt(speedTargets[k]) || 0));
      }, 0);
      csv += `Gesamt-Score;${(timeSec + totalDiff).toFixed(2)}\n`;
    } else {
      csv = "Runde;Ziel;";
      players.forEach(p => csv += `${p.name};`);
      csv += "\n";
      rounds.forEach((r, i) => {
        csv += `${i+1};${r.isFinal ? 'Finale' : r.targetWeight + 'g'};`;
        players.forEach(p => csv += `${r.results[p.id] || '-'};`);
        csv += "\n";
      });
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = gameState === GameState.SPEED_RESULT ? `Speedwiegen_${speedPlayerName}.csv` : "Bundeswiega_Export.csv";
    a.click();
  };

  const handleUploadResults = async () => {
    setUploadState('loading');
    setUploadMessage('');

    try {
      const today = new Date().toLocaleDateString('de-DE');
      let gameMode = 'Standardspiel';
      let resultsToUpload: Array<{ name: string; avg: number; schnaepse: number; levels?: number }> = [];

      if (gameState === GameState.SPEED_RESULT) {
        gameMode = speedIsShortMode ? 'Speedwiegen (0,33L)' : 'Speedwiegen (500ml)';
        const totalLevels = parseInt(speedLevels) || 1;
        let totalDiff = 0;
        Array.from({ length: totalLevels }).forEach((_, i) => {
          const target = parseInt(speedTargets[i+1]) || 0;
          const result = parseInt(speedResults[i+1]) || 0;
          totalDiff += Math.abs(result - target);
        });
        const avg = Number((totalDiff / totalLevels).toFixed(2));
        const timeSec = speedStartTime && speedEndTime ? Number(((speedEndTime - speedStartTime) / 1000).toFixed(2)) : 0;
        resultsToUpload = [{ name: speedPlayerName || "Gast", avg, schnaepse: timeSec, levels: totalLevels }];
      } else if (gameState === GameState.RESULT_SCREEN) {
        if (teams.length > 0) {
          gameMode = 'Teamwiegen';
          resultsToUpload = teams.map(t => {
            let totalOffset = 0;
            let roundsCount = 0;
            rounds.forEach(r => {
              let roundOffset = 0;
              let playersCount = 0;
              t.playerIds.forEach(pid => {
                const val = r.results[pid];
                if (val !== undefined && val !== null) {
                  roundOffset += Math.abs(val - r.targetWeight);
                  playersCount++;
                }
              });
              if (playersCount > 0) {
                totalOffset += (roundOffset / playersCount);
                roundsCount++;
              }
            });
            const avg = roundsCount > 0 ? (totalOffset / roundsCount) : 0;
            return {
              name: t.name,
              avg: Number(avg.toFixed(2)),
              schnaepse: t.points
            };
          });
        } else {
          gameMode = isShortMode ? 'Standardspiel (0,33L)' : 'Standardspiel (500ml)';
          resultsToUpload = players.map(p => {
            const avg = calculateAverageDistance(p.id, rounds);
            return {
              name: p.name,
              avg: Number(avg.toFixed(2)),
              schnaepse: p.schnaepse
            };
          });
        }
      }

      if (resultsToUpload.length === 0) {
        setUploadState('error');
        setUploadMessage('Keine Ergebnisse zum Hochladen vorhanden.');
        return;
      }

      console.log("Uploading to backend:", { gameMode, results: resultsToUpload, date: today, achievements: earnedAchievements });
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gameMode,
          results: resultsToUpload,
          date: today,
          achievements: earnedAchievements
        })
      });

      const data = await response.json();
      if (response.ok) {
        setUploadState('success');
        setUploadMessage(data.message || 'Ergebnisse erfolgreich hochgeladen!');
        setResultsSaved(true);
      } else {
        setUploadState('error');
        setUploadMessage(data.error || 'Fehler beim Hochladen der Ergebnisse.');
      }
    } catch (err: any) {
      console.error("Error calling upload API:", err);
      setUploadState('error');
      setUploadMessage(err.message || 'Netzwerkfehler beim Hochladen.');
    }
  };

  const getParticipatingItems = () => {
    let items: Array<{ id: string; name: string; avg: number; schnaepse: number; levels?: number }> = [];
    if (gameState === GameState.SPEED_RESULT) {
      const totalLevels = parseInt(speedLevels) || 1;
      let totalDiff = 0;
      Array.from({ length: totalLevels }).forEach((_, i) => {
        const target = parseInt(speedTargets[i+1]) || 0;
        const result = parseInt(speedResults[i+1]) || 0;
        totalDiff += Math.abs(result - target);
      });
      const avg = Number((totalDiff / totalLevels).toFixed(2));
      const timeSec = speedStartTime && speedEndTime ? Number(((speedEndTime - speedStartTime) / 1000).toFixed(2)) : 0;
      items = [{
        id: 'speed_player',
        name: speedPlayerName || 'Gast',
        avg,
        schnaepse: timeSec,
        levels: totalLevels
      }];
    } else if (gameState === GameState.RESULT_SCREEN) {
      if (teams.length > 0) {
        items = teams.map(t => {
          let totalOffset = 0;
          let roundsCount = 0;
          rounds.forEach(r => {
            let roundOffset = 0;
            let playersCount = 0;
            t.playerIds.forEach(pid => {
              const val = r.results[pid];
              if (val !== undefined && val !== null) {
                roundOffset += Math.abs(val - r.targetWeight);
                playersCount++;
              }
            });
            if (playersCount > 0) {
              totalOffset += (roundOffset / playersCount);
              roundsCount++;
            }
          });
          const avg = roundsCount > 0 ? (totalOffset / roundsCount) : 0;
          return {
            id: t.id,
            name: t.name,
            avg: Number(avg.toFixed(2)),
            schnaepse: t.points
          };
        });
      } else {
        items = players.map(p => ({
          id: p.id,
          name: p.name,
          avg: Number(calculateAverageDistance(p.id, rounds).toFixed(2)),
          schnaepse: p.schnaepse
        }));
      }
    }
    return items;
  };

  const isLinkedToAccount = (item: { id: string; name: string }) => {
    return Object.entries(playerAccountLinks).some(([playerId, link]: [string, { userId: string; userName: string; imageUrl?: string }]) => {
      const player = players.find(p => p.id === playerId);
      return (player?.name === item.name || player?.id === item.id) && !!link.userId;
    });
  };

  const openSaveModal = async () => {
    const allItems = getParticipatingItems();
    const guestItems = allItems.filter(item => !isLinkedToAccount(item));

    if (guestItems.length === 0 && allItems.length > 0) {
      alert('Alle Spieler haben Accounts. Ergebnisse wurden automatisch gespeichert.');
      return;
    }

    setShowSaveModal(true);
    setSaveModalLoadingCsv(true);
    setSaveModalCsvError(null);
    setSaveModalSuccess(false);
    setSaveModalError(null);
    setSaveAchievementsChecked(true);

    const initialChecked: Record<string, boolean> = {};
    guestItems.forEach(it => { initialChecked[it.id] = true; });
    setSaveModalChecked(initialChecked);

    try {
      const res = await fetch('/api/records');
      const json = await res.json();
      if (res.ok && json.data) {
        const isTeamMode = (gameState === GameState.RESULT_SCREEN && teams.length > 0);
        const namesSet = new Set<string>();
        json.data.slice(1).forEach((row: string[]) => {
          if (row && row[2] && row[2].trim()) {
            const rowMode = row[1] ? row[1].trim() : '';
            if (isTeamMode) {
              if (rowMode === 'Teamwiegen') {
                namesSet.add(row[2].trim());
              }
            } else {
              if (rowMode !== 'Teamwiegen') {
                namesSet.add(row[2].trim());
              }
            }
          }
        });
        const sorted = Array.from(namesSet).sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));
        setCsvNames(sorted);

        const initialMappings: Record<string, string> = {};
        guestItems.forEach(it => {
          const match = sorted.find(c => c.trim().toLowerCase() === it.name.trim().toLowerCase());
          initialMappings[it.id] = match || '__NEW__';
        });

        // Teil 5: Wenn eingeloggt: versuche den eigenen Namen zuzuordnen
        if (isSignedIn && supabaseUser) {
          const userName = supabaseUser.user_metadata?.username || supabaseUser.email || '';
          if (userName) {
            const matchingItem = guestItems.find(it =>
              it.name.toLowerCase() === userName.toLowerCase() ||
              userName.toLowerCase().includes(it.name.toLowerCase()) ||
              it.name.toLowerCase().includes(userName.toLowerCase())
            );
            if (matchingItem) {
              const matchedCsv = sorted.find(c => c.trim().toLowerCase() === userName.toLowerCase());
              initialMappings[matchingItem.id] = matchedCsv || userName;
            }
          }
        }

        setSaveModalMappings(initialMappings);
      } else {
        setSaveModalCsvError('CSV-Namen konnten nicht geladen werden.');
        setCsvNames([]);
        const initialMappings: Record<string, string> = {};
        guestItems.forEach(it => { initialMappings[it.id] = '__NEW__'; });
        setSaveModalMappings(initialMappings);
      }
    } catch (err) {
      console.error('Error fetching records for save modal:', err);
      setSaveModalCsvError('CSV-Namen konnten nicht geladen werden.');
      setCsvNames([]);
      const initialMappings: Record<string, string> = {};
      guestItems.forEach(it => { initialMappings[it.id] = '__NEW__'; });
      setSaveModalMappings(initialMappings);
    } finally {
      setSaveModalLoadingCsv(false);
    }
  };

  const handleSaveResultsModalSubmit = async () => {
    setSaveModalSubmitting(true);
    setSaveModalError(null);
    setSaveModalSuccess(false);

    try {
      const today = new Date().toLocaleDateString('de-DE');
      let gameMode = 'Standardspiel';
      if (gameState === GameState.SPEED_RESULT) {
        gameMode = speedIsShortMode ? 'Speedwiegen (0,33L)' : 'Speedwiegen (500ml)';
      } else if (gameState === GameState.RESULT_SCREEN) {
        if (teams.length > 0) {
          gameMode = 'Teamwiegen';
        } else {
          gameMode = isShortMode ? 'Standardspiel (0,33L)' : 'Standardspiel (500ml)';
        }
      }

      const items = getParticipatingItems();
      const selectedItems = items.filter(it => saveModalChecked[it.id]);

      if (selectedItems.length === 0) {
        setSaveModalError('Bitte mindestens einen Spieler auswählen.');
        setSaveModalSubmitting(false);
        return;
      }

      const resultsToUpload = selectedItems.map(it => {
        const mapping = saveModalMappings[it.id];
        const finalName = (mapping && mapping !== '__NEW__') ? mapping : it.name;
        return {
          name: finalName,
          avg: it.avg,
          schnaepse: it.schnaepse,
          ...(it.levels !== undefined ? { levels: it.levels } : {})
        };
      });

      const achievementsToUpload: Achievement[] = [];
      earnedAchievements.forEach(ach => {
        const isTogether = ach.earnedBy.length > 1 || TOGETHER_ACHIEVEMENT_IDS.includes(ach.id);
        const checkedNames: string[] = [];
        let uncheckedCount = 0;

        ach.earnedBy.forEach(originalName => {
          const matchItem = items.find(i => i.name.trim().toLowerCase() === originalName.trim().toLowerCase());
          if (matchItem) {
            const isChecked = saveModalChecked[matchItem.id] !== false;
            if (isChecked) {
              const mapping = saveModalMappings[matchItem.id];
              const finalName = (mapping && mapping !== '__NEW__') ? mapping : matchItem.name;
              checkedNames.push(finalName);
            } else {
              uncheckedCount++;
            }
          } else {
            checkedNames.push(originalName);
          }
        });

        if (!isTogether) {
          if (checkedNames.length > 0 && uncheckedCount === 0) {
            achievementsToUpload.push({
              ...ach,
              earnedBy: checkedNames
            });
          }
        } else {
          if (checkedNames.length > 0) {
            if (uncheckedCount > 0) {
              achievementsToUpload.push({
                ...ach,
                earnedBy: [...checkedNames, 'und andere']
              });
            } else {
              achievementsToUpload.push({
                ...ach,
                earnedBy: checkedNames
              });
            }
          }
        }
      });

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameMode,
          results: resultsToUpload,
          date: today,
          achievements: achievementsToUpload
        })
      });

      const data = await response.json();
      if (response.ok) {
        if (selectedTournamentName && activeTournamentTableId) {
          try {
            const tRes = await fetch('/api/tournament/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'saveTableResult',
                name: selectedTournamentName,
                tableId: activeTournamentTableId,
                results: resultsToUpload.map((r, idx) => ({
                  name: r.name,
                  rank: idx + 1,
                  avg: r.avg,
                  schnaepse: r.schnaepse
                })),
                date: today
              })
            });

            if (tRes.ok && activeTournamentTableId === 'table_final') {
              const tGetRes = await fetch(`/api/tournament/get?name=${encodeURIComponent(selectedTournamentName)}`);
              if (tGetRes.ok) {
                const tourneyData = await tGetRes.json();
                const earnedTourneyAchs = checkTournamentAchievements(tourneyData);
                if (earnedTourneyAchs.length > 0) {
                  const tourneyAchObjs: Achievement[] = earnedTourneyAchs.map(e => {
                    const def = MASTER_ACHIEVEMENTS_DEFINITIONS.find(a => a.id === e.id);
                    return {
                      id: e.id,
                      title: def ? def.title : e.id,
                      description: def ? def.description : '',
                      icon: def ? def.icon : '🏆',
                      rarity: def ? def.rarity : 'common',
                      earnedBy: e.earnedBy
                    };
                  });
                  setEarnedAchievements(prev => [...prev, ...tourneyAchObjs]);
                  setNewlyEarnedAchievements(tourneyAchObjs);
                  setShowAchievements(true);
                }
              }
            }
          } catch (tErr) {
            console.error('Error saving tournament table result:', tErr);
          }
        }

        setSaveModalSuccess(true);
        setResultsSaved(true);
        setTimeout(() => {
          setShowSaveModal(false);
          setSaveModalSuccess(false);
        }, 2000);
      } else {
        setSaveModalError(data.error || 'Fehler beim Speichern der Ergebnisse.');
      }
    } catch (err: any) {
      console.error('Error in save results submit:', err);
      setSaveModalError(err.message || 'Netzwerkfehler beim Speichern.');
    } finally {
      setSaveModalSubmitting(false);
    }
  };

  const fetchRecords = async () => {
    setRecordsLoading(true);
    setRecordsError(null);
    try {
      const [csvRes, accountRes] = await Promise.all([
        fetch('/api/records').catch(() => null),
        fetch('/api/users/public-records').catch(() => null)
      ]);

      let csvData: any[][] = [];
      if (csvRes && csvRes.ok) {
        const json = await csvRes.json();
        csvData = json.data || [];
      }

      let accountRecords: any[] = [];
      if (accountRes && accountRes.ok) {
        const json = await accountRes.json();
        accountRecords = json.records || [];
        if (json.users && Array.isArray(json.users)) {
          setClerkUsers(json.users);
        }
      }

      const headerRow = csvData.length > 0 ? csvData[0] : ["Datum", "Modus", "Name", "Avg", "Schnaepse", "Levels", "Achievements"];
      const csvContentRows = csvData.slice(1);

      const accountRows = accountRecords.map((rec: any) => [
        rec.date || '',
        rec.gameMode || 'Standardspiel',
        rec.playerName || '',
        String(rec.avg || 0),
        String(rec.schnaepse || 0),
        rec.levels !== undefined ? String(rec.levels) : "",
        typeof rec.achievements === 'string' ? rec.achievements : JSON.stringify(rec.achievements || [])
      ]);

      const combinedData = [headerRow, ...csvContentRows, ...accountRows];
      setRecordsData(combinedData);

      const namesSet = new Set<string>();
      csvContentRows.forEach((row: string[]) => {
        if (row && row[2] && row[2].trim()) {
          namesSet.add(row[2].trim());
        }
      });
      const sortedNames = Array.from(namesSet).sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));
      setCsvNames(sortedNames);
    } catch (err: any) {
      setRecordsError(err.message || 'Verbindungsfehler beim Laden.');
    } finally {
      setRecordsLoading(false);
    }
  };

  // Auto-fill player 1 name from Supabase account if signed in
  useEffect(() => {
    if (isSignedIn && supabaseUser && gameState === GameState.PLAYER_NAMES && players.length > 0) {
      const userName = supabaseUser.user_metadata?.username || supabaseUser.email || '';

      if (userName && (!players[0].name || players[0].name.trim() === '')) {
        setPlayers(prev => prev.map((p, i) =>
          i === 0 ? { ...p, name: userName } : p
        ));
        setPlayerAccountLinks(prev => ({
          ...prev,
          [players[0].id]: { userId: supabaseUser.id, userName, imageUrl: supabaseUser.user_metadata?.avatar_url }
        }));
      }
    }
  }, [gameState, isSignedIn, supabaseUser]);

  const showModeFooter = ![GameState.START, GameState.PLAYER_COUNT, GameState.TEAM_SETUP, GameState.SPEED_SETUP].includes(gameState);

  return (
    <div className={`min-h-screen flex flex-col p-4 md:p-8 pt-safe-top pb-safe-bottom overflow-y-auto transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <header className="flex justify-between items-center mb-8 max-w-6xl mx-auto w-full flex-wrap gap-2">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => gameState !== GameState.START && setShowResetConfirm(true)}>
          <img src={LOGO_URL} alt="Logo" className="w-10 h-10 object-contain" />
          <h1 className="text-2xl font-black tracking-tighter" style={{ color: BRAND_COLOR }}>1. Bundeswiega</h1>
        </div>
        <div className="flex items-center space-x-2">
          {!isSignedIn ? (
            <>
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setAuthError(null); setShowAuthModal(true); }}
                className="px-4 py-2 rounded-xl border-2 font-bold text-sm cursor-pointer hover:opacity-80 transition-all active:scale-95"
                style={{ borderColor: BRAND_COLOR, color: BRAND_COLOR }}
              >
                Anmelden
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setAuthError(null); setShowAuthModal(true); }}
                className="px-4 py-2 rounded-xl text-white font-bold text-sm cursor-pointer hover:opacity-80 transition-all active:scale-95"
                style={{ backgroundColor: BRAND_COLOR }}
              >
                Registrieren
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  if (!recordsData || recordsData.length === 0) fetchRecords();
                  setShowProfileModal(true);
                }}
                className="px-3 py-2 rounded-xl text-white font-bold text-xs flex items-center space-x-2 cursor-pointer hover:opacity-90 shadow transition-all"
                style={{ backgroundColor: BRAND_COLOR }}
              >
                {supabaseUser?.user_metadata?.avatar_url ? (
                  <img src={supabaseUser.user_metadata.avatar_url} className="w-5 h-5 rounded-full object-cover" alt="User avatar" />
                ) : (
                  <i className="fas fa-user"></i>
                )}
                <span>Profil verwalten</span>
                {isAdmin && <span className="text-yellow-300">👑</span>}
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-3 py-2 rounded-xl border border-gray-500/30 font-bold text-xs opacity-60 hover:opacity-100 cursor-pointer"
              >
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </div>
          )}
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full border border-gray-700/30 cursor-pointer">
            <i className={`fas ${darkMode ? 'fa-sun text-yellow-400' : 'fa-moon text-indigo-600'}`}></i>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center max-w-4xl w-full mx-auto relative">
        {gameState === GameState.START && (
          <div className="text-center animate-in fade-in duration-700">
            <img src={LOGO_URL} className="w-64 h-64 mx-auto mb-12 drop-shadow-2xl" alt="Bundeswiega Logo" />
            <h1 className="text-5xl font-black mb-12 tracking-tighter uppercase" style={{ color: BRAND_COLOR }}>1. Bundeswiega</h1>
            <div className="flex flex-col space-y-4 max-w-xs mx-auto">
              {isSignedIn && (
                <button
                  onClick={openJoinTableModal}
                  className="text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 flex items-center justify-center space-x-2 cursor-pointer transition-transform"
                  style={{ backgroundColor: BRAND_COLOR }}
                >
                  <i className="fas fa-qrcode"></i>
                  <span>An Tisch teilnehmen</span>
                </button>
              )}
              <button onClick={startGame} className="text-white font-bold py-5 rounded-3xl shadow-xl active:scale-95 text-xl flex items-center justify-center space-x-2" style={{ backgroundColor: BRAND_COLOR }}>
                <i className="fas fa-play"></i><span>Spiel starten</span>
              </button>
              <button onClick={() => { setShowTournamentOverview(true); fetchTournamentsList(); }} className="text-white font-bold py-5 rounded-3xl shadow-xl active:scale-95 text-xl flex items-center justify-center space-x-2 cursor-pointer" style={{ backgroundColor: '#238183' }}>
                <i className="fas fa-trophy text-amber-300"></i><span>Turnier spielen</span>
              </button>
              <button onClick={startSpeedwiegen} className="text-white font-bold py-5 rounded-3xl shadow-xl active:scale-95 text-xl flex items-center justify-center space-x-2" style={{ backgroundColor: DARK_GRAY }}>
                <i className="fas fa-bolt"></i><span>Speedwiegen</span>
              </button>
              <button onClick={startTeamwiegen} className="text-white font-bold py-5 rounded-3xl shadow-xl active:scale-95 text-xl flex items-center justify-center space-x-2" style={{ backgroundColor: DARK_GRAY }}>
                <i className="fas fa-users"></i><span>Teamwiegen</span>
              </button>
              <button onClick={() => setShowRules(true)} className="text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 flex items-center justify-center space-x-2" style={{ backgroundColor: BRAND_COLOR }}>
                <i className="fas fa-book"></i><span>Regeln</span>
              </button>
              {isSignedIn && (
                <div className="relative inline-block w-full">
                  {/* Animierte Sternchen für Glitzer-Effekt */}
                  <div className="absolute inset-0 pointer-events-none overflow-visible">
                    <span className="absolute -top-2 -left-2 text-white text-xs animate-twinkle" style={{ animationDuration: '1.8s', animationDelay: '0s' }}>✦</span>
                    <span className="absolute -top-3 -right-2 text-yellow-200 text-sm animate-twinkle" style={{ animationDuration: '2.3s', animationDelay: '0.4s' }}>✨</span>
                    <span className="absolute -bottom-2 -left-3 text-white text-sm animate-twinkle" style={{ animationDuration: '1.5s', animationDelay: '0.8s' }}>✨</span>
                    <span className="absolute -bottom-3 -right-1 text-yellow-100 text-xs animate-twinkle" style={{ animationDuration: '2.1s', animationDelay: '0.2s' }}>✦</span>
                    <span className="absolute top-1/2 -left-4 -translate-y-1/2 text-white text-xs animate-twinkle" style={{ animationDuration: '1.9s', animationDelay: '0.6s' }}>✦</span>
                    <span className="absolute top-1/2 -right-4 -translate-y-1/2 text-yellow-200 text-xs animate-twinkle" style={{ animationDuration: '2.5s', animationDelay: '1.1s' }}>✦</span>
                  </div>
                  <button onClick={() => { setShowRecords(true); fetchRecords(); }} className="w-full text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 flex items-center justify-center space-x-2 relative z-10 cursor-pointer" style={{ backgroundColor: GOLD_COLOR }}>
                    <i className="fas fa-trophy text-amber-300"></i><span>Rekorde</span>
                  </button>
                </div>
              )}

              {isAdmin && (
                <button
                  onClick={openAdminPanel}
                  className="w-full text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 flex items-center justify-center space-x-2 cursor-pointer transition-transform"
                  style={{ backgroundColor: '#DC2626' }}
                >
                  <i className="fas fa-shield-alt"></i>
                  <span>👑 Admin Panel</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* PLAYER_COUNT SCREEN */}
        {gameState === GameState.PLAYER_COUNT && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-md text-center">
            <h2 className="text-2xl font-black mb-8">Spieleranzahl</h2>
            <select value={playerCount} onChange={e => setPlayerCount(parseInt(e.target.value))} className="w-full p-4 rounded-xl border-2 mb-8 bg-transparent font-bold text-center" style={{ borderColor: BRAND_COLOR }}>
              {[2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} Spieler</option>)}
            </select>
            <div className="flex flex-col space-y-4 items-center justify-center mb-8">
              <div className="flex items-center space-x-2">
                <div className="relative inline-block w-10 h-6">
                  <input type="checkbox" id="sm-count" checked={isShortMode} onChange={e => setIsShortMode(e.target.checked)} className="opacity-0 w-0 h-0" />
                  <label htmlFor="sm-count" className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${isShortMode ? '' : 'bg-gray-400'}`} style={{ backgroundColor: isShortMode ? BRAND_COLOR : undefined }}>
                    <span className={`absolute left-1 bottom-1 bg-white w-4 h-4 rounded-full transition-transform ${isShortMode ? 'translate-x-4' : ''}`}></span>
                  </label>
                </div>
                <label htmlFor="sm-count" className="font-bold text-sm select-none">0,33 L Modus</label>
                <button onClick={() => setShowModeInfo(true)} className="w-6 h-6 rounded-full border border-gray-500 text-xs flex items-center justify-center text-gray-500"><i className="fas fa-question"></i></button>
              </div>

              <div className="flex items-center space-x-2">
                <div className="relative inline-block w-10 h-6">
                  <input type="checkbox" id="tournament-switch" checked={tournamentMode} onChange={e => setTournamentMode(e.target.checked)} className="opacity-0 w-0 h-0" />
                  <label htmlFor="tournament-switch" className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${tournamentMode ? '' : 'bg-gray-400'}`} style={{ backgroundColor: tournamentMode ? BRAND_COLOR : undefined }}>
                    <span className={`absolute left-1 bottom-1 bg-white w-4 h-4 rounded-full transition-transform ${tournamentMode ? 'translate-x-4' : ''}`}></span>
                  </label>
                </div>
                <label htmlFor="tournament-switch" className="font-bold text-sm select-none">Turnier Modus</label>
                <button onClick={() => setShowTournamentInfo(true)} className="w-6 h-6 rounded-full border border-gray-500 text-xs flex items-center justify-center text-gray-500"><i className="fas fa-question"></i></button>
              </div>
            </div>
            <button onClick={handlePlayerCountConfirm} className="w-full text-white font-bold py-4 rounded-2xl active:scale-95 shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>Namen eingeben</button>
          </div>
        )}

        {/* PLAYER_NAMES SCREEN */}
        {gameState === GameState.PLAYER_NAMES && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-xl">
            <h2 className="text-2xl font-black mb-8 text-center">Spielernamen</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {players.map((p, i) => (
                <div key={p.id} className="flex flex-col space-y-2 p-3 rounded-2xl border bg-black/5 dark:bg-white/5 border-gray-500/20">
                  <input
                    type="text"
                    value={p.name}
                    onChange={e => setPlayers(players.map(x => x.id === p.id ? { ...x, name: e.target.value } : x))}
                    placeholder={`Spieler ${i+1} (Gast)`}
                    className={`w-full p-3 rounded-xl border-2 bg-transparent font-bold ${darkMode ? 'text-white border-white/20' : 'text-black border-black/20'}`}
                    style={{ borderColor: p.name ? BRAND_COLOR : '' }}
                  />
                  {!playerAccountLinks[p.id] ? (
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => startQrScanner(p.id)}
                        className="flex-1 py-2 rounded-xl border-2 font-bold text-xs flex items-center justify-center space-x-1 cursor-pointer hover:opacity-80 transition-all"
                        style={{ borderColor: BRAND_COLOR, color: BRAND_COLOR }}
                      >
                        <i className="fas fa-qrcode"></i>
                        <span>QR scannen</span>
                      </button>

                      <select
                        value=""
                        onChange={e => assignAccountToPlayer(p.id, e.target.value)}
                        className={`flex-1 py-2 px-2 rounded-xl border-2 bg-transparent font-bold text-xs cursor-pointer ${darkMode ? 'text-white border-white/20 bg-slate-900' : 'text-black border-black/20 bg-white'}`}
                      >
                        <option value="">Account wählen...</option>
                        {getAvailableAccountsForDropdown(playerAccountLinks[p.id]?.userId).map(u => {
                          const isFriend = friends.some(f => f.id === u.id);
                          return (
                            <option key={u.id} value={u.id}>
                              {isFriend ? `⭐ ${u.name}` : u.name}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-xs text-emerald-500 font-bold p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <i className="fas fa-check-circle"></i>
                      <span className="truncate">Verknüpft mit: {playerAccountLinks[p.id].userName}</span>
                      <button type="button" onClick={() => unlinkAccount(p.id)} className="text-red-400 ml-auto hover:text-red-500 font-bold cursor-pointer px-1">✕</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button onClick={handlePlayerNamesConfirm} className="w-full text-white font-bold py-4 rounded-2xl active:scale-95 shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>Startgewichte</button>
          </div>
        )}

        {/* START_WEIGHTS SCREEN */}
        {gameState === GameState.START_WEIGHTS && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-xl">
            <h2 className="text-2xl font-black mb-6 text-center">Startgewichte (g)</h2>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {players.map((p, i) => (
                <div key={p.id} className="relative">
                  <label className="text-[10px] font-bold opacity-50 uppercase mb-1 block">{p.name}</label>
                  <input type="number" min="0" max="999" value={tempWeights[i]} onChange={e => { const nw = [...tempWeights]; nw[i] = e.target.value.slice(0, 3); setTempWeights(nw); }} className={`w-full p-2 rounded-lg border-2 bg-transparent font-bold ${darkMode ? 'text-white border-white/20' : 'text-black border-black/20'}`} style={{ borderColor: tempWeights[i] ? BRAND_COLOR : '' }} />
                </div>
              ))}
            </div>
            <button onClick={onWeightsSubmit} className="w-full text-white font-bold py-4 rounded-2xl active:scale-95 shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>Zielgewicht festlegen</button>
          </div>
        )}

        {/* ROUND_TARGET SCREEN */}
        {gameState === GameState.ROUND_TARGET && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-md text-center">
            <h2 className="text-3xl font-black mb-4">Zielgewicht</h2>

            {(() => {
              const activePlayers = players.filter(p => !p.isDisqualified);
              const currentAnnouncer = activePlayers.length > 0 ? activePlayers[announcingPlayerIndex % activePlayers.length] : null;
              return currentAnnouncer ? (
                <div className="mb-6 p-3 rounded-2xl border-2 font-black text-sm flex items-center justify-center space-x-2 shadow-sm" style={{ borderColor: BRAND_COLOR, color: BRAND_COLOR, backgroundColor: `${BRAND_COLOR}15` }}>
                  <span>🎙️ {currentAnnouncer.name} sagt das Zielgewicht an</span>
                </div>
              ) : null;
            })()}

            <p className="text-xs font-bold opacity-40 uppercase tracking-widest mb-4">Aktuelle Füllstände</p>
            <div className="mb-6 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {players.map(p => (
                <div key={p.id} className={`flex justify-between p-2 rounded-xl ${darkMode ? 'bg-white/10' : 'bg-black/10'} text-[10px] md:text-xs`}>
                  <span>{p.name}</span>
                  <span className="font-black">{p.isDisqualified ? '❌' : (rounds.length === 0 ? p.startWeight : rounds[rounds.length-1].results[p.id]) + 'g'}</span>
                </div>
              ))}
            </div>
            {(() => {
              const act = players.filter(p => !p.isDisqualified).map(p => rounds.length === 0 ? p.startWeight : rounds[rounds.length-1].results[p.id]);
              const range = getTargetRange(act);
              return (
                <div className="mb-6">
                  <p className="text-xs opacity-50 mb-2">Gültiger Bereich: {Math.round(range.min)}g - {Math.round(range.max)}g</p>
                  <input type="number" min="0" max="999" value={nextTargetInput} onChange={e => setNextTargetInput(e.target.value.slice(0, 3))} className={`w-full p-4 rounded-xl border-4 text-center font-black text-4xl bg-transparent ${darkMode ? 'text-white border-white/20' : 'text-black border-black/20'}`} style={{ borderColor: BRAND_COLOR }} placeholder="?" />
                </div>
              );
            })()}
            <button onClick={() => handleTargetWeightConfirm()} className="w-full text-white font-bold py-5 rounded-2xl active:scale-95 shadow-xl" style={{ backgroundColor: BRAND_COLOR }}>Bestätigen</button>
          </div>
        )}

        {/* GAMEPLAY SCREEN */}
        {gameState === GameState.GAMEPLAY && (
          <div className="w-full space-y-4 animate-in fade-in max-h-[90vh] overflow-y-auto pb-10 flex flex-col items-center">
             <h2 className="text-2xl font-black uppercase text-center" style={{ color: BRAND_COLOR }}>Runde {rounds.length}</h2>
             <GameTable 
               showInputs={true} 
               players={players} 
               rounds={rounds} 
               darkMode={darkMode} 
               currentRoundResults={currentRoundResults} 
               setCurrentRoundResults={setCurrentRoundResults} 
             />
             <button onClick={handleNextRound} className="w-full max-w-sm text-white font-black py-5 rounded-2xl active:scale-95 shadow-2xl" style={{ backgroundColor: BRAND_COLOR }}>Runde auswerten</button>
          </div>
        )}

        {/* TEAM SETUP SCREENS */}
        {gameState === GameState.TEAM_SETUP && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-md text-center">
            <h2 className="text-2xl font-black mb-8">Teamwiegen Setup</h2>
            <div className="mb-8">
              <label className="block text-sm font-bold opacity-50 uppercase mb-2">Anzahl Teams</label>
              <select value={teamCount} onChange={e => setTeamCount(parseInt(e.target.value))} className="w-full p-3 rounded-xl border-2 bg-transparent font-bold text-center" style={{ borderColor: BRAND_COLOR }}>
                {[2,3,4,5].map(n => <option key={n} value={n}>{n} Teams</option>)}
              </select>
            </div>
            <div className="space-y-4 mb-8">
              {Array.from({ length: teamCount }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="font-bold">Team {i+1} Größe:</span>
                  <select value={teamSizes[i+1] || 2} onChange={e => setTeamSizes({...teamSizes, [i+1]: parseInt(e.target.value)})} className="p-2 rounded-lg border bg-transparent font-bold">
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Pers.</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center space-x-4 mb-8">
              <div className="flex items-center space-x-2">
                <div className="relative inline-block w-10 h-6">
                  <input type="checkbox" id="team-sm-count" checked={isShortMode} onChange={e => setIsShortMode(e.target.checked)} className="opacity-0 w-0 h-0" />
                  <label htmlFor="team-sm-count" className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${isShortMode ? '' : 'bg-gray-400'}`} style={{ backgroundColor: isShortMode ? BRAND_COLOR : undefined }}>
                    <span className={`absolute left-1 bottom-1 bg-white w-4 h-4 rounded-full transition-transform ${isShortMode ? 'translate-x-4' : ''}`}></span>
                  </label>
                </div>
                <label htmlFor="team-sm-count" className="font-bold text-sm">0,33 L Modus</label>
              </div>
              <button onClick={() => setShowModeInfo(true)} className="w-6 h-6 rounded-full border border-gray-500 text-xs flex items-center justify-center text-gray-500"><i className="fas fa-question"></i></button>
            </div>
            <button onClick={handleTeamSetupConfirm} className="w-full text-white font-bold py-4 rounded-2xl shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>Teams benennen</button>
          </div>
        )}

        {gameState === GameState.TEAM_NAMES && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-2xl overflow-y-auto max-h-[80vh]">
            <h2 className="text-2xl font-black mb-8 text-center">Team- & Spielernamen</h2>
            <div className="space-y-8">
              {teams.map((t, tIdx) => (
                <div key={t.id} className="p-4 rounded-2xl bg-black/10 border-l-4" style={{ borderColor: PLAYER_COLORS[tIdx % PLAYER_COLORS.length] }}>
                  <input type="text" value={t.name} onChange={e => setTeams(teams.map(x => x.id === t.id ? {...x, name: e.target.value} : x))} className="w-full text-xl font-black bg-transparent mb-4 border-b border-white/20" placeholder={`Name für ${t.id}`} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {t.playerIds.map(pid => {
                      const p = players.find(px => px.id === pid);
                      return (
                        <div key={pid} className="flex flex-col space-y-2 p-3 rounded-2xl border bg-black/5 dark:bg-white/5 border-gray-500/20">
                          <input
                            type="text"
                            value={p?.name || ''}
                            onChange={e => setPlayers(players.map(x => x.id === pid ? { ...x, name: e.target.value } : x))}
                            className="w-full p-2.5 rounded-xl border-2 bg-transparent font-bold text-sm"
                            placeholder="Spieler Name (Gast)"
                            style={{ borderColor: p?.name ? BRAND_COLOR : '' }}
                          />
                          {!teamMemberAccountLinks[pid] ? (
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={() => startQrScanner(pid)}
                                className="flex-1 py-1.5 rounded-xl border-2 font-bold text-[11px] flex items-center justify-center space-x-1 cursor-pointer hover:opacity-80 transition-all"
                                style={{ borderColor: BRAND_COLOR, color: BRAND_COLOR }}
                              >
                                <i className="fas fa-qrcode"></i>
                                <span>QR</span>
                              </button>
                              <select
                                value=""
                                onChange={e => assignAccountToTeamMember(t.id, pid, e.target.value)}
                                className={`flex-1 py-1.5 px-2 rounded-xl border-2 bg-transparent font-bold text-[11px] cursor-pointer ${darkMode ? 'text-white border-white/20 bg-slate-900' : 'text-black border-black/20 bg-white'}`}
                              >
                                <option value="">Account...</option>
                                {getAvailableAccountsForDropdown(teamMemberAccountLinks[pid]?.userId).map(u => {
                                  const isFriend = friends.some(f => f.id === u.id);
                                  return (
                                    <option key={u.id} value={u.id}>
                                      {isFriend ? `⭐ ${u.name}` : u.name}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1 text-[11px] text-emerald-500 font-bold p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                              <i className="fas fa-check-circle"></i>
                              <span className="truncate">{teamMemberAccountLinks[pid].userName}</span>
                              <button type="button" onClick={() => unlinkTeamMemberAccount(pid)} className="text-red-400 ml-auto hover:text-red-500 font-bold cursor-pointer px-1">✕</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleTeamNamesConfirm} className="w-full mt-8 text-white font-bold py-4 rounded-2xl shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>Startgewichte</button>
          </div>
        )}

        {gameState === GameState.TEAM_START_WEIGHTS && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-2xl overflow-y-auto max-h-[80vh]">
            <h2 className="text-2xl font-black mb-8 text-center">Team-Startgewichte</h2>
            <div className="space-y-6">
              {teams.map((t, tIdx) => (
                <div key={t.id} className="p-4 rounded-2xl bg-black/10">
                  <h3 className="font-black text-sm uppercase opacity-50 mb-3" style={{ color: PLAYER_COLORS[tIdx % PLAYER_COLORS.length] }}>{t.name}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {t.playerIds.map(pid => {
                      const p = players.find(px => px.id === pid)!;
                      const pGlobalIdx = players.indexOf(p);
                      return (
                        <div key={pid}>
                          <label className="text-[10px] font-bold opacity-40">{p.name}</label>
                          <input type="number" min="0" max="999" value={tempWeights[pGlobalIdx]} onChange={e => { const nw = [...tempWeights]; nw[pGlobalIdx] = e.target.value.slice(0, 3); setTempWeights(nw); }} className="w-full p-2 rounded-lg border bg-transparent font-bold" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={onWeightsSubmit} className="w-full mt-8 text-white font-bold py-4 rounded-2xl shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>Zielgewicht</button>
          </div>
        )}

        {gameState === GameState.TEAM_ROUND_TARGET && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-md text-center">
            <h2 className="text-3xl font-black mb-4">Team-Ziel</h2>
            {(() => {
              const activePlayers = players.filter(p => !p.isDisqualified);
              const currentAnnouncer = activePlayers.length > 0 ? activePlayers[announcingPlayerIndex % activePlayers.length] : null;
              return currentAnnouncer ? (
                <div className="mb-6 p-3 rounded-2xl border-2 font-black text-sm flex items-center justify-center space-x-2 shadow-sm" style={{ borderColor: BRAND_COLOR, color: BRAND_COLOR, backgroundColor: `${BRAND_COLOR}15` }}>
                  <span>🎙️ {currentAnnouncer.name} sagt das Zielgewicht an</span>
                </div>
              ) : null;
            })()}
            <p className="text-xs font-bold opacity-40 uppercase tracking-widest mb-4">Aktuelle Füllstände</p>
            <div className="mb-6 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {players.map(p => (
                <div key={p.id} className={`flex justify-between p-2 rounded-xl ${darkMode ? 'bg-white/10' : 'bg-black/10'} text-[10px] md:text-xs`}>
                  <span>{p.name}</span>
                  <span className="font-black">{(rounds.length === 0 ? p.startWeight : rounds[rounds.length-1].results[p.id]) + 'g'}</span>
                </div>
              ))}
            </div>
            {(() => {
              const act = players.map(p => rounds.length === 0 ? p.startWeight : rounds[rounds.length-1].results[p.id]);
              const range = getTargetRange(act);
              return (
                <div className="mb-6">
                  <p className="text-xs opacity-50 mb-2">Bereich: {Math.round(range.min)}g - {Math.round(range.max)}g</p>
                  <input type="number" min="0" max="999" value={nextTargetInput} onChange={e => setNextTargetInput(e.target.value.slice(0, 3))} className="w-full p-4 rounded-xl border-4 text-center font-black text-4xl bg-transparent" style={{ borderColor: BRAND_COLOR }} placeholder="?" />
                </div>
              );
            })()}
            <button onClick={() => handleTargetWeightConfirm()} className="w-full text-white font-bold py-4 rounded-2xl shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>Start</button>
          </div>
        )}

        {gameState === GameState.TEAM_GAMEPLAY && (() => {
          if (!teams || teams.length === 0) return null;
          const maxTeamSize = Math.max(...teams.map(t => t.playerIds.length));
          const safeRowIndex = Math.min(teamStepIndex, maxTeamSize - 1);

          const currentRound = rounds[rounds.length - 1];
          const targetWeight = currentRound ? currentRound.targetWeight : 0;

          return (
            <div className="p-6 md:p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-2xl text-center space-y-6">
              {/* Standings bar (Zwischenstand) */}
              <div className={`w-full p-3 rounded-2xl ${darkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'} border flex items-center justify-around text-xs font-bold flex-wrap gap-2`}>
                {teams.map((t, idx) => (
                  <div key={t.id} className="flex items-center space-x-1.5">
                    <span style={{ color: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}>{t.name}:</span>
                    <span className="font-black text-amber-500">{t.points} Pkt</span>
                  </div>
                ))}
              </div>

              {/* Prominent Target Weight */}
              <div>
                <div className="text-xs font-black uppercase tracking-widest opacity-50 mb-1" style={{ color: BRAND_COLOR }}>
                  Runde {rounds.length} • Mitglied {safeRowIndex + 1} von {maxTeamSize}
                </div>
                <div className="text-3xl font-black flex items-center justify-center space-x-2">
                  <span>🎯 Zielgewicht:</span>
                  <span style={{ color: BRAND_COLOR }}>{targetWeight}g</span>
                </div>
              </div>

              {/* Grid of Teams for Member Row safeRowIndex */}
              <div className={`grid gap-4 ${teams.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                {teams.map((team, teamIdx) => {
                  const teamColor = PLAYER_COLORS[teamIdx % PLAYER_COLORS.length];
                  const hasMember = safeRowIndex < team.playerIds.length;
                  const playerId = hasMember ? team.playerIds[safeRowIndex] : null;
                  const player = playerId ? players.find(p => p.id === playerId) : null;

                  // Calculate current team total distance so far
                  let teamTotalOffset = 0;
                  team.playerIds.forEach(pid => {
                    const rawVal = currentRoundResults[pid];
                    if (rawVal !== undefined && rawVal !== '' && !isNaN(parseInt(rawVal))) {
                      teamTotalOffset += (parseInt(rawVal) - targetWeight);
                    }
                  });

                  if (!hasMember || !playerId || !player) {
                    return (
                      <div
                        key={team.id}
                        className={`p-5 rounded-2xl border-2 text-left space-y-3 opacity-40 border-gray-500/30 ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-gray-500 text-white">
                            {team.name}
                          </span>
                          <span className="text-xs opacity-50 font-bold">Mitglied {safeRowIndex + 1}</span>
                        </div>

                        <div className="py-4 text-center">
                          <p className="text-sm font-bold opacity-70">Kein Mitglied auf dieser Position</p>
                        </div>

                        {/* Current Team Total Distance */}
                        <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-black/20' : 'bg-white/50'} text-center border text-xs`}>
                          <span className="opacity-60 font-bold">Team-Gesamtabstand: </span>
                          <span className={`font-black ${teamTotalOffset > 0 ? 'text-emerald-500' : teamTotalOffset < 0 ? 'text-red-500' : 'text-amber-500'}`}>
                            {teamTotalOffset > 0 ? `+${teamTotalOffset}g` : `${teamTotalOffset}g`}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  // Member exists
                  const currentWeight = rounds.length > 1
                    ? rounds[rounds.length - 2].results[player.id]
                    : player.startWeight;

                  // Calculate compensation weight
                  let prevMembersOffset = 0;
                  team.playerIds.slice(0, safeRowIndex).forEach(pid => {
                    const rawVal = currentRoundResults[pid];
                    if (rawVal !== undefined && rawVal !== '' && !isNaN(parseInt(rawVal))) {
                      prevMembersOffset += (parseInt(rawVal) - targetWeight);
                    }
                  });
                  const compensationWeight = targetWeight - prevMembersOffset;

                  return (
                    <div
                      key={team.id}
                      className={`p-5 rounded-2xl border-2 text-left space-y-3 ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}
                      style={{ borderColor: teamColor }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-full text-xs font-black text-white" style={{ backgroundColor: teamColor }}>
                          {team.name}
                        </span>
                        <span className="text-xs opacity-50 font-bold">Mitglied {safeRowIndex + 1}</span>
                      </div>

                      <div>
                        <h3 className="text-xl font-black">{player.name}</h3>
                        <p className="text-xs opacity-50 font-bold">Aktueller Füllstand: {currentWeight}g</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold opacity-50 uppercase mb-1">Gewicht eingeben (g)</label>
                        <input
                          type="number"
                          min="0"
                          max="999"
                          value={currentRoundResults[player.id] || ''}
                          onChange={e => setCurrentRoundResults({ ...currentRoundResults, [player.id]: e.target.value.slice(0, 3) })}
                          className="w-full p-3 rounded-xl border-2 bg-transparent text-center font-black text-2xl"
                          style={{ borderColor: BRAND_COLOR }}
                          placeholder="g"
                        />
                      </div>

                      {/* Current Team Total Distance */}
                      <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-black/20' : 'bg-white/50'} text-center border text-xs`}>
                        <span className="opacity-60 font-bold">Team-Gesamtabstand: </span>
                        <span className={`font-black ${teamTotalOffset > 0 ? 'text-emerald-500' : teamTotalOffset < 0 ? 'text-red-500' : 'text-amber-500'}`}>
                          {teamTotalOffset > 0 ? `+${teamTotalOffset}g` : `${teamTotalOffset}g`}
                        </span>
                      </div>

                      {/* Compensation Hint */}
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 font-bold text-xs flex items-center justify-center space-x-2">
                        <span>💡 Um auszugleichen:</span>
                        <span className="font-black">{compensationWeight}g</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Navigation Buttons */}
              <div className="flex space-x-3 pt-2">
                {safeRowIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setTeamStepIndex(safeRowIndex - 1)}
                    className="w-1/3 py-4 rounded-2xl border-2 font-bold opacity-70 active:scale-95 text-sm"
                  >
                    Zurück
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleTeamNextStep}
                  className="flex-1 text-white font-bold py-4 rounded-2xl shadow-xl active:scale-95 text-lg"
                  style={{ backgroundColor: BRAND_COLOR }}
                >
                  {safeRowIndex < maxTeamSize - 1 ? 'Die nächsten Spieler' : 'Runde auswerten'}
                </button>
              </div>
            </div>
          );
        })()}

        {/* SPEEDWIEGEN SCREENS */}
        {gameState === GameState.SPEED_SETUP && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-md text-center">
            <h2 className="text-2xl font-black mb-6">Speedwiegen Setup</h2>
            
            <input 
              type="text" 
              value={speedPlayerName} 
              onChange={e => setSpeedPlayerName(e.target.value)} 
              className="w-full p-4 rounded-xl border-2 mb-6 bg-transparent font-bold text-center" 
              placeholder="Dein Name" 
            />

            {/* Becher-Format Toggle */}
            <div className="mb-6 text-left">
              <label className="block text-xs font-bold uppercase opacity-50 mb-2">Becher-Format</label>
              <div className={`flex p-1 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-black/5 border-black/10'}`}>
                <button
                  type="button"
                  onClick={() => {
                    setSpeedIsShortMode(false);
                    const lvl = parseInt(speedLevels);
                    if (lvl < 5 || lvl > 15) {
                      setSpeedLevels('5');
                    }
                  }}
                  className={`flex-1 py-2 rounded-lg font-black text-xs transition-all cursor-pointer ${
                    !speedIsShortMode
                      ? 'text-white shadow'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: !speedIsShortMode ? BRAND_COLOR : 'transparent' }}
                >
                  500 ml
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSpeedIsShortMode(true);
                    const lvl = parseInt(speedLevels);
                    if (lvl < 3 || lvl > 10) {
                      setSpeedLevels('3');
                    }
                  }}
                  className={`flex-1 py-2 rounded-lg font-black text-xs transition-all cursor-pointer ${
                    speedIsShortMode
                      ? 'text-white shadow'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: speedIsShortMode ? BRAND_COLOR : 'transparent' }}
                >
                  0,33 L
                </button>
              </div>
            </div>

            {/* Stufen Selector */}
            <div className="mb-8 text-left">
              <label className="block text-xs font-bold uppercase opacity-50 mb-2">Anzahl Stufen</label>
              <select 
                value={speedLevels} 
                onChange={e => setSpeedLevels(e.target.value)} 
                className={`w-full p-4 rounded-xl border-2 bg-transparent font-bold text-center ${darkMode ? 'bg-slate-800' : 'bg-white'}`}
              >
                {(speedIsShortMode 
                  ? [3, 4, 5, 6, 7, 8, 9, 10] 
                  : [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
                ).map(n => (
                  <option key={n} value={n}>{n} Stufen</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleSpeedSetupConfirm} 
                className="w-full text-white font-black py-4 rounded-2xl shadow-lg hover:opacity-90 active:scale-95 transition-all cursor-pointer" 
                style={{ backgroundColor: BRAND_COLOR }}
              >
                Ziele definieren
              </button>

              <button 
                onClick={() => setShowSpeedKlassischModal(true)} 
                className="w-full text-white font-black py-4 rounded-2xl shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                style={{ backgroundColor: '#D4AF37' }}
              >
                <i className="fas fa-crown text-yellow-200"></i>
                <span>Speedwiegen Klassisch</span>
              </button>
            </div>
          </div>
        )}

        {gameState === GameState.SPEED_CONFIG && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-xl overflow-y-auto max-h-[80vh]">
            <h2 className="text-2xl font-black mb-8 text-center">Zielgewichte festlegen</h2>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {Array.from({ length: parseInt(speedLevels) }).map((_, i) => {
                const levelNum = i + 1;
                const isLastLevel = levelNum === parseInt(speedLevels);
                return (
                  <div key={levelNum}>
                    <label className="text-xs font-bold opacity-50 uppercase block mb-1">Stufe {levelNum}</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="999" 
                      disabled={isLastLevel}
                      value={isLastLevel ? '0' : (speedTargets[levelNum] || '')} 
                      onChange={e => {
                        if (isLastLevel) return;
                        setSpeedTargets({
                          ...speedTargets, 
                          [levelNum]: e.target.value.slice(0, 3),
                          [parseInt(speedLevels)]: '0'
                        });
                      }} 
                      className={`w-full p-3 rounded-xl border-2 text-center font-bold transition-all ${
                        isLastLevel 
                          ? (darkMode ? 'bg-slate-800/40 border-slate-700/40 text-gray-400 cursor-not-allowed opacity-60' : 'bg-gray-200/60 border-gray-300 text-gray-500 cursor-not-allowed opacity-60')
                          : 'bg-transparent border-gray-500/30'
                      }`} 
                      placeholder="g" 
                    />
                    {isLastLevel && (
                      <span className="text-[10px] text-emerald-500 font-bold block mt-1">
                        Die letzte Stufe ist immer 0g
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <button onClick={handleSpeedConfigConfirm} className="w-full text-white font-bold py-4 rounded-2xl shadow-lg hover:opacity-90 active:scale-95 transition-all cursor-pointer" style={{ backgroundColor: BRAND_COLOR }}>Countdown starten</button>
          </div>
        )}

        {gameState === GameState.SPEED_COUNTDOWN && (
          <div className="text-center animate-pulse">
            <h2 className="text-2xl font-black mb-12 uppercase opacity-50">Bereitmachen...</h2>
            <div className="text-[120px] font-black" style={{ color: BRAND_COLOR }}>{speedCountdown}</div>
          </div>
        )}

        {gameState === GameState.SPEED_GAMEPLAY && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-2xl text-center">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black uppercase">{speedPlayerName}</h2>
              <div className="text-3xl font-mono font-black text-emerald-500">{(speedCurrentTime / 1000).toFixed(2)}s</div>
            </div>
            
            <div className="overflow-x-auto mb-8 bg-black/10 rounded-2xl p-2">
              <table className={`w-full text-sm text-left border-collapse ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="py-2 px-4">Stufe</th>
                    <th className="py-2 px-4">Ziel (g)</th>
                    <th className="py-2 px-4">Ergebnis (g)</th>
                    <th className="py-2 px-4 text-right">Abstand zum nächsten Ziel</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: parseInt(speedLevels) }).map((_, i) => {
                    const idxLevel = i + 1;
                    const prevInput = idxLevel > 1 ? speedResults[idxLevel - 1] : undefined;
                    const target = parseInt(speedTargets[idxLevel]) || 0;
                    
                    let differenceStr = "-";
                    if (idxLevel > 1) {
                      if (prevInput !== undefined && prevInput !== null && prevInput !== "") {
                        const prevVal = parseInt(prevInput) || 0;
                        const diff = Math.abs(prevVal - target);
                        differenceStr = `${diff}g`;
                      } else {
                        differenceStr = "?";
                      }
                    }
                    
                    return (
                      <tr key={idxLevel} className="border-b border-white/10">
                        <td className="py-3 px-4 font-bold">{idxLevel}</td>
                        <td className="py-3 px-4 font-black">{speedTargets[idxLevel]}g</td>
                        <td className="py-3 px-4">
                          {idxLevel === parseInt(speedLevels) ? (
                            <span className="text-xs font-bold opacity-50 italic">Leertrinken</span>
                          ) : (
                            <input 
                              type="number" 
                              min="0" 
                              max="999" 
                              value={speedResults[idxLevel] || ''} 
                              onChange={e => setSpeedResults({...speedResults, [idxLevel]: e.target.value.slice(0, 3)})} 
                              className={`w-20 p-2 rounded border-2 ${darkMode ? 'border-brand/60 bg-slate-800 text-white' : 'border-brand/40 bg-white text-black'} text-center font-black`}
                              placeholder="?" 
                            />
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-indigo-400">
                          {differenceStr}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <button onClick={handleLeertrinkenClick} className="w-full text-white font-bold py-5 rounded-2xl shadow-xl active:scale-95 cursor-pointer" style={{ backgroundColor: BRAND_COLOR }}>Leertrinken</button>
          </div>
        )}

        {gameState === GameState.SPEED_RESULT && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-2xl text-center">
            <h2 className="text-3xl font-black mb-2 uppercase" style={{ color: BRAND_COLOR }}>Ergebnis</h2>
            
            {showScreenshotNotice && (
              <div className="p-3 mb-4 rounded-xl bg-[#238183]/20 border border-[#238183]/40 text-[#238183] text-xs font-bold text-center animate-in fade-in">
                📸 Screenshots werden automatisch gespeichert...
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className={`p-4 rounded-2xl ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                <p className="text-[10px] font-bold opacity-50 uppercase mb-1">Zeit</p>
                <p className="text-3xl font-mono font-black text-emerald-500">{((speedEndTime! - speedStartTime!) / 1000).toFixed(2)}s</p>
              </div>
              <div className={`p-4 rounded-2xl ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                <p className="text-[10px] font-bold opacity-50 uppercase mb-1">Gesamt-Score</p>
                <p className="text-3xl font-mono font-black" style={{ color: BRAND_COLOR }}>
                  {(() => {
                    const timeSec = (speedEndTime! - speedStartTime!) / 1000;
                    const totalDiff = Object.keys(speedResults).reduce((acc, key) => {
                      const k = parseInt(key);
                      return acc + Math.abs((parseInt(speedResults[k]) || 0) - (parseInt(speedTargets[k]) || 0));
                    }, 0);
                    return (timeSec + totalDiff).toFixed(2);
                  })()}
                </p>
              </div>
            </div>

            <div ref={rankingAreaRef} className="overflow-x-auto mb-8 p-4 rounded-2xl bg-black/10">
              <table className={`w-full text-sm text-left border-collapse ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="py-2 px-4">Stufe</th>
                    <th className="py-2 px-4">Ziel</th>
                    <th className="py-2 px-4">Ergebnis</th>
                    <th className="py-2 px-4">Abstand</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: parseInt(speedLevels) }).map((_, i) => {
                    const target = parseInt(speedTargets[i+1]) || 0;
                    const result = parseInt(speedResults[i+1]) || 0;
                    const diff = Math.abs(result - target);
                    return (
                      <tr key={i+1} className="border-b border-white/10">
                        <td className="py-3 px-4 font-bold">{i+1}</td>
                        <td className="py-3 px-4">{target}g</td>
                        <td className="py-3 px-4 font-black">{result}g</td>
                        <td className="py-3 px-4 text-red-500 font-bold">+{diff}g</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button onClick={() => setShowStats(true)} className="py-4 rounded-2xl bg-brand text-white font-black shadow-lg" style={{ backgroundColor: BRAND_COLOR }}><i className="fas fa-chart-line mr-2"></i>Statistik</button>
              <button onClick={downloadCSV} className="py-4 rounded-2xl bg-emerald-600 text-white font-black shadow-lg"><i className="fas fa-file-csv mr-2"></i>CSV erstellen</button>
              <button onClick={() => setShowAchievements(true)} className="col-span-2 py-4 rounded-2xl bg-amber-500 text-white font-black shadow-lg"><i className="fas fa-trophy mr-2"></i>Achievements ({earnedAchievements.length})</button>
            </div>
            <button onClick={handleExitToMainMenu} className="w-full py-4 rounded-2xl border-2 font-bold uppercase mb-4">Hauptmenü</button>

            <div className="mt-4 p-4 rounded-2xl border border-dashed border-gray-500/30 flex flex-col items-center justify-center space-y-2">
              <button 
                onClick={openSaveModal} 
                className="w-full py-4 rounded-2xl text-white font-black shadow-lg flex items-center justify-center space-x-2 active:scale-95 text-sm"
                style={{ backgroundColor: BRAND_COLOR }}
              >
                <i className="fas fa-save mr-2"></i>
                <span>Ergebnisse speichern</span>
              </button>
              <div className="text-xs font-bold text-center">
                {resultsSaved ? (
                  <span className="text-emerald-500 flex items-center justify-center gap-1">
                    <span>✅</span> Ergebnisse gespeichert
                  </span>
                ) : (
                  <span className="text-amber-500 flex items-center justify-center gap-1">
                    <span>⚠️</span> Ergebnisse noch nicht gespeichert
                  </span>
                )}
              </div>
              {uploadMessage && (
                <p className={`text-xs font-bold text-center ${uploadState === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>
                  {uploadMessage}
                </p>
              )}
            </div>
          </div>
        )}

        {gameState === GameState.FINAL_ROUND_TARGETS && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-xl">
            <h2 className="text-2xl font-black mb-8 text-center uppercase" style={{ color: BRAND_COLOR }}>Leergewicht schätzen</h2>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {players.filter(p => !p.isDisqualified).map(p => (
                <div key={p.id}>
                  <label className="text-[10px] font-bold opacity-50 uppercase mb-1 block">{p.name}</label>
                  <input type="number" min="0" max="999" value={currentRoundTargets[p.id] || ''} onChange={e => setCurrentRoundTargets({...currentRoundTargets, [p.id]: e.target.value.slice(0, 3)})} className="w-full p-2 rounded-lg border-2 bg-transparent font-bold" placeholder="g" />
                </div>
              ))}
            </div>
            <button onClick={handleFinalTargetsConfirm} className="w-full text-white font-bold py-4 rounded-2xl shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>Bestätigen</button>
          </div>
        )}

        {gameState === GameState.FINAL_ROUND_RESULTS && (
          <div className="w-full space-y-4 animate-in fade-in max-h-[90vh] overflow-y-auto pb-10 flex flex-col items-center">
             <h2 className="text-2xl font-black uppercase text-center" style={{ color: BRAND_COLOR }}>Leergewicht messen</h2>
             <GameTable 
               showInputs={true} 
               players={players} 
               rounds={rounds} 
               darkMode={darkMode} 
               currentRoundResults={currentRoundResults} 
               setCurrentRoundResults={setCurrentRoundResults} 
               playerAccountLinks={playerAccountLinks}
             />
             <button onClick={handleFinalResultsConfirm} className="w-full max-w-sm text-white font-black py-5 rounded-2xl active:scale-95 shadow-2xl" style={{ backgroundColor: BRAND_COLOR }}>Finale auswerten</button>
          </div>
        )}

        {/* SHARED RESULTS SCREEN */}
        {gameState === GameState.RESULT_SCREEN && (
          <div className="w-full space-y-8 pb-20 animate-in fade-in duration-500 overflow-y-auto max-h-screen">
             {activeTournamentTable && (
               <div className="w-full space-y-2 mb-4">
                 <div
                   className="w-full p-3.5 rounded-2xl text-white font-black text-center text-sm shadow-xl flex items-center justify-center space-x-2"
                   style={{ backgroundColor: activeTournamentTable.tableColor }}
                 >
                   <span>🏆 Turnier: {activeTournamentTable.tournamentName} • Tisch {activeTournamentTable.tableName || activeTournamentTable.tableId}</span>
                 </div>

                 {tournamentTableSaveState === 'loading' && (
                   <p className="text-xs font-bold text-center opacity-70">
                     <i className="fas fa-spinner animate-spin mr-1"></i>
                     Tischergebnisse werden gespeichert...
                   </p>
                 )}
                 {tournamentTableSaveState === 'success' && (
                   <p className="text-xs font-bold text-center text-emerald-500">
                     ✅ {tournamentTableSaveMessage}
                   </p>
                 )}
                 {tournamentTableSaveState === 'error' && (
                   <div className="flex flex-col items-center space-y-1">
                     <p className="text-xs font-bold text-center text-red-500">
                       ❌ {tournamentTableSaveMessage}
                     </p>
                     <button
                       onClick={saveTournamentTableResults}
                       className="text-xs font-bold px-3 py-1 rounded-lg text-white cursor-pointer"
                       style={{ backgroundColor: BRAND_COLOR }}
                     >
                       Erneut versuchen
                     </button>
                   </div>
                 )}
               </div>
             )}

             <h2 className="text-4xl font-black text-center uppercase" style={{ color: BRAND_COLOR }}>Endergebnis</h2>
             
             {(() => {
               const allDisqualified = players.length > 0 && players.every(p => p.isDisqualified);

               if (allDisqualified) {
                 return (
                   <div ref={rankingAreaRef} className={`p-8 rounded-3xl ${darkMode ? 'bg-slate-900/90 border-red-500/30' : 'bg-red-500/5 border-red-500/20'} border-2 shadow-xl text-center space-y-3`}>
                     <div className="text-5xl animate-bounce">💀</div>
                     <h3 className="text-2xl font-black uppercase text-red-500 tracking-tight">
                       Alle Spieler ausgeschieden!
                     </h3>
                     <p className="text-sm font-bold opacity-80" style={{ color: BRAND_COLOR }}>
                       Niemand hat das Zielgewicht getroffen.
                     </p>
                   </div>
                 );
               }

               if (teams.length > 0) {
                 return (
                   <div ref={rankingAreaRef} className={`p-6 rounded-3xl ${darkMode ? 'bg-white/5' : 'bg-black/5'} border ${darkMode ? 'border-white/10' : 'border-gray-700/20'} shadow-xl`}>
                     <h3 className="text-xl font-black mb-6 uppercase flex items-center"><i className="fas fa-trophy mr-3 text-yellow-500"></i>Team-Ranking</h3>
                     <table className="w-full text-left">
                        <thead><tr className={`opacity-70 text-xs font-bold uppercase border-b ${darkMode ? 'border-white/10' : 'border-gray-700/10'}`}><th className="pb-2">#</th><th className="pb-2">Team</th><th className="text-center pb-2">Strafpunkte</th></tr></thead>
                        <tbody>
                          {teams.slice().sort((a,b) => a.points - b.points).map((t, idx) => (
                            <tr key={t.id} className={`border-t ${darkMode ? 'border-white/5' : 'border-gray-700/10'}`}>
                              <td className="py-4 font-black">{idx === 0 ? '🏆 #1' : `#${idx+1}`}</td>
                              <td className="py-4 font-black" style={{ color: PLAYER_COLORS[teams.indexOf(t) % PLAYER_COLORS.length] }}>{t.name}</td>
                              <td className="text-center font-black text-amber-500 text-lg">{t.points} Pkt</td>
                            </tr>
                          ))}
                        </tbody>
                     </table>
                   </div>
                 );
               }

               return (
                 <div ref={rankingAreaRef} className={`p-6 rounded-3xl ${darkMode ? 'bg-white/5' : 'bg-black/5'} border ${darkMode ? 'border-white/10' : 'border-gray-700/20'} shadow-xl`}>
                   <h3 className="text-xl font-black mb-6 uppercase flex items-center"><i className="fas fa-trophy mr-3 text-yellow-500"></i>Ranking</h3>
                   <table className="w-full text-left">
                      <thead><tr className={`opacity-70 text-xs font-bold uppercase border-b ${darkMode ? 'border-white/10' : 'border-gray-700/10'}`}><th className="pb-2">#</th><th className="pb-2">Spieler</th><th className="text-center pb-2">Ø Abst.</th><th className="text-center pb-2">S.</th><th className="text-center pb-2">Total</th></tr></thead>
                      <tbody>
                        {players.map(p => ({...p, avg: calculateAverageDistance(p.id, rounds), tot: calculateAverageDistance(p.id, rounds) + p.schnaepse}))
                          .sort((a,b)=> (a.isDisqualified ? 1 : b.isDisqualified ? -1 : a.tot - b.tot))
                          .map((p, idx) => (
                            <tr key={p.id} className={`border-t ${darkMode ? 'border-white/5' : 'border-gray-700/10'}`}>
                              <td className="py-4 font-black">{p.isDisqualified ? '💀' : idx+1}</td>
                              <td className={`py-4 font-black ${p.isDisqualified ? 'line-through opacity-40' : ''}`}>{p.name}</td>
                              <td className="text-center">{p.isDisqualified ? '-' : p.avg.toFixed(2)}g</td>
                              <td className="text-center font-bold">{p.schnaepse}</td>
                              <td className="text-center font-black" style={{ color: BRAND_COLOR }}>{p.isDisqualified ? '-' : p.tot.toFixed(2)}</td>
                            </tr>
                          ))}
                      </tbody>
                   </table>
                 </div>
               );
             })()}

             {teams.length > 0 ? (
               <div ref={roundsAreaRef} className={`p-6 rounded-3xl ${darkMode ? 'bg-white/5' : 'bg-black/5'} border ${darkMode ? 'border-white/10' : 'border-gray-700/20'} shadow-xl w-full`}>
                 <h3 className="text-xl font-black mb-6 uppercase flex items-center"><i className="fas fa-table mr-3 opacity-40"></i>Rundenübersicht pro Team</h3>
                 <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                     <thead>
                       <tr className={`opacity-70 text-xs font-bold uppercase border-b ${darkMode ? 'border-white/10' : 'border-gray-700/10'}`}>
                         <th className="pb-3 px-2">Runde</th>
                         {teams.map((t, idx) => (
                           <th key={t.id} className="pb-3 px-2 text-center" style={{ color: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}>
                             {t.name}
                           </th>
                         ))}
                       </tr>
                     </thead>
                     <tbody>
                       {rounds.map((r, rIdx) => {
                         const teamOffsets = teams.map(t => {
                           let sum = 0;
                           t.playerIds.forEach(pid => {
                             const val = r.results[pid] || 0;
                             const target = r.isFinal ? (r.individualTargets?.[pid] || 0) : r.targetWeight;
                             sum += (val - target);
                           });
                           return { teamId: t.id, sum, absDist: Math.abs(sum) };
                         });

                         const absDists = teamOffsets.map(o => o.absDist);
                         const isTieRound = teams.length > 1 && absDists.every(d => d === absDists[0]);

                         return (
                           <tr key={rIdx} className={`border-t ${darkMode ? 'border-white/5' : 'border-gray-700/10'}`}>
                             <td className="py-3 px-2 font-black text-sm opacity-70">
                               {r.isFinal ? 'Finale' : `#${rIdx + 1}`}
                             </td>
                             {teamOffsets.map((o) => {
                               const offsetStr = o.sum > 0 ? `+${o.sum}g` : `${o.sum}g`;
                               const isBullseye = o.absDist === 0;
                               const isSchnapps = SPECIAL_NUMBERS.includes(o.absDist);

                               return (
                                 <td key={o.teamId} className="py-3 px-2 text-center font-black text-sm whitespace-nowrap">
                                   <span>{offsetStr}</span>
                                   {isBullseye && <span className="ml-1" title="Volltreffer">🎯</span>}
                                   {isSchnapps && <span className="ml-1" title="Schnappszahl">🥂</span>}
                                   {isTieRound && <span className="ml-1" title="Gleichstand">🤝</span>}
                                 </td>
                               );
                             })}
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                 </div>
               </div>
             ) : (
               rounds.length > 0 && (
                 <div ref={roundsAreaRef} className="w-full">
                   <h3 className="text-xl font-black mb-4 uppercase ml-2 flex items-center"><i className="fas fa-table mr-3 opacity-40"></i>Spieltabelle</h3>
                   <GameTable 
                     players={players} 
                     rounds={rounds} 
                     darkMode={darkMode} 
                     currentRoundResults={currentRoundResults} 
                     setCurrentRoundResults={setCurrentRoundResults} 
                   />
                 </div>
               )
             )}

              <div className="grid grid-cols-2 gap-3 px-2">
                <button onClick={() => setShowStats(true)} className="py-4 rounded-2xl bg-brand text-white font-black shadow-lg" style={{ backgroundColor: BRAND_COLOR }}><i className="fas fa-chart-line mr-2"></i>Statistik</button>
                <button onClick={downloadCSV} className="py-4 rounded-2xl bg-emerald-600 text-white font-black shadow-lg"><i className="fas fa-file-csv mr-2"></i>CSV erstellen</button>
              </div>
              <button onClick={() => setShowAchievements(true)} className="w-full py-4 rounded-2xl bg-amber-500 text-white font-black shadow-lg flex items-center justify-center space-x-2"><i className="fas fa-trophy mr-2"></i><span>Achievements anzeigen ({earnedAchievements.length})</span></button>
              <div className="mt-4 p-4 rounded-2xl border border-dashed border-gray-500/30 flex flex-col items-center justify-center space-y-2">
                {accountResultsSaved.length > 0 && (
                  <div className="w-full p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-bold text-center flex items-center justify-center space-x-1.5">
                    <span>✅</span>
                    <span>Ergebnisse automatisch in {accountResultsSaved.length} Account(s) gespeichert</span>
                  </div>
                )}
                <button 
                  onClick={openSaveModal} 
                  className="w-full py-4 rounded-2xl text-white font-black shadow-lg flex items-center justify-center space-x-2 active:scale-95 text-sm"
                  style={{ backgroundColor: BRAND_COLOR }}
                >
                  <i className="fas fa-save mr-2"></i>
                  <span>
                    {Object.keys(playerAccountLinks).length > 0
                      ? 'Gäste-Ergebnisse speichern'
                      : 'Ergebnisse speichern'}
                  </span>
                </button>
                <div className="text-xs font-bold text-center">
                  {resultsSaved ? (
                    <span className="text-emerald-500 flex items-center justify-center gap-1">
                      <span>✅</span> Ergebnisse gespeichert
                    </span>
                  ) : (
                    <span className="text-amber-500 flex items-center justify-center gap-1">
                      <span>⚠️</span> Ergebnisse noch nicht gespeichert
                    </span>
                  )}
                </div>
                {uploadMessage && (
                  <p className={`text-xs font-bold text-center ${uploadState === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {uploadMessage}
                  </p>
                )}
              </div>

              <button onClick={handleExitToMainMenu} className={`w-full py-5 rounded-2xl border-2 font-black opacity-60 uppercase tracking-widest mt-4 ${darkMode ? 'border-white/20' : 'border-black/20'}`}>zurück zum Hauptmenü</button>
          </div>
        )}
      </main>

      <footer className="mt-auto pt-16 pb-8 relative flex flex-col md:block items-center justify-center">
        <div className={`text-center text-[10px] font-black uppercase tracking-widest transition-opacity duration-500 ${showModeFooter ? 'opacity-40' : 'opacity-0'} mb-4 md:mb-0`}>
          {isShortMode ? '0,33 L Modus' : '500 ml Modus'}
        </div>
        {gameState === GameState.START && (
          <a
            id="become-member-btn"
            href="mailto:bundeswiega@gmail.com?subject=Kostenlos%20Mitglied%20werden"
            className="md:absolute md:bottom-4 md:left-4 py-3 px-5 rounded-full font-bold text-xs md:text-sm text-white shadow-lg transition-transform hover:scale-105 active:scale-95 z-50 flex items-center justify-center space-x-2 border border-white/10 my-2 md:my-0 w-fit h-fit"
            style={{ backgroundColor: BRAND_COLOR }}
          >
            <i className="fas fa-user-plus text-sm"></i>
            <span>kostenlos Mitglied werden</span>
          </a>
        )}
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="md:absolute md:bottom-4 md:right-4 p-3 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white shadow-lg transition-transform hover:scale-110 active:scale-90 z-50 my-2 md:my-0 flex items-center justify-center w-fit h-fit">
          <i className="fab fa-instagram text-xl"></i>
        </a>
      </footer>

      {/* --- MODALS --- */}
      {showExitWithoutSaveConfirm && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className={`rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border-2 space-y-6 ${
            darkMode ? 'bg-slate-900 border-amber-500/40 text-white' : 'bg-white border-amber-500/40 text-gray-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-4 border-amber-500/20">
              <h3 className="text-xl font-black uppercase flex items-center tracking-tight text-amber-500">
                <span className="mr-2.5 text-2xl">⚠️</span>
                <span>Ergebnisse nicht gespeichert</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowExitWithoutSaveConfirm(false)}
                className="text-lg opacity-50 hover:opacity-100 p-2 rounded-full focus:outline-none"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="space-y-3 text-center">
              <p className="text-sm font-bold opacity-90 leading-relaxed">
                Möchtest du wirklich zum Hauptmenü zurückkehren,<br className="hidden sm:inline" /> ohne die Ergebnisse zu speichern?
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowExitWithoutSaveConfirm(false);
                  openSaveModal();
                }}
                className="w-full py-3.5 rounded-2xl text-white font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center space-x-2"
                style={{ backgroundColor: BRAND_COLOR }}
              >
                <i className="fas fa-save"></i>
                <span>Ergebnisse speichern</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowExitWithoutSaveConfirm(false);
                  window.location.reload();
                }}
                className="w-full py-3.5 rounded-2xl text-red-500 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <i className="fas fa-sign-out-alt"></i>
                <span>Trotzdem verlassen</span>
              </button>

              <button
                type="button"
                onClick={() => setShowExitWithoutSaveConfirm(false)}
                className={`w-full py-3 rounded-2xl border text-xs font-bold uppercase tracking-wider transition-colors ${
                  darkMode ? 'border-gray-700 text-gray-300 hover:bg-white/5' : 'border-gray-300 text-gray-600 hover:bg-black/5'
                }`}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaveModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className={`rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border-2 space-y-6 max-h-[90vh] overflow-y-auto ${
            darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-4 border-gray-500/20">
              <div>
                <h3 className="text-2xl font-black uppercase flex items-center tracking-tight" style={{ color: BRAND_COLOR }}>
                  <i className="fas fa-save mr-3 text-2xl"></i>
                  <span>
                    {Object.keys(playerAccountLinks).length > 0
                      ? 'Gäste-Ergebnisse speichern'
                      : 'Ergebnisse speichern'}
                  </span>
                </h3>
                {Object.keys(playerAccountLinks).length > 0 && (
                  <p className="text-xs opacity-60 font-semibold mt-1">
                    Account-Spieler wurden bereits automatisch gespeichert.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="text-lg opacity-50 hover:opacity-100 p-2 rounded-full focus:outline-none"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {saveModalLoadingCsv ? (
              <div className="py-8 text-center space-y-3">
                <i className="fas fa-spinner animate-spin text-3xl" style={{ color: BRAND_COLOR }}></i>
                <p className="text-sm font-bold opacity-70">Lade Spielernamen aus CSV...</p>
              </div>
            ) : (
              <>
                {saveModalCsvError && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold flex items-center">
                    <i className="fas fa-exclamation-triangle mr-2 text-sm"></i>
                    <span>{saveModalCsvError} Es wird "➕ Neuer Name" verwendet.</span>
                  </div>
                )}

                {/* Table of participating players / items */}
                <div className="overflow-x-auto rounded-2xl border border-gray-500/20">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className={`border-b opacity-60 text-xs font-black uppercase ${
                        darkMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/5'
                      }`}>
                        <th className="py-3 px-3 text-center w-12">
                          <i className="fas fa-check-double text-xs opacity-60"></i>
                        </th>
                        <th className="py-3 px-3">{(gameState === GameState.RESULT_SCREEN && teams.length > 0) ? 'Team' : 'Spieler'}</th>
                        <th className="py-3 px-3">Zuordnung</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getParticipatingItems().filter(item => !isLinkedToAccount(item)).map(item => {
                        const isChecked = saveModalChecked[item.id] !== false;
                        return (
                          <tr key={item.id} className={`border-t ${darkMode ? 'border-white/5' : 'border-gray-200/50'}`}>
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => setSaveModalChecked(prev => ({ ...prev, [item.id]: !isChecked }))}
                                className="inline-flex items-center justify-center focus:outline-none"
                              >
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                  isChecked
                                    ? 'bg-[#238183] border-[#238183] text-white shadow-sm'
                                    : darkMode ? 'border-white/30 bg-slate-800' : 'border-gray-300 bg-gray-100'
                                }`}>
                                  {isChecked && <i className="fas fa-check text-xs"></i>}
                                </div>
                              </button>
                            </td>
                            <td className="py-3 px-3 font-bold text-xs md:text-sm">
                              {item.name}
                            </td>
                            <td className="py-3 px-3">
                              <select
                                value={saveModalMappings[item.id] || '__NEW__'}
                                onChange={e => setSaveModalMappings(prev => ({ ...prev, [item.id]: e.target.value }))}
                                disabled={!isChecked}
                                className={`w-full p-2.5 rounded-xl border-2 font-bold text-xs transition-all focus:outline-none ${
                                  !isChecked
                                    ? 'opacity-30 cursor-not-allowed bg-gray-500/10 border-transparent'
                                    : darkMode
                                      ? 'bg-slate-800 border-slate-600 text-white focus:border-[#238183]'
                                      : 'bg-white border-gray-300 text-gray-900 focus:border-[#238183]'
                                }`}
                              >
                                <option value="__NEW__">➕ {(gameState === GameState.RESULT_SCREEN && teams.length > 0) ? 'Neues Team' : 'Neuer Name'} ({item.name})</option>
                                {csvNames.map(cName => (
                                  <option key={cName} value={cName}>
                                    {cName}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}

                    </tbody>
                  </table>
                </div>

                {saveModalError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold text-center">
                    {saveModalError}
                  </div>
                )}

                {saveModalSuccess ? (
                  <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-black text-center space-y-2 animate-in zoom-in-95">
                    <i className="fas fa-check-circle text-3xl block"></i>
                    <p className="text-base">Ergebnisse erfolgreich gespeichert!</p>
                  </div>
                ) : (
                  <div className="flex space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowSaveModal(false)}
                      disabled={saveModalSubmitting}
                      className={`w-1/2 py-3.5 rounded-2xl font-bold border-2 transition-all active:scale-95 text-sm ${
                        darkMode ? 'border-white/20 text-white hover:bg-white/10' : 'border-black/20 text-gray-800 hover:bg-black/5'
                      }`}
                    >
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveResultsModalSubmit}
                      disabled={saveModalSubmitting}
                      className="w-1/2 py-3.5 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
                      style={{ backgroundColor: BRAND_COLOR }}
                    >
                      {saveModalSubmitting ? (
                        <>
                          <i className="fas fa-spinner animate-spin"></i>
                          <span>Speichern...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save"></i>
                          <span>Speichern</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {showStartPlayerModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 text-center ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white text-gray-900 border-gray-200'}`}>
            <div className="text-5xl mb-4 animate-bounce">🎲</div>
            {(() => {
              const active = players.filter(p => !p.isDisqualified);
              const announcer = active.length > 0 ? active[announcingPlayerIndex % active.length] : null;
              const announcerName = announcer ? announcer.name : 'Spieler';
              return (
                <>
                  <h3 className="text-2xl font-black mb-2" style={{ color: BRAND_COLOR }}>
                    {announcerName} fängt an!
                  </h3>
                  <p className="text-sm font-bold opacity-70 mb-8">
                    {announcerName} bestimmt das erste Zielgewicht.
                  </p>
                </>
              );
            })()}
            <button
              onClick={() => {
                setShowStartPlayerModal(false);
                setGameState(teams.length > 0 ? GameState.TEAM_ROUND_TARGET : GameState.ROUND_TARGET);
              }}
              className="w-full text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 text-lg uppercase"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {showSummary && summaryData && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`rounded-3xl p-8 max-w-lg w-full shadow-2xl border-2 overflow-y-auto max-h-[90vh] ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white text-gray-900 border-gray-200'}`}>
            <h3 className="text-3xl font-black mb-6 text-center uppercase tracking-tighter" style={{ color: BRAND_COLOR }}>Rundenergebnis</h3>

            {summaryData.isTeamSummary ? (
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-xs font-bold opacity-50 uppercase tracking-widest">Team-Ergebnisse dieser Runde</p>
                  {summaryData.teamEval?.map((e: any, idx: number) => (
                    <div key={e.team.id} className={`p-4 rounded-2xl border flex items-center justify-between ${darkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                      <div>
                        <span className="font-black text-sm" style={{ color: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}>{e.team.name}</span>
                        <p className="text-xs opacity-60">Abstand: {e.rawOffsetSum > 0 ? `+${e.rawOffsetSum}` : e.rawOffsetSum}g</p>
                      </div>
                      <div className="text-right font-black text-lg">
                        {e.absDist}g
                      </div>
                    </div>
                  ))}
                </div>

                {summaryData.eventMessages && summaryData.eventMessages.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold opacity-50 uppercase tracking-widest">Ereignisse</p>
                    {summaryData.eventMessages.map((msg: string, idx: number) => (
                      <div key={idx} className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 font-bold text-sm flex items-center space-x-3">
                        <span>{msg}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4 rounded-2xl border bg-brand/10 border-brand/30">
                  <p className="text-xs font-bold opacity-50 uppercase tracking-widest mb-2">Aktueller Punktestand (Strafpunkte)</p>
                  <div className="grid grid-cols-2 gap-2 text-sm font-black">
                    {teams.map((t, idx) => (
                      <div key={t.id} className="flex justify-between items-center p-2 rounded-xl bg-black/10">
                        <span style={{ color: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}>{t.name}</span>
                        <span className="text-amber-500">{t.points} Pkt</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border bg-red-500/10 flex items-center">
                  <i className="fas fa-skull text-red-500 mr-4 text-xl"></i>
                  <div><p className="text-[10px] font-bold opacity-50 uppercase">{teams.length ? 'Verlierer Team' : 'Größter Abstand'}</p><p className="text-lg font-black">{summaryData.furthestPlayers?.join(' & ')}</p></div>
                </div>
                {!teams.length && summaryData.exactHits?.length > 0 && (
                  <div className="p-4 rounded-2xl border bg-emerald-500/10 flex items-center">
                    <i className="fas fa-bullseye text-emerald-500 mr-4 text-xl"></i>
                    <div><p className="text-[10px] font-bold opacity-50 uppercase">Volltreffer!</p><p className="text-lg font-black">{summaryData.exactHits.join(', ')}</p></div>
                  </div>
                )}
                {!teams.length && summaryData.specialHits?.length > 0 && (
                  <div className="p-4 rounded-2xl border bg-amber-500/10 flex items-center">
                    <span className="text-2xl mr-4">🥂</span>
                    <div><p className="text-[10px] font-bold opacity-50 uppercase">Schnappszahl!</p><p className="text-sm font-black">{summaryData.specialHits.map((s:any)=>`${s.playerName} (${s.value}g)`).join(', ')}</p></div>
                  </div>
                )}
                {!teams.length && summaryData.duplicates?.length > 0 && (
                  <div className="p-4 rounded-2xl border bg-indigo-500/10 flex items-center">
                    <i className="fas fa-clone text-indigo-500 mr-4 text-xl"></i>
                    <div><p className="text-[10px] font-bold opacity-50 uppercase">Wiegezwillinge!</p><p className="text-sm font-black">{summaryData.duplicates.map((d:any)=>`${d.playerNames.join(' & ')} (${d.weight}g)`).join(', ')}</p></div>
                  </div>
                )}
              </div>
            )}
            <button onClick={handleModalSequence} className="w-full mt-10 text-white font-black py-5 rounded-2xl shadow-xl uppercase active:scale-95" style={{ backgroundColor: BRAND_COLOR }}>Weiter</button>
          </div>
        </div>
      )}

      {showAchievements && (
        <div className="fixed inset-0 z-[450] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`rounded-3xl p-8 max-w-lg w-full shadow-2xl border-2 overflow-y-auto max-h-[90vh] ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white text-gray-900'}`}>
            <div className="flex items-center justify-center space-x-3 mb-6">
              <i className="fas fa-trophy text-3xl text-amber-500 animate-bounce"></i>
              <h3 className="text-3xl font-black uppercase tracking-tighter" style={{ color: BRAND_COLOR }}>
                {newlyEarnedAchievements.length > 0 ? "Achievement Freigeschaltet!" : "Achievements"}
              </h3>
            </div>

            {(newlyEarnedAchievements.length > 0 ? newlyEarnedAchievements : earnedAchievements).length === 0 ? (
              <div className="p-8 text-center opacity-60">
                <i className="fas fa-lock text-4xl mb-4 block"></i>
                <p className="font-bold">Noch keine Achievements freigeschaltet.</p>
                <p className="text-xs mt-2">Spiele weiter und meistere die Herausforderungen!</p>
              </div>
            ) : (
              <div className="space-y-4 my-6">
                {(newlyEarnedAchievements.length > 0 ? newlyEarnedAchievements : earnedAchievements).map((ach) => {
                  const rarityBadge = {
                    common: "bg-gray-500/20 text-gray-400 border-gray-500/30",
                    rare: "bg-blue-500/20 text-blue-400 border-blue-500/30",
                    epic: "bg-purple-500/20 text-purple-400 border-purple-500/30",
                    legendary: "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  }[ach.rarity] || "bg-gray-500/20 text-gray-400";

                  return (
                    <div key={ach.id} className={`p-4 rounded-2xl border flex items-start space-x-4 ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="text-4xl p-2 rounded-xl bg-black/10 flex items-center justify-center min-w-[56px]">
                        {ach.icon.startsWith('fa-') || ach.icon.startsWith('fas ') ? <i className={ach.icon}></i> : ach.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-black text-lg">{ach.title}</h4>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${rarityBadge}`}>
                            {ach.rarity}
                          </span>
                        </div>
                        <p className="text-xs opacity-70 mt-1">{ach.description}</p>
                        <PlayerBadges earnedBy={ach.earnedBy} playersList={players} darkMode={darkMode} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={handleModalSequence}
              className="w-full mt-6 text-white font-black py-5 rounded-2xl shadow-xl uppercase active:scale-95"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              Weiter
            </button>
          </div>
        </div>
      )}

      {showFinalIntro && (
        <div className="fixed inset-0 z-[420] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl text-center">
          <div className="max-w-lg w-full">
            <h2 className="text-5xl font-black mb-6 uppercase text-yellow-500 italic animate-pulse">Das Finale</h2>
            <div className={`bg-white/5 border ${darkMode ? 'border-white/10' : 'border-black/10'} p-8 rounded-3xl mb-12 text-white text-left`}>
              <p className="text-xs font-bold opacity-50 uppercase mb-4 tracking-widest">Die letzte Runde wurde ausgelöst:</p>
              <ul className="space-y-4 mb-8">
                {triggeringPlayers.map((p, i) => (
                  <li key={i} className="flex flex-col border-l-4 border-yellow-500 pl-4">
                    <span className="font-black text-xl uppercase">{p.name}</span>
                    <span className="text-xs opacity-60">Füllstand: {p.weight}g <span className="mx-2">|</span> Grenzwert: {p.limit}g</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm font-bold leading-relaxed border-t border-white/10 pt-4">Trinkt eure Gläser leer und schätzt anschließend euer individuelles <span className="text-yellow-400 uppercase">Leergewicht!</span></p>
            </div>
            <button onClick={startFinalSequence} className="w-full text-white font-black py-6 rounded-3xl text-2xl uppercase shadow-2xl active:scale-95 transition-all" style={{ backgroundColor: GOLD_COLOR }}>OK</button>
          </div>
        </div>
      )}

      {disqualifiedNotice && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg">
          <div className={`rounded-3xl p-8 max-sm w-full ${darkMode ? 'bg-slate-900' : 'bg-white'} border-4 border-red-500 shadow-2xl text-center`}>
            <i className="fas fa-skull-crossbones text-5xl text-red-500 mb-6"></i>
            <h3 className="text-2xl font-black mb-4 uppercase text-red-500">Ausgeschieden!</h3>
            <div className="space-y-2 mb-8">
              {disqualifiedNotice.map((n, i) => (
                <div key={i} className="font-black text-lg">{n.name} <span className="opacity-50 text-xs">({n.diff}g Abstand)</span></div>
              ))}
            </div>
            <p className="opacity-70 text-sm mb-10">Ein Abstand von mehr als 50 Gramm zum Zielgewicht bedeutet das sofortige Aus.</p>
            <button onClick={() => { setDisqualifiedNotice(null); triggerNextStep(); }} className="w-full py-4 rounded-xl bg-red-500 text-white font-bold uppercase active:scale-95 shadow-lg">OK</button>
          </div>
        </div>
      )}

      {showAutoTargetModal && (
        <div className="fixed inset-0 z-[430] flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg">
          <div className={`rounded-3xl p-8 max-md w-full shadow-2xl border-2 border-emerald-500 ${darkMode ? 'bg-gray-800' : 'bg-white'} text-center`}>
            <h3 className="text-2xl font-black mb-4 uppercase text-emerald-500">Auto-Zielgewicht</h3>
            <p className="opacity-80 mb-6 text-sm leading-relaxed">{showAutoTargetModal.reason}</p>
            <div className={`p-6 rounded-2xl mb-8 ${darkMode ? 'bg-gray-700' : 'bg-black/5'}`}>
              <p className="text-[10px] font-bold opacity-50 mb-1 uppercase tracking-widest">Neues Ziel</p>
              <p className="text-5xl font-black" style={{ color: BRAND_COLOR }}>{showAutoTargetModal.target}g</p>
            </div>
            <button onClick={() => { handleTargetWeightConfirm(showAutoTargetModal.target); setShowAutoTargetModal(null); }} className="w-full text-white font-bold py-4 rounded-xl shadow-lg active:scale-95" style={{ backgroundColor: GOLD_COLOR }}>OK</button>
          </div>
        </div>
      )}

      {targetWeightError && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`rounded-3xl p-8 max-sm w-full ${darkMode ? 'bg-slate-900' : 'bg-white'} border-4 border-red-500 text-center shadow-2xl`}>
            <h3 className="text-2xl font-black mb-4 uppercase text-red-500">Ungültig</h3>
            <p className="opacity-80 mb-8 text-sm leading-relaxed">{targetWeightError.message}</p>
            <button onClick={() => { setNextTargetInput(targetWeightError.correction.toString()); setTargetWeightError(null); }} className="w-full text-white font-bold py-4 rounded-xl shadow-lg" style={{ backgroundColor: '#ef4444' }}>Korrigieren</button>
          </div>
        </div>
      )}

      {startWeightError && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`rounded-3xl p-8 max-sm w-full ${darkMode ? 'bg-slate-900' : 'bg-white'} border-4 border-red-500 text-center shadow-2xl`}>
            <h3 className="text-2xl font-black mb-4 uppercase text-red-500">Eingabefehler</h3>
            <p className="opacity-80 mb-8 text-sm leading-relaxed">{startWeightError}</p>
            <button onClick={() => setStartWeightError(null)} className="w-full text-white font-bold py-4 rounded-xl shadow-lg" style={{ backgroundColor: '#ef4444' }}>OK</button>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`rounded-3xl p-8 max-sm w-full shadow-2xl text-center border-2 border-red-500 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
            <h3 className="text-2xl font-black mb-4 uppercase text-red-500">Abbrechen?</h3>
            <p className="opacity-70 mb-8 text-sm">Der aktuelle Spielstand geht verloren.</p>
            <div className="flex flex-col space-y-3">
              <button onClick={resetToStart} className="py-4 rounded-xl bg-red-600 text-white font-bold uppercase active:scale-95">Bestätigen</button>
              <button onClick={() => setShowResetConfirm(false)} className="py-4 rounded-xl border-2 font-bold uppercase active:scale-95">Zurück</button>
            </div>
          </div>
        </div>
      )}

      {showRecords && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className={`rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl border-2 flex flex-col ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-black'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black uppercase flex items-center" style={{ color: BRAND_COLOR }}>
                <i className="fas fa-trophy mr-3 text-yellow-500"></i>Rekorde & Statistiken
              </h3>
              <div className="flex items-center space-x-2">
                {(SHOW_OPTIONS_BUTTON || isAdmin) && (
                  <button
                    onClick={() => { setShowAdminOptionsModal(true); setMergeMessage(null); }}
                    className="px-3 py-1.5 rounded-xl border border-gray-500/30 text-xs font-bold hover:bg-black/10 flex items-center space-x-1.5 cursor-pointer"
                  >
                    <i className="fas fa-cog text-gray-400"></i>
                    <span>Optionen {isAdmin && '👑'}</span>
                  </button>
                )}
                <button 
                  onClick={() => { setShowRecords(false); setRecordsData(null); }}
                  className="w-10 h-10 rounded-full flex items-center justify-center border font-bold hover:bg-black/10 active:scale-90"
                >
                  ✕
                </button>
              </div>
            </div>

            {recordsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <i className="fas fa-spinner animate-spin text-3xl" style={{ color: BRAND_COLOR }}></i>
                <p className="text-sm font-bold opacity-60">Statistiken werden vom Cloud Storage abgerufen...</p>
              </div>
            ) : recordsError ? (
              <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-center space-y-4 my-10">
                <i className="fas fa-exclamation-triangle text-3xl text-red-500"></i>
                <p className="text-sm font-bold text-red-500">{recordsError}</p>
                <button onClick={fetchRecords} className="px-5 py-2 rounded-xl bg-red-500 text-white font-bold text-xs uppercase hover:bg-red-600 active:scale-95">Erneut versuchen</button>
              </div>
            ) : (
              <div>
                {/* Mode Tabs */}
                <div className="flex space-x-2 mb-6 border-b border-gray-500/10 pb-4 overflow-x-auto">
                  {(['Standardspiel', 'Speedwiegen', 'Teamwiegen', 'Achievements'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveRecordsTab(tab);
                        setSpeedwiegenSizeTab('500ml');
                      }}
                      className={`px-4 py-2 rounded-xl font-black text-xs md:text-sm transition-all whitespace-nowrap ${
                        activeRecordsTab === tab 
                          ? 'text-white shadow-md' 
                          : 'opacity-50 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: activeRecordsTab === tab ? BRAND_COLOR : 'transparent' }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Main Records viewport */}
                {(() => {
                  const list = parseRecords(recordsData || []);

                  if (activeRecordsTab === 'Achievements') {
                    // Aggregation structure for achievements
                    const achGroupMap: Record<string, {
                      id: string;
                      title: string;
                      description: string;
                      icon: string;
                      rarity: string;
                      earnedTogether: boolean;
                      awards: Array<{ date: string; players: string[]; earnedTogether: boolean }>;
                    }> = {};

                    // Initialize with all master definitions so unlocked/locked status can be tracked
                    MASTER_ACHIEVEMENTS_DEFINITIONS.forEach(def => {
                      achGroupMap[def.id] = {
                        id: def.id,
                        title: def.title,
                        description: def.description,
                        icon: def.icon,
                        rarity: def.rarity,
                        earnedTogether: !!def.earnedTogether,
                        awards: []
                      };
                    });

                    const seenKeys: Record<string, Set<string>> = {};

                    const addAward = (ach: any, date: string, fallbackPlayerName: string) => {
                      const achId = ach.id;
                      if (!achId) return;

                      if (!achGroupMap[achId]) {
                        achGroupMap[achId] = {
                          id: achId,
                          title: ach.title || achId,
                          description: ach.description || '',
                          icon: ach.icon || '🏆',
                          rarity: ach.rarity || 'common',
                          earnedTogether: typeof ach.earnedTogether === 'boolean' ? ach.earnedTogether : TOGETHER_ACHIEVEMENT_IDS.includes(achId),
                          awards: []
                        };
                      }

                      if (!seenKeys[achId]) {
                        seenKeys[achId] = new Set();
                      }

                      const isTogether = typeof ach.earnedTogether === 'boolean'
                        ? ach.earnedTogether
                        : TOGETHER_ACHIEVEMENT_IDS.includes(achId);

                      const earnedByPlayers = Array.isArray(ach.earnedBy) && ach.earnedBy.length > 0
                        ? ach.earnedBy
                        : (fallbackPlayerName ? [fallbackPlayerName] : []);

                      if (earnedByPlayers.length === 0) return;

                      if (isTogether) {
                        const sortedPlayers = [...earnedByPlayers].sort();
                        const dedupKey = `${date}|${sortedPlayers.join(',')}`;
                        if (!seenKeys[achId].has(dedupKey)) {
                          seenKeys[achId].add(dedupKey);
                          achGroupMap[achId].awards.push({
                            date,
                            players: sortedPlayers,
                            earnedTogether: true
                          });
                        }
                      } else {
                        earnedByPlayers.forEach((pName: string) => {
                          const dedupKey = `${date}|${pName}`;
                          if (!seenKeys[achId].has(dedupKey)) {
                            seenKeys[achId].add(dedupKey);
                            achGroupMap[achId].awards.push({
                              date,
                              players: [pName],
                              earnedTogether: false
                            });
                          }
                        });
                      }
                    };

                    // 1. Current Session
                    const todayStr = new Date().toLocaleDateString('de-DE');
                    earnedAchievements.forEach(ach => {
                      addAward(ach, todayStr, '');
                    });

                    // 2. CSV Records
                    list.forEach(item => {
                      if (item.achievements && Array.isArray(item.achievements)) {
                        item.achievements.forEach(ach => {
                          addAward(ach, item.date, item.playerName);
                        });
                      }
                    });

                    const allGroups = Object.values(achGroupMap);

                    const filteredGroups = allGroups.filter(g => {
                      if (activeAchSubTab === 'Standardspiel') {
                        return !g.id.startsWith('speed_') && !g.id.startsWith('team_') && !g.id.startsWith('tournament_');
                      }
                      if (activeAchSubTab === 'Speedwiegen') {
                        return g.id.startsWith('speed_');
                      }
                      if (activeAchSubTab === 'Teamwiegen') {
                        return g.id.startsWith('team_');
                      }
                      if (activeAchSubTab === 'Turnier') {
                        return g.id.startsWith('tournament_');
                      }
                      return true;
                    });

                    let totalDefsForSubTab = MASTER_ACHIEVEMENTS_DEFINITIONS.length;
                    if (activeAchSubTab === 'Standardspiel') {
                      totalDefsForSubTab = MASTER_ACHIEVEMENTS_DEFINITIONS.filter(a => !a.id.startsWith('speed_') && !a.id.startsWith('team_') && !a.id.startsWith('tournament_')).length;
                    } else if (activeAchSubTab === 'Speedwiegen') {
                      totalDefsForSubTab = MASTER_ACHIEVEMENTS_DEFINITIONS.filter(a => a.id.startsWith('speed_')).length;
                    } else if (activeAchSubTab === 'Teamwiegen') {
                      totalDefsForSubTab = MASTER_ACHIEVEMENTS_DEFINITIONS.filter(a => a.id.startsWith('team_')).length;
                    } else if (activeAchSubTab === 'Turnier') {
                      totalDefsForSubTab = MASTER_ACHIEVEMENTS_DEFINITIONS.filter(a => a.id.startsWith('tournament_')).length;
                    }

                    const unlockedGroups = filteredGroups.filter(g => g.awards.length > 0);
                    const totalUniqueUnlocked = unlockedGroups.length;

                    // Player stats
                    const playerCounts: Record<string, number> = {};
                    let mostFrequentAch: { title: string; icon: string; count: number } | null = null;
                    let maxAchCount = 0;

                    unlockedGroups.forEach(g => {
                      const countForThisAch = g.awards.length;
                      if (countForThisAch > maxAchCount) {
                        maxAchCount = countForThisAch;
                        mostFrequentAch = { title: g.title, icon: g.icon, count: countForThisAch };
                      }

                      g.awards.forEach(aw => {
                        aw.players.forEach(p => {
                          playerCounts[p] = (playerCounts[p] || 0) + 1;
                        });
                      });
                    });

                    let topPlayerName = '';
                    let topPlayerCount = 0;
                    Object.entries(playerCounts).forEach(([name, cnt]) => {
                      if (cnt > topPlayerCount) {
                        topPlayerCount = cnt;
                        topPlayerName = name;
                      } else if (cnt === topPlayerCount && cnt > 0) {
                        topPlayerName += `, ${name}`;
                      }
                    });

                    // Sort unlocked groups by number of awards descending
                    const sortedUnlockedGroups = [...unlockedGroups].sort((a, b) => b.awards.length - a.awards.length);

                    return (
                      <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-2">
                        {/* Sub-tabs bar */}
                        <div className="flex space-x-2 border-b border-gray-500/10 pb-3 overflow-x-auto">
                          {(['Alle', 'Standardspiel', 'Speedwiegen', 'Teamwiegen', 'Turnier'] as const).map(sub => (
                            <button
                              key={sub}
                              onClick={() => setActiveAchSubTab(sub)}
                              className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all whitespace-nowrap ${
                                activeAchSubTab === sub
                                  ? 'text-white shadow-md'
                                  : darkMode ? 'bg-slate-700/50 text-gray-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                              style={{ backgroundColor: activeAchSubTab === sub ? BRAND_COLOR : undefined }}
                            >
                              {sub}
                            </button>
                          ))}
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className={`p-3.5 rounded-2xl border text-center ${darkMode ? 'bg-slate-900/80 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="text-[11px] uppercase tracking-wider font-bold opacity-60 mb-1">Unterschiedliche Achievements</div>
                            <div className="text-xl font-black flex items-center justify-center gap-1.5" style={{ color: BRAND_COLOR }}>
                              <i className="fas fa-trophy text-amber-500"></i>
                              {totalUniqueUnlocked} / {totalDefsForSubTab}
                            </div>
                          </div>

                          <div className={`p-3.5 rounded-2xl border text-center ${darkMode ? 'bg-slate-900/80 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="text-[11px] uppercase tracking-wider font-bold opacity-60 mb-1">Top-Sammler</div>
                            <div className="text-xl font-black truncate" style={{ color: BRAND_COLOR }}>
                              {topPlayerName ? (
                                <span>👑 {topPlayerName} <span className="text-xs opacity-70">({topPlayerCount}x)</span></span>
                              ) : (
                                <span className="opacity-40 text-sm">-</span>
                              )}
                            </div>
                          </div>

                          <div className={`p-3.5 rounded-2xl border text-center ${darkMode ? 'bg-slate-900/80 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="text-[11px] uppercase tracking-wider font-bold opacity-60 mb-1">Häufigstes Achievement</div>
                            <div className="text-xl font-black truncate" style={{ color: BRAND_COLOR }}>
                              {mostFrequentAch ? (
                                <span>{mostFrequentAch.icon} {mostFrequentAch.title} <span className="text-xs opacity-70">({mostFrequentAch.count}x)</span></span>
                              ) : (
                                <span className="opacity-40 text-sm">-</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Achievements Grid */}
                        {sortedUnlockedGroups.length === 0 ? (
                          <div className="p-12 text-center opacity-60">
                            <i className="fas fa-trophy text-5xl mb-4 block text-amber-500/50"></i>
                            <p className="font-bold text-lg">Noch keine Achievements freigeschaltet</p>
                            <p className="text-xs mt-2">Erreiche besondere Meilensteine im Spiel, um Achievements freizuschalten.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sortedUnlockedGroups.map(ach => {
                              const rarityBadge = {
                                common: "bg-gray-500/20 text-gray-400 border-gray-500/30",
                                rare: "bg-blue-500/20 text-blue-400 border-blue-500/30",
                                epic: "bg-purple-500/20 text-purple-400 border-purple-500/30",
                                legendary: "bg-amber-500/20 text-amber-400 border-amber-500/30"
                              }[ach.rarity] || "bg-gray-500/20 text-gray-400 border-gray-500/30";

                              return (
                                <div 
                                  key={ach.id} 
                                  className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                                    darkMode ? 'bg-slate-900/70 border-slate-700' : 'bg-gray-50 border-gray-200'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-start space-x-3">
                                      <div className="text-3xl p-3 rounded-xl bg-black/10 flex items-center justify-center min-w-[50px]">
                                        {ach.icon.startsWith('fa-') || ach.icon.startsWith('fas ') ? <i className={ach.icon}></i> : ach.icon}
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                          <h4 className="font-black text-sm">{ach.title}</h4>
                                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${rarityBadge}`}>
                                            {ach.rarity}
                                          </span>
                                        </div>
                                        <p className="text-xs opacity-70 mt-1">{ach.description}</p>
                                      </div>
                                    </div>

                                    {/* List of Awards */}
                                    <div className="mt-3 pt-3 border-t border-gray-500/10 space-y-2">
                                      <div className="text-[10px] uppercase font-bold opacity-50 tracking-wider">Erhalten von:</div>
                                      {(() => {
                                        const isTeamAch = ach.id.startsWith('team_') || (ach.awards.length > 0 && ach.awards[0].players.some(p => p.startsWith('Team ')));
                                        const isTogetherAch = !isTeamAch && (ach.earnedTogether || TOGETHER_ACHIEVEMENT_IDS.includes(ach.id) || (ach.awards.length > 0 && ach.awards[0].earnedTogether));

                                        if (isTeamAch) {
                                          const teamGroups: Record<string, { count: number; dates: string[]; players: string[] }> = {};
                                          ach.awards.forEach(aw => {
                                            const sortedPlayers = [...aw.players].sort();
                                            const key = sortedPlayers.join('|');
                                            if (!teamGroups[key]) teamGroups[key] = { count: 0, dates: [], players: sortedPlayers };
                                            teamGroups[key].count++;
                                            teamGroups[key].dates.push(aw.date);
                                          });

                                          return Object.entries(teamGroups).map(([key, group], gIdx) => (
                                            <div key={gIdx} className="bg-black/5 dark:bg-white/5 px-3 py-2 rounded-xl flex flex-col space-y-1 border border-black/5 dark:border-white/5">
                                              <div className="flex items-center justify-between text-xs font-bold">
                                                <div className="flex items-center space-x-1.5 flex-wrap">
                                                  <span className="text-xs">🏆</span>
                                                  {group.players.map((pName, pIdx) => (
                                                    <React.Fragment key={pIdx}>
                                                      {pIdx > 0 && <span className="opacity-50 text-[10px] mx-0.5">&amp;</span>}
                                                      <span style={{ color: getPlayerColor(pName, players) }}>{pName}</span>
                                                    </React.Fragment>
                                                  ))}
                                                </div>
                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30">
                                                  ×{group.count}
                                                </span>
                                              </div>
                                              <div className="pl-5">
                                                <ExpandableDates dates={group.dates} />
                                              </div>
                                            </div>
                                          ));
                                        }

                                        if (isTogetherAch) {
                                          const togetherGroups: Record<string, { count: number; dates: string[]; players: string[] }> = {};
                                          ach.awards.forEach(aw => {
                                            const sortedPlayers = [...aw.players].sort();
                                            const key = sortedPlayers.join('|');
                                            if (!togetherGroups[key]) togetherGroups[key] = { count: 0, dates: [], players: sortedPlayers };
                                            togetherGroups[key].count++;
                                            togetherGroups[key].dates.push(aw.date);
                                          });

                                          return Object.entries(togetherGroups).map(([key, group], gIdx) => (
                                            <div key={gIdx} className="bg-black/5 dark:bg-white/5 px-3 py-2 rounded-xl flex flex-col space-y-1 border border-black/5 dark:border-white/5">
                                              <div className="flex items-center justify-between text-xs font-bold">
                                                <div className="flex items-center space-x-1.5 flex-wrap">
                                                  <span className="text-xs">👥</span>
                                                  {group.players.map((pName, pIdx) => (
                                                    <React.Fragment key={pIdx}>
                                                      {pIdx > 0 && <span className="opacity-50 text-[10px] mx-0.5">&amp;</span>}
                                                      <span style={{ color: getPlayerColor(pName, players) }}>{pName}</span>
                                                    </React.Fragment>
                                                  ))}
                                                </div>
                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                                  ×{group.count}
                                                </span>
                                              </div>
                                              <div className="pl-5">
                                                <ExpandableDates dates={group.dates} />
                                              </div>
                                            </div>
                                          ));
                                        }

                                        // Für Solo-Achievements: gruppieren nach Spielername
                                        const playerGroups: Record<string, { count: number; dates: string[] }> = {};
                                        ach.awards.forEach(aw => {
                                          aw.players.forEach(pName => {
                                            if (!playerGroups[pName]) playerGroups[pName] = { count: 0, dates: [] };
                                            playerGroups[pName].count++;
                                            playerGroups[pName].dates.push(aw.date);
                                          });
                                        });

                                        return Object.entries(playerGroups).map(([pName, group], gIdx) => (
                                          <div key={gIdx} className="bg-black/5 dark:bg-white/5 px-3 py-2 rounded-xl flex flex-col space-y-1 border border-black/5 dark:border-white/5">
                                            <div className="flex items-center justify-between text-xs font-bold">
                                              <div className="flex items-center space-x-1.5">
                                                <span className="text-xs">👤</span>
                                                <span style={{ color: getPlayerColor(pName, players) }}>{pName}</span>
                                              </div>
                                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-brand/20 text-brand border border-brand/30">
                                                ×{group.count}
                                              </span>
                                            </div>
                                            <div className="pl-5">
                                              <ExpandableDates dates={group.dates} />
                                            </div>
                                          </div>
                                        ));
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  let filtered: any[] = [];
                  if (activeRecordsTab === 'Standardspiel') {
                    if (standardspielSizeTab === '500ml') {
                      filtered = list.filter(r => r.gameMode === 'Standardspiel (500ml)' || r.gameMode === 'Standardspiel');
                    } else {
                      filtered = list.filter(r => r.gameMode === 'Standardspiel (0,33L)');
                    }
                  } else if (activeRecordsTab === 'Speedwiegen') {
                    // RÜCKWÄRTSKOMPATIBILITÄT:
                    // Alle Speedwiegen-Einträge die vor der Einführung des 0,33L Modus gespeichert wurden
                    // haben gameMode === 'Speedwiegen' (ohne Modusangabe).
                    // Diese werden automatisch dem 500ml Modus zugeordnet.
                    // Neue Einträge werden explizit als 'Speedwiegen (500ml)' oder 'Speedwiegen (0,33L)' gespeichert.
                    if (speedwiegenSizeTab === '500ml') {
                      filtered = list.filter(r =>
                        r.gameMode === 'Speedwiegen (500ml)' ||
                        r.gameMode === 'Speedwiegen'
                      );
                    } else {
                      filtered = list.filter(r =>
                        r.gameMode === 'Speedwiegen (0,33L)'
                      );
                    }
                  } else {
                    filtered = list.filter(r => r.gameMode === activeRecordsTab);
                  }

                  if (filtered.length === 0) {
                    if (activeRecordsTab === 'Speedwiegen') {
                      return (
                        <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-2">
                          <div className="flex flex-col space-y-1">
                            <span className="text-[10px] uppercase font-bold opacity-50 tracking-wider">Becher-Format</span>
                            <div className={`flex space-x-1 p-1 rounded-xl ${darkMode ? 'bg-slate-900/60' : 'bg-black/5'} w-fit`}>
                              {(['500ml', '0,33L'] as const).map(size => (
                                <button
                                  key={size}
                                  onClick={() => setSpeedwiegenSizeTab(size)}
                                  className={`py-1 px-3 rounded-lg font-black text-xs transition-all ${
                                    speedwiegenSizeTab === size
                                      ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30'
                                      : 'opacity-60 hover:opacity-100'
                                  }`}
                                >
                                  {size === '500ml' ? '500 ml' : '0,33 L'}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="text-center py-12 opacity-55">
                            <i className="fas fa-stopwatch text-4xl mb-3 text-amber-500"></i>
                            <p className="font-bold text-sm">Keine Einträge für den {speedwiegenSizeTab === '500ml' ? '500 ml Modus' : '0,33 L Modus'} im Speedwiegen gefunden.</p>
                            <p className="text-[10px] opacity-75 mt-1">Spiele eine Runde Speedwiegen im entsprechenden Format und lade dein Ergebnis hoch!</p>
                          </div>
                        </div>
                      );
                    } else if (activeRecordsTab !== 'Standardspiel') {
                      return (
                        <div className="text-center py-16 opacity-55">
                          <i className="fas fa-info-circle text-4xl mb-4"></i>
                          <p className="font-bold text-sm">Keine Einträge für {activeRecordsTab} gefunden.</p>
                        </div>
                      );
                    }
                  }

                  // 1. Leaderboard of Best Averages (Lowest first) or Best overall achievements
                  if (activeRecordsTab === 'Standardspiel') {
                    // Compute player stats map
                    const playerStatsMap: Record<string, {
                      name: string;
                      gamesPlayed: number;
                      totalSchnaepse: number;
                      avgSchnaepsePerGame: number;
                      bestSchnaepseSingle: number;
                      bestAvgSingle: number;
                      careerAverage: number;
                      bestTotalSingle: number;
                      scores: Array<{ avg: number; schnaepse: number; date: string }>;
                    }> = {};

                    filtered.forEach(item => {
                      const name = item.playerName;
                      if (!playerStatsMap[name]) {
                        playerStatsMap[name] = {
                          name,
                          gamesPlayed: 0,
                          totalSchnaepse: 0,
                          avgSchnaepsePerGame: 0,
                          bestSchnaepseSingle: 0,
                          bestAvgSingle: Infinity,
                          careerAverage: 0,
                          bestTotalSingle: Infinity,
                          scores: [],
                        };
                      }
                      const stat = playerStatsMap[name];
                      stat.gamesPlayed += 1;
                      stat.totalSchnaepse += item.schnaepse;
                      if (item.schnaepse > stat.bestSchnaepseSingle) {
                        stat.bestSchnaepseSingle = item.schnaepse;
                      }
                      if (item.avg < stat.bestAvgSingle) {
                        stat.bestAvgSingle = item.avg;
                      }
                      const totalSingle = item.avg + item.schnaepse;
                      if (totalSingle < stat.bestTotalSingle) {
                        stat.bestTotalSingle = totalSingle;
                      }
                      stat.scores.push({ avg: item.avg, schnaepse: item.schnaepse, date: item.date });
                    });

                    // Calculate averages
                    Object.values(playerStatsMap).forEach(stat => {
                      const sumAvg = stat.scores.reduce((sum, s) => sum + s.avg, 0);
                      stat.careerAverage = sumAvg / stat.gamesPlayed;
                      stat.avgSchnaepsePerGame = stat.gamesPlayed > 0 ? stat.totalSchnaepse / stat.gamesPlayed : 0;
                    });

                    const playerStatsList = Object.values(playerStatsMap);

                    return (
                      <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-2">
                        {/* Modus und Sub-Tabs selector */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-500/5 pb-4">
                          <div className="flex flex-col space-y-1">
                            <span className="text-[10px] uppercase font-bold opacity-50 tracking-wider">Becher-Format</span>
                            <div className={`flex space-x-1 p-1 rounded-xl ${darkMode ? 'bg-slate-900/60' : 'bg-black/5'} w-fit`}>
                              {(['500ml', '0,33L'] as const).map(size => (
                                <button
                                  key={size}
                                  onClick={() => setStandardspielSizeTab(size)}
                                  className={`py-1 px-3 rounded-lg font-black text-xs transition-all ${
                                    standardspielSizeTab === size
                                      ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30'
                                      : 'opacity-60 hover:opacity-100'
                                  }`}
                                >
                                  {size === '500ml' ? '500 ml' : '0,33 L'}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col space-y-1">
                            <span className="text-[10px] uppercase font-bold opacity-50 tracking-wider">Statistikreiter</span>
                            <div className={`flex flex-wrap gap-1 p-1 rounded-xl ${darkMode ? 'bg-slate-900/60' : 'bg-black/5'} w-fit`}>
                              {(['all', 'highest_schnaepse', 'best_avg', 'best_total'] as const).map(subTab => {
                                let label = "";
                                if (subTab === 'all') label = "Spieler";
                                if (subTab === 'highest_schnaepse') label = "Schnappsrekord";
                                if (subTab === 'best_avg') label = "Durschnittsrekord";
                                if (subTab === 'best_total') label = "Total Rekord";
                                return (
                                  <button
                                    key={subTab}
                                    onClick={() => setActiveStandardSubTab(subTab)}
                                    className={`py-1 px-3 rounded-lg font-black text-xs transition-all ${
                                      activeStandardSubTab === subTab
                                        ? (darkMode ? 'bg-slate-700 text-white shadow' : 'bg-white text-gray-950 shadow')
                                        : 'opacity-60 hover:opacity-100'
                                    }`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {filtered.length === 0 ? (
                          <div className="text-center py-12 opacity-55">
                            <i className="fas fa-beer text-4xl mb-3 text-amber-500"></i>
                            <p className="font-bold text-sm">Keine Einträge für den {standardspielSizeTab === '500ml' ? '500 ml Modus' : '0,33 L Modus'} gefunden.</p>
                            <p className="text-[10px] opacity-75 mt-1">Spiele eine Runde im entsprechenden Format und lade dein Ergebnis hoch!</p>
                          </div>
                        ) : (
                          <>
                            {activeStandardSubTab === 'all' && (() => {
                              const playerNames = Array.from(new Set(filtered.map(item => item.playerName))).sort();
                              const currentActivePlayer = activePlayerNameTab && playerNames.includes(activePlayerNameTab)
                                ? activePlayerNameTab
                                : (playerNames[0] || null);

                              return (
                                <div className="space-y-4">
                                  {/* Under-reiter for Names */}
                                  <div className="flex flex-col space-y-1.5">
                                    <span className="text-[10px] uppercase font-black opacity-40 tracking-wider">Spieler-Historie (Unterreiter)</span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {playerNames.map(name => {
                                        const isActive = name === currentActivePlayer;
                                        const pGames = filtered.filter(f => f.playerName === name);
                                        return (
                                          <button
                                            key={name}
                                            onClick={() => setActivePlayerNameTab(name)}
                                            className={`py-1.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                                              isActive
                                                ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30'
                                                : (darkMode ? 'bg-slate-800 hover:bg-slate-750 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-800')
                                            }`}
                                          >
                                            {name} <span className="text-[9px] opacity-60">({pGames.length})</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {currentActivePlayer ? (() => {
                                    const playerGames = filtered.filter(f => f.playerName === currentActivePlayer);
                                    return (
                                      <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/40 border-white/5' : 'bg-black/5 border-black/5'}`}>
                                        <h4 className="text-sm font-black uppercase mb-4 tracking-wider text-yellow-500 flex items-center">
                                          <i className="fas fa-beer mr-2 text-amber-500"></i>Spiele von: {currentActivePlayer}
                                        </h4>
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-left text-xs whitespace-nowrap">
                                            <thead>
                                              <tr className="border-b border-gray-500/10 pb-2 uppercase opacity-60 font-bold">
                                                <th className="pb-2 pr-4">{`Datum`}</th>
                                                <th className="pb-2 text-center pr-4">{`Durchschnittliche Abweichung`}</th>
                                                <th className="pb-2 text-center pr-4">{`Schnäpse`}</th>
                                                <th className="pb-2 text-right">{`Total`}</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {playerGames.map((item, idx) => {
                                                const totalScore = item.avg + item.schnaepse;
                                                return (
                                                  <tr key={idx} className="border-b border-gray-500/5 hover:bg-black/10">
                                                    <td className="py-3 font-semibold text-gray-400">{item.date}</td>
                                                    <td className="py-3 text-center text-emerald-500 font-bold pr-4">{item.avg.toFixed(2)}g</td>
                                                    <td className="py-3 text-center text-indigo-400 font-bold pr-4">{item.schnaepse}</td>
                                                    <td className="py-3 text-right font-black" style={{ color: BRAND_COLOR }}>
                                                      {totalScore.toFixed(2)}
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    );
                                  })() : (
                                    <p className="text-center opacity-60 text-xs py-8">Keine Spieler vorhanden.</p>
                                  )}
                                </div>
                              );
                            })()}

                        {activeStandardSubTab === 'highest_schnaepse' && (() => {
                          const sortedByAvgSchnaepse = [...playerStatsList].sort((a,b) => {
                            if (b.avgSchnaepsePerGame !== a.avgSchnaepsePerGame) {
                              return b.avgSchnaepsePerGame - a.avgSchnaepsePerGame;
                            }
                            if (b.totalSchnaepse !== a.totalSchnaepse) {
                              return b.totalSchnaepse - a.totalSchnaepse;
                            }
                            return a.careerAverage - b.careerAverage;
                          });
                          const sortedBySingleSchnaepse = [...filtered].sort((a,b) => b.schnaepse - a.schnaepse);
                          
                          const topAvgSchnaepse = sortedByAvgSchnaepse[0];
                          const topSingle = sortedBySingleSchnaepse[0];
                          
                          return (
                            <div className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {topAvgSchnaepse && (
                                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-yellow-500/20' : 'bg-emerald-500/5 border-emerald-500/10'} flex items-center space-x-4`}>
                                    <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 text-xl font-bold">
                                      👑
                                    </div>
                                    <div>
                                      <span className="text-[10px] uppercase font-bold opacity-50 block">Schnäpse-König (Ø pro Spiel)</span>
                                      <h5 className="font-black text-base">{topAvgSchnaepse.name}</h5>
                                      <p className="text-xs font-semibold text-yellow-500">{topAvgSchnaepse.avgSchnaepsePerGame.toFixed(2)} Schnäpse/Spiel ({topAvgSchnaepse.gamesPlayed} Spiele)</p>
                                    </div>
                                  </div>
                                )}
                                {topSingle && (
                                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-indigo-500/20' : 'bg-indigo-500/5 border-indigo-500/10'} flex items-center space-x-4`}>
                                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 text-xl font-bold">
                                      🍻
                                    </div>
                                    <div>
                                      <span className="text-[10px] uppercase font-bold opacity-50 block">Rekord-Einzelspiel (Schnäpse)</span>
                                      <h5 className="font-black text-base">{topSingle.playerName}</h5>
                                      <p className="text-xs font-semibold text-indigo-400">{topSingle.schnaepse} Schnäpse <span className="opacity-50 text-[10px]">({topSingle.date})</span></p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/40 border-white/5' : 'bg-black/5 border-black/5'}`}>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 pb-2 border-b border-gray-500/10">
                                  <h4 className="text-sm font-black uppercase tracking-wider text-yellow-500 flex items-center">
                                    <i className="fas fa-wine-glass-alt mr-2 text-pink-400"></i>
                                    {schnaepseSortMode === 'gesamt' ? 'Rangliste: Schnäpse-Durchschnitt (pro Spiel)' : 'Rangliste: Meiste Schnäpse Einzelspiel'}
                                  </h4>
                                  
                                  {/* Toggle buttons */}
                                  <div className="flex space-x-1.5 p-1 rounded-xl bg-black/10 w-fit">
                                    <button
                                      onClick={() => setSchnaepseSortMode('gesamt')}
                                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                        schnaepseSortMode === 'gesamt'
                                          ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30'
                                          : (darkMode ? 'hover:bg-slate-800 text-gray-300' : 'hover:bg-gray-200 text-gray-800')
                                      }`}
                                    >
                                      Gesamt
                                    </button>
                                    <button
                                      onClick={() => setSchnaepseSortMode('einzelspiel')}
                                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                        schnaepseSortMode === 'einzelspiel'
                                          ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30'
                                          : (darkMode ? 'hover:bg-slate-800 text-gray-300' : 'hover:bg-gray-200 text-gray-800')
                                      }`}
                                    >
                                      Einzelspiel
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  {schnaepseSortMode === 'gesamt' ? (
                                    sortedByAvgSchnaepse.slice(0, 10).map((p, idx) => (
                                      <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-black/10 border border-white/5 text-xs">
                                        <div className="flex items-center space-x-2 pb-0.5">
                                          <span className="font-black text-xs opacity-50">#{idx + 1}</span>
                                          <button 
                                            onClick={() => setSelectedPlayerForDetails(p.name)}
                                            className="hover:underline text-left cursor-pointer font-black hover:text-indigo-400 transition-colors inline-flex items-center group"
                                          >
                                            <span>{p.name}</span>
                                            <i className="fas fa-search-plus ml-1.5 text-[9px] opacity-0 group-hover:opacity-60 transition-opacity"></i>
                                          </button>
                                        </div>
                                        <div className="text-right">
                                          <span className="font-black text-sm text-yellow-500">{p.avgSchnaepsePerGame.toFixed(2)} Schnäpse/Spiel</span>
                                          <span className="block text-[8px] opacity-40">{p.gamesPlayed} Spiele</span>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    sortedBySingleSchnaepse.slice(0, 10).map((p, idx) => (
                                      <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-black/10 border border-white/5 text-xs">
                                        <div className="flex items-center space-x-2 pb-0.5">
                                          <span className="font-black text-xs opacity-50">#{idx + 1}</span>
                                          <button 
                                            onClick={() => setSelectedPlayerForDetails(p.playerName)}
                                            className="hover:underline text-left cursor-pointer font-black hover:text-indigo-400 transition-colors inline-flex items-center group"
                                          >
                                            <span>{p.playerName}</span>
                                            <i className="fas fa-search-plus ml-1.5 text-[9px] opacity-0 group-hover:opacity-60 transition-opacity"></i>
                                          </button>
                                        </div>
                                        <div className="text-right">
                                          <span className="font-black text-sm text-yellow-500">{p.schnaepse} Schnäpse</span>
                                          <span className="block text-[8px] opacity-40">{p.date} • Ø {p.avg.toFixed(2)}g</span>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {activeStandardSubTab === 'best_avg' && (() => {
                          const sortedByCareerAverage = [...playerStatsList].sort((a,b) => a.careerAverage - b.careerAverage);
                          const sortedBySingleAverage = [...filtered].sort((a,b) => a.avg - b.avg);
                          
                          const topCareerAvg = sortedByCareerAverage[0];
                          const topSingleAvg = sortedBySingleAverage[0];
                          
                          return (
                            <div className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {topCareerAvg && (
                                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-emerald-500/20' : 'bg-emerald-500/5 border-emerald-500/10'} flex items-center space-x-4`}>
                                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-xl font-bold">
                                      🎯
                                    </div>
                                    <div>
                                      <span className="text-[10px] uppercase font-bold opacity-50 block">Präzisions-Meister (Ø Gesamt)</span>
                                      <h5 className="font-black text-base">{topCareerAvg.name}</h5>
                                      <p className="text-xs font-semibold text-emerald-500">{topCareerAvg.careerAverage.toFixed(2)}g Ø-Abweichung</p>
                                    </div>
                                  </div>
                                )}
                                {topSingleAvg && (
                                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-amber-500/20' : 'bg-amber-500/5 border-amber-500/10'} flex items-center space-x-4`}>
                                    <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 text-xl font-bold">
                                      ⚡
                                    </div>
                                    <div>
                                      <span className="text-[10px] uppercase font-bold opacity-50 block">Bestes Einzelspiel (Avg)</span>
                                      <h5 className="font-black text-base">{topSingleAvg.playerName}</h5>
                                      <p className="text-xs font-semibold text-amber-500">{topSingleAvg.avg.toFixed(2)}g Abweichung <span className="opacity-50 text-[10px]">({topSingleAvg.date})</span></p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/40 border-white/5' : 'bg-black/5 border-black/5'}`}>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 pb-2 border-b border-gray-500/10">
                                  <h4 className="text-sm font-black uppercase tracking-wider text-yellow-500 flex items-center">
                                    <i className="fas fa-crosshairs mr-2 text-emerald-400"></i>
                                    Rangliste: Durchschnitt
                                  </h4>
                                  
                                  {/* Toggle buttons */}
                                  <div className="flex space-x-1.5 p-1 rounded-xl bg-black/10 w-fit">
                                    <button
                                      onClick={() => setAvgSortMode('gesamt')}
                                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                        avgSortMode === 'gesamt'
                                          ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30'
                                          : (darkMode ? 'hover:bg-slate-800 text-gray-300' : 'hover:bg-gray-200 text-gray-800')
                                      }`}
                                    >
                                      Gesamtdurchschnitt
                                    </button>
                                    <button
                                      onClick={() => setAvgSortMode('einzelspiel')}
                                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                        avgSortMode === 'einzelspiel'
                                          ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30'
                                          : (darkMode ? 'hover:bg-slate-800 text-gray-300' : 'hover:bg-gray-200 text-gray-800')
                                      }`}
                                    >
                                      Einzelspiel
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  {avgSortMode === 'gesamt' ? (
                                    sortedByCareerAverage.slice(0, 10).map((p, idx) => (
                                      <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-black/10 border border-white/5 text-xs">
                                        <div className="flex items-center space-x-2 pb-0.5">
                                          <span className="font-black text-xs opacity-50">#{idx + 1}</span>
                                          <button 
                                            onClick={() => setSelectedPlayerForDetails(p.name)}
                                            className="hover:underline text-left cursor-pointer font-black hover:text-indigo-400 transition-colors inline-flex items-center group"
                                          >
                                            <span>{p.name}</span>
                                            <i className="fas fa-search-plus ml-1.5 text-[9px] opacity-0 group-hover:opacity-60 transition-opacity"></i>
                                          </button>
                                        </div>
                                        <div className="text-right">
                                          <span className="font-black text-sm text-emerald-500">{p.careerAverage.toFixed(2)}g</span>
                                          <span className="block text-[8px] opacity-40">{p.gamesPlayed} Spiele</span>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    sortedBySingleAverage.slice(0, 10).map((p, idx) => (
                                      <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-black/10 border border-white/5 text-xs">
                                        <div className="flex items-center space-x-2 pb-0.5">
                                          <span className="font-black text-xs opacity-50">#{idx + 1}</span>
                                          <button 
                                            onClick={() => setSelectedPlayerForDetails(p.playerName)}
                                            className="hover:underline text-left cursor-pointer font-black hover:text-indigo-400 transition-colors inline-flex items-center group"
                                          >
                                            <span>{p.playerName}</span>
                                            <i className="fas fa-search-plus ml-1.5 text-[9px] opacity-0 group-hover:opacity-60 transition-opacity"></i>
                                          </button>
                                        </div>
                                        <div className="text-right">
                                          <span className="font-black text-sm text-emerald-500">{p.avg.toFixed(2)}g</span>
                                          <span className="block text-[8px] opacity-40">{p.date} • {p.schnaepse} Pkt</span>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {activeStandardSubTab === 'best_total' && (() => {
                          const sortedBySingleTotal = [...filtered].sort((a,b) => (a.avg + a.schnaepse) - (b.avg + b.schnaepse));
                          const sortedByCareerAverageTotal = [...playerStatsList].sort((a,b) => {
                            const aTotalAvg = a.scores.reduce((sum, s) => sum + (s.avg + s.schnaepse), 0) / a.gamesPlayed;
                            const bTotalAvg = b.scores.reduce((sum, s) => sum + (s.avg + s.schnaepse), 0) / b.gamesPlayed;
                            return aTotalAvg - bTotalAvg;
                          });
                          
                          const topSingleTotal = sortedBySingleTotal[0];
                          const topCareerAverageTotal = sortedByCareerAverageTotal[0];
                          
                          return (
                            <div className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {topSingleTotal && (
                                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-purple-500/20' : 'bg-purple-500/5 border-purple-500/10'} flex items-center space-x-4`}>
                                    <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 text-xl font-bold">
                                      🏆
                                    </div>
                                    <div>
                                      <span className="text-[10px] uppercase font-bold opacity-50 block">Bestes Einzel-Total</span>
                                      <h5 className="font-black text-base">{topSingleTotal.playerName}</h5>
                                      <p className="text-xs font-semibold text-purple-400">Total: {(topSingleTotal.avg + topSingleTotal.schnaepse).toFixed(2)} <span className="opacity-75 text-[10px]">({topSingleTotal.avg.toFixed(2)}g Avg + {topSingleTotal.schnaepse} Schnäpse)</span></p>
                                    </div>
                                  </div>
                                )}
                                {topCareerAverageTotal && (() => {
                                  const avgTotal = topCareerAverageTotal.scores.reduce((sum, s) => sum + (s.avg + s.schnaepse), 0) / topCareerAverageTotal.gamesPlayed;
                                  return (
                                    <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/40 border-blue-500/20' : 'bg-blue-500/5 border-blue-500/10'} flex items-center space-x-4`}>
                                      <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 text-xl font-bold">
                                        📊
                                      </div>
                                      <div>
                                        <span className="text-[10px] uppercase font-bold opacity-50 block">Bestes Durchschnitts-Total</span>
                                        <h5 className="font-black text-base">{topCareerAverageTotal.name}</h5>
                                        <p className="text-xs font-semibold text-blue-400">Ø Total: {avgTotal.toFixed(2)} <span className="opacity-50 text-[10px]">({topCareerAverageTotal.gamesPlayed} Spiele)</span></p>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>

                              <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/40 border-white/5' : 'bg-black/5 border-black/5'}`}>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 pb-2 border-b border-gray-500/10">
                                  <h4 className="text-sm font-black uppercase tracking-wider text-yellow-500 flex items-center">
                                    <i className="fas fa-trophy mr-2 text-purple-400"></i>
                                    Rangliste: Total
                                  </h4>
                                  
                                  {/* Toggle buttons */}
                                  <div className="flex space-x-1.5 p-1 rounded-xl bg-black/10 w-fit">
                                    <button
                                      onClick={() => setTotalSortMode('gesamt')}
                                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                        totalSortMode === 'gesamt'
                                          ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30'
                                          : (darkMode ? 'hover:bg-slate-800 text-gray-300' : 'hover:bg-gray-200 text-gray-800')
                                      }`}
                                    >
                                      Gesamtdurchschnitt
                                    </button>
                                    <button
                                      onClick={() => setTotalSortMode('einzelspiel')}
                                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                        totalSortMode === 'einzelspiel'
                                          ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30'
                                          : (darkMode ? 'hover:bg-slate-800 text-gray-300' : 'hover:bg-gray-200 text-gray-800')
                                      }`}
                                    >
                                      Einzelspiel
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  {totalSortMode === 'gesamt' ? (
                                    sortedByCareerAverageTotal.slice(0, 10).map((p, idx) => {
                                      const careerTotalAvg = p.scores.reduce((sum, s) => sum + (s.avg + s.schnaepse), 0) / p.gamesPlayed;
                                      return (
                                        <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-black/10 border border-white/5 text-xs">
                                          <div className="flex items-center space-x-2 pb-0.5">
                                            <span className="font-black text-xs opacity-50">#{idx + 1}</span>
                                            <button 
                                              onClick={() => setSelectedPlayerForDetails(p.name)}
                                              className="hover:underline text-left cursor-pointer font-black hover:text-indigo-400 transition-colors inline-flex items-center group"
                                            >
                                              <span>{p.name}</span>
                                              <i className="fas fa-search-plus ml-1.5 text-[9px] opacity-0 group-hover:opacity-60 transition-opacity"></i>
                                            </button>
                                          </div>
                                          <div className="text-right">
                                            <span className="font-black text-sm text-purple-400">{careerTotalAvg.toFixed(2)}</span>
                                            <span className="block text-[8px] opacity-40">{p.gamesPlayed} Spiele</span>
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    sortedBySingleTotal.slice(0, 10).map((p, idx) => (
                                      <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-black/10 border border-white/5 text-xs">
                                        <div className="flex items-center space-x-2 pb-0.5">
                                          <span className="font-black text-xs opacity-50">#{idx + 1}</span>
                                          <button 
                                            onClick={() => setSelectedPlayerForDetails(p.playerName)}
                                            className="hover:underline text-left cursor-pointer font-black hover:text-indigo-400 transition-colors inline-flex items-center group"
                                          >
                                            <span>{p.playerName}</span>
                                            <i className="fas fa-search-plus ml-1.5 text-[9px] opacity-0 group-hover:opacity-60 transition-opacity"></i>
                                          </button>
                                        </div>
                                        <div className="text-right">
                                          <span className="font-black text-sm text-purple-400">{(p.avg + p.schnaepse).toFixed(2)}</span>
                                          <span className="block text-[8px] opacity-40">{p.avg.toFixed(2)}g Avg + {p.schnaepse} Pkt ({p.date})</span>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                          </>
                        )}
                      </div>
                    );
                  }

                  // Default view for other modes (Speedwiegen, Teamwiegen)
                  // Let's find personal record of every player (best single-game average)
                  const personalBests: Record<string, { avg: number; schnaepse: number; date: string; levels?: number }> = {};
                  filtered.forEach(item => {
                    const existing = personalBests[item.playerName];
                    if (!existing || item.avg < existing.avg) {
                      personalBests[item.playerName] = { avg: item.avg, schnaepse: item.schnaepse, date: item.date, levels: item.levels };
                    }
                  });

                  const leaderboardAverages = Object.entries(personalBests)
                    .map(([name, data]) => ({ name, ...data }))
                    .sort((a, b) => a.avg - b.avg); // lower is better

                  // 2. Leaderboard of highest single-game points (schnaepse) (lowest time is better for Speedwiegen)
                  const pointsLeaderboard = [...filtered]
                    .sort((a, b) => activeRecordsTab === 'Speedwiegen' ? a.schnaepse - b.schnaepse : b.schnaepse - a.schnaepse)
                    .slice(0, 10); // top 10

                  const speedmeisterList = [...filtered]
                    .sort((a, b) => (a.avg + a.schnaepse) - (b.avg + b.schnaepse));

                  return (
                    <div className="space-y-8 max-h-[55vh] overflow-y-auto pr-2">
                      {activeRecordsTab === 'Speedwiegen' && (
                        <div className="flex flex-col space-y-1">
                          <span className="text-[10px] uppercase font-bold opacity-50 tracking-wider">Becher-Format</span>
                          <div className={`flex space-x-1 p-1 rounded-xl ${darkMode ? 'bg-slate-900/60' : 'bg-black/5'} w-fit`}>
                            {(['500ml', '0,33L'] as const).map(size => (
                              <button
                                key={size}
                                onClick={() => setSpeedwiegenSizeTab(size)}
                                className={`py-1 px-3 rounded-lg font-black text-xs transition-all ${
                                  speedwiegenSizeTab === size
                                    ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30'
                                    : 'opacity-60 hover:opacity-100'
                                }`}
                              >
                                {size === '500ml' ? '500 ml' : '0,33 L'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeRecordsTab === 'Speedwiegen' ? (
                        <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/40 border-white/5' : 'bg-black/5 border-black/5'}`}>
                          <h4 className="text-sm font-black uppercase mb-1 tracking-wider text-yellow-500 flex items-center">
                            <i className="fas fa-trophy mr-2 text-amber-400"></i>Speedmeister-Rangliste
                          </h4>
                          <p className="text-[10px] opacity-50 mb-3 font-bold">
                            (Ø Abstand + Zeit in Sekunden – je niedriger desto besser)
                          </p>
                          <div className="space-y-2">
                            {speedmeisterList.slice(0, 10).map((p, idx) => {
                              const score = (p.avg + p.schnaepse).toFixed(1);
                              return (
                                <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-black/10 border border-white/5 text-xs">
                                  <div className="flex items-center space-x-3">
                                    <span className="font-black text-xs opacity-50">#{idx + 1}</span>
                                    <span className="font-black text-sm">{p.playerName}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-black text-sm text-amber-400">Score: {score}</span>
                                    <span className="block text-[10px] opacity-60">
                                      (Ø {p.avg.toFixed(1)}g + {p.schnaepse.toFixed(1)}s{p.levels !== undefined ? ` • ${p.levels} Stufen` : ''} • {p.date})
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Averages Section */}
                          <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/40 border-white/5' : 'bg-black/5 border-black/5'}`}>
                            <h4 className="text-sm font-black uppercase mb-4 tracking-wider text-yellow-500 flex items-center">
                              <i className="fas fa-medal mr-2 text-amber-400"></i>Persönliche Bestwerte (Ø Abstand)
                            </h4>
                            <p className="text-[10px] opacity-50 mb-3 uppercase font-bold">Niedrigster Ø-Abstand zählt (Je niedriger desto besser)</p>
                            <div className="space-y-2">
                              {leaderboardAverages.slice(0, 10).map((p, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-black/10 border border-white/5 text-xs">
                                  <div className="flex items-center space-x-3">
                                    <span className="font-black text-xs opacity-50">#{idx + 1}</span>
                                    <span className="font-black">{p.name}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-black text-sm text-emerald-500">{p.avg.toFixed(2)}g</span>
                                    <span className="block text-[8px] opacity-40">
                                      {p.date}{activeRecordsTab === 'Speedwiegen' && p.levels !== undefined ? ` • ${p.levels} Stufen` : ''}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Points (Schnäpse) / Time Section */}
                          <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/40 border-white/5' : 'bg-black/5 border-black/5'}`}>
                            <h4 className="text-sm font-black uppercase mb-4 tracking-wider text-yellow-500 flex items-center">
                              <i className={activeRecordsTab === 'Speedwiegen' ? "fas fa-stopwatch mr-2 text-yellow-500" : "fas fa-crown mr-2 text-yellow-500"}></i>
                              {activeRecordsTab === 'Speedwiegen' ? 'Schnellste Zeiten' : 'Meiste Schnäpse in einem Spiel'}
                            </h4>
                            <p className="text-[10px] opacity-50 mb-3 uppercase font-bold font-bold">
                              {activeRecordsTab === 'Speedwiegen' ? 'Kürzeste benötigte Zeit' : 'Meiste erlangte Punkte / Schnäpse'}
                            </p>
                            <div className="space-y-2">
                              {pointsLeaderboard.map((p, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-black/10 border border-white/5 text-xs">
                                  <div className="flex items-center space-x-3">
                                    <span className="font-black text-xs opacity-50">#{idx + 1}</span>
                                    <span className="font-black">{p.playerName}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-black text-sm text-indigo-400">
                                      {activeRecordsTab === 'Speedwiegen' ? `${p.schnaepse.toFixed(1)}s` : `${p.schnaepse} Pkt`}
                                    </span>
                                    <span className="block text-[8px] opacity-40">
                                      {p.date}{activeRecordsTab === 'Speedwiegen' && p.levels !== undefined ? ` • ${p.levels} Stufen` : ''}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Complete Game History Log / Ranking im Speedwiegen */}
                      <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/40 border-white/5' : 'bg-black/5 border-black/5'}`}>
                        <h4 className="text-sm font-black uppercase mb-4 tracking-wider text-yellow-500 flex items-center">
                          <i className="fas fa-history mr-2 opacity-50"></i>
                          {activeRecordsTab === 'Speedwiegen' ? 'Ranking im Speedwiegen' : 'Historie der Einträge (Letzte Spiele)'}
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-gray-500/10 pb-2 uppercase opacity-60 font-bold">
                                <th className="pb-2">Datum</th>
                                <th className="pb-2">Spieler/Team</th>
                                <th className="pb-2">Ø-Abstand</th>
                                {activeRecordsTab === 'Speedwiegen' && <th className="pb-2">Stufen</th>}
                                <th className="pb-2 text-right">{activeRecordsTab === 'Speedwiegen' ? 'Zeit' : 'Punkte/Schnäpse'}</th>
                                {activeRecordsTab === 'Speedwiegen' && <th className="pb-2 text-right">Score</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const displayList = activeRecordsTab === 'Speedwiegen'
                                  ? [...filtered].sort((a, b) => (a.avg + a.schnaepse) - (b.avg + b.schnaepse))
                                  : filtered;
                                return displayList.slice(0, 50).map((item, idx) => (
                                  <tr key={idx} className="border-b border-gray-500/5 hover:bg-black/10">
                                    <td className="py-2 opacity-75 font-semibold">{item.date}</td>
                                    <td className="py-2 font-black">
                                      {activeRecordsTab === 'Standardspiel' ? (
                                        <button 
                                          onClick={() => setSelectedPlayerForDetails(item.playerName)}
                                          className="hover:underline text-left cursor-pointer hover:text-indigo-400 transition-colors inline-flex items-center group"
                                        >
                                          <span>{item.playerName}</span>
                                          <i className="fas fa-search-plus ml-1.5 text-[9px] opacity-0 group-hover:opacity-60 transition-opacity"></i>
                                        </button>
                                      ) : (
                                        item.playerName
                                      )}
                                    </td>
                                    <td className="py-2 text-emerald-500 font-bold">{item.avg.toFixed(2)}g</td>
                                    {activeRecordsTab === 'Speedwiegen' && (
                                      <td className="py-2 text-indigo-400 font-bold">
                                        {item.levels !== undefined ? `${item.levels} Stufen` : '-'}
                                      </td>
                                    )}
                                    <td className="py-2 text-right font-black text-indigo-400">
                                      {activeRecordsTab === 'Speedwiegen' ? `${item.schnaepse.toFixed(1)}s` : item.schnaepse}
                                    </td>
                                    {activeRecordsTab === 'Speedwiegen' && (
                                      <td className="py-2 text-right font-black text-purple-400">
                                        {(item.avg + item.schnaepse).toFixed(1)}
                                      </td>
                                    )}
                                  </tr>
                                ));
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <button 
              onClick={() => { setShowRecords(false); setRecordsData(null); }}
              className="mt-6 w-full py-4 rounded-xl font-black uppercase text-xs tracking-widest border border-gray-500/20 opacity-60 hover:opacity-100"
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {selectedPlayerForDetails && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className={`rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase tracking-tight" style={{ color: BRAND_COLOR }}>
                Historie: {selectedPlayerForDetails}
              </h3>
              <button 
                onClick={() => setSelectedPlayerForDetails(null)} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
              {(() => {
                const list = parseRecords(recordsData || []);
                let filteredList = [];
                if (standardspielSizeTab === '500ml') {
                  filteredList = list.filter(r => (r.gameMode === 'Standardspiel (500ml)' || r.gameMode === 'Standardspiel') && r.playerName === selectedPlayerForDetails);
                } else {
                  filteredList = list.filter(r => r.gameMode === 'Standardspiel (0,33L)' && r.playerName === selectedPlayerForDetails);
                }
                
                if (filteredList.length === 0) {
                  return <p className="text-center opacity-60 py-8 text-sm">Keine Spiele für diesen Modus aufgezeichnet.</p>;
                }
                
                return [...filteredList].reverse().map((item, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border flex justify-between items-center ${darkMode ? 'bg-slate-900/60 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <div>
                      <p className="font-bold text-sm">{item.date}</p>
                      <p className="text-[10px] opacity-60">
                        {item.gameMode}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-500 font-bold text-sm">Ø: {item.avg.toFixed(2)}g</p>
                      <p className="text-indigo-400 font-bold text-xs">{item.schnaepse} Pkt / Schnäpse</p>
                    </div>
                  </div>
                ));
              })()}
            </div>
            
            <button 
              onClick={() => setSelectedPlayerForDetails(null)} 
              className="mt-6 w-full py-4 rounded-xl font-bold uppercase text-xs tracking-wider text-white shadow-lg active:scale-95 transition-transform" 
              style={{ backgroundColor: BRAND_COLOR }}
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {showAdminOptionsModal && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className={`rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border-2 space-y-6 ${
            darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-4 border-gray-500/20">
              <h3 className="text-xl font-black uppercase flex items-center tracking-tight" style={{ color: BRAND_COLOR }}>
                <i className="fas fa-cog mr-3 text-xl"></i>
                <span>Optionen / Namen zusammenführen</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAdminOptionsModal(false)}
                className="text-lg opacity-50 hover:opacity-100 p-2 rounded-full focus:outline-none"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <p className="text-xs opacity-70 leading-relaxed">
              Führe zwei Spielernamen oder Teamnamen in allen bisher gespeicherten CSV-Einträgen zusammen. Alle Achievements und Statistiken von <strong>Alter Name</strong> werden auf <strong>Neuer Name</strong> übertragen.
            </p>

            {mergeMessage && (
              <div className={`p-3 rounded-xl border text-xs font-bold ${
                mergeMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-red-500/10 border-red-500/30 text-red-500'
              }`}>
                {mergeMessage.text}
              </div>
            )}

            {(() => {
              const allNamesFromRecords = new Set<string>();
              if (recordsData) {
                recordsData.slice(1).forEach(row => {
                  if (row && row[2] && row[2].trim()) {
                    allNamesFromRecords.add(row[2].trim());
                  }
                });
              }
              const sortedAllNames = Array.from(allNamesFromRecords).sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));

              return (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase opacity-60 mb-1">Alter Name (wird ersetzt):</label>
                    <select
                      value={mergeOldName}
                      onChange={e => setMergeOldName(e.target.value)}
                      className={`w-full p-3 rounded-xl border-2 text-xs font-bold ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    >
                      <option value="">-- Alter Name wählen --</option>
                      {sortedAllNames.map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase opacity-60 mb-1">Neuer Zielname:</label>
                    <input
                      type="text"
                      value={mergeNewName}
                      onChange={e => setMergeNewName(e.target.value)}
                      placeholder="Neuen oder bestehenden Namen eingeben..."
                      className={`w-full p-3 rounded-xl border-2 text-xs font-bold ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    />
                    <div className="mt-2 flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {sortedAllNames.map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setMergeNewName(n)}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-gray-500/20 hover:bg-gray-500/30 font-semibold"
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    {!showMergeConfirm ? (
                      <button
                        type="button"
                        disabled={!mergeOldName.trim() || !mergeNewName.trim() || mergeOldName.trim() === mergeNewName.trim()}
                        onClick={() => setShowMergeConfirm(true)}
                        className="w-full py-3.5 rounded-2xl text-white font-black shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ backgroundColor: BRAND_COLOR }}
                      >
                        Namen zusammenführen
                      </button>
                    ) : (
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                        <p className="text-xs font-bold text-amber-500 text-center">
                          Bist du sicher? Alle Einträge für "{mergeOldName}" werden in "{mergeNewName}" umbenannt.
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={mergeSubmitting}
                            onClick={async () => {
                              setMergeSubmitting(true);
                              setMergeMessage(null);
                              try {
                                const res = await fetch('/api/admin/rename', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ oldName: mergeOldName.trim(), newName: mergeNewName.trim() })
                                });
                                const json = await res.json();
                                if (res.ok) {
                                  setMergeMessage({ type: 'success', text: json.message || 'Erfolgreich zusammengeführt!' });
                                  setShowMergeConfirm(false);
                                  setMergeOldName('');
                                  setMergeNewName('');
                                  fetchRecords();
                                } else {
                                  setMergeMessage({ type: 'error', text: json.error || 'Fehler beim Zusammenführen.' });
                                }
                              } catch (err: any) {
                                setMergeMessage({ type: 'error', text: 'Netzwerkfehler.' });
                              } finally {
                                setMergeSubmitting(false);
                              }
                            }}
                            className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-black text-xs uppercase shadow-md flex items-center justify-center"
                          >
                            {mergeSubmitting ? <i className="fas fa-spinner animate-spin"></i> : 'Ja, Zusammenführen'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowMergeConfirm(false)}
                            className="px-4 py-3 rounded-xl border border-gray-500/30 text-xs font-bold"
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {showModeInfo && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`rounded-3xl p-8 max-w-sm w-full shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-xl font-black mb-4 text-center uppercase" style={{ color: BRAND_COLOR }}>0,33 L Modus</h3>
            <p className="text-sm opacity-80 mb-8 text-center leading-relaxed">Aktiviert diesen Modus, wenn ihr mit 0,33 Liter Gefäßen spielt. Das Mindest-Startgewicht beträgt hier 333g und die Ausscheide-Grenzen sind entsprechend angepasst.</p>
            <button onClick={() => setShowModeInfo(false)} className="w-full text-white font-bold py-4 rounded-xl shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>Verstanden</button>
          </div>
        </div>
      )}

      {showTournamentInfo && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`rounded-3xl p-8 max-w-sm w-full shadow-2xl ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}>
            <h3 className="text-xl font-black mb-4 text-center uppercase" style={{ color: BRAND_COLOR }}>Turnier Modus</h3>
            <p className="text-sm opacity-80 mb-8 text-center leading-relaxed">
              Im Turnier-Modus scheidet ein Spieler aus, wenn sein Abstand in einer Runde zum Zielgewicht 50g oder Höher ist.<br/><br/>
              Ist der Turniermodus deaktiviert, so können Spieler nicht ausscheiden, egal wie groß der Abstand ist.
            </p>
            <button onClick={() => setShowTournamentInfo(false)} className="w-full text-white font-bold py-4 rounded-xl shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>Verstanden</button>
          </div>
        </div>
      )}

      {showSpeedKlassischModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className={`rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border-2 space-y-6 ${
            darkMode ? 'bg-slate-900 border-yellow-500/30 text-white' : 'bg-white border-yellow-500/30 text-gray-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-4 border-yellow-500/20">
              <h3 className="text-xl font-black uppercase flex items-center tracking-tight text-[#D4AF37]">
                <i className="fas fa-crown mr-2.5"></i>
                <span>Speedwiegen Klassisch</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSpeedKlassischModal(false)}
                className="text-lg opacity-50 hover:opacity-100 p-2 rounded-full focus:outline-none"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-semibold opacity-80 leading-relaxed">
                Das klassische Speedwiegen mit {Object.keys(KLASSISCH_TARGETS).length} vordefinierten Stufen:
              </p>

              <div className={`p-4 rounded-2xl border space-y-1.5 ${darkMode ? 'bg-black/30 border-white/10' : 'bg-black/5 border-black/10'}`}>
                <span className="text-[10px] uppercase font-black opacity-50 block mb-2">Die {Object.keys(KLASSISCH_TARGETS).length} klassischen Zielgewichte:</span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono font-bold">
                  {Object.entries(KLASSISCH_TARGETS).map(([lvl, target]) => (
                    <div key={lvl}>Stufe {lvl}: {target}g</div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase opacity-60 mb-1">Spieler Name:</label>
                <input
                  type="text"
                  value={speedPlayerName}
                  onChange={e => setSpeedPlayerName(e.target.value)}
                  placeholder="Dein Name"
                  className={`w-full p-3 rounded-xl border-2 text-xs font-bold ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSpeedKlassischModal(false)}
                className="flex-1 py-3.5 rounded-2xl border border-gray-500/30 text-xs font-bold uppercase tracking-wider hover:bg-black/10 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!speedPlayerName.trim()) {
                    alert("Bitte zuerst deinen Namen eingeben.");
                    return;
                  }
                  setSpeedLevels(Object.keys(KLASSISCH_TARGETS).length.toString());
                  setSpeedIsShortMode(false);
                  setSpeedTargets({ ...KLASSISCH_TARGETS });
                  setSpeedResults({});
                  setShowSpeedKlassischModal(false);
                  startSpeedCountdown();
                }}
                className="flex-1 py-3.5 rounded-2xl text-white font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                style={{ backgroundColor: '#D4AF37' }}
              >
                Start
              </button>
            </div>
          </div>
        </div>
      )}

      {showRules && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className={`rounded-3xl p-8 max-w-lg w-full shadow-2xl ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}>
            <h3 className="text-2xl font-black mb-6 text-center uppercase" style={{ color: BRAND_COLOR }}>Die Regeln</h3>
            <div className="space-y-4 text-sm opacity-90 mb-8 max-h-[60vh] overflow-y-auto pr-2">
              <p><strong>1. Spielprinzip:</strong> Ziel ist es, in jeder Runde das vorgegebene Zielgewicht möglichst genau zu treffen.</p>
              <p><strong>2. Zielgewicht:</strong> Es muss unter dem niedrigsten Füllstand liegen und darf maximal 100g unter dem höchsten liegen.</p>
              <p><strong>3. Ausscheiden:</strong> {tournamentMode ? 'Wer 50g oder mehr vom Zielgewicht abweicht, ist sofort ausgeschieden (💀).' : 'Deaktiviert (Kein Ausscheiden in diesem Spiel).'}</p>
              <p><strong>4. Punkte (Schnäpse):</strong>
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li><strong>Der Letzte:</strong> Der Spieler, der am weitesten vom Ziel weg ist {tournamentMode ? '(aber &le; 50g)' : ''}, bekommt einen Punkt.</li>
                  <li><strong>Volltreffer:</strong> Exaktes Treffen des Ziels gibt einen Punkt.</li>
                  <li><strong>Schnappszahl:</strong> Treffen einer Schnappszahl (z.B. 111g, 222g) gibt einen Punkt.</li>
                  <li><strong>Wiegezwillinge:</strong> Haben zwei Spieler das gleiche Gewicht, bekommen beide einen Punkt.</li>
                </ul>
              </p>
              <p><strong>5. Das Finale:</strong> Erreicht ein Spieler den Schwellenwert, wird das Finale ausgelöst. Alle trinken leer und schätzen ihr Leergewicht.</p>
            </div>
            <button onClick={() => setShowRules(false)} className="w-full text-white font-bold py-4 rounded-xl shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>Alles klar!</button>
          </div>
        </div>
      )}

      {/* Tournament Overview Modal */}
      {showTournamentOverview && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className={`rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl border flex flex-col max-h-[85vh] ${
            darkMode ? 'bg-slate-900 border-[#238183]/30 text-white' : 'bg-white border-[#238183]/30 text-gray-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-4 border-[#238183]/20 mb-6">
              <h3 className="text-2xl font-black uppercase flex items-center tracking-tight text-[#238183]">
                <i className="fas fa-trophy mr-3 text-amber-400"></i>
                <span>Turniere</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowTournamentOverview(false)}
                className="text-lg opacity-50 hover:opacity-100 p-2 rounded-full focus:outline-none"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {isSignedIn && (
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setNewTournamentName('');
                    setNewTournamentTableCount(0);
                    setTableCountError(null);
                    setCreateTournamentError(null);
                    setShowCreateTournamentModal(true);
                  }}
                  className="w-full py-4 rounded-2xl text-white font-black text-sm uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center space-x-2"
                  style={{ backgroundColor: '#238183' }}
                >
                  <i className="fas fa-plus"></i>
                  <span>Neues Turnier erstellen</span>
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {tournamentsLoading ? (
                <div className="p-8 text-center opacity-60">
                  <i className="fas fa-spinner animate-spin text-2xl mb-2"></i>
                  <p className="text-xs font-bold">Turniere werden geladen...</p>
                </div>
              ) : tournamentsList.length === 0 ? (
                <div className="p-8 text-center opacity-50 border border-dashed rounded-2xl">
                  <i className="fas fa-trophy text-4xl mb-3 block opacity-30"></i>
                  <p className="font-bold text-sm">Noch keine Turniere vorhanden</p>
                  <p className="text-xs mt-1">Erstelle ein neues Turnier, um Tische und Vorrunden zu verwalten.</p>
                </div>
              ) : (
                tournamentsList.map(t => {
                  const statusColors: Record<string, string> = {
                    'In Vorbereitung': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
                    'Vorrunde läuft': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                    'Vorrunde beendet': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
                    'Second Chance': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                    'Finale': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
                    'Beendet': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  };
                  const badgeClass = statusColors[t.status] || statusColors['In Vorbereitung'];

                  return (
                    <div
                      key={t.filename || t.name}
                      onClick={() => openTournamentDetail(t.name)}
                      className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${
                        darkMode ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-base">{t.name}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`}>
                            {t.status}
                          </span>
                        </div>
                        <div className="text-xs opacity-60 flex items-center space-x-3">
                          <span>📅 {t.createdDate}</span>
                          <span>🪑 {t.tablesCount} {t.tablesCount === 1 ? 'Tisch' : 'Tische'}</span>
                          <span>🏆 {t.finalistsCount} Finalisten</span>
                          {t.hasSecondChance && <span>🔄 Second Chance</span>}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDeleteModal(t.name);
                            }}
                            className="p-2 rounded-xl text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                            title="Turnier löschen"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        )}
                        <i className="fas fa-chevron-right text-xs opacity-40"></i>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-4 border-t border-gray-500/20 mt-4">
              <button
                type="button"
                onClick={() => setShowTournamentOverview(false)}
                className="w-full py-3.5 rounded-2xl text-white font-black text-xs uppercase tracking-wider shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                style={{ backgroundColor: '#238183' }}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Tournament Modal */}
      {showCreateTournamentModal && (
        <div className="fixed inset-0 z-[650] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className={`w-full md:max-w-lg rounded-t-3xl md:rounded-3xl flex flex-col max-h-[92dvh] md:max-h-[90vh] shadow-2xl border-t-2 md:border-2 ${
            darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-[#238183]/20 flex-shrink-0">
              <h3 className="text-xl font-black uppercase flex items-center tracking-tight text-[#238183]">
                <i className="fas fa-trophy mr-2.5 text-amber-400"></i>
                <span>Neues Turnier</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateTournamentModal(false)}
                className="text-lg opacity-50 hover:opacity-100 p-2 rounded-full focus:outline-none cursor-pointer"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Scrollbarer Inhalt */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 overscroll-contain">
              {createTournamentError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold text-center">
                  {createTournamentError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase opacity-70 mb-1">Turniername</label>
                  <input
                    type="text"
                    value={newTournamentName}
                    onChange={e => setNewTournamentName(e.target.value)}
                    placeholder="z.B. Sommercup 2026"
                    className={`w-full p-3.5 rounded-xl border-2 text-sm font-bold ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase opacity-70 mb-1">Anzahl Tische (Vorrunde)</label>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    value={newTournamentTableCount === 0 ? '' : newTournamentTableCount}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '') {
                        setNewTournamentTableCount(0);
                        setTableCountError(null);
                        return;
                      }
                      const num = parseInt(val);
                      setNewTournamentTableCount(num);
                      if (num < 2) {
                        setTableCountError('Mindestanzahl ist 2 Tische.');
                      } else if (num > 10) {
                        setTableCountError('Maximalanzahl ist 10 Tische.');
                      } else {
                        setTableCountError(null);
                      }
                    }}
                    placeholder="z.B. 3"
                    className={`w-full p-4 rounded-xl border-2 bg-transparent font-bold text-center text-lg ${
                      tableCountError
                        ? 'border-red-500'
                        : newTournamentTableCount >= 2 && newTournamentTableCount <= 10
                          ? 'border-emerald-500'
                          : darkMode ? 'border-white/20' : 'border-black/20'
                    }`}
                  />
                  {tableCountError && (
                    <p className="text-xs font-bold text-red-500 mt-1 flex items-center space-x-1">
                      <i className="fas fa-exclamation-circle"></i>
                      <span>{tableCountError}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase opacity-70 mb-1">
                    Qualifikation Vorrunde
                  </label>
                  <p className="text-xs font-semibold mb-1.5 opacity-90">
                    Wie viele Plätze pro Vorrundentisch qualifizieren sich fürs Finale?
                  </p>
                  <select
                    value={newTournamentQualiVorrunde}
                    onChange={e => setNewTournamentQualiVorrunde(parseInt(e.target.value) || 1)}
                    className={`w-full p-3.5 rounded-xl border-2 text-sm font-bold ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value={1}>1 Platz pro Tisch</option>
                    <option value={2}>2 Plätze pro Tisch</option>
                    <option value={3}>3 Plätze pro Tisch</option>
                  </select>
                  <p className="text-[11px] font-semibold text-[#238183] mt-1.5">
                    Bei {newTournamentTableCount || 0} {newTournamentTableCount === 1 ? 'Tisch' : 'Tischen'} und {newTournamentQualiVorrunde} {newTournamentQualiVorrunde === 1 ? 'Qualifikationsplatz' : 'Qualifikationsplätzen'} stehen {(newTournamentTableCount || 0) * newTournamentQualiVorrunde} Spieler {newTournamentSecondChance ? 'direkt ' : ''}im Finale.
                  </p>
                </div>

                <div className="pt-2 border-t border-[#238183]/20 space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="hasSecondChanceCheck"
                      checked={newTournamentSecondChance}
                      onChange={e => setNewTournamentSecondChance(e.target.checked)}
                      className="w-5 h-5 rounded accent-[#238183] cursor-pointer"
                    />
                    <label htmlFor="hasSecondChanceCheck" className="text-xs font-bold cursor-pointer select-none">
                      Second Chance Tisch aktivieren
                    </label>
                  </div>

                  {newTournamentSecondChance && (
                    <div className="p-3.5 rounded-xl bg-[#238183]/10 border border-[#238183]/20 space-y-2 text-xs">
                      <p className="opacity-90 leading-relaxed">
                        Im Second Chance Tisch spielen alle Spieler, die in der Vorrunde nicht direkt qualifiziert wurden (also alle ab Platz {newTournamentQualiVorrunde + 1} jedes Vorrundentisches).
                      </p>
                      <div className="pt-1">
                        <label className="block font-bold uppercase text-[10px] opacity-70 mb-1">
                          Qualifikation Second Chance
                        </label>
                        <p className="font-semibold mb-1">
                          Wie viele Plätze aus dem Second Chance Tisch qualifizieren sich noch fürs Finale?
                        </p>
                        <select
                          value={newTournamentQualiSecondChance}
                          onChange={e => setNewTournamentQualiSecondChance(parseInt(e.target.value) || 1)}
                          className={`w-full p-2.5 rounded-lg border text-xs font-bold ${
                            darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        >
                          <option value={1}>1 Platz aus Second Chance</option>
                          <option value={2}>2 Plätze aus Second Chance</option>
                        </select>
                        <p className="text-[11px] font-semibold text-[#238183] mt-1.5">
                          {newTournamentQualiSecondChance === 1
                            ? '1 weiterer Spieler zieht aus dem Second Chance ins Finale ein.'
                            : `${newTournamentQualiSecondChance} weitere Spieler ziehen aus dem Second Chance ins Finale ein.`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 p-6 pt-4 border-t border-[#238183]/20 flex gap-3">
              <button
                type="button"
                onClick={() => setShowCreateTournamentModal(false)}
                className={`flex-1 py-3.5 rounded-2xl font-bold border text-xs uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'border-gray-700 hover:bg-white/5 text-gray-300' : 'border-gray-300 hover:bg-black/5 text-gray-700'
                }`}
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={!newTournamentTableCount || newTournamentTableCount < 2 || newTournamentTableCount > 10 || !newTournamentName.trim() || createTournamentSubmitting}
                onClick={handleCreateTournamentSubmit}
                className="flex-1 py-3.5 rounded-2xl text-white font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#238183' }}
              >
                {createTournamentSubmitting ? (
                  <i className="fas fa-spinner animate-spin"></i>
                ) : (
                  <span>Erstellen</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tournament Detail Modal */}
      {showTournamentDetailModal && (
        <div className="fixed inset-0 z-[600] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className={`w-full md:max-w-3xl rounded-t-3xl md:rounded-3xl flex flex-col max-h-[92dvh] md:max-h-[90vh] shadow-2xl border-t-2 md:border-2 ${
            darkMode ? 'bg-slate-900 border-[#238183]/30 text-white' : 'bg-white border-[#238183]/30 text-gray-900'
          }`}>
            <div className="flex items-center justify-between p-6 pb-4 border-b border-[#238183]/20 flex-shrink-0">
              <div>
                <h3 className="text-xl md:text-2xl font-black uppercase flex items-center tracking-tight text-[#238183]">
                  <i className="fas fa-trophy mr-2.5 text-amber-400"></i>
                  <span>{activeTournamentData?.config?.name || selectedTournamentName}</span>
                </h3>
                {activeTournamentData?.config && (
                  <div className="text-xs opacity-60 mt-1">
                    {activeTournamentData.config.tablesCount} Vorrunden-Tische | Qualifikation: {activeTournamentData.config.qualifikationVorrunde || 1} pro Tisch | {activeTournamentData.config.finalistsCount} Finalisten
                    {activeTournamentData.config.hasSecondChance ? ` | Second Chance (+${activeTournamentData.config.qualifikationSecondChance || 1})` : ''}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => loadTournamentStandings()}
                  className="px-3.5 py-2 rounded-xl text-white font-black text-xs uppercase tracking-wider flex items-center space-x-1.5 shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                  style={{ backgroundColor: '#238183' }}
                >
                  <i className="fas fa-list-ol"></i>
                  <span className="hidden sm:inline">Spielstand</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowTournamentDetailModal(false)}
                  className="text-lg opacity-50 hover:opacity-100 p-2 rounded-full focus:outline-none cursor-pointer"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            {tournamentDetailLoading ? (
              <div className="p-12 text-center opacity-60 flex-1 flex flex-col items-center justify-center">
                <i className="fas fa-spinner animate-spin text-3xl mb-3 text-[#238183]"></i>
                <p className="text-sm font-bold">Turnierdetails werden geladen...</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-6 overscroll-contain">
                {/* Teilnehmer hinzufügen und mischen Button */}
                {(() => {
                  const isAnyTablePlayed = (activeTournamentData?.results && activeTournamentData.results.length > 0) ||
                    (activeTournamentData?.tables && activeTournamentData.tables.some((t: any) => t.status === 'Abgeschlossen'));

                  return (
                    <button
                      type="button"
                      disabled={isAnyTablePlayed}
                      onClick={openParticipantsModal}
                      className={`w-full py-4 px-6 rounded-2xl text-white font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center space-x-2 transition-all ${
                        isAnyTablePlayed
                          ? 'opacity-50 cursor-not-allowed bg-gray-600'
                          : 'hover:brightness-110 active:scale-95 cursor-pointer'
                      }`}
                      style={{ backgroundColor: isAnyTablePlayed ? undefined : '#238183' }}
                    >
                      <i className="fas fa-users text-lg"></i>
                      <span>Teilnehmer hinzufügen und mischen</span>
                    </button>
                  );
                })()}

                {/* Qualified Finalists Overview */}
                {(() => {
                  const qVorrunde = activeTournamentData?.config?.qualifikationVorrunde || 1;
                  const qSecondChance = activeTournamentData?.config?.qualifikationSecondChance || 1;
                  const allResults = activeTournamentData?.results || [];
                  const allTables = activeTournamentData?.tables || [];
                  const vorrundeTables = allTables.filter((t: any) => t.id.startsWith("table_") && t.id !== "table_second_chance" && t.id !== "table_final");
                  const scTable = allTables.find((t: any) => t.id === "table_second_chance");

                  const qualifiedFinalists: Array<{ name: string; origin: string; rank: number }> = [];

                  vorrundeTables.forEach((vt: any) => {
                    const vtResults = allResults.filter((r: any) => r.tableId === vt.id).sort((a: any, b: any) => a.rank - b.rank);
                    vtResults.forEach((r: any) => {
                      if (r.rank <= qVorrunde) {
                        qualifiedFinalists.push({ name: r.playerName, origin: vt.name, rank: r.rank });
                      }
                    });
                  });

                  if (scTable) {
                    const scResults = allResults.filter((r: any) => r.tableId === scTable.id).sort((a: any, b: any) => a.rank - b.rank);
                    scResults.forEach((r: any) => {
                      if (r.rank <= qSecondChance) {
                        qualifiedFinalists.push({ name: r.playerName, origin: scTable.name, rank: r.rank });
                      }
                    });
                  }

                  if (qualifiedFinalists.length === 0) return null;

                  return (
                    <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-[#238183]/10 border-[#238183]/30' : 'bg-[#238183]/5 border-[#238183]/20'}`}>
                      <h4 className="font-black text-xs uppercase tracking-wider text-[#238183] mb-2.5 flex items-center space-x-2">
                        <i className="fas fa-crown text-amber-400"></i>
                        <span>Qualifizierte Finalisten ({qualifiedFinalists.length} / {activeTournamentData?.config?.finalistsCount})</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {qualifiedFinalists.map((f, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                            <span className="flex items-center space-x-1.5">
                              <span>👑</span>
                              <span>{f.name}</span>
                            </span>
                            <span className="opacity-70 text-[10px] font-mono">({f.origin}, Platz {f.rank})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeTournamentData?.tables?.map((tbl: any, idx: number) => {
                    const isLocked = tbl.status === 'Gesperrt';
                    const isDone = tbl.status === 'Abgeschlossen';
                    const isOpen = tbl.status === 'Offen';

                    const tblColor = tbl.color || (
                      tbl.id === 'table_second_chance' ? '#F59E0B' :
                      tbl.id === 'table_final' ? '#D4AF37' :
                      TOURNAMENT_TABLE_COLORS[idx % TOURNAMENT_TABLE_COLORS.length]
                    );

                    let cardBorder = 'border-gray-500/20';
                    if (isDone) cardBorder = 'border-emerald-500/40 bg-emerald-500/5';
                    else if (isOpen) cardBorder = 'border-[#238183]/40 bg-[#238183]/5';
                    else if (isLocked) cardBorder = 'border-gray-500/20 opacity-60';

                    const qVorrunde = activeTournamentData?.config?.qualifikationVorrunde || 1;
                    const qSecondChance = activeTournamentData?.config?.qualifikationSecondChance || 1;
                    const tblResults = activeTournamentData?.results?.filter((r: any) => r.tableId === tbl.id).sort((a: any, b: any) => a.rank - b.rank) || [];

                    return (
                      <div
                        key={tbl.id}
                        className={`p-5 rounded-2xl border border-l-4 flex flex-col justify-between space-y-4 ${cardBorder} ${
                          darkMode ? 'bg-slate-800/50' : 'bg-gray-50'
                        }`}
                        style={{ borderLeftColor: tblColor }}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-black text-lg flex items-center space-x-2">
                              <span
                                className="px-3 py-1 rounded-full text-white text-xs font-black shadow-sm"
                                style={{ backgroundColor: tblColor }}
                              >
                                {tbl.name}
                              </span>
                            </h4>

                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              isDone ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                              isOpen ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                              'bg-gray-500/20 text-gray-400 border-gray-500/30'
                            }`}>
                              {tbl.status}
                            </span>
                          </div>

                          {/* Standings & Qualification badges per table type */}
                          {tblResults.length > 0 ? (
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">Ergebnisse & Qualifikation:</span>
                              {tblResults.map((r: any) => {
                                const isQualified = tbl.id === 'table_second_chance'
                                  ? r.rank <= qSecondChance
                                  : tbl.id === 'table_final'
                                  ? true
                                  : r.rank <= qVorrunde;

                                return (
                                  <div
                                    key={r.playerName}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between border ${
                                      tbl.id === 'table_final'
                                        ? r.rank === 1
                                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                                          : 'bg-black/10 dark:bg-white/10 border-gray-500/20'
                                        : isQualified
                                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                        : 'bg-gray-500/10 border-gray-500/20 text-gray-400 opacity-70'
                                    }`}
                                  >
                                    <span>
                                      {tbl.id === 'table_final' && r.rank === 1 ? '👑 1. Platz' : `Platz ${r.rank}`}: {r.playerName}
                                    </span>
                                    {tbl.id === 'table_final' ? (
                                      <span className="text-[10px] opacity-60 font-mono">Ø {r.avg.toFixed(1)}g</span>
                                    ) : isQualified ? (
                                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 font-black">
                                        Qualifiziert 🟢
                                      </span>
                                    ) : (
                                      <span className="text-[10px] opacity-60">
                                        {tbl.id === 'table_second_chance' ? 'Ausschieden' : activeTournamentData?.config?.hasSecondChance ? 'Second Chance' : 'Ausschieden'}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : tbl.players && tbl.players.length > 0 ? (
                            <div className="text-xs space-y-1.5">
                              <span className="font-bold opacity-60">
                                {tbl.id === 'table_second_chance'
                                  ? `Spielberechtigt (ab Platz ${qVorrunde + 1} der Vorrunden):`
                                  : tbl.id === 'table_final'
                                  ? 'Finalisten:'
                                  : 'Teilnehmer:'}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {tbl.players.map((p: string, pIdx: number) => (
                                  <span key={pIdx} className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                    tbl.id === 'table_final'
                                      ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300'
                                      : tbl.id === 'table_second_chance'
                                      ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                                      : 'bg-black/10 dark:bg-white/10 font-mono'
                                  }`}>
                                    {tbl.id === 'table_final' ? `👑 ${p}` : p}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs opacity-50 italic">Noch keine Teilnehmer festgelegt.</p>
                          )}

                          {isDone && tbl.winner && (
                            <div className="text-xs font-bold text-amber-500 flex items-center space-x-1 pt-1">
                              <i className="fas fa-trophy"></i>
                              <span>Sieger: {tbl.winner}</span>
                            </div>
                          )}
                        </div>

                        {isDone ? (
                          <button
                            type="button"
                            disabled
                            style={{ backgroundColor: tblColor }}
                            className="w-full py-3.5 px-4 rounded-2xl text-white font-black text-xs uppercase tracking-wider flex items-center justify-between cursor-default opacity-50 filter grayscale-[30%] shadow-md"
                          >
                            <span>{tbl.name}</span>
                            <span className="flex items-center space-x-1">✅ Abgeschlossen</span>
                          </button>
                        ) : isLocked ? (
                          <button
                            type="button"
                            disabled
                            style={{ backgroundColor: '#6B7280' }}
                            className="w-full py-3.5 px-4 rounded-2xl text-white font-black text-xs uppercase tracking-wider flex items-center justify-between cursor-not-allowed opacity-80 shadow-md"
                          >
                            <span>{tbl.name}</span>
                            <span className="flex items-center space-x-1">🔒 Gesperrt</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startTournamentTable(tbl)}
                            style={{ backgroundColor: tblColor }}
                            className="w-full py-3.5 px-4 rounded-2xl text-white font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-xl hover:brightness-110 active:scale-95 cursor-pointer"
                          >
                            <i className="fas fa-play mr-1.5"></i>
                            <span>Tisch starten</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-500/20">
              <button
                type="button"
                onClick={() => setShowTournamentDetailModal(false)}
                className="w-full py-3.5 rounded-2xl text-white font-black text-xs uppercase tracking-wider shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                style={{ backgroundColor: '#238183' }}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standings Modal */}
      {showTournamentStandings && (
        <div className="fixed inset-0 z-[650] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className={`w-full md:max-w-2xl rounded-t-3xl md:rounded-3xl flex flex-col max-h-[92dvh] md:max-h-[90vh] shadow-2xl border-t-2 md:border-2 ${
            darkMode ? 'bg-slate-900 border-[#238183]/30 text-white' : 'bg-white border-[#238183]/30 text-gray-900'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-[#238183]/20 flex-shrink-0">
              <div>
                <h3 className="text-xl font-black uppercase flex items-center tracking-tight text-[#238183]">
                  <i className="fas fa-list-ol mr-2.5"></i>
                  <span>Aktueller Spielstand</span>
                </h3>
                <p className="text-xs font-semibold opacity-60 mt-0.5">
                  {tournamentStandingsData?.config?.name || selectedTournamentName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTournamentStandings(false)}
                className="text-lg opacity-50 hover:opacity-100 p-2 rounded-full focus:outline-none cursor-pointer"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Body */}
            {tournamentStandingsLoading ? (
              <div className="p-12 text-center flex flex-col items-center justify-center flex-1 opacity-60">
                <i className="fas fa-spinner animate-spin text-3xl mb-3 text-[#238183]"></i>
                <p className="text-xs font-bold opacity-70">Spielstand wird geladen...</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-4 overscroll-contain">
                {/* Tables List */}
                {tournamentStandingsData?.tables?.map((tbl: any, idx: number) => {
                  const tblColor = tbl.color || (
                    tbl.id === 'table_second_chance' ? '#F59E0B' :
                    tbl.id === 'table_final' ? '#D4AF37' :
                    TOURNAMENT_TABLE_COLORS[idx % TOURNAMENT_TABLE_COLORS.length]
                  );
                  const isDone = tbl.status === 'Abgeschlossen';
                  const tblResults = tournamentStandingsData?.results?.filter((r: any) => r.tableId === tbl.id).sort((a: any, b: any) => a.rank - b.rank) || [];

                  const config = tournamentStandingsData?.config || {};
                  const qVorrunde = config.qualifikationVorrunde || 1;
                  const qSecondChance = config.qualifikationSecondChance || 1;
                  const isVorrunde = tbl.id.startsWith('table_') && tbl.id !== 'table_second_chance' && tbl.id !== 'table_final';
                  const isSecondChance = tbl.id === 'table_second_chance';
                  const isFinal = tbl.id === 'table_final';

                  return (
                    <div
                      key={tbl.id}
                      className={`p-4 rounded-2xl border-l-4 shadow-sm border ${
                        darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-gray-50 border-gray-200'
                      }`}
                      style={{ borderLeftColor: tblColor }}
                    >
                      {/* Table Header */}
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-500/15">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">{isDone ? '✅' : '⏳'}</span>
                          <span
                            className="px-3 py-1 rounded-full text-white text-xs font-black shadow-sm"
                            style={{ backgroundColor: tblColor }}
                          >
                            {tbl.name}
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                          isDone ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                          tbl.status === 'Offen' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                          'bg-gray-500/20 text-gray-400 border-gray-500/30'
                        }`}>
                          {isDone ? 'Abgeschlossen' : 'Noch nicht gespielt'}
                        </span>
                      </div>

                      {/* Results */}
                      {isDone ? (
                        <div className="space-y-2">
                          {tblResults.length > 0 ? (
                            tblResults.map((r: any) => {
                              const total = (r.avg + r.schnaepse).toFixed(1);
                              let badge = null;

                              if (isVorrunde) {
                                if (r.rank <= qVorrunde) {
                                  badge = (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center space-x-1">
                                      <span>✈️</span> <span>Qualifiziert</span>
                                    </span>
                                  );
                                } else if (config.hasSecondChance) {
                                  badge = (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center space-x-1">
                                      <span>🔄</span> <span>Second Chance</span>
                                    </span>
                                  );
                                }
                              } else if (isSecondChance) {
                                if (r.rank <= qSecondChance) {
                                  badge = (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center space-x-1">
                                      <span>✈️</span> <span>Qualifiziert</span>
                                    </span>
                                  );
                                } else {
                                  badge = (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-red-500/20 text-red-500 border border-red-500/30 flex items-center space-x-1">
                                      <span>❌</span> <span>Ausgeschieden</span>
                                    </span>
                                  );
                                }
                              } else if (isFinal) {
                                if (r.rank === 1) {
                                  badge = (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center space-x-1">
                                      <span>👑</span> <span>Sieger</span>
                                    </span>
                                  );
                                }
                              }

                              return (
                                <div
                                  key={r.playerName}
                                  className="flex flex-wrap items-center justify-between text-xs font-bold p-2.5 rounded-xl bg-black/10 dark:bg-white/5 gap-2"
                                >
                                  <div className="flex items-center space-x-3">
                                    <span className="opacity-60 min-w-[20px]">#{r.rank}</span>
                                    <span className="font-black text-sm">{r.playerName}</span>
                                  </div>
                                  <div className="flex items-center space-x-3 font-mono text-[11px]">
                                    <span className="opacity-80">Ø {r.avg.toFixed(1)}g</span>
                                    <span className="opacity-80">{r.schnaepse} Pkt</span>
                                    <span className="font-black text-[#238183]">Total: {total}</span>
                                    {badge}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs font-bold opacity-50 italic">Keine Einzelergebnisse hinterlegt</p>
                          )}
                          {isSecondChance && (() => {
                            const scOuts = tournamentStandingsData?.outPlayers?.filter((o: any) => o.tableId === 'table_second_chance' || o.tableId === 'SecondChance') || [];
                            if (scOuts.length === 0) return null;
                            return (
                              <div className="mt-3 pt-2.5 border-t border-gray-500/15 space-y-1.5">
                                <p className="text-[11px] font-bold text-red-400 uppercase tracking-wider flex items-center space-x-1">
                                  <span>Freiwillig ausgeschieden:</span>
                                </p>
                                {scOuts.map((outP: any) => (
                                  <div key={outP.playerName} className="flex items-center justify-between text-xs font-semibold p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                                    <span className="flex items-center space-x-1.5">
                                      <span>❌</span>
                                      <span className="font-bold">{outP.playerName}</span>
                                    </span>
                                    <span className="text-[10px] opacity-75 italic">(hat auf Second Chance verzichtet)</span>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <p className="text-xs font-bold opacity-60 italic py-1">
                          ⏳ Noch nicht gespielt
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Finalists Overview Section */}
                {(() => {
                  const config = tournamentStandingsData?.config || {};
                  const qVorrunde = config.qualifikationVorrunde || 1;
                  const qSecondChance = config.qualifikationSecondChance || 1;
                  const finalists: { playerName: string; tableName: string; rank: number }[] = [];

                  const vorrundeTables = tournamentStandingsData?.tables?.filter((t: any) => t.id.startsWith('table_') && t.id !== 'table_second_chance' && t.id !== 'table_final') || [];
                  vorrundeTables.forEach((vt: any) => {
                    if (vt.status === 'Abgeschlossen' || vt.status === 'gespielt') {
                      const vtResults = tournamentStandingsData?.results?.filter((r: any) => r.tableId === vt.id).sort((a: any, b: any) => a.rank - b.rank) || [];
                      vtResults.forEach((r: any) => {
                        if (r.rank <= qVorrunde) {
                          finalists.push({
                            playerName: r.playerName,
                            tableName: vt.name,
                            rank: r.rank
                          });
                        }
                      });
                    }
                  });

                  const scTable = tournamentStandingsData?.tables?.find((t: any) => t.id === 'table_second_chance');
                  if (scTable && (scTable.status === 'Abgeschlossen' || scTable.status === 'gespielt')) {
                    const scResults = tournamentStandingsData?.results?.filter((r: any) => r.tableId === scTable.id).sort((a: any, b: any) => a.rank - b.rank) || [];
                    scResults.forEach((r: any) => {
                      if (r.rank <= qSecondChance) {
                        finalists.push({
                          playerName: r.playerName,
                          tableName: scTable.name,
                          rank: r.rank
                        });
                      }
                    });
                  }

                  const totalFinalistsCount = config.finalistsCount || (config.tablesCount * qVorrunde + (config.hasSecondChance ? qSecondChance : 0));
                  const openSpots = Math.max(0, totalFinalistsCount - finalists.length);
                  const allFinalistsDecided = finalists.length > 0 && finalists.length === totalFinalistsCount;

                  return (
                    <div className={`p-4 rounded-2xl border space-y-3 ${
                      darkMode ? 'bg-slate-800/80 border-[#238183]/30' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between border-b pb-2 border-gray-500/20">
                        <h4 className="font-black text-xs uppercase tracking-wider text-[#238183] flex items-center">
                          <i className="fas fa-trophy text-amber-400 mr-2"></i>
                          <span>Finalisten</span>
                        </h4>
                        <span className="text-[11px] font-bold opacity-60">
                          ({finalists.length} / {totalFinalistsCount})
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {finalists.map((f, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs font-bold p-2.5 rounded-xl bg-black/10 dark:bg-white/5">
                            <span className="flex items-center space-x-1.5">
                              <span className="text-emerald-500">✈️</span>
                              <span className="font-black">{f.playerName}</span>
                            </span>
                            <span className="text-[11px] opacity-60 font-semibold">
                              ({f.tableName} · Platz {f.rank})
                            </span>
                          </div>
                        ))}

                        {allFinalistsDecided ? (
                          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-center text-xs font-black flex items-center justify-center space-x-2 mt-2">
                            <span>🏆</span>
                            <span>Alle {totalFinalistsCount} Finalisten stehen fest → Finaltisch kann gestartet werden!</span>
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl border border-dashed border-gray-500/30 text-center text-xs font-bold opacity-70 mt-2">
                            [{finalists.length} / {totalFinalistsCount}] Finalisten stehen fest · [{openSpots}] {openSpots === 1 ? 'Platz' : 'Plätze'} noch offen
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-500/20">
              <button
                type="button"
                onClick={() => setShowTournamentStandings(false)}
                className="w-full py-3.5 rounded-2xl text-white font-black text-xs uppercase tracking-wider shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                style={{ backgroundColor: '#238183' }}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Tournament Delete Modal */}
      {showDeleteTournamentModal && (
        <div className="fixed inset-0 z-[700] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className={`w-full md:max-w-md rounded-t-3xl md:rounded-3xl flex flex-col max-h-[92dvh] md:max-h-[90vh] shadow-2xl border-t-2 md:border-2 ${
            darkMode ? 'bg-slate-900 border-red-500/30 text-white' : 'bg-white border-red-500/30 text-gray-900'
          }`}>
            <div className="flex items-center justify-between p-6 pb-4 border-b border-red-500/20 flex-shrink-0">
              <h3 className="text-xl font-black uppercase flex items-center tracking-tight text-red-500">
                <i className="fas fa-trash-alt mr-2.5"></i>
                <span>Turnier löschen</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteTournamentModal(false);
                  setTournamentToDelete(null);
                  setDeleteConfirmInput('');
                  setDeleteTournamentError(null);
                }}
                className="text-lg opacity-50 hover:opacity-100 p-2 rounded-full focus:outline-none cursor-pointer"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 overscroll-contain">
              <p className="text-sm font-bold">
                Möchtest du das Turnier <span className="text-red-400 font-extrabold">"{tournamentToDelete}"</span> wirklich löschen?
              </p>

              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500 text-red-500 text-xs font-bold space-y-1">
                <p className="flex items-start space-x-1.5">
                  <span className="text-sm leading-none">⚠️</span>
                  <span>Diese Aktion löscht alle Turnierdaten vollständig und unwiderruflich. Sie kann nicht rückgängig gemacht werden.</span>
                </p>
              </div>

              {deleteTournamentError && (
                <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold text-center">
                  {deleteTournamentError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase opacity-70 mb-1.5">
                  Zur Bestätigung bitte "delete" eingeben:
                </label>
                <input
                  type="text"
                  value={deleteConfirmInput}
                  onChange={e => setDeleteConfirmInput(e.target.value)}
                  placeholder="delete"
                  className={`w-full p-3.5 rounded-xl border-2 text-sm font-mono font-bold ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex-shrink-0 p-6 pt-4 border-t border-red-500/20 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteTournamentModal(false);
                  setTournamentToDelete(null);
                  setDeleteConfirmInput('');
                  setDeleteTournamentError(null);
                }}
                className="flex-1 py-3.5 rounded-2xl text-white font-black text-xs uppercase tracking-wider shadow-md hover:brightness-110 transition-all cursor-pointer"
                style={{ backgroundColor: '#238183' }}
              >
                Abbrechen
              </button>

              <button
                type="button"
                disabled={deleteConfirmInput.trim().toLowerCase() !== 'delete' || deletingTournament}
                onClick={handleConfirmDeleteTournament}
                className={`flex-1 py-3.5 rounded-2xl text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 ${
                  deleteConfirmInput.trim().toLowerCase() === 'delete' && !deletingTournament
                    ? 'bg-red-600 hover:bg-red-700 shadow-lg active:scale-95 cursor-pointer'
                    : 'bg-red-500/30 opacity-50 cursor-not-allowed'
                }`}
              >
                {deletingTournament ? (
                  <i className="fas fa-spinner animate-spin"></i>
                ) : (
                  <span>Löschen bestätigen</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showStats && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
          <div className={`rounded-3xl p-6 md:p-8 max-w-5xl w-full shadow-2xl border flex flex-col ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-black/10 text-black'}`}>
            <h3 className="text-3xl font-black mb-6 text-center uppercase tracking-tighter" style={{ color: BRAND_COLOR }}>Abstandsverlauf</h3>
            <div ref={statsAreaRef} className={`relative p-8 rounded-2xl border ${darkMode ? 'border-white/20 bg-black/20' : 'border-black/10 bg-black/5'} flex-1 min-h-[350px]`}>
              {gameState === GameState.SPEED_RESULT ? (
                <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 400" preserveAspectRatio="none">
                  {[0, 20, 40, 60, 80, 100].map(v => {
                    const y = 400 - (v * 4);
                    return (
                      <g key={v}>
                        <line x1="0" y1={y} x2="1000" y2={y} stroke={darkMode ? "white" : "black"} strokeOpacity="0.1" />
                        <text x="-15" y={y} dominantBaseline="middle" textAnchor="end" className={`fill-current opacity-30 text-[12px] font-bold ${darkMode ? 'fill-white' : 'fill-black'}`}>{v}g</text>
                      </g>
                    );
                  })}
                  {(() => {
                    const levels = parseInt(speedLevels);
                    const pts = Array.from({ length: levels }).map((_, i) => {
                      const x = (i / (levels - 1)) * 1000;
                      const target = parseInt(speedTargets[i+1]) || 0;
                      const result = parseInt(speedResults[i+1]) || 0;
                      const diff = Math.abs(result - target);
                      return `${x},${400 - Math.min(100, diff) * 4}`;
                    }).join(' ');
                    return <polyline points={pts} fill="none" stroke={BRAND_COLOR} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />;
                  })()}
                </svg>
              ) : (
                <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 400" preserveAspectRatio="none">
                  {[0, 10, 20, 30, 40, 50].map(v => {
                    const y = 400 - (v * 8);
                    return (
                      <g key={v}>
                        <line x1="0" y1={y} x2="1000" y2={y} stroke={darkMode ? "white" : "black"} strokeOpacity="0.1" />
                        <text x="-15" y={y} dominantBaseline="middle" textAnchor="end" className={`fill-current opacity-30 text-[12px] font-bold ${darkMode ? 'fill-white' : 'fill-black'}`}>{v}g</text>
                      </g>
                    );
                  })}
                  {players.map((p, idx) => {
                    const activeRounds = rounds.filter(r => r.results[p.id] !== undefined);
                    if (activeRounds.length < 2) return null;
                    const pts = activeRounds.map((r, i) => {
                      const x = (i / (activeRounds.length - 1)) * 1000;
                      const tg = r.isFinal ? r.individualTargets?.[p.id] : r.targetWeight;
                      return `${x},${400 - Math.min(50, Math.abs(r.results[p.id] - tg!)) * 8}`;
                    }).join(' ');
                    return <polyline key={p.id} points={pts} fill="none" stroke={PLAYER_COLORS[idx % PLAYER_COLORS.length]} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />;
                  })}
                </svg>
              )}
            </div>
            
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              {gameState === GameState.SPEED_RESULT ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: BRAND_COLOR }}></div>
                  <span className="text-xs font-bold">{speedPlayerName}</span>
                </div>
              ) : (
                players.map((p, idx) => (
                  <div key={p.id} className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}></div>
                    <span className="text-xs font-bold">{p.name}</span>
                  </div>
                ))
              )}
            </div>

            <button onClick={() => setShowStats(false)} className="w-full mt-8 py-4 rounded-xl text-white font-black shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>Schließen</button>
          </div>
        </div>
      )}

      {/* Participant Management Modal */}
      {showParticipantsModal && (
        <div className="fixed inset-0 z-[650] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className={`w-full md:max-w-2xl rounded-t-3xl md:rounded-3xl flex flex-col max-h-[92dvh] md:max-h-[90vh] shadow-2xl border-t-2 md:border-2 ${
            darkMode ? 'bg-slate-900 border-[#238183]/30 text-white' : 'bg-white border-[#238183]/30 text-gray-900'
          }`}>
            <div className="flex items-center justify-between p-6 pb-4 border-b border-[#238183]/20 flex-shrink-0">
              <h3 className="text-xl font-black uppercase flex items-center tracking-tight text-[#238183]">
                <i className="fas fa-users mr-2.5"></i>
                <span>Teilnehmer hinzufügen & mischen</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowParticipantsModal(false)}
                className="text-lg opacity-50 hover:opacity-100 p-2 rounded-full focus:outline-none cursor-pointer"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 overscroll-contain">
              {participantsSaveError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold text-center">
                  {participantsSaveError}
                </div>
              )}

              {/* Bereich 1: Tische benennen */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#238183] flex items-center space-x-1.5">
                  <i className="fas fa-pen text-xs"></i>
                  <span>1. Tische benennen</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeTournamentData?.tables?.filter((t: any) => t.id.startsWith("table_") && t.id !== "table_second_chance" && t.id !== "table_final").map((t: any, idx: number) => {
                    const tblColor = t.color || TOURNAMENT_TABLE_COLORS[idx % TOURNAMENT_TABLE_COLORS.length];
                    return (
                      <div key={t.id} className="flex items-center space-x-2">
                        <span className="px-2.5 py-1 rounded-full text-white text-[11px] font-black shrink-0" style={{ backgroundColor: tblColor }}>
                          Tisch {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={tableCustomNames[t.id] || ''}
                          onChange={e => setTableCustomNames(prev => ({ ...prev, [t.id]: e.target.value }))}
                          placeholder="z.B. Küche"
                          className={`flex-1 p-2.5 rounded-xl border-2 text-xs font-bold ${
                            darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bereich 2: Teilnehmer eingeben */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#238183] flex items-center space-x-1.5">
                  <i className="fas fa-user-plus text-xs"></i>
                  <span>2. Teilnehmer eingeben (ein Name pro Zeile)</span>
                </h4>
                <textarea
                  rows={5}
                  value={participantNamesText}
                  onChange={e => setParticipantNamesText(e.target.value)}
                  placeholder="Max&#10;Anna&#10;Lukas&#10;Sophie"
                  className={`w-full p-3.5 rounded-xl border-2 text-xs font-bold ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <div>
                  <button
                    type="button"
                    onClick={handleShuffleAndDistribute}
                    className="w-full py-2.5 px-4 rounded-xl text-white font-black text-xs uppercase tracking-wider shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                    style={{ backgroundColor: '#238183' }}
                  >
                    <span>🎲 Mischen & Verteilen</span>
                  </button>
                </div>
              </div>

              {/* Bereich 3: Vorschau Tische & Teilnehmer */}
              <div className="space-y-3 pt-2 border-t border-[#238183]/20">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#238183] flex items-center space-x-1.5">
                  <i className="fas fa-table text-xs"></i>
                  <span>3. Vorschau der Tischverteilung</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeTournamentData?.tables?.filter((t: any) => t.id.startsWith("table_") && t.id !== "table_second_chance" && t.id !== "table_final").map((t: any, idx: number) => {
                    const tblColor = t.color || TOURNAMENT_TABLE_COLORS[idx % TOURNAMENT_TABLE_COLORS.length];
                    const custom = tableCustomNames[t.id] || '';
                    const fullTableName = formatTableName(idx + 1, custom);
                    const list = participantsDistribution[t.id] || [];

                    return (
                      <div key={t.id} className={`p-3.5 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2.5 py-0.5 rounded-full text-white text-[11px] font-black" style={{ backgroundColor: tblColor }}>
                            {fullTableName}
                          </span>
                          <span className="text-[10px] font-mono opacity-60 font-bold">{list.length} Spieler</span>
                        </div>
                        {list.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {list.map((pName, pIdx) => (
                              <span key={pIdx} className="px-2 py-0.5 rounded-lg bg-black/10 dark:bg-white/10 text-[11px] font-bold">
                                {pName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] opacity-40 italic">Keine Spieler zugewiesen</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {participantSaveMessage && (
                <div className={`p-3 rounded-xl text-xs font-bold text-center my-2 ${
                  participantSaveState === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  participantSaveState === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  'bg-[#238183]/20 text-[#238183] border border-[#238183]/30'
                }`}>
                  {participantSaveMessage}
                </div>
              )}
            </div>

            <div className="flex-shrink-0 p-6 pt-3 border-t border-[#238183]/20 flex gap-3">
              <button
                type="button"
                onClick={() => setShowParticipantsModal(false)}
                className={`flex-1 py-3.5 rounded-2xl font-bold border text-xs uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'border-gray-700 hover:bg-white/5' : 'border-gray-300 hover:bg-black/5'
                }`}
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={isSavingParticipants}
                onClick={handleSaveParticipants}
                className="flex-1 py-3.5 rounded-2xl text-white font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center space-x-2"
                style={{ backgroundColor: '#238183' }}
              >
                {isSavingParticipants ? (
                  <i className="fas fa-spinner animate-spin"></i>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    <span>Speichern</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Second Chance Selection Modal */}
      {showSecondChancePlayerSelect && (
        <div className="fixed inset-0 z-[700] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className={`w-full md:max-w-lg rounded-t-3xl md:rounded-3xl flex flex-col max-h-[92dvh] md:max-h-[90vh] shadow-2xl border-t-2 md:border-2 ${
            darkMode ? 'bg-slate-900 border-[#238183]/30 text-white' : 'bg-white border-[#238183]/30 text-gray-900'
          }`}>
            <div className="flex items-center justify-between p-6 pb-4 border-b border-[#238183]/20 flex-shrink-0">
              <h3 className="text-xl font-black uppercase flex items-center tracking-tight text-[#238183]">
                <i className="fas fa-sync-alt mr-2.5"></i>
                <span>🔄 Second Chance Tisch</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSecondChancePlayerSelect(false)}
                className="text-lg opacity-50 hover:opacity-100 p-2 rounded-full focus:outline-none cursor-pointer"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 overscroll-contain">
              <p className="text-xs font-semibold opacity-80 leading-relaxed">
                Wähle aus, welche Spieler am Second Chance Tisch teilnehmen möchten:
              </p>

              <div className="space-y-2">
                {secondChancePlayers.map((player, index) => (
                  <div
                    key={`${player.name}-${index}`}
                    onClick={() => {
                      setSecondChancePlayers(prev => prev.map((p, i) => i === index ? { ...p, selected: !p.selected } : p));
                    }}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      player.selected
                        ? 'bg-[#238183]/15 border-[#238183]/50 text-[#238183] dark:text-[#38b2b5] font-bold shadow-sm'
                        : darkMode ? 'bg-slate-800/40 border-slate-700/60 opacity-60 text-gray-300' : 'bg-gray-50 border-gray-200 opacity-60 text-gray-600'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center text-xs font-black transition-all ${
                        player.selected
                          ? 'bg-[#238183] border-[#238183] text-white'
                          : darkMode ? 'border-gray-600 bg-slate-800' : 'border-gray-300 bg-white'
                      }`}>
                        {player.selected && <i className="fas fa-check text-[10px]"></i>}
                      </div>
                      <span className="font-black text-sm">{player.name}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs font-semibold opacity-80">
                      <span>({player.sourceTisch} · Platz {player.placement})</span>
                      {!player.selected && (
                        <span className="text-[10px] italic text-red-400 font-normal">← abgewählt = freiwillig ausgeschieden</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic counter and validation */}
            {(() => {
              const selectedCount = secondChancePlayers.filter(p => p.selected).length;
              const isSecondChanceValid = selectedCount >= 2;

              return (
                <div className="flex-shrink-0 p-6 pt-3 border-t border-[#238183]/20 space-y-3">
                  <div className="text-center">
                    <span className="text-xs font-black uppercase tracking-wider text-[#238183]">
                      [{selectedCount}] ausgewählte Spieler nehmen teil
                    </span>
                    {!isSecondChanceValid && (
                      <p className="text-[11px] font-bold text-red-500 mt-1">
                        ⚠️ Mindestens 2 Spieler erforderlich
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowSecondChancePlayerSelect(false)}
                      className={`flex-1 py-3.5 rounded-2xl font-bold border text-xs uppercase tracking-wider cursor-pointer ${
                        darkMode ? 'border-gray-700 hover:bg-white/5 text-gray-300' : 'border-gray-300 hover:bg-black/5 text-gray-700'
                      }`}
                    >
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      disabled={!isSecondChanceValid || isSavingSecondChance}
                      onClick={handleConfirmSecondChance}
                      className={`flex-1 py-3.5 rounded-2xl text-white font-black text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center space-x-2 ${
                        !isSecondChanceValid || isSavingSecondChance
                          ? 'opacity-40 bg-gray-500 cursor-not-allowed'
                          : 'hover:brightness-110 active:scale-95 cursor-pointer'
                      }`}
                      style={{ backgroundColor: (isSecondChanceValid && !isSavingSecondChance) ? '#238183' : undefined }}
                    >
                      {isSavingSecondChance ? (
                        <i className="fas fa-spinner animate-spin"></i>
                      ) : (
                        <span>Spiel starten</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Leertrinken Modal */}
      {showEmptyWeightModal && (
        <div className="fixed inset-0 z-[750] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className={`w-full md:max-w-md rounded-t-3xl md:rounded-3xl flex flex-col max-h-[92dvh] md:max-h-[90vh] shadow-2xl border-t-2 md:border-2 ${
            darkMode ? 'bg-slate-900 border-[#238183]/30 text-white' : 'bg-white border-[#238183]/30 text-gray-900'
          }`}>
            <div className="flex items-center justify-between p-6 pb-4 border-b border-[#238183]/20 flex-shrink-0">
              <h3 className="text-xl font-black uppercase flex items-center tracking-tight text-[#238183]">
                <i className="fas fa-glass-whiskey mr-2.5"></i>
                <span>Leertrinken Auswertung</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowEmptyWeightModal(false)}
                className="text-lg opacity-50 hover:opacity-100 p-2 rounded-full focus:outline-none cursor-pointer"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 overscroll-contain">
              <p className="text-xs font-semibold opacity-80 leading-relaxed">
                Trage hier deine geschätzte und gemessene Leermenge (0g Ziel) ein:
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase opacity-60 mb-1">
                    Geschätzter Leergewichtswert (g)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={emptyWeightGuess}
                    onChange={e => setEmptyWeightGuess(e.target.value.slice(0, 3))}
                    placeholder="z.B. 15"
                    className={`w-full p-3 rounded-xl border-2 font-black text-center ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-black'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase opacity-60 mb-1">
                    Gemessener Leergewichtswert (g)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={emptyWeightActual}
                    onChange={e => setEmptyWeightActual(e.target.value.slice(0, 3))}
                    placeholder="z.B. 12"
                    className={`w-full p-3 rounded-xl border-2 font-black text-center ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-black'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 p-6 pt-3 border-t border-[#238183]/20 flex gap-3">
              <button
                type="button"
                onClick={() => setShowEmptyWeightModal(false)}
                className={`flex-1 py-3.5 rounded-2xl font-bold border text-xs uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'border-gray-700 hover:bg-white/5 text-gray-300' : 'border-gray-300 hover:bg-black/5 text-gray-700'
                }`}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleConfirmEmptyWeight}
                className="flex-1 py-3.5 rounded-2xl text-white font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center space-x-2"
                style={{ backgroundColor: '#238183' }}
              >
                <span>Auswerten</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 👑 Admin Panel Modal */}
      {showAdminPanel && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
          <div className={`rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-6 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}>
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-tight flex items-center space-x-2 text-red-500">
                <i className="fas fa-shield-alt"></i>
                <span>👑 Admin Panel</span>
              </h3>
              <button onClick={() => setShowAdminPanel(false)} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => { setShowAdminPanel(false); setShowAdminOptionsModal(true); setMergeMessage(null); }}
                className="w-full p-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-between shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <i className="fas fa-compress-alt text-lg"></i>
                  <span>Optionen / Namen zusammenführen</span>
                </div>
                <i className="fas fa-chevron-right opacity-60"></i>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.open('/api/records', '_blank');
                }}
                className="w-full p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-between shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <i className="fas fa-file-csv text-lg"></i>
                  <span>CSV direkt bearbeiten / anzeigen</span>
                </div>
                <i className="fas fa-external-link-alt opacity-60"></i>
              </button>

              <button
                type="button"
                onClick={() => setShowAdminUsersView(prev => !prev)}
                className="w-full p-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm flex items-center justify-between shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <i className="fas fa-users text-lg"></i>
                  <span>Alle Nutzer anzeigen</span>
                </div>
                <i className={`fas ${showAdminUsersView ? 'fa-chevron-up' : 'fa-chevron-down'} opacity-60`}></i>
              </button>

              {showAdminUsersView && (
                <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/80 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-2 text-xs animate-in fade-in`}>
                  <div className="flex justify-between items-center font-bold border-b pb-2 border-gray-500/20">
                    <span>Eingeloggt als:</span>
                    <span className="text-indigo-400">{user?.firstName || user?.emailAddresses?.[0]?.emailAddress || user?.username}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Benutzer ID:</span>
                    <span className="font-mono text-[10px] opacity-75">{supabaseUser?.id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Rolle:</span>
                    <span className="font-bold text-red-500">👑 Admin</span>
                  </div>
                  <div className="text-[10px] opacity-60 pt-2 border-t border-gray-500/20">
                    Hinweis: Nutzerverwaltung &amp; Admin-Rollen werden im Supabase Dashboard verwaltet (user_metadata: &#123; "role": "admin" &#125;).
                  </div>
                </div>
              )}

              {/* CSV-Daten Account zuordnen */}
              <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-4`}>
                <h4 className="font-black text-xs uppercase tracking-wider opacity-80 flex items-center space-x-2 text-indigo-400">
                  <i className="fas fa-link"></i>
                  <span>CSV-Daten einem Account zuordnen</span>
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold opacity-60 uppercase mb-1">CSV-Name wählen:</label>
                    <select
                      value={assignCsvName}
                      onChange={e => {
                        setAssignCsvName(e.target.value);
                        setAssignPreviewCount(null);
                        setAssignMessage(null);
                      }}
                      className={`w-full p-2.5 rounded-xl border-2 font-bold text-xs ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                    >
                      <option value="">CSV-Eintrag wählen...</option>
                      {csvNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>

                    {csvNamesError && (
                      <p className="text-xs text-red-500 font-bold mt-1">❌ {csvNamesError}</p>
                    )}

                    {csvNames.length === 0 && !csvNamesError && (
                      <p className="text-xs text-amber-500 font-bold mt-1">
                        ⚠️ Keine CSV-Einträge gefunden
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold opacity-60 uppercase mb-1">Account wählen:</label>
                    <select
                      value={assignTargetUserId}
                      onChange={e => {
                        setAssignTargetUserId(e.target.value);
                        setAssignMessage(null);
                      }}
                      className={`w-full p-2.5 rounded-xl border-2 font-bold text-xs ${
                        darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-black'
                      }`}
                    >
                      <option value="">
                        {adminUsersLoading
                          ? 'Lade Accounts...'
                          : clerkUsers.length === 0
                            ? 'Keine Accounts gefunden'
                            : 'Ziel-Account wählen...'}
                      </option>
                      {clerkUsers.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} {u.email ? `(${u.email})` : ''}
                        </option>
                      ))}
                    </select>

                    {adminUsersError && (
                      <p className="text-xs text-red-500 font-bold mt-1">
                        ❌ {adminUsersError}
                      </p>
                    )}

                    {!adminUsersLoading && clerkUsers.length === 0 && !adminUsersError && (
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-xs text-amber-500 font-bold">
                          ⚠️ Keine Accounts geladen.
                        </p>
                        <button
                          type="button"
                          onClick={openAdminPanel}
                          className="text-xs font-bold underline cursor-pointer"
                          style={{ color: BRAND_COLOR }}
                        >
                          Erneut laden
                        </button>
                      </div>
                    )}
                  </div>

                  {assignPreviewCount !== null && (
                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold">
                      📊 Es wurden {assignPreviewCount} Einträge in der CSV für "{assignCsvName}" gefunden.
                    </div>
                  )}

                  {assignMessage && (
                    <div className={`p-3 rounded-xl text-xs font-bold ${assignMessage.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
                      {assignMessage.text}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={!assignCsvName}
                      onClick={() => {
                        if (!assignCsvName || !recordsData) return;
                        const targetName = assignCsvName.trim().toLowerCase();
                        const matchingRows = recordsData.slice(1).filter(row => String(row[2] || '').trim().toLowerCase() === targetName);
                        setAssignPreviewCount(matchingRows.length);
                      }}
                      className="flex-1 py-2.5 rounded-xl border-2 font-bold text-xs uppercase cursor-pointer hover:bg-white/5 active:scale-95 disabled:opacity-40"
                      style={{ borderColor: BRAND_COLOR, color: BRAND_COLOR }}
                    >
                      Vorschau
                    </button>

                    <button
                      type="button"
                      disabled={!assignCsvName || !assignTargetUserId || assignSubmitting}
                      onClick={async () => {
                        if (!assignCsvName || !assignTargetUserId || !supabaseUser) return;
                        setAssignSubmitting(true);
                        setAssignMessage(null);
                        try {
                          const res = await fetch('/api/admin/assign-to-account', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              requesterUserId: supabaseUser.id,
                              csvName: assignCsvName,
                              targetUserId: assignTargetUserId
                            })
                          });
                          const json = await res.json();
                          if (res.ok) {
                            setAssignMessage({ type: 'success', text: json.message || 'Zuordnung erfolgreich!' });
                            setAssignPreviewCount(null);
                            setAssignCsvName('');
                            setAssignTargetUserId('');
                            fetchRecords();
                          } else {
                            setAssignMessage({ type: 'error', text: json.error || 'Fehler bei der Zuordnung.' });
                          }
                        } catch (err: any) {
                          setAssignMessage({ type: 'error', text: err.message || 'Verbindungsfehler' });
                        } finally {
                          setAssignSubmitting(false);
                        }
                      }}
                      className={`flex-1 py-2.5 rounded-xl text-white font-bold text-xs uppercase cursor-pointer active:scale-95 shadow ${
                        !assignCsvName || !assignTargetUserId || assignSubmitting ? 'opacity-50 cursor-not-allowed bg-gray-600' : 'hover:brightness-110'
                      }`}
                      style={{ backgroundColor: (assignCsvName && assignTargetUserId && !assignSubmitting) ? BRAND_COLOR : undefined }}
                    >
                      {assignSubmitting ? <i className="fas fa-spinner animate-spin"></i> : 'Zuordnen'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAdminPanel(false)}
              className="w-full py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider border border-gray-500/20 opacity-70 hover:opacity-100 cursor-pointer"
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {/* JOIN TABLE QR MODAL */}
      {showJoinTableModal && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border-2 text-center ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-gray-900'}`}>
            <h3 className="text-xl font-black mb-2 flex items-center justify-center space-x-2" style={{ color: BRAND_COLOR }}>
              <i className="fas fa-qrcode"></i>
              <span>An Tisch teilnehmen</span>
            </h3>
            <p className="text-xs opacity-70 mb-6">Zeige diesen QR-Code dem Spielleiter:</p>

            <div className="bg-white p-4 rounded-2xl shadow-inner inline-block mb-4 border border-gray-200">
              {qrCodeValue ? (
                <QRCode value={qrCodeValue} size={200} level="M" />
              ) : (
                <div className="w-[200px] h-[200px] flex flex-col items-center justify-center text-red-500 text-xs font-bold space-y-2">
                  <i className="fas fa-exclamation-triangle text-2xl"></i>
                  <span>QR-Code abgelaufen</span>
                </div>
              )}
            </div>

            <div className="mb-4">
              <div className="font-bold text-sm">
                {supabaseUser?.user_metadata?.username || supabaseUser?.email || 'Benutzer'}
              </div>
              <div className="text-xs opacity-60">
                {supabaseUser?.email}
              </div>
            </div>

            <div className="text-[11px] font-bold opacity-60 mb-6">
              {qrCodeValue ? (
                <span className="text-amber-500 animate-pulse">⏱️ QR-Code ist 5 Minuten gültig.</span>
              ) : (
                <span className="text-red-400">QR-Code ist abgelaufen. Bitte neu generieren.</span>
              )}
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={generateQrCode}
                className="flex-1 py-3 rounded-xl text-white font-bold text-xs uppercase tracking-wider cursor-pointer active:scale-95 shadow"
                style={{ backgroundColor: BRAND_COLOR }}
              >
                Neu generieren
              </button>
              <button
                type="button"
                onClick={() => setShowJoinTableModal(false)}
                className="flex-1 py-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wider cursor-pointer active:scale-95"
                style={{ borderColor: BRAND_COLOR, color: BRAND_COLOR }}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR SCANNER MODAL */}
      {showQrScanner && (
        <div className="fixed inset-0 z-[750] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className={`rounded-3xl p-6 max-w-md w-full shadow-2xl border-2 text-center ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-gray-900'}`}>
            <h3 className="text-xl font-black mb-2 flex items-center justify-center space-x-2" style={{ color: BRAND_COLOR }}>
              <i className="fas fa-camera"></i>
              <span>Spieler QR-Code scannen</span>
            </h3>
            <p className="text-xs opacity-70 mb-4">Halte den QR-Code des Spielers in die Kamera</p>

            <div id="qr-reader" className="w-full rounded-2xl overflow-hidden mb-6 bg-black"></div>

            <button
              type="button"
              onClick={() => setShowQrScanner(false)}
              className="w-full py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider border-2 cursor-pointer active:scale-95"
              style={{ borderColor: BRAND_COLOR, color: BRAND_COLOR }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* PROFILE MANAGMENT MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[650] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className={`rounded-3xl p-6 md:p-8 max-w-3xl w-full shadow-2xl border-2 flex flex-col space-y-6 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-gray-900'}`}>
            <div className="flex justify-between items-center border-b pb-4 border-gray-500/20">
              <h3 className="text-2xl font-black uppercase flex items-center" style={{ color: BRAND_COLOR }}>
                <i className="fas fa-user-circle mr-3"></i>Profil verwalten
              </h3>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center border font-bold hover:bg-black/10 active:scale-90"
              >
                ✕
              </button>
            </div>

            {/* Reiter Header */}
            <div className="flex border-b border-gray-500/20 px-6">
              <button
                type="button"
                onClick={() => setProfileTab('profil')}
                className={`py-3 px-4 font-black text-sm border-b-2 transition-colors cursor-pointer ${
                  profileTab === 'profil'
                    ? 'border-[#238183] text-[#238183]'
                    : 'border-transparent opacity-50'
                }`}
              >
                👤 Profil
              </button>
              <button
                type="button"
                onClick={() => setProfileTab('rekorde')}
                className={`py-3 px-4 font-black text-sm border-b-2 transition-colors cursor-pointer ${
                  profileTab === 'rekorde'
                    ? 'border-[#238183] text-[#238183]'
                    : 'border-transparent opacity-50'
                }`}
              >
                📊 Rekorde
              </button>
            </div>

            {profileTab === 'profil' && (
              <>
                {/* Custom User Stats */}
                {(() => {
                  const currentUserName = (supabaseUser?.user_metadata?.username || supabaseUser?.email || '').toLowerCase();
                  let gamesPlayed = 0;
                  let totalSchnaepse = 0;
                  let bestAvg = null as number | null;
                  let totalAchievementsCount = 0;

                  if (recordsData && Array.isArray(recordsData)) {
                    recordsData.forEach(row => {
                      const pName = String(row[1] || '').trim().toLowerCase();
                      if (pName && (pName === currentUserName || currentUserName.includes(pName) || pName.includes(currentUserName))) {
                        gamesPlayed += 1;
                        const schnaepse = parseInt(row[4]) || 0;
                        totalSchnaepse += schnaepse;
                        const avg = parseFloat(row[3]);
                        if (!isNaN(avg)) {
                          if (bestAvg === null || avg < bestAvg) bestAvg = avg;
                        }
                        if (row[5]) {
                          try {
                            const parsedAch = typeof row[5] === 'string' ? JSON.parse(row[5]) : row[5];
                            if (Array.isArray(parsedAch)) totalAchievementsCount += parsedAch.length;
                          } catch (e) {}
                        }
                      }
                    });
                  }

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className={`p-4 rounded-2xl border text-center ${darkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="text-2xl font-black text-emerald-400">{gamesPlayed}</div>
                        <div className="text-[11px] font-bold opacity-60 uppercase">Gespielte Spiele</div>
                      </div>
                      <div className={`p-4 rounded-2xl border text-center ${darkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="text-2xl font-black text-amber-400">{totalSchnaepse} 🥃</div>
                        <div className="text-[11px] font-bold opacity-60 uppercase">Schnäpse</div>
                      </div>
                      <div className={`p-4 rounded-2xl border text-center ${darkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="text-2xl font-black text-cyan-400">{bestAvg !== null ? `${bestAvg.toFixed(1)}g` : '-'}</div>
                        <div className="text-[11px] font-bold opacity-60 uppercase">Beste Abweichung</div>
                      </div>
                      <div className={`p-4 rounded-2xl border text-center ${darkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="text-2xl font-black text-purple-400">{totalAchievementsCount} 🏆</div>
                        <div className="text-[11px] font-bold opacity-60 uppercase">Achievements</div>
                      </div>
                    </div>
                  );
                })()}

                {/* Custom Profile Forms */}
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                  {profileSaveMessageOld && (
                    <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between ${
                      profileSaveMessageOld.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
                    }`}>
                      <span>{profileSaveMessageOld.text}</span>
                      <button type="button" onClick={() => setProfileSaveMessageOld(null)} className="text-gray-400 hover:text-white ml-2">✕</button>
                    </div>
                  )}

                  {/* 1. Profilbild */}
                  <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-4`}>
                    <h4 className="font-black text-xs uppercase tracking-wider opacity-80 flex items-center space-x-2" style={{ color: BRAND_COLOR }}>
                      <i className="fas fa-camera"></i>
                      <span>Profilbild</span>
                    </h4>
                    <div className="flex items-center space-x-4">
                      <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-slate-700 flex items-center justify-center flex-shrink-0 shadow">
                        {supabaseUser?.user_metadata?.avatar_url ? (
                          <img src={supabaseUser.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl font-black text-gray-300">
                            {(supabaseUser?.user_metadata?.username || supabaseUser?.email || 'U')[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <label className="py-2.5 px-4 rounded-xl text-white font-bold text-xs cursor-pointer active:scale-95 shadow flex items-center space-x-2" style={{ backgroundColor: BRAND_COLOR }}>
                          <i className="fas fa-upload"></i>
                          <span>📷 Bild hochladen</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file || !supabaseUser) return;
                              setProfileLoadingSection('avatar');
                              setProfileSaveMessageOld(null);
                              try {
                                let avatarUrl = '';
                                const { data, error: uploadErr } = await supabase.storage
                                  .from('avatars')
                                  .upload(`${supabaseUser.id}/avatar_${Date.now()}.jpg`, file, { upsert: true });

                                if (!uploadErr && data) {
                                  avatarUrl = supabase.storage.from('avatars').getPublicUrl(data.path).data.publicUrl;
                                } else {
                                  avatarUrl = await new Promise<string>((resolve) => {
                                    const reader = new FileReader();
                                    reader.onloadend = () => resolve(reader.result as string);
                                    reader.readAsDataURL(file);
                                  });
                                }
                                const { error } = await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
                                if (error) throw error;
                                setProfileSaveMessageOld({ section: 'avatar', type: 'success', text: 'Profilbild erfolgreich aktualisiert!' });
                              } catch (err: any) {
                                setProfileSaveMessageOld({ section: 'avatar', type: 'error', text: err.message || 'Fehler beim Hochladen' });
                              } finally {
                                setProfileLoadingSection(null);
                              }
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          disabled={profileLoadingSection === 'avatar'}
                          onClick={async () => {
                            if (!supabaseUser) return;
                            setProfileLoadingSection('avatar');
                            setProfileSaveMessageOld(null);
                            try {
                              const { error } = await supabase.auth.updateUser({ data: { avatar_url: null } });
                              if (error) throw error;
                              setProfileSaveMessageOld({ section: 'avatar', type: 'success', text: 'Profilbild entfernt!' });
                            } catch (err: any) {
                              setProfileSaveMessageOld({ section: 'avatar', type: 'error', text: err.message || 'Fehler beim Entfernen' });
                            } finally {
                              setProfileLoadingSection(null);
                            }
                          }}
                          className="py-2.5 px-4 rounded-xl border-2 border-red-500/40 text-red-400 font-bold text-xs hover:bg-red-500/10 active:scale-95 cursor-pointer"
                        >
                          Bild entfernen
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 2. Nutzername */}
                  <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-4`}>
                    <h4 className="font-black text-xs uppercase tracking-wider opacity-80 flex items-center space-x-2" style={{ color: BRAND_COLOR }}>
                      <i className="fas fa-user"></i>
                      <span>Nutzername</span>
                    </h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={profileUsername}
                        onChange={e => {
                          setProfileUsername(e.target.value);
                          setProfileSaveState(prev => ({ ...prev, username: 'idle' }));
                        }}
                        placeholder="Nutzername"
                        className={`flex-1 p-3 rounded-xl border-2 font-bold text-sm ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                      />
                      <button
                        type="button"
                        disabled={profileSaveState['username'] === 'loading' || !profileUsername.trim()}
                        onClick={handleUsernameChange}
                        className="px-5 py-3 rounded-xl text-white font-bold text-xs uppercase tracking-wider shadow active:scale-95 cursor-pointer disabled:opacity-50"
                        style={{ backgroundColor: BRAND_COLOR }}
                      >
                        {profileSaveState['username'] === 'loading' ? <i className="fas fa-spinner animate-spin"></i> : 'Speichern'}
                      </button>
                    </div>
                    {profileSaveState['username'] === 'error' && (
                      <p className="text-xs text-red-500 font-bold mt-1">
                        ❌ {profileSaveMessage['username']}
                      </p>
                    )}
                    {profileSaveState['username'] === 'success' && (
                      <p className="text-xs text-emerald-500 font-bold mt-1">
                        ✅ {profileSaveMessage['username']}
                      </p>
                    )}
                  </div>

                  {/* 3. E-Mail Adresse */}
                  <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-4`}>
                    <h4 className="font-black text-xs uppercase tracking-wider opacity-80 flex items-center space-x-2" style={{ color: BRAND_COLOR }}>
                      <i className="fas fa-envelope"></i>
                      <span>E-Mail Adresse</span>
                    </h4>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={e => setProfileEmail(e.target.value)}
                        placeholder="E-Mail Adresse"
                        className={`flex-1 p-3 rounded-xl border-2 font-bold text-sm ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                      />
                      <button
                        type="button"
                        disabled={profileLoadingSection === 'email' || !profileEmail.trim()}
                        onClick={async () => {
                          if (!supabaseUser || !profileEmail.trim()) return;
                          setProfileLoadingSection('email');
                          setProfileSaveMessageOld(null);
                          try {
                            const { error } = await supabase.auth.updateUser({ email: profileEmail.trim() });
                            if (error) throw error;
                            setProfileSaveMessageOld({ section: 'email', type: 'success', text: 'Bestätigungs-E-Mail gesendet! Bitte prüfe dein Postfach.' });
                          } catch (err: any) {
                            setProfileSaveMessageOld({ section: 'email', type: 'error', text: err.message || 'Fehler beim Speichern der E-Mail' });
                          } finally {
                            setProfileLoadingSection(null);
                          }
                        }}
                        className="px-5 py-3 rounded-xl text-white font-bold text-xs uppercase tracking-wider shadow active:scale-95 cursor-pointer disabled:opacity-50"
                        style={{ backgroundColor: BRAND_COLOR }}
                      >
                        {profileLoadingSection === 'email' ? <i className="fas fa-spinner animate-spin"></i> : 'Speichern'}
                      </button>
                    </div>
                  </div>

                  {/* 4. Passwort ändern */}
                  <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-4`}>
                    <h4 className="font-black text-xs uppercase tracking-wider opacity-80 flex items-center space-x-2" style={{ color: BRAND_COLOR }}>
                      <i className="fas fa-key"></i>
                      <span>Passwort ändern</span>
                    </h4>
                    <div className="space-y-3">
                      <input
                        type="password"
                        value={profileCurrentPw}
                        onChange={e => setProfileCurrentPw(e.target.value)}
                        placeholder="Aktuelles Passwort"
                        className={`w-full p-3 rounded-xl border-2 font-bold text-sm ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                      />
                      <input
                        type="password"
                        value={profileNewPw}
                        onChange={e => setProfileNewPw(e.target.value)}
                        placeholder="Neues Passwort"
                        className={`w-full p-3 rounded-xl border-2 font-bold text-sm ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                      />
                      <input
                        type="password"
                        value={profileNewPwConfirm}
                        onChange={e => setProfileNewPwConfirm(e.target.value)}
                        placeholder="Neues Passwort bestätigen"
                        className={`w-full p-3 rounded-xl border-2 font-bold text-sm ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                      />
                      <button
                        type="button"
                        disabled={profileLoadingSection === 'password' || !profileNewPw}
                        onClick={async () => {
                          if (!supabaseUser) return;
                          if (profileNewPw !== profileNewPwConfirm) {
                            setProfileSaveMessageOld({ section: 'password', type: 'error', text: 'Die neuen Passwörter stimmen nicht überein.' });
                            return;
                          }
                          setProfileLoadingSection('password');
                          setProfileSaveMessageOld(null);
                          try {
                            const { error } = await supabase.auth.updateUser({ password: profileNewPw });
                            if (error) throw error;
                            setProfileCurrentPw('');
                            setProfileNewPw('');
                            setProfileNewPwConfirm('');
                            setProfileSaveMessageOld({ section: 'password', type: 'success', text: 'Passwort erfolgreich geändert!' });
                          } catch (err: any) {
                            setProfileSaveMessageOld({ section: 'password', type: 'error', text: err.message || 'Fehler beim Ändern des Passworts' });
                          } finally {
                            setProfileLoadingSection(null);
                          }
                        }}
                        className="w-full py-3 rounded-xl text-white font-bold text-xs uppercase tracking-wider shadow active:scale-95 cursor-pointer disabled:opacity-50"
                        style={{ backgroundColor: BRAND_COLOR }}
                      >
                        {profileLoadingSection === 'password' ? <i className="fas fa-spinner animate-spin"></i> : 'Passwort ändern'}
                      </button>
                    </div>
                  </div>

                  {/* 5. Datenschutz & Sichtbarkeit */}
                  <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-4`}>
                    <h4 className="font-black text-xs uppercase tracking-wider opacity-80 flex items-center space-x-2" style={{ color: BRAND_COLOR }}>
                      <i className="fas fa-shield-alt"></i>
                      <span>Datenschutz &amp; Sichtbarkeit</span>
                    </h4>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="showRecordsCheck"
                        checked={profileShowRecords}
                        onChange={e => setProfileShowRecords(e.target.checked)}
                        className="w-5 h-5 accent-[#238183] cursor-pointer"
                      />
                      <label htmlFor="showRecordsCheck" className="font-bold text-xs cursor-pointer select-none">
                        Meine Statistiken in der öffentlichen Rekorde-Tabelle anzeigen
                      </label>
                    </div>
                    <button
                      type="button"
                      disabled={profileLoadingSection === 'privacy'}
                      onClick={async () => {
                        if (!supabaseUser) return;
                        setProfileLoadingSection('privacy');
                        setProfileSaveMessageOld(null);
                        try {
                          const { error } = await supabase.auth.updateUser({
                            data: { showRecords: profileShowRecords }
                          });
                          if (error) throw error;
                          setProfileSaveMessageOld({ section: 'privacy', type: 'success', text: 'Datenschutzeinstellungen gespeichert!' });
                          fetchRecords();
                        } catch (err: any) {
                          setProfileSaveMessageOld({ section: 'privacy', type: 'error', text: err.message || 'Fehler beim Speichern.' });
                        } finally {
                          setProfileLoadingSection(null);
                        }
                      }}
                      className="w-full py-3 rounded-xl text-white font-bold text-xs uppercase tracking-wider shadow active:scale-95 cursor-pointer disabled:opacity-50"
                      style={{ backgroundColor: BRAND_COLOR }}
                    >
                      {profileLoadingSection === 'privacy' ? <i className="fas fa-spinner animate-spin"></i> : 'Einstellungen speichern'}
                    </button>
                  </div>

                  {/* Ausloggen und Profil löschen */}
                  <div className="border-t border-gray-500/20 pt-6 mt-6 space-y-3">
                    {/* Ausloggen */}
                    <button
                      type="button"
                      onClick={() => handleSignOut()}
                      className="w-full py-3 rounded-2xl border-2 font-bold flex items-center justify-center space-x-2 cursor-pointer active:scale-95 transition-all"
                      style={{ borderColor: BRAND_COLOR, color: BRAND_COLOR }}
                    >
                      <i className="fas fa-sign-out-alt"></i>
                      <span>Ausloggen</span>
                    </button>

                    {/* Profil löschen */}
                    <button
                      type="button"
                      onClick={() => setShowDeleteProfileModal(true)}
                      className="w-full py-3 rounded-2xl border-2 border-red-500 text-red-500 font-bold flex items-center justify-center space-x-2 cursor-pointer active:scale-95 transition-all"
                    >
                      <i className="fas fa-trash"></i>
                      <span>Profil löschen</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {profileTab === 'rekorde' && (
              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto pr-2">

                {/* Statistik-Übersicht */}
                <div className="grid grid-cols-3 gap-3">
                  <div className={`p-3 rounded-2xl text-center ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                    <p className="text-lg font-black" style={{ color: BRAND_COLOR }}>{myGameData.length}</p>
                    <p className="text-[10px] font-bold opacity-60 uppercase">Spiele</p>
                  </div>
                  <div className={`p-3 rounded-2xl text-center ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                    <p className="text-lg font-black text-emerald-500">
                      {myGameData.length > 0
                        ? (myGameData.reduce((s: number, r: any) => s + (r.avg || 0), 0) / myGameData.length).toFixed(1)
                        : '-'}g
                    </p>
                    <p className="text-[10px] font-bold opacity-60 uppercase">Ø Abstand</p>
                  </div>
                  <div className={`p-3 rounded-2xl text-center ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                    <p className="text-lg font-black text-amber-500">
                      {myGameData.reduce((s: number, r: any) => s + (r.schnaepse || 0), 0)}
                    </p>
                    <p className="text-[10px] font-bold opacity-60 uppercase">Schnäpse</p>
                  </div>
                </div>

                {/* Sortier-Buttons */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {(['datum', 'avg', 'schnaepse', 'total'] as const).map(sort => (
                    <button
                      key={sort}
                      type="button"
                      onClick={() => {
                        if (recordsSortBy === sort) {
                          setRecordsSortDir(d => d === 'asc' ? 'desc' : 'asc');
                        } else {
                          setRecordsSortBy(sort);
                          setRecordsSortDir('desc');
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1 cursor-pointer transition-all ${
                        recordsSortBy === sort
                          ? 'text-white'
                          : darkMode ? 'bg-white/10' : 'bg-black/10'
                      }`}
                      style={recordsSortBy === sort ? { backgroundColor: BRAND_COLOR } : {}}
                    >
                      <span>
                        {sort === 'datum' && '📅 Datum'}
                        {sort === 'avg' && '🎯 Durchschnitt'}
                        {sort === 'schnaepse' && '🥂 Schnäpse'}
                        {sort === 'total' && '📊 Total'}
                      </span>
                      {recordsSortBy === sort && (
                        <i className={`fas fa-arrow-${recordsSortDir === 'asc' ? 'up' : 'down'} text-[10px]`}></i>
                      )}
                    </button>
                  ))}
                </div>

                {/* Spiele-Liste */}
                {sortedGameData.length === 0 ? (
                  <p className="text-xs opacity-60 text-center py-8">
                    Noch keine gespeicherten Spiele.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {sortedGameData.map((r: any, idx: number) => (
                      <div key={idx} className={`p-3 rounded-xl flex justify-between items-center ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                        <div>
                          <p className="text-xs font-black">{r.gameMode}</p>
                          <p className="text-[10px] opacity-60">{r.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-emerald-500">Ø {r.avg?.toFixed(2)}g</p>
                          <p className="text-[10px] opacity-60">{r.schnaepse} Pkt • Total: {r.total?.toFixed(1)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Achievements */}
                <div>
                  <h4 className="font-black uppercase text-sm mb-3" style={{ color: BRAND_COLOR }}>
                    🏆 Freigeschaltete Achievements
                  </h4>
                  {(() => {
                    const myAchievements = myGameData
                      .flatMap((r: any) => r.achievements || [])
                      .filter((a: any, idx: number, arr: any[]) =>
                        arr.findIndex(x => x.id === a.id) === idx
                      );
                    return myAchievements.length === 0 ? (
                      <p className="text-xs opacity-60">Noch keine Achievements freigeschaltet.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {myAchievements.map((a: any) => (
                          <div key={a.id} className={`p-2 rounded-xl flex items-center space-x-2 ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                            <span className="text-lg">{a.icon}</span>
                            <div>
                              <p className="text-xs font-black">{a.title}</p>
                              <p className={`text-[10px] font-bold ${
                                a.rarity === 'legendary' ? 'text-yellow-500' :
                                a.rarity === 'epic' ? 'text-purple-500' :
                                a.rarity === 'rare' ? 'text-blue-500' : 'text-gray-400'
                              }`}>{a.rarity}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowProfileModal(false)}
              className="w-full py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider text-white shadow active:scale-95 cursor-pointer"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {/* PROFIL LÖSCHEN MODAL */}
      {showDeleteProfileModal && (
        <div className="fixed inset-0 z-[900] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`rounded-3xl p-6 max-w-sm w-full shadow-2xl ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}`}>
            <h3 className="text-xl font-black text-red-500 mb-2">
              ⚠️ Profil löschen
            </h3>
            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Möchtest du dein Profil wirklich unwiderruflich löschen?
              Alle deine gespeicherten Ergebnisse und Achievements gehen verloren.
            </p>
            <p className="text-xs font-bold mb-2 opacity-70">
              Bitte gib <span className="font-black text-red-500">"delete"</span> ein um zu bestätigen:
            </p>
            <input
              type="text"
              value={deleteProfileInput}
              onChange={e => setDeleteProfileInput(e.target.value)}
              placeholder="delete"
              className={`w-full p-3 rounded-xl border-2 font-bold mb-4 bg-transparent ${
                deleteProfileInput === 'delete' ? 'border-red-500' : 'border-gray-500/30'
              }`}
            />
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteProfileModal(false);
                  setDeleteProfileInput('');
                }}
                className="flex-1 py-3 rounded-xl border-2 font-bold cursor-pointer"
                style={{ borderColor: BRAND_COLOR, color: BRAND_COLOR }}
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={deleteProfileInput !== 'delete' || deletingProfile}
                onClick={handleDeleteProfile}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {deletingProfile ? 'Wird gelöscht...' : 'Löschen bestätigen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTH MODAL (LOGIN / REGISTER) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[800] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className={`w-full md:max-w-sm rounded-t-3xl md:rounded-3xl flex flex-col max-h-[92dvh] shadow-2xl ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}`}>
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-500/20">
              <h3 className="text-xl font-black" style={{ color: BRAND_COLOR }}>
                {authMode === 'login' ? '🔑 Anmelden' : '✨ Registrieren'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="opacity-50 hover:opacity-100 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="text-xs font-black uppercase opacity-60 block mb-1">Nutzername</label>
                  <input
                    type="text"
                    value={authUsername}
                    onChange={e => setAuthUsername(e.target.value)}
                    placeholder="dein_nutzername"
                    className={`w-full p-3 rounded-xl border-2 font-bold bg-transparent ${darkMode ? 'border-white/20' : 'border-black/20'}`}
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-black uppercase opacity-60 block mb-1">
                  {authMode === 'login' ? 'Benutzername oder E-Mail' : 'E-Mail'}
                </label>
                <input
                  type="text"
                  value={authEmailOrUsername}
                  onChange={e => setAuthEmailOrUsername(e.target.value)}
                  placeholder={authMode === 'login' ? 'benutzername oder email@beispiel.de' : 'email@beispiel.de'}
                  className={`w-full p-3 rounded-xl border-2 font-bold bg-transparent ${darkMode ? 'border-white/20' : 'border-black/20'}`}
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase opacity-60 block mb-1">Passwort</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full p-3 rounded-xl border-2 font-bold bg-transparent ${darkMode ? 'border-white/20' : 'border-black/20'}`}
                />
              </div>
              {authError && (
                <p className="text-xs text-red-500 font-bold">❌ {authError}</p>
              )}
              <button
                type="button"
                onClick={authMode === 'login' ? handleSignIn : handleSignUp}
                disabled={authSubmitLoading}
                className="w-full py-4 rounded-2xl text-white font-black disabled:opacity-50 cursor-pointer shadow active:scale-95"
                style={{ backgroundColor: BRAND_COLOR }}
              >
                {authSubmitLoading ? '...' : authMode === 'login' ? 'Anmelden' : 'Registrieren'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                  setAuthError(null);
                }}
                className="w-full text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer pt-2"
              >
                {authMode === 'login' ? 'Noch kein Account? Registrieren' : 'Bereits registriert? Anmelden'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
