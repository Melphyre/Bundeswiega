import React, { useState, useEffect, useCallback } from 'react';
import { BRAND_COLOR } from '../constants';
import { PlayerAvatar } from './PlayerAvatar';
import { PlayerNameTag } from './PlayerNameTag';
import { PlayerLevelBadge } from './PlayerLevelBadge';
import { playButtonSound } from './FriendsModal';

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

  // Wiegschaft erstellen
  const handleCreateGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setCreateError(null);

    const name = createName.trim();
    const tag = createTag.trim().toUpperCase();

    if (!name) {
      setCreateError('Bitte gib einen Namen für die Wiegschaft ein.');
      return;
    }
    if (!tag) {
      setCreateError('Bitte gib ein Kürzel/Tag für die Wiegschaft ein.');
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

  // Auf Einladung reagieren (annehmen / ablehnen)
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

  // Mitglied einladen (Kapitän & Vize-Kapitän)
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

  // Mitglied verwalten (Kick, Befördern, Degradieren)
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

  // Wiegschaft verlassen
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

  // Wiegschaft bearbeiten (Kapitän)
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

  // Wiegschaft auflösen (Kapitän)
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
      {statusFeedback && (
        <div id="wiegschaft-toast-feedback" className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400 text-xs font-bold flex items-center justify-between">
          <span>{statusFeedback}</span>
          <button onClick={() => setStatusFeedback(null)} className="opacity-60 hover:opacity-100 text-sm">✕</button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ZUSTAND A: NUTZER IST IN KEINER WIEGSCHAFT
         ───────────────────────────────────────────────────────────── */}
      {!data?.inGuild && (
        <div id="wiegschaft-not-in-guild-view" className="space-y-6">
          {/* Header Callout */}
          <div className={`p-5 rounded-2xl border text-center relative overflow-hidden ${darkMode ? 'bg-gradient-to-b from-slate-800/80 to-slate-800/40 border-slate-700' : 'bg-gradient-to-b from-teal-50 to-white border-teal-100'}`}>
            <div className="text-4xl mb-2">🏰</div>
            <h4 className="text-lg font-black uppercase tracking-wide" style={{ color: BRAND_COLOR }}>
              Keiner Wiegschaft beigetreten
            </h4>
            <p className="text-xs opacity-75 max-w-md mx-auto mt-1">
              Schließe dich mit anderen Wiegerinnen und Wiegern zusammen! Gründe deine eigene Wiegschaft oder nimm eine offene Einladung an.
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

              {/* Logo / Wappen Auswahl */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold opacity-75 block">
                  Wappen / Logo auswählen oder Bild-URL angeben
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_CRESTS.map(crest => (
                    <button
                      key={crest}
                      type="button"
                      onClick={() => setCreateLogoUrl(crest)}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer border ${createLogoUrl === crest ? 'border-teal-500 bg-teal-500/20 scale-105 shadow' : 'border-gray-500/20 hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                      {crest}
                    </button>
                  ))}
                </div>
                <input
                  id="create-guild-logo-url"
                  type="text"
                  placeholder="Oder Bild-URL (https://...) einfügen"
                  value={createLogoUrl.startsWith('http') ? createLogoUrl : ''}
                  onChange={e => setCreateLogoUrl(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-[#238183] ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                />
              </div>

              <button
                id="btn-submit-create-guild"
                type="submit"
                disabled={createLoading}
                className="w-full py-3 px-4 rounded-xl text-white font-black text-xs uppercase tracking-wider shadow-md hover:opacity-90 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: BRAND_COLOR }}
              >
                {createLoading ? (
                  <>
                    <i className="fas fa-spinner animate-spin"></i>
                    <span>Gründung wird eingetragen...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-hammer"></i>
                    <span>Wiegschaft jetzt gründen</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ZUSTAND B: NUTZER IST IN EINER WIEGSCHAFT
         ───────────────────────────────────────────────────────────── */}
      {data?.inGuild && data.guild && (
        <div id="wiegschaft-in-guild-view" className="space-y-6">
          {/* Wiegschafts-Header Karte */}
          <div className={`p-5 rounded-3xl border shadow-sm relative overflow-hidden ${darkMode ? 'bg-slate-800/80 border-slate-700 text-white' : 'bg-white border-slate-200 text-gray-900'}`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border-2 border-teal-500/30 flex items-center justify-center text-3xl shadow flex-shrink-0 overflow-hidden">
                  {data.guild.logo_url && data.guild.logo_url.startsWith('http') ? (
                    <img src={data.guild.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span>{data.guild.logo_url || '🏰'}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <h4 className="text-xl font-black uppercase tracking-tight">{data.guild.name}</h4>
                    <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-black bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                      [{data.guild.tag}]
                    </span>
                  </div>
                  {data.guild.description && (
                    <p className="text-xs opacity-75 mt-1 max-w-md">{data.guild.description}</p>
                  )}
                  <div className="flex items-center space-x-3 text-[11px] opacity-60 mt-2">
                    <span>Gegründet: {new Date(data.guild.created_at).toLocaleDateString('de-DE')}</span>
                    <span>•</span>
                    <span className="font-bold flex items-center space-x-1">
                      <span>Deine Rolle:</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${isCaptain ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : isVize ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-gray-500/20 opacity-80'}`}>
                        {isCaptain ? '👑 Kapitän' : isVize ? '⚔️ Vize-Kapitän' : '🛡️ Mitglied'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Header Buttons: Bearbeiten (nur Kapitän) oder Verlassen (Mitglieder & Vize) */}
              <div className="flex items-center space-x-2 self-stretch sm:self-auto justify-end">
                {isCaptain ? (
                  <button
                    id="btn-toggle-edit-guild"
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold border border-gray-500/20 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <i className="fas fa-edit"></i>
                    <span>{isEditing ? 'Schließen' : 'Bearbeiten'}</span>
                  </button>
                ) : (
                  <button
                    id="btn-leave-guild-open"
                    onClick={() => setShowLeaveModal(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-500 border border-red-500/30 hover:bg-red-500/10 active:scale-95 transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <i className="fas fa-sign-out-alt"></i>
                    <span>Austreten</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bearbeitungsformular (nur Kapitän) */}
            {isEditing && isCaptain && (
              <div id="wiegschaft-edit-form" className={`mt-5 pt-5 border-t border-gray-500/15 space-y-4`}>
                <h5 className="font-black text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center space-x-1.5">
                  <i className="fas fa-wrench"></i>
                  <span>Wiegschafts-Daten bearbeiten</span>
                </h5>

                {editError && (
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold">
                    {editError}
                  </div>
                )}

                <form onSubmit={handleUpdateGuild} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold opacity-75">Name</label>
                      <input
                        type="text"
                        required
                        maxLength={40}
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-[#238183] ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold opacity-75">Kürzel (max. 5)</label>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        value={editTag}
                        onChange={e => setEditTag(e.target.value.toUpperCase())}
                        className={`w-full p-2.5 rounded-xl border text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#238183] ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold opacity-75">Beschreibung</label>
                    <textarea
                      rows={2}
                      maxLength={160}
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-[#238183] ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold opacity-75 block">Wappen / Logo</label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_CRESTS.map(crest => (
                        <button
                          key={crest}
                          type="button"
                          onClick={() => setEditLogoUrl(crest)}
                          className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer border ${editLogoUrl === crest ? 'border-teal-500 bg-teal-500/20 scale-105' : 'border-gray-500/20 hover:bg-black/5 dark:hover:bg-white/5'}`}
                        >
                          {crest}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Bild-URL (https://...)"
                      value={editLogoUrl.startsWith('http') ? editLogoUrl : ''}
                      onChange={e => setEditLogoUrl(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-[#238183] ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      id="btn-open-delete-guild"
                      onClick={() => setShowDeleteModal(true)}
                      className="text-red-500 hover:text-red-600 font-bold text-xs flex items-center space-x-1.5 cursor-pointer"
                    >
                      <i className="fas fa-trash-alt"></i>
                      <span>Wiegschaft auflösen</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold border border-gray-500/20 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                      >
                        Abbrechen
                      </button>
                      <button
                        type="submit"
                        disabled={editLoading}
                        className="px-4 py-2 rounded-xl text-white font-black text-xs uppercase tracking-wide shadow hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                        style={{ backgroundColor: BRAND_COLOR }}
                      >
                        {editLoading ? 'Speichern...' : 'Änderungen sichern'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Aggregierte Wiegschafts-Ergebnisse */}
          <div id="wiegschaft-stats-card" className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-4`}>
            <div className="flex items-center justify-between">
              <h5 className="font-black text-xs uppercase tracking-wider flex items-center space-x-2">
                <i className="fas fa-chart-line text-[#238183]"></i>
                <span>Eigene Wiegschafts-Ergebnisse</span>
              </h5>
              <span className="text-[10px] font-mono font-bold opacity-60">
                {data.stats?.gamesCount || 0} gewertete Standardspiele (500ml)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div 
                className={`p-3 rounded-xl border text-center ${darkMode ? 'bg-slate-900/60 border-slate-700/60' : 'bg-white border-gray-200'}`}
                title="Summe aller Standardspiele (500ml) aller Mitglieder der Wiegschaft"
              >
                <div className="text-[10px] font-bold opacity-60 uppercase tracking-wider mb-1">Standard (500ml)</div>
                <div className="text-xl font-black">{data.stats?.gamesCount || 0}</div>
              </div>

              <div className={`p-3 rounded-xl border text-center ${darkMode ? 'bg-slate-900/60 border-slate-700/60' : 'bg-white border-gray-200'}`}>
                <div className="text-[10px] font-bold opacity-60 uppercase tracking-wider mb-1">Avg Abstand</div>
                <div className="text-xl font-black text-teal-600 dark:text-teal-400">
                  {data.stats?.avg !== undefined ? data.stats.avg.toFixed(2) : '0.00'}
                </div>
              </div>

              <div 
                className={`p-3 rounded-xl border text-center ${darkMode ? 'bg-slate-900/60 border-slate-700/60' : 'bg-white border-gray-200'}`}
                title={`Gesamt: ${data.stats?.totalSchnaepse || 0} Schnäpse`}
              >
                <div className="text-[10px] font-bold opacity-60 uppercase tracking-wider mb-1">Ø-Schnäpse</div>
                <div className="text-xl font-black text-amber-500">
                  {data.stats?.avgSchnaepse !== undefined ? data.stats.avgSchnaepse.toFixed(2) : '0.00'}
                </div>
              </div>

              <div className={`p-3 rounded-xl border text-center ${darkMode ? 'bg-slate-900/60 border-slate-700/60' : 'bg-white border-gray-200'}`}>
                <div className="text-[10px] font-bold opacity-60 uppercase tracking-wider mb-1">Total Wert</div>
                <div className="text-xl font-black" style={{ color: BRAND_COLOR }}>
                  {data.stats?.total !== undefined ? data.stats.total.toFixed(2) : '0.00'}
                </div>
              </div>
            </div>
          </div>

          {/* Mitgliederliste & Verwaltung */}
          <div id="wiegschaft-members-card" className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-4`}>
            <div className="flex items-center justify-between">
              <h5 className="font-black text-xs uppercase tracking-wider flex items-center space-x-2">
                <i className="fas fa-users text-[#238183]"></i>
                <span>Mitglieder ({data.members.length})</span>
              </h5>
            </div>

            <div className="space-y-2">
              {data.members.map(member => {
                const isSelf = member.user_id === userId;
                const memberIsCaptain = member.role === 'captain';
                const memberIsVize = member.role === 'vize_captain';

                return (
                  <div
                    key={member.id}
                    id={`guild-member-row-${member.user_id}`}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${darkMode ? 'bg-slate-900/80 border-slate-700/70' : 'bg-white border-gray-200'}`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <PlayerAvatar
                        url={member.avatar_url}
                        name={member.username}
                        className="w-9 h-9 border flex-shrink-0"
                        style={{ borderColor: BRAND_COLOR }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <PlayerNameTag
                            name={member.username}
                            colorKey={member.name_bg_color || 'none'}
                            className="px-2 py-0.5 text-xs font-bold"
                          />
                          <PlayerLevelBadge level={member.level || 1} size="xs" />
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              memberIsCaptain
                                ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                                : memberIsVize
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-gray-500/10 opacity-70'
                            }`}
                          >
                            {memberIsCaptain ? '👑 Kapitän' : memberIsVize ? '⚔️ Vize' : 'Mitglied'}
                          </span>
                        </div>
                        <div className="text-[10px] opacity-50 truncate mt-0.5">
                          Beigetreten: {new Date(member.joined_at).toLocaleDateString('de-DE')}
                        </div>
                      </div>
                    </div>

                    {/* Aktions-Buttons für dieses Mitglied (nur wenn Ausführender Berechtigung hat) */}
                    {canManage && !isSelf && !memberIsCaptain && (
                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        {/* Rolle ändern: Befördern / Degradieren */}
                        {isCaptain && (
                          <>
                            {memberIsVize ? (
                              <button
                                id={`btn-demote-${member.user_id}`}
                                title="Zum Mitglied degradieren"
                                disabled={actionLoading === `member_${member.user_id}_demote_member`}
                                onClick={() => handleManageMember(member.user_id, 'demote_member')}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 active:scale-95 cursor-pointer disabled:opacity-50"
                              >
                                Vize entziehen
                              </button>
                            ) : (
                              <button
                                id={`btn-promote-${member.user_id}`}
                                title="Zum Vize-Kapitän befördern"
                                disabled={actionLoading === `member_${member.user_id}_promote_vize`}
                                onClick={() => handleManageMember(member.user_id, 'promote_vize')}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 active:scale-95 cursor-pointer disabled:opacity-50"
                              >
                                ⚔️ Zum Vize
                              </button>
                            )}
                          </>
                        )}

                        {/* Mitglied kicken (Kapitän kann alle Nicht-Kapitäne kicken; Vize kann nur normale Mitglieder kicken) */}
                        {(isCaptain || (isVize && !memberIsVize)) && (
                          <button
                            id={`btn-kick-${member.user_id}`}
                            title="Aus Wiegschaft entfernen"
                            disabled={actionLoading === `member_${member.user_id}_kick`}
                            onClick={() => {
                              if (confirm(`Möchtest du "${member.username}" wirklich aus der Wiegschaft entfernen?`)) {
                                handleManageMember(member.user_id, 'kick');
                              }
                            }}
                            className="w-7 h-7 rounded-lg text-red-500 hover:bg-red-500/10 border border-red-500/20 flex items-center justify-center text-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <i className="fas fa-user-minus"></i>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Neue Mitglieder einladen (Kapitän & Vize-Kapitän) */}
          {canManage && (
            <div id="wiegschaft-invite-form-card" className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'} space-y-3`}>
              <h5 className="font-black text-xs uppercase tracking-wider flex items-center space-x-2">
                <i className="fas fa-paper-plane text-[#238183]"></i>
                <span>Mitglied einladen</span>
              </h5>
              <p className="text-xs opacity-70">
                Gib den Benutzernamen des Spielers ein, den du in die Wiegschaft einladen möchtest.
              </p>

              {inviteMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs font-bold ${
                    inviteMsg.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                      : 'bg-red-500/10 border-red-500/30 text-red-500'
                  }`}
                >
                  {inviteMsg.text}
                </div>
              )}

              <form onSubmit={handleInviteMember} className="flex gap-2">
                <input
                  id="input-invite-username"
                  type="text"
                  required
                  placeholder="Benutzername eingeben..."
                  value={inviteUsername}
                  onChange={e => setInviteUsername(e.target.value)}
                  className={`flex-1 p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-[#238183] ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}
                />
                <button
                  id="btn-send-guild-invite"
                  type="submit"
                  disabled={inviteLoading}
                  className="px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow hover:opacity-90 active:scale-95 transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: BRAND_COLOR }}
                >
                  {inviteLoading ? (
                    <i className="fas fa-spinner animate-spin"></i>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i>
                      <span>Einladen</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* MODAL: Wiegschaft auflösen (Bestätigung) */}
          {showDeleteModal && (
            <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className={`p-6 rounded-3xl max-w-md w-full border-2 space-y-4 shadow-2xl ${darkMode ? 'bg-slate-900 border-red-500/50 text-white' : 'bg-white border-red-500/40 text-gray-900'}`}>
                <div className="flex items-center space-x-3 text-red-500">
                  <i className="fas fa-exclamation-triangle text-2xl"></i>
                  <h4 className="font-black text-base uppercase">Wiegschaft auflösen?</h4>
                </div>
                <p className="text-xs opacity-80 leading-relaxed">
                  Bist du sicher, dass du die Wiegschaft <strong>"{data.guild.name}"</strong> unwiderruflich auflösen möchtest? Alle Mitglieder werden entlassen und alle offenen Einladungen gelöscht.
                </p>
                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-500/20 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  >
                    Abbrechen
                  </button>
                  <button
                    disabled={actionLoading === 'delete'}
                    onClick={handleDeleteGuild}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider shadow active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading === 'delete' ? 'Löschen...' : 'Ja, auflösen'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL: Wiegschaft verlassen (Bestätigung) */}
          {showLeaveModal && (
            <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className={`p-6 rounded-3xl max-w-md w-full border-2 space-y-4 shadow-2xl ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                <div className="flex items-center space-x-3 text-amber-500">
                  <i className="fas fa-sign-out-alt text-2xl"></i>
                  <h4 className="font-black text-base uppercase">Wiegschaft verlassen?</h4>
                </div>
                <p className="text-xs opacity-80 leading-relaxed">
                  Möchtest du die Wiegschaft <strong>"{data.guild.name}"</strong> wirklich verlassen? Du kannst später nur wieder beitreten, wenn du erneut eingeladen wirst.
                </p>
                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    onClick={() => setShowLeaveModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-500/20 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  >
                    Abbrechen
                  </button>
                  <button
                    disabled={actionLoading === 'leave'}
                    onClick={handleLeaveGuild}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider shadow active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading === 'leave' ? 'Verlassen...' : 'Ja, verlassen'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WiegschaftenTab;
