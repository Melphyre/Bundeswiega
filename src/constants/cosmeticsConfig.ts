/**
 * Kosmetik- & Design-System für Bundeswiega (Level 5-20 Belohnungen)
 * 
 * Beinhaltet Definitionen, Freischaltstufen, CSS-Klassen und Hilfsfunktionen für:
 * 1. Avatar-Rahmen (avatar_frame)
 * 2. Ingame-Spielspalten-Designs (ingame_column_theme)
 * 3. Ranglisten- & Statistik-Zeilendesigns (leaderboard_row_theme)
 * 4. Namenshintergründe (name_bg_color Erweiterungen)
 */

// ─── 1. AVATAR RAHMEN (avatar_frame) ───
export type AvatarFrameId =
  | 'none'
  | 'oak_wood'
  | 'neon_purple_glow'
  | 'silver_metal'
  | 'fire_aura'
  | 'aurora_glow'
  | 'matrix_green'
  | 'diamond_glow';

export interface AvatarFrameOption {
  id: AvatarFrameId;
  label: string;
  requiredLevel: number;
  description: string;
  icon: string;
  className: string;
}

export const AVATAR_FRAME_OPTIONS: AvatarFrameOption[] = [
  {
    id: 'none',
    label: 'Kein Rahmen',
    requiredLevel: 0,
    description: 'Standard-Avatar ohne zusätzlichen Schmuckrahmen',
    icon: '🚫',
    className: ''
  },
  {
    id: 'oak_wood',
    label: 'Eichen-Holzring',
    requiredLevel: 5,
    description: 'Edler Holzring um den Avatar (Meilenstein 1)',
    icon: '🪵',
    className: 'frame-oak_wood'
  },
  {
    id: 'neon_purple_glow',
    label: 'Pulsierender lila Glow',
    requiredLevel: 8,
    description: 'Pulsierender lila Neon-Glow um den Avatar',
    icon: '💜',
    className: 'frame-neon_purple_glow'
  },
  {
    id: 'silver_metal',
    label: 'Silber-Metall',
    requiredLevel: 10,
    description: 'Glänzender Metall-Look mit Silberglanz (Silber-Meilenstein)',
    icon: '🥈',
    className: 'frame-silver_metal'
  },
  {
    id: 'fire_aura',
    label: 'Feuer-Aura',
    requiredLevel: 13,
    description: 'Animierter, feuriger Glow um den Avatar',
    icon: '🔥',
    className: 'frame-fire_aura'
  },
  {
    id: 'aurora_glow',
    label: 'Nordlicht-Aura',
    requiredLevel: 15,
    description: 'Nordlicht-Aura: Animierter grün-türkis-violetter Schimmer-Kranz (Gold-Meilenstein)',
    icon: '🌌',
    className: 'frame-aurora_glow'
  },
  {
    id: 'matrix_green',
    label: 'Matrix-Digital',
    requiredLevel: 17,
    description: 'Grün pulsierendes Digital-Muster um den Avatar',
    icon: '💚',
    className: 'frame-matrix_green'
  },
  {
    id: 'diamond_glow',
    label: 'Diamant-Schimmer',
    requiredLevel: 20,
    description: 'Prismatischer Diamant-Schimmer mit regenbogenfarbenen Lichtreflexen (Gott-Status)',
    icon: '💎',
    className: 'frame-diamond_glow'
  }
];

// ─── 2. SPIELSPALTEN-DESIGNS (ingame_column_theme) ───
export type IngameColumnThemeId =
  | 'none'
  | 'bronze_highlight'
  | 'gradient_header'
  | 'lightning_bolts'
  | 'gold_column'
  | 'plasma_wave'
  | 'diamond_crown';

export interface IngameColumnThemeOption {
  id: IngameColumnThemeId;
  label: string;
  requiredLevel: number;
  description: string;
  icon: string;
  className: string;
}

