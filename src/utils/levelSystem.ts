/**
 * 1. Bundeswiega - Levelsystem & Erfahrungspunkte (XP)
 * 
 * Berechnet Level, Schwellenwerte, Fortschritt und spielbezogene XP-Gewinne.
 * Enthält die zentrale Level-Progressionstabelle für Level 1 bis 20.
 */

export interface LevelInfo {
  level: number;
  totalXp: number;
  currentLevelXp: number;
  neededForNextLevel: number;
  progressPercent: number;
  title: string;
  nextReward?: LevelReward;
}

export interface XpBreakdownItem {
  label: string;
  xp: number;
  icon?: string;
}

export interface GameXpResult {
  totalXp: number;
  items: XpBreakdownItem[];
}

export interface GameXpParams {
  avg?: number;
  schnaepse?: number;
  isWinner?: boolean;
  rank?: number; // 1 = 1. Platz, 2 = 2. Platz
  tournamentRank?: number; // 1 = 1. Platz Finaltable, 2 = 2. Platz, 3 = 3. Platz
  isSpeedMode?: boolean;
  speedLevels?: number;
  timeSeconds?: number;
  achievementsCount?: number;
  disqualified?: boolean;
}

/**
 * =========================================================================
 * ZENTRALE LEVEL-PROGRESSIONSTABELLE (LEVEL 1 BIS 20)
 * =========================================================================
 * Übersichtliche Schwellenwerte für Level, benötigte XP für die jeweilige Stufe,
 * kumulierte Gesamt-XP und freigeschaltete Belohnungen / Features.
 * Kann für Balancing-Anpassungen direkt hier modifiziert werden.
 */
export interface LevelProgressionEntry {
  level: number;
  xpRequiredForLevel: number; // XP benötigt für diesen Stufenaufstieg
  cumulativeXp: number;       // Kumulierte Gesamt-XP
  rewardTitle: string;        // Titel / Hauptbelohnung
  rewardDescription: string;  // Detaillierte Beschreibung
  rewardType: 'title' | 'feature' | 'badge' | 'cosmetic';
  icon: string;
  badgeText?: string;
}

