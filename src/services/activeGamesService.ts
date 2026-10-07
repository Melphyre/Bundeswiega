import { supabase, isSupabaseConfigured } from '../../supabaseClient';

export interface ActiveGame {
  id: string;
  host_user_id: string;
  game_mode: string;
  status: 'in_progress' | 'finished';
  current_round: number;
  players: any[];
  game_data: any;
  created_at: string;
  updated_at: string;
  host_profile?: {
    id: string;
    username: string;
    avatar_url?: string | null;
    title?: string;
    level?: number;
    name_bg_color?: string | null;
    name_glow?: string | null;
  };
  spectators_count?: number;
}

export interface SpectatorPresenceUser {
  user_id: string;
  username: string;
  avatar_url?: string | null;
  title?: string;
  is_host?: boolean;
  joined_at?: string;
}

/**
 * Stellt sicher, dass das Feld avatar_url für jeden Spieler im players-Array gesetzt ist.
 * Falls nicht vorhanden, werden fehlende Profilbilder über die 'profiles'-Tabelle nachgeladen.
 */
export async function normalizePlayersWithAvatar(players: any[]): Promise<any[]> {
  if (!Array.isArray(players)) return [];

  const normalized = players.map(p => {
    if (!p || typeof p !== 'object') return p;
    const avatar = p.avatar_url || p.imageUrl || null;
    return {
      ...p,
      avatar_url: avatar,
      imageUrl: avatar
    };
  });

  // Sammle Spieler mit fehlendem avatar_url, die eine userId besitzen
  const missingUserIds = normalized
    .filter(p => (!p.avatar_url || String(p.avatar_url).trim() === '') && p.userId)
    .map(p => p.userId);

  if (missingUserIds.length > 0 && isSupabaseConfigured()) {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, avatar_url, username')
        .in('id', missingUserIds);

      if (!error && profiles && profiles.length > 0) {
        const avatarMap = new Map<string, string>();
        profiles.forEach(pr => {
          if (pr.avatar_url) avatarMap.set(pr.id, pr.avatar_url);
        });

        normalized.forEach(p => {
          if ((!p.avatar_url || String(p.avatar_url).trim() === '') && p.userId && avatarMap.has(p.userId)) {
            const found = avatarMap.get(p.userId)!;
            p.avatar_url = found;
            p.imageUrl = found;
          }
        });
      }
    } catch (e) {
      console.warn('normalizePlayersWithAvatar: Error fetching profiles:', e);
    }
  }

  return normalized;
}

/**
 * Synchroner Fallback für normalizePlayersWithAvatar
 */
export function normalizePlayersWithAvatarSync(players: any[]): any[] {
  if (!Array.isArray(players)) return [];
  return players.map(p => {
    if (!p || typeof p !== 'object') return p;
    const avatar = p.avatar_url || p.imageUrl || null;
    return {
      ...p,
      avatar_url: avatar,
      imageUrl: avatar
    };
  });
}

/**
 * Erstellt ein neues aktives Spiel in der active_games Tabelle
 */
export async function createActiveGame(params: {
  hostUserId: string;
  gameMode: string;
  currentRound?: number;
  players: any[];
  gameData: any;
}): Promise<string | null> {
  if (!isSupabaseConfigured() || !params.hostUserId) return null;

  try {
    const normalizedPlayers = await normalizePlayersWithAvatar(params.players);
    const payload = {
      host_user_id: params.hostUserId,
      game_mode: params.gameMode,
      status: 'in_progress',
      current_round: params.currentRound || 1,
      players: normalizedPlayers,
      game_data: params.gameData || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('active_games')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.warn('createActiveGame error:', error.message);
      return null;
    }

    return data?.id || null;
  } catch (err: any) {
    console.error('createActiveGame exception:', err);
    return null;
  }
}

/**
 * Aktualisiert ein laufendes Spiel (Runden, Spieler, Zwischenstände)
 */
