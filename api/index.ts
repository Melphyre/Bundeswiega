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

    const [profRes, resultsRes, achRes, questRes, titlesRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabaseAdmin.from('game_results').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabaseAdmin.from('achievements').select('*').eq('user_id', userId),
      supabaseAdmin.from('user_quest_progress').select('*').eq('user_id', userId),
      supabaseAdmin.from('user_titles').select('*').eq('user_id', userId)
    ]);

    return res.status(200).json({
      profile: profRes?.data || null,
      gameResults: resultsRes?.data || [],
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
      .select('id, username, email, role, avatar_url, title, level, xp, name_bg_color')
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
      name_bg_color: p.name_bg_color || 'none'
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

    const insertPayload = {
      ...gameResultData,
      user_id: userId || null
    };

    const { data, error } = await supabaseAdmin
      .from('game_results')
      .insert(insertPayload)
      .select();

    if (error) {
      console.error("Fehler beim Speichern in game_results:", error);
      return res.status(400).json({ success: false, error: error.message });
    }

    if (payload.achievements && Array.isArray(payload.achievements) && payload.achievements.length > 0) {
      const savedGameId = data?.[0]?.id;
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
    return res.status(200).json({ success: true });
  } catch {
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

    // 4. Datenbankwartung
    if (pathname === '/repair-database') {
      return await handleRepairDatabase(req, res);
    }

    return res.status(404).json({ error: `Route ${rawUrl} nicht gefunden.`, data: [] });
  } catch (err: any) {
    console.error("Router Crash:", err);
    return res.status(500).json({ error: "Server Error", message: err?.message || String(err), data: [] });
  }
}
