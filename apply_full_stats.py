import re

with open('App.tsx', 'r') as f:
    content = f.read()

# ==========================================
# 1. Update highest_schnaepse
# ==========================================
highest_schnaepse_code = """                        {activeStandardSubTab === 'highest_schnaepse' && (() => {
                          const sortedByAvgSchnaepse = [...playerStatsList].sort((a,b) => {
                            if (b.avgSchnaepsePerGame !== a.avgSchnaepsePerGame) {
                              return schnaepseSortDir === 'desc'
                                ? b.avgSchnaepsePerGame - a.avgSchnaepsePerGame
                                : a.avgSchnaepsePerGame - b.avgSchnaepsePerGame;
                            }
                            if (b.totalSchnaepse !== a.totalSchnaepse) {
                              return schnaepseSortDir === 'desc'
                                ? b.totalSchnaepse - a.totalSchnaepse
                                : a.totalSchnaepse - b.totalSchnaepse;
                            }
                            return schnaepseSortDir === 'desc'
                              ? a.careerAverage - b.careerAverage
                              : b.careerAverage - a.careerAverage;
                          });
                          const sortedBySingleSchnaepse = [...filtered].sort((a,b) =>
                            schnaepseSortDir === 'desc' ? b.schnaepse - a.schnaepse : a.schnaepse - b.schnaepse
                          );
                          
                          const topAvgSchnaepse = sortedByAvgSchnaepse[0];
                          const topSingle = sortedBySingleSchnaepse[0];
                          
                          return (
                            <div className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {topAvgSchnaepse && (
                                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-yellow-500/20' : 'bg-emerald-500/5 border-emerald-500/10'} flex items-center space-x-4`}>
                                    <button
                                      type="button"
                                      onClick={() => { playGlobalClickSound(); setSelectedPlayerForDetails(topAvgSchnaepse.name); }}
                                      className="relative group shrink-0 cursor-pointer focus:outline-none transition-transform hover:scale-105 active:scale-95"
                                      title={`Profilbild von ${topAvgSchnaepse.name} in groß ansehen`}
                                    >
                                      <PlayerAvatar
                                        url={getPlayerAvatarUrl(topAvgSchnaepse.name)}
                                        avatar_frame={getPlayerAvatarFrame(topAvgSchnaepse.name)}
                                        name={topAvgSchnaepse.name}
                                        className="w-12 h-12 rounded-full border border-yellow-500/40 shadow-xs object-cover"
                                      />
                                      <span className="absolute -top-1.5 -right-1 text-sm">👑</span>
                                    </button>
                                    <div>
                                      <span className="text-[10px] uppercase font-bold opacity-50 block">Schnäpse-König (Ø pro Spiel)</span>
                                      <h5 className="font-black text-base flex items-center space-x-2 flex-wrap gap-y-1">
                                        <button
                                          onClick={() => { playGlobalClickSound(); setSelectedPlayerForDetails(topAvgSchnaepse.name); }}
                                          className="hover:underline text-left cursor-pointer flex items-center space-x-1.5 group flex-wrap"
                                        >
                                          <PlayerNameTag name={topAvgSchnaepse.name} colorKey={getPlayerNameBgColor(topAvgSchnaepse.name)} />
                                          <PlayerLevelBadge level={getPlayerLevel(topAvgSchnaepse.name)} isGuest={isPlayerGuest(topAvgSchnaepse.name)} size="sm" />
                                          {getPlayerTitle(topAvgSchnaepse.name) && (
                                            <PlayerTitleBadge title={getPlayerTitle(topAvgSchnaepse.name)} size="sm" />
                                          )}
                                        </button>
                                      </h5>
                                      <p className="text-xs font-semibold text-yellow-500">{topAvgSchnaepse.avgSchnaepsePerGame.toFixed(2)} Schnäpse/Spiel ({topAvgSchnaepse.gamesPlayed} Spiele)</p>
                                    </div>
                                  </div>
                                )}
                                {topSingle && (
                                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-indigo-500/20' : 'bg-indigo-500/5 border-indigo-500/10'} flex items-center space-x-4`}>
                                    <button
                                      type="button"
                                      onClick={() => { playGlobalClickSound(); setSelectedPlayerForDetails(topSingle.playerName); }}
                                      className="relative group shrink-0 cursor-pointer focus:outline-none transition-transform hover:scale-105 active:scale-95"
                                      title={`Profilbild von ${topSingle.playerName} in groß ansehen`}
                                    >
                                      <PlayerAvatar
                                        url={getPlayerAvatarUrl(topSingle.playerName)}
                                        avatar_frame={getPlayerAvatarFrame(topSingle.playerName)}
                                        name={topSingle.playerName}
                                        className="w-12 h-12 rounded-full border border-indigo-500/40 shadow-xs object-cover"
                                      />
                                      <span className="absolute -top-1.5 -right-1 text-sm">🍻</span>
                                    </button>
                                    <div>
                                      <span className="text-[10px] uppercase font-bold opacity-50 block">Rekord-Einzelspiel (Schnäpse)</span>
                                      <h5 className="font-black text-base flex items-center space-x-2 flex-wrap gap-y-1">
                                        <button
                                          onClick={() => { playGlobalClickSound(); setSelectedPlayerForDetails(topSingle.playerName); }}
                                          className="hover:underline text-left cursor-pointer flex items-center space-x-1.5 group flex-wrap"
                                        >
                                          <PlayerNameTag name={topSingle.playerName} colorKey={getPlayerNameBgColor(topSingle.playerName)} />
                                          <PlayerLevelBadge level={getPlayerLevel(topSingle.playerName)} isGuest={isPlayerGuest(topSingle.playerName)} size="sm" />
                                          {getPlayerTitle(topSingle.playerName) && (
                                            <PlayerTitleBadge title={getPlayerTitle(topSingle.playerName)} size="sm" />
                                          )}
                                        </button>
                                      </h5>
                                      <p className="text-xs font-semibold text-indigo-400">{topSingle.schnaepse} Schnäpse <span className="opacity-50 text-[10px]">({topSingle.date})</span></p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/40 border-white/5' : 'bg-black/5 border-black/5'}`}>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 pb-2 border-b border-gray-500/10">
                                  <h4 className="text-sm font-black uppercase tracking-wider text-yellow-500 flex items-center">
                                    <i className="fas fa-wine-glass-alt mr-2 text-pink-400"></i>
                                    {schnaepseSortMode === 'gesamt' ? 'Rangliste: Schnäpse-Durchschnitt (pro Spiel)' : 'Rangliste: Meiste Schnäpse Einzelspiel'}
                                  </h4>
                                  
                                  {/* Toggle buttons & Sortierlogik drehen */}
                                  <div className="flex items-center space-x-2">
                                    <div className="flex space-x-1.5 p-1 rounded-xl bg-black/10 w-fit">
                                      <button
                                        onClick={() => { playGlobalClickSound(); setSchnaepseSortMode('gesamt'); }}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                          schnaepseSortMode === 'gesamt'
                                            ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30'
                                            : (darkMode ? 'hover:bg-slate-800 text-gray-300' : 'hover:bg-gray-200 text-gray-800')
                                        }`}
                                      >
                                        Gesamt
                                      </button>
                                      <button
                                        onClick={() => { playGlobalClickSound(); setSchnaepseSortMode('einzelspiel'); }}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                          schnaepseSortMode === 'einzelspiel'
                                            ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30'
                                            : (darkMode ? 'hover:bg-slate-800 text-gray-300' : 'hover:bg-gray-200 text-gray-800')
                                        }`}
                                      >
                                        Einzelspiel
                                      </button>
                                    </div>

                                    {/* Sortierlogik umkehren */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        playGlobalClickSound();
                                        setSchnaepseSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
                                      }}
                                      className={`p-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border shadow-xs ${
                                        schnaepseSortDir === 'asc'
                                          ? 'bg-amber-500/20 text-amber-500 border-amber-500/40'
                                          : (darkMode ? 'bg-black/20 text-gray-300 border-white/10 hover:bg-black/30' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100')
                                      }`}
                                      title={schnaepseSortDir === 'desc' ? 'Sortierung: Groß nach Klein (Klicken für Klein nach Groß)' : 'Sortierung: Klein nach Groß (Klicken für Groß nach Klein)'}
                                      aria-label="Sortierreihenfolge umkehren"
                                    >
                                      <i className="fas fa-arrows-alt-v text-xs"></i>
                                      <span className="text-[10px] font-black uppercase tracking-wider">
                                        {schnaepseSortDir === 'desc' ? '↓ Groß → Klein' : '↑ Klein → Groß'}
                                      </span>
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  {schnaepseSortMode === 'gesamt' ? (
                                    sortedByAvgSchnaepse.slice(0, 10).map((p, idx) => (
                                      <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-black/10 border border-white/5 text-xs">
                                        <div className="flex items-center space-x-2.5 pb-0.5 min-w-0">
                                          <span className="font-black text-xs opacity-50 w-5 text-center shrink-0">#{idx + 1}</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              playGlobalClickSound();
                                              setSelectedPlayerForDetails(p.name);
                                            }}
                                            className="relative group shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95 focus:outline-none"
                                            title={`Profilbild von ${p.name} in groß ansehen`}
                                          >
                                            <PlayerAvatar
                                              url={getPlayerAvatarUrl(p.name)}
                                              avatar_frame={getPlayerAvatarFrame(p.name)}
                                              name={p.name}
                                              className="w-8 h-8 rounded-full border border-white/10 shadow-xs object-cover"
                                            />
                                          </button>
                                          <button 
                                            onClick={() => {
                                              playGlobalClickSound();
                                              setSelectedPlayerForDetails(p.name);
                                            }}
                                            className="hover:underline text-left cursor-pointer font-black hover:text-indigo-400 transition-colors inline-flex items-center space-x-1.5 group flex-wrap truncate min-w-0"
                                          >
                                            <PlayerNameTag name={p.name} colorKey={getPlayerNameBgColor(p.name)} />
                                            <PlayerLevelBadge level={getPlayerLevel(p.name)} isGuest={isPlayerGuest(p.name)} size="sm" />
                                            {getPlayerTitle(p.name) && (
                                              <PlayerTitleBadge title={getPlayerTitle(p.name)} size="sm" />
                                            )}
                                            <i className="fas fa-search-plus ml-1 text-[9px] opacity-0 group-hover:opacity-60 transition-opacity"></i>
                                          </button>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <span className="font-black text-sm text-yellow-500">{p.avgSchnaepsePerGame.toFixed(2)} Schnäpse/Spiel</span>
                                          <span className="block text-[8px] opacity-40">{p.gamesPlayed} Spiele</span>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    sortedBySingleSchnaepse.slice(0, 10).map((p, idx) => (
                                      <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-black/10 border border-white/5 text-xs">
                                        <div className="flex items-center space-x-2.5 pb-0.5 min-w-0">
                                          <span className="font-black text-xs opacity-50 w-5 text-center shrink-0">#{idx + 1}</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              playGlobalClickSound();
                                              setSelectedPlayerForDetails(p.playerName);
                                            }}
                                            className="relative group shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95 focus:outline-none"
                                            title={`Profilbild von ${p.playerName} in groß ansehen`}
                                          >
                                            <PlayerAvatar
                                              url={getPlayerAvatarUrl(p.playerName)}
                                              avatar_frame={getPlayerAvatarFrame(p.playerName)}
                                              name={p.playerName}
                                              className="w-8 h-8 rounded-full border border-white/10 shadow-xs object-cover"
                                            />
                                          </button>
                                          <button 
                                            onClick={() => {
                                              playGlobalClickSound();
                                              setSelectedPlayerForDetails(p.playerName);
                                            }}
                                            className="hover:underline text-left cursor-pointer font-black hover:text-indigo-400 transition-colors inline-flex items-center space-x-1.5 group flex-wrap truncate min-w-0"
                                          >
                                            <PlayerNameTag name={p.playerName} colorKey={getPlayerNameBgColor(p.playerName)} />
                                            <PlayerLevelBadge level={getPlayerLevel(p.playerName)} isGuest={isPlayerGuest(p.playerName)} size="sm" />
                                            {getPlayerTitle(p.playerName) && (
                                              <PlayerTitleBadge title={getPlayerTitle(p.playerName)} size="sm" />
                                            )}
                                            <i className="fas fa-search-plus ml-1 text-[9px] opacity-0 group-hover:opacity-60 transition-opacity"></i>
                                          </button>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <span className="font-black text-sm text-yellow-500">{p.schnaepse} Schnäpse</span>
                                          <span className="block text-[8px] opacity-40">{p.date} • Ø {p.avg.toFixed(2)}g</span>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}"""

