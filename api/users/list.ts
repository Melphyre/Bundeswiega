import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export default async function usersListHandler(req: Request, res: Response) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', users: [] });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || '';
  if (!supabaseUrl || !supabaseSecretKey) {
    return res.status(500).json({
      error: 'VITE_SUPABASE_URL oder SUPABASE_SECRET_KEY fehlt.',
      users: []
    });
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;

    const userList = users.map((u: any) => ({
      id: u.id,
      name: u.user_metadata?.username || u.email || 'Unbekannt',
      email: u.email || '',
      username: u.user_metadata?.username || '',
      imageUrl: u.user_metadata?.avatar_url || ''
    }));

    return res.status(200).json({ users: userList });
  } catch (err: any) {
    console.error('Error fetching Supabase users:', err);
    return res.status(500).json({
      error: err.message || 'Fehler beim Laden der Nutzer',
      users: []
    });
  }
}
