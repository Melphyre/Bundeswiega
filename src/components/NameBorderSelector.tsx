import React, { useState, useEffect } from 'react';
import {
  NameBorderPatternId,
  NameBgColorId,
  NAME_BORDER_PATTERNS,
  NAME_BG_COLORS,
  parseNameBorder,
  getUnlockedColors,
  NameBgColorOption,
  NameBorderPatternOption
} from '../constants/nameTagConfig';
import { PlayerNameTag } from './PlayerNameTag';

export interface NameBorderSelectorProps {
  currentValue?: string | null;
  userLevel: number;
  unlockedContext?: {
    completedQuestIds?: string[];
    achievementsCount?: number;
    standardWins?: number;
    unlockedColors?: string[];
  };
  playerName?: string;
  activeBg?: string | null;
  disabled?: boolean;
  onSave: (newPattern: NameBorderPatternId, newColorId: NameBgColorId, serialized: string) => Promise<void> | void;
  message?: string | null;
  darkMode?: boolean;
}

export const NameBorderSelector: React.FC<NameBorderSelectorProps> = ({
  currentValue,
  userLevel,
  unlockedContext,
  playerName = 'Spieler',
  activeBg,
  disabled = false,
  onSave,
  message,
  darkMode = true
}) => {
  // Parsen des initialen Werts
  const initialParsed = parseNameBorder(currentValue);
  const [borderPattern, setBorderPattern] = useState<NameBorderPatternId>(initialParsed.patternId);
  const [selectedColor, setSelectedColor] = useState<NameBgColorId>(initialParsed.colorId);

  // Synchronisation bei externen Prop-Änderungen
  useEffect(() => {
    const parsed = parseNameBorder(currentValue);
    setBorderPattern(parsed.patternId);
    setSelectedColor(parsed.colorId);
  }, [currentValue]);

  // Freigeschaltete Farben für die Rahmen-Swatches
  const unlockedColors: NameBgColorOption[] = getUnlockedColors(userLevel, unlockedContext);
  // Keine "none" Option in der Farbpalette (da "Kein Rahmen" über das linke Dropdown gesteuert wird)
  const swatchColors = unlockedColors.filter(c => c.id !== 'none');

  const activePattern: NameBorderPatternOption =
    NAME_BORDER_PATTERNS.find(p => p.id === borderPattern) || NAME_BORDER_PATTERNS[0];
  const activeColorMatch: NameBgColorOption =
    swatchColors.find(c => c.id === selectedColor) || swatchColors[0] || NAME_BG_COLORS[1];

  const handlePatternChange = (newPattern: NameBorderPatternId) => {
    if (disabled) return;
    setBorderPattern(newPattern);
    const colorToUse = newPattern === 'none' ? 'none' : selectedColor;
    const serialized = `${newPattern}:${colorToUse}`;
    onSave(newPattern, colorToUse as NameBgColorId, serialized);
  };

  const handleColorChange = (newColorId: NameBgColorId) => {
    if (disabled || borderPattern === 'none') return;
    setSelectedColor(newColorId);
    const serialized = `${borderPattern}:${newColorId}`;
    onSave(borderPattern, newColorId, serialized);
  };

  const previewSerialized = borderPattern === 'none' ? 'none' : `${borderPattern}:${selectedColor}`;

  return (
    <div className="space-y-4">
      {/* 1. Live-Vorschau des Spielernamens mit Rahmen */}
      <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
        darkMode ? 'bg-slate-900/80 border-slate-700/80' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col items-center sm:items-start space-y-1">
          <span className="text-[10px] uppercase font-black tracking-wider opacity-60">
            Live-Vorschau Namensschild & Rahmen:
          </span>
          <div className="py-1">
            <PlayerNameTag
              name={playerName}
              colorKey={activeBg}
              glowKey={previewSerialized}
              className="text-base sm:text-lg"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
          <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30">
            Rahmen: {activePattern.label}
          </span>
          {borderPattern !== 'none' && (
            <span className="px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-400 border border-teal-500/30">
              Leuchtfarbe: {activeColorMatch.label}
            </span>
          )}
        </div>
      </div>

      {/* 2. Decoupled Auswahl: 2 Spalten (Muster links, Swatches rechts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* SPALTE LINKS: Dropdown-Box für Rahmen-Animation / Muster */}
        <div className={`p-3.5 rounded-xl border space-y-2.5 ${
          darkMode ? 'bg-slate-900/40 border-purple-500/30' : 'bg-purple-50/50 border-purple-200'
        }`}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center space-x-1.5">
              <span>✨ RAHMEN-ANIMATION / MUSTER:</span>
            </label>
            <span className="text-[10px] font-bold opacity-60">
              {NAME_BORDER_PATTERNS.length - 1} Effekte verfügbar
            </span>
          </div>

          <select
            value={borderPattern}
            onChange={(e) => handlePatternChange(e.target.value as NameBorderPatternId)}
            disabled={disabled}
            className={`w-full p-2.5 rounded-xl border-2 font-bold text-sm cursor-pointer transition-all ${
              darkMode
                ? 'border-purple-500/40 bg-slate-900 text-white focus:border-purple-400'
                : 'border-purple-300 bg-white text-slate-900 focus:border-purple-500'
            }`}
          >
            {NAME_BORDER_PATTERNS.map((pattern) => (
              <option key={pattern.id} value={pattern.id}>
                {pattern.icon} {pattern.label}
              </option>
            ))}
          </select>

          {/* Erklärungstext zum aktuell gewählten Rahmen-Muster */}
          <div className="text-[11px] leading-relaxed opacity-75 min-h-[36px] p-2 rounded-lg bg-black/20">
            <span className="font-semibold text-purple-300">{activePattern.icon} {activePattern.label}: </span>
            {activePattern.description}
          </div>
        </div>

        {/* SPALTE RECHTS: Wählbare Rahmen-Farben (Swatches) */}
        <div className={`p-3.5 rounded-xl border space-y-2.5 ${
          darkMode ? 'bg-slate-900/40 border-teal-500/30' : 'bg-teal-50/50 border-teal-200'
        }`}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-teal-400 flex items-center space-x-1.5">
              <span>🎨 RAHMEN-FARBE (SWATCHES):</span>
            </label>
            <span className="text-[10px] font-bold opacity-60">
              {swatchColors.length} frei
            </span>
          </div>

          {/* Grid der Farbkätchen */}
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 lg:grid-cols-8 gap-2 p-1 max-h-[170px] overflow-y-auto">
            {swatchColors.map((col) => {
              const isSelected = selectedColor === col.id;
              const isInactive = borderPattern === 'none';

              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => handleColorChange(col.id)}
                  disabled={disabled || isInactive}
                  title={isInactive ? 'Wähle zuerst einen Rahmen-Stil' : col.label}
                  className={`group relative h-9 w-9 rounded-xl flex items-center justify-center transition-all transform ${
                    isInactive
                      ? 'opacity-30 cursor-not-allowed'
                      : 'hover:scale-110 active:scale-95 cursor-pointer opacity-85 hover:opacity-100'
                  } ${
                    isSelected && !isInactive
                      ? 'ring-3 ring-offset-2 ring-teal-400 scale-105 z-10 shadow-lg'
                      : ''
                  } ${
                    darkMode ? 'ring-offset-slate-900' : 'ring-offset-white'
                  }`}
                  style={{
                    backgroundColor: col.bgHex,
                    border: `2px solid ${col.borderHex || 'rgba(255,255,255,0.2)'}`
                  }}
                >
                  {isSelected && !isInactive && (
                    <span
                      className="font-black text-xs leading-none drop-shadow-md"
                      style={{ color: col.textHex }}
                    >
                      ✓
                    </span>
                  )}

                  {/* Tooltip on hover */}
                  <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-950 px-1.5 py-0.5 text-[9px] font-bold text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 z-30">
                    {col.label}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] opacity-65 pt-0.5 flex items-center justify-between">
            <span>
              {borderPattern === 'none'
                ? 'Wähle links ein Rahmen-Muster, um Farben zu aktivieren'
                : 'Klicke auf ein Kästchen, um die Leuchtfarbe zu ändern'}
            </span>
            {borderPattern !== 'none' && (
              <span className="text-teal-400 font-bold">{activeColorMatch.label}</span>
            )}
          </p>
        </div>
      </div>

      {/* 3. Feedback / Statusmeldung */}
      {message && (
        <p className={`text-xs font-bold animate-in fade-in p-2.5 rounded-xl border ${
          message.startsWith('✅')
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {message}
        </p>
      )}
    </div>
  );
};

export default NameBorderSelector;