export const LEVEL_PROGRESSION_TABLE: LevelProgressionEntry[] = [
  {
    level: 1,
    xpRequiredForLevel: 0,
    cumulativeXp: 0,
    rewardTitle: 'Standardtitel "Neuling"',
    rewardDescription: 'Start-Titel der 1. Bundeswiega bei Registrierung (Level 1)',
    rewardType: 'title',
    icon: '🌱',
    badgeText: 'Titel'
  },
  {
    level: 2,
    xpRequiredForLevel: 100,
    cumulativeXp: 100,
    rewardTitle: 'Farbiger Namenshintergrund',
    rewardDescription: 'Freischaltung des Name-Tag Design-Systems (Rot, Blau, Grün, Gelb)',
    rewardType: 'feature',
    icon: '🎨',
    badgeText: 'Feature-Freischaltung'
  },
  {
    level: 3,
    xpRequiredForLevel: 200,
    cumulativeXp: 300,
    rewardTitle: 'Detaillierte Spiel-Statistiken',
    rewardDescription: 'Erweiterte Analyse & Durchschnittswerte im Spielerprofil',
    rewardType: 'feature',
    icon: '📊',
    badgeText: 'Feature'
  },
  {
    level: 4,
    xpRequiredForLevel: 300,
    cumulativeXp: 600,
    rewardTitle: 'Sticker & Reaktionen',
    rewardDescription: 'Erste Wiege-Sticker & Reaktionen für das Live-Spiel',
    rewardType: 'cosmetic',
    icon: '✨',
    badgeText: 'Kosmetisch'
  },
  {
    level: 5,
    xpRequiredForLevel: 400,
    cumulativeXp: 1000,
    rewardTitle: 'Silberner Profilrahmen',
    rewardDescription: 'Eleganter Silber-Rahmen um den Spieler-Avatar',
    rewardType: 'cosmetic',
    icon: '🥈',
    badgeText: 'Rahmen'
  },
  {
    level: 6,
    xpRequiredForLevel: 500,
    cumulativeXp: 1500,
    rewardTitle: 'Kneipen-Veteran Abzeichen',
    rewardDescription: 'Auszeichnung für bewährte Stehtisch-Ausdauer',
    rewardType: 'badge',
    icon: '🍺',
    badgeText: 'Abzeichen'
  },
  {
    level: 7,
    xpRequiredForLevel: 600,
    cumulativeXp: 2100,
    rewardTitle: 'Goldene Würfelanimation',
    rewardDescription: 'Exklusiver Effekt bei der Auslosung des Startspielers',
    rewardType: 'feature',
    icon: '🎲',
    badgeText: 'Animation'
  },
  {
    level: 8,
    xpRequiredForLevel: 700,
    cumulativeXp: 2800,
    rewardTitle: 'Individueller Erfolgs-Sound',
    rewardDescription: 'Besonderer Klang bei perfekten Volltreffern (0g)',
    rewardType: 'cosmetic',
    icon: '🔔',
    badgeText: 'Sound'
  },
  {
    level: 9,
    xpRequiredForLevel: 800,
    cumulativeXp: 3600,
    rewardTitle: 'Präzisions-Abzeichen',
    rewardDescription: 'Sonderauszeichnung für millimetergenaue Wiegekunst',
    rewardType: 'badge',
    icon: '🎯',
    badgeText: 'Abzeichen'
  },
  {
    level: 10,
    xpRequiredForLevel: 900,
    cumulativeXp: 4500,
    rewardTitle: 'Goldener Profilrahmen',
    rewardDescription: 'Glänzender Goldrahmen um das Spielerprofil',
    rewardType: 'cosmetic',
    icon: '🥇',
    badgeText: 'Rahmen'
  },
  {
    level: 11,
    xpRequiredForLevel: 1000,
    cumulativeXp: 5500,
    rewardTitle: 'VIP Theken-Status',
    rewardDescription: 'Hervorgehobene Darstellung in Turniertabellen',
    rewardType: 'badge',
    icon: '🍸',
    badgeText: 'Status'
  },
  {
    level: 12,
    xpRequiredForLevel: 1100,
    cumulativeXp: 6600,
    rewardTitle: 'Diamantene Pokalanzeige',
    rewardDescription: 'Exklusiver Pokal-Glanz in der persönlichen Spielübersicht',
    rewardType: 'cosmetic',
    icon: '💎',
    badgeText: 'Kosmetisch'
  },
  {
    level: 13,
    xpRequiredForLevel: 1200,
    cumulativeXp: 7800,
    rewardTitle: 'Erweiterte Rekord-Historie',
    rewardDescription: 'Zugriff auf Langzeit-Trendkurven und Abweichungs-Graphen',
    rewardType: 'feature',
    icon: '📜',
    badgeText: 'Feature'
  },
  {
    level: 14,
    xpRequiredForLevel: 1300,
    cumulativeXp: 9100,
    rewardTitle: 'Turnier-Captain Abzeichen',
    rewardDescription: 'Sonderstatus für erfahrene Spielleiter und Ausrichter',
    rewardType: 'badge',
    icon: '🎖️',
    badgeText: 'Abzeichen'
  },
  {
    level: 15,
    xpRequiredForLevel: 1400,
    cumulativeXp: 10500,
    rewardTitle: 'Platin-Profilrahmen',
    rewardDescription: 'Majestätischer Platin-Rahmen für Spitzenwieger',
    rewardType: 'cosmetic',
    icon: '🛡️',
    badgeText: 'Rahmen'
  },
  {
    level: 16,
    xpRequiredForLevel: 1500,
    cumulativeXp: 12000,
    rewardTitle: 'Krone für den Spieltisch',
    rewardDescription: 'Visuelle Krone auf dem Avatar am Spieltisch',
    rewardType: 'cosmetic',
    icon: '👑',
    badgeText: 'Kosmetisch'
  },
  {
    level: 17,
    xpRequiredForLevel: 1600,
    cumulativeXp: 13600,
    rewardTitle: 'Meister-Emote Pack',
    rewardDescription: 'Animierte Reaktionen für Turniere und Duelle',
    rewardType: 'cosmetic',
    icon: '🔥',
    badgeText: 'Emotes'
  },
  {
    level: 18,
    xpRequiredForLevel: 1700,
    cumulativeXp: 15300,
    rewardTitle: 'Echtzeit-Schnitt Rechner',
    rewardDescription: 'Direkte Hochrechnung des Gesamt-Durchschnitts während des Spiels',
    rewardType: 'feature',
    icon: '⚡',
    badgeText: 'Feature'
  },
  {
    level: 19,
    xpRequiredForLevel: 1800,
    cumulativeXp: 17100,
    rewardTitle: 'Wiege-Titan Emblem',
    rewardDescription: 'Prestigeträchtiges Abzeichen auf Stufe 19',
    rewardType: 'badge',
    icon: '🔱',
    badgeText: 'Emblem'
  },
  {
    level: 20,
    xpRequiredForLevel: 1900,
    cumulativeXp: 19000,
    rewardTitle: 'Legenden-Status & Hall of Fame',
    rewardDescription: 'Eintragung in den ewigen Olymp der 1. Bundeswiega',
    rewardType: 'badge',
    icon: '🌟',
    badgeText: 'Olymp'
  }
];

