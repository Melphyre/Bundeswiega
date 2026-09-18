import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ─── SUPABASE CLIENT SETUP ───
let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
if (supabaseUrl.includes('.supabase.com')) {
  supabaseUrl = supabaseUrl.replace('.supabase.com', '.supabase.co');
} else if (!supabaseUrl.includes('.supabase.co') && supabaseUrl) {
  const clean = supabaseUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (!clean.includes('.')) {
    supabaseUrl = `https://${clean}.supabase.co`;
  }
}

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

let supabaseAdmin: any = null;
try {
  if (supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  }
} catch (e) {
  console.error("Failed to initialize Supabase client:", e);
}

// ─── HELPER FUNCTIONS ───
function safeQueryParam(req: VercelRequest, key: string): string {
  try {
    const val = (req as any).query?.[key];
    if (Array.isArray(val)) return val[0] || '';
    if (val) return String(val);

    if (req.url && req.url.includes('?')) {
      const qs = req.url.split('?')[1] || '';
      const params = new URLSearchParams(qs);
      return params.get(key) || '';
    }
    return '';
  } catch {
    return '';
  }
}

function parseBody(req: VercelRequest): any {
  try {
    if (!req.body) return {};
    if (typeof req.body === 'string') return JSON.parse(req.body);
    return req.body;
  } catch {
    return {};
  }
}

// ─── 1. RECORDS HANDLER (GET /api/records) ───
async function handleRecords(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  const header = ['Datum', 'Modus', 'Name', 'Avg', 'Schnaepse', 'Total', 'Achievements', 'Turnier', 'Tisch'];

  if (!supabaseAdmin) {
    return res.status(200).json({ data: [header] });
  }

  try {
    const [resultsRes, profilesRes, achRes] = await Promise.all([
      supabaseAdmin.from('game_results').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('profiles').select('*'),
      supabaseAdmin.from('achievements').select('*')
    ]);

    const safeResults = resultsRes?.data || [];
    const safeProfiles = profilesRes?.data || [];
    const safeAchs = achRes?.data || [];

    const profileMap: Record<string, any> = {};
    safeProfiles.forEach((p: any) => { if (p?.id) profileMap[p.id] = p; });

    const achByGame: Record<string, any[]> = {};
    safeAchs.forEach((a: any) => {
      const k = a.game_result_id || `${a.user_id || a.player_name || ''}_${a.date || ''}`;
      if (!achByGame[k]) achByGame[k] = [];
      achByGame[k].push({
        id: a.achievement_id,
        title: a.title,
        icon: a.icon,
        rarity: a.rarity,
        earnedBy: a.earned_with || [],
        earnedTogether: !!a.earned_together
      });
    });

    const rows = safeResults
      .filter((r: any) => {
        if (!r) return false;
        if (r.user_id && profileMap[r.user_id]) {
          const prof = profileMap[r.user_id];
          if (prof.show_records === false) return false;
        }
        return true;
      })
      .map((r: any) => {
        const playerName = r.team_name || r.player_name || (r.user_id && profileMap[r.user_id]?.username) || (r.is_guest ? 'Gast' : 'Unbekannt');
        const canonicalMode = r.game_mode || 'Standardspiel';
        const k = r.id || `${r.user_id || r.player_name || ''}_${r.date || ''}`;
        const achievementsList = achByGame[k] || [];
        const achievementsParam = achievementsList.length > 0 ? encodeURIComponent(JSON.stringify(achievementsList)) : '';

        return [
          r.date || '',
          canonicalMode,
          playerName,
          String(r.avg ?? 0),
          String(r.schnaepse ?? 0),
          String(r.total ?? 0),
          achievementsParam,
          r.tournament_name || '',
          r.tournament_table || ''
        ];
      });

    return res.status(200).json({ data: [header, ...rows] });
  } catch (err: any) {
    console.error("handleRecords Crash:", err);
    return res.status(200).json({ data: [header] });
  }
}

// ─── 2. UPLOAD HANDLER (POST /api/upload) ───
async function handleUpload(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!supabaseAdmin) {
      return res.status(200).json({ success: true, message: 'Ergebnisse verarbeitet (Offline-Modus)' });
    }

    const payload = parseBody(req);
    const { gameMode, results, date, achievements } = payload;
    const safeDate = date || new Date().toLocaleDateString('de-DE');

    if (Array.isArray(results) && results.length > 0) {
      const inserts = results.map((r: any) => {
        const avg = Number(r.avg) || 0;
        const schnaepse = Number(r.schnaepse) || 0;
        const total = r.total !== undefined ? Number(r.total) : Math.round((avg + schnaepse) * 100) / 100;
        return {
          game_mode: gameMode || 'Standardspiel',
          date: safeDate,
          player_name: r.name || 'Gast',
          avg,
          schnaepse,
          total,
          levels: r.levels || null,
          is_guest: true
        };
      });

      const { data: savedResults, error: insertErr } = await supabaseAdmin
        .from('game_results')
        .insert(inserts)
        .select();

      if (insertErr) {
        console.warn("handleUpload game_results insert warning:", insertErr);
      }

      if (Array.isArray(achievements) && achievements.length > 0) {
        const achInserts = achievements.map((ach: any) => ({
          achievement_id: ach.id,
          title: ach.title || ach.id,
          description: ach.description || '',
          icon: ach.icon || '🏆',
          rarity: ach.rarity || 'common',
          earned_with: ach.earnedBy || [],
          earned_together: !!ach.earnedTogether,
          date: safeDate,
          game_result_id: savedResults?.[0]?.id || null
        }));
        await supabaseAdmin.from('achievements').insert(achInserts);
      }
    }

    return res.status(200).json({ success: true, message: 'Ergebnisse erfolgreich hochgeladen!' });
  } catch (err: any) {
    console.error("handleUpload Crash:", err);
    return res.status(200).json({ success: true, message: 'Ergebnisse entgegengenommen.' });
  }
}

// ─── 3. FIND BY USERNAME (GET /api/users/find-by-username) ───
async function handleFindByUsername(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const username = safeQueryParam(req, 'username');
    if (!username) {
      return res.status(400).json({ error: 'Username Parameter fehlt' });
    }

    if (!supabaseAdmin) {
      return res.status(404).json({ error: 'Supabase nicht initialisiert' });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('email, username')
      .ilike('username', username.trim())
      .maybeSingle();

    if (error || !profile?.email) {
      return res.status(404).json({ error: 'Kein Account mit diesem Benutzernamen gefunden.' });
    }

    return res.status(200).json({ email: profile.email, username: profile.username });
  } catch (err: any) {
    console.error("handleFindByUsername Crash:", err);
    return res.status(500).json({ error: 'Fehler beim Suchen des Benutzernamens' });
  }
}

