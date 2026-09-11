import React, { useState, useEffect } from 'react';
import { Player } from '../../types';
import { PLAYER_COLORS, BRAND_COLOR } from '../constants';
import PlayerTitleBadge from './PlayerTitleBadge';

interface StartPlayerDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  selectedPlayer: Player | null;
  playerAccountLinks?: Record<string, { userId: string; userName: string; imageUrl?: string | null }>;
  getPlayerTitle?: (playerNameOrId?: string, playerObj?: Player) => string | undefined;
  darkMode: boolean;
}

export const StartPlayerDrawModal: React.FC<StartPlayerDrawModalProps> = ({
  isOpen,
  onClose,
  players,
  selectedPlayer,
  playerAccountLinks,
  getPlayerTitle,
  darkMode
}) => {
  const [isSpinning, setIsSpinning] = useState(true);
  const [displayIndex, setDisplayIndex] = useState(0);

  const activePlayers = players.filter(p => !p.isDisqualified);
  const finalPlayer = selectedPlayer || (activePlayers.length > 0 ? activePlayers[0] : null);

  useEffect(() => {
    if (!isOpen || !finalPlayer || activePlayers.length <= 1) {
      setIsSpinning(false);
      return;
    }

    setIsSpinning(true);
    let counter = 0;
    const totalSteps = 16;
    let delay = 60;

    let timeoutId: NodeJS.Timeout;

    const step = () => {
      counter++;
      setDisplayIndex(prev => (prev + 1) % activePlayers.length);

      if (counter < totalSteps) {
        delay += 12; // slow down gradually
        timeoutId = setTimeout(step, delay);
      } else {
        // Find exact index of chosen player
        const finalIdx = activePlayers.findIndex(p => p.id === finalPlayer.id);
        if (finalIdx >= 0) {
          setDisplayIndex(finalIdx);
        }
        setIsSpinning(false);
      }
    };

    timeoutId = setTimeout(step, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isOpen, finalPlayer?.id, activePlayers.length]);

  if (!isOpen || !finalPlayer) return null;

  const currentDisplayPlayer = isSpinning
    ? (activePlayers[displayIndex] || finalPlayer)
    : finalPlayer;

  const currentIdx = players.findIndex(p => p.id === currentDisplayPlayer.id);
  const playerColor = PLAYER_COLORS[(currentIdx >= 0 ? currentIdx : 0) % PLAYER_COLORS.length];
  const accountLink = playerAccountLinks?.[currentDisplayPlayer.id];
  const avatarUrl = currentDisplayPlayer.imageUrl || accountLink?.imageUrl;
  const rawTitle = getPlayerTitle
    ? (getPlayerTitle(currentDisplayPlayer.id, currentDisplayPlayer) || getPlayerTitle(currentDisplayPlayer.name, currentDisplayPlayer))
    : currentDisplayPlayer.title;
  const playerTitle = rawTitle || 'Neuling';

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-2 text-center transition-all ${
          darkMode
            ? 'bg-slate-900 border-slate-700/80 text-white'
            : 'bg-white border-gray-200 text-gray-900'
        } ${!isSpinning ? 'scale-100 ring-4 ring-amber-500/20' : 'scale-95'}`}
      >
        {/* Glow effect behind avatar */}
        <div
          className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-opacity duration-700 ${
            isSpinning ? 'opacity-30 bg-amber-500/40' : 'opacity-60 bg-emerald-500/40'
          }`}
        />

        {/* Dice & Status Badge */}
        <div className="relative mb-4 flex flex-col items-center">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg transition-transform duration-300 ${
              isSpinning ? 'animate-spin bg-amber-500/20 text-amber-400' : 'animate-bounce bg-emerald-500/20 text-emerald-400'
            }`}
          >
            {isSpinning ? '🎲' : '🎯'}
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
            {isSpinning ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                <span>Auslosung läuft...</span>
              </>
            ) : (
              <>
                <span>✨ Ausgeloster Startspieler ✨</span>
              </>
            )}
          </div>
        </div>

        {/* Player Avatar with animated frame */}
        <div className="relative my-4 flex justify-center">
          <div
            className={`relative p-1.5 rounded-full transition-all duration-300 ${
              isSpinning ? 'rotate-3 scale-95' : 'scale-105 shadow-xl'
            }`}
            style={{
              background: `linear-gradient(135deg, ${playerColor}, #f59e0b)`
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={currentDisplayPlayer.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white dark:border-slate-900 shadow-inner"
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-white text-3xl sm:text-4xl font-black border-4 border-white dark:border-slate-900 shadow-inner"
                style={{ backgroundColor: playerColor }}
              >
                {currentDisplayPlayer.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}

            {!isSpinning && (
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 text-white flex items-center justify-center text-sm font-black shadow-md animate-in zoom-in">
                ✓
              </div>
            )}
          </div>
        </div>

        {/* Title Badge right above player name */}
        <div className="my-2 min-h-[26px] flex items-center justify-center">
          <PlayerTitleBadge
            title={playerTitle}
            size="md"
            showIcon={true}
            className={`transition-all duration-300 shadow-sm ${isSpinning ? 'opacity-70' : 'opacity-100 scale-105'}`}
          />
        </div>

        {/* Player Name */}
        <h3
          className={`text-2xl sm:text-3xl font-black mb-1 tracking-tight transition-all duration-300 ${
            isSpinning ? 'opacity-80 scale-95' : 'scale-100'
          }`}
          style={{ color: playerColor }}
        >
          {currentDisplayPlayer.name}
        </h3>

        {/* Weight & Action Description */}
        <div className="mt-2 mb-6 space-y-1">
          <p className="text-base sm:text-lg font-black" style={{ color: BRAND_COLOR }}>
            {isSpinning ? 'Wird ermittelt...' : 'fängt an!'}
          </p>
          <p className={`text-xs sm:text-sm font-semibold ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
            {currentDisplayPlayer.name} bestimmt das allererste Zielgewicht.
            {currentDisplayPlayer.startWeight ? (
              <span className="block mt-1 font-mono text-xs opacity-75">
                (Aktueller Füllstand: {currentDisplayPlayer.startWeight}g)
              </span>
            ) : null}
          </p>
        </div>

        {/* Action Button */}
        {isSpinning ? (
          <button
            type="button"
            onClick={() => {
              const finalIdx = activePlayers.findIndex(p => p.id === finalPlayer.id);
              if (finalIdx >= 0) setDisplayIndex(finalIdx);
              setIsSpinning(false);
            }}
            className="w-full py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/15 text-white/80 active:scale-95 transition-all"
          >
            Auslosung überspringen ⏩
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="w-full text-white font-black py-4 px-6 rounded-2xl shadow-xl active:scale-95 text-base sm:text-lg uppercase tracking-wide transition-all transform hover:brightness-110 flex items-center justify-center gap-2"
            style={{ backgroundColor: BRAND_COLOR }}
          >
            <span>Zielgewicht ansagen</span>
            <span>🎯</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default StartPlayerDrawModal;
