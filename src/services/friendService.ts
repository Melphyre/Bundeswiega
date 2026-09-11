import { supabase } from '../supabaseClient';
import { Friend, PendingFriendRequest } from '../../types';

export interface FetchFriendsResult {
  friends: Friend[];
  pendingRequests: PendingFriendRequest[];
}

export interface FriendActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

// Regex zur Validierung einer korrekten 36-Zeichen-UUID
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(uuid: string): boolean {
  return typeof uuid === 'string' && UUID_REGEX.test(uuid.trim());
}

/**
 * Lädt alle bestätigten Freunde und offenen eingehenden Anfragen
 */
export async function fetchFriendsAndRequests(userId: string): Promise<FetchFriendsResult> {
  const cleanUserId = userId?.trim();
  if (!cleanUserId || !isValidUuid(cleanUserId)) {
    console.warn('fetchFriendsAndRequests abgebrochen: Ungültige User-ID Format:', cleanUserId);
    return { friends: [], pendingRequests: [] };
  }

  try {
    // 1. Gesendete und empfangene Freundschaften abrufen
    const { data: sent, error: errSent } = await supabase
      .from('friendships')
      .select('id, receiver_id, status')
      .eq('requester_id', cleanUserId);

    if (errSent) throw errSent;

    const { data: received, error: errReceived } = await supabase
      .from('friendships')
      .select('id, requester_id, status')
      .eq('receiver_id', cleanUserId);

    if (errReceived) throw errReceived;

    // 2. Filtern nach Status
    const acceptedSent = (sent || []).filter(r => r.status === 'accepted');
    const acceptedReceived = (received || []).filter(r => r.status === 'accepted');
    const pendingRaw = (received || []).filter(r => r.status === 'pending');

    const friendUserIds = [
      ...acceptedSent.map(r => r.receiver_id),
      ...acceptedReceived.map(r => r.requester_id)
    ];
    const pendingRequesterIds = pendingRaw.map(r => r.requester_id);
    const allNeededUserIds = Array.from(new Set([...friendUserIds, ...pendingRequesterIds])).filter(isValidUuid);

    if (allNeededUserIds.length === 0) {
      return { friends: [], pendingRequests: [] };
    }

    // 3. Profile laden
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, username, email, avatar_url, title, selected_title, level, xp')
      .in('id', allNeededUserIds);

    if (profErr) throw profErr;

    const profMap = new Map((profiles || []).map(p => [p.id, p]));

    // 4. Gemappte Freunde
    const friends: Friend[] = [
      ...acceptedSent.map(r => {
        const p = profMap.get(r.receiver_id);
        return {
          id: r.receiver_id,
          name: p?.username || p?.email || 'Unbekannt',
          imageUrl: p?.avatar_url || '',
          friendshipId: r.id,
          title: (p as any)?.title || (p as any)?.selected_title || undefined,
          level: Number((p as any)?.level) || 1,
          xp: Number((p as any)?.xp) || 0
        };
      }),
      ...acceptedReceived.map(r => {
        const p = profMap.get(r.requester_id);
        return {
          id: r.requester_id,
          name: p?.username || p?.email || 'Unbekannt',
          imageUrl: p?.avatar_url || '',
          friendshipId: r.id,
          title: (p as any)?.title || (p as any)?.selected_title || undefined,
          level: Number((p as any)?.level) || 1,
          xp: Number((p as any)?.xp) || 0
        };
      })
    ];

    // 5. Gemappte ausstehende Anfragen
    const pendingRequests: PendingFriendRequest[] = pendingRaw.map(req => {
      const p = profMap.get(req.requester_id);
      return {
        id: req.id,
        requesterId: req.requester_id,
        requesterName: p?.username || p?.email || 'Unbekannter Spieler',
        title: (p as any)?.title || (p as any)?.selected_title || undefined,
        level: Number((p as any)?.level) || 1
      };
    });

    return { friends, pendingRequests };
  } catch (err) {
    console.error('Fehler in fetchFriendsAndRequests:', err);
    return { friends: [], pendingRequests: [] };
  }
}

/**
 * Sendet eine Freundschaftsanfrage
 */
