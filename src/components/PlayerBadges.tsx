import React from 'react';
import { Player } from '../../types';
import { getPlayerColor } from '../constants';

export const PlayerBadges: React.FC<{
  earnedBy: string[];
  playersList?: Player[];
  darkMode: boolean;
}> = ({ earnedBy, playersList = [], darkMode }) => {
  if (!earnedBy || earnedBy.length === 0) return null;
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      {earnedBy.map((name, i) => {
        const color = getPlayerColor(name, playersList);
        return (
          <span
            key={i}
            className={`inline-flex items-center space-x-1 text-[11px] font-black px-2.5 py-1 rounded-full border shadow-sm ${
              darkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-black/10 text-gray-900'
            }`}
          >
            <span className="opacity-70 text-[10px]">👤</span>
            <span style={{ color }}>{name}</span>
          </span>
        );
      })}
    </div>
  );
};

export default PlayerBadges;
