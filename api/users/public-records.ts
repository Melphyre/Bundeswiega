import { Request, Response } from 'express';

export default async function publicRecordsHandler(req: Request, res: Response) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      return res.status(200).json({ records: [] });
    }

    const response = await fetch('https://api.clerk.com/v1/users?limit=100', {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return res.status(200).json({ records: [] });
    }

    const data = await response.json();
    const usersList = Array.isArray(data) ? data : data?.data || [];

    const publicRecords: any[] = [];

    usersList.forEach((u: any) => {
      const meta = u.public_metadata || {};
      if (meta.showRecords !== false) {
        const gameData = Array.isArray(meta.gameData) ? meta.gameData : [];
        const name = u.first_name
          ? `${u.first_name} ${u.last_name || ''}`.trim()
          : u.username || u.email_addresses?.[0]?.email_address || 'Unbekannt';

        gameData.forEach((entry: any) => {
          publicRecords.push({
            date: entry.date || '',
            gameMode: entry.gameMode || 'Standardspiel',
            playerName: name,
            avg: entry.avg || 0,
            schnaepse: entry.schnaepse || 0,
            levels: entry.levels,
            achievements: entry.achievements || '',
            source: 'account'
          });
        });
      }
    });

    return res.status(200).json({ records: publicRecords });
  } catch (err: any) {
    console.error('Error fetching public records:', err);
    return res.status(500).json({ error: err.message || 'Serverfehler' });
  }
}
