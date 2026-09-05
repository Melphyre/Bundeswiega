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

/**
 * Lädt alle bestätigten Freunde und offenen eingehenden Anfragen
 * ausschließlich über flache Queries (.eq, .in) ohne Joins und ohne .or().
 */
export async function fetchFriendsAndRequests(userId: string): Promise<FetchFriendsResult> {
  if (!userId) {
    return { friends: [], pendingRequests: [] };
  }

  // 1. Eigene Freundschaften ohne verschachtelte Joins abrufen (gesendet und empfangen separat)
  const [
    { data: sent, error: errSent },
    { data: received, error: errReceived }
  ] = await Promise.all([
    supabase
      .from('friendships')
      .select('id, receiver_id, status')
      .eq('requester_id', userId),
    supabase
      .from('friendships')
      .select('id, requester_id, status')
      .eq('receiver_id', userId)
  ]);

  if (errSent) throw errSent;
  if (errReceived) throw errReceived;

  // 2. Filtern nach Status: akzeptiert vs. ausstehend
  const acceptedSent = (sent || []).filter(r => r.status === 'accepted');
  const acceptedReceived = (received || []).filter(r => r.status === 'accepted');
  const pendingRaw = (received || []).filter(r => r.status === 'pending');

  const friendUserIds = [
    ...acceptedSent.map(r => r.receiver_id),
    ...acceptedReceived.map(r => r.requester_id)
  ];
  const pendingRequesterIds = pendingRaw.map(r => r.requester_id);
  const allNeededUserIds = Array.from(new Set([...friendUserIds, ...pendingRequesterIds]));

  if (allNeededUserIds.length === 0) {
    return { friends: [], pendingRequests: [] };
  }

  // 3. Profile flach und performant über .in('id', ...) laden
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, username, email, avatar_url')
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
        friendshipId: r.id
      };
    }),
    ...acceptedReceived.map(r => {
      const p = profMap.get(r.requester_id);
      return {
        id: r.requester_id,
        name: p?.username || p?.email || 'Unbekannt',
        imageUrl: p?.avatar_url || '',
        friendshipId: r.id
      };
    })
  ];

  // 5. Gemappte ausstehende Anfragen
  const pendingRequests: PendingFriendRequest[] = pendingRaw.map(req => {
    const p = profMap.get(req.requester_id);
    return {
      id: req.id,
      requesterId: req.requester_id,
      requesterName: p?.username || p?.email || 'Unbekannter Spieler'
    };
  });

  return { friends, pendingRequests };
}

/**
 * Sendet eine Freundschaftsanfrage an einen Benutzer anhand des Benutzernamens oder der E-Mail.
 * Verwendet ausschließlich flache Queries ohne Joins und ohne .or().
 */
export async function sendFriendRequest(
  currentUserId: string,
  searchQuery: string
): Promise<FriendActionResult> {
  const query = searchQuery.trim();
  if (!currentUserId || !query) {
    return { success: false, error: 'Ungültige Eingabe oder keine aktive Sitzung.' };
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
        .eq('email', query);

      if (errEmail) throw errEmail;
      targetProfile = byEmail && byEmail.length > 0 ? byEmail[0] : null;
    }

    if (!targetProfile) {
      return { success: false, error: 'Kein Benutzer mit diesem Namen oder dieser E-Mail gefunden.' };
    }

    if (targetProfile.id === currentUserId) {
      return { success: false, error: 'Du kannst dir nicht selbst eine Freundschaftsanfrage senden.' };
    }

    // 2. Prüfen, ob bereits eine Beziehung existiert (zwei flache Abfragen statt .or())
    const [
      { data: relSent, error: errRelSent },
      { data: relRec, error: errRelRec }
    ] = await Promise.all([
      supabase
        .from('friendships')
        .select('id, status')
        .eq('requester_id', currentUserId)
        .eq('receiver_id', targetProfile.id),
      supabase
        .from('friendships')
        .select('id, status')
        .eq('requester_id', targetProfile.id)
        .eq('receiver_id', currentUserId)
    ]);

    if (errRelSent) throw errRelSent;
    if (errRelRec) throw errRelRec;

    const sentRecord = relSent?.[0];
    const recRecord = relRec?.[0];

    if (sentRecord || recRecord) {
      const status = (sentRecord || recRecord)?.status;
      if (status === 'accepted') {
        return { success: false, error: `${targetProfile.username || 'Dieser Spieler'} ist bereits dein Freund!` };
      } else if (status === 'pending') {
        if (sentRecord) {
          return { success: false, error: 'Du hast diesem Spieler bereits eine Anfrage gesendet.' };
        } else {
          return { success: false, error: 'Dieser Spieler hat dir bereits eine Anfrage gesendet. Schau unter "Ausstehende Anfragen".' };
        }
      } else {
        return { success: false, error: 'Eine vorherige Anfrage existiert bereits.' };
      }
    }

    // 3. Neue Anfrage mit Status 'pending' anlegen
    const { error: insertErr } = await supabase
      .from('friendships')
      .insert({
        requester_id: currentUserId,
        receiver_id: targetProfile.id,
        status: 'pending'
      });

    if (insertErr) throw insertErr;

    return {
      success: true,
      message: `Freundschaftsanfrage an "${targetProfile.username || targetProfile.email}" gesendet!`
    };
  } catch (err: any) {
    console.error('Fehler beim Senden der Freundschaftsanfrage:', err);
    return {
      success: false,
      error: err.message || 'Anfrage konnte nicht gesendet werden.'
    };
  }
}

/**
 * Akzeptiert eine offene Freundschaftsanfrage.
 */
export async function acceptFriendRequest(friendshipId: string): Promise<FriendActionResult> {
  if (!friendshipId) {
    return { success: false, error: 'Keine Freundschafts-ID angegeben.' };
  }

  try {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);

    if (error) throw error;
    return { success: true, message: 'Freundschaftsanfrage angenommen!' };
  } catch (err: any) {
    console.error('Fehler beim Annehmen der Anfrage:', err);
    return { success: false, error: err.message || 'Fehler beim Annehmen.' };
  }
}

/**
 * Lehnt eine offene Freundschaftsanfrage ab (löscht den Eintrag).
 */
export async function rejectFriendRequest(friendshipId: string): Promise<FriendActionResult> {
  if (!friendshipId) {
    return { success: false, error: 'Keine Freundschafts-ID angegeben.' };
  }

  try {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) throw error;
    return { success: true, message: 'Freundschaftsanfrage abgelehnt.' };
  } catch (err: any) {
    console.error('Fehler beim Ablehnen der Anfrage:', err);
    return { success: false, error: err.message || 'Fehler beim Ablehnen.' };
  }
}

/**
 * Entfernt einen Freund (beendet die Freundschaft in der Tabelle).
 */
export async function removeFriend(friendshipId: string): Promise<FriendActionResult> {
  if (!friendshipId) {
    return { success: false, error: 'Keine Freundschafts-ID angegeben.' };
  }

  try {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) throw error;
    return { success: true, message: 'Freund entfernt.' };
  } catch (err: any) {
    console.error('Fehler beim Entfernen des Freundes:', err);
    return { success: false, error: err.message || 'Fehler beim Entfernen.' };
  }
}
