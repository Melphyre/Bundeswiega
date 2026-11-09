import React from 'react';
import { PlayerAvatar } from './PlayerAvatar';
import { PlayerNameTag } from './PlayerNameTag';
import { PlayerLevelBadge } from './PlayerLevelBadge';
import { PlayerTitleBadge } from './PlayerTitleBadge';

export interface LeaderboardStats {
  schnaepse?: number | string | null;
  avg?: number | string | null;
  total?: number | string | null;
  time?: number | string | null;
  score?: number | string | null;
  spiele?: number | string | null;
  games?: number | string | null;
  date?: string | null;
  levels?: number | string | null;
}

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
  gameMode?: 'standard' | 'speed' | 'team';
  activeTab?: 'avg' | 'schnapps' | 'total' | 'speed' | 'points' | string;
  viewMode?: 'gesamt' | 'einzelspiel' | string;
  stats?: LeaderboardStats;
  primaryValue?: React.ReactNode;
  primaryValueColor?: string;
  subValue?: React.ReactNode;
  tournamentTag?: string | null;
  onClickPlayer?: () => void;
  darkMode?: boolean;
}

export interface LeaderboardStatRowProps {
  activeTab?: 'avg' | 'schnapps' | 'total' | 'speed' | 'points' | string;
  viewMode?: 'gesamt' | 'einzelspiel' | string;
  stats: LeaderboardStats;
  gameMode?: 'standard' | 'speed' | 'team';
  darkMode?: boolean;
  tournamentTag?: string | null;
}

/**
 * LeaderboardStatRow:
 * Rendert dynamisch nur den für die aktuelle Sortierung und Ansicht relevanten Wert:
 * - Durchschnittsrekord: "Durchschnittlicher Abstand" (Mobil: "Ø Abstand") + im Gesamtmodus Spiele
 * - Schnappsrekord: "Schnäpse" + im Gesamtmodus Spiele
 * - Total Rekord: "Total" + im Gesamtmodus Spiele
 */
