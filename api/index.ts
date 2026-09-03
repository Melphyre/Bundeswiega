import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, list, del } from '@vercel/blob';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

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
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || '';

const isSupabaseConfigured = () => {
  return (
    !!supabaseUrl &&
    !!supabaseSecretKey &&
    supabaseUrl.includes('supabase.co') &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseSecretKey.includes('placeholder')
  );
};

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
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  try {
    let content = "";

    if (token) {
      try {
        const { blobs } = await list({ prefix: 'results', token });
        const resultsBlob = blobs.find(b => b.pathname === "results.csv");
        if (resultsBlob) {
          const fetchRes = await fetch(resultsBlob.url);
          if (fetchRes.ok) {
            content = await fetchRes.text();
          }
        }
      } catch (listErr: any) {
        console.error("Error listing or fetching results.csv from Vercel Blob:", listErr);
        return res.status(500).json({ error: listErr.message || 'Blob Fehler', data: [] });
      }
    } else {
      // Local development fallback
      const localPath = path.join(process.cwd(), "results.csv");
      if (fs.existsSync(localPath)) {
        content = fs.readFileSync(localPath, "utf-8");
      }
    }

    if (!content) {
      return res.status(200).json({ data: [] });
    }

    // Parse CSV line by line and split by semicolon
    const rows = content.trim().split(/\r?\n/).map(row => row.split(';'));
    return res.status(200).json({ data: rows });
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

  const token = process.env.BLOB_READ_WRITE_TOKEN;

  try {
    let existingContent = "";

    if (token) {
      try {
        const { blobs } = await list({ prefix: 'results', token });
        const resultsBlob = blobs.find(b => b.pathname === "results.csv");
        if (resultsBlob) {
          const fetchRes = await fetch(resultsBlob.url);
          if (fetchRes.ok) {
            existingContent = await fetchRes.text();
          }
        }
      } catch (listErr) {
        console.error("Error reading existing results.csv from Vercel Blob:", listErr);
      }
    } else {
      // Local development fallback
      const localPath = path.join(process.cwd(), "results.csv");
      if (fs.existsSync(localPath)) {
        existingContent = fs.readFileSync(localPath, "utf-8");
      }
    }

    let csv = 'Datum;Modus;Name;Avg;Schnaepse;Levels;Achievements\n';
    if (existingContent.trim()) {
      csv = existingContent;
    }

    const TOGETHER_ACHIEVEMENT_IDS = ['twins', 'doppelganger', 'mirror_number', 'shadow', 'equilibrium'];

    const newLines = results.map((item: any) => {
      const rawPlayerAch = item.achievements && item.achievements.length > 0
        ? item.achievements
        : (achievements && Array.isArray(achievements)
            ? achievements.filter((a: any) => a.earnedBy && Array.isArray(a.earnedBy) && a.earnedBy.includes(item.name))
            : []);

      const formattedAch = rawPlayerAch.map((a: any) => {
        const isTogether = typeof a.earnedTogether === 'boolean'
          ? a.earnedTogether
          : TOGETHER_ACHIEVEMENT_IDS.includes(a.id);

        const achObj: any = {
          id: a.id,
          title: a.title,
          icon: a.icon,
          rarity: a.rarity,
          earnedBy: Array.isArray(a.earnedBy) && a.earnedBy.length > 0 ? a.earnedBy : [item.name]
        };

        if (isTogether) {
          achObj.earnedTogether = true;
        }

        return achObj;
      });

      const achievementsStr = formattedAch.length > 0 ? encodeURIComponent(JSON.stringify(formattedAch)) : "";
      const levelsStr = item.levels !== undefined && item.levels !== null ? String(item.levels) : "";

      return `${date};${gameMode};${item.name};${item.avg};${item.schnaepse};${levelsStr};${achievementsStr}`;
    });

    const updated = csv.trimEnd() + '\n' + newLines.join('\n') + '\n';

    if (token) {
      await put("results.csv", updated, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        token,
        contentType: "text/csv",
      });
      return res.status(200).json({ message: "Ergebnisse wurden erfolgreich gespeichert!" });
    } else {
      const localPath = path.join(process.cwd(), "results.csv");
      fs.writeFileSync(localPath, updated, "utf-8");
      return res.status(200).json({ message: "Ergebnisse lokal gespeichert!" });
    }
  } catch (error: any) {
    console.error("Error in upload handler:", error);
    return res.status(500).json({ error: error.message || "Fehler beim Upload der Ergebnisse." });
  }
}

