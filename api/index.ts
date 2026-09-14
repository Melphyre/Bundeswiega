import express from 'express';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import { calculateGameXp, calculateLevelFromXp, getLevelFromXP } from '../src/utils/levelSystem.js';
import { checkTournamentAchievements, MASTER_ACHIEVEMENTS_DEFINITIONS } from '../src/achievementsData.js';
import { processQuestsForUser } from '../src/utils/questEvaluator.js';

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

const DEFAULT_AVATAR_URL = 'https://gzfeauqvpnjowyfbavwl.supabase.co/storage/v1/object/public/avatars/unknown.svg.svg';

function getAvatarUrl(url?: string | null): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return DEFAULT_AVATAR_URL;
  }
  return url.trim();
}

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

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS selected_title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name_bg_color TEXT DEFAULT 'none';

CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'In Vorbereitung',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS tournaments_name_unique_idx ON public.tournaments (name);

CREATE TABLE IF NOT EXISTS public.teamwiegen_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES public.game_results(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL,
  current_progress NUMERIC NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, quest_id)
);
CREATE INDEX IF NOT EXISTS idx_user_quest_progress_user ON public.user_quest_progress(user_id);

CREATE TABLE IF NOT EXISTS public.user_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, title)
);
CREATE INDEX IF NOT EXISTS idx_user_titles_user ON public.user_titles(user_id);

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
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
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

const app = express();
app.use(express.json({ limit: '10mb' }));

// Global CORS & Content-Type Header Middleware
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// ── Records ──────────────────────────────────────
app.all(['/api/records', '/records'], (req, res) => handleRecords(req as any, res as any));

// ── Upload ───────────────────────────────────────
app.all(['/api/upload', '/upload'], (req, res) => handleUpload(req as any, res as any));

// ── Users ────────────────────────────────────────
app.all(['/api/users/list', '/users/list', '/api/users', '/users'], (req, res) => handleUsersList(req as any, res as any));
app.all(['/api/users/save-game-result', '/users/save-game-result', '/api/save-game-result', '/save-game-result'], (req, res) => handleSaveGameResult(req as any, res as any));
app.all(['/api/users/update-title', '/users/update-title', '/api/update-title', '/update-title'], (req, res) => handleUpdateTitle(req as any, res as any));
app.all(['/api/users/update-name-bg', '/users/update-name-bg', '/api/update-name-bg', '/update-name-bg'], (req, res) => handleUpdateNameBg(req as any, res as any));
app.all(['/api/users/save-result', '/users/save-result', '/api/save-result', '/save-result'], (req, res) => handleSaveResult(req as any, res as any));
app.all(['/api/users/update-privacy', '/users/update-privacy'], (req, res) => handleUpdatePrivacy(req as any, res as any));
app.all(['/api/users/delete', '/users/delete'], (req, res) => handleDeleteUser(req as any, res as any));
app.all(['/api/users/find-by-username', '/users/find-by-username'], (req, res) => handleFindByUsername(req as any, res as any));
app.all(['/api/users/check-username', '/users/check-username'], (req, res) => handleCheckUsername(req as any, res as any));
app.all(['/api/users/public-records', '/users/public-records'], (req, res) => handlePublicRecords(req as any, res as any));
app.all(['/api/users/profile-data', '/users/profile-data', '/api/profile-data', '/profile-data'], (req, res) => handleGetProfileData(req as any, res as any));
app.all(['/api/users/evaluate-quests', '/users/evaluate-quests', '/api/evaluate-quests', '/evaluate-quests'], (req, res) => handleEvaluateQuests(req as any, res as any));

// ── Admin ────────────────────────────────────────
app.all(['/api/admin/set-role', '/admin/set-role'], (req, res) => handleAdminSetRole(req as any, res as any));
app.all(['/api/admin/repair-database', '/admin/repair-database', '/api/repair-database', '/repair-database'], (req, res) => handleRepairDatabase(req as any, res as any));

// ── Tournament ───────────────────────────────────
app.all(['/api/tournament/list', '/tournament/list'], (req, res) => handleTournamentList(req as any, res as any));
app.all(['/api/tournament/get', '/tournament/get'], (req, res) => handleTournamentGet(req as any, res as any));
app.all(['/api/tournament/save', '/tournament/save'], (req, res) => handleTournamentSave(req as any, res as any));
app.all(['/api/tournament/delete', '/tournament/delete'], (req, res) => handleTournamentDelete(req as any, res as any));

// Fallback für unbegrenzte/unbekannte Routen
app.use((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({ error: `Route ${req.originalUrl || req.url} not found` });
});

