import { put, list } from "@vercel/blob";

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

async function loadTournamentCsv(
  tournamentName: string,
  token: string
): Promise<{ filename: string; content: string } | null> {
  try {
    const filename = getSafeFilename(tournamentName);
    const safeName = getSafeTournamentName(tournamentName);

    const listResult = await list({ prefix: `tournament_${safeName}`, token });
    const blob = listResult.blobs.find(
      b => b.pathname === filename || b.pathname.endsWith("/" + filename)
    );

    if (!blob) return null;

    const fetchRes = await fetch(blob.url);
    if (!fetchRes.ok) return null;
    const content = await fetchRes.text();
    return { filename, content };
  } catch (err) {
    console.error("loadTournamentCsv error:", err);
    return null;
  }
}

async function saveTournamentCsv(
  tournamentName: string,
  csvContent: string,
  token: string
): Promise<boolean> {
  try {
    const filename = getSafeFilename(tournamentName);
    await put(filename, csvContent, {
      access: "public",
      token,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "text/csv"
    });
    return true;
  } catch (err) {
    console.error("saveTournamentCsv error:", err);
    return false;
  }
}

const TOURNAMENT_TABLE_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EF4444',
  '#06B6D4',
  '#EC4899',
  '#84CC16',
  '#F97316',
  '#6366F1',
];

function parseTournamentCSV(filename: string, content: string) {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const cleanName = filename.replace(/^tournament_/, "").replace(/\.csv$/, "");
  let config = {
    name: cleanName,
    tablesCount: 1,
    finalistsCount: 4,
    hasSecondChance: false,
    status: "In Vorbereitung",
    createdDate: new Date().toLocaleDateString("de-DE"),
    qualifikationVorrunde: 1,
    qualifikationSecondChance: 1
  };

  const tables: Array<{
    id: string;
    name: string;
    status: "Offen" | "Laufend" | "Abgeschlossen" | "Gesperrt";
    winner?: string;
    secondPlace?: string;
    players?: string[];
    color?: string;
  }> = [];

  const results: Array<{
    tableId: string;
    playerName: string;
    rank: number;
    avg: number;
    schnaepse: number;
    date: string;
  }> = [];

  let vorrundeCount = 0;

  for (const line of lines) {
    const parts = line.split(";");
    const rowType = parts[0];

    if (rowType === "CONFIG") {
      config = {
        ...config,
        name: parts[1] || cleanName,
        tablesCount: parseInt(parts[2]) || 1,
        finalistsCount: parseInt(parts[3]) || 4,
        hasSecondChance: parts[4] === "true",
        status: parts[5] || "In Vorbereitung",
        createdDate: parts[6] || new Date().toLocaleDateString("de-DE")
      };
    } else if (rowType === "QualifikationVorrunde" || rowType === "QUALIFIKATION_VORRUNDE") {
      config.qualifikationVorrunde = parseInt(parts[1]) || 1;
    } else if (rowType === "QualifikationSecondChance" || rowType === "QUALIFIKATION_SECOND_CHANCE") {
      config.qualifikationSecondChance = parseInt(parts[1]) || 1;
    } else if (rowType === "TABLE") {
      const tableId = parts[1];
      let defaultColor = TOURNAMENT_TABLE_COLORS[0];
      if (tableId === "table_second_chance") {
        defaultColor = "#F59E0B";
      } else if (tableId === "table_final") {
        defaultColor = "#D4AF37";
      } else if (tableId.startsWith("table_")) {
        const num = parseInt(tableId.replace("table_", ""));
        if (!isNaN(num) && num > 0) {
          defaultColor = TOURNAMENT_TABLE_COLORS[(num - 1) % TOURNAMENT_TABLE_COLORS.length];
        } else {
          defaultColor = TOURNAMENT_TABLE_COLORS[vorrundeCount % TOURNAMENT_TABLE_COLORS.length];
          vorrundeCount++;
        }
      }

      const tableColor = parts[7] || defaultColor;

      tables.push({
        id: parts[1],
        name: parts[2],
        status: (parts[3] as any) || "Offen",
        winner: parts[4] || "",
        secondPlace: parts[5] || "",
        players: parts[6] ? JSON.parse(decodeURIComponent(parts[6])) : [],
        color: tableColor
      });
    } else if (rowType === "RESULT") {
      results.push({
        tableId: parts[1],
        playerName: parts[2],
        rank: parseInt(parts[3]) || 1,
        avg: parseFloat(parts[4]) || 0,
        schnaepse: parseInt(parts[5]) || 0,
        date: parts[6] || ""
      });
    }
  }

  config.finalistsCount = config.tablesCount * config.qualifikationVorrunde + (config.hasSecondChance ? config.qualifikationSecondChance : 0);

  if (tables.length === 0) {
    for (let i = 1; i <= config.tablesCount; i++) {
      tables.push({
        id: `table_${i}`,
        name: `Tisch ${i}`,
        status: "Offen",
        players: [],
        color: TOURNAMENT_TABLE_COLORS[(i - 1) % TOURNAMENT_TABLE_COLORS.length]
      });
    }
    if (config.hasSecondChance) {
      tables.push({
        id: "table_second_chance",
        name: "Second Chance Tisch",
        status: "Gesperrt",
        players: [],
        color: "#F59E0B"
      });
    }
    tables.push({
      id: "table_final",
      name: "Finaltisch",
      status: "Gesperrt",
      players: [],
      color: "#D4AF37"
    });
  }

  return { config, tables, results };
}

