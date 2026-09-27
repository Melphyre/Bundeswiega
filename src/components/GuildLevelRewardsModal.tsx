import React from 'react';
import { GUILD_LEVEL_REWARDS, GuildLevelInfo } from '../utils/guildLevel';

interface GuildLevelRewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  guildName: string;
  guildTag: string;
  guildLogo?: string;
  levelInfo: GuildLevelInfo;
  darkMode?: boolean;
}

export const GuildLevelRewardsModal: React.FC<GuildLevelRewardsModalProps> = ({
  isOpen,
  onClose,
  guildName,
  guildTag,
  guildLogo,
  levelInfo,
  darkMode = true
}) => {
  if (!isOpen) return null;

  const currentLevel = levelInfo.level;

  return (
    <div
      id="guild-level-rewards-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="guild-level-rewards-modal"
        className={`w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all ${
          darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        {/* Modal Header mit Level & XP Status */}
        <div className="p-5 sm:p-6 border-b border-gray-500/20 bg-gradient-to-r from-teal-500/10 via-amber-500/10 to-teal-500/10 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-gray-500/20 hover:bg-gray-500/30 text-sm font-bold cursor-pointer transition-colors"
          >
            ✕
          </button>

          <div className="flex items-center space-x-3.5">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 bg-teal-500/10 ${levelInfo.cosmetics.logoBorder}`}
            >
              {guildLogo && guildLogo.startsWith('http') ? (
                <img src={guildLogo} alt={guildName} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <span>{guildLogo || '🏰'}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black truncate">{guildName}</h3>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold ${levelInfo.cosmetics.tagClass}`}>
                  [{guildTag}]
                </span>
              </div>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-xs font-black text-amber-500">
                  Level {levelInfo.level}
                </span>
                <span className="text-xs opacity-60">•</span>
                <span className="text-xs font-bold opacity-80">
                  {levelInfo.cosmetics.guildTitle}
                </span>
              </div>
            </div>
          </div>

          {/* Level Fortschrittsbalken */}
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-teal-500">Fortschritt zu Level {Math.min(50, currentLevel + 1)}</span>
              <span className="opacity-80">
                {currentLevel >= 50
                  ? `${levelInfo.xp.toLocaleString()} XP (Max Level)`
                  : `${levelInfo.currentLevelProgressXP.toLocaleString()} / ${levelInfo.xpNeededForNextLevel.toLocaleString()} XP`}
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-black/20 dark:bg-white/10 overflow-hidden p-0.5 border border-gray-500/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-amber-400 transition-all duration-500 shadow-sm"
                style={{ width: `${levelInfo.progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] opacity-60">
              <span>Effektive Gesamt-XP: {levelInfo.xp.toLocaleString()} XP</span>
              <span>{levelInfo.progressPercent}% abgeschlossen</span>
            </div>
          </div>
        </div>

        {/* Modal Body: Belohnungsleiter */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-black uppercase tracking-wider opacity-70 flex items-center space-x-1.5">
              <i className="fas fa-trophy text-amber-500"></i>
              <span>Level-Belohnungen & Freischaltungen</span>
            </h4>
            <span className="text-[10px] font-bold opacity-60">
              12 Meilensteine
            </span>
          </div>

          <div className="space-y-2.5">
            {GUILD_LEVEL_REWARDS.map(reward => {
              const isUnlocked = currentLevel >= reward.level;

              return (
                <div
                  key={reward.level}
                  className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                    isUnlocked
                      ? darkMode
                        ? 'bg-slate-800/80 border-teal-500/40 shadow-sm'
                        : 'bg-teal-50/50 border-teal-200 shadow-sm'
                      : darkMode
                      ? 'bg-slate-900/50 border-slate-800 opacity-60'
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                        isUnlocked
                          ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                          : 'bg-gray-500/20 text-gray-500 border border-gray-500/20'
                      }`}
                    >
                      {reward.icon}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="text-xs font-black px-2 py-0.5 rounded-md bg-black/10 dark:bg-white/10 text-amber-500">
                          Lvl {reward.level}
                        </span>
                        <span className="text-xs font-black">{reward.rewardName}</span>
                      </div>
                      <p className="text-[11px] opacity-75 leading-relaxed">{reward.description}</p>
                    </div>
                  </div>

                  <div className="flex-shrink-0 pt-0.5">
                    {isUnlocked ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                        <i className="fas fa-check text-[9px]"></i>
                        <span>Aktiv</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-gray-500/20 text-gray-400 border border-gray-500/20">
                        <i className="fas fa-lock text-[9px]"></i>
                        <span>Ab Lvl {reward.level}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-500/20 flex items-center justify-between bg-black/5 dark:bg-white/5">
          <p className="text-[11px] opacity-60">
            Tipp: Spiele Standardspiele und lade aktive Mitglieder ein, um Wiegschafts-XP zu steigern!
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs cursor-pointer active:scale-95 transition-all"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
