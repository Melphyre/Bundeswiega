import React, { useState, useEffect, useMemo } from 'react';
import { BRAND_COLOR } from '../constants';
import { PlayerAvatar } from './PlayerAvatar';
import { PlayerNameTag } from './PlayerNameTag';
import { PlayerLevelBadge } from './PlayerLevelBadge';
import { PlayerTitleBadge } from './PlayerTitleBadge';
import { supabase } from '../supabaseClient';
import {
  calculateGuildLevelAndXP,
  getGuildCosmetics,
  GuildCosmetics,
  GuildLevelInfo
} from '../utils/guildLevel';
import { GuildLevelRewardsModal } from './GuildLevelRewardsModal';

export interface GuildLeaderboardEntry {
  id: string;
  name: string;
  tag: string;
  description: string;
  logo_url: string;
  captain_id: string;
  created_at: string;
  memberCount: number;
  isVirtual?: boolean;
  level?: number;
  xp?: number;
  rawXP?: number;
  currentLevelProgressXP?: number;
  xpNeededForNextLevel?: number;
  progressPercent?: number;
  cosmetics?: GuildCosmetics;
  captain?: {
    username: string;
    avatar_url: string;
  };
  members?: Array<{
    id: string;
    user_id: string | null;
    role: string;
    username: string;
    avatar_url?: string;
    title?: string;
    level?: number;
    xp?: number;
    name_bg_color?: string;
    name_glow?: string;
    isGuest?: boolean;
  }>;
  gamesCount: number;
  avg: number;
  schnaepse?: number;
  totalSchnaepse?: number;
  avgSchnaepse?: number;
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
  // Bei total und avg immer von klein nach groß (asc), da kleiner = besser!
  const [sortBy, setSortBy] = useState<SortField>('total');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedGuild, setSelectedGuild] = useState<GuildLeaderboardEntry | null>(null);
  const [modalMembersLoading, setModalMembersLoading] = useState(false);
  const [userGuildId, setUserGuildId] = useState<string | null>(null);
  const [rewardsModalGuild, setRewardsModalGuild] = useState<GuildLeaderboardEntry | null>(null);

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
      console.warn('API /api/guilds/leaderboard fehlgeschlagen, starte Supabase-Fallback:', e);
      // Supabase Direct Fallback
      try {
        const [guildsRes, membersRes, gamesRes, profilesRes] = await Promise.all([
          supabase.from('guilds').select('*'),
          supabase.from('guild_members').select('id, guild_id, user_id, role, joined_at'),
          supabase.from('game_results').select('user_id, player_name, game_mode, avg, schnaepse, total, is_guest'),
          supabase.from('profiles').select('id, username, display_name, avatar_url, selected_title, active_title, title, xp, level, name_bg_color')
        ]);

        const allGuilds = guildsRes?.data || [];
        const allMembers = membersRes?.data || [];
        const allGames = gamesRes?.data || [];
        const allProfiles = profilesRes?.data || [];

        const profileMap = new Map((allProfiles || []).map((p: any) => [String(p.id), p]));

        const standardGames = allGames.filter((g: any) => {
          if (!g?.game_mode) return true;
          const m = String(g.game_mode).toLowerCase();
          if (m.includes('speed') || m.includes('team') || m.includes('0,3') || m.includes('0.3') || m.includes('330')) return false;
          return m.includes('standard') || m.includes('500') || m.includes('einzel') || m === 'normal';
        });

        const gamesByUser: Record<string, any[]> = {};
        standardGames.forEach((g: any) => {
          if (!g?.user_id) return;
          const uid = String(g.user_id);
          if (!gamesByUser[uid]) gamesByUser[uid] = [];
          gamesByUser[uid].push(g);
        });

        const membersByGuild: Record<string, any[]> = {};
        allMembers.forEach((m: any) => {
          if (!m?.guild_id) return;
          if (!membersByGuild[m.guild_id]) membersByGuild[m.guild_id] = [];
          membersByGuild[m.guild_id].push(m);
        });

        const fallbackLb: GuildLeaderboardEntry[] = allGuilds.map((g: any) => {
          const gMembers = membersByGuild[g.id] || [];
          const guildGames: any[] = [];
          gMembers.forEach((m: any) => {
            const uid = String(m.user_id || '');
            const uGames = gamesByUser[uid] || [];
            guildGames.push(...uGames);
          });

          const gamesCount = guildGames.length;
          let avg = 0;
          let schnaepse = 0;
          let sumSchnaepse = 0;
          let total = 0;

          if (gamesCount > 0) {
            const sumAvg = guildGames.reduce((acc, gm) => acc + (Number(gm.avg) || 0), 0);
            sumSchnaepse = guildGames.reduce((acc, gm) => acc + (Number(gm.schnaepse) || 0), 0);
            avg = Math.round((sumAvg / gamesCount) * 100) / 100;
            schnaepse = Math.round((sumSchnaepse / gamesCount) * 100) / 100;
            total = Math.round((avg + schnaepse) * 100) / 100;
          }

          const detailedMembers = gMembers.map((m: any) => {
            const uid = String(m.user_id || '');
            const p = profileMap.get(uid);
            const resolvedName = p?.username || p?.display_name || 'Spieler';
            return {
              id: m.id || `gm_${m.guild_id}_${uid}`,
              user_id: uid,
              role: m.role || 'member',
              username: resolvedName,
              avatar_url: p?.avatar_url || '',
              title: p?.selected_title || p?.active_title || p?.title || '',
              level: p?.level ?? 1,
              xp: p?.xp ?? 0,
              name_bg_color: p?.name_bg_color || 'none',
              name_glow: (p as any)?.name_glow || 'none',
              isGuest: false
            };
          });

          const lvlInfo = calculateGuildLevelAndXP(detailedMembers);

          return {
            id: g.id,
            name: g.name,
            tag: g.tag,
            description: g.description || '',
            logo_url: g.logo_url || '',
            captain_id: g.captain_id || '',
            created_at: g.created_at || '',
            memberCount: gMembers.length,
            gamesCount,
            avg,
            schnaepse,
            avgSchnaepse: schnaepse,
            totalSchnaepse: sumSchnaepse,
            total,
            members: detailedMembers,
            level: lvlInfo.level,
            xp: lvlInfo.xp,
            rawXP: lvlInfo.rawXP,
            currentLevelProgressXP: lvlInfo.currentLevelProgressXP,
            xpNeededForNextLevel: lvlInfo.xpNeededForNextLevel,
            progressPercent: lvlInfo.progressPercent,
            cosmetics: lvlInfo.cosmetics
          };
        });

        setLeaderboard(fallbackLb);
      } catch (fbErr: any) {
        console.error('Supabase Fallback fehlgeschlagen:', fbErr);
        setError(e?.message || 'Tabelle konnte nicht geladen werden.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Exakt wie unter "Profil verwalten / meine Wiegschaft" in WiegschaftenTab.tsx:
  // Automatisches Direkt-Laden und Enrichment der Mitglieder einer Wiegschaft aus Supabase
  useEffect(() => {
    if (!selectedGuild) return;

    let isMounted = true;

    const loadOrEnrichMembers = async () => {
      // 1. Virtuelle Wiegschaft der freien Spieler
      if (selectedGuild.isVirtual) {
        if (!selectedGuild.members || selectedGuild.members.length === 0) return;
        const regUserIds = selectedGuild.members
          .filter(m => !m.isGuest && m.user_id)
          .map(m => String(m.user_id));

        if (regUserIds.length > 0) {
          try {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, username, display_name, avatar_url, selected_title, active_title, title, xp, level, name_bg_color')
              .in('id', regUserIds);

            if (!isMounted || !profiles || profiles.length === 0) return;
            const pMap = new Map(profiles.map(p => [String(p.id), p]));

            setSelectedGuild(prev => {
              if (!prev || prev.id !== selectedGuild.id || !prev.members) return prev;
              const enriched = prev.members.map(m => {
                if (m.isGuest || !m.user_id) return m;
                const p = pMap.get(String(m.user_id));
                if (!p) return m;
                return {
                  ...m,
                  username: p.username || p.display_name || m.username || 'Freier Spieler',
                  avatar_url: p.avatar_url || m.avatar_url || '',
                  title: p.selected_title || p.active_title || p.title || m.title || '',
                  level: p.level ?? m.level ?? 1,
                  name_bg_color: p.name_bg_color || m.name_bg_color || 'none'
                };
              });
              return { ...prev, members: enriched };
            });
          } catch (e) {
            console.warn('Enrichment freie Spieler:', e);
          }
        }
        return;
      }

      // 2. Reguläre Wiegschaften: Mitglieder und Profile wie in WiegschaftenTab.tsx abrufen
      setModalMembersLoading(true);
      try {
        const { data: membersRaw, error: memErr } = await supabase
          .from('guild_members')
          .select('id, guild_id, user_id, role, joined_at')
          .eq('guild_id', selectedGuild.id)
          .order('joined_at', { ascending: true });

        if (memErr) throw memErr;

        if (membersRaw && membersRaw.length > 0) {
          const memberUserIds = membersRaw.map(m => String(m.user_id)).filter(Boolean);
          const { data: profiles, error: profErr } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url, selected_title, active_title, title, xp, level, name_bg_color')
            .in('id', memberUserIds);

          if (profErr) throw profErr;

          const profileMap = new Map((profiles || []).map(p => [String(p.id), p]));

          const enrichedList = membersRaw.map((m: any) => {
            const uid = String(m.user_id || '');
            const p = profileMap.get(uid);
            const resolvedName = p?.username || p?.display_name || 'Spieler';

            return {
              id: m.id || `gm_${m.guild_id}_${uid}`,
              user_id: uid,
              role: m.role || 'member',
              username: resolvedName,
              avatar_url: p?.avatar_url || '',
              title: p?.selected_title || p?.active_title || p?.title || '',
              level: p?.level ?? 1,
              xp: p?.xp ?? 0,
              name_bg_color: p?.name_bg_color || 'none',
              name_glow: (p as any)?.name_glow || 'none',
              isGuest: false
            };
          });

          if (isMounted) {
            setSelectedGuild(prev => {
              if (!prev || prev.id !== selectedGuild.id) return prev;
              return {
                ...prev,
                memberCount: enrichedList.length,
                members: enrichedList
              };
            });
          }
        }
      } catch (err) {
        console.warn('Fehler beim Laden/Enrichment der Wiegschafts-Mitglieder:', err);
      } finally {
        if (isMounted) {
          setModalMembersLoading(false);
        }
      }
    };

    loadOrEnrichMembers();

    return () => {
      isMounted = false;
    };
  }, [selectedGuild?.id]);

  useEffect(() => {
    fetchLeaderboard();
  }, [currentUserId]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      // Bei total & avg immer von klein nach groß (aufsteigend) beginnen:
      // Je kleiner der avg oder der Total, desto besser die Wiegschaft!
      if (field === 'total' || field === 'avg') {
        setSortDir('asc');
      } else {
        setSortDir('desc');
      }
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
          // Bei Abstand: kleiner ist besser. Wiegschaften ohne Spiele nach hinten schieben
          valA = a.gamesCount > 0 ? a.avg : (sortDir === 'asc' ? 999999 : -999999);
          valB = b.gamesCount > 0 ? b.avg : (sortDir === 'asc' ? 999999 : -999999);
          break;
        case 'schnaepse': {
          const schnaepseA = a.avgSchnaepse ?? a.schnaepse ?? (a.gamesCount > 0 && a.totalSchnaepse !== undefined ? a.totalSchnaepse / a.gamesCount : 0);
          const schnaepseB = b.avgSchnaepse ?? b.schnaepse ?? (b.gamesCount > 0 && b.totalSchnaepse !== undefined ? b.totalSchnaepse / b.gamesCount : 0);
          valA = a.gamesCount > 0 ? schnaepseA : 999999;
          valB = b.gamesCount > 0 ? schnaepseB : 999999;
          break;
        }
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
          // Bei Total: kleiner ist besser. Wiegschaften ohne Spiele nach hinten schieben
          valA = a.gamesCount > 0 ? a.total : (sortDir === 'asc' ? 999999 : -999999);
          valB = b.gamesCount > 0 ? b.total : (sortDir === 'asc' ? 999999 : -999999);
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
              Aggregierte Werte aller Mitglieder und Spiele pro Wiegschaft (kleineres Total & Ø-Abstand = besser)
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
              { key: 'total', label: 'Total', hint: 'klein → groß' },
              { key: 'avg', label: 'Ø-Abstand', hint: 'klein → groß' },
              { key: 'schnaepse', label: 'Ø-Schnäpse', hint: 'groß → klein' },
              { key: 'games', label: 'Spiele (500ml)', hint: 'groß → klein' },
              { key: 'members', label: 'Mitglieder', hint: 'groß → klein' }
            ] as const
          ).map(s => {
            const isActive = sortBy === s.key;
            return (
              <button
                key={s.key}
                id={`btn-sort-guild-${s.key}`}
                onClick={() => handleSort(s.key)}
                title={`Sortieren nach ${s.label} (${s.hint})`}
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
                <th className="py-3 px-3 text-center" title="Summe aller Standardspiele (500ml) aller Mitglieder">Spiele (500ml)</th>
                <th
                  className="py-3 px-3 text-right cursor-pointer select-none"
                  onClick={() => handleSort('avg')}
                  title="Ø-Abstand sortieren (Je kleiner, desto besser)"
                >
                  <span className="flex items-center justify-end space-x-1">
                    <span>Ø-Abstand</span>
                    <span className="text-[10px] opacity-75">{sortBy === 'avg' ? (sortDir === 'asc' ? '▲ (klein)' : '▼ (groß)') : '↕'}</span>
                  </span>
                </th>
                <th
                  className="py-3 px-3 text-right cursor-pointer select-none"
                  onClick={() => handleSort('schnaepse')}
                  title="Durchschnittliche Schnapszahl pro Spiel"
                >
                  <span className="flex items-center justify-end space-x-1">
                    <span>Ø-Schnäpse</span>
                    <span className="text-[10px] opacity-75">{sortBy === 'schnaepse' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                  </span>
                </th>
                <th
                  className="py-3 px-3 text-right cursor-pointer select-none font-black"
                  onClick={() => handleSort('total')}
                  title="Total sortieren (Je kleiner, desto besser)"
                >
                  <span className="flex items-center justify-end space-x-1">
                    <span>Total</span>
                    <span className="text-[10px] opacity-75">{sortBy === 'total' ? (sortDir === 'asc' ? '▲ (klein)' : '▼ (groß)') : '↕'}</span>
                  </span>
                </th>
                <th className="py-3 px-3 text-center">Kader</th>
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

                const isVirtual = guild.isVirtual || guild.id === 'free_players';
                const cosmetics = guild.cosmetics || getGuildCosmetics(guild.level || 1);
                const guildLevel = guild.level || 1;

                return (
                  <tr
                    key={guild.id}
                    id={`guild-leaderboard-row-${guild.id}`}
                    className={`border-b border-gray-500/10 transition-colors ${cosmetics.rowClass} ${
                      isVirtual
                        ? darkMode
                          ? 'bg-amber-500/10 border-l-4 border-l-amber-500/70 hover:bg-amber-500/15'
                          : 'bg-amber-50/70 border-l-4 border-l-amber-500 hover:bg-amber-100/60'
                        : isUserGuild
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
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 overflow-hidden ${cosmetics.logoBorder} ${
                          isVirtual
                            ? 'bg-amber-500/20 text-amber-500'
                            : 'bg-teal-500/10'
                        }`}>
                          {guild.logo_url && guild.logo_url.startsWith('http') ? (
                            <img src={guild.logo_url} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <span>{guild.logo_url || (isVirtual ? '🍺' : '🏰')}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="font-black text-sm truncate">{guild.name}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black ${cosmetics.tagClass}`}>
                              [{guild.tag}]
                            </span>
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setRewardsModalGuild(guild);
                              }}
                              title={`Wiegschafts-Level ${guildLevel} - ${cosmetics.guildTitle} (Klicken für Belohnungsübersicht)`}
                              className="px-1.5 py-0.5 rounded text-[10px] font-black bg-black/10 dark:bg-white/10 text-amber-500 border border-amber-500/30 cursor-pointer hover:scale-105 active:scale-95 transition-all flex items-center space-x-1"
                            >
                              <span>Lvl {guildLevel}</span>
                            </span>
                            {isVirtual ? (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                Allgemeiner Vergleich
                              </span>
                            ) : isUserGuild ? (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-teal-500 text-white">
                                Deine Wiegschaft
                              </span>
                            ) : null}
                          </div>
                          {isVirtual ? (
                            <div className="text-[10px] opacity-60 truncate mt-0.5 text-amber-700 dark:text-amber-300">
                              Fiktive Wiegschaft aller Spieler & Gäste ohne Wiegschaft
                            </div>
                          ) : guild.captain ? (
                            <div className="text-[10px] opacity-60 truncate mt-0.5">
                              Kapitän: {guild.captain.username}
                            </div>
                          ) : null}
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

                    {/* Ø-Schnäpse pro Standardspiel 500ml */}
                    <td 
                      className="py-3 px-3 text-right font-black font-mono text-amber-500" 
                      title={guild.totalSchnaepse !== undefined ? `Gesamt: ${guild.totalSchnaepse} Schnäpse in ${guild.gamesCount} Standardspielen (500ml)` : 'Ø-Schnäpse pro Standardspiel (500ml)'}
                    >
                      {(() => {
                        const val = guild.avgSchnaepse ?? guild.schnaepse ?? (guild.gamesCount > 0 && guild.totalSchnaepse !== undefined ? guild.totalSchnaepse / guild.gamesCount : 0);
                        return typeof val === 'number' && !isNaN(val) ? val.toFixed(2) : '0.00';
                      })()}
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

      {/* DETAIL MODAL: Mitglieder einer Wiegschaft ansehen (Kader-Liste) */}
      {selectedGuild && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className={`p-6 rounded-3xl max-w-xl w-full border shadow-2xl space-y-4 max-h-[85vh] flex flex-col ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
            {/* Modal Header */}
            {(() => {
              const selectedLvlInfo: GuildLevelInfo = (selectedGuild.level !== undefined && selectedGuild.cosmetics && selectedGuild.currentLevelProgressXP !== undefined)
                ? {
                    level: selectedGuild.level,
                    xp: selectedGuild.xp || 0,
                    rawXP: selectedGuild.rawXP || 0,
                    currentLevelProgressXP: selectedGuild.currentLevelProgressXP || 0,
                    xpNeededForNextLevel: selectedGuild.xpNeededForNextLevel || 1,
                    progressPercent: selectedGuild.progressPercent || 0,
                    cosmetics: selectedGuild.cosmetics
                  }
                : calculateGuildLevelAndXP(selectedGuild.members || []);

              return (
                <div className="space-y-3 pb-3 border-b border-gray-500/15">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${selectedLvlInfo.cosmetics.logoBorder} ${
                          selectedGuild.isVirtual ? 'bg-amber-500/20 text-amber-500' : 'bg-teal-500/20'
                        }`}
                      >
                        {selectedGuild.logo_url && selectedGuild.logo_url.startsWith('http') ? (
                          <img src={selectedGuild.logo_url} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                          <span>{selectedGuild.logo_url || (selectedGuild.isVirtual ? '🍺' : '🏰')}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 flex-wrap">
                          <h4 className="font-black text-base uppercase">{selectedGuild.name}</h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${selectedLvlInfo.cosmetics.tagClass}`}>
                            [{selectedGuild.tag}]
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-500 border border-amber-500/30">
                            Level {selectedLvlInfo.level}
                          </span>
                          <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                            {selectedLvlInfo.cosmetics.guildTitle}
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

                  {/* Level-Fortschrittsbalken */}
                  <div
                    onClick={() => setRewardsModalGuild(selectedGuild)}
                    className="p-2.5 rounded-xl border border-gray-500/20 bg-black/5 dark:bg-white/5 space-y-1.5 cursor-pointer hover:border-teal-500/40 transition-all group"
                    title="Klicken für Belohnungsübersicht & Meilensteine"
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="flex items-center space-x-1.5">
                        <span className="text-amber-500">🏆 Level {selectedLvlInfo.level}</span>
                        <span className="opacity-50">•</span>
                        <span className="opacity-80">{selectedLvlInfo.cosmetics.guildTitle}</span>
                      </span>
                      <span className="text-teal-500 group-hover:underline text-[10px]">
                        {selectedLvlInfo.level >= 50
                          ? `${selectedLvlInfo.xp.toLocaleString()} XP (Max Level)`
                          : `${selectedLvlInfo.currentLevelProgressXP.toLocaleString()} / ${selectedLvlInfo.xpNeededForNextLevel.toLocaleString()} XP (${selectedLvlInfo.progressPercent}%)`} ➜
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-black/20 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-500 to-amber-400 transition-all duration-500 shadow-xs"
                        style={{ width: `${selectedLvlInfo.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5">
                <div className="text-[9px] opacity-60 uppercase font-bold">Spiele (500ml)</div>
                <div className="font-black text-sm">{selectedGuild.gamesCount}</div>
              </div>
              <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5">
                <div className="text-[9px] opacity-60 uppercase font-bold">Ø-Abstand</div>
                <div className="font-black text-sm text-teal-600 dark:text-teal-400">{selectedGuild.avg.toFixed(2)}g</div>
              </div>
              <div 
                className="p-2 rounded-xl bg-black/5 dark:bg-white/5" 
                title={selectedGuild.totalSchnaepse !== undefined ? `Gesamt: ${selectedGuild.totalSchnaepse} Schnäpse in ${selectedGuild.gamesCount} Standardspielen (500ml)` : 'Ø-Schnäpse pro Standardspiel (500ml)'}
              >
                <div className="text-[9px] opacity-60 uppercase font-bold">Ø-Schnäpse</div>
                <div className="font-black text-sm text-amber-500">
                  {(() => {
                    const val = selectedGuild.avgSchnaepse ?? selectedGuild.schnaepse ?? (selectedGuild.gamesCount > 0 && selectedGuild.totalSchnaepse !== undefined ? selectedGuild.totalSchnaepse / selectedGuild.gamesCount : 0);
                    return typeof val === 'number' && !isNaN(val) ? val.toFixed(2) : '0.00';
                  })()}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5">
                <div className="text-[9px] opacity-60 uppercase font-bold">Total</div>
                <div className="font-black text-sm" style={{ color: BRAND_COLOR }}>{selectedGuild.total.toFixed(2)}</div>
              </div>
            </div>

            {/* Kader Mitgliederliste: Name, Profilbild, Titel, Design und Level für alle Mitglieder */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <div className="flex items-center justify-between pt-2 pb-1">
                <h5 className="font-black text-xs uppercase tracking-wider opacity-60 flex items-center space-x-1.5">
                  <i className="fas fa-users text-[#238183]"></i>
                  <span>Kader & Mitglieder ({selectedGuild.members?.length || selectedGuild.memberCount})</span>
                </h5>
                {modalMembersLoading && (
                  <span className="text-[10px] text-teal-500 font-semibold flex items-center gap-1">
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>Synchronisiere...</span>
                  </span>
                )}
              </div>

              {modalMembersLoading && (!selectedGuild.members || selectedGuild.members.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-6 space-y-2 opacity-60">
                  <i className="fas fa-spinner fa-spin text-teal-500 text-xl"></i>
                  <span className="text-xs">Mitgliederdaten werden geladen...</span>
                </div>
              ) : selectedGuild.members && selectedGuild.members.length > 0 ? (
                selectedGuild.members.map(m => {
                  const isGuest = m.isGuest || !m.user_id;

                  return (
                    <div
                      key={m.id || m.user_id || m.username}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                        isGuest
                          ? darkMode
                            ? 'bg-slate-800/40 border-dashed border-slate-700/60'
                            : 'bg-gray-50/70 border-dashed border-gray-300'
                          : darkMode
                          ? 'bg-slate-800/60 border-slate-700'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      {/* Profilbild, NameTag mit Design, Titel & Level */}
                      <div className="flex items-center space-x-2.5 min-w-0">
                        {isGuest ? (
                          <div className="w-8 h-8 rounded-lg bg-gray-500/20 text-gray-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
                            👤
                          </div>
                        ) : (
                          <PlayerAvatar url={m.avatar_url || ''} name={m.username} className="w-8 h-8 rounded-lg flex-shrink-0" />
                        )}

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                            {/* Name & Design (Farbe / Neon-Glow des Namens) */}
                            <PlayerNameTag
                              name={m.username}
                              colorKey={m.name_bg_color || 'none'}
                              glowKey={m.name_glow || 'none'}
                              className="text-xs font-bold px-2 py-0.5"
                            />

                            {/* Titel */}
                            {m.title && (
                              <PlayerTitleBadge title={m.title} size="sm" />
                            )}

                            {/* Level (immer anzeigen, für Gäste "(Gast)") */}
                            {isGuest ? (
                              <span className="text-[10px] font-bold opacity-50 px-1.5 py-0.2 rounded bg-gray-500/10">
                                (Gast)
                              </span>
                            ) : (
                              <PlayerLevelBadge level={m.level || 1} size="xs" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Rollen-Badge */}
                      <div className="flex-shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase whitespace-nowrap ${
                            isGuest
                              ? 'bg-gray-500/15 text-gray-400 border border-gray-500/20'
                              : selectedGuild.isVirtual
                              ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                              : m.role === 'captain'
                              ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                              : m.role === 'vize_captain'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-gray-500/10 opacity-70'
                          }`}
                        >
                          {isGuest
                            ? '👤 Gast-Spieler'
                            : selectedGuild.isVirtual
                            ? '🍺 Freier Spieler'
                            : m.role === 'captain'
                            ? '👑 Kapitän'
                            : m.role === 'vize_captain'
                            ? '⚔️ Vize'
                            : 'Mitglied'}
                        </span>
                      </div>
                    </div>
                  );
                })
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

      {/* MODAL: Level-Belohnungen & Freischaltungen */}
      {rewardsModalGuild && (
        <GuildLevelRewardsModal
          isOpen={!!rewardsModalGuild}
          onClose={() => setRewardsModalGuild(null)}
          guildName={rewardsModalGuild.name}
          guildTag={rewardsModalGuild.tag}
          guildLogo={rewardsModalGuild.logo_url}
          levelInfo={
            (rewardsModalGuild.level !== undefined && rewardsModalGuild.cosmetics && rewardsModalGuild.currentLevelProgressXP !== undefined)
              ? {
                  level: rewardsModalGuild.level,
                  xp: rewardsModalGuild.xp || 0,
                  rawXP: rewardsModalGuild.rawXP || 0,
                  currentLevelProgressXP: rewardsModalGuild.currentLevelProgressXP || 0,
                  xpNeededForNextLevel: rewardsModalGuild.xpNeededForNextLevel || 1,
                  progressPercent: rewardsModalGuild.progressPercent || 0,
                  cosmetics: rewardsModalGuild.cosmetics
                }
              : calculateGuildLevelAndXP(rewardsModalGuild.members || [])
          }
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

export default GuildsLeaderboardView;
