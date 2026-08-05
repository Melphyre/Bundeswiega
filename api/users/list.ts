import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export default async function usersListHandler(req: Request, res: Response) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', users: [] });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || '';
  if (!supabaseUrl || !supabaseSecretKey || supabaseUrl.includes('placeholder') || supabaseSecretKey.includes('placeholder')) {
    return res.status(200).json({ users: [] });
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error || !data?.users) {
      return res.status(200).json({ users: [] });
    }

    const userList = data.users.map((u: any) => ({
      id: u.id,
      name: u.user_metadata?.username || u.email || 'Unbekannt',
      email: u.email || '',
      username: u.user_metadata?.username || '',
      imageUrl: u.user_metadata?.avatar_url || ''
    }));

    return res.status(200).json({ users: userList });
  } catch (err: any) {
    return res.status(200).json({ users: [] });
  }
}
