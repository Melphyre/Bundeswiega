import React, { useState, useMemo, useEffect } from 'react';
import {
  AdminAchievement,
  AchievementRarity,
  AchievementCategory,
  CATEGORY_LABELS,
  RARITY_LABELS,
  loadAdminAchievements,
  saveAdminAchievement,
  resetAdminAchievement,
  resetAllAdminAchievements,
  getRarityBadgeProps
} from '../services/achievementAdminService';
import { BRAND_COLOR } from '../constants';

interface AdminAchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
}

export const AdminAchievementsModal: React.FC<AdminAchievementsModalProps> = ({
  isOpen,
  onClose,
  darkMode
}) => {
  const [achievements, setAchievements] = useState<AdminAchievement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRarity, setSelectedRarity] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Edit Dialog State
  const [editingAchievement, setEditingAchievement] = useState<AdminAchievement | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    icon: string;
    rarity: AchievementRarity;
    condition: string;
  }>({
    title: '',
    description: '',
    icon: '',
    rarity: 'common',
    condition: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Load achievements on open
  useEffect(() => {
    if (isOpen) {
      setAchievements(loadAdminAchievements());
      setFeedbackMsg(null);
    }
  }, [isOpen]);

  // Filtered achievements
  const filteredAchievements = useMemo(() => {
    return achievements.filter(ach => {
      // Search text
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = ach.title.toLowerCase().includes(query);
        const matchDesc = ach.description.toLowerCase().includes(query);
        const matchId = ach.id.toLowerCase().includes(query);
        const matchCond = ach.condition.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchId && !matchCond) {
          return false;
        }
      }

      // Rarity filter
      if (selectedRarity !== 'all' && ach.rarity !== selectedRarity) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && ach.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [achievements, searchQuery, selectedRarity, selectedCategory]);

  // Counts by rarity
  const rarityCounts = useMemo(() => {
    const counts = { common: 0, rare: 0, epic: 0, legendary: 0 };
    achievements.forEach(a => {
      if (counts[a.rarity] !== undefined) counts[a.rarity]++;
    });
    return counts;
  }, [achievements]);

  if (!isOpen) return null;

  const handleStartEdit = (ach: AdminAchievement) => {
    setEditingAchievement(ach);
    setEditForm({
      title: ach.title,
      description: ach.description,
      icon: ach.icon,
      rarity: ach.rarity,
      condition: ach.condition
    });
  };

  const handleSaveEdit = async () => {
    if (!editingAchievement) return;
    setIsSaving(true);
    setFeedbackMsg(null);

    const updated: AdminAchievement = {
      ...editingAchievement,
      title: editForm.title.trim() || editingAchievement.title,
      description: editForm.description.trim() || editingAchievement.description,
      icon: editForm.icon.trim() || editingAchievement.icon,
      rarity: editForm.rarity,
      condition: editForm.condition.trim() || editingAchievement.condition,
      isCustomized: true
    };

    const res = await saveAdminAchievement(updated);
    setIsSaving(false);

    if (res.success) {
      setAchievements(prev => prev.map(a => a.id === updated.id ? updated : a));
      setEditingAchievement(null);
      setFeedbackMsg({ text: `Achievement "${updated.title}" erfolgreich gespeichert!`, type: 'success' });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } else {
      setFeedbackMsg({ text: `Fehler beim Speichern: ${res.error}`, type: 'error' });
    }
  };

  const handleResetSingle = (id: string) => {
    const restored = resetAdminAchievement(id);
    if (restored) {
      setAchievements(prev => prev.map(a => a.id === id ? restored : a));
      if (editingAchievement?.id === id) {
        setEditingAchievement(null);
      }
      setFeedbackMsg({ text: `Achievement auf Standard zurückgesetzt.`, type: 'success' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  };

  const handleResetAll = () => {
    if (window.confirm('Möchtest du wirklich alle Achievements auf die ursprünglichen Standardwerte zurücksetzen?')) {
      const resetList = resetAllAdminAchievements();
      setAchievements(resetList);
      setEditingAchievement(null);
      setFeedbackMsg({ text: `Alle Achievements wurden auf den Standardzustand zurückgesetzt.`, type: 'success' });
      setTimeout(() => setFeedbackMsg(null), 3500);
    }
  };

  return (
    <div className="fixed inset-0 z-[800] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md p-0 md:p-4 animate-in fade-in">
      <div className={`w-full max-w-6xl rounded-t-3xl md:rounded-3xl flex flex-col max-h-[94dvh] shadow-2xl border ${
        darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-gray-300 text-gray-900'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-gray-500/20 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl shadow-inner border border-amber-500/30">
              🏆
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black flex items-center space-x-2 text-amber-400">
                <span>Achievements Übersicht &amp; Verwaltung</span>
              </h3>
              <p className="text-xs opacity-60 font-medium mt-0.5">
                {achievements.length} Errungenschaften registriert • Trigger-Prüfung &amp; Live-Anpassung
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-500/10 hover:bg-gray-500/20 text-xl font-bold cursor-pointer transition-all"
            title="Schließen"
          >
            ✕
          </button>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackMsg && (
          <div className={`mx-6 mt-4 p-3 rounded-xl border flex items-center justify-between text-xs font-bold animate-in slide-in-from-top-2 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-red-500/20 border-red-500/40 text-red-300'
          }`}>
            <div className="flex items-center space-x-2">
              <i className={`fas ${feedbackMsg.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}`}></i>
              <span>{feedbackMsg.text}</span>
            </div>
            <button onClick={() => setFeedbackMsg(null)} className="opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Filters and Search Toolbar */}
        <div className="p-4 md:p-6 pb-4 border-b border-gray-500/20 flex-shrink-0 space-y-3 bg-black/5 dark:bg-white/5">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Suche nach Name, Beschreibung, Trigger oder ID..."
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold opacity-60 uppercase whitespace-nowrap">Kategorie:</label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="all">Alle Kategorien ({achievements.length})</option>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                  const count = achievements.filter(a => a.category === key).length;
                  return (
                    <option key={key} value={key}>
                      {label} ({count})
                    </option>
                  );
                })}
              </select>

              {/* Reset All Button */}
              <button
                type="button"
                onClick={handleResetAll}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer"
                title="Alle Werte auf Systemstandard zurücksetzen"
              >
                <i className="fas fa-undo"></i>
                <span className="hidden sm:inline">Alle zurücksetzen</span>
              </button>
            </div>
          </div>

          {/* Rarity Filter Chips */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-1 scrollbar-thin">
            <span className="text-xs font-bold opacity-60 uppercase mr-1 whitespace-nowrap">Rarität:</span>
            <button
              type="button"
              onClick={() => setSelectedRarity('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap cursor-pointer ${
                selectedRarity === 'all'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                  : darkMode ? 'bg-slate-800/80 border-slate-700 text-gray-300 hover:bg-slate-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Alle ({achievements.length})
            </button>
            {(['common', 'rare', 'epic', 'legendary'] as AchievementRarity[]).map(rarity => {
              const count = rarityCounts[rarity];
              const badge = getRarityBadgeProps(rarity);
              const isActive = selectedRarity === rarity;
              return (
                <button
                  key={rarity}
                  type="button"
                  onClick={() => setSelectedRarity(rarity)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
                    isActive
                      ? 'ring-2 ring-amber-400 font-black ' + badge.badgeClass
                      : badge.badgeClass + ' opacity-75 hover:opacity-100'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${badge.dotColor}`}></span>
                  <span>{badge.label}</span>
                  <span className="opacity-60 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content: Table & Cards */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
          <div className="flex items-center justify-between text-xs opacity-60 font-semibold px-1 pb-1">
            <span>Zeige {filteredAchievements.length} von {achievements.length} Achievements</span>
            {filteredAchievements.some(a => a.isCustomized) && (
              <span className="text-amber-400 font-bold flex items-center space-x-1">
                <i className="fas fa-pencil-alt text-[10px]"></i>
                <span>Enthält angepasste Achievements</span>
              </span>
            )}
          </div>

          {filteredAchievements.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
              <div className="text-4xl mb-3">🔍</div>
              <p className="font-bold text-base mb-1">Keine Achievements gefunden</p>
              <p className="text-xs opacity-60">Versuche die Suchbegriffe oder Filter anzupassen.</p>
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSelectedRarity('all'); setSelectedCategory('all'); }}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-all cursor-pointer"
              >
                Filter zurücksetzen
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block rounded-2xl border border-gray-500/20 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className={`border-b border-gray-500/20 uppercase tracking-wider font-black text-[11px] ${
                    darkMode ? 'bg-slate-800/80 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}>
                    <tr>
                      <th className="p-3.5 pl-4 w-[220px]">Icon &amp; Name</th>
                      <th className="p-3.5">Beschreibung</th>
                      <th className="p-3.5 w-[240px]">Auslöse-Logik (Bedingung)</th>
                      <th className="p-3.5 w-[130px]">Rarität</th>
                      <th className="p-3.5 w-[140px]">Kategorie</th>
                      <th className="p-3.5 pr-4 w-[110px] text-right">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y border-gray-500/10 ${darkMode ? 'divide-slate-800/80' : 'divide-gray-200'}`}>
                    {filteredAchievements.map((ach) => {
                      const badge = getRarityBadgeProps(ach.rarity);
                      return (
                        <tr
                          key={ach.id}
                          className={`transition-colors ${
                            ach.isCustomized
                              ? darkMode ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'bg-amber-50/50 hover:bg-amber-50'
                              : darkMode ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50'
                          }`}
                        >
                          {/* Icon & Name */}
                          <td className="p-3.5 pl-4">
                            <div className="flex items-center space-x-2.5">
                              <span className="text-2xl flex-shrink-0 w-8 text-center">{ach.icon}</span>
                              <div className="min-w-0">
                                <div className="font-black text-sm flex items-center space-x-1.5">
                                  <span className="truncate">{ach.title}</span>
                                  {ach.isCustomized && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40" title="Benutzerdefiniert angepasst">
                                      Edit
                                    </span>
                                  )}
                                </div>
                                <div className="font-mono text-[10px] opacity-40 truncate">
                                  id: {ach.id}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Beschreibung */}
                          <td className="p-3.5">
                            <p className="opacity-90 leading-relaxed max-w-sm">
                              {ach.description}
                            </p>
                            {ach.earnedTogether && (
                              <span className="inline-flex items-center space-x-1 mt-1 text-[10px] font-bold text-indigo-400 opacity-80">
                                <i className="fas fa-user-friends text-[9px]"></i>
                                <span>Zusammen errungen</span>
                              </span>
                            )}
                          </td>

                          {/* Auslöse-Logik */}
                          <td className="p-3.5">
                            <div className={`p-2 rounded-lg font-mono text-[11px] border leading-tight break-all ${
                              darkMode ? 'bg-slate-950/70 border-slate-800 text-emerald-400' : 'bg-gray-100 border-gray-300 text-emerald-700'
                            }`}>
                              {ach.condition}
                            </div>
                          </td>

                          {/* Rarität */}
                          <td className="p-3.5">
                            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-black border ${badge.badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`}></span>
                              <span>{badge.label}</span>
                            </span>
                          </td>

                          {/* Kategorie */}
                          <td className="p-3.5">
                            <span className="text-xs opacity-75 font-semibold">
                              {ach.categoryLabel}
                            </span>
                          </td>

                          {/* Aktionen */}
                          <td className="p-3.5 pr-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(ach)}
                              className="px-3 py-1.5 rounded-xl font-black text-xs text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center space-x-1.5 ml-auto shadow-sm cursor-pointer active:scale-95"
                              title="Achievement bearbeiten"
                            >
                              <i className="fas fa-edit text-[11px]"></i>
                              <span>Bearbeiten</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {filteredAchievements.map((ach) => {
                  const badge = getRarityBadgeProps(ach.rarity);
                  return (
                    <div
                      key={ach.id}
                      className={`p-4 rounded-2xl border space-y-3 ${
                        ach.isCustomized
                          ? 'border-amber-500/40 bg-amber-500/5'
                          : darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2.5">
                          <span className="text-3xl">{ach.icon}</span>
                          <div>
                            <div className="font-black text-base flex items-center space-x-2">
                              <span>{ach.title}</span>
                              {ach.isCustomized && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                  Edit
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[10px] opacity-40">id: {ach.id}</span>
                          </div>
                        </div>

                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.8 rounded-full text-[10px] font-black border flex-shrink-0 ${badge.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`}></span>
                          <span>{badge.label}</span>
                        </span>
                      </div>

                      <p className="text-xs opacity-90 leading-relaxed">
                        {ach.description}
                      </p>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase opacity-60">Auslöse-Bedingung:</span>
                        <div className={`p-2 rounded-lg font-mono text-[11px] border leading-tight break-all ${
                          darkMode ? 'bg-slate-950/70 border-slate-800 text-emerald-400' : 'bg-gray-100 border-gray-300 text-emerald-700'
                        }`}>
                          {ach.condition}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-gray-500/10">
                        <span className="text-[11px] opacity-60 font-semibold">{ach.categoryLabel}</span>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(ach)}
                          className="px-3.5 py-2 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center space-x-1.5 cursor-pointer shadow"
                        >
                          <i className="fas fa-edit text-xs"></i>
                          <span>Bearbeiten</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 md:p-5 border-t border-gray-500/20 flex-shrink-0 flex items-center justify-between bg-black/5 dark:bg-white/5">
          <div className="text-xs opacity-60 font-medium hidden sm:block">
            Änderungen werden in der Datenbank und im Browser-Speicher synchronisiert.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-white font-bold text-xs cursor-pointer shadow hover:opacity-90 transition-all"
            style={{ backgroundColor: BRAND_COLOR }}
          >
            Schließen
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ✏️ EDIT MODAL DIALOG                                       */}
      {/* ========================================================= */}
      {editingAchievement && (
        <div className="fixed inset-0 z-[850] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] ${
            darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'
          }`}>
            
            {/* Edit Header */}
            <div className="p-5 border-b border-gray-500/20 flex items-center justify-between bg-black/10 dark:bg-white/5 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{editForm.icon || '🏆'}</span>
                <div>
                  <h4 className="font-black text-base md:text-lg text-amber-400">
                    Achievement bearbeiten
                  </h4>
                  <div className="font-mono text-xs opacity-50">
                    ID: {editingAchievement.id} • {editingAchievement.categoryLabel}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAchievement(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center opacity-60 hover:opacity-100 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Edit Body */}
            <div className="p-5 md:p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Icon & Title row */}
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="block text-[11px] font-bold opacity-70 uppercase mb-1">
                    Icon
                  </label>
                  <input
                    type="text"
                    value={editForm.icon}
                    onChange={e => setEditForm(prev => ({ ...prev, icon: e.target.value }))}
                    className={`w-full p-2.5 rounded-xl border text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}
                    maxLength={4}
                  />
                </div>

                <div className="col-span-3">
                  <label className="block text-[11px] font-bold opacity-70 uppercase mb-1">
                    Name / Titel
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    className={`w-full p-2.5 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}
                    placeholder="Name des Achievements"
                  />
                </div>
              </div>

              {/* Quick Icon Presets */}
              <div>
                <label className="block text-[10px] font-bold opacity-50 uppercase mb-1">
                  Icon Vorschläge:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['🎯', '👑', '⚡', '🏆', '🥇', '🥈', '🥉', '🍺', '🍻', '✨', '🔬', '⚖️', '🎰', '💎', '🚀', '🔥', '🤖', '👥', '🪞', '🎲'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, icon: emoji }))}
                      className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center border transition-transform active:scale-90 cursor-pointer ${
                        editForm.icon === emoji
                          ? 'bg-amber-500/30 border-amber-400 scale-110'
                          : 'bg-gray-500/10 border-gray-500/20 hover:bg-gray-500/20'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Beschreibung */}
              <div>
                <label className="block text-[11px] font-bold opacity-70 uppercase mb-1">
                  Beschreibung (vom Spieler gesehen)
                </label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className={`w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                  placeholder="Beschreibe, was der Spieler tun muss..."
                />
              </div>

              {/* Rarität Selector */}
              <div>
                <label className="block text-[11px] font-bold opacity-70 uppercase mb-1.5">
                  Rarität / Seltenheitsstufe
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['common', 'rare', 'epic', 'legendary'] as AchievementRarity[]).map(rarity => {
                    const badge = getRarityBadgeProps(rarity);
                    const isSelected = editForm.rarity === rarity;
                    return (
                      <button
                        key={rarity}
                        type="button"
                        onClick={() => setEditForm(prev => ({ ...prev, rarity }))}
                        className={`p-2.5 rounded-xl border text-xs font-black flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-amber-400 scale-102 ' + badge.badgeClass
                            : badge.badgeClass + ' opacity-60 hover:opacity-100'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${badge.dotColor}`}></span>
                        <span>{badge.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auslöse-Logik / Bedingung */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold opacity-70 uppercase">
                    Auslöse-Logik / Bedingung (Code-Trigger)
                  </label>
                  <span className="text-[10px] font-mono opacity-50">Logik-Syntax</span>
                </div>
                <input
                  type="text"
                  value={editForm.condition}
                  onChange={e => setEditForm(prev => ({ ...prev, condition: e.target.value }))}
                  className={`w-full p-2.5 rounded-xl border font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    darkMode ? 'bg-slate-950 border-slate-700 text-emerald-400' : 'bg-gray-50 border-gray-300 text-emerald-700'
                  }`}
                  placeholder="z. B. games_won >= 1 oder streak(dist < 5g) >= 3"
                />
                <p className="text-[10px] opacity-50 mt-1">
                  Dokumentiert die Bedingung bzw. den mathematischen Schwellenwert zur Freischaltung.
                </p>
              </div>

              {/* Live Preview Box */}
              <div className={`p-3.5 rounded-2xl border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-100 border-gray-200'} space-y-1.5`}>
                <div className="text-[10px] font-bold uppercase opacity-60 tracking-wider">Vorschau im Spielerprofil:</div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{editForm.icon || '🏆'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-sm">{editForm.title || 'Unbenannt'}</span>
                      {(() => {
                        const b = getRarityBadgeProps(editForm.rarity);
                        return (
                          <span className={`px-2 py-0.2 rounded-full text-[9px] font-black border ${b.badgeClass}`}>
                            {b.label}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-xs opacity-75 truncate">{editForm.description || 'Keine Beschreibung'}</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Edit Footer Actions */}
            <div className="p-4 md:p-5 border-t border-gray-500/20 flex-shrink-0 flex items-center justify-between bg-black/10 dark:bg-white/5 gap-2">
              <div>
                {editingAchievement.isCustomized && (
                  <button
                    type="button"
                    onClick={() => handleResetSingle(editingAchievement.id)}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all cursor-pointer flex items-center space-x-1"
                    title="Zurück zum Standard"
                  >
                    <i className="fas fa-undo text-[10px]"></i>
                    <span>Standard</span>
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingAchievement(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold opacity-75 hover:opacity-100 transition-all cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-md transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {isSaving ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      <span>Speichern...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i>
                      <span>Änderungen speichern</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminAchievementsModal;
