import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import { calculateGameXp, calculateLevelFromXp, getLevelFromXP } from '../src/utils/levelSystem';
import { checkTournamentAchievements } from '../utils';
import { MASTER_ACHIEVEMENTS_DEFINITIONS } from '../src/achievementsData';

let rawSupabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
if (rawSupabaseUrl.includes('.supabase.com')) {
  rawSupabaseUrl = rawSupabaseUrl.replace('.supabase.com', '.supabase.co');
} else if (rawSupabaseUrl && !rawSupabaseUrl.includes('.supabase.co')) {
  const clean = rawSupabaseUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (!clean.includes('.')) {
    rawSupabaseUrl = `https://${clean}.supabase.co`;
  }
}

const supabaseUrl = rawSupabaseUrl;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const isSupabaseConfigured = () => {
  return (
    !!supabaseUrl &&
    !!supabaseSecretKey &&
    supabaseUrl.includes('supabase.co') &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseSecretKey.includes('placeholder')
  );
};

let schemaEnsured = false;
async function ensureCoreSchema() {
  if (schemaEnsured || !isSupabaseConfigured()) return;
  try {
    const coreSql = `
CREATE TABLE IF NOT EXISTS public.game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_guest BOOLEAN DEFAULT false,
  player_name TEXT,
  game_mode TEXT NOT NULL,
  date TEXT NOT NULL,
  avg NUMERIC(8,2) NOT NULL DEFAULT 0,
  schnaepse INTEGER NOT NULL DEFAULT 0,
  time_seconds NUMERIC(8,2),
  total NUMERIC(8,2) NOT NULL DEFAULT 0,
  levels INTEGER,
  team_name TEXT,
  tournament_name TEXT,
  tournament_table TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.game_results ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false;
ALTER TABLE public.game_results ADD COLUMN IF NOT EXISTS player_name TEXT;
ALTER TABLE public.game_results ADD COLUMN IF NOT EXISTS tournament_name TEXT;
ALTER TABLE public.game_results ADD COLUMN IF NOT EXISTS tournament_table TEXT;
ALTER TABLE public.game_results ADD COLUMN IF NOT EXISTS time_seconds NUMERIC(8,2);
ALTER TABLE public.game_results ADD COLUMN IF NOT EXISTS levels INTEGER;
ALTER TABLE public.game_results ADD COLUMN IF NOT EXISTS team_name TEXT;
ALTER TABLE public.game_results ALTER COLUMN user_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_guest BOOLEAN DEFAULT false,
  player_name TEXT,
  achievement_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  rarity TEXT DEFAULT 'common',
  game_mode TEXT,
  earned_with TEXT[],
  earned_together BOOLEAN DEFAULT false,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false;
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS player_name TEXT;
ALTER TABLE public.achievements ALTER COLUMN user_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'In Vorbereitung',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.database_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

    try {
      await supabaseAdmin.rpc('exec_sql', { sql: coreSql });
      schemaEnsured = true;
      return;
    } catch {
      // rpc might not exist
    }

    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
    if (dbUrl) {
      try {
        const { Client } = await import('pg');
        const pgClient = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
        await pgClient.connect();
        await pgClient.query(coreSql);
        await pgClient.end();
        schemaEnsured = true;
      } catch (e: any) {
        console.warn('pgClient schema ensure error:', e?.message);
      }
    }
  } catch (err: any) {
    console.warn('ensureCoreSchema warning:', err?.message);
  }
}

const supabaseAdmin = createClient(
  supabaseUrl || '',
  supabaseSecretKey || ''
);

function getRequestBody(req: VercelRequest): any {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body || {};
}

function getRequestQuery(req: VercelRequest): Record<string, string> {
  const queryObj: Record<string, string> = {};
  if (req.query && Object.keys(req.query).length > 0) {
    for (const [k, v] of Object.entries(req.query)) {
      queryObj[k] = Array.isArray(v) ? String(v[0]) : String(v || '');
    }
    return queryObj;
  }
  try {
    const urlObj = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    urlObj.searchParams.forEach((val, key) => {
      queryObj[key] = val;
    });
  } catch {
    // Ignore parse error
  }
  return queryObj;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawUrl = req.url || '';
  const pathName = rawUrl.split('?')[0] || '';

  try {
    // ── Records ──────────────────────────────────────
    if (pathName === '/api/records' && req.method === 'GET') {
      return await handleRecords(req, res);
    }

    // ── Upload ───────────────────────────────────────
    if (pathName === '/api/upload' && req.method === 'POST') {
      return await handleUpload(req, res);
    }

    // ── Users ────────────────────────────────────────
    if (pathName === '/api/users/list' && req.method === 'GET') {
      return await handleUsersList(req, res);
    }
    if (pathName === '/api/users/save-game-result' && req.method === 'POST') {
      return await handleSaveGameResult(req, res);
    }
    if (pathName === '/api/users/update-title' && req.method === 'POST') {
      return await handleUpdateTitle(req, res);
    }
    if (pathName === '/api/users/update-name-bg' && req.method === 'POST') {
      return await handleUpdateNameBg(req, res);
    }
    if (pathName === '/api/users/save-result' && req.method === 'POST') {
      return await handleSaveResult(req, res);
    }
    if (pathName === '/api/users/update-privacy' && req.method === 'POST') {
      return await handleUpdatePrivacy(req, res);
    }
    if (pathName === '/api/users/delete' && req.method === 'POST') {
      return await handleDeleteUser(req, res);
    }
    if (pathName === '/api/users/find-by-username' && req.method === 'GET') {
      return await handleFindByUsername(req, res);
    }
    if (pathName === '/api/users/check-username' && req.method === 'GET') {
      return await handleCheckUsername(req, res);
    }
    if (pathName === '/api/users/public-records' && req.method === 'GET') {
      return await handlePublicRecords(req, res);
    }
    if (pathName === '/api/users/profile-data' && req.method === 'GET') {
      return await handleGetProfileData(req, res);
    }

    // ── Admin ────────────────────────────────────────
    if (pathName === '/api/admin/rename' && req.method === 'POST') {
      return await handleAdminRename(req, res);
    }
    if (pathName === '/api/admin/assign-to-account' && req.method === 'POST') {
      return await handleAssignToAccount(req, res);
    }
    if (pathName === '/api/admin/migrate-to-sql' && req.method === 'POST') {
      return await handleMigrateToSQL(req, res);
    }
    if (pathName === '/api/admin/migrate-tournament-to-csv' && req.method === 'POST') {
      return await handleTournamentMigrateToCSV(req, res);
    }
    if (pathName === '/api/admin/migrate-to-staging' && req.method === 'POST') {
      return await handleMigrateToStaging(req, res);
    }
    if (pathName === '/api/admin/save-csv' && req.method === 'POST') {
      return await handleSaveCsv(req, res);
    }
    if (pathName === '/api/admin/set-role' && req.method === 'POST') {
      return await handleAdminSetRole(req, res);
    }
    if (pathName === '/api/admin/repair-database' && req.method === 'POST') {
      return await handleRepairDatabase(req, res);
    }

    // ── Tournament ───────────────────────────────────
    if (pathName === '/api/tournament/list' && req.method === 'GET') {
      return await handleTournamentList(req, res);
    }
    if (pathName === '/api/tournament/get' && req.method === 'GET') {
      return await handleTournamentGet(req, res);
    }
    if (pathName === '/api/tournament/save' && req.method === 'POST') {
      return await handleTournamentSave(req, res);
    }
    if (pathName === '/api/tournament/delete' && req.method === 'POST') {
      return await handleTournamentDelete(req, res);
    }

    return res.status(404).json({ error: `Route nicht gefunden: ${pathName}` });
  } catch (err: any) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message || 'Interner Fehler' });
  }
}

// ════════════════════════════════════════════════
// HANDLER FUNKTIONEN
// ════════════════════════════════════════════════

async function handleRecords(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureCoreSchema();

    if (!isSupabaseConfigured()) {
      return res.status(200).json({ data: [] });
    }

    // Load results, profiles, achievements directly from Supabase
    const [resultsRes, profilesRes, achRes] = await Promise.all([
      supabaseAdmin.from('game_results').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('profiles').select('*'),
      supabaseAdmin.from('achievements').select('*')
    ]);

    if (resultsRes.error) {
      console.error('game_results select error:', resultsRes.error);
      return res.status(500).json({ error: resultsRes.error.message, data: [] });
    }

    const profileMap: Record<string, any> = {};
    (profilesRes.data || []).forEach(p => {
      if (p && p.id) profileMap[p.id] = p;
    });

    const safeResults = Array.isArray(resultsRes.data) ? resultsRes.data : [];
    const safeAchs = Array.isArray(achRes.data) ? achRes.data : [];

    const rows = safeResults
      .filter(r => {
        if (!r) return false;
        if (r.user_id) {
          const profile = profileMap[r.user_id];
          if (profile) {
            if (profile.show_records === false) return false;
            const mode = (r.game_mode || '').toLowerCase();
            if (mode.includes('standardspiel') && profile.show_standardspiel === false) return false;
            if (mode.includes('speedwiegen') && profile.show_speedwiegen === false) return false;
            if (mode.includes('teamwiegen') && profile.show_teamwiegen === false) return false;
          }
        }
        return true;
      })
      .map(r => {
        const profile = r.user_id ? profileMap[r.user_id] : null;
        const playerName = profile?.username || r.player_name || (r.is_guest ? 'Gast' : 'Unbekannt');
        const canonicalMode = r.game_mode || 'Standardspiel';

        const entryAchs = safeAchs
          .filter(a => {
            if (!a) return false;
            const matchUser = r.user_id ? a.user_id === r.user_id : (a.player_name === playerName || a.is_guest);
            const matchDate = a.date === r.date;
            return matchUser && matchDate && (a.game_mode === canonicalMode || !a.game_mode);
          })
          .map(a => ({
            id: a.achievement_id,
            title: a.title,
            icon: a.icon,
            rarity: a.rarity,
            earnedBy: a.earned_with || [playerName],
            earnedTogether: a.earned_together
          }));

        const isSpeed = (r.game_mode || '').toLowerCase().includes('speed') || (r.time_seconds !== null && r.time_seconds !== undefined);
        const schnaepseOrTime = (isSpeed && r.time_seconds !== null && r.time_seconds !== undefined)
          ? String(r.time_seconds)
          : String(r.schnaepse ?? 0);

        return [
          r.date || '',
          canonicalMode,
          playerName,
          String(r.avg ?? 0),
          schnaepseOrTime,
          String(r.total ?? 0),
          entryAchs.length > 0 ? encodeURIComponent(JSON.stringify(entryAchs)) : ''
        ];
      });

    const header = ['Datum', 'Modus', 'Name', 'Avg', 'Schnaepse', 'Total', 'Achievements'];
    return res.status(200).json({ data: [header, ...rows] });
  } catch (error: any) {
    console.error("Error in records handler:", error);
    return res.status(500).json({ error: error.message || "Fehler beim Laden der Statistiken", data: [] });
  }
}

async function handleUpload(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = getRequestBody(req);
  const { gameMode, results, date, achievements } = body;

  if (!gameMode || !results || !Array.isArray(results) || !date) {
    return res.status(400).json({ error: "Invalid request payload. Must include gameMode, results array, and date." });
  }

  try {
    await ensureCoreSchema();

    if (!isSupabaseConfigured()) {
      return res.status(500).json({ error: 'Supabase ist nicht konfiguriert.' });
    }

    // Load registered user profiles for matching
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, username, games_played, total_points, high_score, xp, level');

    const profileMap = new Map<string, any>();
    (profiles || []).forEach((p: any) => {
      if (p.username) {
        profileMap.set(p.username.toLowerCase().trim(), p);
      }
    });

    const isSpeedMode = gameMode.toLowerCase().includes('speed');
    const TOGETHER_ACHIEVEMENT_IDS = ['twins', 'doppelganger', 'mirror_number', 'shadow', 'equilibrium'];

    let savedResultsCount = 0;
    let savedAchievementsCount = 0;

    for (const item of results) {
      const rawName = (item.name || '').trim();
      if (!rawName) continue;

      let userId: string | null = item.userId || null;
      let matchedProfile: any = null;

      if (userId) {
        matchedProfile = (profiles || []).find((p: any) => p.id === userId);
      } else {
        matchedProfile = profileMap.get(rawName.toLowerCase());
        if (matchedProfile) {
          userId = matchedProfile.id;
        }
      }

      const isGuest = !userId;
      const playerName = matchedProfile ? matchedProfile.username : rawName;
      const avg = Number(item.avg) || 0;

      let schnaepse = 0;
      let timeSeconds: number | null = null;
      let total = 0;

      if (isSpeedMode || item.time_seconds !== undefined) {
        timeSeconds = item.time_seconds !== undefined ? Number(item.time_seconds) : (Number(item.schnaepse) || null);
        schnaepse = 0;
        total = Math.round((avg + (timeSeconds || 0)) * 100) / 100;
      } else {
        schnaepse = Number(item.schnaepse) || 0;
        timeSeconds = null;
        total = Math.round((avg + schnaepse) * 100) / 100;
      }

      // Insert into public.game_results
      const { error: insertErr } = await supabaseAdmin
        .from('game_results')
        .insert({
          user_id: isGuest ? null : userId,
          is_guest: isGuest,
          player_name: playerName,
          game_mode: gameMode,
          date,
          avg,
          schnaepse,
          time_seconds: timeSeconds,
          total,
          levels: item.levels !== undefined ? Number(item.levels) : null,
          team_name: item.team_name || null
        });

      if (insertErr) {
        console.error(`game_results insert error for ${playerName}:`, insertErr.message);
      } else {
        savedResultsCount++;
      }

      // If registered user, update profiles stats and XP
      if (!isGuest && matchedProfile) {
        try {
          const xpResult = calculateGameXp({
            avg,
            schnaepse,
            isSpeedMode,
            timeSeconds: isSpeedMode ? (timeSeconds || 0) : undefined,
            isWinner: false
          });
          const earnedXp = xpResult.totalXp;

          const currentXp = Number(matchedProfile.xp) || 0;
          const newXp = currentXp + earnedXp;
          const newLevel = getLevelFromXP(newXp);
          const newGamesPlayed = (Number(matchedProfile.games_played) || 0) + 1;
          const newTotalPoints = (Number(matchedProfile.total_points) || 0) + (isSpeedMode ? (timeSeconds || 0) : schnaepse);
          const currentHigh = (matchedProfile.high_score !== null && matchedProfile.high_score !== undefined)
            ? Number(matchedProfile.high_score)
            : 999;
          const newHighScore = (currentHigh === 0 || avg < currentHigh) ? avg : currentHigh;

          await supabaseAdmin
            .from('profiles')
            .update({
              xp: newXp,
              level: newLevel,
              games_played: newGamesPlayed,
              total_points: newTotalPoints,
              high_score: newHighScore,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          matchedProfile.xp = newXp;
          matchedProfile.level = newLevel;
          matchedProfile.games_played = newGamesPlayed;
          matchedProfile.total_points = newTotalPoints;
          matchedProfile.high_score = newHighScore;
        } catch (profErr: any) {
          console.warn('Profile stats update warning:', profErr.message);
        }
      }

      // Handle achievements for this player
      const rawPlayerAch = item.achievements && item.achievements.length > 0
        ? item.achievements
        : (achievements && Array.isArray(achievements)
            ? achievements.filter((a: any) => a.earnedBy && Array.isArray(a.earnedBy) && a.earnedBy.some((eb: string) => eb.toLowerCase() === rawName.toLowerCase()))
            : []);

      for (const a of rawPlayerAch) {
        if (!a.id) continue;

        const isTogether = typeof a.earnedTogether === 'boolean'
          ? a.earnedTogether
          : TOGETHER_ACHIEVEMENT_IDS.includes(a.id);

        const earnedWith = Array.isArray(a.earnedBy) && a.earnedBy.length > 0 ? a.earnedBy : [playerName];

        // Duplicate check
        let dupeQuery = supabaseAdmin
          .from('achievements')
          .select('id')
          .eq('achievement_id', a.id)
          .eq('date', date);

        if (isGuest) {
          dupeQuery = dupeQuery.eq('player_name', playerName).eq('is_guest', true);
        } else {
          dupeQuery = dupeQuery.eq('user_id', userId);
        }

        const { data: existingAch } = await dupeQuery.limit(1);
        if (existingAch && existingAch.length > 0) continue;

        const def = MASTER_ACHIEVEMENTS_DEFINITIONS.find(d => d.id === a.id);

        const { error: achErr } = await supabaseAdmin
          .from('achievements')
          .insert({
            user_id: isGuest ? null : userId,
            is_guest: isGuest,
            player_name: isGuest ? playerName : null,
            achievement_id: a.id,
            title: a.title || def?.title || a.id,
            description: a.description || def?.description || '',
            icon: a.icon || def?.icon || '🏆',
            rarity: a.rarity || def?.rarity || 'common',
            game_mode: gameMode,
            earned_with: earnedWith,
            earned_together: isTogether,
            date
          });

        if (!achErr) {
          savedAchievementsCount++;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `${savedResultsCount} Ergebnisse und ${savedAchievementsCount} Achievements erfolgreich in Supabase gespeichert!`,
      savedResultsCount,
      savedAchievementsCount
    });
  } catch (error: any) {
    console.error("Error in upload handler:", error);
    return res.status(500).json({ error: error.message || "Fehler beim Upload der Ergebnisse in Supabase." });
  }
}

async function handleUsersList(req: VercelRequest, res: VercelResponse) {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(200).json({ users: [] });
    }

    // Aus profiles Tabelle laden (hat username und title korrekt gespeichert)
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, username, email, avatar_url, role, title, selected_title, level, xp, name_bg_color')
      .order('username');

    if (!error && profiles && profiles.length > 0) {
      const userList = profiles.map((p: any) => ({
        id: p.id,
        name: p.username || p.email || 'Unbekannt',
        username: p.username || '',
        email: p.email || '',
        role: p.role || 'user',
        imageUrl: p.avatar_url || '',
        title: p.title || p.selected_title || '',
        level: Number(p.level) || 1,
        xp: Number(p.xp) || 0,
        name_bg_color: p.name_bg_color || 'none'
      }));
      return res.status(200).json({ users: userList });
    }

    // Fallback auf auth.admin.listUsers()
    const { data, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError || !data?.users) {
      return res.status(200).json({ users: [] });
    }

    const userList = data.users.map((u: any) => ({
      id: u.id,
      name: u.user_metadata?.username || u.email || 'Unbekannt',
      username: u.user_metadata?.username || '',
      email: u.email || '',
      role: u.user_metadata?.role || 'user',
      imageUrl: u.user_metadata?.avatar_url || '',
      title: u.user_metadata?.title || '',
      name_bg_color: u.user_metadata?.name_bg_color || 'none'
    }));

    return res.status(200).json({ users: userList });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, users: [] });
  }
}

async function handleUpdateNameBg(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = getRequestBody(req) || req.body || {};
    const { userId, name_bg_color } = body;
    if (!userId) return res.status(400).json({ error: 'userId fehlt' });

    if (!isSupabaseConfigured()) {
      return res.status(200).json({ success: true, message: 'Lokal aktualisiert' });
    }

    // 1. Auth Metadata aktualisieren
    try {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { name_bg_color: name_bg_color || 'none' }
      });
    } catch (authErr: any) {
      console.warn('Auth name_bg_color update warning:', authErr?.message);
    }

    // 2. Profiles Tabelle aktualisieren
    try {
      await supabaseAdmin
        .from('profiles')
        .update({ name_bg_color: name_bg_color || 'none' })
        .eq('id', userId);
    } catch (profErr: any) {
      console.warn('Profile name_bg_color update warning:', profErr?.message);
    }

    return res.status(200).json({ success: true, name_bg_color: name_bg_color || 'none' });
  } catch (err: any) {
    console.error('handleUpdateNameBg error:', err);
    return res.status(500).json({ error: err.message });
  }
}

async function handleUpdateTitle(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = getRequestBody(req) || req.body || {};
    const { userId, title } = body;
    if (!userId) return res.status(400).json({ error: 'userId fehlt' });

    if (!isSupabaseConfigured()) {
      return res.status(200).json({ success: true, message: 'Lokal aktualisiert' });
    }

    // 1. Auth Metadata aktualisieren
    try {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { title: title || '' }
      });
    } catch (authErr: any) {
      console.warn('Auth title update warning:', authErr?.message);
    }

    // 2. Profiles Tabelle aktualisieren
    try {
      await supabaseAdmin
        .from('profiles')
        .update({ title: title || '' })
        .eq('id', userId);
    } catch (profErr: any) {
      console.warn('Profile title column update warning:', profErr?.message);
    }

    return res.status(200).json({ success: true, title: title || '' });
  } catch (err: any) {
    console.error('handleUpdateTitle error:', err);
    return res.status(500).json({ error: err.message });
  }
}

async function handleSaveGameResult(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = getRequestBody(req) || req.body || {};
    const { userId, gameResult, achievements: achievementsList } = body;

    if (!userId) return res.status(400).json({ error: 'userId fehlt' });
    if (!gameResult) return res.status(400).json({ error: 'gameResult fehlt' });
    if (!gameResult.game_mode) return res.status(400).json({ error: 'game_mode fehlt' });
    if (!gameResult.date) return res.status(400).json({ error: 'date fehlt' });

    const avg = Number(gameResult.avg) || 0;
    const schnaepse = Number(gameResult.schnaepse) || 0;
    const total = Math.round((avg + schnaepse) * 100) / 100;

    console.log('save-game-result:', { userId, game_mode: gameResult.game_mode, avg, schnaepse, total });

    const { data: insertedResult, error: insertError } = await supabaseAdmin
      .from('game_results')
      .insert({
        user_id: userId,
        game_mode: gameResult.game_mode,
        date: gameResult.date,
        avg,
        schnaepse,
        total,
        levels: gameResult.levels || null,
        time_seconds: gameResult.time_seconds || null,
        team_name: gameResult.team_name || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('game_results insert error:', insertError);
      return res.status(500).json({ error: insertError.message, code: insertError.code });
    }

    console.log('game_results gespeichert:', insertedResult?.id);

    // Achievements speichern
    let achSaved = 0;
    if (achievementsList?.length > 0) {
      for (const ach of achievementsList) {
        if (!ach.id) continue;

        // Duplikat prüfen
        const { data: existing } = await supabaseAdmin
          .from('achievements')
          .select('id')
          .eq('user_id', userId)
          .eq('achievement_id', ach.id)
          .eq('date', gameResult.date)
          .limit(1);

        if (existing && existing.length > 0) continue;

        const { error: achError } = await supabaseAdmin
          .from('achievements')
          .insert({
            user_id: userId,
            achievement_id: ach.id,
            title: ach.title || '',
            description: ach.description || '',
            icon: ach.icon || '',
            rarity: ach.rarity || 'common',
            game_mode: gameResult.game_mode,
            earned_with: ach.earnedBy || [],
            earned_together: ach.earnedTogether || false,
            date: gameResult.date
          });

        if (!achError) achSaved++;
        else console.error('Achievement insert error:', achError.message);
      }
    }

    // Profile-Statistiken manuell aktualisieren
    // (als Backup falls Trigger nicht feuert)
    const { data: userResults } = await supabaseAdmin
      .from('game_results')
      .select('avg, schnaepse')
      .eq('user_id', userId);

    const gamesPlayed = userResults?.length || 0;
    const totalSchnaepse = userResults?.reduce((s: number, r: any) => s + (Number(r.schnaepse) || 0), 0) || 0;
    const validAvgs = userResults?.filter((r: any) => r.avg != null) || [];
    const bestAvg = validAvgs.length > 0
      ? Math.min(...validAvgs.map((r: any) => Number(r.avg)))
      : null;

    // Aktuelles Profil für XP & Level abrufen
    const { data: currentProf } = await supabaseAdmin
      .from('profiles')
      .select('xp, level, title, selected_title')
      .eq('id', userId)
      .maybeSingle();

    const curXp = Number(currentProf?.xp || 0);
    const isWinner = gameResult.isWinner === true || false;
    const isSpeed = (gameResult.game_mode || '').includes('Speedwiegen');
    const xpResult = calculateGameXp({
      avg,
      schnaepse,
      isWinner,
      isSpeedMode: isSpeed,
      speedLevels: gameResult.levels,
      timeSeconds: gameResult.time_seconds,
      achievementsCount: achSaved
    });

    const newXp = curXp + xpResult.totalXp;
    const levelInfo = calculateLevelFromXp(newXp);
    const newLevel = levelInfo.level;

    await supabaseAdmin
      .from('profiles')
      .update({
        games_played: gamesPlayed,
        total_points: totalSchnaepse,
        high_score: bestAvg,
        xp: newXp,
        level: newLevel,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    return res.status(200).json({
      message: 'Ergebnis gespeichert',
      resultId: insertedResult?.id,
      achSaved,
      xpEarned: xpResult.totalXp,
      newXp,
      newLevel,
      xpBreakdown: xpResult.items
    });

  } catch (err: any) {
    console.error('save-game-result exception:', err);
    return res.status(500).json({ error: err.message });
  }
}

async function handleSaveResult(req: VercelRequest, res: VercelResponse) {
  try {
    const body = getRequestBody(req);
    const { userId, result } = body;
    if (!userId || !result) {
      return res.status(400).json({ error: 'userId und result erforderlich' });
    }

    if (!isSupabaseConfigured()) {
      return res.status(500).json({ error: 'SUPABASE_SECRET_KEY / URL fehlt' });
    }

    const { data: { user }, error: getErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (getErr || !user) throw getErr || new Error('User nicht gefunden');

    const existingData = Array.isArray(user.user_metadata?.gameData) ? user.user_metadata.gameData : [];
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...user.user_metadata,
        gameData: [...existingData, result]
      }
    });

    if (updateErr) throw updateErr;

    return res.status(200).json({ message: 'Ergebnis gespeichert' });
  } catch (err: any) {
    console.error('save-result error:', err);
    return res.status(500).json({ error: err.message || 'Fehler beim Speichern' });
  }
}

async function handleUpdatePrivacy(req: VercelRequest, res: VercelResponse) {
  try {
    const body = getRequestBody(req);
    const { userId, showRecords } = body;
    if (!userId) {
      return res.status(400).json({ error: 'userId ist erforderlich' });
    }

    if (!isSupabaseConfigured()) {
      return res.status(500).json({ error: 'SUPABASE_SECRET_KEY / URL fehlt.' });
    }

    const { data: { user }, error: getErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (getErr || !user) throw getErr || new Error('User nicht gefunden');

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...user.user_metadata,
        showRecords: showRecords !== false
      }
    });

    if (updateErr) throw updateErr;

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Error in update-privacy handler:', err);
    return res.status(500).json({ error: err.message || 'Serverfehler' });
  }
}

async function handleDeleteUser(req: VercelRequest, res: VercelResponse) {
  try {
    const body = getRequestBody(req);
    const { userId } = body;
    if (!userId) return res.status(400).json({ error: 'userId fehlt' });
    if (!isSupabaseConfigured()) return res.status(500).json({ error: 'Supabase nicht konfiguriert' });

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
    return res.status(200).json({ message: 'Account gelöscht' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Fehler beim Löschen des Accounts' });
  }
}

async function handleFindByUsername(req: VercelRequest, res: VercelResponse) {
  try {
    const query = getRequestQuery(req);
    const { username } = query;
    if (!username || !isSupabaseConfigured()) return res.status(404).json({ email: null });

    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error || !data?.users) return res.status(404).json({ email: null });

    const user = data.users.find((u: any) =>
      u.user_metadata?.username?.toLowerCase() === username.toLowerCase()
    );
    if (!user) return res.status(404).json({ email: null });
    return res.status(200).json({ email: user.email });
  } catch (err: any) {
    return res.status(404).json({ email: null });
  }
}

async function handleCheckUsername(req: VercelRequest, res: VercelResponse) {
  try {
    const query = getRequestQuery(req);
    const { username, currentUserId } = query;
    if (!username) return res.status(400).json({ error: 'Username fehlt' });
    if (!isSupabaseConfigured()) return res.status(200).json({ taken: false, username });

    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error || !data?.users) return res.status(200).json({ taken: false, username });

    const taken = data.users.some((u: any) =>
      (u.user_metadata?.username?.toLowerCase() === username.toLowerCase()) &&
      u.id !== currentUserId
    );
    return res.status(200).json({ taken, username });
  } catch (err: any) {
    return res.status(200).json({ taken: false });
  }
}

async function handlePublicRecords(req: VercelRequest, res: VercelResponse) {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(200).json({ records: [] });
    }

    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error || !data?.users) {
      return res.status(200).json({ records: [] });
    }
    const users = data.users;

    const publicRecords: any[] = [];

    users.forEach((u: any) => {
      const meta = u.user_metadata || {};
      const privacy = meta.privacy || {};

      if (meta.showRecords === false || privacy.showRecords === false) return;

      const gameData = Array.isArray(meta.gameData) ? meta.gameData : [];
      const name = meta.username || u.email || 'Unbekannt';

      gameData.forEach((entry: any) => {
        const mode = entry.gameMode || 'Standardspiel';

        if (mode === 'Standardspiel' && privacy.showStandardspiel === false) return;
        if (mode === 'Speedwiegen' && privacy.showSpeedwiegen === false) return;
        if (mode === 'Teamwiegen' && privacy.showTeamwiegen === false) return;

        let achievements = entry.achievements || '';
        if (privacy.showAchievements === false) achievements = '';

        publicRecords.push({
          date: entry.date || '',
          gameMode: mode,
          playerName: name,
          avg: entry.avg || 0,
          schnaepse: entry.schnaepse || 0,
          levels: entry.levels,
          achievements: achievements,
          source: 'account'
        });
      });
    });

    return res.status(200).json({ records: publicRecords });
  } catch (err: any) {
    return res.status(200).json({ records: [] });
  }
}

async function handleGetProfileData(req: VercelRequest, res: VercelResponse) {
  try {
    const query = getRequestQuery(req);
    const userId = (query.userId || '').trim();

    if (!userId) {
      return res.status(400).json({ error: 'userId ist erforderlich.' });
    }

    if (!isSupabaseConfigured()) {
      return res.status(200).json({
        profile: null,
        gameResults: [],
        achievements: []
      });
    }

    const [profileRes, resultsRes, achRes] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(),
      supabaseAdmin
        .from('game_results')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('achievements')
        .select('*')
        .eq('user_id', userId)
    ]);

    const profile = profileRes?.data || null;
    const gameResults = Array.isArray(resultsRes?.data) ? resultsRes.data : [];
    const achievements = Array.isArray(achRes?.data) ? achRes.data : [];

    return res.status(200).json({
      profile,
      gameResults,
      achievements
    });
  } catch (err: any) {
    console.error('handleGetProfileData error:', err);
    return res.status(200).json({
      profile: null,
      gameResults: [],
      achievements: []
    });
  }
}

async function handleAdminRename(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureCoreSchema();

    const body = getRequestBody(req);
    const { oldName, newName, requesterUserId } = body;

    if (!oldName || !newName || typeof oldName !== "string" || typeof newName !== "string") {
      return res.status(400).json({ error: "Ungültige Parameter. oldName und newName erforderlich." });
    }

    const trimmedOld = oldName.trim();
    const trimmedNew = newName.trim();

    if (!trimmedOld || !trimmedNew) {
      return res.status(400).json({ error: "Namen dürfen nicht leer sein." });
    }

    if (trimmedOld === trimmedNew) {
      return res.status(400).json({ error: "Der neue Name muss sich vom alten Namen unterscheiden." });
    }

    if (requesterUserId && isSupabaseConfigured()) {
      try {
        const { data: { user: reqUser } } = await supabaseAdmin.auth.admin.getUserById(requesterUserId);
        if (reqUser && reqUser.user_metadata?.role !== 'admin') {
          return res.status(403).json({ error: "Keine Admin-Rechte" });
        }
      } catch (authErr) {
        console.warn("Auth check warning:", authErr);
      }
    }

    let modifiedCount = 0;

    if (isSupabaseConfigured()) {
      // 1. Update player_name in game_results
      const { data: updatedResults, error: resErr } = await supabaseAdmin
        .from('game_results')
        .update({ player_name: trimmedNew })
        .eq('player_name', trimmedOld)
        .select('id');

      if (!resErr && updatedResults) {
        modifiedCount += updatedResults.length;
      }

      // 2. Update player_name in achievements
      const { data: updatedAchs, error: achErr } = await supabaseAdmin
        .from('achievements')
        .update({ player_name: trimmedNew })
        .eq('player_name', trimmedOld)
        .select('id');

      if (!achErr && updatedAchs) {
        modifiedCount += updatedAchs.length;
      }

      // 3. Also check tournaments config
      const { data: allTourneys } = await supabaseAdmin.from('tournaments').select('*');
      if (allTourneys && allTourneys.length > 0) {
        for (const tourney of allTourneys) {
          const stringified = JSON.stringify(tourney.config || {});
          if (stringified.includes(trimmedOld)) {
            const replaced = stringified.split(`"${trimmedOld}"`).join(`"${trimmedNew}"`);
            try {
              const parsed = JSON.parse(replaced);
              await supabaseAdmin
                .from('tournaments')
                .update({ config: parsed, updated_at: new Date().toISOString() })
                .eq('id', tourney.id);
            } catch (pErr) {
              console.warn('Error updating tourney config for rename:', pErr);
            }
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      modifiedCount,
      message: `Erfolgreich ${modifiedCount} Datensätze von "${trimmedOld}" zu "${trimmedNew}" umbenannt!`
    });
  } catch (error: any) {
    console.error("Error in rename handler:", error);
    return res.status(500).json({ error: error.message || "Fehler beim Umbenennen in den Rekorden." });
  }
}

async function handleAssignToAccount(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureCoreSchema();

    const body = getRequestBody(req);
    const { requesterUserId, csvName, targetUserId, entries: reqEntries } = body;
    if ((!csvName && !reqEntries) || !targetUserId) {
      return res.status(400).json({ error: 'targetUserId und (csvName oder entries) sind erforderlich.' });
    }

    if (!isSupabaseConfigured()) {
      return res.status(500).json({ error: 'SUPABASE_SECRET_KEY / URL fehlt.' });
    }

    // Admin check if requesterUserId is provided
    if (requesterUserId) {
      const { data: { user: reqUser } } = await supabaseAdmin.auth.admin.getUserById(requesterUserId);
      if (reqUser) {
        const role = reqUser.user_metadata?.role;
        if (role !== 'admin') {
          return res.status(403).json({ error: 'Keine Admin-Rechte' });
        }
      }
    }

    // Fetch target user from Supabase
    const { data: { user: targetUser }, error: userErr } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
    if (userErr || !targetUser) {
      return res.status(404).json({ error: 'Ziel-Account nicht gefunden.' });
    }

    const targetUsername = targetUser.user_metadata?.username || targetUser.email || 'Benutzer';
    const trimmedCsvName = (csvName || '').trim();

    let assignedCount = 0;

    if (trimmedCsvName) {
      // 1. Assign in game_results
      const { data: assignedResults, error: resErr } = await supabaseAdmin
        .from('game_results')
        .update({ user_id: targetUserId, is_guest: false, player_name: targetUsername })
        .ilike('player_name', trimmedCsvName)
        .eq('is_guest', true)
        .select('id, avg, schnaepse, time_seconds, game_mode');

      if (!resErr && assignedResults) {
        assignedCount += assignedResults.length;
      }

      // 2. Assign in achievements
      await supabaseAdmin
        .from('achievements')
        .update({ user_id: targetUserId, is_guest: false, player_name: null })
        .ilike('player_name', trimmedCsvName)
        .eq('is_guest', true);
    }

    // 3. Recalculate target user profile stats in Supabase
    const { data: allUserGames } = await supabaseAdmin
      .from('game_results')
      .select('avg, schnaepse, time_seconds, game_mode')
      .eq('user_id', targetUserId);

    if (allUserGames && allUserGames.length > 0) {
      const gamesPlayed = allUserGames.length;
      let totalPoints = 0;
      let minAvg = 999;
      let totalXp = 0;

      allUserGames.forEach(g => {
        const avg = Number(g.avg) || 0;
        const schnaepse = Number(g.schnaepse) || 0;
        const timeSec = Number(g.time_seconds) || 0;
        totalPoints += (g.time_seconds !== null && g.time_seconds !== undefined) ? timeSec : schnaepse;
        if (avg > 0 && avg < minAvg) minAvg = avg;

        const isSpeed = (g.game_mode || '').toLowerCase().includes('speed');
        const xpRes = calculateGameXp({
          avg,
          schnaepse,
          isSpeedMode: isSpeed,
          timeSeconds: isSpeed ? timeSec : undefined,
          isWinner: false
        });
        totalXp += xpRes.totalXp;
      });

      const newLevel = getLevelFromXP(totalXp);
      const highScore = minAvg === 999 ? 0 : minAvg;

      await supabaseAdmin
        .from('profiles')
        .update({
          games_played: gamesPlayed,
          total_points: totalPoints,
          high_score: highScore,
          xp: totalXp,
          level: newLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetUserId);
    }

    return res.status(200).json({
      success: true,
      count: assignedCount,
      message: `${assignedCount} Einträge von "${trimmedCsvName || 'Spieler'}" erfolgreich ${targetUsername} zugeordnet.`
    });
  } catch (err: any) {
    console.error("Error in assign-to-account handler:", err);
    return res.status(500).json({ error: err.message || 'Fehler beim Zuweisen' });
  }
}

async function handleMigrateToSQL(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureCoreSchema();
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    let dataRows: string[][] = [];

    // 1. Aus Vercel Blob laden (falls Token vorhanden)
    if (token) {
      try {
        const { list } = await import('@vercel/blob');
        const { blobs } = await list({ prefix: 'results', token });
        const resultsBlob = blobs.find(b => b.pathname === 'results.csv');
        if (resultsBlob) {
          const csvResponse = await fetch(resultsBlob.url);
          const csvText = await csvResponse.text();
          const csvRows = csvText.trim().split('\n').map(r => r.split(';'));
          dataRows = csvRows.filter(row =>
            row.length >= 5 &&
            row[0] !== 'Datum' &&
            row[2] !== 'Name' &&
            row[2]?.trim() !== ''
          );
        }
      } catch (blobErr) {
        console.warn('handleMigrateToSQL blob error:', blobErr);
      }
    }

    // 2. Fallback: aus staging_results_csv laden
    if (dataRows.length === 0) {
      const { data: stagingRows } = await supabaseAdmin
        .from('staging_results_csv')
        .select('raw_line');
      if (stagingRows && stagingRows.length > 0) {
        dataRows = stagingRows
          .map((r: any) => r.raw_line.split(';'))
          .filter((row: string[]) => row.length >= 5 && row[0] !== 'Datum' && row[2] !== 'Name' && row[2]?.trim() !== '');
      }
    }

    if (dataRows.length === 0) {
      return res.status(200).json({
        message: '0 Einträge in CSV gefunden',
        migrated: 0, skipped_no_account: 0, skipped_duplicate: 0, errors: 0, total_csv_rows: 0
      });
    }

    // 2. Alle Profile aus Supabase laden (username → id Mapping)
    const usernameToId: Record<string, string> = {};

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, username');

    if (!profilesError && profiles) {
      profiles.forEach((p: any) => {
        if (p.username) {
          usernameToId[p.username.toLowerCase().trim()] = p.id;
        }
      });
    }

    // Fallback/Ergänzung auf auth.users falls manche Profile nicht in profiles-Tabelle stehen
    try {
      const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
      if (authData?.users) {
        authData.users.forEach((u: any) => {
          const uname = u.user_metadata?.username || u.user_metadata?.name || u.email;
          if (uname && !usernameToId[uname.toLowerCase().trim()]) {
            usernameToId[uname.toLowerCase().trim()] = u.id;
          }
        });
      }
    } catch (e) {
      console.warn('Fallback listUsers error:', e);
    }

    if (Object.keys(usernameToId).length === 0 && profilesError) {
      return res.status(500).json({ error: `Profile laden fehlgeschlagen: ${profilesError.message}` });
    }

    // 3. Bereits vorhandene Einträge laden um Duplikate zu vermeiden
    const { data: existingResults } = await supabaseAdmin
      .from('game_results')
      .select('user_id, date, game_mode');

    const existingSet = new Set(
      (existingResults || []).map(r => `${r.user_id}|${r.date}|${r.game_mode}`)
    );

    // 4. CSV Zeilen verarbeiten
    let migrated = 0;
    let skipped_no_account = 0;
    let skipped_duplicate = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    for (const row of dataRows) {
      const [date, gameMode, playerName, avg, schnaepse, total, achievementsJson] = row;

      if (!playerName?.trim()) { skipped_no_account++; continue; }

      // Account suchen
      const userId = usernameToId[playerName.toLowerCase().trim()];
      if (!userId) {
        skipped_no_account++;
        continue;
      }

      // Duplikat prüfen
      const key = `${userId}|${date?.trim()}|${gameMode?.trim()}`;
      if (existingSet.has(key)) {
        skipped_duplicate++;
        continue;
      }

      // Ergebnis in Supabase eintragen
      const avgVal = parseFloat(avg) || 0;
      const schnaepseVal = parseInt(schnaepse) || 0;
      const totalVal = Math.round((avgVal + schnaepseVal) * 100) / 100;

      const { error: insertError } = await supabaseAdmin
        .from('game_results')
        .insert({
          user_id: userId,
          game_mode: gameMode?.trim(),
          date: date?.trim(),
          avg: avgVal,
          schnaepse: schnaepseVal,
          total: totalVal
        });

      if (insertError) {
        // Duplikat durch Race Condition – überspringen
        if (insertError.code === '23505') {
          skipped_duplicate++;
          continue;
        }
        errors++;
        errorDetails.push(`${playerName}/${date}: ${insertError.message}`);
        continue;
      }

      // Zum existingSet hinzufügen damit spätere Duplikate erkannt werden
      existingSet.add(key);

      // Achievements migrieren falls vorhanden
      if (achievementsJson?.trim()) {
        try {
          const achievementsList = JSON.parse(achievementsJson.trim());
          if (Array.isArray(achievementsList)) {
            for (const ach of achievementsList) {
              if (!ach.id || !ach.earnedBy?.includes(playerName.trim())) continue;

              // Duplikat-Prüfung für Achievements
              const { data: existingAch } = await supabaseAdmin
                .from('achievements')
                .select('id')
                .eq('user_id', userId)
                .eq('achievement_id', ach.id)
                .eq('date', date?.trim())
                .limit(1);

              if (existingAch && existingAch.length > 0) continue;

              await supabaseAdmin.from('achievements').insert({
                user_id: userId,
                achievement_id: ach.id,
                title: ach.title || '',
                description: ach.description || '',
                icon: ach.icon || '',
                rarity: ach.rarity || 'common',
                game_mode: gameMode?.trim(),
                earned_with: ach.earnedBy || [],
                earned_together: ach.earnedTogether || false,
                date: date?.trim()
              });
            }
          }
        } catch (parseErr) {
          console.error('Achievement JSON parse error:', parseErr);
        }
      }

      migrated++;
    }

    let migrated_from_metadata = 0;
    let profiles_updated = 0;

    // 5. Supabase user_metadata.gameData prüfen und migrieren
    try {
      const { data: { users: allUsers } } = await supabaseAdmin.auth.admin.listUsers();
      if (allUsers && Array.isArray(allUsers)) {
        for (const authUser of allUsers) {
          const gameData = authUser.user_metadata?.gameData || [];
          if (Array.isArray(gameData) && gameData.length > 0) {
            for (const entry of gameData) {
              const mode = entry.gameMode || entry.game_mode || 'Unbekannt';
              const key = `${authUser.id}|${entry.date}|${mode}`;

              if (existingSet.has(key)) continue;

              const { error: insertErr } = await supabaseAdmin.from('game_results').insert({
                user_id: authUser.id,
                game_mode: mode,
                date: entry.date,
                avg: parseFloat(entry.avg) || 0,
                schnaepse: parseInt(entry.schnaepse) || 0,
                total: parseFloat(entry.total) || 0,
                levels: entry.levels || null,
                time_seconds: entry.time_seconds || null,
                team_name: entry.team_name || null
              });

              if (!insertErr) {
                existingSet.add(key);
                migrated_from_metadata++;

                // Achievements aus user_metadata übertragen
                const achList = entry.achievements || [];
                if (Array.isArray(achList)) {
                  for (const ach of achList) {
                    if (!ach.id) continue;
                    const { data: existingAch } = await supabaseAdmin
                      .from('achievements')
                      .select('id')
                      .eq('user_id', authUser.id)
                      .eq('achievement_id', ach.id)
                      .eq('date', entry.date)
                      .limit(1);

                    if (existingAch && existingAch.length > 0) continue;

                    await supabaseAdmin.from('achievements').insert({
                      user_id: authUser.id,
                      achievement_id: ach.id,
                      title: ach.title || '',
                      description: ach.description || '',
                      icon: ach.icon || '',
                      rarity: ach.rarity || 'common',
                      game_mode: mode,
                      earned_with: ach.earnedBy || [],
                      earned_together: ach.earnedTogether || false,
                      date: entry.date
                    });
                  }
                }
              }
            }

            // user_metadata.gameData leeren
            await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
              user_metadata: {
                ...authUser.user_metadata,
                gameData: []
              }
            });
          }
        }

        // 6. Profiles Statistiken aktualisieren
        for (const authUser of allUsers) {
          const { data: results } = await supabaseAdmin
            .from('game_results')
            .select('avg, schnaepse, total')
            .eq('user_id', authUser.id);

          if (!results || results.length === 0) continue;

          const gamesPlayed = results.length;
          const avgDistance = results.reduce((s, r) => s + (r.avg || 0), 0) / gamesPlayed;
          const totalSchnaepse = results.reduce((s, r) => s + (r.schnaepse || 0), 0);
          const bestAvg = Math.min(...results.map(r => r.avg ?? 999));

          const { error: profUpdErr } = await supabaseAdmin.from('profiles').update({
            games_played: gamesPlayed,
            total_points: totalSchnaepse,
            high_score: (bestAvg !== 999) ? bestAvg : 0
          }).eq('id', authUser.id);

          if (!profUpdErr) {
            profiles_updated++;
          }
        }

        // 7. Am Ende der Migration – Benutzernamen in profiles synchronisieren
        let profiles_synced = 0;

        for (const authUser of allUsers) {
          const authUsername = authUser.user_metadata?.username;
          if (!authUsername) continue;

          // Prüfen ob Profil existiert
          const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, username, email')
            .eq('id', authUser.id)
            .single();

          if (!existingProfile) {
            // Profil anlegen falls nicht vorhanden
            const { error: insertError } = await supabaseAdmin
              .from('profiles')
              .insert({
                id: authUser.id,
                username: authUsername,
                email: authUser.email || '',
                role: authUser.user_metadata?.role || 'user'
              });
            if (!insertError) profiles_synced++;
          } else {
            // Profil aktualisieren falls Username oder Email abweicht
            const needsUpdate =
              existingProfile.username !== authUsername ||
              existingProfile.email !== authUser.email;

            if (needsUpdate) {
              const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update({
                  username: authUsername,
                  email: authUser.email || existingProfile.email
                })
                .eq('id', authUser.id);
              if (!updateError) profiles_synced++;
            }
          }
        }

        return res.status(200).json({
          message: `Migration abgeschlossen: ${migrated} aus CSV, ${migrated_from_metadata} aus Account-Daten übertragen, ${skipped_no_account} ohne Account übersprungen, ${skipped_duplicate} Duplikate übersprungen, ${errors} Fehler, ${profiles_updated} Profile aktualisiert, ${profiles_synced} Profile synchronisiert`,
          migrated,
          migrated_from_metadata,
          skipped_no_account,
          skipped_duplicate,
          errors,
          profiles_updated,
          profiles_synced,
          total_csv_rows: dataRows.length,
          errorDetails: errorDetails.slice(0, 10)
        });
      }
    } catch (metaErr) {
      console.error('Error migrating metadata/updating profiles:', metaErr);
    }

    return res.status(200).json({
      message: `Migration abgeschlossen: ${migrated} aus CSV, ${migrated_from_metadata} aus Account-Daten übertragen, ${skipped_no_account} ohne Account übersprungen, ${skipped_duplicate} Duplikate übersprungen, ${errors} Fehler, ${profiles_updated} Profile aktualisiert`,
      migrated,
      migrated_from_metadata,
      skipped_no_account,
      skipped_duplicate,
      errors,
      profiles_updated,
      profiles_synced: 0,
      total_csv_rows: dataRows.length,
      errorDetails: errorDetails.slice(0, 10)
    });

  } catch (err: any) {
    console.error('migrate-to-sql error:', err);
    return res.status(500).json({ error: err.message || 'Unbekannter Fehler' });
  }
}

async function handleAdminSetRole(req: VercelRequest, res: VercelResponse) {
  try {
    const body = getRequestBody(req);
    const { targetUserId, role } = body;
    if (!targetUserId) return res.status(400).json({ error: 'targetUserId fehlt' });
    if (!isSupabaseConfigured()) return res.status(500).json({ error: 'Supabase nicht konfiguriert' });

    const { data: { user }, error: getErr } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
    if (getErr || !user) throw getErr || new Error('User nicht gefunden');

    const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      user_metadata: { ...user.user_metadata, role }
    });
    if (error) throw error;
    return res.status(200).json({ message: 'Rolle gesetzt' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// ── Tournament Helpers & Handlers ─────────────────

function getSafeTournamentName(name: string): string {
  let clean = (name || "").trim();
  if (clean.startsWith("tournament_")) {
    clean = clean.replace(/^tournament_/, "");
  }
  if (clean.endsWith(".csv")) {
    clean = clean.replace(/\.csv$/, "");
  }
  const safeName = clean
    .replace(/[^a-zA-Z0-9äöüÄÖÜß\-_]/g, '_')
    .substring(0, 50);
  return safeName || 'unnamed';
}

function getSafeFilename(tournamentName: string): string {
  const safeName = getSafeTournamentName(tournamentName);
  return `tournament_${safeName}.csv`;
}

async function loadTournamentCsv(
  tournamentName: string,
  token?: string
): Promise<{ filename: string; content: string } | null> {
  return null;
}

async function saveTournamentCsv(
  tournamentName: string,
  csvContent: string,
  token?: string
): Promise<boolean> {
  return true;
}

const TOURNAMENT_TABLE_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EF4444',
  '#06B6D4',
  '#EC4899',
  '#84CC16',
  '#F97316',
  '#6366F1',
];

function parseTournamentMeta(filename: string, content: string) {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const cleanName = filename.replace(/^tournament_/, "").replace(/\.csv$/, "");

  let config = {
    name: cleanName,
    tablesCount: 1,
    finalistsCount: 4,
    hasSecondChance: false,
    status: "In Vorbereitung",
    createdDate: new Date().toLocaleDateString("de-DE")
  };

  for (const line of lines) {
    const parts = line.split(";");
    if (parts[0] === "CONFIG") {
      config = {
        name: parts[1] || cleanName,
        tablesCount: parseInt(parts[2]) || 1,
        finalistsCount: parseInt(parts[3]) || 4,
        hasSecondChance: parts[4] === "true",
        status: parts[5] || "In Vorbereitung",
        createdDate: parts[6] || new Date().toLocaleDateString("de-DE")
      };
      break;
    }
  }

  return {
    filename,
    name: config.name,
    tablesCount: config.tablesCount,
    finalistsCount: config.finalistsCount,
    hasSecondChance: config.hasSecondChance,
    status: config.status,
    createdDate: config.createdDate
  };
}

function parseTournamentCSV(filename: string, content: string) {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const cleanName = filename.replace(/^tournament_/, "").replace(/\.csv$/, "");
  let config = {
    name: cleanName,
    tablesCount: 1,
    finalistsCount: 4,
    hasSecondChance: false,
    status: "In Vorbereitung",
    createdDate: new Date().toLocaleDateString("de-DE"),
    qualifikationVorrunde: 1,
    qualifikationSecondChance: 1
  };

  const tables: Array<{
    id: string;
    name: string;
    status: "Offen" | "Laufend" | "Abgeschlossen" | "Gesperrt";
    winner?: string;
    secondPlace?: string;
    players?: string[];
    color?: string;
  }> = [];

  const results: Array<{
    tableId: string;
    playerName: string;
    rank: number;
    avg: number;
    schnaepse: number;
    date: string;
  }> = [];

  const outPlayers: Array<{
    tableId: string;
    playerName: string;
  }> = [];

  let vorrundeCount = 0;

  for (const line of lines) {
    const parts = line.split(";");
    const rowType = parts[0];

    if (rowType === "CONFIG") {
      config = {
        ...config,
        name: parts[1] || cleanName,
        tablesCount: parseInt(parts[2]) || 1,
        finalistsCount: parseInt(parts[3]) || 4,
        hasSecondChance: parts[4] === "true",
        status: parts[5] || "In Vorbereitung",
        createdDate: parts[6] || new Date().toLocaleDateString("de-DE")
      };
    } else if (rowType === "QualifikationVorrunde" || rowType === "QUALIFIKATION_VORRUNDE") {
      config.qualifikationVorrunde = parseInt(parts[1]) || 1;
    } else if (rowType === "QualifikationSecondChance" || rowType === "QUALIFIKATION_SECOND_CHANCE") {
      config.qualifikationSecondChance = parseInt(parts[1]) || 1;
    } else if (rowType === "TABLE" || rowType === "Tisch") {
      const rawTableId = parts[1];
      const tableId = rawTableId === "SecondChance" ? "table_second_chance" : rawTableId === "Final" ? "table_final" : rawTableId;
      let defaultColor = TOURNAMENT_TABLE_COLORS[0];
      if (tableId === "table_second_chance") {
        defaultColor = "#F59E0B";
      } else if (tableId === "table_final") {
        defaultColor = "#D4AF37";
      } else if (tableId.startsWith("table_")) {
        const num = parseInt(tableId.replace("table_", ""));
        if (!isNaN(num) && num > 0) {
          defaultColor = TOURNAMENT_TABLE_COLORS[(num - 1) % TOURNAMENT_TABLE_COLORS.length];
        } else {
          defaultColor = TOURNAMENT_TABLE_COLORS[vorrundeCount % TOURNAMENT_TABLE_COLORS.length];
          vorrundeCount++;
        }
      }

      const tableColor = parts[7] || (rowType === "Tisch" ? parts[2] : defaultColor);
      const rawStatus = rowType === "Tisch" ? parts[3] : parts[3];
      const statusVal = rawStatus === "gespielt" ? "Abgeschlossen" : (rawStatus as any) || "Offen";

      tables.push({
        id: tableId,
        name: parts[2] || (tableId === "table_second_chance" ? "Second Chance Tisch" : tableId === "table_final" ? "Finaltisch" : `Tisch ${tableId}`),
        status: statusVal,
        winner: parts[4] || "",
        secondPlace: parts[5] || "",
        players: parts[6] ? JSON.parse(decodeURIComponent(parts[6])) : [],
        color: tableColor
      });
    } else if (rowType === "RESULT" || rowType === "Ergebnis") {
      if (rowType === "RESULT") {
        results.push({
          tableId: parts[1],
          playerName: parts[2],
          rank: parseInt(parts[3]) || 1,
          avg: parseFloat(parts[4]) || 0,
          schnaepse: parseInt(parts[5]) || 0,
          date: parts[6] || ""
        });
      } else {
        const rawT = parts[1] || "";
        const normTableId = rawT === "SecondChance" ? "table_second_chance" : rawT === "Final" ? "table_final" : rawT.startsWith("table_") ? rawT : `table_${rawT}`;
        results.push({
          tableId: normTableId,
          playerName: parts[3] || "",
          rank: parseInt(parts[7]) || 1,
          avg: parseFloat(parts[4]) || 0,
          schnaepse: parseInt(parts[5]) || 0,
          date: parts[2] || ""
        });
      }
    } else if (rowType === "Ausgeschieden") {
      const rawT = parts[1] || "";
      const normTableId = rawT === "SecondChance" ? "table_second_chance" : rawT === "Final" ? "table_final" : rawT.startsWith("table_") ? rawT : `table_${rawT}`;
      outPlayers.push({
        tableId: normTableId,
        playerName: parts[2] || ""
      });
    }
  }

  config.finalistsCount = config.tablesCount * config.qualifikationVorrunde + (config.hasSecondChance ? config.qualifikationSecondChance : 0);

  if (tables.length === 0) {
    for (let i = 1; i <= config.tablesCount; i++) {
      tables.push({
        id: `table_${i}`,
        name: `Tisch ${i}`,
        status: "Offen",
        players: [],
        color: TOURNAMENT_TABLE_COLORS[(i - 1) % TOURNAMENT_TABLE_COLORS.length]
      });
    }
    if (config.hasSecondChance) {
      tables.push({
        id: "table_second_chance",
        name: "Second Chance Tisch",
        status: "Gesperrt",
        players: [],
        color: "#F59E0B"
      });
    }
    tables.push({
      id: "table_final",
      name: "Finaltisch",
      status: "Gesperrt",
      players: [],
      color: "#D4AF37"
    });
  }

  return { config, tables, results, outPlayers };
}

async function handleTournamentList(req: VercelRequest, res: VercelResponse) {
  const query = getRequestQuery(req);

  if (query.healthcheck === 'true') {
    return res.status(200).json({
      supabase: isSupabaseConfigured() ? 'vorhanden' : 'fehlt',
      status: 'ok'
    });
  }

  try {
    await ensureCoreSchema();

    if (!isSupabaseConfigured()) {
      return res.status(200).json({ tournaments: [] });
    }

    const { data: rows, error } = await supabaseAdmin
      .from('tournaments')
      .select('id, name, status, config, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('tournaments select error:', error);
      return res.status(500).json({ error: error.message, tournaments: [] });
    }

    const tournaments = (rows || []).map((row: any) => {
      const fullConfig = row.config || {};
      const cfg = fullConfig.config || fullConfig;
      return {
        filename: `tournament_${row.name}.csv`,
        name: row.name,
        tablesCount: Number(cfg.tablesCount) || 1,
        finalistsCount: Number(cfg.finalistsCount) || 4,
        hasSecondChance: Boolean(cfg.hasSecondChance),
        status: row.status || cfg.status || 'In Vorbereitung',
        createdDate: cfg.createdDate || (row.created_at ? new Date(row.created_at).toLocaleDateString('de-DE') : new Date().toLocaleDateString('de-DE'))
      };
    });

    return res.status(200).json({ tournaments });
  } catch (error: any) {
    console.error("Error in tournament list handler:", error);
    return res.status(500).json({ error: error.message || "Fehler beim Laden der Turnierliste.", tournaments: [] });
  }
}

async function handleTournamentGet(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureCoreSchema();

    const query = getRequestQuery(req);
    let { name, filename } = query;
    if (!name && !filename) {
      return res.status(400).json({ error: "Missing parameter 'name' or 'filename'." });
    }

    const targetName = String(name || filename).replace(/^tournament_/, '').replace(/\.csv$/, '').trim();

    if (!isSupabaseConfigured()) {
      return res.status(404).json({ error: 'Supabase ist nicht konfiguriert.' });
    }

    const { data: rows, error } = await supabaseAdmin
      .from('tournaments')
      .select('id, name, status, config, created_at, updated_at')
      .ilike('name', targetName)
      .limit(1);

    if (error) {
      console.error('tournament get error:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: `Turnier '${targetName}' nicht gefunden.` });
    }

    const row = rows[0];
    const fullConfig = row.config || {};
    const config = fullConfig.config || {
      name: row.name,
      tablesCount: 1,
      finalistsCount: 4,
      hasSecondChance: false,
      status: row.status || 'In Vorbereitung',
      createdDate: row.created_at ? new Date(row.created_at).toLocaleDateString('de-DE') : new Date().toLocaleDateString('de-DE'),
      qualifikationVorrunde: 1,
      qualifikationSecondChance: 1
    };

    const tables = fullConfig.tables || [];
    const results = fullConfig.results || [];
    const outPlayers = fullConfig.outPlayers || [];

    return res.status(200).json({
      config,
      tables,
      results,
      outPlayers
    });
  } catch (error: any) {
    console.error("Error in tournament get handler:", error);
    return res.status(500).json({ error: error.message || "Fehler beim Laden des Turniers." });
  }
}

async function syncTournamentTableToSupabaseGameResults(params: {
  tournamentName: string;
  tournamentTable: string;
  gameMode: string;
  date: string;
  results: Array<{ name?: string; playerName?: string; rank?: number; avg?: number | string; schnaepse?: number | string }>;
}) {
  if (!isSupabaseConfigured()) return { syncedCount: 0 };
  const { tournamentName, tournamentTable, gameMode, date: resultDate, results } = params;
  let syncedCount = 0;

  try {
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, username, games_played, total_points, high_score, xp, level');

    const profileMap = new Map<string, any>();
    (profiles || []).forEach((p: any) => {
      if (p.username) profileMap.set(p.username.toLowerCase().trim(), p);
    });

    for (const r of results) {
      const playerName = (r.name || r.playerName || '').trim();
      if (!playerName) continue;

      const matchedProfile = profileMap.get(playerName.toLowerCase());
      const isGuest = !matchedProfile;
      const userId = matchedProfile ? matchedProfile.id : null;

      const rankVal = parseInt(String(r.rank), 10) || 99;
      const avgVal = parseFloat(String(r.avg).replace(',', '.')) || 0;
      const schnaepseVal = parseInt(String(r.schnaepse), 10) || 0;
      const totalVal = Math.round((avgVal + schnaepseVal) * 100) / 100;

      // Duplicate check
      let query = supabaseAdmin
        .from('game_results')
        .select('id')
        .eq('date', resultDate)
        .eq('game_mode', gameMode);

      if (isGuest) {
        query = query.eq('player_name', playerName).eq('is_guest', true);
      } else {
        query = query.eq('user_id', userId);
      }

      const { data: existing } = await query.limit(1);
      if (existing && existing.length > 0) continue;

      await supabaseAdmin
        .from('game_results')
        .insert({
          user_id: userId,
          is_guest: isGuest,
          player_name: playerName,
          game_mode: gameMode,
          date: resultDate,
          avg: avgVal,
          schnaepse: schnaepseVal,
          total: totalVal,
          tournament_name: tournamentName,
          tournament_table: tournamentTable,
          created_at: new Date().toISOString()
        });

      if (!isGuest && matchedProfile) {
        let earnedXp = 1;
        if (rankVal === 1) earnedXp += 5;
        else if (rankVal === 2) earnedXp += 3;
        else if (rankVal === 3) earnedXp += 1;

        if (avgVal < 2.0) earnedXp += 2;
        else if (avgVal < 4.0) earnedXp += 1;

        const currentXp = Number(matchedProfile.xp) || 0;
        const newXp = currentXp + earnedXp;
        const newLevel = getLevelFromXP(newXp);
        const newGamesPlayed = (Number(matchedProfile.games_played) || 0) + 1;
        const newTotalPoints = (Number(matchedProfile.total_points) || 0) + schnaepseVal;
        const currentHigh = (matchedProfile.high_score !== null && matchedProfile.high_score !== undefined)
          ? Number(matchedProfile.high_score)
          : 999;
        const newHighScore = (currentHigh === 0 || avgVal < currentHigh) ? avgVal : currentHigh;

        await supabaseAdmin
          .from('profiles')
          .update({
            xp: newXp,
            level: newLevel,
            games_played: newGamesPlayed,
            total_points: newTotalPoints,
            high_score: newHighScore,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        matchedProfile.xp = newXp;
        matchedProfile.level = newLevel;
        matchedProfile.games_played = newGamesPlayed;
        matchedProfile.total_points = newTotalPoints;
        matchedProfile.high_score = newHighScore;
      }

      syncedCount++;
    }
  } catch (err: any) {
    console.warn('syncTournamentTableToSupabaseGameResults warning:', err.message);
  }

  return { syncedCount };
}

async function awardTournamentAchievementsInSupabase(params: {
  tournamentName: string;
  config: any;
  tables: any[];
  results: any[];
  date: string;
}) {
  const { tournamentName, config, tables, results, date } = params;
  const earnedTourneyAchs = checkTournamentAchievements({ config, tables, results });

  if (earnedTourneyAchs.length === 0) return;

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, username');

  const profileMap = new Map<string, any>();
  (profiles || []).forEach((p: any) => {
    if (p.username) profileMap.set(p.username.toLowerCase().trim(), p);
  });

  for (const ach of earnedTourneyAchs) {
    const def = MASTER_ACHIEVEMENTS_DEFINITIONS.find(d => d.id === ach.id);
    const title = def ? def.title : ach.id;
    const desc = def ? def.description : '';
    const icon = def ? def.icon : '🏆';
    const rarity = def ? def.rarity : 'epic';

    for (const playerName of ach.earnedBy) {
      const trimmedPlayer = playerName.trim();
      if (!trimmedPlayer) continue;

      const matchedProfile = profileMap.get(trimmedPlayer.toLowerCase());
      const isGuest = !matchedProfile;
      const userId = matchedProfile ? matchedProfile.id : null;

      let dupeQuery = supabaseAdmin
        .from('achievements')
        .select('id')
        .eq('achievement_id', ach.id)
        .eq('date', date);

      if (isGuest) {
        dupeQuery = dupeQuery.eq('player_name', trimmedPlayer).eq('is_guest', true);
      } else {
        dupeQuery = dupeQuery.eq('user_id', userId);
      }

      const { data: existing } = await dupeQuery.limit(1);
      if (existing && existing.length > 0) continue;

      await supabaseAdmin
        .from('achievements')
        .insert({
          user_id: userId,
          is_guest: isGuest,
          player_name: isGuest ? trimmedPlayer : null,
          achievement_id: ach.id,
          title,
          description: desc,
          icon,
          rarity,
          game_mode: `Turnier (${tournamentName})`,
          earned_with: [trimmedPlayer],
          earned_together: false,
          date
        });
    }
  }
}

async function handleTournamentSave(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureCoreSchema();

    if (!isSupabaseConfigured()) {
      return res.status(500).json({ error: "Supabase ist nicht konfiguriert." });
    }

    const body = getRequestBody(req);
    const { action, name, tablesCount, finalistsCount, hasSecondChance, tableId, results, date } = body;

    if (!name) {
      return res.status(400).json({ error: "Missing required parameter 'name'." });
    }

    const trimmedName = name.trim();

    // Fetch existing tournament
    const { data: existingRows } = await supabaseAdmin
      .from('tournaments')
      .select('*')
      .ilike('name', trimmedName)
      .limit(1);

    const existingTournament = existingRows && existingRows.length > 0 ? existingRows[0] : null;

    let tournamentConfig: any = null;
    let currentStatus = 'In Vorbereitung';

    if (action === "create" || !existingTournament) {
      const tCount = parseInt(tablesCount) || 1;
      const qVorrunde = parseInt(body.qualifikationVorrunde) || 1;
      const qSecondChance = parseInt(body.qualifikationSecondChance) || 1;
      const secondChance = Boolean(hasSecondChance);
      const fCount = tCount * qVorrunde + (secondChance ? qSecondChance : 0);
      const today = date || new Date().toLocaleDateString("de-DE");

      const tables: any[] = [];
      for (let i = 1; i <= tCount; i++) {
        const color = TOURNAMENT_TABLE_COLORS[(i - 1) % TOURNAMENT_TABLE_COLORS.length];
        tables.push({
          id: `table_${i}`,
          name: `Tisch ${i}`,
          status: 'Offen',
          players: [],
          color
        });
      }

      if (secondChance) {
        tables.push({
          id: 'table_second_chance',
          name: 'Second Chance Tisch',
          status: 'Gesperrt',
          players: [],
          color: '#F59E0B'
        });
      }

      tables.push({
        id: 'table_final',
        name: 'Finaltisch',
        status: 'Gesperrt',
        players: [],
        color: '#D4AF37'
      });

      tournamentConfig = {
        config: {
          name: trimmedName,
          tablesCount: tCount,
          finalistsCount: fCount,
          hasSecondChance: secondChance,
          status: 'In Vorbereitung',
          createdDate: today,
          qualifikationVorrunde: qVorrunde,
          qualifikationSecondChance: qSecondChance
        },
        tables,
        results: [],
        outPlayers: []
      };
      currentStatus = 'In Vorbereitung';

      const { error: upsertErr } = await supabaseAdmin
        .from('tournaments')
        .upsert({
          name: trimmedName,
          status: currentStatus,
          config: tournamentConfig,
          updated_at: new Date().toISOString()
        }, { onConflict: 'name' });

      if (upsertErr) {
        console.error('upsert tournament error:', upsertErr);
        return res.status(500).json({ error: upsertErr.message });
      }

      return res.status(200).json({
        success: true,
        message: `Turnier '${trimmedName}' erfolgreich erstellt.`
      });
    }

    // Update existing tournament
    const fullData = existingTournament.config || {};
    const config = fullData.config || {
      name: trimmedName,
      tablesCount: 1,
      finalistsCount: 4,
      hasSecondChance: false,
      status: existingTournament.status || 'In Vorbereitung',
      createdDate: new Date().toLocaleDateString('de-DE'),
      qualifikationVorrunde: 1,
      qualifikationSecondChance: 1
    };
    const tables: any[] = fullData.tables || [];
    let existingResults: any[] = fullData.results || [];
    let existingOutPlayers: any[] = fullData.outPlayers || [];

    if (action === "updateParticipantsAndTables" && Array.isArray(body.tables)) {
      body.tables.forEach((updatedT: any) => {
        const targetTable = tables.find(t => t.id === updatedT.id);
        if (targetTable) {
          if (updatedT.name) targetTable.name = updatedT.name;
          if (Array.isArray(updatedT.players)) targetTable.players = updatedT.players;
          if (updatedT.color) targetTable.color = updatedT.color;
        }
      });
      currentStatus = config.status || existingTournament.status || 'In Vorbereitung';
    } else if (action === "saveTableResult" && tableId && Array.isArray(results)) {
      const resultDate = date || new Date().toLocaleDateString("de-DE");
      const targetTable = tables.find(t => t.id === tableId || (tableId === "SecondChance" && t.id === "table_second_chance") || (tableId === "Final" && t.id === "table_final"));

      if (targetTable) {
        targetTable.status = "Abgeschlossen";
        const sorted = [...results].sort((a, b) => (Number(a.rank) || 0) - (Number(b.rank) || 0));
        if (sorted.length > 0) targetTable.winner = sorted[0].name;
        if (sorted.length > 1) targetTable.secondPlace = sorted[1].name;
        targetTable.players = sorted.map(r => r.name);

        existingResults = existingResults.filter(r => r.tableId !== targetTable.id);
        sorted.forEach(r => {
          existingResults.push({
            tableId: targetTable.id,
            playerName: r.name,
            rank: Number(r.rank) || 1,
            avg: parseFloat(String(r.avg).replace(',', '.')) || 0,
            schnaepse: parseInt(String(r.schnaepse), 10) || 0,
            date: resultDate
          });
        });

        let updatedOutPlayers = existingOutPlayers.filter(op => op.tableId !== targetTable.id);
        if (Array.isArray(body.outPlayers) && body.outPlayers.length > 0) {
          body.outPlayers.forEach((pName: string) => {
            updatedOutPlayers.push({
              tableId: targetTable.id,
              playerName: pName
            });
          });
        }
        existingOutPlayers = updatedOutPlayers;

        const vorrundeTables = tables.filter(t => t.id.startsWith("table_") && t.id !== "table_second_chance" && t.id !== "table_final");
        const allVorrundeDone = vorrundeTables.every(t => t.status === "Abgeschlossen");

        const secondChanceTable = tables.find(t => t.id === "table_second_chance");
        const finalTable = tables.find(t => t.id === "table_final");

        const qVorrunde = config.qualifikationVorrunde || 1;
        const qSecondChance = config.qualifikationSecondChance || 1;

        if (allVorrundeDone) {
          config.status = "Vorrunde beendet";

          const directQualifiers: string[] = [];
          const nonQualifiers: string[] = [];

          vorrundeTables.forEach(vt => {
            const vtResults = existingResults.filter(r => r.tableId === vt.id).sort((a, b) => a.rank - b.rank);
            vtResults.forEach(r => {
              if (r.rank <= qVorrunde) {
                directQualifiers.push(r.playerName);
              } else {
                nonQualifiers.push(r.playerName);
              }
            });
          });

          if (secondChanceTable) {
            secondChanceTable.players = nonQualifiers;
            if (secondChanceTable.status === "Gesperrt") {
              secondChanceTable.status = "Offen";
              config.status = "Second Chance";
            }
          }

          const scDone = !secondChanceTable || secondChanceTable.status === "Abgeschlossen";

          if (scDone && finalTable) {
            if (finalTable.status === "Gesperrt") {
              finalTable.status = "Offen";
              config.status = "Finale";
            }

            const finalists = [...directQualifiers];
            if (secondChanceTable && secondChanceTable.status === "Abgeschlossen") {
              const scResults = existingResults.filter(r => r.tableId === secondChanceTable.id).sort((a, b) => a.rank - b.rank);
              scResults.forEach(r => {
                if (r.rank <= qSecondChance) {
                  finalists.push(r.playerName);
                }
              });
            }
            finalTable.players = finalists;
          }
        } else {
          config.status = "Vorrunde läuft";
        }

        const isFinalDone = targetTable.id === "table_final" && targetTable.status === "Abgeschlossen";
        if (isFinalDone) {
          config.status = "Beendet";
        }

        currentStatus = config.status;

        // Sync table results to public.game_results
        const gameMode = (targetTable.id === 'table_final')
          ? `Turnier Finale (${trimmedName})`
          : (targetTable.id === 'table_second_chance')
            ? `Turnier Second Chance (${trimmedName})`
            : `Turnier Vorrunde Tisch ${targetTable.id} (${trimmedName})`;

        await syncTournamentTableToSupabaseGameResults({
          tournamentName: trimmedName,
          tournamentTable: targetTable.name || targetTable.id,
          gameMode,
          date: resultDate,
          results: sorted
        });

        // If Final table completed: Award tournament achievements into public.achievements!
        if (isFinalDone) {
          try {
            await awardTournamentAchievementsInSupabase({
              tournamentName: trimmedName,
              config,
              tables,
              results: existingResults,
              date: resultDate
            });
          } catch (achErr: any) {
            console.error('Error awarding tournament achievements:', achErr);
          }
        }
      }
    }

    tournamentConfig = {
      config,
      tables,
      results: existingResults,
      outPlayers: existingOutPlayers
    };

    const { error: updateErr } = await supabaseAdmin
      .from('tournaments')
      .update({
        status: currentStatus,
        config: tournamentConfig,
        updated_at: new Date().toISOString()
      })
      .ilike('name', trimmedName);

    if (updateErr) {
      console.error('update tournament error:', updateErr);
      return res.status(500).json({ error: updateErr.message });
    }

    return res.status(200).json({
      success: true,
      message: `Turnier '${trimmedName}' erfolgreich aktualisiert.`
    });
  } catch (error: any) {
    console.error("Error in tournament save handler:", error);
    return res.status(500).json({ error: error.message || "Fehler beim Speichern des Turniers." });
  }
}

async function handleTournamentDelete(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureCoreSchema();

    if (!isSupabaseConfigured()) {
      return res.status(500).json({ error: "Supabase ist nicht konfiguriert." });
    }

    const body = getRequestBody(req);
    const { name, tournamentName } = body;
    const targetName = (name || tournamentName || '').trim();

    if (!targetName) {
      return res.status(400).json({ error: "Missing required parameter 'name' or 'tournamentName'." });
    }

    const { error } = await supabaseAdmin
      .from('tournaments')
      .delete()
      .ilike('name', targetName);

    if (error) {
      console.error('tournaments delete error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      message: `Turnier '${targetName}' erfolgreich gelöscht.`
    });
  } catch (error: any) {
    console.error("Error in tournament delete handler:", error);
    return res.status(500).json({ error: error.message || "Fehler beim Löschen des Turniers." });
  }
}

async function handleTournamentMigrateToCSV(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureCoreSchema();
    if (!isSupabaseConfigured()) {
      return res.status(500).json({ error: 'Supabase ist nicht konfiguriert.' });
    }

    const body = getRequestBody(req);
    const { tournamentName } = body || {};
    if (!tournamentName) return res.status(400).json({ error: 'tournamentName erforderlich' });

    let migrated = 0;
    let skipped = 0;

    // 1. Zuerst in public.tournaments suchen
    const { data: tourneyRows } = await supabaseAdmin
      .from('tournaments')
      .select('*')
      .ilike('name', tournamentName.trim())
      .limit(1);

    if (tourneyRows && tourneyRows.length > 0) {
      const tourney = tourneyRows[0];
      const fullConfig = tourney.config || {};
      const results = fullConfig.results || [];
      const tables = fullConfig.tables || [];

      for (const table of tables) {
        const tableResults = results.filter((r: any) => r.tableId === table.id);
        if (tableResults.length > 0) {
          const gameMode = (table.id === 'table_final')
            ? `Turnier Finale (${tourney.name})`
            : (table.id === 'table_second_chance')
              ? `Turnier Second Chance (${tourney.name})`
              : `Turnier Vorrunde Tisch ${table.id} (${tourney.name})`;

          const syncRes = await syncTournamentTableToSupabaseGameResults({
            tournamentName: tourney.name,
            tournamentTable: table.name || table.id,
            gameMode,
            date: tableResults[0]?.date || new Date().toLocaleDateString('de-DE'),
            results: tableResults
          });
          migrated += syncRes.syncedCount;
        }
      }

      if (fullConfig.config?.status === 'Beendet' || tables.find((t: any) => t.id === 'table_final')?.status === 'Abgeschlossen') {
        await awardTournamentAchievementsInSupabase({
          tournamentName: tourney.name,
          config: fullConfig.config || {},
          tables,
          results,
          date: results[0]?.date || new Date().toLocaleDateString('de-DE')
        });
      }

      return res.status(200).json({
        success: true,
        message: `${migrated} Ergebnisse aus Turnier '${tournamentName}' in Supabase game_results übertragen.`,
        migrated,
        skipped,
        supabaseSynced: migrated
      });
    }

    // 2. Fallback: Falls noch in Legacy Blob gespeichert
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token) {
      try {
        const { list } = await import('@vercel/blob');
        const safeName = tournamentName.replace(/[^a-zA-Z0-9äöüÄÖÜß\-_]/g, '_');
        const { blobs } = await list({ prefix: `tournament_${safeName}`, token });
        const blob = blobs.find(b => b.pathname.includes(safeName));
        if (blob) {
          const tournamentRes = await fetch(blob.url);
          const tournamentCsv = await tournamentRes.text();
          const tournamentRows = tournamentCsv.trim().split('\n');
          const ergebnisRows = tournamentRows.filter(r => r.startsWith('RESULT;') || r.startsWith('Ergebnis;'));

          const resultsList: any[] = [];
          for (const row of ergebnisRows) {
            const parts = row.split(';');
            if (parts.length < 6) continue;
            let tischId = parts[1];
            let spielername = row.startsWith('RESULT;') ? parts[2] : parts[3];
            let rawRank = row.startsWith('RESULT;') ? parts[3] : parts[7] || parts[6] || '99';
            let rawAvg = row.startsWith('RESULT;') ? parts[4] : parts[4];
            let rawSchnaepse = row.startsWith('RESULT;') ? parts[5] : parts[5];
            let datum = row.startsWith('RESULT;') ? parts[6] : parts[2] || new Date().toLocaleDateString('de-DE');

            if (!spielername?.trim()) continue;
            resultsList.push({
              tableId: tischId,
              playerName: spielername.trim(),
              name: spielername.trim(),
              rank: parseInt(rawRank, 10) || 99,
              avg: rawAvg,
              schnaepse: rawSchnaepse,
              date: datum
            });
          }

          const syncRes = await syncTournamentTableToSupabaseGameResults({
            tournamentName,
            tournamentTable: 'Archiv',
            gameMode: `Turnier (${tournamentName})`,
            date: resultsList[0]?.date || new Date().toLocaleDateString('de-DE'),
            results: resultsList
          });
          migrated = syncRes.syncedCount;

          return res.status(200).json({
            success: true,
            message: `${migrated} Ergebnisse aus Blob in Supabase game_results übertragen.`,
            migrated,
            skipped,
            supabaseSynced: migrated
          });
        }
      } catch (blobErr: any) {
        console.warn('Fallback blob read error:', blobErr?.message);
      }
    }

    return res.status(404).json({ error: `Turnier "${tournamentName}" nicht gefunden.` });
  } catch (err: any) {
    console.error('tournament migrate error:', err);
    return res.status(500).json({ error: err.message });
  }
}

async function handleMigrateToStaging(req: VercelRequest, res: VercelResponse) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN fehlt' });

    const body = getRequestBody(req);
    const { clearExisting } = body || {};

    // 1. Staging-Tabellen in Supabase (SQL) automatisiert anlegen (falls nicht vorhanden)
    const createTablesSQL = `
CREATE TABLE IF NOT EXISTS public.staging_results_csv (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  raw_line TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staging_tournaments (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  tournament_name TEXT NOT NULL,
  raw_line TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

ALTER TABLE public.staging_results_csv ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staging_tournaments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'staging_results_csv' AND policyname = 'Allow service role all staging_results_csv'
  ) THEN
    CREATE POLICY "Allow service role all staging_results_csv" ON public.staging_results_csv FOR ALL TO service_role USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'staging_tournaments' AND policyname = 'Allow service role all staging_tournaments'
  ) THEN
    CREATE POLICY "Allow service role all staging_tournaments" ON public.staging_tournaments FOR ALL TO service_role USING (true);
  END IF;
END
$$;
`;

    // A) Falls exec_sql RPC verfügbar ist, aufrufen:
    try {
      await supabaseAdmin.rpc('exec_sql', { sql: createTablesSQL });
    } catch {
      // ignore
    }

    // B) Falls DB-URL konfiguriert ist, direkt ausführen:
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
    if (dbUrl) {
      try {
        const { Client } = await import('pg');
        const pgClient = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
        await pgClient.connect();
        await pgClient.query(createTablesSQL);
        await pgClient.end();
      } catch (pgErr) {
        console.warn('Direct PG execution failed:', pgErr);
      }
    }

    // C) Prüfen, ob beide Staging-Tabellen in Supabase existieren
    const checkResults = await supabaseAdmin.from('staging_results_csv').select('id').limit(1);
    const checkTournaments = await supabaseAdmin.from('staging_tournaments').select('id').limit(1);

    const resultsTableMissing = checkResults.error && checkResults.error.code === 'PGRST205';
    const tournamentsTableMissing = checkTournaments.error && checkTournaments.error.code === 'PGRST205';

    if (resultsTableMissing || tournamentsTableMissing) {
      return res.status(200).json({
        success: false,
        tablesMissing: true,
        missingTables: [
          ...(resultsTableMissing ? ['staging_results_csv'] : []),
          ...(tournamentsTableMissing ? ['staging_tournaments'] : [])
        ],
        sql: createTablesSQL.trim(),
        message: 'Die Staging-Tabellen existieren noch nicht in Supabase. Bitte führe das SQL-Skript im Supabase SQL Editor aus.'
      });
    }

    // Falls clearExisting aktiviert ist: Vorherige Staging-Daten leeren
    if (clearExisting) {
      try {
        await supabaseAdmin.from('staging_results_csv').delete().neq('id', 0);
        await supabaseAdmin.from('staging_tournaments').delete().neq('id', 0);
      } catch (clearErr) {
        console.warn('Staging tables clearing error:', clearErr);
      }
    }

    // 2. Einlesen & Übertragen aus Vercel Blob
    const { list } = await import('@vercel/blob');

    // 2.1 results.csv einlesen
    let resultsCsvRowsInserted = 0;
    const { blobs: resultsBlobs } = await list({ prefix: 'results', token });
    const resultsBlob = resultsBlobs.find(b => b.pathname === 'results.csv' || b.pathname.endsWith('/results.csv'));

    if (resultsBlob) {
      const csvResponse = await fetch(resultsBlob.url);
      const csvText = await csvResponse.text();
      const rawLines = csvText.split(/\r?\n/);

      // Datenzeilen filtern (Header überspringen, falls vorhanden)
      const dataLines = rawLines.filter(l => {
        const trimmed = l.trim();
        if (!trimmed) return false;
        if (trimmed.toLowerCase().startsWith('datum;') || trimmed.toLowerCase().startsWith('datum ')) return false;
        return true;
      });

      if (dataLines.length > 0) {
        const rowsToInsert = dataLines.map(line => ({
          raw_line: line.trim(),
          created_at: new Date().toISOString()
        }));

        const batchSize = 100;
        for (let i = 0; i < rowsToInsert.length; i += batchSize) {
          const chunk = rowsToInsert.slice(i, i + batchSize);
          const { error: insertErr } = await supabaseAdmin
            .from('staging_results_csv')
            .insert(chunk);
          if (insertErr) {
            console.error('staging_results_csv insert error:', insertErr);
            throw new Error(`Fehler beim Einfügen in staging_results_csv: ${insertErr.message}`);
          }
          resultsCsvRowsInserted += chunk.length;
        }
      }
    }

    // 2.2 Alle Turnier-Blobs (prefix: 'tournament_') einlesen
    let tournamentRowsInserted = 0;
    let tournamentsProcessedCount = 0;
    const { blobs: allBlobs } = await list({ prefix: 'tournament_', token });
    const tournamentBlobs = allBlobs.filter(b =>
      (b.pathname.startsWith('tournament_') || b.pathname.includes('/tournament_')) &&
      b.pathname.endsWith('.csv')
    );

    const tournamentRowsToInsert: Array<{ tournament_name: string; raw_line: string; created_at: string }> = [];

    for (const blob of tournamentBlobs) {
      try {
        const tourneyRes = await fetch(blob.url);
        if (!tourneyRes.ok) continue;
        const text = await tourneyRes.text();
        const lines = text.split(/\r?\n/);

        // Turniernamen ermitteln
        let tournamentName = blob.pathname
          .replace(/^.*tournament_/, '')
          .replace(/\.csv$/, '');

        // Falls im Blob TOURNAMENT_NAME; vorhanden ist, bevorzugen
        for (const line of lines) {
          if (line.startsWith('TOURNAMENT_NAME;')) {
            const parts = line.split(';');
            if (parts[1]?.trim()) {
              tournamentName = parts[1].trim();
              break;
            }
          }
        }

        // Relevante Zeilen (RESULT; / Ergebnis;) filtern
        const relevantLines = lines.filter(l => {
          const trimmed = l.trim();
          return trimmed.startsWith('RESULT;') || trimmed.startsWith('Ergebnis;');
        });

        for (const row of relevantLines) {
          tournamentRowsToInsert.push({
            tournament_name: tournamentName,
            raw_line: row.trim(),
            created_at: new Date().toISOString()
          });
        }
        tournamentsProcessedCount++;
      } catch (tourneyErr) {
        console.error(`Fehler beim Lesen des Turniers ${blob.pathname}:`, tourneyErr);
      }
    }

    if (tournamentRowsToInsert.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < tournamentRowsToInsert.length; i += batchSize) {
        const chunk = tournamentRowsToInsert.slice(i, i + batchSize);
        const { error: insertErr } = await supabaseAdmin
          .from('staging_tournaments')
          .insert(chunk);
        if (insertErr) {
          console.error('staging_tournaments insert error:', insertErr);
          throw new Error(`Fehler beim Einfügen in staging_tournaments: ${insertErr.message}`);
        }
        tournamentRowsInserted += chunk.length;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Erfolgreich übertragen: ${resultsCsvRowsInserted} Zeilen in staging_results_csv, ${tournamentRowsInserted} Zeilen aus ${tournamentsProcessedCount} Turnieren in staging_tournaments.`,
      resultsCsvRows: resultsCsvRowsInserted,
      tournamentRows: tournamentRowsInserted,
      tournamentsProcessed: tournamentsProcessedCount,
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    console.error('handleMigrateToStaging error:', err);
    return res.status(500).json({ error: err.message || 'Fehler bei der Übertragung in Staging-Tabellen' });
  }
}

