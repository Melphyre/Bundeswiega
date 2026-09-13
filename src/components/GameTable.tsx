import React from 'react';
import { Player, Round } from '../../types';
import { PLAYER_COLORS } from '../constants';
import VerticalText from './VerticalText';
import PlayerTitleBadge from './PlayerTitleBadge';
import PlayerAvatar from './PlayerAvatar';

interface GameTableProps {
  showInputs?: boolean;
  players: Player[];
  rounds: Round[];
  darkMode: boolean;
  currentRoundResults: Record<string, string>;
  setCurrentRoundResults: (val: Record<string, string>) => void;
  playerAccountLinks?: Record<string, { userId: string; userName: string; imageUrl?: string | null; name_bg_color?: string | null }>;
  getPlayerTitle?: (playerNameOrId?: string, playerObj?: Player) => string | undefined;
  getPlayerNameBgColor?: (playerNameOrId?: string, playerObj?: Player) => string | undefined;
}

export const GameTable: React.FC<GameTableProps> = ({
  showInputs = false,
  players,
  rounds,
  darkMode,
  currentRoundResults,
  setCurrentRoundResults,
  playerAccountLinks,
  getPlayerTitle,
  getPlayerNameBgColor
}) => {
  return (
    <div className={`p-2 md:p-4 rounded-3xl ${darkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'} border shadow-sm overflow-x-auto w-full mb-6`}>
      <table className={`w-full text-[10px] md:text-xs text-left border-collapse min-w-[320px] ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        <thead>
          <tr className={`border-b ${darkMode ? 'border-white/20' : 'border-gray-700/20'} font-black`}>
            <th className="py-2 px-1 align-bottom">RND</th>
            {players.map((p, idx) => {
              const accountLink = playerAccountLinks?.[p.id];
              const avatarUrl = p.imageUrl || accountLink?.imageUrl;
              const resolvedTitle = (getPlayerTitle ? (getPlayerTitle(p.id, p) || getPlayerTitle(p.name, p)) : undefined) || p.title || undefined;
              const resolvedNameBg = (getPlayerNameBgColor ? (getPlayerNameBgColor(p.id, p) || getPlayerNameBgColor(p.name, p)) : undefined) || p.name_bg_color || accountLink?.name_bg_color;

              return (
                <th key={p.id} className="text-center p-1 align-top">
                  <div className="flex flex-col items-center space-y-1.5 min-w-[56px] max-w-[96px] mx-auto">
                    {/* Spielertitel über dem Profilbild (nur wenn belegt) */}
                    {resolvedTitle && (
                      <div className="flex justify-center w-full min-h-[20px] items-center">
                        <PlayerTitleBadge
                          title={resolvedTitle}
                          size="sm"
                          showIcon={true}
                          className="text-[9px] py-0.5 px-1.5 max-w-[85px] justify-center shadow-xs"
                        />
                      </div>
                    )}

                    {/* Profilbild / Avatar (mit unknown.svg Fallback und onError) */}
                    <PlayerAvatar
                      url={avatarUrl}
                      name={p.name}
                      className="w-8 h-8 border-2 flex-shrink-0 shadow-sm"
                      style={{ borderColor: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}
                    />
                    <VerticalText text={p.name} colorKey={resolvedNameBg} />
                  </div>
                </th>
              );
            })}
            <th className="py-2 text-right px-1 align-bottom">ZIEL</th>
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