async function handleUsersList(req: VercelRequest, res: VercelResponse) {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(200).json({ users: [] });
    }

    // Aus profiles Tabelle laden (hat username korrekt gespeichert)
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, username, email, avatar_url, role')
      .order('username');

    if (!error && profiles && profiles.length > 0) {
      const userList = profiles.map((p: any) => ({
        id: p.id,
        name: p.username || p.email || 'Unbekannt',
        username: p.username || '',
        email: p.email || '',
        role: p.role || 'user',
        imageUrl: p.avatar_url || ''
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
      imageUrl: u.user_metadata?.avatar_url || ''
    }));

    return res.status(200).json({ users: userList });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, users: [] });
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

    await supabaseAdmin
      .from('profiles')
      .update({
        games_played: gamesPlayed,
        total_points: totalSchnaepse,
        high_score: bestAvg,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    return res.status(200).json({
      message: 'Ergebnis gespeichert',
      resultId: insertedResult?.id,
      achSaved
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

async function handleAdminRename(req: VercelRequest, res: VercelResponse) {
  const body = getRequestBody(req);
  const { oldName, newName } = body;

  if (!oldName || !newName || typeof oldName !== "string" || typeof newName !== "string") {
    return res.status(400).json({ error: "Invalid parameters. Must include oldName and newName as strings." });
  }

  const trimmedOld = oldName.trim();
  const trimmedNew = newName.trim();

  if (!trimmedOld || !trimmedNew) {
    return res.status(400).json({ error: "oldName and newName cannot be empty." });
  }

  if (trimmedOld === trimmedNew) {
    return res.status(400).json({ error: "Der neue Name muss sich vom alten Namen unterscheiden." });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;

  try {
    let existingContent = "";

    if (token) {
      try {
        console.log("Fetching list of blobs from Vercel Blob storage for rename...");
        const listResult = await list({ token });
        const resultsBlob = listResult.blobs.find(b => b.pathname === "results.csv");
        if (resultsBlob) {
          const fetchRes = await fetch(resultsBlob.url);
          if (fetchRes.ok) {
            existingContent = await fetchRes.text();
          }
        }
      } catch (listErr) {
        console.error("Error reading results.csv for rename:", listErr);
      }
    } else {
      // Local development fallback
      const localPath = path.join(process.cwd(), "results.csv");
      if (fs.existsSync(localPath)) {
        existingContent = fs.readFileSync(localPath, "utf-8");
      }
    }

    if (!existingContent.trim()) {
      return res.status(400).json({ error: "Keine CSV-Daten gefunden zum Umbenennen." });
    }

    const lines = existingContent.split(/\r?\n/).filter(line => line.trim() !== "");
    let modifiedCount = 0;

    const updatedLines = lines.map((line, idx) => {
      if (idx === 0) return line; // Header row

      const parts = line.split(";");
      if (parts.length < 3) return line;

      let rowChanged = false;

      // Check Name column (index 2)
      if (parts[2] && parts[2].trim() === trimmedOld) {
        parts[2] = trimmedNew;
        rowChanged = true;
      }

      // Check Achievements JSON column (index 6)
      if (parts[6] && parts[6].trim()) {
        try {
          const decoded = decodeURIComponent(parts[6]);
          if (decoded.includes(trimmedOld)) {
            const achievementsObj = JSON.parse(decoded);
            if (Array.isArray(achievementsObj)) {
              achievementsObj.forEach((ach: any) => {
                if (ach.earnedBy && Array.isArray(ach.earnedBy)) {
                  ach.earnedBy = ach.earnedBy.map((name: string) => name === trimmedOld ? trimmedNew : name);
                }
              });
              parts[6] = encodeURIComponent(JSON.stringify(achievementsObj));
              rowChanged = true;
            }
          }
        } catch (e) {
          // If decoding/parsing fails, attempt simple string replace inside string
          const replacedDecoded = decodeURIComponent(parts[6]).replaceAll(trimmedOld, trimmedNew);
          parts[6] = encodeURIComponent(replacedDecoded);
          rowChanged = true;
        }
      }

      if (rowChanged) {
        modifiedCount++;
      }

      return parts.join(";");
    });

    const newContent = updatedLines.join("\n");

    if (token) {
      console.log("Uploading renamed results.csv to Vercel Blob storage...");
      await put("results.csv", newContent, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        token,
        contentType: "text/csv",
      });
      return res.json({
        success: true,
        modifiedCount,
        message: `Erfolgreich ${modifiedCount} Eintrags-Zeilen von "${trimmedOld}" zu "${trimmedNew}" umbenannt!`
      });
    } else {
      const localPath = path.join(process.cwd(), "results.csv");
      fs.writeFileSync(localPath, newContent, "utf-8");
      return res.json({
        success: true,
        modifiedCount,
        message: `Erfolgreich ${modifiedCount} Eintrags-Zeilen lokal von "${trimmedOld}" zu "${trimmedNew}" umbenannt!`
      });
    }
  } catch (error: any) {
    console.error("Error in rename handler:", error);
    return res.status(500).json({ error: error.message || "Fehler beim Umbenennen in den Rekorden." });
  }
}

async function handleAssignToAccount(req: VercelRequest, res: VercelResponse) {
  try {
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
    const existingUserMetadata = targetUser.user_metadata || {};
    const existingGameData = Array.isArray(existingUserMetadata.gameData) ? existingUserMetadata.gameData : [];

    let newEntries: any[] = [];
    let updatedCsv = "";

    if (reqEntries && Array.isArray(reqEntries)) {
      newEntries = reqEntries;
    } else if (csvName) {
      // Fetch CSV content
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      let existingContent = "";

      if (token) {
        try {
          const listResult = await list({ token });
          const resultsBlob = listResult.blobs.find(b => b.pathname === "results.csv");
          if (resultsBlob) {
            const fetchRes = await fetch(resultsBlob.url);
            if (fetchRes.ok) existingContent = await fetchRes.text();
          }
        } catch (e) {
          console.error("Error reading CSV from blob:", e);
        }
      } else {
        const localPath = path.join(process.cwd(), "results.csv");
        if (fs.existsSync(localPath)) {
          existingContent = fs.readFileSync(localPath, "utf-8");
        }
      }

      if (!existingContent.trim()) {
        return res.status(400).json({ error: "Keine CSV-Daten vorhanden." });
      }

      const lines = existingContent.split(/\r?\n/).filter(line => line.trim() !== "");
      const header = lines[0];
      const dataLines = lines.slice(1);

      const targetCsvName = csvName.trim().toLowerCase();
      const matchedRows: string[][] = [];
      const remainingLines: string[] = [header];

      dataLines.forEach(line => {
        const parts = line.split(";");
        const rowName = parts[2] ? parts[2].trim().toLowerCase() : "";
        if (rowName === targetCsvName) {
          matchedRows.push(parts);
        } else {
          remainingLines.push(line);
        }
      });

      if (matchedRows.length === 0) {
        return res.status(404).json({ error: `Keine Einträge für "${csvName}" in der CSV gefunden.` });
      }

      newEntries = matchedRows.map(parts => ({
        date: parts[0] || '',
        gameMode: parts[1] || '',
        avg: parts[3] ? Number(parts[3]) : 0,
        schnaepse: parts[4] ? Number(parts[4]) : 0,
        levels: parts[5] && !isNaN(Number(parts[5])) ? Number(parts[5]) : undefined,
        achievements: parts[6] || parts[5] || '',
      }));

      updatedCsv = remainingLines.join("\n");

      // Write updated CSV (without matched rows) back to storage
      if (token) {
        await put("results.csv", updatedCsv, {
          access: "public",
          addRandomSuffix: false,
          allowOverwrite: true,
          token,
          contentType: "text/csv",
        });
      } else {
        const localPath = path.join(process.cwd(), "results.csv");
        fs.writeFileSync(localPath, updatedCsv, "utf-8");
      }
    }

    // Update target user user_metadata in Supabase
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      user_metadata: {
        ...existingUserMetadata,
        gameData: [...existingGameData, ...newEntries]
      }
    });

    if (updateErr) {
      return res.status(500).json({ error: updateErr.message || 'Fehler beim Speichern der Spieldaten im Account.' });
    }

    return res.status(200).json({
      success: true,
      message: `${newEntries.length} Einträge erfolgreich ${targetUsername} zugeordnet.`
    });

  } catch (err: any) {
    console.error("Error in assign-to-account handler:", err);
    return res.status(500).json({ error: err.message || "Serverfehler" });
  }
}

async function handleMigrateToSQL(req: VercelRequest, res: VercelResponse) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN fehlt' });

    // 1. CSV aus Blob laden
    const { blobs } = await list({ prefix: 'results', token });
    const resultsBlob = blobs.find(b => b.pathname === 'results.csv');
    if (!resultsBlob) {
      return res.status(404).json({ error: 'results.csv nicht gefunden im Blob Storage' });
    }

    const csvResponse = await fetch(resultsBlob.url);
    const csvText = await csvResponse.text();
    const csvRows = csvText.trim().split('\n').map(r => r.split(';'));

    // Header-Zeile überspringen
    const dataRows = csvRows.filter(row =>
      row.length >= 5 &&
      row[0] !== 'Datum' &&
      row[2] !== 'Name' &&
      row[2]?.trim() !== ''
    );

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
  token: string
): Promise<{ filename: string; content: string } | null> {
  try {
    const filename = getSafeFilename(tournamentName);
    const safeName = getSafeTournamentName(tournamentName);

    const listResult = await list({ prefix: `tournament_${safeName}`, token });
    const blob = listResult.blobs.find(
      b => b.pathname === filename || b.pathname.endsWith("/" + filename)
    );

    if (!blob) return null;

    const fetchRes = await fetch(blob.url);
    if (!fetchRes.ok) return null;
    const content = await fetchRes.text();
    return { filename, content };
  } catch (err) {
    console.error("loadTournamentCsv error:", err);
    return null;
  }
}

async function saveTournamentCsv(
  tournamentName: string,
  csvContent: string,
  token: string
): Promise<boolean> {
  try {
    const filename = getSafeFilename(tournamentName);
    await put(filename, csvContent, {
      access: "public",
      token,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "text/csv"
    });
    return true;
  } catch (err) {
    console.error("saveTournamentCsv error:", err);
    return false;
  }
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
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const query = getRequestQuery(req);

  if (query.healthcheck === 'true') {
    return res.status(200).json({
      token: token ? 'vorhanden' : 'fehlt',
      tokenPrefix: token ? token.substring(0, 20) + '...' : null
    });
  }

  if (!token) {
    return res.status(500).json({
      error: 'BLOB_READ_WRITE_TOKEN ist nicht konfiguriert. Bitte in den Vercel Environment Variables setzen.'
    });
  }

  try {
    const tournaments: Array<{
      filename: string;
      name: string;
      tablesCount: number;
      finalistsCount: number;
      hasSecondChance: boolean;
      status: string;
      createdDate: string;
    }> = [];

    const listResult = await list({ prefix: "tournament_", token });
    const tourneyBlobs = listResult.blobs.filter(
      b => (b.pathname.startsWith("tournament_") || b.pathname.includes("/tournament_")) && b.pathname.endsWith(".csv")
    );

    for (const blob of tourneyBlobs) {
      try {
        const fetchRes = await fetch(blob.url);
        if (fetchRes.ok) {
          const text = await fetchRes.text();
          const meta = parseTournamentMeta(blob.pathname, text);
          if (meta) tournaments.push(meta);
        }
      } catch (e) {
        console.error(`Error reading blob ${blob.pathname}:`, e);
      }
    }

    return res.json({ tournaments });
  } catch (error: any) {
    console.error("Error in tournament list handler:", error);
    return res.status(500).json({ error: error.message || "Fehler beim Laden der Turnierliste." });
  }
}

async function handleTournamentGet(req: VercelRequest, res: VercelResponse) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return res.status(500).json({
      error: "BLOB_READ_WRITE_TOKEN ist nicht konfiguriert. Bitte in den Vercel Environment Variables setzen."
    });
  }

  const query = getRequestQuery(req);
  let { name, filename } = query;
  if (!name && !filename) {
    return res.status(400).json({ error: "Missing parameter 'name' or 'filename'." });
  }

  const targetName = String(name || filename);

  try {
    const loaded = await loadTournamentCsv(targetName, token);

    if (!loaded || !loaded.content) {
      const safeFn = getSafeFilename(targetName);
      return res.status(404).json({ error: `Turnier-Datei '${safeFn}' nicht gefunden.` });
    }

    const parsed = parseTournamentCSV(loaded.filename, loaded.content);
    return res.json(parsed);
  } catch (error: any) {
    console.error("Error in tournament get handler:", error);
    return res.status(500).json({ error: error.message || "Fehler beim Laden des Turniers." });
  }
}

