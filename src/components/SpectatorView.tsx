import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { ActiveGame } from '../services/activeGamesService';
import { LiveSpectatorPresence } from './LiveSpectatorPresence';
import { GameTable } from './GameTable';
import PlayerAvatar from './PlayerAvatar';
import PlayerTitleBadge from './PlayerTitleBadge';
import PlayerLevelBadge from './PlayerLevelBadge';
import { PlayerNameTag } from './PlayerNameTag';
import { calculateAverageDistance } from '../../utils';
import { BRAND_COLOR, DARK_GRAY, PLAYER_COLORS } from '../constants';
import { getColumnThemeClass, getRowThemeClass } from '../constants/cosmeticsConfig';

interface SpectatorViewProps {
  initialGame: ActiveGame;
  currentUser: {
    id: string;
    username: string;
    avatarUrl?: string | null;
    title?: string;
  };
  onClose: () => void;
  darkMode?: boolean;
}

export const SpectatorView: React.FC<SpectatorViewProps> = ({
  initialGame,
  currentUser,
  onClose,
  darkMode = true
}) => {
  const [game, setGame] = useState<ActiveGame>(initialGame);
  const [now, setNow] = useState(Date.now());
  const [isConnected, setIsConnected] = useState(true);

  // Timer für verstrichene Zeit
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Realtime postgres_changes Abonnieren
  useEffect(() => {
    if (!game.id) return;

    // Direkt initiale Zeile laden für absolute Frische
    supabase
      .from('active_games')
      .select('*')
      .eq('id', game.id)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          setGame(prev => ({
            ...prev,
            ...data,
            host_profile: prev.host_profile
          }));
        }
      });

    const channelName = `spectator_game_${game.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_games',
          filter: `id=eq.${game.id}`
        },
        payload => {
          if (payload.new) {
            setGame(prev => ({
              ...prev,
              ...(payload.new as any),
              host_profile: prev.host_profile
            }));
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game.id]);

  // Formatierung der verstrichenen Zeit
  const formatElapsedTime = (createdAt: string) => {
    const start = new Date(createdAt).getTime();
    if (isNaN(start)) return '0:00';
    const diffSeconds = Math.max(0, Math.floor((now - start) / 1000));
    const mins = Math.floor(diffSeconds / 60);
    const secs = diffSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs} Min.`;
  };

  // Modus-Details
  const gameMode = game.game_mode || 'Standardspiel';
  const isSpeedMode = gameMode.toLowerCase().includes('speed');
  const isTeamMode = gameMode.toLowerCase().includes('team');
  const isTournament = gameMode.toLowerCase().includes('turnier');

  const players = Array.isArray(game.players) ? game.players : [];
  const gameData = game.game_data || {};
  const rounds = Array.isArray(gameData.rounds) ? gameData.rounds : [];
  const currentRoundResults = gameData.currentRoundResults || {};
  const isFinished = game.status === 'finished';

  // Standings / Rangliste für Standardspiel & Turnier
  const sortedPlayers = [...players].map(p => {
    const avg = calculateAverageDistance(p.id, rounds);
    const schnaepse = Number(p.schnaepse) || 0;
    const total = Math.round((avg + schnaepse) * 100) / 100;
    return { ...p, avg, schnaepse, total };
  }).sort((a, b) => {
    if (a.isDisqualified && !b.isDisqualified) return 1;
    if (!a.isDisqualified && b.isDisqualified) return -1;
    if (a.total !== b.total) return a.total - b.total;
    return a.avg - b.avg;
  });

  return (
    <div className={`min-h-screen flex flex-col p-3 md:p-6 transition-colors duration-300 ${
      darkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-gray-900'
    }`}>
      {/* Top Navigation & Status Bar */}
      <header className="max-w-5xl mx-auto w-full mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-black/10 dark:bg-white/5 border border-gray-500/20 shadow-md">
          {/* Linker Bereich: Zurück & Host */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-2xl border border-gray-500/30 hover:bg-white/10 active:scale-95 transition-all text-xs font-black flex items-center space-x-2 cursor-pointer shadow-xs"
            >
              <i className="fas fa-arrow-left"></i>
              <span>Verlassen</span>
            </button>

            <div className="h-6 w-px bg-gray-500/20"></div>

            <div className="flex items-center space-x-2.5">
              <PlayerAvatar
                url={game.host_profile?.avatar_url}
                name={game.host_profile?.username || 'Host'}
                className="w-9 h-9 rounded-xl border-2 border-teal-500"
              />
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-black text-sm">
                    {game.host_profile?.username || 'Host'}
                  </span>
                  <span className="text-[9px] font-black uppercase text-teal-400 bg-teal-500/10 px-1.5 py-0.2 rounded-md">
                    Host
                  </span>
                  {game.host_profile?.level && (
                    <PlayerLevelBadge level={game.host_profile.level} isGuest={false} size="sm" />
                  )}
                </div>
                {game.host_profile?.title && (
                  <div className="mt-0.5">
                    <PlayerTitleBadge title={game.host_profile.title} size="sm" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rechter Bereich: Modus, Runde, Zeit, Zuschauer */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Modus Badge */}
            <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center gap-1.5">
              <i className={isSpeedMode ? 'fas fa-bolt' : isTeamMode ? 'fas fa-users' : isTournament ? 'fas fa-trophy' : 'fas fa-balance-scale'}></i>
              <span>{gameMode}</span>
            </span>

            {/* Runde Badge */}
            <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-black/10 dark:bg-white/10 border border-gray-500/20">
              {isSpeedMode ? `Level ${game.current_round || 1}` : `Runde ${game.current_round || 1}`}
            </span>

            {/* Elapsed Time */}
            <span className="px-2.5 py-1.5 rounded-xl text-xs font-bold opacity-75 flex items-center gap-1">
              <i className="far fa-clock text-[11px]"></i>
              <span>{formatElapsedTime(game.created_at)}</span>
            </span>

            {/* Presence Viewer Pill */}
            <LiveSpectatorPresence
              gameId={game.id}
              currentUser={currentUser}
              isHost={false}
              darkMode={darkMode}
            />

            {/* Connection Status Indicator */}
            <span
              className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}
              title={isConnected ? 'Realtime synchronisiert' : 'Verbindung getrennt'}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto w-full flex-1 flex flex-col space-y-6">
        {/* Banner wenn Spiel beendet */}
        {isFinished && (
          <div className="p-4 rounded-3xl bg-amber-500/20 border-2 border-amber-500/40 text-center animate-in zoom-in-95">
            <h2 className="text-xl font-black text-amber-400 flex items-center justify-center gap-2">
              <span>🏁</span>
              <span>Dieses Spiel wurde beendet</span>
              <span>🏁</span>
            </h2>
            <p className="text-xs opacity-80 mt-1">
              Das finale Endergebnis wurde berechnet und in die Chronik eingetragen.
            </p>
          </div>
        )}

        {/* 1. SPEEDWIEGEN ZUSCHAUER ANSICHT */}
        {isSpeedMode && (
          <div className="space-y-6">
            <div className={`p-6 rounded-3xl border ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'} shadow-lg text-center`}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-black mb-4">
                <i className="fas fa-bolt"></i>
                <span>Speedwiegen Live</span>
              </div>

              <div className="flex items-center justify-center space-x-3 mb-2">
                <PlayerAvatar
                  url={players[0]?.avatar_url || players[0]?.imageUrl || gameData.speedPlayerAvatar}
                  avatar_url={players[0]?.avatar_url || players[0]?.imageUrl || gameData.speedPlayerAvatar}
                  avatar_frame={players[0]?.avatar_frame || (players[0] as any)?.frame}
                  name={gameData.speedPlayerName || players[0]?.name || 'Spieler'}
                  className="w-12 h-12 rounded-2xl border-2 border-amber-400 flex-shrink-0"
                />
                <h2 className="text-2xl font-black">
                  {gameData.speedPlayerName || players[0]?.name || 'Spieler'}
                </h2>
              </div>

              <p className="text-sm opacity-60 mb-6">
                Ziel: {gameData.speedLevels || 3} Level in Bestzeit absolvieren
              </p>

              {/* Status / Level Progress */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-2xl bg-black/10 dark:bg-white/5 border border-gray-500/20">
                  <p className="text-[10px] font-black uppercase opacity-60">Aktuelles Level</p>
                  <p className="text-2xl font-black text-amber-400">
                    {game.current_round || 1} / {gameData.speedLevels || 3}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-black/10 dark:bg-white/5 border border-gray-500/20">
                  <p className="text-[10px] font-black uppercase opacity-60">Status</p>
                  <p className="text-2xl font-black">
                    {isFinished ? 'Beendet' : 'Läuft'}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-black/10 dark:bg-white/5 border border-gray-500/20">
                  <p className="text-[10px] font-black uppercase opacity-60">Verstrichene Zeit</p>
                  <p className="text-2xl font-black font-mono text-teal-400">
                    {formatElapsedTime(game.created_at)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-black/10 dark:bg-white/5 border border-gray-500/20">
                  <p className="text-[10px] font-black uppercase opacity-60">Flaschengröße</p>
                  <p className="text-2xl font-black">
                    {gameData.speedIsShortMode ? '0,33L' : '500ml'}
                  </p>
                </div>
              </div>

              {/* Level-Ergebnisse & Zielgewichte */}
              {gameData.speedTargets && Object.keys(gameData.speedTargets).length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-500/20 text-center font-black opacity-75">
                        <th className="py-2">Level</th>
                        <th className="py-2">Ziel</th>
                        <th className="py-2">Gewogen</th>
                        <th className="py-2">Differenz</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(gameData.speedTargets).map((lvlKey) => {
                        const target = gameData.speedTargets[lvlKey];
                        const result = gameData.speedResults?.[lvlKey];
                        const diff = result !== undefined && target !== undefined ? Math.abs(Number(result) - Number(target)) : null;

                        return (
                          <tr key={lvlKey} className="border-b border-gray-500/10 text-center">
                            <td className="py-3 font-bold">Level {lvlKey}</td>
                            <td className="py-3 font-mono font-black">{target ? `${target}g` : '-'}</td>
                            <td className="py-3 font-mono font-bold text-teal-400">{result ? `${result}g` : 'Warten...'}</td>
                            <td className="py-3 font-bold">
                              {diff !== null ? (
                                <span className={diff === 0 ? 'text-emerald-400 font-black' : diff > 50 ? 'text-red-400' : 'opacity-80'}>
                                  {diff === 0 ? '🎯 Volltreffer' : `+${diff}g`}
                                </span>
                              ) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. TEAMWIEGEN ZUSCHAUER ANSICHT */}
        {isTeamMode && (
          <div className="space-y-6">
            <div className={`p-6 rounded-3xl border ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'} shadow-lg`}>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <div>
                  <h2 className="text-xl font-black flex items-center gap-2">
                    <i className="fas fa-users text-purple-400"></i>
                    <span>Teamwiegen Live-Zwischenstand</span>
                  </h2>
                  <p className="text-xs opacity-60">Runde {game.current_round || 1}</p>
                </div>
              </div>

              {/* Teams Übersicht */}
              {Array.isArray(gameData.teams) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {gameData.teams.map((t: any, idx: number) => {
                    const teamColor = idx === 0 ? '#3B82F6' : '#EF4444';
                    return (
                      <div
                        key={t.id || idx}
                        className="p-5 rounded-2xl border bg-black/10 dark:bg-white/5 space-y-3"
                        style={{ borderColor: teamColor }}
                      >
                        <div className="flex justify-between items-center">
                          <h3 className="font-black text-lg" style={{ color: teamColor }}>
                            {t.name || `Team ${idx + 1}`}
                          </h3>
                          <span className="text-sm font-black px-3 py-1 rounded-xl bg-black/20 dark:bg-white/10">
                            {t.points || 0} Pkt.
                          </span>
                        </div>

                        {/* Spieler des Teams */}
                        <div className="space-y-1.5">
                          {(t.playerIds || []).map((pId: string) => {
                            const p = players.find(x => x.id === pId);
                            const pAvatar = p?.avatar_url || p?.imageUrl;
                            return (
                              <div key={pId} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-black/5 dark:bg-white/5">
                                <div className="flex items-center space-x-2 min-w-0">
                                  <PlayerAvatar
                                    url={pAvatar}
                                    avatar_url={pAvatar}
                                    name={p?.name || 'Spieler'}
                                    className="w-5 h-5 rounded-md border flex-shrink-0"
                                  />
                                  <span className="font-bold truncate">{p?.name || 'Spieler'}</span>
                                </div>
                                <span className="opacity-60">{p?.startWeight ? `${p.startWeight}g` : ''}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Runden-Tabelle Teamwiegen */}
              {rounds.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-500/20 font-black opacity-75">
                        <th className="py-2">RND</th>
                        <th className="py-2 text-right">ZIEL</th>
                        {players.map(p => {
                          const colClass = getColumnThemeClass(p.ingame_column_theme || (p as any).column_theme);
                          return (
                            <th key={p.id} className={`py-2 text-center transition-all ${colClass}`}>
                              <div className="flex flex-col items-center gap-1">
                                {(p.ingame_column_theme === 'diamond_crown' || (p as any).column_theme === 'diamond_crown') && (
                                  <span className="text-xs -mb-1 animate-bounce select-none">👑</span>
                                )}
                                <PlayerAvatar
                                  url={p.avatar_url || p.imageUrl}
                                  avatar_url={p.avatar_url || p.imageUrl}
                                  avatar_frame={p.avatar_frame}
                                  name={p.name}
                                  className="w-6 h-6 rounded-md border flex-shrink-0"
                                />
                                <span className="truncate max-w-[64px]">{p.name}</span>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {rounds.map((r: any, rIdx: number) => (
                        <tr key={rIdx} className="border-b border-gray-500/10">
                          <td className="py-2 font-bold opacity-60">#{rIdx + 1}</td>
                          <td className="py-2 text-right font-black font-mono">{r.targetWeight}g</td>
                          {players.map(p => {
                            const val = r.results?.[p.id];
                            const diff = val !== undefined ? Math.abs(val - r.targetWeight) : null;
                            const colClass = getColumnThemeClass(p.ingame_column_theme || (p as any).column_theme);
                            return (
                              <td key={p.id} className={`py-2 text-center transition-all ${colClass}`}>
                                <span className="font-mono font-bold">{val !== undefined ? `${val}g` : '-'}</span>
                                {diff !== null && (
                                  <span className={`block text-[9px] ${diff === 0 ? 'text-emerald-400 font-black' : 'opacity-60'}`}>
                                    {diff === 0 ? '🎯' : `+${diff}`}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. STANDARDSPIEL & TURNIERSPIEL ZUSCHAUER ANSICHT */}
        {!isSpeedMode && !isTeamMode && (
          <div className="space-y-6">
            {/* Aktuelle Runde Info-Karte */}
            <div className={`p-4 md:p-6 rounded-3xl border ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'} shadow-md`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping"></span>
                    <h3 className="font-black text-lg">
                      Runde {game.current_round || 1} im Gange
                    </h3>
                  </div>
                  <p className="text-xs opacity-60">
                    {rounds.length > 0 && rounds[rounds.length - 1]?.isFinal
                      ? 'Das Finale wird gerade gewogen!'
                      : rounds.length > 0
                      ? `Aktuelles Zielgewicht: ${rounds[rounds.length - 1]?.targetWeight}g`
                      : 'Das Spiel hat begonnen. Zielgewicht wird festgelegt.'}
                  </p>
                </div>

                {/* Zielgewicht Highlight */}
                {rounds.length > 0 && (
                  <div className="flex items-center gap-3 bg-black/10 dark:bg-white/5 border border-teal-500/30 px-5 py-3 rounded-2xl">
                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase opacity-60 block">Zielgewicht</span>
                      <span className="text-2xl font-black text-teal-400 font-mono">
                        {rounds[rounds.length - 1]?.targetWeight || 0}g
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Read-Only Spieltabelle (GameTable) */}
            <div className={`rounded-3xl border ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'} p-3 md:p-5 shadow-lg`}>
              <h3 className="font-black text-sm mb-3 px-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <i className="fas fa-table text-teal-400"></i>
                  <span>Live-Spieltabelle</span>
                </span>
                <span className="text-[11px] font-normal opacity-50">
                  {rounds.length} {rounds.length === 1 ? 'Runde' : 'Runden'} gespielt
                </span>
              </h3>

              <GameTable
                showInputs={false}
                players={players}
                rounds={rounds}
                darkMode={darkMode}
                currentRoundResults={currentRoundResults}
                setCurrentRoundResults={() => {}}
              />
            </div>

            {/* Live-Rangliste (Standings) */}
            <div className={`p-4 md:p-6 rounded-3xl border ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'} shadow-md`}>
              <h3 className="font-black text-base mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <i className="fas fa-trophy text-amber-400"></i>
                  <span>Live-Rangliste</span>
                </span>
                <span className="text-xs font-normal opacity-50">
                  Sortiert nach bestem Schnitt & Schnäpsen
                </span>
              </h3>

              <div className="space-y-2">
                {sortedPlayers.map((p, idx) => {
                  const isLeader = idx === 0 && !p.isDisqualified;
                  const rowThemeClass = getRowThemeClass(p.leaderboard_row_theme || (p as any).row_theme);
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${rowThemeClass} ${
                        isLeader
                          ? 'border-amber-400/50 bg-amber-500/10 shadow-sm'
                          : 'border-gray-500/15 bg-black/5 dark:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center ${
                          idx === 0 ? 'bg-amber-400 text-black shadow-xs' : idx === 1 ? 'bg-slate-300 text-black' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-gray-500/20 opacity-60'
                        }`}>
                          {idx + 1}
                        </span>

                        <PlayerAvatar
                          url={p.avatar_url || p.imageUrl}
                          avatar_url={p.avatar_url || p.imageUrl}
                          avatar_frame={p.avatar_frame}
                          name={p.name}
                          className="w-8 h-8 rounded-xl border flex-shrink-0"
                          style={{ borderColor: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}
                        />

                        <div>
                          <div className="flex items-center gap-1.5">
                            <PlayerNameTag name={p.name} colorKey={p.name_bg_color} />
                            {p.isDisqualified && (
                              <span className="text-[10px] font-black uppercase text-red-500 bg-red-500/10 px-1.5 py-0.2 rounded-md">
                                DQ
                              </span>
                            )}
                          </div>
                          {p.title && (
                            <div className="mt-0.5">
                              <PlayerTitleBadge title={p.title} size="sm" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right font-mono">
                        <div>
                          <span className="text-[9px] uppercase opacity-50 block">Schnitt</span>
                          <span className="font-bold text-sm">{p.avg.toFixed(2)}g</span>
                        </div>
                        {p.schnaepse > 0 && (
                          <div>
                            <span className="text-[9px] uppercase opacity-50 block">Schnäpse</span>
                            <span className="font-bold text-sm text-red-400">+{p.schnaepse}</span>
                          </div>
                        )}
                        <div className="min-w-[50px]">
                          <span className="text-[9px] uppercase opacity-50 block">Gesamt</span>
                          <span className="font-black text-base text-teal-400">{p.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="max-w-5xl mx-auto w-full mt-6 py-4 text-center text-xs opacity-50 flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span>Echtzeit Live-Stream via Supabase Realtime • Änderungen werden sofort übertragen</span>
      </footer>
    </div>
  );
};
export default SpectatorView;
