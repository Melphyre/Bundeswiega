import { Request, Response } from 'express';
import { list, put } from '@vercel/blob';
import { createClient } from '@supabase/supabase-js';

export default async function assignToAccountHandler(req: Request, res: Response) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { requesterUserId, csvName, targetUserId, entries: reqEntries } = req.body;
    if ((!csvName && !reqEntries) || !targetUserId) {
      return res.status(400).json({ error: 'targetUserId und (csvName oder entries) sind erforderlich.' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || '';
    if (!supabaseUrl || !supabaseSecretKey) {
      return res.status(500).json({ error: 'SUPABASE_SECRET_KEY / URL fehlt.' });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

    // Admin check if requesterUserId is provided
    if (requesterUserId) {
      const { data: { user: reqUser } } = await supabaseAdmin.auth.admin.getUserById(requesterUserId);
      if (reqUser) {
        const role = reqUser.user_metadata?.role;
        if (role !== 'admin') {
          return res.status(403).json({ error: 'Keine Admin-Rechte' });
        }
      }
    }

    // Fetch target user from Supabase
    const { data: { user: targetUser }, error: userErr } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
    if (userErr || !targetUser) {
      return res.status(404).json({ error: 'Ziel-Account nicht gefunden.' });
    }

    const targetUsername = targetUser.user_metadata?.username || targetUser.email || 'Benutzer';
    const existingUserMetadata = targetUser.user_metadata || {};
    const existingGameData = Array.isArray(existingUserMetadata.gameData) ? existingUserMetadata.gameData : [];

    let newEntries: any[] = [];
    let updatedCsv = "";

    if (reqEntries && Array.isArray(reqEntries)) {
      newEntries = reqEntries;
    } else if (csvName) {
      // Fetch CSV content
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

      newEntries = matchedRows.map(parts => ({
        date: parts[0] || '',
        gameMode: parts[1] || '',
        avg: parts[3] ? Number(parts[3]) : 0,
        schnaepse: parts[4] ? Number(parts[4]) : 0,
        levels: parts[5] && !isNaN(Number(parts[5])) ? Number(parts[5]) : undefined,
        achievements: parts[6] || parts[5] || '',
      }));

      updatedCsv = remainingLines.join("\n");

      // Write updated CSV (without matched rows) back to storage
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
    }

    // Update target user user_metadata in Supabase
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      user_metadata: {
        ...existingUserMetadata,
        gameData: [...existingGameData, ...newEntries]
      }
    });

    if (updateErr) {
      return res.status(500).json({ error: updateErr.message || 'Fehler beim Speichern der Spieldaten im Account.' });
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
