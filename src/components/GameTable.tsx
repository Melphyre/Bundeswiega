import React from 'react';
import { Player, Round } from '../../types';
import { PLAYER_COLORS } from '../constants';
import VerticalText from './VerticalText';

interface GameTableProps {
  showInputs?: boolean;
  players: Player[];
  rounds: Round[];
  darkMode: boolean;
  currentRoundResults: Record<string, string>;
  setCurrentRoundResults: (val: Record<string, string>) => void;
  playerAccountLinks?: Record<string, { userId: string; userName: string; imageUrl?: string | null }>;
}

export const GameTable: React.FC<GameTableProps> = ({
  showInputs = false,
  players,
  rounds,
  darkMode,
  currentRoundResults,
  setCurrentRoundResults,
  playerAccountLinks
}) => {
  return (
    <div className={`p-2 md:p-4 rounded-3xl ${darkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'} border shadow-sm overflow-x-auto w-full mb-6`}>
      <table className={`w-full text-[10px] md:text-xs text-left border-collapse min-w-[320px] ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        <thead>
          <tr className={`border-b ${darkMode ? 'border-white/20' : 'border-gray-700/20'} font-black`}>
            <th className="py-2 px-1">RND</th>
            {players.map((p, idx) => {
              const accountLink = playerAccountLinks?.[p.id];
              const avatarUrl = accountLink?.imageUrl;

              return (
                <th key={p.id} className="text-center p-1">
                  <div className="flex flex-col items-center space-y-1">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={p.name}
                        className="w-7 h-7 rounded-full object-cover border-2 flex-shrink-0"
                        style={{ borderColor: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0"
                        style={{ backgroundColor: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}
                      >
                        {p.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    <VerticalText text={p.name} />
                  </div>
                </th>
              );
            })}
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

export default GameTable;
