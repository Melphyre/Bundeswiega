import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../supabaseClient';
import { BRAND_COLOR, matchesGameMode, calculateUserModeStats, MASTER_ACHIEVEMENTS_DEFINITIONS } from '../constants';
import { getUnlockedTitles, PLAYER_TITLES, extractProfileStats } from '../constants/titlesConfig';
import PlayerTitleBadge from './PlayerTitleBadge';
import { PlayerLevelBadge } from './PlayerLevelBadge';
import { calculateLevelFromXp } from '../utils/levelSystem';
import { NAME_TAG_COLORS, getNameTagOption } from '../constants/nameTagConfig';
import { PlayerNameTag } from './PlayerNameTag';
import { Friend, PendingFriendRequest } from '../../types';
import { playButtonSound } from './FriendsModal';
import {
  fetchFriendsAndRequests,
  sendFriendRequest as apiSendFriendRequest,
  acceptFriendRequest as apiAcceptFriendRequest,
  rejectFriendRequest as apiRejectFriendRequest,
  removeFriend as apiRemoveFriend
} from '../services/friendService';

interface ProfileModalProps {
  showProfileModal: boolean;
  setShowProfileModal: (show: boolean) => void;
  supabaseUser?: any;
  currentUserId?: string;
  darkMode: boolean;
  isAdmin: boolean;
  profileTab: 'profil' | 'rekorde' | 'freunde' | 'einstellungen';
  setProfileTab: (tab: 'profil' | 'rekorde' | 'freunde' | 'einstellungen') => void;
  profileUsername: string;
  setProfileUsername: (u: string) => void;
  handleUsernameChange: () => Promise<void>;
  profileSaveState: Record<string, 'idle' | 'loading' | 'success' | 'error'>;
  setProfileSaveState: React.Dispatch<React.SetStateAction<Record<string, 'idle' | 'loading' | 'success' | 'error'>>>;
  profileSaveMessage: Record<string, string>;
  setProfileSaveMessage: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  profileEmail: string;
  setProfileEmail: (e: string) => void;
  profileNewPw: string;
  setProfileNewPw: (p: string) => void;
  profileNewPwConfirm: string;
  setProfileNewPwConfirm: (p: string) => void;
  privacyState: Record<string, boolean>;
  setPrivacyState: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleSavePrivacy: () => Promise<void>;
  profileLoadingSection: string | null;
  profileSaveMessageOld: { section: string; type: 'success' | 'error'; text: string } | null;
  profileStats: {
    gamesPlayed: number;
    totalSchnaepse: number;
    bestAvg: number | null;
    achievementsCount: number;
  };
  myGameData: any[];
  myAchievementsData: any[];
  recordsSubTab: string;
  setRecordsSubTab: (t: string) => void;
  recordsSortBy: 'datum' | 'avg' | 'schnaepse' | 'total';
  setRecordsSortBy: (s: 'datum' | 'avg' | 'schnaepse' | 'total') => void;
  recordsSortDir: 'asc' | 'desc';
  setRecordsSortDir: (d: 'asc' | 'desc') => void;
  friends?: Friend[];
  pendingRequests?: PendingFriendRequest[];
  friendSearchQuery?: string;
  setFriendSearchQuery?: (q: string) => void;
  friendRequestError?: string | null;
  friendRequestSuccess?: string | null;
  handleSendFriendRequest?: () => Promise<void>;
  handleAcceptFriendRequest?: (id: string) => Promise<void>;
  handleRejectFriendRequest?: (id: string) => Promise<void>;
  handleRemoveFriend?: (id: string) => Promise<void>;
  showDeleteProfileModal: boolean;
  setShowDeleteProfileModal: (show: boolean) => void;
  deleteProfileInput: string;
  setDeleteProfileInput: (inp: string) => void;
  deletingProfile: boolean;
  handleDeleteProfile: () => Promise<void>;
  refreshUserData?: () => Promise<void>;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  showProfileModal,
  setShowProfileModal,
  supabaseUser,
  currentUserId: propCurrentUserId,
  darkMode,
  isAdmin,
  profileTab,
  setProfileTab,
  profileUsername,
  setProfileUsername,
  handleUsernameChange,
  profileSaveState,
  profileSaveMessage,
  profileEmail,
  setProfileEmail,
  profileNewPw,
  setProfileNewPw,
  profileNewPwConfirm,
  setProfileNewPwConfirm,
  privacyState,
  setPrivacyState,
  handleSavePrivacy,
  profileLoadingSection,
  profileSaveMessageOld,
  profileStats,
  myGameData,
  myAchievementsData,
  recordsSubTab,
  setRecordsSubTab,
  recordsSortBy,
  setRecordsSortBy,
  recordsSortDir,
  setRecordsSortDir,
  friends: propFriends,
  pendingRequests: propPendingRequests,
  friendSearchQuery: propFriendSearchQuery,
  setFriendSearchQuery: propSetFriendSearchQuery,
  friendRequestError: propFriendRequestError,
  friendRequestSuccess: propFriendRequestSuccess,
  handleSendFriendRequest: propHandleSendFriendRequest,
  handleAcceptFriendRequest: propHandleAcceptFriendRequest,
  handleRejectFriendRequest: propHandleRejectFriendRequest,
  handleRemoveFriend: propHandleRemoveFriend,
  showDeleteProfileModal,
  setShowDeleteProfileModal,
  deleteProfileInput,
  setDeleteProfileInput,
  deletingProfile,
  handleDeleteProfile,
  refreshUserData,
}) => {
  const effectiveUserId =
    (typeof propCurrentUserId === 'string'
      ? propCurrentUserId
      : (propCurrentUserId as any)?.id) ||
    (typeof supabaseUser === 'string'
      ? supabaseUser
      : supabaseUser?.id) ||
    '';

  const [localFriends, setLocalFriends] = useState<Friend[]>(propFriends || []);
  const [localPendingRequests, setLocalPendingRequests] = useState<PendingFriendRequest[]>(propPendingRequests || []);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [isFriendSearching, setIsFriendSearching] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(false);

  useEffect(() => {
    if (propFriends && propFriends.length > 0) setLocalFriends(propFriends);
  }, [propFriends]);

  useEffect(() => {
    if (propPendingRequests && propPendingRequests.length > 0) setLocalPendingRequests(propPendingRequests);
  }, [propPendingRequests]);

  const friends = localFriends;
  const pendingRequests = localPendingRequests;
  const friendSearchQuery = propFriendSearchQuery !== undefined ? propFriendSearchQuery : localSearchQuery;
  const setFriendSearchQuery = propSetFriendSearchQuery || setLocalSearchQuery;
  const friendRequestError = propFriendRequestError !== undefined ? propFriendRequestError : localError;
  const friendRequestSuccess = propFriendRequestSuccess !== undefined ? propFriendRequestSuccess : localSuccess;

  // 1. Daten sicher laden (direkt über die aktive Supabase-Session)
  const reloadFriends = useCallback(async () => {
    setFriendsLoading(true);
    try {
      // Session direkt abfragen – garantiert die vollständige 36-Zeichen-UUID!
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      if (!currentUserId) {
        console.warn('Keine aktive Session gefunden.');
        return;
      }

      const result = await fetchFriendsAndRequests(currentUserId);
      setLocalFriends(result.friends);
      setLocalPendingRequests(result.pendingRequests);
    } catch (err) {
      console.error('Fehler beim Laden der Freunde in ProfileModal:', err);
    } finally {
      setFriendsLoading(false);
    }
  }, []);

  // 2. useEffect sauber steuern (verhindert Request-Spam & Infinite Loop)
  useEffect(() => {
    if (showProfileModal && profileTab === 'freunde') {
      reloadFriends();
    }
  }, [showProfileModal, profileTab, reloadFriends]);

  // 3. Freundschaftsanfrage senden
  const onSendFriendRequest = async () => {
    if (propHandleSendFriendRequest) {
      await propHandleSendFriendRequest();
      return;
    }
    const searchQuery = (friendSearchQuery || localSearchQuery).trim();
    if (!searchQuery) {
      setLocalError('Bitte gib einen Benutzernamen oder eine E-Mail ein.');
      return;
    }

    setLocalError(null);
    setLocalSuccess(null);
    setIsFriendSearching(true);

    try {
      // Session direkt abfragen – garantiert die vollständige 36-Zeichen-UUID!
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      if (!currentUserId) {
        setLocalError('Nicht angemeldet. Bitte melde dich erneut an.');
        return;
      }

      const res = await apiSendFriendRequest(currentUserId, searchQuery);
      if (res.success) {
        setLocalSuccess(res.message || 'Anfrage gesendet!');
        setFriendSearchQuery('');
        setLocalSearchQuery('');
        await reloadFriends(); // Liste direkt aktualisieren
      } else {
        setLocalError(res.error || 'Anfrage konnte nicht gesendet werden.');
      }
    } catch (err: any) {
      setLocalError(err.message || 'Fehler beim Senden');
    } finally {
      setIsFriendSearching(false);
    }
  };

  const onAcceptFriendRequest = async (id: string) => {
    if (propHandleAcceptFriendRequest) {
      await propHandleAcceptFriendRequest(id);
      await reloadFriends();
      return;
    }
    const res = await apiAcceptFriendRequest(id);
    if (res.success) await reloadFriends();
  };

  const onRejectFriendRequest = async (id: string) => {
    if (propHandleRejectFriendRequest) {
      await propHandleRejectFriendRequest(id);
      await reloadFriends();
      return;
    }
    const res = await apiRejectFriendRequest(id);
    if (res.success) await reloadFriends();
  };

  const onRemoveFriend = async (id: string) => {
    if (propHandleRemoveFriend) {
      await propHandleRemoveFriend(id);
      await reloadFriends();
      return;
    }
    const res = await apiRemoveFriend(id);
    if (res.success) await reloadFriends();
  };

  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);

  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);

  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<string | null>(null);

  const [selectedTitle, setSelectedTitle] = useState<string>('');
  const [titleLoading, setTitleLoading] = useState(false);
  const [titleMessage, setTitleMessage] = useState<string | null>(null);

  const [selectedNameBgColor, setSelectedNameBgColor] = useState<string>('none');
  const [nameBgLoading, setNameBgLoading] = useState(false);
  const [nameBgMessage, setNameBgMessage] = useState<string | null>(null);

  // Join table QR states
  const [showJoinQrModal, setShowJoinQrModal] = useState(false);
  const [joinQrValue, setJoinQrValue] = useState('');
  const [joinQrExpiry, setJoinQrExpiry] = useState<number | null>(null);
  const [joinQrRemainingSeconds, setJoinQrRemainingSeconds] = useState<number>(300);

  const generateJoinQrCode = () => {
    const currentId = effectiveUserId || supabaseUser?.id;
    if (!currentId) return;
    const name = profileUsername || supabaseUser?.user_metadata?.username || supabaseUser?.email || 'Spieler';
    const expires = Date.now() + 5 * 60 * 1000;
    const avatar = supabaseUser?.user_metadata?.avatar_url || '';
    const qrPayload = {
      userId: currentId,
      userName: name,
      imageUrl: avatar || null,
      timestamp: Date.now(),
      expires,
    };
    setJoinQrValue(btoa(JSON.stringify(qrPayload)));
    setJoinQrExpiry(expires);
    setJoinQrRemainingSeconds(300);
    setShowJoinQrModal(true);
  };

  useEffect(() => {
    if (!joinQrExpiry || !showJoinQrModal) return;
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((joinQrExpiry - Date.now()) / 1000));
      setJoinQrRemainingSeconds(diff);
      if (diff <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [joinQrExpiry, showJoinQrModal]);

  useEffect(() => {
    if (supabaseUser?.user_metadata?.title) {
      setSelectedTitle(supabaseUser.user_metadata.title);
    } else if (supabaseUser?.id) {
      const stored = localStorage.getItem(`bundeswiega_user_title_${supabaseUser.id}`);
      setSelectedTitle(stored || 'Neuling');
    } else {
      setSelectedTitle('Neuling');
    }

    const bg = supabaseUser?.user_metadata?.name_bg_color || (profileStats as any)?.name_bg_color;
    if (bg) {
      setSelectedNameBgColor(bg);
    } else if (supabaseUser?.id) {
      const stored = localStorage.getItem(`bundeswiega_user_name_bg_${supabaseUser.id}`);
      if (stored) setSelectedNameBgColor(stored);
    }
  }, [supabaseUser, showProfileModal, profileStats]);

  if (!showProfileModal) return null;

  const currentAvatarUrl = supabaseUser?.user_metadata?.avatar_url || '';

  const handleTitleChange = async (newTitle: string) => {
    const userId = supabaseUser?.id;
    if (!userId) return;

    setSelectedTitle(newTitle);
    setTitleLoading(true);
    setTitleMessage(null);

    try {
      // 1. In Supabase Auth Metadaten speichern (auth.updateUser)
      const { error: authErr } = await supabase.auth.updateUser({
        data: { title: newTitle }
      });
      if (authErr) throw authErr;

      // 2. In profiles Tabelle speichern (falls Spalte existiert)
      try {
        await supabase
          .from('profiles')
          .update({ title: newTitle })
          .eq('id', userId);
      } catch (dbErr) {
        console.warn('profiles.title update warn:', dbErr);
      }

      // 3. Im localStorage speichern
      try {
        localStorage.setItem(`bundeswiega_user_title_${userId}`, newTitle);
      } catch {
        // ignore
      }

      // 4. Backend API aufrufen
      try {
        await fetch('/api/users/update-title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, title: newTitle })
        });
      } catch {
        // ignore
      }

      setTitleMessage(`✅ Titel "${newTitle}" erfolgreich ausgerüstet!`);
      if (refreshUserData) await refreshUserData();
    } catch (e: any) {
      console.error('Fehler beim Aktualisieren des Titels:', e);
      setTitleMessage(`❌ Fehler: ${e.message || 'Titel konnte nicht gespeichert werden'}`);
    } finally {
      setTitleLoading(false);
    }
  };

  const handleNameBgColorChange = async (newColor: string) => {
    const userId = supabaseUser?.id;
    if (!userId) return;

    setSelectedNameBgColor(newColor);
    setNameBgLoading(true);
    setNameBgMessage(null);

    try {
      // 1. Supabase Auth Metadaten aktualisieren
      const { error: authErr } = await supabase.auth.updateUser({
        data: { name_bg_color: newColor }
      });
      if (authErr) console.warn('auth updateUser name_bg_color warn:', authErr);

      // 2. Profiles Tabelle aktualisieren
      try {
        await supabase
          .from('profiles')
          .update({ name_bg_color: newColor })
          .eq('id', userId);
      } catch (dbErr) {
        console.warn('profiles.name_bg_color update warn:', dbErr);
      }

      // 3. LocalStorage sichern
      try {
        localStorage.setItem(`bundeswiega_user_name_bg_${userId}`, newColor);
      } catch {
        // ignore
      }

      // 4. Backend API aufrufen
      try {
        await fetch('/api/users/update-name-bg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, name_bg_color: newColor })
        });
      } catch {
        // ignore
      }

      const opt = getNameTagOption(newColor);
      setNameBgMessage(`✅ Namenshintergrund "${opt.label}" erfolgreich gespeichert!`);
      if (refreshUserData) await refreshUserData();
    } catch (e: any) {
      console.error('Fehler beim Aktualisieren des Namenshintergrunds:', e);
      setNameBgMessage(`❌ Fehler: ${e.message || 'Konnte Hintergrund nicht speichern'}`);
    } finally {
      setNameBgLoading(false);
    }
  };

  const handleUpdateAvatar = async (url: string) => {
    const userId = supabaseUser?.id;
    if (!userId) return;
    setAvatarLoading(true);
    setAvatarMessage(null);
    try {
      const { error: authErr } = await supabase.auth.updateUser({
        data: { avatar_url: url.trim() }
      });
      if (authErr) throw authErr;

      await supabase
        .from('profiles')
        .update({ avatar_url: url.trim() })
        .eq('id', userId);

      setAvatarMessage('✅ Profilbild erfolgreich aktualisiert!');
      if (refreshUserData) await refreshUserData();
    } catch (e: any) {
      setAvatarMessage(`❌ Fehler: ${e.message || 'Konnte Bild nicht speichern'}`);
    } finally {
      setAvatarLoading(false);
    }
  };

  // Datei-Upload direkt in den Supabase Storage (Bucket 'avatars')
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const userId = supabaseUser?.id;
    if (!file || !userId) return;

    if (file.size > 2 * 1024 * 1024) {
      setAvatarMessage('❌ Bild ist zu groß (max. 2 MB erlaubt)');
      return;
    }

    setAvatarLoading(true);
    setAvatarMessage('⏳ Bild wird hochgeladen...');

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `${userId}/avatar_${Date.now()}.${fileExt}`;

      // 1. Datei in den Storage-Bucket 'avatars' hochladen
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Öffentliche HTTPS-URL des Bildes abrufen
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // 3. Echte URL in auth.users und profiles speichern
      await handleUpdateAvatar(publicUrl);
    } catch (err: any) {
      console.error('Storage Upload Fehler:', err);
      setAvatarMessage(`❌ Upload fehlgeschlagen: ${err.message || 'Speicher-Fehler'}`);
      setAvatarLoading(false);
    } finally {
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleEmailChange = async () => {
    if (!profileEmail.trim() || !supabaseUser) return;
    setEmailLoading(true);
    setEmailMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({
        email: profileEmail.trim()
      });
      if (error) throw error;
      setEmailMessage('✅ Bestätigungs-E-Mail wurde gesendet! Bitte prüfe dein Postfach.');
      if (refreshUserData) await refreshUserData();
    } catch (e: any) {
      setEmailMessage(`❌ Fehler: ${e.message || 'Konnte E-Mail nicht ändern'}`);
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!profileNewPw) {
      setPwMessage('❌ Bitte gib ein neues Passwort ein.');
      return;
    }
    if (profileNewPw.length < 6) {
      setPwMessage('❌ Das Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }
    if (profileNewPw !== profileNewPwConfirm) {
      setPwMessage('❌ Die Passwörter stimmen nicht überein.');
      return;
    }

    setPwLoading(true);
    setPwMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({
        password: profileNewPw
      });
      if (error) throw error;
      setPwMessage('✅ Passwort erfolgreich geändert!');
      setProfileNewPw('');
      setProfileNewPwConfirm('');
    } catch (e: any) {
      setPwMessage(`❌ Fehler: ${e.message || 'Konnte Passwort nicht ändern'}`);
    } finally {
      setPwLoading(false);
    }
  };

  // Korrigierte Modus-Filterung
  const filteredGames = (myGameData || []).filter(g => {
    if (!g) return false;
    if (recordsSubTab === 'alle') return true;
    return matchesGameMode(g.game_mode, recordsSubTab);
  });

  const sortedGames = [...filteredGames].sort((a, b) => {
    let valA: any, valB: any;
    switch (recordsSortBy) {
      case 'datum':
        valA = new Date(a.date ? a.date.split('.').reverse().join('-') : a.created_at || 0).getTime();
        valB = new Date(b.date ? b.date.split('.').reverse().join('-') : b.created_at || 0).getTime();
        break;
      case 'avg':
        valA = a.avg ?? 999;
        valB = b.avg ?? 999;
        break;
      case 'schnaepse':
        valA = a.time_seconds !== undefined && a.time_seconds !== null ? a.time_seconds : (a.schnaepse ?? 0);
        valB = b.time_seconds !== undefined && b.time_seconds !== null ? b.time_seconds : (b.schnaepse ?? 0);
        break;
      case 'total':
        valA = a.total ?? 0;
        valB = b.total ?? 0;
        break;
    }
    return recordsSortDir === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
  });

  const dynamicStats = calculateUserModeStats(
    myGameData,
    myAchievementsData,
    supabaseUser?.id || '',
    recordsSubTab
  );

  // Subtab-Liste für echtes Modus-Filtering
  const modeSubTabs = [
    { key: 'alle', label: 'Alle Modis' },
    { key: 'Standardspiel (500ml)', label: 'Standard (500ml)' },
    { key: 'Standardspiel (0,33L)', label: 'Standard (0.33L)' },
    { key: 'Speedwiegen (500ml)', label: 'Speed (500ml)' },
    { key: 'Speedwiegen (0,33L)', label: 'Speed (0.33L)' },
    { key: 'Teamwiegen', label: 'Teamwiegen' }
  ];

  return (
    <>
      <div className="fixed inset-0 z-[700] flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
        <div
          className={`rounded-3xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[92dvh] border-2 ${
            darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-gray-900'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 md:p-6 pb-4 border-b border-gray-500/20 flex-shrink-0">
            <div className="flex items-center space-x-3">
              {currentAvatarUrl ? (
                <img
                  src={currentAvatarUrl}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover border-2 shadow-sm"
                  style={{ borderColor: BRAND_COLOR }}
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black shadow-sm"
                  style={{ backgroundColor: BRAND_COLOR }}
                >
                  <i className="fas fa-user"></i>
                </div>
              )}
              <div>
                <h3 className="text-lg md:text-xl font-black flex items-center space-x-2 flex-wrap gap-y-1">
                  <PlayerNameTag
                    name={supabaseUser?.user_metadata?.username || supabaseUser?.email || 'Mein Profil'}
                    colorKey={selectedNameBgColor}
                    className="px-2.5 py-0.5"
                  />
                  {selectedTitle && <PlayerTitleBadge title={selectedTitle} size="md" />}
                  <PlayerLevelBadge level={extractProfileStats(profileStats).level} size="sm" />
                  {isAdmin && <span className="text-yellow-400 text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 border border-yellow-400/30">👑 Admin</span>}
                </h3>
                <p className="text-xs opacity-60">{supabaseUser?.email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                playButtonSound();
                setShowProfileModal(false);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-lg"
            >
              ✕
            </button>
          </div>

          {/* Tabs Navigation */}
          <div className="flex border-b border-gray-500/20 px-4 md:px-6 flex-shrink-0 overflow-x-auto">
            {[
              { key: 'profil' as const, label: '👤 Mein Profil', count: undefined },
              { key: 'rekorde' as const, label: '🎮 Meine Spiele', count: myGameData.length },
              { key: 'freunde' as const, label: '👥 Freunde', count: friends.length + (pendingRequests.length > 0 ? ` (${pendingRequests.length} neu)` : '') },
              { key: 'einstellungen' as const, label: '⚙️ Einstellungen', count: undefined }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  playButtonSound();
                  setProfileTab(tab.key);
                }}
                className={`py-3 px-4 font-black text-xs md:text-sm border-b-2 transition-all cursor-pointer flex-shrink-0 flex items-center space-x-1.5 ${
                  profileTab === tab.key
                    ? 'border-[#238183] text-[#238183]'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="text-[11px] opacity-70 font-mono">
                    {typeof tab.count === 'string' ? tab.count : `(${tab.count})`}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {/* TAB 1: PROFIL */}
            {profileTab === 'profil' && (
              <div className="space-y-6">
                {/* 📱 AN SPIEL PER QR CODE TEILNEHMEN (GANZ OBEN) */}
                <div className={`p-4 md:p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-3`}>
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-sm uppercase tracking-wide flex items-center space-x-2">
                      <i className="fas fa-qrcode text-[#238183]"></i>
                      <span>Live-Spiel / Turniertisch</span>
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400">
                      Check-in
                    </span>
                  </div>
                  <p className="text-xs opacity-70">
                    Lass deinen QR-Code vom Host oder Spielleiter scannen, um ohne Eintippen direkt mit deinem Profil am Spiel/Tisch teilzunehmen.
                  </p>
                  <button
                    type="button"
                    onClick={generateJoinQrCode}
                    className="w-full py-3.5 px-4 rounded-xl text-white font-black text-xs md:text-sm shadow-md hover:opacity-90 transition-all transform active:scale-98 flex items-center justify-center space-x-2 cursor-pointer"
                    style={{ backgroundColor: BRAND_COLOR }}
                  >
                    <i className="fas fa-qrcode text-base"></i>
                    <span>an Spiel per QR Code teilnehmen</span>
                  </button>
                </div>

                {/* Profilbild */}
                <div className={`p-4 md:p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-4`}>
                  <h4 className="font-black text-sm uppercase tracking-wide flex items-center space-x-2">
                    <i className="fas fa-camera text-[#238183]"></i>
                    <span>Profilbild (Avatar)</span>
                  </h4>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {currentAvatarUrl ? (
                      <img src={currentAvatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 shadow" style={{ borderColor: BRAND_COLOR }} />
                    ) : (
                      <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black shadow" style={{ backgroundColor: BRAND_COLOR }}>
                        <i className="fas fa-user"></i>
                      </div>
                    )}
                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex flex-wrap gap-2 items-center">
                        <label className="px-4 py-2 rounded-xl text-xs font-bold bg-[#238183] text-white cursor-pointer hover:opacity-90">
                          <span>Bild hochladen</span>
                          <input type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />
                        </label>
                        {currentAvatarUrl && (
                          <button type="button" onClick={() => handleUpdateAvatar('')} className="px-3 py-2 rounded-xl text-xs font-bold border border-red-500/40 text-red-500 hover:bg-red-500/10 cursor-pointer">
                            Entfernen
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="url"
                          value={avatarUrlInput}
                          onChange={e => setAvatarUrlInput(e.target.value)}
                          placeholder="Oder Bild-URL einfügen"
                          className={`flex-1 p-2 rounded-xl border text-xs ${darkMode ? 'border-white/20 bg-slate-900 text-white' : 'border-black/20 bg-white text-black'}`}
                        />
                        <button
                          type="button"
                          onClick={() => { if (avatarUrlInput.trim()) handleUpdateAvatar(avatarUrlInput.trim()); }}
                          disabled={!avatarUrlInput.trim() || avatarLoading}
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-40 cursor-pointer"
                        >
                          URL setzen
                        </button>
                      </div>
                      {avatarMessage && <p className={`text-xs font-bold ${avatarMessage.startsWith('✅') ? 'text-emerald-500' : 'text-red-500'}`}>{avatarMessage}</p>}
                    </div>
                  </div>
                </div>

                {/* Aktiver Spielertitel */}
                {(() => {
                  const unlockedTitles = getUnlockedTitles(profileStats);
                  return (
                    <div className={`p-4 md:p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-3`}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h4 className="font-black text-sm uppercase tracking-wide flex items-center space-x-2">
                          <i className="fas fa-crown text-[#238183]"></i>
                          <span>Aktiver Titel</span>
                        </h4>
                        {selectedTitle && (
                          <PlayerTitleBadge title={selectedTitle} size="md" />
                        )}
                      </div>

                      <p className="text-xs opacity-70">
                        Wähle deinen angezeigten Titel. Noch nicht freigeschaltete Titel werden erst sichtbar, wenn du die jeweiligen Spielziele erreicht hast:
                      </p>

                      <div className="space-y-2">
                        <select
                          value={selectedTitle || 'Neuling'}
                          onChange={(e) => handleTitleChange(e.target.value)}
                          disabled={titleLoading}
                          className={`w-full p-3 rounded-xl border-2 font-bold text-sm cursor-pointer transition-all ${
                            darkMode ? 'border-white/20 bg-slate-900 text-white' : 'border-black/20 bg-white text-black'
                          }`}
                        >
                          {unlockedTitles.map((t) => (
                            <option key={t.id} value={t.name}>
                              {t.icon} {t.name} ({t.description})
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center justify-between text-[11px] opacity-60 px-1 pt-1 flex-wrap gap-1">
                          <span>
                            Freigeschaltet: <strong className="text-emerald-500">{unlockedTitles.length}</strong> von {PLAYER_TITLES.length} Titeln
                          </span>
                          <span>{titleLoading ? 'Speichere Titel...' : 'Wird in Ranglisten & Profil angezeigt'}</span>
                        </div>
                      </div>

                      {titleMessage && (
                        <p className={`text-xs font-bold ${titleMessage.startsWith('✅') ? 'text-emerald-500' : 'text-red-500'}`}>
                          {titleMessage}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Sektion: Design & Anpassen (Namenshintergrund-System) */}
                {(() => {
                  const stats = extractProfileStats(profileStats);
                  const levelInfo = calculateLevelFromXp(stats.xp);
                  const isUnlocked = levelInfo.level >= 2;
                  const currentName = profileUsername || supabaseUser?.user_metadata?.username || supabaseUser?.email || 'Spieler';

                  return (
                    <div className={`p-4 md:p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-4`}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">
                            <i className="fas fa-palette"></i>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-black text-sm uppercase tracking-wide">
                                Design & Anpassen
                              </h4>
                              {isUnlocked ? (
                                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                                  Freigeschaltet (Level {levelInfo.level})
                                </span>
                              ) : (
                                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center">
                                  <i className="fas fa-lock text-[9px] mr-1"></i>
                                  Freischaltung ab Level 2
                                </span>
                              )}
                            </div>
                            <p className="text-xs opacity-60">
                              Personalisiere deinen Namenshintergrund für Spieltabelle & Ranglisten
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Fall 1: Noch nicht freigeschaltet (Level < 2) */}
                      {!isUnlocked ? (
                        <div className={`p-4 rounded-xl border relative overflow-hidden ${
                          darkMode ? 'bg-slate-900/70 border-amber-500/30' : 'bg-amber-50/70 border-amber-200'
                        }`}>
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center text-lg flex-shrink-0">
                              <i className="fas fa-lock"></i>
                            </div>
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <h5 className="font-black text-xs md:text-sm text-amber-600 dark:text-amber-400">
                                Feature gesperrt: Freischaltung ab Level 2
                              </h5>
                              <p className="text-xs opacity-80 leading-relaxed">
                                Erreiche Stufe 2 (100 Gesamt-XP), um das Name-Tag Design-System freizuschalten und deinen Namen mit Rot, Blau, Grün oder Gelb einzufärben!
                              </p>
                              <div className="pt-1 flex items-center space-x-2 text-[11px] font-bold opacity-70">
                                <span>Noch {Math.max(0, 100 - stats.xp)} XP bis zur Freischaltung</span>
                              </div>
                            </div>
                          </div>

                          {/* Vorschau der gesperrten Farboptionen (ausgegraut / disabled) */}
                          <div className="mt-3 pt-3 border-t border-gray-500/20 flex flex-wrap gap-2 opacity-50 pointer-events-none">
                            {NAME_TAG_COLORS.map((c) => (
                              <div
                                key={c.id}
                                className="px-2.5 py-1 rounded-lg border text-xs flex items-center space-x-1.5 bg-black/5 dark:bg-white/5"
                              >
                                {c.id !== 'none' && (
                                  <span
                                    className="w-3 h-3 rounded-full border border-black/20"
                                    style={{ backgroundColor: c.bgHex }}
                                  />
                                )}
                                <span>{c.label}</span>
                                <i className="fas fa-lock text-[9px] opacity-60"></i>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        /* Fall 2: Freigeschaltet (Level >= 2) */
                        <div className="space-y-3">
                          <label className="block text-xs font-bold opacity-80">
                            Wähle deinen Namenshintergrund:
                          </label>

                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            {NAME_TAG_COLORS.map((opt) => {
                              const isSelected = selectedNameBgColor === opt.id || (!selectedNameBgColor && opt.id === 'none');
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  disabled={nameBgLoading}
                                  onClick={() => handleNameBgColorChange(opt.id)}
                                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center space-y-1.5 cursor-pointer relative ${
                                    isSelected
                                      ? 'ring-2 ring-[#238183] border-[#238183] bg-[#238183]/10 shadow-sm'
                                      : (darkMode ? 'bg-slate-900/50 border-slate-700 hover:border-slate-500' : 'bg-white border-gray-200 hover:border-gray-300')
                                  }`}
                                >
                                  {isSelected && (
                                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#238183] text-white flex items-center justify-center text-[9px]">
                                      <i className="fas fa-check"></i>
                                    </div>
                                  )}

                                  {opt.id === 'none' ? (
                                    <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center text-[10px] opacity-60">
                                      ✕
                                    </div>
                                  ) : (
                                    <div
                                      className="w-6 h-6 rounded-full border-2 border-white/60 shadow-sm"
                                      style={{ backgroundColor: opt.bgHex }}
                                    />
                                  )}

                                  <span className="text-[11px] truncate">{opt.label}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Live-Vorschau */}
                          <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
                            darkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-white border-gray-200'
                          }`}>
                            <span className="text-[11px] font-bold opacity-60">
                              Live-Vorschau in Spiel & Rangliste:
                            </span>
                            <div className="flex items-center space-x-2">
                              <PlayerNameTag
                                name={currentName}
                                colorKey={selectedNameBgColor}
                                className="text-xs px-3 py-1 font-black"
                              />
                              {selectedTitle && (
                                <PlayerTitleBadge title={selectedTitle} size="sm" />
                              )}
                            </div>
                          </div>

                          {/* Rückmeldung */}
                          {nameBgMessage && (
                            <p className={`text-xs font-bold animate-in fade-in ${nameBgMessage.startsWith('✅') ? 'text-emerald-500' : 'text-red-500'}`}>
                              {nameBgMessage}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Level & XP Fortschritt */}
                {(() => {
                  const stats = extractProfileStats(profileStats);
                  const currentXp = stats.xp;
                  const levelInfo = calculateLevelFromXp(currentXp);
                  return (
                    <div className={`p-4 md:p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-4`}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center space-x-3">
                          <PlayerLevelBadge level={levelInfo.level} size="lg" />
                          <div>
                            <h4 className="font-black text-sm uppercase tracking-wide">
                              Level {levelInfo.level}
                            </h4>
                            <p className="text-xs opacity-60">
                              {levelInfo.totalXp.toLocaleString('de-DE')} Gesamt-XP
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black text-teal-600 dark:text-teal-400">
                            {levelInfo.currentLevelXp} / {levelInfo.neededForNextLevel} XP
                          </span>
                          <span className="block text-[10px] opacity-60">
                            bis Stufe {levelInfo.level + 1}
                          </span>
                        </div>
                      </div>

                      {/* Fortschrittsbalken */}
                      <div className="space-y-1.5">
                        <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-3.5 p-0.5 overflow-hidden border border-black/5 dark:border-white/5">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shadow-sm"
                            style={{ width: `${Math.min(100, Math.max(0, levelInfo.progressPercent))}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] opacity-60 font-semibold px-0.5">
                          <span>Fortschritt: {levelInfo.progressPercent}%</span>
                          <span>Noch {Math.max(0, levelInfo.neededForNextLevel - levelInfo.currentLevelXp)} XP nötig</span>
                        </div>
                      </div>

                      {/* Nächster Meilenstein / Belohnung */}
                      {levelInfo.nextReward && (
                        <div className={`p-3 rounded-xl border flex items-center space-x-3 text-xs ${
                          darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-gray-200'
                        }`}>
                          <div className="text-xl">{levelInfo.nextReward.title ? '👑' : '🎁'}</div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] uppercase font-black tracking-wider opacity-60 block">
                              Nächste Belohnung (Stufe {levelInfo.nextReward.level}):
                            </span>
                            <span className="font-bold text-teal-600 dark:text-teal-400 truncate block">
                              {levelInfo.nextReward.title ? `Titel "${levelInfo.nextReward.title}"` : levelInfo.nextReward.badge}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TAB 2: MEINE REKORDE & STATS */}
            {profileTab === 'rekorde' && (
              <div className="space-y-6">
                {/* Subtabs Modus-Filter */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {modeSubTabs.map(sub => (
                    <button
                      key={sub.key}
                      onClick={() => setRecordsSubTab(sub.key)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase cursor-pointer transition-all flex-shrink-0 ${
                        recordsSubTab === sub.key ? 'bg-[#238183] text-white shadow' : 'bg-black/10 dark:bg-white/10 hover:opacity-100 opacity-70'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>

                {/* Statistik-Karten (Case-Insensitive Check für Speedwiegen) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className={`p-4 rounded-2xl border text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="text-2xl font-black text-[#238183]">{dynamicStats.gamesPlayed}</div>
                    <div className="text-[11px] font-bold opacity-60 uppercase mt-1">Spiele absolviert</div>
                  </div>
                  <div className={`p-4 rounded-2xl border text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="text-2xl font-black text-amber-500">
                      {recordsSubTab.toLowerCase().includes('speed')
                        ? `${dynamicStats.bestTime ? dynamicStats.bestTime.toFixed(1) + 's' : '-'}`
                        : (dynamicStats.gamesPlayed && dynamicStats.gamesPlayed > 0
                            ? (dynamicStats.totalSchnaepse / dynamicStats.gamesPlayed).toFixed(1)
                            : '0.0')}
                    </div>
                    <div className="text-[11px] font-bold opacity-60 uppercase mt-1">
                      {recordsSubTab.toLowerCase().includes('speed') ? 'Beste Zeit' : 'Ø Schnäpse pro Spiel'}
                    </div>
                  </div>
                  <div className={`p-4 rounded-2xl border text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="text-2xl font-black text-emerald-500">
                      {dynamicStats.bestAvg !== null ? dynamicStats.bestAvg.toFixed(2) : '-'}
                    </div>
                    <div className="text-[11px] font-bold opacity-60 uppercase mt-1">Bester Ø (Abweichung)</div>
                  </div>
                  <div className={`p-4 rounded-2xl border text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="text-2xl font-black text-purple-500">{myAchievementsData.length}</div>
                    <div className="text-[11px] font-bold opacity-60 uppercase mt-1">Errungenschaften</div>
                  </div>
                </div>

                {/* Rekorde-Tabelle */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-sm uppercase">Spielverlauf ({sortedGames.length})</h4>
                    <div className="flex gap-2 text-xs">
                      <select
                        value={recordsSortBy}
                        onChange={e => setRecordsSortBy(e.target.value as any)}
                        className={`p-1.5 rounded-lg border font-bold ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300'}`}
                      >
                        <option value="datum">Datum</option>
                        <option value="avg">Bester Ø</option>
                        <option value="schnaepse">Schnäpse / Zeit</option>
                      </select>
                      <button
                        onClick={() => setRecordsSortDir(recordsSortDir === 'asc' ? 'desc' : 'asc')}
                        className="px-2 py-1 rounded-lg bg-black/10 dark:bg-white/10 font-bold cursor-pointer"
                      >
                        {recordsSortDir === 'asc' ? '▲' : '▼'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {sortedGames.length === 0 ? (
                      <p className="text-xs opacity-50 text-center py-4">Keine Spiele für diesen Modus gefunden.</p>
                    ) : (
                      sortedGames.map((g, idx) => (
                        <div key={g.id || idx} className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${darkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-gray-50 border-gray-200'}`}>
                          <div>
                            <div className="text-sm font-black">{g.game_mode || 'Standard'}</div>
                            <div className="text-[10px] opacity-50">{g.date || (g.created_at ? new Date(g.created_at).toLocaleDateString() : 'Unbekannt')}</div>
                          </div>
                          <div className="text-right space-x-3">
                            <span className="text-emerald-500">Ø {g.avg !== undefined ? Number(g.avg).toFixed(2) : '-'}</span>
                            {g.time_seconds ? (
                              <span className="text-amber-500">{Number(g.time_seconds).toFixed(1)}s</span>
                            ) : (
                              <span className="text-amber-500">{g.schnaepse ?? 0} Schnäpse</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* NEU: Anzeige freigeschalteter Errungenschaften (Badges) */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-black text-sm uppercase flex items-center gap-2 text-purple-400">
                    <i className="fas fa-trophy"></i>
                    <span>Freigeschaltete Badges ({myAchievementsData.length})</span>
                  </h4>
                  {myAchievementsData.length === 0 ? (
                    <p className="text-xs opacity-50 text-center py-2">Noch keine Errungenschaften freigeschaltet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                      {myAchievementsData.map((ach: any) => {
                        const def = MASTER_ACHIEVEMENTS_DEFINITIONS.find(d => d.id === ach.achievement_id || d.title === ach.title);
                        return (
                          <div
                            key={ach.id || ach.achievement_id}
                            className={`p-3 rounded-xl border flex items-center space-x-3 ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-gray-50 border-gray-200'}`}
                          >
                            <div className="text-2xl">{def?.icon || '🏆'}</div>
                            <div className="overflow-hidden">
                              <div className="font-black text-xs truncate">{def?.title || ach.title || 'Badge'}</div>
                              <div className="text-[10px] opacity-60 line-clamp-1">{def?.description || ach.description || ''}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: FREUNDE */}
            {profileTab === 'freunde' && (
              <div className="space-y-6">
                {/* Freundschaftsanfrage Senden (mit Enter-Key Handling) */}
                <div className={`p-4 md:p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-3`}>
                  <h4 className="font-black text-sm uppercase tracking-wide flex items-center space-x-2">
                    <i className="fas fa-user-plus text-[#238183]"></i>
                    <span>Freund hinzufügen</span>
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={friendSearchQuery}
                      onChange={e => setFriendSearchQuery(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && friendSearchQuery.trim() && !isFriendSearching) {
                          onSendFriendRequest();
                        }
                      }}
                      placeholder="Benutzername oder E-Mail"
                      className={`flex-1 p-3 rounded-xl border-2 font-bold text-sm ${darkMode ? 'border-white/20 bg-slate-900 text-white' : 'border-black/20 bg-white text-black'}`}
                    />
                    <button
                      type="button"
                      onClick={onSendFriendRequest}
                      disabled={isFriendSearching || !friendSearchQuery.trim()}
                      className="px-5 py-3 rounded-xl text-white font-black text-xs md:text-sm cursor-pointer shadow hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: BRAND_COLOR }}
                    >
                      {isFriendSearching ? 'Sende...' : 'Anfrage Senden'}
                    </button>
                  </div>
                  {friendRequestError && <p className="text-xs font-bold text-red-500">{friendRequestError}</p>}
                  {friendRequestSuccess && <p className="text-xs font-bold text-emerald-500">{friendRequestSuccess}</p>}
                </div>

                {/* Offene Anfragen */}
                {pendingRequests.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-black text-sm uppercase text-amber-500 flex items-center gap-2">
                      <i className="fas fa-clock"></i>
                      <span>Eingehende Anfragen ({pendingRequests.length})</span>
                    </h4>
                    <div className="space-y-2">
                      {pendingRequests.map(req => (
                        <div key={req.id} className={`p-3 rounded-xl border flex items-center justify-between ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                          <span className="font-bold text-sm">{req.requesterName}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => onAcceptFriendRequest(req.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                            >
                              Annehmen
                            </button>
                            <button
                              onClick={() => onRejectFriendRequest(req.id)}
                              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 cursor-pointer"
                            >
                              Ablehnen
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meine Freunde */}
                <div className="space-y-3">
                  <h4 className="font-black text-sm uppercase flex items-center gap-2">
                    <i className="fas fa-users text-[#238183]"></i>
                    <span>Meine Freunde ({friends.length})</span>
                  </h4>
                  {friends.length === 0 ? (
                    <p className="text-xs opacity-50 py-4 text-center">Du hast noch keine Freunde hinzugefügt.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {friends.map(f => (
                        <div key={f.id} className={`p-3 rounded-xl border flex items-center justify-between ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-center space-x-3">
                            {f.imageUrl ? (
                              <img src={f.imageUrl} alt={f.name} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-[#238183] text-white flex items-center justify-center font-bold text-xs">
                                {f.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm">{f.name}</span>
                              <PlayerLevelBadge level={f.level || 1} size="sm" />
                              {f.title && <PlayerTitleBadge title={f.title} size="sm" />}
                            </div>
                          </div>
                          <button
                            onClick={() => onRemoveFriend(f.friendshipId)}
                            className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-500 hover:bg-red-500/10 text-xs font-bold cursor-pointer"
                          >
                            Entfernen
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: EINSTELLUNGEN */}
            {profileTab === 'einstellungen' && (
              <div className="space-y-6">
                {/* Benutzername */}
                <div className={`p-4 md:p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-3`}>
                  <h4 className="font-black text-sm uppercase tracking-wide flex items-center space-x-2">
                    <i className="fas fa-id-card text-[#238183]"></i>
                    <span>Benutzername ändern</span>
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={profileUsername}
                      onChange={e => setProfileUsername(e.target.value)}
                      placeholder="Dein neuer Benutzername"
                      className={`flex-1 p-3 rounded-xl border-2 font-bold text-sm ${darkMode ? 'border-white/20 bg-slate-900 text-white' : 'border-black/20 bg-white text-black'}`}
                    />
                    <button
                      type="button"
                      onClick={handleUsernameChange}
                      disabled={profileSaveState.username === 'loading'}
                      className="px-5 py-3 rounded-xl text-white font-black text-xs md:text-sm cursor-pointer shadow hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: BRAND_COLOR }}
                    >
                      {profileSaveState.username === 'loading' ? 'Speichern...' : 'Speichern'}
                    </button>
                  </div>
                  {profileSaveMessage.username && (
                    <p className={`text-xs font-bold ${profileSaveMessage.username.startsWith('✅') ? 'text-emerald-500' : 'text-red-500'}`}>{profileSaveMessage.username}</p>
                  )}
                </div>

                {/* E-Mail */}
                <div className={`p-4 md:p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-3`}>
                  <h4 className="font-black text-sm uppercase tracking-wide flex items-center space-x-2">
                    <i className="fas fa-envelope text-[#238183]"></i>
                    <span>E-Mail-Adresse</span>
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={e => setProfileEmail(e.target.value)}
                      placeholder="name@beispiel.de"
                      className={`flex-1 p-3 rounded-xl border-2 font-bold text-sm ${darkMode ? 'border-white/20 bg-slate-900 text-white' : 'border-black/20 bg-white text-black'}`}
                    />
                    <button
                      type="button"
                      onClick={handleEmailChange}
                      disabled={emailLoading || profileEmail === supabaseUser?.email}
                      className="px-4 py-3 rounded-xl text-white font-bold text-xs md:text-sm cursor-pointer shadow hover:opacity-90 disabled:opacity-40"
                      style={{ backgroundColor: BRAND_COLOR }}
                    >
                      {emailLoading ? 'Aktualisieren...' : 'Aktualisieren'}
                    </button>
                  </div>
                  {emailMessage && <p className={`text-xs font-bold ${emailMessage.startsWith('✅') ? 'text-emerald-500' : 'text-red-500'}`}>{emailMessage}</p>}
                </div>

                {/* Passwort */}
                <div className={`p-4 md:p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-3`}>
                  <h4 className="font-black text-sm uppercase tracking-wide flex items-center space-x-2">
                    <i className="fas fa-lock text-[#238183]"></i>
                    <span>Passwort ändern</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="password"
                      value={profileNewPw}
                      onChange={e => setProfileNewPw(e.target.value)}
                      placeholder="Neues Passwort (mind. 6 Zeichen)"
                      className={`p-3 rounded-xl border-2 font-bold text-sm ${darkMode ? 'border-white/20 bg-slate-900 text-white' : 'border-black/20 bg-white text-black'}`}
                    />
                    <input
                      type="password"
                      value={profileNewPwConfirm}
                      onChange={e => setProfileNewPwConfirm(e.target.value)}
                      placeholder="Passwort wiederholen"
                      className={`p-3 rounded-xl border-2 font-bold text-sm ${darkMode ? 'border-white/20 bg-slate-900 text-white' : 'border-black/20 bg-white text-black'}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handlePasswordChange}
                    disabled={pwLoading || !profileNewPw}
                    className="w-full py-3 rounded-xl text-white font-black text-xs md:text-sm cursor-pointer shadow hover:opacity-90 disabled:opacity-40"
                    style={{ backgroundColor: BRAND_COLOR }}
                  >
                    {pwLoading ? 'Passwort wird geändert...' : 'Neues Passwort festlegen'}
                  </button>
                  {pwMessage && <p className={`text-xs font-bold ${pwMessage.startsWith('✅') ? 'text-emerald-500' : 'text-red-500'}`}>{pwMessage}</p>}
                </div>

                {/* Datenschutz */}
                <div className={`p-4 md:p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-4`}>
                  <h4 className="font-black text-sm uppercase tracking-wide flex items-center space-x-2">
                    <i className="fas fa-shield-alt text-[#238183]"></i>
                    <span>Sichtbarkeit & Datenschutz</span>
                  </h4>
                  <div className="space-y-2.5">
                    {[
                      { key: 'showRecords', label: 'Meine Ergebnisse in den globalen Rekordlisten anzeigen' },
                      { key: 'showStandardspiel', label: 'Standardspiel-Ergebnisse öffentlich listen' },
                      { key: 'showSpeedwiegen', label: 'Speedwiegen-Ergebnisse öffentlich listen' },
                      { key: 'showTeamwiegen', label: 'Teamwiegen-Ergebnisse öffentlich listen' },
                      { key: 'showAchievements', label: 'Freigeschaltete Errungenschaften öffentlich zeigen' }
                    ].map(item => (
                      <label key={item.key} className="flex items-center justify-between p-2.5 rounded-xl bg-black/5 dark:bg-white/5 cursor-pointer hover:opacity-90">
                        <span className="text-xs font-bold pr-2">{item.label}</span>
                        <input
                          type="checkbox"
                          checked={privacyState[item.key] ?? true}
                          onChange={e => setPrivacyState(prev => ({ ...prev, [item.key]: e.target.checked }))}
                          className="w-5 h-5 accent-[#238183] cursor-pointer rounded"
                        />
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleSavePrivacy}
                    disabled={profileLoadingSection === 'privacy'}
                    className="w-full py-3 rounded-xl text-white font-black text-xs md:text-sm cursor-pointer shadow hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: BRAND_COLOR }}
                  >
                    {profileLoadingSection === 'privacy' ? 'Speichern...' : 'Datenschutzeinstellungen speichern'}
                  </button>
                  {profileSaveMessageOld?.section === 'privacy' && (
                    <p className={`text-xs font-bold ${profileSaveMessageOld.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {profileSaveMessageOld.text}
                    </p>
                  )}
                </div>

                {/* Gefahrenzone */}
                <div className="p-4 md:p-5 rounded-2xl border border-red-500/30 bg-red-500/5 space-y-3">
                  <h4 className="font-black text-sm uppercase tracking-wide text-red-500 flex items-center space-x-2">
                    <i className="fas fa-trash-alt"></i>
                    <span>Gefahrenzone: Account löschen</span>
                  </h4>
                  <p className="text-xs opacity-70">
                    Löscht deinen Benutzeraccount unwiderruflich aus der Datenbank samt aller persönlichen Statistiken.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowDeleteProfileModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs cursor-pointer shadow"
                  >
                    Account unwiderruflich löschen...
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Prominenter Button ganz unten: Zurück ins Hauptmenü */}
          <div className="p-4 md:p-5 border-t border-gray-500/20 flex-shrink-0 flex justify-center bg-black/5 dark:bg-white/5 rounded-b-3xl">
            <button
              type="button"
              onClick={() => {
                playButtonSound();
                setShowProfileModal(false);
              }}
              className="w-full max-w-sm py-3.5 px-6 rounded-2xl text-white font-black text-sm md:text-base cursor-pointer shadow-lg hover:opacity-90 transition-all transform active:scale-95 flex items-center justify-center space-x-2"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              <i className="fas fa-arrow-left"></i>
              <span>Zurück ins Hauptmenü</span>
            </button>
          </div>
        </div>
      </div>

      {/* NEU: Vollständiges Bestätigungs-Modal für "Account löschen" */}
      {showDeleteProfileModal && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className={`p-6 rounded-3xl max-w-md w-full border-2 space-y-4 shadow-2xl ${darkMode ? 'bg-slate-900 border-red-500/50 text-white' : 'bg-white border-red-500/50 text-gray-900'}`}>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center text-xl font-black mx-auto">
                ⚠️
              </div>
              <h3 className="text-xl font-black text-red-500">Account unwiderruflich löschen</h3>
              <p className="text-xs opacity-80 leading-relaxed">
                Diese Aktion löscht deinen Account und **alle** deine gespeicherten Spiele und Statistiken dauerhaft. Das kann nicht rückgängig gemacht werden!
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold block text-center opacity-70">
                Tippe <span className="font-mono font-black text-red-500">LÖSCHEN</span> zum Bestätigen:
              </label>
              <input
                type="text"
                value={deleteProfileInput}
                onChange={e => setDeleteProfileInput(e.target.value)}
                placeholder="LÖSCHEN"
                className={`w-full p-3 text-center font-black rounded-xl border-2 text-sm ${darkMode ? 'border-red-500/30 bg-slate-800 text-white' : 'border-red-500/30 bg-gray-50 text-black'}`}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowDeleteProfileModal(false);
                  setDeleteProfileInput('');
                }}
                className="flex-1 py-3 rounded-xl font-black text-xs bg-slate-700 text-white hover:bg-slate-600 cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDeleteProfile}
                disabled={deleteProfileInput !== 'LÖSCHEN' || deletingProfile}
                className="flex-1 py-3 rounded-xl font-black text-xs bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 cursor-pointer shadow"
              >
                {deletingProfile ? 'Lösche...' : 'Endgültig Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📱 QR JOIN CODE MODAL */}
      {showJoinQrModal && (
        <div
          className="fixed inset-0 z-[970] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowJoinQrModal(false);
          }}
        >
          <div
            className={`rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-5 border-2 text-center relative animate-in zoom-in-95 ${
              darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-gray-900'
            }`}
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b pb-3 border-gray-500/20">
              <div className="flex items-center space-x-2 text-left">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm"
                  style={{ backgroundColor: BRAND_COLOR }}
                >
                  <i className="fas fa-qrcode"></i>
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-tight">an Spiel per QR Code teilnehmen</h3>
                  <p className="text-[10px] opacity-60">Zeige diesen Code dem Host</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowJoinQrModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="p-4 rounded-2xl bg-white shadow-xl border-4 border-teal-500/30 flex items-center justify-center">
                {joinQrRemainingSeconds > 0 && joinQrValue ? (
                  <QRCodeSVG value={joinQrValue} size={190} level="M" />
                ) : (
                  <div className="w-[190px] h-[190px] flex flex-col items-center justify-center text-gray-500 space-y-2">
                    <i className="fas fa-clock text-3xl text-amber-500"></i>
                    <span className="text-xs font-bold">QR-Code abgelaufen</span>
                  </div>
                )}
              </div>

              {/* Player info */}
              <div className="flex items-center space-x-2">
                {currentAvatarUrl ? (
                  <img src={currentAvatarUrl} alt="Avatar" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <i className="fas fa-user-circle text-base"></i>
                )}
                <PlayerNameTag
                  name={profileUsername || 'Spieler'}
                  colorKey={selectedNameBgColor}
                  className="font-black text-sm px-2.5 py-0.5"
                />
                {selectedTitle && <PlayerTitleBadge title={selectedTitle} size="sm" />}
              </div>

              {/* Expiry status */}
              <p className="text-xs font-semibold opacity-70">
                {joinQrRemainingSeconds > 0 ? (
                  <span>
                    Gültig für noch <strong className="text-teal-500 font-mono font-bold">{Math.floor(joinQrRemainingSeconds / 60)}:{String(joinQrRemainingSeconds % 60).padStart(2, '0')}</strong> Min.
                  </span>
                ) : (
                  <span className="text-amber-500 font-bold">Code ist abgelaufen</span>
                )}
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={generateJoinQrCode}
                className="w-full py-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2 border-teal-500/40 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10"
              >
                <i className="fas fa-sync-alt"></i>
                <span>QR-Code neu generieren</span>
              </button>
              <button
                type="button"
                onClick={() => setShowJoinQrModal(false)}
                className="w-full py-3 rounded-xl text-white font-black text-xs uppercase tracking-wider shadow cursor-pointer active:scale-95 transition-all"
                style={{ backgroundColor: BRAND_COLOR }}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ZUSÄTZLICH: Default Export zur Vermeidung von Build-Fehlern (TS2613)
export default ProfileModal;