// Express global error middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled API Error in Express app:', err);
  if (!res.headersSent) {
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
      error: 'Internal Server Error',
      details: err?.message || 'Unknown error'
    });
  }
});

// Zentraler Handler / Router für Vercel & Express
const defaultHandler = async (req: any, res: any) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawUrl = req.url || '';
  const pathWithoutQuery = rawUrl.split('?')[0].replace(/\/+$/, '') || '/';

  if (pathWithoutQuery.includes('/records')) {
    return handleRecords(req, res);
  }
  if (pathWithoutQuery.includes('/profile-data')) {
    return handleGetProfileData(req, res);
  }
  if (pathWithoutQuery.includes('/users/list') || pathWithoutQuery === '/api/users' || pathWithoutQuery === '/users') {
    return handleUsersList(req, res);
  }
  if (pathWithoutQuery.includes('/repair-database')) {
    return handleRepairDatabase(req, res);
  }
  if (pathWithoutQuery.includes('/update-title')) {
    return handleUpdateTitle(req, res);
  }
  if (pathWithoutQuery.includes('/update-name-bg')) {
    return handleUpdateNameBg(req, res);
  }
  if (pathWithoutQuery.includes('/save-game-result')) {
    return handleSaveGameResult(req, res);
  }

  return (app as any)(req, res);
};

export default defaultHandler;

// ════════════════════════════════════════════════
// HANDLER FUNKTIONEN & DB HELPER
// ════════════════════════════════════════════════

async function safeDbQuery<T = any>(queryBuilder: any, fallback: T = [] as any): Promise<{ data: T; error: any }> {
  try {
    const res = await queryBuilder;
    return { data: (res?.data ?? fallback) as T, error: res?.error ?? null };
  } catch (err: any) {
    return { data: fallback, error: err };
  }
}

