import React, { useState, useEffect, useMemo } from 'react';
import { BRAND_COLOR } from '../constants';
import { PlayerAvatar } from './PlayerAvatar';
import { PlayerNameTag } from './PlayerNameTag';
import { PlayerLevelBadge } from './PlayerLevelBadge';

export interface GuildLeaderboardEntry {
  id: string;
  name: string;
  tag: string;
  description: string;
  logo_url: string;
  captain_id: string;
  created_at: string;
  memberCount: number;
  captain?: {
    username: string;
    avatar_url: string;
  };
  members?: Array<{
    id: string;
    user_id: string;
    role: string;
    username: string;
    avatar_url: string;
    level: number;
    name_bg_color?: string;
  }>;
  gamesCount: number;
  avg: number;
  totalSchnaepse: number;
  avgSchnaepse: number;
  total: number;
}

interface GuildsLeaderboardViewProps {
  darkMode: boolean;
  currentUserId?: string;
}

type SortField = 'total' | 'avg' | 'schnaepse' | 'games' | 'members';

export const GuildsLeaderboardView: React.FC<GuildsLeaderboardViewProps> = ({
  darkMode,
  currentUserId
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<GuildLeaderboardEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('total');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedGuild, setSelectedGuild] = useState<GuildLeaderboardEntry | null>(null);
  const [userGuildId, setUserGuildId] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [lbRes, myGuildRes] = await Promise.all([
        fetch('/api/guilds/leaderboard'),
        currentUserId ? fetch(`/api/guilds/my-guild?userId=${encodeURIComponent(currentUserId)}`) : Promise.resolve(null)
      ]);

      const lbJson = await lbRes.json();
      if (!lbRes.ok || !lbJson.success) {
        throw new Error(lbJson.error || 'Fehler beim Laden der Wiegschaften-Tabelle');
      }
      setLeaderboard(Array.isArray(lbJson.leaderboard) ? lbJson.leaderboard : []);

      if (myGuildRes && myGuildRes.ok) {
        const myJson = await myGuildRes.json();
        if (myJson.inGuild && myJson.guild?.id) {
          setUserGuildId(myJson.guild.id);
        }
      }
    } catch (e: any) {
      console.error('Fehler beim Abrufen der Wiegschaften-Tabelle:', e);
      setError(e?.message || 'Tabelle konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [currentUserId]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      // For average distance, lower is usually better (ascending)
      setSortDir(field === 'avg' ? 'asc' : 'desc');
    }
  };

  const processedList = useMemo(() => {
    let list = [...leaderboard];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(g =>
        g.name.toLowerCase().includes(q) ||
        g.tag.toLowerCase().includes(q) ||
        (g.description && g.description.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      switch (sortBy) {
        case 'avg':
          // If no games, push to bottom
          valA = a.gamesCount > 0 ? a.avg : 999999;
          valB = b.gamesCount > 0 ? b.avg : 999999;
          break;
        case 'schnaepse':
          valA = a.totalSchnaepse;
          valB = b.totalSchnaepse;
          break;
        case 'games':
          valA = a.gamesCount;
          valB = b.gamesCount;
          break;
        case 'members':
          valA = a.memberCount;
          valB = b.memberCount;
          break;
        case 'total':
        default:
          valA = a.total;
          valB = b.total;
          break;
      }
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });

    return list;
  }, [leaderboard, searchQuery, sortBy, sortDir]);

  if (loading) {
    return (
      <div id="guild-leaderboard-loading" className="flex flex-col items-center justify-center py-16 space-y-3">
        <i className="fas fa-spinner animate-spin text-3xl" style={{ color: BRAND_COLOR }}></i>
        <p className="text-xs font-bold opacity-60">Wiegschaften-Rangliste wird berechnet...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div id="guild-leaderboard-error" className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-center space-y-3">
        <i className="fas fa-exclamation-circle text-2xl text-red-500"></i>
        <p className="text-xs font-bold text-red-500">{error}</p>
        <button
          id="btn-retry-guild-leaderboard"
          onClick={fetchLeaderboard}
          className="px-4 py-2 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 active:scale-95 cursor-pointer"
        >
          Erneut laden
        </button>
      </div>
    );
  }

  return (
    <div id="guilds-leaderboard-view" className="space-y-5">
      {/* Header Info Banner */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${darkMode ? 'bg-slate-900/60 border-slate-700/60' : 'bg-teal-50/70 border-teal-100'}`}>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center text-2xl flex-shrink-0">
            🏰
          </div>
          <div>
            <h3 className="text-base font-black uppercase tracking-tight" style={{ color: BRAND_COLOR }}>
              Wiegschaften Rangliste
            </h3>
            <p className="text-xs opacity-75">
              Aggregierte Werte aller Mitglieder und Spiele pro Wiegschaft
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-black/10 dark:bg-white/10">
            <span>Wiegschaften: </span>
            <span className="font-black text-teal-600 dark:text-teal-400">{leaderboard.length}</span>
          </div>
          <button
            id="btn-refresh-guilds-leaderboard"
            onClick={fetchLeaderboard}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-500/20 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all flex items-center space-x-1 cursor-pointer"
          >
            <i className="fas fa-sync-alt text-[10px]"></i>
            <span>Aktualisieren</span>
          </button>
        </div>
      </div>

      {/* Filter & Suchleiste */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-xs opacity-50"></i>
          <input
            id="guild-search-input"
            type="text"
            placeholder="Wiegschaft nach Name oder Kürzel suchen..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs font-semibold border focus:outline-none focus:ring-2 focus:ring-[#238183] ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-black'}`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sortierung Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold opacity-50 mr-1 flex-shrink-0">Sortierung:</span>
          {(
            [
              { key: 'total', label: 'Total' },
              { key: 'avg', label: 'Ø-Abstand' },
              { key: 'schnaepse', label: 'Schnäpse' },
              { key: 'games', label: 'Runden' },
              { key: 'members', label: 'Mitglieder' }
            ] as const
          ).map(s => {
            const isActive = sortBy === s.key;
            return (
              <button
                key={s.key}
                id={`btn-sort-guild-${s.key}`}
                onClick={() => handleSort(s.key)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex-shrink-0 flex items-center space-x-1 ${
                  isActive
                    ? 'bg-[#238183] text-white shadow-sm'
                    : 'bg-black/5 dark:bg-white/5 opacity-60 hover:opacity-100'
                }`}
              >
                <span>{s.label}</span>
                {isActive && (
                  <i className={`fas fa-sort-${sortDir === 'asc' ? 'up' : 'down'} text-[10px]`}></i>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rangliste Tabelle */}
      {processedList.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-gray-500/20 text-center opacity-60 text-xs">
          {searchQuery ? 'Keine Wiegschaft passend zur Suche gefunden.' : 'Noch keine Wiegschaften registriert.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-500/10">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b border-gray-500/15 uppercase text-[10px] tracking-wider font-bold ${darkMode ? 'bg-slate-900/80 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                <th className="py-3 px-3 w-12 text-center">Rang</th>
                <th className="py-3 px-3">Wiegschaft</th>
                <th className="py-3 px-3 text-center">Mitglieder</th>
                <th className="py-3 px-3 text-center">Runden</th>
                <th className="py-3 px-3 text-right cursor-pointer" onClick={() => handleSort('avg')}>
                  Ø-Abstand {sortBy === 'avg' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th className="py-3 px-3 text-right cursor-pointer" onClick={() => handleSort('schnaepse')}>
                  Schnäpse {sortBy === 'schnaepse' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th className="py-3 px-3 text-right cursor-pointer" onClick={() => handleSort('total')}>
                  Total {sortBy === 'total' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th className="py-3 px-3 text-center">Details</th>
              </tr>
            </thead>
            <tbody>
              {processedList.map((guild, idx) => {
                const rank = idx + 1;
                const isUserGuild = userGuildId === guild.id;

                let rankBadge = <span className="font-mono font-bold opacity-60">#{rank}</span>;
                if (rank === 1) {
                  rankBadge = <span className="text-base" title="1. Platz">🥇</span>;
                } else if (rank === 2) {
                  rankBadge = <span className="text-base" title="2. Platz">🥈</span>;
                } else if (rank === 3) {
                  rankBadge = <span className="text-base" title="3. Platz">🥉</span>;
                }

                return (
                  <tr
                    key={guild.id}
                    id={`guild-leaderboard-row-${guild.id}`}
                    className={`border-b border-gray-500/10 transition-colors ${
                      isUserGuild
                        ? darkMode
                          ? 'bg-teal-500/15 border-l-4 border-l-teal-400 hover:bg-teal-500/20'
                          : 'bg-teal-50 border-l-4 border-l-teal-500 hover:bg-teal-100/50'
                        : darkMode
                        ? 'hover:bg-slate-800/50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Rang */}
                    <td className="py-3 px-3 text-center font-bold">{rankBadge}</td>

                    {/* Wiegschaft Name & Tag */}
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
                          {guild.logo_url && guild.logo_url.startsWith('http') ? (
                            <img src={guild.logo_url} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <span>{guild.logo_url || '🏰'}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-black text-sm truncate">{guild.name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-black bg-gray-500/15">
                              [{guild.tag}]
                            </span>
                            {isUserGuild && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-teal-500 text-white">
                                Deine Wiegschaft
                              </span>
                            )}
                          </div>
                          {guild.captain && (
                            <div className="text-[10px] opacity-60 truncate mt-0.5">
                              Kapitän: {guild.captain.username}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Mitgliederanzahl */}
                    <td className="py-3 px-3 text-center font-bold font-mono">
                      <span className="px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5">
                        {guild.memberCount}
                      </span>
                    </td>

                    {/* Runden */}
                    <td className="py-3 px-3 text-center font-semibold font-mono">
                      {guild.gamesCount}
                    </td>

                    {/* Avg Abstand */}
                    <td className="py-3 px-3 text-right font-black font-mono text-teal-600 dark:text-teal-400">
                      {guild.avg !== undefined ? `${guild.avg.toFixed(2)}g` : '-'}
                    </td>

                    {/* Schnäpse */}
                    <td className="py-3 px-3 text-right font-black font-mono text-amber-500">
                      {guild.totalSchnaepse}
                    </td>

                    {/* Total */}
                    <td className="py-3 px-3 text-right font-black font-mono text-sm" style={{ color: BRAND_COLOR }}>
                      {guild.total !== undefined ? guild.total.toFixed(2) : '-'}
                    </td>

                    {/* Details Button */}
                    <td className="py-3 px-3 text-center">
                      <button
                        id={`btn-guild-details-${guild.id}`}
                        onClick={() => setSelectedGuild(guild)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-gray-500/20 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                      >
                        Kader
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* DETAIL MODAL: Mitglieder einer Wiegschaft ansehen */}
      {selectedGuild && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className={`p-6 rounded-3xl max-w-lg w-full border shadow-2xl space-y-4 max-h-[85vh] flex flex-col ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-500/15">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/20 flex items-center justify-center text-2xl flex-shrink-0">
                  {selectedGuild.logo_url && selectedGuild.logo_url.startsWith('http') ? (
                    <img src={selectedGuild.logo_url} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <span>{selectedGuild.logo_url || '🏰'}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-black text-base uppercase">{selectedGuild.name}</h4>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/20 text-teal-600 dark:text-teal-400">
                      [{selectedGuild.tag}]
                    </span>
                  </div>
                  {selectedGuild.description && (
                    <p className="text-xs opacity-75 mt-0.5">{selectedGuild.description}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedGuild(null)}
                className="w-8 h-8 rounded-full border border-gray-500/20 flex items-center justify-center text-sm opacity-60 hover:opacity-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5">
                <div className="text-[9px] opacity-60 uppercase font-bold">Runden</div>
                <div className="font-black text-sm">{selectedGuild.gamesCount}</div>
              </div>
              <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5">
                <div className="text-[9px] opacity-60 uppercase font-bold">Ø-Abstand</div>
                <div className="font-black text-sm text-teal-600 dark:text-teal-400">{selectedGuild.avg.toFixed(2)}g</div>
              </div>
              <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5">
                <div className="text-[9px] opacity-60 uppercase font-bold">Schnäpse</div>
                <div className="font-black text-sm text-amber-500">{selectedGuild.totalSchnaepse}</div>
              </div>
              <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5">
                <div className="text-[9px] opacity-60 uppercase font-bold">Total</div>
                <div className="font-black text-sm" style={{ color: BRAND_COLOR }}>{selectedGuild.total.toFixed(2)}</div>
              </div>
            </div>

            {/* Kader Mitgliederliste */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <h5 className="font-black text-xs uppercase tracking-wider opacity-60 flex items-center space-x-1.5 pt-2">
                <i className="fas fa-users text-[#238183]"></i>
                <span>Mitglieder ({selectedGuild.members?.length || selectedGuild.memberCount})</span>
              </h5>

              {selectedGuild.members && selectedGuild.members.length > 0 ? (
                selectedGuild.members.map(m => (
                  <div
                    key={m.id || m.user_id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <PlayerAvatar url={m.avatar_url} name={m.username} className="w-8 h-8 rounded-lg" />
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <PlayerNameTag name={m.username} colorKey={m.name_bg_color || 'none'} className="text-xs font-bold px-2 py-0.5" />
                          <PlayerLevelBadge level={m.level || 1} size="xs" />
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        m.role === 'captain'
                          ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                          : m.role === 'vize_captain'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-gray-500/10 opacity-70'
                      }`}
                    >
                      {m.role === 'captain' ? '👑 Kapitän' : m.role === 'vize_captain' ? '⚔️ Vize' : 'Mitglied'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 opacity-50 text-xs">Keine Mitgliederdetails verfügbar</div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedGuild(null)}
                className="w-full py-2.5 rounded-xl text-xs font-bold border border-gray-500/20 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuildsLeaderboardView;