# ==========================================
# 2. Update best_avg
# ==========================================
best_avg_code = """                        {activeStandardSubTab === 'best_avg' && (() => {
                          const sortedByCareerAverage = [...playerStatsList].sort((a,b) =>
                            avgSortDir === 'asc' ? a.careerAverage - b.careerAverage : b.careerAverage - a.careerAverage
                          );
                          const sortedBySingleAverage = [...filtered].sort((a,b) =>
                            avgSortDir === 'asc' ? a.avg - b.avg : b.avg - a.avg
                          );
                          
                          const topCareerAvg = sortedByCareerAverage[0];
                          const topSingleAvg = sortedBySingleAverage[0];
                          
                          return (
                            <div className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {topCareerAvg && (
                                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-emerald-500/20' : 'bg-emerald-500/5 border-emerald-500/10'} flex items-center space-x-4`}>
                                    <button
                                      type="button"
                                      onClick={() => { playGlobalClickSound(); setSelectedPlayerForDetails(topCareerAvg.name); }}
                                      className="relative group shrink-0 cursor-pointer focus:outline-none transition-transform hover:scale-105 active:scale-95"
                                      title={`Profilbild von ${topCareerAvg.name} in groß ansehen`}
                                    >
                                      <PlayerAvatar
                                        url={getPlayerAvatarUrl(topCareerAvg.name)}
                                        avatar_frame={getPlayerAvatarFrame(topCareerAvg.name)}
                                        name={topCareerAvg.name}
                                        className="w-12 h-12 rounded-full border border-emerald-500/40 shadow-xs object-cover"
                                      />
                                      <span className="absolute -top-1.5 -right-1 text-sm">🎯</span>
                                    </button>
                                    <div>
                                      <span className="text-[10px] uppercase font-bold opacity-50 block">Präzisions-Meister (Ø Gesamt)</span>
                                      <h5 className="font-black text-base flex items-center space-x-2 flex-wrap gap-y-1">
                                        <button
                                          onClick={() => { playGlobalClickSound(); setSelectedPlayerForDetails(topCareerAvg.name); }}
                                          className="hover:underline text-left cursor-pointer flex items-center space-x-1.5 group flex-wrap"
                                        >
                                          <PlayerNameTag name={topCareerAvg.name} colorKey={getPlayerNameBgColor(topCareerAvg.name)} />
                                          <PlayerLevelBadge level={getPlayerLevel(topCareerAvg.name)} isGuest={isPlayerGuest(topCareerAvg.name)} size="sm" />
                                          {getPlayerTitle(topCareerAvg.name) && (
                                            <PlayerTitleBadge title={getPlayerTitle(topCareerAvg.name)} size="sm" />
                                          )}
                                        </button>
                                      </h5>
                                      <p className="text-xs font-semibold text-emerald-500">{topCareerAvg.careerAverage.toFixed(2)}g Ø-Abweichung</p>
                                    </div>
                                  </div>
                                )}
                                {topSingleAvg && (
                                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-amber-500/20' : 'bg-amber-500/5 border-amber-500/10'} flex items-center space-x-4`}>
                                    <button
                                      type="button"
                                      onClick={() => { playGlobalClickSound(); setSelectedPlayerForDetails(topSingleAvg.playerName); }}
                                      className="relative group shrink-0 cursor-pointer focus:outline-none transition-transform hover:scale-105 active:scale-95"
                                      title={`Profilbild von ${topSingleAvg.playerName} in groß ansehen`}
                                    >
                                      <PlayerAvatar
                                        url={getPlayerAvatarUrl(topSingleAvg.playerName)}
                                        avatar_frame={getPlayerAvatarFrame(topSingleAvg.playerName)}
                                        name={topSingleAvg.playerName}
                                        className="w-12 h-12 rounded-full border border-amber-500/40 shadow-xs object-cover"
                                      />
                                      <span className="absolute -top-1.5 -right-1 text-sm">⚡</span>
                                    </button>
                                    <div>
                                      <span className="text-[10px] uppercase font-bold opacity-50 block">Bestes Einzelspiel (Avg)</span>
                                      <h5 className="font-black text-base flex items-center space-x-2 flex-wrap gap-y-1">
                                        <button
                                          onClick={() => { playGlobalClickSound(); setSelectedPlayerForDetails(topSingleAvg.playerName); }}
                                          className="hover:underline text-left cursor-pointer flex items-center space-x-1.5 group flex-wrap"
                                        >
                                          <PlayerNameTag name={topSingleAvg.playerName} colorKey={getPlayerNameBgColor(topSingleAvg.playerName)} />
                                          <PlayerLevelBadge level={getPlayerLevel(topSingleAvg.playerName)} isGuest={isPlayerGuest(topSingleAvg.playerName)} size="sm" />
                                          {getPlayerTitle(topSingleAvg.playerName) && (
                                            <PlayerTitleBadge title={getPlayerTitle(topSingleAvg.playerName)} size="sm" />
                                          )}
                                        </button>
                                      </h5>
                                      <p className="text-xs font-semibold text-amber-500">{topSingleAvg.avg.toFixed(2)}g Abweichung <span className="opacity-50 text-[10px]">({topSingleAvg.date})</span></p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/40 border-white/5' : 'bg-black/5 border-black/5'}`}>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 pb-2 border-b border-gray-500/10">
                                  <h4 className="text-sm font-black uppercase tracking-wider text-yellow-500 flex items-center">
                                    <i className="fas fa-crosshairs mr-2 text-emerald-400"></i>
                                    Rangliste: Durchschnitt
                                  </h4>
                                  
                                  {/* Toggle buttons & Sortierlogik drehen */}
                                  <div className="flex items-center space-x-2">
                                    <div className="flex space-x-1.5 p-1 rounded-xl bg-black/10 w-fit">
                                      <button
                                        onClick={() => { playGlobalClickSound(); setAvgSortMode('gesamt'); }}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                          avgSortMode === 'gesamt'
                                            ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30'
                                            : (darkMode ? 'hover:bg-slate-800 text-gray-300' : 'hover:bg-gray-200 text-gray-800')
                                        }`}
                                      >
                                        Gesamtdurchschnitt
                                      </button>
                                      <button
                                        onClick={() => { playGlobalClickSound(); setAvgSortMode('einzelspiel'); }}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                          avgSortMode === 'einzelspiel'
                                            ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30'
                                            : (darkMode ? 'hover:bg-slate-800 text-gray-300' : 'hover:bg-gray-200 text-gray-800')
                                        }`}
                                      >
                                        Einzelspiel
                                      </button>
                                    </div>

                                    {/* Sortierlogik umkehren */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        playGlobalClickSound();
                                        setAvgSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                                      }}
                                      className={`p-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border shadow-xs ${
                                        avgSortDir === 'desc'
                                          ? 'bg-amber-500/20 text-amber-500 border-amber-500/40'
                                          : (darkMode ? 'bg-black/20 text-gray-300 border-white/10 hover:bg-black/30' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100')
                                      }`}
                                      title={avgSortDir === 'asc' ? 'Sortierung: Klein nach Groß (Klicken für Groß nach Klein)' : 'Sortierung: Groß nach Klein (Klicken für Klein nach Groß)'}
                                      aria-label="Sortierreihenfolge umkehren"
                                    >
                                      <i className="fas fa-arrows-alt-v text-xs"></i>
                                      <span className="text-[10px] font-black uppercase tracking-wider">
                                        {avgSortDir === 'asc' ? '↑ Klein → Groß' : '↓ Groß → Klein'}
                                      </span>
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  {avgSortMode === 'gesamt' ? (
                                    sortedByCareerAverage.slice(0, 10).map((p, idx) => (
                                      <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-black/10 border border-white/5 text-xs">
                                        <div className="flex items-center space-x-2.5 pb-0.5 min-w-0">
                                          <span className="font-black text-xs opacity-50 w-5 text-center shrink-0">#{idx + 1}</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              playGlobalClickSound();
                                              setSelectedPlayerForDetails(p.name);
                                            }}
                                            className="relative group shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95 focus:outline-none"
                                            title={`Profilbild von ${p.name} in groß ansehen`}
                                          >
                                            <PlayerAvatar
                                              url={getPlayerAvatarUrl(p.name)}
                                              avatar_frame={getPlayerAvatarFrame(p.name)}
                                              name={p.name}
                                              className="w-8 h-8 rounded-full border border-white/10 shadow-xs object-cover"
                                            />
                                          </button>
                                          <button 
                                            onClick={() => {
                                              playGlobalClickSound();
                                              setSelectedPlayerForDetails(p.name);
                                            }}
                                            className="hover:underline text-left cursor-pointer font-black hover:text-indigo-400 transition-colors inline-flex items-center space-x-1.5 group flex-wrap truncate min-w-0"
                                          >
                                            <PlayerNameTag name={p.name} colorKey={getPlayerNameBgColor(p.name)} />
                                            <PlayerLevelBadge level={getPlayerLevel(p.name)} isGuest={isPlayerGuest(p.name)} size="sm" />
                                            {getPlayerTitle(p.name) && (
                                              <PlayerTitleBadge title={getPlayerTitle(p.name)} size="sm" />
                                            )}
                                            <i className="fas fa-search-plus ml-1 text-[9px] opacity-0 group-hover:opacity-60 transition-opacity"></i>
                                          </button>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <span className="font-black text-sm text-emerald-500">{p.careerAverage.toFixed(2)}g</span>
                                          <span className="block text-[8px] opacity-40">{p.gamesPlayed} Spiele</span>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    sortedBySingleAverage.slice(0, 10).map((p, idx) => (
                                      <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-black/10 border border-white/5 text-xs">
                                        <div className="flex items-center space-x-2.5 pb-0.5 min-w-0">
                                          <span className="font-black text-xs opacity-50 w-5 text-center shrink-0">#{idx + 1}</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              playGlobalClickSound();
                                              setSelectedPlayerForDetails(p.playerName);
                                            }}
                                            className="relative group shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95 focus:outline-none"
                                            title={`Profilbild von ${p.playerName} in groß ansehen`}
                                          >
                                            <PlayerAvatar
                                              url={getPlayerAvatarUrl(p.playerName)}
                                              avatar_frame={getPlayerAvatarFrame(p.playerName)}
                                              name={p.playerName}
                                              className="w-8 h-8 rounded-full border border-white/10 shadow-xs object-cover"
                                            />
                                          </button>
                                          <button 
                                            onClick={() => {
                                              playGlobalClickSound();
                                              setSelectedPlayerForDetails(p.playerName);
                                            }}
                                            className="hover:underline text-left cursor-pointer font-black hover:text-indigo-400 transition-colors inline-flex items-center space-x-1.5 group flex-wrap truncate min-w-0"
                                          >
                                            <PlayerNameTag name={p.playerName} colorKey={getPlayerNameBgColor(p.playerName)} />
                                            <PlayerLevelBadge level={getPlayerLevel(p.playerName)} isGuest={isPlayerGuest(p.playerName)} size="sm" />
                                            {getPlayerTitle(p.playerName) && (
                                              <PlayerTitleBadge title={getPlayerTitle(p.playerName)} size="sm" />
                                            )}
                                            <i className="fas fa-search-plus ml-1 text-[9px] opacity-0 group-hover:opacity-60 transition-opacity"></i>
                                          </button>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <span className="font-black text-sm text-emerald-500">{p.avg.toFixed(2)}g</span>
                                          <span className="block text-[8px] opacity-40">{p.date} • {p.schnaepse} Pkt</span>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}"""

