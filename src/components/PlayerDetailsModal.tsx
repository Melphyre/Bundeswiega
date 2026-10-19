import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { matchesGameMode, normalizeGameMode, parseRecords } from '../constants';
import { calculateLevelFromXp } from '../utils/levelSystem';
import { PlayerAvatar } from './PlayerAvatar';
import { PlayerNameTag } from './PlayerNameTag';
import { PlayerLevelBadge } from './PlayerLevelBadge';
import PlayerTitleBadge from './PlayerTitleBadge';
import { Friend, ParsedRecord } from '../../types';
import { MASTER_ACHIEVEMENTS_DEFINITIONS } from '../achievementsData';

export type GameModeContextTab = 'Standard' | 'Standardspiel' | 'Speedwiegen' | 'Teamwiegen';

export interface PlayerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string | null;
  activeTab?: GameModeContextTab;
  initialSubTab?: 'overview' | 'history' | 'achievements';
  darkMode: boolean;
  recordsData: any[][] | null;
  supabaseUser?: any;
  friends?: Friend[];
  clerkUsers?: any[];
  playerGuildInfo?: { name: string; tag: string; logoUrl?: string; role?: string } | null;
  getPlayerAvatarUrl: (name: string) => string;
  getPlayerAvatarFrame: (name: string) => string | undefined;
  getPlayerTitle: (name: string) => string | undefined;
  getPlayerNameBgColor: (name: string) => string | undefined;
  getPlayerLevel: (name: string) => number;
  isPlayerGuest: (name: string) => boolean;
  getPlayerXp: (name: string) => number;
  onSelectPlayer?: (name: string) => void;
}

export interface TeamMemberStat {
  name: string;
  userId?: string;
  avatarUrl?: string;
  avatarFrame?: string;
  level?: number;
  title?: string;
  nameBgColor?: string;
  gamesCount: number;
  avgAbstand: number;
  avgSchnaepse: number;
  avgTotal: number;
  bestAbstand: number;
}

