import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { ActiveGame, fetchFriendsActiveGames } from '../services/activeGamesService';
import PlayerAvatar from './PlayerAvatar';
import PlayerTitleBadge from './PlayerTitleBadge';
import PlayerLevelBadge from './PlayerLevelBadge';

interface LiveGamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  onSelectGame: (game: ActiveGame) => void;
  darkMode?: boolean;
  onOpenFriendsModal?: () => void;
}

export const LiveGamesModal: React.FC<LiveGamesModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  onSelectGame,
  darkMode = true,
  onOpenFriendsModal
}) => {
  const [games, setGames] = useState<ActiveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Timer zur Aktualisierung der verstrichenen Zeit
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Spiele laden
  const loadGames = async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const active = await fetchFriendsActiveGames(currentUserId);
      setGames(active);
    } catch (e) {
      console.error('Error loading friends active games:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !currentUserId) return;
    loadGames();

    // Realtime-Updates bei Änderungen an active_games
    const channel = supabase
      .channel('public_active_games_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_games'
        },
        () => {
          loadGames();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, currentUserId]);

  if (!isOpen) return null;

  // Helfer für verstrichene Zeit
  const formatElapsedTime = (createdAt: string) => {
    const start = new Date(createdAt).getTime();
    if (isNaN(start)) return 'Gerade gestartet';

    const diffSeconds = Math.max(0, Math.floor((now - start) / 1000));
    const mins = Math.floor(diffSeconds / 60);
    const secs = diffSeconds % 60;

    if (mins === 0) {
      return `${secs} Sek.`;
    }
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  // Helfer für Modus-Icon und Farbe
  const getModeInfo = (mode: string) => {
    const lower = (mode || '').toLowerCase();
    if (lower.includes('speed')) {
      return { icon: 'fas fa-bolt', label: mode, badgeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    }
    if (lower.includes('team')) {
      return { icon: 'fas fa-users', label: mode, badgeBg: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
    }
    if (lower.includes('turnier')) {
      return { icon: 'fas fa-trophy', label: mode, badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    }
    return { icon: 'fas fa-balance-scale', label: mode, badgeBg: 'bg-teal-500/20 text-teal-400 border-teal-500/30' };
  };

  return (
    <div className="fixed inset-0 z-[950] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div
        className={`w-full max-w-xl rounded-3xl p-6 shadow-2xl border flex flex-col max-h-[90vh] ${
          darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-500/20 mb-4 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-500">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            </div>
            <div>
              <h2 className="text-xl font-black flex items-center gap-2">
                Live zuschauen
                {games.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-black">
                    {games.length} aktiv
                  </span>
                )}
              </h2>
              <p className="text-xs opacity-60">Laufende Spiele deiner Freunde in Echtzeit verfolgen</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={loadGames}
              className="p-2 rounded-xl border border-gray-500/20 hover:bg-white/5 opacity-70 hover:opacity-100 transition-all cursor-pointer"
              title="Aktualisieren"
            >
              <i className={`fas fa-sync-alt text-xs ${loading ? 'animate-spin' : ''}`}></i>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 opacity-70 hover:opacity-100 transition-all cursor-pointer"
            >
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {loading && games.length === 0 ? (
            <div className="py-16 text-center space-y-3 opacity-60">
              <i className="fas fa-circle-notch fa-spin text-3xl text-teal-400"></i>
              <p className="text-sm font-bold">Suche laufende Spiele...</p>
            </div>
          ) : games.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gray-500/10 border border-gray-500/20 flex items-center justify-center text-3xl opacity-50">
                <i className="fas fa-satellite-dish"></i>
              </div>
              <div className="max-w-sm mx-auto">
                <h3 className="font-black text-lg mb-1">Keine aktiven Spiele deiner Freunde</h3>
                <p className="text-xs opacity-60 leading-relaxed">
                  Aktuell ist keines deiner befreundeten Mitglieder in einer laufenden Runde. Sobald ein Freund ein Spiel startet, kannst du hier live mitfiebern!
                </p>
              </div>
              {onOpenFriendsModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenFriendsModal();
                  }}
                  className="px-4 py-2 rounded-xl font-bold text-xs bg-teal-500/20 text-teal-400 border border-teal-500/30 hover:bg-teal-500/30 transition-all cursor-pointer inline-flex items-center space-x-1.5"
                >
                  <i className="fas fa-user-friends"></i>
                  <span>Freundesliste öffnen</span>
                </button>
              )}
            </div>
          ) : (
            games.map(game => {
              const modeInfo = getModeInfo(game.game_mode);
              const host = game.host_profile;
              const playersCount = Array.isArray(game.players) ? game.players.length : 0;
              const playerNames = Array.isArray(game.players)
                ? game.players.map(p => p.name || 'Spieler').slice(0, 3).join(', ')
                : '';

              return (
                <div
                  key={game.id}
                  className={`p-4 rounded-2xl border transition-all hover:border-teal-500/50 hover:shadow-lg ${
                    darkMode
                      ? 'bg-slate-800/80 border-slate-700/80'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Host & Meta Info */}
                    <div className="flex items-start space-x-3">
                      <PlayerAvatar
                        url={host?.avatar_url}
                        name={host?.username || 'Host'}
                        className="w-12 h-12 rounded-2xl border-2 border-teal-500 shadow-sm flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-base truncate">
                            {host?.username || 'Freund'}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                            Host
                          </span>
                          {host?.level && (
                            <PlayerLevelBadge level={host.level} isGuest={false} size="sm" />
                          )}
                        </div>

                        {host?.title && (
                          <div className="mt-0.5">
                            <PlayerTitleBadge title={host.title} size="sm" />
                          </div>
                        )}

                        {/* Modus, Runde, Zeit */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${modeInfo.badgeBg}`}
                          >
                            <i className={`${modeInfo.icon} text-[10px]`}></i>
                            <span>{modeInfo.label}</span>
                          </span>

                          <span className="text-[11px] font-semibold opacity-75 bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded-lg">
                            {game.game_mode.includes('Speed')
                              ? `Level ${game.current_round || 1}`
                              : `Runde ${game.current_round || 1}`}
                          </span>

                          <span className="text-[11px] font-medium opacity-60 flex items-center gap-1">
                            <i className="far fa-clock text-[10px]"></i>
                            <span>{formatElapsedTime(game.created_at)}</span>
                          </span>
                        </div>

                        {/* Spielerliste Preview */}
                        {playersCount > 0 && (
                          <p className="text-[11px] opacity-60 mt-1.5 truncate">
                            <i className="fas fa-users mr-1 text-[10px]"></i>
                            {playersCount} {playersCount === 1 ? 'Spieler' : 'Mitspieler'}: {playerNames}
                            {playersCount > 3 ? '...' : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex sm:flex-col justify-end items-center sm:items-end flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => onSelectGame(game)}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-black text-sm text-white bg-teal-600 hover:bg-teal-500 active:scale-95 shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
                      >
                        <i className="fas fa-eye"></i>
                        <span>Zuschauen</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-500/20 mt-4 flex justify-between items-center flex-shrink-0">
          <span className="text-xs opacity-50 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Echtzeit-Synchronisation aktiv
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-500/20 hover:bg-gray-500/30 transition-all cursor-pointer"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
export default LiveGamesModal;
