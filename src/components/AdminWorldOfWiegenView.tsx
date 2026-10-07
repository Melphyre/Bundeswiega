import React, { useState } from 'react';
import { WORLD_OF_WIEGEN_QUESTS } from '../constants/worldOfWiegenQuests';
import { WORLD_OF_WIEGEN_EFFECTS } from '../constants/worldOfWiegenEffects';
import { BRAND_COLOR } from '../constants';

interface AdminWorldOfWiegenViewProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
}

export const AdminWorldOfWiegenView: React.FC<AdminWorldOfWiegenViewProps> = ({
  isOpen,
  onClose,
  darkMode
}) => {
  const [activeTab, setActiveTab] = useState<'quests' | 'effects'>('quests');
  const [poolFilter, setPoolFilter] = useState<'all' | 'kreiswiega' | 'championswieg'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredQuests = WORLD_OF_WIEGEN_QUESTS.filter(q => {
    if (poolFilter !== 'all' && q.pool !== 'both' && q.pool !== poolFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        q.name.toLowerCase().includes(query) ||
        q.description.toLowerCase().includes(query) ||
        q.id.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const filteredEffects = WORLD_OF_WIEGEN_EFFECTS.filter(e => {
    if (poolFilter !== 'all' && e.pool !== 'both' && e.pool !== poolFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        e.name.toLowerCase().includes(query) ||
        e.description.toLowerCase().includes(query) ||
        e.code.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-[850] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`p-6 sm:p-8 rounded-3xl max-w-4xl w-full border shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto flex flex-col ${
          darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-500/20">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">⚔️</span>
            <div>
              <h3 className="font-black text-lg uppercase tracking-tight flex items-center space-x-2">
                <span>World of Wiegen: Quests &amp; Effekte</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-500 border border-red-500/30">
                  👑 Admin-Übersicht
                </span>
              </h3>
              <p className="text-xs opacity-60">
                Vollständiger Katalog aller 16 Nebenquests und 13 Effekte zur Prüfung &amp; zukünftigen Erweiterung
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-gray-500/20 flex items-center justify-center text-sm opacity-60 hover:opacity-100 cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Filter & Suche Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('quests')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'quests'
                  ? 'bg-amber-500 text-black shadow'
                  : 'bg-black/5 dark:bg-white/5 opacity-70 hover:opacity-100'
              }`}
            >
              <span>📜 Nebenquests ({filteredQuests.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('effects')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'effects'
                  ? 'bg-teal-500 text-white shadow'
                  : 'bg-black/5 dark:bg-white/5 opacity-70 hover:opacity-100'
              }`}
            >
              <span>✨ Effekte E01–E13 ({filteredEffects.length})</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <select
              value={poolFilter}
              onChange={(e) => setPoolFilter(e.target.value as any)}
              className="p-2 rounded-xl border text-xs font-bold bg-transparent cursor-pointer"
            >
              <option value="all">Alle Pools</option>
              <option value="kreiswiega">Nur Kreiswiega</option>
              <option value="championswieg">Nur Championswieg</option>
            </select>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Suche..."
              className="p-2 rounded-xl border text-xs font-bold bg-transparent w-full sm:w-36"
            />
          </div>
        </div>

        {/* TAB 1: QUESTS LIST */}
        {activeTab === 'quests' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {filteredQuests.map((q) => (
              <div
                key={q.id}
                className={`p-4 rounded-2xl border space-y-2.5 transition-all ${
                  darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-2xl">{q.icon}</span>
                    <div>
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <h4 className="font-black text-sm">{q.name}</h4>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono opacity-50">
                          #{q.id}
                        </span>
                      </div>
                      <span className="text-[10px] opacity-60 font-semibold uppercase">{q.shortTitle}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                    q.difficulty === 'extreme' ? 'bg-red-500/20 text-red-500' : q.difficulty === 'hard' ? 'bg-amber-500/20 text-amber-500' : 'bg-teal-500/20 text-teal-400'
                  }`}>
                    {q.difficulty}
                  </span>
                </div>

                <p className="text-xs opacity-85 leading-relaxed">{q.description}</p>

                {q.epicLore && (
                  <p className="text-[11px] italic opacity-65 border-l-2 pl-2 border-amber-500/30">
                    „{q.epicLore}“
                  </p>
                )}

                {/* Gating & Constraints */}
                <div className="flex items-center flex-wrap gap-1.5 pt-1 text-[10px]">
                  <span className="px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 font-mono">
                    ⏱️ {q.durationRounds} Runden
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10">
                    📂 {q.category}
                  </span>
                  {q.maxPreAverage && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-bold">
                      Pre-Avg &lt; {q.maxPreAverage}g
                    </span>
                  )}
                  {q.requiresLeader && (
                    <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-bold">
                      👑 Nur Platz 1
                    </span>
                  )}
                  {q.requiresTail && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold">
                      🏮 Nur Letzter
                    </span>
                  )}
                  {q.requiresRankMin && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold">
                      Rang ≥ {q.requiresRankMin}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 opacity-70">
                    Pool: {q.pool === 'both' ? 'Beide' : q.pool}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: EFFECTS LIST */}
        {activeTab === 'effects' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {filteredEffects.map((e) => (
              <div
                key={e.code}
                className={`p-4 rounded-2xl border space-y-2.5 transition-all ${
                  darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-2xl">{e.icon}</span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-teal-500/20 text-teal-600 dark:text-teal-400">
                          {e.code}
                        </span>
                        <h4 className="font-black text-sm uppercase">{e.name}</h4>
                      </div>
                      <span className="text-[10px] opacity-60 font-semibold">{e.subtitle}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-black/10 dark:bg-white/10 uppercase">
                    {e.durationLabel}
                  </span>
                </div>

                <p className="text-xs opacity-85 leading-relaxed">{e.description}</p>

                {e.flavorText && (
                  <p className="text-[11px] italic opacity-65 border-l-2 pl-2 border-teal-500/30">
                    „{e.flavorText}“
                  </p>
                )}

                <div className="flex items-center flex-wrap gap-1.5 pt-1 text-[10px]">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${
                    e.isAsymmetric ? 'bg-amber-500/20 text-amber-500' : 'bg-teal-500/20 text-teal-400'
                  }`}>
                    {e.isAsymmetric ? '⚡ Asymmetrisch' : '🤝 Symmetrisch'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10">
                    Pool: {e.pool === 'both' ? 'Beide Pools' : e.pool === 'kreiswiega' ? 'Nur Kreiswiega' : 'Nur Championswieg'}
                  </span>
                  {e.isMinigame && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold">
                      🎮 Minigame
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-gray-500/20 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-bold border border-gray-500/20 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