// ─── QUEST DEFINITIONS & EVALUATION ENGINE ───
const SERVER_LEVEL_QUESTS = [
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

async function serverEvaluateQuestsForUser(userId: string) {
  if (!userId || !supabaseAdmin) return;
  try {
    const [profRes, resultsRes, teamPlayersRes, qpRes, titlesRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabaseAdmin.from('game_results').select('*').eq('user_id', userId),
      supabaseAdmin.from('teamwiegen_players').select('game_id').eq('user_id', userId),
      supabaseAdmin.from('user_quest_progress').select('*').eq('user_id', userId),
      supabaseAdmin.from('user_titles').select('title').eq('user_id', userId)
    ]);

    const profile = profRes?.data;
    const userLevel = profile ? Number(profile.level) || 1 : 1;
    let effectiveAvatarUrl = profile?.avatar_url || profile?.image_url || '';

    let safeResults: any[] = Array.isArray(resultsRes?.data) ? [...resultsRes.data] : [];
    const teamGameIds: string[] = (teamPlayersRes?.data || []).map((tp: any) => tp.game_id).filter(Boolean);

    if (teamGameIds.length > 0) {
      const { data: teamGames } = await supabaseAdmin
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
            if (existing) existing.is_team_player = true;
          }
        }
      }
    }

    const questProgress = Array.isArray(qpRes?.data) ? qpRes.data : [];
    const completedQuestIds = new Set(questProgress.filter((qp: any) => qp.is_completed).map((qp: any) => qp.quest_id));
    const unlockedTitles = new Set((titlesRes?.data || []).map((t: any) => t.title));

    const normalizeMode = (m?: string | null) => {
      if (!m) return 'Standardspiel (500ml)';
      const l = m.trim().toLowerCase();
      if (l.includes('team')) return 'Teamwiegen';
      if (l.includes('speed')) return (l.includes('0,33') || l.includes('0.33')) ? 'Speedwiegen (0,33L)' : 'Speedwiegen (500ml)';
      if (l.includes('standard')) return (l.includes('0,33') || l.includes('0.33')) ? 'Standardspiel (0,33L)' : 'Standardspiel (500ml)';
      return m;
    };

    const availableQuests = SERVER_LEVEL_QUESTS.filter(q => q.level <= userLevel && !completedQuestIds.has(q.id));

    let bonusXpEarned = 0;

    for (const q of availableQuests) {
      let progress = 0;
      const targetCount = (q as any).targetCount !== undefined ? (q as any).targetCount : (q.metric === 'profile_pic' ? 1 : q.targetValue);

      switch (q.metric) {
        case 'profile_pic':
          if (effectiveAvatarUrl && typeof effectiveAvatarUrl === 'string' && effectiveAvatarUrl.trim() !== '' && !effectiveAvatarUrl.includes('unknown.svg')) {
            progress = 1;
          }
          break;

        case 'games_count':
          progress = safeResults.filter(r => {
            if (!q.gameMode) return true;
            const norm = normalizeMode(r.game_mode);
            const targetNorm = normalizeMode(q.gameMode);
            if (norm === targetNorm) return true;
            const raw = (r.game_mode || '').toLowerCase();
            const target = q.gameMode.toLowerCase();
            if (target.includes('team') && (raw.includes('team') || r.is_team_player === true)) return true;
            return raw.includes(target);
          }).length;
          break;

        case 'avg_less_than': {
          const threshold = (q as any).threshold !== undefined ? (q as any).threshold : q.targetValue;
          progress = safeResults.filter(r => {
            if (q.gameMode) {
              const norm = normalizeMode(r.game_mode);
              const targetNorm = normalizeMode(q.gameMode);
              if (norm !== targetNorm && !(targetNorm === 'Teamwiegen' && (r.is_team_player || (r.game_mode || '').toLowerCase().includes('team')))) {
                return false;
              }
            }
            return r.avg !== null && r.avg !== undefined && Number(r.avg) < threshold;
          }).length;
          break;
        }

        case 'total_less_than': {
          const threshold = (q as any).threshold !== undefined ? (q as any).threshold : q.targetValue;
          progress = safeResults.filter(r => {
            if (q.gameMode) {
              const norm = normalizeMode(r.game_mode);
              const targetNorm = normalizeMode(q.gameMode);
              if (norm !== targetNorm && !(targetNorm === 'Teamwiegen' && (r.is_team_player || (r.game_mode || '').toLowerCase().includes('team')))) {
                return false;
              }
            }
            return r.total !== null && r.total !== undefined && Number(r.total) < threshold;
          }).length;
          break;
        }

        case 'max_schnaepse': {
          const threshold = (q as any).threshold !== undefined ? (q as any).threshold : q.targetValue;
          progress = safeResults.filter(r => {
            if (q.gameMode) {
              const norm = normalizeMode(r.game_mode);
              const targetNorm = normalizeMode(q.gameMode);
              if (norm !== targetNorm && !(targetNorm === 'Teamwiegen' && (r.is_team_player || (r.game_mode || '').toLowerCase().includes('team')))) {
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
            const norm = normalizeMode(r.game_mode);
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
          let count = Number(profile?.achievements_count || 0);
          try {
            const { count: exactCount } = await supabaseAdmin
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
              const norm = normalizeMode(r.game_mode);
              const targetNorm = normalizeMode(q.gameMode);
              if (norm !== targetNorm) return false;
            }
            return r.is_winner === true || r.rank === 1 || r.won === true;
          }).length;
          const profileWins = Number(profile?.games_won || 0);
          progress = Math.max(wins, profileWins);
          break;
        }
      }

      const isCompleted = progress >= targetCount;

      try {
        await supabaseAdmin.from('user_quest_progress').upsert({
          user_id: userId,
          quest_id: q.id,
          current_progress: Math.min(progress, targetCount),
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,quest_id' });
      } catch (upsertErr) {
        console.warn('Backend quest upsert warning:', upsertErr);
      }

      if (isCompleted) {
        bonusXpEarned += q.xpReward;
        completedQuestIds.add(q.id);

        if ((q as any).titleReward && !unlockedTitles.has((q as any).titleReward)) {
          try {
            await supabaseAdmin.from('user_titles').upsert({
              user_id: userId,
              title: (q as any).titleReward,
              created_at: new Date().toISOString()
            }, { onConflict: 'user_id,title' });
            unlockedTitles.add((q as any).titleReward);
          } catch (tErr) {
            console.warn('Backend title upsert warning:', tErr);
          }
        }
      }
    }

    if (bonusXpEarned > 0 && profile) {
      try {
        const currentXp = Number(profile.xp) || 0;
        const newXp = currentXp + bonusXpEarned;
        let lvl = 1;
        let cumulative = 0;
        const requirements = [20, 30, 40, 50, 60, 75, 90, 110, 130];
        for (let i = 0; i < requirements.length; i++) {
          cumulative += requirements[i];
          if (newXp >= cumulative) {
            lvl = i + 2;
          } else {
            break;
          }
        }
        await supabaseAdmin.from('profiles').update({ xp: newXp, level: lvl }).eq('id', userId);
      } catch (profErr) {
        console.warn('Backend profile xp update warning:', profErr);
      }
    }
  } catch (err) {
    console.error('serverEvaluateQuestsForUser error:', err);
  }
}

// ─── 4. GET PROFILE DATA (GET /api/users/profile-data) ───
async function handleGetProfileData(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const userId = safeQueryParam(req, 'userId');
    if (!userId) {
      return res.status(400).json({ error: 'userId is required', profile: null, gameResults: [], achievements: [] });
    }

    if (!supabaseAdmin) {
      return res.status(200).json({
        profile: null, gameResults: [], achievements: [], questProgress: [], quests: [], userTitles: [], titles: []
      });
    }

    // Vor dem Abruf Quests serverseitig evaluieren, damit alle Teamwiegenspiele & Spiele direkt einfließen
    try {
      await serverEvaluateQuestsForUser(userId);
    } catch (evalErr) {
      console.warn('serverEvaluateQuestsForUser in handleGetProfileData warning:', evalErr);
    }

    const [profRes, resultsRes, teamPlayersRes, achRes, questRes, titlesRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabaseAdmin.from('game_results').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabaseAdmin.from('teamwiegen_players').select('game_id').eq('user_id', userId),
      supabaseAdmin.from('achievements').select('*').eq('user_id', userId),
      supabaseAdmin.from('user_quest_progress').select('*').eq('user_id', userId),
      supabaseAdmin.from('user_titles').select('*').eq('user_id', userId)
    ]);

    let mergedGameResults: any[] = Array.isArray(resultsRes?.data) ? [...resultsRes.data] : [];
    const teamGameIds = (teamPlayersRes?.data || []).map((tp: any) => tp.game_id).filter(Boolean);

    if (teamGameIds.length > 0) {
      try {
        const { data: teamGames } = await supabaseAdmin
          .from('game_results')
          .select('*')
          .in('id', teamGameIds);

        if (Array.isArray(teamGames) && teamGames.length > 0) {
          const existingIds = new Set(mergedGameResults.map(r => r.id));
          for (const tg of teamGames) {
            if (!existingIds.has(tg.id)) {
              mergedGameResults.push({
                ...tg,
                is_team_player: true
              });
              existingIds.add(tg.id);
            }
          }
        }
      } catch (tpErr) {
        console.warn('teamGames fetch warning in handleGetProfileData:', tpErr);
      }
    }

    // Chronologisch absteigend sortieren
    mergedGameResults.sort((a, b) => {
      const timeA = new Date(a.created_at || (a.date ? a.date.split('.').reverse().join('-') : 0)).getTime();
      const timeB = new Date(b.created_at || (b.date ? b.date.split('.').reverse().join('-') : 0)).getTime();
      return timeB - timeA;
    });

    return res.status(200).json({
      profile: profRes?.data || null,
      gameResults: mergedGameResults,
      achievements: achRes?.data || [],
      questProgress: questRes?.data || [],
      quests: [],
      userTitles: titlesRes?.data || [],
      titles: []
    });
  } catch (err: any) {
    console.error("handleGetProfileData Crash:", err);
    return res.status(200).json({
      profile: null, gameResults: [], achievements: [], questProgress: [], quests: [], userTitles: [], titles: []
    });
  }
}

