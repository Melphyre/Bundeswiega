import type { CSSProperties } from 'react';

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
export type AvatarFramePatternId =
  | 'none'
  | 'neon-glow'
  | 'laser-pulse'
  | 'double-border'
  | 'oak_wood'
  | 'neon_purple_glow'
  | 'silver_metal'
  | 'fire_aura'
  | 'aurora_glow'
  | 'matrix_green'
  | 'diamond_glow';

export type AvatarFrameId = AvatarFramePatternId | string;

export interface AvatarFrameOption {
  id: AvatarFramePatternId;
  label: string;
  requiredLevel: number;
  description: string;
  icon: string;
  className: string;
}

export interface FrameColorSwatch {
  id: string;
  label: string;
  hex: string;
}

export const FRAME_COLOR_SWATCHES: FrameColorSwatch[] = [
  { id: 'cyan', label: 'Neon Cyan', hex: '#06B6D4' },
  { id: 'blue', label: 'Neon Blau', hex: '#3B82F6' },
  { id: 'purple', label: 'Neon Lila', hex: '#A855F7' },
  { id: 'pink', label: 'Neon Pink', hex: '#EC4899' },
  { id: 'red', label: 'Neon Rot', hex: '#EF4444' },
  { id: 'orange', label: 'Neon Orange', hex: '#F97316' },
  { id: 'amber', label: 'Gold Amber', hex: '#FBBF24' },
  { id: 'green', label: 'Smaragd Grün', hex: '#10B981' },
  { id: 'mint', label: 'Neon Mint', hex: '#00FFA3' },
  { id: 'white', label: 'Eisweiß', hex: '#FFFFFF' }
];

export const AVATAR_FRAME_PATTERNS: AvatarFrameOption[] = [
  {
    id: 'none',
    label: 'Kein Rahmen',
    requiredLevel: 0,
    description: 'Standard-Avatar ohne zusätzlichen Schmuckrahmen',
    icon: '🚫',
    className: ''
  },
  {
    id: 'neon-glow',
    label: 'Pulsierender Neon-Glow',
    requiredLevel: 5,
    description: 'Pulsierender Neon-Leuchtrahmen in deiner gewählten Leuchtfarbe',
    icon: '✨',
    className: 'avatar-frame-neon-glow'
  },
  {
    id: 'laser-pulse',
    label: 'Laufender Laser-Rahmen',
    requiredLevel: 5,
    description: 'Intensiv pulsierender Laser-Glow um den Avatar',
    icon: '⚡',
    className: 'avatar-frame-laser-pulse'
  },
  {
    id: 'double-border',
    label: 'Industrie-Neonrahmen (Flimmern)',
    requiredLevel: 5,
    description: 'Doppelter Industrie-Neon-Schlauch mit authentischem Wackelkontakt & Flimmer-Effekt',
    icon: '⚡',
    className: 'avatar-frame-double-border'
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
    description: 'Animierter feuriger Glow um den Avatar',
    icon: '🔥',
    className: 'frame-fire_aura'
  },
  {
    id: 'aurora_glow',
    label: 'Nordlicht-Aura',
    requiredLevel: 15,
    description: 'Nordlicht-Aura: Animierter Schimmer-Kranz (Gold-Meilenstein)',
    icon: '🌌',
    className: 'frame-aurora_glow'
  },
  {
    id: 'matrix_green',
    label: 'Matrix-Digital',
    requiredLevel: 17,
    description: 'Pulsierendes Digital-Muster um den Avatar',
    icon: '💚',
    className: 'frame-matrix_green'
  },
  {
    id: 'diamond_glow',
    label: 'Diamant-Schimmer',
    requiredLevel: 20,
    description: 'Prismatischer Diamant-Schimmer mit Lichtreflexen (Gott-Status)',
    icon: '💎',
    className: 'frame-diamond_glow'
  }
];