async function handleTournamentSave(req: VercelRequest, res: VercelResponse) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return res.status(500).json({
      error: "BLOB_READ_WRITE_TOKEN ist nicht konfiguriert. Bitte in den Vercel Environment Variables setzen."
    });
  }

  const body = getRequestBody(req);
  const { action, name, tablesCount, finalistsCount, hasSecondChance, tableId, results, date } = body;

  if (!name) {
    return res.status(400).json({ error: "Missing required parameter 'name'." });
  }

  const filename = getSafeFilename(name);

  try {
    const loaded = await loadTournamentCsv(name, token);
    const existingContent = loaded ? loaded.content : "";

    let csvContent = "";

    if (action === "create" || !existingContent) {
      const tCount = parseInt(tablesCount) || 1;
      const qVorrunde = parseInt(body.qualifikationVorrunde) || 1;
      const qSecondChance = parseInt(body.qualifikationSecondChance) || 1;
      const secondChance = Boolean(hasSecondChance);
      const fCount = tCount * qVorrunde + (secondChance ? qSecondChance : 0);
      const today = date || new Date().toLocaleDateString("de-DE");

      const lines: string[] = [];
      lines.push("TYPE;KEY;VAL1;VAL2;VAL3;VAL4;VAL5");
      lines.push(`CONFIG;${name};${tCount};${fCount};${secondChance};In Vorbereitung;${today}`);
      lines.push(`QualifikationVorrunde;${qVorrunde}`);
      if (secondChance) {
        lines.push(`QualifikationSecondChance;${qSecondChance}`);
      }

      for (let i = 1; i <= tCount; i++) {
        const color = TOURNAMENT_TABLE_COLORS[(i - 1) % TOURNAMENT_TABLE_COLORS.length];
        lines.push(`TABLE;table_${i};Tisch ${i};Offen;;;[];${color}`);
      }

      if (secondChance) {
        lines.push(`TABLE;table_second_chance;Second Chance Tisch;Gesperrt;;;[];#F59E0B`);
      }

      lines.push(`TABLE;table_final;Finaltisch;Gesperrt;;;[];#D4AF37`);

      csvContent = lines.join("\n");
    } else {
      const tournament = parseTournamentCSV(filename, existingContent);
      const config = tournament.config;
      const tables = tournament.tables;
      const existingResults = tournament.results;
      const existingOutPlayers = tournament.outPlayers || [];

      if (action === "updateParticipantsAndTables" && Array.isArray(body.tables)) {
        body.tables.forEach((updatedT: any) => {
          const targetTable = tables.find(t => t.id === updatedT.id);
          if (targetTable) {
            if (updatedT.name) targetTable.name = updatedT.name;
            if (Array.isArray(updatedT.players)) targetTable.players = updatedT.players;
            if (updatedT.color) targetTable.color = updatedT.color;
          }
        });

        const qVorrunde = config.qualifikationVorrunde || 1;
        const qSecondChance = config.qualifikationSecondChance || 1;

        const lines: string[] = [];
        lines.push("TYPE;KEY;VAL1;VAL2;VAL3;VAL4;VAL5");
        lines.push(`CONFIG;${config.name};${config.tablesCount};${config.finalistsCount};${config.hasSecondChance};${config.status};${config.createdDate}`);
        lines.push(`QualifikationVorrunde;${qVorrunde}`);
        if (config.hasSecondChance) {
          lines.push(`QualifikationSecondChance;${qSecondChance}`);
        }

        tables.forEach((t, idx) => {
          const playersJson = encodeURIComponent(JSON.stringify(t.players || []));
          const tColor = t.color || (
            t.id === "table_second_chance" ? "#F59E0B" :
            t.id === "table_final" ? "#D4AF37" :
            TOURNAMENT_TABLE_COLORS[idx % TOURNAMENT_TABLE_COLORS.length]
          );
          lines.push(`TABLE;${t.id};${t.name};${t.status};${t.winner || ""};${t.secondPlace || ""};${playersJson};${tColor}`);
        });

        existingResults.forEach(r => {
          lines.push(`RESULT;${r.tableId};${r.playerName};${r.rank};${r.avg};${r.schnaepse};${r.date}`);
        });

        existingOutPlayers.forEach(op => {
          const displayT = op.tableId === "table_second_chance" ? "SecondChance" : op.tableId;
          lines.push(`Ausgeschieden;${displayT};${op.playerName}`);
        });

        csvContent = lines.join("\n");
      } else if (action === "saveTableResult" && tableId && Array.isArray(results)) {
        const resultDate = date || new Date().toLocaleDateString("de-DE");
        
        const targetTable = tables.find(t => t.id === tableId || (tableId === "SecondChance" && t.id === "table_second_chance") || (tableId === "Final" && t.id === "table_final"));
        if (targetTable) {
          targetTable.status = "Abgeschlossen";
          
          const sorted = [...results].sort((a, b) => (a.rank || 0) - (b.rank || 0));
          if (sorted.length > 0) targetTable.winner = sorted[0].name;
          if (sorted.length > 1) targetTable.secondPlace = sorted[1].name;
          targetTable.players = sorted.map(r => r.name);
          
          const filteredResults = existingResults.filter(r => r.tableId !== targetTable.id);
          sorted.forEach(r => {
            filteredResults.push({
              tableId: targetTable.id,
              playerName: r.name,
              rank: r.rank,
              avg: r.avg,
              schnaepse: r.schnaepse,
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
              const vtResults = filteredResults.filter(r => r.tableId === vt.id).sort((a, b) => a.rank - b.rank);
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
                const scResults = filteredResults.filter(r => r.tableId === secondChanceTable.id).sort((a, b) => a.rank - b.rank);
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

          if (targetTable.id === "table_final" && targetTable.status === "Abgeschlossen") {
            config.status = "Beendet";
          }

          config.finalistsCount = config.tablesCount * qVorrunde + (config.hasSecondChance ? qSecondChance : 0);

          const lines: string[] = [];
          lines.push("TYPE;KEY;VAL1;VAL2;VAL3;VAL4;VAL5");
          lines.push(`CONFIG;${config.name};${config.tablesCount};${config.finalistsCount};${config.hasSecondChance};${config.status};${config.createdDate}`);
          lines.push(`QualifikationVorrunde;${qVorrunde}`);
          if (config.hasSecondChance) {
            lines.push(`QualifikationSecondChance;${qSecondChance}`);
          }

          tables.forEach((t, idx) => {
            const playersJson = encodeURIComponent(JSON.stringify(t.players || []));
            const tColor = t.color || (
              t.id === "table_second_chance" ? "#F59E0B" :
              t.id === "table_final" ? "#D4AF37" :
              TOURNAMENT_TABLE_COLORS[idx % TOURNAMENT_TABLE_COLORS.length]
            );
            lines.push(`TABLE;${t.id};${t.name};${t.status};${t.winner || ""};${t.secondPlace || ""};${playersJson};${tColor}`);
          });

          filteredResults.forEach(r => {
            lines.push(`RESULT;${r.tableId};${r.playerName};${r.rank};${r.avg};${r.schnaepse};${r.date}`);
          });

          updatedOutPlayers.forEach(op => {
            const displayT = op.tableId === "table_second_chance" ? "SecondChance" : op.tableId;
            lines.push(`Ausgeschieden;${displayT};${op.playerName}`);
          });

          csvContent = lines.join("\n");
        }
      }
    }

    if (!csvContent) {
      return res.status(400).json({ error: "Keine Daten zum Speichern vorhanden." });
    }

    const saved = await saveTournamentCsv(name, csvContent, token);
    if (!saved) {
      return res.status(500).json({ error: "Speichern der Turnier-CSV fehlgeschlagen." });
    }

    return res.json({ success: true, message: `Turnier '${name}' erfolgreich gespeichert.` });
  } catch (error: any) {
    console.error("Error in tournament save handler:", error);
    return res.status(500).json({ error: error.message || "Fehler beim Speichern des Turniers." });
  }
}

async function handleTournamentDelete(req: VercelRequest, res: VercelResponse) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return res.status(500).json({
      error: 'BLOB_READ_WRITE_TOKEN ist nicht konfiguriert. Bitte in den Vercel Environment Variables setzen.'
    });
  }

  const body = getRequestBody(req);
  const { name, tournamentName } = body;
  const targetName = name || tournamentName;

  if (!targetName) {
    return res.status(400).json({ error: "Missing required parameter 'name' or 'tournamentName'." });
  }

  const filename = getSafeFilename(targetName);
  const safeName = getSafeTournamentName(targetName);

  try {
    const listResult = await list({ prefix: `tournament_${safeName}`, token });
    const blob = listResult.blobs.find(b => b.pathname === filename || b.pathname.endsWith("/" + filename));
    if (blob) {
      await del(blob.url, { token });
      return res.json({ success: true, message: `Turnier '${targetName}' erfolgreich gelöscht.` });
    } else {
      return res.status(404).json({ error: `Turnier '${targetName}' nicht gefunden.` });
    }
  } catch (error: any) {
    console.error("Error in tournament delete handler:", error);
    return res.status(500).json({ error: error.message || "Fehler beim Löschen des Turniers." });
  }
}

async function handleTournamentMigrateToCSV(req: VercelRequest, res: VercelResponse) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN fehlt' });

    const body = getRequestBody(req);
    const { tournamentName } = body || {};
    if (!tournamentName) return res.status(400).json({ error: 'tournamentName erforderlich' });

    // Nur das ausgewählte Turnier laden
    const safeName = tournamentName.replace(/[^a-zA-Z0-9äöüÄÖÜß\-_]/g, '_');
    const { blobs } = await list({ prefix: `tournament_${safeName}`, token });
    const blob = blobs.find(b => b.pathname.includes(safeName));

    if (!blob) {
      return res.status(404).json({ error: `Turnier "${tournamentName}" nicht gefunden` });
    }

    // 2. Bestehende results.csv laden
    const { blobs: resultBlobs } = await list({ prefix: 'results', token });
    const resultsBlob = resultBlobs.find(b => b.pathname === 'results.csv');
    let existingCsv = 'Datum;Modus;Name;Avg;Schnaepse\n';
    if (resultsBlob) {
      const r = await fetch(resultsBlob.url);
      existingCsv = await r.text();
    }

    // Bereits vorhandene Einträge als Set
    const existingLines = new Set(existingCsv.trim().split('\n').slice(1));

    let migrated = 0;
    let skipped = 0;
    const newLines: string[] = [];

    // 3. Turnier-CSV verarbeiten
    const tournamentRes = await fetch(blob.url);
    const tournamentCsv = await tournamentRes.text();
    const tournamentRows = tournamentCsv.trim().split('\n');

    // Ergebnis-Zeilen aus Turnier-CSV extrahieren
    const ergebnisRows = tournamentRows.filter(r => r.startsWith('Ergebnis;'));

    for (const row of ergebnisRows) {
      const parts = row.split(';');
      if (parts.length < 7) continue;

      const tischId = parts[1];
      const datum = parts[2];
      const spielername = parts[3];
      const avg = parts[4];
      const schnaepse = parts[5];

      // Turniermodus bestimmen
      const tName = blob.pathname
        .replace('tournament_', '')
        .replace('.csv', '');
      const gameMode = tischId === 'Final'
        ? `Turnier Finale (${tName})`
        : tischId === 'SecondChance'
          ? `Turnier Second Chance (${tName})`
          : `Turnier Vorrunde Tisch ${tischId} (${tName})`;

      // CSV-Zeile im results.csv Format
      const newLine = `${datum};${gameMode};${spielername};${avg};${schnaepse}`;

      if (existingLines.has(newLine)) {
        skipped++;
        continue;
      }

      newLines.push(newLine);
      existingLines.add(newLine);
      migrated++;
    }

    // 4. Neue Zeilen zur results.csv hinzufügen
    if (newLines.length > 0) {
      const updatedCsv = existingCsv.trimEnd() + '\n' + newLines.join('\n') + '\n';
      await put('results.csv', updatedCsv, {
        access: 'public',
        token,
        addRandomSuffix: false
      });
    }

    return res.status(200).json({
      message: `${migrated} Ergebnisse aus "${tournamentName}" übertragen, ${skipped} Duplikate übersprungen`,
      migrated,
      skipped
    });

  } catch (err: any) {
    console.error('tournament migrate error:', err);
    return res.status(500).json({ error: err.message });
  }
}

