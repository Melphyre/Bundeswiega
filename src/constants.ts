import { Player, ParsedRecord } from '../types';
import { TOGETHER_ACHIEVEMENT_IDS } from '../utils';

export const LOGO_URL = "https://github.com/Melphyre/Bundeswiega/blob/main/Bundeswiega.png?raw=true";
export const INSTAGRAM_URL = "https://www.instagram.com/bundeswiega/";

export const BRAND_COLOR = "#238183";
export const GOLD_COLOR = "#D4AF37";
export const DARK_GRAY = "#374151";

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

// Optionen-Button temporär ausgeblendet – auf true setzen um ihn wieder anzuzeigen
export const SHOW_OPTIONS_BUTTON = false;

export const PLAYER_COLORS = [
  '#238183', '#6366f1', '#f43f5e', '#f59e0b', '#06b6d4', 
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#3b82f6'
];

export const KLASSISCH_TARGETS: Record<number, string> = {
  1: '480',
  2: '420',
  3: '369',
  4: '332',
  5: '250',
  6: '222',
  7: '169',
  8: '123',
  9: '69',
  10: '0'
};

export function formatTableName(tableIndex: number, customName: string): string {
  const clean = (customName || '').trim();
  if (!clean) return `Tisch ${tableIndex}`;
  if (clean.toLowerCase().startsWith('tisch')) return clean;
  return `Tisch ${tableIndex} (${clean})`;
}

export function extractCustomName(rawTableName: string, tableIndex: number): string {
  if (!rawTableName) return '';
  const match = rawTableName.match(/\(([^)]+)\)/);
  if (match && match[1]) return match[1].trim();
  if (rawTableName.startsWith(`Tisch ${tableIndex}`)) {
    const rest = rawTableName.replace(`Tisch ${tableIndex}`, '').trim();
    if (rest.startsWith('(') && rest.endsWith(')')) return rest.slice(1, -1).trim();
    return rest;
  }
  return rawTableName;
}

export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function distributePlayers(names: string[], tableIds: string[]): Record<string, string[]> {
  const distribution: Record<string, string[]> = {};
  tableIds.forEach(id => { distribution[id] = []; });
  if (names.length === 0 || tableIds.length === 0) return distribution;

  const shuffled = shuffleArray(names);
  shuffled.forEach((name, idx) => {
    const targetTableId = tableIds[idx % tableIds.length];
    distribution[targetTableId].push(name);
  });
  return distribution;
}

export const getPlayerColor = (name: string, playersList: Player[] = []): string => {
  if (!name) return PLAYER_COLORS[0];
  const pIdx = playersList.findIndex(p => p.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (pIdx !== -1) {
    return PLAYER_COLORS[pIdx % PLAYER_COLORS.length];
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % PLAYER_COLORS.length;
  return PLAYER_COLORS[idx];
};

export const parseRecords = (data: any[][]): ParsedRecord[] => {
  if (!data || data.length < 2) return [];
  const list: ParsedRecord[] = [];
  
  // Skip row 0 which is the header row: Datum;Modus;Name;Avg;Schnaepse
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    if (!row || row.length < 5) continue;
    
    const dateVal = row[0];
    const gameMode = row[1];
    const playerName = row[2];
    const avgVal = row[3] !== undefined && row[3] !== null ? Number(row[3]) : 0;
    const schnaepseVal = row[4] !== undefined && row[4] !== null ? Number(row[4]) : 0;
    const levelsVal = row[5] !== undefined && row[5] !== null && row[5] !== "" && !isNaN(Number(row[5])) ? Number(row[5]) : undefined;

    let achievementsVal: ParsedRecord['achievements'] = undefined;
    const rawAch = row[6] || (row[5] && (row[5].startsWith('%5B') || row[5].startsWith('[')) ? row[5] : undefined);
    if (rawAch) {
      try {
        const decoded = rawAch.startsWith('%') ? decodeURIComponent(rawAch) : rawAch;
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed)) {
          achievementsVal = parsed.map((a: any) => {
            const isTogether = typeof a.earnedTogether === 'boolean'
              ? a.earnedTogether
              : (TOGETHER_ACHIEVEMENT_IDS.includes(a.id) ? true : undefined);

            return {
              id: String(a.id || ''),
              title: String(a.title || ''),
              icon: String(a.icon || ''),
              rarity: String(a.rarity || 'common'),
              earnedBy: Array.isArray(a.earnedBy) && a.earnedBy.length > 0 ? a.earnedBy.map(String) : [String(playerName)],
              ...(isTogether ? { earnedTogether: true } : {})
            };
          });
        }
      } catch (e) {
        console.warn("Could not parse achievements column from CSV:", e);
      }
    }

    if (dateVal && playerName) {
      list.push({
        gameMode: String(gameMode),
        playerName: String(playerName),
        date: String(dateVal),
        avg: avgVal,
        schnaepse: schnaepseVal,
        levels: levelsVal,
        achievements: achievementsVal,
      });
    }
  }
  return list;
};
