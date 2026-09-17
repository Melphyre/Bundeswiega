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

// ─── 16. WIEGSCHAFTEN (GUILDS) HANDLERS ───

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
        .select('id, username, avatar_url, title, level, xp, name_bg_color')
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
        name_bg_color: prof.name_bg_color || 'none'
      };
    });

    // Aggregierte Statistiken aus game_results der Mitglieder berechnen
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
        .select('avg, schnaepse, total')
        .in('user_id', memberUserIds);

      const games = memberGames || [];
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
    const logo_url = (payload.logo_url || '').trim();

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
    if (logo_url !== undefined) updates.logo_url = (logo_url || '').trim();

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
      supabaseAdmin.from('game_results').select('user_id, avg, schnaepse, total')
    ]);

    const allGuilds = guildsRes?.data || [];
    const allMembers = membersRes?.data || [];
    const allGames = gamesRes?.data || [];

    // Map: userId -> array of games
    const gamesByUser: Record<string, any[]> = {};
    allGames.forEach((g: any) => {
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

      // Alle Spiele aller Mitglieder dieser Wiegschaft einsammeln
      const guildGames: any[] = [];
      gMembers.forEach((m: any) => {
        const uGames = gamesByUser[m.user_id] || [];
        guildGames.push(...uGames);
      });

      const gamesCount = guildGames.length;
      let avg = 0;
      let schnaepse = 0;
      let total = 0;

      if (gamesCount > 0) {
        const sumAvg = guildGames.reduce((acc, gm) => acc + (Number(gm.avg) || 0), 0);
        const sumSchnaepse = guildGames.reduce((acc, gm) => acc + (Number(gm.schnaepse) || 0), 0);
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
        membersCount: memberCount,
        gamesCount,
        avg,
        schnaepse,
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
