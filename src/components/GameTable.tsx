import React from 'react';
import { Player, Round } from '../../types';
import { PLAYER_COLORS } from '../constants';
import VerticalText from './VerticalText';
import PlayerTitleBadge from './PlayerTitleBadge';
import PlayerAvatar from './PlayerAvatar';
import { getColumnThemeClass } from '../constants/cosmeticsConfig';
import { ActiveQuest, ActiveEffect } from '../types/worldOfWiegen';
import { getQuestById } from '../constants/worldOfWiegenQuests';

interface GameTableProps {
  showInputs?: boolean;
  players: Player[];
  rounds: Round[];
  darkMode: boolean;
  currentRoundResults: Record<string, string>;
  setCurrentRoundResults: (val: Record<string, string>) => void;
  playerAccountLinks?: Record<string, {
    userId: string;
    userName: string;
    imageUrl?: string | null;
    name_bg_color?: string | null;
    name_glow?: string | null;
    avatar_frame?: string | null;
    ingame_column_theme?: string | null;
  }>;
  getPlayerTitle?: (playerNameOrId?: string, playerObj?: Player) => string | undefined;
  getPlayerNameBgColor?: (playerNameOrId?: string, playerObj?: Player) => string | undefined;
  getPlayerNameGlow?: (playerNameOrId?: string, playerObj?: Player) => string | undefined;
  getPlayerAvatarFrame?: (playerNameOrId?: string, playerObj?: Player) => string | undefined;
  getPlayerColumnTheme?: (playerNameOrId?: string, playerObj?: Player) => string | undefined;
  worldOfWiegenActive?: boolean;
  activeQuests?: ActiveQuest[];
  activeEffects?: ActiveEffect[];
  onOpenQuestlog?: () => void;
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
  getPlayerNameBgColor,
  getPlayerNameGlow,
  getPlayerAvatarFrame,
  getPlayerColumnTheme,
  worldOfWiegenActive = false,
  activeQuests = [],
  activeEffects = [],
  onOpenQuestlog
}) => {
  return (
    <div className={`p-2 md:p-4 rounded-3xl ${darkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'} border shadow-sm overflow-x-auto w-full mb-6`}>
      {/* World of Wiegen Live Status Banner */}
      {worldOfWiegenActive && (
        <div className="mb-3 p-2.5 px-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-base animate-pulse">⚔️</span>
            <span className="font-black text-amber-600 dark:text-amber-400">World of Wiegen</span>
            {activeEffects.length > 0 && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                <span>✨ {activeEffects.length} {activeEffects.length === 1 ? 'Effekt aktiv' : 'Effekte aktiv'}</span>
              </span>
            )}
            {activeQuests.length > 0 && (
              <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <span>📜 {activeQuests.filter(q => q.status === 'active').length} Quests</span>
              </span>
            )}
          </div>
          {onOpenQuestlog && (
            <button
              type="button"
              onClick={onOpenQuestlog}
              className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-black shadow-xs active:scale-95 transition-all cursor-pointer flex items-center space-x-1"
            >
              <span>📜 Questlog &amp; Effekte</span>
            </button>
          )}
        </div>
      )}

      <table className={`w-full text-[10px] md:text-xs text-left border-collapse min-w-[320px] ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        <thead>
          <tr className={`border-b ${darkMode ? 'border-white/20' : 'border-gray-700/20'} font-black`}>
            <th className="py-2 px-1 align-bottom">RND</th>
            {players.map((p, idx) => {
              const accountLink = playerAccountLinks?.[p.id];
              const avatarUrl = p.avatar_url || p.imageUrl || accountLink?.imageUrl || (accountLink as any)?.avatar_url;
              const resolvedTitle = (getPlayerTitle ? (getPlayerTitle(p.id, p) || getPlayerTitle(p.name, p)) : undefined) || p.title || undefined;
              const resolvedNameBg = (getPlayerNameBgColor ? (getPlayerNameBgColor(p.id, p) || getPlayerNameBgColor(p.name, p)) : undefined) || p.name_bg_color || accountLink?.name_bg_color;
              const resolvedNameGlow = (getPlayerNameGlow ? (getPlayerNameGlow(p.id, p) || getPlayerNameGlow(p.name, p)) : undefined) || p.name_glow || accountLink?.name_glow;
              const resolvedAvatarFrame = (getPlayerAvatarFrame ? (getPlayerAvatarFrame(p.id, p) || getPlayerAvatarFrame(p.name, p)) : undefined) || (p as any).avatar_frame || accountLink?.avatar_frame;
              const resolvedColumnTheme = (getPlayerColumnTheme ? (getPlayerColumnTheme(p.id, p) || getPlayerColumnTheme(p.name, p)) : undefined) || (p as any).ingame_column_theme || accountLink?.ingame_column_theme;
              const colThemeClass = getColumnThemeClass(resolvedColumnTheme);

              return (
                <th key={p.id} className={`text-center p-1 align-top transition-all ${colThemeClass}`}>
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

                    {/* Exklusive Diamant-Krone bei entsprechendem Theme (Level 20) */}
                    {resolvedColumnTheme === 'diamond_crown' && (
                      <div className="text-sm -mb-2 z-10 animate-bounce select-none" title="Diamant-Krone">
                        👑
                      </div>
                    )}

                    {/* Profilbild / Avatar (mit unknown.svg Fallback und onError + Avatar Frame) */}
                    <PlayerAvatar
                      url={avatarUrl}
                      avatar_url={avatarUrl}
                      avatar_frame={resolvedAvatarFrame}
                      name={p.name}
                      className="w-8 h-8 border-2 flex-shrink-0 shadow-sm"
                      style={{ borderColor: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}
                    />
                    <VerticalText text={p.name} colorKey={resolvedNameBg} glowKey={resolvedNameGlow} />

                    {/* World of Wiegen Quest Badge */}
                    {worldOfWiegenActive && (() => {
                      const activeQ = activeQuests.find(q => q.playerId === p.id && q.status === 'active');
                      if (!activeQ) return null;
                      const qDef = getQuestById(activeQ.questId);
                      const isChamp = activeQ.pool === 'championswieg';
                      return (
                        <button
                          type="button"
                          onClick={onOpenQuestlog}
                          title={`Quest: ${qDef?.name || activeQ.questId} [${isChamp ? '👑 Championswieg' : '🤝 Kreiswiega'}] • ${activeQ.progressText}`}
                          className={`mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border hover:scale-105 active:scale-95 transition-all flex items-center space-x-1 max-w-[90px] cursor-pointer ${
                            isChamp
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40'
                              : 'bg-teal-500/20 text-teal-600 dark:text-teal-400 border-teal-500/40'
                          }`}
                        >
                          <span className="text-[10px]">{isChamp ? '👑' : '🤝'}</span>
                          <span className="truncate">{qDef?.shortTitle || 'Quest'}</span>
                        </button>
                      );
                    })()}

                    {/* World of Wiegen Player Effects */}
                    {worldOfWiegenActive && (() => {
                      const pEffects = activeEffects.filter(eff => {
                        if (!eff.targetPlayerIds || eff.targetPlayerIds.length === 0) return true; // affects all
                        return eff.targetPlayerIds.includes(p.id);
                      });
                      if (pEffects.length === 0) return null;
                      return (
                        <div className="flex items-center space-x-1 justify-center flex-wrap pt-0.5" title="Aktive Effekte auf diesen Spieler">
                          {pEffects.slice(0, 3).map(eff => (
                            <span key={eff.id} title={`${eff.name} [${eff.effectId}]: ${eff.description}`} className="text-[10px] cursor-pointer" onClick={onOpenQuestlog}>
                              {eff.icon}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
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
                const accountLink = playerAccountLinks?.[p.id];
                const resolvedColumnTheme = (getPlayerColumnTheme ? (getPlayerColumnTheme(p.id, p) || getPlayerColumnTheme(p.name, p)) : undefined) || (p as any).ingame_column_theme || accountLink?.ingame_column_theme;
                const colThemeClass = getColumnThemeClass(resolvedColumnTheme);
                const v = r.results[p.id];
                const tg = r.isFinal ? r.individualTargets?.[p.id] : r.targetWeight;
                const dist = v !== undefined && tg !== undefined ? Math.abs(v - tg) : null;
                return (
                  <td key={p.id} className={`text-center py-2 transition-all ${colThemeClass}`}>
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
              {players.map(p => {
                const accountLink = playerAccountLinks?.[p.id];
                const resolvedColumnTheme = (getPlayerColumnTheme ? (getPlayerColumnTheme(p.id, p) || getPlayerColumnTheme(p.name, p)) : undefined) || (p as any).ingame_column_theme || accountLink?.ingame_column_theme;
                const colThemeClass = getColumnThemeClass(resolvedColumnTheme);
                return (
                  <td key={p.id} className={`text-center p-1 ${colThemeClass}`}>
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
                );
              })}
              <td className="py-3 text-right font-black opacity-30 px-1">---</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default GameTable;
