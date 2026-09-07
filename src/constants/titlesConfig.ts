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
  [key: string]: any;
}

export interface PlayerTitle {
  id: string;
  name: string;
  description: string;
  icon: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
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
      achievementsCount: 0
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

  return {
    gamesPlayed,
    totalPoints,
    highScore,
    gamesWon,
    achievementsCount
  };
};

/**
 * Globale Liste aller verfügbaren Spielertitel
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
    isUnlocked: () => true
  },
  {
    id: 'stammgast',
    name: 'Stammgast',
    description: 'Mindestens 10 Spiele absolviert',
    icon: '🍺',
    badgeBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    textColor: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-500/30',
    isUnlocked: (p) => extractProfileStats(p).gamesPlayed >= 10
  },
  {
    id: 'bierkoenig',
    name: 'Bierkönig',
    description: 'Mindestens 50 Spiele absolviert',
    icon: '👑',
    badgeBg: 'bg-amber-500/15 dark:bg-amber-500/25',
    textColor: 'text-amber-800 dark:text-amber-300',
    borderColor: 'border-amber-500/40',
    isUnlocked: (p) => extractProfileStats(p).gamesPlayed >= 50
  },
  {
    id: 'wiege_legende',
    name: 'Wiege-Legende',
    description: 'Mindestens 100 Spiele absolviert',
    icon: '⚡',
    badgeBg: 'bg-purple-500/15 dark:bg-purple-500/25',
    textColor: 'text-purple-700 dark:text-purple-300',
    borderColor: 'border-purple-500/40',
    isUnlocked: (p) => extractProfileStats(p).gamesPlayed >= 100
  },
  {
    id: 'praezisions_meister',
    name: 'Präzisions-Meister',
    description: 'Bester Durchschnitt von 2,0g oder besser erzielt',
    icon: '🎯',
    badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20',
    textColor: 'text-rose-700 dark:text-rose-300',
    borderColor: 'border-rose-500/40',
    isUnlocked: (p) => {
      const { highScore, gamesPlayed } = extractProfileStats(p);
      return gamesPlayed > 0 && highScore !== null && highScore <= 2.0;
    }
  },
  {
    id: 'scharfschuetze',
    name: 'Scharfschütze',
    description: 'Bester Durchschnitt von 1,0g oder besser erzielt',
    icon: '🏹',
    badgeBg: 'bg-red-500/15 dark:bg-red-500/25',
    textColor: 'text-red-700 dark:text-red-300',
    borderColor: 'border-red-500/40',
    isUnlocked: (p) => {
      const { highScore, gamesPlayed } = extractProfileStats(p);
      return gamesPlayed > 0 && highScore !== null && highScore <= 1.0;
    }
  },
  {
    id: 'schnaps_baron',
    name: 'Schnaps-Baron',
    description: 'Mindestens 100 Schnäpse auf dem Konto',
    icon: '🥃',
    badgeBg: 'bg-amber-600/15 dark:bg-amber-600/25',
    textColor: 'text-amber-900 dark:text-amber-200',
    borderColor: 'border-amber-600/40',
    isUnlocked: (p) => extractProfileStats(p).totalPoints >= 100
  },
  {
    id: 'schnapsdrossel',
    name: 'Schnapsdrossel',
    description: 'Mindestens 250 Schnäpse auf dem Konto',
    icon: '🦅',
    badgeBg: 'bg-orange-500/15 dark:bg-orange-500/25',
    textColor: 'text-orange-800 dark:text-orange-300',
    borderColor: 'border-orange-500/40',
    isUnlocked: (p) => extractProfileStats(p).totalPoints >= 250
  },
  {
    id: 'pokaljaeger',
    name: 'Pokaljäger',
    description: 'Mindestens 10 Errungenschaften freigeschaltet',
    icon: '🏆',
    badgeBg: 'bg-yellow-500/15 dark:bg-yellow-500/25',
    textColor: 'text-yellow-800 dark:text-yellow-300',
    borderColor: 'border-yellow-500/40',
    isUnlocked: (p) => extractProfileStats(p).achievementsCount >= 10
  }
];

/**
 * Gibt nur die Titel zurück, die der Spieler gemäß seinen Daten freigeschaltet hat.
 */
export const getUnlockedTitles = (profile: ProfileData | null | undefined): PlayerTitle[] => {
  return PLAYER_TITLES.filter(title => title.isUnlocked(profile || {}));
};

/**
 * Sucht einen Titel anhand seiner ID oder seines Namens
 */
export const findTitle = (idOrName?: string | null): PlayerTitle | undefined => {
  if (!idOrName) return undefined;
  const clean = idOrName.trim().toLowerCase();
  return PLAYER_TITLES.find(t => t.id.toLowerCase() === clean || t.name.toLowerCase() === clean);
};