async function handleSaveCsv(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureCoreSchema();
    const body = getRequestBody(req);
    const { rows } = body || {};
    if (!rows || !Array.isArray(rows)) {
      return res.status(400).json({ error: 'rows erforderlich' });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token) {
      try {
        const { put } = await import('@vercel/blob');
        const header = 'Datum;Modus;Name;Avg;Schnaepse\n';
        const dataRows = rows
          .filter((row: string[]) => row.length >= 5 && row[0] !== 'Datum')
          .map((row: string[]) => row.slice(0, 6).join(';'))
          .join('\n');

        const updatedCsv = header + dataRows + '\n';
        await put('results.csv', updatedCsv, {
          access: 'public',
          token,
          addRandomSuffix: false,
          allowOverwrite: true
        });
      } catch (blobErr: any) {
        console.warn('handleSaveCsv blob backup warning:', blobErr?.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Ergebnisse in Supabase SQL Tabelle public.game_results verwaltet.'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

async function handleRepairDatabase(req: VercelRequest, res: VercelResponse) {
  const report: string[] = [];
  const fixes: string[] = [];
  const errors: string[] = [];
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  try {
    await ensureCoreSchema();
    // ══════════════════════════════════════════
    // SCHRITT 0: VOLLSTÄNDIGES BACKUP ERSTELLEN
    // ══════════════════════════════════════════
    report.push('💾 Erstelle Backup vor der Bereinigung...');

    // Alle Daten aus allen Tabellen laden
    const [
      { data: allProfiles },
      { data: allGameResults },
      { data: allAchievements },
      { data: allFriendships },
      { data: authUsersResult }
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*'),
      supabaseAdmin.from('game_results').select('*'),
      supabaseAdmin.from('achievements').select('*'),
      supabaseAdmin.from('friendships').select('*'),
      supabaseAdmin.auth.admin.listUsers()
    ]);

    const allAuthUsers = authUsersResult?.users || [];

    // Backup als JSON in Supabase und optional Blob speichern
    const backupData = {
      timestamp: new Date().toISOString(),
      profiles: allProfiles || [],
      game_results: allGameResults || [],
      achievements: allAchievements || [],
      friendships: allFriendships || [],
      auth_users_count: allAuthUsers.length
    };

    try {
      await supabaseAdmin.from('database_backups').insert({
        backup_type: 'repair_pre_backup',
        data: backupData
      });
      fixes.push('💾 Vollständiges Datenbank-Backup in public.database_backups gesichert');
    } catch (dbBackupErr: any) {
      console.warn('database_backups insert error:', dbBackupErr?.message);
    }

    if (token) {
      try {
        const { put } = await import('@vercel/blob');
        const backupFilename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        await put(`backups/${backupFilename}`, JSON.stringify(backupData, null, 2), {
          access: 'public',
          token,
          addRandomSuffix: false
        });
        fixes.push(`💾 Backup zusätzlich in Blob erstellt: backups/${backupFilename}`);
      } catch (bErr: any) {
        console.warn('Blob backup optional write warning:', bErr?.message);
      }
    }

    report.push(`📋 Backup enthält: ${allProfiles?.length || 0} Profile, ${allGameResults?.length || 0} Ergebnisse, ${allAchievements?.length || 0} Achievements, ${allFriendships?.length || 0} Freundschaften`);

    // Auth User Map erstellen
    const authUserMap: Record<string, any> = {};
    allAuthUsers.forEach((u: any) => { authUserMap[u.id] = u; });

    // Profile Map erstellen
    const profileMap: Record<string, any> = {};
    (allProfiles || []).forEach((p: any) => { profileMap[p.id] = p; });

    // ══════════════════════════════════════════
    // SCHRITT 1: PROFILES REPARIEREN
    // ══════════════════════════════════════════
    report.push('─── Profiles ───');

    // Fehlende Profile für Auth Users erstellen
    let createdProfiles = 0;
    for (const authUser of allAuthUsers) {
      if (!profileMap[authUser.id]) {
        const username = authUser.user_metadata?.username ||
          authUser.email?.split('@')[0] ||
          `user_${authUser.id.substring(0, 8)}`;

        const { error } = await supabaseAdmin.from('profiles').insert({
          id: authUser.id,
          username,
          email: authUser.email || '',
          role: authUser.user_metadata?.role || 'user',
          show_records: true,
          show_standardspiel: true,
          show_speedwiegen: true,
          show_teamwiegen: true,
          show_achievements: true
        });

        if (!error) {
          createdProfiles++;
          fixes.push(`➕ Profil erstellt für: ${username} (${authUser.email})`);
        } else {
          errors.push(`Profil erstellen fehlgeschlagen: ${authUser.email} → ${error.message}`);
        }
      }
    }
    if (createdProfiles === 0) report.push('✅ Alle Auth Users haben Profile');

    // Profile ohne Username reparieren
    let fixedUsernames = 0;
    for (const profile of allProfiles || []) {
      if (!profile.username?.trim()) {
        const authUser = authUserMap[profile.id];
        const newUsername = authUser?.user_metadata?.username ||
          authUser?.email?.split('@')[0] ||
          `user_${profile.id.substring(0, 8)}`;

        const { error } = await supabaseAdmin
          .from('profiles')
          .update({
            username: newUsername,
            email: authUser?.email || profile.email || ''
          })
          .eq('id', profile.id);

        if (!error) {
          fixedUsernames++;
          fixes.push(`✏️ Username ergänzt: ${newUsername}`);
        }
      }
    }
    if (fixedUsernames === 0) report.push('✅ Alle Profile haben Benutzernamen');

    // Profile ohne Auth User → NICHT löschen, sondern markieren
    let markedOrphanProfiles = 0;
    for (const profile of allProfiles || []) {
      if (!authUserMap[profile.id]) {
        // Statt löschen: username mit Präfix markieren damit man es sieht
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({
            username: `[ARCHIVIERT] ${profile.username || profile.id}`,
            role: 'archived'
          })
          .eq('id', profile.id);

        if (!error) {
          markedOrphanProfiles++;
          fixes.push(`📦 Verwaistes Profil archiviert: ${profile.username || profile.id} (kein Auth User mehr)`);
        }
      }
    }
    if (markedOrphanProfiles === 0) report.push('✅ Keine verwaisten Profile gefunden');

    // ══════════════════════════════════════════
    // SCHRITT 2: GAME_RESULTS REPARIEREN
    // ══════════════════════════════════════════
    report.push('─── Game Results ───');

    // Alle game_results neu laden (inkl. neu erstellter Profile)
    const { data: freshResults } = await supabaseAdmin
      .from('game_results')
      .select('id, user_id, game_mode, date, avg, schnaepse, total');

    // total-Werte korrigieren
    let fixedTotal = 0;
    for (const r of freshResults || []) {
      const correctTotal = Math.round(((Number(r.avg) || 0) + (Number(r.schnaepse) || 0)) * 100) / 100;
      if (Math.abs((Number(r.total) || 0) - correctTotal) > 0.01) {
        const { error } = await supabaseAdmin
          .from('game_results')
          .update({ total: correctTotal })
          .eq('id', r.id);
        if (!error) fixedTotal++;
      }
    }
    if (fixedTotal > 0) fixes.push(`🔢 ${fixedTotal} total-Werte korrigiert (avg + schnaepse)`);
    else report.push('✅ Alle total-Werte korrekt');

    // Fehlende Datum/Modus reparieren
    let fixedIncomplete = 0;
    for (const r of freshResults || []) {
      const needsUpdate = !r.date?.trim() || !r.game_mode?.trim();
      if (needsUpdate) {
        const { error } = await supabaseAdmin
          .from('game_results')
          .update({
            date: r.date?.trim() || new Date().toLocaleDateString('de-DE'),
            game_mode: r.game_mode?.trim() || 'Unbekannt'
          })
          .eq('id', r.id);
        if (!error) fixedIncomplete++;
      }
    }
    if (fixedIncomplete > 0) fixes.push(`🔧 ${fixedIncomplete} unvollständige game_results repariert`);
    else report.push('✅ Alle game_results vollständig');

    // Verwaiste game_results → in database_backups sichern statt löschen
    const orphanResults = (freshResults || []).filter((r: any) => !authUserMap[r.user_id]);
    if (orphanResults.length > 0) {
      try {
        await supabaseAdmin.from('database_backups').insert({
          backup_type: 'orphan_game_results',
          data: orphanResults
        });
        fixes.push(`💾 ${orphanResults.length} verwaiste game_results in database_backups gesichert (nicht gelöscht)`);
      } catch {}
      report.push(`⚠️ ${orphanResults.length} game_results ohne Auth User gefunden (gesichert, nicht gelöscht)`);
    } else {
      report.push('✅ Keine verwaisten game_results');
    }

    // ══════════════════════════════════════════
    // SCHRITT 3: ACHIEVEMENTS REPARIEREN
    // ══════════════════════════════════════════
    report.push('─── Achievements ───');

    const { data: freshAchs } = await supabaseAdmin
      .from('achievements')
      .select('id, user_id, achievement_id, date, title, rarity, icon, game_mode, earned_with, earned_together, created_at');

    // Duplikate entfernen – aber erst das Original identifizieren
    const achMap: Record<string, any[]> = {};
    for (const a of freshAchs || []) {
      const key = `${a.user_id}|${a.achievement_id}|${a.date}`;
      if (!achMap[key]) achMap[key] = [];
      achMap[key].push(a);
    }

    let deletedDuplicates = 0;
    const duplicatesToDelete: any[] = [];
    for (const [, entries] of Object.entries(achMap)) {
      if (entries.length > 1) {
        // Ältestes behalten (niedrigste created_at), Rest löschen
        entries.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
        duplicatesToDelete.push(...entries.slice(1));
      }
    }

    if (duplicatesToDelete.length > 0) {
      // Duplikate zuerst sichern in database_backups
      try {
        await supabaseAdmin.from('database_backups').insert({
          backup_type: 'duplicate_achievements',
          data: duplicatesToDelete
        });
      } catch {}

      // Dann löschen
      for (const dup of duplicatesToDelete) {
        const { error } = await supabaseAdmin.from('achievements').delete().eq('id', dup.id);
        if (!error) deletedDuplicates++;
      }
      fixes.push(`🔄 ${deletedDuplicates} doppelte Achievements entfernt (Original behalten, Duplikat gesichert)`);
    } else {
      report.push('✅ Keine doppelten Achievements');
    }

    // Achievements ohne achievement_id sichern
    const invalidAchs = (freshAchs || []).filter((a: any) => !a.achievement_id?.trim());
    if (invalidAchs.length > 0) {
      try {
        await supabaseAdmin.from('database_backups').insert({
          backup_type: 'invalid_achievements',
          data: invalidAchs
        });
      } catch {}
      report.push(`⚠️ ${invalidAchs.length} Achievements ohne ID gefunden und in database_backups gesichert`);
    } else {
      report.push('✅ Alle Achievements haben IDs');
    }

    // Verwaiste Achievements sichern
    const orphanAchs = (freshAchs || []).filter((a: any) => !authUserMap[a.user_id]);
    if (orphanAchs.length > 0) {
      try {
        await supabaseAdmin.from('database_backups').insert({
          backup_type: 'orphan_achievements',
          data: orphanAchs
        });
      } catch {}
      report.push(`⚠️ ${orphanAchs.length} verwaiste Achievements in database_backups gesichert (nicht gelöscht)`);
    } else {
      report.push('✅ Keine verwaisten Achievements');
    }

    // ══════════════════════════════════════════
    // SCHRITT 4: FRIENDSHIPS REPARIEREN
    // ══════════════════════════════════════════
    report.push('─── Friendships ───');

    const { data: freshFriendships } = await supabaseAdmin
      .from('friendships')
      .select('id, requester_id, receiver_id, status');

    // Ungültige Status reparieren
    const validStatuses = ['pending', 'accepted', 'rejected'];
    let fixedStatuses = 0;
    for (const f of freshFriendships || []) {
      if (!validStatuses.includes(f.status)) {
        const { error } = await supabaseAdmin
          .from('friendships')
          .update({ status: 'pending' })
          .eq('id', f.id);
        if (!error) fixedStatuses++;
      }
    }
    if (fixedStatuses > 0) fixes.push(`🔧 ${fixedStatuses} Friendship-Status repariert`);
    else report.push('✅ Alle Friendship-Status gültig');

    // Verwaiste Freundschaften sichern
    const orphanFriends = (freshFriendships || []).filter(
      (f: any) => !authUserMap[f.requester_id] || !authUserMap[f.receiver_id]
    );
    if (orphanFriends.length > 0) {
      try {
        await supabaseAdmin.from('database_backups').insert({
          backup_type: 'orphan_friendships',
          data: orphanFriends
        });
      } catch {}
      report.push(`⚠️ ${orphanFriends.length} verwaiste Freundschaften in database_backups gesichert (nicht gelöscht)`);
    } else {
      report.push('✅ Keine verwaisten Freundschaften');
    }

    // ══════════════════════════════════════════
    // SCHRITT 5: PROFIL-STATISTIKEN NEU BERECHNEN
    // ══════════════════════════════════════════
    report.push('─── Profil-Statistiken ───');

    // Profile-Statistiken für ALLE User neu berechnen
    const { data: allResults } = await supabaseAdmin
      .from('game_results')
      .select('user_id, avg, schnaepse');

    const { data: allAchs } = await supabaseAdmin
      .from('achievements')
      .select('user_id, achievement_id');

    // Gruppierung nach user_id
    const statsMap: Record<string, {
      gamesPlayed: number;
      totalSchnaepse: number;
      bestAvg: number | null;
      achCount: number;
    }> = {};

    for (const r of allResults || []) {
      if (!statsMap[r.user_id]) {
        statsMap[r.user_id] = { gamesPlayed: 0, totalSchnaepse: 0, bestAvg: null, achCount: 0 };
      }
      statsMap[r.user_id].gamesPlayed++;
      statsMap[r.user_id].totalSchnaepse += r.schnaepse || 0;
      const avg = r.avg || 999;
      if (statsMap[r.user_id].bestAvg === null || avg < statsMap[r.user_id].bestAvg) {
        statsMap[r.user_id].bestAvg = avg;
      }
    }

    for (const a of allAchs || []) {
      if (!statsMap[a.user_id]) {
        statsMap[a.user_id] = { gamesPlayed: 0, totalSchnaepse: 0, bestAvg: null, achCount: 0 };
      }
      statsMap[a.user_id].achCount++;
    }

    let profilesUpdated = 0;
    for (const [userId, stats] of Object.entries(statsMap)) {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          games_played: stats.gamesPlayed,
          total_points: stats.totalSchnaepse,
          high_score: stats.bestAvg,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      if (!error) profilesUpdated++;
    }

    fixes.push(`📊 ${profilesUpdated} Profile-Statistiken neu berechnet aus game_results und achievements`);

    // ══════════════════════════════════════════
    // ZUSAMMENFASSUNG
    // ══════════════════════════════════════════
    report.push('─────────────────────────────');
    report.push(`🔧 ${fixes.length} Reparaturen durchgeführt`);
    report.push('💾 Alle gesicherten Daten liegen in der Supabase-Tabelle public.database_backups');
    if (errors.length > 0) report.push(`❌ ${errors.length} Fehler aufgetreten`);

    return res.status(200).json({
      success: errors.length === 0,
      report,
      fixes,
      errors
    });

  } catch (err: any) {
    console.error('repair-database error:', err);
    return res.status(500).json({
      success: false,
      report: [...report, `Kritischer Fehler bei Schritt: ${err.message}`],
      fixes,
      errors: [...errors, err.message]
    });
  }
}

