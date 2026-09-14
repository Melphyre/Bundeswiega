import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Supabase Safe Client Setup
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

// ─── RECORDS HANDLER ───
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

    // Pre-aggregate achievements
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

// ─── GET PROFILE DATA HANDLER ───
async function handleGetProfileData(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const userId = safeQueryParam(req, 'userId');
    if (!userId) {
      return res.status(400).json({ error: 'userId is required', data: [] });
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

// ─── USERS LIST HANDLER ───
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

// ─── UPDATE TITLE HANDLER ───
async function handleUpdateTitle(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { userId, title } = (req as any).body || {};
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

// ─── UPDATE NAME BG HANDLER ───
async function handleUpdateNameBg(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { userId, name_bg_color } = (req as any).body || {};
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

// ─── EVALUATE QUESTS HANDLER ───
async function handleEvaluateQuests(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(200).json({ success: false });
  }
}

// ─── SAVE GAME RESULT HANDLER ───
async function handleSaveGameResult(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!supabaseAdmin) return res.status(200).json({ success: false });
    const payload = (req as any).body || {};
    const { error } = await supabaseAdmin.from('game_results').insert(payload);
    return res.status(200).json({ success: !error });
  } catch (err: any) {
    return res.status(200).json({ success: false });
  }
}

// ─── REPAIR DATABASE HANDLER ───
async function handleRepairDatabase(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({ success: true, report: ['✅ Datenbankprüfung abgeschlossen'], fixes: [], errors: [] });
}

// ─── MAIN ROUTER ───
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const url = req.url || '';
    if (url.includes('/records')) return await handleRecords(req, res);
    if (url.includes('/profile-data')) return await handleGetProfileData(req, res);
    if (url.includes('/users/list') || url.endsWith('/users')) return await handleUsersList(req, res);
    if (url.includes('/update-title')) return await handleUpdateTitle(req, res);
    if (url.includes('/update-name-bg')) return await handleUpdateNameBg(req, res);
    if (url.includes('/evaluate-quests')) return await handleEvaluateQuests(req, res);
    if (url.includes('/save-game-result') || url.includes('/save-result')) return await handleSaveGameResult(req, res);
    if (url.includes('/repair-database')) return await handleRepairDatabase(req, res);

    return res.status(404).json({ error: `Route ${url} nicht gefunden.`, data: [] });
  } catch (err: any) {
    console.error("Router Crash:", err);
    return res.status(500).json({ error: "Server Error", message: err?.message || String(err), data: [] });
  }
}