async function handleRecords(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!isSupabaseConfigured()) {
      return res.status(200).json({ data: [] });
    }

    try { await ensureCoreSchema(); } catch (e) { console.warn('Core schema check skipped:', e); }

    const [resultsRes, profilesRes, achRes] = await Promise.all([
      safeDbQuery(
        supabaseAdmin
          .from('game_results')
          .select('*, teamwiegen_players(user_id)')
          .order('created_at', { ascending: false }),
        []
      ),
      safeDbQuery(supabaseAdmin.from('profiles').select('*'), []),
      safeDbQuery(supabaseAdmin.from('achievements').select('*'), [])
    ]);

    const profileMap: Record<string, any> = {};
    (profilesRes.data || []).forEach((p: any) => {
      if (p && p.id) profileMap[p.id] = p;
    });

    let safeResults = Array.isArray(resultsRes.data) ? resultsRes.data : [];
    // Fallback falls die Relation teamwiegen_players in Supabase fehlschlägt
    if (safeResults.length === 0 && resultsRes.error) {
      const fallbackResults = await safeDbQuery(
        supabaseAdmin
          .from('game_results')
          .select('*')
          .order('created_at', { ascending: false }),
        []
      );
      if (Array.isArray(fallbackResults.data)) {
        safeResults = fallbackResults.data;
      }
    }

    const safeAchs = Array.isArray(achRes.data) ? achRes.data : [];

    const rows = safeResults
      .filter((r: any) => {
        if (!r) return false;
        const teamUserIds = (r.teamwiegen_players || []).map((tp: any) => tp.user_id).filter(Boolean);
        const effectiveUserIds = r.user_id ? Array.from(new Set([r.user_id, ...teamUserIds])) : teamUserIds;

        for (const uId of effectiveUserIds) {
          const profile = profileMap[uId];
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
      .map((r: any) => {
        const teamUserIds = (r.teamwiegen_players || []).map((tp: any) => tp.user_id).filter(Boolean);
        const effectiveUserIds = r.user_id ? Array.from(new Set([r.user_id, ...teamUserIds])) : teamUserIds;
        const mainUserId = effectiveUserIds[0] || null;

        const playerName = r.team_name || r.player_name || (r.is_guest ? 'Gast' : 'Unbekannt');
        const canonicalMode = r.game_mode || 'Standardspiel';

        const entryAchs = safeAchs
          .filter((a: any) => {
            if (!a) return false;
            const matchUser = mainUserId ? effectiveUserIds.includes(a.user_id) : (a.player_name === playerName || a.is_guest);
            const matchDate = a.date === r.date;
            return matchUser && matchDate && (a.game_mode === canonicalMode || !a.game_mode);
          })
          .map((a: any) => ({
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
          entryAchs.length > 0 ? encodeURIComponent(JSON.stringify(entryAchs)) : '',
          r.tournament_name || '',
          r.tournament_table || ''
        ];
      });

    const header = ['Datum', 'Modus', 'Name', 'Avg', 'Schnaepse', 'Total', 'Achievements', 'Turnier', 'Tisch'];
    return res.status(200).json({ data: [header, ...rows] });
  } catch (error: any) {
    console.error("Error in records handler:", error);
    return res.status(200).json({ data: [['Datum', 'Modus', 'Name', 'Avg', 'Schnaepse', 'Total', 'Achievements', 'Turnier', 'Tisch']] });
  }
}

async function handleUpload(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || getRequestBody(req));
  const { gameMode, results, date, achievements } = body;

  if (!gameMode || !results || !Array.isArray(results) || !date) {
    return res.status(400).json({ error: "Invalid request payload. Must include gameMode, results array, and date." });
  }

  try {
    await ensureCoreSchema();

    if (!isSupabaseConfigured()) {
      return res.status(500).json({ error: 'Supabase ist nicht konfiguriert.' });
    }

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, username, games_played, total_points, high_score, xp, level');

    const profileMap = new Map<string, any>();
    (profiles || []).forEach((p: any) => {
      if (p?.username) {
        profileMap.set(p.username.toLowerCase().trim(), p);
      }
    });

    const isSpeedMode = gameMode.toLowerCase().includes('speed');
    const isTeamwiegen = gameMode.toLowerCase().includes('teamwiegen');
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

      const { data: insertedGame, error: insertErr } = await supabaseAdmin
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
          team_name: item.team_name || null,
          tournament_name: item.tournament_name || null,
          tournament_table: item.tournament_table || null
        })
        .select('id')
        .single();

      if (insertErr) {
        console.error(`game_results insert error for ${playerName}:`, insertErr.message);
      } else {
        savedResultsCount++;

        const teamUserIds: string[] = Array.isArray(item.userIds) && item.userIds.length > 0
          ? item.userIds
          : (userId ? [userId] : []);

        if (isTeamwiegen && insertedGame?.id && teamUserIds.length > 0) {
          const teamPlayerInserts = teamUserIds.map((uId: string) => ({
            game_id: insertedGame.id,
            user_id: uId
          }));

          const { error: teamPlayerErr } = await supabaseAdmin
            .from('teamwiegen_players')
            .insert(teamPlayerInserts);

          if (teamPlayerErr) {
            console.error(`teamwiegen_players insert error for ${playerName}:`, teamPlayerErr.message);
          }
        }
      }

      const teamUserIdsForXp: string[] = Array.isArray(item.userIds) && item.userIds.length > 0
        ? item.userIds
        : (userId ? [userId] : []);

      for (const targetUserId of teamUserIdsForXp) {
        const targetProfile = (profiles || []).find((p: any) => p.id === targetUserId);
        if (!targetProfile) continue;

        try {
          const xpResult = calculateGameXp({
            avg,
            schnaepse,
            isSpeedMode,
            timeSeconds: isSpeedMode ? (timeSeconds || 0) : undefined,
            isWinner: false
          });
          const earnedXp = xpResult.totalXp;

          const currentXp = Number(targetProfile.xp) || 0;
          const newXp = currentXp + earnedXp;
          const newLevel = calculateLevelFromXp(newXp).level;
          const newGamesPlayed = (Number(targetProfile.games_played) || 0) + 1;
          const newTotalPoints = (Number(targetProfile.total_points) || 0) + (isSpeedMode ? (timeSeconds || 0) : schnaepse);
          const currentHigh = (targetProfile.high_score !== null && targetProfile.high_score !== undefined)
            ? Number(targetProfile.high_score)
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
            .eq('id', targetUserId);

          targetProfile.xp = newXp;
          targetProfile.level = newLevel;
          targetProfile.games_played = newGamesPlayed;
          targetProfile.total_points = newTotalPoints;
          targetProfile.high_score = newHighScore;

          try {
            await processQuestsForUser(targetUserId, supabaseAdmin);
          } catch (qErr: any) {
            console.warn(`Quest evaluation warning for user ${targetUserId}:`, qErr?.message);
          }
        } catch (profErr: any) {
          console.warn(`Profile stats update warning for user ${targetUserId}:`, profErr.message);
        }
      }

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

        let dupeQuery = supabaseAdmin
          .from('achievements')
          .select('id')
          .eq('achievement_id', a.id)
          .eq('date', date);

        if (isGuest) {
          dupeQuery = dupeQuery.eq('player_name', playerName).is('user_id', null);
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
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!isSupabaseConfigured()) {
      return res.status(200).json({ users: [] });
    }

    try {
      await ensureCoreSchema();
    } catch {
      // ignore
    }

    // Aus profiles Tabelle laden (hat username und title korrekt gespeichert)
    let profiles: any[] | null = null;
    let profError: any = null;

    try {
      const pRes = await supabaseAdmin
        .from('profiles')
        .select('id, username, email, avatar_url, role, title, level, xp, name_bg_color')
        .order('username');
      profiles = pRes.data;
      profError = pRes.error;
    } catch (e) {
      profError = e;
    }

    // Fallback: Falls eine Spalte fehlt (z. B. avatar_url oder name_bg_color), mit select('*') abfragen
    if (profError || !profiles) {
      try {
        const fallbackRes = await supabaseAdmin
          .from('profiles')
          .select('*')
          .order('username');
        if (fallbackRes.data && Array.isArray(fallbackRes.data)) {
          profiles = fallbackRes.data;
          profError = null;
        }
      } catch {
        // ignore
      }
    }

    if (!profError && profiles && profiles.length > 0) {
      const userList = profiles.map((p: any) => ({
        id: p.id,
        name: p.username || p.email || 'Unbekannt',
        username: p.username || '',
        email: p.email || '',
        role: p.role || 'user',
        imageUrl: getAvatarUrl(p.avatar_url || p.image_url),
        title: p.title || p.selected_title || '',
        level: Number(p.level) || 1,
        xp: Number(p.xp) || 0,
        name_bg_color: p.name_bg_color || 'none'
      }));
      return res.status(200).json({ users: userList });
    }

    // Fallback auf auth.admin.listUsers()
    let authData: any = null;
    let authError: any = null;
    try {
      const aRes = await supabaseAdmin.auth.admin.listUsers();
      authData = aRes.data;
      authError = aRes.error;
    } catch (e) {
      authError = e;
    }

    if (authError) {
      console.error('handleUsersList auth error:', authError);
      return res.status(500).json({ error: authError.message || 'Fehler beim Laden der Benutzerliste', users: [] });
    }

    if (authData?.users) {
      const userList = authData.users.map((u: any) => ({
        id: u.id,
        name: u.user_metadata?.username || u.email || 'Unbekannt',
        username: u.user_metadata?.username || '',
        email: u.email || '',
        role: u.user_metadata?.role || 'user',
        imageUrl: getAvatarUrl(u.user_metadata?.avatar_url),
        title: u.user_metadata?.title || '',
        name_bg_color: u.user_metadata?.name_bg_color || 'none'
      }));
      return res.status(200).json({ users: userList });
    }

    return res.status(200).json({ users: [] });
  } catch (err: any) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: err?.message || 'Interner Serverfehler beim Laden der Benutzerliste', users: [] });
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
        .update({ title: title || '', selected_title: title || '' })
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
        team_name: gameResult.team_name || null,
        tournament_name: gameResult.tournament_name || null,
        tournament_table: gameResult.tournament_table || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('game_results insert error:', insertError);
      return res.status(500).json({ error: insertError.message, code: insertError.code });
    }

    console.log('game_results gespeichert:', insertedResult?.id);

