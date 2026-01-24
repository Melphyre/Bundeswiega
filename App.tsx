
import React, { useState, useEffect, useCallback } from 'react';
import { GameState, Player, Round } from './types';
import { calculateAverageDistance, getRoundSummary, getTargetRange } from './utils';

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [playerCount, setPlayerCount] = useState(2);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRoundResults, setCurrentRoundResults] = useState<Record<string, string>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [nextTargetInput, setNextTargetInput] = useState('');
  const [summaryData, setSummaryData] = useState<any>(null);

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('bg-gray-900', 'text-white');
      document.body.classList.remove('bg-gray-50', 'text-gray-900');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('bg-gray-900', 'text-white');
      document.body.classList.add('bg-gray-50', 'text-gray-900');
    }
  }, [darkMode]);

  const startGame = () => setGameState(GameState.PLAYER_COUNT);

  const handlePlayerCountConfirm = () => {
    const initialPlayers = Array.from({ length: playerCount }, (_, i) => ({
      id: `p${i}`,
      name: `Spieler ${i + 1}`,
      startWeight: 0
    }));
    setPlayers(initialPlayers);
    setGameState(GameState.PLAYER_NAMES);
  };

  const handlePlayerNamesConfirm = (names: string[]) => {
    const updatedPlayers = players.map((p, i) => ({ ...p, name: names[i] || p.name }));
    setPlayers(updatedPlayers);
    setGameState(GameState.START_WEIGHTS);
  };

  const handleStartWeightsConfirm = (weights: number[]) => {
    const updatedPlayers = players.map((p, i) => ({ ...p, startWeight: weights[i] }));
    setPlayers(updatedPlayers);
    setShowTargetModal(true);
  };

  const handleTargetWeightConfirm = () => {
    const target = parseInt(nextTargetInput);
    const range = getTargetRange(rounds.length === 0 ? players.map(p => p.startWeight) : Object.values(rounds[rounds.length - 1].results));
    
    // Validate target (only if not first round? Prompt implies it always applies)
    // Actually, "Bevor die erste Runde beginnt... fragt die App ein gewünschtes Zielgewicht ab"
    // Let's enforce range logic if any weights exist.
    if (isNaN(target) || target < range.min || target > range.max) {
        alert(`Bitte ein Gewicht zwischen ${Math.round(range.min)}g und ${Math.round(range.max)}g eingeben.`);
        return;
    }

    const newRound: Round = {
      targetWeight: target,
      results: {}
    };
    setRounds([...rounds, newRound]);
    setCurrentRoundResults({});
    setNextTargetInput('');
    setShowTargetModal(false);
    setGameState(GameState.GAMEPLAY);
  };

  const handleNextRound = () => {
    // Validate current entries
    const allFilled = players.every(p => currentRoundResults[p.id] && !isNaN(parseInt(currentRoundResults[p.id])));
    if (!allFilled) {
      alert("Bitte alle Gewichte eintragen.");
      return;
    }

    const updatedRounds = [...rounds];
    const currentRound = updatedRounds[updatedRounds.length - 1];
    players.forEach(p => {
      currentRound.results[p.id] = parseInt(currentRoundResults[p.id]);
    });

    const summary = getRoundSummary(currentRound, players);
    setSummaryData(summary);
    setShowSummary(true);
  };

  const proceedToNextRoundInput = () => {
    setShowSummary(false);
    setShowTargetModal(true);
  };

  return (
    <div className={`min-h-screen flex flex-col p-4 md:p-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
          1. Bundeswiega
        </h1>
        <button 
          onClick={() => setDarkMode(!darkMode)}
          className="p-3 rounded-full bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all"
        >
          {darkMode ? <i className="fas fa-sun text-yellow-400 text-xl"></i> : <i className="fas fa-moon text-indigo-600 text-xl"></i>}
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-4xl w-full mx-auto">
        {gameState === GameState.START && (
          <div className="text-center animate-in fade-in duration-500">
            <div className="mb-8 scale-110">
              <i className="fas fa-weight-hanging text-6xl text-blue-500 mb-4 block"></i>
            </div>
            <h2 className="text-xl font-medium mb-6 opacity-80">Das ultimative Wiegespiel</h2>
            <button 
              onClick={startGame}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-2xl shadow-xl transform active:scale-95 transition-all text-xl"
            >
              Spiel starten
            </button>
          </div>
        )}

        {gameState === GameState.PLAYER_COUNT && (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6 text-center">Wie viele Spieler?</h2>
            <select 
              value={playerCount}
              onChange={(e) => setPlayerCount(parseInt(e.target.value))}
              className="w-full p-4 border-2 border-gray-100 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700 mb-6 text-lg focus:outline-none focus:border-blue-500"
            >
              {Array.from({ length: 9 }, (_, i) => i + 2).map(n => (
                <option key={n} value={n}>{n} Spieler</option>
              ))}
            </select>
            <button 
              onClick={handlePlayerCountConfirm}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-colors"
            >
              Weiter
            </button>
          </div>
        )}

        {gameState === GameState.PLAYER_NAMES && (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl w-full max-w-xl">
            <h2 className="text-2xl font-bold mb-6 text-center">Namen eingeben</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {players.map((p, i) => (
                <div key={p.id}>
                  <label className="text-sm font-semibold opacity-60 mb-1 block">Spieler {i + 1}</label>
                  <input 
                    type="text"
                    placeholder={`Name ${i + 1}`}
                    className="w-full p-3 border-2 border-gray-100 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700 focus:outline-none focus:border-blue-500"
                    onChange={(e) => {
                      const newPlayers = [...players];
                      newPlayers[i].name = e.target.value;
                      setPlayers(newPlayers);
                    }}
                  />
                </div>
              ))}
            </div>
            <button 
              onClick={() => handlePlayerNamesConfirm(players.map(p => p.name))}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-colors"
            >
              Startgewichte festlegen
            </button>
          </div>
        )}

        {gameState === GameState.START_WEIGHTS && (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl w-full max-w-xl">
            <h2 className="text-2xl font-bold mb-2 text-center">Startgewichte (g)</h2>
            <p className="text-sm text-center opacity-60 mb-6">Trage das aktuelle Gewicht jedes Spielers ein.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {players.map((p, i) => (
                <div key={p.id}>
                  <label className="text-sm font-semibold mb-1 block">{p.name}</label>
                  <input 
                    type="number"
                    placeholder="Gewicht in g"
                    className="w-full p-3 border-2 border-gray-100 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700 focus:outline-none focus:border-blue-500"
                    onChange={(e) => {
                      const newPlayers = [...players];
                      newPlayers[i].startWeight = parseInt(e.target.value) || 0;
                      setPlayers(newPlayers);
                    }}
                  />
                </div>
              ))}
            </div>
            <button 
              onClick={() => handleStartWeightsConfirm(players.map(p => p.startWeight))}
              className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-700 transition-colors"
            >
              Zielgewicht festlegen
            </button>
          </div>
        )}

        {gameState === GameState.GAMEPLAY && (
          <div className="w-full flex flex-col space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-blue-50 dark:bg-blue-900/20">
                      <th className="p-4 border-b dark:border-gray-700 font-bold">Runde</th>
                      {players.map(p => (
                        <th key={p.id} className="p-4 border-b dark:border-gray-700 font-bold text-center">{p.name}</th>
                      ))}
                      <th className="p-4 border-b dark:border-gray-700 font-bold text-center bg-yellow-50 dark:bg-yellow-900/10">Ziel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Past Rounds */}
                    {rounds.map((r, rIdx) => (
                      <tr key={rIdx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="p-4 border-b dark:border-gray-700 font-semibold text-gray-500">#{rIdx + 1}</td>
                        {players.map(p => {
                          const val = r.results[p.id];
                          const dist = val !== undefined ? Math.abs(val - r.targetWeight) : null;
                          return (
                            <td key={p.id} className="p-4 border-b dark:border-gray-700 text-center">
                              <div className="font-semibold">{val ?? '-'}g</div>
                              {dist !== null && <div className="text-xs text-red-500">+{dist}g</div>}
                            </td>
                          );
                        })}
                        <td className="p-4 border-b dark:border-gray-700 text-center font-bold text-blue-600 bg-yellow-50/50 dark:bg-yellow-900/5">
                          {r.targetWeight}g
                        </td>
                      </tr>
                    ))}
                    
                    {/* Current Entry Row */}
                    <tr className="bg-blue-50/30 dark:bg-blue-900/10">
                      <td className="p-4 font-bold text-blue-600">Aktuell</td>
                      {players.map(p => (
                        <td key={p.id} className="p-2 text-center">
                          <input 
                            type="number"
                            value={currentRoundResults[p.id] || ''}
                            onChange={(e) => setCurrentRoundResults(prev => ({...prev, [p.id]: e.target.value}))}
                            placeholder="g"
                            className="w-20 p-2 border-2 border-blue-200 dark:border-blue-900 rounded-lg bg-white dark:bg-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                      ))}
                      <td className="p-4 text-center font-bold bg-yellow-50 dark:bg-yellow-900/10">
                        {rounds[rounds.length - 1]?.targetWeight}g
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 dark:bg-gray-900/50 font-bold">
                      <td className="p-4">∅ Abstand</td>
                      {players.map(p => (
                        <td key={p.id} className="p-4 text-center text-blue-600">
                          {calculateAverageDistance(p.id, rounds.slice(0, -1).concat(
                            // Simulate calculation including current if it were complete
                            Object.keys(currentRoundResults).length === players.length ? 
                            [{ targetWeight: rounds[rounds.length-1].targetWeight, results: Object.fromEntries(Object.entries(currentRoundResults).map(([k,v]) => [k, parseInt(v)])) }] as Round[]
                            : []
                          )).toFixed(1)}g
                        </td>
                      ))}
                      <td className="p-4 bg-gray-200 dark:bg-gray-800"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <button 
              onClick={handleNextRound}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-2 text-lg"
            >
              <span>Nächste Runde</span>
              <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        )}
      </main>

      {/* Target Weight Selection Modal */}
      {showTargetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-2xl font-bold mb-2">Zielgewicht festlegen</h3>
            {(() => {
                const range = getTargetRange(rounds.length === 0 ? players.map(p => p.startWeight) : Object.values(rounds[rounds.length - 1].results));
                return (
                    <>
                    <p className="text-sm opacity-70 mb-6">
                        Erlaubter Bereich: <span className="font-bold text-blue-600">{Math.round(range.min)}g</span> bis <span className="font-bold text-blue-600">{Math.round(range.max)}g</span>
                    </p>
                    <input 
                        type="number"
                        autoFocus
                        value={nextTargetInput}
                        onChange={(e) => setNextTargetInput(e.target.value)}
                        placeholder="Zielgewicht in g"
                        className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl mb-6 bg-gray-50 dark:bg-gray-700 text-xl focus:outline-none focus:border-blue-500"
                    />
                    </>
                );
            })()}
            <button 
              onClick={handleTargetWeightConfirm}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-all"
            >
              Runde starten
            </button>
          </div>
        </div>
      )}

      {/* Round Summary Modal */}
      {showSummary && summaryData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-y-auto max-h-[90vh]">
            <h3 className="text-3xl font-black mb-6 text-center text-blue-600">Rundenergebnis</h3>
            
            <div className="space-y-6">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30 flex items-center">
                <i className="fas fa-skull-crossbones text-2xl text-red-500 mr-4"></i>
                <div>
                  <p className="text-sm font-bold opacity-60 uppercase tracking-wider">Am weitesten entfernt</p>
                  <p className="text-xl font-black text-red-600">{summaryData.furthestPlayer}</p>
                </div>
              </div>

              {summaryData.specialHits.length > 0 && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl border border-yellow-100 dark:border-yellow-900/30">
                  <p className="text-sm font-bold opacity-60 mb-2 uppercase tracking-wider">Schnapszahl!</p>
                  {summaryData.specialHits.map((hit: any, idx: number) => (
                    <div key={idx} className="flex justify-between font-bold text-yellow-700 dark:text-yellow-400">
                      <span>{hit.playerName}</span>
                      <span>{hit.value}g</span>
                    </div>
                  ))}
                </div>
              )}

              {summaryData.duplicates.length > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                  <p className="text-sm font-bold opacity-60 mb-2 uppercase tracking-wider">Gleiche Gewichte</p>
                  <div className="flex flex-wrap gap-2">
                    {summaryData.duplicates.map((d: number) => (
                      <span key={d} className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">{d}g</span>
                    ))}
                  </div>
                </div>
              )}

              {summaryData.specialHits.length === 0 && summaryData.duplicates.length === 0 && (
                <p className="text-center opacity-40 italic">Keine besonderen Ereignisse in dieser Runde.</p>
              )}
            </div>

            <button 
              onClick={proceedToNextRoundInput}
              className="w-full mt-8 bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-all text-xl"
            >
              Weiter
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
