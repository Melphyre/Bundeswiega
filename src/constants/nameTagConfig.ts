import React from 'react';

/**
 * =========================================================================
 * ORTHOGONALES NAMENSHINTERGRUND-SYSTEM (Farben & Animationen/Muster entkoppelt)
 * =========================================================================
 * 
 * Jede freigeschaltete Farbe kann mit jedem freigeschalteten Effekt kombiniert werden.
 * Speicherung in Supabase:
 * - profiles.name_bg_color = "color:animation" (z.B. "red:flag", "toxic_green:matrix")
 * - profiles.bg_color = "color"
 * - profiles.bg_animation = "animation"
 */

// ─── 1. REINE UNIFARBEN (bg_color) ───
export type NameBgColorId =
  | 'none'
  | 'red'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'pink'
  | 'turquoise'
  | 'neon_orange'
  | 'royal_blue'
  | 'deep_purple'
  | 'toxic_green'
  | 'gold_solid'
  | 'black'
  | 'white'
  | 'neon_mint'
  // Legacy aliases
  | 'pattern_carbon'
  | 'pattern_cyberpunk'
  | 'pattern_gold_glitter'
  | 'pattern_matrix'
  | 'pattern_tartan'
  | 'cyberpunk_pink_yellow'
  | 'aurora_name_glow'
  | 'galaxy_pattern';

export interface NameBgColorOption {
  id: NameBgColorId;
  label: string;
  bgHex: string;
  textHex: string;
  borderHex: string;
  requiredLevel: number;
  requiredQuestId?: string;
  unlockConditionText?: string;
  cssClasses: string;
  textCssClasses: string;
}

