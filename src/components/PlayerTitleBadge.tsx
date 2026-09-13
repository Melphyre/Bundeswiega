import React from 'react';
import { findTitle } from '../constants/titlesConfig';

interface PlayerTitleBadgeProps {
  title?: string | null;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const PlayerTitleBadge: React.FC<PlayerTitleBadgeProps> = ({
  title,
  className = '',
  showIcon = true,
  size = 'sm'
}) => {
  if (!title || typeof title !== 'string') return null;
  const trimmed = title.trim();
  const lower = trimmed.toLowerCase();
  if (
    !trimmed ||
    lower === 'none' ||
    lower === 'kein titel' ||
    lower === 'kein_titel' ||
    lower === 'keiner' ||
    lower === 'null' ||
    lower === 'undefined'
  ) {
    return null;
  }

  const titleObj = findTitle(trimmed);
  const displayName = titleObj ? titleObj.name : trimmed;
  const icon = titleObj?.icon || '🏷️';
  const badgeBg = titleObj?.badgeBg || 'bg-amber-500/15 dark:bg-amber-500/25';
  const textColor = titleObj?.textColor || 'text-amber-800 dark:text-amber-300';
  const borderColor = titleObj?.borderColor || 'border-amber-500/30';

  const sizeClasses = size === 'lg'
    ? 'px-2.5 py-1 text-xs gap-1.5'
    : size === 'md'
      ? 'px-2 py-0.5 text-[11px] gap-1'
      : 'px-1.5 py-0.5 text-[10px] gap-1';

  return (
    <span
      className={`inline-flex items-center font-bold tracking-tight rounded-md border shadow-xs select-none transition-all ${badgeBg} ${textColor} ${borderColor} ${sizeClasses} ${className}`}
      title={titleObj?.description || `Titel: ${displayName}`}
    >
      {showIcon && <span className="text-[1.1em] leading-none">{icon}</span>}
      <span className="truncate max-w-[140px] leading-tight">{displayName}</span>
    </span>
  );
};

export default PlayerTitleBadge;
