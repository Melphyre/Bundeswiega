import React from 'react';
import { BRAND_COLOR } from '../constants';
import { PlayerLevelBadge } from './PlayerLevelBadge';
import { PlayerTitleBadge } from './PlayerTitleBadge';
import { getRewardForLevel, getTitleForLevel } from '../utils/levelSystem';

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  newLevel: number;
  unlockedTitle?: string;
  darkMode?: boolean;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  isOpen,
  onClose,
  newLevel,
  unlockedTitle,
  darkMode = false
}) => {
  if (!isOpen) return null;

  const reward = getRewardForLevel(newLevel);
  const titleToDisplay = unlockedTitle || reward?.unlockedTitle || getTitleForLevel(newLevel);

  return (
    <div
      className="fixed inset-0 z-[960] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 border-2 text-center relative animate-in zoom-in-95 ${
          darkMode
            ? 'bg-slate-900 border-amber-500/40 text-white'
            : 'bg-white border-amber-400 text-gray-900'
        }`}
      >
        {/* Celebration Header Graphic */}
        <div className="relative mx-auto w-24 h-24 rounded-3xl flex items-center justify-center text-5xl shadow-2xl shadow-amber-500/30 bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 text-white animate-bounce">
          <span>🏆</span>
          <div className="absolute -top-2 -left-2 text-2xl">✨</div>
          <div className="absolute -bottom-1 -right-2 text-2xl">🎉</div>
        </div>

        {/* Heading */}
        <div className="space-y-1">
          <span className="text-xs font-black uppercase tracking-widest text-amber-500">
            Stufenaufstieg!
          </span>
          <h2 className="text-3xl font-black uppercase tracking-tight">
            Level-Up!
          </h2>
          <p className="text-sm font-semibold opacity-70">
            Hervorragende Präzision an der Wiege!
          </p>
        </div>

        {/* Level & Title Badges */}
        <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <PlayerLevelBadge level={newLevel} size="lg" />
            {titleToDisplay && (
              <PlayerTitleBadge title={titleToDisplay} size="md" />
            )}
          </div>
          <p className="text-xs font-bold text-amber-500 mt-1">
            Du hast Stufe {newLevel} erreicht!
          </p>
        </div>

        {/* Rewards Section (Placeholder & Unlocked Content) */}
        <div className={`p-4 rounded-2xl border text-left space-y-2.5 ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-amber-500">
            <i className="fas fa-gift"></i>
            <span>Freigeschaltete Belohnungen</span>
          </div>

          <div className="space-y-2 text-xs">
            {reward?.unlockedTitle ? (
              <div className="flex items-start space-x-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-base">{reward.icon}</span>
                <div>
                  <strong className="block font-black text-amber-600 dark:text-amber-400">
                    Neuer Titel freigeschaltet: "{reward.unlockedTitle}"
                  </strong>
                  <span className="opacity-70 text-[11px] leading-tight block">
                    {reward.description}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-start space-x-2.5 p-2 rounded-xl bg-black/5 dark:bg-white/5">
                <span className="text-base">⭐</span>
                <div>
                  <strong className="block font-bold">Rang & Ansehen erhöht</strong>
                  <span className="opacity-60 text-[11px] leading-tight block">
                    Dein neues Level ist nun überall in Ranglisten und Freundeslisten sichtbar!
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-start space-x-2.5 p-2 rounded-xl bg-black/5 dark:bg-white/5 opacity-80">
              <span className="text-base">🎁</span>
              <div>
                <strong className="block font-bold">Kommende Belohnungen</strong>
                <span className="opacity-60 text-[11px] leading-tight block">
                  Erreiche höhere Level, um weitere exklusive Spielertitel und Hall-of-Fame-Ehren freizuschalten.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-4 rounded-2xl text-white font-black uppercase tracking-wider shadow-xl cursor-pointer active:scale-95 transition-all text-sm"
          style={{ backgroundColor: BRAND_COLOR }}
        >
          Belohnungen einstreichen! 🍻
        </button>
      </div>
    </div>
  );
};