# ==========================================
# 3. Update best_total
# ==========================================
best_total_code = """                        {activeStandardSubTab === 'best_total' && (() => {
                          const sortedBySingleTotal = [...filtered].sort((a,b) =>
                            totalSortDir === 'asc' ? (a.avg + a.schnaepse) - (b.avg + b.schnaepse) : (b.avg + b.schnaepse) - (a.avg + a.schnaepse)
                          );
                          const sortedByCareerAverageTotal = [...playerStatsList].sort((a,b) => {
                            const aTotalAvg = a.scores.reduce((sum, s) => sum + (s.avg + s.schnaepse), 0) / a.gamesPlayed;
                            const bTotalAvg = b.scores.reduce((sum, s) => sum + (s.avg + s.schnaepse), 0) / b.gamesPlayed;
                            return totalSortDir === 'asc' ? aTotalAvg - bTotalAvg : bTotalAvg - aTotalAvg;
                          });
                          
                          const topSingleTotal = sortedBySingleTotal[0];
                          const topCareerAverageTotal = sortedByCareerAverageTotal[0];
                          
                          return (
                            <div className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {topSingleTotal && (
                                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-purple-500/20' : 'bg-purple-500/5 border-purple-500/10'} flex items-center space-x-4`}>
                                    <button
                                      type="button"
                                      onClick={() => { playGlobalClickSound(); setSelectedPlayerForDetails(topSingleTotal.playerName); }}
                                      className="relative group shrink-0 cursor-pointer focus:outline-none transition-transform hover:scale-105 active:scale-95"
                                      title={`Profilbild von ${topSingleTotal.playerName} in groß ansehen`}
                                    >
                                      <PlayerAvatar
                                        url={getPlayerAvatarUrl(topSingleTotal.playerName)}
                                        avatar_frame={getPlayerAvatarFrame(topSingleTotal.playerName)}
                                        name={topSingleTotal.playerName}
                                        className="w-12 h-12 rounded-full border border-purple-500/40 shadow-xs object-cover"
                                      />
                                      <span className="absolute -top-1.5 -right-1 text-sm">🏆</span>
                                    </button>
                                    <div>
                                      <span className="text-[10px] uppercase font-bold opacity-50 block">Bestes Einzel-Total</span>
                                      <h5 className="font-black text-base flex items-center space-x-2 flex-wrap gap-y-1">
                                        <button
                                          onClick={() => { playGlobalClickSound(); setSelectedPlayerForDetails(topSingleTotal.playerName); }}
                                          className="hover:underline text-left cursor-pointer flex items-center space-x-1.5 group flex-wrap"
                                        >
                                          <PlayerNameTag name={topSingleTotal.playerName} colorKey={getPlayerNameBgColor(topSingleTotal.playerName)} />
                                          <PlayerLevelBadge level={getPlayerLevel(topSingleTotal.playerName)} isGuest={isPlayerGuest(topSingleTotal.playerName)} size="sm" />
                                          {getPlayerTitle(topSingleTotal.playerName) && (
                                            <PlayerTitleBadge title={getPlayerTitle(topSingleTotal.playerName)} size="sm" />
                                          )}
                                        </button>
                                      </h5>
                                      <p className="text-xs font-semibold text-purple-400">Total: {(topSingleTotal.avg + topSingleTotal.schnaepse).toFixed(2)} <span className="opacity-75 text-[10px]">({topSingleTotal.avg.toFixed(2)}g Avg + {topSingleTotal.schnaepse} Schnäpse)</span></p>
                                    </div>
                                  </div>
                                )}
                                {topCareerAverageTotal && (() => {
                                  const avgTotal = topCareerAverageTotal.scores.reduce((sum, s) => sum + (s.avg + s.schnaepse), 0) / topCareerAverageTotal.gamesPlayed;
                                  return (
                                    <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/40 border-blue-500/20' : 'bg-blue-500/5 border-blue-500/10'} flex items-center space-x-4`}>
                                      <button
                                        type="button"
                                        onClick={() => { playGlobalClickSound(); setSelectedPlayerForDetails(topCareerAverageTotal.name); }}
                                        className="relative group shrink-0 cursor-pointer focus:outline-none transition-transform hover:scale-105 active:scale-95"
                                        title={`Profilbild von ${topCareerAverageTotal.name} in groß ansehen`}
                                      >
                                        <PlayerAvatar
                                          url={getPlayerAvatarUrl(topCareerAverageTotal.name)}
                                          avatar_frame={getPlayerAvatarFrame(topCareerAverageTotal.name)}
                                          name={topCareerAverageTotal.name}
                                          className="w-12 h-12 rounded-full border border-blue-500/40 shadow-xs object-cover"
                                        />
                                        <span className="absolute -top-1.5 -right-1 text-sm">📊</span>
                                      </button>
                                      <div>
                                        <span className="text-[10px] uppercase font-bold opacity-50 block">Bestes Durchschnitts-Total</span>
                                        <h5 className="font-black text-base flex items-center space-x-2 flex-wrap gap-y-1">
                                          <button
                                            onClick={() => { playGlobalClickSound(); setSelectedPlayerForDetails(topCareerAverageTotal.name); }}
                                            className="hover:underline text-left cursor-pointer flex items-center space-x-1.5 group flex-wrap"
                                          >
                                            <PlayerNameTag name={topCareerAverageTotal.name} colorKey={getPlayerNameBgColor(topCareerAverageTotal.name)} />
                                            <PlayerLevelBadge level={getPlayerLevel(topCareerAverageTotal.name)} isGuest={isPlayerGuest(topCareerAverageTotal.name)} size="sm" />
                                            {getPlayerTitle(topCareerAverageTotal.name) && (
                                              <PlayerTitleBadge title={getPlayerTitle(topCareerAverageTotal.name)} size="sm" />
                                            )}
                                          </button>
                                        </h5>
                                        <p className="text-xs font-semibold text-blue-400">Ø Total: {avgTotal.toFixed(2)} <span className="opacity-50 text-[10px]">({topCareerAverageTotal.gamesPlayed} Spiele)</span></p>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>

                              <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/40 border-white/5' : 'bg-black/5 border-black/5'}`}>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 pb-2 border-b border-gray-500/10">
                                  <h4 className="text-sm font-black uppercase tracking-wider text-yellow-500 flex items-center">
                                    <i className="fas fa-trophy mr-2 text-purple-400"></i>
                                    Rangliste: Total
                                  </h4>
                                  
                                  {/* Toggle buttons & Sortierlogik drehen */}
                                  <div className="flex items-center space-x-2">
                                    <div className="flex space-x-1.5 p-1 rounded-xl bg-black/10 w-fit">
                                      <button
                                        onClick={() => { playGlobalClickSound(); setTotalSortMode('gesamt'); }}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                          totalSortMode === 'gesamt'
                                            ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30'
                                            : (darkMode ? 'hover:bg-slate-800 text-gray-300' : 'hover:bg-gray-200 text-gray-800')
                                        }`}
                                      >
                                        Gesamtdurchschnitt
                                      </button>
                                      <button
                                        onClick={() => { playGlobalClickSound(); setTotalSortMode('einzelspiel'); }}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                          totalSortMode === 'einzelspiel'
                                            ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30'
                                            : (darkMode ? 'hover:bg-slate-800 text-gray-300' : 'hover:bg-gray-200 text-gray-800')
                                        }`}
                                      >
                                        Einzelspiel
                                      </button>
                                    </div>

                                    {/* Sortierlogik umkehren */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        playGlobalClickSound();
                                        setTotalSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                                      }}
                                      className={`p-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border shadow-xs ${
                                        totalSortDir === 'desc'
                                          ? 'bg-amber-500/20 text-amber-500 border-amber-500/40'
                                          : (darkMode ? 'bg-black/20 text-gray-300 border-white/10 hover:bg-black/30' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100')
                                      }`}
                                      title={totalSortDir === 'asc' ? 'Sortierung: Klein nach Groß (Klicken für Groß nach Klein)' : 'Sortierung: Groß nach Klein (Klicken für Klein nach Groß)'}
                                      aria-label="Sortierreihenfolge umkehren"
                                    >
                                      <i className="fas fa-arrows-alt-v text-xs"></i>
                                      <span className="text-[10px] font-black uppercase tracking-wider">
                                        {totalSortDir === 'asc' ? '↑ Klein → Groß' : '↓ Groß → Klein'}
                                      </span>
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  {totalSortMode === 'gesamt' ? (
                                    sortedByCareerAverageTotal.slice(0, 10).map((p, idx) => {
                                      const careerTotalAvg = p.scores.reduce((sum, s) => sum + (s.avg + s.schnaepse), 0) / p.gamesPlayed;
                                      return (
                                        <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-black/10 border border-white/5 text-xs">
                                          <div className="flex items-center space-x-2.5 pb-0.5 min-w-0">
                                            <span className="font-black text-xs opacity-50 w-5 text-center shrink-0">#{idx + 1}</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                playGlobalClickSound();
                                                setSelectedPlayerForDetails(p.name);
                                              }}
                                              className="relative group shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95 focus:outline-none"
                                              title={`Profilbild von ${p.name} in groß ansehen`}
                                            >
                                              <PlayerAvatar
                                                url={getPlayerAvatarUrl(p.name)}
                                                avatar_frame={getPlayerAvatarFrame(p.name)}
                                                name={p.name}
                                                className="w-8 h-8 rounded-full border border-white/10 shadow-xs object-cover"
                                              />
                                            </button>
                                            <button 
                                              onClick={() => {
                                                playGlobalClickSound();
                                                setSelectedPlayerForDetails(p.name);
                                              }}
                                              className="hover:underline text-left cursor-pointer font-black hover:text-indigo-400 transition-colors inline-flex items-center space-x-1.5 group flex-wrap truncate min-w-0"
                                            >
                                              <PlayerNameTag name={p.name} colorKey={getPlayerNameBgColor(p.name)} />
                                              <PlayerLevelBadge level={getPlayerLevel(p.name)} isGuest={isPlayerGuest(p.name)} size="sm" />
                                              {getPlayerTitle(p.name) && (
                                                <PlayerTitleBadge title={getPlayerTitle(p.name)} size="sm" />
                                              )}
                                              <i className="fas fa-search-plus ml-1 text-[9px] opacity-0 group-hover:opacity-60 transition-opacity"></i>
                                            </button>
                                          </div>
                                          <div className="text-right shrink-0">
                                            <span className="font-black text-sm text-purple-400">{careerTotalAvg.toFixed(2)}</span>
                                            <span className="block text-[8px] opacity-40">{p.gamesPlayed} Spiele</span>
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    sortedBySingleTotal.slice(0, 10).map((p, idx) => (
                                      <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-black/10 border border-white/5 text-xs">
                                        <div className="flex items-center space-x-2.5 pb-0.5 min-w-0">
                                          <span className="font-black text-xs opacity-50 w-5 text-center shrink-0">#{idx + 1}</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              playGlobalClickSound();
                                              setSelectedPlayerForDetails(p.playerName);
                                            }}
                                            className="relative group shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95 focus:outline-none"
                                            title={`Profilbild von ${p.playerName} in groß ansehen`}
                                          >
                                            <PlayerAvatar
                                              url={getPlayerAvatarUrl(p.playerName)}
                                              avatar_frame={getPlayerAvatarFrame(p.playerName)}
                                              name={p.playerName}
                                              className="w-8 h-8 rounded-full border border-white/10 shadow-xs object-cover"
                                            />
                                          </button>
                                          <button 
                                            onClick={() => {
                                              playGlobalClickSound();
                                              setSelectedPlayerForDetails(p.playerName);
                                            }}
                                            className="hover:underline text-left cursor-pointer font-black hover:text-indigo-400 transition-colors inline-flex items-center space-x-1.5 group flex-wrap truncate min-w-0"
                                          >
                                            <PlayerNameTag name={p.playerName} colorKey={getPlayerNameBgColor(p.playerName)} />
                                            <PlayerLevelBadge level={getPlayerLevel(p.playerName)} isGuest={isPlayerGuest(p.playerName)} size="sm" />
                                            {getPlayerTitle(p.playerName) && (
                                              <PlayerTitleBadge title={getPlayerTitle(p.playerName)} size="sm" />
                                            )}
                                            <i className="fas fa-search-plus ml-1 text-[9px] opacity-0 group-hover:opacity-60 transition-opacity"></i>
                                          </button>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <span className="font-black text-sm text-purple-400">{(p.avg + p.schnaepse).toFixed(2)}</span>
                                          <span className="block text-[8px] opacity-40">{p.avg.toFixed(2)}g Avg + {p.schnaepse} Pkt ({p.date})</span>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}"""

