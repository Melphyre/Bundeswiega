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
    description: 'Edles 4px Twill-Weave Kohlefasergewebe mit gleitendem Lichtglanz und dezenter Farbnuance',
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
    description: 'Edle, funkelnde Sternchen mit weißem Kern und leuchtender Farbaura auf tiefschwarzem Grund',
    cssClass: 'name-anim-glitter',
    requiredLevel: 3,
    requiredQuestId: 'l3_pattern_gold_glitter',
    unlockConditionText: 'Quest: Nimm an 8 Teamwiegen teil'
  },
  {
    id: 'matrix',
    label: 'Matrix',
    icon: '💻',
    description: 'Animierter digitaler Matrix-Ziffernregen (0 bis 9) mit leuchtendem Neon-Kopf in deiner gewählten Farbe',
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
    description: 'Filigrane Schneekristalle (❄, ❅, ❆) mit sanftem Schaukel-Drift und eisigem Leuchten auf tiefschwarzem Grund',
    cssClass: 'name-anim-snow',
    requiredLevel: 4,
    requiredQuestId: 'l4_snow_animation_quest',
    unlockConditionText: 'Quest: Erziele 10 mal das selbe Gewicht wie ein anderer Spieler'
  },
  {
    id: 'waves',
    label: 'Wasser & Wellen',
    icon: '🌊',
    description: 'Lebendige, organische Wassertextur mit sanft fließenden Caustics-Lichtreflexen',
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
      // Matrix: Schwarzer Grund mit vertikal fallendem digitalem Ziffernregen in der gewählten Farbe
      cssClasses = `name-anim-matrix matrix-effect-container font-black shadow-md border`;
      borderHex = colorMatch.bgHex;
      style = {
        backgroundColor: '#000000',
        color: '#ffffff',
        borderColor: colorMatch.bgHex,
        textShadow: '0 0 4px #000000, 0 0 8px #000000, 0 0 12px #000000, 0 2px 4px rgba(0, 0, 0, 0.95)',
        ['--selected-color' as any]: colorMatch.bgHex,
        ['--name-accent-color' as any]: colorMatch.bgHex
      };
    } else if (animMatch.id === 'glitter') {
      // Glitzer: Tiefschwarzer Grund (#000000) mit funkelnden Sternchen und Partikeln in der gewählten Farbe
      cssClasses = `name-anim-glitter glitter-effect-container font-black shadow-md border`;
      borderHex = colorMatch.bgHex;
      style = {
        backgroundColor: '#000000',
        color: '#ffffff',
        borderColor: colorMatch.bgHex,
        textShadow: '0 2px 5px rgba(0, 0, 0, 0.95), 0 0 10px var(--selected-color, #ef4444)',
        ['--selected-color' as any]: colorMatch.bgHex,
        ['--name-accent-color' as any]: colorMatch.bgHex
      };
    } else if (animMatch.id === 'fire') {
      // Feuer: Tiefschwarzer Grund (#000000), leuchtend weißer Hitze-Flammenkern mit Übergang in die gewählte Farbe und aufsteigenden Funken
      cssClasses = `name-anim-fire fire-effect-container font-black shadow-md border`;
      borderHex = colorMatch.bgHex;
      style = {
        backgroundColor: '#000000',
        color: '#ffffff',
        borderColor: colorMatch.bgHex,
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.95), 0 0 8px rgba(0, 0, 0, 0.9)',
        ['--selected-color' as any]: colorMatch.bgHex,
        ['--name-accent-color' as any]: colorMatch.bgHex
      };
    } else if (animMatch.id === 'lightning') {
      // Blitze: Tiefschwarzer Grund (#000000), gezackte weiße Blitze mit dynamisch gefärbter Aura & Umgebungs-Flash
      cssClasses = `name-anim-lightning lightning-effect-container font-black shadow-md border`;
      borderHex = colorMatch.bgHex;
      style = {
        backgroundColor: '#000000',
        color: '#ffffff',
        borderColor: colorMatch.bgHex,
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.95), 0 0 8px rgba(0, 0, 0, 0.9)',
        ['--selected-color' as any]: colorMatch.bgHex,
        ['--name-accent-color' as any]: colorMatch.bgHex
      };
    } else if (animMatch.id === 'waves') {
      // Wasser & Wellen: Organische Wassertextur mit fließenden Caustics Lichtreflexen
      cssClasses = `name-anim-waves water-effect-container font-black shadow-md border`;
      borderHex = colorMatch.bgHex;
      style = {
        backgroundColor: '#030d1a',
        color: '#ffffff',
        borderColor: colorMatch.bgHex,
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.95), 0 0 8px rgba(0, 0, 0, 0.9)',
        ['--selected-color' as any]: colorMatch.bgHex,
        ['--name-accent-color' as any]: colorMatch.bgHex
      };
    } else if (animMatch.id === 'carbon') {
      // Carbon: Feines 4px Twill-Weave Kohlefasergewebe mit diagonalem Lackglanz & dezentem Farbakzent
      cssClasses = `name-anim-carbon carbon-effect-container font-black shadow-md border`;
      borderHex = colorMatch.bgHex;
      style = {
        backgroundColor: '#111111',
        color: '#ffffff',
        borderColor: colorMatch.bgHex,
        textShadow: '0 2px 4px rgba(0, 0, 0, 0.95), 0 0 6px var(--selected-color, #22c55e)',
        ['--selected-color' as any]: colorMatch.bgHex,
        ['--name-accent-color' as any]: colorMatch.bgHex
      };
    } else if (animMatch.id === 'snow') {
      // Schneeflocken: Tiefschwarzer Grund (#000000) mit großen leuchtenden Schneekristallen (❄, ❅, ❆) und starkem Rundum-Glow
      cssClasses = `name-anim-snow snow-effect-container font-black shadow-md border`;
      borderHex = colorMatch.bgHex;
      style = {
        backgroundColor: '#000000',
        color: '#ffffff',
        borderColor: colorMatch.bgHex,
        boxShadow: `0 0 16px ${colorMatch.bgHex}, inset 0 0 10px ${colorMatch.bgHex}`,
        textShadow: '0 0 4px #000000, 0 0 8px #000000, 0 2px 6px rgba(0, 0, 0, 0.95), 0 0 12px var(--selected-color, #38bdf8)',
        ['--selected-color' as any]: colorMatch.bgHex,
        ['--name-accent-color' as any]: colorMatch.bgHex
      };
    } else {
      // Flagge, Tartan
      cssClasses = `${animMatch.cssClass} ${textClass} font-black shadow-md border`;
      style = {
        backgroundColor: colorMatch.bgHex,
        color: colorMatch.textHex,
        borderColor: borderHex,
        ['--name-accent-color' as any]: colorMatch.bgHex
      };
    }
  }

  const isDarkCanvas = animMatch.id === 'fire' || animMatch.id === 'lightning' || animMatch.id === 'waves' || animMatch.id === 'matrix' || animMatch.id === 'carbon' || animMatch.id === 'glitter' || animMatch.id === 'snow';

  return {
    id: compositeKey,
    colorId: colorMatch.id,
    animationId: animMatch.id,
    colorOption: colorMatch,
    animationOption: animMatch,
    label,
    compositeKey,
    bgHex: isDarkCanvas ? (animMatch.id === 'waves' ? '#030d1a' : animMatch.id === 'carbon' ? '#111111' : '#000000') : colorMatch.bgHex,
    textHex: isDarkCanvas ? '#ffffff' : colorMatch.textHex,
    borderHex,
    compHex,
    cssClasses,
    textCssClasses: isDarkCanvas ? 'text-white font-black' : colorMatch.textCssClasses,
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

// ─── 6. RAHMEN- & GLOW-KONFIGURATION (LEVEL 4+) ───
export type NameBorderPatternId = 'none' | 'neon-glow' | 'laser-pulse' | 'double-border';

export interface NameBorderPatternOption {
  id: NameBorderPatternId;
  label: string;
  icon: string;
  description: string;
  cssClass: string;
  requiredLevel: number;
}

export const NAME_BORDER_PATTERNS: NameBorderPatternOption[] = [
  {
    id: 'none',
    label: 'Kein Rahmen',
    icon: '🚫',
    description: 'Kein zusätzlicher Leuchtrahmen um das Namensschild',
    cssClass: '',
    requiredLevel: 4
  },
  {
    id: 'neon-glow',
    label: 'Pulsierender Neon-Glow',
    icon: '✨',
    description: 'Sanft pulsierender, leuchtender Box-Shadow und Rahmen in deiner gewählten Farbe',
    cssClass: 'name-frame-neon-glow',
    requiredLevel: 4
  },
  {
    id: 'laser-pulse',
    label: 'Laufender Laser-Rahmen',
    icon: '⚡',
    description: 'Dynamisch pulsierender Laser-Lichtstrahl entlang des Namensschildes',
    cssClass: 'name-frame-laser-pulse',
    requiredLevel: 4
  },
  {
    id: 'double-border',
    label: 'Doppelter Cyber-Rahmen',
    icon: '💠',
    description: 'Zweistufiger Hightech-Rahmen mit kraftvoller Leucht-Aura',
    cssClass: 'name-frame-double-border',
    requiredLevel: 4
  }
];

export interface ParsedNameBorder {
  patternId: NameBorderPatternId;
  colorId: NameBgColorId;
  patternOption: NameBorderPatternOption;
  colorOption: NameBgColorOption;
  label: string;
  colorHex: string;
  glowClass: string;
  compositeKey: string;
  style: React.CSSProperties;
}

const GLOW_ALIAS_MAP: Record<string, NameBgColorId> = {
  blau: 'blue',
  blue: 'blue',
  rot: 'red',
  red: 'red',
  gruen: 'green',
  grün: 'green',
  green: 'green',
  gelb: 'yellow',
  yellow: 'yellow'
};

export const parseNameBorder = (raw?: string | null): ParsedNameBorder => {
  if (!raw || raw === 'none' || raw === 'transparent') {
    return {
      patternId: 'none',
      colorId: 'none',
      patternOption: NAME_BORDER_PATTERNS[0],
      colorOption: NAME_BG_COLORS[0],
      label: 'Kein Rahmen',
      colorHex: 'transparent',
      glowClass: '',
      compositeKey: 'none:none',
      style: {}
    };
  }

  const clean = raw.trim().toLowerCase();
  let resolvedPattern: NameBorderPatternId = 'neon-glow';
  let resolvedColorId: NameBgColorId = 'blue';

  if (clean.includes(':')) {
    const [pPart, cPart] = clean.split(':');
    const patternMatch = NAME_BORDER_PATTERNS.find(p => p.id === pPart);
    resolvedPattern = patternMatch ? patternMatch.id : (pPart === 'none' ? 'none' : 'neon-glow');
    resolvedColorId = (cPart as NameBgColorId) || 'blue';
  } else {
    // Migration von Legacy Keys wie 'blue', 'red', 'green', 'yellow', 'neon-glow-blue'
    if (clean === 'blue' || clean === 'neon-glow-blue' || clean === 'blau') {
      resolvedPattern = 'neon-glow';
      resolvedColorId = 'blue';
    } else if (clean === 'red' || clean === 'neon-glow-red' || clean === 'rot') {
      resolvedPattern = 'neon-glow';
      resolvedColorId = 'red';
    } else if (clean === 'green' || clean === 'neon-glow-green' || clean === 'gruen' || clean === 'grün') {
      resolvedPattern = 'neon-glow';
      resolvedColorId = 'green';
    } else if (clean === 'yellow' || clean === 'neon-glow-yellow' || clean === 'gelb') {
      resolvedPattern = 'neon-glow';
      resolvedColorId = 'yellow';
    } else {
      const patternMatch = NAME_BORDER_PATTERNS.find(p => p.id === clean);
      if (patternMatch) {
        resolvedPattern = patternMatch.id;
        resolvedColorId = 'blue';
      }
    }
  }

  const patternOption = NAME_BORDER_PATTERNS.find(p => p.id === resolvedPattern) || NAME_BORDER_PATTERNS[0];
  const colorOption = NAME_BG_COLORS.find(c => c.id === resolvedColorId) || NAME_BG_COLORS.find(c => c.id === 'blue') || NAME_BG_COLORS[1];

  const colorHex = patternOption.id === 'none' ? 'transparent' : colorOption.bgHex;
  const glowClass = patternOption.cssClass;
  const label = patternOption.id === 'none' ? 'Kein Rahmen' : `${patternOption.label} (${colorOption.label})`;

  return {
    patternId: patternOption.id,
    colorId: colorOption.id,
    patternOption,
    colorOption,
    label,
    colorHex,
    glowClass,
    compositeKey: `${patternOption.id}:${colorOption.id}`,
    style: patternOption.id === 'none' ? {} : {
      ['--glow-color' as any]: colorHex
    }
  };
};

// Backwards-compatible exports
export type NameGlowColorId = NameBgColorId | 'none';

export interface NameGlowOption {
  id: string;
  patternId: NameBorderPatternId;
  colorId: NameBgColorId;
  label: string;
  colorHex: string;
  glowClass: string;
  requiredLevel: number;
  style: React.CSSProperties;
}

export const NAME_GLOW_OPTIONS = NAME_BORDER_PATTERNS.map(p => ({
  id: p.id,
  label: p.label,
  colorHex: '#3B82F6',
  glowClass: p.cssClass,
  requiredLevel: p.requiredLevel
}));

export const getNameGlowOption = (glowId?: string | null): NameGlowOption => {
  const parsed = parseNameBorder(glowId);
  return {
    id: parsed.compositeKey,
    patternId: parsed.patternId,
    colorId: parsed.colorId,
    label: parsed.label,
    colorHex: parsed.colorHex,
    glowClass: parsed.glowClass,
    requiredLevel: 4,
    style: parsed.style
  };
};

export const hasActiveNameGlow = (glowId?: string | null): boolean => {
  if (!glowId || glowId === 'none') return false;
  const parsed = parseNameBorder(glowId);
  return parsed.patternId !== 'none';
};
