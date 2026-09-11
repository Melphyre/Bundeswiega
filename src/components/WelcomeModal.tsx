import React from 'react';
import { BRAND_COLOR } from '../constants';
import { PlayerTitleBadge } from './PlayerTitleBadge';
import { PlayerLevelBadge } from './PlayerLevelBadge';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string;
  darkMode?: boolean;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  username,
  darkMode = false
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[950] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6 border-2 text-center relative animate-in zoom-in-95 ${
          darkMode
            ? 'bg-slate-900 border-slate-700 text-white'
            : 'bg-white border-slate-200 text-gray-900'
        }`}
      >
        {/* Top Celebration Icon */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-xl shadow-teal-500/20 bg-gradient-to-tr from-teal-600 to-emerald-400 text-white">
          <span>🍻</span>
          <div className="absolute -top-1 -right-1 text-xl animate-bounce">
            🎉
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-teal-500">
            Willkommen an der Theke
          </span>
          <h3 className="text-2xl font-black uppercase tracking-tight">
            Glückwunsch zur Registrierung!
          </h3>
          {username && (
            <p className="text-sm font-bold opacity-80" style={{ color: BRAND_COLOR }}>
              Hallo, {username}!
            </p>
          )}
        </div>

        {/* Message Card */}
        <div className={`p-4 rounded-2xl border space-y-3 ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-teal-50/80 border-teal-100'}`}>
          <p className="text-sm font-medium leading-relaxed">
            Du bist <strong className="font-black text-teal-500">Level 1</strong> und erhältst den Titel <strong className="font-black">"Neuling"</strong>.
          </p>
          
          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
            <PlayerLevelBadge level={1} size="md" />
            <PlayerTitleBadge title="Neuling" size="md" />
          </div>

          <p className="text-xs opacity-60 leading-normal pt-1">
            Sammle in jedem Spiel Erfahrungspunkte (XP), steige im Level auf und schalte legendäre Titel frei!
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-4 rounded-2xl text-white font-black uppercase tracking-wider shadow-xl cursor-pointer active:scale-95 transition-all text-sm"
          style={{ backgroundColor: BRAND_COLOR }}
        >
          An die Theke! 🎯
        </button>
      </div>
    </div>
  );
};