export const PlayerDetailsModal: React.FC<PlayerDetailsModalProps> = ({
  isOpen,
  onClose,
  playerName,
  activeTab = 'Standard',
  initialSubTab = 'overview',
  darkMode,
  recordsData,
  supabaseUser,
  friends = [],
  clerkUsers = [],
  playerGuildInfo,
  getPlayerAvatarUrl,
  getPlayerAvatarFrame,
  getPlayerTitle,
  getPlayerNameBgColor,
  getPlayerLevel,
  isPlayerGuest,
  getPlayerXp,
  onSelectPlayer
}) => {
  // Normalize initial mode
  const normalizedInitialMode = useMemo<'Standard' | 'Speedwiegen' | 'Teamwiegen'>(() => {
    if (activeTab === 'Speedwiegen') return 'Speedwiegen';
    if (activeTab === 'Teamwiegen') return 'Teamwiegen';
    return 'Standard';
  }, [activeTab]);

  const [currentModeTab, setCurrentModeTab] = useState<'Standard' | 'Speedwiegen' | 'Teamwiegen'>(normalizedInitialMode);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'history' | 'achievements'>(initialSubTab || 'overview');
  const [isFullscreenAvatar, setIsFullscreenAvatar] = useState(false);

  // Teamwiegen team members state
  const [teamMembers, setTeamMembers] = useState<TeamMemberStat[]>([]);
  const [teamMembersLoading, setTeamMembersLoading] = useState(false);
  const [teamGamesCount, setTeamGamesCount] = useState(0);

  // Sync mode and subtab whenever activeTab, playerName, or initialSubTab changes
  useEffect(() => {
    setCurrentModeTab(normalizedInitialMode);
    setActiveSubTab(initialSubTab || 'overview');
  }, [normalizedInitialMode, playerName, initialSubTab]);

  // DB Achievements state & filters
  const [dbAchievements, setDbAchievements] = useState<any[]>([]);
  const [selectedAchRarity, setSelectedAchRarity] = useState<string>('all');
  const [achSearchQuery, setAchSearchQuery] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !playerName) {
      setDbAchievements([]);
      return;
    }
    let isMounted = true;
    async function loadDbAchievements() {
      try {
        const { data, error } = await supabase
          .from('achievements')
          .select('id, achievement_id, title, description, icon, rarity, game_mode, date, created_at, player_name')
          .ilike('player_name', playerName?.trim() || '');
        if (!error && data && isMounted) {
          setDbAchievements(data);
        }
      } catch (err) {
        console.warn('Could not load player db achievements:', err);
      }
    }
    loadDbAchievements();
    return () => { isMounted = false; };
  }, [isOpen, playerName]);

  // All parsed records from cache
  const allParsed = useMemo(() => {
    return parseRecords(recordsData || []);
  }, [recordsData]);

  // Filter matches for this player/team name
  const playerMatches = useMemo(() => {
    if (!playerName) return [];
    const target = playerName.trim().toLowerCase();
    return allParsed.filter(r => r.playerName?.trim().toLowerCase() === target);
  }, [allParsed, playerName]);

  // Aggregierte Achievements für diesen Spieler
  const playerAchievementsList = useMemo(() => {
    if (!playerName) return [];
    const target = playerName.trim().toLowerCase();
    const map: Record<string, {
      id: string;
      title: string;
      description: string;
      icon: string;
      rarity: string;
      count: number;
      dates: string[];
      modes: Set<string>;
    }> = {};

    const registerAch = (rawId: string, rawTitle: string, rawDesc: string, rawIcon: string, rawRarity: string, dateStr: string, modeStr?: string) => {
      const def = MASTER_ACHIEVEMENTS_DEFINITIONS.find(d => d.id === rawId || d.title.toLowerCase() === (rawTitle || '').toLowerCase());
      const achId = def?.id || rawId || rawTitle;
      const title = def?.title || rawTitle || achId;
      const description = def?.description || rawDesc || '';
      const icon = def?.icon || rawIcon || '🏆';
      const rarity = def?.rarity || rawRarity || 'common';

      if (!map[achId]) {
        map[achId] = {
          id: achId,
          title,
          description,
          icon,
          rarity,
          count: 0,
          dates: [],
          modes: new Set<string>()
        };
      }
      map[achId].count++;
      if (dateStr && !map[achId].dates.includes(dateStr)) {
        map[achId].dates.push(dateStr);
      }
      if (modeStr) {
        map[achId].modes.add(modeStr);
      }
    };

    // 1. Aus den archivierten Spielaufzeichnungen (allParsed)
    allParsed.forEach(rec => {
      const isPlayerRecord = rec.playerName?.trim().toLowerCase() === target ||
        (rec.game_mode?.includes('Teamwiegen') && rec.playerName?.toLowerCase().includes(target));

      if (rec.achievements && Array.isArray(rec.achievements)) {
        rec.achievements.forEach((ach: any) => {
          const isEarnedByPlayer = !ach.earnedBy || !Array.isArray(ach.earnedBy) || ach.earnedBy.length === 0 ||
            ach.earnedBy.some((p: string) => p.trim().toLowerCase() === target) ||
            (isPlayerRecord && ach.earnedBy.includes(rec.playerName));

          if (isPlayerRecord && isEarnedByPlayer) {
            registerAch(ach.id, ach.title, ach.description, ach.icon, ach.rarity, rec.date, rec.game_mode);
          }
        });
      }
    });

    // 2. Aus der SQL-Datenbank (dbAchievements)
    dbAchievements.forEach(dba => {
      registerAch(
        dba.achievement_id || dba.id,
        dba.title,
        dba.description,
        dba.icon,
        dba.rarity,
        dba.date || (dba.created_at ? new Date(dba.created_at).toLocaleDateString('de-DE') : ''),
        dba.game_mode
      );
    });

    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [allParsed, playerName, dbAchievements]);

  // Speed-Helper für Stufennormierung
  const getSpeedNormalized = (item: any) => {
    const levels = (item.levels !== undefined && item.levels !== null && !isNaN(Number(item.levels)) && Number(item.levels) > 0)
      ? Number(item.levels)
      : 1;
    const timeSec = Number(item.time_seconds ?? item.time ?? item.Time ?? 0);
    const avgVal = Number(item.avg) || 0;
    const totalRaw = item.total !== undefined && item.total !== null && !isNaN(Number(item.total))
      ? Number(item.total)
      : undefined;

    let gesamtabstand: number;
    if (totalRaw !== undefined && totalRaw > 0) {
      if (timeSec > 0 && Math.abs(totalRaw - (avgVal + timeSec)) < 0.1) {
        gesamtabstand = avgVal > 0 ? avgVal : Math.max(0, totalRaw - timeSec);
      } else {
        gesamtabstand = totalRaw;
      }
    } else {
      gesamtabstand = avgVal;
    }

    const avgDist = gesamtabstand / levels;
    const avgTime = timeSec / levels;
    const score = Math.round((avgDist + avgTime) * 100) / 100;

    return { levels, gesamtabstand, timeSec, avgDist, avgTime, score };
  };

  // 1. STANDARD-MODUS STATISTIKEN
  const standardStats = useMemo(() => {
    const matches = playerMatches.filter(r => matchesGameMode(r.game_mode || r.gameMode, 'Standardspiel'));
    const gamesCount = matches.length;
    if (gamesCount === 0) {
      return { gamesCount: 0, avg: 0, avgSchnaepse: 0, total: 0, bestAvg: 0, totalSchnaepse: 0 };
    }

    const sumAvg = matches.reduce((sum, g) => sum + Number(g.avg || 0), 0);
    const avg = sumAvg / gamesCount;

    const totalSchnaepse = matches.reduce((sum, g) => sum + Number(g.schnaepse || 0), 0);
    const avgSchnaepse = totalSchnaepse / gamesCount;

    const sumTotal = matches.reduce((sum, g) => {
      const gTot = (g.total !== undefined && g.total !== null && !isNaN(Number(g.total)) && Number(g.total) > 0)
        ? Number(g.total)
        : (Number(g.avg || 0) + Number(g.schnaepse || 0));
      return sum + gTot;
    }, 0);
    const total = sumTotal / gamesCount;
    const bestAvg = Math.min(...matches.map(g => Number(g.avg || 0)));

    return {
      gamesCount,
      avg: Number(avg.toFixed(2)),
      avgSchnaepse: Number(avgSchnaepse.toFixed(2)),
      total: Number(total.toFixed(2)),
      bestAvg: Number(bestAvg.toFixed(2)),
      totalSchnaepse
    };
  }, [playerMatches]);

  // 2. SPEEDWIEGEN STATISTIKEN
  const speedStats = useMemo(() => {
    const matches = playerMatches.filter(r => matchesGameMode(r.game_mode || r.gameMode, 'Speedwiegen'));
    const gamesCount = matches.length;
    if (gamesCount === 0) {
      return { gamesCount: 0, avgDistancePerLevel: 0, avgTimeSec: 0, avgTimePerLevel: 0, bestScore: 0, fastestTime: 0 };
    }

    const normList = matches.map(getSpeedNormalized);
    const sumDistPerLevel = normList.reduce((sum, n) => sum + n.avgDist, 0);
    const avgDistancePerLevel = sumDistPerLevel / gamesCount;

    const sumTimeSec = normList.reduce((sum, n) => sum + n.timeSec, 0);
    const avgTimeSec = sumTimeSec / gamesCount;

    const sumTimePerLevel = normList.reduce((sum, n) => sum + n.avgTime, 0);
    const avgTimePerLevel = sumTimePerLevel / gamesCount;

    const bestScore = Math.min(...normList.map(n => n.score));
    const fastestTime = Math.min(...normList.map(n => n.timeSec));

    return {
      gamesCount,
      avgDistancePerLevel: Number(avgDistancePerLevel.toFixed(2)),
      avgTimeSec: Number(avgTimeSec.toFixed(1)),
      avgTimePerLevel: Number(avgTimePerLevel.toFixed(1)),
      bestScore: Number(bestScore.toFixed(1)),
      fastestTime: Number(fastestTime.toFixed(1))
    };
  }, [playerMatches]);

  // 3. TEAMWIEGEN DATEN ABFRAGEN & AGGREGIEREN
  useEffect(() => {
    if (!isOpen || !playerName || currentModeTab !== 'Teamwiegen') return;

    let isMounted = true;
    const fetchTeamwiegenMembers = async () => {
      setTeamMembersLoading(true);
      try {
        const targetClean = playerName.trim().toLowerCase();

        // 1. Suche in game_results nach Spielen im Teamwiegen
        const { data: teamGames, error: tgErr } = await supabase
          .from('game_results')
          .select('id, user_id, player_name, team_name, game_mode, avg, schnaepse, total, date, created_at')
          .ilike('game_mode', '%team%');

        if (tgErr) {
          console.warn('Teamwiegen game_results query warning:', tgErr.message);
        }

        // 2. Suche in teamwiegen_players
        const { data: tpAll } = await supabase
          .from('teamwiegen_players')
          .select('game_id, user_id');

        // 3. Profiles für Username- und Avatar-Lookup
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, avatar_frame, level, title, name_bg_color');

        const profileById: Record<string, any> = {};
        const profileByName: Record<string, any> = {};
        (profiles || []).forEach(p => {
          if (p.id) profileById[p.id] = p;
          if (p.username) profileByName[p.username.trim().toLowerCase()] = p;
        });

        // Alle Team-Spiele für dieses Team bzw. diesen Spieler
        const gamesForTeam = (teamGames || []).filter(g => {
          const tName = (g.team_name || '').trim().toLowerCase();
          const pName = (g.player_name || '').trim().toLowerCase();
          return tName === targetClean || pName === targetClean;
        });

        if (isMounted) {
          setTeamGamesCount(gamesForTeam.length);
        }

        const gameIds = new Set(gamesForTeam.map(g => g.id).filter(Boolean));

        // Alle verknüpften User-IDs
        const linkedUserIds = new Set<string>();
        (tpAll || []).forEach(tp => {
          if (gameIds.has(tp.game_id) && tp.user_id) {
            linkedUserIds.add(tp.user_id);
          }
        });

        // Aggregation per Spieler
        const playerMap: Record<string, {
          name: string;
          userId?: string;
          avatarUrl?: string;
          avatarFrame?: string;
          level?: number;
          title?: string;
          nameBgColor?: string;
          games: Array<{ avg: number; schnaepse: number; total: number; date: string }>;
        }> = {};

        // A) Aus den game_results Datensätzen
        gamesForTeam.forEach(g => {
          const prof = g.user_id ? profileById[g.user_id] : (g.player_name ? profileByName[g.player_name.trim().toLowerCase()] : null);
          const pName = prof?.username || g.player_name || 'Teamspieler';
          const key = pName.trim().toLowerCase();

          if (!playerMap[key]) {
            playerMap[key] = {
              name: pName,
              userId: g.user_id,
              avatarUrl: prof?.avatar_url || getPlayerAvatarUrl(pName),
              avatarFrame: prof?.avatar_frame || getPlayerAvatarFrame(pName),
              level: prof?.level || getPlayerLevel(pName),
              title: prof?.title || getPlayerTitle(pName),
              nameBgColor: prof?.name_bg_color || getPlayerNameBgColor(pName),
              games: []
            };
          }

          playerMap[key].games.push({
            avg: Number(g.avg || 0),
            schnaepse: Number(g.schnaepse || 0),
            total: Number(g.total || (Number(g.avg || 0) + Number(g.schnaepse || 0))),
            date: g.date || ''
          });
        });

        // B) Aus teamwiegen_players Verknüpfungen
        linkedUserIds.forEach(uid => {
          const prof = profileById[uid];
          if (prof) {
            const key = prof.username.trim().toLowerCase();
            if (!playerMap[key]) {
              const userGames = (teamGames || []).filter(g => g.user_id === uid);
              playerMap[key] = {
                name: prof.username,
                userId: uid,
                avatarUrl: prof.avatar_url || getPlayerAvatarUrl(prof.username),
                avatarFrame: prof.avatar_frame || getPlayerAvatarFrame(prof.username),
                level: prof.level || getPlayerLevel(prof.username),
                title: prof.title || getPlayerTitle(prof.username),
                nameBgColor: prof.name_bg_color || getPlayerNameBgColor(prof.username),
                games: userGames.map(g => ({
                  avg: Number(g.avg || 0),
                  schnaepse: Number(g.schnaepse || 0),
                  total: Number(g.total || 0),
                  date: g.date || ''
                }))
              };
            }
          }
        });

        // C) Auch Spiele aus allParsed (Google Sheets) berücksichtigen falls vorhanden
        const sheetGames = allParsed.filter(r => {
          if (!matchesGameMode(r.game_mode || r.gameMode, 'Teamwiegen')) return false;
          const pName = (r.playerName || '').trim().toLowerCase();
          const tName = ((r as any).team_name || '').trim().toLowerCase();
          return pName === targetClean || tName === targetClean || pName.includes(targetClean) || tName.includes(targetClean);
        });

        if (sheetGames.length > 0) {
          if (isMounted) {
            setTeamGamesCount(prev => Math.max(prev, gamesForTeam.length + sheetGames.length));
          }

          sheetGames.forEach(g => {
            const rawName = g.playerName || 'Teamspieler';
            // Prüfen ob mehrere Spielernamen kommagetrennt oder mit & / + angegeben sind
            const candidateNames = (rawName.includes(',') || rawName.includes('&') || rawName.includes('+'))
              ? rawName.split(/[,&+]/).map(s => s.trim()).filter(Boolean)
              : [rawName];

            candidateNames.forEach(pName => {
              const prof = profileByName[pName.trim().toLowerCase()];
              const key = pName.trim().toLowerCase();
              if (!playerMap[key]) {
                playerMap[key] = {
                  name: prof?.username || pName,
                  avatarUrl: prof?.avatar_url || getPlayerAvatarUrl(pName),
                  avatarFrame: prof?.avatar_frame || getPlayerAvatarFrame(pName),
                  level: prof?.level || getPlayerLevel(pName),
                  title: prof?.title || getPlayerTitle(pName),
                  nameBgColor: prof?.name_bg_color || getPlayerNameBgColor(pName),
                  games: []
                };
              }

              playerMap[key].games.push({
                avg: Number(g.avg || 0),
                schnaepse: Number(g.schnaepse || 0),
                total: Number(g.total || (Number(g.avg || 0) + Number(g.schnaepse || 0))),
                date: g.date || ''
              });
            });
          });
        }

        // Aggregierte Werte berechnen
        const memberList: TeamMemberStat[] = Object.values(playerMap).map(p => {
          const count = p.games.length;
          const avgAbstand = count > 0 ? (p.games.reduce((sum, g) => sum + g.avg, 0) / count) : 0;
          const avgSchnaepse = count > 0 ? (p.games.reduce((sum, g) => sum + g.schnaepse, 0) / count) : 0;
          const avgTotal = count > 0 ? (p.games.reduce((sum, g) => sum + g.total, 0) / count) : 0;
          const bestAbstand = count > 0 ? Math.min(...p.games.map(g => g.avg)) : 0;

          return {
            name: p.name,
            userId: p.userId,
            avatarUrl: p.avatarUrl,
            avatarFrame: p.avatarFrame,
            level: p.level,
            title: p.title,
            nameBgColor: p.nameBgColor,
            gamesCount: count,
            avgAbstand: Number(avgAbstand.toFixed(2)),
            avgSchnaepse: Number(avgSchnaepse.toFixed(1)),
            avgTotal: Number(avgTotal.toFixed(2)),
            bestAbstand: Number(bestAbstand.toFixed(2))
          };
        }).sort((a, b) => a.avgAbstand - b.avgAbstand);

        if (isMounted) {
          setTeamMembers(memberList);
        }
      } catch (err) {
        console.warn('fetchTeamwiegenMembers error:', err);
      } finally {
        if (isMounted) {
          setTeamMembersLoading(false);
        }
      }
    };

    fetchTeamwiegenMembers();

    return () => {
      isMounted = false;
    };
  }, [isOpen, playerName, currentModeTab, allParsed, getPlayerAvatarUrl, getPlayerAvatarFrame, getPlayerLevel, getPlayerTitle, getPlayerNameBgColor]);

  // Gefilterte Spiel-Historie
  const historyList = useMemo(() => {
    let list = [...playerMatches];
    if (currentModeTab === 'Standard') {
      list = list.filter(r => matchesGameMode(r.game_mode || r.gameMode, 'Standardspiel'));
    } else if (currentModeTab === 'Speedwiegen') {
      list = list.filter(r => matchesGameMode(r.game_mode || r.gameMode, 'Speedwiegen'));
    } else if (currentModeTab === 'Teamwiegen') {
      list = list.filter(r => matchesGameMode(r.game_mode || r.gameMode, 'Teamwiegen'));
    }

    return list.sort((a, b) => {
      const dateA = a.date ? new Date(a.date.split('.').reverse().join('-')).getTime() : 0;
      const dateB = b.date ? new Date(b.date.split('.').reverse().join('-')).getTime() : 0;
      return dateB - dateA;
    });
  }, [playerMatches, currentModeTab]);

  if (!isOpen || !playerName) return null;

  const playerXp = getPlayerXp(playerName);
  const lvlInfo = calculateLevelFromXp(playerXp);
  const isGuest = isPlayerGuest(playerName);
  const avatarUrl = getPlayerAvatarUrl(playerName);
  const isFriend = friends.some(
    f => f.name?.trim().toLowerCase() === playerName.trim().toLowerCase() || f.id === playerName
  );

  return (
    <>
      {/* Fullscreen Lightbox für Avatar */}
      {isFullscreenAvatar && (
        <div
          className="fixed inset-0 z-[950] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200"
          onClick={() => setIsFullscreenAvatar(false)}
        >
          <div className="absolute top-4 right-4 flex items-center space-x-2 z-10">
            {avatarUrl && avatarUrl.startsWith('http') && (
              <a
                href={avatarUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/30 text-white text-xs font-bold transition-all flex items-center space-x-1.5 backdrop-blur-md"
              >
                <span>Original öffnen</span>
                <i className="fas fa-external-link-alt text-[10px]"></i>
              </a>
            )}
            <button
              type="button"
              onClick={() => setIsFullscreenAvatar(false)}
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center text-lg cursor-pointer transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="max-w-md max-h-[85vh] flex flex-col items-center justify-center space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="relative p-2.5 rounded-3xl bg-gradient-to-tr from-amber-500/30 to-yellow-500/10 border-2 border-amber-500/40 shadow-2xl">
              <img
                src={avatarUrl}
                alt={playerName}
                className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl"
              />
            </div>
            <div className="text-center text-white/90 text-xs">
              <span className="font-black text-white text-base">{playerName}</span>
              <span className="mx-2 opacity-50">•</span>
              <span>Offizielles Profilbild</span>
            </div>
          </div>
        </div>
      )}

      {/* Haupt-Modal */}
      <div className="fixed inset-0 z-[850] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <div className={`rounded-3xl p-5 sm:p-7 max-w-xl w-full border shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto flex flex-col ${
          darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-500/15 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center text-base font-black">
                {currentModeTab === 'Standard' ? '🍺' : currentModeTab === 'Speedwiegen' ? '⚡' : '🏆'}
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider flex items-center space-x-2">
                  <span>Spieler-Profil & Details</span>
                </h3>
                <p className="text-[11px] opacity-60">
                  Kontext: <span className="font-bold text-amber-500">{currentModeTab === 'Standard' ? 'Standardspiel' : currentModeTab}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-gray-500/20 flex items-center justify-center text-sm opacity-60 hover:opacity-100 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Hero Card: Großes Profilbild & Infos */}
          <div className={`p-4 sm:p-5 rounded-2xl border ${darkMode ? 'bg-black/30 border-white/5' : 'bg-gray-50 border-black/5'} flex flex-col sm:flex-row items-center sm:items-start gap-4`}>
            <div className="relative group shrink-0 flex flex-col items-center">
              <button
                type="button"
                onClick={() => setIsFullscreenAvatar(true)}
                className="relative p-1 rounded-2xl cursor-pointer transition-transform hover:scale-105 active:scale-95 focus:outline-none ring-2 ring-amber-500/40 hover:ring-amber-500"
                title="Klicken für Vollbild-Ansicht"
              >
                <PlayerAvatar
                  url={avatarUrl}
                  avatar_frame={getPlayerAvatarFrame(playerName)}
                  name={playerName}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl shadow-lg object-cover"
                />
                <div className="absolute inset-1 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <i className="fas fa-search-plus text-xl"></i>
                </div>
              </button>
              <span className="mt-1.5 text-[9px] font-bold text-amber-500 tracking-wider flex items-center space-x-1">
                <i className="fas fa-expand text-[8px]"></i>
                <span>Großansicht</span>
              </span>
            </div>

            <div className="flex-1 w-full text-center sm:text-left space-y-2">
              <div className="flex items-center justify-center sm:justify-start space-x-2 flex-wrap gap-y-1">
                <PlayerNameTag name={playerName} colorKey={getPlayerNameBgColor(playerName)} className="text-sm px-2.5 py-0.5" />
                <PlayerLevelBadge level={lvlInfo.level} isGuest={isGuest} size="md" />
                {getPlayerTitle(playerName) && (
                  <PlayerTitleBadge title={getPlayerTitle(playerName)} size="md" />
                )}
                {isFriend && (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Befreundet</span>
                  </span>
                )}
              </div>

              {/* Wiegschaft / Gilde */}
              {playerGuildInfo ? (
                <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400 text-xs font-bold">
                  <span>🏰 Wiegschaft:</span>
                  <span className="font-black">[{playerGuildInfo.tag}] {playerGuildInfo.name}</span>
                  {playerGuildInfo.role && (
                    <span className="text-[10px] opacity-75">
                      ({playerGuildInfo.role === 'leader' ? '👑 Anführer' : playerGuildInfo.role === 'officer' ? '⚔️ Offizier' : 'Mitglied'})
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-[11px] opacity-60">
                  {isGuest ? '👤 Gastspieler (ohne Account)' : '🛡️ Freier Spieler (keine Wiegschaft)'}
                </div>
              )}

              {/* XP Progress Bar */}
              <div className="space-y-1 pt-1 max-w-md">
                <div className="flex justify-between text-[10px] font-bold opacity-75">
                  <span>Level {lvlInfo.level} • {lvlInfo.title}</span>
                  <span>{lvlInfo.currentLevelXp} / {lvlInfo.neededForNextLevel} XP ({Math.round(lvlInfo.progressPercent)}%)</span>
                </div>
                <div className="h-2 w-full bg-black/20 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(5, lvlInfo.progressPercent))}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* DYNAMISCHE MODUS-REITER: Passt sich an den geklickten Tab an */}
          <div className="space-y-2">
            <div className="text-[11px] font-black uppercase opacity-60 tracking-wider flex items-center justify-between">
              <span>Statistik-Modus wählen</span>
              <span className="text-[10px] font-normal lowercase opacity-75">
                (aktiv: {currentModeTab === 'Standard' ? 'Standardspiel' : currentModeTab})
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-black/10 dark:bg-white/5 border border-white/5">
              <button
                type="button"
                onClick={() => setCurrentModeTab('Standard')}
                className={`py-2 px-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  currentModeTab === 'Standard'
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                    : 'opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <span>🍺</span>
                <span className="truncate">Standard</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentModeTab('Speedwiegen')}
                className={`py-2 px-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  currentModeTab === 'Speedwiegen'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                    : 'opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <span>⚡</span>
                <span className="truncate">Speedwiegen</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentModeTab('Teamwiegen')}
                className={`py-2 px-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  currentModeTab === 'Teamwiegen'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <span>🏆</span>
                <span className="truncate">Teamwiegen</span>
              </button>
            </div>
          </div>

          {/* Sub-Tabs: Übersicht vs. Verlauf vs. Achievements */}
          <div className="flex items-center space-x-2 border-b border-gray-500/15 pb-2 text-xs font-bold overflow-x-auto scrollbar-thin">
            <button
              type="button"
              onClick={() => setActiveSubTab('overview')}
              className={`pb-1.5 px-3 border-b-2 font-black transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                activeSubTab === 'overview'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <span>📊</span>
              <span>Modus-Übersicht</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('history')}
              className={`pb-1.5 px-3 border-b-2 font-black transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                activeSubTab === 'history'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <span>📜</span>
              <span>Spiel-Historie ({historyList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('achievements')}
              className={`pb-1.5 px-3 border-b-2 font-black transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                activeSubTab === 'achievements'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <span>🏆</span>
              <span>Achievements ({playerAchievementsList.length})</span>
            </button>
          </div>

          {/* TAB-INHALTE */}
          {activeSubTab === 'overview' && (
            <div className="space-y-4">
              {/* 1. STANDARDSPIEL ANSICHT */}
              {currentModeTab === 'Standard' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {/* 1. Durchschnittlicher Abweichungs-Wert (avg) */}
                    <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-black/5'}`}>
                      <span className="text-[10px] uppercase font-bold opacity-50 block mb-1">
                        🎯 Ø Abweichung (avg)
                      </span>
                      <span className="text-2xl font-black text-emerald-400">
                        {standardStats.gamesCount > 0 ? `${standardStats.avg.toFixed(2)}g` : '-'}
                      </span>
                      <span className="text-[10px] opacity-60 block mt-1">
                        Bester Wert: {standardStats.gamesCount > 0 ? `${standardStats.bestAvg.toFixed(2)}g` : '-'}
                      </span>
                    </div>

                    {/* 2. Gesamtanzahl der gespielten Standardspiele (games_count) */}
                    <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-black/5'}`}>
                      <span className="text-[10px] uppercase font-bold opacity-50 block mb-1">
                        🎮 Spiele Gesamt (games_count)
                      </span>
                      <span className="text-2xl font-black text-amber-400">
                        {standardStats.gamesCount}
                      </span>
                      <span className="text-[10px] opacity-60 block mt-1">
                        Standardspiele (500ml & 0,33L)
                      </span>
                    </div>

                    {/* 3. Durchschnittliche Anzahl an Schnäpsen pro Spiel (schnaepse) */}
                    <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-black/5'}`}>
                      <span className="text-[10px] uppercase font-bold opacity-50 block mb-1">
                        🍻 Ø Schnäpse pro Spiel
                      </span>
                      <span className="text-2xl font-black text-yellow-400">
                        {standardStats.gamesCount > 0 ? `${standardStats.avgSchnaepse.toFixed(2)}` : '-'}
                      </span>
                      <span className="text-[10px] opacity-60 block mt-1">
                        Gesamt: {standardStats.totalSchnaepse} Schnäpse
                      </span>
                    </div>

                    {/* 4. Durchschnittlicher Gesamtwert (total) */}
                    <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-black/5'}`}>
                      <span className="text-[10px] uppercase font-bold opacity-50 block mb-1">
                        👑 Ø Gesamtwert (total)
                      </span>
                      <span className="text-2xl font-black text-purple-400">
                        {standardStats.gamesCount > 0 ? `${standardStats.total.toFixed(2)}` : '-'}
                      </span>
                      <span className="text-[10px] opacity-60 block mt-1">
                        (Ø Abweichung + Ø Schnäpse)
                      </span>
                    </div>
                  </div>

                  {standardStats.gamesCount === 0 && (
                    <div className="text-center py-6 opacity-60 text-xs">
                      Keine Standardspiele für {playerName} in der Datenbank erfasst.
                    </div>
                  )}
                </div>
              )}

              {/* 2. SPEEDWIEGEN ANSICHT */}
              {currentModeTab === 'Speedwiegen' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {/* 1. Anzahl der absolvierten Speedwiegen-Spiele */}
                    <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-black/5'}`}>
                      <span className="text-[10px] uppercase font-bold opacity-50 block mb-1">
                        ⚡ Absolvierte Speed-Spiele
                      </span>
                      <span className="text-2xl font-black text-cyan-400">
                        {speedStats.gamesCount}
                      </span>
                      <span className="text-[10px] opacity-60 block mt-1">
                        Speedwiegen-Runden
                      </span>
                    </div>

                    {/* 2. Durchschnittlicher Gesamtabstand pro Stufe */}
                    <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-black/5'}`}>
                      <span className="text-[10px] uppercase font-bold opacity-50 block mb-1">
                        🎯 Ø Abstand pro Stufe
                      </span>
                      <span className="text-2xl font-black text-emerald-400">
                        {speedStats.gamesCount > 0 ? `${speedStats.avgDistancePerLevel.toFixed(2)}g` : '-'}
                      </span>
                      <span className="text-[10px] opacity-60 block mt-1">
                        Normiert über alle Stufen
                      </span>
                    </div>

                    {/* 3. Durchschnittliche Zeit in Sekunden */}
                    <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-black/5'}`}>
                      <span className="text-[10px] uppercase font-bold opacity-50 block mb-1">
                        ⏱️ Ø Zeit in Sekunden
                      </span>
                      <span className="text-2xl font-black text-amber-400">
                        {speedStats.gamesCount > 0 ? `${speedStats.avgTimeSec.toFixed(1)}s` : '-'}
                      </span>
                      <span className="text-[10px] opacity-60 block mt-1">
                        {speedStats.gamesCount > 0 ? `Ø ${speedStats.avgTimePerLevel.toFixed(1)}s / Stufe` : 'Schnellste: -'}
                      </span>
                    </div>

                    {/* 4. Normierter Bester Score */}
                    <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-black/5'}`}>
                      <span className="text-[10px] uppercase font-bold opacity-50 block mb-1">
                        🏆 Bester Score (normiert)
                      </span>
                      <span className="text-2xl font-black text-purple-400">
                        {speedStats.gamesCount > 0 ? `${speedStats.bestScore.toFixed(1)}` : '-'}
                      </span>
                      <span className="text-[10px] opacity-60 block mt-1">
                        (Abstand/Stufe + Zeit/Stufe)
                      </span>
                    </div>
                  </div>

                  {speedStats.gamesCount === 0 && (
                    <div className="text-center py-6 opacity-60 text-xs">
                      Keine Speedwiegen-Ergebnisse für {playerName} gefunden.
                    </div>
                  )}
                </div>
              )}

              {/* 3. TEAMWIEGEN ANSICHT */}
              {currentModeTab === 'Teamwiegen' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-xs uppercase tracking-wider text-indigo-400 flex items-center space-x-1.5">
                        <i className="fas fa-users"></i>
                        <span>Team-Mitglieder & Einzelergebnisse</span>
                      </h4>
                      <p className="text-[10px] opacity-60">
                        Durchschnittliche Ergebnisse der Spieler im Teamwiegen
                      </p>
                    </div>
                    {teamGamesCount > 0 && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                        {teamGamesCount} Team-Matches
                      </span>
                    )}
                  </div>

                  {teamMembersLoading ? (
                    <div className="flex flex-col items-center justify-center py-8 space-y-2 opacity-60">
                      <i className="fas fa-spinner fa-spin text-xl text-indigo-400"></i>
                      <span className="text-xs">Lade Teammitglieder & Statistiken...</span>
                    </div>
                  ) : teamMembers.length > 0 ? (
                    <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                      {teamMembers.map((member, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-2xl border flex items-center justify-between text-xs transition-colors ${
                            darkMode ? 'bg-black/20 border-white/5 hover:bg-black/30' : 'bg-gray-50 border-black/5 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <span className="font-black text-[10px] opacity-40 w-4 text-center shrink-0">
                              #{idx + 1}
                            </span>
                            <PlayerAvatar
                              url={member.avatarUrl || getPlayerAvatarUrl(member.name)}
                              avatar_frame={member.avatarFrame}
                              name={member.name}
                              className="w-9 h-9 rounded-full object-cover shrink-0 border border-white/10"
                            />
                            <div className="min-w-0 truncate">
                              <div className="flex items-center space-x-1.5 flex-wrap">
                                <PlayerNameTag name={member.name} colorKey={member.nameBgColor} className="text-xs px-2 py-0.2" />
                                {member.level && (
                                  <PlayerLevelBadge level={member.level} isGuest={false} size="xs" />
                                )}
                                {member.title && (
                                  <PlayerTitleBadge title={member.title} size="xs" />
                                )}
                              </div>
                              <span className="text-[10px] opacity-50 block mt-0.5">
                                {member.gamesCount} {member.gamesCount === 1 ? 'Teamspiel' : 'Teamspiele'} absolviert
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0 pl-3">
                            <div className="font-black text-sm text-emerald-400">
                              Ø {member.avgAbstand.toFixed(2)}g
                            </div>
                            <div className="text-[10px] opacity-60">
                              Ø {member.avgSchnaepse.toFixed(1)} Pkt • Total {member.avgTotal.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`p-5 rounded-2xl border text-center space-y-2 ${darkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-black/5'}`}>
                      <span className="text-2xl block">👥</span>
                      <p className="font-black text-xs text-indigo-400">Team: {playerName}</p>
                      <p className="text-[11px] opacity-60 max-w-sm mx-auto">
                        Für dieses Team wurden noch keine separat verknüpften Einzelspieler-Accounts in der Datenbank erfasst.
                      </p>
                      {historyList.length > 0 && (
                        <div className="pt-2 text-xs font-bold text-amber-500">
                          {historyList.length} Teamwiegen-Spiele in der Historie vorhanden
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4. SPIEL-HISTORIE TAB */}
          {activeSubTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] opacity-60">
                <span>Gefiltert nach: {currentModeTab === 'Standard' ? 'Standardspiel' : currentModeTab}</span>
                <span>{historyList.length} Einträge</span>
              </div>

              {historyList.length === 0 ? (
                <div className="text-center py-8 opacity-60 text-xs">
                  Keine Spiele für {currentModeTab === 'Standard' ? 'Standardspiel' : currentModeTab} gefunden.
                </div>
              ) : (
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                  {historyList.map((item, idx) => {
                    const isSpeed = matchesGameMode(item.game_mode || item.gameMode, 'Speedwiegen');
                    const isTeam = matchesGameMode(item.game_mode || item.gameMode, 'Teamwiegen');
                    const normSpeed = isSpeed ? getSpeedNormalized(item) : null;

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border flex justify-between items-center text-xs ${
                          darkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-black/5'
                        }`}
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold">{item.date}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 opacity-75">
                              {normalizeGameMode(item.game_mode || item.gameMode)}
                            </span>
                            {item.tournament_name && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30">
                                [{item.tournament_name}]
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] opacity-50 block mt-0.5">
                            {isSpeed
                              ? `${normSpeed?.levels} Stufen • Zeit: ${normSpeed?.timeSec.toFixed(1)}s`
                              : isTeam
                              ? `Teamwertung: ${item.schnaepse} Punkte`
                              : `${item.schnaepse} Schnäpse`}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="font-black text-sm text-emerald-400">
                            {isSpeed
                              ? `Ø ${normSpeed?.avgDist.toFixed(2)}g`
                              : `Ø ${Number(item.avg || 0).toFixed(2)}g`}
                          </span>
                          <span className="block text-[10px] opacity-60">
                            {isSpeed
                              ? `Score: ${normSpeed?.score.toFixed(1)}`
                              : `Total: ${(Number(item.total) || (Number(item.avg || 0) + Number(item.schnaepse || 0))).toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 5. ACHIEVEMENTS TAB */}
          {activeSubTab === 'achievements' && (() => {
            const totalAwardsCount = playerAchievementsList.reduce((acc, a) => acc + a.count, 0);

            const filteredAchs = playerAchievementsList.filter(ach => {
              if (selectedAchRarity !== 'all' && ach.rarity !== selectedAchRarity) {
                return false;
              }
              if (achSearchQuery.trim()) {
                const q = achSearchQuery.trim().toLowerCase();
                const matchTitle = ach.title.toLowerCase().includes(q);
                const matchDesc = ach.description.toLowerCase().includes(q);
                if (!matchTitle && !matchDesc) return false;
              }
              return true;
            });

            return (
              <div className="space-y-3">
                {/* Header Stats & Filter */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-500 flex items-center space-x-1">
                      <i className="fas fa-trophy"></i>
                      <span>Freigeschaltete Badges ({playerAchievementsList.length})</span>
                    </span>
                    <span className="text-[11px] opacity-60 font-bold">
                      • {totalAwardsCount}× insgesamt
                    </span>
                  </div>

                  {/* Search input */}
                  <div className="relative flex-1 max-w-xs">
                    <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] opacity-40"></i>
                    <input
                      type="text"
                      value={achSearchQuery}
                      onChange={e => setAchSearchQuery(e.target.value)}
                      placeholder="Achievement suchen..."
                      className={`w-full pl-7 pr-6 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                        darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      }`}
                    />
                    {achSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setAchSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] opacity-50 hover:opacity-100 cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Rarity filter chips */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-thin">
                  {(['all', 'legendary', 'epic', 'rare', 'common'] as const).map(rKey => {
                    const count = rKey === 'all'
                      ? playerAchievementsList.length
                      : playerAchievementsList.filter(a => a.rarity === rKey).length;
                    const label = {
                      all: 'Alle',
                      legendary: 'Legendary',
                      epic: 'Epic',
                      rare: 'Rare',
                      common: 'Common'
                    }[rKey];

                    return (
                      <button
                        key={rKey}
                        type="button"
                        onClick={() => setSelectedAchRarity(rKey)}
                        className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer whitespace-nowrap ${
                          selectedAchRarity === rKey
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-xs'
                            : 'opacity-60 hover:opacity-100 border-transparent bg-black/5 dark:bg-white/5'
                        }`}
                      >
                        {label} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Achievements List */}
                {filteredAchs.length === 0 ? (
                  <div className="text-center py-10 opacity-60 text-xs space-y-2">
                    <div className="text-3xl">🏆</div>
                    <p className="font-bold">Keine Errungenschaften gefunden.</p>
                    {playerAchievementsList.length === 0 ? (
                      <p className="text-[11px] opacity-75">Dieser Spieler hat bisher noch keine Errungenschaften freigeschaltet.</p>
                    ) : (
                      <p className="text-[11px] opacity-75">Keine Treffer für den aktuellen Such- oder Raritätsfilter.</p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[44vh] overflow-y-auto pr-1">
                    {filteredAchs.map((ach) => {
                      const rarityBadge = {
                        common: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
                        rare: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                        epic: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
                        legendary: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }[ach.rarity] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';

                      return (
                        <div
                          key={ach.id}
                          className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${
                            darkMode ? 'bg-slate-800/80 border-slate-700/80' : 'bg-gray-50/90 border-gray-200'
                          }`}
                        >
                          <div className="flex items-start space-x-2.5">
                            <div className="text-2xl p-2 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center min-w-[40px] h-[40px] shrink-0">
                              {ach.icon.startsWith('fa-') || ach.icon.startsWith('fas ') ? <i className={ach.icon}></i> : ach.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 flex-wrap">
                                <h5 className="font-black text-xs truncate">{ach.title}</h5>
                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border ${rarityBadge}`}>
                                  {ach.rarity}
                                </span>
                              </div>
                              <p className="text-[11px] opacity-70 mt-0.5 leading-snug line-clamp-2">{ach.description}</p>
                            </div>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-gray-500/10 flex items-center justify-between text-[10px]">
                            <span className="font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                              {ach.count}× freigeschaltet
                            </span>
                            {ach.dates && ach.dates.length > 0 && (
                              <span className="opacity-60 truncate max-w-[150px]" title={ach.dates.join(', ')}>
                                {ach.dates[ach.dates.length - 1]}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Footer mit Schließen-Button */}
          <div className="pt-2 border-t border-gray-500/15">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl font-black uppercase text-xs tracking-widest border border-gray-500/20 opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-all"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PlayerDetailsModal;
