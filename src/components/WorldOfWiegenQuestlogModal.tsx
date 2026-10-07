import React, { useState } from 'react';
import { ActiveQuest, ActiveEffect, WorldOfWiegenPool } from '../types/worldOfWiegen';
import { getQuestById } from '../constants/worldOfWiegenQuests';
import { BRAND_COLOR } from '../constants';

interface WorldOfWiegenQuestlogModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeQuests: ActiveQuest[];
  activeEffects: ActiveEffect[];
  pool: WorldOfWiegenPool;
  currentRound: number;
  darkMode: boolean;
  onOpenMinigame?: (type: 'E07' | 'E10') => void;
  onToggleQuestPool?: (questId: string, newPool: WorldOfWiegenPool) => void;
}

export const WorldOfWiegenQuestlogModal: React.FC<WorldOfWiegenQuestlogModalProps> = ({
  isOpen,
  onClose,
  activeQuests,
  activeEffects,
  pool,
  currentRound,
  darkMode,
  onOpenMinigame,
  onToggleQuestPool
}) => {
  const [activeTab, setActiveTab] = useState<'quests' | 'effects'>('quests');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`p-5 sm:p-7 rounded-3xl max-w-xl w-full border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto flex flex-col ${
          darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="space-y-3 pb-2 border-b border-gray-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="text-2xl">⚔️</span>
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider flex items-center space-x-1.5">
                  <span>World of Wiegen Questlog</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    pool === 'championswieg' ? 'bg-amber-500/20 text-amber-500' : 'bg-teal-500/20 text-teal-400'
                  }`}>
                    {pool === 'championswieg' ? 'Championswieg' : 'Kreiswiega'}
                  </span>
                </h3>
                <p className="text-[11px] opacity-60">Runde {currentRound} • Aktive Nebenquests &amp; Gruppeneffekte</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-gray-500/20 flex items-center justify-center text-sm opacity-60 hover:opacity-100 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center space-x-2 pt-1">
            <button
              type="button"
              onClick={() => setActiveTab('quests')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                activeTab === 'quests'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'bg-black/5 dark:bg-white/5 opacity-70 hover:opacity-100'
              }`}
            >
              <span>📜</span>
              <span>Aktive Quests ({activeQuests.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('effects')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                activeTab === 'effects'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'bg-black/5 dark:bg-white/5 opacity-70 hover:opacity-100'
              }`}
            >
              <span>✨</span>
              <span>Aktive Effekte ({activeEffects.length})</span>
            </button>
          </div>
        </div>

        {/* TAB 1: QUESTS */}
        {activeTab === 'quests' && (
          <div className="space-y-3">
            {activeQuests.length === 0 ? (
              <div className="p-8 text-center space-y-2 opacity-60 text-xs border border-gray-500/15 rounded-2xl">
                <div>🛡️</div>
                <p>Aktuell keine Nebenquests aktiv.</p>
                <p className="text-[10px]">Neue Quests werden automatisch im Hintergrund ab Runde 2 vergeben!</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
                {activeQuests.map((q) => {
                  const def = getQuestById(q.questId);
                  const isCompleted = q.status === 'completed';
                  const isFailed = q.status === 'failed';

                  return (
                    <div
                      key={q.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isCompleted
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-100'
                          : isFailed
                          ? 'bg-red-500/10 border-red-500/30 opacity-70'
                          : darkMode
                          ? 'bg-slate-800/80 border-slate-700'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl flex-shrink-0">{def?.icon || '📜'}</span>
                          <div>
                            <div className="flex items-center space-x-2 flex-wrap">
                              <span className="font-black text-xs">{def?.name || q.questId}</span>
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                {q.playerName}
                              </span>
                            </div>
                            <p className="text-[11px] opacity-75 mt-0.5 leading-snug">
                              {def?.description}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase whitespace-nowrap ${
                            isCompleted
                              ? 'bg-emerald-500 text-white'
                              : isFailed
                              ? 'bg-red-500 text-white'
                              : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {isCompleted ? '✅ Erfüllt' : isFailed ? '❌ Vorbei' : 'Läuft'}
                        </span>
                      </div>

                      {/* Progress & Difficulty Footer */}
                      <div className="mt-2 pt-2 border-t border-gray-500/15 flex items-center justify-between flex-wrap gap-2 text-[10px]">
                        <div className="flex items-center space-x-2">
                          <span className="opacity-75">{q.progressText || 'Warten auf Rundenwertung...'}</span>
                        </div>

                        <div className="flex items-center space-x-2 ml-auto">
                          {/* Individueller Schwierigkeitsgrad / Pool dieser Quest */}
                          {onToggleQuestPool && !isCompleted && !isFailed ? (
                            <button
                              type="button"
                              onClick={() =>
                                onToggleQuestPool(
                                  q.id,
                                  q.pool === 'championswieg' ? 'kreiswiega' : 'championswieg'
                                )
                              }
                              title="Klicken zum Umschalten zwischen Kreiswiega (symmetrisch) und Championswieg (asymmetrisch)"
                              className={`px-2 py-0.5 rounded-full font-bold border transition-all cursor-pointer flex items-center space-x-1 ${
                                q.pool === 'championswieg'
                                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/30'
                                  : 'bg-teal-500/20 text-teal-600 dark:text-teal-400 border-teal-500/40 hover:bg-teal-500/30'
                              }`}
                            >
                              <span>{q.pool === 'championswieg' ? '👑 Championswieg' : '🤝 Kreiswiega'}</span>
                              <span className="text-[8px] opacity-60">⇄</span>
                            </button>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold border ${
                                q.pool === 'championswieg'
                                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                  : 'bg-teal-500/20 text-teal-600 dark:text-teal-400 border-teal-500/30'
                              }`}
                            >
                              {q.pool === 'championswieg' ? '👑 Championswieg' : '🤝 Kreiswiega'}
                            </span>
                          )}

                          <span className="font-mono opacity-60">
                            Runde {q.assignedRound + 1}–{q.targetRound + 1}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EFFEKTE */}
        {activeTab === 'effects' && (
          <div className="space-y-3">
            {activeEffects.length === 0 ? (
              <div className="p-8 text-center space-y-2 opacity-60 text-xs border border-gray-500/15 rounded-2xl">
                <div>✨</div>
                <p>Aktuell keine Gruppeneffekte aktiv.</p>
                <p className="text-[10px]">Erfülle eine Quest, um mächtige Wiege-Effekte freizuschalten!</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
                {activeEffects.map((eff) => (
                  <div
                    key={eff.id}
                    className={`p-3.5 rounded-2xl border space-y-2 ${
                      darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-2xl flex-shrink-0">{eff.icon}</span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-black text-xs uppercase">{eff.name}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-teal-500/20 text-teal-600 dark:text-teal-400">
                              [{eff.effectId}]
                            </span>
                          </div>
                          <p className="text-[11px] opacity-80 mt-0.5 leading-snug">{eff.description}</p>
                        </div>
                      </div>
                    </div>

                    {/* Drinkbuddy Details */}
                    {eff.drinkBuddyPairs && eff.drinkBuddyPairs.length > 0 && (
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                        🍻 Drinkbuddy-Paar: {eff.drinkBuddyPairs[0].playerA} &amp; {eff.drinkBuddyPairs[0].playerB}
                      </div>
                    )}

                    {/* Ritual Details */}
                    {eff.ritualDescription && (
                      <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-[11px] font-bold text-purple-700 dark:text-purple-300">
                        🧙‍♂️ Pflicht-Ritual vor jedem Schluck: „{eff.ritualDescription}“
                      </div>
                    )}

                    {/* Minigame Launchers */}
                    {(eff.effectId === 'E07' || eff.effectId === 'E10') && onOpenMinigame && (
                      <button
                        type="button"
                        onClick={() => onOpenMinigame(eff.effectId as 'E07' | 'E10')}
                        className="w-full py-2 rounded-xl text-white font-bold text-[11px] uppercase tracking-wider shadow cursor-pointer active:scale-95 transition-all flex items-center justify-center space-x-1.5"
                        style={{ backgroundColor: BRAND_COLOR }}
                      >
                        <i className="fas fa-play text-[10px]"></i>
                        <span>Minigame jetzt starten &amp; auswerten</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-gray-500/15 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl text-xs font-bold border border-gray-500/20 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
