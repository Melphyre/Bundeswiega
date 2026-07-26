import { put, list } from "@vercel/blob";

export default async function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const { gameMode, results, date, achievements } = req.body;

  if (!gameMode || !results || !Array.isArray(results) || !date) {
    return res.status(400).json({ error: "Invalid request payload. Must include gameMode, results array, and date." });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;

  try {
    let existingContent = "";

    if (token) {
      try {
        console.log("Fetching list of blobs from Vercel Blob storage...");
        const listResult = await list({ token });
        const resultsBlob = listResult.blobs.find(b => b.pathname === "results.csv");
        if (resultsBlob) {
          console.log(`Fetching results.csv from URL: ${resultsBlob.url}`);
          const fetchRes = await fetch(resultsBlob.url);
          if (fetchRes.ok) {
            existingContent = await fetchRes.text();
          }
        }
      } catch (listErr) {
        console.error("Error finding or reading existing results.csv from Vercel Blob:", listErr);
      }
    } else {
      // Local development fallback
      const path = await import("path");
      const fs = await import("fs");
      const localPath = path.join(process.cwd(), "results.csv");
      console.log(`[Development Mode] Checking local file at: ${localPath}`);
      if (fs.existsSync(localPath)) {
        existingContent = fs.readFileSync(localPath, "utf-8");
      }
    }

    // Split existingContent into lines and clean
    let lines = existingContent ? existingContent.split(/\r?\n/) : [];
    // Filter out trailing empty rows
    lines = lines.filter(line => line.trim() !== "");

    // If empty or doesn't have the header, initialize header
    const header = "Datum;Modus;Name;Avg;Schnaepse;Levels;Achievements";
    if (lines.length === 0 || !lines[0].startsWith("Datum;Modus;Name")) {
      lines = [header];
    }

    // Append new records
    const TOGETHER_ACHIEVEMENT_IDS = ['twins', 'doppelganger', 'mirror_number', 'shadow', 'equilibrium'];

    results.forEach((item: { name: string; avg: number; schnaepse: number; levels?: number; achievements?: any[] }) => {
      const rawPlayerAch = item.achievements && item.achievements.length > 0
        ? item.achievements
        : (achievements && Array.isArray(achievements)
            ? achievements.filter((a: any) => a.earnedBy && Array.isArray(a.earnedBy) && a.earnedBy.includes(item.name))
            : []);

      const formattedAch = rawPlayerAch.map((a: any) => {
        const isTogether = typeof a.earnedTogether === 'boolean'
          ? a.earnedTogether
          : TOGETHER_ACHIEVEMENT_IDS.includes(a.id);

        const achObj: any = {
          id: a.id,
          title: a.title,
          icon: a.icon,
          rarity: a.rarity,
          earnedBy: Array.isArray(a.earnedBy) && a.earnedBy.length > 0 ? a.earnedBy : [item.name]
        };

        if (isTogether) {
          achObj.earnedTogether = true;
        }

        return achObj;
      });

      const achievementsStr = formattedAch.length > 0 ? encodeURIComponent(JSON.stringify(formattedAch)) : "";
      const levelsStr = item.levels !== undefined ? String(item.levels) : "";

      let line = `${date};${gameMode};${item.name};${item.avg};${item.schnaepse};${levelsStr};${achievementsStr}`;
      lines.push(line);
    });

    const newContent = lines.join("\n");

    if (token) {
      console.log("Uploading updated results.csv to Vercel Blob storage...");
      const blob = await put("results.csv", newContent, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        token,
        contentType: "text/csv",
      });
      console.log(`Successfully uploaded to Vercel Blob at URL: ${blob.url}`);
      return res.json({ success: true, message: "Ergebnisse wurden erfolgreich im verknüpften Storage (Vercel Blob) gespeichert!" });
    } else {
      // Local development fallback
      const path = await import("path");
      const fs = await import("fs");
      const localPath = path.join(process.cwd(), "results.csv");
      fs.writeFileSync(localPath, newContent, "utf-8");
      console.log("results.csv successfully written to local fallback storage.");
      return res.json({ success: true, message: "Ergebnisse wurden lokal unter results.csv gespeichert (Lokaler Entwicklungsmodus ohne Live-Token)." });
    }
  } catch (error: any) {
    console.error("Error in upload handler:", error);
    return res.status(500).json({ error: error.message || "Ein Fehler ist beim Verarbeiten oder Hochladen der Ergebnisse aufgetreten." });
  }
}
