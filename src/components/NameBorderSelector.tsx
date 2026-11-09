import React, { useState, useEffect } from 'react';
import {
  NameBorderPatternId,
  NameBgColorId,
  NAME_BORDER_PATTERNS,
  parseNameBorder,
  NameBorderPatternOption
} from '../constants/nameTagConfig';
import { PlayerNameTag } from './PlayerNameTag';
import { getUserQuestCounters, UserQuestCounters } from '../utils/questEvaluator';

export interface NameBorderSelectorProps {
  currentValue?: string | null;
  userLevel: number;
  userQuests?: UserQuestCounters;
  userId?: string;
  unlockedContext?: {
    completedQuestIds?: string[];
    achievementsCount?: number;
    standardWins?: number;
    unlockedColors?: string[];
    userQuests?: UserQuestCounters;
    questProgresses?: any[];
    myGameData?: any[];
    myAchievementsData?: any[];
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
  userQuests,
  userId,
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
  const [borderPattern, setBorderPattern] = useState<NameBorderPatternId>(
    initialParsed.patternId === 'none' ? 'simple' : initialParsed.patternId
  );
  const [selectedColor, setSelectedColor] = useState<string>(initialParsed.colorId);


  // Kumulierte Zähler über alle Spiele für die gestaffelten Quests
  const effectiveQuests: UserQuestCounters =
    userQuests ||
    unlockedContext?.userQuests ||
    getUserQuestCounters(
      userId,
      unlockedContext?.questProgresses,
      unlockedContext?.myGameData,
      unlockedContext?.myAchievementsData
    );

  // 11 Rahmen-Muster: Level 3 Basis + Level 5 Quest-Rahmen
  const borderPatterns = [
    // Level 3 Standard (ohne Quest)
    {
      id: 'none' as NameBorderPatternId,
      name: 'Kein Rahmen',
      icon: '🚫',
      minLevel: 0,
      unlocked: true,
      description: 'Kein zusätzlicher Rahmen um das Namensschild'
    },
    {
      id: 'simple' as NameBorderPatternId,
      name: 'Einfacher Rahmen',
      icon: '🔲',
      minLevel: 3,
      unlocked: userLevel >= 3,
      description: 'Einfacher Balkenrahmen um dein Namenskärtchen in der gewählten Farbe ohne Animation'
    },
    {
      id: 'neon-glow' as NameBorderPatternId,
      name: 'Pulsierender Neon-Glow',
      icon: '✨',
      minLevel: 3,
      unlocked: userLevel >= 3,
      description: 'Sanft pulsierender, leuchtender Box-Shadow und Rahmen in deiner gewählten Farbe'
    },

    // Level 5 Quest-Rahmen
    {
      id: 'hearts' as NameBorderPatternId,
      name: 'Herzchen-Regen',
      icon: '💖',
      minLevel: 5,
      unlocked: userLevel >= 5 && ((effectiveQuests.ach_67 || 0) >= 3),
      progress: Math.min(3, effectiveQuests.ach_67 || 0),
      target: 3,
      questTitle: '3x Achievement "67"',
      description: 'Rieselnder Herzchen-Regen in deiner gewählten Rahmen-Farbe um das Namensschild'
    },
    {
      id: 'flame' as NameBorderPatternId,
      name: 'Wandernde Flamme',
      icon: '🔥',
      minLevel: 5,
      unlocked: userLevel >= 5 && ((effectiveQuests.speed_avg_sub5 || 0) >= 3),
      progress: Math.min(3, effectiveQuests.speed_avg_sub5 || 0),
      target: 3,
      questTitle: 'Speedwiegen: 3x Avg < 5g',
      description: 'Wandernder Glutpunkt mit dynamischer Funkenspur in deiner gewählten Rahmen-Farbe'
    },
    {
      id: 'lightning' as NameBorderPatternId,
      name: 'Elektrischer Blitz',
      icon: '⚡',
      minLevel: 5,
      unlocked: userLevel >= 5 && ((effectiveQuests.speed_time_sub100 || 0) >= 3),
      progress: Math.min(3, effectiveQuests.speed_time_sub100 || 0),
      target: 3,
      questTitle: 'Speedwiegen: 3x Zeit < 100s',
      description: 'Hochenergetischer Lichtbogen zischt als Ring-Animation um die Kanten'
    },
    {
      id: 'wave' as NameBorderPatternId,
      name: 'Schwapp-Welle',
      icon: '🌊',
      minLevel: 5,
      unlocked: userLevel >= 5 && ((effectiveQuests.ach_knapp_daneben || 0) >= 5),
      progress: Math.min(5, effectiveQuests.ach_knapp_daneben || 0),
      target: 5,
      questTitle: '5x "Knapp daneben"',
      description: 'Fließende Meereswelle läuft als Kontur-Animation um den äußeren Rand'
    },
    {
      id: 'cyber' as NameBorderPatternId,
      name: 'Industrie-Neonrahmen (Flimmern)',
      icon: '⚡',
      minLevel: 5,
      unlocked: userLevel >= 5 && ((effectiveQuests.ach_kopfrechner || 0) >= 5),
      progress: Math.min(5, effectiveQuests.ach_kopfrechner || 0),
      target: 5,
      questTitle: '5x "Kopfrechner"',
      description: 'Doppelter Industrie-Neon-Schlauch an der Unterkante mit Wackelkontakt & Flimmer-Effekt'
    },
    {
      id: 'laser' as NameBorderPatternId,
      name: 'Laufender Laser-Rahmen',
      icon: '🎯',
      minLevel: 5,
      unlocked: userLevel >= 5 && ((effectiveQuests.ach_scharfschuetze || 0) >= 5),
      progress: Math.min(5, effectiveQuests.ach_scharfschuetze || 0),
      target: 5,
      questTitle: '5x "Scharfschütze"',
      description: 'Präziser Laser-Lichtstrahl kreist als Border-Light exakt auf der Außenkante'
    },
    {
      id: 'snow-frame' as NameBorderPatternId,
      name: 'Eiszapfen / Schnee',
      icon: '❄️',
      minLevel: 5,
      unlocked: userLevel >= 5 && ((effectiveQuests.zwilling || 0) >= 5),
      progress: Math.min(5, effectiveQuests.zwilling || 0),
      target: 5,
      questTitle: '5x Wiegezwilling',
      description: 'Hängende Eiszapfen & rieselnde Schneeflocken mit frostigem Farb-Glow'
    },
    {
      id: 'matrix-frame' as NameBorderPatternId,
      name: 'Matrix-Code-Rahmen',
      icon: '💻',
      minLevel: 5,
      unlocked: userLevel >= 5 && ((effectiveQuests.stratege || 0) >= 5),
      progress: Math.min(5, effectiveQuests.stratege || 0),
      target: 5,
      questTitle: '5x Achievement Stratege',
      description: 'Rieselnder digitaler Matrix-Zahlencode unterhalb des Namensschildes'
    }
  ];

  // 10 Farb-Swatches:
  // 1x Deaktiviert ("Keine Farbe") + 4 Basis (Level 3) + 2 Quest (Level 3) + 3 Quest (Level 4)
  const swatches = [
    // 0. Keine Farbe (deaktiviert den Rahmen)
    {
      id: 'none',
      label: 'Keine Farbe (Deaktiviert)',
      hex: 'transparent',
      minLevel: 0,
      unlocked: true,
      aliases: ['none', 'keine', 'transparent', '']
    },

    // Level 3 Basis-Farben
    {
      id: 'red',
      label: 'Rot',
      hex: '#ef4444',
      minLevel: 3,
      unlocked: userLevel >= 3,
      aliases: ['red', 'rot', '#ef4444', '#dc2626']
    },
    {
      id: 'yellow',
      label: 'Gelb',
      hex: '#eab308',
      minLevel: 3,
      unlocked: userLevel >= 3,
      aliases: ['yellow', 'gelb', '#eab308', '#facc15']
    },
    {
      id: 'blue',
      label: 'Blau',
      hex: '#3b82f6',
      minLevel: 3,
      unlocked: userLevel >= 3,
      aliases: ['blue', 'blau', '#3b82f6', '#2563eb']
    },
    {
      id: 'green',
      label: 'Grün',
      hex: '#22c55e',
      minLevel: 3,
      unlocked: userLevel >= 3,
      aliases: ['green', 'gruen', 'grün', '#22c55e', '#16a34a']
    },

    // Level 3 Quest-Farben
    {
      id: 'pink',
      label: 'Pink',
      hex: '#ec4899',
      minLevel: 3,
      unlocked: userLevel >= 3 && (effectiveQuests.schnapszahl >= 5),
      questTitle: '5x Schnapszahl treffen',
      questName: 'Schnapszahl-Künstler',
      progress: Math.min(5, effectiveQuests.schnapszahl || 0),
      target: 5,
      aliases: ['pink', 'rosa', '#ec4899']
    },
    {
      id: 'teal',
      label: 'Türkis',
      hex: '#14b8a6',
      minLevel: 3,
      unlocked: userLevel >= 3 && (effectiveQuests.hunderter >= 5),
      questTitle: '5x glatte Hunderterzahl',
      questName: 'Hunderter-Profi',
      progress: Math.min(5, effectiveQuests.hunderter || 0),
      target: 5,
      aliases: ['teal', 'turquoise', 'tuerkis', 'türkis', '#14b8a6', '#0d9488']
    },

    // Level 4 Quest-Farben
    {
      id: 'orange',
      label: 'Orange',
      hex: '#f97316',
      minLevel: 4,
      unlocked: userLevel >= 4 && (effectiveQuests.stratege >= 5),
      questTitle: '5x Achievement "Stratege"',
      questName: 'Taktischer Stratege',
      progress: Math.min(5, effectiveQuests.stratege || 0),
      target: 5,
      aliases: ['orange', 'neon_orange', '#f97316', '#ff5e00']
    },
    {
      id: 'purple',
      label: 'Dunkelblau / Lila',
      hex: '#a855f7',
      minLevel: 4,
      unlocked: userLevel >= 4 && (effectiveQuests.zwilling >= 5),
      questTitle: '5x Wiegezwilling werden',
      questName: 'Wiegezwilling',
      progress: Math.min(5, effectiveQuests.zwilling || 0),
      target: 5,
      aliases: ['purple', 'deep_purple', 'purpur', 'lila', 'violett', '#a855f7', '#4c1d95']
    },
    {
      id: 'cyan',
      label: 'Cyan / Mint',
      hex: '#06b6d4',
      minLevel: 4,
      unlocked: userLevel >= 4 && (effectiveQuests.exactFiveG >= 5),
      questTitle: '5x exakt 5g Abstand (gesamt über Spiele)',
      questName: 'Präzisions-Schuss',
      progress: Math.min(5, effectiveQuests.exactFiveG || 0),
      target: 5,
      aliases: ['cyan', 'mint', 'neon_mint', '#06b6d4', '#00ffa3']
    }
  ];

  // Gesperrte Rahmen-Muster und 'Kein Rahmen' ausblenden: 'none' wird nicht mehr im Dropdown angezeigt
  const availablePatterns = borderPatterns.filter(p => p.unlocked && p.id !== 'none');

  // Synchronisation bei externen Prop-Änderungen oder wenn das gewählte Muster noch nicht freigeschaltet ist
  useEffect(() => {
    const parsed = parseNameBorder(currentValue);
    const isValid = availablePatterns.some(p => p.id === parsed.patternId);
    const chosenPattern = isValid ? parsed.patternId : (availablePatterns[0]?.id || 'simple');
    setBorderPattern(chosenPattern);
    setSelectedColor(parsed.colorId);
  }, [currentValue, userLevel, availablePatterns.length]);

  const activePattern =
    availablePatterns.find(p => p.id === borderPattern) || availablePatterns[0] || borderPatterns[1];

  const activeColorMatch =
    swatches.find(s =>
      selectedColor === s.id ||
      selectedColor === s.hex ||
      (s.aliases && s.aliases.includes(String(selectedColor).toLowerCase()))
    ) || swatches[0];

  const isColorDeactivated = selectedColor === 'none' || selectedColor === 'transparent' || selectedColor === '';

  const handlePatternChange = (newPatternId: NameBorderPatternId) => {
    if (disabled) return;
    const targetPattern = availablePatterns.find(p => p.id === newPatternId);
    if (!targetPattern) return;

    setBorderPattern(newPatternId);

    const colorToUse = selectedColor || 'none';
    const serialized = `${newPatternId}:${colorToUse}`;
    onSave(newPatternId, colorToUse as NameBgColorId, serialized);
  };

  const handleColorChange = (swatch: typeof swatches[0]) => {
    if (disabled || !swatch.unlocked) return;
    setSelectedColor(swatch.id);
    
    // Nur speichern, wenn auch das gewählte Rahmenmuster freigeschaltet ist
    if (activePattern.unlocked) {
      const serialized = `${borderPattern}:${swatch.id}`;
      onSave(borderPattern, swatch.id as NameBgColorId, serialized);
    }
  };

  // Wenn keine Farbe gewählt ist, wird der Rahmen automatisch deaktiviert
  const previewSerialized = isColorDeactivated ? `${borderPattern}:none` : `${borderPattern}:${selectedColor}`;
  const unlockedColorsCount = swatches.filter(s => s.id !== 'none' && s.unlocked).length;
  // Gesperrte Farben komplett ausblenden: nur freigeschaltete Farben und 'none' im DOM rendern
  const visibleSwatches = swatches.filter(s => s.id === 'none' || s.unlocked);

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
          <span className={`px-2 py-0.5 rounded-md border ${
            !activePattern.unlocked
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
          }`}>
            {!activePattern.unlocked && '🔒 '}Rahmen: {activePattern.name}
          </span>
          {isColorDeactivated ? (
            <span className="px-2 py-0.5 rounded-md bg-slate-500/15 text-slate-400 border border-slate-500/30">
              Status: Deaktiviert (Farbe: Keine)
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-400 border border-teal-500/30">
              Farbe: {activeColorMatch.label}
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
              <span>🔲 RAHMEN-STIL / MUSTER:</span>
            </label>
            <span className="text-[10px] font-bold opacity-60">
              {availablePatterns.length} / {borderPatterns.length - 1} freigeschaltet
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
            {availablePatterns.map((pattern) => (
              <option
                key={pattern.id}
                value={pattern.id}
              >
                {pattern.icon} {pattern.name}
              </option>
            ))}
          </select>

          {/* Status- / Erklärungskarte zum gewählten Rahmen */}
          <div className="text-[11px] leading-relaxed opacity-85 p-2.5 rounded-lg bg-black/20 border border-purple-500/20">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-purple-300 flex items-center space-x-1.5">
                <span>{activePattern.icon} {activePattern.name}</span>
              </span>
              <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded border ${
                isColorDeactivated
                  ? 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {isColorDeactivated ? 'Deaktiviert (Farbe: Keine)' : 'Aktiv'}
              </span>
            </div>
            <p className="text-[11px] opacity-75">{activePattern.description}</p>
          </div>
        </div>

        {/* SPALTE RECHTS: Wählbare Rahmen-Farben (inklusive "Keine Farbe" Kachel) */}
        <div className={`p-3.5 rounded-xl border space-y-2.5 ${
          darkMode ? 'bg-slate-900/40 border-teal-500/30' : 'bg-teal-50/50 border-teal-200'
        }`}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-teal-400 flex items-center space-x-1.5">
              <span>🎨 RAHMEN-FARBE (SWATCHES):</span>
            </label>
            <span className="text-[10px] font-bold opacity-60">
              {unlockedColorsCount} / {swatches.length - 1} Farben frei
            </span>
          </div>

          {/* Grid der Farbkärtchen (nur freigeschaltete Farben rendern, gesperrte komplett ausblenden) */}
          <div className="grid grid-cols-5 gap-2 p-1">
            {visibleSwatches.map((swatch) => {
              const isClickable = !disabled;
              const isSelected =
                swatch.id === 'none'
                  ? isColorDeactivated
                  : selectedColor === swatch.id ||
                    selectedColor === swatch.hex ||
                    (swatch.aliases && swatch.aliases.includes(String(selectedColor).toLowerCase()));

              const tooltipText = swatch.id === 'none'
                ? 'Keine Farbe (Deaktiviert den Rahmen)'
                : `${swatch.label} (Freigeschaltet)`;

              return (
                <button
                  key={swatch.id}
                  type="button"
                  disabled={!isClickable}
                  style={swatch.id === 'none' ? undefined : { backgroundColor: swatch.hex }}
                  className={`relative h-11 rounded-lg transition-transform flex items-center justify-center hover:scale-105 shadow-md cursor-pointer ${
                    swatch.id === 'none'
                      ? (darkMode ? 'bg-slate-800/80 border-2 border-dashed border-slate-600' : 'bg-slate-100 border-2 border-dashed border-slate-300')
                      : ''
                  } ${
                    isSelected
                      ? 'ring-3 ring-offset-2 ring-teal-400 scale-105 z-10 shadow-lg'
                      : ''
                  } ${
                    darkMode ? 'ring-offset-slate-900' : 'ring-offset-white'
                  }`}
                  title={tooltipText}
                  onClick={() => isClickable && handleColorChange(swatch)}
                >
                  {/* Kachel für "Keine Farbe" */}
                  {swatch.id === 'none' && (
                    <div className="flex flex-col items-center justify-center select-none pointer-events-none">
                      <span className="text-sm">🚫</span>
                      <span className="text-[8px] font-black uppercase tracking-tight opacity-75">Keine</span>
                    </div>
                  )}

                  {/* Häkchen bei ausgewählter Farbe */}
                  {isSelected && (
                    <span className={`font-black text-xs leading-none select-none pointer-events-none ${
                      swatch.id === 'none'
                        ? 'absolute top-1 right-1 text-teal-400 font-extrabold'
                        : 'drop-shadow-md text-white'
                    }`}>
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-[11px] opacity-75 pt-0.5 flex items-center justify-between">
            <span>
              {isColorDeactivated
                ? 'Rahmen ist deaktiviert. Wähle eine Farbe, um ihn einzuschalten.'
                : 'Klicke auf "Keine", um den Rahmen zu deaktivieren, oder wähle eine Farbe.'}
            </span>
            <span className={`font-bold ${isColorDeactivated ? 'text-slate-400' : 'text-teal-400'}`}>
              {isColorDeactivated ? 'Deaktiviert' : activeColorMatch.label}
            </span>
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