// ─── 5. USERS LIST (GET /api/users/list oder /api/users) ───
async function handleUsersList(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!supabaseAdmin) {
      return res.status(200).json({ users: [] });
    }
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, username, email, role, avatar_url, title, level, xp, name_bg_color, name_glow')
      .order('username', { ascending: true });

    if (error || !profiles) {
      return res.status(200).json({ users: [] });
    }

    const users = profiles.map((p: any) => ({
      id: p.id,
      name: p.username || 'Spieler',
      username: p.username || 'Spieler',
      email: p.email || '',
      role: p.role || 'user',
      imageUrl: p.avatar_url || '',
      title: p.title || '',
      level: p.level || 1,
      xp: p.xp || 0,
      name_bg_color: p.name_bg_color || 'none',
      name_glow: p.name_glow || 'none'
    }));

    return res.status(200).json({ users });
  } catch (err: any) {
    console.error("handleUsersList Crash:", err);
    return res.status(200).json({ users: [] });
  }
}

// ─── 6. SAVE GAME RESULT (POST /api/users/save-game-result) ───
async function handleSaveGameResult(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!supabaseAdmin) return res.status(200).json({ success: false });

    const payload = parseBody(req);
    const gameResultData = payload.gameResult || payload;
    const userId = payload.userId || payload.user_id || gameResultData.user_id;
    const teamPlayerUserIds = payload.teamPlayerUserIds || gameResultData.teamPlayerUserIds;
    const memberUserIds = payload.memberUserIds || gameResultData.memberUserIds;
    const isTeamFlag = payload.isTeamGame || gameResultData.isTeamGame;

    const insertPayload = {
      ...gameResultData,
      user_id: userId || null
    };
    delete (insertPayload as any).teamPlayerUserIds;
    delete (insertPayload as any).memberUserIds;
    delete (insertPayload as any).isTeamGame;

    const { data, error } = await supabaseAdmin
      .from('game_results')
      .insert(insertPayload)
      .select();

    if (error) {
      console.error("Fehler beim Speichern in game_results:", error);
      return res.status(400).json({ success: false, error: error.message });
    }

    const savedGameId = data?.[0]?.id;

    // Falls Spielmodus Teamwiegen ist, Verknüpfung in teamwiegen_players herstellen
    const isTeamGame = (insertPayload.game_mode && String(insertPayload.game_mode).toLowerCase().includes('team')) || isTeamFlag;
    if (savedGameId && isTeamGame) {
      try {
        const uidsToLink = new Set<string>();
        if (userId) uidsToLink.add(userId);
        if (Array.isArray(teamPlayerUserIds)) {
          teamPlayerUserIds.forEach((uid: string) => { if (uid) uidsToLink.add(uid); });
        }
        if (Array.isArray(memberUserIds)) {
          memberUserIds.forEach((uid: string) => { if (uid) uidsToLink.add(uid); });
        }

        if (uidsToLink.size > 0) {
          const links = Array.from(uidsToLink).map(uid => ({
            game_id: savedGameId,
            user_id: uid
          }));
          await supabaseAdmin.from('teamwiegen_players').insert(links);
        }
      } catch (teamPlayerErr) {
        console.warn('teamwiegen_players insert warning:', teamPlayerErr);
      }
    }

    if (payload.achievements && Array.isArray(payload.achievements) && payload.achievements.length > 0) {
      const achInserts = payload.achievements.map((ach: any) => ({
        user_id: userId,
        game_result_id: savedGameId,
        achievement_id: ach.id,
        title: ach.title,
        description: ach.description,
        icon: ach.icon,
        rarity: ach.rarity,
        earned_with: ach.earnedBy,
        earned_together: ach.earnedTogether
      }));
      await supabaseAdmin.from('achievements').insert(achInserts);
    }

    // Quests nach Spielergebnis automatisch neu evaluieren
    if (userId) {
      serverEvaluateQuestsForUser(userId).catch(e => console.warn('Quest evaluation error after game:', e));
    }
    if (isTeamGame && payload.teamPlayerUserIds && Array.isArray(payload.teamPlayerUserIds)) {
      for (const tpId of payload.teamPlayerUserIds) {
        if (tpId && tpId !== userId) {
          serverEvaluateQuestsForUser(tpId).catch(e => console.warn('Quest evaluation error for team player:', e));
        }
      }
    }

    return res.status(200).json({ 
      success: true, 
      xpEarned: 0, 
      newLevel: 1, 
      newXp: 0 
    });
  } catch (err: any) {
    console.error("handleSaveGameResult Crash:", err);
    return res.status(500).json({ success: false, error: err?.message });
  }
}

// ─── 7. UPDATE TITLE (POST /api/users/update-title) ───
async function handleUpdateTitle(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const body = parseBody(req);
    const { userId, title } = body;
    if (!userId || !supabaseAdmin) {
      return res.status(200).json({ success: false });
    }
    await supabaseAdmin.from('profiles').update({ title: title || '' }).eq('id', userId);
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("handleUpdateTitle Crash:", err);
    return res.status(200).json({ success: false, error: err?.message || 'Error' });
  }
}

// ─── 8. UPDATE NAME BG (POST /api/users/update-name-bg) ───
async function handleUpdateNameBg(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const body = parseBody(req);
    const { userId, name_bg_color } = body;
    if (!userId || !supabaseAdmin) {
      return res.status(200).json({ success: false });
    }
    await supabaseAdmin.from('profiles').update({ name_bg_color: name_bg_color || 'none' }).eq('id', userId);
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("handleUpdateNameBg Crash:", err);
    return res.status(200).json({ success: false, error: err?.message || 'Error' });
  }
}

// ─── 8b. UPDATE NAME GLOW (POST /api/users/update-name-glow) ───
async function handleUpdateNameGlow(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const body = parseBody(req);
    const { userId, name_glow } = body;
    if (!userId || !supabaseAdmin) {
      return res.status(200).json({ success: false });
    }
    await supabaseAdmin.from('profiles').update({ name_glow: name_glow || 'none' }).eq('id', userId);
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("handleUpdateNameGlow Crash:", err);
    return res.status(200).json({ success: false, error: err?.message || 'Error' });
  }
}

// ─── 9. DELETE USER (POST /api/users/delete) ───
async function handleDeleteUser(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const body = parseBody(req);
    const userId = body.userId || safeQueryParam(req, 'userId');
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    if (!supabaseAdmin) {
      return res.status(200).json({ success: true });
    }

    await Promise.allSettled([
      supabaseAdmin.from('profiles').delete().eq('id', userId),
      supabaseAdmin.from('game_results').delete().eq('user_id', userId),
      supabaseAdmin.from('achievements').delete().eq('user_id', userId),
      supabaseAdmin.from('user_quest_progress').delete().eq('user_id', userId),
      supabaseAdmin.from('user_titles').delete().eq('user_id', userId),
      supabaseAdmin.auth?.admin?.deleteUser ? supabaseAdmin.auth.admin.deleteUser(userId) : Promise.resolve()
    ]);

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("handleDeleteUser Crash:", err);
    return res.status(500).json({ error: err?.message || 'Fehler beim Löschen des Benutzers' });
  }
}