export const LeaderboardStatRow: React.FC<LeaderboardStatRowProps> = ({
  activeTab,
  viewMode = 'gesamt',
  stats,
  gameMode = 'standard',
  darkMode = true,
  tournamentTag,
}) => {
  const isEinzelspiel = viewMode === 'einzelspiel';
  const gamesCount = stats.games ?? stats.spiele;

  // Auto-Erkennung, falls activeTab nicht explizit gesetzt wurde
  const resolvedTab =
    activeTab ||
    (gameMode === 'speed'
      ? 'speed'
      : stats.avg !== undefined && stats.avg !== null && stats.schnaepse === undefined && stats.total === undefined
      ? 'avg'
      : stats.schnaepse !== undefined && stats.schnaepse !== null && stats.avg === undefined && stats.total === undefined
      ? 'schnapps'
      : stats.total !== undefined && stats.total !== null && stats.avg === undefined && stats.schnaepse === undefined
      ? 'total'
      : undefined);

  return (
    <div
      className={`flex items-center justify-between sm:justify-start sm:gap-4 pt-1.5 border-t text-[11px] sm:text-xs flex-wrap gap-y-1 overflow-x-auto no-scrollbar ${
        darkMode ? 'border-slate-800/80 text-slate-300' : 'border-slate-200 text-slate-700'
      }`}
    >
      {/* 1. DURCHSCHNITTSREKORD */}
      {resolvedTab === 'avg' && (
        <>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
              <span className="hidden sm:inline">Durchschnittlicher Abstand:</span>
              <span className="sm:hidden">Ø Abstand:</span>
            </span>
            <span className="font-bold text-teal-500 dark:text-teal-400 text-xs sm:text-sm">{stats.avg}</span>
          </div>

          {!isEinzelspiel && gamesCount !== undefined && gamesCount !== null && (
            <div className={`flex items-center gap-1.5 ml-auto text-xs font-medium shrink-0 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>Spiele:</span>
              <span className={`font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{gamesCount}</span>
            </div>
          )}

          {isEinzelspiel && stats.date && (
            <div className={`flex items-center gap-1.5 ml-auto text-[10px] shrink-0 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>{stats.date}</span>
            </div>
          )}
        </>
      )}

      {/* 2. SCHNAPPSREKORD */}
      {resolvedTab === 'schnapps' && (
        <>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Schnäpse:</span>
            <span className="font-bold text-teal-500 dark:text-teal-400 text-xs sm:text-sm">{stats.schnaepse}</span>
          </div>

          {!isEinzelspiel && gamesCount !== undefined && gamesCount !== null && (
            <div className={`flex items-center gap-1.5 ml-auto text-xs font-medium shrink-0 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>Spiele:</span>
              <span className={`font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{gamesCount}</span>
            </div>
          )}

          {isEinzelspiel && stats.date && (
            <div className={`flex items-center gap-1.5 ml-auto text-[10px] shrink-0 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>{stats.date}</span>
            </div>
          )}
        </>
      )}

      {/* 3. TOTAL REKORD */}
      {resolvedTab === 'total' && (
        <>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Total:</span>
            <span className="font-bold text-amber-500 dark:text-amber-400 text-xs sm:text-sm">{stats.total}</span>
          </div>

          {!isEinzelspiel && gamesCount !== undefined && gamesCount !== null && (
            <div className={`flex items-center gap-1.5 ml-auto text-xs font-medium shrink-0 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>Spiele:</span>
              <span className={`font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{gamesCount}</span>
            </div>
          )}

          {isEinzelspiel && stats.date && (
            <div className={`flex items-center gap-1.5 ml-auto text-[10px] shrink-0 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>{stats.date}</span>
            </div>
          )}
        </>
      )}

      {/* 4. SPEEDWIEGEN */}
      {resolvedTab === 'speed' && (
        <>
          {stats.time !== undefined && stats.time !== null && (
            <div className="flex items-center gap-1 shrink-0">
              <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Zeit:</span>
              <span className="font-semibold text-teal-500 dark:text-teal-400">{stats.time}</span>
            </div>
          )}
          {stats.avg !== undefined && stats.avg !== null && (
            <div className="flex items-center gap-1 shrink-0">
              <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                <span className="hidden sm:inline">Durchschnittlicher Abstand:</span>
                <span className="sm:hidden">Ø Abstand:</span>
              </span>
              <span className={`font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{stats.avg}</span>
            </div>
          )}
          {stats.score !== undefined && stats.score !== null && (
            <div className="flex items-center gap-1 shrink-0">
              <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Score:</span>
              <span className="font-semibold text-amber-500 dark:text-amber-400">{stats.score}</span>
            </div>
          )}
          {stats.levels !== undefined && stats.levels !== null && (
            <div className={`flex items-center gap-1 shrink-0 text-[10px] hidden xs:inline-flex ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <span>({stats.levels} St.)</span>
            </div>
          )}
          {stats.date && (
            <div className={`flex items-center gap-1 shrink-0 text-[10px] ml-auto hidden sm:inline-flex ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <span>{stats.date}</span>
            </div>
          )}
        </>
      )}

      {/* 5. ALLGEMEINER FALLBACK (falls mehrere Werte ohne activeTab) */}
      {!resolvedTab && (
        <>
          {stats.schnaepse !== undefined && stats.schnaepse !== null && (
            <div className="flex items-center gap-1 shrink-0">
              <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Schnäpse:</span>
              <span className="font-semibold text-teal-500 dark:text-teal-400">{stats.schnaepse}</span>
            </div>
          )}
          {stats.avg !== undefined && stats.avg !== null && (
            <div className="flex items-center gap-1 shrink-0">
              <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                <span className="hidden sm:inline">Durchschnittlicher Abstand:</span>
                <span className="sm:hidden">Ø Abstand:</span>
              </span>
              <span className={`font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{stats.avg}</span>
            </div>
          )}
          {stats.total !== undefined && stats.total !== null && (
            <div className="flex items-center gap-1 shrink-0">
              <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Total:</span>
              <span className="font-semibold text-amber-500 dark:text-amber-400">{stats.total}</span>
            </div>
          )}
          {gamesCount !== undefined && gamesCount !== null && (
            <div className="flex items-center gap-1 shrink-0">
              <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Spiele:</span>
              <span className="font-semibold text-amber-500 dark:text-amber-400">{gamesCount}</span>
            </div>
          )}
          {stats.date && (
            <div className={`flex items-center gap-1 shrink-0 text-[10px] hidden sm:inline-flex ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <span>{stats.date}</span>
            </div>
          )}
        </>
      )}

      {tournamentTag && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30 shrink-0 ml-auto sm:ml-0">
          {tournamentTag}
        </span>
      )}
    </div>
  );
};

/**
 * LeaderboardCard:
 * Zweizeilige, übersichtliche mobile Leaderboard-Karte für die Championswiegtabelle.
 * - Linker Bereich (über beide Zeilen): Rang-Medaille/Nummer (#1, #2, #3, ...) und Avatar mit Rahmen.
 * - Erste Zeile (oben): Vollständiges Namensschild mit allen Personalisierungen (Flamme, Blitz, Laser etc.)
 *   inklusive (Gast)-Hinweis, Level-Badge und Titel-Badge.
 * - Zweite Zeile (unten): Dynamisch gefilterte Kennzahlzeile (LeaderboardStatRow) je nach aktiver Ansicht.
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
  gameMode = 'standard',
  activeTab,
  viewMode = 'gesamt',
  stats,
  primaryValue,
  primaryValueColor = 'text-teal-400',
  subValue,
  tournamentTag,
  onClickPlayer,
  darkMode = true,
}) => {
  const isTop3 = rank <= 3;
  const rankStyle =
    rank === 1
      ? 'text-amber-400 bg-amber-500/20 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
      : rank === 2
      ? 'text-slate-300 bg-slate-300/20 border-slate-400/40 shadow-[0_0_8px_rgba(203,213,225,0.2)]'
      : rank === 3
      ? 'text-amber-500 bg-amber-700/20 border-amber-700/40 shadow-[0_0_8px_rgba(217,119,6,0.2)]'
      : 'text-slate-400 bg-slate-800/80 border-slate-700';

  const medalIcon =
    rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

  return (
    <div
      className={`flex gap-3 p-3 mb-2 rounded-xl border shadow-md transition-all duration-200 ${
        darkMode
          ? 'bg-slate-900/95 hover:bg-slate-900 border-slate-800 hover:border-amber-500/30 text-white'
          : 'bg-white/95 hover:bg-white border-slate-200 hover:border-amber-500/30 text-gray-900'
      }`}
    >
      {/* Linker Bereich (wirkt über beide Zeilen): Rang & Avatar */}
      <div className="flex items-center gap-2.5 shrink-0 self-center">
        {/* Rang Badge */}
        <div
          className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold border shrink-0 select-none ${rankStyle}`}
          title={`Platz ${rank}`}
        >
          {medalIcon ? (
            <span className="flex items-center text-[11px]">
              <span className="text-[10px] mr-0.5">{medalIcon}</span>
              <span>{rank}</span>
            </span>
          ) : (
            `#${rank}`
          )}
        </div>

        {/* Avatar mit optischer Präsenz über beide Zeilen */}
        <button
          type="button"
          onClick={onClickPlayer}
          className="relative shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95 focus:outline-none"
          title={`Profil von ${playerName} ansehen`}
        >
          <PlayerAvatar
            url={avatarUrl}
            avatar_frame={avatarFrame}
            name={playerName}
            className="w-11 h-11 rounded-full object-cover border-2 border-slate-700 shadow-inner shrink-0"
          />
        </button>
      </div>

      {/* Rechter Bereich: Zweizeiliges Layout */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5">
        {/* ERSTE ZEILE (Oben): Vollständiges Namensschild mit allen Effekten */}
        <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar py-1 px-0.5">
          <button
            type="button"
            onClick={onClickPlayer}
            className="hover:underline text-left cursor-pointer font-black hover:text-indigo-400 dark:hover:text-indigo-300 transition-colors inline-flex items-center gap-1 shrink-0"
            title={playerName}
          >
            <PlayerNameTag name={playerName} colorKey={nameBgColor} glowKey={nameGlow} />
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
            <PlayerLevelBadge level={playerLevel} isGuest={false} size="xs" className="shrink-0" />
          )}

          {playerTitle && (
            <PlayerTitleBadge title={playerTitle} size="sm" className="shrink-0" />
          )}
        </div>

        {/* ZWEITE ZEILE (Unten): Kennzahlen / Statistiken */}
        {stats ? (
          <LeaderboardStatRow
            activeTab={activeTab}
            viewMode={viewMode}
            stats={stats}
            gameMode={gameMode}
            darkMode={darkMode}
            tournamentTag={tournamentTag}
          />
        ) : (
          <div className={`flex items-center justify-between pt-1.5 border-t text-[11px] sm:text-xs ${
            darkMode ? 'border-slate-800/80 text-slate-300' : 'border-slate-200 text-slate-700'
          }`}>
            <span className={`font-bold ${primaryValueColor}`}>{primaryValue}</span>
            {subValue && (
              <span className={`text-[10px] opacity-80 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{subValue}</span>
            )}
            {tournamentTag && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30 shrink-0 ml-auto">
                {tournamentTag}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardCard;
