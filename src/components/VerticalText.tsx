import React from 'react';
import { getNameTagOption, getNameGlowOption } from '../constants/nameTagConfig';

export const VerticalText: React.FC<{
  text: string;
  colorKey?: string | null;
  glowKey?: string | null;
}> = ({ text, colorKey, glowKey }) => {
  const bgOption = getNameTagOption(colorKey);
  const glowOption = getNameGlowOption(glowKey);
  const hasBg = bgOption.id !== 'none';
  const hasGlow = glowOption.id !== 'none';

  return (
    <div
      className={`flex flex-col items-center justify-center leading-[0.9] font-black text-[10px] md:text-xs select-none transition-all ${
        hasBg
          ? 'px-1.5 py-1.5 rounded-lg shadow-sm border-2'
          : hasGlow
          ? 'px-1.5 py-1.5 rounded-lg border-2 bg-slate-900/40 dark:bg-slate-900/60'
          : 'py-1'
      } ${hasGlow ? `${glowOption.glowClass} my-1 mx-0.5` : ''}`}
      style={
        hasBg
          ? {
              backgroundColor: bgOption.bgHex,
              color: bgOption.textHex,
              borderColor: hasGlow ? undefined : bgOption.borderHex
            }
          : undefined
      }
      title={
        hasBg || hasGlow
          ? `Spieler: ${text}${hasBg ? ` (Hintergrund: ${bgOption.label})` : ''}${hasGlow ? ` (Neon-Glow: ${glowOption.label})` : ''}`
          : undefined
      }
    >
      {text.split('').map((char, i) => (
        <span key={i} className="block">{char === ' ' ? '\u00A0' : char}</span>
      ))}
    </div>
  );
};

export default VerticalText;
