import { calculateLevelFromXp } from './levelSystem';
import { supabase as defaultClient } from '../supabaseClient';
import { normalizeGameMode } from '../constants';

export interface QuestDefinition {
  id: string;
  level: number;
  title: string;
  xpReward: number;
  titleReward?: string;
  colorReward?: string;
  animationReward?: string; // Neu: Entkoppelte Animation
  rewardDescription?: string;
  metric: 
    | 'profile_pic' 
    | 'games_count' 
    | 'avg_less_than' 
    | 'total_less_than' 
    | 'max_schnaepse'
    | 'teamwiegen_count'
    | 'tournament_count'
    | 'achievements_count'
    | 'wins_count'
    | 'perfect_hits_count'
    | 'schnapszahl_count'
    | 'same_weight_count'
    | 'hundreds_count'
    | 'exact_five_g_count'
    | 'strategist_count'
    | 'ach_67_count'
    | 'speed_avg_sub5_count'
    | 'speed_time_sub100_count'
    | 'ach_knapp_daneben_count'
    | 'ach_kopfrechner_count'
    | 'ach_scharfschuetze_count'
    | 'poker_face_count';
  targetValue: number;
  gameMode?: string;
  threshold?: number;
  targetCount?: number;
}

export const LEVEL_QUESTS: QuestDefinition[] = [
  // --- LEVEL 1 ---
  { id: 'l1_profile_pic', level: 1, title: 'Lege ein Profilbild an', xpReward: 5, metric: 'profile_pic', targetValue: 1, targetCount: 1 },
  { id: 'l1_5_standard', level: 1, title: 'Spiele 5 Standardspiele', xpReward: 5, metric: 'games_count', targetValue: 5, targetCount: 5, gameMode: 'Standardspiel' },
  { id: 'l1_teamwiegen_2', level: 1, title: 'Nimm an 2 Teamwiegen teil', xpReward: 5, metric: 'teamwiegen_count', targetValue: 2, targetCount: 2 },
  { id: 'l1_tournament_1', level: 1, title: 'Nimm an einem Turnier teil', xpReward: 10, metric: 'tournament_count', targetValue: 1, targetCount: 1 },
  { id: 'l1_avg_sub5', level: 1, title: 'Erreiche einen Durchschnitt von < 5 Gramm', xpReward: 5, metric: 'avg_less_than', targetValue: 5.0, threshold: 5.0, targetCount: 1 },
  { id: 'l1_total_sub6', level: 1, title: 'Erreiche ein Total von < 6 Gramm', xpReward: 5, metric: 'total_less_than', targetValue: 6.0, threshold: 6.0, targetCount: 1 },
  { id: 'l1_avg_sub25', level: 1, title: 'In einem Spiel einen Durchschnitt unter 2,5 Gramm', xpReward: 5, titleReward: 'Scharfschütze', metric: 'avg_less_than', targetValue: 2.5, threshold: 2.5, targetCount: 1 },
  { id: 'l1_zero_schnaepse', level: 1, title: 'In einem Standardspiel 0 Schnäpse', xpReward: 5, titleReward: 'Jungfrau', metric: 'max_schnaepse', targetValue: 0, threshold: 0, targetCount: 1, gameMode: 'Standardspiel' },

  // --- LEVEL 2 ---
  { id: 'l2_10_standard', level: 2, title: 'Spiele 10 Standardspiele', xpReward: 10, metric: 'games_count', targetValue: 10, targetCount: 10, gameMode: 'Standardspiel' },
  { id: 'l2_5_speed', level: 2, title: 'Spiele 5 Speedwiegen', xpReward: 10, metric: 'games_count', targetValue: 5, targetCount: 5, gameMode: 'Speedwiegen' },
  { id: 'l2_teamwiegen_4', level: 2, title: 'Nimm an 4 Teamwiegen teil', xpReward: 10, metric: 'teamwiegen_count', targetValue: 4, targetCount: 4 },
  { id: 'l2_tournament_2', level: 2, title: 'Nimm an 2 Turnieren teil', xpReward: 15, metric: 'tournament_count', targetValue: 2, targetCount: 2 },
  { id: 'l2_5x_avg_sub5', level: 2, title: 'Erreiche 5x einen Durchschnitt < 5 Gramm', xpReward: 10, metric: 'avg_less_than', targetValue: 5.0, threshold: 5.0, targetCount: 5 },
  { id: 'l2_5x_total_sub7', level: 2, title: 'Erreiche 5x ein Total < 7 Gramm', xpReward: 10, metric: 'total_less_than', targetValue: 7.0, threshold: 7.0, targetCount: 5 },
  { id: 'l2_5x_sub4_schnaepse', level: 2, title: 'Spiele 5 Spiele mit weniger als 4 Schnäppse', xpReward: 10, metric: 'max_schnaepse', targetValue: 3, threshold: 3, targetCount: 5 },
  { id: 'l2_50_achievements', level: 2, title: 'Sammle 50 Achievements', xpReward: 20, metric: 'achievements_count', targetValue: 50, targetCount: 50, colorReward: 'pink', rewardDescription: 'Hintergrundfarbe Rosa' },
  { id: 'l2_5_wins_standard', level: 2, title: 'Gewinne 5 Standardspiele', xpReward: 20, metric: 'wins_count', targetValue: 5, targetCount: 5, gameMode: 'Standardspiel', colorReward: 'turquoise', rewardDescription: 'Hintergrundfarbe Türkis' },
  // Neue Level-2 Quests:
  { id: 'l2_neon_orange', level: 2, title: 'Spiele 8 Standardspiele', xpReward: 15, metric: 'games_count', targetValue: 8, targetCount: 8, gameMode: 'Standardspiel' },
  { id: 'l2_royal_blue', level: 2, title: 'Erreiche 3x einen Durchschnitt < 3 Gramm', xpReward: 15, metric: 'avg_less_than', targetValue: 3.0, threshold: 3.0, targetCount: 3, colorReward: 'royal_blue', rewardDescription: 'Hintergrundfarbe Königsblau' },
  { id: 'l2_deep_purple', level: 2, title: 'Nimm an 5 Teamwiegen teil', xpReward: 15, metric: 'teamwiegen_count', targetValue: 5, targetCount: 5, colorReward: 'deep_purple', rewardDescription: 'Hintergrundfarbe Purpur' },
  { id: 'l2_toxic_green', level: 2, title: 'Spiele 5 Speedwiegen', xpReward: 20, metric: 'games_count', targetValue: 5, targetCount: 5, gameMode: 'Speedwiegen', colorReward: 'toxic_green', rewardDescription: 'Hintergrundfarbe Giftgrün' },
  { id: 'l2_gold_solid', level: 2, title: 'Gewinne 3 Turniere', xpReward: 25, metric: 'tournament_count', targetValue: 3, targetCount: 3, colorReward: 'gold_solid', rewardDescription: 'Hintergrundfarbe Gold-Gelb' },

  // --- LEVEL 3 ---
  { id: 'l3_15_standard', level: 3, title: 'Spiele 15 Standardspiele', xpReward: 15, metric: 'games_count', targetValue: 15, targetCount: 15, gameMode: 'Standardspiel' },
  { id: 'l3_10_speed', level: 3, title: 'Spiele 10 Speedwiegen', xpReward: 15, metric: 'games_count', targetValue: 10, targetCount: 10, gameMode: 'Speedwiegen' },
  { id: 'l3_teamwiegen_6', level: 3, title: 'Nimm an 6 Teamwiegen teil', xpReward: 15, metric: 'teamwiegen_count', targetValue: 6, targetCount: 6 },
  { id: 'l3_tournament_3', level: 3, title: 'Nimm an 3 Turnieren teil', xpReward: 20, metric: 'tournament_count', targetValue: 3, targetCount: 3 },
  { id: 'l3_avg_sub2', level: 3, title: 'Durchschnitt unter 2,0 Gramm in einem Spiel', xpReward: 20, titleReward: 'Präzisions-Schütze', metric: 'avg_less_than', targetValue: 2.0, threshold: 2.0, targetCount: 1 },
  { id: 'l3_5x_sub2_schnaepse', level: 3, title: 'Spiele 5 Spiele mit maximal 2 Schnäpsen', xpReward: 15, metric: 'max_schnaepse', targetValue: 2, threshold: 2, targetCount: 5 },
  // Neue Level-3 Quests (Gemusterte & effektvolle Hintergründe):
  { id: 'l3_pattern_carbon', level: 3, title: 'Absolviere 20 Spiele', xpReward: 20, metric: 'games_count', targetValue: 20, targetCount: 20, colorReward: 'pattern_carbon', rewardDescription: 'Hintergrundmuster Carbon-Faser' },
  { id: 'l3_pattern_cyberpunk', level: 3, title: 'Erreiche 5x einen Durchschnitt unter 3 Gramm', xpReward: 25, metric: 'avg_less_than', targetValue: 3.0, threshold: 3.0, targetCount: 5, colorReward: 'pattern_cyberpunk', rewardDescription: 'Hintergrund Cyberpunk-Glitch' },
  { id: 'l3_pattern_gold_glitter', level: 3, title: 'Nimm an 8 Teamwiegen teil', xpReward: 25, metric: 'teamwiegen_count', targetValue: 8, targetCount: 8, colorReward: 'pattern_gold_glitter', rewardDescription: 'Hintergrund Goldener Glitter' },
  { id: 'l3_pattern_matrix', level: 3, title: 'Spiele 10 Speedwiegen', xpReward: 20, metric: 'games_count', targetValue: 10, targetCount: 10, gameMode: 'Speedwiegen', colorReward: 'pattern_matrix', rewardDescription: 'Hintergrund Matrix-Digital' },
  { id: 'l3_pattern_tartan', level: 3, title: 'Sammle 50 Achievements', xpReward: 25, metric: 'achievements_count', targetValue: 50, targetCount: 50, colorReward: 'pattern_tartan', rewardDescription: 'Hintergrund Tartan / Karo' },
  { 
    id: 'l3_flag_animation_quest', 
    level: 3, 
    title: 'Nimm an 5 Teamwiegen teil', 
    xpReward: 20, 
    metric: 'teamwiegen_count', 
    targetValue: 5, 
    targetCount: 5, 
    animationReward: 'flag', 
    rewardDescription: 'Animation: Flagge im Wind' 
  },
  // Level-3 Quests für Namensschild-Rahmenfarben (Swatches)
  { 
    id: 'l3_border_pink', 
    level: 3, 
    title: 'Schnapszahl-Künstler: 5x Schnapszahl treffen', 
    xpReward: 20, 
    metric: 'schnapszahl_count', 
    targetValue: 5, 
    targetCount: 5,
    colorReward: 'pink',
    rewardDescription: 'Rahmenfarbe Pink' 
  },
  { 
    id: 'l3_border_teal', 
    level: 3, 
    title: 'Hunderter-Profi: 5x glatte Hunderterzahl treffen', 
    xpReward: 20, 
    metric: 'hundreds_count', 
    targetValue: 5, 
    targetCount: 5,
    colorReward: 'teal',
    rewardDescription: 'Rahmenfarbe Türkis' 
  },

  // --- LEVEL 4 ---
  { id: 'l4_25_games_total', level: 4, title: 'Absolviere insgesamt 25 Spiele', xpReward: 20, metric: 'games_count', targetValue: 25, targetCount: 25 },
  { id: 'l4_teamwiegen_8', level: 4, title: 'Nimm an 8 Teamwiegen teil', xpReward: 20, metric: 'teamwiegen_count', targetValue: 8, targetCount: 8 },
  { id: 'l4_tournament_5', level: 4, title: 'Nimm an 5 Turnieren teil', xpReward: 25, metric: 'tournament_count', targetValue: 5, targetCount: 5 },
  { id: 'l4_5x_total_sub5', level: 4, title: 'Erreiche 5x ein Total unter 5 Gramm', xpReward: 20, metric: 'total_less_than', targetValue: 5.0, threshold: 5.0, targetCount: 5 },
  { id: 'l4_zero_schnaepse_speed', level: 4, title: 'Speedwiegen ohne einzigen Schnaps', xpReward: 25, titleReward: 'Blitzsauber', metric: 'max_schnaepse', targetValue: 0, threshold: 0, targetCount: 1, gameMode: 'Speedwiegen' },
  // Neue Level-4 Quests für entkoppelte Namenshintergrund-Animationen:
  { 
    id: 'l4_fire_animation_quest', 
    level: 4, 
    title: 'Lande 10 Volltreffer', 
    xpReward: 25, 
    metric: 'perfect_hits_count', 
    targetValue: 10, 
    targetCount: 10, 
    animationReward: 'fire', 
    rewardDescription: 'Animation: Feuer' 
  },
  { 
    id: 'l4_lightning_animation_quest', 
    level: 4, 
    title: 'Triff 10 mal eine Schnapszahl', 
    xpReward: 25, 
    metric: 'schnapszahl_count', 
    targetValue: 10, 
    targetCount: 10, 
    animationReward: 'lightning', 
    rewardDescription: 'Animation: Blitze (vertikal)' 
  },
  { 
    id: 'l4_snow_animation_quest', 
    level: 4, 
    title: 'Erziele 10 mal das selbe Gewicht wie ein anderer Spieler', 
    xpReward: 25, 
    metric: 'same_weight_count', 
    targetValue: 10, 
    targetCount: 10, 
    animationReward: 'snow', 
    rewardDescription: 'Animation: Schneeflocken' 
  },
  { 
    id: 'l4_waves_animation_quest', 
    level: 4, 
    title: 'Lande 10 mal auf einer vollen Hunderterzahl', 
    xpReward: 25, 
    metric: 'hundreds_count', 
    targetValue: 10, 
    targetCount: 10, 
    animationReward: 'waves', 
    rewardDescription: 'Animation: Wasser & Wellen' 
  },
  // Level-4 Quest: Namenshintergrund Orange
  { 
    id: 'l4_orange_poker_face', 
    level: 4, 
    title: 'Poker Face Meister: Erhalte 5x das Achievement "Poker Face"', 
    xpReward: 25, 
    metric: 'poker_face_count', 
    targetValue: 5, 
    targetCount: 5,
    colorReward: 'neon_orange',
    rewardDescription: 'Hintergrundfarbe Orange' 
  },
  // Level-4 Quests für gestaffelte Namensschild-Rahmenfarben (Swatches)
  { 
    id: 'l4_border_orange', 
    level: 4, 
    title: 'Taktischer Stratege: 5x Achievement "Stratege"', 
    xpReward: 25, 
    metric: 'strategist_count', 
    targetValue: 5, 
    targetCount: 5,
    colorReward: 'orange',
    rewardDescription: 'Rahmenfarbe Orange' 
  },
  { 
    id: 'l4_border_purple', 
    level: 4, 
    title: 'Wiegezwilling: 5x selbes Gewicht wie ein Mitspieler', 
    xpReward: 25, 
    metric: 'same_weight_count', 
    targetValue: 5, 
    targetCount: 5,
    colorReward: 'purple',
    rewardDescription: 'Rahmenfarbe Dunkelblau / Lila' 
  },
  { 
    id: 'l4_border_cyan', 
    level: 4, 
    title: 'Präzisions-Schuss: 5x exakt 5g Abstand (gesamt über Spiele)', 
    xpReward: 25, 
    metric: 'exact_five_g_count', 
    targetValue: 5, 
    targetCount: 5,
    colorReward: 'cyan',
    rewardDescription: 'Rahmenfarbe Cyan / Mint' 
  },

  // --- LEVEL 5 ---
  { id: 'l5_50_games_total', level: 5, title: 'Absolviere 50 Spiele', xpReward: 30, titleReward: 'Stammgast', metric: 'games_count', targetValue: 50, targetCount: 50 },
  { id: 'l5_teamwiegen_12', level: 5, title: 'Nimm an 12 Teamwiegen teil', xpReward: 25, titleReward: 'Team-Stütze', metric: 'teamwiegen_count', targetValue: 12, targetCount: 12 },
  { id: 'l5_tournament_7', level: 5, title: 'Nimm an 7 Turnieren teil', xpReward: 30, titleReward: 'Turnier-Stammgast', metric: 'tournament_count', targetValue: 7, targetCount: 7 },
  { id: 'l5_avg_sub15', level: 5, title: 'Fabelzeit: Durchschnitt unter 1,5 Gramm', xpReward: 30, titleReward: 'Chirurg', metric: 'avg_less_than', targetValue: 1.5, threshold: 1.5, targetCount: 1 },
  { id: 'l5_10x_avg_sub4', level: 5, title: 'Erreiche 10x einen Durchschnitt unter 4 Gramm', xpReward: 25, metric: 'avg_less_than', targetValue: 4.0, threshold: 4.0, targetCount: 10 },
  // Level-5 Quests für Namensschild-Rahmen (Animationen/Muster)
  { 
    id: 'l5_border_hearts', 
    level: 5, 
    title: 'Herzchen-Regen: 3x Achievement "67" erhalten', 
    xpReward: 30, 
    metric: 'ach_67_count', 
    targetValue: 3, 
    targetCount: 3,
    animationReward: 'hearts',
    rewardDescription: 'Rahmen: Herzchen-Regen' 
  },
  { 
    id: 'l5_border_flame', 
    level: 5, 
    title: 'Wandernde Flamme: Speedwiegen 3x Avg unter 5g', 
    xpReward: 30, 
    metric: 'speed_avg_sub5_count', 
    targetValue: 3, 
    targetCount: 3,
    animationReward: 'flame',
    rewardDescription: 'Rahmen: Wandernde Flamme' 
  },
  { 
    id: 'l5_border_lightning', 
    level: 5, 
    title: 'Elektrischer Blitz: Speedwiegen 3x Zeit unter 100s', 
    xpReward: 30, 
    metric: 'speed_time_sub100_count', 
    targetValue: 3, 
    targetCount: 3,
    animationReward: 'lightning',
    rewardDescription: 'Rahmen: Elektrischer Blitz' 
  },
  { 
    id: 'l5_border_wave', 
    level: 5, 
    title: 'Schwapp-Welle: 5x Achievement "Knapp daneben"', 
    xpReward: 30, 
    metric: 'ach_knapp_daneben_count', 
    targetValue: 5, 
    targetCount: 5,
    animationReward: 'wave',
    rewardDescription: 'Rahmen: Schwapp-Welle' 
  },
  { 
    id: 'l5_border_cyber', 
    level: 5, 
    title: 'Industrie-Neonrahmen: 5x Achievement "Kopfrechner"', 
    xpReward: 30, 
    metric: 'ach_kopfrechner_count', 
    targetValue: 5, 
    targetCount: 5,
    animationReward: 'cyber',
    rewardDescription: 'Rahmen: Industrie-Neonrahmen (Flimmern)' 
  },
  { 
    id: 'l5_border_laser', 
    level: 5, 
    title: 'Laufender Laser-Rahmen: 5x Achievement "Scharfschütze"', 
    xpReward: 30, 
    metric: 'ach_scharfschuetze_count', 
    targetValue: 5, 
    targetCount: 5,
    animationReward: 'laser',
    rewardDescription: 'Rahmen: Laufender Laser-Rahmen' 
  },
  { 
    id: 'l5_border_snow', 
    level: 5, 
    title: 'Eiszapfen / Schnee: 5x Wiegezwilling werden', 
    xpReward: 30, 
    metric: 'same_weight_count', 
    targetValue: 5, 
    targetCount: 5,
    animationReward: 'snow-frame',
    rewardDescription: 'Rahmen: Eiszapfen / Schnee' 
  },
  { 
    id: 'l5_border_matrix', 
    level: 5, 
    title: 'Matrix-Code-Rahmen: 5x Achievement "Stratege"', 
    xpReward: 30, 
    metric: 'strategist_count', 
    targetValue: 5, 
    targetCount: 5,
    animationReward: 'matrix-frame',
    rewardDescription: 'Rahmen: Matrix-Code-Rahmen' 
  },

  // --- LEVEL 6 ---
  { id: 'l6_20_speed', level: 6, title: 'Spiele 20 Speedwiegen', xpReward: 30, metric: 'games_count', targetValue: 20, targetCount: 20, gameMode: 'Speedwiegen' },
  { id: 'l6_teamwiegen_15', level: 6, title: 'Nimm an 15 Teamwiegen teil', xpReward: 30, metric: 'teamwiegen_count', targetValue: 15, targetCount: 15 },
  { id: 'l6_tournament_10', level: 6, title: 'Nimm an 10 Turnieren teil', xpReward: 35, metric: 'tournament_count', targetValue: 10, targetCount: 10 },
  { id: 'l6_5x_avg_sub2', level: 6, title: 'Erreiche 5x einen Durchschnitt unter 2 Gramm', xpReward: 35, titleReward: 'Konstanz-Monster', metric: 'avg_less_than', targetValue: 2.0, threshold: 2.0, targetCount: 5 },
  { id: 'l6_10x_total_sub4', level: 6, title: 'Erreiche 10x ein Total unter 4 Gramm', xpReward: 35, metric: 'total_less_than', targetValue: 4.0, threshold: 4.0, targetCount: 10 },

  // --- LEVEL 7 ---
  { id: 'l7_75_games_total', level: 7, title: 'Absolviere 75 Spiele', xpReward: 40, metric: 'games_count', targetValue: 75, targetCount: 75 },
  { id: 'l7_teamwiegen_20', level: 7, title: 'Nimm an 20 Teamwiegen teil', xpReward: 35, metric: 'teamwiegen_count', targetValue: 20, targetCount: 20 },
  { id: 'l7_tournament_12', level: 7, title: 'Nimm an 12 Turnieren teil', xpReward: 40, metric: 'tournament_count', targetValue: 12, targetCount: 12 },
  { id: 'l7_avg_sub1', level: 7, title: 'Perfektioniert: Durchschnitt unter 1,0 Gramm!', xpReward: 50, titleReward: 'Meister der Waage', metric: 'avg_less_than', targetValue: 1.0, threshold: 1.0, targetCount: 1 },
  { id: 'l7_10x_zero_schnaepse', level: 7, title: 'Absolviere 10 Spiele ohne einen Schnaps', xpReward: 40, titleReward: 'Nüchterner Meister', metric: 'max_schnaepse', targetValue: 0, threshold: 0, targetCount: 10 },

  // --- LEVEL 8 ---
  { id: 'l8_50_standard', level: 8, title: 'Spiele 50 Standardspiele', xpReward: 45, metric: 'games_count', targetValue: 50, targetCount: 50, gameMode: 'Standardspiel' },
  { id: 'l8_teamwiegen_25', level: 8, title: 'Nimm an 25 Teamwiegen teil', xpReward: 40, metric: 'teamwiegen_count', targetValue: 25, targetCount: 25 },
  { id: 'l8_tournament_15', level: 8, title: 'Nimm an 15 Turnieren teil', xpReward: 45, titleReward: 'Turnier-Veteran', metric: 'tournament_count', targetValue: 15, targetCount: 15 },
  { id: 'l8_5x_total_sub3', level: 8, title: 'Erreiche 5x ein Total unter 3 Gramm', xpReward: 50, metric: 'total_less_than', targetValue: 3.0, threshold: 3.0, targetCount: 5 },

  // --- LEVEL 9 ---
  { id: 'l9_100_games_total', level: 9, title: 'Absolviere 100 Spiele', xpReward: 60, titleReward: 'Veteran', metric: 'games_count', targetValue: 100, targetCount: 100 },
  { id: 'l9_teamwiegen_30', level: 9, title: 'Nimm an 30 Teamwiegen teil', xpReward: 50, titleReward: 'Team-Legende', metric: 'teamwiegen_count', targetValue: 30, targetCount: 30 },
  { id: 'l9_tournament_20', level: 9, title: 'Nimm an 20 Turnieren teil', xpReward: 55, metric: 'tournament_count', targetValue: 20, targetCount: 20 },
  { id: 'l9_10x_avg_sub15', level: 9, title: 'Erreiche 10x einen Durchschnitt unter 1,5 Gramm', xpReward: 60, metric: 'avg_less_than', targetValue: 1.5, threshold: 1.5, targetCount: 10 },

  // --- LEVEL 10 ---
  { id: 'l10_teamwiegen_40', level: 10, title: 'Nimm an 40 Teamwiegen teil', xpReward: 70, metric: 'teamwiegen_count', targetValue: 40, targetCount: 40 },
  { id: 'l10_tournament_25', level: 10, title: 'Nimm an 25 Turnieren teil', xpReward: 75, titleReward: 'Turnier-Gott', metric: 'tournament_count', targetValue: 25, targetCount: 25 },
  { id: 'l10_legend_avg', level: 10, title: 'Legendreifer Durchschnitt unter 0,8 Gramm', xpReward: 100, titleReward: 'Unantastbar', metric: 'avg_less_than', targetValue: 0.8, threshold: 0.8, targetCount: 1 },
  { id: 'l10_20x_zero_schnaepse', level: 10, title: 'Absolviere 20 Spiele völlig ohne Schnäpse', xpReward: 80, titleReward: 'Fehlerfrei', metric: 'max_schnaepse', targetValue: 0, threshold: 0, targetCount: 20 }
];

