import { del, list } from "@vercel/blob";

function getSafeTournamentName(name: string): string {
  let clean = (name || "").trim();
  if (clean.startsWith("tournament_")) {
    clean = clean.replace(/^tournament_/, "");
  }
  if (clean.endsWith(".csv")) {
    clean = clean.replace(/\.csv$/, "");
  }
  const safeName = clean
    .replace(/[^a-zA-Z0-9äöüÄÖÜß\-_]/g, '_')
    .substring(0, 50);
  return safeName || 'unnamed';
}

function getSafeFilename(tournamentName: string): string {
  const safeName = getSafeTournamentName(tournamentName);
  return `tournament_${safeName}.csv`;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return res.status(500).json({
      error: 'BLOB_READ_WRITE_TOKEN ist nicht konfiguriert. Bitte in den Vercel Environment Variables setzen.'
    });
  }

  const { name, tournamentName } = req.body;
  const targetName = name || tournamentName;

  if (!targetName) {
    return res.status(400).json({ error: "Missing required parameter 'name' or 'tournamentName'." });
  }

  const filename = getSafeFilename(targetName);
  const safeName = getSafeTournamentName(targetName);

  try {
    const listResult = await list({ prefix: `tournament_${safeName}`, token });
    const blob = listResult.blobs.find(b => b.pathname === filename || b.pathname.endsWith("/" + filename));
    if (blob) {
      await del(blob.url, { token });
      return res.json({ success: true, message: `Turnier '${targetName}' erfolgreich gelöscht.` });
    } else {
      return res.status(404).json({ error: `Turnier '${targetName}' nicht gefunden.` });
    }
  } catch (error: any) {
    console.error("Error in tournament delete handler:", error);
    return res.status(500).json({ error: error.message || "Fehler beim Löschen des Turniers." });
  }
}
