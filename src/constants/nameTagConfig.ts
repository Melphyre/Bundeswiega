export type NameBgColorId =
  | 'none'
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'black'
  | 'white'
  | 'pink'
  | 'turquoise'
  | 'neon_orange'
  | 'royal_blue'
  | 'deep_purple'
  | 'toxic_green'
  | 'gold_solid'
  | 'pattern_carbon'
  | 'pattern_cyberpunk'
  | 'pattern_gold_glitter'
  | 'pattern_matrix'
  | 'pattern_tartan'
  | 'neon_mint'
  | 'cyberpunk_pink_yellow'
  | 'aurora_name_glow'
  | 'galaxy_pattern';

export interface NameBgColorOption {
  id: NameBgColorId;
  label: string;
  bgHex: string;
  textHex: string;
  borderHex?: string;
  cssClasses: string;
  textCssClasses: string;
  requiredLevel: number;
  requiredQuestId?: string;
  unlockConditionText?: string;
}

export const NAME_TAG_COLORS: NameBgColorOption[] = [
  {
    id: 'none',
    label: 'Kein Hintergrund',
    bgHex: 'transparent',
    textHex: 'inherit',
    cssClasses: 'bg-transparent',
    textCssClasses: '',
    requiredLevel: 2
  },
  {
    id: 'red',
    label: 'Rot',
    bgHex: '#DC2626',
    textHex: '#FFFFFF',
    borderHex: '#B91C1C',
    cssClasses: 'bg-red-600 text-white shadow-sm border border-red-700/50',
    textCssClasses: 'text-white font-black',
    requiredLevel: 2
  },
  {
    id: 'blue',
    label: 'Blau',
    bgHex: '#2563EB',
    textHex: '#FFFFFF',
    borderHex: '#1D4ED8',
    cssClasses: 'bg-blue-600 text-white shadow-sm border border-blue-700/50',
    textCssClasses: 'text-white font-black',
    requiredLevel: 2
  },
  {
    id: 'green',
    label: 'Grün',
    bgHex: '#16A34A',
    textHex: '#FFFFFF',
    borderHex: '#15803D',
    cssClasses: 'bg-emerald-600 text-white shadow-sm border border-emerald-700/50',
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
    id: 'pink',
    label: 'Rosa',
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
  // Neue Level-2 Quests: Einfarbige & animierte Farben
  {
    id: 'neon_orange',
    label: 'Neon-Orange',
    bgHex: '#FF5E00',
    textHex: '#FFFFFF',
    borderHex: '#EA580C',
    cssClasses: 'bg-[#FF5E00] text-white shadow-md shadow-[#FF5E00]/50 border-2 border-[#FF7A00] font-black',
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
    cssClasses: 'name-bg-royal-blue text-white shadow-md shadow-blue-900/60 border border-blue-400 font-black',
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
    cssClasses: 'bg-[#4C1D95] text-purple-100 shadow-md shadow-purple-950/60 border border-purple-500 font-black',
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
    cssClasses: 'bg-[#76FF03] text-slate-950 shadow-md shadow-[#76FF03]/60 border border-[#39FF14] font-black',
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
    cssClasses: 'name-bg-gold-solid text-white shadow-md shadow-amber-900/60 border border-amber-300 font-black',
    textCssClasses: 'text-white font-black',
    requiredLevel: 2,
    requiredQuestId: 'l2_gold_solid',
    unlockConditionText: 'Quest: Gewinne 3 Turniere'
  },
  // Neue Level-3 Quests: Gemusterte & effektvolle Hintergründe
  {
    id: 'pattern_carbon',
    label: 'Carbon-Faser',
    bgHex: '#18181B',
    textHex: '#FFFFFF',
    borderHex: '#52525B',
    cssClasses: 'name-bg-pattern-carbon text-white shadow-md border border-zinc-600 font-black',
    textCssClasses: 'text-white font-black',
    requiredLevel: 3,
    requiredQuestId: 'l3_pattern_carbon',
    unlockConditionText: 'Quest: Absolviere 20 Spiele'
  },
  {
    id: 'pattern_cyberpunk',
    label: 'Cyberpunk-Glitch',
    bgHex: '#050505',
    textHex: '#00F0FF',
    borderHex: '#FF0055',
    cssClasses: 'name-bg-pattern-cyberpunk text-cyan-300 shadow-md border border-pink-500 font-black',
    textCssClasses: 'text-cyan-300 font-black',
    requiredLevel: 3,
    requiredQuestId: 'l3_pattern_cyberpunk',
    unlockConditionText: 'Quest: Erreiche 5x einen Durchschnitt unter 3 Gramm'
  },
  {
    id: 'pattern_gold_glitter',
    label: 'Goldener Glitter',
    bgHex: '#B45309',
    textHex: '#FFFFFF',
    borderHex: '#FDE047',
    cssClasses: 'name-bg-pattern-gold-glitter text-white shadow-md border border-amber-300 font-black',
    textCssClasses: 'text-white font-black',
    requiredLevel: 3,
    requiredQuestId: 'l3_pattern_gold_glitter',
    unlockConditionText: 'Quest: Nimm an 8 Teamwiegen teil'
  },
  {
    id: 'pattern_matrix',
    label: 'Matrix-Digital',
    bgHex: '#022C22',
    textHex: '#00FF41',
    borderHex: '#00FF41',
    cssClasses: 'name-bg-pattern-matrix text-emerald-400 shadow-md border border-emerald-500 font-black',
    textCssClasses: 'text-emerald-400 font-black',
    requiredLevel: 3,
    requiredQuestId: 'l3_pattern_matrix',
    unlockConditionText: 'Quest: Spiele 10 Speedwiegen'
  },
  {
    id: 'pattern_tartan',
    label: 'Tartan / Karo',
    bgHex: '#7F1D1D',
    textHex: '#FFFFFF',
    borderHex: '#DC2626',
    cssClasses: 'name-bg-pattern-tartan text-white shadow-md border border-red-500 font-black',
    textCssClasses: 'text-white font-black',
    requiredLevel: 3,
    requiredQuestId: 'l3_pattern_tartan',
    unlockConditionText: 'Quest: Sammle 50 Achievements'
  },
  {
    id: 'neon_mint',
    label: 'Neon-Mint',
    bgHex: '#00FFA3',
    textHex: '#0F172A',
    borderHex: '#00E08F',
    cssClasses: 'bg-[#00FFA3] text-slate-950 shadow-sm border border-[#00E08F] shadow-[#00FFA3]/30',
    textCssClasses: 'text-slate-950 font-black',
    requiredLevel: 6,
    unlockConditionText: 'Freischaltung ab Level 6'
  },
  {
    id: 'cyberpunk_pink_yellow',
    label: 'Cyberpunk Pink/Gelb',
    bgHex: '#FF007F',
    textHex: '#FFFFFF',
    borderHex: '#FACC15',
    cssClasses: 'bg-gradient-to-r from-pink-600 via-rose-500 to-amber-400 text-white shadow-sm border border-amber-300 shadow-pink-500/30',
    textCssClasses: 'text-white font-black',
    requiredLevel: 11,
    unlockConditionText: 'Freischaltung ab Level 11'
  },
  {
    id: 'aurora_name_glow',
    label: 'Aurora Polarlichter',
    bgHex: '#10B981',
    textHex: '#FFFFFF',
    borderHex: '#8B5CF6',
    cssClasses: 'bg-gradient-to-r from-emerald-500 via-teal-400 to-purple-500 text-white shadow-sm border border-cyan-300 shadow-emerald-500/40',
    textCssClasses: 'text-white font-black',
    requiredLevel: 15,
    unlockConditionText: 'Freischaltung ab Level 15 (Gold-Meilenstein)'
  },
  {
    id: 'galaxy_pattern',
    label: 'Galaxie & Sterne',
    bgHex: '#1E1B4B',
    textHex: '#F8FAFC',
    borderHex: '#818CF8',
    cssClasses: 'bg-gradient-to-r from-indigo-950 via-purple-900 to-slate-950 text-indigo-100 shadow-sm border border-indigo-400/50 shadow-purple-900/50',
    textCssClasses: 'text-indigo-100 font-black',
    requiredLevel: 16,
    unlockConditionText: 'Freischaltung ab Level 16'
  }
];

// Alias mapping for localized or alternate identifiers
const COLOR_ALIAS_MAP: Record<string, NameBgColorId> = {
  rot: 'red',
  blau: 'blue',
  gruen: 'green',
  grün: 'green',
  gelb: 'yellow',
  schwarz: 'black',
  weiss: 'white',
  weiß: 'white',
  rosa: 'pink',
  pink: 'pink',
  tuerkis: 'turquoise',
  türkis: 'turquoise',
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
  carbon: 'pattern_carbon',
  pattern_carbon: 'pattern_carbon',
  cyberpunk: 'pattern_cyberpunk',
  pattern_cyberpunk: 'pattern_cyberpunk',
  glitter: 'pattern_gold_glitter',
  pattern_gold_glitter: 'pattern_gold_glitter',
  matrix: 'pattern_matrix',
  pattern_matrix: 'pattern_matrix',
  tartan: 'pattern_tartan',
  pattern_tartan: 'pattern_tartan'
};

/**
 * Ermittelt die Konfiguration für einen Farb-Key (z. B. 'red', 'black', 'white', 'pink', 'turquoise', etc.)
 */
export const getNameTagOption = (colorId?: string | null): NameBgColorOption => {
  if (!colorId || colorId === 'none') return NAME_TAG_COLORS[0];
  const clean = colorId.trim().toLowerCase();
  const aliasResolved = COLOR_ALIAS_MAP[clean] || clean;
  const match = NAME_TAG_COLORS.find(
    c => c.id === aliasResolved || c.label.toLowerCase() === clean
  );
  return match || NAME_TAG_COLORS[0];
};

/**
 * Prüft, ob ein Farb-Key einen aktiven farbigen Hintergrund darstellt.
 */
export const hasActiveNameBg = (colorId?: string | null): boolean => {
  if (!colorId) return false;
  const opt = getNameTagOption(colorId);
  return opt.id !== 'none';
};

/**
 * =========================================================================
 * NEON GLOW RAHMEN KONFIGURATION (LEVEL 4+)
 * =========================================================================
 */
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

/**
 * Prüft, ob ein Namenshintergrund für den aktuellen Nutzer freigeschaltet ist.
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
  const opt = getNameTagOption(colorId);
  if (opt.id === 'none') return { unlocked: true };

  // Explizit freigeschaltet (z.B. durch Quest-Abschluss in LocalStorage)
  if (unlockedContext?.unlockedColors?.includes(opt.id)) {
    return { unlocked: true };
  }

  // Quests-Bindung (prüft ob die Quest abgeschlossen ist)
  if (opt.requiredQuestId) {
    if (unlockedContext?.completedQuestIds?.includes(opt.requiredQuestId)) {
      return { unlocked: true };
    }
    // Fallbacks für spezielle Zähler
    if (opt.id === 'pink' && (unlockedContext?.achievementsCount ?? 0) >= 50 && userLevel >= 2) {
      return { unlocked: true };
    }
    if (opt.id === 'turquoise' && (unlockedContext?.standardWins ?? 0) >= 5 && userLevel >= 2) {
      return { unlocked: true };
    }
    return { unlocked: false, reason: opt.unlockConditionText || 'Quest noch nicht abgeschlossen' };
  }

  // Farben ab Level 3: Schwarz und Weiß
  if (opt.id === 'black' || opt.id === 'white') {
    if (userLevel >= 3) return { unlocked: true };
    return { unlocked: false, reason: 'Freischaltung ab Level 3' };
  }

  // Höhere Level-Farben (Level 6, 11, 15, 16)
  if (opt.requiredLevel > 3) {
    if (userLevel >= opt.requiredLevel) return { unlocked: true };
    return { unlocked: false, reason: opt.unlockConditionText || `Freischaltung ab Level ${opt.requiredLevel}` };
  }

  // Basis-Farben (Rot, Blau, Grün, Gelb) ab Level 2
  if (userLevel >= 2) return { unlocked: true };
  return { unlocked: false, reason: 'Freischaltung ab Level 2' };
};
