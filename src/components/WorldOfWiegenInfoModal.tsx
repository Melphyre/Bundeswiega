import React from 'react';
import { BRAND_COLOR } from '../constants';

interface WorldOfWiegenInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
}

export const WorldOfWiegenInfoModal: React.FC<WorldOfWiegenInfoModalProps> = ({
  isOpen,
  onClose,
  darkMode
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`p-6 sm:p-7 rounded-3xl max-w-lg w-full border shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto flex flex-col ${
          darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-500/20">
          <div className="flex items-center space-x-2.5">
            <span className="text-2xl">⚔️</span>
            <div>
              <h3 className="font-black text-base sm:text-lg uppercase tracking-tight flex items-center space-x-2">
                <span>World of Wiegen</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  Wiegen forever
                </span>
              </h3>
              <p className="text-[11px] opacity-60">Zusatzmodus für Nebenquests & Gruppen-Chaos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-gray-500/20 flex items-center justify-center text-sm opacity-60 hover:opacity-100 cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Offizieller Pflicht-Hinweis */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-900 dark:text-amber-200 space-y-2">
          <div className="flex items-center space-x-2 font-black text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <span>🛡️</span>
            <span>Wichtige Grundregel & Wertungs-Isolation</span>
          </div>
          <p className="text-xs font-semibold leading-relaxed">
            Aktiviert Nebenquests, Trink-Regeländerungen, Minigames &amp; chaotische Gruppeneffekte!
          </p>
          <div className="p-2.5 rounded-xl bg-black/10 dark:bg-black/30 border border-amber-500/30 text-[11px] font-bold">
            ⚠️ WICHTIG: Sämtliche Quests &amp; Effekte dienen der Unterhaltung und beeinflussen NIEMALS die reguläre Wertung (Points / Pre-Average / Highscores) des Spiels!
          </div>
        </div>

        {/* Die zwei Modus-Pools */}
        <div className="space-y-3">
          <h4 className="font-black text-xs uppercase tracking-wider opacity-75">
            Wählbare Modus-Typen (Effekt-Pools)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`p-3.5 rounded-2xl border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-1.5`}>
              <div className="flex items-center space-x-2">
                <span className="text-lg">🤝</span>
                <span className="font-black text-xs">Kreiswiega</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold">
                Symmetrischer Fokus
              </span>
              <p className="text-[11px] opacity-70 leading-relaxed">
                Effekte betreffen meist alle Spieler gleichermaßen (z.B. kollektives schwaches Händchen, solidarisches Trinken, Gemeinschafts-Minigames).
              </p>
            </div>

            <div className={`p-3.5 rounded-2xl border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-1.5`}>
              <div className="flex items-center space-x-2">
                <span className="text-lg">👑</span>
                <span className="font-black text-xs">Championswieg</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
                Asymmetrischer Fokus
              </span>
              <p className="text-[11px] opacity-70 leading-relaxed">
                Questgewinner erhalten stärkere persönliche Machtvorteile (z.B. Blindwiegen, Zuweisen von Drinkbuddies oder Verdoppeln der Kontrahenten-Strafen).
              </p>
            </div>
          </div>

          {/* Individuelle Quest-Wahl Note */}
          <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-[11px] leading-relaxed space-y-1">
            <div className="flex items-center space-x-1.5 font-black text-teal-600 dark:text-teal-400">
              <span>🎯</span>
              <span>Individueller Schwierigkeitsgrad pro Nebenaufgabe</span>
            </div>
            <p className="opacity-80">
              Der Modus (Kreiswiega oder Championswieg) gilt <strong>nicht universell für alle Spieler</strong>, sondern wird bei Beginn jeder einzelnen Quest individuell ausgewählt! So kann jeder Spieler für seine Quest entscheiden, ob er auf kollektiven Spaß oder scharfe Machtvorteile setzt.
            </p>
          </div>
        </div>

        {/* Quest Lifecycle & Gating */}
        <div className="space-y-2 text-xs opacity-85 leading-relaxed">
          <h4 className="font-black text-xs uppercase tracking-wider opacity-75">
            🎯 Dynamic Skill &amp; Leaderboard Gating
          </h4>
          <p>
            Quests starten automatisch ab Runde 2 und richten sich nach eurem aktuellen Tabellenplatz und Pre-Average:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] opacity-80">
            <li><strong>Starke Wieger (Pre-Average &lt; 7.0g):</strong> Erhalten schwere Präzisions-Aufgaben (z.B. Schnapszahl treffen, Volltreffer ±1g).</li>
            <li><strong>Kellerkinder:</strong> Erhalten Comeback-Aufgaben (z.B. Rote Laterne abgeben, Rang aufholen).</li>
            <li><strong>Führende:</strong> Erhalten Führungsverteidigungs-Herausforderungen.</li>
          </ul>
        </div>

        {/* Schließen Button */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center space-x-2"
            style={{ backgroundColor: BRAND_COLOR }}
          >
            <i className="fas fa-check"></i>
            <span>Verstanden &amp; Bereit zum Wiegen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