// Bei Teamwiegen alle verknüpften Spieler in teamwiegen_players eintragen
  const isTeamwiegen = (gameResult.game_mode || '').toLowerCase().includes('teamwiegen');
  const teamUserIds: string[] = Array.isArray(gameResult.userIds) && gameResult.userIds.length > 0
    ? gameResult.userIds
    : [userId];

  if (isTeamwiegen && insertedResult?.id && teamUserIds.length > 0) {
    const teamPlayerInserts = teamUserIds.map((uId: string) => ({
      game_id: insertedResult.id,
      user_id: uId
    }));

    const { error: teamPlayerErr } = await supabaseAdmin
      .from('teamwiegen_players')
      .insert(teamPlayerInserts);

    if (teamPlayerErr) {
      console.error('teamwiegen_players insert error in handleSaveGameResult:', teamPlayerErr.message);
    }
  }
  
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
      .select('xp, level, title')
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

    try {
      await processQuestsForUser(userId, supabaseAdmin);
    } catch (qErr: any) {
      console.warn(`Quest evaluation warning for user ${userId}:`, qErr?.message);
    }

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
          tournament_name: entry.tournament_name || undefined,
          tournament_table: entry.tournament_table || undefined,
          source: 'account'
        });
      });
    });

    return res.status(200).json({ records: publicRecords });
  } catch (err: any) {
    return res.status(200).json({ records: [] });
  }
}