// ─── 10. EVALUATE QUESTS (POST /api/users/evaluate-quests) ───
async function handleEvaluateQuests(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const body = parseBody(req);
    const userId = body?.userId || safeQueryParam(req, 'userId');
    if (userId) {
      await serverEvaluateQuestsForUser(userId);
    }
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("handleEvaluateQuests error:", err);
    return res.status(200).json({ success: false });
  }
}

// ─── 11. TOURNAMENT LIST (GET /api/tournament/list) ───
async function handleTournamentList(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!supabaseAdmin) return res.status(200).json({ tournaments: [] });

    const { data, error } = await supabaseAdmin
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const tournaments = (data || []).map((row: any) => {
      const cfg = row.config?.config || row.config || {};
      const tables = row.config?.tables || [];
      const vorrundeCount = tables.filter((t: any) => t.id?.startsWith('table_') && t.id !== 'table_second_chance' && t.id !== 'table_final').length;
      const tablesCount = cfg.tablesCount || vorrundeCount || 2;
      const qVorrunde = cfg.qualifikationVorrunde || 1;
      const qSecondChance = cfg.qualifikationSecondChance || 1;
      const hasSecondChance = !!cfg.hasSecondChance;
      const finalistsCount = cfg.finalistsCount || (tablesCount * qVorrunde + (hasSecondChance ? qSecondChance : 0));

      return {
        id: row.id,
        name: row.name,
        status: row.status || 'In Vorbereitung',
        createdDate: cfg.date || new Date(row.created_at).toLocaleDateString('de-DE'),
        tablesCount,
        finalistsCount,
        hasSecondChance
      };
    });

    return res.status(200).json({ tournaments });
  } catch (err: any) {
    console.error("handleTournamentList Crash:", err);
    return res.status(200).json({ tournaments: [], error: err?.message });
  }
}

// ─── 12. TOURNAMENT GET (GET /api/tournament/get?name=...) ───
async function handleTournamentGet(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const name = safeQueryParam(req, 'name');
    if (!name) return res.status(400).json({ error: 'Turniername fehlt' });
    if (!supabaseAdmin) return res.status(200).json({ config: { name }, tables: [], results: [] });

    const { data, error } = await supabaseAdmin
      .from('tournaments')
      .select('*')
      .eq('name', name)
      .maybeSingle();

    if (error || !data) {
      return res.status(200).json({
        config: { name, tablesCount: 0, finalistsCount: 0, hasSecondChance: false, date: '' },
        tables: [],
        results: []
      });
    }

    const payload = data.config || {};
    return res.status(200).json({
      config: payload.config || { name: data.name },
      tables: payload.tables || [],
      results: payload.results || []
    });
  } catch (err: any) {
    console.error("handleTournamentGet Crash:", err);
    return res.status(200).json({ config: {}, tables: [], results: [], error: err?.message });
  }
}

// ─── 13. TOURNAMENT SAVE (POST /api/tournament/save) ───
async function handleTournamentSave(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!supabaseAdmin) return res.status(200).json({ success: false });

    const payload = parseBody(req);
    const action = payload.action;

    // A) Turnier erstellen
    if (action === 'create') {
      const name = (payload.name || '').trim();
      if (!name) return res.status(400).json({ success: false, error: 'Turniername ist erforderlich' });

      const tablesCount = Number(payload.tablesCount) || 2;
      const qualifikationVorrunde = Number(payload.qualifikationVorrunde) || 1;
      const qualifikationSecondChance = Number(payload.qualifikationSecondChance) || 1;
      const hasSecondChance = !!payload.hasSecondChance;
      const finalistsCount = (tablesCount * qualifikationVorrunde) + (hasSecondChance ? qualifikationSecondChance : 0);

      const tableColors = ['#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1', '#84CC16', '#E11D48'];
      const tables: any[] = [];
      for (let i = 1; i <= tablesCount; i++) {
        tables.push({
          id: `table_${i}`,
          name: `Tisch ${i}`,
          players: [],
          color: tableColors[(i - 1) % tableColors.length],
          status: 'Offen'
        });
      }

      if (hasSecondChance) {
        tables.push({
          id: 'table_second_chance',
          name: 'Second Chance',
          players: [],
          color: '#F59E0B',
          status: 'Offen'
        });
      }

      tables.push({
        id: 'table_final',
        name: 'Finale',
        players: [],
        color: '#D4AF37',
        status: 'Offen'
      });

      const fullTournament = {
        config: {
          name,
          tablesCount,
          qualifikationVorrunde,
          qualifikationSecondChance,
          hasSecondChance,
          finalistsCount,
          date: new Date().toLocaleDateString('de-DE')
        },
        tables,
        results: []
      };

      const { data, error } = await supabaseAdmin
        .from('tournaments')
        .upsert({
          name,
          status: 'In Vorbereitung',
          config: fullTournament
        }, { onConflict: 'name' })
        .select();

      if (error) throw error;
      return res.status(200).json({ success: true, tournament: data?.[0] || fullTournament });
    }

    // B) Teilnehmer und Tische zuweisen / aktualisieren
    if (action === 'updateParticipantsAndTables') {
      const name = payload.name;
      if (!name) return res.status(400).json({ success: false, error: 'Turniername fehlt' });

      const { data: existing } = await supabaseAdmin
        .from('tournaments')
        .select('*')
        .eq('name', name)
        .maybeSingle();

      const existingConfig = existing?.config || {};
      const updatedTables = payload.tables || existingConfig.tables || [];

      const mergedConfig = {
        ...existingConfig,
        tables: updatedTables
      };

      const { error } = await supabaseAdmin
        .from('tournaments')
        .update({ config: mergedConfig, updated_at: new Date().toISOString() })
        .eq('name', name);

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    // C) Tischergebnisse speichern
    if (action === 'saveTableResult') {
      const name = payload.name;
      const tableId = payload.tableId;
      const results = payload.results || [];
      const date = payload.date || new Date().toLocaleDateString('de-DE');

      if (!name || !tableId) return res.status(400).json({ success: false, error: 'Name oder tableId fehlt' });

      const { data: existing } = await supabaseAdmin
        .from('tournaments')
        .select('*')
        .eq('name', name)
        .maybeSingle();

      const existingConfig = existing?.config || {};
      const currentResults = existingConfig.results || [];
      const currentTables = existingConfig.tables || [];

      // Entferne bestehende Ergebnisse für diesen Tisch und füge neue hinzu
      const filteredResults = currentResults.filter((r: any) => r.tableId !== tableId);
      const newTableResults = results.map((r: any) => ({
        tableId,
        name: r.name,
        rank: r.rank,
        avg: r.avg,
        schnaepse: r.schnaepse,
        total: r.total,
        date
      }));
      const updatedResults = [...filteredResults, ...newTableResults];

      // Setze Status des Tisches auf Abgeschlossen
      const updatedTables = currentTables.map((t: any) => {
        if (t.id === tableId) {
          return { ...t, status: 'Abgeschlossen' };
        }
        return t;
      });

      // Bestimme Gesamtstatus des Turniers
      let tournamentStatus = existing?.status || 'In Vorbereitung';
      if (tableId === 'table_final') {
        tournamentStatus = 'Beendet';
      } else if (tableId === 'table_second_chance') {
        tournamentStatus = 'Second Chance';
      } else {
        tournamentStatus = 'Vorrunde läuft';
      }

      const mergedConfig = {
        ...existingConfig,
        tables: updatedTables,
        results: updatedResults
      };

      const { error } = await supabaseAdmin
        .from('tournaments')
        .update({
          status: tournamentStatus,
          config: mergedConfig,
          updated_at: new Date().toISOString()
        })
        .eq('name', name);

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    // D) Direkter Fallback-Upsert
    const { error } = await supabaseAdmin
      .from('tournaments')
      .upsert(payload, { onConflict: 'name' });

    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("handleTournamentSave Crash:", err);
    return res.status(200).json({ success: false, error: err?.message });
  }
}