export const NAME_BG_COLORS: NameBgColorOption[] = [
  {
    id: 'none',
    label: 'Kein Hintergrund',
    bgHex: 'transparent',
    textHex: 'inherit',
    borderHex: 'transparent',
    cssClasses: 'bg-transparent',
    textCssClasses: '',
    requiredLevel: 0
  },
  {
    id: 'red',
    label: 'Rot',
    bgHex: '#DC2626',
    textHex: '#FFFFFF',
    borderHex: '#B91C1C',
    cssClasses: 'bg-red-600 text-white shadow-sm border border-red-700/60',
    textCssClasses: 'text-white font-black',
    requiredLevel: 2
  },
  {
    id: 'yellow',
    label: 'Gelb',
    bgHex: '#FACC15',
    textHex: '#0F172A',
    borderHex: '#EAB308',
    cssClasses: 'bg-amber-400 text-slate-950 shadow-sm border border-amber-500/60',
    textCssClasses: 'text-slate-950 font-black',
    requiredLevel: 2
  },
  {
    id: 'green',
    label: 'Grün',
    bgHex: '#16A34A',
    textHex: '#FFFFFF',
    borderHex: '#15803D',
    cssClasses: 'bg-emerald-600 text-white shadow-sm border border-emerald-700/60',
    textCssClasses: 'text-white font-black',
    requiredLevel: 2
  },
  {
    id: 'blue',
    label: 'Blau',
    bgHex: '#2563EB',
    textHex: '#FFFFFF',
    borderHex: '#1D4ED8',
    cssClasses: 'bg-blue-600 text-white shadow-sm border border-blue-700/60',
    textCssClasses: 'text-white font-black',
    requiredLevel: 2
  },
  {
    id: 'pink',
    label: 'Pink',
    bgHex: '#EC4899',
    textHex: '#FFFFFF',
    borderHex: '#DB2777',
    cssClasses: 'bg-pink-500 text-white shadow-sm border border-pink-600',
    textCssClasses: 'text-white font-black',
    requiredLevel: 2,
    requiredQuestId: 'l2_50_achievements',
    unlockConditionText: 'Quest: Sammle 50 Achievements'
  },
  {
    id: 'turquoise',
    label: 'Türkis',
    bgHex: '#0D9488',
    textHex: '#FFFFFF',
    borderHex: '#0F766E',
    cssClasses: 'bg-teal-600 text-white shadow-sm border border-teal-700',
    textCssClasses: 'text-white font-black',
    requiredLevel: 2,
    requiredQuestId: 'l2_5_wins_standard',
    unlockConditionText: 'Quest: Gewinne 5 Standardspiele'
  },
  {
    id: 'neon_orange',
    label: 'Neon-Orange',
    bgHex: '#FF5E00',
    textHex: '#FFFFFF',
    borderHex: '#EA580C',
    cssClasses: 'bg-[#FF5E00] text-white shadow-md shadow-[#FF5E00]/40 border border-[#EA580C]',
    textCssClasses: 'text-white font-black',
    requiredLevel: 2,
    requiredQuestId: 'l2_neon_orange',
    unlockConditionText: 'Quest: Spiele 8 Standardspiele'
  },
  {
    id: 'royal_blue',
    label: 'Königsblau',
    bgHex: '#1E3A8A',
    textHex: '#FFFFFF',
    borderHex: '#3B82F6',
    cssClasses: 'bg-[#1E3A8A] text-white shadow-md shadow-blue-900/60 border border-blue-400',
    textCssClasses: 'text-white font-black',
    requiredLevel: 2,
    requiredQuestId: 'l2_royal_blue',
    unlockConditionText: 'Quest: Erreiche 3x einen Durchschnitt < 3 Gramm'
  },
  {
    id: 'deep_purple',
    label: 'Purpur',
    bgHex: '#4C1D95',
    textHex: '#FFFFFF',
    borderHex: '#7C3AED',
    cssClasses: 'bg-[#4C1D95] text-purple-100 shadow-md shadow-purple-950/60 border border-purple-500',
    textCssClasses: 'text-purple-100 font-black',
    requiredLevel: 2,
    requiredQuestId: 'l2_deep_purple',
    unlockConditionText: 'Quest: Nimm an 5 Teamwiegen teil'
  },
  {
    id: 'toxic_green',
    label: 'Giftgrün',
    bgHex: '#76FF03',
    textHex: '#022C22',
    borderHex: '#39FF14',
    cssClasses: 'bg-[#76FF03] text-slate-950 shadow-md shadow-[#76FF03]/40 border border-[#39FF14]',
    textCssClasses: 'text-slate-950 font-black',
    requiredLevel: 2,
    requiredQuestId: 'l2_toxic_green',
    unlockConditionText: 'Quest: Spiele 5 Speedwiegen'
  },
  {
    id: 'gold_solid',
    label: 'Gold-Gelb',
    bgHex: '#D97706',
    textHex: '#FFFFFF',
    borderHex: '#F59E0B',
    cssClasses: 'bg-[#D97706] text-white shadow-md shadow-amber-900/60 border border-amber-300',
    textCssClasses: 'text-white font-black',
    requiredLevel: 2,
    requiredQuestId: 'l2_gold_solid',
    unlockConditionText: 'Quest: Gewinne 3 Turniere'
  },
  {
    id: 'black',
    label: 'Schwarz',
    bgHex: '#0F172A',
    textHex: '#FFFFFF',
    borderHex: '#334155',
    cssClasses: 'bg-slate-950 text-white shadow-sm border border-slate-700',
    textCssClasses: 'text-white font-black',
    requiredLevel: 3,
    unlockConditionText: 'Freischaltung ab Level 3'
  },
  {
    id: 'white',
    label: 'Weiß',
    bgHex: '#FFFFFF',
    textHex: '#0F172A',
    borderHex: '#CBD5E1',
    cssClasses: 'bg-white text-slate-950 shadow-sm border border-slate-300',
    textCssClasses: 'text-slate-950 font-black',
    requiredLevel: 3,
    unlockConditionText: 'Freischaltung ab Level 3'
  },
  {
    id: 'neon_mint',
    label: 'Neon-Mint',
    bgHex: '#00FFA3',
    textHex: '#0F172A',
    borderHex: '#00E08F',
    cssClasses: 'bg-[#00FFA3] text-slate-950 shadow-sm border border-[#00E08F]',
    textCssClasses: 'text-slate-950 font-black',
    requiredLevel: 6,
    unlockConditionText: 'Freischaltung ab Level 6'
  }
];

