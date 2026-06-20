import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import * as xlsx from "xlsx";
import { put, list } from "@vercel/blob";

// Setup express app
const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to read CSV from Vercel Blob (linked storage) or local fallback
async function readCSVFromVercelBlob(): Promise<any[][]> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    // Local development fallback
    const localPath = path.join(process.cwd(), "Statistik.csv");
    console.log(`[Development Mode] Checking local file at: ${localPath}`);
    if (fs.existsSync(localPath)) {
      const buffer = fs.readFileSync(localPath);
      const wb = xlsx.read(buffer, { type: "buffer" });
      const sheetName = wb.SheetNames[0] || "Sheet1";
      const ws = wb.Sheets[sheetName];
      if (ws) {
        return xlsx.utils.sheet_to_json(ws, { header: 1, defval: null }) as any[][];
      }
    }
    return [];
  }

  // Production Mode: Vercel Blob storage
  try {
    console.log("Fetching list of blobs from Vercel Blob storage...");
    const listResult = await list({ token });
    const statistikBlob = listResult.blobs.find(b => b.pathname === "Statistik.csv");
    if (!statistikBlob) {
      console.log("Statistik.csv was not found in Vercel Blob storage. Returning empty array.");
      return [];
    }

    console.log(`Fetching Statistik.csv content from Blob URL: ${statistikBlob.url}`);
    const res = await fetch(statistikBlob.url);
    if (!res.ok) {
      throw new Error(`Failed to fetch file from Blob URL (Status ${res.status}): ${res.statusText}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const wb = xlsx.read(buffer, { type: "buffer" });
    const sheetName = wb.SheetNames[0] || "Sheet1";
    const ws = wb.Sheets[sheetName];
    if (ws) {
      return xlsx.utils.sheet_to_json(ws, { header: 1, defval: null }) as any[][];
    }
    return [];
  } catch (error) {
    console.error("Error reading from Vercel Blob storage:", error);
    throw error;
  }
}

// Helper to write CSV to Vercel Blob (linked storage) or local fallback
async function writeCSVToVercelBlob(data: any[][]): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const newWs = xlsx.utils.aoa_to_sheet(data);
  const csvContent = xlsx.utils.sheet_to_csv(newWs);

  if (!token) {
    // Local development fallback
    const localPath = path.join(process.cwd(), "Statistik.csv");
    fs.writeFileSync(localPath, csvContent, "utf-8");
    console.log("Statistik.csv successfully written to local fallback storage.");
    return "Ergebnisse wurden lokal unter Statistik.csv gespeichert (Lokaler Entwicklungsmodus ohne Live-Token).";
  }

  // Production Mode: Vercel Blob storage
  try {
    console.log("Uploading updated Statistik.csv to Vercel Blob storage...");
    const blob = await put("Statistik.csv", csvContent, {
      access: "public",
      addRandomSuffix: false,
      token,
      contentType: "text/csv",
    });
    console.log(`Successfully uploaded to Vercel Blob at URL: ${blob.url}`);
    return "Ergebnisse wurden erfolgreich im verknüpften Storage (Vercel Blob) gespeichert!";
  } catch (error) {
    console.error("Error writing to Vercel Blob storage:", error);
    throw error;
  }
}

// API route first
app.post("/api/upload", async (req, res) => {
  const { gameMode, results, date } = req.body;

  if (!gameMode || !results || !Array.isArray(results) || !date) {
    return res.status(400).json({ error: "Invalid request payload. Must include gameMode, results array, and date." });
  }

  try {
    const data = await readCSVFromVercelBlob();

    // Pad or initialize headers if empty
    if (data.length === 0) {
      data[0] = []; // Row 0: Names
      data[1] = []; // Row 1: Headers (Datum, Durchschnitt, Schnäpse)
    }

    results.forEach((item: { name: string; avg: number; schnaepse: number }) => {
      // Build unique name header specifying the Game Mode
      const uniqueName = `[${gameMode}] ${item.name}`;

      // Find player column in Row 0 (checking every 3rd column)
      let nameColIdx = -1;
      const maxCol = data[0].length;
      for (let col = 0; col < maxCol; col += 3) {
        if (data[0][col] === uniqueName) {
          nameColIdx = col;
          break;
        }
      }

      if (nameColIdx === -1) {
        // Find next multiple of 3 that is at least data[0].length to append new player columns
        const startCol = Math.ceil(maxCol / 3) * 3;
        data[0][startCol] = uniqueName;
        data[0][startCol + 1] = null;
        data[0][startCol + 2] = null;

        data[1][startCol] = "Datum";
        data[1][startCol + 1] = "Durchschnitt";
        data[1][startCol + 2] = "Schnäpse";

        // Write row at row 2
        const targetRowIdx = 2;
        if (!data[targetRowIdx]) data[targetRowIdx] = [];
        data[targetRowIdx][startCol] = date;
        data[targetRowIdx][startCol + 1] = item.avg;
        data[targetRowIdx][startCol + 2] = item.schnaepse;
      } else {
        // Find next empty row under this player block
        let targetRowIdx = 2;
        while (true) {
          if (!data[targetRowIdx]) {
            data[targetRowIdx] = [];
            break;
          }
          const val = data[targetRowIdx][nameColIdx];
          if (val === null || val === undefined || val === "") {
            break;
          }
          targetRowIdx++;
        }
        data[targetRowIdx][nameColIdx] = date;
        data[targetRowIdx][nameColIdx + 1] = item.avg;
        data[targetRowIdx][nameColIdx + 2] = item.schnaepse;
      }
    });

    const successMessage = await writeCSVToVercelBlob(data);
    return res.json({ success: true, message: successMessage });
  } catch (error: any) {
    console.error("Error processing upload endpoint:", error);
    return res.status(500).json({ error: error.message || "Ein Fehler ist beim Verarbeiten oder Hochladen der Ergebnisse aufgetreten." });
  }
});

app.get("/api/records", async (req, res) => {
  try {
    const data = await readCSVFromVercelBlob();
    return res.json({ data });
  } catch (error: any) {
    console.error("Error processing records endpoint:", error);
    return res.status(500).json({ error: error.message || "Fehler beim Laden der Statistiken aus dem verknüpften Storage." });
  }
});


// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
