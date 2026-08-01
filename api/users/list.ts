import { Request, Response } from 'express';

export default async function usersListHandler(req: Request, res: Response) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', users: [] });
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return res.status(500).json({
      error: 'CLERK_SECRET_KEY fehlt in den Environment Variables.',
      users: []
    });
  }

  try {
    const response = await fetch('https://api.clerk.com/v1/users?limit=100', {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return res.status(response.status).json({
        error: `Fehler beim Laden der Nutzer von Clerk (Status ${response.status}): ${errText}`,
        users: []
      });
    }

    const data = await response.json();
    const usersRaw = Array.isArray(data) ? data : (data?.data || []);

    const userList = usersRaw.map((u: any) => ({
      id: u.id,
      name: [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
        || u.username
        || u.email_addresses?.[0]?.email_address
        || 'Unbekannt',
      email: u.email_addresses?.[0]?.email_address || '',
      username: u.username || '',
      imageUrl: u.image_url || ''
    }));

    return res.status(200).json({ users: userList });
  } catch (err: any) {
    console.error('Error fetching Clerk users:', err);
    return res.status(500).json({
      error: err.message || 'Fehler beim Laden der Nutzer',
      users: []
    });
  }
}


