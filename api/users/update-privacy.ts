import { Request, Response } from 'express';

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

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      return res.status(500).json({ error: 'CLERK_SECRET_KEY fehlt in den Umgebungsvariablen.' });
    }

    // Get current user metadata first
    const userRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    let currentPublicMetadata = {};
    if (userRes.ok) {
      const userData = await userRes.json();
      currentPublicMetadata = userData.public_metadata || {};
    }

    // Update public metadata
    const patchRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_metadata: {
          ...currentPublicMetadata,
          showRecords: showRecords !== false,
        },
      }),
    });

    if (!patchRes.ok) {
      const errJson = await patchRes.json().catch(() => ({}));
      return res.status(500).json({ error: errJson.errors?.[0]?.message || 'Fehler beim Aktualisieren der Datenschutzeinstellungen.' });
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Error in update-privacy handler:', err);
    return res.status(500).json({ error: err.message || 'Serverfehler' });
  }
}
