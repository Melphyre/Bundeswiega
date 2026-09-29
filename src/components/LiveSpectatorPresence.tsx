import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { SpectatorPresenceUser } from '../services/activeGamesService';
import PlayerAvatar from './PlayerAvatar';
import PlayerTitleBadge from './PlayerTitleBadge';

interface LiveSpectatorPresenceProps {
  gameId: string;
  currentUser?: {
    id: string;
    username: string;
    avatarUrl?: string | null;
    title?: string;
  } | null;
  isHost?: boolean;
  darkMode?: boolean;
  onSpectatorCountChange?: (count: number) => void;
  className?: string;
}

export const LiveSpectatorPresence: React.FC<LiveSpectatorPresenceProps> = ({
  gameId,
  currentUser,
  isHost = false,
  darkMode = true,
  onSpectatorCountChange,
  className = ''
}) => {
  const [spectators, setSpectators] = useState<SpectatorPresenceUser[]>([]);
  const [showViewersModal, setShowViewersModal] = useState(false);

  useEffect(() => {
    if (!gameId) return;

    const channelName = `game_${gameId}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: currentUser?.id || `anon_${Math.random().toString(36).substring(2, 9)}`
        }
      }
    });

    const updatePresenceList = () => {
      const state = channel.presenceState();
      const all: SpectatorPresenceUser[] = [];
      const seen = new Set<string>();

      Object.values(state).forEach((presences: any) => {
        if (Array.isArray(presences)) {
          presences.forEach((p: any) => {
            if (p?.user_id && !seen.has(p.user_id)) {
              seen.add(p.user_id);
              // Host nicht als Zuschauer zählen
              if (!p.is_host) {
                all.push(p);
              }
            }
          });
        }
      });

      setSpectators(all);
      if (onSpectatorCountChange) {
        onSpectatorCountChange(all.length);
      }
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        updatePresenceList();
      })
      .on('presence', { event: 'join' }, () => {
        updatePresenceList();
      })
      .on('presence', { event: 'leave' }, () => {
        updatePresenceList();
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          if (currentUser?.id) {
            await channel.track({
              user_id: currentUser.id,
              username: currentUser.username || 'Spieler',
              avatar_url: currentUser.avatarUrl || null,
              title: currentUser.title || '',
              is_host: isHost,
              joined_at: new Date().toISOString()
            });
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, currentUser?.id, isHost]);

  const spectatorCount = spectators.length;

  return (
    <>
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer select-none transition-all hover:scale-105 active:scale-95 shadow-sm ${
          darkMode
            ? 'bg-slate-800/90 border-slate-700/80 text-white'
            : 'bg-white/95 border-gray-200 text-gray-800'
        } ${className}`}
        onClick={() => spectatorCount > 0 && setShowViewersModal(true)}
        title={
          spectatorCount > 0
            ? `${spectatorCount} Zuschauer online (Klicken für Details)`
            : 'Aktuell keine Zuschauer'
        }
      >
        {/* Pulsierender Live-Indikator */}
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
        </span>

        <span className="text-[10px] md:text-xs font-black uppercase tracking-wider text-red-500">
          Live
        </span>

        <span className="text-gray-400 opacity-40">|</span>

        {/* Zuschauer-Zähler */}
        <div className="flex items-center gap-1.5">
          <i className="fas fa-eye text-xs text-teal-400"></i>
          <span className="font-bold text-xs">
            {spectatorCount}{' '}
            <span className="hidden sm:inline font-normal opacity-75">
              {spectatorCount === 1 ? 'Zuschauer' : 'Zuschauer'}
            </span>
          </span>
        </div>

        {/* Avatare der Zuschauer */}
        {spectators.length > 0 && (
          <div className="flex -space-x-1.5 overflow-hidden ml-1">
            {spectators.slice(0, 3).map((spec, idx) => (
              <PlayerAvatar
                key={spec.user_id || idx}
                url={spec.avatar_url}
                name={spec.username}
                className="w-5 h-5 rounded-full border-2 border-slate-800 flex-shrink-0"
              />
            ))}
            {spectators.length > 3 && (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-700 text-[9px] font-black text-white border-2 border-slate-800">
                +{spectators.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Zuschauer-Modal / Popup */}
      {showViewersModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div
            className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl border ${
              darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <i className="fas fa-eye text-teal-400 text-lg"></i>
                <h3 className="font-black text-lg">Aktuelle Zuschauer ({spectators.length})</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowViewersModal(false)}
                className="p-1.5 rounded-full hover:bg-white/10 opacity-70 hover:opacity-100 cursor-pointer"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <p className="text-xs opacity-60 mb-4">
              Diese Freunde verfolgen dieses Spiel aktuell in Echtzeit:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {spectators.map((spec, i) => (
                <div
                  key={spec.user_id || i}
                  className={`flex items-center justify-between p-2.5 rounded-2xl border ${
                    darkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <PlayerAvatar
                      url={spec.avatar_url}
                      name={spec.username}
                      className="w-9 h-9 rounded-full border border-teal-500/40"
                    />
                    <div>
                      <p className="font-bold text-sm leading-tight">{spec.username}</p>
                      {spec.title && (
                        <div className="mt-0.5">
                          <PlayerTitleBadge title={spec.title} size="sm" />
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Online
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowViewersModal(false)}
              className="w-full mt-6 py-2.5 rounded-xl font-bold text-sm bg-gray-500/20 hover:bg-gray-500/30 transition-all cursor-pointer"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </>
  );
};
export default LiveSpectatorPresence;
