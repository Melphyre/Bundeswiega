import { Request, Response } from 'express';

export default async function saveResultHandler(req: Request, res: Response) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId, result } = req.body;
    if (!userId || !result) {
      return res.status(400).json({ error: 'userId und result erforderlich' });
    }

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      return res.status(500).json({ error: 'CLERK_SECRET_KEY fehlt in den Environment Variables' });
    }

    // Fetch existing user metadata
    const userRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!userRes.ok) {
      const errText = await userRes.text().catch(() => '');
      return res.status(userRes.status).json({ error: `User request failed (${userRes.status}): ${errText}` });
    }

    const userData = await userRes.json();
    const existingMetadata = userData.public_metadata || {};
    const existingGameData = Array.isArray(existingMetadata.gameData) ? existingMetadata.gameData : [];

    const updatedMetadata = {
      ...existingMetadata,
      gameData: [...existingGameData, result],
    };

    // Update public_metadata via Clerk REST API
    const updateRes = await fetch(`https://api.clerk.com/v1/users/${userId}/metadata`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_metadata: updatedMetadata,
      }),
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text().catch(() => '');
      return res.status(updateRes.status).json({ error: `Update metadata failed (${updateRes.status}): ${errText}` });
    }

    return res.status(200).json({ message: 'Ergebnis gespeichert' });
  } catch (err: any) {
    console.error('save-result error:', err);
    return res.status(500).json({ error: err.message || 'Fehler beim Speichern' });
  }
}
