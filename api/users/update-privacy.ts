import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export default async function updatePrivacyHandler(req: Request, res: Response) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, showRecords } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId ist erforderlich' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || '';
    if (!supabaseUrl || !supabaseSecretKey) {
      return res.status(500).json({ error: 'SUPABASE_SECRET_KEY / URL fehlt.' });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);
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