# Replace in content using exact subtab demarcations
start_idx_schnaepse = content.find("{activeStandardSubTab === 'highest_schnaepse' && (() => {")
start_idx_best_avg = content.find("{activeStandardSubTab === 'best_avg' && (() => {")
start_idx_best_total = content.find("{activeStandardSubTab === 'best_total' && (() => {")
end_idx_best_total = content.find("// Default view for other modes (Speedwiegen, Teamwiegen)")

if start_idx_schnaepse != -1 and start_idx_best_avg != -1 and start_idx_best_total != -1 and end_idx_best_total != -1:
    # We replace from start_idx_schnaepse to start_idx_best_avg with highest_schnaepse_code + "\n\n"
    # and from start_idx_best_avg to start_idx_best_total with best_avg_code + "\n\n"
    # and from start_idx_best_total to end_idx_best_total with best_total_code + "\n                          </>\n                        )}\n                      </div>\n                    );\n                  }\n\n                  "
    part1 = content[:start_idx_schnaepse]
    tail = content[end_idx_best_total:]
    
    # Let's inspect what is right before end_idx_best_total
    middle = highest_schnaepse_code + "\n\n" + best_avg_code + "\n\n" + best_total_code + "\n                          </>\n                        )}\n                      </div>\n                    );\n                  }\n\n                  "
    content = part1 + middle + tail
    print("Successfully replaced highest_schnaepse, best_avg, best_total!")
else:
    print("Could not find standard subtab indices:", start_idx_schnaepse, start_idx_best_avg, start_idx_best_total, end_idx_best_total)

with open('App.tsx', 'w') as f:
    f.write(content)