export const INGAME_COLUMN_THEME_OPTIONS: IngameColumnThemeOption[] = [
  {
    id: 'none',
    label: 'Standard-Spalte',
    requiredLevel: 0,
    description: 'Klassisches Spaltendesign in der Spieltabelle',
    icon: '🚫',
    className: ''
  },
  {
    id: 'bronze_highlight',
    label: 'Bronze Highlight',
    requiredLevel: 5,
    description: 'Dezenter Bronze-Hintergrund für die eigene Spalte im Spiel',
    icon: '🥉',
    className: 'column-theme-bronze_highlight'
  },
  {
    id: 'gradient_header',
    label: 'Farbverlauf-Header',
    requiredLevel: 9,
    description: 'Sanfter Farbverlauf hinter dem Avatar am oberen Ende der Spielspalte',
    icon: '🌅',
    className: 'column-theme-gradient_header'
  },
  {
    id: 'lightning_bolts',
    label: 'Blitz-Gewitter',
    requiredLevel: 12,
    description: 'Glow-Border mit dezent animierten Blitz-Effekten an den Seiten der Spielspalte',
    icon: '⚡',
    className: 'column-theme-lightning_bolts'
  },
  {
    id: 'gold_column',
    label: 'Goldene Spielspalte',
    requiredLevel: 15,
    description: 'Eigene Spalte strahlt in edlem Gold-Hintergrund',
    icon: '🥇',
    className: 'column-theme-gold_column'
  },
  {
    id: 'plasma_wave',
    label: 'Plasma-Welle',
    requiredLevel: 19,
    description: 'Pulsierende Energie-Welle an den Rändern der Spalte',
    icon: '🌊',
    className: 'column-theme-plasma_wave'
  },
  {
    id: 'diamond_crown',
    label: 'Diamant-Krone',
    requiredLevel: 20,
    description: 'Exklusiver Kronen-Header über dem Avatar & Diamant-Border',
    icon: '👑',
    className: 'column-theme-diamond_crown'
  }
];

// ─── 3. RANGLISTEN-ZEILEN (leaderboard_row_theme) ───
export type LeaderboardRowThemeId =
  | 'none'
  | 'carbon_fiber'
  | 'silver_contour'
  | 'brushed_steel'
  | 'gold_glow'
  | 'royal_blue_gold'
  | 'rainbow_aurora';

export interface LeaderboardRowThemeOption {
  id: LeaderboardRowThemeId;
  label: string;
  requiredLevel: number;
  description: string;
  icon: string;
  className: string;
}

export const LEADERBOARD_ROW_THEME_OPTIONS: LeaderboardRowThemeOption[] = [
  {
    id: 'none',
    label: 'Standard-Zeile',
    requiredLevel: 0,
    description: 'Klassische Tabellenzeile ohne besonderen Rand- oder Hintergrundeffekt',
    icon: '🚫',
    className: ''
  },
  {
    id: 'carbon_fiber',
    label: 'Carbon-Faser',
    requiredLevel: 7,
    description: 'Dunkles Carbon-Muster für Ranglisten- & Statistik-Einträge',
    icon: '⬛',
    className: 'row-theme-carbon_fiber'
  },
  {
    id: 'silver_contour',
    label: 'Silber-Kontur',
    requiredLevel: 10,
    description: 'Silberne Kontur & dezenter Metall-Gleim',
    icon: '🥈',
    className: 'row-theme-silver_contour'
  },
  {
    id: 'brushed_steel',
    label: 'Gebürsteter Edelstahl',
    requiredLevel: 14,
    description: 'Gebürsteter Edelstahl-Look in der Rangliste',
    icon: '🛡️',
    className: 'row-theme-brushed_steel'
  },
  {
    id: 'gold_glow',
    label: 'Gold-Glow',
    requiredLevel: 15,
    description: 'Goldener Rand mit glänzendem Lichtreflex',
    icon: '✨',
    className: 'row-theme-gold_glow'
  },
  {
    id: 'royal_blue_gold',
    label: 'Königsblau & Gold',
    requiredLevel: 18,
    description: 'Königsblaues Feld mit feiner Goldkante',
    icon: '👑',
    className: 'row-theme-royal_blue_gold'
  },
  {
    id: 'rainbow_aurora',
    label: 'Rainbow-Polarlichter',
    requiredLevel: 20,
    description: 'Sticht extrem durch fließende Rainbow-Polarlichter hervor',
    icon: '🌈',
    className: 'row-theme-rainbow_aurora'
  }
];

