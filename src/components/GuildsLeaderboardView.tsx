import React, { useState, useEffect, useMemo } from 'react';
import { BRAND_COLOR, FREE_PLAYERS_LOGO_URL } from '../constants';
import { PlayerAvatar } from './PlayerAvatar';
import { PlayerNameTag } from './PlayerNameTag';
import { PlayerLevelBadge } from './PlayerLevelBadge';
import { PlayerTitleBadge } from './PlayerTitleBadge';
import { getRowThemeClass } from '../constants/cosmeticsConfig';
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
  rank?: number;
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
  const [logoPreviewGuild, setLogoPreviewGuild] = useState<GuildLeaderboardEntry | null>(null);
  const [logoModalTab, setLogoModalTab] = useState<'overview' | 'kader'>('overview');
  const [isImageFullscreen, setIsImageFullscreen] = useState(false);

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

        // Freie Spieler fiktive Wiegschaft im Fallback sicherstellen
        try {
          const guildMemberUserIds = new Set(allMembers.map((m: any) => String(m.user_id)).filter(Boolean));
          const freeGames = standardGames.filter((g: any) => !g?.user_id || !guildMemberUserIds.has(String(g.user_id)));
          const freeGamesCount = freeGames.length;
          let freeAvg = 0;
          let freeSchnaepse = 0;
          let freeTotalSchnaepse = 0;
          let freeTotal = 0;
          if (freeGamesCount > 0) {
            const sumAvg = freeGames.reduce((acc, gm) => acc + (Number(gm.avg) || 0), 0);
            freeTotalSchnaepse = freeGames.reduce((acc, gm) => acc + (Number(gm.schnaepse) || 0), 0);
            freeAvg = Math.round((sumAvg / freeGamesCount) * 100) / 100;
            freeSchnaepse = Math.round((freeTotalSchnaepse / freeGamesCount) * 100) / 100;
            freeTotal = Math.round((freeAvg + freeSchnaepse) * 100) / 100;
          }
          const freeUids = new Set<string>();
          freeGames.forEach((g: any) => { if (g?.user_id) freeUids.add(String(g.user_id)); });
          allProfiles.forEach((p: any) => { if (p?.id && !guildMemberUserIds.has(String(p.id))) freeUids.add(String(p.id)); });
          const freeMembersList = Array.from(freeUids).map(uid => {
            const p = profileMap.get(uid);
            return {
              id: `free_${uid}`,
              user_id: uid,
              role: 'member',
              username: p?.username || p?.display_name || 'Freier Spieler',
              avatar_url: p?.avatar_url || '',
              title: p?.selected_title || p?.active_title || p?.title || '',
              level: p?.level ?? 1,
              xp: p?.xp ?? 0,
              name_bg_color: p?.name_bg_color || 'none',
              name_glow: (p as any)?.name_glow || 'none',
              isGuest: false
            };
          });
          fallbackLb.push({
            id: 'free_players',
            name: 'Freie Spieler',
            tag: 'FREI',
            description: 'Fiktive Wiegschaft aller Spieler & Gäste ohne Wiegschaft (zum allgemeinen Vergleich).',
            logo_url: FREE_PLAYERS_LOGO_URL,
            captain_id: '',
            created_at: new Date(0).toISOString(),
            memberCount: Math.max(freeMembersList.length, 1),
            gamesCount: freeGamesCount,
            avg: freeAvg,
            schnaepse: freeSchnaepse,
            avgSchnaepse: freeSchnaepse,
            totalSchnaepse: freeTotalSchnaepse,
            total: freeTotal,
            isVirtual: true,
            members: freeMembersList
          });
        } catch (fbFreeErr) {
          console.warn('Fallback freie Spieler error:', fbFreeErr);
        }

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
    const activeGuild = selectedGuild || logoPreviewGuild;
    if (!activeGuild) return;

    let isMounted = true;

    const loadOrEnrichMembers = async () => {
      // 1. Virtuelle Wiegschaft der freien Spieler
      if (activeGuild.isVirtual) {
        if (!activeGuild.members || activeGuild.members.length === 0) return;
        const regUserIds = activeGuild.members
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
              if (!prev || prev.id !== activeGuild.id || !prev.members) return prev;
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
          .eq('guild_id', activeGuild.id)
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
            const updateState = (prev: GuildLeaderboardEntry | null) => {
              if (!prev || prev.id !== activeGuild.id) return prev;
              return {
                ...prev,
                memberCount: enrichedList.length,
                members: enrichedList
              };
            };
            setSelectedGuild(prev => updateState(prev));
            setLogoPreviewGuild(prev => updateState(prev));
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
  }, [selectedGuild?.id, logoPreviewGuild?.id]);

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

                const isVirtual = guild.isVirtual || guild.id === 'free_players' || guild.name === 'Freie Spieler';
                const cosmetics = isVirtual ? null : (guild.cosmetics || getGuildCosmetics(guild.level || 1));
                const guildLevel = isVirtual ? undefined : (guild.level || 1);
                const guildLogo = isVirtual ? FREE_PLAYERS_LOGO_URL : (guild.logo_url || '🏰');

                return (
                  <tr
                    key={guild.id}
                    id={`guild-leaderboard-row-${guild.id}`}
                    className={`border-b border-gray-500/10 transition-colors ${!isVirtual && cosmetics ? cosmetics.rowClass : ''} ${
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
                        <div
                          id={`guild-logo-container-${guild.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setLogoModalTab('overview');
                            setIsImageFullscreen(false);
                            setLogoPreviewGuild({ ...guild, rank });
                          }}
                          title="Klicken für Großansicht des Profilbilds & Wiegschafts-Details"
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 overflow-hidden cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-md relative group select-none ${
                            isVirtual
                              ? 'border-2 border-amber-500/60 bg-amber-500/10 hover:border-amber-400 hover:ring-2 hover:ring-amber-400/50'
                              : `${cosmetics?.logoBorder || 'border-none'} bg-teal-500/10 hover:ring-2 hover:ring-teal-400/40`
                          }`}
                        >
                          {guildLogo && guildLogo.startsWith('http') ? (
                            <img
                              id={`guild-logo-img-${guild.id}`}
                              src={guildLogo}
                              alt={guild.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-115"
                            />
                          ) : (
                            <span>{guildLogo}</span>
                          )}
                          <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl pointer-events-none">
                            <i className="fas fa-search-plus text-white text-xs"></i>
                          </div>
                        </div>
                        <div 
                          className="min-w-0 cursor-pointer group/name"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLogoModalTab('overview');
                            setIsImageFullscreen(false);
                            setLogoPreviewGuild({ ...guild, rank });
                          }}
                          title="Klicken für Großansicht des Profilbilds & Wiegschafts-Details"
                        >
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="font-black text-sm truncate group-hover/name:text-teal-600 dark:group-hover/name:text-teal-400 transition-colors">
                              {guild.name}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black ${
                              isVirtual
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                : cosmetics?.tagClass || 'tag-default'
                            }`}>
                              [{guild.tag}]
                            </span>
                            <span 
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold border border-gray-500/20 bg-black/5 dark:bg-white/10 group-hover/name:bg-teal-500 group-hover/name:text-white dark:group-hover/name:bg-teal-500 transition-all flex items-center space-x-1"
                              title="Profilbild in groß und Wiegschafts-Details ansehen"
                            >
                              <i className="fas fa-search text-[8px]"></i>
                              <span>Profil</span>
                            </span>
                            {!isVirtual && guildLevel !== undefined && cosmetics && (
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
                            )}
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
                              Fiktive Wiegschaft aller Spieler & Gäste ohne Wiegschaft • Klicken für Details
                            </div>
                          ) : guild.captain ? (
                            <div className="text-[10px] opacity-60 truncate mt-0.5">
                              Kapitän: {guild.captain.username} • Klicken für Details
                            </div>
                          ) : (
                            <div className="text-[10px] opacity-60 truncate mt-0.5">
                              Klicken für Profil & Details
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

                    {/* Details & Kader Buttons */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          id={`btn-guild-preview-${guild.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setLogoModalTab('overview');
                            setIsImageFullscreen(false);
                            setLogoPreviewGuild({ ...guild, rank });
                          }}
                          title="Profilbild in groß & Details ansehen"
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-teal-500/30 bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20 active:scale-95 transition-all cursor-pointer flex items-center space-x-1 shadow-xs"
                        >
                          <i className="fas fa-id-card text-[9px]"></i>
                          <span>Profil</span>
                        </button>
                        <button
                          id={`btn-guild-details-${guild.id}`}
                          onClick={() => setSelectedGuild(guild)}
                          title="Kader und Mitgliederliste anzeigen"
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-gray-500/20 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                        >
                          Kader
                        </button>
                      </div>
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
            {selectedGuild.isVirtual ? (
              <div className="space-y-3 pb-3 border-b border-gray-500/15">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      onClick={() => setLogoPreviewGuild(selectedGuild)}
                      title="Profilbild vergrößern & Details ansehen"
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 border border-amber-500/30 overflow-hidden bg-amber-500/10 cursor-pointer hover:scale-105 active:scale-95 transition-all relative group shadow-sm"
                    >
                      <img src={FREE_PLAYERS_LOGO_URL} alt="Freie Spieler Logo" className="w-full h-full object-cover rounded-2xl transition-transform group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl pointer-events-none">
                        <i className="fas fa-search-plus text-white text-xs"></i>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap">
                        <h4 className="font-black text-base uppercase">{selectedGuild.name}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          [{selectedGuild.tag}]
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          Allgemeiner Vergleich
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          Vergleichsgruppe aller Spieler ohne Wiegschaft
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

                <div className="p-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300 flex items-center space-x-2">
                  <span className="text-base">ℹ️</span>
                  <span>Fiktive Wiegschaft zum statistischen Leistungsvergleich. Besitzt kein Wiegschaften-Level und keine freischaltbaren Belohnungen.</span>
                </div>
              </div>
            ) : (() => {
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
                        onClick={() => setLogoPreviewGuild(selectedGuild)}
                        title="Profilbild vergrößern & Details ansehen"
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${selectedLvlInfo.cosmetics.logoBorder} bg-teal-500/20 cursor-pointer hover:scale-105 active:scale-95 transition-all relative group overflow-hidden shadow-sm`}
                      >
                        {selectedGuild.logo_url && selectedGuild.logo_url.startsWith('http') ? (
                          <img src={selectedGuild.logo_url} alt="Logo" className="w-full h-full object-cover rounded-2xl transition-transform group-hover:scale-110" />
                        ) : (
                          <span>{selectedGuild.logo_url || '🏰'}</span>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl pointer-events-none">
                          <i className="fas fa-search-plus text-white text-xs"></i>
                        </div>
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
                  const rowThemeClass = getRowThemeClass(m.leaderboard_row_theme);

                  return (
                    <div
                      key={m.id || m.user_id || m.username}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${rowThemeClass} ${
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
                          <PlayerAvatar url={m.avatar_url || ''} avatar_frame={m.avatar_frame} name={m.username} className="w-8 h-8 rounded-lg flex-shrink-0" />
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

      {/* MODAL: PROFILBILD-GROSSANSICHT & WIEGSCHAFTS-DETAILS */}
      {logoPreviewGuild && (() => {
        const isVirtual = logoPreviewGuild.isVirtual || logoPreviewGuild.id === 'free_players' || logoPreviewGuild.name === 'Freie Spieler';
        const logoUrl = isVirtual ? FREE_PLAYERS_LOGO_URL : (logoPreviewGuild.logo_url || '🏰');
        const isHttp = logoUrl && logoUrl.startsWith('http');
        const cosmetics = isVirtual ? null : (logoPreviewGuild.cosmetics || getGuildCosmetics(logoPreviewGuild.level || 1));
        const levelInfo = isVirtual ? null : calculateGuildLevelAndXP(logoPreviewGuild.rawXP || logoPreviewGuild.xp || 0);
        const membersList = logoPreviewGuild.members || [];
        const memberCount = logoPreviewGuild.memberCount || membersList.length || 0;

        return (
          <div
            className="fixed inset-0 z-[750] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => {
              if (isImageFullscreen) {
                setIsImageFullscreen(false);
              } else {
                setLogoPreviewGuild(null);
              }
            }}
          >
            {/* FULLSCREEN LIGHTBOX OVERLAY */}
            {isImageFullscreen && isHttp && (
              <div 
                className="fixed inset-0 z-[800] bg-black/95 backdrop-blur-lg flex flex-col items-center justify-center p-4 animate-in zoom-in-95 duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsImageFullscreen(false);
                }}
              >
                <div className="absolute top-4 right-4 flex items-center space-x-3 z-10">
                  <a
                    href={logoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 text-white backdrop-blur-md flex items-center space-x-1.5 transition-all"
                  >
                    <i className="fas fa-external-link-alt text-[11px]"></i>
                    <span>Original öffnen</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsImageFullscreen(false)}
                    className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center text-base cursor-pointer transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="max-w-2xl max-h-[80vh] flex flex-col items-center justify-center space-y-3">
                  <img
                    src={logoUrl}
                    alt={logoPreviewGuild.name}
                    className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl ring-2 ring-white/20"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="text-center text-white/80 text-xs">
                    <span className="font-bold text-white text-sm">{logoPreviewGuild.name}</span>
                    <span className="mx-2 opacity-50">•</span>
                    <span>{isVirtual ? 'Offizielles Logo der Freien Spieler' : 'Offizielles Wiegschafts-Wappen'}</span>
                  </div>
                </div>
              </div>
            )}

            <div
              className={`p-5 sm:p-7 rounded-3xl max-w-xl w-full border shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto flex flex-col ${
                darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Bar mit Tabs */}
              <div className="space-y-3 pb-2 border-b border-gray-500/15">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center text-sm font-black">
                      {isVirtual ? '🍺' : '🏰'}
                    </div>
                    <div>
                      <h3 className="font-black text-sm uppercase tracking-wider flex items-center space-x-1.5">
                        <span>{isVirtual ? 'Profil & Details • Freie Spieler' : 'Wappen & Wiegschafts-Profil'}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-black ${
                          isVirtual
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : cosmetics?.tagClass || 'tag-default'
                        }`}>
                          [{logoPreviewGuild.tag}]
                        </span>
                      </h3>
                      <p className="text-[11px] opacity-60">Großansicht des Wappens und vollständige Leistungsdaten</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLogoPreviewGuild(null)}
                    className="w-8 h-8 rounded-full border border-gray-500/20 flex items-center justify-center text-sm opacity-60 hover:opacity-100 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setLogoModalTab('overview')}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                      logoModalTab === 'overview'
                        ? 'bg-teal-500 text-white shadow-sm'
                        : 'bg-black/5 dark:bg-white/5 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span>🌟</span>
                    <span>Profil & Übersicht</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoModalTab('kader')}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                      logoModalTab === 'kader'
                        ? 'bg-teal-500 text-white shadow-sm'
                        : 'bg-black/5 dark:bg-white/5 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span>👥</span>
                    <span>Kader & Spieler ({memberCount})</span>
                  </button>
                </div>
              </div>

              {/* TAB 1: ÜBERSICHT & PROFIL */}
              {logoModalTab === 'overview' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Großes Profilbild / Wappen */}
                  <div className="flex flex-col items-center justify-center py-2 space-y-2.5">
                    <div className="relative group">
                      <div
                        onClick={() => {
                          if (isHttp) setIsImageFullscreen(true);
                        }}
                        title={isHttp ? 'Klicken für Vollbild-Ansicht' : undefined}
                        className={`w-48 h-48 sm:w-56 sm:h-56 rounded-3xl overflow-hidden flex items-center justify-center shadow-2xl transition-all ${
                          isHttp ? 'cursor-pointer hover:scale-102 hover:shadow-teal-500/20' : ''
                        } ${
                          isVirtual
                            ? 'border-4 border-amber-500/60 bg-amber-500/10 shadow-amber-500/20 ring-4 ring-amber-500/20'
                            : `${cosmetics?.logoBorder || 'border-2 border-teal-500/40'} bg-teal-500/10 shadow-teal-500/20 ring-4 ring-teal-500/10`
                        }`}
                      >
                        {isHttp ? (
                          <img
                            src={logoUrl}
                            alt={logoPreviewGuild.name}
                            className="w-full h-full object-cover rounded-2xl select-none transition-transform duration-300 group-hover:scale-108"
                          />
                        ) : (
                          <span className="text-8xl select-none">{logoUrl}</span>
                        )}

                        {isHttp && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center rounded-3xl text-white space-y-1">
                            <i className="fas fa-search-plus text-2xl"></i>
                            <span className="text-[11px] font-bold">Klick für Vollbild</span>
                          </div>
                        )}
                      </div>

                      {/* Badge über Bild */}
                      <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md bg-black/85 text-white backdrop-blur-sm border border-white/20 whitespace-nowrap flex items-center space-x-1.5">
                        <span>{isVirtual ? '🍺' : '🏰'}</span>
                        <span>{isVirtual ? 'Offizielles Logo • Freie Spieler' : 'Offizielles Wiegschafts-Wappen'}</span>
                      </div>
                    </div>

                    {/* Bild Aktionen */}
                    {isHttp && (
                      <div className="flex items-center space-x-3 pt-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setIsImageFullscreen(true)}
                          className="font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-1 cursor-pointer"
                        >
                          <i className="fas fa-expand text-[10px]"></i>
                          <span>Vollbild anzeigen</span>
                        </button>
                        <span className="opacity-30">•</span>
                        <a
                          href={logoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-1"
                        >
                          <i className="fas fa-external-link-alt text-[10px]"></i>
                          <span>Originalgröße öffnen</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Profil-Info & Name */}
                  <div className="text-center space-y-1.5">
                    <div className="flex items-center justify-center space-x-2 flex-wrap gap-y-1">
                      <h2 className="text-xl sm:text-2xl font-black">{logoPreviewGuild.name}</h2>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-mono font-black ${
                          isVirtual
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : cosmetics?.tagClass || 'tag-default'
                        }`}
                      >
                        [{logoPreviewGuild.tag}]
                      </span>
                    </div>

                    <div className="flex items-center justify-center space-x-2 flex-wrap gap-1 text-[11px]">
                      {isVirtual ? (
                        <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          Fiktive Wiegschaft • Allgemeiner Vergleich
                        </span>
                      ) : (
                        <>
                          <span className="px-2 py-0.5 rounded-full font-black bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                            Level {levelInfo?.level || 1} • {cosmetics?.guildTitle || 'Stammtisch'}
                          </span>
                          {logoPreviewGuild.captain?.username && (
                            <span className="opacity-70">
                              👑 Zunftmeister: <strong>{logoPreviewGuild.captain.username}</strong>
                            </span>
                          )}
                        </>
                      )}
                      {logoPreviewGuild.rank && (
                        <span className="px-2 py-0.5 rounded-full font-black bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                          {logoPreviewGuild.rank === 1 ? '🥇 1. Platz' : logoPreviewGuild.rank === 2 ? '🥈 2. Platz' : logoPreviewGuild.rank === 3 ? '🥉 3. Platz' : `#${logoPreviewGuild.rank} in der Tabelle`}
                        </span>
                      )}
                    </div>

                    <p className="text-xs opacity-75 max-w-md mx-auto pt-1 leading-relaxed">
                      {isVirtual
                        ? 'Die fiktive Wiegschaft der Freien Spieler vereint alle Spielerinnen, Spieler und Gäste, die aktuell keiner festen Wiegschaft angehören. Ihre gewerteten Spiele fließen hier automatisch ein, um freie Spieler direkt mit bestehenden Wiegschaften in der Bundeswiega-Rangliste vergleichbar zu machen.'
                        : logoPreviewGuild.description || 'Keine Beschreibung hinterlegt.'}
                    </p>
                  </div>

                  {/* Statistik-Kacheln (Performance-Dashboard) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                    <div className="p-2.5 rounded-xl border border-gray-500/15 bg-black/5 dark:bg-white/5 space-y-0.5">
                      <span className="text-[10px] uppercase font-bold opacity-60 block">Kader</span>
                      <span className="text-base font-black font-mono">
                        {memberCount}
                      </span>
                      <span className="text-[9px] opacity-50 block">Spieler</span>
                    </div>

                    <div className="p-2.5 rounded-xl border border-gray-500/15 bg-black/5 dark:bg-white/5 space-y-0.5">
                      <span className="text-[10px] uppercase font-bold opacity-60 block">Spiele</span>
                      <span className="text-base font-black font-mono">{logoPreviewGuild.gamesCount || 0}</span>
                      <span className="text-[9px] opacity-50 block">gewertet</span>
                    </div>

                    <div className="p-2.5 rounded-xl border border-gray-500/15 bg-black/5 dark:bg-white/5 space-y-0.5">
                      <span className="text-[10px] uppercase font-bold opacity-60 block">Ø Abweichung</span>
                      <span className="text-base font-black font-mono text-teal-600 dark:text-teal-400">
                        {Number(logoPreviewGuild.avg || 0).toFixed(2)}g
                      </span>
                      <span className="text-[9px] opacity-50 block">pro Spiel</span>
                    </div>

                    <div className="p-2.5 rounded-xl border border-gray-500/15 bg-black/5 dark:bg-white/5 space-y-0.5">
                      <span className="text-[10px] uppercase font-bold opacity-60 block">Gesamt (Total)</span>
                      <span className="text-base font-black font-mono text-amber-500">
                        {Number(logoPreviewGuild.total || 0).toFixed(2)}
                      </span>
                      <span className="text-[9px] opacity-50 block">{logoPreviewGuild.schnaepse || 0} Schnäpse</span>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => setLogoModalTab('kader')}
                      className="flex-1 py-3 px-4 rounded-xl text-white font-black text-xs uppercase tracking-wider shadow cursor-pointer hover:opacity-90 active:scale-95 transition-all flex items-center justify-center space-x-2"
                      style={{ backgroundColor: BRAND_COLOR }}
                    >
                      <i className="fas fa-users"></i>
                      <span>Kader ansehen ({memberCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoPreviewGuild(null)}
                      className="py-3 px-5 rounded-xl text-xs font-bold border border-gray-500/20 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      Schließen
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: KADER & SPIELER */}
              {logoModalTab === 'kader' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs opacity-75">
                    <span>Mitglieder im Kader ({membersList.length})</span>
                    {isVirtual && <span className="text-amber-600 dark:text-amber-400 font-bold">Freie Einzelspieler & Gäste</span>}
                  </div>

                  {modalMembersLoading ? (
                    <div className="py-8 flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs opacity-60">Lade Kader-Mitglieder...</span>
                    </div>
                  ) : membersList.length === 0 ? (
                    <div className="p-6 text-center text-xs opacity-60 border border-gray-500/15 rounded-2xl">
                      Keine Spieler im Kader hinterlegt.
                    </div>
                  ) : (
                    <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
                      {membersList.map((m, idx) => {
                        const isCaptain = m.role === 'captain' || m.role === 'leader';
                        const isGuest = m.isGuest || !m.user_id;

                        return (
                          <div
                            key={m.id || idx}
                            className={`p-2.5 rounded-2xl border flex items-center justify-between space-x-3 transition-colors ${
                              darkMode ? 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800' : 'bg-gray-50 border-gray-200 hover:bg-gray-100/70'
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <PlayerAvatar
                                name={m.username}
                                avatarUrl={m.avatar_url}
                                size="md"
                                className="w-10 h-10 flex-shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center space-x-1.5 flex-wrap">
                                  <PlayerNameTag
                                    name={m.username}
                                    color={m.name_bg_color || 'none'}
                                    glow={m.name_glow || 'none'}
                                    className="font-bold text-xs"
                                  />
                                  {isCaptain && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                      👑 Zunftmeister
                                    </span>
                                  )}
                                  {isGuest && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-500/20 text-gray-600 dark:text-gray-400 border border-gray-500/30">
                                      Gast
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-1.5 mt-0.5 text-[10px] opacity-70">
                                  {m.title && <PlayerTitleBadge title={m.title} className="text-[9px]" />}
                                  {m.level !== undefined && (
                                    <PlayerLevelBadge level={m.level} size="sm" showIcon={false} />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="pt-2 flex justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setLogoModalTab('overview')}
                      className="py-2.5 px-4 rounded-xl text-xs font-bold border border-gray-500/20 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors flex items-center space-x-1.5"
                    >
                      <i className="fas fa-arrow-left text-[10px]"></i>
                      <span>Zurück zum Profil</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoPreviewGuild(null)}
                      className="py-2.5 px-4 rounded-xl text-xs font-bold border border-gray-500/20 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      Schließen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default GuildsLeaderboardView;
