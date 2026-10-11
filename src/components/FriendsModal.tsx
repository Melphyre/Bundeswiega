import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Friend, PendingFriendRequest } from '../../types';
import { PlayerTitleBadge } from './PlayerTitleBadge';
import { PlayerLevelBadge } from './PlayerLevelBadge';
import { PlayerAvatar } from './PlayerAvatar';
import {
  fetchFriendsAndRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend
} from '../services/friendService';

// Exakte URL der Sound-Datei im Vercel Blob Storage
export const BUTTON_SOUND_URL = "https://mrmtucopoztvjlis.public.blob.vercel-storage.com/click-on-mouse.wav";

const buttonAudio = typeof window !== 'undefined' ? new Audio(BUTTON_SOUND_URL) : null;
if (buttonAudio) buttonAudio.preload = 'auto';

export const playGlobalClickSound = () => {
  if (!buttonAudio) return;
  buttonAudio.currentTime = 0;
  buttonAudio.play().catch(() => {});
};

// Rückwärtskompatibler Alias
export const playButtonSound = playGlobalClickSound;

export type { Friend, PendingFriendRequest };

export interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  supabaseUser?: any;
  darkMode?: boolean;
  brandColor?: string;
  onSelectPlayer?: (playerName: string) => void;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  onClose,
  currentUserId: propCurrentUserId,
  supabaseUser,
  darkMode = true,
  brandColor = '#238183',
  onSelectPlayer
}) => {
  // Robuste Ermittlung der Benutzer-ID: Funktioniert sowohl mit currentUserId={user?.id} als auch mit supabaseUser={user}
  const currentUserId =
    (typeof propCurrentUserId === 'string'
      ? propCurrentUserId
      : (propCurrentUserId as any)?.id) ||
    (typeof supabaseUser === 'string'
      ? supabaseUser
      : supabaseUser?.id) ||
    '';
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingFriendRequest[]>([]);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [friendRequestError, setFriendRequestError] = useState<string | null>(null);
  const [friendRequestSuccess, setFriendRequestSuccess] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFriendPreview, setSelectedFriendPreview] = useState<Friend | null>(null);
  const [isFriendAvatarFullscreen, setIsFriendAvatarFullscreen] = useState(false);

  // 1. Freundesliste und offene Anfragen laden (über friendService)
  const loadFriendships = useCallback(async () => {
    if (!currentUserId) {
      setFriends([]);
      setPendingRequests([]);
      return;
    }

    try {
      setIsLoading(true);
      const { friends: loadedFriends, pendingRequests: loadedPending } =
        await fetchFriendsAndRequests(currentUserId);
      setFriends(loadedFriends);
      setPendingRequests(loadedPending);
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

  // 2. Freundschaftsanfrage senden (über friendService)
  const handleSendFriendRequest = async () => {
    setFriendRequestError(null);
    setFriendRequestSuccess(null);

    const query = friendSearchQuery.trim();
    if (!query || !currentUserId) return;

    try {
      setIsSearching(true);
      const res = await sendFriendRequest(currentUserId, query);
      if (res.success) {
        setFriendRequestSuccess(res.message || 'Anfrage gesendet!');
        setFriendSearchQuery('');
        await loadFriendships();
      } else {
        setFriendRequestError(res.error || 'Anfrage konnte nicht gesendet werden.');
      }
    } catch (err: any) {
      console.error('Fehler beim Senden der Freundschaftsanfrage:', err);
      setFriendRequestError(err.message || 'Anfrage konnte nicht gesendet werden.');
    } finally {
      setIsSearching(false);
    }
  };

  // 3. Freundschaftsanfrage annehmen (über friendService)
  const handleAcceptFriendRequest = async (friendshipId: string) => {
    try {
      const res = await acceptFriendRequest(friendshipId);
      if (res.success) {
        await loadFriendships();
      } else if (res.error) {
        console.error('Fehler beim Annehmen der Anfrage:', res.error);
      }
    } catch (e) {
      console.error('Error accepting friend request:', e);
    }
  };

  // 4. Freundschaftsanfrage ablehnen (über friendService)
  const handleRejectFriendRequest = async (friendshipId: string) => {
    try {
      const res = await rejectFriendRequest(friendshipId);
      if (res.success) {
        await loadFriendships();
      } else if (res.error) {
        console.error('Fehler beim Ablehnen der Anfrage:', res.error);
      }
    } catch (e) {
      console.error('Error rejecting friend request:', e);
    }
  };

  // 5. Freund entfernen (über friendService)
  const handleRemoveFriend = async (friendshipId: string) => {
    try {
      const res = await removeFriend(friendshipId);
      if (res.success) {
        await loadFriendships();
      } else if (res.error) {
        console.error('Fehler beim Entfernen des Freundes:', res.error);
      }
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
                    <div className="flex items-center space-x-2 font-bold text-xs flex-wrap gap-y-1">
                      <i className="fas fa-user-clock text-amber-400"></i>
                      <span>{req.requesterName}</span>
                      {req.title && <PlayerTitleBadge title={req.title} size="sm" />}
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
                      {/* Interaktives Profilbild mit Hover-Effekt & Klick für Großansicht */}
                      <div
                        onClick={() => {
                          playButtonSound();
                          if (onSelectPlayer) {
                            onSelectPlayer(f.name);
                          } else {
                            setSelectedFriendPreview(f);
                          }
                        }}
                        className="relative group cursor-pointer shrink-0"
                        title={`${f.name} - Profilbild vergrößern & Details ansehen`}
                      >
                        <PlayerAvatar
                          url={f.imageUrl}
                          name={f.name}
                          avatar_frame={f.avatar_frame}
                          className="w-11 h-11 border-2 transition-transform duration-200 group-hover:scale-105 group-active:scale-95 shadow-md"
                          style={{ borderColor: brandColor }}
                        />
                        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] pointer-events-none">
                          <i className="fas fa-search-plus"></i>
                        </div>
                      </div>

                      <div
                        className="min-w-0 cursor-pointer"
                        onClick={() => {
                          playButtonSound();
                          if (onSelectPlayer) {
                            onSelectPlayer(f.name);
                          } else {
                            setSelectedFriendPreview(f);
                          }
                        }}
                        title={`${f.name} - Details anzeigen`}
                      >
                        <div className="font-black text-xs truncate flex items-center gap-1.5 flex-wrap">
                          <span className="hover:underline">{f.name}</span>
                          <PlayerLevelBadge level={f.level || 1} size="sm" />
                          {f.title && <PlayerTitleBadge title={f.title} size="sm" />}
                        </div>
                        <div className="text-[10px] opacity-60 flex items-center space-x-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                          <span>Freund</span>
                          <span className="opacity-30">•</span>
                          <span className="text-[#238183] dark:text-[#2dd4bf] hover:underline flex items-center gap-0.5 font-bold">
                            <i className="fas fa-id-card text-[9px]"></i>
                            <span>Details</span>
                          </span>
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

      {/* Fallback-Lightbox für Profilbild in Großansicht falls kein übergeordneter Handler aktiv */}
      {isFriendAvatarFullscreen && selectedFriendPreview && (
        <div
          className="fixed inset-0 z-[990] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200"
          onClick={() => setIsFriendAvatarFullscreen(false)}
        >
          <div className="absolute top-4 right-4 flex items-center space-x-2 z-10">
            {selectedFriendPreview.imageUrl && selectedFriendPreview.imageUrl.startsWith('http') && (
              <a
                href={selectedFriendPreview.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/30 text-white text-xs font-bold transition-all flex items-center space-x-1.5 backdrop-blur-md"
              >
                <span>Original öffnen</span>
                <i className="fas fa-external-link-alt text-[10px]"></i>
              </a>
            )}
            <button
              type="button"
              onClick={() => setIsFriendAvatarFullscreen(false)}
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center text-lg cursor-pointer transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="max-w-md max-h-[85vh] flex flex-col items-center justify-center space-y-4" onClick={e => e.stopPropagation()}>
            <div className="relative p-2.5 rounded-3xl bg-gradient-to-tr from-amber-500/30 to-teal-500/10 border-2 border-teal-500/40 shadow-2xl">
              <img
                src={selectedFriendPreview.imageUrl}
                alt={selectedFriendPreview.name}
                className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl"
              />
            </div>
            <div className="text-center text-white/90 text-xs">
              <span className="font-black text-white text-base">{selectedFriendPreview.name}</span>
              <span className="mx-2 opacity-50">•</span>
              <span>Freundes-Profilbild</span>
            </div>
          </div>
        </div>
      )}

      {/* Fallback Detail-Modal für Freund */}
      {selectedFriendPreview && !isFriendAvatarFullscreen && (
        <div className="fixed inset-0 z-[950] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className={`p-6 rounded-3xl max-w-md w-full border shadow-2xl space-y-4 max-h-[85vh] flex flex-col ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
            <div className="flex items-center justify-between border-b border-gray-500/15 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-500 flex items-center justify-center text-base font-black">
                  👤
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider">Freundes-Profil</h3>
                  <p className="text-[11px] opacity-60">Großansicht des Profilbilds und Details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFriendPreview(null)}
                className="w-8 h-8 rounded-full border border-gray-500/20 flex items-center justify-center text-sm opacity-60 hover:opacity-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-black/30 border-white/5' : 'bg-gray-50 border-black/5'} flex flex-col items-center text-center space-y-3`}>
              {/* Großes Profilbild klickbar für Vollbild */}
              <button
                type="button"
                onClick={() => {
                  playButtonSound();
                  setIsFriendAvatarFullscreen(true);
                }}
                className="relative group p-1 rounded-2xl cursor-pointer hover:scale-105 transition-transform ring-2 ring-teal-500/40 hover:ring-teal-500"
                title="Klicken für Vollbild-Ansicht"
              >
                <PlayerAvatar
                  url={selectedFriendPreview.imageUrl}
                  name={selectedFriendPreview.name}
                  avatar_frame={selectedFriendPreview.avatar_frame}
                  className="w-24 h-24 rounded-2xl shadow-xl object-cover"
                />
                <div className="absolute inset-1 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <i className="fas fa-search-plus text-xl"></i>
                </div>
              </button>

              <div className="space-y-1">
                <h4 className="font-black text-lg">{selectedFriendPreview.name}</h4>
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <PlayerLevelBadge level={selectedFriendPreview.level || 1} size="md" />
                  {selectedFriendPreview.title && <PlayerTitleBadge title={selectedFriendPreview.title} size="md" />}
                </div>
              </div>

              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Bestätigter Freund</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsFriendAvatarFullscreen(true)}
                className="flex-1 py-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30 text-xs font-bold hover:bg-teal-500/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <i className="fas fa-expand text-xs"></i>
                <span>Profilbild in Groß</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedFriendPreview(null)}
                className="px-5 py-2.5 rounded-xl border border-gray-500/20 text-xs font-bold opacity-70 hover:opacity-100 cursor-pointer"
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

export default FriendsModal;