export default async function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return res.status(500).json({
      error: "BLOB_READ_WRITE_TOKEN ist nicht konfiguriert. Bitte in den Vercel Environment Variables setzen."
    });
  }

  const { action, name, tablesCount, finalistsCount, hasSecondChance, tableId, results, date } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Missing required parameter 'name'." });
  }

  const filename = getSafeFilename(name);

  try {
    const loaded = await loadTournamentCsv(name, token);
    const existingContent = loaded ? loaded.content : "";

    let csvContent = "";

    if (action === "create" || !existingContent) {
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
      const tournament = parseTournamentCSV(filename, existingContent);
      const config = tournament.config;
      const tables = tournament.tables;
      const existingResults = tournament.results;

      if (action === "saveTableResult" && tableId && Array.isArray(results)) {
        const resultDate = date || new Date().toLocaleDateString("de-DE");
        
        const targetTable = tables.find(t => t.id === tableId);
        if (targetTable) {
          targetTable.status = "Abgeschlossen";
          
          const sorted = [...results].sort((a, b) => (a.rank || 0) - (b.rank || 0));
          if (sorted.length > 0) targetTable.winner = sorted[0].name;
          if (sorted.length > 1) targetTable.secondPlace = sorted[1].name;
          targetTable.players = sorted.map(r => r.name);
          
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
          
          const vorrundeTables = tables.filter(t => t.id.startsWith("table_") && t.id !== "table_second_chance" && t.id !== "table_final");
          const allVorrundeDone = vorrundeTables.every(t => t.status === "Abgeschlossen");

          const secondChanceTable = tables.find(t => t.id === "table_second_chance");
          const finalTable = tables.find(t => t.id === "table_final");

          const qVorrunde = config.qualifikationVorrunde || 1;
          const qSecondChance = config.qualifikationSecondChance || 1;

          if (allVorrundeDone) {
            config.status = "Vorrunde beendet";

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
              secondChanceTable.players = nonQualifiers;
              if (secondChanceTable.status === "Gesperrt") {
                secondChanceTable.status = "Offen";
                config.status = "Second Chance";
              }
            }

            const scDone = !secondChanceTable || secondChanceTable.status === "Abgeschlossen";

            if (scDone && finalTable) {
              if (finalTable.status === "Gesperrt") {
                finalTable.status = "Offen";
                config.status = "Finale";
              }

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

          config.finalistsCount = config.tablesCount * qVorrunde + (config.hasSecondChance ? qSecondChance : 0);

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

    const saved = await saveTournamentCsv(name, csvContent, token);
    if (!saved) {
      return res.status(500).json({ error: "Speichern der Turnier-CSV fehlgeschlagen." });
    }

    return res.json({ success: true, message: `Turnier '${name}' erfolgreich gespeichert.` });
  } catch (error: any) {
    console.error("Error in tournament save handler:", error);
    return res.status(500).json({ error: error.message || "Fehler beim Speichern des Turniers." });
  }
}
