export type NameBgColorId =
  | 'none'
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'black'
  | 'white'
  | 'pink'
  | 'turquoise';

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
  türkis: 'turquoise'
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

  // Explizit freigeschaltet
  if (unlockedContext?.unlockedColors?.includes(opt.id)) {
    return { unlocked: true };
  }

  // Farben ab Level 3: Schwarz und Weiß
  if (opt.id === 'black' || opt.id === 'white') {
    if (userLevel >= 3) return { unlocked: true };
    return { unlocked: false, reason: 'Freischaltung ab Level 3' };
  }

  // Farben aus Quests ab Level 2:
  // - Rosa: Sammle 50 Achievements
  if (opt.id === 'pink') {
    const hasQuest = unlockedContext?.completedQuestIds?.includes('l2_50_achievements');
    const hasAchCount = (unlockedContext?.achievementsCount ?? 0) >= 50;
    if (userLevel >= 2 && (hasQuest || hasAchCount)) return { unlocked: true };
    return { unlocked: false, reason: 'Quest: Sammle 50 Achievements' };
  }

  // - Türkis: Gewinne 5 Standardspiele
  if (opt.id === 'turquoise') {
    const hasQuest = unlockedContext?.completedQuestIds?.includes('l2_5_wins_standard');
    const hasWins = (unlockedContext?.standardWins ?? 0) >= 5;
    if (userLevel >= 2 && (hasQuest || hasWins)) return { unlocked: true };
    return { unlocked: false, reason: 'Quest: Gewinne 5 Standardspiele' };
  }

  // Basis-Farben (Rot, Blau, Grün, Gelb) ab Level 2
  if (userLevel >= 2) return { unlocked: true };
  return { unlocked: false, reason: 'Freischaltung ab Level 2' };
};