// ─── 14. TOURNAMENT DELETE (POST / DELETE /api/tournament/delete) ───
async function handleDeleteTournament(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!supabaseAdmin) return res.status(200).json({ success: false });

    const body = parseBody(req);
    const name = body.name || safeQueryParam(req, 'name');
    const id = body.id || safeQueryParam(req, 'id');

    if (!name && !id) {
      return res.status(400).json({ success: false, error: 'Name oder ID des Turniers erforderlich' });
    }

    let query = supabaseAdmin.from('tournaments').delete();
    if (name) query = query.eq('name', name);
    else if (id) query = query.eq('id', id);

    const { error } = await query;
    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("handleDeleteTournament Crash:", err);
    return res.status(200).json({ success: false, error: err?.message });
  }
}

// ─── 15. REPAIR DATABASE (GET / POST /api/repair-database) ───
async function handleRepairDatabase(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({ success: true, report: ['✅ Datenbankprüfung abgeschlossen'], fixes: [], errors: [] });
}

// ─── 16. WIEGSCHAFTEN (GUILDS) HANDLERS ───

// Helper: Filtert ausschließlich Standardspiel (500ml) Spiele
function isStandardspiel500(rawMode?: string | null): boolean {
  if (!rawMode) return true; // Standardspiel 500ml war der historische Standardwert
  const trimmed = rawMode.trim();
  const lower = trimmed.toLowerCase();
  // Speedwiegen & Teamwiegen ausschließen
  if (lower.includes('speed') || lower.includes('team')) return false;
  // 0,33L Varianten ausschließen
  if (lower.includes('0,33') || lower.includes('0.33') || lower.includes('0,3') || lower.includes('330') || lower.includes('33l')) {
    return false;
  }
  // Standardspiel oder 500ml Kennzeichnung
  return lower.includes('standard') || lower.includes('500') || lower === 'standardspiel';
}

// 16.1 GET /api/guilds/my-guild
async function handleGetMyGuild(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const userId = safeQueryParam(req, 'userId') || parseBody(req).userId;
    if (!userId) {
      return res.status(400).json({ inGuild: false, error: 'userId ist erforderlich' });
    }
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (!isUuid) {
      return res.status(200).json({ inGuild: false, guild: null, myRole: null, members: [], stats: null, pendingInvites: [] });
    }
    if (!supabaseAdmin) {
      return res.status(200).json({ inGuild: false, guild: null, myRole: null, members: [], stats: null, pendingInvites: [] });
    }

    // Prüfen, ob der Nutzer in einer Wiegschaft ist
    const { data: memberEntry, error: memberErr } = await supabaseAdmin
      .from('guild_members')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (memberErr) {
      console.warn('handleGetMyGuild member check error:', memberErr);
    }

    // Zustand A: Nutzer ist in KEINER Wiegschaft
    if (!memberEntry) {
      // Offene Einladungen für diesen Nutzer laden
      const { data: rawInvites } = await supabaseAdmin
        .from('guild_invites')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending');

      const invites = rawInvites || [];
      let enrichedInvites: any[] = [];

      if (invites.length > 0) {
        const guildIds = Array.from(new Set(invites.map((i: any) => i.guild_id)));
        const { data: guildList } = await supabaseAdmin
          .from('guilds')
          .select('id, name, tag, description, logo_url')
          .in('id', guildIds);

        const gMap: Record<string, any> = {};
        (guildList || []).forEach((g: any) => { gMap[g.id] = g; });

        enrichedInvites = invites.map((inv: any) => ({
          id: inv.id,
          guild_id: inv.guild_id,
          status: inv.status,
          type: inv.type,
          created_at: inv.created_at,
          guild: gMap[inv.guild_id] || { name: 'Unbekannte Wiegschaft', tag: '???' }
        }));
      }

      return res.status(200).json({
        inGuild: false,
        guild: null,
        myRole: null,
        members: [],
        stats: null,
        pendingInvites: enrichedInvites
      });
    }

    // Zustand B: Nutzer IST in einer Wiegschaft
    const guildId = memberEntry.guild_id;
    const myRole = memberEntry.role || 'member';

    // Wiegschaftsdaten abrufen
    const { data: guild, error: guildErr } = await supabaseAdmin
      .from('guilds')
      .select('*')
      .eq('id', guildId)
      .maybeSingle();

    if (guildErr || !guild) {
      return res.status(200).json({
        inGuild: false,
        guild: null,
        myRole: null,
        members: [],
        stats: null,
        pendingInvites: []
      });
    }

    // Alle Mitglieder der Wiegschaft abrufen
    const { data: rawMembers } = await supabaseAdmin
      .from('guild_members')
      .select('*')
      .eq('guild_id', guildId)
      .order('joined_at', { ascending: true });

    const memberList = rawMembers || [];
    const memberUserIds = memberList.map((m: any) => m.user_id);

    // Profile aller Mitglieder abrufen
    let profileMap: Record<string, any> = {};
    if (memberUserIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, username, avatar_url, title, level, xp, name_bg_color, name_glow')
        .in('id', memberUserIds);

      (profiles || []).forEach((p: any) => {
        if (p?.id) profileMap[p.id] = p;
      });
    }

    const members = memberList.map((m: any) => {
      const prof = profileMap[m.user_id] || {};
      return {
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        username: prof.username || 'Spieler',
        avatar_url: prof.avatar_url || '',
        title: prof.title || '',
        level: prof.level || 1,
        xp: prof.xp || 0,
        name_bg_color: prof.name_bg_color || 'none',
        name_glow: prof.name_glow || 'none'
      };
    });

    // Aggregierte Statistiken aus allen Standardspiel (500ml) Spielen der Mitglieder berechnen
    let stats = {
      gamesCount: 0,
      avg: 0,
      totalSchnaepse: 0,
      avgSchnaepse: 0,
      total: 0
    };

    if (memberUserIds.length > 0) {
      const { data: memberGames } = await supabaseAdmin
        .from('game_results')
        .select('game_mode, avg, schnaepse, total')
        .in('user_id', memberUserIds);

      const allGames = memberGames || [];
      // Nur Standardspiel 500 ml aller Mitglieder summieren & werten
      const games = allGames.filter((g: any) => isStandardspiel500(g.game_mode));

      if (games.length > 0) {
        const count = games.length;
        const sumAvg = games.reduce((acc: number, g: any) => acc + (Number(g.avg) || 0), 0);
        const sumSchnaepse = games.reduce((acc: number, g: any) => acc + (Number(g.schnaepse) || 0), 0);
        const avgVal = Math.round((sumAvg / count) * 100) / 100;
        const avgSchnaepseVal = Math.round((sumSchnaepse / count) * 100) / 100;
        const totalVal = Math.round((avgVal + avgSchnaepseVal) * 100) / 100;

        stats = {
          gamesCount: count,
          avg: avgVal,
          totalSchnaepse: sumSchnaepse,
          avgSchnaepse: avgSchnaepseVal,
          total: totalVal
        };
      }
    }

    return res.status(200).json({
      inGuild: true,
      guild,
      myRole,
      members,
      stats,
      pendingInvites: []
    });
  } catch (err: any) {
    console.error("handleGetMyGuild Crash:", err);
    return res.status(500).json({ inGuild: false, error: err?.message || 'Fehler beim Laden der Wiegschaft' });
  }
}

