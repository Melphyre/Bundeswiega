import React, { useState } from 'react';
import { LEVEL_QUESTS, QuestDefinition, getQuestTarget } from '../utils/questEvaluator';

export interface QuestProgress {
  quest_id: string;
  current_progress: number;
  is_completed: boolean;
}

export interface QuestListProps {
  userLevel: number;
  questProgresses: QuestProgress[];
  userId?: string;
  loading?: boolean;
  onQuestUpdated?: () => void;
  darkMode?: boolean;
}

export const QuestList: React.FC<QuestListProps> = ({
  userLevel,
  questProgresses,
  loading = false,
  darkMode = true
}) => {
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);

  const progressMap = new Map<string, QuestProgress>(
    (questProgresses || []).map(p => [p.quest_id, p])
  );

  // Alle für das aktuelle Nutzerlevel freigeschalteten Quests
  const currentLvl = Math.max(1, Number(userLevel) || 1);
  const visibleQuests = LEVEL_QUESTS.filter(q => q.level <= currentLvl);

  // Unterteilung in aktive und abgeschlossene Quests
  const activeQuests = visibleQuests.filter(q => !progressMap.get(q.id)?.is_completed);
  const completedQuests = visibleQuests.filter(q => Boolean(progressMap.get(q.id)?.is_completed));

  // Aktive Quests nach Level gruppieren und aufsteigend sortieren
  const levelsWithActiveQuests = Array.from(
    new Set(activeQuests.map(q => q.level))
  ).sort((a, b) => a - b);

  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 border transition-colors shadow-lg space-y-5 ${
        darkMode
          ? 'bg-[#121c2d] border-slate-700/60 text-white'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      {/* Header mit Gesamtfortschritt */}
      <div
        className={`flex items-center justify-between flex-wrap gap-2 pb-3 border-b ${
          darkMode ? 'border-slate-700/60' : 'border-slate-200'
        }`}
      >
        <div>
          <h3
            className={`text-base sm:text-lg font-black flex items-center gap-2 ${
              darkMode ? 'text-white' : 'text-slate-900'
            }`}
          >
            <span className="text-amber-400">🎯</span>
            <span>Aufgaben &amp; Level-Quests</span>
          </h3>
          <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Aktuelles Level: <strong className="text-amber-500 font-bold">Level {currentLvl}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {loading && (
            <span className={`text-xs flex items-center gap-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <i className="fas fa-spinner fa-spin text-xs"></i>
            </span>
          )}
          <span
            className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-300'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            {completedQuests.length} / {visibleQuests.length} erledigt
          </span>
        </div>
      </div>

      {/* ─── BEREICH 1: AKTIVE QUESTS (NACH LEVEL SORTIERT) ─── */}
      <div className="space-y-5">
        {activeQuests.length === 0 ? (
          <div
            className={`p-4 rounded-xl border text-center space-y-1 ${
              darkMode
                ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            <p className="font-bold text-sm">
              🎉 Alle Quests bis Level {currentLvl} abgeschlossen!
            </p>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Steige im Level auf, um die nächsten Aufgaben freizuschalten.
            </p>
          </div>
        ) : (
          levelsWithActiveQuests.map(level => {
            const questsOfLevel = activeQuests.filter(q => q.level === level);

            return (
              <div key={level} className="space-y-3">
                {/* Level Überschrift ("Level 1", "Level 2", etc.) */}
                <div
                  className={`flex items-center gap-2.5 pt-1 pb-1.5 border-b ${
                    darkMode ? 'border-slate-700/50' : 'border-slate-200'
                  }`}
                >
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-500 font-extrabold text-xs tracking-wider border border-amber-500/30 flex items-center gap-1.5 shadow-xs">
                    <span>⭐</span>
                    <span>Level {level}</span>
                  </span>
                  <div className={`h-px flex-1 ${darkMode ? 'bg-slate-700/40' : 'bg-slate-200'}`} />
                  <span className={`text-[11px] font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {questsOfLevel.length} {questsOfLevel.length === 1 ? 'offene Aufgabe' : 'offene Aufgaben'}
                  </span>
                </div>

                {/* Quests dieses Levels */}
                <div className="space-y-2.5">
                  {questsOfLevel.map(quest => {
                    const prog = progressMap.get(quest.id);
                    const current = prog ? Number(prog.current_progress) || 0 : 0;
                    const target = getQuestTarget(quest);
                    const percent = Math.min(100, Math.round((current / (target || 1)) * 100));

                    return (
                      <div
                        key={quest.id}
                        className={`p-3.5 rounded-xl border transition-all shadow-xs ${
                          darkMode
                            ? 'bg-[#1a2638] border-slate-700/80 hover:border-slate-600'
                            : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1.5 min-w-0">
                            <p className={`font-bold text-sm ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                              {quest.title}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 font-bold">
                                +{quest.xpReward} XP
                              </span>
                              {quest.titleReward && (
                                <span className="px-2 py-0.5 rounded bg-teal-500/15 text-teal-500 font-bold flex items-center gap-1">
                                  <span>🎖️</span>
                                  <span>Titel: {quest.titleReward}</span>
                                </span>
                              )}
                              {quest.colorReward && (
                                <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-500 font-bold flex items-center gap-1">
                                  <span>🎨</span>
                                  <span>{quest.rewardDescription || 'Farbe'}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                                darkMode
                                  ? 'bg-slate-800 border-slate-700 text-slate-300'
                                  : 'bg-white border-slate-300 text-slate-700'
                              }`}
                            >
                              {current} / {target}
                            </span>
                          </div>
                        </div>

                        {/* Fortschrittsbalken */}
                        <div
                          className={`w-full h-2 rounded-full mt-3 overflow-hidden border ${
                            darkMode
                              ? 'bg-slate-800/80 border-slate-700/40'
                              : 'bg-slate-200 border-slate-300/60'
                          }`}
                        >
                          <div
                            className="bg-gradient-to-r from-teal-400 to-emerald-400 h-full transition-all duration-300 rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ─── BEREICH 2: ABGESCHLOSSENE QUESTS (EINGEKLAPPT) ─── */}
      <div className="pt-2">
        {completedQuests.length > 0 ? (
          <div>
            {/* Einklappbarer Header-Button */}
            <button
              type="button"
              onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
              className={`w-full p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer text-left group ${
                darkMode
                  ? 'border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-300'
                  : 'border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/60 text-emerald-900'
              }`}
              title={isCompletedExpanded ? 'Abgeschlossene Quests einklappen' : 'Abgeschlossene Quests aufklappen'}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-xs font-bold shrink-0">
                  ✓
                </span>
                <div>
                  <span className="font-bold text-xs sm:text-sm">
                    Abgeschlossene Quests ({completedQuests.length})
                  </span>
                  <p
                    className={`text-[10px] ${
                      darkMode ? 'text-emerald-400/70' : 'text-emerald-700/80'
                    }`}
                  >
                    {isCompletedExpanded
                      ? 'Klicken zum Einklappen'
                      : 'Klicken zum Aufklappen & Einsehen der erledigten Aufgaben'}
                  </p>
                </div>
              </div>

              <div
                className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors shrink-0 ${
                  darkMode
                    ? 'bg-emerald-500/15 text-emerald-300 group-hover:bg-emerald-500/25'
                    : 'bg-emerald-200/60 text-emerald-800 group-hover:bg-emerald-200'
                }`}
              >
                <span>{isCompletedExpanded ? 'Einklappen ▲' : 'Aufklappen ▼'}</span>
              </div>
            </button>

            {/* Aufgeklappte Liste erledigter Quests */}
            {isCompletedExpanded && (
              <div className="mt-2.5 space-y-2 animate-in fade-in duration-200">
                {completedQuests
                  .sort((a, b) => a.level - b.level)
                  .map(quest => (
                    <div
                      key={quest.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                        darkMode
                          ? 'bg-emerald-950/15 border-emerald-500/30 text-emerald-300'
                          : 'bg-emerald-50/40 border-emerald-200 text-emerald-900'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-black border ${
                              darkMode
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            Level {quest.level}
                          </span>
                          <p className="font-semibold text-xs sm:text-sm line-through opacity-80 truncate">
                            {quest.title}
                          </p>
                        </div>
                        <div
                          className={`flex items-center gap-2 text-[10px] ${
                            darkMode ? 'text-emerald-400/80' : 'text-emerald-700'
                          }`}
                        >
                          <span>+{quest.xpReward} XP erhalten</span>
                          {quest.titleReward && (
                            <span>• 🎖️ {quest.titleReward}</span>
                          )}
                          {quest.colorReward && (
                            <span>• 🎨 {quest.rewardDescription || 'Farb-Belohnung'}</span>
                          )}
                        </div>
                      </div>

                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-black shrink-0 border ${
                          darkMode
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                        }`}
                      >
                        ✓ Erledigt
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : (
          <div
            className={`p-3 rounded-xl border text-center text-xs ${
              darkMode
                ? 'border-slate-800 bg-slate-900/40 text-slate-500'
                : 'border-slate-200 bg-slate-50 text-slate-400'
            }`}
          >
            <span>Abgeschlossene Quests (0) • Bisher noch keine Quests beendet</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestList;
