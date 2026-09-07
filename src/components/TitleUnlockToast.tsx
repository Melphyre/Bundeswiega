import React, { useEffect } from 'react';
import { PlayerTitle } from '../constants/titlesConfig';
import PlayerTitleBadge from './PlayerTitleBadge';

interface TitleUnlockToastProps {
  unlockedTitle: PlayerTitle | null;
  onClose: () => void;
  onEquip?: (titleName: string) => void;
  darkMode: boolean;
}

export const TitleUnlockToast: React.FC<TitleUnlockToastProps> = ({
  unlockedTitle,
  onClose,
  onEquip,
  darkMode
}) => {
  useEffect(() => {
    if (!unlockedTitle) return;
    const timer = setTimeout(() => {
      onClose();
    }, 9000);
    return () => clearTimeout(timer);
  }, [unlockedTitle, onClose]);

  if (!unlockedTitle) return null;

  return (
    <div className="fixed top-5 right-4 left-4 sm:left-auto sm:right-6 sm:w-96 z-[9999] animate-in slide-in-from-top-4 duration-300 pointer-events-auto">
      <div
        className={`rounded-2xl p-4 md:p-5 shadow-2xl border-2 backdrop-blur-md relative overflow-hidden ${
          darkMode
            ? 'bg-slate-900/95 border-amber-500/50 text-white shadow-amber-500/10'
            : 'bg-white/95 border-amber-400 text-gray-900 shadow-amber-500/15'
        }`}
      >
        {/* Glow accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 animate-pulse" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
              {unlockedTitle.icon || '🎉'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-500">
                  🎉 Neuer Titel freigeschaltet!
                </span>
              </div>
              <h4 className="text-base font-black flex items-center gap-2">
                <span>{unlockedTitle.name}</span>
                <PlayerTitleBadge title={unlockedTitle.name} size="sm" showIcon={false} />
              </h4>
              <p className="text-xs opacity-70 leading-snug">
                {unlockedTitle.description}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-sm font-bold flex-shrink-0 cursor-pointer"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        {onEquip && (
          <div className="mt-4 pt-3 border-t border-gray-500/15 flex items-center justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-xs font-bold opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
            >
              Später
            </button>
            <button
              onClick={() => {
                onEquip(unlockedTitle.name);
                onClose();
              }}
              className="px-4 py-1.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 shadow cursor-pointer transition-all active:scale-95 flex items-center space-x-1"
            >
              <i className="fas fa-check text-[10px]"></i>
              <span>Direkt ausrüsten</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TitleUnlockToast;
