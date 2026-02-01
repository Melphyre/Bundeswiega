
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GameState, Player, Round } from './types';
import { calculateAverageDistance, getRoundSummary, getTargetRange } from './utils';

/**
 * 1. BUNDESWIEGA - Das ultimative Wiegen-Spiel
 */

declare const html2canvas: any;

const LOGO_URL = "https://github.com/Melphyre/Bundeswiega/blob/main/Bundeswiega.png?raw=true";
const INSTAGRAM_URL = "https://www.instagram.com/bundeswiega/";

const BRAND_COLOR = "#238183";
const GOLD_COLOR = "#D4AF37";
const DARK_GRAY = "#374151";

const PLAYER_COLORS = [
  '#238183', '#6366f1', '#f43f5e', '#f59e0b', '#06b6d4', 
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#3b82f6'
];

const VerticalText: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex flex-col items-center justify-center leading-[0.9] py-1 font-black text-[10px] md:text-xs select-none">
    {text.split('').map((char, i) => (
      <span key={i} className="block">{char === ' ' ? '\u00A0' : char}</span>
    ))}
  </div>
);

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [playerCount, setPlayerCount] = useState(2);
  const [isShortMode, setIsShortMode] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRoundResults, setCurrentRoundResults] = useState<Record<string, string>>({});
  const [currentRoundTargets, setCurrentRoundTargets] = useState<Record<string, string>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [showFinalIntro, setShowFinalIntro] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showModeInfo, setShowModeInfo] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [showAutoTargetModal, setShowAutoTargetModal] = useState<{ diff: number, target: number, reason: string } | null>(null);
  const [startWeightError, setStartWeightError] = useState<string | null>(null);
  const [targetWeightError, setTargetWeightError] = useState<{ message: string, correction: number } | null>(null);
  const [disqualifiedNotice, setDisqualifiedNotice] = useState<Array<{name: string, diff: number, reason: string}> | null>(null);
  const [finalTriggered, setFinalTriggered] = useState(false);
  const [triggeringPlayers, setTriggeringPlayers] = useState<Array<{name: string, weight: number, limit: number}>>([]);
  const [nextTargetInput, setNextTargetInput] = useState('');
  const [summaryData, setSummaryData] = useState<any>(null);
  const [tempWeights, setTempWeights] = useState<string[]>([]);
  
  const rankingAreaRef = useRef<HTMLDivElement>(null);
  const roundsAreaRef = useRef<HTMLDivElement>(null);
  const statsAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (gameState !== GameState.START && gameState !== GameState.RESULT_SCREEN) {
        e.preventDefault();
        e.returnValue = 'Daten gehen verloren.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameState]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.body.className = darkMode ? 'bg-gray-900 text-white transition-colors duration-300' : 'bg-white text-gray-900 transition-colors duration-300';
  }, [darkMode]);

  const captureElement = async (ref: React.RefObject<HTMLDivElement>, filename: string) => {
    if (!ref.current) return;
    try {
      const canvas = await html2canvas(ref.current, {
        backgroundColor: darkMode ? '#111827' : '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false
      });
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error("Capture failed", err);
      alert("Screenshot konnte nicht erstellt werden.");
    }
  };

  const startGame = () => {
    setGameState(GameState.PLAYER_COUNT);
    setRounds([]);
    setPlayers([]);
    setFinalTriggered(false);
    setTriggeringPlayers([]);
    setSummaryData(null);
    setIsShortMode(false);
    setTempWeights([]);
  };

  const resetToStart = () => {
    setGameState(GameState.START);
    setRounds([]);
    setPlayers([]);
    setShowResetConfirm(false);
  };

  const handlePlayerCountConfirm = () => {
    const initialPlayers = Array.from({ length: playerCount }, (_, i) => ({
      id: `p${i}`,
      name: '',
      startWeight: 0,
      schnaepse: 0,
      isDisqualified: false
    }));
    setPlayers(initialPlayers);
    setGameState(GameState.PLAYER_NAMES);
  };

  const handlePlayerNamesConfirm = (names: string[]) => {
    const updatedPlayers = players.map((p, i) => ({ ...p, name: names[i].trim() || `Spieler ${i + 1}` }));
    setPlayers(updatedPlayers);
    setTempWeights(new Array(updatedPlayers.length).fill(''));
    setGameState(GameState.START_WEIGHTS);
  };

  const onWeightsSubmit = () => {
    const limit = isShortMode ? 333 : 500;
    const numericWeights = tempWeights.map(w => parseInt(w));
    
    for (let i = 0; i < numericWeights.length; i++) {
        const w = numericWeights[i];
        if (isNaN(w) || w <= 0) {
            alert("Bitte für alle Spieler ein gültiges Startgewicht (g) eingeben.");
            return;
        }
        if (w < limit) {
            setStartWeightError(`Das eingegebene Startgewicht bei "${players[i].name}" ist mit ${w}g zu niedrig (Minimum: ${limit}g).`);
            return;
        }
    }
    const updatedPlayers = players.map((p, i) => ({ ...p, startWeight: numericWeights[i] }));
    setPlayers(updatedPlayers);
    setGameState(GameState.ROUND_TARGET);
  };

  const handleTargetWeightConfirm = (customTarget?: number) => {
    const target = (typeof customTarget === 'number') ? customTarget : parseInt(nextTargetInput);
    const activePlayers = players.filter(p => !p.isDisqualified);
    const prevResults = rounds.length === 0 
      ? activePlayers.map(p => p.startWeight) 
      : activePlayers.map(p => rounds[rounds.length - 1].results[p.id]);
    
    const range = getTargetRange(prevResults);
    
    if (typeof customTarget !== 'number') {
        if (isNaN(target) || target < range.min || target > range.max) {
            let reason = "";
            let correction = target;
            const currentMin = Math.min(...prevResults);
            const currentMax = Math.max(...prevResults);

            if (target >= currentMin) {
                reason = `Das Zielgewicht von ${target}g ist zu hoch. Es muss mindestens 1g unter dem aktuell niedrigsten Füllstand (${currentMin}g) liegen.`;
                correction = currentMin - 1;
            } else if (target < currentMax - 100) {
                reason = `Das Zielgewicht von ${target}g ist zu niedrig. Es darf maximal 100g unter dem aktuell höchsten Füllstand (${currentMax}g) liegen.`;
                correction = currentMax - 100;
            } else {
                reason = "Das Zielgewicht liegt außerhalb des gültigen Bereichs.";
                correction = Math.round(range.max);
            }
            setTargetWeightError({ message: reason, correction });
            return;
        }
    }

    setRounds([...rounds, { targetWeight: target, results: {} }]);
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
    activePlayers.forEach(p => { currentRound.results[p.id] = parseInt(currentRoundResults[p.id]); });

    const summary = getRoundSummary(currentRound, players);
    const newlyDisqualified: Array<{name: string, diff: number, reason: string}> = [];

    const updatedPlayers = players.map(p => {
      if (p.isDisqualified) return p;
      const weight = currentRound.results[p.id];
      const dist = Math.abs(weight - currentRound.targetWeight);
      let isDisqualified = p.isDisqualified;
      if (dist > 50) {
        isDisqualified = true;
        newlyDisqualified.push({ 
          name: p.name, 
          diff: dist, 
          reason: `Die Abweichung zum Zielgewicht (${currentRound.targetWeight}g) beträgt ${dist}g und liegt damit über dem Limit von 50g.`
        });
      }
      let schnaepse = p.schnaepse + (summary.pointsToAward.includes(p.id) ? 1 : 0);
      return { ...p, schnaepse, isDisqualified };
    });

    const minStartWeight = Math.min(...players.map(p => p.startWeight));
    const triggerThreshold = isShortMode ? 278 : 445;
    const finalLimit = minStartWeight - triggerThreshold;
    
    const triggers: Array<{name: string, weight: number, limit: number}> = [];
    activePlayers.forEach(p => {
        const currentWeight = parseInt(currentRoundResults[p.id]);
        if (currentWeight < finalLimit) {
            triggers.push({ name: p.name, weight: currentWeight, limit: finalLimit });
        }
    });

    if (triggers.length > 0) {
        setFinalTriggered(true);
        setTriggeringPlayers(triggers);
        setShowAutoTargetModal(null);
    } else {
        setFinalTriggered(false);
        setTriggeringPlayers([]);
        
        const remainingActive = updatedPlayers.filter(up => !up.isDisqualified);
        const remainingWeights = remainingActive.map(p => currentRound.results[p.id]);
        const range = getTargetRange(remainingWeights);
        
        if (range.max < range.min && remainingActive.length > 0) {
            const minCurrent = Math.min(...remainingWeights);
            setShowAutoTargetModal({
                diff: 0,
                target: minCurrent - 10,
                reason: "Durch die unterschiedlichen Füllstände ist kein regulärer Zielbereich möglich. Das Ziel wurde automatisch angepasst."
            });
        } else {
            setShowAutoTargetModal(null);
        }
    }

    setPlayers(updatedPlayers);
    setSummaryData(summary);
    setRounds(updatedRounds);
    setDisqualifiedNotice(newlyDisqualified.length > 0 ? newlyDisqualified : null);
    setShowSummary(true);
  };

  const handleModalSequence = () => {
    if (showSummary) {
      setShowSummary(false);
      const lastRound = rounds[rounds.length - 1];
      if (lastRound && lastRound.isFinal) {
        setGameState(GameState.RESULT_SCREEN);
        return;
      }
      if (disqualifiedNotice) return;
      triggerNextStep();
    } 
    else if (disqualifiedNotice) {
      setDisqualifiedNotice(null);
      const lastRound = rounds[rounds.length - 1];
      if (lastRound && lastRound.isFinal) {
        setGameState(GameState.RESULT_SCREEN);
        return;
      }
      triggerNextStep();
    }
  };

  const triggerNextStep = () => {
    if (showAutoTargetModal) return;
    if (finalTriggered) {
      setShowFinalIntro(true);
      return;
    }
    if (players.every(p => p.isDisqualified)) {
      setGameState(GameState.RESULT_SCREEN);
    } else {
      setGameState(GameState.ROUND_TARGET);
    }
  };

  const handleFinalTargetsConfirm = () => {
    const activePlayers = players.filter(p => !p.isDisqualified);
    const allFilled = activePlayers.every(p => currentRoundTargets[p.id] && !isNaN(parseInt(currentRoundTargets[p.id])));
    if (!allFilled) {
      alert("Jeder Spieler muss ein geschätztes Leergewicht angeben.");
      return;
    }
    const indTargets: Record<string, number> = {};
    activePlayers.forEach(p => {
      indTargets[p.id] = parseInt(currentRoundTargets[p.id]);
    });
    setRounds([...rounds, { targetWeight: 0, individualTargets: indTargets, results: {}, isFinal: true }]);
    setCurrentRoundResults({});
    setGameState(GameState.FINAL_ROUND_RESULTS);
  };

  const handleFinalResultsConfirm = () => {
    const activePlayers = players.filter(p => !p.isDisqualified);
    const allFilled = activePlayers.every(p => currentRoundResults[p.id] && !isNaN(parseInt(currentRoundResults[p.id])));
    if (!allFilled) { alert("Bitte alle Leergewichte eintragen."); return; }
    const updatedRounds = [...rounds];
    const lastRound = updatedRounds[updatedRounds.length - 1];
    activePlayers.forEach(p => { lastRound.results[p.id] = parseInt(currentRoundResults[p.id]); });
    const summary = getRoundSummary(lastRound, players);
    const newlyDisqualified: Array<{name: string, diff: number, reason: string}> = [];
    const updatedPlayers = players.map(p => {
      if (p.isDisqualified) return p;
      const weight = lastRound.results[p.id];
      const target = lastRound.individualTargets![p.id];
      const dist = Math.abs(weight - target);
      let isDisqualified = p.isDisqualified;
      if (dist > 50) { 
        isDisqualified = true; 
        newlyDisqualified.push({ 
          name: p.name, 
          diff: dist,
          reason: `Im Finale beträgt die Abweichung zu deinem geschätzten Leergewicht (${target}g) stolze ${dist}g. Damit bist du leider disqualifiziert.`
        }); 
      }
      let schnaepse = p.schnaepse + (summary.pointsToAward.includes(p.id) ? 1 : 0);
      return { ...p, schnaepse, isDisqualified };
    });
    setPlayers(updatedPlayers);
    setRounds(updatedRounds);
    setSummaryData(summary);
    setDisqualifiedNotice(newlyDisqualified.length > 0 ? newlyDisqualified : null);
    setShowSummary(true);
  };

  const startFinalSequence = () => {
    setShowFinalIntro(false);
    setCurrentRoundTargets({});
    setGameState(GameState.FINAL_ROUND_TARGETS);
  };

  const downloadCSV = () => {
    const ranking = players.map(p => {
      const avgDist = calculateAverageDistance(p.id, rounds);
      return { ...p, avgDist, total: avgDist + p.schnaepse };
    }).sort((a, b) => {
      if (a.isDisqualified && !b.isDisqualified) return 1;
      if (!a.isDisqualified && b.isDisqualified) return -1;
      return a.total - b.total;
    });
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "RANGLISTE\nPlatz;Spieler;Durchschnittlicher Abstand;Schnaepse;Gesamtpunktzahl;Status\n";
    ranking.forEach((p, idx) => {
      csvContent += `${idx + 1};${p.name};${p.avgDist.toFixed(2)};${p.schnaepse};${p.total.toFixed(2)};${p.isDisqualified ? 'Disqualifiziert' : 'Aktiv'}\n`;
    });
    csvContent += "\n\nRUNDENVERLAUF\nRunde;Zielgewicht;";
    players.forEach(p => { csvContent += `${p.name};`; });
    csvContent += "\n";
    rounds.forEach((r, rIdx) => {
      const target = r.isFinal ? "Leerwiegen" : `${r.targetWeight}g`;
      csvContent += `${rIdx + 1};${target};`;
      players.forEach(p => { csvContent += `${r.results[p.id] || "—"};`; });
      csvContent += "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bundeswiega_Ergebnis_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const graphMax = useMemo(() => {
    let maxDist = 0;
    rounds.forEach(r => {
        players.forEach(p => {
            const res = r.results[p.id];
            const target = r.isFinal ? r.individualTargets?.[p.id] : r.targetWeight;
            if (res !== undefined && target !== undefined) maxDist = Math.max(maxDist, Math.abs(res - target));
        });
    });
    return Math.max(10, Math.ceil(maxDist / 10) * 10);
  }, [rounds, players]);

  const showModeFooter = gameState !== GameState.START && gameState !== GameState.PLAYER_COUNT;

  return (
    <div className={`min-h-screen flex flex-col p-4 md:p-8 transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <header className="flex justify-between items-center mb-8 max-w-6xl mx-auto w-full">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => gameState !== GameState.START && setShowResetConfirm(true)}>
          <img src={LOGO_URL} alt="Logo" className="w-10 h-10 object-contain" />
          <h1 className="text-2xl font-black tracking-tighter hidden sm:block" style={{ color: darkMode ? '#ffffff' : BRAND_COLOR }}>1. Bundeswiega</h1>
        </div>
        <div className="flex space-x-2">
          <button onClick={() => setDarkMode(!darkMode)} className={`p-3 rounded-full shadow-md border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
            <i className={`fas ${darkMode ? 'fa-sun text-yellow-400' : 'fa-moon text-indigo-600'} text-xl`}></i>
          </button>
          {gameState !== GameState.START && (
            <button onClick={() => setShowResetConfirm(true)} className={`p-3 rounded-full shadow-md border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
              <i className="fas fa-arrow-left text-red-500 text-xl"></i>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center max-w-4xl w-full mx-auto relative">
        {gameState === GameState.START && (
          <div className="text-center animate-in fade-in duration-700 max-w-2xl w-full">
            <div className="mb-6 flex justify-center">
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="block transition-transform hover:scale-105 active:scale-95">
                <img src={LOGO_URL} alt="1. Bundeswiega Logo" className="w-56 h-56 md:w-64 md:h-64 object-contain drop-shadow-2xl" />
              </a>
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-12 tracking-tighter uppercase text-center" style={{ color: BRAND_COLOR }}>1. Bundeswiega</h1>
            <div className="flex flex-col space-y-4 w-full max-w-sm mx-auto">
              <button onClick={startGame} className="text-white font-bold py-5 px-10 rounded-3xl shadow-xl transform active:scale-95 transition-all text-xl w-full flex items-center justify-center space-x-3" style={{ backgroundColor: BRAND_COLOR }}>
                <i className="fas fa-play"></i>
                <span>Spiel starten</span>
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowComingSoon(true)} className="text-white font-bold py-4 rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center" style={{ backgroundColor: DARK_GRAY }}>
                  <i className="fas fa-users mr-2"></i>Teamwiegen
                </button>
                <button onClick={() => setShowComingSoon(true)} className="text-white font-bold py-4 rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center" style={{ backgroundColor: DARK_GRAY }}>
                  <i className="fas fa-bolt mr-2"></i>Speedwiegen
                </button>
              </div>
              <button onClick={() => setShowRules(true)} className="w-full text-white font-black py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center space-x-2 text-lg active:scale-95" style={{ backgroundColor: BRAND_COLOR }}>
                <i className="fas fa-book"></i><span>Regeln</span>
              </button>
            </div>
          </div>
        )}

        {gameState === GameState.PLAYER_COUNT && (
          <div className={`p-8 rounded-3xl shadow-2xl w-full max-md border animate-in slide-in-from-bottom-4 duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-2xl font-bold mb-6 text-center">Wie viele Spieler?</h2>
            <select value={playerCount} onChange={(e) => setPlayerCount(parseInt(e.target.value))} className={`w-full p-4 border-2 rounded-xl mb-6 text-lg focus:outline-none transition-colors ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`} style={{ borderColor: BRAND_COLOR }}>
              {Array.from({ length: 9 }, (_, i) => i + 2).map(n => <option key={n} value={n}>{n} Spieler</option>)}
            </select>
            <div className="flex items-center justify-between mb-8 ml-1 pr-1">
                <div className="flex items-center space-x-3">
                  <div className="relative inline-block w-10 h-6">
                    <input type="checkbox" id="shortModeToggle" checked={isShortMode} onChange={() => setIsShortMode(!isShortMode)} className="opacity-0 w-0 h-0" />
                    <label htmlFor="shortModeToggle" className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors duration-200 ${isShortMode ? '' : 'bg-gray-400'}`} style={{ backgroundColor: isShortMode ? BRAND_COLOR : undefined }}>
                      <span className={`absolute left-1 bottom-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${isShortMode ? 'translate-x-4' : 'translate-x-0'}`}></span>
                    </label>
                  </div>
                  <label htmlFor="shortModeToggle" className="text-sm font-bold opacity-80 cursor-pointer">0,33 L Modus</label>
                  <button onClick={() => setShowModeInfo(true)} className="flex items-center justify-center w-6 h-6 rounded-full border border-gray-500 text-gray-500 text-sm font-bold hover:bg-gray-500/10 transition-colors">
                    <i className="fas fa-question"></i>
                  </button>
                </div>
            </div>
            <button onClick={handlePlayerCountConfirm} className="w-full text-white font-bold py-4 rounded-xl shadow-lg transition-colors active:scale-95" style={{ backgroundColor: BRAND_COLOR }}>Weiter</button>
          </div>
        )}

        {gameState === GameState.PLAYER_NAMES && (
          <div className={`p-8 rounded-3xl shadow-2xl w-full max-w-xl border animate-in slide-in-from-bottom-4 duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-2xl font-bold mb-6 text-center">Namen eingeben</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {players.map((p, i) => (
                <div key={p.id}>
                  <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest block mb-1">Spieler {i + 1}</label>
                  <input type="text" placeholder={`Name Spieler ${i+1}`} value={p.name} autoFocus={i === 0} className={`w-full p-3 border-2 rounded-xl focus:outline-none transition-colors ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`} style={{ borderColor: players[i].name ? BRAND_COLOR : '' }} onChange={(e) => {
                      const newPlayers = [...players];
                      newPlayers[i].name = e.target.value;
                      setPlayers(newPlayers);
                    }} />
                </div>
              ))}
            </div>
            <button onClick={() => handlePlayerNamesConfirm(players.map(p => p.name))} className="w-full text-white font-bold py-4 rounded-xl shadow-lg transition-colors active:scale-95" style={{ backgroundColor: BRAND_COLOR }}>Startgewichte festlegen</button>
          </div>
        )}

        {gameState === GameState.START_WEIGHTS && (
          <div className={`p-8 rounded-3xl shadow-2xl w-full max-w-xl border animate-in slide-in-from-bottom-4 duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-2xl font-bold mb-2 text-center">Startgewichte</h2>
            <p className="text-sm opacity-60 mb-6 text-center italic">Wiege dein Gefäß und trage das Gewicht ein</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {players.map((p, i) => (
                <div key={p.id}>
                  <label className="text-xs font-bold mb-1 block uppercase opacity-70 tracking-tighter text-left">{p.name}</label>
                  <div className="relative">
                    <input type="number" placeholder="Startgewicht" value={tempWeights[i]} className={`w-full p-3 border-2 rounded-xl focus:outline-none transition-colors ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`} style={{ borderColor: tempWeights[i] ? BRAND_COLOR : '' }} onChange={(e) => { const nextWeights = [...tempWeights]; nextWeights[i] = e.target.value; setTempWeights(nextWeights); }} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30 text-xs font-bold">g</span>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={onWeightsSubmit} className="w-full text-white font-bold py-4 rounded-xl shadow-lg transition-colors uppercase tracking-widest active:scale-95" style={{ backgroundColor: BRAND_COLOR }}>Spiel starten</button>
          </div>
        )}

        {gameState === GameState.ROUND_TARGET && (
          <div className={`p-8 rounded-3xl shadow-2xl w-full max-md border animate-in zoom-in duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-2xl font-black mb-4 text-center uppercase tracking-tighter">Runde {rounds.length + 1}</h2>
            <div className="mb-6">
              <p className="text-[10px] font-bold uppercase opacity-50 mb-3 text-center tracking-widest">Aktuelle Füllstände</p>
              <div className="grid grid-cols-2 gap-2">
                {players.map(p => {
                  const currentW = rounds.length === 0 ? p.startWeight : rounds[rounds.length - 1].results[p.id];
                  return (
                    <div key={p.id} className={`p-3 rounded-xl border flex flex-col items-center justify-center ${p.isDisqualified ? 'opacity-40 grayscale' : ''} ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                      <span className="text-[10px] font-bold opacity-60 uppercase truncate w-full text-center mb-1">{p.name}</span>
                      <span className="text-lg font-black">{p.isDisqualified ? '❌' : `${currentW}g`}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="text-center mt-4">
              {(() => {
                  const activePlayers = players.filter(p => !p.isDisqualified);
                  const prevResults = rounds.length === 0 ? activePlayers.map(p => p.startWeight) : activePlayers.map(p => rounds[rounds.length - 1].results[p.id]);
                  const range = getTargetRange(prevResults);
                  return (
                      <>
                      <p className="text-sm opacity-70 mb-6 text-center">Zielgewicht festlegen: <br/><span className="font-bold" style={{ color: BRAND_COLOR }}>{Math.round(range.min)}g - {Math.round(range.max)}g</span></p>
                      <input type="number" autoFocus value={nextTargetInput} onChange={(e) => setNextTargetInput(e.target.value)} placeholder="Ziel (g)" className={`w-full p-4 border-2 rounded-xl mb-6 text-3xl text-center font-black focus:outline-none transition-colors ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`} style={{ borderColor: BRAND_COLOR }} />
                      </>
                  );
              })()}
              <button onClick={() => handleTargetWeightConfirm()} className="w-full text-white font-bold py-5 rounded-2xl shadow-xl transition-all text-xl uppercase active:scale-95" style={{ backgroundColor: BRAND_COLOR }}>Bestätigen</button>
            </div>
          </div>
        )}

        {(gameState === GameState.GAMEPLAY || gameState === GameState.FINAL_ROUND_RESULTS) && (
          <div className="w-full flex flex-col space-y-6 animate-in fade-in duration-500">
            <div id="gameplay-table-capture" className={`rounded-3xl shadow-xl overflow-hidden border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}>
                      <th className="p-4 border-b border-gray-700 font-bold text-center text-xs opacity-50">RND</th>
                      {players.map(p => (
                        <th key={p.id} className="p-2 border-b border-gray-700 font-bold text-center">
                          <VerticalText text={p.name} />
                        </th>
                      ))}
                      <th className={`p-4 border-b border-gray-700 font-bold text-center text-xs ${darkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>ZIEL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rounds.map((r, rIdx) => {
                        if (r.isFinal && gameState === GameState.FINAL_ROUND_RESULTS) return null;
                        const targetValue = r.isFinal ? 'EX!' : `${r.targetWeight}g`;
                        return (
                      <tr key={rIdx} className={`hover:bg-opacity-50 border-b border-gray-800 transition-colors ${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                        <td className="p-4 font-semibold opacity-50 text-center text-xs">#{rIdx + 1}</td>
                        {players.map(p => {
                          const val = r.results[p.id];
                          const target = (r.isFinal && r.individualTargets) ? r.individualTargets[p.id] : r.targetWeight;
                          const dist = val !== undefined && typeof target === 'number' ? Math.abs(val - target) : null;
                          return (
                            <td key={p.id} className="p-2 text-center align-middle">
                              {val !== undefined ? (
                                <>
                                  <div className="font-semibold text-xs md:text-sm">{val}g</div>
                                  {dist !== null && dist > 0 && <div className={`text-[9px] font-bold ${dist > 50 ? 'text-red-600 uppercase' : 'opacity-60'}`}>{dist > 50 ? 'D' : `+${dist}`}</div>}
                                  {dist === 0 && <div className="text-[9px] font-bold" style={{ color: BRAND_COLOR }}>🎯</div>}
                                </>
                              ) : ( <div className="text-xs opacity-30">{p.isDisqualified ? '❌' : '—'}</div> )}
                            </td>
                          );
                        })}
                        <td className={`p-4 text-center font-bold text-xs md:text-sm ${darkMode ? 'text-yellow-400 bg-yellow-900/10' : 'text-blue-600 bg-yellow-50/50'}`}>{targetValue}</td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            </div>
            <div className={`p-6 rounded-3xl border shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <h3 className="font-bold mb-4 text-center uppercase text-sm tracking-widest opacity-60">
                  {gameState === GameState.FINAL_ROUND_RESULTS ? 'Leergewicht (g)' : 'Wiege-Ergebnisse (g)'}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    {players.filter(p => !p.isDisqualified).map(p => (
                        <div key={p.id}>
                            <label className="text-[10px] font-bold opacity-60 mb-1 block uppercase text-left">{p.name}</label>
                            <input type="number" placeholder="g" value={currentRoundResults[p.id] || ''} onChange={(e) => setCurrentRoundResults({...currentRoundResults, [p.id]: e.target.value})} className={`w-full p-2 border-2 rounded-lg focus:outline-none transition-colors text-sm font-bold ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`} style={{ borderColor: currentRoundResults[p.id] ? BRAND_COLOR : '' }} />
                        </div>
                    ))}
                </div>
                <button onClick={gameState === GameState.GAMEPLAY ? handleNextRound : handleFinalResultsConfirm} className="w-full text-white font-black py-4 rounded-2xl shadow-xl transition-all uppercase tracking-widest active:scale-95" style={{ backgroundColor: BRAND_COLOR }}>Runde auswerten</button>
            </div>
          </div>
        )}

        {gameState === GameState.FINAL_ROUND_TARGETS && (
          <div className={`p-8 rounded-3xl shadow-2xl w-full max-w-xl border animate-in slide-in-from-bottom-4 duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-2xl font-black mb-4 text-center uppercase tracking-tighter">Schätzung Leergewicht</h2>
            <p className="text-sm opacity-60 mb-8 text-center italic">Gib an, wie viel dein Gefäß im leeren Zustand wiegt (dein Ziel für das Finale).</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {players.filter(p => !p.isDisqualified).map((p) => (
                <div key={p.id}>
                  <label className="text-xs font-bold mb-1 block uppercase opacity-70 tracking-tighter text-left">{p.name}</label>
                  <div className="relative">
                    <input type="number" placeholder="Zielgewicht" value={currentRoundTargets[p.id] || ''} className={`w-full p-3 border-2 rounded-xl focus:outline-none transition-colors ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`} style={{ borderColor: currentRoundTargets[p.id] ? BRAND_COLOR : '' }} onChange={(e) => setCurrentRoundTargets({...currentRoundTargets, [p.id]: e.target.value})} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30 text-xs font-bold">g</span>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleFinalTargetsConfirm} className="w-full text-white font-black py-5 rounded-2xl shadow-xl transition-all text-xl uppercase tracking-widest active:scale-95" style={{ backgroundColor: GOLD_COLOR }}>Ziele speichern</button>
          </div>
        )}

        {gameState === GameState.RESULT_SCREEN && (
          <div className="w-full flex flex-col space-y-8 animate-in fade-in duration-500 max-h-screen overflow-y-auto px-1 pb-20 text-center text-gray-900 dark:text-white">
            <h2 className="text-3xl font-black uppercase tracking-tighter mx-auto mb-2" style={{ color: BRAND_COLOR }}>🏆 Gesamtergebnis</h2>
            
            <div ref={rankingAreaRef} className={`p-4 md:p-6 rounded-3xl border shadow-lg ${darkMode ? 'bg-slate-900 border-gray-800' : 'bg-white border-gray-100'}`}>
              <div className={`rounded-2xl overflow-hidden border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-50'}`}>
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className={darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}>
                        <th className="p-3 font-bold opacity-50">#</th>
                        <th className="p-3 font-bold">SPIELER</th>
                        <th className="p-3 font-bold text-center">∅ ABST.</th>
                        <th className="p-3 font-bold text-center">S.</th>
                        <th className="p-3 font-bold text-center" style={{ backgroundColor: BRAND_COLOR + '1A' }}>TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map(p => {
                          const avgDist = calculateAverageDistance(p.id, rounds);
                          return { ...p, avgDist, total: avgDist + p.schnaepse };
                        }).sort((a, b) => {
                          if (a.isDisqualified && !b.isDisqualified) return 1;
                          if (!a.isDisqualified && b.isDisqualified) return -1;
                          return a.total - b.total;
                        }).map((p, idx) => (
                          <tr key={p.id} className={`border-b ${darkMode ? 'border-gray-800' : 'border-gray-50'} ${idx === 0 && !p.isDisqualified ? 'bg-yellow-500/10 font-bold' : ''} ${p.isDisqualified ? 'bg-red-500/5' : ''}`}>
                            <td className="p-3 text-lg">{p.isDisqualified ? '💀' : (idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`)}</td>
                            <td className={`p-3 font-black ${p.isDisqualified ? 'line-through text-red-500 opacity-60' : ''}`}>{p.name}</td>
                            <td className="p-3 text-center">{p.isDisqualified ? '—' : `${p.avgDist.toFixed(2)}g`}</td>
                            <td className="p-3 text-center font-bold">{p.schnaepse}</td>
                            <td className="p-3 text-center font-black" style={{ color: BRAND_COLOR, backgroundColor: BRAND_COLOR + '0D' }}>{p.isDisqualified ? '—' : p.total.toFixed(2)}</td>
                          </tr>
                        ))}
                    </tbody>
                </table>
              </div>
            </div>

            <div ref={roundsAreaRef} className={`p-4 md:p-6 rounded-3xl border shadow-lg ${darkMode ? 'bg-slate-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                <h4 className="font-bold uppercase text-xs mb-4 opacity-50 text-left">Rundenverlauf</h4>
                <div className={`rounded-2xl overflow-hidden border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-50'}`}>
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className={darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}>
                        <th className="p-3 font-bold opacity-50 border-r border-gray-700/30 text-center">Rnd</th>
                        {players.map(p => <th key={p.id} className="p-2 font-bold text-center">{p.name}</th>)}
                        <th className="p-3 font-bold text-center border-l border-gray-700/30">Ziel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rounds.map((r, i) => (
                        <tr key={i} className={`border-b ${darkMode ? 'border-gray-700/30' : 'border-gray-50'}`}>
                          <td className="p-3 border-r border-gray-700/30 text-center font-semibold opacity-50">{i + 1}</td>
                          {players.map(p => <td key={p.id} className="p-2 text-center">{r.results[p.id] !== undefined ? `${r.results[p.id]}g` : '❌'}</td>)}
                          <td className="p-3 text-center font-bold border-l border-gray-700/30" style={{ color: BRAND_COLOR }}>{r.isFinal ? 'Finale' : `${r.targetWeight}g`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            <div className="flex flex-col space-y-3 pt-4 px-3">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowStats(true)} className="text-white font-black py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-2 active:scale-95" style={{ backgroundColor: BRAND_COLOR }}>
                  <i className="fas fa-chart-line"></i><span>Statistik</span>
                </button>
                <button onClick={downloadCSV} className="text-white font-black py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-2 active:scale-95" style={{ backgroundColor: '#059669' }}>
                  <i className="fas fa-file-csv"></i><span>CSV erstellen</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => captureElement(rankingAreaRef, 'Bundeswiega_Ranking')} className="text-white font-black py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center space-x-2 active:scale-95" style={{ backgroundColor: DARK_GRAY }}>
                  <i className="fas fa-camera"></i><span className="text-xs">Screenshot Ranking</span>
                </button>
                <button onClick={() => captureElement(roundsAreaRef, 'Bundeswiega_Tabelle')} className="text-white font-black py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center space-x-2 active:scale-95" style={{ backgroundColor: DARK_GRAY }}>
                  <i className="fas fa-camera"></i><span className="text-xs">Screenshot Tabelle</span>
                </button>
              </div>
              <button onClick={() => setShowResetConfirm(true)} className="w-full font-black py-4 rounded-2xl shadow-lg border bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-red-500 transition-all border-gray-200 dark:border-gray-700 active:scale-95">Hauptmenü</button>
            </div>
          </div>
        )}
      </main>

      {/* --- MODALS --- */}
      
      {showSummary && summaryData && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className={`rounded-3xl p-8 max-w-lg w-full shadow-2xl border animate-in slide-in-from-bottom duration-300 overflow-y-auto max-h-[90vh] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
            <h3 className="text-3xl font-black mb-8 text-center uppercase tracking-tighter" style={{ color: BRAND_COLOR }}>Rundenauswertung</h3>
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border flex items-center ${darkMode ? 'bg-red-900/20 border-red-900/40' : 'bg-red-50 border-red-200'}`}>
                <i className="fas fa-skull text-xl text-red-500 mr-4"></i>
                <div className="flex-1">
                  <p className="text-[10px] font-bold opacity-60 uppercase">Größter Abstand (+1 Schnaps)</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white">{summaryData.furthestPlayers.join(' & ')}</p>
                </div>
              </div>
              {summaryData.exactHits.length > 0 && (
                <div className={`p-4 rounded-2xl border flex items-center ${darkMode ? 'bg-emerald-900/20 border-emerald-900/40' : 'bg-emerald-50 border-emerald-200'}`}>
                  <i className="fas fa-bullseye text-xl text-emerald-500 mr-4"></i>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold opacity-60 uppercase">Volltreffer! (+1 Schnaps)</p>
                    <p className="text-lg font-black text-gray-900 dark:text-white">{summaryData.exactHits.join(', ')}</p>
                  </div>
                </div>
              )}
              {!summaryData.isFinal && summaryData.duplicates.length > 0 && (
                <div className={`p-4 rounded-2xl border flex items-center ${darkMode ? 'bg-blue-900/20 border-blue-900/40' : 'bg-blue-50 border-blue-200'}`}>
                  <i className="fas fa-users-rays text-xl text-blue-500 mr-4"></i>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold opacity-60 uppercase">Wiegezwillinge! (+1 Schnaps)</p>
                    <div className="space-y-1">
                      {summaryData.duplicates.map((d: any, i: number) => (
                        <p key={i} className="text-lg font-black text-gray-900 dark:text-white">{d.playerNames.join(' & ')} ({d.weight}g)</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {!summaryData.isFinal && summaryData.specialHits.length > 0 && (
                <div className={`p-4 rounded-2xl border flex items-center ${darkMode ? 'bg-amber-900/20 border-amber-900/40' : 'bg-amber-50 border-amber-200'}`}>
                  <i className="fas fa-star text-xl text-amber-500 mr-4"></i>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold opacity-60 uppercase">Schnapszahl! (+1 Schnaps)</p>
                    <p className="text-lg font-black text-gray-900 dark:text-white">{summaryData.specialHits.map((s: any) => `${s.playerName} (${s.value}g)`).join(', ')}</p>
                  </div>
                </div>
              )}
            </div>
            <button onClick={handleModalSequence} className="w-full mt-10 text-white font-black py-5 rounded-2xl shadow-xl transition-all text-xl uppercase active:scale-95" style={{ backgroundColor: BRAND_COLOR }}>Weiter</button>
          </div>
        </div>
      )}

      {disqualifiedNotice && !showSummary && (
        <div className="fixed inset-0 z-[410] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className={`rounded-3xl p-10 max-w-sm w-full shadow-2xl border-4 border-red-600 text-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl animate-bounce">
              <i className="fas fa-user-xmark text-4xl text-white"></i>
            </div>
            <h3 className="text-3xl font-black mb-6 uppercase tracking-tighter italic text-red-600">Ausgeschieden</h3>
            <div className="space-y-4 mb-8">
              {disqualifiedNotice.map((p, i) => (
                <div key={i} className={`p-4 rounded-2xl border ${darkMode ? 'bg-red-900/10 border-red-900/30' : 'bg-red-50 border-red-100'}`}>
                  <p className="text-xl font-black uppercase text-gray-900 dark:text-white mb-1">{p.name}</p>
                  <p className="text-xs opacity-80 leading-tight">{p.reason}</p>
                </div>
              ))}
            </div>
            <button onClick={handleModalSequence} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-lg uppercase transition-transform active:scale-95">Bestätigen</button>
          </div>
        </div>
      )}

      {showAutoTargetModal && !showSummary && !disqualifiedNotice && !finalTriggered && (
        <div className="fixed inset-0 z-[430] flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg">
          <div className={`rounded-3xl p-8 max-md w-full shadow-2xl border-2 border-emerald-500 animate-in zoom-in duration-300 text-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"><i className="fas fa-magic text-2xl text-white"></i></div>
            <h3 className="text-2xl font-black mb-4 uppercase text-emerald-500">Auto-Zielgewicht</h3>
            <p className="opacity-80 mb-6 leading-relaxed text-sm text-gray-900 dark:text-white">{showAutoTargetModal.reason}</p>
            <div className={`p-6 rounded-2xl mb-8 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <p className="text-[10px] font-bold uppercase opacity-50 mb-1">Festgelegtes Ziel für Runde {rounds.length + 1}</p>
                <p className="text-4xl font-black text-gray-900 dark:text-white" style={{ color: BRAND_COLOR }}>{showAutoTargetModal.target}g</p>
            </div>
            <button onClick={() => { handleTargetWeightConfirm(showAutoTargetModal.target); setShowAutoTargetModal(null); triggerNextStep(); }} className="w-full text-white font-bold py-4 rounded-xl shadow-lg hover:bg-opacity-90 transition-all uppercase active:scale-95" style={{ backgroundColor: BRAND_COLOR }}>Verstanden</button>
          </div>
        </div>
      )}

      {targetWeightError && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg">
          <div className={`rounded-3xl p-8 max-sm w-full shadow-2xl border-4 border-red-500 animate-in zoom-in duration-300 text-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"><i className="fas fa-exclamation-circle text-2xl text-white"></i></div>
            <h3 className="text-2xl font-black mb-4 uppercase text-red-500">Ungültiges Zielgewicht</h3>
            <p className="opacity-80 mb-8 leading-relaxed text-sm text-gray-900 dark:text-white">{targetWeightError.message}</p>
            <button onClick={() => { setNextTargetInput(targetWeightError.correction.toString()); setTargetWeightError(null); }} className="w-full text-white font-bold py-4 rounded-xl shadow-lg hover:bg-opacity-90 transition-all uppercase active:scale-95" style={{ backgroundColor: BRAND_COLOR }}>OK</button>
          </div>
        </div>
      )}

      {showRules && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in">
            <div className={`rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] shadow-2xl border flex flex-col ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h3 className="text-2xl font-black mb-6 text-center uppercase tracking-tighter" style={{ color: BRAND_COLOR }}>Regeln einer Runde “Wiegen”</h3>
              <div className="overflow-y-auto flex-1 pr-2 space-y-6 text-sm text-left scrollbar-thin scrollbar-thumb-gray-500 text-gray-900 dark:text-white leading-relaxed">
                <section>
                  <p><strong>Spieleranzahl:</strong> mehr als 2</p>
                  <p><strong>Alter:</strong> 18 Jahre +</p>
                </section>
                <section>
                  <h4 className="font-black uppercase text-base mb-1" style={{ color: BRAND_COLOR }}>Ziel des Spiels:</h4>
                  <p className="opacity-90">Der gemeinsame Spaß steht im Fokus. Alle Mitspielenden trinken innerhalb einer Runde “Wiegen” mindestens ein Bier und ggf. Schnäpse.</p>
                </section>
                <section>
                  <h4 className="font-black uppercase text-base mb-1" style={{ color: BRAND_COLOR }}>Punktespiel:</h4>
                  <p className="opacity-90">Beim Punktespiel wird jeder getrunkene Schnaps beim jeweiligen Spieler (w/m/d) als Minuspunkt gewertet. Anhand der gesammelten Minuspunkte wird ein Ranking erstellt.</p>
                </section>
                <section>
                  <h4 className="font-black uppercase text-base mb-1" style={{ color: BRAND_COLOR }}>Spielaufbau und Material:</h4>
                  <p className="opacity-90">Mindestens eine Küchenwaage (Präferenz: Elektronisch & geeicht, in Schritten von 1g) wird vor dem Wiegemeister (w/m/d) platziert. Bei mehr als 8 Spielenden empfiehlt sich eine zweite Waage.</p>
                  <p className="opacity-90">Ein zu teilender Schnaps (Präferenz: Pfefferminzlikör, schön billig, nicht Berliner Luft).</p>
                  <p className="opacity-90">Pro mitspielende Person ein Bier 0,5l (Präferenz: Dosenbier, kein Radler; Flaschenbier ist auch möglich). Wichtig ist, dass alle Spielenden das gleiche Gefäß mit gleicher Flüssigkeitsmenge nutzen.</p>
                </section>
                <section>
                  <h4 className="font-black uppercase text-base mb-1" style={{ color: BRAND_COLOR }}>Spielvorgang:</h4>
                  <p className="opacity-90 italic">Der Wiegemeister (w/m/d) stellt das Startgewicht aller Getränke der Spielenden fest und verkündet dieses offen.</p>
                  <div className="mt-4 space-y-4">
                    <h5 className="font-bold underline">Erste Runde</h5>
                    <p><strong>a) Ansagephase</strong></p>
                    <p className="opacity-90">Der Wiegemeister (m/m/d) verkündet das erste Zielgewicht. Das Zielgewicht muss mindestens 1g unter dem niedrigsten Startgewicht liegen und maximal 100g unter dem höchsten Startgewicht liegen.</p>
                    <p className="opacity-70 text-xs bg-black/5 p-2 rounded">Beispiel: Kevin (633g), Lisa (646g), Marvin (639g). Zielgewicht: 546g bis 632g.</p>
                    <p className="opacity-90">Liegen die Gewichte so weit auseinander, dass dies rechnerisch nicht möglich ist, so muss das Zielgewicht 1g unter dem niedrigsten Getränkegewicht angesagt werden.</p>
                    <p className="opacity-70 text-xs bg-black/5 p-2 rounded">Beispiel: Kevin (543g), Lisa (598g), Marvin (491g). Neues Zielgewicht: 490g.</p>
                    <p><strong>b) Trinkphase:</strong></p>
                    <p className="opacity-90">Alle Mitspielenden setzen ihr Getränk an und trinken eine beliebige Menge daraus, ohne abzusetzen. Ziel ist es, möglichst nahe dem Zielgewicht zu kommen, dieses jedoch nicht exakt zu erreichen. Danach wiegt der Wiegemeister offen.</p>
                    <p><strong>c) Rundenendphase</strong></p>
                    <ul className="list-disc pl-5 opacity-90 space-y-1">
                      <li>Der Spieler mit der höchsten Differenz zum Zielgewicht (+1 Schnaps)</li>
                      <li>Alle Spieler mit einer Schnapszahl (z.B. 222, 444) (+1 Schnaps)</li>
                      <li>Alle Spieler mit identischem Gewicht (+1 Schnaps)</li>
                      <li>Alle Spieler, die das Zielgewicht exakt getroffen haben (+1 Schnaps)</li>
                    </ul>
                  </div>
                </section>
                <section>
                  <h5 className="font-bold underline mb-2">Die nächste Runde</h5>
                  <p className="opacity-90 mb-4">Die neue Runde beginnt mit der Ansagephase durch die Person links im Uhrzeigersinn neben dem Wiegemeister. Danach folgen Trink- und Endphase.</p>
                  <h4 className="font-black uppercase text-base mb-1" style={{ color: BRAND_COLOR }}>Letzte Runde</h4>
                  <p className="opacity-90">Eingeleitet, wenn das minimal anzusagende Zielgewicht die Grenze des niedrigsten Startgewichts abzüglich 500g unterschreiten würde. Alle trinken aus und schätzen das Leergewicht. Danach endet das Spiel.</p>
                </section>
                <section>
                  <h4 className="font-black uppercase text-base mb-1" style={{ color: BRAND_COLOR }}>Zusätzliche Regeln:</h4>
                  <p className="opacity-90">Man darf sein Bier nie leertrinken, ausser in der letzten Runde (sonst Disqualifikation). Bei Turnieren: Ausschluss bei >100g Differenz möglich.</p>
                </section>
              </div>
              <button onClick={() => setShowRules(false)} className="w-full mt-6 text-white font-black py-4 rounded-xl shadow-lg transition-colors uppercase active:scale-95" style={{ backgroundColor: BRAND_COLOR }}>Verstanden</button>
            </div>
          </div>
      )}

      {showFinalIntro && !showSummary && !disqualifiedNotice && !showAutoTargetModal && (
          <div className="fixed inset-0 z-[420] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-in zoom-in duration-500">
              <div className="text-center max-w-lg w-full">
                  <div className="w-32 h-32 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-10 shadow-[0_0_50px_rgba(234,179,8,0.5)] animate-pulse">
                      <i className="fas fa-trophy text-6xl text-white"></i>
                  </div>
                  <h2 className="text-5xl font-black mb-6 uppercase italic tracking-tighter text-yellow-500">DAS FINALE</h2>
                  <div className="bg-white/5 border border-white/10 p-6 rounded-3xl mb-12 text-white text-left">
                      <p className="text-xs font-bold uppercase opacity-50 tracking-widest mb-3">Ausgelöst durch:</p>
                      <ul className="space-y-3 mb-6">
                        {triggeringPlayers.map((p, i) => (
                          <li key={i} className="flex flex-col border-l-2 border-yellow-500 pl-3">
                            <span className="font-black text-lg uppercase">{p.name}</span>
                            <span className="text-xs opacity-70">Gewicht: <span className="text-yellow-400">{p.weight}g</span> (Limit: {p.limit}g)</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-sm leading-relaxed font-bold pt-4 border-t border-white/10">
                        In der letzten Runde trinken alle aus und schätzen ihr <span className="text-yellow-400 uppercase">Leergewicht!</span>
                      </p>
                  </div>
                  <button onClick={startFinalSequence} className="w-full text-white font-black py-6 rounded-3xl shadow-2xl text-2xl uppercase tracking-widest transform active:scale-95 transition-all" style={{ backgroundColor: GOLD_COLOR }}>FINALE STARTEN</button>
              </div>
          </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg">
          <div className={`rounded-3xl p-8 max-sm w-full shadow-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h3 className="text-2xl font-black mb-4 uppercase text-red-600 text-center">Abbrechen?</h3>
            <p className="opacity-70 mb-8 text-center text-sm">Der aktuelle Spielstand geht verloren.</p>
            <div className="flex flex-col space-y-3">
              <button onClick={resetToStart} className="w-full bg-red-600 text-white font-bold py-4 rounded-xl shadow-lg uppercase active:scale-95">Beenden</button>
              <button onClick={() => setShowResetConfirm(false)} className={`w-full font-bold py-4 rounded-xl border transition-colors uppercase active:scale-95 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>Zurück</button>
            </div>
          </div>
        </div>
      )}

      {showStats && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-in zoom-in duration-300">
          <div className={`rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl border flex flex-col ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
            <h3 className="text-3xl font-black mb-6 text-center uppercase tracking-tighter" style={{ color: BRAND_COLOR }}>Rundenverlauf & Genauigkeit</h3>
            <div ref={statsAreaRef} className="relative p-6 md:p-10 rounded-2xl border border-gray-700/30 bg-black/20 flex-1">
                <div className="relative w-full h-[250px] md:h-[350px]">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 400 200" preserveAspectRatio="none">
                        {[0, 0.25, 0.5, 0.75, 1].map(p => (
                          <g key={p}>
                            <line x1="0" y1={200 - (p * 200)} x2="400" y2={200 - (p * 200)} stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />
                            <text x="-8" y={200 - (p * 200)} dominantBaseline="middle" textAnchor="end" className="fill-current opacity-30 text-[8px] font-bold">{Math.round(graphMax * p)}g</text>
                          </g>
                        ))}
                        {players.map((p, pIdx) => {
                            const activeRounds = rounds.filter(r => r.results[p.id] !== undefined);
                            if (activeRounds.length < 1) return null;
                            const points = activeRounds.map((r, rIdx) => {
                                const target = r.isFinal ? r.individualTargets?.[p.id] : r.targetWeight;
                                const dist = Math.abs(r.results[p.id] - target!);
                                return `${(rIdx / (rounds.length - 1 || 1)) * 400},${200 - Math.min(200, dist * (200 / graphMax))}`;
                            }).join(' ');
                            
                            // Falls nur ein Punkt da ist, zeichne einen Kreis statt einer Linie
                            if (activeRounds.length === 1) {
                                const target = activeRounds[0].isFinal ? activeRounds[0].individualTargets?.[p.id] : activeRounds[0].targetWeight;
                                const dist = Math.abs(activeRounds[0].results[p.id] - target!);
                                return <circle key={p.id} cx="0" cy={200 - Math.min(200, dist * (200 / graphMax))} r="4" fill={PLAYER_COLORS[pIdx % PLAYER_COLORS.length]} />;
                            }
                            
                            return <polyline key={p.id} points={points} fill="none" stroke={PLAYER_COLORS[pIdx % PLAYER_COLORS.length]} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />;
                        })}
                    </svg>
                </div>
            </div>

            {/* Legende unter der Grafik */}
            <div className="flex flex-wrap justify-center gap-4 mt-6 bg-black/10 dark:bg-white/5 p-4 rounded-2xl">
              {players.map((p, idx) => (
                <div key={p.id} className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}></span>
                  <span className="text-[10px] font-bold uppercase tracking-tight opacity-80 text-gray-900 dark:text-white">{p.name}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <button onClick={() => captureElement(statsAreaRef, 'Bundeswiega_Statistik')} className="text-white font-black py-5 rounded-2xl shadow-xl transition-all uppercase active:scale-95 flex items-center justify-center space-x-2" style={{ backgroundColor: DARK_GRAY }}>
                <i className="fas fa-camera"></i><span>Screenshot</span>
              </button>
              <button onClick={() => setShowStats(false)} className="text-white font-black py-5 rounded-2xl shadow-xl transition-all uppercase active:scale-95" style={{ backgroundColor: BRAND_COLOR }}>Schließen</button>
            </div>
          </div>
        </div>
      )}

      {showComingSoon && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in zoom-in">
            <div className={`rounded-3xl p-8 max-sm w-full shadow-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-xl"><i className="fas fa-tools"></i></div>
              <h3 className="text-xl font-bold mb-4 text-center">In Arbeit</h3>
              <p className="text-sm opacity-80 mb-8 text-center">Dieser Modus ist zurzeit noch in Arbeit!</p>
              <button onClick={() => setShowComingSoon(false)} className="w-full text-white font-bold py-4 rounded-xl shadow-lg uppercase active:scale-95" style={{ backgroundColor: BRAND_COLOR }}>Alles klar</button>
            </div>
          </div>
      )}

      {startWeightError && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg">
          <div className={`rounded-3xl p-8 max-sm w-full shadow-2xl border-4 border-red-500 text-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-2xl font-black mb-4 uppercase text-red-500">Eingabe zu niedrig</h3>
            <p className="opacity-80 mb-8 leading-relaxed text-sm">{startWeightError}</p>
            <button onClick={() => setStartWeightError(null)} className="w-full text-white font-bold py-4 rounded-xl shadow-lg uppercase active:scale-95" style={{ backgroundColor: BRAND_COLOR }}>OK</button>
          </div>
        </div>
      )}

      <footer className={`mt-auto pt-8 pb-4 text-center text-[10px] font-black uppercase tracking-[0.1em] transition-opacity duration-500 ${showModeFooter ? 'opacity-40' : 'opacity-0'}`}>
        {isShortMode ? 'Du spielst im 0,33 L Modus' : 'Du spielst im 500 ml Modus'}
      </footer>
    </div>
  );
};

export default App;
