
import React, { useState, useEffect, useRef } from 'react';
import { GameState, Player, Round } from './types';
import { calculateAverageDistance, getRoundSummary, getTargetRange, SPECIAL_NUMBERS } from './utils';

// Declare html2canvas for TS
declare const html2canvas: any;

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [playerCount, setPlayerCount] = useState(2);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRoundResults, setCurrentRoundResults] = useState<Record<string, string>>({});
  const [currentRoundTargets, setCurrentRoundTargets] = useState<Record<string, string>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [showFinalIntro, setShowFinalIntro] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [disqualifiedNotice, setDisqualifiedNotice] = useState<{name: string, diff: number} | null>(null);
  const [finalTriggered, setFinalTriggered] = useState(false);
  const [nextTargetInput, setNextTargetInput] = useState('');
  const [summaryData, setSummaryData] = useState<any>(null);
  
  const resultAreaRef = useRef<HTMLDivElement>(null);

  // Prevention of page reload/navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (gameState !== GameState.START && gameState !== GameState.RESULT_SCREEN) {
        e.preventDefault();
        e.returnValue = 'Daten gehen verloren. Möchtest du wirklich schließen?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameState]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('bg-gray-900', 'text-white');
      document.body.classList.remove('bg-white', 'text-gray-900');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('bg-gray-900', 'text-white');
      document.body.classList.add('bg-white', 'text-gray-900');
    }
  }, [darkMode]);

  const startGame = () => {
    setGameState(GameState.PLAYER_COUNT);
    setRounds([]);
    setPlayers([]);
    setFinalTriggered(false);
    setSummaryData(null);
  };

  const resetGame = () => {
    setGameState(GameState.START);
    setRounds([]);
    setPlayers([]);
    setShowResetConfirm(false);
  };

  const handlePlayerCountConfirm = () => {
    const initialPlayers = Array.from({ length: playerCount }, (_, i) => ({
      id: `p${i}`,
      name: `Spieler ${i + 1}`,
      startWeight: 0,
      schnaepse: 0,
      isDisqualified: false
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
    setGameState(GameState.ROUND_TARGET);
  };

  const handleTargetWeightConfirm = () => {
    const target = parseInt(nextTargetInput);
    const activePlayers = players.filter(p => !p.isDisqualified);
    const prevResults = rounds.length === 0 
      ? activePlayers.map(p => p.startWeight) 
      : activePlayers.map(p => rounds[rounds.length - 1].results[p.id]);
    
    const range = getTargetRange(prevResults);
    
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
    setGameState(GameState.GAMEPLAY);
  };

  const handleNextRound = () => {
    const activePlayers = players.filter(p => !p.isDisqualified);
    const allFilled = activePlayers.every(p => currentRoundResults[p.id] && !isNaN(parseInt(currentRoundResults[p.id])));
    if (!allFilled) {
      alert("Bitte alle Gewichte eintragen.");
      return;
    }

    const updatedRounds = [...rounds];
    const currentRound = updatedRounds[updatedRounds.length - 1];
    
    activePlayers.forEach(p => {
      currentRound.results[p.id] = parseInt(currentRoundResults[p.id]);
    });

    const summary = getRoundSummary(currentRound, players);
    let firstDisqualified: {name: string, diff: number} | null = null;

    const updatedPlayers = players.map(p => {
      if (p.isDisqualified) return p;

      const weight = currentRound.results[p.id];
      const dist = Math.abs(weight - currentRound.targetWeight);
      
      let isDisqualified = p.isDisqualified;
      if (dist > 50) {
        isDisqualified = true;
        if (!firstDisqualified) firstDisqualified = { name: p.name, diff: dist };
      }

      let schnaepse = p.schnaepse;
      if (summary.pointsToAward.includes(p.id)) {
        schnaepse += 1;
      }

      return { ...p, schnaepse, isDisqualified };
    });

    const trigger = updatedPlayers.some(p => !p.isDisqualified && (currentRound.results[p.id] as number) < 75);
    setFinalTriggered(trigger);

    setPlayers(updatedPlayers);
    setSummaryData(summary);
    setRounds(updatedRounds);
    setDisqualifiedNotice(firstDisqualified);
    setShowSummary(true);
  };

  const startLastRound = () => {
    setShowFinalIntro(false);
    setFinalTriggered(false);
    setCurrentRoundTargets({});
    setGameState(GameState.FINAL_ROUND_TARGETS);
  };

  const handleFinalTargetsConfirm = () => {
    const activePlayers = players.filter(p => !p.isDisqualified);
    const allFilled = activePlayers.every(p => currentRoundTargets[p.id] && !isNaN(parseInt(currentRoundTargets[p.id])));
    if (!allFilled) {
      alert("Bitte alle individuellen Zielgewichte eintragen.");
      return;
    }

    const finalRound: Round = {
      targetWeight: 0,
      isFinal: true,
      individualTargets: {},
      results: {}
    };
    activePlayers.forEach(p => {
      finalRound.individualTargets![p.id] = parseInt(currentRoundTargets[p.id]);
    });

    setRounds([...rounds, finalRound]);
    setCurrentRoundResults({});
    setGameState(GameState.FINAL_ROUND_RESULTS);
  };

  const handleFinalResultsConfirm = () => {
    const activePlayers = players.filter(p => !p.isDisqualified);
    const allFilled = activePlayers.every(p => currentRoundResults[p.id] && !isNaN(parseInt(currentRoundResults[p.id])));
    if (!allFilled) {
      alert("Bitte alle Leergewichte eintragen.");
      return;
    }

    const updatedRounds = [...rounds];
    const lastRound = updatedRounds[updatedRounds.length - 1];
    activePlayers.forEach(p => {
      lastRound.results[p.id] = parseInt(currentRoundResults[p.id]);
    });

    const summary = getRoundSummary(lastRound, players);
    let firstDisqualified: {name: string, diff: number} | null = null;

    const updatedPlayers = players.map(p => {
      if (p.isDisqualified) return p;
      
      const weight = lastRound.results[p.id];
      const target = lastRound.individualTargets![p.id];
      const dist = Math.abs(weight - target);
      
      let isDisqualified = p.isDisqualified;
      if (dist > 50) {
        isDisqualified = true;
        if (!firstDisqualified) firstDisqualified = { name: p.name, diff: dist };
      }

      let schnaepse = p.schnaepse;
      if (summary.pointsToAward.includes(p.id)) {
        schnaepse += 1;
      }

      return { ...p, schnaepse, isDisqualified };
    });

    setPlayers(updatedPlayers);
    setRounds(updatedRounds);
    setSummaryData(summary);
    setDisqualifiedNotice(firstDisqualified);
    setShowSummary(true);
  };

  const proceedFromSummary = () => {
    setShowSummary(false);
    
    if (players.every(p => p.isDisqualified)) {
        setGameState(GameState.RESULT_SCREEN);
        return;
    }

    if (gameState === GameState.FINAL_ROUND_RESULTS) {
      setGameState(GameState.RESULT_SCREEN);
    } else if (finalTriggered) {
      setShowFinalIntro(true);
    } else {
      setGameState(GameState.ROUND_TARGET);
    }
  };

  const captureScreenshot = async () => {
    if (!resultAreaRef.current) return;
    try {
      const canvas = await html2canvas(resultAreaRef.current, {
        scale: 2,
        backgroundColor: darkMode ? '#111827' : '#ffffff',
        logging: false
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Bundeswiega_Ergebnis_${new Date().toISOString().slice(0,10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Screenshot failed:", err);
      alert("Screenshot konnte nicht erstellt werden.");
    }
  };

  return (
    <div className={`min-h-screen flex flex-col p-4 md:p-8 transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <header className="flex justify-between items-center mb-8">
        <h1 className={`text-3xl font-black tracking-tighter ${darkMode ? 'text-white' : 'text-green-600'}`}>
          1. Bundeswiega
        </h1>
        <div className="flex space-x-2">
          {gameState !== GameState.START && (
            <button 
              onClick={() => setShowResetConfirm(true)}
              className={`p-3 rounded-full shadow-md border transition-all ${darkMode ? 'bg-gray-800 border-gray-700 text-red-400' : 'bg-gray-100 border-gray-200 text-red-600 hover:bg-red-50'}`}
              aria-label="Spiel zurücksetzen"
            >
              <i className="fas fa-undo-alt text-xl"></i>
            </button>
          )}
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`p-3 rounded-full shadow-md hover:shadow-lg transition-all border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}
            aria-label="Theme umschalten"
          >
            {darkMode ? <i className="fas fa-sun text-yellow-400 text-xl"></i> : <i className="fas fa-moon text-indigo-600 text-xl"></i>}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center max-w-4xl w-full mx-auto">
        {gameState === GameState.START && (
          <div className="text-center animate-in fade-in duration-700 max-w-lg w-full">
            <div className="mb-16 mt-8">
              <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter leading-none select-none">
                <span className="text-green-600 dark:text-green-400">1.</span>
                <br />
                <span className="text-green-700 dark:text-green-500">Bundeswiega</span>
              </h1>
            </div>
            
            <h2 className="text-xl font-black mb-12 opacity-80 uppercase tracking-widest font-black">Das ultimative Wiegen-Spiel</h2>
            
            <div className="flex flex-col space-y-4 w-full max-w-sm mx-auto">
              <button onClick={startGame} className="bg-green-600 hover:bg-green-700 text-white font-bold py-6 px-10 rounded-3xl shadow-xl transform active:scale-95 transition-all text-2xl w-full flex items-center justify-center space-x-3 mb-2">
                <i className="fas fa-play"></i>
                <span>Spiel starten</span>
              </button>
              
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setShowComingSoonModal(true)} className={`font-bold py-4 px-4 rounded-2xl shadow-md transform active:scale-95 transition-all flex items-center justify-center space-x-2 border ${darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                  <i className="fas fa-users"></i>
                  <span>Teamspiel</span>
                </button>
                <button onClick={() => setShowComingSoonModal(true)} className={`font-bold py-4 px-4 rounded-2xl shadow-md transform active:scale-95 transition-all flex items-center justify-center space-x-2 border ${darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                  <i className="fas fa-bolt"></i>
                  <span>Speedwiegen</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {gameState === GameState.PLAYER_COUNT && (
          <div className={`p-8 rounded-3xl shadow-2xl w-full max-md border animate-in slide-in-from-bottom-4 duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-2xl font-bold mb-6 text-center">Wie viele Spieler?</h2>
            <select value={playerCount} onChange={(e) => setPlayerCount(parseInt(e.target.value))} className={`w-full p-4 border-2 rounded-xl mb-6 text-lg focus:outline-none focus:border-green-500 transition-colors ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
              {Array.from({ length: 9 }, (_, i) => i + 2).map(n => <option key={n} value={n}>{n} Spieler</option>)}
            </select>
            <button onClick={handlePlayerCountConfirm} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-700 transition-colors">Weiter</button>
          </div>
        )}

        {gameState === GameState.PLAYER_NAMES && (
          <div className={`p-8 rounded-3xl shadow-2xl w-full max-w-xl border animate-in slide-in-from-bottom-4 duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-2xl font-bold mb-6 text-center">Namen eingeben</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {players.map((p, i) => (
                <div key={p.id}>
                  <label className="text-sm font-semibold opacity-60 mb-1 block">Spieler {i + 1}</label>
                  <input type="text" placeholder={`Name ${i + 1}`} value={p.name} className={`w-full p-3 border-2 rounded-xl focus:outline-none focus:border-green-500 transition-colors ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`} onChange={(e) => {
                    const newPlayers = [...players];
                    newPlayers[i].name = e.target.value;
                    setPlayers(newPlayers);
                  }} />
                </div>
              ))}
            </div>
            <button onClick={() => handlePlayerNamesConfirm(players.map(p => p.name))} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-700 transition-colors">Startgewichte festlegen</button>
          </div>
        )}

        {gameState === GameState.START_WEIGHTS && (
          <div className={`p-8 rounded-3xl shadow-2xl w-full max-w-xl border animate-in slide-in-from-bottom-4 duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-2xl font-bold mb-2 text-center">Startgewichte (g)</h2>
            <p className="text-sm text-center opacity-60 mb-6">Trage das aktuelle Gewicht jedes Spielers ein.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {players.map((p, i) => (
                <div key={p.id}>
                  <label className="text-sm font-semibold mb-1 block">{p.name}</label>
                  <input type="number" placeholder="Gewicht in g" className={`w-full p-3 border-2 rounded-xl focus:outline-none focus:border-green-500 transition-colors ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`} onChange={(e) => {
                    const newPlayers = [...players];
                    newPlayers[i].startWeight = parseInt(e.target.value) || 0;
                    setPlayers(newPlayers);
                  }} />
                </div>
              ))}
            </div>
            <button onClick={() => handleStartWeightsConfirm(players.map(p => p.startWeight))} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-700 transition-colors">Zielgewicht festlegen</button>
          </div>
        )}

        {gameState === GameState.ROUND_TARGET && (
          <div className={`p-8 rounded-3xl shadow-2xl w-full max-md border animate-in zoom-in duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-2xl font-bold mb-4 text-center">Runde {rounds.length + 1}</h2>
            
            <div className="mb-6">
              <p className="text-xs font-bold uppercase opacity-50 mb-3 text-center tracking-widest">Aktuelle Gewichte</p>
              <div className="grid grid-cols-2 gap-2">
                {players.map(p => {
                  const currentW = rounds.length === 0 
                    ? p.startWeight 
                    : rounds[rounds.length - 1].results[p.id];
                  return (
                    <div key={p.id} className={`p-3 rounded-xl border flex flex-col items-center justify-center ${p.isDisqualified ? 'opacity-40 grayscale' : ''} ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                      <span className="text-[10px] font-bold opacity-60 uppercase truncate w-full text-center mb-1">
                        {p.name} {p.isDisqualified && '❌'}
                      </span>
                      <span className="text-lg font-black">{p.isDisqualified ? '—' : `${currentW}g`}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-center mt-4">
              {(() => {
                  const activePlayers = players.filter(p => !p.isDisqualified);
                  const prevResults = rounds.length === 0 
                    ? activePlayers.map(p => p.startWeight) 
                    : activePlayers.map(p => rounds[rounds.length - 1].results[p.id]);
                  const range = getTargetRange(prevResults);
                  return (
                      <>
                      <p className="text-sm opacity-70 mb-6">Lege das allgemeine Zielgewicht fest. <br/>Bereich: <span className="font-bold text-green-600 dark:text-green-400">{Math.round(range.min)}g - {Math.round(range.max)}g</span></p>
                      <input 
                        type="number" 
                        autoFocus 
                        value={nextTargetInput} 
                        onChange={(e) => setNextTargetInput(e.target.value)} 
                        placeholder="Zielgewicht (g)" 
                        onKeyDown={(e) => e.key === 'Enter' && handleTargetWeightConfirm()}
                        className={`w-full p-4 border-2 rounded-xl mb-6 text-2xl text-center focus:outline-none focus:border-green-500 transition-colors ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`} 
                      />
                      </>
                  );
              })()}
              <button onClick={handleTargetWeightConfirm} className="w-full bg-green-600 text-white font-bold py-5 rounded-2xl shadow-xl hover:bg-green-700 transition-all text-xl">Runde starten</button>
            </div>
          </div>
        )}

        {gameState === GameState.FINAL_ROUND_TARGETS && (
          <div className={`p-8 rounded-3xl shadow-2xl w-full max-w-xl border animate-in zoom-in duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-3xl font-black mb-2 text-center text-yellow-600">Letzte Runde</h2>
            <p className="text-center opacity-70 mb-8">Jeder Spieler legt sein eigenes Zielgewicht fest.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {players.filter(p => !p.isDisqualified).map(p => (
                <div key={p.id} className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                   <label className="block text-sm font-bold mb-2">{p.name}</label>
                   <input 
                      type="number" 
                      value={currentRoundTargets[p.id] || ''} 
                      onChange={(e) => setCurrentRoundTargets(prev => ({...prev, [p.id]: e.target.value}))} 
                      placeholder="Ziel (g)" 
                      className={`w-full p-3 border-2 rounded-xl text-center focus:outline-none focus:border-yellow-500 transition-colors ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`} 
                    />
                </div>
              ))}
            </div>
            <button onClick={handleFinalTargetsConfirm} className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-5 rounded-2xl shadow-xl transition-all text-xl">Ziele bestätigen</button>
          </div>
        )}

        {(gameState === GameState.GAMEPLAY || gameState === GameState.FINAL_ROUND_RESULTS) && (
          <div className="w-full flex flex-col space-y-6 animate-in fade-in duration-500">
            <div className={`rounded-3xl shadow-xl overflow-hidden border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}>
                      <th className="p-4 border-b border-gray-200 dark:border-gray-700 font-bold">Runde</th>
                      {players.map(p => <th key={p.id} className="p-4 border-b border-gray-200 dark:border-gray-700 font-bold text-center">{p.name}</th>)}
                      <th className={`p-4 border-b border-gray-200 dark:border-gray-700 font-bold text-center ${darkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>Ziel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rounds.map((r, rIdx) => {
                        if (r.isFinal && gameState === GameState.FINAL_ROUND_RESULTS) return null;
                        return (
                      <tr key={rIdx} className={`hover:bg-opacity-50 border-b border-gray-100 dark:border-gray-800 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                        <td className="p-4 font-semibold opacity-50">#{rIdx + 1}{r.isFinal && ' (F)'}</td>
                        {players.map(p => {
                          const val = r.results[p.id];
                          const target = (r.isFinal && r.individualTargets) ? r.individualTargets[p.id] : r.targetWeight;
                          const dist = val !== undefined && target !== undefined ? Math.abs(val - target) : null;
                          const isSchnaps = val !== undefined && SPECIAL_NUMBERS.includes(val);
                          return (
                            <td key={p.id} className="p-4 text-center">
                              {val !== undefined ? (
                                <>
                                  <div className={`font-semibold ${isSchnaps ? 'text-yellow-600 dark:text-yellow-400' : ''}`}>{val}g</div>
                                  {dist !== null && dist > 0 && <div className={`text-xs font-bold ${dist > 50 ? 'text-red-600 uppercase' : darkMode ? 'text-red-400' : 'text-red-500'}`}>{dist > 50 ? 'DISQUAL.' : `+${dist}g`}</div>}
                                  {dist === 0 && <div className={`text-xs font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>TREFFER!</div>}
                                  {isSchnaps && <div className="text-[8px] font-black uppercase text-yellow-600 dark:text-yellow-400">Schnapszahl!</div>}
                                </>
                              ) : (
                                <div className="text-xs opacity-30 italic">ausgeschieden</div>
                              )}
                            </td>
                          );
                        })}
                        <td className={`p-4 text-center font-bold ${darkMode ? 'text-yellow-400 bg-yellow-900/10' : 'text-blue-600 bg-yellow-50/50'}`}>
                          {r.isFinal ? 'Indiv.' : `${r.targetWeight}g`}
                        </td>
                      </tr>
                    );})}

                    {gameState === GameState.FINAL_ROUND_RESULTS && (
                      <>
                        <tr className={darkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'}>
                            <td className="p-4 font-bold text-yellow-600 dark:text-yellow-400">letzte Runde</td>
                            {players.map(p => (
                                <td key={p.id} className="p-4 text-center font-bold">
                                    {!p.isDisqualified ? `${rounds[rounds.length - 1].individualTargets![p.id]}g` : '—'}
                                </td>
                            ))}
                            <td className="p-4 text-center opacity-30">—</td>
                        </tr>
                        <tr className={darkMode ? 'bg-green-900/20' : 'bg-green-50'}>
                            <td className="p-4 font-bold text-green-600 dark:text-green-400">Leergewicht</td>
                            {players.map(p => (
                            <td key={p.id} className="p-2 text-center">
                                {!p.isDisqualified ? (
                                    <input 
                                    type="number" 
                                    value={currentRoundResults[p.id] || ''} 
                                    onChange={(e) => setCurrentRoundResults(prev => ({...prev, [p.id]: e.target.value}))} 
                                    placeholder="g" 
                                    className={`w-24 p-2 border-2 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`} 
                                    />
                                ) : <span className="text-xs opacity-40">❌</span>}
                            </td>
                            ))}
                            <td className="p-4 text-center opacity-30 italic text-xs">Finaler Wiegevorgang</td>
                        </tr>
                      </>
                    )}

                    {gameState === GameState.GAMEPLAY && (
                      <tr className={darkMode ? 'bg-gray-900/40' : 'bg-green-50/20'}>
                        <td className="p-4 font-bold text-green-600 dark:text-green-400">Eingabe</td>
                        {players.map(p => (
                          <td key={p.id} className="p-2 text-center">
                            {!p.isDisqualified ? (
                                <input 
                                type="number" 
                                value={currentRoundResults[p.id] || ''} 
                                onChange={(e) => setCurrentRoundResults(prev => ({...prev, [p.id]: e.target.value}))} 
                                placeholder="g" 
                                className={`w-20 p-2 border-2 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`} 
                                />
                            ) : (
                                <span className="text-xs text-red-500 font-bold opacity-50">❌ DISQ.</span>
                            )}
                          </td>
                        ))}
                        <td className={`p-4 text-center font-bold ${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'}`}>
                          {rounds[rounds.length - 1]?.targetWeight}g
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {gameState === GameState.GAMEPLAY && (
              <button onClick={handleNextRound} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-2 text-lg">
                <span>Runde abschließen</span>
                <i className="fas fa-arrow-right"></i>
              </button>
            )}

            {gameState === GameState.FINAL_ROUND_RESULTS && (
              <button onClick={handleFinalResultsConfirm} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-2 text-lg">
                <span>Endwertung</span>
                <i className="fas fa-trophy"></i>
              </button>
            )}
          </div>
        )}

        {gameState === GameState.RESULT_SCREEN && (
          <div className="w-full flex flex-col space-y-8 animate-in fade-in duration-1000 pb-12 text-center">
            <h2 className="text-4xl font-black text-green-600">🏆 Gesamtergebnis</h2>
            
            <div ref={resultAreaRef} className={`p-4 md:p-8 rounded-3xl space-y-8 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
              <div className={`rounded-3xl shadow-xl overflow-hidden border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}>
                        <th className="p-4 font-bold">Platz</th>
                        <th className="p-4 font-bold">Spieler</th>
                        <th className="p-4 font-bold text-center">∅ Abstand*</th>
                        <th className="p-4 font-bold text-center">Schnäppse</th>
                        <th className="p-4 font-bold text-center bg-green-600/10">Summe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players
                        .map(p => {
                          const avgDist = calculateAverageDistance(p.id, rounds);
                          return { ...p, avgDist, total: avgDist + p.schnaepse };
                        })
                        .sort((a, b) => {
                          if (a.isDisqualified && !b.isDisqualified) return 1;
                          if (!a.isDisqualified && b.isDisqualified) return -1;
                          return a.total - b.total;
                        })
                        .map((p, idx) => (
                          <tr key={p.id} className={`${idx === 0 && !p.isDisqualified ? 'bg-yellow-500/10' : ''} ${p.isDisqualified ? 'bg-red-500/5' : ''}`}>
                            <td className="p-4 font-bold text-lg">{p.isDisqualified ? '💀' : `${idx + 1}.`}</td>
                            <td className={`p-4 font-bold ${p.isDisqualified ? 'line-through text-red-500 opacity-60' : ''}`}>
                              {p.name} {idx === 0 && !p.isDisqualified && '🥇'} {idx === 1 && !p.isDisqualified && '🥈'} {idx === 2 && !p.isDisqualified && '🥉'}
                              {p.isDisqualified && <span className="ml-2 text-[10px] font-black uppercase tracking-tighter">DISQUALIFIZIERT</span>}
                            </td>
                            <td className="p-4 text-center">{p.isDisqualified ? '—' : `${p.avgDist.toFixed(2)}g`}</td>
                            <td className="p-4 text-center font-semibold">{p.schnaepse}</td>
                            <td className="p-4 text-center font-black text-green-600 dark:text-green-400 bg-green-600/5">{p.isDisqualified ? '—' : p.total.toFixed(2)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] opacity-40 p-2 text-right italic">*Abstand der letzten Runde wird nicht eingerechnet.</p>
              </div>

              {/* FULL RESULTS TABLE BELOW LEADERBOARD */}
              <div className={`rounded-3xl shadow-xl overflow-hidden border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <h3 className="p-4 font-bold border-b border-gray-200 dark:border-gray-700 text-left">Detaillierte Rundenergebnisse</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className={darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}>
                        <th className="p-4 font-bold">Runde</th>
                        {players.map(p => <th key={p.id} className="p-4 font-bold text-center">{p.name}</th>)}
                        <th className="p-4 font-bold text-center">Ziel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rounds.map((r, rIdx) => (
                        <tr key={rIdx} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="p-4 font-semibold opacity-50">#{rIdx + 1}{r.isFinal ? ' (F)' : ''}</td>
                          {players.map(p => {
                            const val = r.results[p.id];
                            const target = (r.isFinal && r.individualTargets) ? r.individualTargets[p.id] : r.targetWeight;
                            const dist = val !== undefined && target !== undefined ? Math.abs(val - target) : null;
                            const isSchnaps = val !== undefined && SPECIAL_NUMBERS.includes(val);
                            return (
                              <td key={p.id} className="p-4 text-center">
                                {val !== undefined ? (
                                  <div>
                                    <span className={isSchnaps ? 'font-black text-yellow-600 dark:text-yellow-400' : 'font-semibold'}>{val}g</span>
                                    {dist !== null && dist !== 0 && <span className="text-[10px] ml-1 opacity-60">(+{dist}g)</span>}
                                    {dist === 0 && <span className="text-[10px] ml-1 text-green-600 font-bold">(!)</span>}
                                  </div>
                                ) : '—'}
                              </td>
                            );
                          })}
                          <td className="p-4 text-center font-bold opacity-60">
                             {r.isFinal ? 'Indiv.' : `${r.targetWeight}g`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-4 pt-4">
              <button onClick={captureScreenshot} className="w-full bg-blue-600 text-white font-bold py-5 rounded-2xl shadow-xl hover:bg-blue-700 transition-all text-xl flex items-center justify-center space-x-3">
                <i className="fas fa-camera"></i>
                <span>Screenshot speichern</span>
              </button>
              
              <button onClick={() => setGameState(GameState.START)} className="w-full bg-gray-600 text-white font-bold py-5 rounded-2xl shadow-xl hover:bg-gray-700 transition-all text-xl">
                <i className="fas fa-home mr-2"></i> Zurück zum Hauptmenü
              </button>
            </div>
          </div>
        )}
      </main>

      {/* DISQUALIFICATION MODAL */}
      {disqualifiedNotice && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-red-900/95 backdrop-blur-xl">
          <div className="rounded-3xl p-10 max-w-md w-full shadow-2xl border-4 border-white animate-in zoom-in duration-500 text-center bg-red-600 text-white">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl animate-bounce">
                <i className="fas fa-user-slash text-4xl text-red-600"></i>
            </div>
            <h3 className="text-4xl font-black mb-4 uppercase tracking-tighter">RAUSGEFLOGEN!</h3>
            <p className="text-2xl font-bold mb-2">{disqualifiedNotice.name.toUpperCase()}</p>
            <div className="bg-black/20 p-4 rounded-2xl mb-8">
               <p className="text-sm font-bold uppercase opacity-80 mb-1">Begründung:</p>
               <p className="text-lg font-black">Zielgewicht um {disqualifiedNotice.diff.toFixed(1)}g verfehlt!</p>
               <p className="text-[10px] mt-2 opacity-60">(Zulässiges Limit: 50g)</p>
            </div>
            <button 
              onClick={() => setDisqualifiedNotice(null)} 
              className="w-full bg-white text-red-600 font-black py-5 rounded-2xl shadow-xl hover:bg-gray-100 transition-all text-xl uppercase tracking-widest"
            >
              Verstanden
            </button>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className={`rounded-3xl p-8 max-sm w-full shadow-2xl border animate-in zoom-in duration-300 text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h3 className="text-2xl font-black mb-4 uppercase text-red-600">Spiel Reset?</h3>
            <p className="opacity-80 mb-8">Bist du sicher? Alle aktuellen Wiegeergebnisse gehen verloren!</p>
            <div className="flex flex-col space-y-3">
              <button onClick={resetGame} className="w-full bg-red-600 text-white font-bold py-4 rounded-xl shadow-lg">Ja, abbrechen</button>
              <button onClick={() => setShowResetConfirm(false)} className={`w-full font-bold py-4 rounded-xl border transition-colors ${darkMode ? 'border-gray-600 text-white hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>Nein, weiter</button>
            </div>
          </div>
        </div>
      )}

      {showSummary && summaryData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`rounded-3xl p-8 max-w-lg w-full shadow-2xl border animate-in slide-in-from-bottom duration-300 overflow-y-auto max-h-[90vh] ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h3 className="text-3xl font-black mb-6 text-center text-green-600 dark:text-green-400">Rundenergebnis</h3>
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border flex items-center ${darkMode ? 'bg-red-900/20 border-red-900/40' : 'bg-red-50 border-red-100'}`}>
                <i className={`fas fa-skull-crossbones text-2xl mr-4 ${darkMode ? 'text-red-400' : 'text-red-500'}`}></i>
                <div>
                  <p className="text-xs font-bold opacity-60 uppercase tracking-wider">Am weitesten entfernt (+1 Schnaps)</p>
                  <p className={`text-lg font-black ${darkMode ? 'text-red-300' : 'text-red-600'}`}>{summaryData.furthestPlayers.join(' & ')}</p>
                </div>
              </div>
              
              {summaryData.exactHits.length > 0 && (
                  <div className={`p-4 rounded-2xl border flex items-center ${darkMode ? 'bg-green-900/20 border-green-900/40' : 'bg-green-50 border-green-100'}`}>
                    <i className={`fas fa-bullseye text-2xl mr-4 ${darkMode ? 'text-green-400' : 'text-green-500'}`}></i>
                    <div>
                        <p className="text-xs font-bold opacity-60 uppercase tracking-wider">Volltreffer! (+1 Schnaps)</p>
                        <p className={`text-lg font-black ${darkMode ? 'text-green-300' : 'text-green-600'}`}>{summaryData.exactHits.join(', ')}</p>
                    </div>
                  </div>
              )}

              {summaryData.specialHits.length > 0 && (
                  <div className={`p-4 rounded-2xl border flex items-center ${darkMode ? 'bg-yellow-900/20 border-yellow-900/40' : 'bg-yellow-50 border-yellow-100'}`}>
                    <i className={`fas fa-glass-cheers text-2xl mr-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}></i>
                    <div>
                        <p className="text-xs font-bold opacity-60 uppercase tracking-wider">Schnapszahl! (+1 Schnaps)</p>
                        <p className={`text-lg font-black ${darkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>
                          {summaryData.specialHits.map((hit: any) => `${hit.playerName} (${hit.value}g)`).join(', ')}
                        </p>
                    </div>
                  </div>
              )}

              {summaryData.duplicates.length > 0 && (
                  <div className={`p-4 rounded-2xl border flex items-center ${darkMode ? 'bg-blue-900/20 border-blue-900/40' : 'bg-blue-50 border-blue-100'}`}>
                    <i className={`fas fa-clone text-2xl mr-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}></i>
                    <div>
                        <p className="text-xs font-bold opacity-60 uppercase tracking-wider">Gleiches Gewicht! (+1 Schnaps)</p>
                        <p className={`text-lg font-black ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                          {summaryData.duplicates.map((d: any) => `${d.playerNames.join(' & ')} (${d.weight}g)`).join(', ')}
                        </p>
                    </div>
                  </div>
              )}
            </div>
            <button onClick={proceedFromSummary} className="w-full mt-8 bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-700 transition-all text-xl">Weiter</button>
          </div>
        </div>
      )}

      {showFinalIntro && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`rounded-3xl p-8 max-sm w-full shadow-2xl border animate-in zoom-in duration-500 text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
             <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/50">
                <i className="fas fa-flag-checkered text-3xl text-white"></i>
             </div>
             <h3 className="text-2xl font-black mb-4 uppercase">Letzte Runde!</h3>
             <p className="opacity-80 mb-8">Ein Spieler hat die 75g-Marke unterschritten. Das Finale beginnt!</p>
             <button onClick={startLastRound} className="w-full bg-red-600 text-white font-bold py-4 rounded-xl shadow-lg">Finale starten</button>
          </div>
        </div>
      )}

      {showComingSoonModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`rounded-3xl p-8 max-sm w-full shadow-2xl border animate-in zoom-in duration-300 text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h3 className="text-xl font-bold mb-4">In Arbeit</h3>
            <p className="opacity-70 mb-8">Dieser Modus kommt in der nächsten Version der Bundesliga!</p>
            <button onClick={() => setShowComingSoonModal(false)} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg">Verstanden</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;