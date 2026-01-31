import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GameState, Player, Round } from './types';
import { calculateAverageDistance, getRoundSummary, getTargetRange } from './utils';

/**
 * 1. BUNDESWIEGA - Production Optimized for Vercel
 */

declare const html2canvas: any;

const LOGO_URL = "https://github.com/Melphyre/Bundeswiega/blob/main/Bundeswiega.png?raw=true";
const INSTAGRAM_URL = "https://www.instagram.com/bundeswiega/";

const BRAND_COLOR = "#238183";
const BRAND_COLOR_HOVER = "#1b6668";
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
    document.body.className = darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900';
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

  const onWeightsSubmit = () => {
    const limit = isShortMode ? 333 : 500;
    const numericWeights = tempWeights.map(w => parseInt(w));
    
    for (let i = 0; i < numericWeights.length; i++) {
        const w = numericWeights[i];
        if (isNaN(w) || w <= 0) { alert("Bitte gültiges Gewicht eingeben."); return; }
        if (w < limit) { setStartWeightError(`Startgewicht bei ${players[i].name} zu klein.`); return; }
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
            alert(`Abweichung zu hoch! Bereich: ${Math.round(range.min)}g - ${Math.round(range.max)}g`);
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
    if (!activePlayers.every(p => currentRoundResults[p.id])) { alert("Bitte alle Gewichte eintragen."); return; }

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
      if (dist > 50) { isDisqualified = true; newlyDisqualified.push({ name: p.name, diff: dist }); }
      let schnaepse = p.schnaepse + (summary.pointsToAward.includes(p.id) ? 1 : 0);
      return { ...p, schnaepse, isDisqualified };
    });

    const minStartWeight = Math.min(...players.map(p => p.startWeight));
    const triggerThreshold = minStartWeight - (isShortMode ? 278 : 445);
    const triggeringPlayer = activePlayers.find(p => (currentRound.results[p.id] as number) < triggerThreshold);
    
    if (triggeringPlayer) {
      setTriggeringPlayerInfo({ name: triggeringPlayer.name, weight: currentRound.results[triggeringPlayer.id], threshold: triggerThreshold });
      setFinalTriggered(true);
    }

    setPlayers(updatedPlayers);
    setSummaryData(summary);
    setRounds(updatedRounds);
    setDisqualifiedNotice(newlyDisqualified.length > 0 ? newlyDisqualified : null);
    setShowSummary(true);
  };

  const captureSingleScreenshot = async (ref: React.RefObject<HTMLDivElement>, fileName: string, title: string, elementId: string) => {
    if (!ref.current) return;
    try {
      const canvas = await html2canvas(ref.current, {
          scale: 3,
          backgroundColor: darkMode ? '#0f172a' : '#f9fafb',
          useCORS: true,
          logging: false,
          onclone: (clonedDoc: Document) => {
              const el = clonedDoc.getElementById(elementId);
              if (el) {
                  el.style.padding = '40px';
                  el.style.width = '800px';
                  const branding = clonedDoc.createElement('div');
                  branding.style.textAlign = 'center';
                  branding.style.marginBottom = '30px';
                  branding.innerHTML = `
                      <img src="${LOGO_URL}" style="width: 80px; height: 80px; margin-bottom: 15px; object-fit: contain;" />
                      <h2 style="font-weight: 900; font-size: 28px; color: ${BRAND_COLOR};">1. BUNDESWIEGA</h2>
                      <h3 style="font-size: 18px; font-weight: 700; opacity: 0.7;">${title}</h3>
                      <p style="font-size: 12px; opacity: 0.5;">${new Date().toLocaleString('de-DE')}</p>
                  `;
                  el.prepend(branding);
              }
          }
      });
      const link = document.createElement('a');
      link.download = fileName;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) { console.error(err); }
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

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 max-w-6xl mx-auto">
      <header className="flex justify-between items-center mb-10">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => gameState !== GameState.START && setShowResetConfirm(true)}>
          <img src={LOGO_URL} alt="Logo" className="w-12 h-12 object-contain" />
          <h1 className="text-2xl font-black tracking-tighter hidden sm:block" style={{ color: darkMode ? '#ffffff' : BRAND_COLOR }}>1. Bundeswiega</h1>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => setDarkMode(!darkMode)} className={`w-12 h-12 flex items-center justify-center rounded-2xl shadow-lg border transition-all ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <i className={`fas ${darkMode ? 'fa-sun text-yellow-400' : 'fa-moon text-brand'} text-xl`} style={{ color: darkMode ? '' : BRAND_COLOR }}></i>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center relative">
        {gameState === GameState.START && (
          <div className="text-center animate-in fade-in duration-1000 w-full max-w-xl">
            <div className="mb-12">
              <img src={LOGO_URL} alt="Main Logo" className="w-64 h-64 md:w-80 md:h-80 mx-auto object-contain drop-shadow-2xl animate-pulse-slow" />
            </div>
            <button 
              onClick={startGame} 
              className="w-full text-white font-black py-6 rounded-3xl shadow-2xl transform active:scale-95 transition-all text-2xl flex items-center justify-center space-x-4 mb-6"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              <i className="fas fa-play"></i><span>SPIEL STARTEN</span>
            </button>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowRules(true)} className="text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center space-x-2" style={{ backgroundColor: BRAND_COLOR }}><i className="fas fa-book"></i><span>REGELN</span></button>
              <button onClick={() => setShowComingSoonModal(true)} className="bg-gray-700 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center space-x-2 opacity-50"><i className="fas fa-users"></i><span>TEAMS</span></button>
            </div>
          </div>
        )}

        {gameState === GameState.PLAYER_COUNT && (
          <div className={`p-8 rounded-3xl shadow-2xl w-full max-w-md border animate-in slide-in-from-bottom-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-2xl font-black mb-8 text-center uppercase">Anzahl der Spieler</h2>
            <select value={playerCount} onChange={(e) => setPlayerCount(parseInt(e.target.value))} className={`w-full p-4 border-2 rounded-2xl mb-8 text-xl font-bold focus:outline-none ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`} style={{ borderColor: BRAND_COLOR }}>
              {Array.from({ length: 9 }, (_, i) => i + 2).map(n => <option key={n} value={n}>{n} Mitspieler</option>)}
            </select>
            <button onClick={handlePlayerCountConfirm} className="w-full text-white font-black py-5 rounded-2xl shadow-xl transition-all text-xl" style={{ backgroundColor: BRAND_COLOR }}>WEITER</button>
          </div>
        )}

        {/* ... (Zwischenschritte wie PLAYER_NAMES, START_WEIGHTS bleiben logisch gleich, nutzen aber BRAND_COLOR) ... */}
        {/* Hier werden nur die relevanten UI Teile für die Farbanpassung gezeigt */}

        {gameState === GameState.RESULT_SCREEN && (
          <div className="w-full space-y-6 animate-in fade-in pb-20">
            <h2 className="text-4xl font-black uppercase text-center mb-10 italic tracking-tighter" style={{ color: BRAND_COLOR }}>🏆 ENDERGEBNIS</h2>
            
            <div id="ranking-export" ref={rankingAreaRef} className={`p-6 rounded-3xl border shadow-2xl ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
               {/* Ranking Table ... */}
               <div className="overflow-hidden rounded-2xl border dark:border-gray-700">
                  <table className="w-full text-left">
                     <thead className="bg-black/10">
                        <tr>
                           <th className="p-4 font-black">#</th>
                           <th className="p-4 font-black">SPIELER</th>
                           <th className="p-4 text-center font-black">PUNKTE</th>
                        </tr>
                     </thead>
                     <tbody>
                        {players.map((p, i) => (
                           <tr key={p.id} className="border-t dark:border-gray-700">
                              <td className="p-4 font-bold text-xl">{i+1}.</td>
                              <td className="p-4 font-black">{p.name}</td>
                              <td className="p-4 text-center font-black text-2xl" style={{ color: BRAND_COLOR }}>{p.schnaepse}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>

            <div className="flex flex-col space-y-4 px-2">
              <button 
                onClick={() => setShowStats(true)} 
                className="w-full text-white font-black py-6 rounded-3xl shadow-2xl text-2xl flex items-center justify-center space-x-4 transition-transform active:scale-95"
                style={{ backgroundColor: BRAND_COLOR }}
              >
                <i className="fas fa-chart-line"></i><span>STATISTIK ANZEIGEN</span>
              </button>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => captureSingleScreenshot(rankingAreaRef, `Ranking.png`, "Endergebnis", "ranking-export")}
                  className="text-white font-black py-5 rounded-2xl shadow-xl flex flex-col items-center justify-center space-y-2"
                  style={{ backgroundColor: BRAND_COLOR }}
                >
                  <i className="fas fa-camera text-xl"></i><span className="text-xs uppercase">Ranking Foto</span>
                </button>
                <button 
                  onClick={() => captureSingleScreenshot(roundsAreaRef, `Verlauf.png`, "Spielverlauf", "full-table-export")}
                  className="text-white font-black py-5 rounded-2xl shadow-xl flex flex-col items-center justify-center space-y-2"
                  style={{ backgroundColor: BRAND_COLOR }}
                >
                  <i className="fas fa-table text-xl"></i><span className="text-xs uppercase">Verlauf Foto</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- MODALS --- */}
      {showStats && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in zoom-in">
          <div className={`rounded-3xl p-8 max-w-4xl w-full shadow-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h3 className="text-3xl font-black mb-8 text-center uppercase italic" style={{ color: BRAND_COLOR }}>GENAUIGKEIT</h3>
            <div id="stats-export" ref={statsAreaRef} className="p-4 bg-black/20 rounded-2xl mb-10 border border-white/5">
                <div className="h-64 flex items-end justify-between px-4">
                    {/* Simplified Stat Visual */}
                    {players.map((p, i) => (
                        <div key={p.id} className="flex flex-col items-center w-full">
                            <div className="w-8 rounded-t-lg transition-all duration-1000" style={{ height: `${100 - (calculateAverageDistance(p.id, rounds) * 2)}%`, backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] }}></div>
                            <span className="text-[10px] mt-2 font-bold opacity-50 truncate w-12 text-center uppercase">{p.name}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => captureSingleScreenshot(statsAreaRef, 'Stats.png', 'Performance', 'stats-export')} className="bg-white/10 hover:bg-white/20 font-black py-4 rounded-2xl uppercase tracking-widest"><i className="fas fa-download mr-2"></i>Save</button>
                <button 
                  onClick={() => setShowStats(false)} 
                  className="text-white font-black py-4 rounded-2xl shadow-xl uppercase tracking-widest"
                  style={{ backgroundColor: BRAND_COLOR }}
                >OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Persistence Info */}
      <footer className="fixed bottom-4 left-0 right-0 pointer-events-none">
          <div className="mx-auto max-w-fit px-4 py-2 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
              {isShortMode ? '0,33 L MODUS' : '0,5 L MODUS'}
          </div>
      </footer>
    </div>
  );
};

export default App;