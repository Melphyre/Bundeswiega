import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { BRAND_COLOR, normalizeGameMode, matchesGameMode, calculateUserModeStats } from '../constants';
import { MASTER_ACHIEVEMENTS_DEFINITIONS } from '../achievementsData';
import { Friend, PendingFriendRequest } from '../../types';
import { playButtonSound } from './FriendsModal';

interface ProfileModalProps {
  showProfileModal: boolean;
  setShowProfileModal: (show: boolean) => void;
  supabaseUser: any;
  darkMode: boolean;
  isAdmin: boolean;
  profileTab: 'profil' | 'rekorde' | 'freunde';
  setProfileTab: (tab: 'profil' | 'rekorde' | 'freunde') => void;
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
  friends: Friend[];
  pendingRequests: PendingFriendRequest[];
  friendSearchQuery: string;
  setFriendSearchQuery: (q: string) => void;
  friendRequestError: string | null;
  friendRequestSuccess: string | null;
  handleSendFriendRequest: () => Promise<void>;
  handleAcceptFriendRequest: (id: string) => Promise<void>;
  handleRejectFriendRequest: (id: string) => Promise<void>;
  handleRemoveFriend: (id: string) => Promise<void>;
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
  darkMode,
  isAdmin,
  profileTab,
  setProfileTab,
  profileUsername,
  setProfileUsername,
  handleUsernameChange,
  profileSaveState,
  setProfileSaveState,
  profileSaveMessage,
  setProfileSaveMessage,
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
  friends,
  pendingRequests,
  friendSearchQuery,
  setFriendSearchQuery,
  friendRequestError,
  friendRequestSuccess,
  handleSendFriendRequest,
  handleAcceptFriendRequest,
  handleRejectFriendRequest,
  handleRemoveFriend,
  showDeleteProfileModal,
  setShowDeleteProfileModal,
  deleteProfileInput,
  setDeleteProfileInput,
  deletingProfile,
  handleDeleteProfile,
  refreshUserData
}) => {
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);

  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);

  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<string | null>(null);

  if (!showProfileModal) return null;

  const currentAvatarUrl = supabaseUser?.user_metadata?.avatar_url || '';

  // Avatar-Update
  const handleUpdateAvatar = async (url: string) => {
    const currentUserId = supabaseUser?.id;
    if (!currentUserId) return;
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
        .eq('id', currentUserId);

      setAvatarMessage('✅ Profilbild erfolgreich aktualisiert!');
      if (refreshUserData) await refreshUserData();
    } catch (e: any) {
      setAvatarMessage(`❌ Fehler: ${e.message || 'Konnte Bild nicht speichern'}`);
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setAvatarMessage('❌ Bild ist zu groß (max. 2 MB erlaubt)');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await handleUpdateAvatar(base64);
    };
    reader.readAsDataURL(file);
  };

  // E-Mail ändern
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

  // Passwort ändern
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

  // Gefilterte & sortierte Spiele für Tab 2
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
    if (recordsSortDir === 'asc') {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });

  // Dynamische Stats-Berechnung auf Basis von user_id und dem ausgewählten Spielmodus
  const dynamicStats = calculateUserModeStats(
    myGameData,
    myAchievementsData,
    supabaseUser?.id || '',
    recordsSubTab
  );

  return (
    <>
      <div className="fixed inset-0 z-[700] flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
        <div
          className={`rounded-3xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[92dvh] border-2 ${
            darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-gray-900'
          }`}
        >
          {/* Modal Header */}
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
                <h3 className="text-lg md:text-xl font-black flex items-center space-x-2">
                  <span>{supabaseUser?.user_metadata?.username || supabaseUser?.email || 'Mein Profil'}</span>
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

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-500/20 px-4 md:px-6 flex-shrink-0 overflow-x-auto">
            {[
              { key: 'profil' as const, label: '👤 Mein Profil', count: undefined },
              { key: 'rekorde' as const, label: '📊 Meine Rekorde & Stats', count: myGameData.length },
              { key: 'freunde' as const, label: '👥 Freunde', count: friends.length + (pendingRequests.length > 0 ? ` (${pendingRequests.length} neu)` : '') }
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
                {/* 1. Profilbild / Avatar */}
                <div className={`p-4 md:p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-4`}>
                  <h4 className="font-black text-sm uppercase tracking-wide flex items-center space-x-2">
                    <i className="fas fa-camera text-[#238183]"></i>
                    <span>Profilbild (Avatar)</span>
                  </h4>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative">
                      {currentAvatarUrl ? (
                        <img
                          src={currentAvatarUrl}
                          alt="Avatar"
                          className="w-20 h-20 rounded-full object-cover border-2 shadow"
                          style={{ borderColor: BRAND_COLOR }}
                        />
                      ) : (
                        <div
                          className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black shadow"
                          style={{ backgroundColor: BRAND_COLOR }}
                        >
                          <i className="fas fa-user"></i>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex flex-wrap gap-2 items-center">
                        <label className="px-4 py-2 rounded-xl text-xs font-bold bg-[#238183] text-white cursor-pointer hover:opacity-90 transition-opacity">
                          <i className="fas fa-upload mr-1.5"></i>
                          <span>Bild hochladen</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarFileChange}
                            className="hidden"
                          />
                        </label>
                        {currentAvatarUrl && (
                          <button
                            type="button"
                            onClick={() => handleUpdateAvatar('')}
                            className="px-3 py-2 rounded-xl text-xs font-bold border border-red-500/40 text-red-500 hover:bg-red-500/10 cursor-pointer"
                          >
                            Entfernen
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="url"
                          value={avatarUrlInput}
                          onChange={e => setAvatarUrlInput(e.target.value)}
                          placeholder="Oder Bild-URL einfügen (https://...)"
                          className={`flex-1 p-2 rounded-xl border text-xs ${
                            darkMode ? 'border-white/20 bg-slate-900 text-white' : 'border-black/20 bg-white text-black'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (avatarUrlInput.trim()) handleUpdateAvatar(avatarUrlInput.trim());
                          }}
                          disabled={!avatarUrlInput.trim() || avatarLoading}
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-40 cursor-pointer"
                        >
                          URL setzen
                        </button>
                      </div>
                      {avatarMessage && (
                        <p className={`text-xs font-bold ${avatarMessage.startsWith('✅') ? 'text-emerald-500' : 'text-red-500'}`}>
                          {avatarMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Benutzername */}
                <div className={`p-4 md:p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-3`}>
                  <h4 className="font-black text-sm uppercase tracking-wide flex items-center space-x-2">
                    <i className="fas fa-id-card text-[#238183]"></i>
                    <span>Benutzername ändern</span>
                  </h4>
                  <p className="text-xs opacity-60">
                    Dein Benutzername wird in den Rekordlisten, Turniertabellen und für Freunde angezeigt.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={profileUsername}
                      onChange={e => setProfileUsername(e.target.value)}
                      placeholder="Dein neuer Benutzername"
                      className={`flex-1 p-3 rounded-xl border-2 font-bold text-sm ${
                        darkMode ? 'border-white/20 bg-slate-900 text-white' : 'border-black/20 bg-white text-black'
                      }`}
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
                    <p className={`text-xs font-bold ${profileSaveMessage.username.startsWith('✅') ? 'text-emerald-500' : 'text-red-500'}`}>
                      {profileSaveMessage.username}
                    </p>
                  )}
                </div>

                {/* 3. E-Mail-Adresse */}
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
                      className={`flex-1 p-3 rounded-xl border-2 font-bold text-sm ${
                        darkMode ? 'border-white/20 bg-slate-900 text-white' : 'border-black/20 bg-white text-black'
                      }`}
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
                  {emailMessage && (
                    <p className={`text-xs font-bold ${emailMessage.startsWith('✅') ? 'text-emerald-500' : 'text-red-500'}`}>
                      {emailMessage}
                    </p>
                  )}
                </div>

                {/* 4. Passwort ändern */}
                <div className={`p-4 md:p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-3`}>
                  <h4 className="font-black text-sm uppercase tracking-wide flex items-center space-x-2">
                    <i className="fas fa-lock text-[#238183]"></i>
                    <span>Passwort ändern</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold opacity-60 block mb-1">Neues Passwort</label>
                      <input
                        type="password"
                        value={profileNewPw}
                        onChange={e => setProfileNewPw(e.target.value)}
                        placeholder="Mind. 6 Zeichen"
                        className={`w-full p-3 rounded-xl border-2 font-bold text-sm ${
                          darkMode ? 'border-white/20 bg-slate-900 text-white' : 'border-black/20 bg-white text-black'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold opacity-60 block mb-1">Passwort bestätigen</label>
                      <input
                        type="password"
                        value={profileNewPwConfirm}
                        onChange={e => setProfileNewPwConfirm(e.target.value)}
                        placeholder="Wiederholen"
                        className={`w-full p-3 rounded-xl border-2 font-bold text-sm ${
                          darkMode ? 'border-white/20 bg-slate-900 text-white' : 'border-black/20 bg-white text-black'
                        }`}
                      />
                    </div>
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
                  {pwMessage && (
                    <p className={`text-xs font-bold ${pwMessage.startsWith('✅') ? 'text-emerald-500' : 'text-red-500'}`}>
                      {pwMessage}
                    </p>
                  )}
                </div>

                {/* 5. Datenschutzeinstellungen */}
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

                {/* 6. Gefahrenzone: Account löschen */}
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

            {/* TAB 2: MEINE REKORDE & STATS */}
            {profileTab === 'rekorde' && (
              <div className="space-y-6">
                {/* Statistik-Karten */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className={`p-4 rounded-2xl border text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="text-2xl font-black text-[#238183]">{dynamicStats.gamesPlayed}</div>
                    <div className="text-[11px] font-bold opacity-60 uppercase mt-1">Spiele absolviert</div>
                  </div>
                  <div className={`p-4 rounded-2xl border text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="text-2xl font-black text-amber-500">
                      {recordsSubTab.includes('Speedwiegen')
                        ? (dynamicStats.bestTime !== null ? `${dynamicStats.bestTime}s` : '-')
                        : dynamicStats.totalSchnaepse}
                    </div>
                    <div className="text-[11px] font-bold opacity-60 uppercase mt-1">
                      {recordsSubTab.includes('Speedwiegen') ? '⚡ Schnellste Zeit' : '🥃 Schnäpse'}
                    </div>
                  </div>
                  <div className={`p-4 rounded-2xl border text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="text-2xl font-black text-emerald-500">
                      {dynamicStats.bestAvg !== null ? `${dynamicStats.bestAvg}g` : '-'}
                    </div>
                    <div className="text-[11px] font-bold opacity-60 uppercase mt-1">🎯 Bester Ø Abstand</div>
                  </div>
                  <div className={`p-4 rounded-2xl border text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="text-2xl font-black text-purple-500">
                      {dynamicStats.achievementsCount}
                    </div>
                    <div className="text-[11px] font-bold opacity-60 uppercase mt-1">🏆 Badges</div>
                  </div>
                </div>

                {/* Filter & Sortierung */}
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b pb-3 border-gray-500/20">
                  <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
                    {[
                      { key: 'alle', label: 'Alle Modi' },
                      { key: 'Standardspiel (500ml)', label: '🍺 Standard (500ml)' },
                      { key: 'Standardspiel (0,33L)', label: '🍺 Standard (0,33L)' },
                      { key: 'Speedwiegen (500ml)', label: '⚡ Speed (500ml)' },
                      { key: 'Speedwiegen (0,33L)', label: '⚡ Speed (0,33L)' }
                    ].map(f => (
                      <button
                        key={f.key}
                        onClick={() => setRecordsSubTab(f.key)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all whitespace-nowrap ${
                          recordsSubTab === f.key
                            ? 'bg-[#238183] text-white shadow'
                            : 'bg-black/5 dark:bg-white/5 opacity-60 hover:opacity-100'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-xs w-full sm:w-auto justify-end">
                    <span className="opacity-60 font-bold">Sortieren:</span>
                    <select
                      value={recordsSortBy}
                      onChange={e => setRecordsSortBy(e.target.value as any)}
                      className={`p-1.5 rounded-lg border font-bold text-xs ${
                        darkMode ? 'bg-slate-800 border-white/20 text-white' : 'bg-white border-black/20 text-black'
                      }`}
                    >
                      <option value="datum">Datum</option>
                      <option value="avg">Ø Abstand</option>
                      <option value="schnaepse">{recordsSubTab.includes('Speedwiegen') ? 'Zeit' : 'Schnäpse'}</option>
                      <option value="total">Total / Score</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setRecordsSortDir(recordsSortDir === 'asc' ? 'desc' : 'asc')}
                      className="p-1.5 px-2 rounded-lg border font-bold text-xs bg-black/5 dark:bg-white/5"
                    >
                      {recordsSortDir === 'asc' ? '↑ Auf' : '↓ Ab'}
                    </button>
                  </div>
                </div>

                {/* Tabelle der Spiele */}
                {sortedGames.length === 0 ? (
                  <div className="text-center py-12 opacity-60 space-y-2">
                    <i className="fas fa-beer text-4xl"></i>
                    <p className="text-sm font-bold">Noch keine Spiele in dieser Kategorie aufgezeichnet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-gray-500/20">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className={`border-b border-gray-500/20 font-black uppercase text-[10px] tracking-wider ${
                          darkMode ? 'bg-slate-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                        }`}>
                          <th className="p-3">Datum</th>
                          <th className="p-3">Modus</th>
                          <th className="p-3 text-right">Ø Abstand</th>
                          <th className="p-3 text-right">
                            {recordsSubTab.includes('Speedwiegen') ? 'Zeit' : 'Schnäpse'}
                          </th>
                          <th className="p-3 text-right">Total / Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-500/10">
                        {sortedGames.map((g, idx) => {
                          const canonicalMode = normalizeGameMode(g.game_mode);
                          const isSpeed = canonicalMode.includes('Speedwiegen');
                          return (
                            <tr key={idx} className="hover:bg-black/5 dark:hover:bg-white/5">
                              <td className="p-3 font-mono font-bold">{g.date || g.created_at?.slice(0, 10) || '-'}</td>
                              <td className="p-3 font-bold">
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#238183]/10 text-[#238183] border border-[#238183]/30 whitespace-nowrap">
                                  {canonicalMode}
                                </span>
                              </td>
                              <td className="p-3 text-right font-black">
                                {g.avg !== undefined && g.avg !== null ? `${g.avg}g` : '-'}
                              </td>
                              <td className="p-3 text-right font-bold text-amber-500">
                                {isSpeed
                                  ? (g.time_seconds !== undefined && g.time_seconds !== null
                                      ? `${Number(g.time_seconds).toFixed(1)}s`
                                      : (g.schnaepse ? `${Number(g.schnaepse).toFixed(1)}s` : '-'))
                                  : (g.schnaepse ? `🥃 ${g.schnaepse}` : '0')}
                              </td>
                              <td className="p-3 text-right font-black">
                                {g.total ? `${g.total}g` : (isSpeed && g.avg !== undefined ? `${(g.avg + (g.time_seconds || g.schnaepse || 0)).toFixed(1)}` : '-')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Meine freigeschalteten Achievements */}
                {myAchievementsData.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-gray-500/20">
                    <h4 className="font-black text-sm uppercase tracking-wide flex items-center space-x-2 text-purple-400">
                      <i className="fas fa-trophy"></i>
                      <span>Freigeschaltete Errungenschaften ({myAchievementsData.length})</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {myAchievementsData.map((ach, idx) => {
                        const def = MASTER_ACHIEVEMENTS_DEFINITIONS.find(d => d.id === ach.achievement_id);
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border flex items-center space-x-3 ${
                              darkMode ? 'bg-purple-950/20 border-purple-800/40' : 'bg-purple-50 border-purple-200'
                            }`}
                          >
                            <span className="text-2xl">{def?.icon || '🏆'}</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-black text-xs truncate">{def?.title || ach.title || ach.achievement_id}</div>
                              <div className="text-[10px] opacity-70 line-clamp-1">{def?.description || ach.description}</div>
                              {ach.created_at && (
                                <div className="text-[9px] font-mono opacity-50 mt-0.5">
                                  {new Date(ach.created_at).toLocaleDateString('de-DE')}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: FREUNDE */}
            {profileTab === 'freunde' && (
              <div className="space-y-6">
                {/* 1. Freund suchen / Anfrage senden */}
                <div className={`p-4 md:p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-3`}>
                  <h4 className="font-black text-sm uppercase tracking-wide flex items-center space-x-2">
                    <i className="fas fa-user-plus text-[#238183]"></i>
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
                      className={`flex-1 p-3 rounded-xl border-2 font-bold text-xs md:text-sm ${
                        darkMode ? 'border-white/20 bg-slate-900 text-white' : 'border-black/20 bg-white text-black'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        playButtonSound();
                        handleSendFriendRequest();
                      }}
                      disabled={!friendSearchQuery.trim()}
                      className="px-5 py-3 rounded-xl text-white font-black text-xs md:text-sm cursor-pointer shadow hover:opacity-90 disabled:opacity-40"
                      style={{ backgroundColor: BRAND_COLOR }}
                    >
                      Anfrage senden
                    </button>
                  </div>
                  {friendRequestSuccess && (
                    <p className="text-xs font-bold text-emerald-500">{friendRequestSuccess}</p>
                  )}
                  {friendRequestError && (
                    <p className="text-xs font-bold text-red-500">{friendRequestError}</p>
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
                        <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-white/10 dark:bg-black/20">
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
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 cursor-pointer"
                            >
                              Annehmen
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                playButtonSound();
                                handleRejectFriendRequest(req.id);
                              }}
                              className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-500 font-bold text-xs hover:bg-red-500/10 cursor-pointer"
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
                  <h4 className="font-black text-sm uppercase tracking-wide flex items-center space-x-2">
                    <i className="fas fa-users text-[#238183]"></i>
                    <span>Meine Freunde ({friends.length})</span>
                  </h4>
                  {friends.length === 0 ? (
                    <div className="text-center py-10 opacity-60 space-y-2">
                      <i className="fas fa-user-friends text-3xl"></i>
                      <p className="text-xs font-bold">Noch keine Freunde hinzugefügt.</p>
                      <p className="text-[11px] opacity-70">Suche oben nach deinen Mitspielern, um euch zu vernetzen!</p>
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
                                className="w-10 h-10 rounded-full object-cover border-2"
                                style={{ borderColor: BRAND_COLOR }}
                              />
                            ) : (
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-black shadow"
                                style={{ backgroundColor: BRAND_COLOR }}
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
                            className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 cursor-pointer text-xs"
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
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-gray-500/20 flex justify-end flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                playButtonSound();
                setShowProfileModal(false);
              }}
              className="px-6 py-2.5 rounded-xl font-bold text-xs md:text-sm border opacity-80 hover:opacity-100 cursor-pointer"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>

      {/* Delete Profile Confirmation Modal */}
      {showDeleteProfileModal && (
        <div className="fixed inset-0 z-[850] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className={`rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-4 border-2 border-red-500/40 ${
            darkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'
          }`}>
            <h3 className="text-xl font-black text-red-500 flex items-center space-x-2">
              <i className="fas fa-exclamation-triangle"></i>
              <span>Account wirklich löschen?</span>
            </h3>
            <p className="text-xs opacity-75 leading-relaxed">
              Dieser Vorgang ist <strong className="text-red-400">unwiderruflich</strong>. Alle deine Rekorde, Spielergebnisse und Statistiken werden dauerhaft gelöscht.
            </p>
            <p className="text-xs font-bold">
              Tippe <span className="font-mono text-red-400 font-black">delete</span> in das Textfeld:
            </p>
            <input
              type="text"
              value={deleteProfileInput}
              onChange={e => setDeleteProfileInput(e.target.value)}
              placeholder="delete"
              className={`w-full p-3 rounded-xl border-2 font-mono font-bold text-sm ${
                darkMode ? 'border-red-500/50 bg-slate-900 text-white' : 'border-red-500/50 bg-white text-black'
              }`}
            />
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowDeleteProfileModal(false); setDeleteProfileInput(''); }}
                className="flex-1 py-3 rounded-xl border-2 font-bold text-xs uppercase cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleDeleteProfile}
                disabled={deleteProfileInput !== 'delete' || deletingProfile}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider disabled:opacity-40 cursor-pointer shadow"
              >
                {deletingProfile ? 'Löschen...' : 'Unwiderruflich löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfileModal;
