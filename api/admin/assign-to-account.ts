import { Request, Response } from 'express';
import { list, put } from '@vercel/blob';

export default async function assignToAccountHandler(req: Request, res: Response) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { requesterUserId, csvName, targetUserId } = req.body;
    if (!csvName || !targetUserId) {
      return res.status(400).json({ error: 'csvName und targetUserId sind erforderlich.' });
    }

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      return res.status(500).json({ error: 'CLERK_SECRET_KEY fehlt in den Umgebungsvariablen.' });
    }

    // Admin check if requesterUserId is provided
    if (requesterUserId) {
      const reqUserRes = await fetch(`https://api.clerk.com/v1/users/${requesterUserId}`, {
        headers: { Authorization: `Bearer ${secretKey}` }
      });
      if (reqUserRes.ok) {
        const reqUserData = await reqUserRes.json();
        const role = reqUserData.public_metadata?.role;
        if (role !== 'admin') {
          return res.status(403).json({ error: 'Keine Admin-Rechte' });
        }
      }
    }

    // 1. Fetch CSV content
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    let existingContent = "";

    if (token) {
      try {
        const listResult = await list({ token });
        const resultsBlob = listResult.blobs.find(b => b.pathname === "results.csv");
        if (resultsBlob) {
          const fetchRes = await fetch(resultsBlob.url);
          if (fetchRes.ok) existingContent = await fetchRes.text();
        }
      } catch (e) {
        console.error("Error reading CSV from blob:", e);
      }
    } else {
      const path = await import("path");
      const fs = await import("fs");
      const localPath = path.join(process.cwd(), "results.csv");
      if (fs.existsSync(localPath)) {
        existingContent = fs.readFileSync(localPath, "utf-8");
      }
    }

    if (!existingContent.trim()) {
      return res.status(400).json({ error: "Keine CSV-Daten vorhanden." });
    }

    const lines = existingContent.split(/\r?\n/).filter(line => line.trim() !== "");
    const header = lines[0];
    const dataLines = lines.slice(1);

    const targetCsvName = csvName.trim().toLowerCase();
    const matchedRows: string[][] = [];
    const remainingLines: string[] = [header];

    dataLines.forEach(line => {
      const parts = line.split(";");
      const rowName = parts[2] ? parts[2].trim().toLowerCase() : "";
      if (rowName === targetCsvName) {
        matchedRows.push(parts);
      } else {
        remainingLines.push(line);
      }
    });

    if (matchedRows.length === 0) {
      return res.status(404).json({ error: `Keine Einträge für "${csvName}" in der CSV gefunden.` });
    }

    // 2. Fetch target user from Clerk
    const targetUserRes = await fetch(`https://api.clerk.com/v1/users/${targetUserId}`, {
      headers: { Authorization: `Bearer ${secretKey}` }
    });
    if (!targetUserRes.ok) {
      return res.status(404).json({ error: 'Ziel-Account nicht gefunden.' });
    }
    const targetUserData = await targetUserRes.json();
    const targetUsername = targetUserData.first_name
      ? `${targetUserData.first_name} ${targetUserData.last_name || ''}`.trim()
      : targetUserData.username || 'Benutzer';

    const existingPublicMetadata = targetUserData.public_metadata || {};
    const existingGameData = Array.isArray(existingPublicMetadata.gameData) ? existingPublicMetadata.gameData : [];

    const newEntries = matchedRows.map(parts => ({
      date: parts[0] || '',
      gameMode: parts[1] || '',
      avg: parts[3] ? Number(parts[3]) : 0,
      schnaepse: parts[4] ? Number(parts[4]) : 0,
      levels: parts[5] && !isNaN(Number(parts[5])) ? Number(parts[5]) : undefined,
      achievements: parts[6] || parts[5] || '',
    }));

    // 3. Update target user publicMetadata in Clerk
    const updatedMetadata = {
      ...existingPublicMetadata,
      gameData: [...existingGameData, ...newEntries]
    };

    const patchRes = await fetch(`https://api.clerk.com/v1/users/${targetUserId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ public_metadata: updatedMetadata }),
    });

    if (!patchRes.ok) {
      return res.status(500).json({ error: 'Fehler beim Speichern der Spieldaten im Clerk-Account.' });
    }

    // 4. Write updated CSV (without matched rows) back to storage
    const updatedCsv = remainingLines.join("\n");
    if (token) {
      await put("results.csv", updatedCsv, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        token,
        contentType: "text/csv",
      });
    } else {
      const path = await import("path");
      const fs = await import("fs");
      const localPath = path.join(process.cwd(), "results.csv");
      fs.writeFileSync(localPath, updatedCsv, "utf-8");
    }

    return res.status(200).json({
      success: true,
      message: `${newEntries.length} Einträge erfolgreich ${targetUsername} zugeordnet.`
    });

  } catch (err: any) {
    console.error("Error in assign-to-account handler:", err);
    return res.status(500).json({ error: err.message || "Serverfehler" });
  }
}
