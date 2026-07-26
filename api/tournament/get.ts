import { loadTournamentCsv, parseTournamentCSV, getSafeFilename } from "./_utils";

export default async function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return res.status(500).json({
      error: "BLOB_READ_WRITE_TOKEN ist nicht konfiguriert. Bitte in den Vercel Environment Variables setzen."
    });
  }

  let { name, filename } = req.query;
  if (!name && !filename) {
    return res.status(400).json({ error: "Missing parameter 'name' or 'filename'." });
  }

  const targetName = String(name || filename);

  try {
    const loaded = await loadTournamentCsv(targetName, token);

    if (!loaded || !loaded.content) {
      const safeFn = getSafeFilename(targetName);
      return res.status(404).json({ error: `Turnier-Datei '${safeFn}' nicht gefunden.` });
    }

    const parsed = parseTournamentCSV(loaded.filename, loaded.content);
    return res.json(parsed);
  } catch (error: any) {
    console.error("Error in tournament get handler:", error);
    return res.status(500).json({ error: error.message || "Fehler beim Laden des Turniers." });
  }
}
