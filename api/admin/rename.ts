import { put, list } from "@vercel/blob";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const { oldName, newName } = req.body;

  if (!oldName || !newName || typeof oldName !== "string" || typeof newName !== "string") {
    return res.status(400).json({ error: "Invalid parameters. Must include oldName and newName as strings." });
  }

  const trimmedOld = oldName.trim();
  const trimmedNew = newName.trim();

  if (!trimmedOld || !trimmedNew) {
    return res.status(400).json({ error: "oldName and newName cannot be empty." });
  }

  if (trimmedOld === trimmedNew) {
    return res.status(400).json({ error: "Der neue Name muss sich vom alten Namen unterscheiden." });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;

  try {
    let existingContent = "";

    if (token) {
      try {
        console.log("Fetching list of blobs from Vercel Blob storage for rename...");
        const listResult = await list({ token });
        const resultsBlob = listResult.blobs.find(b => b.pathname === "results.csv");
        if (resultsBlob) {
          const fetchRes = await fetch(resultsBlob.url);
          if (fetchRes.ok) {
            existingContent = await fetchRes.text();
          }
        }
      } catch (listErr) {
        console.error("Error reading results.csv for rename:", listErr);
      }
    } else {
      // Local development fallback
      const path = await import("path");
      const fs = await import("fs");
      const localPath = path.join(process.cwd(), "results.csv");
      if (fs.existsSync(localPath)) {
        existingContent = fs.readFileSync(localPath, "utf-8");
      }
    }

    if (!existingContent.trim()) {
      return res.status(400).json({ error: "Keine CSV-Daten gefunden zum Umbenennen." });
    }

    const lines = existingContent.split(/\r?\n/).filter(line => line.trim() !== "");
    let modifiedCount = 0;

    const updatedLines = lines.map((line, idx) => {
      if (idx === 0) return line; // Header row

      const parts = line.split(";");
      if (parts.length < 3) return line;

      let rowChanged = false;

      // Check Name column (index 2)
      if (parts[2] && parts[2].trim() === trimmedOld) {
        parts[2] = trimmedNew;
        rowChanged = true;
      }

      // Check Achievements JSON column (index 6)
      if (parts[6] && parts[6].trim()) {
        try {
          const decoded = decodeURIComponent(parts[6]);
          if (decoded.includes(trimmedOld)) {
            const achievementsObj = JSON.parse(decoded);
            if (Array.isArray(achievementsObj)) {
              achievementsObj.forEach((ach: any) => {
                if (ach.earnedBy && Array.isArray(ach.earnedBy)) {
                  ach.earnedBy = ach.earnedBy.map((name: string) => name === trimmedOld ? trimmedNew : name);
                }
              });
              parts[6] = encodeURIComponent(JSON.stringify(achievementsObj));
              rowChanged = true;
            }
          }
        } catch (e) {
          // If decoding/parsing fails, attempt simple string replace inside string
          const replacedDecoded = decodeURIComponent(parts[6]).replaceAll(trimmedOld, trimmedNew);
          parts[6] = encodeURIComponent(replacedDecoded);
          rowChanged = true;
        }
      }

      if (rowChanged) {
        modifiedCount++;
      }

      return parts.join(";");
    });

    const newContent = updatedLines.join("\n");

    if (token) {
      console.log("Uploading renamed results.csv to Vercel Blob storage...");
      await put("results.csv", newContent, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        token,
        contentType: "text/csv",
      });
      return res.json({
        success: true,
        modifiedCount,
        message: `Erfolgreich ${modifiedCount} Eintrags-Zeilen von "${trimmedOld}" zu "${trimmedNew}" umbenannt!`
      });
    } else {
      const path = await import("path");
      const fs = await import("fs");
      const localPath = path.join(process.cwd(), "results.csv");
      fs.writeFileSync(localPath, newContent, "utf-8");
      return res.json({
        success: true,
        modifiedCount,
        message: `Erfolgreich ${modifiedCount} Eintrags-Zeilen lokal von "${trimmedOld}" zu "${trimmedNew}" umbenannt!`
      });
    }
  } catch (error: any) {
    console.error("Error in rename handler:", error);
    return res.status(500).json({ error: error.message || "Fehler beim Umbenennen in den Rekorden." });
  }
}
