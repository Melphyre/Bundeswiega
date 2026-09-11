export type NameBgColorId = 'none' | 'red' | 'blue' | 'green' | 'yellow';

export interface NameBgColorOption {
  id: NameBgColorId;
  label: string;
  bgHex: string;
  textHex: string;
  borderHex?: string;
  cssClasses: string;
  textCssClasses: string;
  requiredLevel: number;
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
  }
];

/**
 * Ermittelt die Konfiguration für einen Farb-Key (z. B. 'red', 'blue', 'green', 'yellow', 'none')
 */
export const getNameTagOption = (colorId?: string | null): NameBgColorOption => {
  if (!colorId || colorId === 'none') return NAME_TAG_COLORS[0];
  const clean = colorId.trim().toLowerCase();
  const match = NAME_TAG_COLORS.find(
    c => c.id === clean || c.label.toLowerCase() === clean
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
