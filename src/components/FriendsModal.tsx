import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

// Exakte URL der Sound-Datei im Vercel Blob Storage
export const BUTTON_SOUND_URL = "https://mrmtucopoztvjlis.public.blob.vercel-storage.com/click-on-mouse.wav";

let buttonAudio: HTMLAudioElement | null = null;

// Sofortiges Vorladen der Audiodatei im Browser zur Vermeidung von Latenzen
if (typeof window !== 'undefined') {
  try {
    buttonAudio = new Audio(BUTTON_SOUND_URL);
    buttonAudio.preload = 'auto';
  } catch {
    // Bei SSR oder Init ignorieren
  }
}

/**
 * Wiederverwendbare Audio-Helper-Funktion für sofortiges Button-Klick-Feedback.
 * Unterstützt schnelle Mehrfach-Klicks ohne Verzögerung durch Zurücksetzen auf currentTime = 0.
 */
export const playButtonSound = () => {
  try {
    if (!buttonAudio || buttonAudio.error) {
      buttonAudio = new Audio(BUTTON_SOUND_URL);
      buttonAudio.preload = 'auto';
    } else if (buttonAudio.src !== BUTTON_SOUND_URL) {
      buttonAudio.src = BUTTON_SOUND_URL;
    }

    buttonAudio.currentTime = 0;
    const playPromise = buttonAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Audio-Wiedergabe nicht möglich (z.B. Autoplay-Policy des Browsers):', err);
      });
    }
  } catch (err) {
    console.warn('Audio playback error:', err);
  }
};

export interface Friend {
  id: string;
  name: string;
  imageUrl: string;
  friendshipId: string;
}

export interface PendingFriendRequest {
  id: string;
  requesterName: string;
}

export interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  darkMode?: boolean;
  brandColor?: string;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  darkMode = true,
  brandColor = '#238183'
}) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingFriendRequest[]>([]);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [friendRequestError, setFriendRequestError] = useState<string | null>(null);
  const [friendRequestSuccess, setFriendRequestSuccess] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Freundesliste und offene Anfragen laden (flach, ohne .or(), ohne Joins)
  const loadFriendships = useCallback(async () => {
    if (!currentUserId) {
      setFriends([]);
      setPendingRequests([]);
      return;
    }

    try {
      setIsLoading(true);

      // Zwei parallele Abfragen für gesendete und empfangene Anfragen
      const [
        { data: sent, error: errSent },
        { data: received, error: errReceived }
      ] = await Promise.all([
        supabase
          .from('friendships')
          .select('id, receiver_id, status')
          .eq('requester_id', currentUserId),
        supabase
          .from('friendships')
          .select('id, requester_id, status')
          .eq('receiver_id', currentUserId)
      ]);

      if (errSent || errReceived) {
        throw (errSent || errReceived);
      }

      // Status filtern
      const acceptedSent = (sent || []).filter(r => r.status === 'accepted');
      const acceptedReceived = (received || []).filter(r => r.status === 'accepted');
      const pendingRaw = (received || []).filter(r => r.status === 'pending');

      const friendUserIds = [
        ...acceptedSent.map(r => r.receiver_id),
        ...acceptedReceived.map(r => r.requester_id)
      ];
      const pendingUserIds = pendingRaw.map(r => r.requester_id);
      const allNeededIds = Array.from(new Set([...friendUserIds, ...pendingUserIds]));

      if (allNeededIds.length === 0) {
        setFriends([]);
        setPendingRequests([]);
        return;
      }

      // Profile in einer einzigen .in()-Query nachladen
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', allNeededIds);

      if (profErr) throw profErr;

      const profMap = new Map((profiles || []).map(p => [p.id, p]));

      // Friends State befüllen
      const mappedFriends: Friend[] = [
        ...acceptedSent.map(r => {
          const prof = profMap.get(r.receiver_id);
          return {
            id: r.receiver_id,
            name: prof?.username || 'Unbekannt',
            imageUrl: prof?.avatar_url || '',
            friendshipId: r.id
          };
        }),
        ...acceptedReceived.map(r => {
          const prof = profMap.get(r.requester_id);
          return {
            id: r.requester_id,
            name: prof?.username || 'Unbekannt',
            imageUrl: prof?.avatar_url || '',
            friendshipId: r.id
          };
        })
      ].sort((a, b) => a.name.localeCompare(b.name, 'de'));

      // Pending Requests State befüllen
      const mappedPending: PendingFriendRequest[] = pendingRaw.map(req => {
        const prof = profMap.get(req.requester_id);
        return {
          id: req.id,
          requesterName: prof?.username || 'Unbekannt'
        };
      });

      setFriends(mappedFriends);
      setPendingRequests(mappedPending);
    } catch (err) {
      console.error('Fehler beim Laden der Freundschaften:', err);
      setFriends([]);
      setPendingRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  // Initiales Laden bei Öffnen des Modals
  useEffect(() => {
    if (isOpen && currentUserId) {
      loadFriendships();
    }
  }, [isOpen, currentUserId, loadFriendships]);

  // Realtime Subscription für sofortige Updates bei Anfragen/Änderungen
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`friendships_modal_${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `receiver_id=eq.${currentUserId}`
        },
        () => {
          loadFriendships();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `requester_id=eq.${currentUserId}`
        },
        () => {
          loadFriendships();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, loadFriendships]);

  // 2. Freundschaftsanfrage senden
  const handleSendFriendRequest = async () => {
    setFriendRequestError(null);
    setFriendRequestSuccess(null);

    const query = friendSearchQuery.trim();
    if (!query || !currentUserId) return;

    try {
      setIsSearching(true);

      // Profilsuche: 1. Per Username (case-insensitive)
      let { data: profiles, error: searchErr } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', query);

      if (searchErr) throw searchErr;

      // Profilsuche: 2. Fallback per E-Mail
      if (!profiles || profiles.length === 0) {
        const { data: emailProfiles, error: emailErr } = await supabase
          .from('profiles')
          .select('id, username')
          .eq('email', query);

        if (emailErr) throw emailErr;
        profiles = emailProfiles;
      }

      const targetProfile = profiles && profiles[0];

      if (!targetProfile) {
        setFriendRequestError('Kein Benutzer mit diesem Namen oder E-Mail gefunden.');
        return;
      }

      if (targetProfile.id === currentUserId) {
        setFriendRequestError('Du kannst dir nicht selbst eine Anfrage senden.');
        return;
      }

      // Bestehende Relationen prüfen (2 flache Abfragen statt .or())
      const [
        { data: relSent, error: relSentErr },
        { data: relRec, error: relRecErr }
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

      if (relSentErr || relRecErr) {
        throw (relSentErr || relRecErr);
      }

      if ((relSent && relSent.length > 0) || (relRec && relRec.length > 0)) {
        setFriendRequestError(`${targetProfile.username} ist bereits dein Freund oder hat eine offene Anfrage.`);
        return;
      }

      // Neue Freundschaftsanfrage einfügen
      const { error: insertErr } = await supabase
        .from('friendships')
        .insert({
          requester_id: currentUserId,
          receiver_id: targetProfile.id,
          status: 'pending'
        });

      if (insertErr) throw insertErr;

      setFriendRequestSuccess(`Anfrage an ${targetProfile.username} gesendet!`);
      setFriendSearchQuery('');
      loadFriendships();
    } catch (err: any) {
      console.error('Fehler beim Senden der Freundschaftsanfrage:', err);
      setFriendRequestError(err.message || 'Anfrage konnte nicht gesendet werden.');
    } finally {
      setIsSearching(false);
    }
  };

  // 3. Freundschaftsanfrage annehmen
  const handleAcceptFriendRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;
      loadFriendships();
    } catch (e) {
      console.error('Error accepting friend request:', e);
    }
  };

  // 4. Freundschaftsanfrage ablehnen
  const handleRejectFriendRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'declined' })
        .eq('id', friendshipId);

      if (error) throw error;
      loadFriendships();
    } catch (e) {
      console.error('Error rejecting friend request:', e);
    }
  };

  // 5. Freund entfernen
  const handleRemoveFriend = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
      loadFriendships();
    } catch (e) {
      console.error('Error removing friend:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-2xl rounded-3xl shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden ${
          darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-500/20 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: brandColor }}
            >
              <i className="fas fa-users text-lg"></i>
            </div>
            <div>
              <h3 className="font-black text-lg md:text-xl">Freundesliste</h3>
              <p className="text-xs opacity-60">Finde Mitspieler, verwalte Anfragen und vernetze dich</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playButtonSound();
              onClose();
            }}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-gray-500/20 hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Modal schließen"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* 1. Freund suchen / Anfrage senden */}
          <div
            className={`p-4 md:p-5 rounded-2xl border ${
              darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'
            } space-y-3`}
          >
            <h4 className="font-black text-sm uppercase tracking-wide flex items-center space-x-2">
              <i className="fas fa-user-plus" style={{ color: brandColor }}></i>
              <span>Freundschaftsanfrage senden</span>
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={friendSearchQuery}
                onChange={e => setFriendSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    playButtonSound();
                    handleSendFriendRequest();
                  }
                }}
                placeholder="Benutzername oder E-Mail suchen..."
                className={`flex-1 p-3 rounded-xl border-2 font-bold text-xs md:text-sm outline-none transition-all ${
                  darkMode
                    ? 'border-white/20 bg-slate-900 text-white focus:border-[#238183]'
                    : 'border-black/20 bg-white text-black focus:border-[#238183]'
                }`}
              />
              <button
                type="button"
                onClick={() => {
                  playButtonSound();
                  handleSendFriendRequest();
                }}
                disabled={!friendSearchQuery.trim() || isSearching}
                className="px-5 py-3 rounded-xl text-white font-black text-xs md:text-sm cursor-pointer shadow hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center space-x-2 flex-shrink-0"
                style={{ backgroundColor: brandColor }}
              >
                {isSearching ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>Suchen...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i>
                    <span>Senden</span>
                  </>
                )}
              </button>
            </div>
            {friendRequestSuccess && (
              <p className="text-xs font-bold text-emerald-500 flex items-center space-x-1.5">
                <i className="fas fa-check-circle"></i>
                <span>{friendRequestSuccess}</span>
              </p>
            )}
            {friendRequestError && (
              <p className="text-xs font-bold text-red-500 flex items-center space-x-1.5">
                <i className="fas fa-exclamation-circle"></i>
                <span>{friendRequestError}</span>
              </p>
            )}
          </div>

          {/* 2. Offene eingehende Anfragen */}
          {pendingRequests.length > 0 && (
            <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 space-y-3">
              <h4 className="font-black text-xs uppercase tracking-wide text-amber-500 flex items-center space-x-2">
                <i className="fas fa-bell"></i>
                <span>Ausstehende Anfragen ({pendingRequests.length})</span>
              </h4>
              <div className="space-y-2">
                {pendingRequests.map(req => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/10 dark:bg-black/20"
                  >
                    <div className="flex items-center space-x-2 font-bold text-xs">
                      <i className="fas fa-user-clock text-amber-400"></i>
                      <span>{req.requesterName}</span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          playButtonSound();
                          handleAcceptFriendRequest(req.id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 cursor-pointer transition-colors"
                      >
                        Annehmen
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playButtonSound();
                          handleRejectFriendRequest(req.id);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-500 font-bold text-xs hover:bg-red-500/10 cursor-pointer transition-colors"
                      >
                        Ablehnen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Liste der Freunde */}
          <div className="space-y-3">
            <h4 className="font-black text-sm uppercase tracking-wide flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <i className="fas fa-users" style={{ color: brandColor }}></i>
                <span>Meine Freunde ({friends.length})</span>
              </span>
              {isLoading && <i className="fas fa-spinner fa-spin text-xs opacity-60"></i>}
            </h4>
            {friends.length === 0 ? (
              <div className="text-center py-10 opacity-60 space-y-2">
                <i className="fas fa-user-friends text-3xl"></i>
                <p className="text-xs font-bold">Noch keine Freunde hinzugefügt.</p>
                <p className="text-[11px] opacity-70">
                  Suche oben nach deinen Mitspielern, um euch zu vernetzen!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {friends.map(f => (
                  <div
                    key={f.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                      darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      {f.imageUrl ? (
                        <img
                          src={f.imageUrl}
                          alt={f.name}
                          className="w-10 h-10 rounded-full object-cover border-2 flex-shrink-0"
                          style={{ borderColor: brandColor }}
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-black shadow flex-shrink-0"
                          style={{ backgroundColor: brandColor }}
                        >
                          {f.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-black text-xs truncate">{f.name}</div>
                        <div className="text-[10px] opacity-60 flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                          <span>Freund</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playButtonSound();
                        handleRemoveFriend(f.friendshipId);
                      }}
                      className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 cursor-pointer text-xs transition-colors flex-shrink-0"
                      title="Freund entfernen"
                    >
                      <i className="fas fa-user-minus"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-500/20 flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              playButtonSound();
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl font-bold text-xs md:text-sm border opacity-80 hover:opacity-100 cursor-pointer transition-opacity"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

export default FriendsModal;

