import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export default async function migrateToSqlHandler(req: Request, res: Response) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { rows, users } = req.body;

    if (!rows || !users) {
      return res.status(400).json({ error: 'rows und users erforderlich' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || '';
    if (!supabaseUrl || !supabaseSecretKey || supabaseUrl.includes('placeholder') || supabaseSecretKey.includes('placeholder')) {
      return res.status(500).json({ error: 'Supabase nicht konfiguriert oder SUPABASE_SECRET_KEY fehlt' });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    for (const row of rows) {
      const [date, gameMode, playerName, avg, schnaepse, total, achievementsJson] = row;

      if (!playerName || playerName === 'Name') { skipped++; continue; }

      // Account mit diesem Namen suchen
      const matchedUser = users.find((u: any) =>
        u.name?.toLowerCase().trim() === playerName?.toLowerCase().trim()
      );

      if (!matchedUser) { skipped++; continue; }

      // Ergebnis einfügen (INSERT ohne upsert um Duplikate durch Datum zu vermeiden)
      const { error: resultError } = await supabaseAdmin
        .from('game_results')
        .insert({
          user_id: matchedUser.id,
          game_mode: gameMode,
          date: date,
          avg: parseFloat(avg) || 0,
          schnaepse: parseInt(schnaepse) || 0,
          total: parseFloat(total) || 0
        });

      if (resultError) {
        // Duplikat ignorieren
        if (resultError.code === '23505') { skipped++; continue; }
        errors++;
        errorDetails.push(`${playerName}/${date}: ${resultError.message}`);
        continue;
      }

      // Achievements migrieren
      if (achievementsJson && achievementsJson.trim()) {
        try {
          const achievementsList = JSON.parse(achievementsJson);
          for (const ach of achievementsList) {
            if (!ach.earnedBy?.includes(playerName)) continue;
            await supabaseAdmin.from('achievements').insert({
              user_id: matchedUser.id,
              achievement_id: ach.id,
              title: ach.title || '',
              icon: ach.icon || '',
              rarity: ach.rarity || 'common',
              game_mode: gameMode,
              earned_with: ach.earnedBy || [],
              earned_together: ach.earnedTogether || false,
              date: date
            });
          }
        } catch (parseErr) {
          console.error('Achievement parse error:', parseErr);
        }
      }
      migrated++;
    }

    return res.status(200).json({
      message: `${migrated} Einträge migriert, ${skipped} übersprungen, ${errors} Fehler`,
      migrated, skipped, errors,
      errorDetails: errorDetails.slice(0, 10)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Fehler bei Migration' });
  }
}