/**
 * Ermittelt einen eindeutigen Schlüssel für ein Turnier anhand des Turniernamens.
 * Tische, Vorrunden und Finalrunden desselben Turniers (z.B. "Sommerturnier - Vorrunde",
 * "Sommerturnier - Finale", "Sommerturnier (Tisch 1)") werden auf den gemeinsamen
 * Grundnamen ("sommerturnier") normiert, sodass sie als ein einziges Turnier zählen.
 */
export function getCanonicalTournamentKey(r: any): string | null {
  if (!r) return null;

  const rawMode = String(r.game_mode || '').toLowerCase();
  const isTournament =
    r.is_tournament === true ||
    Boolean(r.tournament_id) ||
    Boolean(r.tournament_name) ||
    rawMode.includes('turnier');

  if (!isTournament) return null;

  let rawName = String(r.tournament_name || '').trim();

  // Falls kein tournament_name vorliegt, versuchen wir den Namen aus game_mode zu extrahieren
  if (!rawName && rawMode.includes('turnier')) {
    const bracketMatch = String(r.game_mode).match(/turnier(?:spiel)?\s*[\(:–—]\s*([^)\n]+)[\)]?/i);
    if (bracketMatch && bracketMatch[1]) {
      const candidate = bracketMatch[1].trim();
      if (!/^(?:tisch(?:\s*\d+)?|table(?:\s*\d+)?|vorrunde|finale)$/i.test(candidate)) {
        rawName = candidate;
      }
    }
  }

  if (rawName) {
    let clean = rawName.toLowerCase();
    
    // 1. Klammern mit Runden-/Tisch-Angaben entfernen:
    clean = clean.replace(/\s*[\(\[\{](?:vorrunde|finale|finalrunde|finaltisch|final|halbfinale|viertelfinale|second\s*chance|trostrunde|gruppe\s*[a-z0-9]+|tisch\s*\d+|table\s*\d+|runde\s*\d+)[^\)\]\}]*[\)\]\}]/gi, '');
    
    // 2. Trennzeichen (- , : /) gefolgt von Runden-/Tischangaben entfernen:
    clean = clean.replace(/\s*[-–—:/]\s*(?:vorrunde|finale|finalrunde|finaltisch|final|halbfinale|viertelfinale|second\s*chance|trostrunde|gruppe\s*[a-z0-9]+|tisch\s*\d+|table\s*\d+|runde\s*\d+)\b.*$/gi, '');
    
    // 3. Nachgestellte Wörter für Runde/Tisch entfernen:
    clean = clean.replace(/\s+\b(?:vorrunde|finale|finalrunde|finaltisch|final|halbfinale|viertelfinale|second\s*chance|trostrunde|tisch\s*\d+|table\s*\d+|runde\s*\d+)$/gi, '');
    
    // 4. Leerzeichen und Satzzeichen am Ende bereinigen
    clean = clean.replace(/[\s\-–—:/.]+$/, '').trim();

    // Falls die Bereinigung den ganzen Namen geleert hätte, Original behalten
    if (!clean) {
      clean = rawName.toLowerCase().trim();
    }

    if (clean) {
      return `name:${clean}`;
    }
  }

  // Fallback: tournament_id (falls vorhanden, z.B. turnier-uuid ohne Suffix)
  if (r.tournament_id) {
    let tid = String(r.tournament_id).trim().toLowerCase();
    tid = tid.replace(/_(?:table_\d+|final|second_chance|round_\d+|vorrunde)$/i, '');
    return `id:${tid}`;
  }

  // Fallback: Wenn mehrere Turnierspiele am selben Datum gespielt wurden, gehören sie zum selben Turnier
  const dateKey = r.date || (r.created_at ? new Date(r.created_at).toLocaleDateString('de-DE') : null);
  if (dateKey) {
    return `date:${String(dateKey).trim()}`;
  }

  return `game:${r.id || 'unknown'}`;
}