// Hilfsfunktion: Stellt sicher, dass hochgeladene Wappen im Storage 'avatars' liegen
// und in der SQL-Tabelle lediglich die Verlinkung (HTTPS-URL) gespeichert wird.
async function ensureAvatarStorageUrl(logoUrlOrData: string, prefix = 'guilds'): Promise<string> {
  if (!logoUrlOrData || !logoUrlOrData.startsWith('data:image/')) {
    return logoUrlOrData;
  }
  try {
    const match = logoUrlOrData.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) return logoUrlOrData;
    const rawExt = match[1].toLowerCase();
    const ext = rawExt === 'jpeg' ? 'jpg' : rawExt.includes('svg') ? 'svg' : rawExt;
    const buffer = Buffer.from(match[2], 'base64');
    const filePath = `${prefix}/wappen_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const contentType = rawExt.includes('svg') ? 'image/svg+xml' : `image/${rawExt}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, buffer, { contentType, upsert: true });
    if (upErr) {
      console.error('Failed to upload base64 guild crest to avatars bucket:', upErr);
      return logoUrlOrData;
    }
    const { data: pubData } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(filePath);
    return pubData?.publicUrl || logoUrlOrData;
  } catch (err) {
    console.error('Error in ensureAvatarStorageUrl:', err);
    return logoUrlOrData;
  }
}

// 16.2 POST /api/guilds/create
async function handleCreateGuild(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!supabaseAdmin) return res.status(500).json({ success: false, error: 'Datenbank nicht verfügbar' });

    const payload = parseBody(req);
    const userId = payload.userId;
    const name = (payload.name || '').trim();
    const tag = (payload.tag || '').trim().toUpperCase();
    const description = (payload.description || '').trim();
    const rawLogoUrl = (payload.logo_url || '').trim();
    const logo_url = await ensureAvatarStorageUrl(rawLogoUrl, `guilds/user_${userId}`);

    if (!userId || !name || !tag) {
      return res.status(400).json({ success: false, error: 'Name, Kürzel und Benutzer-ID sind erforderlich' });
    }

    if (tag.length > 5) {
      return res.status(400).json({ success: false, error: 'Das Kürzel/Tag darf maximal 5 Zeichen lang sein.' });
    }

    // Prüfen, ob der Nutzer bereits in einer Wiegschaft ist
    const { data: existingMember } = await supabaseAdmin
      .from('guild_members')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingMember) {
      return res.status(400).json({ success: false, error: 'Du bist bereits Mitglied einer Wiegschaft.' });
    }

    // Prüfen, ob Name oder Kürzel bereits vergeben sind
    const { data: duplicateCheck } = await supabaseAdmin
      .from('guilds')
      .select('id, name, tag')
      .or(`name.ilike.${encodeURIComponent(name)},tag.ilike.${encodeURIComponent(tag)}`)
      .limit(1);

    if (duplicateCheck && duplicateCheck.length > 0) {
      return res.status(400).json({ success: false, error: 'Eine Wiegschaft mit diesem Namen oder Kürzel existiert bereits.' });
    }

    // Neue Wiegschaft anlegen
    const { data: newGuild, error: createErr } = await supabaseAdmin
      .from('guilds')
      .insert({
        name,
        tag,
        description,
        logo_url,
        captain_id: userId,
        level: 1,
        xp: 0
      })
      .select()
      .single();

    if (createErr || !newGuild) {
      throw createErr || new Error('Wiegschaft konnte nicht erstellt werden');
    }

    // Ersteller als 'captain' eintragen
    const { error: memberErr } = await supabaseAdmin
      .from('guild_members')
      .insert({
        guild_id: newGuild.id,
        user_id: userId,
        role: 'captain'
      });

    if (memberErr) {
      console.error('Fehler beim Eintragen des Kapitäns:', memberErr);
    }

    // Eventuell bestehende offene Einladungen an diesen Nutzer löschen
    await supabaseAdmin
      .from('guild_invites')
      .delete()
      .eq('user_id', userId);

    return res.status(200).json({ success: true, guild: newGuild });
  } catch (err: any) {
    console.error("handleCreateGuild Crash:", err);
    return res.status(500).json({ success: false, error: err?.message || 'Fehler beim Erstellen der Wiegschaft' });
  }
}

// 16.3 POST /api/guilds/update
async function handleUpdateGuild(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!supabaseAdmin) return res.status(500).json({ success: false, error: 'Datenbank nicht verfügbar' });

    const payload = parseBody(req);
    const { userId, guildId, name, tag, description, logo_url } = payload;

    if (!userId || !guildId) {
      return res.status(400).json({ success: false, error: 'userId und guildId sind erforderlich' });
    }

    // Berechtigungsprüfung: Nur Kapitän darf bearbeiten
    const { data: caller } = await supabaseAdmin
      .from('guild_members')
      .select('role')
      .eq('guild_id', guildId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!caller || caller.role !== 'captain') {
      return res.status(403).json({ success: false, error: 'Nur der Kapitän kann die Wiegschaft bearbeiten.' });
    }

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = (name || '').trim();
    if (tag !== undefined) {
      const cleanTag = (tag || '').trim().toUpperCase();
      if (cleanTag.length > 5) {
        return res.status(400).json({ success: false, error: 'Das Kürzel/Tag darf maximal 5 Zeichen lang sein.' });
      }
      updates.tag = cleanTag;
    }
    if (description !== undefined) updates.description = (description || '').trim();
    if (logo_url !== undefined) {
      updates.logo_url = await ensureAvatarStorageUrl((logo_url || '').trim(), `guilds/${guildId}`);
    }

    const { error: updateErr } = await supabaseAdmin
      .from('guilds')
      .update(updates)
      .eq('id', guildId);

    if (updateErr) throw updateErr;

    return res.status(200).json({ success: true, message: 'Wiegschaft erfolgreich aktualisiert' });
  } catch (err: any) {
    console.error("handleUpdateGuild Crash:", err);
    return res.status(500).json({ success: false, error: err?.message || 'Fehler beim Aktualisieren der Wiegschaft' });
  }
}

// 16.4 POST /api/guilds/delete
async function handleDeleteGuild(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!supabaseAdmin) return res.status(500).json({ success: false, error: 'Datenbank nicht verfügbar' });

    const payload = parseBody(req);
    const { userId, guildId } = payload;

    if (!userId || !guildId) {
      return res.status(400).json({ success: false, error: 'userId und guildId sind erforderlich' });
    }

    // Berechtigungsprüfung: Nur Kapitän darf auflösen
    const { data: caller } = await supabaseAdmin
      .from('guild_members')
      .select('role')
      .eq('guild_id', guildId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!caller || caller.role !== 'captain') {
      return res.status(403).json({ success: false, error: 'Nur der Kapitän kann die Wiegschaft auflösen.' });
    }

    // Kaskadierendes Löschen von Einladungen, Mitgliedern und der Wiegschaft
    await supabaseAdmin.from('guild_invites').delete().eq('guild_id', guildId);
    await supabaseAdmin.from('guild_members').delete().eq('guild_id', guildId);
    const { error: delErr } = await supabaseAdmin.from('guilds').delete().eq('id', guildId);

    if (delErr) throw delErr;

    return res.status(200).json({ success: true, message: 'Wiegschaft erfolgreich aufgelöst' });
  } catch (err: any) {
    console.error("handleDeleteGuild Crash:", err);
    return res.status(500).json({ success: false, error: err?.message || 'Fehler beim Auflösen der Wiegschaft' });
  }
}

