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
const BRAND_COLOR_HOVER = "#1b6668";
const GOLD_COLOR = "#D4AF37";
const PLAYER_COLORS = [
  BRAND_COLOR, '#6366f1', '#f43f5e', '#f59e0b', '#06b6d4', 
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
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [showFinalIntro, setShowFinalIntro] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showModeInfo, setShowModeInfo] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showAutoTargetModal, setShowAutoTargetModal] = useState<{ diff: number, target: number } | null>(null);
  const [startWeightError, setStartWeightError] = useState<string | null>(null);
  const [disqualifiedNotice, setDisqualifiedNotice] = useState<Array<{name: string, diff: number}> | null>(null);
  const [finalTriggered, setFinalTriggered] = useState(false);
  const [triggeringPlayerInfo, setTriggeringPlayerInfo] = useState<{name: string, weight: number, threshold: number} | null>(null);
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

  const startGame = () => {
    setGameState(GameState.PLAYER_COUNT);
    setRounds([]);
    setPlayers([]);
    setFinalTriggered(false);
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
            alert(`Bitte ein Gewicht zwischen ${Math.round(range.min)}g und ${Math.round(range.max)}g eingeben.`);
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
    const newlyDisqualified: Array<{name: string, diff: number}> = [];

    const updatedPlayers = players.map(p => {
      if (p.isDisqualified) return p;
      const weight = currentRound.results[p.id];
      const dist = Math.abs(weight - currentRound.targetWeight);
      let isDisqualified = p.isDisqualified;
      if (dist > 50) {
        isDisqualified = true;
        newlyDisqualified.push({ name: p.name, diff: dist });
      }
      let schnaepse = p.schnaepse + (summary.pointsToAward.includes(p.id) ? 1 : 0);
      return { ...p, schnaepse, isDisqualified };
    });

    const minStartWeight = Math.min(...players.map(p => p.startWeight));
    const triggerThreshold = minStartWeight - (isShortMode ? 278 : 445);
    const triggeringPlayer = activePlayers.find(p => (currentRound.results[p.id] as number) < triggerThreshold);
    
    if (triggeringPlayer) {
      setTriggeringPlayerInfo({ 
        name: triggeringPlayer.name, 
        weight: currentRound.results[triggeringPlayer.id] as number, 
        threshold: triggerThreshold 
      });
      setFinalTriggered(true);
    }

    setPlayers(updatedPlayers);
    setSummaryData(summary);
    setRounds(updatedRounds);
    setDisqualifiedNotice(newlyDisqualified.length > 0 ? newlyDisqualified : null);
    setShowSummary(true);
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
    const newlyDisqualified: Array<{name: string, diff: number}> = [];
    const updatedPlayers = players.map(p => {
      if (p.isDisqualified) return p;
      const weight = lastRound.results[p.id];
      const target = lastRound.individualTargets![p.id];
      const dist = Math.abs(weight - target);
      let isDisqualified = p.isDisqualified;
      if (dist > 50) { isDisqualified = true; newlyDisqualified.push({ name: p.name, diff: dist }); }
      let schnaepse = p.schnaepse + (summary.pointsToAward.includes(p.id) ? 1 : 0);
      return { ...p, schnaepse, isDisqualified };
    });

    setPlayers(updatedPlayers);
    setRounds(updatedRounds);
    setSummaryData(summary);
    setDisqualifiedNotice(newlyDisqualified.length > 0 ? newlyDisqualified : null);
    setShowSummary(true);
  };

  const proceedFromSummary = () => {
    setShowSummary(false);
    
    if (players.every(p => p.isDisqualified)) { setGameState(GameState.RESULT_SCREEN); return; }
    if (gameState === GameState.FINAL_ROUND_RESULTS) {
      setGameState(GameState.RESULT_SCREEN);
    } else if (finalTriggered) {
      setShowFinalIntro(true);
    } else {
        if (!disqualifiedNotice) {
            const lastRound = rounds[rounds.length - 1];
            const activePlayerIds = players.filter(p => !p.isDisqualified).map(p => p.id);
            const lastWeights = activePlayerIds.map(id => lastRound.results[id]);
            const diff = Math.max(...lastWeights) - Math.min(...lastWeights);
            if (diff >= 90) { setShowAutoTargetModal({ diff, target: Math.min(...lastWeights) - 10 }); return; }
        }
        setGameState(GameState.ROUND_TARGET);
    }
  };

  const startFinalSequence = () => {
    setShowFinalIntro(false);
    setCurrentRoundTargets({});
    setGameState(GameState.FINAL_ROUND_TARGETS);
  };

  const captureSingleScreenshot = async (ref: React.RefObject<HTMLDivElement>, fileName: string, title: string, elementId: string) => {
    if (!ref.current) return;
    try {
      const canvas = await html2canvas(ref.current, {
          scale: 2,
          backgroundColor: darkMode ? '#0f172a' : '#ffffff',
          useCORS: true,
          onclone: (clonedDoc: Document) => {
              const el = clonedDoc.getElementById(elementId);
              if (el) {
                  el.style.padding = '32px';
                  el.style.width = '700px';
                  el.style.margin = '0 auto';
                  const branding = clonedDoc.createElement('div');
                  branding.className = "text-center mb-6 flex flex-col items-center";
                  branding.innerHTML = `
                      <img src="${LOGO_URL}" style="width: 64px; height: 64px; margin-bottom: 12px; object-fit: contain;" />
                      <h2 style="font-weight: 900; font-size: 24px; color: ${BRAND_COLOR}; margin-bottom: 4px;">1. BUNDESWIEGA</h2>
                      <h3 style="font-size: 16px; font-weight: 800; opacity: 0.8; margin-bottom: 4px; text-transform: uppercase;">${title}</h3>
                      <p style="font-size: 10px; opacity: 0.5; font-weight: bold;">STAND: ${new Date().toLocaleDateString('de-DE')}</p>
                  `;
                  el.prepend(branding);
              }
          }
      });
      const link = document.createElement('a');
      link.download = fileName;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) { alert("Screenshot fehlgeschlagen."); }
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
    return Math.max(10, Math.min(50, Math.ceil(maxDist / 10) * 10));
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
            <div className="mb-12 flex justify-center">
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="block transition-transform hover:scale-105 active:scale-95">
                <img src={LOGO_URL} alt="1. Bundeswiega Logo" className="w-64 h-64 md:w-80 md:h-80 lg:w-[400px] lg:h-[400px] object-contain drop-shadow-2xl" />
              </a>
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-12 tracking-tighter uppercase text-center" style={{ color: BRAND_COLOR }}>1. Bundeswiega</h1>
            <div className="flex flex-col space-y-4 w-full max-w-sm mx-auto">
              <button 
                onClick={startGame} 
                className="text-white font-bold py-6 px-10 rounded-3xl shadow-xl transform active:scale-95 transition-all text-2xl w-full flex items-center justify-center space-x-3"
                style={{ backgroundColor: BRAND_COLOR }}
              >
                <i className="fas fa-play"></i>
                <span>Spiel starten</span>
              </button>
              <div className="flex flex-col space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setShowComingSoonModal(true)} className={`font-bold py-4 rounded-2xl shadow-md border transition-all ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
                    <i className="fas fa-users mr-2"></i>Team
                  </button>
                  <button onClick={() => setShowComingSoonModal(true)} className={`font-bold py-4 rounded-2xl shadow-md border transition-all ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
                    <i className="fas fa-bolt mr-2"></i>Speed
                  </button>
                </div>
                <button 
                  onClick={() => setShowRules(true)} 
                  className="w-full text-white font-black py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center space-x-2 text-lg"
                  style={{ backgroundColor: BRAND_COLOR }}
                >
                  <i className="fas fa-book"></i><span>Regeln</span>
                </button>
              </div>
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
                  <button onClick={() => setShowModeInfo(true)} className="flex items-center justify-center w-5 h-5 rounded-full border text-[10px] font-bold border-gray-500 text-gray-400"><i className="fas fa-exclamation"></i></button>
                </div>
            </div>
            <button 
              onClick={handlePlayerCountConfirm} 
              className="w-full text-white font-bold py-4 rounded-xl shadow-lg transition-colors"
              style={{ backgroundColor: BRAND_COLOR }}
            >Weiter</button>
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
            <button onClick={() => handlePlayerNamesConfirm(players.map(p => p.name))} className="w-full text-white font-bold py-4 rounded-xl shadow-lg transition-colors" style={{ backgroundColor: BRAND_COLOR }}>Startgewichte festlegen</button>
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
                    <input 
                      type="number" 
                      placeholder="Startgewicht" 
                      value={tempWeights[i]} 
                      className={`w-full p-3 border-2 rounded-xl focus:outline-none transition-colors ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`} 
                      style={{ borderColor: tempWeights[i] ? BRAND_COLOR : '' }}
                      onChange={(e) => { const nextWeights = [...tempWeights]; nextWeights[i] = e.target.value; setTempWeights(nextWeights); }} 
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30 text-xs font-bold">g</span>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={onWeightsSubmit} className="w-full text-white font-bold py-4 rounded-xl shadow-lg transition-colors uppercase tracking-widest" style={{ backgroundColor: BRAND_COLOR }}>Spiel starten</button>
          </div>
        )}

        {gameState === GameState.ROUND_TARGET && (
          <div className={`p-8 rounded-3xl shadow-2xl w-full max-w-md border animate-in zoom-in duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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
                      <p className="text-sm opacity-70 mb-6 text-center">Neues Zielgewicht festlegen: <br/><span className="font-bold" style={{ color: BRAND_COLOR }}>{Math.round(range.min)}g - {Math.round(range.max)}g</span></p>
                      <input type="number" autoFocus value={nextTargetInput} onChange={(e) => setNextTargetInput(e.target.value)} placeholder="Ziel (g)" className={`w-full p-4 border-2 rounded-xl mb-6 text-3xl text-center font-black focus:outline-none transition-colors ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`} style={{ borderColor: BRAND_COLOR }} />
                      </>
                  );
              })()}
              <button onClick={() => handleTargetWeightConfirm()} className="w-full text-white font-bold py-5 rounded-2xl shadow-xl transition-all text-xl uppercase" style={{ backgroundColor: BRAND_COLOR }}>Bestätigen</button>
            </div>
          </div>
        )}

        {(gameState === GameState.GAMEPLAY || gameState === GameState.FINAL_ROUND_RESULTS) && (
          <div className="w-full flex flex-col space-y-6 animate-in fade-in duration-500">
            <div className={`rounded-3xl shadow-xl overflow-hidden border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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
                  {gameState === GameState.FINAL_ROUND_RESULTS ? 'Wiege-Ergebnis: Leergewicht (g)' : 'Ergebnisse eintragen'}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    {players.filter(p => !p.isDisqualified).map(p => (
                        <div key={p.id}>
                            <label className="text-[10px] font-bold opacity-60 mb-1 block uppercase text-left">{p.name}</label>
                            <input type="number" placeholder="g" value={currentRoundResults[p.id] || ''} onChange={(e) => setCurrentRoundResults({...currentRoundResults, [p.id]: e.target.value})} className={`w-full p-2 border-2 rounded-lg focus:outline-none transition-colors text-sm font-bold ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`} style={{ borderColor: currentRoundResults[p.id] ? BRAND_COLOR : '' }} />
                        </div>
                    ))}
                </div>
                <button 
                  onClick={gameState === GameState.GAMEPLAY ? handleNextRound : handleFinalResultsConfirm} 
                  className="w-full text-white font-black py-4 rounded-2xl shadow-xl transition-all uppercase tracking-widest"
                  style={{ backgroundColor: BRAND_COLOR }}
                >Runde auswerten</button>
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
                    <input 
                      type="number" 
                      placeholder="Zielgewicht" 
                      value={currentRoundTargets[p.id] || ''} 
                      className={`w-full p-3 border-2 rounded-xl focus:outline-none transition-colors ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`} 
                      style={{ borderColor: currentRoundTargets[p.id] ? BRAND_COLOR : '' }}
                      onChange={(e) => setCurrentRoundTargets({...currentRoundTargets, [p.id]: e.target.value})} 
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30 text-xs font-bold">g</span>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleFinalTargetsConfirm} className="w-full text-white font-black py-5 rounded-2xl shadow-xl transition-all text-xl uppercase tracking-widest" style={{ backgroundColor: BRAND_COLOR }}>Ziele speichern</button>
          </div>
        )}

        {gameState === GameState.RESULT_SCREEN && (
          <div className="w-full flex flex-col space-y-8 animate-in fade-in duration-500 max-h-screen overflow-y-auto px-1 pb-20 text-center">
            <h2 className="text-3xl font-black uppercase tracking-tighter mx-auto mb-2" style={{ color: BRAND_COLOR }}>🏆 Gesamtergebnis</h2>
            
            {/* Ranking Section */}
            <div id="ranking-export" ref={rankingAreaRef} className={`p-4 md:p-6 rounded-3xl border shadow-lg ${darkMode ? 'bg-slate-900 border-gray-800' : 'bg-white border-gray-100'}`}>
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

            {/* Full Rounds Table Section */}
            <div id="full-table-export" ref={roundsAreaRef} className={`p-4 md:p-6 rounded-3xl border shadow-lg ${darkMode ? 'bg-slate-900 border-gray-800' : 'bg-white border-gray-100'}`}>
              <h3 className="text-xl font-black mb-4 uppercase tracking-tighter text-left" style={{ color: BRAND_COLOR }}>Detaillierter Verlauf</h3>
              <div className={`rounded-2xl overflow-hidden border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-50'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[10px] sm:text-xs">
                    <thead>
                      <tr className={darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}>
                        <th className="p-2 border-b border-gray-700 font-bold text-center opacity-50">RND</th>
                        {players.map(p => (
                          <th key={p.id} className="p-1 border-b border-gray-700 font-bold text-center">
                            <VerticalText text={p.name} />
                          </th>
                        ))}
                        <th className={`p-2 border-b border-gray-700 font-bold text-center ${darkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>ZIEL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rounds.map((r, rIdx) => {
                          const targetValue = r.isFinal ? 'EX!' : `${r.targetWeight}g`;
                          return (
                        <tr key={rIdx} className={`border-b border-gray-800 ${darkMode ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}`}>
                          <td className="p-2 font-semibold opacity-50 text-center">#{rIdx + 1}</td>
                          {players.map(p => {
                            const val = r.results[p.id];
                            const target = (r.isFinal && r.individualTargets) ? r.individualTargets[p.id] : r.targetWeight;
                            const dist = val !== undefined && typeof target === 'number' ? Math.abs(val - target) : null;
                            return (
                              <td key={p.id} className="p-1 text-center align-middle">
                                {val !== undefined ? (
                                  <>
                                    <div className="font-semibold">{val}g</div>
                                    {dist !== null && dist > 0 && <div className={`text-[8px] font-bold ${dist > 50 ? 'text-red-600' : 'opacity-60'}`}>{dist > 50 ? 'D' : `+${dist}`}</div>}
                                    {dist === 0 && <div className="text-[8px] font-bold" style={{ color: BRAND_COLOR }}>🎯</div>}
                                  </>
                                ) : ( <div className="text-[8px] opacity-30">{p.isDisqualified ? '❌' : '—'}</div> )}
                              </td>
                            );
                          })}
                          <td className={`p-2 text-center font-bold ${darkMode ? 'text-yellow-400' : 'text-blue-600'}`}>{targetValue}</td>
                        </tr>
                      );})}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-3 pt-4 px-3">
              <button 
                onClick={() => setShowStats(true)} 
                className="w-full text-white font-black py-5 rounded-2xl shadow-xl transition-all text-xl flex items-center justify-center space-x-3"
                style={{ backgroundColor: BRAND_COLOR }}
              >
                <i className="fas fa-chart-line"></i><span>Statistik</span>
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => captureSingleScreenshot(rankingAreaRef, `Ranking_${Date.now()}.png`, "Endergebnis", "ranking-export")} 
                  className="text-white font-black py-5 rounded-2xl shadow-xl text-xs flex flex-col items-center justify-center space-y-1"
                  style={{ backgroundColor: BRAND_COLOR }}
                >
                  <i className="fas fa-camera text-lg"></i><span>Screenshot Ranking</span>
                </button>
                <button onClick={() => captureSingleScreenshot(roundsAreaRef, `Tabelle_${Date.now()}.png`, "Verlauf", "full-table-export")} className="bg-slate-700 text-white font-black py-5 rounded-2xl shadow-xl text-xs flex flex-col items-center justify-center space-y-1">
                  <i className="fas fa-table text-lg"></i><span>Screenshot Tabelle</span>
                </button>
              </div>
              <button onClick={() => setShowResetConfirm(true)} className="w-full font-black py-4 rounded-2xl shadow-lg border bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-red-500 transition-all border-gray-200 dark:border-gray-700">Hauptmenü</button>
            </div>
          </div>
        )}
      </main>

      {/* --- MODALS --- */}
      {startWeightError && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg">
          <div className={`rounded-3xl p-8 max-sm w-full shadow-2xl border-4 border-red-500 animate-in zoom-in duration-300 text-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"><i className="fas fa-exclamation-triangle text-2xl text-white"></i></div>
            <h3 className="text-2xl font-black mb-4 uppercase text-red-500">Eingabe zu niedrig</h3>
            <p className="opacity-80 mb-8 leading-relaxed text-sm">
                {startWeightError}
            </p>
            <button 
              onClick={() => setStartWeightError(null)} 
              className="w-full text-white font-bold py-4 rounded-xl shadow-lg hover:bg-opacity-90 transition-all uppercase"
              style={{ backgroundColor: BRAND_COLOR }}
            >OK</button>
          </div>
        </div>
      )}

      {disqualifiedNotice && (
        <div className="fixed inset-0 z-[310] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className={`rounded-3xl p-10 max-w-sm w-full shadow-2xl border-4 border-red-600 text-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl animate-bounce">
              <i className="fas fa-user-xmark text-4xl text-white"></i>
            </div>
            <h3 className="text-3xl font-black mb-6 uppercase tracking-tighter italic text-red-600">Disqualifiziert</h3>
            <div className="space-y-4 mb-8">
              {disqualifiedNotice.map((p, i) => (
                <div key={i} className={`p-4 rounded-2xl border ${darkMode ? 'bg-red-900/10 border-red-900/30' : 'bg-red-50 border-red-100'}`}>
                  <p className="text-xl font-black uppercase text-gray-900 dark:text-white mb-1">{p.name}</p>
                  <p className="text-sm font-bold opacity-70 text-red-600">Grund: Abstand von {p.diff}g ist zu hoch!</p>
                  <p className="text-[10px] uppercase font-black opacity-40 mt-1">(Limit: 50g)</p>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setDisqualifiedNotice(null)} 
              className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-lg uppercase transition-transform active:scale-95"
            >Bestätigen</button>
          </div>
        </div>
      )}

      {showSummary && summaryData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className={`rounded-3xl p-8 max-w-lg w-full shadow-2xl border animate-in slide-in-from-bottom duration-300 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
            <h3 className="text-3xl font-black mb-8 text-center uppercase tracking-tighter" style={{ color: BRAND_COLOR }}>Rundenauswertung</h3>
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border flex items-center ${darkMode ? 'bg-red-900/20 border-red-900/40' : 'bg-red-50 border-red-200'}`}>
                <i className="fas fa-skull text-xl text-red-500 mr-4"></i>
                <div className="flex-1">
                  <p className="text-[10px] font-bold opacity-60 uppercase">Größter Abstand (+1 Schnaps)</p>
                  <p className="text-lg font-black">{summaryData.furthestPlayers.join(' & ')}</p>
                </div>
              </div>
              {summaryData.exactHits.length > 0 && (
                <div className={`p-4 rounded-2xl border flex items-center ${darkMode ? 'bg-emerald-900/20 border-emerald-900/40' : 'bg-emerald-50 border-emerald-200'}`}>
                  <i className="fas fa-bullseye text-xl text-emerald-500 mr-4"></i>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold opacity-60 uppercase">Volltreffer! (+1 Schnaps)</p>
                    <p className="text-lg font-black">{summaryData.exactHits.join(', ')}</p>
                  </div>
                </div>
              )}
              {summaryData.specialHits.length > 0 && (
                <div className={`p-4 rounded-2xl border flex items-center ${darkMode ? 'bg-amber-900/20 border-amber-900/40' : 'bg-amber-50 border-amber-200'}`}>
                  <i className="fas fa-star text-xl text-amber-500 mr-4"></i>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold opacity-60 uppercase">Schnapszahl! (+1 Schnaps)</p>
                    <p className="text-lg font-black">{summaryData.specialHits.map(s => `${s.playerName} (${s.value}g)`).join(', ')}</p>
                  </div>
                </div>
              )}
              {summaryData.duplicates.length > 0 && (
                <div className={`p-4 rounded-2xl border flex items-center ${darkMode ? 'bg-blue-900/20 border-blue-900/40' : 'bg-blue-50 border-blue-200'}`}>
                  <i className="fas fa-clone text-xl text-blue-500 mr-4"></i>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold opacity-60 uppercase">Wiegezwilling! (+1 Schnaps)</p>
                    {summaryData.duplicates.map((d, i) => (
                      <p key={i} className="text-lg font-black">{d.playerNames.join(' & ')} ({d.weight}g)</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button onClick={proceedFromSummary} className="w-full mt-10 text-white font-black py-5 rounded-2xl shadow-xl transition-all text-xl uppercase" style={{ backgroundColor: BRAND_COLOR }}>Weiter</button>
          </div>
        </div>
      )}

      {showFinalIntro && triggeringPlayerInfo && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-in zoom-in duration-500">
              <div className="text-center max-w-lg">
                  <div className="w-32 h-32 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-10 shadow-[0_0_50px_rgba(234,179,8,0.5)] animate-pulse">
                      <i className="fas fa-trophy text-6xl text-white"></i>
                  </div>
                  <h2 className="text-5xl font-black mb-6 uppercase italic tracking-tighter" style={{ color: BRAND_COLOR }}>DAS FINALE</h2>
                  <p className="text-xl mb-12 leading-relaxed font-bold opacity-80">
                      {triggeringPlayerInfo.name} hat mit {triggeringPlayerInfo.weight}g die kritische Grenze {isShortMode ? '(Minimum Start - 278g)' : '(Minimum Start - 445g)'} unterschritten! 
                      <br/><br/>
                      Nun folgt die letzte Runde: <br/> <span className="text-3xl text-yellow-400 uppercase">Leerwiegen!</span>
                  </p>
                  <button 
                    onClick={startFinalSequence} 
                    className="w-full text-white font-black py-6 rounded-3xl shadow-2xl text-2xl uppercase tracking-widest transform active:scale-95 transition-all" 
                    style={{ backgroundColor: GOLD_COLOR }}
                  >FINALE STARTEN</button>
              </div>
          </div>
      )}

      {showStats && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl">
          <div className={`rounded-3xl p-6 md:p-8 max-w-3xl w-full shadow-2xl border animate-in zoom-in duration-300 flex flex-col ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h3 className="text-3xl font-black mb-8 text-center uppercase tracking-tighter" style={{ color: BRAND_COLOR }}>Genauigkeit</h3>
            <div id="stats-export" ref={statsAreaRef} className="p-4 rounded-2xl border border-gray-700/50 bg-black/10">
                <div className="relative w-full aspect-video bg-black/20 rounded-2xl p-4 overflow-hidden">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 400 200" preserveAspectRatio="none">
                        {[0, 0.25, 0.5, 0.75, 1].map(p => (
                            <line key={p} x1="0" y1={200 - (p * 200)} x2="400" y2={200 - (p * 200)} stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />
                        ))}
                        {players.map((p, pIdx) => {
                            const activeRounds = rounds.filter(r => r.results[p.id] !== undefined);
                            if (activeRounds.length < 1) return null;
                            const factor = 200 / graphMax;
                            const points = activeRounds.map((r, rIdx) => {
                                const target = r.isFinal ? r.individualTargets?.[p.id] : r.targetWeight;
                                if (typeof target !== 'number') return null;
                                const dist = Math.abs(r.results[p.id] - target);
                                const x = (rIdx / (rounds.length - 1 || 1)) * 400;
                                const y = 200 - Math.min(200, dist * factor);
                                return `${x},${y}`;
                            }).filter(p => p !== null).join(' ');
                            return <polyline key={p.id} points={points} fill="none" stroke={PLAYER_COLORS[pIdx % PLAYER_COLORS.length]} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />;
                        })}
                    </svg>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-10">
                <button onClick={() => captureSingleScreenshot(statsAreaRef, `Stats_${Date.now()}.png`, "Statistik", "stats-export")} className="bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg flex items-center justify-center space-x-2"><i className="fas fa-camera"></i><span>Export</span></button>
                <button onClick={() => setShowStats(false)} className="text-white font-black py-4 rounded-xl shadow-lg uppercase transition-all" style={{ backgroundColor: BRAND_COLOR }}>OK</button>
            </div>
          </div>
        </div>
      )}

      {showRules && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in">
          <div className={`rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] shadow-2xl border flex flex-col ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h3 className="text-3xl font-black mb-6 text-center uppercase tracking-tighter" style={{ color: BRAND_COLOR }}>Spielregeln</h3>
            <div className="overflow-y-auto flex-1 pr-2 space-y-4 text-sm text-left">
              <section className="border-l-4 p-4 bg-gray-500/5" style={{ borderColor: BRAND_COLOR }}>
                <h4 className="font-black uppercase mb-2">Kurzfassung</h4>
                <p>1. Wiegemeister legt Zielgewicht fest.</p>
                <p>2. Spieler trinken ohne Absetzen.</p>
                <p>3. Wer am weitesten entfernt ist, trinkt einen Schnaps.</p>
                <p className="text-red-500 font-bold mt-2">! Mehr als 50g Abweichung = Disqualifikation !</p>
              </section>
              <p className="opacity-70 leading-relaxed text-xs">Bundeswiega ist ein geselliges Spiel. Bitte verantwortungsbewusst konsumieren. Teilnahme erst ab 18 Jahren.</p>
            </div>
            <button onClick={() => setShowRules(false)} className="w-full mt-6 text-white font-black py-4 rounded-xl shadow-lg transition-colors uppercase" style={{ backgroundColor: BRAND_COLOR }}>OK</button>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg">
          <div className={`rounded-3xl p-8 max-sm w-full shadow-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h3 className="text-2xl font-black mb-4 uppercase text-red-600 text-center">Abbrechen?</h3>
            <p className="opacity-70 mb-8 text-center text-sm">Der aktuelle Spielstand geht verloren.</p>
            <div className="flex flex-col space-y-3">
              <button onClick={resetToStart} className="w-full bg-red-600 text-white font-bold py-4 rounded-xl shadow-lg uppercase">Beenden</button>
              <button onClick={() => setShowResetConfirm(false)} className={`w-full font-bold py-4 rounded-xl border transition-colors uppercase ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>Zurück</button>
            </div>
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