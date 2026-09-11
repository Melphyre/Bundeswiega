import React from 'react';

interface PlayerLevelBadgeProps {
  level: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const PlayerLevelBadge: React.FC<PlayerLevelBadgeProps> = ({
  level,
  size = 'sm',
  showLabel = true,
  className = ''
}) => {
  const safeLevel = Math.max(1, Math.floor(level || 1));

  // Visual tiers based on level
  let badgeTheme = 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30';
  let tierIcon = '⭐';

  if (safeLevel >= 50) {
    badgeTheme = 'bg-gradient-to-r from-amber-500/25 to-yellow-400/25 text-amber-700 dark:text-amber-300 border-amber-500/60 shadow-sm shadow-amber-500/20';
    tierIcon = '👑';
  } else if (safeLevel >= 30) {
    badgeTheme = 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/50 shadow-sm shadow-purple-500/10';
    tierIcon = '💎';
  } else if (safeLevel >= 20) {
    badgeTheme = 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40';
    tierIcon = '🔥';
  } else if (safeLevel >= 10) {
    badgeTheme = 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40';
    tierIcon = '⚡';
  } else if (safeLevel >= 5) {
    badgeTheme = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40';
    tierIcon = '🍺';
  } else if (safeLevel >= 2) {
    badgeTheme = 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/40';
    tierIcon = '✨';
  }

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[9px] gap-0.5',
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2 font-black'
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full font-black border tracking-tight select-none whitespace-nowrap transition-all ${badgeTheme} ${sizeClasses} ${className}`}
      title={`Level ${safeLevel}`}
    >
      <span className="text-[10px] leading-none">{tierIcon}</span>
      <span className="leading-none">{showLabel ? `Lv. ${safeLevel}` : safeLevel}</span>
    </span>
  );
};

export default PlayerLevelBadge;
