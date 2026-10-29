import React, { useState, useEffect } from 'react';
import {
  AvatarFramePatternId,
  FRAME_COLOR_SWATCHES,
  parseAvatarFrame,
  getUnlockedAvatarFramePatterns,
  AvatarFrameOption
} from '../constants/cosmeticsConfig';
import { PlayerAvatar } from './PlayerAvatar';

export interface AvatarFrameSelectorProps {
  currentValue?: string | null;
  userLevel: number;
  avatarUrl?: string | null;
  playerName?: string;
  disabled?: boolean;
  onSave: (serialized: string) => Promise<void> | void;
  message?: string | null;
  darkMode?: boolean;
}

export const AvatarFrameSelector: React.FC<AvatarFrameSelectorProps> = ({
  currentValue,
  userLevel,
  avatarUrl,
  playerName = 'Spieler',
  disabled = false,
  onSave,
  message,
  darkMode = true
}) => {
  const initialParsed = parseAvatarFrame(currentValue);
  const [borderPattern, setBorderPattern] = useState<string>(initialParsed.pattern);
  const [borderColor, setBorderColor] = useState<string>(initialParsed.colorHex);

  useEffect(() => {
    const parsed = parseAvatarFrame(currentValue);
    setBorderPattern(parsed.pattern);
    setBorderColor(parsed.colorHex);
  }, [currentValue]);

  const unlockedPatterns: AvatarFrameOption[] = getUnlockedAvatarFramePatterns(userLevel);
  const swatches = FRAME_COLOR_SWATCHES;

  const activePattern =
    unlockedPatterns.find(p => p.id === borderPattern) || unlockedPatterns[0];
  const activeColorSwatch =
    swatches.find(s => s.hex.toLowerCase() === borderColor.toLowerCase()) || swatches[0];

  const handlePatternChange = (newPattern: string) => {
    if (disabled) return;
    setBorderPattern(newPattern);
    const serialized = newPattern === 'none' ? 'none' : `${newPattern}:${borderColor}`;
    onSave(serialized);
  };

  const handleColorChange = (newHex: string) => {
    if (disabled || borderPattern === 'none') return;
    setBorderColor(newHex);
    const serialized = `${borderPattern}:${newHex}`;
    onSave(serialized);
  };

  const previewFrame = borderPattern === 'none' ? 'none' : `${borderPattern}:${borderColor}`;

  return (
    <div className="space-y-4">
      {/* Live-Vorschau des Avatars mit dem gewählten Schmuckrahmen */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
        darkMode ? 'bg-slate-900/90 border-slate-700/80' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center space-x-3.5">
          <PlayerAvatar
            url={avatarUrl}
            name={playerName}
            className="w-14 h-14 shadow-lg"
            avatar_frame={previewFrame}
          />
          <div>
            <span className="text-[10px] uppercase font-black tracking-wider opacity-60 block">
              Live-Vorschau Avatar & Rahmen:
            </span>
            <div className="text-sm font-black flex items-center space-x-2 pt-0.5">
              <span>{activePattern.icon} {activePattern.label}</span>
            </div>
            {borderPattern !== 'none' && (
              <span className="text-[11px] text-amber-500 font-semibold flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block shadow-xs" style={{ backgroundColor: borderColor }}></span>
                <span>Farbe: {activeColorSwatch.label} ({borderColor})</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-bold">
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30">
            {borderPattern === 'none' ? 'Kein Rahmen aktiv' : 'Aktiv ausgerüstet'}
          </span>
        </div>
      </div>

      {/* Hauptbereich: Aufgeteilt in zwei Hälften (Muster links, Farbwahl rechts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-[#0f172a] rounded-xl border border-slate-800">
        {/* Linke Spalte: Muster */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-300">✨ RAHMEN-ANIMATION / MUSTER:</label>
            <span className="text-xs text-slate-400 font-medium">
              {unlockedPatterns.length - 1} freigeschaltet
            </span>
          </div>

          <select 
            value={borderPattern} 
            onChange={(e) => handlePatternChange(e.target.value)}
            disabled={disabled}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white font-bold cursor-pointer focus:border-amber-500 focus:outline-none transition-colors"
          >
            {unlockedPatterns.map((opt) => (
              <option key={opt.id} value={opt.id} className="bg-slate-900 text-white">
                {opt.icon} {opt.label} {opt.requiredLevel > 0 ? `(Level ${opt.requiredLevel})` : ''}
              </option>
            ))}
          </select>

          {/* Erklärungstext zum aktuell gewählten Rahmen-Muster */}
          <div className="text-xs text-slate-400 bg-slate-900/60 p-3 rounded-lg border border-slate-800 leading-relaxed min-h-[44px]">
            <span className="font-bold text-slate-200">{activePattern.label}: </span>
            {activePattern.description}
          </div>
        </div>

        {/* Rechte Spalte: Swatches */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-300">🎨 RAHMEN-FARBE (SWATCHES):</label>
            {borderPattern !== 'none' && (
              <span className="text-xs font-bold text-teal-400">
                {activeColorSwatch.label}
              </span>
            )}
          </div>

          <div className="grid grid-cols-5 gap-2">
            {swatches.map((color) => {
              const isSelected = borderColor.toLowerCase() === color.hex.toLowerCase() && borderPattern !== 'none';
              const isDisabled = borderPattern === 'none' || disabled;

              return (
                <button
                  key={color.id}
                  type="button"
                  disabled={isDisabled}
                  style={{ backgroundColor: color.hex }}
                  onClick={() => handleColorChange(color.hex)}
                  title={isDisabled ? 'Wähle links zuerst ein Muster aus' : color.label}
                  className={`h-10 rounded-lg relative flex items-center justify-center transition-all ${
                    isDisabled
                      ? 'opacity-30 cursor-not-allowed'
                      : 'hover:scale-105 active:scale-95 cursor-pointer shadow-md'
                  } ${
                    isSelected
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0f172a] scale-105 z-10'
                      : ''
                  }`}
                >
                  {isSelected && (
                    <span className="text-white font-black text-sm drop-shadow-md">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-slate-400 pt-1">
            {borderPattern === 'none'
              ? 'Wähle links zuerst eine Rahmen-Animation, um die Farbe anzupassen.'
              : 'Klicke auf eine Farbe, um die Leuchtfarbe des Rahmens dynamisch zu steuern.'}
          </p>
        </div>
      </div>

      {/* Feedback / Statusmeldung */}
      {message && (
        <p className={`text-xs font-bold p-3 rounded-xl border animate-in fade-in ${
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

export default AvatarFrameSelector;
