import re

with open('App.tsx', 'r') as f:
    content = f.read()

# 1. Update activeStandardSubTab === 'all'
pattern_all = r"\{currentActivePlayer \? \(\(\) => \{\s+const playerGames = filtered\.filter\(f => f\.playerName === currentActivePlayer\);\s+return \(\s+<div className={`p-5 rounded-2xl border \$\{darkMode \? 'bg-slate-900/40 border-white/5' : 'bg-black/5 border-black/5'\}`}>"

replacement_all = """{currentActivePlayer ? (() => {
                                    const rawGames = filtered.filter(f => f.playerName === currentActivePlayer);
                                    const playerGames = playerMatchesSortDir === 'asc' ? [...rawGames].reverse() : rawGames;
                                    return (
                                      <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/40 border-white/5' : 'bg-black/5 border-black/5'}`}>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2 border-b border-gray-500/10">
                                          <div className="flex items-center space-x-3">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                playGlobalClickSound();
                                                setSelectedPlayerForDetails(currentActivePlayer);
                                              }}
                                              className="relative group shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95 focus:outline-none"
                                              title={`Profilbild von ${currentActivePlayer} in groß ansehen`}
                                            >
                                              <PlayerAvatar
                                                url={getPlayerAvatarUrl(currentActivePlayer)}
                                                avatar_frame={getPlayerAvatarFrame(currentActivePlayer)}
                                                name={currentActivePlayer}
                                                className="w-10 h-10 rounded-full border border-white/10 shadow-xs object-cover"
                                              />
                                              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-black/70 text-[8px] flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                🔍
                                              </span>
                                            </button>
                                            <div>
                                              <h4 className="text-sm font-black uppercase tracking-wider text-yellow-500 flex items-center">
                                                <i className="fas fa-beer mr-2 text-amber-500"></i>Spiele von: {currentActivePlayer}
                                              </h4>
                                              <div className="flex items-center space-x-1.5 mt-0.5 flex-wrap">
                                                <PlayerNameTag name={currentActivePlayer} colorKey={getPlayerNameBgColor(currentActivePlayer)} />
                                                <PlayerLevelBadge level={getPlayerLevel(currentActivePlayer)} isGuest={isPlayerGuest(currentActivePlayer)} size="xs" />
                                                {getPlayerTitle(currentActivePlayer) && (
                                                  <PlayerTitleBadge title={getPlayerTitle(currentActivePlayer)} size="xs" />
                                                )}
                                              </div>
                                            </div>
                                          </div>

                                          <button
                                            type="button"
                                            onClick={() => {
                                              playGlobalClickSound();
                                              setPlayerMatchesSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
                                            }}
                                            className={`p-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border shadow-xs self-start sm:self-auto ${
                                              playerMatchesSortDir === 'asc'
                                                ? 'bg-amber-500/20 text-amber-500 border-amber-500/40'
                                                : (darkMode ? 'bg-black/20 text-gray-300 border-white/10 hover:bg-black/30' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100')
                                            }`}
                                            title={playerMatchesSortDir === 'desc' ? 'Sortierung: Neueste zuerst (Klicken für Älteste zuerst)' : 'Sortierung: Älteste zuerst (Klicken für Neueste zuerst)'}
                                            aria-label="Sortierreihenfolge umkehren"
                                          >
                                            <i className="fas fa-arrows-alt-v text-xs"></i>
                                            <span className="text-[10px] font-black uppercase tracking-wider">
                                              {playerMatchesSortDir === 'desc' ? '↓ Neu → Alt' : '↑ Alt → Neu'}
                                            </span>
                                          </button>
                                        </div>"""

# Remove old simple h4 heading inside playerGames if pattern_all matches
if re.search(pattern_all, content):
    content = re.sub(
        r"\{currentActivePlayer \? \(\(\) => \{\s+const playerGames = filtered\.filter\(f => f\.playerName === currentActivePlayer\);\s+return \(\s+<div className={`p-5 rounded-2xl border \$\{darkMode \? 'bg-slate-900/40 border-white/5' : 'bg-black/5 border-black/5'\}`}>\s+<h4 className=\"text-sm font-black uppercase mb-4 tracking-wider text-yellow-500 flex items-center\">\s+<i className=\"fas fa-beer mr-2 text-amber-500\"></i>Spiele von: \{currentActivePlayer\}\s+</h4>",
        replacement_all,
        content
    )
    print("Updated Section 1 (currentActivePlayer)")
else:
    print("Could not match pattern_all")

with open('App.tsx', 'w') as f:
    f.write(content)
