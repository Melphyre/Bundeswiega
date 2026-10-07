import React, { useState } from 'react';
import { Player } from '../../types';
import { BRAND_COLOR } from '../constants';

interface WorldOfWiegenMinigamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  minigameType: 'E07' | 'E10';
  players: Player[];
  darkMode: boolean;
}

export const WorldOfWiegenMinigamesModal: React.FC<WorldOfWiegenMinigamesModalProps> = ({
  isOpen,
  onClose,
  minigameType,
  players,
  darkMode
}) => {
  // E07 State
  const [e07Step, setE07Step] = useState<1 | 2 | 3>(1);
  const [e07StartWeight, setE07StartWeight] = useState<string>('');
  const [e07AfterWeight, setE07AfterWeight] = useState<string>('');

  // E10 State
  const [e10TargetWeight] = useState<number>(() => Math.floor(Math.random() * (520 - 70 + 1)) + 70);
  const [e10PlayerWeights, setE10PlayerWeights] = useState<Record<string, string>>({});
  const [e10Finished, setE10Finished] = useState(false);

  if (!isOpen) return null;

  // E07 Calculations
  const startW = parseFloat(e07StartWeight) || 0;
  const targetReduction = 10 * players.length;
  const e07Target = Math.max(0, startW - targetReduction);
  const afterW = parseFloat(e07AfterWeight) || 0;
  const e07Difference = Math.abs(afterW - e07Target);
  const e07Tolerance = targetReduction * 0.2; // 20% of target reduction
  const e07Passed = afterW > 0 && e07Difference <= e07Tolerance;

  // E10 Calculations
  const e10Results = players.map(p => {
    const w = parseFloat(e10PlayerWeights[p.id]) || 0;
    const diff = Math.abs(w - e10TargetWeight);
    return { player: p, weight: w, diff };
  });
  const maxDiff = Math.max(...e10Results.map(r => r.diff));
  const losers = e10Results.filter(r => r.diff === maxDiff);

  return (
    <div className="fixed inset-0 z-[850] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`p-6 sm:p-7 rounded-3xl max-w-lg w-full border shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto flex flex-col ${
          darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-500/20">
          <div className="flex items-center space-x-2.5">
            <span className="text-2xl">{minigameType === 'E07' ? '💧' : '🔑'}</span>
            <div>
              <h3 className="font-black text-base uppercase tracking-tight flex items-center space-x-2">
                <span>{minigameType === 'E07' ? 'E07: Zwiwa – Zwischenwasser' : 'E10: Das Spiel heißt Wiegen'}</span>
              </h3>
              <p className="text-[11px] opacity-60">
                {minigameType === 'E07' ? 'Hydrierendes Gruppen-Minigame' : 'Alltagsgegenstände-Wiegen'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-gray-500/20 flex items-center justify-center text-sm opacity-60 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* MINIGAME E07: Zwiwa */}
        {minigameType === 'E07' && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
              <strong>Regeln:</strong> Jeder füllt sein Schnapsglas mit Wasser. Das Gesamtgewicht aller Gläser wird gewogen. Nach einem Schluck etwa zur Hälfte wiegt ihr erneut. Weicht ihr &gt; 20% ab, trinken ALLE Strafschnaps!
            </div>

            {e07Step === 1 && (
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider">
                  Schritt 1: Gesamtgewicht aller gefüllten Wassergläser (Gramm)
                </label>
                <input
                  type="number"
                  value={e07StartWeight}
                  onChange={(e) => setE07StartWeight(e.target.value)}
                  placeholder="z.B. 450"
                  className="w-full p-4 rounded-xl border-2 font-mono text-center text-2xl font-black bg-transparent"
                  style={{ borderColor: BRAND_COLOR }}
                />
                <button
                  type="button"
                  disabled={!startW}
                  onClick={() => setE07Step(2)}
                  className="w-full py-3.5 rounded-2xl text-white font-bold text-xs uppercase tracking-wider shadow disabled:opacity-40 cursor-pointer"
                  style={{ backgroundColor: BRAND_COLOR }}
                >
                  Weiter zum Trinken &amp; Zielberechnung
                </button>
              </div>
            )}

            {e07Step === 2 && (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold opacity-75">Berechnetes Zielgewicht der Gruppe:</span>
                  <div className="text-3xl font-mono font-black text-teal-600 dark:text-teal-400">
                    {e07Target.toFixed(0)}g
                  </div>
                  <p className="text-[11px] opacity-70">
                    (Ausgangsbasis {startW}g abzüglich 10g x {players.length} Spieler = {targetReduction}g Wasserabzug)
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-center font-bold text-amber-700 dark:text-amber-300">
                  🥤 Jetzt trinkt jeder ca. die Hälfte seines Wasserglases!
                </div>

                <label className="block text-xs font-bold uppercase tracking-wider pt-2">
                  Schritt 2: Neues Gesamtgewicht aller Gläser nach dem Trinken
                </label>
                <input
                  type="number"
                  value={e07AfterWeight}
                  onChange={(e) => setE07AfterWeight(e.target.value)}
                  placeholder="z.B. 405"
                  className="w-full p-4 rounded-xl border-2 font-mono text-center text-2xl font-black bg-transparent"
                  style={{ borderColor: BRAND_COLOR }}
                />

                <button
                  type="button"
                  disabled={!afterW}
                  onClick={() => setE07Step(3)}
                  className="w-full py-3.5 rounded-2xl text-white font-bold text-xs uppercase tracking-wider shadow disabled:opacity-40 cursor-pointer"
                  style={{ backgroundColor: BRAND_COLOR }}
                >
                  Auswertung anzeigen
                </button>
              </div>
            )}

            {e07Step === 3 && (
              <div className="space-y-4">
                <div
                  className={`p-5 rounded-2xl border text-center space-y-2 ${
                    e07Passed
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
                      : 'bg-red-500/15 border-red-500/40 text-red-900 dark:text-red-200'
                  }`}
                >
                  <div className="text-3xl">{e07Passed ? '🎉' : '💀'}</div>
                  <h4 className="font-black text-base uppercase">
                    {e07Passed ? 'Zwiwa Bestanden!' : 'Zwiwa Verpatzt! Strafe fällig!'}
                  </h4>
                  <p className="text-xs leading-relaxed">
                    Ziel war <strong>{e07Target.toFixed(0)}g</strong>. Ihr habt <strong>{afterW}g</strong> gewogen (Differenz: <strong>{e07Difference.toFixed(1)}g</strong>).
                    Toleranzbereich war ±{e07Tolerance.toFixed(1)}g (20%).
                  </p>
                  <div className="p-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-black/20">
                    {e07Passed
                      ? '✅ Niemand muss trinken! Perfekte Gruppen-Hydrierung.'
                      : '🥃 STRAFE: ALLE Spieler trinken sofort einen Strafschnaps! (Wertung bleibt unberührt)'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3.5 rounded-2xl text-white font-bold text-xs uppercase tracking-wider shadow cursor-pointer"
                  style={{ backgroundColor: BRAND_COLOR }}
                >
                  Zurück zum Spiel
                </button>
              </div>
            )}
          </div>
        )}

        {/* MINIGAME E10: Das Spiel heißt Wiegen */}
        {minigameType === 'E10' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">
                Generiertes Alltags-Zielgewicht:
              </span>
              <div className="text-4xl font-mono font-black text-amber-500">{e10TargetWeight}g</div>
              <p className="text-xs opacity-75">
                Jeder sucht jetzt einen Gegenstand (Schlüssel, Handy, Schuh, Besteck etc., kein Drink!) und wiegt ihn.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider opacity-75">
                Gewichte der Gegenstände eintragen:
              </label>
              {players.map(p => (
                <div key={p.id} className="flex items-center justify-between space-x-2">
                  <span className="font-bold text-xs truncate w-1/3">{p.name}:</span>
                  <input
                    type="number"
                    value={e10PlayerWeights[p.id] || ''}
                    onChange={(e) =>
                      setE10PlayerWeights({ ...e10PlayerWeights, [p.id]: e.target.value })
                    }
                    placeholder="Gramm"
                    className="flex-1 p-2 rounded-xl border font-mono text-center text-sm font-bold bg-transparent"
                  />
                </div>
              ))}
            </div>

            {!e10Finished ? (
              <button
                type="button"
                onClick={() => setE10Finished(true)}
                className="w-full py-3.5 rounded-2xl text-white font-bold text-xs uppercase tracking-wider shadow cursor-pointer"
                style={{ backgroundColor: BRAND_COLOR }}
              >
                Ergebnis auswerten
              </button>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/40 text-center space-y-1.5">
                  <div className="text-2xl">🥃</div>
                  <h4 className="font-black text-sm uppercase text-red-500">Trinkstrafe für:</h4>
                  <div className="font-black text-base">
                    {losers.map(l => l.player.name).join(', ')}
                  </div>
                  <p className="text-xs opacity-80">
                    Weiteste Abweichung mit {maxDiff}g Differenz zum Ziel {e10TargetWeight}g!
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 rounded-2xl text-white font-bold text-xs uppercase tracking-wider shadow cursor-pointer"
                  style={{ backgroundColor: BRAND_COLOR }}
                >
                  Fertig &amp; Runde fortsetzen
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