/**
 * Berechnet die kumulierten Gesamt-XP, die benötigt werden, um ein bestimmtes Level zu erreichen.
 * Liest primär aus der LEVEL_PROGRESSION_TABLE und fällt für Level > 20 auf die Formel zurück.
 */
export const xpForLevel = (level: number): number => {
  if (level <= 1) return 0;
  const entry = LEVEL_PROGRESSION_TABLE.find(e => e.level === level);
  if (entry) return entry.cumulativeXp;
  // Formel für höhere Level: 50 * (L - 1) * L
  return Math.floor(50 * (level - 1) * level);
};

/**
 * Belohnungen / Meilensteine pro Level
 */
export interface LevelReward {
  level: number;
  title: string;
  unlockedTitle?: string;
  badge?: string;
  description: string;
  icon: string;
}

export const LEVEL_REWARDS: LevelReward[] = LEVEL_PROGRESSION_TABLE.map(entry => ({
  level: entry.level,
  title: entry.rewardTitle,
  unlockedTitle: entry.level === 1 ? 'Neuling' : undefined,
  badge: entry.badgeText,
  description: entry.rewardDescription,
  icon: entry.icon
}));

export const getRewardForLevel = (level: number): LevelReward | undefined => {
  return LEVEL_REWARDS.find(r => r.level === level);
};

/**
 * Berechnet das aktuelle Level und den Fortschritt anhand der Gesamt-XP.
 */
export const calculateLevelFromXp = (totalXp: number = 0): LevelInfo => {
  const safeXp = Math.max(0, Math.floor(totalXp));
  
  // Ermittle Level aus der Tabelle
  let level = 1;
  for (let i = LEVEL_PROGRESSION_TABLE.length - 1; i >= 0; i--) {
    if (safeXp >= LEVEL_PROGRESSION_TABLE[i].cumulativeXp) {
      level = LEVEL_PROGRESSION_TABLE[i].level;
      break;
    }
  }

  // Falls über Level 20: Formel verwenden
  if (safeXp >= LEVEL_PROGRESSION_TABLE[LEVEL_PROGRESSION_TABLE.length - 1].cumulativeXp) {
    const rawLevel = Math.floor((1 + Math.sqrt(1 + 4 * (safeXp / 50))) / 2);
    level = Math.max(level, rawLevel);
  }

  const currentLevelStartXp = xpForLevel(level);
  const nextLevelStartXp = xpForLevel(level + 1);
  const neededForNextLevel = Math.max(1, nextLevelStartXp - currentLevelStartXp);
  const currentLevelXp = safeXp - currentLevelStartXp;
  const progressPercent = Math.min(100, Math.max(0, Math.round((currentLevelXp / neededForNextLevel) * 100)));
  const nextReward = LEVEL_REWARDS.find(r => r.level > level);

  return {
    level,
    totalXp: safeXp,
    currentLevelXp,
    neededForNextLevel,
    progressPercent,
    title: getTitleForLevel(level),
    nextReward
  };
};

/**
 * Hilfsfunktion zur schnellen Ermittlung des Levels aus den Gesamt-XP
 */
export const getLevelFromXP = (xp: number): number => {
  return calculateLevelFromXp(xp).level;
};

/**
 * Standardtitel basierend auf dem erreichten Level.
 * Nach der Bereinigung existiert nur noch der Standardtitel "Neuling".
 */
export const getTitleForLevel = (_level: number): string => {
  return 'Neuling';
};

/**
 * Berechnet die in einem Spiel verdienten XP inklusive transparenter Aufschlüsselung.
 */
