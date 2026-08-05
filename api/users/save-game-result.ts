import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export default async function saveGameResultHandler(req: Request, res: Response) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId, gameResult, achievements: achievementsList } = req.body;

    if (!userId || !gameResult) {
      return res.status(400).json({ error: 'userId und gameResult erforderlich' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || '';
    if (!supabaseUrl || !supabaseSecretKey || supabaseUrl.includes('placeholder') || supabaseSecretKey.includes('placeholder')) {
      return res.status(500).json({ error: 'Supabase nicht konfiguriert oder SUPABASE_SECRET_KEY fehlt' });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

    // Ergebnis speichern mit Admin-Client (umgeht RLS)
    const { error: resultError } = await supabaseAdmin
      .from('game_results')
      .insert({
        user_id: userId,
        game_mode: gameResult.game_mode,
        date: gameResult.date,
        avg: gameResult.avg,
        schnaepse: gameResult.schnaepse,
        total: gameResult.total,
        levels: gameResult.levels || null,
        time_seconds: gameResult.time_seconds || null,
        team_name: gameResult.team_name || null
      });

    if (resultError) {
      console.error('game_results insert error:', resultError);
      return res.status(500).json({ error: resultError.message });
    }

    // Achievements speichern
    if (achievementsList && achievementsList.length > 0) {
      for (const ach of achievementsList) {
        const { error: achError } = await supabaseAdmin
          .from('achievements')
          .insert({
            user_id: userId,
            achievement_id: ach.id,
            title: ach.title,
            description: ach.description || '',
            icon: ach.icon || '',
            rarity: ach.rarity,
            game_mode: gameResult.game_mode,
            earned_with: ach.earnedBy || [],
            earned_together: ach.earnedTogether || false,
            date: gameResult.date
          });
        if (achError) console.error('achievement insert error:', achError);
      }
    }

    return res.status(200).json({ message: 'Ergebnis erfolgreich gespeichert' });
  } catch (err: any) {
    console.error('save-game-result error:', err);
    return res.status(500).json({ error: err.message || 'Fehler beim Speichern' });
  }
}
