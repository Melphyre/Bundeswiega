import React, { useState, useEffect, useCallback } from 'react';
import { BRAND_COLOR } from '../constants';
import { PlayerAvatar } from './PlayerAvatar';
import { PlayerNameTag } from './PlayerNameTag';
import { PlayerLevelBadge } from './PlayerLevelBadge';
import { playButtonSound } from './FriendsModal';
import { supabase } from '../supabaseClient';

interface WiegschaftenTabProps {
  userId?: string;
  darkMode: boolean;
  username?: string;
  onRefreshProfile?: () => void;
}

interface GuildMember {
  id: string;
  user_id: string;
  role: 'captain' | 'vize_captain' | 'member';
  joined_at: string;
  username: string;
  avatar_url: string;
  title?: string;
  level: number;
  xp: number;
  name_bg_color?: string;
}

interface GuildStats {
  gamesCount: number;
  avg: number;
  totalSchnaepse: number;
  avgSchnaepse: number;
  total: number;
}

interface GuildData {
  inGuild: boolean;
  guild: {
    id: string;
    name: string;
    tag: string;
    description: string;
    logo_url: string;
    captain_id: string;
    level?: number;
    xp?: number;
    created_at: string;
  } | null;
  myRole: 'captain' | 'vize_captain' | 'member' | null;
  members: GuildMember[];
  stats: GuildStats | null;
  pendingInvites: Array<{
    id: string;
    guild_id: string;
    status: string;
    type: string;
    created_at: string;
    guild: {
      name: string;
      tag: string;
      description?: string;
      logo_url?: string;
    };
  }>;
}

const PRESET_CRESTS = [
  '🏰', '🛡️', '🍺', '👑', '🦅', '🦁', '🐺', '⚔️', '⚓', '🍻', '🎯', '🔥'
];

