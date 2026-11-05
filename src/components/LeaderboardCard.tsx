import React from 'react';
import { PlayerAvatar } from './PlayerAvatar';
import { PlayerNameTag } from './PlayerNameTag';
import { PlayerLevelBadge } from './PlayerLevelBadge';
import { PlayerTitleBadge } from './PlayerTitleBadge';

export interface LeaderboardCardProps {
  rank: number;
  playerName: string;
  avatarUrl?: string | null;
  avatarFrame?: string | null;
  nameBgColor?: string | null;
  nameGlow?: string | null;
  playerLevel?: number;
  playerTitle?: string | null;
  isGuest?: boolean;
  primaryValue: React.ReactNode;
  primaryValueColor?: string;
  subValue?: React.ReactNode;
  tournamentTag?: string | null;
  onClickPlayer?: () => void;
  darkMode?: boolean;
}

/**
 * LeaderboardCard:
 * Moderne, modulare Karte für Bestenlisten und Rekorde auf Mobil- & Desktop-Geräten.
 * - Linke Seite: Rang-Badge (#1 gold, #2 silber, #3 bronze, #4+ neutral), Avatar mit Kosmetik-Rahmen,
 *   Spielername mit automatischer Textkürzung (truncate) und (Gast)-Hinweis.
 * - Rechte Seite: Feste, prominente Metrik-Box mit Hauptwert (z. B. "4.76g", "9 Schnäpse")
 *   und darunterliegender Detail-Info (z. B. "8 Spiele", Datum), die niemals mit dem Namen kollidiert.
 */
export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  rank,
  playerName,
  avatarUrl,
  avatarFrame,
  nameBgColor,
  nameGlow,
  playerLevel,
  playerTitle,
  isGuest = false,
  primaryValue,
  primaryValueColor = 'text-teal-400',
  subValue,
  tournamentTag,
  onClickPlayer,
  darkMode = true,
}) => {
  // Rang-Abzeichen Styling
  const renderRankBadge = () => {
    if (rank === 1) {
      return (
        <span
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-xs sm:text-sm bg-gradient-to-br from-amber-400/30 via-yellow-500/25 to-amber-600/20 text-amber-300 border border-amber-400/60 shadow-[0_0_10px_rgba(245,158,11,0.25)] select-none"
          title="Platz 1 - Gold"
        >
          <span className="flex items-center gap-0.5">
            <span className="text-[10px] sm:text-xs">🥇</span>
            <span>1</span>
          </span>
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-xs sm:text-sm bg-gradient-to-br from-slate-200/30 via-slate-300/20 to-slate-400/25 text-slate-200 border border-slate-300/60 shadow-[0_0_10px_rgba(203,213,225,0.2)] select-none"
          title="Platz 2 - Silber"
        >
          <span className="flex items-center gap-0.5">
            <span className="text-[10px] sm:text-xs">🥈</span>
            <span>2</span>
          </span>
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-xs sm:text-sm bg-gradient-to-br from-amber-700/30 via-amber-800/20 to-amber-900/25 text-amber-400 border border-amber-600/60 shadow-[0_0_10px_rgba(217,119,6,0.2)] select-none"
          title="Platz 3 - Bronze"
        >
          <span className="flex items-center gap-0.5">
            <span className="text-[10px] sm:text-xs">🥉</span>
            <span>3</span>
          </span>
        </span>
      );
    }
    return (
      <span
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs text-slate-400 bg-black/20 dark:bg-slate-800/70 border border-white/5 dark:border-white/10 select-none"
        title={`Platz ${rank}`}
      >
        #{rank}
      </span>
    );
  };

  return (
    <div
      className={`group flex items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all duration-200 border ${
        darkMode
          ? 'bg-slate-900/75 hover:bg-slate-900/95 border-white/5 hover:border-amber-500/30 shadow-xs'
          : 'bg-white/85 hover:bg-white border-black/5 hover:border-amber-500/30 shadow-xs'
      }`}
    >
      {/* Linke Seite: Rang, Avatar & Spieleridentität */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 pr-2">
        {renderRankBadge()}

        {/* Avatar */}
        <button
          type="button"
          onClick={onClickPlayer}
          className="relative group shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95 focus:outline-none"
          title={`Profil von ${playerName} ansehen`}
        >
          <PlayerAvatar
            url={avatarUrl}
            avatar_frame={avatarFrame}
            name={playerName}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-white/10 shadow-xs object-cover"
          />
        </button>

        {/* Spielername & Badges */}
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <button
              type="button"
              onClick={onClickPlayer}
              className="hover:underline text-left cursor-pointer font-black hover:text-indigo-400 dark:hover:text-indigo-300 transition-colors inline-flex items-center gap-1 max-w-full truncate min-w-0"
              title={playerName}
            >
              <span className="truncate max-w-[110px] sm:max-w-[170px] md:max-w-[220px]">
                <PlayerNameTag name={playerName} colorKey={nameBgColor} glowKey={nameGlow} />
              </span>
              <i className="fas fa-search-plus text-[9px] opacity-0 group-hover:opacity-60 transition-opacity shrink-0 hidden sm:inline-block"></i>
            </button>

            {isGuest && (
              <span
                className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30 shrink-0 select-none"
                title="Gast-Spieler ohne registrierten Account"
              >
                (Gast)
              </span>
            )}

            {!isGuest && typeof playerLevel === 'number' && (
              <PlayerLevelBadge level={playerLevel} isGuest={false} size="xs" />
            )}

            {playerTitle && (
              <span className="hidden xs:inline-flex">
                <PlayerTitleBadge title={playerTitle} size="sm" />
              </span>
            )}
          </div>

          {tournamentTag && (
            <div className="mt-0.5 truncate">
              <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 truncate max-w-full">
                {tournamentTag}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Rechte Seite: Prominente Metrik-Box */}
      <div className="shrink-0 flex flex-col items-end text-right pl-2 ml-1 border-l border-gray-500/10">
        <div className="bg-black/15 dark:bg-black/35 px-2 sm:px-2.5 py-1 rounded-xl border border-white/5 flex flex-col items-end text-right min-w-[76px] sm:min-w-[100px]">
          <span className={`font-black text-xs sm:text-sm tracking-tight ${primaryValueColor}`}>
            {primaryValue}
          </span>
          {subValue && (
            <span className="block text-[8px] sm:text-[9px] opacity-60 font-medium whitespace-nowrap mt-0.5 text-slate-400">
              {subValue}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