async function handleGetProfileData(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const query = getRequestQuery(req);
    const userId = (query.userId || (req.query && req.query.userId) || '').trim();

    if (!userId) {
      return res.status(400).json({ error: 'userId parameter is required' });
    }

    // 1. Quests im Hintergrund/Asynchron anstoßen (blockiert die Response nicht!)
    processQuestsForUser(userId, supabaseAdmin).catch((err: any) => 
      console.error('Async Quest Evaluation Error:', err)
    );

    if (!isSupabaseConfigured()) {
      return res.status(200).json({
        profile: null,
        gameResults: [],
        achievements: [],
        questProgress: [],
        quests: [],
        userTitles: [],
        titles: []
      });
    }

    // Stelle sicher, dass Tabellen & Spalten existieren (defensiv im Hintergrund)
    ensureCoreSchema().catch((schemaErr: any) => {
      console.warn('ensureCoreSchema in handleGetProfileData warning:', schemaErr?.message);
    });

    // 2. Bestehende Profile-, Quest- und Titel-Daten laden
    const [profileRes, resultsRes, teamRes, achRes, questRes, titlesRes] = await Promise.all([
      safeDbQuery(
        supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        null
      ),
      safeDbQuery(
        supabaseAdmin
          .from('game_results')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        []
      ),
      safeDbQuery(
        supabaseAdmin
          .from('teamwiegen_players')
          .select('game_id')
          .eq('user_id', userId),
        []
      ),
      safeDbQuery(
        supabaseAdmin
          .from('achievements')
          .select('*')
          .eq('user_id', userId),
        []
      ),
      safeDbQuery(
        supabaseAdmin
          .from('user_quest_progress')
          .select('*')
          .eq('user_id', userId),
        []
      ),
      safeDbQuery(
        supabaseAdmin
          .from('user_titles')
          .select('*')
          .eq('user_id', userId),
        []
      )
    ]);

    if (profileRes?.error && profileRes.error.code && profileRes.error.code !== 'PGRST116') {
      console.warn('profileRes query error in handleGetProfileData:', profileRes.error.message || profileRes.error);
    }

    let profile = profileRes?.data || null;

    // Falls avatar_url im Profile fehlt, versuche auth.users Metadaten
    if (profile && (!profile.avatar_url || profile.avatar_url.includes('unknown.svg'))) {
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (authUser?.user?.user_metadata?.avatar_url) {
          profile.avatar_url = authUser.user.user_metadata.avatar_url;
        }
      } catch {
        // ignore
      }
    }

    let gameResults = Array.isArray(resultsRes?.data) ? [...resultsRes.data] : [];

    const teamGameIds = (teamRes?.data || []).map((t: any) => t.game_id).filter(Boolean);
    if (teamGameIds.length > 0) {
      try {
        const { data: teamGames } = await supabaseAdmin
          .from('game_results')
          .select('*')
          .in('id', teamGameIds);
        if (Array.isArray(teamGames) && teamGames.length > 0) {
          const existingIds = new Set(gameResults.map(g => g.id));
          for (const tg of teamGames) {
            if (!existingIds.has(tg.id)) {
              gameResults.push(tg);
              existingIds.add(tg.id);
            }
          }
          gameResults.sort((a, b) => new Date(b.created_at || b.date || 0).getTime() - new Date(a.created_at || a.date || 0).getTime());
        }
      } catch (tgErr) {
        console.warn('teamGames fetch warning:', tgErr);
      }
    }

    const achievements = Array.isArray(achRes?.data) ? achRes.data : [];
    const quests = Array.isArray(questRes?.data) ? questRes.data : [];
    const titles = Array.isArray(titlesRes?.data) ? titlesRes.data : [];
    const userTitles = titles.map((t: any) => typeof t === 'string' ? t : t.title).filter(Boolean);

    // 3. Valides JSON zurückgeben (enthält sowohl quests/titles als auch questProgress/userTitles)
    return res.status(200).json({
      profile,
      gameResults,
      achievements,
      questProgress: quests,
      quests,
      userTitles,
      titles
    });
  } catch (error: any) {
    console.error('API Error /api/users/profile-data:', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error?.message || 'Unknown error',
      profile: null,
      gameResults: [],
      achievements: [],
      questProgress: [],
      quests: [],
      userTitles: [],
      titles: []
    });
  }
}

