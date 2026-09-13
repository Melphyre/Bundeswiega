import { LEVEL_QUESTS, QuestDefinition, getQuestTarget } from '../config/quests';
import { calculateLevelFromXp } from './levelSystem';
import { supabase as defaultClient } from '../supabaseClient';

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

    // Falls Bild in Auth vorhanden, aber noch nicht in profiles gespeichert: synchronisieren
    if (effectiveAvatarUrl && !effectiveAvatarUrl.includes('unknown.svg') && profile && !profile.avatar_url) {
      try {
        await db.from('profiles').update({ avatar_url: effectiveAvatarUrl }).eq('id', userId);
      } catch {
        // Spalte avatar_url existiert eventuell noch nicht
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

    // Auch Spiele aus teamwiegen_players einbinden, falls vorhanden
    try {
      const { data: teamPlayers } = await db
        .from('teamwiegen_players')
        .select('game_id')
        .eq('user_id', userId);

      const teamGameIds = (teamPlayers || []).map((t: any) => t.game_id).filter(Boolean);

      if (teamGameIds.length > 0) {
        const { data: teamGames } = await db
          .from('game_results')
          .select('*')
          .in('id', teamGameIds);

        if (Array.isArray(teamGames) && teamGames.length > 0) {
          const existingIds = new Set(safeResults.map(r => r.id));
          for (const tg of teamGames) {
            if (!existingIds.has(tg.id)) {
              safeResults.push(tg);
              existingIds.add(tg.id);
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
      // Tabelle existiert eventuell noch nicht
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
      // Tabelle existiert eventuell noch nicht
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
          progress = safeResults.filter(r =>
            !q.gameMode || (r.game_mode || '').toLowerCase().includes(q.gameMode.toLowerCase())
          ).length;
          break;

        case 'avg_less_than': {
          const threshold = q.threshold !== undefined ? q.threshold : q.targetValue;
          progress = safeResults.filter(r =>
            (!q.gameMode || (r.game_mode || '').toLowerCase().includes(q.gameMode.toLowerCase())) &&
            r.avg !== null &&
            r.avg !== undefined &&
            Number(r.avg) < threshold
          ).length;
          break;
        }

        case 'total_less_than': {
          const threshold = q.threshold !== undefined ? q.threshold : q.targetValue;
          progress = safeResults.filter(r =>
            (!q.gameMode || (r.game_mode || '').toLowerCase().includes(q.gameMode.toLowerCase())) &&
            r.total !== null &&
            r.total !== undefined &&
            Number(r.total) < threshold
          ).length;
          break;
        }

        case 'max_schnaepse': {
          const threshold = q.threshold !== undefined ? q.threshold : q.targetValue;
          progress = safeResults.filter(r =>
            (!q.gameMode || (r.game_mode || '').toLowerCase().includes(q.gameMode.toLowerCase())) &&
            r.schnaepse !== null &&
            r.schnaepse !== undefined &&
            Number(r.schnaepse) <= threshold
          ).length;
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
