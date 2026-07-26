import { list } from "@vercel/blob";

export default async function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (req.query?.healthcheck === 'true') {
    return res.status(200).json({
      token: token ? 'vorhanden' : 'fehlt',
      tokenPrefix: token ? token.substring(0, 20) + '...' : null
    });
  }

  if (!token) {
    return res.status(500).json({
      error: 'BLOB_READ_WRITE_TOKEN ist nicht konfiguriert. Bitte in den Vercel Environment Variables setzen.'
    });
  }

  try {
    const tournaments: Array<{
      filename: string;
      name: string;
      tablesCount: number;
      finalistsCount: number;
      hasSecondChance: boolean;
      status: string;
      createdDate: string;
    }> = [];

    const listResult = await list({ prefix: "tournament_", token });
    const tourneyBlobs = listResult.blobs.filter(
      b => (b.pathname.startsWith("tournament_") || b.pathname.includes("/tournament_")) && b.pathname.endsWith(".csv")
    );

    for (const blob of tourneyBlobs) {
      try {
        const fetchRes = await fetch(blob.url);
        if (fetchRes.ok) {
          const text = await fetchRes.text();
          const meta = parseTournamentMeta(blob.pathname, text);
          if (meta) tournaments.push(meta);
        }
      } catch (e) {
        console.error(`Error reading blob ${blob.pathname}:`, e);
      }
    }

    return res.json({ tournaments });
  } catch (error: any) {
    console.error("Error in tournament list handler:", error);
    return res.status(500).json({ error: error.message || "Fehler beim Laden der Turnierliste." });
  }
}

function parseTournamentMeta(filename: string, content: string) {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const configLine = lines.find(l => l.startsWith("CONFIG;"));
  const qvLine = lines.find(l => l.startsWith("QualifikationVorrunde;") || l.startsWith("QUALIFIKATION_VORRUNDE;"));
  const qscLine = lines.find(l => l.startsWith("QualifikationSecondChance;") || l.startsWith("QUALIFIKATION_SECOND_CHANCE;"));
  
  // Default values from filename
  const cleanName = filename.replace(/^tournament_/, "").replace(/\.csv$/, "");
  
  if (!configLine) {
    return {
      filename,
      name: cleanName,
      tablesCount: 1,
      finalistsCount: 4,
      hasSecondChance: false,
      status: "In Vorbereitung",
      createdDate: new Date().toLocaleDateString("de-DE"),
      qualifikationVorrunde: 1,
      qualifikationSecondChance: 1
    };
  }

  const parts = configLine.split(";");
  const tablesCount = parseInt(parts[2]) || 1;
  const hasSecondChance = parts[4] === "true";
  const qualifikationVorrunde = qvLine ? (parseInt(qvLine.split(";")[1]) || 1) : 1;
  const qualifikationSecondChance = qscLine ? (parseInt(qscLine.split(";")[1]) || 1) : 1;
  const finalistsCount = tablesCount * qualifikationVorrunde + (hasSecondChance ? qualifikationSecondChance : 0);

  return {
    filename,
    name: parts[1] || cleanName,
    tablesCount,
    finalistsCount,
    hasSecondChance,
    status: parts[5] || "In Vorbereitung",
    createdDate: parts[6] || new Date().toLocaleDateString("de-DE"),
    qualifikationVorrunde,
    qualifikationSecondChance
  };
}
