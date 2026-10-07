import React from 'react';
import { ActiveQuest, EffectDefinition, ActiveEffect, WorldOfWiegenPool } from '../types/worldOfWiegen';
import { getQuestById } from '../constants/worldOfWiegenQuests';
import { Player } from '../../types';
import { BRAND_COLOR } from '../constants';

interface WorldOfWiegenNotificationBannerProps {
  pendingQuestPlayer?: Player | null;
  pendingQuest?: ActiveQuest | null;
  pendingEffect?: {
    quest: ActiveQuest;
    effect: EffectDefinition;
    activeEffect: ActiveEffect;
  } | null;
  onSelectDifficultyForPlayer?: (player: Player, pool: WorldOfWiegenPool) => void;
  onConfirmRevealedQuest?: () => void;
  onDismissQuest: () => void;
  onAcceptQuestWithPool?: (questId: string, pool: WorldOfWiegenPool) => void;
  onDismissEffect: () => void;
  darkMode: boolean;
}

export const WorldOfWiegenNotificationBanner: React.FC<WorldOfWiegenNotificationBannerProps> = ({
  pendingQuestPlayer,
  pendingQuest,
  pendingEffect,
  onSelectDifficultyForPlayer,
  onConfirmRevealedQuest,
  onDismissQuest,
  onAcceptQuestWithPool,
  onDismissEffect,
  darkMode
}) => {
  // 1. Prioritize Quest Completed & Effect Unlocked Modal
  if (pendingEffect) {
    const { quest, effect, activeEffect } = pendingEffect;
    const isChampionswieg = quest.pool === 'championswieg';

    return (
      <div className="fixed inset-0 z-[890] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in zoom-in-95 duration-200">
        <div
          className={`p-6 sm:p-7 rounded-3xl max-w-md w-full border-2 shadow-2xl space-y-5 text-center relative overflow-hidden ${
            darkMode
              ? isChampionswieg
                ? 'bg-slate-900 border-amber-500/70 text-white'
                : 'bg-slate-900 border-teal-500/70 text-white'
              : isChampionswieg
              ? 'bg-white border-amber-500 text-gray-900'
              : 'bg-white border-teal-500 text-gray-900'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Glowing Aura Decoration */}
          <div
            className={`absolute -top-12 -left-12 w-32 h-32 rounded-full blur-2xl pointer-events-none ${
              isChampionswieg ? 'bg-amber-500/25' : 'bg-teal-500/25'
            }`}
          ></div>
          <div
            className={`absolute -bottom-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none ${
              isChampionswieg ? 'bg-amber-500/25' : 'bg-teal-500/25'
            }`}
          ></div>

          <div className="space-y-1">
            <span className="text-4xl animate-bounce inline-block">🏆</span>
            <div
              className={`text-[10px] font-black uppercase tracking-widest ${
                isChampionswieg ? 'text-amber-500' : 'text-teal-400'
              }`}
            >
              {isChampionswieg ? '👑 Championswieg-Quest Erfüllt!' : '🤝 Kreiswiega-Quest Erfüllt!'}
            </div>
            <h3 className="text-xl font-black">{quest.playerName} triumphiert!</h3>
          </div>

          <div
            className={`p-4 rounded-2xl border text-left space-y-1.5 ${
              isChampionswieg
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-teal-500/10 border-teal-500/30'
            }`}
          >
            <div className="flex items-center space-x-2 font-bold text-xs">
              <span>📜</span>
              <span>Erfüllte Quest: {getQuestById(quest.questId)?.name || quest.questId}</span>
            </div>
            <p className="text-xs opacity-80 leading-relaxed font-semibold">
              {quest.progressText}
            </p>
          </div>

          {/* Freigeschalteter Effekt E01 - E13 */}
          <div
            className={`p-4 rounded-2xl border-2 text-left space-y-2 ${
              isChampionswieg
                ? 'bg-amber-500/10 border-amber-500/50'
                : 'bg-teal-500/10 border-teal-500/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{effect.icon}</span>
                <div>
                  <h4
                    className={`font-black text-sm uppercase ${
                      isChampionswieg
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-teal-600 dark:text-teal-400'
                    }`}
                  >
                    {effect.name} [{effect.code}]
                  </h4>
                  <span className="text-[10px] opacity-75 font-semibold">{effect.subtitle}</span>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                  isChampionswieg
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                    : 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30'
                }`}
              >
                {effect.durationLabel}
              </span>
            </div>

            <p className="text-xs leading-relaxed pt-1">{effect.description}</p>

            {/* Spezifische Zuweisungen */}
            {activeEffect.drinkBuddyPairs && activeEffect.drinkBuddyPairs.length > 0 && (
              <div className="p-2.5 rounded-xl bg-black/10 dark:bg-black/30 text-xs font-bold text-amber-600 dark:text-amber-300">
                🍻 Zuweisung: {activeEffect.drinkBuddyPairs[0].playerA} &amp; {activeEffect.drinkBuddyPairs[0].playerB} trinken ab sofort immer zusammen!
              </div>
            )}

            {activeEffect.ritualDescription && (
              <div className="p-2.5 rounded-xl bg-black/10 dark:bg-black/30 text-xs font-bold text-purple-600 dark:text-purple-300">
                🧙‍♂️ Neues Pflicht-Ritual: „{activeEffect.ritualDescription}“
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onDismissEffect}
            className="w-full py-3.5 rounded-2xl text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer"
            style={{ backgroundColor: isChampionswieg ? '#D97706' : '#0D9488' }}
          >
            Effekt bestätigen &amp; Weiter
          </button>
        </div>
      </div>
    );
  }

  // 2. SCHRITT 1: ZUERST ABFRAGEN: Kreiswiega oder Championswieg?
  // Dies greift, wenn ein Spieler ohne Quest ausgewählt wurde und noch keine Aufgabe enthüllt ist.
  if (pendingQuestPlayer && !pendingQuest) {
    return (
      <div className="fixed inset-0 z-[880] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in zoom-in-95 duration-200">
        <div
          className={`p-6 sm:p-7 rounded-3xl max-w-lg w-full border-2 border-amber-500/50 shadow-2xl space-y-5 text-center relative overflow-hidden ${
            darkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="space-y-1.5">
            <span className="text-4xl inline-block animate-pulse">🎯</span>
            <div className="text-[10px] font-black uppercase tracking-widest text-amber-500">
              Neue Nebenaufgabe verteilen
            </div>
            <h3 className="text-2xl font-black">{pendingQuestPlayer.name}</h3>
            <p className="text-xs opacity-75 max-w-sm mx-auto leading-relaxed">
              Möchtest du <strong className="text-teal-500">Kreiswiega</strong> oder <strong className="text-amber-500">Championswieg</strong>?
              Wähle zuerst deinen Pfad – die Aufgabe und die Belohnung richten sich nach deiner Wahl!
            </p>
          </div>

          {/* Zwei Auswahlkarten */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-1">
            {/* OPTION 1: KREISWIEGA (LEICHTER) */}
            <button
              type="button"
              onClick={() => {
                if (onSelectDifficultyForPlayer) {
                  onSelectDifficultyForPlayer(pendingQuestPlayer, 'kreiswiega');
                }
              }}
              className="p-4 rounded-2xl border-2 border-teal-500/60 bg-teal-500/10 hover:bg-teal-500/20 hover:border-teal-500 transition-all cursor-pointer flex flex-col justify-between space-y-3 group shadow-md text-left active:scale-[0.98]"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl group-hover:scale-110 transition-transform">🤝</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-teal-500/25 text-teal-700 dark:text-teal-300 border border-teal-500/40">
                    Leichter
                  </span>
                </div>
                <div>
                  <h4 className="font-black text-sm text-teal-600 dark:text-teal-400">Kreiswiega</h4>
                  <p className="text-[11px] opacity-80 mt-1 font-semibold leading-snug">
                    Entspannterer Weg: Höhere Toleranzen (±2g), kürzere 2-Runden-Serien und kollektiver Spielspaß am Tresen.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-teal-500/20 space-y-1 text-[10px]">
                <div className="text-teal-600 dark:text-teal-400 font-bold flex items-center space-x-1">
                  <span>🎁</span>
                  <span>Kollektive Kreiswiega-Effekte:</span>
                </div>
                <p className="opacity-75 leading-tight">
                  Gemeinschafts-Effekte (Zwischenwasser-Minigame, Niemand bleibt zurück, Last Round, Schwaches Händchen).
                </p>
              </div>

              <div className="w-full py-2.5 rounded-xl bg-teal-600 text-white font-black text-xs text-center uppercase tracking-wider group-hover:bg-teal-500 shadow mt-1">
                🤝 Kreiswiega wählen
              </div>
            </button>

            {/* OPTION 2: CHAMPIONSWIEG (SCHWERER) */}
            <button
              type="button"
              onClick={() => {
                if (onSelectDifficultyForPlayer) {
                  onSelectDifficultyForPlayer(pendingQuestPlayer, 'championswieg');
                }
              }}
              className="p-4 rounded-2xl border-2 border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-500 transition-all cursor-pointer flex flex-col justify-between space-y-3 group shadow-md text-left active:scale-[0.98]"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl group-hover:scale-110 transition-transform">👑</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                    Schwerer
                  </span>
                </div>
                <div>
                  <h4 className="font-black text-sm text-amber-600 dark:text-amber-400">Championswieg</h4>
                  <p className="text-[11px] opacity-80 mt-1 font-semibold leading-snug">
                    Härtere Prüfung für Spitzenwieger: Chirurgische Präzision (±1g), Duelle, Führungssicherung &amp; Schnapszahlen.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-500/20 space-y-1 text-[10px]">
                <div className="text-amber-600 dark:text-amber-400 font-bold flex items-center space-x-1">
                  <span>🎁</span>
                  <span>Machtvolle Champions-Effekte:</span>
                </div>
                <p className="opacity-75 leading-tight">
                  Asymmetrische Sieger-Vorteile (Blindwiegen, Drinkbuddy zuweisen, Pflicht-Ritual bestimmen, Doppelte Schnäpse).
                </p>
              </div>

              <div className="w-full py-2.5 rounded-xl bg-amber-600 text-white font-black text-xs text-center uppercase tracking-wider group-hover:bg-amber-500 shadow mt-1">
                👑 Championswieg wählen
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. SCHRITT 2: ENTHÜLLTE AUFGABE
  // Die Quest wurde anhand der gewählten Schwierigkeit (Kreiswiega/Championswieg) generiert und wird nun dem Spieler präsentiert.
  if (pendingQuest) {
    const def = getQuestById(pendingQuest.questId);
    const isChampionswieg = pendingQuest.pool === 'championswieg';

    return (
      <div className="fixed inset-0 z-[880] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in zoom-in-95 duration-200">
        <div
          className={`p-6 sm:p-7 rounded-3xl max-w-md w-full border-2 shadow-2xl space-y-4 text-center relative overflow-hidden ${
            darkMode
              ? isChampionswieg
                ? 'bg-slate-900 border-amber-500/70 text-white'
                : 'bg-slate-900 border-teal-500/70 text-white'
              : isChampionswieg
              ? 'bg-white border-amber-500 text-gray-900'
              : 'bg-white border-teal-500 text-gray-900'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-1.5">
            <span className="text-4xl inline-block">{def?.icon || '📜'}</span>
            <div
              className={`text-[10px] font-black uppercase tracking-widest ${
                isChampionswieg ? 'text-amber-500' : 'text-teal-400'
              }`}
            >
              Nebenaufgabe enthüllt!
            </div>
            <h3 className="text-xl font-black">{pendingQuest.playerName}</h3>

            <div className="pt-0.5">
              <span
                className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  isChampionswieg
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40'
                    : 'bg-teal-500/20 text-teal-600 dark:text-teal-400 border-teal-500/40'
                }`}
              >
                <span>{isChampionswieg ? '👑 Championswieg' : '🤝 Kreiswiega'}</span>
                <span>•</span>
                <span>{isChampionswieg ? 'Schwer' : 'Leicht'}</span>
              </span>
            </div>
          </div>

          <div
            className={`p-4 rounded-2xl border text-left space-y-2 ${
              isChampionswieg
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-teal-500/10 border-teal-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-black text-sm uppercase">{def?.name}</span>
              <span
                className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                  isChampionswieg
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    : 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
                }`}
              >
                {def?.category}
              </span>
            </div>

            {pendingQuest.targetPlayerName && (
              <div
                className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between border ${
                  isChampionswieg
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
                    : 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-base">{isChampionswieg ? '👑' : '⚔️'}</span>
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider opacity-75 font-black">
                      {isChampionswieg ? 'Zugewiesener Spitzen-Rivale (Platz 1):' : 'Zugewiesener Tabellennachbar:'}
                    </span>
                    <span className="text-sm font-black">{pendingQuest.targetPlayerName}</span>
                  </div>
                </div>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                    isChampionswieg
                      ? 'bg-amber-500/30 text-amber-700 dark:text-amber-200'
                      : 'bg-teal-500/30 text-teal-700 dark:text-teal-200'
                  }`}
                >
                  {isChampionswieg ? 'Meister-Herausforderung' : 'Naher Abstand'}
                </span>
              </div>
            )}
            <p className="text-xs leading-relaxed opacity-95 font-semibold">
              {pendingQuest.customDescription || def?.description}
            </p>
            {def?.epicLore && (
              <p className="text-[11px] italic opacity-75 pt-1 border-t border-gray-500/20">
                „{def.epicLore}“
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-left">
            <div className="p-2.5 rounded-xl bg-black/10 dark:bg-black/30 text-[11px] font-semibold space-y-0.5">
              <span className="opacity-60 block text-[9px] uppercase font-bold">⏱️ Dauer</span>
              <span>{pendingQuest.targetRound - pendingQuest.assignedRound} Runden (bis R.{pendingQuest.targetRound + 1})</span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/10 dark:bg-black/30 text-[11px] font-semibold space-y-0.5">
              <span className="opacity-60 block text-[9px] uppercase font-bold">🎯 Toleranz / Ziel</span>
              <span>{pendingQuest.tolerance !== undefined ? `±${pendingQuest.tolerance}g` : 'Standard'}</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl border text-left text-xs space-y-1 bg-black/5 dark:bg-white/5 border-gray-500/20">
            <span
              className={`font-black text-[10px] uppercase tracking-wider block ${
                isChampionswieg ? 'text-amber-500' : 'text-teal-400'
              }`}
            >
              🎁 Mögliche Belohnung bei Erfolg:
            </span>
            <p className="text-[11px] opacity-80 leading-snug">
              {isChampionswieg
                ? 'Ein asymmetrischer Championswieg-Machteffekt (z.B. Blindwiegen, Drinkbuddy zuweisen, Ritual bestimmen, Doppelte Schnäpse).'
                : 'Ein symmetrischer Kreiswiega-Effekt (z.B. Zwischenwasser-Minigame, Niemand bleibt zurück, Last Round, Schwaches Händchen).'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onConfirmRevealedQuest) {
                onConfirmRevealedQuest();
              } else if (onAcceptQuestWithPool) {
                onAcceptQuestWithPool(pendingQuest.id, pendingQuest.pool);
              } else {
                onDismissQuest();
              }
            }}
            className="w-full py-3.5 rounded-2xl text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center space-x-2"
            style={{ backgroundColor: isChampionswieg ? '#D97706' : '#0D9488' }}
          >
            <span>{isChampionswieg ? '👑' : '🤝'}</span>
            <span>Als {isChampionswieg ? 'Championswieg' : 'Kreiswiega'} annehmen &amp; Weiter</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
};
