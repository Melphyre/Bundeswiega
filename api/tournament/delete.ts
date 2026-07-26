import { del, list } from "@vercel/blob";
import { getSafeFilename } from "./get";

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

  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Missing parameter 'name'." });
  }

  const filename = getSafeFilename(name);

  try {
    const listResult = await list({ prefix: "tournament_", token });
    const blob = listResult.blobs.find(b => b.pathname === filename || b.pathname.endsWith("/" + filename));
    if (blob) {
      await del(blob.url, { token });
    }

    return res.json({ success: true, message: `Turnier '${name}' erfolgreich gelöscht.` });
  } catch (error: any) {
    console.error("Error deleting tournament:", error);
    return res.status(500).json({ error: error.message || "Fehler beim Löschen des Turniers." });
  }
}