export function getQuestTarget(quest: QuestDefinition): number {
  if (quest.targetCount !== undefined) return quest.targetCount;
  if (quest.metric === 'profile_pic') return 1;
  if (quest.metric === 'games_count') return quest.targetValue;
  return 1;
}

export type QuestStatMetric =
  | 'perfect_hits_count'
  | 'schnapszahl_count'
  | 'same_weight_count'
  | 'hundreds_count'
  | 'exact_five_g_count'
  | 'strategist_count'
  | 'ach_67_count'
  | 'speed_avg_sub5_count'
  | 'speed_time_sub100_count'
  | 'ach_knapp_daneben_count'
  | 'ach_kopfrechner_count'
  | 'ach_scharfschuetze_count'
  | 'poker_face_count';

interface TimestampedQuestEvent {
  metric: string;
  amount: number;
  ts: number;
}

/**
 * Parst den Zeitstempel eines Spiels oder Achievements in Epoch-Millisekunden.
 * Gibt null zurück, wenn kein gültiges Datum vorhanden ist (verhindert rückwirkende Anrechnung).
 */
export function getQuestEventTimestampMs(record: any): number | null {
  if (!record) return null;
  const iso = record.created_at || record.timestamp;
  if (iso) {
    const parsed = new Date(iso).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  if (typeof record.date === 'string' && record.date.trim()) {
    const d = record.date.trim();
    const deMatch = d.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (deMatch) {
      const parsed = new Date(Date.UTC(Number(deMatch[3]), Number(deMatch[2]) - 1, Number(deMatch[1]), 0, 0, 0)).getTime();
      if (!isNaN(parsed)) return parsed;
    }
    const parsed = new Date(d).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}

function getStoredQuestEventList(userId: string): TimestampedQuestEvent[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`bundeswiega_quest_events_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function getStoredQuestEventsCount(userId: string, metric: string, sinceMs: number): number {
  if (!userId) return 0;
  const events = getStoredQuestEventList(userId);
  return events
    .filter(ev => ev && ev.metric === metric && typeof ev.ts === 'number' && ev.ts >= sinceMs)
    .reduce((sum, ev) => sum + (Number(ev.amount) || 0), 0);
}

export function getStoredQuestStats(userId: string, sinceIso?: string): Record<string, number> {
  if (!userId) return {};
  try {
    if (sinceIso) {
      const sinceMs = new Date(sinceIso).getTime();
      if (isNaN(sinceMs)) return {};
      const counts: Record<string, number> = {};
      for (const ev of getStoredQuestEventList(userId)) {
        if (ev && ev.metric && typeof ev.ts === 'number' && ev.ts >= sinceMs) {
          counts[ev.metric] = (counts[ev.metric] || 0) + (Number(ev.amount) || 0);
        }
      }
      return counts;
    }
    const pendingRaw = localStorage.getItem(`bundeswiega_quest_pending_${userId}`);
    if (pendingRaw) return JSON.parse(pendingRaw);
  } catch {}
  return {};
}

export function consumePendingQuestIncrements(userId: string): Record<string, number> {
  if (!userId) return {};
  try {
    const raw = localStorage.getItem(`bundeswiega_quest_pending_${userId}`);
    localStorage.removeItem(`bundeswiega_quest_pending_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    }
  } catch {}
  return {};
}