// Backwards-compatible alias for existing imports
export const NAME_TAG_COLORS = NAME_BG_COLORS;

// ─── 2. ANIMATIONEN & MUSTER (bg_animation) ───
export type NameBgAnimationId =
  | 'none'
  | 'flag'
  | 'carbon'
  | 'cyberpunk'
  | 'glitter'
  | 'matrix'
  | 'tartan'
  | 'fire'
  | 'lightning'
  | 'snow'
  | 'waves';

export interface NameBgAnimationOption {
  id: NameBgAnimationId;
  label: string;
  icon: string;
  description: string;
  cssClass: string;
  requiredLevel: number;
  requiredQuestId?: string;
  unlockConditionText?: string;
}

export const NAME_BG_ANIMATIONS: NameBgAnimationOption[] = [
  {
    id: 'none',
    label: 'Keine (Einfarbig)',
    icon: '🚫',
    description: 'Klassischer, reiner Unifarbton ohne Zusatzeffekt',
    cssClass: '',
    requiredLevel: 0
  },
  {
    id: 'flag',
    label: 'Flagge',
    icon: '🚩',
    description: 'Ein leichter, dunkler Schatten-/Waber-Effekt, der wie eine im Wind wehende Flagge über den Hintergrund zieht',
    cssClass: 'name-anim-flag',
    requiredLevel: 3,
    requiredQuestId: 'l3_flag_animation_quest',
    unlockConditionText: 'Quest: Nimm an 5 Teamwiegen teil'
  },
  {
    id: 'carbon',
    label: 'Carbon',
    icon: '🏁',
    description: 'Animierter Carboneffekt mit feiner Fasertextur und Lichtglanz',
    cssClass: 'name-anim-carbon',
    requiredLevel: 3,
    requiredQuestId: 'l3_pattern_carbon',
    unlockConditionText: 'Quest: Absolviere 20 Spiele'
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk',
    icon: '⚡',
    description: 'Farbige Blitze in deiner gewählten Farbe, die auf schwarzem Grund zucken',
    cssClass: 'name-anim-cyberpunk',
    requiredLevel: 3,
    requiredQuestId: 'l3_pattern_cyberpunk',
    unlockConditionText: 'Quest: Erreiche 5x einen Durchschnitt unter 3 Gramm'
  },
  {
    id: 'glitter',
    label: 'Glitzer',
    icon: '✨',
    description: 'Kleine animierte Sternchen, die in der Komplementärfarbe zum gewählten Hintergrund aufleuchten',
    cssClass: 'name-anim-glitter',
    requiredLevel: 3,
    requiredQuestId: 'l3_pattern_gold_glitter',
    unlockConditionText: 'Quest: Nimm an 8 Teamwiegen teil'
  },
  {
    id: 'matrix',
    label: 'Matrix',
    icon: '💻',
    description: 'Farbige Neon-Zahlen in deiner gewählten Farbe, die auf schwarzem Grund von oben nach unten laufen',
    cssClass: 'name-anim-matrix',
    requiredLevel: 3,
    requiredQuestId: 'l3_pattern_matrix',
    unlockConditionText: 'Quest: Spiele 10 Speedwiegen'
  },
  {
    id: 'tartan',
    label: 'Tartan',
    icon: '🧣',
    description: 'Ein kariertes Schottenmuster in deiner gewählten Farbe',
    cssClass: 'name-anim-tartan',
    requiredLevel: 3,
    requiredQuestId: 'l3_pattern_tartan',
    unlockConditionText: 'Quest: Sammle 50 Achievements'
  },
  // Neue Level-4 Animationen
  {
    id: 'fire',
    label: 'Feuer',
    icon: '🔥',
    description: 'Züngelnde Flammen und aufsteigende Glut-Partikel über deinem gewählten Hintergrund',
    cssClass: 'name-anim-fire',
    requiredLevel: 4,
    requiredQuestId: 'l4_fire_animation_quest',
    unlockConditionText: 'Quest: Lande 10 Volltreffer'
  },
  {
    id: 'lightning',
    label: 'Blitze',
    icon: '⚡',
    description: 'Helle Blitze, die von oben nach unten vertikal über das Namensschild zucken',
    cssClass: 'name-anim-lightning',
    requiredLevel: 4,
    requiredQuestId: 'l4_lightning_animation_quest',
    unlockConditionText: 'Quest: Triff 10 mal eine Schnapszahl'
  },
  {
    id: 'snow',
    label: 'Schneeflocken',
    icon: '❄️',
    description: 'Sanft rieselnde Schneeflocken und Eiskristalle über deinem gewählten Hintergrund',
    cssClass: 'name-anim-snow',
    requiredLevel: 4,
    requiredQuestId: 'l4_snow_animation_quest',
    unlockConditionText: 'Quest: Erziele 10 mal das selbe Gewicht wie ein anderer Spieler'
  },
  {
    id: 'waves',
    label: 'Wasser & Wellen',
    icon: '🌊',
    description: 'Sanft fließende und pulsierende Wasserwellen-Muster über dem Namensschild',
    cssClass: 'name-anim-waves',
    requiredLevel: 4,
    requiredQuestId: 'l4_waves_animation_quest',
    unlockConditionText: 'Quest: Lande 10 mal auf einer vollen Hunderterzahl'
  }
];

