export interface ProfileData {
  games_played?: number;
  gamesPlayed?: number;
  total_points?: number;
  totalPoints?: number;
  totalSchnaepse?: number;
  high_score?: number | null;
  highScore?: number | null;
  bestAvg?: number | null;
  games_won?: number;
  gamesWon?: number;
  achievements_count?: number;
  achievementsCount?: number;
  level?: number;
  xp?: number;
  name_bg_color?: string | null;
  [key: string]: any;
}

export type TitleCategory = 'level' | 'spiele' | 'praezision' | 'schnaepse' | 'achievements' | 'special';

export interface PlayerTitle {
  id: string;
  name: string;
  description: string;
  icon: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  category: TitleCategory;
  conditionText: string;
  requiredLevel?: number;
  isUnlocked: (profile: ProfileData) => boolean;
}

/**
 * Normalisiert Profilstatistiken unabhängig davon,
 * ob sie im snake_case (Datenbank) oder camelCase (Frontend) vorliegen.
 */
export const extractProfileStats = (profile: ProfileData | null | undefined) => {
  if (!profile) {
    return {
      gamesPlayed: 0,
      totalPoints: 0,
      highScore: null,
      gamesWon: 0,
      achievementsCount: 0,
      level: 1,
      xp: 0,
      nameBgColor: 'none'
    };
  }

  const gamesPlayed = Number(profile.games_played ?? profile.gamesPlayed ?? 0);
  const totalPoints = Number(profile.total_points ?? profile.totalPoints ?? profile.totalSchnaepse ?? 0);
  
  const rawHigh = profile.high_score ?? profile.highScore ?? profile.bestAvg;
  const highScore = (rawHigh !== null && rawHigh !== undefined && !isNaN(Number(rawHigh)))
    ? Number(rawHigh)
    : null;

  const gamesWon = Number(profile.games_won ?? profile.gamesWon ?? 0);
  const achievementsCount = Number(profile.achievements_count ?? profile.achievementsCount ?? 0);
  const level = Number(profile.level ?? 1);
  const xp = Number(profile.xp ?? 0);
  const nameBgColor = profile.name_bg_color || profile.nameBgColor || 'none';

  return {
    gamesPlayed,
    totalPoints,
    highScore,
    gamesWon,
    achievementsCount,
    level,
    xp,
    nameBgColor
  };
};

/**
 * =========================================================================
 * ZENTRALE TITEL-KONFIGURATION
 * =========================================================================
 * Alle früheren Test-Titel wurden bereinigt. Nur der Standardtitel "Neuling"
 * (Level 1) ist aktiv.
 * 
 * Neue Titel können hier einfach als weiteres Objekt zum Array hinzugefügt werden:
 * 
 * {
 *   id: 'bier_meister',
 *   name: 'Biermeister',
 *   description: 'Erreiche Level 5',
 *   icon: '🍺',
 *   badgeBg: 'bg-amber-500/15 dark:bg-amber-500/25',
 *   textColor: 'text-amber-700 dark:text-amber-300',
 *   borderColor: 'border-amber-500/40',
 *   category: 'level',
 *   conditionText: 'Erfordert Level 5',
 *   requiredLevel: 5,
 *   isUnlocked: (p) => extractProfileStats(p).level >= 5
 * }
 */
export const PLAYER_TITLES: PlayerTitle[] = [
  {
    id: 'neuling',
    name: 'Neuling',
    description: 'Beginne deine Wiege-Karriere (Standard)',
    icon: '🌱',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-500/30',
    category: 'level',
    conditionText: 'Standard bei Registrierung (Level 1)',
    requiredLevel: 1,
    isUnlocked: () => true
  }
];

/**
 * Standardtitel (immer Neuling)
 */
export const DEFAULT_TITLE: PlayerTitle = PLAYER_TITLES[0];

/**
 * Gibt nur die Titel zurück, die der Spieler gemäß seinen Daten freigeschaltet hat.
 */
export const getUnlockedTitles = (profile: ProfileData | null | undefined): PlayerTitle[] => {
  const titles = PLAYER_TITLES.filter(title => title.isUnlocked(profile || {}));
  // Garantiere, dass mindestens Neuling vorhanden ist
  if (titles.length === 0 && PLAYER_TITLES.length > 0) {
    return [PLAYER_TITLES[0]];
  }
  return titles;
};

/**
 * Sucht einen Titel anhand seiner ID oder seines Namens
 */
export const findTitle = (idOrName?: string | null): PlayerTitle | undefined => {
  if (!idOrName) return undefined;
  const clean = idOrName.trim().toLowerCase();
  return PLAYER_TITLES.find(t => t.id.toLowerCase() === clean || t.name.toLowerCase() === clean);
};
