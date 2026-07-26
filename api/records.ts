import { list } from "@vercel/blob";

export default async function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;

  try {
    let content = "";

    if (token) {
      console.log("Fetching list of blobs from Vercel Blob storage...");
      try {
        const listResult = await list({ token });
        const resultsBlob = listResult.blobs.find(b => b.pathname === "results.csv");
        if (resultsBlob) {
          console.log(`Fetching results.csv from URL: ${resultsBlob.url}`);
          const fetchRes = await fetch(resultsBlob.url);
          if (fetchRes.ok) {
            content = await fetchRes.text();
          }
        }
      } catch (listErr) {
        console.error("Error listing or fetching results.csv from Vercel Blob:", listErr);
      }
    } else {
      // Local development fallback
      const path = await import("path");
      const fs = await import("fs");
      const localPath = path.join(process.cwd(), "results.csv");
      console.log(`[Development Mode] Checking local file at: ${localPath}`);
      if (fs.existsSync(localPath)) {
        content = fs.readFileSync(localPath, "utf-8");
      }
    }

    if (!content) {
      return res.json({ data: [] });
    }

    // Parse CSV line by line and split by semicolon
    const lines = content.split(/\r?\n/);
    const data: string[][] = lines
      .map(line => line.trim())
      .filter(line => line !== "") // filter out completely empty lines
      .map(line => line.split(";"));

    return res.json({ data });
  } catch (error: any) {
    console.error("Error in records handler:", error);
    return res.status(500).json({ error: error.message || "Fehler beim Laden der Statistiken aus dem verknüpften Storage." });
  }
}