export const AVATAR_FRAME_OPTIONS: AvatarFrameOption[] = [
  ...AVATAR_FRAME_PATTERNS,
  {
    id: 'neon_purple_glow',
    label: 'Pulsierender lila Glow',
    requiredLevel: 8,
    description: 'Pulsierender lila Neon-Glow um den Avatar',
    icon: '💜',
    className: 'avatar-frame-neon-glow'
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

export interface ParsedAvatarFrame {
  pattern: AvatarFramePatternId;
  colorHex: string;
  className: string;
  style: CSSProperties;
  label: string;
  description: string;
  icon: string;
  serialized: string;
}

/**
 * Parst einen gespeicherten Avatar-Rahmen (z. B. "neon-glow:#3B82F6" oder legacy "neon_purple_glow")
 * in Muster, Swatch-Farbe, CSS-Klasse und Inline-Style (--frame-color).
 */
export const parseAvatarFrame = (rawFrame?: string | null): ParsedAvatarFrame => {
  const fallbackColor = '#3B82F6';
  if (!rawFrame || rawFrame === 'none' || rawFrame.trim() === '') {
    return {
      pattern: 'none',
      colorHex: fallbackColor,
      className: '',
      style: {},
      label: 'Kein Rahmen',
      description: 'Standard-Avatar ohne zusätzlichen Schmuckrahmen',
      icon: '🚫',
      serialized: 'none'
    };
  }

  let patternPart = rawFrame.trim();
  let colorHex = fallbackColor;

  if (rawFrame.includes(':')) {
    const parts = rawFrame.split(':');
    patternPart = parts[0].trim();
    colorHex = parts[1]?.trim() || fallbackColor;
  } else if (rawFrame === 'neon_purple_glow') {
    patternPart = 'neon-glow';
    colorHex = '#A855F7';
  } else if (rawFrame === 'oak_wood') {
    colorHex = '#8B5A2B';
  } else if (rawFrame === 'fire_aura') {
    colorHex = '#F97316';
  } else if (rawFrame === 'aurora_glow') {
    colorHex = '#06B6D4';
  } else if (rawFrame === 'matrix_green') {
    colorHex = '#22C55E';
  } else if (rawFrame === 'diamond_glow') {
    colorHex = '#38BDF8';
  } else if (rawFrame === 'silver_metal') {
    colorHex = '#CBD5E1';
  }

  const patternOpt =
    AVATAR_FRAME_PATTERNS.find(p => p.id === patternPart) ||
    AVATAR_FRAME_OPTIONS.find(p => p.id === patternPart) ||
    AVATAR_FRAME_PATTERNS[0];

  const className = patternOpt.className || '';
  const style: CSSProperties = patternOpt.id === 'none' ? {} : {
    ['--frame-color' as any]: colorHex,
    borderColor: colorHex
  };

  return {
    pattern: patternOpt.id,
    colorHex,
    className,
    style,
    label: patternOpt.label,
    description: patternOpt.description,
    icon: patternOpt.icon,
    serialized: patternOpt.id === 'none' ? 'none' : `${patternOpt.id}:${colorHex}`
  };
};

/**
 * Liefert alle für das Level freigeschalteten Avatar-Rahmen (inklusive 'none').
 */
export const getUnlockedAvatarFrames = (level: number): AvatarFrameOption[] => {
  return AVATAR_FRAME_OPTIONS.filter(opt => opt.requiredLevel === 0 || opt.requiredLevel <= level);
};

export const getUnlockedAvatarFramePatterns = (level: number): AvatarFrameOption[] => {
  return AVATAR_FRAME_PATTERNS.filter(opt => opt.requiredLevel === 0 || opt.requiredLevel <= level);
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
  return parseAvatarFrame(frameId).className;
};

/**
 * Liefert den Inline-Style für einen Avatar-Rahmen (z. B. --frame-color).
 */
export const getAvatarFrameStyle = (frameId?: string | null): CSSProperties => {
  return parseAvatarFrame(frameId).style;
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
  const parsed = parseAvatarFrame(frameId);
  return (
    AVATAR_FRAME_PATTERNS.find(f => f.id === parsed.pattern) ||
    AVATAR_FRAME_OPTIONS.find(f => f.id === parsed.pattern) ||
    AVATAR_FRAME_OPTIONS[0]
  );
};

export const getColumnThemeOption = (themeId?: string | null): IngameColumnThemeOption => {
  if (!themeId || themeId === 'none') return INGAME_COLUMN_THEME_OPTIONS[0];
  return INGAME_COLUMN_THEME_OPTIONS.find(c => c.id === themeId) || INGAME_COLUMN_THEME_OPTIONS[0];
};

export const getRowThemeOption = (themeId?: string | null): LeaderboardRowThemeOption => {
  if (!themeId || themeId === 'none') return LEADERBOARD_ROW_THEME_OPTIONS[0];
  return LEADERBOARD_ROW_THEME_OPTIONS.find(r => r.id === themeId) || LEADERBOARD_ROW_THEME_OPTIONS[0];
};