export const WiegschaftenTab: React.FC<WiegschaftenTabProps> = ({
  userId,
  darkMode,
  username
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GuildData | null>(null);

  // Zustand A: Erstellen
  const [createName, setCreateName] = useState('');
  const [createTag, setCreateTag] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createLogoUrl, setCreateLogoUrl] = useState('🏰');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Zustand B: Einladen
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Zustand B: Bearbeiten
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTag, setEditTag] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Zustand B: Aktionen
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Wappen-Upload States
  const [directWappenLoading, setDirectWappenLoading] = useState(false);
  const [createWappenLoading, setCreateWappenLoading] = useState(false);
  const [editWappenLoading, setEditWappenLoading] = useState(false);

  // Upload Hilfsfunktion
  const uploadWappenToStorage = async (file: File, prefix: string): Promise<string> => {
    if (!file) throw new Error('Keine Datei ausgewählt');
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Datei ist zu groß (maximal 5 MB erlaubt)');
    }
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'];
    const fileExt = (file.name.split('.').pop() || 'png').toLowerCase();
    if (!validExtensions.includes(fileExt)) {
      throw new Error('Bitte lade eine gültige Bilddatei hoch (PNG, JPG, WEBP, SVG).');
    }

    const filePath = `guilds/${prefix}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type || 'image/png'
      });

    if (uploadError) {
      console.error('Supabase Storage avatars Upload Fehler:', uploadError);
      throw new Error(uploadError.message || 'Fehler beim Hochladen in Supabase Storage avatars');
    }

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      throw new Error('Konnte keine öffentliche URL für das Wappen abrufen.');
    }

    return urlData.publicUrl;
  };

  const handleDirectWappenUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !data?.guild || !userId) return;

    setDirectWappenLoading(true);
    setStatusFeedback('⏳ Wappen wird hochgeladen...');
    try {
      const publicUrl = await uploadWappenToStorage(file, data.guild.id);
      const res = await fetch('/api/guilds/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          guildId: data.guild.id,
          logo_url: publicUrl
        })
      });

      const resJson = await res.json();
      if (!res.ok || !resJson.success) {
        throw new Error(resJson.error || 'Fehler beim Speichern');
      }

      setData(prev => prev && prev.guild ? {
        ...prev,
        guild: { ...prev.guild, logo_url: publicUrl }
      } : prev);
      setEditLogoUrl(publicUrl);
      setStatusFeedback('✅ Wappen erfolgreich aktualisiert!');
    } catch (err: any) {
      console.error('Wappen-Upload Fehler:', err);
      setStatusFeedback(`❌ Fehler beim Wappen-Upload: ${err.message || 'Unbekannter Fehler'}`);
    } finally {
      setDirectWappenLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleCreateWappenUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCreateWappenLoading(true);
    setStatusFeedback('⏳ Wappen wird hochgeladen...');
    try {
      const publicUrl = await uploadWappenToStorage(file, `create_${userId || 'temp'}`);
      setCreateLogoUrl(publicUrl);
      setStatusFeedback('✅ Wappen hochgeladen!');
    } catch (err: any) {
      console.error('Wappen-Upload Fehler:', err);
      setStatusFeedback(`❌ Upload fehlgeschlagen: ${err.message || 'Unbekannter Fehler'}`);
    } finally {
      setCreateWappenLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleEditWappenUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !data?.guild) return;

    setEditWappenLoading(true);
    setStatusFeedback('⏳ Wappen wird hochgeladen...');
    try {
      const publicUrl = await uploadWappenToStorage(file, `edit_${data.guild.id}`);
      setEditLogoUrl(publicUrl);
      setStatusFeedback('✅ Wappen hochgeladen! Speichere deine Änderungen ab.');
    } catch (err: any) {
      console.error('Wappen-Upload Fehler:', err);
      setStatusFeedback(`❌ Upload fehlgeschlagen: ${err.message || 'Unbekannter Fehler'}`);
    } finally {
      setEditWappenLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const fetchGuildData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/guilds/my-guild?userId=${encodeURIComponent(userId)}`);
      const json = await res.json();
      if (!res.ok && json.error) {
        throw new Error(json.error);
      }

      // Supabase Direct-Fallback/Enrichment für Spielernamen & Avatare
      if (json.inGuild && Array.isArray(json.members) && json.members.length > 0) {
        const memberUserIds = json.members.map((m: any) => m.user_id).filter(Boolean);
        if (memberUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, selected_title, xp, level, name_bg_color')
            .in('id', memberUserIds);

          if (profiles && profiles.length > 0) {
            const profileMap = new Map(profiles.map(p => [p.id, p]));
            json.members = json.members.map((m: any) => {
              const p = profileMap.get(m.user_id);
              return {
                ...m,
                username: p?.username || m.username || 'Spieler',
                avatar_url: p?.avatar_url || m.avatar_url || '',
                title: p?.selected_title || m.title || '',
                xp: p?.xp ?? m.xp ?? 0,
                level: p?.level ?? m.level ?? 1,
                name_bg_color: p?.name_bg_color || m.name_bg_color
              };
            });
          }
        }
      }

      setData(json);

      if (json.inGuild && json.guild) {
        setEditName(json.guild.name || '');
        setEditTag(json.guild.tag || '');
        setEditDescription(json.guild.description || '');
        setEditLogoUrl(json.guild.logo_url || '');
      }
    } catch (e: any) {
      console.error('Fehler beim Laden der Wiegschaft:', e);
      setError(e?.message || 'Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchGuildData();
  }, [fetchGuildData]);

  const handleCreateGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setCreateError(null);

    const name = createName.trim();
    const tag = createTag.trim().toUpperCase();

    if (!name || !tag) {
      setCreateError('Bitte gib Name und Kürzel ein.');
      return;
    }
    if (tag.length > 5) {
      setCreateError('Das Kürzel darf maximal 5 Zeichen lang sein.');
      return;
    }

    setCreateLoading(true);
    try {
      const res = await fetch('/api/guilds/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name,
          tag,
          description: createDescription.trim(),
          logo_url: createLogoUrl.trim()
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Fehler beim Erstellen der Wiegschaft');
      }
      playButtonSound();
      setStatusFeedback(`✅ Wiegschaft "${name}" erfolgreich gegründet!`);
      await fetchGuildData();
    } catch (err: any) {
      setCreateError(err?.message || 'Fehler beim Erstellen der Wiegschaft');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRespondInvite = async (inviteId: string, action: 'accept' | 'reject') => {
    if (!userId) return;
    setActionLoading(`invite_${inviteId}`);
    try {
      const res = await fetch('/api/guilds/respond-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, inviteId, action })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Aktion fehlgeschlagen');
      }
      playButtonSound();
      setStatusFeedback(action === 'accept' ? '🎉 Willkommen in der Wiegschaft!' : 'Einladung abgelehnt.');
      await fetchGuildData();
    } catch (err: any) {
      alert(`Fehler: ${err?.message || 'Aktion fehlgeschlagen'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !data?.guild?.id) return;
    const target = inviteUsername.trim();
    if (!target) return;

    setInviteLoading(true);
    setInviteMsg(null);
    try {
      const res = await fetch('/api/guilds/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          guildId: data.guild.id,
          username: target
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Fehler beim Einladen');
      }
      playButtonSound();
      setInviteMsg({ type: 'success', text: json.message || `Einladung an "${target}" versendet!` });
      setInviteUsername('');
    } catch (err: any) {
      setInviteMsg({ type: 'error', text: err?.message || 'Konnte Einladung nicht versenden' });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleManageMember = async (targetUserId: string, action: 'kick' | 'promote_vize' | 'demote_member') => {
    if (!userId || !data?.guild?.id) return;
    setActionLoading(`member_${targetUserId}_${action}`);
    try {
      const res = await fetch('/api/guilds/manage-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          guildId: data.guild.id,
          targetUserId,
          action
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Aktion fehlgeschlagen');
      }
      playButtonSound();
      await fetchGuildData();
    } catch (err: any) {
      alert(`Fehler: ${err?.message || 'Aktion fehlgeschlagen'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeaveGuild = async () => {
    if (!userId || !data?.guild?.id) return;
    setActionLoading('leave');
    try {
      const res = await fetch('/api/guilds/manage-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          guildId: data.guild.id,
          action: 'leave'
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Konnte Wiegschaft nicht verlassen');
      }
      playButtonSound();
      setShowLeaveModal(false);
      setStatusFeedback('Du hast die Wiegschaft verlassen.');
      await fetchGuildData();
    } catch (err: any) {
      alert(`Fehler: ${err?.message || 'Konnte Wiegschaft nicht verlassen'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !data?.guild?.id) return;
    setEditError(null);

    const name = editName.trim();
    const tag = editTag.trim().toUpperCase();

    if (!name || !tag) {
      setEditError('Name und Tag sind erforderlich.');
      return;
    }
    if (tag.length > 5) {
      setEditError('Das Kürzel darf maximal 5 Zeichen lang sein.');
      return;
    }

    setEditLoading(true);
    try {
      const res = await fetch('/api/guilds/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          guildId: data.guild.id,
          name,
          tag,
          description: editDescription.trim(),
          logo_url: editLogoUrl.trim()
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Fehler beim Speichern');
      }
      playButtonSound();
      setIsEditing(false);
      setStatusFeedback('✅ Wiegschafts-Daten erfolgreich aktualisiert!');
      await fetchGuildData();
    } catch (err: any) {
      setEditError(err?.message || 'Fehler beim Speichern');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteGuild = async () => {
    if (!userId || !data?.guild?.id) return;
    setActionLoading('delete');
    try {
      const res = await fetch('/api/guilds/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          guildId: data.guild.id
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Konnte Wiegschaft nicht auflösen');
      }
      playButtonSound();
      setShowDeleteModal(false);
      setStatusFeedback('Wiegschaft wurde aufgelöst.');
      await fetchGuildData();
    } catch (err: any) {
      alert(`Fehler: ${err?.message || 'Konnte Wiegschaft nicht auflösen'}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div id="wiegschaften-loading" className="flex flex-col items-center justify-center py-16 space-y-3">
        <i className="fas fa-spinner animate-spin text-3xl" style={{ color: BRAND_COLOR }}></i>
        <p className="text-xs font-bold opacity-60">Wiegschafts-Daten werden geladen...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div id="wiegschaften-error" className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-center space-y-3">
        <i className="fas fa-exclamation-circle text-2xl text-red-500"></i>
        <p className="text-xs font-bold text-red-500">{error}</p>
        <button
          id="btn-retry-wiegschaften"
          onClick={fetchGuildData}
          className="px-4 py-2 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 active:scale-95 cursor-pointer"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  const isCaptain = data?.myRole === 'captain';
  const isVize = data?.myRole === 'vize_captain';
  const canManage = isCaptain || isVize;

  return (
    <div id="wiegschaften-tab-container" className="space-y-6">
      {/* Offizielles Motto / Info-Text */}
      <div
        id="wiegschaft-motto-banner"
        className={`p-4 sm:p-5 rounded-2xl border flex items-center space-x-3.5 sm:space-x-4 shadow-sm ${
          darkMode
            ? 'bg-slate-800/80 border-slate-700/80 text-slate-100'
            : 'bg-gradient-to-r from-teal-50 to-white border-teal-200/80 text-teal-950'
        }`}
      >
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center text-2xl flex-shrink-0">
          🏰
        </div>
        <p className="text-xs sm:text-sm font-semibold leading-relaxed">
          Schließe dich mit anderen Wiegebegeisternden zu Wiegschaften zusammen und messt euch mit Wiegschaften auf der ganzen Welt.
        </p>
      </div>

      {statusFeedback && (
        <div id="wiegschaft-toast-feedback" className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400 text-xs font-bold flex items-center justify-between">
          <span>{statusFeedback}</span>
          <button onClick={() => setStatusFeedback(null)} className="opacity-60 hover:opacity-100 text-sm">✕</button>
        </div>
      )}

      {/* ZUSTAND A: NICHT IN WIEGSCHAFT */}
      {!data?.inGuild && (
        <div id="wiegschaft-not-in-guild-view" className="space-y-6">
          <div className={`p-5 rounded-2xl border text-center relative overflow-hidden ${darkMode ? 'bg-gradient-to-b from-slate-800/80 to-slate-800/40 border-slate-700' : 'bg-gradient-to-b from-teal-50 to-white border-teal-100'}`}>
            <div className="text-4xl mb-2">🏰</div>
            <h4 className="text-lg font-black uppercase tracking-wide" style={{ color: BRAND_COLOR }}>
              Keiner Wiegschaft beigetreten
            </h4>
            <p className="text-xs sm:text-sm opacity-80 max-w-lg mx-auto mt-2 leading-relaxed">
              Schließe dich mit anderen Wiegebegeisternden zu Wiegschaften zusammen und messt euch mit Wiegschaften auf der ganzen Welt.
            </p>
          </div>

          {/* Offene Einladungen */}
          <div id="wiegschaft-invites-section" className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-4`}>
            <div className="flex items-center justify-between">
              <h5 className="font-black text-xs uppercase tracking-wider flex items-center space-x-2">
                <i className="fas fa-envelope-open-text text-[#238183]"></i>
                <span>Offene Einladungen</span>
              </h5>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${data?.pendingInvites && data.pendingInvites.length > 0 ? 'bg-teal-500 text-white' : 'bg-gray-500/20 opacity-60'}`}>
                {data?.pendingInvites?.length || 0}
              </span>
            </div>

            {(!data?.pendingInvites || data.pendingInvites.length === 0) ? (
              <div className="p-4 rounded-xl border border-dashed border-gray-500/20 text-center opacity-60 text-xs">
                Aktuell liegen keine offenen Einladungen für dich vor.
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.pendingInvites.map(inv => (
                  <div
                    key={inv.id}
                    id={`guild-invite-card-${inv.id}`}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${darkMode ? 'bg-slate-900/80 border-slate-700' : 'bg-white border-gray-200'}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-xl flex-shrink-0">
                        {inv.guild.logo_url && inv.guild.logo_url.startsWith('http') ? (
                          <img src={inv.guild.logo_url} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          inv.guild.logo_url || '🏰'
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-sm">{inv.guild.name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-500/20 opacity-80">
                            [{inv.guild.tag}]
                          </span>
                        </div>
                        {inv.guild.description && (
                          <p className="text-[11px] opacity-70 line-clamp-1">{inv.guild.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button
                        id={`btn-accept-invite-${inv.id}`}
                        disabled={actionLoading === `invite_${inv.id}`}
                        onClick={() => handleRespondInvite(inv.id, 'accept')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <i className="fas fa-check"></i>
                        <span>Annehmen</span>
                      </button>
                      <button
                        id={`btn-reject-invite-${inv.id}`}
                        disabled={actionLoading === `invite_${inv.id}`}
                        onClick={() => handleRespondInvite(inv.id, 'reject')}
                        className="px-3 py-1.5 rounded-lg bg-gray-500/20 hover:bg-gray-500/30 active:scale-95 font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <i className="fas fa-times"></i>
                        <span>Ablehnen</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Wiegschaft erstellen Formular */}
          <div id="wiegschaft-create-section" className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-4`}>
            <div className="flex items-center justify-between">
              <h5 className="font-black text-xs uppercase tracking-wider flex items-center space-x-2">
                <i className="fas fa-plus-circle text-[#238183]"></i>
                <span>Eigene Wiegschaft gründen</span>
              </h5>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                Werde Kapitän 👑
              </span>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateGuild} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label htmlFor="create-guild-name" className="text-[11px] font-bold opacity-75">
                    Name der Wiegschaft *
                  </label>
                  <input
                    id="create-guild-name"
                    type="text"
                    required
                    maxLength={40}
                    placeholder="z.B. Die Schankmajestäten"
                    value={createName}
                    onChange={e => setCreateName(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#238183] ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="create-guild-tag" className="text-[11px] font-bold opacity-75">
                    Kürzel / Tag (max. 5) *
                  </label>
                  <input
                    id="create-guild-tag"
                    type="text"
                    required
                    maxLength={5}
                    placeholder="z.B. WIEG"
                    value={createTag}
                    onChange={e => setCreateTag(e.target.value.toUpperCase())}
                    className={`w-full p-2.5 rounded-xl border text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#238183] ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="create-guild-desc" className="text-[11px] font-bold opacity-75">
                  Beschreibung / Motto
                </label>
                <textarea
                  id="create-guild-desc"
                  rows={2}
                  maxLength={160}
                  placeholder="Beschreibe kurz eure Wiegschaft oder euer Motto..."
                  value={createDescription}
                  onChange={e => setCreateDescription(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-[#238183] ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-bold opacity-75 block">
                  Wappen / Logo der Wiegschaft
                </label>

                <div className="flex items-center space-x-3 p-3 rounded-xl border border-gray-500/20 bg-black/5 dark:bg-white/5">
                  <div className="w-14 h-14 rounded-xl bg-teal-500/10 border-2 border-teal-500/30 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden shadow-xs relative">
                    {createWappenLoading ? (
                      <i className="fas fa-spinner animate-spin text-[#238183]"></i>
                    ) : createLogoUrl && createLogoUrl.startsWith('http') ? (
                      <img src={createLogoUrl} alt="Wappen Vorschau" className="w-full h-full object-cover" />
                    ) : (
                      <span>{createLogoUrl || '🏰'}</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label
                      htmlFor="create-guild-wappen-file"
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer active:scale-95 transition-all shadow-xs ${
                        createWappenLoading ? 'opacity-50 cursor-not-allowed bg-gray-500' : 'bg-[#238183] hover:opacity-90'
                      }`}
                    >
                      <i className="fas fa-upload text-[11px]"></i>
                      <span>{createWappenLoading ? 'Wird gespeichert...' : 'Wappen hochladen'}</span>
                    </label>
                    <input
                      id="create-guild-wappen-file"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCreateWappenUpload}
                      disabled={createWappenLoading}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold opacity-60">Oder Vorlage wählen:</span>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_CRESTS.map(crest => (
                      <button
                        key={crest}
                        type="button"
                        onClick={() => setCreateLogoUrl(crest)}
                        className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer border ${createLogoUrl === crest ? 'border-teal-500 bg-teal-500/20 scale-105 shadow' : 'border-gray-500/20 hover:bg-black/5 dark:hover:bg-white/5'}`}
                      >
                        {crest}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={createLoading}
                className="w-full py-3 rounded-xl bg-[#238183] text-white font-black text-xs uppercase tracking-wider hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {createLoading ? 'Wiegschaft wird gegründet...' : '🏰 Wiegschaft jetzt gründen'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ZUSTAND B: IN WIEGSCHAFT */}
      {data?.inGuild && data.guild && (
        <div id="wiegschaft-active-guild-view" className="space-y-6">
          {/* Hauptkarte der Wiegschaft */}
          <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'} shadow-sm space-y-4`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="relative group w-16 h-16 rounded-2xl bg-teal-500/10 border-2 border-teal-500/30 flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden shadow">
                  {data.guild.logo_url && data.guild.logo_url.startsWith('http') ? (
                    <img src={data.guild.logo_url} alt="Guild Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span>{data.guild.logo_url || '🏰'}</span>
                  )}

                  {canManage && (
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold cursor-pointer transition-opacity">
                      {directWappenLoading ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-camera"></i>}
                      <input type="file" accept="image/*" className="hidden" onChange={handleDirectWappenUpload} disabled={directWappenLoading} />
                    </label>
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-black">{data.guild.name}</h3>
                    <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-[#238183]/10 text-[#238183] border border-[#238183]/20">
                      [{data.guild.tag}]
                    </span>
                  </div>
                  {data.guild.description && (
                    <p className="text-xs opacity-75 mt-0.5">{data.guild.description}</p>
                  )}
                </div>
              </div>

              {/* Aktions-Buttons für Kapitän & Mitglieder */}
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                {isCaptain && (
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-3 py-1.5 rounded-xl border border-gray-500/30 font-bold text-xs hover:bg-gray-500/10 flex items-center space-x-1 cursor-pointer"
                  >
                    <i className="fas fa-edit"></i>
                    <span>{isEditing ? 'Abbrechen' : 'Bearbeiten'}</span>
                  </button>
                )}

                {isCaptain ? (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/30 font-bold text-xs hover:bg-red-500/20 cursor-pointer"
                  >
                    Auflösen
                  </button>
                ) : (
                  <button
                    onClick={() => setShowLeaveModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/30 font-bold text-xs hover:bg-red-500/20 cursor-pointer"
                  >
                    Verlassen
                  </button>
                )}
              </div>
            </div>

            {/* Wiegschaft Bearbeiten Formular (Kapitän) */}
            {isEditing && (
              <form onSubmit={handleUpdateGuild} className="p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-gray-500/20 space-y-3 pt-4">
                <h5 className="text-xs font-black uppercase tracking-wider">Wiegschaft bearbeiten</h5>
                {editError && <p className="text-xs text-red-500 font-bold">{editError}</p>}
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Name"
                    className={`p-2 rounded-lg border text-xs font-bold ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-300'}`}
                  />
                  <input
                    type="text"
                    maxLength={5}
                    value={editTag}
                    onChange={e => setEditTag(e.target.value.toUpperCase())}
                    placeholder="TAG"
                    className={`p-2 rounded-lg border text-xs font-mono font-bold ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-300'}`}
                  />
                  <div className="flex items-center space-x-2">
                    <label className="px-3 py-2 rounded-lg bg-[#238183] text-white text-xs font-bold cursor-pointer hover:opacity-90 flex-shrink-0">
                      <span>Wappen Ändern</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleEditWappenUpload} disabled={editWappenLoading} />
                    </label>
                  </div>
                </div>

                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  placeholder="Beschreibung"
                  rows={2}
                  className={`w-full p-2 rounded-lg border text-xs ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-300'}`}
                />

                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-[#238183] text-white rounded-lg text-xs font-bold hover:opacity-90"
                >
                  {editLoading ? 'Speichere...' : 'Änderungen speichern'}
                </button>
              </form>
            )}
          </div>

          {/* Mitglied einladen (Kapitän & Vize) */}
          {canManage && (
            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-3`}>
              <h5 className="text-xs font-black uppercase tracking-wide flex items-center space-x-2">
                <i className="fas fa-user-plus text-[#238183]"></i>
                <span>Mitglied einladen</span>
              </h5>
              
              <form onSubmit={handleInviteMember} className="flex gap-2">
                <input
                  type="text"
                  value={inviteUsername}
                  onChange={e => setInviteUsername(e.target.value)}
                  placeholder="Spielername eingeben..."
                  className={`flex-1 p-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#238183] ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300'}`}
                />
                <button
                  type="submit"
                  disabled={inviteLoading || !inviteUsername.trim()}
                  className="px-4 py-2.5 bg-[#238183] text-white font-bold text-xs rounded-xl hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {inviteLoading ? 'Lädt...' : 'Einladen'}
                </button>
              </form>

              {inviteMsg && (
                <p className={`text-xs font-bold ${inviteMsg.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>
                  {inviteMsg.text}
                </p>
              )}
            </div>
          )}

          {/* Mitgliederliste */}
          <div className="space-y-3">
            <h5 className="text-xs font-black uppercase tracking-wider opacity-80 flex items-center justify-between">
              <span>Mitglieder ({data.members?.length || 0})</span>
            </h5>

            <div className="grid grid-cols-1 gap-2.5">
              {data.members?.map(m => {
                const isMemberCaptain = m.role === 'captain';
                const isMemberVize = m.role === 'vize_captain';

                return (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-gray-200'}`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <PlayerAvatar
                        url={m.avatar_url}
                        name={m.username}
                        className="w-10 h-10 border shadow-xs flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <PlayerNameTag
                            name={m.username}
                            bgColor={m.name_bg_color}
                            className="font-black text-xs truncate"
                          />
                          {isMemberCaptain && <span className="text-xs" title="Kapitän">👑</span>}
                          {isMemberVize && <span className="text-xs" title="Vize-Kapitän">🛡️</span>}
                        </div>
                        {m.title && <p className="text-[10px] opacity-60 truncate">{m.title}</p>}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <PlayerLevelBadge level={m.level || 1} />

                      {/* Verwaltungsknöpfe für Kapitän */}
                      {isCaptain && m.user_id !== userId && (
                        <div className="flex items-center space-x-1 pl-2 border-l border-gray-500/20">
                          {m.role === 'member' && (
                            <button
                              onClick={() => handleManageMember(m.user_id, 'promote_vize')}
                              title="Zum Vize-Kapitän befördern"
                              className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-xs cursor-pointer"
                            >
                              👑
                            </button>
                          )}
                          {m.role === 'vize_captain' && (
                            <button
                              onClick={() => handleManageMember(m.user_id, 'demote_member')}
                              title="Zum Mitglied degradieren"
                              className="p-1.5 rounded-lg bg-gray-500/10 text-gray-500 hover:bg-gray-500/20 text-xs cursor-pointer"
                            >
                              ⬇️
                            </button>
                          )}
                          <button
                            onClick={() => handleManageMember(m.user_id, 'kick')}
                            title="Aus Wiegschaft entfernen"
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs cursor-pointer"
                          >
                            <i className="fas fa-user-minus"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Wiegschaft auflösen */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`p-6 rounded-2xl max-w-sm w-full space-y-4 ${darkMode ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white text-black'}`}>
            <h4 className="font-black text-base text-red-500">Wiegschaft auflösen?</h4>
            <p className="text-xs opacity-80 leading-relaxed">
              Möchtest du die Wiegschaft wirklich auflösen? Alle Mitglieder werden entfernt und der Name wird wieder frei.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleDeleteGuild}
                disabled={actionLoading === 'delete'}
                className="flex-1 py-2.5 bg-red-500 text-white font-bold text-xs rounded-xl hover:bg-red-600 cursor-pointer"
              >
                {actionLoading === 'delete' ? 'Lösche...' : 'Ja, auflösen'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 bg-gray-500/20 font-bold text-xs rounded-xl hover:bg-gray-500/30 cursor-pointer"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Wiegschaft verlassen */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`p-6 rounded-2xl max-w-sm w-full space-y-4 ${darkMode ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white text-black'}`}>
            <h4 className="font-black text-base text-amber-500">Wiegschaft verlassen?</h4>
            <p className="text-xs opacity-80 leading-relaxed">
              Möchtest du diese Wiegschaft wirklich verlassen?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleLeaveGuild}
                disabled={actionLoading === 'leave'}
                className="flex-1 py-2.5 bg-amber-500 text-white font-bold text-xs rounded-xl hover:bg-amber-600 cursor-pointer"
              >
                {actionLoading === 'leave' ? 'Verlasse...' : 'Ja, verlassen'}
              </button>
              <button
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 py-2.5 bg-gray-500/20 font-bold text-xs rounded-xl hover:bg-gray-500/30 cursor-pointer"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WiegschaftenTab;
