import { put, list } from "@vercel/blob";
import { parseTournamentCSV, TOURNAMENT_TABLE_COLORS } from "./get";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const { action, name, tablesCount, finalistsCount, hasSecondChance, tableId, results, date } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Missing required parameter 'name'." });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const filename = `tournament_${name.trim()}.csv`;

  try {
    let existingContent = "";

    if (token) {
      try {
        const listResult = await list({ token });
        const blob = listResult.blobs.find(b => b.pathname === filename);
        if (blob) {
          const fetchRes = await fetch(blob.url);
          if (fetchRes.ok) existingContent = await fetchRes.text();
        }
      } catch (err) {
        console.error("Error fetching tournament blob:", err);
      }
    } else {
      const path = await import("path");
      const fs = await import("fs");
      const localPath = path.join(process.cwd(), filename);
      if (fs.existsSync(localPath)) {
        existingContent = fs.readFileSync(localPath, "utf-8");
      }
    }

    let csvContent = "";

    if (action === "create" || !existingContent) {
      // Create new tournament CSV structure
      const tCount = parseInt(tablesCount) || 1;
      const qVorrunde = parseInt(req.body.qualifikationVorrunde) || 1;
      const qSecondChance = parseInt(req.body.qualifikationSecondChance) || 1;
      const secondChance = Boolean(hasSecondChance);
      const fCount = tCount * qVorrunde + (secondChance ? qSecondChance : 0);
      const today = date || new Date().toLocaleDateString("de-DE");

      const lines: string[] = [];
      lines.push("TYPE;KEY;VAL1;VAL2;VAL3;VAL4;VAL5");
      lines.push(`CONFIG;${name};${tCount};${fCount};${secondChance};In Vorbereitung;${today}`);
      lines.push(`QualifikationVorrunde;${qVorrunde}`);
      if (secondChance) {
        lines.push(`QualifikationSecondChance;${qSecondChance}`);
      }

      for (let i = 1; i <= tCount; i++) {
        const color = TOURNAMENT_TABLE_COLORS[(i - 1) % TOURNAMENT_TABLE_COLORS.length];
        lines.push(`TABLE;table_${i};Tisch ${i};Offen;;;[];${color}`);
      }

      if (secondChance) {
        lines.push(`TABLE;table_second_chance;Second Chance Tisch;Gesperrt;;;[];#F59E0B`);
      }

      lines.push(`TABLE;table_final;Finaltisch;Gesperrt;;;[];#D4AF37`);

      csvContent = lines.join("\n");
    } else {
      // Updating an existing tournament CSV
      const tournament = parseTournamentCSV(filename, existingContent);
      const config = tournament.config;
      const tables = tournament.tables;
      const existingResults = tournament.results;

      if (action === "saveTableResult" && tableId && Array.isArray(results)) {
        const resultDate = date || new Date().toLocaleDateString("de-DE");
        
        // Find target table
        const targetTable = tables.find(t => t.id === tableId);
        if (targetTable) {
          targetTable.status = "Abgeschlossen";
          
          // Sort results by rank (rank 1 = winner)
          const sorted = [...results].sort((a, b) => (a.rank || 0) - (b.rank || 0));
          if (sorted.length > 0) targetTable.winner = sorted[0].name;
          if (sorted.length > 1) targetTable.secondPlace = sorted[1].name;
          targetTable.players = sorted.map(r => r.name);
          
          // Append new result rows (remove older results for this tableId if re-played)
          const filteredResults = existingResults.filter(r => r.tableId !== tableId);
          sorted.forEach(r => {
            filteredResults.push({
              tableId,
              playerName: r.name,
              rank: r.rank,
              avg: r.avg,
              schnaepse: r.schnaepse,
              date: resultDate
            });
          });
          
          // Check state of all Vorrunde tables
          const vorrundeTables = tables.filter(t => t.id.startsWith("table_") && t.id !== "table_second_chance" && t.id !== "table_final");
          const allVorrundeDone = vorrundeTables.every(t => t.status === "Abgeschlossen");

          const secondChanceTable = tables.find(t => t.id === "table_second_chance");
          const finalTable = tables.find(t => t.id === "table_final");

          const qVorrunde = config.qualifikationVorrunde || 1;
          const qSecondChance = config.qualifikationSecondChance || 1;

          if (allVorrundeDone) {
            config.status = "Vorrunde beendet";

            // Collect direct qualifiers and non-qualifiers from Vorrunde tables
            const directQualifiers: string[] = [];
            const nonQualifiers: string[] = [];

            vorrundeTables.forEach(vt => {
              const vtResults = filteredResults.filter(r => r.tableId === vt.id).sort((a, b) => a.rank - b.rank);
              vtResults.forEach(r => {
                if (r.rank <= qVorrunde) {
                  directQualifiers.push(r.playerName);
                } else {
                  nonQualifiers.push(r.playerName);
                }
              });
            });

            if (secondChanceTable) {
              // Populate Second Chance table with non-qualifiers (ranks Y+1 and worse)
              secondChanceTable.players = nonQualifiers;
              if (secondChanceTable.status === "Gesperrt") {
                secondChanceTable.status = "Offen";
                config.status = "Second Chance";
              }
            }

            // Check if ready for Final table
            const scDone = !secondChanceTable || secondChanceTable.status === "Abgeschlossen";

            if (scDone && finalTable) {
              if (finalTable.status === "Gesperrt") {
                finalTable.status = "Offen";
                config.status = "Finale";
              }

              // Finalists = Direct qualifiers from Vorrunde + Top Z from Second Chance
              const finalists = [...directQualifiers];
              if (secondChanceTable && secondChanceTable.status === "Abgeschlossen") {
                const scResults = filteredResults.filter(r => r.tableId === secondChanceTable.id).sort((a, b) => a.rank - b.rank);
                scResults.forEach(r => {
                  if (r.rank <= qSecondChance) {
                    finalists.push(r.playerName);
                  }
                });
              }
              finalTable.players = finalists;
            }
          } else {
            config.status = "Vorrunde läuft";
          }

          if (tableId === "table_final" && targetTable.status === "Abgeschlossen") {
            config.status = "Beendet";
          }

          // Recalculate finalists count for config
          config.finalistsCount = config.tablesCount * qVorrunde + (config.hasSecondChance ? qSecondChance : 0);

          // Rebuild CSV content
          const lines: string[] = [];
          lines.push("TYPE;KEY;VAL1;VAL2;VAL3;VAL4;VAL5");
          lines.push(`CONFIG;${config.name};${config.tablesCount};${config.finalistsCount};${config.hasSecondChance};${config.status};${config.createdDate}`);
          lines.push(`QualifikationVorrunde;${qVorrunde}`);
          if (config.hasSecondChance) {
            lines.push(`QualifikationSecondChance;${qSecondChance}`);
          }

          tables.forEach((t, idx) => {
            const playersJson = encodeURIComponent(JSON.stringify(t.players || []));
            const tColor = t.color || (
              t.id === "table_second_chance" ? "#F59E0B" :
              t.id === "table_final" ? "#D4AF37" :
              TOURNAMENT_TABLE_COLORS[idx % TOURNAMENT_TABLE_COLORS.length]
            );
            lines.push(`TABLE;${t.id};${t.name};${t.status};${t.winner || ""};${t.secondPlace || ""};${playersJson};${tColor}`);
          });

          filteredResults.forEach(r => {
            lines.push(`RESULT;${r.tableId};${r.playerName};${r.rank};${r.avg};${r.schnaepse};${r.date}`);
          });

          csvContent = lines.join("\n");
        }
      }
    }

    if (!csvContent) {
      return res.status(400).json({ error: "Keine Daten zum Speichern vorhanden." });
    }

    if (token) {
      await put(filename, csvContent, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        token,
        contentType: "text/csv"
      });
      return res.json({ success: true, message: `Turnier '${name}' erfolgreich gespeichert.` });
    } else {
      const path = await import("path");
      const fs = await import("fs");
      const localPath = path.join(process.cwd(), filename);
      fs.writeFileSync(localPath, csvContent, "utf-8");
      return res.json({ success: true, message: `Turnier '${name}' lokal gespeichert.` });
    }
  } catch (error: any) {
    console.error("Error in tournament save handler:", error);
    return res.status(500).json({ error: error.message || "Fehler beim Speichern des Turniers." });
  }
}
