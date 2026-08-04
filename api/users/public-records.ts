import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export default async function publicRecordsHandler(req: Request, res: Response) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || '';
    if (!supabaseUrl || !supabaseSecretKey) {
      return res.status(200).json({ records: [] });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error || !users) {
      return res.status(200).json({ records: [] });
    }

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
    console.error('Error fetching public records:', err);
    return res.status(500).json({ error: err.message || 'Serverfehler' });
  }
}