async function handleEvaluateQuests(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const body = getRequestBody(req);
    const userId = body?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'userId ist erforderlich.' });
    }

    if (!isSupabaseConfigured()) {
      return res.status(200).json({ success: true, questProgress: [], userTitles: [] });
    }

    try {
      await ensureCoreSchema();
    } catch {
      // ignore
    }

    await processQuestsForUser(userId, supabaseAdmin);

    const [questRes, titlesRes] = await Promise.all([
      safeDbQuery(
        supabaseAdmin
          .from('user_quest_progress')
          .select('*')
          .eq('user_id', userId),
        []
      ),
      safeDbQuery(
        supabaseAdmin
          .from('user_titles')
          .select('title')
          .eq('user_id', userId),
        []
      )
    ]);

    return res.status(200).json({
      success: true,
      questProgress: questRes?.data || [],
      userTitles: (titlesRes?.data || []).map((t: any) => t.title).filter(Boolean)
    });
  } catch (err: any) {
    console.error('handleEvaluateQuests error:', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: err.message || 'Fehler bei Quest-Auswertung' });
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
  date: string;
  results: Array<{ name?: string; playerName?: string; rank?: number; avg?: number | string; schnaepse?: number | string }>;
}) {
  if (!isSupabaseConfigured()) return { syncedCount: 0 };
  const { tournamentName, tournamentTable, date: resultDate, results } = params;
  let syncedCount = 0;

  // Strikter game_mode gemäß den neuen DB-Anforderungen
  const fixedGameMode = 'Standardspiel (500ml)';

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

      // Deduplizierungs-Prüfung über Turniername & Tisch
      let query = supabaseAdmin
        .from('game_results')
        .select('id')
        .eq('date', resultDate)
        .eq('tournament_name', tournamentName)
        .eq('tournament_table', tournamentTable);

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
          game_mode: fixedGameMode,
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
          player_name: trimmedPlayer, // Immer befüllen
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

      if (existingTournament) {
        const { error: updateErr } = await supabaseAdmin
          .from('tournaments')
          .update({
            name: trimmedName,
            status: currentStatus,
            config: tournamentConfig,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingTournament.id);

        if (updateErr) {
          console.error('update tournament error:', updateErr);
          return res.status(500).json({ error: updateErr.message });
        }
      } else {
        const { error: insertErr } = await supabaseAdmin
          .from('tournaments')
          .insert({
            name: trimmedName,
            status: currentStatus,
            config: tournamentConfig,
            updated_at: new Date().toISOString()
          });

        if (insertErr) {
          console.error('insert tournament error:', insertErr);
          // Fallback update in case of duplicate name or race condition
          const { error: fallbackUpdateErr } = await supabaseAdmin
            .from('tournaments')
            .update({
              status: currentStatus,
              config: tournamentConfig,
              updated_at: new Date().toISOString()
            })
            .ilike('name', trimmedName);

          if (fallbackUpdateErr) {
            console.error('upsert tournament error:', fallbackUpdateErr);
            return res.status(500).json({ error: insertErr.message || fallbackUpdateErr.message });
          }
        }
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

        await syncTournamentTableToSupabaseGameResults({
          tournamentName: trimmedName,
          tournamentTable: targetTable.name || targetTable.id,
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

    const updateQuery = existingTournament?.id
      ? supabaseAdmin
          .from('tournaments')
          .update({
            status: currentStatus,
            config: tournamentConfig,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingTournament.id)
      : supabaseAdmin
          .from('tournaments')
          .update({
            status: currentStatus,
            config: tournamentConfig,
            updated_at: new Date().toISOString()
          })
          .ilike('name', trimmedName);

    const { error: updateErr } = await updateQuery;

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

async function handleRepairDatabase(req: VercelRequest, res: VercelResponse) {
  const report: string[] = [];
  const fixes: string[] = [];
  const errors: string[] = [];

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

    const { data: freshResults, error: resErr } = await supabaseAdmin
      .from('game_results')
      .select('id, user_id, is_guest, game_mode, date, avg, schnaepse, total, created_at');

    if (resErr) {
      report.push(`❌ Fehler beim Laden der Game Results: ${resErr.message}`);
    } else {
      let fixedTotal = 0;
      let fixedIncomplete = 0;

      for (const r of freshResults || []) {
        const mode = (r.game_mode || '').toLowerCase();
        const isSpeed = mode.includes('speed');

        // Total nur bei Standard-Spielen korrigieren (bei Speedwiegen nicht!)
        let correctTotal = Number(r.total) || 0;
        if (!isSpeed) {
          correctTotal = Math.round(((Number(r.avg) || 0) + (Number(r.schnaepse) || 0)) * 100) / 100;
        }

        const needsTotalFix = !isSpeed && Math.abs((Number(r.total) || 0) - correctTotal) > 0.01;
        const needsMetaFix = !r.date?.trim() || !r.game_mode?.trim();

        if (needsTotalFix || needsMetaFix) {
          // ISO-Datum YYYY-MM-DD erzeugen
          const fallbackDate = r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

          const updatePayload: Record<string, any> = {};
          if (needsTotalFix) updatePayload.total = correctTotal;
          if (!r.date?.trim()) updatePayload.date = fallbackDate;
          if (!r.game_mode?.trim()) updatePayload.game_mode = 'Standardspiel';

          const { error: upErr } = await supabaseAdmin
            .from('game_results')
            .update(updatePayload)
            .eq('id', r.id);

          if (!upErr) {
            if (needsTotalFix) fixedTotal++;
            if (needsMetaFix) fixedIncomplete++;
          }
        }
      }

      if (fixedTotal > 0) fixes.push(`🔢 ${fixedTotal} total-Werte korrigiert (avg + schnaepse)`);
      else report.push('✅ Alle total-Werte korrekt');

      if (fixedIncomplete > 0) fixes.push(`🔧 ${fixedIncomplete} unvollständige game_results repariert`);
      else report.push('✅ Alle game_results vollständig');

      // 2. Verwaiste Einträge prüfen (NUR registrierte User ohne Auth-Konto; Gäste ausklammern!)
      const orphanResults = (freshResults || []).filter((r: any) => 
        r.user_id && !r.is_guest && !authUserMap[r.user_id]
      );

      if (orphanResults.length > 0) {
        try {
          await supabaseAdmin.from('database_backups').insert({
            backup_type: 'orphan_game_results',
            data: orphanResults
          });
          report.push(`⚠️ ${orphanResults.length} verwaiste game_results ohne Auth-User in database_backups gesichert`);
        } catch (bErr: any) {
          console.warn('Backup warning for orphan results:', bErr?.message);
        }
      } else {
        report.push('✅ Keine verwaisten game_results');
      }
    }

   // ══════════════════════════════════════════
    // SCHRITT 3: ACHIEVEMENTS REPARIEREN
    // ══════════════════════════════════════════
    report.push('─── Achievements ───');

    const { data: freshAchs, error: achErr } = await supabaseAdmin
      .from('achievements')
      .select('id, user_id, is_guest, player_name, achievement_id, date, title, rarity, icon, game_mode, earned_with, earned_together, created_at');

    if (achErr) {
      report.push(`❌ Fehler beim Laden der Achievements: ${achErr.message}`);
    } else {
      // 1. Duplikate identifizieren (Unterscheidung zwischen Regulären Usern & Gästen)
      const achMap: Record<string, any[]> = {};
      for (const a of freshAchs || []) {
        // Bei Gästen wird der player_name als Identifier verwendet, um Guest-Spiele nicht fälschlich zu verschmelzen
        const userIdentifier = a.user_id ? a.user_id : `guest_${(a.player_name || 'unknown').toLowerCase().trim()}`;
        const key = `${userIdentifier}|${a.achievement_id}|${a.date}`;
        
        if (!achMap[key]) achMap[key] = [];
        achMap[key].push(a);
      }

      const duplicatesToDelete: any[] = [];
      for (const [, entries] of Object.entries(achMap)) {
        if (entries.length > 1) {
          // Ältestes behalten (niedrigste created_at / ID), Rest löschen
          entries.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
          duplicatesToDelete.push(...entries.slice(1));
        }
      }

      if (duplicatesToDelete.length > 0) {
        // Duplikate zuerst in database_backups sichern
        try {
          await supabaseAdmin.from('database_backups').insert({
            backup_type: 'duplicate_achievements',
            data: duplicatesToDelete
          });
        } catch (bErr: any) {
          console.warn('Backup warning for duplicate achievements:', bErr?.message);
        }

        // Duplikate im effizienten Batch löschen (statt Einzel-Queries)
        const dupIds = duplicatesToDelete.map(d => d.id);
        const { error: delErr } = await supabaseAdmin
          .from('achievements')
          .delete()
          .in('id', dupIds);

        if (!delErr) {
          fixes.push(`🔄 ${dupIds.length} doppelte Achievements entfernt (Original behalten, Duplikate gesichert)`);
        } else {
          errors.push(`Fehler beim Löschen doppelter Achievements: ${delErr.message}`);
        }
      } else {
        report.push('✅ Keine doppelten Achievements');
      }

      // 2. Achievements ohne achievement_id filtern & sichern
      const invalidAchs = (freshAchs || []).filter((a: any) => !a.achievement_id?.trim());
      if (invalidAchs.length > 0) {
        try {
          await supabaseAdmin.from('database_backups').insert({
            backup_type: 'invalid_achievements',
            data: invalidAchs
          });
        } catch {}
        report.push(`⚠️ ${invalidAchs.length} Achievements ohne ID in database_backups gesichert`);
      } else {
        report.push('✅ Alle Achievements haben gültige IDs');
      }

      // 3. Verwaiste Achievements (User gelöscht, aber kein Gast)
      const orphanAchs = (freshAchs || []).filter((a: any) => a.user_id && !authUserMap[a.user_id]);
      if (orphanAchs.length > 0) {
        try {
          await supabaseAdmin.from('database_backups').insert({
            backup_type: 'orphan_achievements',
            data: orphanAchs
          });
        } catch {}
        report.push(`⚠️ ${orphanAchs.length} verwaiste Achievements in database_backups gesichert`);
      } else {
        report.push('✅ Keine verwaisten Achievements');
      }
    }

    // ══════════════════════════════════════════
    // SCHRITT 4: FRIENDSHIPS REPARIEREN
    // ══════════════════════════════════════════
    report.push('─── Friendships ───');

    const { data: freshFriendships, error: friendErr } = await supabaseAdmin
      .from('friendships')
      .select('id, requester_id, receiver_id, status, created_at');

    if (friendErr) {
      report.push(`❌ Fehler beim Laden der Freundschaften: ${friendErr.message}`);
    } else {
      const validStatuses = ['pending', 'accepted', 'rejected'];
      const invalidIds: string[] = [];

      // 1. Ungültige Status sammeln
      for (const f of freshFriendships || []) {
        if (!validStatuses.includes(f.status)) {
          invalidIds.push(f.id);
        }
      }

      // Batch-Update für ungültige Status (viel schneller als Einzel-Updates)
      if (invalidIds.length > 0) {
        const { error: updateErr } = await supabaseAdmin
          .from('friendships')
          .update({ status: 'pending' })
          .in('id', invalidIds);

        if (!updateErr) {
          fixes.push(`🔧 ${invalidIds.length} Friendship-Status auf 'pending' zurückgesetzt`);
        } else {
          errors.push(`Fehler beim Reparieren der Friendship-Status: ${updateErr.message}`);
        }
      } else {
        report.push('✅ Alle Friendship-Status gültig');
      }

      // 2. Selbst-Freundschaften & verwaiste Einträge identifizieren (A -> A oder User existiert nicht)
      const orphanFriends = (freshFriendships || []).filter((f: any) => 
        f.requester_id === f.receiver_id || 
        !authUserMap[f.requester_id] || 
        !authUserMap[f.receiver_id]
      );

      if (orphanFriends.length > 0) {
        try {
          await supabaseAdmin.from('database_backups').insert({
            backup_type: 'orphan_friendships',
            data: orphanFriends
          });
          report.push(`⚠️ ${orphanFriends.length} ungültige/verwaiste Freundschaften in database_backups gesichert`);
        } catch (bErr: any) {
          console.warn('Backup warning for friendships:', bErr?.message);
        }
      } else {
        report.push('✅ Keine verwaisten Freundschaften');
      }
    }

    // ══════════════════════════════════════════
    // SCHRITT 5: PROFIL-STATISTIKEN NEU BERECHNEN
    // ══════════════════════════════════════════
    report.push('─── Profil-Statistiken ───');

    const { data: allResults } = await supabaseAdmin
      .from('game_results')
      .select('user_id, avg, schnaepse');

    const { data: allAchs } = await supabaseAdmin
      .from('achievements')
      .select('user_id, achievement_id');

    const statsMap: Record<string, {
      gamesPlayed: number;
      totalSchnaepse: number;
      bestAvg: number | null;
      achCount: number;
    }> = {};

    for (const r of allResults || []) {
      // Gast-Spiele ohne User-ID ignorieren!
      if (!r.user_id) continue;

      if (!statsMap[r.user_id]) {
        statsMap[r.user_id] = { gamesPlayed: 0, totalSchnaepse: 0, bestAvg: null, achCount: 0 };
      }
      
      statsMap[r.user_id].gamesPlayed++;
      statsMap[r.user_id].totalSchnaepse += Number(r.schnaepse) || 0;
      
      // Korrektur: Null/0 als validen Highscore zulassen (nicht als falsy werten)
      const currentAvg = (r.avg !== null && r.avg !== undefined) ? Number(r.avg) : null;
      if (currentAvg !== null) {
        if (statsMap[r.user_id].bestAvg === null || currentAvg < statsMap[r.user_id].bestAvg!) {
          statsMap[r.user_id].bestAvg = currentAvg;
        }
      }
    }

    for (const a of allAchs || []) {
      if (!a.user_id) continue;

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