async function handleSaveCsv(req: VercelRequest, res: VercelResponse) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return res.status(500).json({ error: 'Token fehlt' });

    const body = getRequestBody(req);
    const { rows } = body || {};
    if (!rows || !Array.isArray(rows)) {
      return res.status(400).json({ error: 'rows erforderlich' });
    }

    // CSV neu zusammenbauen
    const header = 'Datum;Modus;Name;Avg;Schnaepse\n';
    const dataRows = rows
      .filter((row: string[]) => row.length >= 5 && row[0] !== 'Datum')
      .map((row: string[]) => row.slice(0, 6).join(';'))
      .join('\n');

    const updatedCsv = header + dataRows + '\n';

    await put('results.csv', updatedCsv, {
      access: 'public',
      token,
      addRandomSuffix: false
    });

    return res.status(200).json({ message: 'CSV erfolgreich gespeichert' });
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

    // Backup als JSON in Blob speichern
    const backupData = {
      timestamp: new Date().toISOString(),
      profiles: allProfiles || [],
      game_results: allGameResults || [],
      achievements: allAchievements || [],
      friendships: allFriendships || [],
      auth_users_count: allAuthUsers.length
    };

    const backupFilename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    if (token) {
      await put(`backups/${backupFilename}`, JSON.stringify(backupData, null, 2), {
        access: 'public',
        token,
        addRandomSuffix: false
      });
      fixes.push(`💾 Backup erstellt: backups/${backupFilename}`);
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

    // Verwaiste game_results → in separaten Blob sichern statt löschen
    const orphanResults = (freshResults || []).filter((r: any) => !authUserMap[r.user_id]);
    if (orphanResults.length > 0) {
      if (token) {
        const orphanBackup = `orphan_results_${Date.now()}.json`;
        await put(`backups/${orphanBackup}`, JSON.stringify(orphanResults, null, 2), {
          access: 'public', token, addRandomSuffix: false
        });
        fixes.push(`💾 ${orphanResults.length} verwaiste game_results in ${orphanBackup} gesichert (nicht gelöscht)`);
      }
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
      // Duplikate zuerst sichern
      if (token) {
        await put(`backups/duplicate_achievements_${Date.now()}.json`,
          JSON.stringify(duplicatesToDelete, null, 2),
          { access: 'public', token, addRandomSuffix: false }
        );
      }
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
      if (token) {
        await put(`backups/invalid_achievements_${Date.now()}.json`,
          JSON.stringify(invalidAchs, null, 2),
          { access: 'public', token, addRandomSuffix: false }
        );
      }
      report.push(`⚠️ ${invalidAchs.length} Achievements ohne ID gefunden und gesichert`);
    } else {
      report.push('✅ Alle Achievements haben IDs');
    }

    // Verwaiste Achievements sichern
    const orphanAchs = (freshAchs || []).filter((a: any) => !authUserMap[a.user_id]);
    if (orphanAchs.length > 0) {
      if (token) {
        await put(`backups/orphan_achievements_${Date.now()}.json`,
          JSON.stringify(orphanAchs, null, 2),
          { access: 'public', token, addRandomSuffix: false }
        );
      }
      report.push(`⚠️ ${orphanAchs.length} verwaiste Achievements gesichert (nicht gelöscht)`);
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
      if (token) {
        await put(`backups/orphan_friendships_${Date.now()}.json`,
          JSON.stringify(orphanFriends, null, 2),
          { access: 'public', token, addRandomSuffix: false }
        );
      }
      report.push(`⚠️ ${orphanFriends.length} verwaiste Freundschaften gesichert (nicht gelöscht)`);
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
    report.push(`⚠️ Alle gesicherten Daten liegen in /backups/ im Blob Storage`);
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