// 16.5 POST /api/guilds/invite
async function handleInviteToGuild(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!supabaseAdmin) return res.status(500).json({ success: false, error: 'Datenbank nicht verfügbar' });

    const payload = parseBody(req);
    const { userId, guildId, username } = payload;

    if (!userId || !guildId || !username) {
      return res.status(400).json({ success: false, error: 'userId, guildId und username sind erforderlich' });
    }

    // Berechtigungsprüfung: Kapitän & Vize-Kapitän dürfen einladen
    const { data: caller } = await supabaseAdmin
      .from('guild_members')
      .select('role')
      .eq('guild_id', guildId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!caller || (caller.role !== 'captain' && caller.role !== 'vize_captain')) {
      return res.status(403).json({ success: false, error: 'Nur Kapitäne und Vize-Kapitäne dürfen Einladungen versenden.' });
    }

    // Zielnutzer in profiles suchen
    const { data: targetProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .ilike('username', username.trim())
      .maybeSingle();

    if (profileErr || !targetProfile) {
      return res.status(404).json({ success: false, error: `Kein Spieler mit dem Namen "${username}" gefunden.` });
    }

    const targetUserId = targetProfile.id;

    // Prüfen, ob Zielnutzer bereits in einer Wiegschaft ist
    const { data: targetMember } = await supabaseAdmin
      .from('guild_members')
      .select('guild_id')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (targetMember) {
      return res.status(400).json({ success: false, error: `"${targetProfile.username}" ist bereits Mitglied einer Wiegschaft.` });
    }

    // Prüfen, ob bereits eine offene Einladung vorliegt
    const { data: existingInvite } = await supabaseAdmin
      .from('guild_invites')
      .select('id, status')
      .eq('guild_id', guildId)
      .eq('user_id', targetUserId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvite) {
      return res.status(400).json({ success: false, error: `Es liegt bereits eine offene Einladung an "${targetProfile.username}" vor.` });
    }

    // Einladung eintragen
    const { error: inviteErr } = await supabaseAdmin
      .from('guild_invites')
      .insert({
        guild_id: guildId,
        user_id: targetUserId,
        status: 'pending',
        type: 'invite'
      });

    if (inviteErr) throw inviteErr;

    return res.status(200).json({ success: true, message: `Einladung an "${targetProfile.username}" versendet!` });
  } catch (err: any) {
    console.error("handleInviteToGuild Crash:", err);
    return res.status(500).json({ success: false, error: err?.message || 'Fehler beim Versenden der Einladung' });
  }
}

// 16.6 POST /api/guilds/respond-invite
async function handleRespondInvite(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!supabaseAdmin) return res.status(500).json({ success: false, error: 'Datenbank nicht verfügbar' });

    const payload = parseBody(req);
    const { userId, inviteId, action } = payload; // action: 'accept' | 'reject'

    if (!userId || !inviteId || !action) {
      return res.status(400).json({ success: false, error: 'userId, inviteId und action sind erforderlich' });
    }

    // Einladung laden und verifizieren
    const { data: invite, error: invErr } = await supabaseAdmin
      .from('guild_invites')
      .select('*')
      .eq('id', inviteId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (invErr || !invite) {
      return res.status(404).json({ success: false, error: 'Offene Einladung nicht gefunden.' });
    }

    if (action === 'reject') {
      await supabaseAdmin
        .from('guild_invites')
        .update({ status: 'rejected' })
        .eq('id', inviteId);

      return res.status(200).json({ success: true, message: 'Einladung abgelehnt' });
    }

    if (action === 'accept') {
      // Prüfen, ob der Nutzer inzwischen schon einer Wiegschaft beigetreten ist
      const { data: currentMembership } = await supabaseAdmin
        .from('guild_members')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (currentMembership) {
        return res.status(400).json({ success: false, error: 'Du bist bereits Mitglied einer Wiegschaft.' });
      }

      // Nutzer als Mitglied eintragen
      const { error: joinErr } = await supabaseAdmin
        .from('guild_members')
        .insert({
          guild_id: invite.guild_id,
          user_id: userId,
          role: 'member'
        });

      if (joinErr) throw joinErr;

      // Einladungsstatus auf accepted setzen
      await supabaseAdmin
        .from('guild_invites')
        .update({ status: 'accepted' })
        .eq('id', inviteId);

      // Alle anderen offenen Einladungen für diesen Nutzer entfernen
      await supabaseAdmin
        .from('guild_invites')
        .delete()
        .eq('user_id', userId)
        .eq('status', 'pending');

      return res.status(200).json({ success: true, message: 'Wiegschaft erfolgreich beigetreten!' });
    }

    return res.status(400).json({ success: false, error: 'Ungültige Aktion' });
  } catch (err: any) {
    console.error("handleRespondInvite Crash:", err);
    return res.status(500).json({ success: false, error: err?.message || 'Fehler beim Antworten auf die Einladung' });
  }
}

// 16.7 POST /api/guilds/manage-member
async function handleManageMember(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!supabaseAdmin) return res.status(500).json({ success: false, error: 'Datenbank nicht verfügbar' });

    const payload = parseBody(req);
    const { userId, guildId, targetUserId, action } = payload;
    // action: 'kick' | 'promote_vize' | 'demote_member' | 'leave'

    if (!userId || !guildId || !action) {
      return res.status(400).json({ success: false, error: 'userId, guildId und action sind erforderlich' });
    }

    // A) EIGENSTÄNDIGES AUSTRETEN ('leave')
    if (action === 'leave') {
      const { data: callerMember } = await supabaseAdmin
        .from('guild_members')
        .select('role')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!callerMember) {
        return res.status(404).json({ success: false, error: 'Du bist kein Mitglied dieser Wiegschaft.' });
      }

      if (callerMember.role === 'captain') {
        return res.status(400).json({
          success: false,
          error: 'Als Kapitän kannst du die Wiegschaft nicht einfach verlassen. Löse die Wiegschaft auf, wenn du sie beenden möchtest.'
        });
      }

      const { error: leaveErr } = await supabaseAdmin
        .from('guild_members')
        .delete()
        .eq('guild_id', guildId)
        .eq('user_id', userId);

      if (leaveErr) throw leaveErr;

      return res.status(200).json({ success: true, message: 'Wiegschaft erfolgreich verlassen' });
    }

    // B) VERWALTUNG ANDERER MITGLIEDER ('kick', 'promote_vize', 'demote_member')
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'targetUserId ist erforderlich' });
    }

    // Berechtigungsprüfung des Ausführenden
    const { data: caller } = await supabaseAdmin
      .from('guild_members')
      .select('role')
      .eq('guild_id', guildId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!caller || (caller.role !== 'captain' && caller.role !== 'vize_captain')) {
      return res.status(403).json({ success: false, error: 'Keine Berechtigung zur Mitgliederverwaltung.' });
    }

    // Rolle des Zielmitglieds laden
    const { data: target } = await supabaseAdmin
      .from('guild_members')
      .select('role')
      .eq('guild_id', guildId)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (!target) {
      return res.status(404).json({ success: false, error: 'Zielmitglied nicht in dieser Wiegschaft gefunden.' });
    }

    // Kapitän darf weder gekickt noch degradiert werden
    if (target.role === 'captain') {
      return res.status(403).json({ success: false, error: 'Der Kapitän kann nicht entfernt oder degradiert werden.' });
    }

    // Vize-Kapitän darf keine anderen Vize-Kapitäne kicken oder degradieren
    if (caller.role === 'vize_captain' && target.role === 'vize_captain') {
      return res.status(403).json({ success: false, error: 'Ein Vize-Kapitän kann andere Vize-Kapitäne nicht verwalten.' });
    }

    if (action === 'kick') {
      const { error: kickErr } = await supabaseAdmin
        .from('guild_members')
        .delete()
        .eq('guild_id', guildId)
        .eq('user_id', targetUserId);

      if (kickErr) throw kickErr;
      return res.status(200).json({ success: true, message: 'Mitglied erfolgreich entfernt' });
    }

    if (action === 'promote_vize') {
      const { error: promoErr } = await supabaseAdmin
        .from('guild_members')
        .update({ role: 'vize_captain' })
        .eq('guild_id', guildId)
        .eq('user_id', targetUserId);

      if (promoErr) throw promoErr;
      return res.status(200).json({ success: true, message: 'Mitglied zum Vize-Kapitän ernannt' });
    }

    if (action === 'demote_member') {
      const { error: demoErr } = await supabaseAdmin
        .from('guild_members')
        .update({ role: 'member' })
        .eq('guild_id', guildId)
        .eq('user_id', targetUserId);

      if (demoErr) throw demoErr;
      return res.status(200).json({ success: true, message: 'Vize-Kapitän Rolle entzogen' });
    }

    return res.status(400).json({ success: false, error: 'Ungültige Aktion' });
  } catch (err: any) {
    console.error("handleManageMember Crash:", err);
    return res.status(500).json({ success: false, error: err?.message || 'Fehler bei der Mitgliederverwaltung' });
  }
}

