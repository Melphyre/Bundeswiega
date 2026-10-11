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
    | 'wins_count';
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
  // Neue Level-2 Quests (Einfarbige & animierte Hintergründe):
  { id: 'l2_neon_orange', level: 2, title: 'Spiele 8 Standardspiele', xpReward: 15, metric: 'games_count', targetValue: 8, targetCount: 8, gameMode: 'Standardspiel', colorReward: 'neon_orange', rewardDescription: 'Hintergrundfarbe Neon-Orange' },
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

  // --- LEVEL 4 ---
  { id: 'l4_25_games_total', level: 4, title: 'Absolviere insgesamt 25 Spiele', xpReward: 20, metric: 'games_count', targetValue: 25, targetCount: 25 },
  { id: 'l4_teamwiegen_8', level: 4, title: 'Nimm an 8 Teamwiegen teil', xpReward: 20, metric: 'teamwiegen_count', targetValue: 8, targetCount: 8 },
  { id: 'l4_tournament_5', level: 4, title: 'Nimm an 5 Turnieren teil', xpReward: 25, metric: 'tournament_count', targetValue: 5, targetCount: 5 },
  { id: 'l4_5x_total_sub5', level: 4, title: 'Erreiche 5x ein Total unter 5 Gramm', xpReward: 20, metric: 'total_less_than', targetValue: 5.0, threshold: 5.0, targetCount: 5 },
  { id: 'l4_zero_schnaepse_speed', level: 4, title: 'Speedwiegen ohne einzigen Schnaps', xpReward: 25, titleReward: 'Blitzsauber', metric: 'max_schnaepse', targetValue: 0, threshold: 0, targetCount: 1, gameMode: 'Speedwiegen' },

  // --- LEVEL 5 ---
  { id: 'l5_50_games_total', level: 5, title: 'Absolviere 50 Spiele', xpReward: 30, titleReward: 'Stammgast', metric: 'games_count', targetValue: 50, targetCount: 50 },
  { id: 'l5_teamwiegen_12', level: 5, title: 'Nimm an 12 Teamwiegen teil', xpReward: 25, titleReward: 'Team-Stütze', metric: 'teamwiegen_count', targetValue: 12, targetCount: 12 },
  { id: 'l5_tournament_7', level: 5, title: 'Nimm an 7 Turnieren teil', xpReward: 30, titleReward: 'Turnier-Stammgast', metric: 'tournament_count', targetValue: 7, targetCount: 7 },
  { id: 'l5_avg_sub15', level: 5, title: 'Fabelzeit: Durchschnitt unter 1,5 Gramm', xpReward: 30, titleReward: 'Chirurg', metric: 'avg_less_than', targetValue: 1.5, threshold: 1.5, targetCount: 1 },
  { id: 'l5_10x_avg_sub4', level: 5, title: 'Erreiche 10x einen Durchschnitt unter 4 Gramm', xpReward: 25, metric: 'avg_less_than', targetValue: 4.0, threshold: 4.0, targetCount: 10 },

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
    
    const questCreatedAtMap = new Map<string, string>();
    questProgress.forEach((qp: any) => {
      if (qp.created_at) {
        questCreatedAtMap.set(qp.quest_id, qp.created_at);
      }
    });

    const availableQuests = LEVEL_QUESTS.filter(q => q.level <= userLevel && !completedQuestIds.has(q.id));

    let bonusXpEarned = 0;
    const nowIso = new Date().toISOString();

    for (const q of availableQuests) {
      let questStartedAt = questCreatedAtMap.get(q.id);
      if (!questStartedAt) {
        questStartedAt = nowIso;
        try {
          await db.from('user_quest_progress').upsert({
            user_id: userId,
            quest_id: q.id,
            current_progress: 0,
            is_completed: false,
            created_at: nowIso,
            updated_at: nowIso
          }, { onConflict: 'user_id,quest_id' });
          questCreatedAtMap.set(q.id, nowIso);
        } catch (err) {
          console.warn('Could not initialize quest progress:', err);
        }
      }

      const startDate = new Date(questStartedAt);
      const filteredResults = safeResults.filter(r => {
        const gameDate = r.created_at || r.timestamp || r.date;
        if (!gameDate) return true;
        return new Date(gameDate) >= startDate;
      });

      let progress = 0;
      const targetCount = getQuestTarget(q);

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

        case 'games_count':
          progress = filteredResults.filter(r => {
            if (!q.gameMode) return true;
            const targetModeNorm = normalizeGameMode(q.gameMode);
            const rModeNorm = normalizeGameMode(r.game_mode);
            if (rModeNorm === targetModeNorm) return true;
            const target = q.gameMode.toLowerCase();
            const raw = (r.game_mode || '').toLowerCase();
            if (target.includes('team') && (raw.includes('team') || r.is_team_player === true)) return true;
            return raw.includes(target);
          }).length;
          break;

        case 'avg_less_than': {
          const threshold = q.threshold !== undefined ? q.threshold : q.targetValue;
          progress = filteredResults.filter(r => {
            if (q.gameMode) {
              const targetModeNorm = normalizeGameMode(q.gameMode);
              const rModeNorm = normalizeGameMode(r.game_mode);
              if (rModeNorm !== targetModeNorm && !(targetModeNorm === 'Teamwiegen' && (r.is_team_player || (r.game_mode || '').toLowerCase().includes('team')))) {
                return false;
              }
            }
            return r.avg !== null && r.avg !== undefined && Number(r.avg) < threshold;
          }).length;
          break;
        }

        case 'total_less_than': {
          const threshold = q.threshold !== undefined ? q.threshold : q.targetValue;
          progress = filteredResults.filter(r => {
            if (q.gameMode) {
              const targetModeNorm = normalizeGameMode(q.gameMode);
              const rModeNorm = normalizeGameMode(r.game_mode);
              if (rModeNorm !== targetModeNorm && !(targetModeNorm === 'Teamwiegen' && (r.is_team_player || (r.game_mode || '').toLowerCase().includes('team')))) {
                return false;
              }
            }
            return r.total !== null && r.total !== undefined && Number(r.total) < threshold;
          }).length;
          break;
        }

        case 'max_schnaepse': {
          const threshold = q.threshold !== undefined ? q.threshold : q.targetValue;
          progress = filteredResults.filter(r => {
            if (q.gameMode) {
              const targetModeNorm = normalizeGameMode(q.gameMode);
              const rModeNorm = normalizeGameMode(r.game_mode);
              if (rModeNorm !== targetModeNorm && !(targetModeNorm === 'Teamwiegen' && (r.is_team_player || (r.game_mode || '').toLowerCase().includes('team')))) {
                return false;
              }
            }
            return r.schnaepse !== null && r.schnaepse !== undefined && Number(r.schnaepse) <= threshold;
          }).length;
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
          progress = uniqueGameIds.size || matchingTeamGames.length;
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

          progress = uniqueTournaments.size;
          break;
        }

        case 'achievements_count': {
          let count = 0;
          try {
            const { count: exactCount } = await db
              .from('achievements')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', userId)
              .gte('created_at', questStartedAt);
            if (typeof exactCount === 'number') {
              count = exactCount;
            }
          } catch {}
          progress = count;
          break;
        }

        case 'wins_count': {
          progress = filteredResults.filter(r => {
            if (q.gameMode) {
              const targetNorm = normalizeGameMode(q.gameMode);
              const rNorm = normalizeGameMode(r.game_mode);
              if (rNorm !== targetNorm) return false;
            }
            return r.is_winner === true || r.rank === 1 || r.won === true;
          }).length;
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
          completed_at: isCompleted ? nowIso : null,
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