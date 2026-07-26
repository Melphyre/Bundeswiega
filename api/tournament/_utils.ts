import { put, list } from "@vercel/blob";

export const TOURNAMENT_TABLE_COLORS = [
  '#3B82F6', // Blau
  '#10B981', // Grün
  '#F59E0B', // Orange
  '#8B5CF6', // Lila
  '#EF4444', // Rot
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#84CC16', // Hellgrün
  '#F97316', // Dunkelorange
  '#6366F1', // Indigo
];

export function getSafeTournamentName(name: string): string {
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

export function getSafeFilename(tournamentName: string): string {
  const safeName = getSafeTournamentName(tournamentName);
  return `tournament_${safeName}.csv`;
}

export async function loadTournamentCsv(
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

export async function saveTournamentCsv(
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

export function parseTournamentMeta(filename: string, content: string) {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const cleanName = filename.replace(/^tournament_/, "").replace(/\.csv$/, "");

  let config = {
    name: cleanName,
    tablesCount: 1,
    finalistsCount: 4,
    hasSecondChance: false,
    status: "In Vorbereitung",
    createdDate: new Date().toLocaleDateString("de-DE")
  };

  for (const line of lines) {
    const parts = line.split(";");
    if (parts[0] === "CONFIG") {
      config = {
        name: parts[1] || cleanName,
        tablesCount: parseInt(parts[2]) || 1,
        finalistsCount: parseInt(parts[3]) || 4,
        hasSecondChance: parts[4] === "true",
        status: parts[5] || "In Vorbereitung",
        createdDate: parts[6] || new Date().toLocaleDateString("de-DE")
      };
      break;
    }
  }

  return {
    filename,
    name: config.name,
    tablesCount: config.tablesCount,
    finalistsCount: config.finalistsCount,
    hasSecondChance: config.hasSecondChance,
    status: config.status,
    createdDate: config.createdDate
  };
}

export function parseTournamentCSV(filename: string, content: string) {
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
