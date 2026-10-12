import React, { useState, useEffect } from 'react';
import {
  NameBgColorId,
  NameBgAnimationId,
  NAME_BG_COLORS,
  NAME_BG_ANIMATIONS,
  parseNameBg,
  getUnlockedColors,
  getUnlockedAnimations,
  NameBgColorOption,
  NameBgAnimationOption
} from '../constants/nameTagConfig';
import { PlayerNameTag } from './PlayerNameTag';

export interface NameBgSelectorProps {
  currentValue?: string | null;
  userLevel: number;
  unlockedContext?: {
    completedQuestIds?: string[];
    achievementsCount?: number;
    standardWins?: number;
    unlockedColors?: string[];
    unlockedPatterns?: string[];
  };
  playerName?: string;
  activeGlow?: string | null;
  disabled?: boolean;
  onSave: (newColorId: NameBgColorId, newAnimationId: NameBgAnimationId, serialized: string) => Promise<void> | void;
  message?: string | null;
  darkMode?: boolean;
}

export const NameBgSelector: React.FC<NameBgSelectorProps> = ({
  currentValue,
  userLevel,
  unlockedContext,
  playerName = 'Spieler',
  activeGlow,
  disabled = false,
  onSave,
  message,
  darkMode = true
}) => {
  // Parsen des initialen Werts
  const initialParsed = parseNameBg(currentValue);
  const [selectedColor, setSelectedColor] = useState<NameBgColorId>(initialParsed.colorId);
  const [selectedAnimation, setSelectedAnimation] = useState<NameBgAnimationId>(initialParsed.animationId);

  // Synchronisation bei externen Prop-Änderungen
  useEffect(() => {
    const parsed = parseNameBg(currentValue);
    setSelectedColor(parsed.colorId);
    setSelectedAnimation(parsed.animationId);
  }, [currentValue]);

  // WICHTIG: Immer NUR freigeschaltete Farben und Animationen anzeigen!
  const unlockedAnimations: NameBgAnimationOption[] = getUnlockedAnimations(userLevel, unlockedContext);
  const unlockedColors: NameBgColorOption[] = getUnlockedColors(userLevel, unlockedContext);

  // Falls die aktuell gespeicherte Farbe oder Animation noch nicht freigeschaltet ist, Fallback auf freigeschaltete
  const activeColorMatch = unlockedColors.find(c => c.id === selectedColor) || unlockedColors[0] || NAME_BG_COLORS[0];
  const activeAnimMatch = unlockedAnimations.find(a => a.id === selectedAnimation) || unlockedAnimations[0] || NAME_BG_ANIMATIONS[0];

  const handleColorChange = (newColorId: NameBgColorId) => {
    if (disabled) return;
    setSelectedColor(newColorId);
    const serialized = `${newColorId}:${selectedAnimation}`;
    onSave(newColorId, selectedAnimation, serialized);
  };

  const handleAnimationChange = (newAnimId: NameBgAnimationId) => {
    if (disabled) return;
    setSelectedAnimation(newAnimId);
    const serialized = `${selectedColor}:${newAnimId}`;
    onSave(selectedColor, newAnimId, serialized);
  };

  const previewSerialized = `${selectedColor}:${selectedAnimation}`;

  return (
    <div className="space-y-4">
      {/* 1. Live-Vorschau des Spielernamens */}
      <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
        darkMode ? 'bg-slate-900/80 border-slate-700/80' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col items-center sm:items-start space-y-1">
          <span className="text-[10px] uppercase font-black tracking-wider opacity-60">
            Live-Vorschau Namensschild:
          </span>
          <div className="py-1">
            <PlayerNameTag
              name={playerName}
              colorKey={previewSerialized}
              glowKey={activeGlow}
              className="text-base sm:text-lg"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
          <span className="px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-400 border border-teal-500/30">
            Farbe: {activeColorMatch.label}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30">
            Muster: {activeAnimMatch.label}
          </span>
        </div>
      </div>

      {/* 2. Decoupled Auswahl: Dropdown (Animation) direkt neben Swatches (Farben) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* SPALTE LINKS: Dropdown-Box für Animation / Muster */}
        <div className={`p-3.5 rounded-xl border space-y-2.5 ${
          darkMode ? 'bg-slate-900/40 border-purple-500/30' : 'bg-purple-50/50 border-purple-200'
        }`}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center space-x-1.5">
              <span>✨ Animation / Muster:</span>
            </label>
            <span className="text-[10px] font-bold opacity-60">
              {unlockedAnimations.length} von {NAME_BG_ANIMATIONS.length} frei
            </span>
          </div>

          <select
            value={selectedAnimation}
            onChange={(e) => handleAnimationChange(e.target.value as NameBgAnimationId)}
            disabled={disabled}
            className={`w-full p-2.5 rounded-xl border-2 font-bold text-sm cursor-pointer transition-all ${
              darkMode
                ? 'border-purple-500/40 bg-slate-900 text-white focus:border-purple-400'
                : 'border-purple-300 bg-white text-slate-900 focus:border-purple-500'
            }`}
          >
            {unlockedAnimations.map((anim) => (
              <option key={anim.id} value={anim.id}>
                {anim.icon} {anim.label}
              </option>
            ))}
          </select>

          {/* Erklärungstext zum aktuell gewählten Muster */}
          <div className="text-[11px] leading-relaxed opacity-75 min-h-[36px] p-2 rounded-lg bg-black/20">
            <span className="font-semibold text-purple-300">{activeAnimMatch.icon} {activeAnimMatch.label}: </span>
            {activeAnimMatch.description}
          </div>
        </div>

        {/* SPALTE RECHTS (Direkt daneben): Visuelle Auswahlbox (Farbkästchen / Swatches) */}
        <div className={`p-3.5 rounded-xl border space-y-2.5 ${
          darkMode ? 'bg-slate-900/40 border-teal-500/30' : 'bg-teal-50/50 border-teal-200'
        }`}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-teal-400 flex items-center space-x-1.5">
              <span>🎨 Wählbare Farben (Swatches):</span>
            </label>
            <span className="text-[10px] font-bold opacity-60">
              {unlockedColors.length} von {NAME_BG_COLORS.length} frei
            </span>
          </div>

          {/* Grid der Farbkätchen */}
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 lg:grid-cols-8 gap-2 p-1 max-h-[170px] overflow-y-auto">
            {unlockedColors.map((col) => {
              const isSelected = selectedColor === col.id;
              const isNone = col.id === 'none';

              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => handleColorChange(col.id)}
                  disabled={disabled}
                  title={`${col.label}${col.requiredLevel > 0 ? ` (ab Level ${col.requiredLevel})` : ''}`}
                  className={`group relative h-9 w-9 rounded-xl flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 focus:outline-hidden ${
                    isSelected
                      ? 'ring-3 ring-offset-2 ring-teal-400 scale-105 z-10 shadow-lg'
                      : 'hover:opacity-90 opacity-80'
                  } ${
                    darkMode ? 'ring-offset-slate-900' : 'ring-offset-white'
                  }`}
                  style={{
                    backgroundColor: isNone ? 'transparent' : col.bgHex,
                    border: isNone ? '2px dashed rgba(150, 150, 150, 0.5)' : `2px solid ${col.borderHex || 'rgba(255,255,255,0.2)'}`
                  }}
                >
                  {isNone ? (
                    <span className="text-xs">🚫</span>
                  ) : isSelected ? (
                    <span
                      className="font-black text-xs leading-none drop-shadow-md"
                      style={{ color: col.textHex }}
                    >
                      ✓
                    </span>
                  ) : null}

                  {/* Tooltip on hover */}
                  <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-950 px-1.5 py-0.5 text-[9px] font-bold text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 z-30">
                    {col.label}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] opacity-65 pt-0.5 flex items-center justify-between">
            <span>Klicke auf ein Kästchen, um die Farbe zu wechseln</span>
            <span className="text-teal-400 font-bold">{activeColorMatch.label}</span>
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

export default NameBgSelector;