export const calculateGameXp = (params: GameXpParams): GameXpResult => {
  const items: XpBreakdownItem[] = [];

  // 1. Disqualifikation: Keine XP
  if (params.disqualified) {
    items.push({ label: 'Disqualifiziert', xp: 0, icon: '💀' });
    return { totalXp: 0, items };
  }

  // 2. Special-Mode: Speedwiegen (Gibt nur pauschal 3 XP, keine weiteren Boni)
  if (params.isSpeedMode) {
    items.push({ label: 'Speedwiegen abgeschlossen', xp: 3, icon: '⏱️' });
    return { totalXp: 3, items };
  }

  // 3. Basis-XP für das Beenden eines normalen Spiels
  items.push({ label: 'Spiel abgeschlossen', xp: 5, icon: '🎮' });

  // 4. Präzisions-Bonus (anhand des Durchschnitts in Gramm)
  if (params.avg !== undefined && params.avg !== null) {
    const avg = Number(params.avg);
    if (avg <= 0.5) {
      items.push({ label: 'Göttliche Präzision (Ø ≤ 0,5g)', xp: 10, icon: '🎯' });
    } else if (avg <= 1.0) {
      items.push({ label: 'Scharfschütze (Ø ≤ 1,0g)', xp: 8, icon: '🏹' });
    } else if (avg <= 2.0) {
      items.push({ label: 'Meisterhafte Genauigkeit (Ø ≤ 2,0g)', xp: 5, icon: '⚡' });
    } else if (avg <= 3.5) {
      items.push({ label: 'Gutes Händchen (Ø ≤ 3,5g)', xp: 3, icon: '✨' });
    } else if (avg <= 5.0) {
      items.push({ label: 'Solide Leistung (Ø ≤ 5,0g)', xp: 1, icon: '👍' });
    }
  }

  // 5. Schnäpse / Fehler-Vermeidung (Keine Boni für getrunkene Schnäpse!)
  if (params.schnaepse !== undefined && params.schnaepse !== null) {
    const schnaepse = Number(params.schnaepse);
    if (schnaepse === 0) {
      items.push({ label: 'Fehlerfreie Runde (0 Schnäpse)', xp: 5, icon: '🛡️' });
    } else if (schnaepse <= 2) {
      items.push({ label: 'Wenig Strafen (≤ 2 Schnäpse)', xp: 3, icon: '🍺' });
    }
  }

  // 6. Platzierung im normalen Spiel
  if (params.rank === 1 || params.isWinner) {
    items.push({ label: '1. Platz / Sieg', xp: 2, icon: '🏆' });
  } else if (params.rank === 2) {
    items.push({ label: '2. Platz', xp: 1, icon: '🥈' });
  }

  // 7. Turnier-Ergebnisse am Finaltable
  if (params.tournamentRank === 1) {
    items.push({ label: '1. Platz am Finaltable', xp: 10, icon: '🥇' });
  } else if (params.tournamentRank === 2) {
    items.push({ label: '2. Platz am Finaltable', xp: 5, icon: '🥈' });
  } else if (params.tournamentRank === 3) {
    items.push({ label: '3. Platz am Finaltable', xp: 3, icon: '🥉' });
  }

  const totalXp = items.reduce((sum, item) => sum + item.xp, 0);
  return { totalXp, items };
};

/**
 * Ermittelt faire kumulierte Basis-XP aus historischen Profilstatistiken,
 * falls der Spieler noch keine expliziten XP in der Datenbank gespeichert hat.
 */
export const calculateTotalXpFromStats = (stats: any): number => {
  if (!stats) return 0;
  if (stats.xp !== undefined && stats.xp !== null && Number(stats.xp) > 0) {
    return Number(stats.xp);
  }

  const gamesPlayed = Number(stats.games_played ?? stats.gamesPlayed ?? 0);
  const totalSchnaepse = Number(stats.total_points ?? stats.totalPoints ?? stats.totalSchnaepse ?? 0);
  const achievementsCount = Number(stats.achievements_count ?? stats.achievementsCount ?? 0);
  const gamesWon = Number(stats.games_won ?? stats.gamesWon ?? 0);

  const estimated = (gamesPlayed * 60) + (totalSchnaepse * 8) + (achievementsCount * 30) + (gamesWon * 50);
  return Math.max(0, estimated);
};