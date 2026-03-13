import React, { useState, useEffect, useRef } from 'react';
import { GameState, Player, Round, Team } from './types';
import { calculateAverageDistance, getRoundSummary, getTargetRange, SPECIAL_NUMBERS } from './utils';
import { audioService } from './services/audioService';

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

  const GameTable = ({ showInputs = false, players, rounds, darkMode, currentRoundResults, setCurrentRoundResults }: { 
    showInputs?: boolean, 
    players: Player[], 
    rounds: Round[], 
    darkMode: boolean, 
    currentRoundResults: Record<string, string>,
    setCurrentRoundResults: (val: Record<string, string>) => void
  }) => {
    return (
      <div className={`p-2 md:p-4 rounded-3xl ${darkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'} border shadow-sm overflow-x-auto w-full mb-6`}>
        <table className={`w-full text-[10px] md:text-xs text-left border-collapse min-w-[320px] ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <thead>
            <tr className={`border-b ${darkMode ? 'border-white/20' : 'border-gray-700/20'} font-black`}>
              <th className="py-2 px-1">RND</th>
              {players.map(p => (
                <th key={p.id} className="text-center p-1">
                  <VerticalText text={p.name} />
                </th>
              ))}
              <th className="py-2 text-right px-1">ZIEL</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((r, i) => (
              <tr key={i} className={`border-b ${darkMode ? 'border-white/10' : 'border-gray-700/10'}`}>
                <td className="py-2 px-1 opacity-70 font-bold">#{i+1}</td>
                {players.map(p => {
                  const v = r.results[p.id];
                  const tg = r.isFinal ? r.individualTargets?.[p.id] : r.targetWeight;
                  const dist = v !== undefined && tg !== undefined ? Math.abs(v - tg) : null;
                  return (
                    <td key={p.id} className="text-center py-2">
                      <div className="font-bold">{v !== undefined ? `${v}g` : '-'}</div>
                      {dist !== null && (
                        <div className={`text-[8px] md:text-[10px] ${dist === 0 ? 'text-emerald-500 font-black' : dist > 50 ? 'text-red-500 font-black' : (darkMode ? 'text-white/40' : 'text-black/40')}`}>
                          {dist === 0 ? '🎯' : `+${dist}`}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="py-2 text-right font-black px-1">{r.isFinal ? 'FIN' : `${r.targetWeight}g`}</td>
              </tr>
            ))}
            {showInputs && (
              <tr className={`${darkMode ? 'bg-brand/20' : 'bg-brand/5'}`}>
                <td className="py-3 font-bold text-brand italic px-1">Akt.</td>
                {players.map(p => (
                  <td key={p.id} className="text-center p-1">
                    {!p.isDisqualified ? (
                      <input 
                        type="number" 
                        min="0"
                        value={currentRoundResults[p.id] || ''} 
                        onChange={e => setCurrentRoundResults({...currentRoundResults, [p.id]: e.target.value})}
                        className={`w-12 md:w-16 p-1 rounded border-2 ${darkMode ? 'border-brand/60 bg-slate-800 text-white' : 'border-brand/40 bg-white text-black'} text-center font-black`}
                        placeholder="g"
                      />
                    ) : (
                      <div className="text-center opacity-30">💀</div>
                    )}
                  </td>
                ))}
                <td className="py-3 text-right font-black opacity-30 px-1">---</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [playerCount, setPlayerCount] = useState(2);
  const [isShortMode, setIsShortMode] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRoundResults, setCurrentRoundResults] = useState<Record<string, string>>({});
  const [currentRoundTargets, setCurrentRoundTargets] = useState<Record<string, string>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [showFinalIntro, setShowFinalIntro] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showModeInfo, setShowModeInfo] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showAutoTargetModal, setShowAutoTargetModal] = useState<{ target: number, reason: string } | null>(null);
  const [startWeightError, setStartWeightError] = useState<string | null>(null);
  const [targetWeightError, setTargetWeightError] = useState<{ message: string, correction: number } | null>(null);
  const [disqualifiedNotice, setDisqualifiedNotice] = useState<Array<{name: string, diff: number, reason: string}> | null>(null);
  const [finalTriggered, setFinalTriggered] = useState(false);
  const [triggeringPlayers, setTriggeringPlayers] = useState<Array<{name: string, weight: number, limit: number}>>([]);
  const [nextTargetInput, setNextTargetInput] = useState('');
  const [summaryData, setSummaryData] = useState<any>(null);
  const [tempWeights, setTempWeights] = useState<string[]>([]);
  
  // Speedwiegen States
  const [speedPlayerName, setSpeedPlayerName] = useState('');
  const [speedLevels, setSpeedLevels] = useState<string>('3');
  const [speedTargets, setSpeedTargets] = useState<Record<number, string>>({});
  const [speedResults, setSpeedResults] = useState<Record<number, string>>({});
  const [speedCountdown, setSpeedCountdown] = useState<string | number>(3);
  const [speedStartTime, setSpeedStartTime] = useState<number | null>(null);
  const [speedEndTime, setSpeedEndTime] = useState<number | null>(null);
  const [speedCurrentTime, setSpeedCurrentTime] = useState<number>(0);

  // Teamwiegen States
  const [teamCount, setTeamCount] = useState(2);
  const [teamSizes, setTeamSizes] = useState<Record<number, number>>({ 1: 2, 2: 2 });
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  
  const rankingAreaRef = useRef<HTMLDivElement>(null);
  const roundsAreaRef = useRef<HTMLDivElement>(null);
  const statsAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button')) {
        audioService.playCanOpen();
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    let interval: any;
    if (gameState === GameState.SPEED_GAMEPLAY && speedStartTime) {
      interval = setInterval(() => {
        setSpeedCurrentTime(Date.now() - speedStartTime);
      }, 50);
    }
    return () => clearInterval(interval);
  }, [gameState, speedStartTime]);

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
      alert("Screenshot konnte nicht erstellt werden.");
    }
  };

  const startGame = () => {
    audioService.announce("Spiele das Original Wiegen");
    setGameState(GameState.PLAYER_COUNT);
    setRounds([]);
    setPlayers([]);
    setTeams([]);
    setFinalTriggered(false);
    setIsShortMode(false);
  };

  const startTeamwiegen = () => {
    audioService.announce("Teamwiegen");
    setGameState(GameState.TEAM_SETUP);
    setTeamCount(2);
    setTeamSizes({ 1: 2, 2: 2 });
    setRounds([]);
    setPlayers([]);
    setTeams([]);
    setIsShortMode(false);
  };

  const startSpeedwiegen = () => {
    audioService.announce("Speedwiegen");
    setGameState(GameState.SPEED_SETUP);
    setSpeedPlayerName('');
    setSpeedLevels('3');
    setSpeedTargets({});
    setSpeedResults({});
    setSpeedStartTime(null);
    setSpeedEndTime(null);
    setSpeedCurrentTime(0);
  };

  const resetToStart = () => {
    setGameState(GameState.START);
    setRounds([]);
    setPlayers([]);
    setTeams([]);
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

  const handlePlayerNamesConfirm = () => {
    if (players.some(p => !p.name.trim())) {
      alert("Bitte alle Namen ausfüllen.");
      return;
    }
    setTempWeights(new Array(players.length).fill(''));
    setGameState(GameState.START_WEIGHTS);
  };

  const onWeightsSubmit = () => {
    const limit = isShortMode ? 330 : 500;
    const numericWeights = tempWeights.map(w => parseInt(w));
    for (let i = 0; i < numericWeights.length; i++) {
        if (isNaN(numericWeights[i]) || numericWeights[i] < limit) {
            setStartWeightError(`Das eingegebene Startgewicht bei "${players[i].name}" ist mit ${numericWeights[i] || 0}g zu niedrig (Minimum: ${limit}g).`);
            return;
        }
    }
    const updatedPlayers = players.map((p, i) => ({ ...p, startWeight: numericWeights[i] }));
    setPlayers(updatedPlayers);
    setGameState(teams.length > 0 ? GameState.TEAM_ROUND_TARGET : GameState.ROUND_TARGET);
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
            
            if (target > currentMin - 10) {
                reason = `Das Zielgewicht von ${target}g ist zu hoch. Es muss mindestens 10g unter dem aktuell niedrigsten Füllstand (${currentMin}g) liegen.`;
                correction = currentMin - 10;
            } else if (target < currentMax - 100) {
                reason = `Das Zielgewicht von ${target}g ist zu niedrig. Es darf maximal 100g unter dem aktuell höchsten Füllstand (${currentMax}g) liegen.`;
                correction = currentMax - 100;
            } else {
                reason = "Zielgewicht ungültig.";
                correction = Math.round(range.max);
            }
            setTargetWeightError({ message: reason, correction });
            return;
        }
    }

    setRounds([...rounds, { targetWeight: target, results: {} }]);
    setCurrentRoundResults({});
    setNextTargetInput('');
    setGameState(teams.length > 0 ? GameState.TEAM_GAMEPLAY : GameState.GAMEPLAY);
  };

  const handleNextRound = () => {
    const activePlayers = players.filter(p => !p.isDisqualified);
    if (!activePlayers.every(p => currentRoundResults[p.id] && !isNaN(parseInt(currentRoundResults[p.id])))) {
      alert("Bitte alle Gewichte eintragen.");
      return;
    }

    const updatedRounds = [...rounds];
    const currentRound = updatedRounds[updatedRounds.length - 1];
    activePlayers.forEach(p => { currentRound.results[p.id] = parseInt(currentRoundResults[p.id]); });

    const summary = getRoundSummary(currentRound, players);
    const newlyDisqualified: any[] = [];
    const updatedPlayers = players.map(p => {
      if (p.isDisqualified) return p;
      const weight = currentRound.results[p.id];
      const dist = Math.abs(weight - currentRound.targetWeight);
      let disq = p.isDisqualified;
      if (dist > 50) { 
        disq = true; 
        newlyDisqualified.push({ name: p.name, diff: dist, reason: "Abweichung > 50g" }); 
      }
      
      // Award points for EACH achievement (count occurrences in pointsToAward)
      const pointsThisRound = summary.pointsToAward.filter((id: string) => id === p.id).length;
      
      return { ...p, schnaepse: p.schnaepse + pointsThisRound, isDisqualified: disq };
    });

    finishRoundLogic(updatedPlayers, updatedRounds, newlyDisqualified, summary);
  };

  const finishRoundLogic = (updatedPlayers: Player[], updatedRounds: Round[], newlyDisqualified: any[], summary: any) => {
    const currentRound = updatedRounds[updatedRounds.length - 1];
    const triggerThreshold = isShortMode ? 278 : 445;
    const minStart = Math.min(...updatedPlayers.map(p => p.startWeight));
    const triggers: any[] = [];
    
    if (!currentRound.isFinal) {
      updatedPlayers.forEach(p => {
        if (currentRound.results[p.id] < minStart - triggerThreshold) {
          triggers.push({ name: p.name, weight: currentRound.results[p.id], limit: minStart - triggerThreshold });
        }
      });

      if (triggers.length > 0) {
        setFinalTriggered(true);
        setTriggeringPlayers(triggers);
        setShowAutoTargetModal(null);
      } else {
        const active = updatedPlayers.filter(p => !p.isDisqualified);
        const weights = active.map(p => currentRound.results[p.id]);
        const minW = Math.min(...weights);
        const maxW = Math.max(...weights);
        
        // Auto-target if range size < 10
        // Range is [maxW - 100, minW - 10]
        // Size is (minW - 10) - (maxW - 100) = minW - maxW + 90
        if (active.length > 0 && (minW - maxW + 90 < 10)) {
          setShowAutoTargetModal({ 
            target: Math.round(minW - 10), 
            reason: "Automatisches Zielgewicht gesetzt, da der berechnete Bereich für das Zielgewicht kleiner als 10 Gramm ist." 
          });
        } else {
          setShowAutoTargetModal(null);
        }
      }
    }

    setPlayers(updatedPlayers);
    setSummaryData(summary);
    setRounds(updatedRounds);
    setDisqualifiedNotice(newlyDisqualified.length > 0 ? newlyDisqualified : null);
    setShowSummary(true);
  };

  const handleModalSequence = () => {
    setShowSummary(false);
    if (rounds.length > 0 && rounds[rounds.length - 1].isFinal) {
      setGameState(GameState.RESULT_SCREEN);
    } else if (disqualifiedNotice) {
      setDisqualifiedNotice(null);
    } else {
      triggerNextStep();
    }
  };

  const triggerNextStep = () => {
    if (showAutoTargetModal) {
      handleTargetWeightConfirm(showAutoTargetModal.target);
      setShowAutoTargetModal(null);
      return;
    }
    if (finalTriggered) { setShowFinalIntro(true); return; }
    setGameState(teams.length > 0 ? GameState.TEAM_ROUND_TARGET : GameState.ROUND_TARGET);
  };

  const startFinalSequence = () => { 
    setShowFinalIntro(false); 
    setCurrentRoundTargets({});
    setGameState(GameState.FINAL_ROUND_TARGETS); 
  };

  const handleFinalTargetsConfirm = () => {
    const active = players.filter(p => !p.isDisqualified);
    if (!active.every(p => currentRoundTargets[p.id])) { alert("Alle Leergewichte schätzen."); return; }
    const indTargets: Record<string, number> = {};
    active.forEach(p => indTargets[p.id] = parseInt(currentRoundTargets[p.id]));
    setRounds([...rounds, { targetWeight: 0, individualTargets: indTargets, results: {}, isFinal: true }]);
    setCurrentRoundResults({});
    setGameState(GameState.FINAL_ROUND_RESULTS);
  };

  const handleFinalResultsConfirm = () => {
    const active = players.filter(p => !p.isDisqualified);
    if (!active.every(p => currentRoundResults[p.id])) { alert("Bitte alle Ergebnisse eintragen."); return; }
    const updatedRounds = [...rounds];
    const currentRound = updatedRounds[updatedRounds.length - 1];
    active.forEach(p => { currentRound.results[p.id] = parseInt(currentRoundResults[p.id]); });
    
    if (teams.length > 0) {
      let maxAbsOffset = -1;
      let losingTeamId = "";
      teams.forEach(t => {
        let teamOffset = 0;
        t.playerIds.forEach(pid => {
          const p = players.find(px => px.id === pid);
          if (p && !p.isDisqualified) {
            const target = currentRound.individualTargets?.[pid] || 0;
            teamOffset += (currentRound.results[pid] - target);
          }
        });
        if (Math.abs(teamOffset) > maxAbsOffset) {
          maxAbsOffset = Math.abs(teamOffset);
          losingTeamId = t.id;
        }
      });
      const updatedTeams = teams.map(t => t.id === losingTeamId ? { ...t, points: t.points + 1 } : t);
      setTeams(updatedTeams);
      const summary = { 
        furthestPlayers: [updatedTeams.find(t=>t.id===losingTeamId)?.name || ""], 
        exactHits: [], 
        specialHits: [], 
        duplicates: [], 
        pointsToAward: [] 
      };
      finishRoundLogic(players, updatedRounds, [], summary);
    } else {
      const summary = getRoundSummary(currentRound, players);
      finishRoundLogic(players, updatedRounds, [], summary);
    }
  };

  // Speedwiegen Handlers
  const handleSpeedSetupConfirm = () => {
    if (!speedPlayerName.trim()) { alert("Bitte Namen eingeben."); return; }
    setGameState(GameState.SPEED_CONFIG);
  };

  const handleSpeedConfigConfirm = () => {
    const levels = parseInt(speedLevels);
    for (let i = 1; i <= levels; i++) {
      if (!speedTargets[i]) { alert("Bitte alle Zielgewichte ausfüllen."); return; }
    }
    setGameState(GameState.SPEED_COUNTDOWN);
    setSpeedCountdown(3);
    const interval = setInterval(() => {
      setSpeedCountdown(prev => {
        if (prev === 3) return 2;
        if (prev === 2) return 1;
        if (prev === 1) return "LOS!";
        clearInterval(interval);
        setTimeout(() => {
          setGameState(GameState.SPEED_GAMEPLAY);
          setSpeedStartTime(Date.now());
        }, 1000);
        return prev;
      });
    }, 1000);
  };

  const handleSpeedGameplayConfirm = () => {
    const levels = parseInt(speedLevels);
    for (let i = 1; i <= levels; i++) {
      if (!speedResults[i]) { alert("Bitte alle Ergebnisse eintragen."); return; }
    }
    setSpeedEndTime(Date.now());
    setGameState(GameState.SPEED_RESULT);
  };

  // Teamwiegen Handlers
  const handleTeamSetupConfirm = () => {
    const initialTeams: Team[] = [];
    const initialPlayers: Player[] = [];
    let pIdx = 0;
    for (let i = 1; i <= teamCount; i++) {
      const pIds: string[] = [];
      const size = teamSizes[i] || 2;
      for (let s = 0; s < size; s++) {
        const pId = `p${pIdx++}`;
        pIds.push(pId);
        initialPlayers.push({ id: pId, name: '', startWeight: 0, schnaepse: 0 });
      }
      initialTeams.push({ id: `t${i}`, name: `Team ${i}`, playerIds: pIds, points: 0 });
    }
    setTeams(initialTeams);
    setPlayers(initialPlayers);
    setGameState(GameState.TEAM_NAMES);
  };

  const handleTeamNamesConfirm = () => {
    if (players.some(p => !p.name.trim()) || teams.some(t => !t.name.trim())) {
      alert("Bitte alle Namen ausfüllen.");
      return;
    }
    setTempWeights(new Array(players.length).fill(''));
    setGameState(GameState.TEAM_START_WEIGHTS);
  };

  const handleTeamNextRound = () => {
    const activeTeam = teams[activeTeamIndex];
    if (!activeTeam.playerIds.every(pid => currentRoundResults[pid] && !isNaN(parseInt(currentRoundResults[pid])))) { 
      alert("Bitte alle Gewichte eintragen."); 
      return; 
    }

    if (activeTeamIndex < teams.length - 1) {
      setActiveTeamIndex(activeTeamIndex + 1);
      return;
    }

    // Evaluate whole round
    const updatedRounds = [...rounds];
    const currentRound = updatedRounds[updatedRounds.length - 1];
    players.forEach(p => { currentRound.results[p.id] = parseInt(currentRoundResults[p.id]); });

    let maxAbsOffset = -1;
    let losingTeamId = "";
    teams.forEach(t => {
      let teamOffset = 0;
      t.playerIds.forEach(pid => {
        teamOffset += (parseInt(currentRoundResults[pid]) - currentRound.targetWeight);
      });
      if (Math.abs(teamOffset) > maxAbsOffset) {
        maxAbsOffset = Math.abs(teamOffset);
        losingTeamId = t.id;
      }
    });

    const updatedTeams = teams.map(t => t.id === losingTeamId ? { ...t, points: t.points + 1 } : t);
    setTeams(updatedTeams);
    setActiveTeamIndex(0);
    
    setRounds(updatedRounds);
    
    // Check for final round trigger
    const triggerThreshold = isShortMode ? 278 : 450;
    const minStart = Math.min(...players.map(p => p.startWeight));
    const triggers: any[] = [];
    players.forEach(p => {
      if (currentRound.results[p.id] < minStart - triggerThreshold) {
        triggers.push({ name: p.name, weight: currentRound.results[p.id], limit: minStart - triggerThreshold });
      }
    });

    if (triggers.length > 0) {
      setFinalTriggered(true);
      setTriggeringPlayers(triggers);
    }

    setSummaryData({ furthestPlayers: [updatedTeams.find(t=>t.id===losingTeamId)?.name || ""], exactHits: [], specialHits: [], duplicates: [], pointsToAward: [] });
    setShowSummary(true);
  };

  const downloadCSV = () => {
    let csv = "";
    if (gameState === GameState.SPEED_RESULT) {
      csv = "Stufe;Ziel;Ergebnis;Abstand\n";
      Array.from({ length: parseInt(speedLevels) }).forEach((_, i) => {
        const target = speedTargets[i+1];
        const result = speedResults[i+1];
        const diff = Math.abs((parseInt(result) || 0) - (parseInt(target) || 0));
        csv += `${i+1};${target}g;${result}g;${diff}g\n`;
      });
      const timeSec = (speedEndTime! - speedStartTime!) / 1000;
      csv += `\nZeit;${timeSec.toFixed(2)}s\n`;
      const totalDiff = Object.keys(speedResults).reduce((acc, key) => {
        const k = parseInt(key);
        return acc + Math.abs((parseInt(speedResults[k]) || 0) - (parseInt(speedTargets[k]) || 0));
      }, 0);
      csv += `Gesamt-Score;${(timeSec + totalDiff).toFixed(2)}\n`;
    } else {
      csv = "Runde;Ziel;";
      players.forEach(p => csv += `${p.name};`);
      csv += "\n";
      rounds.forEach((r, i) => {
        csv += `${i+1};${r.isFinal ? 'Finale' : r.targetWeight + 'g'};`;
        players.forEach(p => csv += `${r.results[p.id] || '-'};`);
        csv += "\n";
      });
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = gameState === GameState.SPEED_RESULT ? `Speedwiegen_${speedPlayerName}.csv` : "Bundeswiega_Export.csv";
    a.click();
  };

  const showModeFooter = ![GameState.START, GameState.PLAYER_COUNT, GameState.TEAM_SETUP, GameState.SPEED_SETUP].includes(gameState);

  return (
    <div className={`min-h-screen flex flex-col p-4 md:p-8 transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <header className="flex justify-between items-center mb-8 max-w-6xl mx-auto w-full">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => gameState !== GameState.START && setShowResetConfirm(true)}>
          <img src={LOGO_URL} alt="Logo" className="w-10 h-10 object-contain" />
          <h1 className="text-2xl font-black tracking-tighter" style={{ color: BRAND_COLOR }}>1. Bundeswiega</h1>
        </div>
        <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full border border-gray-700/30">
          <i className={`fas ${darkMode ? 'fa-sun text-yellow-400' : 'fa-moon text-indigo-600'}`}></i>
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center max-w-4xl w-full mx-auto relative">
        {gameState === GameState.START && (
          <div className="text-center animate-in fade-in duration-700">
            <img src={LOGO_URL} className="w-64 h-64 mx-auto mb-12 drop-shadow-2xl" alt="Bundeswiega Logo" />
            <h1 className="text-5xl font-black mb-12 tracking-tighter uppercase" style={{ color: BRAND_COLOR }}>1. Bundeswiega</h1>
            <div className="flex flex-col space-y-4 max-w-xs mx-auto">
              <button onClick={startGame} className="text-white font-bold py-5 rounded-3xl shadow-xl active:scale-95 text-xl flex items-center justify-center space-x-2" style={{ backgroundColor: BRAND_COLOR }}>
                <i className="fas fa-play"></i><span>Spiel starten</span>
              </button>
              <button onClick={startSpeedwiegen} className="text-white font-bold py-5 rounded-3xl shadow-xl active:scale-95 text-xl flex items-center justify-center space-x-2" style={{ backgroundColor: DARK_GRAY }}>
                <i className="fas fa-bolt"></i><span>Speedwiegen</span>
              </button>
              <button onClick={startTeamwiegen} className="text-white font-bold py-5 rounded-3xl shadow-xl active:scale-95 text-xl flex items-center justify-center space-x-2" style={{ backgroundColor: DARK_GRAY }}>
                <i className="fas fa-users"></i><span>Teamwiegen</span>
              </button>
              <button onClick={() => setShowRules(true)} className="text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 flex items-center justify-center space-x-2" style={{ backgroundColor: BRAND_COLOR }}>
                <i className="fas fa-book"></i><span>Regeln</span>
              </button>
            </div>
          </div>
        )}

        {/* PLAYER_COUNT SCREEN */}
        {gameState === GameState.PLAYER_COUNT && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-md text-center">
            <h2 className="text-2xl font-black mb-8">Spieleranzahl</h2>
            <select value={playerCount} onChange={e => setPlayerCount(parseInt(e.target.value))} className="w-full p-4 rounded-xl border-2 mb-8 bg-transparent font-bold text-center" style={{ borderColor: BRAND_COLOR }}>
              {[2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} Spieler</option>)}
            </select>
            <div className="flex items-center justify-center space-x-4 mb-8">
              <div className="flex items-center space-x-2">
                <div className="relative inline-block w-10 h-6">
                  <input type="checkbox" id="sm-count" checked={isShortMode} onChange={e => setIsShortMode(e.target.checked)} className="opacity-0 w-0 h-0" />
                  <label htmlFor="sm-count" className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${isShortMode ? '' : 'bg-gray-400'}`} style={{ backgroundColor: isShortMode ? BRAND_COLOR : undefined }}>
                    <span className={`absolute left-1 bottom-1 bg-white w-4 h-4 rounded-full transition-transform ${isShortMode ? 'translate-x-4' : ''}`}></span>
                  </label>
                </div>
                <label htmlFor="sm-count" className="font-bold text-sm">0,33 L Modus</label>
              </div>
              <button onClick={() => setShowModeInfo(true)} className="w-6 h-6 rounded-full border border-gray-500 text-xs flex items-center justify-center text-gray-500"><i className="fas fa-question"></i></button>
            </div>
            <button onClick={handlePlayerCountConfirm} className="w-full text-white font-bold py-4 rounded-2xl active:scale-95 shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>Namen eingeben</button>
          </div>
        )}

        {/* PLAYER_NAMES SCREEN */}
        {gameState === GameState.PLAYER_NAMES && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-xl">
            <h2 className="text-2xl font-black mb-8 text-center">Spielernamen</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {players.map((p, i) => (
                <input key={p.id} type="text" value={p.name} onChange={e => setPlayers(players.map(x => x.id === p.id ? {...x, name: e.target.value} : x))} placeholder={`Spieler ${i+1}`} className={`p-3 rounded-xl border-2 bg-transparent font-bold ${darkMode ? 'text-white border-white/20' : 'text-black border-black/20'}`} style={{ borderColor: players[i].name ? BRAND_COLOR : '' }} />
              ))}
            </div>
            <button onClick={handlePlayerNamesConfirm} className="w-full text-white font-bold py-4 rounded-2xl active:scale-95 shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>Startgewichte</button>
          </div>
        )}

        {/* START_WEIGHTS SCREEN */}
        {gameState === GameState.START_WEIGHTS && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-xl">
            <h2 className="text-2xl font-black mb-6 text-center">Startgewichte (g)</h2>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {players.map((p, i) => (
                <div key={p.id} className="relative">
                  <label className="text-[10px] font-bold opacity-50 uppercase mb-1 block">{p.name}</label>
                  <input type="number" min="0" max="999" value={tempWeights[i]} onChange={e => { const nw = [...tempWeights]; nw[i] = e.target.value.slice(0, 3); setTempWeights(nw); }} className={`w-full p-2 rounded-lg border-2 bg-transparent font-bold ${darkMode ? 'text-white border-white/20' : 'text-black border-black/20'}`} style={{ borderColor: tempWeights[i] ? BRAND_COLOR : '' }} />
                </div>
              ))}
            </div>
            <button onClick={onWeightsSubmit} className="w-full text-white font-bold py-4 rounded-2xl active:scale-95 shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>Zielgewicht festlegen</button>
          </div>
        )}

        {/* ROUND_TARGET SCREEN */}
        {gameState === GameState.ROUND_TARGET && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-md text-center">
            <h2 className="text-3xl font-black mb-6">Zielgewicht</h2>
            <p className="text-xs font-bold opacity-40 uppercase tracking-widest mb-4">Aktuelle Füllstände</p>
            <div className="mb-6 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {players.map(p => (
                <div key={p.id} className={`flex justify-between p-2 rounded-xl ${darkMode ? 'bg-white/10' : 'bg-black/10'} text-[10px] md:text-xs`}>
                  <span>{p.name}</span>
                  <span className="font-black">{p.isDisqualified ? '❌' : (rounds.length === 0 ? p.startWeight : rounds[rounds.length-1].results[p.id]) + 'g'}</span>
                </div>
              ))}
            </div>
            {(() => {
              const act = players.filter(p => !p.isDisqualified).map(p => rounds.length === 0 ? p.startWeight : rounds[rounds.length-1].results[p.id]);
              const range = getTargetRange(act);
              return (
                <div className="mb-6">
                  <p className="text-xs opacity-50 mb-2">Gültiger Bereich: {Math.round(range.min)}g - {Math.round(range.max)}g</p>
                  <input type="number" min="0" max="999" value={nextTargetInput} onChange={e => setNextTargetInput(e.target.value.slice(0, 3))} className={`w-full p-4 rounded-xl border-4 text-center font-black text-4xl bg-transparent ${darkMode ? 'text-white border-white/20' : 'text-black border-black/20'}`} style={{ borderColor: BRAND_COLOR }} placeholder="?" />
                </div>
              );
            })()}
            <button onClick={() => handleTargetWeightConfirm()} className="w-full text-white font-bold py-5 rounded-2xl active:scale-95 shadow-xl" style={{ backgroundColor: BRAND_COLOR }}>Bestätigen</button>
          </div>
        )}

        {/* GAMEPLAY SCREEN */}
        {gameState === GameState.GAMEPLAY && (
          <div className="w-full space-y-4 animate-in fade-in max-h-[90vh] overflow-y-auto pb-10 flex flex-col items-center">
             <h2 className="text-2xl font-black uppercase text-center" style={{ color: BRAND_COLOR }}>Runde {rounds.length}</h2>
             <GameTable 
               showInputs={true} 
               players={players} 
               rounds={rounds} 
               darkMode={darkMode} 
               currentRoundResults={currentRoundResults} 
               setCurrentRoundResults={setCurrentRoundResults} 
             />
             <button onClick={handleNextRound} className="w-full max-w-sm text-white font-black py-5 rounded-2xl active:scale-95 shadow-2xl" style={{ backgroundColor: BRAND_COLOR }}>Runde auswerten</button>
          </div>
        )}

        {/* TEAM SETUP SCREENS */}
        {gameState === GameState.TEAM_SETUP && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-md text-center">
            <h2 className="text-2xl font-black mb-8">Teamwiegen Setup</h2>
            <div className="mb-8">
              <label className="block text-sm font-bold opacity-50 uppercase mb-2">Anzahl Teams</label>
              <select value={teamCount} onChange={e => setTeamCount(parseInt(e.target.value))} className="w-full p-3 rounded-xl border-2 bg-transparent font-bold text-center" style={{ borderColor: BRAND_COLOR }}>
                {[2,3,4,5].map(n => <option key={n} value={n}>{n} Teams</option>)}
              </select>
            </div>
            <div className="space-y-4 mb-8">
              {Array.from({ length: teamCount }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="font-bold">Team {i+1} Größe:</span>
                  <select value={teamSizes[i+1] || 2} onChange={e => setTeamSizes({...teamSizes, [i+1]: parseInt(e.target.value)})} className="p-2 rounded-lg border bg-transparent font-bold">
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Pers.</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center space-x-4 mb-8">
              <div className="flex items-center space-x-2">
                <div className="relative inline-block w-10 h-6">
                  <input type="checkbox" id="team-sm-count" checked={isShortMode} onChange={e => setIsShortMode(e.target.checked)} className="opacity-0 w-0 h-0" />
                  <label htmlFor="team-sm-count" className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${isShortMode ? '' : 'bg-gray-400'}`} style={{ backgroundColor: isShortMode ? BRAND_COLOR : undefined }}>
                    <span className={`absolute left-1 bottom-1 bg-white w-4 h-4 rounded-full transition-transform ${isShortMode ? 'translate-x-4' : ''}`}></span>
                  </label>
                </div>
                <label htmlFor="team-sm-count" className="font-bold text-sm">0,33 L Modus</label>
              </div>
              <button onClick={() => setShowModeInfo(true)} className="w-6 h-6 rounded-full border border-gray-500 text-xs flex items-center justify-center text-gray-500"><i className="fas fa-question"></i></button>
            </div>
            <button onClick={handleTeamSetupConfirm} className="w-full text-white font-bold py-4 rounded-2xl shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>Teams benennen</button>
          </div>
        )}

        {gameState === GameState.TEAM_NAMES && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-2xl overflow-y-auto max-h-[80vh]">
            <h2 className="text-2xl font-black mb-8 text-center">Team- & Spielernamen</h2>
            <div className="space-y-8">
              {teams.map((t, tIdx) => (
                <div key={t.id} className="p-4 rounded-2xl bg-black/10 border-l-4" style={{ borderColor: PLAYER_COLORS[tIdx % PLAYER_COLORS.length] }}>
                  <input type="text" value={t.name} onChange={e => setTeams(teams.map(x => x.id === t.id ? {...x, name: e.target.value} : x))} className="w-full text-xl font-black bg-transparent mb-4 border-b border-white/20" placeholder={`Name für ${t.id}`} />
                  <div className="grid grid-cols-2 gap-3">
                    {t.playerIds.map(pid => {
                      const p = players.find(px => px.id === pid);
                      return (
                        <input key={pid} type="text" value={p?.name || ''} onChange={e => setPlayers(players.map(x => x.id === pid ? {...x, name: e.target.value} : x))} className="p-2 rounded-lg border bg-transparent font-bold text-sm" placeholder="Spieler Name" />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleTeamNamesConfirm} className="w-full mt-8 text-white font-bold py-4 rounded-2xl shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>Startgewichte</button>
          </div>
        )}

        {gameState === GameState.TEAM_START_WEIGHTS && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-2xl overflow-y-auto max-h-[80vh]">
            <h2 className="text-2xl font-black mb-8 text-center">Team-Startgewichte</h2>
            <div className="space-y-6">
              {teams.map((t, tIdx) => (
                <div key={t.id} className="p-4 rounded-2xl bg-black/10">
                  <h3 className="font-black text-sm uppercase opacity-50 mb-3" style={{ color: PLAYER_COLORS[tIdx % PLAYER_COLORS.length] }}>{t.name}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {t.playerIds.map(pid => {
                      const p = players.find(px => px.id === pid)!;
                      const pGlobalIdx = players.indexOf(p);
                      return (
                        <div key={pid}>
                          <label className="text-[10px] font-bold opacity-40">{p.name}</label>
                          <input type="number" min="0" max="999" value={tempWeights[pGlobalIdx]} onChange={e => { const nw = [...tempWeights]; nw[pGlobalIdx] = e.target.value.slice(0, 3); setTempWeights(nw); }} className="w-full p-2 rounded-lg border bg-transparent font-bold" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={onWeightsSubmit} className="w-full mt-8 text-white font-bold py-4 rounded-2xl shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>Zielgewicht</button>
          </div>
        )}

        {gameState === GameState.TEAM_ROUND_TARGET && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-md text-center">
            <h2 className="text-3xl font-black mb-6">Team-Ziel</h2>
            <p className="text-xs font-bold opacity-40 uppercase tracking-widest mb-4">Aktuelle Füllstände</p>
            <div className="mb-6 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {players.map(p => (
                <div key={p.id} className={`flex justify-between p-2 rounded-xl ${darkMode ? 'bg-white/10' : 'bg-black/10'} text-[10px] md:text-xs`}>
                  <span>{p.name}</span>
                  <span className="font-black">{(rounds.length === 0 ? p.startWeight : rounds[rounds.length-1].results[p.id]) + 'g'}</span>
                </div>
              ))}
            </div>
            {(() => {
              const act = players.map(p => rounds.length === 0 ? p.startWeight : rounds[rounds.length-1].results[p.id]);
              const range = getTargetRange(act);
              return (
                <div className="mb-6">
                  <p className="text-xs opacity-50 mb-2">Bereich: {Math.round(range.min)}g - {Math.round(range.max)}g</p>
                  <input type="number" min="0" max="999" value={nextTargetInput} onChange={e => setNextTargetInput(e.target.value.slice(0, 3))} className="w-full p-4 rounded-xl border-4 text-center font-black text-4xl bg-transparent" style={{ borderColor: BRAND_COLOR }} placeholder="?" />
                </div>
              );
            })()}
            <button onClick={() => handleTargetWeightConfirm()} className="w-full text-white font-bold py-4 rounded-2xl shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>Start</button>
          </div>
        )}

        {gameState === GameState.TEAM_GAMEPLAY && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-xl text-center">
            <h2 className="text-2xl font-black mb-2 uppercase" style={{ color: BRAND_COLOR }}>Runde {rounds.length}</h2>
            <h3 className="text-4xl font-black mb-8 italic">{teams[activeTeamIndex].name}</h3>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {teams[activeTeamIndex].playerIds.map(pid => {
                const p = players.find(px => px.id === pid);
                const val = parseInt(currentRoundResults[pid]);
                const target = rounds[rounds.length - 1].targetWeight;
                const diff = !isNaN(val) ? val - target : null;
                return (
                  <div key={pid}>
                    <label className="block text-xs font-bold opacity-50 uppercase mb-1">{p?.name}</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="999" 
                      value={currentRoundResults[pid] || ''} 
                      onChange={e => setCurrentRoundResults({...currentRoundResults, [pid]: e.target.value.slice(0, 3)})} 
                      className="w-full p-4 rounded-xl border-2 bg-transparent text-center font-black text-2xl" 
                      placeholder="g" 
                    />
                    {diff !== null && (
                      <div className={`mt-1 font-black text-lg ${diff > 0 ? 'text-emerald-500' : diff < 0 ? 'text-red-500' : 'opacity-50'}`}>
                        {diff > 0 ? `+${diff}` : diff}g
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {(() => {
              const target = rounds[rounds.length - 1].targetWeight;
              const teamSumDiff = teams[activeTeamIndex].playerIds.reduce((acc, pid) => {
                const val = parseInt(currentRoundResults[pid]);
                return acc + (!isNaN(val) ? val - target : 0);
              }, 0);
              const allEntered = teams[activeTeamIndex].playerIds.every(pid => !isNaN(parseInt(currentRoundResults[pid])));
              if (!allEntered && teamSumDiff === 0) return null;
              return (
                <div className={`mb-8 p-4 rounded-2xl ${darkMode ? 'bg-white/5' : 'bg-black/5'} border-2 ${teamSumDiff > 0 ? 'border-emerald-500/30' : teamSumDiff < 0 ? 'border-red-500/30' : 'border-white/10'}`}>
                  <p className="text-[10px] font-bold opacity-50 uppercase mb-1">Team-Gesamtabstand</p>
                  <p className={`text-3xl font-black ${teamSumDiff > 0 ? 'text-emerald-500' : teamSumDiff < 0 ? 'text-red-500' : ''}`}>
                    {teamSumDiff > 0 ? `+${teamSumDiff}` : teamSumDiff}g
                  </p>
                </div>
              );
            })()}
            <button onClick={handleTeamNextRound} className="w-full text-white font-bold py-5 rounded-2xl shadow-xl active:scale-95" style={{ backgroundColor: BRAND_COLOR }}>
              {activeTeamIndex < teams.length - 1 ? 'Nächstes Team' : 'Runde auswerten'}
            </button>
          </div>
        )}

        {/* SPEEDWIEGEN SCREENS */}
        {gameState === GameState.SPEED_SETUP && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-md text-center">
            <h2 className="text-2xl font-black mb-8">Speedwiegen Setup</h2>
            <input type="text" value={speedPlayerName} onChange={e => setSpeedPlayerName(e.target.value)} className="w-full p-4 rounded-xl border-2 mb-4 bg-transparent font-bold" placeholder="Dein Name" />
            <select value={speedLevels} onChange={e => setSpeedLevels(e.target.value)} className="w-full p-4 rounded-xl border-2 mb-8 bg-transparent font-bold">
              {[3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} Stufen</option>)}
            </select>
            <button onClick={handleSpeedSetupConfirm} className="w-full text-white font-bold py-4 rounded-2xl shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>Ziele definieren</button>
          </div>
        )}

        {gameState === GameState.SPEED_CONFIG && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-xl overflow-y-auto max-h-[80vh]">
            <h2 className="text-2xl font-black mb-8 text-center">Zielgewichte festlegen</h2>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {Array.from({ length: parseInt(speedLevels) }).map((_, i) => (
                <div key={i+1}>
                  <label className="text-xs font-bold opacity-50 uppercase">Stufe {i+1}</label>
                  <input type="number" min="0" max="999" value={speedTargets[i+1] || ''} onChange={e => setSpeedTargets({...speedTargets, [i+1]: e.target.value.slice(0, 3)})} className="w-full p-3 rounded-xl border-2 bg-transparent text-center font-bold" placeholder="g" />
                </div>
              ))}
            </div>
            <button onClick={handleSpeedConfigConfirm} className="w-full text-white font-bold py-4 rounded-2xl shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>Countdown starten</button>
          </div>
        )}

        {gameState === GameState.SPEED_COUNTDOWN && (
          <div className="text-center animate-pulse">
            <h2 className="text-2xl font-black mb-12 uppercase opacity-50">Bereitmachen...</h2>
            <div className="text-[120px] font-black" style={{ color: BRAND_COLOR }}>{speedCountdown}</div>
          </div>
        )}

        {gameState === GameState.SPEED_GAMEPLAY && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-2xl text-center">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black uppercase">{speedPlayerName}</h2>
              <div className="text-3xl font-mono font-black text-emerald-500">{(speedCurrentTime / 1000).toFixed(2)}s</div>
            </div>
            
            <div className="overflow-x-auto mb-8 bg-black/10 rounded-2xl p-2">
              <table className={`w-full text-sm text-left border-collapse ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="py-2 px-4">Stufe</th>
                    <th className="py-2 px-4">Ziel (g)</th>
                    <th className="py-2 px-4">Ergebnis (g)</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: parseInt(speedLevels) }).map((_, i) => (
                    <tr key={i+1} className="border-b border-white/10">
                      <td className="py-3 px-4 font-bold">{i+1}</td>
                      <td className="py-3 px-4 font-black">{speedTargets[i+1]}g</td>
                      <td className="py-3 px-4">
                        <input 
                          type="number" 
                          min="0" 
                          max="999" 
                          value={speedResults[i+1] || ''} 
                          onChange={e => setSpeedResults({...speedResults, [i+1]: e.target.value.slice(0, 3)})} 
                          className={`w-20 p-2 rounded border-2 ${darkMode ? 'border-brand/60 bg-slate-800 text-white' : 'border-brand/40 bg-white text-black'} text-center font-black`}
                          placeholder="?" 
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <button onClick={handleSpeedGameplayConfirm} className="w-full text-white font-bold py-5 rounded-2xl shadow-xl active:scale-95" style={{ backgroundColor: BRAND_COLOR }}>Stop & Auswerten</button>
          </div>
        )}

        {gameState === GameState.SPEED_RESULT && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-2xl text-center">
            <h2 className="text-3xl font-black mb-2 uppercase" style={{ color: BRAND_COLOR }}>Ergebnis</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className={`p-4 rounded-2xl ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                <p className="text-[10px] font-bold opacity-50 uppercase mb-1">Zeit</p>
                <p className="text-3xl font-mono font-black text-emerald-500">{((speedEndTime! - speedStartTime!) / 1000).toFixed(2)}s</p>
              </div>
              <div className={`p-4 rounded-2xl ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                <p className="text-[10px] font-bold opacity-50 uppercase mb-1">Gesamt-Score</p>
                <p className="text-3xl font-mono font-black" style={{ color: BRAND_COLOR }}>
                  {(() => {
                    const timeSec = (speedEndTime! - speedStartTime!) / 1000;
                    const totalDiff = Object.keys(speedResults).reduce((acc, key) => {
                      const k = parseInt(key);
                      return acc + Math.abs((parseInt(speedResults[k]) || 0) - (parseInt(speedTargets[k]) || 0));
                    }, 0);
                    return (timeSec + totalDiff).toFixed(2);
                  })()}
                </p>
              </div>
            </div>

            <div ref={rankingAreaRef} className="overflow-x-auto mb-8 p-4 rounded-2xl bg-black/10">
              <table className={`w-full text-sm text-left border-collapse ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="py-2 px-4">Stufe</th>
                    <th className="py-2 px-4">Ziel</th>
                    <th className="py-2 px-4">Ergebnis</th>
                    <th className="py-2 px-4">Abstand</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: parseInt(speedLevels) }).map((_, i) => {
                    const target = parseInt(speedTargets[i+1]) || 0;
                    const result = parseInt(speedResults[i+1]) || 0;
                    const diff = Math.abs(result - target);
                    return (
                      <tr key={i+1} className="border-b border-white/10">
                        <td className="py-3 px-4 font-bold">{i+1}</td>
                        <td className="py-3 px-4">{target}g</td>
                        <td className="py-3 px-4 font-black">{result}g</td>
                        <td className="py-3 px-4 text-red-500 font-bold">+{diff}g</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button onClick={() => captureElement(rankingAreaRef, `Speed_Result_${speedPlayerName}`)} className="py-4 rounded-2xl border-2 font-black text-xs shadow-md"><i className="fas fa-image mr-2"></i>Screenshot</button>
              <button onClick={() => setShowStats(true)} className="py-4 rounded-2xl bg-brand text-white font-black shadow-lg" style={{ backgroundColor: BRAND_COLOR }}><i className="fas fa-chart-line mr-2"></i>Statistik</button>
              <button onClick={downloadCSV} className="py-4 rounded-2xl bg-emerald-600 text-white font-black shadow-lg"><i className="fas fa-file-csv mr-2"></i>CSV erstellen</button>
              <button onClick={resetToStart} className="py-4 rounded-2xl border-2 font-bold uppercase">Hauptmenü</button>
            </div>
          </div>
        )}

        {gameState === GameState.FINAL_ROUND_TARGETS && (
          <div className="p-8 rounded-3xl bg-black/5 border border-gray-700/20 shadow-xl w-full max-w-xl">
            <h2 className="text-2xl font-black mb-8 text-center uppercase" style={{ color: BRAND_COLOR }}>Leergewicht schätzen</h2>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {players.filter(p => !p.isDisqualified).map(p => (
                <div key={p.id}>
                  <label className="text-[10px] font-bold opacity-50 uppercase mb-1 block">{p.name}</label>
                  <input type="number" min="0" max="999" value={currentRoundTargets[p.id] || ''} onChange={e => setCurrentRoundTargets({...currentRoundTargets, [p.id]: e.target.value.slice(0, 3)})} className="w-full p-2 rounded-lg border-2 bg-transparent font-bold" placeholder="g" />
                </div>
              ))}
            </div>
            <button onClick={handleFinalTargetsConfirm} className="w-full text-white font-bold py-4 rounded-2xl shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>Bestätigen</button>
          </div>
        )}

        {gameState === GameState.FINAL_ROUND_RESULTS && (
          <div className="w-full space-y-4 animate-in fade-in max-h-[90vh] overflow-y-auto pb-10 flex flex-col items-center">
             <h2 className="text-2xl font-black uppercase text-center" style={{ color: BRAND_COLOR }}>Leergewicht messen</h2>
             <GameTable 
               showInputs={true} 
               players={players} 
               rounds={rounds} 
               darkMode={darkMode} 
               currentRoundResults={currentRoundResults} 
               setCurrentRoundResults={setCurrentRoundResults} 
             />
             <button onClick={handleFinalResultsConfirm} className="w-full max-w-sm text-white font-black py-5 rounded-2xl active:scale-95 shadow-2xl" style={{ backgroundColor: BRAND_COLOR }}>Finale auswerten</button>
          </div>
        )}

        {/* SHARED RESULTS SCREEN */}
        {gameState === GameState.RESULT_SCREEN && (
          <div className="w-full space-y-8 pb-20 animate-in fade-in duration-500 overflow-y-auto max-h-screen">
             <h2 className="text-4xl font-black text-center uppercase" style={{ color: BRAND_COLOR }}>Endergebnis</h2>
             
             {teams.length > 0 ? (
               <div ref={rankingAreaRef} className={`p-6 rounded-3xl ${darkMode ? 'bg-white/5' : 'bg-black/5'} border ${darkMode ? 'border-white/10' : 'border-gray-700/20'} shadow-xl`}>
                 <h3 className="text-xl font-black mb-6 uppercase flex items-center"><i className="fas fa-trophy mr-3 text-yellow-500"></i>Team-Ranking</h3>
                 <table className="w-full text-left">
                    <thead><tr className={`opacity-70 text-xs font-bold uppercase border-b ${darkMode ? 'border-white/10' : 'border-gray-700/10'}`}><th className="pb-2">#</th><th className="pb-2">Team</th><th className="text-center pb-2">Schnäpse</th></tr></thead>
                    <tbody>
                      {teams.sort((a,b) => b.points - a.points).map((t, idx) => (
                        <tr key={t.id} className={`border-t ${darkMode ? 'border-white/5' : 'border-gray-700/10'}`}>
                          <td className="py-4 font-black">{idx+1}</td>
                          <td className="py-4 font-black">{t.name}</td>
                          <td className="text-center font-black" style={{ color: BRAND_COLOR }}>{t.points}</td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
             ) : (
               <div ref={rankingAreaRef} className={`p-6 rounded-3xl ${darkMode ? 'bg-white/5' : 'bg-black/5'} border ${darkMode ? 'border-white/10' : 'border-gray-700/20'} shadow-xl`}>
                 <h3 className="text-xl font-black mb-6 uppercase flex items-center"><i className="fas fa-trophy mr-3 text-yellow-500"></i>Ranking</h3>
                 <table className="w-full text-left">
                    <thead><tr className={`opacity-70 text-xs font-bold uppercase border-b ${darkMode ? 'border-white/10' : 'border-gray-700/10'}`}><th className="pb-2">#</th><th className="pb-2">Spieler</th><th className="text-center pb-2">Ø Abst.</th><th className="text-center pb-2">S.</th><th className="text-center pb-2">Total</th></tr></thead>
                    <tbody>
                      {players.map(p => ({...p, avg: calculateAverageDistance(p.id, rounds), tot: calculateAverageDistance(p.id, rounds) + p.schnaepse}))
                        .sort((a,b)=> (a.isDisqualified ? 1 : b.isDisqualified ? -1 : a.tot - b.tot))
                        .map((p, idx) => (
                          <tr key={p.id} className={`border-t ${darkMode ? 'border-white/5' : 'border-gray-700/10'}`}>
                            <td className="py-4 font-black">{p.isDisqualified ? '💀' : idx+1}</td>
                            <td className={`py-4 font-black ${p.isDisqualified ? 'line-through opacity-40' : ''}`}>{p.name}</td>
                            <td className="text-center">{p.isDisqualified ? '-' : p.avg.toFixed(1)}g</td>
                            <td className="text-center font-bold">{p.schnaepse}</td>
                            <td className="text-center font-black" style={{ color: BRAND_COLOR }}>{p.isDisqualified ? '-' : p.tot.toFixed(1)}</td>
                          </tr>
                        ))}
                    </tbody>
                 </table>
               </div>
             )}

             {rounds.length > 0 && (
               <div ref={roundsAreaRef} className="w-full">
                 <h3 className="text-xl font-black mb-4 uppercase ml-2 flex items-center"><i className="fas fa-table mr-3 opacity-40"></i>Spieltabelle</h3>
                 <GameTable 
                   players={players} 
                   rounds={rounds} 
                   darkMode={darkMode} 
                   currentRoundResults={currentRoundResults} 
                   setCurrentRoundResults={setCurrentRoundResults} 
                 />
               </div>
             )}

              <div className="grid grid-cols-2 gap-3 px-2">
                <button onClick={() => setShowStats(true)} className="py-4 rounded-2xl bg-brand text-white font-black shadow-lg" style={{ backgroundColor: BRAND_COLOR }}><i className="fas fa-chart-line mr-2"></i>Statistik</button>
                <button onClick={downloadCSV} className="py-4 rounded-2xl bg-emerald-600 text-white font-black shadow-lg"><i className="fas fa-file-csv mr-2"></i>CSV erstellen</button>
                <button onClick={() => captureElement(rankingAreaRef, 'Ranking')} className={`py-4 rounded-2xl border-2 font-black text-xs shadow-md ${darkMode ? 'border-white/20' : 'border-black/20'}`}><i className="fas fa-image mr-2"></i>Screenshot Ranking</button>
                <button onClick={() => captureElement(roundsAreaRef, 'Tabelle')} className={`py-4 rounded-2xl border-2 font-black text-xs shadow-md ${darkMode ? 'border-white/20' : 'border-black/20'}`}><i className="fas fa-table mr-2"></i>Screenshot Tabelle</button>
              </div>
              <button onClick={resetToStart} className={`w-full py-5 rounded-2xl border-2 font-black opacity-60 uppercase tracking-widest mt-4 ${darkMode ? 'border-white/20' : 'border-black/20'}`}>zurück zum Hauptmenü</button>
          </div>
        )}
      </main>

      <footer className="mt-auto pt-8 pb-4 relative">
        <div className={`text-center text-[10px] font-black uppercase tracking-widest transition-opacity duration-500 ${showModeFooter ? 'opacity-40' : 'opacity-0'}`}>
          {isShortMode ? '0,33 L Modus' : '500 ml Modus'}
        </div>
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="absolute bottom-4 right-4 p-3 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white shadow-lg transition-transform hover:scale-110 active:scale-90 z-50">
          <i className="fab fa-instagram text-xl"></i>
        </a>
      </footer>

      {/* --- MODALS --- */}
      {showSummary && summaryData && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`rounded-3xl p-8 max-w-lg w-full shadow-2xl border-2 overflow-y-auto max-h-[90vh] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white'}`}>
            <h3 className="text-3xl font-black mb-8 text-center uppercase tracking-tighter" style={{ color: BRAND_COLOR }}>Rundenergebnis</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border bg-red-500/10 flex items-center">
                <i className="fas fa-skull text-red-500 mr-4 text-xl"></i>
                <div><p className="text-[10px] font-bold opacity-50 uppercase">{teams.length ? 'Verlierer Team' : 'Größter Abstand'}</p><p className="text-lg font-black">{summaryData.furthestPlayers.join(' & ')}</p></div>
              </div>
              {!teams.length && summaryData.exactHits.length > 0 && (
                <div className="p-4 rounded-2xl border bg-emerald-500/10 flex items-center">
                  <i className="fas fa-bullseye text-emerald-500 mr-4 text-xl"></i>
                  <div><p className="text-[10px] font-bold opacity-50 uppercase">Volltreffer!</p><p className="text-lg font-black">{summaryData.exactHits.join(', ')}</p></div>
                </div>
              )}
              {!teams.length && summaryData.specialHits.length > 0 && (
                <div className="p-4 rounded-2xl border bg-amber-500/10 flex items-center">
                  <span className="text-2xl mr-4">🥂</span>
                  <div><p className="text-[10px] font-bold opacity-50 uppercase">Schnappszahl!</p><p className="text-sm font-black">{summaryData.specialHits.map((s:any)=>`${s.playerName} (${s.value}g)`).join(', ')}</p></div>
                </div>
              )}
              {!teams.length && summaryData.duplicates.length > 0 && (
                <div className="p-4 rounded-2xl border bg-indigo-500/10 flex items-center">
                  <i className="fas fa-clone text-indigo-500 mr-4 text-xl"></i>
                  <div><p className="text-[10px] font-bold opacity-50 uppercase">Wiegezwillinge!</p><p className="text-sm font-black">{summaryData.duplicates.map((d:any)=>`${d.playerNames.join(' & ')} (${d.weight}g)`).join(', ')}</p></div>
                </div>
              )}
            </div>
            <button onClick={handleModalSequence} className="w-full mt-10 text-white font-black py-5 rounded-2xl shadow-xl uppercase active:scale-95" style={{ backgroundColor: BRAND_COLOR }}>Weiter</button>
          </div>
        </div>
      )}

      {showFinalIntro && (
        <div className="fixed inset-0 z-[420] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl text-center">
          <div className="max-w-lg w-full">
            <h2 className="text-5xl font-black mb-6 uppercase text-yellow-500 italic animate-pulse">Das Finale</h2>
            <div className={`bg-white/5 border ${darkMode ? 'border-white/10' : 'border-black/10'} p-8 rounded-3xl mb-12 text-white text-left`}>
              <p className="text-xs font-bold opacity-50 uppercase mb-4 tracking-widest">Die letzte Runde wurde ausgelöst:</p>
              <ul className="space-y-4 mb-8">
                {triggeringPlayers.map((p, i) => (
                  <li key={i} className="flex flex-col border-l-4 border-yellow-500 pl-4">
                    <span className="font-black text-xl uppercase">{p.name}</span>
                    <span className="text-xs opacity-60">Füllstand: {p.weight}g <span className="mx-2">|</span> Grenzwert: {p.limit}g</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm font-bold leading-relaxed border-t border-white/10 pt-4">Trinkt eure Gläser leer und schätzt anschließend euer individuelles <span className="text-yellow-400 uppercase">Leergewicht!</span></p>
            </div>
            <button onClick={startFinalSequence} className="w-full text-white font-black py-6 rounded-3xl text-2xl uppercase shadow-2xl active:scale-95 transition-all" style={{ backgroundColor: GOLD_COLOR }}>OK</button>
          </div>
        </div>
      )}

      {disqualifiedNotice && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg">
          <div className={`rounded-3xl p-8 max-sm w-full ${darkMode ? 'bg-slate-900' : 'bg-white'} border-4 border-red-500 shadow-2xl text-center`}>
            <i className="fas fa-skull-crossbones text-5xl text-red-500 mb-6"></i>
            <h3 className="text-2xl font-black mb-4 uppercase text-red-500">Ausgeschieden!</h3>
            <div className="space-y-2 mb-8">
              {disqualifiedNotice.map((n, i) => (
                <div key={i} className="font-black text-lg">{n.name} <span className="opacity-50 text-xs">({n.diff}g Abstand)</span></div>
              ))}
            </div>
            <p className="opacity-70 text-sm mb-10">Ein Abstand von mehr als 50 Gramm zum Zielgewicht bedeutet das sofortige Aus.</p>
            <button onClick={() => { setDisqualifiedNotice(null); triggerNextStep(); }} className="w-full py-4 rounded-xl bg-red-500 text-white font-bold uppercase active:scale-95 shadow-lg">OK</button>
          </div>
        </div>
      )}

      {showAutoTargetModal && (
        <div className="fixed inset-0 z-[430] flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg">
          <div className={`rounded-3xl p-8 max-md w-full shadow-2xl border-2 border-emerald-500 ${darkMode ? 'bg-gray-800' : 'bg-white'} text-center`}>
            <h3 className="text-2xl font-black mb-4 uppercase text-emerald-500">Auto-Zielgewicht</h3>
            <p className="opacity-80 mb-6 text-sm leading-relaxed">{showAutoTargetModal.reason}</p>
            <div className={`p-6 rounded-2xl mb-8 ${darkMode ? 'bg-gray-700' : 'bg-black/5'}`}>
              <p className="text-[10px] font-bold opacity-50 mb-1 uppercase tracking-widest">Neues Ziel</p>
              <p className="text-5xl font-black" style={{ color: BRAND_COLOR }}>{showAutoTargetModal.target}g</p>
            </div>
            <button onClick={() => { handleTargetWeightConfirm(showAutoTargetModal.target); setShowAutoTargetModal(null); }} className="w-full text-white font-bold py-4 rounded-xl shadow-lg active:scale-95" style={{ backgroundColor: GOLD_COLOR }}>OK</button>
          </div>
        </div>
      )}

      {targetWeightError && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`rounded-3xl p-8 max-sm w-full ${darkMode ? 'bg-slate-900' : 'bg-white'} border-4 border-red-500 text-center shadow-2xl`}>
            <h3 className="text-2xl font-black mb-4 uppercase text-red-500">Ungültig</h3>
            <p className="opacity-80 mb-8 text-sm leading-relaxed">{targetWeightError.message}</p>
            <button onClick={() => { setNextTargetInput(targetWeightError.correction.toString()); setTargetWeightError(null); }} className="w-full text-white font-bold py-4 rounded-xl shadow-lg" style={{ backgroundColor: '#ef4444' }}>Korrigieren</button>
          </div>
        </div>
      )}

      {startWeightError && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`rounded-3xl p-8 max-sm w-full ${darkMode ? 'bg-slate-900' : 'bg-white'} border-4 border-red-500 text-center shadow-2xl`}>
            <h3 className="text-2xl font-black mb-4 uppercase text-red-500">Eingabefehler</h3>
            <p className="opacity-80 mb-8 text-sm leading-relaxed">{startWeightError}</p>
            <button onClick={() => setStartWeightError(null)} className="w-full text-white font-bold py-4 rounded-xl shadow-lg" style={{ backgroundColor: '#ef4444' }}>OK</button>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`rounded-3xl p-8 max-sm w-full shadow-2xl text-center border-2 border-red-500 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
            <h3 className="text-2xl font-black mb-4 uppercase text-red-500">Abbrechen?</h3>
            <p className="opacity-70 mb-8 text-sm">Der aktuelle Spielstand geht verloren.</p>
            <div className="flex flex-col space-y-3">
              <button onClick={resetToStart} className="py-4 rounded-xl bg-red-600 text-white font-bold uppercase active:scale-95">Bestätigen</button>
              <button onClick={() => setShowResetConfirm(false)} className="py-4 rounded-xl border-2 font-bold uppercase active:scale-95">Zurück</button>
            </div>
          </div>
        </div>
      )}

      {showModeInfo && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`rounded-3xl p-8 max-w-sm w-full shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-xl font-black mb-4 text-center uppercase" style={{ color: BRAND_COLOR }}>0,33 L Modus</h3>
            <p className="text-sm opacity-80 mb-8 text-center leading-relaxed">Aktiviert diesen Modus, wenn ihr mit 0,33 Liter Gefäßen spielt. Das Mindest-Startgewicht beträgt hier 333g und die Ausscheide-Grenzen sind entsprechend angepasst.</p>
            <button onClick={() => setShowModeInfo(false)} className="w-full text-white font-bold py-4 rounded-xl shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>Verstanden</button>
          </div>
        </div>
      )}

      {showRules && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className={`rounded-3xl p-8 max-w-lg w-full shadow-2xl ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}>
            <h3 className="text-2xl font-black mb-6 text-center uppercase" style={{ color: BRAND_COLOR }}>Die Regeln</h3>
            <div className="space-y-4 text-sm opacity-90 mb-8 max-h-[60vh] overflow-y-auto pr-2">
              <p><strong>1. Spielprinzip:</strong> Ziel ist es, in jeder Runde das vorgegebene Zielgewicht möglichst genau zu treffen.</p>
              <p><strong>2. Zielgewicht:</strong> Es muss unter dem niedrigsten Füllstand liegen und darf maximal 100g unter dem höchsten liegen.</p>
              <p><strong>3. Ausscheiden:</strong> Wer mehr als 50g vom Zielgewicht abweicht, ist sofort ausgeschieden (💀).</p>
              <p><strong>4. Punkte (Schnäpse):</strong>
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li><strong>Der Letzte:</strong> Der Spieler, der am weitesten vom Ziel weg ist (aber &le; 50g), bekommt einen Punkt.</li>
                  <li><strong>Volltreffer:</strong> Exaktes Treffen des Ziels gibt einen Punkt.</li>
                  <li><strong>Schnappszahl:</strong> Treffen einer Schnappszahl (z.B. 111g, 222g) gibt einen Punkt.</li>
                  <li><strong>Wiegezwillinge:</strong> Haben zwei Spieler das gleiche Gewicht, bekommen beide einen Punkt.</li>
                </ul>
              </p>
              <p><strong>5. Das Finale:</strong> Erreicht ein Spieler den Schwellenwert, wird das Finale ausgelöst. Alle trinken leer und schätzen ihr Leergewicht.</p>
            </div>
            <button onClick={() => setShowRules(false)} className="w-full text-white font-bold py-4 rounded-xl shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>Alles klar!</button>
          </div>
        </div>
      )}

      {showStats && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
          <div className={`rounded-3xl p-6 md:p-8 max-w-5xl w-full shadow-2xl border flex flex-col ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-black/10 text-black'}`}>
            <h3 className="text-3xl font-black mb-6 text-center uppercase tracking-tighter" style={{ color: BRAND_COLOR }}>Abstandsverlauf</h3>
            <div ref={statsAreaRef} className={`relative p-8 rounded-2xl border ${darkMode ? 'border-white/20 bg-black/20' : 'border-black/10 bg-black/5'} flex-1 min-h-[350px]`}>
              {gameState === GameState.SPEED_RESULT ? (
                <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 400" preserveAspectRatio="none">
                  {[0, 20, 40, 60, 80, 100].map(v => {
                    const y = 400 - (v * 4);
                    return (
                      <g key={v}>
                        <line x1="0" y1={y} x2="1000" y2={y} stroke={darkMode ? "white" : "black"} strokeOpacity="0.1" />
                        <text x="-15" y={y} dominantBaseline="middle" textAnchor="end" className={`fill-current opacity-30 text-[12px] font-bold ${darkMode ? 'fill-white' : 'fill-black'}`}>{v}g</text>
                      </g>
                    );
                  })}
                  {(() => {
                    const levels = parseInt(speedLevels);
                    const pts = Array.from({ length: levels }).map((_, i) => {
                      const x = (i / (levels - 1)) * 1000;
                      const target = parseInt(speedTargets[i+1]) || 0;
                      const result = parseInt(speedResults[i+1]) || 0;
                      const diff = Math.abs(result - target);
                      return `${x},${400 - Math.min(100, diff) * 4}`;
                    }).join(' ');
                    return <polyline points={pts} fill="none" stroke={BRAND_COLOR} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />;
                  })()}
                </svg>
              ) : (
                <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 400" preserveAspectRatio="none">
                  {[0, 10, 20, 30, 40, 50].map(v => {
                    const y = 400 - (v * 8);
                    return (
                      <g key={v}>
                        <line x1="0" y1={y} x2="1000" y2={y} stroke={darkMode ? "white" : "black"} strokeOpacity="0.1" />
                        <text x="-15" y={y} dominantBaseline="middle" textAnchor="end" className={`fill-current opacity-30 text-[12px] font-bold ${darkMode ? 'fill-white' : 'fill-black'}`}>{v}g</text>
                      </g>
                    );
                  })}
                  {players.map((p, idx) => {
                    const activeRounds = rounds.filter(r => r.results[p.id] !== undefined);
                    if (activeRounds.length < 2) return null;
                    const pts = activeRounds.map((r, i) => {
                      const x = (i / (activeRounds.length - 1)) * 1000;
                      const tg = r.isFinal ? r.individualTargets?.[p.id] : r.targetWeight;
                      return `${x},${400 - Math.min(50, Math.abs(r.results[p.id] - tg!)) * 8}`;
                    }).join(' ');
                    return <polyline key={p.id} points={pts} fill="none" stroke={PLAYER_COLORS[idx % PLAYER_COLORS.length]} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />;
                  })}
                </svg>
              )}
            </div>
            
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              {gameState === GameState.SPEED_RESULT ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: BRAND_COLOR }}></div>
                  <span className="text-xs font-bold">{speedPlayerName}</span>
                </div>
              ) : (
                players.map((p, idx) => (
                  <div key={p.id} className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}></div>
                    <span className="text-xs font-bold">{p.name}</span>
                  </div>
                ))
              )}
            </div>

            <button onClick={() => setShowStats(false)} className="w-full mt-8 py-4 rounded-xl text-white font-black shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>Schließen</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
