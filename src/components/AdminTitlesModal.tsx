import React, { useState, useMemo } from 'react';
import { BRAND_COLOR } from '../constants';
import { PLAYER_TITLES } from '../constants/titlesConfig';
import { PlayerTitleBadge } from './PlayerTitleBadge';
import { PlayerLevelBadge } from './PlayerLevelBadge';
import { LEVEL_PROGRESSION_TABLE, LevelProgressionEntry } from '../utils/levelSystem';
import { NAME_TAG_COLORS } from '../constants/nameTagConfig';

interface AdminTitlesModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

export const AdminTitlesModal: React.FC<AdminTitlesModalProps> = ({
  isOpen,
  onClose,
  darkMode = false
}) => {
  const [activeTab, setActiveTab] = useState<'levels' | 'titles'>('levels');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCodeGuide, setShowCodeGuide] = useState(false);

  const categories: Array<{ id: string; label: string; icon: string }> = [
    { id: 'all', label: 'Alle', icon: 'fa-list' },
    { id: 'level', label: 'Level & Stufen', icon: 'fa-layer-group' },
    { id: 'spiele', label: 'Spieleanzahl', icon: 'fa-dice' },
    { id: 'praezision', label: 'Präzision (Ø)', icon: 'fa-bullseye' },
    { id: 'schnaepse', label: 'Schnäpse', icon: 'fa-glass-whiskey' },
    { id: 'achievements', label: 'Achievements', icon: 'fa-trophy' }
  ];

  const filteredTitles = useMemo(() => {
    return PLAYER_TITLES.filter(title => {
      const matchSearch =
        title.name.toLowerCase().includes(search.toLowerCase()) ||
        title.id.toLowerCase().includes(search.toLowerCase()) ||
        title.description.toLowerCase().includes(search.toLowerCase()) ||
        title.conditionText.toLowerCase().includes(search.toLowerCase());

      const matchCategory = selectedCategory === 'all' || title.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [search, selectedCategory]);

  const filteredLevels = useMemo(() => {
    if (!search.trim()) return LEVEL_PROGRESSION_TABLE;
    const q = search.toLowerCase();
    return LEVEL_PROGRESSION_TABLE.filter(
      lvl =>
        lvl.level.toString().includes(q) ||
        lvl.rewardTitle.toLowerCase().includes(q) ||
        lvl.rewardDescription.toLowerCase().includes(q) ||
        (lvl.badgeText && lvl.badgeText.toLowerCase().includes(q))
    );
  }, [search]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[950] flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`rounded-3xl p-5 md:p-7 max-w-5xl w-full shadow-2xl space-y-5 border-2 max-h-[92vh] flex flex-col ${
          darkMode
            ? 'bg-slate-900 border-slate-700 text-white'
            : 'bg-white border-slate-200 text-gray-900'
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-4 border-gray-500/20 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-lg shadow-sm"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              <i className="fas fa-layer-group"></i>
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">
                Titel & Level-Progression verwalten
              </h3>
              <p className="text-xs opacity-60">
                Level-Progression (1–20), XP-Schwellenwerte und Spielertitel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-500/20 gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('levels');
              setSearch('');
            }}
            className={`py-2.5 px-4 font-black text-xs md:text-sm border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'levels'
                ? 'border-[#238183] text-[#238183]'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <i className="fas fa-chart-line"></i>
            <span>Level-Progression (1–20)</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#238183]/15 text-[#238183] font-bold">
              20 Stufen
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('titles');
              setSearch('');
            }}
            className={`py-2.5 px-4 font-black text-xs md:text-sm border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'titles'
                ? 'border-[#238183] text-[#238183]'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <i className="fas fa-crown"></i>
            <span>Spielertitel</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#238183]/15 text-[#238183] font-bold">
              {PLAYER_TITLES.length} aktiv
            </span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: LEVEL PROGRESSION (LEVEL 1 BIS 20) */}
        {/* ========================================================================= */}
        {activeTab === 'levels' && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            {/* Info Summary Banner */}
            <div className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-black text-teal-600 dark:text-teal-400 uppercase tracking-wide">
                    XP-Berechnungsformel
                  </span>
                  <span className="font-mono text-[11px] bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded font-bold">
                    Kumuliert: 50 * (Level - 1) * Level
                  </span>
                </div>
                <p className="text-[11px] opacity-70">
                  Konfiguration zentral in <code className="font-mono font-bold">src/utils/levelSystem.ts</code> (LEVEL_PROGRESSION_TABLE). Anpassungen sind sofort im gesamten System wirksam.
                </p>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <div className="text-right pr-2">
                  <span className="text-[10px] uppercase font-bold opacity-60 block">Max Level</span>
                  <span className="text-sm font-black text-teal-600 dark:text-teal-400">Stufe 20</span>
                </div>
                <div className="h-7 w-px bg-gray-500/20"></div>
                <div className="text-right pl-2">
                  <span className="text-[10px] uppercase font-bold opacity-60 block">Gesamt-XP</span>
                  <span className="text-sm font-black text-amber-500">19.000 XP</span>
                </div>
              </div>
            </div>

            {/* Suchfeld für Level */}
            <div className="relative flex-shrink-0">
              <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 text-xs"></i>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Level, Belohnung oder Art suchen..."
                className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[#238183] ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Vollständige Tabelle Level 1 bis 20 */}
            <div className="flex-1 overflow-y-auto border rounded-2xl overflow-hidden shadow-inner flex flex-col border-gray-500/20">
              <table className="w-full text-left border-collapse text-xs">
                <thead className={`sticky top-0 z-10 border-b font-black uppercase text-[11px] tracking-wider ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-gray-100 border-gray-200 text-gray-700'
                }`}>
                  <tr>
                    <th className="py-3 px-3 w-16 text-center">Stufe</th>
                    <th className="py-3 px-3 w-28 text-right">XP für Stufe</th>
                    <th className="py-3 px-3 w-32 text-right">Kumulierte XP</th>
                    <th className="py-3 px-4">Freigeschaltete Belohnung & Feature</th>
                    <th className="py-3 px-3 w-28 text-center">Kategorie</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-gray-100'}`}>
                  {filteredLevels.map((lvl) => {
                    const isLevel1 = lvl.level === 1;
                    const isLevel2 = lvl.level === 2;

                    return (
                      <tr
                        key={lvl.level}
                        className={`transition-colors ${
                          isLevel2
                            ? (darkMode ? 'bg-teal-950/20 hover:bg-teal-950/30' : 'bg-teal-50/70 hover:bg-teal-50')
                            : (darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50/80')
                        }`}
                      >
                        {/* Stufe */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center">
                            <PlayerLevelBadge level={lvl.level} size="md" />
                          </div>
                        </td>

                        {/* Benötigte XP für diesen Stufenaufstieg */}
                        <td className="py-3 px-3 text-right font-mono font-bold">
                          {isLevel1 ? (
                            <span className="opacity-40">Start (0)</span>
                          ) : (
                            <span className="text-teal-600 dark:text-teal-400">
                              +{lvl.xpRequiredForLevel.toLocaleString('de-DE')} XP
                            </span>
                          )}
                        </td>

                        {/* Kumulierte Gesamt-XP */}
                        <td className="py-3 px-3 text-right font-mono font-black">
                          <span className={lvl.cumulativeXp > 0 ? 'text-amber-500 dark:text-amber-400' : 'opacity-40'}>
                            {lvl.cumulativeXp.toLocaleString('de-DE')} XP
                          </span>
                        </td>

                        {/* Belohnung */}
                        <td className="py-3 px-4">
                          <div className="flex items-start space-x-2.5">
                            <span className="text-lg leading-none pt-0.5">{lvl.icon}</span>
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                <span className="font-black text-xs md:text-sm">
                                  {lvl.rewardTitle}
                                </span>
                                {isLevel1 && (
                                  <PlayerTitleBadge title="Neuling" size="sm" />
                                )}
                                {isLevel2 && (
                                  <span className="flex items-center gap-1">
                                    {NAME_TAG_COLORS.filter(c => c.id !== 'none').map(c => (
                                      <span
                                        key={c.id}
                                        className="w-3 h-3 rounded-full border border-black/20 shadow-xs inline-block"
                                        style={{ backgroundColor: c.bgHex }}
                                        title={c.label}
                                      />
                                    ))}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] opacity-70 leading-snug">
                                {lvl.rewardDescription}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Kategorie Badge */}
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-block ${
                            lvl.rewardType === 'feature'
                              ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30'
                              : lvl.rewardType === 'title'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                              : lvl.rewardType === 'badge'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                              : 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30'
                          }`}>
                            {lvl.badgeText || lvl.rewardType}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SPIELERTITEL */}
        {/* ========================================================================= */}
        {activeTab === 'titles' && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            {/* Controls: Search & Category Filter */}
            <div className="space-y-3 flex-shrink-0">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 text-xs"></i>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Titel nach Name, ID oder Bedingung filtern..."
                    className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[#238183] ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowCodeGuide(!showCodeGuide)}
                  className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
                    showCodeGuide
                      ? 'bg-teal-500/20 border-teal-500 text-teal-400'
                      : (darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-gray-100 border-gray-300 hover:bg-gray-200')
                  }`}
                >
                  <i className="fas fa-code"></i>
                  <span>{showCodeGuide ? 'Guide verbergen' : 'Titel-Codeanleitung'}</span>
                </button>
              </div>

              {/* Category Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'text-white shadow-sm'
                        : (darkMode ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700')
                    }`}
                    style={selectedCategory === cat.id ? { backgroundColor: BRAND_COLOR } : {}}
                  >
                    <i className={`fas ${cat.icon} text-[10px]`}></i>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Developer Guide */}
            {showCodeGuide && (
              <div className={`p-4 rounded-2xl border text-xs space-y-2 animate-in fade-in flex-shrink-0 ${
                darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-teal-50/80 border-teal-200'
              }`}>
                <div className="flex items-center space-x-2 font-black uppercase text-teal-500 tracking-wider">
                  <i className="fas fa-lightbulb"></i>
                  <span>Zentrales Titel-Array in titlesConfig.ts</span>
                </div>
                <p className="opacity-80">
                  Die Titel-Konfiguration wurde wie gewünscht auf ein einfaches, zentrales Array in <code className="font-mono bg-black/20 px-1.5 py-0.5 rounded">src/constants/titlesConfig.ts</code> bereinigt. Nur der Standardtitel <strong>"Neuling"</strong> ist aktiv.
                </p>
                <p className="opacity-80 leading-relaxed">
                  Um später neue Titel mit ihren Freischaltbedingungen (Level, Spiele, Achievements) hinzuzufügen, ergänze einfach ein Objekt im Array <code className="font-mono bg-black/20 px-1 rounded">PLAYER_TITLES</code>.
                </p>
              </div>
            )}

            {/* Titles Table / Cards */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              {filteredTitles.length === 0 ? (
                <div className="text-center py-12 opacity-50 space-y-2">
                  <i className="fas fa-search text-3xl"></i>
                  <p className="text-sm font-bold">Keine passenden Titel gefunden.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredTitles.map((title) => (
                    <div
                      key={title.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                        darkMode
                          ? 'bg-slate-800/40 border-slate-700/80 hover:border-slate-600'
                          : 'bg-gray-50/70 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="space-y-2">
                        {/* Top row: Badge & ID */}
                        <div className="flex items-center justify-between gap-2">
                          <PlayerTitleBadge title={title.name} size="md" />
                          <span className="font-mono text-[10px] opacity-40 px-2 py-0.5 rounded-md bg-black/10 dark:bg-white/10">
                            #{title.id}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs opacity-75 font-medium leading-snug">
                          {title.description}
                        </p>
                      </div>

                      {/* Bottom row: Condition and Category */}
                      <div className={`pt-2 border-t text-[11px] flex items-center justify-between gap-2 ${
                        darkMode ? 'border-slate-700/60' : 'border-gray-200'
                      }`}>
                        <div className="flex items-center space-x-1.5 truncate">
                          <i className="fas fa-lock-open text-teal-500 text-[10px]"></i>
                          <span className="font-bold text-teal-600 dark:text-teal-400 truncate" title={title.conditionText}>
                            {title.conditionText}
                          </span>
                        </div>

                        <span className="text-[9px] uppercase font-black tracking-wider opacity-50 whitespace-nowrap">
                          {title.category}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-500/20 text-xs opacity-60 flex-shrink-0">
          <span>
            {activeTab === 'levels'
              ? `${filteredLevels.length} von 20 Level-Stufen angezeigt`
              : `${filteredTitles.length} von ${PLAYER_TITLES.length} Titeln angezeigt`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border font-bold hover:opacity-100 cursor-pointer"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminTitlesModal;