export async function sendFriendRequest(
  currentUserId: string,
  searchQuery: string
): Promise<FriendActionResult> {
  const query = searchQuery.trim();
  const cleanUserId = currentUserId?.trim();

  if (!cleanUserId || !isValidUuid(cleanUserId)) {
    return { success: false, error: 'Sitzung fehlerhaft. Bitte melde dich erneut an.' };
  }

  if (!query) {
    return { success: false, error: 'Bitte gib einen Benutzernamen oder eine E-Mail ein.' };
  }

  try {
    // 1. Zielprofil per Username suchen
    let { data: byUsername, error: errUser } = await supabase
      .from('profiles')
      .select('id, username, email')
      .ilike('username', query);

    if (errUser) throw errUser;

    let targetProfile = byUsername && byUsername.length > 0 ? byUsername[0] : null;

    // Fallback: Suche per E-Mail
    if (!targetProfile) {
      const { data: byEmail, error: errEmail } = await supabase
        .from('profiles')
        .select('id, username, email')
        .ilike('email', query);

      if (errEmail) throw errEmail;
      targetProfile = byEmail && byEmail.length > 0 ? byEmail[0] : null;
    }

    if (!targetProfile || !isValidUuid(targetProfile.id)) {
      return { success: false, error: 'Kein Benutzer mit diesem Namen oder dieser E-Mail gefunden.' };
    }

    if (targetProfile.id === cleanUserId) {
      return { success: false, error: 'Du kannst dir nicht selbst eine Freundschaftsanfrage senden.' };
    }

    const targetName = targetProfile.username || targetProfile.email || 'Dieser Spieler';

    // 2. Bestehende Beziehung prüfen (Sequentiell um Stream-Abbrüche zu vermeiden)
    const { data: relSent, error: errRelSent } = await supabase
      .from('friendships')
      .select('id, requester_id, receiver_id, status')
      .eq('requester_id', cleanUserId)
      .eq('receiver_id', targetProfile.id);

    if (errRelSent) throw errRelSent;

    const { data: relRec, error: errRelRec } = await supabase
      .from('friendships')
      .select('id, requester_id, receiver_id, status')
      .eq('requester_id', targetProfile.id)
      .eq('receiver_id', cleanUserId);

    if (errRelRec) throw errRelRec;

    const allRelations = [...(relSent || []), ...(relRec || [])];

    // Fall 1: Freundschaft ist bereits abgeschlossen (status 'accepted')
    const hasAccepted = allRelations.some(r => r.status === 'accepted');
    if (hasAccepted) {
      return {
        success: false,
        error: `${targetName} ist bereits dein Freund!`
      };
    }

    // Fall 2: Der aktuelle Nutzer hat bereits eine offene Anfrage an den Spieler gesendet
    const hasOutgoingPending = (relSent || []).some(r => r.status === 'pending');
    if (hasOutgoingPending) {
      return {
        success: false,
        error: `Es läuft bereits eine Freundschaftsanfrage an ${targetName}. Bitte warte auf die Bestätigung.`
      };
    }

    // Fall 3: Der andere Spieler hat bereits eine offene Anfrage an den aktuellen Nutzer gesendet
    const hasIncomingPending = (relRec || []).some(r => r.status === 'pending');
    if (hasIncomingPending) {
      return {
        success: false,
        error: `${targetName} hat dir bereits eine Freundschaftsanfrage gesendet! Bitte prüfe deine eingehenden Anfragen.`
      };
    }

    // Fall 4: Sonstige bereits existierende Beziehung
    if (allRelations.length > 0) {
      return {
        success: false,
        error: `Es besteht bereits eine Anfrage oder Beziehung mit ${targetName}.`
      };
    }

    // 3. Neue Anfrage mit Status 'pending' anlegen
    const { error: insertErr } = await supabase
      .from('friendships')
      .insert({
        requester_id: cleanUserId,
        receiver_id: targetProfile.id,
        status: 'pending'
      });

    if (insertErr) {
      if (insertErr.code === '23505' || insertErr.message?.includes('duplicate key') || insertErr.message?.includes('unique constraint')) {
        return {
          success: false,
          error: `Es läuft bereits eine Anfrage oder es besteht bereits eine Freundschaft mit ${targetName}.`
        };
      }
      throw insertErr;
    }

    return {
      success: true,
      message: `Freundschaftsanfrage an "${targetName}" gesendet!`
    };
  } catch (err: any) {
    console.error('Fehler beim Senden der Freundschaftsanfrage:', err);
    if (err?.code === '23505' || err?.message?.includes('duplicate key') || err?.message?.includes('unique constraint')) {
      return {
        success: false,
        error: 'Es besteht bereits eine laufende Anfrage oder Freundschaft mit diesem Spieler.'
      };
    }
    return {
      success: false,
      error: err.message || 'Anfrage konnte nicht gesendet werden.'
    };
  }
}

export async function acceptFriendRequest(friendshipId: string): Promise<FriendActionResult> {
  if (!friendshipId) return { success: false, error: 'Keine Freundschafts-ID angegeben.' };

  try {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);

    if (error) throw error;
    return { success: true, message: 'Freundschaftsanfrage angenommen!' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Fehler beim Annehmen.' };
  }
}

export async function rejectFriendRequest(friendshipId: string): Promise<FriendActionResult> {
  if (!friendshipId) return { success: false, error: 'Keine Freundschafts-ID angegeben.' };

  try {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) throw error;
    return { success: true, message: 'Freundschaftsanfrage abgelehnt.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Fehler beim Ablehnen.' };
  }
}

export async function removeFriend(friendshipId: string): Promise<FriendActionResult> {
  if (!friendshipId) return { success: false, error: 'Keine Freundschafts-ID angegeben.' };

  try {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) throw error;
    return { success: true, message: 'Freund entfernt.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Fehler beim Entfernen.' };
  }
}