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

  // --- LEVEL 3 ---
  { id: 'l3_15_standard', level: 3, title: 'Spiele 15 Standardspiele', xpReward: 15, metric: 'games_count', targetValue: 15, targetCount: 15, gameMode: 'Standardspiel' },
  { id: 'l3_10_speed', level: 3, title: 'Spiele 10 Speedwiegen', xpReward: 15, metric: 'games_count', targetValue: 10, targetCount: 10, gameMode: 'Speedwiegen' },
  { id: 'l3_teamwiegen_6', level: 3, title: 'Nimm an 6 Teamwiegen teil', xpReward: 15, metric: 'teamwiegen_count', targetValue: 6, targetCount: 6 },
  { id: 'l3_tournament_3', level: 3, title: 'Nimm an 3 Turnieren teil', xpReward: 20, metric: 'tournament_count', targetValue: 3, targetCount: 3 },
  { id: 'l3_avg_sub2', level: 3, title: 'Durchschnitt unter 2,0 Gramm in einem Spiel', xpReward: 20, titleReward: 'Präzisions-Schütze', metric: 'avg_less_than', targetValue: 2.0, threshold: 2.0, targetCount: 1 },
  { id: 'l3_5x_sub2_schnaepse', level: 3, title: 'Spiele 5 Spiele mit maximal 2 Schnäpsen', xpReward: 15, metric: 'max_schnaepse', targetValue: 2, threshold: 2, targetCount: 5 },

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
    // 1. Profil & vorhandene Quests/Titel laden
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

    // Falls Profil kein Bild hat oder unknown.svg ist: auth.users metadata prüfen
    if (!effectiveAvatarUrl || effectiveAvatarUrl.includes('unknown.svg')) {
      try {
        if (db.auth?.getUser) {
          const { data: authData } = await db.auth.getUser();
          if (authData?.user?.id === userId && authData.user.user_metadata?.avatar_url) {
            effectiveAvatarUrl = authData.user.user_metadata.avatar_url;
          }
        }
      } catch {
        // ignore
      }

      try {
        if (db.auth?.admin?.getUserById) {
          const { data: adminAuthData } = await db.auth.admin.getUserById(userId);
          if (adminAuthData?.user?.user_metadata?.avatar_url) {
            effectiveAvatarUrl = adminAuthData.user.user_metadata.avatar_url;
          }
        }
      } catch {
        // ignore
      }
    }

    if (effectiveAvatarUrl && !effectiveAvatarUrl.includes('unknown.svg') && profile && !profile.avatar_url) {
      try {
        await db.from('profiles').update({ avatar_url: effectiveAvatarUrl }).eq('id', userId);
      } catch {
        // ignore
      }
    }

    // Spiele laden (eigene Spiele)
    let safeResults: any[] = [];
    try {
      const { data: results } = await db
        .from('game_results')
        .select('*')
        .eq('user_id', userId);
      if (Array.isArray(results)) {
        safeResults = [...results];
      }
    } catch {
      // ignore
    }

    // Auch Spiele aus teamwiegen_players einbinden (mit breiterem Scope für teamGameIds)
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
    } catch {
      // ignore
    }

    let questProgress: any[] = [];
    try {
      const { data: qpData } = await db
        .from('user_quest_progress')
        .select('*')
        .eq('user_id', userId);
      if (Array.isArray(qpData)) {
        questProgress = qpData;
      }
    } catch {
      // ignore
    }

    let existingTitles: any[] = [];
    try {
      const { data: tData } = await db
        .from('user_titles')
        .select('title')
        .eq('user_id', userId);
      if (Array.isArray(tData)) {
        existingTitles = tData;
      }
    } catch {
      // ignore
    }

    const completedQuestIds = new Set(questProgress.filter((qp: any) => qp.is_completed).map((qp: any) => qp.quest_id));
    const unlockedTitles = new Set(existingTitles.map((t: any) => t.title));

    // 2. Filtere Quests: Nur Quests bis zum aktuellen User-Level, die noch nicht abgeschlossen sind
    const availableQuests = LEVEL_QUESTS.filter(q => q.level <= userLevel && !completedQuestIds.has(q.id));

    let bonusXpEarned = 0;

    for (const q of availableQuests) {
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
          progress = safeResults.filter(r => {
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
          progress = safeResults.filter(r => {
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
          progress = safeResults.filter(r => {
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
          progress = safeResults.filter(r => {
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
          // Genauso wie unter Meine Spiele Reiter Teamwiegen:
          // Kombiniert game_results (wo user_id = userId) UND teamwiegen_players (verknüpfte Spiele)
          const isTeamGame = (r: any): boolean => {
            if (!r) return false;
            if (r.is_team_player || r.is_team_member) return true;
            const raw = String(r.game_mode || '').toLowerCase();
            if (raw.includes('team')) return true;
            const norm = normalizeGameMode(r.game_mode);
            return norm === 'Teamwiegen';
          };

          const matchingTeamGames = safeResults.filter(isTeamGame);
          const uniqueGameIds = new Set<string>();
          matchingTeamGames.forEach(g => {
            if (g.id) uniqueGameIds.add(String(g.id));
          });
          teamGameIds.forEach(id => {
            if (id) uniqueGameIds.add(String(id));
          });

          progress = Math.max(matchingTeamGames.length, uniqueGameIds.size);
          break;
        }

        case 'tournament_count': {
          progress = safeResults.filter(r => 
            r.is_tournament === true || 
            r.tournament_id !== null || 
            (r.game_mode || '').toLowerCase().includes('turnier')
          ).length;
          break;
        }

        case 'achievements_count': {
          let count = Number(profile?.achievements_count || (profile as any)?.achievementsCount || 0);
          try {
            const { count: exactCount } = await db
              .from('achievements')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', userId);
            if (typeof exactCount === 'number') {
              count = Math.max(count, exactCount);
            }
          } catch {
            // ignore
          }
          progress = count;
          break;
        }

        case 'wins_count': {
          const wins = safeResults.filter(r => {
            if (q.gameMode) {
              const targetNorm = normalizeGameMode(q.gameMode);
              const rNorm = normalizeGameMode(r.game_mode);
              if (rNorm !== targetNorm) return false;
            }
            return r.is_winner === true || r.rank === 1 || r.won === true;
          }).length;
          const profileWins = Number(profile?.games_won || (profile as any)?.gamesWon || 0);
          progress = Math.max(wins, profileWins);
          break;
        }
      }

      const isCompleted = progress >= targetCount;

      // Update / Insert in user_quest_progress
      try {
        await db.from('user_quest_progress').upsert({
          user_id: userId,
          quest_id: q.id,
          current_progress: Math.min(progress, targetCount),
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,quest_id' });
      } catch (upsertErr) {
        console.warn('user_quest_progress upsert error:', upsertErr);
      }

      // Wenn frisch abgeschlossen: Belohnungen vergeben
      if (isCompleted) {
        bonusXpEarned += q.xpReward;
        completedQuestIds.add(q.id);

        // Farb-Belohnung (z. B. Rosa bei 50 Achievements, Türkis bei 5 Standard-Siegen)
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
              created_at: new Date().toISOString()
            }, { onConflict: 'user_id,title' });
            unlockedTitles.add(q.titleReward);
          } catch (tErr) {
            console.warn('user_titles upsert error:', tErr);
          }
        }
      }
    }

    // Falls neue XP verdient wurden, Profil-XP/Level anpassen
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