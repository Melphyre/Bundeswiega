import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export default async function saveResultHandler(req: Request, res: Response) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId, result } = req.body;
    if (!userId || !result) {
      return res.status(400).json({ error: 'userId und result erforderlich' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || '';
    if (!supabaseUrl || !supabaseSecretKey) {
      return res.status(500).json({ error: 'SUPABASE_SECRET_KEY / URL fehlt' });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);
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