// ─── SICHTBARKEITS-REGELN & HILFSFUNKTIONEN ───

/**
 * Zeige Kategorie "Avatar-Rahmen" erst an, wenn mindestens 1 Design freigeschaltet ist (ab Level 5).
 */
export const hasUnlockedAnyAvatarFrame = (level: number): boolean => {
  return level >= 5;
};

/**
 * Zeige Kategorie "Spielspalten-Design" erst an, wenn mindestens 1 Design freigeschaltet ist (ab Level 5).
 */
export const hasUnlockedAnyColumnTheme = (level: number): boolean => {
  return level >= 5;
};

/**
 * Zeige Kategorie "Ranglisten-Design" erst an, wenn mindestens 1 Design freigeschaltet ist (ab Level 7).
 */
export const hasUnlockedAnyRowTheme = (level: number): boolean => {
  return level >= 7;
};

/**
 * Zeige Kategorie "Namenshintergründe" an (ab Level 2).
 */
export const hasUnlockedAnyNameBg = (level: number): boolean => {
  return level >= 2;
};

/**
 * Liefert alle für das Level freigeschalteten Avatar-Rahmen (inklusive 'none').
 */
export const getUnlockedAvatarFrames = (level: number): AvatarFrameOption[] => {
  return AVATAR_FRAME_OPTIONS.filter(opt => opt.requiredLevel === 0 || opt.requiredLevel <= level);
};

/**
 * Liefert alle für das Level freigeschalteten Spalten-Designs (inklusive 'none').
 */
export const getUnlockedColumnThemes = (level: number): IngameColumnThemeOption[] => {
  return INGAME_COLUMN_THEME_OPTIONS.filter(opt => opt.requiredLevel === 0 || opt.requiredLevel <= level);
};

/**
 * Liefert alle für das Level freigeschalteten Zeilen-Designs (inklusive 'none').
 */
export const getUnlockedRowThemes = (level: number): LeaderboardRowThemeOption[] => {
  return LEADERBOARD_ROW_THEME_OPTIONS.filter(opt => opt.requiredLevel === 0 || opt.requiredLevel <= level);
};

/**
 * Liefert die CSS-Klasse für einen Avatar-Rahmen.
 */
export const getAvatarFrameClass = (frameId?: string | null): string => {
  if (!frameId || frameId === 'none') return '';
  const match = AVATAR_FRAME_OPTIONS.find(f => f.id === frameId);
  return match?.className || '';
};

/**
 * Liefert die CSS-Klasse für ein Spalten-Design.
 */
export const getColumnThemeClass = (themeId?: string | null): string => {
  if (!themeId || themeId === 'none') return '';
  const match = INGAME_COLUMN_THEME_OPTIONS.find(c => c.id === themeId);
  return match?.className || '';
};

/**
 * Liefert die CSS-Klasse für ein Zeilen-Design.
 */
export const getRowThemeClass = (themeId?: string | null): string => {
  if (!themeId || themeId === 'none') return '';
  const match = LEADERBOARD_ROW_THEME_OPTIONS.find(r => r.id === themeId);
  return match?.className || '';
};

export const getAvatarFrameOption = (frameId?: string | null): AvatarFrameOption => {
  if (!frameId || frameId === 'none') return AVATAR_FRAME_OPTIONS[0];
  return AVATAR_FRAME_OPTIONS.find(f => f.id === frameId) || AVATAR_FRAME_OPTIONS[0];
};

export const getColumnThemeOption = (themeId?: string | null): IngameColumnThemeOption => {
  if (!themeId || themeId === 'none') return INGAME_COLUMN_THEME_OPTIONS[0];
  return INGAME_COLUMN_THEME_OPTIONS.find(c => c.id === themeId) || INGAME_COLUMN_THEME_OPTIONS[0];
};

export const getRowThemeOption = (themeId?: string | null): LeaderboardRowThemeOption => {
  if (!themeId || themeId === 'none') return LEADERBOARD_ROW_THEME_OPTIONS[0];
  return LEADERBOARD_ROW_THEME_OPTIONS.find(r => r.id === themeId) || LEADERBOARD_ROW_THEME_OPTIONS[0];
};