export async function updateActiveGame(
  gameId: string,
  params: {
    currentRound?: number;
    players?: any[];
    gameData?: any;
    status?: 'in_progress' | 'finished';
  }
): Promise<boolean> {
  if (!isSupabaseConfigured() || !gameId) return false;

  try {
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (params.currentRound !== undefined) updatePayload.current_round = params.currentRound;
    if (params.players !== undefined) {
      updatePayload.players = await normalizePlayersWithAvatar(params.players);
    }
    if (params.gameData !== undefined) updatePayload.game_data = params.gameData;
    if (params.status !== undefined) updatePayload.status = params.status;

    const { error } = await supabase
      .from('active_games')
      .update(updatePayload)
      .eq('id', gameId);

    if (error) {
      console.warn('updateActiveGame error:', error.message);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('updateActiveGame exception:', err);
    return false;
  }
}

/**
 * Setzt den Status auf 'finished'
 */
export async function finishActiveGame(gameId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !gameId) return false;

  try {
    const { error } = await supabase
      .from('active_games')
      .update({
        status: 'finished',
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId);

    if (error) {
      console.warn('finishActiveGame error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('finishActiveGame exception:', err);
    return false;
  }
}

/**
 * Löscht ein aktives Spiel (z. B. bei Spielabbruch im Setup)
 */
export async function deleteActiveGame(gameId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !gameId) return false;

  try {
    const { error } = await supabase
      .from('active_games')
      .delete()
      .eq('id', gameId);

    return !error;
  } catch (err) {
    console.error('deleteActiveGame exception:', err);
    return false;
  }
}

/**
 * Bereinigt Spiele mit status: 'finished', die älter als 30 Minuten sind
 */
export async function cleanupFinishedActiveGames(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('active_games')
      .delete()
      .eq('status', 'finished')
      .lt('updated_at', thirtyMinutesAgo)
      .select('id');

    if (error) {
      console.warn('cleanupFinishedActiveGames error:', error.message);
      return 0;
    }

    return data?.length || 0;
  } catch (err) {
    console.error('cleanupFinishedActiveGames exception:', err);
    return 0;
  }
}

/**
 * Lädt alle aktuell laufenden Spiele ('in_progress'), deren Host ein akzeptierter Freund ist
 */
export async function fetchFriendsActiveGames(currentUserId: string): Promise<ActiveGame[]> {
  if (!isSupabaseConfigured() || !currentUserId) return [];

  try {
    // 1. Akzeptierte Freundschaften ermitteln
    const { data: friendships, error: fError } = await supabase
      .from('friendships')
      .select('requester_id, receiver_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

    if (fError) {
      console.warn('Error fetching friendships for active games:', fError.message);
      return [];
    }

    const friendIds: string[] = [];
    (friendships || []).forEach(f => {
      if (f.requester_id === currentUserId && f.receiver_id) {
        friendIds.push(f.receiver_id);
      } else if (f.receiver_id === currentUserId && f.requester_id) {
        friendIds.push(f.requester_id);
      }
    });

    if (friendIds.length === 0) {
      return [];
    }

    // 2. Aktive Spiele der Freunde abrufen
    const { data: activeGames, error: gError } = await supabase
      .from('active_games')
      .select('*')
      .eq('status', 'in_progress')
      .in('host_user_id', friendIds)
      .order('created_at', { ascending: false });

    if (gError) {
      console.warn('Error fetching active games of friends:', gError.message);
      return [];
    }

    if (!activeGames || activeGames.length === 0) {
      return [];
    }

    // 3. Profile der Hosts laden
    const hostUserIds = Array.from(new Set(activeGames.map(g => g.host_user_id).filter(Boolean)));
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, selected_title, active_title, title, level, xp, name_bg_color, name_glow')
      .in('id', hostUserIds);

    const profileMap = new Map<string, any>();
    (profiles || []).forEach(p => {
      profileMap.set(p.id, {
        id: p.id,
        username: p.username || 'Freund',
        avatar_url: p.avatar_url || null,
        title: p.selected_title || p.active_title || p.title || '',
        level: p.level || 1,
        name_bg_color: p.name_bg_color || null,
        name_glow: p.name_glow || null
      });
    });

    const enrichedGames: ActiveGame[] = activeGames.map(g => ({
      ...g,
      host_profile: profileMap.get(g.host_user_id) || {
        id: g.host_user_id,
        username: 'Freund',
        avatar_url: null,
        title: '',
        level: 1
      }
    }));

    return enrichedGames;
  } catch (err: any) {
    console.error('fetchFriendsActiveGames exception:', err);
    return [];
  }
}