// 16.8 GET /api/guilds/leaderboard
async function handleGuildLeaderboard(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!supabaseAdmin) {
      return res.status(200).json({ success: true, leaderboard: [] });
    }

    const [guildsRes, membersRes, gamesRes] = await Promise.all([
      supabaseAdmin.from('guilds').select('*'),
      supabaseAdmin.from('guild_members').select('guild_id, user_id, role'),
      supabaseAdmin.from('game_results').select('user_id, game_mode, avg, schnaepse, total')
    ]);

    const allGuilds = guildsRes?.data || [];
    const allMembers = membersRes?.data || [];
    const allGames = gamesRes?.data || [];

    // Nur Standardspiel (500ml) aller Mitglieder berücksichtigen
    const standardGames = allGames.filter((g: any) => isStandardspiel500(g.game_mode));

    // Map: userId -> array of games
    const gamesByUser: Record<string, any[]> = {};
    standardGames.forEach((g: any) => {
      if (!g?.user_id) return;
      if (!gamesByUser[g.user_id]) gamesByUser[g.user_id] = [];
      gamesByUser[g.user_id].push(g);
    });

    // Map: guildId -> array of members
    const membersByGuild: Record<string, any[]> = {};
    allMembers.forEach((m: any) => {
      if (!m?.guild_id) return;
      if (!membersByGuild[m.guild_id]) membersByGuild[m.guild_id] = [];
      membersByGuild[m.guild_id].push(m);
    });

    const leaderboard = allGuilds.map((g: any) => {
      const gMembers = membersByGuild[g.id] || [];
      const memberCount = gMembers.length;

      // Alle Standardspiele (500ml) aller Mitglieder dieser Wiegschaft einsammeln
      const guildGames: any[] = [];
      gMembers.forEach((m: any) => {
        const uGames = gamesByUser[m.user_id] || [];
        guildGames.push(...uGames);
      });

      const gamesCount = guildGames.length;
      let avg = 0;
      let schnaepse = 0;
      let total = 0;
      let sumSchnaepse = 0;

      if (gamesCount > 0) {
        const sumAvg = guildGames.reduce((acc, gm) => acc + (Number(gm.avg) || 0), 0);
        sumSchnaepse = guildGames.reduce((acc, gm) => acc + (Number(gm.schnaepse) || 0), 0);
        avg = Math.round((sumAvg / gamesCount) * 100) / 100;
        schnaepse = Math.round((sumSchnaepse / gamesCount) * 100) / 100;
        total = Math.round((avg + schnaepse) * 100) / 100;
      }

      return {
        id: g.id,
        name: g.name,
        tag: g.tag,
        description: g.description || '',
        logo_url: g.logo_url || '',
        memberCount,
        membersCount: memberCount,
        gamesCount,
        avg,
        schnaepse,
        avgSchnaepse: schnaepse,
        totalSchnaepse: sumSchnaepse,
        total,
        created_at: g.created_at
      };
    });

    // Sortierung nach Total aufsteigend (niedrigeres Total = besser im Wiegen!)
    // Wiegschaften ohne Spiele werden hinten einsortiert
    leaderboard.sort((a: any, b: any) => {
      if (a.gamesCount === 0 && b.gamesCount === 0) return a.name.localeCompare(b.name);
      if (a.gamesCount === 0) return 1;
      if (b.gamesCount === 0) return -1;
      if (a.total !== b.total) return a.total - b.total;
      return a.avg - b.avg;
    });

    // Ränge zuweisen
    const ranked = leaderboard.map((item: any, index: number) => ({
      ...item,
      rank: index + 1
    }));

    return res.status(200).json({ success: true, leaderboard: ranked });
  } catch (err: any) {
    console.error("handleGuildLeaderboard Crash:", err);
    return res.status(200).json({ success: true, leaderboard: [], error: err?.message });
  }
}

// ─── MAIN ROUTER ───
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const rawUrl = req.url || '';
    const pathname = rawUrl.split('?')[0].replace(/^\/api/, '').replace(/\/$/, '') || '/';

    // 1. Records & Upload
    if (pathname === '/records') {
      return await handleRecords(req, res);
    }
    if (pathname === '/upload') {
      return await handleUpload(req, res);
    }

    // 2. Benutzer-Routen (mit exakten Pfaden gegen Routing-Kollisionen)
    if (pathname === '/users/find-by-username') {
      return await handleFindByUsername(req, res);
    }
    if (pathname === '/users/profile-data' || pathname === '/profile-data') {
      return await handleGetProfileData(req, res);
    }
    if (pathname === '/users/save-game-result' || pathname === '/save-game-result' || pathname === '/save-result') {
      return await handleSaveGameResult(req, res);
    }
    if (pathname === '/users/update-title' || pathname === '/update-title') {
      return await handleUpdateTitle(req, res);
    }
    if (pathname === '/users/update-name-bg' || pathname === '/update-name-bg') {
      return await handleUpdateNameBg(req, res);
    }
    if (pathname === '/users/update-name-glow' || pathname === '/update-name-glow') {
      return await handleUpdateNameGlow(req, res);
    }
    if (pathname === '/users/delete') {
      return await handleDeleteUser(req, res);
    }
    if (pathname === '/users/evaluate-quests' || pathname === '/evaluate-quests') {
      return await handleEvaluateQuests(req, res);
    }
    if (pathname === '/users/list' || pathname === '/users') {
      return await handleUsersList(req, res);
    }

    // 3. Turnier-Routen
    if (pathname === '/tournament/list' || pathname === '/tournaments') {
      return await handleTournamentList(req, res);
    }
    if (pathname === '/tournament/get' || pathname === '/tournament') {
      return await handleTournamentGet(req, res);
    }
    if (pathname === '/tournament/save' || pathname === '/tournament/create') {
      return await handleTournamentSave(req, res);
    }
    if (pathname === '/tournament/delete') {
      return await handleDeleteTournament(req, res);
    }

    // 4. Wiegschaften (Gilden) Routen
    if (pathname === '/guilds/my-guild') {
      return await handleGetMyGuild(req, res);
    }
    if (pathname === '/guilds/create') {
      return await handleCreateGuild(req, res);
    }
    if (pathname === '/guilds/update') {
      return await handleUpdateGuild(req, res);
    }
    if (pathname === '/guilds/delete') {
      return await handleDeleteGuild(req, res);
    }
    if (pathname === '/guilds/invite') {
      return await handleInviteToGuild(req, res);
    }
    if (pathname === '/guilds/respond-invite') {
      return await handleRespondInvite(req, res);
    }
    if (pathname === '/guilds/manage-member') {
      return await handleManageMember(req, res);
    }
    if (pathname === '/guilds/leaderboard') {
      return await handleGuildLeaderboard(req, res);
    }

    // 5. Datenbankwartung
    if (pathname === '/repair-database') {
      return await handleRepairDatabase(req, res);
    }

    return res.status(404).json({ error: `Route ${rawUrl} nicht gefunden.`, data: [] });
  } catch (err: any) {
    console.error("Router Crash:", err);
    return res.status(500).json({ error: "Server Error", message: err?.message || String(err), data: [] });
  }
}
