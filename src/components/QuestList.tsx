import React from 'react';
import { LEVEL_QUESTS, QuestDefinition, getQuestTarget } from '../utils/questEvaluator';

export interface QuestProgress {
  quest_id: string;
  current_progress: number;
  is_completed: boolean;
}

interface QuestListProps {
  userLevel: number;
  questProgresses: QuestProgress[];
}

export const QuestList: React.FC<QuestListProps> = ({ userLevel, questProgresses }) => {
  const progressMap = new Map<string, QuestProgress>((questProgresses || []).map(p => [p.quest_id, p]));

  // Zeige Quests passend zum aktuellen Level an
  const visibleQuests = LEVEL_QUESTS.filter(q => q.level <= (userLevel || 1));
  const completedCount = visibleQuests.filter(q => {
    const prog = progressMap.get(q.id);
    return prog ? prog.is_completed : false;
  }).length;

  return (
    <div className="bg-[#121c2d] border border-slate-700/60 rounded-xl p-5 mt-4 text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          🎯 Level {userLevel || 1} Aufgaben & Quests
        </h3>
        <span className="text-xs text-slate-400 font-medium">
          {completedCount} / {visibleQuests.length} Abgeschlossen
        </span>
      </div>

      <div className="space-y-3">
        {visibleQuests.map((quest) => {
          const prog = progressMap.get(quest.id);
          const current = prog ? Number(prog.current_progress) || 0 : 0;
          const isDone = prog ? Boolean(prog.is_completed) : false;
          const target = getQuestTarget(quest);
          const percent = Math.min(100, Math.round((current / (target || 1)) * 100));

          return (
            <div 
              key={quest.id} 
              className={`p-3.5 rounded-lg border transition-all ${
                isDone 
                  ? 'bg-emerald-950/20 border-emerald-500/40' 
                  : 'bg-[#1a2638] border-slate-700/80'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`font-semibold text-sm ${isDone ? 'line-through text-emerald-400' : 'text-slate-100'}`}>
                    {quest.title}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">
                      +{quest.xpReward} XP
                    </span>
                    {quest.titleReward && (
                      <span className="text-xs px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 font-medium">
                        🎖️ Titel: {quest.titleReward}
                      </span>
                    )}
                  </div>
                </div>

                {isDone ? (
                  <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-bold shrink-0">
                    ✓ Erledigt
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 font-mono shrink-0">
                    {current} / {target}
                  </span>
                )}
              </div>

              {!isDone && (
                <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="bg-teal-400 h-full transition-all duration-300" 
                    style={{ width: `${percent}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