export function clearAllPendingQuestIncrements(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('bundeswiega_quest_pending_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch {}
}

export interface UserQuestCounters {
  schnapszahl: number;
  hunderter: number;
  stratege: number;
  zwilling: number;
  exactFiveG: number;
  // Level 5 Quest-Rahmen
  ach_67: number;
  speed_avg_sub5: number;
  speed_time_sub100: number;
  ach_knapp_daneben: number;
  ach_kopfrechner: number;
  ach_scharfschuetze: number;
  pokerFace: number;
}

export function recordQuestStat(
  userId: string,
  metric: QuestStatMetric,
  amount: number = 1
): number {
  if (!userId || amount <= 0) return 0;
  try {
    const now = Date.now();
    // 1. Zeitgestempelten Event-Log für lokale Auswertung (strikt >= created_at) fortschreiben
    const events = getStoredQuestEventList(userId);
    events.push({ metric, amount, ts: now });
    const trimmed = events.length > 2000 ? events.slice(events.length - 2000) : events;
    localStorage.setItem(`bundeswiega_quest_events_${userId}`, JSON.stringify(trimmed));

    // 2. Runden-/Spiel-Inkremente nur für das laufende Spiel sammeln (wird beim Speichern verbraucht)
    const pendingRaw = localStorage.getItem(`bundeswiega_quest_pending_${userId}`);
    const pending: Record<string, number> = pendingRaw ? JSON.parse(pendingRaw) : {};
    const updatedPending = (Number(pending[metric]) || 0) + amount;
    pending[metric] = updatedPending;
    localStorage.setItem(`bundeswiega_quest_pending_${userId}`, JSON.stringify(pending));
    return updatedPending;
  } catch {}
  return 0;
}

function getEffectiveCounterForQuests(
  questIds: string[],
  target: number,
  questProgresses: any[] | undefined,
  directVal: number | undefined,
  fallbackAfterStart: (startMs: number) => number
): number {
  if (directVal !== undefined) return Number(directVal) || 0;

  if (Array.isArray(questProgresses)) {
    const matching = questProgresses.filter(qp => questIds.includes(qp.quest_id));
    // Wenn diese Quest für den Nutzer noch gar nicht existiert/freigeschaltet wurde -> strikt 0 (kein Vorausarbeiten)
    if (matching.length === 0) return 0;

    let best = 0;
    for (const qp of matching) {
      if (qp.is_completed) {
        best = Math.max(best, target);
        continue;
      }
      const stored = Number(qp.current_progress) || 0;
      const createdAtStr = qp.created_at || qp.updated_at;
      const startMs = createdAtStr ? new Date(createdAtStr).getTime() : NaN;
      const scopedFallback = !isNaN(startMs) ? fallbackAfterStart(startMs) : 0;
      best = Math.max(best, stored, scopedFallback);
    }
    return best;
  }

  return 0;
}

/**
 * Ermittelt kumulierte Zähler über mehrere Spiele für die Namensschild-Rahmenfarben und Level 5 Quest-Rahmen.
 * Zählt Ereignisse strikt erst ab `user_quest_progress.created_at`.
 */
export function getUserQuestCounters(
  userId?: string,
  questProgresses?: any[],
  myGameData?: any[],
  myAchievementsData?: any[],
  directUserQuests?: Partial<UserQuestCounters>
): UserQuestCounters {
  const filterGamesSince = (startMs: number) =>
    Array.isArray(myGameData)
      ? myGameData.filter(g => {
          const ts = getQuestEventTimestampMs(g);
          return ts !== null && ts >= startMs;
        })
      : [];

  const hasAchSince = (achIds: string[], titles: string[], startMs: number) => {
    if (!Array.isArray(myAchievementsData)) return 0;
    return myAchievementsData.filter(a => {
      if (!(a.unlocked || a.is_unlocked)) return false;
      const idMatch = achIds.includes(a.achievement_id) || achIds.includes(a.id) || (a.title && titles.includes(a.title));
      if (!idMatch) return false;
      const ts = getQuestEventTimestampMs(a);
      return ts !== null && ts >= startMs;
    }).length;
  };

  // 1. Schnapszahl
  const schnapszahl = getEffectiveCounterForQuests(
    ['l4_lightning_animation_quest', 'l3_border_pink'],
    5,
    questProgresses,
    directUserQuests?.schnapszahl,
    (startMs) => (userId ? getStoredQuestEventsCount(userId, 'schnapszahl_count', startMs) : 0)
  );

  // 2. Hunderter
  const hunderter = getEffectiveCounterForQuests(
    ['l4_waves_animation_quest', 'l3_border_teal'],
    5,
    questProgresses,
    directUserQuests?.hunderter,
    (startMs) => (userId ? getStoredQuestEventsCount(userId, 'hundreds_count', startMs) : 0)
  );

  // 3. Stratege (target: 5)
  const stratege = getEffectiveCounterForQuests(
    ['l4_border_orange', 'l5_border_matrix'],
    5,
    questProgresses,
    directUserQuests?.stratege,
    (startMs) => {
      const ev = userId ? getStoredQuestEventsCount(userId, 'strategist_count', startMs) : 0;
      const ach = hasAchSince(['strategist'], ['Stratege'], startMs);
      return Math.max(ev, ach);
    }
  );

  // 4. Wiegezwilling (target: 5)
  const zwilling = getEffectiveCounterForQuests(
    ['l4_snow_animation_quest', 'l4_border_purple', 'l5_border_snow'],
    5,
    questProgresses,
    directUserQuests?.zwilling,
    (startMs) => (userId ? getStoredQuestEventsCount(userId, 'same_weight_count', startMs) : 0)
  );

  // 5. Exakt 5g Abstand (target: 5)
  const exactFiveG = getEffectiveCounterForQuests(
    ['l4_border_cyan'],
    5,
    questProgresses,
    directUserQuests?.exactFiveG,
    (startMs) => {
      const ev = userId ? getStoredQuestEventsCount(userId, 'exact_five_g_count', startMs) : 0;
      let fiveGCount = 0;
      for (const g of filterGamesSince(startMs)) {
        if (Array.isArray(g.rounds)) {
          for (const r of g.rounds) {
            const dist = typeof r.dist === 'number' ? r.dist : (typeof r.distance === 'number' ? r.distance : null);
            if (dist !== null && Math.abs(dist - 5) < 0.05) fiveGCount++;
          }
        }
      }
      return Math.max(ev, fiveGCount);
    }
  );

  // 6. ach_67: 3x Achievement 67 ("six_seven")
  const ach_67 = getEffectiveCounterForQuests(
    ['l5_border_hearts'],
    3,
    questProgresses,
    directUserQuests?.ach_67,
    (startMs) => {
      const ev = userId ? getStoredQuestEventsCount(userId, 'ach_67_count', startMs) : 0;
      const ach = hasAchSince(['six_seven'], ['Six Seven', '67'], startMs);
      let count67 = 0;
      for (const g of filterGamesSince(startMs)) {
        if (Array.isArray(g.rounds)) {
          for (const r of g.rounds) {
            const w = typeof r.weight === 'number' ? r.weight : (typeof r.user_weight === 'number' ? r.user_weight : null);
            if (w !== null && Math.round(w) === 67) count67++;
          }
        }
      }
      return Math.max(ev, ach, count67);
    }
  );

  // 7. speed_avg_sub5: Speedwiegen 3x Avg unter 5g
  const speed_avg_sub5 = getEffectiveCounterForQuests(
    ['l5_border_flame'],
    3,
    questProgresses,
    directUserQuests?.speed_avg_sub5,
    (startMs) => {
      const ev = userId ? getStoredQuestEventsCount(userId, 'speed_avg_sub5_count', startMs) : 0;
      const sub5Games = filterGamesSince(startMs).filter(g => {
        const mode = (g.game_mode || '').toLowerCase();
        const isSpeed = mode.includes('speed') || !!g.is_speed_mode;
        const avg = typeof g.avg === 'number' ? g.avg : (typeof g.average === 'number' ? g.average : (typeof g.average_distance === 'number' ? g.average_distance : null));
        return isSpeed && avg !== null && avg < 5.0;
      }).length;
      return Math.max(ev, sub5Games);
    }
  );

  // 8. speed_time_sub100: Speedwiegen 3x Zeit unter 100s
  const speed_time_sub100 = getEffectiveCounterForQuests(
    ['l5_border_lightning'],
    3,
    questProgresses,
    directUserQuests?.speed_time_sub100,
    (startMs) => {
      const ev = userId ? getStoredQuestEventsCount(userId, 'speed_time_sub100_count', startMs) : 0;
      const sub100Games = filterGamesSince(startMs).filter(g => {
        const mode = (g.game_mode || '').toLowerCase();
        const isSpeed = mode.includes('speed') || !!g.is_speed_mode;
        const t = typeof g.total_time === 'number' ? g.total_time : (typeof g.time === 'number' ? g.time : (typeof g.time_seconds === 'number' ? g.time_seconds : null));
        return isSpeed && t !== null && t > 0 && t < 100;
      }).length;
      return Math.max(ev, sub100Games);
    }
  );

  // 9. ach_knapp_daneben: 5x Achievement "Knapp daneben" ("so_close")
  const ach_knapp_daneben = getEffectiveCounterForQuests(
    ['l5_border_wave'],
    5,
    questProgresses,
    directUserQuests?.ach_knapp_daneben,
    (startMs) => {
      const ev = userId ? getStoredQuestEventsCount(userId, 'ach_knapp_daneben_count', startMs) : 0;
      const ach = hasAchSince(['so_close'], ['Knapp daneben'], startMs);
      let countClose = 0;
      for (const g of filterGamesSince(startMs)) {
        if (Array.isArray(g.rounds)) {
          for (const r of g.rounds) {
            const dist = typeof r.dist === 'number' ? r.dist : (typeof r.distance === 'number' ? r.distance : null);
            if (dist !== null && Math.abs(dist - 1) < 0.05) countClose++;
          }
        }
      }
      return Math.max(ev, ach, countClose);
    }
  );

  // 10. ach_kopfrechner: 5x Achievement "Kopfrechner" ("calculator")
  const ach_kopfrechner = getEffectiveCounterForQuests(
    ['l5_border_cyber'],
    5,
    questProgresses,
    directUserQuests?.ach_kopfrechner,
    (startMs) => {
      const ev = userId ? getStoredQuestEventsCount(userId, 'ach_kopfrechner_count', startMs) : 0;
      const ach = hasAchSince(['calculator'], ['Kopfrechner'], startMs);
      return Math.max(ev, ach);
    }
  );

  // 11. ach_scharfschuetze: 5x Achievement "Scharfschütze" ("sharpshooter")
  const ach_scharfschuetze = getEffectiveCounterForQuests(
    ['l5_border_laser'],
    5,
    questProgresses,
    directUserQuests?.ach_scharfschuetze,
    (startMs) => {
      const ev = userId ? getStoredQuestEventsCount(userId, 'ach_scharfschuetze_count', startMs) : 0;
      const ach = hasAchSince(['sharpshooter'], ['Scharfschütze'], startMs);
      return Math.max(ev, ach);
    }
  );

  // 12. pokerFace: 5x Achievement "Poker Face" ("poker_face")
  const pokerFace = getEffectiveCounterForQuests(
    ['l4_orange_poker_face'],
    5,
    questProgresses,
    directUserQuests?.pokerFace,
    (startMs) => {
      const ev = userId ? getStoredQuestEventsCount(userId, 'poker_face_count', startMs) : 0;
      const ach = hasAchSince(['poker_face', 'pokerface'], ['Poker Face'], startMs);
      return Math.max(ev, ach);
    }
  );

  return {
    schnapszahl,
    hunderter,
    stratege,
    zwilling,
    exactFiveG,
    ach_67,
    speed_avg_sub5,
    speed_time_sub100,
    ach_knapp_daneben,
    ach_kopfrechner,
    ach_scharfschuetze,
    pokerFace
  };
}

export async function processQuestsForUser(userId: string, customClient?: any) {
  if (!userId) return;

  const db = customClient || defaultClient;
  if (!db) return;

  try {
    let profile: any = null;
    try {
      const { data } = await db
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      profile = data;
    } catch (profErr) {
      console.warn('Could not select * from profiles in questEvaluator:', profErr);
    }

    let userLevel = profile ? Number(profile.level) || 1 : 1;
    let effectiveAvatarUrl = profile?.avatar_url || profile?.image_url || '';

    if (!effectiveAvatarUrl || effectiveAvatarUrl.includes('unknown.svg')) {
      try {
        if (db.auth?.getUser) {
          const { data: authData } = await db.auth.getUser();
          if (authData?.user?.id === userId && authData.user.user_metadata?.avatar_url) {
            effectiveAvatarUrl = authData.user.user_metadata.avatar_url;
          }
        }
      } catch {}

      try {
        if (db.auth?.admin?.getUserById) {
          const { data: adminAuthData } = await db.auth.admin.getUserById(userId);
          if (adminAuthData?.user?.user_metadata?.avatar_url) {
            effectiveAvatarUrl = adminAuthData.user.user_metadata.avatar_url;
          }
        }
      } catch {}
    }

    if (effectiveAvatarUrl && !effectiveAvatarUrl.includes('unknown.svg') && profile && !profile.avatar_url) {
      try {
        await db.from('profiles').update({ avatar_url: effectiveAvatarUrl }).eq('id', userId);
      } catch {}
    }

    let safeResults: any[] = [];
    try {
      const { data: results } = await db
        .from('game_results')
        .select('*')
        .eq('user_id', userId);
      if (Array.isArray(results)) {
        safeResults = [...results];
      }
    } catch {}

    let teamGameIds: string[] = [];
    try {
      const { data: teamPlayers } = await db
        .from('teamwiegen_players')
        .select('game_id')
        .eq('user_id', userId);

      teamGameIds = (teamPlayers || []).map((t: any) => t.game_id).filter(Boolean);

      if (teamGameIds.length > 0) {
        const { data: teamGames } = await db
          .from('game_results')
          .select('*')
          .in('id', teamGameIds);

        if (Array.isArray(teamGames) && teamGames.length > 0) {
          const existingIds = new Set(safeResults.map(r => r.id));
          for (const tg of teamGames) {
            if (!existingIds.has(tg.id)) {
              safeResults.push({
                ...tg,
                is_team_player: true
              });
              existingIds.add(tg.id);
            } else {
              const existing = safeResults.find(r => r.id === tg.id);
              if (existing) {
                existing.is_team_player = true;
              }
            }
          }
        }
      }
    } catch {}

    let questProgress: any[] = [];
    try {
      const { data: qpData } = await db
        .from('user_quest_progress')
        .select('*')
        .eq('user_id', userId);
      if (Array.isArray(qpData)) {
        questProgress = qpData;
      }
    } catch {}

    let existingTitles: any[] = [];
    try {
      const { data: tData } = await db
        .from('user_titles')
        .select('title')
        .eq('user_id', userId);
      if (Array.isArray(tData)) {
        existingTitles = tData;
      }
    } catch {}

    const completedQuestIds = new Set(questProgress.filter((qp: any) => qp.is_completed).map((qp: any) => qp.quest_id));
    const unlockedTitles = new Set(existingTitles.map((t: any) => t.title));
    
    let userAchRows: Array<{ achievement_id: string; created_at?: string | null }> = [];
    try {
      const { data: achData } = await db
        .from('achievements')
        .select('achievement_id, created_at')
        .eq('user_id', userId);
      if (Array.isArray(achData)) {
        userAchRows = achData;
      }
    } catch {}

    const questProgressMap = new Map<string, any>();
    questProgress.forEach((qp: any) => {
      if (qp?.quest_id) {
        questProgressMap.set(qp.quest_id, qp);
      }
    });

    const availableQuests = LEVEL_QUESTS.filter(q => q.level <= userLevel && !completedQuestIds.has(q.id));

    let bonusXpEarned = 0;
    const nowIso = new Date().toISOString();

    for (const q of availableQuests) {
      const existingProgressObj = questProgressMap.get(q.id);
      const targetCount = getQuestTarget(q);

      if (!existingProgressObj) {
        // Neu freigeschaltete Quest initialisieren -> startet strikt bei 0 (kein Vorausarbeiten),
        // Ausnahme: l1_profile_pic (Zustandsprüfung ob Profilbild bereits existiert)
        const hasAvatar =
          effectiveAvatarUrl &&
          typeof effectiveAvatarUrl === 'string' &&
          effectiveAvatarUrl.trim() !== '' &&
          !effectiveAvatarUrl.includes('unknown.svg');
        const initialProgress = q.metric === 'profile_pic' && hasAvatar ? 1 : 0;
        const initialCompleted = initialProgress >= targetCount;

        try {
          await db.from('user_quest_progress').upsert({
            user_id: userId,
            quest_id: q.id,
            current_progress: Math.min(initialProgress, targetCount),
            is_completed: initialCompleted,
            completed_at: initialCompleted ? nowIso : null,
            created_at: nowIso,
            updated_at: nowIso
          }, { onConflict: 'user_id,quest_id' });
        } catch (err) {
          console.warn('Could not initialize quest progress:', err);
        }

        if (initialCompleted) {
          bonusXpEarned += q.xpReward;
          completedQuestIds.add(q.id);
        }
        continue;
      }

      const questStartedAt: string = existingProgressObj.created_at || existingProgressObj.updated_at || nowIso;
      const startMs = new Date(questStartedAt).getTime();

      // Strikt nur Ereignisse >= user_quest_progress.created_at werten (undatierte Legacy-Spiele ignorieren)
      const filteredResults = safeResults.filter(r => {
        const eventMs = getQuestEventTimestampMs(r);
        return eventMs !== null && eventMs >= startMs;
      });

      const questAchievementRows = userAchRows.filter(a => {
        const achMs = getQuestEventTimestampMs(a);
        return achMs !== null && achMs >= startMs;
      });
      const questAchievementIds = new Set(questAchievementRows.map(a => String(a.achievement_id)));

      const currentStored = Number(existingProgressObj.current_progress || 0);
      let progress = currentStored;

      switch (q.metric) {
        case 'profile_pic':
          if (
            effectiveAvatarUrl &&
            typeof effectiveAvatarUrl === 'string' &&
            effectiveAvatarUrl.trim() !== '' &&
            !effectiveAvatarUrl.includes('unknown.svg')
          ) {
            progress = 1;
          }
          break;

        case 'games_count': {
          const cnt = filteredResults.filter(r => {
            if (!q.gameMode) return true;
            const targetModeNorm = normalizeGameMode(q.gameMode);
            const rModeNorm = normalizeGameMode(r.game_mode);
            if (rModeNorm === targetModeNorm) return true;
            const target = q.gameMode.toLowerCase();
            const raw = (r.game_mode || '').toLowerCase();
            if (target.includes('team') && (raw.includes('team') || r.is_team_player === true)) return true;
            return raw.includes(target);
          }).length;
          progress = Math.max(currentStored, cnt);
          break;
        }

        case 'avg_less_than': {
          const threshold = q.threshold !== undefined ? q.threshold : q.targetValue;
          const cnt = filteredResults.filter(r => {
            if (q.gameMode) {
              const targetModeNorm = normalizeGameMode(q.gameMode);
              const rModeNorm = normalizeGameMode(r.game_mode);
              if (rModeNorm !== targetModeNorm && !(targetModeNorm === 'Teamwiegen' && (r.is_team_player || (r.game_mode || '').toLowerCase().includes('team')))) {
                return false;
              }
            }
            return r.avg !== null && r.avg !== undefined && Number(r.avg) < threshold;
          }).length;
          progress = Math.max(currentStored, cnt);
          break;
        }

        case 'total_less_than': {
          const threshold = q.threshold !== undefined ? q.threshold : q.targetValue;
          const cnt = filteredResults.filter(r => {
            if (q.gameMode) {
              const targetModeNorm = normalizeGameMode(q.gameMode);
              const rModeNorm = normalizeGameMode(r.game_mode);
              if (rModeNorm !== targetModeNorm && !(targetModeNorm === 'Teamwiegen' && (r.is_team_player || (r.game_mode || '').toLowerCase().includes('team')))) {
                return false;
              }
            }
            return r.total !== null && r.total !== undefined && Number(r.total) < threshold;
          }).length;
          progress = Math.max(currentStored, cnt);
          break;
        }

        case 'max_schnaepse': {
          const threshold = q.threshold !== undefined ? q.threshold : q.targetValue;
          const cnt = filteredResults.filter(r => {
            if (q.gameMode) {
              const targetModeNorm = normalizeGameMode(q.gameMode);
              const rModeNorm = normalizeGameMode(r.game_mode);
              if (rModeNorm !== targetModeNorm && !(targetModeNorm === 'Teamwiegen' && (r.is_team_player || (r.game_mode || '').toLowerCase().includes('team')))) {
                return false;
              }
            }
            return r.schnaepse !== null && r.schnaepse !== undefined && Number(r.schnaepse) <= threshold;
          }).length;
          progress = Math.max(currentStored, cnt);
          break;
        }

        case 'teamwiegen_count': {
          const isTeamGame = (r: any): boolean => {
            if (!r) return false;
            if (r.is_team_player || r.is_team_member) return true;
            const raw = String(r.game_mode || '').toLowerCase();
            if (raw.includes('team')) return true;
            const norm = normalizeGameMode(r.game_mode);
            return norm === 'Teamwiegen';
          };

          const matchingTeamGames = filteredResults.filter(isTeamGame);
          const uniqueGameIds = new Set<string>();
          matchingTeamGames.forEach(g => {
            if (g.id) uniqueGameIds.add(String(g.id));
          });
          progress = Math.max(currentStored, uniqueGameIds.size || matchingTeamGames.length);
          break;
        }

        case 'tournament_count': {
          const uniqueTournaments = new Set<string>();

          for (const r of filteredResults) {
            const key = getCanonicalTournamentKey(r);
            if (key) {
              uniqueTournaments.add(key);
            }
          }

          progress = Math.max(currentStored, uniqueTournaments.size);
          break;
        }

        case 'achievements_count': {
          let count = questAchievementRows.length;
          try {
            const { count: exactCount } = await db
              .from('achievements')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', userId)
              .gte('created_at', questStartedAt);
            if (typeof exactCount === 'number') {
              count = Math.max(count, exactCount);
            }
          } catch {}
          progress = Math.max(currentStored, count);
          break;
        }

        case 'wins_count': {
          const cnt = filteredResults.filter(r => {
            if (q.gameMode) {
              const targetNorm = normalizeGameMode(q.gameMode);
              const rNorm = normalizeGameMode(r.game_mode);
              if (rNorm !== targetNorm) return false;
            }
            return r.is_winner === true || r.rank === 1 || r.won === true;
          }).length;
          progress = Math.max(currentStored, cnt);
          break;
        }

        case 'perfect_hits_count': {
          let count = getStoredQuestEventsCount(userId, 'perfect_hits_count', startMs);
          if (questAchievementIds.has('bullseye_king')) count = Math.max(count, 3);
          if (questAchievementIds.has('perfect_balance')) count = Math.max(count, 5);
          if (questAchievementIds.has('prophet')) count = Math.max(count, 1);
          progress = Math.max(currentStored, count);
          break;
        }

        case 'schnapszahl_count': {
          let count = getStoredQuestEventsCount(userId, 'schnapszahl_count', startMs);
          if (questAchievementIds.has('schnapps_hunter')) count = Math.max(count, 2);
          if (questAchievementIds.has('triple_seven')) count = Math.max(count, 1);
          progress = Math.max(currentStored, count);
          break;
        }

        case 'same_weight_count': {
          let count = getStoredQuestEventsCount(userId, 'same_weight_count', startMs);
          if (questAchievementIds.has('twins')) count = Math.max(count, 1);
          if (questAchievementIds.has('doppelganger')) count = Math.max(count, 1);
          progress = Math.max(currentStored, count);
          break;
        }

        case 'hundreds_count': {
          let count = getStoredQuestEventsCount(userId, 'hundreds_count', startMs);
          if (questAchievementIds.has('round_number')) count = Math.max(count, 1);
          progress = Math.max(currentStored, count);
          break;
        }

        case 'exact_five_g_count': {
          const count = getStoredQuestEventsCount(userId, 'exact_five_g_count', startMs);
          let roundMatches = 0;
          for (const g of filteredResults) {
            if (Array.isArray(g.rounds)) {
              for (const r of g.rounds) {
                const dist = typeof r.dist === 'number' ? r.dist : (typeof r.distance === 'number' ? r.distance : null);
                if (dist !== null && Math.abs(dist - 5) < 0.05) roundMatches++;
              }
            }
          }
          progress = Math.max(currentStored, count, roundMatches);
          break;
        }

        case 'strategist_count': {
          let count = getStoredQuestEventsCount(userId, 'strategist_count', startMs);
          if (questAchievementIds.has('strategist')) count = Math.max(count, 1);
          progress = Math.max(currentStored, count);
          break;
        }

        case 'poker_face_count': {
          let count = getStoredQuestEventsCount(userId, 'poker_face_count', startMs);
          if (questAchievementIds.has('poker_face') || questAchievementIds.has('pokerface')) count = Math.max(count, 1);
          progress = Math.max(currentStored, count);
          break;
        }

        case 'ach_67_count': {
          let count = getStoredQuestEventsCount(userId, 'ach_67_count', startMs);
          if (questAchievementIds.has('six_seven')) count = Math.max(count, 1);
          let count67 = 0;
          for (const g of filteredResults) {
            if (Array.isArray(g.rounds)) {
              for (const r of g.rounds) {
                const w = typeof r.weight === 'number' ? r.weight : (typeof r.user_weight === 'number' ? r.user_weight : null);
                if (w !== null && Math.round(w) === 67) count67++;
              }
            }
          }
          count = Math.max(count, count67);
          progress = Math.max(currentStored, count);
          break;
        }

        case 'speed_avg_sub5_count': {
          const count = getStoredQuestEventsCount(userId, 'speed_avg_sub5_count', startMs);
          const sub5 = filteredResults.filter(r => {
            const mode = (r.game_mode || '').toLowerCase();
            const isSpeed = mode.includes('speed') || !!r.is_speed_mode;
            return isSpeed && r.avg !== null && Number(r.avg) < 5.0;
          }).length;
          progress = Math.max(currentStored, count, sub5);
          break;
        }

        case 'speed_time_sub100_count': {
          const count = getStoredQuestEventsCount(userId, 'speed_time_sub100_count', startMs);
          const sub100 = filteredResults.filter(r => {
            const mode = (r.game_mode || '').toLowerCase();
            const isSpeed = mode.includes('speed') || !!r.is_speed_mode;
            const t = r.time_seconds !== undefined && r.time_seconds !== null ? Number(r.time_seconds) : (r.time !== undefined ? Number(r.time) : null);
            return isSpeed && t !== null && t > 0 && t < 100;
          }).length;
          progress = Math.max(currentStored, count, sub100);
          break;
        }

        case 'ach_knapp_daneben_count': {
          let count = getStoredQuestEventsCount(userId, 'ach_knapp_daneben_count', startMs);
          if (questAchievementIds.has('so_close')) count = Math.max(count, 1);
          let closeCount = 0;
          for (const g of filteredResults) {
            if (Array.isArray(g.rounds)) {
              for (const r of g.rounds) {
                const dist = typeof r.dist === 'number' ? r.dist : (typeof r.distance === 'number' ? r.distance : null);
                if (dist !== null && Math.abs(dist - 1) < 0.05) closeCount++;
              }
            }
          }
          count = Math.max(count, closeCount);
          progress = Math.max(currentStored, count);
          break;
        }

        case 'ach_kopfrechner_count': {
          let count = getStoredQuestEventsCount(userId, 'ach_kopfrechner_count', startMs);
          if (questAchievementIds.has('calculator')) count = Math.max(count, 1);
          progress = Math.max(currentStored, count);
          break;
        }

        case 'ach_scharfschuetze_count': {
          let count = getStoredQuestEventsCount(userId, 'ach_scharfschuetze_count', startMs);
          if (questAchievementIds.has('sharpshooter')) count = Math.max(count, 1);
          progress = Math.max(currentStored, count);
          break;
        }
      }

      const isCompleted = progress >= targetCount;

      try {
        await db.from('user_quest_progress').upsert({
          user_id: userId,
          quest_id: q.id,
          current_progress: Math.min(progress, targetCount),
          is_completed: isCompleted,
          completed_at: isCompleted ? (existingProgressObj.completed_at || nowIso) : null,
          created_at: questStartedAt,
          updated_at: nowIso
        }, { onConflict: 'user_id,quest_id' });
      } catch (upsertErr) {
        console.warn('user_quest_progress upsert error:', upsertErr);
      }

      if (isCompleted) {
        bonusXpEarned += q.xpReward;
        completedQuestIds.add(q.id);

        if (q.colorReward) {
          try {
            const stored = localStorage.getItem(`bundeswiega_user_unlocked_colors_${userId}`);
            const unlockedList: string[] = stored ? JSON.parse(stored) : [];
            if (!unlockedList.includes(q.colorReward)) {
              unlockedList.push(q.colorReward);
              localStorage.setItem(`bundeswiega_user_unlocked_colors_${userId}`, JSON.stringify(unlockedList));
            }
          } catch {}
        }

        if (q.animationReward) {
          try {
            const storedP = localStorage.getItem(`bundeswiega_user_unlocked_patterns_${userId}`);
            const unlockedPatterns: string[] = storedP ? JSON.parse(storedP) : [];
            if (!unlockedPatterns.includes(q.animationReward)) {
              unlockedPatterns.push(q.animationReward);
              localStorage.setItem(`bundeswiega_user_unlocked_patterns_${userId}`, JSON.stringify(unlockedPatterns));
            }
            const storedC = localStorage.getItem(`bundeswiega_user_unlocked_colors_${userId}`);
            const unlockedColors: string[] = storedC ? JSON.parse(storedC) : [];
            if (!unlockedColors.includes(q.animationReward)) {
              unlockedColors.push(q.animationReward);
              localStorage.setItem(`bundeswiega_user_unlocked_colors_${userId}`, JSON.stringify(unlockedColors));
            }
          } catch {}
        }

        if (q.titleReward && !unlockedTitles.has(q.titleReward)) {
          try {
            await db.from('user_titles').upsert({
              user_id: userId,
              title: q.titleReward,
              created_at: nowIso
            }, { onConflict: 'user_id,title' });
            unlockedTitles.add(q.titleReward);
          } catch (tErr) {
            console.warn('user_titles upsert error:', tErr);
          }
        }
      }
    }

    if (bonusXpEarned > 0 && profile) {
      try {
        const currentXp = Number(profile.xp) || 0;
        const newXp = currentXp + bonusXpEarned;
        const { level: newLevel } = calculateLevelFromXp(newXp);
        await db.from('profiles').update({ xp: newXp, level: newLevel }).eq('id', userId);
      } catch (profUpdateErr) {
        console.warn('Profile xp update error:', profUpdateErr);
      }
    }
  } catch (err) {
    console.error('Quest evaluation error:', err);
  }
}