// ─── 3. HILFSFUNKTIONEN: KOMPLEMENTÄRFARBEN & ALIASE ───

/**
 * Ermittelt die exakte Komplementärfarbe (für den Glitzer-Effekt).
 */
export const getComplementaryColorHex = (hex: string): string => {
  const clean = (hex || '').replace('#', '').trim();
  if (clean.length === 6) {
    const r = 255 - parseInt(clean.slice(0, 2), 16);
    const g = 255 - parseInt(clean.slice(2, 4), 16);
    const b = 255 - parseInt(clean.slice(4, 6), 16);
    // Vermeide zu dunkle Komplementärfarben für Glitzer-Sternchen
    const lum = (0.299 * r + 0.587 * g + 0.114 * b);
    if (lum < 90) {
      return '#FDE047'; // Helles Gold/Gelb als Leucht-Fallback
    }
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  return '#FDE047';
};

// Aliase für Farb-Namen und Legacy-Keys
const COLOR_ALIAS_MAP: Record<string, NameBgColorId> = {
  none: 'none',
  keine: 'none',
  transparent: 'none',
  rot: 'red',
  red: 'red',
  gelb: 'yellow',
  yellow: 'yellow',
  gruen: 'green',
  grün: 'green',
  green: 'green',
  blau: 'blue',
  blue: 'blue',
  schwarz: 'black',
  black: 'black',
  weiss: 'white',
  weiß: 'white',
  white: 'white',
  rosa: 'pink',
  pink: 'pink',
  tuerkis: 'turquoise',
  türkis: 'turquoise',
  turquoise: 'turquoise',
  orange: 'neon_orange',
  neonorange: 'neon_orange',
  neon_orange: 'neon_orange',
  koenigsblau: 'royal_blue',
  königsblau: 'royal_blue',
  royal_blue: 'royal_blue',
  purpur: 'deep_purple',
  violett: 'deep_purple',
  deep_purple: 'deep_purple',
  giftgruen: 'toxic_green',
  giftgrün: 'toxic_green',
  toxic_green: 'toxic_green',
  gold: 'gold_solid',
  gold_gelb: 'gold_solid',
  gold_solid: 'gold_solid',
  neon_mint: 'neon_mint',
  mint: 'neon_mint'
};

const ANIMATION_ALIAS_MAP: Record<string, NameBgAnimationId> = {
  none: 'none',
  keine: 'none',
  einfarbig: 'none',
  flag: 'flag',
  flagge: 'flag',
  waber: 'flag',
  carbon: 'carbon',
  carbon_fiber: 'carbon',
  cyberpunk: 'cyberpunk',
  glitter: 'glitter',
  glitzer: 'glitter',
  matrix: 'matrix',
  tartan: 'tartan',
  karo: 'tartan',
  fire: 'fire',
  feuer: 'fire',
  flamme: 'fire',
  flammen: 'fire',
  lightning: 'lightning',
  blitz: 'lightning',
  blitze: 'lightning',
  snow: 'snow',
  schnee: 'snow',
  schneeflocken: 'snow',
  waves: 'waves',
  welle: 'waves',
  wellen: 'waves',
  wasser: 'waves'
};

// ─── 4. PARSER: DECOUPLING COLOR & ANIMATION ───

export interface ParsedNameBg {
  colorId: NameBgColorId;
  animationId: NameBgAnimationId;
  colorOption: NameBgColorOption;
  animationOption: NameBgAnimationOption;
  label: string;
  compositeKey: string;
  bgHex: string;
  textHex: string;
  borderHex: string;
  compHex: string;
  cssClasses: string;
  textCssClasses: string;
  style: React.CSSProperties;
  id: string; // compatibility with existing consumers
}

/**
 * Zerlegt einen zusammengesetzten Farb- & Effekt-Key ("color:animation" oder Legacy "pattern_matrix" etc.)
 * in seine orthogonalen Bestandteile.
 */
export const parseNameBg = (raw?: string | null): ParsedNameBg => {
  if (!raw || raw === 'none' || raw === 'transparent') {
    const noneColor = NAME_BG_COLORS[0];
    const noneAnim = NAME_BG_ANIMATIONS[0];
    return {
      id: 'none',
      colorId: 'none',
      animationId: 'none',
      colorOption: noneColor,
      animationOption: noneAnim,
      label: 'Kein Hintergrund',
      compositeKey: 'none:none',
      bgHex: 'transparent',
      textHex: 'inherit',
      borderHex: 'transparent',
      compHex: '#FDE047',
      cssClasses: 'bg-transparent',
      textCssClasses: '',
      style: {}
    };
  }

  const clean = raw.trim().toLowerCase();
  let resolvedColorId: NameBgColorId = 'blue';
  let resolvedAnimId: NameBgAnimationId = 'none';

  if (clean.includes(':')) {
    const [cPart, aPart] = clean.split(':');
    resolvedColorId = COLOR_ALIAS_MAP[cPart] || (cPart as NameBgColorId) || 'blue';
    resolvedAnimId = ANIMATION_ALIAS_MAP[aPart] || (aPart as NameBgAnimationId) || 'none';
  } else {
    // Migration von Legacy-Mustern
    if (clean === 'pattern_carbon' || clean === 'carbon') {
      resolvedColorId = 'black';
      resolvedAnimId = 'carbon';
    } else if (clean === 'pattern_cyberpunk' || clean === 'cyberpunk') {
      resolvedColorId = 'neon_orange';
      resolvedAnimId = 'cyberpunk';
    } else if (clean === 'pattern_gold_glitter' || clean === 'glitter' || clean === 'glitzer') {
      resolvedColorId = 'gold_solid';
      resolvedAnimId = 'glitter';
    } else if (clean === 'pattern_matrix' || clean === 'matrix') {
      resolvedColorId = 'toxic_green';
      resolvedAnimId = 'matrix';
    } else if (clean === 'pattern_tartan' || clean === 'tartan') {
      resolvedColorId = 'red';
      resolvedAnimId = 'tartan';
    } else if (clean === 'cyberpunk_pink_yellow') {
      resolvedColorId = 'pink';
      resolvedAnimId = 'cyberpunk';
    } else if (clean === 'aurora_name_glow') {
      resolvedColorId = 'turquoise';
      resolvedAnimId = 'flag';
    } else if (clean === 'galaxy_pattern') {
      resolvedColorId = 'deep_purple';
      resolvedAnimId = 'glitter';
    } else {
      // Reiner Farbname
      resolvedColorId = COLOR_ALIAS_MAP[clean] || (clean as NameBgColorId) || 'blue';
      resolvedAnimId = 'none';
    }
  }

  // Suche Color Option
  const colorMatch = NAME_BG_COLORS.find(c => c.id === resolvedColorId) || NAME_BG_COLORS[1]; // fallback red
  // Suche Animation Option
  const animMatch = NAME_BG_ANIMATIONS.find(a => a.id === resolvedAnimId) || NAME_BG_ANIMATIONS[0];

  const compositeKey = `${colorMatch.id}:${animMatch.id}`;
  const compHex = getComplementaryColorHex(colorMatch.bgHex);

  // Label generieren: z.B. "Rot" oder "Rot (Flagge)"
  const label = animMatch.id === 'none'
    ? colorMatch.label
    : `${colorMatch.label} (${animMatch.label})`;

  // CSS-Klassen und Style zusammenbauen
  let cssClasses = '';
  let style: React.CSSProperties = {};
  let borderHex = colorMatch.borderHex;

  if (colorMatch.id === 'none') {
    cssClasses = 'bg-transparent';
    style = {};
  } else {
    // Basis-Klassen
    const textClass = colorMatch.textHex === '#FFFFFF' ? 'text-white' : 'text-slate-950';

    if (animMatch.id === 'none') {
      // Reine Unifarbe
      cssClasses = `${colorMatch.cssClasses} ${textClass} font-black`;
      style = {
        backgroundColor: colorMatch.bgHex,
        color: colorMatch.textHex,
        borderColor: borderHex
      };
    } else if (animMatch.id === 'cyberpunk') {
      // Cyberpunk: Schwarzer Hintergrund mit farbigen zuckenden Blitzen
      cssClasses = `name-anim-cyberpunk text-white font-black shadow-md border`;
      borderHex = colorMatch.bgHex;
      style = {
        backgroundColor: '#06060a',
        color: '#ffffff',
        borderColor: colorMatch.bgHex,
        ['--name-accent-color' as any]: colorMatch.bgHex
      };
    } else if (animMatch.id === 'matrix') {
      // Matrix: Schwarzer Grund mit vertikal fallenden Neon-Zahlen in der gewählten Farbe
      const matrixTextColor = colorMatch.bgHex === '#0F172A' ? '#00FF41' : colorMatch.bgHex;
      cssClasses = `name-anim-matrix font-black shadow-md border`;
      borderHex = colorMatch.bgHex;
      style = {
        backgroundColor: '#030504',
        color: matrixTextColor,
        borderColor: colorMatch.bgHex,
        ['--name-accent-color' as any]: colorMatch.bgHex
      };
    } else if (animMatch.id === 'glitter') {
      // Glitzer: Basis ist die gewählte Farbe, Sternchen leuchten in der Komplementärfarbe
      cssClasses = `name-anim-glitter ${textClass} font-black shadow-md border`;
      style = {
        backgroundColor: colorMatch.bgHex,
        color: colorMatch.textHex,
        borderColor: borderHex,
        ['--name-comp-color' as any]: compHex
      };
    } else {
      // Flagge, Carbon, Tartan
      cssClasses = `${animMatch.cssClass} ${textClass} font-black shadow-md border`;
      style = {
        backgroundColor: colorMatch.bgHex,
        color: colorMatch.textHex,
        borderColor: borderHex,
        ['--name-accent-color' as any]: colorMatch.bgHex
      };
    }
  }

  return {
    id: compositeKey,
    colorId: colorMatch.id,
    animationId: animMatch.id,
    colorOption: colorMatch,
    animationOption: animMatch,
    label,
    compositeKey,
    bgHex: colorMatch.bgHex,
    textHex: colorMatch.textHex,
    borderHex,
    compHex,
    cssClasses,
    textCssClasses: colorMatch.textCssClasses,
    style
  };
};

/**
 * Rückwärtskompatible Wrapper-Funktion für alle Komponenten
 */
export const getNameTagOption = (colorId?: string | null): any => {
  return parseNameBg(colorId);
};

export const hasActiveNameBg = (colorId?: string | null): boolean => {
  if (!colorId || colorId === 'none' || colorId === 'transparent') return false;
  const parsed = parseNameBg(colorId);
  return parsed.colorId !== 'none' || parsed.animationId !== 'none';
};

// ─── 5. FREISCHALTUNGSPRÜFUNGEN (LEVEL & QUESTS) ───

/**
 * Prüft, ob eine Farbe für den Nutzer freigeschaltet ist.
 */
export const isColorUnlocked = (
  colorId: string,
  userLevel: number,
  unlockedContext?: {
    completedQuestIds?: string[];
    achievementsCount?: number;
    standardWins?: number;
    unlockedColors?: string[];
  }
): { unlocked: boolean; reason?: string } => {
  const clean = (colorId || '').trim().toLowerCase();
  const aliasResolved = COLOR_ALIAS_MAP[clean] || clean;
  if (!aliasResolved || aliasResolved === 'none') return { unlocked: true };

  // Explizit in freigeschalteten Farben
  if (unlockedContext?.unlockedColors?.includes(aliasResolved)) {
    return { unlocked: true };
  }

  const opt = NAME_BG_COLORS.find(c => c.id === aliasResolved);
  if (!opt) return { unlocked: false, reason: 'Unbekannte Farbe' };

  if (opt.requiredQuestId) {
    if (unlockedContext?.completedQuestIds?.includes(opt.requiredQuestId)) {
      return { unlocked: true };
    }
    // Fallbacks für Achievements & Siege
    if (opt.id === 'pink' && (unlockedContext?.achievementsCount ?? 0) >= 50 && userLevel >= 2) {
      return { unlocked: true };
    }
    if (opt.id === 'turquoise' && (unlockedContext?.standardWins ?? 0) >= 5 && userLevel >= 2) {
      return { unlocked: true };
    }
    return { unlocked: false, reason: opt.unlockConditionText || 'Quest noch nicht abgeschlossen' };
  }

  // Level 3 Farben: Schwarz & Weiß
  if (opt.id === 'black' || opt.id === 'white') {
    if (userLevel >= 3) return { unlocked: true };
    return { unlocked: false, reason: 'Freischaltung ab Level 3' };
  }

  // Höhere Level
  if (opt.requiredLevel > 3) {
    if (userLevel >= opt.requiredLevel) return { unlocked: true };
    return { unlocked: false, reason: opt.unlockConditionText || `Freischaltung ab Level ${opt.requiredLevel}` };
  }

  // Basis-Farben (Rot, Gelb, Grün, Blau) ab Level 2
  if (userLevel >= 2) return { unlocked: true };
  return { unlocked: false, reason: 'Freischaltung ab Level 2' };
};

/**
 * Prüft, ob ein Muster/Effekt für den Nutzer freigeschaltet ist.
 */
export const isAnimationUnlocked = (
  animId: string,
  userLevel: number,
  unlockedContext?: {
    completedQuestIds?: string[];
    achievementsCount?: number;
    standardWins?: number;
    unlockedPatterns?: string[];
    unlockedColors?: string[];
  }
): { unlocked: boolean; reason?: string } => {
  const clean = (animId || '').trim().toLowerCase();
  const aliasResolved = ANIMATION_ALIAS_MAP[clean] || clean;
  if (!aliasResolved || aliasResolved === 'none') return { unlocked: true };

  // Explizit freigeschaltet in Kontext (unterstützt auch legacy pattern_ ids)
  if (
    unlockedContext?.unlockedPatterns?.includes(aliasResolved) ||
    unlockedContext?.unlockedColors?.includes(aliasResolved) ||
    unlockedContext?.unlockedColors?.includes(`pattern_${aliasResolved}`)
  ) {
    return { unlocked: true };
  }

  const opt = NAME_BG_ANIMATIONS.find(a => a.id === aliasResolved);
  if (!opt) return { unlocked: false, reason: 'Unbekanntes Muster' };

  if (opt.requiredQuestId) {
    if (unlockedContext?.completedQuestIds?.includes(opt.requiredQuestId)) {
      return { unlocked: true };
    }
    // Tartan Fallback (50 Achievements)
    if (opt.id === 'tartan' && (unlockedContext?.achievementsCount ?? 0) >= 50 && userLevel >= 3) {
      return { unlocked: true };
    }
    return { unlocked: false, reason: opt.unlockConditionText || 'Quest noch nicht abgeschlossen' };
  }

  if (userLevel >= opt.requiredLevel) return { unlocked: true };
  return { unlocked: false, reason: opt.unlockConditionText || `Freischaltung ab Level ${opt.requiredLevel}` };
};

export const getUnlockedColors = (
  userLevel: number,
  context?: {
    completedQuestIds?: string[];
    achievementsCount?: number;
    standardWins?: number;
    unlockedColors?: string[];
  }
): NameBgColorOption[] => {
  return NAME_BG_COLORS.filter(c => isColorUnlocked(c.id, userLevel, context).unlocked);
};

export const getUnlockedAnimations = (
  userLevel: number,
  context?: {
    completedQuestIds?: string[];
    achievementsCount?: number;
    standardWins?: number;
    unlockedPatterns?: string[];
    unlockedColors?: string[];
  }
): NameBgAnimationOption[] => {
  return NAME_BG_ANIMATIONS.filter(a => isAnimationUnlocked(a.id, userLevel, context).unlocked);
};

// ─── 6. NEON GLOW RAHMEN KONFIGURATION (LEVEL 4+) ───
export type NameGlowColorId = 'none' | 'blue' | 'red' | 'green' | 'yellow';

export interface NameGlowOption {
  id: NameGlowColorId;
  label: string;
  colorHex: string;
  glowClass: string;
  requiredLevel: number;
}

export const NAME_GLOW_OPTIONS: NameGlowOption[] = [
  {
    id: 'none',
    label: 'Kein Glow-Rahmen',
    colorHex: 'transparent',
    glowClass: '',
    requiredLevel: 4
  },
  {
    id: 'blue',
    label: 'Neon Blau',
    colorHex: '#3B82F6',
    glowClass: 'neon-glow-blue',
    requiredLevel: 4
  },
  {
    id: 'red',
    label: 'Neon Rot',
    colorHex: '#EF4444',
    glowClass: 'neon-glow-red',
    requiredLevel: 4
  },
  {
    id: 'green',
    label: 'Neon Grün',
    colorHex: '#10B981',
    glowClass: 'neon-glow-green',
    requiredLevel: 4
  },
  {
    id: 'yellow',
    label: 'Neon Gelb',
    colorHex: '#F59E0B',
    glowClass: 'neon-glow-yellow',
    requiredLevel: 4
  }
];

const GLOW_ALIAS_MAP: Record<string, NameGlowColorId> = {
  blau: 'blue',
  rot: 'red',
  gruen: 'green',
  grün: 'green',
  gelb: 'yellow'
};

export const getNameGlowOption = (glowId?: string | null): NameGlowOption => {
  if (!glowId || glowId === 'none') return NAME_GLOW_OPTIONS[0];
  const clean = glowId.trim().toLowerCase();
  const aliasResolved = GLOW_ALIAS_MAP[clean] || clean;
  const match = NAME_GLOW_OPTIONS.find(
    g => g.id === aliasResolved || g.label.toLowerCase() === clean
  );
  return match || NAME_GLOW_OPTIONS[0];
};

export const hasActiveNameGlow = (glowId?: string | null): boolean => {
  if (!glowId) return false;
  const opt = getNameGlowOption(glowId);
  return opt.id !== 'none';
};
