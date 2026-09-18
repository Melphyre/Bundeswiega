import React from 'react';
import { getNameTagOption, getNameGlowOption, hasActiveNameGlow } from '../constants/nameTagConfig';

interface PlayerNameTagProps {
  name: string;
  colorKey?: string | null;
  glowKey?: string | null;
  className?: string;
  style?: React.CSSProperties;
  asBadge?: boolean;
}

/**
 * PlayerNameTag:
 * Stellt den Spielernamen entweder standardmäßig oder mit dem freigeschalteten
 * farbigen Namenshintergrund (Rot, Blau, Grün, Gelb, Schwarz, Weiß, Rosa, Türkis) dar.
 * Ab Level 4 kann zusätzlich ein pulsierender Neon-Glow Rahmen (Blau, Rot, Grün, Gelb) aktiv sein.
 */
export const PlayerNameTag: React.FC<PlayerNameTagProps> = ({
  name,
  colorKey,
  glowKey,
  className = '',
  style,
  asBadge = false
}) => {
  const bgOption = getNameTagOption(colorKey);
  const glowOption = getNameGlowOption(glowKey);
  const hasBg = bgOption.id !== 'none';
  const hasGlow = glowOption.id !== 'none';

  if (!hasBg && !hasGlow) {
    return (
      <span className={className} style={style}>
        {name}
      </span>
    );
  }

  const glowClass = hasGlow ? glowOption.glowClass : '';
  const tooltipText = [
    hasBg ? `Hintergrund: ${bgOption.label}` : '',
    hasGlow ? `Neon-Glow: ${glowOption.label}` : ''
  ]
    .filter(Boolean)
    .join(' | ');

  if (!hasBg && hasGlow) {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 my-0.5 mx-0.5 rounded-lg font-black tracking-wide transition-all border-2 bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-xs ${glowClass} ${className}`}
        style={style}
        title={tooltipText}
      >
        <span className="truncate">{name}</span>
      </span>
    );
  }

  // Mit farbigem Hintergrund (& evtl. zusätzlichem Neon-Glow Rahmen)
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 ${hasGlow ? 'my-0.5 mx-0.5' : ''} rounded-lg font-black tracking-wide transition-all shadow-xs ${bgOption.cssClasses} ${glowClass} ${className}`}
      style={{
        backgroundColor: bgOption.bgHex,
        color: bgOption.textHex,
        borderColor: hasGlow ? undefined : bgOption.borderHex,
        ...style
      }}
      title={tooltipText}
    >
      <span className="truncate">{name}</span>
    </span>
  );
};

export default PlayerNameTag;
