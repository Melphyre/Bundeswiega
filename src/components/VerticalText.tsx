import React from 'react';
import { getNameTagOption } from '../constants/nameTagConfig';

export const VerticalText: React.FC<{ text: string; colorKey?: string | null }> = ({ text, colorKey }) => {
  const option = getNameTagOption(colorKey);
  const hasBg = option.id !== 'none';

  return (
    <div
      className={`flex flex-col items-center justify-center leading-[0.9] font-black text-[10px] md:text-xs select-none transition-all ${
        hasBg ? 'px-1 py-1.5 rounded-lg shadow-sm border' : 'py-1'
      }`}
      style={
        hasBg
          ? {
              backgroundColor: option.bgHex,
              color: option.textHex,
              borderColor: option.borderHex
            }
          : undefined
      }
      title={hasBg ? `Namenshintergrund: ${option.label}` : undefined}
    >
      {text.split('').map((char, i) => (
        <span key={i} className="block">{char === ' ' ? '\u00A0' : char}</span>
      ))}
    </div>
  );
};

export default VerticalText;
